import { useState } from 'react'
import { Download, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

export default function PrescriptionPreview({ visitId, medications = [], drugInteractions = [] }) {
  const [showBrands, setShowBrands] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!visitId) return
    setDownloading(true)
    try {
      const res = await axios.post(
        `${API}/api/prescription/generate`,
        { visit_id: visitId, show_brands: showBrands },
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `prescription_${visitId.substring(0, 8)}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF download failed:', err)
      alert('Failed to generate prescription PDF.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Prescription</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">Printable preview</h3>
        </div>
        <div className="flex shrink-0 items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBrands(!showBrands)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            {showBrands ? (
              <ToggleRight className="w-4 h-4 text-primary" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-500" />
            )}
            {showBrands ? 'Brands' : 'Generic'}
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || !visitId}
            className="flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-all hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3 h-3" />}
            Download PDF
          </button>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
        <div className="mb-3 border-b border-slate-200 pb-3 text-center">
          <p className="text-sm font-bold text-slate-900">Voice-Driven Clinic</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">AI assisted prescription sheet</p>
        </div>

        <div className="mb-3">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-500">MEDICATIONS</p>
        </div>

        {medications.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No medications to preview</p>
        ) : (
          <div className="space-y-2">
            {medications.map((med, idx) => (
              <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-200/50 last:border-0">
                <div>
                  <p className="text-xs font-medium text-slate-900">{med.generic_name}</p>
                  {showBrands && med.brand_names?.length > 0 && (
                    <p className="text-[10px] text-slate-500">({med.brand_names.join(', ')})</p>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  {med.dose} · {med.frequency} · {med.duration}
                </p>
              </div>
            ))}
          </div>
        )}

        {drugInteractions.length > 0 && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2">
            <p className="text-[10px] font-semibold text-rose-700">Drug interactions</p>
            {drugInteractions.map((di, idx) => (
              <p key={idx} className="mt-1 text-[10px] text-rose-600">
                {di.drug1} + {di.drug2}: {di.description}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
