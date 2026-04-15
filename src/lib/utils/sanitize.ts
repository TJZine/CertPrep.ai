import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * PRIVACY: All processing happens locally in the browser; no data leaves the device.
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "code",
      "pre",
      "ul",
      "ol",
      "li",
      "p",
      "br",
      "span",
    ],
    // ALLOWED_ATTR includes 'class' to support custom styling in user-uploaded quizzes.
    // Risk: Users could inject utility classes to deface the UI (Self-XSS).
    // Decision: Accepted risk to support rich content features.
    ALLOWED_ATTR: ["class"],
  });
}

/**
 * Sanitizes question text content.
 */
export function sanitizeQuestionText(text: string): string {
  return sanitizeHTML(text);
}
