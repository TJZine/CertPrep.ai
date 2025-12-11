"use client";

import { motion } from "framer-motion";
import * as React from "react";
import {
  MoreVertical,
  Play,
  Trash2,
  Clock,
  Trophy,
  Target,
  Link as LinkIcon,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDate } from "@/lib/utils";
import type { Quiz } from "@/types/quiz";
import type { QuizStats } from "@/db/quizzes";

export interface QuizCardProps {
  quiz: Quiz;
  stats: QuizStats | null;
  onStart: (quiz: Quiz) => void;
  onDelete: (quiz: Quiz) => void;
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
): void {
  React.useEffect((): (() => void) | void => {
    if (!isOpen) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
    // ref is stable; excluding from deps avoids unnecessary reruns
  }, [isOpen, onClose]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Displays a quiz summary card with stats and quick actions.
 */
export function QuizCard({
  quiz,
  stats,
  onStart,
  onDelete,
}: QuizCardProps): React.ReactElement {
  const [showMenu, setShowMenu] = React.useState(false);
  const [showTagsPopover, setShowTagsPopover] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const tagsPopoverRef = React.useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  useClickOutside(menuRef, showMenu, () => setShowMenu(false));
  useClickOutside(tagsPopoverRef, showTagsPopover, () =>
    setShowTagsPopover(false),
  );

  const visibleTags = React.useMemo(() => quiz.tags.slice(0, 3), [quiz.tags]);
  const extraTagCount = Math.max(quiz.tags.length - 3, 0);
  const extraTags = React.useMemo(() => quiz.tags.slice(3), [quiz.tags]);

  const handleDelete = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    onDelete(quiz);
  };

  const handleCopyLink = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    if (typeof window === "undefined" || !navigator.clipboard) {
      addToast("error", "Clipboard is unavailable in this environment.");
      return;
    }
    try {
      const url = `${window.location.origin}/quiz/${quiz.id}/zen`;
      await navigator.clipboard.writeText(url);
      addToast("success", "Quiz link copied!");
    } catch (error) {
      console.error("Failed to copy link", error);
      addToast("error", "Unable to copy link. Please try again.");
    }
  };

  const lastScore = stats?.lastAttemptScore ?? null;
  const attemptCount = stats?.attemptCount ?? 0;
  const lastAttemptDate = stats?.lastAttemptDate ?? null;
  const bestScore = stats?.bestScore ?? null;
  const averageScore = stats?.averageScore ?? null;
  const totalStudyTime = stats?.totalStudyTime ?? 0;

  const formatStudyTime = (seconds: number): string => {
    if (seconds <= 0) return "0m";
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
    }
    return `${minutes}m`;
  };

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Card className="group relative flex h-full flex-col overflow-hidden border border-border shadow-sm transition-colors hover:shadow-md">
        <div
          className="pointer-events-none absolute right-4 top-4 hidden max-w-[220px] rounded-lg border border-border bg-popover/95 px-3 py-2 text-left text-xs text-muted-foreground shadow-lg backdrop-blur group-focus-within:block group-hover:block"
          role="presentation"
        >
          <p className="mb-1 font-semibold text-foreground">
            Quick stats
          </p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2">
              <BarChart3
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              <span>Best: {bestScore !== null ? `${bestScore}%` : "—"}</span>
            </li>
            <li className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
              <span>Avg: {averageScore !== null ? `${averageScore}%` : "—"}</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <span>Study time: {formatStudyTime(totalStudyTime)}</span>
            </li>
          </ul>
        </div>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="line-clamp-2 text-lg">{quiz.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {quiz.description?.trim()
                  ? quiz.description
                  : `${quiz.questions.length} questions`}
              </p>
            </div>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                className={cn(
                  "rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  showMenu &&
                  "bg-accent text-accent-foreground",
                )}
                aria-label="Quiz options"
                aria-expanded={showMenu}
                aria-haspopup="menu"
                onClick={() => setShowMenu((open) => !open)}
              >
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
              </button>
              {showMenu ? (
                <div
                  className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    role="menuitem"
                  >
                    <LinkIcon className="h-4 w-4" aria-hidden="true" />
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    role="menuitem"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {quiz.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {visibleTags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {extraTagCount > 0 ? (
                <div className="relative" ref={tagsPopoverRef}>
                  <button
                    type="button"
                    onClick={() => setShowTagsPopover((open) => !open)}
                    className="inline-flex items-center gap-1 rounded-full border border-input bg-background px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-expanded={showTagsPopover}
                    aria-haspopup="true"
                    aria-label={`Show ${extraTagCount} more tags`}
                  >
                    +{extraTagCount}
                  </button>
                  {showTagsPopover ? (
                    <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-border bg-popover p-2 text-left shadow-lg">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        More tags
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {extraTags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="flex-1 space-y-4 pt-0">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <StatItem
              icon={<Target className="h-4 w-4" aria-hidden="true" />}
              label="Questions"
              value={quiz.questions.length}
            />
            <StatItem
              icon={<Clock className="h-4 w-4" aria-hidden="true" />}
              label="Attempts"
              value={attemptCount}
            />
            <StatItem
              icon={<Trophy className="h-4 w-4" aria-hidden="true" />}
              label="Last Score"
              value={lastScore !== null ? `${lastScore}%` : "-"}
            />
          </div>

          {lastAttemptDate ? (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
              Last attempt: {formatDate(lastAttemptDate)}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="pt-0">
          <Button
            className="w-full"
            leftIcon={<Play className="h-4 w-4" aria-hidden="true" />}
            onClick={() => onStart(quiz)}
          >
            Start Quiz
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}

function StatItem({ icon, value, label }: StatItemProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border px-3 py-2 bg-background/50">
      <div className="flex items-center gap-1 text-base font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        <span>{value}</span>
      </div>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default QuizCard;
