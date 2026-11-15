import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state'
import { exportCalendarCsv, fetchCalendrier } from '../api/client'
import {
  FIRST_YEAR, LAST_YEAR, MOIS_C, TODAY, fireSeason, getAnomalies, monthBounds,
  previousAnomalies, recordYear,
} from '../data/engine'
import { useAsync } from '../ui/hooks'
import { Icon } from '../ui/icons'
import { Spinner, UniqueToggle } from '../ui/controls'
import {
  capital, compact, fmt, heatColor, moisNom, pointsChauds, versus, versusShort,
} from '../ui/format'
import { Explorer } from './Explorer'

function monthIndex(y, m) {
  return y * 12 + (m - 1)
}

export function CalendarView() {
  const app = useApp()
  const scroller = useRef(null)
  const [tab, setTab] = useState('zones')
  const [anchor, setAnchor] = useState(null)
  const [fromYear, setFromYear] = useState(FIRST_YEAR)
  const [toYear, setToYear] = useState(LAST_YEAR)
  const { data: rows, loading } = useAsync(() => fetchCalendrier({
    region: app.regionId,
  }), [app.regionId])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [app.regionId, rows == null])

  const list = rows || []
  const years = useMemo(() => {
    const out = []
    for (let y = fromYear; y <= toYear; y += 1) out.push(y)
    return out
  }, [fromYear, toYear])
  const byKey = useMemo(() => new Map(list.map((r) => [`${r.annee}-${r.mois}`, r])), [list])
  const scaleMax = useMemo(() => {
    const vals = list.filter((r) => r.total_detections != null).map((r) => r.total_detections).sort((a, b) => a - b)
    return vals.length ? vals[Math.floor(vals.length * 0.97)] * 1.05 : 1
  }, [list])

  const season = fireSeason(app.regionId)
  const record = recordYear(app.regionId, list.length ? list : undefined)
  const anomalies = getAnomalies(app.regionId, 2, list).filter((r) => r.z_score > 0)
  const fy = Number(app.dateFin.slice(0, 4))
  const fm = Number(app.dateFin.slice(5, 7))
  const focusRow = byKey.get(`${fy}-${fm}`)
  const prev = focusRow ? previousAnomalies(app.regionId, fy, fm, list) : []
  const pStart = monthIndex(Number(app.dateDebut.slice(0, 4)), Number(app.dateDebut.slice(5, 7)))
  const pEnd = monthIndex(fy, fm)

  function pickMonth(y, m, extend) {
    const target = monthBounds(y, m)
    if (target.debut > TODAY) return
    if (extend && anchor) {
      const a = monthIndex(anchor.y, anchor.m) <= monthIndex(y, m) ? anchor : { y, m }
      const b = a === anchor ? { y, m } : anchor
      const fin = monthBounds(b.y, b.m).fin
      app.setPeriode(monthBounds(a.y, a.m).debut, fin < TODAY ? fin : TODAY)
    } else {
      setAnchor({ y, m })
      app.setPeriode(target.debut, target.fin < TODAY ? target.fin : TODAY)
    }
    setTab('zones')
  }

  function pickYear(y) {
    setAnchor({ y, m: 1 })
    const fin = `${y}-12-31`
    app.setPeriode(`${y}-01-01`, fin < TODAY ? fin : TODAY)
    setTab('zones')
  }

  return (
    <div className="view-pad">
      <div className="heat-layout">
        <section className="panel sheet">
          <div className="sheet-head">
            <div>
              <h2 className="panel-title">Calendrier d’activité · {app.region.nom}{app.activeZone ? ` · ${app.activeZone.nom}` : ''}</h2>
              <ol className="how">
                <li><b>1</b>Une ligne = une année, une case = un mois. Le chiffre = le nombre de points chauds.</li>
                <li><b>2</b>Plus la case est claire, plus l’activité de brûlage a été forte.</li>
                <li><b>3</b>Cliquez une case : {app.mode === 'brut' ? 'ses jours et capteurs' : 'ses zones ~28 km'} s’affichent à droite.</li>
              </ol>
            </div>
            <div className="row-actions">
              <UniqueToggle />
              <button type="button" className="ghost sm" onClick={() => exportCalendarCsv(app.regionId, list)}><Icon name="download" size={14} />CSV</button>
            </div>
          </div>

          <details className="tune">
            <summary>Choisir les années affichées</summary>
          <div className="cal-tools">
            <div className="inline-field">
              <span>Années</span>
              <select className="select" value={fromYear} onChange={(e) => setFromYear(Math.min(Number(e.target.value), toYear))} aria-label="Première année">
                {Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="faint">à</span>
              <select className="select" value={toYear} onChange={(e) => setToYear(Math.max(Number(e.target.value), fromYear))} aria-label="Dernière année">
                {Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {loading && <Spinner label="Recalcul…" />}
          </div>
          <p className="muted sm">Chiffres déjà harmonisés (équivalent Aqua) : le capteur d’origine n’entre plus en compte.</p>
          </details>

          {focusRow?.anomalie && focusRow.z_score > 2 && (
            <p className="banner alert">
              <Icon name="flame" size={16} />
              <span>
                <b>{capital(moisNom(fm))} {fy} sort de l’ordinaire</b> : {versus(focusRow.total_detections, focusRow.mediane_historique)}.
                {prev.length > 0 && ` C’était déjà arrivé en ${prev.map((p) => `${moisNom(p.mois)} ${p.annee}`).join(', ')}.`}
              </span>
            </p>
          )}

          <div className="heat-scroll" ref={scroller}>
            <div className="heat" role="grid" aria-label="Détections par année et par mois">
              <span className="corner" />
              {MOIS_C.map((m) => <span className="hd" key={m}>{m}</span>)}
              {years.map((year) => (
                <YearRow
                  key={year}
                  year={year}
                  byKey={byKey}
                  scaleMax={scaleMax}
                  inPeriod={(m) => monthIndex(year, m) >= pStart && monthIndex(year, m) <= pEnd}
                  onPick={pickMonth}
                  onYear={pickYear}
                />
              ))}
            </div>
          </div>
          <div className="legend">
            <span>Peu de points chauds</span>
            <b style={{ background: 'linear-gradient(90deg, #1c1410, #6b3a28, #c56a32, #ff5a32, #ffd6ba)' }} />
            <span>Beaucoup de points chauds</span>
            <span className="lg-item"><i className="dia up" />beaucoup plus que d’habitude</span>
            <span className="lg-item"><i className="dia down" />beaucoup moins</span>
            <span className="lg-item"><i className="hatch" />pas encore mesuré</span>
            <span className="lg-item"><i className="outline" />vos dates</span>
          </div>
        </section>

        <aside className="panel sheet side-col">
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'zones'} onClick={() => setTab('zones')}><Icon name="list" size={15} />{app.mode === 'brut' ? 'Les jours' : 'Les zones'}</button>
            <button type="button" role="tab" aria-selected={tab === 'resume'} onClick={() => setTab('resume')}><Icon name="info" size={15} />En bref</button>
          </div>
          {tab === 'zones' ? <Explorer /> : (
            <div className="resum">
              <p className="kicker">Le mois choisi</p>
              <h3>{capital(moisNom(fm))} {fy}</h3>
              <p className="muted">
                {focusRow?.total_detections == null
                  ? 'Pas de mesure ce mois-là.'
                  : focusRow.etat === 'en_cours'
                    ? `${pointsChauds(focusRow.total_detections)} pour l’instant : le mois n’est pas terminé (environ ${fmt(focusRow.mediane_historique)} sur un mois entier, d’ordinaire).`
                    : `${pointsChauds(focusRow.total_detections)} : ${versus(focusRow.total_detections, focusRow.mediane_historique)}.`}
              </p>

              <p className="kicker" style={{ marginTop: 18 }}>Quand brûle-t-on ici ?</p>
              <div className="statline"><span>La saison commence en</span><b>{moisNom(season.debut)}</b></div>
              <div className="statline"><span>Le plus de points chauds en</span><b>{moisNom(season.pic)}</b></div>
              <div className="statline"><span>Elle se termine en</span><b>{moisNom(season.fin)}</b></div>
              <div className="statline"><span>Mois le plus actif</span><b>{record.annee ? `${moisNom(record.mois)} ${record.annee} · ${pointsChauds(record.pic)}` : '—'}</b></div>
              <p className="kicker" style={{ marginTop: 18 }}>Mois qui sortent de l’ordinaire · {anomalies.length}</p>
              <div className="anom-list">
                {anomalies.slice(0, 8).map((r) => (
                  <button type="button" key={`${r.annee}-${r.mois}`} onClick={() => pickMonth(r.annee, r.mois)} title={`z-score ${fmt(r.z_score, 1)}`}>
                    <span>{capital(moisNom(r.mois))} {r.annee}</span>
                    <b>{versusShort(r.total_detections, r.mediane_historique)}</b>
                  </button>
                ))}
                {!anomalies.length && <p className="muted sm">Aucun mois inhabituel avec ces réglages.</p>}
              </div>
              <div className="row-actions">
                <button type="button" className="ghost sm" onClick={() => app.setView('globe')}><Icon name="globe" size={14} />Voir ces points sur le globe</button>
                <button type="button" className="ghost sm" onClick={() => app.setView('series')}><Icon name="chart" size={14} />Voir l’évolution</button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function YearRow({ year, byKey, scaleMax, inPeriod, onPick, onYear }) {
  return (
    <>
      <button type="button" className="yr" onClick={() => onYear(year)} title={`Toute l’année ${year}`}>{year}</button>
      {Array.from({ length: 12 }, (_, i) => {
        const mois = i + 1
        const cell = byKey.get(`${year}-${mois}`)
        const value = cell?.total_detections
        const empty = value == null
        const paint = heatColor(value || 0, scaleMax)
        const anomaly = cell?.anomalie ? (cell.z_score < 0 ? 'down' : 'up') : 'no'
        const label = empty
          ? `${capital(moisNom(mois))} ${year} : ${cell?.etat === 'futur' ? 'à venir' : 'pas encore mesuré'}`
          : `${capital(moisNom(mois))} ${year} : ${pointsChauds(value)}${cell?.mediane_historique ? `, ${versus(value, cell.mediane_historique)}` : ''}${cell?.etat === 'en_cours' ? ' (mois en cours)' : ''}. Cliquez pour voir les zones.`
        return (
          <button
            type="button"
            key={mois}
            className={`${inPeriod(mois) ? 'in ' : ''}${empty ? (cell?.etat === 'futur' ? 'future' : 'before') : ''}`}
            style={empty ? undefined : { background: paint.color, color: paint.ink }}
            data-anomaly={anomaly}
            disabled={cell?.etat === 'futur'}
            title={label}
            aria-label={label}
            onClick={(e) => onPick(year, mois, e.shiftKey)}
          >
            {empty ? '' : compact(value)}
          </button>
        )
      })}
    </>
  )
}
