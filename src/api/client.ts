// En production (Vercel), VITE_API_URL pointe vers l'API Render.
// En développement, laisser vide — le proxy Vite prend le relais.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

function processQueue(newToken: string | null) {
  refreshQueue.forEach(resolve => resolve(newToken))
  refreshQueue = []
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('lb_refresh_token')
  if (!refreshToken) return null

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json() as { token: string; refreshToken: string }
    localStorage.setItem('lb_token',         data.token)
    localStorage.setItem('lb_refresh_token', data.refreshToken)
    return data.token
  } catch {
    return null
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('lb_token')
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  // ── 401 handling with refresh token ──────────────────────────────────────
  if (res.status === 401) {
    const body = await res.text().catch(() => '')

    if (body.includes('EMAIL_NOT_CONFIRMED')) throw new Error('EMAIL_NOT_CONFIRMED')

    // Don't try to refresh on login/refresh — would cause an infinite loop
    if (path === '/auth/login') {
      // Wrong credentials: just throw so Login.tsx can display the error message
      throw new Error('Unauthorized')
    }
    if (path === '/auth/refresh') {
      // Refresh token expired/invalid: clear session and redirect to login
      localStorage.removeItem('lb_token')
      localStorage.removeItem('lb_refresh_token')
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }

    // Queue concurrent requests while refreshing
    if (isRefreshing) {
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push(newToken => {
          if (!newToken) { reject(new Error('Unauthorized')); return }
          apiFetch<T>(path, init).then(resolve).catch(reject)
        })
      })
    }

    isRefreshing = true
    const newToken = await tryRefresh()
    isRefreshing = false
    processQueue(newToken)

    if (!newToken) {
      localStorage.removeItem('lb_token')
      localStorage.removeItem('lb_refresh_token')
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }

    // Retry original request with new token
    const retry = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newToken}`,
        ...(init?.headers ?? {}),
      },
    })
    if (!retry.ok) {
      const text = await retry.text()
      throw new Error(text || `HTTP ${retry.status}`)
    }
    if (retry.status === 204 || retry.headers.get('content-length') === '0') return null as T
    const text = await retry.text()
    return text ? JSON.parse(text) : (null as T)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') return null as T

  const text = await res.text()
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
  return text ? JSON.parse(text) : (null as T)
}

export const api = {
  get:    <T>(path: string)                    => apiFetch<T>(path),
  post:   <T>(path: string, body?: unknown)    => apiFetch<T>(path, { method: 'POST',   body: body !== undefined ? JSON.stringify(body) : undefined }),
  put:    <T>(path: string, body: unknown)     => apiFetch<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)     => apiFetch<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                    => apiFetch<T>(path, { method: 'DELETE' }),
}
