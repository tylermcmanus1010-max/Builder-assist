# Employee Hub — two portals, one page

Single self-contained page (`index.html`). A demo sign-in establishes a **role**,
and the role decides which portal the page builds:

| | Employer portal (PM / owner) | Employee portal (crew) |
|---|---|---|
| Clock in / out, breaks | — | **yes** |
| Request hours (correction / missing shift) | — | **yes** (submit + withdraw) |
| Own entries + own weekly total | — | **yes** |
| Anyone else's hours | **yes** | **no** |
| Roster ("who is on the clock right now") | **yes** | **no** |
| Weekly matrix across all employees | **yes** | **no** |
| Overtime flags across the crew | **yes** | own flags only |
| Approve / reject a timesheet entry | **yes** | **no** |
| Edit an entry (audit trail) | **yes** | **no** |
| Requests queue: approve / deny | **yes** | **no** |
| CSV export | **yes** | **no** |
| Reset demo data | **yes** | **no** |

Ships as a published claude.ai Artifact, so everything is inline — no external
scripts, styles, or images (per `docs/BUILD-CONSTRAINTS.md`). It renders and
behaves identically served from an artifact origin, chatgpt.site, or Cloudflare:
there is no backend call anywhere, and the only optional host integration
(`window.claude.use('downloads')` for the CSV) degrades to a copyable dialog
when it is absent.

Everything on the page is **seeded demo data** (banner + per-row `demo` badges).
All jobs, employees, managers, hours, and requests are invented. Real records
must come from an authorized workspace data source.

## The role gate — and exactly how far it goes

The two portals are **not tabs**. `renderApp()` writes the markup for the
signed-in role into `#app` and nothing else:

- An employee's document contains **no** roster, no matrix, no approval queue,
  no edit dialog, no export button — those elements are never inserted, so
  there is nothing to un-hide with CSS and no handler bound to anything an
  employee could trigger. Verified with Playwright: signed in as an employee,
  `document.querySelector()` returns `null` for `#pm-roster`, `#pm-matrix`,
  `#pm-entries`, `#pm-jobs`, `#req-queue`, `#req-history`, `#btn-csv`,
  `#dlg-edit`, `#dlg-csv`, `#btn-reset`, `#wk-prev`, `#wk-next`, `#ed-save`,
  `#csv-copy`; zero approve / reject / edit buttons exist; the only buttons on
  the page are Sign out, Clock in, Start break, Clock out, Submit request and
  Withdraw. No other employee's name appears in the rendered text or in any
  attribute.
- Conversely the employer portal never builds the time clock or the request
  form (`#btn-in` and `#btn-req-submit` are absent) — employers monitor and
  decide, they do not clock in.
- Employer actions additionally re-check `isEmployer()` before mutating, so a
  stray call cannot slip past the missing UI.

### Limitation: this is client-side demo gating, not authentication

Stated plainly, and stated on the page itself:

- **There is no authentication.** The sign-in screen is a role picker plus a
  person picker. No password, no token, no identity check. Anyone can pick
  either portal.
- **There is no authorization.** All gating happens in the browser. Anyone with
  devtools can call `Store.updateEntry(...)` directly, or read the whole
  dataset out of `localStorage` — and in a single-file demo the seed data is
  visible in the page source regardless of the signed-in role. Not rendering a
  surface stops the UI from offering it; it does not stop a determined user.
- **Real enforcement needs a backend**: the server owns the session, and every
  `Store` call becomes an authorised API call that refuses employer operations
  for an employee token and scopes `listEntries()` to the caller. The `Store`
  interface below is written so that swap is the only change required.

## Data model

Timestamps are **epoch milliseconds** and are the only source of truth.
Durations, day/week attribution, and overtime are all *derived* — nothing
accumulates a ticking counter, so a backgrounded tab loses no time, and a
shift crossing midnight can never go negative (`worked = max(0, out − in −
breaks)`; the entry belongs to the day its clock-in falls on).

```js
Employee { id, name, role }                 // crew; role is the trade title
Manager  { id, name, title }                // employer accounts (PM / owner)
Job      { id, name, seeded }
Session  { role: 'employer'|'employee', userId, name, title }

Entry {
  id:        string
  empId:     string           // -> Employee.id
  jobId:     string           // -> Job.id
  clockIn:   number           // epoch ms
  clockOut:  number | null    // null while the shift is open
  breaks:    [{ start: ms, end: ms|null }]   // unpaid; end null while running
  status:    'open' | 'pending' | 'approved' | 'rejected'
  edits:     [{ at: ms, by: string,
                changes: { field: { from, to } },   // originals preserved
                note?: string, requestId?: string }]
  seeded:    boolean          // true for demo rows
  fromRequestId?: string      // set when the entry was created by an approval
}

Request {
  id:        string
  ref:       string           // human label, 'R-1001'; id is the key
  type:      'correction' | 'missing'
  empId:     string
  jobId:     string
  entryId:   string | null    // correction -> the entry being amended
  proposedIn:       number    // epoch ms
  proposedOut:      number    // epoch ms
  proposedBreakMin: number    // minutes; materialised into one break segment
  reason:    string           // required, employee's words
  submittedAt: number
  status:    'pending' | 'approved' | 'denied' | 'withdrawn'
  decidedAt: number | null
  decidedBy: string | null    // employer label, or the employee for a withdrawal
  decisionNote: string        // optional employer note, shown to the employee
  appliedEntryId: string | null   // the entry an approval created or amended
  seeded:    boolean
}
```

Displayed hours are rounded to 2 decimals; storage and the CSV export carry
full precision (`worked_ms` plus `worked_hours_precise` as an unrounded float,
alongside the raw epoch-ms columns). The CSV also carries `from_request` so an
approved request is traceable in payroll.

## The request lifecycle

An employee cannot edit a timesheet at all. Corrections go through a request.

1. **Submit** (employee). Two types:
   - *Correction* — pick one of your own entries from the last 21 days; the
     form prefills from it, you change the times/break/job and say why.
   - *Missing shift* — you worked but never clocked in; give job, times, break,
     reason.
   Submitting **changes no hours**. The request is stored `pending` and shows
   in "My requests" with its proposed paid hours.
2. **Withdraw** (employee). A pending request can be withdrawn; it becomes
   `withdrawn` and nothing was ever applied.
3. **Decide** (employer). The queue is the first card in the employer portal
   with a live pending count. Each pending request shows the employee, job,
   proposed times, the *delta against the existing entry* for a correction
   (`out: 4:30 PM → 5:30 PM · paid: 9.50 h → 10.50 h`), the reason, and when it
   was submitted. Approve or deny, each with an optional note the employee sees.
4. **Approval actually applies it.** This is the whole point:
   - `missing` → a new `Entry` is **created** with the proposed times, status
     `approved`, `fromRequestId` set, and one audit edit recording
     `clockIn/clockOut/breakMinutes` as `(none) → value`.
   - `correction` → the **existing entry is amended** in place (times, break
     re-materialised, job if changed) and set to `approved`, with an audit edit
     recording every changed field `from → to`.
   In both cases the audit edit is the *same shape as a manual employer edit*,
   is attributed to the approving employer (`Pat Rivera (Project Manager)`),
   carries `requestId`, and its note quotes the employee's reason and the
   employer's note. The entries table renders it inline as
   `… via request R-1005 (Applied correction request R-1005 from Mike Torres — …)`.
   The request records `decidedAt`, `decidedBy`, `decisionNote` and
   `appliedEntryId`.
5. **Denial changes nothing.** Status `denied`, no entry created or touched;
   the employee sees the denial and the note.

### Validation (before submit, and again at approval)

`validateProposal()` is shared by the employee's submit and the employer's
approve, so a request that has gone stale since submission cannot be applied —
the employer gets "Cannot apply this request: …" and the request stays pending.
Every message says what is wrong **and** how to fix it:

- clock-out not after clock-in → names both times, tells you to use the next
  day's date if the shift ran past midnight
- times in the future → you can only request hours already worked
- break ≥ shift length → shorten the break or widen the window
- missing reason → the PM decides from this text
- missing job → hours must be attributed to a job
- **overlap** with any non-rejected entry for that employee → names the
  clashing entry (date, times, job) and tells you to move the request or file a
  correction on that entry instead of adding a second shift

The employer's manual edit dialog uses the same overlap check.

## Storage interface (what a backend would implement)

The UI only talks to `Store`. Replace this module with API calls and nothing
else changes:

