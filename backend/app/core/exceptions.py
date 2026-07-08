"""Application-specific exception classes."""


class AppException(Exception):
    """Base application exception."""

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class NotFoundException(AppException):
    """Raised when a requested resource does not exist."""


class ConflictException(AppException):
    """Raised when a resource conflict occurs."""


class ValidationException(AppException):
    """Raised when business validation fails."""
