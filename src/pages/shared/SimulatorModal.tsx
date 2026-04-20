import { useEffect, useState } from 'react'
import { sourcesApi } from '../../api/sources'
import type { SimulatorResponseDto } from '../../api/types'

interface Props {
  sourceId: string
  sourceUrl: string
  onClose: () => void
}

const EMPTY_FORM = {
  method: '',
  responseJson: '{\n  "status": "ok"\n}',
  delayMs: 0,
  isError: false,
  errorStatusCode: 502,
  errorMessage: '',
}

export default function SimulatorModal({ sourceId, sourceUrl, onClose }: Props) {
  const [responses, setResponses]   = useState<SimulatorResponseDto[]>([])
  const [editing, setEditing]       = useState<SimulatorResponseDto | null>(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [err, setErr]               = useState('')
  const [jsonErr, setJsonErr]       = useState('')
  const [loading, setLoading]       = useState(false)

  function load() {
    sourcesApi.getSimulatorResponses(sourceId).then(setResponses).catch(() => {})
  }
  useEffect(() => { load() }, [sourceId])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErr(''); setJsonErr('')
  }

  function openEdit(r: SimulatorResponseDto) {
    setEditing(r)
    setForm({
      method: r.method,
      responseJson: r.responseJson,
      delayMs: r.delayMs,
      isError: r.isError,
      errorStatusCode: r.errorStatusCode,
      errorMessage: r.errorMessage ?? '',
    })
    setErr(''); setJsonErr('')
  }

  function validateJson(v: string) {
    try { JSON.parse(v); setJsonErr('') } catch { setJsonErr('JSON invalide') }
  }

  async function handleSave() {
    if (jsonErr) return
    if (!form.method.trim()) { setErr('La méthode est requise (* pour défaut)'); return }
    setErr(''); setLoading(true)
    try {
      await sourcesApi.upsertSimulatorResponse(sourceId, form.method.trim(), {
        responseJson: form.responseJson,
        delayMs: form.delayMs,
        isError: form.isError,
        errorStatusCode: form.errorStatusCode,
        errorMessage: form.errorMessage || undefined,
      })
      load()
      setEditing(null)
      setForm(EMPTY_FORM)
    } catch (e: unknown) {
      setErr((e as Error).message || 'Erreur')
    } finally { setLoading(false) }
  }

  async function handleDelete(method: string) {
    if (!confirm(`Supprimer le template "${method}" ?`)) return
    await sourcesApi.deleteSimulatorResponse(sourceId, method)
    load()
    if (editing?.method === method) { setEditing(null); setForm(EMPTY_FORM) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 820, width: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>🧪 Simulateur</h2>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>{sourceUrl}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, minHeight: 400 }}>

          {/* Left — list of templates */}
          <div style={{ borderRight: '1px solid var(--border)', paddingRight: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>TEMPLATES</span>
              <button className="btn btn-outline btn-sm" onClick={openNew}>+ Nouveau</button>
            </div>
            {responses.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-sub)', textAlign: 'center', marginTop: 24 }}>
                Aucun template<br />
                <span style={{ fontSize: 11 }}>Ajoute-en un →</span>
              </div>
            )}
            {responses.map(r => (
              <div
                key={r.id}
                onClick={() => openEdit(r)}
                style={{
                  padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                  background: editing?.id === r.id ? 'var(--bg-active, #f0f4ff)' : 'transparent',
                  border: '1px solid ' + (editing?.id === r.id ? 'var(--blue)' : 'transparent'),
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {r.method === '*' ? '⭐ default' : r.method}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)' }}>
                    {r.isError ? `❌ ${r.errorStatusCode}` : `✅ ${r.delayMs > 0 ? `${r.delayMs}ms` : 'instant'}`}
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={e => { e.stopPropagation(); handleDelete(r.method) }}
                  style={{ fontSize: 10, padding: '2px 6px' }}
                >Del</button>
              </div>
            ))}
          </div>

          {/* Right — editor */}
          <div>
            {err && <div className="err-toast" style={{ marginBottom: 8 }}>{err}</div>}

            <div className="form-row2">
              <div className="form-field">
                <label>Méthode <span style={{ color: 'var(--text-sub)', fontSize: 11 }}>(* = défaut)</span></label>
                <input
                  value={form.method}
                  onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
                  placeholder="GetClient ou *"
                  disabled={!!editing}
                />
              </div>
              <div className="form-field">
                <label>Délai (ms)</label>
                <input
                  type="number" min="0" max="30000"
                  value={form.delayMs}
                  onChange={e => setForm(f => ({ ...f, delayMs: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.isError}
                  onChange={e => setForm(f => ({ ...f, isError: e.target.checked }))}
                />
                Simuler une erreur
              </label>
            </div>

            {form.isError ? (
              <div className="form-row2">
                <div className="form-field">
                  <label>Status HTTP</label>
                  <input
                    type="number" min="400" max="599"
                    value={form.errorStatusCode}
                    onChange={e => setForm(f => ({ ...f, errorStatusCode: Number(e.target.value) }))}
                  />
                </div>
                <div className="form-field">
                  <label>Message d'erreur</label>
                  <input
                    value={form.errorMessage}
                    onChange={e => setForm(f => ({ ...f, errorMessage: e.target.value }))}
                    placeholder="Timeout du service legacy"
                  />
                </div>
              </div>
            ) : (
              <div className="form-field">
                <label>
                  Réponse JSON
                  {jsonErr && <span style={{ color: 'var(--red)', fontSize: 11, marginLeft: 8 }}>{jsonErr}</span>}
                </label>
                <textarea
                  rows={10}
                  style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                  value={form.responseJson}
                  onChange={e => { setForm(f => ({ ...f, responseJson: e.target.value })); validateJson(e.target.value) }}
                  placeholder='{ "status": "ok" }'
                />
                <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 4 }}>
                  Tu peux utiliser {'{{paramName}}'} pour interpoler les paramètres de la requête.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading || !!jsonErr}
          >
            {loading ? 'Sauvegarde…' : editing ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}
