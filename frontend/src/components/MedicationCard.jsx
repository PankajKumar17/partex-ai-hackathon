import { useState } from 'react'
import { AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react'

export default function MedicationCard({ medications = [], drugInteractions = [], dosageWarnings = [] }) {
  const [showBrands, setShowBrands] = useState(true)

  if (medications.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Medications</h3>
        <p className="text-slate-500 text-sm text-center py-4">No medications captured</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Medications</h3>
        <button
          onClick={() => setShowBrands(!showBrands)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          {showBrands ? (
            <ToggleRight className="w-5 h-5 text-primary" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-slate-500" />
          )}
          {showBrands ? 'Brand Names' : 'Generic Only'}
        </button>
      </div>

      {/* Drug Interactions Warning */}
      {drugInteractions.length > 0 && (
        <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">Drug Interaction Warnings</span>
          </div>
          {drugInteractions.map((di, idx) => (
            <p key={idx} className="text-xs text-red-300 ml-6 mb-1">
              <span className="font-semibold">{di.severity?.toUpperCase()}:</span>{' '}
              {di.drug1} + {di.drug2} — {di.description}
            </p>
          ))}
        </div>
      )}

      {/* Dosage Warnings */}
      {dosageWarnings.length > 0 && (
        <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
          {dosageWarnings.map((w, idx) => (
            <p key={idx} className="text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}

      {/* Medication List */}
      <div className="space-y-3">
        {medications.map((med, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl border ${
              med.interaction_warning
                ? 'border-red-500/30 bg-red-500/5'
                : med.max_daily_dose_exceeded
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-semibold text-slate-900 text-sm">
                  {med.generic_name}
                </span>
                {showBrands && med.brand_names && med.brand_names.length > 0 && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    ({med.brand_names.join(', ')})
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                {!med.safe_for_age && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                    Age ⚠️
                  </span>
                )}
                {med.max_daily_dose_exceeded && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                    Dose ⚠️
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white/60 p-2 rounded-lg text-center">
                <p className="text-slate-500 mb-0.5">Dose</p>
                <p className="text-slate-900 font-medium">{med.dose || '-'}</p>
              </div>
              <div className="bg-white/60 p-2 rounded-lg text-center">
                <p className="text-slate-500 mb-0.5">Freq</p>
                <p className="text-slate-900 font-medium">{med.frequency || '-'}</p>
              </div>
              <div className="bg-white/60 p-2 rounded-lg text-center">
                <p className="text-slate-500 mb-0.5">Duration</p>
                <p className="text-slate-900 font-medium">{med.duration || '-'}</p>
              </div>
            </div>

            {med.interaction_warning && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {med.interaction_warning}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
