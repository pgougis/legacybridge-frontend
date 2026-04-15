import { useEffect, useState } from 'react'
import { usersApi } from '../../api/users'
import { sourcesApi } from '../../api/sources'
import { plansApi } from '../../api/plans'

export default function ManagerDashboard() {
  const [counts, setCounts] = useState({ users: 0, sources: 0, plans: 0 })

  useEffect(() => {
    Promise.all([
      usersApi.getAll(),
      sourcesApi.getAll(),
      plansApi.getAll(),
    ]).then(([u, s, p]) => {
      setCounts({ users: u.length, sources: s.length, plans: p.length })
    }).catch(() => {})
  }, [])

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Manager Dashboard</h1>
          <p>Your resources at a glance</p>
        </div>
      </div>

      <div className="notice">
        <span>ℹ️</span>
        <span>You manage your own users, sources and access plans. Resources created by other managers or administrators are not visible here.</span>
      </div>

      <div className="stats">
        <div className="stat blue">
          <div className="val">{counts.users}</div>
          <div className="lbl">My Users</div>
        </div>
        <div className="stat green">
          <div className="val">{counts.sources}</div>
          <div className="lbl">My Sources</div>
        </div>
        <div className="stat orange">
          <div className="val">{counts.plans}</div>
          <div className="lbl">My Plans</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Quick Links</h2></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="/manager/users"   className="btn btn-outline">👤 Manage Users</a>
            <a href="/manager/sources" className="btn btn-outline">🔌 Legacy Sources</a>
            <a href="/manager/plans"   className="btn btn-outline">📋 Access Plans</a>
            <a href="/manager/call"    className="btn btn-outline">⚡ Call Legacy</a>
          </div>
        </div>
      </div>
    </div>
  )
}
