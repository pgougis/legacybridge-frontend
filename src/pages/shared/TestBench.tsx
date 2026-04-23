import { useEffect, useState } from 'react'
import { sourcesApi, systemTypeLabels } from '../../api/sources'
import type { LegacySource, LegacySystemType, SimulatorResponseDto } from '../../api/types'

// ─── Request format builders per system type ──────────────────────────────────

const oeReq = (method: string, fields: string) =>
`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:oe="urn:DataSnap.Web.DSProducer">
  <soapenv:Body>
    <oe:${method}>
${fields.split('\n').map(l => '      ' + l).join('\n')}
    </oe:${method}>
  </soapenv:Body>
</soapenv:Envelope>`

const genericSoapReq = (method: string, fields: string) =>
`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ns="urn:service">
  <soapenv:Body>
    <ns:${method}>
${fields.split('\n').map(l => '      ' + l).join('\n')}
    </ns:${method}>
  </soapenv:Body>
</soapenv:Envelope>`

const asmxReq = (method: string, fields: string) => {
  // Convert XML fields like <P-CLI-CODE>C001</P-CLI-CODE> → { "P-CLI-CODE": "C001" }
  const jsonFields = fields
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.match(/<[^/][^>]*>[^<]+<\/[^>]+>/))
    .map(l => {
      const m = l.match(/<([^>]+)>([^<]+)<\//)
      return m ? `  "${m[1]}": "${m[2]}"` : null
    })
    .filter(Boolean)
    .join(',\n')
  return `POST /${method} HTTP/1.1\nContent-Type: application/json\n\n{\n${jsonFields}\n}`
}

const oracleSoapReq = (method: string, fields: string) =>
`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:ora="urn:oracle:bpel:services">
  <soapenv:Body>
    <ora:${method}>
      <InputParameters>
${fields.split('\n').map(l => '        ' + l.trim().replace(/^<P-/, '<').replace(/<\/P-/, '</')).join('\n')}
      </InputParameters>
    </ora:${method}>
  </soapenv:Body>
</soapenv:Envelope>`

const oeFault = (code: string, msg: string, detail: string) =>
`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>soapenv:Server</faultcode>
      <faultstring>ProOpenEdge AppServer Error</faultstring>
      <detail>
        <P-RETOUR>KO</P-RETOUR>
        <P-ERROR-CODE>${code}</P-ERROR-CODE>
        <P-MESSAGE>${msg}</P-MESSAGE>${detail ? '\n        ' + detail : ''}
      </detail>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`

const genericFault = (code: string, msg: string) =>
`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>soapenv:Server</faultcode>
      <faultstring>${msg}</faultstring>
      <detail><errorCode>${code}</errorCode></detail>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`

const asmxError = (code: string, msg: string) =>
`HTTP/1.1 400 Bad Request\nContent-Type: application/json\n\n{\n  "error": "${code}",\n  "message": "${msg}"\n}`

const oracleFault = (code: string, msg: string) =>
`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>ora:${code}</faultcode>
      <faultstring>${msg}</faultstring>
      <detail><ora:errorCode xmlns:ora="urn:oracle:bpel:services">${code}</ora:errorCode></detail>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`

const oeResp = (method: string, fields: string) =>
`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <${method}Response>
${fields.split('\n').map(l => '      ' + l).join('\n')}
    </${method}Response>
  </soapenv:Body>
</soapenv:Envelope>`

// ─── Build request preview per type ──────────────────────────────────────────

function buildNominalReq(method: string, fields: string, systemType: LegacySystemType): string {
  switch (systemType) {
    case 'OpenEdgeSoap': return oeReq(method, fields)
    case 'GenericSoap':  return genericSoapReq(method, fields)
    case 'AsmxDotNet':   return asmxReq(method, fields)
    case 'OracleSoap':   return oracleSoapReq(method, fields)
  }
}

