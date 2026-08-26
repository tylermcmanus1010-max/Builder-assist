#!/usr/bin/env node
// Operational check for published Builder Assist artifacts.
//
// Artifact HTML downloaded via the Artifact tool is wrapped in the claude.ai
// frame runtime: an injected <script> block and a <base href="/_f/..."> that
// rewrites every relative URL. Loading that verbatim from disk fails on the
// wrapper, not on the page. We strip the wrapper first so the failures we
// report are the page's own.

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

// Playwright may only be installed globally (as it is in the Claude Code web
// sandbox). ESM ignores NODE_PATH, so resolve it through require and fall back
// to the global root before giving up.
function loadPlaywright() {
  const req = createRequire(import.meta.url);
  const candidates = ['playwright', 'playwright-core'];
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    candidates.push(`${globalRoot}/playwright`, `${globalRoot}/playwright-core`);
  } catch {}
  for (const c of candidates) {
    try { return req(c); } catch {}
  }
  throw new Error('playwright not found; tried: ' + candidates.join(', '));
}
const { chromium } = loadPlaywright();
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const FRAME_RUNTIME = /<!-- frame-runtime -->[\s\S]*?<!-- \/frame-runtime -->/g;
const BASE_TAG = /<base\s+href="\/_f\/[^"]*"\s*>/g;

function unwrap(html) {
  const stripped = html.replace(FRAME_RUNTIME, '').replace(BASE_TAG, '');
  return {
    html: stripped,
    frameRuntimeRemoved: stripped.length !== html.length,
    bytesRemoved: html.length - stripped.length,
  };
}

// Capabilities the page expects the shell to provide. Stripped along with the
// runtime, so a page that calls these is not broken -- it is untestable offline
// and gets flagged rather than failed.
function detectCapabilities(html) {
  const hits = new Set();
  for (const m of html.matchAll(/window\.claude\.(\w+)/g)) hits.add(m[1]);
  for (const m of html.matchAll(/claude\.use\(['"](\w+)['"]\)/g)) hits.add(m[1]);
  return [...hits];
}

async function verify(page, file, outDir) {
  const raw = await readFile(file, 'utf8');
  const { html, frameRuntimeRemoved, bytesRemoved } = unwrap(raw);
  const capabilities = detectCapabilities(html);

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 300)));
  page.on('requestfailed', (r) => {
    failedRequests.push({ url: r.url().slice(0, 200), reason: r.failure()?.errorText });
  });

  const tmp = join(outDir, basename(file).replace(/\.html$/, '.unwrapped.html'));
  await writeFile(tmp, html);

  const started = Date.now();
  await page.goto('file://' + tmp, { waitUntil: 'load', timeout: 45000 });
  // Give deferred/animated content a beat to run and throw if it is going to.
  await page.waitForTimeout(2500);
  const loadMs = Date.now() - started;

  const metrics = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const anchors = [...document.querySelectorAll('a[href]')];
    return {
      title: document.title,
      scrollHeight: document.documentElement.scrollHeight,
      textLength: (document.body.innerText || '').trim().length,
      elements: document.querySelectorAll('*').length,
      buttons: document.querySelectorAll('button').length,
      visibleButtons: [...document.querySelectorAll('button')].filter(vis).length,
      inputs: document.querySelectorAll('input,select,textarea').length,
      images: document.querySelectorAll('img').length,
      brokenImages: [...document.querySelectorAll('img')].filter(
        (i) => i.complete && i.naturalWidth === 0
      ).length,
      anchors: anchors.length,
      // '#/foo' is a client-side route, not an element id -- exercised
      // separately below. Only bare '#foo' is a real in-page anchor.
      deadAnchors: anchors
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && h.startsWith('#') && h.length > 1 && !h.startsWith('#/'))
        .filter((h) => {
          try { return !document.querySelector(h); } catch { return true; }
        }),
      routes: [...new Set(anchors
        .map((a) => a.getAttribute('href'))
        .filter((h) => h && h.startsWith('#/')))],
    };
  });

  // Walk the hash routes. A route that paints nothing, or throws on entry,
  // is a broken screen even though the initial load looked fine.
  const routeResults = [];
  for (const route of metrics.routes) {
    const before = pageErrors.length;
    let painted = null;
    try {
      await page.evaluate((r) => { window.location.hash = r.slice(1); }, route);
      await page.waitForTimeout(700);
      painted = await page.evaluate(() => ({
        text: (document.body.innerText || '').trim().length,
        height: document.documentElement.scrollHeight,
      }));
    } catch (e) {
      routeResults.push({ route, ok: false, why: 'navigation threw: ' + e.message });
      continue;
    }
    const threw = pageErrors.length - before;
    const ok = threw === 0 && painted.text >= 200 && painted.height >= 400;
    routeResults.push({
      route,
      ok,
      textLength: painted.text,
      ...(threw ? { jsErrors: threw } : {}),
      ...(ok ? {} : { why: threw ? 'threw on entry' : 'rendered blank' }),
    });
  }
  // Return to the entry screen before screenshotting.
  try {
    await page.evaluate(() => { window.location.hash = ''; });
    await page.waitForTimeout(500);
  } catch {}

  await page.screenshot({
    path: join(outDir, basename(file).replace(/\.html$/, '.png')),
    fullPage: false,
  });

  // A page that loads but paints nothing is not operational.
  const blank = metrics.scrollHeight < 400 || metrics.textLength < 200;

  const problems = [];
  if (blank) problems.push('renders blank or near-empty');
  if (pageErrors.length) problems.push(`${pageErrors.length} uncaught JS error(s)`);
  if (consoleErrors.length) problems.push(`${consoleErrors.length} console error(s)`);
  if (metrics.brokenImages) problems.push(`${metrics.brokenImages} broken image(s)`);
  if (metrics.deadAnchors.length)
    problems.push(`${metrics.deadAnchors.length} dead in-page link(s)`);
  const brokenRoutes = routeResults.filter((r) => !r.ok);
  if (brokenRoutes.length)
    problems.push(`${brokenRoutes.length}/${routeResults.length} route(s) broken`);
  if (failedRequests.length) problems.push(`${failedRequests.length} failed request(s)`);

  return {
    file: basename(file),
    status: problems.length === 0 ? 'PASS' : blank || pageErrors.length ? 'FAIL' : 'WARN',
    problems,
    capabilities,
    frameRuntimeRemoved,
    bytesRemoved,
    loadMs,
    routes: routeResults,
    metrics,
    consoleErrors: consoleErrors.slice(0, 10),
    pageErrors: pageErrors.slice(0, 10),
    failedRequests: failedRequests.slice(0, 10),
  };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: verify-artifacts.mjs <file.html> [...]');
  process.exit(2);
}

const outDir = process.env.OUT_DIR || '.';
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
});
const results = [];
for (const f of files) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    results.push(await verify(page, f, outDir));
  } catch (e) {
    results.push({ file: basename(f), status: 'FAIL', problems: ['harness error: ' + e.message] });
  }
  await ctx.close();
}
await browser.close();

await writeFile(join(outDir, 'report.json'), JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(`${r.status.padEnd(4)} ${r.file}  ${r.problems.join('; ') || 'clean'}`);
}
