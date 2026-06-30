import {getQueueStatusLabel} from '@/lib/getQueueStatusLabel';
import {ChatMarkdown} from '@/components/chat/ui/ChatMarkdown';
import {usePrefersReducedMotion} from '@/components/chat/hooks/usePrefersReducedMotion';
import {useChatStore} from '@/components/chat/store/chatStore';

const streamBubbleClassName =
  'chat-prose max-w-full min-w-0 font-medium rounded-2xl rounded-bl-md px-1.5 py-2.5 text-[14px] text-slate-900 prose prose-slate prose-sm prose-p:my-1 prose-headings:my-2 prose-pre:bg-slate-900 prose-pre:text-slate-100';

const statusClassName = 'px-1.5 py-2 text-[13px] text-slate-600';

function AnimatedStatus({label}: {label: string}) {
  return (
    <p className={`${statusClassName} chat-status-pulse`}>
      <span key={label} className='chat-status-label'>
        {label}
      </span>
      <span className='chat-status-dots' aria-hidden='true' />
    </p>
  );
}

// Live reply bubble. Only component that reads receivedText per token.
export const StreamingDisplay = () => {
  const isGenerating = useChatStore((s) => s.isGenerating);
  const hasStarted = useChatStore((s) => s.hasStarted);
  const isReasoning = useChatStore((s) => s.isReasoning);
  const receivedText = useChatStore((s) => s.receivedText);
  const queuePosition = useChatStore((s) => s.queuePosition);
  const queueLength = useChatStore((s) => s.queueLength);
  const isSomeoneProcessing = useChatStore((s) => s.isSomeoneProcessing);
  const isAnimating = !usePrefersReducedMotion();

  if (!isGenerating) return null;

  if (!hasStarted) {
    const label = getQueueStatusLabel(
      queuePosition,
      queueLength,
      isSomeoneProcessing,
    );

    return (
      <div className='flex min-w-0 justify-start'>
        <AnimatedStatus label={label} />
      </div>
    );
  }

  if (isReasoning && !receivedText) {
    return (
      <div className='flex min-w-0 justify-start'>
        <AnimatedStatus label='Reasoning' />
      </div>
    );
  }

  if (receivedText.length === 0) return null;

  return (
    <div className='flex min-w-0 justify-start'>
      <ChatMarkdown
        text={receivedText}
        isAnimating={isAnimating}
        className={streamBubbleClassName}
      />
    </div>
  );
};
