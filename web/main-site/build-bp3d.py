# -*- coding: utf-8 -*-
"""Wire Assistify into web/main-site/index.html for BOTH delivery targets.

Builder Assist ships two ways and Assistify has to work in both:

  hosted    the site is served over HTTP (chatgpt.site, Cloudflare,
            `python3 -m http.server`). Sibling files resolve, so
            <iframe src="../blueprint-3d/index.html"> runs the real
            multi-file app straight from web/blueprint-3d/.

  artifact  the site is ONE published HTML file with no siblings, no network
            and a strict CSP. That same iframe src is a dead reference there --
            it silently renders an empty frame. So the page also carries the
            self-contained build produced by tools/build-assistify-bundle.mjs,
            base64-encoded in <script id="assistify-b64">, and feeds it to the
            iframe through srcdoc -- the same pattern the cost estimator
            already uses.

The page does not guess which target it is in. It points the frame at the
sibling and then checks the loaded document for Assistify's #assistifyRoot;
anything short of a live Assistify document falls back to the embedded bundle.
Whichever path runs, the viewer gets a working Assistify, never a blank frame.

Assistify appears in two places, and the viewer is NOT copied into this file --
both entry points execute web/blueprint-3d/engine.js against the same validated
model contract:

  * admin tab  #/admin-portal/assistify
  * contractor member portal, station 02, between plan intake and orders

The admin "3D Model" tab (#/admin-portal/model) is a different tool -- the Van
Horn seven-stage construction-sequence viewer -- and is generated separately by
build-vanhorn3d.py. Run this script first on a fresh checkout; it creates the
region markers build-vanhorn3d.py anchors against.

    node tools/build-assistify-bundle.mjs
    python3 web/main-site/build-bp3d.py
    python3 web/main-site/build-vanhorn3d.py

Everything written here lives between ==BEGIN GEN ...== / ==END GEN ...==
markers and is replaced wholesale on each run. Do not hand-edit inside them.
"""
from pathlib import Path
import base64
import re
import sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
SOURCE = REPO / "web" / "blueprint-3d"
BUNDLE = REPO / "web" / "assistify-bundle" / "index.html"
TARGET = HERE / "index.html"
SIZE_BUDGET = 12 * 1024 * 1024


def die(message):
    raise SystemExit("build-bp3d: " + message)


required = [SOURCE / name for name in
            ("index.html", "engine.js", "concept-geometry.js", "progress-tracker.js",
             "pdf-import.js", "model-schema.json", "project-model.json")]
missing = [str(path) for path in required if not path.is_file()]
if missing:
    die("Assistify source asset missing: " + ", ".join(missing))
if not BUNDLE.is_file():
    die("missing %s -- run `node tools/build-assistify-bundle.mjs` first" % BUNDLE)

bundle_bytes = BUNDLE.read_bytes()
bundle_text = bundle_bytes.decode("utf-8")
# The bundle is the artifact-target fallback. If it is not actually
# self-contained it would be a blank frame with no way to notice, so check.
for needle, why in (
        ('id="assistifyRoot"', "the mount root the loader probes for"),
        ("Assistify3D.mount", "the engine entry point"),
        ("globalThis.pdfjsWorker", "the inlined worker-less PDF.js runtime"),
        ("__ASSISTIFY_BUNDLE__", "the embedded JSON assets")):
    if needle not in bundle_text:
        die("bundle is missing %s (%s); rebuild it" % (needle, why))
for tag in re.findall(r'<(?:script|link|img|iframe)\b[^>]*?\b(?:src|href)\s*=\s*"([^"]+)"', bundle_text):
    if tag.startswith("data:"):
        continue
    die("bundle still references an external file: " + tag[:120])

payload = base64.b64encode(bundle_bytes).decode("ascii")

# ------------------------------------------------------------------- pieces --
CSS = """/* ===================== ASSISTIFY 3D MOUNTS ===================== */
.ac-model-note{margin:0 0 14px;color:var(--muted);font-size:12px;line-height:1.6}
.bp3d-fail{padding:24px;color:var(--muted);font-size:13px}
.assistify-frame{display:block;width:100%;height:min(82vh,860px);min-height:620px;border:1px solid var(--line);background:#07111f}
.assistify-mount-note{margin:8px 0 0;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.assistify-station-lede{max-width:70ch;margin:0 0 22px;color:#63758e;font-size:13px;line-height:1.72}
.assistify-station-frame{height:min(78vh,760px);min-height:520px;border:1px solid var(--line)}
@media(max-width:900px){.assistify-frame{height:760px;min-height:0}.assistify-station-frame{height:720px;min-height:0}}
@media(max-width:560px){.assistify-frame,.assistify-station-frame{height:640px}}
"""

