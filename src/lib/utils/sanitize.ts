import DOMPurify from "isomorphic-dompurify";

interface SanitizeHTMLOptions {
  allowClass?: boolean;
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * PRIVACY: All processing happens locally in the browser; no data leaves the device.
 */
export function sanitizeHTML(
  dirty: string,
  options: SanitizeHTMLOptions = {},
): string {
  const { allowClass = true } = options;

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
    ALLOWED_ATTR: allowClass ? ["class"] : [],
  });
}

/**
 * Sanitizes question text content.
 */
export function sanitizeQuestionText(text: string): string {
  return sanitizeHTML(text);
}
