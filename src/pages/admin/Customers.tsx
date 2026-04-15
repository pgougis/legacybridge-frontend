import { useEffect, useState } from 'react'
import { customersApi } from '../../api/customers'
import type { Customer } from '../../api/types'

export default function AdminCustomers() {
  const [rows, setRows]     = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm]     = useState({ name: '', email: '' })
  const [err, setErr]       = useState('')

  function load() {
    customersApi.getAll().then(setRows).catch(() => {})
  }
  useEffect(load, [])

  const filtered = rows.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setForm({ name: '', email: '' })
    setEditing(null)
    setErr('')
    setModal('create')
  }

  function openEdit(c: Customer) {
    setForm({ name: c.name, email: c.email })
    setEditing(c)
    setErr('')
    setModal('edit')
  }

  async function handleSave() {
    setErr('')
    try {
      if (modal === 'create') {
        await customersApi.create(form)
      } else if (editing) {
        await customersApi.update(editing.id, form)
      }
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
        <button className="btn btn-primary" onClick={openCreate}>+ New Customer</button>
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

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{modal === 'create' ? 'New Customer' : 'Edit Customer'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {err && <div className="err-toast">{err}</div>}
              <div className="form-field">
                <label>Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
