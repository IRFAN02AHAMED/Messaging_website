from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy.orm import Session

from app.api.utils import handle_service_exception, build_response
from app.core.exceptions import AppException
from app.core.logger import get_logger
from app.database.database import get_db
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.user_service import UserService
from app.api.auth import get_current_user
from app.models.user import User

logger = get_logger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(db)


# CREATE (Protected, generally registration uses /auth/register)
@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_user_service)
):
    logger.info("POST /users")
    try:
        user = service.create_user(payload)
        return build_response(
            data=UserResponse.model_validate(user),
            status_code=201,
            message="User created successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


# GET ALL (Requires Auth)
@router.get("")
def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    service=Depends(get_user_service),
):
    logger.info("GET /users skip=%s limit=%s", skip, limit)

    users = service.get_all_users(skip=skip, limit=limit)

    return build_response(
        data=[UserResponse.model_validate(u) for u in users],
        message="Users fetched successfully",
    )


# GET BY ID (Requires Auth)
@router.get("/{user_id}")
def get_user_by_id(
    user_id: int, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_user_service)
):
    try:
        user = service.get_user_by_id(user_id)
        return build_response(
            data=UserResponse.model_validate(user),
            message="User fetched successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


# UPDATE (Only self update allowed)
@router.put("/{user_id}")
def update_user(
    user_id: int, 
    payload: UserUpdate, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_user_service)
):
    if user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only update your own profile"
        )
    try:
        user = service.update_user(user_id, payload)
        return build_response(
            data=UserResponse.model_validate(user),
            message="User updated successfully",
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc


# DELETE (Only self delete allowed)
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int, 
    current_user: User = Depends(get_current_user),
    service=Depends(get_user_service)
):
    if user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You can only delete your own profile"
        )
    try:
        service.delete_user(user_id)
        return build_response(
            data=None,
            message="User deleted successfully",
            status_code=204,
        )
    except AppException as exc:
        raise handle_service_exception(exc) from exc