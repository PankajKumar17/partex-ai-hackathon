import { QRCodeSVG } from 'qrcode.react'

export default function QRCodeCard({ token, expiresAt }) {
  const baseUrl = window.location.origin
  const emergencyUrl = `${baseUrl}/emergency/${token}`

  return (
    <div className="pd-card pd-qr-card">
      <div style={{
        display: 'inline-block', padding: 16,
        background: 'white', borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        marginBottom: 16
      }}>
        <QRCodeSVG
          value={emergencyUrl}
          size={180}
          level="H"
          includeMargin={false}
          fgColor="#0f172a"
          bgColor="white"
        />
      </div>

      <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
        🚨 Emergency Access QR
      </p>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
        Any doctor can scan this to see your allergies & medications instantly.
      </p>
      <p style={{ fontSize: 11, color: '#94a3b8' }}>
        {expiresAt ? `Expires: ${new Date(expiresAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Valid for 1 year'}
      </p>

      <div style={{ marginTop: 12, padding: 10, background: 'rgba(13,148,136,0.08)', borderRadius: 8 }}>
        <p style={{ fontSize: 10, color: '#0d9488', wordBreak: 'break-all' }}>
          {emergencyUrl}
        </p>
      </div>
    </div>
  )
}
