# -*- coding: utf-8 -*-
"""Regenerate the admin "3D Model" tab from web/vanhorn-3d/index.html.

The Van Horn construction-sequence viewer is a whole standalone page. The admin
portal needs it as one tab inside a much larger document, so this script lifts
its CSS, markup and JS and rewrites them to be collision-proof:

  * every CSS selector is scoped under ``#bp3dRoot``
  * every class the viewer owns is prefixed ``bp-``
  * every id the viewer owns is prefixed ``bp3d-``
  * the page-level IIFE becomes ``window.__BP3D.mount(root) -> {destroy}``

so the viewer, Assistify (which runs in its own iframe) and the site's own bare
element rules cannot reach each other. The canvas measures its container, so the
tab is mounted only once it is in the live visible DOM and destroyed on the way
out -- that is what the returned ``destroy`` is for.

Everything this script writes into web/main-site/index.html sits between
``/* ==BEGIN GEN ... == */`` and ``/* ==END GEN ... == */`` markers and is
replaced wholesale on every run. Do not hand-edit inside the markers; change
web/vanhorn-3d/index.html and re-run:

    python3 web/main-site/build-vanhorn3d.py
"""
from pathlib import Path
import io
import re
import sys

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
SOURCE = REPO / "web" / "vanhorn-3d" / "index.html"
TARGET = HERE / "index.html"


def die(message):
    raise SystemExit("build-vanhorn3d: " + message)


if not SOURCE.is_file():
    die("missing source viewer " + str(SOURCE))

src = SOURCE.read_text(encoding="utf-8")

# ------------------------------------------------------------------ split ----
try:
    css = src.split("<style>", 1)[1].split("</style>", 1)[0]
    body = src.split("<body>", 1)[1].split("</body>", 1)[0]
    markup, rest = body.split("<script>", 1)
    data_js, rest = rest.split("</script>", 1)
    main_js = rest.split("<script>", 1)[1].split("</script>", 1)[0]
except IndexError:
    die("web/vanhorn-3d/index.html no longer has the expected <style>/markup/data/JS shape")

EMBED_CSS = """

/* ---- embedded-tab overrides (the viewer is a portal tab, not a whole page) ---- */
#bp3dRoot{border:1px solid var(--line);background:var(--page-bg)}
#bp3dRoot .bp-main{height:min(78vh,760px);min-height:520px}
@media (max-width:900px){#bp3dRoot .bp-main{height:auto}}
"""

CLASSES = set("""bl br c check cy d desc det done eyebrow field headline hud i it lb lg m mark
more n nm note now num ok on open panel prog q r run sec sheet src st steps sw tag tl top u v
viewport vp-tools x main""".split())
IDS = ["view", "autorot", "rotWrap", "dimBtn", "resetBtn", "hudStage", "hudName", "legend",
       "stage", "prevBtn", "nextBtn", "runBtn", "prog", "hlLabel", "hlValue", "hlUnit",
       "hlNote", "stageDesc", "qCount", "qBody", "checkBody", "checkNote", "notesWrap",
       "notesList", "srcLine"]


def pfx(name):
    return "bp-" + name


# -------------------------------------------------------------------- CSS ----
css = css.replace(':root:not([data-theme="light"]){}\n', '')
css = css.replace("html,body{height:100%}\n", "")
css = css.replace("*{box-sizing:border-box}", "SCOPE, SCOPE *{box-sizing:border-box}")
css = re.sub(r'(?m)^:root\{', 'SCOPE{', css, count=1)
css = css.replace(':root:not([data-theme="light"]){', ':root:not([data-theme="light"]) SCOPE{')
css = css.replace(':root[data-theme="dark"]{', ':root[data-theme="dark"] SCOPE{')
css = css.replace(':root:not([data-theme="light"]) .', ':root:not([data-theme="light"]) SCOPE .')
css = css.replace(':root[data-theme="dark"] .', ':root[data-theme="dark"] SCOPE .')
css = re.sub(r'(?m)^body\{', 'SCOPE{', css, count=1)
css = re.sub(r'(?m)^main\{', 'SCOPE .main{', css, count=1)
css = css.replace("header.top", ".top").replace("aside.panel", ".panel")
css = css.replace("main{display:grid", ".main{display:grid")
css = re.sub(r'(?<![\w.#-])main\{', '.main{', css)


