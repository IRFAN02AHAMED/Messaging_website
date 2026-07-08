"""Chat participant ORM model."""

from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.base import TimestampMixin


class ChatParticipant(Base, TimestampMixin):
    __tablename__ = "chat_participants"

    __table_args__ = (
        UniqueConstraint(
            "chat_id",
            "user_id",
            name="uq_chat_participant_chat_user",
        ),
    )

    chat_participant_id: Mapped[int] = mapped_column(primary_key=True)

    chat_id: Mapped[int] = mapped_column(
        ForeignKey("chats.chat_id")
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id")
    )

    role: Mapped[str] = mapped_column(
        String,
        default="member",
    )

    joined_at: Mapped[datetime]

    left_at: Mapped[datetime | None]

    cleared_at: Mapped[datetime | None] = mapped_column(nullable=True)

    muted_until: Mapped[datetime | None] = mapped_column(nullable=True)

    chat: Mapped["Chat"] = relationship(
        back_populates="participants"
    )

    user: Mapped["User"] = relationship(
        back_populates="chat_participations"
    )