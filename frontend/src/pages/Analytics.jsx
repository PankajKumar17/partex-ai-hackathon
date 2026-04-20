import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldAlert, TrendingUp, Users, Loader2 } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

export default function Analytics() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [summary, setSummary] = useState(null)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(true)

  useEffect(() => {
    fetchAlerts()
    fetchSummary()
  }, [])

  const fetchAlerts = async () => {
    setLoadingAlerts(true)
    try {
      const res = await axios.get(`${API}/api/analytics/epidemic-alert`)
      setAlerts(res.data.alerts || [])
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
    } finally {
      setLoadingAlerts(false)
    }
  }

  const fetchSummary = async () => {
    setLoadingSummary(true)
    try {
      const res = await axios.get(`${API}/api/analytics/summary`)
      setSummary(res.data)
    } catch (err) {
      console.error('Failed to fetch summary:', err)
    } finally {
      setLoadingSummary(false)
    }
  }

  const alertTypeColors = {
    outbreak: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '🚨', text: 'text-red-400' },
    cluster: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '⚠️', text: 'text-amber-400' },
    seasonal: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '📊', text: 'text-blue-400' },
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Epidemic Alerts</h1>
          <p className="text-sm text-slate-500">Population-level health monitoring</p>
        </div>
      </header>

      {/* Summary Stats */}
      {loadingSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-24" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-light" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.total_patients}</p>
              <p className="text-xs text-slate-500">Total Patients</p>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.visits_last_30_days}</p>
              <p className="text-xs text-slate-500">Visits (30 days)</p>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.risk_distribution?.HIGH || 0}</p>
              <p className="text-xs text-slate-500">High Risk</p>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.risk_distribution?.MODERATE || 0}</p>
              <p className="text-xs text-slate-500">Moderate Risk</p>
            </div>
          </div>
        </div>
      )}

      {/* Risk Distribution Bar */}
      {summary && (
        <div className="glass-card p-5 mb-8">
          <h3 className="text-sm font-semibold text-slate-600 mb-4">Risk Distribution</h3>
          <div className="flex h-8 rounded-full overflow-hidden">
            {[
              { key: 'HIGH', color: 'bg-red-500', count: summary.risk_distribution?.HIGH || 0 },
              { key: 'MODERATE', color: 'bg-amber-500', count: summary.risk_distribution?.MODERATE || 0 },
              { key: 'LOW', color: 'bg-green-500', count: summary.risk_distribution?.LOW || 0 },
            ].map(item => {
              const total = summary.total_patients || 1
              const pct = ((item.count / total) * 100).toFixed(0)
              if (item.count === 0) return null
              return (
                <div
                  key={item.key}
                  className={`${item.color} flex items-center justify-center text-xs font-bold text-slate-900 transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                >
                  {parseInt(pct) > 10 && `${item.key} ${pct}%`}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Daily Visit Chart (simple bar representation) */}
      {summary?.daily_visit_counts && Object.keys(summary.daily_visit_counts).length > 0 && (
        <div className="glass-card p-5 mb-8">
          <h3 className="text-sm font-semibold text-slate-600 mb-4">Daily Visits (Last 7 Days)</h3>
          <div className="flex items-end gap-2 h-32">
            {Object.entries(summary.daily_visit_counts)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-7)
              .map(([date, count]) => {
                const maxCount = Math.max(...Object.values(summary.daily_visit_counts), 1)
                const height = (count / maxCount) * 100
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500">{count}</span>
                    <div
                      className="w-full bg-gradient-to-t from-primary to-primary-light rounded-t-lg transition-all duration-700"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-[10px] text-slate-500 -rotate-45 origin-top-left">
                      {date.slice(5)}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Epidemic Alerts */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Epidemic Alerts</h3>
        {loadingAlerts ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="skeleton h-24" />)}
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-slate-500">No epidemic alerts at this time</p>
            <p className="text-xs text-gray-600 mt-1">System monitors symptom patterns across all patients</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, idx) => {
              const style = alertTypeColors[alert.alert_type] || alertTypeColors.cluster
              return (
                <div key={idx} className={`p-5 rounded-xl border ${style.bg} ${style.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{style.icon}</span>
                      <span className={`font-semibold ${style.text}`}>
                        {alert.alert_type?.toUpperCase()}: {alert.disease}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Confidence: {Math.round((alert.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{alert.evidence}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Affected: {alert.affected_count || '?'} patients
                    </span>
                    <span className="text-xs text-slate-500">
                      💡 {alert.recommendation}
                    </span>
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
