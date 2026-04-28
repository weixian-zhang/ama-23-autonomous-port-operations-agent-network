import { useEffect, useRef, useState } from 'react'
import { socketClient } from '../SocketClient'
import agvStackerConversations from '../data/agv-stacker-conversations.json'
import craneEdgeConversations from '../data/crane-edge-agent-conversation.json'
import yardKingConversations from '../data/fleetmarket-to-yardking-conversations.json'

interface ChatMessage {
  role: 'agent' | 'user'
  text: string
  source?: 'json' | 'ws'
}

type AgentId = 'crane_auctioneer' | 'fleet_market' | 'yard_king'

function AgentPanel({
  name,
  agentId,
  messages,
  onSend,
}: {
  name: string
  agentId: AgentId
  messages: ChatMessage[]
  onSend: (agentId: AgentId, text: string) => void
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    onSend(agentId, text)
    setInput('')
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-cyan-400 bg-black shadow-[0_0_8px_cyan,inset_0_0_8px_rgba(0,255,255,0.1)]">
      <div className="border-b border-cyan-400/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-cyan-400">
        {name}
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 text-[13px] text-gray-200">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded px-2 py-1 ${
              m.role === 'user'
                ? 'self-end bg-cyan-400/15'
                : 'self-start bg-white/5'
            } ${m.source === 'json' ? 'text-[#ffffff]' : 'text-[#33ff33] font-mono'}`}
          >
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-1 border-t border-cyan-400/30 p-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message…"
          className="flex-1 rounded border border-cyan-400/30 bg-white/5 px-2 py-1 text-xs text-gray-200 outline-none placeholder:text-gray-500"
        />
        <button
          onClick={handleSend}
          className="cursor-pointer rounded border border-cyan-400 bg-cyan-400/15 px-2.5 py-1 text-xs text-cyan-400"
        >
          ▶
        </button>
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
    const unsubFleet1 = socketClient.on('fleet-market', (msg) => {
      const text = typeof msg.message === 'string' ? msg.message : JSON.stringify(msg)
      setFleetMessages((prev) => [...prev, { role: 'agent', text, source: 'ws' }])
    })
    const unsubFleet2 = socketClient.on('teams-message', (msg) => {
      const from = typeof msg.from === 'string' ? msg.from : 'Teams'
      const text = typeof msg.text === 'string' ? `[${from}]: ${msg.text}` : JSON.stringify(msg)
      setFleetMessages((prev) => [...prev, { role: 'user', text, source: 'ws' }])
    })
    const unsubFleetMarket = () => { unsubFleet1(); unsubFleet2() }
    const unsubCrane = socketClient.on('crane_auctioneer', (msg) => {
      const text = typeof msg.text === 'string' ? msg.text : JSON.stringify(msg)
      setCraneMessages((prev) => [...prev, { role: 'agent', text, source: 'ws' }])
    })
    const unsubYard = socketClient.on('yard_king', (msg) => {
      const text = typeof msg.text === 'string' ? msg.text : JSON.stringify(msg)
      setYardMessages((prev) => [...prev, { role: 'agent', text, source: 'ws' }])
    })

    // Fleet Market: randomly pick AGV/stacker conversations every 2s
    // const fleetTimer = setInterval(() => {
    //   const entry = agvStackerConversations[Math.floor(Math.random() * agvStackerConversations.length)]
    //   const text = `${entry.name}: ${entry.message}`
    //   setFleetMessages((prev) => [...prev, { role: 'agent', text, source: 'json' }])
    // }, 10000)

    // Crane Auctioneer: randomly pick crane edge agent conversations every 10s
    const craneTimer = setInterval(() => {
      const entry = craneEdgeConversations[Math.floor(Math.random() * craneEdgeConversations.length)]
      const text = `${entry.crane_name} [bid:${entry.bid_value}]: ${entry.edge_thought}`
      setCraneMessages((prev) => [...prev, { role: 'agent', text, source: 'json' }])
    }, 10000)

    // Yard King: randomly pick fleet-to-yard conversations every 10s
    const yardTimer = setInterval(() => {
      const entry = yardKingConversations[Math.floor(Math.random() * yardKingConversations.length)]
      setYardMessages((prev) => [...prev, { role: 'agent', text: entry.message, source: 'json' }])
    }, 10000)

    return () => {
      unsubFleetMarket()
      unsubCrane()
      unsubYard()
      clearInterval(craneTimer)
      clearInterval(yardTimer)
    }
  }, [])

  const agentTypeMap: Record<AgentId, string> = {
    fleet_market: 'hive-fleet-market',
    crane_auctioneer: 'hive-crane-auctioneer',
    yard_king: 'hive-yard-king',
  }

  const handleSend = (agentId: AgentId, text: string) => {
    const setters: Record<AgentId, React.Dispatch<React.SetStateAction<ChatMessage[]>>> = {
      crane_auctioneer: setCraneMessages,
      fleet_market: setFleetMessages,
      yard_king: setYardMessages,
    }
    setters[agentId]((prev) => [...prev, { role: 'user', text }])
    socketClient.send({ type: agentTypeMap[agentId], message: text })
  }

  return (
    <div className="flex h-full w-full flex-col gap-2 box-border p-2">
      <AgentPanel name="Crane Auctioneer Agent" agentId="crane_auctioneer" messages={craneMessages} onSend={handleSend} />
      <AgentPanel name="Fleet Market Agent" agentId="fleet_market" messages={fleetMessages} onSend={handleSend} />
      <AgentPanel name="Yard King Agent" agentId="yard_king" messages={yardMessages} onSend={handleSend} />
    </div>
  )
}
