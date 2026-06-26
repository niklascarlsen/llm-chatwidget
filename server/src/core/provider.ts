import type {OutgoingMessage, ServerErrorCode} from '@chatwidget/shared';

// Stream events every provider emits. started before first token; reasoning means thinking first.
export type ProviderStreamEvent =
  | {kind: 'started'; reasoning: boolean}
  | {kind: 'content'; delta: string}
  | {kind: 'done'}
  // code for client copy, message for logs
  | {kind: 'error'; code: ServerErrorCode; message: string};

export interface ProviderRequest {
  model: string;
  // Includes system prompt from gateway. Each adapter maps to its wire format.
  messages: OutgoingMessage[];
  signal: AbortSignal;
}

// What every provider adapter must export.
export type ProviderStreamFn = (
  req: ProviderRequest,
) => AsyncGenerator<ProviderStreamEvent>;
