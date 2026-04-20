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
    role: str  # 'doctor' | 'patient'
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = "Male"
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
    """Register a new doctor or patient account."""
    db = get_supabase()

    # Validate role
    if req.role not in ("doctor", "patient"):
        raise HTTPException(status_code=400, detail="Role must be 'doctor' or 'patient'")

    # Doctor requires invite code
    if req.role == "doctor":
        if req.invite_code != DOCTOR_INVITE_CODE:
            raise HTTPException(status_code=403, detail="Invalid clinic invite code")

    # Check email uniqueness
    existing = db.table("users").select("id").eq("email", req.email.lower()).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Hash password
    pw_hash = hash_password(req.password)

    patient_id = None
    patient_code = None

    # For patients: create a patient record too
    if req.role == "patient":
        # Generate patient ID
        year = datetime.now().year
        count_result = (
            db.table("patients")
            .select("patient_id")
            .like("patient_id", f"PT-{year}-%")
            .execute()
        )
        next_num = len(count_result.data or []) + 1
        patient_code = f"PT-{year}-{next_num:03d}"

        patient_data = {
            "patient_id": patient_code,
            "name": req.name,
            "age": req.age or 30,
            "gender": req.gender or "Male",
            "phone": req.phone or "",
            "risk_badge": "LOW",
        }
        patient_result = db.table("patients").insert(patient_data).execute()
        if patient_result.data:
            patient_id = patient_result.data[0]["id"]

    # Create user
    user_data = {
        "email": req.email.lower(),
        "password_hash": pw_hash,
        "role": req.role,
        "name": req.name,
        "patient_id": patient_id,
    }
    user_result = db.table("users").insert(user_data).execute()

    if not user_result.data:
        raise HTTPException(status_code=500, detail="Failed to create user")

    user = user_result.data[0]

    # Link patient to user
    if patient_id:
        db.table("patients").update({"user_id": user["id"]}).eq("id", patient_id).execute()

    # Generate token
    token = create_token(user["id"], req.role, patient_id)

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "patient_id": patient_id,
            "patient_code": patient_code,
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

    # Verify password
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Get patient info if patient role
    patient_code = None
    if user.get("patient_id"):
        pt = db.table("patients").select("patient_id").eq("id", user["patient_id"]).execute()
        if pt.data:
            patient_code = pt.data[0]["patient_id"]

    # Generate token
    token = create_token(user["id"], user["role"], user.get("patient_id"))

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "patient_id": user.get("patient_id"),
            "patient_code": patient_code,
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

    patient_code = None
    if u.get("patient_id"):
        pt = db.table("patients").select("patient_id").eq("id", u["patient_id"]).execute()
        if pt.data:
            patient_code = pt.data[0]["patient_id"]

    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u["role"],
        "patient_id": u.get("patient_id"),
        "patient_code": patient_code,
    }
