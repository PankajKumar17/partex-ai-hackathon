import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Monitor, Flag, FileText, Loader2 } from 'lucide-react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'

import AudioRecorder from '../components/AudioRecorder'
import LiveTranscript from '../components/LiveTranscript'
import LanguageHeatmap from '../components/LanguageHeatmap'
import SpeakerTimeline from '../components/SpeakerTimeline'
import ClinicalCard from '../components/ClinicalCard'
import DifferentialDiagnosis from '../components/DifferentialDiagnosis'
import MedicationCard from '../components/MedicationCard'
import MissingInfoAlert from '../components/MissingInfoAlert'
import PrescriptionPreview from '../components/PrescriptionPreview'
import RiskBadge from '../components/RiskBadge'
import RAGChatbot from '../components/RAGChatbot'

const API = import.meta.env.VITE_API_URL || ''

export default function Consultation() {
  const { patientId } = useParams()
  const navigate = useNavigate()

  const [patient, setPatient] = useState(null)
  const [brief, setBrief] = useState('')
  const [loadingBrief, setLoadingBrief] = useState(true)
  const [consultationData, setConsultationData] = useState(null)
  const [dualScreen, setDualScreen] = useState(false)
  const [patientWindow, setPatientWindow] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchPatient()
    fetchBrief()
  }, [patientId])

  // Broadcast to dual screen
  useEffect(() => {
    if (dualScreen && consultationData) {
      const channel = new BroadcastChannel('patient-display')
      channel.postMessage({
        type: 'update',
        patient: patient,
        symptoms: consultationData.symptoms,
        chiefComplaint: consultationData.chief_complaint,
        status: 'processing',
      })
    }
  }, [consultationData, dualScreen])

  const fetchPatient = async () => {
    try {
      const res = await axios.get(`${API}/api/patients/${patientId}`)
      setPatient(res.data)
    } catch (err) {
      console.error('Patient not found:', err)
    }
  }

  const fetchBrief = async () => {
    setLoadingBrief(true)
    try {
      const res = await axios.get(`${API}/api/patients/${patientId}/brief`)
      setBrief(res.data.brief)
    } catch {
      setBrief('No prior visit history.')
    } finally {
      setLoadingBrief(false)
    }
  }

  const handleAudioResult = (data) => {
    setConsultationData(data)
    // Refresh patient to get updated risk badge
    fetchPatient()
  }

  const toggleDualScreen = () => {
    if (!dualScreen) {
      const w = window.open('', 'PatientDisplay', 'width=800,height=600')
      if (w) {
        w.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Patient Display</title>
            <style>
              body { font-family: 'Inter', sans-serif; background: #0f172a; color: #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 2rem; }
              h1 { font-size: 2rem; margin-bottom: 0.5rem; }
              .status { font-size: 1.2rem; color: #94a3b8; margin-top: 1rem; }
              .symptoms { margin-top: 2rem; width: 100%; max-width: 500px; }
              .symptom { background: rgba(30,41,59,0.7); padding: 1rem; margin: 0.5rem 0; border-radius: 12px; border: 1px solid rgba(99,102,241,0.2); }
              .pulse { animation: pulse 2s infinite; }
              @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
            </style>
          </head>
          <body>
            <h1 id="name">Patient Display</h1>
            <p id="info" class="status">Waiting for consultation to begin...</p>
            <div id="symptoms" class="symptoms"></div>
            <p id="status" class="status pulse">🎙️ Listening...</p>
            <script>
              const channel = new BroadcastChannel('patient-display');
              channel.onmessage = (e) => {
                const d = e.data;
                if (d.patient) document.getElementById('name').textContent = d.patient.name;
                if (d.chiefComplaint) document.getElementById('info').textContent = 'Chief complaint: ' + d.chiefComplaint;
                if (d.symptoms && d.symptoms.length > 0) {
                  const el = document.getElementById('symptoms');
                  el.innerHTML = d.symptoms.map(s => '<div class="symptom">✅ ' + s.name + (s.duration ? ' — ' + s.duration : '') + '</div>').join('');
                }
                document.getElementById('status').textContent = d.status === 'processing' ? '📋 Your prescription is being prepared...' : '🎙️ Listening...';
              };
            </script>
          </body>
          </html>
        `)
        setPatientWindow(w)
        setDualScreen(true)
      }
    } else {
      if (patientWindow) patientWindow.close()
      setDualScreen(false)
    }
  }

  const handleFlagReview = async () => {
    if (!consultationData?.visit_id) return
    try {
      await axios.patch(`${API}/api/visits/${consultationData.visit_id}/flag`)
      alert('Visit flagged for review.')
    } catch (err) {
      console.error('Flag failed:', err)
    }
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">
                Consultation — {patient?.name || patientId}
              </h1>
              {patient && <RiskBadge level={patient.risk_badge} />}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {patient?.patient_id} · {patient?.age}y · {patient?.gender}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDualScreen}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              dualScreen ? 'bg-green-500/20 text-green-400' : 'bg-slate-50er text-slate-500 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-4 h-4" />
            {dualScreen ? 'Patient Display ON' : 'Enable Patient Display'}
          </button>
          {consultationData && (
            <>
              <button
                onClick={handleFlagReview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs transition-colors"
              >
                <Flag className="w-3.5 h-3.5" /> Flag
              </button>
              <button
                onClick={() => navigate(`/patient/${patientId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary-light hover:bg-primary/30 text-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> View Profile
              </button>
            </>
          )}
        </div>
      </header>

      {/* Patient Brief */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <h3 className="text-xs font-semibold text-slate-500 mb-2">PATIENT BRIEF</h3>
        {loadingBrief ? (
          <div className="skeleton h-12 w-full" />
        ) : (
          <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line [&>p]:mb-1 last:[&>p]:mb-0">
            <ReactMarkdown>{brief}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Main Content — Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Audio + Transcript */}
        <div className="lg:col-span-8 space-y-4">
          <AudioRecorder patientId={patientId} onResult={handleAudioResult} />
          
          {consultationData?.transcript && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="text-xs font-semibold text-slate-500 mb-2">RAW TRANSCRIPT (SARVAM ASR)</h3>
              <p className="text-sm text-slate-700 leading-relaxed italic border-l-2 border-primary/30 pl-3">
                "{consultationData.transcript}"
              </p>
            </div>
          )}

          <LiveTranscript segments={consultationData?.speaker_segments || []} />
          
          {(consultationData?.language_heatmap || consultationData?.speaker_segments?.length > 0) && (
            <details className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 group">
              <summary className="text-sm font-semibold text-slate-700 cursor-pointer list-none flex justify-between items-center">
                <span>Technical Diagnostics (Language & Timeline)</span>
                <span className="transition-transform group-open:rotate-180 text-xs">▼</span>
              </summary>
              <div className="mt-4 flex flex-col md:flex-row gap-4">
                {consultationData?.language_heatmap && (
                  <div className="flex-1"><LanguageHeatmap heatmap={consultationData.language_heatmap} /></div>
                )}
                {consultationData?.speaker_segments?.length > 0 && (
                  <div className="flex-1"><SpeakerTimeline segments={consultationData.speaker_segments} /></div>
                )}
              </div>
            </details>
          )}
        </div>

        {/* Right Column: Clinical Intelligence */}
        <div className="lg:col-span-4 space-y-4">
          {!consultationData ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-5xl mb-4">🩺</p>
              <p className="text-slate-500">Record a consultation to see clinical analysis</p>
              <p className="text-xs text-gray-600 mt-2">
                Press the mic button and start speaking with your patient
              </p>
            </div>
          ) : (
            <>
              <MissingInfoAlert flags={consultationData.missing_info_flags} />
              
              <div className="bg-slate-100/80 p-1 rounded-xl flex gap-1 mb-2">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 justify-center flex text-xs font-semibold py-2 rounded-lg transition-all duration-200 ${activeTab === 'overview' ? 'bg-white shadow-sm text-slate-900 border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setActiveTab('diagnosis')}
                  className={`flex-1 justify-center flex text-xs font-semibold py-2 rounded-lg transition-all duration-200 ${activeTab === 'diagnosis' ? 'bg-white shadow-sm text-slate-900 border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  Diagnosis
                </button>
                <button 
                  onClick={() => setActiveTab('prescription')}
                  className={`flex-1 justify-center flex text-xs font-semibold py-2 rounded-lg transition-all duration-200 ${activeTab === 'prescription' ? 'bg-white shadow-sm text-slate-900 border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  Prescription
                </button>
              </div>

              {activeTab === 'overview' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <ClinicalCard
                    symptoms={consultationData.symptoms}
                    vitals={consultationData.vitals}
                  />
                </div>
              )}
              
              {activeTab === 'diagnosis' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <DifferentialDiagnosis
                    diagnoses={consultationData.differential_diagnosis}
                  />
                </div>
              )}
              
              {activeTab === 'prescription' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                  <MedicationCard
                    medications={consultationData.medications}
                    drugInteractions={consultationData.drug_interactions}
                    dosageWarnings={consultationData.dosage_warnings}
                  />
                  <PrescriptionPreview
                    visitId={consultationData.visit_id}
                    medications={consultationData.medications}
                    drugInteractions={consultationData.drug_interactions}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RAG Chatbot — floating */}
      <RAGChatbot patientId={patientId} />
    </div>
  )
}
