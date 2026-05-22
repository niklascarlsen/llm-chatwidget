import {useEffect, type RefObject} from 'react';

// Is the touch on the scrollable `.chat-messages` body? No scroll-position
// check on purpose — the native scroller owns the whole gesture so the keyboard
// isn't yanked down mid-scroll.
function isOnBody(target: EventTarget | null, root: Element): boolean {
  const start =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;

  const body = start?.closest('.chat-messages');
  return !!body && root.contains(body);
}

// Mobile only. The layout is already pinned by useScrollLock + the dialog's
// `overflow: hidden`, so this hook just dismisses the on-screen keyboard: a
// swipe outside `.chat-messages` blurs the focused field, a swipe on the body
// is left alone to scroll with the keyboard up. Listeners stay passive so we
// never preventDefault() mid-scroll (the "cancelable=false" intervention spam).
export function useTouchScrollGuard(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const deltaY = (e.touches[0]?.clientY ?? startY) - startY;
      if (Math.abs(deltaY) < 8) return;

      // Scrolling the message body keeps the keyboard open.
      if (isOnBody(e.target, container)) return;

      // Any other swipe dismisses the keyboard so the layout can't shift.
      const active = document.activeElement;
      if (active instanceof HTMLElement && container.contains(active)) {
        active.blur();
      }
    };

    container.addEventListener('touchstart', onTouchStart, {passive: true});
    container.addEventListener('touchmove', onTouchMove, {passive: true});

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
    };
  }, [enabled, containerRef]);
}
