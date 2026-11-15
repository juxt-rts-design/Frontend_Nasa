import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state'
import { exportCalendarCsv, fetchCalendrier } from '../api/client'
import { MOIS_C, decadeTrend, fireSeason, previousAnomalies, recordYear, zoneFraction } from '../data/engine'
import { compact, fmt, heatColor, moisNom, trendPhrase, versus } from '../ui/format'

export function CalendarView() {
  const app = useApp()
  const scroller = useRef(null)
  const [rows, setRows] = useState([])
  const ring = app.activeZone?.geojson?.coordinates?.[0]

  useEffect(() => {
    let cancel = false
    fetchCalendrier({ region: app.regionId, anneeDebut: 2002, anneeFin: 2026, zoneRing: ring })
      .then((data) => { if (!cancel) setRows(data) })
    return () => { cancel = true }
  }, [app.regionId, app.activeZoneId, ring])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [rows, app.regionId])

  const season = fireSeason(app.regionId)
  const record = recordYear(app.regionId)
  const trend = decadeTrend(app.regionId)
  const frac = ring ? zoneFraction(app.regionId, ring) : 1
  const scaleMax = (season.medians[season.pic - 1] || 1) * 1.35 * (frac || 1)
  const years = useMemo(() => [...new Set(rows.map((r) => r.annee))], [rows])
  const selected = rows.find((r) => r.annee === app.selectedMonth.annee && r.mois === app.selectedMonth.mois)
  const anomalies = rows.filter((r) => r.anomalie && r.z_score > 2)
  const prev = selected ? previousAnomalies(app.regionId, selected.annee, selected.mois) : []

  return (
    <div className="view-pad">
      <div className="heat-layout">
        <section className="panel sheet">
          <p className="kicker">Série Aqua · 2002–2026</p>
          <h2 className="panel-title">Calendrier des feux</h2>
          <p className="muted">
            {app.region.nom}
            {app.activeZone ? ` · zone « ${app.activeZone.nom} » (${fmt(Math.round(frac * 100))} % de l’activité régionale)` : ''}.
            La clarté augmente avec le nombre de détections. Le losange signale une anomalie, |z| &gt; 2.
          </p>
          {selected?.anomalie && selected.z_score > 2 && (
            <p className="warn">
              Anomalie détectée — {moisNom(selected.mois)} {selected.annee} montre un z-score de {fmt(selected.z_score, 1)},
              {' '}{versus(selected.total_detections, selected.mediane_historique)}.
              {prev.length > 0 && ` Derniers précédents : ${prev.map((p) => `${moisNom(p.mois)} ${p.annee}`).join(', ')}.`}
            </p>
          )}
          <div className="heat-scroll" ref={scroller}>
            <div className="heat" role="grid" aria-label="Détections par année et par mois">
              <span />
              {MOIS_C.map((m) => <span className="hd" key={m}>{m}</span>)}
              {years.map((year) => (
                <YearRow key={year} year={year} rows={rows} scaleMax={scaleMax} selected={app.selectedMonth} onPick={app.setSelectedMonth} />
              ))}
            </div>
          </div>
          <div className="legend">
            <span>Peu</span>
            <b style={{ background: 'linear-gradient(90deg, #1c1410, #c56a32, #ffd6ba)' }} />
            <span>Beaucoup</span>
            <span style={{ marginLeft: 8 }}>◆ anomalie</span>
          </div>
          <p className="banner" style={{ position: 'static', marginTop: 14 }}>
            {trendPhrase(trend)}{' '}
            Saison de {moisNom(season.debut)} à {moisNom(season.fin)}, pic en {moisNom(season.pic)}.
          </p>
        </section>
        <aside className="panel sheet resum">
          <p className="kicker">Résumé</p>
          {selected ? (
            <>
              <h3>{moisNom(selected.mois)} {selected.annee}</h3>
              <p className="muted">{versus(selected.total_detections, selected.mediane_historique)}</p>
              <div className="statline"><span>Détections Aqua</span><b>{fmt(selected.total_detections)}</b></div>
              <div className="statline"><span>Médiane</span><b>{fmt(selected.mediane_historique)}</b></div>
              <div className="statline"><span>z-score</span><b>{selected.z_score == null ? '—' : fmt(selected.z_score, 2)}</b></div>
              <div className="statline"><span>Anomalie</span><b>{selected.anomalie ? 'Oui' : 'Non'}</b></div>
            </>
          ) : <p className="muted">Choisissez un mois.</p>}
          <div className="statline"><span>Début de saison</span><b>{moisNom(season.debut)}</b></div>
          <div className="statline"><span>Pic</span><b>{moisNom(season.pic)}</b></div>
          <div className="statline"><span>Fin de saison</span><b>{moisNom(season.fin)}</b></div>
          <div className="statline"><span>Année record</span><b>{record.annee} · {fmt(record.pic)} en {moisNom(record.mois)}</b></div>
          <div className="statline"><span>Anomalies |z| &gt; 2</span><b>{anomalies.length}</b></div>
          <div className="row-actions">
            <button className="solid" onClick={() => exportCalendarCsv(app.regionId, rows)}>Télécharger CSV</button>
            {selected && (
              <button className="ghost" onClick={() => app.goTo(`${selected.annee}-${String(selected.mois).padStart(2, '0')}-15`, 1) || app.setView('globe')}>
                Voir sur le globe
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function YearRow({ year, rows, scaleMax, selected, onPick }) {
  return (
    <>
      <span className="yr">{year}</span>
      {Array.from({ length: 12 }, (_, i) => {
        const mois = i + 1
        const cell = rows.find((r) => r.annee === year && r.mois === mois)
        const value = cell?.total_detections || 0
        const paint = heatColor(value, scaleMax)
        const pressed = selected.annee === year && selected.mois === mois
        const anomaly = cell?.anomalie ? (cell.z_score < 0 ? 'down' : 'up') : 'no'
        return (
          <button
            key={mois}
            style={{ background: paint.color, color: paint.ink }}
            aria-pressed={pressed}
            data-anomaly={anomaly}
            aria-label={`${moisNom(mois)} ${year}, ${value} détections${cell?.anomalie ? ', anomalie' : ''}`}
            onClick={() => onPick({ annee: year, mois })}
          >
            {compact(value)}
          </button>
        )
      })}
    </>
  )
}