def css_cls(match):
    name = match.group(1)
    return "." + pfx(name) if name in CLASSES else match.group(0)


css = re.sub(r'\.([A-Za-z][A-Za-z0-9_-]*)(?![A-Za-z0-9_-])', css_cls, css)
for ident in IDS:
    css = re.sub(r'#' + re.escape(ident) + r'(?![A-Za-z0-9_-])', '#bp3d-' + ident, css)

scoped_lines = []
for line in css.split("\n"):
    stripped = line.strip()
    if (stripped.startswith("SCOPE") or stripped.startswith("@") or stripped.startswith("/*")
            or stripped.startswith("}") or stripped.startswith(":root")
            or "{" not in stripped or stripped.startswith("--")):
        scoped_lines.append(line)
        continue
    head, brace, tail = line.partition("{")
    selectors = [part.strip() for part in head.split(",")]
    if not selectors or not selectors[0]:
        scoped_lines.append(line)
        continue
    joined = ", ".join(sel if sel.startswith("SCOPE") else "SCOPE " + sel for sel in selectors)
    lead = line[:len(line) - len(line.lstrip())]
    scoped_lines.append(lead + joined + brace + tail)
css = "\n".join(scoped_lines)
css = css.replace("SCOPE", "#bp3dRoot").replace("#bp3dRoot ..bp-main", "#bp3dRoot .bp-main")
css += EMBED_CSS

if re.search(r'(?m)^(?!#bp3dRoot|@|\}|/\*|\s|$)', css):
    unscoped = [ln for ln in css.split("\n")
                if ln and not ln.startswith(("#bp3dRoot", "@", "}", "/*", " ", "\t"))
                and ":root" not in ln]
    if unscoped:
        die("unscoped CSS would leak into the site: " + unscoped[0][:90])

# ----------------------------------------------------------------- markup ----
CLSRE = re.compile(r'(class=")([^"]*)(")')


def attr_cls(match):
    tokens = match.group(2).split()
    return match.group(1) + " ".join(pfx(t) if t in CLASSES else t for t in tokens) + match.group(3)


markup = CLSRE.sub(attr_cls, markup)
markup = markup.replace("<header class=", '<div class=').replace("</header>", "</div>")
markup = markup.replace("<main>", '<div class="bp-main">').replace("</main>", "</div>")
markup = markup.replace("<aside class=", '<div class=').replace("</aside>", "</div>")
for ident in IDS:
    markup = markup.replace('id="' + ident + '"', 'id="bp3d-' + ident + '"')
markup = markup.replace('for="stage"', 'for="bp3d-stage"')
markup = markup.strip()

if "${" in markup or "`" in markup:
    die("viewer markup gained a backtick or ${...}; it can no longer be a plain template literal")
if "</script" in markup.lower():
    die("viewer markup gained a </script sequence")

# --------------------------------------------------------------------- JS ----
js = main_js
JSREPL = [
    ("rotWrap.classList.remove('on')", "rotWrap.classList.remove('bp-on')"),
    ("rotWrap.classList.toggle('on',rotCb.checked)", "rotWrap.classList.toggle('bp-on',rotCb.checked)"),
    ("bars[i].className = (i+1)<cur?'done':((i+1)===cur?'now':'');",
     "bars[i].className = (i+1)<cur?'bp-done':((i+1)===cur?'bp-now':'');"),
    ('<span class="tag i">med</span>', '<span class="bp-tag bp-i">med</span>'),
    ('<span class="tag i">low</span>', '<span class="bp-tag bp-i">low</span>'),
    ('<tr class="it" data-i="', '<tr class="bp-it" data-i="'),
    ('<td class="n">', '<td class="bp-n">'),
    ('<td class="u">', '<td class="bp-u">'),
    ('<tr class="det" hidden><td class="d" colspan="3">', '<tr class="bp-det" hidden><td class="bp-d" colspan="3">'),
    ('<td class="r">', '<td class="bp-r">'),
    ('<td class="r \'+(c.ok?\'ok\':\'\')+\'">', '<td class="bp-r \'+(c.ok?\'bp-ok\':\'\')+\'">'),
    ("closest('tr.it')", "closest('tr.bp-it')"),
    ("classList.contains('det')", "classList.contains('bp-det')"),
    ("tr.classList.toggle('open',!det.hidden)", "tr.classList.toggle('bp-open',!det.hidden)"),
    ('<div class="lg"><span class="sw"', '<div class="bp-lg"><span class="bp-sw"'),
]
for old, new in JSREPL:
    if old not in js:
        die("viewer JS pattern missing (class/id prefixing would be incomplete): " + old)
    js = js.replace(old, new)

