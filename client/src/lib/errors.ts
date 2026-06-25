import type {ServerErrorCode} from '@chatwidget/shared';

export type ChatErrorKind =
  | 'unavailable' // backend can't be reached at all
  | 'rate_limit' // too many requests (our limiter or a provider 429)
  | 'transient' // server reported a momentary error mid-flight
  | 'interrupted' // the connection dropped while we were waiting
  | 'timeout'; // server stayed silent past the response deadline

export interface ChatErrorCopy {
  title: string;
  body: string;
}

export const CHAT_ERRORS: Record<ChatErrorKind, ChatErrorCopy> = {
  unavailable: {
    title: 'Service unavailable',
    body: 'The assistant is unavailable right now.',
  },
  rate_limit: {
    title: 'Too many requests',
    body: 'The assistant is busy right now. Please wait a few seconds and try again.',
  },
  transient: {
    title: 'Service unavailable',
    body: 'Something went wrong on our end.',
  },
  interrupted: {
    title: 'Connection lost',
    body: 'The connection was interrupted.',
  },
  timeout: {
    title: 'No response',
    body: 'The assistant took too long to respond.',
  },
};

// Map a server-sent error code to the copy key the UI renders. The two enums
// overlap by name today, but routing through here keeps the wire contract and
// the client's copy independent, and gives a safe default for an absent or
// unrecognized code (older or newer server).
export function serverErrorToKind(code: ServerErrorCode | undefined): ChatErrorKind {
  switch (code) {
    case 'rate_limit':
      return 'rate_limit';
    case 'unavailable':
      return 'unavailable';
    case 'timeout':
      return 'timeout';
    case 'transient':
      return 'transient';
    default:
      return 'transient';
  }
}
