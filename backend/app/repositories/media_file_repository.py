"""Media file repository for database operations."""

from sqlalchemy.orm import Session

from app.core.logger import get_logger
from app.models.media_file import MediaFile

logger = get_logger(__name__)


class MediaFileRepository:
    """Data access layer for MediaFile entities."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, media_file: MediaFile) -> MediaFile:
        """Persist a new media file record."""
        logger.info(
            "Repository: creating media file message_id=%s",
            media_file.message_id,
        )
        self.db.add(media_file)
        self.db.commit()
        self.db.refresh(media_file)
        logger.info(
            "Repository: created media_files_id=%s",
            media_file.media_files_id,
        )
        return media_file

    def get_by_id(self, media_files_id: int) -> MediaFile | None:
        """Retrieve a media file by primary key."""
        logger.info("Repository: fetching media_files_id=%s", media_files_id)
        return (
            self.db.query(MediaFile)
            .filter(MediaFile.media_files_id == media_files_id)
            .first()
        )

    def get_all(self, skip: int = 0, limit: int = 100) -> list[MediaFile]:
        """Retrieve all media files with pagination."""
        logger.info("Repository: fetching media files skip=%s limit=%s", skip, limit)
        return self.db.query(MediaFile).offset(skip).limit(limit).all()

    def update(self, media_file: MediaFile) -> MediaFile:
        """Persist changes to an existing media file."""
        logger.info(
            "Repository: updating media_files_id=%s",
            media_file.media_files_id,
        )
        self.db.commit()
        self.db.refresh(media_file)
        return media_file

    def delete(self, media_file: MediaFile) -> None:
        """Remove a media file from the database."""
        logger.info(
            "Repository: deleting media_files_id=%s",
            media_file.media_files_id,
        )
        self.db.delete(media_file)
        self.db.commit()
