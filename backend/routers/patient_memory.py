from fastapi import APIRouter, HTTPException
from db.supabase_client import get_supabase
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class PatientMemoryUpdate(BaseModel):
    """Update patient's persistent medical memory."""
    blood_type: Optional[str] = None
    allergies: Optional[list] = None
    chronic_conditions: Optional[list] = None
    current_medications: Optional[list] = None
    surgical_history: Optional[list] = None
    family_history: Optional[list] = None
    notes: Optional[str] = None


def get_patient_memory(patient_id: str) -> dict:
    """
    Fetch the persistent medical memory for a patient.
    Used internally by other services (audio pipeline, RAG, clinical analysis).
    Returns a dict with allergies, chronic_conditions, etc.
    """
    db = get_supabase()

    result = (
        db.table("patients")
        .select("id, patient_id, name, age, gender, blood_type, allergies, chronic_conditions")
        .eq("patient_id", patient_id)
        .execute()
    )

    if not result.data:
        return {}

    row = result.data[0]
    return {
        "blood_type": row.get("blood_type", ""),
        "allergies": row.get("allergies", []) or [],
        "chronic_conditions": row.get("chronic_conditions", []) or [],
        "current_medications": row.get("current_medications", []) or [],
        "surgical_history": row.get("surgical_history", []) or [],
        "family_history": row.get("family_history", []) or [],
        "notes": row.get("notes", ""),
    }


def get_patient_memory_by_uuid(patient_uuid: str) -> dict:
    """Same as get_patient_memory but using the internal UUID."""
    db = get_supabase()

    result = (
        db.table("patients")
        .select("id, blood_type, allergies, chronic_conditions")
        .eq("id", patient_uuid)
        .execute()
    )

    if not result.data:
        return {}

    row = result.data[0]
    return {
        "blood_type": row.get("blood_type", ""),
        "allergies": row.get("allergies", []) or [],
        "chronic_conditions": row.get("chronic_conditions", []) or [],
        "current_medications": row.get("current_medications", []) or [],
        "surgical_history": row.get("surgical_history", []) or [],
        "family_history": row.get("family_history", []) or [],
        "notes": row.get("notes", ""),
    }


def accumulate_memory(patient_uuid: str, new_allergies: list = None, new_conditions: list = None, new_medications: list = None):
    """
    Merge newly extracted data into the patient's persistent memory.
    Avoids duplicates by comparing lowercased names.
    Called automatically after each consultation.
    """
    db = get_supabase()
    current = get_patient_memory_by_uuid(patient_uuid)

    updates = {}

    if new_allergies:
        existing = {a.lower() if isinstance(a, str) else a.get("name", "").lower() for a in current.get("allergies", [])}
        merged = list(current.get("allergies", []))
        for allergy in new_allergies:
            name = allergy if isinstance(allergy, str) else allergy.get("name", "")
            if name and name.lower() not in existing:
                merged.append(allergy)
                existing.add(name.lower())
        if len(merged) > len(current.get("allergies", [])):
            updates["allergies"] = merged

    if new_conditions:
        existing = {c.lower() if isinstance(c, str) else c.get("name", "").lower() for c in current.get("chronic_conditions", [])}
        merged = list(current.get("chronic_conditions", []))
        for cond in new_conditions:
            name = cond if isinstance(cond, str) else cond.get("name", "")
            if name and name.lower() not in existing:
                merged.append(cond)
                existing.add(name.lower())
        if len(merged) > len(current.get("chronic_conditions", [])):
            updates["chronic_conditions"] = merged

    # Ignore new_medications since we don't have this column
    pass

    if updates:
        db.table("patients").update(updates).eq("id", patient_uuid).execute()
        print(f"[MEMORY] Updated patient {patient_uuid}: {list(updates.keys())}")

    return updates


# ── API Endpoints ────────────────────────────────────────────────

@router.get("/{patient_id}")
async def get_memory(patient_id: str):
    """Get the persistent medical memory for a patient."""
    memory = get_patient_memory(patient_id)
    if not memory:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return memory


@router.put("/{patient_id}")
async def update_memory(patient_id: str, data: PatientMemoryUpdate):
    """Update the persistent medical memory for a patient."""
    db = get_supabase()

    # Verify patient exists
    result = db.table("patients").select("id").eq("patient_id", patient_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    patient_uuid = result.data[0]["id"]
    updates = {}

    if data.blood_type is not None:
        updates["blood_type"] = data.blood_type
    if data.allergies is not None:
        updates["allergies"] = data.allergies
    if data.chronic_conditions is not None:
        updates["chronic_conditions"] = data.chronic_conditions
    # Note: current_medications, surgical_history, family_history, notes are skipped
    # as they do not exist on the current DB schema.

    if not updates:
        return {"message": "No updates provided"}

    db.table("patients").update(updates).eq("id", patient_uuid).execute()
    return {"message": "Memory updated", "updated_fields": list(updates.keys())}
