/**
 * SyncProvider unit tests
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

import { SyncProvider, useSyncContext } from "@/components/providers/SyncProvider";
import type { CoordinatedSyncOutcome, SyncDomain } from "@/lib/sync/coordinator";

const mockRunSyncPlan = vi.hoisted(() => vi.fn());
const mockGetSyncBlockState = vi.hoisted(() => vi.fn());

function buildOutcomes(
  overrides: Partial<Record<SyncDomain, CoordinatedSyncOutcome>> = {},
): Record<SyncDomain, CoordinatedSyncOutcome> {
  return {
    quizzes: { incomplete: false, status: "synced" },
    results: { incomplete: false, status: "synced" },
    srs: { incomplete: false, status: "synced" },
    ...overrides,
  };
}

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: (): { user: { id: string } } => ({ user: { id: "test-user-123" } }),
}));

vi.mock("@/lib/sync/coordinator", () => ({
  runSyncPlan: mockRunSyncPlan,
  toSyncDetails: (
    outcomes: Record<SyncDomain, CoordinatedSyncOutcome>,
  ): { quizzes: boolean; results: boolean; srs: boolean } => ({
    quizzes: outcomes.quizzes.incomplete,
    results: outcomes.results.incomplete,
    srs: outcomes.srs.incomplete,
  }),
}));

vi.mock("@/db/syncState", () => ({
  getSyncBlockState: mockGetSyncBlockState,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <SyncProvider>{children}</SyncProvider>
);

describe("SyncProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunSyncPlan.mockResolvedValue({
      domains: ["quizzes", "results", "srs"],
      settlements: {},
      outcomes: buildOutcomes(),
    });
    mockGetSyncBlockState.mockResolvedValue(null);
  });

  it("returns success when the shared sync coordinator reports all domains complete", async () => {
    const { result } = renderHook(() => useSyncContext(), { wrapper });
    await waitFor(() => expect(result.current.hasInitialSyncCompleted).toBe(true));

    let outcome;
    await act(async () => {
      outcome = await result.current.sync();
    });

    expect(mockRunSyncPlan).toHaveBeenCalledWith("test-user-123", "full");
    expect(outcome).toMatchObject({
      status: "success",
      success: true,
      details: { quizzes: false, results: false, srs: false },
    });
  });

  it("returns partial when any coordinated domain is incomplete", async () => {
    mockRunSyncPlan.mockResolvedValue({
      domains: ["quizzes", "results", "srs"],
      settlements: {},
      outcomes: buildOutcomes({
        srs: { incomplete: true, status: "failed" },
      }),
    });

    const { result } = renderHook(() => useSyncContext(), { wrapper });
    await waitFor(() => expect(result.current.hasInitialSyncCompleted).toBe(true));

    let outcome;
    await act(async () => {
      outcome = await result.current.sync();
    });

    expect(outcome).toMatchObject({
      status: "partial",
      success: false,
      details: { quizzes: false, results: false, srs: true },
    });
  });

  it("returns partial when all coordinated domains are skipped and retryable", async () => {
    mockRunSyncPlan.mockResolvedValue({
      domains: ["quizzes", "results", "srs"],
      settlements: {},
      outcomes: buildOutcomes({
        quizzes: { incomplete: false, status: "skipped", shouldRetry: true },
        results: { incomplete: false, status: "skipped", shouldRetry: true },
        srs: { incomplete: false, status: "skipped", shouldRetry: true },
      }),
    });

    const { result } = renderHook(() => useSyncContext(), { wrapper });
    await waitFor(() => expect(result.current.hasInitialSyncCompleted).toBe(true));

    let outcome;
    await act(async () => {
      outcome = await result.current.sync();
    });

    expect(outcome).toMatchObject({
      status: "partial",
      success: false,
      details: { quizzes: false, results: false, srs: false },
    });
  });

  it("returns partial when a coordinated domain is skipped and retryable", async () => {
    mockRunSyncPlan.mockResolvedValue({
      domains: ["quizzes", "results", "srs"],
      settlements: {},
      outcomes: buildOutcomes({
        results: { incomplete: false, status: "skipped", shouldRetry: true },
      }),
    });

    const { result } = renderHook(() => useSyncContext(), { wrapper });
    await waitFor(() => expect(result.current.hasInitialSyncCompleted).toBe(true));

    let outcome;
    await act(async () => {
      outcome = await result.current.sync();
    });

    expect(outcome).toMatchObject({
      status: "partial",
      success: false,
      details: { quizzes: false, results: false, srs: false },
    });
  });

  it("prevents overlapping sync calls", async () => {
    const syncControl: { resolve: (() => void) | null } = { resolve: null };
    mockRunSyncPlan.mockImplementation(
      () =>
        new Promise((resolve) => {
          syncControl.resolve = (): void =>
            resolve({
              domains: ["quizzes", "results", "srs"],
              settlements: {},
              outcomes: buildOutcomes(),
            });
        }),
    );

    const { result } = renderHook(() => useSyncContext(), { wrapper });

    await waitFor(() => expect(result.current.isSyncing).toBe(true));

    let secondSyncOutcome;
    await act(async () => {
      secondSyncOutcome = await result.current.sync();
    });

    expect(secondSyncOutcome).toMatchObject({
      status: "partial",
      success: false,
      error: "Sync in progress",
    });

    syncControl.resolve?.();
    await waitFor(() => expect(result.current.isSyncing).toBe(false));
  });
});
