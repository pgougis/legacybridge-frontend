import { useEffect, useState } from 'react'
import { usageApi, type UsagePeriod, type UsagePoint } from '../../api/usage'

interface Props {
  userId: string
  /** When true, hide the page chrome (used inside a modal) */
  compact?: boolean
}

const PERIODS: { key: UsagePeriod; label: string }[] = [
  { key: 'today',  label: 'Today' },
  { key: 'week',   label: 'Week' },
  { key: 'month',  label: 'Month' },
  { key: 'year',   label: 'Year' },
  { key: '3years', label: '3 Years' },
]

// ── Zero-fill helpers ─────────────────────────────────────────────────────────

function allBuckets(period: UsagePeriod): Date[] {
  const now = new Date()
  const buckets: Date[] = []

  if (period === 'today') {
    const base = new Date(now); base.setMinutes(0,0,0)
    for (let h = 0; h < 24; h++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h)
      buckets.push(d)
    }
  } else if (period === 'week') {
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1   // ISO: Mon=0
    const monday = new Date(now); monday.setHours(0,0,0,0); monday.setDate(monday.getDate() - dow)
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday); day.setDate(monday.getDate() + d)
      buckets.push(day)
    }
  } else if (period === 'month') {
    const y = now.getFullYear(), m = now.getMonth()
    const days = new Date(y, m + 1, 0).getDate()
    for (let d = 1; d <= days; d++) buckets.push(new Date(y, m, d))
  } else if (period === 'year') {
    for (let m = 0; m < 12; m++) buckets.push(new Date(now.getFullYear(), m, 1))
  } else {
    for (let y = now.getFullYear() - 2; y <= now.getFullYear(); y++)
      buckets.push(new Date(y, 0, 1))
  }
  return buckets
}

function bucketKey(period: UsagePeriod, d: Date): string {
  if (period === 'today')  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:00:00`
  if (period === 'week' || period === 'month') return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  if (period === 'year')   return `${d.getFullYear()}-${pad(d.getMonth()+1)}`
  return `${d.getFullYear()}`
}

function dataKey(period: UsagePeriod, iso: string): string {
  const d = new Date(iso)
  if (period === 'today')  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:00:00`
  if (period === 'week' || period === 'month') return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`
  if (period === 'year')   return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}`
  return `${d.getUTCFullYear()}`
}

function formatLabel(period: UsagePeriod, d: Date): string {
  const DAY  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const MON  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if (period === 'today')  return `${pad(d.getHours())}h`
  if (period === 'week')   return DAY[d.getDay() === 0 ? 6 : d.getDay() - 1]
  if (period === 'month')  return String(d.getDate())
  if (period === 'year')   return MON[d.getMonth()]
  return String(d.getFullYear())
}

function pad(n: number) { return String(n).padStart(2,'0') }

// ── Chart ─────────────────────────────────────────────────────────────────────

function BarChart({ data, period }: { data: { d: Date; count: number }[]; period: UsagePeriod }) {
  const max = Math.max(...data.map(x => x.count), 1)
  const total = data.reduce((s, x) => s + x.count, 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>
          {data.filter(x => x.count > 0).length} active slots · {total.toLocaleString()} total calls
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>peak: {max.toLocaleString()}</span>
      </div>
      <div className="usage-chart">
        {data.map((item, i) => (
          <div key={i} className="usage-bar-col" title={`${formatLabel(period, item.d)}: ${item.count}`}>
            <div className="usage-bar-count">{item.count > 0 ? item.count : ''}</div>
            <div
              className={`usage-bar-fill ${item.count > 0 ? 'has-data' : ''}`}
              style={{ height: `${Math.max((item.count / max) * 100, item.count > 0 ? 4 : 0)}%` }}
            />
            <div className="usage-bar-label">{formatLabel(period, item.d)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Usage({ userId, compact = false }: Props) {
  const [period, setPeriod] = useState<UsagePeriod>('today')
  const [raw, setRaw]       = useState<UsagePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    usageApi.get(userId, period)
      .then(setRaw)
      .catch(() => setError('Failed to load usage data'))
      .finally(() => setLoading(false))
  }, [userId, period])

  // Zero-fill: generate all expected buckets, merge with actual data
  const buckets = allBuckets(period)
  const map = new Map<string, number>()
  raw.forEach(p => map.set(dataKey(period, p.bucket), p.count))
  const chartData = buckets.map(d => ({
    d,
    count: map.get(bucketKey(period, d)) ?? 0,
  }))

  const content = (
    <>
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
      {!loading && !error && <BarChart data={chartData} period={period} />}
    </>
  )

  if (compact) return <div>{content}</div>

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>My Usage</h1><p>API call statistics</p></div>
      </div>
      <div className="card">
        <div className="card-body">{content}</div>
      </div>
    </div>
  )
}
