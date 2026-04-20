import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Mail, Lock, ArrowRight, Stethoscope, Heart, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const user = await login(email, password)
      if (user.role === 'doctor') {
        navigate('/', { replace: true })
      } else {
        navigate('/pd', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 40%, #eff6ff 100%)',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: '-80px', right: '-80px',
        width: 350, height: 350, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(13,148,136,0.08), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-60px',
        width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent)',
        pointerEvents: 'none',
      }} />

      <div style={{
        background: 'white',
        borderRadius: 24,
        padding: '48px 36px',
        maxWidth: 420,
        width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #0d9488, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(13,148,136,0.25)',
          }}>
            <Stethoscope size={32} color="white" />
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: '#0f172a',
            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            marginBottom: 6,
          }}>
            Voice Clinic
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            Sign in to your dashboard
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: '#475569', marginBottom: 6,
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8',
              }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                autoFocus
                style={{
                  width: '100%', padding: '14px 16px 14px 42px',
                  borderRadius: 12, border: '2px solid #e2e8f0',
                  fontSize: 15, outline: 'none', transition: 'border-color 0.2s',
                  fontFamily: 'inherit', background: '#fafafa',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#0d9488'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: '#475569', marginBottom: 6,
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8',
              }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '14px 44px 14px 42px',
                  borderRadius: 12, border: '2px solid #e2e8f0',
                  fontSize: 15, outline: 'none', transition: 'border-color 0.2s',
                  fontFamily: 'inherit', background: '#fafafa',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#0d9488'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', padding: 4,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', fontSize: 13, marginBottom: 16,
              textAlign: 'center', fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px 24px',
              borderRadius: 12, border: 'none',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0d9488, #0f766e)',
              color: 'white', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s', fontFamily: 'inherit',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(13,148,136,0.3)',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Register link */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{
              color: '#0d9488', fontWeight: 600, textDecoration: 'none',
            }}>
              Create Account
            </Link>
          </p>
        </div>

        {/* Demo hints */}
        <div style={{
          marginTop: 24, padding: '16px 18px',
          background: 'linear-gradient(135deg, #f0fdfa, #ecfdf5)',
          borderRadius: 14, border: '1px solid #ccfbf1',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', marginBottom: 8 }}>
            🧪 Quick Start — Register with any email
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Stethoscope size={12} style={{ color: '#0d9488' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0f766e' }}>Doctor</span>
              </div>
              <p style={{ fontSize: 10, color: '#64748b' }}>
                Invite code: <strong>CLINIC2024</strong>
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Heart size={12} style={{ color: '#6366f1' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1' }}>Patient</span>
              </div>
              <p style={{ fontSize: 10, color: '#64748b' }}>
                No invite code needed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
