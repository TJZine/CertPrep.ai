'use client';

import * as React from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

/**
 * Shows a banner when the user goes offline.
 * Reassures them that the app still works since it's offline-first.
 */
export function OfflineIndicator(): React.ReactElement | null {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [mounted, setMounted] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [showReconnected, setShowReconnected] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect((): void | (() => void) => {
    if (isOnline && wasOffline && !dismissed) {
      setShowReconnected(true);
      const timer = window.setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => {
        window.clearTimeout(timer);
      };
    }
    return undefined;
  }, [isOnline, wasOffline, dismissed]);

  React.useEffect((): void => {
    if (!isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (!isOnline && dismissed) {
    return null;
  }

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg p-4 shadow-lg transition-all',
        isOnline ? 'border border-green-200 bg-green-50' : 'border border-amber-200 bg-amber-50',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
            isOnline ? 'bg-green-100' : 'bg-amber-100',
          )}
        >
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" aria-hidden="true" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-600" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1">
          <p className={cn('font-medium', isOnline ? 'text-green-800' : 'text-amber-800')}>
            {isOnline ? 'Back Online' : "You're Offline"}
          </p>
          <p className={cn('mt-0.5 text-sm', isOnline ? 'text-green-700' : 'text-amber-700')}>
            {isOnline
              ? 'Your connection has been restored.'
              : "Don't worry! CertPrep.ai works offline. All your data is stored locally."}
          </p>
        </div>

        {!isOnline && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 rounded p-1 text-amber-600 hover:bg-amber-100"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default OfflineIndicator;
