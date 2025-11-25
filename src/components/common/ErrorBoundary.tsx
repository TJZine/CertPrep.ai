'use client';

import * as React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary with resettable fallback UI.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // In production, send to logging/monitoring.
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 text-red-600" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Something went wrong</h2>
              {this.state.error?.message ? (
                <p className="mt-2 text-sm text-red-800">{this.state.error.message}</p>
              ) : null}
              <div className="mt-4">
                <Button variant="secondary" onClick={this.reset} leftIcon={<RotateCcw />}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to imperatively trigger an error boundary.
 */
export function useErrorHandler(): (error: Error) => void {
  const [error, setError] = React.useState<Error | null>(null);
  if (error) {
    throw error;
  }

  return React.useCallback((err: Error) => setError(err), []);
}

export default ErrorBoundary;
