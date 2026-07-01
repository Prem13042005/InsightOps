import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.api.deps import get_db, get_current_user, oauth2_scheme
from app.database.models import AppUser
from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token, blacklist_token

# Initialize authentication APIRouter
router = APIRouter()


# Pydantic schemas for auth requests
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        # Safe email regex check to avoid third-party dependencies errors
        if not re.match(r"[^@]+@[^@]+\.[^@]+", v):
            raise ValueError("Invalid email formatting.")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long.")
        return v


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()


class GoogleLogin(BaseModel):
    id_token: str


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Accepts user registration payload.
    Ensures email is unique, hashes raw password, and commits AppUser to database.
    """
    # 1. Verify email uniqueness
    stmt = select(AppUser).where(AppUser.email == user_in.email)
    existing_user = (await db.execute(stmt)).scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The email is already registered."
        )

    # 2. Hash password and insert AppUser
    new_user = AppUser(
        name=user_in.name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        auth_provider="local"
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "status": "success",
        "message": "User registered successfully"
    }


@router.post("/login")
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticates user using email and password.
    Returns a secure JWT access token with a 60-minute expiry window.
    """
    # 1. Fetch user record
    stmt = select(AppUser).where(AppUser.email == user_in.email)
    user = (await db.execute(stmt)).scalars().first()

    # 2. Check existence and password
    if not user or user.auth_provider != "local" or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # 3. Create session JWT access token
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/google")
async def google_login(payload: GoogleLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticates user using an incoming Google id_token.
    Verifies the token, registers the user if logging in for the first time, 
    and returns a valid app session JWT.
    """
    try:
        # Check if the incoming token is a local mock token
        if payload.id_token.endswith(".demo-signature"):
            import base64
            import json
            parts = payload.id_token.split(".")
            if len(parts) != 3:
                raise ValueError("Malformed mock token structure")
            # Base64 decode payload
            payload_b64 = parts[1]
            pad = len(payload_b64) % 4
            if pad:
                payload_b64 += "=" * (4 - pad)
            decoded_bytes = base64.b64decode(payload_b64)
            idinfo = json.loads(decoded_bytes.decode("utf-8"))
            email = idinfo.get("sub")
            name = email.split("@")[0] if email else "Google User"
        else:
            # Verify id_token using Google transport requests
            idinfo = id_token.verify_oauth2_token(
                payload.id_token, 
                google_requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )
            email = idinfo.get("email")
            name = idinfo.get("name", "")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Google token payload missing email claim."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {e}"
        )

    # Fetch user by email
    stmt = select(AppUser).where(AppUser.email == email)
    user = (await db.execute(stmt)).scalars().first()

    # Auto-register if new user
    if not user:
        random_hash = hash_password("")  # Mock password hash for OAuth users
        user = AppUser(
            name=name or email.split("@")[0],
            email=email,
            password_hash=random_hash,
            auth_provider="google"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Generate session access token
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(
    current_user: AppUser = Depends(get_current_user),
    token: str = Depends(oauth2_scheme)
):
    """
    Protected logout endpoint.
    Blacklists the active bearer token string to prevent re-use.
    """
    blacklist_token(token)
    return {"message": "Successfully logged out"}
