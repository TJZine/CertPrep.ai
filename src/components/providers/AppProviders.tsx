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
import { SyncBlockedBanner } from "@/components/common/SyncBlockedBanner";

/**
 * Ensures service worker registration happens on app mount.
 * Uses direct useEffect for client-side registration - simpler
 * than the useServiceWorker hook and avoids potential edge cases.
 */
function ServiceWorkerInit(): null {
  React.useEffect(() => {
    // Client-side only - service workers not available in SSR
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => {
        console.error("[ServiceWorkerInit] SW registration failed:", error);
      });
  }, []);

  return null;
}

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <GlobalErrorHandler>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <SyncProvider>
              <ServiceWorkerInit />
              <UpdateBanner />
              <SyncBlockedBanner />
              {children}
              <OfflineIndicator />
              <InstallPrompt />
              <SpeedInsights />
            </SyncProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </GlobalErrorHandler>
  );
}
