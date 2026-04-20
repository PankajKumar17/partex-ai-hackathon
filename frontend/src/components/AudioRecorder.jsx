import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || ''

export default function AudioRecorder({ patientId, onResult, onPartialTranscript }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [duration, setDuration] = useState(0)
  const [qualityScore, setQualityScore] = useState(null)
  const [noiseReduced, setNoiseReduced] = useState(false)
  const [hasFailedUpload, setHasFailedUpload] = useState(false)

  const mediaRecorderRef = useRef(null)
  const timerRef = useRef(null)
  const chunkTimerRef = useRef(null)
  const canvasRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)
  const streamRef = useRef(null)
  
  const transcriptRef = useRef("")
  const isStoppingRef = useRef(false)

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

      ctx.fillStyle = 'rgba(248, 250, 252, 1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 2
      ctx.strokeStyle = isRecording ? '#ef4444' : '#2563eb'
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

  // --- IndexedDB Local Backup Helpers ---
  const initDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("audioBackupDB", 1)
      request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains("chunks")) {
          db.createObjectStore("chunks", { keyPath: "id", autoIncrement: true })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  const saveChunkToIDB = async (blob) => {
    try {
      const db = await initDB()
      const tx = db.transaction("chunks", "readwrite")
      tx.objectStore("chunks").add({ blob, timestamp: Date.now(), patientId })
    } catch (e) {
      console.error("Local backup failed:", e)
    }
  }

  const clearIDB = async () => {
    try {
      const db = await initDB()
      const tx = db.transaction("chunks", "readwrite")
      tx.objectStore("chunks").clear()
    } catch (e) {
      console.error("Local clear failed:", e)
    }
  }

  const retryFailedUploads = async () => {
    setHasFailedUpload(false)
    setIsProcessing(true)
    try {
      const db = await initDB()
      const tx = db.transaction("chunks", "readonly")
      const store = tx.objectStore("chunks")
      const request = store.getAll()
      
      request.onsuccess = async () => {
        const chunks = request.result
        if (!chunks || chunks.length === 0) return
        
        for (const record of chunks) {
          // Process previously failed chunks
          await processChunk(record.blob, false) 
        }
        await processFinalText()
      }
    } catch (e) {
      console.error("Retry failed:", e)
    } finally {
      setIsProcessing(false)
    }
  }
  // --------------------------------------

  const setupAndStartRecorder = () => {
    if (!streamRef.current) return
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
    })
    
    // We need a local ref to chunks to ensure closure accuracy
    let localChunks = []
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) localChunks.push(e.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(localChunks, { type: 'audio/webm' })
      processChunk(blob)
    }

    mediaRecorder.start(1000)
    mediaRecorderRef.current = mediaRecorder
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      })
      streamRef.current = stream

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser

      transcriptRef.current = ""
      isStoppingRef.current = false
      setDuration(0)
      setQualityScore(null)
      setHasFailedUpload(false)
      setIsRecording(true)

      await clearIDB() // Clear old backups for new session

      setupAndStartRecorder()

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)

      // Cycle recorder every 25s perfectly to bypass Sarvam 30s limit
      chunkTimerRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop()
            setupAndStartRecorder() // immediately restart new container
        }
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }

  const processChunk = async (blob, saveLocal = true) => {
    setIsProcessing(true)
    
    // 1. Save to IndexedDB local backup before network request (if not retrying)
    if (saveLocal) {
      await saveChunkToIDB(blob)
    }

    try {
      const formData = new FormData()
      formData.append('audio', blob, 'chunk.webm')
      formData.append('session_id', patientId)

      const response = await axios.post(`${API}/api/audio/stream-chunk`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      })

      const newText = response.data.transcript
      if (newText && newText.trim().length > 0) {
        transcriptRef.current = transcriptRef.current + " " + newText
        if (onPartialTranscript) onPartialTranscript(transcriptRef.current.trim())
      }
      
      // If we flagged stopping, THIS is the last chunk, process Gemini!
      if (isStoppingRef.current) {
        await processFinalText()
      } else {
        setIsProcessing(false) // just turning off spinner if user is still talking
      }
    } catch (err) {
      console.error('Chunk processing failed. Saved to local backup:', err)
      setHasFailedUpload(true)
      
      // We do not immediately trigger processFinalText here to allow the doctor to retry uploading later
      setIsProcessing(false)
    }
  }

  const processFinalText = async () => {
    try {
      const payload = {
        transcript: transcriptRef.current.trim(),
        patient_id: patientId,
        language_detected: "unknown",
        audio_quality_score: qualityScore || 0.8
      }

      if (payload.transcript.length < 5) {
         alert("Not enough speech detected. Please try recording again.")
         return
      }

      const response = await axios.post(`${API}/api/audio/process-text`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000,
      })

      // Clean local backup on full success
      await clearIDB()
      
      if (onResult) onResult(response.data)
    } catch (err) {
      console.error('Final text processing failed:', err)
      setHasFailedUpload(true)
      const msg = err.response?.data?.detail || 'Failed to analyze text data. Network dropped mid-consultation.'
      alert(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
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
    <div className="glass-card space-y-6 p-5 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Audio Intake</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Consultation recording</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Tap once to start, tap again to stop. The visit summary will be prepared automatically.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          AI assisted
        </span>
      </div>

      <div className="waveform-container overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={100}
          className="h-28 w-full rounded-[18px] bg-gradient-to-b from-white to-cyan-50 md:h-32"
          style={{ mixBlendMode: 'screen' }}
        />
      </div>

      <div className="flex flex-col items-center gap-6 rounded-[24px] bg-slate-50 p-6 text-center sm:p-8">
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
          isProcessing
            ? 'bg-amber-100 text-amber-700'
            : isRecording
            ? 'bg-rose-100 text-rose-700'
            : 'bg-emerald-100 text-emerald-700'
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
              isRecording
                ? 'pulse-record bg-gradient-to-br from-rose-500 to-rose-700'
                : 'bg-gradient-to-br from-cyan-600 to-teal-700'
            }`}
          >
            {isRecording ? (
              <Square className="h-9 w-9 text-white" fill="white" />
            ) : (
              <Mic className="h-9 w-9 text-white" />
            )}
          </button>
        )}

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3">
            <p className="font-mono text-3xl font-bold text-slate-950 md:text-4xl">
              {formatTime(duration)}
            </p>
            {isRecording && (
              <span className="text-sm text-red-500 flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                REC
              </span>
            )}
          </div>
          <h4 className="mt-3 text-2xl font-semibold text-slate-950">
            {isRecording ? 'Tap to stop the capture' : 'Tap to begin the visit'}
          </h4>
          
          <div className="mt-2 flex gap-2">
            {hasFailedUpload && !isRecording && (
              <button 
                onClick={retryFailedUploads}
                className="text-xs text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap"
              >
                Retry Last Audio
              </button>
            )}
            {noiseReduced && (
              <span className="text-xs text-yellow-600 bg-yellow-100 px-3 py-1.5 rounded-full border border-yellow-200">
                Noise reduced
              </span>
            )}
          </div>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 text-center">
            {isProcessing && isStoppingRef.current
              ? 'The transcript is now being converted into structured clinical output.'
              : 'Keep the phone or microphone near the conversation and speak normally.'}
          </p>
        </div>

        <p className="text-xs text-slate-500">
          The system will create a transcript, extract findings, and prepare the visit summary automatically.
        </p>
      </div>
    </div>
  )
}
