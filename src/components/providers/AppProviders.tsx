"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { GlobalErrorHandler } from "@/components/common/GlobalErrorHandler";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "@/../sentry.client.config";
import { SyncProvider } from "@/components/providers/SyncProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { UpdateBanner } from "@/components/common/UpdateBanner";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { InstallPrompt } from "@/components/common/InstallPrompt";

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ThemeProvider>
      <GlobalErrorHandler>
        <ToastProvider>
          <AuthProvider>
            <SyncProvider>
              <UpdateBanner />
              {children}
              <OfflineIndicator />
              <InstallPrompt />
              <SpeedInsights />
            </SyncProvider>
          </AuthProvider>
        </ToastProvider>
      </GlobalErrorHandler>
    </ThemeProvider>
  );
}
