import { expect, test, type Page } from "@playwright/test";

interface ViewportExpectation {
  width: number;
  height: number;
  compact: boolean;
}

const viewports: ViewportExpectation[] = [
  { width: 390, height: 844, compact: true },
  { width: 820, height: 1180, compact: true },
  { width: 1280, height: 900, compact: false },
  { width: 1440, height: 900, compact: false },
];

async function expectNoHorizontalDocumentOverflow(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      {
        message:
          "document scrollWidth must not exceed the viewport width by more than 1 CSS pixel; the received value is the excess width",
      },
    )
    .toBeLessThanOrEqual(1);
}

for (const viewport of viewports) {
  test(`responsive header fits at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/");

    const menuTrigger = page.getByRole("button", { name: "Open menu" });
    const desktopNavigation = page.getByRole("navigation", {
      name: "Main navigation",
    });

    if (viewport.compact) {
      await expect(menuTrigger).toBeVisible();
      await expect(desktopNavigation).toBeHidden();
    } else {
      await expect(menuTrigger).toBeHidden();
      await expect(desktopNavigation).toBeVisible();
    }

    await expectNoHorizontalDocumentOverflow(page);
  });
}

for (const viewport of viewports.filter(({ compact }) => compact)) {
  test(`compact navigation contains focus at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/");

    const menuTrigger = page.getByRole("button", { name: "Open menu" });
    await menuTrigger.click();

    const dialog = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Dashboard" })).toBeFocused();
    await expectNoHorizontalDocumentOverflow(page);

    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();
    await expect(menuTrigger).toBeFocused();
    await expectNoHorizontalDocumentOverflow(page);
  });
}
