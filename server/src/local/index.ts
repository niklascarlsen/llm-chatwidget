import type {ClientRequest, OutgoingMessage} from '@chatwidget/shared';
import {createQueueManager} from './queue';
import {createRateLimiter} from '../core/rateLimit';
import {streamOllamaChat} from './ollama';
import {sendError, type ChatSocket} from '../core/socket';

// Local Ollama behind a one-at-a-time queue. For exposing a local GPU over a tunnel.

// Stops one IP from flooding the queue.
const RATE_LIMIT = {max: 10, windowMs: 60_000} as const;

export function createLocalRunner() {
  const queue = createQueueManager();
  const limiter = createRateLimiter(RATE_LIMIT.max, RATE_LIMIT.windowMs);

  const handle = (
    ws: ChatSocket,
    request: ClientRequest,
    messages: OutgoingMessage[],
  ) => {
    if (!limiter.take(ws.data.clientIp)) {
      sendError(ws, request.id, 'rate_limit', 'Rate limit exceeded.');
      return;
    }
    // Queue is provider-agnostic; pass the Ollama stream fn.
    queue.enqueue(ws, {...request, messages}, streamOllamaChat);
  };

  const closeSocket = (ws: ChatSocket) => queue.removeSocket(ws);

  return {handle, closeSocket};
}

export type LocalRunner = ReturnType<typeof createLocalRunner>;
