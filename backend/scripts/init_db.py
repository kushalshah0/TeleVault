#!/usr/bin/env python3
"""
Initialize database tables for TeleVault
Run this script after deploying to create all necessary tables
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import SQLModel
from app.database import engine
from app.models import User, Storage, Folder, File, StoragePermission

def init_db():
    """Create all database tables"""
    print("Creating database tables...")
    try:
        SQLModel.metadata.create_all(engine)
        print("✅ Database tables created successfully!")
        print("\nTables created:")
        print("  - users")
        print("  - storages")
        print("  - folders")
        print("  - files")
        print("  - storage_permissions")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_db()
