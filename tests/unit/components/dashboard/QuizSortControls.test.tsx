import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
    QuizSortControls,
    type DashboardSortOption,
} from "@/components/dashboard/QuizSortControls";

// Mock the Select component since it's a simple native select wrapper
vi.mock("@/components/ui/Select", () => ({
    Select: ({
        options,
        value,
        onChange,
        "aria-label": ariaLabel,
    }: {
        options: Array<{ value: string; label: string }>;
        value: string;
        onChange: (value: string) => void;
        "aria-label"?: string;
    }): React.JSX.Element => (
        <select
            data-testid="sort-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={ariaLabel}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    ),
}));

describe("QuizSortControls", () => {
    const defaultProps = {
        searchTerm: "",
        onSearchChange: vi.fn(),
        sortBy: "recent" as DashboardSortOption,
        onSortChange: vi.fn(),
        categories: ["all", "Insurance", "Firearms"],
        categoryFilter: "all",
        onCategoryChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders search input with correct placeholder", () => {
        render(<QuizSortControls {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText("Search quizzes...");
        expect(searchInput).toBeInTheDocument();
        expect(searchInput).toHaveAttribute(
            "aria-label",
            "Search quizzes by title or tags"
        );
    });

    it("calls onSearchChange when typing in search input", async () => {
        const onSearchChange = vi.fn();
        render(<QuizSortControls {...defaultProps} onSearchChange={onSearchChange} />);

        const searchInput = screen.getByPlaceholderText("Search quizzes...");
        await userEvent.type(searchInput, "test");

        expect(onSearchChange).toHaveBeenCalledWith("t");
        expect(onSearchChange).toHaveBeenCalledWith("e");
        expect(onSearchChange).toHaveBeenCalledWith("s");
        expect(onSearchChange).toHaveBeenCalledWith("t");
    });

    it("renders sort dropdown with correct value", () => {
        render(<QuizSortControls {...defaultProps} sortBy="title" />);

        const sortSelect = screen.getByTestId("sort-select");
        expect(sortSelect).toHaveValue("title");
    });

    it("calls onSortChange when selecting a different sort option", async () => {
        const onSortChange = vi.fn();
        render(<QuizSortControls {...defaultProps} onSortChange={onSortChange} />);

        const sortSelect = screen.getByTestId("sort-select");
        fireEvent.change(sortSelect, { target: { value: "performance" } });

        expect(onSortChange).toHaveBeenCalledWith("performance");
    });

    it("renders category tabs when more than one category", () => {
        render(<QuizSortControls {...defaultProps} />);

        expect(screen.getByRole("tablist")).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Insurance" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Firearms" })).toBeInTheDocument();
    });

    it("does not render category tabs when only 'all' category exists", () => {
        render(<QuizSortControls {...defaultProps} categories={["all"]} />);

        expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });

    it("marks the active category tab as selected", () => {
        render(<QuizSortControls {...defaultProps} categoryFilter="Insurance" />);

        const insuranceTab = screen.getByRole("tab", { name: "Insurance" });
        expect(insuranceTab).toHaveAttribute("aria-selected", "true");

        const allTab = screen.getByRole("tab", { name: "All" });
        expect(allTab).toHaveAttribute("aria-selected", "false");
    });

    it("calls onCategoryChange when clicking a category tab", async () => {
        const onCategoryChange = vi.fn();
        render(
            <QuizSortControls {...defaultProps} onCategoryChange={onCategoryChange} />
        );

        await userEvent.click(screen.getByRole("tab", { name: "Firearms" }));
        expect(onCategoryChange).toHaveBeenCalledWith("Firearms");
    });

    it("supports keyboard navigation between category tabs", async () => {
        const onCategoryChange = vi.fn();
        render(
            <QuizSortControls {...defaultProps} onCategoryChange={onCategoryChange} />
        );

        const allTab = screen.getByRole("tab", { name: "All" });
        allTab.focus();

        // Arrow right should move to next tab
        fireEvent.keyDown(allTab, { key: "ArrowRight" });
        expect(onCategoryChange).toHaveBeenCalledWith("Insurance");

        // Arrow left should wrap to last tab
        fireEvent.keyDown(allTab, { key: "ArrowLeft" });
        expect(onCategoryChange).toHaveBeenCalledWith("Firearms");

        // Home should go to first tab
        fireEvent.keyDown(allTab, { key: "Home" });
        expect(onCategoryChange).toHaveBeenCalledWith("all");

        // End should go to last tab
        fireEvent.keyDown(allTab, { key: "End" });
        expect(onCategoryChange).toHaveBeenCalledWith("Firearms");
    });
});
