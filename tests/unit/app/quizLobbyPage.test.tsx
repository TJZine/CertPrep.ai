import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Quiz } from "@/types/quiz";

const { routerPush, params, useQuizWithStats, useAuth, useEffectiveUserId } =
  vi.hoisted(() => ({
    routerPush: vi.fn(),
    params: { id: "quiz-1" as string },
    useQuizWithStats: vi.fn(),
    useAuth: vi.fn(),
    useEffectiveUserId: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: (): { push: typeof routerPush } => ({ push: routerPush }),
  useParams: (): typeof params => params,
}));

vi.mock("@/hooks/useDatabase", () => ({
  useQuizWithStats,
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth,
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId,
}));

import QuizLobbyPage from "@/app/quiz/[id]/page";

describe("QuizLobbyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    params.id = "quiz-1";
    useAuth.mockReturnValue({ user: { id: "user-1" } });
    useEffectiveUserId.mockReturnValue("user-1");
  });

  it("renders the skeleton while loading", () => {
    useQuizWithStats.mockReturnValue({
      quiz: null,
      stats: null,
      isLoading: true,
    });

    render(<QuizLobbyPage />);

    expect(
      screen.getByRole("status", { name: /loading quiz details/i }),
    ).toBeInTheDocument();
  });

  it("renders empty state when quiz is missing and navigates back", async () => {
    const user = userEvent.setup();
    useQuizWithStats.mockReturnValue({
      quiz: null,
      stats: null,
      isLoading: false,
    });

    render(<QuizLobbyPage />);

    expect(screen.getByText("Quiz Not Found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /back to library/i }));
    expect(routerPush).toHaveBeenCalledWith("/");
  });

  it("renders quiz title, description, tags, and question count", () => {
    const quiz: Quiz = {
      id: "quiz-1",
      user_id: "user-1",
      title: "Networking Basics",
      description: "Learn networking.",
      created_at: 1,
      updated_at: 1,
      questions: [
        {
          id: "q1",
          category: "Networking",
          question: "What is TCP?",
          options: { a: "Protocol" },
          explanation: "Because.",
          correct_answer_hash: "hash",
        },
      ],
      tags: ["tag-a", "tag-b"],
      version: 1,
      deleted_at: null,
      quiz_hash: null,
      last_synced_at: null,
      last_synced_version: null,
    };

    useQuizWithStats.mockReturnValue({
      quiz,
      stats: null,
      isLoading: false,
    });

    render(<QuizLobbyPage />);

    expect(
      screen.getByRole("heading", { name: "Networking Basics" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Learn networking.")).toBeInTheDocument();
    expect(screen.getByText("tag-a")).toBeInTheDocument();
    expect(screen.getByText("tag-b")).toBeInTheDocument();
    expect(screen.getByText(/1 Questions/i)).toBeInTheDocument();
  });

  it("toggles remix mode and includes remix=true in navigation", async () => {
    const user = userEvent.setup();
    const quiz: Quiz = {
      id: "quiz-1",
      user_id: "user-1",
      title: "Quiz",
      description: "",
      created_at: 1,
      updated_at: 1,
      questions: [
        {
          id: "q1",
          category: "Cat",
          question: "Q",
          options: { a: "A" },
          explanation: "",
          correct_answer_hash: "hash",
        },
      ],
      tags: [],
      version: 1,
      deleted_at: null,
      quiz_hash: null,
      last_synced_at: null,
      last_synced_version: null,
    };

    useQuizWithStats.mockReturnValue({
      quiz,
      stats: null,
      isLoading: false,
    });

    render(<QuizLobbyPage />);

    const remixToggle = screen.getByRole("switch", { name: /remix mode/i });
    expect(remixToggle).toHaveAttribute("aria-checked", "false");

    await user.click(remixToggle);
    expect(remixToggle).toHaveAttribute("aria-checked", "true");

    await user.click(screen.getByRole("button", { name: /start practice/i }));
    expect(routerPush).toHaveBeenCalledWith("/quiz/quiz-1/zen?remix=true");
  });
});
