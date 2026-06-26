// Shared WebSocket message types between client and server.
export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: Role;
  content: string;
  timestamp?: string;
  model?: string;
  isError?: boolean;
}

export interface OutgoingMessage {
  role: Role;
  content: string;
}

// Which backend serves the request. ollama uses the queue; cloud providers don't.
export type Provider = 'ollama' | 'gemini';

export interface ClientRequest {
  id: string;
  // Missing means ollama, for older clients.
  provider?: Provider;
  model: string;
  messages: OutgoingMessage[];
}

export interface QueueServerMessage {
  type: 'queue';
  id: string;
  position: number;
  length: number;
  isSomeoneProcessing: boolean;
}

export interface DoneServerMessage {
  type: 'done';
  id: string;
}

// Why the server sent an error. Client maps this to user-facing copy.
export type ServerErrorCode =
  | 'rate_limit' // too many requests
  | 'unavailable' // provider or model down or misconfigured
  | 'timeout' // hit the per-request cap
  | 'transient'; // retry might work

export interface ErrorServerMessage {
  type: 'error';
  // Missing on bad JSON etc before we have a request id
  id?: string;
  // Client maps code to copy. Missing means transient.
  code?: ServerErrorCode;
  // For logs and old clients. UI uses code, not message.
  message: string;
}

export type ServerMessage =
  | QueueServerMessage
  | DoneServerMessage
  | ErrorServerMessage
  | {type: 'started'; id: string; reasoning?: boolean}
  | {type: 'content'; id: string; delta: string};
