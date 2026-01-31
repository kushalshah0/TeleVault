"""Database models for TeleVault."""
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User roles for access control."""
    VIEWER = "viewer"
    EDITOR = "editor"
    ADMIN = "admin"


class ActivityType(str, Enum):
    """Types of activities that can be logged."""
    # Auth activities
    LOGIN = "login"
    LOGOUT = "logout"
    REGISTER = "register"
    
    # Storage activities
    STORAGE_CREATE = "storage_create"
    STORAGE_DELETE = "storage_delete"
    STORAGE_VIEW = "storage_view"
    
    # Folder activities
    FOLDER_CREATE = "folder_create"
    FOLDER_DELETE = "folder_delete"
    FOLDER_OPEN = "folder_open"
    
    # File activities
    FILE_UPLOAD = "file_upload"
    FILE_DOWNLOAD = "file_download"
    FILE_DELETE = "file_delete"
    FILE_PREVIEW = "file_preview"
    FILE_RENAME = "file_rename"
    
    # Permission activities
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"


class User(SQLModel, table=True):
    """User account model."""
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    storages: List["Storage"] = Relationship(back_populates="owner")
    storage_permissions: List["StoragePermission"] = Relationship(back_populates="user")


class Storage(SQLModel, table=True):
    """Storage volume mapped to a Telegram channel."""
    __tablename__ = "storages"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    telegram_channel_id: str = Field(unique=True, index=True)
    owner_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    owner: User = Relationship(back_populates="storages")
    folders: List["Folder"] = Relationship(back_populates="storage")
    files: List["File"] = Relationship(back_populates="storage")
    permissions: List["StoragePermission"] = Relationship(back_populates="storage")


class StoragePermission(SQLModel, table=True):
    """Access control for storage volumes."""
    __tablename__ = "storage_permissions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    storage_id: int = Field(foreign_key="storages.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    role: UserRole = Field(default=UserRole.VIEWER)
    granted_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    storage: Storage = Relationship(back_populates="permissions")
    user: User = Relationship(back_populates="storage_permissions")


class Folder(SQLModel, table=True):
    """Folder hierarchy within storage."""
    __tablename__ = "folders"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    path: str = Field(index=True)  # Full path for easy lookup
    storage_id: int = Field(foreign_key="storages.id", index=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="folders.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    storage: Storage = Relationship(back_populates="folders")
    files: List["File"] = Relationship(back_populates="folder")


class File(SQLModel, table=True):
    """File metadata."""
    __tablename__ = "files"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    size: int  # Total file size in bytes
    mime_type: Optional[str] = None
    storage_id: int = Field(foreign_key="storages.id", index=True)
    folder_id: Optional[int] = Field(default=None, foreign_key="folders.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    storage: Storage = Relationship(back_populates="files")
    folder: Optional[Folder] = Relationship(back_populates="files")
    chunks: List["FileChunk"] = Relationship(back_populates="file")


class FileChunk(SQLModel, table=True):
    """File chunk metadata stored in Telegram."""
    __tablename__ = "file_chunks"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    file_id: int = Field(foreign_key="files.id", index=True)
    chunk_index: int  # Sequential order of chunk
    chunk_size: int  # Size of this specific chunk
    telegram_message_id: int  # Message ID in Telegram channel
    telegram_file_id: str  # Telegram file_id for downloading
    telegram_bot_token_index: int  # Which bot token was used
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    file: File = Relationship(back_populates="chunks")


class RefreshToken(SQLModel, table=True):
    """Refresh tokens for JWT authentication."""
    __tablename__ = "refresh_tokens"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    revoked: bool = Field(default=False)


class Activity(SQLModel, table=True):
    """Activity log for audit trail."""
    __tablename__ = "activities"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    username: str = Field(index=True)  # Denormalized for easy display
    activity_type: ActivityType = Field(index=True)
    description: str  # Human-readable description
    storage_id: Optional[int] = Field(default=None, foreign_key="storages.id", index=True)
    storage_name: Optional[str] = None  # Denormalized
    file_id: Optional[int] = Field(default=None, index=True)
    file_name: Optional[str] = None  # Denormalized
    folder_id: Optional[int] = Field(default=None, index=True)
    folder_name: Optional[str] = None  # Denormalized
    extra_data: Optional[str] = None  # JSON string for additional data
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
