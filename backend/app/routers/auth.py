"""Authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select, func
from app.database import get_session
from app.models import User, RefreshToken, Storage, File
from app.schemas import UserCreate, UserLogin, Token, TokenRefresh, UserResponse, StorageUsageResponse
from app.auth import (
    hash_password,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user
)
from app.activity_logger import log_login, log_register
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, session: Session = Depends(get_session)):
    """Register a new user."""
    # Check if username exists
    statement = select(User).where(User.username == user_data.username)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email exists
    statement = select(User).where(User.email == user_data.email)
    existing_email = session.exec(statement).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password)
    )
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Log registration activity
    log_register(session, user)
    
    return user


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, session: Session = Depends(get_session)):
    """Login and get access/refresh tokens."""
    user = authenticate_user(credentials.username, credentials.password, session)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(user.id, session)
    
    # Log login activity
    log_login(session, user)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/refresh", response_model=Token)
def refresh(token_data: TokenRefresh, session: Session = Depends(get_session)):
    """Refresh access token using refresh token."""
    # Verify refresh token
    payload = verify_token(token_data.refresh_token, "refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Check if token exists and is not revoked
    statement = select(RefreshToken).where(
        RefreshToken.token == token_data.refresh_token,
        RefreshToken.revoked == False
    )
    db_token = session.exec(statement).first()
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or revoked"
        )
    
    # Check expiration
    if db_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired"
        )
    
    user_id = int(payload.get("sub"))
    
    # Create new tokens
    access_token = create_access_token(data={"sub": str(user_id)})
    new_refresh_token = create_refresh_token(user_id, session)
    
    # Revoke old refresh token
    db_token.revoked = True
    session.add(db_token)
    session.commit()
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token
    )


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    """Get current user information."""
    return user


@router.get("/me/usage", response_model=StorageUsageResponse)
def get_user_storage_usage(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get current user's storage usage across all storages."""
    # Get all storages owned by the user
    storages = session.exec(
        select(Storage).where(Storage.owner_id == user.id)
    ).all()
    
    storage_ids = [s.id for s in storages]
    
    # Calculate total size and file count
    if storage_ids:
        result = session.exec(
            select(
                func.sum(File.size).label('total_size'),
                func.count(File.id).label('file_count')
            ).where(File.storage_id.in_(storage_ids))
        ).first()
        
        used_bytes = result[0] or 0
        file_count = result[1] or 0
    else:
        used_bytes = 0
        file_count = 0
    
    # For now, set a default quota of 10 GB (can be made configurable per user later)
    total_bytes = 10 * 1024 * 1024 * 1024  # 10 GB in bytes
    
    percentage = (used_bytes / total_bytes * 100) if total_bytes > 0 else 0
    
    return StorageUsageResponse(
        used_bytes=used_bytes,
        total_bytes=total_bytes,
        percentage=round(percentage, 2),
        file_count=file_count
    )
