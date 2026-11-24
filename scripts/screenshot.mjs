#!/usr/bin/env node
/**
 * Renders demo/index.html in Chromium, checks the widgets behave, and saves
 * docs/widget.png for the README. Needs a Playwright Chromium
 * (npx playwright install chromium).
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const demo = new URL("../demo/index.html", import.meta.url).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 2, colorScheme: "light" });
const requests = [];
page.on("request", (r) => requests.push(r.url()));
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(demo);

const hosts = page.locator(".tps-peptide-calculator");
const count = await hosts.count();
const results = [];
for (let i = 0; i < count; i++) results.push(await hosts.nth(i).locator(".result").innerText());

// Type into the empty widget like a person would.
const empty = hosts.nth(2);
await empty.locator('input[name="vial"]').fill("10");
await empty.locator('input[name="water"]').fill("2");
await empty.locator('input[name="dose"]').fill("2");
await empty.locator('select[name="doseUnit"]').selectOption("mg");
const typed = await empty.locator(".result").innerText();
const footer = await hosts.nth(0).locator("a.powered").getAttribute("href");

await page.locator("main").screenshot({ path: fileURLToPath(new URL("../docs/widget.png", import.meta.url)) });

// Phone width: no horizontal scroll.
await page.setViewportSize({ width: 375, height: 800 });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

await browser.close();

const offsite = requests.filter((u) => !u.startsWith("file:"));
console.log(JSON.stringify({ widgets: count, results, typed, footer, offsiteRequests: offsite, pageErrors: errors, phoneOverflowPx: overflow }, null, 2));
if (count !== 3 || errors.length || offsite.length || overflow > 0) process.exit(1);
