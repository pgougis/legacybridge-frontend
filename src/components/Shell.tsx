import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../ctx/auth'
import { usersApi } from '../api/users'

interface NavItem { to: string; icon: string; label: string; color?: string }

const adminNav: NavItem[] = [
  { to: '/admin/dashboard', icon: '◉', label: 'Dashboard' },
  { to: '/admin/customers', icon: '🏢', label: 'Customers' },
  { to: '/admin/users',     icon: '👤', label: 'Users' },
  { to: '/admin/sources',   icon: '🔌', label: 'Legacy Sources' },
  { to: '/admin/plans',     icon: '📋', label: 'Access Plans' },
  { to: '/admin/usage',     icon: '📊', label: 'My Usage' },
]

const managerNav: NavItem[] = [
  { to: '/manager/dashboard', icon: '◉', label: 'Dashboard' },
  { to: '/manager/users',     icon: '👤', label: 'Users' },
  { to: '/manager/sources',   icon: '🔌', label: 'Legacy Sources' },
  { to: '/manager/plans',     icon: '📋', label: 'Access Plans' },
  { to: '/manager/call',      icon: '⚡', label: 'Call Legacy', color: 'blue' },
  { to: '/manager/usage',     icon: '📊', label: 'My Usage' },
]

const memberNav: NavItem[] = [
  { to: '/member/sources',    icon: '🔌', label: 'My Sources' },
  { to: '/member/plans',      icon: '📋', label: 'My Plans' },
  { to: '/member/call',       icon: '⚡', label: 'Call Legacy', color: 'green' },
  { to: '/member/usage',      icon: '📊', label: 'My Usage' },
]

const viewerNav: NavItem[] = [
  { to: '/viewer/usage',      icon: '📊', label: 'My Usage' },
]

function navFor(role: string): NavItem[] {
  switch (role) {
    case 'Admin':   return adminNav
    case 'Manager': return managerNav
    case 'Member':  return memberNav
    default:        return viewerNav
  }
}

const avatarColor: Record<string, string> = {
  Admin: 'purple', Manager: 'blue', Member: 'green', Viewer: 'gray',
}

export default function Shell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [apiCallCount, setApiCallCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    usersApi.getById(user.userId)
      .then(u => setApiCallCount(u.apiCallCount))
      .catch(() => {})
  }, [user])

  if (!user) return null

  const nav = navFor(user.role)
  const initials = user.userId.slice(0, 2).toUpperCase()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-name">
            <span>⚡</span> LegacyBridge
          </div>
          <div className="brand-sub">Legacy Integration Platform</div>
          <span className={`role-badge ${user.role.toLowerCase()}`}>{user.role}</span>
        </div>

        <nav className="sidebar-nav">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item${isActive ? ' active' + (item.color ? ' ' + item.color : '') : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {user.role === 'Admin' && (
          <a
            href={import.meta.env.VITE_SWAGGER_URL ?? '/swagger'}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item"
            style={{ marginTop: 'auto', opacity: 0.75, fontSize: 12 }}
          >
            <span className="nav-icon">📖</span>
            API Swagger
          </a>
        )}

        <div className="sidebar-footer">
          <div className={`avatar ${avatarColor[user.role]}`}>{initials}</div>
          <div>
            <div className="avatar-name">{user.role}</div>
            <div className="avatar-email">{user.userId.slice(0, 8)}…</div>
            {apiCallCount !== null && (
              <div style={{ fontSize: 10, color: 'var(--text-sub)', marginTop: 2 }}>
                {apiCallCount.toLocaleString()} API calls
              </div>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
