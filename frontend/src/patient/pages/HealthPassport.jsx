import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Heart, Pill, Phone, Share2, QrCode, Download } from 'lucide-react'
import { getHealthPassport, generateQRToken } from '../patientApi'
import QRCodeCard from '../components/QRCodeCard'

export default function HealthPassport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [qrToken, setQrToken] = useState(null)
  const [generatingQR, setGeneratingQR] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await getHealthPassport()
      setData(res)
      if (res.qr_token) setQrToken(res.qr_token)
    } catch (err) {
      console.error('Failed to load passport:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQR = async () => {
    setGeneratingQR(true)
    try {
      const res = await generateQRToken()
      setQrToken(res)
      setShowQR(true)
    } catch (err) {
      console.error('QR generation failed:', err)
    } finally {
      setGeneratingQR(false)
    }
  }

  const severityColor = (severity) => {
    switch (severity) {
      case 'severe': return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', emoji: '🔴' }
      case 'moderate': return { bg: '#fffbeb', color: '#d97706', border: '#fde68a', emoji: '🟡' }
      default: return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', emoji: '🟢' }
    }
  }

  if (loading) {
    return (
      <div className="pd-page-content" style={{ paddingTop: 24 }}>
        {[1,2,3,4].map(i => <div key={i} className="pd-skeleton" style={{ height: 100, marginBottom: 16 }} />)}
      </div>
    )
  }

  const patient = data?.patient || {}

  return (
    <div>
      {/* Header */}
      <div className="pd-header" style={{ paddingBottom: 24 }}>
        <div className="pd-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Shield size={20} />
            <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Health Passport
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 4 }}>
            {patient.name}
          </h1>
          <p style={{ fontSize: 14, opacity: 0.8 }}>
            {patient.age}y · {patient.gender} · {data?.blood_type || '?'}
          </p>
        </div>
      </div>

      <div className="pd-page-content" style={{ marginTop: -8, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Allergies */}
        <div className="pd-card pd-card-danger">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>ALLERGIES</span>
          </div>
          {(data?.allergies || []).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.allergies.map((a, i) => {
                const sc = severityColor(a.severity)
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10,
                    background: sc.bg, border: `1px solid ${sc.border}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{sc.emoji}</span>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{a.name}</p>
                        <p style={{ fontSize: 11, color: '#64748b' }}>{a.reaction}</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: sc.color,
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                      {a.severity}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>No known allergies</p>
          )}
        </div>

        {/* Chronic Conditions */}
        <div className="pd-card pd-card-warning">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Heart size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>CHRONIC CONDITIONS</span>
          </div>
          {(data?.chronic_conditions || []).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.chronic_conditions.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: 10,
                  background: '#fffbeb', border: '1px solid #fde68a'
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>💉 {c.name}</p>
                    <p style={{ fontSize: 11, color: '#64748b' }}>Since {c.since}</p>
                  </div>
                  <span className="pd-pill" style={{
                    background: c.status === 'managed' ? '#f0fdf4' : '#fef2f2',
                    color: c.status === 'managed' ? '#16a34a' : '#dc2626',
                    fontSize: 10, fontWeight: 600
                  }}>
                    {c.status || 'active'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>No chronic conditions recorded</p>
          )}
        </div>

        {/* Current Medications */}
        <div className="pd-card pd-card-accent">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Pill size={18} style={{ color: '#0d9488' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>CURRENT MEDICATIONS</span>
          </div>
          {(data?.current_medications || []).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.current_medications.slice(0, 6).map((m, i) => (
                <div key={i} style={{
                  padding: '8px 0',
                  borderBottom: i < data.current_medications.length - 1 ? '1px solid #f1f5f9' : 'none'
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                    💊 {m.generic_name || m.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b' }}>
                    {m.dose} — {m.frequency}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>No current medications</p>
          )}
        </div>

        {/* Emergency Contact */}
        {data?.emergency_contact && data.emergency_contact.name && (
          <div className="pd-card" style={{ background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Phone size={18} style={{ color: '#6366f1' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>EMERGENCY CONTACT</span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
              {data.emergency_contact.name}
              {data.emergency_contact.relation && (
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                  {' '}({data.emergency_contact.relation})
                </span>
              )}
            </p>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              📞 {data.emergency_contact.phone}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="pd-btn pd-btn-outline pd-btn-full"
            onClick={handleGenerateQR}
            disabled={generatingQR}
          >
            <QrCode size={18} />
            {generatingQR ? 'Generating...' : '🔗 Generate QR Code for ER use'}
          </button>
        </div>

        {/* QR Code Display */}
        {(showQR || qrToken) && qrToken && (
          <QRCodeCard token={qrToken.token || qrToken} expiresAt={qrToken.expires_at} />
        )}
      </div>
    </div>
  )
}
