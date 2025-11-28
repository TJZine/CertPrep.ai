const isProduction = process.env.NODE_ENV === 'production';

/**
 * Conditional logger that suppresses output in production environments
 * to prevent information leakage and console noise.
 */
export const logger = {
  log: (...args: unknown[]): void => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  
  warn: (...args: unknown[]): void => {
    if (!isProduction) {
      console.warn(...args);
    }
  },
  
  error: (...args: unknown[]): void => {
    // In production, you might want to send this to Sentry/LogRocket
    // For now, we suppress it or log only critical info if needed.
    // We allow error logging in production if it's critical, but for general
    // "caught and handled" errors, we might want to suppress or sanitize.
    // Current requirement is "no-ops in production" or dedicated service.
    if (!isProduction) {
      console.error(...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (!isProduction) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]): void => {
    if (!isProduction) {
      console.debug(...args);
    }
  }
};
