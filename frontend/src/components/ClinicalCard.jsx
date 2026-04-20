import ConfidenceBar from './ConfidenceBar'
import { AlertTriangle } from 'lucide-react'

const vitalRanges = {
  BP: { label: 'Blood Pressure', normal: '90/60 - 120/80', unit: 'mmHg' },
  temp: { label: 'Temperature', normal: '97.0 - 99.0', unit: '°F' },
  pulse: { label: 'Pulse', normal: '60 - 100', unit: 'bpm' },
  SpO2: { label: 'SpO2', normal: '95 - 100', unit: '%' },
  weight: { label: 'Weight', normal: '-', unit: 'kg' },
}

export default function ClinicalCard({ symptoms = [], vitals = {} }) {
  const isFlagged = vitals.flagged

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Symptoms</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Extracted complaints</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {symptoms.length} captured
          </span>
        </div>
        {symptoms.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No symptoms extracted yet</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {symptoms.map((s, idx) => {
              const isLowConf = (s.confidence || 0) < 0.6
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    isLowConf
                      ? 'border-rose-300 bg-rose-50'
                      : 'border-slate-200 bg-slate-50/90'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-slate-900">{s.name}</span>
                      {s.body_part && (
                        <span className="text-xs text-slate-500 ml-2">({s.body_part})</span>
                      )}
                    </div>
                    {s.severity && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-[0.18em] ${
                        s.severity === 'severe' ? 'bg-rose-100 text-rose-700' :
                        s.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {s.severity}
                      </span>
                    )}
                  </div>
                  {s.duration && (
                    <p className="text-xs text-slate-500 mb-2">Duration: {s.duration}</p>
                  )}
                  <ConfidenceBar value={s.confidence || 0} />
                  {s.language_source && (
                    <span className="mt-1 inline-block text-[10px] text-slate-500">
                      Source: {s.language_source}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Vitals</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Captured measurements</h3>
          </div>
          {isFlagged && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <AlertTriangle className="w-3 h-3" />
              Abnormal
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Object.entries(vitalRanges).map(([key, info]) => {
            const value = vitals[key]
            if (!value) return null
            return (
              <div
                key={key}
                className={`p-3 rounded-xl border ${
                  isFlagged ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200 bg-slate-50/90'
                }`}
              >
                <p className="text-xs text-slate-500 mb-1">{info.label}</p>
                <p className="text-lg font-semibold text-slate-900">
                  {value}
                  <span className="text-xs text-slate-500 ml-1">{info.unit}</span>
                </p>
                <p className="text-[10px] text-gray-600">Normal: {info.normal}</p>
              </div>
            )
          })}
          {Object.entries(vitalRanges).every(([key]) => !vitals[key]) && (
            <p className="col-span-full py-2 text-center text-sm text-slate-500">No vitals captured</p>
          )}
        </div>
      </div>
    </div>
  )
}
