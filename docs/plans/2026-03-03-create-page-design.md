# Create Page Redesign

## Goal

Transform the `/create` route from a static, read-only guide into an interactive, premium "Prompt Builder" experience that helps users construct perfect AI prompts for test generation via external tools (ChatGPT/Gemini).

## Aesthetic Tone

- **"High-End Developer Tool" / "SaaS Wizard"**
- Clean, focused, and distinct from the standard dashboard.
- Uses the project's existing token architecture but pushes the fidelity higher (glassmorphism on the output window, smooth `framer-motion` transitions, focus on typography and space).

## Architecture & Layout

### 1. The Header (Creation Hub Context)

- **Position:** Directly below the main navigation.
- **Title:** "Create a Practice Test" (left-aligned, large typography).
- **Mode Switcher:** A clean, tabbed segmented control (pill shape) next to the title.
  - **Active Mode:** "AI Generator"
  - **Alternate Mode:** "Import JSON" (Switches the view to the raw JSON pasting interface).
  - Note: No "Manual Builder" in this iteration to avoid non-functional placeholders.

### 2. The Core Builder (Split Panel View)

A two-column layout roughly split 40/60 or 35/65 (Controls vs. Output).

#### Left Column: The Controls (The "Wizard")

A beautifully styled, dynamic form that gathers context without overwhelming the user.

- **Generation Type (The "Strategy"):** Radio cards with icons replacing the current tabs (Study Material, Example Match, Remix, Convert Key).
- **Context Inputs:** Contextual fields that slide in based on the chosen strategy.
  - Example: If "Study Material" is chosen, a large, well-styled `textarea` appears for pasting notes.
  - Optional toggles for Difficulty, Question Count, etc.
- **Exam Alignment:** The existing "Select Preset" logic to align with official certification domains, styled as a sleek, searchable dropdown or compact grid.

#### Right Column: The Output (The "Magic Window")

A sticky or highly prominent block that displays the constructed prompt in real-time.

- **Visuals:** A darkened, distinct card (often called a "terminal" or "code" aesthetic, but refined). Subtle syntax highlighting or colored bolding for the _variables_ the user has changed on the left.
- **Behavior:** Updates instantaneously as inputs change on the left. Uses `framer-motion` to smoothly animate the text changes or flashes briefly to indicate a re-render.
- **Actions:**
  - A massive, irresistible "Copy Prompt" button.
  - Quick-launch buttons below it: "Open ChatGPT" / "Open Gemini".
  - A brief helper note: "Paste this into your AI, then click 'Import JSON' up top when you have the response."

## Technical Constraints & Considerations

- **Responsiveness:** On mobile, the split panel must stack securely. The "Output" window might need to become a sticky footer or a sliding drawer so the user doesn't lose sight of it while filling out the long form above.
- **State Management:** The Left Column's state directly drives the Right Column's string output. Keep standard React state localized to this page.
- **Animations:** Respect the `useEnhancedAnimations()` hook existing in the project for users with reduced motion or specific themes (like brutalist/retro).

## Next Steps

- Implement the layout shell (`src/app/create/page.tsx` and related components).
- Build the Mode Switcher.
- Build the Left Column (Controls form).
- Build the Right Column (Live Output panel).
- Connect state and refine aesthetics (focus states, transitions).
