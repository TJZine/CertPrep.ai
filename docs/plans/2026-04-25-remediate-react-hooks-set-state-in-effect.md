# Plan: Remediate `react-hooks/set-state-in-effect` Lint Violations

## Context

Following the dependency audit and upgrade to `eslint-config-next` `16.2.4`, the project now enforces the `react-hooks/set-state-in-effect` rule. This rule flags instances where `setState` is called directly within a `useEffect` body.

Currently, there are **31 violations** of this rule across the codebase. While these were previously silently ignored, addressing them is necessary to conform to modern React best practices, prevent unnecessary double-renders, and eliminate confusing state cascades.

## Goal

Achieve a zero-warning, zero-error state for `npm run lint` by systematically refactoring components to avoid `setState` in `useEffect`.

## Remediation Strategies

When fixing these violations, do not simply suppress them with `eslint-disable`. Apply the appropriate architectural pattern based on the use case:

1. **Derived State (Most Common)**
   - **Anti-pattern:** `useEffect(() => { setFiltered(items.filter(i => i > 5)) }, [items])`
   - **Fix:** Calculate the value directly during render.
   - `const filtered = useMemo(() => items.filter(i => i > 5), [items])`

2. **Event Handlers**
   - **Anti-pattern:** Using an effect to watch a value change and then trigger an action.
   - **Fix:** Move the `setState` or action directly into the event handler that caused the value to change.

3. **External Stores (Window / DOM state)**
   - **Anti-pattern:** `useEffect(() => { setIsOnline(navigator.onLine); window.addEventListener(...) }, [])`
   - **Fix:** Use `useSyncExternalStore` for reading mutable data from the DOM/Window (like `navigator.onLine` or `matchMedia`), OR keep the `useEffect` but wrap the `setState` in the actual event listener callback (the rule flags `setState` _directly_ in the effect body, not inside event callbacks registered within the effect).

4. **Initialization & SSR Hydration (`useMounted`)**
   - **Anti-pattern:** `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);`
   - **Fix:** This is actually a standard pattern for avoiding SSR hydration mismatches in Next.js. If the linter flags `setMounted(true)` directly in the effect, the easiest compliant fix is to wrap it in a microtask or `setTimeout(..., 0)`, or better yet, extract it into a reusable `useIsMounted()` hook that safely suppresses the rule with an explanatory comment if it's the optimal approach.

## Execution Steps for the Next Agent

1. **Identify Targets:** Run `npx eslint .` or `npm run lint` to get the exact list of the 31 violations and their file paths.
2. **Batch Refactoring:** Group the files by feature (e.g., Auth hooks, Analytics components, UI components).
3. **Apply Fixes:** Refactor using the strategies above.
4. **Rigorous Verification:** Because moving state out of effects changes the component rendering lifecycle, you **must** verify the changes haven't broken functionality:
   - Run `npm run typecheck`
   - Run `npm run test` (crucial: many of these components have unit tests that might fail if render cycles change).
5. **Finalize:** Ensure `npm run lint` returns an exit code of 0 before committing the work.
