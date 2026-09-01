#!/usr/bin/env node
// Regression checks for the employee time clock's QuickBooks transfer engine.
//
//   node tools/verify-employee-time.mjs
//
// Covers: the single-source guarantee between quickbooks-export.mjs and the
// inline copy in web/employee-time/index.html, duration math (midnight
// crossing, running breaks, clamping), DST-safe week bounds, and the three
// QuickBooks output formats (IIF structure, CSV escaping and formula
// guarding, TimeActivity mapping honesty).
//
// Date-sensitive tests pin TZ=America/Detroit so the 2026-11-01 fall-back
// boundary is actually exercised; the process re-executes itself once to set
// the zone before any Date is constructed.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (process.env.TZ !== 'America/Detroit') {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
    stdio: 'inherit', env: { ...process.env, TZ: 'America/Detroit' },
  });
  process.exit(r.status ?? 1);
}

const qb = await import('../web/employee-time/quickbooks-export.mjs');

let failures = 0, passes = 0;
function check(name, ok, detail) {
  if (ok) { passes++; console.log('  PASS ' + name); }
  else { failures++; console.error('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
function section(name) { console.log('\n' + name); }

/* ---- 1. single source: the inline copy in index.html must be identical ---- */
section('single-source core');
{
  const marker = /\/\* ==== BEGIN employee-time core[\s\S]*?==== END employee-time core ==== \*\//;
  const fromModule = readFileSync(join(root, 'web/employee-time/quickbooks-export.mjs'), 'utf8').match(marker);
  const fromPage = readFileSync(join(root, 'web/employee-time/index.html'), 'utf8').match(marker);
  check('both files contain the marked core region', !!fromModule && !!fromPage);
  check('core region is byte-identical in module and page',
    !!fromModule && !!fromPage && fromModule[0] === fromPage[0],
    'edit quickbooks-export.mjs and re-splice the region into index.html');
}

/* ---- fixtures ---- */
const employees = [
  { id: 'e1', name: 'Mike Torres', role: 'Foreman' },
  { id: 'e2', name: 'Dana, "the saw"', role: 'Carpenter' }, // exercises CSV quoting
];
const jobs = [
  { id: 'j1', name: 'Maple Street Remodel' },
  { id: 'j2', name: 'Shop: Warehouse' },
];
const D = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

/* ---- 2. duration math ---- */
section('duration math');
{
  const now = D(2026, 8, 31, 12);
  const plain = { id: 'a', empId: 'e1', jobId: 'j1', clockIn: D(2026, 8, 25, 7), clockOut: D(2026, 8, 25, 15, 30), breaks: [{ start: D(2026, 8, 25, 12), end: D(2026, 8, 25, 12, 30) }], status: 'closed' };
  check('8.5h shift minus 30m break = 8:00', qb.qbHoursHMM(qb.qbWorkedMs(plain, now)) === '8:00');
  const midnight = { id: 'b', empId: 'e1', jobId: 'j1', clockIn: D(2026, 8, 25, 21), clockOut: D(2026, 8, 26, 1, 30), breaks: [], status: 'closed' };
  check('midnight-crossing shift is positive 4:30', qb.qbHoursHMM(qb.qbWorkedMs(midnight, now)) === '4:30');
  const runningBreak = { id: 'c', empId: 'e1', jobId: 'j1', clockIn: now - 2 * qb.QB_HOUR, clockOut: null, breaks: [{ start: now - qb.QB_HOUR, end: null }], status: 'open' };
  check('running break counts up to now', qb.qbWorkedMs(runningBreak, now) === qb.QB_HOUR);
  check('open entry is not stale before 16h', !qb.qbIsStale(runningBreak, now));
  check('open entry is stale after 16h', qb.qbIsStale({ clockIn: now - 17 * qb.QB_HOUR, clockOut: null }, now));
  const inverted = { id: 'd', empId: 'e1', jobId: 'j1', clockIn: now, clockOut: now - qb.QB_HOUR, breaks: [], status: 'closed' };
  check('worked time clamps at zero, never negative', qb.qbWorkedMs(inverted, now) === 0);
}

/* ---- 3. DST-safe calendar arithmetic (America/Detroit, fall-back 2026-11-01) ---- */
section('DST week bounds');
{
  const inFallBackWeek = D(2026, 10, 29, 12); // Thursday before Sunday 2026-11-01, the fall-back day
  const { start, end } = qb.qbWeekRange(0, inFallBackWeek);
  const s = new Date(start), e = new Date(end);
  check('week starts Monday 00:00 local', s.getDay() === 1 && s.getHours() === 0 && s.getMinutes() === 0,
    'got ' + s.toString());
  check('next Monday is also 00:00 local', e.getDay() === 1 && e.getHours() === 0);
  check('the fall-back week is 169 hours long', (end - start) === 169 * qb.QB_HOUR,
    'got ' + (end - start) / qb.QB_HOUR + 'h');
  check('localDateKey stays local across an evening shift',
    qb.qbLocalDateKey(D(2026, 8, 25, 23, 30)) === '2026-08-25');
}

/* ---- 4. entry selection: QuickBooks only gets settled hours ---- */
section('entry selection');
{
  const now = D(2026, 8, 31, 12);
  const { start, end } = qb.qbWeekRange(-1, now);
  const entries = [
    { id: 'ok', empId: 'e1', jobId: 'j1', clockIn: start + 7 * qb.QB_HOUR, clockOut: start + 15 * qb.QB_HOUR, breaks: [], status: 'closed' },
    { id: 'open', empId: 'e2', jobId: 'j1', clockIn: start + 30 * qb.QB_HOUR, clockOut: null, breaks: [], status: 'open' },
    { id: 'zero', empId: 'e1', jobId: 'j2', clockIn: start + 50 * qb.QB_HOUR, clockOut: start + 50 * qb.QB_HOUR + 10000, breaks: [], status: 'closed' },
    { id: 'outside', empId: 'e1', jobId: 'j1', clockIn: end + qb.QB_HOUR, clockOut: end + 9 * qb.QB_HOUR, breaks: [], status: 'closed' },
  ];
  const picked = qb.qbSelectEntries(entries, { start, end, now });
  check('closed in-range entry included', picked.included.length === 1 && picked.included[0].id === 'ok');
  check('open and zero-minute entries excluded with reasons',
    picked.excluded.length === 2 && picked.excluded.every(x => x.reason.length > 10));
  check('stale open shift gets the stronger warning',
    qb.qbSelectEntries([{ id: 's', empId: 'e1', jobId: 'j1', clockIn: now - 20 * qb.QB_HOUR, clockOut: null, breaks: [], status: 'open' }],
      { start: now - 2 * qb.QB_DAY, end: now + qb.QB_DAY, now })
      .excluded[0].reason.includes('16 h'));
}

/* ---- shared export fixture ---- */
const now = D(2026, 8, 31, 12);
const week = qb.qbWeekRange(-1, now);
const exportEntries = [
  { id: 'x1', empId: 'e1', jobId: 'j1', clockIn: week.start + 7 * qb.QB_HOUR, clockOut: week.start + 15.5 * qb.QB_HOUR,
    breaks: [{ start: week.start + 11 * qb.QB_HOUR, end: week.start + 11.5 * qb.QB_HOUR }], status: 'closed', notes: 'framing\twith tab', seeded: true },
  { id: 'x2', empId: 'e2', jobId: 'j2', clockIn: week.start + 31 * qb.QB_HOUR, clockOut: week.start + 39 * qb.QB_HOUR,
    breaks: [], status: 'closed', notes: '=SUM(A1:A9)' }, // formula-injection attempt
];
const baseCtx = { employees, jobs, now, start: week.start, end: week.end, billable: true };

/* ---- 5. IIF ---- */
section('IIF (QuickBooks Desktop)');
{
  const bad = qb.qbBuildIif(exportEntries, { ...baseCtx, companyName: '', serviceItem: 'Labor' });
  check('missing company name is a hard error, not a silent default', bad.errors.length === 1 && bad.text === '');
  const out = qb.qbBuildIif(exportEntries, { ...baseCtx, companyName: 'Builder Assist LLC', serviceItem: 'Construction labor', payrollItem: 'Hourly Regular' });
  const lines = out.text.split('\n');
  check('no builder errors', out.errors.length === 0);
  check('TIMERHDR header pair present', lines[0].startsWith('!TIMERHDR\t') && lines[1].startsWith('TIMERHDR\t'));
  check('TIMEACT header present', lines[2].startsWith('!TIMEACT\tDATE\tJOB\tEMP\tITEM\tPITEM\tDURATION'));
  check('one TIMEACT row per included entry', lines.filter(l => l.startsWith('TIMEACT\t')).length === 2);
  const row = lines.find(l => l.includes('Mike Torres'));
  const cols = row.split('\t');
  check('every TIMEACT row has the full column count', lines.slice(3).every(l => l.split('\t').length === 11));
  check('DATE is MM/DD/YY', /^\d{2}\/\d{2}\/\d{2}$/.test(cols[1]), cols[1]);
  check('DURATION is h:mm (8.5h - 0.5h break = 8:00)', cols[6] === '8:00', cols[6]);
  check('tabs inside notes are flattened, not row-breaking', row.includes('framing with tab'));
  check('XFERTOPAYROLL follows the payroll item', cols[9] === 'Y' && cols[10] === '1');
}

/* ---- 6. CSV ---- */
section('CSV (QuickBooks Time / Online import)');
{
  const out = qb.qbBuildCsv(exportEntries, { ...baseCtx, serviceItem: 'Construction labor' });
  const lines = out.text.split('\n');
  check('header plus one row per entry', lines.length === 3);
  check('filename carries the week start', out.name === 'employee-time-quickbooks-' + qb.qbLocalDateKey(week.start) + '.csv', out.name);
  check('comma/quote names are quoted and doubled', out.text.includes('"Dana, ""the saw"""'));
  check('leading = in a note is neutralised', out.text.includes("'=SUM(A1:A9)"), 'formula injection guard');
  check('hours columns agree (8:00 and 8.0000)', lines[1].includes('8:00') && lines[1].includes('8.0000'));
  check('seeded rows are flagged in the export', lines[1].endsWith(',yes'));
}

/* ---- 7. TimeActivity payloads ---- */
section('TimeActivity (QuickBooks Online API)');
{
  const unmappedRun = qb.qbBuildTimeActivities(exportEntries, { ...baseCtx, mapping: { employees: {}, customers: {} } });
  check('with no ID mapping, nothing is invented', unmappedRun.activities.length === 0 && unmappedRun.unmapped.length === 2);
  check('unmapped reasons name the person and job', unmappedRun.unmapped[0].reason.includes('Mike Torres'));
  const mapping = { employees: { e1: '55', e2: '56' }, customers: { j1: '101', j2: '102' }, itemId: '7' };
  const run = qb.qbBuildTimeActivities(exportEntries, { ...baseCtx, mapping });
  check('fully mapped entries all convert', run.activities.length === 2 && run.unmapped.length === 0);
  const a = run.activities[0];
  check('refs carry the mapped IDs as strings',
    a.EmployeeRef.value === '55' && a.CustomerRef.value === '101' && a.ItemRef.value === '7');
  check('StartTime carries a local UTC offset', /[+-]\d{2}:\d{2}$/.test(a.StartTime), a.StartTime);
  check('break splits into hours and minutes', a.BreakHours === 0 && a.BreakMinutes === 30);
  check('BillableStatus follows the flag', a.BillableStatus === 'Billable');
  check('TxnDate is the local clock-in date', a.TxnDate === qb.qbLocalDateKey(exportEntries[0].clockIn));
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
