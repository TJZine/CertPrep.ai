export type ResultCompletionErrorCode =
  | "USER_CONTEXT_UNAVAILABLE"
  | "QUIZ_UNAVAILABLE"
  | "QUIZ_OWNERSHIP_MISMATCH"
  | "QUIZ_CHANGED"
  | "DRAFT_OWNERSHIP_LOST";

/**
 * A completion failure caused by a domain invariant rather than a transient
 * storage problem. Repeating the same write cannot make these failures pass.
 */
export class ResultCompletionError extends Error {
  readonly code: ResultCompletionErrorCode;
  readonly retryable = false;

  constructor(code: ResultCompletionErrorCode, message: string) {
    super(message);
    this.name = "ResultCompletionError";
    this.code = code;
  }
}

export function isResultCompletionError(
  error: unknown,
): error is ResultCompletionError {
  return error instanceof ResultCompletionError;
}
