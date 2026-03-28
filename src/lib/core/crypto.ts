let cachedSubtleCrypto: SubtleCrypto | null = null;

async function getSubtleCrypto(): Promise<SubtleCrypto> {
  if (cachedSubtleCrypto) return cachedSubtleCrypto;

  if (typeof crypto !== "undefined" && crypto.subtle) {
    cachedSubtleCrypto = crypto.subtle;
    return cachedSubtleCrypto;
  }

  const nodeCrypto = await import("crypto");
  if (nodeCrypto.webcrypto?.subtle) {
    cachedSubtleCrypto = nodeCrypto.webcrypto.subtle as unknown as SubtleCrypto;
    return cachedSubtleCrypto;
  }

  throw new Error("SubtleCrypto is not available in this environment.");
}

function normalizeForStableSerialization(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForStableSerialization(item));
  }

  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = normalizeForStableSerialization(record[key]);
      return acc;
    }, {});
}

async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const subtle = await getSubtleCrypto();
  const digest = await subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type QuizHashCore = {
  title: string;
  description: string;
  tags: string[];
  questions: unknown;
};

export async function computeQuizHash(core: QuizHashCore): Promise<string> {
  const normalized = normalizeForStableSerialization(core);
  const serialized = JSON.stringify(normalized);
  return hashString(serialized);
}

/**
 * Generates a cryptographically strong UUID.
 *
 * Uses the native `crypto.randomUUID()` API.
 *
 * @returns A string valid UUID v4.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hashes an answer string using SHA-256.
 *
 * Useful for validating answers client-side without exposing the raw text.
 *
 * @param answer - The raw answer text.
 * @returns A Promise resolving to the hex string of the SHA-256 hash.
 */
export async function hashAnswer(answer: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(answer);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
