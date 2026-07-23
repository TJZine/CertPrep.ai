import { db } from "./dbInstance";
import type { Quiz } from "@/types/quiz";
import { NIL_UUID } from "@/lib/constants";
import {
  ZEN_DRAFT_SCHEMA_VERSION,
  type ZenDraftAnswer,
  type ZenDraftAssessment,
  type ZenDraftKey,
  type ZenQuizDraft,
} from "@/types/zenDraft";

const MAX_ELAPSED_SECONDS = 60 * 60 * 24 * 30;

export class ZenDraftConflictError extends Error {
  constructor(message = "This quiz draft was updated in another tab.") {
    super(message);
    this.name = "ZenDraftConflictError";
  }
}

function isFiniteInteger(value: unknown, minimum = 0): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isSafeInteger(value) &&
    value >= minimum
  );
}

function hasUniqueStrings(values: unknown): values is string[] {
  return (
    Array.isArray(values) &&
    values.length > 0 &&
    values.every((value) => typeof value === "string" && value.length > 0) &&
    new Set(values).size === values.length
  );
}

function isValidAnswer(
  value: unknown,
  questionIds: Set<string>,
  questionsById: Map<string, Quiz["questions"][number]>,
  startedAt: number,
): value is ZenDraftAnswer {
  if (!value || typeof value !== "object") return false;
  const answer = value as Partial<ZenDraftAnswer>;
  const question = answer.question_id
    ? questionsById.get(answer.question_id)
    : undefined;
  return Boolean(
    answer.question_id &&
    questionIds.has(answer.question_id) &&
    question &&
    typeof answer.selected_answer === "string" &&
    Object.prototype.hasOwnProperty.call(
      question.options,
      answer.selected_answer,
    ) &&
    typeof answer.is_correct === "boolean" &&
    isFiniteInteger(answer.answered_at, startedAt) &&
    (answer.difficulty === null ||
      answer.difficulty === "again" ||
      answer.difficulty === "hard" ||
      answer.difficulty === "good") &&
    isFiniteInteger(answer.time_spent_seconds) &&
    answer.time_spent_seconds <= 300,
  );
}

export function validateZenDraft(
  value: unknown,
  quiz: Quiz,
  userId: string,
): value is ZenQuizDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<ZenQuizDraft>;
  if (
    draft.schema_version !== ZEN_DRAFT_SCHEMA_VERSION ||
    draft.user_id !== userId ||
    draft.quiz_id !== quiz.id ||
    draft.mode !== "zen" ||
    !isFiniteInteger(draft.quiz_version, 1) ||
    typeof draft.quiz_hash !== "string" ||
    draft.quiz_hash.length === 0 ||
    !hasUniqueStrings(draft.question_ids) ||
    !isFiniteInteger(draft.current_index) ||
    draft.current_index >= draft.question_ids.length ||
    !Array.isArray(draft.answers) ||
    !Array.isArray(draft.flagged_question_ids) ||
    !Array.isArray(draft.hard_question_ids) ||
    (draft.selected_answer !== null &&
      typeof draft.selected_answer !== "string") ||
    typeof draft.has_submitted !== "boolean" ||
    typeof draft.show_explanation !== "boolean" ||
    !isFiniteInteger(draft.elapsed_seconds) ||
    draft.elapsed_seconds > MAX_ELAPSED_SECONDS ||
    !isFiniteInteger(draft.started_at, 1) ||
    !isFiniteInteger(draft.updated_at, draft.started_at) ||
    typeof draft.writer_id !== "string" ||
    draft.writer_id.length === 0 ||
    !isFiniteInteger(draft.revision, 1) ||
    (draft.reconciled_result_at !== undefined &&
      !isFiniteInteger(draft.reconciled_result_at, 1))
  ) {
    return false;
  }

  const quizQuestionIds = quiz.questions.map((question) => question.id);
  if (
    quizQuestionIds.length !== draft.question_ids.length ||
    quizQuestionIds.some((id) => !draft.question_ids?.includes(id))
  ) {
    return false;
  }

  const questionIds = new Set(draft.question_ids);
  const questionsById = new Map(
    quiz.questions.map((question) => [question.id, question]),
  );
  if (
    draft.answers.some(
      (answer) =>
        !isValidAnswer(answer, questionIds, questionsById, draft.started_at!),
    ) ||
    new Set(draft.answers.map((answer) => answer.question_id)).size !==
      draft.answers.length ||
    draft.flagged_question_ids.some((id) => !questionIds.has(id)) ||
    draft.hard_question_ids.some((id) => !questionIds.has(id))
  ) {
    return false;
  }

  const currentQuestionId = draft.question_ids[draft.current_index];
  const currentQuestion = currentQuestionId
    ? questionsById.get(currentQuestionId)
    : undefined;
  if (
    !currentQuestion ||
    (draft.selected_answer !== null &&
      !Object.prototype.hasOwnProperty.call(
        currentQuestion.options,
        draft.selected_answer,
      )) ||
    (draft.has_submitted &&
      !draft.answers.some(
        (answer) => answer.question_id === currentQuestion.id,
      ))
  ) {
    return false;
  }

  return true;
}

