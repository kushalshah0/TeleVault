"""Database connection and session management."""
from sqlmodel import create_engine, Session, SQLModel
from app.config import settings
from contextlib import contextmanager
from typing import Generator


# Create engine with optimized connection pooling for Neon
engine = create_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,  # Check connection health before using
    pool_size=5,  # Reduced for serverless
    max_overflow=10,  # Max additional connections
    pool_recycle=300,  # Recycle connections every 5 minutes
    pool_timeout=60,  # Wait 60s for available connection
    connect_args={
        "connect_timeout": 30,  # 30 second connection timeout
        # Note: statement_timeout not supported with Neon pooler
    }
)


def init_db():
    """Initialize database tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Get database session for dependency injection."""
    with Session(engine) as session:
        yield session


@contextmanager
def get_db_session():
    """Get database session for context manager usage."""
    with Session(engine) as session:
        yield session
