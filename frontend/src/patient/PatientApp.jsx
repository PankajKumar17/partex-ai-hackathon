import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import BottomNav, { Sidebar } from './components/BottomNav'
import './patient.css'

export default function PatientApp() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

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
