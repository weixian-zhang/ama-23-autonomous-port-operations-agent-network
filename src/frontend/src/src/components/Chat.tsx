import { useEffect, useRef, useState } from 'react'
import { socketClient } from '../SocketClient'

interface ChatMessage {
  role: 'agent' | 'user'
  text: string
}

const panelStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  background: '#000',
  border: '1px solid cyan',
  boxShadow: '0 0 8px cyan, inset 0 0 8px rgba(0,255,255,0.1)',
  borderRadius: 6,
  overflow: 'hidden',
}

const headerStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 13,
  fontWeight: 700,
  color: 'cyan',
  borderBottom: '1px solid rgba(0,255,255,0.3)',
  textTransform: 'uppercase',
  letterSpacing: 1,
}

const messagesStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
  color: '#e0e0e0',
}

function AgentPanel({ name, messages }: { name: string; messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>{name}</div>
      <div style={messagesStyle}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? 'rgba(0,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              padding: '4px 8px',
              borderRadius: 4,
              maxWidth: '85%',
            }}
          >
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export function Chat() {
  const [craneMessages, setCraneMessages] = useState<ChatMessage[]>([])
  const [fleetMessages, setFleetMessages] = useState<ChatMessage[]>([])
  const [yardMessages, setYardMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    socketClient.connect()
    const unsub = socketClient.on('fleet_market', (msg) => {
      const text = typeof msg.text === 'string' ? msg.text : JSON.stringify(msg)
      setFleetMessages((prev) => [...prev, { role: 'agent', text }])
    })
    return () => {
      unsub()
    }
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 8,
        boxSizing: 'border-box',
      }}
    >
      <AgentPanel name="Crane Auctioneer Agent" messages={craneMessages} />
      <AgentPanel name="Fleet Market Agent" messages={fleetMessages} />
      <AgentPanel name="Yard King Agent" messages={yardMessages} />
    </div>
  )
}
