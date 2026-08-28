import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("final static shell omits development preview metadata", async () => {
  // The launch document is a static asset. Importing the Cloudflare worker in
  // Node bypasses its runtime and fails on the cloudflare:workers binding
  // before this assertion can inspect any HTML.
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.match(html, /href="\/member-portal\/assistify"/);
  assert.doesNotMatch(html, /data:image\//);
  assert.match(html, /\/embedded-images\/img-/);
  assert.match(html, /\/embedded-images\/phximg-/);
  const references = [...html.matchAll(/\/embedded-images\/([^"']+)/g)].map((match) => match[1]);
  const files = await readdir(new URL("../public/embedded-images/", import.meta.url));
  assert.equal(new Set(references).size, 71);
  assert.deepEqual([...new Set(references)].sort(), files.sort());
});

test("the static shell contains no prototype credentials or fake takeoff token form", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /TylerSchopper1|Phoenician1|p:\"Tyler1\"|p:\"Gen1\"/);
  assert.doesNotMatch(html, /type=\"password\"|TAKEOFF_ACCESS_TOKEN|data-piqsrv=\"token\"/);
  assert.doesNotMatch(html, /sessionStorage\.getItem\(\"ba-proto-session\"\)/);
  assert.match(html, /if\(r===\"admin-portal\"\|\|r===\"estimator\"\|\|r===\"build-estimate\"\)\{ location\.hash=\"#\/admin-signin\"; return; \}/);
  const buttons = [...html.matchAll(/<button\b([^>]*)>/gi)];
  assert.ok(buttons.length > 0);
  assert.equal(buttons.filter(([, attributes]) => !/\btype\s*=/.test(attributes)).length, 0);
  assert.match(html, /Legacy client-only credentials were removed/);
  assert.match(html, /External takeoff connection unavailable/);
});
