#!/usr/bin/env node
/* eslint-disable no-console -- CLI script uses console for user output */
/**
 * Headless Lighthouse runner that seeds local IndexedDB via window.__certprepDb.
 *
 * Intended for CLS validation without manual login/captcha.
 *
 * Prerequisites:
 * - App running with NEXT_PUBLIC_IS_E2E=true (exposes window.__certprepDb in dev)
 * - Base URL reachable (default: http://localhost:3100)
 */

import puppeteer from "puppeteer";
import lighthouse from "lighthouse";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { parseArgs, resolveViewport, resolveFormFactor } from "./lib/cli-utils.mjs";

const DEFAULT_BASE_URL = "http://localhost:3100";

function buildLighthouseConfig({ viewport, formFactor }) {
  const isMobile = formFactor === "mobile";
  return {
    extends: "lighthouse:default",
    settings: {
      formFactor,
      screenEmulation: {
        mobile: isMobile,
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        disabled: false,
      },
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
      disableStorageReset: true,
      onlyCategories: ["performance", "accessibility", "best-practices"],
    },
  };
}

async function seed(page, { baseUrl, guestUserId, quizCount, dueCount, resultCount }) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => Boolean(window.__certprepDb), { timeout: 30_000 });

  const res = await page.evaluate(async (input) => {
    const db = window.__certprepDb;
    if (!db) {
      return { ok: false, error: "window.__certprepDb is not available (set NEXT_PUBLIC_IS_E2E=true)" };
    }

    const userId = input.guestUserId;
    localStorage.setItem("cp_guest_user_id", userId);
    const now = Date.now();
    await db.open();

    await Promise.all([
      db.quizzes.where("user_id").equals(userId).delete(),
      db.results.where("user_id").equals(userId).delete(),
      db.srs.where("user_id").equals(userId).delete(),
    ]);

    const makeQuestion = (index) => {
      const id = crypto.randomUUID();
      return {
        id,
        category: "General",
        difficulty: "Easy",
        question: `Question ${index + 1}?`,
        options: { a: "Option A", b: "Option B", c: "Option C", d: "Option D" },
        explanation: "Explanation",
      };
    };

    const makeQuiz = (index) => {
      const quizId = crypto.randomUUID();
      const questions = Array.from({ length: 6 }).map((_, qIndex) => makeQuestion(qIndex));
      return {
        id: quizId,
        user_id: userId,
        title: `Quiz ${index + 1}`,
        description: "Seeded quiz for Lighthouse",
        created_at: now - index * 1000,
        updated_at: now - index * 1000,
        questions,
        tags: ["seed"],
        version: 1,
        deleted_at: null,
        quiz_hash: quizId,
        last_synced_at: null,
        last_synced_version: null,
        category: "Seed",
        subcategory: "Lighthouse",
      };
    };

    const quizzes = Array.from({ length: input.quizCount }).map((_, i) => makeQuiz(i));
    if (quizzes.length > 0) await db.quizzes.bulkPut(quizzes);

    const results = [];
    const targetResults = Math.max(0, input.resultCount ?? 0);
    if (targetResults > 0 && quizzes.length > 0) {
      const primaryQuiz = quizzes[0];
      const questionIds = primaryQuiz.questions.map((q) => q.id);
      for (let i = 0; i < targetResults; i += 1) {
        const resultId = crypto.randomUUID();
        const timestamp = now - i * 86_400_000;
        const answers = {};
        for (const qId of questionIds) answers[qId] = "a";
        results.push({
          id: resultId,
          quiz_id: primaryQuiz.id,
          user_id: userId,
          timestamp,
          mode: i % 2 === 0 ? "zen" : "proctor",
          score: 70 + (i % 4) * 5,
          time_taken_seconds: 120 + i * 10,
          answers,
          flagged_questions: [],
          category_breakdown: { General: 1 },
          computed_category_scores: {
            General: { correct: Math.max(0, questionIds.length - 2), total: questionIds.length },
          },
          synced: 0,
        });
      }
      await db.results.bulkPut(results);
    }

    const dueEntries = [];
    const dueTarget = Math.max(0, input.dueCount ?? 0);
    let dueAdded = 0;

    for (const quiz of quizzes) {
      for (const question of quiz.questions) {
        if (dueAdded >= dueTarget) break;
        dueEntries.push({
          question_id: question.id,
          user_id: userId,
          box: 1,
          last_reviewed: now - 86_400_000,
          next_review: now - 1000,
          consecutive_correct: 0,
          synced: 0,
          updated_at: now,
        });
        dueAdded += 1;
      }
      if (dueAdded >= dueTarget) break;
    }

    if (dueEntries.length > 0) await db.srs.bulkPut(dueEntries);

    return { ok: true, userId, quizCount: quizzes.length, resultCount: results.length, dueCount: dueEntries.length };
  }, { guestUserId, quizCount, dueCount, resultCount });

  if (!res.ok) throw new Error(res.error || "Seed failed");
  return res;
}

