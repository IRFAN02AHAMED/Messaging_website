import json
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session
from jose import JWTError

from app.database.database import get_db
from app.models.user import User
from app.models.message_status import MessageStatus, MessageStatusEnum
from app.models.message import Message
from app.core.security import decode_access_token

router = APIRouter(prefix="/ws", tags=["WebSocket"])

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> WebSocket connection
        self.active_connections: dict[int, WebSocket] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_json(self, user_id: int, data: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(data)
            except Exception as e:
                # If sending fails, disconnect
                self.disconnect(user_id)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections

manager = ConnectionManager()

@router.websocket("")
async def websocket_endpoint(
    websocket: WebSocket, 
    token: str = Query(...), 
    db: Session = Depends(get_db)
):
    # 1. Verify token
    try:
        user_id = decode_access_token(token)
    except JWTError:
        # Close connection immediately with Policy Violation code
        await websocket.accept() # WebSocket must be accepted before it can be closed with a custom code
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token")
        return

    # 2. Check if user exists
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        await websocket.accept()
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
        return

    await manager.connect(user_id, websocket)

    # Update user online status in database
    user.is_online = True
    db.commit()

    # Mark any 'sent' message statuses for this user as 'delivered'
    sent_statuses = (
        db.query(MessageStatus)
        .filter(
            MessageStatus.user_id == user_id,
            MessageStatus.status == MessageStatusEnum.SENT
        )
        .all()
    )

    if sent_statuses:
        for status_item in sent_statuses:
            status_item.status = MessageStatusEnum.DELIVERED
            status_item.status_updated_at = datetime.now(timezone.utc)
            # Find the sender of the message to notify them in real-time
            msg = db.query(Message).filter(Message.message_id == status_item.message_id).first()
            if msg:
                await manager.send_json(msg.user_id, {
                    "event": "status_update",
                    "data": {
                        "message_id": status_item.message_id,
                        "user_id": user_id,
                        "status": "delivered"
                    }
                })
        db.commit()

    # Broadcast to all other users that this user came online
    for other_user_id in list(manager.active_connections.keys()):
        if other_user_id != user_id:
            await manager.send_json(other_user_id, {
                "event": "user_online",
                "data": {
                    "user_id": user_id,
                    "is_online": True
                }
            })

    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        # Update user offline status in database
        user = db.query(User).filter(User.user_id == user_id).first()
        if user:
            user.is_online = False
            user.last_seen = datetime.now(timezone.utc)
            db.commit()

        # Broadcast that the user went offline
        for other_user_id in list(manager.active_connections.keys()):
            await manager.send_json(other_user_id, {
                "event": "user_online",
                "data": {
                    "user_id": user_id,
                    "is_online": False,
                    "last_seen": user.last_seen.isoformat() if user.last_seen else None
                }
            })
