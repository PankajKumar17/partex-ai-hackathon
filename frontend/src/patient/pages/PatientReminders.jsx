import { useState, useEffect } from 'react'
import { Bell, Plus, Pill, Calendar, Activity, TestTube, Trash2, Edit3 } from 'lucide-react'
import { getReminders, createReminder, updateReminder, deleteReminder } from '../patientApi'

export default function PatientReminders() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newReminder, setNewReminder] = useState({
    type: 'medication', title: '', body: '',
    medication_name: '', recurrence: 'daily',
    recurrence_times: ['08:00'], channel: ['push']
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await getReminders()
      setData(res)
    } catch (err) {
      console.error('Failed to load reminders:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      await createReminder(newReminder)
      setShowAdd(false)
      setNewReminder({ type: 'medication', title: '', body: '', medication_name: '', recurrence: 'daily', recurrence_times: ['08:00'], channel: ['push'] })
      loadData()
    } catch (err) {
      console.error('Failed to create reminder:', err)
    }
  }

  const handleToggle = async (reminder) => {
    try {
      await updateReminder(reminder.id, { active: !reminder.active })
      loadData()
    } catch (err) {
      console.error('Failed to toggle reminder:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this reminder?')) return
    try {
      await deleteReminder(id)
      loadData()
    } catch (err) {
      console.error('Failed to delete reminder:', err)
    }
  }

  const typeConfig = {
    medication: { icon: Pill, color: '#0d9488', bg: '#f0fdfa', label: 'Medication' },
    appointment: { icon: Calendar, color: '#6366f1', bg: '#eef2ff', label: 'Appointment' },
    vitals: { icon: Activity, color: '#f59e0b', bg: '#fffbeb', label: 'Vitals' },
    test: { icon: TestTube, color: '#ec4899', bg: '#fdf2f8', label: 'Test' },
  }

  if (loading) {
    return (
      <div className="pd-page-content" style={{ paddingTop: 24 }}>
        {[1,2,3].map(i => <div key={i} className="pd-skeleton" style={{ height: 80, marginBottom: 16 }} />)}
      </div>
    )
  }

  const reminders = data?.reminders || []
  const grouped = {
    medication: reminders.filter(r => r.type === 'medication'),
    appointment: reminders.filter(r => r.type === 'appointment'),
    vitals: reminders.filter(r => r.type === 'vitals'),
    test: reminders.filter(r => r.type === 'test'),
  }

  return (
    <div>
      <div className="pd-header">
        <div className="pd-header-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Bell size={20} />
                <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  My Reminders
                </span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {reminders.length} Active Reminder{reminders.length !== 1 ? 's' : ''}
              </h1>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              style={{
                padding: '8px 14px', borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      </div>

      <div className="pd-page-content" style={{ marginTop: -8, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(grouped).map(([type, items]) => {
          if (items.length === 0) return null
          const config = typeConfig[type] || typeConfig.medication
          const Icon = config.icon

          return (
            <div key={type}>
              <p className="pd-section-title">{config.label} Reminders</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((reminder) => (
                  <div key={reminder.id} className="pd-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12,
                          background: config.bg, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Icon size={18} style={{ color: config.color }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                            {reminder.title}
                          </p>
                          {reminder.body && (
                            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              {reminder.body}
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                            <span className="pd-pill" style={{ fontSize: 10 }}>
                              🔔 {reminder.recurrence_times?.join(', ') || (reminder.remind_at ? new Date(reminder.remind_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Once')}
                            </span>
                            <span className="pd-pill" style={{ fontSize: 10 }}>
                              {reminder.recurrence}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <div
                          className={`pd-toggle ${reminder.active ? 'active' : ''}`}
                          onClick={() => handleToggle(reminder)}
                        />
                        <button
                          onClick={() => handleDelete(reminder.id)}
                          style={{
                            background: 'none', border: 'none', color: '#94a3b8',
                            cursor: 'pointer', padding: 4
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {reminders.length === 0 && (
          <div className="pd-card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>⏰</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>No reminders set</p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              Add reminders for medications, appointments, and health tasks
            </p>
            <button className="pd-btn pd-btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Reminder
            </button>
          </div>
        )}
      </div>

      {/* Add Reminder Modal */}
      {showAdd && (
        <div className="pd-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="pd-modal" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
              ⏰ New Reminder
            </h3>

            <label className="pd-label">Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {Object.entries(typeConfig).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button
                    key={key}
                    onClick={() => setNewReminder({...newReminder, type: key})}
                    style={{
                      padding: '10px 6px', borderRadius: 10,
                      background: newReminder.type === key ? cfg.bg : '#f8fafc',
                      border: `2px solid ${newReminder.type === key ? cfg.color : '#e2e8f0'}`,
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 4
                    }}
                  >
                    <Icon size={16} style={{ color: cfg.color }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                  </button>
                )
              })}
            </div>

            <label className="pd-label">Title</label>
            <input
              type="text"
              className="pd-input"
              placeholder="e.g., Metformin Morning"
              value={newReminder.title}
              onChange={e => setNewReminder({...newReminder, title: e.target.value})}
              style={{ marginBottom: 12 }}
            />

            <label className="pd-label">Description (optional)</label>
            <input
              type="text"
              className="pd-input"
              placeholder="e.g., Take after breakfast"
              value={newReminder.body}
              onChange={e => setNewReminder({...newReminder, body: e.target.value})}
              style={{ marginBottom: 12 }}
            />

            <label className="pd-label">Frequency</label>
            <select
              className="pd-input"
              value={newReminder.recurrence}
              onChange={e => setNewReminder({...newReminder, recurrence: e.target.value})}
              style={{ marginBottom: 12 }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="once">One-time</option>
            </select>

            <label className="pd-label">Time</label>
            <input
              type="time"
              className="pd-input"
              value={newReminder.recurrence_times[0] || '08:00'}
              onChange={e => setNewReminder({...newReminder, recurrence_times: [e.target.value]})}
              style={{ marginBottom: 20 }}
            />

            <button
              className="pd-btn pd-btn-primary pd-btn-full"
              onClick={handleCreate}
              disabled={!newReminder.title}
            >
              Create Reminder
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
