import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { login as apiLogin, extractClaims } from '../api/auth'
import type { UserRole } from '../api/types'

interface AuthUser {
  userId: string
  customerId: string
  role: UserRole
}

interface AuthCtx {
  user: AuthUser | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const VALID_ROLES: UserRole[] = ['Admin', 'Manager', 'Member', 'Viewer']

  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem('lb_token')
    if (!t) return null
    const c = extractClaims(t)
    if (!VALID_ROLES.includes(c.role as UserRole)) {
      localStorage.removeItem('lb_token')
      return null
    }
    return t
  })
  const [user, setUser] = useState<AuthUser | null>(() => {
    const t = localStorage.getItem('lb_token')
    if (!t) return null
    const c = extractClaims(t)
    if (!VALID_ROLES.includes(c.role as UserRole)) return null
    return { userId: c.userId, customerId: c.customerId, role: c.role as UserRole }
  })

  useEffect(() => {
    if (token) localStorage.setItem('lb_token', token)
    else localStorage.removeItem('lb_token')
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    const t = await apiLogin(email, password)
    const c = extractClaims(t)
    setToken(t)
    setUser({ userId: c.userId, customerId: c.customerId, role: c.role as UserRole })
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return <Ctx.Provider value={{ user, token, login, logout }}>{children}</Ctx.Provider>
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
