import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../api/client'

export default function ResetPassword() {
  const [params]                    = useSearchParams()
  const navigate                    = useNavigate()
  const token                       = params.get('token') ?? ''
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [done, setDone]             = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Minimum 8 characters.'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch {
      setError('Invalid or expired link. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">⚡ Legacy<span className="accent">Bridge</span></div>
        <p style={{ color: 'var(--text-2)', textAlign: 'center' }}>Invalid link.</p>
        <div style={{ textAlign: 'center' }}><Link to="/login">Back to sign in</Link></div>
      </div>
    </div>
  )

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">⚡ Legacy<span className="accent">Bridge</span></div>
        <div className="login-sub">Set a new password</div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Password updated. Redirecting…</p>
          </div>
        ) : (
          <>
            {error && <div className="login-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label>New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label>Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
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
                {loading ? 'Saving…' : 'Save password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