export async function assessZenDraft(
  draft: unknown,
  quiz: Quiz,
  userId: string,
): Promise<ZenDraftAssessment | null> {
  if (!draft || typeof draft !== "object") return null;
  const candidate = draft as ZenQuizDraft;
  if (
    quiz.deleted_at ||
    (quiz.user_id !== userId && quiz.user_id !== NIL_UUID)
  ) {
    return {
      compatibility: "invalid",
      draft: candidate,
      reason: "The quiz is unavailable for this account.",
    };
  }
  if (!validateZenDraft(candidate, quiz, userId)) {
    return {
      compatibility: "invalid",
      draft: candidate,
      reason: "The saved draft is incomplete or uses an unsupported schema.",
    };
  }
  if (
    candidate.quiz_version !== quiz.version ||
    !quiz.quiz_hash ||
    candidate.quiz_hash !== quiz.quiz_hash
  ) {
    return {
      compatibility: "quiz-changed",
      draft: candidate,
      reason: "The quiz content changed after this draft was saved.",
    };
  }

  const matchingResults = await db.results
    .where("[user_id+quiz_id]")
    .equals([userId, quiz.id])
    .filter((result) => !result.deleted_at)
    .toArray();
  const latestResultAt = matchingResults.reduce(
    (latest, result) => Math.max(latest, result.timestamp),
    0,
  );
  const conflictBoundary = Math.max(
    candidate.started_at,
    candidate.reconciled_result_at ?? 0,
  );
  if (latestResultAt > conflictBoundary) {
    return {
      compatibility: "result-conflict",
      draft: candidate,
      latest_result_at: latestResultAt,
      reason: "This quiz was completed after the local draft began.",
    };
  }

  return { compatibility: "resumable", draft: candidate };
}

export async function getZenDraft(
  userId: string,
  quizId: string,
): Promise<ZenQuizDraft | undefined> {
  return db.zenDrafts.get([userId, quizId]);
}

export async function createZenDraft(draft: ZenQuizDraft): Promise<void> {
  await db.transaction("rw", db.zenDrafts, async () => {
    const key: ZenDraftKey = [draft.user_id, draft.quiz_id];
    if (await db.zenDrafts.get(key)) {
      throw new ZenDraftConflictError();
    }
    await db.zenDrafts.add(draft);
  });
}

export async function saveZenDraft(
  draft: ZenQuizDraft,
  expectedRevision: number,
): Promise<ZenQuizDraft> {
  return db.transaction("rw", db.zenDrafts, async () => {
    const key: ZenDraftKey = [draft.user_id, draft.quiz_id];
    const current = await db.zenDrafts.get(key);
    if (
      !current ||
      current.writer_id !== draft.writer_id ||
      current.revision !== expectedRevision
    ) {
      throw new ZenDraftConflictError();
    }
    const next = {
      ...draft,
      revision: expectedRevision + 1,
      updated_at: Math.max(Date.now(), current.updated_at + 1),
    };
    await db.zenDrafts.put(next);
    return next;
  });
}

export async function claimZenDraft(
  draft: ZenQuizDraft,
  writerId: string,
  reconciledResultAt?: number,
): Promise<ZenQuizDraft> {
  return db.transaction("rw", db.zenDrafts, async () => {
    const key: ZenDraftKey = [draft.user_id, draft.quiz_id];
    const current = await db.zenDrafts.get(key);
    if (!current || current.revision !== draft.revision) {
      throw new ZenDraftConflictError();
    }
    const claimed: ZenQuizDraft = {
      ...current,
      writer_id: writerId,
      revision: current.revision + 1,
      updated_at: Math.max(Date.now(), current.updated_at + 1),
      reconciled_result_at: reconciledResultAt ?? current.reconciled_result_at,
    };
    await db.zenDrafts.put(claimed);
    return claimed;
  });
}

export async function discardZenDraft(
  userId: string,
  quizId: string,
  expectedRevision?: number,
): Promise<void> {
  await db.transaction("rw", db.zenDrafts, async () => {
    const key: ZenDraftKey = [userId, quizId];
    const current = await db.zenDrafts.get(key);
    if (!current) return;
    if (
      expectedRevision !== undefined &&
      current.revision !== expectedRevision
    ) {
      throw new ZenDraftConflictError();
    }
    await db.zenDrafts.delete(key);
  });
}
