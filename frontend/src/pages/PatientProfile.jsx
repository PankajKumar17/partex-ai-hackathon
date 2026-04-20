import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Calendar, Phone, Stethoscope,
  AlertTriangle, Heart, Loader2, Clock, TrendingUp
} from 'lucide-react'
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

  useEffect(() => { fetchData() }, [patientId])

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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-slate-400">Loading patient records…</p>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-3xl">🔍</p>
          <p className="text-slate-700 font-medium">Patient not found</p>
          <button onClick={() => navigate('/')} className="mt-2 text-sm text-primary hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const initials = patient.name?.charAt(0)?.toUpperCase() || '?'
  const briefLines = brief ? brief.split('\n').filter(Boolean) : []

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <header className="flex items-center gap-3 mb-7">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl border border-slate-200 hover:bg-white hover:border-slate-300 text-slate-500 hover:text-slate-900 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">Patient Profile</h1>
          <p className="text-xs text-slate-400">{patientId}</p>
        </div>
      </header>

      {/* ── Hero Card ── */}
      <div className="glass-card p-0 mb-6 overflow-hidden">
        {/* Top strip */}
        <div className="h-2 bg-gradient-to-r from-cyan-700 via-primary-light to-teal-400" />

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Avatar */}
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {initials}
            </div>

            {/* Name + Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-slate-900">{patient.name}</h2>
                <RiskBadge level={patient.risk_badge} />
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> {patient.patient_id}
                </span>
                <span>{patient.age}y · {patient.gender}</span>
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {patient.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Registered {new Date(patient.created_at).toLocaleDateString('en-IN')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {timeline.length} visit{timeline.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate(`/consultation/${patientId}`)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 shrink-0"
            >
              <Stethoscope className="w-4 h-4" />
              New Consultation
            </button>
          </div>

          {/* Memory chips: Allergies + Chronic Conditions */}
          {(patient.allergies?.length > 0 || patient.chronic_conditions?.length > 0) && (
            <div className="mt-5 pt-5 border-t border-slate-100 grid sm:grid-cols-2 gap-4">
              {patient.allergies?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-400" /> Allergies
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.allergies.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs font-medium border border-red-100">
                        {typeof a === 'string' ? a : a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {patient.chronic_conditions?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                    <Heart className="w-3 h-3 text-amber-400" /> Chronic Conditions
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.chronic_conditions.map((c, i) => (
                      <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs font-medium border border-amber-100">
                        {typeof c === 'string' ? c : c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Brief */}
          {briefLines.length > 0 && (
            <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">AI Summary</h4>
              <ul className="space-y-1.5">
                {briefLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-light shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Visit History ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-base font-bold text-slate-900">Visit History</h3>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {timeline.length} visit{timeline.length !== 1 ? 's' : ''}
          </span>
        </div>
        <PatientTimeline timeline={timeline} />
      </div>

      {/* ── RAG Chatbot ── */}
      <RAGChatbot patientId={patientId} />
    </div>
  )
}
