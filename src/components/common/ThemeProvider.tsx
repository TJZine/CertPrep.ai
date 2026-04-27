"use client";

import * as React from "react";

import {
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  Trees,
  Gamepad2,
  Zap as ZapIcon,
  Gift,
  Zap,
  Flower2,
  Leaf,
  Monitor,
  Grid3X3,
  Newspaper,
} from "lucide-react";

export type Theme =
  | "system"
  | "light"
  | "dark"
  | "midnight"
  | "focus"
  | "retro-dark"
  | "retro"
  | "brutalist"
  | "swiss"
  | "riso"
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
  // System - hidden, just for internal use
  system: {
    isDark: false,
    label: "System",
    description: "Follows your system's color scheme",
    icon: Monitor,
    swatch: "#94a3b8",
    preview: { bg: "bg-slate-200", accent: "bg-slate-600", text: "text-slate-900" },
    hidden: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIGHT THEMES ☀️
  // ═══════════════════════════════════════════════════════════════════════════
  light: {
    isDark: false,
    label: "☀️ Light",
    description: "Clean and bright, easy on the eyes",
    icon: Sun,
    swatch: "#ffffff",
    preview: { bg: "bg-slate-50", accent: "bg-blue-500", text: "text-slate-900" },
  },
  focus: {
    isDark: false,
    label: "☀️ Focus",
    description: "Warm sepia for distraction-free studying",
    icon: BookOpen,
    swatch: "#f5f5f4",
    preview: { bg: "bg-amber-50", accent: "bg-orange-600", text: "text-amber-900" },
  },
  brutalist: {
    isDark: false,
    label: "☀️ Brutalist",
    description: "Bold, playful neo-brutalism with hard shadows",
    icon: ZapIcon,
    swatch: "#FFE566",
    preview: { bg: "bg-[#FFFEF0]", accent: "bg-[#FFE566]", text: "text-black" },
  },
  retro: {
    isDark: false,
    label: "☀️ Retro",
    description: "8-bit NES style with blocky aesthetics",
    icon: Gamepad2,
    swatch: "#eab308",
    preview: { bg: "bg-gray-300", accent: "bg-pink-500", text: "text-gray-900" },
  },
  blossom: {
    isDark: false,
    label: "☀️ Blossom ✨",
    description: "Romantic pink with falling sakura petals",
    icon: Flower2,
    swatch: "#f472b6",
    preview: { bg: "bg-[#FFF0F5]", accent: "bg-[#E599A8]", text: "text-[#4A4A4A]" },
    isPremium: true,
  },
  mint: {
    isDark: false,
    label: "☀️ Mint",
    description: "Fresh sage for earthy vibes",
    icon: Leaf,
    swatch: "#86efac",
    preview: { bg: "bg-[#F1F8E9]", accent: "bg-[#81C784]", text: "text-[#37474F]" },
  },
  riso: {
    isDark: false,
    label: "☀️ Riso",
    description: "Zine-style with ink colors and paper texture",
    icon: Newspaper,
    swatch: "#FF48B0",
    preview: { bg: "bg-[#F5F3E7]", accent: "bg-[#FF48B0]", text: "text-[#1a1a1a]" },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DARK THEMES 🌙
  // ═══════════════════════════════════════════════════════════════════════════
  dark: {
    isDark: true,
    label: "🌙 Dark",
    description: "Classic dark mode for night sessions",
    icon: Moon,
    swatch: "#0f172a",
    preview: { bg: "bg-slate-900", accent: "bg-blue-500", text: "text-slate-50" },
  },
  midnight: {
    isDark: true,
    label: "🌙 Midnight ✨",
    description: "Cyber neon with twinkling stars",
    icon: Sparkles,
    swatch: "#0ea5e9",
    preview: { bg: "bg-[#0d1117]", accent: "bg-cyan-400", text: "text-cyan-100" },
    isPremium: true,
  },
  swiss: {
    isDark: true,
    label: "🌙 Swiss",
    description: "Stark minimalism with grid lines and orange accent",
    icon: Grid3X3,
    swatch: "#FF4F00",
    preview: { bg: "bg-black", accent: "bg-[#FF4F00]", text: "text-white" },
  },
  "retro-dark": {
    isDark: true,
    label: "🌙 Retro (Dark)",
    description: "High contrast terminal green on black",
    icon: Trees,
    swatch: "#22c55e",
    preview: { bg: "bg-[#141f1a]", accent: "bg-green-500", text: "text-green-100" },
  },
  holiday: {
    isDark: true,
    label: "🌙 Holiday ✨",
    description: "Cozy dark Christmas with snowflakes",
    icon: Gift,
    swatch: "#e11d48",
    preview: { bg: "bg-[#1f3d2e]", accent: "bg-red-500", text: "text-amber-100" },
    isPremium: true,
  },
  vapor: {
    isDark: true,
    label: "🌙 Vapor ✨",
    description: "Synthwave neon pink & cyan with digital rain",
    icon: Zap,
    swatch: "#d946ef",
    preview: { bg: "bg-[#1a0d24]", accent: "bg-pink-500", text: "text-pink-100" },
    isPremium: true,
  },
};

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  comfortMode: boolean;
  setComfortMode: (enabled: boolean) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [comfortMode, setComfortModeState] = React.useState(false);
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">(
    "light",
  );
  React.useEffect(() => {
    if (typeof window === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrates browser-only mount flag after SSR-safe defaults.
      setMounted(true);
      return;
    }

    try {
      const stored = window.localStorage.getItem("theme");
      if (stored && Object.keys(THEME_CONFIG).includes(stored)) {
        setThemeState(stored as Theme);
      }

      const storedComfort = window.localStorage.getItem("comfortMode");
      if (storedComfort !== null) {
        setComfortModeState(storedComfort === "true");
      } else {
        setComfortModeState(
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        );
      }

      setSystemTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
      );
    } catch {
      // Keep SSR-safe defaults.
    }

    setMounted(true);
  }, []);

  // Listen for system changes
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent): void => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

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
    // Themed dark modes have complete custom palettes and don't need the generic .dark class
    // Derive from config to avoid drift when adding new themes
    const themedDarkModes = (Object.entries(THEME_CONFIG) as [Theme, typeof THEME_CONFIG[Theme]][])
      .filter(([key, config]) => config.isDark && key !== 'dark' && key !== 'system')
      .map(([key]) => key);
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

  // 4. Apply comfort mode to DOM and Storage
  React.useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (comfortMode) {
      root.setAttribute("data-comfort", "true");
    } else {
      root.removeAttribute("data-comfort");
    }

    // Persist preference
    try {
      window.localStorage.setItem("comfortMode", String(comfortMode));
    } catch {
      // Ignore
    }
  }, [comfortMode, mounted]);

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((): Theme => {
      const isCurrentlyDark = THEME_CONFIG[resolvedTheme]?.isDark;
      return isCurrentlyDark ? "light" : "dark";
    });
  }, [resolvedTheme]);

  const setComfortMode = React.useCallback((enabled: boolean) => {
    setComfortModeState(enabled);
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      comfortMode,
      setComfortMode,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, comfortMode, setComfortMode],
  );

  // Render children with SSR-safe defaults first, then hydrate browser preferences after mount.
  // This avoids server/client markup mismatches at the cost of a post-mount theme repaint.

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
