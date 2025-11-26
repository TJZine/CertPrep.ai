'use client';

import * as React from 'react';
import { Download, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { createQuiz } from '@/db/quizzes';
import { formatValidationErrors, validateQuizImport, type QuizImportInput } from '@/validators/quizSchema';
import type { Quiz } from '@/types/quiz';

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
  onImportSuccess: (quiz: Quiz) => void;
}

/**
 * Renders the built-in test library with one-click imports.
 */
export function TestLibrary({ existingQuizzes, onImportSuccess }: TestLibraryProps): React.ReactElement {
  const [manifest, setManifest] = React.useState<TestManifestEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [importingId, setImportingId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const { addToast } = useToast();

  React.useEffect(() => {
    let isMounted = true;
    const loadManifest = async (): Promise<void> => {
      try {
        const response = await fetch('/tests/index.json', { cache: 'no-cache' });
        if (!response.ok) {
          throw new Error('Unable to load test library.');
        }
        const data = (await response.json()) as TestManifest;
        if (isMounted) {
          setManifest(data.tests ?? []);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load test manifest', err);
        if (isMounted) {
          setError('Failed to load the test library. Please try again later.');
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

  const isImported = React.useCallback((entry: TestManifestEntry): boolean => importedSourceIds.has(entry.id), [importedSourceIds]);

  const categories = React.useMemo(() => {
    const unique = new Set<string>();
    manifest.forEach((entry) => {
      if (entry.category) {
        unique.add(entry.category);
      }
    });
    return ['all', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [manifest]);

  const filteredManifest = React.useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return manifest.filter((entry) => {
      const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
      const haystack = `${entry.title} ${entry.description} ${entry.category} ${entry.subcategory ?? ''}`.toLowerCase();
      const matchesSearch = search.length === 0 || haystack.includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, manifest, searchTerm]);

  const handleImport = async (entry: TestManifestEntry): Promise<void> => {
    if (isImported(entry)) {
      addToast('info', `"${entry.title}" is already in your library.`);
      return;
    }

    setImportingId(entry.id);
    try {
      const response = await fetch(encodeURI(entry.path));
      if (!response.ok) {
        throw new Error('Unable to download test file.');
      }

      const payload = (await response.json()) as QuizImportInput;
      const validation = validateQuizImport(payload);
      if (!validation.success || !validation.data) {
        const message = formatValidationErrors(validation.errors ?? []) || 'Test file is invalid.';
        throw new Error(message);
      }

      const quiz = await createQuiz(validation.data, { sourceId: entry.id });
      addToast('success', `"${quiz.title}" imported successfully.`);
      onImportSuccess(quiz);
    } catch (err) {
      console.error('Import failed', err);
      addToast('error', err instanceof Error ? err.message : 'Failed to import test.');
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
        <CardDescription>Quickly add curated practice tests to your library. Content stays local to your device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner text="Loading tests..." />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/50 dark:bg-red-950 dark:text-red-100">
            {error}
          </div>
        ) : manifest.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No built-in tests are available yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by title, description, or category"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-offset-slate-900 sm:max-w-sm"
                aria-label="Search built-in tests"
              />
              <div className="flex items-center gap-2">
                <label htmlFor="category-filter" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Category
                </label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-offset-slate-900"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All' : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredManifest.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">No tests match your filters.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredManifest.map((entry) => {
                  const imported = isImported(entry);
                  return (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{entry.title}</h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{entry.description}</p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="shrink-0 border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          >
                            {entry.category}
                          </Badge>
                        </div>
                        {entry.subcategory ? (
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{entry.subcategory}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs text-slate-500 dark:text-slate-300"
                          aria-label={imported ? 'Already imported' : 'Ready to import'}
                        >
                          {imported ? 'Already in your library' : 'Not imported yet'}
                        </span>
                        <Button
                          variant={imported ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => void handleImport(entry)}
                          disabled={imported || importingId === entry.id}
                          leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}
                        >
                          {imported ? 'Imported' : importingId === entry.id ? 'Importing...' : 'Import'}
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