function buildFaultReq(code: string, msg: string, detail: string, systemType: LegacySystemType): string {
  switch (systemType) {
    case 'OpenEdgeSoap': return oeFault(code, msg, detail)
    case 'GenericSoap':  return genericFault(code, msg)
    case 'AsmxDotNet':   return asmxError(code, msg)
    case 'OracleSoap':   return oracleFault(code, msg)
  }
}

// ─── Entity / method config ───────────────────────────────────────────────────

interface MethodDef {
  label:           string
  nominal:         string
  fault:           string
  faultCode:       string
  faultMsg:        string
  faultDetail:     string
  faultLabel?:     string
  faultIsVariant?: boolean
  xmlFields:       string  // raw XML fields for request body
  xmlVariantFields?: string // for faultIsVariant (shown as response, not fault)
}

interface EntityDef { label: string; methods: MethodDef[] }

const ENTITIES: Record<string, EntityDef> = {
  Client: {
    label: 'Client',
    methods: [
      {
        label: 'Get', nominal: 'GetClient', fault: 'GetClient.ERR_404',
        faultCode: 'CLI-404', faultMsg: 'CUSTOMER NOT FOUND', faultDetail: '',
        xmlFields: '<P-CLI-CODE>C001</P-CLI-CODE>',
      },
      {
        label: 'Create', nominal: 'CreateClient', fault: 'CreateClient.ERR_CLIENT',
        faultCode: 'CLI-001', faultMsg: 'DUPLICATE CLIENT — EMAIL ALREADY EXISTS', faultDetail: '',
        xmlFields:
          '<P-CLI-NAME>ACME CORPORATION</P-CLI-NAME>\n' +
          '<P-CLI-FIRSTNAME>JOHN</P-CLI-FIRSTNAME>\n' +
          '<P-CLI-ADR1>350 FIFTH AVENUE</P-CLI-ADR1>\n' +
          '<P-CLI-ZIP>10118</P-CLI-ZIP>\n' +
          '<P-CLI-CITY>NEW YORK</P-CLI-CITY>\n' +
          '<P-CLI-EMAIL>contact@acmecorp.com</P-CLI-EMAIL>',
      },
      {
        label: 'Update', nominal: 'UpdateClient', fault: 'UpdateClient.ERR_404',
        faultCode: 'CLI-404', faultMsg: 'CUSTOMER NOT FOUND', faultDetail: '',
        xmlFields:
          '<P-CLI-CODE>C001</P-CLI-CODE>\n' +
          '<P-CLI-PHONE>2125559999</P-CLI-PHONE>\n' +
          '<P-CLI-EMAIL>newemail@acmecorp.com</P-CLI-EMAIL>\n' +
          '<P-CLI-CREDIT-LIMIT>25000.00</P-CLI-CREDIT-LIMIT>',
      },
      {
        label: 'Delete', nominal: 'DeleteClient', fault: 'DeleteClient.ERR_404',
        faultCode: 'CLI-403', faultMsg: 'CUSTOMER BLOCKED — CANNOT DELETE', faultDetail: '<P-CLI-BALANCE>21500.00</P-CLI-BALANCE>',
        xmlFields: '<P-CLI-CODE>C001</P-CLI-CODE>',
      },
      {
        label: 'List', nominal: 'GetClients', fault: 'GetClients.ERR_404',
        faultCode: 'CLI-500', faultMsg: 'INTERNAL SERVER ERROR', faultDetail: '',
        xmlFields: '<P-FILTER-STATUS>A</P-FILTER-STATUS>\n<P-FILTER-CITY>NEW YORK</P-FILTER-CITY>',
      },
    ],
  },
  Article: {
    label: 'Article',
    methods: [
      {
        label: 'Get', nominal: 'GetArticle', fault: 'GetArticle.ERR_404',
        faultCode: 'ART-404', faultMsg: 'ITEM NOT FOUND', faultDetail: '',
        xmlFields: '<P-ART-CODE>ART001</P-ART-CODE>',
      },
      {
        label: 'Stock', nominal: 'GetStock', fault: 'GetStock.RUPTURE',
        faultLabel: 'Out of Stock', faultIsVariant: true,
        faultCode: 'STK-000', faultMsg: 'OUT OF STOCK', faultDetail: '',
        xmlFields: '<P-ART-CODE>ART001</P-ART-CODE>',
        xmlVariantFields:
          '<P-RETOUR>OK</P-RETOUR>\n' +
          '<P-ART-CODE>ART001</P-ART-CODE>\n' +
          '<P-STOCK-ON-HAND>0</P-STOCK-ON-HAND>\n' +
          '<P-STOCK-AVAILABLE>0</P-STOCK-AVAILABLE>\n' +
          '<P-STOCK-UNIT>EA</P-STOCK-UNIT>\n' +
          '<P-WAREHOUSE>WH-NYC-01</P-WAREHOUSE>\n' +
          '<P-MESSAGE>OUT OF STOCK — REORDER EXPECTED 04/30/2026</P-MESSAGE>',
      },
    ],
  },
  Commande: {
    label: 'Commande',
    methods: [
      {
        label: 'Get', nominal: 'GetCommande', fault: 'GetCommande.ERR_404',
        faultCode: 'ORD-404', faultMsg: 'ORDER NOT FOUND', faultDetail: '',
        xmlFields: '<P-ORDER-NUM>ORD-2026-00123</P-ORDER-NUM>',
      },
      {
        label: 'Create', nominal: 'CreateCommande', fault: 'CreateCommande.ERR_CLIENT',
        faultCode: 'CUST-001', faultMsg: 'CUSTOMER NOT FOUND OR BLOCKED', faultDetail: '',
        xmlFields:
          '<P-CUST-CODE>C001</P-CUST-CODE>\n' +
          '<P-LINE-ITEM>ART001</P-LINE-ITEM>\n' +
          '<P-LINE-QTY>2</P-LINE-QTY>',
      },
      {
        label: 'List', nominal: 'GetCommandes', fault: 'GetCommandes.ERR_404',
        faultCode: 'CUST-404', faultMsg: 'CUSTOMER NOT FOUND', faultDetail: '',
        xmlFields: '<P-CUST-CODE>C001</P-CUST-CODE>',
      },
    ],
  },
}

