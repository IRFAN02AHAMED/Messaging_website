import enum
from sqlalchemy import Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.base import TimestampMixin


class ChatTypeEnum(str, enum.Enum):
    PRIVATE = "private"
    GROUP = "group"


class Chat(Base, TimestampMixin):
    __tablename__ = "chats"

    chat_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    type: Mapped[ChatTypeEnum] = mapped_column(
        Enum(ChatTypeEnum, name="chat_type_enum"),
        nullable=False,
    )

    participants: Mapped[list["ChatParticipant"]] = relationship(
        back_populates="chat",
        cascade="all, delete-orphan",
    )

    messages: Mapped[list["Message"]] = relationship(
        back_populates="chat",
        cascade="all, delete-orphan",
    )