"""User service containing business logic."""

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException
from app.core.logger import get_logger
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate

logger = get_logger(__name__)


class UserService:
    """Business logic layer for user operations."""

    def __init__(self, db: Session) -> None:
        self.repository = UserRepository(db)

    def create_user(self, payload: UserCreate) -> User:
        """Create a new user."""
        logger.info("Service: creating user phone_number=%s", payload.phone_number)
        existing = (
            self.repository.db.query(User)
            .filter(User.phone_number == payload.phone_number)
            .first()
        )
        if existing:
            logger.error(
                "Service: phone_number already exists: %s",
                payload.phone_number,
            )
            raise ConflictException(
                f"User with phone number {payload.phone_number} already exists"
            )

        user = User(**payload.model_dump())
        return self.repository.create(user)

    def get_user_by_id(self, user_id: int) -> User:
        """Retrieve a user by ID."""
        logger.info("Service: get user_id=%s", user_id)
        user = self.repository.get_by_id(user_id)
        if not user:
            logger.error("Service: user not found user_id=%s", user_id)
            raise NotFoundException(f"User with id {user_id} not found")
        return user

    def get_all_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        """Retrieve all users."""
        logger.info("Service: get all users skip=%s limit=%s", skip, limit)
        return self.repository.get_all(skip=skip, limit=limit)

    def update_user(self, user_id: int, payload: UserUpdate) -> User:
        """Update an existing user."""
        logger.info("Service: update user_id=%s", user_id)
        user = self.get_user_by_id(user_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "phone_number" in update_data and update_data["phone_number"]:
            existing = (
                self.repository.db.query(User)
                .filter(
                    User.phone_number == update_data["phone_number"],
                    User.user_id != user_id,
                )
                .first()
            )
            if existing:
                raise ConflictException(
                    f"Phone number {update_data['phone_number']} is already in use"
                )

        for field, value in update_data.items():
            setattr(user, field, value)

        return self.repository.update(user)

    def delete_user(self, user_id: int) -> None:
        """Delete a user."""
        logger.info("Service: delete user_id=%s", user_id)
        user = self.get_user_by_id(user_id)
        self.repository.delete(user)
