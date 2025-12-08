"use client";

import * as React from "react";

export type Theme =
  | "system"
  | "light"
  | "dark"
  | "midnight"
  | "focus"
  | "forest"
  | "retro"
  | "ocean"
  | "nord"
  | "holiday"
  | "vapor"
  | "blossom"
  | "mint";

export const THEME_CONFIG: Record<
  Theme,
  { isDark: boolean; label: string; hidden?: boolean }
> = {
  system: { isDark: false, label: "System", hidden: true },
  light: { isDark: false, label: "Light" },
  dark: { isDark: true, label: "Dark" },
  midnight: { isDark: true, label: "Midnight" },
  focus: { isDark: false, label: "Focus" },
  forest: { isDark: true, label: "Retro (Dark)" },
  retro: { isDark: false, label: "Retro" },
  ocean: { isDark: true, label: "Ocean" },
  nord: { isDark: true, label: "Nord" },
  holiday: { isDark: false, label: "Holiday" },
  vapor: { isDark: true, label: "Vapor" },
  blossom: { isDark: false, label: "Blossom" },
  mint: { isDark: false, label: "Mint" },
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

    // Add 'dark' class if needed
    if (THEME_CONFIG[resolvedTheme]?.isDark) {
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
    setThemeState((prev): Theme => {
      // If currently system, we need to know what we are resolving to
      // to toggle to the *opposite*.
      const currentResolved =
        prev === "system"
          ? typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : prev;

      // Logic:
      // If Light -> Dark
      // If Dark -> Light
      // If Custom (Dark-ish) -> Light
      // If Custom (Light-ish) -> Dark

      const isCurrentlyDark = THEME_CONFIG[currentResolved]?.isDark;
      return isCurrentlyDark ? "light" : "dark";
    });
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  // Avoid rendering children until mounted to prevent hydration mismatch
  // strictly if the children's rendering depends on the theme.
  // HOWEVER, preventing children render can hurt SEO/LCP.
  // Better approach: Render children, but since our theme only affects CSS variables/attributes
  // on the <html> tag, hydration mismatch within *children* is rare unless they inspect `useTheme`.
  // If children inspect `useTheme`, they might mismtach.
  // We will simply return children. The `mounted` check protects the DOM manipulation inside the provider.
  // But wait, `useTheme` returns `theme`.
  // On server: 'system'. On client initial: 'system'.
  // If stored is 'dark', client effect updates to 'dark'.
  // This causes a re-render on client, no mismatch error, just a repaint (flash).
  // Standard Next.js practice for theme providers.

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
