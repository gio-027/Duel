'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const STATIC_FILES = ['index.html', 'style.css', 'game.js', 'manifest.webmanifest', 'icon.svg', 'logo.svg', 'icon-192.png', 'icon-512.png'];
const missing = STATIC_FILES.filter((n) => !fs.existsSync(path.join(__dirname, n)));
if (missing.length) {
  console.error('Missing files: ' + missing.join(', ') + '. Upload ALL files to the repository root.');
  process.exit(1);
}
const PORT = parseInt(process.env.PORT, 10) || 3000;
const MAX_ROOMS = 300;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const COUNTDOWN_MS = 3200;
const MIN_RACE_MS = 30000;      // ამაზე სწრაფად დასრულება შეუძლებელია
const MAX_RACE_MS = 130000;     // ამ დროს მეტი მანძილის მქონე იგებს
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const CSP = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src https://fonts.gstatic.com", "img-src 'self' data:", "connect-src 'self' ws: wss:", "manifest-src 'self'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'"].join('; ');

const files = new Map();
for (const n of STATIC_FILES) files.set('/' + n, { body: fs.readFileSync(path.join(__dirname, n)), type: TYPES[path.extname(n)] || 'application/octet-stream' });

const server = http.createServer((req, res) => {
  let p = (req.url || '/').split('?')[0];
  if (p === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  if (p === '/') p = '/index.html';
  const f = files.get(p);
  if (!f || (req.method !== 'GET' && req.method !== 'HEAD')) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': f.type, 'cache-control': p === '/index.html' ? 'no-cache' : 'public, max-age=300', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': CSP });
  res.end(req.method === 'HEAD' ? undefined : f.body);
});

/* room = { code, born, p:{a,b}, round, race:null|{seed,t0,d:{a,b},fin:{a,b},timer}, ready:{a,b} } ; player = { ws, token, name, off } */
const rooms = new Map();
const cleanName = (s) => (String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 14)) || 'მოთამაშე';
function newCode() { for (;;) { let c = ''; for (let i = 0; i < 4; i++) c += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]; if (!rooms.has(c)) return c; } }
const cleanStake = (v) => { const n = Math.floor(Number(v)); return n >= 1 && n <= 10 ? n : 1; };
const newToken = () => crypto.randomBytes(16).toString('hex');
const safeEqual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const opp = (r) => (r === 'a' ? 'b' : 'a');
function toBoth(room, o) { for (const r of ['a', 'b']) { const pl = room.p[r]; if (pl && pl.ws) send(pl.ws, o); } }
function closeRoom(room, notify) {
  if (room.race && room.race.timer) clearTimeout(room.race.timer);
  for (const r of ['a', 'b']) { const pl = room.p[r]; if (!pl || !pl.ws) continue; if (notify) send(pl.ws, { t: 'closed' }); pl.ws.ctx = null; }
  rooms.delete(room.code);
}
function leaveCurrent(ws) { const c = ws.ctx; ws.ctx = null; if (!c) return; const room = rooms.get(c.code); const pl = room && room.p[c.role]; if (pl && pl.ws === ws) closeRoom(room, true); }

function startRound(room) {
  if (room.race && room.race.timer) clearTimeout(room.race.timer);
  room.round++;
  const seed = crypto.randomInt(1, 2 ** 31 - 1);
  const t0 = Date.now() + COUNTDOWN_MS;
  room.ready = { a: false, b: false };
  room.race = { seed, t0, d: { a: 0, b: 0 }, fin: { a: null, b: null }, done: false, atk: { a: 0, b: 0 }, timer: null };
  room.race.timer = setTimeout(() => endRace(room, null), COUNTDOWN_MS + MAX_RACE_MS);
  toBoth(room, { t: 'start', seed, round: room.round, names: { a: room.p.a.name, b: room.p.b.name }, stake: room.stake, countdown: COUNTDOWN_MS });
}
function endRace(room, winner) {
  const r = room.race;
  if (!r || r.done) return;
  r.done = true;
  clearTimeout(r.timer);
  if (!winner) winner = r.d.a === r.d.b ? (crypto.randomInt(2) ? 'a' : 'b') : (r.d.a > r.d.b ? 'a' : 'b');
  toBoth(room, { t: 'result', winner, times: r.fin, d: r.d });
}

