import {
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentProps,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remend from 'remend';
import type {StreamPresentation} from './types';

export const streamBubbleClassName =
  'chat-prose max-w-full min-w-0 font-medium rounded-2xl rounded-bl-md px-1.5 py-2.5 text-[14px] text-slate-900 prose prose-slate prose-sm prose-p:my-1 prose-headings:my-2 prose-pre:bg-slate-900 prose-pre:text-slate-100';

const markdownLink = {
  a: ({href, children}: {href?: string; children?: React.ReactNode}) => (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className='text-slate-900 underline underline-offset-2 hover:text-slate-700'
    >
      {children}
    </a>
  ),
};

type RehypePlugins = ComponentProps<typeof ReactMarkdown>['rehypePlugins'];

// Rehype plugin that wraps text chunks in a span for per-chunk fade. Whitespace
// stays plain text, and pre/code/script/style are skipped.
const CHUNK_SKIP_TAGS = new Set(['pre', 'code', 'script', 'style']);

const WORD_SPLIT = /\S+|\s+/g;
const PHRASE_SPLIT = /[^.!?\n]*[.!?\n]+|[^.!?\n]+/g;

interface HastText {
  type: 'text';
  value: string;
}
interface HastElement {
  type: 'element';
  tagName: string;
  properties?: Record<string, unknown>;
  children: HastNode[];
}
type HastNode = HastText | HastElement | {type: string; [key: string]: unknown};

function wrapChunksInChildren(
  children: HastNode[],
  split: RegExp,
  className: string,
): HastNode[] {
  const out: HastNode[] = [];
  for (const child of children) {
    if (child.type === 'text' && typeof (child as HastText).value === 'string') {
      const parts = (child as HastText).value.match(split);
      if (!parts) {
        out.push(child);
        continue;
      }
      for (const part of parts) {
        if (/\S/.test(part)) {
          out.push({
            type: 'element',
            tagName: 'span',
            properties: {className: [className]},
            children: [{type: 'text', value: part}],
          });
        } else {
          out.push({type: 'text', value: part});
        }
      }
    } else if (child.type === 'element') {
      const el = child as HastElement;
      if (!CHUNK_SKIP_TAGS.has(el.tagName)) {
        el.children = wrapChunksInChildren(el.children, split, className);
      }
      out.push(el);
    } else {
      out.push(child);
    }
  }
  return out;
}

function makeChunkWrapPlugin(split: RegExp, className: string): RehypePlugins {
  return [
    () => (tree: {children?: HastNode[]}) => {
      if (tree.children)
        tree.children = wrapChunksInChildren(tree.children, split, className);
    },
  ];
}

const WORD_REHYPE_PLUGINS = makeChunkWrapPlugin(WORD_SPLIT, 'stream-word');
const PHRASE_REHYPE_PLUGINS = makeChunkWrapPlugin(PHRASE_SPLIT, 'stream-phrase');

// Heal incomplete markdown on each render to avoid streaming flicker. Memoized
// for word-queue's per-word re-renders.
const StreamMarkdown = memo(function StreamMarkdown({
  text,
  rehypePlugins,
}: {
  text: string;
  rehypePlugins?: RehypePlugins;
}) {
  const healed = useMemo(() => remend(text, {linkMode: 'text-only'}), [text]);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={rehypePlugins}
      components={markdownLink}
    >
      {healed}
    </ReactMarkdown>
  );
});

// Queue reveal renderer. Renders the full string to markdown each tick, and
// rehype pre-wraps the chunks. useLayoutEffect fades only the new chunks,
// pre-paint, so nothing re-triggers and flickers. The caret is container ::after.
function AnimatedChunks({
  text,
  animationClass,
  durationMs,
  caret,
  chunkSelector,
  rehypePlugins,
}: {
  text: string;
  animationClass: string;
  durationMs?: number;
  caret: boolean;
  chunkSelector: string;
  rehypePlugins: RehypePlugins;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevChunkCountRef = useRef(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (text === '') {
      prevChunkCountRef.current = 0;
      return;
    }

    const chunks = container.querySelectorAll<HTMLElement>(chunkSelector);
    for (let i = prevChunkCountRef.current; i < chunks.length; i += 1) {
      chunks[i].classList.add(animationClass);
      if (durationMs) chunks[i].style.animationDuration = `${durationMs}ms`;
    }
    prevChunkCountRef.current = chunks.length;
  }, [text, animationClass, durationMs, chunkSelector]);

  return (
    <div ref={containerRef} className={caret ? 'stream-caret' : undefined}>
      <StreamMarkdown text={text} rehypePlugins={rehypePlugins} />
    </div>
  );
}

export function StreamContentRenderer({
  presentation,
}: {
  presentation: StreamPresentation;
}) {
  if (presentation.chunkKind && presentation.chunkAnimationClass) {
    const isPhrase = presentation.chunkKind === 'phrase';
    return (
      <AnimatedChunks
        text={presentation.visibleText}
        animationClass={presentation.chunkAnimationClass}
        durationMs={presentation.chunkAnimationDurationMs}
        caret={presentation.showCaret}
        chunkSelector={isPhrase ? '.stream-phrase' : '.stream-word'}
        rehypePlugins={isPhrase ? PHRASE_REHYPE_PLUGINS : WORD_REHYPE_PLUGINS}
      />
    );
  }
  // Instant mode, no per-chunk animation.
  return (
    <div>
      <StreamMarkdown text={presentation.visibleText} />
    </div>
  );
}
