-- Patient Memory: allergies, chronic conditions, and key medical data
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type TEXT DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS chronic_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS current_medications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS surgical_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS family_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
