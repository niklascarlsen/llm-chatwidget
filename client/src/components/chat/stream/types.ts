import type {StreamVisualMode} from './streamEffects';

// The presentation contract produced by useStreamPresentation and consumed by
// the renderers (and, via the barrel, by the chat layout).
export interface StreamPresentation {
  mode: StreamVisualMode;
  visibleText: string;
  chunkKind?: 'word' | 'phrase';
  chunkAnimationClass?: string;
  chunkAnimationDurationMs?: number;
  hasVisibleContent: boolean;
  showCaret: boolean;
  // True when animation settled and finalize may run.
  isPresentationComplete: boolean;
}
