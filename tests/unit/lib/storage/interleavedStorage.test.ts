import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearInterleavedState,
  INTERLEAVED_KEY_MAPPINGS_KEY,
  INTERLEAVED_QUIZ_KEY,
  INTERLEAVED_SOURCE_MAP_KEY,
  loadInterleavedState,
} from "@/lib/storage/interleavedStorage";

describe("interleavedStorage", () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    const sessionStorageMock = {
      sessionStorage: {
        getItem: (key: string): string | null => mockStorage[key] ?? null,
        setItem: (key: string, value: string): void => {
          mockStorage[key] = value;
        },
        removeItem: (key: string): void => {
          delete mockStorage[key];
        },
      },
    };
    vi.stubGlobal("window", sessionStorageMock);
    vi.stubGlobal("sessionStorage", sessionStorageMock.sessionStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the stored session when the payload matches the expected shape", () => {
    mockStorage[INTERLEAVED_QUIZ_KEY] = JSON.stringify({
      id: "quiz-1",
      user_id: "user-1",
      title: "Interleaved Practice",
      description: "desc",
      created_at: Date.now(),
      questions: [
        {
          id: "q1",
          category: "Cardio",
          question: "Question",
          options: { A: "One", B: "Two" },
          explanation: "Because",
        },
      ],
      tags: ["study"],
      version: 1,
    });
    mockStorage[INTERLEAVED_SOURCE_MAP_KEY] = JSON.stringify({ q1: "quiz-a" });
    mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY] = JSON.stringify({
      q1: { A: "1", B: "2" },
    });

    expect(loadInterleavedState()).toEqual({
      quiz: expect.objectContaining({ id: "quiz-1", title: "Interleaved Practice" }),
      sourceMap: { q1: "quiz-a" },
      keyMappings: { q1: { A: "1", B: "2" } },
    });
  });

  it("clears the stored state and returns null when the quiz payload is malformed", () => {
    mockStorage[INTERLEAVED_QUIZ_KEY] = JSON.stringify({
      id: "quiz-1",
      title: "Missing required fields",
    });
    mockStorage[INTERLEAVED_SOURCE_MAP_KEY] = JSON.stringify({ q1: "quiz-a" });
    mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY] = JSON.stringify({
      q1: { A: "1" },
    });

    expect(loadInterleavedState()).toBeNull();
    expect(mockStorage[INTERLEAVED_QUIZ_KEY]).toBeUndefined();
    expect(mockStorage[INTERLEAVED_SOURCE_MAP_KEY]).toBeUndefined();
    expect(mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY]).toBeUndefined();
  });

  it("clears the stored state and returns null when the source map payload is malformed", () => {
    mockStorage[INTERLEAVED_QUIZ_KEY] = JSON.stringify({
      id: "quiz-1",
      user_id: "user-1",
      title: "Interleaved Practice",
      description: "desc",
      created_at: Date.now(),
      questions: [],
      tags: [],
      version: 1,
    });
    mockStorage[INTERLEAVED_SOURCE_MAP_KEY] = JSON.stringify({ q1: 42 });

    expect(loadInterleavedState()).toBeNull();
    expect(mockStorage[INTERLEAVED_QUIZ_KEY]).toBeUndefined();
    expect(mockStorage[INTERLEAVED_SOURCE_MAP_KEY]).toBeUndefined();
  });

  it("drops invalid key mappings and preserves the rest of a valid session", () => {
    mockStorage[INTERLEAVED_QUIZ_KEY] = JSON.stringify({
      id: "quiz-1",
      user_id: "user-1",
      title: "Interleaved Practice",
      description: "desc",
      created_at: Date.now(),
      questions: [],
      tags: [],
      version: 1,
    });
    mockStorage[INTERLEAVED_SOURCE_MAP_KEY] = JSON.stringify({ q1: "quiz-a" });
    mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY] = JSON.stringify({
      q1: ["not-a-mapping"],
    });

    expect(loadInterleavedState()).toEqual({
      quiz: expect.objectContaining({ id: "quiz-1", title: "Interleaved Practice" }),
      sourceMap: { q1: "quiz-a" },
      keyMappings: null,
    });
    expect(mockStorage[INTERLEAVED_QUIZ_KEY]).toBeDefined();
    expect(mockStorage[INTERLEAVED_SOURCE_MAP_KEY]).toBeDefined();
    expect(mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY]).toBeUndefined();
  });

  it("drops malformed key mappings JSON and preserves the rest of a valid session", () => {
    mockStorage[INTERLEAVED_QUIZ_KEY] = JSON.stringify({
      id: "quiz-1",
      user_id: "user-1",
      title: "Interleaved Practice",
      description: "desc",
      created_at: Date.now(),
      questions: [],
      tags: [],
      version: 1,
    });
    mockStorage[INTERLEAVED_SOURCE_MAP_KEY] = JSON.stringify({ q1: "quiz-a" });
    mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY] = "{";

    expect(loadInterleavedState()).toEqual({
      quiz: expect.objectContaining({ id: "quiz-1", title: "Interleaved Practice" }),
      sourceMap: { q1: "quiz-a" },
      keyMappings: null,
    });
    expect(mockStorage[INTERLEAVED_QUIZ_KEY]).toBeDefined();
    expect(mockStorage[INTERLEAVED_SOURCE_MAP_KEY]).toBeDefined();
    expect(mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY]).toBeUndefined();
  });

  it("clears the stored state and returns null when the quiz JSON is malformed", () => {
    mockStorage[INTERLEAVED_QUIZ_KEY] = "{";
    mockStorage[INTERLEAVED_SOURCE_MAP_KEY] = JSON.stringify({ q1: "quiz-a" });
    mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY] = JSON.stringify({
      q1: { A: "1" },
    });

    expect(loadInterleavedState()).toBeNull();
    expect(mockStorage[INTERLEAVED_QUIZ_KEY]).toBeUndefined();
    expect(mockStorage[INTERLEAVED_SOURCE_MAP_KEY]).toBeUndefined();
    expect(mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY]).toBeUndefined();
  });

  it("clears the stored state and returns null when the source map JSON is malformed", () => {
    mockStorage[INTERLEAVED_QUIZ_KEY] = JSON.stringify({
      id: "quiz-1",
      user_id: "user-1",
      title: "Interleaved Practice",
      description: "desc",
      created_at: Date.now(),
      questions: [],
      tags: [],
      version: 1,
    });
    mockStorage[INTERLEAVED_SOURCE_MAP_KEY] = "{";
    mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY] = JSON.stringify({
      q1: { A: "1" },
    });

    expect(loadInterleavedState()).toBeNull();
    expect(mockStorage[INTERLEAVED_QUIZ_KEY]).toBeUndefined();
    expect(mockStorage[INTERLEAVED_SOURCE_MAP_KEY]).toBeUndefined();
    expect(mockStorage[INTERLEAVED_KEY_MAPPINGS_KEY]).toBeUndefined();
  });

  it("returns a valid session when key mappings are absent", () => {
    mockStorage[INTERLEAVED_QUIZ_KEY] = JSON.stringify({
      id: "quiz-1",
      user_id: "user-1",
      title: "Interleaved Practice",
      description: "desc",
      created_at: Date.now(),
      questions: [],
      tags: [],
      version: 1,
    });
    mockStorage[INTERLEAVED_SOURCE_MAP_KEY] = JSON.stringify({ q1: "quiz-a" });

    expect(loadInterleavedState()).toEqual({
      quiz: expect.objectContaining({ id: "quiz-1", title: "Interleaved Practice" }),
      sourceMap: { q1: "quiz-a" },
      keyMappings: null,
    });
  });

  it("does not throw when clearing state without a browser window", () => {
    vi.stubGlobal("window", undefined);
    expect(() => clearInterleavedState()).not.toThrow();
  });
});
