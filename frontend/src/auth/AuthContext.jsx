import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('vc_token'))
  const [loading, setLoading] = useState(true)

  // On mount, verify stored token
  useEffect(() => {
    if (token) {
      verifyToken()
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async () => {
    try {
      const res = await axios.get(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(res.data)
    } catch (err) {
      console.error('Token verification failed:', err)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const res = await axios.post(`${API}/api/auth/login`, { email, password })
    const { token: newToken, user: userData } = res.data
    localStorage.setItem('vc_token', newToken)
    setToken(newToken)
    setUser(userData)
    return userData
  }

  const register = async (data) => {
    const res = await axios.post(`${API}/api/auth/register`, data)
    const { token: newToken, user: userData } = res.data
    localStorage.setItem('vc_token', newToken)
    setToken(newToken)
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('vc_token')
    localStorage.removeItem('pd_session')
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isDoctor: user?.role === 'doctor',
    isPatient: user?.role === 'patient',
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// Axios interceptor helper — attach token to all API calls
export function getAuthHeaders() {
  const token = localStorage.getItem('vc_token')
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export default AuthContext
