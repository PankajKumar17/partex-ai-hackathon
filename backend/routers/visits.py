from fastapi import APIRouter, HTTPException
from db.supabase_client import get_supabase

router = APIRouter()


@router.get("/{visit_id}")
async def get_visit(visit_id: str):
    """Get full visit details including clinical data and speaker segments."""
    db = get_supabase()

    visit_result = db.table("visits").select("*").eq("id", visit_id).execute()
    if not visit_result.data:
        raise HTTPException(status_code=404, detail=f"Visit {visit_id} not found")
    visit = visit_result.data[0]

    # Get clinical data
    cd_result = (
        db.table("clinical_data")
        .select("*")
        .eq("visit_id", visit_id)
        .execute()
    )

    # Get speaker segments
    segments_result = (
        db.table("speaker_segments")
        .select("*")
        .eq("visit_id", visit_id)
        .order("start_time")
        .execute()
    )

    # Get patient info
    patient_result = (
        db.table("patients")
        .select("*")
        .eq("id", visit["patient_id"])
        .execute()
    )

    return {
        "visit": visit,
        "clinical_data": cd_result.data[0] if cd_result.data else None,
        "speaker_segments": segments_result.data or [],
        "patient": patient_result.data[0] if patient_result.data else None,
    }


@router.get("/{visit_id}/clinical")
async def get_clinical_data(visit_id: str):
    """Get only clinical data for a visit."""
    db = get_supabase()

    cd_result = (
        db.table("clinical_data")
        .select("*")
        .eq("visit_id", visit_id)
        .execute()
    )

    if not cd_result.data:
        raise HTTPException(status_code=404, detail=f"No clinical data for visit {visit_id}")

    return cd_result.data[0]


@router.patch("/{visit_id}/flag")
async def flag_visit(visit_id: str):
    """Toggle the needs_review flag on a visit."""
    db = get_supabase()

    visit_result = db.table("visits").select("needs_review").eq("id", visit_id).execute()
    if not visit_result.data:
        raise HTTPException(status_code=404, detail=f"Visit {visit_id} not found")

    current = visit_result.data[0].get("needs_review", False)
    db.table("visits").update({"needs_review": not current}).eq("id", visit_id).execute()

    return {"visit_id": visit_id, "needs_review": not current}
