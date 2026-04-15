import { useEffect, useState } from 'react'
import { sourcesApi, systemTypeLabels } from '../../api/sources'
import { customersApi } from '../../api/customers'
import type { LegacySource, Customer } from '../../api/types'

export default function AdminSources() {
  const [rows, setRows]           = useState<LegacySource[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState<'create' | 'edit' | 'auth' | null>(null)
  const [editing, setEditing]     = useState<LegacySource | null>(null)
  const [form, setForm]           = useState({ systemType: 1, systemUrl: '', customerId: '' })
  const [authForm, setAuthForm]   = useState({ authType: 'Basic', username: '', password: '' })
  const [err, setErr]             = useState('')

  function load() {
    sourcesApi.getAll().then(setRows).catch(() => {})
  }
  useEffect(() => {
    load()
    customersApi.getAll().then(setCustomers).catch(() => {})
  }, [])

  const filtered = rows.filter(r =>
    r.systemUrl.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setForm({ systemType: 1, systemUrl: '', customerId: customers[0]?.id ?? '' })
    setEditing(null); setErr(''); setModal('create')
  }
  function openEdit(s: LegacySource) {
    setForm({ systemType: s.systemType as unknown as number, systemUrl: s.systemUrl, customerId: s.customerId })
    setEditing(s); setErr(''); setModal('edit')
  }
  function openAuth(s: LegacySource) {
    setEditing(s)
    setAuthForm({ authType: 'Basic', username: '', password: '' })
    setErr(''); setModal('auth')
  }

  async function handleSave() {
    setErr('')
    try {
      if (modal === 'create') {
        await sourcesApi.create({ ...form })
      } else if (editing) {
        await sourcesApi.update(editing.id, { systemType: form.systemType, systemUrl: form.systemUrl })
      }
      setModal(null); load()
    } catch { setErr('Save failed.') }
  }

  async function handleAuth() {
    if (!editing) return
    try {
      await sourcesApi.upsertAuth(editing.id, authForm)
      setModal(null)
    } catch { setErr('Auth save failed.') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this source?')) return
    try { await sourcesApi.delete(id); load() } catch { alert('Delete failed.') }
  }

  function openSwagger(id: string) {
    const token = localStorage.getItem('lb_token') ?? ''
    const url = encodeURIComponent(`/legacy/discovery/${id}/swagger.json`)
    window.open(`/swagger-viewer.html?url=${url}&token=${encodeURIComponent(token)}`, '_blank')
  }

  const custName = (id: string) => customers.find(c => c.id === id)?.name ?? id.slice(0, 8)

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>Legacy Sources</h1><p>All registered legacy systems</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Source</button>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <input placeholder="Search URL…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead>
            <tr><th>URL</th><th>Type</th><th>Customer</th><th>Auth</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.systemUrl}</td>
                <td><span className="pill gray">{systemTypeLabels[s.systemType as unknown as number] ?? s.systemType}</span></td>
                <td className="sub">{custName(s.customerId)}</td>
                <td>{s.authConfig ? <span className="pill green">Configured</span> : <span className="pill gray">None</span>}</td>
                <td className="sub">{new Date(s.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openSwagger(s.id)}>Swagger</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-blue btn-sm" style={{ background: 'var(--blue-lt)', color: 'var(--blue)' }} onClick={() => openAuth(s)}>Auth</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><div className="icon">🔌</div>No sources found</div></td></tr>
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
              <div className="form-row2">
                <div className="form-field">
                  <label>System Type</label>
                  <select value={form.systemType} onChange={e => setForm(f => ({ ...f, systemType: +e.target.value }))}>
                    {Object.entries(systemTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {modal === 'create' && (
                  <div className="form-field">
                    <label>Customer</label>
                    <select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
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
    </div>
  )
}
