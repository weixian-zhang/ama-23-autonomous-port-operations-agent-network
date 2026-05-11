import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { FleetMarketChatAgent } from './agents/fleet-market/FleetMarketChatAgent.js';
import { CraneAuctioneerAgentChat } from './agents/crane-auctioneer/CraneAuctioneerAgentChat.js';
import { YardKingAgentChat } from './agents/yard-king/YardKingAgentChat.js';
import { sendToTeams } from './bot.js';

const clients = new Set<WebSocket>();

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected (total: ${clients.size})`);

    // Per-connection agent instances (maintains conversation history)
    const fleetMarketAgent = new FleetMarketChatAgent();
    const craneAuctioneerAgent = new CraneAuctioneerAgentChat();
    const yardKingAgent = new YardKingAgentChat();

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('[WS] Received:', message);

        const { type, message: userMessage } = message as { type?: string; message?: string };

        if (type === 'hive-fleet-market' && userMessage) {
          // Also forward to Teams
          await sendToTeams(userMessage);

          const reply = await fleetMarketAgent.chat(userMessage);

          ws.send(JSON.stringify({ type: 'fleet-market', message: reply }));

          // Also forward to Teams
          await sendToTeams(reply);

        } else if (type === 'hive-crane-auctioneer' && userMessage) {
          const reply = await craneAuctioneerAgent.chat(userMessage);
          ws.send(JSON.stringify({ type: 'crane_auctioneer', text: reply }));

        } else if (type === 'hive-yard-king' && userMessage) {
          const reply = await yardKingAgent.chat(userMessage);
          ws.send(JSON.stringify({ type: 'yard_king', text: reply }));

        } else {
          // Unhandled type – ack for now; additional types will be added later
          ws.send(JSON.stringify({ type: 'ack', data: message }));
        }
      } catch (err) {
        console.error('[WS] Error processing message:', err);
        ws.send(JSON.stringify({ type: 'error', text: 'Failed to process message' }));
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
  let sent = 0;
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
      sent += 1;
    }
  }
  // Loud diagnostic so it's obvious when a broadcast goes nowhere because no
  // frontend tab is connected (the most common cause of "backend broadcasts
  // but frontend never receives").
  const type = typeof payload.type === 'string' ? payload.type : '<no-type>';
  console.log(`[WS] broadcast type=${type} sent=${sent}/${clients.size}`);
  if (sent === 0) {
    console.warn(
      `[WS] broadcast had ZERO recipients (clients.size=${clients.size}). ` +
        `Is a frontend tab connected to ws://localhost:${process.env.PORT ?? '3978'}/ws?`,
    );
  }
}
