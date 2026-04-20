import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Consultation from './pages/Consultation'
import PatientProfile from './pages/PatientProfile'
import Analytics from './pages/Analytics'

// Patient Dashboard
import PatientApp from './patient/PatientApp'
import PatientHome from './patient/pages/PatientHome'
import HealthPassport from './patient/pages/HealthPassport'
import PatientVisits from './patient/pages/PatientVisits'
import PatientMedications from './patient/pages/PatientMedications'
import PatientVitals from './patient/pages/PatientVitals'
import PatientReminders from './patient/pages/PatientReminders'
import PatientDocuments from './patient/pages/PatientDocuments'
import EmergencyView from './patient/components/EmergencyView'

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

          {/* Patient Dashboard (protected) */}
          <Route path="/pd" element={
            <ProtectedRoute role="patient"><PatientApp /></ProtectedRoute>
          }>
            <Route index element={<PatientHome />} />
            <Route path="passport" element={<HealthPassport />} />
            <Route path="visits" element={<PatientVisits />} />
            <Route path="medications" element={<PatientMedications />} />
            <Route path="vitals" element={<PatientVitals />} />
            <Route path="reminders" element={<PatientReminders />} />
            <Route path="documents" element={<PatientDocuments />} />
          </Route>

          {/* Public emergency QR view */}
          <Route path="/emergency/:token" element={<EmergencyView />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
