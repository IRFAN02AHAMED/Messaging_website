"""Message status Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.core.constants import MessageDeliveryStatus


class MessageStatusBase(BaseModel):
    """Shared message status fields."""

    message_id: int
    user_id: int
    status: MessageDeliveryStatus
    status_updated_at: datetime


class MessageStatusCreate(BaseModel):
    """Schema for creating a message status record."""

    message_id: int
    user_id: int
    status: MessageDeliveryStatus = MessageDeliveryStatus.SENT
    status_updated_at: datetime | None = None


class MessageStatusUpdate(BaseModel):
    """Schema for updating a message status record."""

    status: MessageDeliveryStatus | None = None
    status_updated_at: datetime | None = None


class MessageStatusResponse(MessageStatusBase):
    """Schema for message status API responses."""

    model_config = ConfigDict(from_attributes=True)

    message_status_id: int
    created_at: datetime
    updated_at: datetime
