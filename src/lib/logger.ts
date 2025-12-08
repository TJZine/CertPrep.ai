/* eslint-disable no-console */
import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

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
        message: args.map(String).join(" "),
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
      Sentry.captureMessage(args.map(String).join(" "), "warning");
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
        new Error(args.map(String).join(" "));
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
