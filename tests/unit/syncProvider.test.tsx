/**
 * SyncProvider unit tests
 *
 * Tests parallel sync execution and ref-based debounce guard
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { SyncProvider, useSyncContext } from "@/components/providers/SyncProvider";

// Hoist mocks before imports
const mockSyncQuizzes = vi.hoisted(() => vi.fn());
const mockSyncResults = vi.hoisted(() => vi.fn());
const mockSyncSRS = vi.hoisted(() => vi.fn());
const mockGetSyncBlockState = vi.hoisted(() => vi.fn());

vi.mock("@/components/providers/AuthProvider", () => ({
    useAuth: (): { user: { id: string } } => ({ user: { id: "test-user-123" } }),
}));

vi.mock("@/lib/sync/quizSyncManager", () => ({
    syncQuizzes: mockSyncQuizzes,
}));

vi.mock("@/lib/sync/syncManager", () => ({
    syncResults: mockSyncResults,
}));

vi.mock("@/lib/sync/srsSyncManager", () => ({
    syncSRS: mockSyncSRS,
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
        mockSyncQuizzes.mockResolvedValue({ incomplete: false });
        mockSyncResults.mockResolvedValue({ incomplete: false });
        mockSyncSRS.mockResolvedValue({ incomplete: false });
        mockGetSyncBlockState.mockResolvedValue(null);
    });

    describe("parallel sync execution", () => {
        it("calls all sync managers in parallel via Promise.allSettled", async () => {
            // Arrange: track call order
            const callOrder: string[] = [];
            mockSyncQuizzes.mockImplementation(async () => {
                callOrder.push("quizzes-start");
                await new Promise((r) => setTimeout(r, 10));
                callOrder.push("quizzes-end");
                return { incomplete: false };
            });
            mockSyncResults.mockImplementation(async () => {
                callOrder.push("results-start");
                await new Promise((r) => setTimeout(r, 10));
                callOrder.push("results-end");
                return { incomplete: false };
            });
            mockSyncSRS.mockImplementation(async () => {
                callOrder.push("srs-start");
                await new Promise((r) => setTimeout(r, 10));
                callOrder.push("srs-end");
                return { incomplete: false };
            });

            const { result } = renderHook(() => useSyncContext(), { wrapper });

            // Wait for initial sync to complete
            await waitFor(() => expect(result.current.hasInitialSyncCompleted).toBe(true));

            // Act: trigger explicit sync
            await act(async () => {
                await result.current.sync();
            });

            // Assert: all starts should come before all ends (parallel execution)
            const startIndices = [
                callOrder.indexOf("quizzes-start"),
                callOrder.indexOf("results-start"),
                callOrder.indexOf("srs-start"),
            ].filter((i) => i !== -1);
            const endIndices = [
                callOrder.indexOf("quizzes-end"),
                callOrder.indexOf("results-end"),
                callOrder.indexOf("srs-end"),
            ].filter((i) => i !== -1);

            // All starts should be before any end in parallel execution
            const maxStart = Math.max(...startIndices);
            const minEnd = Math.min(...endIndices);
            expect(maxStart).toBeLessThan(minEnd);
        });

        it("handles partial failure gracefully via Promise.allSettled", async () => {
            mockSyncQuizzes.mockRejectedValue(new Error("Network error"));
            mockSyncResults.mockResolvedValue({ incomplete: false });
            mockSyncSRS.mockResolvedValue({ incomplete: false });

            const { result } = renderHook(() => useSyncContext(), { wrapper });
            await waitFor(() => expect(result.current.hasInitialSyncCompleted).toBe(true));

            // Act
            let outcome;
            await act(async () => {
                outcome = await result.current.sync();
            });

            // Assert: should return partial status, not throw
            expect(outcome).toMatchObject({
                status: "partial",
                success: false,
                details: {
                    quizzes: true, // incomplete due to rejection
                    results: false,
                    srs: false,
                },
            });
        });

        it("returns success when all syncs complete", async () => {
            const { result } = renderHook(() => useSyncContext(), { wrapper });
            await waitFor(() => expect(result.current.hasInitialSyncCompleted).toBe(true));

            let outcome;
            await act(async () => {
                outcome = await result.current.sync();
            });

            expect(outcome).toMatchObject({
                status: "success",
                success: true,
            });
        });
    });

    describe("debounce guard", () => {
        it("prevents overlapping sync calls", async () => {
            // Arrange: make sync take 100ms
            // Use object wrapper so TypeScript can track mutation across closures
            const syncControl: { resolve: (() => void) | null } = { resolve: null };

            mockSyncQuizzes.mockImplementation((): Promise<{ incomplete: boolean }> => {
                return new Promise((resolve) => {
                    syncControl.resolve = (): void => resolve({ incomplete: false });
                });
            });
            mockSyncResults.mockResolvedValue({ incomplete: false });
            mockSyncSRS.mockResolvedValue({ incomplete: false });

            const { result } = renderHook(() => useSyncContext(), { wrapper });

            // Wait for initial sync to start
            await waitFor(() => expect(result.current.isSyncing).toBe(true));

            // Act: try to call sync while already syncing
            let secondSyncOutcome;
            await act(async () => {
                secondSyncOutcome = await result.current.sync();
            });

            // Assert: second call should be rejected
            expect(secondSyncOutcome).toMatchObject({
                status: "partial",
                success: false,
                error: "Sync in progress",
            });

            // Cleanup: complete the first sync
            syncControl.resolve?.();
            await waitFor(() => expect(result.current.isSyncing).toBe(false));
        });

        it("allows sync after previous sync completes", async () => {
            const { result } = renderHook(() => useSyncContext(), { wrapper });
            await waitFor(() => expect(result.current.hasInitialSyncCompleted).toBe(true));

            // First explicit sync
            await act(async () => {
                await result.current.sync();
            });

            // Reset call counts
            vi.clearAllMocks();
            mockSyncQuizzes.mockResolvedValue({ incomplete: false });
            mockSyncResults.mockResolvedValue({ incomplete: false });
            mockSyncSRS.mockResolvedValue({ incomplete: false });

            // Second sync should work
            let outcome;
            await act(async () => {
                outcome = await result.current.sync();
            });

            expect(outcome).toMatchObject({ status: "success", success: true });
            expect(mockSyncQuizzes).toHaveBeenCalledTimes(1);
        });
    });
});
