from datetime import datetime, timedelta
from fastapi import APIRouter
from db.supabase_client import get_supabase
from services import gemini_service

router = APIRouter()


@router.get("/epidemic-alert")
async def get_epidemic_alerts():
    """
    Aggregate symptoms across all patients from the last 7 days (anonymized)
    and use Gemini to detect unusual clustering or epidemic patterns.
    """
    db = get_supabase()

    # Get visits from last 7 days
    seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
    
    visits_result = (
        db.table("visits")
        .select("id, session_date, chief_complaint, language_detected")
        .gte("session_date", seven_days_ago)
        .execute()
    )
    visits = visits_result.data or []

    if not visits:
        return {
            "alerts": [],
            "period": "last 7 days",
            "total_visits": 0,
            "message": "No visits recorded in the last 7 days.",
        }

    # Aggregate anonymized symptom data
    symptom_data = []
    for visit in visits:
        cd_result = (
            db.table("clinical_data")
            .select("symptoms, vitals, differential_diagnosis")
            .eq("visit_id", visit["id"])
            .execute()
        )
        if cd_result.data:
            cd = cd_result.data[0]
            # Anonymized: only include clinical data, no patient info
            entry = {
                "date": visit.get("session_date", ""),
                "chief_complaint": visit.get("chief_complaint", ""),
                "symptoms": [
                    {"name": s.get("name", ""), "severity": s.get("severity", "")}
                    for s in (cd.get("symptoms") or [])
                ],
                "diagnoses": [
                    {"name": d.get("name", ""), "probability": d.get("probability", 0)}
                    for d in (cd.get("differential_diagnosis") or [])
                ],
                "vitals_flagged": (cd.get("vitals") or {}).get("flagged", False),
            }
            symptom_data.append(entry)

    # Analyze patterns via Gemini
    alerts = await gemini_service.detect_epidemic_patterns(symptom_data)

    return {
        "alerts": alerts,
        "period": "last 7 days",
        "total_visits": len(visits),
        "total_analyzed": len(symptom_data),
    }


@router.get("/summary")
async def get_analytics_summary():
    """Get a basic analytics summary — patient counts, risk distribution, etc."""
    db = get_supabase()

    # Total patients
    patients_result = db.table("patients").select("id, risk_badge").execute()
    patients = patients_result.data or []

    risk_distribution = {"HIGH": 0, "MODERATE": 0, "LOW": 0}
    for p in patients:
        badge = p.get("risk_badge", "LOW")
        risk_distribution[badge] = risk_distribution.get(badge, 0) + 1

    # Recent visits (last 30 days)
    thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
    visits_result = (
        db.table("visits")
        .select("id, session_date")
        .gte("session_date", thirty_days_ago)
        .execute()
    )
    recent_visits = visits_result.data or []

    # Visits by day (last 7 days)
    daily_counts = {}
    for visit in recent_visits:
        date_str = visit.get("session_date", "")[:10]
        daily_counts[date_str] = daily_counts.get(date_str, 0) + 1

    return {
        "total_patients": len(patients),
        "risk_distribution": risk_distribution,
        "visits_last_30_days": len(recent_visits),
        "daily_visit_counts": daily_counts,
    }
