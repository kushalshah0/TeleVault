"""Storage management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, or_
from typing import List, Optional
from app.database import get_session
from app.models import User, Storage, StoragePermission, UserRole, File, Folder, Activity
from app.schemas import (
    StorageCreate,
    StorageResponse,
    StorageList,
    PermissionCreate,
    PermissionUpdate,
    PermissionResponse,
    SearchResults,
    SearchResultItem,
    ActivityList,
    ActivityResponse
)
from app.auth import get_current_user
from app.permissions import check_storage_permission
from app.cache import get_permission_cache

router = APIRouter(prefix="/storages", tags=["Storage"])


@router.post("", response_model=StorageResponse, status_code=status.HTTP_201_CREATED)
def create_storage(
    storage_data: StorageCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Create a new storage volume."""
    # Check if channel ID already exists
    statement = select(Storage).where(Storage.telegram_channel_id == storage_data.telegram_channel_id)
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram channel already registered"
        )
    
    storage = Storage(
        name=storage_data.name,
        telegram_channel_id=storage_data.telegram_channel_id,
        owner_id=user.id
    )
    
    session.add(storage)
    session.commit()
    session.refresh(storage)
    
    return storage


@router.get("", response_model=StorageList)
def list_storages(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """List all storages accessible to the user."""
    # Get owned storages
    statement = select(Storage).where(Storage.owner_id == user.id)
    owned_storages = session.exec(statement).all()
    
    # Get storages with explicit permissions
    statement = select(Storage).join(StoragePermission).where(
        StoragePermission.user_id == user.id
    )
    permitted_storages = session.exec(statement).all()
    
    # Combine and deduplicate
    all_storages = list({s.id: s for s in owned_storages + list(permitted_storages)}.values())
    
    # Convert to response models
    storage_responses = [
        StorageResponse(
            id=s.id,
            name=s.name,
            telegram_channel_id=s.telegram_channel_id,
            owner_id=s.owner_id,
            created_at=s.created_at
        )
        for s in all_storages
    ]
    
    return StorageList(storages=storage_responses)


@router.get("/{storage_id}", response_model=StorageResponse)
def get_storage(
    storage_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get storage details."""
    storage = check_storage_permission(storage_id, UserRole.VIEWER, user, session)
    return storage


@router.delete("/{storage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_storage(
    storage_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Delete a storage volume (owner only)."""
    storage = session.get(Storage, storage_id)
    if not storage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storage not found"
        )
    
    if storage.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can delete storage"
        )
    
    session.delete(storage)
    session.commit()


