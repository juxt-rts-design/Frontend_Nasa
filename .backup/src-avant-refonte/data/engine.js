/** Données de démonstration au schéma FIRMS / FireWatch.
 *  Le client API remplace ce module quand VITE_DATA_SOURCE=api.
 */

export const DEMO_RANGE = { start: '2002-07-04', end: '2026-12-31' }

export const SATELLITES = [
  { id: 'Terra', instrument: 'MODIS', start: '2000-11-01', pass0: 10.5, pass1: 8.5, year0: 2000, year1: 2026, ratio: 0.82, color: '#9dc4ff' },
  { id: 'Aqua', instrument: 'MODIS', start: '2002-07-04', pass0: 13.5, pass1: 15.83, year0: 2002, year1: 2026, ratio: 1, color: '#7eb6ff' },
  { id: 'Suomi NPP', instrument: 'VIIRS', start: '2012-01-19', pass0: 13.5, pass1: 13.5, year0: 2012, year1: 2026, ratio: 2.3, color: '#3ddea0' },
  { id: 'NOAA-20', instrument: 'VIIRS', start: '2018-04-05', pass0: 13.5, pass1: 13.5, year0: 2018, year1: 2026, ratio: 2.1, color: '#63e7b5' },
  { id: 'NOAA-21', instrument: 'VIIRS', start: '2024-01-05', pass0: 13.5, pass1: 13.5, year0: 2024, year1: 2026, ratio: 1.95, color: '#b6f3d4' },
]

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
  let h = 2166136261
  const s = parts.join('|')
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

