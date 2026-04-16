import { useEffect, useState } from 'react'
import { usageApi, type UsagePeriod, type UsagePoint } from '../../api/usage'
import { usersApi } from '../../api/users'
import { useAuth } from '../../ctx/auth'
import type { UserDto } from '../../api/types'

interface Props {
  userId: string
  /** When true, hide the page chrome (used inside a modal) */
  compact?: boolean
  /** Admin/Manager: show user selector */
  selectable?: boolean
}

const PERIODS: { key: UsagePeriod; label: string }[] = [
  { key: 'today',  label: 'Today' },
  { key: 'month',  label: 'Month' },
  { key: 'year',   label: 'Year' },
  { key: '3years', label: '3 Years' },
]

// ── Zero-fill helpers ─────────────────────────────────────────────────────────

// All bucket helpers work in UTC throughout to match the server (DateTime.UtcNow).
// allBuckets produces UTC Date objects; bucketKey/dataKey/formatLabel all use getUTC* getters.

function allBuckets(period: UsagePeriod): Date[] {
  const now = new Date()
  const buckets: Date[] = []
  const Y = now.getUTCFullYear(), M = now.getUTCMonth(), D = now.getUTCDate()

  if (period === 'today') {
    for (let h = 0; h < 24; h++) buckets.push(new Date(Date.UTC(Y, M, D, h)))
  } else if (period === 'month') {
    const days = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate()
    for (let d = 1; d <= days; d++) buckets.push(new Date(Date.UTC(Y, M, d)))
  } else if (period === 'year') {
    for (let m = 0; m < 12; m++) buckets.push(new Date(Date.UTC(Y, m, 1)))
  } else {
    for (let y = Y - 2; y <= Y; y++) buckets.push(new Date(Date.UTC(y, 0, 1)))
  }
  return buckets
}

function bucketKey(period: UsagePeriod, d: Date): string {
  if (period === 'today')  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:00:00`
  if (period === 'month') return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`
  if (period === 'year')  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}`
  return `${d.getUTCFullYear()}`
}

function dataKey(period: UsagePeriod, iso: string): string {
  const d = new Date(iso)
  if (period === 'today')  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:00:00`
  if (period === 'month')  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`
  if (period === 'year')   return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}`
  return `${d.getUTCFullYear()}`
}

function formatLabel(period: UsagePeriod, d: Date): string {
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if (period === 'today')  return `${pad(d.getUTCHours())}h`
  if (period === 'month')  return String(d.getUTCDate())
  if (period === 'year')   return MON[d.getUTCMonth()]
  return String(d.getUTCFullYear())
}

function pad(n: number) { return String(n).padStart(2,'0') }

// ── Chart ─────────────────────────────────────────────────────────────────────

