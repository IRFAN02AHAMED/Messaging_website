"""Message Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import MessageType


class MessageBase(BaseModel):
    """Shared message fields."""

    chat_id: int
    user_id: int | None = None
    reply_to_message_id: int | None = None
    content: str | None = None
    message_type: MessageType = MessageType.TEXT


class MessageCreate(MessageBase):
    """Schema for creating a message."""

    sent_at: datetime | None = None


class MessageUpdate(BaseModel):
    """Schema for updating a message."""

    content: str | None = None
    message_type: MessageType | None = None
    edited_at: datetime | None = None
    deleted_at: datetime | None = None


class MessageResponse(MessageBase):
    """Schema for message API responses."""

    model_config = ConfigDict(from_attributes=True)

    message_id: int
    sent_at: datetime
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
