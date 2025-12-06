import { AuthError } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Maps Supabase auth errors to generic, safe messages to prevent user enumeration.
 * @param error The error object returned from Supabase auth calls.
 * @returns A generic error message string.
 */
export function getAuthErrorMessage(
  error: unknown,
  context: "login" | "signup" | "profile" = "login",
): string {
  if (!error) return "";

  let status: number | undefined;
  let name: string;

  if (isAuthError(error)) {
    status = error.status;
    name = error.name;
  } else if (error && typeof error === "object" && "name" in error) {
    const { name: rawName } = error as { name?: unknown };
    name = String(rawName ?? "Error");
  } else {
    name = "UnknownError";
  }

  // Log sanitized error details; expected 4xx auth failures at warn to reduce noise.
  const logPayload = { status, name };
  if (status && status >= 500) {
    logger.error("Auth Error:", logPayload);
  } else {
    logger.warn("Auth Warning:", logPayload);
  }

  if (context === "signup") {
    return "Unable to create account. Please try again.";
  }

  if (context === "profile") {
    return "Unable to update profile. Please try again.";
  }

  return "Invalid email or password. Please try again.";
}
