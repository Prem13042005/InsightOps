from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.database.models import AppUser

router = APIRouter()

class SettingsResponse(BaseModel):
    name: str
    email: str
    has_gemini_key: bool
    access_level: str

class SettingsUpdatePayload(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    gemini_key: Optional[str] = None

@router.get("/settings", response_model=SettingsResponse)
async def get_settings(
    current_user: AppUser = Depends(get_current_user)
):
    """
    Returns profile settings of the currently authenticated user session.
    """
    return {
        "name": current_user.name,
        "email": current_user.email,
        "has_gemini_key": current_user.encrypted_gemini_key is not None and current_user.encrypted_gemini_key != "",
        "access_level": "Administrator"
    }

@router.post("/settings")
async def update_settings(
    payload: SettingsUpdatePayload,
    current_user: AppUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the current user's profile information and custom Gemini API key.
    """
    if payload.name is not None:
        current_user.name = payload.name

    if payload.email is not None and payload.email != current_user.email:
        stmt = select(AppUser).where(AppUser.email == payload.email)
        res = await db.execute(stmt)
        if res.scalar() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already in use by another account."
            )
        current_user.email = payload.email

    if payload.gemini_key is not None:
        if payload.gemini_key.strip() == "":
            current_user.encrypted_gemini_key = None
        elif payload.gemini_key != "••••••••••••••••":
            current_user.encrypted_gemini_key = payload.gemini_key.strip()

    await db.commit()
    return {
        "status": "success",
        "message": "User profile settings updated successfully."
    }
