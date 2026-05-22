const DESKTOP_MIN_WIDTH = 1024;

export function isMobileViewport() {
  return window.matchMedia(`(max-width: ${DESKTOP_MIN_WIDTH - 1}px)`).matches;
}

export function isDesktopViewport() {
  return !isMobileViewport();
}
