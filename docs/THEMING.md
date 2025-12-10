# Theme Customization Guide

CertPrep.ai uses a semantic token system that allows complete theme customization through CSS variables. All UI components, charts, and visualizations automatically respect these tokens.

---

## How Theming Works

1. **Edit CSS variables** in `src/app/globals.css`
2. **All components update automatically** — no JavaScript changes needed
3. **HSL format** is used: `hue saturation% lightness%` (space-separated, no commas)
4. **Radius customization**: Control border roundness via the `--radius` variable

---

## Available Themes

| Theme        | Selector                    | Description                              | Radius   |
| ------------ | --------------------------- | ---------------------------------------- | -------- |
| Light        | `:root`                     | Default warm slate theme                 | 0.5rem   |
| Dark         | `.dark`                     | Dark slate for night mode                | 0.5rem   |
| Midnight ✨  | `[data-theme="midnight"]`   | Cyber neon with electric cyan            | 0.25rem  |
| Focus        | `[data-theme="focus"]`      | Warm sepia for distraction-free studying | 0.75rem  |
| Retro (Dark) | `[data-theme="retro-dark"]` | High contrast terminal green on black    | 0px      |
| Retro        | `[data-theme="retro"]`      | 8-bit NES style with blocky UI           | 0px      |
| Brutalist    | `[data-theme="brutalist"]`  | Bold neo-brutalism with hard shadows     | 0.25rem  |
| Swiss        | `[data-theme="swiss"]`      | Stark minimalism with grid lines         | 0px      |
| Riso         | `[data-theme="riso"]`       | Zine-style with ink colors & paper       | 0.125rem |
| Holiday ✨   | `[data-theme="holiday"]`    | Cozy dark Christmas with snowfall        | 0.75rem  |
| Vapor ✨     | `[data-theme="vapor"]`      | Synthwave neon pink & cyan               | 0px      |
| Blossom ✨   | `[data-theme="blossom"]`    | Pastel pink with sakura petals           | 1.5rem   |
| Mint         | `[data-theme="mint"]`       | Fresh sage with graph paper overlay      | 0.75rem  |

> **Note:** Themes marked with ✨ include premium visual effects (particles, animations).

---

## Token Reference

### Core UI Tokens

| Token                      | Usage                                       |
| -------------------------- | ------------------------------------------- |
| `--background`             | Page background                             |
| `--foreground`             | Main text color                             |
| `--card`                   | Card/panel backgrounds                      |
| `--card-foreground`        | Text inside cards                           |
| `--popover`                | Dropdown/tooltip backgrounds                |
| `--popover-foreground`     | Text inside popovers                        |
| `--primary`                | Buttons, links, chart lines                 |
| `--primary-foreground`     | Text on primary buttons                     |
| `--secondary`              | Secondary button backgrounds                |
| `--secondary-foreground`   | Text on secondary buttons                   |
| `--muted`                  | Muted backgrounds (empty states, skeletons) |
| `--muted-foreground`       | Subtle text, labels, chart axis labels      |
| `--accent`                 | Accent highlights                           |
| `--accent-foreground`      | Text on accent elements                     |
| `--destructive`            | Delete buttons, error states                |
| `--destructive-foreground` | Text on destructive elements                |
| `--border`                 | Borders, dividers, chart grid lines         |
| `--input`                  | Input field backgrounds                     |
| `--ring`                   | Focus ring color                            |
| `--radius`                 | Border radius (e.g., `0.5rem`, `0px`)       |

### Semantic & Status Tokens

| Token                    | Usage                                                    |
| ------------------------ | -------------------------------------------------------- |
| `--correct`              | Correct answer indicators, positive trends               |
| `--correct-foreground`   | Text on correct backgrounds                              |
| `--incorrect`            | Wrong answer indicators, negative trends                 |
| `--incorrect-foreground` | Text on incorrect backgrounds                            |
| `--flagged`              | Flagged questions                                        |
| `--flagged-foreground`   | Text on flagged backgrounds                              |
| `--warning`              | Generic warnings (charts/alerts)                         |
| `--warning-foreground`   | Text on warning elements                                 |
| `--info`                 | Informational highlights (e.g., new features)            |
| `--info-foreground`      | Text on info elements                                    |
| `--success`              | Success buttons, task completion (often same as correct) |
| `--success-foreground`   | Text on success elements                                 |

