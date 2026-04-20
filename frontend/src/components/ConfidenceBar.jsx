export default function ConfidenceBar({ value = 0, label = '' }) {
  const pct = Math.round(Math.min(Math.max(value * 100, 0), 100))

  const getColor = () => {
    if (pct >= 80) return 'bg-green-500'
    if (pct >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-2 w-full">
      {label && <span className="text-xs text-slate-500 w-16 shrink-0">{label}</span>}
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getColor()} animate-grow`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${pct < 60 ? 'text-red-400' : 'text-slate-600'}`}>
        {pct}%
      </span>
    </div>
  )
}
