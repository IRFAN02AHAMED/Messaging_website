from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.api.utils import handle_service_exception, build_response
from app.core.exceptions import AppException
from app.core.logger import get_logger
from app.database.database import get_db
from app.schemas.message import MessageCreate, MessageResponse, MessageUpdate
from app.services.message_service import MessageService
from app.api.auth import get_current_user
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter(prefix="/messages", tags=["Messages"])


def get_service(db: Session = Depends(get_db)) -> MessageService:
    return MessageService(db)


# CREATE
@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    payload: MessageCreate, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_service)
):
    try:
        # Override payload user_id with currently logged-in user_id
        payload.user_id = current_user.user_id
        
        message = service.create_message(payload)
        return build_response(
            data=MessageResponse.model_validate(message),
            status_code=201,
            message="Message created successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


# GET BY ID
@router.get("/{id}")
def get_by_id(
    id: int, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_service)
):
    try:
        message = service.get_message_by_id(id)
        return build_response(
            data=MessageResponse.model_validate(message),
            message="Message fetched successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


# GET ALL
@router.get("")
def get_all(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    current_user: User = Depends(get_current_user),
    service=Depends(get_service),
):
    messages = service.get_all_messages(skip, limit)

    return build_response(
        data=[
            MessageResponse.model_validate(m)
            for m in messages
        ],
        message="Messages fetched successfully",
    )


# UPDATE
@router.put("/{id}")
def update(
    id: int, 
    payload: MessageUpdate, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_service)
):
    try:
        message = service.get_message_by_id(id)
        if message.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only update your own messages"
            )
            
        updated = service.update_message(id, payload)
        return build_response(
            data=MessageResponse.model_validate(updated),
            message="Message updated successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


# DELETE
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    id: int, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_service)
):
    try:
        message = service.get_message_by_id(id)
        if message.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only delete your own messages"
            )
            
        service.delete_message(id)
        return build_response(
            data=None,
            message="Message deleted successfully",
            status_code=204,
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc