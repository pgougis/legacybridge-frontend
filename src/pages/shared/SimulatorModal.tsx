import { useEffect, useState } from 'react'
import { sourcesApi } from '../../api/sources'
import type { LegacySystemType, SimulatorResponseDto } from '../../api/types'

interface Props {
  sourceId:   string
  sourceUrl:  string
  systemType: LegacySystemType
  onClose:    () => void
}

// ─── Config types ─────────────────────────────────────────────────────────────

interface MethodDef {
  label:                string
  nominal:              string   // template method name
  fault:                string   // template method name for fault
  faultLabel?:          string   // overrides "SOAP Fault" label (e.g. "RUPTURE")
  faultIsVariant?:      boolean  // true = business variant, not a real SOAP Fault (no fault envelope)
  xmlNominal:           string
  xmlFault:             string
}

interface EntityDef {
  label:   string
  methods: MethodDef[]
}

// ─── SOAP envelope helpers ────────────────────────────────────────────────────

const soapReq = (method: string, fields: string) =>
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

const soapFault = (code: string, msg: string, detail: string) =>
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

const soapResp = (method: string, fields: string) =>
`<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <${method}Response>
${fields.split('\n').map(l => '      ' + l).join('\n')}
    </${method}Response>
  </soapenv:Body>
</soapenv:Envelope>`

// ─── Entity / method config ───────────────────────────────────────────────────

const ENTITIES: Record<string, EntityDef> = {

  Client: {
    label: 'Client',
    methods: [
      {
        label: 'Get', nominal: 'GetClient', fault: 'GetClient.ERR_404',
        xmlNominal: soapReq('GetClient', '<P-CLI-CODE>C001</P-CLI-CODE>'),
        xmlFault:   soapFault('CLI-404', 'CUSTOMER NOT FOUND', ''),
      },
      {
        label: 'Create', nominal: 'CreateClient', fault: 'CreateClient.ERR_CLIENT',
        xmlNominal: soapReq('CreateClient',
          '<P-CLI-NAME>ACME CORPORATION</P-CLI-NAME>\n' +
          '<P-CLI-FIRSTNAME>JOHN</P-CLI-FIRSTNAME>\n' +
          '<P-CLI-ADR1>350 FIFTH AVENUE</P-CLI-ADR1>\n' +
          '<P-CLI-ZIP>10118</P-CLI-ZIP>\n' +
          '<P-CLI-CITY>NEW YORK</P-CLI-CITY>\n' +
          '<P-CLI-STATE>NY</P-CLI-STATE>\n' +
          '<P-CLI-COUNTRY>US</P-CLI-COUNTRY>\n' +
          '<P-CLI-EMAIL>contact@acmecorp.com</P-CLI-EMAIL>\n' +
          '<P-CLI-PHONE>2125551234</P-CLI-PHONE>'),
        xmlFault: soapFault('CLI-001', 'DUPLICATE CLIENT — EMAIL ALREADY EXISTS', ''),
      },
      {
        label: 'Update', nominal: 'UpdateClient', fault: 'UpdateClient.ERR_404',
        xmlNominal: soapReq('UpdateClient',
          '<P-CLI-CODE>C001</P-CLI-CODE>\n' +
          '<P-CLI-PHONE>2125559999</P-CLI-PHONE>\n' +
          '<P-CLI-EMAIL>newemail@acmecorp.com</P-CLI-EMAIL>\n' +
          '<P-CLI-CREDIT-LIMIT>25000.00</P-CLI-CREDIT-LIMIT>'),
        xmlFault: soapFault('CLI-404', 'CUSTOMER NOT FOUND', ''),
      },
      {
        label: 'Delete', nominal: 'DeleteClient', fault: 'DeleteClient.ERR_404',
        xmlNominal: soapReq('DeleteClient', '<P-CLI-CODE>C001</P-CLI-CODE>'),
        xmlFault:   soapFault('CLI-403', 'CUSTOMER BLOCKED — CANNOT DELETE',
          '<P-CLI-BALANCE>21500.00</P-CLI-BALANCE>'),
      },
      {
        label: 'List', nominal: 'GetClients', fault: 'GetClients.ERR_404',
        xmlNominal: soapReq('GetClients',
          '<P-FILTER-STATUS>A</P-FILTER-STATUS>\n' +
          '<P-FILTER-CITY>NEW YORK</P-FILTER-CITY>'),
        xmlFault: soapFault('CLI-500', 'INTERNAL SERVER ERROR — UNABLE TO RETRIEVE CLIENT LIST', ''),
      },
    ],
  },

  Article: {
    label: 'Article',
    methods: [
      {
        label: 'Get', nominal: 'GetArticle', fault: 'GetArticle.ERR_404',
        xmlNominal: soapReq('GetArticle', '<P-ART-CODE>ART001</P-ART-CODE>'),
        xmlFault:   soapFault('ART-404', 'ITEM NOT FOUND', ''),
      },
      {
        label: 'Stock', nominal: 'GetStock', fault: 'GetStock.RUPTURE',
        faultLabel: 'Out of Stock', faultIsVariant: true,
        xmlNominal: soapReq('GetStock', '<P-ART-CODE>ART001</P-ART-CODE>'),
        xmlFault: soapResp('GetStock',
          '<P-RETOUR>OK</P-RETOUR>\n' +
          '<P-ART-CODE>ART001</P-ART-CODE>\n' +
          '<P-STOCK-ON-HAND>0</P-STOCK-ON-HAND>\n' +
          '<P-STOCK-RESERVED>0</P-STOCK-RESERVED>\n' +
          '<P-STOCK-AVAILABLE>0</P-STOCK-AVAILABLE>\n' +
          '<P-STOCK-UNIT>EA</P-STOCK-UNIT>\n' +
          '<P-WAREHOUSE>WH-NYC-01</P-WAREHOUSE>\n' +
          '<P-MESSAGE>OUT OF STOCK — REORDER EXPECTED 04/30/2026</P-MESSAGE>'),
      },
    ],
  },

  Commande: {
    label: 'Commande',
    methods: [
      {
        label: 'Get', nominal: 'GetCommande', fault: 'GetCommande.ERR_404',
        xmlNominal: soapReq('GetCommande', '<P-ORDER-NUM>ORD-2026-00123</P-ORDER-NUM>'),
        xmlFault:   soapFault('ORD-404', 'ORDER NOT FOUND', ''),
      },
      {
        label: 'Create', nominal: 'CreateCommande', fault: 'CreateCommande.ERR_CLIENT',
        xmlNominal: soapReq('CreateCommande',
          '<P-CUST-CODE>C001</P-CUST-CODE>\n' +
          '<P-LINES>\n' +
          '  <P-LINE><P-LINE-ITEM>ART001</P-LINE-ITEM><P-LINE-QTY>2</P-LINE-QTY></P-LINE>\n' +
          '  <P-LINE><P-LINE-ITEM>ART002</P-LINE-ITEM><P-LINE-QTY>10</P-LINE-QTY></P-LINE>\n' +
          '</P-LINES>'),
        xmlFault: soapFault('CUST-001', 'CUSTOMER NOT FOUND OR BLOCKED', ''),
      },
      {
        label: 'List', nominal: 'GetCommandes', fault: 'GetCommandes.ERR_404',
        xmlNominal: soapReq('GetCommandes', '<P-CUST-CODE>C001</P-CUST-CODE>'),
        xmlFault:   soapFault('CUST-404', 'CUSTOMER NOT FOUND', ''),
      },
    ],
  },

}

