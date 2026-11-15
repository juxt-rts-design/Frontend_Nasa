import { useApp } from '../state'
import { NRT_SINCE, SAT_BY_ID, frpNiveau, satUi } from '../data/engine'
import { nearPlace } from '../data/gazetteer'
import { Icon } from '../ui/icons'
import {
  confianceDetail, confianceSimple, fmt, fmtLongDay, fmtTime, typeLabel,
} from '../ui/format'
import { PlaceName } from './PlaceName'

export function FrpBadge({ frp }) {
  const lvl = frpNiveau(frp)
  return (
    <span className="frp-badge" style={{ '--c': lvl.couleur }} title={`Puissance mesurée : ${fmt(frp, 1)} mégawatts`}>
      <i />{lvl.simple}<small>{fmt(frp, 0)} MW</small>
    </span>
  )
}

export function SatTag({ id }) {
  const name = satUi(id)
  const sat = SAT_BY_ID[name]
  return (
    <span className="sat-tag" style={{ '--c': sat?.color }} title={sat ? `${name} · capteur ${sat.instrument}` : name}>
      <i />{name}
    </span>
  )
}

/** Ligne compacte d'un feu dans une liste. */
export function FireRow({ fire, onOpen, active }) {
  return (
    <button type="button" className={`fire-row${active ? ' on' : ''}`} onClick={() => onOpen(fire)}>
      <span className="fr-time"><Icon name={fire.daynight === 'N' ? 'moon' : 'sun'} size={13} />{fmtTime(fire.acq_time)}</span>
      {(fire.satellites?.length > 1 || fire.nb > 1)
        ? <span className="sat-tag mixed" title={(fire.satellites || []).join(', ')}><i />{fire.satellites?.length || fire.nb} capteurs</span>
        : <SatTag id={fire.satellite} />}
      <FrpBadge frp={fire.frp} />
      <span className="fr-pos">{nearPlace(fire.latitude, fire.longitude) || `${fmt(fire.latitude, 2)}°, ${fmt(fire.longitude, 2)}°`}</span>
    </button>
  )
}

/** Fiche complète d'une détection, avec les actions qui relient les vues. */
export function FireDetail({ fire, onClose, compact = false }) {
  const app = useApp()
  if (!fire) return null
  const lvl = frpNiveau(fire.frp)
  const lat = fire.latitude ?? fire.lat
  const lng = fire.longitude ?? fire.lng

  function toGlobe() {
    app.setSelected({ ...fire, kind: 'detection', lat, lng })
    if (fire.acq_date < app.dateDebut || fire.acq_date > app.dateFin) app.goTo(fire.acq_date, 1)
    app.setFocus({ lat, lng, token: Date.now() })
    app.setView('globe')
    window.setTimeout(() => app.setSelected({ ...fire, kind: 'detection', lat, lng }), 0)
  }

  function toMap() {
    if (fire.acq_date < app.dateDebut || fire.acq_date > app.dateFin) app.goTo(fire.acq_date, 1)
    app.setFocus({ lat, lng, token: Date.now() })
    app.setView('carte')
    window.setTimeout(() => app.setSelected({ ...fire, kind: 'detection', lat, lng }), 0)
  }

  async function toSeries() {
    await app.pickCell(lat, lng)
    app.setView('series')
  }

  return (
    <div className={`fire-detail${compact ? ' compact' : ''}`} style={{ '--c': lvl.couleur }}>
      <div className="fd-head">
        <div>
          <p className="kicker">Point chaud détecté depuis l’espace</p>
          <h3>{lvl.simple} <span>{fmt(fire.frp, 0)} MW</span></h3>
        </div>
        {onClose && <button type="button" className="icon-btn" aria-label="Fermer la fiche" onClick={onClose}><Icon name="x" /></button>}
      </div>
      <div className="kv">
        <span>Où</span><b><PlaceName lat={lat} lng={lng} /></b>
        <span>Quand</span><b>{fmtLongDay(fire.acq_date)}, {fmtTime(fire.acq_time)} GMT · {fire.daynight === 'N' ? 'la nuit' : 'en journée'}</b>
        <span>Vu par</span>
        <b className="tags">
          {(fire.satellites?.filter((s) => s && s !== 'plusieurs').length
            ? fire.satellites.filter((s) => s && s !== 'plusieurs')
            : [fire.satellite].filter(Boolean)
          ).map((id) => <SatTag key={id} id={id} />)}
          {fire.nb > 1 && <small>{fire.nb} détections fusionnées</small>}
        </b>
        <span>Fiabilité</span><b>{confianceSimple(fire.confidence)}</b>
        <span>Nature</span><b>{typeLabel(fire.type)}</b>
      </div>
      {!compact && (
        <details className="tune">
          <summary>Détails techniques</summary>
          <div className="kv">
            <span>Coordonnées</span><b>{fmt(lat, 4)}°, {fmt(lng, 4)}°</b>
            <span>Puissance</span><b>{fmt(fire.frp, 1)} MW (FRP)</b>
            <span>Capteur</span><b>{fire.instrument}</b>
            <span>Confiance</span><b>{confianceDetail(fire.confidence, fire.instrument)}</b>
            <span>Brillance</span><b>{fmt(fire.bright_ti4 ?? fire.brightness, 1)} K</b>
            {fire.scan != null && fire.track != null && <><span>Pixel</span><b>{fmt(fire.scan, 2)} × {fmt(fire.track, 2)} km</b></>}
            <span>Produit</span><b>{fire.acq_date >= NRT_SINCE ? 'Temps quasi réel (NRT)' : 'Standard'}{fire.version ? ` · v${fire.version}` : ''}</b>
            {fire.date_acquisition && <><span>Acquisition</span><b>{String(fire.date_acquisition).replace('T', ' ').slice(0, 19)}</b></>}
          </div>
        </details>
      )}
      <div className="row-actions">
        {app.view !== 'globe' && <button type="button" className="ghost sm" onClick={toGlobe}><Icon name="globe" size={14} />Voir sur le globe</button>}
        {app.view !== 'carte' && <button type="button" className="ghost sm" onClick={toMap}><Icon name="map" size={14} />Voir sur la carte</button>}
        <button type="button" className="ghost sm" onClick={toSeries}><Icon name="chart" size={14} />Activité à cet endroit dans le temps</button>
      </div>
    </div>
  )
}
