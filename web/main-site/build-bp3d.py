# -*- coding: utf-8 -*-
"""Extract web/blueprint-3d/index.html into namespaced CSS / HTML / JS fragments
for embedding as an admin-portal tab in web/main-site/index.html."""
import re, io, json, sys, os

SRC = "/home/user/Builder-assist/web/blueprint-3d/index.html"
OUT = os.environ.get("OUT_DIR", "/tmp/bp3d-build")
os.makedirs(OUT, exist_ok=True)
src = io.open(SRC, encoding="utf-8").read()

EMBED_CSS = """

/* ---- embedded-tab overrides (the viewer is a portal tab, not a whole page) ---- */
#bp3dRoot{border:1px solid var(--line);background:var(--page-bg)}
#bp3dRoot .bp-main{height:min(78vh,760px);min-height:520px}
@media (max-width:900px){#bp3dRoot .bp-main{height:auto}}
"""

# ---------- split ----------
css = src.split("<style>",1)[1].split("</style>",1)[0]
body = src.split("<body>",1)[1].split("</body>",1)[0]
markup, rest = body.split("<script>",1)
data_js, rest = rest.split("</script>",1)
main_js = rest.split("<script>",1)[1].split("</script>",1)[0]

# ---------- class prefix ----------
CLASSES = set("""bl br c check cy d desc det done eyebrow field headline hud i it lb lg m mark
more n nm note now num ok on open panel prog q r run sec sheet src st steps sw tag tl top u v
viewport vp-tools x main""".split())
IDS = ["view","autorot","rotWrap","dimBtn","resetBtn","hudStage","hudName","legend","stage",
       "prevBtn","nextBtn","runBtn","prog","hlLabel","hlValue","hlUnit","hlNote","stageDesc",
       "qCount","qBody","checkBody","checkNote","notesWrap","notesList","srcLine"]

def pfx(name): return "bp-"+name

# ---- CSS ----
# 1. token blocks -> scoped
css = css.replace(':root:not([data-theme="light"]){}\n', '')
# element/root selectors rewritten before the generic scoping pass
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
css = css.replace("label.lb", "label.lb").replace("h2.sec", "h2.sec")
css = css.replace("main{display:grid", ".main{display:grid")
css = css.replace(".viewport,\n", ".viewport,\n")  # noop guard
# media-query inner "main{" occurrences
css = re.sub(r'(?<![\w.#-])main\{', '.main{', css)

# class prefixing (CSS)
def css_cls(m):
    n = m.group(1)
    return "."+pfx(n) if n in CLASSES else m.group(0)
css = re.sub(r'\.([A-Za-z][A-Za-z0-9_-]*)(?![A-Za-z0-9_-])', css_cls, css)

# id prefixing (CSS)
for i in IDS:
    css = re.sub(r'#'+re.escape(i)+r'(?![A-Za-z0-9_-])', '#bp3d-'+i, css)

# scope every top-level selector under SCOPE
out = []
for line in css.split("\n"):
    s = line.strip()
    if s.startswith("SCOPE") or s.startswith("@") or s.startswith("/*") or s.startswith("}") \
       or s.startswith(":root") or "{" not in s or s.startswith("--"):
        out.append(line); continue
    head, brace, tail = line.partition("{")
    # indented lines inside @media also need scoping; handle uniformly
    sels = [x.strip() for x in head.split(",")]
    if not sels or not sels[0]:
        out.append(line); continue
    scoped = ", ".join("SCOPE "+x if not x.startswith("SCOPE") else x for x in sels)
    lead = line[:len(line)-len(line.lstrip())]
    out.append(lead + scoped + brace + tail)
css = "\n".join(out)
css = css.replace("SCOPE", "#bp3dRoot").replace("#bp3dRoot ..bp-main", "#bp3dRoot .bp-main")
css += EMBED_CSS

# ---- HTML markup ----
def attr_cls(m):
    toks = m.group(2).split()
    return m.group(1)+" ".join(pfx(t) if t in CLASSES else t for t in toks)+m.group(3)
CLSRE = re.compile(r'(class=")([^"]*)(")')
markup = CLSRE.sub(attr_cls, markup)
markup = markup.replace("<header class=", '<div class=').replace("</header>", "</div>")
markup = markup.replace("<main>", '<div class="bp-main">').replace("</main>", "</div>")
markup = markup.replace("<aside class=", '<div class=').replace("</aside>", "</div>")
for i in IDS:
    markup = markup.replace('id="'+i+'"', 'id="bp3d-'+i+'"')
markup = markup.replace('for="stage"', 'for="bp3d-stage"')
markup = markup.replace('<label class="bp-lb"', '<label class="bp-lb"')

# ---- JS ----
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
for a,b in JSREPL:
    if a not in js: raise SystemExit("JS pattern missing: "+a)
    js = js.replace(a,b)

# id lookups -> root-scoped
js = re.sub(r"document\.getElementById\('([A-Za-z0-9_]+)'\)", r"gid('\1')", js)
left = re.findall(r"document\.getElementById", js)
if left: raise SystemExit("unconverted getElementById")

# ---- lifecycle: wrap the existing IIFE as a mount(root) factory ----
assert js.lstrip().startswith("'use strict';\n(function(){"), js[:60]
js = js.replace("'use strict';\n(function(){", "", 1)
tail = "requestAnimationFrame(loop);\n})();"
assert js.rstrip().endswith(tail), js[-120:]
js = js.rstrip()[:-len(tail)]

body_js = js
body_js = body_js.replace(
    "function loop(now){",
    "function loop(now){\n  if(destroyed) return;", 1)
body_js = body_js.replace(
    "  requestAnimationFrame(loop);\n}", "  rafId=requestAnimationFrame(loop);\n}", 1)

head = ("  var destroyed=false, rafId=0, ro=null;\n"
        "  function gid(id){ return root.querySelector('#bp3d-'+id); }\n")
boot = ("\nresize();\n"
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
# the original boot block already called resize()/ResizeObserver: strip it
old_boot = ("resize();\n"
            "if(window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentElement);\n"
            "else window.addEventListener('resize',resize);\n")
if old_boot not in body_js: raise SystemExit("boot block not found")
body_js = body_js.replace(old_boot, "")

js_final = ("/* ===== Blueprint 3D viewer (web/blueprint-3d/index.html), namespaced ===== */\n"
            "window.__BP3D = (function(){\n'use strict';\n"
            + data_js.strip() + "\n"
            "function mount(root){\n" + head + body_js + boot + "}\n"
            "return { mount: mount };\n})();\n")

io.open(OUT+"/bp3d.css","w",encoding="utf-8").write(css)
io.open(OUT+"/bp3d.markup.html","w",encoding="utf-8").write(markup)
io.open(OUT+"/bp3d.js","w",encoding="utf-8").write(js_final)
print("css",len(css),"markup",len(markup),"js",len(js_final))
