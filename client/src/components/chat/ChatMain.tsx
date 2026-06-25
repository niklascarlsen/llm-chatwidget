import {ChatButton} from './ui/ChatTriggerButton';
import {ChatDialog} from './ChatDialog';
import {ChatLayout} from './ChatLayout';
import {ChatProvider} from './context/ChatProvider';
import {useChat} from './context/ChatContext';

// Launcher + dialog shell. All chat state lives in ChatProvider and is consumed
// via useChat(), so nothing is prop-drilled through here.
function ChatShell() {
  const {isChatOpen, setIsChatOpen, closeChat} = useChat();
  return (
    <>
      <ChatButton setIsOpen={setIsChatOpen} isOpen={isChatOpen} />
      <ChatDialog isOpen={isChatOpen} onClose={closeChat}>
        <ChatLayout />
      </ChatDialog>
    </>
  );
}

export default function ChatMain() {
  return (
    <ChatProvider>
      <ChatShell />
    </ChatProvider>
  );
}
