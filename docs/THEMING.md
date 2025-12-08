# Theme Customization Guide

CertPrep.ai uses a semantic token system that allows complete theme customization through CSS variables. All UI components, quiz feedback, and charts automatically respect these tokens.

---

## How Theming Works

1. **Edit CSS variables** in `src/app/globals.css`
2. **All components update automatically** — no JavaScript changes needed
3. **HSL format** is used: `hue saturation% lightness%` (space-separated, no commas)

---

## Available Themes

| Theme    | Selector                  | Description                              |
| -------- | ------------------------- | ---------------------------------------- |
| Light    | `:root`                   | Default warm slate theme                 |
| Dark     | `.dark`                   | Dark slate for night mode                |
| Midnight | `[data-theme="midnight"]` | Cyber neon with electric cyan            |
| Focus    | `[data-theme="focus"]`    | Warm sepia for distraction-free studying |
| Forest   | `[data-theme="forest"]`   | Deep pine with autumn accents            |
| Retro    | `[data-theme="retro"]`    | 8-bit NES style with blocky UI           |

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

### Quiz Status Tokens

| Token                    | Usage                                      |
| ------------------------ | ------------------------------------------ |
| `--correct`              | Correct answer indicators, positive trends |
| `--correct-foreground`   | Text on correct backgrounds                |
| `--incorrect`            | Wrong answer indicators, negative trends   |
| `--incorrect-foreground` | Text on incorrect backgrounds              |
| `--flagged`              | Flagged questions, warnings                |
| `--flagged-foreground`   | Text on flagged backgrounds                |
| `--success`              | Success buttons, positive feedback         |
| `--success-foreground`   | Text on success elements                   |
| `--warning`              | Warning buttons, caution states            |
| `--warning-foreground`   | Text on warning elements                   |
| `--info`                 | Informational highlights                   |
| `--info-foreground`      | Text on info elements                      |

---

## How to Create a New Theme

1. **Add a new data-theme block** in `globals.css`:

```css
[data-theme="ocean"] {
  --background: 200 50% 10%; /* Deep ocean blue */
  --foreground: 180 30% 95%; /* Light seafoam */

  --card: 200 50% 14%;
  --card-foreground: 180 30% 95%;

  --primary: 175 80% 45%; /* Teal wave */
  --primary-foreground: 200 50% 10%;

  /* ... define all tokens ... */
}
```

2. **Register the theme** in `src/stores/settingsStore.ts`:

```ts
export type Theme =
  | "light"
  | "dark"
  | "midnight"
  | "focus"
  | "forest"
  | "retro"
  | "ocean";
```

3. **Add to the theme selector** in `src/components/common/ThemeProvider.tsx`

---

## Customization Examples

### Change Chart Colors for All Themes

Charts use these tokens (via `useChartColors` hook):

- **Lines/bars**: `--primary`
- **Grid lines**: `--border`
- **Axis labels**: `--muted-foreground`

To make charts purple in Midnight theme:

```css
[data-theme="midnight"] {
  --primary: 270 80% 60%; /* Purple instead of cyan */
}
```

### Make Quiz Feedback Less Saturated

For a calmer Focus theme:

```css
[data-theme="focus"] {
  --correct: 145 40% 42%; /* Muted sage */
  --incorrect: 0 40% 50%; /* Muted brick */
}
```

### Create High-Contrast Mode

```css
[data-theme="high-contrast"] {
  --background: 0 0% 0%; /* Pure black */
  --foreground: 0 0% 100%; /* Pure white */
  --primary: 60 100% 50%; /* Bright yellow */
  --border: 0 0% 100%; /* White borders */
}
```

---

## Tips

1. **Maintain contrast ratios** — Keep a 4.5:1 ratio between foreground and background for accessibility
2. **Test quiz feedback** — Ensure `--correct`/`--incorrect` are distinguishable from `--primary`
3. **Check charts** — The `useChartColors` hook reads tokens at runtime, so chart colors update instantly
4. **Test all components** — Use the dashboard, quiz flow, and analytics to verify your theme

---

## File Locations

| File                                      | Purpose                               |
| ----------------------------------------- | ------------------------------------- |
| `src/app/globals.css`                     | All theme definitions (CSS variables) |
| `tailwind.config.ts`                      | Tailwind token mappings               |
| `src/hooks/useChartColors.ts`             | Chart color reading hook              |
| `src/stores/settingsStore.ts`             | Theme type definitions                |
| `src/components/common/ThemeProvider.tsx` | Theme application logic               |
