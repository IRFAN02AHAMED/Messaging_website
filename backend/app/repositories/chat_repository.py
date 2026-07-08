"""Chat and chat participant repository for database operations."""

from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.models.chat import Chat
from app.models.chat_participant import ChatParticipant

logger = get_logger(__name__)


class ChatRepository:
    """Data access layer for Chat and ChatParticipant entities."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # --- Chat operations ---

    def create(self, chat: Chat) -> Chat:
        """Persist a new chat."""
        logger.info("Repository: creating chat type=%s", chat.type)
        self.db.add(chat)
        self.db.commit()
        self.db.refresh(chat)
        logger.info("Repository: created chat_id=%s", chat.chat_id)
        return chat

    def get_by_id(self, chat_id: int) -> Chat | None:
        """Retrieve a chat by primary key."""
        logger.info("Repository: fetching chat_id=%s", chat_id)
        return self.db.query(Chat).filter(Chat.chat_id == chat_id).first()

    def get_all(self, skip: int = 0, limit: int = 100) -> list[Chat]:
        """Retrieve all chats with pagination."""
        logger.info("Repository: fetching chats skip=%s limit=%s", skip, limit)
        return self.db.query(Chat).offset(skip).limit(limit).all()

    def update(self, chat: Chat) -> Chat:
        """Persist changes to an existing chat."""
        logger.info("Repository: updating chat_id=%s", chat.chat_id)
        self.db.commit()
        self.db.refresh(chat)
        return chat

    def delete(self, chat: Chat) -> None:
        """Remove a chat from the database."""
        logger.info("Repository: deleting chat_id=%s", chat.chat_id)
        self.db.delete(chat)
        self.db.commit()

    # --- Chat participant operations ---

    def create_participant(self, participant: ChatParticipant) -> ChatParticipant:
        """Persist a new chat participant."""
        logger.info(
            "Repository: creating participant chat_id=%s user_id=%s",
            participant.chat_id,
            participant.user_id,
        )
        self.db.add(participant)
        self.db.commit()
        self.db.refresh(participant)
        logger.info(
            "Repository: created chat_participant_id=%s",
            participant.chat_participant_id,
        )
        return participant

    def get_participant_by_id(
        self,
        chat_participant_id: int,
    ) -> ChatParticipant | None:
        """Retrieve a chat participant by primary key."""
        logger.info(
            "Repository: fetching chat_participant_id=%s",
            chat_participant_id,
        )
        return (
            self.db.query(ChatParticipant)
            .filter(ChatParticipant.chat_participant_id == chat_participant_id)
            .first()
        )

    def get_all_participants(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ChatParticipant]:
        """Retrieve all chat participants with pagination."""
        logger.info(
            "Repository: fetching participants skip=%s limit=%s",
            skip,
            limit,
        )
        return self.db.query(ChatParticipant).offset(skip).limit(limit).all()

    def update_participant(self, participant: ChatParticipant) -> ChatParticipant:
        """Persist changes to an existing chat participant."""
        logger.info(
            "Repository: updating chat_participant_id=%s",
            participant.chat_participant_id,
        )
        self.db.commit()
        self.db.refresh(participant)
        return participant

    def delete_participant(self, participant: ChatParticipant) -> None:
        """Remove a chat participant from the database."""
        logger.info(
            "Repository: deleting chat_participant_id=%s",
            participant.chat_participant_id,
        )
        self.db.delete(participant)
        self.db.commit()
