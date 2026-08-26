# Employee Hub — time clock & hours monitoring

Single self-contained page (`index.html`) with two roles in one page: an
**Employee** time-clock view and a **Project Manager** monitoring view.
Ships as a published claude.ai Artifact, so everything is inline — no external
scripts, styles, or images (per `docs/BUILD-CONSTRAINTS.md`).

Everything on the page is **seeded demo data** (banner + per-entry `demo`
badges). The one real string is the job name
`Van Horn Residence - DeWitt, MI`, taken from the site's `__TAKEOFF`
`project_name`; the other jobs and all employees/hours are invented.

## Data model

Timestamps are **epoch milliseconds** and are the only source of truth.
Durations, day/week attribution, and overtime are all *derived* — nothing
accumulates a ticking counter, so a backgrounded tab loses no time, and a
shift crossing midnight can never go negative (`worked = max(0, out − in −
breaks)`; the entry belongs to the day its clock-in falls on).

```js
Employee { id, name, role }
Job      { id, name, seeded }
Entry {
  id:       string
  empId:    string           // -> Employee.id
  jobId:    string           // -> Job.id
  clockIn:  number           // epoch ms
  clockOut: number | null    // null while the shift is open
  breaks:   [{ start: ms, end: ms|null }]   // unpaid; end null while running
  status:   'open' | 'pending' | 'approved' | 'rejected'
  edits:    [{ at: ms, by: string,
               changes: { field: { from, to } },   // originals preserved
               note?: string }]
  seeded:   boolean          // true for demo rows
}
```

Displayed hours are rounded to 2 decimals; storage and the CSV export carry
full precision (`worked_ms` plus `worked_hours_precise` as an unrounded
float, alongside the raw epoch-ms columns).

## Storage interface (what a backend would implement)

The UI only talks to `Store`. Replace this module with API calls and nothing
else changes:

```js
Store.listEmployees()        -> Employee[]
Store.listJobs()             -> Job[]
Store.listEntries()          -> Entry[]
Store.saveEntry(entry)       -> Entry          // insert
Store.updateEntry(id, patch) -> Entry | null   // shallow merge
Store.resetDemo()            -> void           // wipe + reseed (demo only)
```

The demo implementation is localStorage under keys prefixed
`bah.employeehub.v1.*`. Every read/write is wrapped in try/catch with an
in-memory fallback; when localStorage throws (private windows, some embedded
contexts) the page still works and shows a "storage unavailable" warning.

## Rules as implemented

- **No double clock-in**: an employee with an open entry cannot clock in again.
- **No clock-out without clock-in**: guarded with a visible error.
- **Breaks** are unpaid and subtracted; a running break is auto-ended at
  clock-out.
- **Midnight crossing**: durations come from timestamps so they are always
  positive; such entries are labelled `crosses midnight` / `(+1d)` and
  attributed to the clock-in day.
- **Stale open shift**: an open entry older than **16 h** is flagged
  ("left open"), shown prominently in both views, and **excluded from every
  total** until a PM closes or corrects it — it never silently accumulates
  hundreds of hours.
- **Overtime — weekly rule (hard flag)**: total counted hours **> 40 h**
  in a Mon–Sun week.
- **Long day — daily rule (softer flag)**: counted hours **> 8 h** in one
  calendar day.
  Both thresholds are what *this page* implements; no specific
  jurisdiction's law is asserted — confirm actual rules with payroll.
- **Approve / reject** applies to closed entries; rejected entries are
  excluded from totals.
- **Edits keep an audit trail**: every PM edit appends `{at, by, changes:
  {field: {from, to}}}` — the original values stay visible in the entries
  table and in the edit dialog. Editing break minutes re-materializes the
  break as one segment centered mid-shift (timestamps stay the source of
  truth).
- **CSV export** builds the selected week via a `Blob` download and also
  shows the CSV in a copyable dialog, because embedded artifact viewers
  block page-initiated downloads.

## Seed data

First run (or the visible **Reset demo data** button) seeds 4 employees,
3 jobs, last week complete + this week partial, deliberately including:
one employee over 40 h/week, several >8 h days, a 21:00→01:30
midnight-crossing shift, one employee currently on the clock, one shift left
open ~26 h (stale flag), and one entry with a pre-existing audit-trail edit.

## What this does NOT do

- **No authentication** — "Acting as" is an honor-system dropdown.
- **No server, no sync** — data is per-browser localStorage only; two
  devices never see each other's entries.
- **No payroll integration** — no pay rates, no tax, no export to any
  payroll system beyond the CSV.
- **No jurisdiction-correct overtime law** — the 40 h/8 h thresholds are
  illustrative flags, not legal calculations.
- **No timezone handling beyond the viewer's browser** — weeks and days are
  computed in local time.

A real deployment needs a backend implementing the `Store` interface plus
auth; the UI layer is written so that swap is the only change required.
