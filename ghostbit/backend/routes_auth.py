"""
GhostBit Auth Routes
POST /auth/signup, /auth/login, GET /auth/me
POST /auth/forgot-password, /auth/reset-password
GET  /auth/verify-email
"""

import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, EmailStr

from . import database as db
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from .services.email_service import send_verification_email, send_password_reset_email, is_dev_mode, FRONTEND_URL

router = APIRouter(prefix="/auth", tags=["auth"])

VERIFY_TOKEN_EXPIRE_MINUTES = 30
RESET_TOKEN_EXPIRE_MINUTES = 15


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=6, max_length=128)
    email: EmailStr


class LoginRequest(BaseModel):
    username: str
    password: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str


class MessageResponse(BaseModel):
    message: str


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    created_at: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_token() -> str:
    return secrets.token_urlsafe(32)


def _token_expiry(minutes: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()


def _is_token_expired(expiry_str: str | None) -> bool:
    if not expiry_str:
        return True
    try:
        expiry = datetime.fromisoformat(expiry_str)
        return datetime.now(timezone.utc) > expiry
    except (ValueError, TypeError):
        return True


# ---------------------------------------------------------------------------
# Signup
# ---------------------------------------------------------------------------

@router.post("/signup", response_model=MessageResponse)
def signup(body: SignupRequest):
    verification_token = _generate_token()
    token_expiry = _token_expiry(VERIFY_TOKEN_EXPIRE_MINUTES)

    try:
        user = db.create_user(
            username=body.username,
            hashed_password=hash_password(body.password),
            email=body.email,
            verification_token=verification_token,
            token_expiry=token_expiry,
        )
    except ValueError as e:
        detail = str(e)
        if "email" in detail.lower():
            raise HTTPException(status_code=409, detail="Email already registered")
        raise HTTPException(status_code=409, detail="Username already exists")

    # Send verification email
    send_verification_email(body.email, verification_token)

    msg = "Account created. Please check your email to verify your account."
    if is_dev_mode():
        verify_link = f"{FRONTEND_URL}/verify?token={verification_token}"
        msg += f" [DEV MODE] Verify here: {verify_link}"

    return MessageResponse(message=msg)


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------

@router.get("/verify-email", response_model=MessageResponse)
def verify_email(token: str):
    user = db.get_user_by_verification_token(token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    if _is_token_expired(user.get("token_expiry")):
        raise HTTPException(status_code=400, detail="Verification token has expired")

    db.verify_user_email(user["id"])
    return MessageResponse(message="Email verified successfully. You can now log in.")


# ---------------------------------------------------------------------------
# Resend verification email
# ---------------------------------------------------------------------------

@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(body: ResendVerificationRequest):
    generic_msg = "If an unverified account with that email exists, a new verification link has been sent."

    user = db.get_user_by_email(body.email)
    if not user or user.get("is_verified"):
        return MessageResponse(message=generic_msg)

    new_token = _generate_token()
    new_expiry = _token_expiry(VERIFY_TOKEN_EXPIRE_MINUTES)
    db.set_verification_token(user["id"], new_token, new_expiry)

    send_verification_email(body.email, new_token)

    if is_dev_mode():
        verify_link = f"{FRONTEND_URL}/verify?token={new_token}"
        return MessageResponse(message=f"{generic_msg} [DEV MODE] Verify here: {verify_link}")

    return MessageResponse(message=generic_msg)


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = db.get_user_by_username(body.username)
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("is_verified"):
        raise HTTPException(status_code=403, detail="Email not verified. Please check your inbox.")

    token = create_access_token({"sub": str(user["id"]), "role": user["role"]})
    return TokenResponse(
        access_token=token, role=user["role"], username=user["username"]
    )


# ---------------------------------------------------------------------------
# Forgot password
# ---------------------------------------------------------------------------

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(body: ForgotPasswordRequest):
    # Always return same message to prevent email enumeration
    generic_msg = "If an account with that email exists, a reset link has been sent."

    user = db.get_user_by_email(body.email)
    if not user:
        return MessageResponse(message=generic_msg)

    reset_token = _generate_token()
    expiry = _token_expiry(RESET_TOKEN_EXPIRE_MINUTES)
    db.set_reset_token(user["id"], reset_token, expiry)

    send_password_reset_email(body.email, reset_token)
    return MessageResponse(message=generic_msg)


# ---------------------------------------------------------------------------
# Reset password
# ---------------------------------------------------------------------------

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest):
    user = db.get_user_by_reset_token(body.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    if _is_token_expired(user.get("token_expiry")):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    db.update_user_password(user["id"], hash_password(body.new_password))
    return MessageResponse(message="Password reset successfully. You can now log in.")


# ---------------------------------------------------------------------------
# Me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
def me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        username=user["username"],
        role=user["role"],
        created_at=user["created_at"],
    )
