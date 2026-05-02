import React, { useState } from 'react'
import { useAuth } from '../../ctx/auth'

// ── Tooltip ───────────────────────────────────────────────────────────────────
function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const [below, setBelow] = useState(false)

  function handleEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setBelow(rect.top < 220) // pas assez de place en haut → afficher en dessous
    }
    setShow(true)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          ...(below
            ? { top: 'calc(100% + 8px)' }
            : { bottom: 'calc(100% + 8px)' }),
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a2535', color: '#fff', borderRadius: 8,
          padding: '10px 14px', fontSize: 12, lineHeight: 1.6,
          whiteSpace: 'nowrap', zIndex: 100, minWidth: 220,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {content}
          <div style={{
            position: 'absolute',
            ...(below
              ? { bottom: '100%', borderBottom: '6px solid #1a2535', borderTop: 'none' }
              : { top: '100%', borderTop: '6px solid #1a2535', borderBottom: 'none' }),
            left: '50%', transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
          }} />
        </div>
      )}
    </div>
  )
}

// ── Infra Node ────────────────────────────────────────────────────────────────
function Node({ icon, label, color, tooltip }: {
  icon: string; label: string; color: string; tooltip: React.ReactNode
}) {
  return (
    <Tooltip content={tooltip}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '14px 18px', borderRadius: 12, cursor: 'default',
        background: color, border: '2px solid rgba(0,0,0,0.08)',
        minWidth: 110, transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 18px rgba(0,0,0,0.15)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        <span style={{ fontSize: 28 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1a2535', textAlign: 'center' }}>{label}</span>
      </div>
    </Tooltip>
  )
}

// ── Arrow ─────────────────────────────────────────────────────────────────────
function Arrow({ dir = 'right', label }: { dir?: 'right' | 'down'; label?: string }) {
  if (dir === 'down') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0' }}>
      {label && <span style={{ fontSize: 10, color: 'var(--text-sub)', fontStyle: 'italic' }}>{label}</span>}
      <div style={{ width: 2, height: 28, background: '#94a3b8' }} />
      <div style={{ width: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '8px solid #94a3b8' }} />
    </div>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px' }}>
      {label && <span style={{ fontSize: 10, color: 'var(--text-sub)', fontStyle: 'italic' }}>{label}</span>}
      <div style={{ height: 2, width: 28, background: '#94a3b8' }} />
      <div style={{ width: 0, borderTop: '6px solid transparent', borderBottom: '6px solid transparent', borderLeft: '8px solid #94a3b8' }} />
    </div>
  )
}

// ── Info row ──────────────────────────────────────────────────────────────────
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <span style={{ color: '#94a3b8', minWidth: 80 }}>{label}:</span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}

