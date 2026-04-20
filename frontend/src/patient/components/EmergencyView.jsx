import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, Pill, Heart, Phone, Shield } from 'lucide-react'
import { getEmergencyData } from '../patientApi'
import '../patient.css'

export default function EmergencyView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [token])

  const loadData = async () => {
    try {
      const res = await getEmergencyData(token)
      setData(res)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired QR code')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="pd-emergency" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="pd-skeleton" style={{ width: 300, height: 400 }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pd-emergency" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>
          {error}
        </h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          This QR code may have expired or is invalid.
        </p>
      </div>
    )
  }

  return (
    <div className="pd-emergency">
      {/* Emergency Header */}
      <div className="pd-emergency-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <Shield size={24} />
          <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Emergency Health Info
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {data.patient_name}
        </h1>
        <p style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
          {data.age}y · {data.gender} · Blood Type: {data.blood_type || '?'}
        </p>
      </div>

      {/* Allergies — CRITICAL */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 20, marginBottom: 16,
        border: '2px solid #fecaca',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <AlertTriangle size={20} style={{ color: '#dc2626' }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>
            ⚠️ ALLERGIES
          </span>
        </div>
        {(data.allergies || []).length > 0 ? (
          data.allergies.map((a, i) => (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: 10,
              background: a.severity === 'severe' ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${a.severity === 'severe' ? '#fecaca' : '#fde68a'}`,
              marginBottom: 8,
            }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {a.severity === 'severe' ? '🔴' : '🟡'} {a.name}
              </p>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Severity: <strong>{a.severity}</strong> · {a.reaction}
              </p>
            </div>
          ))
        ) : (
          <p style={{ fontSize: 14, color: '#16a34a', fontWeight: 600 }}>
            ✅ No known allergies
          </p>
        )}
      </div>

      {/* Current Medications */}
      <div style={{
        background: 'white', borderRadius: 16, padding: 20, marginBottom: 16,
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Pill size={20} style={{ color: '#0d9488' }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
            CURRENT MEDICATIONS
          </span>
        </div>
        {(data.current_medications || []).length > 0 ? (
          data.current_medications.map((m, i) => (
            <div key={i} style={{
              padding: '8px 0',
              borderBottom: i < data.current_medications.length - 1 ? '1px solid #f1f5f9' : 'none'
            }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
                💊 {m.generic_name || m.name}
              </p>
              <p style={{ fontSize: 12, color: '#64748b' }}>
                {m.dose} — {m.frequency}
              </p>
            </div>
          ))
        ) : (
          <p style={{ fontSize: 14, color: '#94a3b8' }}>No current medications on record</p>
        )}
      </div>

      {/* Chronic Conditions */}
      {(data.chronic_conditions || []).length > 0 && (
        <div style={{
          background: 'white', borderRadius: 16, padding: 20, marginBottom: 16,
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Heart size={20} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              CHRONIC CONDITIONS
            </span>
          </div>
          {data.chronic_conditions.map((c, i) => (
            <p key={i} style={{ fontSize: 14, color: '#0f172a', padding: '6px 0' }}>
              • {c.name} {c.since ? `(since ${c.since})` : ''}
            </p>
          ))}
        </div>
      )}

      {/* Emergency Contact */}
      {data.emergency_contact && data.emergency_contact.name && (
        <div style={{
          background: 'white', borderRadius: 16, padding: 20,
          border: '1px solid #e2e8f0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Phone size={20} style={{ color: '#6366f1' }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              EMERGENCY CONTACT
            </span>
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
            {data.emergency_contact.name}
            {data.emergency_contact.relation && ` (${data.emergency_contact.relation})`}
          </p>
          <a
            href={`tel:${data.emergency_contact.phone}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 8, padding: '10px 20px', borderRadius: 12,
              background: '#6366f1', color: 'white',
              fontWeight: 600, fontSize: 14, textDecoration: 'none'
            }}
          >
            📞 Call {data.emergency_contact.phone}
          </a>
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 24, padding: 16 }}>
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          🔒 Patient data accessed via emergency QR code
        </p>
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          Powered by Voice-Driven Clinic
        </p>
      </div>
    </div>
  )
}
