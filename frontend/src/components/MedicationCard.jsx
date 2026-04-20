import { useState } from 'react'
import { AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react'

export default function MedicationCard({ medications = [], drugInteractions = [], dosageWarnings = [] }) {
  const [showBrands, setShowBrands] = useState(true)

  if (medications.length === 0) {
    return (
      <div className="glass-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Medication Safety</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Medication plan</h3>
        <p className="py-8 text-center text-sm text-slate-500">No medications captured yet</p>
      </div>
    )
  }

  return (
    <div className="glass-card space-y-5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Medication Safety</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Medication plan</h2>
        </div>
        <button
          onClick={() => setShowBrands(!showBrands)}
          className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200 hover:text-slate-900"
        >
          {showBrands ? (
            <ToggleRight className="w-4 h-4 text-blue-500" />
          ) : (
            <ToggleLeft className="w-4 h-4 text-slate-400" />
          )}
          {showBrands ? 'Brands' : 'Generic'}
        </button>
      </div>

      {drugInteractions.length > 0 && (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            <span className="text-sm font-bold text-rose-700">Drug interactions</span>
          </div>
          <div className="space-y-2">
            {drugInteractions.map((di, idx) => (
              <p key={idx} className="ml-7 text-sm leading-relaxed text-rose-700">
                <span className="font-bold">{di.severity?.toUpperCase()}:</span>{' '}
                {di.drug1} + {di.drug2} — {di.description}
              </p>
            ))}
          </div>
        </div>
      )}

      {dosageWarnings.length > 0 && (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
          <div className="space-y-2">
            {dosageWarnings.map((w, idx) => (
              <p key={idx} className="flex items-start gap-2 text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> 
                <span className="font-semibold">{w}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {medications.map((med, idx) => (
          <div
            key={idx}
            className={`rounded-[22px] border p-4 transition-all ${
              med.interaction_warning
                ? 'border-rose-200 bg-rose-50/90'
                : med.max_daily_dose_exceeded
                ? 'border-amber-200 bg-amber-50/90'
                : 'border-slate-200 bg-slate-50/90'
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1 space-y-2">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">
                    {med.generic_name}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {!med.safe_for_age && (
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Age caution</span>
                    )}
                    {med.max_daily_dose_exceeded && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        Dose warning
                      </span>
                    )}
                  </div>
                </div>

                {showBrands && med.brand_names && med.brand_names.length > 0 && (
                  <p className="text-sm text-slate-500">
                    Brands: {med.brand_names.join(', ')}
                  </p>
                )}

                {med.interaction_warning && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-600">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {med.interaction_warning}
                  </p>
                )}
              </div>

              <div className="rounded-[18px] bg-white px-4 py-3 text-sm shadow-sm lg:min-w-48 lg:text-right">
                <p className="text-slate-800">
                  {med.dose ? `${med.dose} • ` : ''}{med.frequency || '-'}
                </p>
                {med.duration && (
                  <p className="mt-0.5 text-slate-400">{med.duration}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
