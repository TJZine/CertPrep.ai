import { describe, expect, it, beforeEach } from 'vitest';
import { db, clearDatabase } from '@/db/index';
import { createQuiz, updateQuiz, getQuizById } from '@/db/quizzes';
import { hashAnswer } from '@/lib/utils';
import type { QuizImportInput } from '@/validators/quizSchema';

describe('DB: quizzes', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  const userId = 'user-123';
  
  const mockQuizInput: QuizImportInput = {
    title: 'Unit Test Quiz',
    description: 'Testing DB logic',
    questions: [
      {
        id: 'q1',
        category: 'Test',
        question: 'What is 2+2?',
        options: { a: '3', b: '4' },
        correct_answer: 'b', // Raw answer provided
        explanation: 'Math',
      }
    ],
    tags: ['math'],
    version: 1
  };

  it('should create a quiz and hash the correct answer automatically', async () => {
    const quiz = await createQuiz(mockQuizInput, { userId });
    
    expect(quiz).toBeDefined();
    expect(quiz.questions[0]!.correct_answer_hash).toBeDefined();
    expect(quiz.questions[0]!.correct_answer_hash).not.toBe('b'); // Should be hashed
    
    // Verify hash correctness
    const expectedHash = await hashAnswer('b');
    expect(quiz.questions[0]!.correct_answer_hash).toBe(expectedHash);
  });

  it('should update a quiz successfully when providing raw correct_answer without hash', async () => {
    // 1. Create initial quiz
    const created = await createQuiz(mockQuizInput, { userId });
    const quizId = created.id;

    // 2. Prepare update with a NEW question that has correct_answer but NO hash
    // This simulates an edit or import where the user added a question
    const newQuestion = {
      id: 'q2',
      category: 'Test',
      question: 'What is 3+3?',
      options: { a: '6', b: '7' },
      correct_answer: 'a', // Only raw answer
      explanation: 'Math',
    };

    const updates = {
      title: 'Updated Title',
      questions: [
        ...created.questions, // keep existing
        newQuestion // add new one
      ]
    };

    // 3. Perform update
    await updateQuiz(quizId, userId, updates);

    // 4. Verify
    const updated = await getQuizById(quizId, userId);
    expect(updated).toBeDefined();
    expect(updated!.title).toBe('Updated Title');
    expect(updated!.questions).toHaveLength(2);

    const q2 = updated!.questions.find(q => q.id === 'q2');
    expect(q2).toBeDefined();
    // The bug would cause this to fail before reaching here, or q2 would be missing hash if logic failed silently
    expect(q2!.correct_answer_hash).toBeDefined();
    expect(q2!.correct_answer_hash).toBe(await hashAnswer('a'));
  });

  it('should not expose correct_answer in the DB or returned object', async () => {
    // Although we keep it during sanitization, it should NOT be in the final DB record
    // createQuiz and updateQuiz should strip it before saving
    const quiz = await createQuiz(mockQuizInput, { userId });
    
    // Check the actual object returned
    expect(quiz.questions[0]!.correct_answer).toBeUndefined();
    
    // Check DB directly
    const stored = await db.quizzes.get(quiz.id);
    expect(stored!.questions[0]!.correct_answer).toBeUndefined();
  });
});
