import { logger } from "@/lib/logger";

export type SyncRunnerStatus = "synced" | "skipped" | "failed";

export type SyncRunnerOutcome = {
  incomplete: boolean;
  status: SyncRunnerStatus;
  error: string | null;
  shouldRetry: boolean;
};

type OutcomeOptions = {
  error?: string | null;
  incomplete?: boolean;
  shouldRetry?: boolean;
};

export function syncedSyncOutcome(
  options?: Pick<OutcomeOptions, "error">,
): SyncRunnerOutcome {
  return {
    incomplete: false,
    status: "synced",
    error: options?.error ?? null,
    shouldRetry: false,
  };
}

export function skippedSyncOutcome(
  options?: OutcomeOptions,
): SyncRunnerOutcome {
  return {
    incomplete: options?.incomplete ?? false,
    status: "skipped",
    error: options?.error ?? null,
    shouldRetry: options?.shouldRetry ?? false,
  };
}

export function failedSyncOutcome(
  options?: OutcomeOptions,
): SyncRunnerOutcome {
  return {
    incomplete: options?.incomplete ?? true,
    status: "failed",
    error: options?.error ?? null,
    shouldRetry: options?.shouldRetry ?? true,
  };
}

export function createSupabaseClientGetter<TClient>(
  createClient: () => TClient | undefined,
): () => TClient | undefined {
  let cached: TClient | undefined;

  return () => {
    if (!cached) {
      cached = createClient();
    }
    return cached;
  };
}

type ErrorMessageStyle = "sync" | "srs";

export function toErrorMessage(
  error: unknown,
  options?: { style?: ErrorMessageStyle },
): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  const style = options?.style ?? "sync";

  // Handle Supabase PostgrestError-like objects (properties may not serialize with JSON.stringify)
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;

    if (style === "srs") {
      if (typeof e.message === "string") {
        const parts = [e.message];
        if (e.code) parts.push(`code=${e.code}`);
        if (e.details) parts.push(`details=${e.details}`);
        if (e.hint) parts.push(`hint=${e.hint}`);
        return parts.join(" | ");
      }
    } else if (e.message || e.code) {
      const parts: string[] = [];
      if (e.code) parts.push(`[${e.code}]`);
      if (e.message) parts.push(String(e.message));
      if (e.details) parts.push(`Details: ${e.details}`);
      if (e.hint) parts.push(`Hint: ${e.hint}`);
      if (parts.length > 0) return parts.join(" ");
    }
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized === "{}") {
      return style === "srs"
        ? "Unknown error (empty object)"
        : "Unknown error (empty error object)";
    }
    return serialized;
  } catch {
    return "Unknown error";
  }
}

export function toSafeCursorTimestamp(
  candidate: unknown,
  fallback: string,
  context: Record<string, unknown>,
  options?: {
    invalidCandidateMessage?: string;
    invalidFallbackMessage?: string;
  },
): string {
  if (typeof candidate === "string" && !Number.isNaN(Date.parse(candidate))) {
    return new Date(candidate).toISOString();
  }

  if (!Number.isNaN(Date.parse(fallback))) {
    logger.warn(
      options?.invalidCandidateMessage ??
        "Invalid cursor timestamp encountered, using fallback",
      {
        ...context,
        fallback,
      },
    );
    return new Date(fallback).toISOString();
  }

  logger.error(
    options?.invalidFallbackMessage ??
      "Invalid cursor timestamp and fallback; defaulting to epoch",
    {
      ...context,
    },
  );
  return "1970-01-01T00:00:00.000Z";
}
