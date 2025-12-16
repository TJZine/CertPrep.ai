import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

export const createClient = async (): Promise<
  ReturnType<typeof createServerClient>
> => {
  const cookieStore = await cookies();
  const sharedCookieOptions: Pick<
    CookieOptions,
    "httpOnly" | "secure" | "sameSite"
  > = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  };

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== "production") {
      throw new Error("Missing Supabase environment variables");
    }
    // In production, we must fail hard if configuration is missing to prevent silent data loss or confusion.
    // This ensures the issue is caught immediately in deployment or monitoring.
    logger.error(
      "CRITICAL: Missing Supabase environment variables in production. Application cannot function.",
    );
    throw new Error(
      "Server configuration error: Missing Supabase credentials.",
    );
  }

  if (!supabaseUrl.startsWith("http")) {
    supabaseUrl = `https://${supabaseUrl}`;
  }

  const SUPABASE_TIMEOUT_MS = 30000;

  async function fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    // If caller provides their own signal, respect it (explicit opt-out of built-in timeout)
    if (init?.signal) {
      return fetch(input, init);
    }

    try {
      // Use AbortSignal.timeout (Node 18+)
      return await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new Error(
          `Supabase request timed out after ${SUPABASE_TIMEOUT_MS}ms`,
        );
      }
      throw e;
    }
  }

  try {
    return createServerClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: fetchWithTimeout,
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
              ...sharedCookieOptions,
            });
          } catch (error) {
            // The `cookies().set()` method can only be called in a Server Component or Route Handler.
            // This error `cookies().set()` will cause when called from a Client Component.
            if (process.env.NODE_ENV === "development") {
              logger.warn("Could not set cookie from Server Client", error);
            }
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({
              name,
              value: "",
              ...options,
              ...sharedCookieOptions,
            });
          } catch (error) {
            if (process.env.NODE_ENV === "development") {
              logger.warn("Could not remove cookie from Server Client", error);
            }
          }
        },
      },
    });
  } catch (error) {
    logger.error("Failed to create Supabase server client", error);
    // Re-throw in development for immediate feedback
    if (process.env.NODE_ENV === "development") {
      throw error;
    }
    // In production, surface a contextual error without masking the root cause in logs.
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error creating Supabase client";
    throw new Error(`Failed to create Supabase client: ${message}`);
  }
};
