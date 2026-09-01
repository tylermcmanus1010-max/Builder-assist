# Growify Time Clock — standalone preview

Employee clock in / clock out with QuickBooks transfer, built to mount under
the **Growify** tab of the Gen1 portal — but deliberately **not mounted yet**.
Nothing in `builder-assist-sites/` references this directory; integration
happens only when the owner gives permission, following the plan in
`docs/growify-time-tracking.md`.

Serve over HTTP (e.g. `python -m http.server 8765` from the repository root)
and open `http://127.0.0.1:8765/web/growify-time/index.html`.

## What it does

- **Clock in / clock out / unpaid breaks** per employee, per job. Epoch-ms
  timestamps are the only source of truth; every duration is derived
  (`worked = max(0, out − in − breaks)`), so a backgrounded tab loses no time
  and a midnight-crossing shift can never go negative.
- **Timesheet week view** (Monday-based, calendar arithmetic — the DST lessons
  from `web/employee-hub` are baked in), per-employee weekly totals, a >40 h
  flag, manual shift entry with validation, and a stale-shift rule: an entry
  left open more than 16 h is flagged and excluded from every total and every
  export until it is corrected.
- **Transfer to QuickBooks**, three ways, all generated locally for review:
  1. **IIF timer activities** — QuickBooks Desktop, File → Utilities → Import
     → IIF Files. Requires the exact company file name and a service item that
     already exists in QuickBooks; refuses to build without them.
  2. **Timesheet CSV** — QuickBooks Time / QuickBooks Online import wizard,
     which maps columns interactively. Carries date, employee, customer:job,
     start/end, break minutes, h:mm and decimal hours, billable, notes.
  3. **TimeActivity JSON** — request bodies for the QuickBooks Online API
     (`POST /v3/company/{realmId}/timeactivity`). Employee and customer IDs
     must be mapped by hand from the connected company; an unmapped entry is
     reported, never guessed.

  Only closed shifts transfer. Open, stale, or zero-minute entries are listed
  as excluded with reasons — never silently sent, never silently dropped.

## What it does NOT do (stated on the page too)

- **No live QuickBooks connection.** The exports are files and payloads a
  human reviews and imports. A real sync needs the OAuth backend described in
  `docs/growify-time-tracking.md`; per repository rules it must never be
  labelled connected before credentials and authorization exist.
- **No authentication or server.** Data is per-browser `localStorage`
  (`bah.growifytime.v1.*`, try/catch-wrapped with an in-memory fallback and a
  visible warning). Two devices never see each other's entries.
- **No jurisdiction-correct overtime law.** The >40 h weekly flag is an
  illustrative check, not a legal calculation.
- **No approvals workflow.** `web/employee-hub` has the fuller
  employer/employee split with requests and audit trails; this page is the
  Growify-shaped clock plus the QuickBooks pipe.

All seeded people, jobs, and hours are labelled `demo` and invented.

## Layout

- `index.html` — self-contained page (artifact constraints per
  `docs/BUILD-CONSTRAINTS.md`: no external scripts, site design tokens, dark
  theme, storage fallback).
- `quickbooks-export.mjs` — the canonical export engine. Its marked CORE
  region is copied verbatim into `index.html`; the verifier fails on drift,
  so **edit the `.mjs` first**, then re-splice the region into the page.
- Checks: `node tools/verify-growify-time.mjs` (39 assertions: single-source
  guarantee, duration math, DST week bounds, IIF/CSV/TimeActivity formats).
