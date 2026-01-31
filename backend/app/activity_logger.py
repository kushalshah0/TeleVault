"""Activity logging utility for audit trail."""
from sqlmodel import Session
from app.models import Activity, ActivityType, User, Storage, File, Folder
from typing import Optional
import json
import asyncio
import threading
from queue import Queue
from app.database import get_db_session
import logging

logger = logging.getLogger(__name__)


# Background thread for async activity logging
_activity_queue: Optional[Queue] = None
_activity_thread: Optional[threading.Thread] = None
_shutdown = False


def _activity_logger_worker():
    """Background worker to process activity logs asynchronously."""
    global _shutdown
    while not _shutdown:
        try:
            # Get activity data from queue (blocking with timeout)
            activity_data = _activity_queue.get(timeout=1)
            
            if activity_data is None:  # Shutdown signal
                break
            
            # Write to database in background
            try:
                with get_db_session() as session:
                    activity = Activity(**activity_data)
                    session.add(activity)
                    session.commit()
            except Exception as e:
                logger.error(f"Failed to log activity: {e}")
            
            _activity_queue.task_done()
        except:
            # Timeout or queue empty
            continue


def start_activity_logger():
    """Start the background activity logger."""
    global _activity_queue, _activity_thread, _shutdown
    if _activity_queue is None:
        _activity_queue = Queue(maxsize=1000)  # Buffer up to 1000 activities
        _shutdown = False
        _activity_thread = threading.Thread(target=_activity_logger_worker, daemon=True)
        _activity_thread.start()


def stop_activity_logger():
    """Stop the background activity logger."""
    global _activity_queue, _shutdown
    if _activity_queue is not None:
        _shutdown = True
        _activity_queue.put(None)  # Send shutdown signal
        if _activity_thread:
            _activity_thread.join(timeout=5)


def log_activity_async(
    user: User,
    activity_type: ActivityType,
    description: str,
    storage_id: Optional[int] = None,
    storage_name: Optional[str] = None,
    file_id: Optional[int] = None,
    file_name: Optional[str] = None,
    folder_id: Optional[int] = None,
    folder_name: Optional[str] = None,
    extra_data: Optional[dict] = None
):
    """
    Log a user activity asynchronously (non-blocking).
    
    Args:
        user: User performing the action
        activity_type: Type of activity
        description: Human-readable description
        storage_id: Optional storage ID
        storage_name: Optional storage name
        file_id: Optional file ID
        file_name: Optional file name
        folder_id: Optional folder ID
        folder_name: Optional folder name
        extra_data: Optional additional data as dict
    """
    # Ensure logger is started
    if _activity_queue is None:
        start_activity_logger()
    
    # Prepare activity data
    activity_data = {
        'user_id': user.id,
        'username': user.username,
        'activity_type': activity_type,
        'description': description,
        'storage_id': storage_id,
        'storage_name': storage_name,
        'file_id': file_id,
        'file_name': file_name,
        'folder_id': folder_id,
        'folder_name': folder_name,
        'extra_data': json.dumps(extra_data) if extra_data else None
    }
    
    # Queue for background processing (non-blocking)
    try:
        _activity_queue.put_nowait(activity_data)
    except:
        # Queue full, log warning but don't block
        logger.warning("Activity queue full, skipping log")


def log_activity(
    session: Session,
    user: User,
    activity_type: ActivityType,
    description: str,
    storage_id: Optional[int] = None,
    storage_name: Optional[str] = None,
    file_id: Optional[int] = None,
    file_name: Optional[str] = None,
    folder_id: Optional[int] = None,
    folder_name: Optional[str] = None,
    extra_data: Optional[dict] = None
):
    """
    Log a user activity to the database (synchronous - for backward compatibility).
    Consider using log_activity_async for better performance.
    """
    activity = Activity(
        user_id=user.id,
        username=user.username,
        activity_type=activity_type,
        description=description,
        storage_id=storage_id,
        storage_name=storage_name,
        file_id=file_id,
        file_name=file_name,
        folder_id=folder_id,
        folder_name=folder_name,
        extra_data=json.dumps(extra_data) if extra_data else None
    )
    
    session.add(activity)
    session.commit()


