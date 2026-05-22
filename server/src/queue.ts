import type {ServerWebSocket} from 'bun';
import type {ClientRequest} from '@chatwidget/shared';
import {systemPromptTest} from '../systemPrompts/assistant.prompt';
import {streamOllamaChat} from './ollama';

export interface SocketData {
  isAlive: boolean;
}

export type ChatSocket = ServerWebSocket<SocketData>;

const SOCKET_OPEN = 1;

// Hard ceiling on a single generation. Bounds head-of-line blocking: a hung
// Ollama request can never freeze the queue for everyone else. Sized for a
// local demo model; the client's response backstop sits just above this.
const GENERATION_TIMEOUT_MS = 40_000;

interface QueueEntry {
  ws: ChatSocket;
  request: ClientRequest;
}

// One request at a time. Clients get queue position updates while they wait.
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

  // Dequeue one request, prepend the system prompt, and stream tokens back.
  const processNext = async () => {
    if (isProcessing) return;
    const entry = queue.shift();
    if (!entry) return;

    const {ws, request} = entry;

    isProcessing = true;
    processingId = entry.request.id;
    activeSocket = ws;
    const controller = new AbortController();
    activeController = controller;
    broadcastPositions();

    console.log(
      `Processing request ID: ${request.id} with model: ${request.model}`,
    );

    const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    try {
      const messagesWithSystemPrompt = [
        {role: 'system' as const, content: systemPromptTest},
        ...request.messages,
      ];

      const stream = streamOllamaChat({
        model: request.model,
        messages: messagesWithSystemPrompt,
        signal: controller.signal,
      });

      for await (const event of stream) {
        if (ws.readyState !== SOCKET_OPEN) break;

        if (event.kind === 'started') {
          ws.send(
            JSON.stringify({
              type: 'started',
              id: request.id,
              ...(event.reasoning ? {reasoning: true} : {}),
            }),
          );
        } else if (event.kind === 'content') {
          ws.send(
            JSON.stringify({type: 'content', id: request.id, delta: event.delta}),
          );
        } else if (event.kind === 'done') {
          ws.send(JSON.stringify({type: 'done', id: request.id}));
          console.log(`Completed processing request ID: ${request.id}`);
          break;
        } else if (event.kind === 'error') {
          ws.send(
            JSON.stringify({type: 'error', id: request.id, message: event.message}),
          );
          break;
        }
      }
    } catch (err) {
      // An aborted generation is expected (client left or we hit the timeout),
      // not a server fault. Only surface a real error to a socket still open.
      if (controller.signal.aborted) {
        if (ws.readyState === SOCKET_OPEN) {
          ws.send(
            JSON.stringify({
              type: 'error',
              id: request.id,
              message: 'The request timed out. Please try again.',
            }),
          );
        }
      } else {
        console.error('Error during streaming:', err);
        if (ws.readyState === SOCKET_OPEN) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Error occurred during streaming',
            }),
          );
        }
      }
    } finally {
      clearTimeout(timeout);
      // Stop Ollama generating no matter how we left the loop (done, error, or
      // an early break on a closed socket).
      controller.abort();
      isProcessing = false;
      processingId = null;
      activeSocket = null;
      activeController = null;
      broadcastPositions();
      setTimeout(() => void processNext(), 10);
    }
  };

  const enqueue = (ws: ChatSocket, request: ClientRequest) => {
    queue.push({ws, request});
    broadcastPositions();
    void processNext();
  };

  const removeSocket = (ws: ChatSocket) => {
    // If the socket currently being served disconnected, abort its generation
    // instead of letting Ollama run to completion against nobody.
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
