import { useState, useEffect } from 'react'
import { FileText, Plus, Upload, Eye, FlaskConical, Image, ClipboardList } from 'lucide-react'
import { getDocuments, addDocument } from '../patientApi'

export default function PatientDocuments() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newDoc, setNewDoc] = useState({
    doc_type: 'lab_report', title: '', report_date: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await getDocuments()
      setData(res)
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    try {
      await addDocument(newDoc)
      setShowAdd(false)
      setNewDoc({ doc_type: 'lab_report', title: '', report_date: '' })
      loadData()
    } catch (err) {
      console.error('Failed to add document:', err)
    }
  }

  const docTypeConfig = {
    lab_report: { icon: FlaskConical, color: '#0d9488', bg: '#f0fdfa', label: 'Lab Report' },
    scan: { icon: Image, color: '#6366f1', bg: '#eef2ff', label: 'Scan' },
    prescription: { icon: ClipboardList, color: '#f59e0b', bg: '#fffbeb', label: 'Prescription' },
    discharge_summary: { icon: FileText, color: '#ec4899', bg: '#fdf2f8', label: 'Discharge' },
    other: { icon: FileText, color: '#64748b', bg: '#f8fafc', label: 'Other' },
  }

  if (loading) {
    return (
      <div className="pd-page-content" style={{ paddingTop: 24 }}>
        {[1,2,3].map(i => <div key={i} className="pd-skeleton" style={{ height: 80, marginBottom: 16 }} />)}
      </div>
    )
  }

  const documents = data?.documents || []

  return (
    <div>
      <div className="pd-header">
        <div className="pd-header-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <FileText size={20} />
                <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Health Reports
                </span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {documents.length} Document{documents.length !== 1 ? 's' : ''}
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
              <Plus size={16} /> Upload
            </button>
          </div>
        </div>
      </div>

      <div className="pd-page-content" style={{ marginTop: -8, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {documents.length === 0 ? (
          <div className="pd-card" style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>📄</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>No documents yet</p>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>
              Upload lab reports, prescriptions, and scans
            </p>
            <button className="pd-btn pd-btn-primary" onClick={() => setShowAdd(true)}>
              <Upload size={16} /> Upload Document
            </button>
          </div>
        ) : (
          documents.map((doc, i) => {
            const config = docTypeConfig[doc.doc_type] || docTypeConfig.other
            const Icon = config.icon
            return (
              <div key={doc.id || i} className="pd-doc-card">
                <div className="pd-doc-icon" style={{ background: config.bg }}>
                  <Icon size={20} style={{ color: config.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <span className="pd-pill" style={{ fontSize: 10, padding: '2px 8px' }}>
                      {config.label}
                    </span>
                    {doc.report_date && (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {new Date(doc.report_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Extracted data */}
                  {doc.extracted_data && Object.keys(doc.extracted_data).length > 0 && (
                    <div style={{
                      marginTop: 8, padding: '8px 10px', borderRadius: 8,
                      background: '#f0fdf4', border: '1px solid #bbf7d0'
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>
                        🤖 AI Extracted Values
                      </p>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {Object.entries(doc.extracted_data).map(([key, val]) => (
                          <span key={key} style={{ fontSize: 11, color: '#0f172a' }}>
                            <span style={{ color: '#64748b' }}>{key}:</span> <strong>{val}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Document Modal */}
      {showAdd && (
        <div className="pd-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="pd-modal" onClick={e => e.stopPropagation()}>
            <div className="pd-modal-handle" />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
              📄 Upload Document
            </h3>

            <label className="pd-label">Document Type</label>
            <select
              className="pd-input"
              value={newDoc.doc_type}
              onChange={e => setNewDoc({...newDoc, doc_type: e.target.value})}
              style={{ marginBottom: 12 }}
            >
              <option value="lab_report">Lab Report</option>
              <option value="scan">Scan / X-ray</option>
              <option value="prescription">Prescription</option>
              <option value="discharge_summary">Discharge Summary</option>
              <option value="other">Other</option>
            </select>

            <label className="pd-label">Title</label>
            <input
              type="text"
              className="pd-input"
              placeholder="e.g., HbA1c Report — March 2024"
              value={newDoc.title}
              onChange={e => setNewDoc({...newDoc, title: e.target.value})}
              style={{ marginBottom: 12 }}
            />

            <label className="pd-label">Report Date</label>
            <input
              type="date"
              className="pd-input"
              value={newDoc.report_date}
              onChange={e => setNewDoc({...newDoc, report_date: e.target.value})}
              style={{ marginBottom: 16 }}
            />

            {/* Upload area placeholder */}
            <div style={{
              border: '2px dashed #e2e8f0', borderRadius: 16,
              padding: 32, textAlign: 'center', marginBottom: 20,
              background: '#f8fafc'
            }}>
              <Upload size={32} style={{ color: '#94a3b8', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                Tap to upload or take a photo
              </p>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                PDF, JPG, PNG (max 10MB)
              </p>
            </div>

            <button
              className="pd-btn pd-btn-primary pd-btn-full"
              onClick={handleAdd}
              disabled={!newDoc.title}
            >
              Save Document
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
