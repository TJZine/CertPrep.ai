#!/usr/bin/env node
/* eslint-disable no-console -- CLI script uses console for user output */
/**
 * CLS audit helper for CertPrep.ai (headless).
 *
 * Goals:
 * - Validate which elements contribute to layout shifts (Phase 1)
 * - Measure rendered heights for key containers (Phase 2)
 * - Support multiple data states by seeding IndexedDB via window.__certprepDb (E2E-only)
 *
 * Prerequisites:
 * - Dev server running with NEXT_PUBLIC_IS_E2E=true
 * - App accessible at baseUrl (default: http://localhost:3100)
 */

import puppeteer from "puppeteer";
import path from "path";

const DEFAULT_BASE_URL = "http://localhost:3100";
const DEFAULT_VIEWPORT = { width: 1350, height: 940 };

function parseArgs(argv) {
  const args = new Map();
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key || !key.startsWith("--")) continue;
    if (!value || value.startsWith("--")) {
      args.set(key, true);
      i -= 1;
      continue;
    }
    args.set(key, value);
  }
  return args;
}

function parseViewport(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{2,5})x(\d{2,5})$/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width < 200 || height < 200) return null;
  return { width, height };
}

function resolveViewport(args) {
  const preset = args.get("--preset");
  if (preset === "mobile") return { width: 390, height: 844 };
  if (preset === "ipad") return { width: 820, height: 1180 };
  if (preset === "desktop") return { ...DEFAULT_VIEWPORT };

  const viewportArg = args.get("--viewport");
  const parsed = parseViewport(typeof viewportArg === "string" ? viewportArg : "");
  if (parsed) return parsed;

  const widthArg = args.get("--width");
  const heightArg = args.get("--height");
  if (typeof widthArg === "string" && typeof heightArg === "string") {
    const width = Number(widthArg);
    const height = Number(heightArg);
    if (Number.isFinite(width) && Number.isFinite(height) && width >= 200 && height >= 200) {
      return { width, height };
    }
  }

  return { ...DEFAULT_VIEWPORT };
}

function formatNumber(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
  return `${Math.round(value)}px`;
}

async function collectScenario(page, scenario) {
  const url = `${scenario.baseUrl}${scenario.path}`;

  await page.goto(url, { waitUntil: "networkidle0" });

  // Wait for hydration to swap skeleton -> content where applicable.
  await page.waitForFunction(
    () => document.readyState === "complete",
    { timeout: 30_000 },
  );
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const metrics = await page.evaluate(() => {
    const shifts = Array.isArray(window.__clsAudit?.shifts) ? window.__clsAudit.shifts : [];
    const total = shifts.reduce((sum, s) => sum + (typeof s.value === "number" ? s.value : 0), 0);

    const byLabel = new Map();
    for (const shift of shifts) {
      const value = typeof shift.value === "number" ? shift.value : 0;
      const sources = Array.isArray(shift.sources) ? shift.sources : [];
      for (const src of sources) {
        const label = typeof src?.label === "string" ? src.label : "unknown";
        byLabel.set(label, (byLabel.get(label) || 0) + value);
      }
    }

    const topSources = Array.from(byLabel.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ label, value: Number(value.toFixed(4)) }));

    const getHeight = (selector) => document.querySelector(selector)?.offsetHeight ?? null;

    // Use data-testid for stable selectors (preferred for E2E tooling)
    const heightOfCard = (testId) => {
      const card = document.querySelector(`[data-testid="${testId}"]`);
      return card ? card.offsetHeight : null;
    };

    return {
      cls: Number(total.toFixed(4)),
      shiftCount: shifts.length,
      topSources,
      heights: {
        // Use data-testid for stable selectors (preferred for E2E tooling)
        dashboardMain: getHeight("[data-testid='dashboard-shell']") ?? getHeight("main.mx-auto"),
        statsBar: heightOfCard("stats-bar") ?? heightOfCard("stats-bar-empty"),
        quizGrid: heightOfCard("quiz-grid"),
        analyticsMain: getHeight("[data-testid='analytics-main']") ?? getHeight(".mx-auto.max-w-7xl"),
        examReadinessCard: heightOfCard("exam-readiness-card"),
        streakCard: heightOfCard("streak-card"),
        performanceHistoryCard: heightOfCard("performance-history-card"),
        libraryMain: getHeight("[data-testid='library-main']") ?? getHeight("main.mx-auto"),
      },
    };
  });

  return { url, scenarioName: scenario.name, ...metrics };
}

