"""Shared API utilities for exception handling."""

from fastapi import HTTPException, status

from app.core.exceptions import (
    AppException,
    ConflictException,
    NotFoundException,
    ValidationException,
)

from datetime import datetime, timezone
from typing import Any

from app.core.logger import get_logger

logger = get_logger(__name__)



def build_response(
    data: Any = None,
    status_code: int = 200,
    message: str = "success",
):
    return {
        "status_code": status_code,
        "message": message,
        "data": data,
        "timestamp": datetime.now(timezone.utc),
    }


def handle_service_exception(exc: AppException) -> HTTPException:
    """Map service-layer exceptions to HTTP exceptions."""
    logger.error("API exception: %s", exc.message)

    if isinstance(exc, NotFoundException):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=exc.message,
        )
    if isinstance(exc, ConflictException):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.message,
        )
    if isinstance(exc, ValidationException):
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.message,
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=exc.message,
    )
