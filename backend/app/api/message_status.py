from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.api.utils import handle_service_exception, build_response
from app.core.exceptions import AppException
from app.core.logger import get_logger
from app.database.database import get_db
from app.schemas.message_status import (
    MessageStatusCreate,
    MessageStatusResponse,
    MessageStatusUpdate,
)
from app.services.message_status_service import MessageStatusService
from app.api.auth import get_current_user
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter(prefix="/message-status", tags=["Message Status"])


def get_service(db: Session = Depends(get_db)) -> MessageStatusService:
    return MessageStatusService(db)


# CREATE
@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    payload: MessageStatusCreate, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_service)
):
    try:
        status_obj = service.create_message_status(payload)
        return build_response(
            data=MessageStatusResponse.model_validate(status_obj),
            status_code=201,
            message="Message status created successfully",
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
        status_obj = service.get_message_status_by_id(id)
        # Verify access: only the user themselves or the sender of the associated message
        from app.models.message import Message
        from app.database.database import SessionLocal
        
        # We check if user owns this status or sent the message
        db = SessionLocal()
        try:
            msg = db.query(Message).filter(Message.message_id == status_obj.message_id).first()
            if status_obj.user_id != current_user.user_id and (not msg or msg.user_id != current_user.user_id):
                raise HTTPException(status_code=403, detail="Forbidden: Access to status forbidden")
        finally:
            db.close()

        return build_response(
            data=MessageStatusResponse.model_validate(status_obj),
            message="Message status fetched successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


# GET ALL
@router.get("")
def get_all(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    user_id: int = Query(None),
    message_id: int = Query(None),
    current_user: User = Depends(get_current_user),
    service=Depends(get_service),
):
    statuses = service.get_all_message_statuses(skip, limit, user_id, message_id)

    return build_response(
        data=[
            MessageStatusResponse.model_validate(item)
            for item in statuses
        ],
        message="Message statuses fetched successfully",
    )


# UPDATE
@router.put("/{id}")
async def update(
    id: int, 
    payload: MessageStatusUpdate, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_service), 
    db: Session = Depends(get_db)
):
    try:
        status_obj = service.get_message_status_by_id(id)
        # Check authorization: only the recipient (the user of the status record) can update it
        if status_obj.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Forbidden: You cannot update someone else's message status"
            )

        status_obj = service.update_message_status(id, payload)
        
        # Notify the sender via WS
        from app.api.websocket import manager
        from app.models.message import Message
        
        msg = db.query(Message).filter(Message.message_id == status_obj.message_id).first()
        if msg:
            await manager.send_json(msg.user_id, {
                "event": "status_update",
                "data": {
                    "message_id": status_obj.message_id,
                    "user_id": status_obj.user_id,
                    "status": status_obj.status.value
                }
            })

        return build_response(
            data=MessageStatusResponse.model_validate(status_obj),
            message="Message status updated successfully",
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
        status_obj = service.get_message_status_by_id(id)
        if status_obj.user_id != current_user.user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot delete someone else's message status")

        service.delete_message_status(id)
        return build_response(
            data=None,
            message="Message status deleted successfully",
            status_code=204,
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc