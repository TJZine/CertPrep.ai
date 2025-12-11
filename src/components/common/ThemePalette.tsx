"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check, Monitor } from "lucide-react";
import { useTheme, type Theme, THEME_CONFIG } from "@/components/common/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";



export function ThemePalette(): React.ReactElement {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close when clicking outside
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent): void {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return (): void => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Toggle menu
    const toggleMenu = (): void => setIsOpen(!isOpen);

    // Select theme
    const handleSelect = (newTheme: Theme): void => {
        setTheme(newTheme);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleMenu}
                className={cn(
                    "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isOpen && "bg-muted text-foreground"
                )}
                aria-label="Change theme"
            >
                <Palette className="h-5 w-5" />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 5 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full z-[10000] w-72 rounded-xl border border-border bg-popover/95 p-2 shadow-lg backdrop-blur-md"
                    >
                        <div className="mb-2 px-2 py-1.5">
                            <span className="text-sm font-semibold text-foreground">Theme</span>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto pr-1">
                            <div className="space-y-1">
                                {Object.entries(THEME_CONFIG).map(([key, config]) => {
                                    if (config.hidden) return null;

                                    const themeKey = key as Theme;
                                    const isActive = theme === themeKey;

                                    return (
                                        <button
                                            key={themeKey}
                                            onClick={() => handleSelect(themeKey)}
                                            className={cn(
                                                "group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
                                                isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                                            )}
                                        >
                                            {/* Mini-UI Preview */}
                                            <div className={cn(
                                                "flex h-8 w-12 shrink-0 flex-col overflow-hidden rounded border shadow-sm",
                                                config.preview.bg
                                            )}>
                                                {/* Header Bar */}
                                                <div className={cn("h-2 w-full opacity-80", config.preview.accent)} />
                                                {/* Body Content */}
                                                <div className="flex flex-1 items-center justify-center p-1">
                                                    <div className={cn("h-1.5 w-6 rounded-full opacity-40", config.preview.accent)} />
                                                </div>
                                            </div>

                                            <span className="flex-1 text-sm font-medium">
                                                {config.label}
                                            </span>

                                            {isActive && <Check className="h-4 w-4 text-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* System Option */}
                        <div className="mt-2 border-t border-border pt-2">
                            <button
                                onClick={() => handleSelect("system")}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-lg p-2 text-sm transition-colors hover:bg-muted",
                                    theme === "system" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded border border-border bg-background">
                                    <Monitor className="h-4 w-4" />
                                </div>
                                <span className="font-medium">System Default</span>
                                {theme === "system" && <Check className="ml-auto h-4 w-4 text-primary" />}
                            </button>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ThemePalette;
