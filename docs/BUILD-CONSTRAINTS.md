# Build constraints

Every page in `web/` ships as a published claude.ai Artifact. That imposes hard
limits — a page that violates them looks fine locally and breaks for viewers.

## Self-contained or it does not load

A strict CSP blocks every external host. No CDN scripts, no external
stylesheets, no remote images, no fetch/XHR/WebSockets. Inline all CSS and JS;
embed images as `data:` URIs.

The single exception is Google Fonts: `https://fonts.googleapis.com` and
`https://fonts.gstatic.com`. Always declare a real fallback stack anyway.

This already bit us once: the landing page pulls three product photos from
`builder-assist-llc.valentino-in-8162.chatgpt.site`. The host is alive and
returns 200, but CSP blocks it, so those photos never render for anyone.

No 3D library is reachable. Anything 3D is hand-written against Canvas 2D or
raw WebGL.

## Design system

Adopt the existing site tokens — do not invent a new palette.

```
--ink: #071a36;  --navy: #081f43;  --blue: #0b4fd3;  --blue-bright: #1674ff;
--cyan: #68d4ff; --ice: #f2f7ff;   --line: #d9e5f7;  --muted: #5e6f89;
```

Type is `Arial, Helvetica, sans-serif`. Uppercase labels are small, heavy
(800/900), with `.12em`–`.18em` letter-spacing. Section eyebrows are cyan or
blue. Buttons are square (no border radius) with heavy uppercase labels.

Use `font-variant-numeric: tabular-nums` anywhere digits align in columns.

## Themes

Define the full palette on bare `:root`. Redefine only tokens under
`@media (prefers-color-scheme: dark)` guarded as `:root:not([data-theme="light"])`,
and again under `:root[data-theme="dark"]`. Never give a color its only
definition inside a media or `[data-theme]` block. `body` must set an explicit
token background.

## Storage

`localStorage` works and is private per artifact origin. Wrap every read and
write in try/catch — it throws outright in some embedding contexts. The page
must render correctly when nothing is stored and when access throws.

## Verification

Every page must pass:

```sh
OUT_DIR=./reports node tools/verify-artifacts.mjs <page.html>
```

PASS required. WARN must be justified in writing. Screenshot the result and
look at it — "no console errors" is not evidence that a page renders correctly.
