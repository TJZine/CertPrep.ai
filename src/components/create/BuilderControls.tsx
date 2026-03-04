"use client";

import * as React from "react";
import { BookOpen, FileText, Shuffle, FileKey } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderState, GenerationStrategy } from "@/types/create";
import { EXAM_PRESETS, type ExamPreset } from "@/data/examPresets";

interface BuilderControlsProps {
    state: BuilderState;
    onChange: (updates: Partial<BuilderState>) => void;
}

const STRATEGIES: { id: GenerationStrategy; label: string; icon: React.ElementType; desc: string }[] = [
    { id: "material", label: "Study Material", icon: BookOpen, desc: "From notes/PDFs" },
    { id: "match", label: "Match Style", icon: FileText, desc: "Like existing questions" },
    { id: "remix", label: "Remix", icon: Shuffle, desc: "Create variations" },
    { id: "convert", label: "Convert Key", icon: FileKey, desc: "From answer key" },
];

const navigateRadioByArrowKey = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    optionsListLength: number,
    currentIndex: number,
    onNavigate: (nextIndex: number) => void
): void => {
    let nextIndex = currentIndex !== -1 ? currentIndex : 0;

    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (nextIndex + 1) % optionsListLength;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (nextIndex - 1 + optionsListLength) % optionsListLength;
    } else {
        return;
    }

    onNavigate(nextIndex);
};

