export type MessageHandler = (message: Record<string, unknown>) => void

export class SocketClient {
  private ws: WebSocket | null = null
  private url: string
  private handlers = new Map<string, Set<MessageHandler>>()
  private globalHandlers = new Set<MessageHandler>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 2000
  private shouldReconnect = true

  constructor(url?: string) {
    this.url = url ?? import.meta.env.VITE_WS_URL ?? `ws://${location.host}/ws`
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return
    }

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('[SocketClient] Connected to', this.url)
      this.reconnectDelay = 2000
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as Record<string, unknown>
        // Always log inbound type so you can see in DevTools whether the message
        // actually arrived (and which type-specific handler should pick it up).
        const t = typeof msg.type === 'string' ? msg.type : '<no-type>'
        const subscribers = this.handlers.get(t)?.size ?? 0
        console.debug(`[SocketClient] ← type=${t} subscribers=${subscribers}`)
        // Notify global handlers
        for (const handler of this.globalHandlers) {
          handler(msg)
        }
        // Notify type-specific handlers
        if (typeof msg.type === 'string') {
          const typeHandlers = this.handlers.get(msg.type)
          if (typeHandlers) {
            for (const handler of typeHandlers) {
              handler(msg)
            }
          }
        }
      } catch {
        console.warn('[SocketClient] Non-JSON message received:', event.data)
      }
    }

    this.ws.onclose = () => {
      console.log('[SocketClient] Disconnected')
      this.ws = null
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = (err) => {
      console.error('[SocketClient] Error:', err)
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  /** Subscribe to messages of a specific `type` field value. */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => this.handlers.get(type)?.delete(handler)
  }

  /** Subscribe to all incoming messages. */
  onAny(handler: MessageHandler): () => void {
    this.globalHandlers.add(handler)
    return () => this.globalHandlers.delete(handler)
  }

  /** Send a JSON message to the server. */
  send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload))
    } else {
      console.warn('[SocketClient] Cannot send, socket not open')
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    console.log(`[SocketClient] Reconnecting in ${this.reconnectDelay}ms...`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      this.connect()
    }, this.reconnectDelay)
  }
}

/** Singleton instance for app-wide use. */
export const socketClient = new SocketClient()
