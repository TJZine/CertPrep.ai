"use client";

import * as React from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { cn } from "@/lib/utils";

/**
 * Shows a banner when a new version of the app is available.
 */
export function UpdateBanner(): React.ReactElement | null {
  const { isUpdateAvailable, update } = useServiceWorker();
  const [dismissed, setDismissed] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleUpdate = async (): Promise<void> => {
    setIsUpdating(true);
    await update();
  };

  if (!isUpdateAvailable || dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-16 left-4 right-4 z-50 mx-auto max-w-md",
        "rounded-lg border border-success/30 bg-success/10 p-4 shadow-lg",
      )}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-success">
              Update Available
            </p>
            <p className="text-sm text-success/80">
              A new version is ready to install
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleUpdate} isLoading={isUpdating}>
            Update
          </Button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-success hover:bg-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
            aria-label="Dismiss update notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateBanner;
