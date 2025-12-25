"use client";

import * as React from "react";
import Link from "next/link";
import {
    Sparkles,
    Wand2,
    Copy,
    Import,
    Check,
    ChevronDown,
    ExternalLink,
    BookOpen,
    FileText,
    Shuffle,
    FileKey,
    ArrowRight,
    GraduationCap,
    Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GeminiIcon } from "@/components/icons/GeminiIcon";
import { OpenAIIcon } from "@/components/icons/OpenAIIcon";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
    EXAM_PRESETS,
    generatePromptModifier,
    type ExamPreset,
} from "@/data/examPresets";

// External AI tool links
const GEMINI_GEM_URL =
    "https://gemini.google.com/gem/1Oi-QnRrxQ_7a18s9SvyKxWX4ak52nPyI";
const CHATGPT_GPT_URL =
    "https://chatgpt.com/g/g-6948d766074c8191a09e7a8c723bf9b7-certprep-ai-test-creator";

// Template content from docs
const TEMPLATES = {
    material: {
        title: "Generate from Study Material",
        description: "Turn your notes, PDFs, or course content into practice questions",
        icon: BookOpen,
        template: `Create [NUMBER] questions about [TOPIC] from the following material:

[PASTE YOUR MATERIAL HERE]

Requirements:
- Difficulty mix: [e.g., "mostly medium with some hard"]
- Focus areas: [e.g., "emphasize practical application"]
- Question types: [e.g., "scenario-based preferred"]`,
    },
    match: {
        title: "Match Example Style",
        description: "Create questions that match the style of existing exam questions",
        icon: FileText,
        template: `Here are example questions from [SOURCE] that represent the style and difficulty I want:

[PASTE EXAMPLE QUESTIONS WITH ANSWERS]

Create [NUMBER] NEW questions in the same style covering:
- [Topic 1]
- [Topic 2]
- [Topic 3]

Match the tone, difficulty, and question structure exactly.`,
    },
    remix: {
        title: "Remix Existing Questions",
        description: "Create variations of questions for additional practice",
        icon: Shuffle,
        template: `Remix these questions to create variations for additional practice:

[PASTE QUESTIONS TO REMIX]

For each question, create [NUMBER] variations that:
- Test the same concept
- Use different scenarios/contexts
- Maintain similar difficulty`,
    },
    convert: {
        title: "Convert Answer Key",
        description: "Transform a simple answer key into full quiz format",
        icon: FileKey,
        template: `Convert this answer key into full CertPrep.ai format questions:

[PASTE QUESTIONS]
[PASTE ANSWER KEY]

Add:
- Detailed explanations for each correct answer
- Distractor logic explaining why wrong answers are wrong
- Appropriate difficulty ratings
- Logical categories`,
    },
};

const SCHEMA_FIELDS = [
    { field: "title", required: true, notes: "Max 100 characters" },
    { field: "description", required: true, notes: "Max 500 characters" },
    { field: "category", required: false, notes: 'Parent grouping (e.g., "Cloud Computing")' },
    { field: "subcategory", required: false, notes: 'Specific certification (e.g., "AWS Solutions Architect")' },
    { field: "questions", required: true, notes: "Array of question objects" },
    { field: "tags", required: false, notes: "Array of searchable keywords" },
];

const TIPS = [
    {
        question: "The AI wrapped my JSON in code blocks",
        answer:
            "Remove the ```json and ``` markers from the beginning and end. CertPrep.ai expects raw JSON starting with { and ending with }.",
    },
    {
        question: "My import is failing validation",
        answer:
            "Check that all required fields are present: title, description, and questions array. Each question needs id, question, options (A/B/C/D), and correct_answer.",
    },
    {
        question: "How do I add more questions to an existing quiz?",
        answer:
            "Generate new questions, then combine them with your existing quiz's questions array before re-importing. You can also use the remix approach to create variations.",
    },
    {
        question: "Can I use my own question categories?",
        answer:
            "Yes! The category field on each question can be any string. Use consistent naming for better analytics grouping in the Topic Heatmap.",
    },
];

