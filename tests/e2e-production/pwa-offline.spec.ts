import { expect, test } from "@playwright/test";

test("offline navigation never renders a different route's cached document", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  if (
    !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
  ) {
    await page.reload();
  }

  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "Test Library", level: 1 }),
  ).toBeVisible();

  await context.setOffline(true);
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "You’re offline", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Test Library", level: 1 }),
  ).toHaveCount(0);

  await context.setOffline(false);
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "Analytics", level: 1 }),
  ).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Analytics", level: 1 }),
  ).toBeVisible();

  await context.setOffline(false);
});
