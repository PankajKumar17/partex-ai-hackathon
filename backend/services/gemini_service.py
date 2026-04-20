import os
import json
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(override=True)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

# New google-genai SDK
_client = None
try:
    import google.genai as genai
    from google.genai import types as genai_types
    if GEMINI_API_KEY:
        _client = genai.Client(api_key=GEMINI_API_KEY)
        print(f"[GEMINI] Client initialized with google.genai SDK")
    else:
        print("[GEMINI] WARNING: GEMINI_API_KEY is empty")
except ImportError as e:
    print(f"[GEMINI] ImportError: {e} — run: pip install google-genai")

MODEL = "gemini-3.1-flash-lite-preview"


def _clean_json_response(text: str) -> str:
    """Strip markdown code fences and extract JSON."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    return text


def _safe_parse_json(text: str) -> dict:
    """Safely parse JSON with fallback."""
    cleaned = _clean_json_response(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return {"error": "Failed to parse Gemini response", "raw": text[:500]}


def _generate(system: str, prompt: str, max_tokens: int = 4096, temperature: float = 0.2) -> str | None:
    """Single synchronous call to Gemini. Returns text or None on hard failure."""
    if not _client:
        raise ValueError("GEMINI_API_KEY is not set or google-genai not installed")
    response = _client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )
    return response.text


async def diarize_and_extract(
    transcript: str,
    language: str,
    patient_age: int = 0,
) -> dict:
    """GEMINI CALL 1: Speaker diarization + clinical extraction."""
    if not _client:
        raise ValueError("GEMINI_API_KEY is not set")

    system_instruction = (
        "You are a medical AI assistant for Indian hospitals. "
        "Analyze multilingual consultation transcripts carefully. "
        "ALL extracted field values (symptom names, body parts, chief_complaint) MUST be in English, "
        "even if the transcript is in Hindi, Marathi, Punjabi or any other language. "
        "Return ONLY valid JSON with no markdown formatting."
    )

    prompt = f"""Transcript: {transcript}
Detected Language: {language}
Patient Age: {patient_age}

Task 1 - Speaker Diarization:
Identify speech by role:
- Questions about symptoms, medical advice = DOCTOR
- Describing pain, symptoms = PATIENT
- Family context, clarifications = ATTENDANT
Return speaker_segments array with: speaker, text, language, start_time, end_time.

Task 2 - Extract from PATIENT/ATTENDANT turns (all values in English):
symptoms: name, duration, severity (mild/moderate/severe), body_part, confidence (0-1), language_source
vitals: BP, temp, pulse, weight, SpO2, flagged (true if abnormal)
chief_complaint: one line in English

Task 3 - CRITICAL allergy extraction:
Listen for "allergic to", "can't take", "suits nahi karta", "allergy hai" etc.
extracted_allergies_from_transcript: list of drug/substance names in English

Task 4 - Language heatmap (percentage breakdown).

