import { useState, useEffect } from 'react'
import { Pill, Clock, Check, RefreshCw, Search } from 'lucide-react'
import { getMedications, logMedication, requestRefill } from '../patientApi'

export default function PatientMedications() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [showRefill, setShowRefill] = useState(null)
  const [refillNote, setRefillNote] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await getMedications()
      setData(res)
    } catch (err) {
      console.error('Failed to load medications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkTaken = async (medName) => {
    try {
      await logMedication({
        medication_name: medName,
        scheduled_at: new Date().toISOString(),
        status: 'taken'
      })
      loadData()
    } catch (err) {
      console.error('Failed to log medication:', err)
    }
  }

  const handleRefill = async () => {
    if (!showRefill) return
    try {
      await requestRefill({
        medication_name: showRefill,
        notes: refillNote
      })
      setShowRefill(null)
      setRefillNote('')
      alert('Refill request sent to your doctor!')
    } catch (err) {
      console.error('Refill request failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="pd-page-content" style={{ paddingTop: 24 }}>
        {[1,2,3].map(i => <div key={i} className="pd-skeleton" style={{ height: 120, marginBottom: 16 }} />)}
      </div>
    )
  }

  const allMeds = data?.medications || []

  // Deduplicate by generic_name, keep most recent
  const seen = new Set()
  const uniqueMeds = allMeds.filter(m => {
    const key = m.generic_name || m.name
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const activeMeds = uniqueMeds.slice(0, 10)
  const allHistory = allMeds.filter(m =>
    !searchTerm || (m.generic_name || m.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="pd-header">
        <div className="pd-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Pill size={20} />
            <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Medications
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {uniqueMeds.length} Medication{uniqueMeds.length !== 1 ? 's' : ''}
          </h1>
        </div>
      </div>

      <div className="pd-page-content" style={{ marginTop: -8, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Tabs */}
        <div className="pd-tabs">
          <button className={`pd-tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
            Active ({activeMeds.length})
          </button>
          <button className={`pd-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            History ({allMeds.length})
          </button>
        </div>

        {tab === 'active' ? (
          <>
            {activeMeds.length === 0 ? (
              <div className="pd-card" style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>💊</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>No active medications</p>
              </div>
            ) : (
              activeMeds.map((med, i) => (
                <div key={i} className="pd-card pd-card-accent" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                      💊 {med.generic_name || med.name}
                    </p>
                    {med.brand_names?.length > 0 && (
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        Brands: {med.brand_names.join(', ')}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: '#f8fafc' }}>
                      <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>Dose</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{med.dose || 'N/A'}</p>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: '#f8fafc' }}>
                      <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>Frequency</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{med.frequency || 'N/A'}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Clock size={12} style={{ color: '#64748b' }} />
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Duration: {med.duration || 'Ongoing'}
                    </span>
                  </div>

                  {med.prescribed_date && (
                    <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
                      Prescribed: {new Date(med.prescribed_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {med.visit_complaint && ` · ${med.visit_complaint}`}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="pd-btn pd-btn-primary pd-btn-sm"
                      onClick={() => handleMarkTaken(med.generic_name || med.name)}
                      style={{ flex: 1 }}
                    >
                      <Check size={14} />
                      Mark as Taken
                    </button>
                    <button
                      className="pd-btn pd-btn-outline pd-btn-sm"
                      onClick={() => setShowRefill(med.generic_name || med.name)}
                      style={{ flex: 1 }}
                    >
                      <RefreshCw size={14} />
                      Refill
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8'
              }} />
              <input
                type="text"
                className="pd-input"
                placeholder="Search past medications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 40 }}
              />
            </div>

            {allHistory.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 20 }}>
                No medications found
              </p>
            ) : (
              allHistory.map((med, i) => (
                <div key={i} className="pd-card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                        💊 {med.generic_name || med.name}
                      </p>
                      <p style={{ fontSize: 12, color: '#64748b' }}>
                        {med.dose} · {med.frequency} · {med.duration}
                      </p>
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8' }}>
                      {med.prescribed_date
                        ? new Date(med.prescribed_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
                        : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Refill Modal */}
      {showRefill && (
        <div className="pd-modal-overlay" onClick={() => setShowRefill(null)}>
          <div className="pd-modal" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              Request Refill
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              💊 {showRefill}
            </p>
            <label className="pd-label">Notes for your doctor (optional)</label>
            <textarea
              className="pd-input"
              rows={3}
              value={refillNote}
              onChange={(e) => setRefillNote(e.target.value)}
              placeholder="e.g., Running low, need refill by next week"
              style={{ resize: 'none', marginBottom: 16 }}
            />
            <button className="pd-btn pd-btn-primary pd-btn-full" onClick={handleRefill}>
              Send Refill Request
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
