import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Users, Activity, AlertTriangle, BarChart3, X, LogOut } from 'lucide-react'
import axios from 'axios'
import RiskBadge from '../components/RiskBadge'
import { useAuth } from '../auth/AuthContext'

const API = import.meta.env.VITE_API_URL || ''

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [newPatient, setNewPatient] = useState({ name: '', age: '', gender: 'Male', phone: '' })
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    fetchPatients()
  }, [])

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
      const res = await axios.post(`${API}/api/patients`, {
        ...newPatient,
        age: parseInt(newPatient.age),
      })
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
    total: patients.length,
    high: patients.filter(p => p.risk_badge === 'HIGH').length,
    moderate: patients.filter(p => p.risk_badge === 'MODERATE').length,
  }

  return (
    <div className="min-h-screen app-shell relative z-10 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <span className="text-4xl">🏥</span>
            Voice-Driven Clinic
          </h1>
          <p className="text-slate-500 mt-1">AI-Powered Clinical Documentation</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden md:inline">Dr. {user?.name || 'Doctor'}</span>
          <button
            onClick={() => navigate('/analytics')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50/50 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-sm"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Patient
          </button>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }) }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50/50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors text-sm"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary-light" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Patients</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{stats.high}</p>
            <p className="text-xs text-slate-500">High Risk</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{stats.moderate}</p>
            <p className="text-xs text-slate-500">Moderate Risk</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search by patient name or ID (e.g., PT-2026-001)..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* Patient List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-16 glass-card">
          <p className="text-5xl mb-4">🩺</p>
          <p className="text-slate-500 text-lg">No patients found</p>
          <p className="text-gray-600 text-sm mt-1">Register your first patient to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map(patient => (
            <div
              key={patient.id}
              className="glass-card p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary-light font-semibold text-sm">
                  {patient.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{patient.name}</span>
                    <RiskBadge level={patient.risk_badge} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {patient.patient_id} · {patient.age}y · {patient.gender}
                    {patient.phone && ` · ${patient.phone}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/patient/${patient.patient_id}`)}
                  className="px-3 py-1.5 rounded-lg bg-slate-50er text-xs text-slate-600 hover:text-slate-900 hover:bg-white transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => navigate(`/consultation/${patient.patient_id}`)}
                  className="px-3 py-1.5 rounded-lg bg-primary/20 text-xs text-primary-light hover:bg-primary/30 transition-colors font-medium"
                >
                  Start Consultation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Register New Patient</h2>
              <button onClick={() => setShowRegister(false)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newPatient.name}
                  onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="e.g., Rajesh Kumar"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Age *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="150"
                    value={newPatient.age}
                    onChange={e => setNewPatient({...newPatient, age: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:ring-1 focus:ring-primary/50"
                    placeholder="Age"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Gender *</label>
                  <select
                    value={newPatient.gender}
                    onChange={e => setNewPatient({...newPatient, gender: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={newPatient.phone}
                  onChange={e => setNewPatient({...newPatient, phone: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="+91-XXXXX-XXXXX"
                />
              </div>
              <button
                type="submit"
                disabled={registering}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-colors disabled:opacity-50"
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
