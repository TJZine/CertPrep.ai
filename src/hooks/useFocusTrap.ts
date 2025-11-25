'use client';

import * as React from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseFocusTrapOptions {
  enabled?: boolean;
  returnFocusOnDeactivate?: boolean;
}

/**
 * Hook to trap focus within a container element.
 * Useful for modals and overlays.
 */
export function useFocusTrap<T extends HTMLElement>(
  options: UseFocusTrapOptions = {},
): React.RefObject<T | null> {
  const { enabled = true, returnFocusOnDeactivate = true } = options;
  const containerRef = React.useRef<T | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect((): void | (() => void) => {
    if (!enabled) return undefined;

    previousFocusRef.current = document.activeElement as HTMLElement;
    const container = containerRef.current;
    if (!container) return undefined;

    const focusableElements = container.querySelectorAll(FOCUSABLE_SELECTOR);
    const firstElement = focusableElements[0] as HTMLElement | undefined;
    firstElement?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const elements = container.querySelectorAll(FOCUSABLE_SELECTOR);
      const first = elements[0] as HTMLElement | undefined;
      const last = elements[elements.length - 1] as HTMLElement | undefined;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (returnFocusOnDeactivate && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [enabled, returnFocusOnDeactivate]);

  return containerRef;
}

export default useFocusTrap;
