from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from db.supabase_client import get_supabase
from services.prescription_service import generate_prescription_pdf
from models.schemas import PrescriptionRequest
import io

router = APIRouter()


@router.post("/generate")
async def generate_prescription(request: PrescriptionRequest):
    """
    Generate a prescription PDF for a visit.
    Returns the PDF as a downloadable file.
    """
    db = get_supabase()

    # Fetch visit
    visit_result = db.table("visits").select("*").eq("id", request.visit_id).execute()
    if not visit_result.data:
        raise HTTPException(status_code=404, detail=f"Visit {request.visit_id} not found")
    visit = visit_result.data[0]

    # Fetch patient
    patient_result = (
        db.table("patients")
        .select("*")
        .eq("id", visit["patient_id"])
        .execute()
    )
    if not patient_result.data:
        raise HTTPException(status_code=404, detail="Patient not found for this visit")
    patient = patient_result.data[0]

    # Fetch clinical data
    cd_result = (
        db.table("clinical_data")
        .select("*")
        .eq("visit_id", request.visit_id)
        .execute()
    )
    if not cd_result.data:
        raise HTTPException(status_code=404, detail="No clinical data for this visit")
    clinical_data = cd_result.data[0]

    # Generate PDF
    try:
        pdf_bytes = generate_prescription_pdf(
            patient=patient,
            visit=visit,
            clinical_data=clinical_data,
            show_brands=request.show_brands,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    # Return as downloadable PDF
    filename = f"prescription_{patient.get('patient_id', 'unknown')}_{visit.get('id', '')[:8]}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )
