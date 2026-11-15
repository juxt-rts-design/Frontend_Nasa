import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../state'
import {
  ALL_SATS, DEMO_RANGE, FRP_LEVELS, HARM_COLOR, LAST_YEAR, MOIS, SATELLITES, TODAY, addDays, frpNiveau, monthBounds,
} from '../data/engine'
import { Icon } from './icons'
import { capital, fmt, frpLabel } from './format'

export function Popover({ label, icon, active, children, align = 'left', width = 320, className = '' }) {
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState(null)
  const root = useRef(null)
  const panel = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (root.current?.contains(e.target) || panel.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      setBox(null)
      return undefined
    }
    function place() {
      const btn = root.current?.querySelector('[aria-expanded]')
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const pad = 16
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = Math.min(width, vw - pad * 2)
      let left = align === 'right' ? r.right - w : r.left
      if (left + w > vw - pad) left = vw - pad - w
      if (left < pad) left = pad
      const spaceBelow = vh - r.bottom - pad
      const spaceAbove = r.top - pad
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
      const maxHeight = Math.max(120, Math.min(420, (openUp ? spaceAbove : spaceBelow) - 8))
      setBox(openUp
        ? { left, width: w, maxHeight, bottom: vh - r.top + 8 }
        : { left, width: w, maxHeight, top: r.bottom + 8 })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, width, align])

  return (
    <div className={`pop ${className}`} ref={root}>
      <button type="button" className={`pill${active ? ' on' : ''}${open ? ' open' : ''}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {icon && <Icon name={icon} size={15} />}
        <span>{label}</span>
        <Icon name="down" size={14} className="chev" />
      </button>
      {open && box && createPortal(
        <div
          ref={panel}
          className="pop-panel pop-fixed"
          style={box}
          role="dialog"
        >
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>,
        document.body,
      )}
    </div>
  )
}

export function Segmented({ options, value, onChange, size = 'md', label }) {
  return (
    <div className={`seg seg-${size}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          title={o.hint || undefined}
          onClick={() => onChange(o.id)}
        >
          {o.icon && <Icon name={o.icon} size={15} />}
          {o.label && <span>{o.label}</span>}
        </button>
      ))}
    </div>
  )
}

/** Harmonisé (pipeline Aqua) ou chaque détection satellite. */
export function UniqueToggle({ className = '' }) {
  const app = useApp()
  return (
    <div className={`unique-toggle ${className}`.trim()}>
      <Segmented
        size="sm"
        label="Lecture des points chauds"
        value={app.mode === 'brut' ? 'brut' : 'harmonise'}
        onChange={(v) => app.setMode(v)}
        options={[
          { id: 'harmonise', label: 'Harmonisé', hint: 'Cases ~28 km déjà ramenées à l’échelle d’Aqua' },
          { id: 'brut', label: 'Capteurs', hint: 'Chaque détection satellite, pour comparer MODIS et VIIRS' },
        ]}
      />
    </div>
  )
}

/** Puces Harmoniser + satellites. Harmoniser est exclusif : une seule couleur, aucun capteur parasite. */
export function SatChips({ counts, compact = false, showAll = true }) {
  const app = useApp()
  const harmOn = app.mode !== 'brut'
  return (
    <div className={`sat-chips${compact ? ' compact' : ''}`}>
      <button
        type="button"
        className="sat-chip sat-chip-harm"
        aria-pressed={harmOn}
        style={{ '--c': HARM_COLOR }}
        onClick={() => app.setMode('harmonise')}
        title="Harmoniser : cases ~28 km déjà ramenées à l’échelle d’Aqua, une seule couleur."
      >
        <i className="sw" />
        <span className="nm">Harmoniser</span>
      </button>
      {SATELLITES.map((s) => {
        const on = !harmOn && app.effectiveSats.includes(s.id)
        const live = app.dateFin >= s.start
        return (
          <button
            key={s.id}
            type="button"
            className="sat-chip"
            aria-pressed={on}
            style={{ '--c': s.color }}
            onClick={() => app.toggleSat(s.id)}
            onDoubleClick={() => app.onlySat(s.id)}
            title={`${s.id} · ${s.instrument} · pixel ${s.pixel} · passage ${s.passage}${live ? '' : ` · lancé le ${s.start}`}. Double-clic : uniquement ce satellite.`}
          >
            <i className="sw" />
            <span className="nm">{s.id}</span>
            {counts && <b>{live ? fmt(counts[s.id] || 0) : 'pas lancé'}</b>}
          </button>
        )
      })}
      {showAll && !harmOn && app.satellites.length !== ALL_SATS.length && (
        <button type="button" className="texty" onClick={app.allSats}>Tous</button>
      )}
    </div>
  )
}

const FRP_STEPS = [0, 5, 10, 20, 30, 50, 100, 200, 500]