const ENTITY_KEYS = Object.keys(ENTITIES)

const SYSTEM_TYPES: { value: LegacySystemType; label: string }[] = [
  { value: 'OpenEdgeSoap', label: 'OpenEdge SOAP' },
  { value: 'GenericSoap',  label: 'Generic SOAP' },
  { value: 'AsmxDotNet',   label: 'ASMX .NET' },
  { value: 'OracleSoap',   label: 'Oracle SOAP' },
]

function prettyJson(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2) } catch { return raw }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TestBench() {
  const [sources,      setSources]      = useState<LegacySource[]>([])
  const [sourceId,     setSourceId]     = useState<string>('')
  const [systemType,   setSystemType]   = useState<LegacySystemType>('OpenEdgeSoap')
  const [typeOverride, setTypeOverride] = useState(false)
  const [responses,    setResponses]    = useState<SimulatorResponseDto[]>([])
  const [entityKey,    setEntityKey]    = useState('Client')
  const [methodIdx,    setMethodIdx]    = useState(0)
  const [isFault,      setIsFault]      = useState(false)

  useEffect(() => {
    sourcesApi.getAll().then(list => {
      setSources(list)
      if (list.length > 0) {
        setSourceId(list[0].id)
        setSystemType(list[0].systemType)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!sourceId) { setResponses([]); return }
    sourcesApi.getSimulatorResponses(sourceId).then(setResponses).catch(() => setResponses([]))
  }, [sourceId])

  function selectSource(id: string) {
    setSourceId(id)
    const src = sources.find(s => s.id === id)
    if (src && !typeOverride) setSystemType(src.systemType)
  }

  function selectType(t: LegacySystemType) {
    setSystemType(t)
    setTypeOverride(true)
  }

  // Reset override when source changes manually and user didn't explicitly choose type
  function handleSourceChange(id: string) {
    setTypeOverride(false)
    selectSource(id)
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const entity   = ENTITIES[entityKey]
  const methods  = entity.methods
  const safeIdx  = Math.min(methodIdx, methods.length - 1)
  const method   = methods[safeIdx]

  const isOpenEdge    = systemType === 'OpenEdgeSoap'
  const faultLabel    = method.faultLabel ?? (isOpenEdge ? 'SOAP Fault' : 'Error')
  const templateName  = isFault ? method.fault : method.nominal
  const template      = responses.find(r => r.method === templateName) ?? null
  const hasSource     = Boolean(sourceId)

  // Left panel (request)
  let leftContent: string
  if (isFault && method.faultIsVariant && isOpenEdge) {
    leftContent = oeResp(method.nominal, method.xmlVariantFields ?? '')
  } else if (isFault && method.faultIsVariant) {
    leftContent = `// ${method.faultLabel} — business variant (not a fault)\n` +
      buildNominalReq(method.nominal, method.xmlVariantFields ?? '', systemType)
  } else if (isFault) {
    leftContent = buildFaultReq(method.faultCode, method.faultMsg, method.faultDetail, systemType)
  } else {
    leftContent = buildNominalReq(method.nominal, method.xmlFields, systemType)
  }

  // Right panel (response)
  let rightContent: string
  if (!hasSource) {
    rightContent = `// Select a source above to load templates`
  } else if (template) {
    rightContent = prettyJson(template.responseJson)
  } else {
    rightContent = `// Template "${templateName}" not configured\n// Add it in Legacy Sources to see the response.`
  }

  const faultColor  = 'var(--red, #c0392b)'
  const okColor     = 'var(--green, #27ae60)'
  const xmlColor    = isOpenEdge ? 'var(--blue)' : 'var(--text-sub)'

  const leftLabel = isFault
    ? (method.faultIsVariant
        ? `${method.faultLabel ?? 'Variant'} response`
        : isOpenEdge ? 'SOAP Fault' : 'Error response')
    : (isOpenEdge ? 'SOAP Request (illustrative)' : systemType === 'AsmxDotNet' ? 'HTTP Request' : 'SOAP Request (illustrative)')

  const rightLabel = isFault ? 'JSON error response' : 'JSON response'

  const selectedSource = sources.find(s => s.id === sourceId)

  return (
    <div className="page">
      {/* Header */}
      <div className="page-hd">
        <div>
          <h1>Test Bench</h1>
          <p>Inspect request formats and simulate legacy responses</p>
        </div>
      </div>

      {/* Source + type selector bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', padding: '8px 0' }}>
          {/* Source */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 240 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>SOURCE</span>
            <select
              value={sourceId}
              onChange={e => handleSourceChange(e.target.value)}
              style={{ flex: 1, fontSize: 13, padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border)' }}
            >
              {sources.length === 0 && <option value="">No sources available</option>}
              {sources.map(s => (
                <option key={s.id} value={s.id}>
                  {systemTypeLabels[s.systemType as unknown as number] ?? s.systemType}
                  {' · '}
                  {s.systemUrl.replace(/^https?:\/\//, '').slice(0, 48)}
                  {s.isSimulated ? ' 🧪' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* System type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>TYPE</span>
            <select
              value={systemType}
              onChange={e => selectType(e.target.value as LegacySystemType)}
              style={{ fontSize: 13, padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border)' }}
            >
              {SYSTEM_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {typeOverride && selectedSource && selectedSource.systemType !== systemType && (
              <button
                onClick={() => { setTypeOverride(false); setSystemType(selectedSource.systemType) }}
                style={{ fontSize: 11, color: 'var(--text-sub)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >reset</button>
            )}
          </div>

          {/* Simulated badge */}
          {selectedSource?.isSimulated && (
            <span className="pill orange" style={{ fontSize: 11 }}>🧪 Simulated mode</span>
          )}
          {selectedSource && !selectedSource.isSimulated && (
            <span className="pill gray" style={{ fontSize: 11 }}>Live mode — templates not served</span>
          )}
        </div>
      </div>

      {/* Main test area */}
      <div className="card" style={{ padding: 0 }}>

        {/* Controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          padding: '10px 20px', borderBottom: '1px solid var(--border)',
        }}>
          {/* Entity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 700 }}>ENTITY</span>
            <select
              value={entityKey}
              onChange={e => { setEntityKey(e.target.value); setMethodIdx(0); setIsFault(false) }}
              style={{ fontSize: 13, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', fontWeight: 600 }}
            >
              {ENTITY_KEYS.map(k => <option key={k} value={k}>{ENTITIES[k].label}</option>)}
            </select>
          </div>

          {/* Method */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 700 }}>METHOD</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {methods.map((m, i) => (
                <button
                  key={m.label}
                  onClick={() => { setMethodIdx(i); setIsFault(false) }}
                  style={{
                    padding: '3px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                    fontWeight: safeIdx === i ? 700 : 400,
                    background: safeIdx === i ? 'var(--blue)' : 'transparent',
                    color: safeIdx === i ? '#fff' : 'var(--text)',
                    border: '1px solid ' + (safeIdx === i ? 'var(--blue)' : 'var(--border)'),
                  }}
                >{m.label}</button>
              ))}
            </div>
          </div>

          {/* Fault toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', marginLeft: 8 }}>
            <input type="checkbox" checked={isFault} onChange={e => setIsFault(e.target.checked)} />
            <span style={{ fontSize: 12, fontWeight: 600, color: isFault ? faultColor : 'var(--text-sub)' }}>
              {faultLabel}
            </span>
          </label>

          {/* Template badge */}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: template ? okColor : 'var(--text-sub)' }}>
            {!hasSource
              ? '○ no source selected'
              : template
                ? `✓ ${templateName}${template.delayMs > 0 ? ` · ${template.delayMs}ms` : ''}`
                : `○ no template "${templateName}"`}
          </span>
        </div>

        {/* Split view */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 400 }}>

          {/* Left — request */}
          <div style={{ padding: '12px 16px', borderRight: '1px solid var(--border)' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, marginBottom: 6,
              color: isFault ? faultColor : xmlColor,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {leftLabel}
            </div>
            <textarea
              readOnly
              value={leftContent}
              style={{
                width: '100%', height: 380, resize: 'vertical',
                fontFamily: 'monospace', fontSize: 11,
                background: (isFault && !method.faultIsVariant) ? 'var(--bg-error, #fff8f8)' : 'var(--bg-code, #f8f9fb)',
                border: '1px solid ' + (isFault ? faultColor : 'var(--border)'),
                borderRadius: 4, padding: 8, lineHeight: 1.5,
                color: 'var(--text)', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Right — response */}
          <div style={{ padding: '12px 16px' }}>
            <div style={{
              fontSize: 11, fontWeight: 700, marginBottom: 6,
              color: isFault ? faultColor : okColor,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {rightLabel}
            </div>
            <textarea
              readOnly
              value={rightContent}
              style={{
                width: '100%', height: 380, resize: 'vertical',
                fontFamily: 'monospace', fontSize: 11,
                background: template
                  ? (isFault ? 'var(--bg-error, #fff8f8)' : 'var(--bg-code, #f8f9fb)')
                  : 'var(--bg-muted, #f4f4f5)',
                border: '1px solid ' + (isFault ? faultColor : 'var(--border)'),
                borderRadius: 4, padding: 8, lineHeight: 1.5,
                color: template ? 'var(--text)' : 'var(--text-sub)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 20px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-sub)', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Request format is illustrative · JSON response is served by the simulator when Simulated mode is active</span>
          <span style={{ color: 'var(--text-sub)' }}>
            {systemType === 'AsmxDotNet' ? 'ASMX .NET · REST/JSON' : `${SYSTEM_TYPES.find(t => t.value === systemType)?.label} · SOAP`}
          </span>
        </div>
      </div>
    </div>
  )
}
