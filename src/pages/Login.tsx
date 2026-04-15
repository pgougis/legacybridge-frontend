import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, homeFor } from '../ctx/auth'
import { extractClaims } from '../api/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // auth context updated — read role from ctx
      const stored = localStorage.getItem('lb_token')
      if (stored) {
        const c = extractClaims(stored)
        navigate(homeFor(c.role as never))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'EMAIL_NOT_CONFIRMED') {
        setError('Please confirm your email address before signing in. Check your inbox.')
      } else {
        setError('Invalid email or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">⚡ LegacyBridge</div>
        <div className="login-sub">Sign in to your account</div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
