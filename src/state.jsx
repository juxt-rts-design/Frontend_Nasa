import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { isDemo, lookupCellule } from './api/client'
import {
  createZoneRequest, deleteZoneRequest, fetchConversation, fetchConversations, fetchProfil,
  fetchZones, loginRequest, logoutRequest, registerRequest, saveProfilRequest,
} from './api/auth'
import {
  deleteAllNotifications, markAllNotificationsRead, markNotificationRead, syncNotifications,
} from './api/notifications'
import { ensureCsrf } from './api/http'
import { LEGACY_REGION_ID, loadCountries, resolveRegion } from './data/countries'
import {
  ALL_SATS, DEMO_RANGE, TODAY, addDays, cellId as toCellId, circleToRing, clampDate,
  daysBetween, makeSpec, ringToCircle, zoneGeojson,
} from './data/engine'

function normalizeRegionId(id) {
  return LEGACY_REGION_ID[id] || id || 'Afrique_Centrale'
}

function uniqueNotifications(list) {
  const seen = new Set()
  const out = []
  for (const n of list || []) {
    const idKey = n.id != null ? `id:${n.id}` : null
    const cleKey = n.cle ? `cle:${n.cle}` : null
    if ((idKey && seen.has(idKey)) || (cleKey && seen.has(cleKey))) continue
    if (idKey) seen.add(idKey)
    if (cleKey) seen.add(cleKey)
    out.push(n)
  }
  return out
}

const KEY = 'firewatch.session.v1'
const PREFS = 'firewatch.prefs.v1'
const AppContext = createContext(null)

export const DEMO_ACCOUNT = {
  username: 'observateur',
  email: 'observateur@firewatch.dev',
  password: 'feux2026',
  pays: 'Gabon',
  profil: {
    region_defaut: 'Afrique_Centrale',
    mode_vue_defaut: 'harmonise',
    satellite_prefere: ALL_SATS.join(','),
  },
}

export const DEFAULT_FILTERS = { frpMin: 0, confiance: 'toutes', moment: 'tous' }

function readPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS)) || {} } catch { return {} }
}

function readSession() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY)) || {}
    const users = Array.isArray(data.users) ? data.users : []
    if (!users.some((u) => u.username === DEMO_ACCOUNT.username)) users.push({ ...DEMO_ACCOUNT })
    return { ...data, users }
  } catch {
    return { users: [{ ...DEMO_ACCOUNT }] }
  }
}

function parseSats(raw) {
  const list = String(raw || '').split(',').map((s) => s.trim()).filter((s) => ALL_SATS.includes(s))
  return list.length ? list : [...ALL_SATS]
}

function decorateZone(z) {
  if (!z) return z
  const geojson = zoneGeojson(z)
  return { ...z, geojson }
}

export function useApp() {
  return useContext(AppContext)
}

