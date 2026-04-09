import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useKeyboardNav, useSpacedRepetitionNav } from "@/hooks/useKeyboardNav";

describe("useKeyboardNav", () => {
  const dispatchKey = (key: string, options = {}): void => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, ...options }));
  };

  it("handles basic navigation keys", () => {
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    renderHook(() => useKeyboardNav({ onNext, onPrevious }));

    dispatchKey("ArrowRight");
    expect(onNext).toHaveBeenCalledTimes(1);

    dispatchKey("j");
    expect(onNext).toHaveBeenCalledTimes(2);

    dispatchKey("ArrowLeft");
    expect(onPrevious).toHaveBeenCalledTimes(1);

    dispatchKey("k");
    expect(onPrevious).toHaveBeenCalledTimes(2);
  });

  it("handles selection and submisson keys", () => {
    const onSelectOption = vi.fn();
    const onSubmit = vi.fn();
    renderHook(() => useKeyboardNav({ onSelectOption, onSubmit }));

    dispatchKey("a");
    expect(onSelectOption).toHaveBeenCalledWith("A");

    dispatchKey("C");
    expect(onSelectOption).toHaveBeenCalledWith("C");

    dispatchKey("Enter");
    expect(onSubmit).toHaveBeenCalledTimes(1);

    dispatchKey(" ");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("handles flagging", () => {
    const onFlag = vi.fn();
    renderHook(() => useKeyboardNav({ onFlag }));

    dispatchKey("f");
    expect(onFlag).toHaveBeenCalledTimes(1);
  });

  it("ignores keys when disabled", () => {
    const onNext = vi.fn();
    renderHook(() => useKeyboardNav({ onNext, enabled: false }));

    dispatchKey("ArrowRight");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("ignores keys when typing in input", () => {
    const onNext = vi.fn();
    renderHook(() => useKeyboardNav({ onNext }));

    // Mock target as input
    const input = document.createElement("input");
    const event = new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
    });
    Object.defineProperty(event, "target", { value: input, enumerable: true });

    window.dispatchEvent(event);
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe("useSpacedRepetitionNav", () => {
  const dispatchKey = (key: string): void => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key }));
  };

  it("handles 1, 2, 3 keys", () => {
    const onAgain = vi.fn();
    const onHard = vi.fn();
    const onGood = vi.fn();
    renderHook(() => useSpacedRepetitionNav({ onAgain, onHard, onGood }));

    dispatchKey("1");
    expect(onAgain).toHaveBeenCalledTimes(1);

    dispatchKey("2");
    expect(onHard).toHaveBeenCalledTimes(1);

    dispatchKey("3");
    expect(onGood).toHaveBeenCalledTimes(1);
  });

  it("ignores keys when disabled", () => {
    const onAgain = vi.fn();
    renderHook(() => useSpacedRepetitionNav({ onAgain, enabled: false }));

    dispatchKey("1");
    expect(onAgain).not.toHaveBeenCalled();
  });
});
