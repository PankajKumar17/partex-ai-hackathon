import { useState, useEffect } from 'react'
import { Calendar, ChevronDown, ChevronUp, Pill, Activity, Stethoscope } from 'lucide-react'
import { getVisits } from '../patientApi'

export default function PatientVisits() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await getVisits()
      setData(res)
    } catch (err) {
      console.error('Failed to load visits:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '?'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="pd-page-content" style={{ paddingTop: 24 }}>
        {[1,2,3].map(i => <div key={i} className="pd-skeleton" style={{ height: 120, marginBottom: 16 }} />)}
      </div>
    )
  }

  const visits = data?.visits || []

  return (
    <div>
      <div className="pd-header">
        <div className="pd-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Calendar size={20} />
            <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Visit History
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {visits.length} Visit{visits.length !== 1 ? 's' : ''} on Record
          </h1>
        </div>
      </div>

      <div className="pd-page-content" style={{ marginTop: -8 }}>
        {visits.length === 0 ? (
          <div className="pd-card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📋</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>No visits yet</p>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Your visit history will appear here</p>
          </div>
        ) : (
          <div className="pd-timeline">
            {visits.map((visit, i) => {
              const cd = visit.clinical_data
              const isExpanded = expandedId === visit.visit_id
              const meds = cd?.medications || []
              const diagnoses = cd?.differential_diagnosis || cd?.diagnosis || []
              const vitals = cd?.vitals || {}

              return (
                <div key={visit.visit_id} className="pd-timeline-node">
                  <div className={`pd-timeline-dot ${i === 0 ? 'pending' : 'resolved'}`} />
                  
                  <div
                    className="pd-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpandedId(isExpanded ? null : visit.visit_id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#0d9488', marginBottom: 4 }}>
                          {formatDate(visit.date)}
                        </p>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                          {visit.chief_complaint || 'General Checkup'}
                        </p>
                        {visit.language && (
                          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            🗣️ {visit.language}
                          </p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      ) : (
                        <ChevronDown size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      )}
                    </div>

                    {/* Pills summary */}
                    {!isExpanded && meds.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {meds.slice(0, 3).map((m, j) => (
                          <span key={j} className="pd-pill">
                            💊 {m.generic_name || m.name}
                          </span>
                        ))}
                        {meds.length > 3 && (
                          <span className="pd-pill" style={{ background: '#f1f5f9', color: '#64748b' }}>
                            +{meds.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                        {/* Diagnoses */}
                        {diagnoses.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <Stethoscope size={12} style={{ display: 'inline', marginRight: 4 }} />
                              Diagnosis
                            </p>
                            {diagnoses.map((d, k) => (
                              <div key={k} style={{
                                padding: '8px 12px', borderRadius: 8,
                                background: '#f8fafc', marginBottom: 6,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                              }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{d.name}</span>
                                {d.probability && (
                                  <span style={{ fontSize: 11, color: '#64748b' }}>{d.probability}%</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Vitals */}
                        {Object.keys(vitals).length > 0 && !(Object.keys(vitals).length === 1 && 'flagged' in vitals) && (
                          <div style={{ marginBottom: 16 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <Activity size={12} style={{ display: 'inline', marginRight: 4 }} />
                              Vitals Recorded
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {vitals.BP && (
                                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f0fdf4' }}>
                                  <p style={{ fontSize: 10, color: '#94a3b8' }}>Blood Pressure</p>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{vitals.BP}</p>
                                </div>
                              )}
                              {vitals.pulse && (
                                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#eff6ff' }}>
                                  <p style={{ fontSize: 10, color: '#94a3b8' }}>Pulse</p>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{vitals.pulse} bpm</p>
                                </div>
                              )}
                              {vitals.temp && (
                                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fffbeb' }}>
                                  <p style={{ fontSize: 10, color: '#94a3b8' }}>Temperature</p>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{vitals.temp}</p>
                                </div>
                              )}
                              {vitals.weight && (
                                <div style={{ padding: '8px 12px', borderRadius: 8, background: '#faf5ff' }}>
                                  <p style={{ fontSize: 10, color: '#94a3b8' }}>Weight</p>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{vitals.weight}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Medications */}
                        {meds.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <Pill size={12} style={{ display: 'inline', marginRight: 4 }} />
                              Medications Prescribed
                            </p>
                            {meds.map((m, j) => (
                              <div key={j} style={{
                                padding: '8px 0',
                                borderBottom: j < meds.length - 1 ? '1px solid #f1f5f9' : 'none'
                              }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                                  💊 {m.generic_name || m.name}
                                </p>
                                <p style={{ fontSize: 11, color: '#64748b' }}>
                                  {m.dose} · {m.frequency} · {m.duration}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
