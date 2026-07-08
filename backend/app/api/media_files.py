from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.api.utils import handle_service_exception, build_response
from app.core.exceptions import AppException
from app.core.logger import get_logger
from app.database.database import get_db
from app.schemas.media_file import (
    MediaFileCreate,
    MediaFileResponse,
    MediaFileUpdate,
)
from app.services.media_file_service import MediaFileService
from app.api.auth import get_current_user
from app.models.user import User
from app.models.message import Message
from app.models.chat_participant import ChatParticipant

logger = get_logger(__name__)

router = APIRouter(prefix="/media-files", tags=["Media Files"])


def get_service(db: Session = Depends(get_db)) -> MediaFileService:
    return MediaFileService(db)


# CREATE
@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    payload: MediaFileCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service=Depends(get_service)
):
    try:
        # Check authorization: current user must be a participant in the message's chat
        msg = db.query(Message).filter(Message.message_id == payload.message_id).first()
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")
            
        participant = db.query(ChatParticipant).filter(
            ChatParticipant.chat_id == msg.chat_id,
            ChatParticipant.user_id == current_user.user_id,
            ChatParticipant.left_at.is_(None)
        ).first()
        if not participant:
            raise HTTPException(status_code=403, detail="Forbidden: You do not belong to this chat")

        media = service.create_media_file(payload)
        return build_response(
            data=MediaFileResponse.model_validate(media),
            status_code=201,
            message="Media file created successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


# GET BY ID
@router.get("/{id}")
def get_by_id(
    id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service=Depends(get_service)
):
    try:
        media = service.get_media_file_by_id(id)
        # Check authorization: current user must be a participant in the message's chat
        msg = db.query(Message).filter(Message.message_id == media.message_id).first()
        if msg:
            participant = db.query(ChatParticipant).filter(
                ChatParticipant.chat_id == msg.chat_id,
                ChatParticipant.user_id == current_user.user_id,
                ChatParticipant.left_at.is_(None)
            ).first()
            if not participant:
                raise HTTPException(status_code=403, detail="Forbidden: Access to media forbidden")

        return build_response(
            data=MediaFileResponse.model_validate(media),
            message="Media file fetched successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


# GET ALL
@router.get("")
def get_all(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    service=Depends(get_service),
):
    media_files = service.get_all_media_files(skip, limit)

    return build_response(
        data=[
            MediaFileResponse.model_validate(item)
            for item in media_files
        ],
        message="Media files fetched successfully",
    )


# UPDATE
@router.put("/{id}")
def update(
    id: int, 
    payload: MediaFileUpdate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service=Depends(get_service)
):
    try:
        media = service.get_media_file_by_id(id)
        # Check authorization: only the sender of the associated message can update
        msg = db.query(Message).filter(Message.message_id == media.message_id).first()
        if not msg or msg.user_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot modify this media file")

        updated = service.update_media_file(id, payload)
        return build_response(
            data=MediaFileResponse.model_validate(updated),
            message="Media file updated successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


# DELETE
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    service=Depends(get_service)
):
    try:
        media = service.get_media_file_by_id(id)
        # Check authorization: only the sender of the associated message can delete
        msg = db.query(Message).filter(Message.message_id == media.message_id).first()
        if not msg or msg.user_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot delete this media file")

        service.delete_media_file(id)
        return build_response(
            data=None,
            message="Media file deleted successfully",
            status_code=204,
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc