import { createServer } from 'node:http';

import { DEFAULT_TICK_RATE, MAX_PLAYERS_PER_ROOM, PROTOCOL_VERSION } from '@desi-fighter/shared';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';

import { buildHealthPayload } from './health.js';

const SERVICE_NAME = 'desi-fighter-server';
const PORT = Number(process.env.SERVER_PORT ?? 2567);
const VERSION = process.env.SERVER_VERSION ?? '0.1.0';

const app = express();
app.disable('x-powered-by');

// Operational health check only. No accounts, no player data, no database.
app.get('/healthz', (_req, res) => {
  res.json(buildHealthPayload(SERVICE_NAME, VERSION, process.uptime() * 1000));
});

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// Phase 0 placeholder: no rooms are registered yet.
// Room definitions (lobby, ready, authoritative combat) arrive in Phase 4.
async function start(): Promise<void> {
  await gameServer.listen(PORT);
  console.info(
    `[server] ${SERVICE_NAME} v${VERSION} listening on http://localhost:${PORT} ` +
      `(health: /healthz, protocol: v${PROTOCOL_VERSION}, tick rate: ${DEFAULT_TICK_RATE}Hz, ` +
      `max players/room: ${MAX_PLAYERS_PER_ROOM})`,
  );
}

function shutdown(signal: string): void {
  console.info(`[server] ${signal} received, shutting down`);
  httpServer.close(() => {
    process.exit(0);
  });
  // Do not hang forever on a stuck connection.
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error: unknown) => {
  console.error('[server] failed to start:', error);
  process.exit(1);
});
