import { AuthError } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    '__isAuthError' in error
  );
}

/**
 * Maps Supabase auth errors to generic, safe messages to prevent user enumeration.
 * @param error The error object returned from Supabase auth calls.
 * @returns A generic error message string.
 */
export function getAuthErrorMessage(error: unknown, context: 'login' | 'signup' | 'profile' = 'login'): string {
  if (!error) return '';

  let status: number | undefined;
  let name: string;

  if (isAuthError(error)) {
    status = error.status;
    name = error.name;
  } else if ((error as any) instanceof Error) { // eslint-disable-line @typescript-eslint/no-explicit-any
    name = (error as Error).name;
  } else {
    name = 'UnknownError';
  }

  // Log sanitized error details
  logger.error('Auth Error:', {
    status,
    name,
  });

  return context === 'signup'
    ? 'Unable to create account. Please try again.'
    : 'Invalid email or password. Please try again.';
}
