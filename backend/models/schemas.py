from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


# ── Patient Schemas ──────────────────────────────────────────────

class PatientCreate(BaseModel):
    name: str
    age: int
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    phone: Optional[str] = None


class PatientResponse(BaseModel):
    id: str
    patient_id: str
    name: str
    age: int
    gender: str
    phone: Optional[str] = None
    risk_badge: str = "LOW"
    created_at: Optional[str] = None


# ── Visit Schemas ────────────────────────────────────────────────

class VisitResponse(BaseModel):
    id: str
    patient_id: str
    session_date: Optional[str] = None
    raw_transcript: Optional[str] = None
    language_detected: Optional[str] = None
    audio_quality_score: Optional[float] = None
    chief_complaint: Optional[str] = None
    needs_review: bool = False
    created_at: Optional[str] = None


# ── Clinical Data Schemas ────────────────────────────────────────

class SymptomItem(BaseModel):
    name: str
    duration: Optional[str] = None
    severity: Optional[str] = None
    body_part: Optional[str] = None
    confidence: float = 0.5
    language_source: Optional[str] = None


class VitalsData(BaseModel):
    BP: Optional[str] = None
    temp: Optional[str] = None
    pulse: Optional[str] = None
    weight: Optional[str] = None
    flagged: bool = False


class DiagnosisItem(BaseModel):
    name: str
    ICD10: Optional[str] = None
    probability: float = 0.0
    reasoning: Optional[str] = None
    red_flags: bool = False
    requires_test: list[str] = []


class MedicationItem(BaseModel):
    generic_name: str
    brand_names: list[str] = []
    dose: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    safe_for_age: bool = True
    max_daily_dose_exceeded: bool = False
    interaction_warning: Optional[str] = None


class SpeakerSegment(BaseModel):
    speaker: str
    text: str
    language: str = "hindi"
    start_time: float = 0.0
    end_time: float = 0.0


class ClinicalDataResponse(BaseModel):
    id: Optional[str] = None
    visit_id: Optional[str] = None
    symptoms: list[dict] = []
    vitals: dict = {}
    diagnosis: list[dict] = []
    differential_diagnosis: list[dict] = []
    medications: list[dict] = []
    missing_info_flags: list[str] = []
    drug_interactions: list[dict] = []
    dosage_warnings: list[str] = []
    follow_up_date: Optional[str] = None


# ── Audio Process Response ───────────────────────────────────────

class AudioProcessResponse(BaseModel):
    visit_id: str
    transcript: str
    language_detected: str
    audio_quality_score: float
    speaker_segments: list[dict] = []
    symptoms: list[dict] = []
    vitals: dict = {}
    chief_complaint: str = ""
    language_heatmap: dict = {}
    differential_diagnosis: list[dict] = []
    medications: list[dict] = []
    drug_interactions: list[dict] = []
    missing_info_flags: list[str] = []
    dosage_warnings: list[str] = []
    risk_level: str = "LOW"
    follow_up_days: int = 7

class ProcessTextRequest(BaseModel):
    transcript: str
    patient_id: str
    language_detected: str = "unknown"
    audio_quality_score: float = 1.0


# ── RAG Schemas ──────────────────────────────────────────────────

class RAGQuery(BaseModel):
    patient_id: str
    question: str


class RAGResponse(BaseModel):
    answer: str
    source_visits: list[str] = []


# ── Prescription Schemas ─────────────────────────────────────────

class PrescriptionRequest(BaseModel):
    visit_id: str
    show_brands: bool = True
