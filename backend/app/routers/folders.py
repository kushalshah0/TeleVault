"""Folder management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, Folder, UserRole
from app.schemas import FolderCreate, FolderResponse, FolderList
from app.auth import get_current_user
from app.permissions import check_storage_permission

router = APIRouter(prefix="/storages/{storage_id}/folders", tags=["Folders"])


def build_folder_path(folder_name: str, parent_id: int | None, session: Session) -> str:
    """Build full folder path."""
    if parent_id is None:
        return f"/{folder_name}"
    
    parent = session.get(Folder, parent_id)
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent folder not found"
        )
    
    return f"{parent.path}/{folder_name}"


@router.post("", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(
    storage_id: int,
    folder_data: FolderCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create a new folder."""
    # Check editor access
    storage = check_storage_permission(storage_id, UserRole.EDITOR, user, session)
    
    # Build path
    path = build_folder_path(folder_data.name, folder_data.parent_id, session)
    
    # Check if folder already exists at this path
    statement = select(Folder).where(
        Folder.storage_id == storage_id,
        Folder.path == path
    )
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Folder already exists at this path"
        )
    
    folder = Folder(
        name=folder_data.name,
        path=path,
        storage_id=storage_id,
        parent_id=folder_data.parent_id
    )
    
    session.add(folder)
    session.commit()
    session.refresh(folder)
    
    return folder


@router.get("", response_model=FolderList)
def list_folders(
    storage_id: int,
    parent_id: int | None = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """List folders in a storage or parent folder."""
    # Check viewer access
    storage = check_storage_permission(storage_id, UserRole.VIEWER, user, session)
    
    statement = select(Folder).where(
        Folder.storage_id == storage_id,
        Folder.parent_id == parent_id
    )
    folders = session.exec(statement).all()
    
    return FolderList(folders=list(folders))


@router.get("/{folder_id}", response_model=FolderResponse)
def get_folder(
    storage_id: int,
    folder_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get folder details."""
    # Check viewer access
    storage = check_storage_permission(storage_id, UserRole.VIEWER, user, session)
    
    folder = session.get(Folder, folder_id)
    if not folder or folder.storage_id != storage_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    return folder


@router.patch("/{folder_id}", response_model=FolderResponse)
def rename_folder(
    storage_id: int,
    folder_id: int,
    new_name: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Rename a folder."""
    # Check editor access
    storage = check_storage_permission(storage_id, UserRole.EDITOR, user, session)
    
    folder = session.get(Folder, folder_id)
    if not folder or folder.storage_id != storage_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Update folder name and path
    old_path = folder.path
    parent_path = old_path.rsplit('/', 1)[0] if '/' in old_path else ''
    new_path = f"{parent_path}/{new_name}" if parent_path else f"/{new_name}"
    
    folder.name = new_name
    folder.path = new_path
    session.commit()
    session.refresh(folder)
    
    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    storage_id: int,
    folder_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Delete a folder (must be empty)."""
    # Check editor access
    storage = check_storage_permission(storage_id, UserRole.EDITOR, user, session)
    
    folder = session.get(Folder, folder_id)
    if not folder or folder.storage_id != storage_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Check if folder has files
    if folder.files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete folder with files"
        )
    
    # Check if folder has subfolders
    statement = select(Folder).where(Folder.parent_id == folder_id)
    subfolders = session.exec(statement).first()
    if subfolders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete folder with subfolders"
        )
    
    session.delete(folder)
    session.commit()
