import { useEffect, useState } from 'react'
import { describePlace, isWild, samePlace, stripPlace } from '../data/gazetteer'

const cache = new Map()

export function mergePlace(local, json) {
  const address = json?.address || {}
  const province = address.state || address.region || null
  const pays = address.country || local.pays
  const settlement = address.village || address.hamlet || address.town || address.city || null
  const coarse = !json?.addresstype || ['state', 'country', 'region'].includes(json.addresstype)
  const area = coarse ? null : (json.name || address.county || null)
  const wild = isWild(area)
  const foret = local._foret

  let titre = local.titre
  let role = local.role
  if (settlement) {
    titre = settlement
    role = 'Localité'
  } else if (wild && area) {
    titre = area
    role = 'Forêt ou aire protégée'
  } else if (local.titre) {
    titre = local.titre
    role = 'Forêt ou aire protégée'
  } else if (province) {
    titre = province
    role = 'Province'
  } else if (area) {
    titre = area
    role = 'Lieu'
  } else {
    titre = pays || 'Lieu non répertorié'
    role = pays ? 'Pays' : 'Lieu'
  }

  const sous = [
    province && !samePlace(province, titre) ? `province de ${province}` : null,
    pays && !samePlace(pays, titre) ? pays : null,
  ].filter(Boolean).join(' · ')

  let ville = null
  const city = local._ville
  if (city && city.km <= 250 && !samePlace(city.nom, titre)) {
    const where = city.province && !samePlace(city.province, city.nom) ? `${city.nom} · ${city.province}` : city.nom
    ville = city.km < 12 ? `près de ${where}` : `${where} · ville la plus proche, ${Math.round(city.km)} km`
  }

  let foretLine = null
  if (foret && !samePlace(foret.nom, titre) && !(area && samePlace(foret.nom, area)) && foret.km <= Math.max(foret.rayon, 80)) {
    foretLine = foret.km <= foret.rayon
      ? `${foret.nom} · à ${Math.round(foret.km)} km du centre`
      : `${foret.nom} · la plus proche, ${Math.round(foret.km)} km`
  } else if (foret && samePlace(foret.nom, titre) && foret.km >= 25) {
    foretLine = `centre de l’aire à ${Math.round(foret.km)} km`
  }

  return { titre, role, sous, pays, ville, foret: foretLine, source: 'OpenStreetMap' }
}

/** Province (OpenStreetMap) + ville et forêt les plus proches. */
export function usePlace(lat, lng) {
  const ready = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
  const la = ready ? Number(lat) : null
  const lo = ready ? Number(lng) : null
  const key = ready ? `${la.toFixed(3)},${lo.toFixed(3)}` : ''
  const local = ready ? describePlace(la, lo) : null
  const [remote, setRemote] = useState(null)

  useEffect(() => {
    if (!key) return undefined
    const known = cache.get(key)
    if (known) {
      setRemote(known)
      return undefined
    }
    setRemote(null)
    let cancel = false
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), 8000)
    const here = describePlace(la, lo)
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${lo}&zoom=14&addressdetails=1&accept-language=fr`
    fetch(url, { signal: ctrl.signal, headers: { 'Accept-Language': 'fr' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancel) return
        const merged = json?.address ? mergePlace(here, json) : stripPlace(here)
        const stored = { ...merged, key }
        cache.set(key, stored)
        setRemote(stored)
      })
      .catch(() => {
        if (cancel) return
        const stored = { ...stripPlace(here), key }
        cache.set(key, stored)
        setRemote(stored)
      })
      .finally(() => window.clearTimeout(timer))
    return () => {
      cancel = true
      ctrl.abort()
      window.clearTimeout(timer)
    }
  }, [key, la, lo])

  if (!local) return { place: null, loading: false }
  const hit = remote && remote.key === key ? remote : null
  return { place: hit || stripPlace(local), loading: !hit }
}