export function AppState({ children }) {
  const stored = useMemo(() => (isDemo ? readSession() : { users: [], ...readPrefs() }), [])
  const [view, setView] = useState('globe')
  const [regionId, setRegionId] = useState(() => normalizeRegionId(stored.profil?.region_defaut || stored.regionId || 'Afrique_Centrale'))
  const [atlas, setAtlas] = useState(null)
  const [mode, setModeRaw] = useState(() => (stored.mode === 'brut' ? 'brut' : 'harmonise'))
  const [satellites, setSatellites] = useState(() => parseSats(stored.profil?.satellite_prefere || stored.satellites))
  const [satelliteRef] = useState('Aqua')
  const [periode, setPeriodeRaw] = useState({ debut: addDays(TODAY, -6), fin: TODAY })
  const [frpMin, setFrpMin] = useState(DEFAULT_FILTERS.frpMin)
  const [confiance, setConfiance] = useState(DEFAULT_FILTERS.confiance)
  const [moment, setMoment] = useState(DEFAULT_FILTERS.moment)
  const [pointLimit, setPointLimit] = useState(10000)
  const [colorBy, setColorBy] = useState('satellite')
  const [selected, setSelected] = useState(null)
  const [focus, setFocus] = useState(null)
  const [cellId, setCellId] = useState(null)
  const [help, setHelp] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [onboard, setOnboard] = useState(() => !localStorage.getItem('firewatch.onboarded'))
  const [user, setUser] = useState(isDemo ? stored.user || null : null)
  const [users, setUsers] = useState(stored.users || [])
  const [zones, setZones] = useState((stored.zones || []).map(decorateZone))
  const [tempZone, setTempZone] = useState(null)
  const [activeZoneId, setActiveZoneId] = useState(null)
  const [conversations, setConversations] = useState(stored.conversations || [])
  const [conversationId, setConversationId] = useState(null)
  const [toasts, setToasts] = useState([])
  const toastId = useRef(0)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [liveAlerts, setLiveAlerts] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const liveAlertId = useRef(0)
  const knownNotif = useRef(new Set())
  const notifGen = useRef(0)
  const alertQueue = useRef([])
  const alertTimer = useRef(null)
  const alertRunning = useRef(false)
  const alertGen = useRef(0)

  useEffect(() => {
    loadCountries().then(setAtlas)
  }, [])

  useEffect(() => {
    if (isDemo) {
      localStorage.setItem(KEY, JSON.stringify({
        user, users, zones, conversations, profil: user?.profil || null,
      }))
      return
    }
    localStorage.setItem(PREFS, JSON.stringify({
      regionId, mode, satellites, profil: user ? { pays: user.pays } : null,
    }))
  }, [user, users, zones, conversations, regionId, mode, satellites])

  const notify = useCallback((text, tone = 'info') => {
    toastId.current += 1
    const id = toastId.current
    setToasts((list) => [...list.slice(-2), { id, text, tone }])
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3800)
  }, [])

  const applySession = useCallback(async (profil) => {
    if (!profil) {
      setUser(null)
      setZones([])
      setConversations([])
      setConversationId(null)
      return
    }
    setUser({
      username: profil.username,
      email: profil.email,
      pays: profil.pays || '',
      date_inscription: profil.date_inscription,
      profil: { pays: profil.pays || '' },
    })
    try {
      const [z, conv] = await Promise.all([fetchZones(), fetchConversations()])
      setZones((z || []).map(decorateZone))
      setConversations(conv || [])
    } catch {
      setZones([])
      setConversations([])
    }
  }, [])

  useEffect(() => {
    if (isDemo) return undefined
    let stop = false
    ensureCsrf()
      .then(() => fetchProfil())
      .then((profil) => { if (!stop && profil) return applySession(profil) })
      .catch(() => {})
    return () => { stop = true }
  }, [applySession])

  const region = useMemo(() => resolveRegion(regionId), [regionId, atlas])
  const atlasReady = Boolean(atlas)
  const myZones = isDemo ? zones.filter((z) => z.user_id === user?.username) : zones
  const activeZone = activeZoneId === 'temp'
    ? tempZone
    : myZones.find((z) => z.id === activeZoneId) || null
  const ring = activeZone?.geojson?.coordinates?.[0] || null
  const circle = activeZone?.lat_centre != null
    ? { lat: Number(activeZone.lat_centre), lon: Number(activeZone.lon_centre), rayon_km: Number(activeZone.rayon_km) || 50 }
    : null

  const spec = useMemo(() => makeSpec({
    frpMin, confiance, moment, ring, circle, zoneKey: activeZone ? `z${activeZone.id}` : '',
  }), [frpMin, confiance, moment, ring, circle, activeZone])

  const effectiveSats = satellites
  const filtersActive = Boolean(activeZone)
    || (mode === 'brut' && (frpMin > 0 || confiance !== 'toutes' || moment !== 'tous' || satellites.length !== ALL_SATS.length))
  const alertsOn = Boolean(user && region && region.kind !== 'world')

  const stopLiveAlerts = useCallback(() => {
    alertGen.current += 1
    alertQueue.current = []
    alertRunning.current = false
    if (alertTimer.current) {
      window.clearTimeout(alertTimer.current)
      alertTimer.current = null
    }
    setLiveAlerts([])
  }, [])

  const sleepAlert = useCallback((ms, gen) => new Promise((resolve) => {
    alertTimer.current = window.setTimeout(() => {
      alertTimer.current = null
      resolve(gen === alertGen.current)
    }, ms)
  }), [])

  const runAlertQueue = useCallback(async () => {
    if (alertRunning.current) return
    alertRunning.current = true
    const gen = alertGen.current
    while (alertQueue.current.length && gen === alertGen.current) {
      const item = alertQueue.current.shift()
      liveAlertId.current += 1
      const liveId = `live-${liveAlertId.current}`
      setLiveAlerts((prev) => {
        const leaving = prev.filter((p) => p.phase !== 'out').map((p) => ({ ...p, phase: 'out' }))
        return [...leaving, { ...item, liveId, phase: 'in' }]
      })
      if (!await sleepAlert(420, gen)) return
      setLiveAlerts((prev) => prev.filter((p) => p.liveId === liveId))
      if (!await sleepAlert(3400, gen)) return
    }
    if (gen !== alertGen.current) return
    setLiveAlerts((prev) => prev.map((p) => ({ ...p, phase: 'out' })))
    if (!await sleepAlert(420, gen)) return
    if (gen === alertGen.current) {
      setLiveAlerts([])
      alertRunning.current = false
      if (alertQueue.current.length) runAlertQueue()
    }
  }, [sleepAlert])

  const pushLiveAlert = useCallback((n) => {
    alertQueue.current.push(n)
    runAlertQueue()
  }, [runAlertQueue])

  useEffect(() => {
    notifGen.current += 1
    stopLiveAlerts()
  }, [regionId, user?.username, stopLiveAlerts])

  useEffect(() => {
    if (isDemo || !alertsOn) {
      setNotifications([])
      setUnreadCount(0)
      stopLiveAlerts()
      return undefined
    }
    let stop = false
    async function tick() {
      const epoch = notifGen.current
      try {
        const data = await syncNotifications({
          region,
          dateDebut: periode.debut,
          dateFin: periode.fin,
        })
        if (stop || epoch !== notifGen.current) return
        if (!data?.active) {
          setNotifications([])
          setUnreadCount(0)
          return
        }
        const items = uniqueNotifications(data.items)
        setNotifications(items)
        setUnreadCount(Number(data.non_lues) || 0)
        const incoming = uniqueNotifications(data.nouvelles).filter((n) => n.id != null && !n.lue && !knownNotif.current.has(n.id))
        incoming.forEach((n) => knownNotif.current.add(n.id))
        // Un premier import massif va dans la cloche ; les toasts restent pour les vraies arrivées.
        if (incoming.length && incoming.length <= 40) {
          incoming.forEach((n) => pushLiveAlert(n))
        }
      } catch {
        /* session close ou réseau */
      }
    }
    tick()
    const id = window.setInterval(tick, 14000)
    return () => {
      stop = true
      window.clearInterval(id)
    }
  }, [isDemo, alertsOn, user?.username, region, periode.debut, periode.fin, pushLiveAlert, stopLiveAlerts])

  async function markNotifRead(id) {
    if (!user || isDemo || id == null) return
    knownNotif.current.add(id)
    try {
      const data = await markNotificationRead(id)
      const item = data?.item || data
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, lue: true } : n)))
      if (data?.non_lues != null) setUnreadCount(Number(data.non_lues) || 0)
      else setUnreadCount((n) => Math.max(0, n - (item?.lue === false ? 0 : 1)))
    } catch (err) {
      notify(err.message || 'Notification illisible.')
    }
  }

  async function markAllNotifs() {
    if (!user || isDemo) return
    notifGen.current += 1
    stopLiveAlerts()
    setNotifications((list) => {
      list.forEach((n) => { if (n.id != null) knownNotif.current.add(n.id) })
      return list.map((n) => ({ ...n, lue: true }))
    })
    setUnreadCount(0)
    try {
      const data = await markAllNotificationsRead(alertsOn ? (region?.id || regionId) : '')
      setUnreadCount(Number(data?.non_lues) || 0)
    } catch (err) {
      notify(err.message || 'Impossible de marquer les notifications.')
    }
  }

  async function deleteAllNotifs() {
    if (!user) return
    notifGen.current += 1
    stopLiveAlerts()
    setNotifications([])
    setUnreadCount(0)
    if (isDemo) return
    try {
      await deleteAllNotifications()
      setUnreadCount(0)
    } catch (err) {
      notify(err.message || 'Impossible de supprimer les notifications.')
    }
  }

  function openNotification(n) {
    if (!n) return
    const lat = Number(n.lat)
    const lng = Number(n.lon ?? n.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const z = /z-score\s+(-?[\d.,]+)/i.exec(n.precision || '')
    const eq = /([\d.,]+)\s*éq/i.exec(n.precision || '')
    const zscore = z ? Number(z[1].replace(',', '.')) : null
    const nb = eq ? Number(eq[1].replace(',', '.')) : null
    setView('globe')
    setNotifOpen(false)
    setFocus({
      lat,
      lng,
      altitude: 0.065,
      token: Date.now(),
      from: 'notif',
      cellule_id: n.cellule_id,
    })
    setSelected({
      kind: 'cellule',
      lat,
      lng,
      lon: lng,
      cellule_id: n.cellule_id,
      zscore,
      nb_detections: nb,
      frp_max: null,
      est_anomalie: n.niveau === 'alerte',
      lieu: n.lieuAffiche || n.lieu,
    })
    if (n.id) markNotifRead(n.id)
  }

  function changeRegion(id) {
    setRegionId(normalizeRegionId(id))
    setSelected(null)
    setCellId(null)
    setFocus(null)
    if (activeZoneId === 'temp') setActiveZoneId(null)
  }

  function applyAssistantAction(action) {
    if (!action) return
    const nextView = action.view
    if (nextView === 'calendrier' || nextView === 'series' || nextView === 'carte' || nextView === 'globe') {
      setView(nextView)
    } else {
      setView('globe')
    }
    if (action.date_min || action.date_max) {
      setPeriode(action.date_min || periode.debut, action.date_max || periode.fin)
    }
    if (action.region_id) {
      setRegionId(normalizeRegionId(action.region_id))
      setSelected(null)
      setCellId(null)
      if (activeZoneId === 'temp') setActiveZoneId(null)
    }
    const lat = Number(action.lat)
    const lng = Number(action.lng ?? action.lon)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setFocus({
        lat,
        lng,
        altitude: Number(action.altitude) > 0 ? Number(action.altitude) : 0.4,
        token: Date.now(),
        from: 'assistant',
        cellule_id: action.cellule_id,
      })
    } else if (action.region_id) {
      setFocus(null)
    }
  }

  function setPeriode(debut, fin) {
    let a = clampDate(debut || periode.debut)
    let b = clampDate(fin || periode.fin)
    if (a > b) [a, b] = [b, a]
    setPeriodeRaw({ debut: a, fin: b })
    setSelected(null)
  }

  function shift(days) {
    const span = daysBetween(periode.debut, periode.fin)
    let fin = clampDate(addDays(periode.fin, days))
    let debut = addDays(fin, -span)
    if (debut < DEMO_RANGE.start) {
      debut = DEMO_RANGE.start
      fin = addDays(debut, span)
    }
    setPeriodeRaw({ debut, fin: clampDate(fin) })
    setSelected(null)
  }

  function setDuree(days) {
    setPeriode(addDays(periode.fin, -(days - 1)), periode.fin)
  }

  function goTo(iso, days = 1) {
    const fin = clampDate(iso)
    setPeriode(addDays(fin, -(days - 1)), fin)
  }

  function setMode(next) {
    setModeRaw(next === 'brut' ? 'brut' : 'harmonise')
    setSelected(null)
  }

  function toggleSat(id) {
    if (mode !== 'brut') {
      setModeRaw('brut')
      setSatellites([id])
      setSelected(null)
      return
    }
    setSatellites((list) => {
      const has = list.includes(id)
      if (has && list.length === 1) {
        setModeRaw('harmonise')
        setSelected(null)
        return list
      }
      return has ? list.filter((s) => s !== id) : ALL_SATS.filter((s) => s === id || list.includes(s))
    })
  }

  function onlySat(id) {
    setModeRaw('brut')
    setSatellites([id])
    setSelected(null)
  }

  function allSats() {
    setModeRaw('brut')
    setSatellites([...ALL_SATS])
  }

  function resetFilters() {
    setFrpMin(DEFAULT_FILTERS.frpMin)
    setConfiance(DEFAULT_FILTERS.confiance)
    setMoment(DEFAULT_FILTERS.moment)
    setSatellites([...ALL_SATS])
    setActiveZoneId(null)
    setPeriodeRaw({ debut: addDays(TODAY, -6), fin: TODAY })
    setModeRaw('harmonise')
    notify('Filtres réinitialisés : 7 derniers jours, données harmonisées.')
  }

  async function pickCell(lat, lng) {
    if (!isDemo) {
      const id = await lookupCellule(lat, lng)
      if (id != null) {
        setCellId(id)
        return id
      }
    }
    const id = toCellId(lat, lng)
    setCellId(id)
    return id
  }

  async function register({ username, email, password, password2, pays = '' }) {
    const name = username.trim()
    if (name.length < 2) throw new Error('Choisissez un nom d’au moins 2 caractères.')
    if (!email.trim()) throw new Error('Indiquez un e-mail.')
    if (password !== password2) throw new Error('Les deux mots de passe ne correspondent pas.')
    if (isDemo) {
      if (password.length < 4) throw new Error('Le mot de passe doit faire au moins 4 caractères.')
      if (users.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
        throw new Error('Ce nom est déjà utilisé.')
      }
      const profil = {
        region_defaut: regionId,
        mode_vue_defaut: mode,
        satellite_prefere: satellites.join(','),
      }
      const next = { username: name, email: email.trim(), password, profil }
      setUsers((list) => [...list, next])
      setUser(next)
      setAuthOpen(false)
      notify(`Bienvenue ${name}. Vos zones et conversations seront gardées.`, 'ok')
      return
    }
    if (password.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères.')
    const profil = await registerRequest({
      username: name,
      email: email.trim(),
      password,
      password2,
      pays,
    })
    await applySession(profil)
    setAuthOpen(false)
    notify(`Bienvenue ${name}.`, 'ok')
  }

  async function login({ username, password }) {
    if (isDemo) {
      const found = users.find((u) => u.username === username.trim() && u.password === password)
      if (!found) throw new Error('Nom ou mot de passe incorrect.')
      setUser(found)
      if (found.profil?.region_defaut) changeRegion(found.profil.region_defaut)
      if (found.profil?.mode_vue_defaut === 'brut') setModeRaw('brut')
      if (found.profil?.satellite_prefere) setSatellites(parseSats(found.profil.satellite_prefere))
      setAuthOpen(false)
      notify(`Connecté en tant que ${found.username}.`, 'ok')
      return
    }
    const profil = await loginRequest({ username: username.trim(), password })
    if (!profil) throw new Error('Nom ou mot de passe incorrect.')
    await applySession(profil)
    setAuthOpen(false)
    notify(`Connecté en tant que ${profil.username}.`, 'ok')
  }

  async function logout() {
    if (!isDemo) await logoutRequest()
    setUser(null)
    if (!isDemo) {
      setZones([])
      setConversations([])
    }
    if (activeZoneId !== 'temp') setActiveZoneId(null)
    setProfileOpen(false)
    setConversationId(null)
    setNotifications([])
    setUnreadCount(0)
    setNotifOpen(false)
    knownNotif.current = new Set()
    notifGen.current += 1
    stopLiveAlerts()
  }

  async function saveProfil(patch) {
    if (!user) return
    if (isDemo) {
      const profil = { ...user.profil, ...patch }
      const next = { ...user, profil }
      setUser(next)
      setUsers((list) => list.map((u) => (u.username === next.username ? next : u)))
      if (patch.region_defaut) changeRegion(patch.region_defaut)
      if (patch.mode_vue_defaut === 'brut' || patch.mode_vue_defaut === 'harmonise') setModeRaw(patch.mode_vue_defaut)
      if (patch.satellite_prefere) setSatellites(parseSats(patch.satellite_prefere))
      notify('Profil enregistré.', 'ok')
      return
    }
    const next = await saveProfilRequest({ pays: patch.pays ?? user.pays })
    setUser((u) => ({ ...u, ...next, pays: next.pays, profil: { ...(u?.profil || {}), pays: next.pays } }))
    if (patch.region_defaut) changeRegion(patch.region_defaut)
    if (patch.mode_vue_defaut === 'brut' || patch.mode_vue_defaut === 'harmonise') setModeRaw(patch.mode_vue_defaut)
    if (patch.satellite_prefere) setSatellites(parseSats(patch.satellite_prefere))
    notify('Profil enregistré.', 'ok')
  }

  function applyTempZone(ring2, nom = 'Zone dessinée') {
    const circle2 = ringToCircle(ring2)
    setTempZone({
      id: 'temp',
      nom,
      geojson: { type: 'Polygon', coordinates: [ring2] },
      temp: true,
      ...(circle2 || {}),
    })
    setActiveZoneId('temp')
    notify(`« ${nom} » filtre maintenant toutes les vues.`, 'ok')
  }

  function applyTempCircle({ nom = 'Zone dessinée', lat_centre, lon_centre, rayon_km }) {
    const ring2 = circleToRing(Number(lat_centre), Number(lon_centre), Number(rayon_km) || 50)
    setTempZone({
      id: 'temp',
      nom,
      lat_centre: Number(lat_centre),
      lon_centre: Number(lon_centre),
      rayon_km: Number(rayon_km) || 50,
      geojson: { type: 'Polygon', coordinates: [ring2] },
      temp: true,
    })
    setActiveZoneId('temp')
    notify(`« ${nom} » filtre maintenant toutes les vues.`, 'ok')
  }

  async function addZone({ nom, ring: ring2, lat_centre, lon_centre, rayon_km }) {
    if (!user) {
      setAuthOpen(true)
      return null
    }
    const circle2 = lat_centre != null
      ? { lat_centre: Number(lat_centre), lon_centre: Number(lon_centre), rayon_km: Number(rayon_km) || 50 }
      : ringToCircle(ring2)
    if (!circle2) return null
    const geojson = { type: 'Polygon', coordinates: [circleToRing(circle2.lat_centre, circle2.lon_centre, circle2.rayon_km)] }
    if (isDemo) {
      const zone = {
        id: Date.now(),
        user_id: user.username,
        nom: nom.trim() || 'Zone sans nom',
        ...circle2,
        geojson,
        cree_le: new Date().toISOString(),
      }
      setZones((list) => [...list, zone])
      setActiveZoneId(zone.id)
      setTempZone(null)
      notify(`Zone « ${zone.nom} » enregistrée et appliquée.`, 'ok')
      return zone
    }
    try {
      const created = await createZoneRequest({ nom: nom.trim() || 'Zone sans nom', ...circle2 })
      const zone = decorateZone(created)
      setZones((list) => [...list, zone])
      setActiveZoneId(zone.id)
      setTempZone(null)
      notify(`Zone « ${zone.nom} » enregistrée et appliquée.`, 'ok')
      return zone
    } catch (err) {
      notify(err.message || 'Zone non enregistrée.', 'err')
      return null
    }
  }

  async function removeZone(id) {
    const zone = zones.find((z) => z.id === id)
    if (!zone) return
    if (isDemo) {
      if (zone.user_id !== user?.username) return
      setZones((list) => list.filter((z) => z.id !== id))
    } else {
      try {
        await deleteZoneRequest(id)
        setZones((list) => list.filter((z) => z.id !== id))
      } catch (err) {
        notify(err.message || 'Suppression impossible.', 'err')
        return
      }
    }
    if (activeZoneId === id) setActiveZoneId(null)
  }

  function clearZone() {
    setActiveZoneId(null)
  }

  function finishOnboard() {
    localStorage.setItem('firewatch.onboarded', '1')
    setOnboard(false)
  }

  function restartOnboard() {
    setView('globe')
    setHelp(false)
    setOnboard(true)
  }

  function openConversation() {
    if (!user) return null
    if (isDemo) {
      const id = Date.now()
      const conv = { id, user_id: user.username, cree_le: new Date().toISOString(), messages: [] }
      setConversations((list) => [conv, ...list])
      setConversationId(id)
      return id
    }
    setConversationId('new')
    return 'new'
  }

  function pushMessage(convId, message) {
    setConversations((list) => {
      const found = list.some((c) => c.id === convId)
      if (!found) {
        return [{ id: convId, titre: message.contenu?.slice(0, 100) || 'Conversation', messages: [message] }, ...list.filter((c) => c.id !== 'new')]
      }
      return list.map((c) => (c.id === convId ? { ...c, messages: [...(c.messages || []), message] } : c))
    })
  }

  function renameConversation(from, to) {
    if (from == null || to == null || from === to) return
    setConversations((list) => list.map((c) => (c.id === from ? { ...c, id: to } : c)))
    setConversationId((id) => (id === from ? to : id))
  }

  async function loadConversation(id) {
    if (isDemo || id == null || id === 'new') return
    try {
      const data = await fetchConversation(id)
      setConversations((list) => {
        const others = list.filter((c) => c.id !== data.id)
        return [{ ...data, messages: data.messages || [] }, ...others]
      })
    } catch (err) {
      notify(err.message || 'Conversation illisible.', 'err')
    }
  }

  const value = {
    view, setView,
    regionId, region, changeRegion, atlasReady, countries: atlas?.countries || [],
    mode, setMode,
    satellites, effectiveSats, toggleSat, onlySat, allSats, setSatellites,
    satelliteRef,
    periode, dateDebut: periode.debut, dateFin: periode.fin, setPeriode, shift, setDuree, goTo, today: TODAY,
    frpMin, setFrpMin, confiance, setConfiance, moment, setMoment, spec, filtersActive, resetFilters,
    pointLimit, setPointLimit, colorBy, setColorBy,
    selected, setSelected,
    focus, setFocus,
    cellId, setCellId, pickCell,
    help, setHelp,
    authOpen, setAuthOpen,
    profileOpen, setProfileOpen,
    onboard, finishOnboard, restartOnboard,
    user, users, register, login, logout, saveProfil,
    zones: myZones, activeZone, activeZoneId, setActiveZoneId, addZone, removeZone, applyTempZone, applyTempCircle, clearZone, tempZone,
    conversations: isDemo ? conversations.filter((c) => c.user_id === user?.username) : conversations,
    conversationId, setConversationId, openConversation, pushMessage, renameConversation, loadConversation,
    toasts, notify,
    notifications, unreadCount, liveAlerts, notifOpen, setNotifOpen,
    alertsOn, markNotifRead, markAllNotifs, deleteAllNotifs, openNotification, applyAssistantAction,
    isDemo,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
