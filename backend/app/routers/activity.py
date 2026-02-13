"""Activity logging API endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.auth import get_current_user
from app.models import Activity, User
from app.schemas import ActivityResponse
from datetime import datetime

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.get("", response_model=List[ActivityResponse])
def get_activities(
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get user's activity history."""
    # Query activities for current user, ordered by most recent first
    statement = (
        select(Activity)
        .where(Activity.user_id == current_user.id)
        .order_by(Activity.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    
    activities = session.exec(statement).all()
    
    return activities
