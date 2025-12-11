"use client";

import * as React from "react";
import {
  Download,
  Upload,
  Trash2,
  HardDrive,
  AlertTriangle,
  FileJson,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  downloadDataAsFile,
  importData,
  validateImportData,
  clearAllData,
  getStorageStats,
  type ExportData,
} from "@/lib/dataExport";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export function DataManagement(): React.ReactElement {
  const { addToast } = useToast();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [stats, setStats] = React.useState<{
    quizCount: number;
    resultCount: number;
    estimatedSizeKB: number;
  } | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [isClearingLocal, setIsClearingLocal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importFile, setImportFile] = React.useState<ExportData | null>(null);
  const [importMode, setImportMode] = React.useState<"merge" | "replace">(
    "merge",
  );
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");

  React.useEffect((): void => {
    getStorageStats(effectiveUserId).then(setStats);
  }, [effectiveUserId]);

  const refreshStats = async (): Promise<void> => {
    const newStats = await getStorageStats(effectiveUserId);
    setStats(newStats);
  };

  const handleExport = async (): Promise<void> => {
    if (!effectiveUserId) {
      addToast("error", "Unable to export without a user context.");
      return;
    }
    setIsExporting(true);
    try {
      await downloadDataAsFile(effectiveUserId);
      addToast("success", "Data exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      addToast("error", "Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e): void => {
      try {
        const data = JSON.parse((e.target?.result as string) ?? "");
        if (!validateImportData(data)) {
          addToast("error", "Invalid backup file format.");
          return;
        }
        setImportFile(data);
        setShowImportModal(true);
      } catch (error) {
        console.error("Failed to read file:", error);
        addToast(
          "error",
          "Failed to read file. Please ensure it's a valid JSON file.",
        );
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleImportConfirm = async (): Promise<void> => {
    if (!importFile) return;
    if (!effectiveUserId) {
      addToast("error", "Unable to import without a user context.");
      return;
    }
    setIsImporting(true);
    try {
      const result = await importData(importFile, effectiveUserId, importMode);
      addToast(
        "success",
        `Imported ${result.quizzesImported} quizzes and ${result.resultsImported} results!`,
      );
      setShowImportModal(false);
      setImportFile(null);
      await refreshStats();
    } catch (error) {
      console.error("Import failed:", error);
      addToast("error", "Failed to import data. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async (): Promise<void> => {
    if (isResetting || isClearingLocal) return;
    setIsResetting(true);
    let serverError: string | null = null;
    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 401) {
        let bodyText = "";
        try {
          bodyText = await response.text();
          const parsed = bodyText ? JSON.parse(bodyText) : {};
          const message =
            (parsed as { error?: string }).error ||
            bodyText ||
            "Unknown server error";
          serverError = `Account deletion failed (${response.status}): ${message}`;
        } catch {
          serverError = `Account deletion failed (${response.status}): ${bodyText || "Unknown server error"}`;
        }
      }
    } catch (error) {
      serverError =
        error instanceof Error
          ? error.message
          : "Network error deleting account";
    }

    try {
      await clearAllData();
      await refreshStats();
      addToast(
        serverError ? "error" : "success",
        serverError
          ? `Local data cleared. ${serverError}`
          : "Account deleted and local data cleared.",
      );
      setShowResetModal(false);
      setDeleteConfirmation("");
      window.location.href = "/";
    } catch (error) {
      console.error("Local clear failed after account delete attempt:", error);
      addToast("error", "Failed to clear local data. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearLocalOnly = async (): Promise<void> => {
    if (isClearingLocal || isResetting) return;
    setIsClearingLocal(true);
    try {
      await clearAllData();
      await refreshStats();
      addToast("success", "Local data cleared.");
      setShowResetModal(false);
      setDeleteConfirmation("");
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to clear local data:", error);
      addToast("error", "Failed to clear local data. Please try again.");
    } finally {
      setIsClearingLocal(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export, import, or reset your quiz data. Data is stored locally in
            your browser (unencrypted). On shared devices, use the reset option
            to clear it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning">
            Local storage is not encrypted. Anyone with access to this browser
            profile could read quizzes and results. Clear data below if privacy
            is a concern on shared devices.
          </div>

          {stats ? (
            <div className="rounded-lg border border-border bg-muted p-4">
              <h4 className="mb-2 font-medium text-foreground">
                Storage Usage
              </h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.quizCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Quizzes
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.resultCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Results
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.estimatedSizeKB} KB
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Est. Size
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <h4 className="font-medium text-foreground">
                Export Data
              </h4>
              <p className="text-sm text-muted-foreground">
                Download all your quizzes and results as a JSON file
              </p>
            </div>
            <Button
              onClick={handleExport}
              isLoading={isExporting}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <h4 className="font-medium text-foreground">
                Import Data
              </h4>
              <p className="text-sm text-muted-foreground">
                Restore from a previously exported backup file
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Select backup file to import"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Import
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <div>
              <h4 className="font-medium text-destructive">
                Reset All Data
              </h4>
              <p className="text-sm text-destructive/80">
                Permanently delete all quizzes, results, and settings
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setShowResetModal(true)}
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
        }}
        title="Import Data"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImportConfirm} isLoading={isImporting}>
              Import
            </Button>
          </>
        }
      >
        {importFile ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted p-4">
              <div className="flex items-center gap-3">
                <FileJson className="h-8 w-8 text-info" />
                <div>
                  <p className="font-medium text-foreground">
                    Backup File
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {importFile.quizzes.length} quizzes,{" "}
                    {importFile.results.length} results
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Exported:{" "}
                    {new Date(importFile.exportedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Import Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === "merge"}
                    onChange={() => setImportMode("merge")}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    Merge (keep existing data, add new)
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-foreground">
                    Replace (delete existing data first)
                  </span>
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setDeleteConfirmation("");
        }}
        title="Reset Data"
        size="sm"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowResetModal(false);
                setDeleteConfirmation("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={handleClearLocalOnly}
              isLoading={isClearingLocal}
              disabled={deleteConfirmation.trim().toUpperCase() !== "DELETE"}
            >
              Clear Local Data Only
            </Button>
            <Button
              variant="danger"
              onClick={handleReset}
              isLoading={isResetting}
              disabled={deleteConfirmation.trim().toUpperCase() !== "DELETE"}
            >
              Delete Account + Local
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="w-full">
            <p className="text-muted-foreground">
              Choose whether to clear local data only or delete your account and
              clear local data:
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
              <li>
                <strong>Clear Local Data Only:</strong> deletes
                quizzes/results/settings stored on this browser.
              </li>
              <li>
                <strong>Delete Account + Local:</strong> attempts to remove your
                account from the server, then clears local data.
              </li>
            </ul>
            <p className="mt-4 font-medium text-destructive">
              This action cannot be undone!
            </p>

            <div className="mt-4">
              <label
                htmlFor="delete-confirm"
                className="block text-sm font-medium text-foreground"
              >
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive"
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default DataManagement;
