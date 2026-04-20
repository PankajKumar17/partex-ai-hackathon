export default function RiskBadge({ level = 'LOW' }) {
  const config = {
    HIGH: {
      bg: 'bg-rose-500/12',
      border: 'border-rose-300/55',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
      pulse: true,
    },
    MODERATE: {
      bg: 'bg-amber-500/12',
      border: 'border-amber-300/60',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      pulse: false,
    },
    LOW: {
      bg: 'bg-emerald-500/12',
      border: 'border-emerald-300/60',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      pulse: false,
    },
  }

  const c = config[level] || config.LOW

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] shadow-[0_10px_20px_-16px_rgba(15,23,42,0.45)] transition-all ${c.bg} ${c.border} ${c.text} ${c.pulse ? 'badge-pulse' : ''}`}
    >
      <span className={`h-2 w-2 rounded-full ${c.dot} ${c.pulse ? 'animate-pulse' : ''}`} />
      {level}
    </span>
  )
}
