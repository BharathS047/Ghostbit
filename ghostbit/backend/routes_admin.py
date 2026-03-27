"""
GhostBit Admin Routes
GET /admin/users, PUT /admin/users/{id}/role
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from . import database as db
from .auth import require_role

router = APIRouter(prefix="/admin", tags=["admin"])

admin_only = require_role("admin")


class RoleUpdate(BaseModel):
    role: str = Field(pattern="^(decoy|approved|admin)$")


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    created_at: str


@router.get("/users", response_model=list[UserOut])
def list_users(user: dict = Depends(admin_only)):
    return db.list_users()


@router.put("/users/{user_id}/role", response_model=UserOut)
def update_role(user_id: int, body: RoleUpdate, user: dict = Depends(admin_only)):
    updated = db.update_user_role(user_id, body.role)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return updated


