import { api, apiPages, ensureCsrf, resetCsrf } from './http'

export async function fetchProfil() {
  try {
    await ensureCsrf()
    return await api('/api/profil/')
  } catch (err) {
    if (err.status === 401 || err.status === 403) return null
    throw err
  }
}

export async function loginRequest({ username, password }) {
  await ensureCsrf()
  const data = await api('/api/auth/connexion/', { method: 'POST', body: { username, password } })
  resetCsrf()
  return data?.profil || fetchProfil()
}

export async function registerRequest({ username, email, password, password2, pays = '' }) {
  await ensureCsrf()
  const data = await api('/api/auth/inscription/', {
    method: 'POST',
    body: { username, email, password, password2, pays },
  })
  resetCsrf()
  return data?.profil || fetchProfil()
}

export async function logoutRequest() {
  try {
    await api('/api/auth/deconnexion/', { method: 'POST', body: {} })
  } catch {
    /* session déjà close */
  }
  resetCsrf()
}

export async function saveProfilRequest(patch) {
  return api('/api/profil/', { method: 'PUT', body: patch })
}

export async function fetchZones() {
  return api('/api/zones/')
}

export async function createZoneRequest(payload) {
  return api('/api/zones/', { method: 'POST', body: payload })
}

export async function deleteZoneRequest(id) {
  return api(`/api/zones/${id}/`, { method: 'DELETE' })
}

export async function fetchConversations() {
  const list = await apiPages('/api/agent/conversations/', { page_size: 100 })
  return list.map((c) => ({ ...c, messages: c.messages || [] }))
}

export async function fetchConversation(id) {
  return api(`/api/agent/conversations/${id}/`)
}
