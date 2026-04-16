/**
 * Copies text to the clipboard with a DOM-based fallback for older browsers.
 */
export async function copyToClipboard(text: string): Promise<void> {
  let writeTextError: unknown;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      writeTextError = error;
    }
  }

  if (typeof document === "undefined") {
    if (writeTextError) {
      const message =
        writeTextError instanceof Error
          ? writeTextError.message
          : "Unknown error";
      throw new Error(`Copy to clipboard failed: ${message}`);
    }

    throw new Error("Clipboard is not available in this environment.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.setAttribute("aria-hidden", "true");
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand("copy");

    if (!copied) {
      throw new Error("execCommand returned false");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Copy to clipboard failed: ${message}`);
  } finally {
    document.body.removeChild(textarea);
  }
}
