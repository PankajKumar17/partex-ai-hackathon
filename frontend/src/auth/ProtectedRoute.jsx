import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * Route guard component.
 * Usage: <ProtectedRoute role="doctor"><Dashboard /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, role }) {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid #e2e8f0',
          borderTopColor: '#0d9488',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Role check: if a specific role is required, verify it
  if (role && user?.role !== role) {
    // Redirect to the correct dashboard
    if (user?.role === 'doctor') return <Navigate to="/" replace />
    if (user?.role === 'patient') return <Navigate to="/pd" replace />
    return <Navigate to="/login" replace />
  }

  return children
}
