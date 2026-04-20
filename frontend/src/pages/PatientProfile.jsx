import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Calendar, Phone, Loader2 } from 'lucide-react'
import axios from 'axios'

import RiskBadge from '../components/RiskBadge'
import PatientTimeline from '../components/PatientTimeline'
import RAGChatbot from '../components/RAGChatbot'

const API = import.meta.env.VITE_API_URL || ''

export default function PatientProfile() {
  const { patientId } = useParams()
  const navigate = useNavigate()

  const [patient, setPatient] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [patientId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [timelineRes, briefRes] = await Promise.all([
        axios.get(`${API}/api/patients/${patientId}/timeline`),
        axios.get(`${API}/api/patients/${patientId}/brief`).catch(() => ({ data: { brief: '' } })),
      ])
      setPatient(timelineRes.data.patient)
      setTimeline(timelineRes.data.timeline)
      setBrief(briefRes.data.brief)
    } catch (err) {
      console.error('Failed to fetch patient data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl mb-2">🔍</p>
          <p className="text-slate-500">Patient not found</p>
          <button onClick={() => navigate('/')} className="mt-4 text-primary-light text-sm hover:underline">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">Patient Profile</h1>
      </header>

      {/* Patient Info Card */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-light text-2xl font-bold">
              {patient.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-slate-900">{patient.name}</h2>
                <RiskBadge level={patient.risk_badge} />
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {patient.patient_id}
                </span>
                <span>{patient.age}y · {patient.gender}</span>
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {patient.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Registered: {new Date(patient.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/consultation/${patientId}`)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-medium transition-colors"
          >
            New Consultation
          </button>
        </div>

        {/* Brief */}
        {brief && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 mb-2">AI BRIEF</h4>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{brief}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Visit History</h3>
          <span className="text-xs text-slate-500">{timeline.length} visit(s)</span>
        </div>
        <PatientTimeline timeline={timeline} />
      </div>

      {/* RAG Chatbot */}
      <RAGChatbot patientId={patientId} />
    </div>
  )
}
