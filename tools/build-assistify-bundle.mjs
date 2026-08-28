#!/usr/bin/env node
// Build a single self-contained Assistify page: web/assistify-bundle/index.html
//
// WHY THIS EXISTS
// ---------------
// web/blueprint-3d/index.html is a multi-file app. It works when the repository
// is served over HTTP (sibling <script src> files resolve, fetch() reaches the
// JSON models). It does NOT work when the site is published as a claude.ai
// Artifact: one HTML file, no siblings, no network, strict CSP. There the
// sibling references resolve to nothing and the frame comes up empty.
//
// This script emits a functionally equivalent ONE-FILE build. Nothing here is a
// second copy of the logic: engine.js, concept-geometry.js, progress-tracker.js
// and pdf-import.js are inlined byte-for-byte (pdf-import.js gets exactly one
// asserted line rewritten, because a dynamic import() cannot be shimmed), and
// the JSON assets the app fetches are embedded and served by an in-page fetch
// shim. If an upstream file changes shape, the asserts below fail loudly rather
// than emitting a silently-degraded bundle.
//
// TRUTH BOUNDARY
// --------------
// The bundle does not gain or lose truth relative to the hosted app. The
// VERIFIED / INFERRED / UNVERIFIED / CONFLICT states, source citations, dashed
// concept geometry and the twelve canonical stage IDs all live in engine.js,
// concept-geometry.js and the model JSON, which are copied verbatim. The one
// asset deliberately NOT embedded is the 1.85 MB reviewed 4752-25 model; the
// two code paths that would fetch it fail with a specific, honest message that
// names the working alternative, never a silent no-op.
//
// PDF.js
// ------
// Both pdf.min.mjs (430 KB) and pdf.worker.min.mjs (1.21 MB) are inlined as
// module scripts. The worker module's last statement is
//   globalThis.pdfjsWorker={WorkerMessageHandler}
// and PDFWorker#setupWorker() in pdf.min.mjs short-circuits to its in-process
// LoopbackPort transport when that global exists -- it never calls
// `new Worker(...)` and never dynamically imports anything. So plan-PDF import
// runs for real inside the artifact sandbox with no blob: worker, no
// worker-src grant and no network. See the header comment in the emitted file.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(HERE);
const SRC = join(REPO, 'web', 'blueprint-3d');
const OUT_DIR = join(REPO, 'web', 'assistify-bundle');
const OUT = join(OUT_DIR, 'index.html');

const die = (m) => { console.error('build-assistify-bundle: ' + m); process.exit(1); };
const read = (p) => readFile(join(SRC, p), 'utf8');

// Inline <script> bodies must not contain a sequence that closes the element.
function assertScriptSafe(name, text) {
  if (/<\/script/i.test(text)) die(`${name} contains "</script"; it can no longer be inlined verbatim.`);
  if (/<!--/.test(text)) die(`${name} contains "<!--"; it can no longer be inlined verbatim.`);
  return text;
}

// JSON embedded into a <script> body: only "<" needs neutralising.
const embed = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const page = await read('index.html');
const engine = assertScriptSafe('engine.js', await read('engine.js'));
const concept = assertScriptSafe('concept-geometry.js', await read('concept-geometry.js'));
const progress = assertScriptSafe('progress-tracker.js', await read('progress-tracker.js'));
let pdfImport = assertScriptSafe('pdf-import.js', await read('pdf-import.js'));
const pdfMain = assertScriptSafe('pdf.min.mjs', await read('vendor/pdfjs/pdf.min.mjs'));
const pdfWorker = assertScriptSafe('pdf.worker.min.mjs', await read('vendor/pdfjs/pdf.worker.min.mjs'));

const projectModel = JSON.parse(await read('project-model.json'));
const modelSchema = JSON.parse(await read('model-schema.json'));
const sampleModel = JSON.parse(await read('sample-full-floor-plan-model.json'));

// ---------------------------------------------------------------- page shell
// Reuse the real page's <style> and body markup so the bundle cannot drift from
// the hosted app's layout, labels or accessibility wiring.
const styleMatch = page.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) die('index.html has no <style> block.');
const css = styleMatch[1];

