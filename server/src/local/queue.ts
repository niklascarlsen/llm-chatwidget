import type {ClientRequest} from '@chatwidget/shared';
import {type ChatSocket, SOCKET_OPEN} from '../core/socket';
import type {ProviderStreamFn} from '../core/provider';
import {streamToSocket} from '../core/pump';

// Cap per generation so a hang can't block the queue. Client timeout sits just above.
const GENERATION_TIMEOUT_MS = 40_000;

interface QueueEntry {
  ws: ChatSocket;
  request: ClientRequest;
  // Stream fn injected by caller; queue doesn't import providers.
  streamFn: ProviderStreamFn;
}

// One generation at a time to protect VRAM. Cloud providers skip this path.
// Owns FIFO order, position updates, and per-gen timeout.
export function createQueueManager() {
  let queue: QueueEntry[] = [];
  let isProcessing = false;
  let processingId: string | null = null;
  let activeSocket: ChatSocket | null = null;
  let activeController: AbortController | null = null;

  const broadcastPositions = () => {
    const length = queue.length;
    const isSomeoneProcessing = processingId !== null;
    queue.forEach((entry, idx) => {
      if (entry.ws.readyState === SOCKET_OPEN) {
        entry.ws.send(
          JSON.stringify({
            type: 'queue',
            id: entry.request.id,
            position: idx,
            length,
            isSomeoneProcessing,
          }),
        );
      }
    });
  };

  // Dequeue and pump to socket.
  const processNext = async () => {
    if (isProcessing) return;
    const entry = queue.shift();
    if (!entry) return;

    const {ws, request, streamFn} = entry;

    isProcessing = true;
    processingId = request.id;
    activeSocket = ws;
    const controller = new AbortController();
    activeController = controller;
    broadcastPositions();

    console.log(
      `Processing request ID: ${request.id} with model: ${request.model}`,
    );

    const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    try {
      const stream = streamFn({
        model: request.model,
        messages: request.messages,
        signal: controller.signal,
      });
      await streamToSocket(ws, request.id, stream, controller.signal);
      console.log(`Completed processing request ID: ${request.id}`);
    } finally {
      clearTimeout(timeout);
      // Always abort the underlying gen when we're done here.
      controller.abort();
      isProcessing = false;
      processingId = null;
      activeSocket = null;
      activeController = null;
      broadcastPositions();
      setTimeout(() => void processNext(), 10);
    }
  };

  const enqueue = (
    ws: ChatSocket,
    request: ClientRequest,
    streamFn: ProviderStreamFn,
  ) => {
    queue.push({ws, request, streamFn});
    broadcastPositions();
    void processNext();
  };

  const removeSocket = (ws: ChatSocket) => {
    // Abort active gen if this socket disconnected.
    if (activeSocket === ws && activeController) {
      activeController.abort();
    }
    const before = queue.length;
    queue = queue.filter((entry) => entry.ws !== ws);
    if (queue.length !== before) {
      broadcastPositions();
    }
  };

  return {enqueue, removeSocket};
}

export type QueueManager = ReturnType<typeof createQueueManager>;
