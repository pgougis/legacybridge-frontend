import { useEffect, useState } from 'react'
import { customersApi } from '../../api/customers'
import { usersApi } from '../../api/users'
import { sourcesApi } from '../../api/sources'
import { plansApi } from '../../api/plans'

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ customers: 0, users: 0, sources: 0, plans: 0 })

  useEffect(() => {
    Promise.all([
      customersApi.getAll(),
      usersApi.getAll(),
      sourcesApi.getAll(),
      plansApi.getAll(),
    ]).then(([c, u, s, p]) => {
      setCounts({ customers: c.length, users: u.length, sources: s.length, plans: p.length })
    }).catch(() => {})
  }, [])

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Platform overview</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat purple">
          <div className="val">{counts.customers}</div>
          <div className="lbl">Customers</div>
        </div>
        <div className="stat blue">
          <div className="val">{counts.users}</div>
          <div className="lbl">Users</div>
        </div>
        <div className="stat green">
          <div className="val">{counts.sources}</div>
          <div className="lbl">Legacy Sources</div>
        </div>
        <div className="stat orange">
          <div className="val">{counts.plans}</div>
          <div className="lbl">Access Plans</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Quick Links</h2></div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="/admin/customers" className="btn btn-outline">🏢 Manage Customers</a>
            <a href="/admin/users"     className="btn btn-outline">👤 Manage Users</a>
            <a href="/admin/sources"   className="btn btn-outline">🔌 Legacy Sources</a>
            <a href="/admin/plans"     className="btn btn-outline">📋 Access Plans</a>
          </div>
        </div>
      </div>
    </div>
  )
}
