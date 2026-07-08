import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.base import TimestampMixin


class MessageTypeEnum(str, enum.Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    FILE = "file"


class Message(Base, TimestampMixin):
    """Represents a message within a chat."""

    __tablename__ = "messages"

    message_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    chat_id: Mapped[int] = mapped_column(
        ForeignKey("chats.chat_id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    reply_to_message_id: Mapped[int | None] = mapped_column(
        ForeignKey("messages.message_id", ondelete="SET NULL"),
        nullable=True,
    )

    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    content: Mapped[str | None] = mapped_column(Text, nullable=True)

    message_type: Mapped[MessageTypeEnum] = mapped_column(
        Enum(MessageTypeEnum, name="message_type_enum"),
        nullable=False,
    )

    chat: Mapped["Chat"] = relationship(back_populates="messages")

    sender: Mapped["User"] = relationship(back_populates="messages")

    reply_to: Mapped["Message | None"] = relationship(
        remote_side="Message.message_id",
        back_populates="replies",
    )

    replies: Mapped[list["Message"]] = relationship(
        back_populates="reply_to",
    )

    media_files: Mapped[list["MediaFile"]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
    )

    statuses: Mapped[list["MessageStatus"]] = relationship(
        back_populates="message",
        cascade="all, delete-orphan",
    )