// Growify time clock — QuickBooks transfer engine.
//
// Converts closed time-clock entries into the three formats QuickBooks
// accepts today, without pretending any live connection exists:
//
//   1. IIF timer activities  (QuickBooks Desktop: File → Utilities → Import)
//   2. Timesheet CSV         (QuickBooks Time / QuickBooks Online import wizard)
//   3. TimeActivity payloads (QuickBooks Online API — bodies only; posting them
//                             requires the OAuth backend described in
//                             docs/growify-time-tracking.md)
//
// The CORE region below is the single source of truth. It is copied verbatim
// into web/growify-time/index.html (which must stay self-contained for the
// artifact build), and tools/verify-growify-time.mjs fails if the two copies
// ever drift. Everything in CORE is pure: no DOM, no storage, no network.
//
// Entry shape (same contract as web/employee-hub — epoch milliseconds are the
// only source of truth, durations are always derived):
//   Entry { id, empId, jobId, clockIn(ms), clockOut(ms|null),
//           breaks: [{start(ms), end(ms|null)}], status, notes?, seeded? }

/* ==== BEGIN growify-time core (single source: quickbooks-export.mjs) ==== */
var QB_HOUR = 3600000, QB_DAY = 86400000, QB_STALE_MS = 16 * QB_HOUR;

/* ---- durations: derived from timestamps, clamped, midnight-safe ---- */
function qbBreakMs(entry, now) {
  var s = 0, list = entry.breaks || [];
  for (var i = 0; i < list.length; i++) {
    var b = list[i];
    s += Math.max(0, (b.end == null ? now : b.end) - b.start);
  }
  return s;
}
function qbWorkedMs(entry, now) {
  var end = entry.clockOut == null ? now : entry.clockOut;
  return Math.max(0, end - entry.clockIn - qbBreakMs(entry, now));
}
function qbIsStale(entry, now) { return entry.clockOut == null && (now - entry.clockIn) > QB_STALE_MS; }
function qbOnBreak(entry) {
  var list = entry.breaks || [];
  return list.length > 0 && list[list.length - 1].end == null;
}

/* ---- calendar arithmetic: a DST week is 23 or 25 hours long, so day and
        week hops must go through Date fields, never fixed milliseconds ---- */
