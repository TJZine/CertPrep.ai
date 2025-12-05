import { logger } from "@/lib/logger";
import type { Question, Quiz } from "@/types/quiz";

export type QuizId = string;

export type QuizCore = Pick<
  Quiz,
  "title" | "description" | "tags" | "questions"
>;

export type QuizMeta = Pick<Quiz, "id" | "version"> & {
  deleted_at?: number | null;
  quiz_hash?: string | null;
  updated_at?: number;
};

export interface RemoteQuizRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  version: number;
  questions: Question[];
  quiz_hash?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RemoteQuizInput {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  tags?: string[] | null;
  version: number;
  questions: Question[];
  quiz_hash?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

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

export async function computeQuizHash(core: QuizCore): Promise<string> {
  const normalized = normalizeForStableSerialization(core);
  const serialized = JSON.stringify(normalized);
  return hashString(serialized);
}

export async function toRemoteQuiz(
  userId: string,
  local: Quiz,
): Promise<RemoteQuizInput> {
  if (local.user_id !== userId) {
    throw new Error(
      `Security mismatch: Attempting to sync quiz ${local.id} owned by ${local.user_id} as ${userId}`,
    );
  }
  const quizHash = local.quiz_hash ?? (await computeQuizHash(local));
  const updatedAt = local.updated_at ?? local.created_at;

  return {
    id: local.id,
    user_id: userId,
    title: local.title,
    description: local.description,
    tags: local.tags,
    version: local.version,
    questions: local.questions,
    quiz_hash: quizHash,
    created_at: new Date(local.created_at).toISOString(),
    updated_at: new Date(updatedAt).toISOString(),
    deleted_at: local.deleted_at
      ? new Date(local.deleted_at).toISOString()
      : null,
  };
}

import { NIL_UUID } from "@/lib/constants";

export async function toLocalQuiz(remote: RemoteQuizRow): Promise<Quiz> {
  return {
    id: remote.id,
    user_id: remote.user_id ?? NIL_UUID,
    title: remote.title,
    description: remote.description ?? "",
    tags: remote.tags ?? [],
    questions: remote.questions,
    version: remote.version,
    created_at: new Date(remote.created_at).getTime(),
    updated_at: new Date(remote.updated_at).getTime(),
    deleted_at: remote.deleted_at
      ? new Date(remote.deleted_at).getTime()
      : null,
    quiz_hash: remote.quiz_hash ?? null,
    last_synced_version: remote.version,
    last_synced_at: Date.now(),
  };
}

export function resolveQuizConflict(
  local: Quiz | undefined,
  remote: Quiz,
): { winner: "local" | "remote"; merged: Quiz } {
  if (!local) {
    return { winner: "remote", merged: remote };
  }

  const localVersion = local.version ?? 0;
  const remoteVersion = remote.version ?? 0;
  const localDeleted =
    local.deleted_at !== null && local.deleted_at !== undefined;
  const remoteDeleted =
    remote.deleted_at !== null && remote.deleted_at !== undefined;

  if (remoteVersion > localVersion) {
    return { winner: "remote", merged: remote };
  }

  if (localVersion > remoteVersion) {
    return { winner: "local", merged: local };
  }

  // At this point versions are equal; prefer the deleted state if it exists to respect user intent.
  if (remoteDeleted !== localDeleted) {
    return remoteDeleted
      ? { winner: "remote", merged: remote }
      : { winner: "local", merged: local };
  }

  const localHash = local.quiz_hash ?? null;
  const remoteHash = remote.quiz_hash ?? null;

  if (localHash && remoteHash && localHash === remoteHash) {
    return { winner: "local", merged: { ...local, quiz_hash: localHash } };
  }

  if (!localHash && remoteHash) {
    return { winner: "remote", merged: remote };
  }

  if (localHash && !remoteHash) {
    return { winner: "local", merged: local };
  }

  const localUpdated = local.updated_at ?? local.created_at;
  const remoteUpdated = remote.updated_at ?? remote.created_at;

  if (remoteUpdated > localUpdated) {
    logger.warn(
      "Quiz conflict with equal versions; choosing remote based on updated_at",
      { quizId: remote.id },
    );
    return { winner: "remote", merged: remote };
  }

  if (localUpdated > remoteUpdated) {
    logger.warn(
      "Quiz conflict with equal versions; choosing local based on updated_at",
      { quizId: local.id },
    );
    return { winner: "local", merged: local };
  }

  logger.warn("Quiz conflict unresolved; defaulting to remote version", {
    quizId: remote.id,
  });
  return { winner: "remote", merged: remote };
}
