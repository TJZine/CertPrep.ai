import type { Page } from "@playwright/test";
import { test, expect, TEST_QUIZ, MOCK_USER } from "./fixtures";
import { E2E_TIMEOUTS } from "./helpers/timeouts";
import type { ZenQuizDraft } from "../../src/types/zenDraft";

test.use({ serviceWorkers: "allow" });

async function selectAndSubmit(page: Page, option: string): Promise<void> {
  const radio = page.getByRole("radio", {
    name: new RegExp(`^${option}\\s`, "i"),
  });
  await expect(radio).toBeVisible({ timeout: E2E_TIMEOUTS.LOADING });
  await radio.hover();
  await page.waitForTimeout(E2E_TIMEOUTS.REACT_HYDRATION);
  await radio.click();
  const submit = page.getByRole("button", { name: /check answer|submit/i });
  await expect(submit).toBeEnabled({ timeout: E2E_TIMEOUTS.SLOW });
  await submit.hover();
  await page.waitForTimeout(E2E_TIMEOUTS.REACT_HYDRATION);
  await submit.click();
  await expect(page.getByRole("button", { name: /good/i })).toBeVisible();
}

async function getDraft(
  page: Page,
  quizId: string,
): Promise<ZenQuizDraft | undefined> {
  return page.evaluate(
    async ({ userId, quizId: id }) => {
      if (!window.__certprepDb) return undefined;
      return window.__certprepDb.zenDrafts.get([userId, id]);
    },
    { userId: MOCK_USER.id, quizId },
  );
}

async function expectDraft(
  page: Page,
  quizId: string,
  predicate: (draft: ZenQuizDraft) => boolean,
): Promise<void> {
  await expect
    .poll(async () => {
      const draft = await getDraft(page, quizId);
      return draft ? predicate(draft) : false;
    })
    .toBe(true);
}

test.describe("device-local standard Zen drafts", () => {
  test("offers explicit resume after reload and restores answers, flags, order, and position", async ({
    authenticatedPage: page,
    seedTestQuiz,
  }) => {
    const quiz = await seedTestQuiz(TEST_QUIZ);
    await page.goto(`/quiz/${quiz.id}/zen`);
    await expect(page.getByText(quiz.questions[0]!.question)).toBeVisible();
    await expect(page.getByText("Saved on this device.").first()).toBeVisible();

    const flag = page.getByRole("button", { name: /flag/i });
    await flag.click();
    await selectAndSubmit(page, "B");
    await page.getByRole("button", { name: /good/i }).click();
    await expect(page.getByText(quiz.questions[1]!.question)).toBeVisible();
    await expectDraft(
      page,
      quiz.id,
      (draft) =>
        draft.current_index === 1 &&
        Array.isArray(draft.answers) &&
        draft.answers.length === 1 &&
        Array.isArray(draft.flagged_question_ids) &&
        draft.flagged_question_ids.includes(quiz.questions[0]!.id),
    );

    await page.reload();
    const dialog = page.getByRole("dialog", { name: "Continue saved quiz?" });
    await expect(dialog).toBeVisible();
    await expect(page.getByText(quiz.questions[1]!.question)).not.toBeVisible();
    await dialog.getByRole("button", { name: "Resume", exact: true }).click();

    await expect(page.getByText(quiz.questions[1]!.question)).toBeVisible();
    await expect(page.getByText(/00:0[1-9]|00:[1-9][0-9]/)).toBeVisible();
  });

  test("continues from the dashboard while truly offline without entering mode selection", async ({
    authenticatedPage: page,
    seedTestQuiz,
    mockedContext: context,
  }) => {
    const quiz = await seedTestQuiz(TEST_QUIZ);
    await page.goto("/");
    await page.evaluate(async () => navigator.serviceWorker.ready);
    if (
      !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    ) {
      await page.reload();
    }
    await page.waitForFunction(() =>
      Boolean(navigator.serviceWorker.controller),
    );
    await page.reload();
    await expect(page.getByText(quiz.title).first()).toBeVisible();
    await page.goto(`/quiz/${quiz.id}/zen`);
    await expect(page.getByText(quiz.questions[0]!.question)).toBeVisible();
    await selectAndSubmit(page, "B");
    await page.getByRole("button", { name: /good/i }).click();
    await expectDraft(page, quiz.id, (draft) => draft.current_index === 1);
    await expect
      .poll(() =>
        page.evaluate(
          async (paths) => {
            const cache = await caches.open("certprep-runtime-v5");
            const urls = (await cache.keys()).map(
              (request) => new URL(request.url).pathname,
            );
            return paths.every((path) => urls.includes(path));
          },
          ["/", `/quiz/${quiz.id}/zen`],
        ),
      )
      .toBe(true);

    await context.setOffline(true);
    try {
      await page.getByRole("button", { name: "Exit quiz" }).click();
      const exitDialog = page.getByRole("dialog", { name: "Exit Quiz?" });
      await exitDialog.getByRole("button", { name: "Exit Quiz" }).click();
      await expect(page).toHaveURL("/");
      const continueButton = page.getByRole("link", {
        name: "Continue Quiz",
      });
      await expect(continueButton).toBeVisible();
      await expect(continueButton).toHaveAttribute(
        "href",
        `/quiz/${quiz.id}/zen`,
      );
      await page.goto(`/quiz/${quiz.id}/zen`);
      await expect(page).toHaveURL(new RegExp(`/quiz/${quiz.id}/zen`));
      await expect(
        page.getByRole("dialog", { name: "Continue saved quiz?" }),
      ).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });

  test("successful completion appends one result and clears the draft", async ({
    authenticatedPage: page,
    seedTestQuiz,
  }) => {
    const quiz = await seedTestQuiz(TEST_QUIZ);
    await page.goto(`/quiz/${quiz.id}/zen`);
    await selectAndSubmit(page, "B");
    await page.getByRole("button", { name: /good/i }).click();
    await selectAndSubmit(page, "C");
    await page.getByRole("button", { name: /good|finish/i }).click();

    await expect(page).toHaveURL(/\/results\//);
    expect(await getDraft(page, quiz.id)).toBeUndefined();
    const resultCount = await page.evaluate(async (quizId) => {
      if (!window.__certprepDb) return 0;
      return window.__certprepDb.results
        .where("[user_id+quiz_id]")
        .equals([localStorage.getItem("cp_guest_user_id")!, quizId])
        .count();
    }, quiz.id);
    expect(resultCount).toBe(1);
  });

  test("Proctor and remixed Zen never create or restore a standard draft", async ({
    authenticatedPage: page,
    seedTestQuiz,
  }) => {
    const quiz = await seedTestQuiz(TEST_QUIZ);
    await page.goto(`/quiz/${quiz.id}/proctor`);
    await expect(page.getByText(quiz.questions[0]!.question)).toBeVisible();
    expect(await getDraft(page, quiz.id)).toBeUndefined();

    await page.goto(`/quiz/${quiz.id}/zen?remix=true`);
    await expect(
      page
        .getByText(
          new RegExp(
            quiz.questions
              .map((question) =>
                question.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              )
              .join("|"),
          ),
        )
        .first(),
    ).toBeVisible();
    await page.waitForTimeout(E2E_TIMEOUTS.ANSWER_PERSIST);
    expect(await getDraft(page, quiz.id)).toBeUndefined();
  });
});
