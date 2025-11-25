'use client';

import * as React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { useInitializeDatabase } from '@/hooks/useDatabase';

function DatabaseInitializer(): React.ReactElement | null {
  useInitializeDatabase();
  return null;
}

/**
 * Client-side providers and shared layout wrappers.
 */
export function AppProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <DatabaseInitializer />
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}

export default AppProviders;
