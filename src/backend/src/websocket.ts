import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

const clients = new Set<WebSocket>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected (total: ${clients.size})`);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[WS] Received:', message);
        // Echo back to sender as acknowledgement
        ws.send(JSON.stringify({ type: 'ack', data: message }));
      } catch {
        console.warn('[WS] Invalid JSON received');
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected (total: ${clients.size})`);
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message);
      clients.delete(ws);
    });
  });

  console.log('[WS] WebSocket server attached at /ws');
  return wss;
}

/**
 * Broadcast a message to all connected WebSocket clients.
 */
export function broadcast(payload: Record<string, unknown>): void {
  const data = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}
