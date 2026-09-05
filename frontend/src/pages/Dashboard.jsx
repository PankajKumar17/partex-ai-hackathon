import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Users, Activity, AlertTriangle, BarChart3, LogOut, Stethoscope, ChevronRight, Phone } from 'lucide-react'
import axios from 'axios'
import RiskBadge from '../components/RiskBadge'
import { useAuth } from '../auth/AuthContext'

const API = import.meta.env.VITE_API_URL || ''

const riskLeftBorder = {
  HIGH:     'border-l-red-400',
  MODERATE: 'border-l-amber-400',
  LOW:      'border-l-emerald-400',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [patients, setPatients]   = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [newPatient, setNewPatient] = useState({ name: '', age: '', gender: 'Male', phone: '' })
  const [registering, setRegistering] = useState(false)

  useEffect(() => { fetchPatients() }, [])

  const fetchPatients = async (query = '') => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/patients`, { params: { search: query, limit: 50 } })
      setPatients(res.data)
    } catch (err) {
      console.error('Failed to fetch patients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearch(e.target.value)
    fetchPatients(e.target.value)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!newPatient.name || !newPatient.age || !newPatient.gender) return
    setRegistering(true)
    try {
      await axios.post(`${API}/api/patients`, { ...newPatient, age: parseInt(newPatient.age) })
      setShowRegister(false)
      setNewPatient({ name: '', age: '', gender: 'Male', phone: '' })
      fetchPatients()
    } catch (err) {
      alert('Failed to register patient: ' + (err.response?.data?.detail || err.message))
    } finally {
      setRegistering(false)
    }
  }

  const stats = {
    total:    patients.length,
    high:     patients.filter(p => p.risk_badge === 'HIGH').length,
    moderate: patients.filter(p => p.risk_badge === 'MODERATE').length,
  }

  return (
    <div className="min-h-screen app-shell relative z-10 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">PrescriptIt AI</h1>
            <p className="text-xs text-slate-400 tracking-wide">AI-Powered Clinical Documentation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 mr-1">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'D'}
            </div>
            <span className="text-sm font-medium text-slate-700">Dr. {user?.name || 'Doctor'}</span>
          </div>
          <button
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-sm font-medium"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </button>
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Patient
          </button>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }) }}
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide font-medium">Total Patients</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{stats.high}</p>
            <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide font-medium">High Risk</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 leading-none">{stats.moderate}</p>
            <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-wide font-medium">Moderate Risk</p>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search by patient name or ID (e.g., PT-2026-001)..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
        />
      </div>

      {/* ── Patient List ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <div className="text-5xl mb-4">🩺</div>
          <p className="text-slate-600 text-lg font-semibold">No patients found</p>
          <p className="text-slate-400 text-sm mt-1">Register your first patient to get started</p>
          <button
            onClick={() => setShowRegister(true)}
            className="mt-5 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            + New Patient
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map(patient => (
            <div
              key={patient.id}
              className={`glass-card border-l-4 ${riskLeftBorder[patient.risk_badge] || 'border-l-slate-200'} px-4 py-3.5 flex items-center justify-between hover:shadow-sm transition-all group`}
            >
              {/* Avatar + info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {patient.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 capitalize">{patient.name}</span>
                    <RiskBadge level={patient.risk_badge} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                    <span className="font-mono text-slate-500 text-[11px]">{patient.patient_id}</span>
                    <span>·</span>
                    <span>{patient.age}y · {patient.gender}</span>
                    {patient.phone && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5" />{patient.phone}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button
                  onClick={() => navigate(`/patient/${patient.patient_id}`)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => navigate(`/consultation/${patient.patient_id}`)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors"
                >
                  Start Consultation
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Register Modal ── */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Register New Patient</h2>
                <p className="text-xs text-slate-400 mt-0.5">Fill in the patient's basic details</p>
              </div>
              <button
                onClick={() => setShowRegister(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newPatient.name}
                  onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                  placeholder="e.g., Rajesh Kumar"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Age *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="150"
                    value={newPatient.age}
                    onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                    placeholder="Age"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Gender *</label>
                  <select
                    value={newPatient.gender}
                    onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Phone</label>
                <input
                  type="tel"
                  value={newPatient.phone}
                  onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm"
                  placeholder="+91-XXXXX-XXXXX"
                />
              </div>
              <button
                type="submit"
                disabled={registering}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {registering ? 'Registering...' : 'Register Patient'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
