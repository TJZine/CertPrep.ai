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

class ActiveZenDraftRuntime {
  readonly quiz: Quiz;
  readonly writerId: string;
  private revision: number | null = null;
  private startedAt: number | null = null;
  private reconciledResultAt: number | undefined;
  private quizHash: string | null = null;
  private ready = false;
  private dirty = false;
  private saveChain: Promise<boolean> = Promise.resolve(true);

  constructor(quiz: Quiz) {
    this.quiz = quiz;
    this.writerId = generateUUID();
  }

  setQuizHash(quizHash: string): void {
    this.quizHash = quizHash;
  }

  getQuizHash(): string | null {
    return this.quizHash;
  }

  beginFreshDraft(startedAt: number): void {
    this.startedAt = startedAt;
    this.reconciledResultAt = undefined;
    this.revision = 1;
  }

  adoptClaimedDraft(draft: ZenQuizDraft): void {
    this.revision = draft.revision;
    this.startedAt = draft.started_at;
    this.reconciledResultAt = draft.reconciled_result_at;
  }

  getRevision(): number | null {
    return this.revision;
  }

  setRevision(revision: number): void {
    this.revision = revision;
  }

  getStartedAt(): number | null {
    return this.startedAt;
  }

  getReconciledResultAt(): number | undefined {
    return this.reconciledResultAt;
  }

  isReady(): boolean {
    return this.ready;
  }

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  setDirty(dirty: boolean): void {
    this.dirty = dirty;
  }

  enqueueSave(save: () => Promise<boolean>): Promise<boolean> {
    this.saveChain = this.saveChain.then(save);
    return this.saveChain;
  }
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

  // The live quiz record can receive metadata-only updates while a session is
  // mounted. Read the latest value only when a new identity lifecycle begins,
  // then freeze that seed until the lifecycle ends.
  const readLatestQuiz = React.useEffectEvent(() => quiz);
  const activeRuntimeRef = React.useRef<ActiveZenDraftRuntime | null>(null);
  const mountedRef = React.useRef(true);
  const secondsRef = React.useRef(seconds);

