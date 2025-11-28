'use client';

import * as React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Top-level error boundary that catches any unhandled errors
 * and provides a user-friendly error screen with recovery options.
 */
export class GlobalErrorHandler extends React.Component<GlobalErrorHandlerProps, ErrorState> {
  constructor(props: GlobalErrorHandlerProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Global Error Handler caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    this.setState({ errorInfo });

    try {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      };

      const existingErrors = JSON.parse(localStorage.getItem('certprep_error_log') || '[]') as unknown[];
      existingErrors.unshift(errorLog);
      localStorage.setItem('certprep_error_log', JSON.stringify(existingErrors.slice(0, 10)));
    } catch {
      // Ignore storage errors
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleClearDataAndReload = (): void => {
    if (window.confirm('This will clear all your quiz data and reload the app. Are you sure?')) {
      indexedDB.deleteDatabase('CertPrepDatabase');
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <Card className="max-w-lg">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>

              <h1 className="mb-2 text-2xl font-bold text-slate-900">Something Went Wrong</h1>
              <p className="mb-6 text-slate-600">
                An unexpected error occurred. Your quiz data is safe and stored locally. Please try one of the recovery
                options below.
              </p>

              {this.state.error && process.env.NODE_ENV === 'development' ? (
                <details className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
                  <summary className="cursor-pointer font-medium text-slate-700">Technical Details</summary>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              ) : null}

              <div className="space-y-3">
                <Button onClick={this.handleReset} className="w-full" leftIcon={<RefreshCw className="h-4 w-4" />}>
                  Try Again
                </Button>

                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="w-full"
                  leftIcon={<Home className="h-4 w-4" />}
                >
                  Go to Dashboard
                </Button>

                <Button variant="ghost" onClick={this.handleReload} className="w-full">
                  Reload Page
                </Button>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <p className="mb-3 text-xs text-slate-500">If the problem persists, you can reset the app:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleClearDataAndReload}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  leftIcon={<Bug className="h-4 w-4" />}
                >
                  Clear All Data &amp; Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorHandler;
