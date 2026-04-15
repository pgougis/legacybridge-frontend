import { api } from './client'

interface LoginResponse { token: string }

export async function login(email: string, password: string): Promise<string> {
  const res = await api.post<LoginResponse>('/auth/login', {
    cUserAccount: email,
    cUserPwd: password,
  })
  return res.token
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
    userId:     p['nameid'] ?? p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ?? '',
    customerId: p['customerId'] ?? '',
    role:       (p['role'] ?? p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? '') as string,
  }
}
