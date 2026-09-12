import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, readFile, readdir, stat, lstat, realpath, rm } from 'node:fs/promises';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { PDFDocument } from 'pdf-lib';

// Import the factory, never the upstream executable (which starts stdio).
const { buildServer } = await import('opentakeoff-mcp/dist/server-core.js');
const READ_TOOLS = new Set(['load_plan', 'import_takeoff']);
const EXPORT_EXTENSIONS = { export_takeoff: '.json', export_report: '.json', export_dxf: '.dxf', export_marked_pdf: '.pdf' };
const filenamePattern = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,119}$/;
const digest = value => createHash('sha256').update(value).digest();
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

export function configFromEnv(env = process.env) {
  const number = (name, fallback, min = 1) => {
    const value = Number(env[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value < min) throw new Error(`Invalid ${name}`);
    return value;
  };
  if (typeof env.CONNECTOR_TOKEN !== 'string' || Buffer.byteLength(env.CONNECTOR_TOKEN) < 32 || /\s/.test(env.CONNECTOR_TOKEN)) {
    throw new Error('CONNECTOR_TOKEN must be a secret of at least 32 bytes without whitespace');
  }
  const list = value => new Set(value.split(',').map(item => item.trim()).filter(Boolean));
  return {
    token: env.CONNECTOR_TOKEN,
    host: env.HOST ?? '127.0.0.1', port: number('PORT', 8080, 0),
    allowedHosts: list(env.ALLOWED_HOSTS ?? 'localhost,127.0.0.1,[::1]'),
    allowedOrigins: list(env.ALLOWED_ORIGINS ?? ''),
    dataRoot: path.resolve(env.DATA_DIR ?? path.join(os.tmpdir(), 'opentakeoff')),
    maxSessions: number('MAX_SESSIONS', 8), idleMs: number('SESSION_IDLE_MS', 1_800_000),
    maxAgeMs: number('SESSION_MAX_AGE_MS', 14_400_000), maxUploadBytes: number('MAX_UPLOAD_BYTES', 33_554_432),
    maxSessionBytes: number('MAX_SESSION_BYTES', 134_217_728), maxFiles: number('MAX_SESSION_FILES', 40),
    maxJsonBytes: number('MAX_JSON_BYTES', 2_097_152), maxRequests: number('MAX_SESSION_REQUESTS', 2000),
    maxPdfPages: number('MAX_PDF_PAGES', 200),
  };
}

function json(res, status, body) {
  if (res.headersSent) { res.destroy(); return; }
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(body));
}
function filename(value, extension) {
  if (typeof value !== 'string' || !filenamePattern.test(value) || value.includes('..') || value.endsWith('.') || value.endsWith(' ') || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)) {
    throw new HttpError(400, 'Use an uploaded or exported filename, without directories');
  }
  if (extension && !value.toLowerCase().endsWith(extension)) throw new HttpError(400, `Filename must end in ${extension}`);
  return value;
}
function contained(root, candidate) {
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Storage boundary violation');
  return candidate;
}
async function safeFile(root, name, mustExist) {
  const target = contained(root, path.join(root, filename(name)));
  try {
    const info = await lstat(target);
    if (!info.isFile() || info.isSymbolicLink()) throw new HttpError(400, 'Only session files are allowed');
    contained(await realpath(root), await realpath(target));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (mustExist) throw new HttpError(404, 'Session file not found');
  }
  return target;
}
async function body(req, limit) {
  if (Number(req.headers['content-length']) > limit) throw new HttpError(413, 'Request is too large');
  const chunks = []; let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) throw new HttpError(413, 'Request is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, bytes);
}
async function storageUsage(session) {
  let bytes = 0, files = 0;
  for (const directory of [session.uploads, session.exports]) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isFile() || entry.isSymbolicLink()) throw new Error('Unexpected session storage entry');
      bytes += (await stat(contained(directory, path.join(directory, entry.name)))).size;
      files++;
    }
  }
  return { bytes, files };
}

