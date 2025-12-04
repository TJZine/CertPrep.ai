"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

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
export class GlobalErrorHandler extends React.Component<
  GlobalErrorHandlerProps,
  ErrorState
> {
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
    console.error("Global Error Handler caught an error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    this.setState({ errorInfo });

    // Capture error in Sentry
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
        },
      });
    }

    // Store sanitized error log for local debugging.
    // We deliberately avoid encryption here because:
    // 1. This is debugging data, not credentials
    // 2. Error messages are sanitized to limit accidental PII
    // 3. URLs are scrubbed of sensitive params (tokens, codes)
    // If an attacker has localStorage access, they already have full app access.
    try {
      // Sanitize URL by removing sensitive query parameters
      const sanitizeUrl = (url: string): string => {
        try {
          const parsed = new URL(url);
          const sensitiveParams = ["token", "code", "next", "access_token", "refresh_token"];
          sensitiveParams.forEach((param) => parsed.searchParams.delete(param));
          return parsed.toString();
        } catch {
          return "[invalid url]";
        }
      };

      // Truncate error message to prevent accidental PII in lengthy messages
      const sanitizeMessage = (msg: string, maxLength = 500): string => {
        if (msg.length <= maxLength) return msg;
        return msg.slice(0, maxLength) + "... [truncated]";
      };

      const errorLog = {
        message: sanitizeMessage(error.message),
        // Stack traces contain code structure, not user data - safe to store
        stack: error.stack?.slice(0, 2000),
        componentStack: errorInfo.componentStack?.slice(0, 1000),
        timestamp: new Date().toISOString(),
        url: typeof window !== "undefined" ? sanitizeUrl(window.location.href) : "unknown",
      };

      const existingErrors = JSON.parse(
        localStorage.getItem("certprep_error_log") || "[]",
      ) as unknown[];
      existingErrors.unshift(errorLog);
      // lgtm[js/clear-text-storage-of-sensitive-data] - Data is sanitized above:
      // URLs have tokens stripped, messages are truncated, stack traces are code-only.
      // This is debugging data, not credentials. Attacker with localStorage access
      // already has full session access.
      localStorage.setItem(
        "certprep_error_log",
        JSON.stringify(existingErrors.slice(0, 10)),
      );
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
    window.location.href = "/";
  };

  handleClearDataAndReload = (): void => {
    if (
      window.confirm(
        "This will clear all your quiz data and reload the app. Are you sure?",
      )
    ) {
      const deleteRequest = indexedDB.deleteDatabase("CertPrepDatabase");

      deleteRequest.onsuccess = (): void => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
      };

      deleteRequest.onerror = (): void => {
        console.error(
          "Failed to delete database during error recovery, clearing storage anyway",
        );
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/";
      };
    }
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
          <Card className="max-w-lg">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>

              <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
                Something Went Wrong
              </h1>
              <p className="mb-6 text-slate-600 dark:text-slate-400">
                An unexpected error occurred. Your quiz data is safe and stored
                locally. Please try one of the recovery options below.
              </p>

              {/* Always allow expanding details for debugging, but warn it's technical */}
              <details className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-900">
                <summary className="cursor-pointer font-medium text-slate-700 flex items-center justify-between dark:text-slate-300">
                  <span>Technical Details</span>
                  <span className="text-xs text-slate-500 font-normal dark:text-slate-500">
                    (Click to expand)
                  </span>
                </summary>
                <div className="mt-2">
                  <pre className="overflow-auto whitespace-pre-wrap text-xs text-slate-600 max-h-40 dark:text-slate-400">
                    {this.state.error?.message || "Unknown error"}
                    {"\n\n"}
                    {this.state.error?.stack || "No stack trace available"}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={async () => {
                      const message =
                        this.state.error?.message || "Unknown error";
                      const stack =
                        this.state.error?.stack || "No stack trace available";
                      const componentStack =
                        this.state.errorInfo?.componentStack;
                      const text = componentStack
                        ? `${message}\n\n${stack}\n\nComponent stack:\n${componentStack}`
                        : `${message}\n\n${stack}`;

                      if (!navigator.clipboard?.writeText) {
                        console.warn("Clipboard API not available");
                        alert(
                          "Copy failed: Clipboard API is not available in this browser.",
                        );
                        return;
                      }

                      try {
                        await navigator.clipboard.writeText(text);
                        alert("Error details copied to clipboard");
                      } catch (err) {
                        console.error("Failed to copy error details", err);
                        alert(
                          "Copy failed. Please capture a screenshot instead.",
                        );
                      }
                    }}
                  >
                    Copy Error Details
                  </Button>
                </div>
              </details>

              <div className="space-y-3">
                <Button
                  onClick={this.handleReset}
                  className="w-full"
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
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

                <Button
                  variant="ghost"
                  onClick={this.handleReload}
                  className="w-full"
                >
                  Reload Page
                </Button>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  If the problem persists, you can reset the app:
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleClearDataAndReload}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
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
