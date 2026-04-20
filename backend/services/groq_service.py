import os
import json
import re
from datetime import datetime
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def _clean_json_response(text: str) -> str:
    """Strip markdown code fences and extract JSON from Groq response."""
    text = text.strip()
    # Remove ```json ... ``` fences
    pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    return text


def _safe_parse_json(text: str) -> dict:
    """Safely parse JSON from Groq response with fallback."""
    cleaned = _clean_json_response(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find any JSON object in the text
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return {"error": "Failed to parse Groq response", "raw": text[:500]}


async def diarize_and_extract(
    transcript: str,
    language: str,
    patient_age: int = 0,
) -> dict:
    """
    GROQ CALL 1: Speaker diarization + clinical extraction.
    
    Takes raw transcript and returns:
    - speaker_segments with role labels
    - extracted symptoms, vitals, chief complaint
    - drug name corrections
    - language heatmap
    """
    if not GROQ_API_KEY or not client:
        raise ValueError("GROQ_API_KEY is not set")

    system_instruction = (
        "You are a medical AI assistant designed for Indian hospitals. "
        "You analyze multilingual consultation transcripts carefully and accurately. "
        "You must return ONLY valid JSON with no markdown formatting."
    )

    prompt = f"""
Transcript: {transcript}
Detected Language: {language}
Patient Age: {patient_age}

Task 1 - Speaker Diarization:
Identify and separate speech by role. Look for patterns:
- Questions about symptoms, examination instructions, medical advice = DOCTOR
- Describing pain, illness, symptoms, answering questions = PATIENT
- Additional context, family history, clarifications on behalf of patient = ATTENDANT
Return as speaker_segments array with speaker, text, language, start_time, end_time.

Task 2 - Extract ONLY from PATIENT and ATTENDANT turns:
symptoms: array of objects with fields: name, duration, severity (mild/moderate/severe), body_part, confidence (0.0 to 1.0), language_source
vitals: object with fields: BP, temp, pulse, weight, SpO2, flagged (boolean - true if any vital is abnormal)
chief_complaint: one line summary of the main complaint

Task 3 - Drug name correction:
Common confusions in Indian accent ASR:
- "Paracetamol" vs "Pantoprazole"
- "Metformin" vs "Metoprolol"
- "Cetrizine" vs "Cetirizine"
- "Augmentin" vs "Azithromycin"
- "Amoxicillin" vs "Amoxyclav"
Fix any drug names that seem phonetically confused in the transcript.

Task 4 - Language heatmap:
For each speaker segment, tag language as hindi/marathi/english/mixed.
Provide overall percentage breakdown.

Return ONLY valid JSON (no markdown, no code fences):
{{
  "speaker_segments": [
    {{"speaker": "DOCTOR|PATIENT|ATTENDANT", "text": "...", "language": "hindi|marathi|english|mixed", "start_time": 0.0, "end_time": 1.0}}
  ],
  "symptoms": [
    {{"name": "...", "duration": "...", "severity": "mild|moderate|severe", "body_part": "...", "confidence": 0.85, "language_source": "hindi"}}
  ],
  "vitals": {{"BP": "120/80", "temp": "98.6F", "pulse": "72", "weight": "", "SpO2": "", "flagged": false}},
  "chief_complaint": "...",
  "language_heatmap": {{"hindi": 45, "marathi": 30, "english": 25, "mixed": 0}},
  "corrected_drug_names": [{{"original": "...", "corrected": "..."}}]
}}
"""

    try:
        print(f"\n{'='*50}\n[GROQ API REQUEST - DIARIZE & EXTRACT]")
        print(f"Prompt Length: {len(prompt)} characters")
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Updated: mixtral was decommissioned
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=4096,
        )
        
        response_text = response.choices[0].message.content
        print(f"[GROQ API RESPONSE] Success")
        print(f"Response Preview: {response_text[:150]}...")
        print(f"{'='*50}\n")
        
        result = _safe_parse_json(response_text)

        # Ensure required fields exist with defaults
        result.setdefault("speaker_segments", [])
        result.setdefault("symptoms", [])
        result.setdefault("vitals", {})
        result.setdefault("chief_complaint", "")
        result.setdefault("language_heatmap", {})
        result.setdefault("corrected_drug_names", [])

        return result

    except Exception as e:
        print(f"[GROQ API ERROR] {str(e)}")
        return {
            "speaker_segments": [],
            "symptoms": [],
            "vitals": {},
            "chief_complaint": f"Analysis failed: {str(e)}",
            "language_heatmap": {},
            "corrected_drug_names": [],
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
    """
    GROQ CALL 2: Clinical intelligence — diagnosis, medications, interactions.
    
    Takes structured symptoms/vitals and returns:
    - Differential diagnosis (top 3) with ICD-10 codes
    - Medication analysis with Indian brand names
    - Drug interaction checks
    - Missing info detection
    - Risk stratification
    - Follow-up recommendation
    - Newly extracted allergies and chronic conditions for memory accumulation
    """
    if not GROQ_API_KEY or not client:
        raise ValueError("GROQ_API_KEY is not set")

    current_month = datetime.now().strftime("%B %Y")
    past_dx = past_diagnoses or []
    memory = patient_memory or {}

    # Build the patient memory context block
    memory_context = ""
    known_allergies = memory.get("allergies", [])
    known_conditions = memory.get("chronic_conditions", [])
    known_medications = memory.get("current_medications", [])
    blood_type = memory.get("blood_type", "")
    family_history = memory.get("family_history", [])
    surgical_history = memory.get("surgical_history", [])

    if any([known_allergies, known_conditions, known_medications, blood_type, family_history, surgical_history]):
        memory_context = f"""
═══ PATIENT MEDICAL MEMORY (from past records) ═══
Known Allergies: {json.dumps(known_allergies) if known_allergies else "None recorded"}
Chronic Conditions: {json.dumps(known_conditions) if known_conditions else "None recorded"}
Current Ongoing Medications: {json.dumps(known_medications) if known_medications else "None recorded"}
Blood Type: {blood_type or "Unknown"}
Surgical History: {json.dumps(surgical_history) if surgical_history else "None recorded"}
Family History: {json.dumps(family_history) if family_history else "None recorded"}
═══════════════════════════════════════════════════
"""

    system_instruction = (
        "You are a senior physician AI assistant trained on Indian clinical guidelines "
        "(ICMR, API, IAP). Be conservative and always flag uncertainties. "
        "Only flag drug interactions that are clinically significant "
        "(contraindicated or major). Ignore minor interactions. "
        "CRITICAL: Always check the patient's KNOWN ALLERGIES before recommending any medication. "
        "If a medication or its drug class matches a known allergy, DO NOT recommend it and flag it as an allergy_warning. "
        "You must return ONLY valid JSON with no markdown formatting."
    )

    prompt = f"""
Patient symptoms: {json.dumps(symptoms)}
Vitals: {json.dumps(vitals)}
Current Season/Month: {current_month} (important for endemic/epidemic diseases in India)
Patient age: {patient_age}
Patient gender: {patient_gender}
Past diagnoses from records: {json.dumps(past_dx)}
{memory_context}

Task 1 - Differential Diagnosis (top 3):
For each provide: name, ICD10_code, probability (0-100%), reasoning (one line),
red_flags (boolean), requires_test (list of recommended tests).
Consider the patient's chronic conditions when forming differentials.

Task 2 - Medications:
For each medication mentioned or recommended:
generic_name, brand_names (popular Indian brands like Cipla, Sun Pharma, etc.),
dose, frequency (OD/BD/TID/QID), duration,
safe_for_age (boolean), max_daily_dose_exceeded (boolean),
interaction_warning (string or null),
allergy_warning (string or null — set if this drug is contraindicated due to known allergies)
⚠️ CROSS-CHECK every medication against the patient's known allergies above.
⚠️ Also check against the patient's current ongoing medications for interactions.

Task 3 - Drug Interaction Check:
Check ALL prescribed medications against each other AND against the patient's current ongoing medications.
Only flag clinically significant interactions (contraindicated or major).

Task 4 - Missing Info Detection:
Check if these are captured in the symptoms/vitals/memory, flag ONLY if truly missing:
- Allergy history (skip if allergies already in memory)
- Current medications list (skip if already in memory)
- Family history (skip if already in memory)
- Pregnancy status (if female aged 15-45)
- Vaccination history (if pediatric)

Task 5 - Risk Stratification:
Based on age + diagnoses + vitals + chronic conditions → HIGH / MODERATE / LOW
HIGH: Critical vitals, serious diagnoses, extremes of age with acute illness
MODERATE: Chronic conditions, borderline vitals
LOW: Stable presentation

Task 6 - Follow-up:
Suggest follow-up in days based on condition severity and prescription duration.

Task 7 - Memory Extraction:
From THIS consultation, extract any NEW information mentioned:
- extracted_allergies: list of allergy names mentioned by the patient in this visit
- extracted_chronic_conditions: list of chronic conditions (diabetes, hypertension, asthma, etc.) mentioned
These will be saved to the patient's permanent medical record.

Return ONLY valid JSON (no markdown, no code fences):
{{
  "differential_diagnosis": [
    {{"name": "...", "ICD10": "A01.0", "probability": 78, "reasoning": "...", "red_flags": false, "requires_test": ["CBC", "Widal"]}}
  ],
  "medications": [
    {{"generic_name": "Paracetamol", "brand_names": ["Crocin", "Dolo 650"], "dose": "500mg", "frequency": "TID", "duration": "5 days", "safe_for_age": true, "max_daily_dose_exceeded": false, "interaction_warning": null, "allergy_warning": null}}
  ],
  "drug_interactions": [
    {{"drug1": "...", "drug2": "...", "severity": "major|contraindicated", "description": "..."}}
  ],
  "missing_info_flags": ["travel history missing"],
  "dosage_warnings": ["..."],
  "risk_level": "HIGH|MODERATE|LOW",
  "follow_up_days": 7,
  "extracted_allergies": ["Penicillin"],
  "extracted_chronic_conditions": ["Type 2 Diabetes"]
}}
"""

    try:
        print(f"\n{'='*50}\n[GROQ API REQUEST - CLINICAL ANALYSIS]")
        print(f"Symptoms: {len(symptoms)}, Vitals: {len(vitals)}")
        print(f"Prompt Length: {len(prompt)} characters")

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=4096,
        )
        
        response_text = response.choices[0].message.content
        print(f"[GROQ API RESPONSE] Success")
        print(f"Response Preview: {response_text[:150]}...")
        print(f"{'='*50}\n")
        
        result = _safe_parse_json(response_text)

        # Ensure required fields exist with defaults
        result.setdefault("differential_diagnosis", [])
        result.setdefault("medications", [])
        result.setdefault("drug_interactions", [])
        result.setdefault("missing_info_flags", [])
        result.setdefault("dosage_warnings", [])
        result.setdefault("risk_level", "LOW")
        result.setdefault("follow_up_days", 7)

        return result

    except Exception as e:
        print(f"[GROQ API ERROR] {str(e)}")
        return {
            "differential_diagnosis": [],
            "medications": [],
            "drug_interactions": [],
            "missing_info_flags": [],
            "dosage_warnings": [],
            "risk_level": "LOW",
            "follow_up_days": 7,
            "error": f"Error: {str(e)}",
        }


