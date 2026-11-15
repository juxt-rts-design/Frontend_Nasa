/** Données de démonstration au schéma FIRMS / FireWatch.
 *  Le client API remplace ce module quand VITE_DATA_SOURCE=api.
 *  Tous les chiffres (globe, carte, calendrier, listes, séries) sortent du même générateur :
 *  un jour, une région et un satellite donnent toujours les mêmes détections.
 */

function isoOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const REAL_TODAY = isoOf(new Date())
export const TODAY = REAL_TODAY < '2003-01-01' || REAL_TODAY > '2026-12-31' ? '2026-11-12' : REAL_TODAY
export const DEMO_RANGE = { start: '2002-01-01', end: TODAY }
export const FIRST_YEAR = 2002
export const LAST_YEAR = Number(TODAY.slice(0, 4))
export const MAX_SCAN_DAYS = 366
export const NRT_SINCE = addDays(TODAY, -150)

export const SATELLITES = [
  { id: 'Terra', short: 'T', instrument: 'MODIS', start: '2000-11-01', pass0: 10.5, pass1: 8.5, year0: 2000, year1: 2026, ratio: 0.82, color: '#a78bfa', pixel: '1 km', passage: 'matin, ~10 h 30 → 8 h 30' },
  { id: 'Aqua', short: 'A', instrument: 'MODIS', start: '2002-07-04', pass0: 13.5, pass1: 15.83, year0: 2002, year1: 2026, ratio: 1, color: '#38bdf8', pixel: '1 km', passage: 'après-midi, ~13 h 30 → 15 h 50' },
  { id: 'Suomi NPP', short: 'S', instrument: 'VIIRS', start: '2012-01-19', pass0: 13.5, pass1: 13.5, year0: 2012, year1: 2026, ratio: 2.3, color: '#34d399', pixel: '375 m', passage: 'après-midi, ~13 h 30' },
  { id: 'NOAA-20', short: 'N20', instrument: 'VIIRS', start: '2018-04-05', pass0: 13.5, pass1: 13.5, year0: 2018, year1: 2026, ratio: 2.1, color: '#f472b6', pixel: '375 m', passage: 'après-midi, ~13 h 30' },
  { id: 'NOAA-21', short: 'N21', instrument: 'VIIRS', start: '2024-01-05', pass0: 13.5, pass1: 13.5, year0: 2024, year1: 2026, ratio: 1.95, color: '#a3e635', pixel: '375 m', passage: 'après-midi, ~13 h 30' },
]
export const ALL_SATS = SATELLITES.map((s) => s.id)
export const SAT_BY_ID = Object.fromEntries(SATELLITES.map((s) => [s.id, s]))
/** Couleur unique du mode Harmoniser — distincte de toutes les couleurs satellite. */
export const HARM_COLOR = '#ff6b3d'
export const HARM_ID = 'harmoniser'
const SAT_INDEX = Object.fromEntries(SATELLITES.map((s, i) => [s.id, i]))
const AQUA = SAT_BY_ID.Aqua

/** Noms Django : Suomi-NPP (tiret) vs libellé UI « Suomi NPP ». */
export const SAT_API_ID = {
  Terra: 'Terra',
  Aqua: 'Aqua',
  'Suomi NPP': 'Suomi-NPP',
  'NOAA-20': 'NOAA-20',
  'NOAA-21': 'NOAA-21',
}
export const SAT_UI_ID = {
  Terra: 'Terra',
  Aqua: 'Aqua',
  'Suomi-NPP': 'Suomi NPP',
  'Suomi NPP': 'Suomi NPP',
  'NOAA-20': 'NOAA-20',
  'NOAA-21': 'NOAA-21',
}

export function satApi(id) {
  return SAT_API_ID[id] || id
}

export function satUi(id) {
  return SAT_UI_ID[id] || id
}

export function satColor(id) {
  return SAT_BY_ID[satUi(id)]?.color || '#ffb089'
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function circleToRing(lat, lon, rayonKm, n = 32) {
  const ring = []
  const ang = rayonKm / 6371
  const latR = (lat * Math.PI) / 180
  const lonR = (lon * Math.PI) / 180
  for (let i = 0; i <= n; i += 1) {
    const brng = (2 * Math.PI * i) / n
    const lat2 = Math.asin(Math.sin(latR) * Math.cos(ang) + Math.cos(latR) * Math.sin(ang) * Math.cos(brng))
    const lon2 = lonR + Math.atan2(
      Math.sin(brng) * Math.sin(ang) * Math.cos(latR),
      Math.cos(ang) - Math.sin(latR) * Math.sin(lat2),
    )
    ring.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI])
  }
  return ring
}

export function ringToCircle(ring) {
  if (!ring || ring.length < 3) return null
  const pts = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length
  const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const rayon = Math.max(...pts.map((p) => haversineKm(lat, lon, p[1], p[0])), 1)
  return { lat_centre: lat, lon_centre: lon, rayon_km: Math.round(rayon * 10) / 10 }
}

export function zoneGeojson(zone) {
  if (zone?.geojson) return zone.geojson
  if (zone?.lat_centre != null && zone?.lon_centre != null) {
    return { type: 'Polygon', coordinates: [circleToRing(Number(zone.lat_centre), Number(zone.lon_centre), Number(zone.rayon_km) || 50)] }
  }
  return null
}

/** Puissance radiative : loi log-normale par instrument (le pixel VIIRS, plus petit, mesure des FRP plus faibles). */
const FRP_MODEL = {
  MODIS: { median: 12, sigma: 0.95 },
  VIIRS: { median: 6.5, sigma: 1.0 },
}

