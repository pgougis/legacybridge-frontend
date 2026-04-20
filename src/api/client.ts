// En production (Vercel), VITE_API_URL pointe vers l'API Render.
// En développement, laisser vide — le proxy Vite prend le relais.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

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

  if (res.status === 401) {
    const body = await res.text().catch(() => '')
    // EMAIL_NOT_CONFIRMED → let the caller handle it, don't redirect
    if (body.includes('EMAIL_NOT_CONFIRMED')) {
      throw new Error('EMAIL_NOT_CONFIRMED')
    }
    localStorage.removeItem('lb_token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return null as T
  }

  const text = await res.text()
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
  return text ? JSON.parse(text) : (null as T)
}

export const api = {
  get:    <T>(path: string)                    => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown)     => apiFetch<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown)     => apiFetch<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)     => apiFetch<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)                    => apiFetch<T>(path, { method: 'DELETE' }),
}
