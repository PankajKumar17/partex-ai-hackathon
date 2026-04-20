import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ShieldAlert, TrendingUp, Users } from 'lucide-react'
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

  const metricCards = useMemo(() => {
    if (!summary) return []

    return [
      {
        label: 'Total patients',
        value: summary.total_patients || 0,
        icon: Users,
        accent: 'bg-cyan-100 text-cyan-700',
      },
      {
        label: 'Visits in 30 days',
        value: summary.visits_last_30_days || 0,
        icon: TrendingUp,
        accent: 'bg-emerald-100 text-emerald-700',
      },
      {
        label: 'High risk patients',
        value: summary.risk_distribution?.HIGH || 0,
        icon: ShieldAlert,
        accent: 'bg-rose-100 text-rose-700',
      },
      {
        label: 'Moderate risk patients',
        value: summary.risk_distribution?.MODERATE || 0,
        icon: AlertTriangle,
        accent: 'bg-amber-100 text-amber-700',
      },
    ]
  }, [summary])

  const riskSegments = useMemo(() => {
    if (!summary?.risk_distribution) return []

    const total = summary.total_patients || 1
    return [
      { key: 'HIGH', label: 'High', count: summary.risk_distribution.HIGH || 0, color: 'bg-rose-500' },
      { key: 'MODERATE', label: 'Moderate', count: summary.risk_distribution.MODERATE || 0, color: 'bg-amber-400' },
      { key: 'LOW', label: 'Low', count: summary.risk_distribution.LOW || 0, color: 'bg-emerald-500' },
    ]
      .filter((item) => item.count > 0)
      .map((item) => ({ ...item, pct: Math.max((item.count / total) * 100, 4) }))
  }, [summary])

  const dailyVisits = useMemo(() => {
    if (!summary?.daily_visit_counts) return []

    return Object.entries(summary.daily_visit_counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
  }, [summary])

  const alertTypeStyles = {
    outbreak: {
      surface: 'bg-rose-50 border-rose-200',
      badge: 'bg-rose-100 text-rose-700',
      label: 'Outbreak signal',
    },
    cluster: {
      surface: 'bg-amber-50 border-amber-200',
      badge: 'bg-amber-100 text-amber-700',
      label: 'Cluster detected',
    },
    seasonal: {
      surface: 'bg-sky-50 border-sky-200',
      badge: 'bg-sky-100 text-sky-700',
      label: 'Seasonal trend',
    },
  }

  return (
    <div className="min-h-screen">
      <div className="app-shell space-y-6 md:space-y-8">
        <section className="glass-card p-6 sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to dashboard
                </button>

                <div className="space-y-3">
                  <span className="section-kicker border-slate-200 bg-slate-100 text-slate-700 shadow-none">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Analytics
                  </span>
                  <h1 className="section-title text-3xl text-slate-950 sm:text-4xl">
                    Population health, made readable.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600">
                    Track patient volume, risk distribution, and outbreak signals across the clinic in one clean analytics view.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Alert queue</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{alerts.length}</p>
                  <p className="mt-1 text-sm text-slate-500">Active public health flags</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Coverage</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{summary?.total_patients || 0}</p>
                  <p className="mt-1 text-sm text-slate-500">Patients in analytics</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loadingSummary ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton h-32 rounded-[24px]" />
            ))}
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.label} className="glass-card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className={`rounded-2xl p-3 ${card.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-semibold text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm text-slate-500">{card.label}</p>
                </div>
              )
            })}
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-card p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Risk Mix</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Distribution by clinical severity</h2>
            </div>

            {summary ? (
              <>
                <div className="overflow-hidden rounded-full bg-slate-100">
                  <div className="flex h-10">
                    {riskSegments.map((segment) => (
                      <div
                        key={segment.key}
                        className={`${segment.color} flex items-center justify-center px-3 text-xs font-semibold text-white`}
                        style={{ width: `${segment.pct}%` }}
                      >
                        {segment.pct >= 14 ? `${segment.label} ${Math.round(segment.pct)}%` : segment.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {riskSegments.map((segment) => (
                    <div key={segment.key} className="rounded-[20px] bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{segment.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{segment.count}</p>
                      <p className="mt-1 text-sm text-slate-500">{Math.round(segment.pct)}% of active population</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Summary data is not available yet.
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Recent Volume</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Daily visits in the last week</h2>
            </div>

            {dailyVisits.length > 0 ? (
              <div className="grid h-72 grid-cols-7 items-end gap-3">
                {dailyVisits.map(([date, count]) => {
                  const maxCount = Math.max(...dailyVisits.map(([, value]) => value), 1)
                  const height = Math.max((count / maxCount) * 100, 8)

                  return (
                    <div key={date} className="flex h-full flex-col justify-end gap-3">
                      <span className="text-center text-xs font-medium text-slate-500">{count}</span>
                      <div className="relative flex-1 rounded-[24px] bg-slate-100 p-2">
                        <div
                          className="absolute inset-x-2 bottom-2 rounded-[18px] bg-slate-900"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-center text-[11px] font-medium text-slate-500">{date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No daily visit trend is available yet.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Alerts</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Epidemic and outbreak watchlist</h2>
            </div>
            <p className="max-w-2xl text-sm text-slate-500">
              These alerts are generated from symptom patterns across visits and can help the clinic react earlier to local spikes.
            </p>
          </div>

          {loadingAlerts ? (
            <div className="grid gap-3">
              {[1, 2].map((item) => (
                <div key={item} className="skeleton h-36 rounded-[24px]" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-950">No epidemic alerts right now</h3>
              <p className="mt-3 text-sm text-slate-500">
                The system is monitoring symptom clusters across the clinic and will surface alerts here when confidence rises.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {alerts.map((alert, index) => {
                const style = alertTypeStyles[alert.alert_type] || alertTypeStyles.cluster
                return (
                  <article
                    key={`${alert.disease}-${index}`}
                    className={`glass-card border ${style.surface} p-6`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${style.badge}`}>
                          {style.label}
                        </span>
                        <div>
                          <h3 className="text-2xl font-semibold text-slate-950">{alert.disease}</h3>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{alert.evidence}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:min-w-64 sm:grid-cols-2 lg:grid-cols-1">
                        <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Confidence</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{Math.round((alert.confidence || 0) * 100)}%</p>
                        </div>
                        <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Affected patients</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-950">{alert.affected_count || '?'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="soft-divider my-5" />

                    <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-700">
                      <span className="mr-2 font-semibold text-slate-950">Recommended action:</span>
                      {alert.recommendation}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
