# File & Folder Upload/Download - Detailed Implementation

## File Upload Flow

### Overview
Files are uploaded to Telegram channels as document messages. Since Telegram has a 20MB limit per message, larger files are split into chunks that are uploaded in parallel using multiple bots.

### Step-by-Step Process

1. **Client Request**
   ```
   POST /api/storages/{storage_id}/files
   Content-Type: multipart/form-data
   Authorization: Bearer {token}
   
   Body:
   - file: (binary data)
   - folder_id: (optional)
   ```

2. **Server Processing** (`routers/files.py:upload_file`)
   
   a. **Permission Check**
   - Verifies user has EDITOR role or higher for the storage
   - Uses `check_storage_permission()` with caching

   b. **Read File into Memory**
   ```python
   content = await file.read()
   file_size = len(content)
   ```

   c. **Create File Record**
   ```python
   db_file = File(
       name=file.filename,
       size=file_size,
       mime_type=file.content_type,
       storage_id=storage_id,
       folder_id=folder_id
   )
   session.add(db_file)
   session.commit()
   ```

   d. **Stream to Telegram** (`telegram_worker.py:ChunkManager.stream_upload`)
   - File is streamed in 1MB chunks via `file_stream_generator()`
   - `ChunkManager.stream_upload()` handles chunking and parallel upload:
     ```
     - Accumulates bytes until chunk_size (20MB) reached
     - Stores complete chunks in list
     - Uploads remaining bytes as final chunk
     - If multiple bots available: uploads all chunks in parallel using asyncio.gather()
     - If single bot: uploads sequentially
     ```

   e. **Store Chunk Metadata**
   ```python
   for chunk_index, message_id, file_id, bot_index, chunk_size in chunks_metadata:
       chunk = FileChunk(
           file_id=db_file.id,
           chunk_index=chunk_index,
           chunk_size=chunk_size,
           telegram_message_id=message_id,  # For deletion
           telegram_file_id=file_id,          # For download
           telegram_bot_token_index=bot_index # Which bot uploaded
       )
       session.add(chunk)
   ```

   f. **Log Activity** (async, non-blocking)
   ```python
   log_activity_async(
       user=user,
       activity_type=ActivityType.FILE_UPLOAD,
       description=f"Uploaded '{db_file.name}' to '{storage.name}'",
       storage_id=storage_id,
       file_id=file.id,
       file_name=file.name,
       extra_data={"size": file.size, "mime_type": file.mime_type}
   )
   ```

3. **Telegram API** (`telegram_worker.py:TelegramWorkerPool.upload_chunk`)
   ```python
   # For each chunk:
   message = await bot.send_document(
       chat_id=channel_id,
       document=file_obj,  # BytesIO of chunk data
       write_timeout=300   # 5 min for large uploads
   )
   # Returns: message_id (for deletion), document.file_id (for download)
   ```

4. **Response**
   ```json
   {
     "file_id": 123,
     "name": "video.mp4",
     "size": 52428800,
     "chunks_count": 3,
     "message": "File uploaded successfully"
   }
   ```

### Key Code Locations

| Component | File | Key Functions |
|-----------|------|---------------|
| Endpoint | `routers/files.py` | `upload_file()` line 28 |
| Stream generator | `routers/files.py` | `file_stream_generator()` line 19 |
| Chunk manager | `telegram_worker.py` | `ChunkManager.stream_upload()` line 133 |
| Bot pool upload | `telegram_worker.py` | `TelegramWorkerPool.upload_chunk()` line 33 |

**How File Upload Works:** When a client sends a file to the upload endpoint, the server first validates the user's permission to ensure they have EDITOR access to the storage. The file binary data is read into memory, then a File record is created in the database to store metadata like filename, size, and MIME type. The TelegramWorkerPool then takes over, splitting the file into 20MB chunks and uploading each chunk as a separate document message to the Telegram channel. If multiple bot tokens are configured, chunks are uploaded in parallel using asyncio.gather() to maximize throughput. Each successful upload returns a message_id (for future deletion) and a file_id (for future download), which are stored in the FileChunk table. The activity is logged asynchronously via a background thread to avoid blocking the response. The client receives the file_id and chunk count in the response.

---

## File Download Flow

### Overview
Files are downloaded by retrieving chunk metadata from the database, then fetching each chunk from Telegram in parallel, and streaming them to the client in order.

