"use client";

import * as React from "react";

interface KeyboardNavOptions {
  onNext?: () => void;
  onPrevious?: () => void;
  onSelectOption?: (key: string) => void;
  onSubmit?: () => void;
  onFlag?: () => void;
  enabled?: boolean;
  optionKeys?: string[];
}

/**
 * Keyboard navigation for quiz interactions.
 */
export function useKeyboardNav({
  onNext,
  onPrevious,
  onSelectOption,
  onSubmit,
  onFlag,
  enabled = true,
  optionKeys = ["A", "B", "C", "D"],
}: KeyboardNavOptions): void {
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toUpperCase();

      switch (event.key) {
        case "ArrowRight":
        case "j":
        case "J":
          event.preventDefault();
          onNext?.();
          break;
        case "ArrowLeft":
        case "k":
        case "K":
          event.preventDefault();
          onPrevious?.();
          break;
        case "Enter":
        case " ":
          if (target.tagName !== "BUTTON") {
            event.preventDefault();
            onSubmit?.();
          }
          break;
        case "f":
        case "F":
          event.preventDefault();
          onFlag?.();
          break;
        default:
          if (optionKeys.includes(key)) {
            event.preventDefault();
            onSelectOption?.(key);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return (): void => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    onNext,
    onPrevious,
    onSelectOption,
    onSubmit,
    onFlag,
    optionKeys,
  ]);
}

interface SpacedRepetitionNavOptions {
  onAgain?: () => void;
  onHard?: () => void;
  onGood?: () => void;
  enabled?: boolean;
}

/**
 * Keyboard shortcuts for spaced repetition actions.
 */
export function useSpacedRepetitionNav({
  onAgain,
  onHard,
  onGood,
  enabled = true,
}: SpacedRepetitionNavOptions): void {
  React.useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case "1":
          event.preventDefault();
          onAgain?.();
          break;
        case "2":
          event.preventDefault();
          onHard?.();
          break;
        case "3":
          event.preventDefault();
          onGood?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return (): void => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onAgain, onHard, onGood]);
}
