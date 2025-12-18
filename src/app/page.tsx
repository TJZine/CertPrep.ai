"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useQuizzes, useInitializeDatabase } from "@/hooks/useDatabase";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { deleteQuiz } from "@/db/quizzes";
import { getDueCountsByBox } from "@/db/srs";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { QuizGrid } from "@/components/dashboard/QuizGrid";
import { DueQuestionsCard } from "@/components/srs/DueQuestionsCard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useToast } from "@/components/ui/Toast";
import { prefetchOnIdle } from "@/lib/prefetch";
import type { Quiz } from "@/types/quiz";
import type { LeitnerBox } from "@/types/srs";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

// Code-split modals - loaded on demand, not in initial bundle
const ImportModal = dynamic(
  () => import("@/components/dashboard/ImportModal").then((mod) => ({ default: mod.ImportModal })),
  { ssr: false }
);
const ModeSelectModal = dynamic(
  () => import("@/components/dashboard/ModeSelectModal").then((mod) => ({ default: mod.ModeSelectModal })),
  { ssr: false }
);
const DeleteConfirmModal = dynamic(
  () => import("@/components/dashboard/DeleteConfirmModal").then((mod) => ({ default: mod.DeleteConfirmModal })),
  { ssr: false }
);

export default function DashboardPage(): React.ReactElement {
  const { user, isLoading: authLoading } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const { isInitialized, error: dbError } = useInitializeDatabase();
  const { quizzes, isLoading: quizzesLoading } = useQuizzes(
    effectiveUserId ?? undefined,
  );

  const {
    quizStats,
    overallStats,
    isLoading: statsLoading
  } = useDashboardStats(effectiveUserId ?? undefined);

  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [modeSelectQuiz, setModeSelectQuiz] = React.useState<Quiz | null>(null);
  const [deleteContext, setDeleteContext] = React.useState<{
    quiz: Quiz;
    attemptCount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // SRS due questions state
  const [dueCountsByBox, setDueCountsByBox] = React.useState<Record<LeitnerBox, number>>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  });
  const [dueCountsStatus, setDueCountsStatus] = React.useState<"idle" | "loading" | "ready">("idle");
  const totalDue = Object.values(dueCountsByBox).reduce((sum, count) => sum + count, 0);
  const shouldLoadDueCounts = Boolean(effectiveUserId) && isInitialized;
  const isDueCountsLoading = shouldLoadDueCounts && dueCountsStatus !== "ready";

  // Fetch SRS due counts
  React.useEffect(() => {
    if (!effectiveUserId || !isInitialized) return;

    const loadDueCounts = async (): Promise<void> => {
      setDueCountsStatus("loading");
      try {
        const counts = await getDueCountsByBox(effectiveUserId);
        setDueCountsByBox(counts);
      } catch (err) {
        console.warn("Failed to load SRS due counts:", err);
      } finally {
        setDueCountsStatus("ready");
      }
    };

    void loadDueCounts();
  }, [effectiveUserId, isInitialized]);

  // Persist quiz count for skeleton size caching (CLS optimization)
  // This allows the skeleton to match the user's actual library size on subsequent visits
  // We persist 0 for empty state so returning users with no quizzes see "empty" variant
  React.useEffect(() => {
    if (!quizzesLoading) {
      try {
        localStorage.setItem("dashboard_quiz_count", String(quizzes.length));
      } catch {
        // localStorage may be unavailable in private browsing
      }
    }
  }, [quizzes.length, quizzesLoading]);

  // Persist SRS due state for skeleton sizing (CLS optimization)
  // Allows skeleton to show correct placeholder size based on last visit
  React.useEffect(() => {
    if (dueCountsStatus === "ready") {
      try {
        localStorage.setItem("dashboard_has_srs_dues", totalDue > 0 ? "1" : "0");
      } catch {
        // localStorage may be unavailable in private browsing
      }
    }
  }, [dueCountsStatus, totalDue]);

  // Prefetch modal chunks during idle time for faster first-open and offline reliability
  React.useEffect(() => {
    prefetchOnIdle([
      { key: 'ImportModal', load: (): Promise<typeof import('@/components/dashboard/ImportModal')> => import('@/components/dashboard/ImportModal') },
      { key: 'ModeSelectModal', load: (): Promise<typeof import('@/components/dashboard/ModeSelectModal')> => import('@/components/dashboard/ModeSelectModal') },
      { key: 'DeleteConfirmModal', load: (): Promise<typeof import('@/components/dashboard/DeleteConfirmModal')> => import('@/components/dashboard/DeleteConfirmModal') },
    ]);
  }, []);

  const { addToast } = useToast();

  const handleImportSuccess = (quiz: Quiz): void => {
    setIsImportModalOpen(false);
    addToast("success", `Successfully imported "${quiz.title}"`);
  };

  const handleStartQuiz = (quiz: Quiz): void => {
    setModeSelectQuiz(quiz);
  };

  const handleDeleteClick = (quiz: Quiz): void => {
    const attempts = quizStats.get(quiz.id)?.attemptCount ?? 0;
    setDeleteContext({ quiz, attemptCount: attempts });
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteContext) return;
    if (!effectiveUserId) {
      addToast("error", "Unable to delete quiz: missing user context.");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteQuiz(deleteContext.quiz.id, effectiveUserId);
      addToast("success", `Deleted "${deleteContext.quiz.title}"`);
      setDeleteContext(null);
    } catch (error) {
      console.error("Failed to delete quiz", error);
      addToast("error", "Failed to delete quiz. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Use cached quiz count for skeleton sizing (CLS optimization)
  // Returns null if cached value is 0 (empty state) or no cache exists
  // This drives both skeleton variant and card count
  const cachedQuizCount = React.useMemo((): number | null => {
    // If we already have quiz data loaded, use that
    if (!quizzesLoading) {
      return quizzes.length;
    }
    // Otherwise, read cached count from localStorage
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("dashboard_quiz_count");
        if (cached !== null) {
          const count = Number(cached);
          if (Number.isFinite(count) && count >= 0 && count <= 20) {
            return count;
          }
        }
      } catch {
        // localStorage unavailable
      }
    }
    // No cache: first-time visitor, show empty variant (not 6 cards)
    // They'll see empty skeleton → likely empty dashboard (common for new users)
    return null;
  }, [quizzes.length, quizzesLoading]);

  // Loading: auth/user context and DB/data fetches.
  // Keep a single skeleton visible until all dynamic sections (including SRS due counts) are ready.
  if (
    authLoading ||
    effectiveUserId === null ||
    !isInitialized ||
    quizzesLoading ||
    statsLoading ||
    isDueCountsLoading
  ) {
    // Determine skeleton variant based on cached/loaded quiz count
    // null (no cache) or 0 = empty variant; >0 = populated variant
    const variant =
      cachedQuizCount === null || cachedQuizCount === 0
        ? "empty"
        : "populated";

    // Determine SRS placeholder variant based on cached/loaded state
    // - 'full': User had dues last visit → reserve full card height
    // - 'compact': User had no dues (or first visit) → reserve compact height
    // - false: Empty dashboard variant doesn't show SRS card
    let duePlaceholder: "compact" | "full" | false = "compact";
    if (variant === "empty") {
      duePlaceholder = false;
    } else if (dueCountsStatus === "ready") {
      duePlaceholder = totalDue > 0 ? "full" : "compact";
    } else if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("dashboard_has_srs_dues");
        duePlaceholder = cached === "1" ? "full" : "compact";
      } catch {
        // localStorage unavailable, default to compact
      }
    }

    return (
      <DashboardSkeleton
        variant={variant}
        quizCardCount={cachedQuizCount ?? undefined}
        duePlaceholder={duePlaceholder}
      />
    );
  }

  if (dbError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to initialize database
          </h2>
          <p className="mt-2 text-destructive">{dbError.message}</p>
          <p className="mt-4 text-sm text-destructive">
            Please ensure your browser supports IndexedDB and try refreshing the
            page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DashboardHeader
        onImportClick={() => setIsImportModalOpen(true)}
        quizCount={quizzes.length}
      />

      {quizzes.length > 0 && overallStats ? (
        <div className="mt-8">
          <StatsBar
            totalQuizzes={overallStats.totalQuizzes}
            totalAttempts={overallStats.totalAttempts}
            averageScore={
              overallStats.totalAttempts > 0 ? overallStats.averageScore : null
            }
            totalStudyTime={overallStats.totalStudyTime}
          />
        </div>
      ) : null}

      {/* SRS Due Questions Card - only show when there are due questions */}
      {totalDue > 0 && (
        <div className="mt-8">
          <DueQuestionsCard
            dueCountsByBox={dueCountsByBox}
            totalDue={totalDue}
            className="mx-auto max-w-md"
          />
        </div>
      )}

      <div className="mt-8">
        <QuizGrid
          quizzes={quizzes}
          quizStats={quizStats}
          onStartQuiz={handleStartQuiz}
          onDeleteQuiz={handleDeleteClick}
        />
      </div>

      {/* Modals - conditionally rendered to avoid loading chunk until needed */}
      {isImportModalOpen && (
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={handleImportSuccess}
          userId={effectiveUserId}
        />
      )}

      {modeSelectQuiz !== null && (
        <ModeSelectModal
          quiz={modeSelectQuiz}
          isOpen={modeSelectQuiz !== null}
          onClose={() => setModeSelectQuiz(null)}
        />
      )}

      {deleteContext !== null && (
        <DeleteConfirmModal
          quiz={deleteContext.quiz}
          attemptCount={deleteContext.attemptCount}
          isOpen
          onClose={() => setDeleteContext(null)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </main>
  );
}