async def generate_patient_brief(patient_data: dict, visits_data: list) -> str:
    """Generate a concise 3-line brief for a returning patient."""
    if not GROQ_API_KEY or not client:
        return "AI brief unavailable — API key not configured."

    prompt = f"""
Patient: {patient_data.get('name', 'Unknown')}, Age: {patient_data.get('age', 'N/A')}, Gender: {patient_data.get('gender', 'N/A')}
Risk Level: {patient_data.get('risk_badge', 'LOW')}

Visit History (most recent first):
{json.dumps(visits_data[:5], indent=2)}

Generate a concise 3-line clinical brief for this returning patient:
Line 1: Last visit summary (date + chief complaint + outcome)
Line 2: Chronic/recurring conditions if any
Line 3: Unresolved flags or pending tests from previous visits

Keep it under 150 words total. Be factual, clinical, and concise.
If there are no visits, say "New patient — no prior history."
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Brief generation failed: {str(e)}"


async def rag_query(patient_history: list, question: str, patient_memory: dict = None) -> dict:
    """
    Answer a doctor's question based on patient history (RAG-style).
    Returns answer text + source visit dates.
    """
    if not GROQ_API_KEY or not client:
        raise ValueError("GROQ_API_KEY is not set")

    prompt = f"""
Patient history (all visits, most recent first):
{json.dumps(patient_history, indent=2)}

