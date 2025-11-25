import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * PRIVACY: All processing happens locally in the browser; no data leaves the device.
 */
export function sanitizeHTML(dirty: string): string {
  if (typeof window === 'undefined') {
    return dirty
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre', 'ul', 'ol', 'li', 'p', 'br', 'span'],
    ALLOWED_ATTR: ['class'],
  });
}

/**
 * Sanitizes question text content.
 */
export function sanitizeQuestionText(text: string): string {
  return sanitizeHTML(text);
}
