import ConfidenceBar from './ConfidenceBar'
import { AlertTriangle, Activity } from 'lucide-react'

const vitalRanges = {
  BP:     { label: 'Blood Pressure', normal: '90/60–120/80', unit: 'mmHg' },
  temp:   { label: 'Temperature',    normal: '97.0–99.0',    unit: '°F'   },
  pulse:  { label: 'Pulse',          normal: '60–100',       unit: 'bpm'  },
  SpO2:   { label: 'SpO₂',          normal: '95–100',       unit: '%'    },
  weight: { label: 'Weight',         normal: '—',            unit: 'kg'   },
}

const severityConfig = {
  severe:   { bg: 'bg-rose-100',   text: 'text-rose-700',   dot: 'bg-rose-500'   },
  moderate: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  mild:     { bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500' },
}

export default function ClinicalCard({ symptoms = [], vitals = {} }) {
  const isFlagged = vitals.flagged
  const hasVitals = Object.keys(vitalRanges).some(k => vitals[k])

  return (
    <div className="space-y-4">

      {/* ── Symptoms ── */}
      <div className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Symptoms</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">Extracted complaints</h3>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {symptoms.length} captured
          </span>
        </div>

        {symptoms.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No symptoms extracted yet</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {symptoms.map((s, idx) => {
              const conf = s.confidence ?? 1
              const isLowConf = conf < 0.6
              const sev = (s.severity || '').toLowerCase()
              const sevStyle = severityConfig[sev] || severityConfig.mild

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3.5 transition-all ${
                    isLowConf
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Top row: name + severity badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-slate-900 truncate">{s.name}</span>
                      {s.body_part && (
                        <span className="shrink-0 text-[11px] text-slate-400 font-normal">({s.body_part})</span>
                      )}
                    </div>
                    {sev && (
                      <span className={`shrink-0 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${sevStyle.bg} ${sevStyle.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sevStyle.dot}`} />
                        {sev}
                      </span>
                    )}
                  </div>

                  {/* Duration */}
                  {s.duration && (
                    <p className="text-xs text-slate-500 mb-2">⏱ {s.duration}</p>
                  )}

                  {/* Confidence bar */}
                  <ConfidenceBar value={conf} />

                  {/* Source language */}
                  {s.language_source && (
                    <span className="mt-1.5 inline-block text-[10px] text-slate-400">
                      Source: {s.language_source}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Vitals ── */}
      <div className="glass-card p-5">
        <div className="mb-4 flex items-center gap-2 justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Vitals</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">Captured measurements</h3>
          </div>
          {isFlagged && (
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <AlertTriangle className="w-3 h-3" /> Abnormal
            </span>
          )}
        </div>

        {!hasVitals ? (
          <p className="py-4 text-center text-sm text-slate-400">No vitals captured</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {Object.entries(vitalRanges).map(([key, info]) => {
              const value = vitals[key]
              if (!value) return null
              return (
                <div
                  key={key}
                  className={`rounded-xl border px-3 py-3 ${
                    isFlagged ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{info.label}</p>
                  <p className="text-lg font-bold text-slate-900 leading-tight">
                    {value}
                    <span className="text-[11px] font-medium text-slate-400 ml-1">{info.unit}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Normal: {info.normal}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
