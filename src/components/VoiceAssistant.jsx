import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state'
import { agentVoice } from '../api/agent'

const LOGO = '/assistant-vocal.png'
const CLIPS = ['salut', 'tech', 'inaudible', 'inconnu', 'micro']

function blobToB64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const s = String(reader.result || '')
      resolve(s.includes(',') ? s.slice(s.indexOf(',') + 1) : s)
    }
    reader.onerror = () => reject(new Error('audio'))
    reader.readAsDataURL(blob)
  })
}

function b64ToBuffer(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

export function VoiceAssistant() {
  const app = useApp()
  const appRef = useRef(app)
  appRef.current = app
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const recRef = useRef(null)
  const chunks = useRef([])
  const streamRef = useRef(null)
  const heardRef = useRef('')
  const speechRef = useRef(null)
  const ctxRef = useRef(null)
  const clipsRef = useRef({})
  const queueRef = useRef({ next: 0, sources: [] })
  const genRef = useRef(0)

  useEffect(() => {
    if (app.view === 'agent') app.setView('globe')
  }, [app.view, app])

  useEffect(() => {
    window.speechSynthesis?.getVoices()
    return () => {
      recRef.current?.stop()
      speechRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      window.speechSynthesis?.cancel()
      try { ctxRef.current?.close() } catch { /* ignore */ }
    }
  }, [])

  function audioCtx() {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    if (!ctxRef.current || ctxRef.current.state === 'closed') ctxRef.current = new AC()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume().catch(() => {})
    return ctxRef.current
  }

  function preloadClips() {
    const ctx = ctxRef.current
    if (!ctx) return
    CLIPS.forEach((name) => {
      if (clipsRef.current[name]) return
      clipsRef.current[name] = fetch(`/voix/${name}.wav`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(name))))
        .then((buf) => ctx.decodeAudioData(buf))
        .catch(() => {
          delete clipsRef.current[name]
          return null
        })
    })
  }

  // Appelé dans le clic : débloque le son pour la réponse qui arrivera plus tard.
  function unlockAudio() {
    audioCtx()
    preloadClips()
  }

  function stopVoice() {
    genRef.current += 1
    const q = queueRef.current
    q.sources.forEach((src) => { try { src.stop() } catch { /* déjà fini */ } })
    q.sources = []
    q.next = 0
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }

  // Les morceaux s’enchaînent sans blanc, dans l’ordre d’arrivée.
  function enqueue(buf) {
    const ctx = audioCtx()
    if (!ctx || !buf) return false
    const q = queueRef.current
    const start = Math.max(ctx.currentTime + 0.04, q.next)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.onended = () => {
      q.sources = q.sources.filter((s) => s !== src)
      if (!q.sources.length) setSpeaking(false)
    }
    src.start(start)
    q.next = start + buf.duration
    q.sources.push(src)
    setSpeaking(true)
    return true
  }

  async function playClip(name) {
    audioCtx()
    preloadClips()
    try {
      return enqueue(await clipsRef.current[name])
    } catch {
      return false
    }
  }

  // Dernier recours : beaucoup de navigateurs Linux n’ont aucune voix installée.
  function speak(text) {
    const synth = window.speechSynthesis
    const voices = synth?.getVoices() || []
    if (!synth || !text || !voices.length) return false
    try {
      synth.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'fr-FR'
      const fr = voices.find((v) => (v.lang || '').toLowerCase().startsWith('fr'))
      if (fr) u.voice = fr
      synth.speak(u)
      return true
    } catch {
      return false
    }
  }

  function contexte() {
    const a = appRef.current
    return {
      region: a.region?.nom,
      region_id: a.regionId,
      date_min: a.dateDebut,
      date_max: a.dateFin,
      mode: a.mode,
      vue: a.view,
    }
  }

  async function ask({ texte, audio, mime }) {
    const gen = genRef.current
    const ctx = audioCtx()
    let parole = ''
    let clip = null
    let sounded = false
    let decoding = Promise.resolve()
    setBusy(true)
    try {
      await agentVoice({ texte, audio, mime, contexte: contexte() }, (line) => {
        if (gen !== genRef.current) return
        if ('parole' in line) {
          parole = line.parole || ''
          if (line.action) appRef.current.applyAssistantAction(line.action)
        }
        if (line.clip) clip = line.clip
        if (line.audio && ctx) {
          const bytes = b64ToBuffer(line.audio)
          decoding = decoding
            .then(() => ctx.decodeAudioData(bytes))
            .then((buf) => {
              if (gen === genRef.current && enqueue(buf)) {
                sounded = true
                setBusy(false)
              }
            })
            .catch(() => {})
        }
      })
    } catch {
      clip = 'tech'
    }
    await decoding
    setBusy(false)
    if (sounded || gen !== genRef.current) return
    if (clip && await playClip(clip)) return
    if (parole && speak(parole)) return
    await playClip('tech')
  }

  function startSpeech() {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Rec) return
    try {
      const rec = new Rec()
      rec.lang = 'fr-FR'
      rec.continuous = true
      rec.interimResults = true
      rec.onresult = (ev) => {
        let heard = ''
        for (let i = 0; i < ev.results.length; i += 1) heard += ev.results[i][0].transcript
        heardRef.current = heard.trim()
      }
      rec.start()
      speechRef.current = rec
    } catch {
      speechRef.current = null
    }
  }

  async function startListen() {
    heardRef.current = ''
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      await playClip('micro')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '')
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunks.current = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        const dit = heardRef.current
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' })
        if (!dit && blob.size < 400) {
          await playClip('inaudible')
          return
        }
        await ask({
          texte: dit,
          audio: dit ? '' : await blobToB64(blob),
          mime: (rec.mimeType || 'audio/webm').split(';')[0],
        })
      }
      recRef.current = rec
      rec.start(200)
      startSpeech()
      setListening(true)
    } catch {
      await playClip('micro')
    }
  }

  function stopListen() {
    setListening(false)
    try { speechRef.current?.stop() } catch { /* déjà arrêté */ }
    speechRef.current = null
    const rec = recRef.current
    recRef.current = null
    window.setTimeout(() => {
      if (rec && rec.state === 'recording') rec.stop()
    }, 250)
  }

  function onOrb() {
    if (busy) return
    unlockAudio()
    if (listening) {
      stopListen()
      return
    }
    stopVoice()
    startListen()
  }

  const mode = busy ? 'busy' : (listening ? 'listening' : (speaking ? 'speaking' : ''))
  const label = busy
    ? 'L’assistant prépare la réponse'
    : (listening ? 'Terminer la demande' : 'Parler à l’assistant')

  return (
    <div className={`voice-dock${mode ? ` ${mode}` : ''}`}>
      <button type="button" className="voice-orb" aria-label={label} title={label} onClick={onOrb}>
        <img src={LOGO} alt="" />
        {mode && <i className="voice-pulse" />}
      </button>
    </div>
  )
}