async function runLighthouse(browser, url, config) {
  const { lhr } = await lighthouse(
    url,
    {
      port: new URL(browser.wsEndpoint()).port,
      output: "json",
      logLevel: "error",
    },
    config,
  );

  const metrics = {
    score: Math.round((lhr.categories?.performance?.score ?? 0) * 100),
    lcp: Math.round(lhr.audits?.["largest-contentful-paint"]?.numericValue ?? 0),
    cls: Number((lhr.audits?.["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3)),
    tbt: Math.round(lhr.audits?.["total-blocking-time"]?.numericValue ?? 0),
    fcp: Math.round(lhr.audits?.["first-contentful-paint"]?.numericValue ?? 0),
    accessibility: Math.round((lhr.categories?.accessibility?.score ?? 0) * 100),
  };

  return { lhr, metrics };
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = String(args.get("--baseUrl") || process.env.LIGHTHOUSE_BASE_URL || DEFAULT_BASE_URL);
  const branchName = String(args.get("--name") || process.env.LIGHTHOUSE_BRANCH_NAME || "cls-fixes");
  const outputDir = String(args.get("--outDir") || "lighthouse-reports");
  const viewport = resolveViewport(args);
  const formFactor = resolveFormFactor(args, viewport);

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    const lighthouseConfig = buildLighthouseConfig({ viewport, formFactor });

    const pages = [
      { name: "dashboard", path: "/", seed: { quizCount: 8, dueCount: 3, resultCount: 0 } },
      { name: "analytics", path: "/analytics", seed: { quizCount: 6, dueCount: 0, resultCount: 10 } },
      { name: "library", path: "/library", seed: { quizCount: 8, dueCount: 0, resultCount: 0 } },
    ];

    const results = {};

    for (const p of pages) {
      const guestUserId = `guest-lighthouse-${p.name}`;
      console.log(`\n🧪 Seeding ${p.name} (quizzes=${p.seed.quizCount}, results=${p.seed.resultCount}, due=${p.seed.dueCount})`);
      await seed(page, { baseUrl, guestUserId, ...p.seed });

      const url = `${baseUrl}${p.path}`;
      console.log(`📊 Lighthouse: ${p.name} (${url})`);
      const { lhr, metrics } = await runLighthouse(browser, url, lighthouseConfig);
      results[p.name] = metrics;

      const filename = `${outputDir}/lighthouse-${branchName}-${p.name}.json`;
      writeFileSync(filename, JSON.stringify(lhr, null, 2));
      console.log(`   CLS=${metrics.cls} LCP=${metrics.lcp}ms Score=${metrics.score} Saved=${filename}`);
    }

    const summaryFile = `${outputDir}/summary-${branchName}.json`;
    writeFileSync(
      summaryFile,
      JSON.stringify(
        { branch: branchName, timestamp: new Date().toISOString(), viewport, formFactor, results },
        null,
        2,
      ),
    );
    console.log(`\n✅ Summary saved: ${summaryFile}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("\n❌ Lighthouse E2E failed:", error?.message || String(error));
  process.exit(1);
});
