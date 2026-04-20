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
      {/* Symptoms */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Extracted Symptoms
          <span className="text-xs text-slate-500 ml-2">({symptoms.length})</span>
        </h3>
        {symptoms.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No symptoms extracted yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {symptoms.map((s, idx) => {
              const isLowConf = (s.confidence || 0) < 0.6
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    isLowConf
                      ? 'border-red-500/40 bg-red-500/5 animate-pulse'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-medium text-slate-900 text-sm">{s.name}</span>
                      {s.body_part && (
                        <span className="text-xs text-slate-500 ml-2">({s.body_part})</span>
                      )}
                    </div>
                    {s.severity && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        s.severity === 'severe' ? 'bg-red-500/20 text-red-400' :
                        s.severity === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-green-500/20 text-green-400'
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
                    <span className="text-[10px] text-gray-600 mt-1 inline-block">
                      Source: {s.language_source}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Vitals */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Vitals</h3>
          {isFlagged && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              Abnormal
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(vitalRanges).map(([key, info]) => {
            const value = vitals[key]
            if (!value) return null
            return (
              <div
                key={key}
                className={`p-3 rounded-xl border ${
                  isFlagged ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-200 bg-slate-50'
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
            <p className="text-slate-500 text-sm col-span-full text-center py-2">No vitals captured</p>
          )}
        </div>
      </div>
    </div>
  )
}
