/** Seam unique. VITE_DATA_SOURCE=api parle à Django ; sinon le moteur de démonstration répond. */

import {
  clipToRegion,
  loadCountries,
  regionBboxParams,
  resolveRegion,
} from '../data/countries'
import {
  ALL_SATS,
  FIRST_YEAR,
  LAST_YEAR,
  REGIONS,
  SATELLITES,
  calendarRows,
  daysInMonth,
  dayFires,
  detectionCsvRows,
  frpNiveau,
  getAnomalies,
  haversineKm,
  monthRow,
  periodDays,
  periodFires,
  queryGlobe,
  satApi,
  satUi,
  seriesData,
  toCsv,
} from '../data/engine'
import { api, apiBlob, apiPages } from './http'

const SOURCE = import.meta.env.VITE_DATA_SOURCE || 'demo'

export const isDemo = SOURCE !== 'api'

const defer = () => new Promise((resolve) => { window.setTimeout(resolve, 0) })

export function regionBbox(regionId) {
  return regionBboxParams(resolveRegion(regionId))
}

async function regionReady(regionId) {
  await loadCountries()
  return resolveRegion(regionId)
}

function engineRegionId(regionId) {
  return REGIONS.some((r) => r.id === regionId) ? regionId : 'Afrique_Centrale'
}

function daynightFromIso(iso) {
  const hour = Number(String(iso || '').slice(11, 13))
  if (Number.isNaN(hour)) return 'D'
  return hour >= 6 && hour < 18 ? 'D' : 'N'
}

function acqTimeFromIso(iso) {
  const hh = String(iso || '').slice(11, 13)
  const mm = String(iso || '').slice(14, 16)
  if (!hh) return '0000'
  return `${hh}${mm || '00'}`
}

export function normalizeDetection(raw) {
  if (!raw) return null
  const lat = Number(raw.latitude ?? raw.lat)
  const lon = Number(raw.longitude ?? raw.lon)
  const dt = raw.date_acquisition || ''
  const date = raw.acq_date || String(dt).slice(0, 10)
  const frp = Number(raw.frp ?? raw.weight ?? 0)
  const brightness = raw.brightness ?? raw.bright_ti4 ?? null
  const satellite = satUi(raw.satellite)
  const instrument = raw.instrument || (satellite === 'Terra' || satellite === 'Aqua' ? 'MODIS' : 'VIIRS')
  return {
    ...raw,
    id: raw.id,
    latitude: lat,
    longitude: lon,
    lat,
    lng: lon,
    lon,
    frp,
    weight: frp,
    satellite,
    instrument,
    satellites: Array.isArray(raw.satellites) ? raw.satellites.map(satUi) : (raw.nb > 1 ? ['plusieurs'] : [satellite].filter(Boolean)),
    nb: Number(raw.nb) || 1,
    confidence: raw.confidence,
    brightness,
    bright_ti4: brightness,
    date_acquisition: dt,
    acq_date: date,
    acq_time: raw.acq_time || acqTimeFromIso(dt),
    daynight: raw.daynight || daynightFromIso(dt),
    type: raw.type ?? 0,
    version: raw.version || '',
    scan: raw.scan,
    track: raw.track,
    kind: 'detection',
  }
}

function keepApi(d, spec) {
  if (!spec) return true
  if (spec.frpMin && (d.frp ?? 0) < spec.frpMin) return false
  if (spec.confiance === 'elevee') {
    const c = d.confidence
    if (!(c === 'h' || Number(c) >= 80)) return false
  }
  if (spec.moment !== 'tous' && d.daynight && d.daynight !== spec.moment) return false
  if (spec.circle) {
    if (haversineKm(d.latitude, d.longitude, spec.circle.lat, spec.circle.lon) > spec.circle.rayon_km) return false
  } else if (spec.ring && spec.bbox) {
    const b = spec.bbox
    if (d.latitude < b.latMin || d.latitude > b.latMax || d.longitude < b.lonMin || d.longitude > b.lonMax) return false
  }
  return true
}

