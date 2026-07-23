import * as React from "react";
import {
  assessZenDraft,
  claimZenDraft,
  createZenDraft,
  discardZenDraft,
  getZenDraft,
  saveZenDraft,
  ZenDraftConflictError,
} from "@/db/zenDrafts";
import { computeQuizHash, generateUUID } from "@/lib/core/crypto";
import {
  useQuizSessionStore,
  type AnswerRecord,
} from "@/stores/quizSessionStore";
import type { Quiz } from "@/types/quiz";
import {
  ZEN_DRAFT_SCHEMA_VERSION,
  type ZenDraftAssessment,
  type ZenQuizDraft,
} from "@/types/zenDraft";

const AUTOSAVE_DEBOUNCE_MS = 350;
const TIMER_CHECKPOINT_SECONDS = 30;

export type ZenDraftSaveStatus =
  "idle" | "saving" | "saved" | "error" | "conflict";

export interface ZenDraftDecision {
  kind: "resume" | "result-conflict" | "incompatible";
  assessment: ZenDraftAssessment;
}

interface UseZenDraftSessionOptions {
  quiz: Quiz;
  userId: string | null;
  enabled: boolean;
  seconds: number;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: (seconds?: number) => void;
}

interface UseZenDraftSessionResult {
  isInitializing: boolean;
  decision: ZenDraftDecision | null;
  saveStatus: ZenDraftSaveStatus;
  saveMessage: string | null;
  draftOwnerId: string | null;
  resume: () => Promise<void>;
  startOver: () => Promise<void>;
  resumeAsNewAttempt: () => Promise<void>;
  flushDraft: (force?: boolean) => Promise<boolean>;
}

async function resolveQuizHash(quiz: Quiz): Promise<string> {
  if (quiz.quiz_hash) return quiz.quiz_hash;
  return computeQuizHash({
    title: quiz.title,
    description: quiz.description,
    tags: quiz.tags,
    questions: quiz.questions,
  });
}

function serializeAnswers(
  answers: Map<string, AnswerRecord>,
): ZenQuizDraft["answers"] {
  return Array.from(answers.values()).map((answer) => ({
    question_id: answer.questionId,
    selected_answer: answer.selectedAnswer,
    is_correct: answer.isCorrect,
    answered_at: answer.timestamp,
    difficulty: answer.difficulty,
    time_spent_seconds: answer.timeSpentSeconds,
  }));
}

