import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Loader2, Upload, FileAudio, X, CheckCircle2 } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

const ACCEPTED_AUDIO = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/x-m4a']
const ACCEPTED_EXT = '.wav,.mp3,.webm,.ogg,.m4a,.aac,.flac'

export default function AudioRecorder({ patientId, onResult, onPartialTranscript }) {
  const [mode, setMode] = useState('record') // 'record' | 'upload'

  // ── Recording state ──
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [duration, setDuration] = useState(0)
  const [qualityScore, setQualityScore] = useState(null)
  const [noiseReduced, setNoiseReduced] = useState(false)
  const [hasFailedUpload, setHasFailedUpload] = useState(false)

  // ── Upload state ──
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadDragOver, setUploadDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // null | 'uploading' | 'done' | 'error'
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  const mediaRecorderRef = useRef(null)
  const timerRef = useRef(null)
  const chunkTimerRef = useRef(null)
  const canvasRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)
  const streamRef = useRef(null)

  const transcriptRef = useRef("")
  const isStoppingRef = useRef(false)

  // ── Waveform ────────────────────────────────────────────────────────────────
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.lineWidth = 3
      ctx.strokeStyle = isRecording ? '#ef4444' : '#0ea5e9'
      ctx.beginPath()
      const sliceWidth = canvas.width / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }
    draw()
  }, [isRecording])

  // ── IndexedDB helpers ───────────────────────────────────────────────────────
  const initDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open("audioBackupDB", 1)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains("chunks")) db.createObjectStore("chunks", { keyPath: "id", autoIncrement: true })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  const saveChunkToIDB = async (blob) => {
    try { const db = await initDB(); const tx = db.transaction("chunks", "readwrite"); tx.objectStore("chunks").add({ blob, timestamp: Date.now(), patientId }) } catch (e) { console.error("Local backup failed:", e) }
  }
  const clearIDB = async () => {
    try { const db = await initDB(); const tx = db.transaction("chunks", "readwrite"); tx.objectStore("chunks").clear() } catch (e) { console.error("Local clear failed:", e) }
  }
  const retryFailedUploads = async () => {
    setHasFailedUpload(false); setIsProcessing(true)
    try {
      const db = await initDB()
      const tx = db.transaction("chunks", "readonly")
      const req = tx.objectStore("chunks").getAll()
      req.onsuccess = async () => {
        const chunks = req.result
        if (!chunks?.length) return
        for (const r of chunks) await processChunk(r.blob, false)
        await processFinalText()
      }
    } catch (e) { console.error("Retry failed:", e) } finally { setIsProcessing(false) }
  }

  // ── Recording logic ─────────────────────────────────────────────────────────
  const setupAndStartRecorder = () => {
    if (!streamRef.current) return
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
    })
    let localChunks = []
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) localChunks.push(e.data) }
    mediaRecorder.onstop = () => { const blob = new Blob(localChunks, { type: 'audio/webm' }); processChunk(blob) }
    mediaRecorder.start(1000)
    mediaRecorderRef.current = mediaRecorder
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } })
      streamRef.current = stream
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser
      transcriptRef.current = ""
      isStoppingRef.current = false
      setDuration(0); setQualityScore(null); setHasFailedUpload(false); setIsRecording(true)
      await clearIDB()
      setupAndStartRecorder()
      timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000)
      chunkTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.stop(); setupAndStartRecorder() }
      }, 25000)
      drawWaveform()
    } catch (err) {
      console.error('Microphone access denied:', err)
      alert('Please allow microphone access to record consultations.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isStoppingRef.current = true
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }

  const processChunk = async (blob, saveLocal = true) => {
    setIsProcessing(true)
    if (saveLocal) await saveChunkToIDB(blob)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'chunk.webm')
      formData.append('session_id', patientId)
      const response = await axios.post(`${API}/api/audio/stream-chunk`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
      const newText = response.data.transcript
      if (newText?.trim().length > 0) {
        transcriptRef.current = transcriptRef.current + " " + newText
        if (onPartialTranscript) onPartialTranscript(transcriptRef.current.trim())
      }
      if (isStoppingRef.current) await processFinalText()
      else setIsProcessing(false)
    } catch (err) {
      console.error('Chunk processing failed. Saved to local backup:', err)
      setHasFailedUpload(true)
      setIsProcessing(false)
    }
  }

  const processFinalText = async () => {
    try {
      const payload = { transcript: transcriptRef.current.trim(), patient_id: patientId, language_detected: "unknown", audio_quality_score: qualityScore || 0.8 }
      if (payload.transcript.length < 5) { alert("Not enough speech detected. Please try recording again."); return }
      const response = await axios.post(`${API}/api/audio/process-text`, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 120000 })
      await clearIDB()
      if (onResult) onResult(response.data)
    } catch (err) {
      console.error('Final text processing failed:', err)
      setHasFailedUpload(true)
      alert(err.response?.data?.detail || 'Failed to analyze text data. Network dropped mid-consultation.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Upload logic ────────────────────────────────────────────────────────────
  const handleFileDrop = (e) => {
    e.preventDefault()
    setUploadDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) validateAndSetFile(file)
  }

  const validateAndSetFile = (file) => {
    setUploadError('')
    const isAudio = ACCEPTED_AUDIO.includes(file.type) || file.name.match(/\.(wav|mp3|webm|ogg|m4a|aac|flac)$/i)
    if (!isAudio) { setUploadError('Unsupported format. Please upload a WAV, MP3, M4A, WebM, OGG, FLAC, or AAC file.'); return }
    if (file.size > 100 * 1024 * 1024) { setUploadError('File too large. Maximum size is 100 MB.'); return }
    setUploadFile(file)
    setUploadProgress(null)
  }

  const handleUploadSubmit = async () => {
    if (!uploadFile || !patientId) return
    setUploadProgress('uploading')
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('audio', uploadFile, uploadFile.name)
      formData.append('patient_id', patientId)
      const response = await axios.post(`${API}/api/audio/process`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      })
      setUploadProgress('done')
      if (onResult) onResult(response.data)
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadProgress('error')
      setUploadError(err.response?.data?.detail || 'Upload failed. Please check your file and try again.')
    }
  }

  const clearUpload = () => {
    setUploadFile(null)
    setUploadProgress(null)
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const formatBytes = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div className="glass-card space-y-5 p-5 md:p-7">
      {/* Header + Mode toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Audio Intake</p>
          <h3 className="mt-1.5 text-2xl font-semibold text-slate-950">Consultation recording</h3>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            {mode === 'record'
              ? 'Tap once to start, tap again to stop. Summary will be prepared automatically.'
              : 'Upload a pre-recorded audio file of the consultation.'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start">
          <button
            onClick={() => setMode('record')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'record' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Mic className="w-3.5 h-3.5" /> Record
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        </div>
      </div>

      {/* ── RECORD MODE ── */}
      {mode === 'record' && (
        <>
          <div className="waveform-container overflow-hidden rounded-[18px] bg-gradient-to-b from-slate-50 to-cyan-50">
            <canvas ref={canvasRef} width={600} height={100} className="h-28 w-full md:h-32" />
          </div>

          <div className="flex flex-col items-center gap-6 rounded-[20px] bg-slate-50 p-6 text-center sm:p-8">
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              isProcessing ? 'bg-amber-100 text-amber-700' : isRecording ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isProcessing && isStoppingRef.current ? 'Preparing summary' : isRecording ? 'Recording' : 'Ready'}
            </span>

            {isProcessing && isStoppingRef.current ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-white shadow-[0_20px_45px_-24px_rgba(8,145,178,0.65)]">
                  <Loader2 className="h-11 w-11 animate-spin text-cyan-700" />
                </div>
                <span className="text-sm font-semibold text-cyan-700">Preparing clinical summary...</span>
              </div>
            ) : (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-[0_24px_40px_-24px_rgba(15,23,42,0.8)] transition-all duration-300 hover:scale-[1.03] md:h-28 md:w-28 ${
                  isRecording ? 'pulse-record bg-gradient-to-br from-rose-500 to-rose-700' : 'bg-gradient-to-br from-cyan-600 to-teal-700'
                }`}
              >
                {isRecording ? <Square className="h-9 w-9 text-white" fill="white" /> : <Mic className="h-9 w-9 text-white" />}
              </button>
            )}

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3">
                <p className="font-mono text-3xl font-bold text-slate-950 md:text-4xl">{formatTime(duration)}</p>
                {isRecording && (
                  <span className="text-sm text-red-500 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> REC
                  </span>
                )}
              </div>
              <h4 className="mt-3 text-2xl font-semibold text-slate-950">
                {isRecording ? 'Tap to stop the capture' : 'Tap to begin the visit'}
              </h4>

              <div className="mt-2 flex gap-2">
                {hasFailedUpload && !isRecording && (
                  <button onClick={retryFailedUploads} className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap">
                    Retry Last Audio
                  </button>
                )}
                {noiseReduced && (
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-3 py-1.5 rounded-full border border-yellow-200">Noise reduced</span>
                )}
              </div>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 text-center">
                {isProcessing && isStoppingRef.current
                  ? 'The transcript is now being converted into structured clinical output.'
                  : 'Keep the phone or microphone near the conversation and speak normally.'}
              </p>
            </div>

            <p className="text-xs text-slate-400">Auto-splits every 25s to comply with ASR limits.</p>
          </div>
        </>
      )}

      {/* ── UPLOAD MODE ── */}
      {mode === 'upload' && (
        <div className="space-y-4">
          {/* Drop zone */}
          {!uploadFile ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setUploadDragOver(true) }}
              onDragLeave={() => setUploadDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
                uploadDragOver
                  ? 'border-cyan-400 bg-cyan-50 scale-[1.01]'
                  : 'border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50/40'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-100 to-teal-50 flex items-center justify-center shadow-inner">
                <FileAudio className="w-8 h-8 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Drop your audio file here</p>
                <p className="text-xs text-slate-500 mt-1">or click to browse files</p>
                <p className="text-[11px] text-slate-400 mt-2">WAV · MP3 · M4A · WebM · OGG · FLAC · AAC · up to 100 MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXT}
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            /* File preview card */
            <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                <FileAudio className="w-6 h-6 text-cyan-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{uploadFile.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatBytes(uploadFile.size)} · {uploadFile.type || 'audio'}</p>
                {uploadProgress === 'uploading' && (
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full animate-[shimmer_1.5s_infinite]" style={{ width: '60%' }} />
                  </div>
                )}
              </div>
              {uploadProgress === 'done' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : uploadProgress !== 'uploading' && (
                <button onClick={clearUpload} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Error message */}
          {uploadError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              {uploadError}
            </div>
          )}

          {/* Success message */}
          {uploadProgress === 'done' && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Audio processed successfully! Clinical summary is ready.
            </div>
          )}

          {/* Submit button */}
          {uploadFile && uploadProgress !== 'done' && (
            <button
              onClick={handleUploadSubmit}
              disabled={uploadProgress === 'uploading'}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-700 to-teal-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {uploadProgress === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing audio…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload &amp; Analyze
                </>
              )}
            </button>
          )}

          {uploadProgress !== 'done' && (
            <p className="text-center text-xs text-slate-400">
              Audio is sent to Sarvam ASR for transcription, then analyzed by the AI pipeline.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