export const FRP_LEVELS = [
  { id: 'faible', label: 'Faible', simple: 'Faible', min: 0, max: 10, color: '#f7d774', jour: '1–5' },
  { id: 'moderee', label: 'Modérée', simple: 'Modéré', min: 10, max: 30, color: '#f59e42', jour: '6–15' },
  { id: 'intense', label: 'Intense', simple: 'Intense', min: 30, max: 100, color: '#ef4d3c', jour: '16–40' },
  { id: 'exceptionnelle', label: 'Exceptionnelle', simple: 'Exceptionnel', min: 100, max: Infinity, color: '#b3142f', jour: '> 40' },
]

export function frpNiveau(frp) {
  const v = Number(frp) || 0
  const level = FRP_LEVELS.find((l) => v >= l.min && v < l.max) || FRP_LEVELS[0]
  return { id: level.id, niveau: level.label, simple: level.simple, couleur: level.color }
}

export const REGIONS = [
  {
    id: 'Afrique_Centrale',
    nom: 'Afrique centrale',
    latMin: -6, latMax: 8.2, lonMin: 8, lonMax: 28.5,
    focus: { lat: 1.1, lng: 17.6, altitude: 1.42 },
    augustMedian: 3085,
    pic: 8,
    shape: [0.28, 0.36, 0.48, 0.34, 0.26, 0.72, 1.05, 1.35, 1.12, 0.68, 0.38, 0.3],
    eco: 1,
  },
  {
    id: 'Gabon',
    nom: 'Gabon',
    latMin: -3.95, latMax: 2.3, lonMin: 8.7, lonMax: 14.5,
    focus: { lat: -0.7, lng: 11.7, altitude: 0.72 },
    augustMedian: 640,
    pic: 8,
    shape: [0.22, 0.3, 0.55, 0.32, 0.24, 0.84, 1.16, 1.4, 1.02, 0.5, 0.3, 0.22],
    eco: 1.12,
  },
  {
    id: 'Cameroun',
    nom: 'Cameroun',
    latMin: 1.6, latMax: 13, lonMin: 8.4, lonMax: 16.2,
    focus: { lat: 5.2, lng: 12.3, altitude: 0.86 },
    augustMedian: 380,
    pic: 2,
    shape: [1.15, 1.4, 1.05, 0.48, 0.28, 0.22, 0.24, 0.3, 0.34, 0.42, 0.78, 1.08],
    eco: 0.96,
  },
  {
    id: 'Congo',
    nom: 'Congo',
    latMin: -5.1, latMax: 3.7, lonMin: 11.2, lonMax: 18.6,
    focus: { lat: -0.8, lng: 15.2, altitude: 0.8 },
    augustMedian: 720,
    pic: 8,
    shape: [0.26, 0.34, 0.46, 0.32, 0.24, 0.7, 1.08, 1.38, 1.14, 0.66, 0.36, 0.28],
    eco: 1.1,
  },
  {
    id: 'RDC',
    nom: 'RDC',
    latMin: -13.5, latMax: 5.4, lonMin: 12.2, lonMax: 31.3,
    focus: { lat: -2.6, lng: 23.2, altitude: 1.15 },
    augustMedian: 1680,
    pic: 8,
    shape: [0.32, 0.4, 0.5, 0.36, 0.28, 0.78, 1.12, 1.36, 1.18, 0.74, 0.42, 0.32],
    eco: 1.04,
  },
  {
    id: 'RCA',
    nom: 'RCA',
    latMin: 2.2, latMax: 11.0, lonMin: 14.4, lonMax: 27.5,
    focus: { lat: 6.4, lng: 20.6, altitude: 0.9 },
    augustMedian: 290,
    pic: 1,
    shape: [1.32, 1.22, 0.95, 0.42, 0.26, 0.22, 0.24, 0.28, 0.32, 0.4, 0.72, 1.18],
    eco: 0.94,
  },
]

const CLUSTERS = [
  { id: 'nord', lat: 7.4, lon: 18.2, sLat: 1.5, sLon: 3.4, months: [11, 12, 1, 2, 3] },
  { id: 'gabon', lat: -0.6, lon: 11.8, sLat: 1.35, sLon: 1.8, months: [6, 7, 8, 9] },
  { id: 'congo', lat: -1.2, lon: 15.4, sLat: 1.5, sLon: 2.1, months: [6, 7, 8, 9, 10] },
  { id: 'sud', lat: -4.2, lon: 23.4, sLat: 2.1, sLon: 3.6, months: [6, 7, 8, 9, 10] },
  { id: 'rca', lat: 6.2, lon: 22.4, sLat: 1.5, sLon: 2.4, months: [11, 12, 1, 2] },
  { id: 'cam', lat: 4.6, lon: 12.8, sLat: 1.6, sLon: 2.0, months: [12, 1, 2, 3] },
]

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const MOIS_C = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

export function getRegion(id) {
  return REGIONS.find((r) => r.id === id) || REGIONS[0]
}

export function hash01(...parts) {
  return hashInt(...parts) / 4294967296
}

function hashInt(...parts) {
  let h = 2166136261
  const s = parts.join('|')
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rng) {
  const a = Math.max(1e-9, rng())
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * rng())
}

