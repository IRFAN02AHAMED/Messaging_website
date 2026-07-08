"""Add 'theme' column to the users table for existing databases.

This script is idempotent – it checks whether the column already exists
before attempting to add it.  Run it once after deploying the model change:

    python -m app.database.alter_users_table
"""

from sqlalchemy import inspect, text

from app.core.logger import get_logger, setup_logging
from app.database.database import engine

logger = get_logger(__name__)


def add_theme_column() -> None:
    """Add the 'theme' column to users if it doesn't exist."""
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("users")]

    if "theme" in columns:
        logger.info("Column 'theme' already exists in 'users' – nothing to do.")
        return

    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE users ADD COLUMN theme VARCHAR(50) NOT NULL DEFAULT 'dark';")
        )
    logger.info("Column 'theme' added to 'users' table successfully.")


if __name__ == "__main__":
    setup_logging()
    add_theme_column()
