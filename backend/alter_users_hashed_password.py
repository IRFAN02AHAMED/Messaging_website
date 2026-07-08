import os
from sqlalchemy import create_engine, inspect, text
import bcrypt
from app.core.config import get_settings

settings = get_settings()
engine = create_engine(settings.database_url)

def run_migration():
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("users")]

    if "hashed_password" in columns:
        print("Column 'hashed_password' already exists in 'users' table – nothing to do.")
        return

    # Use bcrypt directly
    salt = bcrypt.gensalt()
    default_hash = bcrypt.hashpw(b"123456", salt).decode("utf-8")

    with engine.connect() as conn:
        try:
            # 1. Add column as nullable first
            conn.execute(text("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255) NULL;"))
            conn.commit()
            print("Successfully added nullable hashed_password column to users table.")

            # 2. Update existing users with default password hash
            conn.execute(
                text("UPDATE users SET hashed_password = :hash WHERE hashed_password IS NULL;"),
                {"hash": default_hash}
            )
            conn.commit()
            print("Successfully populated existing users with default password hash.")

            # 3. Alter column to NOT NULL
            conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password SET NOT NULL;"))
            conn.commit()
            print("Successfully set hashed_password column to NOT NULL.")
        except Exception as e:
            print(f"Error during migration: {e}")

if __name__ == "__main__":
    run_migration()
