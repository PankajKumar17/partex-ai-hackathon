import { useEffect, useRef } from 'react'

const speakerColors = {
  DOCTOR: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', label: 'Doctor' },
  PATIENT: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Patient' },
  ATTENDANT: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'Attendant' },
}

const langBadges = {
  hindi: { label: 'HI', color: 'bg-orange-100 text-orange-700' },
  marathi: { label: 'MR', color: 'bg-emerald-100 text-emerald-700' },
  english: { label: 'EN', color: 'bg-cyan-100 text-cyan-700' },
  mixed: { label: 'MIX', color: 'bg-slate-200 text-slate-700' },
}

export default function LiveTranscript({ segments = [], isLive = false }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [segments])

  if (segments.length === 0) {
    return (
      <div className="glass-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Transcript</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Speaker timeline</h3>
        <div className="py-8 text-center text-slate-500">
          <p className="mb-1 text-lg">🎙️</p>
          <p>Start recording to see transcript here</p>
          {isLive && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-emerald-600">Listening...</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Transcript</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Speaker timeline</h3>
        </div>
        {isLive && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-emerald-600">Live</span>
          </div>
        )}
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {segments.length} segments
        </span>
      </div>

      <div
        ref={scrollRef}
        className="max-h-96 space-y-2 overflow-y-auto pr-2"
      >
        {segments.map((seg, idx) => {
          const speaker = speakerColors[seg.speaker] || speakerColors.PATIENT
          const lang = langBadges[seg.language] || langBadges.hindi

          return (
            <div
              key={idx}
              className={`rounded-[20px] border p-4 transition-all duration-300 ${speaker.bg} ${speaker.border}`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${speaker.text}`}>
                  {speaker.label}
                </span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${lang.color}`}>
                  {lang.label}
                </span>
                {seg.start_time !== undefined && (
                  <span className="ml-auto text-[10px] text-slate-500">
                    {seg.start_time.toFixed(1)}s - {seg.end_time?.toFixed(1) || '?'}s
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {seg.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