export function useZenDraftSession({
  quiz,
  userId,
  enabled,
  seconds,
  startTimer,
  pauseTimer,
  resetTimer,
}: UseZenDraftSessionOptions): UseZenDraftSessionResult {
  const initializeSession = useQuizSessionStore(
    (state) => state.initializeSession,
  );
  const hydrateZenSession = useQuizSessionStore(
    (state) => state.hydrateZenSession,
  );
  const resetSession = useQuizSessionStore((state) => state.resetSession);
  const currentIndex = useQuizSessionStore((state) => state.currentIndex);
  const answers = useQuizSessionStore((state) => state.answers);
  const flaggedQuestions = useQuizSessionStore(
    (state) => state.flaggedQuestions,
  );
  const hardQuestions = useQuizSessionStore((state) => state.hardQuestions);
  const selectedAnswer = useQuizSessionStore((state) => state.selectedAnswer);
  const hasSubmitted = useQuizSessionStore((state) => state.hasSubmitted);
  const showExplanation = useQuizSessionStore((state) => state.showExplanation);
  const isComplete = useQuizSessionStore((state) => state.isComplete);

  const [isInitializing, setIsInitializing] = React.useState(enabled);
  const [decision, setDecision] = React.useState<ZenDraftDecision | null>(null);
  const [saveStatus, setSaveStatus] =
    React.useState<ZenDraftSaveStatus>("idle");
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);
  const [draftOwnerId, setDraftOwnerId] = React.useState<string | null>(null);

  const mountedRef = React.useRef(true);
  const readyRef = React.useRef(false);
  const dirtyRef = React.useRef(false);
  const writerIdRef = React.useRef(generateUUID());
  const revisionRef = React.useRef<number | null>(null);
  const startedAtRef = React.useRef<number | null>(null);
  const reconciledResultAtRef = React.useRef<number | undefined>(undefined);
  const quizHashRef = React.useRef<string | null>(null);
  const secondsRef = React.useRef(seconds);
  const saveChainRef = React.useRef<Promise<boolean>>(Promise.resolve(true));

  React.useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  const reportFailure = React.useCallback((error: unknown): void => {
    if (!mountedRef.current) return;
    if (error instanceof ZenDraftConflictError) {
      readyRef.current = false;
      setSaveStatus("conflict");
      setSaveMessage(
        "This draft was updated in another tab. Your newer local work was not overwritten.",
      );
      return;
    }
    setSaveStatus("error");
    setSaveMessage(
      "We couldn't save your latest progress on this device. Your previous saved draft is still available.",
    );
  }, []);

  const buildDraft = React.useCallback((): ZenQuizDraft | null => {
    if (
      !enabled ||
      !userId ||
      !quizHashRef.current ||
      revisionRef.current === null ||
      startedAtRef.current === null
    ) {
      return null;
    }
    const state = useQuizSessionStore.getState();
    return {
      schema_version: ZEN_DRAFT_SCHEMA_VERSION,
      user_id: userId,
      quiz_id: quiz.id,
      mode: "zen",
      quiz_version: quiz.version,
      quiz_hash: quizHashRef.current,
      question_ids: [...state.questionQueue],
      current_index: state.currentIndex,
      answers: serializeAnswers(state.answers),
      flagged_question_ids: Array.from(state.flaggedQuestions),
      hard_question_ids: Array.from(state.hardQuestions),
      selected_answer: state.hasSubmitted ? state.selectedAnswer : null,
      has_submitted: state.hasSubmitted,
      show_explanation: state.showExplanation,
      elapsed_seconds: Math.max(0, Math.floor(secondsRef.current)),
      started_at: startedAtRef.current,
      updated_at: Date.now(),
      reconciled_result_at: reconciledResultAtRef.current,
      writer_id: writerIdRef.current,
      revision: revisionRef.current,
    };
  }, [enabled, quiz.id, quiz.version, userId]);

  const flushDraft = React.useCallback(
    async (force = false): Promise<boolean> => {
      if (!enabled) return true;
      if (!readyRef.current) return false;
      if (force) dirtyRef.current = true;
      if (!dirtyRef.current) return true;
      // Capture the Zustand state synchronously. Route cleanup resets the
      // shared store immediately after requesting this flush, so reading the
      // store later from the queued promise could otherwise persist an empty
      // session over the user's latest progress.
      const snapshot = buildDraft();
      if (!snapshot) return false;
      dirtyRef.current = false;
      saveChainRef.current = saveChainRef.current.then(async () => {
        if (!readyRef.current || revisionRef.current === null) return false;
        const expectedRevision = revisionRef.current;
        const draft = { ...snapshot, revision: expectedRevision };
        if (mountedRef.current) {
          setSaveStatus("saving");
          setSaveMessage(null);
        }
        try {
          const saved = await saveZenDraft(draft, expectedRevision);
          revisionRef.current = saved.revision;
          if (mountedRef.current) {
            setSaveStatus("saved");
            setSaveMessage("Saved on this device.");
          }
          return true;
        } catch (error) {
          dirtyRef.current = true;
          reportFailure(error);
          return false;
        }
      });
      return saveChainRef.current;
    },
    [buildDraft, enabled, reportFailure],
  );

  const createFreshDraft = React.useCallback(async (): Promise<void> => {
    if (!userId || !quizHashRef.current) return;
    pauseTimer();
    resetTimer(0);
    const now = Date.now();
    startedAtRef.current = now;
    reconciledResultAtRef.current = undefined;
    revisionRef.current = 1;
    const draft: ZenQuizDraft = {
      schema_version: ZEN_DRAFT_SCHEMA_VERSION,
      user_id: userId,
      quiz_id: quiz.id,
      mode: "zen",
      quiz_version: quiz.version,
      quiz_hash: quizHashRef.current,
      question_ids: quiz.questions.map((question) => question.id),
      current_index: 0,
      answers: [],
      flagged_question_ids: [],
      hard_question_ids: [],
      selected_answer: null,
      has_submitted: false,
      show_explanation: false,
      elapsed_seconds: 0,
      started_at: now,
      updated_at: now,
      writer_id: writerIdRef.current,
      revision: 1,
    };
    try {
      await createZenDraft(draft);
      initializeSession(quiz.id, "zen", quiz.questions);
      readyRef.current = true;
      dirtyRef.current = false;
      if (mountedRef.current) {
        setDraftOwnerId(writerIdRef.current);
        setSaveStatus("saved");
        setSaveMessage("Saved on this device.");
        setDecision(null);
      }
      startTimer();
    } catch (error) {
      reportFailure(error);
      throw error;
    }
  }, [
    initializeSession,
    pauseTimer,
    quiz.id,
    quiz.questions,
    quiz.version,
    reportFailure,
    resetTimer,
    startTimer,
    userId,
  ]);

  const activateDraft = React.useCallback(
    async (acknowledgeResult = false): Promise<void> => {
      if (!decision) return;
      try {
        const claimed = await claimZenDraft(
          decision.assessment.draft,
          writerIdRef.current,
          acknowledgeResult ? decision.assessment.latest_result_at : undefined,
        );
        revisionRef.current = claimed.revision;
        startedAtRef.current = claimed.started_at;
        reconciledResultAtRef.current = claimed.reconciled_result_at;
        hydrateZenSession(quiz.id, quiz.questions, claimed);
        resetTimer(claimed.elapsed_seconds);
        readyRef.current = true;
        dirtyRef.current = false;
        if (mountedRef.current) {
          setDraftOwnerId(writerIdRef.current);
          setDecision(null);
          setSaveStatus("saved");
          setSaveMessage("Saved on this device.");
        }
        startTimer();
      } catch (error) {
        reportFailure(error);
      }
    },
    [
      decision,
      hydrateZenSession,
      quiz.id,
      quiz.questions,
      reportFailure,
      resetTimer,
      startTimer,
    ],
  );

  const startOver = React.useCallback(async (): Promise<void> => {
    if (!decision || !userId) return;
    try {
      await discardZenDraft(
        userId,
        quiz.id,
        Number.isSafeInteger(decision.assessment.draft.revision)
          ? decision.assessment.draft.revision
          : undefined,
      );
      await createFreshDraft();
    } catch (error) {
      reportFailure(error);
    }
  }, [createFreshDraft, decision, quiz.id, reportFailure, userId]);

  React.useEffect(() => {
    mountedRef.current = true;
    return (): void => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!enabled || !userId) {
      return;
    }
    let cancelled = false;
    const load = async (): Promise<void> => {
      setIsInitializing(true);
      pauseTimer();
      try {
        const quizHash = await resolveQuizHash(quiz);
        quizHashRef.current = quizHash;
        const currentQuiz = { ...quiz, quiz_hash: quizHash };
        const existing = await getZenDraft(userId, quiz.id);
        if (cancelled) return;
        if (!existing) {
          await createFreshDraft();
          return;
        }
        const assessment = await assessZenDraft(existing, currentQuiz, userId);
        if (cancelled || !assessment) return;
        setDecision({
          kind:
            assessment.compatibility === "resumable"
              ? "resume"
              : assessment.compatibility === "result-conflict"
                ? "result-conflict"
                : "incompatible",
          assessment,
        });
        setSaveStatus("saved");
        setSaveMessage("Saved on this device.");
      } catch (error) {
        reportFailure(error);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };
    void load();
    return (): void => {
      cancelled = true;
      void flushDraft(true);
      pauseTimer();
      resetSession();
    };
  }, [
    createFreshDraft,
    enabled,
    pauseTimer,
    quiz,
    reportFailure,
    resetSession,
    flushDraft,
    userId,
  ]);

  const autosaveKey = React.useMemo(
    () =>
      JSON.stringify({
        currentIndex,
        answers: serializeAnswers(answers),
        flags: Array.from(flaggedQuestions).sort(),
        hard: Array.from(hardQuestions).sort(),
        selectedAnswer: hasSubmitted ? selectedAnswer : null,
        hasSubmitted,
        showExplanation,
        timerCheckpoint: Math.floor(seconds / TIMER_CHECKPOINT_SECONDS),
      }),
    [
      answers,
      currentIndex,
      flaggedQuestions,
      hardQuestions,
      hasSubmitted,
      seconds,
      selectedAnswer,
      showExplanation,
    ],
  );

  React.useEffect(() => {
    if (!enabled || !readyRef.current || isComplete) return;
    dirtyRef.current = true;
    setSaveStatus("saving");
    const timeout = window.setTimeout(() => {
      void flushDraft();
    }, AUTOSAVE_DEBOUNCE_MS);
    return (): void => window.clearTimeout(timeout);
  }, [autosaveKey, enabled, flushDraft, isComplete]);

  React.useEffect(() => {
    if (!enabled) return;
    const flushOnHide = (): void => {
      if (document.visibilityState === "hidden") void flushDraft(true);
    };
    const flushOnPageHide = (): void => {
      void flushDraft(true);
    };
    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("pagehide", flushOnPageHide);
    return (): void => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("pagehide", flushOnPageHide);
    };
  }, [enabled, flushDraft]);

  return {
    isInitializing: enabled && Boolean(userId) ? isInitializing : false,
    decision,
    saveStatus,
    saveMessage,
    draftOwnerId,
    resume: () => activateDraft(false),
    startOver,
    resumeAsNewAttempt: () => activateDraft(true),
    flushDraft,
  };
}
