import {ChatBubble} from '@/icons/ChatBubble';

interface ChatButtonProps {
  setIsOpen: (isOpen: boolean) => void;
  isOpen: boolean;
}

export const ChatButton = ({setIsOpen, isOpen}: ChatButtonProps) => {
  return (
    <button
      type='button'
      id='ai-chat'
      aria-label='Open online assistant'
      aria-expanded={isOpen}
      aria-controls='chat-widget-dialog'
      onClick={() => setIsOpen(true)}
      hidden={isOpen}
      className='fixed cursor-pointer bottom-20 right-2 z-40 h-9 w-9 grid place-content-center border border-black/70 bg-white text-slate-700 shadow-md transition-colors hover:bg-slate-50 hover:text-slate-900'
    >
      <ChatBubble className='ml-0.25' />
    </button>
  );
};
