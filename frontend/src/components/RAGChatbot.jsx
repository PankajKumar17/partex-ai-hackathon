import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Mic, MicOff, Loader2 } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

export default function RAGChatbot({ patientId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const suggestedQuestions = [
    'Last prescribed medications?',
    'Any allergy history?',
    'BP trend over visits?',
    'Previous diagnoses?',
  ]

  const sendQuestion = async (question) => {
    if (!question.trim() || !patientId) return

    const userMsg = { role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await axios.post(`${API}/api/rag/query`, {
        patient_id: patientId,
        question: question,
      })

      const answer = res.data.answer || 'No answer available.'
      const sources = res.data.source_visits || []
      const sourceText = sources.length > 0
        ? `\n\n📋 Sources: ${sources.join(', ')}`
        : ''

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: answer + sourceText,
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to get answer. Please try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceQuery = async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks = []
      setIsRecording(true)

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setIsRecording(false)
        const blob = new Blob(chunks, { type: 'audio/webm' })

        setLoading(true)
        const userMsg = { role: 'user', content: '🎙️ Processing voice question...' }
        setMessages(prev => [...prev, userMsg])

        try {
          const formData = new FormData()
          formData.append('audio', blob, 'question.webm')
          formData.append('patient_id', patientId)

          const res = await axios.post(`${API}/api/rag/query-voice`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })

          // Update the voice message with transcribed text
          setMessages(prev => {
            const updated = [...prev]
            const voiceIdx = updated.findLastIndex(m => m.content.startsWith('🎙️'))
            if (voiceIdx >= 0) {
              updated[voiceIdx] = {
                role: 'user',
                content: `🎙️ "${res.data.question_text}"`,
              }
            }
            return updated
          })

          setMessages(prev => [...prev, {
            role: 'assistant',
            content: res.data.answer + (res.data.source_visits?.length
              ? `\n\n📋 Sources: ${res.data.source_visits.join(', ')}`
              : ''),
          }])
        } catch (err) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '❌ Failed to process voice query. Please try again.',
          }])
        } finally {
          setLoading(false)
        }
      }

      recorder.start()
      setTimeout(() => recorder.stop(), 6000) // Record for 6 seconds max
    } catch {
      setIsRecording(false)
      alert('Microphone access is needed for voice queries.')
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary hover:bg-primary-dark shadow-lg shadow-primary/30 flex items-center justify-center transition-all duration-300 hover:scale-110 z-50"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] glass-card flex flex-col z-50 shadow-2xl shadow-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Patient History Q&A</h4>
          <p className="text-[10px] text-slate-500">Ask about {patientId}'s records</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-900">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 text-center mb-3">Suggested questions:</p>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendQuestion(q)}
                className="w-full text-left text-xs p-2.5 rounded-lg bg-primary/10 text-primary-light hover:bg-primary/20 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl text-xs ${
              msg.role === 'user'
                ? 'bg-primary/20 text-primary-light rounded-br-none'
                : 'bg-slate-100 text-slate-700 rounded-bl-none border border-slate-200'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl rounded-bl-none">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={handleVoiceQuery}
            disabled={loading}
            className={`p-2 rounded-lg transition-all disabled:opacity-50 ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
            title={isRecording ? 'Recording... (auto-stops in 6s)' : 'Ask by voice'}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendQuestion(input)}
            placeholder={isRecording ? 'Listening...' : 'Ask about patient history...'}
            className="flex-1 bg-slate-100 text-sm text-slate-900 placeholder-slate-400 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            disabled={loading || isRecording}
          />
          <button
            onClick={() => sendQuestion(input)}
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