### Step-by-Step Process

1. **Client Request**
   ```
   GET /api/storages/{storage_id}/files/{file_id}/download
   Authorization: Bearer {token}
   ```

2. **Server Processing** (`routers/files.py:download_file`)

   a. **Permission Check**
   - Verifies user has VIEWER role or higher
   - User must be owner or have explicit permission

   b. **Get File Metadata**
   ```python
   file = session.get(File, file_id)
   if not file or file.storage_id != storage_id:
       raise HTTPException(404, "File not found")
   ```

   c. **Get Chunk Metadata**
   ```python
   statement = select(FileChunk).where(
       FileChunk.file_id == file_id
   ).order_by(FileChunk.chunk_index)
   chunks = session.exec(statement).all()
   
   # Prepare for streaming
   chunks_data = [
       (chunk.telegram_file_id, chunk.telegram_bot_token_index)
       for chunk in chunks
   ]
   ```

   d. **Stream from Telegram** (`telegram_worker.py:ChunkManager.stream_download`)
   ```
   - Uses parallel window of up to 3 concurrent downloads
   - Downloads chunks in parallel while maintaining order
   - Yields chunks sequentially to client
   ```

   e. **Log Activity** (async, non-blocking)
   ```python
   log_activity_async(
       user=user,
       activity_type=ActivityType.FILE_DOWNLOAD,
       description=f"Downloaded '{file.name}' from '{storage.name}'",
       storage_id=storage_id,
       file_id=file.id,
       file_name=file.name
   )
   ```

3. **Telegram API** (`telegram_worker.py:TelegramWorkerPool.download_chunk`)
   ```python
   file_obj = BytesIO()
   file = await bot.get_file(telegram_file_id)  # Use file_id from upload
   await file.download_to_memory(file_obj)
   return file_obj.getvalue()
   ```

4. **Response**
   ```
   HTTP/1.1 200 OK
   Content-Type: video/mp4
   Content-Disposition: attachment; filename="video.mp4"
   Content-Length: 52428800
   
   <binary stream of file data>
   ```

### Parallel Download Implementation (`telegram_worker.py:202-254`)

```python
async def stream_download(self, chunks):
    parallel_window = min(3, len(chunks))  # Max 3 concurrent
    
    # Start initial batch
    while len(pending_tasks) < parallel_window:
        task = asyncio.create_task(
            self.worker_pool.download_chunk(file_id, bot_index)
        )
        pending_tasks[chunk_index] = task
    
    # Yield in order, start new downloads as slots available
    while pending_tasks:
        if next_yield_index in pending_tasks:
            chunk_data = await pending_tasks[next_yield_index]
            yield chunk_data
            next_yield_index += 1
            # Start next download
            if download_queue:
                task = asyncio.create_task(...)
```

### Key Code Locations

| Component | File | Key Functions |
|-----------|------|---------------|
| Endpoint | `routers/files.py` | `download_file()` line 172 |
| Chunk retrieval | `routers/files.py` | line 190-206 |
| Stream download | `telegram_worker.py` | `ChunkManager.stream_download()` line 202 |
| Bot pool download | `telegram_worker.py` | `TelegramWorkerPool.download_chunk()` line 75 |

**How File Download Works:** When a client requests a file download, the server first verifies the user has VIEWER access to the storage. The File record is fetched from the database to validate the file exists and belongs to the requested storage. All FileChunk records associated with this file are retrieved and sorted by chunk_index to ensure correct ordering. The ChunkManager then initiates parallel downloads from Telegram using up to 3 concurrent connections. Each chunk is downloaded using its stored telegram_file_id and the corresponding bot that originally uploaded it. The downloads are coordinated using asyncio tasks - while one chunk is being yielded to the client, subsequent chunks are downloaded in the background to maintain a continuous stream. Chunks are yielded to the client in sequential order regardless of which order they were downloaded, ensuring the file is reassembled correctly. Activity is logged asynchronously after the download begins.

---

## File Delete Flow

1. **Get all chunks** from `FileChunk` table
2. **Delete from Telegram** each chunk using `message_id`
   ```python
   await worker_pool.delete_chunk(channel_id, message_id, bot_index)
   ```
3. **Delete chunks** from database
4. **Delete file record** from database

