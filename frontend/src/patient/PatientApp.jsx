import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import BottomNav, { Sidebar } from './components/BottomNav'
import { getSession } from './patientApi'
import './patient.css'

export default function PatientApp() {
  const navigate = useNavigate()

  useEffect(() => {
    const session = getSession()
    if (!session?.patient_id) {
      navigate('/pd/login', { replace: true })
    }
  }, [navigate])

  const session = getSession()
  if (!session?.patient_id) return null

  return (
    <div className="pd-layout">
      <Sidebar />
      <div className="pd-main-content">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