function CopyButton({ text }: { text: string }): React.ReactElement {
    const { copied, copyToClipboard } = useCopyToClipboard();

    return (
        <button
            type="button"
            onClick={() => copyToClipboard(text)}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                "bg-primary/10 text-primary hover:bg-primary/20",
                copied && "bg-success/10 text-success"
            )}
            aria-label={copied ? "Copied!" : "Copy template"}
        >
            {copied ? (
                <>
                    <Check className="h-4 w-4" />
                    Copied!
                </>
            ) : (
                <>
                    <Copy className="h-4 w-4" />
                    Copy
                </>
            )}
        </button>
    );
}

function StepCard({
    number,
    icon: Icon,
    title,
    description,
    delay,
}: {
    number: number;
    icon: React.ElementType;
    title: string;
    description: string;
    delay: number;
}): React.ReactElement {
    return (
        <Card
            hoverable
            className="relative text-center animate-in fade-in slide-in-from-bottom-4 border-primary/10 bg-card/50 backdrop-blur-sm"
            style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
        >
            <CardContent className="pt-8 pb-8">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <span className="text-xl font-bold font-heading">{number}</span>
                </div>
                <div className="mb-3 flex items-center justify-center gap-2">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </CardContent>
        </Card>
    );
}

function Collapsible({
    title,
    children,
    defaultOpen = false,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}): React.ReactElement {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    return (
        <div className="rounded-lg border border-border">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors"
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <ChevronDown
                    className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                />
            </button>
            <div
                className={cn(
                    "overflow-hidden transition-all duration-200",
                    isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <div className="border-t border-border p-4">{children}</div>
            </div>
        </div>
    );
}

/** Helps users align AI-generated categories with official exam blueprints */
function ExamAlignmentSection({
    selectedPreset,
    onPresetChange,
    customCategories,
    onCustomCategoriesChange,
    categories,
}: {
    selectedPreset: string | null;
    onPresetChange: (preset: string | null) => void;
    customCategories: string;
    onCustomCategoriesChange: (categories: string) => void;
    categories: string[];
}): React.ReactElement {
    const { copied, copyToClipboard } = useCopyToClipboard();

    const promptModifier = generatePromptModifier(categories);

    // Group presets by vendor for better organization
    const groupedPresets = React.useMemo(() => {
        const groups: Record<string, ExamPreset[]> = {};
        for (const preset of EXAM_PRESETS) {
            const vendor = preset.vendor;
            if (!groups[vendor]) groups[vendor] = [];
            groups[vendor].push(preset);
        }
        return groups;
    }, []);

    // Arrow key navigation for radiogroup (WAI-ARIA pattern)
    const handleRadioKeyDown = React.useCallback(
        (e: React.KeyboardEvent<HTMLButtonElement>, presetIds: string[]) => {
            const currentIndex = presetIds.indexOf(selectedPreset ?? "");
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
                onPresetChange(nextId);
                // Focus the next radio button
                const nextButton = e.currentTarget
                    .closest('[role="radiogroup"]')
                    ?.querySelector(`[data-preset-id="${nextId}"]`) as HTMLButtonElement | null;
                nextButton?.focus();
            }
        },
        [selectedPreset, onPresetChange]
    );

    return (
        <section className="mb-16">
            <Collapsible title="🎯 Align with Your Exam">
                <div className="space-y-6">
                    {/* Explanation */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                        <div className="text-sm text-muted-foreground">
                            <p className="font-semibold text-foreground mb-1">
                                Why categories matter
                            </p>
                            <p className="leading-relaxed">
                                Using consistent category names that match your exam&apos;s official domains
                                improves your Topic Heatmap analytics and helps identify weak areas.
                                Select your exam below to generate a prompt modifier.
                            </p>
                        </div>
                    </div>

                    {/* Preset Selection */}
                    <div className="space-y-4">
                        <label className="text-sm font-semibold">Select your certification exam:</label>
                        <div className="grid grid-cols-1 gap-6">
                            {Object.entries(groupedPresets).map(([vendor, presets]) => (
                                <div key={vendor} className="space-y-3">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                        {vendor}
                                    </p>
                                    <div
                                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
                                        role="radiogroup"
                                        aria-label={`${vendor} certification exams`}
                                    >
                                        {presets.map((preset) => (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={selectedPreset === preset.id}
                                                data-preset-id={preset.id}
                                                tabIndex={selectedPreset === preset.id ? 0 : -1}
                                                onClick={() => onPresetChange(preset.id)}
                                                onKeyDown={(e) => handleRadioKeyDown(e, presets.map(p => p.id))}
                                                className={cn(
                                                    "relative flex flex-col items-start p-3 rounded-xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/50",
                                                    selectedPreset === preset.id
                                                        ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                                        : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 w-full mb-1">
                                                    <GraduationCap className={cn(
                                                        "h-4 w-4",
                                                        selectedPreset === preset.id ? "text-primary" : "text-muted-foreground"
                                                    )} aria-hidden="true" />
                                                    <span className={cn(
                                                        "text-sm font-semibold",
                                                        selectedPreset === preset.id ? "text-primary" : "text-foreground"
                                                    )}>{preset.name}</span>
                                                </div>
                                                {preset.examCode && (
                                                    <Badge variant="secondary" className="text-[10px] h-5 opacity-80">
                                                        {preset.examCode}
                                                    </Badge>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {/* Custom option */}
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                                    Other
                                </p>
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={selectedPreset === "custom"}
                                    onClick={() => onPresetChange("custom")}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border transition-all w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-primary/50",
                                        selectedPreset === "custom"
                                            ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                            : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
                                    )}
                                >
                                    <FileText className={cn(
                                        "h-4 w-4",
                                        selectedPreset === "custom" ? "text-primary" : "text-muted-foreground"
                                    )} aria-hidden="true" />
                                    <span className={cn(
                                        "text-sm font-medium",
                                        selectedPreset === "custom" ? "text-primary" : "text-foreground"
                                    )}>Custom (enter your own)</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Custom input area */}
                    {selectedPreset === "custom" && (
                        <div className="space-y-2">
                            <label htmlFor="custom-categories" className="text-sm font-medium">
                                Enter your exam categories (one per line):
                            </label>
                            <textarea
                                id="custom-categories"
                                value={customCategories}
                                onChange={(e) => onCustomCategoriesChange(e.target.value)}
                                placeholder="Domain 1: Security&#10;Domain 2: Networking&#10;Domain 3: Implementation"
                                rows={5}
                                className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-mono placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    )}

                    {/* Selected preset details */}
                    {selectedPreset && selectedPreset !== "custom" && ((): React.ReactNode => {
                        const preset = EXAM_PRESETS.find((p) => p.id === selectedPreset);
                        if (!preset) return null;
                        return (
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Official domains for {preset.name}:</p>
                                <div className="flex flex-wrap gap-2">
                                    {preset.domains.map((domain) => (
                                        <Badge key={domain.name} variant="outline" className="font-mono text-xs">
                                            {domain.name}
                                            {domain.weight && (
                                                <span className="ml-1.5 text-[10px] text-muted-foreground/70 font-normal">
                                                    {domain.weight}%
                                                </span>
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                                {preset.sourceUrl && (
                                    <p className="text-xs text-muted-foreground">
                                        Source:{" "}
                                        <a
                                            href={preset.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                        >
                                            Official exam guide
                                        </a>
                                    </p>
                                )}
                            </div>
                        );
                    })()}

                    {/* Generated prompt modifier */}
                    {categories.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">Copy this into your AI prompt:</p>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(promptModifier)}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                                        "bg-primary/10 text-primary hover:bg-primary/20",
                                        copied && "bg-success/10 text-success"
                                    )}
                                    aria-label={copied ? "Copied!" : "Copy prompt modifier"}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            Copy
                                        </>
                                    )}
                                </button>
                            </div>
                            <pre className="overflow-x-auto rounded-lg border-l-4 border-primary bg-card p-4 text-sm font-mono whitespace-pre-wrap break-words">
                                {promptModifier}
                            </pre>
                        </div>
                    )}
                </div>
            </Collapsible>
        </section>
    );
}

export function CreateGuideContent(): React.ReactElement {
    const [activeTab, setActiveTab] = React.useState<keyof typeof TEMPLATES>("material");
    const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);
    const [customCategories, setCustomCategories] = React.useState("");
    const { copied: promptCopied, copyToClipboard: copyPromptToClipboard } = useCopyToClipboard();

    // Get categories from selected preset or custom input
    const categories = React.useMemo(() => {
        if (selectedPreset === "custom") {
            return customCategories
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
        }
        if (selectedPreset) {
            const preset = EXAM_PRESETS.find((p) => p.id === selectedPreset);
            return preset?.domains.map((d) => d.name) ?? [];
        }
        return [];
    }, [selectedPreset, customCategories]);

    // Generate combined prompt (template + category modifier)
    const combinedPrompt = React.useMemo(() => {
        const template = TEMPLATES[activeTab].template;
        const modifier = generatePromptModifier(categories);
        if (!modifier) return template;
        return `${template}\n\n${modifier}`;
    }, [activeTab, categories]);

    return (
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            {/* Hero Section */}
            <section className="relative text-center pb-16 pt-8 mb-16 border-b border-border/50">
                {/* Semantic background mesh/gradient */}
                <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                    <div
                        className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/10 to-accent/10 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                        style={{
                            clipPath:
                                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
                        }}
                    />
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 ring-1 ring-primary/20">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    AI-Powered Quiz Generation
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-6 tracking-tight font-heading">
                    Create Your Own <span className="text-primary">Practice Tests</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                    Turn any study material into structured practice quizzes using AI.
                    Generate, import, and start practicing in minutes.
                </p>

                {/* CTA Buttons */}
                <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-2 rounded-2xl bg-card/60 backdrop-blur-sm shadow-sm ring-1 ring-border">
                    <a
                        href={GEMINI_GEM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            buttonVariants({ size: "lg" }),
                            "w-full sm:w-auto gap-2 shadow-lg hover:shadow-primary/25 min-w-[200px]"
                        )}
                    >
                        <GeminiIcon size={20} />
                        Open Gemini Gem
                        <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </a>
                    <a
                        href={CHATGPT_GPT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            buttonVariants({ variant: "outline", size: "lg" }),
                            "w-full sm:w-auto gap-2 border-primary/20 hover:bg-primary/5 min-w-[200px]"
                        )}
                    >
                        <OpenAIIcon size={20} />
                        Open ChatGPT GPT
                        <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </a>
                </div>
            </section>

            {/* How It Works */}
            <section className="mb-20 relative">
                <h2 className="text-2xl font-bold text-center mb-10 font-heading">How It Works</h2>

                {/* Connecting line (desktop only) - Absolute positioning to prevent layout shift */}
                <div className="hidden md:block absolute top-28 left-0 w-full h-0.5 pointer-events-none -z-10" aria-hidden="true">
                    <div className="w-[70%] h-full mx-auto border-t-2 border-dashed border-border/60" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <StepCard
                        number={1}
                        icon={Wand2}
                        title="Generate"
                        description="Use our custom AI tools to create high-quality questions from your study material"
                        delay={0}
                    />
                    <StepCard
                        number={2}
                        icon={Copy}
                        title="Copy JSON"
                        description="Review the generated output and copy the raw quiz JSON code"
                        delay={150}
                    />
                    <StepCard
                        number={3}
                        icon={Import}
                        title="Import"
                        description="Paste into CertPrep.ai's import dialog and start practicing instantly"
                        delay={300}
                    />
                </div>
            </section>

            {/* Choose Your Approach */}
            <section className="mb-16">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2 font-heading">
                        Choose Your Approach
                    </h2>
                    <p className="text-muted-foreground">
                        Select the method that best fits your source material
                    </p>
                </div>

                {/* Tab Navigation - Modern Segmented Control */}
                <div className="flex justify-center mb-8">
                    <div
                        className="inline-flex p-1.5 rounded-xl bg-muted/60 backdrop-blur-sm border border-border/50"
                        role="tablist"
                        aria-label="Quiz generation approaches"
                    >
                        {Object.entries(TEMPLATES).map(([key, value]) => {
                            const Icon = value.icon;
                            const isActive = activeTab === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls={`panel-${key}`}
                                    onClick={() => setActiveTab(key as keyof typeof TEMPLATES)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                                        isActive
                                            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                                    <span className="hidden sm:inline">{value.title}</span>
                                    <span className="sm:hidden">{value.title.split(" ")[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                {Object.entries(TEMPLATES).map(([key, value]) => {
                    const Icon = value.icon;
                    return (
                        <div
                            key={key}
                            id={`panel-${key}`}
                            role="tabpanel"
                            aria-labelledby={key}
                            className={cn(activeTab !== key && "hidden")}
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                                        {value.title}
                                    </CardTitle>
                                    <p className="text-muted-foreground">{value.description}</p>
                                </CardHeader>
                                <CardContent>
                                    <div className="relative">
                                        <pre className="overflow-x-auto rounded-lg border-l-4 border-primary bg-card p-4 text-sm font-mono whitespace-pre-wrap break-words">
                                            {value.template}
                                        </pre>
                                        <div className="absolute top-2 right-2">
                                            <CopyButton text={value.template} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })}

                {/* Copy Complete Prompt Button */}
                <div className="mt-8 flex flex-col items-center gap-4">
                    <button
                        type="button"
                        onClick={() => copyPromptToClipboard(combinedPrompt)}
                        className={cn(
                            buttonVariants({ size: "lg" }),
                            "gap-2 shadow-sm",
                            promptCopied && "bg-success hover:bg-success/90"
                        )}
                        aria-label={promptCopied ? "Copied complete prompt!" : "Copy complete prompt"}
                    >
                        {promptCopied ? (
                            <>
                                <Check className="h-4 w-4" />
                                Copied Complete Prompt!
                            </>
                        ) : (
                            <>
                                <Copy className="h-4 w-4" />
                                Copy Complete Prompt
                            </>
                        )}
                    </button>
                    {selectedPreset && (
                        <p className="text-xs text-muted-foreground text-center max-w-md">
                            Includes template + category alignment for{" "}
                            <span className="font-medium text-foreground">
                                {selectedPreset === "custom"
                                    ? "custom categories"
                                    : EXAM_PRESETS.find((p) => p.id === selectedPreset)?.name ?? selectedPreset}
                            </span>
                        </p>
                    )}
                </div>
            </section>

            {/* Exam Category Alignment */}
            <ExamAlignmentSection
                selectedPreset={selectedPreset}
                onPresetChange={setSelectedPreset}
                customCategories={customCategories}
                onCustomCategoriesChange={setCustomCategories}
                categories={categories}
            />

            {/* JSON Schema Reference */}
            <section className="mb-16">
                <Collapsible title="📋 JSON Schema Reference">
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Your generated quiz must include these fields to import successfully:
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="py-2 text-left font-semibold">Field</th>
                                        <th className="py-2 text-left font-semibold">Required</th>
                                        <th className="py-2 text-left font-semibold">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {SCHEMA_FIELDS.map((row) => (
                                        <tr key={row.field} className="border-b border-border/50">
                                            <td className="py-2 font-mono text-primary">{row.field}</td>
                                            <td className="py-2">
                                                {row.required ? (
                                                    <Badge variant="default">Required</Badge>
                                                ) : (
                                                    <Badge variant="secondary">Optional</Badge>
                                                )}
                                            </td>
                                            <td className="py-2 text-muted-foreground">{row.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Collapsible>
            </section>

            {/* Tips & Troubleshooting */}
            <section className="mb-16">
                <h2 className="text-2xl font-bold mb-6">Tips & Troubleshooting</h2>
                <div className="space-y-3">
                    {TIPS.map((tip, index) => (
                        <Collapsible key={index} title={tip.question}>
                            <p className="text-muted-foreground">{tip.answer}</p>
                        </Collapsible>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="text-center py-12 border-t border-border">
                <h2 className="text-2xl font-bold mb-4">Ready to Import?</h2>
                <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                    Once you&apos;ve generated your quiz JSON, head to the Dashboard and
                    click &ldquo;Import Quiz&rdquo; to add it to your library.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/"
                        className={cn(buttonVariants({ size: "lg" }), "gap-2")}
                    >
                        Go to Dashboard
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link
                        href="/library"
                        className={cn(
                            buttonVariants({ variant: "outline", size: "lg" }),
                            "gap-2"
                        )}
                    >
                        <BookOpen className="h-4 w-4" aria-hidden="true" />
                        Browse Library
                    </Link>
                </div>
            </section>
        </main>
    );
}

export default CreateGuideContent;