const bodyMatch = page.match(/<body>([\s\S]*?)<script\s+src=/);
if (!bodyMatch) die('index.html body no longer ends with its <script src> list.');
const markup = bodyMatch[1].trimEnd();
if (!/id="assistifyRoot"/.test(markup)) die('index.html markup lost #assistifyRoot.');
if (!/id="pdfUpload"/.test(markup)) die('index.html markup lost the PDF import control.');
assertScriptSafe('index.html markup', markup);

const titleMatch = page.match(/<title>([\s\S]*?)<\/title>/);
const title = titleMatch ? titleMatch[1] : 'Assistify 3D | Builder Assist';

// The hosted page boots by fetching project-model.json behind a
// location.protocol!=='file:' guard. In the bundle there is nothing to fetch at
// all, so the boot model is the embedded object and the guard is unnecessary.
if (!/location\.protocol!=='file:'/.test(page)) die('index.html lost its file: fetch guard; re-check the boot contract.');

// ------------------------------------------------------- pdf-import.js patch
// Exactly one line cannot survive inlining: a dynamic import of the vendored
// ES module. Assert it verbatim so a future edit fails the build.
const PDF_IMPORT_FROM =
  "var pdfjs=await import('./vendor/pdfjs/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='./vendor/pdfjs/pdf.worker.min.mjs';";
const PDF_IMPORT_TO =
  "var pdfjs=await window.__ASSISTIFY_PDFJS_READY;";
if (!pdfImport.includes(PDF_IMPORT_FROM)) die('pdf-import.js no longer contains the expected PDF.js import line.');
pdfImport = pdfImport.replace(PDF_IMPORT_FROM, PDF_IMPORT_TO);

// ----------------------------------------------------- pdf.js export capture
// pdf.min.mjs ends with `export{a as b, c, ...}`. Rebuild that mapping as a
// plain object so the classic-script side can use the module namespace. Doing
// it by parsing (rather than hand-listing names) keeps this correct across
// re-vendoring, where the minifier's local names change.
const exportMatch = pdfMain.match(/export\{([^}]*)\};?\s*$/);
if (!exportMatch) die('pdf.min.mjs does not end with an export clause.');
const exportPairs = exportMatch[1].split(',').map((entry) => {
  const parts = entry.trim().split(/\s+as\s+/);
  const local = parts[0].trim();
  const exported = (parts[1] || parts[0]).trim();
  if (!/^[A-Za-z_$][\w$]*$/.test(local) || !/^[A-Za-z_$][\w$]*$/.test(exported))
    die('unexpected token in pdf.min.mjs export clause: ' + entry);
  return [exported, local];
});
for (const required of ['getDocument', 'GlobalWorkerOptions', 'version'])
  if (!exportPairs.some(([name]) => name === required))
    die(`pdf.min.mjs no longer exports ${required}.`);
const namespaceLiteral = '{' + exportPairs.map(([name, local]) => `${name}:${local}`).join(',') + '}';

// The worker module registers globalThis.pdfjsWorker; without it pdf.js would
// try `new Worker(blob:)` and then a dynamic import, both of which the artifact
// CSP refuses (verified: "Refused to create a worker from 'blob:...'").
if (!/globalThis\.pdfjsWorker=\{WorkerMessageHandler\}/.test(pdfWorker))
  die('pdf.worker.min.mjs no longer registers globalThis.pdfjsWorker; the worker-less path would break.');

