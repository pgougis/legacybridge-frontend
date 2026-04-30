import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../ctx/auth'
import { usersApi } from '../api/users'
import { customersApi } from '../api/customers'
import { chatApi } from '../api/chat'
import { INACTIVITY_MS } from '../config'

interface NavItem { to: string; icon: string; label: string; color?: string; href?: string; onClick?: () => void; badge?: number }

const adminNav = (): NavItem[] => [
  { to: '/admin/dashboard',  icon: '◉',  label: 'Dashboard' },
  { to: '/admin/customers',  icon: '🏢', label: 'Customers' },
  { to: '/admin/users',      icon: '👤', label: 'Users' },
  { to: '/admin/sources',    icon: '🔌', label: 'Legacy Sources' },
  { to: '/admin/plans',      icon: '📋', label: 'Access Plans' },
  { to: '/admin/testbench',  icon: '⚗',  label: 'Test Bench', color: 'orange' },
  { to: '/admin/usage',      icon: '📊', label: 'Usage' },
  { to: '/admin/logs',       icon: '⚠', label: 'API Error Logs' },
  { to: '/admin/audit',      icon: '🔍', label: 'Audit Trail' },
  { to: '/admin/chat',       icon: '💬', label: 'Messages' },
  { to: '', href: import.meta.env.VITE_SWAGGER_URL as string || '/swagger', icon: '📖', label: 'Swagger API' },
]

const managerNav = (): NavItem[] => [
  { to: '/manager/dashboard', icon: '◉',  label: 'Dashboard' },
  { to: '/manager/users',     icon: '👤', label: 'Users' },
  { to: '/manager/sources',   icon: '🔌', label: 'Legacy Sources' },
  { to: '/manager/plans',     icon: '📋', label: 'Access Plans' },
  { to: '/manager/testbench', icon: '⚗',  label: 'Test Bench', color: 'orange' },
  { to: '/manager/call',      icon: '⚡', label: 'Call Legacy', color: 'blue' },
  { to: '/manager/chat',      icon: '💬', label: 'Messages' },
  { to: '/manager/usage',     icon: '📊', label: 'My Usage' },
  { to: '/manager/logs',      icon: '⚠', label: 'API Error Logs' },
]

const memberNav = (): NavItem[] => [
  { to: '/member/sources',    icon: '🔌', label: 'My Sources' },
  { to: '/member/plans',      icon: '📋', label: 'My Plans' },
  { to: '/member/call',       icon: '⚡', label: 'Call Legacy', color: 'green' },
  { to: '/member/chat',       icon: '💬', label: 'Messages' },
  { to: '/member/usage',      icon: '📊', label: 'My Usage' },
]

const viewerNav: NavItem[] = [
  { to: '/viewer/usage',      icon: '📊', label: 'My Usage' },
]

function chatRoute(role: string) {
  if (role === 'Admin')   return '/admin/chat'
  if (role === 'Manager') return '/manager/chat'
  if (role === 'Member')  return '/member/chat'
  return null
}

function navFor(role: string, unread: number): NavItem[] {
  const inject = (items: NavItem[]) =>
    items.map(i => i.icon === '💬' ? { ...i, badge: unread || undefined } : i)
  switch (role) {
    case 'Admin':   return inject(adminNav())
    case 'Manager': return inject(managerNav())
    case 'Member':  return inject(memberNav())
    default:        return viewerNav
  }
}

const avatarColor: Record<string, string> = {
  Admin: 'purple', Manager: 'blue', Member: 'green', Viewer: 'gray',
}


