import { AlertOctagon, FlaskConical } from 'lucide-react'

export default function DifferentialDiagnosis({ diagnoses = [] }) {
  if (diagnoses.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Differential Diagnosis</h3>
        <p className="text-slate-500 text-sm text-center py-4">No diagnoses generated yet</p>
      </div>
    )
  }

  const maxProb = Math.max(...diagnoses.map(d => d.probability || 0), 1)

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <h3 className="font-semibold text-lg mb-4 text-slate-900">Possible Diagnosis</h3>
      <div className="space-y-4">
        {diagnoses.slice(0, 3).map((dx, idx) => {
          const prob = dx.probability || 0
          const barWidth = (prob / 100) * 100

          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-medium text-sm">
                    {idx + 1}. {dx.name}
                  </span>
                  {dx.red_flags && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertOctagon className="w-4 h-4" />
                      <span className="text-[10px] font-bold">RED FLAG</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {dx.ICD10 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary-light font-mono">
                      {dx.ICD10}
                    </span>
                  )}
                  <div className="text-right ml-2 min-w-[60px]">
                    <span className="text-xs text-slate-400 block -mb-1">Confidence</span>
                    <span className="text-sm font-bold text-slate-700">{prob}%</span>
                  </div>
                </div>
              </div>

              {/* Probability bar */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full animate-grow ${
                    dx.red_flags
                      ? 'bg-red-500'
                      : idx === 0
                      ? 'bg-primary'
                      : 'bg-blue-400'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              {/* Reasoning */}
              {dx.reasoning && (
                <p className="text-xs text-slate-500 italic pl-4 border-l-2 border-slate-200">
                  {dx.reasoning}
                </p>
              )}

              {/* Required tests */}
              {dx.requires_test && dx.requires_test.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {dx.requires_test.map((test, tidx) => (
                    <span
                      key={tidx}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-info/10 text-info border border-info/20"
                    >
                      <FlaskConical className="w-2.5 h-2.5" />
                      {test}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
