"use client";

import * as React from "react";
import Link from "next/link";
import { BuilderControls } from "./BuilderControls";
import { PromptOutput } from "./PromptOutput";
import { type BuilderState, INITIAL_BUILDER_STATE } from "@/types/create";
import { generatePrompt } from "@/lib/create/promptGenerator";
import { EXAM_PRESETS } from "@/data/examPresets";

export function CreateBuilder(): React.ReactElement {
    const [state, setState] = React.useState<BuilderState>(INITIAL_BUILDER_STATE);
    const [mode, setMode] = React.useState<"ai" | "import">("ai");

    const handleStateChange = (updates: Partial<BuilderState>): void => {
        setState((prev) => ({ ...prev, ...updates }));
    };

    // Derived prompt state
    const categories = React.useMemo(() => {
        if (state.presetId === "custom") {
            return state.customCategories
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
        }

        if (!state.presetId) return [];
        const preset = EXAM_PRESETS.find((p) => p.id === state.presetId);
        return preset ? preset.domains.map(d => d.name) : [];
    }, [state.presetId, state.customCategories]);

    const prompt = React.useMemo(() => generatePrompt(state, categories), [state, categories]);

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 min-h-[calc(100vh-var(--header-height))]">
            {/* Header */}
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-heading">Create a Practice Test</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Design prompts to generate tests with AI.</p>
                </div>

                {/* Mode Switcher */}
                <div className="inline-flex bg-muted/50 p-1 rounded-xl border border-border/50">
                    <button
                        type="button"
                        onClick={() => setMode("ai")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === "ai" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        AI Generator
                    </button>
                    {/* The Import logic is already handled globally or via /import route usually, but keeping tab for future */}
                    <button
                        type="button"
                        onClick={() => setMode("import")}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === "import" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Import JSON
                    </button>
                </div>
            </header>

            {mode === "ai" ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Controls Panel (left ~40%) */}
                    <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-8 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-8 custom-scrollbar">
                        <BuilderControls state={state} onChange={handleStateChange} />
                    </div>

                    {/* Output Panel (right ~60%) */}
                    <div className="lg:col-span-7 xl:col-span-8 h-full min-h-[600px]">
                        <PromptOutput prompt={prompt} />
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center border mt-8 rounded-2xl bg-card border-dashed space-y-4 px-4">
                    <p className="text-muted-foreground">
                        Import is available from the dashboard import modal.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Open Dashboard Import
                    </Link>
                </div>
            )}
        </main>
    );
}
