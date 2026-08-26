#!/usr/bin/env node
// build-workshop.mjs — turn recorded Claude agent transcripts into a
// self-contained 2D "workshop floor" replay page.
//
//   node tools/build-workshop.mjs [workflowDir]
//
// Reads agent-<id>.jsonl + journal.jsonl out of a workflow directory, derives
// one agent identity per transcript, flattens every tool call / thought /
// utterance into a timeline, and writes web/workshop/index.html with that
// timeline embedded as JSON. The page never fetches anything at runtime: it
// ships as a published Artifact under a CSP that blocks every external host.
//
// Nothing here invents activity. Every event on the timeline corresponds to a
// line that exists in a transcript.

import { readFile, readdir, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const OUT_FILE = join(REPO, 'web', 'workshop', 'index.html');

const SESSION_ROOT =
  '/root/.claude/projects/-home-user-Builder-assist/0e4b2398-0e9f-5b1a-a51d-fd41d937a6c5';
const WORKFLOWS_DIR = join(SESSION_ROOT, 'subagents', 'workflows');
const DEFAULT_WORKFLOW = 'wf_5ca353b6-853';

// ---------------------------------------------------------------------------
// tool -> activity
// ---------------------------------------------------------------------------

const KIND_BY_TOOL = {
  Read: 'read',
  Grep: 'read',
  Glob: 'read',
  LS: 'read',
  NotebookRead: 'read',
  Write: 'write',
  Edit: 'write',
  MultiEdit: 'write',
  NotebookEdit: 'write',
  Bash: 'run',
  BashOutput: 'run',
  KillShell: 'run',
  Artifact: 'publish',
  WebFetch: 'fetch',
  WebSearch: 'fetch',
};

function kindForTool(name) {
  return KIND_BY_TOOL[name] || 'run';
}

function trim(s, n) {
  if (s == null) return '';
  const one = String(s).replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n - 1) + '…' : one;
}

function shortPath(p) {
  if (!p) return '';
  return String(p)
    .replace('/home/user/Builder-assist/', '')
    .replace('/root/.claude/projects/-home-user-Builder-assist/', '~/')
    .replace(/^\/home\/user\//, '~/');
}

// A short, honest, human-readable summary of one tool call.
function labelForToolUse(name, input) {
  const i = input && typeof input === 'object' ? input : {};
  switch (name) {
    case 'Bash':
    case 'BashOutput':
      return trim(i.description || i.command || 'shell', 62);
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookRead':
    case 'NotebookEdit':
      return trim(shortPath(i.file_path || i.path || i.notebook_path), 62);
    case 'Grep':
      return trim(
        '/' + (i.pattern || '') + '/' + (i.path ? ' in ' + shortPath(i.path) : ''),
        62
      );
    case 'Glob':
      return trim(i.pattern || '', 62);
    case 'LS':
      return trim(shortPath(i.path), 62);
    case 'Artifact':
      return trim(
        (i.action || 'publish') + ' ' + shortPath(i.file_path || i.title || i.url || ''),
        62
      );
    case 'WebFetch':
      return trim(i.url || '', 62);
    case 'WebSearch':
      return trim(i.query || '', 62);
    case 'Task':
      return trim(i.description || i.subagent_type || 'delegate', 62);
    case 'TodoWrite':
      return 'update plan';
    default: {
      for (const k of ['description', 'file_path', 'pattern', 'query', 'url', 'command']) {
        if (i[k]) return trim(shortPath(i[k]), 62);
      }
      return trim(name, 62);
    }
  }
}

// ---------------------------------------------------------------------------
// identity
// ---------------------------------------------------------------------------

const ROLES = [
  { role: 'blueprint', station: 'drafting', name: '3D Blueprint',
    re: /\b(3d|blueprint|takeoff|floor ?plan|isometric)\b/i },
  { role: 'troubleshoot', station: 'screens', name: 'Site Troubleshooting',
    re: /\b(troubleshoot|site health|diagnos|broken|harness|functionality)\b/i },
  { role: 'hub', station: 'timeclock', name: 'Employee Hub',
    re: /\b(employee|crew|hub|time ?clock|punch|payroll|timesheet)\b/i },
  { role: 'material', station: 'shelving', name: 'Material Scouting',
    re: /\b(material|scout|lumber|supplier|price|sourcing|catalog)\b/i },
  { role: 'workshop', station: 'modelbench', name: 'Workshop Builder',
    re: /\b(workshop|visuali[sz]ation|replay)\b/i },
  { role: 'verify', station: 'qc', name: 'Verification',
    re: /\b(independent verification|verif|inspect|audit|qa|qc|review)\b/i },
];

function titleCase(s) {
  return String(s)
    .split(/\s+/)
    .map((w) => (w.length > 3 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// Identity comes from the first user message of the transcript. Build prompts
// carry "YOUR TRACK: <name>"; verify prompts open with "Independent
// verification of the ...". Anything else falls back to the spawn description
// in meta.json, then to the journal result name, then to a generic bench.
function identify(agentId, firstUserText, meta, journalResult) {
  const text = String(firstUserText || '');
  let source = '';
  let kindHint = '';

  // line-anchored: a prompt that merely quotes the phrase mid-sentence is not
  // itself a track assignment.
  const track = text.match(/^YOUR TRACK:\s*([^\n]+)/mi);
  // anchored: verify prompts OPEN with this line. Unanchored it would match a
  // build prompt that merely mentions verification.
  const verify = text.match(/^\s*Independent verification of (?:the\s+)?([^\n.]+)/i);
  const artifactRead = text.match(
    /^\s*Call the Artifact tool with action "read" and url "([^"]+)"/i
  );

  if (track) {
    source = track[1];
  } else if (verify) {
    source = verify[1];
    kindHint = 'verify';
  } else if (artifactRead) {
    source =
      (journalResult && (journalResult.name || journalResult.title)) ||
      'artifact ' + artifactRead[1].split('/').pop().slice(0, 8);
    kindHint = 'verify';
  } else if (meta && meta.description) {
    source = meta.description;
  } else if (journalResult && (journalResult.name || journalResult.title)) {
    source = journalResult.name || journalResult.title;
  }

  const clean = source.replace(/^the\s+/i, '').replace(/[.\s]+$/, '');
  const haystack = kindHint === 'verify' ? 'independent verification ' + clean : clean;

  let matched = null;
  for (const r of ROLES) {
    if (r.re.test(haystack)) { matched = r; break; }
  }
  if (!matched && kindHint === 'verify') {
    matched = ROLES.find((r) => r.role === 'verify');
  }

  let name;
  if (kindHint === 'verify' && clean) {
    name = trim(titleCase(clean), 30);
  } else if (matched) {
    name = matched.name;
  } else if (clean) {
    name = trim(titleCase(clean), 30);
  } else {
    name = 'Agent ' + agentId.slice(0, 6);
  }

  return {
    name,
    role: matched ? matched.role : 'generic',
    station: matched ? matched.station : 'bench',
    task: trim(clean || 'unclassified transcript', 110),
  };
}

// ---------------------------------------------------------------------------
// transcript parsing
// ---------------------------------------------------------------------------

function parseJsonl(raw) {
  const out = [];
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    try { out.push(JSON.parse(s)); } catch { /* truncated tail — keep going */ }
  }
  return out;
}

function contentText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (c && typeof c === 'object' && typeof c.text === 'string' ? c.text : ''))
      .join(' ');
  }
  return '';
}

