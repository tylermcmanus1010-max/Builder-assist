# -*- coding: utf-8 -*-
"""Synchronize the main-site Assistify tab with the shared 3D viewer.

The viewer is intentionally not copied into main-site/index.html. Both entry
points execute web/blueprint-3d/engine.js and consume the same validated model
contract, eliminating the former generated second copy of project data and
renderer code.
"""
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
SOURCE = REPO / "web" / "blueprint-3d"
TARGET = HERE / "index.html"

required = [SOURCE / name for name in ("index.html", "engine.js", "model-schema.json", "project-model.json")]
missing = [str(path) for path in required if not path.is_file()]
if missing:
    raise SystemExit("Assistify source asset missing: " + ", ".join(missing))

text = TARGET.read_text(encoding="utf-8")

css = r"""/* ===================== ADMIN TAB: ASSISTIFY 3D ===================== */
.ac-model-note{margin:0 0 14px;color:var(--muted);font-size:12px;line-height:1.6}
.assistify-frame{display:block;width:100%;height:min(82vh,860px);min-height:620px;border:1px solid var(--line);background:#07111f}
@media(max-width:700px){.assistify-frame{height:900px;min-height:0}}
"""

if "ADMIN TAB: 3D BLUEPRINT VIEWER" in text:
    text, count = re.subn(
        r"/\* ===================== ADMIN TAB: 3D BLUEPRINT VIEWER[\s\S]*?(?=\n</style>)",
        css.rstrip(), text, count=1)
    if count != 1:
        raise SystemExit("Could not replace legacy Assistify CSS block")

text = re.sub(
    r"window\.__TAKEOFF = \{[^\n]*\};",
    'window.__TAKEOFF = {"project_name":"Unconfigured project","sheets":[],"items":[],"assumptions":[],"open_questions":[],"status":"UNVERIFIED"};',
    text, count=1)

if "/* ===== Blueprint 3D viewer (web/blueprint-3d/index.html), namespaced ===== */" in text:
    text, count = re.subn(
        r"/\* ===== Blueprint 3D viewer \(web/blueprint-3d/index\.html\), namespaced ===== \*/[\s\S]*?return \{ mount: mount \};\n\}\)\(\);\n",
        "/* Assistify 3D is loaded from the shared viewer; no generated engine copy. */\n",
        text, count=1)
    if count != 1:
        raise SystemExit("Could not remove legacy generated Assistify engine")

replacement = r'''function adminModelBody(){
  return `<section class="ac-panel">
    <header class="ac-phead"><div><span>ASSISTIFY 3D</span><h2>Project-specific construction model</h2>
      <p>Twelve construction stages, source-linked geometry, explicit unresolved states, and a shared feet-based Canvas engine.</p></div></header>
    <p class="ac-model-note">No sample property is loaded. Import a schema-valid model generated from the active project's plans. Browser persistence is prototype-only.</p>
    <iframe class="assistify-frame" id="assistifyFrame" title="Assistify project-specific 3D construction viewer" src="../blueprint-3d/index.html"></iframe>
  </section>`;
}
function mountBp3d(){
  const frame=document.getElementById("assistifyFrame");
  if(frame) frame.title="Assistify project-specific 3D construction viewer";
}
function unmountBp3d(){}
'''

if "const BP3D_MARKUP = String.raw`" in text:
    text, count = re.subn(
        r"const BP3D_MARKUP = String\.raw`[\s\S]*?function unmountBp3d\(\)\{[^\n]*\}\n",
        replacement, text, count=1)
    if count != 1:
        raise SystemExit("Could not replace legacy Assistify markup/mount block")

TARGET.write_text(text, encoding="utf-8", newline="\n")
print("Synchronized shared Assistify viewer into", TARGET)
