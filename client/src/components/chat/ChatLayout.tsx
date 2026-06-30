import {ChatHeader} from '@/components/chat/ui/ChatHeader';
import {MessageList} from '@/components/chat/ui/MessageList';
import {ChatAnnouncements} from '@/components/chat/ui/ChatAnnouncements';
import {ScrollButton} from '@/components/chat/ui/ScrollButton';
import {InputSection} from '@/components/chat/ui/InputSection';
import {QuickQuestionsSection} from '@/components/chat/ui/QuickQuestionsSection';
import {StreamingDisplay} from '@/components/chat/ui/StreamingDisplay';
import {useChatScroll} from '@/components/chat/hooks/useChatScroll';
import {useChatStore} from '@/components/chat/store/chatStore';

export const ChatLayout = () => {
  const {chatContainerRef, chatEndRef, scrollToBottom} = useChatScroll();
  const hasMessages = useChatStore((s) => s.messages.length > 0);
  const isGenerating = useChatStore((s) => s.isGenerating);

  return (
    <div className='relative flex min-w-0 flex-col h-full bg-white overflow-hidden'>
      <ChatHeader />

      {hasMessages ? (
        <main
          ref={chatContainerRef}
          id='chat-widget-main'
          role='log'
          aria-label='Conversation'
          aria-busy={isGenerating}
          aria-relevant='additions'
          className='chat-messages flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-2 pt-4 outline-slate-900 space-y-2.5 max-md:touch-pan-y scrollbar-gutter-both'
        >
          <MessageList />
          <StreamingDisplay />
          <div ref={chatEndRef} />
        </main>
      ) : (
        <QuickQuestionsSection />
      )}

      <ChatAnnouncements />

      <ScrollButton scrollToBottom={scrollToBottom} />

      <InputSection />
    </div>
  );
};
