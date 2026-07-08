import os
from sqlalchemy import create_engine, text
from app.core.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE chat_participants ADD COLUMN cleared_at TIMESTAMP;"))
        conn.commit()
        print("Successfully added cleared_at column to chat_participants table.")
    except Exception as e:
        print(f"Error adding cleared_at: {e}")

    try:
        conn.execute(text("ALTER TABLE chat_participants ADD COLUMN muted_until TIMESTAMP;"))
        conn.commit()
        print("Successfully added muted_until column to chat_participants table.")
    except Exception as e:
        print(f"Error adding muted_until: {e}")
