'use client';

import { useEffect } from 'react';

export function SentryInitializer(): null {
  useEffect(() => {
    // Dynamically import the client configuration to ensure it only runs in the browser
    import('../../../sentry.client.config').catch((e) =>
      console.error('Failed to load Sentry client config:', e)
    );
  }, []);
  return null;
}
