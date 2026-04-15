import { useEffect, useState } from 'react'
import { sourcesApi, systemTypeLabels } from '../../api/sources'
import type { LegacySource } from '../../api/types'

export default function MemberSources() {
  const [rows, setRows]     = useState<LegacySource[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    sourcesApi.getAccessible().then(setRows).catch(() => {})
  }, [])

  const filtered = rows.filter(r =>
    r.systemUrl.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>My Sources</h1><p>Legacy systems you can access</p></div>
      </div>

      <div className="notice">
        <span>ℹ️</span>
        <span>These are the legacy sources accessible to you based on your assigned access plans.</span>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <input placeholder="Search URL…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead>
            <tr><th>URL</th><th>Type</th><th>Auth</th></tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.systemUrl}</td>
                <td><span className="pill gray">{systemTypeLabels[s.systemType as unknown as number] ?? s.systemType}</span></td>
                <td>{s.authConfig ? <span className="pill green">Configured</span> : <span className="pill gray">None</span>}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={3}><div className="empty"><div className="icon">🔌</div>No accessible sources found</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
