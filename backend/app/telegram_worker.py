"""Telegram worker for uploading and downloading file chunks."""
import asyncio
from typing import List, Optional, AsyncGenerator
from io import BytesIO
from telegram import Bot
from telegram.error import TelegramError, RetryAfter
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class TelegramWorkerPool:
    """Pool of Telegram bots for parallel chunk operations."""
    
    def __init__(self, bot_tokens: List[str]):
        """Initialize bot pool with multiple tokens."""
        self.bots = [Bot(token=token) for token in bot_tokens]
        self.bot_count = len(self.bots)
        self._current_index = 0
        self._locks = [asyncio.Lock() for _ in range(self.bot_count)]
    
    def get_bot(self, index: Optional[int] = None) -> tuple[Bot, int]:
        """Get a bot from the pool. Returns (bot, bot_index)."""
        if index is not None and 0 <= index < self.bot_count:
            return self.bots[index], index
        
        # Round-robin selection
        bot_index = self._current_index
        self._current_index = (self._current_index + 1) % self.bot_count
        return self.bots[bot_index], bot_index
    
    async def upload_chunk(
        self,
        channel_id: str,
        chunk_data: bytes,
        bot_index: Optional[int] = None
    ) -> tuple[int, str, int]:
        """
        Upload a chunk to Telegram channel.
        Returns (message_id, file_id, bot_index_used).
        """
        bot, used_bot_index = self.get_bot(bot_index)
        
        async with self._locks[used_bot_index]:
            try:
                # Create a file-like object from bytes
                file_obj = BytesIO(chunk_data)
                file_obj.name = "chunk.bin"
                
                # Upload to channel as document
                message = await bot.send_document(
                    chat_id=channel_id,
                    document=file_obj,
                    write_timeout=300,  # 5 minutes for large file uploads
                    read_timeout=300,   # 5 minutes for large file downloads
                    connect_timeout=60  # 1 minute for connection
                )
                
                # Get file_id from the document
                file_id = message.document.file_id
                
                return message.message_id, file_id, used_bot_index
                
            except RetryAfter as e:
                logger.warning(f"Rate limit hit, waiting {e.retry_after} seconds")
                await asyncio.sleep(e.retry_after)
                # Retry with a different bot
                return await self.upload_chunk(channel_id, chunk_data, None)
                
            except TelegramError as e:
                logger.error(f"Telegram error during upload: {e}")
                raise
    
    async def download_chunk(
        self,
        telegram_file_id: str,
        bot_index: int
    ) -> bytes:
        """Download a chunk from Telegram using file_id."""
        bot = self.bots[bot_index]
        
        async with self._locks[bot_index]:
            try:
                # Download using file_id directly
                file_obj = BytesIO()
                file = await bot.get_file(telegram_file_id)
                await file.download_to_memory(file_obj)
                
                # Reset position and return bytes
                file_obj.seek(0)
                return file_obj.read()
                
            except RetryAfter as e:
                logger.warning(f"Rate limit hit, waiting {e.retry_after} seconds")
                await asyncio.sleep(e.retry_after)
                return await self.download_chunk(telegram_file_id, bot_index)
                
            except TelegramError as e:
                logger.error(f"Telegram error during download: {e}")
                raise
    
    async def delete_chunk(
        self,
        channel_id: str,
        message_id: int,
        bot_index: int
    ) -> bool:
        """Delete a chunk from Telegram channel."""
        bot = self.bots[bot_index]
        
        async with self._locks[bot_index]:
            try:
                await bot.delete_message(
                    chat_id=channel_id,
                    message_id=message_id
                )
                return True
                
            except TelegramError as e:
                logger.error(f"Telegram error during deletion: {e}")
                return False


