import { useEffect, useState } from 'react'
import { plansApi } from '../../api/plans'
import type { PlanAssignedUser } from '../../api/plans'
import { usersApi } from '../../api/users'
import { useAuth } from '../../ctx/auth'
import type { AccessPlan, AccessPlanSummary, UserDto } from '../../api/types'

export default function AdminPlans() {
  const { user: me } = useAuth()
  const [plans, setPlans]   = useState<AccessPlanSummary[]>([])
  const [users, setUsers]   = useState<UserDto[]>([])
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState<'create' | 'edit' | 'detail' | null>(null)
  const [editing, setEditing] = useState<AccessPlanSummary | null>(null)
  const [detail, setDetail]   = useState<AccessPlan | null>(null)
  const [assignedUsers, setAssignedUsers] = useState<PlanAssignedUser[]>([])
  const [form, setForm]       = useState({ name: '', description: '', isActive: true })
  const [ruleForm, setRuleForm] = useState({ methodPattern: '', effect: 'Allow' })
  const [assignId, setAssignId] = useState('')
  const [err, setErr]           = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const myCustomerId = me?.customerId ?? ''

  function load() {
    // Fetch all plans then keep only those belonging to the admin's own customer
    plansApi.getAll()
      .then(all => setPlans(all.filter(p => p.customerId === myCustomerId)))
      .catch(() => {})
  }

  useEffect(() => {
    if (!myCustomerId) return
    load()
    // Only users of the same customer
    usersApi.getAll()
      .then(all => setUsers(all.filter(u => u.customerId === myCustomerId)))
      .catch(() => {})
  }, [myCustomerId])

  const filtered = plans.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setForm({ name: '', description: '', isActive: true })
    setEditing(null); setErr(''); setModal('create')
  }
  function openEdit(p: AccessPlanSummary) {
    setForm({ name: p.name, description: p.description ?? '', isActive: p.isActive })
    setEditing(p); setErr(''); setModal('edit')
  }
  async function openDetail(p: AccessPlanSummary) {
    setEditing(p); setErr('')
    const [full, assigned] = await Promise.all([
      plansApi.getById(p.id),
      plansApi.getPlanUsers(p.id),
    ])
    setDetail(full); setAssignedUsers(assigned); setModal('detail')
  }

  async function refreshDetail(planId: string) {
    const [full, assigned] = await Promise.all([
      plansApi.getById(planId),
      plansApi.getPlanUsers(planId),
    ])
    setDetail(full); setAssignedUsers(assigned)
  }

  async function handleSave() {
    setErr('')
    try {
      if (modal === 'create') {
        await plansApi.create({ ...form, customerId: myCustomerId })
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
      await refreshDetail(editing.id)
      setRuleForm({ methodPattern: '', effect: 'Allow' })
    } catch (e: unknown) { setErr((e as Error)?.message || 'Rule add failed.') }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!editing) return
    try {
      await plansApi.deleteRule(editing.id, ruleId)
      await refreshDetail(editing.id)
    } catch { setErr('Delete rule failed.') }
  }

  async function handleAssign() {
    if (!editing || !assignId) return
    try {
      await plansApi.assignUser(editing.id, assignId)
      await refreshDetail(editing.id)
      setAssignId('')
    } catch (e: unknown) {
      try { setErr(JSON.parse((e as Error).message)?.detail || 'Assign failed.') }
      catch { setErr('Assign failed.') }
    }
  }

  async function handleRevoke(userId: string) {
    if (!editing) return
    try {
      await plansApi.revokeUser(editing.id, userId)
      await refreshDetail(editing.id)
    } catch { setErr('Revoke failed.') }
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>Access Plans</h1><p>Method-level access policies for your organization</p></div>
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
            <tr><th>Name</th><th>Rules</th><th>Status</th><th>Created</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="sub">{p.ruleCount}</td>
                <td><span className={`pill ${p.isActive ? 'green' : 'gray'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="sub">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openDetail(p)}>Rules</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    {confirmDelete === p.id
                      ? <><span style={{ fontSize: 11, color: 'var(--red)', marginRight: 4 }}>Sure?</span>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Yes</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(null)}>No</button></>
                      : <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Del</button>
                    }
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5}><div className="empty"><div className="icon">📋</div>No plans found</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
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

      {/* Detail / Rules modal */}
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
                  <select value={ruleForm.effect} onChange={e => setRuleForm(f => ({ ...f, effect: e.target.value }))}>
                    <option value="Allow">Allow</option>
                    <option value="Deny">Deny</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAddRule}>Add</button>
              </div>

              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-sub)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Assigned Users
              </div>
              {assignedUsers.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {assignedUsers.map(u => (
                    <div key={u.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</span>
                        <span className="sub" style={{ marginLeft: 8, fontSize: 11 }}>{u.email}</span>
                      </div>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleRevoke(u.userId)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
              {assignedUsers.length === 0 && (
                <div className="sub" style={{ fontSize: 12, marginBottom: 10 }}>No users assigned yet</div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Add a user</label>
                  <select value={assignId} onChange={e => setAssignId(e.target.value)}>
                    <option value="">— select —</option>
                    {users
                      .filter(u => u.ownerManagerId === null && u.role !== 'Manager' && !assignedUsers.some(a => a.userId === u.id))
                      .map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>)}
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAssign} disabled={!assignId}>Assign</button>
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
