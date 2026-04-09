/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InterleavedPage from "@/app/interleaved/page";

// Mock dependencies
const {
  mockPush,
  mockAddToast,
  mockGenerate,
  mockGetCategories,
  mockGetCount,
  mockSaveState,
  mockUseAuth,
  mockUseEffectiveUserId,
} = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockAddToast: vi.fn(),
  mockGenerate: vi.fn(),
  mockGetCategories: vi.fn(),
  mockGetCount: vi.fn(),
  mockSaveState: vi.fn(),
  mockUseAuth: vi.fn((): { user: { id: string } | null } => ({
    user: { id: "user-1" },
  })),
  mockUseEffectiveUserId: vi.fn(
    (id: string | undefined): string | null => id ?? null,
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: mockUseAuth,
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: mockUseEffectiveUserId,
}));

vi.mock("@/lib/quiz/interleavedPractice", () => ({
  generateInterleavedSession: mockGenerate,
  getAvailableCategories: mockGetCategories,
  getMatchingQuestionCount: mockGetCount,
  NoQuestionsError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "NoQuestionsError";
    }
  },
}));

vi.mock("@/lib/storage/interleavedStorage", () => ({
  saveInterleavedState: mockSaveState,
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <div data-testid="arrow-left" />,
  Play: () => <div data-testid="play" />,
  Shuffle: () => <div data-testid="shuffle" />,
  Loader2: () => <div data-testid="loader" />,
}));

describe("InterleavedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCategories.mockResolvedValue(["Cat1", "Cat2"]);
    mockGetCount.mockResolvedValue(50);
    mockKeepMocksAlive();
  });

  function mockKeepMocksAlive() {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      session: null,
      isLoading: false,
      signOut: vi.fn().mockResolvedValue(undefined),
    } as any);
    mockUseEffectiveUserId.mockImplementation(
      (id: string | undefined) => id ?? null,
    );
  }

  it("renders login prompt when no user is available", () => {
    mockUseAuth.mockReturnValueOnce({ user: null } as any);
    mockUseEffectiveUserId.mockReturnValueOnce(null);

    render(<InterleavedPage />);
    expect(
      screen.getByText(/Please log in to access interleaved practice/i),
    ).toBeDefined();
  });

  it("loads and displays the page title", async () => {
    render(<InterleavedPage />);
    expect(screen.getByText("Interleaved Practice")).toBeDefined();
    await waitFor(() => {
      expect(mockGetCategories).toHaveBeenCalled();
    });
  });
});
