"""Chat and chat participant service containing business logic."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.logger import get_logger
from app.models.chat import Chat, ChatTypeEnum
from app.models.chat_participant import ChatParticipant
from app.models.user import User
from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import ChatCreate, ChatUpdate
from app.schemas.chat_participant import ChatParticipantCreate, ChatParticipantUpdate

logger = get_logger(__name__)


class ChatService:
    """Business logic layer for chat and participant operations."""

    def __init__(self, db: Session) -> None:
        self.repository = ChatRepository(db)

    def create_chat(self, payload: ChatCreate) -> Chat:
        """Create a new chat."""
        logger.info("Service: creating chat type=%s", payload.type)

        # Check if private chat already exists
        if payload.type.value == ChatTypeEnum.PRIVATE.value and payload.participant_ids:
            if len(payload.participant_ids) != 2:
                raise ValidationException("A private chat must have exactly 2 participants")
            
            user_1, user_2 = payload.participant_ids[0], payload.participant_ids[1]
            
            user_1_chats = (
                self.repository.db.query(ChatParticipant.chat_id)
                .join(Chat, Chat.chat_id == ChatParticipant.chat_id)
                .filter(
                    Chat.type == ChatTypeEnum.PRIVATE,
                    ChatParticipant.user_id == user_1,
                    ChatParticipant.left_at.is_(None)
                )
                .all()
            )
            user_1_chat_ids = [r[0] for r in user_1_chats]

            matching_chat_participant = (
                self.repository.db.query(ChatParticipant)
                .filter(
                    ChatParticipant.chat_id.in_(user_1_chat_ids),
                    ChatParticipant.user_id == user_2,
                    ChatParticipant.left_at.is_(None)
                )
                .first()
            )
            
            if matching_chat_participant:
                logger.info("Service: existing private chat found chat_id=%s", matching_chat_participant.chat_id)
                return self.repository.get_by_id(matching_chat_participant.chat_id)

        chat = Chat(type=ChatTypeEnum(payload.type.value))
        created_chat = self.repository.create(chat)

        if payload.participant_ids:
            for index, uid in enumerate(payload.participant_ids):
                self._ensure_user_exists(uid)
                # First user gets admin, second member
                role = "admin" if index == 0 else "member"
                participant = ChatParticipant(
                    chat_id=created_chat.chat_id,
                    user_id=uid,
                    role=role,
                    joined_at=datetime.now(timezone.utc),
                )
                self.repository.create_participant(participant)
            self.repository.db.refresh(created_chat)

        return created_chat

    def get_chat_by_id(self, chat_id: int) -> Chat:
        """Retrieve a chat by ID."""
        logger.info("Service: get chat_id=%s", chat_id)
        chat = self.repository.get_by_id(chat_id)
        if not chat:
            logger.error("Service: chat not found chat_id=%s", chat_id)
            raise NotFoundException(f"Chat with id {chat_id} not found")
        return chat

    def get_all_chats(self, skip: int = 0, limit: int = 100) -> list[Chat]:
        """Retrieve all chats."""
        logger.info("Service: get all chats skip=%s limit=%s", skip, limit)
        return self.repository.get_all(skip=skip, limit=limit)

    def get_chats_for_user(self, user_id: int, skip: int = 0, limit: int = 100) -> list[Chat]:
        """Retrieve all chats that a user participates in."""
        logger.info("Service: get chats for user_id=%s skip=%s limit=%s", user_id, skip, limit)
        return (
            self.repository.db.query(Chat)
            .join(ChatParticipant, ChatParticipant.chat_id == Chat.chat_id)
            .filter(
                ChatParticipant.user_id == user_id,
                ChatParticipant.left_at.is_(None)
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update_chat(self, chat_id: int, payload: ChatUpdate) -> Chat:
        """Update an existing chat."""
        logger.info("Service: update chat_id=%s", chat_id)
        chat = self.get_chat_by_id(chat_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "type" in update_data and update_data["type"] is not None:
            chat.type = ChatTypeEnum(update_data["type"].value)

        return self.repository.update(chat)

    def delete_chat(self, chat_id: int) -> None:
        """Delete a chat."""
        logger.info("Service: delete chat_id=%s", chat_id)
        chat = self.get_chat_by_id(chat_id)
        self.repository.delete(chat)

    # --- Chat participant business logic ---

    def _ensure_chat_exists(self, chat_id: int) -> Chat:
        """Validate that a chat exists."""
        chat = self.repository.get_by_id(chat_id)
        if not chat:
            raise NotFoundException(f"Chat with id {chat_id} not found")
        return chat

    def _ensure_user_exists(self, user_id: int) -> User:
        """Validate that a user exists."""
        user = self.repository.db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise NotFoundException(f"User with id {user_id} not found")
        return user

    def create_participant(self, payload: ChatParticipantCreate) -> ChatParticipant:
        """Add a participant to a chat."""
        logger.info(
            "Service: create participant chat_id=%s user_id=%s",
            payload.chat_id,
            payload.user_id,
        )
        chat = self._ensure_chat_exists(payload.chat_id)
        self._ensure_user_exists(payload.user_id)

        # Enforce that private chats can have at most 2 participants
        if chat.type == ChatTypeEnum.PRIVATE:
            active_count = (
                self.repository.db.query(ChatParticipant)
                .filter(
                    ChatParticipant.chat_id == payload.chat_id,
                    ChatParticipant.left_at.is_(None),
                )
                .count()
            )
            if active_count >= 2:
                raise ValidationException("A private chat cannot have more than 2 participants")

        existing = (
            self.repository.db.query(ChatParticipant)
            .filter(
                ChatParticipant.chat_id == payload.chat_id,
                ChatParticipant.user_id == payload.user_id,
                ChatParticipant.left_at.is_(None),
            )
            .first()
        )
        if existing:
            raise ConflictException(
                f"User {payload.user_id} is already an active participant in chat {payload.chat_id}"
            )

        joined_at = payload.joined_at or datetime.now(timezone.utc)
        participant = ChatParticipant(
            chat_id=payload.chat_id,
            user_id=payload.user_id,
            role=payload.role.value,
            joined_at=joined_at,
            left_at=payload.left_at,
        )
        return self.repository.create_participant(participant)

    def get_participant_by_id(self, chat_participant_id: int) -> ChatParticipant:
        """Retrieve a chat participant by ID."""
        logger.info("Service: get participant_id=%s", chat_participant_id)
        participant = self.repository.get_participant_by_id(chat_participant_id)
        if not participant:
            raise NotFoundException(
                f"Chat participant with id {chat_participant_id} not found"
            )
        return participant

    def get_all_participants(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ChatParticipant]:
        """Retrieve all chat participants."""
        logger.info("Service: get all participants skip=%s limit=%s", skip, limit)
        return self.repository.get_all_participants(skip=skip, limit=limit)

    def update_participant(
        self,
        chat_participant_id: int,
        payload: ChatParticipantUpdate,
    ) -> ChatParticipant:
        """Update an existing chat participant."""
        logger.info("Service: update participant_id=%s", chat_participant_id)
        participant = self.get_participant_by_id(chat_participant_id)
        update_data = payload.model_dump(exclude_unset=True)

        if "role" in update_data and update_data["role"] is not None:
            participant.role = update_data["role"].value
        if "left_at" in update_data:
            participant.left_at = update_data["left_at"]
        if "cleared_at" in update_data:
            participant.cleared_at = update_data["cleared_at"]
        if "muted_until" in update_data:
            participant.muted_until = update_data["muted_until"]

        return self.repository.update_participant(participant)

    def delete_participant(self, chat_participant_id: int) -> None:
        """Remove a chat participant."""
        logger.info("Service: delete participant_id=%s", chat_participant_id)
        participant = self.get_participant_by_id(chat_participant_id)
        self.repository.delete_participant(participant)
