import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { PDFDocument, rgb } from 'pdf-lib';
import { configFromEnv, createConnector } from '../server.mjs';

test('hosted connector isolates sessions and measures a known uploaded plan over MCP HTTP', async t => {
  const dataRoot = await mkdtemp(path.join(os.tmpdir(), 'opentakeoff-http-test-'));
  const token = randomBytes(32).toString('hex');
  const config = configFromEnv({ CONNECTOR_TOKEN: token, PORT: '0', DATA_DIR: dataRoot, MAX_SESSIONS: '3', SESSION_IDLE_MS: '1500', MAX_SESSION_FILES: '10', MAX_UPLOAD_BYTES: '16384' });
  const app = await createConnector(config);
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  let id = 0;
  const request = (route, opts = {}) => fetch(base + route, { ...opts, headers: { Authorization: `Bearer ${token}`, ...opts.headers } });
  const rpc = (session, method, args) => request('/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-03-26', ...(session ? { 'mcp-session-id': session } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, ...(args ? { params: args } : {}) }),
  });
  async function initialize() {
    const response = await rpc(null, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'connector-test', version: '1.0.0' } });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.result.serverInfo.version, '0.9.83');
    const session = response.headers.get('mcp-session-id'); assert.ok(session);
    const notified = await request('/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-session-id': session }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
    assert.equal(notified.status, 202);
    return session;
  }
  async function call(session, name, args = {}) {
    const response = await rpc(session, 'tools/call', { name, arguments: args });
    assert.equal(response.status, 200, await response.clone().text());
    const envelope = await response.json(); assert.equal(envelope.error, undefined);
    const result = envelope.result; assert.ok(!result.isError, JSON.stringify(result));
    return result.structuredContent ?? JSON.parse(result.content.find(item => item.type === 'text').text);
  }
  try {
    await t.test('health is minimal; missing and incorrect secrets fail; origins and hosts fail closed', async () => {
      const health = await fetch(base + '/healthz'); assert.equal(health.status, 200);
      assert.deepEqual(Object.keys(await health.json()).sort(), ['service', 'status', 'version']);
      assert.equal((await fetch(base + '/mcp', { method: 'POST' })).status, 401);
      assert.equal((await request('/mcp', { method: 'POST', headers: { Authorization: 'Bearer incorrect' } })).status, 401);
      assert.equal((await request('/mcp', { headers: { origin: 'https://evil.invalid' } })).status, 403);
      const hostStatus = await new Promise(resolve => {
        http.get(base + '/mcp', { headers: { host: 'evil.invalid', authorization: `Bearer ${token}` } }, response => { response.resume(); resolve(response.statusCode); });
      });
      assert.equal(hostStatus, 403);
    });
    const sessionA = await initialize(), sessionB = await initialize();
    await t.test('MCP handshake exposes the pinned, inspected tool surface', async () => {
      const response = await rpc(sessionA, 'tools/list'); const tools = (await response.json()).result.tools;
      assert.equal(tools.length, 53);
      assert.ok(!tools.some(tool => ['one_click', 'detect_rooms'].includes(tool.name)));
      const pathTools = tools.filter(tool => Object.hasOwn(tool.inputSchema.properties ?? {}, 'path')).map(tool => tool.name).sort();
      assert.deepEqual(pathTools, ['export_dxf', 'export_marked_pdf', 'export_report', 'export_takeoff', 'import_takeoff', 'load_plan']);
      const ping = await rpc(sessionA, 'ping'); assert.equal(ping.status, 200);
    });
    const pdf = await PDFDocument.create(); const page = pdf.addPage([300, 300]);
    page.drawRectangle({ x: 50, y: 150, width: 100, height: 50, borderColor: rgb(0, 0, 0), borderWidth: 1 });
    const fixture = Buffer.from(await pdf.save());
    const upload = session => request('/plans?filename=test.pdf', { method: 'POST', headers: { 'mcp-session-id': session, 'content-type': 'application/pdf' }, body: fixture });
    await t.test('authenticated plan upload then scale/measurement/report returns 200 square feet', async () => {
      const uploaded = await upload(sessionA); assert.equal(uploaded.status, 201); assert.equal((await uploaded.json()).path, 'test.pdf');
      const loaded = await call(sessionA, 'load_plan', { path: 'test.pdf' }); assert.equal(loaded.page_count, 1);
      const scale = await call(sessionA, 'set_scale', { sheet: 'test.pdf', upp: 0.1 }); assert.equal(scale.confirmed, false);
      const measurement = await call(sessionA, 'measure_polygon', { sheet: 'test.pdf', verts: [[100, 200], [300, 200], [300, 300], [100, 300]], condition: 'TEST-FLOOR' });
      assert.equal(measurement.area_sf, 200); assert.equal(measurement.perimeter_lf, 60);
      assert.equal((await call(sessionA, 'takeoff_summary')).totals.total_sf, 200);
      const report = await call(sessionA, 'export_report', { path: 'report.json' }); assert.equal(report.schema, 'opentakeoff.report.v1'); assert.equal(report.totals.total_sf, 200);
      const downloaded = await request('/files/report.json', { headers: { 'mcp-session-id': sessionA } }); assert.equal(downloaded.status, 200); assert.equal((await downloaded.json()).totals.total_sf, 200);
      const view = await rpc(sessionA, 'tools/call', { name: 'view_sheet', arguments: { sheet: 'test.pdf', px: 400, overlay: true } });
      const rendered = (await view.json()).result; assert.ok(!rendered.isError); assert.ok(rendered.content.some(item => item.type === 'image' && item.data.length > 100));
    });
    await t.test('input and output files cannot escape or cross session boundaries', async () => {
      for (const name of ['load_plan', 'import_takeoff', 'export_report', 'export_takeoff', 'export_dxf', 'export_marked_pdf']) {
        for (const unsafe of ['../outside.pdf', '/etc/passwd', 'C:\\Windows\\win.ini', '..\\outside.pdf', 'file:///etc/passwd']) {
          assert.equal((await rpc(sessionA, 'tools/call', { name, arguments: { path: unsafe } })).status, 400);
        }
      }
      assert.equal((await rpc(sessionB, 'tools/call', { name: 'load_plan', arguments: { path: 'test.pdf' } })).status, 404);
      assert.equal((await request('/files/report.json', { headers: { 'mcp-session-id': sessionB } })).status, 404);
      assert.equal((await request('/plans?filename=..%2Foutside.pdf', { method: 'POST', headers: { 'mcp-session-id': sessionA, 'content-type': 'application/pdf' }, body: fixture })).status, 400);
      assert.equal((await upload(sessionA)).status, 409);
      assert.equal((await rpc(sessionA, 'tools/call', { name: 'export_report', arguments: { path: 'report.json', overwrite: true } })).status, 400);
    });
    await t.test('separate sessions retain separate geometry; defaults export into controlled storage', async () => {
      assert.equal((await upload(sessionB)).status, 201);
      await call(sessionB, 'load_plan', { path: 'test.pdf' });
      assert.equal((await call(sessionB, 'takeoff_summary')).totals.total_sf, 0);
      assert.equal((await call(sessionA, 'takeoff_summary')).totals.total_sf, 200);
      const marked = await call(sessionA, 'export_marked_pdf');
      assert.ok(!JSON.stringify(marked).includes(dataRoot));
      const downloaded = await request('/files/export_marked_pdf.pdf', { headers: { 'mcp-session-id': sessionA } }); assert.equal(downloaded.status, 200);
      assert.ok(Buffer.from(await downloaded.arrayBuffer()).subarray(0, 8).includes(Buffer.from('%PDF-')));
    });
    await t.test('concurrent mutations serialize; takeoff imports do not open embedded paths', async () => {
      await call(sessionB, 'set_scale', { sheet: 'test.pdf', upp: 0.1 });
      const lines = await Promise.all([
        call(sessionB, 'measure_line', { sheet: 'test.pdf', pts: [[10, 10], [110, 10]], condition: 'CONCURRENT-LINE' }),
        call(sessionB, 'measure_line', { sheet: 'test.pdf', pts: [[10, 20], [110, 20]], condition: 'CONCURRENT-LINE' }),
      ]);
      assert.equal(lines.length, 2); assert.equal((await call(sessionB, 'takeoff_summary')).totals.lf, 20);
      const exported = await call(sessionB, 'export_takeoff');
      exported.filePath = '/not-a-real-file/private-plan.pdf';
      exported.documents = [{ path: 'C:\\not-a-real-file\\private-plan.pdf', url: 'http://127.0.0.1:1/do-not-fetch' }];
      for (const sheet of exported.sheets ?? []) { sheet.source_path = '/not-a-real-file/private-plan.pdf'; sheet.source_url = 'file:///etc/passwd'; }
      const uploaded = await request('/files?filename=resume.json', { method: 'POST', headers: { 'mcp-session-id': sessionB, 'content-type': 'application/json' }, body: JSON.stringify(exported) });
      assert.equal(uploaded.status, 201);
      await call(sessionB, 'import_takeoff', { path: 'resume.json' });
      assert.equal((await call(sessionB, 'takeoff_summary')).totals.lf, 20);
      await call(sessionB, 'export_marked_pdf');
      const download = await request('/files/export_marked_pdf.pdf', { headers: { 'mcp-session-id': sessionB } }); assert.equal(download.status, 200); await download.arrayBuffer();
    });
    await t.test('one live event stream per session is enforced', async () => {
      const abort = new AbortController();
      const first = await request('/mcp', { signal: abort.signal, headers: { 'mcp-session-id': sessionA, accept: 'text/event-stream', 'mcp-protocol-version': '2025-03-26' } });
      assert.equal(first.status, 200);
      try {
        assert.equal((await request('/mcp', { headers: { 'mcp-session-id': sessionA, accept: 'text/event-stream', 'mcp-protocol-version': '2025-03-26' } })).status, 429);
      } finally { abort.abort(); }
    });
    await t.test('upload limits and session limits reject excessive requests', async () => {
      assert.equal((await request('/plans?filename=large.pdf', { method: 'POST', headers: { 'mcp-session-id': sessionA, 'content-type': 'application/pdf' }, body: Buffer.alloc(16385) })).status, 413);
      const sessionC = await initialize();
      const excess = await rpc(null, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'excess', version: '1' } }); assert.equal(excess.status, 429);
      const terminated = await request('/mcp', { method: 'DELETE', headers: { 'mcp-session-id': sessionC, 'mcp-protocol-version': '2025-03-26' } }); assert.equal(terminated.status, 200);
      assert.equal((await rpc(sessionC, 'ping')).status, 404);
    });
    await t.test('idle sessions expire and storage is removed', async () => {
      await new Promise(resolve => setTimeout(resolve, 3200));
      assert.equal((await rpc(sessionA, 'ping')).status, 404);
      const instance = (await readdir(dataRoot))[0]; assert.ok(instance);
      assert.equal((await readdir(path.join(dataRoot, instance))).length, 0);
    });
  } finally {
    await app.close();
    assert.equal((await readdir(dataRoot)).length, 0);
    const relative = path.relative(os.tmpdir(), dataRoot); assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    await rm(dataRoot, { recursive: true, force: true });
  }
});
