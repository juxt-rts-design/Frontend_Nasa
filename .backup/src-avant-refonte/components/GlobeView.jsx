import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state'
import { fetchGlobe, exportDetectionsCsv } from '../api/client'
import {
  SATELLITES, activityLabel, dailyCount, eachDay, fireSeason, frpNiveau,
  monthRow, previousAnomalies, usualDaily, zoneFraction, daysInMonth, getRatio,
} from '../data/engine'
import { compact, confianceLabel, fmt, fmtDate, fmtTime, moisNom, typeLabel, versus } from '../ui/format'

const Globe = lazy(() => import('react-globe.gl'))

function decorate(payload) {
  if (!payload) return []
  if (payload.mode === 'harmonise') {
    return payload.points.map((p) => ({
      ...p,
      kind: 'cellule',
      lat: p.lat_centre,
      lng: p.lon_centre,
      color: '#ff5a36',
      radius: Math.min(0.42, 0.06 + Math.sqrt(p.total_detections || 1) * 0.04),
      altitude: 0.01,
    }))
  }
  return payload.points.map((p) => {
    const sat = SATELLITES.find((s) => s.id === p.satellite)
    return {
      ...p,
      kind: 'detection',
      lat: p.latitude,
      lng: p.longitude,
      color: sat?.color || '#ffb089',
      radius: Math.min(0.28, 0.04 + Math.sqrt(p.frp || 1) * 0.012),
      altitude: 0.006 + Math.min(0.04, (p.frp || 0) / 8000),
    }
  })
}

