import { useEffect, useRef, useState } from 'react'
import { chatApi, ChatMessage } from '../../api/chat'

export default function Chat() {
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const bottomRef                 = useRef<HTMLDivElement>(null)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      // Send history without the new message (handler appends it)
      const result = await chatApi.sendMessage(messages, text)
      setMessages([...next, { role: 'assistant', content: result.response }])
    } catch {
      setError("Impossible de joindre l'assistant. Veuillez réessayer.")
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearChat() {
    setMessages([])
    setError(null)
    textareaRef.current?.focus()
  }

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div>
          <h2 className="chat-title">⚡ Assistant LegacyBridge</h2>
          <p className="chat-subtitle">
            Posez vos questions sur vos sources, vos plans d'accès, ou la construction d'appels legacy.
          </p>
        </div>
        {messages.length > 0 && (
          <button className="btn-secondary" onClick={clearChat} style={{ alignSelf: 'flex-start' }}>
            Nouvelle conversation
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">🤖</div>
            <p>Bonjour ! Comment puis-je vous aider avec LegacyBridge ?</p>
            <div className="chat-suggestions">
              {[
                'Comment construire un appel JSON pour une méthode legacy ?',
                'Expliquez-moi le fonctionnement des plans d\'accès.',
                'Comment diagnostiquer une erreur HTTP 400 ?',
                'Quels types d\'authentification sont supportés ?',
              ].map(s => (
                <button key={s} className="chat-suggestion" onClick={() => { setInput(s); textareaRef.current?.focus() }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble-row ${m.role}`}>
            <div className={`chat-bubble ${m.role}`}>
              <pre className="chat-text">{m.content}</pre>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-row assistant">
            <div className="chat-bubble assistant chat-typing">
              <span /><span /><span />
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error">{error}</div>
        )}

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
          placeholder="Écrivez votre message… (Entrée pour envoyer, Shift+Entrée pour sauter une ligne)"
          disabled={loading}
          autoFocus
        />
        <button
          className="btn-primary chat-send-btn"
          onClick={send}
          disabled={loading || !input.trim()}
        >
          {loading ? '…' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}
