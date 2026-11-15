import { useState } from 'react'
import { DEMO_ACCOUNT, useApp } from '../state'
import { agentChat } from '../api/agent'
import { exportDetectionsCsv } from '../api/client'
import {
  dailyCount, eachDay, monthRow, usualDaily, zoneFraction,
} from '../data/engine'
import { fmt, inlineMd, moisNom, versus } from '../ui/format'

function buildContext(app) {
  const year = app.selectedMonth.annee
  const month = app.selectedMonth.mois
  const row = monthRow(app.regionId, year, month)
  const ring = app.activeZone?.geojson?.coordinates?.[0]
  const frac = ring ? zoneFraction(app.regionId, ring) : 1
  const days = eachDay(app.dateDebut, app.dateFin)
  const detections = days.reduce((sum, d) => sum + dailyCount(app.regionId, d, app.mode, app.satellites, app.satelliteRef), 0)
  const usual = usualDaily(app.regionId, app.dateFin)
  return {
    region: app.region.nom,
    periode: `${app.dateDebut} a ${app.dateFin}`,
    mode_vue: app.mode,
    vue: app.view,
    zone: app.activeZone?.nom || null,
    satellite_ref: app.satelliteRef,
    stats: {
      mois: moisNom(month),
      annee: year,
      total_mois: row ? Math.round(row.total_detections * frac) : null,
      mediane: row?.mediane_historique != null ? Math.round(row.mediane_historique * frac) : null,
      ecart: row ? versus(row.total_detections, row.mediane_historique) : null,
      z_score: row?.z_score,
      anomalie: row?.anomalie || false,
      detections_fenetre: Math.round(detections * frac),
      habituel_par_jour: [Math.round(usual.low * frac), Math.round(usual.high * frac)],
    },
  }
}

function Rich({ text }) {
  return String(text).split('\n').map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return <br key={i} />
    if (trimmed.startsWith('### ')) return <h4 key={i}>{inlineMd(trimmed.slice(4))}</h4>
    if (trimmed.startsWith('## ')) return <h3 key={i}>{inlineMd(trimmed.slice(3))}</h3>
    if (trimmed.startsWith('- ')) return <p key={i}>· {inlineMd(trimmed.slice(2))}</p>
    return <p key={i}>{inlineMd(trimmed.replace(/^#+\s*/, ''))}</p>
  })
}

export function AgentView() {
  const app = useApp()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const conv = app.conversations.find((c) => c.id === app.conversationId) || null

  const suggestions = [
    'C’est quoi tous ces points ?',
    'Est-ce que cette saison est pire que d’habitude ?',
    app.selectedMonth ? `Pourquoi ${moisNom(app.selectedMonth.mois)} ${app.selectedMonth.annee} ressort-il ?` : 'Quelle est l’anomalie la plus forte ?',
    'Quelle différence entre brut, harmonisé et combiné ?',
  ]

  async function send(content) {
    const message = (content || text).trim()
    if (!message || busy) return
    if (!app.user) {
      app.setAuthOpen(true)
      return
    }
    setError('')
    setText('')
    let convId = conv?.id
    if (!convId) convId = app.openConversation()
    const userMsg = { role: 'user', contenu: message, contexte: buildContext(app), envoye_le: new Date().toISOString() }
    app.pushMessage(convId, userMsg)
    const history = [...(conv?.messages || []), userMsg].map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.contenu,
    }))
    setBusy(true)
    try {
      const { reply } = await agentChat({ turns: history, contexte: buildContext(app), conversationId: convId })
      app.pushMessage(convId, { role: 'assistant', contenu: reply, contexte: null, envoye_le: new Date().toISOString() })
    } catch (err) {
      setError(err.message || 'L’agent n’a pas répondu.')
    } finally {
      setBusy(false)
    }
  }

  if (!app.user) {
    return (
      <div className="view-pad">
        <section className="panel sheet" style={{ maxWidth: 560, margin: '8vh auto' }}>
          <p className="kicker">Assistant FireWatch</p>
          <h2 className="panel-title">Une session pour le guide</h2>
          <p className="muted">L’agent lit la région, la période et les chiffres à l’écran. Une session est demandée pour garder la conversation.</p>
          <div className="kv">
            <span>Nom</span><b>{DEMO_ACCOUNT.username}</b>
            <span>Mot de passe</span><b>{DEMO_ACCOUNT.password}</b>
          </div>
          <div className="row-actions">
            <button className="solid" onClick={() => app.login(DEMO_ACCOUNT)}>Entrer</button>
            <button className="ghost" onClick={() => app.setAuthOpen(true)}>Autre compte</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="view-pad">
      <div className="agent-layout">
        <aside className="panel sheet conv-list">
          <button className="solid" onClick={() => app.openConversation()}>Nouvelle conversation</button>
          {app.conversations.map((c) => (
            <button key={c.id} aria-current={c.id === app.conversationId} onClick={() => app.setConversationId(c.id)}>
              {(c.messages.find((m) => m.role === 'user')?.contenu || 'Conversation').slice(0, 48)}
            </button>
          ))}
        </aside>
        <section className="panel thread">
          <p className="kicker">Contexte · {app.region.nom} · {app.mode}</p>
          <div className="messages">
            {!conv?.messages?.length && (
              <div className="bubble assistant">
                <p>Bonjour. Je peux vous aider à comprendre les données de feux. Posez une question sur ce que vous voyez.</p>
              </div>
            )}
            {(conv?.messages || []).map((m, i) => (
              <div key={`${m.envoye_le}-${i}`} className={`bubble ${m.role === 'user' ? 'user' : 'assistant'}`}>
                {m.role === 'assistant' ? <Rich text={m.contenu} /> : <p>{m.contenu}</p>}
                {m.role === 'assistant' && (
                  <div className="row-actions">
                    <button className="ghost" onClick={() => app.setView('calendrier')}>Voir le calendrier</button>
                    <button className="ghost" onClick={() => app.setView('series')}>Voir la série</button>
                    <button className="ghost" onClick={() => exportDetectionsCsv({
                      dateDebut: app.dateDebut,
                      dateFin: app.dateFin,
                      region: app.regionId,
                      zoneRing: app.activeZone?.geojson?.coordinates?.[0],
                    })}
                    >Exporter en CSV</button>
                    {app.mode !== 'harmonise' && <button className="ghost" onClick={() => { app.setMode('harmonise'); app.setView('globe') }}>Passer en harmonisé</button>}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="bubble assistant"><p>Lecture des chiffres de {app.region.nom}…</p></div>}
          </div>
          <div className="chips">
            {suggestions.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
          </div>
          {error && <p className="error">{error}</p>}
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send() }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Posez une question sur les données de feux…" aria-label="Message" />
            <button className="solid" type="submit" disabled={busy}>Envoyer</button>
          </form>
        </section>
      </div>
    </div>
  )
}
