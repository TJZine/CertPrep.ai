"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface DashboardHeaderProps {
  onImportClick: () => void;
  quizCount: number;
}

/**
 * Dashboard heading with import action.
 */
export function DashboardHeader({
  onImportClick,
  quizCount,
}: DashboardHeaderProps): React.ReactElement {
  const subtitle =
    quizCount === 0
      ? "Import your first quiz to get started"
      : `Manage and study your ${quizCount} certification exam${quizCount !== 1 ? "s" : ""}`;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
          Quiz Library
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-300">{subtitle}</p>
      </div>
      <Button
        onClick={onImportClick}
        leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
      >
        Import Quiz
      </Button>
    </div>
  );
}

export default DashboardHeader;
