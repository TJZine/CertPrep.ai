import { db } from '@/db';
import type { Quiz } from '@/types/quiz';
import type { Result } from '@/types/result';

export interface ExportData {
  version: string;
  exportedAt: string;
  quizzes: Quiz[];
  results: Result[];
}

/**
 * Export all user data as JSON.
 */
export async function exportAllData(): Promise<ExportData> {
  const quizzes = await db.quizzes.toArray();
  const results = await db.results.toArray();

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    quizzes,
    results,
  };
}

/**
 * Download data as a JSON file.
 */
export async function downloadDataAsFile(): Promise<void> {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `certprep-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate imported data structure.
 */
export function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'string') return false;
  if (!Array.isArray(obj.quizzes)) return false;
  if (!Array.isArray(obj.results)) return false;

  for (const quiz of obj.quizzes) {
    if (!quiz || typeof quiz !== 'object') return false;
    const q = quiz as Record<string, unknown>;
    if (typeof q.id !== 'string') return false;
    if (typeof q.title !== 'string') return false;
    if (!Array.isArray(q.questions)) return false;
  }

  return true;
}

/**
 * Import data from a backup file.
 */
export async function importData(
  data: ExportData,
  mode: 'merge' | 'replace' = 'merge',
): Promise<{ quizzesImported: number; resultsImported: number }> {
  if (mode === 'replace') {
    await db.quizzes.clear();
    await db.results.clear();
  }

  let quizzesImported = 0;
  let resultsImported = 0;

  for (const quiz of data.quizzes) {
    try {
      if (mode === 'merge') {
        const existing = await db.quizzes.get(quiz.id);
        if (existing) continue;
      }
      await db.quizzes.add(quiz);
      quizzesImported += 1;
    } catch (error) {
      console.error('Failed to import quiz:', quiz.id, error);
    }
  }

  for (const result of data.results) {
    try {
      if (mode === 'merge') {
        const existing = await db.results.get(result.id);
        if (existing) continue;
      }
      await db.results.add(result);
      resultsImported += 1;
    } catch (error) {
      console.error('Failed to import result:', result.id, error);
    }
  }

  return { quizzesImported, resultsImported };
}

/**
 * Clear all data (factory reset).
 */
export async function clearAllData(): Promise<void> {
  await db.quizzes.clear();
  await db.results.clear();
  localStorage.clear();
  sessionStorage.clear();
}

/**
 * Get storage usage statistics.
 */
export async function getStorageStats(): Promise<{
  quizCount: number;
  resultCount: number;
  estimatedSizeKB: number;
}> {
  const quizzes = await db.quizzes.toArray();
  const results = await db.results.toArray();
  const quizzesJson = JSON.stringify(quizzes);
  const resultsJson = JSON.stringify(results);
  const estimatedSizeKB = Math.round((quizzesJson.length + resultsJson.length) / 1024);

  return {
    quizCount: quizzes.length,
    resultCount: results.length,
    estimatedSizeKB,
  };
}
