import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db';
import { generateJSONExport, getStorageStats, importData, type ExportData } from '@/lib/dataExport';
import type { Quiz } from '@/types/quiz';
import type { Result } from '@/types/result';

const TEST_USER_ID = 'user-test-123';

async function getAllDataFromGenerator(): Promise<ExportData> {
  let jsonString = '';
  for await (const chunk of generateJSONExport(TEST_USER_ID)) {
    jsonString += chunk;
  }
  return JSON.parse(jsonString) as ExportData;
}

async function resetDatabase(): Promise<void> {
  db.close();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('CertPrepDatabase');
    request.onerror = (): void => reject(request.error ?? new Error('Failed to delete database'));
    request.onsuccess = (): void => resolve();
  });
  await db.open();
}

describe('data export/import', () => {
  const sampleQuiz: Quiz = {
    id: '11111111-1111-4111-8111-111111111111',
    user_id: TEST_USER_ID,
    title: 'Sample Quiz',
    description: 'A quiz used for backup import tests.',
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
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
        correct_answer_hash: 'dummy-hash-123',
        explanation: 'HTTP stands for Hypertext Transfer Protocol.',
      },
    ],
    tags: ['import', 'backup'],
    version: 1,
    sourceId: 'source-abc',
    deleted_at: null,
    quiz_hash: null,
    last_synced_at: null,
    last_synced_version: null,
  };

  const sampleResult: Result = {
    id: '22222222-2222-4222-8222-222222222222',
    quiz_id: sampleQuiz.id,
    user_id: TEST_USER_ID,
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

  it('calculates storage statistics correctly', async () => {
    await db.quizzes.put(sampleQuiz);
    await db.results.put(sampleResult);

    const stats = await getStorageStats(TEST_USER_ID);

    expect(stats.quizCount).toBe(1);
    expect(stats.resultCount).toBe(1);
    expect(stats.estimatedSizeKB).toBeGreaterThan(0);
  });

  it('preserves quiz and result IDs and links during replace import', async () => {
    await db.quizzes.put(sampleQuiz);
    await db.results.put(sampleResult);

    const exported = await getAllDataFromGenerator();

    const { quizzesImported, resultsImported } = await importData(exported, TEST_USER_ID, 'replace');

    const restoredQuiz = await db.quizzes.get(sampleQuiz.id);
    const restoredResult = await db.results.get(sampleResult.id);

    expect(quizzesImported).toBe(1);
    expect(resultsImported).toBe(1);
    expect(restoredQuiz?.id).toBe(sampleQuiz.id);
    expect(restoredQuiz?.created_at).toBe(sampleQuiz.created_at);
    expect(restoredQuiz?.sourceId).toBe(sampleQuiz.sourceId);
    expect(restoredResult?.quiz_id).toBe(sampleQuiz.id);
  });

  it('skips existing quizzes and results in merge mode', async () => {
    await db.quizzes.put(sampleQuiz);
    await db.results.put(sampleResult);

    const exported = await getAllDataFromGenerator();
    const { quizzesImported, resultsImported } = await importData(exported, TEST_USER_ID, 'merge');

    const quizCount = await db.quizzes.count();
    const resultCount = await db.results.count();

    expect(quizzesImported).toBe(0);
    expect(resultsImported).toBe(0);
    expect(quizCount).toBe(1);
    expect(resultCount).toBe(1);
  });

  it('drops results that reference missing quizzes during import', async () => {
    const orphanResult: Result = {
      ...sampleResult,
      id: '33333333-3333-4333-8333-333333333333',
      quiz_id: '44444444-4444-4444-8444-444444444444',
    };

    const exported: ExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      quizzes: [sampleQuiz],
      results: [sampleResult, orphanResult],
    };

    const { quizzesImported, resultsImported } = await importData(exported, TEST_USER_ID, 'replace');
    const storedResults = await db.results.toArray();

    expect(quizzesImported).toBe(1);
    expect(resultsImported).toBe(1);
    expect(storedResults).toHaveLength(1);
    expect(storedResults[0]?.id).toBe(sampleResult.id);
  });

  it('scopes merge dedupe to the active user', async () => {
    const otherUserId = 'user-other';
    const sharedQuizId = '12345678-1234-4123-8123-1234567890ab';

    await db.quizzes.put({ ...sampleQuiz, id: sharedQuizId, user_id: otherUserId });
    await db.results.put({
      ...sampleResult,
      quiz_id: sharedQuizId,
      user_id: otherUserId,
      id: '22345678-1234-4123-8123-1234567890ab',
    });

    const importPayload: ExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      quizzes: [{ ...sampleQuiz, id: sharedQuizId, user_id: otherUserId }],
      results: [
        { ...sampleResult, quiz_id: sharedQuizId, user_id: otherUserId, id: '32345678-1234-4123-8123-1234567890ab' },
      ],
    };

    const { quizzesImported, resultsImported } = await importData(importPayload, TEST_USER_ID, 'merge');

    const storedQuiz = await db.quizzes.get(sharedQuizId);
    const storedResults = await db.results.where('user_id').equals(TEST_USER_ID).toArray();

    expect(quizzesImported).toBe(1);
    expect(resultsImported).toBe(1);
    expect(storedQuiz?.user_id).toBe(TEST_USER_ID);
    expect(storedResults).toHaveLength(1);
    expect(storedResults[0]?.quiz_id).toBe(sharedQuizId);
  });
});