function emptyGlobe(params) {
  return {
    mode: params.mode,
    points: [],
    total: 0,
    equivalent: 0,
    parSat: Object.fromEntries(ALL_SATS.map((id) => [id, 0])),
    parJour: {},
    debut: params.dateDebut,
    fin: params.dateFin,
  }
}

function packGlobe(params, list) {
  const points = list.filter((d) => keepApi(d, params.spec)).slice(0, params.limit || 10000)
  const parSat = Object.fromEntries(ALL_SATS.map((id) => [id, 0]))
  const parJour = {}
  points.forEach((p) => {
    if (p.satellite) parSat[p.satellite] = (parSat[p.satellite] || 0) + 1
    if (p.acq_date) parJour[p.acq_date] = (parJour[p.acq_date] || 0) + 1
  })
  return {
    mode: params.mode,
    points,
    total: points.length,
    equivalent: points.length,
    parSat,
    parJour,
    debut: params.dateDebut,
    fin: params.dateFin,
  }
}

function monthsInRange(debut, fin) {
  const out = []
  let y = Number(debut.slice(0, 4))
  let m = Number(debut.slice(5, 7))
  const endY = Number(fin.slice(0, 4))
  const endM = Number(fin.slice(5, 7))
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m === 13) { m = 1; y += 1 }
  }
  return out
}

function median(values) {
  const list = values.filter((v) => v != null).sort((a, b) => a - b)
  if (!list.length) return null
  const mid = Math.floor(list.length / 2)
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2
}

async function fetchGlobeRaw(params) {
  const region = await regionReady(params.region)
  const bbox = regionBboxParams(region)
  const want = params.limit || 10000
  const unique = params.unique !== false
  const pull = unique || region.kind === 'world' ? want : Math.min(10000, Math.max(want, Math.round(want * 1.4)))
  const satellites = (params.satellites || ALL_SATS).map(satApi)
  const q = {
    date_min: params.dateDebut,
    date_max: params.dateFin,
    limit: String(pull),
    unique: unique ? '1' : '0',
    ...bbox,
    ...(satellites.length && satellites.length < ALL_SATS.length ? { satellite: satellites.join(',') } : {}),
  }
  const data = await api(`/api/globe/?${new URLSearchParams(q).toString()}`)
  const list = clipToRegion((Array.isArray(data) ? data : []).map(normalizeDetection), region).slice(0, want)
  return packGlobe(params, list)
}

async function fetchHarmoniseGlobe(params) {
  const region = await regionReady(params.region)
  const bbox = regionBboxParams(region)
  const data = await api(`/api/globe/harmonise/?${new URLSearchParams({
    date_min: params.dateDebut,
    date_max: params.dateFin,
    limit: String(params.limit || 10000),
    ...bbox,
  }).toString()}`)
  const raw = Array.isArray(data?.points) ? data.points : (Array.isArray(data) ? data : [])
  const cells = clipToRegion(raw.map((c) => {
    const lat = Number(c.lat ?? c.latitude ?? c.lat_centre)
    const lon = Number(c.lon ?? c.longitude ?? c.lon_centre)
    const nb = Number(c.nb_detections) || 0
    const z = Number(c.zscore) || 0
    const frp = Number(c.frp_total ?? c.frp_max) || 0
    return {
      kind: 'cellule',
      id: c.cellule_id ?? c.id,
      cellule_id: c.cellule_id ?? c.id,
      lat_centre: lat,
      lon_centre: lon,
      latitude: lat,
      longitude: lon,
      lat,
      lng: lon,
      lon,
      zscore: z,
      est_anomalie: Boolean(c.est_anomalie),
      mois: c.mois,
      nb_detections: nb,
      total_detections: nb,
      frp: frp,
      frp_max: frp,
      frp_moyen: frp,
    }
  }), region).slice(0, params.limit || 10000)
  const equivalent = cells.reduce((a, p) => a + (p.nb_detections || 0), 0)
  return {
    mode: 'harmonise',
    points: cells,
    total: equivalent,
    equivalent,
    nb_cellules: cells.length,
    parSat: Object.fromEntries(ALL_SATS.map((id) => [id, 0])),
    parJour: {},
    debut: params.dateDebut,
    fin: params.dateFin,
  }
}

