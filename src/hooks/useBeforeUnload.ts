"use client";

import * as React from "react";

/**
 * Hook to warn users before leaving the page during a quiz.
 */
export function useBeforeUnload(shouldWarn: boolean, message?: string): void {
  React.useEffect((): (() => void) | undefined => {
    if (!shouldWarn) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue =
        message || "You have unsaved progress. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return (): void => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldWarn, message]);
}
