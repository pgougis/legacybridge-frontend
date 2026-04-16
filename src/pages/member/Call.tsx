import { useEffect, useState } from 'react'
import { sourcesApi } from '../../api/sources'
import { useAuth } from '../../ctx/auth'
import type { LegacySource, WsdlOperation } from '../../api/types'
import { API_BASE } from '../../config'

function buildScript(email: string, sourceId: string, sourceName: string, method: string, body: string): string {
  const safeBody = body.replace(/\\/g, '\\\\').replace(/'/g, "'\\''")
  return `#!/usr/bin/env bash
# LegacyBridge — generated call script
# Source : ${sourceName}
# Method : ${method}
set -euo pipefail

API="${API_BASE}"
EMAIL="${email}"

# ── 1. Authenticate (password is never stored in this script) ──────────────────
read -r -s -p "Password for \${EMAIL}: " PASSWORD
echo

_resp=$(curl -sf -X POST "\${API}/auth/login" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"cUserAccount\\":\\"\${EMAIL}\\",\\"cUserPwd\\":\\"\${PASSWORD}\\"}")

TOKEN=$(printf '%s' "$_resp" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')
unset PASSWORD _resp

[ -n "$TOKEN" ] || { echo "Authentication failed." >&2; exit 1; }
echo "Token obtained — calling API…"

# ── 2. Call the legacy API ────────────────────────────────────────────────────
curl -s -X POST "\${API}/legacy-sources/${sourceId}/${method}" \\
  -H "Authorization: Bearer \${TOKEN}" \\
  -H 'Content-Type: application/json' \\
  -d '${safeBody}' \\
  | (command -v jq >/dev/null 2>&1 && jq . || cat)
`
}

export default function MemberCall() {
  const { user } = useAuth()
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
  const [scriptOpen, setScriptOpen]   = useState(false)
  const [copied, setCopied]           = useState(false)

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
    sourcesApi.getAllowedOperations(sourceId)
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

  const selectedOp   = operations.find(o => o.name === method) ?? null
  const selectedSrc  = sources.find(s => s.id === sourceId)
  const email        = user?.email ?? ''
  const script       = (sourceId && method)
    ? buildScript(email, sourceId, selectedSrc?.systemUrl ?? sourceId, method, body)
    : ''

  async function handleCopy() {
    await navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-green" onClick={handleCall} disabled={loading || !sourceId || !method}>
              {loading ? '⏳ Calling…' : '⚡ Send'}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setScriptOpen(true)}
              disabled={!sourceId || !method}
              title="Generate a bash script for this call"
            >
              {'</>'}  Bash Script
            </button>
          </div>
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

      {/* Script modal */}
      {scriptOpen && (
        <div className="modal-backdrop" onClick={() => setScriptOpen(false)}>
          <div className="modal script-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Bash Script</h2>
                <p style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>
                  Password is prompted at runtime — never stored in the script.
                </p>
              </div>
              <button className="modal-close" onClick={() => setScriptOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <pre className="script-pre">{script}</pre>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn btn-primary" onClick={handleCopy}>
                  {copied ? '✓ Copied!' : 'Copy to clipboard'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
