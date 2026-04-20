export default function SpeakerTimeline({ segments = [] }) {
  if (segments.length === 0) return null

  const maxTime = Math.max(...segments.map(s => s.end_time || 0), 1)

  const speakerStyle = {
    DOCTOR: 'bg-blue-500',
    PATIENT: 'bg-green-500',
    ATTENDANT: 'bg-orange-500',
  }

  return (
    <div className="glass-card p-4">
      <h4 className="text-sm font-semibold text-slate-600 mb-3">Speaker Timeline</h4>
      <div className="relative h-10 bg-slate-50 rounded-lg overflow-hidden">
        {segments.map((seg, idx) => {
          const left = ((seg.start_time || 0) / maxTime) * 100
          const width = (((seg.end_time || 0) - (seg.start_time || 0)) / maxTime) * 100
          return (
            <div
              key={idx}
              className={`absolute top-1 bottom-1 rounded ${speakerStyle[seg.speaker] || 'bg-gray-500'} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
              title={`${seg.speaker}: "${seg.text?.substring(0, 50)}..."`}
            />
          )
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-slate-500">0s</span>
        <span className="text-[10px] text-slate-500">{maxTime.toFixed(0)}s</span>
      </div>
      <div className="flex gap-4 mt-2">
        {Object.entries(speakerStyle).map(([speaker, color]) => (
          <div key={speaker} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded ${color}`} />
            <span className="text-[10px] text-slate-500">{speaker}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
