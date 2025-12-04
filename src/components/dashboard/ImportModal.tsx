"use client";

import * as React from "react";
import {
  Upload,
  FileJson,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { createQuiz } from "@/db/quizzes";
import {
  validateQuizImport,
  formatValidationErrors,
  type ValidationResult,
  type QuizImportInput,
} from "@/validators/quizSchema";
import type { Quiz } from "@/types/quiz";

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

  const { addToast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const tabListRef = React.useRef<HTMLDivElement>(null);

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
    [],
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

    setIsImporting(true);
    try {
      const quiz = await createQuiz(result.data, { userId });
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
          className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/50 dark:bg-red-950 dark:text-red-100"
          role="alert"
        >
          <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
          <div>
            <p className="font-semibold">Invalid JSON</p>
            <p className="mt-1 whitespace-pre-wrap text-red-700 dark:text-red-200">
              {parseError}
            </p>
          </div>
        </div>
      );
    }

    if (validationResult?.success && validationResult.data) {
      return (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-3 dark:border-green-500/40 dark:bg-green-950">
          <div className="mb-2 flex items-center gap-2 text-green-800 dark:text-green-100">
            <CheckCircle className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-semibold">Validation passed</span>
          </div>
          <ul className="space-y-1 text-sm text-green-900 dark:text-green-100">
            {validationStatuses.map((status) => (
              <li key={status.label} className="flex items-center gap-2">
                <CheckCircle
                  className="h-4 w-4 text-green-600 dark:text-green-300"
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
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3 dark:border-red-500/50 dark:bg-red-950"
          role="alert"
        >
          <div className="mb-2 flex items-center gap-2 text-red-800 dark:text-red-100">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-semibold">Validation errors</span>
          </div>
          <ul className="space-y-1 text-sm text-red-800 dark:text-red-100">
            {validationResult.errors.map((error) => (
              <li
                key={`${error.path.join(".")}-${error.message}`}
                className="flex items-start gap-2"
              >
                <XCircle
                  className="mt-0.5 h-4 w-4 text-red-600 dark:text-red-300"
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
        className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-3 dark:border-yellow-500/40 dark:bg-yellow-950"
        role="alert"
      >
        <div className="mb-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-100">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-semibold">Notices</span>
        </div>
        <ul className="space-y-1 text-sm text-yellow-900 dark:text-yellow-100">
          {warnings.map((warning, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 dark:bg-yellow-400" />
              {warning}
            </li>
          ))}
        </ul>
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
          className="flex border-b border-slate-200 dark:border-slate-800"
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
                  "px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
                  isActive
                    ? "border-b-2 border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-200"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100",
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
              "flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-center transition dark:border-slate-700 dark:bg-slate-800",
              isDragOver &&
                "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30",
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
                className="h-10 w-10 text-blue-600 dark:text-blue-300"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Drag and drop your JSON file
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                or click to browse .json files
              </p>
              {fileName ? (
                <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  Selected: {fileName}
                </p>
              ) : null}
            </div>
          </div>
        )}

        <div aria-live="polite">
          {isValidating ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Validating...
            </p>
          ) : null}
        </div>

        {renderValidationArea()}
        {renderWarnings()}
      </div>
    </Modal>
  );
}

export default ImportModal;