@router.post("/{storage_id}/permissions", response_model=PermissionResponse, status_code=status.HTTP_201_CREATED)
def grant_permission(
    storage_id: int,
    permission_data: PermissionCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Grant permission to a user (admin or owner only)."""
    storage = check_storage_permission(storage_id, UserRole.ADMIN, user, session)
    
    # Check if permission already exists
    statement = select(StoragePermission).where(
        StoragePermission.storage_id == storage_id,
        StoragePermission.user_id == permission_data.user_id
    )
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission already exists for this user"
        )
    
    permission = StoragePermission(
        storage_id=storage_id,
        user_id=permission_data.user_id,
        role=permission_data.role
    )
    
    session.add(permission)
    session.commit()
    session.refresh(permission)
    
    # Invalidate cache for this user's access to storage
    cache = get_permission_cache()
    cache.invalidate(storage_id, permission_data.user_id)
    
    return permission


@router.put("/{storage_id}/permissions/{user_id}", response_model=PermissionResponse)
def update_permission(
    storage_id: int,
    user_id: int,
    permission_data: PermissionUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update user permission (admin or owner only)."""
    storage = check_storage_permission(storage_id, UserRole.ADMIN, user, session)
    
    statement = select(StoragePermission).where(
        StoragePermission.storage_id == storage_id,
        StoragePermission.user_id == user_id
    )
    permission = session.exec(statement).first()
    
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    
    permission.role = permission_data.role
    session.add(permission)
    session.commit()
    session.refresh(permission)
    
    # Invalidate cache for this user's access to storage
    cache = get_permission_cache()
    cache.invalidate(storage_id, user_id)
    
    return permission


@router.delete("/{storage_id}/permissions/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_permission(
    storage_id: int,
    user_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Revoke user permission (admin or owner only)."""
    storage = check_storage_permission(storage_id, UserRole.ADMIN, user, session)
    
    statement = select(StoragePermission).where(
        StoragePermission.storage_id == storage_id,
        StoragePermission.user_id == user_id
    )
    permission = session.exec(statement).first()
    
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    
    session.delete(permission)
    session.commit()
    
    # Invalidate cache for this user's access to storage
    cache = get_permission_cache()
    cache.invalidate(storage_id, user_id)


@router.get("/{storage_id}/permissions", response_model=List[PermissionResponse])
def list_permissions(
    storage_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """List all permissions for a storage (admin or owner only)."""
    storage = check_storage_permission(storage_id, UserRole.ADMIN, user, session)
    
    statement = select(StoragePermission).where(StoragePermission.storage_id == storage_id)
    permissions = session.exec(statement).all()
    
    return permissions


@router.get("/{storage_id}/search", response_model=SearchResults)
def search_in_storage(
    storage_id: int,
    q: str = Query(..., min_length=1, description="Search query"),
    folder_id: Optional[int] = Query(None, description="Folder ID to search within"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Search for files and folders within a specific storage and optionally a folder."""
    # Check user has access to this storage
    storage = check_storage_permission(storage_id, UserRole.VIEWER, user, session)
    
    results = []
    search_pattern = f"%{q.lower()}%"
    
    # Search files
    file_stmt = select(File).where(
        File.storage_id == storage_id,
        File.name.ilike(search_pattern)
    )
    
    # If folder_id is specified, search only in that folder
    if folder_id is not None:
        file_stmt = file_stmt.where(File.folder_id == folder_id)
    
    files = session.exec(file_stmt).all()
    
    for file in files:
        results.append(SearchResultItem(
            id=file.id,
            name=file.name,
            type="file",
            size=file.size,
            mime_type=file.mime_type,
            storage_id=file.storage_id,
            storage_name=storage.name,
            folder_id=file.folder_id,
            path=None,
            created_at=file.created_at
        ))
    
    # Search folders
    folder_stmt = select(Folder).where(
        Folder.storage_id == storage_id,
        Folder.name.ilike(search_pattern)
    )
    
    # If folder_id is specified, search only subfolders of that folder
    if folder_id is not None:
        folder_stmt = folder_stmt.where(Folder.parent_id == folder_id)
    
    folders = session.exec(folder_stmt).all()
    
    for folder in folders:
        results.append(SearchResultItem(
            id=folder.id,
            name=folder.name,
            type="folder",
            size=None,
            mime_type=None,
            storage_id=folder.storage_id,
            storage_name=storage.name,
            folder_id=folder.parent_id,
            path=folder.path,
            created_at=folder.created_at
        ))
    
    # Sort by relevance (exact matches first, then by name)
    results.sort(key=lambda x: (not x.name.lower().startswith(q.lower()), x.name.lower()))
    
    return SearchResults(results=results, total_count=len(results), query=q)


@router.get("/activities", response_model=ActivityList)
def get_user_activities(
    limit: int = Query(50, ge=1, le=100, description="Number of activities to return"),
    offset: int = Query(0, ge=0, description="Number of activities to skip"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get recent activities for the current user across all storages."""
    # Get activities for the user, ordered by most recent first
    statement = select(Activity).where(
        Activity.user_id == user.id
    ).order_by(Activity.created_at.desc()).offset(offset).limit(limit)
    
    activities = session.exec(statement).all()
    
    # Get total count
    count_statement = select(Activity).where(Activity.user_id == user.id)
    total_count = len(session.exec(count_statement).all())
    
    return ActivityList(activities=list(activities), total_count=total_count)
