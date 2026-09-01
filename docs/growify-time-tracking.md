# Growify time tracking — integration contract (not yet integrated)

Status: **standalone preview only.** The working prototype lives in
`web/growify-time/` and is mounted nowhere. This document is the agreed plan
for wiring it into the Growify tab of the Gen1 portal and into QuickBooks
**once the owner gives permission**. Treat everything here as a proposal to
implement, not as something that already runs.

## Where it mounts (when approved)

The Gen1 operational portal (`builder-assist-sites/public/gen1-operational.js`)
renders Growify tabs from `GROW_TABS`. The time clock becomes one new tab:

```js
const GROW_TABS = [ ..., ["time", "Time clock"], ... ];
```

with a `growTime(project)` view built from the prototype's markup and the
CORE helpers in `web/growify-time/quickbooks-export.mjs`. Per the handoff
rules, Growify must not absorb Assistify functions: Assistify module 22
("Time, Crews & Equipment") stays the *approved-labor cost record against the
house*; the Growify time clock is the *live employee punch clock and payroll
export*. A closed, approved week may later feed module 22 summaries, but the
records remain separate.

## Persistence (replaces localStorage when integrated)

The prototype stores everything in per-browser `localStorage`
(`bah.growifytime.v1.*`) — honest about it on the page, and unacceptable for
multi-device crews. Integration adds additive D1 tables in
`builder-assist-sites/db/schema.ts` (all keys follow the existing gen1
conventions; timestamps are epoch milliseconds, matching the prototype's
"timestamps are the only source of truth" rule):

```
gen1_time_employees   id PK · workspace_id FK · name · role · active · created_at
gen1_time_entries     id PK · workspace_id FK · project_id FK (the job) ·
                      employee_id FK · clock_in_ms · clock_out_ms NULL ·
                      breaks_json ("[{start,end}]") · status
                      ('open'|'closed'|'approved'|'rejected') · notes ·
                      created_at · updated_at
                      indexes: (workspace_id, clock_in_ms), (employee_id),
                               (project_id)
gen1_quickbooks_map   id PK · workspace_id FK · kind ('employee'|'customer'|'item') ·
                      local_id · quickbooks_id · updated_at
                      unique (workspace_id, kind, local_id)
```

Jobs are **not** a new table: a time entry's job is the existing
`gen1_projects` row, so the punch clock shares the one active house record
like every other workspace.

## API actions (added to `app/api/gen1/route.ts`)

All behind the existing `requireChatGPTUser` authentication and workspace
scoping — an entry is only ever readable and writable inside its workspace.

- `time_clock_in` { employeeId, projectId } → rejects if that employee
  already has an open entry (no double clock-in).
- `time_break` { entryId } → starts or ends the running break.
- `time_clock_out` { entryId } → ends a running break, sets `clock_out_ms`,
  status `closed`. Rejects when there is no open entry.
- `time_add_entry` { employeeId, projectId, clockInMs, clockOutMs, breakMin,
  notes } → manual shift; validates out > in, not in the future, break
  shorter than the shift.
- `time_update_entry` / `time_delete_entry` — employer-role operations; edits
  append an audit record in `gen1_project_events` (`eventType:
  time_entry_edited`) rather than overwriting silently.
- `time_export` { rangeStartMs, rangeEndMs, format: 'iif'|'csv'|'timeactivity' }
  → runs the same CORE builders server-side and returns the file text plus
  the excluded/unmapped lists. Open, stale (>16 h), rejected, and zero-minute
  entries are excluded with reasons — the server must never send them.

## QuickBooks transfer paths

Three tiers, in order of coupling. Tiers 1–2 are already implemented in the
prototype; tier 3 is the only one that talks to Intuit and does not exist yet.

1. **IIF timer activities** (QuickBooks Desktop) — generated file, imported
   by a human via File → Utilities → Import. Requires the exact company file
   name, existing employee names, a service item, optionally a payroll item.
2. **Timesheet CSV** (QuickBooks Time / QuickBooks Online import wizard) —
   generated file; the wizard maps columns interactively.
3. **QuickBooks Online API sync** — `POST /v3/company/{realmId}/timeactivity`
   per closed entry, using the payloads the CORE already builds. Requires:
   - an Intuit developer app and OAuth 2.0 authorization code flow with the
     `com.intuit.quickbooks.accounting` scope; tokens stored server-side per
     workspace (never in the browser, never in the repo);
   - the `gen1_quickbooks_map` table populated by the user from the connected
     company's real Employee/Customer/Item IDs (the UI reports unmapped
     entries and refuses to invent IDs);
   - idempotency: store the returned `TimeActivity.Id` on the entry so a
     re-export updates instead of duplicating.

   **Truth rule (non-negotiable, same as the Google Calendar rule in the
   handoff):** the UI must not label QuickBooks "connected" until real
   credentials and a successful authorized call exist. Until then the button
   reads as what it is — a payload builder.

## Verification

- `node tools/verify-growify-time.mjs` — 39 assertions: the single-source
  CORE guarantee between the `.mjs` and the inlined page copy, duration math
  (midnight crossing, running breaks, clamping), DST-safe Monday week bounds
  (pinned to America/Detroit across the 2026-11-01 fall-back), IIF structure,
  CSV escaping and formula-injection guarding, and TimeActivity mapping
  honesty. Must pass before and after integration work.
- After mounting in the portal: re-run `builder-assist-sites` lint, tests and
  build, plus the artifact verifier on any page in `web/` that changed.
