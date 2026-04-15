import { useEffect, useState } from 'react'
import { plansApi } from '../../api/plans'
import { usersApi } from '../../api/users'
import { customersApi } from '../../api/customers'
import type { AccessPlan, AccessPlanSummary, Customer, UserDto } from '../../api/types'

export default function AdminPlans() {
  const [plans, setPlans]         = useState<AccessPlanSummary[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers]         = useState<UserDto[]>([])
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState<'create' | 'edit' | 'detail' | null>(null)
  const [editing, setEditing]     = useState<AccessPlanSummary | null>(null)
  const [detail, setDetail]       = useState<AccessPlan | null>(null)
  const [form, setForm]           = useState({ name: '', description: '', customerId: '', isActive: true })
  const [ruleForm, setRuleForm]   = useState({ methodPattern: '', effect: 1 })
  const [assignId, setAssignId]   = useState('')
  const [err, setErr]             = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function load() {
    plansApi.getAll().then(setPlans).catch(() => {})
  }
  useEffect(() => {
    load()
    customersApi.getAll().then(setCustomers).catch(() => {})
    usersApi.getAll().then(setUsers).catch(() => {})
  }, [])

  const filtered = plans.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setForm({ name: '', description: '', customerId: customers[0]?.id ?? '', isActive: true })
    setEditing(null); setErr(''); setModal('create')
  }
  function openEdit(p: AccessPlanSummary) {
    setForm({ name: p.name, description: p.description ?? '', customerId: p.customerId, isActive: p.isActive })
    setEditing(p); setErr(''); setModal('edit')
  }
  async function openDetail(p: AccessPlanSummary) {
    setEditing(p); setErr('')
    const full = await plansApi.getById(p.id)
    setDetail(full)
    setModal('detail')
  }

  async function handleSave() {
    setErr('')
    try {
      if (modal === 'create') {
        await plansApi.create({ ...form })
      } else if (editing) {
        await plansApi.update(editing.id, { name: form.name, description: form.description, isActive: form.isActive })
      }
      setModal(null); load()
    } catch { setErr('Save failed.') }
  }

  async function handleDelete(id: string) {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    setConfirmDelete(null)
    try { await plansApi.delete(id); load() } catch { setErr('Delete failed.') }
  }

  async function handleAddRule() {
    if (!editing) return
    try {
      await plansApi.addRule(editing.id, { methodPattern: ruleForm.methodPattern, effect: ruleForm.effect })
      const full = await plansApi.getById(editing.id)
      setDetail(full)
      setRuleForm({ methodPattern: '', effect: 1 })
    } catch { setErr('Rule add failed.') }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!editing) return
    try {
      await plansApi.deleteRule(editing.id, ruleId)
      const full = await plansApi.getById(editing.id)
      setDetail(full)
    } catch { alert('Delete rule failed.') }
  }

  async function handleAssign() {
    if (!editing || !assignId) return
    try {
      await plansApi.assignUser(editing.id, assignId)
      setAssignId('')
    } catch { setErr('Assign failed.') }
  }

  const custName = (id: string) => customers.find(c => c.id === id)?.name ?? id.slice(0, 8)

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>Access Plans</h1><p>Define and assign method-level access policies</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Plan</button>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Name</th><th>Customer</th><th>Rules</th><th>Status</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="sub">{custName(p.customerId)}</td>
                <td className="sub">{p.ruleCount}</td>
                <td><span className={`pill ${p.isActive ? 'green' : 'gray'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="sub">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openDetail(p)}>Rules</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    {confirmDelete === p.id
                      ? <><span style={{fontSize:11,color:'var(--red)',marginRight:4}}>Sure?</span>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Yes</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(null)}>No</button></>
                      : <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Del</button>
                    }
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6}><div className="empty"><div className="icon">📋</div>No plans found</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{modal === 'create' ? 'New Access Plan' : 'Edit Plan'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {err && <div className="err-toast">{err}</div>}
              <div className="form-field">
                <label>Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-field">
                <label>Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              {modal === 'create' && (
                <div className="form-field">
                  <label>Customer</label>
                  <select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-field">
                <label>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ marginRight: 6 }} />
                  Active
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'detail' && detail && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Plan: {detail.name}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {err && <div className="err-toast">{err}</div>}

              <div className="card-head" style={{ padding: '8px 0', marginBottom: 8 }}>
                <h2 style={{ fontSize: 12 }}>Rules</h2>
              </div>
              <div className="rules-list" style={{ padding: 0, marginBottom: 16 }}>
                {detail.rules.map(r => (
                  <div key={r.id} className="rule-row">
                    <span className={`rule-effect ${r.effect === 'Allow' ? 'allow' : 'deny'}`}>{r.effect}</span>
                    <span className="rule-pattern">{r.methodPattern}</span>
                    <button className="btn btn-danger btn-xs" onClick={() => handleDeleteRule(r.id)}>×</button>
                  </div>
                ))}
                {detail.rules.length === 0 && <div className="sub" style={{ fontSize: 12 }}>No rules yet</div>}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 20 }}>
                <div className="form-field" style={{ flex: 2, marginBottom: 0 }}>
                  <label>Method Pattern</label>
                  <input value={ruleForm.methodPattern} onChange={e => setRuleForm(f => ({ ...f, methodPattern: e.target.value }))} placeholder="e.g. GetCustomer*" />
                </div>
                <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Effect</label>
                  <select value={ruleForm.effect} onChange={e => setRuleForm(f => ({ ...f, effect: +e.target.value }))}>
                    <option value={1}>Allow</option>
                    <option value={2}>Deny</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAddRule}>Add</button>
              </div>

              <div className="card-head" style={{ padding: '8px 0', marginBottom: 8 }}>
                <h2 style={{ fontSize: 12 }}>Assign User</h2>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>User</label>
                  <select value={assignId} onChange={e => setAssignId(e.target.value)}>
                    <option value="">— select —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAssign}>Assign</button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
