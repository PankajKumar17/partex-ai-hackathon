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
      setIsRecording(true)

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

  const processChunk = async (blob) => {
    setIsProcessing(true)
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
      console.error('Chunk processing failed:', err)
      // Allow user to seamlessly continue recording even if a segment failed Sarvam
      if (isStoppingRef.current) {
        // even if last chunk failed, process the aggregated bits we DO have
        await processFinalText()
      } else {
        setIsProcessing(false)
      }
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

      if (onResult) onResult(response.data)
    } catch (err) {
      console.error('Final text processing failed:', err)
      const msg = err.response?.data?.detail || 'Failed to analyze text data. Please try again.'
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Audio Recorder</h3>
      </div>

      <div className="waveform-container p-3">
        <canvas
          ref={canvasRef}
          width={600}
          height={80}
          className="w-full h-20 rounded-lg bg-slate-50 border border-slate-200"
        />
      </div>

      <div className="flex items-center justify-center gap-6">
        <span className="text-2xl font-mono text-slate-600 w-20 text-center">
          {formatTime(duration)}
        </span>

        {isProcessing && isStoppingRef.current ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <span className="text-sm text-slate-500">Analyzing...</span>
          </div>
        ) : (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 pulse-record text-white'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isRecording ? (
              <Square className="w-6 h-6 text-white" fill="white" />
            ) : (
              <Mic className="w-7 h-7 text-white" />
            )}
          </button>
        )}

        <div className="w-20 text-center">
          {isRecording && (
            <span className="text-sm text-red-500 flex items-center gap-1 font-semibold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC
            </span>
          )}
          {noiseReduced && (
            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full border border-yellow-200">
              Noise reduced
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
