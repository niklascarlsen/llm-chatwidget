import {create} from 'zustand';
import {v4 as uuidv4} from 'uuid';
import type {ClientRequest, Provider} from '@chatwidget/shared';
import {CHAT_ERRORS, type ChatErrorKind} from '@/lib/errors';
import type {ChatMessage} from '@/components/chat/types';
import {chatSocket} from '@/components/chat/chatSocket';

const SELECTED_MODEL = 'llama3.1:8b';
// const SELECTED_MODEL = 'gemma4:e4b';
// const SELECTED_MODEL = 'gpt-oss';
const SELECTED_PROVIDER: Provider = 'ollama';

/* const SELECTED_MODEL = 'gemini-2.5-flash';
const SELECTED_PROVIDER: Provider = 'gemini'; */

const LOCAL_MAX_HISTORY = 10;

const LAUNCHER_ID = 'ai-chat';

// All widget state. Components subscribe to slices so typing and streaming
// don't rerender everything. Socket, scroll, and fade hooks read/write here.
export interface ChatState {
  input: string;
  messages: ChatMessage[];
  loading: boolean;
  isGenerating: boolean;
  liveAnnouncement: string;
  receivedText: string;
  hasStarted: boolean;
  isReasoning: boolean;
  queuePosition: number | null;
  queueLength: number | null;
  isSomeoneProcessing: boolean;
  isChatOpen: boolean;
  greeting: string;
  statusAnnouncement: string;
  userScrolledUp: boolean;

  setInput: (value: string) => void;
  openChat: () => void;
  closeChat: () => void;
  setUserScrolledUp: (value: boolean) => void;

  sendPrompt: (quick?: string) => void;
  stopGeneration: () => void;
  retryLastMessage: () => void;
  clearMessages: () => void;

  appendError: (kind: ChatErrorKind) => void;
  finalize: (text: string) => void;
  submit: (conversation: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  input: '',
  messages: [],
  loading: false,
  isGenerating: false,
  liveAnnouncement: '',
  receivedText: '',
  hasStarted: false,
  isReasoning: false,
  queuePosition: null,
  queueLength: null,
  isSomeoneProcessing: false,
  isChatOpen: false,
  greeting: '',
  statusAnnouncement: '',
  userScrolledUp: false,

  setInput: (value) => set({input: value}),

  openChat: () => set({isChatOpen: true}),

  closeChat: () => {
    set({isChatOpen: false});
    requestAnimationFrame(() => {
      document.getElementById(LAUNCHER_ID)?.focus();
    });
  },

  setUserScrolledUp: (value) => set({userScrolledUp: value}),

  sendPrompt: (quick) => {
    const {input, loading, isGenerating, messages, submit} = get();
    const text = (quick ?? input).trim();
    if (!text) return;
    if (loading || isGenerating) return;

    set({input: ''});
    submit([...messages, {id: uuidv4(), role: 'user', content: text}]);
  },

  // Stop button. Only works once text is streaming, not during queue or reasoning.
  // Keeps whatever we got so far.
  stopGeneration: () => {
    const {hasStarted, isReasoning, receivedText, finalize} = get();
    if (!hasStarted || isReasoning) return;
    finalize(receivedText);
    chatSocket.cancelRequest();
  },

  // Remove trailing error bubbles and send again. User message stays in the list.
  retryLastMessage: () => {
    const {loading, isGenerating, messages, submit} = get();
    if (loading || isGenerating) return;

    const thread = [...messages];
    while (thread.length > 0 && thread[thread.length - 1].isError) {
      thread.pop();
    }
    if (!thread.some((m) => m.role === 'user')) return;

    submit(thread);
  },

  clearMessages: () => set({messages: []}),

  appendError: (kind) => {
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: uuidv4(),
          role: 'assistant',
          content: CHAT_ERRORS[kind].body,
          isError: true,
          errorKind: kind,
        },
      ],
    }));
  },

  // Add the finished reply to the thread. Called on the server's `done` frame
  // and by stopGeneration (keeps whatever streamed so far).
  finalize: (text) => {
    if (text.trim()) {
      set({liveAnnouncement: text});
      const {messages} = get();
      const last = messages[messages.length - 1];
      if (!(last && last.content === text)) {
        set({
          messages: [
            ...messages,
            {id: uuidv4(), role: 'assistant', content: text, model: SELECTED_MODEL},
          ],
        });
      }
    }
    set({
      receivedText: '',
      isGenerating: false,
      loading: false,
    });
  },

  submit: (conversation) => {
    set({
      messages: conversation,
      loading: true,
      isGenerating: true,
      liveAnnouncement: '',
      userScrolledUp: false,
    });
    chatSocket.prepareForNewRequest();

    // Error bubbles are UI only, don't send them as history.
    const filtered = conversation.filter((m) => !m.isError);
    const messagesForApi = (
      SELECTED_PROVIDER === 'ollama'
        ? filtered.slice(-LOCAL_MAX_HISTORY)
        : filtered
    ).map(({role, content}) => ({role, content}));

    const payload: ClientRequest = {
      id: uuidv4(),
      provider: SELECTED_PROVIDER,
      model: SELECTED_MODEL,
      messages: messagesForApi,
    };

    chatSocket.sendPayload(JSON.stringify(payload), payload.id);
  },
}));
