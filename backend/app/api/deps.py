import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import is_token_blacklisted, ALGORITHM
from app.database.session import async_session_maker
from app.database.models import AppUser

# OAuth2 scheme configures FastAPI to look for an Authorization header with Bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_db():
    """
    Database session dependency generator.
    Yields an AsyncSession and guarantees connection closure in a try-finally block.
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_db)
) -> AppUser:
    """
    Decodes the active session JWT token, checks it against the blacklist, 
    verifies user existence in PostgreSQL, and returns the AppUser.
    Raises HTTP 401 Unauthorized if any validation checks fail.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # 1. Check if token is blacklisted (logged out)
    if is_token_blacklisted(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been invalidated. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Decode the JWT and retrieve user_id sub claim
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    # 3. Retrieve user record from database
    user = await db.get(AppUser, user_id)
    if user is None:
        raise credentials_exception

    return user
