import { useEffect, useRef, useState, useCallback } from 'react'
import { chatApi, ContactDto, MessageDto } from '../api/chat'
import { useAuth } from '../ctx/auth'

const POLL_INTERVAL = 5000

export default function ChatPage() {
  const { user }                              = useAuth()
  const [contacts, setContacts]               = useState<ContactDto[]>([])
  const [selected, setSelected]               = useState<ContactDto | null>(null)
  const [messages, setMessages]               = useState<MessageDto[]>([])
  const [input, setInput]                     = useState('')
  const [sending, setSending]                 = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const bottomRef                             = useRef<HTMLDivElement>(null)
  const textareaRef                           = useRef<HTMLTextAreaElement>(null)
  const pollRef                               = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Contacts ─────────────────────────────────────────────────────────────

  const refreshContacts = useCallback(async () => {
    try {
      const data = await chatApi.getContacts()
      setContacts(data ?? [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoadingContacts(true)
    refreshContacts().finally(() => setLoadingContacts(false))
  }, [refreshContacts])

  // ── Messages + polling ────────────────────────────────────────────────────

  const fetchMessages = useCallback(async (contactId: string) => {
    try {
      const data = await chatApi.getMessages(contactId)
      setMessages(data ?? [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!selected) return

    fetchMessages(selected.userId)

    pollRef.current = setInterval(async () => {
      await fetchMessages(selected.userId)
      await refreshContacts()       // met à jour les badges non-lus
    }, POLL_INTERVAL)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selected, fetchMessages, refreshContacts])

  // Scroll vers le bas sur nouveaux messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Sélection d'un contact ────────────────────────────────────────────────

  async function selectContact(contact: ContactDto) {
    setSelected(contact)
    setMessages([])
    setInput('')
    // Marquer comme lu immédiatement
    if (contact.unreadCount > 0) {
      await chatApi.markRead(contact.userId).catch(() => {})
      setContacts(prev => prev.map(c =>
        c.userId === contact.userId ? { ...c, unreadCount: 0 } : c))
    }
  }

  // ── Envoi ─────────────────────────────────────────────────────────────────

  async function send() {
    const text = input.trim()
    if (!text || sending || !selected) return
    setSending(true)
    setInput('')
    try {
      const msg = await chatApi.sendMessage(selected.userId, text)
      setMessages(prev => [...prev, msg])
    } catch { /* ignore */ } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const totalUnread = contacts.reduce((s, c) => s + c.unreadCount, 0)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="chat-page">
      {/* Sidebar contacts */}
      <aside className="chat-contacts">
        <div className="chat-contacts-head">
          Messages
          {totalUnread > 0 && <span className="chat-badge">{totalUnread}</span>}
        </div>

        {loadingContacts && <div className="chat-contacts-empty">Chargement…</div>}

        {!loadingContacts && contacts.length === 0 && (
          <div className="chat-contacts-empty">Aucun contact disponible.</div>
        )}

        {contacts.map(c => (
          <button
            key={c.userId}
            className={`chat-contact-item${selected?.userId === c.userId ? ' active' : ''}`}
            onClick={() => selectContact(c)}
          >
            <div className="chat-contact-avatar">
              {c.firstName[0]}{c.lastName[0]}
            </div>
            <div className="chat-contact-info">
              <div className="chat-contact-name">
                {c.firstName} {c.lastName}
              </div>
              <div className="chat-contact-role">{c.role}</div>
            </div>
            {c.unreadCount > 0 && (
              <span className="chat-badge">{c.unreadCount}</span>
            )}
          </button>
        ))}
      </aside>

      {/* Thread */}
      <div className="chat-thread">
        {!selected ? (
          <div className="chat-thread-empty">
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <p>Sélectionnez un contact pour démarrer une conversation.</p>
          </div>
        ) : (
          <>
            <div className="chat-thread-head">
              <div className="chat-contact-avatar sm">
                {selected.firstName[0]}{selected.lastName[0]}
              </div>
              <div>
                <div className="chat-thread-name">{selected.firstName} {selected.lastName}</div>
                <div className="chat-thread-role">{selected.role} · {selected.email}</div>
              </div>
            </div>

            <div className="chat-messages" ref={bottomRef as any}>
              {messages.length === 0 && (
                <div className="chat-thread-empty" style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-sub)', fontSize: 13 }}>
                    Aucun message. Commencez la conversation !
                  </p>
                </div>
              )}
              {messages.map(m => {
                const isMine = m.senderId === user?.userId
                return (
                  <div key={m.id} className={`chat-bubble-row ${isMine ? 'user' : 'assistant'}`}>
                    <div className={`chat-bubble ${isMine ? 'user' : 'assistant'}`}>
                      <pre className="chat-text">{m.content}</pre>
                      <div className="chat-time">
                        {new Date(m.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {isMine && <span style={{ marginLeft: 4 }}>{m.isRead ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <div className="chat-input-bar">
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                rows={2}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message… (Entrée pour envoyer)"
                disabled={sending}
                autoFocus
              />
              <button
                className="btn-primary chat-send-btn"
                onClick={send}
                disabled={sending || !input.trim()}
              >
                {sending ? '…' : 'Envoyer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
