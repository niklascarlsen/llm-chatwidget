import {useEffect} from 'react';
import {chatSocket} from '@/components/chat/chatSocket';
import {useChatUIEffects} from '@/components/chat/hooks/useChatUIEffects';

export function ChatEffects() {
  useEffect(() => {
    chatSocket.connect();
    return () => chatSocket.dispose();
  }, []);

  useChatUIEffects();

  return null;
}
