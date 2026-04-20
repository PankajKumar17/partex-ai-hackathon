-- ============================================
-- AUTH SCHEMA — Users table with role-based access
-- Run in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'patient')),
  patient_id UUID REFERENCES patients(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Link patients to user accounts
ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id UUID;

-- Disable RLS for hackathon
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
