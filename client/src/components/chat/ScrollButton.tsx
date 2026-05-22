import {ArrowDown} from '@/icons/ArrowDown';

interface ScrollButtonProps {
  userScrolledUp: boolean;
  hasMessages: boolean;
  loading: boolean;
  isGenerating: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

export const ScrollButton = ({
  userScrolledUp,
  hasMessages,
  loading,
  isGenerating,
  scrollToBottom,
}: ScrollButtonProps) => {
  const shouldShow = userScrolledUp && hasMessages && !loading && !isGenerating;
  if (!shouldShow) return null;

  return (
    <div className='absolute bottom-20 left-1/2 -translate-x-1/2 z-20'>
      <button
        type='button'
        onClick={() => scrollToBottom()}
        aria-label='Scroll to latest message'
        className='h-8 w-8 grid place-content-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-colors hover:bg-slate-50'
      >
        <ArrowDown size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
};