Return ONLY valid JSON:
{{
  "speaker_segments": [{{"speaker": "PATIENT", "text": "...", "language": "english", "start_time": 0.0, "end_time": 5.0}}],
  "symptoms": [{{"name": "fever", "duration": "2 days", "severity": "mild", "body_part": null, "confidence": 0.9, "language_source": "english"}}],
  "vitals": {{"BP": null, "temp": null, "pulse": null, "weight": null, "SpO2": null, "flagged": false}},
  "chief_complaint": "Fever and body ache with paracetamol allergy",
  "language_heatmap": {{"english": 100}},
  "extracted_allergies_from_transcript": ["Paracetamol"]
}}"""

    import asyncio
    print(f"\n{'='*50}\n[GEMINI API REQUEST - DIARIZE & EXTRACT]")
    print(f"Prompt Length: {len(prompt)} characters")

    try:
        # Run synchronous SDK call in thread pool to not block event loop
        text = await asyncio.get_event_loop().run_in_executor(
            None, lambda: _generate(system_instruction, prompt, max_tokens=2048)
        )
        print(f"[GEMINI] Diarize success")
        result = _safe_parse_json(text)
        result.setdefault("speaker_segments", [])
        result.setdefault("symptoms", [])
        result.setdefault("vitals", {})
        result.setdefault("chief_complaint", "")
        result.setdefault("language_heatmap", {})
        result.setdefault("extracted_allergies_from_transcript", [])
        return result
    except Exception as e:
        print(f"[GEMINI ERROR - DIARIZE] {e}")
        return {
            "speaker_segments": [], "symptoms": [], "vitals": {},
            "chief_complaint": f"Analysis failed: {str(e)}",
            "language_heatmap": {}, "extracted_allergies_from_transcript": [],
            "error": str(e),
        }


async def clinical_analysis(
    symptoms: list,
    vitals: dict,
    patient_age: int,
    patient_gender: str = "",
    past_diagnoses: list = None,
    patient_memory: dict = None,
) -> dict:
    """GEMINI CALL 2: Differential diagnosis + medications."""
    if not _client:
        raise ValueError("GEMINI_API_KEY is not set")

    current_month = datetime.now().strftime("%B %Y")
    past_dx = past_diagnoses or []
    memory = patient_memory or {}

    known_allergies = memory.get("allergies", [])
    known_conditions = memory.get("chronic_conditions", [])
    known_medications = memory.get("current_medications", [])

    memory_context = ""
    if any([known_allergies, known_conditions, known_medications]):
        memory_context = f"""
PATIENT MEMORY:
Allergies: {json.dumps(known_allergies) if known_allergies else "None"}
Chronic Conditions: {json.dumps(known_conditions) if known_conditions else "None"}
Current Medications: {json.dumps(known_medications) if known_medications else "None"}
"""

    system_instruction = (
        "You are a senior physician AI trained on Indian clinical guidelines (ICMR, API, IAP). "
        "ABSOLUTE RULE #1: NEVER prescribe a drug if the patient is allergic to it or its class. "
        "ABSOLUTE RULE #2: Cross-check EVERY medication against the allergy list. Remove any match. "
        "ABSOLUTE RULE #3: ALL output values must be in English. "
        "Return ONLY valid JSON with no markdown formatting."
    )

    prompt = f"""Patient: {patient_age}y {patient_gender} | Month: {current_month}
Past diagnoses: {json.dumps(past_dx[:3])}
{memory_context}
⚠️ ALLERGY ALERT — DO NOT prescribe: {json.dumps(known_allergies) if known_allergies else "check transcript"}

Symptoms: {json.dumps(symptoms)}
Vitals: {json.dumps(vitals)}

Task 1 - Differential Diagnosis (top 3, English):
name, ICD10, probability (0-100%), reasoning (1 line), red_flags (bool), requires_test (list)

Task 2 - Medications (English only):
⛔ Check each against ALLERGY ALERT before including.
generic_name, brand_names (Indian brands), dose, frequency (OD/BD/TID/QID), duration,
safe_for_age, max_daily_dose_exceeded, interaction_warning, allergy_warning

Task 3 - Drug interactions (major/contraindicated only)
Task 4 - Risk level: HIGH / MODERATE / LOW
Task 5 - Follow-up days
Task 6 - extracted_allergies and extracted_chronic_conditions from this visit