function qbDayStart(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
function qbAddDays(t, n) {
  var d = new Date(t); d.setDate(d.getDate() + n); d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function qbMondayOf(t) {
  var d = new Date(t); d.setHours(0, 0, 0, 0);
  var dow = (d.getDay() + 6) % 7; // Mon=0
  return qbAddDays(d.getTime(), -dow);
}
function qbWeekRange(offset, now) {
  var start = qbAddDays(qbMondayOf(now), offset * 7);
  return { start: start, end: qbAddDays(start, 7) };
}
function qbLocalDateKey(t) {
  var d = new Date(t), p = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* ---- formats QuickBooks expects ---- */
function qbRoundMinutes(ms) { return Math.round(Math.max(0, ms) / 60000); }
function qbHoursHMM(ms) {
  var m = qbRoundMinutes(ms);
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
}
function qbDateMMDDYY(t) {
  var d = new Date(t), p = function (n) { return String(n).padStart(2, '0'); };
  return p(d.getMonth() + 1) + '/' + p(d.getDate()) + '/' + String(d.getFullYear()).slice(-2);
}
function qbLocalHM(t) {
  var d = new Date(t), p = function (n) { return String(n).padStart(2, '0'); };
  return p(d.getHours()) + ':' + p(d.getMinutes());
}
function qbTzOffset(t) {
  // JS getTimezoneOffset() is minutes *behind* UTC, so the sign flips.
  var m = -new Date(t).getTimezoneOffset(), sign = m < 0 ? '-' : '+', a = Math.abs(m);
  return sign + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0');
}
function qbLocalIso(t) {
  var d = new Date(t), p = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + qbTzOffset(t);
}

/* ---- field hygiene ---- */
function qbCsvField(v) {
  v = String(v == null ? '' : v);
  // A leading =, +, - or @ executes as a formula in spreadsheet tools that
  // sit between this file and payroll; the apostrophe neutralises it.
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function qbIifField(v) {
  // IIF is tab-delimited with one record per line and no quoting mechanism.
  return String(v == null ? '' : v).replace(/[\t\r\n]+/g, ' ').trim();
}

/* ---- entry selection: QuickBooks must only ever receive settled hours ---- */
function qbSelectEntries(entries, opts) {
  var start = opts.start, end = opts.end, now = opts.now;
  var included = [], excluded = [];
  (entries || []).forEach(function (e) {
    if (e.clockIn < start || e.clockIn >= end) return; // outside the range: not this export's business
    if (e.clockOut == null) {
      excluded.push({ entry: e, reason: qbIsStale(e, now)
        ? 'left open more than 16 h — close or correct the shift before transferring'
        : 'still on the clock — clock out before transferring' });
      return;
    }
    if (e.status === 'rejected') { excluded.push({ entry: e, reason: 'rejected entry — excluded from payroll' }); return; }
    if (qbRoundMinutes(qbWorkedMs(e, now)) === 0) { excluded.push({ entry: e, reason: 'zero worked minutes' }); return; }
    included.push(e);
  });
  included.sort(function (a, b) { return a.clockIn - b.clockIn || String(a.empId).localeCompare(String(b.empId)); });
  return { included: included, excluded: excluded };
}

function qbLookup(list, id) {
  for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i];
  return null;
}

/* ---- 1. Timesheet CSV (QuickBooks Time / QuickBooks Online import wizard) ---- */
function qbBuildCsv(entries, ctx) {
  var picked = qbSelectEntries(entries, ctx);
  var head = ['date', 'employee', 'employee_role', 'customer_job', 'service_item',
    'start_time', 'end_time', 'break_minutes', 'hours_hmm', 'hours_decimal',
    'billable', 'notes', 'entry_id', 'seeded_demo'];
  var rows = [head.join(',')];
  picked.included.forEach(function (e) {
    var emp = qbLookup(ctx.employees, e.empId), job = qbLookup(ctx.jobs, e.jobId);
    var worked = qbWorkedMs(e, ctx.now);
    rows.push([
      qbLocalDateKey(e.clockIn),
      emp ? emp.name : e.empId,
      emp && emp.role ? emp.role : '',
      job ? job.name : e.jobId,
      ctx.serviceItem || '',
      qbLocalDateKey(e.clockIn) + ' ' + qbLocalHM(e.clockIn),
      qbLocalDateKey(e.clockOut) + ' ' + qbLocalHM(e.clockOut),
      qbRoundMinutes(qbBreakMs(e, ctx.now)),
      qbHoursHMM(worked),
      (worked / QB_HOUR).toFixed(4),
      ctx.billable ? 'yes' : 'no',
      e.notes || '',
      e.id,
      e.seeded ? 'yes' : ''
    ].map(qbCsvField).join(','));
  });
  return {
    name: 'growify-time-quickbooks-' + qbLocalDateKey(ctx.start) + '.csv',
    text: rows.join('\n'),
    included: picked.included, excluded: picked.excluded, errors: []
  };
}

/* ---- 2. IIF timer activities (QuickBooks Desktop) ---- */
function qbBuildIif(entries, ctx) {
  var errors = [];
  if (!ctx.companyName || !String(ctx.companyName).trim())
    errors.push('Company name is required and must match the QuickBooks company file name exactly.');
  if (!ctx.serviceItem || !String(ctx.serviceItem).trim())
    errors.push('A service item is required; it must already exist in the QuickBooks item list.');
  if (errors.length) return { name: '', text: '', included: [], excluded: [], errors: errors };

  var picked = qbSelectEntries(entries, ctx);
  var map = ctx.mapping || {};
  var lines = [
    ['!TIMERHDR', 'VER', 'REL', 'COMPANYNAME', 'IMPORTEDBEFORE', 'FROMTIMER', 'COMPANYCREATETIME'].join('\t'),
    ['TIMERHDR', '8', '0', qbIifField(ctx.companyName), 'N', 'Y', '0'].join('\t'),
    ['!TIMEACT', 'DATE', 'JOB', 'EMP', 'ITEM', 'PITEM', 'DURATION', 'PROJ', 'NOTE', 'XFERTOPAYROLL', 'BILLINGSTATUS'].join('\t')
  ];
  picked.included.forEach(function (e) {
    var emp = qbLookup(ctx.employees, e.empId), job = qbLookup(ctx.jobs, e.jobId);
    lines.push([
      'TIMEACT',
      qbDateMMDDYY(e.clockIn),
      qbIifField((map.jobs && map.jobs[e.jobId]) || (job ? job.name : e.jobId)),
      qbIifField((map.employees && map.employees[e.empId]) || (emp ? emp.name : e.empId)),
      qbIifField(ctx.serviceItem),
      qbIifField(ctx.payrollItem || ''),
      qbHoursHMM(qbWorkedMs(e, ctx.now)),
      '',
      qbIifField((e.notes ? e.notes + ' · ' : '') + 'growify-time ' + e.id),
      ctx.payrollItem ? 'Y' : 'N',
      ctx.billable ? '1' : '0'
    ].join('\t'));
  });
  return {
    name: 'growify-time-quickbooks-' + qbLocalDateKey(ctx.start) + '.iif',
    text: lines.join('\n'),
    included: picked.included, excluded: picked.excluded, errors: []
  };
}

/* ---- 3. TimeActivity payloads (QuickBooks Online API) ----
   IDs must come from the connected QuickBooks company via the mapping —
   an entry whose employee or customer has no mapped QuickBooks ID is
   reported as unmapped, never guessed. ---- */
function qbBuildTimeActivities(entries, ctx) {
  var picked = qbSelectEntries(entries, ctx);
  var map = ctx.mapping || {}, empIds = map.employees || {}, custIds = map.customers || {};
  var activities = [], unmapped = [];
  picked.included.forEach(function (e) {
    var missing = [];
    if (!empIds[e.empId]) missing.push('employee');
    if (!custIds[e.jobId]) missing.push('customer/job');
    if (missing.length) {
      var emp = qbLookup(ctx.employees, e.empId), job = qbLookup(ctx.jobs, e.jobId);
      unmapped.push({ entry: e, reason: 'no QuickBooks ID mapped for ' + missing.join(' and ') +
        ' (' + (emp ? emp.name : e.empId) + ' · ' + (job ? job.name : e.jobId) + ')' });
      return;
    }
    var breakMin = qbRoundMinutes(qbBreakMs(e, ctx.now));
    var activity = {
      TxnDate: qbLocalDateKey(e.clockIn),
      NameOf: 'Employee',
      EmployeeRef: { value: String(empIds[e.empId]) },
      CustomerRef: { value: String(custIds[e.jobId]) },
      BillableStatus: ctx.billable ? 'Billable' : 'NotBillable',
      StartTime: qbLocalIso(e.clockIn),
      EndTime: qbLocalIso(e.clockOut),
      BreakHours: Math.floor(breakMin / 60),
      BreakMinutes: breakMin % 60,
      Description: (e.notes ? e.notes + ' · ' : '') + 'growify-time ' + e.id
    };
    if (map.itemId) activity.ItemRef = { value: String(map.itemId) };
    activities.push(activity);
  });
  return { activities: activities, unmapped: unmapped, excluded: picked.excluded, errors: [] };
}
/* ==== END growify-time core ==== */

export {
  QB_HOUR, QB_DAY, QB_STALE_MS,
  qbBreakMs, qbWorkedMs, qbIsStale, qbOnBreak,
  qbDayStart, qbAddDays, qbMondayOf, qbWeekRange, qbLocalDateKey,
  qbRoundMinutes, qbHoursHMM, qbDateMMDDYY, qbLocalHM, qbTzOffset, qbLocalIso,
  qbCsvField, qbIifField,
  qbSelectEntries, qbBuildCsv, qbBuildIif, qbBuildTimeActivities
};