js = re.sub(r"document\.getElementById\('([A-Za-z0-9_]+)'\)", r"gid('\1')", js)
if "document.getElementById" in js:
    die("viewer JS still reaches document.getElementById; it would collide with the site")

if not js.lstrip().startswith("'use strict';\n(function(){"):
    die("viewer JS no longer starts with its 'use strict' IIFE")
js = js.replace("'use strict';\n(function(){", "", 1)
TAIL = "requestAnimationFrame(loop);\n})();"
if not js.rstrip().endswith(TAIL):
    die("viewer JS no longer ends with its requestAnimationFrame boot")
body_js = js.rstrip()[:-len(TAIL)]

body_js = body_js.replace("function loop(now){", "function loop(now){\n  if(destroyed) return;", 1)
body_js = body_js.replace("  requestAnimationFrame(loop);\n}", "  rafId=requestAnimationFrame(loop);\n}", 1)

OLD_BOOT = ("resize();\n"
            "if(window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentElement);\n"
            "else window.addEventListener('resize',resize);\n")
if OLD_BOOT not in body_js:
    die("viewer JS boot block not found; the mount/destroy wrapper cannot be applied")
body_js = body_js.replace(OLD_BOOT, "")

HEAD = ("  var destroyed=false, rafId=0, ro=null;\n"
        "  function gid(id){ return root.querySelector('#bp3d-'+id); }\n")
BOOT = ("\nresize();\n"
        "if(window.ResizeObserver){ ro=new ResizeObserver(resize); ro.observe(canvas.parentElement); }\n"
        "else window.addEventListener('resize',resize);\n"
        "rafId=requestAnimationFrame(loop);\n"
        "return { destroy:function(){\n"
        "  destroyed=true;\n"
        "  if(rafId){ try{cancelAnimationFrame(rafId);}catch(e){} rafId=0; }\n"
        "  try{ stopRun(); }catch(e){}\n"
        "  if(ro){ try{ro.disconnect();}catch(e){} ro=null; }\n"
        "  try{ window.removeEventListener('resize',resize); }catch(e){}\n"
        "} };\n")

js_final = ("/* Van Horn construction-sequence viewer (web/vanhorn-3d/index.html), namespaced.\n"
            "   Generated by web/main-site/build-vanhorn3d.py -- do not hand-edit. */\n"
            "window.__BP3D = (function(){\n'use strict';\n"
            + data_js.strip() + "\n"
            "function mount(root){\n" + HEAD + body_js + BOOT + "}\n"
            "return { mount: mount };\n})();\n")

if "</script" in js_final.lower():
    die("generated viewer JS contains a </script sequence")