// ------------------------------------------------------------------- runtime
const runtime = `
/* Embedded copies of the JSON assets the hosted app fetches. */
window.__ASSISTIFY_BUNDLE__ = {
  'project-model.json': ${embed(projectModel)},
  'model-schema.json': ${embed(modelSchema)},
  'sample-full-floor-plan-model.json': ${embed(sampleModel)}
};

/* The 1.85 MB reviewed 4752-25 model is deliberately not embedded. Both code
   paths that fetch it must say so specifically -- a dead control is worse than
   a missing one. */
window.__ASSISTIFY_NOT_BUNDLED__ = {
  'approvedplans-4752-25-assistify-model.json':
    'the reviewed 4752-25 model (1.85 MB) is not embedded in this single-file build. Use "Import project model" to load approvedplans-4752-25-assistify-model.json from disk, or open the hosted Assistify app.'
};

/* fetch shim: serves the embedded assets so engine.js and pdf-import.js run
   unmodified. Absolute, data: and blob: URLs fall through to the real fetch. */
(function(){
  var native = window.fetch ? window.fetch.bind(window) : null;
  function key(input){
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (/^[a-z]+:/i.test(url) || url.charAt(0) === '/') return null;
    return url.replace(/^\\.\\//, '').split('?')[0];
  }
  window.fetch = function(input, init){
    var name = key(input);
    if (name === null) return native ? native(input, init) : Promise.reject(new Error('fetch is unavailable.'));
    if (Object.prototype.hasOwnProperty.call(window.__ASSISTIFY_NOT_BUNDLED__, name))
      return Promise.reject(new Error(window.__ASSISTIFY_NOT_BUNDLED__[name]));
    if (Object.prototype.hasOwnProperty.call(window.__ASSISTIFY_BUNDLE__, name)) {
      var value = window.__ASSISTIFY_BUNDLE__[name];
      return Promise.resolve({
        ok: true, status: 200, url: name,
        json: function(){ return Promise.resolve(JSON.parse(JSON.stringify(value))); },
        text: function(){ return Promise.resolve(JSON.stringify(value)); }
      });
    }
    return Promise.reject(new Error('"' + name + '" is not part of this single-file build.'));
  };
})();

/* Resolved by the inlined pdf.min.mjs module below. pdf-import.js awaits it in
   place of its dynamic import(). */
window.__ASSISTIFY_PDFJS_READY = new Promise(function(resolve, reject){
  window.__ASSISTIFY_PDFJS_RESOLVE = resolve;
  window.__ASSISTIFY_PDFJS_REJECT = reject;
  setTimeout(function(){ reject(new Error('the bundled PDF.js runtime did not start in this browser.')); }, 30000);
});
`;

const boot = `
(function(){
  var initial = window.__ASSISTIFY_BUNDLE__['project-model.json'];
  window.assistifyViewer = window.Assistify3D.mount(document.getElementById('assistifyRoot'), initial);
})();
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5">
<meta name="description" content="Assistify project-specific, plan-traceable 3D construction viewer. Self-contained single-file build.">
<link rel="icon" href="data:,">
<title>${title}</title>
<!-- Generated by tools/build-assistify-bundle.mjs from web/blueprint-3d/.
     Do not hand-edit: change the source app and re-run the builder.

     PDF import runs worker-less on purpose. pdf.worker.min.mjs is inlined and
     sets globalThis.pdfjsWorker; pdf.min.mjs then uses its in-process
     LoopbackPort transport instead of spawning a worker, so no blob: worker
     and no worker-src CSP grant are required. -->
<style>
${css}</style>
</head>
<body>
${markup}
<script>${runtime}</script>
<script type="module">${pdfWorker}</script>
<script type="module">${pdfMain}
try{ window.__ASSISTIFY_PDFJS_RESOLVE(${namespaceLiteral}); }catch(e){ window.__ASSISTIFY_PDFJS_REJECT(e); }
</script>
<script>${concept}</script>
<script>${progress}</script>
<script>${pdfImport}</script>
<script>${engine}</script>
<script>${boot}</script>
</body>
</html>
`;

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT, html);

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('wrote ' + OUT + '  ' + kb(Buffer.byteLength(html)));
console.log('  inlined: index.html shell, engine.js, concept-geometry.js, progress-tracker.js, pdf-import.js');
console.log('  inlined: pdf.min.mjs (' + kb(pdfMain.length) + '), pdf.worker.min.mjs (' + kb(pdfWorker.length) + ') -- worker-less fake-worker path');
console.log('  embedded JSON: project-model.json, model-schema.json, sample-full-floor-plan-model.json');
console.log('  NOT embedded (by design): approvedplans-4752-25-assistify-model.json');
