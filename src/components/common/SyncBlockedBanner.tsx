"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSync } from "@/hooks/useSync";
import { cn } from "@/lib/utils";

/**
 * Shows a banner when sync is blocked due to schema drift or other hard failures.
 */
export function SyncBlockedBanner(): React.ReactElement | null {
  const { syncBlocked } = useSync();
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (syncBlocked) {
      setDismissed(false);
    }
  }, [syncBlocked]);

  if (!syncBlocked || dismissed) {
    return null;
  }

  const affectedTables =
    syncBlocked.tables.length === 2
      ? "quizzes and results"
      : syncBlocked.tables[0] === "results"
        ? "results"
        : "quizzes";

  const primaryMessage =
    syncBlocked.reason === "schema_drift"
      ? "Sync is paused due to a data format update. Please refresh or update the app."
      : `Sync is paused: ${syncBlocked.reason}.`;

  const retryMessage =
    syncBlocked.remainingMins > 0
      ? `Retry in about ${syncBlocked.remainingMins} min.`
      : "Retry after updating the app.";

  const handleReload = (): void => {
    window.location.reload();
  };

  return (
    <div
      className={cn(
        "fixed top-32 left-4 right-4 z-50 mx-auto max-w-md",
        "rounded-lg border border-warning/30 bg-warning/10 p-4 shadow-lg",
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" aria-hidden="true" />
          <div>
            <p className="font-medium text-warning">Sync Paused</p>
            <p className="text-sm text-warning/80">{primaryMessage}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Affected: {affectedTables}. {retryMessage}
            </p>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReload}
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          >
            Reload
          </Button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-warning hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
            aria-label="Dismiss sync paused notification"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default SyncBlockedBanner;

