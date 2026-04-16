import { useEffect, useState } from 'react'
import { customersApi } from '../../api/customers'
import type { Customer } from '../../api/types'

export default function AdminCustomers() {
  const [rows, setRows]     = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState<'register' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '' })
  const [regForm, setRegForm] = useState({
    companyName: '', managerEmail: '', managerFirstName: '',
    managerLastName: '', managerPassword: '', planName: 'Default Plan',
  })
  const [err, setErr]       = useState('')

  function load() {
    customersApi.getAll().then(setRows).catch(() => {})
  }
  useEffect(load, [])

  const filtered = rows.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  )

  function openRegister() {
    setRegForm({ companyName: '', managerEmail: '', managerFirstName: '', managerLastName: '', managerPassword: '', planName: 'Default Plan' })
    setEditing(null)
    setErr('')
    setModal('register')
  }

  function openEdit(c: Customer) {
    setEditForm({ name: c.name, email: c.email })
    setEditing(c)
    setErr('')
    setModal('edit')
  }

  async function handleRegister() {
    setErr('')
    try {
      await customersApi.register(regForm)
      setModal(null)
      load()
    } catch (e: unknown) {
      try { setErr(JSON.parse((e as Error).message)?.detail || 'Registration failed.') }
      catch { setErr('Registration failed.') }
    }
  }

  async function handleEdit() {
    if (!editing) return
    setErr('')
    try {
      await customersApi.update(editing.id, editForm)
      setModal(null)
      load()
    } catch {
      setErr('Save failed.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this customer?')) return
    try {
      await customersApi.delete(id)
      load()
    } catch { alert('Delete failed.') }
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>Customers</h1><p>Manage tenants</p></div>
        <button className="btn btn-primary" onClick={openRegister}>+ Register Customer</button>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="sub">{c.email}</td>
                <td className="sub">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4}><div className="empty"><div className="icon">🏢</div>No customers found</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Register Customer modal */}
      {modal === 'register' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Register Customer</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {err && <div className="err-toast">{err}</div>}
              <div className="form-field">
                <label>Company Name</label>
                <input value={regForm.companyName} onChange={e => setRegForm(f => ({ ...f, companyName: e.target.value }))} />
              </div>
              <div className="form-row2">
                <div className="form-field">
                  <label>Manager First Name</label>
                  <input value={regForm.managerFirstName} onChange={e => setRegForm(f => ({ ...f, managerFirstName: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label>Manager Last Name</label>
                  <input value={regForm.managerLastName} onChange={e => setRegForm(f => ({ ...f, managerLastName: e.target.value }))} />
                </div>
              </div>
              <div className="form-field">
                <label>Manager Email</label>
                <input type="email" value={regForm.managerEmail} onChange={e => setRegForm(f => ({ ...f, managerEmail: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Manager Password</label>
                <input type="password" value={regForm.managerPassword} onChange={e => setRegForm(f => ({ ...f, managerPassword: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Default Plan Name</label>
                <input value={regForm.planName} onChange={e => setRegForm(f => ({ ...f, planName: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRegister}>Register</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer modal */}
      {modal === 'edit' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Edit Customer</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {err && <div className="err-toast">{err}</div>}
              <div className="form-field">
                <label>Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
