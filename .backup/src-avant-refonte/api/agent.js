const HEXARO = import.meta.env.VITE_AGENT_URL || 'https://hexaro-ten.vercel.app/api/v1/chat'
const TOKEN = import.meta.env.VITE_AGENT_TOKEN || ''
const SOURCE = import.meta.env.VITE_AGENT_SOURCE || 'hexaro'
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function systemPrompt(contexte) {
  return `Tu es l'Assistant FireWatch, guide du calendrier unifié des feux actifs MODIS et VIIRS (NASA Space Apps Challenge 2026).
Tu réponds en français, simplement, en moins de 140 mots. Tu ne parles que de feux de végétation, de satellites MODIS/VIIRS et des chiffres du contexte. Tu ne parles pas de cybersécurité, de séries télévisées, de sport ni de météo générale. Si la question dit « saison », il s'agit de la saison des feux. Tu n'inventes aucun chiffre.

Définitions :
- FRP : puissance radiative du feu en MW. Plus elle est élevée, plus le feu dégage d'énergie. Faible < 10, modérée 10-30, intense 30-100, exceptionnelle > 100.
- Confiance : MODIS 0-100 (conservé si ≥ 50). VIIRS l/n/h (conservés : n et h).
- Harmonisation : Aqua (MODIS, pixel ~1 km, passage ~13h30) est la référence 2002-2026. ratio = détections du satellite cible / détections Aqua. Un ratio 2,3 signifie que la cible voit 2,3 fois plus de feux à cause du pixel plus fin (~375 m). Le mode harmonisé divise par ce ratio pour revenir à l'échelle Aqua.
- Brut : satellites choisis, sans correction.
- Combiné : tous les satellites actifs, sans correction, pour voir le plus de feux. Inadapté aux comparaisons interannuelles car on passe de 2 satellites (2005) à 5 (2024).
- NRT : quasi temps réel, remplacé par le produit standard environ 5 mois plus tard.
- z-score = (valeur − médiane du même mois sur les années précédentes) / écart-type. Anomalie si |z| > 2.
- Grille : cellules de 0,1° (~11 km), identifiant C_lat_lon. Les feux de végétation seulement (type 0).

Contexte de l'écran :
${JSON.stringify(contexte)}

Relie chaque réponse à ces chiffres. Termine par une action concrète parmi : voir le calendrier, voir la série, exporter en CSV, changer de mode.`
}

export async function agentChat({ turns, contexte, conversationId }) {
  if (SOURCE === 'backend') {
    const res = await fetch(`${BASE}/api/agent/chat/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: turns[turns.length - 1]?.content || '',
        conversation_id: conversationId,
        contexte,
      }),
    })
    if (!res.ok) throw new Error('Agent indisponible')
    const data = await res.json()
    return { reply: data.reply, conversationId: data.conversation_id }
  }
  if (!TOKEN) throw new Error('Clé agent absente')
  const enriched = turns.map((turn, index) => {
    if (index !== turns.length - 1 || turn.role !== 'user') return turn
    return {
      role: 'user',
      content: `${turn.content}\n\nContexte chiffré de l'écran, à utiliser sans le recopier : ${JSON.stringify(contexte)}`,
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
