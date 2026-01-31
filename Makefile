# TeleVault Makefile
# Provides convenient commands for development and deployment

.PHONY: help install dev-backend dev-frontend test clean docker-build docker-up docker-down

help:
	@echo "TeleVault Development Commands"
	@echo "=============================="
	@echo "install          - Install all dependencies"
	@echo "dev-backend      - Run backend in development mode"
	@echo "dev-frontend     - Run frontend in development mode"
	@echo "test             - Run all tests"
	@echo "test-backend     - Run backend tests only"
	@echo "lint             - Run linters"
	@echo "format           - Format code"
	@echo "check-setup      - Check if setup is correct"
	@echo "init-db          - Initialize database"
	@echo "docker-build     - Build Docker images"
	@echo "docker-up        - Start Docker containers"
	@echo "docker-down      - Stop Docker containers"
	@echo "clean            - Clean temporary files"

install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✓ All dependencies installed"

install-dev:
	@echo "Installing development dependencies..."
	cd backend && pip install -r requirements-dev.txt
	cd frontend && npm install
	@echo "✓ Development dependencies installed"

dev-backend:
	@echo "Starting backend server..."
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "Starting frontend server..."
	cd frontend && npm run dev

test:
	@echo "Running all tests..."
	cd backend && pytest
	@echo "✓ All tests passed"

test-backend:
	@echo "Running backend tests..."
	cd backend && pytest -v

test-coverage:
	@echo "Running tests with coverage..."
	cd backend && pytest --cov=app --cov-report=html --cov-report=term
	@echo "Coverage report generated in backend/htmlcov/"

lint:
	@echo "Running linters..."
	cd backend && flake8 app
	@echo "✓ Linting complete"

format:
	@echo "Formatting code..."
	cd backend && black app
	cd backend && isort app
	@echo "✓ Code formatted"

type-check:
	@echo "Running type checker..."
	cd backend && mypy app
	@echo "✓ Type checking complete"

check-setup:
	@echo "Checking setup..."
	python scripts/check_setup.py

init-db:
	@echo "Initializing database..."
	python scripts/init_db.py

generate-secret:
	@echo "Generating secret key..."
	python scripts/generate_secret.py

docker-build:
	@echo "Building Docker images..."
	docker-compose build
	@echo "✓ Docker images built"

docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d
	@echo "✓ Containers started"
	@echo "Backend: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down
	@echo "✓ Containers stopped"

docker-logs:
	docker-compose logs -f backend

clean:
	@echo "Cleaning temporary files..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete 2>/dev/null || true
	cd frontend && rm -rf node_modules dist 2>/dev/null || true
	@echo "✓ Cleaned temporary files"

.DEFAULT_GOAL := help
