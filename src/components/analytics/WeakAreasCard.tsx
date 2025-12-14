"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, TrendingUp, TrendingDown, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { getTopicStudyQuestions, type TopicStudyData } from "@/db/results";
import {
  TOPIC_STUDY_QUESTIONS_KEY,
  TOPIC_STUDY_CATEGORY_KEY,
  TOPIC_STUDY_MISSED_COUNT_KEY,
  TOPIC_STUDY_FLAGGED_COUNT_KEY,
} from "@/lib/topicStudyStorage";
import { logger } from "@/lib/logger";
import { useQuizzes } from "@/hooks/useDatabase";

interface WeakArea {
  category: string;
  avgScore: number;
  totalQuestions: number;
  recentTrend?: "improving" | "declining" | "stable";
}

interface WeakAreasCardProps {
  weakAreas: WeakArea[];
  userId?: string;
  className?: string;
}

interface ModalState {
  isOpen: boolean;
  category: string;
  data: TopicStudyData | null;
  quizTitles: string[];
}

/**
 * Highlights weakest categories with quick study CTA.
 */
export function WeakAreasCard({
  weakAreas,
  userId,
  className,
}: WeakAreasCardProps): React.ReactElement {
  const router = useRouter();
  const { addToast } = useToast();
  const { quizzes } = useQuizzes(userId);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadingCategory, setLoadingCategory] = React.useState<string | null>(null);
  const [modalState, setModalState] = React.useState<ModalState>({
    isOpen: false,
    category: "",
    data: null,
    quizTitles: [],
  });

  const getScoreColor = (score: number): string => {
    if (score >= 70)
      return "text-success bg-success/10";
    if (score >= 50)
      return "text-warning bg-warning/10";
    return "text-destructive bg-destructive/10";
  };

  const getProgressColor = (score: number): string => {
    if (score >= 70) return "bg-success";
    if (score >= 50) return "bg-warning";
    return "bg-destructive";
  };

  const handleStudyTopic = async (category: string): Promise<void> => {
    if (!userId) {
      logger.warn("Cannot study topic: no userId provided");
      return;
    }

    setIsLoading(true);
    setLoadingCategory(category);

    try {
      const data = await getTopicStudyQuestions(userId, category);

      if (data.totalUniqueCount === 0) {
        // No questions found - user has likely reviewed since analytics were computed
        logger.info(`No missed/flagged questions found for category: ${category}`);
        addToast("info", `No active questions found to study for ${category}`);
        setIsLoading(false);
        setLoadingCategory(null);
        return;
      }

      // Build quiz titles from IDs
      const quizMap = new Map(quizzes.map((q) => [q.id, q.title]));
      const quizTitles = data.quizIds
        .map((id) => quizMap.get(id))
        .filter((title): title is string => !!title);

      setModalState({
        isOpen: true,
        category,
        data,
        quizTitles,
      });
    } catch (error) {
      logger.error("Failed to load topic study questions", error);
      addToast("error", "Failed to prepare study session");
    } finally {
      setIsLoading(false);
      setLoadingCategory(null);
    }
  };

  const handleStartStudying = (): void => {
    if (!modalState.data || modalState.data.quizIds.length === 0) return;

    try {
      // Store data in sessionStorage for the topic-review page to pick up
      sessionStorage.setItem(
        TOPIC_STUDY_QUESTIONS_KEY,
        JSON.stringify(modalState.data.questionIds),
      );
      sessionStorage.setItem(TOPIC_STUDY_CATEGORY_KEY, modalState.category);
      sessionStorage.setItem(
        TOPIC_STUDY_MISSED_COUNT_KEY,
        String(modalState.data.missedCount),
      );
      sessionStorage.setItem(
        TOPIC_STUDY_FLAGGED_COUNT_KEY,
        String(modalState.data.flaggedCount),
      );

      // Navigate to the dedicated topic-review page (aggregates multi-quiz questions)
      router.push("/quiz/topic-review");
    } catch (error) {
      logger.error("Failed to store topic study state", error);
      addToast("error", "Failed to start study session");
    }
  };

  const handleCloseModal = (): void => {
    setModalState({
      isOpen: false,
      category: "",
      data: null,
      quizTitles: [],
    });
  };

  if (weakAreas.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle
              className="h-5 w-5 text-success"
              aria-hidden="true"
            />
            Areas to Improve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-success/50 bg-success/10 p-4 text-center">
            <p className="font-medium text-success">
              🎉 Great job! No weak areas identified.
            </p>
            <p className="mt-1 text-sm text-success/80">
              Keep practicing to maintain your knowledge.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle
              className="h-5 w-5 text-warning"
              aria-hidden="true"
            />
            Areas to Improve
          </CardTitle>
          <CardDescription>
            Categories where you scored below average
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weakAreas.map((area) => (
              <div
                key={area.category}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">
                        {area.category}
                      </h3>
                      {area.recentTrend === "improving" && (
                        <Badge variant="success" className="gap-1">
                          <TrendingUp className="h-3 w-3" aria-hidden="true" />
                          Improving
                        </Badge>
                      )}
                      {area.recentTrend === "declining" && (
                        <Badge variant="danger" className="gap-1">
                          <TrendingDown className="h-3 w-3" aria-hidden="true" />
                          Declining
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {area.totalQuestions} questions attempted
                    </p>
                  </div>

                  <div
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-semibold",
                      getScoreColor(area.avgScore),
                    )}
                  >
                    {area.avgScore}%
                  </div>
                </div>

                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full transition-all",
                        getProgressColor(area.avgScore),
                      )}
                      style={{ width: `${Math.round(area.avgScore)}%` }}
                    />
                  </div>
                </div>

                {userId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => handleStudyTopic(area.category)}
                    disabled={isLoading}
                    aria-busy={loadingCategory === area.category ? true : undefined}
                    aria-disabled={isLoading && loadingCategory !== area.category ? true : undefined}
                    rightIcon={
                      loadingCategory === area.category ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      )
                    }
                  >
                    <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                    {loadingCategory === area.category ? "Loading..." : "Study This Topic"}
                  </Button>
                )}

              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-info/10 p-3">
            <p className="text-sm text-info">
              <strong>Tip:</strong> Focus on your weakest areas first. Targeted
              practice can significantly improve retention.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Topic Study Confirmation Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        title={`Study ${modalState.category}`}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleStartStudying}
              disabled={!modalState.data || modalState.data.quizIds.length === 0}
            >
              Start Studying
            </Button>
          </div>
        }
      >
        {modalState.data && (
          <div className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-destructive">•</span>
                <span>
                  <strong className="text-foreground">{modalState.data.missedCount}</strong>{" "}
                  {modalState.data.missedCount === 1 ? "question" : "questions"} answered incorrectly
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-warning">•</span>
                <span>
                  <strong className="text-foreground">{modalState.data.flaggedCount}</strong>{" "}
                  {modalState.data.flaggedCount === 1 ? "question" : "questions"} flagged for review
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong className="text-foreground">{modalState.data.totalUniqueCount}</strong>{" "}
                  unique {modalState.data.totalUniqueCount === 1 ? "question" : "questions"} total
                </span>
              </li>
            </ul>

            {modalState.quizTitles.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  From: {modalState.quizTitles.slice(0, 3).join(", ")}
                  {modalState.quizTitles.length > 3 && ` +${modalState.quizTitles.length - 3} more`}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

export default WeakAreasCard;
