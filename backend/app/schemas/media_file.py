"""Media file Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MediaFileBase(BaseModel):
    """Shared media file fields."""

    message_id: int
    file_url: str = Field(..., max_length=2048)
    file_name: str = Field(..., max_length=512)
    file_size: int = Field(..., ge=0)


class MediaFileCreate(MediaFileBase):
    """Schema for creating a media file record."""


class MediaFileUpdate(BaseModel):
    """Schema for updating a media file record."""

    file_url: str | None = Field(default=None, max_length=2048)
    file_name: str | None = Field(default=None, max_length=512)
    file_size: int | None = Field(default=None, ge=0)


class MediaFileResponse(MediaFileBase):
    """Schema for media file API responses."""

    model_config = ConfigDict(from_attributes=True)

    media_files_id: int
    created_at: datetime
    updated_at: datetime