async function seedUserData(page, { baseUrl, guestUserId, quizCount, dueCount, resultCount }) {
  await page.goto("about:blank");
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle0" });

  await page.waitForFunction(() => Boolean(window.__certprepDb), { timeout: 30_000 });

  const seedResult = await page.evaluate(async (input) => {
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
        description: "Seeded quiz for CLS audit",
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
        subcategory: "Audit",
      };
    };

    const quizzes = Array.from({ length: input.quizCount }).map((_, i) => makeQuiz(i));
    if (quizzes.length > 0) {
      await db.quizzes.bulkPut(quizzes);
    }

    const results = [];
    const targetResults = Math.max(0, input.resultCount ?? 0);
    if (targetResults > 0 && quizzes.length > 0) {
      const primaryQuiz = quizzes[0];
      const questionIds = primaryQuiz.questions.map((q) => q.id);
      for (let i = 0; i < targetResults; i += 1) {
        const resultId = crypto.randomUUID();
        const timestamp = now - i * 86_400_000; // one per day
        const answers = {};
        const categoryScores = {};

        for (const qId of questionIds) {
          answers[qId] = "a";
        }
        categoryScores.General = { correct: Math.max(0, questionIds.length - 2), total: questionIds.length };

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
          computed_category_scores: categoryScores,
          synced: 0,
        });
      }
      await db.results.bulkPut(results);
    }

    // Seed due questions by creating SRS entries for some of the quiz questions.
    const dueEntries = [];
    const dueTarget = Math.max(0, input.dueCount);
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

    if (dueEntries.length > 0) {
      await db.srs.bulkPut(dueEntries);
    }

    return {
      ok: true,
      userId,
      quizCount: quizzes.length,
      resultCount: results.length,
      dueCount: dueEntries.length,
    };
  }, { guestUserId, quizCount, dueCount, resultCount });

  if (!seedResult.ok) {
    throw new Error(seedResult.error || "Failed to seed data");
  }

  return seedResult;
}

async function newAuditPage(browser, { guestUserId, viewport }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);

  // Ensure deterministic guest id and install layout shift observer for each navigation.
  await page.evaluateOnNewDocument((id) => {
    try {
      localStorage.setItem("cp_guest_user_id", id);
    } catch {
      // ignore
    }

    window.__clsAudit = { shifts: [] };

    const labelForNode = (node) => {
      if (!(node instanceof Element)) return "unknown";
      const tag = node.tagName.toLowerCase();
      const nodeId = node.id ? `#${node.id}` : "";
      const className =
        typeof node.className === "string"
          ? node.className.trim().split(/\s+/).slice(0, 5).join(".")
          : "";
      const classes = className ? `.${className}` : "";
      return `${tag}${nodeId}${classes}`;
    };

    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          const sources = Array.isArray(entry.sources)
            ? entry.sources.map((src) => ({
              label: labelForNode(src.node),
              previousRect: src.previousRect
                ? { x: src.previousRect.x, y: src.previousRect.y, w: src.previousRect.width, h: src.previousRect.height }
                : null,
              currentRect: src.currentRect
                ? { x: src.currentRect.x, y: src.currentRect.y, w: src.currentRect.width, h: src.currentRect.height }
                : null,
            }))
            : [];

          window.__clsAudit.shifts.push({
            value: entry.value,
            startTime: entry.startTime,
            sources,
          });
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // No-op: PerformanceObserver may not support layout-shift in some environments.
    }
  }, guestUserId);

  return page;
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = String(args.get("--baseUrl") || process.env.CLS_AUDIT_BASE_URL || DEFAULT_BASE_URL);
  const viewport = resolveViewport(args);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: viewport,
  });

  try {
    const scenarios = [
      { name: "dashboard-0", path: "/", quizCount: 0, dueCount: 0 },
      { name: "dashboard-6", path: "/", quizCount: 6, dueCount: 0 },
      { name: "dashboard-8", path: "/", quizCount: 8, dueCount: 0 },
      { name: "dashboard-8-due", path: "/", quizCount: 8, dueCount: 3 },
      { name: "library-0", path: "/library", quizCount: 0, dueCount: 0 },
      { name: "library-6", path: "/library", quizCount: 6, dueCount: 0 },
      { name: "library-8", path: "/library", quizCount: 8, dueCount: 0 },
      { name: "analytics-10", path: "/analytics", quizCount: 6, dueCount: 0, resultCount: 10 },
    ].map((s) => ({ ...s, baseUrl }));

    const results = [];

    for (const scenario of scenarios) {
      const guestUserId = `guest-cls-audit-${scenario.name}`;
      const page = await newAuditPage(browser, { guestUserId, viewport });
      console.log(
        `\n🧪 Seeding: ${scenario.name} (quizzes=${scenario.quizCount}, results=${scenario.resultCount ?? 0}, due=${scenario.dueCount})`,
      );
      await seedUserData(page, {
        baseUrl,
        guestUserId,
        quizCount: scenario.quizCount,
        dueCount: scenario.dueCount,
        resultCount: scenario.resultCount ?? 0,
      });

      console.log(`📍 Measuring: ${scenario.path}`);
      results.push(await collectScenario(page, scenario));
      await page.close();
    }

    console.log("\n" + "=".repeat(72));
    console.log("CLS AUDIT SUMMARY");
    console.log("=".repeat(72));
    for (const r of results) {
      const mainHeight =
        r.scenarioName.startsWith("library")
          ? formatNumber(r.heights.libraryMain)
          : formatNumber(r.heights.dashboardMain);
      console.log(`${r.scenarioName.padEnd(16)} CLS=${String(r.cls).padEnd(7)} shifts=${String(r.shiftCount).padEnd(4)} main=${mainHeight}`);
    }

    const outputPath = String(args.get("--out") || "lighthouse-reports/cls-audit.json");
    await import("fs").then(({ mkdirSync, writeFileSync, existsSync }) => {
      const dir = path.dirname(path.resolve(outputPath)) || ".";
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(outputPath, JSON.stringify({ baseUrl, viewport, results }, null, 2));
    });
    console.log(`\n✅ Saved: ${outputPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("\n❌ CLS audit failed:", error?.message || String(error));
  process.exit(1);
});
