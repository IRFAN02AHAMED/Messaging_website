"""Message repository for database operations."""

from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.models.message import Message

logger = get_logger(__name__)


class MessageRepository:
    """Data access layer for Message entities."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, message: Message) -> Message:
        """Persist a new message."""
        logger.info(
            "Repository: creating message chat_id=%s user_id=%s",
            message.chat_id,
            message.user_id,
        )
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)
        logger.info("Repository: created message_id=%s", message.message_id)
        return message

    def get_by_id(self, message_id: int) -> Message | None:
        """Retrieve a message by primary key."""
        logger.info("Repository: fetching message_id=%s", message_id)
        return (
            self.db.query(Message).filter(Message.message_id == message_id).first()
        )

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Message]:
        """Retrieve all messages with pagination."""
        logger.info("Repository: fetching messages skip=%s limit=%s", skip, limit)
        return self.db.query(Message).offset(skip).limit(limit).all()

    def update(self, message: Message) -> Message:
        """Persist changes to an existing message."""
        logger.info("Repository: updating message_id=%s", message.message_id)
        self.db.commit()
        self.db.refresh(message)
        return message

    def delete(self, message: Message) -> None:
        """Remove a message from the database."""
        logger.info("Repository: deleting message_id=%s", message.message_id)
        self.db.delete(message)
        self.db.commit()
