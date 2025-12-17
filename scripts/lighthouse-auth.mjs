#!/usr/bin/env node
/* eslint-disable no-console -- CLI script uses console for user output */
/**
 * Semi-Automated Lighthouse Testing Script
 * 
 * Opens a visible browser for manual login (with captcha), then runs Lighthouse.
 * 
 * Usage:
 *   node scripts/lighthouse-auth.mjs
 * 
 * Optional in .env.local:
 *   LIGHTHOUSE_BASE_URL       - App URL (default: http://localhost:3000)
 *   LIGHTHOUSE_BRANCH_NAME    - Branch identifier for output files (default: 'current')
 */

import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { config } from 'dotenv';
import * as readline from 'readline';

// Load .env.local
config({ path: '.env.local' });

// Configuration
const CONFIG = {
    baseUrl: process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:3000',
    branchName: process.env.LIGHTHOUSE_BRANCH_NAME || 'current',
    outputDir: './lighthouse-reports',
    pages: [
        { path: '/', name: 'dashboard' },
        { path: '/analytics', name: 'analytics' },
        { path: '/library', name: 'library' },
    ],
};

// Lighthouse configuration
const LIGHTHOUSE_CONFIG = {
    extends: 'lighthouse:default',
    settings: {
        formFactor: 'desktop',
        screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false,
        },
        throttling: {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 1,
        },
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
    },
};

function waitForEnter(prompt) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => {
        rl.question(prompt, () => {
            rl.close();
            resolve();
        });
    });
}

async function runLighthouse(browser, url, pageName) {
    console.log(`\n📊 Running Lighthouse on ${pageName} (${url})...`);

    const { lhr } = await lighthouse(url, {
        port: new URL(browser.wsEndpoint()).port,
        output: 'json',
        logLevel: 'error',
    }, LIGHTHOUSE_CONFIG);

    // Extract key metrics
    const metrics = {
        score: Math.round(lhr.categories.performance.score * 100),
        lcp: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
        cls: lhr.audits['cumulative-layout-shift'].numericValue.toFixed(3),
        tbt: Math.round(lhr.audits['total-blocking-time'].numericValue),
        fcp: Math.round(lhr.audits['first-contentful-paint'].numericValue),
        accessibility: Math.round(lhr.categories.accessibility.score * 100),
    };

    console.log(`   Performance: ${metrics.score}/100`);
    console.log(`   LCP: ${metrics.lcp}ms | CLS: ${metrics.cls} | TBT: ${metrics.tbt}ms`);
    console.log(`   Accessibility: ${metrics.accessibility}/100`);

    return { lhr, metrics };
}

async function main() {
    console.log('🚀 Starting Lighthouse Auth Testing');
    console.log(`   Branch: ${CONFIG.branchName}`);
    console.log(`   Base URL: ${CONFIG.baseUrl}`);
    console.log(`   Pages: ${CONFIG.pages.map(p => p.name).join(', ')}\n`);

    // Create output directory
    if (!existsSync(CONFIG.outputDir)) {
        mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // Launch VISIBLE browser for manual login
    const browser = await puppeteer.launch({
        headless: false,  // Visible browser!
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
        defaultViewport: null,
    });

    try {
        const page = await browser.newPage();

        // Navigate to login page
        await page.goto(`${CONFIG.baseUrl}/login`, { waitUntil: 'networkidle0' });

        console.log('');
        console.log('🔐 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   Please log in manually in the browser window.');
        console.log('   Complete the captcha and wait until you see the dashboard.');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');

        await waitForEnter('Press ENTER here after you are logged in and see the dashboard... ');

        // Verify login succeeded
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
            throw new Error('Still on login page. Please log in first.');
        }

        console.log('✅ Login confirmed! Starting Lighthouse tests...\n');

        // Wait a moment for any data loading
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Run Lighthouse on each page
        const results = {};

        for (const { path, name } of CONFIG.pages) {
            const url = `${CONFIG.baseUrl}${path}`;

            // Navigate to page first
            await page.goto(url, { waitUntil: 'networkidle0' });

            // Run Lighthouse
            const { lhr, metrics } = await runLighthouse(browser, url, name);
            results[name] = metrics;

            // Save full report
            const filename = `${CONFIG.outputDir}/lighthouse-${CONFIG.branchName}-${name}.json`;
            writeFileSync(filename, JSON.stringify(lhr, null, 2));
            console.log(`   Saved: ${filename}`);
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📈 SUMMARY');
        console.log('='.repeat(60));
        console.log(`Branch: ${CONFIG.branchName}\n`);

        console.log('Page           | Score | LCP    | CLS   | TBT   | A11y');
        console.log('---------------|-------|--------|-------|-------|------');

        for (const [name, m] of Object.entries(results)) {
            const row = [
                name.padEnd(14),
                String(m.score).padStart(5),
                `${m.lcp}ms`.padStart(6),
                String(m.cls).padStart(5),
                `${m.tbt}ms`.padStart(5),
                String(m.accessibility).padStart(4),
            ].join(' | ');
            console.log(row);
        }

        // Save summary
        const summaryFile = `${CONFIG.outputDir}/summary-${CONFIG.branchName}.json`;
        writeFileSync(summaryFile, JSON.stringify({
            branch: CONFIG.branchName,
            timestamp: new Date().toISOString(),
            results,
        }, null, 2));
        console.log(`\n✅ Summary saved: ${summaryFile}`);

    } finally {
        await browser.close();
    }
}

main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});