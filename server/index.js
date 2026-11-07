import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { createPlanResponse } from './planner.js';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const port = Number(process.env.PORT || 8788);
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST' || req.url !== '/api/plan') {
    res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' })); return;
  }
  if (!String(req.headers['content-type'] || '').includes('application/json')) { res.writeHead(415); res.end(JSON.stringify({ error: 'Send JSON using Content-Type: application/json.' })); return; }
  let raw = '';
  try {
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 20_000) { res.writeHead(413); res.end(JSON.stringify({ error: 'Request is too large.' })); req.resume(); return; }
    }
  } catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Could not read request.' })); return; }
  let input;
  try { input = JSON.parse(raw || '{}'); }
  catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON.' })); return; }
  const result = await createPlanResponse(input);
  res.writeHead(result.status); res.end(JSON.stringify(result.body));
});
server.listen(port, '127.0.0.1', () => console.log(`ClearTask API listening on http://127.0.0.1:${port}`));
