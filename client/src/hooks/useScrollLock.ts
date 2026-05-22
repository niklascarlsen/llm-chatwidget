import {useEffect} from 'react';

let originalBodyStyles: {
  position: string;
  top: string;
  width: string;
  overflow: string;
  paddingRight: string;
} | null = null;

let scrollY = 0;

// Freeze the page behind the full-screen mobile chat.
function lockBodyScroll() {
  const body = document.body;
  const html = document.documentElement;
  const computedStyle = window.getComputedStyle(body);
  const currentPaddingRight =
    Number.parseFloat(computedStyle.paddingRight) || 0;
  const scrollbarWidth = window.innerWidth - html.clientWidth;

  scrollY = window.scrollY;

  originalBodyStyles = {
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
    overflow: body.style.overflow,
    paddingRight: body.style.paddingRight,
  };

  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';
  body.style.overflow = 'hidden';

  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
  }
}

function unlockBodyScroll() {
  if (!originalBodyStyles) return;

  const body = document.body;
  body.style.position = originalBodyStyles.position;
  body.style.top = originalBodyStyles.top;
  body.style.width = originalBodyStyles.width;
  body.style.overflow = originalBodyStyles.overflow;
  body.style.paddingRight = originalBodyStyles.paddingRight;

  window.scrollTo(0, scrollY);
  originalBodyStyles = null;
}

export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);
}
