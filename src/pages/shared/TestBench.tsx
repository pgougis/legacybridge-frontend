import { useState } from 'react'
import type { LegacySystemType } from '../../api/types'

// ─── SOAP request builders ────────────────────────────────────────────────────

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
  const jsonFields = fields
    .split('\n').map(l => l.trim()).filter(l => l.match(/<[^/][^>]*>[^<]+<\/[^>]+>/))
    .map(l => { const m = l.match(/<([^>]+)>([^<]+)<\//); return m ? `  "${m[1]}": "${m[2]}"` : null })
    .filter(Boolean).join(',\n')
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

function buildSoapRequest(method: string, fields: string, systemType: LegacySystemType): string {
  switch (systemType) {
    case 'OpenEdgeSoap': return oeReq(method, fields)
    case 'GenericSoap':  return genericSoapReq(method, fields)
    case 'AsmxDotNet':   return asmxReq(method, fields)
    case 'OracleSoap':   return oracleSoapReq(method, fields)
  }
}

// ─── JSON request builder (Client → LegacyBridge) ────────────────────────────

function buildJsonRequest(method: string, xmlFields: string): string {
  const body: Record<string, string> = {}
  for (const line of xmlFields.split('\n')) {
    const m = line.trim().match(/<([^>]+)>([^<]*)<\//)
    if (m) body[m[1]] = m[2]
  }
  return `POST /legacy-sources/{sourceId}/${method}
Content-Type: application/json
Authorization: Bearer {token}

${JSON.stringify(body, null, 2)}`
}

// ─── SOAP response builders (Legacy → LegacyBridge) ──────────────────────────

const oeResp = (method: string, fields: string) =>
`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <${method}Response>
${fields.split('\n').map(l => '      ' + l).join('\n')}
    </${method}Response>
  </soapenv:Body>
</soapenv:Envelope>`

function buildNominalSoapResponse(method: string, systemType: LegacySystemType): string {
  switch (systemType) {
    case 'OpenEdgeSoap':
      return oeResp(method,
        '<P-RETOUR>OK</P-RETOUR>\n' +
        `      <P-METHOD>${method}</P-METHOD>\n` +
        '      <P-DATA></P-DATA>')
    case 'GenericSoap':
      return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <${method}Response xmlns="urn:service">
      <status>SUCCESS</status>
      <code>0</code>
      <data/>
    </${method}Response>
  </soapenv:Body>
</soapenv:Envelope>`
    case 'AsmxDotNet':
      return `HTTP/1.1 200 OK
Content-Type: application/json

{
  "${method}Result": {
    "Success": true,
    "Data": null
  }
}`
    case 'OracleSoap':
      return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <${method}Response xmlns="urn:oracle:bpel:services">
      <OutputParameters>
        <status>S</status>
        <statusCode>0</statusCode>
        <message>OK</message>
      </OutputParameters>
    </${method}Response>
  </soapenv:Body>
</soapenv:Envelope>`
  }
}

function buildFaultSoapResponse(code: string, msg: string, detail: string, systemType: LegacySystemType): string {
  switch (systemType) {
    case 'OpenEdgeSoap':
      return `<?xml version="1.0" encoding="utf-8"?>
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
    case 'GenericSoap':
      return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>soapenv:Server</faultcode>
      <faultstring>${msg}</faultstring>
      <detail><errorCode>${code}</errorCode></detail>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`
    case 'AsmxDotNet':
      return `HTTP/1.1 400 Bad Request\nContent-Type: application/json\n\n{\n  "error": "${code}",\n  "message": "${msg}"\n}`
    case 'OracleSoap':
      return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <soapenv:Fault>
      <faultcode>ora:${code}</faultcode>
      <faultstring>${msg}</faultstring>
      <detail><ora:errorCode xmlns:ora="urn:oracle:bpel:services">${code}</ora:errorCode></detail>
    </soapenv:Fault>
  </soapenv:Body>
</soapenv:Envelope>`
  }
}

// ─── JSON response builders (LegacyBridge → Client) ──────────────────────────

function buildNominalJsonResponse(method: string, systemType: LegacySystemType): string {
  switch (systemType) {
    case 'OpenEdgeSoap': return prettyJson(JSON.stringify({ 'P-RETOUR': 'OK', 'P-METHOD': method, 'P-DATA': [] }))
    case 'GenericSoap':  return prettyJson(JSON.stringify({ status: 'SUCCESS', code: 0, data: {} }))
    case 'AsmxDotNet':   return prettyJson(JSON.stringify({ [`${method}Result`]: { Success: true, Data: null } }))
    case 'OracleSoap':   return prettyJson(JSON.stringify({ return: { status: 'S', statusCode: '0', message: 'OK' } }))
  }
}

function buildFaultJsonResponse(code: string, msg: string, systemType: LegacySystemType): string {
  switch (systemType) {
    case 'OpenEdgeSoap': return prettyJson(JSON.stringify({ 'P-RETOUR': 'KO', 'P-ERROR-CODE': code, 'P-MESSAGE': msg }))
    case 'GenericSoap':  return prettyJson(JSON.stringify({ status: 'ERROR', code, message: msg }))
    case 'AsmxDotNet':   return prettyJson(JSON.stringify({ error: code, message: msg }))
    case 'OracleSoap':   return prettyJson(JSON.stringify({ return: { status: 'E', statusCode: code, message: msg } }))
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
  xmlFields:       string
  xmlVariantFields?: string
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

// ─── Panel component ──────────────────────────────────────────────────────────

function Panel({
  step, label, sublabel, content, color, isError,
}: {
  step: string; label: string; sublabel: string
  content: string; color: string; isError?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
          background: color, color: '#fff',
          padding: '2px 7px', borderRadius: 3, flexShrink: 0,
        }}>{step}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-sub)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {sublabel}
        </span>
      </div>
      <textarea
        readOnly
        value={content}
        style={{
          flex: 1, minHeight: 280, resize: 'vertical',
          fontFamily: 'monospace', fontSize: 11,
          background: isError ? 'var(--bg-error, #fff8f8)' : 'var(--bg-code, #f8f9fb)',
          border: '1px solid ' + (isError ? color : 'var(--border)'),
          borderRadius: 4, padding: 8, lineHeight: 1.5,
          color: 'var(--text)', boxSizing: 'border-box', width: '100%',
        }}
      />
    </div>
  )
}

// ─── Arrow indicator ──────────────────────────────────────────────────────────

function FlowArrow({ dir, label }: { dir: '→' | '↓' | '←' | '↑'; label?: string }) {
  const isHoriz = dir === '→' || dir === '←'
  return (
    <div style={{
      display: 'flex', flexDirection: isHoriz ? 'row' : 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: isHoriz ? '0 4px' : '4px 0',
      gap: 4, color: 'var(--text-sub)', flexShrink: 0,
    }}>
      {label && <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-sub)' }}>{label}</span>}
      <span style={{ fontSize: isHoriz ? 18 : 16, lineHeight: 1 }}>{dir}</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TestBench() {
  const [systemType, setSystemType] = useState<LegacySystemType>('OpenEdgeSoap')
  const [entityKey,  setEntityKey]  = useState('Client')
  const [methodIdx,  setMethodIdx]  = useState(0)
  const [isFault,    setIsFault]    = useState(false)

  const entity  = ENTITIES[entityKey]
  const methods = entity.methods
  const safeIdx = Math.min(methodIdx, methods.length - 1)
  const method  = methods[safeIdx]

  const isOpenEdge = systemType === 'OpenEdgeSoap'
  const faultLabel = method.faultLabel ?? (isOpenEdge ? 'SOAP Fault' : 'Error')

  // ① JSON Request — always shows the same fields (request doesn't change on fault)
  const jsonReq = buildJsonRequest(method.nominal, method.xmlFields)

  // ② SOAP Request — always the nominal request sent to legacy
  const soapReq = buildSoapRequest(method.nominal, method.xmlFields, systemType)

  // ③ SOAP Response from legacy
  let soapResp: string
  if (isFault && method.faultIsVariant && isOpenEdge) {
    soapResp = oeResp(method.nominal, method.xmlVariantFields ?? '')
  } else if (isFault && method.faultIsVariant) {
    soapResp = buildNominalSoapResponse(method.nominal, systemType)
      + '\n// note: business variant — P-STOCK=0, not a fault'
  } else if (isFault) {
    soapResp = buildFaultSoapResponse(method.faultCode, method.faultMsg, method.faultDetail, systemType)
  } else {
    soapResp = buildNominalSoapResponse(method.nominal, systemType)
  }

  // ④ JSON Response to client
  const jsonResp = isFault
    ? buildFaultJsonResponse(method.faultCode, method.faultMsg, systemType)
    : buildNominalJsonResponse(method.nominal, systemType)

  const faultColor  = 'var(--red, #c0392b)'
  const okColor     = '#27ae60'
  const blueColor   = 'var(--blue, #2980b9)'
  const purpleColor = 'var(--purple, #8e44ad)'

  const p3Color = isFault && !method.faultIsVariant ? faultColor : okColor
  const p4Color = isFault ? faultColor : okColor

  const soapLabel = systemType === 'AsmxDotNet' ? 'HTTP Request' : 'SOAP Request'
  const soapRespLabel = systemType === 'AsmxDotNet' ? 'HTTP Response' : (isFault && !method.faultIsVariant ? 'SOAP Fault' : 'SOAP Response')

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Test Bench</h1>
          <p>Visualise the full transformation chain — JSON ↔ SOAP ↔ JSON</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>

        {/* Controls */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          padding: '10px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 700 }}>TYPE</span>
            <select value={systemType} onChange={e => setSystemType(e.target.value as LegacySystemType)}
              style={{ fontSize: 13, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)' }}>
              {SYSTEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 700 }}>ENTITY</span>
            <select value={entityKey} onChange={e => { setEntityKey(e.target.value); setMethodIdx(0); setIsFault(false) }}
              style={{ fontSize: 13, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', fontWeight: 600 }}>
              {ENTITY_KEYS.map(k => <option key={k} value={k}>{ENTITIES[k].label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 700 }}>METHOD</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {methods.map((m, i) => (
                <button key={m.label} onClick={() => { setMethodIdx(i); setIsFault(false) }} style={{
                  padding: '3px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                  fontWeight: safeIdx === i ? 700 : 400,
                  background: safeIdx === i ? 'var(--blue)' : 'transparent',
                  color: safeIdx === i ? '#fff' : 'var(--text)',
                  border: '1px solid ' + (safeIdx === i ? 'var(--blue)' : 'var(--border)'),
                }}>{m.label}</button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', marginLeft: 8 }}>
            <input type="checkbox" checked={isFault} onChange={e => setIsFault(e.target.checked)} />
            <span style={{ fontSize: 12, fontWeight: 600, color: isFault ? faultColor : 'var(--text-sub)' }}>
              {faultLabel}
            </span>
          </label>

          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-sub)' }}>
            {isFault ? faultLabel : method.nominal}
          </span>
        </div>

        {/* Flow legend */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 20px', borderBottom: '1px solid var(--border)',
          fontSize: 10, color: 'var(--text-sub)', background: 'var(--bg-alt, #f5f6f8)',
        }}>
          <span style={{ background: blueColor, color: '#fff', padding: '1px 6px', borderRadius: 2, fontWeight: 700 }}>①</span>
          <span>Client</span>
          <span>→→→</span>
          <span style={{ background: purpleColor, color: '#fff', padding: '1px 6px', borderRadius: 2, fontWeight: 700 }}>②</span>
          <span>LegacyBridge</span>
          <span>→→→</span>
          <span style={{ background: p3Color, color: '#fff', padding: '1px 6px', borderRadius: 2, fontWeight: 700 }}>③</span>
          <span>Legacy System</span>
          <span>→→→</span>
          <span style={{ background: purpleColor, color: '#fff', padding: '1px 6px', borderRadius: 2, fontWeight: 700 }}>Bridge</span>
          <span>→→→</span>
          <span style={{ background: p4Color, color: '#fff', padding: '1px 6px', borderRadius: 2, fontWeight: 700 }}>④</span>
          <span>Client</span>
          <span style={{ marginLeft: 'auto' }}>
            {isFault
              ? <span style={{ color: faultColor, fontWeight: 700 }}>⚠ Error path</span>
              : <span style={{ color: okColor, fontWeight: 700 }}>✓ Nominal path</span>}
          </span>
        </div>

        {/* 2×2 Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 32px 1fr',
          gridTemplateRows: 'auto 32px auto',
        }}>
          {/* Row 1 */}
          <div style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            <Panel
              step="① JSON"
              label="Request"
              sublabel="Client → LegacyBridge"
              content={jsonReq}
              color={blueColor}
            />
          </div>

          {/* Center top arrow */}
          <div style={{
            borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2,
          }}>
            <FlowArrow dir="→" />
          </div>

          <div style={{ borderBottom: '1px solid var(--border)' }}>
            <Panel
              step="② SOAP"
              label={soapLabel}
              sublabel="LegacyBridge → Legacy"
              content={soapReq}
              color={purpleColor}
            />
          </div>

          {/* Row 2 — vertical arrows */}
          <div style={{
            borderRight: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FlowArrow dir="↓" label="resp" />
          </div>
          <div style={{
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-alt, #f5f6f8)',
          }} />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FlowArrow dir="↓" label="req" />
          </div>

          {/* Row 3 */}
          <div style={{ borderRight: '1px solid var(--border)' }}>
            <Panel
              step="④ JSON"
              label="Response"
              sublabel="LegacyBridge → Client"
              content={jsonResp}
              color={p4Color}
              isError={isFault}
            />
          </div>

          {/* Center bottom arrow */}
          <div style={{
            borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2,
          }}>
            <FlowArrow dir="←" />
          </div>

          <div>
            <Panel
              step="③ SOAP"
              label={soapRespLabel}
              sublabel="Legacy → LegacyBridge"
              content={soapResp}
              color={p3Color}
              isError={isFault && !method.faultIsVariant}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 20px', borderTop: '1px solid var(--border)',
          fontSize: 11, color: 'var(--text-sub)', display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Request and response formats are illustrative</span>
          <span>{systemType === 'AsmxDotNet' ? 'ASMX .NET · REST/JSON' : `${SYSTEM_TYPES.find(t => t.value === systemType)?.label} · SOAP`}</span>
        </div>
      </div>
    </div>
  )
}
