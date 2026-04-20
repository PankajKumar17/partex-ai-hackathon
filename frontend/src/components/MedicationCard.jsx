import { useState } from 'react'
import { AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react'

export default function MedicationCard({ medications = [], drugInteractions = [], dosageWarnings = [] }) {
  const [showBrands, setShowBrands] = useState(true)

  if (medications.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">Medications</h3>
      <p className="text-slate-500 text-sm text-center py-4">No medications captured</p>
    </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Medications</h2>
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
      <div className="mt-3 space-y-3">
        {medications.map((med, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center ${
              med.interaction_warning
                ? 'bg-red-50 border border-red-100'
                : med.max_daily_dose_exceeded
                ? 'bg-yellow-50 border border-yellow-100'
                : 'bg-gray-50 border border-slate-100'
            }`}
          >
            <div className="mb-2 md:mb-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">
                  {med.generic_name}
                </span>
                <div className="flex gap-1">
                  {!med.safe_for_age && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                      Age ⚠️
                    </span>
                  )}
                  {med.max_daily_dose_exceeded && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-600 font-medium">
                      Dose ⚠️
                    </span>
                  )}
                </div>
              </div>
              {showBrands && med.brand_names && med.brand_names.length > 0 && (
                <p className="text-sm text-gray-500 mt-0.5">
                  {med.brand_names.join(', ')}
                </p>
              )}
              {med.interaction_warning && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {med.interaction_warning}
                </p>
              )}
            </div>

            <div className="text-sm md:text-right">
              <p className="text-slate-800">
                {med.dose ? `${med.dose} • ` : ''}{med.frequency || '-'}
              </p>
              {med.duration && (
                <p className="text-gray-400 mt-0.5">{med.duration}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
