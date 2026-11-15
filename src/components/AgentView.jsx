import { useEffect, useRef, useState } from 'react'
import { DEMO_ACCOUNT, useApp } from '../state'
import { agentChat } from '../api/agent'
import { exportDetectionsCsv } from '../api/client'
import { monthRow, seriesData } from '../data/engine'
import { isDemo } from '../api/client'
import { Icon } from '../ui/icons'
import {
  fmtPeriod, inlineMd, moisNom, versus,
} from '../ui/format'

const VIEW_NAMES = { globe: 'globe', calendrier: 'calendrier', series: 'séries', carte: 'carte', agent: 'agent' }

function buildContext(app) {
  const year = Number(app.dateFin.slice(0, 4))
  const month = Number(app.dateFin.slice(5, 7))
  const base = {
    region: app.region.nom,
    zone: app.activeZone?.nom || null,
    zone_cercle: app.activeZone?.lat_centre != null
      ? { lat: app.activeZone.lat_centre, lon: app.activeZone.lon_centre, rayon_km: app.activeZone.rayon_km }
      : null,
    periode: `${app.dateDebut} a ${app.dateFin}`,
    mode_vue: app.mode,
    vue: VIEW_NAMES[app.view],
    satellites: ['Aqua'],
    satellite_ref: app.satelliteRef,
    cellule_id: app.cellId,
    filtres: { frp_min_mw: app.frpMin, confiance: app.confiance, moment: app.moment === 'tous' ? 'jour et nuit' : app.moment === 'D' ? 'jour' : 'nuit' },
  }
  if (!isDemo) return { ...base, note: 'Les chiffres exacts sont dans l’API FireWatch. N’invente aucun total.' }
  const row = monthRow(app.regionId, year, month)
  const [bucket] = seriesData({
    region: app.regionId, debut: app.dateDebut, fin: app.dateFin, satellites: app.effectiveSats, spec: app.spec, gran: 'tout',
  })
  const parSatellite = {}
  let total = 0
  for (const [id, c] of Object.entries(bucket?.sat || {})) {
    parSatellite[id] = c.couvert ? c.n : 'pas encore lancé'
    total += c.n
  }
  return {
    ...base,
    stats: {
      detections_periode: total,
      par_satellite: parSatellite,
      mois: moisNom(month),
      annee: year,
      total_mois_aqua: row?.total_detections ?? null,
      mediane: row?.mediane_historique ?? null,
      ecart: row ? versus(row.total_detections, row.mediane_historique) : null,
      z_score: row?.z_score ?? null,
      anomalie: row?.anomalie || false,
    },
  }
}

