import { useEffect, useState } from 'react'
import { auditApi, AuditLogDto } from '../../api/audit'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  RoleChanged:  { label: 'Role Changed',   color: 'orange' },
  QuotaChanged: { label: 'Quota Changed',  color: 'blue'   },
  UserDeleted:  { label: 'User Deleted',   color: 'red'    },
  SourceDeleted:{ label: 'Source Deleted', color: 'red'    },
  Impersonated: { label: 'Impersonated',   color: 'purple' },
  UserInvited:  { label: 'User Invited',   color: 'green'  },
}

const PAGE_SIZE = 25

export default function AdminAudit() {
  const [items, setItems]   = useState<AuditLogDto[]>([])
  const [total, setTotal]   = useState(0)
  const [page, setPage]     = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    auditApi.get({ page, pageSize: PAGE_SIZE })
      .then(r => { setItems(r.items); setTotal(r.total) })
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString('fr-FR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Audit Trail</h1>
          <p>Sensitive actions performed on the platform ({total} entries)</p>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Events</h2></div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-sub)' }}>Loading…</div>}
          {error   && <div style={{ padding: 20, color: 'var(--red)' }}>{error}</div>}
          {!loading && !error && (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-sub)', padding: 24 }}>No audit entries yet.</td></tr>
                  )}
                  {items.map(log => {
                    const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: 'gray' }
                    return (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text-sub)', fontSize: 12 }}>
                          {fmtDate(log.occurredAt)}
                        </td>
                        <td>
                          <span className={`pill ${meta.color}`}>{meta.label}</span>
                        </td>
                        <td style={{ fontSize: 13 }}>{log.actorEmail}</td>
                        <td style={{ fontSize: 13 }}>{log.targetEmail ?? log.targetId ?? '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-sub)' }}>{log.details ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="card-foot" style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 12 }}>
            <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ lineHeight: '32px', fontSize: 13, color: 'var(--text-sub)' }}>
              Page {page} / {totalPages}
            </span>
            <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
