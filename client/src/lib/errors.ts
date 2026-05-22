export type ChatErrorKind =
  | 'unavailable' // backend can't be reached at all
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
