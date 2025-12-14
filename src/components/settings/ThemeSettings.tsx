"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTheme, THEME_CONFIG, type Theme } from "@/components/common/ThemeProvider";
import { cn } from "@/lib/utils";
import { Sun, Check } from "lucide-react"; // Only need Sun for the header icon, and Check for selection

export function ThemeSettings(): React.ReactElement {
    const { theme, setTheme, comfortMode, setComfortMode } = useTheme();

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
                    {Object.entries(THEME_CONFIG).map(([key, t]) => {
                        // We want to show System in settings even if hidden elsewhere, or we can respect hidden?
                        // The previous code showed System. The new config says hidden: true.
                        // Let's decide to SHOW generic hidden items unless specifically excluded, OR better:
                        // Just show everything for now, or filter if strictly needed.
                        // Actually, 'system' is useful here. 'hidden' logic was for the Palette likely (which had a separate button).
                        // I will show ALL themes here for now, as Settings usually exposes all options.

                        const themeKey = key as Theme;

                        return (
                            <button
                                key={themeKey}
                                type="button"
                                onClick={() => setTheme(themeKey)}
                                className={cn(
                                    "group relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all",
                                    "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    theme === themeKey
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:bg-muted/50"
                                )}
                                aria-pressed={theme === themeKey}
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
                                            <span className="font-medium text-foreground">{t.label}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{t.description}</p>
                                    </div>
                                </div>

                                {/* Selected checkmark */}
                                {theme === themeKey && (
                                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <Check className="h-3 w-3" aria-hidden="true" />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Comfort Mode Toggle */}
                <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                    <div>
                        <h4 className="font-medium text-foreground">Comfort Mode</h4>
                        <p className="text-sm text-muted-foreground">
                            Reduces eye strain by softening animations, glows, and harsh contrasts
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={comfortMode}
                        onClick={() => setComfortMode(!comfortMode)}
                        className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            comfortMode ? "bg-primary" : "bg-muted"
                        )}
                    >
                        <span className="sr-only">Enable Comfort Mode</span>
                        <span
                            aria-hidden="true"
                            className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform",
                                comfortMode ? "translate-x-5" : "translate-x-0"
                            )}
                        />
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}

export default ThemeSettings;
