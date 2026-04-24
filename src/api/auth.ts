import { api } from './client'

interface LoginResponse { token: string; refreshToken: string }
interface ImpersonateResponse { token: string; targetEmail: string; targetRole: string }

export async function login(email: string, password: string): Promise<{ token: string; refreshToken: string }> {
  const res = await api.post<LoginResponse>('/auth/login', {
    cUserAccount: email,
    cUserPwd: password,
  })
  return res
}

export async function refreshTokenApi(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
  const res = await api.post<LoginResponse>('/auth/refresh', { refreshToken })
  return res
}

export async function logoutApi(): Promise<void> {
  try { await api.post('/auth/logout', {}) } catch { /* best-effort */ }
}

export async function impersonate(userId: string): Promise<ImpersonateResponse> {
  return api.post<ImpersonateResponse>(`/auth/impersonate/${userId}`, {})
}

/** Décode le payload JWT sans librairie externe. */
export function decodeToken(token: string): Record<string, string> {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json) as Record<string, string>
  } catch {
    return {}
  }
}

// .NET JwtSecurityTokenHandler abrège ClaimTypes :
//   ClaimTypes.NameIdentifier → "nameid"
//   ClaimTypes.Role           → "role"
//   "customerId"              → "customerId"
export function extractClaims(token: string) {
  const p = decodeToken(token)
  return {
    userId:         p['nameid'] ?? p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? '',
    customerId:     p['customerId'] ?? '',
    role:           (p['role'] ?? p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? '') as string,
    impersonatedBy: p['impersonatedBy'] ?? null,
  }
}
