import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {getQueueStatusLabel} from './getQueueStatusLabel';

interface StreamingDisplayProps {
  isGenerating: boolean;
  displayedText: string;
  isReasoning: boolean;
  hasStarted: boolean;
  queuePosition: number | null;
  queueLength: number | null;
  isSomeoneProcessing: boolean;
}

const statusClassName = 'px-1.5 py-2 text-[13px] text-slate-600';

function AnimatedStatus({label}: {label: string}) {
  return (
    <p className={statusClassName}>
      {label}
      <span className='chat-status-dots' aria-hidden='true' />
    </p>
  );
}

export const StreamingDisplay = ({
  isGenerating,
  displayedText,
  isReasoning,
  hasStarted,
  queuePosition,
  queueLength,
  isSomeoneProcessing,
}: StreamingDisplayProps) => {
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

  if (isReasoning && !displayedText) {
    return (
      <div className='flex min-w-0 justify-start'>
        <AnimatedStatus label='Reasoning' />
      </div>
    );
  }

  if (!displayedText) return null;

  return (
    <div className='flex min-w-0 justify-start'>
      <div className='chat-prose max-w-full min-w-0 font-medium rounded-2xl rounded-bl-md px-1.5 py-2.5 text-[14px] text-slate-900 prose prose-slate prose-sm prose-p:my-1 prose-headings:my-2 prose-pre:bg-slate-900 prose-pre:text-slate-100'>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({href, children}) => (
              <a
                href={href}
                target='_blank'
                rel='noopener noreferrer'
                className='text-slate-900 underline underline-offset-2 hover:text-slate-700'
              >
                {children}
              </a>
            ),
          }}
        >
          {displayedText}
        </ReactMarkdown>
      </div>
    </div>
  );
};
