"""
Seed demo data for patient dashboard.
Run: python seed_demo_patient.py
"""
import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from db.supabase_client import get_supabase


def seed():
    db = get_supabase()

    # ── Find or create Ramesh Patil ──────────────────────────────
    result = db.table("patients").select("*").eq("name", "Ramesh Patil").execute()

    if result.data:
        patient = result.data[0]
        patient_id = patient["id"]
        print(f"Found existing patient: {patient['patient_id']} ({patient_id})")
    else:
        insert = db.table("patients").insert({
            "patient_id": "PT-2024-001",
            "name": "Ramesh Patil",
            "age": 54,
            "gender": "Male",
            "phone": "+919876543210",
            "risk_badge": "MODERATE",
        }).execute()
        patient = insert.data[0]
        patient_id = patient["id"]
        print(f"Created patient: PT-2024-001 ({patient_id})")

    # ── Update patient with extra fields ────────────────────────
    db.table("patients").update({
        "blood_type": "B+",
        "phone": "+919876543210",
        "allergies": [
            {"name": "Penicillin", "severity": "severe", "reaction": "Anaphylaxis"},
            {"name": "Sulfa drugs", "severity": "moderate", "reaction": "Skin rash"},
        ],
        "chronic_conditions": [
            {"name": "Type 2 Diabetes", "since": "2019", "status": "managed"},
            {"name": "Hypertension", "since": "2021", "status": "managed"},
        ],
        "emergency_contact": {
            "name": "Sunita Patil",
            "relation": "Wife",
            "phone": "+919876543211",
        },
    }).eq("id", patient_id).execute()
    print("Updated patient with allergies, conditions, emergency contact")

    # ── Seed vitals logs (last 3 months) ────────────────────────
    now = datetime.utcnow()
    vitals_data = []
    for i in range(12):
        day_offset = i * 7  # weekly readings
        logged_at = (now - timedelta(days=day_offset)).isoformat()
        vitals_data.append({
            "patient_id": patient_id,
            "logged_by": "patient" if i % 2 == 0 else "doctor",
            "bp_systolic": max(120, 158 - i * 3),
            "bp_diastolic": max(78, 96 - i * 2),
            "blood_sugar_fasting": max(95, 145 - i * 4),
            "weight_kg": round(76.0 - i * 0.3, 1),
            "pulse": 72 + (i % 3),
            "spo2": 97 + (i % 2),
            "logged_at": logged_at,
        })

    # Delete old vitals for this patient first
    db.table("patient_vitals_log").delete().eq("patient_id", patient_id).execute()
    for v in vitals_data:
        db.table("patient_vitals_log").insert(v).execute()
    print(f"Seeded {len(vitals_data)} vitals logs")

    # ── Seed reminders ──────────────────────────────────────────
    db.table("reminders").delete().eq("patient_id", patient_id).execute()
    reminders = [
        {
            "patient_id": patient_id,
            "type": "medication",
            "title": "Metformin Morning",
            "body": "Take Metformin 500mg after breakfast",
            "medication_name": "Metformin 500mg",
            "recurrence": "daily",
            "recurrence_times": ["08:00"],
            "channel": ["push"],
            "active": True,
        },
        {
            "patient_id": patient_id,
            "type": "medication",
            "title": "Metformin Evening",
            "body": "Take Metformin 500mg after dinner",
            "medication_name": "Metformin 500mg",
            "recurrence": "daily",
            "recurrence_times": ["20:00"],
            "channel": ["push"],
            "active": True,
        },
        {
            "patient_id": patient_id,
            "type": "medication",
            "title": "Amlodipine",
            "body": "Take Amlodipine 5mg in the morning",
            "medication_name": "Amlodipine 5mg",
            "recurrence": "daily",
            "recurrence_times": ["09:00"],
            "channel": ["push"],
            "active": True,
        },
        {
            "patient_id": patient_id,
            "type": "appointment",
            "title": "Dr. Sharma Follow-up",
            "body": "Hypertension + Diabetes follow-up at City Hospital",
            "remind_at": (now + timedelta(days=2)).isoformat(),
            "recurrence": "once",
            "channel": ["push", "sms"],
            "active": True,
        },
        {
            "patient_id": patient_id,
            "type": "vitals",
            "title": "Log Blood Pressure",
            "body": "Record your morning BP reading",
            "recurrence": "daily",
            "recurrence_times": ["07:30"],
            "channel": ["push"],
            "active": True,
        },
        {
            "patient_id": patient_id,
            "type": "test",
            "title": "HbA1c Test Due",
            "body": "Quarterly HbA1c test — book at any lab",
            "remind_at": (now + timedelta(days=60)).isoformat(),
            "recurrence": "once",
            "channel": ["push", "sms"],
            "active": True,
        },
    ]
    for r in reminders:
        db.table("reminders").insert(r).execute()
    print(f"Seeded {len(reminders)} reminders")

    # ── Seed medication logs (last 7 days) ──────────────────────
    db.table("medication_logs").delete().eq("patient_id", patient_id).execute()
    med_logs = []
    for day in range(7):
        date = now - timedelta(days=day)
        for med, hour in [("Metformin 500mg", 8), ("Metformin 500mg", 20), ("Amlodipine 5mg", 9)]:
            scheduled = date.replace(hour=hour, minute=0, second=0)
            taken = day > 0 or hour < 20  # missed evening dose today
            med_logs.append({
                "patient_id": patient_id,
                "medication_name": med,
                "scheduled_at": scheduled.isoformat(),
                "taken_at": (scheduled + timedelta(minutes=15)).isoformat() if taken else None,
                "status": "taken" if taken else "missed",
            })
    for ml in med_logs:
        db.table("medication_logs").insert(ml).execute()
    print(f"Seeded {len(med_logs)} medication logs")

    # ── Seed health documents ───────────────────────────────────
    db.table("health_documents").delete().eq("patient_id", patient_id).execute()
    docs = [
        {
            "patient_id": patient_id,
            "doc_type": "lab_report",
            "title": "HbA1c Report — March 2024",
            "report_date": "2024-03-15",
            "extracted_data": {"HbA1c": "6.8%", "status": "pre-diabetic range"},
        },
        {
            "patient_id": patient_id,
            "doc_type": "lab_report",
            "title": "CBC Report — June 2024",
            "report_date": "2024-06-02",
            "extracted_data": {"hemoglobin": "13.2 g/dL", "WBC": "7,200", "platelets": "2.1 lakh"},
        },
        {
            "patient_id": patient_id,
            "doc_type": "prescription",
            "title": "Dr. Sharma Prescription — July 2024",
            "report_date": "2024-07-15",
        },
    ]
    for d in docs:
        db.table("health_documents").insert(d).execute()
    print(f"Seeded {len(docs)} health documents")

    # ── Generate QR token ───────────────────────────────────────
    db.table("emergency_qr_tokens").delete().eq("patient_id", patient_id).execute()
    import uuid
    token = str(uuid.uuid4())
    db.table("emergency_qr_tokens").insert({
        "patient_id": patient_id,
        "token": token,
        "expires_at": (now + timedelta(days=365)).isoformat(),
    }).execute()
    print(f"Generated QR token: {token}")

    print(f"\n✅ Demo data seeded for Ramesh Patil!")
    print(f"   Phone: +919876543210")
    print(f"   Patient UUID: {patient_id}")
    print(f"   Login at: http://localhost:5173/pd/login")


if __name__ == "__main__":
    seed()
