"""Chat participant Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import ParticipantRole


class ChatParticipantBase(BaseModel):
    """Shared chat participant fields."""

    chat_id: int
    user_id: int
    role: ParticipantRole = ParticipantRole.MEMBER
    joined_at: datetime
    left_at: datetime | None = None
    cleared_at: datetime | None = None
    muted_until: datetime | None = None


class ChatParticipantCreate(BaseModel):
    """Schema for adding a participant to a chat."""

    chat_id: int
    user_id: int
    role: ParticipantRole = ParticipantRole.MEMBER
    joined_at: datetime | None = None
    left_at: datetime | None = None


class ChatParticipantUpdate(BaseModel):
    """Schema for updating a chat participant."""

    role: ParticipantRole | None = None
    left_at: datetime | None = None
    cleared_at: datetime | None = None
    muted_until: datetime | None = None


class ChatParticipantResponse(ChatParticipantBase):
    """Schema for chat participant API responses."""

    model_config = ConfigDict(from_attributes=True)

    chat_participant_id: int
    created_at: datetime
    updated_at: datetime
