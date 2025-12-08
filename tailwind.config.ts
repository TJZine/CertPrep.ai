import tailwindcssAnimate from "tailwindcss-animate";
import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },
        correct: {
          DEFAULT: "hsl(var(--correct) / <alpha-value>)",
          foreground: "hsl(var(--correct-foreground) / <alpha-value>)",
        },
        incorrect: {
          DEFAULT: "hsl(var(--incorrect) / <alpha-value>)",
          foreground: "hsl(var(--incorrect-foreground) / <alpha-value>)",
        },
        flagged: {
          DEFAULT: "hsl(var(--flagged) / <alpha-value>)",
          foreground: "hsl(var(--flagged-foreground) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          foreground: "hsl(var(--info-foreground) / <alpha-value>)",
        },
        // Performance tier colors (Scorecard, Analytics charts)
        "tier-excellent": {
          DEFAULT: "hsl(var(--tier-excellent) / <alpha-value>)",
          foreground: "hsl(var(--tier-excellent-foreground) / <alpha-value>)",
        },
        "tier-great": {
          DEFAULT: "hsl(var(--tier-great) / <alpha-value>)",
          foreground: "hsl(var(--tier-great-foreground) / <alpha-value>)",
        },
        "tier-good": {
          DEFAULT: "hsl(var(--tier-good) / <alpha-value>)",
          foreground: "hsl(var(--tier-good-foreground) / <alpha-value>)",
        },
        "tier-passing": {
          DEFAULT: "hsl(var(--tier-passing) / <alpha-value>)",
          foreground: "hsl(var(--tier-passing-foreground) / <alpha-value>)",
        },
        "tier-failing": {
          DEFAULT: "hsl(var(--tier-failing) / <alpha-value>)",
          foreground: "hsl(var(--tier-failing-foreground) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Roboto", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "Inter", "Roboto", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      fontSize: {
        question: ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }],
      },
    },
  },
  plugins: [typography, tailwindcssAnimate],
};

export default config;
