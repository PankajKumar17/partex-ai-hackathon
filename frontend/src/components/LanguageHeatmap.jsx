export default function LanguageHeatmap({ heatmap = {} }) {
  const languages = [
    { key: 'hindi', label: 'Hindi', color: 'bg-[#ff9933]' },
    { key: 'marathi', label: 'Marathi', color: 'bg-[#138808]' },
    { key: 'english', label: 'English', color: 'bg-[#000080]' },
    { key: 'mixed', label: 'Mixed', color: 'bg-purple-500' },
  ]

  const total = Object.values(heatmap).reduce((a, b) => a + (b || 0), 0) || 1
  const entries = languages
    .map(lang => ({ ...lang, value: heatmap[lang.key] || 0 }))
    .filter(l => l.value > 0)

  if (entries.length === 0) return null

  return (
    <div className="glass-card p-4">
      <h4 className="text-sm font-semibold text-slate-600 mb-3">Language Distribution</h4>
      {/* Bar */}
      <div className="flex h-6 rounded-full overflow-hidden mb-3">
        {entries.map((lang) => {
          const pct = ((lang.value / total) * 100).toFixed(0)
          return (
            <div
              key={lang.key}
              className={`${lang.color} flex items-center justify-center text-[10px] font-bold text-slate-900 transition-all duration-700`}
              style={{ width: `${pct}%` }}
              title={`${lang.label}: ${pct}%`}
            >
              {parseInt(pct) > 10 && `${pct}%`}
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {entries.map(lang => {
          const pct = ((lang.value / total) * 100).toFixed(0)
          return (
            <div key={lang.key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${lang.color}`} />
              <span className="text-xs text-slate-500">
                {lang.label} {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
