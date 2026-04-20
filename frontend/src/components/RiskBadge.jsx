export default function RiskBadge({ level = 'LOW' }) {
  const config = {
    HIGH: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      text: 'text-red-400',
      dot: 'bg-red-500',
      pulse: true,
    },
    MODERATE: {
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/50',
      text: 'text-amber-400',
      dot: 'bg-amber-500',
      pulse: false,
    },
    LOW: {
      bg: 'bg-green-500/20',
      border: 'border-green-500/50',
      text: 'text-green-400',
      dot: 'bg-green-500',
      pulse: false,
    },
  }

  const c = config[level] || config.LOW

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.border} ${c.text} ${c.pulse ? 'badge-pulse' : ''}`}
    >
      <span className={`w-2 h-2 rounded-full ${c.dot} ${c.pulse ? 'animate-pulse' : ''}`} />
      {level}
    </span>
  )
}
