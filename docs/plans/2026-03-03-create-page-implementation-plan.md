# Create Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the `/create` route into a premium, interactive "Prompt Builder" experience with a 35/65 split-panel layout, completely replacing the static guide.

**Architecture:** We will create a new parent layout component `CreateBuilder` that manages the state for the prompt generation. It will render a left control panel `BuilderControls` and a right output panel `PromptOutput`. The existing `CreateGuideContent` logic will be extracted and heavily refactored into these specialized components.

**Tech Stack:** React 19, Next.js App Router, Tailwind CSS, Framer Motion, `lucide-react`

---

### Task 1: Create the Types and State Definitions

**Files:**

- Create: `src/types/create.ts`

**Step 1: Write the minimal implementation**

```typescript
// src/types/create.ts
export type GenerationStrategy = "material" | "match" | "remix" | "convert";

export interface BuilderState {
  strategy: GenerationStrategy;
  topic: string;
  questionCount: number;
  difficulty: string;
  focusAreas: string;
  presetId: string | null;
  customCategories: string;
  materialText: string;
  exampleQuestions: string;
  remixQuestions: string;
  answerKeyText: string;
}

export const INITIAL_BUILDER_STATE: BuilderState = {
  strategy: "material",
  topic: "",
  questionCount: 10,
  difficulty: "Mixed",
  focusAreas: "",
  presetId: null,
  customCategories: "",
  materialText: "",
  exampleQuestions: "",
  remixQuestions: "",
  answerKeyText: "",
};
```

**Step 2: Commit**

```bash
git add src/types/create.ts
git commit -m "feat: add builder state types"
```

---

### Task 2: Create the Prompt Generator Utility

**Files:**

- Create: `src/lib/create/promptGenerator.ts`
- Create: `src/lib/create/promptGenerator.test.ts`
- Modify: `src/data/examPresets.ts` (Ensure export is available if needed, no changes to logic)

**Step 1: Write the failing test**

```typescript
// src/lib/create/promptGenerator.test.ts
import { describe, it, expect } from "vitest";
import { generatePrompt } from "./promptGenerator";
import { INITIAL_BUILDER_STATE } from "@/types/create";

describe("promptGenerator", () => {
  it("generates a material prompt correctly", () => {
    const state = {
      ...INITIAL_BUILDER_STATE,
      strategy: "material" as const,
      topic: "AWS S3",
      questionCount: 5,
      difficulty: "Hard",
      materialText: "S3 is a storage service.",
    };
    const prompt = generatePrompt(state, []);
    expect(prompt).toContain("Create 5 questions about AWS S3");
    expect(prompt).toContain("S3 is a storage service.");
    expect(prompt).toContain("Hard");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/create/promptGenerator.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```typescript
// src/lib/create/promptGenerator.ts
import type { BuilderState } from "@/types/create";
import { generatePromptModifier } from "@/data/examPresets";

