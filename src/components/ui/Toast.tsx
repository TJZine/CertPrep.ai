'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const typeStyles: Record<ToastType, { icon: React.ReactNode; classes: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />,
    classes: 'border-green-200 bg-green-50 text-green-900',
  },
  error: {
    icon: <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />,
    classes: 'border-red-200 bg-red-50 text-red-900',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-orange-600" aria-hidden="true" />,
    classes: 'border-orange-200 bg-orange-50 text-orange-900',
  },
  info: {
    icon: <Info className="h-5 w-5 text-blue-600" aria-hidden="true" />,
    classes: 'border-blue-200 bg-blue-50 text-blue-900',
  },
};

let toastCounter = 0;
const generateId = (): string => {
  const uuid = crypto.randomUUID?.();
  if (uuid) return uuid;

  const webCrypto = crypto as Crypto | undefined;
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
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}

/**
 * Toast provider that manages toast stack and renders notifications.
 */
export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef<Map<string, number>>(new Map());

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
                'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition',
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
                className="rounded-full p-1 text-inherit transition hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
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