// ── Admin Infra Diagram ───────────────────────────────────────────────────────
function InfraDiagram() {
  return (
    <div style={{ padding: 24, background: 'var(--gray-lt)', borderRadius: 12, overflowX: 'auto' }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Architecture de production — survoler un élément pour les détails
      </div>

      {/* Main horizontal flow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', rowGap: 16 }}>

        <Node icon="🌐" label="Navigateur" color="#f0fdf4"
          tooltip={<>Utilisateur final<br />Tout navigateur moderne</>} />
        <Arrow />

        <Node icon="▲" label="Vercel Frontend" color="#e0f2fe"
          tooltip={<>
            <Info label="URL" value="legacybridge-frontend-nu.vercel.app" />
            <Info label="Repo" value="pgougis/legacybridge-frontend" />
            <Info label="Branche" value="master (auto-deploy)" />
            <Info label="Stack" value="React 18 + Vite + TypeScript" />
          </>} />
        <Arrow label="HTTPS / REST" />

        <Node icon="🟢" label="Render API" color="#f0fdf4"
          tooltip={<>
            <Info label="URL" value="legacybridge-backend-jtgq.onrender.com" />
            <Info label="Repo" value="alm77it-com/legacybridge-backend" />
            <Info label="Branche" value="master (auto-deploy)" />
            <Info label="Stack" value=".NET 8 ASP.NET Core" />
            <Info label="Port" value="10000 (interne)" />
          </>} />
        <Arrow label="SQL / TLS" />

        <Node icon="🐘" label="Supabase DB" color="#faf5ff"
          tooltip={<>
            <Info label="Host" value="aws-0-eu-central-1.pooler.supabase.com" />
            <Info label="Ref" value="evrkvpipdgjlihzskvdp" />
            <Info label="User" value="postgres.evrkvpipdgjlihzskvdp" />
            <Info label="Port" value="5432 (Session Pooler)" />
            <Info label="DB" value="postgres" />
          </>} />
      </div>

      {/* Tunnel vertical branch */}
      <div style={{ display: 'flex', marginLeft: 335, marginTop: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Arrow dir="down" label="SOAP via tunnel" />

          <Node icon="☁️" label="Cloudflare Tunnel" color="#fef9c3"
            tooltip={<>
              <Info label="Hostname" value="legacy.titawinit.com" />
              <Info label="Tunnel ID" value="68ad5c69-0e4c-48b9-9eab-fba005618903" />
              <Info label="Config" value="C:\Users\pgougis\.cloudflared\config.yml" />
              <Info label="Tâche" value="CloudflaredTunnel (schtasks)" />
              <Info label="Prérequis" value="VPN ada.local connecté" />
            </>} />

          <Arrow dir="down" />

          <Node icon="🏭" label="SOAP Legacy" color="#fff1f2"
            tooltip={<>
              <Info label="Host" value="srv-dlc-02.ada.local" />
              <Info label="Port" value="25011" />
              <Info label="Protocole" value="OpenEdge SOAP / WSA" />
              <Info label="Réseau" value="VPN ada.local requis" />
            </>} />
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: 24, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-sub)' }}>
        <span>🟢 Service actif</span>
        <span>☁️ Tunnel Cloudflare (VPN requis en local)</span>
        <span>▲ Auto-deploy sur push master</span>
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ marginBottom: 16, borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', fontWeight: 700, fontSize: 14, background: 'var(--gray-lt)', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        {title}
        <span style={{ fontSize: 11, opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '16px', fontSize: 13, lineHeight: 1.7 }}>{children}</div>}
    </div>
  )
}

// ── Manuals per role ──────────────────────────────────────────────────────────
function AdminManual() {
  return (
    <>
      <Section title="🏗️ Infrastructure de production">
        <InfraDiagram />
      </Section>

      <Section title="👤 Gestion des utilisateurs">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li><strong>Inviter</strong> — envoie un email avec lien de définition de mot de passe</li>
          <li><strong>✓ Confirm</strong> — confirme manuellement l'email sans passer par SMTP</li>
          <li><strong>Pwd</strong> — change le mot de passe directement</li>
          <li><strong>Act as</strong> — impersonation (session temporaire dans le rôle de l'utilisateur)</li>
          <li><strong>Daily Limit</strong> — quota journalier d'appels API (vide = illimité)</li>
          <li><strong>↺ Usage</strong> — remet le compteur d'appels à zéro</li>
        </ul>
      </Section>

      <Section title="🔌 Gestion des Legacy Sources">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li><strong>System URL</strong> — URL complète du WSDL OpenEdge (ex: <code>http://host:port/wsdl/...?wsdl</code>)</li>
          <li><strong>Autoriser les appels SOAP</strong> — checkbox à cocher pour whitelister le host de cette source</li>
          <li><strong>Auth</strong> — configure Basic / Header / OAuth2 pour l'authentification vers le SOAP</li>
          <li><strong>Swagger</strong> — ouvre un explorateur Swagger généré dynamiquement depuis le WSDL</li>
        </ul>
      </Section>

      <Section title="⚡ Call Legacy (admin)">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Sélectionner une source → les méthodes WSDL chargent automatiquement</li>
          <li>Remplir les paramètres → <strong>Send</strong></li>
          <li><strong>Bash Script</strong> — génère un script curl pour automatisation</li>
          <li>Le tunnel Cloudflare doit être actif si la source est derrière un VPN local</li>
        </ul>
      </Section>

      <Section title="📊 Usage & monitoring">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li><strong>Usage</strong> — graphe horaire/jour/mois/an par utilisateur (dropdown de sélection)</li>
          <li><strong>API Error Logs</strong> — tous les appels 4xx/5xx avec path et date</li>
          <li><strong>Audit Trail</strong> — actions admin : changements de rôle, suppressions, impersonation</li>
        </ul>
      </Section>

      <Section title="🌐 Tunnel Cloudflare">
        <div style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--gray-lt)', padding: 12, borderRadius: 8, marginBottom: 8 }}>
          {'# Démarrer le tunnel manuellement\nschtasks /run /tn "CloudflaredTunnel"\n\n# Vérifier\ncurl https://legacy.titawinit.com'}
        </div>
        <p style={{ margin: '8px 0 0', color: 'var(--text-sub)', fontSize: 12 }}>Le VPN ada.local doit être connecté avant de démarrer le tunnel.</p>
      </Section>
    </>
  )
}

function ManagerManual() {
  return (
    <>
      <Section title="🔌 Sources Legacy">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Créer une source avec l'URL WSDL du système legacy</li>
          <li>Configurer l'authentification via le bouton <strong>Auth</strong></li>
          <li>Ouvrir <strong>Swagger</strong> pour explorer et tester les méthodes</li>
          <li>Assigner des plans d'accès aux utilisateurs</li>
        </ul>
      </Section>

      <Section title="⚡ Call Legacy">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Sélectionner une source accessible</li>
          <li>Choisir une méthode dans la liste (chargée depuis le WSDL)</li>
          <li>Remplir les paramètres et cliquer <strong>Send</strong></li>
          <li>La réponse JSON s'affiche à droite</li>
          <li><strong>Bash Script</strong> — génère un script curl pour automatisation</li>
        </ul>
      </Section>

      <Section title="📋 Plans d'accès">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Créer un plan → définir les règles Allow/Deny par méthode (ex: <code>Get*</code>)</li>
          <li>Assigner le plan à un utilisateur</li>
          <li>Un utilisateur sans plan n'a accès à aucune méthode</li>
        </ul>
      </Section>

      <Section title="📊 Usage">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Consulter la consommation de vos utilisateurs (Today / Month / Year)</li>
          <li>Configurer un <strong>Daily Limit</strong> dans Edit User pour limiter les appels</li>
        </ul>
      </Section>
    </>
  )
}

function MemberManual() {
  return (
    <>
      <Section title="⚡ Faire un appel legacy">
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>Aller dans <strong>Call Legacy</strong></li>
          <li>Sélectionner la source (système cible)</li>
          <li>Choisir la méthode dans la liste</li>
          <li>Remplir les champs requis (marqués <span style={{ color: 'var(--red)' }}>*</span>)</li>
          <li>Cliquer <strong>Send</strong> — la réponse s'affiche à droite</li>
        </ol>
      </Section>

      <Section title="📊 Mon usage">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Consulter votre consommation d'appels API par période</li>
          <li>Si votre quota journalier est atteint, les appels retournent 429</li>
          <li>Contacter votre manager pour augmenter le quota</li>
        </ul>
      </Section>

      <Section title="🔌 Mes sources">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Liste des systèmes legacy auxquels vous avez accès via un plan</li>
          <li>Les méthodes disponibles dépendent des règles de votre plan d'accès</li>
        </ul>
      </Section>
    </>
  )
}

function ViewerManual() {
  return (
    <Section title="📊 Mon usage">
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        <li>Consulter votre consommation d'appels API par période (Today / Month / Year / 3 Years)</li>
        <li>Le graphe montre les appels par heure/jour/mois selon la période sélectionnée</li>
        <li>Contacter votre administrateur pour toute question sur votre accès</li>
      </ul>
    </Section>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ManualPage() {
  const { user } = useAuth()
  if (!user) return null

  const roleLabel: Record<string, string> = {
    Admin: 'Administrateur', Manager: 'Manager', Member: 'Membre', Viewer: 'Viewer',
  }

  return (
    <div className="page">
      <div className="page-hd">
        <div>
          <h1>Manuel utilisateur</h1>
          <p>Guide pour le profil <strong>{roleLabel[user.role] ?? user.role}</strong></p>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ maxWidth: 900 }}>
          {user.role === 'Admin'   && <AdminManual />}
          {user.role === 'Manager' && <ManagerManual />}
          {user.role === 'Member'  && <MemberManual />}
          {user.role === 'Viewer'  && <ViewerManual />}
        </div>
      </div>
    </div>
  )
}
