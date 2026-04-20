from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from db.supabase_client import get_supabase
from models.schemas import PatientCreate, PatientResponse
from services import groq_service

router = APIRouter()


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
    db = get_supabase()

    # Get patient
    patient_result = db.table("patients").select("*").eq("patient_id", patient_id).execute()
    if not patient_result.data:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    patient = patient_result.data[0]

    # Get recent visits with clinical data
    visits_result = (
        db.table("visits")
        .select("*")
        .eq("patient_id", patient["id"])
        .order("session_date", desc=True)
        .limit(5)
        .execute()
    )
    visits = visits_result.data or []

    # Enrich visits with clinical data
    enriched_visits = []
    for visit in visits:
        cd_result = (
            db.table("clinical_data")
            .select("*")
            .eq("visit_id", visit["id"])
            .execute()
        )
        visit_info = {
            "date": visit.get("session_date", ""),
            "chief_complaint": visit.get("chief_complaint", ""),
            "language": visit.get("language_detected", ""),
        }
        if cd_result.data:
            cd = cd_result.data[0]
            visit_info["diagnoses"] = cd.get("differential_diagnosis", [])
            visit_info["medications"] = cd.get("medications", [])
            visit_info["missing_flags"] = cd.get("missing_info_flags", [])
            visit_info["follow_up_date"] = cd.get("follow_up_date")
            visit_info["vitals"] = cd.get("vitals", {})
        enriched_visits.append(visit_info)

    # Generate brief via Groq
    brief = await groq_service.generate_patient_brief(patient, enriched_visits)

    return {
        "patient_id": patient_id,
        "patient_name": patient["name"],
        "risk_badge": patient.get("risk_badge", "LOW"),
        "total_visits": len(visits),
        "brief": brief,
    }


@router.get("/{patient_id}/timeline")
async def get_patient_timeline(patient_id: str):
    """Get all visits for a patient, sorted by date, for timeline view."""
    db = get_supabase()

    # Get patient
    patient_result = db.table("patients").select("*").eq("patient_id", patient_id).execute()
    if not patient_result.data:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    patient = patient_result.data[0]

    # Get all visits
    visits_result = (
        db.table("visits")
        .select("*")
        .eq("patient_id", patient["id"])
        .order("session_date", desc=True)
        .execute()
    )
    visits = visits_result.data or []

    # Enrich each visit with clinical data
    timeline = []
    for visit in visits:
        cd_result = (
            db.table("clinical_data")
            .select("*")
            .eq("visit_id", visit["id"])
            .execute()
        )
        segments_result = (
            db.table("speaker_segments")
            .select("*")
            .eq("visit_id", visit["id"])
            .order("start_time")
            .execute()
        )

        entry = {
            "visit_id": visit["id"],
            "session_date": visit.get("session_date"),
            "chief_complaint": visit.get("chief_complaint", ""),
            "language_detected": visit.get("language_detected", ""),
            "audio_quality_score": visit.get("audio_quality_score"),
            "needs_review": visit.get("needs_review", False),
            "clinical_data": cd_result.data[0] if cd_result.data else None,
            "speaker_segments": segments_result.data or [],
        }
        timeline.append(entry)

    return {
        "patient": patient,
        "timeline": timeline,
    }
