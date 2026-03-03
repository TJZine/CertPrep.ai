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

    const handleRadioKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>, presetIds: string[]) => {
            const currentIndex = presetIds.indexOf(state.presetId ?? "");
            if (currentIndex === -1) return;

            let nextIndex = currentIndex;
            if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                nextIndex = (currentIndex + 1) % presetIds.length;
            } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                nextIndex = (currentIndex - 1 + presetIds.length) % presetIds.length;
            } else {
                return;
            }

            const nextId = presetIds[nextIndex];
            if (nextId) {
                onChange({ presetId: nextId });
                const nextButton = e.currentTarget
                    .closest('[role="radiogroup"]')
                    ?.querySelector(`[data-preset-id="${nextId}"]`) as HTMLButtonElement | null;
                nextButton?.focus();
            }
        },
        [state.presetId, onChange]
    );

    return (
        <div className="space-y-8">
            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">1. Choose Strategy</h2>
                <div className="grid grid-cols-2 gap-3">
                    {STRATEGIES.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => onChange({ strategy: s.id })}
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
                            <label className="text-sm font-medium">Topic</label>
                            <input
                                type="text"
                                value={state.topic}
                                onChange={(e) => onChange({ topic: e.target.value })}
                                placeholder="e.g. React Hooks"
                                className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Questions</label>
                                <input
                                    type="number"
                                    value={state.questionCount}
                                    onChange={(e) => onChange({ questionCount: parseInt(e.target.value) || 10 })}
                                    className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Difficulty</label>
                                <select
                                    value={state.difficulty}
                                    onChange={(e) => onChange({ difficulty: e.target.value })}
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
                            <label className="text-sm font-medium">Paste Material</label>
                            <textarea
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
                        <label className="text-sm font-medium">Paste Example Questions & Answers</label>
                        <textarea
                            value={state.exampleQuestions}
                            onChange={(e) => onChange({ exampleQuestions: e.target.value })}
                            rows={8}
                            className="w-full p-3 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none resize-y"
                        />
                    </div>
                )}

                {state.strategy === "remix" && (
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Paste Questions to Remix</label>
                        <textarea
                            value={state.remixQuestions}
                            onChange={(e) => onChange({ remixQuestions: e.target.value })}
                            rows={8}
                            className="w-full p-3 rounded-lg border bg-card text-sm focus:ring-1 focus:ring-primary outline-none resize-y"
                        />
                    </div>
                )}

                {state.strategy === "convert" && (
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Paste Answer Key</label>
                        <textarea
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
                    <div className="grid grid-cols-1 gap-6">
                        {Object.entries(groupedPresets).map(([vendor, presets]) => (
                            <div key={vendor} className="space-y-3">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                    {vendor}
                                </p>
                                <div
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                    role="radiogroup"
                                    aria-label={`${vendor} certification exams`}
                                >
                                    {presets.map((preset) => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={state.presetId === preset.id}
                                            data-preset-id={preset.id}
                                            tabIndex={state.presetId === preset.id ? 0 : -1}
                                            onClick={() => onChange({ presetId: state.presetId === preset.id ? null : preset.id })}
                                            onKeyDown={(e) => handleRadioKeyDown(e, presets.map(p => p.id))}
                                            className={cn(
                                                "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                                                state.presetId === preset.id
                                                    ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                                    : "bg-card hover:border-primary/50"
                                            )}
                                        >
                                            <span className="font-semibold text-xs leading-tight">{preset.name}</span>
                                            <span className="text-[10px] text-muted-foreground mt-1">{preset.examCode}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
