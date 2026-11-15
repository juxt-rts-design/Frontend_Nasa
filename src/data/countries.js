/** Pays du monde : contours Natural Earth 110m, recherche FR, test « dans le pays ». */

import { REGIONS } from './engine'

export const WORLD = {
  id: 'Monde',
  nom: 'Monde entier',
  kind: 'world',
  latMin: -56,
  latMax: 78,
  lonMin: -170,
  lonMax: 180,
  focus: { lat: 8, lng: 18, altitude: 2.4 },
}

export const MACRO_DEFS = [
  {
    id: 'Afrique_Centrale',
    nom: 'Afrique centrale',
    iso3: ['GAB', 'CMR', 'COG', 'COD', 'CAF', 'GNQ'],
    focus: { lat: 1.1, lng: 17.6, altitude: 1.42 },
  },
]

export const LEGACY_REGION_ID = {
  Afrique_Centrale: 'Afrique_Centrale',
  Gabon: 'GAB',
  Cameroun: 'CMR',
  Congo: 'COG',
  RDC: 'COD',
  RCA: 'CAF',
}

const ALIASES = [
  ['rdc', 'COD'], ['drc', 'COD'], ['zaire', 'COD'], ['congo kinshasa', 'COD'],
  ['congo brazzaville', 'COG'], ['republique du congo', 'COG'],
  ['rca', 'CAF'], ['centrafrique', 'CAF'],
  ['guinee equatoriale', 'GNQ'],
  ['cote divoire', 'CIV'], ['ivory coast', 'CIV'],
  ['usa', 'USA'], ['etats unis', 'USA'], ['etats-unis', 'USA'],
  ['uk', 'GBR'], ['angleterre', 'GBR'], ['royaume uni', 'GBR'],
  ['emirats', 'ARE'], ['uae', 'ARE'],
  ['coree du sud', 'KOR'], ['coree du nord', 'PRK'],
  ['pays bas', 'NLD'], ['holland', 'NLD'],
  ['tchequie', 'CZE'], ['republique tcheque', 'CZE'],
  ['eswatini', 'SWZ'], ['swaziland', 'SWZ'],
  ['myanmar', 'MMR'], ['birmanie', 'MMR'],
  ['cap vert', 'CPV'],
]

const POPULAR = ['GAB', 'CMR', 'COG', 'COD', 'CAF', 'BRA', 'USA', 'AUS', 'IND', 'IDN', 'RUS', 'CAN', 'CHN', 'ZAF', 'AGO', 'NGA', 'MEX', 'FRA']

let atlas = null
let pending = null

export function fold(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function bboxOfGeometry(geometry) {
  const acc = [90, -90, 180, -180]
  walkCoords(geometry?.coordinates, (lon, lat) => {
    acc[0] = Math.min(acc[0], lat)
    acc[1] = Math.max(acc[1], lat)
    acc[2] = Math.min(acc[2], lon)
    acc[3] = Math.max(acc[3], lon)
  })
  return { latMin: acc[0], latMax: acc[1], lonMin: acc[2], lonMax: acc[3] }
}

function walkCoords(node, visit) {
  if (!node) return
  if (typeof node[0] === 'number') visit(node[0], node[1])
  else node.forEach((child) => walkCoords(child, visit))
}

function focusFromBbox(b, fallback) {
  if (!b) return fallback || WORLD.focus
  const lat = (b.latMin + b.latMax) / 2
  let lng = (b.lonMin + b.lonMax) / 2
  if (b.lonMax - b.lonMin > 300) lng = fallback?.lng ?? 20
  const span = Math.max(b.latMax - b.latMin, Math.abs(b.lonMax - b.lonMin) * Math.cos((lat * Math.PI) / 180))
  const altitude = Math.min(2.45, Math.max(0.32, span / 26))
  return { lat, lng, altitude }
}

function pointInRing(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const crosses = (yi > lat) !== (yj > lat)
    if (crosses && lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi) inside = !inside
  }
  return inside
}

export function pointInGeometry(lon, lat, geometry) {
  if (!geometry) return false
  const polys = geometry.type === 'MultiPolygon'
    ? geometry.coordinates
    : geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : []
  for (const polygon of polys) {
    const [outer, ...holes] = polygon
    if (pointInRing(lon, lat, outer) && holes.every((hole) => !pointInRing(lon, lat, hole))) return true
  }
  return false
}

export function inRegion(lat, lon, region) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !region) return false
  if (region.kind === 'world') return true
  if (region.geometry) return pointInGeometry(lon, lat, region.geometry)
  if (region.features?.length) return region.features.some((f) => pointInGeometry(lon, lat, f.geometry))
  return lat >= region.latMin && lat <= region.latMax && lon >= region.lonMin && lon <= region.lonMax
}

function fromFeature(feat) {
  const p = feat.properties || {}
  const id = String(feat.id || p.id || '')
  const box = {
    latMin: p.latMin, latMax: p.latMax, lonMin: p.lonMin, lonMax: p.lonMax,
  }
  const bbox = Number.isFinite(box.latMin) ? box : bboxOfGeometry(feat.geometry)
  return {
    id,
    iso2: p.iso2 || '',
    nom: p.nom || p.nomEn || id,
    nomEn: p.nomEn || p.nom || id,
    kind: 'country',
    geometry: feat.geometry,
    geojson: { type: 'FeatureCollection', features: [feat] },
    features: [feat],
    ...bbox,
    focus: focusFromBbox(bbox),
  }
}

