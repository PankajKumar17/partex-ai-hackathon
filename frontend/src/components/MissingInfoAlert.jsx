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
    <div className="glass-card border border-rose-200/80 bg-rose-50/85 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <h3 className="text-sm font-semibold text-rose-700">
            Missing critical information
          </h3>
        </div>
        <button
          onClick={handleDismissAll}
          className="text-xs font-semibold text-rose-500 transition-colors hover:text-rose-700"
        >
          Dismiss all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeFlags.map((flag, idx) => {
          const isWarning = flag.toLowerCase().includes('vital')
          const chipClass = isWarning
            ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200'
            : 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200'

          return (
            <button
              key={idx}
              className={`group inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${chipClass}`}
              onClick={() => handleDismiss(idx)}
            >
              {flag}
              <X className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
