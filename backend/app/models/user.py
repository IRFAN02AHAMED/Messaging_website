from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.base import TimestampMixin


class User(Base, TimestampMixin):
    """Represents an application user."""

    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    phone_number: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    profile_picture: Mapped[str | None] = mapped_column(String(255), nullable=True)

    about: Mapped[str | None] = mapped_column(Text, nullable=True)

    last_seen: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    is_online: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    theme: Mapped[str] = mapped_column(
        String(50),
        default="dark",
        nullable=False,
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    @property
    def id(self) -> int:
        """Alias for user_id to conform to standard auth schema."""
        return self.user_id

    @property
    def theme_preference(self) -> str:
        """Alias for theme to conform to standard auth schema."""
        return self.theme

    chat_participations: Mapped[list["ChatParticipant"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    messages: Mapped[list["Message"]] = relationship(
        back_populates="sender",
        cascade="all, delete-orphan",
    )

    message_statuses: Mapped[list["MessageStatus"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )