import threading
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from passlib.context import CryptContext
from app.core.config import settings

# Cryptographic context for password hashing using bcrypt backend
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Thread-safe in-memory blacklist for logged-out tokens
_blacklisted_tokens = set()
_blacklist_lock = threading.Lock()


def hash_password(password: str) -> str:
    """
    Hash a plain text password using passlib and bcrypt.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain text password against a bcrypt hashed password.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate an access token (JWT) encoding the provided claims.
    Sets a default expiration of 60 minutes if expires_delta is not provided.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt


def blacklist_token(token: str) -> None:
    """
    Add a token to the thread-safe in-memory blacklist.
    """
    with _blacklist_lock:
        _blacklisted_tokens.add(token)


def is_token_blacklisted(token: str) -> bool:
    """
    Check if a token has been blacklisted.
    """
    with _blacklist_lock:
        return token in _blacklisted_tokens
