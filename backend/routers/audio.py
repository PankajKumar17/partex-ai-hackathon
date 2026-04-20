import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services import sarvam_service, llm_provider, audio_processor, risk_service
from routers.patient_memory import get_patient_memory_by_uuid, accumulate_memory
from db.supabase_client import get_supabase
from models.schemas import AudioProcessResponse, ProcessTextRequest

router = APIRouter()


@router.post("/process", response_model=AudioProcessResponse)
async def process_audio(
    audio: UploadFile = File(...),
    patient_id: str = Form(...),
):
    """
    Main audio processing pipeline:
    1. Audio quality scoring
    2. Sarvam ASR transcription
    3. Gemini diarization + extraction
    4. Gemini clinical analysis
    5. Save to Supabase
    """
    db = get_supabase()

    # ── 0. Fetch patient data ─────────────────────────────────────
    patient_result = db.table("patients").select("*").eq("patient_id", patient_id).execute()
    if not patient_result.data:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    patient = patient_result.data[0]
    patient_uuid = patient["id"]

    # ── 1. Read audio bytes ──────────────────────────────────────
    audio_bytes = await audio.read()
    if len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio file too small or empty")

    # ── 2. Audio quality scoring ─────────────────────────────────
    quality_info = audio_processor.calculate_audio_quality(audio_bytes)
    quality_score = quality_info["quality_score"]

    # ── 3. Sarvam ASR Transcription ──────────────────────────────
    try:
        asr_result = await sarvam_service.transcribe_audio(
            audio_bytes, audio.filename or "audio.webm"
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {str(e)}")

    transcript = asr_result["transcript"]
    language_detected = asr_result["language_name"]

    if not transcript or len(transcript.strip()) < 5:
        raise HTTPException(
            status_code=422,
            detail="Transcription produced no usable text. Please try recording again with clearer audio."
        )

    # ── 4. Groq Call 1: Diarization + Extraction ───────────────
    extraction = await llm_provider.diarize_and_extract(
        transcript=transcript,
        language=language_detected,
        patient_age=patient.get("age", 0),
    )

    speaker_segments = extraction.get("speaker_segments", [])
    symptoms = extraction.get("symptoms", [])
    vitals = extraction.get("vitals", {})
    chief_complaint = extraction.get("chief_complaint", "")
    language_heatmap = extraction.get("language_heatmap", {})

    # ── 5. Fetch past diagnoses for context ──────────────────────
    past_visits = (
        db.table("visits")
        .select("id")
        .eq("patient_id", patient_uuid)
        .order("session_date", desc=True)
        .limit(5)
        .execute()
    )
    past_diagnoses = []
    for pv in (past_visits.data or []):
        cd = db.table("clinical_data").select("diagnosis, differential_diagnosis").eq("visit_id", pv["id"]).execute()
        if cd.data:
            for entry in cd.data:
                past_diagnoses.extend(entry.get("differential_diagnosis") or entry.get("diagnosis") or [])

    # ── 5b. Fetch patient memory (allergies, chronic conditions) ─
    patient_mem = get_patient_memory_by_uuid(patient_uuid)

    # ── 5c. Merge any allergies mentioned in THIS transcript into memory ─
    # This ensures "I am allergic to X" in the current visit blocks X immediately
    transcript_allergies = extraction.get("extracted_allergies_from_transcript", [])
    if transcript_allergies:
        existing = patient_mem.get("allergies", [])
        existing_names = {a.lower() if isinstance(a, str) else a.get("name", "").lower() for a in existing}
        for allergy in transcript_allergies:
            if allergy.lower() not in existing_names:
                existing.append(allergy)
        patient_mem["allergies"] = existing

    # ── 6. LLM Call 2: Clinical Analysis ──────────────────────
    clinical = await llm_provider.clinical_analysis(
        symptoms=symptoms,
        vitals=vitals,
        patient_age=patient.get("age", 0),
        patient_gender=patient.get("gender", ""),
        past_diagnoses=past_diagnoses[:5],
        patient_memory=patient_mem,
    )

    differential_diagnosis = clinical.get("differential_diagnosis", [])
    medications = clinical.get("medications", [])
    drug_interactions = clinical.get("drug_interactions", [])
    missing_info_flags = clinical.get("missing_info_flags", [])
    dosage_warnings = clinical.get("dosage_warnings", [])
    risk_level = clinical.get("risk_level", "LOW")
    follow_up_days = clinical.get("follow_up_days", 7)

    # ── 7. Risk calculation (combine Gemini + rule-based) ────────
    rule_risk = risk_service.calculate_risk(
        age=patient.get("age", 0),
        diagnoses=differential_diagnosis,
        vitals=vitals,
    )
    # Use the higher risk level between Gemini and rule-based
    risk_priority = {"HIGH": 3, "MODERATE": 2, "LOW": 1}
    final_risk = risk_level if risk_priority.get(risk_level, 0) >= risk_priority.get(rule_risk, 0) else rule_risk

    # ── 8. Save visit to Supabase ────────────────────────────────
    visit_data = {
        "patient_id": patient_uuid,
        "raw_transcript": transcript,
        "language_detected": language_detected,
        "audio_quality_score": quality_score,
        "chief_complaint": chief_complaint,
    }
    visit_result = db.table("visits").insert(visit_data).execute()
    visit_id = visit_result.data[0]["id"]

    # ── 9. Save clinical data ────────────────────────────────────
    from datetime import datetime, timedelta
    follow_up_date = (datetime.now() + timedelta(days=follow_up_days)).strftime("%Y-%m-%d")

    clinical_record = {
        "visit_id": visit_id,
        "symptoms": symptoms,
        "vitals": vitals,
        "diagnosis": differential_diagnosis[:1] if differential_diagnosis else [],
        "differential_diagnosis": differential_diagnosis,
        "medications": medications,
        "missing_info_flags": missing_info_flags,
        "drug_interactions": drug_interactions,
        "dosage_warnings": dosage_warnings,
        "follow_up_date": follow_up_date,
    }
    db.table("clinical_data").insert(clinical_record).execute()

    # ── 10. Save speaker segments ────────────────────────────────
    lang_map = {
        "en": "english", "eng": "english", "en-us": "english", "en-in": "english",
        "hi": "hindi", "hin": "hindi", "hi-in": "hindi",
        "bn": "bengali", "ben": "bengali", "bn-in": "bengali",
        "ta": "tamil", "tam": "tamil", "ta-in": "tamil",
        "te": "telugu", "tel": "telugu", "te-in": "telugu",
        "kn": "kannada", "kan": "kannada", "kn-in": "kannada",
        "ml": "malayalam", "mal": "malayalam", "ml-in": "malayalam",
        "mr": "marathi", "mar": "marathi", "mr-in": "marathi",
        "gu": "gujarati", "guj": "gujarati", "gu-in": "gujarati",
        "pa": "punjabi", "pun": "punjabi", "pa-in": "punjabi"
    }
    allowed_langs = {
        "hindi", "english", "bengali", "tamil", "telugu",
        "kannada", "malayalam", "marathi", "gujarati", "punjabi"
    }

    for seg in speaker_segments:
        raw_lang = str(seg.get("language", language_detected)).lower().strip()
        mapped_lang = lang_map.get(raw_lang, raw_lang)
        if mapped_lang not in allowed_langs:
            mapped_lang = "hindi"

        segment_record = {
            "visit_id": visit_id,
            "speaker": str(seg.get("speaker", "PATIENT")).upper(),
            "text": seg.get("text", ""),
            "language": mapped_lang,
            "start_time": seg.get("start_time", 0),
            "end_time": seg.get("end_time", 0),
        }
        db.table("speaker_segments").insert(segment_record).execute()

    # ── 11. Update patient risk badge ────────────────────────────
    db.table("patients").update({"risk_badge": final_risk}).eq("id", patient_uuid).execute()

    # ── 12. Auto-accumulate memory (allergies, chronic conditions) ─
    try:
        new_allergies = clinical.get("extracted_allergies", [])
        new_conditions = clinical.get("extracted_chronic_conditions", [])
        new_meds = [{"generic_name": m.get("generic_name", ""), "dose": m.get("dose", ""), "frequency": m.get("frequency", "")} for m in medications if m.get("generic_name")]
        accumulate_memory(patient_uuid, new_allergies=new_allergies, new_conditions=new_conditions, new_medications=new_meds)
    except Exception as e:
        print(f"[MEMORY] Accumulation failed (non-fatal): {e}")

    # ── 12. Return full response ─────────────────────────────────
    return AudioProcessResponse(
        visit_id=visit_id,
        transcript=transcript,
        language_detected=language_detected,
        audio_quality_score=quality_score,
        speaker_segments=speaker_segments,
        symptoms=symptoms,
        vitals=vitals,
        chief_complaint=chief_complaint,
        language_heatmap=language_heatmap,
        differential_diagnosis=differential_diagnosis,
        medications=medications,
        drug_interactions=drug_interactions,
        missing_info_flags=missing_info_flags,
        dosage_warnings=dosage_warnings,
        risk_level=final_risk,
        follow_up_days=follow_up_days,
    )


@router.post("/process-text", response_model=AudioProcessResponse)
async def process_text(request: ProcessTextRequest):
    """
    Process already-transcribed text (for continuous chunked recording)
    """
    db = get_supabase()

    patient_result = db.table("patients").select("*").eq("patient_id", request.patient_id).execute()
    if not patient_result.data:
        raise HTTPException(status_code=404, detail=f"Patient {request.patient_id} not found")
    patient = patient_result.data[0]
    patient_uuid = patient["id"]

    transcript = request.transcript
    language_detected = request.language_detected
    quality_score = request.audio_quality_score

    # Same pipeline as audio starting from step 4
    extraction = await llm_provider.diarize_and_extract(
        transcript=transcript,
        language=language_detected,
        patient_age=patient.get("age", 0),
    )

    speaker_segments = extraction.get("speaker_segments", [])
    symptoms = extraction.get("symptoms", [])
    vitals = extraction.get("vitals", {})
    chief_complaint = extraction.get("chief_complaint", "")
    language_heatmap = extraction.get("language_heatmap", {})

    past_visits = (
        db.table("visits")
        .select("id")
        .eq("patient_id", patient_uuid)
        .order("session_date", desc=True)
        .limit(5)
        .execute()
    )
    past_diagnoses = []
    for pv in (past_visits.data or []):
        cd = db.table("clinical_data").select("diagnosis, differential_diagnosis").eq("visit_id", pv["id"]).execute()
        if cd.data:
            for entry in cd.data:
                past_diagnoses.extend(entry.get("differential_diagnosis") or entry.get("diagnosis") or [])

    # Fetch patient memory
    patient_mem = get_patient_memory_by_uuid(patient_uuid)

    # Merge any allergies mentioned in THIS transcript into memory before clinical call
    transcript_allergies = extraction.get("extracted_allergies_from_transcript", [])
    if transcript_allergies:
        existing = patient_mem.get("allergies", [])
        existing_names = {a.lower() if isinstance(a, str) else a.get("name", "").lower() for a in existing}
        for allergy in transcript_allergies:
            if allergy.lower() not in existing_names:
                existing.append(allergy)
        patient_mem["allergies"] = existing

    clinical = await llm_provider.clinical_analysis(
        symptoms=symptoms,
        vitals=vitals,
        patient_age=patient.get("age", 0),
        patient_gender=patient.get("gender", ""),
        past_diagnoses=past_diagnoses[:5],
        patient_memory=patient_mem,
    )

    differential_diagnosis = clinical.get("differential_diagnosis", [])
    medications = clinical.get("medications", [])
    drug_interactions = clinical.get("drug_interactions", [])
    missing_info_flags = clinical.get("missing_info_flags", [])
    dosage_warnings = clinical.get("dosage_warnings", [])
    risk_level = clinical.get("risk_level", "LOW")
    follow_up_days = clinical.get("follow_up_days", 7)

    rule_risk = risk_service.calculate_risk(
        age=patient.get("age", 0),
        diagnoses=differential_diagnosis,
        vitals=vitals,
    )
    risk_priority = {"HIGH": 3, "MODERATE": 2, "LOW": 1}
    final_risk = risk_level if risk_priority.get(risk_level, 0) >= risk_priority.get(rule_risk, 0) else rule_risk

    visit_data = {
        "patient_id": patient_uuid,
        "raw_transcript": transcript,
        "language_detected": language_detected,
        "audio_quality_score": quality_score,
        "chief_complaint": chief_complaint,
    }
    visit_result = db.table("visits").insert(visit_data).execute()
    visit_id = visit_result.data[0]["id"]

    from datetime import datetime, timedelta
    follow_up_date = (datetime.now() + timedelta(days=follow_up_days)).strftime("%Y-%m-%d")

    clinical_record = {
        "visit_id": visit_id,
        "symptoms": symptoms,
        "vitals": vitals,
        "diagnosis": differential_diagnosis[:1] if differential_diagnosis else [],
        "differential_diagnosis": differential_diagnosis,
        "medications": medications,
        "missing_info_flags": missing_info_flags,
        "drug_interactions": drug_interactions,
        "dosage_warnings": dosage_warnings,
        "follow_up_date": follow_up_date,
    }
    db.table("clinical_data").insert(clinical_record).execute()

    lang_map = {
        "en": "english", "eng": "english", "en-us": "english", "en-in": "english",
        "hi": "hindi", "hin": "hindi", "hi-in": "hindi",
        "bn": "bengali", "ben": "bengali", "bn-in": "bengali",
        "ta": "tamil", "tam": "tamil", "ta-in": "tamil",
        "te": "telugu", "tel": "telugu", "te-in": "telugu",
        "kn": "kannada", "kan": "kannada", "kn-in": "kannada",
        "ml": "malayalam", "mal": "malayalam", "ml-in": "malayalam",
        "mr": "marathi", "mar": "marathi", "mr-in": "marathi",
        "gu": "gujarati", "guj": "gujarati", "gu-in": "gujarati",
        "pa": "punjabi", "pun": "punjabi", "pa-in": "punjabi"
    }

    allowed_langs = {
        "hindi", "english", "bengali", "tamil", "telugu",
        "kannada", "malayalam", "marathi", "gujarati", "punjabi"
    }

    for seg in speaker_segments:
        raw_lang = str(seg.get("language", language_detected)).lower().strip()
        mapped_lang = lang_map.get(raw_lang, raw_lang)
        if mapped_lang not in allowed_langs:
            mapped_lang = "hindi"

        segment_record = {
            "visit_id": visit_id,
            "speaker": str(seg.get("speaker", "PATIENT")).upper(),
            "text": seg.get("text", ""),
            "language": mapped_lang,
            "start_time": seg.get("start_time", 0),
            "end_time": seg.get("end_time", 0),
        }
        db.table("speaker_segments").insert(segment_record).execute()

    db.table("patients").update({"risk_badge": final_risk}).eq("id", patient_uuid).execute()

    # Auto-accumulate memory
    try:
        new_allergies = clinical.get("extracted_allergies", [])
        new_conditions = clinical.get("extracted_chronic_conditions", [])
        new_meds = [{"generic_name": m.get("generic_name", ""), "dose": m.get("dose", ""), "frequency": m.get("frequency", "")} for m in medications if m.get("generic_name")]
        accumulate_memory(patient_uuid, new_allergies=new_allergies, new_conditions=new_conditions, new_medications=new_meds)
    except Exception as e:
        print(f"[MEMORY] Accumulation failed (non-fatal): {e}")

    return AudioProcessResponse(
        visit_id=visit_id,
        transcript=transcript,
        language_detected=language_detected,
        audio_quality_score=quality_score,
        speaker_segments=speaker_segments,
        symptoms=symptoms,
        vitals=vitals,
        chief_complaint=chief_complaint,
        language_heatmap=language_heatmap,
        differential_diagnosis=differential_diagnosis,
        medications=medications,
        drug_interactions=drug_interactions,
        missing_info_flags=missing_info_flags,
        dosage_warnings=dosage_warnings,
        risk_level=final_risk,
        follow_up_days=follow_up_days,
    )


@router.post("/stream-chunk")
async def stream_chunk(
    audio: UploadFile = File(...),
    session_id: str = Form(""),
):
    """
    Process a small audio chunk for live transcript display.
    Returns partial transcript text.
    """
    audio_bytes = await audio.read()
    if len(audio_bytes) < 50:
        return {"transcript": "", "session_id": session_id}

    try:
        partial_text = await sarvam_service.transcribe_chunk(audio_bytes)
        return {"transcript": partial_text, "session_id": session_id}
    except Exception:
        return {"transcript": "", "session_id": session_id}
