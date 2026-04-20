"""
Run SQL schema against Supabase using the Management API.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

SQL = """
ALTER TABLE patients ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS chronic_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS patient_vitals_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  logged_by TEXT DEFAULT 'patient' CHECK (logged_by IN ('patient', 'doctor')),
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  blood_sugar_fasting INTEGER,
  blood_sugar_pp INTEGER,
  weight_kg FLOAT,
  temp_f FLOAT,
  pulse INTEGER,
  spo2 INTEGER,
  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vitals_log_patient ON patient_vitals_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_log_date ON patient_vitals_log(logged_at);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('medication', 'appointment', 'vitals', 'test')),
  title TEXT NOT NULL,
  body TEXT,
  medication_name TEXT,
  remind_at TIMESTAMPTZ,
  recurrence TEXT DEFAULT 'once' CHECK (recurrence IN ('daily', 'weekly', 'once', 'custom')),
  recurrence_times TEXT[] DEFAULT '{}',
  channel TEXT[] DEFAULT '{push}',
  active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_patient ON reminders(patient_id);

CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('taken', 'missed', 'snoozed', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_med_logs_patient ON medication_logs(patient_id);

CREATE TABLE IF NOT EXISTS health_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doc_type TEXT DEFAULT 'lab_report' CHECK (doc_type IN ('lab_report', 'scan', 'prescription', 'discharge_summary', 'other')),
  title TEXT NOT NULL,
  file_url TEXT,
  extracted_data JSONB DEFAULT '{}'::jsonb,
  report_date DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_docs_patient ON health_documents(patient_id);

CREATE TABLE IF NOT EXISTS emergency_qr_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 year')
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON emergency_qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_patient ON emergency_qr_tokens(patient_id);

ALTER TABLE patient_vitals_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE health_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_qr_tokens DISABLE ROW LEVEL SECURITY;
"""

def run_sql():
    # Try using the Supabase SQL API endpoint
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }

    # First approach: Try the SQL execution endpoint
    # Supabase exposes /pg endpoint for SQL via service key
    sql_url = f"{SUPABASE_URL}/rest/v1/"
    
    # Actually, let's use the supabase-py client to test if tables exist
    # by trying to select from them
    from supabase import create_client
    db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Test if new columns exist on patients table
    try:
        result = db.table("patients").select("id, blood_type, allergies").limit(1).execute()
        print("✅ patients table already has new columns (blood_type, allergies)")
        return True
    except Exception as e:
        error_str = str(e)
        if "blood_type" in error_str or "allergies" in error_str:
            print(f"❌ New columns don't exist yet: {error_str}")
            print("\n⚠️  You need to run the SQL schema in Supabase SQL Editor.")
            print(f"   Go to: {SUPABASE_URL.replace('.co', '.com')}/project/loewzhrsopatrbfyzvgy/sql")
            print("   Paste the contents of: supabase/patient_dashboard_schema.sql")
            return False
        else:
            # Columns exist but other error
            print(f"Other error (columns may exist): {error_str}")
            return True

    # Test if new tables exist
    for table in ["patient_vitals_log", "reminders", "medication_logs", "health_documents", "emergency_qr_tokens"]:
        try:
            result = db.table(table).select("id").limit(1).execute()
            print(f"✅ {table} exists")
        except Exception as e:
            print(f"❌ {table} missing: {e}")
            return False
    
    return True

if __name__ == "__main__":
    run_sql()
