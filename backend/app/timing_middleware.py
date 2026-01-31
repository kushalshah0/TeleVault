"""Timing middleware to track request performance."""
import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)


class TimingMiddleware(BaseHTTPMiddleware):
    """Middleware to log request timing."""
    
    async def dispatch(self, request: Request, call_next):
        """Time the request and log it."""
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = (time.time() - start_time) * 1000  # Convert to ms
        
        # Log timing
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} - {duration:.2f}ms"
        )
        
        # Add timing header
        response.headers["X-Process-Time"] = f"{duration:.2f}ms"
        
        return response
