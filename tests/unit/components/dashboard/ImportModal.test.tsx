
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ImportModal } from "@/components/dashboard/ImportModal";
import type { Quiz } from "@/types/quiz";

// Mock dependencies using vi.hoisted to allow access inside vi.mock
const { mockCreateQuiz, mockUpdateQuiz, mockWhere, mockGet, mockEqual, mockFilter, mockFirst, mockAddToast } = vi.hoisted(() => {
    const mockFirst = vi.fn();
    const mockFilter = vi.fn().mockReturnValue({ first: mockFirst });
    const mockEqual = vi.fn().mockReturnValue({ filter: mockFilter });
    const mockWhere = vi.fn().mockReturnValue({ equals: mockEqual });
    const mockGet = vi.fn();

    return {
        mockCreateQuiz: vi.fn(),
        mockUpdateQuiz: vi.fn(),
        mockWhere,
        mockGet,
        mockEqual,
        mockFilter,
        mockFirst,
        mockAddToast: vi.fn(),
    };
});

vi.mock("@/db/quizzes", () => ({
    createQuiz: mockCreateQuiz,
    updateQuiz: mockUpdateQuiz,
}));

vi.mock("@/db", () => ({
    db: {
        quizzes: {
            where: mockWhere,
            get: mockGet,
        }
    }
}));

// Mock Toast
vi.mock("@/components/ui/Toast", () => ({
    useToast: (): { addToast: ReturnType<typeof vi.fn> } => ({
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

        // Reset DB mock to default state (no duplicates found)
        mockFirst.mockResolvedValue(null);
        // Ensure chain is wired up
        mockWhere.mockReturnValue({ equals: mockEqual });
        mockEqual.mockReturnValue({ filter: mockFilter });
        mockFilter.mockReturnValue({ first: mockFirst });
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
        const validQuiz = { title: "Valid Quiz", questions: [{ id: "1", question: "Q1", options: { A: "Opt 1", B: "Opt 2" }, correct_answer: "A", explanation: "Exp", category: "Test Cat" }] };
        const input = screen.getByPlaceholderText(/My Certification Quiz/);
        fireEvent.change(input, { target: { value: JSON.stringify(validQuiz) } });
        await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });
        expect(screen.getByText("Validation passed")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Import Quiz" })).not.toBeDisabled();
    });

    it("shows error for invalid JSON", async () => {
        render(<ImportModal {...defaultProps} />);
        const input = screen.getByPlaceholderText(/My Certification Quiz/);
        fireEvent.change(input, { target: { value: "{ invalid json" } });
        await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });
        expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Import Quiz" })).toBeDisabled();
    });

    it("handles successful import", async () => {
        const mockCreatedQuiz = { id: "new-quiz-id", title: "Valid Quiz" };
        mockCreateQuiz.mockResolvedValue(mockCreatedQuiz as unknown as Quiz);

        render(<ImportModal {...defaultProps} />);

        const validQuiz = {
            title: "Valid Quiz",
            questions: [{ id: "1", question: "Q1", options: { A: "Opt 1", B: "Opt 2" }, correct_answer: "A", explanation: "Exp", category: "Test Cat" }]
        };

        const input = screen.getByPlaceholderText(/My Certification Quiz/);
        fireEvent.change(input, { target: { value: JSON.stringify(validQuiz) } });

        await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });
        fireEvent.click(screen.getByRole("button", { name: "Import Quiz" }));
        await act(async () => { await Promise.resolve(); });

        expect(mockCreateQuiz).toHaveBeenCalledWith(expect.objectContaining({ title: "Valid Quiz" }), expect.objectContaining({ userId: "test-user-id" }));
        expect(defaultProps.onImportSuccess).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("rejects files larger than 10MB", async () => {
        render(<ImportModal {...defaultProps} />);
        fireEvent.click(screen.getByRole("tab", { name: "Upload File" }));
        const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], "large.json", { type: "application/json" });
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [largeFile] } });
        expect(mockAddToast).toHaveBeenCalledWith("error", expect.stringContaining("File too large"));
    });

    it("shows warning when processing a duplicate quiz", async () => {
        // Mock finding a duplicate
        mockFirst.mockResolvedValue({ id: "existing-id", title: "Duplicate Quiz", questions: [1, 2] });

        render(<ImportModal {...defaultProps} />);

        const duplicateQuiz = {
            title: "Duplicate Quiz",
            questions: [{ id: "1", question: "Q", options: { A: "1", B: "2" }, correct_answer: "A", explanation: "Exp", category: "Test Cat" }]
        };

        const input = screen.getByPlaceholderText(/My Certification Quiz/);
        fireEvent.change(input, { target: { value: JSON.stringify(duplicateQuiz) } });

        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        expect(screen.getByRole("button", { name: "Import Quiz" })).not.toBeDisabled();

        fireEvent.click(screen.getByRole("button", { name: "Import Quiz" }));
        await act(async () => { await Promise.resolve(); });

        expect(screen.getByText(/Quiz Already Exists/)).toBeInTheDocument();
        expect(screen.getByText(/Import as New/)).toBeInTheDocument();
        expect(screen.getByText(/Replace Existing/)).toBeInTheDocument();
    });

    it("handles 'Replace Existing' correctly", async () => {
        // 1. Setup duplicate found
        mockFirst.mockResolvedValue({ id: "existing-id", title: "Duplicate Quiz", questions: [1, 2] });
        // 2. Mock db update and get to confirm success toast
        mockUpdateQuiz.mockResolvedValue(undefined);
        mockGet.mockResolvedValue({ title: "Updated Title" });

        render(<ImportModal {...defaultProps} />);

        const duplicateQuiz = {
            title: "Duplicate Quiz",
            questions: [{ id: "1", question: "Q", options: { A: "1", B: "2" }, correct_answer: "A", category: "Cat", explanation: "Exp" }]
        };

        const input = screen.getByPlaceholderText(/My Certification Quiz/);
        fireEvent.change(input, { target: { value: JSON.stringify(duplicateQuiz) } });

        await act(async () => { vi.advanceTimersByTime(1000); await Promise.resolve(); });

        expect(screen.getByRole("button", { name: "Import Quiz" })).not.toBeDisabled();

        // Click Import -> Triggers warning
        fireEvent.click(screen.getByRole("button", { name: "Import Quiz" }));
        await act(async () => { await Promise.resolve(); });

        // Click Replace Existing
        fireEvent.click(screen.getByRole("button", { name: "Replace Existing" }));
        await act(async () => { await Promise.resolve(); });

        expect(mockUpdateQuiz).toHaveBeenCalledWith(
            "existing-id",
            "test-user-id",
            expect.objectContaining({ title: "Duplicate Quiz" })
        );
        expect(defaultProps.onClose).toHaveBeenCalled();
    });
});
