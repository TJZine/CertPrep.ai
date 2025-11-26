import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db';
import { exportAllData, importData } from '@/lib/dataExport';
import type { Quiz } from '@/types/quiz';
import type { Result } from '@/types/result';

async function resetDatabase(): Promise<void> {
  db.close();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('CertPrepDatabase');
    request.onerror = (): void => reject(request.error ?? new Error('Failed to delete database'));
    request.onsuccess = (): void => resolve();
  });
  await db.open();
  await db.transaction('rw', db.quizzes, db.results, async () => {
    await db.quizzes.clear();
    await db.results.clear();
  });
}

describe('data export/import', () => {
  const sampleQuiz: Quiz = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Sample Quiz',
    description: 'A quiz used for backup import tests.',
    created_at: 1_700_000_000_000,
    questions: [
      {
        id: 'q1',
        category: 'Networking',
        question: 'What does HTTP stand for?',
        options: {
          A: 'Hypertext Transfer Protocol',
          B: 'Home Tool Transfer Protocol',
        },
        correct_answer: 'A',
        explanation: 'HTTP stands for Hypertext Transfer Protocol.',
      },
    ],
    tags: ['import', 'backup'],
    version: 1,
    sourceId: 'source-abc',
  };

  const sampleResult: Result = {
    id: '22222222-2222-4222-8222-222222222222',
    quiz_id: sampleQuiz.id,
    timestamp: 1_700_000_100_000,
    mode: 'zen',
    score: 80,
    time_taken_seconds: 120,
    answers: { q1: 'A' },
    flagged_questions: [],
    category_breakdown: { Networking: 1 },
  };

  beforeEach(async () => {
    await resetDatabase();
  });

  it('preserves quiz and result IDs and links during replace import', async () => {
    await db.quizzes.put(sampleQuiz);
    await db.results.put(sampleResult);

    const exported = await exportAllData();

    const { quizzesImported, resultsImported } = await importData(exported, 'replace');

    const restoredQuiz = await db.quizzes.get(sampleQuiz.id);
    const restoredResult = await db.results.get(sampleResult.id);

    expect(quizzesImported).toBe(1);
    expect(resultsImported).toBe(1);
    expect(restoredQuiz?.id).toBe(sampleQuiz.id);
    expect(restoredQuiz?.created_at).toBe(sampleQuiz.created_at);
    expect(restoredQuiz?.sourceId).toBe(sampleQuiz.sourceId);
    expect(restoredResult?.quiz_id).toBe(sampleQuiz.id);
  });
});
