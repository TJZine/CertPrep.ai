"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, type SelectOption } from "@/components/ui/Select";

export type DashboardSortOption =
    | "recent"
    | "added"
    | "title"
    | "performance"
    | "questions";

const SORT_OPTIONS: SelectOption[] = [
    { value: "recent", label: "Recently Attempted" },
    { value: "added", label: "Date Added" },
    { value: "title", label: "Alphabetical" },
    { value: "performance", label: "Weakest First" },
    { value: "questions", label: "Most Questions" },
];

export interface QuizSortControlsProps {
    /** Current search term */
    searchTerm: string;
    /** Handler for search input changes */
    onSearchChange: (value: string) => void;
    /** Current sort option */
    sortBy: DashboardSortOption;
    /** Handler for sort selection changes */
    onSortChange: (value: DashboardSortOption) => void;
    /** Available categories (including "all") */
    categories: string[];
    /** Current category filter */
    categoryFilter: string;
    /** Handler for category filter changes */
    onCategoryChange: (value: string) => void;
}

/**
 * Combined controls for dashboard quiz filtering and sorting.
 *
 * Includes:
 * - Search input (filters by title and tags)
 * - Sort dropdown (5 sort options)
 * - Category tabs (derived from quiz data)
 */
export function QuizSortControls({
    searchTerm,
    onSearchChange,
    sortBy,
    onSortChange,
    categories,
    categoryFilter,
    onCategoryChange,
}: QuizSortControlsProps): React.ReactElement {
    const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

    const handleTabKeyDown = (
        e: React.KeyboardEvent,
        currentIndex: number
    ): void => {
        const lastIndex = categories.length - 1;
        let nextIndex: number | null = null;

        switch (e.key) {
            case "ArrowRight":
                nextIndex = currentIndex < lastIndex ? currentIndex + 1 : 0;
                break;
            case "ArrowLeft":
                nextIndex = currentIndex > 0 ? currentIndex - 1 : lastIndex;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = lastIndex;
                break;
            default:
                return;
        }

        e.preventDefault();
        const nextCategory = categories[nextIndex];
        if (nextCategory) {
            onCategoryChange(nextCategory);
            tabRefs.current[nextIndex]?.focus();
        }
    };

    return (
        <div className="space-y-4">
            {/* Top row: Search + Sort */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Search input */}
                <div className="relative w-full sm:max-w-sm">
                    <Search
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        aria-hidden="true"
                    />
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search quizzes..."
                        className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Search quizzes by title or tags"
                    />
                </div>

                {/* Sort dropdown */}
                <Select
                    options={SORT_OPTIONS}
                    value={sortBy}
                    onChange={(value) => onSortChange(value as DashboardSortOption)}
                    className="w-full sm:w-48"
                    aria-label="Sort quizzes by"
                />
            </div>

            {/* Category tabs - only show if more than just "all" */}
            {categories.length > 1 && (
                <div
                    role="tablist"
                    className="flex gap-2 overflow-x-auto pb-1"
                    aria-label="Filter by category"
                >
                    {categories.map((category, index) => (
                        <button
                            key={category}
                            type="button"
                            ref={(el) => {
                                tabRefs.current[index] = el;
                            }}
                            role="tab"
                            aria-selected={categoryFilter === category}
                            tabIndex={categoryFilter === category ? 0 : -1}
                            onClick={() => onCategoryChange(category)}
                            onKeyDown={(e) => handleTabKeyDown(e, index)}
                            className={cn(
                                "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                categoryFilter === category
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                        >
                            {category === "all" ? "All" : category}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default QuizSortControls;