Doctor's question: {question}

Instructions:
- Answer concisely based ONLY on the patient's actual records above
- If information is not available in the records, say so clearly
- Cite which visit date the information is from using [Visit: YYYY-MM-DD] format
- If the question is about trends (e.g., BP over time), show the progression

Return JSON:
{{
  "answer": "Your concise answer here with [Visit: date] citations",
  "source_visits": ["2024-01-15", "2024-02-20"]
}}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=1000,
        )
        result = _safe_parse_json(response.choices[0].message.content)
        result.setdefault("answer", "Unable to generate answer.")
        result.setdefault("source_visits", [])
        return result
    except Exception as e:
        return {
            "answer": f"Error generating answer: {str(e)}",
            "source_visits": [],
        }


async def detect_epidemic_patterns(symptom_data: list) -> list:
    """Analyze aggregated symptom data to detect epidemic patterns."""
    if not GROQ_API_KEY or not client:
        return []

    prompt = f"""
Aggregated anonymized symptom data from the last 7 days across all patients:
{json.dumps(symptom_data, indent=2)}

Current month: {datetime.now().strftime("%B %Y")}
Region: India

Analyze for:
1. Unusual clustering of similar symptoms
2. Seasonal epidemic indicators (dengue, malaria, chikungunya, typhoid, etc.)
3. Any patterns suggesting outbreak

Return JSON array of alerts:
[
  {{
    "alert_type": "outbreak|cluster|seasonal",
    "disease": "suspected disease name",
    "confidence": 0.75,
    "evidence": "brief description of pattern",
    "affected_count": 15,
    "recommendation": "what action to take"
  }}
]

Return empty array [] if no concerning patterns found.
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000,
        )
        result = _safe_parse_json(response.choices[0].message.content)
        if isinstance(result, list):
            return result
        return result.get("alerts", [])
    except Exception:
        return []
