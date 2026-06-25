import {useCallback, useEffect, useState} from 'react';
import {getQueueStatusLabel} from '../../../lib/getQueueStatusLabel';
import {isDesktopViewport} from '@/lib/viewport';

const LAUNCHER_ID = 'ai-chat';
const CHAT_INPUT_ID = 'chat-input';
const CHAT_DIALOG_ID = 'chat-widget-dialog';

interface UseChatUIOptions {
  // Ingest/lifecycle state the screen-reader status line is derived from.
  isGenerating: boolean;
  hasStarted: boolean;
  queuePosition: number | null;
  queueLength: number | null;
  isSomeoneProcessing: boolean;
  isReasoning: boolean;
  receivedText: string;
}

export interface ChatUI {
  isChatOpen: boolean;
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeChat: () => void;
  greeting: string;
  statusAnnouncement: string;
}

// UI and a11y layer. Modal open state, time-based greeting, focus-on-open, and
// the polite screen-reader status announcement.
export function useChatUI({
  isGenerating,
  hasStarted,
  queuePosition,
  queueLength,
  isSomeoneProcessing,
  isReasoning,
  receivedText,
}: UseChatUIOptions): ChatUI {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [statusAnnouncement, setStatusAnnouncement] = useState('');

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    requestAnimationFrame(() => {
      document.getElementById(LAUNCHER_ID)?.focus();
    });
  }, []);

  // Desktop: focus the input. Mobile: focus the dialog so VoiceOver announces
  // the modal without opening the keyboard.
  useEffect(() => {
    if (!isChatOpen) return;
    const frameId = requestAnimationFrame(() => {
      if (isDesktopViewport()) {
        document.getElementById(CHAT_INPUT_ID)?.focus();
      } else {
        document.getElementById(CHAT_DIALOG_ID)?.focus({preventScroll: true});
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [isChatOpen]);

  useEffect(() => {
    if (!isChatOpen || !isGenerating) {
      setStatusAnnouncement('');
      return;
    }
    if (!hasStarted) {
      setStatusAnnouncement(
        getQueueStatusLabel(queuePosition, queueLength, isSomeoneProcessing),
      );
      return;
    }
    if (isReasoning && !receivedText) {
      setStatusAnnouncement('Reasoning');
      return;
    }
    if (receivedText) {
      setStatusAnnouncement('Assistant is replying');
      return;
    }
    setStatusAnnouncement('');
  }, [
    isChatOpen,
    isGenerating,
    hasStarted,
    queuePosition,
    queueLength,
    isSomeoneProcessing,
    isReasoning,
    receivedText,
  ]);

  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 4 && h < 12) setGreeting('Good morning!');
    else if (h >= 12 && h < 17) setGreeting('Good afternoon!');
    else if (h >= 17 && h < 23) setGreeting('Good evening!');
    else setGreeting('Good night!');
  }, []);

  return {isChatOpen, setIsChatOpen, closeChat, greeting, statusAnnouncement};
}