def log_login(session: Session, user: User):
    """Log user login."""
    log_activity(
        session=session,
        user=user,
        activity_type=ActivityType.LOGIN,
        description=f"{user.username} logged in"
    )


def log_register(session: Session, user: User):
    """Log user registration."""
    log_activity(
        session=session,
        user=user,
        activity_type=ActivityType.REGISTER,
        description=f"New user {user.username} registered"
    )


def log_storage_create(session: Session, user: User, storage: Storage):
    """Log storage creation."""
    log_activity(
        session=session,
        user=user,
        activity_type=ActivityType.STORAGE_CREATE,
        description=f"Created storage '{storage.name}'",
        storage_id=storage.id,
        storage_name=storage.name
    )


def log_storage_delete(session: Session, user: User, storage_id: int, storage_name: str):
    """Log storage deletion."""
    log_activity(
        session=session,
        user=user,
        activity_type=ActivityType.STORAGE_DELETE,
        description=f"Deleted storage '{storage_name}'",
        storage_id=storage_id,
        storage_name=storage_name
    )


def log_folder_create(session: Session, user: User, folder: Folder, storage_name: str):
    """Log folder creation."""
    log_activity(
        session=session,
        user=user,
        activity_type=ActivityType.FOLDER_CREATE,
        description=f"Created folder '{folder.name}' in '{storage_name}'",
        storage_id=folder.storage_id,
        storage_name=storage_name,
        folder_id=folder.id,
        folder_name=folder.name
    )


def log_folder_delete(session: Session, user: User, folder_id: int, folder_name: str, storage_id: int, storage_name: str):
    """Log folder deletion."""
    log_activity(
        session=session,
        user=user,
        activity_type=ActivityType.FOLDER_DELETE,
        description=f"Deleted folder '{folder_name}' from '{storage_name}'",
        storage_id=storage_id,
        storage_name=storage_name,
        folder_id=folder_id,
        folder_name=folder_name
    )


def log_file_upload(session: Session, user: User, file: File, storage_name: str):
    """Log file upload."""
    log_activity(
        session=session,
        user=user,
        activity_type=ActivityType.FILE_UPLOAD,
        description=f"Uploaded '{file.name}' to '{storage_name}'",
        storage_id=file.storage_id,
        storage_name=storage_name,
        file_id=file.id,
        file_name=file.name,
        folder_id=file.folder_id,
        extra_data={"size": file.size, "mime_type": file.mime_type}
    )


def log_file_download(session: Session, user: User, file: File, storage_name: str):
    """Log file download."""
    log_activity(
        session=session,
        user=user,
        activity_type=ActivityType.FILE_DOWNLOAD,
        description=f"Downloaded '{file.name}' from '{storage_name}'",
        storage_id=file.storage_id,
        storage_name=storage_name,
        file_id=file.id,
        file_name=file.name,
        folder_id=file.folder_id
    )


def log_file_delete(session: Session, user: User, file_id: int, file_name: str, storage_id: int, storage_name: str):
    """Log file deletion."""
    log_activity(
        session=session,
        user=user,
        activity_type=ActivityType.FILE_DELETE,
        description=f"Deleted '{file_name}' from '{storage_name}'",
        storage_id=storage_id,
        storage_name=storage_name,
        file_id=file_id,
        file_name=file_name
    )


def log_file_preview(session: Session, user: User, file: File, storage_name: str):
    """Log file preview."""
    log_activity(
        session=session,
        user=user,
        activity_type=ActivityType.FILE_PREVIEW,
        description=f"Previewed '{file.name}' in '{storage_name}'",
        storage_id=file.storage_id,
        storage_name=storage_name,
        file_id=file.id,
        file_name=file.name,
        folder_id=file.folder_id
    )