MOUNT_JS = r'''/* ============================ ASSISTIFY 3D (dual delivery target) ============================
   Hosted: the sibling app at web/blueprint-3d/ resolves and runs.
   Artifact: there is no sibling, so the self-contained build in #assistify-b64 is fed to the
   same iframe through srcdoc -- the estimator's proven pattern.
   We detect rather than assume: point the frame at the sibling, then look for Assistify's own
   #assistifyRoot in what loaded. No live Assistify document (404, blocked, cross-origin,
   timeout) means the bundle takes over, so nobody is ever left with an empty frame.
   Generated by web/main-site/build-bp3d.py -- do not hand-edit. */
function decodeAssistifyBundle(){
  const b64=(document.getElementById("assistify-b64")||{}).textContent||"";
  try{ return new TextDecoder().decode(Uint8Array.from(atob(b64.trim()), c=>c.charCodeAt(0))); }
  catch(e){ return ""; }
}
const assistifyMounts=new Map();
function assistifyNoteFor(frame){
  const scope=frame.closest(".ac-panel, .station-content") || frame.parentElement;
  return scope ? scope.querySelector("[data-assistify-note]") : null;
}
function mountAssistifyFrame(frame){
  if(!frame || assistifyMounts.has(frame)) return;
  const note=assistifyNoteFor(frame);
  const rec={timer:0, settled:false};
  assistifyMounts.set(frame, rec);
  const settle=(useBundle)=>{
    if(rec.settled) return;
    rec.settled=true;
    clearTimeout(rec.timer); rec.timer=0;
    if(!useBundle){ if(note) note.textContent="Live app · web/blueprint-3d/"; return; }
    const html=decodeAssistifyBundle();
    if(!html){ if(note) note.textContent="The embedded Assistify build could not be decoded in this browser."; return; }
    try{ frame.removeAttribute("src"); frame.srcdoc=html; }
    catch(e){ if(note) note.textContent="Assistify could not start in this browser."; return; }
    if(note) note.textContent="Self-contained build embedded in this page";
  };
  rec.onLoad=()=>{
    let live=false;
    try{ const doc=frame.contentDocument; live=!!(doc && doc.getElementById("assistifyRoot")); }
    catch(e){ live=false; }
    settle(!live);
  };
  rec.onError=()=>settle(true);
  frame.addEventListener("load", rec.onLoad, {once:true});
  frame.addEventListener("error", rec.onError, {once:true});
  rec.timer=setTimeout(()=>settle(true), 6000);
  try{ frame.src="../blueprint-3d/index.html"; }
  catch(e){ settle(true); }
}
function unmountAssistifyFrame(frame){
  const rec=frame?assistifyMounts.get(frame):null;
  if(!rec) return;
  if(rec.timer) clearTimeout(rec.timer);
  frame.removeEventListener("load", rec.onLoad);
  frame.removeEventListener("error", rec.onError);
  assistifyMounts.delete(frame);
  /* stop the viewer's rAF loop and its localStorage writes the moment the tab is left */
  try{ frame.removeAttribute("srcdoc"); frame.src="about:blank"; }catch(e){}
}
function adminAssistifyBody(){
  return `<section class="ac-panel">
    <header class="ac-phead"><div><span>ASSISTIFY 3D</span><h2>Project-specific construction model</h2>
      <p>Twelve construction stages, source-linked geometry, explicit unresolved states, and a shared feet-based Canvas engine.</p></div></header>
    <p class="ac-model-note">No sample property is loaded. Import a schema-valid model generated from the active project's plans. Browser persistence is prototype-only.</p>
    <iframe class="assistify-frame" id="assistifyFrame" title="Assistify project-specific 3D construction viewer"></iframe>
    <p class="assistify-mount-note" data-assistify-note>Starting Assistify&hellip;</p>
  </section>`;
}
function mountAssistifyAdmin(){ mountAssistifyFrame(document.getElementById("assistifyFrame")); }
function unmountAssistifyAdmin(){ const f=document.getElementById("assistifyFrame"); if(f) unmountAssistifyFrame(f); }
/* The contractor station lives in a long scrolling page, so it starts only when it is actually
   on screen and is torn down when the portal is left -- nothing keeps rendering in a tab the
   contractor is not looking at. */
let assistifyStationWatch=null;
function mountAssistifyStation(){
  unmountAssistifyStation();
  const frame=document.getElementById("assistifyStationFrame");
  if(!frame) return;
  if(!("IntersectionObserver" in window)){ mountAssistifyFrame(frame); return; }
  assistifyStationWatch=new IntersectionObserver((entries)=>{
    for(const entry of entries){
      if(!entry.isIntersecting) continue;
      mountAssistifyFrame(frame);
      if(assistifyStationWatch){ assistifyStationWatch.disconnect(); assistifyStationWatch=null; }
    }
  },{rootMargin:"240px 0px"});
  assistifyStationWatch.observe(frame);
}
function unmountAssistifyStation(){
  if(assistifyStationWatch){ try{ assistifyStationWatch.disconnect(); }catch(e){} assistifyStationWatch=null; }
  const frame=document.getElementById("assistifyStationFrame");
  if(frame) unmountAssistifyFrame(frame);
}
'''

