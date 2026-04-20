import RiskBadge from './RiskBadge'

export default function PatientTimeline({ timeline = [] }) {
  if (timeline.length === 0) {
    return (
      <div className="rounded-[24px] bg-slate-50 p-6 text-center">
        <p className="text-slate-500">No visits recorded yet</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute bottom-0 left-5 top-0 w-0.5 bg-gradient-to-b from-cyan-700 via-cyan-400/50 to-transparent" />

      <div className="space-y-6">
        {timeline.map((entry, idx) => {
          const cd = entry.clinical_data
          const riskLevel = cd?.differential_diagnosis?.[0]?.red_flags ? 'HIGH' :
            entry.needs_review ? 'MODERATE' : 'LOW'
          const date = entry.session_date
            ? new Date(entry.session_date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })
            : 'Unknown date'

          return (
            <div key={entry.visit_id || idx} className="relative pl-12">
              <div className={`absolute left-3.5 top-5 h-3 w-3 rounded-full border-2 border-white ${
                riskLevel === 'HIGH' ? 'bg-rose-500' :
                riskLevel === 'MODERATE' ? 'bg-amber-500' :
                'bg-emerald-500'
              }`} />

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 transition-transform hover:scale-[1.01]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">{date}</span>
                  <RiskBadge level={riskLevel} />
                </div>

                <p className="text-sm text-slate-600 mb-2">
                  {entry.chief_complaint || 'No complaint recorded'}
                </p>

                {cd && (
                  <div className="space-y-2">
                    {/* Diagnoses */}
                    {cd.differential_diagnosis && cd.differential_diagnosis.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cd.differential_diagnosis.slice(0, 2).map((dx, didx) => (
                          <span key={didx} className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] text-cyan-700">
                            {dx.name} ({dx.probability}%)
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Medications count */}
                    {cd.medications && cd.medications.length > 0 && (
                      <p className="text-[10px] text-slate-500">
                        💊 {cd.medications.length} medication(s) prescribed
                      </p>
                    )}

                    {/* Follow-up */}
                    {cd.follow_up_date && (
                      <p className="text-[10px] text-slate-500">
                        📅 Follow-up: {cd.follow_up_date}
                      </p>
                    )}
                  </div>
                )}

                {entry.language_detected && (
                  <span className="text-[10px] text-gray-600 mt-2 inline-block">
                    Language: {entry.language_detected}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
