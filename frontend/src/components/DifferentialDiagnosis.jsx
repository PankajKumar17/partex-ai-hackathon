import { AlertOctagon, FlaskConical } from 'lucide-react'

export default function DifferentialDiagnosis({ diagnoses = [] }) {
  if (diagnoses.length === 0) {
    return (
      <div className="glass-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Differential</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Likely diagnoses</h3>
        <p className="py-6 text-center text-sm text-slate-500">No diagnoses generated yet</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Differential</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Likely diagnoses</h3>
      </div>
      <div className="space-y-4">
        {diagnoses.slice(0, 3).map((dx, idx) => {
          const prob = dx.probability || 0
          const barWidth = (prob / 100) * 100

          return (
            <div key={idx} className="space-y-3 rounded-[20px] border border-slate-200 bg-slate-50/90 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-medium text-sm">
                    {idx + 1}. {dx.name}
                  </span>
                  {dx.red_flags && (
                    <span className="flex items-center gap-1 text-rose-700">
                      <AlertOctagon className="w-4 h-4" />
                      <span className="text-[10px] font-bold tracking-[0.16em]">RED FLAG</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {dx.ICD10 && (
                    <span className="rounded bg-cyan-100 px-1.5 py-0.5 font-mono text-[10px] text-cyan-700">
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
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full animate-grow ${
                    dx.red_flags
                      ? 'bg-rose-500'
                      : idx === 0
                      ? 'bg-cyan-700'
                      : 'bg-cyan-400'
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
                      className="flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] text-cyan-700"
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
