"""User Pydantic schemas."""

import re
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

PHONE_REGEX = re.compile(r"^(\d{10}|\+\d{10,15})$")

def validate_phone(v: str) -> str:
    v = v.strip()
    if not PHONE_REGEX.match(v):
        raise ValueError("Phone number must be a 10-digit number or in E.164 format (e.g., +1234567890)")
    return v

# class UserBase(BaseModel):
#     """Shared user fields."""
#     phone_number: str = Field(..., max_length=255)
#     name: str = Field(..., max_length=255)
#     profile_picture: str | None = Field(default=None, max_length=255)
#     about: str | None = None
#     last_seen: datetime | None = None
#     is_online: bool = False
#     theme: str = Field(default="dark", max_length=50)

#     @field_validator("phone_number")
#     @classmethod
#     def validate_phone_number(cls, v: str) -> str:
#         return validate_phone(v)

class UserCreate(BaseModel):
    """Schema for creating/registering a user."""
    name: str = Field(..., max_length=255)
    phone_number: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=255)

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        return validate_phone(v)

class UserLogin(BaseModel):
    """Schema for user login request."""
    phone_number: str
    password: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        return validate_phone(v)

class UserUpdate(BaseModel):
    """Schema for updating a user."""
    phone_number: str | None = Field(default=None, max_length=255)
    name: str | None = Field(default=None, max_length=255)
    profile_picture: str | None = Field(default=None, max_length=255)
    about: str | None = None
    last_seen: datetime | None = None
    is_online: bool | None = None
    theme: str | None = Field(default=None, max_length=50)

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_phone(v)
        return v

class UserResponse(BaseModel):
    """Schema for user API responses."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    user_id: int
    name: str
    phone_number: str
    profile_picture: str | None = None
    about: str | None = None
    last_seen: datetime | None = None
    is_online: bool = False
    theme: str
    theme_preference: str = Field(default="dark", validation_alias="theme")
    created_at: datetime
    updated_at: datetime
