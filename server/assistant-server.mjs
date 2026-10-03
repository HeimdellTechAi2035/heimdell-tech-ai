// Self-hosted runner for the A2A assistant (replaces netlify/functions/a2a.mjs, which GitHub Pages cannot run).
// Uses the same JSON-RPC handler and knowledge catalogue as before: no dependencies, Node 18+.
//
//   HOST=127.0.0.1 PORT=8095 TRUSTED_PROXY=1 URL=https://heimdell-tech-ai.co.uk node server/assistant-server.mjs
//
// POST /a2a/v1   (also /api/a2a/v1)   JSON-RPC 2.0 request  -> JSON-RPC response
// GET  /healthz                      -> {"ok":true}
// The catalogue is read from ${URL}/knowledge/catalogue.json (cached 5 minutes), so publishing the site updates the assistant.
import http from 'node:http';
import { handleRpc } from '../netlify/functions/_lib/rpc.mjs';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8095);
const TRUST_PROXY = process.env.TRUSTED_PROXY === '1';
const LIMIT = Number(process.env.RATE_PER_MINUTE || 30);   // same as the old Netlify config: 30 requests / 60 s per IP
const WINDOW_MS = 60_000;
const MAX_BODY = 32 * 1024;
const PATHS = new Set(['/a2a/v1', '/api/a2a/v1']);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, A2A-Extensions',
  'Access-Control-Max-Age': '86400'
};

const hits = new Map();
function clientIp(req) {
  if (TRUST_PROXY) {
    const xf = req.headers['x-forwarded-for'];
    if (xf) return String(xf).split(',').pop().trim();   // last hop = the address our proxy saw (nginx overwrites this header)
  }
  return req.socket.remoteAddress || 'unknown';
}
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) { hits.set(ip, recent); return true; }
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 10000) hits.clear();
  return false;
}

function send(res, status, obj, extra = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    ...CORS, ...extra
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, tooBig = false; const chunks = [];
    req.on('data', (c) => {
      if (tooBig) return;                       // keep discarding; the connection is closed after the 413 reply is sent
      size += c.length;
      if (size > MAX_BODY) { tooBig = true; chunks.length = 0; reject(Object.assign(new Error('too large'), { code: 413 })); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    if (path === '/healthz') return send(res, 200, { ok: true });
    if (!PATHS.has(path)) return send(res, 404, { error: 'Not found' });
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
    if (req.method !== 'POST') return send(res, 405, { error: 'POST a JSON-RPC 2.0 request to this endpoint' }, { Allow: 'POST, OPTIONS' });

    const ip = clientIp(req);
    if (limited(ip)) return send(res, 429, { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Rate limit exceeded' } }, { 'Retry-After': '60' });

    let raw;
    try { raw = await readBody(req); }
    catch (e) {
      res.on('finish', () => req.destroy());    // stop reading the rest of an oversized upload once we have replied
      return send(res, e.code === 413 ? 413 : 400, { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Request too large' } }, { Connection: 'close' });
    }

    let body;
    try { body = JSON.parse(raw); }
    catch { return send(res, 200, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }

    return send(res, 200, await handleRpc(body));
  } catch (e) {
    console.error('unhandled', e && e.message);
    if (!res.headersSent) send(res, 500, { jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } });
  }
});
server.headersTimeout = 10_000;
server.requestTimeout = 15_000;
server.listen(PORT, HOST, () => console.log(`assistant listening on http://${HOST}:${PORT}  catalogue from ${process.env.URL || 'https://heimdell-tech-ai.co.uk'}`));