STATION = '''    <section class="portal-station" id="gc-assistify">
      <div class="station-number"><span>02</span><small>PLAN-TRACEABLE MODEL</small></div>
      <div class="station-content">
        <header class="station-heading"><div><span>ASSISTIFY 3D</span><h2>See the build before you order it.</h2></div><p>Assistify turns the reviewed plan set into a source-cited 3D model across twelve construction stages, then tracks field progress against it.</p></header>
        <p class="assistify-station-lede">Every shape cites the sheet it came from. Geometry with no plan evidence stays UNVERIFIED instead of being drawn, and dashed discipline-colored shapes are explicit INFERRED communication guesses &mdash; never permit, survey, coordination, or fabrication geometry. Field progress is operational data and is kept separate from the approved plan model.</p>
        <iframe class="assistify-frame assistify-station-frame" id="assistifyStationFrame" title="Assistify project-specific 3D construction viewer"></iframe>
        <p class="assistify-mount-note" data-assistify-note>Assistify starts when this station scrolls into view.</p>
      </div>
    </section>'''


# ------------------------------------------------------------------ helpers --
def markers(name, comment=True):
    if comment:
        return "/* ==BEGIN GEN %s== */" % name, "/* ==END GEN %s== */" % name
    return "<!-- ==BEGIN GEN %s== -->" % name, "<!-- ==END GEN %s== -->" % name


def put(text, name, payload, anchors=(), before=True, comment=True):
    """Replace a marked region, or create it at the first anchor found."""
    begin, end = markers(name, comment)
    block = begin + "\n" + payload.rstrip("\n") + "\n" + end
    pattern = re.compile(re.escape(begin) + r"[\s\S]*?" + re.escape(end))
    if pattern.search(text):
        return pattern.sub(lambda _m: block, text, count=1)
    for anchor in anchors:
        if anchor in text:
            return text.replace(anchor, (block + "\n" + anchor) if before else (anchor + "\n" + block), 1)
    die("cannot place region %r: no anchor found" % name)


def sub_once(text, pattern, replacement, already, what):
    """Idempotent regex edit: skip when the edit is already in place."""
    if already in text:
        return text
    text, count = re.subn(pattern, replacement, text, count=1)
    if count != 1:
        die("could not apply edit: " + what)
    return text


text = TARGET.read_text(encoding="utf-8")

# The merged tree left an "Unconfigured project" takeoff placeholder in place of the
# Van Horn sample. Keep it: PlanIQ must not show a fabricated project.
text = re.sub(
    r"window\.__TAKEOFF = \{[^\n]*\};",
    'window.__TAKEOFF = {"project_name":"Unconfigured project","sheets":[],"items":[],'
    '"assumptions":[],"open_questions":[],"status":"UNVERIFIED"};',
    text, count=1)

# ---- CSS -------------------------------------------------------------------
legacy_css = re.compile(
    r"/\* ===================== ADMIN TAB: (?:ASSISTIFY 3D|3D BLUEPRINT VIEWER)[\s\S]*?(?=\n</style>)")
if "==BEGIN GEN assistify-css==" not in text and legacy_css.search(text):
    text = legacy_css.sub("/* ==BEGIN GEN assistify-css== */\n/* ==END GEN assistify-css== */", text, count=1)
text = put(text, "assistify-css", CSS, anchors=("\n</style>",))

# ---- base64 bundle payload -------------------------------------------------
b64_tag = '<script id="assistify-b64" type="application/base64">'
b64_block = b64_tag + payload + "</script>"
if re.search(r'<script id="assistify-b64"[\s\S]*?</script>', text):
    text = re.sub(r'<script id="assistify-b64"[\s\S]*?</script>', lambda _m: b64_block, text, count=1)
else:
    anchor = '<script id="estimator-b64" type="application/base64">'
    if anchor not in text:
        die("cannot place the Assistify bundle: the estimator payload block is gone")
    end = text.index("</script>", text.index(anchor)) + len("</script>")
    text = text[:end] + "\n" + b64_block + text[end:]

# ---- mount JS --------------------------------------------------------------
# The merged tree pointed the "3D Model" tab straight at an Assistify iframe.
# Retire that block; the Van Horn viewer takes the tab back (build-vanhorn3d.py).
legacy_mount = re.compile(
    r"/\* ============================ ADMIN: 3D BLUEPRINT MODEL ============================[\s\S]*?"
    r"function unmountBp3d\(\)\{\}\n")
