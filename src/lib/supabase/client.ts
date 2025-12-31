import type { Database } from "@/types/database.types";
import { createBrowserClient } from "@supabase/ssr";
import { logger } from "@/lib/logger";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient<Database> | undefined;

// SECURITY: Default timeout for Supabase API calls (30 seconds)
const SUPABASE_TIMEOUT_MS = 30000;

/**
 * Fetch wrapper that adds timeout to all Supabase requests.
 * Prevents indefinite hangs on network issues.
 * 
 * DESIGN: Caller-provided init.signal overrides the built-in timeout (explicit opt-out).
 */
function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // If caller provides their own signal, respect it (explicit opt-out of built-in timeout)
  if (init?.signal) {
    return fetch(input, init);
  }

  // Use AbortSignal.timeout if available (Node 18+, modern browsers)
  if (typeof AbortSignal.timeout === "function") {
    return fetch(input, {
      ...init,
      signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
    });
  }

  // Fallback for older runtimes (Safari <15, older Node)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);

  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

export const createClient = (): SupabaseClient<Database> | undefined => {
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

    client = createBrowserClient<Database>(supabaseUrl, supabaseKey, {
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
