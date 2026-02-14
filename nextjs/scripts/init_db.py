#!/usr/bin/env python3
"""Initialize the database with tables and optional test data."""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import init_db, get_db_session
from app.models import User
from app.auth import hash_password


def create_test_user():
    """Create a test user for development."""
    with get_db_session() as session:
        # Check if user exists
        from sqlmodel import select
        statement = select(User).where(User.username == "admin")
        existing = session.exec(statement).first()
        
        if existing:
            print("Test user 'admin' already exists")
            return
        
        # Create admin user
        user = User(
            username="admin",
            email="admin@televault.local",
            hashed_password=hash_password("admin123"),
            is_active=True
        )
        session.add(user)
        session.commit()
        print("✓ Created test user: admin / admin123")


def main():
    """Main initialization function."""
    print("Initializing TeleVault database...")
    
    try:
        init_db()
        print("✓ Database tables created successfully")
        
        # Ask if user wants to create test data
        create_test = input("Create test user (admin/admin123)? [y/N]: ").lower()
        if create_test == 'y':
            create_test_user()
        
        print("\n✓ Database initialization complete!")
        print("\nNext steps:")
        print("1. Start the backend: cd backend && uvicorn app.main:app --reload")
        print("2. Start the frontend: cd frontend && npm run dev")
        print("3. Open http://localhost:5173 in your browser")
        
    except Exception as e:
        print(f"\n✗ Error initializing database: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
