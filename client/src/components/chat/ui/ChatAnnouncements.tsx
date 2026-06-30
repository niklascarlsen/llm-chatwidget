import {useChatStore} from '@/components/chat/store/chatStore';

// Screen reader live regions, kept separate so layout doesn't rerender on updates.
export const ChatAnnouncements = () => {
  const statusAnnouncement = useChatStore((s) => s.statusAnnouncement);
  const liveAnnouncement = useChatStore((s) => s.liveAnnouncement);

  return (
    <>
      <div className='sr-only' aria-live='polite' aria-atomic='true'>
        {statusAnnouncement}
      </div>
      {/* Only announce the final reply, not every token. */}
      <div className='sr-only' aria-live='polite' aria-atomic='true'>
        {liveAnnouncement}
      </div>
    </>
  );
};
