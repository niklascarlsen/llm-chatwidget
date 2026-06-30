import {ChatButton} from '@/components/chat/ui/ChatTriggerButton';
import {ChatDialog} from '@/components/chat/ChatDialog';
import {ChatLayout} from '@/components/chat/ChatLayout';
import {ChatEffects} from '@/components/chat/ChatEffects';
import {useChatStore} from '@/components/chat/store/chatStore';

function ChatShell() {
  const isChatOpen = useChatStore((s) => s.isChatOpen);
  const closeChat = useChatStore((s) => s.closeChat);
  return (
    <>
      <ChatButton />
      <ChatDialog isOpen={isChatOpen} onClose={closeChat}>
        <ChatLayout />
      </ChatDialog>
    </>
  );
}

export default function ChatMain() {
  return (
    <>
      <ChatEffects />
      <ChatShell />
    </>
  );
}
