import { useEffect, useState } from 'react'
import { usersApi, roleNum } from '../../api/users'
import { customersApi } from '../../api/customers'
import type { UserDto, UserRole, Customer } from '../../api/types'
import Usage from '../shared/Usage'

const ROLES: UserRole[] = ['Admin', 'Manager', 'Member', 'Viewer']

const roleClass: Record<UserRole, string> = {
  Admin: 'purple', Manager: 'blue', Member: 'green', Viewer: 'gray',
}

export default function AdminUsers() {
  const [rows, setRows]           = useState<UserDto[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState<'create' | 'edit' | 'pwd' | 'usage' | null>(null)
  const [editing, setEditing]     = useState<UserDto | null>(null)
  const [form, setForm]           = useState({
    email: '', password: '', firstName: '', lastName: '',
    role: 'Member' as UserRole, customerId: '', dailyLimit: '',
  })
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')

  function load() { usersApi.getAll().then(setRows).catch(() => {}) }
  useEffect(() => {
    load()
    customersApi.getAll().then(setCustomers).catch(() => {})
  }, [])

  const filtered = rows.filter(r =>
    `${r.firstName} ${r.lastName} ${r.email}`.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setForm({ email: '', password: '', firstName: '', lastName: '', role: 'Member', customerId: customers[0]?.id ?? '', dailyLimit: '' })
    setEditing(null); setErr(''); setModal('create')
  }
  function openEdit(u: UserDto) {
    setForm({
      email: u.email, password: '', firstName: u.firstName, lastName: u.lastName,
      role: u.role, customerId: u.customerId,
      dailyLimit: u.apiCallDailyLimit != null ? String(u.apiCallDailyLimit) : '',
    })
    setEditing(u); setErr(''); setModal('edit')
  }

  async function handleSave() {
    setErr('')
    const limit = form.dailyLimit !== '' ? parseInt(form.dailyLimit, 10) : undefined
    try {
      if (modal === 'create') {
        await usersApi.create({ ...form, role: roleNum(form.role), password: form.password })
      } else if (editing) {
        await usersApi.update(editing.id, {
          email: form.email, firstName: form.firstName,
          lastName: form.lastName, role: roleNum(form.role),
          apiCallDailyLimit: isNaN(limit as number) ? undefined : limit,
        })
      }
      setModal(null); load()
    } catch { setErr('Save failed.') }
  }

  async function handlePwd() {
    if (!editing) return
    try { await usersApi.changePassword(editing.id, pwd); setModal(null) }
    catch { setErr('Password change failed.') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user?')) return
    try { await usersApi.delete(id); load() } catch { alert('Delete failed.') }
  }

  const custName = (id: string) => customers.find(c => c.id === id)?.name ?? id.slice(0, 8)

  function limitBadge(u: UserDto) {
    if (u.apiCallDailyLimit == null) return <span className="pill gray">Unlimited</span>
    return <span className="pill orange">{u.apiCallDailyLimit.toLocaleString()} / day</span>
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>Users</h1><p>All platform users</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ New User</button>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Customer</th><th>API Calls</th><th>Daily Limit</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>{u.firstName} {u.lastName}</td>
                <td className="sub">{u.email}</td>
                <td><span className={`pill ${roleClass[u.role]}`}>{u.role}</span></td>
                <td className="sub">{custName(u.customerId)}</td>
                <td><span className="pill purple">{u.apiCallCount.toLocaleString()}</span></td>
                <td>{limitBadge(u)}</td>
                <td className="sub">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)}>Edit</button>
                    <button className="btn btn-outline btn-sm" onClick={() => { setEditing(u); setPwd(''); setErr(''); setModal('pwd') }}>Pwd</button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--purple)' }} onClick={() => { setEditing(u); setModal('usage') }}>📊</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8}><div className="empty"><div className="icon">👤</div>No users found</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{modal === 'create' ? 'New User' : 'Edit User'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {err && <div className="err-toast">{err}</div>}
              <div className="form-row2">
                <div className="form-field">
                  <label>First Name</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Last Name</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              {modal === 'create' && (
                <div className="form-field">
                  <label>Password</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              )}
              <div className="form-row2">
                <div className="form-field">
                  <label>Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
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
              {modal === 'edit' && (
                <div className="form-field">
                  <label>Daily API Call Limit (blank = unlimited)</label>
                  <input
                    type="number" min="0" placeholder="e.g. 1000"
                    value={form.dailyLimit}
                    onChange={e => setForm(f => ({ ...f, dailyLimit: e.target.value }))}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'pwd' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Change Password</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {err && <div className="err-toast">{err}</div>}
              <div className="form-field">
                <label>New Password</label>
                <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePwd}>Update</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'usage' && editing && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal usage-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Usage — {editing.firstName} {editing.lastName}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <Usage userId={editing.id} compact />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
