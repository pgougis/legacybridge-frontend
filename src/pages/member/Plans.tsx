import { useEffect, useState } from 'react'
import { plansApi } from '../../api/plans'
import { usersApi } from '../../api/users'
import { useAuth } from '../../ctx/auth'
import type { AccessPlan, AccessPlanSummary } from '../../api/types'

export default function MemberPlans() {
  const { user } = useAuth()
  const [plans, setPlans]   = useState<AccessPlanSummary[]>([])
  const [modal, setModal]   = useState(false)
  const [detail, setDetail] = useState<AccessPlan | null>(null)

  useEffect(() => {
    if (user) {
      usersApi.getPlans(user.userId).then(p => setPlans(p as AccessPlanSummary[])).catch(() => {})
    }
  }, [user])

  async function openDetail(p: AccessPlanSummary) {
    const full = await plansApi.getById(p.id)
    setDetail(full); setModal(true)
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>My Plans</h1><p>Access plans assigned to you</p></div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Plan Name</th><th>Rules</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="sub">{p.ruleCount}</td>
                <td><span className={`pill ${p.isActive ? 'green' : 'gray'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                <td><button className="btn btn-outline btn-sm" onClick={() => openDetail(p)}>View Rules</button></td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr><td colSpan={4}><div className="empty"><div className="icon">📋</div>No plans assigned</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && detail && (
        <div className="modal-backdrop" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{detail.name}</h2>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="rules-list" style={{ padding: 0 }}>
                {detail.rules.map(r => (
                  <div key={r.id} className="rule-row">
                    <span className={`rule-effect ${r.effect === 'Allow' ? 'allow' : 'deny'}`}>{r.effect}</span>
                    <span className="rule-pattern">{r.methodPattern}</span>
                  </div>
                ))}
                {detail.rules.length === 0 && <div className="sub" style={{ fontSize: 12 }}>No rules defined</div>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
