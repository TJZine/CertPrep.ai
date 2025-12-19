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
import { DashboardShell } from "@/components/dashboard/DashboardShell";
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
  // User-scoped to prevent cross-account cache pollution
  React.useEffect(() => {
    if (!quizzesLoading && effectiveUserId) {
      try {
        localStorage.setItem(`dashboard_${effectiveUserId}_quiz_count`, String(quizzes.length));
      } catch {
        // localStorage may be unavailable in private browsing
      }
    }
  }, [quizzes.length, quizzesLoading, effectiveUserId]);

  // Persist SRS due state for skeleton sizing (CLS optimization)
  // User-scoped to prevent cross-account cache pollution
  React.useEffect(() => {
    if (dueCountsStatus === "ready" && effectiveUserId) {
      try {
        localStorage.setItem(`dashboard_${effectiveUserId}_has_srs_dues`, totalDue > 0 ? "1" : "0");
      } catch {
        // localStorage may be unavailable in private browsing
      }
    }
  }, [dueCountsStatus, totalDue, effectiveUserId]);

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
  // User-scoped cache prevents cross-account pollution
  const cachedQuizCount = React.useMemo((): number | null => {
    // If we already have quiz data loaded, use that
    if (!quizzesLoading) {
      return quizzes.length;
    }
    // Otherwise, read user-scoped cached count from localStorage
    if (typeof window !== "undefined" && effectiveUserId) {
      try {
        const cached = localStorage.getItem(`dashboard_${effectiveUserId}_quiz_count`);
        if (cached !== null) {
          const count = Number(cached);
          if (Number.isFinite(count) && count >= 0) {
            return count;
          }
        }
      } catch {
        // localStorage unavailable
      }
    }
    // No cache exists - return null, skeleton logic will determine variant
    return null;
  }, [quizzes.length, quizzesLoading, effectiveUserId]);

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
    // Use cached quiz count for skeleton, default to 6 for reasonable first-load
    const quizCardCount = cachedQuizCount ?? 6;

    return <DashboardSkeleton quizCardCount={quizCardCount} />;
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
    <>
      <DashboardShell
        headerSlot={
          <DashboardHeader
            onImportClick={() => setIsImportModalOpen(true)}
            quizCount={quizzes.length}
          />
        }
        statsSlot={
          quizzes.length > 0 && overallStats ? (
            <StatsBar
              totalQuizzes={overallStats.totalQuizzes}
              totalAttempts={overallStats.totalAttempts}
              averageScore={
                overallStats.totalAttempts > 0 ? overallStats.averageScore : null
              }
              totalStudyTime={overallStats.totalStudyTime}
            />
          ) : (
            <div className="grid min-h-[100px] grid-cols-2 gap-4 lg:grid-cols-4">
              {/* Empty stats placeholder to maintain layout */}
            </div>
          )
        }
        srsSlot={
          <DueQuestionsCard
            dueCountsByBox={dueCountsByBox}
            totalDue={totalDue}
            className="mx-auto max-w-md"
          />
        }
        contentSlot={
          <QuizGrid
            quizzes={quizzes}
            quizStats={quizStats}
            onStartQuiz={handleStartQuiz}
            onDeleteQuiz={handleDeleteClick}
          />
        }
      />

      {/* Modals - rendered as siblings, use portals internally */}
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
    </>
  );
}

