def calculate_risk(age: int, diagnoses: list, vitals: dict) -> str:
    """
    Rule-based risk stratification as a fallback/supplement to Gemini's assessment.
    
    Args:
        age: Patient age in years
        diagnoses: List of diagnosis dicts with name, probability, red_flags
        vitals: Dict with BP, temp, pulse, SpO2, flagged
        
    Returns:
        'HIGH', 'MODERATE', or 'LOW'
    """
    risk_score = 0

    # Age-based risk
    if age < 2 or age > 75:
        risk_score += 3
    elif age < 5 or age > 65:
        risk_score += 2
    elif age < 12 or age > 55:
        risk_score += 1

    # Vitals-based risk
    if vitals.get("flagged", False):
        risk_score += 2

    # Check specific vitals
    bp = vitals.get("BP", "")
    if bp:
        try:
            parts = bp.replace(" ", "").split("/")
            if len(parts) == 2:
                systolic = int(parts[0])
                diastolic = int(parts[1])
                if systolic > 180 or diastolic > 120:
                    risk_score += 3  # Hypertensive crisis
                elif systolic > 140 or diastolic > 90:
                    risk_score += 1  # Hypertension
                elif systolic < 90 or diastolic < 60:
                    risk_score += 2  # Hypotension
        except (ValueError, IndexError):
            pass

    # Temperature
    temp = vitals.get("temp", "")
    if temp:
        try:
            temp_val = float(temp.replace("F", "").replace("°", "").replace("f", "").strip())
            if temp_val > 103:
                risk_score += 3  # High fever
            elif temp_val > 101:
                risk_score += 1  # Fever
            elif temp_val < 95:
                risk_score += 2  # Hypothermia
        except ValueError:
            pass

    # Pulse
    pulse = vitals.get("pulse", "")
    if pulse:
        try:
            pulse_val = int(pulse.replace("bpm", "").strip())
            if pulse_val > 120 or pulse_val < 50:
                risk_score += 2
            elif pulse_val > 100 or pulse_val < 60:
                risk_score += 1
        except ValueError:
            pass

    # SpO2
    spo2 = vitals.get("SpO2", "")
    if spo2:
        try:
            spo2_val = int(spo2.replace("%", "").strip())
            if spo2_val < 90:
                risk_score += 3  # Critical
            elif spo2_val < 94:
                risk_score += 2
        except ValueError:
            pass

    # Diagnosis-based risk
    for dx in diagnoses:
        if dx.get("red_flags", False):
            risk_score += 3
        prob = dx.get("probability", 0)
        if prob > 70:
            risk_score += 1

    # Critical disease names
    critical_keywords = [
        "sepsis", "stroke", "MI", "myocardial", "meningitis",
        "pneumonia", "dengue", "malaria", "typhoid",
        "diabetic ketoacidosis", "DKA", "anaphylaxis",
        "pulmonary embolism", "heart failure",
    ]
    for dx in diagnoses:
        name = dx.get("name", "").lower()
        if any(kw.lower() in name for kw in critical_keywords):
            risk_score += 2

    # Final classification
    if risk_score >= 5:
        return "HIGH"
    elif risk_score >= 3:
        return "MODERATE"
    else:
        return "LOW"
