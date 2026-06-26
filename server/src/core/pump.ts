import {type ChatSocket, SOCKET_OPEN} from './socket';
import type {ProviderStreamEvent} from './provider';

// Turn provider events into socket messages. Shared by queue and cloud paths.
// Caller owns AbortController and timeout; pump just reads signal.
export async function streamToSocket(
  ws: ChatSocket,
  id: string,
  stream: AsyncGenerator<ProviderStreamEvent>,
  signal: AbortSignal,
): Promise<void> {
  try {
    for await (const event of stream) {
      if (ws.readyState !== SOCKET_OPEN) break;

      if (event.kind === 'started') {
        ws.send(
          JSON.stringify({
            type: 'started',
            id,
            ...(event.reasoning ? {reasoning: true} : {}),
          }),
        );
      } else if (event.kind === 'content') {
        ws.send(JSON.stringify({type: 'content', id, delta: event.delta}));
      } else if (event.kind === 'done') {
        ws.send(JSON.stringify({type: 'done', id}));
        break;
      } else if (event.kind === 'error') {
        ws.send(
          JSON.stringify({
            type: 'error',
            id,
            code: event.code,
            message: event.message,
          }),
        );
        break;
      }
    }
  } catch (err) {
    // Expected abort (timeout or disconnect). Only send timeout if socket is open.
    if (signal.aborted) {
      if (ws.readyState === SOCKET_OPEN) {
        ws.send(
          JSON.stringify({
            type: 'error',
            id,
            code: 'timeout',
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
            id,
            code: 'transient',
            message: 'Error occurred during streaming',
          }),
        );
      }
    }
  }
}
