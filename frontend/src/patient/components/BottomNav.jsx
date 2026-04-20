import { NavLink } from 'react-router-dom'
import { Home, CreditCard, Calendar, Pill, Activity, Bell, FileText } from 'lucide-react'

const navItems = [
  { to: '/pd', icon: Home, label: 'Home', end: true },
  { to: '/pd/passport', icon: CreditCard, label: 'Passport' },
  { to: '/pd/visits', icon: Calendar, label: 'Visits' },
  { to: '/pd/medications', icon: Pill, label: 'Meds' },
  { to: '/pd/vitals', icon: Activity, label: 'Vitals' },
  { to: '/pd/reminders', icon: Bell, label: 'Alerts' },
  { to: '/pd/documents', icon: FileText, label: 'Docs' },
]

export default function BottomNav() {
  return (
    <nav className="pd-bottom-nav">
      {navItems.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `pd-nav-item ${isActive ? 'active' : ''}`}
        >
          <Icon size={20} strokeWidth={isActive => isActive ? 2.5 : 1.8} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="pd-sidebar">
      <div style={{
        padding: '8px 16px 24px', borderBottom: '1px solid var(--pd-border)',
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #0d9488, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18
          }}>🏥</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Patient Portal</p>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Health Dashboard</p>
          </div>
        </div>
      </div>
      {navItems.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `pd-nav-item ${isActive ? 'active' : ''}`}
        >
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </aside>
  )
}
