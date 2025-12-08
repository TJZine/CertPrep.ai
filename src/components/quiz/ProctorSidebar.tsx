"use client";
import * as React from "react";
import { Timer } from "./Timer";
import { ProgressBar } from "./ProgressBar";
import type { Quiz } from "@/types/quiz";

export interface ProctorSidebarProps {
  quiz: Quiz;
  currentIndex: number;
  secondsRemaining: number;
}

/**
 * Sidebar summary placeholder for proctor mode.
 */
export function ProctorSidebar({
  quiz,
  currentIndex,
  secondsRemaining,
}: ProctorSidebarProps): React.ReactElement {
  return (
    <aside className="flex w-full flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm lg:w-72">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">
          Time Remaining
        </div>
        <Timer secondsRemaining={secondsRemaining} />
      </div>
      <ProgressBar current={currentIndex + 1} total={quiz.questions.length} />
      <div className="text-sm text-muted-foreground">
        {quiz.title}
      </div>
    </aside>
  );
}

export default ProctorSidebar;
