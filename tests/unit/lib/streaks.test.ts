import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStudyStreak } from "@/lib/streaks";

describe("streaks", () => {
  let storage: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    key: ReturnType<typeof vi.fn>;
    length: number;
  };

  beforeEach(() => {
    storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the stored streak when the payload is valid", () => {
    storage.getItem.mockReturnValue(
      JSON.stringify({
        currentStreak: 3,
        longestStreak: 5,
        lastStudyDate: "2026-04-15",
      }),
    );

    expect(getStudyStreak()).toEqual({
      currentStreak: 3,
      longestStreak: 5,
      lastStudyDate: "2026-04-15",
    });
  });

  it("falls back to the default streak and repairs storage when the payload is malformed", () => {
    storage.getItem.mockReturnValue(
      JSON.stringify({
        currentStreak: "three",
        longestStreak: 5,
        lastStudyDate: 12,
      }),
    );

    expect(getStudyStreak()).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      "study_streak",
      JSON.stringify({
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
      }),
    );
  });

  it("returns the default streak even when the repair write fails", () => {
    storage.getItem.mockReturnValue(
      JSON.stringify({
        currentStreak: "three",
        longestStreak: 5,
        lastStudyDate: 12,
      }),
    );
    storage.setItem
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error("quota exceeded");
      });

    expect(getStudyStreak()).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
    });
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });
});
