"use client";

import * as React from "react";
import { Download, FolderOpen } from "lucide-react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { QuizCardSkeleton } from "@/components/dashboard/QuizCardSkeleton";
import { createQuiz } from "@/db/quizzes";
import {
  formatValidationErrors,
  validateQuizImport,
  type QuizImportInput,
} from "@/validators/quizSchema";
import type { Quiz } from "@/types/quiz";

interface TestManifestEntry {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  path: string;
}

interface TestManifest {
  tests: TestManifestEntry[];
}

interface TestLibraryProps {
  existingQuizzes: Quiz[];
  userId: string;
  onImportSuccess: (quiz: Quiz) => void;
}

/**
 * Renders the built-in test library with one-click imports.
 */
export function TestLibrary({
  existingQuizzes,
  onImportSuccess,
  userId,
}: TestLibraryProps): React.ReactElement {
  const [manifest, setManifest] = React.useState<TestManifestEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [importingId, setImportingId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    const loadManifest = async (): Promise<void> => {
      try {
        const response = await fetch("/tests/index.json", {
          cache: "no-cache",
        });
        if (!response.ok) {
          throw new Error("Unable to load test library.");
        }
        const data = (await response.json()) as TestManifest;
        if (isMounted) {
          setManifest(data.tests ?? []);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to load test manifest", err);
        if (isMounted) {
          setError("Failed to load the test library. Please try again later.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadManifest();
    return (): void => {
      isMounted = false;
    };
  }, []);

  const importedSourceIds = React.useMemo(() => {
    const ids = new Set<string>();
    existingQuizzes.forEach((quiz) => {
      if (quiz.sourceId) {
        ids.add(quiz.sourceId);
      }
    });
    return ids;
  }, [existingQuizzes]);

  const isImported = React.useCallback(
    (entry: TestManifestEntry): boolean => importedSourceIds.has(entry.id),
    [importedSourceIds],
  );

  const categories = React.useMemo(() => {
    const unique = new Set<string>();
    manifest.forEach((entry) => {
      if (entry.category) {
        unique.add(entry.category);
      }
    });
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [manifest]);

  // Handle URL and LocalStorage persistence
  React.useEffect(() => {
    if (isLoading || manifest.length === 0) return;

    const urlCategory = searchParams.get("category");
    const storedCategory =
      typeof window !== "undefined"
        ? localStorage.getItem("library-category-filter")
        : null;

    let target = "all";

    // 1. URL param takes precedence
    if (urlCategory && categories.includes(urlCategory)) {
      target = urlCategory;
    }
    // 2. LocalStorage fallback
    else if (storedCategory && categories.includes(storedCategory)) {
      target = storedCategory;
    }
    // 3. Default to first real category if available (instead of "all")
    else if (categories.length > 1) {
      target = categories[1] ?? "all";
    }

    setCategoryFilter(target);
  }, [isLoading, manifest, categories, searchParams]);

  const handleCategoryChange = (category: string): void => {
    setCategoryFilter(category);
    localStorage.setItem("library-category-filter", category);

    const params = new URLSearchParams(searchParams);
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const handleTabKeyDown = (
    e: React.KeyboardEvent,
    currentIndex: number,
  ): void => {
    const lastIndex = categories.length - 1;
    let nextIndex: number | null = null;

    switch (e.key) {
      case "ArrowRight":
        nextIndex = currentIndex < lastIndex ? currentIndex + 1 : 0;
        break;
      case "ArrowLeft":
        nextIndex = currentIndex > 0 ? currentIndex - 1 : lastIndex;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    e.preventDefault();
    const nextCategory = categories[nextIndex];
    if (nextCategory) {
      handleCategoryChange(nextCategory);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  const filteredManifest = React.useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return manifest.filter((entry) => {
      const matchesCategory =
        categoryFilter === "all" || entry.category === categoryFilter;
      const haystack =
        `${entry.title} ${entry.description} ${entry.category} ${entry.subcategory ?? ""}`.toLowerCase();
      const matchesSearch = search.length === 0 || haystack.includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, manifest, searchTerm]);

  const handleImport = async (entry: TestManifestEntry): Promise<void> => {
    if (isImported(entry)) {
      addToast("info", `"${entry.title}" is already in your library.`);
      return;
    }

    setImportingId(entry.id);
    try {
      const response = await fetch(encodeURI(entry.path));
      if (!response.ok) {
        throw new Error("Unable to download test file.");
      }

      const payload = (await response.json()) as QuizImportInput;
      const validation = validateQuizImport(payload);
      if (!validation.success || !validation.data) {
        const message =
          formatValidationErrors(validation.errors ?? []) ||
          "Test file is invalid.";
        throw new Error(message);
      }

      const quiz = await createQuiz(validation.data, {
        sourceId: entry.id,
        userId,
        category: entry.category,
        subcategory: entry.subcategory,
      });
      addToast("success", `"${quiz.title}" imported successfully.`);
      onImportSuccess(quiz);
    } catch (err) {
      console.error("Import failed", err);
      addToast(
        "error",
        err instanceof Error ? err.message : "Failed to import test.",
      );
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" aria-hidden="true" />
          Built-in Test Library
        </CardTitle>
        <CardDescription>
          Quickly add curated practice tests to your library. Content stays
          local to your device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : manifest.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No built-in tests are available yet.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title, description, or category"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:max-w-sm"
                aria-label="Search built-in tests"
              />
              <div className="flex items-center gap-2">
                <div
                  role="tablist"
                  className="flex gap-2 overflow-x-auto pb-1"
                  aria-label="Filter by category"
                >
                  {categories.map((category, index) => (
                    <button
                      key={category}
                      ref={(el) => {
                        tabRefs.current[index] = el;
                      }}
                      role="tab"
                      aria-selected={categoryFilter === category}
                      tabIndex={categoryFilter === category ? 0 : -1}
                      onClick={() => handleCategoryChange(category)}
                      onKeyDown={(e) => handleTabKeyDown(e, index)}
                      className={cn(
                        "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        categoryFilter === category
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {category === "all" ? "All" : category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredManifest.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tests match your filters.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredManifest.map((entry) => {
                  const imported = isImported(entry);
                  return (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-foreground">
                              {entry.title}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {entry.description}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="shrink-0"
                          >
                            {entry.category}
                          </Badge>
                        </div>
                        {entry.subcategory ? (
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {entry.subcategory}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs text-muted-foreground"
                          aria-label={
                            imported ? "Already imported" : "Ready to import"
                          }
                        >
                          {imported
                            ? "Already in your library"
                            : "Not imported yet"}
                        </span>
                        <Button
                          variant={imported ? "outline" : "default"}
                          size="sm"
                          onClick={() => void handleImport(entry)}
                          disabled={imported || importingId === entry.id}
                          leftIcon={
                            <Download className="h-4 w-4" aria-hidden="true" />
                          }
                        >
                          {imported
                            ? "Imported"
                            : importingId === entry.id
                              ? "Importing..."
                              : "Import"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TestLibrary;
