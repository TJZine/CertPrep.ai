"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTheme, type Theme } from "@/components/common/ThemeProvider";
import { cn } from "@/lib/utils";
import {
    Sun,
    Moon,
    Sparkles,
    BookOpen,
    Trees,
    Gamepad2,
    Check,
    Waves,
    Snowflake,
    Gift,
    Zap,
    Flower2,
    Leaf,
} from "lucide-react";

interface ThemeOption {
    id: Theme;
    name: string;
    description: string;
    icon: React.ElementType;
    preview: {
        bg: string;
        accent: string;
        text: string;
    };
}

const themes: ThemeOption[] = [
    {
        id: "light",
        name: "Light",
        description: "Clean and bright, easy on the eyes",
        icon: Sun,
        preview: { bg: "bg-slate-50", accent: "bg-blue-500", text: "text-slate-900" },
    },
    {
        id: "dark",
        name: "Dark",
        description: "Classic dark mode for night sessions",
        icon: Moon,
        preview: { bg: "bg-slate-900", accent: "bg-blue-500", text: "text-slate-50" },
    },
    {
        id: "midnight",
        name: "Midnight",
        description: "Cyber neon with electric cyan accents",
        icon: Sparkles,
        preview: { bg: "bg-[#0d1117]", accent: "bg-cyan-400", text: "text-cyan-100" },
    },
    {
        id: "focus",
        name: "Focus",
        description: "Warm sepia for distraction-free studying",
        icon: BookOpen,
        preview: { bg: "bg-amber-50", accent: "bg-orange-600", text: "text-amber-900" },
    },
    {
        id: "forest",
        name: "Forest",
        description: "Deep pine with calming earth tones",
        icon: Trees,
        preview: { bg: "bg-[#141f1a]", accent: "bg-green-500", text: "text-green-100" },
    },
    {
        id: "retro",
        name: "Retro",
        description: "8-bit NES style with blocky aesthetics",
        icon: Gamepad2,
        preview: { bg: "bg-gray-300", accent: "bg-pink-500", text: "text-gray-900" },
    },
    {
        id: "ocean",
        name: "Ocean",
        description: "Deep sea calm with teal waves",
        icon: Waves,
        preview: { bg: "bg-[#0d1a24]", accent: "bg-teal-400", text: "text-teal-100" },
    },
    {
        id: "nord",
        name: "Nord",
        description: "Arctic Scandinavian with aurora accents",
        icon: Snowflake,
        preview: { bg: "bg-[#2e3440]", accent: "bg-sky-300", text: "text-slate-200" },
    },
    {
        id: "holiday",
        name: "Holiday",
        description: "Festive red & green for the season",
        icon: Gift,
        preview: { bg: "bg-white", accent: "bg-red-500", text: "text-green-800" },
    },
    {
        id: "vapor",
        name: "Vapor",
        description: "Synthwave neon pink & cyan",
        icon: Zap,
        preview: { bg: "bg-[#1a0d24]", accent: "bg-pink-500", text: "text-pink-100" },
    },
    {
        id: "blossom",
        name: "Blossom",
        description: "Pastel pink for a soft aesthetic",
        icon: Flower2,
        preview: { bg: "bg-[#FFF0F5]", accent: "bg-[#E599A8]", text: "text-[#4A4A4A]" },
    },
    {
        id: "mint",
        name: "Mint",
        description: "Fresh sage for earthy vibes",
        icon: Leaf,
        preview: { bg: "bg-[#F1F8E9]", accent: "bg-[#81C784]", text: "text-[#37474F]" },
    },
];

export function ThemeSettings(): React.ReactElement {
    const { theme, setTheme } = useTheme();

    return (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sun className="h-5 w-5" />
                    Appearance
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    Choose a theme that suits your study environment
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {themes.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTheme(t.id)}
                            className={cn(
                                "group relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all",
                                "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                theme === t.id
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:bg-muted/50"
                            )}
                            aria-pressed={theme === t.id}
                        >
                            {/* Preview bar */}
                            <div className="flex w-full items-center gap-2">
                                <div
                                    className={cn(
                                        "flex h-10 w-10 items-center justify-center rounded-md",
                                        t.preview.bg
                                    )}
                                >
                                    <div className={cn("h-4 w-4 rounded-full", t.preview.accent)} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <t.icon className="h-4 w-4 text-foreground" aria-hidden="true" />
                                        <span className="font-medium text-foreground">{t.name}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{t.description}</p>
                                </div>
                            </div>

                            {/* Selected checkmark */}
                            {theme === t.id && (
                                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <Check className="h-3 w-3" aria-hidden="true" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default ThemeSettings;
