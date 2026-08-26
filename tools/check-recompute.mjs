#!/usr/bin/env node
// Interaction smoke test for the calculator surfaces.
//
// verify-artifacts.mjs proves a page renders; this proves it still computes.
// It doubles the visible numeric inputs and asserts the headline dollar totals
// move. A page with no pre-filled numeric fields (a lead-capture form, say)
// reports N/A rather than a failure -- there is nothing to recompute, which is
// not the same as broken.

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

const req = createRequire(import.meta.url);
function loadPlaywright() {
  const candidates = ['playwright', 'playwright-core'];
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    candidates.push(`${root}/playwright`, `${root}/playwright-core`);
  } catch {}
  for (const c of candidates) {
    try { return req(c); } catch {}
  }
  throw new Error('playwright not found; tried: ' + candidates.join(', '));
}
const { chromium } = loadPlaywright();

const file = process.argv[2];
if (!file) {
  console.error('usage: check-recompute.mjs <artifact.html>');
  process.exit(2);
}

const raw = await readFile(file, 'utf8');
const html = raw
  .replace(/<!-- frame-runtime -->[\s\S]*?<!-- \/frame-runtime -->/g, '')
  .replace(/<base\s+href="\/_f\/[^"]*"\s*>/g, '');
const tmp = '/tmp/recompute-check.html';
await writeFile(tmp, html);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await page.goto('file://' + tmp, { waitUntil: 'load' });
await page.waitForTimeout(2000);

const readTotals = () =>
  page.evaluate(() => {
    const m = document.body.innerText.match(/\$[\d,]{4,}/g);
    return m ? m.slice(0, 3) : [];
  });

const before = await readTotals();

const changed = await page.evaluate(() => {
  // parseFloat('2-27-25 rev. 7-29-25') === 2, so a loose numeric test picks up
  // free-text fields like a plan-set reference. Require the whole value to be
  // a number, or the input to be declared type=number.
  const nums = [...document.querySelectorAll('input')].filter((i) => {
    const r = i.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return false;
    if (i.type === 'number') return i.value !== '' && parseFloat(i.value) > 0;
    return /^\d+(\.\d+)?$/.test(i.value.trim()) && parseFloat(i.value) > 0;
  });
  if (!nums.length) return null;

  // Perturb several, not just one: any single field may legitimately not feed
  // the headline totals.
  const results = [];
  for (const el of nums.slice(0, 6)) {
    const old = el.value;
    el.value = String(parseFloat(old) * 2 + 1);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    results.push({ old, now: el.value });
  }
  return results;
});

await page.waitForTimeout(1200);
const after = await readTotals();

const verdict =
  changed === null
    ? 'N/A (no numeric inputs -- not a calculator surface)'
    : JSON.stringify(before) !== JSON.stringify(after)
      ? 'YES'
      : 'NO (inputs changed but totals did not move)';

console.log('inputs perturbed:', JSON.stringify(changed));
console.log('totals before  :', before.join(' ') || '(none)');
console.log('totals after   :', after.join(' ') || '(none)');
console.log('RECOMPUTED     :', verdict);
console.log('js errors      :', errs.length ? errs : 'none');

await browser.close();
process.exit(verdict.startsWith('NO') ? 1 : 0);
