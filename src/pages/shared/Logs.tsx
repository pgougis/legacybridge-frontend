import { useEffect, useState } from 'react'
import { logsApi, type ApiCallLogDto } from '../../api/logs'
import { usersApi } from '../../api/users'
import { useAuth } from '../../ctx/auth'
import type { UserDto } from '../../api/types'
import { LOGS_PAGE_SIZE } from '../../config'

interface Props {
  /** When true, show user-selector (Admin / Manager) */
  selectable?: boolean
}

function statusBadgeClass(code: number): string {
  if (code < 400) return 'pill green'
  if (code < 500) return 'pill orange'
  return 'pill red'
}

function fmt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export default function Logs({ selectable = false }: Props) {
  const { user: me } = useAuth()
  const [logs, setLogs]         = useState<ApiCallLogDto[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [users, setUsers]       = useState<UserDto[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  // Load user list for selector
  useEffect(() => {
    if (!selectable) return
    usersApi.getAll().then(setUsers).catch(() => {})
  }, [selectable])

  // Fetch logs
  useEffect(() => {
    setLoading(true); setError('')
    logsApi.get({
      userId: selectedId || undefined,
      page,
      pageSize: LOGS_PAGE_SIZE,
    })
      .then(r => { setLogs(r.items); setTotal(r.total) })
      .catch(() => setError('Failed to load logs'))
      .finally(() => setLoading(false))
  }, [selectedId, page])

  const totalPages = Math.max(1, Math.ceil(total / LOGS_PAGE_SIZE))

  function handleUserChange(id: string) {
    setSelectedId(id)
    setPage(1)
  }

  const content = (
    <>
      {selectable && users.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>Filter by user:</label>
          <select
            value={selectedId}
            onChange={e => handleUserChange(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)' }}
          >
            <option value="">All users</option>
            {me && <option value={me.userId}>My logs</option>}
            {users.filter(u => u.id !== me?.userId).map(u => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.role})
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>{total.toLocaleString()} entries</span>
          <button
            className="btn btn-sm btn-outline"
            style={{ marginLeft: 'auto' }}
            onClick={() => { setPage(1); setSelectedId(selectedId) /* re-trigger */ }}
          >
            ↻ Refresh
          </button>
        </div>
      )}

      {!selectable && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>{total.toLocaleString()} entries</span>
          <button className="btn btn-sm btn-outline" onClick={() => setPage(p => p)}>↻ Refresh</button>
        </div>
      )}

      {loading && <div className="spinner">Loading…</div>}
      {error   && <div className="err-toast">{error}</div>}

      {!loading && !error && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Date / Time</th>
                  {selectable && <th>User</th>}
                  <th>Method</th>
                  <th>Path</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={selectable ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '28px 0' }}>No failures logged.</td></tr>
                )}
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{fmt(l.occurredAt)}</td>
                    {selectable && <td style={{ fontSize: 11 }}>{l.userEmail}</td>}
                    <td><span className="pill gray" style={{ fontSize: 10 }}>{l.httpMethod}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all', maxWidth: 280 }}>{l.path}</td>
                    <td><span className={statusBadgeClass(l.statusCode)}>{l.statusCode}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-sub)' }}>{l.errorReason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
              <button className="btn btn-sm btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>Page {page} / {totalPages}</span>
              <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </>
  )

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>API Error Logs</h1>
          <p>Failed API calls — 4xx and 5xx responses</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">{content}</div>
      </div>
    </div>
  )
}
