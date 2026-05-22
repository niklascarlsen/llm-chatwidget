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

export interface ClientRequest {
  id: string;
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

export interface ErrorServerMessage {
  type: 'error';
  // Absent for pre-queue errors (bad JSON / missing params) that fire before
  // we have a request to attribute them to.
  id?: string;
  message: string;
}

export type ServerMessage =
  | QueueServerMessage
  | DoneServerMessage
  | ErrorServerMessage
  | {type: 'started'; id: string; reasoning?: boolean}
  | {type: 'content'; id: string; delta: string};
