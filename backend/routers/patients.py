from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from db.supabase_client import get_supabase
from models.schemas import PatientCreate, PatientResponse

router = APIRouter()


def _top_diagnosis(clinical_data: dict | None) -> str:
    if not clinical_data:
        return ""
    diagnoses = clinical_data.get("differential_diagnosis") or clinical_data.get("diagnosis") or []
    if not diagnoses:
        return ""
    first = diagnoses[0]
    return first.get("name", "") if isinstance(first, dict) else str(first)


def _clinical_brief(patient: dict, visits: list[dict]) -> str:
    """Build a fast patient summary from already-loaded profile data."""
    lines = []
    if not visits:
        lines.append("New patient - no prior history.")
    else:
        last = visits[0]
        date = str(last.get("session_date") or "Unknown")[:10]
        complaint = last.get("chief_complaint") or "No complaint recorded"
        diagnosis = _top_diagnosis(last.get("clinical_data"))
        suffix = f" -> {diagnosis}" if diagnosis else ""
        lines.append(f"Last visit {date}: {complaint}{suffix}.")

    conditions = patient.get("chronic_conditions") or []
    allergies = patient.get("allergies") or []
    parts = []
    if conditions:
        names = [c.get("name") if isinstance(c, dict) else str(c) for c in conditions]
        parts.append(f"Conditions: {', '.join(filter(None, names))}")
    if allergies:
        names = [a.get("name") if isinstance(a, dict) else str(a) for a in allergies]
        parts.append(f"Allergies: {', '.join(filter(None, names))}")
    lines.append(" | ".join(parts) if parts else "No known chronic conditions or allergies.")

    return "\n".join(lines)


def _load_patient_profile(patient_id: str) -> dict:
    db = get_supabase()

    patient_result = db.table("patients").select("*").eq("patient_id", patient_id).execute()
    if not patient_result.data:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    patient = patient_result.data[0]

    visits_result = (
        db.table("visits")
        .select("*")
        .eq("patient_id", patient["id"])
        .order("session_date", desc=True)
        .execute()
    )
    visits = visits_result.data or []

    visit_ids = [visit["id"] for visit in visits]
    clinical_by_visit = {}
    segments_by_visit = {}

    if visit_ids:
        clinical_result = (
            db.table("clinical_data")
            .select("*")
            .in_("visit_id", visit_ids)
            .execute()
        )
        clinical_by_visit = {
            row["visit_id"]: row
            for row in (clinical_result.data or [])
        }

        segments_result = (
            db.table("speaker_segments")
            .select("*")
            .in_("visit_id", visit_ids)
            .order("start_time")
            .execute()
        )
        for row in (segments_result.data or []):
            segments_by_visit.setdefault(row["visit_id"], []).append(row)

    timeline = []
    for visit in visits:
        timeline.append({
            "visit_id": visit["id"],
            "session_date": visit.get("session_date"),
            "chief_complaint": visit.get("chief_complaint", ""),
            "language_detected": visit.get("language_detected", ""),
            "audio_quality_score": visit.get("audio_quality_score"),
            "needs_review": visit.get("needs_review", False),
            "clinical_data": clinical_by_visit.get(visit["id"]),
            "speaker_segments": segments_by_visit.get(visit["id"], []),
        })

    return {
        "patient": patient,
        "timeline": timeline,
        "brief": _clinical_brief(patient, timeline),
    }


def _generate_patient_id(db) -> str:
    """Generate a human-readable patient ID like PT-2024-001."""
    year = datetime.now().year
    
    # Get the count of patients created this year to determine next number
    result = (
        db.table("patients")
        .select("patient_id")
        .like("patient_id", f"PT-{year}-%")
        .execute()
    )
    count = len(result.data) if result.data else 0
    next_num = count + 1
    return f"PT-{year}-{next_num:03d}"


@router.post("", response_model=PatientResponse)
async def create_patient(patient: PatientCreate):
    """Register a new patient with auto-generated PT-ID."""
    db = get_supabase()

    patient_id = _generate_patient_id(db)

    data = {
        "patient_id": patient_id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "phone": patient.phone or "",
        "risk_badge": "LOW",
    }

    result = db.table("patients").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create patient")

    row = result.data[0]
    return PatientResponse(
        id=row["id"],
        patient_id=row["patient_id"],
        name=row["name"],
        age=row["age"],
        gender=row["gender"],
        phone=row.get("phone"),
        risk_badge=row.get("risk_badge", "LOW"),
        created_at=row.get("created_at"),
    )


@router.get("")
async def list_patients(
    search: str = Query("", description="Search by name or patient ID"),
    limit: int = Query(50, ge=1, le=200),
):
    """List all patients, optionally filtered by name or ID."""
    db = get_supabase()

    query = db.table("patients").select("*").order("created_at", desc=True).limit(limit)

    if search:
        # Search by patient_id or name (case-insensitive)
        result_by_id = (
            db.table("patients")
            .select("*")
            .ilike("patient_id", f"%{search}%")
            .limit(limit)
            .execute()
        )
        result_by_name = (
            db.table("patients")
            .select("*")
            .ilike("name", f"%{search}%")
            .limit(limit)
            .execute()
        )
        # Merge results, deduplicate by id
        seen = set()
        combined = []
        for row in (result_by_id.data or []) + (result_by_name.data or []):
            if row["id"] not in seen:
                seen.add(row["id"])
                combined.append(row)
        return combined[:limit]
    else:
        result = query.execute()
        return result.data or []


@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """Get a single patient by their human-readable ID."""
    db = get_supabase()
    result = db.table("patients").select("*").eq("patient_id", patient_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return result.data[0]


@router.get("/{patient_id}/brief")
async def get_patient_brief(patient_id: str):
    """
    Get an AI-generated 3-line brief for a returning patient.
    Includes last visit summary, chronic conditions, unresolved flags.
    """
    profile = _load_patient_profile(patient_id)
    patient = profile["patient"]
    timeline = profile["timeline"]

    return {
        "patient_id": patient_id,
        "patient_name": patient["name"],
        "risk_badge": patient.get("risk_badge", "LOW"),
        "total_visits": len(timeline),
        "brief": profile["brief"],
    }


@router.get("/{patient_id}/profile")
async def get_patient_profile(patient_id: str):
    """Get patient profile, visit timeline, and clinical brief in one batched call."""
    return _load_patient_profile(patient_id)


@router.get("/{patient_id}/timeline")
async def get_patient_timeline(patient_id: str):
    """Get all visits for a patient, sorted by date, for timeline view."""
    profile = _load_patient_profile(patient_id)
    return {"patient": profile["patient"], "timeline": profile["timeline"]}
