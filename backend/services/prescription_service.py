import io
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


def generate_prescription_pdf(
    patient: dict,
    visit: dict,
    clinical_data: dict,
    show_brands: bool = True,
) -> bytes:
    """
    Generate a prescription PDF using ReportLab.
    
    Args:
        patient: Patient details dict
        visit: Visit details dict
        clinical_data: Clinical data with medications, diagnosis, etc.
        show_brands: If True, show brand names; if False, show generic only
        
    Returns:
        PDF file as bytes
    """
    buffer = io.BytesIO()
    
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=15 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle(
        name='HospitalName',
        parent=styles['Title'],
        fontSize=18,
        spaceAfter=2,
        textColor=colors.HexColor('#1a365d'),
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name='HospitalAddress',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#4a5568'),
        alignment=TA_CENTER,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#2d3748'),
        spaceBefore=10,
        spaceAfter=6,
        borderWidth=0,
    ))
    styles.add(ParagraphStyle(
        name='PatientInfo',
        parent=styles['Normal'],
        fontSize=10,
        spaceBefore=2,
        spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name='WarningText',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.red,
        spaceBefore=4,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name='FooterText',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#718096'),
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name='RxSymbol',
        parent=styles['Normal'],
        fontSize=24,
        textColor=colors.HexColor('#1a365d'),
        spaceBefore=8,
        spaceAfter=4,
    ))

    story = []

    # ── Hospital Header ──────────────────────────────────────────
    story.append(Paragraph("🏥 Voice-Driven Clinic", styles['HospitalName']))
    story.append(Paragraph(
        "AI-Powered Healthcare | Mumbai, Maharashtra, India",
        styles['HospitalAddress']
    ))
    story.append(Paragraph(
        "Tel: +91-22-XXXX-XXXX | GSTIN: XXXXXXXXXXXXXXX",
        styles['HospitalAddress']
    ))
    story.append(HRFlowable(
        width="100%", thickness=2,
        color=colors.HexColor('#1a365d'),
        spaceAfter=8,
    ))

    # ── Patient Details ──────────────────────────────────────────
    session_date = visit.get('session_date', datetime.now().isoformat())
    try:
        date_obj = datetime.fromisoformat(session_date.replace('Z', '+00:00'))
        date_str = date_obj.strftime('%d %b %Y, %I:%M %p')
    except Exception:
        date_str = session_date

    patient_table_data = [
        [
            Paragraph(f"<b>Patient:</b> {patient.get('name', 'N/A')}", styles['PatientInfo']),
            Paragraph(f"<b>Date:</b> {date_str}", styles['PatientInfo']),
        ],
        [
            Paragraph(f"<b>ID:</b> {patient.get('patient_id', 'N/A')}", styles['PatientInfo']),
            Paragraph(f"<b>Age/Gender:</b> {patient.get('age', 'N/A')} / {patient.get('gender', 'N/A')}", styles['PatientInfo']),
        ],
        [
            Paragraph(f"<b>Phone:</b> {patient.get('phone', 'N/A')}", styles['PatientInfo']),
            Paragraph(f"<b>Risk:</b> {patient.get('risk_badge', 'LOW')}", styles['PatientInfo']),
        ],
    ]

    patient_table = Table(patient_table_data, colWidths=[270, 270])
    patient_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(patient_table)
    story.append(Spacer(1, 6))

    # ── Chief Complaint ──────────────────────────────────────────
    chief_complaint = visit.get('chief_complaint', 'Not recorded')
    story.append(Paragraph(f"<b>Chief Complaint:</b> {chief_complaint}", styles['PatientInfo']))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey, spaceAfter=6, spaceBefore=6))

    # ── Diagnosis ────────────────────────────────────────────────
    diagnoses = clinical_data.get('differential_diagnosis', []) or clinical_data.get('diagnosis', [])
    if diagnoses:
        story.append(Paragraph("Diagnosis", styles['SectionHeader']))
        for i, dx in enumerate(diagnoses[:3], 1):
            name = dx.get('name', 'Unknown')
            icd = dx.get('ICD10', '')
            prob = dx.get('probability', 0)
            icd_str = f" [{icd}]" if icd else ""
            story.append(Paragraph(
                f"{i}. <b>{name}</b>{icd_str} — {prob}% probability",
                styles['PatientInfo']
            ))
            if dx.get('reasoning'):
                story.append(Paragraph(
                    f"   <i>{dx['reasoning']}</i>",
                    styles['PatientInfo']
                ))
        story.append(Spacer(1, 6))

    # ── Rx: Medications ──────────────────────────────────────────
    medications = clinical_data.get('medications', [])
    if medications:
        story.append(Paragraph("<b>℞</b>", styles['RxSymbol']))

        med_header = ['#', 'Medication', 'Dose', 'Frequency', 'Duration']
        med_rows = [med_header]

        for i, med in enumerate(medications, 1):
            if show_brands and med.get('brand_names'):
                med_name = f"{med.get('generic_name', '')}\n({', '.join(med.get('brand_names', [])[:2])})"
            else:
                med_name = med.get('generic_name', 'Unknown')

            med_rows.append([
                str(i),
                med_name,
                med.get('dose', '-'),
                med.get('frequency', '-'),
                med.get('duration', '-'),
            ])

        med_table = Table(med_rows, colWidths=[25, 200, 70, 70, 80])
        med_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#edf2f7')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(med_table)
        story.append(Spacer(1, 6))

    # ── Drug Interaction Warnings ────────────────────────────────
    interactions = clinical_data.get('drug_interactions', [])
    if interactions:
        story.append(Paragraph("⚠️ Drug Interaction Warnings", styles['SectionHeader']))
        for interaction in interactions:
            drug1 = interaction.get('drug1', '')
            drug2 = interaction.get('drug2', '')
            desc = interaction.get('description', '')
            severity = interaction.get('severity', 'unknown')
            story.append(Paragraph(
                f"<font color='red'><b>{severity.upper()}:</b> {drug1} + {drug2} — {desc}</font>",
                styles['WarningText']
            ))
        story.append(Spacer(1, 6))

    # ── Dosage Warnings ──────────────────────────────────────────
    dosage_warnings = clinical_data.get('dosage_warnings', [])
    if dosage_warnings:
        for warning in dosage_warnings:
            story.append(Paragraph(
                f"<font color='red'>⚠️ {warning}</font>",
                styles['WarningText']
            ))

    # ── Follow-up ────────────────────────────────────────────────
    follow_up_date = clinical_data.get('follow_up_date')
    follow_up_days = clinical_data.get('follow_up_days', 7)
    if follow_up_date:
        story.append(Paragraph(
            f"<b>Follow-up Date:</b> {follow_up_date}",
            styles['PatientInfo']
        ))
    else:
        follow_date = (datetime.now() + timedelta(days=follow_up_days)).strftime('%d %b %Y')
        story.append(Paragraph(
            f"<b>Follow-up Date:</b> {follow_date} ({follow_up_days} days)",
            styles['PatientInfo']
        ))

    # ── Signature ────────────────────────────────────────────────
    story.append(Spacer(1, 40))
    story.append(HRFlowable(width="40%", thickness=0.5, color=colors.black))
    story.append(Paragraph("Doctor's Signature", styles['PatientInfo']))

    # ── Footer ───────────────────────────────────────────────────
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey, spaceAfter=4))
    story.append(Paragraph(
        "This prescription was generated with AI assistance. "
        "Clinical decisions remain the responsibility of the treating physician.",
        styles['FooterText']
    ))
    story.append(Paragraph(
        f"Generated on {datetime.now().strftime('%d %b %Y at %I:%M %p')} | Voice-Driven Clinic v1.0",
        styles['FooterText']
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
