'use client';

import * as React from 'react';

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

/**
 * Hook to track online/offline status.
 * Offline-first: app continues working with IndexedDB data.
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = React.useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [wasOffline, setWasOffline] = React.useState<boolean>(false);

  React.useEffect((): void | (() => void) => {
    const handleOnline = (): void => {
      setIsOnline(true);
    };

    const handleOffline = (): void => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}

export default useOnlineStatus;
