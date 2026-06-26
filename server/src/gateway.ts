import type {ClientRequest, OutgoingMessage} from '@chatwidget/shared';
import type {ChatSocket} from './core/socket';
import {systemPromptTest} from '../systemPrompts/assistant.prompt';
import {createLocalRunner} from './local';
import {createCloudRunner} from './cloud';

// Routes local (queued Ollama) vs cloud (direct APIs). Worlds don't know about each other.
export function createGateway() {
  const local = createLocalRunner();
  const cloud = createCloudRunner();

  const handleRequest = (ws: ChatSocket, request: ClientRequest) => {
    const messages: OutgoingMessage[] = [
      {role: 'system', content: systemPromptTest},
      ...request.messages,
    ];

    // No provider field means ollama, for older clients.
    const provider = request.provider ?? 'ollama';
    if (cloud.serves(provider)) {
      cloud.handle(ws, request, messages);
    } else {
      local.handle(ws, request, messages);
    }
  };

  const handleClose = (ws: ChatSocket) => {
    local.closeSocket(ws);
    cloud.closeSocket(ws);
  };

  return {handleRequest, handleClose};
}

export type Gateway = ReturnType<typeof createGateway>;