function buildMacro(def) {
  const features = (def.iso3 || []).map((iso) => atlas?.byId.get(iso)?.features?.[0]).filter(Boolean)
  if (!features.length) {
    const legacy = REGIONS.find((r) => r.id === def.id)
    if (legacy) {
      return {
        ...legacy,
        kind: 'macro',
        iso3: def.iso3,
        geojson: { type: 'FeatureCollection', features: [] },
        features: [],
      }
    }
  }
  const bbox = features.reduce((acc, f) => {
    const p = f.properties
    return {
      latMin: Math.min(acc.latMin, p.latMin),
      latMax: Math.max(acc.latMax, p.latMax),
      lonMin: Math.min(acc.lonMin, p.lonMin),
      lonMax: Math.max(acc.lonMax, p.lonMax),
    }
  }, { latMin: 90, latMax: -90, lonMin: 180, lonMax: -180 })
  return {
    id: def.id,
    nom: def.nom,
    kind: 'macro',
    iso3: def.iso3,
    ...bbox,
    focus: def.focus || focusFromBbox(bbox),
    features,
    geojson: { type: 'FeatureCollection', features },
  }
}

function indexAtlas(collection) {
  const countries = []
  const byId = new Map()
  for (const feat of collection.features || []) {
    const country = fromFeature(feat)
    if (!country.id) continue
    countries.push(country)
    byId.set(country.id, country)
  }
  countries.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  atlas = { countries, byId, features: collection.features || [] }
  return atlas
}

export function getAtlas() {
  return atlas
}

export async function loadCountries() {
  if (atlas) return atlas
  if (pending) return pending
  pending = fetch('/geo/countries-110m.geojson')
    .then((res) => {
      if (!res.ok) throw new Error('Contours des pays indisponibles')
      return res.json()
    })
    .then(indexAtlas)
    .catch((err) => {
      pending = null
      console.warn(err)
      atlas = { countries: [], byId: new Map(), features: [] }
      return atlas
    })
  return pending
}

export function resolveRegion(id) {
  const key = LEGACY_REGION_ID[id] || id || 'Afrique_Centrale'
  if (key === 'Monde' || key === 'WORLD') return WORLD
  const macro = MACRO_DEFS.find((m) => m.id === key)
  if (macro) return buildMacro(macro)
  const country = atlas?.byId.get(key)
  if (country) return country
  const legacy = REGIONS.find((r) => r.id === key || r.id === id)
  if (legacy) return { ...legacy, kind: 'bbox', geojson: { type: 'FeatureCollection', features: [] }, features: [] }
  return WORLD
}

export function countryAtPoint(lat, lon) {
  if (!atlas || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  let hit = null
  let bestArea = Infinity
  for (const country of atlas.countries) {
    const area = (country.latMax - country.latMin) * (country.lonMax - country.lonMin)
    if (lat < country.latMin || lat > country.latMax || lon < country.lonMin || lon > country.lonMax) {
      if (country.lonMax - country.lonMin < 300) continue
    }
    if (!pointInGeometry(lon, lat, country.geometry)) continue
    if (area < bestArea) {
      bestArea = area
      hit = country
    }
  }
  return hit
}

function aliasHit(q) {
  const found = []
  for (const [alias, iso] of ALIASES) {
    if (alias === q || alias.startsWith(q) || q.startsWith(alias)) {
      const c = atlas?.byId.get(iso)
      if (c) found.push(c)
    }
  }
  return found
}

export function searchPlaces(query, limit = 12) {
  const macros = [WORLD, ...MACRO_DEFS.map(buildMacro)]
  const q = fold(query)
  if (!q) {
    const popular = POPULAR.map((iso) => atlas?.byId.get(iso)).filter(Boolean)
    const seen = new Set()
    const out = []
    for (const item of [...macros, ...popular]) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      out.push(item)
    }
    return out.slice(0, limit)
  }
  const scored = []
  for (const item of macros) {
    const n = fold(item.nom)
    const i = fold(item.id)
    let score = 0
    if (n === q || i === q) score = 100
    else if (n.startsWith(q) || i.startsWith(q)) score = 80
    else if (n.includes(q)) score = 50
    if (score) scored.push({ item, score })
  }
  for (const c of aliasHit(q)) scored.push({ item: c, score: 90 })
  for (const c of atlas?.countries || []) {
    const n = fold(c.nom)
    const e = fold(c.nomEn)
    const i = fold(c.id)
    let score = 0
    if (n === q || e === q || i === q) score = 100
    else if (n.startsWith(q) || e.startsWith(q)) score = 80
    else if (i.startsWith(q)) score = 70
    else if (n.includes(q) || e.includes(q)) score = 45
    if (score) scored.push({ item: c, score })
  }
  const seen = new Set()
  const out = []
  scored.sort((a, b) => b.score - a.score || a.item.nom.localeCompare(b.item.nom, 'fr'))
  for (const { item } of scored) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

export function clipToRegion(list, region) {
  if (!Array.isArray(list) || !list.length) return list || []
  if (!region || region.kind === 'world') return list
  return list.filter((d) => inRegion(
    Number(d.latitude ?? d.lat),
    Number(d.longitude ?? d.lon ?? d.lng),
    region,
  ))
}

export function regionBboxParams(region) {
  if (!region || region.kind === 'world') return {}
  return {
    lat_min: String(region.latMin),
    lat_max: String(region.latMax),
    lon_min: String(region.lonMin),
    lon_max: String(region.lonMax),
  }
}

export function mapZoomFor(region) {
  if (!region || region.kind === 'world') return 2
  const span = Math.max(region.latMax - region.latMin, region.lonMax - region.lonMin)
  if (span > 50) return 3
  if (span > 22) return 4
  if (span > 10) return 5
  if (span > 5) return 6
  return 7
}
