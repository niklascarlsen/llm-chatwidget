import {useCallback, useEffect, useRef} from 'react';
import type {ChatErrorKind} from '@/lib/errors';
import {useStreamPresentation} from '../stream';
import {useChatScroll} from '../hooks/useChatScroll';
import {useChatUI} from '../hooks/useChatUI';
import {useChatWebSocket} from '../hooks/useChatWebSocket';
import {useChatMessages, type ChatMessages} from '../hooks/useChatMessages';
import {ChatContext, type ChatContextValue} from './ChatContext';

// Composes the four domain hooks plus the stream presentation, wires their
// cross-dependencies, and shares everything via context so the layout and its
// children don't prop-drill.
export function ChatProvider({children}: {children: React.ReactNode}) {
  // Back-edges for the two dependency cycles. The connection reports errors into
  // the message thread, and a submit resets the scroll tracker.
  const messagesApiRef = useRef<ChatMessages | null>(null);
  const resetScrollRef = useRef<() => void>(() => {});

  const onError = useCallback(
    (kind: ChatErrorKind) => messagesApiRef.current?.appendError(kind),
    [],
  );
  const onIdle = useCallback(() => messagesApiRef.current?.onIdle(), []);
  const onSubmit = useCallback(() => resetScrollRef.current(), []);

  const connection = useChatWebSocket({onError, onIdle});

  const messages = useChatMessages({connection, onSubmit});
  messagesApiRef.current = messages;

  const ui = useChatUI({
    isGenerating: messages.isGenerating,
    hasStarted: connection.hasStarted,
    queuePosition: connection.queuePosition,
    queueLength: connection.queueLength,
    isSomeoneProcessing: connection.isSomeoneProcessing,
    isReasoning: connection.isReasoning,
    receivedText: connection.receivedText,
  });

  const streamPresentation = useStreamPresentation({
    receivedText: connection.receivedText,
    isStreamComplete: connection.isStreamComplete,
    isGenerating: messages.isGenerating,
  });

  const scroll = useChatScroll({
    isChatOpen: ui.isChatOpen,
    isGenerating: messages.isGenerating,
    messages: messages.messages,
    hasVisibleContent: streamPresentation.hasVisibleContent,
    visibleText: streamPresentation.visibleText,
  });
  resetScrollRef.current = () => scroll.setUserScrolledUp(false);

  // Move the reply into the thread only once the server is done and the
  // presentation (e.g. word-queue catch-up) has settled.
  const {finalize} = messages;
  const {isStreamComplete, receivedText} = connection;
  const {isPresentationComplete} = streamPresentation;
  useEffect(() => {
    if (!isStreamComplete || !isPresentationComplete) return;
    finalize(receivedText);
  }, [isStreamComplete, isPresentationComplete, receivedText, finalize]);

  const value: ChatContextValue = {
    isChatOpen: ui.isChatOpen,
    setIsChatOpen: ui.setIsChatOpen,
    closeChat: ui.closeChat,
    greeting: ui.greeting,
    statusAnnouncement: ui.statusAnnouncement,
    liveAnnouncement: messages.liveAnnouncement,
    messages: messages.messages,
    input: messages.input,
    loading: messages.loading,
    isGenerating: messages.isGenerating,
    handleInputChange: messages.handleInputChange,
    sendPrompt: messages.sendPrompt,
    retryLastMessage: messages.retryLastMessage,
    clearMessages: messages.clearMessages,
    receivedText: connection.receivedText,
    hasStarted: connection.hasStarted,
    isReasoning: connection.isReasoning,
    queuePosition: connection.queuePosition,
    queueLength: connection.queueLength,
    isSomeoneProcessing: connection.isSomeoneProcessing,
    streamPresentation,
    chatContainerRef: scroll.chatContainerRef,
    chatEndRef: scroll.chatEndRef,
    userScrolledUp: scroll.userScrolledUp,
    scrollToBottom: scroll.scrollToBottom,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