if legacy_mount.search(text):
    text = legacy_mount.sub("/* ==BEGIN GEN vanhorn3d-mount== */\n/* ==END GEN vanhorn3d-mount== */\n", text, count=1)
text = put(text, "assistify-mount", MOUNT_JS,
           anchors=("/* ============================ MEMBER: PRICE COMPARISON ============================ */",))

# ---- admin nav + route -----------------------------------------------------
text = sub_once(
    text,
    r'\["model","3D Model"\]\]',
    '["model","3D Model"],["assistify","Assistify 3D"]]',
    '["assistify","Assistify 3D"]',
    'admin nav entry for the Assistify tab')
text = sub_once(
    text,
    r'(  if\(sub==="model"\)         return adminShell\("model", adminModelBody\(\)\);\n)',
    r'\1  if(sub==="assistify")     return adminShell("assistify", adminAssistifyBody());\n',
    'adminShell("assistify"',
    'admin route for the Assistify tab')

# ---- contractor portal station --------------------------------------------
text = sub_once(
    text,
    r'(<nav aria-label="Portal"><a href="#gc-planiq">PlanIQ</a>)(<a href="#gc-orders">Orders</a>)',
    r'\1<a href="#gc-assistify">Assistify 3D</a>\2',
    '<a href="#gc-assistify">Assistify 3D</a>',
    'contractor portal nav link')

begin_st, end_st = markers("assistify-station", comment=False)
if begin_st not in text:
    anchor = '    <section class="portal-station" id="gc-orders">'
    if anchor not in text:
        die("contractor portal orders station not found")
    text = text.replace(anchor, begin_st + "\n" + STATION + "\n" + end_st + "\n" + anchor, 1)
else:
    text = re.sub(re.escape(begin_st) + r"[\s\S]*?" + re.escape(end_st),
                  lambda _m: begin_st + "\n" + STATION + "\n" + end_st, text, count=1)

# Renumber ORDERS so the build sequence stays truthful.
text = sub_once(
    text,
    r'(<section class="portal-station" id="gc-orders">\s*\n\s*<div class="station-number"><span>)02(</span>)',
    r'\g<1>03\g<2>',
    '<span>03</span><small>ORDERS</small>',
    'renumber the contractor orders station to 03')

# ---- router ----------------------------------------------------------------
# In-page anchors used to bounce the viewer to the home page first, so the
# portal nav's own #gc-* links (PlanIQ, Assistify 3D, Orders) navigated away
# from the portal and then scrolled to an element that no longer existed. Only
# fall back to home when the target really is not on the current screen.
text = sub_once(
    text,
    r'if\(raw && !raw\.startsWith\("#/"\)\)\{ if\(currentView!=="home"\) show\("home"\); '
    r'const el=document\.getElementById\(raw\.slice\(1\)\); if\(el\) el\.scrollIntoView\(\{behavior:"smooth"\}\); return; \}',
    'if(raw && !raw.startsWith("#/")){ let el=document.getElementById(raw.slice(1)); '
    'if(!el && currentView!=="home"){ show("home"); el=document.getElementById(raw.slice(1)); } '
    'if(el) el.scrollIntoView({behavior:"smooth"}); return; }',
    'if(!el && currentView!=="home"){ show("home");',
    'in-page anchor handling so portal nav links stay in the portal')

text = sub_once(
    text,
    r'(  unmountBp3d\(\);   /\* cancel the model\'s rAF loop before its canvas is detached \*/\n)',
    r'\1  unmountAssistifyAdmin(); unmountAssistifyStation();   /* stop any Assistify frame before it is detached */\n',
    'unmountAssistifyAdmin(); unmountAssistifyStation();',
    'router teardown for the Assistify frames')
text = sub_once(
    text,
    r'(  if\(view==="admin-portal" && sub==="model"\) mountBp3d\(\);\n)',
    r'\1  if(view==="admin-portal" && sub==="assistify") mountAssistifyAdmin();\n'
    r'  if(view==="member-portal" && sub!=="compare" && session && session.tenant==="general") mountAssistifyStation();\n',
    'sub==="assistify") mountAssistifyAdmin();',
    'router mount for the Assistify frames')

TARGET.write_text(text, encoding="utf-8", newline="\n")

size = TARGET.stat().st_size
sys.stdout.write("build-bp3d: bundle %.1f KB -> base64 %.1f KB\n"
                 % (len(bundle_bytes) / 1024, len(payload) / 1024))
sys.stdout.write("build-bp3d: %s is %.2f MB (budget %.0f MB)\n"
                 % (TARGET.name, size / 1024 / 1024, SIZE_BUDGET / 1024 / 1024))
if size > SIZE_BUDGET:
    die("main-site page exceeds the %.0f MB budget" % (SIZE_BUDGET / 1024 / 1024))
