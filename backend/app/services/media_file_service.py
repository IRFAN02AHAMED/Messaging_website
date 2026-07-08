"""Media file service containing business logic."""

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.core.logger import get_logger
from app.models.media_file import MediaFile
from app.models.message import Message, MessageTypeEnum
from app.repositories.media_file_repository import MediaFileRepository
from app.schemas.media_file import MediaFileCreate, MediaFileUpdate

logger = get_logger(__name__)

MEDIA_MESSAGE_TYPES = {
    MessageTypeEnum.IMAGE,
    MessageTypeEnum.VIDEO,
    MessageTypeEnum.FILE,
}


class MediaFileService:
    """Business logic layer for media file operations."""

    def __init__(self, db: Session) -> None:
        self.repository = MediaFileRepository(db)

    def _get_message(self, message_id: int) -> Message:
        """Retrieve and validate the parent message."""
        message = (
            self.repository.db.query(Message)
            .filter(Message.message_id == message_id)
            .first()
        )
        if not message:
            raise NotFoundException(f"Message with id {message_id} not found")
        return message

    def create_media_file(self, payload: MediaFileCreate) -> MediaFile:
        """Create a new media file record."""
        logger.info("Service: create media file message_id=%s", payload.message_id)
        message = self._get_message(payload.message_id)

        if message.message_type not in MEDIA_MESSAGE_TYPES:
            raise ValidationException(
                f"Message type {message.message_type.value} does not support media files"
            )

        media_file = MediaFile(**payload.model_dump())
        return self.repository.create(media_file)

    def get_media_file_by_id(self, media_files_id: int) -> MediaFile:
        """Retrieve a media file by ID."""
        logger.info("Service: get media_files_id=%s", media_files_id)
        media_file = self.repository.get_by_id(media_files_id)
        if not media_file:
            raise NotFoundException(
                f"Media file with id {media_files_id} not found"
            )
        return media_file

    def get_all_media_files(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> list[MediaFile]:
        """Retrieve all media files."""
        logger.info("Service: get all media files skip=%s limit=%s", skip, limit)
        return self.repository.get_all(skip=skip, limit=limit)

    def update_media_file(
        self,
        media_files_id: int,
        payload: MediaFileUpdate,
    ) -> MediaFile:
        """Update an existing media file."""
        logger.info("Service: update media_files_id=%s", media_files_id)
        media_file = self.get_media_file_by_id(media_files_id)
        update_data = payload.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(media_file, field, value)

        return self.repository.update(media_file)

    def delete_media_file(self, media_files_id: int) -> None:
        """Delete a media file."""
        logger.info("Service: delete media_files_id=%s", media_files_id)
        media_file = self.get_media_file_by_id(media_files_id)
        self.repository.delete(media_file)
