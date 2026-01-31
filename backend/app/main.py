"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routers import auth, storage, folders, files
from app.timing_middleware import TimingMiddleware
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Telegram-backed cloud storage platform",
    version="1.0.0",
    debug=settings.debug
)

# Add timing middleware (before CORS)
app.add_middleware(TimingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(storage.router)
app.include_router(folders.router)
app.include_router(files.router)


@app.on_event("startup")
def on_startup():
    """Initialize database on startup."""
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")
    
    # Start background activity logger
    from app.activity_logger import start_activity_logger
    start_activity_logger()
    logger.info("Background activity logger started")


@app.on_event("shutdown")
def on_shutdown():
    """Cleanup on shutdown."""
    from app.activity_logger import stop_activity_logger
    stop_activity_logger()
    logger.info("Background activity logger stopped")


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
