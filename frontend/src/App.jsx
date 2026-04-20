import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Consultation from './pages/Consultation'
import PatientProfile from './pages/PatientProfile'
import Analytics from './pages/Analytics'

// Patient Dashboard
import PatientApp from './patient/PatientApp'
import PatientLogin from './patient/pages/PatientLogin'
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
    <Router>
      <Routes>
        {/* Doctor Dashboard */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/consultation/:patientId" element={<Consultation />} />
        <Route path="/patient/:patientId" element={<PatientProfile />} />
        <Route path="/analytics" element={<Analytics />} />

        {/* Patient Dashboard */}
        <Route path="/pd/login" element={<PatientLogin />} />
        <Route path="/pd" element={<PatientApp />}>
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
  )
}

export default App
