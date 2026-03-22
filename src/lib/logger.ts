/* eslint-disable no-console */
import * as Sentry from "@sentry/nextjs";

const getIsProduction = (): boolean => process.env.NODE_ENV === "production";

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
    // Match keys in JSON or strings: "password": "...", password=..., password: ...
    .replace(
      /\b(token|key|password|pwd|secret|api[_-]?key|apikey)\b\s*["']?[:=]\s*["']?[^"'\r\n,]+["']?/gi,
      "$1=[REDACTED]",
    )
    // Match "Bearer <token>" format and prose-style "token <token>" (include '=' for base64)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/\-=]+\b/gi, "Bearer [REDACTED]")
    .replace(/\btoken\s+[A-Za-z0-9._~+/\-=]+\b/gi, "token [REDACTED]")
    .replace(
      /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}\b/g,
      "[GH_TOKEN_REDACTED]",
    )
    .replace(/\bsk_(live|test)_[A-Za-z0-9]{24,}\b/g, "[STRIPE_KEY_REDACTED]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[JWT_REDACTED]",
    )
    .replace(/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, "[AWS_KEY_REDACTED]");
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
    if (!getIsProduction()) {
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
    if (!getIsProduction()) {
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
    const isProd = getIsProduction();

    if (!isProd) {
      console.error(...args);
    } else {
      // In production, send to Sentry with sanitized message
      const originalError = args.find((arg) => arg instanceof Error) as
        | Error
        | undefined;

      let errorObj: Error;
      if (originalError) {
        // Sanitize the message and create a new Error to preserve privacy
        const sanitizedMsg = sanitizeForSentry([originalError.message]);
        errorObj = new Error(sanitizedMsg);
        errorObj.name = originalError.name;
        errorObj.stack = originalError.stack;
      } else {
        errorObj = new Error(sanitizeForSentry(args));
      }

      const extras = args.filter((arg) => arg !== originalError);
      const normalizedExtras = extras.map((extra) =>
        typeof extra === "object" && extra !== null ? extra : { value: extra },
      );
      const serializedExtras = sanitizeForSentry(normalizedExtras);

      Sentry.captureException(errorObj, {
        extra: { rawArgs: serializedExtras },
      });
    }
  },

  /**
   * Logs an informational message (alias for log, but distinct in some contexts).
   *
   * @remarks
   * - **Development**: Prints to `console.info`.
   * - **Production**: Adds a breadcrumb to Sentry (level: "info") without printing to console.
   *
   * @param args - The message(s) to log.
   */
  info: (...args: unknown[]): void => {
    if (!getIsProduction()) {
      console.info(...args);
    } else {
      Sentry.addBreadcrumb({
        category: "info",
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
    if (!getIsProduction()) {
      console.debug(...args);
    }
  },
};
