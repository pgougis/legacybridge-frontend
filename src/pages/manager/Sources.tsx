import { useEffect, useState } from 'react'
import { sourcesApi, systemTypeLabels } from '../../api/sources'
import type { SourceAssignedUser } from '../../api/sources'
import { useAuth } from '../../ctx/auth'
import { api } from '../../api/client'
import type { LegacySource } from '../../api/types'
export default function ManagerSources() {
  const { user } = useAuth()
  const [rows, setRows]         = useState<LegacySource[]>([])
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState<'create' | 'edit' | 'auth' | 'users' | null>(null)
  const [assignedUsers, setAssignedUsers] = useState<SourceAssignedUser[]>([])
  const [editing, setEditing]   = useState<LegacySource | null>(null)
  const [form, setForm]         = useState({ systemType: 1, systemUrl: '' })
  const [authForm, setAuthForm] = useState({ authType: 'Basic', username: '', password: '' })
  const [err, setErr]           = useState('')
  const [ipModal, setIpModal]   = useState(false)
  const [outboundIp, setOutboundIp] = useState<string | null>(null)

  async function showIp() {
    setIpModal(true)
    if (!outboundIp) {
      const res = await api.get<{ ip: string }>('/system/outbound-ip')
      setOutboundIp(res.ip)
    }
  }

  function load() { sourcesApi.getAll().then(setRows).catch(() => {}) }
  useEffect(load, [])

  const filtered = rows.filter(r =>
    r.systemUrl.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setForm({ systemType: 1, systemUrl: '' }); setEditing(null); setErr(''); setModal('create')
  }
  function openEdit(s: LegacySource) {
    setForm({ systemType: s.systemType as unknown as number, systemUrl: s.systemUrl })
    setEditing(s); setErr(''); setModal('edit')
  }
  function openAuth(s: LegacySource) {
    setEditing(s); setAuthForm({ authType: 'Basic', username: '', password: '' }); setErr(''); setModal('auth')
  }

  async function handleSave() {
    setErr('')
    try {
      if (modal === 'create') {
        await sourcesApi.create({ ...form, customerId: user!.customerId })
      } else if (editing) {
        await sourcesApi.update(editing.id, { systemType: form.systemType, systemUrl: form.systemUrl })
      }
      setModal(null); load()
    } catch { setErr('Save failed.') }
  }

  async function handleAuth() {
    if (!editing) return
    try { await sourcesApi.upsertAuth(editing.id, authForm); setModal(null) }
    catch { setErr('Auth save failed.') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this source?')) return
    try { await sourcesApi.delete(id); load() } catch { alert('Delete failed.') }
  }

  async function openUsers(s: LegacySource) {
    setEditing(s)
    const users = await sourcesApi.getAssignedUsers(s.id).catch(() => [])
    setAssignedUsers(users)
    setModal('users')
  }

  function openSwagger(id: string) {
    const token = localStorage.getItem('lb_token') ?? ''
    const apiBase = import.meta.env.VITE_API_URL || ''
    const url = encodeURIComponent(`${apiBase}/legacy/discovery/${id}/swagger.json`)
    window.open(`/lb-explorer.html?url=${url}&token=${encodeURIComponent(token)}`, '_blank')
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>Legacy Sources</h1><p>Your registered legacy systems</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={showIp}>🌐 Firewall IP</button>
          <button className="btn btn-primary" onClick={openCreate}>+ New Source</button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <input placeholder="Search URL…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead>
            <tr><th>URL</th><th>Type</th><th>Auth</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.systemUrl}</td>
                <td><span className="pill gray">{systemTypeLabels[s.systemType as unknown as number] ?? s.systemType}</span></td>
                <td>{s.authConfig ? <span className="pill green">Configured</span> : <span className="pill gray">None</span>}</td>
                <td className="sub">{new Date(s.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openUsers(s)}>👤 Users</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openSwagger(s.id)}>Swagger</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--blue)' }} onClick={() => openAuth(s)}>Auth</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5}><div className="empty"><div className="icon">🔌</div>No sources found</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{modal === 'create' ? 'New Legacy Source' : 'Edit Source'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {err && <div className="err-toast">{err}</div>}
              <div className="form-field">
                <label>System URL</label>
                <input value={form.systemUrl} onChange={e => setForm(f => ({ ...f, systemUrl: e.target.value }))} placeholder="http://legacy-host/service" />
              </div>
              <div className="form-field">
                <label>System Type</label>
                <select value={form.systemType} onChange={e => setForm(f => ({ ...f, systemType: +e.target.value }))}>
                  {Object.entries(systemTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'users' && editing && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Users with access</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="sub" style={{ fontSize: 11, marginBottom: 12 }}>{editing.systemUrl}</div>
              {assignedUsers.length === 0
                ? <div className="empty"><div className="icon">👤</div>No users have access to this source yet</div>
                : <table>
                    <thead>
                      <tr><th>User</th><th>Email</th><th>Via Plan</th></tr>
                    </thead>
                    <tbody>
                      {assignedUsers.map(u => (
                        <tr key={`${u.userId}-${u.planId}`}>
                          <td>{u.firstName} {u.lastName}</td>
                          <td className="sub">{u.email}</td>
                          <td><span className="pill blue">{u.planName}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'auth' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Auth Configuration</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {err && <div className="err-toast">{err}</div>}
              <div className="form-field">
                <label>Auth Type</label>
                <select value={authForm.authType} onChange={e => setAuthForm(f => ({ ...f, authType: e.target.value }))}>
                  <option value="Basic">Basic</option>
                  <option value="Header">Header</option>
                </select>
              </div>
              <div className="form-row2">
                <div className="form-field">
                  <label>Username</label>
                  <input value={authForm.username} onChange={e => setAuthForm(f => ({ ...f, username: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Password</label>
                  <input type="password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAuth}>Save Auth</button>
            </div>
          </div>
        </div>
      )}
      {ipModal && (
        <div className="modal-backdrop" onClick={() => setIpModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <h2>🌐 Outbound IP — Firewall Whitelist</h2>
              <button className="modal-close" onClick={() => setIpModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 16 }}>
                Add this IP address to your client's firewall to allow LegacyBridge to reach the legacy system.
              </p>
              {outboundIp ? (
                <div style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderLeft: '4px solid var(--accent)',
                  padding: '14px 18px', fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 18, fontWeight: 700, letterSpacing: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <span>{outboundIp}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => navigator.clipboard.writeText(outboundIp)}>
                    Copy
                  </button>
                </div>
              ) : (
                <div className="spinner">Fetching IP…</div>
              )}
              <p style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 12 }}>
                ⚠ This IP may change on Render free tier restarts. Contact support for a static IP option.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

