from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.api.utils import build_response
from app.database.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from jose import JWTError

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        user_id = decode_access_token(token)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    # 1. Check if phone number already exists
    existing = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with phone number {payload.phone_number} already exists"
        )

    # 2. Hash password
    h_password = hash_password(payload.password)

    # 3. Create user
    user = User(
        name=payload.name,
        phone_number=payload.phone_number,
        hashed_password=h_password,
        is_online=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return build_response(
        data=UserResponse.model_validate(user),
        status_code=201,
        message="User registered successfully"
    )

@router.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    # 1. Find user by phone number
    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password"
        )

    # 2. Verify password
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password"
        )

    # 3. Generate JWT
    token = create_access_token(user.user_id)

    # Update online status
    user.is_online = True
    db.commit()
    db.refresh(user)

    return build_response(
        data={
            "access_token": token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user)
        },
        message="Login successful"
    )

# @router.get("/me")
# def get_me(current_user: User = Depends(get_current_user)):
#     return build_response(
#         data=UserResponse.model_validate(current_user),
#         message="Current user fetched successfully"
#     )
