'use client';

import * as React from 'react';

/**
 * Detects whether dark mode is active based on the root `.dark` class.
 * Falls back to system preference only when the class is absent.
 */
export function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect((): (() => void) => {
    if (typeof window === 'undefined') return () => {};

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const update = (): void => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass || (!document.documentElement.classList.contains('light') && media.matches));
    };

    update();

    const handleChange = (event: MediaQueryListEvent): void => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass || (!document.documentElement.classList.contains('light') && event.matches));
    };

    media.addEventListener?.('change', handleChange);
    media.addListener?.(handleChange);

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return (): void => {
      media.removeEventListener?.('change', handleChange);
      media.removeListener?.(handleChange);
      observer.disconnect();
    };
  }, []);

  return isDark;
}

export default useIsDarkMode;
