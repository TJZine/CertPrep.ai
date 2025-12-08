import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

// Safelist all width percentages 0-100% for dynamic progress bars (avoiding inline styles for CSP)
const widthSafelist = Array.from({ length: 101 }, (_, i) => `w-[${i}%]`);

const config: Config = {
  darkMode: "class",
  safelist: [...widthSafelist],
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
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
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        correct: {
          DEFAULT: "hsl(var(--correct))",
          foreground: "hsl(var(--correct-foreground))",
        },
        incorrect: {
          DEFAULT: "hsl(var(--incorrect))",
          foreground: "hsl(var(--incorrect-foreground))",
        },
        flagged: {
          DEFAULT: "hsl(var(--flagged))",
          foreground: "hsl(var(--flagged-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        // Performance tier colors (Scorecard, Analytics charts)
        "tier-excellent": {
          DEFAULT: "hsl(var(--tier-excellent))",
          foreground: "hsl(var(--tier-excellent-foreground))",
        },
        "tier-great": {
          DEFAULT: "hsl(var(--tier-great))",
          foreground: "hsl(var(--tier-great-foreground))",
        },
        "tier-good": {
          DEFAULT: "hsl(var(--tier-good))",
          foreground: "hsl(var(--tier-good-foreground))",
        },
        "tier-passing": {
          DEFAULT: "hsl(var(--tier-passing))",
          foreground: "hsl(var(--tier-passing-foreground))",
        },
        "tier-failing": {
          DEFAULT: "hsl(var(--tier-failing))",
          foreground: "hsl(var(--tier-failing-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "Roboto", "system-ui", "sans-serif"],
      },
      fontSize: {
        question: ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }],
      },
    },
  },
  plugins: [typography, require("tailwindcss-animate")],
};

export default config;