Return ONLY valid JSON:
{{
  "differential_diagnosis": [{{"name": "Viral Fever", "ICD10": "B34.9", "probability": 75, "reasoning": "...", "red_flags": false, "requires_test": []}}],
  "medications": [{{"generic_name": "Ibuprofen", "brand_names": ["Brufen"], "dose": "400mg", "frequency": "TID", "duration": "5 days", "safe_for_age": true, "max_daily_dose_exceeded": false, "interaction_warning": null, "allergy_warning": null}}],
  "drug_interactions": [],
  "missing_info_flags": [],
  "dosage_warnings": [],
  "risk_level": "LOW",
  "follow_up_days": 7,
  "extracted_allergies": [],
  "extracted_chronic_conditions": []
}}"""

    import asyncio
    print(f"\n{'='*50}\n[GEMINI API REQUEST - CLINICAL ANALYSIS]")
    print(f"Symptoms: {len(symptoms)}, Vitals: {len(vitals)}")
    print(f"Prompt Length: {len(prompt)} characters")

    try:
        text = await asyncio.get_event_loop().run_in_executor(
            None, lambda: _generate(system_instruction, prompt, max_tokens=2048)
        )
        print(f"[GEMINI API RESPONSE] Success")
        print(f"Response Preview: {text[:120]}...")
        print(f"{'='*50}\n")
        result = _safe_parse_json(text)
        result.setdefault("differential_diagnosis", [])
        result.setdefault("medications", [])
        result.setdefault("drug_interactions", [])
        result.setdefault("missing_info_flags", [])
        result.setdefault("dosage_warnings", [])
        result.setdefault("risk_level", "LOW")
        result.setdefault("follow_up_days", 7)
        result.setdefault("extracted_allergies", [])
        result.setdefault("extracted_chronic_conditions", [])
        return result
    except Exception as e:
        print(f"[GEMINI ERROR - CLINICAL] {e}")
        return {
            "differential_diagnosis": [], "medications": [], "drug_interactions": [],
            "missing_info_flags": [], "dosage_warnings": [],
            "risk_level": "LOW", "follow_up_days": 7,
            "error": str(e),
        }


async def generate_patient_brief(patient_data: dict, visits_data: list) -> str:
    """Generate a concise brief for a returning patient — no AI call, built locally."""
    lines = []
    if not visits_data:
        lines.append("New patient — no prior history.")
    else:
        last = visits_data[0]
        date = str(last.get("date", "Unknown"))[:10]
        cc = last.get("chief_complaint") or "No complaint recorded"
        diagnoses = last.get("diagnoses", [])
        dx_str = ""
        if diagnoses:
            top = diagnoses[0].get("name", "") if isinstance(diagnoses[0], dict) else diagnoses[0]
            if top:
                dx_str = f" → {top}"
        lines.append(f"Last visit {date}: {cc}{dx_str}.")

    conditions = patient_data.get("chronic_conditions", [])
    allergies = patient_data.get("allergies", [])
    parts = []
    if conditions:
        names = [c.get("name") if isinstance(c, dict) else c for c in conditions]
        parts.append(f"Conditions: {', '.join(filter(None, names))}")
    if allergies:
        names = [a.get("name") if isinstance(a, dict) else a for a in allergies]
        parts.append(f"⚠ Allergies: {', '.join(filter(None, names))}")
    lines.append(" | ".join(parts) if parts else "No known chronic conditions or allergies.")

    return "\n".join(lines)


async def rag_query(patient_history: list, question: str) -> dict:
    """Answer a doctor's question based on patient history."""
    if not _client:
        raise ValueError("GEMINI_API_KEY is not set")

    prompt = f"""Patient history (most recent first):
{json.dumps(patient_history, indent=2)}

Doctor's question: {question}

Answer concisely from records only. Cite dates as [Visit: YYYY-MM-DD].
Return JSON: {{"answer": "...", "source_visits": ["2024-01-15"]}}"""

    import asyncio
    try:
        text = await asyncio.get_event_loop().run_in_executor(
            None, lambda: _generate("You are a medical AI. Answer from patient records only.", prompt, max_tokens=800)
        )
        result = _safe_parse_json(text)
        result.setdefault("answer", "Unable to generate answer.")
        result.setdefault("source_visits", [])
        return result
    except Exception as e:
        return {"answer": f"Error: {str(e)}", "source_visits": []}


def detect_epidemic_patterns(symptom_data: list) -> list:
    """Detect epidemic clusters locally — no API call needed."""
    from collections import Counter
    disease_counts = Counter()
    for entry in symptom_data:
        for dx in entry.get("diagnoses", []):
            name = dx.get("name", "") if isinstance(dx, dict) else dx
            if name:
                disease_counts[name.strip().lower()] += 1
    alerts = []
    for disease, count in disease_counts.items():
        if count >= 3:
            alerts.append({"alert_type": "cluster", "disease": disease.title(), "confidence": 0.8,
                           "evidence": f"{count} cases in 7 days.", "affected_count": count,
                           "recommendation": "Monitor for outbreak."})
    return alerts
