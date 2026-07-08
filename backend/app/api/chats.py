from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone

from app.api.utils import handle_service_exception, build_response
from app.core.exceptions import AppException
from app.core.logger import get_logger
from app.database.database import get_db
from app.models.chat import Chat
from app.models.chat_participant import ChatParticipant
from app.models.message_status import MessageStatus, MessageStatusEnum
from app.models.message import Message
from app.schemas.chat import ChatCreate, ChatResponse, ChatUpdate
from app.schemas.chat_participant import (
    ChatParticipantCreate,
    ChatParticipantResponse,
    ChatParticipantUpdate,
)
from app.services.chat_service import ChatService
from app.api.auth import get_current_user
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter(prefix="/chats", tags=["Chats"])


def get_chat_service(db=Depends(get_db)) -> ChatService:
    return ChatService(db)


# -------------------------
# CHATS
# -------------------------

@router.post("", status_code=status.HTTP_201_CREATED)
def create_chat(
    payload: ChatCreate, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_chat_service)
):
    try:
        # Enforce that current user is a participant
        if not payload.participant_ids:
            payload.participant_ids = [current_user.user_id]
        elif current_user.user_id not in payload.participant_ids:
            payload.participant_ids.append(current_user.user_id)

        chat = service.create_chat(payload)
        return build_response(
            data=ChatResponse.model_validate(chat),
            status_code=201,
            message="Chat created successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


@router.get("")
def get_all_chats(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    service=Depends(get_chat_service),
):
    chats = service.get_chats_for_user(current_user.user_id, skip=skip, limit=limit)

    return build_response(
        data=[ChatResponse.model_validate(c) for c in chats],
        message="Chats fetched successfully",
    )


@router.get("/{chat_id : int}")
def get_chat(
    chat_id: int, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_chat_service)
):
    try:
        chat = service.get_chat_by_id(chat_id)
        # Authorize: Check if current user is an active participant in this chat
        is_member = any(p.user_id == current_user.user_id and p.left_at is None for p in chat.participants)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to chat forbidden")

        return build_response(
            data=ChatResponse.model_validate(chat),
            message="Chat fetched successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


@router.put("/{chat_id}")
def update_chat(
    chat_id: int, 
    payload: ChatUpdate, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_chat_service)
):
    try:
        chat = service.get_chat_by_id(chat_id)
        # Authorize
        is_member = any(p.user_id == current_user.user_id and p.left_at is None for p in chat.participants)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to chat forbidden")

        updated_chat = service.update_chat(chat_id, payload)
        return build_response(
            data=ChatResponse.model_validate(updated_chat),
            message="Chat updated successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    chat_id: int, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_chat_service)
):
    try:
        chat = service.get_chat_by_id(chat_id)
        # Authorize
        is_member = any(p.user_id == current_user.user_id and p.left_at is None for p in chat.participants)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to chat forbidden")

        service.delete_chat(chat_id)
        return build_response(
            data=None,
            message="Chat deleted successfully",
            status_code=204,
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


class ChatMutePayload(BaseModel):
    muted_until: str | None = None


@router.post("/{chat_id}/mute")
def mute_chat(
    chat_id: int, 
    payload: ChatMutePayload, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    participant = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == current_user.user_id,
            ChatParticipant.left_at.is_(None)
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    if payload.muted_until:
        try:
            # Parse ISO string
            participant.muted_until = datetime.fromisoformat(payload.muted_until.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        participant.muted_until = None

    db.commit()
    return build_response(message="Chat muted successfully")


@router.post("/{chat_id}/clear")
def clear_chat(
    chat_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    participant = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.chat_id == chat_id,
            ChatParticipant.user_id == current_user.user_id,
            ChatParticipant.left_at.is_(None)
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    participant.cleared_at = datetime.now(timezone.utc)
    db.commit()
    return build_response(message="Chat cleared successfully")


@router.get("/unread-counts")
def get_unread_counts(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    user_id = current_user.user_id
    participations = (
        db.query(ChatParticipant)
        .filter(
            ChatParticipant.user_id == user_id,
            ChatParticipant.left_at.is_(None)
        )
        .all()
    )

    counts = {}
    for p in participations:
        query = (
            db.query(MessageStatus)
            .join(Message, Message.message_id == MessageStatus.message_id)
            .filter(
                MessageStatus.user_id == user_id,
                Message.chat_id == p.chat_id,
                MessageStatus.status != MessageStatusEnum.READ
            )
        )
        if p.cleared_at:
            query = query.filter(Message.sent_at > p.cleared_at)

        counts[p.chat_id] = query.count()

    return build_response(data=counts)


# -------------------------
# PARTICIPANTS
# -------------------------

@router.get("/participants")
def get_all_participants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    service=Depends(get_chat_service),
):
    participants = service.get_all_participants(skip, limit)

    return build_response(
        data=[ChatParticipantResponse.model_validate(p) for p in participants],
        message="Participants fetched successfully",
    )


@router.post("/participants", status_code=status.HTTP_201_CREATED)
def create_participant(
    payload: ChatParticipantCreate,
    current_user: User = Depends(get_current_user),
    service=Depends(get_chat_service),
):
    try:
        # Check authorization: current user must be a member of the chat
        chat = service.get_chat_by_id(payload.chat_id)
        is_member = any(p.user_id == current_user.user_id and p.left_at is None for p in chat.participants)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to chat forbidden")

        participant = service.create_participant(payload)
        return build_response(
            data=ChatParticipantResponse.model_validate(participant),
            status_code=201,
            message="Participant added successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


@router.get("/participants/{id}")
def get_participant(
    id: int, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_chat_service)
):
    try:
        participant = service.get_participant_by_id(id)
        return build_response(
            data=ChatParticipantResponse.model_validate(participant),
            message="Participant fetched successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


@router.put("/participants/{id}")
def update_participant(
    id: int,
    payload: ChatParticipantUpdate,
    current_user: User = Depends(get_current_user),
    service=Depends(get_chat_service),
):
    try:
        # Ensure only updating self membership, or verifying member status
        participant = service.get_participant_by_id(id)
        chat = service.get_chat_by_id(participant.chat_id)
        is_member = any(p.user_id == current_user.user_id and p.left_at is None for p in chat.participants)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to chat forbidden")

        updated = service.update_participant(id, payload)
        return build_response(
            data=ChatParticipantResponse.model_validate(updated),
            message="Participant updated successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


@router.delete("/participants/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_participant(
    id: int, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_chat_service)
):
    try:
        participant = service.get_participant_by_id(id)
        chat = service.get_chat_by_id(participant.chat_id)
        is_member = any(p.user_id == current_user.user_id and p.left_at is None for p in chat.participants)
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to chat forbidden")

        service.delete_participant(id)
        return build_response(
            data=None,
            message="Participant deleted successfully",
            status_code=204,
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc