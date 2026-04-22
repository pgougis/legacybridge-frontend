import { useEffect, useState } from 'react'
// @ts-ignore
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function SwaggerViewer() {
  const [spec, setSpec] = useState<object | null>(null)
  const [err,  setErr]  = useState('')

  useEffect(() => {
    const params  = new URLSearchParams(window.location.search)
    const specUrl = params.get('url') ?? ''
    const token   = params.get('token') ?? ''

    fetch(specUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setSpec)
      .catch(e => setErr(`Impossible de charger la spec : ${e.message}`))
  }, [])

  if (err)   return <div style={{ padding: 32, color: 'red', fontFamily: 'monospace' }}>{err}</div>
  if (!spec) return <div style={{ padding: 32 }}>Chargement...</div>

  const token = new URLSearchParams(window.location.search).get('token') ?? ''

  return (
    <SwaggerUI
      spec={spec}
      requestInterceptor={(req: any) => {
        if (token) req.headers['Authorization'] = `Bearer ${token}`
        return req
      }}
    />
  )
}
