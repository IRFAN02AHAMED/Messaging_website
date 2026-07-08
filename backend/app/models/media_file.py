from sqlalchemy import BigInteger, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.models.base import TimestampMixin


class MediaFile(Base, TimestampMixin):
    """Represents media attached to a message."""

    __tablename__ = "media_files"

    media_files_id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    message_id: Mapped[int] = mapped_column(
        ForeignKey("messages.message_id", ondelete="CASCADE"),
        nullable=False,
    )

    file_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    file_name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)

    message: Mapped["Message"] = relationship(
        back_populates="media_files"
    )