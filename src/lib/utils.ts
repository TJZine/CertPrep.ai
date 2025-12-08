import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names with Tailwind-aware conflict resolution.
 *
 * @param inputs - Class names, conditional objects, or arrays of classes.
 * @returns A single merged class string.
 *
 * @example
 * cn("p-4", isActive && "bg-blue-500", "text-center")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Generates a cryptographically strong UUID.
 *
 * Uses the native `crypto.randomUUID()` API.
 *
 * @returns A string valid UUID v4.
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Formats seconds as MM:SS.
 *
 * @param seconds - The total number of seconds.
 * @returns A string in "MM:SS" format (e.g., "01:30", "12:05").
 *
 * @example
 * formatTime(90) // "01:30"
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formats a timestamp into a human-readable date/time string.
 *
 * @param timestamp - Unix timestamp in milliseconds.
 * @returns A locale-formatted string (e.g., "Oct 24, 2023, 12:00 PM").
 */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

/**
 * Calculates the percentage of correct answers.
 *
 * @param correct - Number of correct answers.
 * @param total - Total number of questions.
 * @returns The percentage rounded to the nearest integer.
 *          Returns 0 if `total` is 0 to avoid NaN.
 *
 * @example
 * calculatePercentage(5, 10) // 50
 * calculatePercentage(0, 0)  // 0
 */
export function calculatePercentage(correct: number, total: number): number {
  if (total === 0) {
    return 0;
  }
  return Math.round((correct / total) * 100);
}

/**
 * Hashes an answer string using SHA-256.
 *
 * Useful for validating answers client-side without exposing the raw text.
 *
 * @param answer - The raw answer text.
 * @returns A Promise resolving to the hex string of the SHA-256 hash.
 */
export async function hashAnswer(answer: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(answer);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
