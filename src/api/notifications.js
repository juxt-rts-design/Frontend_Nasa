import { api } from './http'
import { regionBboxParams } from '../data/countries'

export async function syncNotifications({ region, dateDebut, dateFin }) {
  const bbox = regionBboxParams(region)
  return api('/api/notifications/sync/', {
    method: 'POST',
    body: {
      region_id: region?.id,
      region_nom: region?.nom,
      kind: region?.kind,
      date_min: dateDebut,
      date_max: dateFin,
      ...bbox,
    },
  })
}

export async function fetchNotifications(regionId) {
  const q = regionId ? `?region_id=${encodeURIComponent(regionId)}` : ''
  return api(`/api/notifications/${q}`)
}

export async function markNotificationRead(id) {
  return api(`/api/notifications/${id}/lire/`, { method: 'POST', body: {} })
}

export async function markAllNotificationsRead(regionId) {
  return api('/api/notifications/lire-tout/', {
    method: 'POST',
    body: regionId ? { region_id: regionId } : {},
  })
}

export async function deleteAllNotifications() {
  return api('/api/notifications/vider/', {
    method: 'POST',
    body: {},
  })
}
