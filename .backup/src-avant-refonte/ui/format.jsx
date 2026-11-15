import { MOIS } from '../data/engine'

export function fmt(n, digits = 0) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(n))
}

export function compact(n) {
  const v = Number(n) || 0
  if (v >= 10000) return `${Math.round(v / 1000)}k`
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}k`
  return String(Math.round(v))
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d))
}

export function fmtDayMonth(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d))
}

export function fmtTime(hhmm) {
  if (!hhmm || String(hhmm).length < 4) return '—'
  const s = String(hhmm).padStart(4, '0')
  return `${s.slice(0, 2)}:${s.slice(2)}`
}

export function moisNom(m) {
  return MOIS[(m || 1) - 1]
}

export function confianceLabel(c) {
  if (c === 'h') return 'Élevée'
  if (c === 'n') return 'Nominale'
  if (c === 'l') return 'Faible'
  const n = Number(c)
  if (Number.isNaN(n)) return String(c ?? '—')
  if (n >= 80) return 'Élevée'
  if (n >= 50) return 'Nominale'
  return 'Faible'
}

export function typeLabel(t) {
  return ['Feu de végétation', 'Volcan', 'Source fixe', 'Mer'][t] || 'Feu de végétation'
}

export function versus(value, median) {
  if (!median) return 'Médiane historique encore courte pour ce mois.'
  const pct = Math.round((value / median - 1) * 100)
  if (Math.abs(pct) < 6) return `proche de la médiane (${fmt(median)})`
  if (pct > 0) return `${fmt(pct)} % au-dessus de la médiane ${fmt(median)}`
  return `${fmt(Math.abs(pct))} % en dessous de la médiane ${fmt(median)}`
}

export function heatColor(value, scaleMax) {
  const t = Math.max(0, Math.min(1, value / Math.max(1, scaleMax)))
  const stops = [
    [28, 20, 16],
    [107, 58, 40],
    [197, 106, 50],
    [255, 90, 50],
    [255, 214, 186],
  ]
  const x = t * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(x))
  const f = x - i
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f))
  return { color: `rgb(${c[0]}, ${c[1]}, ${c[2]})`, ink: t > 0.78 ? '#24140f' : '#f6efe8', t }
}

export function confianceColor(c, instrument) {
  if (c === 'h' || Number(c) >= 80) return '#ff5a36'
  if (c === 'n' || Number(c) >= 50) return '#f0a05a'
  return instrument === 'VIIRS' ? '#3ddea0' : '#f0ddb0'
}

export function trendPhrase(trend) {
  const n = Math.round(Number(trend) || 0)
  if (n === 0) return 'Tendance stable sur la période, dans cette région.'
  const sign = n > 0 ? '+' : '−'
  return `Tendance : ${sign}${fmt(Math.abs(n))} % de détections par décennie dans cette région.`
}

export function inlineMd(text) {
  const chunks = String(text).split(/(\*\*[^*]+\*\*)/g)
  return chunks.map((part, i) => (
    part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
  ))
}
