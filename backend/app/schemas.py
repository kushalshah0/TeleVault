"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models import UserRole


# Authentication Schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Storage Schemas
class StorageCreate(BaseModel):
    name: str
    telegram_channel_id: str


class StorageResponse(BaseModel):
    id: int
    name: str
    telegram_channel_id: str
    owner_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class StorageList(BaseModel):
    storages: List[StorageResponse]


# Permission Schemas
class PermissionCreate(BaseModel):
    user_id: int
    role: UserRole


class PermissionUpdate(BaseModel):
    role: UserRole


class PermissionResponse(BaseModel):
    id: int
    storage_id: int
    user_id: int
    role: UserRole
    granted_at: datetime
    
    class Config:
        from_attributes = True

class StorageUsageResponse(BaseModel):
    used_bytes: int
    total_bytes: int
    percentage: float
    file_count: int
    
class StorageDetailUsage(BaseModel):
    storage_id: int
    storage_name: str
    used_bytes: int
    file_count: int


# Folder Schemas
class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None


class FolderResponse(BaseModel):
    id: int
    name: str
    path: str
    storage_id: int
    parent_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


class FolderList(BaseModel):
    folders: List[FolderResponse]


# File Schemas
class FileResponse(BaseModel):
    id: int
    name: str
    size: int
    mime_type: Optional[str]
    storage_id: int
    folder_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


class FileList(BaseModel):
    files: List[FileResponse]


class FileUploadResponse(BaseModel):
    file_id: int
    name: str
    size: int
    chunks_count: int
    message: str


class UploadProgress(BaseModel):
    uploaded_bytes: int
    total_bytes: int
    progress_percentage: float
    chunks_uploaded: int
    total_chunks: int


# Search Schemas
class SearchResultItem(BaseModel):
    id: int
    name: str
    type: str  # 'file' or 'folder'
    size: Optional[int] = None
    mime_type: Optional[str] = None
    storage_id: int
    storage_name: str
    folder_id: Optional[int] = None
    path: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class SearchResults(BaseModel):
    results: List[SearchResultItem]
    total_count: int
    query: str


# Activity Schemas
class ActivityResponse(BaseModel):
    id: int
    user_id: int
    username: str
    activity_type: str
    description: str
    storage_id: Optional[int]
    storage_name: Optional[str]
    file_id: Optional[int]
    file_name: Optional[str]
    folder_id: Optional[int]
    folder_name: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ActivityList(BaseModel):
    activities: List[ActivityResponse]
    total_count: int
