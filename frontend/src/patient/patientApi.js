import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API}/api/portal`,
})

// Get stored patient session
export function getSession() {
  const raw = localStorage.getItem('pd_session')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setSession(data) {
  localStorage.setItem('pd_session', JSON.stringify(data))
}

export function clearSession() {
  localStorage.removeItem('pd_session')
}

export function getPatientId() {
  const session = getSession()
  return session?.patient_id || null
}

// ── API Methods ─────────────────────────────────────

export async function login(phone) {
  const res = await api.post('/login', null, { params: { phone } })
  setSession(res.data)
  return res.data
}

export async function getOverview() {
  const id = getPatientId()
  const res = await api.get(`/overview/${id}`)
  return res.data
}

export async function getProfile() {
  const id = getPatientId()
  const res = await api.get(`/me/${id}`)
  return res.data
}

export async function getHealthPassport() {
  const id = getPatientId()
  const res = await api.get(`/health-passport/${id}`)
  return res.data
}

export async function getVisits() {
  const id = getPatientId()
  const res = await api.get(`/visits/${id}`)
  return res.data
}

export async function getMedications() {
  const id = getPatientId()
  const res = await api.get(`/medications/${id}`)
  return res.data
}

export async function logMedication(data) {
  const id = getPatientId()
  const res = await api.post(`/medications/${id}/log`, data)
  return res.data
}

export async function requestRefill(data) {
  const id = getPatientId()
  const res = await api.post(`/medications/${id}/refill`, data)
  return res.data
}

export async function getVitals(days = 90) {
  const id = getPatientId()
  const res = await api.get(`/vitals/${id}`, { params: { days } })
  return res.data
}

export async function logVitals(data) {
  const id = getPatientId()
  const res = await api.post(`/vitals/${id}`, data)
  return res.data
}

export async function getReminders() {
  const id = getPatientId()
  const res = await api.get(`/reminders/${id}`)
  return res.data
}

export async function createReminder(data) {
  const id = getPatientId()
  const res = await api.post(`/reminders/${id}`, data)
  return res.data
}

export async function updateReminder(reminderId, data) {
  const id = getPatientId()
  const res = await api.patch(`/reminders/${id}/${reminderId}`, data)
  return res.data
}

export async function deleteReminder(reminderId) {
  const id = getPatientId()
  const res = await api.delete(`/reminders/${id}/${reminderId}`)
  return res.data
}

export async function getDocuments() {
  const id = getPatientId()
  const res = await api.get(`/documents/${id}`)
  return res.data
}

export async function addDocument(data) {
  const id = getPatientId()
  const res = await api.post(`/documents/${id}`, data)
  return res.data
}

export async function generateQRToken() {
  const id = getPatientId()
  const res = await api.post(`/qr/generate/${id}`)
  return res.data
}

export async function getEmergencyData(token) {
  const res = await api.get(`/qr/${token}`)
  return res.data
}

export default api
