import { expect, test, type Page } from "@playwright/test";

async function waitForControllingServiceWorker(page: Page): Promise<void> {
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
}

test("offline navigation never renders a different route's cached document", async ({
  context,
  page,
}) => {
  await waitForControllingServiceWorker(page);

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "Test Library", level: 1 }),
  ).toBeVisible();

  try {
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
  } finally {
    await context.setOffline(false);
  }
});

test("cache clearing removes runtime documents but preserves the offline fallback", async ({
  context,
  page,
}) => {
  await waitForControllingServiceWorker(page);
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "Analytics", level: 1 }),
  ).toBeVisible();

  const cacheClearResult = await page.evaluate(
    () =>
      new Promise<"cleared" | "failed" | "timeout">((resolve) => {
        const worker = navigator.serviceWorker.controller;
        if (!worker) {
          resolve("failed");
          return;
        }

        const channel = new MessageChannel();
        const timeoutId = window.setTimeout(() => {
          channel.port1.close();
          resolve("timeout");
        }, 2_000);

        channel.port1.onmessage = (event: MessageEvent<unknown>): void => {
          window.clearTimeout(timeoutId);
          channel.port1.close();
          const response = event.data as { ok?: unknown } | null;
          resolve(response?.ok === true ? "cleared" : "failed");
        };
        channel.port1.onmessageerror = (): void => {
          window.clearTimeout(timeoutId);
          channel.port1.close();
          resolve("failed");
        };

        worker.postMessage({ type: "CLEAR_CACHES" }, [channel.port2]);
      }),
  );
  expect(cacheClearResult).toBe("cleared");

  try {
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "You’re offline", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Analytics", level: 1 }),
    ).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
});
