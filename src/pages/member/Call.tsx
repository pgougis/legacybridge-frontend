import { useEffect, useState } from 'react'
import { sourcesApi } from '../../api/sources'
import type { LegacySource, WsdlOperation } from '../../api/types'

export default function MemberCall() {
  const [sources, setSources]         = useState<LegacySource[]>([])
  const [sourceId, setSourceId]       = useState('')
  const [operations, setOperations]   = useState<WsdlOperation[]>([])
  const [opLoading, setOpLoading]     = useState(false)
  const [method, setMethod]           = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [body, setBody]               = useState('{}')
  const [response, setResponse]       = useState<string | null>(null)
  const [isError, setIsError]         = useState(false)
  const [loading, setLoading]         = useState(false)

  useEffect(() => {
    sourcesApi.getAccessible().then(s => {
      setSources(s)
      if (s.length) setSourceId(s[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!sourceId) return
    setOperations([]); setMethod(''); setFieldValues({}); setBody('{}')
    setOpLoading(true)
    sourcesApi.getOperations(sourceId)
      .then(ops => {
        setOperations(ops)
        if (ops.length) applyOp(ops[0], {})
      })
      .catch(() => {})
      .finally(() => setOpLoading(false))
  }, [sourceId])

  function applyOp(op: WsdlOperation, vals: Record<string, string>) {
    setMethod(op.name)
    setFieldValues(vals)
    setBody(buildBody(op, vals))
  }

  function buildBody(op: WsdlOperation, vals: Record<string, string>) {
    if (op.fields.length === 0) return '{}'
    const obj: Record<string, string> = {}
    for (const f of op.fields) obj[f.name] = vals[f.name] ?? ''
    return JSON.stringify(obj, null, 2)
  }

  function handleOpChange(opName: string) {
    const op = operations.find(o => o.name === opName)
    if (op) applyOp(op, {})
    else setMethod(opName)
  }

  function handleFieldChange(name: string, value: string) {
    const newVals = { ...fieldValues, [name]: value }
    setFieldValues(newVals)
    const op = operations.find(o => o.name === method)
    if (op) setBody(buildBody(op, newVals))
  }

  async function handleCall() {
    if (!sourceId || !method) return
    setLoading(true); setResponse(null); setIsError(false)
    try {
      let parsed: unknown = {}
      try { parsed = JSON.parse(body) } catch { /* use empty */ }
      const result = await sourcesApi.call(sourceId, method, parsed)
      setResponse(JSON.stringify(result, null, 2))
      setIsError(false)
    } catch (e: unknown) {
      setResponse(e instanceof Error ? e.message : String(e))
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  const selectedOp = operations.find(o => o.name === method) ?? null

  return (
    <div className="page">
      <div className="page-hd">
        <div><h1>Call Legacy</h1><p>Invoke a method on an accessible legacy system</p></div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="form-row2">
            <div className="form-field">
              <label>Legacy Source</label>
              <select value={sourceId} onChange={e => setSourceId(e.target.value)}>
                {sources.length === 0 && <option value="">— no accessible sources —</option>}
                {sources.map(s => <option key={s.id} value={s.id}>{s.systemUrl}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>
                Method
                {opLoading && <span style={{ fontSize: 11, opacity: 0.55, marginLeft: 6 }}>loading…</span>}
              </label>
              {operations.length > 0
                ? <select value={method} onChange={e => handleOpChange(e.target.value)}>
                    {operations.map(o => <option key={o.name} value={o.name}>{o.name}</option>)}
                  </select>
                : <input value={method} onChange={e => setMethod(e.target.value)} placeholder="e.g. GetCustomerInfo" />
              }
            </div>
          </div>

          {selectedOp && selectedOp.fields.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Parameters
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                {selectedOp.fields.map(f => (
                  <div key={f.name} className="form-field" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span>
                        {f.name}
                        {f.required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
                      </span>
                      <span style={{ fontSize: 10, opacity: 0.5, fontWeight: 400 }}>{f.type}</span>
                    </label>
                    <input
                      value={fieldValues[f.name] ?? ''}
                      onChange={e => handleFieldChange(f.name, e.target.value)}
                      placeholder={f.type}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-field">
            <label>Request Body (JSON)</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
          <button className="btn btn-green" onClick={handleCall} disabled={loading || !sourceId || !method}>
            {loading ? '⏳ Calling…' : '⚡ Send'}
          </button>
        </div>
      </div>

      <div className="call-grid">
        <div>
          <div className="code-lbl">Request</div>
          <div className="code">
            {sourceId && method
              ? `POST /legacy-sources/${sourceId}/${method}\n\n${body}`
              : '— fill in source and method above —'}
          </div>
        </div>
        <div>
          <div className="code-lbl">Response</div>
          <div className={`code ${response ? (isError ? 'err' : 'ok') : ''}`}>
            {loading ? '⏳ waiting…' : response ?? '— no response yet —'}
          </div>
        </div>
      </div>
    </div>
  )
}
