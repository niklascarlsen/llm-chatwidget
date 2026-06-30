import {MessageItem} from '@/components/chat/ui/MessageItem';
import {useChatStore} from '@/components/chat/store/chatStore';

// Message history. Only subscribes to messages.
export const MessageList = () => {
  const messages = useChatStore((s) => s.messages);
  const retryLastMessage = useChatStore((s) => s.retryLastMessage);

  const visible = messages.filter((m) => m.role !== 'system');

  return (
    <>
      {visible.map((msg, i, arr) => (
        <MessageItem
          key={msg.id}
          message={msg}
          onRetry={
            i === arr.length - 1 && msg.isError ? retryLastMessage : undefined
          }
        />
      ))}
    </>
  );
};
