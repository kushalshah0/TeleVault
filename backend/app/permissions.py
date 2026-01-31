"""Access control and permission checking utilities."""
from fastapi import Depends, HTTPException, status
from sqlmodel import Session, select
from app.models import User, Storage, StoragePermission, UserRole
from app.database import get_session
from app.auth import get_current_user
from app.cache import get_permission_cache


def check_storage_permission(
    storage_id: int,
    required_role: UserRole,
    user: User,
    session: Session
) -> Storage:
    """
    Check if user has required permission for storage.
    Returns the storage if authorized, raises HTTPException otherwise.
    Uses caching to reduce database queries.
    """
    cache = get_permission_cache()
    
    # Role hierarchy for comparison
    role_hierarchy = {
        UserRole.VIEWER: 1,
        UserRole.EDITOR: 2,
        UserRole.ADMIN: 3
    }
    
    # Try to get from cache
    cached_result = cache.get(storage_id, user.id)
    if cached_result is not None:
        has_access, cached_role = cached_result
        if has_access and role_hierarchy[cached_role] >= role_hierarchy[required_role]:
            # Cache hit and sufficient permissions - only need to fetch storage
            storage = session.get(Storage, storage_id)
            if storage:
                return storage
            # Storage was deleted, invalidate cache
            cache.invalidate(storage_id)
    
    # Cache miss or insufficient permissions - do full check
    storage = session.get(Storage, storage_id)
    if not storage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storage not found"
        )
    
    # Owner has all permissions
    if storage.owner_id == user.id:
        # Cache as ADMIN (highest permission)
        cache.set(storage_id, user.id, True, UserRole.ADMIN)
        return storage
    
    # Check explicit permissions
    statement = select(StoragePermission).where(
        StoragePermission.storage_id == storage_id,
        StoragePermission.user_id == user.id
    )
    permission = session.exec(statement).first()
    
    if not permission:
        # Cache the negative result (no access)
        cache.set(storage_id, user.id, False, UserRole.VIEWER)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this storage"
        )
    
    # Cache the permission
    cache.set(storage_id, user.id, True, permission.role)
    
    # Check if user has required role
    if role_hierarchy[permission.role] < role_hierarchy[required_role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required: {required_role.value}"
        )
    
    return storage


class StorageAccessChecker:
    """Dependency for checking storage access permissions."""
    
    def __init__(self, required_role: UserRole):
        self.required_role = required_role
    
    def __call__(
        self,
        storage_id: int,
        user: User = Depends(get_current_user),
        session: Session = Depends(get_session)
    ) -> Storage:
        """Check access and return storage."""
        return check_storage_permission(storage_id, self.required_role, user, session)


# Convenience dependency factories
def require_viewer_access(storage_id: int) -> Storage:
    """Require viewer access to storage."""
    return StorageAccessChecker(UserRole.VIEWER)


def require_editor_access(storage_id: int) -> Storage:
    """Require editor access to storage."""
    return StorageAccessChecker(UserRole.EDITOR)


def require_admin_access(storage_id: int) -> Storage:
    """Require admin access to storage."""
    return StorageAccessChecker(UserRole.ADMIN)
