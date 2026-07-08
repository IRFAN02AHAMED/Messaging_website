"""Message status service containing business logic."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.logger import get_logger
from app.models.chat_participant import ChatParticipant
from app.models.message import Message
from app.models.message_status import MessageStatus, MessageStatusEnum
from app.models.user import User
from app.repositories.message_status_repository import MessageStatusRepository
from app.schemas.message_status import MessageStatusCreate, MessageStatusUpdate

logger = get_logger(__name__)

STATUS_ORDER = {
    MessageStatusEnum.SENT: 0,
    MessageStatusEnum.DELIVERED: 1,
    MessageStatusEnum.READ: 2,
}


class MessageStatusService:
    """Business logic layer for message status operations."""

    def __init__(self, db: Session) -> None:
        self.repository = MessageStatusRepository(db)

    def _validate_message(self, message_id: int) -> Message:
        """Ensure the message exists."""
        message = (
            self.repository.db.query(Message)
            .filter(Message.message_id == message_id)
            .first()
        )
        if not message:
            raise NotFoundException(f"Message with id {message_id} not found")
        return message

    def _validate_user(self, user_id: int) -> User:
        """Ensure the user exists."""
        user = self.repository.db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise NotFoundException(f"User with id {user_id} not found")
        return user

    def _validate_recipient(self, message: Message, user_id: int) -> None:
        """Ensure the user is a participant in the message's chat."""
        if message.user_id == user_id:
            raise ValidationException("Sender cannot have a delivery status on their own message")

        participant = (
            self.repository.db.query(ChatParticipant)
            .filter(
                ChatParticipant.chat_id == message.chat_id,
                ChatParticipant.user_id == user_id,
                ChatParticipant.left_at.is_(None),
            )
            .first()
        )
        if not participant:
            raise ValidationException(
                f"User {user_id} is not an active participant in chat {message.chat_id}"
            )

    def create_message_status(self, payload: MessageStatusCreate) -> MessageStatus:
        """Create a new message status record."""
        logger.info(
            "Service: create message status message_id=%s user_id=%s",
            payload.message_id,
            payload.user_id,
        )
        message = self._validate_message(payload.message_id)
        self._validate_user(payload.user_id)
        self._validate_recipient(message, payload.user_id)

        existing = (
            self.repository.db.query(MessageStatus)
            .filter(
                MessageStatus.message_id == payload.message_id,
                MessageStatus.user_id == payload.user_id,
            )
            .first()
        )
        if existing:
            raise ConflictException(
                f"Status already exists for message {payload.message_id} and user {payload.user_id}"
            )

        status_updated_at = payload.status_updated_at or datetime.now(timezone.utc)
        message_status = MessageStatus(
            message_id=payload.message_id,
            user_id=payload.user_id,
            status=MessageStatusEnum(payload.status.value),
            status_updated_at=status_updated_at,
        )
        return self.repository.create(message_status)

    def get_message_status_by_id(self, message_status_id: int) -> MessageStatus:
        """Retrieve a message status by ID."""
        logger.info("Service: get message_status_id=%s", message_status_id)
        message_status = self.repository.get_by_id(message_status_id)
        if not message_status:
            raise NotFoundException(
                f"Message status with id {message_status_id} not found"
            )
        return message_status

    def get_all_message_statuses(
        self,
        skip: int = 0,
        limit: int = 100,
        user_id: int = None,
        message_id: int = None,
    ) -> list[MessageStatus]:
        """Retrieve all message statuses."""
        logger.info("Service: get all message statuses skip=%s limit=%s user_id=%s message_id=%s", skip, limit, user_id, message_id)
        return self.repository.get_all(skip=skip, limit=limit, user_id=user_id, message_id=message_id)

    def update_message_status(
        self,
        message_status_id: int,
        payload: MessageStatusUpdate,
    ) -> MessageStatus:
        """Update an existing message status."""
        logger.info("Service: update message_status_id=%s", message_status_id)
        message_status = self.get_message_status_by_id(message_status_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "status" in update_data and update_data["status"] is not None:
            new_status = MessageStatusEnum(update_data["status"].value)
            current_order = STATUS_ORDER[message_status.status]
            new_order = STATUS_ORDER[new_status]
            if new_order < current_order:
                raise ValidationException(
                    f"Cannot downgrade status from {message_status.status.value} to {new_status.value}"
                )
            message_status.status = new_status

        if "status_updated_at" in update_data:
            message_status.status_updated_at = update_data["status_updated_at"]
        elif "status" in update_data:
            message_status.status_updated_at = datetime.now(timezone.utc)

        return self.repository.update(message_status)

    def delete_message_status(self, message_status_id: int) -> None:
        """Delete a message status."""
        logger.info("Service: delete message_status_id=%s", message_status_id)
        message_status = self.get_message_status_by_id(message_status_id)
        self.repository.delete(message_status)