export function BuilderControls({ state, onChange }: BuilderControlsProps): React.ReactElement {
    const groupedPresets = React.useMemo(() => {
        const groups: Record<string, ExamPreset[]> = {};
        for (const preset of EXAM_PRESETS) {
            const vendor = preset.vendor;
            if (!groups[vendor]) groups[vendor] = [];
            groups[vendor].push(preset);
        }
        return groups;
    }, []);

    const presetIdsInVisualOrder = React.useMemo(() => {
        return [
            ...Object.values(groupedPresets).flatMap(group => group.map(p => p.id)),
            "custom"
        ];
    }, [groupedPresets]);

    const handleRadioKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>) => {
            const focusTargetId = e.currentTarget.getAttribute('data-preset-id');
            let currentIndex = presetIdsInVisualOrder.indexOf(focusTargetId ?? "");

            if (currentIndex === -1) {
                currentIndex = presetIdsInVisualOrder.indexOf(state.presetId ?? "");
            }

            if (currentIndex === -1) return;

            navigateRadioByArrowKey(e, presetIdsInVisualOrder.length, currentIndex, (nextIndex) => {
                const nextId = presetIdsInVisualOrder[nextIndex];
                if (nextId) {
                    onChange({ presetId: nextId });
                    const nextButton = e.currentTarget
                        .closest('[role="radiogroup"]')
                        ?.querySelector(`[data-preset-id="${nextId}"]`) as HTMLButtonElement | null;
                    nextButton?.focus();
                }
            });
        },
        [state.presetId, presetIdsInVisualOrder, onChange]
    );

    return (
        <div className="space-y-8">
            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">1. Choose Strategy</h2>
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Generation Strategy">
                    {STRATEGIES.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            role="radio"
                            aria-checked={state.strategy === s.id}
                            aria-label={s.label}
                            tabIndex={state.strategy === s.id || (!state.strategy && STRATEGIES[0] && s.id === STRATEGIES[0].id) ? 0 : -1}
                            onClick={() => onChange({ strategy: s.id })}
                            onKeyDown={(e) => {
                                const currentIndex = STRATEGIES.findIndex(strat => strat.id === (state.strategy || STRATEGIES[0]?.id));
                                navigateRadioByArrowKey(e, STRATEGIES.length, currentIndex, (nextIndex) => {
                                    const nextId = STRATEGIES[nextIndex]?.id;
                                    if (nextId) {
                                        onChange({ strategy: nextId });
                                        (e.currentTarget.parentElement?.children[nextIndex] as HTMLElement | undefined)?.focus();
                                    }
                                });
                            }}
                            className={cn(
                                "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                                state.strategy === s.id
                                    ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                    : "bg-card hover:border-primary/50"
                            )}
                        >
                            <s.icon className={cn("h-5 w-5 mb-2", state.strategy === s.id ? "text-primary" : "text-muted-foreground")} />
                            <span className="font-semibold text-sm">{s.label}</span>
                            <span className="text-xs text-muted-foreground mt-0.5">{s.desc}</span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">2. Provide Context</h2>

                {state.strategy === "material" && (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="builder-topic" className="text-sm font-medium">Topic</label>
                            <input
                                id="builder-topic"
                                type="text"
                                value={state.topic}
                                onChange={(e) => onChange({ topic: e.target.value })}
                                placeholder="e.g. React Hooks"
                                className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="builder-question-count" className="text-sm font-medium">Questions</label>
                                <input
                                    id="builder-question-count"
                                    type="number"
                                    value={state.questionCount}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        const safeVal = Number.isNaN(val) ? 10 : Math.min(Math.max(val, 1), 50);
                                        onChange({ questionCount: safeVal });
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="builder-difficulty" className="text-sm font-medium">Difficulty</label>
                                <select
                                    id="builder-difficulty"
                                    value={state.difficulty}
                                    onChange={(e) => onChange({ difficulty: e.target.value as import("@/types/create").DifficultyLevel })}
                                    className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none"
                                >
                                    <option>Mixed</option>
                                    <option>Easy</option>
                                    <option>Medium</option>
                                    <option>Hard</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="builder-material-text" className="text-sm font-medium">Paste Material</label>
                            <textarea
                                id="builder-material-text"
                                value={state.materialText}
                                onChange={(e) => onChange({ materialText: e.target.value })}
                                rows={6}
                                placeholder="Paste your notes or document text here..."
                                className="w-full p-3 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none resize-y"
                            />
                        </div>
                    </div>
                )}

                {state.strategy === "match" && (
                    <div className="space-y-1.5">
                        <label htmlFor="builder-example-questions" className="text-sm font-medium">Paste Example Questions & Answers</label>
                        <textarea
                            id="builder-example-questions"
                            value={state.exampleQuestions}
                            onChange={(e) => onChange({ exampleQuestions: e.target.value })}
                            rows={8}
                            className="w-full p-3 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none resize-y"
                        />
                    </div>
                )}

                {state.strategy === "remix" && (
                    <div className="space-y-1.5">
                        <label htmlFor="builder-remix-questions" className="text-sm font-medium">Paste Questions to Remix</label>
                        <textarea
                            id="builder-remix-questions"
                            value={state.remixQuestions}
                            onChange={(e) => onChange({ remixQuestions: e.target.value })}
                            rows={8}
                            className="w-full p-3 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none resize-y"
                        />
                    </div>
                )}

                {state.strategy === "convert" && (
                    <div className="space-y-1.5">
                        <label htmlFor="builder-answer-key" className="text-sm font-medium">Paste Answer Key</label>
                        <textarea
                            id="builder-answer-key"
                            value={state.answerKeyText}
                            onChange={(e) => onChange({ answerKeyText: e.target.value })}
                            rows={8}
                            className="w-full p-3 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none resize-y"
                        />
                    </div>
                )}
            </section>

            <section className="space-y-4 pt-4 border-t border-border/50">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">3. Exam Category Alignment (Optional)</h2>
                <div className="space-y-6">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Selecting an exam ensures the AI uses official domain names for question categories.
                    </p>
                    <div className="grid grid-cols-1 gap-6" role="radiogroup" aria-label="Exam categories">
                        {Object.entries(groupedPresets).map(([vendor, presets]) => (
                            <div key={vendor} className="space-y-3">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                    {vendor}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {presets.map((preset, index) => {
                                        const isSelected = state.presetId === preset.id;
                                        // Allow first item to be focusable if nothing is selected overall
                                        const isFirstOverall = vendor === Object.keys(groupedPresets)[0] && index === 0;

                                        return (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={isSelected}
                                                data-preset-id={preset.id}
                                                tabIndex={isSelected || (!state.presetId && isFirstOverall) ? 0 : -1}
                                                onClick={() => onChange({ presetId: state.presetId === preset.id ? null : preset.id })}
                                                onKeyDown={handleRadioKeyDown}
                                                className={cn(
                                                    "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                                                    isSelected
                                                        ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                                        : "bg-card hover:border-primary/50"
                                                )}
                                            >
                                                <span className="font-semibold text-xs leading-tight">{preset.name}</span>
                                                <span className="text-[10px] text-muted-foreground mt-1">{preset.examCode}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={state.presetId === "custom"}
                                    data-preset-id="custom"
                                    tabIndex={state.presetId === "custom" ? 0 : -1}
                                    onClick={() => onChange({ presetId: state.presetId === "custom" ? null : "custom" })}
                                    onKeyDown={handleRadioKeyDown}
                                    className={cn(
                                        "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                                        state.presetId === "custom"
                                            ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                            : "bg-card hover:border-primary/50"
                                    )}
                                >
                                    <span className="font-semibold text-xs leading-tight">Custom Categories</span>
                                    <span className="text-[10px] text-muted-foreground mt-1">Use your own domain names</span>
                                </button>
                            </div>

                            {state.presetId === "custom" && (
                                <div className="space-y-1.5">
                                    <label htmlFor="builder-custom-categories" className="text-sm font-medium">
                                        Enter your exam categories
                                    </label>
                                    <textarea
                                        id="builder-custom-categories"
                                        value={state.customCategories}
                                        onChange={(e) => onChange({ customCategories: e.target.value })}
                                        rows={5}
                                        placeholder="Domain 1: Security&#10;Domain 2: Networking&#10;Domain 3: Operations"
                                        className="w-full p-3 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none resize-y font-mono"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
