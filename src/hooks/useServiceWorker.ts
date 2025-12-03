'use client';

import * as React from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
  error: Error | null;
}

interface UseServiceWorkerReturn extends ServiceWorkerState {
  update: () => Promise<void>;
}

/**
 * Hook to manage service worker registration and updates.
 */
export function useServiceWorker(): UseServiceWorkerReturn {
  const [state, setState] = React.useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
    error: null,
  });

  React.useEffect((): void | (() => void) => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
      setState((prev) => ({ ...prev, isSupported: false }));
      return;
    }

    setState((prev) => ({ ...prev, isSupported: true }));

    const registerSW = async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState((prev) => ({ ...prev, isUpdateAvailable: true }));
              }
            });
          }
        });

        if (registration.waiting) {
          setState((prev) => ({ ...prev, isUpdateAvailable: true }));
        }
      } catch (error) {
        console.error('Service worker registration failed:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      }
    };

    registerSW();

    const handleControllerChange = (): void => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return (): void => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const update = React.useCallback(async (): Promise<void> => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [state.registration]);

  return { ...state, update };
}

export default useServiceWorker;
