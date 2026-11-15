/** Fetch session + CSRF vers l’API Django (proxy Vite `/api` ou VITE_API_BASE). */

const BASE = import.meta.env.VITE_API_BASE ?? ''

let csrfCache = ''

export function apiUrl(path) {
  if (!path) return BASE || '/'
  if (path.startsWith('http')) return path
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`
}

export function csrfToken() {
  if (csrfCache) return csrfCache
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

function rememberCsrf(token) {
  if (token) csrfCache = token
}

function rememberCsrfFromCookie() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/)
  if (match) csrfCache = decodeURIComponent(match[1])
}

export function resetCsrf() {
  csrfCache = ''
  rememberCsrfFromCookie()
}

export async function ensureCsrf() {
  const res = await fetch(apiUrl('/api/auth/csrf/'), { credentials: 'include' })
  try {
    const data = await res.json()
    if (data?.csrfToken) rememberCsrf(data.csrfToken)
  } catch { /* cookie seul */ }
  rememberCsrfFromCookie()
  return csrfCache
}

function flattenError(data, status) {
  if (!data) return `Erreur ${status}`
  if (typeof data === 'string') return data
  const detail = data.detail || data.erreur || data.error || data.message
  if (detail) {
    const text = Array.isArray(detail) ? detail.join(' ') : String(detail)
    if (/csrf/i.test(text)) return 'Session expirée. Réessayez.'
    return text
  }
  const parts = []
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) parts.push(value.join(', '))
    else if (typeof value === 'string') parts.push(value)
    else if (value && typeof value === 'object') {
      const nested = Object.values(value).flat().filter((x) => typeof x === 'string')
      if (nested.length) parts.push(nested.join(', '))
    }
  }
  return parts.join(' · ') || `Erreur ${status}`
}

async function request(path, { method = 'GET', body, headers, retry = true } = {}) {
  const verb = method.toUpperCase()
  if (verb !== 'GET' && verb !== 'HEAD') {
    if (!csrfToken()) await ensureCsrf()
  }
  const res = await fetch(apiUrl(path), {
    method: verb,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(verb !== 'GET' && verb !== 'HEAD' ? { 'X-CSRFToken': csrfToken() } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (res.status === 204) return null
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = { detail: text } }
  rememberCsrfFromCookie()
  if (!res.ok) {
    const csrfFail = res.status === 403 && /csrf/i.test(String(data?.detail || data?.erreur || ''))
    if (csrfFail && retry && verb !== 'GET' && verb !== 'HEAD') {
      csrfCache = ''
      await ensureCsrf()
      return request(path, { method, body, headers, retry: false })
    }
    const err = new Error(flattenError(data, res.status))
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export async function api(path, opts = {}) {
  return request(path, opts)
}

export async function apiBlob(path) {
  if (!csrfToken()) await ensureCsrf()
  const res = await fetch(apiUrl(path), { credentials: 'include' })
  if (!res.ok) throw new Error(`Export ${res.status}`)
  return res.blob()
}

/** Suit les pages DRF (`results` + `next`) et renvoie un tableau plat. */
export async function apiPages(path, params = {}, { maxPages = 40 } = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value)
  })
  if (!query.has('page_size')) query.set('page_size', '1000')
  let url = `${path}${path.includes('?') ? '&' : '?'}${query.toString()}`
  const out = []
  let pages = 0
  while (url && pages < maxPages) {
    const data = await api(url.replace(/^https?:\/\/[^/]+/, ''))
    if (Array.isArray(data)) return data
    out.push(...(data?.results || []))
    url = data?.next || null
    pages += 1
  }
  return out
}
