"""Application-wide constants and enumerations."""

from enum import Enum


class ChatType(str, Enum):
    """Supported chat conversation types."""

    PRIVATE = "private"
    GROUP = "group"


class MessageType(str, Enum):
    """Supported message content types."""

    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    FILE = "file"


class MessageDeliveryStatus(str, Enum):
    """Message delivery lifecycle states."""

    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class ParticipantRole(str, Enum):
    """Roles within a chat conversation."""

    ADMIN = "admin"
    MEMBER = "member"
