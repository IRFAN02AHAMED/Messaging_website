"""Message service containing business logic."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.core.logger import get_logger
from app.models.chat import Chat
from app.models.chat_participant import ChatParticipant
from app.models.message import Message, MessageTypeEnum
from app.models.message_status import MessageStatus, MessageStatusEnum
from app.models.user import User
from app.repositories.message_repository import MessageRepository
from app.schemas.message import MessageCreate, MessageUpdate

logger = get_logger(__name__)


class MessageService:
    """Business logic layer for message operations."""

    def __init__(self, db: Session) -> None:
        self.repository = MessageRepository(db)

    def _validate_chat(self, chat_id: int) -> Chat:
        """Ensure the chat exists."""
        chat = self.repository.db.query(Chat).filter(Chat.chat_id == chat_id).first()
        if not chat:
            raise NotFoundException(f"Chat with id {chat_id} not found")
        return chat

    def _validate_sender(self, user_id: int) -> User:
        """Ensure the sender exists."""
        user = self.repository.db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise NotFoundException(f"User with id {user_id} not found")
        return user

    def _validate_participant(self, chat_id: int, user_id: int) -> None:
        """Ensure the user is an active participant in the chat."""
        participant = (
            self.repository.db.query(ChatParticipant)
            .filter(
                ChatParticipant.chat_id == chat_id,
                ChatParticipant.user_id == user_id,
                ChatParticipant.left_at.is_(None),
            )
            .first()
        )
        if not participant:
            raise ValidationException(
                f"User {user_id} is not an active participant in chat {chat_id}"
            )

    def create_message(self, payload: MessageCreate) -> Message:
        """Create a new message."""
        logger.info(
            "Service: create message chat_id=%s user_id=%s",
            payload.chat_id,
            payload.user_id,
        )
        self._validate_chat(payload.chat_id)
        self._validate_sender(payload.user_id)
        self._validate_participant(payload.chat_id, payload.user_id)

        if payload.reply_to_message_id:
            reply = self.repository.get_by_id(payload.reply_to_message_id)
            if not reply:
                raise NotFoundException(
                    f"Reply target message {payload.reply_to_message_id} not found"
                )
            if reply.chat_id != payload.chat_id:
                raise ValidationException(
                    "Reply target message must belong to the same chat"
                )

        if payload.message_type == MessageTypeEnum.TEXT and not payload.content:
            raise ValidationException("Text messages must include content")

        sent_at = payload.sent_at or datetime.now(timezone.utc)
        message = Message(
            chat_id=payload.chat_id,
            user_id=payload.user_id,
            reply_to_message_id=payload.reply_to_message_id,
            content=payload.content,
            message_type=MessageTypeEnum(payload.message_type.value),
            sent_at=sent_at,
        )
        created_message = self.repository.create(message)

        # Create message status for all participants except sender
        participants = (
            self.repository.db.query(ChatParticipant)
            .filter(
                ChatParticipant.chat_id == payload.chat_id,
                ChatParticipant.left_at.is_(None),
            )
            .all()
        )
        
        from app.api.websocket import manager
        
        for participant in participants:
            if participant.user_id != payload.user_id:
                is_online = manager.is_online(participant.user_id)
                status_val = MessageStatusEnum.DELIVERED if is_online else MessageStatusEnum.SENT
                
                status = MessageStatus(
                    message_id=created_message.message_id,
                    user_id=participant.user_id,
                    status=status_val,
                    status_updated_at=sent_at,
                )
                self.repository.db.add(status)
        self.repository.db.commit()

        # Broadcast message via WS to online participants
        import asyncio
        from app.schemas.message import MessageResponse
        
        msg_data = MessageResponse.model_validate(created_message).model_dump()
        if isinstance(msg_data.get("sent_at"), datetime):
            msg_data["sent_at"] = msg_data["sent_at"].isoformat()
        if isinstance(msg_data.get("edited_at"), datetime):
            msg_data["edited_at"] = msg_data["edited_at"].isoformat()
        if isinstance(msg_data.get("deleted_at"), datetime):
            msg_data["deleted_at"] = msg_data["deleted_at"].isoformat()

        for participant in participants:
            if participant.user_id != payload.user_id:
                if manager.is_online(participant.user_id):
                    asyncio.create_task(manager.send_json(participant.user_id, {
                        "event": "new_message",
                        "data": msg_data
                    }))

        return created_message

    def get_message_by_id(self, message_id: int) -> Message:
        """Retrieve a message by ID."""
        logger.info("Service: get message_id=%s", message_id)
        message = self.repository.get_by_id(message_id)
        if not message:
            raise NotFoundException(f"Message with id {message_id} not found")
        return message

    def get_all_messages(self, skip: int = 0, limit: int = 100) -> list[Message]:
        """Retrieve all messages."""
        logger.info("Service: get all messages skip=%s limit=%s", skip, limit)
        return self.repository.get_all(skip=skip, limit=limit)

    def update_message(self, message_id: int, payload: MessageUpdate) -> Message:
        """Update an existing message."""
        logger.info("Service: update message_id=%s", message_id)
        message = self.get_message_by_id(message_id)

        if message.deleted_at is not None:
            raise ValidationException("Cannot update a deleted message")

        update_data = payload.model_dump(exclude_unset=True)

        if "message_type" in update_data and update_data["message_type"] is not None:
            message.message_type = MessageTypeEnum(update_data["message_type"].value)
        if "content" in update_data:
            message.content = update_data["content"]
        if "edited_at" in update_data:
            message.edited_at = update_data["edited_at"]
        elif "content" in update_data:
            message.edited_at = datetime.now(timezone.utc)
        if "deleted_at" in update_data:
            message.deleted_at = update_data["deleted_at"]

        return self.repository.update(message)

    def delete_message(self, message_id: int) -> None:
        """Soft-delete a message."""
        logger.info("Service: delete message_id=%s", message_id)
        message = self.get_message_by_id(message_id)
        message.deleted_at = datetime.now(timezone.utc)
        self.repository.update(message)
