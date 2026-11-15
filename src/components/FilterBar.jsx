import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp } from '../state'
import { CountrySearch } from './CountrySearch'
import { Icon } from '../ui/icons'
import {
  FrpSlider, MonthYearPicker, PeriodFields, Popover, SatChips, Segmented, periodPresets,
} from '../ui/controls'
import { fmtPeriod, frpLabel, periodLength, satsLabel } from '../ui/format'

export function FilterBar() {
  const app = useApp()
  const presets = periodPresets()
  const extraCount = (app.confiance !== 'toutes' ? 1 : 0) + (app.moment !== 'tous' ? 1 : 0)
  const brut = app.mode === 'brut'
  const [open, setOpen] = useState(false)
  const [box, setBox] = useState(null)
  const sheet = useRef(null)
  const tune = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      const t = e.target
      if (sheet.current?.contains(t) || t.closest?.('.filter-sum') || t.closest?.('.pop-panel')) return
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
      const btn = tune.current
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const pad = 16
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = Math.min(360, vw - pad * 2)
      let left = r.right - w
      if (left < pad) left = pad
      if (left + w > vw - pad) left = vw - pad - w
      let top = r.bottom + 8
      let maxHeight = vh - pad - top
      if (maxHeight < 220) {
        top = Math.max(pad, vh - pad - Math.min(480, vh - pad * 2))
        maxHeight = vh - pad - top
      }
      setBox({ left, top, width: w, maxHeight: Math.max(180, maxHeight) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  return (
    <div className={`filterbar${open ? ' open' : ''}`} role="toolbar" aria-label="Filtres communs à toutes les vues">
      <div className={`filter-sum${app.filtersActive ? ' on' : ''}`}>
        <span className="filter-place">
          <Icon name="pin" size={14} />
          <b>{app.region.nom}</b>
        </span>
        <span className="sep" />
        <span>{fmtPeriod(app.dateDebut, app.dateFin)}</span>
        <span className="sep" />
        <span>{brut ? satsLabel(app.satellites) : 'Harmoniser'}</span>
        <button
          ref={tune}
          type="button"
          className={`filter-tune${open ? ' on' : ''}`}
          aria-expanded={open}
          aria-label={open ? 'Fermer les filtres' : 'Filtres'}
          title={open ? 'Fermer' : 'Filtres'}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? 'x' : 'sliders'} size={16} />
        </button>
      </div>

      {open && box && (
        <div className="filter-sheet" ref={sheet} role="dialog" aria-label="Filtres de la vue" style={box}>
          <div className="filter-sheet-head">
            <div>
              <p className="pop-kicker">Lieu</p>
              <strong>{app.region.nom}</strong>
            </div>
            <button type="button" className="icon-btn sm" aria-label="Fermer" onClick={() => setOpen(false)}>
              <Icon name="x" size={14} />
            </button>
          </div>

          <CountrySearch
            currentId={app.regionId}
            currentNom={app.region.nom}
            onPick={(id) => { app.changeRegion(id); setOpen(false) }}
            autoFocus
            compact
          />

          <div className="filter-sheet-pills">
            <Popover icon="shape" label={app.activeZone ? app.activeZone.nom : 'Tout le territoire'} active={Boolean(app.activeZone)} width={280}>
              {(close) => (
                <div className="pop-list">
                  <p className="pop-kicker">Zone d’intérêt</p>
                  <button type="button" aria-current={!app.activeZone} onClick={() => { app.clearZone(); close() }}>
                    Tout {app.region.nom}{!app.activeZone && <Icon name="check" size={15} />}
                  </button>
                  {app.tempZone && (
                    <button type="button" aria-current={app.activeZoneId === 'temp'} onClick={() => { app.setActiveZoneId('temp'); close() }}>
                      {app.tempZone.nom} <small>non enregistrée</small>
                    </button>
                  )}
                  {app.zones.map((z) => (
                    <button key={z.id} type="button" aria-current={z.id === app.activeZoneId} onClick={() => { app.setActiveZoneId(z.id); close() }}>
                      {z.nom}{z.id === app.activeZoneId && <Icon name="check" size={15} />}
                    </button>
                  ))}
                  <button type="button" className="pop-action" onClick={() => { app.setView('carte'); close(); setOpen(false) }}>
                    <Icon name="plus" size={15} />Dessiner une zone sur la carte
                  </button>
                </div>
              )}
            </Popover>

            <Popover icon="calendar" label={fmtPeriod(app.dateDebut, app.dateFin)} width={360}>
              {(close) => (
                <div className="pop-period">
                  <p className="pop-kicker">Période · {periodLength(app.dateDebut, app.dateFin)}</p>
                  <PeriodFields debut={app.dateDebut} fin={app.dateFin} onChange={(a, b) => app.setPeriode(a, b)} />
                  <p className="pop-kicker">Un mois ou une année</p>
                  <MonthYearPicker onPick={(a, b) => { app.setPeriode(a, b); close() }} />
                  <p className="pop-kicker">Raccourcis</p>
                  <div className="preset-grid">
                    {presets.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={app.dateDebut === p.debut && app.dateFin === p.fin}
                        onClick={() => { app.setPeriode(p.debut, p.fin); close() }}
                      >{p.label}</button>
                    ))}
                  </div>
                </div>
              )}
            </Popover>

            <Popover
              icon="sat"
              label={brut ? satsLabel(app.satellites) : 'Harmoniser'}
              active={brut}
              width={340}
            >
              <div className="pop-sats">
                <p className="pop-kicker">Satellites affichés</p>
                <SatChips />
                <p className="muted sm">{brut
                  ? 'Cliquez Harmoniser pour une seule couleur, ou décochez les capteurs un par un.'
                  : 'Harmoniser seul : une couleur unique, sans les couleurs des satellites. Cliquez un capteur pour le voir à part.'}</p>
              </div>
            </Popover>

            {brut && (
              <Popover icon="flame" label={frpLabel(app.frpMin)} active={app.frpMin > 0} width={320}>
                <div className="pop-frp">
                  <FrpSlider />
                  <p className="muted sm">Les points chauds plus faibles que ce seuil disparaissent de toutes les pages.</p>
                </div>
              </Popover>
            )}

            {brut && (
              <Popover icon="shield" label={extraCount ? `Fiabilité · ${extraCount}` : 'Fiabilité'} active={extraCount > 0} width={300}>
                <div className="pop-more">
                  <p className="pop-kicker">Quelles détections garder ?</p>
                  <Segmented
                    value={app.confiance}
                    onChange={app.setConfiance}
                    options={[
                      { id: 'toutes', label: 'Probables et certains' },
                      { id: 'elevee', label: 'Presque certains' },
                    ]}
                  />
                  <p className="pop-kicker">Moment de la journée</p>
                  <Segmented
                    value={app.moment}
                    onChange={app.setMoment}
                    options={[
                      { id: 'tous', label: 'Jour et nuit' },
                      { id: 'D', label: 'Jour', icon: 'sun' },
                      { id: 'N', label: 'Nuit', icon: 'moon' },
                    ]}
                  />
                </div>
              </Popover>
            )}

            {(app.filtersActive || app.dateFin !== app.today) && (
              <button type="button" className="pill reset" onClick={app.resetFilters}>
                <Icon name="reset" size={15} /><span>Réinitialiser</span>
              </button>
            )}
          </div>
          <button type="button" className="solid filter-apply" onClick={() => setOpen(false)}>
            Appliquer
          </button>
        </div>
      )}
    </div>
  )
}