# ------------------------------------------------------------ mount block ----
mount_block = '''/* ============================ ADMIN TAB: 3D MODEL (VAN HORN) ============================
   The viewer's markup, CSS and JS come from web/vanhorn-3d/index.html. The markup is a plain
   template literal (no ${} in it), the CSS is scoped under #bp3dRoot, and the JS lives in
   window.__BP3D behind a mount(root)/destroy() pair. The canvas sizes itself to its container,
   so it is mounted only once the tab is in the live, visible DOM (mountBp3d in show()) and torn
   down on the way out (unmountBp3d).

   This is the Van Horn seven-stage construction-sequence model. Assistify is a different tool
   on its own tab (#/admin-portal/assistify) and in the contractor portal; the two do not share
   data, geometry or storage. */
const BP3D_MARKUP = String.raw`__MARKUP__`;
function adminModelBody(){
  return `<section class="ac-panel">
    <header class="ac-phead"><div><span>3D BLUEPRINT VIEWER</span><h2>Van Horn Residence &mdash; construction sequence</h2>
      <p>Seven build stages drawn from the issued three-sheet set. Every quantity on the right is the takeoff's own number; the model checks its drawn geometry against it and flags the deltas.</p></div></header>
    <p class="ac-model-note">Drag to orbit, wheel to zoom, or step the stages. Runs entirely in this page &mdash; hand-written Canvas 3D, no libraries, no network.</p>
    <div id="bp3dRoot">${BP3D_MARKUP}</div>
  </section>`;
}
let bp3d=null;
function mountBp3d(){
  unmountBp3d();
  const root=document.getElementById("bp3dRoot");
  if(!root) return;
  if(!window.__BP3D){ root.innerHTML='<p class="bp3d-fail">The 3D model script did not load.</p>'; return; }
  try{ bp3d=window.__BP3D.mount(root); }
  catch(err){ console.error(err); root.innerHTML='<p class="bp3d-fail">The 3D model could not start in this browser.</p>'; }
}
function unmountBp3d(){ if(bp3d){ try{ bp3d.destroy(); }catch(err){} bp3d=null; } }
'''.replace("__MARKUP__", markup)


# ----------------------------------------------------------------- inject ----
def region(name, payload, comment=True):
    begin = "/* ==BEGIN GEN %s== */" % name if comment else "<!-- ==BEGIN GEN %s== -->" % name
    end = "/* ==END GEN %s== */" % name if comment else "<!-- ==END GEN %s== -->" % name
    return begin, end, begin + "\n" + payload.rstrip("\n") + "\n" + end


def put(text, name, payload, anchors=(), before=True, comment=True):
    """Replace the marked region, or create it at the first anchor found."""
    begin, end, block = region(name, payload, comment)
    pattern = re.compile(re.escape(begin) + r"[\s\S]*?" + re.escape(end))
    if pattern.search(text):
        return pattern.sub(lambda _m: block, text, count=1)
    for anchor in anchors:
        if anchor in text:
            return text.replace(anchor, (block + "\n" + anchor) if before else (anchor + "\n" + block), 1)
    die("cannot place region %r: no anchor found (run build-bp3d.py first)" % name)


text = TARGET.read_text(encoding="utf-8")

text = put(text, "vanhorn3d-css", css,
           anchors=("/* ==BEGIN GEN assistify-css== */",
                    "/* ===================== ADMIN TAB: ASSISTIFY 3D ===================== */"))

text = put(text, "vanhorn3d-js", "<script>\n" + js_final.rstrip("\n") + "\n</script>",
           comment=False,
           anchors=('<script id="assistify-b64" type="application/base64">',
                    '<script id="estimator-b64" type="application/base64">'))

# The merged tree points the "3D Model" tab at an Assistify iframe. Reclaim it.
legacy = re.compile(
    r"/\* ============================ ADMIN: 3D BLUEPRINT MODEL ============================[\s\S]*?"
    r"function unmountBp3d\(\)\{\}\n")
if legacy.search(text):
    text = legacy.sub("/* ==BEGIN GEN vanhorn3d-mount== */\n/* ==END GEN vanhorn3d-mount== */\n", text, count=1)
text = put(text, "vanhorn3d-mount", mount_block,
           anchors=("/* ==BEGIN GEN assistify-mount== */",
                    "/* ============================ MEMBER: PRICE COMPARISON ============================ */"))

if "function adminModelBody" not in text:
    die("adminModelBody vanished from the main site")
if text.count("function adminModelBody") != 1:
    die("adminModelBody is defined more than once")

TARGET.write_text(text, encoding="utf-8", newline="\n")
sys.stdout.write(
    "build-vanhorn3d: css %d B, markup %d B, js %d B -> %s\n"
    % (len(css), len(markup), len(js_final), TARGET))
