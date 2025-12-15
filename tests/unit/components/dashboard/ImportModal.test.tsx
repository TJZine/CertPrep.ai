
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ImportModal } from "@/components/dashboard/ImportModal";
import * as dbQuizzes from "@/db/quizzes";
import type { Quiz } from "@/types/quiz";

// Mock dependencies
vi.mock("@/db/quizzes", () => ({
    createQuiz: vi.fn(),
}));

// Mock Toast
const mockAddToast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
    useToast: (): { addToast: typeof mockAddToast } => ({
        addToast: mockAddToast,
    }),
}));

// Mock UI components that might interfere with testing or aren't the focus
vi.mock("@/components/ui/Modal", () => ({
    Modal: ({ children, title, footer, isOpen }: { children: React.ReactNode; title: string; footer: React.ReactNode; isOpen: boolean }): React.ReactNode | null =>
        isOpen ? (
            <div role="dialog" aria-label={title}>
                <h2>{title}</h2>
                {children}
                <footer>{footer}</footer>
            </div>
        ) : null,
}));

describe("ImportModal", () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onImportSuccess: vi.fn(),
        userId: "test-user-id",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("renders correctly when open", () => {
        render(<ImportModal {...defaultProps} />);
        expect(screen.getByRole("dialog", { name: "Import Quiz" })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/My Certification Quiz/)).toBeInTheDocument();
    });

    it("does not render when closed", () => {
        render(<ImportModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("validates valid JSON input", async () => {
        render(<ImportModal {...defaultProps} />);

        const validQuiz = {
            title: "Valid Quiz",
            questions: [
                {
                    id: "1",
                    question: "Q1",
                    options: { A: "Opt 1", B: "Opt 2" },
                    correct_answer: "A",
                    explanation: "Exp",
                    category: "Test Cat"
                }
            ]
        };

        const input = screen.getByPlaceholderText(/My Certification Quiz/);
        fireEvent.change(input, { target: { value: JSON.stringify(validQuiz) } });

        // Fast-forward debounce
        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        expect(screen.getByText("Validation passed")).toBeInTheDocument();

        const importButton = screen.getByRole("button", { name: "Import Quiz" });
        expect(importButton).not.toBeDisabled();
    });

    it("shows error for invalid JSON", async () => {
        render(<ImportModal {...defaultProps} />);

        const input = screen.getByPlaceholderText(/My Certification Quiz/);
        fireEvent.change(input, { target: { value: "{ invalid json" } });

        // Fast-forward debounce
        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        expect(screen.getByText("Invalid JSON")).toBeInTheDocument();

        const importButton = screen.getByRole("button", { name: "Import Quiz" });
        expect(importButton).toBeDisabled();
    });

    it("handles successful import", async () => {
        const mockCreatedQuiz = { id: "new-quiz-id", title: "Valid Quiz" };
        vi.mocked(dbQuizzes.createQuiz).mockResolvedValue(mockCreatedQuiz as unknown as Quiz);

        render(<ImportModal {...defaultProps} />);

        const validQuiz = {
            title: "Valid Quiz",
            questions: [
                {
                    id: "1",
                    question: "Q1",
                    options: { A: "Opt 1", B: "Opt 2" },
                    correct_answer: "A",
                    explanation: "Exp",
                    category: "Test Cat"
                }
            ]
        };

        const input = screen.getByPlaceholderText(/My Certification Quiz/);
        fireEvent.change(input, { target: { value: JSON.stringify(validQuiz) } });

        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        expect(screen.getByText("Validation passed")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Import Quiz" }));

        // Process microtasks
        await act(async () => {
            await Promise.resolve(); // Flush microtasks
        });

        expect(dbQuizzes.createQuiz).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Valid Quiz" }),
            expect.objectContaining({ userId: "test-user-id" })
        );

        expect(defaultProps.onImportSuccess).toHaveBeenCalledWith(mockCreatedQuiz as unknown as Quiz);
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("handles import errors", async () => {
        vi.mocked(dbQuizzes.createQuiz).mockRejectedValue(new Error("DB Error"));

        render(<ImportModal {...defaultProps} />);

        const validQuiz = {
            title: "Valid Quiz",
            questions: [{ id: "1", question: "Q", options: { A: "1", B: "2" }, correct_answer: "A", explanation: "E", category: "Test Cat" }]
        };

        const input = screen.getByPlaceholderText(/My Certification Quiz/);
        fireEvent.change(input, { target: { value: JSON.stringify(validQuiz) } });

        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        expect(screen.getByRole("button", { name: "Import Quiz" })).not.toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: "Import Quiz" }));

        await act(async () => {
            await Promise.resolve();
        });

        expect(mockAddToast).toHaveBeenCalledWith("error", "DB Error");

        expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it("pre-populates category fields from JSON if present", async () => {
        render(<ImportModal {...defaultProps} />);

        const quizWithCategory = {
            title: "Cat Quiz",
            category: "Automated Testing",
            subcategory: "Unit Tests",
            questions: [{ id: "1", question: "Q", options: { A: "1", B: "2" }, correct_answer: "A", explanation: "Exp", category: "Test Cat" }]
        };

        const input = screen.getByPlaceholderText(/My Certification Quiz/);
        fireEvent.change(input, { target: { value: JSON.stringify(quizWithCategory) } });

        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        expect(screen.getByText("Validation passed")).toBeInTheDocument();

        expect(screen.getByLabelText("Category")).toHaveValue("Automated Testing");
        expect(screen.getByLabelText("Subcategory")).toHaveValue("Unit Tests");
    });
});