async function readAgent(dir, id) {
  const file = join(dir, 'agent-' + id + '.jsonl');
  let raw = '';
  try { raw = await readFile(file, 'utf8'); } catch { raw = ''; }
  const lines = parseJsonl(raw);

  let meta = null;
  try { meta = JSON.parse(await readFile(join(dir, 'agent-' + id + '.meta.json'), 'utf8')); }
  catch { meta = null; }

  let firstUserText = '';
  for (const l of lines) {
    if (l && l.type === 'user' && l.message && l.message.role === 'user') {
      firstUserText = contentText(l.message.content);
      if (firstUserText) break;
    }
  }

  const events = [];
  for (const l of lines) {
    if (!l || !l.timestamp) continue;
    const ts = Date.parse(l.timestamp);
    if (!Number.isFinite(ts)) continue;
    const msg = l.message;
    if (!msg || msg.role !== 'assistant') continue;
    const content = Array.isArray(msg.content) ? msg.content : [];
    for (const c of content) {
      if (!c || typeof c !== 'object') continue;
      if (c.type === 'tool_use') {
        events.push({
          ts,
          kind: kindForTool(c.name),
          tool: String(c.name || 'Tool'),
          label: labelForToolUse(c.name, c.input) || String(c.name || 'tool'),
        });
      } else if (c.type === 'thinking') {
        events.push({ ts, kind: 'think', tool: 'thinking', label: 'thinking' });
      } else if (c.type === 'text' && String(c.text || '').trim()) {
        events.push({ ts, kind: 'say', tool: 'text', label: trim(c.text, 130) });
      }
    }
  }
  events.sort((a, b) => a.ts - b.ts);
  return { id, meta, firstUserText, events, lineCount: lines.length };
}

async function listAgentIds(dir) {
  let names = [];
  try { names = await readdir(dir); } catch { return []; }
  return names
    .filter((n) => /^agent-.*\.jsonl$/.test(n))
    .map((n) => n.replace(/^agent-/, '').replace(/\.jsonl$/, ''))
    .sort();
}