export async function fetchGlobe(params) {
  const brut = params.mode === 'brut'
  if (isDemo) {
    await loadCountries()
    await defer()
    const payload = queryGlobe({ ...params, region: engineRegionId(params.region), mode: brut ? 'brut' : 'harmonise' })
    const region = resolveRegion(params.region)
    payload.points = clipToRegion(payload.points, region)
    payload.total = payload.points.length
    return payload
  }
  try {
    if (brut) return await fetchGlobeRaw({ ...params, unique: false, mode: 'brut' })
    return await fetchHarmoniseGlobe(params)
  } catch (err) {
    console.warn('API globe indisponible', err)
    return emptyGlobe({ ...params, mode: brut ? 'brut' : 'harmonise' })
  }
}

async function fetchGlobeJours({ region, debut, fin, satellites, unique = false }) {
  const place = await regionReady(region)
  const bbox = regionBboxParams(place)
  const sats = (satellites || ALL_SATS).map(satApi)
  const data = await api(`/api/globe/jours/?${new URLSearchParams({
    date_min: debut,
    date_max: fin,
    unique: unique ? '1' : '0',
    ...bbox,
    ...(sats.length && sats.length < ALL_SATS.length ? { satellite: sats.join(',') } : {}),
  }).toString()}`)
  const days = (Array.isArray(data?.days) ? data.days : []).map((d) => {
    const parSat = {}
    Object.entries(d.parSat || d.par_sat || {}).forEach(([key, value]) => {
      parSat[satUi(key)] = Number(value) || 0
    })
    return {
      date: d.date,
      total: Number(d.total) || 0,
      frp_max: Number(d.frp_max) || 0,
      parSat,
    }
  })
  return { days, total: Number(data?.total) || days.reduce((a, d) => a + d.total, 0) }
}

function mapResumeRow(regionId, r) {
  const [annee, mois] = String(r.mois).split('-').map(Number)
  const total = Number(r.nb_detections) || 0
  const z = Number(r.zscore_moyen)
  return {
    region: regionId,
    annee,
    mois,
    mois_iso: r.mois,
    total_detections: total,
    mediane_historique: null,
    z_score: Number.isNaN(z) ? null : z,
    anomalie: Boolean(r.nb_anomalies) || Math.abs(z) >= 2,
    nb_cellules: r.nb_cellules,
    nb_anomalies: r.nb_anomalies,
    source: 'api',
    etat: 'complet',
  }
}

function withMedians(rows) {
  const byMonth = new Map()
  rows.forEach((r) => {
    const list = byMonth.get(r.mois) || []
    list.push(r)
    byMonth.set(r.mois, list)
  })
  return rows.map((r) => {
    const prev = (byMonth.get(r.mois) || []).filter((x) => x.annee < r.annee).map((x) => x.total_detections)
    const med = median(prev)
    return { ...r, mediane_historique: med, anomalie: r.anomalie || (r.z_score != null && Math.abs(r.z_score) >= 2) }
  })
}

export async function fetchCalendrier({ region, source = 'aqua', satellites, spec }) {
  if (isDemo) {
    await defer()
    return calendarRows(region, { source, satellites, spec })
  }
  const place = await regionReady(region)
  const bbox = regionBboxParams(place)
  const data = await api(`/api/calendrier/resume/?${new URLSearchParams(bbox).toString()}`)
  const rows = withMedians((Array.isArray(data) ? data : []).map((r) => mapResumeRow(region, r)))
  return rows.filter((r) => r.annee >= FIRST_YEAR && r.annee <= LAST_YEAR)
}

