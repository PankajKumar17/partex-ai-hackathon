import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Consultation from './pages/Consultation'
import PatientProfile from './pages/PatientProfile'
import Analytics from './pages/Analytics'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/consultation/:patientId" element={<Consultation />} />
        <Route path="/patient/:patientId" element={<PatientProfile />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </Router>
  )
}

export default App
