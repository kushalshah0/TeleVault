#!/usr/bin/env python3
"""Check if TeleVault is properly configured and ready to run."""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


def check_env_file():
    """Check if .env file exists."""
    env_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
    if not os.path.exists(env_path):
        print("✗ .env file not found in backend/")
        print("  Create it from .env.example: cp backend/.env.example backend/.env")
        return False
    print("✓ .env file exists")
    return True


def check_configuration():
    """Check if configuration is valid."""
    try:
        from app.config import settings
        
        # Check database URL
        if not settings.database_url or settings.database_url == "postgresql://user:password@host/database":
            print("✗ DATABASE_URL not configured properly")
            print("  Please set your Neon PostgreSQL connection string in .env")
            return False
        print("✓ Database URL configured")
        
        # Check JWT secret
        if not settings.jwt_secret_key or settings.jwt_secret_key == "your-super-secret-key-change-this-in-production":
            print("✗ JWT_SECRET_KEY not configured properly")
            print("  Generate a secure key: python scripts/generate_secret.py")
            return False
        print("✓ JWT secret key configured")
        
        # Check Telegram tokens
        tokens = settings.telegram_bot_tokens_list
        if not tokens or len(tokens) == 0:
            print("✗ TELEGRAM_BOT_TOKENS not configured")
            print("  Add at least one bot token to .env")
            return False
        print(f"✓ {len(tokens)} Telegram bot token(s) configured")
        
        return True
        
    except Exception as e:
        print(f"✗ Error loading configuration: {e}")
        return False


def check_dependencies():
    """Check if required dependencies are installed."""
    required = [
        ('fastapi', 'FastAPI'),
        ('sqlmodel', 'SQLModel'),
        ('jose', 'python-jose'),
        ('telegram', 'python-telegram-bot'),
    ]
    
    all_installed = True
    for module, package in required:
        try:
            __import__(module)
            print(f"✓ {package} installed")
        except ImportError:
            print(f"✗ {package} not installed")
            print(f"  Install it: pip install {package}")
            all_installed = False
    
    return all_installed


def check_database_connection():
    """Check if database connection works."""
    try:
        from app.database import engine
        from sqlalchemy import text
        
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        print("✓ Database connection successful")
        return True
        
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        print("  Check your DATABASE_URL and ensure the database is accessible")
        return False


def main():
    """Run all checks."""
    print("TeleVault Setup Checker")
    print("=" * 60)
    print()
    
    checks = [
        ("Environment file", check_env_file),
        ("Dependencies", check_dependencies),
        ("Configuration", check_configuration),
        ("Database connection", check_database_connection),
    ]
    
    all_passed = True
    for name, check_func in checks:
        print(f"\n{name}:")
        print("-" * 40)
        if not check_func():
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ All checks passed! TeleVault is ready to run.")
        print("\nStart the application:")
        print("  Backend:  cd backend && uvicorn app.main:app --reload")
        print("  Frontend: cd frontend && npm run dev")
        return 0
    else:
        print("✗ Some checks failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
