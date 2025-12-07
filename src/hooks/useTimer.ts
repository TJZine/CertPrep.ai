"use client";

import * as React from "react";

interface UseTimerOptions {
  initialSeconds?: number;
  countDown?: boolean;
  autoStart?: boolean;
  onComplete?: () => void;
}

interface UseTimerReturn {
  seconds: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newSeconds?: number) => void;
  formattedTime: string;
}

/**
 * Timer hook that supports counting up or down with optional auto-start.
 */
export function useTimer({
  initialSeconds = 0,
  countDown = false,
  autoStart = false,
  onComplete,
}: UseTimerOptions = {}): UseTimerReturn {
  const [seconds, setSeconds] = React.useState(initialSeconds);
  const [isRunning, setIsRunning] = React.useState(autoStart);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = React.useRef(onComplete);

  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  React.useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (countDown) {
          if (prev <= 1) {
            setIsRunning(false);
            onCompleteRef.current?.();
            return 0;
          }
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);

    return (): void => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, countDown]);

  const start = React.useCallback((): void => setIsRunning(true), []);
  const pause = React.useCallback((): void => setIsRunning(false), []);
  const reset = React.useCallback(
    (newSeconds?: number): void => {
      setSeconds(newSeconds ?? initialSeconds);
      setIsRunning(false);
    },
    [initialSeconds],
  );

  const formattedTime = React.useMemo(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [seconds]);

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
    formattedTime,
  };
}
