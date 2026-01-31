# Multi-stage build for FastAPI backend
FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY backend/app ./app
COPY backend/scripts ./scripts
COPY backend/.env.example ./.env.example

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Expose port (Fly.io will use the PORT env var)
EXPOSE 8000

# Run the application with increased timeouts for large file uploads
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "300", "--timeout-graceful-shutdown", "60"]
