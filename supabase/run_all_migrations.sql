-- ============================================
-- COMBINED SCHEMA — Run this ONE file in Supabase SQL Editor
-- It includes: patient memory and doctor auth
-- ============================================

-- ═══ 1. PATIENT MEMORY COLUMNS ═══════════════════════════════
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS chronic_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS surgical_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS family_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- ═══ 2. USERS TABLE (AUTH) ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'doctor' CHECK (role = 'doctor'),
  patient_id UUID REFERENCES patients(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ═══ 3. DISABLE RLS FOR HACKATHON ═══════════════════════════
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
