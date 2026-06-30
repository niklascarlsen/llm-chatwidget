import {useCallback, useEffect, useRef} from 'react';
import {useChatStore} from '@/components/chat/store/chatStore';

export interface ChatScroll {
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

// Scroll refs and auto-follow. Subscribes imperatively so tokens don't rerender layout.
export function useChatScroll(): ChatScroll {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);
  const hasScrolledOnOpen = useRef(false);

  const isChatOpen = useChatStore((s) => s.isChatOpen);
  const hasMessages = useChatStore((s) => s.messages.length > 0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({behavior});
  }, []);

  useEffect(() => {
    let rafId = 0;
    const unsubscribe = useChatStore.subscribe((state, prev) => {
      const textChanged = state.receivedText !== prev.receivedText;
      const messagesChanged = state.messages !== prev.messages;
      if (!textChanged && !messagesChanged) return;
      if (state.userScrolledUp) return;

      const shouldFollow =
        (messagesChanged && state.messages.length > 0) ||
        (textChanged && state.isGenerating && state.receivedText.length > 0);
      if (!shouldFollow) return;

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => scrollToBottom('auto'));
    });
    return () => {
      cancelAnimationFrame(rafId);
      unsubscribe();
    };
  }, [scrollToBottom]);

  useEffect(() => {
    if (
      isChatOpen &&
      !hasScrolledOnOpen.current &&
      useChatStore.getState().messages.length > 0
    ) {
      hasScrolledOnOpen.current = true;
      setTimeout(() => scrollToBottom('auto'), 0);
    }
    if (!isChatOpen) {
      hasScrolledOnOpen.current = false;
    }
  }, [isChatOpen, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const threshold = 5;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const scrolledUpward = container.scrollTop < lastScrollTopRef.current - 1;
    lastScrollTopRef.current = container.scrollTop;

    const {setUserScrolledUp} = useChatStore.getState();
    if (distanceFromBottom <= threshold) {
      setUserScrolledUp(false);
    } else if (scrolledUpward) {
      setUserScrolledUp(true);
    }
  }, []);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!isChatOpen || !container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isChatOpen, handleScroll, hasMessages]);

  return {chatContainerRef, chatEndRef, scrollToBottom};
}
