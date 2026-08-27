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
import { basename, dirname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

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

// Published artifacts run under a CSP that blocks every external host except
// Google Fonts. A reference to anything else is broken for real viewers even
// when the host is alive and reachable from a dev machine, so this is checked
// statically against the source rather than inferred from request failures --
// a sandbox without network egress fails the allowed hosts too, and a sandbox
// with egress would let a blocked host silently pass.
const CSP_ALLOWED_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

function findExternalRefs(html) {
  const refs = new Map();
  const add = (url, kind) => {
    let host;
    try { host = new URL(url).hostname; } catch { return; }
    const key = host + '|' + kind;
    if (!refs.has(key))
      refs.set(key, { host, kind, allowed: CSP_ALLOWED_HOSTS.has(host), examples: [] });
    const e = refs.get(key);
    if (e.examples.length < 3) e.examples.push(url.slice(0, 160));
  };

  // Subresources: fetched by the page, so CSP applies.
  const SUBRESOURCE_TAGS = 'link|script|img|iframe|source|video|audio|embed|object|track|input';
  const tagRe = new RegExp(
    `<(?:${SUBRESOURCE_TAGS})\\b[^>]*?\\b(?:src|href|data|poster)\\s*=\\s*["'](https?:\\/\\/[^"']+)["']`,
    'gi'
  );
  for (const m of html.matchAll(tagRe)) add(m[1], 'subresource');
  for (const m of html.matchAll(/url\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi))
    add(m[1], 'subresource');
  for (const m of html.matchAll(/(?:fetch|importScripts)\s*\(\s*["'](https?:\/\/[^"']+)["']/gi))
    add(m[1], 'subresource');

  // Navigation targets: <a>/<area> hrefs open a new page rather than loading
  // into this one, so CSP does not block them. Recorded, never a defect.
  for (const m of html.matchAll(
    /<(?:a|area)\b[^>]*?\bhref\s*=\s*["'](https?:\/\/[^"']+)["']/gi
  ))
    add(m[1], 'navigation');

  return [...refs.values()];
}

// Capabilities the page expects the shell to provide. Stripped along with the
// runtime, so a page that calls these is not broken -- it is untestable offline
// and gets flagged rather than failed.
function detectCapabilities(html) {
  const hits = new Set();
  for (const m of html.matchAll(/window\.claude\??\.(?!use\b)(\w+)/g)) hits.add(m[1]);
  // Both claude.use('x') and the defensive claude?.use?.('x').
  for (const m of html.matchAll(/claude\??\.use\??\.?\(\s*['"](\w+)['"]\s*\)/g)) hits.add(m[1]);
  return [...hits];
}

async function verify(page, file, outDir) {
  const raw = await readFile(file, 'utf8');
  const unwrapped = unwrap(raw);
  let { html } = unwrapped;
  const { frameRuntimeRemoved, bytesRemoved } = unwrapped;
  // The report copy lives outside the source directory. Preserve the source
  // directory as the base so checked-in relative scripts, styles, JSON, and
  // iframes are exercised instead of producing false missing-file failures.
  const sourceBase = pathToFileURL(resolve(dirname(file)) + sep).href;
  if (!/<base\b/i.test(html)) html = html.replace(/<head([^>]*)>/i, `<head$1><base href="${sourceBase}">`);
  const artifactKey = `${basename(dirname(file))}-${basename(file, '.html')}`;
  const capabilities = detectCapabilities(html);
  const externalRefs = findExternalRefs(html);
  const cspBlocked = externalRefs.filter((r) => r.kind === 'subresource' && !r.allowed);
  // <img onerror="this.remove()"> and friends mean a blocked image degrades to
  // whatever the CSS draws underneath instead of leaving a broken-image box.
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  const externalImgs = imgTags.filter((t) => /src\s*=\s*["']https?:\/\//i.test(t));
  const guardedImgs = externalImgs.filter((t) => /\bonerror\s*=/i.test(t));
  const fallback = {
    externalImages: externalImgs.length,
    withOnErrorFallback: guardedImgs.length,
    unguarded: externalImgs.length - guardedImgs.length,
  };

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

  const tmp = join(outDir, `${artifactKey}.unwrapped.html`);
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
    path: join(outDir, `${artifactKey}.png`),
    fullPage: false,
  });

  // Dead-control sweep. An element-level scan cannot see delegated handlers,
  // so first check window/document/body: if a click is handled there, a
  // handler-less button may still work and per-element judgment is unreliable.
  const controls = await (async () => {
    const client = await page.context().newCDPSession(page);
    const evalObj = async (expr) => {
      const { result } = await client.send('Runtime.evaluate', { expression: expr });
      return result.objectId;
    };
    const listeners = async (objectId, types) => {
      if (!objectId) return [];
      try {
        const { listeners } = await client.send('DOMDebugger.getEventListeners', { objectId });
        return listeners.filter((l) => types.includes(l.type));
      } catch { return []; }
    };
    const delegated =
      (await listeners(await evalObj('window'), ['click'])).length +
      (await listeners(await evalObj('document'), ['click'])).length +
      (await listeners(await evalObj('document.body'), ['click'])).length;

    // Candidates: visible buttons and selects not obviously wired (no inline
    // handler, not a form submitter, not inside <a>/<label>/<summary>).
    const nControls = await page.evaluate(() => {
      const vis = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      window.__va_ctl = [...document.querySelectorAll('button, select')].filter(
        (el) =>
          vis(el) &&
          !el.disabled &&
          !el.closest('a,label,summary,form') &&
          !(el.tagName === 'BUTTON' && el.type === 'submit') &&
          !el.onclick && !el.onchange && !el.oninput &&
          !el.hasAttribute('onclick') && !el.hasAttribute('onchange')
      );
      return window.__va_ctl.length;
    });
    const forms = await page.evaluate(() => {
      window.__va_form = [...document.querySelectorAll('form')];
      return window.__va_form.map((f) => ({
        action: f.getAttribute('action') || '',
        inline: !!(f.onsubmit || f.hasAttribute('onsubmit')),
      }));
    });

    const dead = [];
    const cache = new Map();
    for (let i = 0; i < Math.min(nControls, 200); i++) {
      // The element and up to 6 ancestors: a handler anywhere on that chain
      // catches the bubbled event.
      let wired = false;
      for (let d = 0; d <= 6 && !wired; d++) {
        const expr = `window.__va_ctl[${i}]${'.parentElement'.repeat(d)}`;
        const path = await page.evaluate(
          (e) => { try { const el = eval(e); return el ? (el.__va_id ??= Math.random()) : null; } catch { return null; } },
          expr
        );
        if (path === null) break;
        if (cache.has(path)) { wired = cache.get(path); if (wired) break; continue; }
        const has =
          (await listeners(await evalObj(expr), ['click', 'change', 'input', 'pointerdown', 'mousedown'])).length > 0;
        cache.set(path, has);
        if (has) wired = true;
      }
      if (!wired) {
        const label = await page.evaluate(
          (i) => {
            const el = window.__va_ctl[i];
            return `<${el.tagName.toLowerCase()}> "${(el.innerText || el.value || el.className || '').trim().slice(0, 60)}"`;
          },
          i
        );
        dead.push(label);
      }
    }

    // A form is dead if nothing handles submit: no action, no inline handler,
    // no addEventListener('submit') on the form itself or document.
    const deadForms = [];
    for (let i = 0; i < forms.length; i++) {
      if (forms[i].action || forms[i].inline) continue;
      const own = (await listeners(await evalObj(`window.__va_form[${i}]`), ['submit'])).length;
      const doc = (await listeners(await evalObj('document'), ['submit'])).length;
      if (!own && !doc) deadForms.push(`form[${i}] (no action, no submit handler)`);
    }
    await client.detach().catch(() => {});
    return { delegatedClickHandlers: delegated, candidatesChecked: Math.min(nControls, 200), dead, deadForms };
  })().catch((e) => ({ error: 'control sweep failed: ' + e.message }));

  // Mobile pass: 390px wide. The page body must never scroll horizontally.
  const mobile = await (async () => {
    const ctx2 = await page.context().browser().newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const p2 = await ctx2.newPage();
    try {
      await p2.goto('file://' + tmp, { waitUntil: 'load', timeout: 45000 });
      await p2.waitForTimeout(1500);
      const measure = () =>
        p2.evaluate(() => {
          const doc = document.documentElement;
          const overflowX = doc.scrollWidth - doc.clientWidth;
          const wide = [];
          if (overflowX > 2) {
            for (const el of document.querySelectorAll('body *')) {
              const rect = el.getBoundingClientRect();
              if (rect.width > doc.clientWidth + 2 && wide.length < 8) {
                const id = el.id ? '#' + el.id : '';
                const cls = el.className && typeof el.className === 'string'
                  ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
                wide.push(`${el.tagName.toLowerCase()}${id}${cls} (${Math.round(rect.width)}px)`);
              }
            }
          }
          return { overflowX, wide, scrollHeight: doc.scrollHeight };
        });
      const r = await measure();
      // Overflow can hide on a route the entry screen never shows (this is how
      // the estimator screen's 178px overflow was missed at first) -- walk the
      // same hash routes at this width too.
      r.routes = [];
      for (const route of metrics.routes) {
        try {
          await p2.evaluate((h) => { window.location.hash = h.slice(1); }, route);
          await p2.waitForTimeout(600);
          const m = await measure();
          if (m.overflowX > 2)
            r.routes.push({ route, overflowX: m.overflowX, wide: m.wide });
        } catch {}
      }
      try {
        await p2.evaluate(() => { window.location.hash = ''; });
        await p2.waitForTimeout(400);
      } catch {}
      await p2.screenshot({
        path: join(outDir, `${artifactKey}.390.png`),
        fullPage: false,
      });
      return r;
    } catch (e) {
      return { error: e.message };
    } finally {
      await ctx2.close();
    }
  })();

  // A page that loads but paints nothing is not operational.
  const blank = metrics.scrollHeight < 400 || metrics.textLength < 200;
  // Same reasoning as request failures: a console error that is only the
  // sandbox failing to reach an allowed host is not the page's defect.
  const sandboxNoise = consoleErrors.filter((e) => /ERR_(CONNECTION|NAME|NETWORK|PROXY)/.test(e));

  // Requests to CSP-allowed hosts fail here only because this sandbox gives the
  // browser no egress; they are fine in production. Classify before judging.
  const realFailures = failedRequests.filter((f) => {
    try { return !CSP_ALLOWED_HOSTS.has(new URL(f.url).hostname); } catch { return true; }
  });
  const realConsole = consoleErrors.length - sandboxNoise.length;
  const brokenRoutes = routeResults.filter((r) => !r.ok);

  const problems = [];
  if (blank) problems.push('renders blank or near-empty');
  if (pageErrors.length) problems.push(`${pageErrors.length} uncaught JS error(s)`);
  if (realConsole > 0) problems.push(`${realConsole} console error(s)`);
  if (metrics.brokenImages) problems.push(`${metrics.brokenImages} broken image(s)`);
  if (metrics.deadAnchors.length)
    problems.push(`${metrics.deadAnchors.length} dead in-page link(s)`);
  if (brokenRoutes.length)
    problems.push(`${brokenRoutes.length}/${routeResults.length} route(s) broken`);
  if (cspBlocked.length)
    problems.push(
      `${cspBlocked.length} CSP-blocked host(s): ${cspBlocked.map((r) => r.host).join(', ')}` +
        (fallback.externalImages
          ? ` (${fallback.withOnErrorFallback}/${fallback.externalImages} image(s) degrade gracefully)`
          : '')
    );
  if (realFailures.length) problems.push(`${realFailures.length} failed request(s)`);
  if (mobile && !mobile.error && mobile.overflowX > 2)
    problems.push(`horizontal overflow at 390px (${mobile.overflowX}px)`);
  if (mobile && mobile.routes && mobile.routes.length)
    problems.push(
      `horizontal overflow at 390px on route(s): ` +
        mobile.routes.map((r) => `${r.route} (${r.overflowX}px)`).join(', ')
    );
  if (controls && controls.dead && controls.dead.length) {
    // With ambient click delegation, an element-level "no handler" is not
    // proof of deadness -- report it as informational, not a problem.
    if (controls.delegatedClickHandlers === 0)
      problems.push(`${controls.dead.length} control(s) with no reachable handler`);
  }
  if (controls && controls.deadForms && controls.deadForms.length)
    problems.push(`${controls.deadForms.length} form(s) with no submit handling`);

  return {
    file,
    status:
      problems.length === 0
        ? 'PASS'
        : blank || pageErrors.length
          ? 'FAIL'
          : 'WARN',
    problems,
    capabilities,
    externalRefs,
    cspBlocked,
    fallback,
    frameRuntimeRemoved,
    bytesRemoved,
    loadMs,
    routes: routeResults,
    controls,
    mobile,
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
    results.push({ file: f, status: 'FAIL', problems: ['harness error: ' + e.message] });
  }
  await ctx.close();
}
await browser.close();

await writeFile(join(outDir, 'report.json'), JSON.stringify(results, null, 2));
for (const r of results) {
  console.log(`${r.status.padEnd(4)} ${r.file}  ${r.problems.join('; ') || 'clean'}`);
}