export function GlobeView() {
  const app = useApp()
  const wrap = useRef(null)
  const globe = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [payload, setPayload] = useState(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    const el = wrap.current
    if (!el) return undefined
    const apply = () => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 600 })
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function frameGlobe(ms) {
    const g = globe.current
    if (!g?.pointOfView) return false
    g.pointOfView(app.region.focus, ms)
    try { g.controls().autoRotate = false } catch { /* contrôles pas encore prêts */ }
    return true
  }

  useEffect(() => {
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
  }, [app.regionId, app.region.focus, app.view])

  const ring = app.activeZone?.geojson?.coordinates?.[0]
  const satKey = app.satellites.join('|')

  useEffect(() => {
    let cancel = false
    fetchGlobe({
      dateDebut: app.dateDebut,
      dateFin: app.dateFin,
      mode: app.mode,
      satellites: app.satellites,
      region: app.regionId,
      satelliteRef: app.satelliteRef,
      zoneRing: ring,
    }).then((res) => { if (!cancel) setPayload(res) })
    return () => { cancel = true }
  }, [app.dateDebut, app.dateFin, app.mode, satKey, app.regionId, app.satelliteRef, app.activeZoneId, ring, app.satellites])

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
  const selected = app.selected
  const rings = selected?.lat != null ? [{ lat: selected.lat, lng: selected.lng }] : []

  const year = Number(app.dateFin.slice(0, 4))
  const month = Number(app.dateFin.slice(5, 7))
  const row = monthRow(app.regionId, year, month)
  const frac = ring ? zoneFraction(app.regionId, ring) : 1
  const usual = usualDaily(app.regionId, app.dateFin)
  const live = SATELLITES.filter((s) => app.dateFin >= s.start)
  const counted = app.mode === 'brut' ? live.filter((s) => app.satellites.includes(s.id)) : live
  const factor = app.mode === 'harmonise'
    ? 1
    : counted.reduce((sum, s) => sum + (s.id === 'Aqua' ? 1 : getRatio(app.regionId, month, s.id)), 0) || 1
  const expectedDay = usual.usual * factor * frac
  const perDay = payload ? payload.total / app.windowDays : 0
  const label = activityLabel(perDay, expectedDay)
  const days = eachDay(`${year}-${String(month).padStart(2, '0')}-01`, `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`)
  const maxBar = Math.max(1, ...days.map((d) => dailyCount(app.regionId, d, app.mode, app.satellites, app.satelliteRef)))
  const prev = row?.anomalie && row.z_score > 2 ? previousAnomalies(app.regionId, year, month) : []
  const anomalous = Boolean(row?.anomalie && row.z_score > 2)

  async function onExport() {
    if (app.mode === 'harmonise') {
      const { downloadText } = await import('../api/client')
      const { toCsv } = await import('../data/engine')
      downloadText(
        `firewatch-cellules-${app.regionId}.csv`,
        toCsv((payload?.points || []).map((p) => ({
          cellule_id: p.cellule_id,
          lat_centre: p.lat_centre,
          lon_centre: p.lon_centre,
          total_detections: p.total_detections,
          frp_moyen: p.frp_moyen,
          frp_max: p.frp_max,
        }))),
      )
      return
    }
    const res = await exportDetectionsCsv({
      dateDebut: app.dateDebut,
      dateFin: app.dateFin,
      region: app.regionId,
      satellites: app.mode === 'brut' ? app.satellites : undefined,
      zoneRing: ring,
    })
    if (res?.truncated) setNote('Export limité aux 20 000 détections au FRP le plus élevé.')
  }

  function openMap() {
    if (!selected) return
    app.setFocus({ lat: selected.lat, lng: selected.lng, token: Date.now() })
    app.setView('carte')
  }

  function openSeries() {
    const id = selected?.cellule_id
    if (!id) return
    app.setCellId(id)
    app.setView('series')
  }

  const noun = app.mode === 'harmonise' ? 'cellules' : 'détections'
  const ratio = getRatio(app.regionId, month, 'Suomi NPP')

  return (
    <div className="stage-inner" style={{ height: '100%' }}>
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
              onGlobeReady={() => frameGlobe(0)}
              pointsData={points}
              pointLat="lat"
              pointLng="lng"
              pointColor="color"
              pointAltitude="altitude"
              pointRadius="radius"
              pointLabel={(d) => (d.kind === 'cellule'
                ? `${d.cellule_id} · ${d.total_detections} équiv. Aqua`
                : `${d.satellite} · ${d.frp} MW`)}
              onPointClick={(p) => app.setSelected(p)}
              ringsData={rings}
              ringLat="lat"
              ringLng="lng"
              ringColor={() => '#f4efe6'}
              ringMaxRadius={1.6}
              ringPropagationSpeed={1.2}
              ringRepeatPeriod={900}
            />
          )}
        </Suspense>
      </div>

      <div className="dock panel">
        {anomalous ? (
          <p className="banner alert">
            Anomalie détectée — {moisNom(month)} {year} est à {fmt(row.z_score, 1)} écarts-types au-dessus de la médiane
            {' '}({versus(row.total_detections, row.mediane_historique)}).
            {prev.length > 0 && ` Précédents : ${prev.map((p) => `${moisNom(p.mois)} ${p.annee}`).join(', ')}.`}
          </p>
        ) : (
          <p className="banner">
            {payload ? `${fmt(payload.total)} ${noun}` : '…'} sur {app.windowDays === 1 ? 'cette journée' : `${app.windowDays} jours`}
            {' '}— activité {label}. Habituellement {fmt(Math.round(expectedDay * 0.65))} à {fmt(Math.round(expectedDay * 1.35))} par jour à cette période.
          </p>
        )}
        <div className="date-read">
          <button className="arrow" aria-label="Jour précédent" onClick={() => app.shift(-1)}>‹</button>
          <div>
            <strong>{fmtDate(app.dateFin)}</strong>
            <div className="muted">{app.windowDays === 1 ? 'Une journée' : `Du ${fmtDate(app.dateDebut)}`}</div>
          </div>
          <button className="arrow" aria-label="Jour suivant" onClick={() => app.shift(1)}>›</button>
        </div>
        <div className="spark" aria-hidden="true">
          {days.map((d) => {
            const v = dailyCount(app.regionId, d, app.mode, app.satellites, app.satelliteRef)
            const on = d >= app.dateDebut && d <= app.dateFin
            return <i key={d} className={on ? 'on' : ''} style={{ height: `${Math.max(8, (v / maxBar) * 100)}%` }} />
          })}
        </div>
        <div className="presets">
          <button aria-pressed={app.windowDays === 1} onClick={() => app.setWindowDays(1)}>Un jour</button>
          <button aria-pressed={app.windowDays === 7} onClick={() => app.setWindowDays(7)}>7 jours</button>
          <button onClick={() => app.goTo(app.today, 7)}>Aujourd’hui</button>
          <button onClick={() => app.goTo('2024-08-12', 1)}>12 août 2024</button>
          <button onClick={() => app.goTo('2007-08-15', 1)}>Pic 2007</button>
          <button onClick={() => app.goTo('2005-08-15', 1)}>Août 2005 · 2 satellites</button>
        </div>
      </div>

      <aside className="panel side">
        <p className="kicker">Lecture</p>
        <div className="seg" role="group" aria-label="Mode de vue">
          {[
            ['brut', 'Brut'],
            ['harmonise', 'Harmonisé'],
            ['combine', 'Combiné'],
          ].map(([id, labelMode]) => (
            <button key={id} aria-pressed={app.mode === id} onClick={() => { app.setMode(id); app.setSelected(null) }}>{labelMode}</button>
          ))}
        </div>

        {app.mode === 'brut' && (
          <div className="chips">
            {SATELLITES.map((s) => (
              <button key={s.id} aria-pressed={app.satellites.includes(s.id)} onClick={() => app.toggleSat(s.id)}>
                <i className="dot" style={{ background: s.color }} />{s.id}
              </button>
            ))}
          </div>
        )}
        {app.mode === 'harmonise' && (
          <p className="muted">Référence {app.satelliteRef}. En {moisNom(month)}, S-NPP détecte {fmt(ratio, 2)} fois plus de feux qu’Aqua dans cette région. Les comptes sont ramenés à l’échelle Aqua.</p>
        )}
        {app.mode === 'combine' && (
          <p className="warn">Tous les capteurs, sans correction. {live.length} satellite{live.length > 1 ? 's' : ''} actif{live.length > 1 ? 's' : ''} à cette date. Cette vue n’est pas adaptée aux comparaisons interannuelles.</p>
        )}

        <p className="muted">{live.map((s) => s.id).join(' · ')}</p>

        {selected?.kind === 'detection' && (
          <>
            <h2 className="panel-title">Détection</h2>
            <div className="kv">
              <span>Date</span><b>{fmtDate(selected.acq_date)}</b>
              <span>Position</span><b>{fmt(selected.lat, 2)}°, {fmt(selected.lng, 2)}°</b>
              <span>Satellite</span><b>{selected.satellite}</b>
              <span>Heure UTC</span><b>{fmtTime(selected.acq_time)}</b>
              <span>FRP</span><b>{fmt(selected.frp, 1)} MW · {frpNiveau(selected.frp).niveau}</b>
              <span>Confiance</span><b>{confianceLabel(selected.confidence)}</b>
              <span>Jour / nuit</span><b>{selected.daynight === 'N' ? 'Nuit' : 'Jour'}</b>
              <span>Type</span><b>{typeLabel(selected.type)}</b>
              <span>Cellule</span><b>{selected.cellule_id}</b>
            </div>
          </>
        )}
        {selected?.kind === 'cellule' && (
          <>
            <h2 className="panel-title">Cellule</h2>
            <div className="kv">
              <span>Identifiant</span><b>{selected.cellule_id}</b>
              <span>Équiv. Aqua</span><b>{fmt(selected.total_detections, 1)}</b>
              <span>FRP moyen</span><b>{fmt(selected.frp_moyen, 1)} MW</b>
              <span>FRP max</span><b>{fmt(selected.frp_max, 1)} MW</b>
              <span>Sources</span><b>{(selected.satellites || []).join(', ')}</b>
            </div>
          </>
        )}
        {!selected && (
          <>
            <h2 className="panel-title">{app.region.nom}</h2>
            <p className="muted">Chaque point est une chaleur anormale vue par un satellite. La taille suit le FRP. Cliquez pour la fiche. Saison des feux : {moisNom(fireSeason(app.regionId).debut)} → {moisNom(fireSeason(app.regionId).fin)}, pic en {moisNom(fireSeason(app.regionId).pic)}.</p>
            {app.mode !== 'harmonise' && (
              <div className="chips" aria-label="Légende des capteurs">
                {SATELLITES.map((s) => (
                  <span key={s.id} className="niveau"><i className="dot" style={{ background: s.color }} />{s.instrument === 'MODIS' ? 'MODIS' : 'VIIRS'} · {s.id}</span>
                ))}
              </div>
            )}
          </>
        )}
        {note && <p className="muted">{note}</p>}
        <div className="row-actions">
          <button className="ghost" disabled={!selected} onClick={openMap}>Voir sur la carte</button>
          <button className="ghost" disabled={!selected?.cellule_id} onClick={openSeries}>Voir la série</button>
          <button className="solid" onClick={onExport}>Exporter en CSV</button>
        </div>
      </aside>
    </div>
  )
}
