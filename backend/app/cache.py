"""Simple in-memory caching for performance optimization."""
from typing import Optional, Dict, Tuple
from datetime import datetime, timedelta
from app.models import Storage, UserRole
import threading


class PermissionCache:
    """Thread-safe cache for storage permission checks."""
    
    def __init__(self, ttl_seconds: int = 300):  # 5 minutes default TTL
        """Initialize cache with TTL."""
        self.ttl = timedelta(seconds=ttl_seconds)
        self._cache: Dict[Tuple[int, int], Tuple[bool, UserRole, datetime]] = {}
        self._lock = threading.Lock()
    
    def get(self, storage_id: int, user_id: int) -> Optional[Tuple[bool, UserRole]]:
        """Get cached permission result."""
        with self._lock:
            key = (storage_id, user_id)
            if key in self._cache:
                has_access, role, cached_at = self._cache[key]
                
                # Check if cache is still valid
                if datetime.utcnow() - cached_at < self.ttl:
                    return (has_access, role)
                else:
                    # Expired, remove from cache
                    del self._cache[key]
            
            return None
    
    def set(self, storage_id: int, user_id: int, has_access: bool, role: UserRole):
        """Cache permission result."""
        with self._lock:
            key = (storage_id, user_id)
            self._cache[key] = (has_access, role, datetime.utcnow())
    
    def invalidate(self, storage_id: int, user_id: Optional[int] = None):
        """Invalidate cache for a storage (and optionally specific user)."""
        with self._lock:
            if user_id is not None:
                # Invalidate specific user's access to storage
                key = (storage_id, user_id)
                self._cache.pop(key, None)
            else:
                # Invalidate all users' access to storage
                keys_to_remove = [k for k in self._cache.keys() if k[0] == storage_id]
                for key in keys_to_remove:
                    del self._cache[key]
    
    def clear(self):
        """Clear all cached data."""
        with self._lock:
            self._cache.clear()


# Global cache instance
_permission_cache: Optional[PermissionCache] = None


def get_permission_cache() -> PermissionCache:
    """Get or create the global permission cache."""
    global _permission_cache
    if _permission_cache is None:
        _permission_cache = PermissionCache(ttl_seconds=300)  # 5 minutes
    return _permission_cache
