"""
Patient Portal API — Backend router for patient-facing dashboard.
All endpoints are prefixed with /api/portal.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from db.supabase_client import get_supabase

router = APIRouter()


# ── Pydantic Schemas ─────────────────────────────────────────────

class VitalsLogCreate(BaseModel):
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    blood_sugar_fasting: Optional[int] = None
    blood_sugar_pp: Optional[int] = None
    weight_kg: Optional[float] = None
    temp_f: Optional[float] = None
    pulse: Optional[int] = None
    spo2: Optional[int] = None
    notes: Optional[str] = None


class ReminderCreate(BaseModel):
    type: str  # 'medication' | 'appointment' | 'vitals' | 'test'
    title: str
    body: Optional[str] = None
    medication_name: Optional[str] = None
    remind_at: Optional[str] = None
    recurrence: str = "once"
    recurrence_times: list[str] = []
    channel: list[str] = ["push"]


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    remind_at: Optional[str] = None
    recurrence: Optional[str] = None
    recurrence_times: Optional[list[str]] = None
    active: Optional[bool] = None


class RefillRequest(BaseModel):
    medication_name: str
    pharmacy: Optional[str] = None
    notes: Optional[str] = None


class MedicationLogCreate(BaseModel):
    medication_name: str
    scheduled_at: str
    status: str = "taken"  # 'taken' | 'missed' | 'snoozed'


class DocumentCreate(BaseModel):
    doc_type: str = "lab_report"
    title: str
    file_url: Optional[str] = None
    report_date: Optional[str] = None


# ── Helper: resolve patient by phone (demo bypass) ──────────────

def _get_patient_by_phone(phone: str) -> dict:
    """Look up patient by phone number for demo auth."""
    db = get_supabase()
    result = db.table("patients").select("*").eq("phone", phone).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="No patient found with this phone number")
    return result.data[0]


def _get_patient_by_id(patient_uuid: str) -> dict:
    """Look up patient by UUID."""
    db = get_supabase()
    result = db.table("patients").select("*").eq("id", patient_uuid).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Patient not found")
    return result.data[0]


# ── Auth / Login ─────────────────────────────────────────────────

@router.post("/login")
async def demo_login(phone: str = Query(..., description="Patient phone number")):
    """
    Demo login: look up patient by phone.
    In production, this would verify Supabase Auth OTP.
    """
    patient = _get_patient_by_phone(phone)
    return {
        "patient_id": patient["id"],
        "patient_code": patient["patient_id"],
        "name": patient["name"],
        "phone": patient.get("phone", ""),
        "token": f"demo-token-{patient['id']}",
    }


# ── Profile ──────────────────────────────────────────────────────

@router.get("/me/{patient_uuid}")
async def get_my_profile(patient_uuid: str):
    """Get full patient profile."""
    patient = _get_patient_by_id(patient_uuid)
    return patient


# ── Overview / Home ──────────────────────────────────────────────

@router.get("/overview/{patient_uuid}")
async def get_overview(patient_uuid: str):
    """Home page overview data."""
    db = get_supabase()
    patient = _get_patient_by_id(patient_uuid)

    # Recent visits
    visits = (
        db.table("visits")
        .select("*, clinical_data(*)")
        .eq("patient_id", patient_uuid)
        .order("session_date", desc=True)
        .limit(5)
        .execute()
    )

    # Active reminders count
    reminders = (
        db.table("reminders")
        .select("id, type, title, remind_at")
        .eq("patient_id", patient_uuid)
        .eq("active", True)
        .execute()
    )

    # Collect medications from recent visits
    active_meds = []
    last_visit = None
    next_appointment = None

    for v in (visits.data or []):
        if not last_visit:
            last_visit = {
                "date": v.get("session_date"),
                "chief_complaint": v.get("chief_complaint", ""),
                "visit_id": v["id"],
            }
        # Get clinical data for medications
        if v.get("clinical_data") and isinstance(v["clinical_data"], list):
            for cd in v["clinical_data"]:
                if cd.get("medications"):
                    for med in cd["medications"]:
                        active_meds.append(med)
                if cd.get("follow_up_date") and not next_appointment:
                    next_appointment = cd["follow_up_date"]
        elif v.get("clinical_data") and isinstance(v["clinical_data"], dict):
            cd = v["clinical_data"]
            if cd.get("medications"):
                for med in cd["medications"]:
                    active_meds.append(med)
            if cd.get("follow_up_date") and not next_appointment:
                next_appointment = cd["follow_up_date"]

    return {
        "patient": patient,
        "risk_level": patient.get("risk_badge", "LOW"),
        "active_medications": active_meds[:10],
        "last_visit": last_visit,
        "next_appointment": next_appointment,
        "alerts_count": len(reminders.data or []),
        "total_visits": len(visits.data or []),
    }


# ── Health Passport ──────────────────────────────────────────────

@router.get("/health-passport/{patient_uuid}")
async def get_health_passport(patient_uuid: str):
    """Complete health passport data."""
    db = get_supabase()
    patient = _get_patient_by_id(patient_uuid)

    # Get active medications from recent visits
    visits = (
        db.table("visits")
        .select("id")
        .eq("patient_id", patient_uuid)
        .order("session_date", desc=True)
        .limit(10)
        .execute()
    )

    active_meds = []
    for v in (visits.data or []):
        cd_result = (
            db.table("clinical_data")
            .select("medications")
            .eq("visit_id", v["id"])
            .execute()
        )
        if cd_result.data:
            for cd in cd_result.data:
                if cd.get("medications"):
                    active_meds.extend(cd["medications"])

    # Get existing QR token
    qr_result = (
        db.table("emergency_qr_tokens")
        .select("*")
        .eq("patient_id", patient_uuid)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    return {
        "patient": patient,
        "allergies": patient.get("allergies", []),
        "chronic_conditions": patient.get("chronic_conditions", []),
        "blood_type": patient.get("blood_type", "Unknown"),
        "emergency_contact": patient.get("emergency_contact", {}),
        "current_medications": active_meds[:10],
        "qr_token": qr_result.data[0] if qr_result.data else None,
    }


# ── Visit History ────────────────────────────────────────────────

@router.get("/visits/{patient_uuid}")
async def get_patient_visits(patient_uuid: str):
    """Get all visits for timeline view."""
    db = get_supabase()
    _get_patient_by_id(patient_uuid)  # validate exists

    visits = (
        db.table("visits")
        .select("*")
        .eq("patient_id", patient_uuid)
        .order("session_date", desc=True)
        .execute()
    )

    timeline = []
    for v in (visits.data or []):
        cd_result = (
            db.table("clinical_data")
            .select("*")
            .eq("visit_id", v["id"])
            .execute()
        )
        timeline.append({
            "visit_id": v["id"],
            "date": v.get("session_date"),
            "chief_complaint": v.get("chief_complaint", "General checkup"),
            "language": v.get("language_detected", ""),
            "clinical_data": cd_result.data[0] if cd_result.data else None,
        })

    return {"visits": timeline}


# ── Medications ──────────────────────────────────────────────────

@router.get("/medications/{patient_uuid}")
async def get_medications(patient_uuid: str):
    """Get active + historical medications."""
    db = get_supabase()
    _get_patient_by_id(patient_uuid)

    # Gather from clinical_data across all visits
    visits = (
        db.table("visits")
        .select("id, session_date, chief_complaint")
        .eq("patient_id", patient_uuid)
        .order("session_date", desc=True)
        .execute()
    )

    all_meds = []
    for v in (visits.data or []):
        cd_result = (
            db.table("clinical_data")
            .select("medications")
            .eq("visit_id", v["id"])
            .execute()
        )
        if cd_result.data and cd_result.data[0].get("medications"):
            for med in cd_result.data[0]["medications"]:
                all_meds.append({
                    **med,
                    "prescribed_date": v.get("session_date"),
                    "visit_complaint": v.get("chief_complaint", ""),
                })

    # Medication adherence logs
    logs = (
        db.table("medication_logs")
        .select("*")
        .eq("patient_id", patient_uuid)
        .order("scheduled_at", desc=True)
        .limit(100)
        .execute()
    )

    return {
        "medications": all_meds,
        "adherence_logs": logs.data or [],
    }


@router.post("/medications/{patient_uuid}/log")
async def log_medication(patient_uuid: str, log: MedicationLogCreate):
    """Log medication taken/missed/snoozed."""
    db = get_supabase()
    _get_patient_by_id(patient_uuid)

    data = {
        "patient_id": patient_uuid,
        "medication_name": log.medication_name,
        "scheduled_at": log.scheduled_at,
        "taken_at": datetime.utcnow().isoformat() if log.status == "taken" else None,
        "status": log.status,
    }
    result = db.table("medication_logs").insert(data).execute()
    return result.data[0] if result.data else {"status": "ok"}


@router.post("/medications/{patient_uuid}/refill")
async def request_refill(patient_uuid: str, req: RefillRequest):
    """Request medication refill (creates a notification placeholder)."""
    _get_patient_by_id(patient_uuid)
    # In production: push notification to doctor + SMS confirmation
    return {
        "status": "refill_requested",
        "medication": req.medication_name,
        "pharmacy": req.pharmacy,
        "message": "Your refill request has been sent to your doctor.",
    }


# ── Vitals ───────────────────────────────────────────────────────

@router.get("/vitals/{patient_uuid}")
async def get_vitals(patient_uuid: str, days: int = Query(90, ge=7, le=365)):
    """Get vitals history for charts."""
    db = get_supabase()
    _get_patient_by_id(patient_uuid)

    since = (datetime.utcnow() - timedelta(days=days)).isoformat()

    logs = (
        db.table("patient_vitals_log")
        .select("*")
        .eq("patient_id", patient_uuid)
        .gte("logged_at", since)
        .order("logged_at", desc=False)
        .execute()
    )

    return {"vitals": logs.data or [], "days": days}


@router.post("/vitals/{patient_uuid}")
async def log_vitals(patient_uuid: str, vitals: VitalsLogCreate):
    """Patient self-logs vitals."""
    db = get_supabase()
    _get_patient_by_id(patient_uuid)

    data = {
        "patient_id": patient_uuid,
        "logged_by": "patient",
        "bp_systolic": vitals.bp_systolic,
        "bp_diastolic": vitals.bp_diastolic,
        "blood_sugar_fasting": vitals.blood_sugar_fasting,
        "blood_sugar_pp": vitals.blood_sugar_pp,
        "weight_kg": vitals.weight_kg,
        "temp_f": vitals.temp_f,
        "pulse": vitals.pulse,
        "spo2": vitals.spo2,
        "notes": vitals.notes,
    }
    # Remove None values
    data = {k: v for k, v in data.items() if v is not None}

    result = db.table("patient_vitals_log").insert(data).execute()
    return result.data[0] if result.data else {"status": "ok"}


# ── Reminders ────────────────────────────────────────────────────

@router.get("/reminders/{patient_uuid}")
async def get_reminders(patient_uuid: str):
    """Get all reminders."""
    db = get_supabase()
    _get_patient_by_id(patient_uuid)

    result = (
        db.table("reminders")
        .select("*")
        .eq("patient_id", patient_uuid)
        .order("created_at", desc=True)
        .execute()
    )
    return {"reminders": result.data or []}


@router.post("/reminders/{patient_uuid}")
async def create_reminder(patient_uuid: str, reminder: ReminderCreate):
    """Create a new reminder."""
    db = get_supabase()
    _get_patient_by_id(patient_uuid)

    data = {
        "patient_id": patient_uuid,
        "type": reminder.type,
        "title": reminder.title,
        "body": reminder.body,
        "medication_name": reminder.medication_name,
        "remind_at": reminder.remind_at,
        "recurrence": reminder.recurrence,
        "recurrence_times": reminder.recurrence_times,
        "channel": reminder.channel,
        "active": True,
    }
    result = db.table("reminders").insert(data).execute()
    return result.data[0] if result.data else {"status": "ok"}


@router.patch("/reminders/{patient_uuid}/{reminder_id}")
async def update_reminder(patient_uuid: str, reminder_id: str, update: ReminderUpdate):
    """Update a reminder."""
    db = get_supabase()

    data = {}
    if update.title is not None:
        data["title"] = update.title
    if update.body is not None:
        data["body"] = update.body
    if update.remind_at is not None:
        data["remind_at"] = update.remind_at
    if update.recurrence is not None:
        data["recurrence"] = update.recurrence
    if update.recurrence_times is not None:
        data["recurrence_times"] = update.recurrence_times
    if update.active is not None:
        data["active"] = update.active

    if data:
        db.table("reminders").update(data).eq("id", reminder_id).eq("patient_id", patient_uuid).execute()

    return {"status": "updated", "reminder_id": reminder_id}


@router.delete("/reminders/{patient_uuid}/{reminder_id}")
async def delete_reminder(patient_uuid: str, reminder_id: str):
    """Delete a reminder."""
    db = get_supabase()
    db.table("reminders").delete().eq("id", reminder_id).eq("patient_id", patient_uuid).execute()
    return {"status": "deleted", "reminder_id": reminder_id}


# ── Documents ────────────────────────────────────────────────────

@router.get("/documents/{patient_uuid}")
async def get_documents(patient_uuid: str):
    """Get all health documents."""
    db = get_supabase()
    _get_patient_by_id(patient_uuid)

    result = (
        db.table("health_documents")
        .select("*")
        .eq("patient_id", patient_uuid)
        .order("uploaded_at", desc=True)
        .execute()
    )
    return {"documents": result.data or []}


@router.post("/documents/{patient_uuid}")
async def add_document(patient_uuid: str, doc: DocumentCreate):
    """Add a health document record."""
    db = get_supabase()
    _get_patient_by_id(patient_uuid)

    data = {
        "patient_id": patient_uuid,
        "doc_type": doc.doc_type,
        "title": doc.title,
        "file_url": doc.file_url,
        "report_date": doc.report_date,
    }
    result = db.table("health_documents").insert(data).execute()
    return result.data[0] if result.data else {"status": "ok"}


# ── QR Emergency Token ──────────────────────────────────────────

@router.post("/qr/generate/{patient_uuid}")
async def generate_qr_token(patient_uuid: str):
    """Generate an emergency access QR token."""
    db = get_supabase()
    _get_patient_by_id(patient_uuid)

    import uuid
    token = str(uuid.uuid4())

    data = {
        "patient_id": patient_uuid,
        "token": token,
        "expires_at": (datetime.utcnow() + timedelta(days=365)).isoformat(),
    }
    result = db.table("emergency_qr_tokens").insert(data).execute()

    return {
        "token": token,
        "expires_at": data["expires_at"],
        "qr_url": f"/emergency/{token}",
    }


@router.get("/qr/{token}")
async def get_emergency_data(token: str):
    """
    PUBLIC endpoint — scanned from QR code.
    Returns allergies + current medications, no auth required.
    """
    db = get_supabase()

    qr_result = (
        db.table("emergency_qr_tokens")
        .select("*, patients(*)")
        .eq("token", token)
        .execute()
    )

    if not qr_result.data:
        raise HTTPException(status_code=404, detail="Invalid or expired QR code")

    qr = qr_result.data[0]

    # Check expiry
    if qr.get("expires_at"):
        from dateutil.parser import parse as parse_date
        expires = parse_date(qr["expires_at"])
        if expires.replace(tzinfo=None) < datetime.utcnow():
            raise HTTPException(status_code=410, detail="QR code has expired")

    patient = qr.get("patients", {})

    # Get current medications from recent visits
    visits = (
        db.table("visits")
        .select("id")
        .eq("patient_id", patient["id"])
        .order("session_date", desc=True)
        .limit(3)
        .execute()
    )

    current_meds = []
    for v in (visits.data or []):
        cd = (
            db.table("clinical_data")
            .select("medications")
            .eq("visit_id", v["id"])
            .execute()
        )
        if cd.data and cd.data[0].get("medications"):
            current_meds.extend(cd.data[0]["medications"])

    return {
        "patient_name": patient.get("name", "Unknown"),
        "age": patient.get("age"),
        "gender": patient.get("gender"),
        "blood_type": patient.get("blood_type", "Unknown"),
        "allergies": patient.get("allergies", []),
        "chronic_conditions": patient.get("chronic_conditions", []),
        "current_medications": current_meds[:10],
        "emergency_contact": patient.get("emergency_contact", {}),
    }
