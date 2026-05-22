import {useEffect, useRef} from 'react';
import {useScrollLock} from '@/hooks/useScrollLock';
import {useTouchScrollGuard} from '@/hooks/useTouchScrollGuard';
import {isMobileViewport} from '@/lib/viewport';

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Chat shell on a native <dialog>.
// Mobile: showModal() for focus trap and native ESC.
// Desktop: show() so the page behind stays interactive.
export const ChatWidget = ({isOpen, onClose, children}: ChatWidgetProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = isOpen && isMobileViewport();

  useScrollLock(isMobile);
  useTouchScrollGuard(dialogRef, isMobile);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (dialog.open) return;
      if (isMobileViewport()) {
        dialog.showModal();
      } else {
        dialog.show();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Mobile ESC - the cancel event only fires after showModal().
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  // Desktop ESC - non-modal dialogs don't fire cancel.
  useEffect(() => {
    if (!isOpen || isMobileViewport()) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Track the visible viewport and keep the inner content aligned to it.
  // Dialog stays a static 100dvh shell so its white background covers the
  // layout-viewport area the keyboard hides. Inner content is sized to the
  // visible area and translated by visualViewport.offsetTop so the header
  // stays pinned at the top and the input rides the native iOS pan upward.

  // NOTE: Tested in Edge, Chrome, DuckDuckGo, Firefox, and Safari.
  // Works pretty much flawless everywhere except in Safari (the new IE).
  // The brief scuffed jump there is caused by the dynamic bottom toolbar animation.
  // If the toolbar is hidden, Safari works as a normal browser as well.
  useEffect(() => {
    if (!isMobile) return;

    const content = contentRef.current;
    const viewport = window.visualViewport;
    if (!content || !viewport) return;

    let rafId = 0;

    const syncViewport = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        content.style.height = `${viewport.height}px`;
        content.style.transform = `translateY(${viewport.offsetTop}px)`;
      });
    };

    syncViewport();
    viewport.addEventListener('resize', syncViewport);
    viewport.addEventListener('scroll', syncViewport);

    return () => {
      cancelAnimationFrame(rafId);
      viewport.removeEventListener('resize', syncViewport);
      viewport.removeEventListener('scroll', syncViewport);
      content.style.height = '';
      content.style.transform = '';
    };
  }, [isMobile]);

  return (
    <dialog
      ref={dialogRef}
      id='chat-widget-dialog'
      tabIndex={-1}
      aria-labelledby='chat-widget-title'
      className='chat-widget w-full max-w-none h-dvh bg-white text-slate-900 overflow-hidden lg:rounded-2xl lg:shadow-2xl lg:border lg:border-slate-200 lg:w-[380px] lg:h-[min(600px,calc(100dvh-3rem))]'
    >
      <div
        ref={contentRef}
        className='flex min-h-0 flex-col bg-white lg:h-full'
      >
        {children}
      </div>
    </dialog>
  );
};