export default function Shell() {
  const { user, logout, isImpersonating, impersonatedEmail, exitImpersonation } = useAuth()
  const navigate = useNavigate()
  const [apiCallCount, setApiCallCount]       = useState<number | null>(null)
  const [apiCallDailyLimit, setApiCallDailyLimit] = useState<number | null>(null)
  const [customerName, setCustomerName]       = useState<string>('')
  const [unreadMessages, setUnreadMessages]   = useState(0)
  const unreadTimerRef                        = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!user) return
    usersApi.getById(user.userId)
      .then(u => { setApiCallCount(u.apiCallCount); setApiCallDailyLimit(u.apiCallDailyLimit) })
      .catch(() => {})
    customersApi.getById(user.customerId)
      .then(c => setCustomerName(c.name))
      .catch(() => {})
  }, [user])

  // Polling non-lus toutes les 15s pour le badge sidebar
  useEffect(() => {
    if (!user || !chatRoute(user.role)) return

    const poll = async () => {
      try {
        const contacts = await chatApi.getContacts()
        const total = (contacts ?? []).reduce((s, c) => s + c.unreadCount, 0)
        setUnreadMessages(total)
      } catch { /* ignore */ }
    }

    poll()
    unreadTimerRef.current = setInterval(poll, 15000)
    return () => { if (unreadTimerRef.current) clearInterval(unreadTimerRef.current) }
  }, [user])

  // Keep Render backend alive — ping prod once per day while tab is open
  useEffect(() => {
    const PROD_URL = (import.meta.env.VITE_API_URL as string | undefined)
      || 'https://legacybridge-backend-jtgq.onrender.com'
    const KEY      = 'lb_last_ping'
    const ONE_DAY  = 24 * 60 * 60 * 1000

    function ping() {
      const last = Number(localStorage.getItem(KEY) ?? 0)
      if (Date.now() - last < ONE_DAY) return
      const t = localStorage.getItem('lb_token')
      fetch(`${PROD_URL}/api-logs/keepalive`, {
        method: 'POST',
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      }).catch(() => {})
      localStorage.setItem(KEY, String(Date.now()))
    }

    ping()
    const timer = setInterval(ping, 60 * 60 * 1000) // re-check every hour
    return () => clearInterval(timer)
  }, [])

  // Auto-logout after 1 hour of inactivity
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    function reset() {
      clearTimeout(timer)
      timer = setTimeout(() => {
        logout()
        navigate('/login')
      }, INACTIVITY_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()

    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [logout, navigate])

  if (!user) return null

  const nav = navFor(user.role, unreadMessages)
  const initials = user.email.slice(0, 2).toUpperCase()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleExitImpersonation() {
    exitImpersonation()
    navigate('/admin/users')
  }

  return (
    <div className="app-shell-wrapper">
      {isImpersonating && (
        <div className="impersonation-banner">
          <div className="impersonation-banner-left">
            <span className="impersonation-icon">👤</span>
            <span>Acting as <strong>{impersonatedEmail}</strong></span>
            <span className={`pill ${user?.role === 'Manager' ? 'blue' : user?.role === 'Member' ? 'green' : 'gray'}`}>
              {user?.role}
            </span>
          </div>
          <button className="impersonation-exit-btn" onClick={handleExitImpersonation}>
            Exit Impersonation
          </button>
        </div>
      )}
      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-name">
            <span>⚡</span> Legacy<span className="accent">Bridge</span>
          </div>
          <div className="brand-sub">Legacy Integration Platform</div>
          <span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span>
        </div>

        <nav className="sidebar-nav">
          {nav.map((item, i) => (
            item.onClick
              ? <button key={i} className="nav-item" onClick={item.onClick} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              : item.href
              ? <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className="nav-item">
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </a>
              : <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `nav-item${isActive ? ' active' + (item.color ? ' ' + item.color : '') : ''}`
                  }
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.badge ? <span className="chat-badge nav-badge">{item.badge}</span> : null}
                </NavLink>
          ))}
        </nav>

        {/* Quota gauge */}
        {apiCallCount !== null && apiCallDailyLimit !== null && (() => {
          const pct     = Math.min((apiCallCount / apiCallDailyLimit) * 100, 100)
          const exceeded = apiCallCount > apiCallDailyLimit
          const warning  = !exceeded && pct >= 80
          const color    = exceeded ? 'var(--red)' : warning ? 'var(--orange)' : 'var(--green)'
          return (
            <div className="quota-gauge">
              {exceeded && (
                <div className="quota-alert">Daily quota exceeded</div>
              )}
              <div className="quota-labels">
                <span>{apiCallCount.toLocaleString()} calls</span>
                <span style={{ color: exceeded ? 'var(--red)' : 'var(--text-sub)' }}>
                  / {apiCallDailyLimit.toLocaleString()}
                </span>
              </div>
              <div className="quota-track">
                <div className="quota-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          )
        })()}

        <div className="sidebar-footer">
          <div className={`avatar ${avatarColor[user.role]}`}>{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div className="avatar-name">{customerName || user.role}</div>
            <div className="avatar-email" style={{ fontSize: 10 }}>{user.email}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
    </div>
  )
}
