import {useEffect} from 'react';
import {getQueueStatusLabel} from '@/lib/getQueueStatusLabel';
// import {isDesktopViewport} from '@/lib/viewport';
import {useChatStore} from '@/components/chat/store/chatStore';

// const CHAT_INPUT_ID = 'chat-input';
// const CHAT_DIALOG_ID = 'chat-widget-dialog';

// Greeting, focus on open, screen reader status. Uses text length not full text.
export function useChatUIEffects() {
  const isChatOpen = useChatStore((s) => s.isChatOpen);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const hasStarted = useChatStore((s) => s.hasStarted);
  const isReasoning = useChatStore((s) => s.isReasoning);
  const queuePosition = useChatStore((s) => s.queuePosition);
  const queueLength = useChatStore((s) => s.queueLength);
  const isSomeoneProcessing = useChatStore((s) => s.isSomeoneProcessing);
  const hasReceivedText = useChatStore((s) => s.receivedText.length > 0);

  useEffect(() => {
    const h = new Date().getHours();
    let greeting = 'Good night!';
    if (h >= 4 && h < 12) greeting = 'Good morning!';
    else if (h >= 12 && h < 17) greeting = 'Good afternoon!';
    else if (h >= 17 && h < 23) greeting = 'Good evening!';
    useChatStore.setState({greeting});
  }, []);

/*   useEffect(() => {
    if (!isChatOpen) return;
    const frameId = requestAnimationFrame(() => {
      if (isDesktopViewport()) {
        document.getElementById(CHAT_INPUT_ID)?.focus();
      } else {
        document.getElementById(CHAT_DIALOG_ID)?.focus({preventScroll: true});
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [isChatOpen]); */

  useEffect(() => {
    let label = '';
    if (isChatOpen && isGenerating) {
      if (!hasStarted) {
        label = getQueueStatusLabel(queuePosition, queueLength, isSomeoneProcessing);
      } else if (isReasoning && !hasReceivedText) {
        label = 'Reasoning';
      } else if (hasReceivedText) {
        label = 'Assistant is replying';
      }
    }
    useChatStore.setState({statusAnnouncement: label});
  }, [
    isChatOpen,
    isGenerating,
    hasStarted,
    queuePosition,
    queueLength,
    isSomeoneProcessing,
    isReasoning,
    hasReceivedText,
  ]);
}
