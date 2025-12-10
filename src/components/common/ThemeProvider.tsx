"use client";

import * as React from "react";

import {
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Trees,
  Gamepad2,
  Snowflake,
  Gift,
  Zap,
  Flower2,
  Leaf,
  Monitor,
} from "lucide-react";

export type Theme =
  | "system"
  | "light"
  | "dark"
  | "midnight"
  | "focus"
  | "retro-dark"
  | "retro"
  | "nord"
  | "holiday"
  | "vapor"
  | "blossom"
  | "mint";

export const THEME_CONFIG: Record<
  Theme,
  {
    isDark: boolean;
    label: string;
    description: string;
    icon: React.ElementType;
    swatch: string;
    preview: { bg: string; accent: string; text: string };
    hidden?: boolean;
    isPremium?: boolean; // Premium themes have special particle effects
  }
> = {
  system: {
    isDark: false,
    label: "System",
    description: "Follows your system's color scheme",
    icon: Monitor,
    swatch: "#94a3b8",
    preview: { bg: "bg-slate-200", accent: "bg-slate-600", text: "text-slate-900" },
    hidden: true,
  },
  light: {
    isDark: false,
    label: "Light",
    description: "Clean and bright, easy on the eyes",
    icon: Sun,
    swatch: "#ffffff",
    preview: { bg: "bg-slate-50", accent: "bg-blue-500", text: "text-slate-900" },
  },
  dark: {
    isDark: true,
    label: "Dark",
    description: "Classic dark mode for night sessions",
    icon: Moon,
    swatch: "#0f172a",
    preview: { bg: "bg-slate-900", accent: "bg-blue-500", text: "text-slate-50" },
  },
  midnight: {
    isDark: true,
    label: "Midnight ✨",
    description: "Cyber neon with twinkling stars",
    icon: Sparkles,
    swatch: "#0ea5e9",
    preview: { bg: "bg-[#0d1117]", accent: "bg-cyan-400", text: "text-cyan-100" },
    isPremium: true,
  },
  focus: {
    isDark: false,
    label: "Focus",
    description: "Warm sepia for distraction-free studying",
    icon: BookOpen,
    swatch: "#f5f5f4",
    preview: { bg: "bg-amber-50", accent: "bg-orange-600", text: "text-amber-900" },
  },
  "retro-dark": {
    isDark: true,
    label: "Retro (Dark)",
    description: "High contrast terminal green on black",
    icon: Trees,
    swatch: "#22c55e",
    preview: { bg: "bg-[#141f1a]", accent: "bg-green-500", text: "text-green-100" },
  },
  retro: {
    isDark: false,
    label: "Retro",
    description: "8-bit NES style with blocky aesthetics",
    icon: Gamepad2,
    swatch: "#eab308",
    preview: { bg: "bg-gray-300", accent: "bg-pink-500", text: "text-gray-900" },
  },
  nord: {
    isDark: true,
    label: "Nord",
    description: "Arctic Scandinavian with aurora accents",
    icon: Snowflake,
    swatch: "#818cf8",
    preview: { bg: "bg-[#2e3440]", accent: "bg-sky-300", text: "text-slate-200" },
  },
  holiday: {
    isDark: true,
    label: "Holiday ✨",
    description: "Cozy dark Christmas with snowflakes",
    icon: Gift,
    swatch: "#e11d48",
    preview: { bg: "bg-[#1f3d2e]", accent: "bg-red-500", text: "text-amber-100" },
    isPremium: true,
  },
  vapor: {
    isDark: true,
    label: "Vapor ✨",
    description: "Synthwave neon pink & cyan with digital rain",
    icon: Zap,
    swatch: "#d946ef",
    preview: { bg: "bg-[#1a0d24]", accent: "bg-pink-500", text: "text-pink-100" },
    isPremium: true,
  },
  blossom: {
    isDark: false,
    label: "Blossom ✨",
    description: "Romantic pink with falling sakura petals",
    icon: Flower2,
    swatch: "#f472b6",
    preview: { bg: "bg-[#FFF0F5]", accent: "bg-[#E599A8]", text: "text-[#4A4A4A]" },
    isPremium: true,
  },
  mint: {
    isDark: false,
    label: "Mint",
    description: "Fresh sage for earthy vibes",
    icon: Leaf,
    swatch: "#86efac",
    preview: { bg: "bg-[#F1F8E9]", accent: "bg-[#81C784]", text: "text-[#37474F]" },
  },
};

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [mounted, setMounted] = React.useState(false);

  // 1. Initialize from localStorage if available, else default to "system"
  // We initialize strictly to "system" (or a safe default) to match server
  // and then sync in an effect to avoid hydration mismatch.
  const [theme, setThemeState] = React.useState<Theme>("system");

  // On mount, read from storage
  React.useEffect(() => {
    setMounted(true);
    try {
      const stored = window.localStorage.getItem("theme");
      if (stored && Object.keys(THEME_CONFIG).includes(stored)) {
        setThemeState(stored as Theme);
      }
    } catch {
      // Ignore
    }
  }, []);

  // 2. Resolve "system" to actual theme
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">(
    "light",
  );

  // Listen for system changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent): void => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    // Set initial
    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    mediaQuery.addEventListener("change", handler);
    return (): void => mediaQuery.removeEventListener("change", handler);
  }, []);

  const resolvedTheme = React.useMemo(() => {
    if (theme === "system") {
      return systemTheme;
    }
    return theme;
  }, [theme, systemTheme]);

  // 3. Apply changes to DOM and Storage
  React.useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Reset classes
    root.classList.remove("dark");

    // Set data attribute
    root.setAttribute("data-theme", resolvedTheme);

    // Add 'dark' class only for generic dark theme
    // Themed dark modes (holiday, midnight, vapor, retro-dark) have their own complete palettes
    // and don't need the .dark fallback which can cause style conflicts
    const themedDarkModes: Theme[] = ['holiday', 'midnight', 'vapor', 'retro-dark', 'nord'];
    const needsDarkClass = THEME_CONFIG[resolvedTheme]?.isDark && !themedDarkModes.includes(resolvedTheme);
    if (needsDarkClass) {
      root.classList.add("dark");
    }

    // Persist preference
    try {
      if (theme === "system") {
        window.localStorage.removeItem("theme");
      } else {
        window.localStorage.setItem("theme", theme);
      }
    } catch {
      // Ignore
    }
  }, [theme, resolvedTheme, mounted]);

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((): Theme => {
      const isCurrentlyDark = THEME_CONFIG[resolvedTheme]?.isDark;
      return isCurrentlyDark ? "light" : "dark";
    });
  }, [resolvedTheme]);

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  // We render children immediately to avoid SEO/LCP impact.
  // Theme state initializes to "system" on both server and client,
  // then hydrates from localStorage, causing a repaint but no mismatch.
  // This is standard practice for Next.js theme providers.

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeProvider;
