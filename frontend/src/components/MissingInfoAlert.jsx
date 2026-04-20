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
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="text-red-600 font-semibold text-sm">
            ⚠ Missing Critical Information
          </h3>
        </div>
        <button
          onClick={handleDismissAll}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          Dismiss all
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeFlags.map((flag, idx) => {
          const isWarning = flag.toLowerCase().includes('vital');
          const chipClass = isWarning
            ? "bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200"
            : "bg-red-100 text-red-800 border border-red-200 hover:bg-red-200";
            
          return (
            <button
              key={idx}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer group transition-all ${chipClass}`}
              onClick={() => handleDismiss(idx)}
            >
              {flag}
              <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
