"use client";

import * as React from "react";

export type Theme = "light" | "dark" | "midnight" | "focus" | "forest" | "retro";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem("theme");
    } catch {
      // Ignore
    }
    // Validate stored theme
    if (
      stored === "light" ||
      stored === "dark" ||
      stored === "midnight" ||
      stored === "focus" ||
      stored === "forest" ||
      stored === "retro"
    ) {
      return stored as Theme;
    }
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // Sync the class/attribute on the root element
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Reset classes
    root.classList.remove("dark");

    // Set data attribute for all themes
    root.setAttribute("data-theme", theme);

    // Add 'dark' class for Tailwind dark mode utilities if the theme is dark-ish
    if (theme === "dark" || theme === "midnight" || theme === "forest") {
      root.classList.add("dark");
    }

    try {
      window.localStorage.setItem("theme", theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  // Listen for system preference only if no user preference
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if user has explicit preference in storage
    let hasExplicit = null;
    try {
      hasExplicit = window.localStorage.getItem("theme");
    } catch {
      // Ignore storage errors
    }

    if (hasExplicit) return;

    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent): void => {
      setThemeState(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handler);
    return (): void => mediaQuery.removeEventListener("change", handler);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev): Theme => {
      // Simple toggle cycle
      if (prev === "light") return "dark";
      if (prev === "dark") return "light";
      return "light"; // Default back to light from custom themes if invoked
    });
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme],
  );

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