function onCreate(ws, m) {
  leaveCurrent(ws);
  if (rooms.size >= MAX_ROOMS) return send(ws, { t: 'err', code: 'busy' });
  const code = newCode(), token = newToken();
  rooms.set(code, { code, born: Date.now(), p: { a: { ws, token, name: cleanName(m.name), off: 0 }, b: null }, stake: cleanStake(m.stake), round: 0, race: null, ready: { a: false, b: false } });
  ws.ctx = { code, role: 'a' };
  send(ws, { t: 'created', code, token, role: 'a', stake: rooms.get(code).stake });
}
function onJoin(ws, m) {
  leaveCurrent(ws);
  const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const room = rooms.get(code);
  if (!room) return send(ws, { t: 'err', code: 'no_room' });
  if (room.p.b) return send(ws, { t: 'err', code: 'room_full' });
  const token = newToken();
  room.p.b = { ws, token, name: cleanName(m.name), off: 0 };
  ws.ctx = { code, role: 'b' };
  send(ws, { t: 'joined', code, token, role: 'b', stake: room.stake });
  startRound(room);
}
function onRejoin(ws, m) {
  const code = String(m.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const role = m.role === 'b' ? 'b' : 'a';
  const room = rooms.get(code), pl = room && room.p[role];
  if (!room || !pl || !safeEqual(pl.token, m.token)) return send(ws, { t: 'err', code: 'no_room' });
  if (pl.ws && pl.ws !== ws) { pl.ws.ctx = null; try { pl.ws.close(); } catch (e) { /* */ } }
  pl.ws = ws; pl.off = 0; ws.ctx = { code, role };
  send(ws, { t: 'rejoined', code, role });
  const r = room.race;
  if (r && room.p.b) send(ws, { t: 'start', seed: r.seed, round: room.round, names: { a: room.p.a.name, b: room.p.b.name }, stake: room.stake, countdown: Math.max(0, r.t0 - Date.now()), resume: true });
  const o = room.p[opp(role)];
  if (o && o.ws) send(o.ws, { t: 'peer', online: true });
}
function ctxRoom(ws) { const c = ws.ctx; const room = c && rooms.get(c.code); return room ? { room, role: c.role } : null; }
function onPos(ws, m) {
  const x = ctxRoom(ws); if (!x || !x.room.race || x.room.race.done) return;
  const d = Number(m.d), l = Number(m.x);
  if (!isFinite(d) || !isFinite(l)) return;
  const r = x.room.race;
  r.d[x.role] = Math.max(r.d[x.role], Math.min(d, 5000));
  const o = x.room.p[opp(x.role)];
  if (o && o.ws) send(o.ws, { t: 'opp', d, x: Math.max(0, Math.min(2, l)), b: m.b ? 1 : 0, s: m.s ? 1 : 0 });
}
function onAtk(ws) {
  const x = ctxRoom(ws); if (!x || !x.room.race || x.room.race.done) return;
  const r = x.room.race;
  if (Date.now() < r.t0 || r.atk[x.role] >= 12) return;
  r.atk[x.role]++;
  const o = x.room.p[opp(x.role)];
  if (o && o.ws) send(o.ws, { t: 'atk' });
}
function onFin(ws) {
  const x = ctxRoom(ws); if (!x || !x.room.race || x.room.race.done) return;
  const r = x.room.race, el = Date.now() - r.t0;
  if (el < MIN_RACE_MS) return;
  r.fin[x.role] = el;
  endRace(x.room, x.role);
}
function onAgain(ws) {
  const x = ctxRoom(ws); if (!x || !x.room.race || !x.room.race.done || !x.room.p.b) return;
  x.room.ready[x.role] = true;
  if (x.room.ready.a && x.room.ready.b) startRound(x.room);
  else { const o = x.room.p[opp(x.role)]; if (o && o.ws) send(o.ws, { t: 'rematch' }); }
}
function onClose(ws) {
  const c = ws.ctx; if (!c) return;
  const room = rooms.get(c.code), pl = room && room.p[c.role];
  if (!pl || pl.ws !== ws) return;
  pl.ws = null; pl.off = Date.now();
  const o = room.p[opp(c.role)];
  if (o && o.ws) send(o.ws, { t: 'peer', online: false });
}
function handle(ws, m) {
  switch (m.t) {
    case 'create': return onCreate(ws, m);
    case 'join': return onJoin(ws, m);
    case 'rejoin': return onRejoin(ws, m);
    case 'pos': return onPos(ws, m);
    case 'atk': return onAtk(ws);
    case 'fin': return onFin(ws);
    case 'again': return onAgain(ws);
    case 'leave': return leaveCurrent(ws);
  }
}

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 512 });
wss.on('connection', (ws) => {
  ws.isAlive = true; ws.ctx = null; ws.winStart = Date.now(); ws.winCount = 0;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    const now = Date.now();
    if (now - ws.winStart > 2000) { ws.winStart = now; ws.winCount = 0; }
    if (++ws.winCount > 60) return;
    let m; try { m = JSON.parse(data.toString()); } catch (e) { return; }
    if (m && typeof m === 'object') handle(ws, m);
  });
  ws.on('close', () => onClose(ws));
  ws.on('error', () => {});
});
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch (e) { /* */ } } }, 25000).unref();
setInterval(() => {
  const now = Date.now();
  for (const room of Array.from(rooms.values())) {
    const pls = [room.p.a, room.p.b].filter(Boolean);
    const allGone = pls.every((p) => !p.ws && now - p.off > 180000);
    const oneGone = pls.some((p) => !p.ws && now - p.off > 600000);
    if (allGone || oneGone || now - room.born > 6 * 3600 * 1000) closeRoom(room, true);
  }
}, 30000).unref();
server.listen(PORT, () => console.log('Duel listening on port ' + PORT));
function shutdown() { wss.close(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 2000).unref(); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