**How File Delete Works:** The delete operation ensures both the Telegram messages and database records are cleaned up. First, all FileChunk records are fetched for the file to get the Telegram message IDs needed for deletion. The server then iterates through each chunk and calls the Telegram API to delete the original document message from the channel using the stored message_id and bot_index. This is critical because leaving orphaned messages in the Telegram channel would waste storage. After successful Telegram deletion, the FileChunk records are deleted from the database, followed by the File record itself. The operation is transactional - if Telegram deletion fails for any chunk, the process continues but logs the error, ensuring as much cleanup as possible occurs.

---

## Folder Operations

### Create Folder
```
POST /api/storages/{storage_id}/folders
Body: {"name": "Documents", "parent_id": null}
```

- Validates name is unique within parent folder
- Generates full path: `"/storage_name/parent_path/name"`
- Creates `Folder` record in database

### List Folders
```
GET /api/storages/{storage_id}/folders?parent_id=5
```

- Returns folders filtered by parent_id
- Supports nested hierarchy via parent_id

### Delete Folder
```
DELETE /api/storages/{storage_id}/folders/{folder_id}
```

- Cascades to delete all child folders
- Also deletes all files within folder (and their Telegram chunks)

**How Folder Operations Work:** Folder operations maintain a virtual hierarchy within storage. When creating a folder, the system validates that the name is unique within the parent folder and generates a full path string for efficient lookups (e.g., "/MyStorage/Documents/Work"). The parent_id field creates the hierarchy through self-referencing - a null parent_id means root level. Listing folders filters by parent_id to return only direct children, allowing the UI to build the tree incrementally. Deletion is recursive - when a folder is deleted, the system first finds all descendant folders via the parent_id chain, then deletes all files in each folder (including their Telegram chunks), then deletes all folders in reverse order of their hierarchy.

---

## Chunking Algorithm

```
File: 55MB
Chunk Size: 20MB

Chunk 0: bytes 0-20MB    → Telegram message 1
Chunk 1: bytes 20-40MB   → Telegram message 2  
Chunk 2: bytes 40-55MB   → Telegram message 3 (partial)

Database:
FileChunk(file_id=X, chunk_index=0, chunk_size=20MB, message_id=100, file_id="abc", bot_index=0)
FileChunk(file_id=X, chunk_index=1, chunk_size=20MB, message_id=101, file_id="def", bot_index=1)
FileChunk(file_id=X, chunk_index=2, chunk_size=15MB, message_id=102, file_id="ghi", bot_index=0)
```

**How Chunking Works:** The chunking algorithm solves Telegram's 20MB per-message limit by splitting larger files into multiple pieces. As file data streams in, bytes are accumulated in a buffer until the chunk_size (20MB) is reached, at which point that chunk is stored for upload and the buffer continues accumulating for the next chunk. The final chunk may be smaller than chunk_size if there's remaining data. Each chunk is assigned a sequential chunk_index (0, 1, 2...) to enable correct reassembly during download. The telegram_file_id returned by Telegram for each chunk is what allows us to download that specific chunk later without needing the original file data - it's a reference to the stored document. The bot_index tracks which bot handled each chunk, ensuring the same bot is used for download since each bot has its own file cache.

---

## Error Handling

| Error | Cause | Handling |
|-------|-------|----------|
| 403 Forbidden | No permission | Check role hierarchy |
| 404 Not Found | File/storage missing | Return error |
| 500 Upload Failed | Telegram error | Rollback DB, return error |
| 429 Retry After | Rate limited | Wait and retry with different bot |

### Rate Limit Handling
```python
except RetryAfter as e:
    logger.warning(f"Rate limit hit, waiting {e.retry_after}s")
    await asyncio.sleep(e.retry_after)
    return await self.upload_chunk(channel_id, chunk_data, None)  # Retry with different bot
```

**How Error Handling Works:** The system handles several error types to ensure reliability. Permission errors (403) occur when users lack the required role - the permission cache is checked first to avoid repeated database queries, and role hierarchy (viewer < editor < admin) determines access. Not Found errors (404) happen when files or storages don't exist or belong to different storages - the storage_id is always validated against the file/folder to prevent unauthorized access. Server errors (500) typically indicate Telegram API failures - the upload process rolls back the database transaction and deletes any partial chunks to prevent orphan records. Rate limiting (429) is handled specially: when Telegram returns a RetryAfter error, the system waits the specified duration then retries with a different bot from the pool to distribute load and avoid hitting the same limit twice.
