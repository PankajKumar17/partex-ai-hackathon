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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Prescription</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBrands(!showBrands)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            {showBrands ? (
              <ToggleRight className="w-5 h-5 text-primary" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-500" />
            )}
            {showBrands ? 'Brands' : 'Generic'}
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading || !visitId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PDF
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white/5 rounded-xl p-4 border border-slate-200">
        <div className="text-center mb-3 pb-3 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-900">🏥 Voice-Driven Clinic</p>
          <p className="text-[10px] text-slate-500">AI-Powered Healthcare</p>
        </div>

        <div className="mb-3">
          <p className="text-[10px] text-slate-500 font-semibold">℞ MEDICATIONS</p>
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
          <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-[10px] text-red-400 font-semibold">⚠️ Drug Interactions</p>
            {drugInteractions.map((di, idx) => (
              <p key={idx} className="text-[10px] text-red-300 mt-1">
                {di.drug1} + {di.drug2}: {di.description}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