class ChunkManager:
    """Manages file chunking and streaming operations."""
    
    def __init__(self, worker_pool: TelegramWorkerPool, chunk_size: int):
        """Initialize chunk manager."""
        self.worker_pool = worker_pool
        self.chunk_size = chunk_size
    
    async def stream_upload(
        self,
        channel_id: str,
        file_stream: AsyncGenerator[bytes, None],
        total_size: int
    ) -> List[tuple[int, int, str, int, int]]:
        """
        Stream upload file in chunks with parallel uploads.
        Returns list of (chunk_index, message_id, file_id, bot_index, chunk_size).
        """
        chunks_to_upload = []
        buffer = bytearray()
        chunk_index = 0
        
        # First, collect all chunks from the stream
        async for data in file_stream:
            buffer.extend(data)
            
            # Process complete chunks
            while len(buffer) >= self.chunk_size:
                chunk = bytes(buffer[:self.chunk_size])
                buffer = buffer[self.chunk_size:]
                chunks_to_upload.append((chunk_index, chunk))
                chunk_index += 1
        
        # Upload remaining data as final chunk
        if len(buffer) > 0:
            chunk = bytes(buffer)
            chunks_to_upload.append((chunk_index, chunk))
        
        # Upload chunks in parallel (up to bot count)
        chunks_metadata = []
        parallel_uploads = min(self.worker_pool.bot_count, len(chunks_to_upload))
        
        if parallel_uploads <= 1:
            # Sequential upload for single chunk or single bot
            for chunk_idx, chunk_data in chunks_to_upload:
                message_id, file_id, bot_index = await self.worker_pool.upload_chunk(
                    channel_id, chunk_data
                )
                chunks_metadata.append((
                    chunk_idx,
                    message_id,
                    file_id,
                    bot_index,
                    len(chunk_data)
                ))
        else:
            # Parallel upload
            async def upload_chunk_task(chunk_idx, chunk_data):
                message_id, file_id, bot_index = await self.worker_pool.upload_chunk(
                    channel_id, chunk_data
                )
                return (chunk_idx, message_id, file_id, bot_index, len(chunk_data))
            
            # Create tasks for all chunks
            tasks = [
                upload_chunk_task(chunk_idx, chunk_data)
                for chunk_idx, chunk_data in chunks_to_upload
            ]
            
            # Execute all uploads in parallel
            results = await asyncio.gather(*tasks)
            
            # Sort by chunk index to maintain order
            chunks_metadata = sorted(results, key=lambda x: x[0])
        
        return chunks_metadata
    
    async def stream_download(
        self,
        chunks: List[tuple[str, int]]  # (file_id, bot_index)
    ) -> AsyncGenerator[bytes, None]:
        """
        Stream download file chunks with parallel prefetching.
        Downloads multiple chunks in parallel while maintaining order.
        """
        # Use a window of parallel downloads for better performance
        parallel_window = min(3, len(chunks))  # Download up to 3 chunks in parallel
        
        if parallel_window <= 1:
            # Fallback to sequential for single chunk
            for file_id, bot_index in chunks:
                chunk_data = await self.worker_pool.download_chunk(file_id, bot_index)
                yield chunk_data
        else:
            # Parallel download with ordered yielding
            from collections import deque
            download_queue = deque(chunks)
            pending_tasks = {}
            chunk_index = 0
            
            # Start initial batch of downloads
            while len(pending_tasks) < parallel_window and download_queue:
                file_id, bot_index = download_queue.popleft()
                task = asyncio.create_task(
                    self.worker_pool.download_chunk(file_id, bot_index)
                )
                pending_tasks[chunk_index] = task
                chunk_index += 1
            
            # Yield chunks in order
            next_yield_index = 0
            while pending_tasks:
                # Wait for the next chunk in sequence
                if next_yield_index in pending_tasks:
                    chunk_data = await pending_tasks[next_yield_index]
                    del pending_tasks[next_yield_index]
                    yield chunk_data
                    next_yield_index += 1
                    
                    # Start downloading next chunk if available
                    if download_queue:
                        file_id, bot_index = download_queue.popleft()
                        task = asyncio.create_task(
                            self.worker_pool.download_chunk(file_id, bot_index)
                        )
                        pending_tasks[chunk_index] = task
                        chunk_index += 1
                else:
                    # Wait a bit for the next chunk
                    await asyncio.sleep(0.01)


# Global worker pool instance
worker_pool: Optional[TelegramWorkerPool] = None


def get_worker_pool() -> TelegramWorkerPool:
    """Get or create the global worker pool."""
    global worker_pool
    if worker_pool is None:
        worker_pool = TelegramWorkerPool(settings.telegram_bot_tokens_list)
    return worker_pool


def get_chunk_manager() -> ChunkManager:
    """Get chunk manager instance."""
    pool = get_worker_pool()
    return ChunkManager(pool, settings.telegram_chunk_size)
