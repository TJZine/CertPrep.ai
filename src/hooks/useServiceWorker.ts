"use client";

import * as React from "react";

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
  const refreshRequestedRef = React.useRef(false);
  const [state, setState] = React.useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
    error: null,
  });

  React.useEffect((): (() => void) => {
    let isMounted = true;
    let currentRegistration: ServiceWorkerRegistration | null = null;
    let updateFoundHandler: (() => void) | null = null;

    if (typeof navigator === "undefined" || !navigator.serviceWorker) {
      setState((prev) => ({ ...prev, isSupported: false }));
      return () => {
        isMounted = false;
      };
    }

    setState((prev) => ({ ...prev, isSupported: true }));

    const registerSW = async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        // Some browser-test harnesses intentionally block service workers and
        // resolve registration without a value. Treat that as unsupported
        // instead of producing repeated runtime errors.
        if (!registration || !isMounted) return;

        currentRegistration = registration;
        setState((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        updateFoundHandler = (): void => {
          const newWorker = registration.installing;
          if (newWorker) {
            const stateChangeHandler = (): void => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                if (isMounted) {
                  setState((prev) => ({ ...prev, isUpdateAvailable: true }));
                }
              }
            };
            newWorker.addEventListener("statechange", stateChangeHandler);
          }
        };

        registration.addEventListener("updatefound", updateFoundHandler);

        if (registration.waiting && isMounted) {
          setState((prev) => ({ ...prev, isUpdateAvailable: true }));
        }
      } catch (error) {
        console.error("Service worker registration failed:", error);
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      }
    };

    void registerSW();

    const handleControllerChange = (): void => {
      if (refreshRequestedRef.current) {
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    return (): void => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      if (currentRegistration && updateFoundHandler) {
        currentRegistration.removeEventListener(
          "updatefound",
          updateFoundHandler,
        );
      }
    };
  }, []);

  const update = React.useCallback(async (): Promise<void> => {
    if (state.registration?.waiting) {
      refreshRequestedRef.current = true;
      state.registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }, [state.registration]);

  return { ...state, update };
}
