import express from 'express';
import { createServer } from 'http';
import { setupWebSocket } from './websocket.js';
import { adapter, bot } from './bot.js';

const PORT = parseInt(process.env.PORT ?? '3978', 10);

const app = express();
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Azure Bot Service Message Endpoint ───────────────────────────────
// Configure this URL in Azure Bot Service → MS Teams channel:
//   https://<host>/api/messages

app.post('/api/messages', async (req, res) => {
  await adapter.process(req, res, (context) => bot.run(context));
});

// ── HTTP server + WebSocket ──────────────────────────────────────────

const server = createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log(`[Server] Bot endpoint: POST /api/messages`);
  console.log(`[Server] WebSocket:    ws://localhost:${PORT}/ws`);
});
