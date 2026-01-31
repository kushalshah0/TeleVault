"""File management endpoints with streaming support."""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from typing import Optional
from app.database import get_session
from app.models import User, File, FileChunk, UserRole
from app.schemas import FileResponse, FileList, FileUploadResponse
from app.auth import get_current_user
from app.permissions import check_storage_permission
from app.telegram_worker import get_chunk_manager
from app.activity_logger import log_file_upload, log_file_download, log_file_delete, log_activity_async
from app.models import ActivityType
import asyncio

router = APIRouter(prefix="/storages/{storage_id}/files", tags=["Files"])


async def file_stream_generator(upload_file: UploadFile, chunk_size: int = 1024 * 1024):
    """Generate file stream in chunks."""
    while True:
        chunk = await upload_file.read(chunk_size)
        if not chunk:
            break
        yield chunk


@router.post("", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    storage_id: int,
    file: UploadFile = FastAPIFile(...),
    folder_id: Optional[int] = Form(None),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Upload a file with streaming and chunking."""
    # Check editor access
    storage = check_storage_permission(storage_id, UserRole.EDITOR, user, session)
    
    # Get file size
    content = await file.read()
    file_size = len(content)
    # Reset file position by creating new BytesIO
    from io import BytesIO
    file.file = BytesIO(content)
    
    # Create file record
    db_file = File(
        name=file.filename,
        size=file_size,
        mime_type=file.content_type,
        storage_id=storage_id,
        folder_id=folder_id
    )
    
    session.add(db_file)
    session.commit()
    session.refresh(db_file)
    
    try:
        # Upload chunks to Telegram
        chunk_manager = get_chunk_manager()
        file_stream = file_stream_generator(file)
        
        chunks_metadata = await chunk_manager.stream_upload(
            storage.telegram_channel_id,
            file_stream,
            file_size
        )
        
        # Store chunk metadata in database
        for chunk_index, message_id, file_id, bot_index, chunk_size in chunks_metadata:
            chunk = FileChunk(
                file_id=db_file.id,
                chunk_index=chunk_index,
                chunk_size=chunk_size,
                telegram_message_id=message_id,
                telegram_file_id=file_id,
                telegram_bot_token_index=bot_index
            )
            session.add(chunk)
        
        session.commit()
        
        # Log file upload activity (async - non-blocking)
        log_activity_async(
            user=user,
            activity_type=ActivityType.FILE_UPLOAD,
            description=f"Uploaded '{db_file.name}' to '{storage.name}'",
            storage_id=db_file.storage_id,
            storage_name=storage.name,
            file_id=db_file.id,
            file_name=db_file.name,
            folder_id=db_file.folder_id,
            extra_data={"size": db_file.size, "mime_type": db_file.mime_type}
        )
        
        return FileUploadResponse(
            file_id=db_file.id,
            name=db_file.name,
            size=db_file.size,
            chunks_count=len(chunks_metadata),
            message="File uploaded successfully"
        )
        
    except Exception as e:
        # Rollback on error
        session.rollback()
        session.delete(db_file)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@router.get("", response_model=FileList)
def list_files(
    storage_id: int,
    folder_id: Optional[int] = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """List files in a storage or folder."""
    # Check viewer access
    storage = check_storage_permission(storage_id, UserRole.VIEWER, user, session)
    
    statement = select(File).where(
        File.storage_id == storage_id,
        File.folder_id == folder_id
    )
    files = session.exec(statement).all()
    
    # Convert to response models
    file_responses = [
        FileResponse(
            id=f.id,
            name=f.name,
            size=f.size,
            mime_type=f.mime_type,
            storage_id=f.storage_id,
            folder_id=f.folder_id,
            created_at=f.created_at
        )
        for f in files
    ]
    
    return FileList(files=file_responses)


@router.get("/{file_id}", response_model=FileResponse)
def get_file_metadata(
    storage_id: int,
    file_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get file metadata."""
    # Check viewer access
    storage = check_storage_permission(storage_id, UserRole.VIEWER, user, session)
    
    file = session.get(File, file_id)
    if not file or file.storage_id != storage_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return file


@router.get("/{file_id}/download")
async def download_file(
    storage_id: int,
    file_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Download a file with streaming."""
    # Check viewer access
    storage = check_storage_permission(storage_id, UserRole.VIEWER, user, session)
    
    file = session.get(File, file_id)
    if not file or file.storage_id != storage_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get chunks ordered by index
    statement = select(FileChunk).where(
        FileChunk.file_id == file_id
    ).order_by(FileChunk.chunk_index)
    chunks = session.exec(statement).all()
    
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File has no chunks"
        )
    
    # Prepare chunk data for streaming
    chunks_data = [
        (chunk.telegram_file_id, chunk.telegram_bot_token_index)
        for chunk in chunks
    ]
    
    # Stream download
    chunk_manager = get_chunk_manager()
    
    async def file_stream():
        async for chunk in chunk_manager.stream_download(chunks_data):
            yield chunk
    
    # Log file download activity (async - non-blocking)
    log_activity_async(
        user=user,
        activity_type=ActivityType.FILE_DOWNLOAD,
        description=f"Downloaded '{file.name}' from '{storage.name}'",
        storage_id=file.storage_id,
        storage_name=storage.name,
        file_id=file.id,
        file_name=file.name,
        folder_id=file.folder_id
    )
    
    return StreamingResponse(
        file_stream(),
        media_type=file.mime_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{file.name}"',
            "Content-Length": str(file.size)
        }
    )


@router.patch("/{file_id}", response_model=FileResponse)
def rename_file(
    storage_id: int,
    file_id: int,
    new_name: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Rename a file."""
    # Check editor access
    storage = check_storage_permission(storage_id, UserRole.EDITOR, user, session)
    
    file = session.get(File, file_id)
    if not file or file.storage_id != storage_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Update file name
    file.name = new_name
    session.commit()
    session.refresh(file)
    
    return file


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    storage_id: int,
    file_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Delete a file and its chunks from Telegram."""
    # Check editor access
    storage = check_storage_permission(storage_id, UserRole.EDITOR, user, session)
    
    file = session.get(File, file_id)
    if not file or file.storage_id != storage_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get chunks
    statement = select(FileChunk).where(FileChunk.file_id == file_id)
    chunks = session.exec(statement).all()
    
    # Delete chunks from Telegram
    chunk_manager = get_chunk_manager()
    worker_pool = chunk_manager.worker_pool
    
    for chunk in chunks:
        try:
            await worker_pool.delete_chunk(
                storage.telegram_channel_id,
                chunk.telegram_message_id,
                chunk.telegram_bot_token_index
            )
        except Exception as e:
            # Log but continue deletion
            print(f"Failed to delete chunk {chunk.id}: {e}")
    
    # Log file deletion before deleting (async - non-blocking)
    file_name = file.name
    log_activity_async(
        user=user,
        activity_type=ActivityType.FILE_DELETE,
        description=f"Deleted '{file_name}' from '{storage.name}'",
        storage_id=storage_id,
        storage_name=storage.name,
        file_id=file_id,
        file_name=file_name
    )
    
    # Delete chunks from database first
    for chunk in chunks:
        session.delete(chunk)
    
    # Then delete file
    session.delete(file)
    session.commit()
