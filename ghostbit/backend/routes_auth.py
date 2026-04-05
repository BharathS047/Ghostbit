"""
GhostBit Auth Routes
POST /auth/signup, /auth/login, /auth/verify-email
POST /auth/forgot-password, /auth/reset-password
GET  /auth/me
"""

import secrets
import random
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
from .services.email_service import send_verification_code, send_password_reset_code, is_dev_mode

router = APIRouter(prefix="/auth", tags=["auth"])

VERIFY_CODE_EXPIRE_MINUTES = 30
RESET_CODE_EXPIRE_MINUTES = 15


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


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
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

def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _code_expiry(minutes: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()


def _is_code_expired(expiry_str: str | None) -> bool:
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
    verification_code = _generate_code()
    code_expiry = _code_expiry(VERIFY_CODE_EXPIRE_MINUTES)

    try:
        user = db.create_user(
            username=body.username,
            hashed_password=hash_password(body.password),
            email=body.email,
            verification_token=verification_code,
            token_expiry=code_expiry,
        )
    except ValueError as e:
        detail = str(e)
        if "email" in detail.lower():
            raise HTTPException(status_code=409, detail="Email already registered")
        raise HTTPException(status_code=409, detail="Username already exists")

    send_verification_code(body.email, verification_code)

    msg = "Account created. Please enter the 6-digit code sent to your email."
    if is_dev_mode():
        msg += f" [DEV CODE] {verification_code}"

    return MessageResponse(message=msg)


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------

@router.post("/verify-email", response_model=MessageResponse)
def verify_email(body: VerifyEmailRequest):
    user = db.get_user_by_email(body.email)
    if not user or user.get("verification_token") != body.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    if _is_code_expired(user.get("token_expiry")):
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")

    db.verify_user_email(user["id"])
    return MessageResponse(message="Email verified successfully. You can now log in.")


# ---------------------------------------------------------------------------
# Resend verification email
# ---------------------------------------------------------------------------

@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(body: ResendVerificationRequest):
    generic_msg = "If an unverified account with that email exists, a new verification code has been sent."

    user = db.get_user_by_email(body.email)
    if not user or user.get("is_verified"):
        return MessageResponse(message=generic_msg)

    new_code = _generate_code()
    new_expiry = _code_expiry(VERIFY_CODE_EXPIRE_MINUTES)
    db.set_verification_token(user["id"], new_code, new_expiry)

    send_verification_code(body.email, new_code)

    if is_dev_mode():
        return MessageResponse(message=f"{generic_msg} [DEV CODE] {new_code}")

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
    generic_msg = "If an account with that email exists, a 6-digit reset code has been sent."

    user = db.get_user_by_email(body.email)
    if not user:
        return MessageResponse(message=generic_msg)

    reset_code = _generate_code()
    expiry = _code_expiry(RESET_CODE_EXPIRE_MINUTES)
    db.set_reset_token(user["id"], reset_code, expiry)

    send_password_reset_code(body.email, reset_code)

    if is_dev_mode():
        return MessageResponse(message=f"{generic_msg} [DEV CODE] {reset_code}")

    return MessageResponse(message=generic_msg)


# ---------------------------------------------------------------------------
# Reset password
# ---------------------------------------------------------------------------

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest):
    user = db.get_user_by_email(body.email)
    if not user or user.get("reset_token") != body.code:
        raise HTTPException(status_code=400, detail="Invalid reset code")

    if _is_code_expired(user.get("token_expiry")):
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")

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