export function demoToday() {
  const now = new Date()
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (iso < DEMO_RANGE.start) return DEMO_RANGE.start
  if (iso > DEMO_RANGE.end) return '2026-11-12'
  return iso
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

export function clampDate(iso) {
  if (iso < DEMO_RANGE.start) return DEMO_RANGE.start
  if (iso > DEMO_RANGE.end) return DEMO_RANGE.end
  return iso
}

export function eachDay(a, b) {
  const out = []
  let s = a <= b ? a : b
  const end = a <= b ? b : a
  let guard = 0
  while (s <= end && guard < 400) {
    out.push(s)
    s = addDays(s, 1)
    guard += 1
  }
  return out
}

export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
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

const calendarCache = new Map()

export function getCalendar(regionId) {
  if (calendarCache.has(regionId)) return calendarCache.get(regionId)
  const region = getRegion(regionId)
  const years = []
  for (let y = 2002; y <= 2026; y += 1) years.push(y)
  const raw = {}
  for (const y of years) {
    for (let m = 1; m <= 12; m += 1) raw[`${y}-${m}`] = baseline(region, y, m)
  }
  if (region.id === 'Afrique_Centrale') {
    raw['2007-8'] = 5600
    raw['2016-8'] = 5200
    raw['2024-8'] = 4200
  }
  const rows = []
  for (const y of years) {
    for (let m = 1; m <= 12; m += 1) {
      const prev = []
      for (const py of years) {
        if (py < y) prev.push(raw[`${py}-${m}`])
      }
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
      raw[`${y}-${m}`] = value
      const z = st && st.std > 1 ? (value - st.median) / st.std : null
      rows.push({
        region: region.id,
        annee: y,
        mois: m,
        total_detections: value,
        mediane_historique: st ? Math.round(st.median) : null,
        z_score: z == null ? null : Math.round(z * 100) / 100,
        anomalie: z != null && Math.abs(z) > 2,
      })
    }
  }
  calendarCache.set(regionId, rows)
  return rows
}

export function monthRow(regionId, year, month) {
  return getCalendar(regionId).find((r) => r.annee === year && r.mois === month)
}

export function fireSeason(regionId) {
  const rows = getCalendar(regionId)
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

export function recordYear(regionId) {
  const rows = getCalendar(regionId)
  const byYear = new Map()
  for (const r of rows) byYear.set(r.annee, (byYear.get(r.annee) || 0) + r.total_detections)
  let best = { annee: 2002, total: 0 }
  for (const [annee, total] of byYear) {
    if (total > best.total) best = { annee, total }
  }
  const pic = rows.filter((r) => r.annee === best.annee).reduce((a, b) => (a.total_detections > b.total_detections ? a : b))
  return { ...best, mois: pic.mois, pic: pic.total_detections }
}

export function getAnomalies(regionId, seuil = 2) {
  return getCalendar(regionId)
    .filter((r) => r.z_score != null && r.z_score >= seuil)
    .sort((a, b) => b.z_score - a.z_score)
}

export function getRatio(regionId, month, satelliteId) {
  const region = getRegion(regionId)
  const sat = SATELLITES.find((s) => s.id === satelliteId)
  if (!sat || sat.id === 'Aqua') return 1
  const season = month >= 6 && month <= 9 ? 1.08 : 0.96
  return Math.round(sat.ratio * season * region.eco * 100) / 100
}

function activeSats(date) {
  return SATELLITES.filter((s) => date >= s.start)
}

export function dailyAqua(regionId, iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const row = monthRow(regionId, y, m)
  if (!row) return 1
  const dim = daysInMonth(y, m)
  const wave = 0.62 + hash01(regionId, iso, 'wave') * 0.76
  return Math.max(1, Math.round((row.total_detections / dim) * wave))
}

export function dailyCount(regionId, iso, mode, satellites, satelliteRef = 'Aqua') {
  const aqua = dailyAqua(regionId, iso)
  const month = Number(iso.slice(5, 7))
  const live = activeSats(iso)
  if (mode === 'harmonise') {
    const chosen = live.filter((s) => s.id === satelliteRef || satellites.includes(s.id))
    const pool = chosen.length ? chosen : live.filter((s) => s.id === satelliteRef)
    let total = 0
    for (const s of pool) {
      const raw = Math.round(aqua * (s.id === 'Aqua' ? 1 : getRatio(regionId, month, s.id) / getRatio(regionId, month, 'Aqua')))
      const ratio = s.id === satelliteRef ? 1 : getRatio(regionId, month, s.id)
      total += raw / ratio
    }
    return Math.max(1, Math.round(total))
  }
  const pool = mode === 'brut' ? live.filter((s) => satellites.includes(s.id)) : live
  let total = 0
  for (const s of pool) {
    const ratio = s.id === 'Aqua' ? 1 : getRatio(regionId, month, s.id)
    total += Math.max(0, Math.round(aqua * ratio))
  }
  return total
}

function passHour(sat, year) {
  const t = Math.min(1, Math.max(0, (year - sat.year0) / Math.max(1, sat.year1 - sat.year0)))
  return sat.pass0 + (sat.pass1 - sat.pass0) * t
}

function hhmm(hour, jitterMin) {
  let minutes = Math.round(hour * 60 + jitterMin)
  minutes = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`
}

function clustersFor(region) {
  const list = CLUSTERS.filter((c) => (
    c.lat > region.latMin - 1.5 && c.lat < region.latMax + 1.5
    && c.lon > region.lonMin - 1.5 && c.lon < region.lonMax + 1.5
  ))
  return list.length ? list : [{ id: 'centre', lat: (region.latMin + region.latMax) / 2, lon: (region.lonMin + region.lonMax) / 2, sLat: 1.2, sLon: 1.6, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }]
}

function pickCluster(region, month, seed, i) {
  const list = clustersFor(region)
  const weights = list.map((c) => (c.months.includes(month) ? 5.2 : 0.55))
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = hash01(seed, i, 'clu') * sum
  for (let k = 0; k < list.length; k += 1) {
    r -= weights[k]
    if (r <= 0) return list[k]
  }
  return list[list.length - 1]
}

function gauss(seed, i, salt) {
  const a = Math.max(1e-6, hash01(seed, i, salt))
  const b = hash01(seed, i, salt + 7)
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b)
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

const detCache = new Map()

function detectionsForDay(regionId, iso) {
  const key = `${regionId}|${iso}`
  if (detCache.has(key)) return detCache.get(key)
  const region = getRegion(regionId)
  const [year, month] = iso.split('-').map(Number)
  const aqua = dailyAqua(regionId, iso)
  const points = []
  let n = 0
  for (const sat of activeSats(iso)) {
    const ratio = sat.id === 'Aqua' ? 1 : getRatio(regionId, month, sat.id)
    const count = Math.max(0, Math.round(aqua * ratio))
    for (let i = 0; i < count; i += 1) {
      const cluster = pickCluster(region, month, iso + sat.id, i)
      let lat = cluster.lat + gauss(iso, i, sat.id + 'la') * cluster.sLat * 0.42
      let lon = cluster.lon + gauss(iso, i, sat.id + 'lo') * cluster.sLon * 0.42
      lat = clamp(lat, region.latMin + 0.05, region.latMax - 0.05)
      lon = clamp(lon, region.lonMin + 0.05, region.lonMax - 0.05)
      const u = hash01(iso, sat.id, i, 'frp')
      const frp = u < 0.62 ? 3 + u * 22 : u < 0.9 ? 16 + u * 70 : 90 + u * 160
      const frpRound = Math.round(frp * 10) / 10
      const confidence = sat.instrument === 'MODIS'
        ? String(50 + Math.floor(hash01(iso, i, 'cf') * 51))
        : (hash01(iso, i, 'cf') > 0.38 ? 'h' : 'n')
      const hour = passHour(sat, year)
      const scan = sat.instrument === 'MODIS'
        ? Math.round((1 + hash01(iso, i, 'sc') * 3.4) * 100) / 100
        : Math.round((0.37 + hash01(iso, i, 'sc') * 0.8) * 100) / 100
      const track = sat.instrument === 'MODIS'
        ? Math.round((1 + hash01(iso, i, 'tr') * 1.6) * 100) / 100
        : Math.round((0.37 + hash01(iso, i, 'tr') * 0.35) * 100) / 100
      points.push({
        id: `${iso}-${sat.id}-${i}`,
        latitude: Math.round(lat * 100000) / 100000,
        longitude: Math.round(lon * 100000) / 100000,
        acq_date: iso,
        acq_time: hhmm(hour, (hash01(iso, i, 'tm') - 0.5) * 46),
        satellite: sat.id,
        instrument: sat.instrument,
        confidence,
        frp: frpRound,
        bright_ti4: Math.round((320 + frpRound * 0.45 + hash01(iso, i, 'bt') * 18) * 10) / 10,
        scan,
        track,
        daynight: hash01(iso, i, 'dn') > (sat.id === 'Terra' ? 0.42 : 0.18) ? 'D' : 'N',
        type: 0,
        version: sat.instrument === 'MODIS' ? '6.1' : '2.0NRT',
        valide: true,
        cellule_id: cellId(lat, lon),
        region: region.id,
      })
      n += 1
      if (n > 20000) break
    }
    if (n > 20000) break
  }
  if (detCache.size > 24) detCache.clear()
  detCache.set(key, points)
  return points
}

export function cellId(lat, lon) {
  const la = (Math.round(lat * 10) / 10).toFixed(2)
  const lo = (Math.round(lon * 10) / 10).toFixed(2)
  return `C_${la}_${lo}`
}

export function parseCell(id) {
  const m = String(id).match(/^C_(-?\d+\.\d+)_(-?\d+\.\d+)$/)
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

export function zoneFraction(regionId, ring) {
  if (!ring || ring.length < 3) return 1
  const region = getRegion(regionId)
  let hit = 0
  let inside = 0
  for (let i = 0; i < 700; i += 1) {
    const month = (i % 12) + 1
    const cluster = pickCluster(region, month, 'zone', i)
    const lat = clamp(cluster.lat + gauss('zone', i, 'a') * cluster.sLat * 0.42, region.latMin, region.latMax)
    const lon = clamp(cluster.lon + gauss('zone', i, 'b') * cluster.sLon * 0.42, region.lonMin, region.lonMax)
    hit += 1
    if (pointInRing(lat, lon, ring)) inside += 1
  }
  return hit ? inside / hit : 0
}

function applyZone(points, ring) {
  if (!ring || ring.length < 3) return points
  return points.filter((p) => pointInRing(p.latitude, p.longitude, ring))
}

export function queryDetections({ dateDebut, dateFin, region, satellites, zoneRing }) {
  const days = eachDay(dateDebut, dateFin).slice(0, 370)
  let all = []
  for (const day of days) all = all.concat(detectionsForDay(region, day))
  if (satellites && satellites.length) all = all.filter((d) => satellites.includes(d.satellite))
  all = applyZone(all, zoneRing)
  return all
}

export function queryGlobe({ dateDebut, dateFin, mode = 'combine', satellites = [], region, satelliteRef = 'Aqua', zoneRing }) {
  const days = eachDay(dateDebut, dateFin).slice(0, 31)
  let all = []
  for (const day of days) all = all.concat(detectionsForDay(region, day))
  all = all.filter((d) => d.valide)
  all = applyZone(all, zoneRing)
  if (mode === 'harmonise') {
    const month = Number(dateFin.slice(5, 7))
    const cells = new Map()
    for (const d of all) {
      if (d.satellite !== satelliteRef && satellites.length && !satellites.includes(d.satellite)) continue
      const ratio = d.satellite === satelliteRef ? 1 : getRatio(region, month, d.satellite)
      const equiv = 1 / ratio
      const cur = cells.get(d.cellule_id) || {
        cellule_id: d.cellule_id,
        lat_centre: parseCell(d.cellule_id)?.lat,
        lon_centre: parseCell(d.cellule_id)?.lon,
        region,
        total_detections: 0,
        frp_sum: 0,
        frp_max: 0,
        n: 0,
        satellites: new Set(),
      }
      cur.total_detections += equiv
      cur.frp_sum += d.frp * equiv
      cur.frp_max = Math.max(cur.frp_max, d.frp)
      cur.n += 1
      cur.satellites.add(d.satellite)
      cells.set(d.cellule_id, cur)
    }
    const points = [...cells.values()].map((c) => ({
      cellule_id: c.cellule_id,
      lat_centre: c.lat_centre,
      lon_centre: c.lon_centre,
      region: c.region,
      total_detections: Math.round(c.total_detections * 10) / 10,
      frp_moyen: c.n ? Math.round((c.frp_sum / c.n) * 10) / 10 : 0,
      frp_max: Math.round(c.frp_max * 10) / 10,
      satellites: [...c.satellites],
    }))
    points.sort((a, b) => b.frp_max - a.frp_max)
    return { mode, points: points.slice(0, 10000), total: points.length, truncated: points.length > 10000 }
  }
  let list = all
  if (mode === 'brut') list = list.filter((d) => satellites.includes(d.satellite))
  list.sort((a, b) => b.frp - a.frp)
  const capped = list.slice(0, 10000)
  return {
    mode,
    points: capped.map((d) => ({
      id: d.id,
      latitude: d.latitude,
      longitude: d.longitude,
      acq_date: d.acq_date,
      satellite: d.satellite,
      frp: d.frp,
      confidence: d.confidence,
      instrument: d.instrument,
      acq_time: d.acq_time,
      daynight: d.daynight,
      type: d.type,
      bright_ti4: d.bright_ti4,
      scan: d.scan,
      track: d.track,
      cellule_id: d.cellule_id,
      version: d.version,
    })),
    total: list.length,
    truncated: list.length > 10000,
  }
}

export function getCellules({ region, latMin, latMax, lonMin, lonMax, dateDebut, dateFin, zoneRing }) {
  const globe = queryGlobe({
    dateDebut, dateFin, mode: 'harmonise', satellites: SATELLITES.map((s) => s.id), region, satelliteRef: 'Aqua', zoneRing,
  })
  return globe.points.filter((c) => {
    if (latMin != null && c.lat_centre < latMin) return false
    if (latMax != null && c.lat_centre > latMax) return false
    if (lonMin != null && c.lon_centre < lonMin) return false
    if (lonMax != null && c.lon_centre > lonMax) return false
    return true
  })
}

function cellWeight(celluleId, region) {
  const parsed = parseCell(celluleId)
  if (!parsed) return 0.004
  let w = 0.12
  for (const c of clustersFor(region)) {
    const dlat = (parsed.lat - c.lat) / c.sLat
    const dlon = (parsed.lon - c.lon) / c.sLon
    w = Math.max(w, Math.exp(-(dlat * dlat + dlon * dlon)))
  }
  return 0.0016 + w * 0.012
}

export function getSerie(celluleId, { region, satellite, anneeDebut = 2002, anneeFin = 2026, harmonise = false }) {
  const reg = getRegion(region)
  const weight = cellWeight(celluleId, reg)
  const sats = satellite ? [satellite] : SATELLITES.map((s) => s.id)
  const rows = []
  const cal = getCalendar(region)
  for (const row of cal) {
    if (row.annee < anneeDebut || row.annee > anneeFin) continue
    const iso = `${row.annee}-${String(row.mois).padStart(2, '0')}-15`
    for (const id of sats) {
      const sat = SATELLITES.find((s) => s.id === id)
      if (!sat || iso < sat.start) continue
      const ratio = getRatio(region, row.mois, id)
      let nb = Math.max(0, Math.round(row.total_detections * weight * (id === 'Aqua' ? 1 : ratio)))
      if (harmonise) nb = Math.max(0, Math.round(nb / ratio))
      const frpMoyen = Math.round((12 + (nb % 7) * 3 + hash01(celluleId, row.annee, row.mois, id) * 18) * 10) / 10
      rows.push({
        cellule_id: celluleId,
        satellite: id,
        annee: row.annee,
        mois: row.mois,
        nb_detections: nb,
        frp_moyen: frpMoyen,
        frp_max: Math.round(frpMoyen * (1.8 + hash01(celluleId, id, row.mois) * 1.4) * 10) / 10,
        nb_jours_actifs: Math.max(1, Math.min(daysInMonth(row.annee, row.mois), Math.round(nb * 0.45 + 1))),
      })
    }
  }
  return rows
}

export function defaultCell(regionId) {
  const region = getRegion(regionId)
  return cellId(region.focus.lat, region.focus.lng)
}

export function frpNiveau(frp) {
  if (frp > 100) return { niveau: 'Exceptionnelle', couleur: '#ffd0b8' }
  if (frp >= 30) return { niveau: 'Intense', couleur: '#ff5a36' }
  if (frp >= 10) return { niveau: 'Modérée', couleur: '#f0a05a' }
  return { niveau: 'Faible', couleur: '#f0ddb0' }
}

export function activityLabel(count, usual) {
  if (!usual) return 'habituelle'
  const r = count / usual
  if (r < 0.6) return 'calme'
  if (r < 1.35) return 'habituelle'
  if (r < 2) return 'intense'
  return 'exceptionnelle'
}

export function usualDaily(regionId, iso) {
  const month = Number(iso.slice(5, 7))
  const rows = getCalendar(regionId).filter((r) => r.mois === month && r.annee < Number(iso.slice(0, 4)))
  const med = stats(rows.map((r) => r.total_detections)).median
  if (!med) return { usual: 1, low: 1, high: 2 }
  const dim = daysInMonth(Number(iso.slice(0, 4)), month)
  const usual = med / dim
  return { usual, low: Math.max(1, Math.round(usual * 0.65)), high: Math.max(2, Math.round(usual * 1.35)) }
}

export function decadeTrend(regionId) {
  const rows = getCalendar(regionId)
  const years = []
  for (let y = 2002; y <= 2026; y += 1) {
    const total = rows.filter((r) => r.annee === y).reduce((a, r) => a + r.total_detections, 0)
    years.push({ y, total })
  }
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
  const pct = meanY ? (slope * 10 / meanY) * 100 : 0
  return Math.round(pct)
}

export function scaleCalendar(rows, fraction) {
  if (fraction >= 0.999) return rows
  const f = Math.max(0, fraction)
  return rows.map((r) => ({
    ...r,
    total_detections: Math.round(r.total_detections * f),
    mediane_historique: r.mediane_historique == null ? null : Math.round(r.mediane_historique * f),
  }))
}

export function previousAnomalies(regionId, year, month) {
  return getCalendar(regionId)
    .filter((r) => r.anomalie && r.z_score > 0 && (r.annee < year || (r.annee === year && r.mois < month)))
    .sort((a, b) => b.annee - a.annee || b.mois - a.mois)
    .slice(0, 2)
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