async function readJournal(dir) {
  let raw = '';
  try { raw = await readFile(join(dir, 'journal.jsonl'), 'utf8'); } catch { return {}; }
  const byAgent = {};
  for (const o of parseJsonl(raw)) {
    if (!o || !o.agentId) continue;
    const a = (byAgent[o.agentId] = byAgent[o.agentId] || { started: false, result: null });
    if (o.type === 'started') a.started = true;
    if (o.type === 'result') a.result = o.result || {};
  }
  return byAgent;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

async function build(workflowDir) {
  const runId = basename(workflowDir);
  const journal = await readJournal(workflowDir);

  const ids = await listAgentIds(workflowDir);
  const records = [];
  for (const id of ids) records.push(await readAgent(workflowDir, id));

  // Sibling agents spawned outside the workflow (the workshop builder itself
  // lives one level up, in subagents/). Include the ones that are not a copy
  // of a workflow transcript and whose activity overlaps this run's window.
  const workflowsRoot = dirname(workflowDir);
  const siblingRoot = dirname(workflowsRoot);
  const claimed = new Set();
  try {
    for (const wf of await readdir(workflowsRoot)) {
      const p = join(workflowsRoot, wf);
      let st; try { st = await stat(p); } catch { continue; }
      if (!st.isDirectory()) continue;
      for (const id of await listAgentIds(p)) claimed.add(id);
    }
  } catch { /* no workflows root — fine */ }

  const wfEvents = records.flatMap((r) => r.events);
  const wfStart = wfEvents.length ? Math.min(...wfEvents.map((e) => e.ts)) : 0;
  const wfEnd = wfEvents.length ? Math.max(...wfEvents.map((e) => e.ts)) : 0;

  if (wfEvents.length) {
    for (const id of await listAgentIds(siblingRoot)) {
      if (claimed.has(id)) continue;
      const rec = await readAgent(siblingRoot, id);
      if (!rec.events.length) continue;
      const s = rec.events[0].ts;
      const e = rec.events[rec.events.length - 1].ts;
      if (e < wfStart || s > wfEnd + 30 * 60 * 1000) continue; // no overlap
      rec.sibling = true;
      records.push(rec);
    }
  }

  const all = records.flatMap((r) => r.events);
  const t0 = all.length ? Math.min(...all.map((e) => e.ts)) : 0;
  const tEnd = all.length ? Math.max(...all.map((e) => e.ts)) : 0;

  const agents = [];
  const events = [];

  for (const rec of records) {
    const j = journal[rec.id] || {};
    const ident = identify(rec.id, rec.firstUserText, rec.meta, j.result);
    const idx = agents.length;
    const startT = rec.events.length ? rec.events[0].ts - t0 : 0;
    const lastT = rec.events.length ? rec.events[rec.events.length - 1].ts - t0 : 0;

    for (const e of rec.events) {
      events.push({ t: e.ts - t0, agent: idx, kind: e.kind, tool: e.tool, label: e.label });
    }

    // journal "result" means the agent finished. The journal carries no
    // timestamp, so the done marker sits on the agent's last recorded event.
    let doneT = null;
    if (j.result) {
      doneT = lastT;
      events.push({
        t: doneT,
        agent: idx,
        kind: 'done',
        tool: 'journal',
        label: trim(
          'finished' + (j.result.title || j.result.name ? ' — ' + (j.result.title || j.result.name) : ''),
          62
        ),
      });
    }

    agents.push({
      id: rec.id,
      short: rec.id.slice(0, 6),
      name: ident.name,
      role: ident.role,
      station: ident.station,
      task: ident.task,
      sibling: !!rec.sibling,
      startT,
      lastT,
      doneT,
      count: rec.events.length,
      lines: rec.lineCount,
    });
  }

  events.sort((a, b) => a.t - b.t || a.agent - b.agent);
  const span = events.length ? events[events.length - 1].t : 0;

  return {
    runId,
    workflowDir,
    capturedAt: new Date().toISOString(),
    t0Iso: t0 ? new Date(t0).toISOString() : null,
    tEndIso: tEnd ? new Date(tEnd).toISOString() : null,
    span,
    agents,
    events,
  };
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------

function renderPage(data) {
  // Embedded as JSON in a script tag: escape the sequences that could close it.
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  // function replacement: the payload may contain $& / $1 sequences
  return PAGE.replace('"__WORKSHOP_DATA__"', () => json);
}

// NOTE: the page's own JavaScript below deliberately avoids backticks and
// template literals so it can live inside this template literal untouched.
const PAGE = `<title>Agent Workshop</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{
  --ink:#071a36; --navy:#081f43; --blue:#0b4fd3; --blue-bright:#1674ff;
  --cyan:#68d4ff; --ice:#f2f7ff; --line:#d9e5f7; --muted:#5e6f89;

  --bg:#f2f7ff;
  --panel:#ffffff;
  --panel-2:#f7fbff;
  --text:#071a36;
  --text-dim:#5e6f89;
  --border:#d9e5f7;
  --accent:#0b4fd3;
  --accent-2:#1674ff;
  --eyebrow:#0b4fd3;
  --btn-bg:#ffffff;
  --btn-text:#071a36;
  --btn-on-bg:#0b4fd3;
  --btn-on-text:#ffffff;
  --focus:#1674ff;

  /* the workshop floor keeps its blueprint palette in both themes */
  --floor-a:#081f43; --floor-b:#050f26; --floor-grid:#68d4ff;
  --floor-line:#68d4ff; --floor-ice:#f2f7ff; --floor-blue:#1674ff;
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --bg:#050f22;
    --panel:#0a1a33;
    --panel-2:#08152b;
    --text:#f2f7ff;
    --text-dim:#9db2d1;
    --border:#1c3357;
    --accent:#68d4ff;
    --accent-2:#1674ff;
    --eyebrow:#68d4ff;
    --btn-bg:#0f2444;
    --btn-text:#f2f7ff;
    --btn-on-bg:#1674ff;
    --btn-on-text:#ffffff;
    --focus:#68d4ff;
  }
}
:root[data-theme="dark"]{
  --bg:#050f22;
  --panel:#0a1a33;
  --panel-2:#08152b;
  --text:#f2f7ff;
  --text-dim:#9db2d1;
  --border:#1c3357;
  --accent:#68d4ff;
  --accent-2:#1674ff;
  --eyebrow:#68d4ff;
  --btn-bg:#0f2444;
  --btn-text:#f2f7ff;
  --btn-on-bg:#1674ff;
  --btn-on-text:#ffffff;
  --focus:#68d4ff;
}

*{box-sizing:border-box}
html,body{max-width:100%;overflow-x:hidden}
body{
  margin:0;
  background:var(--bg);
  color:var(--text);
  font-family:Arial,Helvetica,sans-serif;
  font-size:15px;
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1180px;margin:0 auto;padding:22px 18px 64px}
.eyebrow{
  font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;
  color:var(--eyebrow);margin:0 0 8px;
}
h1{
  font-size:clamp(24px,4.6vw,40px);font-weight:900;letter-spacing:.06em;
  text-transform:uppercase;margin:0 0 10px;line-height:1.08;
}
.lede{margin:0 0 14px;color:var(--text-dim);max-width:64ch}
.meta{
  display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px;padding:0;list-style:none;
}
.meta li{
  border:1px solid var(--border);background:var(--panel);
  padding:6px 10px;font-size:11px;font-weight:800;letter-spacing:.12em;
  text-transform:uppercase;color:var(--text-dim);
  font-variant-numeric:tabular-nums;
}
.meta li b{color:var(--text);font-weight:900}

.stage{
  border:1px solid var(--border);background:var(--floor-a);
  position:relative;overflow:hidden;
}
.stage canvas{display:block;width:100%;height:auto}
.stage .empty{
  display:none;padding:46px 22px;text-align:center;color:var(--floor-ice);
}
.stage.is-empty canvas{display:none}
.stage.is-empty .empty{display:block}
.empty h2{
  font-size:14px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;
  margin:0 0 8px;color:var(--cyan);
}
.empty p{margin:0 auto;max-width:52ch;font-size:14px;color:#c6d8f2}

.controls{
  border:1px solid var(--border);border-top:0;background:var(--panel);
  padding:14px;display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;
}
.group{display:flex;flex-direction:column;gap:6px;min-width:0}
.group>span.lbl,.group>label{
  font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;
  color:var(--text-dim);
}
.btns{display:flex;flex-wrap:wrap;gap:6px}
button{
  font-family:inherit;font-size:11px;font-weight:900;letter-spacing:.14em;
  text-transform:uppercase;padding:9px 13px;border-radius:0;cursor:pointer;
  border:1px solid var(--border);background:var(--btn-bg);color:var(--btn-text);
  font-variant-numeric:tabular-nums;
}
button:hover{border-color:var(--accent-2)}
button[aria-pressed="true"]{
  background:var(--btn-on-bg);color:var(--btn-on-text);border-color:var(--btn-on-bg);
}
button:focus-visible,input:focus-visible{
  outline:3px solid var(--focus);outline-offset:2px;
}
.scrub{flex:1 1 260px;min-width:0}
.scrub input[type=range]{width:100%;accent-color:var(--accent-2);height:26px}
.clock{
  font-variant-numeric:tabular-nums;font-weight:900;letter-spacing:.08em;
  font-size:15px;white-space:nowrap;
}
.clock small{
  display:block;font-size:10px;letter-spacing:.16em;color:var(--text-dim);
  font-weight:800;
}

h2.sec{
  font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;
  color:var(--eyebrow);margin:26px 0 10px;
}
.ticker{
  border:1px solid var(--border);background:var(--panel-2);
  padding:0;margin:0;list-style:none;
}
.ticker li{
  display:flex;gap:12px;align-items:baseline;padding:9px 12px;
  border-bottom:1px solid var(--border);font-size:13px;
}
.ticker li:last-child{border-bottom:0}
.ticker .who{
  flex:0 0 auto;min-width:132px;font-size:10px;font-weight:900;
  letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);
}
.ticker .act{
  flex:0 0 auto;min-width:74px;font-size:10px;font-weight:900;
  letter-spacing:.14em;text-transform:uppercase;
}
.ticker .txt{
  flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;color:var(--text);font-family:Arial,Helvetica,sans-serif;
}
.cards{
  display:grid;gap:12px;margin:0;padding:0;list-style:none;
  grid-template-columns:repeat(auto-fill,minmax(248px,1fr));
}
.card{
  border:1px solid var(--border);background:var(--panel);padding:13px;min-width:0;
}
.card h3{
  font-size:12px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;
  margin:0 0 3px;
}
.card .role{
  font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--text-dim);margin:0 0 10px;
}
.card .now{
  display:flex;align-items:center;gap:8px;font-size:11px;font-weight:900;
  letter-spacing:.14em;text-transform:uppercase;margin:0 0 4px;
}
.dot{width:9px;height:9px;flex:0 0 auto;display:inline-block}
.card .doing{
  font-size:12px;color:var(--text-dim);margin:0 0 10px;min-height:2.6em;
  overflow:hidden;
}
.stats{
  display:flex;gap:14px;border-top:1px solid var(--border);padding-top:9px;
}
.stats div{min-width:0}
.stats dt{
  font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;
  color:var(--text-dim);margin:0;
}
.stats dd{
  margin:0;font-size:16px;font-weight:900;font-variant-numeric:tabular-nums;
}
.note{
  margin:26px 0 0;border-left:3px solid var(--accent);padding:10px 0 10px 13px;
  color:var(--text-dim);font-size:13px;max-width:74ch;
}
.note b{color:var(--text)}
code{
  font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;
  background:var(--panel-2);border:1px solid var(--border);padding:1px 5px;
}
.sr{
  position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
@media (max-width:520px){
  .ticker .who{min-width:0;flex:0 0 96px}
  .ticker .act{display:none}
}
</style>

<div class="wrap">
  <p class="eyebrow">Builder Assist &middot; Recorded Replay</p>
  <h1>Agent Workshop</h1>
  <p class="lede">
    A replay of real recorded agent activity on this project &mdash; every figure,
    every action and every timestamp comes from the transcripts on disk. This is
    <strong>not a live feed</strong>. Re-run the generator to refresh it.
  </p>
  <ul class="meta" id="meta"></ul>

  <div class="stage" id="stage">
    <canvas id="floor" role="img" aria-label="Workshop floor: each agent shown as a figure at a workstation"></canvas>
    <div class="empty">
      <h2>Empty floor</h2>
      <p id="emptyMsg">No recorded agent activity in this run. Run the generator against a workflow directory that has transcripts.</p>
    </div>
  </div>

  <div class="controls">
    <div class="group">
      <span class="lbl">Transport</span>
      <div class="btns">
        <button type="button" id="playBtn" aria-pressed="false">Play</button>
        <button type="button" id="restartBtn">Restart</button>
        <button type="button" id="endBtn">Jump to end</button>
      </div>
    </div>
    <div class="group">
      <span class="lbl">Speed</span>
      <div class="btns" id="speedBtns"></div>
    </div>
    <div class="group scrub">
      <label for="scrubber">Timeline position</label>
      <input type="range" id="scrubber" min="0" max="1000" value="0" step="1"
             aria-describedby="clockText">
    </div>
    <div class="group">
      <span class="lbl">Replay clock</span>
      <div class="clock" id="clockText">--:--:--<small id="clockDate">no data</small></div>
    </div>
  </div>

  <h2 class="sec">Ticker &mdash; current action</h2>
  <ul class="ticker" id="ticker"></ul>

  <h2 class="sec">Crew</h2>
  <ul class="cards" id="cards"></ul>

  <p class="note" id="note"></p>
</div>

<script id="workshop-data" type="application/json">"__WORKSHOP_DATA__"</script>
<script>
(function(){
  "use strict";

  var DATA;
  try {
    DATA = JSON.parse(document.getElementById("workshop-data").textContent);
  } catch (e) {
    DATA = null;
  }
  if (!DATA || typeof DATA !== "object") {
    DATA = { runId: "unknown", capturedAt: null, t0Iso: null, span: 0, agents: [], events: [] };
  }
  var AGENTS = Array.isArray(DATA.agents) ? DATA.agents : [];
  var EVENTS = Array.isArray(DATA.events) ? DATA.events : [];
  var SPAN = Math.max(0, Number(DATA.span) || 0);
  var T0 = DATA.t0Iso ? Date.parse(DATA.t0Iso) : 0;

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}

  // ---- per-agent event index -------------------------------------------
  var byAgent = AGENTS.map(function(){ return []; });
  EVENTS.forEach(function(ev){
    if (byAgent[ev.agent]) byAgent[ev.agent].push(ev);
  });

  var KIND_LABEL = {
    read: "Reading", write: "Writing", run: "Running", think: "Thinking",
    say: "Saying", publish: "Publishing", fetch: "Fetching",
    done: "Done", idle: "Idle", waiting: "Not started"
  };
  // Canvas palette: always painted on the navy blueprint floor.
  var KIND_COLOR = {
    read: "#68d4ff", write: "#1674ff", run: "#ffc46b", think: "#b58cff",
    say: "#f2f7ff", publish: "#5be6a5", fetch: "#68d4ff",
    done: "#3fd97f", idle: "#7d90ae", waiting: "#495d7c"
  };
  // DOM palette: the cards and ticker sit on a themed panel, so the same hues
  // need a readable variant per theme.
  var KIND_DOM_LIGHT = {
    read: "#0d6f95", write: "#0b4fd3", run: "#8a5200", think: "#6134b8",
    say: "#071a36", publish: "#0a7d4a", fetch: "#0d6f95",
    done: "#0f7a3d", idle: "#5e6f89", waiting: "#8494ab"
  };
  var KIND_DOM_DARK = {
    read: "#68d4ff", write: "#68a5ff", run: "#ffc46b", think: "#c3a4ff",
    say: "#f2f7ff", publish: "#5be6a5", fetch: "#68d4ff",
    done: "#3fd97f", idle: "#9db2d1", waiting: "#6d82a3"
  };
  function domPalette(){
    var explicit = document.documentElement.getAttribute("data-theme");
    if (explicit === "dark") return KIND_DOM_DARK;
    if (explicit === "light") return KIND_DOM_LIGHT;
    var dark = false;
    try { dark = window.matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) {}
    return dark ? KIND_DOM_DARK : KIND_DOM_LIGHT;
  }

  // Activity holds until the agent's next recorded event, then goes idle after
  // a gap. Real transcripts are dense, so the gap is generous but finite.
  var IDLE_AFTER = 90000;

  function stateAt(ai, t){
    var list = byAgent[ai] || [];
    if (!list.length) return { kind: "waiting", label: "no recorded activity", count: 0, ev: null };
    if (t < list[0].t) return { kind: "waiting", label: "not started", count: 0, ev: null };
    var lo = 0, hi = list.length - 1, idx = 0;
    while (lo <= hi){
      var mid = (lo + hi) >> 1;
      if (list[mid].t <= t){ idx = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    var ev = list[idx];
    var kind = ev.kind;
    if (kind !== "done" && (t - ev.t) > IDLE_AFTER) kind = "idle";
    return { kind: kind, label: ev.label, count: idx + 1, ev: ev };
  }

  // ---- transport --------------------------------------------------------
  var playT = 0;
  var playing = false;
  var speed = 1;
  var lastFrame = 0;

  var fit = SPAN > 0 ? Math.max(1, Math.round(SPAN / 60000)) : 1;
  var SPEEDS = [];
  if (SPAN > 0) SPEEDS.push({ v: fit, label: fit + "x fit" });
  [1, 8, 60, 300].forEach(function(v){
    if (!SPEEDS.some(function(s){ return s.v === v; })) SPEEDS.push({ v: v, label: v + "x" });
  });
  SPEEDS.sort(function(a,b){ return a.v - b.v; });
  speed = SPAN > 0 ? fit : 1;

  var stage = document.getElementById("stage");
  var canvas = document.getElementById("floor");
  var ctx = canvas.getContext("2d");
  var playBtn = document.getElementById("playBtn");
  var scrubber = document.getElementById("scrubber");
  var tickerEl = document.getElementById("ticker");
  var cardsEl = document.getElementById("cards");

  if (!AGENTS.length || !EVENTS.length) stage.classList.add("is-empty");

  // ---- header meta ------------------------------------------------------
  function fmtDur(ms){
    if (!isFinite(ms) || ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    function p(n){ return (n < 10 ? "0" : "") + n; }
    return (h ? h + ":" + p(m) : m) + ":" + p(sec);
  }
  function fmtClock(ms){
    if (!T0) return "--:--:--";
    var d = new Date(T0 + ms);
    function p(n){ return (n < 10 ? "0" : "") + n; }
    return p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + ":" + p(d.getUTCSeconds());
  }
  function fmtDate(ms){
    if (!T0) return "no data";
    var d = new Date(T0 + ms);
    return d.toISOString().slice(0, 10) + " UTC";
  }

  var metaEl = document.getElementById("meta");
  var metaBits = [
    ["Run", DATA.runId || "unknown"],
    ["Agents", String(AGENTS.length)],
    ["Events", String(EVENTS.length)],
    ["Span", SPAN ? fmtDur(SPAN) : "0:00"],
    ["Recorded", DATA.t0Iso ? DATA.t0Iso.replace("T", " ").slice(0, 19) + " UTC" : "n/a"],
    ["Captured", DATA.capturedAt ? DATA.capturedAt.replace("T", " ").slice(0, 19) + " UTC" : "n/a"]
  ];
  metaBits.forEach(function(b){
    var li = document.createElement("li");
    li.textContent = b[0] + " ";
    var bo = document.createElement("b");
    bo.textContent = b[1];
    li.appendChild(bo);
    metaEl.appendChild(li);
  });

  var note = document.getElementById("note");
  note.innerHTML = "";
  var nb = document.createElement("b");
  nb.textContent = "This is a replay, not a live view. ";
  note.appendChild(nb);
  note.appendChild(document.createTextNode(
    "A published artifact cannot reach the machine the agents ran on, so the " +
    "timeline is baked into this page at build time. Re-run "
  ));
  var nc = document.createElement("code");
  nc.textContent = "node tools/build-workshop.mjs";
  note.appendChild(nc);
  note.appendChild(document.createTextNode(
    " to regenerate it from the current transcripts. Timestamps are UTC, as recorded."
  ));

  if (!AGENTS.length || !EVENTS.length){
    document.getElementById("emptyMsg").textContent =
      "Run " + (DATA.runId || "unknown") + " has no recorded agent activity to replay. " +
      "Point the generator at a workflow directory that contains agent transcripts.";
  }

  // ---- cards ------------------------------------------------------------
  var cardRefs = [];
  AGENTS.forEach(function(a, i){
    var li = document.createElement("li");
    li.className = "card";
    var h3 = document.createElement("h3");
    h3.textContent = a.name;
    var role = document.createElement("p");
    role.className = "role";
    role.textContent = a.station + " station · " + a.short;
    var now = document.createElement("p");
    now.className = "now";
    var dot = document.createElement("span");
    dot.className = "dot";
    var nowTxt = document.createElement("span");
    now.appendChild(dot); now.appendChild(nowTxt);
    var doing = document.createElement("p");
    doing.className = "doing";
    var dl = document.createElement("dl");
    dl.className = "stats";
    var d1 = document.createElement("div"), t1 = document.createElement("dt"), v1 = document.createElement("dd");
    t1.textContent = "Actions"; d1.appendChild(t1); d1.appendChild(v1);
    var d2 = document.createElement("div"), t2 = document.createElement("dt"), v2 = document.createElement("dd");
    t2.textContent = "Elapsed"; d2.appendChild(t2); d2.appendChild(v2);
    dl.appendChild(d1); dl.appendChild(d2);
    li.appendChild(h3); li.appendChild(role); li.appendChild(now);
    li.appendChild(doing); li.appendChild(dl);
    cardsEl.appendChild(li);
    cardRefs.push({ dot: dot, now: nowTxt, doing: doing, count: v1, elapsed: v2 });

    var tli = document.createElement("li");
    var who = document.createElement("span"); who.className = "who"; who.textContent = a.name;
    var act = document.createElement("span"); act.className = "act";
    var txt = document.createElement("span"); txt.className = "txt";
    tli.appendChild(who); tli.appendChild(act); tli.appendChild(txt);
    tickerEl.appendChild(tli);
    cardRefs[i].tAct = act;
    cardRefs[i].tTxt = txt;
  });

  if (!AGENTS.length){
    var li0 = document.createElement("li");
    li0.textContent = "No agents in this run.";
    li0.style.padding = "10px 12px";
    tickerEl.appendChild(li0);
  }

  // ---- canvas -----------------------------------------------------------
  var CELL_UNITS_W = 200, CELL_UNITS_H = 156;
  var layout = { cols: 1, rows: 1, cw: 200, ch: 156, cssW: 600, cssH: 200 };

  function computeLayout(){
    var cssW = Math.max(280, stage.clientWidth || 600);
    var n = Math.max(AGENTS.length, 1);
    var cols = cssW >= 1000 ? 3 : (cssW >= 660 ? 2 : 1);
    cols = Math.min(cols, n);
    var rows = Math.ceil(n / cols);
    // Cap the cell width so one or two agents do not stretch into a
    // near-empty hall; the leftover width becomes a margin either side.
    var cw = Math.min(cssW / cols, 520);
    var ch = cw * (CELL_UNITS_H / CELL_UNITS_W);
    ch = Math.max(160, Math.min(ch, 300));
    var xOff = Math.max(0, (cssW - cols * cw) / 2);
    layout = { cols: cols, rows: rows, cw: cw, ch: ch, xOff: xOff,
               cssW: cssW, cssH: rows * ch };

    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(layout.cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = layout.cssH + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // -- primitives
  function line(x1,y1,x2,y2,color,w){
    ctx.strokeStyle = color; ctx.lineWidth = w || 1;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }
  function rect(x,y,w,h,fill,stroke,lw){
    if (fill){ ctx.fillStyle = fill; ctx.fillRect(x,y,w,h); }
    if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.strokeRect(x,y,w,h); }
  }
  function circle(x,y,r,fill,stroke,lw){
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    if (fill){ ctx.fillStyle = fill; ctx.fill(); }
    if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function capLine(x1,y1,x2,y2,color,w){
    ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.lineCap = "butt";
  }
  function label(x,y,text,color,size,align){
    ctx.fillStyle = color;
    ctx.font = "900 " + (size || 8) + "px Arial, Helvetica, sans-serif";
    ctx.textAlign = align || "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(spaced(text), x, y);
    ctx.textAlign = "left";
  }
  function clip(text, max){
    var t = String(text == null ? "" : text);
    while (t.length && ctx.measureText(t).width > max) t = t.slice(0, -1);
    return t.length < String(text).length ? t.slice(0, -1) + "\\u2026" : t;
  }

  var ICE = "#f2f7ff", CY = "#68d4ff", BL = "#1674ff", DEEP = "#0b4fd3";

  // -- stations (drawn in a 200 x 156 unit cell, floor line at y = 126)
  function drawStation(kind, ph, st){
    var deskTop = 100;
    // shared bench
    rect(86, deskTop, 96, 5, "#123a70", CY, 1);
    line(92, deskTop + 5, 92, 126, CY, 1);
    line(176, deskTop + 5, 176, 126, CY, 1);

    if (kind === "drafting"){
      // tilted drafting board on the left, gable house model on the bench
      ctx.beginPath();
      ctx.moveTo(90, deskTop);
      ctx.lineTo(96, deskTop - 30);
      ctx.lineTo(134, deskTop - 30);
      ctx.lineTo(132, deskTop);
      ctx.closePath();
      ctx.fillStyle = "#0e2f5e"; ctx.fill();
      ctx.strokeStyle = CY; ctx.lineWidth = 1; ctx.stroke();
      line(97, deskTop - 22, 133, deskTop - 22, "rgba(104,212,255,0.55)", 0.8);
      line(112, deskTop - 30, 112, deskTop, "rgba(104,212,255,0.55)", 0.8);
      // house model: walls, gable roof, door, window
      var hx = 142, hb = deskTop;
      rect(hx, hb - 14, 28, 14, "#0e2f5e", ICE, 1.2);
      ctx.strokeStyle = ICE; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx - 4, hb - 14); ctx.lineTo(hx + 14, hb - 26);
      ctx.lineTo(hx + 32, hb - 14); ctx.closePath(); ctx.stroke();
      rect(hx + 4, hb - 9, 6, 6, null, CY, 1);
      rect(hx + 17, hb - 8, 6, 8, null, CY, 1);
      label(134, 121, "3D plan", CY, 6, "center");
    } else if (kind === "screens"){
      // inspection bench: three little monitors, one showing a fault
      for (var i = 0; i < 3; i++){
        var sx = 96 + i * 29;
        rect(sx, deskTop - 26, 24, 22, "#0a2a55", CY, 1);
        var lit = (Math.floor(ph * 2) + i) % 3 === 0;
        rect(sx + 3, deskTop - 23, 18, 12, lit ? "#12406f" : "#0e3563");
        for (var r = 0; r < 3; r++){
          line(sx + 4, deskTop - 20 + r * 4, sx + 4 + (i === 1 && r === 1 ? 8 : 15),
               deskTop - 20 + r * 4, i === 1 && r === 1 ? "#ffc46b" : CY, 1);
        }
        line(sx + 12, deskTop - 4, sx + 12, deskTop, CY, 1);
      }
      label(134, 121, "Diagnostics", CY, 6, "center");
    } else if (kind === "timeclock"){
      // wall time clock + a rack of punch cards
      var cx = 150, cy = 56;
      circle(cx, cy, 15, "#0a2a55", ICE, 1.4);
      circle(cx, cy, 1.6, ICE);
      var a1 = ph * Math.PI * 2, a2 = ph * Math.PI * 0.4;
      capLine(cx, cy, cx + Math.cos(a1 - 1.57) * 10, cy + Math.sin(a1 - 1.57) * 10, CY, 1.6);
      capLine(cx, cy, cx + Math.cos(a2 - 1.57) * 6, cy + Math.sin(a2 - 1.57) * 6, ICE, 2);
      for (var c = 0; c < 5; c++){
        rect(96 + c * 10, deskTop - 18, 7, 16, "#0e2f5e", ICE, 1);
        line(97 + c * 10, deskTop - 13, 101 + c * 10, deskTop - 13, CY, 1);
      }
      label(134, 121, "Time clock", CY, 6, "center");
    } else if (kind === "shelving"){
      // shelf of material samples with price tags
      rect(92, deskTop - 46, 92, 46, null, CY, 1);
      line(92, deskTop - 31, 184, deskTop - 31, CY, 1);
      line(92, deskTop - 15, 184, deskTop - 15, CY, 1);
      var swatch = ["#c9a227", "#8a5a3b", "#7d90ae", "#5be6a5", "#d9e5f7", "#b58cff"];
      for (var s = 0; s < 6; s++){
        var col = s % 3, row = Math.floor(s / 3);
        rect(98 + col * 30, deskTop - 44 + row * 16, 15, 11, swatch[s], ICE, 0.6);
        rect(116 + col * 30, deskTop - 41 + row * 16, 9, 6, "#0a2a55", CY, 0.6);
      }
      label(134, 121, "Samples", CY, 6, "center");
    } else if (kind === "qc"){
      // QC inspection: clipboard on an easel with checkmarks
      rect(112, deskTop - 40, 40, 40, "#0e2f5e", ICE, 1.2);
      rect(124, deskTop - 44, 16, 5, "#0a2a55", ICE, 1);
      for (var q = 0; q < 4; q++){
        var qy = deskTop - 32 + q * 7;
        rect(116, qy - 3, 4, 4, null, CY, 0.8);
        line(122, qy - 1, 148, qy - 1, CY, 0.8);
        if (q < 1 + Math.floor(ph * 4) % 4){
          ctx.strokeStyle = "#5be6a5"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(116.5, qy - 1); ctx.lineTo(118, qy + 0.6);
          ctx.lineTo(119.8, qy - 3.2); ctx.stroke();
        }
      }
      label(134, 121, "Inspection", CY, 6, "center");
    } else if (kind === "modelbench"){
      // a tiny model of this very workshop: two miniature stations on a board
      rect(94, deskTop - 34, 84, 34, "#071a36", CY, 1);
      for (var m = 0; m < 2; m++){
        var mx = 98 + m * 40;
        rect(mx, deskTop - 30, 36, 26, null, "rgba(104,212,255,0.55)", 0.7);
        line(mx, deskTop - 10, mx + 36, deskTop - 10, "rgba(104,212,255,0.55)", 0.7);
        // miniature bench
        rect(mx + 18, deskTop - 18, 14, 2, "#123a70", CY, 0.6);
        line(mx + 20, deskTop - 16, mx + 20, deskTop - 10, CY, 0.6);
        line(mx + 30, deskTop - 16, mx + 30, deskTop - 10, CY, 0.6);
        // miniature figure
        var fx = mx + 9;
        circle(fx, deskTop - 21, 2, null, ICE, 0.8);
        capLine(fx, deskTop - 19, fx, deskTop - 14, ICE, 1);
        capLine(fx, deskTop - 14, fx - 2, deskTop - 10, ICE, 0.8);
        capLine(fx, deskTop - 14, fx + 2, deskTop - 10, ICE, 0.8);
        capLine(fx, deskTop - 18, fx + 6, deskTop - 17, ICE, 0.8);
      }
      label(134, 121, "Model", CY, 6, "center");
    } else {
      // generic bench: toolbox and a couple of hand tools
      rect(104, deskTop - 16, 26, 16, "#0e2f5e", CY, 1);
      line(104, deskTop - 10, 130, deskTop - 10, CY, 1);
      capLine(146, deskTop - 2, 152, deskTop - 18, ICE, 1.6);
      capLine(158, deskTop - 2, 168, deskTop - 14, ICE, 1.6);
      label(134, 121, "Bench", CY, 6, "center");
    }

    // "run" prop: a lever with a gauge, lit only while running
    if (st === "run"){
      var gx = 190, gy = 76;
      line(gx, gy + 8, gx, 126, "#ffc46b", 1.2);
      line(gx - 4, 126, gx + 4, 126, "#ffc46b", 1.4);
      circle(gx, gy, 8, "#0a2a55", "#ffc46b", 1.2);
      var na = -2.4 + (0.5 + 0.5 * Math.sin(ph * Math.PI * 2)) * 1.9;
      capLine(gx, gy, gx + Math.cos(na) * 6, gy + Math.sin(na) * 6, "#ffc46b", 1.6);
    }
  }

  // -- the figure
  function drawFigure(x, ground, st, ph, text){
    var lean = 0, bob = 0, breathe = 0;
    if (st === "read"){ lean = 0.24; bob = Math.sin(ph * Math.PI * 2) * 2.4; }
    else if (st === "idle" || st === "waiting"){ breathe = Math.sin(ph * Math.PI * 2) * 0.8; }
    else if (st === "think"){ breathe = Math.sin(ph * Math.PI * 2) * 0.5; }

    var faded = st === "waiting";
    var body = faded ? "#4a5f80" : ICE;
    var accent = faded ? "#4a5f80" : CY;

    var hipY = ground - 20 + breathe;
    var shoulderY = ground - 40 + breathe + bob * 0.4;
    var headY = ground - 48 + breathe + bob;

    ctx.save();
    ctx.translate(x, 0);
    ctx.rotate(0);

    // legs
    capLine(0, hipY, -5, ground, body, 3);
    capLine(0, hipY, 5, ground, body, 3);
    // boots
    capLine(-6, ground, -2, ground, accent, 3);
    capLine(2, ground, 6, ground, accent, 3);

    // torso, leaning from the hip
    var sx = Math.sin(lean) * 14, sy = -Math.cos(lean) * 20;
    var shX = sx, shY = hipY + sy + bob * 0.4;
    capLine(0, hipY, shX, shY, body, 6);

    // head + hard hat
    var hX = shX + Math.sin(lean) * 7, hY = shY - Math.cos(lean) * 7 + bob * 0.5;
    circle(hX, hY, 5.2, "#0e2f5e", body, 1.6);
    ctx.beginPath();
    ctx.arc(hX, hY - 1.5, 5.6, Math.PI, 0);
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();
    line(hX - 7.5, hY - 1.5, hX + 7.5, hY - 1.5, accent, 1.6);

    // arms, per activity
    var t = ph * Math.PI * 2;
    var ax = shX, ay = shY + 2;
    if (st === "write"){
      var l = Math.sin(t) * 3, r = Math.sin(t + Math.PI) * 3;
      capLine(ax, ay, ax + 12, ay + 10 + l, body, 3);
      capLine(ax, ay, ax + 15, ay + 8 + r, body, 3);
    } else if (st === "read"){
      // both hands on a sheet, head bobbing down the page
      capLine(ax, ay, ax + 12, ay + 9, body, 3);
      capLine(ax, ay, ax + 15, ay + 6, body, 3);
      rect(ax + 11, ay + 2, 13, 10, "#0e2f5e", accent, 1.1);
      line(ax + 13, ay + 5, ax + 22, ay + 5, accent, 0.8);
      line(ax + 13, ay + 8, ax + 20, ay + 8, accent, 0.8);
    } else if (st === "run"){
      var pull = (0.5 + 0.5 * Math.sin(t)) * 8;
      capLine(ax, ay, ax + 14, ay - 6 + pull, body, 3);
      capLine(ax, ay, ax + 6, ay + 12, body, 3);
      capLine(ax + 14, ay - 6 + pull, ax + 20, ay - 12 + pull, "#ffc46b", 2);
    } else if (st === "publish"){
      capLine(ax, ay, ax + 8, ay - 16, body, 3);
      capLine(ax, ay, ax + 15, ay - 13, body, 3);
      rect(ax + 6, ay - 24, 12, 9, "#0e2f5e", "#5be6a5", 1.2);
      line(ax + 8, ay - 21, ax + 16, ay - 21, "#5be6a5", 1);
      line(ax + 8, ay - 18, ax + 14, ay - 18, "#5be6a5", 1);
    } else if (st === "fetch"){
      capLine(ax, ay, ax + 14, ay - 14, body, 3);
      capLine(ax, ay, ax + 5, ay + 12, body, 3);
      for (var w = 1; w <= 3; w++){
        ctx.strokeStyle = CY;
        ctx.globalAlpha = 0.25 + 0.25 * (1 + Math.sin(t - w)) ;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ax + 15, ay - 15, 3 + w * 3.4, -1.5, 0.2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else if (st === "done"){
      capLine(ax, ay, ax + 4, ay + 14, body, 3);
      capLine(ax, ay, ax - 4, ay + 14, body, 3);
    } else {
      capLine(ax, ay, ax + 6, ay + 13, body, 3);
      capLine(ax, ay, ax - 5, ay + 13, body, 3);
    }
    ctx.restore();

    // bubbles
    if (st === "think"){
      var pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t));
      ctx.globalAlpha = pulse;
      circle(x + 20, headY - 20, 11, "#0e2f5e", "#b58cff", 1.2);
      for (var d = 0; d < 3; d++){
        circle(x + 17 + d * 4.4, headY - 20, 1.5, "#b58cff");
      }
      circle(x + 11, headY - 9, 2.6, "#0e2f5e", "#b58cff", 1);
      circle(x + 7, headY - 4, 1.6, "#0e2f5e", "#b58cff", 1);
      ctx.globalAlpha = 1;
    } else if (st === "say" && text){
      ctx.font = "8px Arial, Helvetica, sans-serif";
      var maxW = 96;
      var msg = clip(text, maxW - 10);
      var bw = Math.min(maxW, ctx.measureText(msg).width + 12);
      var bx = x + 10, by = headY - 30;
      rect(bx, by, bw, 16, "#0e2f5e", ICE, 1.2);
      ctx.fillStyle = ICE;
      ctx.textBaseline = "middle";
      ctx.fillText(msg, bx + 6, by + 8.5);
      ctx.textBaseline = "alphabetic";
      ctx.beginPath();
      ctx.moveTo(bx + 6, by + 16); ctx.lineTo(bx + 4, by + 22); ctx.lineTo(bx + 14, by + 16);
      ctx.fillStyle = "#0e2f5e"; ctx.fill();
      ctx.strokeStyle = ICE; ctx.lineWidth = 1.2; ctx.stroke();
    }
  }

  function drawCell(a, ai, st, ph, box){
    var x0 = box.x0, y0 = box.y0, w = box.w, h = box.h;
    var x1 = x0 + w, y1 = y0 + h;

    // ground + blueprint grid
    rect(x0, y0, w, h, "#081f43");
    ctx.globalAlpha = 0.16;
    for (var gx = Math.ceil(x0 / 10) * 10; gx <= x1; gx += 10) line(gx, y0, gx, 126, CY, 0.5);
    for (var gy = Math.ceil(y0 / 10) * 10; gy <= 126; gy += 10) line(x0, gy, x1, gy, CY, 0.5);
    ctx.globalAlpha = 1;
    // floor band
    rect(x0, 126, w, y1 - 126, "#050f26");
    line(x0, 126, x1, 126, CY, 1.2);
    // status band along the bottom
    var bandTop = Math.max(133, y1 - 24);
    rect(x0, bandTop, w, y1 - bandTop, "rgba(3,10,24,0.72)");
    line(x0, bandTop, x1, bandTop, "rgba(104,212,255,0.30)", 1);
    // cell frame
    rect(x0 + 0.5, y0 + 0.5, w - 1, h - 1, null, "rgba(104,212,255,0.34)", 1);

    drawStation(a.station, ph, st.kind);
    drawFigure(58, 126, st.kind, ph, st.kind === "say" ? st.label : "");

    // station light
    var lc = KIND_COLOR[st.kind] || "#7d90ae";
    var lx = x0 + 14, ly = y0 + 14;
    if (st.kind !== "waiting" && st.kind !== "idle" && !reduceMotion){
      ctx.globalAlpha = 0.16 + 0.14 * (0.5 + 0.5 * Math.sin(ph * Math.PI * 2));
      circle(lx, ly, 10, lc);
      ctx.globalAlpha = 1;
    }
    circle(lx, ly, 5, lc, "rgba(242,247,255,0.7)", 1);

    // status (right) is laid out first so the name gets whatever is left
    var statusTxt = KIND_LABEL[st.kind] || st.kind;
    var statusW = spacedWidth(statusTxt, 7);
    label(x1 - 8, y0 + 17, statusTxt, lc, 7, "right");
    var nameRoom = Math.max(40, (x1 - 8 - statusW - 10) - (lx + 12));
    label(lx + 12, y0 + 17, clipSpaced(a.name, 8.5, nameRoom), ICE, 8.5);

    ctx.font = "8.5px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "rgba(242,247,255,0.86)";
    ctx.fillText(clip(st.label || "\\u2014", w - 20), x0 + 10, bandTop + 11);
    ctx.font = "900 7px Arial, Helvetica, sans-serif";
    ctx.fillStyle = "rgba(104,212,255,0.85)";
    ctx.fillText(st.count + (st.count === 1 ? " ACTION" : " ACTIONS"), x0 + 10, bandTop + 20);
  }

  function spaced(text){
    var t = String(text).toUpperCase(), out = "";
    for (var i = 0; i < t.length; i++) out += t[i] + (i < t.length - 1 ? "\\u2009" : "");
    return out;
  }
  function spacedWidth(text, size){
    ctx.font = "900 " + size + "px Arial, Helvetica, sans-serif";
    return ctx.measureText(spaced(text)).width;
  }
  // Trim to fit measured against the letter-spaced form actually painted.
  function clipSpaced(text, size, max){
    ctx.font = "900 " + size + "px Arial, Helvetica, sans-serif";
    var t = String(text).toUpperCase();
    if (ctx.measureText(spaced(t)).width <= max) return t;
    while (t.length > 1 && ctx.measureText(spaced(t + "\\u2026")).width > max) t = t.slice(0, -1);
    return t.replace(/[\\s.]+$/, "") + "\\u2026";
  }

  function render(){
    if (!AGENTS.length || !EVENTS.length) return;
    ctx.clearRect(0, 0, layout.cssW, layout.cssH);
    // uniform scale so figures never stretch; the extra room becomes more floor
    var s = Math.min(layout.cw / CELL_UNITS_W, layout.ch / CELL_UNITS_H);
    var unitW = layout.cw / s, unitH = layout.ch / s;
    var ox = (unitW - CELL_UNITS_W) / 2, oy = (unitH - CELL_UNITS_H) / 2;
    var box = { x0: -ox, y0: -oy, w: unitW, h: unitH };
    var ph = reduceMotion ? 0 : (performance.now() % 1400) / 1400;

    AGENTS.forEach(function(a, i){
      var col = i % layout.cols, row = Math.floor(i / layout.cols);
      var cx = layout.xOff + col * layout.cw, cy = row * layout.ch;
      var st = stateAt(i, playT);
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx, cy, layout.cw, layout.ch);
      ctx.clip();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.translate(ox, oy);
      drawCell(a, i, st, (ph + i * 0.17) % 1, box);
      ctx.restore();
    });
  }

  function syncText(){
    document.getElementById("clockText").firstChild.nodeValue = fmtClock(playT);
    document.getElementById("clockDate").textContent = fmtDate(playT);
    var pal = domPalette();
    AGENTS.forEach(function(a, i){
      var st = stateAt(i, playT);
      var ref = cardRefs[i];
      if (!ref) return;
      var col = pal[st.kind] || pal.idle;
      ref.dot.style.background = col;
      ref.now.textContent = KIND_LABEL[st.kind] || st.kind;
      ref.now.style.color = col;
      ref.doing.textContent = st.label || "—";
      ref.count.textContent = String(st.count);
      var el = st.count ? Math.max(0, playT - a.startT) : 0;
      ref.elapsed.textContent = fmtDur(el);
      ref.tAct.textContent = KIND_LABEL[st.kind] || st.kind;
      ref.tAct.style.color = col;
      ref.tTxt.textContent = st.label || "—";
    });
  }

  function setPlayT(v, fromScrub){
    playT = Math.max(0, Math.min(SPAN, v));
    if (!fromScrub && SPAN > 0) scrubber.value = String(Math.round((playT / SPAN) * 1000));
    if (!fromScrub && SPAN === 0) scrubber.value = "0";
    syncText();
    render();
  }

  function setPlaying(on){
    playing = !!on && SPAN > 0 && EVENTS.length > 0;
    playBtn.setAttribute("aria-pressed", playing ? "true" : "false");
    playBtn.textContent = playing ? "Pause" : "Play";
    if (playing){ lastFrame = performance.now(); requestAnimationFrame(tick); }
  }

  function tick(now){
    if (!playing) return;
    var dt = Math.min(200, now - lastFrame);
    lastFrame = now;
    var next = playT + dt * speed;
    if (next >= SPAN){
      setPlayT(SPAN);
      setPlaying(false);
      return;
    }
    setPlayT(next);
    requestAnimationFrame(tick);
  }

  // idle animation loop (skipped entirely under reduced motion)
  function idleLoop(){
    if (!reduceMotion && !playing) render();
    requestAnimationFrame(idleLoop);
  }

  // ---- controls ---------------------------------------------------------
  playBtn.addEventListener("click", function(){
    if (playT >= SPAN) setPlayT(0);
    setPlaying(!playing);
  });
  document.getElementById("restartBtn").addEventListener("click", function(){
    setPlaying(false); setPlayT(0);
  });
  document.getElementById("endBtn").addEventListener("click", function(){
    setPlaying(false); setPlayT(SPAN);
  });
  scrubber.addEventListener("input", function(){
    setPlaying(false);
    var frac = Number(scrubber.value) / 1000;
    setPlayT(SPAN * frac, true);
  });

  var speedBtns = document.getElementById("speedBtns");
  var speedRefs = [];
  SPEEDS.forEach(function(s){
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = s.label;
    b.setAttribute("aria-pressed", s.v === speed ? "true" : "false");
    b.addEventListener("click", function(){
      speed = s.v;
      speedRefs.forEach(function(r){
        r.b.setAttribute("aria-pressed", r.v === speed ? "true" : "false");
      });
    });
    speedBtns.appendChild(b);
    speedRefs.push({ b: b, v: s.v });
  });

  window.addEventListener("resize", function(){ computeLayout(); render(); });
  try {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", function(){ syncText(); render(); });
  } catch (e) {}

  computeLayout();
  setPlayT(0);
  requestAnimationFrame(idleLoop);
  if (!reduceMotion) setPlaying(true);
})();
</script>
`;

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];
  let dir;
  if (arg) {
    dir = resolve(arg);
    try {
      if (!(await stat(dir)).isDirectory()) throw new Error('not a directory');
    } catch {
      const alt = join(WORKFLOWS_DIR, arg);
      try {
        if ((await stat(alt)).isDirectory()) dir = alt;
        else throw new Error('not a directory');
      } catch {
        console.error('build-workshop: no such workflow directory: ' + arg);
        process.exit(2);
      }
    }
  } else {
    dir = join(WORKFLOWS_DIR, DEFAULT_WORKFLOW);
    try {
      await stat(dir);
    } catch {
      // Default run is gone — fall back to the newest workflow dir we can see.
      let picked = null;
      try {
        const entries = await readdir(WORKFLOWS_DIR);
        const wfs = [];
        for (const e of entries) {
          if (!/^wf_/.test(e)) continue;
          const p = join(WORKFLOWS_DIR, e);
          const s = await stat(p);
          if (s.isDirectory()) wfs.push({ p, m: s.mtimeMs });
        }
        wfs.sort((a, b) => b.m - a.m);
        picked = wfs.length ? wfs[0].p : null;
      } catch {}
      if (!picked) {
        console.error('build-workshop: no workflow directories under ' + WORKFLOWS_DIR);
        process.exit(2);
      }
      dir = picked;
    }
  }

  const data = await build(dir);
  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, renderPage(data));

  // summary
  const counts = {};
  for (const e of data.events) counts[e.kind] = (counts[e.kind] || 0) + 1;
  const mins = data.span / 60000;
  console.log('build-workshop');
  console.log('  source   ' + dir);
  console.log('  run      ' + data.runId);
  console.log('  agents   ' + data.agents.length);
  for (const a of data.agents) {
    console.log(
      '           ' +
        a.short +
        '  ' +
        a.name.padEnd(24) +
        (a.station + '/' + a.role).padEnd(22) +
        String(a.count).padStart(4) +
        ' events' +
        (a.doneT != null ? '  [done]' : '') +
        (a.sibling ? '  [sibling]' : '')
    );
  }
  console.log('  events   ' + data.events.length);
  console.log(
    '           ' +
      Object.keys(counts)
        .sort()
        .map((k) => k + '=' + counts[k])
        .join('  ')
  );
  console.log(
    '  span     ' +
      (mins >= 1 ? mins.toFixed(1) + ' min' : (data.span / 1000).toFixed(1) + ' s') +
      '  (' +
      (data.t0Iso || 'n/a') +
      ' → ' +
      (data.tEndIso || 'n/a') +
      ')'
  );
  console.log('  wrote    ' + OUT_FILE);
}

main().catch((e) => {
  console.error('build-workshop failed: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
