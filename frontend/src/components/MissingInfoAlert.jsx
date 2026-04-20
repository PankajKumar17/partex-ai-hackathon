import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export default function MissingInfoAlert({ flags = [], onDismiss }) {
  const [dismissed, setDismissed] = useState([])

  if (flags.length === 0) return null

  const activeFlags = flags.filter((_, i) => !dismissed.includes(i))
  if (activeFlags.length === 0) return null

  const handleDismiss = (idx) => {
    setDismissed(prev => [...prev, flags.indexOf(activeFlags[idx])])
  }

  const handleDismissAll = () => {
    setDismissed(flags.map((_, i) => i))
    if (onDismiss) onDismiss()
  }

  return (
    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <div>
            <span className="text-sm font-semibold text-amber-300">Missing Information</span>
            <p className="text-xs text-amber-400/70">Patient still here — ask now!</p>
          </div>
        </div>
        <button
          onClick={handleDismissAll}
          className="text-xs text-amber-400/60 hover:text-amber-300 transition-colors"
        >
          Dismiss all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeFlags.map((flag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 transition-colors cursor-pointer group"
            onClick={() => handleDismiss(idx)}
          >
            {flag}
            <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
        ))}
      </div>
    </div>
  )
}
