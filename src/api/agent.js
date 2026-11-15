import { api, apiUrl, csrfToken, ensureCsrf } from './http'

const HEXARO = import.meta.env.VITE_AGENT_URL || 'https://hexaro-ten.vercel.app/api/v1/chat'
const TOKEN = import.meta.env.VITE_AGENT_TOKEN || ''
const SOURCE = import.meta.env.VITE_AGENT_SOURCE || 'backend'

const TECH = 'Je ne suis pas en mesure de répondre pour le moment, à cause d’un problème technique.'

function systemPrompt(contexte) {
  return `Tu es l'Assistant FireWatch, guide du calendrier d'activité de brûlage construit sur les points chauds FIRMS (NASA Space Apps 2026 : Harmonization of MODIS and VIIRS Hot Spots).
Tu réponds en français, simplement, en moins de 140 mots. Tu parles de points chauds (anomalies thermiques), d'harmonisation MODIS/VIIRS et des chiffres du contexte. Un point chaud n'est pas forcément un incendie de forêt : brûlage de végétation, feu agricole, parfois volcan ou torchère. Tu n'inventes aucun chiffre.

Définitions :
- Point chaud : détection thermique satellite (FIRMS), pas un incendie confirmé au sol.
- FRP : puissance radiative du point chaud en MW.
- Confiance : MODIS 0-100 (conservé si ≥ 50). VIIRS l/n/h (conservés : n et h).
- Harmonisation : Aqua est la référence 2002-2026 pour comparer les années et les capteurs.
- Grille backend : cellules de 0,25° (~28 km).
- Satellites API : Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21.
- Zones d'intérêt : cercle (lat_centre, lon_centre, rayon_km).

Contexte de l'écran :
${JSON.stringify(contexte)}

Relie chaque réponse à ces chiffres. Termine par une action concrète parmi : voir le calendrier, voir la série, exporter en CSV, changer de mode.`
}

async function hexaroChat({ turns, contexte, conversationId }) {
  if (!TOKEN) throw new Error('Clé agent absente')
  const enriched = turns.map((turn, index) => {
    if (index !== turns.length - 1 || turn.role !== 'user') return turn
    return {
      role: 'user',
      content: `${turn.content}\n\nContexte chiffré de l’écran, à utiliser sans le recopier : ${JSON.stringify(contexte)}`,
    }
  })
  const res = await fetch(HEXARO, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'system', content: systemPrompt(contexte) }, ...enriched],
    }),
  })
  if (!res.ok) throw new Error(`Agent ${res.status}`)
  const data = await res.json()
  if (!data.reply) throw new Error('Réponse vide')
  return { reply: data.reply, conversationId: conversationId || null }
}

export async function agentChat({ turns, contexte, conversationId, message }) {
  const contenu = message || turns?.[turns.length - 1]?.content || ''
  if (SOURCE === 'backend') {
    try {
      await ensureCsrf()
      const numericId = Number(conversationId)
      const data = await api('/api/agent/chat/', {
        method: 'POST',
        body: {
          message: contenu,
          ...(Number.isInteger(numericId) && numericId > 0 ? { conversation_id: numericId } : {}),
        },
      })
      return { reply: data.reponse, conversationId: data.conversation_id }
    } catch (err) {
      if (TOKEN && (err.status === 503 || err.status === 502)) return hexaroChat({ turns, contexte, conversationId })
      throw err
    }
  }
  return hexaroChat({ turns, contexte, conversationId })
}

/** Réponse vocale en NDJSON : `onLine` reçoit l’en-tête (phrase, action, clip) puis chaque morceau audio. */
export async function agentVoice({ texte, audio, mime, contexte }, onLine) {
  await ensureCsrf()
  const res = await fetch(apiUrl('/api/agent/voix/'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/x-ndjson, application/json',
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken(),
    },
    body: JSON.stringify({
      texte: texte || '',
      audio: audio || '',
      mime: mime || 'audio/webm',
      contexte: contexte || {},
    }),
  })
  if (!(res.headers.get('content-type') || '').includes('ndjson') || !res.body) {
    let data = {}
    try { data = await res.json() } catch { /* réponse vide ou HTML du proxy */ }
    onLine({ parole: data.parole || TECH, technique: true, action: null, clip: data.clip || 'tech' })
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let pending = ''
  const flush = (chunk) => {
    const line = chunk.trim()
    if (!line) return
    try { onLine(JSON.parse(line)) } catch { /* ligne tronquée */ }
  }
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    pending += decoder.decode(value, { stream: true })
    let cut = pending.indexOf('\n')
    while (cut >= 0) {
      flush(pending.slice(0, cut))
      pending = pending.slice(cut + 1)
      cut = pending.indexOf('\n')
    }
  }
  flush(pending + decoder.decode())
}
