"""Chat Pydantic schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import ChatType


class ChatBase(BaseModel):
    """Shared chat fields."""

    type: ChatType


class ChatCreate(ChatBase):
    """Schema for creating a chat."""

    participant_ids: list[int] | None = None



class ChatUpdate(BaseModel):
    """Schema for updating a chat."""

    type: ChatType | None = None


class ChatResponse(ChatBase):
    """Schema for chat API responses."""

    model_config = ConfigDict(from_attributes=True)

    chat_id: int
    created_at: datetime
    updated_at: datetime
