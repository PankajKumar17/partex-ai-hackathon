import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Pill, Calendar, AlertTriangle, ChevronRight, Heart, LogOut } from 'lucide-react'
import { getOverview, getSession, clearSession } from '../patientApi'

export default function PatientHome() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const session = getSession()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res = await getOverview()
      setData(res)
    } catch (err) {
      console.error('Failed to load overview:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    navigate('/pd/login', { replace: true })
  }

  if (loading) {
    return (
      <div>
        <div className="pd-header">
          <div className="pd-header-content">
            <div className="pd-skeleton" style={{ width: 200, height: 28, marginBottom: 8 }} />
            <div className="pd-skeleton" style={{ width: 140, height: 16 }} />
          </div>
        </div>
        <div className="pd-page-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1,2,3,4].map(i => <div key={i} className="pd-skeleton" style={{ height: 100 }} />)}
        </div>
      </div>
    )
  }

  const patient = data?.patient || {}
  const riskLevel = data?.risk_level || 'LOW'
  const riskConfig = {
    HIGH: { color: '#ef4444', bg: '#fef2f2', emoji: '🔴', label: 'HIGH RISK' },
    MODERATE: { color: '#f59e0b', bg: '#fffbeb', emoji: '🟡', label: 'MODERATE' },
    LOW: { color: '#10b981', bg: '#f0fdf4', emoji: '🟢', label: 'LOW RISK' },
  }
  const risk = riskConfig[riskLevel] || riskConfig.LOW

  return (
    <div>
      {/* Header */}
      <div className="pd-header">
        <div className="pd-header-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 4 }}>👋 Namaste,</p>
              <h1 style={{
                fontSize: 26, fontWeight: 800,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                marginBottom: 4
              }}>
                {patient.name || session?.name || 'Patient'}!
              </h1>
              <p style={{ fontSize: 13, opacity: 0.7 }}>
                Patient ID: {patient.patient_id || session?.patient_code}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {data?.alerts_count > 0 && (
                <div style={{
                  padding: '6px 12px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  🔔 {data.alerts_count}
                </div>
              )}
              <button
                onClick={handleLogout}
                style={{
                  padding: 8, borderRadius: 10,
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none', cursor: 'pointer', color: 'white'
                }}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pd-page-content" style={{ marginTop: -16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Risk Level + Appointment Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="pd-card" style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Risk Level
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{risk.emoji}</span>
              <span style={{ 
                fontSize: 14, fontWeight: 700, color: risk.color
              }}>
                {risk.label}
              </span>
            </div>
          </div>

          <div className="pd-card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => navigate('/pd/visits')}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Next Appointment
            </p>
            {data?.next_appointment ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} style={{ color: '#6366f1' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                  {new Date(data.next_appointment).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#94a3b8' }}>None scheduled</p>
            )}
          </div>
        </div>

        {/* Active Medications */}
        <div
          className="pd-card pd-card-accent"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/pd/medications')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pill size={18} style={{ color: '#0d9488' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                Active Medications ({data?.active_medications?.length || 0})
              </span>
            </div>
            <ChevronRight size={18} style={{ color: '#94a3b8' }} />
          </div>
          {(data?.active_medications || []).slice(0, 3).map((med, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0',
              borderTop: i > 0 ? '1px solid #f1f5f9' : 'none'
            }}>
              <span style={{ fontSize: 16 }}>💊</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                  {med.generic_name || med.name || 'Unknown'}
                </p>
                <p style={{ fontSize: 11, color: '#64748b' }}>
                  {med.dose || ''} {med.frequency ? `· ${med.frequency}` : ''} {med.duration ? `· ${med.duration}` : ''}
                </p>
              </div>
            </div>
          ))}
          {(!data?.active_medications || data.active_medications.length === 0) && (
            <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '8px 0' }}>
              No active medications
            </p>
          )}
        </div>

        {/* Last Visit */}
        {data?.last_visit && (
          <div
            className="pd-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/pd/visits')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Last Visit
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                  {data.last_visit.chief_complaint || 'Checkup'}
                </p>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {data.last_visit.date
                    ? new Date(data.last_visit.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Unknown date'}
                </p>
              </div>
              <ChevronRight size={18} style={{ color: '#94a3b8' }} />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            className="pd-btn pd-btn-ghost pd-btn-full"
            onClick={() => navigate('/pd/vitals')}
            style={{ padding: '16px 12px', flexDirection: 'column', gap: 8 }}
          >
            <Activity size={22} />
            <span style={{ fontSize: 12 }}>Log Vitals</span>
          </button>
          <button
            className="pd-btn pd-btn-ghost pd-btn-full"
            onClick={() => navigate('/pd/passport')}
            style={{ padding: '16px 12px', flexDirection: 'column', gap: 8 }}
          >
            <Heart size={22} />
            <span style={{ fontSize: 12 }}>Health Passport</span>
          </button>
        </div>

        {/* Health Summary Stats */}
        <div className="pd-card" style={{ padding: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            At a Glance
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0d9488' }}>{data?.total_visits || 0}</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>Total Visits</p>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{data?.active_medications?.length || 0}</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>Active Meds</p>
            </div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{data?.alerts_count || 0}</p>
              <p style={{ fontSize: 11, color: '#94a3b8' }}>Reminders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
