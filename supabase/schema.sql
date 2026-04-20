-- Voice-Driven Clinic — Supabase Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PATIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT UNIQUE NOT NULL,  -- Human-readable: PT-2024-001
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    phone TEXT,
    risk_badge TEXT DEFAULT 'LOW' CHECK (risk_badge IN ('HIGH', 'MODERATE', 'LOW')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_name ON patients(name);

-- ============================================
-- VISITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    session_date TIMESTAMPTZ DEFAULT NOW(),
    raw_transcript TEXT,
    language_detected TEXT,
    audio_quality_score FLOAT,
    chief_complaint TEXT,
    needs_review BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_visits_session_date ON visits(session_date);

-- ============================================
-- CLINICAL DATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS clinical_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    symptoms JSONB DEFAULT '[]'::jsonb,
    vitals JSONB DEFAULT '{}'::jsonb,
    diagnosis JSONB DEFAULT '[]'::jsonb,
    differential_diagnosis JSONB DEFAULT '[]'::jsonb,
    medications JSONB DEFAULT '[]'::jsonb,
    missing_info_flags JSONB DEFAULT '[]'::jsonb,
    drug_interactions JSONB DEFAULT '[]'::jsonb,
    dosage_warnings JSONB DEFAULT '[]'::jsonb,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clinical_data_visit_id ON clinical_data(visit_id);

-- ============================================
-- SPEAKER SEGMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS speaker_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    speaker TEXT NOT NULL CHECK (speaker IN ('DOCTOR', 'PATIENT', 'ATTENDANT')),
    text TEXT NOT NULL,
    language TEXT DEFAULT 'hindi' CHECK (language IN ('hindi', 'marathi', 'english', 'mixed')),
    start_time FLOAT DEFAULT 0,
    end_time FLOAT DEFAULT 0
);

CREATE INDEX idx_speaker_segments_visit_id ON speaker_segments(visit_id);

-- ============================================
-- DISABLE RLS (Hackathon mode)
-- ============================================
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE visits DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_segments DISABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER: Auto-generate patient_id sequence
-- ============================================
CREATE SEQUENCE IF NOT EXISTS patient_id_seq START 1;
