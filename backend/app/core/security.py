import os
from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt, JWTError

SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secure_secret_key_change_me_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: int) -> str:
    """Create a JWT access token containing only sub, iat, and exp claims."""
    utc_now = datetime.now(timezone.utc)
    expire = utc_now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": str(user_id),
        "iat": utc_now,
        "exp": expire
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> int:
    """Decode a JWT token and extract the user_id (subject)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise JWTError("Missing subject ('sub') claim in token")
        return int(user_id_str)
    except (JWTError, ValueError) as e:
        raise JWTError(f"Invalid token: {str(e)}")
