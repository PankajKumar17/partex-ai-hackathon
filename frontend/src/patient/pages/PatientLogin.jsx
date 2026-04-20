import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, ArrowRight, Shield, Heart } from 'lucide-react'
import { login } from '../patientApi'
import '../patient.css'

export default function PatientLogin() {
  const navigate = useNavigate()
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const otpRefs = useRef([])

  const handlePhoneSubmit = (e) => {
    e.preventDefault()
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }
    setError('')
    setStep('otp')
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits are filled
    if (newOtp.every(d => d !== '') && index === 5) {
      handleVerifyOtp(newOtp.join(''))
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOtp = async (otpCode) => {
    setLoading(true)
    setError('')
    try {
      const fullPhone = `+91${phone}`
      const session = await login(fullPhone)
      if (session?.patient_id) {
        navigate('/pd')
      } else {
        setError('No patient found with this number')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pd-login-page">
      {/* Floating decorative elements */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%',
        width: 60, height: 60, borderRadius: 16,
        background: 'rgba(13,148,136,0.08)', transform: 'rotate(15deg)'
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', right: '8%',
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(99,102,241,0.06)'
      }} />

      <div className="pd-login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, #0d9488, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 32,
            boxShadow: '0 8px 24px rgba(13,148,136,0.25)'
          }}>
            🏥
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: '#0f172a',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginBottom: 4
          }}>
            Patient Portal
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            Access your health records securely
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit}>
            <label className="pd-label">Mobile Number</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <div style={{
                padding: '14px 12px',
                borderRadius: 12,
                border: '2px solid #e2e8f0',
                background: '#f8fafc',
                color: '#64748b',
                fontWeight: 600,
                fontSize: 16,
                flexShrink: 0
              }}>
                +91
              </div>
              <input
                type="tel"
                className="pd-input"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
                autoFocus
                style={{ flex: 1 }}
              />
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                {error}
              </p>
            )}

            <button type="submit" className="pd-btn pd-btn-primary pd-btn-full" style={{ fontSize: 16 }}>
              <Phone size={18} />
              Send OTP
              <ArrowRight size={18} />
            </button>

            <div style={{
              marginTop: 24, padding: '14px 16px',
              background: '#f0fdfa', borderRadius: 12,
              border: '1px solid #ccfbf1'
            }}>
              <p style={{ fontSize: 12, color: '#0d9488', fontWeight: 600, marginBottom: 4 }}>
                🔒 Demo Mode
              </p>
              <p style={{ fontSize: 11, color: '#64748b' }}>
                Use phone: <strong>9876543210</strong> → Any 6-digit OTP
              </p>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ color: '#64748b', fontSize: 14 }}>
                Enter the 6-digit code sent to
              </p>
              <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 16 }}>
                +91-{phone}
              </p>
            </div>

            <div className="pd-otp-container" style={{ marginBottom: 24 }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="tel"
                  className="pd-otp-input"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  maxLength={1}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                {error}
              </p>
            )}

            {loading && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div className="pd-skeleton" style={{ width: 200, height: 16, margin: '0 auto' }} />
                <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>Verifying...</p>
              </div>
            )}

            <button
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError('') }}
              style={{
                background: 'none', border: 'none', color: '#0d9488',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'block', margin: '0 auto'
              }}
            >
              ← Change phone number
            </button>
          </div>
        )}
      </div>

      {/* Trust badges */}
      <div style={{
        display: 'flex', gap: 24, marginTop: 32,
        color: '#94a3b8', fontSize: 12
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Shield size={14} /> Secure
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Heart size={14} /> HIPAA Ready
        </span>
      </div>
    </div>
  )
}
