"""User repository for database operations."""

from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.models.user import User

logger = get_logger(__name__)


class UserRepository:
    """Data access layer for User entities."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, user: User) -> User:
        """Persist a new user."""
        logger.info("Repository: creating user with phone_number=%s", user.phone_number)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        logger.info("Repository: created user_id=%s", user.user_id)
        return user

    def get_by_id(self, user_id: int) -> User | None:
        """Retrieve a user by primary key."""
        logger.info("Repository: fetching user_id=%s", user_id)
        return self.db.query(User).filter(User.user_id == user_id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> list[User]:
        """Retrieve all users with pagination."""
        logger.info("Repository: fetching users skip=%s limit=%s", skip, limit)
        return self.db.query(User).offset(skip).limit(limit).all()

    def update(self, user: User) -> User:
        """Persist changes to an existing user."""
        logger.info("Repository: updating user_id=%s", user.user_id)
        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        """Remove a user from the database."""
        logger.info("Repository: deleting user_id=%s", user.user_id)
        self.db.delete(user)
        self.db.commit()
