import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Mail, Lock, User, Phone, Stethoscope, Heart, ArrowRight, Eye, EyeOff, Hash } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [role, setRole] = useState('patient')
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    phone: '', age: '', gender: 'Male', invite_code: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (key, val) => setForm({ ...form, [key]: val })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      setError('Please fill in all required fields')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const user = await register({
        ...form,
        role,
        age: form.age ? parseInt(form.age) : 30,
      })
      if (user.role === 'doctor') {
        navigate('/', { replace: true })
      } else {
        navigate('/pd', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px 12px 40px',
    borderRadius: 12, border: '2px solid #e2e8f0',
    fontSize: 14, outline: 'none', transition: 'border-color 0.2s',
    fontFamily: 'inherit', background: '#fafafa',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 40%, #eff6ff 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '-80px', left: '-80px',
        width: 350, height: 350, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent)',
        pointerEvents: 'none',
      }} />

      <div style={{
        background: 'white', borderRadius: 24,
        padding: '40px 32px', maxWidth: 440, width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.08)',
        position: 'relative', zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: 'linear-gradient(135deg, #0d9488, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 8px 24px rgba(13,148,136,0.25)',
          }}>
            <User size={28} color="white" />
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: '#0f172a',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginBottom: 4,
          }}>
            Create Account
          </h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            Join Voice Clinic as a doctor or patient
          </p>
        </div>

        {/* Role Tabs */}
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: '#f1f5f9', borderRadius: 12, marginBottom: 24,
        }}>
          {[
            { key: 'patient', label: 'Patient', icon: Heart, color: '#6366f1' },
            { key: 'doctor', label: 'Doctor', icon: Stethoscope, color: '#0d9488' },
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 8,
                background: role === key ? 'white' : 'transparent',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontWeight: 600, fontSize: 13,
                color: role === key ? color : '#94a3b8',
                boxShadow: role === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
                placeholder={role === 'doctor' ? 'Dr. Sunita Sharma' : 'Ramesh Patil'}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#0d9488'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
              Email *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com" style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#0d9488'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type={showPass ? 'text' : 'password'} value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="Min 6 characters" style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={(e) => e.target.style.borderColor = '#0d9488'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4,
              }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Patient-specific fields */}
          {role === 'patient' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Phone</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)}
                    placeholder="9876543210"
                    style={{ ...inputStyle, padding: '10px 10px 10px 32px', fontSize: 13 }}
                    onFocus={(e) => e.target.style.borderColor = '#0d9488'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Age</label>
                <input type="number" value={form.age} onChange={(e) => update('age', e.target.value)}
                  placeholder="30"
                  style={{ ...inputStyle, paddingLeft: 14, fontSize: 13 }}
                  onFocus={(e) => e.target.style.borderColor = '#0d9488'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Gender</label>
                <select value={form.gender} onChange={(e) => update('gender', e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 14, fontSize: 13, cursor: 'pointer' }}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
          )}

          {/* Doctor invite code */}
          {role === 'doctor' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                Clinic Invite Code *
              </label>
              <div style={{ position: 'relative' }}>
                <Hash size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text" value={form.invite_code}
                  onChange={(e) => update('invite_code', e.target.value.toUpperCase())}
                  placeholder="Enter clinic code" style={inputStyle}
                  onFocus={(e) => e.target.style.borderColor = '#0d9488'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                Demo code: <strong>CLINIC2024</strong>
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#dc2626', fontSize: 13, marginBottom: 14,
              textAlign: 'center', fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '14px 24px',
            borderRadius: 12, border: 'none',
            background: loading ? '#94a3b8' : (role === 'doctor'
              ? 'linear-gradient(135deg, #0d9488, #0f766e)'
              : 'linear-gradient(135deg, #6366f1, #4f46e5)'),
            color: 'white', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s', fontFamily: 'inherit',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(13,148,136,0.3)',
          }}>
            {loading ? 'Creating account...' : `Register as ${role === 'doctor' ? 'Doctor' : 'Patient'}`}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {/* Login link */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#0d9488', fontWeight: 600, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