  React.useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  const reportFailure = React.useCallback(
    (error: unknown, runtime: ActiveZenDraftRuntime): void => {
      if (error instanceof ZenDraftConflictError) {
        runtime.setReady(false);
      }
      if (!mountedRef.current || activeRuntimeRef.current !== runtime) {
        return;
      }
      if (error instanceof ZenDraftConflictError) {
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
    },
    [],
  );

  const buildDraft = React.useCallback(
    (runtime: ActiveZenDraftRuntime): ZenQuizDraft | null => {
      const quizHash = runtime.getQuizHash();
      const revision = runtime.getRevision();
      const startedAt = runtime.getStartedAt();
      if (
        !enabled ||
        !userId ||
        !quizHash ||
        revision === null ||
        startedAt === null
      ) {
        return null;
      }
      const state = useQuizSessionStore.getState();
      return {
        schema_version: ZEN_DRAFT_SCHEMA_VERSION,
        user_id: userId,
        quiz_id: runtime.quiz.id,
        mode: "zen",
        quiz_version: runtime.quiz.version,
        quiz_hash: quizHash,
        question_ids: [...state.questionQueue],
        current_index: state.currentIndex,
        answers: serializeAnswers(state.answers),
        flagged_question_ids: Array.from(state.flaggedQuestions),
        hard_question_ids: Array.from(state.hardQuestions),
        selected_answer: state.hasSubmitted ? state.selectedAnswer : null,
        has_submitted: state.hasSubmitted,
        show_explanation: state.showExplanation,
        elapsed_seconds: Math.max(0, Math.floor(secondsRef.current)),
        started_at: startedAt,
        updated_at: Date.now(),
        reconciled_result_at: runtime.getReconciledResultAt(),
        writer_id: runtime.writerId,
        revision,
      };
    },
    [enabled, userId],
  );

  const flushDraft = React.useCallback(
    async (force = false): Promise<boolean> => {
      if (!enabled) return true;
      const runtime = activeRuntimeRef.current;
      if (!runtime?.isReady()) return false;
      if (force) runtime.setDirty(true);
      if (!runtime.isDirty()) return true;
      // Capture the Zustand state synchronously. Route cleanup resets the
      // shared store immediately after requesting this flush, so reading the
      // store later from the queued promise could otherwise persist an empty
      // session over the user's latest progress.
      const snapshot = buildDraft(runtime);
      if (!snapshot) return false;
      runtime.setDirty(false);
      return runtime.enqueueSave(async () => {
        const currentRevision = runtime.getRevision();
        if (!runtime.isReady() || currentRevision === null) return false;
        const expectedRevision = currentRevision;
        const draft = { ...snapshot, revision: expectedRevision };
        if (mountedRef.current && activeRuntimeRef.current === runtime) {
          setSaveStatus("saving");
          setSaveMessage(null);
        }
        try {
          const saved = await saveZenDraft(draft, expectedRevision);
          runtime.setRevision(saved.revision);
          if (mountedRef.current && activeRuntimeRef.current === runtime) {
            setSaveStatus("saved");
            setSaveMessage("Saved on this device.");
          }
          return true;
        } catch (error) {
          runtime.setDirty(true);
          reportFailure(error, runtime);
          return false;
        }
      });
    },
    [buildDraft, enabled, reportFailure],
  );

  const createFreshDraft = React.useCallback(
    async (runtime = activeRuntimeRef.current): Promise<void> => {
      const quizHash = runtime?.getQuizHash();
      if (!userId || !runtime || !quizHash) return;
      pauseTimer();
      resetTimer(0);
      const now = Date.now();
      runtime.beginFreshDraft(now);
      const draft: ZenQuizDraft = {
        schema_version: ZEN_DRAFT_SCHEMA_VERSION,
        user_id: userId,
        quiz_id: runtime.quiz.id,
        mode: "zen",
        quiz_version: runtime.quiz.version,
        quiz_hash: quizHash,
        question_ids: runtime.quiz.questions.map((question) => question.id),
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
        writer_id: runtime.writerId,
        revision: 1,
      };
      try {
        await createZenDraft(draft);
        if (activeRuntimeRef.current !== runtime) return;
        initializeSession(runtime.quiz.id, "zen", runtime.quiz.questions);
        runtime.setReady(true);
        runtime.setDirty(false);
        if (mountedRef.current) {
          setDraftOwnerId(runtime.writerId);
          setSaveStatus("saved");
          setSaveMessage("Saved on this device.");
          setDecision(null);
        }
        startTimer();
      } catch (error) {
        reportFailure(error, runtime);
        throw error;
      }
    },
    [
      initializeSession,
      pauseTimer,
      reportFailure,
      resetTimer,
      startTimer,
      userId,
    ],
  );

  const activateDraft = React.useCallback(
    async (acknowledgeResult = false): Promise<void> => {
      const runtime = activeRuntimeRef.current;
      if (!decision || !runtime) return;
      try {
        const claimed = await claimZenDraft(
          decision.assessment.draft,
          runtime.writerId,
          acknowledgeResult ? decision.assessment.latest_result_at : undefined,
        );
        if (activeRuntimeRef.current !== runtime) return;
        runtime.adoptClaimedDraft(claimed);
        hydrateZenSession(runtime.quiz.id, runtime.quiz.questions, claimed);
        resetTimer(claimed.elapsed_seconds);
        runtime.setReady(true);
        runtime.setDirty(false);
        if (mountedRef.current) {
          setDraftOwnerId(runtime.writerId);
          setDecision(null);
          setSaveStatus("saved");
          setSaveMessage("Saved on this device.");
        }
        startTimer();
      } catch (error) {
        reportFailure(error, runtime);
      }
    },
    [decision, hydrateZenSession, reportFailure, resetTimer, startTimer],
  );

  const startOver = React.useCallback(async (): Promise<void> => {
    const runtime = activeRuntimeRef.current;
    if (!decision || !userId || !runtime) return;
    try {
      await discardZenDraft(
        userId,
        runtime.quiz.id,
        Number.isSafeInteger(decision.assessment.draft.revision)
          ? decision.assessment.draft.revision
          : undefined,
      );
      if (activeRuntimeRef.current !== runtime) return;
      await createFreshDraft(runtime);
    } catch (error) {
      reportFailure(error, runtime);
    }
  }, [createFreshDraft, decision, reportFailure, userId]);

  React.useEffect(() => {
    mountedRef.current = true;
    return (): void => {
      mountedRef.current = false;
    };
  }, []);

  React.useEffect(() => {
    if (!enabled || !userId) {
      activeRuntimeRef.current = null;
      return;
    }
    const sessionQuiz = readLatestQuiz();
    const runtime = new ActiveZenDraftRuntime(sessionQuiz);
    activeRuntimeRef.current = runtime;
    let cancelled = false;
    const load = async (): Promise<void> => {
      setDecision(null);
      setDraftOwnerId(null);
      setSaveStatus("idle");
      setSaveMessage(null);
      setIsInitializing(true);
      pauseTimer();
      try {
        const quizHash = await resolveQuizHash(sessionQuiz);
        runtime.setQuizHash(quizHash);
        const currentQuiz = { ...sessionQuiz, quiz_hash: quizHash };
        const existing = await getZenDraft(userId, sessionQuiz.id);
        if (cancelled) return;
        if (!existing) {
          await createFreshDraft(runtime);
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
        reportFailure(error, runtime);
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
    quiz.id,
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
    const runtime = activeRuntimeRef.current;
    if (!enabled || !runtime?.isReady() || isComplete) return;
    runtime.setDirty(true);
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