### Performance Tier Tokens

Used in charts (donut/bar) to denote performance levels.

| Token              | Usage                                 |
| ------------------ | ------------------------------------- |
| `--tier-excellent` | 90%+ scores (often matches success)   |
| `--tier-great`     | 80-89% scores                         |
| `--tier-good`      | 70-79% scores                         |
| `--tier-passing`   | 60-69% scores (often matches warning) |
| `--tier-failing`   | <60% scores (often matches incorrect) |

---

## Color Usage Guidelines

> [!IMPORTANT]
> Components must use semantic tokens exclusively. This ensures all 12+ themes render correctly without component-level changes.

### ✅ Always Use Semantic Tokens

| I need...               | Use this                             |
| ----------------------- | ------------------------------------ |
| Primary heading text    | `text-foreground`                    |
| Subtle/secondary text   | `text-muted-foreground`              |
| Page background         | `bg-background`                      |
| Card background         | `bg-card`                            |
| Subtle/muted background | `bg-muted`                           |
| Any border              | `border-border`                      |
| Error text/icon         | `text-destructive`                   |
| Warning text/icon       | `text-warning`                       |
| Success text/icon       | `text-success`                       |
| Info text/icon          | `text-info`                          |
| Primary action button   | `bg-primary text-primary-foreground` |
| Focus ring              | `ring-ring`                          |

### ❌ Never Use in Components

- `text-slate-*`, `text-gray-*`, `text-zinc-*`, `text-neutral-*`
- `bg-slate-*`, `bg-gray-*`, `bg-zinc-*`
- `text-red-*`, `text-green-*`, `text-blue-*`, `text-amber-*`
- `dark:` variants on semantic tokens (they already adapt per-theme)

### ⚠️ Exceptions

- **Theme picker swatches** in `ThemeProvider.tsx` — Must show actual colors
- **Theme-specific CSS** in `globals.css` — e.g., Vapor gradients, Holiday borders
- **Brand assets** — Logo colors are fixed

---

## How to Create a New Theme

1. **Add a new data-theme block** in `src/app/globals.css`:

```css
[data-theme="ocean"] {
  --background: 200 50% 10%; /* Deep ocean blue */
  --foreground: 180 30% 95%; /* Light seafoam */

  --radius: 0.75rem; /* Custom roundness */

  /* ... define all CSS variables listed above ... */
}
```

2. **Register the theme** in `src/components/common/ThemeProvider.tsx`:

```tsx
// 1. Add to Theme union type
export type Theme = "light" | "dark" | ... | "ocean";

// 2. Add to THEME_CONFIG with metadata
export const THEME_CONFIG: Record<Theme, { isDark: boolean; label: string; ... }> = {
  // ... existing themes ...
  ocean: {
    isDark: true,
    label: "Ocean",
    description: "Deep sea navy with coral accents",
    icon: Waves,
    swatch: "#1e3a8a",
    preview: { bg: "bg-blue-950", accent: "bg-cyan-500", text: "text-cyan-50" }
  },
};
```

3. **Add to Settings UI** in `src/components/settings/ThemeSettings.tsx`:

```tsx
{
    id: "ocean",
    name: "Ocean",
    description: "Deep sea navy with coral accents",
    icon: Waves,
    preview: { bg: "bg-slate-900", accent: "bg-cyan-500", text: "text-cyan-50" },
},
```

---

## Charts

Charts use the `useChartColors` hook to dynamically read these CSS variables at runtime. This ensures:

1. Chart colors match the theme instantly.
2. No hardcoded hex values in JavaScript.
3. Support for custom user themes in the future.

---

## File Locations

| File                                        | Purpose                               |
| ------------------------------------------- | ------------------------------------- |
| `src/app/globals.css`                       | All theme definitions (CSS variables) |
| `tailwind.config.ts`                        | Tailwind token mappings               |
| `src/components/common/ThemeProvider.tsx`   | Theme type definition & state logic   |
| `src/components/settings/ThemeSettings.tsx` | Theme selection UI & preview config   |
| `src/hooks/useChartColors.ts`               | Chart color reading hook              |
