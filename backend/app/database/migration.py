"""Database migration script to create all tables."""

from app.core.logger import get_logger, setup_logging
from app.database.database import Base, engine

# Import all models so they register with Base.metadata
import app.models  # noqa: F401

logger = get_logger(__name__)


def create_tables() -> None:
    """Create all database tables defined in ORM models."""
    logger.info("Starting database table creation")
    Base.metadata.create_all(bind=engine)
    logger.info("All database tables created successfully")


if __name__ == "__main__":
    setup_logging()
    create_tables()
