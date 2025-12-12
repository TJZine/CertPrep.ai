import { test, expect } from "./fixtures";

test.describe("Settings Page", () => {
    test.describe("Page Display", () => {
        test("displays settings heading and app version", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/settings");

            // Verify Settings heading
            await expect(
                page.getByRole("heading", { level: 1, name: "Settings" }),
            ).toBeVisible();

            // Verify app version is displayed
            await expect(page.getByText(/version \d+\.\d+/i)).toBeVisible();

            // Verify "Privacy First" badge
            await expect(page.getByText("Privacy First")).toBeVisible();
        });

        test("displays appearance section", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/settings");

            // Verify Appearance card is visible
            await expect(page.getByText("Appearance")).toBeVisible();
            await expect(
                page.getByText(/choose a theme that suits your study environment/i),
            ).toBeVisible();
        });
    });

    test.describe("Theme Selection", () => {
        test("theme selector changes theme", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/settings");

            // Find the currently selected theme name
            const selectedTheme = page.locator('button[aria-pressed="true"]');
            await expect(selectedTheme).toBeVisible();
            const currentThemeName = await selectedTheme.locator("span.font-medium").textContent();

            // Find a different theme by name
            const allThemes = page.locator('button[aria-pressed]');
            const count = await allThemes.count();
            expect(count).toBeGreaterThan(1);

            // Find the first unselected theme and get its name before clicking
            const unselectedTheme = page.locator('button[aria-pressed="false"]').first();
            const newThemeName = await unselectedTheme.locator("span.font-medium").textContent();
            expect(newThemeName).not.toBe(currentThemeName);

            // Click the unselected theme
            await unselectedTheme.click();

            // Verify the new theme is now selected by finding button with that theme name
            const newlySelected = page.locator(`button[aria-pressed="true"]`).filter({
                has: page.locator(`span.font-medium:has-text("${newThemeName}")`),
            });
            await expect(newlySelected).toBeVisible();
        });

        test("theme selection saves to localStorage", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/settings");

            // Get current selected theme name
            const initialSelected = page.locator('button[aria-pressed="true"]');
            await expect(initialSelected).toBeVisible();

            // Get a different theme's name before clicking
            const otherTheme = page.locator('button[aria-pressed="false"]').first();
            const themeLabelSpan = otherTheme.locator("span.font-medium");
            const newThemeName = await themeLabelSpan.textContent();

            // Click the new theme
            await otherTheme.click();

            // Wait for selection to update
            await expect(
                page.locator(`button[aria-pressed="true"]`).filter({
                    has: page.locator(`span.font-medium:has-text("${newThemeName}")`),
                }),
            ).toBeVisible();

            // Verify localStorage was updated
            // Theme key uses lowercase theme ID, not display name
            const storedTheme = await page.evaluate(() => {
                return window.localStorage.getItem("theme");
            });

            // The theme should be stored (not null/undefined)
            // "System" theme removes the key, so if we selected something else it should be set
            if (newThemeName !== "System") {
                expect(storedTheme).not.toBeNull();
            }
        });

        test("all theme options are clickable", async ({
            authenticatedPage: page,
        }) => {
            await page.goto("/settings");

            // Get all theme buttons
            const themeButtons = page.locator('button[aria-pressed]');
            const count = await themeButtons.count();

            // Each theme button should be enabled and visible
            for (let i = 0; i < count; i++) {
                const button = themeButtons.nth(i);
                await expect(button).toBeVisible();
                await expect(button).toBeEnabled();
            }
        });
    });
});
