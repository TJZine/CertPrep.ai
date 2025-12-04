"use client";

import * as React from "react";
import { Download, X, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Component to prompt users to install the PWA.
 */
export function InstallPrompt(): React.ReactElement | null {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect((): void | (() => void) => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    let dismissedAt: string | null = null;
    try {
      dismissedAt = localStorage.getItem("pwa_install_dismissed");
    } catch {
      // Ignore storage access errors and continue without persisted dismissal.
    }
    if (dismissedAt) {
      const dismissedTime = new Date(dismissedAt).getTime();
      const now = new Date().getTime();
      const daysSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setDismissed(true);
        return;
      }
    }

    let showPromptTimeoutId: number | null = null;

    const handleBeforeInstall = (e: Event): void => {
      e.preventDefault();
      if (showPromptTimeoutId) {
        clearTimeout(showPromptTimeoutId);
      }
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      showPromptTimeoutId = window.setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const handleInstalled = (): void => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleInstalled);

    return (): void => {
      if (showPromptTimeoutId) {
        clearTimeout(showPromptTimeoutId);
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async (): Promise<void> => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setShowPrompt(false);
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Install prompt failed:", error);
    }
  };

  const handleDismiss = (): void => {
    setShowPrompt(false);
    setDismissed(true);
    try {
      localStorage.setItem("pwa_install_dismissed", new Date().toISOString());
    } catch {
      // Ignore storage persistence failures.
    }
  };

  if (isInstalled || dismissed || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md",
        "rounded-xl border border-blue-200 bg-white p-4 shadow-xl",
        "animate-in slide-in-from-bottom-4 duration-300",
      )}
      role="dialog"
      aria-labelledby="install-prompt-title"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
          <Download className="h-6 w-6 text-blue-600" />
        </div>

        <div className="flex-1">
          <h3
            id="install-prompt-title"
            className="font-semibold text-slate-900"
          >
            Install CertPrep.ai
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Install for quick access and offline studying. Works on any device!
          </p>

          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              Mobile
            </span>
            <span className="flex items-center gap-1">
              <Monitor className="h-3 w-3" />
              Desktop
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" onClick={handleInstall}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not Now
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Dismiss install prompt"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default InstallPrompt;