export function generatePrompt(
  state: BuilderState,
  categories: string[],
): string {
  let base = "";

  switch (state.strategy) {
    case "material":
      base = `Create ${state.questionCount || 10} questions about ${state.topic || "[TOPIC]"} from the following material:\n\n${state.materialText || "[PASTE YOUR MATERIAL HERE]"}\n\nRequirements:\n- Difficulty mix: ${state.difficulty || "Mixed"}\n- Focus areas: ${state.focusAreas || "None specified"}`;
      break;
    case "match":
      base = `Here are example questions that represent the style and difficulty I want:\n\n${state.exampleQuestions || "[PASTE EXAMPLE QUESTIONS WITH ANSWERS]"}\n\nCreate ${state.questionCount || 10} NEW questions in the same style covering the specified topics.\nMatch the tone, difficulty, and question structure exactly.`;
      break;
    case "remix":
      base = `Remix these questions to create variations for additional practice:\n\n${state.remixQuestions || "[PASTE QUESTIONS TO REMIX]"}\n\nFor each question, create variations that test the same concept but use different scenarios.`;
      break;
    case "convert":
      base = `Convert this answer key into full CertPrep.ai format questions:\n\n${state.answerKeyText || "[PASTE ANSWER KEY]"}\n\nAdd detailed explanations for each correct answer and distractor logic.`;
      break;
  }

  const jsonSchema = `
OUTPUT FORMAT REQUIREMENT:
You must output ONLY valid, raw JSON. Do not wrap the JSON in markdown blocks (e.g., \`\`\`json). The JSON must match this structure exactly:
{
  "title": "Quiz Title (Max 100 chars)",
  "description": "Quiz Description (Max 500 chars)",
  "category": "Parent grouping",
  "subcategory": "Specific topic",
  "tags": ["tag1", "tag2"],
  "questions": [
    {
      "id": "q1",
      "question": "The question text?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "correct_answer": "A",
      "explanation": "Why this is correct.",
      "distractor_logic": "Why others are wrong.",
      "category": "Domain name",
      "difficulty": "Medium"
    }
  ]
}`;

  const modifier = generatePromptModifier(categories);
  const parts = [base, modifier, jsonSchema].filter(Boolean);
  return parts.join("\n\n");
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/lib/create/promptGenerator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/create/promptGenerator.ts src/lib/create/promptGenerator.test.ts
git commit -m "feat: add prompt generator utility"
```

---

### Task 3: Create the Output Panel Component

**Files:**

- Create: `src/components/create/PromptOutput.tsx`

**Step 1: Write minimal implementation**

```tsx
// src/components/create/PromptOutput.tsx
"use client";

import * as React from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { GeminiIcon } from "@/components/icons/GeminiIcon";
import { OpenAIIcon } from "@/components/icons/OpenAIIcon";

interface PromptOutputProps {
  prompt: string;
}

const GEMINI_URL =
  "https://gemini.google.com/gem/1Oi-QnRrxQ_7a18s9SvyKxWX4ak52nPyI";
const CHATGPT_URL =
  "https://chatgpt.com/g/g-6948d766074c8191a09e7a8c723bf9b7-certprep-ai-test-creator";

export function PromptOutput({
  prompt,
}: PromptOutputProps): React.ReactElement {
  const { copied, copyToClipboard } = useCopyToClipboard();

  return (
    <div className="flex flex-col h-full rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <span className="text-sm font-semibold">Generated Prompt</span>
        <button
          onClick={() => copyToClipboard(prompt)}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            copied
              ? "bg-success/10 text-success"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy Prompt"}
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto min-h-[400px]">
        <pre className="font-mono text-sm whitespace-pre-wrap break-words text-muted-foreground">
          {prompt || "Adjust settings on the left to generate your prompt..."}
        </pre>
      </div>

      <div className="p-4 border-t bg-muted/10">
        <p className="text-xs text-muted-foreground mb-3 text-center">
          Open your preferred AI to generate
        </p>
        <div className="grid grid-cols-2 gap-3">
          <a
            href={GEMINI_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-sm font-medium"
          >
            <GeminiIcon size={16} /> Gemini{" "}
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
          <a
            href={CHATGPT_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-sm font-medium"
          >
            <OpenAIIcon size={16} /> ChatGPT{" "}
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/create/PromptOutput.tsx
git commit -m "feat: add prompt output panel"
```

---

### Task 4: Create the Controls Panel Component

**Files:**

- Create: `src/components/create/BuilderControls.tsx`

**Step 1: Write minimal implementation**

```tsx
// src/components/create/BuilderControls.tsx
"use client";

import * as React from "react";
import { BookOpen, FileText, Shuffle, FileKey } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuilderState, GenerationStrategy } from "@/types/create";

interface BuilderControlsProps {
  state: BuilderState;
  onChange: (updates: Partial<BuilderState>) => void;
}

const STRATEGIES: {
  id: GenerationStrategy;
  label: string;
  icon: React.FC<any>;
  desc: string;
}[] = [
  {
    id: "material",
    label: "Study Material",
    icon: BookOpen,
    desc: "From notes/PDFs",
  },
  {
    id: "match",
    label: "Match Style",
    icon: FileText,
    desc: "Like existing questions",
  },
  { id: "remix", label: "Remix", icon: Shuffle, desc: "Create variations" },
  {
    id: "convert",
    label: "Convert Key",
    icon: FileKey,
    desc: "From answer key",
  },
];

export function BuilderControls({
  state,
  onChange,
}: BuilderControlsProps): React.ReactElement {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          1. Choose Strategy
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => onChange({ strategy: s.id })}
              className={cn(
                "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                state.strategy === s.id
                  ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                  : "bg-card hover:border-primary/50",
              )}
            >
              <s.icon
                className={cn(
                  "h-5 w-5 mb-2",
                  state.strategy === s.id
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />
              <span className="font-semibold text-sm">{s.label}</span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {s.desc}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          2. Provide Context
        </h2>

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
                  onChange={(e) =>
                    onChange({ questionCount: parseInt(e.target.value) || 10 })
                  }
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
            <label className="text-sm font-medium">
              Paste Example Questions & Answers
            </label>
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
            <label className="text-sm font-medium">
              Paste Questions to Remix
            </label>
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
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/create/BuilderControls.tsx
git commit -m "feat: add builder controls panel"
```

---

### Task 5: Create the Main Builder Shell

**Files:**

- Create: `src/components/create/CreateBuilder.tsx`

**Step 1: Write minimal implementation**

```tsx
// src/components/create/CreateBuilder.tsx
"use client";

import * as React from "react";
import { BuilderControls } from "./BuilderControls";
import { PromptOutput } from "./PromptOutput";
import { type BuilderState, INITIAL_BUILDER_STATE } from "@/types/create";
import { generatePrompt } from "@/lib/create/promptGenerator";

export function CreateBuilder(): React.ReactElement {
  const [state, setState] = React.useState<BuilderState>(INITIAL_BUILDER_STATE);
  const [mode, setMode] = React.useState<"ai" | "import">("ai");

  const handleStateChange = (updates: Partial<BuilderState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Derived prompt state
  const prompt = React.useMemo(() => generatePrompt(state, []), [state]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 min-h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">
            Create a Practice Test
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Design prompts to generate tests with AI.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="inline-flex bg-muted/50 p-1 rounded-xl border border-border/50">
          <button
            onClick={() => setMode("ai")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === "ai" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            AI Generator
          </button>
          {/* The Import logic is already handled globally or via /import route usually, but keeping tab for future */}
          <button
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
        <div className="py-20 text-center border mt-8 rounded-2xl bg-card border-dashed">
          <p className="text-muted-foreground">
            Import JSON functionality to be ported here or trigger global modal.
          </p>
        </div>
      )}
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/create/CreateBuilder.tsx
git commit -m "feat: add main builder shell layout"
```

---

### Task 6: Replace the Page Content

**Files:**

- Modify: `src/app/create/page.tsx`
- Delete: `src/components/create/CreateGuideContent.tsx`

**Step 1: Write minimal implementation**

```tsx
// src/app/create/page.tsx
import * as React from "react";
import { Metadata } from "next";
import { CreateBuilder } from "@/components/create/CreateBuilder";

export const metadata: Metadata = {
  title: "Create Your Own Tests | CertPrep.ai",
  description: "Generate custom certification practice tests using AI.",
  openGraph: {
    title: "Create Your Own Tests | CertPrep.ai",
    description: "Generate custom certification practice tests using AI.",
  },
};

export default function CreatePage(): React.ReactElement {
  return <CreateBuilder />;
}
```

**Step 2: Verify application builds**

Run: `npm run typecheck && npm run lint`
Expected: PASS

**Step 3: Clean up and Commit**

```bash
git add src/app/create/page.tsx
git rm src/components/create/CreateGuideContent.tsx
git commit -m "refactor: replace old guide with interactive builder"
```