```js
Store.listEmployees()          -> Employee[]
Store.listManagers()           -> Manager[]
Store.listJobs()               -> Job[]
Store.listEntries()            -> Entry[]
Store.saveEntry(entry)         -> Entry           // insert
Store.updateEntry(id, patch)   -> Entry | null    // shallow merge
Store.listRequests()           -> Request[]
Store.saveRequest(request)     -> Request         // insert
Store.updateRequest(id, patch) -> Request | null  // shallow merge
Store.getSession()             -> Session | null
Store.setSession(session)      -> Session
Store.clearSession()           -> void
Store.resetDemo()              -> void            // wipe + reseed (demo only)
Store.ok()                     -> boolean         // storage reachable?
```

Requests live in the same store as entries — one module, one shape of call, no
parallel side-store. In a real deployment `getSession()` comes back from a
token and every other call is authorised against it server-side: `listEntries()`
returns only the caller's rows for an employee, and `updateEntry` /
`updateRequest` reject employee callers outright.

The demo implementation is localStorage under keys prefixed
`bah.employeehub.v2.*` (`.employees`, `.managers`, `.jobs`, `.entries`,
`.requests`, `.session`). Every read/write is wrapped in try/catch with an
in-memory fallback; when localStorage throws (private windows, some embedded
contexts) the page still signs in, still clocks in, and shows a "Browser
storage unavailable" warning — verified by overriding `localStorage` to throw
before load.

## Rules as implemented

- **No double clock-in**: an employee with an open entry cannot clock in again.
- **No clock-out without clock-in**: guarded with a visible error.
- **Breaks** are unpaid and subtracted; a running break is auto-ended at
  clock-out.
- **Midnight crossing**: durations come from timestamps so they are always
  positive; such entries are labelled `crosses midnight` / `(+1d)` and
  attributed to the clock-in day.
- **Stale open shift**: an open entry older than **16 h** is flagged
  ("left open"), shown in both portals, and **excluded from every total** until
  it is closed or corrected — it never silently accumulates hundreds of hours.
- **Overtime — weekly rule (hard flag)**: total counted hours **> 40 h** in a
  Mon–Sun week.
- **Long day — daily rule (softer flag)**: counted hours **> 8 h** in one
  calendar day.
  Both thresholds are what *this page* implements; no specific jurisdiction's
  law is asserted — confirm actual rules with payroll.
- **Approve / reject** applies to closed entries; rejected entries are excluded
  from totals.
- **Edits keep an audit trail**: every employer edit appends
  `{at, by, changes: {field: {from, to}}}` — originals stay visible in the
  entries table and in the edit dialog. `by` prefills with the signed-in
  employer. Editing break minutes re-materialises the break as one segment
  centred mid-shift (timestamps stay the source of truth).
- **CSV export** builds the selected week through the downloads capability and
  falls back to a copyable dialog, because embedded artifact viewers block
  page-initiated downloads.

## Seed data

First run (or the employer-only **Reset demo data** button) seeds 4 employees,
2 managers, 3 jobs, last week complete + this week partial, deliberately
including: one employee over 40 h/week, several >8 h days, a 21:00→01:30
midnight-crossing shift, one employee currently on the clock, one shift left
open ~26 h (stale flag), plus **two demo requests**:

- **R-1001** (Sam Pruitt, correction, already **approved**) — he forgot to clock
  out; the seeded entry carries the matching audit edit citing R-1001, so the
  "approval writes the audit trail" path is visible on first load.
- **R-1002** (Luis Ortega, missing shift, **pending**) — a Saturday backfill he
  never clocked in for. Luis's Saturday is deliberately left empty in the seed
  so approving it validates cleanly and adds 4.50 h.

Both are marked `demo` like everything else.

## What this does NOT do

- **No authentication or authorization** — see the limitation section above.
- **No server, no sync** — data is per-browser localStorage only; two devices
  never see each other's entries.
- **No payroll integration** — no pay rates, no tax, no export to any payroll
  system beyond the CSV.
- **No jurisdiction-correct overtime law** — the 40 h/8 h thresholds are
  illustrative flags, not legal calculations.
- **No timezone handling beyond the viewer's browser** — weeks and days are
  computed in local time.
- **No notifications** — an employee learns a request was decided by opening
  the page, not by email or push.

A real deployment needs a backend implementing the `Store` interface plus real
auth; the UI layer is written so that swap is the only change required.
