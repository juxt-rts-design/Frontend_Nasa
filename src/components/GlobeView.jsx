import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state'
import { exportRowsCsv, fetchCalendrier, fetchGlobe, isDemo } from '../api/client'
import {
  activityLabel, daysInMonth, eachDay, monthRow, previousAnomalies,
} from '../data/engine'
import { useAsync } from '../ui/hooks'
import { Icon } from '../ui/icons'
import { Spinner, UniqueToggle } from '../ui/controls'
import {
  capital, fmt, fmtPeriod, moisNom, versus,
} from '../ui/format'
import { DateRail } from './DateRail'
import { AlertStream } from './AlertStream'
import { nearPlace } from '../data/gazetteer'
import { FireDetail, FrpBadge, SatTag } from './FireDetail'
import { LocateMap } from './LocateMap'
import { PlaceName } from './PlaceName'
import { HARM_COLOR, satColor } from '../data/engine'

const Globe = lazy(() => import('react-globe.gl'))

function tip(d) {
  if (d.kind === 'detection') {
    return `<div class="g-tip"><b>${fmt(d.frp, 1)} MW · ${d.satellite || 'capteur'}</b><span>${d.acq_date || ''} · ${fmt(d.lat, 2)}°, ${fmt(d.lng, 2)}°</span></div>`
  }
  const z = Number(d.zscore) || 0
  const extra = d.est_anomalie ? ' · plus que d’habitude' : ''
  return `<div class="g-tip"><b>${fmt(d.nb_detections, 1)} équivalent Aqua</b><span>Case ~28 km · z-score ${fmt(z, 1)}${extra}</span></div>`
}

function decorate(payload) {
  if (!payload) return []
  if (payload.mode === 'brut') {
    return payload.points.map((p) => ({
      ...p,
      kind: 'detection',
      lat: p.latitude ?? p.lat,
      lng: p.longitude ?? p.lng ?? p.lon,
      color: satColor(p.satellite),
      radius: Math.min(0.28, 0.04 + Math.sqrt(p.frp || 1) * 0.012),
      altitude: 0.006 + Math.min(0.04, (p.frp || 0) / 8000),
    }))
  }
  return payload.points.map((p) => ({
    ...p,
    kind: 'cellule',
    lat: p.lat_centre ?? p.lat,
    lng: p.lon_centre ?? p.lng ?? p.lon,
    color: HARM_COLOR,
    radius: Math.min(0.42, 0.08 + Math.sqrt(Math.max(0, p.nb_detections || 1)) * 0.02),
    altitude: 0.01,
  }))
}