function BarChart({
  data, period, dailyLimit,
}: {
  data: { d: Date; count: number }[]
  period: UsagePeriod
  dailyLimit?: number | null
}) {
  const total     = data.reduce((s, x) => s + x.count, 0)
  const todayUsed = period === 'today' ? total : null

  // Scale: if limit exists, chart top = max(peak, limit) so the line is always visible
  const peak = Math.max(...data.map(x => x.count), 1)
  const max  = dailyLimit ? Math.max(peak, dailyLimit) : peak

  // Line position as % from bottom (chart area = 100% of bar height)
  const limitPct = dailyLimit ? (dailyLimit / max) * 100 : null

  // Bar color per slot
  function barClass(count: number) {
    if (!count) return ''
    if (dailyLimit && count > dailyLimit)  return 'has-data exceeded'
    if (dailyLimit && count >= dailyLimit * 0.8) return 'has-data warning'
    return 'has-data'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>
          {data.filter(x => x.count > 0).length} active slots · {total.toLocaleString()} total calls
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>peak: {peak.toLocaleString()}</span>
          {dailyLimit != null && period === 'today' && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: todayUsed! > dailyLimit ? 'var(--red)' : todayUsed! >= dailyLimit * 0.8 ? 'var(--orange)' : 'var(--text-sub)',
            }}>
              {todayUsed!.toLocaleString()} / {dailyLimit.toLocaleString()} daily limit
            </span>
          )}
          {dailyLimit != null && period !== 'today' && (
            <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>
              daily limit: {dailyLimit.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Chart wrapper — relative for the limit line */}
      <div style={{ position: 'relative' }}>
        {limitPct != null && (
          <div style={{
            position: 'absolute',
            bottom: `calc(24px + ${limitPct}%)`,
            left: 0, right: 0,
            borderTop: '2px dashed var(--orange)',
            zIndex: 1,
            pointerEvents: 'none',
          }}>
            <span style={{
              position: 'absolute', right: 0, top: -16,
              fontSize: 9, fontWeight: 700, color: 'var(--orange)',
              background: 'var(--white)', padding: '0 3px',
            }}>
              limit {dailyLimit!.toLocaleString()}
            </span>
          </div>
        )}

        <div className="usage-chart">
          {data.map((item, i) => (
            <div key={i} className="usage-bar-col" title={`${formatLabel(period, item.d)}: ${item.count}`}>
              <div className="usage-bar-count">{item.count > 0 ? item.count : ''}</div>
              <div
                className={`usage-bar-fill ${barClass(item.count)}`}
                style={{ height: `${Math.max((item.count / max) * 100, item.count > 0 ? 4 : 0)}%` }}
              />
              <div className="usage-bar-label">{formatLabel(period, item.d)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Usage({ userId, compact = false, selectable = false }: Props) {
  const { user: me } = useAuth()
  const [period, setPeriod]     = useState<UsagePeriod>('today')
  const [raw, setRaw]           = useState<UsagePoint[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [users, setUsers]       = useState<UserDto[]>([])
  const [selectedId, setSelectedId] = useState<string>(userId)
  const [selfLimit, setSelfLimit]   = useState<number | null | undefined>(undefined)

  // Load user list for Admin / Manager
  useEffect(() => {
    if (!selectable) return
    usersApi.getAll().then(setUsers).catch(() => {})
  }, [selectable])

  // Fetch own daily limit (for non-selectable mode)
  useEffect(() => {
    if (selectable) return
    usersApi.getById(userId)
      .then(u => setSelfLimit(u.apiCallDailyLimit ?? null))
      .catch(() => setSelfLimit(null))
  }, [userId, selectable])

  // Reset to self when userId prop changes (e.g. after login)
  useEffect(() => { setSelectedId(userId) }, [userId])

  const activeUserId = selectable ? selectedId : userId

  useEffect(() => {
    setLoading(true); setError('')
    usageApi.get(activeUserId, period)
      .then(setRaw)
      .catch(() => setError('Failed to load usage data'))
      .finally(() => setLoading(false))
  }, [activeUserId, period])

  // Zero-fill: generate all expected buckets, merge with actual data
  const buckets = allBuckets(period)
  const map = new Map<string, number>()
  raw.forEach(p => map.set(dataKey(period, p.bucket), p.count))
  const chartData = buckets.map(d => ({
    d,
    count: map.get(bucketKey(period, d)) ?? 0,
  }))


  const selectedUser  = users.find(u => u.id === selectedId)
  const isSelf        = selectedId === userId
  // Daily limit: from selected user list (selectable mode) or fetched self limit
  const dailyLimit: number | null =
    selectable
      ? (selectedUser?.apiCallDailyLimit ?? (isSelf ? null : null))
      : (selfLimit ?? null)

  const content = (
    <>
      {/* User selector (Admin / Manager only) */}
      {selectable && users.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>Viewing:</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)' }}
          >
            {me && <option value={me.userId}>My Usage</option>}
            {users.filter(u => u.id !== me?.userId).map(u => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({u.role})
              </option>
            ))}
          </select>
          {!isSelf && selectedUser && (
            <span className="pill blue">{selectedUser.email}</span>
          )}
        </div>
      )}

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && <div className="spinner">Loading…</div>}
      {error && <div className="err-toast">{error}</div>}
      {!loading && !error && <BarChart data={chartData} period={period} dailyLimit={dailyLimit} />}
    </>
  )

  if (compact) return <div>{content}</div>

  const title    = selectable ? 'Usage' : 'My Usage'
  const subtitle = selectable && !isSelf && selectedUser
    ? `${selectedUser.firstName} ${selectedUser.lastName} — API call statistics`
    : 'API call statistics'

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>{title}</h1><p>{subtitle}</p></div>
      </div>
      <div className="card">
        <div className="card-body">{content}</div>
      </div>
    </div>
  )
}
