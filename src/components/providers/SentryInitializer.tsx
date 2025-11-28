'use client';

import { useEffect } from 'react';

export function SentryInitializer() {
  useEffect(() => {
    // Dynamically import the client configuration to ensure it only runs in the browser
    import('../../../sentry.client.config');
  }, []);
  return null;
}