export async function fetchAnomalies({ region, seuil = 2, rows }) {
  if (isDemo) return getAnomalies(region, seuil, rows)
  const list = rows || await fetchCalendrier({ region })
  return list.filter((r) => r.z_score != null && Math.abs(r.z_score) >= seuil)
}

export async function fetchPeriodDays({ region, debut, fin, mode, satellites, spec }) {
  if (isDemo) {
    await defer()
    return periodDays({ region, debut, fin, satellites: satellites || ALL_SATS, spec })
  }
  if (mode === 'brut') {
    const jours = await fetchGlobeJours({ region, debut, fin, satellites, unique: false })
    return {
      debut,
      fin,
      cells: [],
      days: jours.days,
      total: jours.total,
    }
  }
  const globe = await fetchHarmoniseGlobe({ dateDebut: debut, dateFin: fin, region, limit: 10000 })
  return {
    debut,
    fin,
    cells: globe.points,
    days: [],
    total: globe.equivalent,
    capped: globe.points.length >= 10000,
  }
}

export async function fetchDayFires({ region, date, satellites, spec }) {
  if (isDemo) return dayFires(region, date, satellites, spec)
  const data = await fetchGlobe({
    dateDebut: date, dateFin: date, region, satellites, spec, mode: 'brut', limit: 5000,
  })
  return data.points
}

function serieBucketFromMensuelle(r) {
  const key = r.mois
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7))
  const jours = daysInMonth(y, m)
  const n = Number(r.nb_detections) || 0
  const sum = Number(r.frp_total) || 0
  const cell = { n, eq: n, sum, max: sum, actifs: n > 0 ? 1 : 0, couvert: jours }
  return {
    key,
    debut: `${key}-01`,
    fin: `${key}-${String(jours).padStart(2, '0')}`,
    jours,
    sat: { Aqua: cell },
  }
}

function addAquaCell(a, b) {
  if (!a) return { ...b }
  return {
    n: a.n + b.n,
    eq: a.eq + b.eq,
    sum: a.sum + b.sum,
    max: Math.max(a.max, b.max),
    actifs: a.actifs + b.actifs,
    couvert: a.couvert + b.couvert,
  }
}

function foldAquaBuckets(monthly, gran, debut, fin) {
  if (!monthly.length) return []
  if (gran === 'tout') {
    const aqua = monthly.reduce((acc, b) => addAquaCell(acc, b.sat.Aqua), null)
    return [{
      key: `${debut.slice(0, 7)}–${fin.slice(0, 7)}`,
      debut,
      fin,
      jours: monthly.reduce((a, b) => a + b.jours, 0),
      sat: { Aqua: aqua },
    }]
  }
  if (gran === 'annee') {
    const byYear = new Map()
    monthly.forEach((b) => {
      const y = b.key.slice(0, 4)
      const acc = byYear.get(y)
      if (!acc) {
        byYear.set(y, {
          key: y,
          debut: `${y}-01-01`,
          fin: `${y}-12-31`,
          jours: b.jours,
          sat: { Aqua: { ...b.sat.Aqua } },
        })
      } else {
        acc.jours += b.jours
        acc.sat.Aqua = addAquaCell(acc.sat.Aqua, b.sat.Aqua)
      }
    })
    return [...byYear.values()].sort((a, b) => a.key.localeCompare(b.key))
  }
  return monthly
}

