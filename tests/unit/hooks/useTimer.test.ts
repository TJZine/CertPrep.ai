import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTimer } from "@/hooks/useTimer";

describe("useTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("initializes with default values", () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.seconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.formattedTime).toBe("00:00");
  });

  it("supports custom initial seconds", () => {
    const { result } = renderHook(() => useTimer({ initialSeconds: 90 }));
    expect(result.current.seconds).toBe(90);
    expect(result.current.formattedTime).toBe("01:30");
  });

  it("starts and pauses correctly", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });
    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.seconds).toBe(1);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isRunning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.seconds).toBe(1); // Should not increase while paused
  });

  it("counts down and triggers onComplete", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTimer({
        initialSeconds: 2,
        countDown: true,
        autoStart: true,
        onComplete,
      }),
    );

    expect(result.current.isRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.seconds).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.seconds).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("resets to initial or custom value", () => {
    const { result } = renderHook(() => useTimer({ initialSeconds: 10 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.seconds).toBe(15);

    act(() => {
      result.current.reset();
    });
    expect(result.current.seconds).toBe(10);
    expect(result.current.isRunning).toBe(false);

    act(() => {
      result.current.reset(100);
    });
    expect(result.current.seconds).toBe(100);
  });

  it("formats time correctly for large values", () => {
    const { result } = renderHook(() => useTimer({ initialSeconds: 3661 }));
    expect(result.current.formattedTime).toBe("61:01");
  });
});
