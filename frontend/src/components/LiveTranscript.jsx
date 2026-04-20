import { useEffect, useRef } from 'react'

const speakerColors = {
  DOCTOR: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: '👨‍⚕️ Doctor' },
  PATIENT: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: '🤒 Patient' },
  ATTENDANT: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: '👤 Attendant' },
}

const langBadges = {
  hindi: { label: 'HI', color: 'bg-orange-100 text-orange-700' },
  marathi: { label: 'MR', color: 'bg-green-100 text-green-700' },
  english: { label: 'EN', color: 'bg-blue-100 text-blue-700' },
  mixed: { label: 'MIX', color: 'bg-purple-100 text-purple-700' },
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Live Transcript</h3>
        <div className="text-center py-8 text-slate-500">
          <p className="text-lg mb-1">🎙️</p>
          <p>Start recording to see transcript here</p>
          {isLive && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-400">Listening...</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Live Transcript</h3>
        {isLive && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-green-400">Live</span>
          </div>
        )}
        <span className="text-xs text-slate-500">{segments.length} segments</span>
      </div>

      <div
        ref={scrollRef}
        className="space-y-2 max-h-96 overflow-y-auto pr-2"
      >
        {segments.map((seg, idx) => {
          const speaker = speakerColors[seg.speaker] || speakerColors.PATIENT
          const lang = langBadges[seg.language] || langBadges.hindi

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border-l-4 border-t-0 border-r-0 border-b border-b-slate-100 ${speaker.bg} ${speaker.border} transition-all duration-300`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${speaker.text}`}>
                  {speaker.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${lang.color}`}>
                  {lang.label}
                </span>
                {seg.start_time !== undefined && (
                  <span className="text-[10px] text-gray-600 ml-auto">
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
