import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { login as apiLogin, impersonate as apiImpersonate, logoutApi, extractClaims } from '../api/auth'
import type { UserRole } from '../api/types'

interface AuthUser {
  userId: string
  customerId: string
  role: UserRole
  email: string
}

interface AuthCtx {
  user: AuthUser | null
  token: string | null
  isImpersonating: boolean
  impersonatedEmail: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  impersonate: (userId: string, email: string) => Promise<UserRole>
  exitImpersonation: () => void
}

const Ctx = createContext<AuthCtx>(null!)

const VALID_ROLES: UserRole[] = ['Admin', 'Manager', 'Member', 'Viewer']

function parseUser(t: string, email?: string): AuthUser | null {
  const c = extractClaims(t)
  if (!VALID_ROLES.includes(c.role as UserRole)) return null
  return {
    userId: c.userId,
    customerId: c.customerId,
    role: c.role as UserRole,
    email: email ?? localStorage.getItem('lb_email') ?? '',
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken]                   = useState<string | null>(() => localStorage.getItem('lb_token'))
  const [user, setUser]                     = useState<AuthUser | null>(() => {
    const t = localStorage.getItem('lb_token')
    return t ? parseUser(t) : null
  })
  const [originalToken, setOriginalToken]   = useState<string | null>(() => localStorage.getItem('lb_original_token'))
  const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(() => localStorage.getItem('lb_impersonated_email'))

  const isImpersonating = originalToken !== null

  useEffect(() => {
    if (token) localStorage.setItem('lb_token', token)
    else localStorage.removeItem('lb_token')
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    localStorage.setItem('lb_email',         email)
    localStorage.setItem('lb_refresh_token', res.refreshToken)
    setToken(res.token)
    setUser(parseUser(res.token, email)!)
    setOriginalToken(null)
    setImpersonatedEmail(null)
  }, [])

  const logout = useCallback(() => {
    logoutApi() // best-effort server-side revocation
    setToken(null)
    setUser(null)
    setOriginalToken(null)
    setImpersonatedEmail(null)
    localStorage.removeItem('lb_token')
    localStorage.removeItem('lb_refresh_token')
    localStorage.removeItem('lb_original_token')
    localStorage.removeItem('lb_impersonated_email')
  }, [])

  const impersonate = useCallback(async (userId: string, email: string): Promise<UserRole> => {
    const res = await apiImpersonate(userId)
    const saved = token
    if (!localStorage.getItem('lb_original_token') && saved) {
      localStorage.setItem('lb_original_token', saved)
    }
    localStorage.setItem('lb_impersonated_email', email)
    localStorage.setItem('lb_token', res.token)
    const parsed = parseUser(res.token)!
    setOriginalToken(prev => prev ?? saved)
    setToken(res.token)
    setUser(parsed)
    setImpersonatedEmail(email)
    return parsed.role
  }, [token])

  const exitImpersonation = useCallback(() => {
    if (!originalToken) return
    setToken(originalToken)
    setUser(parseUser(originalToken)!)
    setOriginalToken(null)
    setImpersonatedEmail(null)
    localStorage.removeItem('lb_original_token')
    localStorage.removeItem('lb_impersonated_email')
  }, [originalToken])

  return (
    <Ctx.Provider value={{ user, token, isImpersonating, impersonatedEmail, login, logout, impersonate, exitImpersonation }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)

export function homeFor(role: UserRole): string {
  switch (role) {
    case 'Admin':   return '/admin/dashboard'
    case 'Manager': return '/manager/dashboard'
    case 'Member':  return '/member/sources'
    case 'Viewer':  return '/viewer'
  }
}
