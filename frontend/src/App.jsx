import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Consultation from './pages/Consultation'
import PatientProfile from './pages/PatientProfile'
import Analytics from './pages/Analytics'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Doctor Dashboard (protected) */}
          <Route path="/" element={
            <ProtectedRoute role="doctor"><Dashboard /></ProtectedRoute>
          } />
          <Route path="/consultation/:patientId" element={
            <ProtectedRoute role="doctor"><Consultation /></ProtectedRoute>
          } />
          <Route path="/patient/:patientId" element={
            <ProtectedRoute role="doctor"><PatientProfile /></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute role="doctor"><Analytics /></ProtectedRoute>
          } />

        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
