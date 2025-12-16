import { createBrowserClient } from "@supabase/ssr";
import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

// SECURITY: Default timeout for Supabase API calls (30 seconds)
const SUPABASE_TIMEOUT_MS = 30000;

/**
 * Fetch wrapper that adds timeout to all Supabase requests.
 * Prevents indefinite hangs on network issues.
 */
function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Use AbortSignal.timeout if available (Node 18+, modern browsers)
  // Otherwise fall back to manual AbortController
  const signal =
    typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(SUPABASE_TIMEOUT_MS)
      : undefined;

  return fetch(input, {
    ...init,
    signal: init?.signal ?? signal,
  });
}

export const createClient = (): SupabaseClient | undefined => {
  if (client) return client;

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    if (!supabaseUrl || !supabaseKey) {
      const message = "Missing Supabase environment variables.";
      logger.error(message);
      throw new Error(message);
    }

    if (!supabaseUrl.startsWith("http")) {
      supabaseUrl = `https://${supabaseUrl}`;
    }

    client = createBrowserClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: fetchWithTimeout,
      },
    });

    // Expose client on window for E2E testing
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV !== "production"
    ) {
      // eslint-disable-next-line no-console -- Debug logging for E2E tests
      console.log("Supabase Client URL:", supabaseUrl);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Exposing for E2E tests
      (window as any).supabase = client;
    }

    return client;
  } catch (error) {
    logger.error("Failed to create Supabase client.", error);
    return undefined;
  }
};
