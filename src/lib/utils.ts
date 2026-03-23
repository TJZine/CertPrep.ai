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
