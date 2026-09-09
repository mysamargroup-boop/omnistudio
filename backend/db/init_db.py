#!/usr/bin/env python3
"""
OmniStudio AI — Database Provisioner & Migration Runner
Run this to test and provision tables on Neon PostgreSQL or local SQLite.
Usage: python init_db.py
"""
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import init_database, test_db_connection
from config import settings

def main():
    print("=" * 60)
    print("OmniStudio AI — Database Provisioner")
    print("=" * 60)
    
    if settings.DATABASE_URL:
        print(f"Connecting to: {settings.DATABASE_URL[:25]}...***")
    else:
        print("DATABASE_URL is not set. Using local SQLite embedded database.")
        
    test = test_db_connection()
    if test.get("success"):
        print(f"[OK] Connected to: {test.get('provider')}")
        print(f"[OK] Engine version: {test.get('version')}")
        print(f"[OK] Ping latency: {test.get('latency_ms')} ms")
    else:
        print(f"[ERROR] Failed to connect: {test.get('error')}")
        sys.exit(1)
        
    print("\nApplying schema migrations...")
    res = init_database()
    if res.get("success"):
        print(f"[SUCCESS] Tables successfully provisioned on {res.get('provider')}!")
        print("  - projects")
        print("  - assets")
        print("  - generations")
        print("  - director_logs")
    else:
        print(f"[ERROR] Migration failed: {res.get('error')}")
        sys.exit(1)
        
    print("\nDatabase is ready for production workloads!")

if __name__ == "__main__":
    main()