/** Puissance minimale : la valeur est appliquée quand le curseur s'arrête, pour garder le globe fluide. */
export function FrpSlider() {
  const app = useApp()
  const [idx, setIdx] = useState(() => Math.max(0, FRP_STEPS.indexOf(app.frpMin)))
  useEffect(() => {
    const i = FRP_STEPS.indexOf(app.frpMin)
    if (i >= 0) setIdx(i)
  }, [app.frpMin])
  useEffect(() => {
    const value = FRP_STEPS[idx]
    if (value === app.frpMin) return undefined
    const t = window.setTimeout(() => app.setFrpMin(value), 260)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])
  const value = FRP_STEPS[idx]
  const level = frpNiveau(value)
  return (
    <div className="frp-slider">
      <div className="frp-head">
        <span>Intensité minimale</span>
        <b style={{ color: value ? level.couleur : undefined }}>{frpLabel(value)}</b>
      </div>
      <input
        type="range"
        min={0}
        max={FRP_STEPS.length - 1}
        step={1}
        value={idx}
        onChange={(e) => setIdx(Number(e.target.value))}
        aria-label="Puissance radiative minimale du point chaud (FRP en mégawatts)"
        aria-valuetext={frpLabel(value)}
        style={{ '--p': `${(idx / (FRP_STEPS.length - 1)) * 100}%` }}
      />
      <div className="frp-ticks" aria-hidden="true">
        {FRP_LEVELS.map((l) => (
          <button key={l.id} type="button" onClick={() => setIdx(FRP_STEPS.indexOf(l.min))} style={{ '--c': l.color }}>
            <i />{l.simple}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DateField({ label, value, onChange, min = DEMO_RANGE.start, max = DEMO_RANGE.end }) {
  return (
    <label className="date-field">
      <span>{label}</span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => { if (e.target.value) onChange(e.target.value) }}
      />
    </label>
  )
}

export function PeriodFields({ debut, fin, onChange }) {
  return (
    <div className="period-fields">
      <DateField label="Du" value={debut} max={fin} onChange={(v) => onChange(v, fin)} />
      <Icon name="right" size={14} className="faint" />
      <DateField label="Au" value={fin} min={debut} onChange={(v) => onChange(debut, v)} />
    </div>
  )
}

export function periodPresets() {
  const y = Number(TODAY.slice(0, 4))
  const m = Number(TODAY.slice(5, 7))
  return [
    { id: 'jour', label: 'Aujourd’hui', debut: TODAY, fin: TODAY },
    { id: '7j', label: '7 derniers jours', debut: addDays(TODAY, -6), fin: TODAY },
    { id: '30j', label: '30 derniers jours', debut: addDays(TODAY, -29), fin: TODAY },
    { id: 'mois', label: 'Ce mois-ci', debut: monthBounds(y, m).debut, fin: TODAY },
    { id: 'annee', label: `Année ${y}`, debut: `${y}-01-01`, fin: TODAY },
    { id: 's24', label: 'Saison de brûlage 2024', debut: '2024-06-01', fin: '2024-10-31' },
    { id: 'a24', label: '12 août 2024', debut: '2024-08-12', fin: '2024-08-12' },
    { id: 'p07', label: 'Pic d’août 2007', debut: '2007-08-01', fin: '2007-08-31' },
    { id: 'a05', label: 'Août 2005 · 2 satellites', debut: '2005-08-01', fin: '2005-08-31' },
  ]
}

export function MonthYearPicker({ onPick }) {
  const [year, setYear] = useState(Number(TODAY.slice(0, 4)))
  const [month, setMonth] = useState(Number(TODAY.slice(5, 7)))
  const years = []
  for (let y = LAST_YEAR; y >= 2002; y -= 1) years.push(y)
  return (
    <div className="my-picker">
      <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Mois">
        {MOIS.map((nom, i) => <option key={nom} value={i + 1}>{capital(nom)}</option>)}
      </select>
      <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Année">
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button type="button" className="ghost sm" onClick={() => { const b = monthBounds(year, month); onPick(b.debut, b.fin < TODAY ? b.fin : TODAY) }}>Ce mois</button>
      <button type="button" className="ghost sm" onClick={() => onPick(`${year}-01-01`, `${year}-12-31` < TODAY ? `${year}-12-31` : TODAY)}>Toute l’année</button>
    </div>
  )
}

export function Toasts() {
  const app = useApp()
  return (
    <div className="toasts" aria-live="polite">
      {app.toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <Icon name={t.tone === 'ok' ? 'check' : 'info'} size={16} />
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  )
}

export function Spinner({ label = 'Calcul…' }) {
  return <span className="spinner" role="status"><i />{label}</span>
}

export function Empty({ icon = 'info', title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} size={22} />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}

export function Hint({ children }) {
  return (
    <p className="hint"><Icon name="info" size={14} /><span>{children}</span></p>
  )
}