export function GlobeView() {
  const app = useApp()
  const wrap = useRef(null)
  const globe = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [note, setNote] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    const apply = () => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 600 })
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const desiredPov = useRef(null)

  function applyPov(target, ms = 0) {
    const g = globe.current
    if (!g?.pointOfView || !target) return false
    const lat = Number(target.lat)
    const lng = Number(target.lng)
    const altitude = Number(target.altitude) > 0 ? Number(target.altitude) : 0.7
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
    g.pointOfView({ lat, lng, altitude }, ms)
    try { g.controls().autoRotate = false } catch { /* contrôles pas encore prêts */ }
    return true
  }

  function lookAt(target, ms = 0) {
    desiredPov.current = target
    return applyPov(target, ms)
  }

  function zonePov(lat, lng, altitude = 0.065) {
    const alt = Number(altitude) > 0 ? Number(altitude) : 0.065
    // Légèrement à l’ouest : le point se place à droite de la mini-carte.
    return { lat: Number(lat), lng: Number(lng) - Math.max(0.28, alt * 4.2), altitude: alt }
  }

  function frameGlobe(ms) {
    if (app.focus?.from === 'notif' || app.focus?.from === 'assistant') {
      const alt = Number(app.focus.altitude) > 0 ? Number(app.focus.altitude) : 0.4
      const target = alt <= 0.28
        ? zonePov(app.focus.lat, app.focus.lng, alt)
        : { lat: Number(app.focus.lat), lng: Number(app.focus.lng), altitude: alt }
      return lookAt(target, ms)
    }
    return lookAt(app.region.focus, ms)
  }

  useEffect(() => {
    if (app.focus?.from === 'notif' || app.focus?.from === 'assistant') return undefined
    let stop = false
    let tries = 0
    const tick = () => {
      if (stop) return
      if (frameGlobe(tries === 0 ? 0 : 700)) return
      tries += 1
      if (tries < 40) window.setTimeout(tick, 160)
    }
    tick()
    return () => { stop = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.regionId, app.region.focus, app.atlasReady])

  useEffect(() => {
    if (app.view !== 'globe' || app.focus?.lat == null) return undefined
    const alt = Number(app.focus.altitude) > 0 ? Number(app.focus.altitude) : 0.4
    const target = (app.focus.from === 'assistant' && alt > 0.28)
      ? { lat: Number(app.focus.lat), lng: Number(app.focus.lng), altitude: alt }
      : zonePov(app.focus.lat, app.focus.lng, alt)
    desiredPov.current = target
    let stop = false
    let tries = 0
    const tick = () => {
      if (stop) return
      if (applyPov(target, tries === 0 ? 1400 : 700)) return
      tries += 1
      if (tries < 40) window.setTimeout(tick, 120)
    }
    tick()
    return () => { stop = true }
  }, [app.focus, app.view])

  const satKey = app.effectiveSats.join('|')
  const { data: payload, loading } = useAsync(() => fetchGlobe({
    dateDebut: app.dateDebut,
    dateFin: app.dateFin,
    region: app.regionId,
    limit: app.pointLimit,
    mode: app.mode,
    satellites: app.effectiveSats,
    spec: app.spec,
  }), [app.dateDebut, app.dateFin, app.regionId, app.pointLimit, app.mode, satKey, app.spec])

  useEffect(() => {
    function onKey(e) {
      if (app.view !== 'globe') return
      if (e.target instanceof HTMLElement && e.target.matches('input, textarea, select')) return
      if (e.key === 'ArrowLeft') app.shift(-1)
      if (e.key === 'ArrowRight') app.shift(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [app])

  const points = useMemo(() => decorate(payload), [payload])
  const pinnedFocus = useRef(null)

  useEffect(() => {
    if ((app.focus?.from !== 'notif' && app.focus?.from !== 'assistant') || app.focus?.lat == null || !points.length) return
    const tok = app.focus.token
    if (tok && pinnedFocus.current === tok) return
    const lat = Number(app.focus.lat)
    const lng = Number(app.focus.lng)
    let best = null
    let bestD = Infinity
    for (const p of points) {
      const d = Math.hypot(p.lat - lat, (p.lng ?? p.lon) - lng)
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    const byId = app.focus.cellule_id
      ? points.find((p) => p.cellule_id === app.focus.cellule_id || p.id === app.focus.cellule_id)
      : null
    const hit = byId || (best && bestD < 0.45 ? best : null)
    if (hit) {
      pinnedFocus.current = tok
      app.setSelected(hit)
      lookAt(zonePov(hit.lat, hit.lng ?? hit.lon, app.focus.altitude || 0.065), 900)
    }
    // setSelected suffit : on ne remet pas `app` en deps (nouvelle référence à chaque rendu).
  }, [app.focus, points])

  const selected = app.selected
  const rings = selected?.lat != null ? [{ lat: selected.lat, lng: selected.lng ?? selected.lon }] : []
  const shown = useMemo(() => {
    if (!selected?.lat) return points
    const sid = selected.cellule_id
    const slat = Number(selected.lat)
    const slng = Number(selected.lng ?? selected.lon)
    const isOn = (p) => (sid != null && (p.cellule_id === sid || p.id === sid))
      || (Math.abs(p.lat - slat) < 1e-3 && Math.abs((p.lng ?? p.lon) - slng) < 1e-3)
    const marked = points.map((p) => {
      if (!isOn(p)) return p
      return {
        ...p,
        radius: Math.max(p.radius * 1.8, 0.22),
        altitude: 0.012,
        color: p.kind === 'cellule' ? '#ffb089' : p.color,
      }
    })
    if (!marked.some(isOn) && Number.isFinite(slat) && Number.isFinite(slng)) {
      marked.push({
        ...selected,
        kind: selected.kind || 'cellule',
        lat: slat,
        lng: slng,
        color: '#ffb089',
        radius: 0.26,
        altitude: 0.012,
      })
    }
    return marked
  }, [points, selected])
  const selectedIso = useMemo(() => {
    if (app.region.kind === 'macro') return new Set(app.region.iso3 || [])
    if (app.region.kind === 'country') return new Set([app.region.id])
    return new Set()
  }, [app.region])
  const polygons = useMemo(
    () => (app.countries || []).map((c) => ({
      id: c.id,
      nom: c.nom,
      geometry: c.geometry,
      active: selectedIso.has(c.id),
    })),
    [app.countries, selectedIso],
  )

  const year = Number(app.dateFin.slice(0, 4))
  const month = Number(app.dateFin.slice(5, 7))
  const { data: calRows } = useAsync(() => (isDemo ? Promise.resolve(null) : fetchCalendrier({ region: app.regionId })), [app.regionId])
  const row = isDemo ? monthRow(app.regionId, year, month) : (calRows || []).find((r) => r.annee === year && r.mois === month)
  const brut = app.mode === 'brut'
  const reading = useMemo(() => {
    if (!payload) return null
    const jours = Math.max(1, eachDay(payload.debut, payload.fin, 400).length)
    const count = payload.equivalent || payload.total || 0
    const perDay = count / jours
    const expectedDay = row?.mediane_historique ? row.mediane_historique / daysInMonth(year, month) : null
    return { count, perDay, expectedDay, label: expectedDay != null ? activityLabel(perDay, expectedDay) : 'observée', jours }
  }, [payload, row, year, month])

  const spark = useMemo(() => {
    if (brut && payload) {
      return eachDay(app.dateDebut, app.dateFin).map((iso) => ({
        iso,
        v: iso > app.today ? 0 : (payload.parJour?.[iso] || 0),
        future: iso > app.today,
      }))
    }
    const dim = daysInMonth(year, month)
    const ym = `${year}-${String(month).padStart(2, '0')}`
    const monthTotal = row?.total_detections || payload?.equivalent || 0
    const perDay = monthTotal / dim
    return eachDay(`${ym}-01`, `${ym}-${String(dim).padStart(2, '0')}`).map((iso) => ({
      iso,
      v: iso > app.today ? 0 : Math.round(perDay),
      future: iso > app.today,
    }))
  }, [brut, year, month, row, payload, app.dateDebut, app.dateFin, app.today])
  const maxBar = Math.max(1, ...spark.map((d) => d.v))

  const prev = row?.anomalie && row.z_score > 2 ? previousAnomalies(app.regionId, year, month, calRows || undefined) : []
  const anomalous = Boolean(row?.anomalie && row.z_score > 2)
  const noun = brut ? 'détections satellite' : 'points chauds (équivalent Aqua)'

  async function onExport() {
    setExporting(true)
    setNote('')
    try {
      const rows = (payload?.points || []).map((p) => (brut ? {
        id: p.id,
        lat: p.lat,
        lon: p.lng,
        satellite: p.satellite,
        frp: p.frp,
        acq_date: p.acq_date,
      } : {
        cellule_id: p.cellule_id,
        lat_centre: p.lat_centre,
        lon_centre: p.lon_centre,
        nb_detections: p.nb_detections,
        zscore: p.zscore,
        frp_total: p.frp_max,
        anomalie: p.est_anomalie,
      }))
      exportRowsCsv(`firewatch-${brut ? 'capteurs' : 'cellules'}-${app.regionId}-${app.dateDebut}_${app.dateFin}.csv`, rows)
      app.notify(`${fmt(rows.length)} ${brut ? 'détections' : 'zones'} exportées.`, 'ok')
    } finally {
      setExporting(false)
    }
  }

  function focusPoint(p) {
    app.setSelected(p)
    lookAt({ lat: p.lat, lng: p.lng, altitude: 0.18 }, 900)
  }

  async function openCellSeries(p) {
    if (p.cellule_id) app.setCellId(p.cellule_id)
    else await app.pickCell(p.lat, p.lng)
    app.setView('series')
  }

  const top = points.slice(0, 8)
  const here = selected?.lat != null ? { lat: selected.lat, lng: selected.lng ?? selected.lon } : null
  const nearby = here
    ? points.filter((p) => p !== selected && Math.abs(p.lat - here.lat) < 0.2 && Math.abs(p.lng - here.lng) < 0.2).slice(0, 40)
    : []

  return (
    <div className="stage-inner">
      <div className="globe-wrap" ref={wrap}>
        <Suspense fallback={<div className="globe-fallback">Le globe se place sur {app.region.nom}…</div>}>
          {size.w > 0 && (
            <Globe
              ref={globe}
              width={size.w}
              height={size.h}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              atmosphereColor="#9eb6e0"
              atmosphereAltitude={0.18}
              animateIn={false}
              onGlobeReady={() => applyPov(desiredPov.current || app.region.focus, 0)}
              polygonsData={polygons}
              polygonGeoJsonGeometry="geometry"
              polygonCapColor={(d) => (d.active ? 'rgba(255, 90, 54, 0.12)' : 'rgba(180, 200, 230, 0.02)')}
              polygonSideColor={() => 'rgba(0, 0, 0, 0.05)'}
              polygonStrokeColor={(d) => (d.active ? '#ffb089' : 'rgba(190, 210, 235, 0.18)')}
              polygonAltitude={0.001}
              polygonLabel={(d) => `<div class="g-tip"><b>${d.nom}</b><span>Cliquer : uniquement les points chauds de ce pays</span></div>`}
              onPolygonClick={(d) => { if (d?.id) app.changeRegion(d.id) }}
              pointsData={shown}
              pointLat="lat"
              pointLng="lng"
              pointColor="color"
              pointAltitude="altitude"
              pointRadius="radius"
              pointLabel={tip}
              onPointClick={(p) => app.setSelected(p)}
              ringsData={rings}
              ringLat="lat"
              ringLng="lng"
              ringColor={() => 'rgba(255, 176, 137, 0.95)'}
              ringMaxRadius={0.32}
              ringPropagationSpeed={1.1}
              ringRepeatPeriod={850}
            />
          )}
        </Suspense>
        {loading && !payload && <div className="globe-busy"><Spinner label="Chargement…" /></div>}
        {loading && payload && <div className="globe-busy quiet"><Spinner label="Mise à jour…" /></div>}
        <div className="view-toggle">
          <UniqueToggle />
          <p className="country-hint">{app.region.nom} · {brut ? 'capteurs' : 'équivalent Aqua'}</p>
        </div>
        {here && (
          <div className="locate-float panel">
            <div className="locate-head">
              <p className="kicker">{brut ? 'Détection satellite' : 'Zone d’environ 28 km'}</p>
              <button type="button" className="icon-btn sm" aria-label="Fermer la carte" onClick={() => app.setSelected(null)}><Icon name="x" size={14} /></button>
            </div>
            <LocateMap
              key={`${here.lat.toFixed(4)}-${here.lng.toFixed(4)}`}
              lat={here.lat}
              lng={here.lng}
              nearby={nearby}
              onOpen={() => {
                app.setFocus({
                  lat: here.lat,
                  lng: here.lng,
                  token: Date.now(),
                  from: 'locate',
                  cellule_id: selected?.cellule_id,
                })
                app.setView('carte')
              }}
            />
            <PlaceName lat={here.lat} lng={here.lng} />
          </div>
        )}
      </div>

      <div className="dock panel dock-slim">
        <AlertStream />
        <DateRail
          spark={spark}
          maxBar={maxBar}
          reading={reading}
          anomalous={anomalous}
          noun={noun}
          extra={(
            <>
              {payload?.capped && <p className="note">Le globe montre au plus une année : {fmtPeriod(payload.debut, payload.fin)}.</p>}
              {anomalous && (
                <p className="muted sm">
                  {capital(moisNom(month))} {year} sort de l’ordinaire : {versus(row.total_detections, row.mediane_historique)}.
                  {prev.length > 0 && ` Déjà arrivé en ${prev.map((p) => `${moisNom(p.mois)} ${p.annee}`).join(', ')}.`}
                </p>
              )}
            </>
          )}
        />
      </div>

      <aside className="panel side">
        <section className="side-block grow">
          {selected?.kind === 'detection' && (
            <FireDetail fire={selected} onClose={() => app.setSelected(null)} compact />
          )}
          {selected?.kind === 'cellule' && (
            <div className="fire-detail" style={{ '--c': HARM_COLOR }}>
              <div className="fd-head">
                <div>
                  <p className="kicker">Zone d’environ 28 km · équivalent Aqua</p>
                  <h3>{fmt(selected.nb_detections, 1)} <span>points chauds</span></h3>
                </div>
                <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => app.setSelected(null)}><Icon name="x" /></button>
              </div>
              <div className="kv">
                <span>Où</span><b><PlaceName lat={selected.lat} lng={selected.lng} /></b>
                <span>Z-score</span><b>{fmt(selected.zscore, 1)}{selected.est_anomalie ? ' · plus que d’habitude' : ''}</b>
                <span>Chaleur</span><b><FrpBadge frp={selected.frp_max} /></b>
              </div>
              <div className="row-actions">
                <button type="button" className="ghost sm" onClick={() => openCellSeries(selected)}><Icon name="chart" size={14} />Activité à cet endroit dans le temps</button>
              </div>
            </div>
          )}
          {!selected && (
            <>
              <p className="kicker">{brut ? 'Les plus intenses' : 'Zones les plus actives'}</p>
              {top.length === 0 && !loading && <p className="muted sm">{brut ? 'Aucune détection pour ces dates et ces capteurs.' : 'Aucune case harmonisée pour ces dates. Choisissez un mois avec de l’activité.'}</p>}
              <div className="top-list">
                {top.map((p, i) => (
                  <button type="button" key={p.id || p.cellule_id} onClick={() => focusPoint(p)}>
                    <span className="rank">{i + 1}</span>
                    {brut ? <SatTag id={p.satellite} /> : <FrpBadge frp={p.frp_max} />}
                    <span className="tl-meta">{brut ? `${fmt(p.frp, 0)} MW · ${nearPlace(p.lat, p.lng)}` : `${fmt(p.nb_detections, 1)} éq. Aqua · ${nearPlace(p.lat, p.lng)}`}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        <details className="tune">
          <summary>Affiner l’affichage</summary>
          <p className="muted sm">{brut ? 'Chaque point est une détection satellite. Passez en Harmonisé pour les cases déjà corrigées en base.' : 'Les cases viennent de la pipeline : comptes déjà ramenés à l’échelle d’Aqua.'}</p>
          <div className="inline-field">
            <span>{brut ? 'Points' : 'Zones'}</span>
            <select className="select" value={app.pointLimit} onChange={(e) => app.setPointLimit(Number(e.target.value))} aria-label="Nombre maximum de points">
              <option value={100}>100 plus intenses</option>
              <option value={1000}>1 000 plus intenses</option>
              <option value={10000}>jusqu’à 10 000</option>
            </select>
          </div>
          <div className="frp-legend">
            {brut ? (
              <>
                <span style={{ '--c': '#a78bfa' }}><i />Terra</span>
                <span style={{ '--c': '#38bdf8' }}><i />Aqua</span>
                <span style={{ '--c': '#34d399' }}><i />Suomi NPP</span>
                <span style={{ '--c': '#f472b6' }}><i />NOAA-20</span>
                <span style={{ '--c': '#a3e635' }}><i />NOAA-21</span>
              </>
            ) : (
              <span style={{ '--c': HARM_COLOR }}><i />Harmoniser · une seule couleur</span>
            )}
          </div>
          <button type="button" className="ghost sm" onClick={onExport} disabled={exporting}>
            <Icon name="download" size={14} />{exporting ? 'Export…' : (brut ? 'Télécharger les détections' : 'Télécharger les zones')}
          </button>
          {note && <p className="note">{note}</p>}
        </details>
      </aside>
    </div>
  )
}
