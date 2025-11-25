import * as React from 'react';

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle a function call.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Hook for debounced value.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect((): (() => void) => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return (): void => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to detect if component is mounted (for async operations).
 */
export function useIsMounted(): () => boolean {
  const isMounted = React.useRef(false);

  React.useEffect((): (() => void) => {
    isMounted.current = true;
    return (): void => {
      isMounted.current = false;
    };
  }, []);

  return React.useCallback(() => isMounted.current, []);
}

/**
 * Hook for lazy initialization of expensive computations.
 */
export function useLazyRef<T>(initializer: () => T): React.MutableRefObject<T> {
  const ref = React.useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = initializer();
  }

  return ref as React.MutableRefObject<T>;
}

/**
 * Measure component render time (development only).
 */
export function measureRender(componentName: string): () => void {
  if (process.env.NODE_ENV !== 'development') {
    return () => {};
  }

  const start = performance.now();
  return () => {
    const end = performance.now();
    // eslint-disable-next-line no-console
    console.log(`[Performance] ${componentName} rendered in ${(end - start).toFixed(2)}ms`);
  };
}
