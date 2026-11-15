/** Seam unique. VITE_DATA_SOURCE=api branche les routes Django de la spec. */

import {
  SATELLITES,
  queryGlobe,
  queryDetections,
  getCalendar,
  getAnomalies,
  getSerie,
  getCellules,
  scaleCalendar,
  zoneFraction,
  detectionCsvRows,
  toCsv,
  monthRow,
} from '../data/engine'

const SOURCE = import.meta.env.VITE_DATA_SOURCE || 'demo'
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export const isDemo = SOURCE !== 'api'

async function apiGet(path, params) {
  const q = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v)
  })
  const res = await fetch(`${BASE}${path}?${q.toString()}`, { credentials: 'include' })
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json()
}

export async function fetchGlobe(params) {
  if (!isDemo) {
    return apiGet('/api/globe/', {
      date_debut: params.dateDebut,
      date_fin: params.dateFin,
      mode: params.mode,
      satellites: (params.satellites || []).join(','),
      region: params.region,
      satellite_ref: params.satelliteRef,
    })
  }
  return queryGlobe(params)
}

export async function fetchCalendrier({ region, anneeDebut, anneeFin, zoneRing }) {
  if (!isDemo) {
    return apiGet('/api/calendrier/', { region, annee_debut: anneeDebut, annee_fin: anneeFin })
  }
  let rows = getCalendar(region)
  if (anneeDebut) rows = rows.filter((r) => r.annee >= anneeDebut)
  if (anneeFin) rows = rows.filter((r) => r.annee <= anneeFin)
  if (zoneRing && zoneRing.length >= 3) {
    rows = scaleCalendar(rows, zoneFraction(region, zoneRing))
  }
  return rows
}

export async function fetchAnomalies({ region, seuil = 2 }) {
  if (!isDemo) return apiGet('/api/anomalies/', { region, seuil })
  return getAnomalies(region, seuil)
}

export async function fetchSerie(celluleId, params) {
  if (!isDemo) {
    return apiGet(`/api/cellules/${celluleId}/serie/`, {
      satellite: params.satellite,
      annee_debut: params.anneeDebut,
      annee_fin: params.anneeFin,
    })
  }
  return getSerie(celluleId, params)
}

export async function fetchCellules(params) {
  if (!isDemo) {
    return apiGet('/api/cellules/', {
      region: params.region,
      lat_min: params.latMin,
      lat_max: params.latMax,
      lon_min: params.lonMin,
      lon_max: params.lonMax,
    })
  }
  return getCellules(params)
}

export async function fetchCelluleJours(celluleId, params) {
  if (!isDemo) {
    return apiGet(`/api/cellules/${celluleId}/jours/`, {
      date_debut: params.dateDebut,
      date_fin: params.dateFin,
      satellite: params.satellite,
    })
  }
  const dets = queryDetections({
    dateDebut: params.dateDebut,
    dateFin: params.dateFin,
    region: params.region,
    satellites: params.satellite ? [params.satellite] : undefined,
  }).filter((d) => d.cellule_id === celluleId)
  const map = new Map()
  for (const d of dets) {
    const key = `${d.acq_date}|${d.satellite}`
    const cur = map.get(key) || { cellule_id: celluleId, date: d.acq_date, satellite: d.satellite, nb_detections: 0, frp_sum: 0, frp_max: 0 }
    cur.nb_detections += 1
    cur.frp_sum += d.frp
    cur.frp_max = Math.max(cur.frp_max, d.frp)
    map.set(key, cur)
  }
  return [...map.values()].map((r) => ({
    cellule_id: r.cellule_id,
    date: r.date,
    satellite: r.satellite,
    nb_detections: r.nb_detections,
    frp_moyen: Math.round((r.frp_sum / r.nb_detections) * 10) / 10,
    frp_max: Math.round(r.frp_max * 10) / 10,
  }))
}

export async function fetchDetection(id, region, date) {
  if (!isDemo) return apiGet(`/api/detections/${id}/`)
  const list = queryDetections({ dateDebut: date, dateFin: date, region })
  return list.find((d) => d.id === id) || null
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

export async function exportDetectionsCsv(params) {
  if (!isDemo) {
    const q = new URLSearchParams({
      date_debut: params.dateDebut,
      date_fin: params.dateFin,
      region: params.region || '',
      satellite: params.satellite || '',
    })
    const res = await fetch(`${BASE}/api/export/csv/?${q.toString()}`, { credentials: 'include' })
    if (!res.ok) throw new Error('Export impossible')
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'firewatch-detections.csv'
    a.click()
    URL.revokeObjectURL(a.href)
    return
  }
  let list = queryDetections(params)
  list.sort((a, b) => b.frp - a.frp)
  const truncated = list.length > 20000
  list = list.slice(0, 20000)
  downloadText(
    `firewatch-${params.region}-${params.dateDebut}_${params.dateFin}.csv`,
    toCsv(detectionCsvRows(list)),
  )
  return { truncated, total: list.length }
}

export async function exportCalendarCsv(region, rows) {
  downloadText(
    `firewatch-calendrier-${region}.csv`,
    toCsv(rows.map((r) => ({
      region: r.region,
      annee: r.annee,
      mois: r.mois,
      total_detections: r.total_detections,
      mediane_historique: r.mediane_historique ?? '',
      z_score: r.z_score ?? '',
      anomalie: r.anomalie,
    }))),
  )
}

export async function exportSerieCsv(celluleId, rows) {
  downloadText(`firewatch-serie-${celluleId}.csv`, toCsv(rows))
}

export { SATELLITES, monthRow }
