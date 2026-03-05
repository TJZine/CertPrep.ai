import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Mock dependencies
vi.mock("@/lib/supabase/client");
vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
}));

// Mock the sync methods to prevent actual background execution
vi.mock("@/lib/sync/quizSyncManager", () => ({
    syncQuizzes: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/sync/syncManager", () => ({
    syncResults: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/db", () => ({
    clearDatabase: vi.fn().mockResolvedValue(undefined),
}));

// Helper component to extract context values
function TestComponent(): React.ReactNode {
    const auth = useAuth();

    return (
        <div data-testid="auth-context">
            <span data-testid="is-loading">{String(auth.isLoading)}</span>
            <span data-testid="user-id">{auth.user?.id || 'no-user'}</span>
            <button onClick={() => { void auth.signOut(); }} data-testid="sign-out-btn">Sign Out</button>
        </div>
    );
}

describe("AuthProvider", () => {
    let mockSupabase: {
        auth: {
            getSession: Mock;
            onAuthStateChange: Mock;
            signOut: Mock;
        }
    };
    let mockRouter: {
        push: Mock;
    };
    let mockSubscription: {
        unsubscribe: Mock;
    };

    beforeEach(() => {
        mockSubscription = {
            unsubscribe: vi.fn(),
        };

        mockSupabase = {
            auth: {
                getSession: vi.fn(),
                onAuthStateChange: vi.fn(),
                signOut: vi.fn().mockResolvedValue({ error: null }),
            },
        };

        mockRouter = {
            push: vi.fn(),
        };

        (createClient as unknown as Mock).mockReturnValue(mockSupabase);
        (useRouter as unknown as Mock).mockReturnValue(mockRouter);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("throws error if useAuth is used outside of AuthProvider", () => {
        const suppressError = vi.spyOn(console, "error").mockImplementation(() => { });

        expect(() => render(<TestComponent />)).toThrowError(/useAuth must be used within an AuthProvider/i);

        suppressError.mockRestore();
    });

    it("renders children and provides context with loading state initially", async () => {
        mockSupabase.auth.getSession.mockImplementation(() => new Promise(() => { })); // Never resolves to keep it loading
        mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByTestId("is-loading").textContent).toBe("true");
        expect(screen.getByTestId("user-id").textContent).toBe("no-user");
    });

    it("fetches session and updates state", async () => {
        const mockSession = { user: { id: "test-user-1" } };
        mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null });
        mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId("is-loading").textContent).toBe("false");
        });

        expect(screen.getByTestId("user-id").textContent).toBe("test-user-1");
    });

    it("handles failed session fetch safely", async () => {
        mockSupabase.auth.getSession.mockRejectedValue(new Error("Network Error"));
        mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } });

        const suppressError = vi.spyOn(console, "error").mockImplementation(() => { });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId("is-loading").textContent).toBe("false");
        });

        expect(screen.getByTestId("user-id").textContent).toBe("no-user");
        expect(suppressError).toHaveBeenCalled();
        suppressError.mockRestore();
    });

    it("handles auth state change events correctly", async () => {
        mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

        type MockSession = { user: { id: string } };
        type AuthCallback = (event: string, session: MockSession | null) => void;
        let authCallback: AuthCallback | null = null;
        mockSupabase.auth.onAuthStateChange.mockImplementation((cb: AuthCallback) => {
            authCallback = cb;
            return { data: { subscription: mockSubscription } };
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId("is-loading").textContent).toBe("false");
        });

        // Simulate login event
        const newSession = { user: { id: "test-user-new" } };
        authCallback!("SIGNED_IN", newSession);

        await waitFor(() => {
            expect(screen.getByTestId("user-id").textContent).toBe("test-user-new");
        });

        // Simulate sign out event
        authCallback!("SIGNED_OUT", null);

        await waitFor(() => {
            expect(screen.getByTestId("user-id").textContent).toBe("no-user");
            // AuthProvider calls the router hook when signed out on the listener
            expect(mockRouter.push).toHaveBeenCalledWith("/login");
        });
    });

    it("cleans up subscription on unmount", () => {
        mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
        mockSupabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: mockSubscription } });

        const { unmount } = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        unmount();
        expect(mockSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    });
});
