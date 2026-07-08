"""Message status repository for database operations."""

from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.models.message_status import MessageStatus

logger = get_logger(__name__)


class MessageStatusRepository:
    """Data access layer for MessageStatus entities."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, message_status: MessageStatus) -> MessageStatus:
        """Persist a new message status record."""
        logger.info(
            "Repository: creating message status message_id=%s user_id=%s",
            message_status.message_id,
            message_status.user_id,
        )

        self.db.add(message_status)
        self.db.commit()
        self.db.refresh(message_status)

        logger.info(
            "Repository: created message_status_id=%s",
            message_status.message_status_id,
        )
        return message_status

    def get_by_id(self, message_status_id: int) -> MessageStatus | None:
        """Retrieve a message status by primary key."""
        logger.info("Repository: fetching message_status_id=%s", message_status_id)
        
        return (
            self.db.query(MessageStatus)
            .filter(MessageStatus.message_status_id == message_status_id)
            .first()
        )

    def get_all(self, skip: int = 0, limit: int = 100, user_id: int = None, message_id: int = None) -> list[MessageStatus]:
        """Retrieve all message statuses with pagination and optional filters."""
        logger.info(
            "Repository: fetching message statuses skip=%s limit=%s user_id=%s message_id=%s",
            skip,
            limit,
            user_id,
            message_id,
        )
        query = self.db.query(MessageStatus)
        if user_id is not None:
            query = query.filter(MessageStatus.user_id == user_id)
        if message_id is not None:
            query = query.filter(MessageStatus.message_id == message_id)
        return query.order_by(MessageStatus.message_status_id.desc()).offset(skip).limit(limit).all()

    def update(self, message_status: MessageStatus) -> MessageStatus:
        """Persist changes to an existing message status."""
        logger.info(
            "Repository: updating message_status_id=%s",
            message_status.message_status_id,
        )
        self.db.commit()
        self.db.refresh(message_status)
        return message_status

    def delete(self, message_status: MessageStatus) -> None:
        """Remove a message status from the database."""
        logger.info(
            "Repository: deleting message_status_id=%s",
            message_status.message_status_id,
        )
        self.db.delete(message_status)
        self.db.commit()
