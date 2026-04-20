import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API}/api/portal`,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vc_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Session helpers (now from auth context) ─────────────────────

export function getPatientId() {
  // Read from auth token data stored by AuthContext
  const token = localStorage.getItem('vc_token')
  if (!token) return null
  try {
    // Decode JWT payload (middle part)
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.patient_id || null
  } catch {
    return null
  }
}

export function getPatientCode() {
  // Patient code is stored during login in user object
  // We need to get it from the /me endpoint or store it
  // For now, we'll pass it from the component
  return null
}

// ── API Methods ─────────────────────────────────────────────────

export async function login(phone) {
  // Legacy — kept for backwards compat but prefer auth/login now
  const res = await api.post('/login', null, { params: { phone } })
  return res.data
}

export async function getOverview() {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.get(`/overview/${id}`)
  return res.data
}

export async function getProfile() {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.get(`/me/${id}`)
  return res.data
}

export async function getHealthPassport() {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.get(`/health-passport/${id}`)
  return res.data
}

export async function getVisits() {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.get(`/visits/${id}`)
  return res.data
}

export async function getMedications() {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.get(`/medications/${id}`)
  return res.data
}

export async function logMedication(data) {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.post(`/medications/${id}/log`, data)
  return res.data
}

export async function requestRefill(data) {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.post(`/medications/${id}/refill`, data)
  return res.data
}

export async function getVitals(days = 90) {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.get(`/vitals/${id}`, { params: { days } })
  return res.data
}

export async function logVitals(data) {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.post(`/vitals/${id}`, data)
  return res.data
}

export async function getReminders() {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.get(`/reminders/${id}`)
  return res.data
}

export async function createReminder(data) {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.post(`/reminders/${id}`, data)
  return res.data
}

export async function updateReminder(reminderId, data) {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.patch(`/reminders/${id}/${reminderId}`, data)
  return res.data
}

export async function deleteReminder(reminderId) {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.delete(`/reminders/${id}/${reminderId}`)
  return res.data
}

export async function getDocuments() {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.get(`/documents/${id}`)
  return res.data
}

export async function addDocument(data) {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.post(`/documents/${id}`, data)
  return res.data
}

export async function generateQRToken() {
  const id = getPatientId()
  if (!id) throw new Error('Not authenticated')
  const res = await api.post(`/qr/generate/${id}`)
  return res.data
}

export async function getEmergencyData(token) {
  const res = await api.get(`/qr/${token}`)
  return res.data
}

export default api
