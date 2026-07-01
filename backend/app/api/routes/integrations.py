from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db, get_current_user
from app.database.models import AppUser, TenantCredentialVault

router = APIRouter()

class ConnectionPayload(BaseModel):
    connection_name: str
    db_uri: str

@router.post("/connect", status_code=status.HTTP_201_CREATED)
async def connect_integration(
    payload: ConnectionPayload,
    current_user: AppUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Saves a connection string securely in the credential vault associated with the user session.
    """
    new_credential = TenantCredentialVault(
        user_id=current_user.id,
        connection_name=payload.connection_name,
        encrypted_db_uri=payload.db_uri
    )
    db.add(new_credential)
    await db.commit()
    await db.refresh(new_credential)

    return {
        "status": "success",
        "message": f"Connection '{payload.connection_name}' saved successfully in credential vault."
    }
