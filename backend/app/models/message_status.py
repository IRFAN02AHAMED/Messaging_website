import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.base import TimestampMixin


class MessageStatusEnum(str, enum.Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class MessageStatus(Base, TimestampMixin):
    __tablename__ = "message_status"

    __table_args__ = (
        UniqueConstraint(
            "message_id",
            "user_id",
            name="uq_message_status_message_user",
        ),
    )

    message_status_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    message_id: Mapped[int] = mapped_column(
        ForeignKey("messages.message_id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
    )

    status: Mapped[MessageStatusEnum] = mapped_column(
        Enum(MessageStatusEnum, name="message_status_enum"),
        nullable=False,
    )

    status_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    message: Mapped["Message"] = relationship(back_populates="statuses")
    user: Mapped["User"] = relationship(back_populates="message_statuses")