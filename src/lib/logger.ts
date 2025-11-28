import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  log: (...args: unknown[]): void => {
    if (!isProduction) {
      console.log(...args);
    } else {
      // Add breadcrumbs for debugging context without logging to console
      Sentry.addBreadcrumb({
        category: 'log',
        message: args.map(String).join(' '),
        level: 'info',
      });
    }
  },

  warn: (...args: unknown[]): void => {
    if (!isProduction) {
      console.warn(...args);
    } else {
      Sentry.captureMessage(args.map(String).join(' '), 'warning');
    }
  },

  error: (...args: unknown[]): void => {
    if (!isProduction) {
      console.error(...args);
    }
    
    // In production, send to Sentry
    const errorObj = args.find(arg => arg instanceof Error) || new Error(args.map(String).join(' '));
    const extras = args.filter(arg => arg !== errorObj);

    Sentry.captureException(errorObj, {
      extra: { rawArgs: extras }
    });
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