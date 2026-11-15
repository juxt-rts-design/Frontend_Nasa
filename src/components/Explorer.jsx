import { useMemo, useState } from 'react'
import { useApp } from '../state'
import { exportRowsCsv, fetchDayFires, fetchPeriodDays } from '../api/client'
import { useAsync } from '../ui/hooks'
import { Icon } from '../ui/icons'
import { Empty, Spinner } from '../ui/controls'
import { fmt, fmtDayMonth, fmtPeriodSpoken, pointsChauds, zColor } from '../ui/format'
import { nearPlace } from '../data/gazetteer'
import { FireRow } from './FireDetail'
import { satColor } from '../data/engine'

export function Explorer() {
  const app = useApp()
  if (app.mode === 'brut') return <DayExplorer />
  return <ZoneExplorer />
}

function ZoneExplorer() {
  const app = useApp()
  const [open, setOpen] = useState(null)

  const { data, loading } = useAsync(() => fetchPeriodDays({
    region: app.regionId,
    debut: app.dateDebut,
    fin: app.dateFin,
    mode: app.mode,
  }), [app.regionId, app.dateDebut, app.dateFin, app.mode])

  const cells = useMemo(() => {
    const list = [...(data?.cells || [])]
    list.sort((a, b) => (b.nb_detections || 0) - (a.nb_detections || 0))
    return list
  }, [data])

  const maxNb = Math.max(1, ...cells.map((c) => c.nb_detections || 0))

  function exportAll() {
    exportRowsCsv(`firewatch-zones-${app.regionId}-${app.dateDebut}_${app.dateFin}.csv`, cells.map((c) => ({
      cellule_id: c.cellule_id,
      lat: c.lat,
      lon: c.lon,
      nb_detections: c.nb_detections,
      zscore: c.zscore,
      frp_total: c.frp_max,
    })))
    app.notify(`${fmt(cells.length)} zones exportées.`, 'ok')
  }

  function openCell(c) {
    app.setSelected({ ...c, kind: 'cellule' })
    app.setCellId(c.cellule_id)
    app.setView('globe')
  }

  return (
    <div className="explorer">
      <div className="ex-head">
        <div>
          <p className="kicker">Zones d’activité</p>
          <h3>{fmtPeriodSpoken(app.dateDebut, app.dateFin)}</h3>
          <p className="muted sm">
            {data
              ? <>{pointsChauds(Math.round(data.total || 0))} (équivalent Aqua) · {fmt(cells.length)} cases ~28 km.</>
              : 'Chargement…'}
          </p>
        </div>
        <button type="button" className="icon-btn" title="Exporter les zones" onClick={exportAll}><Icon name="download" /></button>
      </div>

      <div className="ex-days">
        {loading && !data && <Spinner label="Chargement des zones…" />}
        {loading && data && <div className="ex-busy"><Spinner label="Mise à jour…" /></div>}
        {data && cells.length === 0 && (
          <Empty icon="flame" title="Aucune zone harmonisée">
            Choisissez un mois avec de l’activité, ou un autre pays.
          </Empty>
        )}
        {cells.map((c) => (
          <div key={c.cellule_id} className={`ex-day${open === c.cellule_id ? ' open' : ''}`}>
            <button
              type="button"
              className="ex-day-head"
              aria-expanded={open === c.cellule_id}
              onClick={() => setOpen(open === c.cellule_id ? null : c.cellule_id)}
            >
              <span className="ex-date">{nearPlace(c.lat, c.lng) || `${fmt(c.lat, 2)}°, ${fmt(c.lng, 2)}°`}<small>z {fmt(c.zscore, 1)}</small></span>
              <span className="ex-bar" aria-hidden="true">
                <i style={{ width: `${((c.nb_detections || 0) / maxNb) * 100}%`, background: zColor(c.zscore) }} />
              </span>
              <span className="ex-meta">
                <b className="ex-n">{fmt(c.nb_detections, 0)}</b>
              </span>
              <Icon name={open === c.cellule_id ? 'up' : 'down'} size={15} className="faint" />
            </button>
            {open === c.cellule_id && (
              <div className="day-fires">
                <p className="muted sm">Équivalent Aqua : {fmt(c.nb_detections, 1)} points chauds dans une case d’environ 28 km.{c.est_anomalie ? ' Plus que d’habitude.' : ''}</p>
                <div className="row-actions">
                  <button type="button" className="ghost sm" onClick={() => openCell(c)}><Icon name="globe" size={14} />Globe</button>
                  <button type="button" className="ghost sm" onClick={() => { app.setCellId(c.cellule_id); app.setView('series') }}><Icon name="chart" size={14} />Courbe</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DayExplorer() {
  const app = useApp()
  const [open, setOpen] = useState(null)
  const satKey = app.effectiveSats.join('|')
  const { data, loading } = useAsync(() => fetchPeriodDays({
    region: app.regionId,
    debut: app.dateDebut,
    fin: app.dateFin,
    mode: 'brut',
    satellites: app.effectiveSats,
    spec: app.spec,
  }), [app.regionId, app.dateDebut, app.dateFin, satKey, app.spec])

  const days = data?.days || []
  const maxNb = Math.max(1, ...days.map((d) => d.total || 0))

  return (
    <div className="explorer">
      <div className="ex-head">
        <div>
          <p className="kicker">Jours · capteurs</p>
          <h3>{fmtPeriodSpoken(app.dateDebut, app.dateFin)}</h3>
          <p className="muted sm">
            {data
              ? <>{pointsChauds(data.total || 0)} vus par les satellites choisis.</>
              : 'Chargement…'}
          </p>
        </div>
      </div>
      <div className="ex-days">
        {loading && !data && <Spinner label="Comptage des jours…" />}
        {loading && data && <div className="ex-busy"><Spinner label="Mise à jour…" /></div>}
        {data && days.length === 0 && (
          <Empty icon="flame" title="Aucune détection">
            Changez les dates, les capteurs, ou passez en Harmonisé.
          </Empty>
        )}
        {days.map((d) => (
          <div key={d.date} className={`ex-day${open === d.date ? ' open' : ''}`}>
            <button
              type="button"
              className="ex-day-head"
              aria-expanded={open === d.date}
              onClick={() => setOpen(open === d.date ? null : d.date)}
            >
              <span className="ex-date">{fmtDayMonth(d.date)}</span>
              <span className="ex-bar" aria-hidden="true">
                <i style={{ width: `${((d.total || 0) / maxNb) * 100}%` }} />
              </span>
              <span className="ex-sats" aria-hidden="true">
                {Object.entries(d.parSat || {}).map(([id, n]) => (
                  n > 0 ? <i key={id} title={`${id} · ${n}`} style={{ background: satColor(id), flex: n }} /> : null
                ))}
              </span>
              <span className="ex-meta">
                <b className="ex-n">{fmt(d.total)}</b>
              </span>
              <Icon name={open === d.date ? 'up' : 'down'} size={15} className="faint" />
            </button>
            {open === d.date && <DayFires date={d.date} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function DayFires({ date }) {
  const app = useApp()
  const satKey = app.effectiveSats.join('|')
  const { data, loading } = useAsync(() => fetchDayFires({
    region: app.regionId,
    date,
    satellites: app.effectiveSats,
    spec: app.spec,
  }), [app.regionId, date, satKey, app.spec])
  const fires = data || []

  return (
    <div className="day-fires">
      {loading && <Spinner label="Chargement des détections…" />}
      {!loading && fires.length === 0 && <p className="muted sm">Pas de détection ce jour-là avec ces capteurs.</p>}
      {fires.slice(0, 40).map((fire) => (
        <FireRow
          key={fire.id}
          fire={fire}
          active={app.selected?.id === fire.id}
          onOpen={(f) => app.setSelected({ ...f, kind: 'detection', lat: f.latitude, lng: f.longitude })}
        />
      ))}
      {fires.length > 40 && <p className="muted sm">40 premières détections, les plus intenses d’abord.</p>}
    </div>
  )
}
