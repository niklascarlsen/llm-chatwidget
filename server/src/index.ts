import {Hono} from 'hono';
import type {ClientRequest, Provider} from '@chatwidget/shared';
import {isAllowedOrigin} from './origins';
import {type ChatSocket, type SocketData} from './core/socket';
import {createGateway} from './gateway';

const PORT = Number(process.env.PORT ?? 3000);

const gateway = createGateway();
const liveSockets = new Set<ChatSocket>();

const app = new Hono();

app.get('/health', (c) => c.json({ok: true}));

// Bun serves both HTTP and WebSocket on the same port.
const server = Bun.serve<SocketData>({
  port: PORT,
  hostname: '0.0.0.0',
  fetch(req, srv) {
    const url = new URL(req.url);

    if (url.pathname === '/' || url.pathname === '/ws') {
      const origin = req.headers.get('origin');
      if (!isAllowedOrigin(origin)) {
        console.log(`Rejected connection from origin: ${origin}`);
        return new Response('Forbidden origin', {status: 403});
      }

      // Real IP for rate limiter. Behind Cloudflare, use forwarded headers.
      // Only safe because origin check gates who can connect.
      const clientIp =
        req.headers.get('cf-connecting-ip') ??
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        srv.requestIP(req)?.address ??
        'unknown';

      const upgraded = srv.upgrade(req, {data: {isAlive: true, clientIp}});
      if (upgraded) return undefined;
      return new Response('WebSocket upgrade failed', {status: 426});
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws) {
      ws.data.isAlive = true;
      liveSockets.add(ws);
      console.log('New WebSocket connection established');
    },
    message(ws, raw) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
      } catch {
        ws.send(
          JSON.stringify({type: 'error', message: 'Invalid JSON format'}),
        );
        return;
      }

      if (!isClientRequest(parsed)) {
        ws.send(
          JSON.stringify({
            type: 'error',
            message:
              'Missing required parameters: id, model, and messages array',
          }),
        );
        return;
      }

      gateway.handleRequest(ws, parsed);
    },
    close(ws) {
      liveSockets.delete(ws);
      gateway.handleClose(ws);
      console.log('WebSocket connection closed');
    },
    pong(ws) {
      ws.data.isAlive = true;
    },
  },
});

// Drop connections that stop responding to ping.
const heartbeat = setInterval(() => {
  for (const ws of liveSockets) {
    if (ws.data.isAlive === false) {
      ws.terminate();
      liveSockets.delete(ws);
      gateway.handleClose(ws);
      continue;
    }
    ws.data.isAlive = false;
    ws.ping();
  }
}, 30_000);

const shutdown = () => {
  clearInterval(heartbeat);
  server.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const PROVIDERS: readonly Provider[] = ['ollama', 'gemini'];

function isClientRequest(value: unknown): value is ClientRequest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.model === 'string' &&
    Array.isArray(v.messages) &&
    (v.provider === undefined || PROVIDERS.includes(v.provider as Provider))
  );
}

console.log(`Server listening on 0.0.0.0:${PORT}`);
