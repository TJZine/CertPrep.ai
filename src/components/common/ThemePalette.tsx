"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check, Monitor } from "lucide-react";
import { useTheme, type Theme, THEME_CONFIG } from "@/components/common/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Mapping of themes to visual swatch colors
const THEME_SWATCHES: Record<Theme, string> = {
    system: "#94a3b8", // Slate 400
    light: "#ffffff",
    dark: "#0f172a", // Slate 900
    midnight: "#0ea5e9", // Cyan 500
    focus: "#f5f5f4", // Stone 100
    retro: "#eab308", // Yellow 500
    forest: "#22c55e", // Green 500 (Retro Dark)
    ocean: "#0ea5e9", // Sky 500
    nord: "#818cf8", // Indigo 400
    holiday: "#e11d48", // Rose 600
    vapor: "#d946ef", // Fuchsia 500
    blossom: "#f472b6", // Pink 400
    mint: "#86efac", // Green 300
};

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
                        className="absolute right-0 top-full z-50 w-64 rounded-xl border border-border bg-popover/95 p-4 shadow-lg backdrop-blur-md"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">Theme</span>
                            <span className="text-xs text-muted-foreground">Select appearance</span>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {Object.entries(THEME_CONFIG).map(([key, config]) => {
                                if (config.hidden) return null; // Skip hidden/system if desired, or handle separately

                                const themeKey = key as Theme;
                                const isActive = theme === themeKey;
                                const swatchColor = THEME_SWATCHES[themeKey];

                                return (
                                    <button
                                        key={themeKey}
                                        onClick={() => handleSelect(themeKey)}
                                        className={cn(
                                            "group relative flex h-10 w-10 items-center justify-center rounded-full border border-border transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            isActive && "ring-2 ring-primary ring-offset-2 ring-offset-popover"
                                        )}
                                        aria-label={`Select ${config.label} theme`}
                                        title={config.label}
                                    >
                                        <span
                                            className="absolute inset-0 rounded-full opacity-90"
                                            style={{ backgroundColor: swatchColor }}
                                        />

                                        {/* Visual indicator for active state (optional, ring handles it mostly) */}
                                        {isActive && (
                                            <Check className={cn(
                                                "z-10 h-4 w-4",
                                                config.isDark ? "text-white" : "text-black"
                                            )} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* System Option - Separated for utility */}
                        <div className="mt-4 border-t border-border pt-3">
                            <button
                                onClick={() => handleSelect("system")}
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                    theme === "system" ? "font-medium text-primary" : "text-muted-foreground"
                                )}
                            >
                                <Monitor className="h-4 w-4" />
                                <span>System Default</span>
                                {theme === "system" && <Check className="ml-auto h-3 w-3" />}
                            </button>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
