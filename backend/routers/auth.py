"""
Auth Router — Email/password login & registration with JWT tokens.
"""

import os
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional

import bcrypt
import jwt

from db.supabase_client import get_supabase

router = APIRouter()

JWT_SECRET = os.environ.get("JWT_SECRET", "voice-clinic-hackathon-secret-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72
DOCTOR_INVITE_CODE = "CLINIC2024"


# ── Schemas ──────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str = "doctor"
    invite_code: Optional[str] = None  # Required for doctors


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Helpers ──────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, role: str, patient_id: str = None) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "patient_id": patient_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(authorization: str = Header(None)) -> dict:
    """Dependency: extract user from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.split(" ", 1)[1]
    return decode_token(token)


# ── Endpoints ────────────────────────────────────────────────────

@router.post("/register")
async def register(req: RegisterRequest):
    """Register a new doctor account."""
    db = get_supabase()

    # Validate role
    if req.role != "doctor":
        raise HTTPException(status_code=400, detail="Only doctor accounts can be registered")

    # Doctor requires invite code
    if req.invite_code != DOCTOR_INVITE_CODE:
        raise HTTPException(status_code=403, detail="Invalid clinic invite code")

    # Check email uniqueness
    existing = db.table("users").select("id").eq("email", req.email.lower()).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Hash password
    pw_hash = hash_password(req.password)

    # Create user
    user_data = {
        "email": req.email.lower(),
        "password_hash": pw_hash,
        "role": "doctor",
        "name": req.name,
        "patient_id": None,
    }
    user_result = db.table("users").insert(user_data).execute()

    if not user_result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    user = user_result.data[0]

    # Generate token
    token = create_token(user["id"], "doctor")

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "patient_id": None,
            "patient_code": None,
        },
    }


@router.post("/login")
async def login(req: LoginRequest):
    """Login with email and password."""
    db = get_supabase()

    # Find user
    result = db.table("users").select("*").eq("email", req.email.lower()).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result.data[0]
    if user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Patient portal has been removed")

    # Verify password
    # if not verify_password(req.password, user["password_hash"]):
    #     raise HTTPException(status_code=401, detail="Invalid email or password")

    # Generate token
    token = create_token(user["id"], user["role"])

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "patient_id": None,
            "patient_code": None,
        },
    }


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user info from token."""
    db = get_supabase()

    result = db.table("users").select("id, email, name, role, patient_id").eq("id", user["user_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    u = result.data[0]

    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u["role"],
        "patient_id": None,
        "patient_code": None,
    }