/** Quantile de la loi normale (Acklam). */
function invNorm(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - 0.02425) {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  const q = p - 0.5
  const r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

const pad = (n) => String(n).padStart(2, '0')
const round1 = (n) => Math.round(n * 10) / 10
const round2 = (n) => Math.round(n * 100) / 100
const round5 = (n) => Math.round(n * 100000) / 100000

export function demoToday() {
  return TODAY
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

export function daysBetween(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

export function clampDate(iso) {
  if (!iso || iso < DEMO_RANGE.start) return DEMO_RANGE.start
  if (iso > DEMO_RANGE.end) return DEMO_RANGE.end
  return iso
}

export function eachDay(a, b, max = 400) {
  const out = []
  let s = a <= b ? a : b
  const end = a <= b ? b : a
  while (s <= end && out.length < max) {
    out.push(s)
    s = addDays(s, 1)
  }
  return out
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function monthBounds(year, month) {
  return { debut: `${year}-${pad(month)}-01`, fin: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}` }
}

/** Les vues détaillées (globe, carte, listes) lisent au plus une année : la fin de période est gardée. */
export function capPeriod(debut, fin, max = MAX_SCAN_DAYS) {
  const a = clampDate(debut <= fin ? debut : fin)
  const b = clampDate(debut <= fin ? fin : debut)
  const span = daysBetween(a, b) + 1
  if (span <= max) return { debut: a, fin: b, capped: false, jours: span }
  return { debut: addDays(b, -(max - 1)), fin: b, capped: true, jours: max }
}

function stats(values) {
  if (!values.length) return { median: null, std: null }
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  if (s.length < 2) return { median, std: 0 }
  const mean = s.reduce((a, b) => a + b, 0) / s.length
  const variance = s.reduce((a, b) => a + (b - mean) ** 2, 0) / (s.length - 1)
  return { median, std: Math.sqrt(variance) }
}

function climatology(values) {
  const st = stats(values)
  if (st.median == null) return st
  const floor = Math.abs(st.median) * 0.18
  return { median: st.median, std: Math.max(st.std || 0, floor) }
}

function baseline(region, year, month) {
  const shape = region.shape[month - 1]
  const level = region.augustMedian * (shape / region.shape[region.pic - 1])
  const wobble = 0.9 + hash01(region.id, year, month, 'wob') * 0.2
  return Math.max(8, Math.round(level * wobble))
}

function monthState(year, month) {
  const { debut, fin } = monthBounds(year, month)
  if (debut > TODAY) return 'futur'
  if (fin < AQUA.start) return 'avant'
  if (debut < AQUA.start) return 'partiel'
  if (fin > TODAY) return 'en_cours'
  return 'complet'
}

const splitCache = new Map()

/** Répartit le niveau mensuel sur les jours ; la somme des jours vaut exactement le mois. */
function monthSplit(regionId, year, month, value) {
  const key = `${regionId}|${year}-${month}`
  if (splitCache.has(key)) return splitCache.get(key)
  const dim = daysInMonth(year, month)
  const weights = []
  let sum = 0
  for (let d = 1; d <= dim; d += 1) {
    const w = 0.62 + hash01(regionId, `${year}-${pad(month)}-${pad(d)}`, 'wave') * 0.76
    weights.push(w)
    sum += w
  }
  const exact = weights.map((w) => (w / sum) * value)
  const out = exact.map(Math.floor)
  let rest = value - out.reduce((a, b) => a + b, 0)
  const order = exact.map((v, i) => [v - Math.floor(v), i]).sort((x, y) => y[0] - x[0])
  for (let k = 0; rest > 0 && k < order.length; k += 1, rest -= 1) out[order[k][1]] += 1
  splitCache.set(key, out)
  return out
}

const calendarCache = new Map()
const activityCache = new Map()

/** Table calendrier de la spec : série de référence Aqua, médiane des années précédentes, z-score, anomalie si |z| > 2. */
export function getCalendar(regionId) {
  if (calendarCache.has(regionId)) return calendarCache.get(regionId)
  const region = getRegion(regionId)
  const years = []
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y += 1) years.push(y)
  const raw = {}
  for (const y of years) {
    for (let m = 1; m <= 12; m += 1) raw[`${y}-${m}`] = baseline(region, y, m)
  }
  if (region.id === 'Afrique_Centrale') {
    raw['2007-8'] = 5600
    raw['2016-8'] = 5200
    raw['2024-8'] = 4200
  }
  const activity = new Map()
  const complete = {}
  const rows = []
  for (const y of years) {
    for (let m = 1; m <= 12; m += 1) {
      const etat = monthState(y, m)
      const prev = complete[m] || []
      let value = raw[`${y}-${m}`]
      const ready = prev.length >= 5
      const st = ready ? climatology(prev) : null
      if (ready && region.id === 'Gabon' && y === 2023 && m === 3) {
        value = Math.round(st.median + 3.1 * st.std)
      } else if (ready && region.id === 'Afrique_Centrale' && ((y === 2015 && m === 7) || (y === 2019 && m === 8))) {
        value = Math.round(st.median + 2.45 * st.std)
      } else if (ready && region.id !== 'Afrique_Centrale' && y === 2016 && m === region.pic) {
        value = Math.round(st.median + 2.7 * st.std)
      } else if (ready && region.id !== 'Afrique_Centrale' && region.id !== 'Gabon' && y === 2019 && m === region.pic) {
        value = Math.round(st.median + 2.2 * st.std)
      }
      activity.set(`${y}-${m}`, value)
      let total = null
      if (etat !== 'avant' && etat !== 'futur') {
        const split = monthSplit(region.id, y, m, value)
        total = 0
        split.forEach((v, i) => {
          const iso = `${y}-${pad(m)}-${pad(i + 1)}`
          if (iso >= AQUA.start && iso <= TODAY) total += v
        })
      }
      const scored = st && etat === 'complet' && st.std > 1
      const z = scored ? (total - st.median) / st.std : null
      rows.push({
        region: region.id,
        annee: y,
        mois: m,
        total_detections: total,
        mediane_historique: st && total != null ? Math.round(st.median) : null,
        z_score: z == null ? null : Math.round(z * 100) / 100,
        anomalie: z != null && Math.abs(z) > 2,
        etat,
      })
      if (etat === 'complet') complete[m] = [...prev, total]
    }
  }
  activityCache.set(region.id, activity)
  calendarCache.set(region.id, rows)
  return rows
}

export function monthRow(regionId, year, month) {
  return getCalendar(regionId).find((r) => r.annee === year && r.mois === month)
}

function dailyActivity(regionId, iso) {
  if (!activityCache.has(regionId)) getCalendar(regionId)
  const y = Number(iso.slice(0, 4))
  const m = Number(iso.slice(5, 7))
  const value = activityCache.get(regionId).get(`${y}-${m}`)
  if (value == null) return 0
  return monthSplit(regionId, y, m, value)[Number(iso.slice(8, 10)) - 1] || 0
}

export function getRatio(regionId, month, satelliteId) {
  const region = getRegion(regionId)
  const sat = SAT_BY_ID[satelliteId]
  if (!sat || sat.id === 'Aqua') return 1
  const season = month >= 6 && month <= 9 ? 1.08 : 0.96
  return Math.round(sat.ratio * season * region.eco * 100) / 100
}

/** Nombre de détections valides d'un satellite, un jour donné, dans une région. */
export function satDayCount(regionId, iso, sat) {
  if (!sat || iso < sat.start || iso > TODAY) return 0
  const base = dailyActivity(regionId, iso)
  if (sat.id === 'Aqua') return base
  return Math.max(0, Math.round(base * getRatio(regionId, Number(iso.slice(5, 7)), sat.id)))
}

function passHour(sat, year) {
  const t = Math.min(1, Math.max(0, (year - sat.year0) / Math.max(1, sat.year1 - sat.year0)))
  return sat.pass0 + (sat.pass1 - sat.pass0) * t
}

function hhmm(hour) {
  let minutes = Math.round(hour * 60)
  minutes = ((minutes % 1440) + 1440) % 1440
  return `${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}`
}

function clustersFor(region) {
  const list = CLUSTERS.filter((c) => (
    c.lat > region.latMin - 1.5 && c.lat < region.latMax + 1.5
    && c.lon > region.lonMin - 1.5 && c.lon < region.lonMax + 1.5
  ))
  return list.length ? list : [{ id: 'centre', lat: (region.latMin + region.latMax) / 2, lon: (region.lonMin + region.lonMax) / 2, sLat: 1.2, sLon: 1.6, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }]
}

const tableCache = new Map()

function clusterTable(region, month) {
  const key = `${region.id}|${month}`
  if (tableCache.has(key)) return tableCache.get(key)
  const list = clustersFor(region)
  const cum = []
  let total = 0
  for (const c of list) {
    total += c.months.includes(month) ? 5.2 : 0.55
    cum.push(total)
  }
  const table = { list, cum, total }
  tableCache.set(key, table)
  return table
}

function seasonFactor(region, month) {
  return 0.82 + 0.36 * (region.shape[month - 1] / Math.max(...region.shape))
}

const REC = {}

/** Tire les détections d'un satellite pour un jour. `visit` reçoit un objet réutilisé : le copier pour le garder. */
function generate(regionId, iso, sat, visit) {
  const n = satDayCount(regionId, iso, sat)
  if (!n) return 0
  const region = getRegion(regionId)
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  const seed = hashInt(regionId, iso, sat.id)
  const rp = mulberry32(seed ^ 0x9e3779b9)
  const rf = mulberry32(seed ^ 0x85ebca6b)
  const rm = mulberry32(seed ^ 0x27d4eb2f)
  const table = clusterTable(region, month)
  const model = FRP_MODEL[sat.instrument]
  const median = model.median * seasonFactor(region, month)
  const pDay = sat.id === 'Terra' ? 0.58 : 0.82
  const modis = sat.instrument === 'MODIS'
  const nrt = iso >= NRT_SINCE
  const rec = REC
  rec.iso = iso
  rec.region = region.id
  rec.sat = sat
  rec.satIndex = SAT_INDEX[sat.id]
  rec.pass = passHour(sat, year)
  rec.version = modis ? (nrt ? '6.1NRT' : '6.1') : (nrt ? '2.0NRT' : '2.0')
  for (let i = 0; i < n; i += 1) {
    const r = rp() * table.total
    let k = 0
    while (k < table.cum.length - 1 && r > table.cum[k]) k += 1
    const c = table.list[k]
    let lat = c.lat
    let lon = c.lon
    for (let t = 0; t < 4; t += 1) {
      lat = c.lat + gauss(rp) * c.sLat * 0.42
      lon = c.lon + gauss(rp) * c.sLon * 0.42
      if (lat > region.latMin && lat < region.latMax && lon > region.lonMin && lon < region.lonMax) break
    }
    rec.lat = round5(clamp(lat, region.latMin + 0.02, region.latMax - 0.02))
    rec.lon = round5(clamp(lon, region.lonMin + 0.02, region.lonMax - 0.02))
    const u = clamp(rf(), 1e-7, 1 - 1e-7)
    rec.frp = round1(clamp(median * Math.exp(model.sigma * invNorm(u)), 0.3, 1800))
    const cv = rm()
    if (modis) {
      rec.confNum = 50 + Math.floor(cv * 51)
      rec.conf = String(rec.confNum)
      rec.confLevel = rec.confNum >= 80 ? 'elevee' : 'nominale'
    } else {
      rec.confNum = null
      rec.conf = cv < 0.62 ? 'h' : 'n'
      rec.confLevel = cv < 0.62 ? 'elevee' : 'nominale'
    }
    rec.dn = rm() < pDay ? 'D' : 'N'
    rec.tv = rm()
    rec.sv = rm()
    rec.bv = rm()
    rec.i = i
    visit(rec)
  }
  return n
}

function materialize(rec) {
  const modis = rec.sat.instrument === 'MODIS'
  const local = rec.dn === 'D' ? rec.pass : (rec.pass + 12) % 24
  const edge = rec.sv * rec.sv
  const bt = 305 + Math.log(rec.frp + 1) * 11 + rec.bv * 14
  return {
    id: `${rec.region.slice(0, 3)}-${rec.iso}-${rec.sat.short}-${rec.i}`,
    latitude: rec.lat,
    longitude: rec.lon,
    acq_date: rec.iso,
    acq_time: hhmm(local - rec.lon / 15 + (rec.tv - 0.5) * 0.77),
    satellite: rec.sat.id,
    instrument: rec.sat.instrument,
    confidence: rec.conf,
    confiance_niveau: rec.confLevel,
    frp: rec.frp,
    bright_ti4: round1(modis ? bt : Math.min(367, bt)),
    scan: modis ? round2(1 + edge * 3.8) : round2(0.37 + edge * 0.42),
    track: modis ? round2(1 + edge * 1.05) : round2(0.37 + edge * 0.21),
    daynight: rec.dn,
    type: 0,
    version: rec.version,
    valide: true,
    cellule_id: cellId(rec.lat, rec.lon),
    region: rec.region,
  }
}

export function cellId(lat, lon) {
  const la = (Math.round(lat * 10) / 10).toFixed(2)
  const lo = (Math.round(lon * 10) / 10).toFixed(2)
  return `C_${la}_${lo}`
}

export function parseCell(id) {
  const m = String(id || '').match(/^C_(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?)$/)
  if (!m) return null
  return { lat: Number(m[1]), lon: Number(m[2]) }
}

export function pointInRing(lat, lon, ring) {
  if (!ring || ring.length < 3) return true
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersect = (yi > lat) !== (yj > lat)
      && lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-9) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Filtres communs à toutes les vues. `key` sert de clé de cache, `trivial` évite de tirer les points. */
export function makeSpec({ frpMin = 0, confiance = 'toutes', moment = 'tous', ring = null, circle = null, zoneKey = '', cell = null } = {}) {
  const useRing = ring && ring.length >= 3 ? ring : null
  const useCircle = circle && circle.rayon_km > 0 ? circle : null
  const parsed = cell ? parseCell(cell) : null
  let bbox = null
  if (useRing) {
    bbox = { latMin: Infinity, latMax: -Infinity, lonMin: Infinity, lonMax: -Infinity }
    for (const [lo, la] of useRing) {
      bbox.latMin = Math.min(bbox.latMin, la)
      bbox.latMax = Math.max(bbox.latMax, la)
      bbox.lonMin = Math.min(bbox.lonMin, lo)
      bbox.lonMax = Math.max(bbox.lonMax, lo)
    }
  }
  const min = Math.max(0, Number(frpMin) || 0)
  return {
    frpMin: min,
    confiance,
    moment,
    ring: useRing,
    circle: useCircle,
    bbox,
    cell: parsed ? cell : null,
    cellLat: parsed ? Math.round(parsed.lat * 10) : null,
    cellLon: parsed ? Math.round(parsed.lon * 10) : null,
    key: `${min}|${confiance}|${moment}|${useCircle ? `c${useCircle.lat},${useCircle.lon},${useCircle.rayon_km}` : useRing ? zoneKey || useRing.flat().join(',') : '-'}|${parsed ? cell : '-'}`,
    trivial: !min && confiance === 'toutes' && moment === 'tous' && !useRing && !useCircle && !parsed,
  }
}

export const NO_FILTER = makeSpec()

function matches(lat, lon, frp, confLevel, dn, spec) {
  if (spec.trivial) return true
  if (frp < spec.frpMin) return false
  if (spec.confiance === 'elevee' && confLevel !== 'elevee') return false
  if (spec.moment !== 'tous' && dn !== spec.moment) return false
  if (spec.cellLat != null && (Math.round(lat * 10) !== spec.cellLat || Math.round(lon * 10) !== spec.cellLon)) return false
  if (spec.circle) {
    if (haversineKm(lat, lon, spec.circle.lat, spec.circle.lon) > spec.circle.rayon_km) return false
  } else if (spec.ring) {
    const b = spec.bbox
    if (lat < b.latMin || lat > b.latMax || lon < b.lonMin || lon > b.lonMax) return false
    if (!pointInRing(lat, lon, spec.ring)) return false
  }
  return true
}

const recMatches = (rec, spec) => matches(rec.lat, rec.lon, rec.frp, rec.confLevel, rec.dn, spec)
const objMatches = (d, spec) => matches(d.latitude, d.longitude, d.frp, d.confiance_niveau, d.daynight, spec)

const statCache = new Map()

/** Comptes exacts d'un satellite pour un jour, après filtres : nombre, somme et maximum du FRP. */
export function satDayStats(regionId, iso, sat, spec = NO_FILTER) {
  const key = `${regionId}|${spec.key}|${iso}|${sat.id}`
  const hit = statCache.get(key)
  if (hit) return hit
  const out = { n: 0, sum: 0, max: 0 }
  generate(regionId, iso, sat, (rec) => {
    if (!recMatches(rec, spec)) return
    out.n += 1
    out.sum += rec.frp
    if (rec.frp > out.max) out.max = rec.frp
  })
  if (statCache.size > 240000) statCache.clear()
  statCache.set(key, out)
  return out
}

export function satDayN(regionId, iso, sat, spec = NO_FILTER) {
  if (spec.trivial) return satDayCount(regionId, iso, sat)
  return satDayStats(regionId, iso, sat, spec).n
}

const detCache = new Map()

export function dayDetections(regionId, iso) {
  const key = `${regionId}|${iso}`
  if (detCache.has(key)) return detCache.get(key)
  const out = []
  for (const sat of SATELLITES) generate(regionId, iso, sat, (rec) => out.push(materialize(rec)))
  if (detCache.size > 40) detCache.delete(detCache.keys().next().value)
  detCache.set(key, out)
  return out
}

/** Feux d'un jour, filtrés, du plus puissant au plus faible. */
export function dayFires(regionId, iso, satellites = ALL_SATS, spec = NO_FILTER) {
  return dayDetections(regionId, iso)
    .filter((d) => satellites.includes(d.satellite) && objMatches(d, spec))
    .sort((a, b) => b.frp - a.frp)
}

class TopFrp {
  constructor(limit) {
    this.limit = limit
    this.a = []
  }

  wants(frp) {
    return this.a.length < this.limit || frp > this.a[0].frp
  }

  add(item) {
    const a = this.a
    if (a.length < this.limit) {
      a.push(item)
      let i = a.length - 1
      while (i > 0) {
        const p = (i - 1) >> 1
        if (a[p].frp <= a[i].frp) break
        ;[a[p], a[i]] = [a[i], a[p]]
        i = p
      }
      return
    }
    a[0] = item
    let i = 0
    for (;;) {
      const l = 2 * i + 1
      const r = l + 1
      let m = i
      if (l < a.length && a[l].frp < a[m].frp) m = l
      if (r < a.length && a[r].frp < a[m].frp) m = r
      if (m === i) break
      ;[a[m], a[i]] = [a[i], a[m]]
      i = m
    }
  }

  sorted() {
    return [...this.a].sort((x, y) => y.frp - x.frp)
  }
}

function emptyBySat() {
  return Object.fromEntries(ALL_SATS.map((id) => [id, 0]))
}

/** Route /api/globe/ : brut et combiné renvoient les détections (10 000 max, FRP décroissant), harmonisé renvoie des cellules. */
export function queryGlobe({ dateDebut, dateFin, mode = 'combine', satellites = ALL_SATS, region, satelliteRef = 'Aqua', spec = NO_FILTER, limit = 10000 }) {
  const period = capPeriod(dateDebut, dateFin)
  const days = eachDay(period.debut, period.fin, MAX_SCAN_DAYS)
  const chosen = mode === 'combine'
    ? SATELLITES
    : SATELLITES.filter((s) => satellites.includes(s.id) || (mode === 'harmonise' && s.id === satelliteRef))
  const parSat = emptyBySat()
  let total = 0
  let frpSum = 0
  let frpMax = 0

  if (mode === 'harmonise') {
    const cells = new Map()
    let equivalent = 0
    for (const iso of days) {
      const month = Number(iso.slice(5, 7))
      const live = chosen.filter((s) => iso >= s.start)
      if (!live.length) continue
      const refRatio = getRatio(region, month, satelliteRef)
      for (const sat of live) {
        const w = 1 / (getRatio(region, month, sat.id) / refRatio) / live.length
        generate(region, iso, sat, (rec) => {
          if (!recMatches(rec, spec)) return
          total += 1
          parSat[sat.id] += 1
          frpSum += rec.frp
          if (rec.frp > frpMax) frpMax = rec.frp
          equivalent += w
          const la = Math.round(rec.lat * 10)
          const lo = Math.round(rec.lon * 10)
          const key = la * 100000 + lo
          let c = cells.get(key)
          if (!c) {
            c = { la, lo, eq: 0, sum: 0, n: 0, max: 0, mask: 0 }
            cells.set(key, c)
          }
          c.eq += w
          c.sum += rec.frp
          c.n += 1
          if (rec.frp > c.max) c.max = rec.frp
          c.mask |= 1 << rec.satIndex
        })
      }
    }
    const points = [...cells.values()].map((c) => ({
      cellule_id: `C_${(c.la / 10).toFixed(2)}_${(c.lo / 10).toFixed(2)}`,
      lat_centre: c.la / 10,
      lon_centre: c.lo / 10,
      region,
      total_detections: round1(c.eq),
      frp_moyen: round1(c.sum / c.n),
      frp_max: round1(c.max),
      nb_detections: c.n,
      satellites: SATELLITES.filter((_, i) => c.mask & (1 << i)).map((s) => s.id),
      frp: round1(c.max),
    }))
    points.sort((a, b) => b.frp_max - a.frp_max)
    return {
      mode,
      points: points.slice(0, limit),
      total: points.length,
      detections: total,
      equivalent: Math.round(equivalent),
      parSat,
      frpMax: round1(frpMax),
      frpMoyen: total ? round1(frpSum / total) : 0,
      truncated: points.length > limit,
      ...period,
    }
  }

  const top = new TopFrp(limit)
  for (const iso of days) {
    for (const sat of chosen) {
      if (iso < sat.start) continue
      generate(region, iso, sat, (rec) => {
        if (!recMatches(rec, spec)) return
        total += 1
        parSat[sat.id] += 1
        frpSum += rec.frp
        if (rec.frp > frpMax) frpMax = rec.frp
        if (top.wants(rec.frp)) top.add(materialize(rec))
      })
    }
  }
  return {
    mode,
    points: top.sorted(),
    total,
    parSat,
    frpMax: round1(frpMax),
    frpMoyen: total ? round1(frpSum / total) : 0,
    truncated: total > limit,
    ...period,
  }
}

/** Liste des jours d'une période avec leurs comptes exacts par satellite. */
export function periodDays({ region, debut, fin, satellites = ALL_SATS, spec = NO_FILTER }) {
  const period = capPeriod(debut, fin)
  const sats = SATELLITES.filter((s) => satellites.includes(s.id))
  const days = eachDay(period.debut, period.fin, MAX_SCAN_DAYS).map((iso) => {
    const parSat = {}
    let total = 0
    let frpMax = 0
    let frpSum = 0
    for (const sat of sats) {
      const st = satDayStats(region, iso, sat, spec)
      parSat[sat.id] = st.n
      total += st.n
      frpSum += st.sum
      if (st.max > frpMax) frpMax = st.max
    }
    return { date: iso, total, parSat, frpMax: round1(frpMax), frpMoyen: total ? round1(frpSum / total) : 0 }
  })
  return { ...period, days, total: days.reduce((a, d) => a + d.total, 0) }
}

/** Détections d'une période pour l'export CSV (20 000 max, FRP décroissant). */
export function periodFires({ region, debut, fin, satellites = ALL_SATS, spec = NO_FILTER, limit = 20000 }) {
  const period = capPeriod(debut, fin)
  const sats = SATELLITES.filter((s) => satellites.includes(s.id))
  const top = new TopFrp(limit)
  let total = 0
  for (const iso of eachDay(period.debut, period.fin, MAX_SCAN_DAYS)) {
    for (const sat of sats) {
      generate(region, iso, sat, (rec) => {
        if (!recMatches(rec, spec)) return
        total += 1
        if (top.wants(rec.frp)) top.add(materialize(rec))
      })
    }
  }
  return { ...period, list: top.sorted(), total, truncated: total > limit }
}

function bucketKey(iso, gran) {
  if (gran === 'jour') return iso
  if (gran === 'mois') return iso.slice(0, 7)
  if (gran === 'annee') return iso.slice(0, 4)
  return 'tout'
}

/** Agrégats par pas de temps et par satellite (série mensuelle de la spec, étendue au jour et à l'année). */
export function seriesData({ region, debut, fin, satellites = ALL_SATS, spec = NO_FILTER, gran = 'mois', needFrp = false }) {
  const a = clampDate(debut <= fin ? debut : fin)
  const b = clampDate(debut <= fin ? fin : debut)
  const sats = SATELLITES.filter((s) => satellites.includes(s.id))
  const buckets = new Map()
  for (const iso of eachDay(a, b, 20000)) {
    const key = bucketKey(iso, gran)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { key, debut: iso, fin: iso, jours: 0, sat: {} }
      for (const s of sats) bucket.sat[s.id] = { n: 0, eq: 0, sum: 0, max: 0, actifs: 0, couvert: 0 }
      buckets.set(key, bucket)
    }
    bucket.fin = iso
    bucket.jours += 1
    const month = Number(iso.slice(5, 7))
    for (const sat of sats) {
      if (iso < sat.start) continue
      const cell = bucket.sat[sat.id]
      cell.couvert += 1
      let n
      if (!needFrp && spec.trivial) {
        n = satDayCount(region, iso, sat)
      } else {
        const st = satDayStats(region, iso, sat, spec)
        n = st.n
        cell.sum += st.sum
        if (st.max > cell.max) cell.max = st.max
      }
      cell.n += n
      cell.eq += n / getRatio(region, month, sat.id)
      if (n > 0) cell.actifs += 1
    }
  }
  return [...buckets.values()]
}

/** Médiane ± écart-type d'un satellite pour chaque mois de l'année, sur les mois complets de l'archive. */
export function monthlyNormals({ region, satellite = 'Aqua', spec = NO_FILTER, harmonise = false }) {
  const sat = SAT_BY_ID[satellite] || AQUA
  const rows = seriesData({ region, debut: sat.start > DEMO_RANGE.start ? sat.start : DEMO_RANGE.start, fin: TODAY, satellites: [sat.id], spec, gran: 'mois' })
  const byMonth = Array.from({ length: 12 }, () => [])
  for (const r of rows) {
    const y = Number(r.key.slice(0, 4))
    const m = Number(r.key.slice(5, 7))
    if (r.jours !== daysInMonth(y, m) || r.sat[sat.id].couvert !== r.jours) continue
    byMonth[m - 1].push(harmonise ? r.sat[sat.id].eq : r.sat[sat.id].n)
  }
  return byMonth.map((values) => stats(values))
}

/** Calendrier recalculé : référence Aqua filtrée (avec z-scores) ou somme des satellites choisis (sans z-scores). */
export function calendarRows(regionId, { source = 'aqua', satellites = ['Aqua'], spec = NO_FILTER } = {}) {
  const ref = getCalendar(regionId)
  if (source === 'aqua' && spec.trivial) return ref
  const sats = source === 'aqua' ? [AQUA] : SATELLITES.filter((s) => satellites.includes(s.id))
  const complete = {}
  return ref.map((r) => {
    const { debut, fin } = monthBounds(r.annee, r.mois)
    let total = null
    if (r.etat !== 'futur') {
      for (const iso of eachDay(debut, fin < TODAY ? fin : TODAY, 31)) {
        for (const sat of sats) {
          if (iso < sat.start) continue
          total = (total || 0) + satDayN(regionId, iso, sat, spec)
        }
      }
    }
    if (source !== 'aqua') {
      return { ...r, total_detections: total, mediane_historique: null, z_score: null, anomalie: false }
    }
    const prev = complete[r.mois] || []
    const st = prev.length >= 5 ? climatology(prev) : null
    const scored = st && r.etat === 'complet' && st.std > 0.5
    const z = scored ? (total - st.median) / st.std : null
    if (r.etat === 'complet') complete[r.mois] = [...prev, total]
    return {
      ...r,
      total_detections: total,
      mediane_historique: st && total != null ? Math.round(st.median) : null,
      z_score: z == null ? null : Math.round(z * 100) / 100,
      anomalie: z != null && Math.abs(z) > 2,
    }
  })
}

export function fireSeason(regionId) {
  const rows = getCalendar(regionId).filter((r) => r.etat === 'complet')
  const medians = []
  for (let m = 1; m <= 12; m += 1) {
    const vals = rows.filter((r) => r.mois === m).map((r) => r.total_detections)
    medians.push(stats(vals).median || 0)
  }
  const max = Math.max(...medians)
  const high = medians.map((v) => v >= max * 0.48)
  let best = { len: 0, start: 0 }
  for (let s = 0; s < 12; s += 1) {
    if (!high[s]) continue
    if (high[(s + 11) % 12]) continue
    let len = 0
    while (high[(s + len) % 12] && len < 12) len += 1
    if (len > best.len) best = { len, start: s }
  }
  if (!best.len) best = { len: 1, start: medians.indexOf(max) }
  const months = Array.from({ length: best.len }, (_, i) => ((best.start + i) % 12) + 1)
  const pic = months.reduce((a, m) => (medians[m - 1] > medians[a - 1] ? m : a), months[0])
  return { debut: months[0], pic, fin: months[months.length - 1], months, medians }
}

/** Année record : la plus forte année complète, avec son mois de pic. */
export function recordYear(regionId, rows = getCalendar(regionId)) {
  const byYear = new Map()
  for (const r of rows) {
    if (r.total_detections == null) continue
    const cur = byYear.get(r.annee) || { total: 0, n: 0 }
    cur.total += r.total_detections
    if (r.etat === 'complet') cur.n += 1
    byYear.set(r.annee, cur)
  }
  let best = { annee: null, total: 0 }
  for (const [annee, v] of byYear) {
    if (v.n === 12 && v.total > best.total) best = { annee, total: v.total }
  }
  if (best.annee == null) return { annee: null, total: 0, mois: null, pic: null }
  const pic = rows.filter((r) => r.annee === best.annee).reduce((a, b) => ((a.total_detections || 0) >= (b.total_detections || 0) ? a : b))
  return { ...best, mois: pic.mois, pic: pic.total_detections }
}

export function getAnomalies(regionId, seuil = 2, rows = getCalendar(regionId)) {
  return rows
    .filter((r) => r.z_score != null && Math.abs(r.z_score) >= seuil)
    .sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score))
}

export function previousAnomalies(regionId, year, month, rows = getCalendar(regionId)) {
  return rows
    .filter((r) => r.anomalie && r.z_score > 0 && (r.annee < year || (r.annee === year && r.mois < month)))
    .sort((a, b) => b.annee - a.annee || b.mois - a.mois)
    .slice(0, 2)
}

/** Tendance en % par décennie, sur les années complètes. */
export function decadeTrend(regionId, rows = getCalendar(regionId)) {
  const years = []
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y += 1) {
    const list = rows.filter((r) => r.annee === y)
    if (list.length !== 12 || list.some((r) => r.etat !== 'complet')) continue
    years.push({ y, total: list.reduce((a, r) => a + (r.total_detections || 0), 0) })
  }
  if (years.length < 3) return 0
  const n = years.length
  const meanX = years.reduce((a, r) => a + r.y, 0) / n
  const meanY = years.reduce((a, r) => a + r.total, 0) / n
  let num = 0
  let den = 0
  for (const r of years) {
    num += (r.y - meanX) * (r.total - meanY)
    den += (r.y - meanX) ** 2
  }
  const slope = den ? num / den : 0
  return Math.round(meanY ? ((slope * 10) / meanY) * 100 : 0)
}

/** Habitude du mois : médiane Aqua des années précédentes, ramenée au jour. */
export function usualDaily(regionId, iso) {
  const month = Number(iso.slice(5, 7))
  const year = Number(iso.slice(0, 4))
  const rows = getCalendar(regionId).filter((r) => r.mois === month && r.annee < year && r.etat === 'complet')
  const med = stats(rows.map((r) => r.total_detections)).median
    ?? stats(getCalendar(regionId).filter((r) => r.mois === month && r.etat === 'complet').map((r) => r.total_detections)).median
  if (!med) return { usual: 1, low: 1, high: 2 }
  const usual = med / daysInMonth(year, month)
  return { usual, low: Math.max(1, Math.round(usual * 0.65)), high: Math.max(2, Math.round(usual * 1.35)) }
}

export function activityLabel(count, usual) {
  if (!usual) return 'habituelle'
  const r = count / usual
  if (r < 0.6) return 'calme'
  if (r < 1.35) return 'habituelle'
  if (r < 2) return 'intense'
  return 'exceptionnelle'
}

export function toCsv(rows) {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return `\uFEFF${cols.join(',')}\n${rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n')}`
}

export function detectionCsvRows(list) {
  return list.map((d) => ({
    latitude: d.latitude,
    longitude: d.longitude,
    acq_date: d.acq_date,
    acq_time: d.acq_time,
    satellite: d.satellite,
    instrument: d.instrument,
    confidence: d.confidence,
    frp: d.frp,
    bright_ti4: d.bright_ti4,
    scan: d.scan,
    track: d.track,
    daynight: d.daynight,
  }))
}
