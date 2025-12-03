'use client';

import * as React from 'react';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { GlobalErrorHandler } from '@/components/common/GlobalErrorHandler';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SentryInitializer } from '@/components/providers/SentryInitializer';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { UpdateBanner } from '@/components/common/UpdateBanner';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { InstallPrompt } from '@/components/common/InstallPrompt';

export function AppProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ThemeProvider>
      <GlobalErrorHandler>
        <ToastProvider>
          <AuthProvider>
            <SentryInitializer />
            <UpdateBanner />
            {children}
            <OfflineIndicator />
            <InstallPrompt />
            <SpeedInsights />
          </AuthProvider>
        </ToastProvider>
      </GlobalErrorHandler>
    </ThemeProvider>
  );
}