function Rich({ text }) {
  return String(text).split('\n').map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return <br key={i} />
    if (trimmed.startsWith('### ')) return <h4 key={i}>{inlineMd(trimmed.slice(4))}</h4>
    if (trimmed.startsWith('## ')) return <h3 key={i}>{inlineMd(trimmed.slice(3))}</h3>
    if (/^[-*] /.test(trimmed)) return <p key={i} className="li">{inlineMd(trimmed.slice(2))}</p>
    return <p key={i}>{inlineMd(trimmed.replace(/^#+\s*/, ''))}</p>
  })
}

export function AgentView() {
  const app = useApp()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const end = useRef(null)
  const conv = app.conversations.find((c) => c.id === app.conversationId) || (app.conversationId === 'new' ? { id: 'new', messages: [] } : null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [conv?.messages?.length, busy])

  useEffect(() => {
    if (!app.isDemo && app.conversationId && app.conversationId !== 'new') app.loadConversation(app.conversationId)
  }, [app.conversationId, app.isDemo])

  const suggestions = [
    'C’est quoi tous ces points sur le globe ?',
    'Est-ce que cette saison est pire que d’habitude ?',
    `Pourquoi ${moisNom(Number(app.dateFin.slice(5, 7)))} ${app.dateFin.slice(0, 4)} ressort-il ?`,
    'Pourquoi VIIRS voit plus de points chauds que MODIS ?',
    'Que signifie « équivalent Aqua » ?',
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
    const contexte = buildContext(app)
    const userMsg = { role: 'user', contenu: message, contexte, envoye_le: new Date().toISOString() }
    app.pushMessage(convId, userMsg)
    const history = [...(conv?.messages || []), userMsg].map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.contenu,
    }))
    setBusy(true)
    try {
      const { reply, conversationId: nextId } = await agentChat({
        turns: history,
        contexte,
        conversationId: convId === 'new' ? null : convId,
        message,
      })
      const realId = nextId || convId
      if (realId !== convId) app.renameConversation(convId, realId)
      app.pushMessage(realId, { role: 'assistant', contenu: reply, contexte: null, envoye_le: new Date().toISOString() })
    } catch (err) {
      setError(err.message || 'L’agent n’a pas répondu.')
    } finally {
      setBusy(false)
    }
  }

  if (!app.user) {
    return (
      <div className="view-pad">
        <section className="panel sheet agent-gate">
          <span className="gate-icon"><Icon name="spark" size={26} /></span>
          <p className="kicker">Assistant FireWatch</p>
          <h2 className="panel-title">Posez vos questions en français</h2>
          <p className="muted">L’assistant lit ce que vous regardez (région, période, satellites, filtres et chiffres) et l’explique simplement. Une session garde vos conversations.</p>
          <div className="kv gate-kv">
            <span>Nom</span><b>{DEMO_ACCOUNT.username}</b>
            <span>Mot de passe</span><b>{DEMO_ACCOUNT.password}</b>
          </div>
          <div className="row-actions center">
            <button type="button" className="solid" onClick={() => app.login(DEMO_ACCOUNT)}>Entrer avec le compte de démonstration</button>
            <button type="button" className="ghost" onClick={() => app.setAuthOpen(true)}>Autre compte</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="view-pad">
      <div className="agent-layout">
        <aside className="panel sheet conv-list">
          <button type="button" className="solid" onClick={() => app.openConversation()}><Icon name="plus" size={15} />Nouvelle conversation</button>
          <p className="kicker" style={{ marginTop: 14 }}>Historique</p>
          {app.conversations.length === 0 && <p className="muted sm">Vos conversations apparaîtront ici.</p>}
          {app.conversations.map((c) => (
            <button type="button" key={c.id} aria-current={c.id === app.conversationId} onClick={() => app.setConversationId(c.id)}>
              {(c.titre || c.dernier_message || c.messages?.find((m) => m.role === 'user')?.contenu || 'Nouvelle conversation').slice(0, 52)}
            </button>
          ))}
        </aside>
        <section className="panel thread">
          <div className="ctx-line">
            <Icon name="eye" size={14} />
            <span>L’assistant voit : <b>{app.region.nom}{app.activeZone ? ` · ${app.activeZone.nom}` : ''}</b> · {fmtPeriod(app.dateDebut, app.dateFin)} · {app.mode === 'brut' ? 'capteurs' : 'données harmonisées (équivalent Aqua)'}</span>
          </div>
          <div className="messages">
            {!conv?.messages?.length && (
              <div className="bubble assistant">
                <p>Bonjour {app.user.username}. Je peux vous aider à lire les points chauds et l’harmonisation MODIS / VIIRS. Choisissez une question ci-dessous ou écrivez la vôtre.</p>
              </div>
            )}
            {(conv?.messages || []).map((m, i) => (
              <div key={`${m.id || m.envoye_le || m.date_envoi}-${i}`} className={`bubble ${m.role === 'user' ? 'user' : 'assistant'}`}>
                {m.role === 'assistant' ? <Rich text={m.contenu} /> : <p>{m.contenu}</p>}
                {m.role === 'assistant' && (
                  <div className="row-actions">
                    <button type="button" className="ghost sm" onClick={() => app.setView('calendrier')}><Icon name="calendar" size={14} />Voir le calendrier</button>
                    <button type="button" className="ghost sm" onClick={() => app.setView('series')}><Icon name="chart" size={14} />Voir la série</button>
                    <button type="button" className="ghost sm" onClick={() => exportDetectionsCsv({ region: app.regionId, debut: app.dateDebut, fin: app.dateFin, satellites: app.effectiveSats, spec: app.spec })}><Icon name="download" size={14} />Exporter en CSV</button>
                    {app.mode === 'harmonise'
                      ? <button type="button" className="ghost sm" onClick={() => { app.setMode('brut'); app.setView('globe') }}>Voir par capteur</button>
                      : <button type="button" className="ghost sm" onClick={() => { app.setMode('harmonise'); app.setView('globe') }}>Revenir à l’harmonisé</button>}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="bubble assistant typing"><i /><i /><i /><span>Lecture des chiffres de {app.region.nom}…</span></div>}
            <div ref={end} />
          </div>
          <div className="suggest">
            {suggestions.map((s) => <button type="button" key={s} onClick={() => send(s)} disabled={busy}>{s}</button>)}
          </div>
          {error && <p className="error">{error}</p>}
          <form className="composer" onSubmit={(e) => { e.preventDefault(); send() }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Posez une question sur les points chauds affichés…" aria-label="Message" />
            <button className="solid" type="submit" disabled={busy || !text.trim()}><Icon name="send" size={15} />Envoyer</button>
          </form>
        </section>
      </div>
    </div>
  )
}
