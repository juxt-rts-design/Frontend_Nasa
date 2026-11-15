import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { REGIONS, SATELLITES, addDays, clampDate, defaultCell, demoToday } from './data/engine'

const KEY = 'firewatch.session.v1'
const AppContext = createContext(null)

export const DEMO_ACCOUNT = {
  username: 'observateur',
  email: 'observateur@firewatch.dev',
  password: 'feux2026',
  profil: {
    region_defaut: 'Afrique_Centrale',
    mode_vue_defaut: 'combine',
    satellite_prefere: 'Aqua,Suomi NPP',
  },
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

export function useApp() {
  return useContext(AppContext)
}

export function AppState({ children }) {
  const stored = useMemo(readSession, [])
  const today = useMemo(demoToday, [])
  const [view, setView] = useState('globe')
  const [regionId, setRegionId] = useState(stored.profil?.region_defaut || 'Afrique_Centrale')
  const [mode, setMode] = useState(stored.profil?.mode_vue_defaut || 'combine')
  const [satellites, setSatellites] = useState(() => {
    const raw = stored.profil?.satellite_prefere
    const list = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : SATELLITES.map((s) => s.id)
    return list.length ? list : ['Aqua']
  })
  const [satelliteRef, setSatelliteRef] = useState('Aqua')
  const [windowDays, setWindowDays] = useState(7)
  const [dateFin, setDateFin] = useState(today)
  const [selected, setSelected] = useState(null)
  const [focus, setFocus] = useState(null)
  const [cellId, setCellId] = useState(() => defaultCell(stored.profil?.region_defaut || 'Afrique_Centrale'))
  const [selectedMonth, setSelectedMonth] = useState({ annee: 2024, mois: 8 })
  const [help, setHelp] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [onboard, setOnboard] = useState(() => !localStorage.getItem('firewatch.onboarded'))
  const [user, setUser] = useState(stored.user || null)
  const [users, setUsers] = useState(stored.users || [])
  const [zones, setZones] = useState(stored.zones || [])
  const [activeZoneId, setActiveZoneId] = useState(null)
  const [conversations, setConversations] = useState(stored.conversations || [])
  const [conversationId, setConversationId] = useState(null)
  const [seriesMode, setSeriesMode] = useState('cellule')

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({
      user, users, zones, conversations, profil: user?.profil || null,
    }))
  }, [user, users, zones, conversations])

  const region = REGIONS.find((r) => r.id === regionId) || REGIONS[0]
  const dateDebut = addDays(dateFin, -(windowDays - 1))
  const activeZone = zones.find((z) => z.id === activeZoneId && z.user_id === user?.username) || null
  const myZones = zones.filter((z) => z.user_id === user?.username)

  function changeRegion(id) {
    setRegionId(id)
    setCellId(defaultCell(id))
    setSelected(null)
  }

  function shift(days) {
    setDateFin((d) => clampDate(addDays(d, days)))
    setSelected(null)
  }

  function goTo(iso, days = windowDays) {
    setWindowDays(days)
    setDateFin(clampDate(iso))
    setSelected(null)
  }

  function toggleSat(id) {
    setSatellites((list) => {
      const has = list.includes(id)
      if (has && list.length === 1) return list
      return has ? list.filter((s) => s !== id) : [...list, id]
    })
  }

  function register({ username, email, password }) {
    const name = username.trim()
    if (name.length < 2) throw new Error('Choisissez un nom d’au moins 2 caractères.')
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
  }

  function login({ username, password }) {
    const found = users.find((u) => u.username === username.trim() && u.password === password)
    if (!found) throw new Error('Nom ou mot de passe incorrect.')
    setUser(found)
    if (found.profil?.region_defaut) changeRegion(found.profil.region_defaut)
    if (found.profil?.mode_vue_defaut) setMode(found.profil.mode_vue_defaut)
    if (found.profil?.satellite_prefere) {
      const list = found.profil.satellite_prefere.split(',').map((s) => s.trim()).filter(Boolean)
      if (list.length) setSatellites(list)
    }
    setAuthOpen(false)
  }

  function logout() {
    setUser(null)
    setActiveZoneId(null)
    setProfileOpen(false)
    setConversationId(null)
  }

  function saveProfil(patch) {
    if (!user) return
    const profil = { ...user.profil, ...patch }
    const next = { ...user, profil }
    setUser(next)
    setUsers((list) => list.map((u) => (u.username === next.username ? next : u)))
    if (patch.region_defaut) changeRegion(patch.region_defaut)
    if (patch.mode_vue_defaut) setMode(patch.mode_vue_defaut)
    if (patch.satellite_prefere) {
      const list = patch.satellite_prefere.split(',').map((s) => s.trim()).filter(Boolean)
      if (list.length) setSatellites(list)
    }
  }

  function addZone({ nom, ring }) {
    if (!user) {
      setAuthOpen(true)
      return null
    }
    const zone = {
      id: Date.now(),
      user_id: user.username,
      nom: nom.trim() || 'Zone sans nom',
      geojson: { type: 'Polygon', coordinates: [ring] },
      cree_le: new Date().toISOString(),
    }
    setZones((list) => [...list, zone])
    setActiveZoneId(zone.id)
    return zone
  }

  function removeZone(id) {
    const zone = zones.find((z) => z.id === id)
    if (!zone || zone.user_id !== user?.username) return
    setZones((list) => list.filter((z) => z.id !== id))
    if (activeZoneId === id) setActiveZoneId(null)
  }

  function finishOnboard() {
    localStorage.setItem('firewatch.onboarded', '1')
    setOnboard(false)
  }

  function openConversation() {
    if (!user) return null
    const id = Date.now()
    const conv = { id, user_id: user.username, cree_le: new Date().toISOString(), messages: [] }
    setConversations((list) => [conv, ...list])
    setConversationId(id)
    return id
  }

  function pushMessage(convId, message) {
    setConversations((list) => list.map((c) => (
      c.id === convId ? { ...c, messages: [...c.messages, message] } : c
    )))
  }

  const value = {
    view, setView,
    regionId, region, changeRegion,
    mode, setMode,
    satellites, toggleSat, setSatellites,
    satelliteRef, setSatelliteRef,
    windowDays, setWindowDays,
    dateFin, dateDebut, shift, goTo, today,
    selected, setSelected,
    focus, setFocus,
    cellId, setCellId,
    selectedMonth, setSelectedMonth,
    help, setHelp,
    authOpen, setAuthOpen,
    profileOpen, setProfileOpen,
    onboard, finishOnboard,
    user, users, register, login, logout, saveProfil,
    zones: myZones, activeZone, activeZoneId, setActiveZoneId, addZone, removeZone,
    conversations: conversations.filter((c) => c.user_id === user?.username),
    conversationId, setConversationId, openConversation, pushMessage,
    seriesMode, setSeriesMode,
    isDemo: (import.meta.env.VITE_DATA_SOURCE || 'demo') !== 'api',
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
