import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LibraryPage from "@/app/library/page";
import { useQuizzes, useInitializeDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { TestLibrary } from "@/components/dashboard/TestLibrary";
import type { Quiz } from "@/types/quiz";

// Mock dependencies
vi.mock("@/hooks/useDatabase", () => ({
  useQuizzes: vi.fn(),
  useInitializeDatabase: vi.fn(),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: vi.fn(),
}));

vi.mock("@/components/library/LibrarySkeleton", () => ({
  LibrarySkeleton: vi.fn(
    (): React.ReactElement => <div data-testid="library-skeleton" />,
  ),
}));

vi.mock("@/components/dashboard/TestLibrary", () => ({
  TestLibrary: vi.fn(
    (): React.ReactElement => <div data-testid="test-library" />,
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }): React.ReactElement => <a href={href}>{children}</a>,
}));

describe("LibraryPage", () => {
  const mockUserId = "user-123";

  beforeEach((): void => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: mockUserId },
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useEffectiveUserId).mockReturnValue(mockUserId);
    vi.mocked(useInitializeDatabase).mockReturnValue({
      isInitialized: true,
      error: null,
    } as unknown as ReturnType<typeof useInitializeDatabase>);
    vi.mocked(useQuizzes).mockReturnValue({
      quizzes: [] as Quiz[],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useQuizzes>);
  });

  it("renders the loading skeleton when not initialized", () => {
    vi.mocked(useInitializeDatabase).mockReturnValue({
      isInitialized: false,
      error: null,
    } as unknown as ReturnType<typeof useInitializeDatabase>);
    render(<LibraryPage />);
    expect(screen.getByTestId("library-skeleton")).toBeDefined();
  });

  it("renders the loading skeleton when quizzes are loading", () => {
    vi.mocked(useQuizzes).mockReturnValue({
      quizzes: [] as Quiz[],
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useQuizzes>);
    render(<LibraryPage />);
    expect(screen.getByTestId("library-skeleton")).toBeDefined();
  });

  it("renders error state when database initialization fails", () => {
    vi.mocked(useInitializeDatabase).mockReturnValue({
      isInitialized: true,
      error: new Error("DB Init Failed"),
    } as unknown as ReturnType<typeof useInitializeDatabase>);
    render(<LibraryPage />);
    expect(screen.getByText("Database Error")).toBeDefined();
    expect(screen.getByText("DB Init Failed")).toBeDefined();
  });

  it("renders the test library when data is loaded", () => {
    const mockQuizzes = [{ id: "q1", title: "Test Quiz" }] as Quiz[];
    vi.mocked(useQuizzes).mockReturnValue({
      quizzes: mockQuizzes,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useQuizzes>);

    render(<LibraryPage />);

    expect(screen.getByText("Test Library")).toBeDefined();
    expect(screen.getByTestId("test-library")).toBeDefined();

    // Inspect call arguments manually for robustness
    const call = vi.mocked(TestLibrary).mock.calls[0];
    expect(call).toBeDefined();
    const props = call![0] as unknown as Record<string, unknown>;
    expect(props.existingQuizzes).toEqual(mockQuizzes);
    expect(props.userId).toBe(mockUserId);
  });

  it("handles quizzes error gracefully", () => {
    vi.mocked(useQuizzes).mockReturnValue({
      quizzes: [] as Quiz[],
      isLoading: false,
      error: new Error("Fetch Failed"),
    } as unknown as ReturnType<typeof useQuizzes>);

    render(<LibraryPage />);

    expect(screen.getByText("Database Error")).toBeDefined();
    expect(screen.getByText("Fetch Failed")).toBeDefined();
  });
});