function bucketsFromPoints(points, gran, debut, fin, satellites) {
  const map = new Map()
  const sats = satellites?.length ? satellites : ALL_SATS
  for (const d of points) {
    const day = d.acq_date
    if (!day) continue
    const key = gran === 'annee' ? day.slice(0, 4) : gran === 'mois' ? day.slice(0, 7) : day
    const bucket = map.get(key) || { key, debut: key, fin: key, jours: 1, sat: {} }
    sats.forEach((id) => {
      if (!bucket.sat[id]) bucket.sat[id] = { n: 0, eq: 0, sum: 0, max: 0, actifs: 0, couvert: 1 }
    })
    const sat = bucket.sat[d.satellite] || (bucket.sat[d.satellite] = { n: 0, eq: 0, sum: 0, max: 0, actifs: 0, couvert: 1 })
    sat.n += 1
    sat.eq += 1
    sat.sum += d.frp || 0
    sat.max = Math.max(sat.max, d.frp || 0)
    sat.actifs = 1
    map.set(key, bucket)
  }
  if (!map.size) {
    return [{
      key: debut.slice(0, gran === 'annee' ? 4 : gran === 'mois' ? 7 : 10),
      debut,
      fin,
      jours: 1,
      sat: Object.fromEntries(sats.map((id) => [id, { n: 0, eq: 0, sum: 0, max: 0, actifs: 0, couvert: 1 }])),
    }]
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export async function lookupCellule(lat, lon) {
  if (isDemo) return null
  const d = 0.3
  const list = await apiPages('/api/cellules/', {
    lat_min: lat - d, lat_max: lat + d, lon_min: lon - d, lon_max: lon + d, page_size: 100,
  })
  if (!list.length) return null
  list.sort((a, b) => {
    const da = (Number(a.lat_centre) - lat) ** 2 + (Number(a.lon_centre) - lon) ** 2
    const db = (Number(b.lat_centre) - lat) ** 2 + (Number(b.lon_centre) - lon) ** 2
    return da - db
  })
  return list[0].id
}

function emptySat(sats) {
  return Object.fromEntries((sats || ALL_SATS).map((id) => [id, { n: 0, eq: 0, sum: 0, max: 0, actifs: 0, couvert: 1 }]))
}

function bucketsFromJours(days, gran, debut, fin, satellites) {
  const sats = satellites?.length ? satellites : ALL_SATS
  const daily = (days || []).map((d) => {
    const sat = emptySat(sats)
    Object.entries(d.parSat || {}).forEach(([id, n]) => {
      const key = sats.includes(id) ? id : satUi(id)
      if (!sat[key]) return
      const v = Number(n) || 0
      sat[key] = { n: v, eq: v, sum: v, max: Number(d.frp_max) || 0, actifs: v > 0 ? 1 : 0, couvert: 1 }
    })
    return { key: d.date, debut: d.date, fin: d.date, jours: 1, sat }
  }).sort((a, b) => a.key.localeCompare(b.key))
  if (!daily.length) {
    return [{
      key: debut.slice(0, gran === 'annee' ? 4 : gran === 'mois' ? 7 : 10),
      debut,
      fin,
      jours: 1,
      sat: emptySat(sats),
    }]
  }
  if (gran === 'jour') return daily
  const by = new Map()
  daily.forEach((b) => {
    const key = gran === 'annee' ? b.key.slice(0, 4) : gran === 'tout' ? `${debut.slice(0, 7)}–${fin.slice(0, 7)}` : b.key.slice(0, 7)
    const acc = by.get(key)
    if (!acc) {
      const sat = emptySat(sats)
      sats.forEach((id) => { sat[id] = { ...b.sat[id] } })
      by.set(key, {
        key,
        debut: gran === 'annee' ? `${key}-01-01` : gran === 'tout' ? debut : `${key}-01`,
        fin: gran === 'annee' ? `${key}-12-31` : gran === 'tout' ? fin : b.fin,
        jours: b.jours,
        sat,
      })
      return
    }
    acc.jours += b.jours
    sats.forEach((id) => { acc.sat[id] = addAquaCell(acc.sat[id], b.sat[id]) })
  })
  return [...by.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export async function fetchSeries(params) {
  const brut = params.mode === 'brut'
  if (isDemo) {
    await defer()
    return seriesData({
      ...params,
      satellites: brut ? (params.satellites || ALL_SATS) : ['Aqua'],
      gran: (!brut && params.gran === 'jour') ? 'mois' : params.gran,
    })
  }
  const cell = params.cell
  const gran = (!brut && params.gran === 'jour') ? 'mois' : (params.gran || 'mois')
  if (brut && !(cell && /^\d+$/.test(String(cell)))) {
    const jours = await fetchGlobeJours({
      region: params.region,
      debut: params.debut,
      fin: params.fin,
      satellites: params.satellites,
      unique: false,
    })
    return bucketsFromJours(jours.days, gran, params.debut, params.fin, params.satellites || ALL_SATS)
  }
  let monthly = []
  if (cell && /^\d+$/.test(String(cell))) {
    const rows = await api(`/api/cellules/${cell}/serie/`)
    const list = Array.isArray(rows) ? rows : []
    monthly = list
      .filter((r) => r.mois >= params.debut.slice(0, 7) && r.mois <= params.fin.slice(0, 7))
      .map(serieBucketFromMensuelle)
  } else {
    const cal = await fetchCalendrier({ region: params.region })
    monthly = cal
      .filter((r) => r.mois_iso >= params.debut.slice(0, 7) && r.mois_iso <= params.fin.slice(0, 7))
      .map((r) => {
        const n = r.total_detections || 0
        const jours = daysInMonth(r.annee, r.mois)
        const cellStat = { n, eq: n, sum: Number(r.frp_total) || n * 10, max: n, actifs: n > 0 ? 1 : 0, couvert: jours }
        return {
          key: r.mois_iso,
          debut: `${r.mois_iso}-01`,
          fin: `${r.mois_iso}-${String(jours).padStart(2, '0')}`,
          jours,
          sat: { Aqua: cellStat },
        }
      })
  }
  return foldAquaBuckets(monthly, gran, params.debut, params.fin)
}

export async function fetchDetection(id, region, date) {
  if (isDemo) return dayFires(region, date).find((d) => d.id === id) || null
  const raw = await api(`/api/detections/${id}/`)
  return normalizeDetection(raw)
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}

export async function exportDetectionsCsv({ region, debut, fin, satellites = ALL_SATS, spec }) {
  if (isDemo) {
    await defer()
    const res = periodFires({ region, debut, fin, satellites, spec })
    downloadText(`firewatch-${region}-${res.debut}_${res.fin}.csv`, toCsv(detectionCsvRows(res.list)))
    return { total: res.total, truncated: res.truncated, capped: res.capped, debut: res.debut, fin: res.fin }
  }
  const place = await regionReady(region)
  const bbox = regionBboxParams(place)
  const q = new URLSearchParams({
    date_min: debut,
    date_max: fin,
    ...bbox,
    ...(satellites.length === 1 ? { satellite: satApi(satellites[0]) } : satellites.length < ALL_SATS.length ? { satellite: satellites.map(satApi).join(',') } : {}),
  })
  const blob = await apiBlob(`/api/export/csv/?${q.toString()}`)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'firewatch_export.csv'
  a.click()
  URL.revokeObjectURL(a.href)
  return { total: null, truncated: false }
}

export function exportFiresCsv(name, list) {
  downloadText(name, toCsv(detectionCsvRows(list)))
}

export function exportCalendarCsv(region, rows) {
  downloadText(
    `firewatch-calendrier-${region}.csv`,
    toCsv(rows.map((r) => ({
      region: r.region,
      annee: r.annee,
      mois: r.mois,
      total_detections: r.total_detections ?? '',
      mediane_historique: r.mediane_historique ?? '',
      z_score: r.z_score ?? '',
      anomalie: r.anomalie,
      nb_cellules: r.nb_cellules ?? '',
      nb_anomalies: r.nb_anomalies ?? '',
    }))),
  )
}

export function exportRowsCsv(name, rows) {
  downloadText(name, toCsv(rows))
}

export { SATELLITES, monthRow, frpNiveau }
