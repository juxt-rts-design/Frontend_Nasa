import { useState } from 'react'
import { useApp } from '../state'
import { daysBetween } from '../data/engine'
import { Icon } from '../ui/icons'
import { PeriodFields } from '../ui/controls'
import {
  fmt, fmtDayMonth, fmtWeekdayShort, periodLength,
} from '../ui/format'

export function DateRail({ spark = [], maxBar = 1, reading, anomalous, noun = 'points chauds', extra }) {
  const app = useApp()
  const [open, setOpen] = useState(false)
  const same = app.dateDebut === app.dateFin
  const days = periodLength(app.dateDebut, app.dateFin)
  const count = reading?.count
  const span = daysBetween(app.dateDebut, app.dateFin) + 1

  return (
    <div className="date-rail">
      <button type="button" className="rail-nav" aria-label="Période précédente" onClick={() => app.shift(-span)}>
        <Icon name="left" size={16} />
      </button>

      <div className="rail-body">
        <div className="rail-caps">
          <div className="rail-cap">
            <em>{fmtWeekdayShort(app.dateDebut)}</em>
            <b>{fmtDayMonth(app.dateDebut)}</b>
          </div>
          {!same && (
            <>
              <span className="rail-join" aria-hidden="true" />
              <div className="rail-cap end">
                <em>{fmtWeekdayShort(app.dateFin)}</em>
                <b>{fmtDayMonth(app.dateFin)}</b>
              </div>
            </>
          )}
          <span className="rail-year">{app.dateFin.slice(0, 4)}</span>
        </div>

        <div className="spark rail-spark" role="group" aria-label="Activité jour par jour">
          {spark.filter((d) => d.iso <= app.today).map((d) => {
            const on = d.iso >= app.dateDebut && d.iso <= app.dateFin
            return (
              <button
                type="button"
                key={d.iso}
                className={on ? 'on' : ''}
                disabled={d.future}
                title={`${fmtDayMonth(d.iso)} : ${fmt(d.v)} ${noun}`}
                onClick={() => app.goTo(d.iso, 1)}
              >
                <i style={{ height: `${Math.max(8, (d.v / maxBar) * 100)}%` }} />
              </button>
            )
          })}
        </div>

        <p className={`rail-meta${anomalous ? ' alert' : ''}`}>
          {reading
            ? <><b>{fmt(count)}</b> {noun} · {reading.label} · {days}</>
            : 'Lecture des points chauds…'}
        </p>
      </div>

      <button
        type="button"
        className="rail-nav"
        aria-label="Période suivante"
        disabled={app.dateFin >= app.today}
        onClick={() => app.shift(span)}
      >
        <Icon name="right" size={16} />
      </button>

      <div className="rail-span" role="group" aria-label="Durée">
        {[
          { n: 1, label: '1 j' },
          { n: 7, label: '7 j' },
          { n: 30, label: '30 j' },
        ].map((p) => (
          <button
            key={p.n}
            type="button"
            aria-pressed={span === p.n || (p.n === 1 && same)}
            onClick={() => app.setDuree(p.n)}
          >{p.label}</button>
        ))}
      </div>

      <button
        type="button"
        className={`rail-cal${open ? ' on' : ''}`}
        aria-expanded={open}
        aria-label="Choisir d’autres dates"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="calendar" size={15} />
      </button>

      {open && (
        <div className="rail-more">
          <PeriodFields debut={app.dateDebut} fin={app.dateFin} onChange={(a, b) => app.setPeriode(a, b)} />
          <div className="rail-more-actions">
            <button type="button" onClick={() => { app.goTo(app.today, 7); setOpen(false) }}>Cette semaine</button>
            <button type="button" onClick={() => { app.goTo('2024-08-12', 1); setOpen(false) }}>12 août 2024</button>
            <button type="button" onClick={() => { app.setPeriode('2007-08-01', '2007-08-31'); setOpen(false) }}>Août 2007</button>
          </div>
          {extra}
        </div>
      )}
    </div>
  )
}