export async function createConnector(config) {
  const secretHash = digest(config.token);
  await mkdir(config.dataRoot, { recursive: true, mode: 0o700 });
  const instanceRoot = await mkdtemp(path.join(config.dataRoot, 'instance-'));
  const sessions = new Map(); let pending = 0, closing = false;

  async function destroySession(session) {
    if (session.closed) return;
    session.closed = true; sessions.delete(session.id);
    try { await session.engine.close(); } finally {
      await rm(contained(instanceRoot, session.dir), { recursive: true, force: true });
    }
  }
  async function makeSession() {
    if (sessions.size + pending >= config.maxSessions) throw new HttpError(429, 'Session capacity reached');
    pending++;
    let session, allocatedDir;
    try {
      const id = randomUUID(), dir = contained(instanceRoot, path.join(instanceRoot, id));
      allocatedDir = dir;
      const uploads = path.join(dir, 'uploads'), exports = path.join(dir, 'exports');
      await mkdir(uploads, { recursive: true, mode: 0o700 });
      await mkdir(exports, { mode: 0o700 });
      session = { id, dir, uploads, exports, created: Date.now(), touched: Date.now(), requests: 0, busy: false, closed: false, sseOpen: false, queue: Promise.resolve(), queueDepth: 0, engine: buildServer(undefined, { stagedTools: false, oneClick: false }) };
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => id, enableJsonResponse: true });
      session.transport = transport;
      await session.engine.connect(transport);
      // Keep MCP output portable: clients receive virtual filenames, not host paths.
      const send = transport.send.bind(transport);
      transport.send = async (message, options) => {
        if (Object.hasOwn(message, 'id') && message.result) {
          const usage = await storageUsage(session);
          if (usage.bytes > config.maxSessionBytes || usage.files > config.maxFiles) {
            message = { jsonrpc: '2.0', id: message.id, error: { code: -32000, message: 'Session storage quota exceeded; initialize a new session' } };
          }
        }
        const portable = value => {
          if (typeof value === 'string') {
            for (const [prefix, replacement] of [[uploads + path.sep, ''], [exports + path.sep, ''], [dir, '<session>']]) {
              value = value.split(prefix).join(replacement).split(prefix.replaceAll('\\', '\\\\')).join(replacement);
            }
            return value;
          }
          if (Array.isArray(value)) return value.map(portable);
          if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, portable(item)]));
          return value;
        };
        return send(portable(message), options);
      };
      sessions.set(id, session);
      return session;
    } catch (error) {
      if (session) await destroySession(session);
      else if (allocatedDir) await rm(contained(instanceRoot, allocatedDir), { recursive: true, force: true });
      throw error;
    } finally { pending--; }
  }
  function sessionFor(req) {
    const id = req.headers['mcp-session-id'];
    const session = typeof id === 'string' ? sessions.get(id) : undefined;
    if (!session || session.closed) throw new HttpError(404, 'Session not found; initialize a new MCP session');
    if (!session.busy && (Date.now() - session.created > config.maxAgeMs || Date.now() - session.touched > config.idleMs)) throw new HttpError(404, 'Session expired; initialize a new MCP session');
    return session;
  }
  async function exclusive(session, action) {
    if (session.queueDepth >= 4) throw new HttpError(429, 'This session is busy; retry after the current request');
    if (++session.requests > config.maxRequests) throw new HttpError(429, 'Session request limit reached; initialize a new session');
    const previous = session.queue;
    let release;
    session.queue = new Promise(resolve => { release = resolve; });
    session.queueDepth++;
    await previous;
    session.busy = true; session.touched = Date.now();
    try {
      if (session.closed) throw new HttpError(404, 'Session has closed');
      return await action();
    } finally { session.busy = false; session.touched = Date.now(); session.queueDepth--; release(); }
  }
  async function guardTool(message, session) {
    if (message.method !== 'tools/call') return;
    const name = message.params?.name;
    const args = message.params?.arguments ?? {};
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new HttpError(400, 'Invalid tool arguments');
    if (READ_TOOLS.has(name)) {
      args.path = await safeFile(session.uploads, filename(args.path, name === 'load_plan' ? '.pdf' : '.json'), true);
    } else if (Object.hasOwn(EXPORT_EXTENSIONS, name)) {
      const extension = EXPORT_EXTENSIONS[name];
      // Never let upstream's default marked-PDF path write beside an input.
      if (args.path !== undefined || name === 'export_marked_pdf' || name === 'export_dxf') {
        const output = filename(args.path ?? `${name}${extension}`, extension);
        args.path = await safeFile(session.exports, output, false);
        const usage = await storageUsage(session);
        if (usage.files >= config.maxFiles || usage.bytes >= config.maxSessionBytes) throw new HttpError(413, 'Session storage quota reached');
      }
      if (args.overwrite === true) throw new HttpError(400, 'Explicit overwrite is disabled on the hosted connector');
    } else if (Object.hasOwn(args, 'path')) {
      throw new HttpError(400, 'This tool does not accept a hosted file path');
    }
    message.params.arguments = args;
  }
  async function upload(req, res, url, session, planOnly) {
    return exclusive(session, async () => {
      const type = (req.headers['content-type'] ?? '').split(';')[0];
      const extension = planOnly ? '.pdf' : '.json';
      if (type !== (planOnly ? 'application/pdf' : 'application/json')) throw new HttpError(415, `Expected ${planOnly ? 'application/pdf' : 'application/json'}`);
      const name = filename(url.searchParams.get('filename'), extension);
      const target = await safeFile(session.uploads, name, false);
      const usage = await storageUsage(session);
      if (usage.files >= config.maxFiles) throw new HttpError(413, 'Session file limit reached');
      const bytes = await body(req, Math.min(config.maxUploadBytes, Math.max(0, config.maxSessionBytes - usage.bytes)));
      if (planOnly) {
        if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new HttpError(400, 'Upload is not a PDF');
        let doc;
        try { doc = await PDFDocument.load(bytes); } catch { throw new HttpError(400, 'PDF is invalid or encrypted'); }
        if (doc.getPageCount() > config.maxPdfPages) throw new HttpError(413, 'PDF page limit exceeded');
      } else {
        try {
          const takeoff = JSON.parse(bytes.toString('utf8'));
          if (takeoff.schema !== 'opentakeoff.takeoff_canvas.v1') throw new Error();
        } catch { throw new HttpError(400, 'Expected an OpenTakeoff takeoff_canvas.v1 JSON export'); }
      }
      try { await writeFile(target, bytes, { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code === 'EEXIST') throw new HttpError(409, 'Filename already exists; choose a new filename'); throw error; }
      json(res, 201, { path: name, bytes: bytes.length, next_tool: planOnly ? 'load_plan' : 'import_takeoff' });
    });
  }
  async function route(req, res) {
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    const url = new URL(req.url, 'http://connector.invalid');
    if (req.method === 'GET' && url.pathname === '/healthz') { json(res, closing ? 503 : 200, { status: closing ? 'stopping' : 'ok', service: 'opentakeoff-connector', version: '1.0.0' }); return; }
    if (closing) throw new HttpError(503, 'Service is stopping');
    let requestHost;
    try { requestHost = new URL(`http://${req.headers.host}`).hostname; } catch { throw new HttpError(400, 'Invalid host'); }
    if (!config.allowedHosts.has(requestHost)) throw new HttpError(403, 'Host is not allowed');
    const origin = req.headers.origin;
    if (origin) {
      if (!config.allowedOrigins.has(origin)) throw new HttpError(403, 'Origin is not allowed');
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'Origin');
      res.setHeader('access-control-expose-headers', 'Mcp-Session-Id');
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'access-control-allow-methods': 'GET, POST, DELETE', 'access-control-allow-headers': 'Authorization, Content-Type, Mcp-Session-Id, MCP-Protocol-Version' }); res.end(); return;
      }
    }
    const header = req.headers.authorization ?? '';
    const candidate = typeof header === 'string' && header.startsWith('Bearer ') && header.length < 4096 ? header.slice(7) : '';
    if (!timingSafeEqual(secretHash, digest(candidate))) { res.setHeader('www-authenticate', 'Bearer realm="opentakeoff"'); throw new HttpError(401, 'Authentication required'); }
    if (req.method === 'POST' && ['/plans', '/files'].includes(url.pathname)) return upload(req, res, url, sessionFor(req), url.pathname === '/plans');
    if (req.method === 'GET' && url.pathname.startsWith('/files/')) {
      const session = sessionFor(req);
      return exclusive(session, async () => {
        let name; try { name = filename(decodeURIComponent(url.pathname.slice(7))); } catch { throw new HttpError(400, 'Invalid filename'); }
        const target = await safeFile(session.exports, name, true);
        const size = (await stat(target)).size;
        if (size > config.maxSessionBytes) throw new HttpError(413, 'Export exceeds download limit');
        const bytes = await readFile(target);
        res.writeHead(200, { 'content-type': name.endsWith('.pdf') ? 'application/pdf' : name.endsWith('.json') ? 'application/json' : 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"`, 'content-length': bytes.length }); res.end(bytes);
      });
    }
    if (url.pathname !== '/mcp') throw new HttpError(404, 'Route not found');
    if (!['POST', 'GET', 'DELETE'].includes(req.method)) throw new HttpError(405, 'Method not allowed');
    let message;
    if (req.method === 'POST') {
      if (!(req.headers['content-type'] ?? '').startsWith('application/json')) throw new HttpError(415, 'Expected application/json');
      try { message = JSON.parse((await body(req, config.maxJsonBytes)).toString('utf8')); }
      catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Invalid JSON'); }
      if (!message || typeof message !== 'object' || Array.isArray(message)) throw new HttpError(400, 'One MCP message per request is required');
    }
    let session;
    if (!req.headers['mcp-session-id'] && req.method === 'POST' && isInitializeRequest(message)) session = await makeSession();
    else session = sessionFor(req);
    if (req.method === 'GET') {
      if (session.sseOpen) throw new HttpError(429, 'Only one event stream is allowed per session');
      session.sseOpen = true;
      // handleRequest returns once SSE headers have opened; the connection lives
      // until response close, so release the slot there, not in a finally block.
      res.once('close', () => { session.sseOpen = false; });
      try { return await session.transport.handleRequest(req, res); }
      catch (error) { session.sseOpen = false; throw error; }
    }
    return exclusive(session, async () => {
      try {
        if (message) await guardTool(message, session);
        await session.transport.handleRequest(req, res, message);
        if (message && isInitializeRequest(message) && !session.transport.sessionId) { await destroySession(session); return; }
        if (req.method === 'DELETE') { await destroySession(session); return; }
        const usage = await storageUsage(session);
        if (usage.bytes > config.maxSessionBytes || usage.files > config.maxFiles) await destroySession(session);
      } catch (error) {
        if (message && isInitializeRequest(message)) await destroySession(session);
        throw error;
      }
    });
  }
  const server = http.createServer((req, res) => {
    route(req, res).catch(error => {
      // Do not log tool arguments, documents, authorization headers or internal paths.
      if (!(error instanceof HttpError)) process.stderr.write('Connector request failed\n');
      json(res, error.status ?? 500, { error: error instanceof HttpError ? error.message : 'Connector request failed' });
    });
  });
  server.requestTimeout = 120_000; server.headersTimeout = 15_000; server.keepAliveTimeout = 5_000;
  server.maxConnections = 128;
  const timer = setInterval(() => {
    const now = Date.now();
    for (const session of sessions.values()) {
      if (!session.busy && (now - session.touched > config.idleMs || now - session.created > config.maxAgeMs)) destroySession(session).catch(() => process.stderr.write('Session cleanup failed\n'));
    }
  }, Math.min(30_000, config.idleMs)).unref();
  return {
    server,
    async listen() { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, config.host, resolve); }); return server.address(); },
    async close() {
      if (closing) return;
      closing = true; clearInterval(timer);
      const stopped = new Promise(resolve => server.close(resolve));
      for (const session of [...sessions.values()]) { await session.queue; await destroySession(session); }
      server.closeAllConnections(); await stopped;
      await rm(contained(config.dataRoot, instanceRoot), { recursive: true, force: true });
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const connector = await createConnector(configFromEnv());
  await connector.listen();
  process.stdout.write('OpenTakeoff connector ready\n');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
    const force = setTimeout(() => process.exit(1), 15_000).unref();
    await connector.close(); clearTimeout(force); process.exit(0);
  });
}
