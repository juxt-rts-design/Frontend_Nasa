import { useEffect, useRef } from 'react'
import { useApp } from '../state'
import { nearPlace } from '../data/gazetteer'
import { Icon } from '../ui/icons'
import { fmtDayMonth, fmtWeekdayShort } from '../ui/format'

function enrich(n) {
  const lieu = n.lat != null ? nearPlace(n.lat, n.lon) : ''
  return {
    ...n,
    lieuAffiche: lieu || n.lieu || n.region_nom,
  }
}

export function AlertStream() {
  const app = useApp()
  if (!app.user || !app.alertsOn || app.liveAlerts.length === 0) return null
  return (
    <div className="alert-stream" aria-live="polite">
      {app.liveAlerts.map((raw) => {
        const n = enrich(raw)
        const iso = n.date_alerte
        return (
          <button
            type="button"
            key={n.liveId}
            className={`alert-card ${n.niveau || 'risque'}${n.phase === 'out' ? ' out' : ''}`}
            onClick={() => app.openNotification(n)}
          >
            <span className="alert-kicker">
              <Icon name="flame" size={13} />
              {n.titre}
            </span>
            <strong>{n.lieuAffiche}</strong>
            <span className="alert-meta">
              {n.region_nom}
              {iso ? ` · ${fmtWeekdayShort(iso)} ${fmtDayMonth(iso)}` : ''}
            </span>
            {n.precision && <em>{n.precision}</em>}
          </button>
        )
      })}
    </div>
  )
}

export function NotificationBell() {
  const app = useApp()
  const wrap = useRef(null)
  useEffect(() => {
    if (!app.notifOpen) return undefined
    const onDown = (e) => {
      if (wrap.current?.contains(e.target)) return
      app.setNotifOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [app])
  if (!app.user) return null
  const n = app.alertsOn ? app.unreadCount : 0
  const label = n > 0 ? `${n} notification${n > 1 ? 's' : ''} non lue${n > 1 ? 's' : ''}` : 'Notifications'

  return (
    <div className="notif-wrap" ref={wrap}>
      <button
        type="button"
        className={`icon-btn notif-btn${app.notifOpen ? ' on' : ''}`}
        aria-label={label}
        aria-expanded={app.notifOpen}
        onClick={() => app.setNotifOpen((v) => !v)}
      >
        <Icon name="bell" size={16} />
        {n > 0 && <i className="notif-badge">{n > 99 ? '99+' : n}</i>}
      </button>
      {app.notifOpen && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <div>
              <p className="kicker">Alertes</p>
              <strong>{app.alertsOn ? app.region.nom : 'Hors globe monde'}</strong>
            </div>
            <div className="notif-head-actions">
              {n > 0 && (
                <button type="button" className="texty" onClick={app.markAllNotifs}>Tout lire</button>
              )}
              {app.notifications.length > 0 && (
                <button
                  type="button"
                  className="icon-btn sm"
                  aria-label="Supprimer toutes les notifications"
                  title="Supprimer toutes les notifications"
                  onClick={() => {
                    if (window.confirm('Supprimer toutes les notifications ?')) app.deleteAllNotifs()
                  }}
                >
                  <Icon name="trash" size={15} />
                </button>
              )}
            </div>
          </div>
          {!app.alertsOn && (
            <p className="muted sm">Les notifications n’arrivent que pour un pays ou une région précise, pas pour le globe entier.</p>
          )}
          {app.alertsOn && app.notifications.length === 0 && (
            <p className="muted sm">Pas encore d’alerte pour {app.region.nom} sur cette période.</p>
          )}
          <div className="notif-list">
            {app.notifications.map((raw) => {
              const item = enrich(raw)
              const iso = item.date_alerte
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`notif-row${item.lue ? '' : ' unread'}`}
                  onClick={() => app.openNotification(item)}
                >
                  <span className={`notif-dot ${item.niveau}`} />
                  <span>
                    <b>{item.titre}</b>
                    <small>{item.lieuAffiche} · {item.region_nom}</small>
                    <small>{iso ? `${fmtWeekdayShort(iso)} ${fmtDayMonth(iso)}` : ''}{item.precision ? ` · ${item.precision}` : ''}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
