import type {ServerWebSocket} from 'bun';
import type {ServerErrorCode} from '@chatwidget/shared';

export interface SocketData {
  isAlive: boolean;
  // Real client IP from upgrade. Tunnel remoteAddress is useless for rate limiting.
  clientIp: string;
}

export type ChatSocket = ServerWebSocket<SocketData>;

// Bun readyState for an open socket.
export const SOCKET_OPEN = 1;

// Send an error frame if the socket is still open.
export function sendError(
  ws: ChatSocket,
  id: string,
  code: ServerErrorCode,
  message: string,
): void {
  if (ws.readyState !== SOCKET_OPEN) return;
  ws.send(JSON.stringify({type: 'error', id, code, message}));
}
