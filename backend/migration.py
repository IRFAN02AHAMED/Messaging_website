"""Database migration entry point.

Run from the backend directory:

    python migration.py
"""

from app.core.logger import setup_logging
from app.database.migration import create_tables

if __name__ == "__main__":
    setup_logging()
    create_tables()