const ENTITY_KEYS = Object.keys(ENTITIES)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prettyJson(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2) } catch { return raw }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SimulatorModal({ sourceId, sourceUrl, systemType, onClose }: Props) {
  const [responses,    setResponses]    = useState<SimulatorResponseDto[]>([])
  const [entityKey,    setEntityKey]    = useState<string>('Client')
  const [methodIndex,  setMethodIndex]  = useState<number>(0)
  const [isFault,      setIsFault]      = useState<boolean>(false)

  const isOpenEdge = systemType === 'OpenEdgeSoap'

  useEffect(() => {
    sourcesApi.getSimulatorResponses(sourceId).then(setResponses).catch(() => {})
  }, [sourceId])

  // ── Derived state ──────────────────────────────────────────────────────────

  const entity    = ENTITIES[entityKey]
  const methods   = entity.methods
  const safeIdx   = Math.min(methodIndex, methods.length - 1)
  const method    = methods[safeIdx]

  const faultLabel = isOpenEdge
    ? (method.faultLabel ?? 'SOAP Fault')
    : 'Error'

  const templateName = isFault ? method.fault : method.nominal
  const template     = responses.find(r => r.method === templateName) ?? null
  const xmlContent   = isFault ? method.xmlFault : method.xmlNominal

  const jsonContent = template
    ? prettyJson(template.responseJson)
    : `// — Template "${templateName}" not configured\n// Add it to see the response here.`

  const isSoapFaultXml = isFault && !method.faultIsVariant && isOpenEdge
  const xmlPanelLabel  = isFault
    ? (method.faultIsVariant
        ? `${method.faultLabel ?? 'Variant'} response (OpenEdge → LegacyBridge)`
        : isOpenEdge ? 'SOAP Fault (OpenEdge → LegacyBridge)' : 'Error response')
    : (isOpenEdge ? 'SOAP Request (client → OpenEdge)' : 'Request')

  const jsonPanelLabel = isFault ? 'JSON error response' : 'JSON response'

  const faultColor = 'var(--red, #c0392b)'
  const okColor    = 'var(--green, #27ae60)'
  const xmlColor   = isOpenEdge ? 'var(--blue)' : 'var(--text-sub)'

  // ── Handlers ──────────────────────────────────────────────────────────────

  function changeEntity(key: string) {
    setEntityKey(key)
    setMethodIndex(0)
    setIsFault(false)
  }

  function changeMethod(idx: number) {
    setMethodIndex(idx)
    setIsFault(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 980, width: '96vw' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-head">
          <div>
            <h2>🧪 Simulator</h2>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 2 }}>{sourceUrl}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

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
              onChange={e => changeEntity(e.target.value)}
              style={{ fontSize: 13, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', fontWeight: 600 }}
            >
              {ENTITY_KEYS.map(k => (
                <option key={k} value={k}>{ENTITIES[k].label}</option>
              ))}
            </select>
          </div>

          {/* Method */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 700 }}>METHOD</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {methods.map((m, i) => (
                <button
                  key={m.label}
                  onClick={() => changeMethod(i)}
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
            {template
              ? `✓ ${templateName}${template.delayMs > 0 ? ` · ${template.delayMs}ms` : ''}`
              : `○ no template "${templateName}"`}
          </span>
        </div>

        {/* Split view */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          minHeight: 360, padding: 0,
        }}>
          {/* XML panel */}
          <div style={{ padding: '12px 16px', borderRight: '1px solid var(--border)' }}>
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: isFault ? faultColor : xmlColor,
              marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {isSoapFaultXml && <span style={{ fontSize: 10, marginRight: 6, opacity: 0.7 }}>⚡</span>}
              {xmlPanelLabel}
            </div>
            <textarea
              readOnly
              value={xmlContent}
              style={{
                width: '100%', height: 340, resize: 'vertical',
                fontFamily: 'monospace', fontSize: 11,
                background: isSoapFaultXml ? 'var(--bg-error, #fff8f8)' : 'var(--bg-code, #f8f9fb)',
                border: '1px solid ' + (isFault ? faultColor : 'var(--border)'),
                borderRadius: 4, padding: 8, lineHeight: 1.5,
                color: 'var(--text)', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* JSON panel */}
          <div style={{ padding: '12px 16px' }}>
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: isFault ? faultColor : okColor,
              marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              {jsonPanelLabel}
            </div>
            <textarea
              readOnly
              value={jsonContent}
              style={{
                width: '100%', height: 340, resize: 'vertical',
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
        <div className="modal-footer">
          <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>
            {isOpenEdge
              ? 'OpenEdge SOAP · XML is illustrative · JSON is served by the simulator'
              : 'JSON served by the simulator · XML panel shows request format'}
          </span>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
