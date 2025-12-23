"use client";

import * as React from "react";
import {
  Upload,
  FileJson,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { createQuiz, updateQuiz } from "@/db/quizzes";
import { db } from "@/db";
import {
  validateQuizImport,
  formatValidationErrors,
  type ValidationResult,
  type QuizImportInput,
} from "@/validators/quizSchema";
import type { Quiz } from "@/types/quiz";

// SECURITY: Prevent DoS via oversized file loading into browser memory
// 10 MB is generous for quiz JSON (a 10,000-question quiz is typically 2-5 MB)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (quiz: Quiz) => void;
  userId: string | null;
}

interface ValidationStatus {
  label: string;
  success: boolean;
}

const exampleJson = `{
  "title": "My Certification Quiz",
  "description": "Practice questions for...",
  "questions": [
    {
      "id": "1",
      "category": "Topic Name",
      "question": "What is...?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "correct_answer": "B",
      "explanation": "B is correct because..."
    }
  ],
  "tags": ["certification", "practice"]
}`;

/**
 * Handles quiz import via JSON paste or file upload with validation feedback.
 */
export function ImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  userId,
}: ImportModalProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = React.useState<"paste" | "upload">("paste");
  const [jsonText, setJsonText] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [validationResult, setValidationResult] =
    React.useState<ValidationResult<QuizImportInput> | null>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [isValidating, setIsValidating] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  // Duplicate detection state
  const [existingQuiz, setExistingQuiz] = React.useState<{ id: string; title: string; questionCount: number } | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = React.useState(false);
  // Category fields for analytics grouping (optional)
  const [category, setCategory] = React.useState("");
  const [subcategory, setSubcategory] = React.useState("");

  const { addToast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const tabListRef = React.useRef<HTMLDivElement>(null);

  // Refs to access current category/subcategory values without stale closures
  const categoryRef = React.useRef(category);
  const subcategoryRef = React.useRef(subcategory);

  // Keep refs in sync with state
  React.useEffect(() => {
    categoryRef.current = category;
    subcategoryRef.current = subcategory;

  }, [category, subcategory]);

  const importAsNewRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect((): (() => void) | void => {
    if (showDuplicateWarning) {
      // Small timeout to allow render
      const timer = setTimeout(() => {
        importAsNewRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [showDuplicateWarning]);

  const resetState = (): void => {
    setActiveTab("paste");
    setJsonText("");
    setFileName(null);
    setParseError(null);
    setValidationResult(null);
    setWarnings([]);
    setIsValidating(false);
    setIsImporting(false);
    setIsDragOver(false);
    setExistingQuiz(null);
    setShowDuplicateWarning(false);
    setCategory("");
    setSubcategory("");
  };

  const validateJson = React.useCallback(
    (
      text: string,
    ): { result: ValidationResult<QuizImportInput> | null; error: string | null } => {
      setIsValidating(true);
      try {
        const parsed = JSON.parse(text);
        setParseError(null);
        const result = validateQuizImport(parsed);
        setValidationResult(result);

        // Pre-populate category/subcategory from parsed JSON if available
        // Using refs to access current values without stale closures
        if (result.success && result.data) {
          if (result.data.category && !categoryRef.current) {
            setCategory(result.data.category);
          }
          if (result.data.subcategory && !subcategoryRef.current) {
            setSubcategory(result.data.subcategory);
          }
        }

        // Check for truncation warnings
        const newWarnings: string[] = [];
        if (result.success && result.data) {
          const originalTitle = parsed.title || "";
          const originalDesc = parsed.description || "";

          if (originalTitle.length > 100) {
            newWarnings.push("Title was truncated to 100 characters.");
          }
          if (originalDesc.length > 500) {
            newWarnings.push("Description was truncated to 500 characters.");
          }
        }
        setWarnings(newWarnings);

        return { result, error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid JSON";
        setParseError(message);
        setValidationResult(null);
        setWarnings([]);
        return { result: null, error: message };
      } finally {
        setIsValidating(false);
      }
    },
    [], // Empty deps is correct: uses refs for current category/subcategory values
  );

  React.useEffect((): (() => void) | void => {
    if (!jsonText.trim()) {
      setValidationResult(null);
      setParseError(null);
      setWarnings([]);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      validateJson(jsonText);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [jsonText, validateJson]);

  React.useEffect((): void => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  const handleFileSelect = (file: File): void => {
    // SECURITY: Prevent DoS via oversized file loading
    if (file.size > MAX_FILE_SIZE_BYTES) {
      addToast(
        "error",
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.`
      );
      return;
    }

    if (
      file.type !== "application/json" &&
      !file.name.toLowerCase().endsWith(".json")
    ) {
      addToast("error", "Please upload a JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (): void => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setActiveTab("upload");
      setFileName(file.name);
      setJsonText(text);
      validateJson(text);
    };
    reader.onerror = (): void =>
      addToast("error", "Failed to read file. Please try again.");
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Check if a quiz with the same title already exists.
   * Returns the existing quiz if found, null otherwise.
   */
  const checkForDuplicate = async (title: string): Promise<{ id: string; title: string; questionCount: number } | null> => {
    if (!userId) return null;

    const existing = await db.quizzes
      .where("user_id")
      .equals(userId)
      .filter((q) => q.title.toLowerCase() === title.toLowerCase() && !q.deleted_at)
      .first();

    if (existing) {
      return {
        id: existing.id,
        title: existing.title,
        questionCount: existing.questions.length,
      };
    }
    return null;
  };

  /**
   * Main import handler - checks for duplicates first.
   */
  const handleImport = async (): Promise<void> => {
    if (!userId) {
      addToast("error", "Unable to import without a user context.");
      return;
    }
    if (!jsonText.trim()) {
      addToast("error", "Please provide quiz JSON to import.");
      return;
    }

    const { result, error } = validateJson(jsonText);
    if (!result?.success || !result.data) {
      const errorMessage =
        parseError ||
        error ||
        formatValidationErrors(result?.errors ?? []) ||
        "Please fix validation issues.";
      addToast("error", errorMessage);
      return;
    }

    // Check for duplicate before importing
    const duplicate = await checkForDuplicate(result.data.title);
    if (duplicate) {
      setExistingQuiz(duplicate);
      setShowDuplicateWarning(true);
      return;
    }

    // No duplicate - proceed with import
    await doImport(result.data, false);
  };

  /**
   * Perform the actual import (create new or replace existing).
   */
  const doImport = async (data: QuizImportInput, replaceExistingId: string | false): Promise<void> => {
    if (!userId) {
      addToast("error", "You must be signed in to import.");
      return;
    }

    setIsImporting(true);
    try {
      let quiz;
      if (replaceExistingId) {
        // Replace existing quiz
        await updateQuiz(replaceExistingId, userId, {
          title: data.title,
          description: data.description,
          questions: data.questions,
          tags: data.tags ?? [],
          category: category.trim() || undefined,
          subcategory: subcategory.trim() || undefined,
        });
        quiz = await db.quizzes.get(replaceExistingId);
        if (!quiz) throw new Error("Quiz not found after update");
        addToast("success", `Replaced "${quiz.title}" with new version`);
      } else {
        // Create new quiz
        quiz = await createQuiz(data, {
          userId,
          category: category.trim() || undefined,
          subcategory: subcategory.trim() || undefined,
        });
      }
      onImportSuccess(quiz);
      resetState();
      onClose();
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "Failed to import quiz",
      );
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Handle "Import as New" - creates a duplicate with different ID.
   */
  const handleImportAsNew = async (): Promise<void> => {
    const { result } = validateJson(jsonText);
    if (!result?.success || !result.data) return;

    setShowDuplicateWarning(false);
    await doImport(result.data, false);
  };

  /**
   * Handle "Replace Existing" - updates the existing quiz.
   */
  const handleReplaceExisting = async (): Promise<void> => {
    const { result } = validateJson(jsonText);
    if (!result?.success || !result.data || !existingQuiz) return;

    setShowDuplicateWarning(false);
    await doImport(result.data, existingQuiz.id);
  };

  const handleTabKeyNavigation = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const tabs =
      tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (!tabs || tabs.length === 0) return;
    const tabIds = Array.from(tabs).map((tab) => tab.dataset.tabId ?? "");
    const currentIndex = tabIds.findIndex((id) => id === activeTab);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + tabIds.length) % tabIds.length;
    const nextTab = (tabIds[nextIndex] as "paste" | "upload") ?? "paste";
    setActiveTab(nextTab);
    tabs[nextIndex]?.focus();
  };

  const validationStatuses: ValidationStatus[] = React.useMemo(() => {
    if (parseError || !validationResult) {
      return [];
    }

    if (!validationResult.success || !validationResult.data) {
      return [];
    }

    const { data } = validationResult;
    return [
      { label: "Valid JSON structure", success: true },
      { label: `Title: "${data.title}"`, success: Boolean(data.title) },
      {
        label: `${data.questions.length} questions found`,
        success: data.questions.length > 0,
      },
      { label: "All questions validated", success: true },
    ];
  }, [parseError, validationResult]);

  const formattedErrors = React.useMemo(
    () =>
      validationResult?.errors
        ? formatValidationErrors(validationResult.errors)
        : "",
    [validationResult],
  );

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button
        onClick={handleImport}
        isLoading={isImporting}
        disabled={
          isValidating ||
          !userId ||
          !jsonText.trim() ||
          Boolean(parseError) ||
          !(validationResult?.success && validationResult.data)
        }
        leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
      >
        Import Quiz
      </Button>
    </div>
  );

  const renderValidationArea = (): React.ReactElement | null => {
    if (parseError) {
      return (
        <div
          className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-semibold">Invalid JSON</p>
            <p className="mt-1 whitespace-pre-wrap">
              {parseError}
            </p>
          </div>
        </div>
      );
    }

    if (validationResult?.success && validationResult.data) {
      return (
        <div className="mt-4 rounded-lg border border-success/50 bg-success/10 px-3 py-3">
          <div className="mb-2 flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-semibold">Validation passed</span>
          </div>
          <ul className="space-y-1 text-sm text-success">
            {validationStatuses.map((status) => (
              <li key={status.label} className="flex items-center gap-2">
                <CheckCircle
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                {status.label}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (
      validationResult &&
      validationResult.errors &&
      validationResult.errors.length > 0
    ) {
      return (
        <div
          className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-3"
          role="alert"
        >
          <div className="mb-2 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-semibold">Validation errors</span>
          </div>
          <ul className="space-y-1 text-sm text-destructive">
            {validationResult.errors.map((error) => (
              <li
                key={`${error.path.join(".")}-${error.message}`}
                className="flex items-start gap-2"
              >
                <XCircle
                  className="mt-0.5 h-4 w-4"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-semibold">
                    [{error.path.join(".") || "root"}]
                  </span>{" "}
                  {error.message}
                </span>
              </li>
            ))}
          </ul>
          {formattedErrors ? (
            <p className="sr-only" aria-live="polite">
              {formattedErrors}
            </p>
          ) : null}
        </div>
      );
    }

    return null;
  };

  const renderWarnings = (): React.ReactElement | null => {
    if (warnings.length === 0) return null;

    return (
      <div
        className="mt-4 rounded-lg border border-warning/50 bg-warning/10 px-3 py-3"
        role="alert"
      >
        <div className="mb-2 flex items-center gap-2 text-warning">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-semibold">Notices</span>
        </div>
        <ul className="space-y-1 text-sm text-warning">
          {warnings.map((warning, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              {warning}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  /**
   * Render duplicate quiz warning with action buttons.
   */
  const renderDuplicateWarning = (): React.ReactElement | null => {
    if (!showDuplicateWarning || !existingQuiz) return null;

    return (
      <div
        className="mt-4 rounded-lg border border-warning/50 bg-warning/10 px-4 py-4"
        role="alert"
      >
        <div className="mb-3 flex items-center gap-2 text-warning">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-semibold">Quiz Already Exists</span>
        </div>
        <p className="mb-4 text-sm text-foreground">
          A quiz titled &ldquo;{existingQuiz.title}&rdquo; already exists with{" "}
          {existingQuiz.questionCount} questions. What would you like to do?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            ref={importAsNewRef}
            size="sm"
            onClick={handleImportAsNew}
            isLoading={isImporting}
            disabled={isImporting}
          >
            Import as New
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReplaceExisting}
            isLoading={isImporting}
            disabled={isImporting}
          >
            Replace Existing
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowDuplicateWarning(false);
              setExistingQuiz(null);
            }}
            disabled={isImporting}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Quiz"
      description="Add a new quiz by pasting JSON or uploading a file"
      size="lg"
      footer={footer}
    >
      <div className="space-y-4">
        <div
          ref={tabListRef}
          className="flex border-b border-border"
          role="tablist"
          aria-label="Import method"
          onKeyDown={handleTabKeyNavigation}
        >
          {["paste", "upload"].map((tab) => {
            const isActive = activeTab === tab;
            const label = tab === "paste" ? "Paste JSON" : "Upload File";
            return (
              <button
                key={tab}
                role="tab"
                type="button"
                data-tab-id={tab}
                aria-selected={isActive}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setActiveTab(tab as "paste" | "upload")}
              >
                {label}
              </button>
            );
          })}
        </div>

        {activeTab === "paste" ? (
          <Textarea
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            className="font-mono"
            placeholder={exampleJson}
            rows={14}
            aria-label="Quiz JSON input"
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 text-center transition",
              isDragOver &&
              "border-primary bg-primary/5",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
            />
            <div className="flex flex-col items-center gap-2">
              <FileJson
                className="h-10 w-10 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-foreground">
                Drag and drop your JSON file
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse .json files
              </p>
              {fileName ? (
                <p className="mt-2 text-sm text-primary">
                  Selected: {fileName}
                </p>
              ) : null}
            </div>
          </div>
        )}

        <div aria-live="polite">
          {isValidating ? (
            <p className="text-sm text-muted-foreground">
              Validating...
            </p>
          ) : null}
        </div>

        {renderValidationArea()}

        {/* Category fields (shown after successful validation) */}
        {validationResult?.success && validationResult.data && (
          <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">
              Analytics Grouping (Optional)
            </p>
            <p id="analytics-description" className="text-xs text-muted-foreground">
              Set category and subcategory to group this quiz in the Topic Heatmap.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="import-category"
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                >
                  Category
                </label>
                <div className="relative">
                  <input
                    id="import-category"
                    type="text"
                    aria-describedby="analytics-description"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Insurance, Firearms, Custom"
                    maxLength={50}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {category && (
                    <button
                      type="button"
                      onClick={() => setCategory("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Clear category"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label
                  htmlFor="import-subcategory"
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                >
                  Subcategory
                </label>
                <div className="relative">
                  <input
                    id="import-subcategory"
                    type="text"
                    aria-describedby="analytics-description"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g., Massachusetts Personal Lines"
                    maxLength={100}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  {subcategory && (
                    <button
                      type="button"
                      onClick={() => setSubcategory("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Clear subcategory"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {renderWarnings()}
        {renderDuplicateWarning()}
      </div>
    </Modal>
  );
}

export default ImportModal;
