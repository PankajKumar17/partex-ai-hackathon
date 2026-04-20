from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from db.supabase_client import get_supabase
from services import gemini_service, sarvam_service
from routers.patient_memory import get_patient_memory
from models.schemas import RAGQuery, RAGResponse
import json

router = APIRouter()


@router.post("/query", response_model=RAGResponse)
async def rag_query(query: RAGQuery):
    """
    Answer a doctor's question based on patient history.
    Supports text questions. For voice questions, use /query-voice.
    """
    db = get_supabase()

    # Get patient
    patient_result = (
        db.table("patients")
        .select("*")
        .eq("patient_id", query.patient_id)
        .execute()
    )
    if not patient_result.data:
        raise HTTPException(status_code=404, detail=f"Patient {query.patient_id} not found")
    patient = patient_result.data[0]

    # Fetch all visits with clinical data
    visits_result = (
        db.table("visits")
        .select("*")
        .eq("patient_id", patient["id"])
        .order("session_date", desc=True)
        .execute()
    )

    patient_history = []
    for visit in (visits_result.data or []):
        cd_result = (
            db.table("clinical_data")
            .select("*")
            .eq("visit_id", visit["id"])
            .execute()
        )
        entry = {
            "visit_date": visit.get("session_date", ""),
            "chief_complaint": visit.get("chief_complaint", ""),
            "language": visit.get("language_detected", ""),
        }
        if cd_result.data:
            cd = cd_result.data[0]
            entry["symptoms"] = cd.get("symptoms", [])
            entry["vitals"] = cd.get("vitals", {})
            entry["diagnoses"] = cd.get("differential_diagnosis", [])
            entry["medications"] = cd.get("medications", [])
            entry["missing_flags"] = cd.get("missing_info_flags", [])
            entry["follow_up_date"] = cd.get("follow_up_date")
        patient_history.append(entry)

    if not patient_history:
        return RAGResponse(
            answer="No visit history found for this patient.",
            source_visits=[],
        )

    # Fetch persistent patient memory for richer context
    memory = get_patient_memory(query.patient_id)

    # Query Gemini with full patient context + memory
    result = await gemini_service.rag_query(patient_history, query.question, patient_memory=memory)

    return RAGResponse(
        answer=result.get("answer", "No answer generated."),
        source_visits=result.get("source_visits", []),
    )


@router.post("/query-voice")
async def rag_query_voice(
    audio: UploadFile = File(...),
    patient_id: str = Form(...),
):
    """
    Voice-based RAG query. Transcribes audio first, then answers.
    """
    # Transcribe the voice question
    audio_bytes = await audio.read()
    if len(audio_bytes) < 50:
        raise HTTPException(status_code=400, detail="Audio file too small")

    try:
        asr_result = await sarvam_service.transcribe_audio(
            audio_bytes, audio.filename or "question.webm"
        )
        question_text = asr_result.get("transcript", "")
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {str(e)}")

    if not question_text or len(question_text.strip()) < 3:
        raise HTTPException(status_code=422, detail="Could not understand the question. Please try again.")

    # Use the text-based RAG query
    query = RAGQuery(patient_id=patient_id, question=question_text)
    result = await rag_query(query)

    return {
        "question_text": question_text,
        "answer": result.answer,
        "source_visits": result.source_visits,
    }
