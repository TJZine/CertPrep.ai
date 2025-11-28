import { AuthError } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

/**
 * Maps Supabase auth errors to generic, safe messages to prevent user enumeration.
 * @param error The error object returned from Supabase auth calls.
 * @returns A generic error message string.
 */
export function getAuthErrorMessage(error: AuthError | null): string {
  if (!error) return '';

  // Log the actual error for debugging purposes (in a real app, send to Sentry)
  logger.error('Auth Error:', { message: error.message, status: error.status });

  // List of error codes/messages that might reveal user existence
  // Note: Supabase error codes can be inconsistent, so we check messages too if needed.
  // Common codes: 'invalid_credentials', 'user_not_found', 'email_not_confirmed'
  
  // We want to return a generic message for login failures
  return 'Invalid email or password. Please try again.';
}
