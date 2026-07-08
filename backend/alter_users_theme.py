import os
from sqlalchemy import create_engine, text
from app.core.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN theme VARCHAR(50) DEFAULT 'dark';"))
        conn.commit()
        print("Successfully added theme column to users table.")
    except Exception as e:
        print(f"Error (column might already exist): {e}")
