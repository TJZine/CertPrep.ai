/* eslint-disable no-console */
import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Sanitizes log arguments by removing or redacting sensitive patterns.
 * Also handles JSON serialization for objects.
 * 
 * @param args - Raw arguments to sanitize
 * @returns Sanitized string safe for external logging
 */
const sanitizeForSentry = (args: unknown[]): string => {
  const serialized = args
    .map((arg) => {
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg); // Fallback for circular refs
        }
      }
      return String(arg);
    })
    .join(" ");

  // Redact common sensitive patterns (emails, tokens, etc.)
  return serialized
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, "[EMAIL_REDACTED]")
    .replace(
      /\b(Bearer|Token|token|key|password|pwd|secret)\s*[:=]\s*\S+/gi,
      "$1=[REDACTED]",
    );
};

export const logger = {
  /**
   * Logs an informational message.
   *
   * @remarks
   * - **Development**: Prints to `console.log`.
   * - **Production**: Adds a breadcrumb to Sentry (level: "info") without printing to console.
   *
   * @param args - The message(s) or object(s) to log.
   */
  log: (...args: unknown[]): void => {
    if (!isProduction) {
      console.log(...args);
    } else {
      // Add breadcrumbs for debugging context without logging to console
      Sentry.addBreadcrumb({
        category: "log",
        message: sanitizeForSentry(args),
        level: "info",
      });
    }
  },

  /**
   * Logs a warning message.
   *
   * @remarks
   * - **Development**: Prints to `console.warn`.
   * - **Production**: Captures a message event in Sentry (level: "warning").
   *
   * @param args - The warning message(s) or object(s).
   */
  warn: (...args: unknown[]): void => {
    if (!isProduction) {
      console.warn(...args);
    } else {
      Sentry.captureMessage(sanitizeForSentry(args), "warning");
    }
  },

  /**
   * Logs an error message or exception.
   *
   * @remarks
   * - **Development**: Prints to `console.error`.
   * - **Production**: Captures an exception in Sentry including stack traces.
   *   If multiple arguments are passed, non-Error arguments are attached as extra context.
   *
   * @param args - The error object(s) or message(s).
   */
  error: (...args: unknown[]): void => {
    if (!isProduction) {
      console.error(...args);
    }

    // In production, send to Sentry
    if (isProduction) {
      const errorObj =
        args.find((arg) => arg instanceof Error) ||
        new Error(sanitizeForSentry(args));
      const extras = args.filter((arg) => arg !== errorObj);

      Sentry.captureException(errorObj, {
        extra: { rawArgs: extras },
      });
    }
  },

  /**
   * Logs an informational message (alias for log, but distinct in some contexts).
   *
   * @remarks
   * - **Development**: Prints to `console.info`.
   * - **Production**: No-op (currently).
   *
   * @param args - The message(s) to log.
   */
  info: (...args: unknown[]): void => {
    if (!isProduction) {
      console.info(...args);
    } else {
      Sentry.addBreadcrumb({
        category: "log",
        message: sanitizeForSentry(args),
        level: "info",
      });
    }
  },

  /**
   * Logs a debug message.
   *
   * @remarks
   * - **Development**: Prints to `console.debug` (often hidden by default in browser consoles).
   * - **Production**: No-op.
   *
   * @param args - Debugging data.
   */
  debug: (...args: unknown[]): void => {
    if (!isProduction) {
      console.debug(...args);
    }
  },
};
