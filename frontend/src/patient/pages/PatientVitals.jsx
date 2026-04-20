import { useState, useEffect } from 'react'
import { Activity, Plus, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { getVitals, logVitals } from '../patientApi'
import VitalsChart from '../components/VitalsChart'

export default function PatientVitals() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLog, setShowLog] = useState(false)
  const [logForm, setLogForm] = useState({
    bp_systolic: '', bp_diastolic: '', blood_sugar_fasting: '',
    weight_kg: '', pulse: '', spo2: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await getVitals(90)
      setData(res)
    } catch (err) {
      console.error('Failed to load vitals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogVitals = async () => {
    setSaving(true)
    try {
      const payload = {}
      if (logForm.bp_systolic) payload.bp_systolic = parseInt(logForm.bp_systolic)
      if (logForm.bp_diastolic) payload.bp_diastolic = parseInt(logForm.bp_diastolic)
      if (logForm.blood_sugar_fasting) payload.blood_sugar_fasting = parseInt(logForm.blood_sugar_fasting)
      if (logForm.weight_kg) payload.weight_kg = parseFloat(logForm.weight_kg)
      if (logForm.pulse) payload.pulse = parseInt(logForm.pulse)
      if (logForm.spo2) payload.spo2 = parseInt(logForm.spo2)

      await logVitals(payload)
      setShowLog(false)
      setLogForm({ bp_systolic: '', bp_diastolic: '', blood_sugar_fasting: '', weight_kg: '', pulse: '', spo2: '' })
      loadData()
    } catch (err) {
      console.error('Failed to log vitals:', err)
    } finally {
      setSaving(false)
    }
  }

  const getTrend = (values) => {
    if (!values || values.length < 2) return 'stable'
    const last = values[values.length - 1]
    const prev = values[values.length - 2]
    if (last < prev) return 'down'
    if (last > prev) return 'up'
    return 'stable'
  }

  const TrendIcon = ({ trend, isGoodDown = true }) => {
    if (trend === 'down') return (
      <span className={`pd-trend ${isGoodDown ? 'pd-trend-down' : 'pd-trend-up'}`}>
        <TrendingDown size={14} /> {isGoodDown ? 'Improving ✅' : 'Declining ⚠️'}
      </span>
    )
    if (trend === 'up') return (
      <span className={`pd-trend ${isGoodDown ? 'pd-trend-up' : 'pd-trend-down'}`}>
        <TrendingUp size={14} /> {isGoodDown ? 'Rising ⚠️' : 'Improving ✅'}
      </span>
    )
    return (
      <span className="pd-trend pd-trend-stable">
        <Minus size={14} /> Stable
      </span>
    )
  }

  if (loading) {
    return (
      <div className="pd-page-content" style={{ paddingTop: 24 }}>
        {[1,2,3].map(i => <div key={i} className="pd-skeleton" style={{ height: 200, marginBottom: 16 }} />)}
      </div>
    )
  }

  const vitals = data?.vitals || []

  // Extract series
  const bpData = vitals.filter(v => v.bp_systolic).map(v => ({
    date: new Date(v.logged_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    systolic: v.bp_systolic,
    diastolic: v.bp_diastolic,
    fullDate: v.logged_at,
  }))

  const sugarData = vitals.filter(v => v.blood_sugar_fasting).map(v => ({
    date: new Date(v.logged_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    value: v.blood_sugar_fasting,
    fullDate: v.logged_at,
  }))

  const weightData = vitals.filter(v => v.weight_kg).map(v => ({
    date: new Date(v.logged_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    value: v.weight_kg,
    fullDate: v.logged_at,
  }))

  const lastBP = bpData.length > 0 ? bpData[bpData.length - 1] : null
  const lastSugar = sugarData.length > 0 ? sugarData[sugarData.length - 1] : null
  const lastWeight = weightData.length > 0 ? weightData[weightData.length - 1] : null

  return (
    <div>
      <div className="pd-header">
        <div className="pd-header-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Activity size={20} />
                <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Vitals Tracker
                </span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Track Your Health
              </h1>
            </div>
            <button
              onClick={() => setShowLog(true)}
              style={{
                padding: '8px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <Plus size={16} /> Log
            </button>
          </div>
        </div>
      </div>

      <div className="pd-page-content" style={{ marginTop: -8, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Blood Pressure Chart */}
        <div className="pd-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Blood Pressure</p>
              {lastBP && (
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Last: {lastBP.systolic}/{lastBP.diastolic} mmHg
                </p>
              )}
            </div>
            <TrendIcon trend={getTrend(bpData.map(d => d.systolic))} isGoodDown={true} />
          </div>
          {bpData.length > 1 ? (
            <VitalsChart
              data={bpData}
              dataKeys={[
                { key: 'systolic', color: '#ef4444', name: 'Systolic' },
                { key: 'diastolic', color: '#3b82f6', name: 'Diastolic' },
              ]}
              targetMin={80}
              targetMax={130}
            />
          ) : (
            <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
              Need at least 2 readings for chart
            </p>
          )}
        </div>

        {/* Blood Sugar Chart */}
        <div className="pd-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Blood Sugar (Fasting)</p>
              {lastSugar && (
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Last: {lastSugar.value} mg/dL · Target: &lt;126 mg/dL
                  {lastSugar.value < 126 ? ' ✅' : ' ⚠️'}
                </p>
              )}
            </div>
            <TrendIcon trend={getTrend(sugarData.map(d => d.value))} isGoodDown={true} />
          </div>
          {sugarData.length > 1 ? (
            <VitalsChart
              data={sugarData}
              dataKeys={[
                { key: 'value', color: '#f59e0b', name: 'Fasting Sugar' },
              ]}
              targetMax={126}
            />
          ) : (
            <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
              Need at least 2 readings for chart
            </p>
          )}
        </div>

        {/* Weight */}
        <div className="pd-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Weight</p>
              {lastWeight && weightData.length > 1 && (
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {weightData[0].value}kg → {lastWeight.value}kg
                  ({(lastWeight.value - weightData[0].value) > 0 ? '+' : ''}{(lastWeight.value - weightData[0].value).toFixed(1)}kg)
                </p>
              )}
            </div>
            <TrendIcon trend={getTrend(weightData.map(d => d.value))} isGoodDown={true} />
          </div>
          {weightData.length > 1 ? (
            <VitalsChart
              data={weightData}
              dataKeys={[
                { key: 'value', color: '#8b5cf6', name: 'Weight (kg)' },
              ]}
            />
          ) : (
            <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: 20 }}>
              Need at least 2 readings for chart
            </p>
          )}
        </div>
      </div>

      {/* Log Vitals Modal */}
      {showLog && (
        <div className="pd-modal-overlay" onClick={() => setShowLog(false)}>
          <div className="pd-modal" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
              📊 Log Today's Vitals
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="pd-label">BP Systolic</label>
                <input
                  type="number"
                  className="pd-input"
                  placeholder="120"
                  value={logForm.bp_systolic}
                  onChange={e => setLogForm({...logForm, bp_systolic: e.target.value})}
                />
              </div>
              <div>
                <label className="pd-label">BP Diastolic</label>
                <input
                  type="number"
                  className="pd-input"
                  placeholder="80"
                  value={logForm.bp_diastolic}
                  onChange={e => setLogForm({...logForm, bp_diastolic: e.target.value})}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="pd-label">Blood Sugar (Fasting) mg/dL</label>
              <input
                type="number"
                className="pd-input"
                placeholder="110"
                value={logForm.blood_sugar_fasting}
                onChange={e => setLogForm({...logForm, blood_sugar_fasting: e.target.value})}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="pd-label">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="pd-input"
                  placeholder="72.5"
                  value={logForm.weight_kg}
                  onChange={e => setLogForm({...logForm, weight_kg: e.target.value})}
                />
              </div>
              <div>
                <label className="pd-label">Pulse (bpm)</label>
                <input
                  type="number"
                  className="pd-input"
                  placeholder="72"
                  value={logForm.pulse}
                  onChange={e => setLogForm({...logForm, pulse: e.target.value})}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="pd-label">SpO2 (%)</label>
              <input
                type="number"
                className="pd-input"
                placeholder="98"
                value={logForm.spo2}
                onChange={e => setLogForm({...logForm, spo2: e.target.value})}
              />
            </div>

            <button
              className="pd-btn pd-btn-primary pd-btn-full"
              onClick={handleLogVitals}
              disabled={saving}
            >
              {saving ? 'Saving...' : '✅ Save Vitals'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
