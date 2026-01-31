"""Uvicorn configuration for production use with large file uploads."""

# Timeout settings (in seconds)
timeout_keep_alive = 300  # Keep connections alive for 5 minutes
timeout_graceful_shutdown = 60  # Allow 60 seconds for graceful shutdown
limit_max_requests = 10000  # Restart workers after 10k requests (prevents memory leaks)

# Connection settings
backlog = 2048  # Maximum number of pending connections

# Worker settings (for production)
workers = 1  # Number of worker processes (increase for production)
