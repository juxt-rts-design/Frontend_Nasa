import { ALL_SATS, MOIS, daysBetween } from '../data/engine'

export function fmt(n, digits = 0) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(n))
}

export function compact(n) {
  if (n == null) return '—'
  const v = Number(n) || 0
  if (v >= 10000) return `${Math.round(v / 1000)}k`
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}k`
  return String(Math.round(v))
}

function dateOf(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(dateOf(iso))
}

export function fmtDayMonth(iso) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(dateOf(iso))
}

export function fmtShort(iso) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(dateOf(iso))
}

export function fmtWeekday(iso) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' }).format(dateOf(iso))
}

export function fmtWeekdayShort(iso) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(dateOf(iso)).replace('.', '')
}

export function fmtWeekdayLong(iso) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(dateOf(iso))
}

export function fmtLongDay(iso) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateOf(iso))
}

/** « 12 août 2024 », « 1–7 août 2024 », « 28 juil. → 3 août 2024 », « janvier 2002 », « 2024 ». */
export function fmtPeriod(debut, fin) {
  if (!debut || !fin) return '—'
  if (debut === fin) return fmtDate(debut)
  const [y1, m1, d1] = debut.split('-').map(Number)
  const [y2, m2, d2] = fin.split('-').map(Number)
  const lastDay = new Date(y2, m2, 0).getDate()
  if (y1 === y2 && m1 === 1 && d1 === 1 && m2 === 12 && d2 === 31) return `Année ${y1}`
  if (y1 === y2 && m1 === m2 && d1 === 1 && d2 === lastDay) return `${capital(MOIS[m1 - 1])} ${y1}`
  if (d1 === 1 && d2 === lastDay) {
    if (y1 === y2) return `${capital(MOIS[m1 - 1])} → ${MOIS[m2 - 1]} ${y1}`
    return `${capital(MOIS[m1 - 1])} ${y1} → ${MOIS[m2 - 1]} ${y2}`
  }
  if (y1 === y2 && m1 === m2) return `du ${d1} au ${d2} ${MOIS[m1 - 1]} ${y1}`
  if (y1 === y2) return `du ${d1} ${MOIS[m1 - 1]} au ${d2} ${MOIS[m2 - 1]} ${y1}`
  return `du ${d1} ${MOIS[m1 - 1]} ${y1} au ${d2} ${MOIS[m2 - 1]} ${y2}`
}

/** Date parlée pour le bas du globe : « samedi 14 novembre 2026 », « du samedi 8 au vendredi 14 novembre 2026 ». */
export function fmtPeriodSpoken(debut, fin) {
  if (!debut || !fin) return '—'
  if (debut === fin) return fmtLongDay(debut)
  const start = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateOf(debut))
  const end = fmtLongDay(fin)
  return `du ${start} au ${end}`
}

export function periodLength(debut, fin) {
  const n = daysBetween(debut, fin) + 1
  return n === 1 ? '1 jour' : `${fmt(n)} jours`
}

export function capital(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

export function fmtTime(hhmm) {
  if (!hhmm || String(hhmm).length < 3) return '—'
  const s = String(hhmm).padStart(4, '0')
  return `${s.slice(0, 2)} h ${s.slice(2)}`
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

export function confianceDetail(c, instrument) {
  if (instrument === 'MODIS') return `${confianceLabel(c)} (${c} %)`
  return `${confianceLabel(c)} (${c})`
}

export function pointsChauds(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const v = Number(n)
  return `${fmt(v)} point${Math.abs(v) === 1 ? '' : 's'} chaud${Math.abs(v) === 1 ? '' : 's'}`
}

/** Fiabilité de la détection thermique, pas la preuve d’un incendie. */
export function confianceSimple(c) {
  const l = confianceLabel(c)
  if (l === 'Élevée') return 'Presque certain'
  if (l === 'Nominale') return 'Probable'
  return 'Incertain'
}

export function typeLabel(t) {
  return ['Brûlage de végétation', 'Volcan', 'Source fixe', 'En mer'][t] || 'Brûlage de végétation'
}

export function versus(value, median) {
  if (value == null) return 'pas de mesure ce mois-là'
  if (!median) return 'pas encore assez d’années pour comparer'
  const pct = Math.round((value / median - 1) * 100)
  if (Math.abs(pct) < 6) return `comme d’habitude (environ ${fmt(median)} points chauds)`
  if (pct > 0) return `${fmt(pct)} % de points chauds en plus que d’habitude (environ ${fmt(median)} d’ordinaire)`
  return `${fmt(Math.abs(pct))} % de points chauds en moins que d’habitude (environ ${fmt(median)} d’ordinaire)`
}

/** Écart court pour les listes : « +35 % », « −12 % », « normal ». */
export function versusShort(value, median) {
  if (value == null || !median) return '—'
  const pct = Math.round((value / median - 1) * 100)
  if (Math.abs(pct) < 6) return 'normal'
  return `${pct > 0 ? '+' : '−'}${fmt(Math.abs(pct))} %`
}

export function pctDelta(a, b) {
  if (!b) return null
  return Math.round((a / b - 1) * 100)
}

/** Couleur d’une case selon son z-score (plus que d’habitude = plus chaud). */
export function zColor(z) {
  const v = Number(z) || 0
  if (v >= 2) return '#ff5a36'
  if (v >= 1) return '#ff8a4c'
  if (v >= 0.3) return '#e6b15c'
  if (v >= 0) return '#c4a882'
  return '#7dd3fc'
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

export function confianceColor(c) {
  if (c === 'h' || Number(c) >= 80) return '#ff5a36'
  if (c === 'n' || Number(c) >= 50) return '#f0a05a'
  return '#f0ddb0'
}

export function trendPhrase(trend) {
  const n = Math.round(Number(trend) || 0)
  if (Math.abs(n) < 3) return 'Sur vingt ans, le nombre de points chauds reste à peu près le même.'
  if (n > 0) return `Sur vingt ans, les points chauds augmentent : environ ${fmt(n)} % de plus tous les dix ans.`
  return `Sur vingt ans, les points chauds diminuent : environ ${fmt(Math.abs(n))} % de moins tous les dix ans.`
}

export function satsLabel(list) {
  if (!list || list.length === ALL_SATS.length) return 'Tous les satellites'
  if (list.length === 1) return list[0]
  return `${list.length} satellites`
}

/** Intensité minimale en mots simples ; le seuil en mégawatts reste entre parenthèses. */
export function frpLabel(min) {
  if (!min) return 'Tous les points chauds'
  if (min >= 100) return `Exceptionnels (${fmt(min)} MW et plus)`
  if (min >= 30) return `Intenses et plus (${fmt(min)} MW)`
  if (min >= 10) return `Modérés et plus (${fmt(min)} MW)`
  return `Sans les plus faibles (${fmt(min)} MW)`
}

export function inlineMd(text) {
  const chunks = String(text).split(/(\*\*[^*]+\*\*)/g)
  return chunks.map((part, i) => (
    part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>
  ))
}
