import { z } from 'zod';

/**
 * Represents user-facing validation error details.
 */
export interface ValidationError {
  path: Array<string | number>;
  message: string;
}

/**
 * Represents the result of a validation operation.
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

const TrimmedString = z.string().trim();
const requiredString = (field: string): z.ZodString => TrimmedString.min(1, `${field} is required`);
const OptionKeyString = z.string().min(1, 'Option key is required');
const OptionValueString = TrimmedString.min(1, 'Option text is required');

/**
 * Optional difficulty enum used across quiz content.
 */
export const DifficultySchema = z.enum(['Easy', 'Medium', 'Hard']).optional();

/**
 * Schema for validating individual questions within a quiz.
 */
export const QuestionSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((value) => String(value)),
    category: requiredString('Category'),
    difficulty: DifficultySchema,
    question: requiredString('Question text'),
    options: z
      .record(OptionKeyString, OptionValueString)
      .refine((opts) => Object.keys(opts).length >= 2, 'At least 2 options are required'),
    correct_answer: TrimmedString.optional(),
    correct_answer_hash: TrimmedString.optional(),
    explanation: requiredString('Explanation'),
    distractor_logic: TrimmedString.optional(),
    ai_prompt: TrimmedString.optional(),
    user_notes: TrimmedString.optional(),
  })
  .superRefine((data, ctx) => {
    // Ensure the provided correct answer exists within the options record.
    if (data.correct_answer && !(data.correct_answer in data.options)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Correct answer must match one of the option keys',
        path: ['correct_answer'],
      });
    }
    if (!data.correct_answer && !data.correct_answer_hash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either correct_answer or correct_answer_hash must be provided',
        path: ['correct_answer'],
      });
    }
  });

/**
 * Schema for validating imported quiz data provided by users.
 */
export const QuizImportSchema = z.object({
  title: requiredString('Title').max(100, 'Title must be 100 characters or fewer'),
  description: TrimmedString.max(500, 'Description must be 500 characters or fewer').optional().default(''),
  questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
  tags: z.array(requiredString('Tag')).optional().default([]),
  version: z.number().int().positive().optional().default(1),
});

/**
 * Schema for stored quizzes that include metadata fields.
 */
export const QuizSchema = QuizImportSchema.extend({
  id: z.string().uuid({ message: 'Quiz ID must be a valid UUID' }),
  created_at: z.number().int().nonnegative(),
});

export type QuestionInput = z.input<typeof QuestionSchema>;
export type QuestionOutput = z.output<typeof QuestionSchema>;
export type QuizImportInput = z.output<typeof QuizImportSchema>;
export type QuizOutput = z.output<typeof QuizSchema>;

/**
 * Validates quiz JSON provided by users, returning typed data or structured errors.
 */
export function validateQuizImport(data: unknown): ValidationResult<QuizImportInput> {
  const parsed = QuizImportSchema.safeParse(data);

  if (parsed.success) {
    return {
      success: true,
      data: parsed.data,
    };
  }

  const errors: ValidationError[] = parsed.error.issues.map((issue) => ({
    path: issue.path.map((segment) =>
      typeof segment === 'symbol' ? segment.toString() : segment,
    ),
    message: issue.message,
  }));

  return {
    success: false,
    errors,
  };
}

/**
 * Formats validation errors into a human-readable string suitable for UI or logs.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  return errors
    .map((error) => {
      const normalizedPath = error.path
        .map((segment) => (typeof segment === 'number' ? `[${segment}]` : segment))
        .join(error.path.length > 0 ? '.' : '');
      const path = normalizedPath.length > 0 ? normalizedPath : 'root';
      return `${path}: ${error.message}`;
    })
    .join('\n');
}
