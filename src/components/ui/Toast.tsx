"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Available styles for toast notifications.
 */
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  /** Unique identifier for the toast instance. */
  id: string;
  /** The visual style and icon of the toast. */
  type: ToastType;
  /** The text content to display. */
  message: string;
  /**
   * Duration in milliseconds before auto-dismissing.
   * Defaults to 5000ms.
   */
  duration?: number;
}

export interface ToastContextValue {
  /** Current list of active toasts. */
  toasts: Toast[];
  /**
   * Triggers a new toast notification.
   *
   * @param type - The style of toast (success, error, warning, info).
   * @param message - The text content.
   * @param duration - Duration in ms (optional, default 5000). Use 0 to disable auto-dismiss.
   */
  addToast: (type: ToastType, message: string, duration?: number) => void;
  /**
   * Manually dismisses a specific toast.
   *
   * @param id - The ID of the toast to remove.
   */
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined,
);

const typeStyles: Record<
  ToastType,
  { icon: React.ReactNode; classes: string }
> = {
  success: {
    icon: (
      <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
    ),
    classes: "border-success/30 bg-success/10 text-success",
  },
  error: {
    icon: <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />,
    classes: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  warning: {
    icon: (
      <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
    ),
    classes: "border-warning/30 bg-warning/10 text-warning",
  },
  info: {
    icon: <Info className="h-5 w-5 text-info" aria-hidden="true" />,
    classes: "border-info/30 bg-info/10 text-info",
  },
};

let toastCounter = 0;
const generateId = (): string => {
  const webCrypto =
    typeof globalThis !== "undefined"
      ? (globalThis as { crypto?: Crypto }).crypto
      : undefined;

  const uuid = webCrypto?.randomUUID?.();
  if (uuid) return uuid;

  if (webCrypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    webCrypto.getRandomValues(buffer);
    const randomValue = buffer[0] ?? 0;
    return `toast-${Date.now().toString(36)}-${randomValue.toString(16)}`;
  }

  toastCounter += 1;
  return `toast-${Date.now().toString(36)}-${toastCounter}`;
};

/**
 * Hook to access the toast context.
 */
export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
}

/** Deduplication window (ms) for suppressing identical toasts. */
export const DEDUP_WINDOW_MS = 500;

/** Maximum entries in recent toasts map before eviction. */
const MAX_RECENT_TOASTS = 100;

/**
 * Toast provider that manages toast stack and renders notifications.
 */
export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef<Map<string, number>>(new Map());
  /**
   * Tracks recently shown toast keys (type:message) to prevent duplicates
   * within the deduplication window.
   */
  const recentToasts = React.useRef<Map<string, number>>(new Map());
  /** Insertion-order queue for O(1) eviction when capacity is exceeded. */
  const toastQueue = React.useRef<string[]>([]);

  const removeToast = React.useCallback((id: string): void => {
    const timerId = timers.current.get(id);
    if (timerId) {
      clearTimeout(timerId);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = React.useCallback(
    (type: ToastType, message: string, duration = 5000): void => {
      const now = Date.now();

      // Deduplication: skip if the same type:message was shown recently
      const dedupKey = `${type}:${message}`;
      const lastShown = recentToasts.current.get(dedupKey);
      if (lastShown && now - lastShown < DEDUP_WINDOW_MS) {
        return; // Skip duplicate
      }

      // Add to map and queue
      recentToasts.current.set(dedupKey, now);
      toastQueue.current.push(dedupKey);

      // O(1) eviction: remove oldest entries when capacity exceeded
      while (toastQueue.current.length > MAX_RECENT_TOASTS) {
        const oldestKey = toastQueue.current.shift();
        if (oldestKey) {
          recentToasts.current.delete(oldestKey);
        }
      }

      const id = generateId();
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration) {
        const timerId = window.setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timerId);
      }
    },
    [removeToast],
  );

  React.useEffect((): (() => void) => {
    const timersRef = timers.current;
    return (): void => {
      timersRef.forEach((timerId) => clearTimeout(timerId));
      timersRef.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const style = typeStyles[toast.type];
          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition",
                style.classes,
              )}
              role="alert"
              aria-live="polite"
            >
              <div className="pt-0.5">{style.icon}</div>
              <div className="flex-1 text-sm font-medium">{toast.message}</div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded-full p-1 text-inherit transition hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
