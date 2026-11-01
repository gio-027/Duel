(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

/* ---------- პარამეტრები ---------- */
var TOTAL = 42000, PER_CELL = 10, CELLS = TOTAL / PER_CELL, START_PTS = 10, BOOST_X = 1.85, NIT_MAX = 10;
var L = 1350, BASE = 24, ZC = 11.6, START_D = 96, MULT = 1.35, STRIPE = 7;
var SPEEDS = { 1: { m: 1.35, n: 'საშუალო' }, 2: { m: 2, n: 'სწრაფი' }, 3: { m: 3, n: 'სუპერ სწრაფი' } };
var speedLvl = 1;
function setSpeed(lvl) {
  speedLvl = SPEEDS[lvl] ? lvl : 1; MULT = SPEEDS[speedLvl].m;
  L = 1000 * MULT; BASE = 18 * MULT; ZC = 10 * Math.sqrt(MULT); START_D = BASE * 4;
}
setSpeed(1);
var PRIZE_TEXT = 'მანქანა მთლიანად შეღებილია! ეს ტესტ-ვერსიაა და ჯილდოს პირობებს ორგანიზატორი აცხადებს.';
var PTS_KEY = 'duel-points', NAME_KEY = 'duel-name', MUTE_KEY = 'duel-mute', SESS_KEY = 'duel-session';

/* ---------- ფერები ---------- */
function hex(c) { c = c.replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')'; }
function tint(c, k) { return k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }

/* ---------- ქულები ---------- */
var points = (function () { var v = parseInt(lsGet(PTS_KEY), 10); return isFinite(v) && v >= 0 && v <= TOTAL ? v : START_PTS; })();
function setPoints(v) { points = Math.max(0, Math.min(TOTAL, Math.floor(v))); lsSet(PTS_KEY, String(points)); $('ptsTxt').textContent = points; fillStakes(); }
function fillStakes() {
  var sel = $('stake'), cur = parseInt(sel.value, 10) || 10, opts = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].filter(function (v) { return v <= Math.max(1, points); }), h = '';
  if (opts.indexOf(cur) < 0) cur = opts[opts.length - 1];
  opts.forEach(function (v) { h += '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + v + ' ქულა</option>'; });
  sel.innerHTML = h;
}

/* ---------- მანქანა: ჯერ მხოლოდ კონტური, ყოველი ქულა ერთ პატარა უჯრას ღებავს ---------- */
var CW = 420, CH = 190;
function bodyPath(p) {
  p.moveTo(22, 134); p.lineTo(22, 112); p.quadraticCurveTo(22, 98, 42, 94); p.lineTo(92, 88);
  p.quadraticCurveTo(118, 52, 160, 42); p.lineTo(262, 40); p.quadraticCurveTo(296, 42, 322, 72); p.lineTo(368, 82);
  p.quadraticCurveTo(398, 90, 400, 112); p.lineTo(400, 134); p.closePath();
  p.moveTo(140, 134); p.arc(112, 134, 28, 0, Math.PI * 2); p.moveTo(350, 134); p.arc(322, 134, 28, 0, Math.PI * 2);
}
var carCache = null;
function carData() {
  if (carCache) return carCache;
  var m = document.createElement('canvas'); m.width = CW; m.height = CH; var c = m.getContext('2d'), p = new Path2D(); bodyPath(p); c.fill(p, 'nonzero');
  var px = c.getImageData(0, 0, CW, CH).data, area = 0, i, x, y;
  for (i = 3; i < px.length; i += 4) if (px[i] > 128) area++;
  var cell = Math.sqrt(area / CELLS), cells = [], r = rng(777);
  for (y = 0; y < CH; y += cell) for (x = 0; x < CW; x += cell) {
    var ix = Math.min(CW - 1, Math.floor(x + cell / 2)), iy = Math.min(CH - 1, Math.floor(y + cell / 2));
    if (px[(iy * CW + ix) * 4 + 3] > 128) cells.push({ x: x, y: y, k: x + r() * 34 });
  }
  cells.sort(function (a, b) { return a.k - b.k; });
  var art = document.createElement('canvas'); art.width = CW * 2; art.height = CH * 2; drawCarArt(art.getContext('2d'));
  carCache = { path: p, cells: cells, cell: cell, art: art };
  return carCache;
}
function drawCarArt(c) {
  c.scale(2, 2);
  var p = new Path2D(); bodyPath(p);
  var g = c.createLinearGradient(0, 40, 0, 134); g.addColorStop(0, '#FF7A45'); g.addColorStop(0.45, '#E8142B'); g.addColorStop(1, '#7E0A1F');
  c.fillStyle = g; c.fill(p, 'nonzero');
  c.save(); c.clip(p);
  c.fillStyle = '#ffffffcc'; c.fillRect(30, 103, 380, 5); c.fillStyle = '#FFD23Fcc'; c.fillRect(30, 111, 380, 2);
  c.fillStyle = '#00000044'; c.fillRect(20, 122, 400, 14);
  var hl = c.createLinearGradient(0, 40, 0, 80); hl.addColorStop(0, '#ffffff66'); hl.addColorStop(1, '#ffffff00'); c.fillStyle = hl; c.fillRect(90, 40, 300, 40);
  c.restore();
  var gl = c.createLinearGradient(0, 50, 0, 90); gl.addColorStop(0, '#0F2547'); gl.addColorStop(1, '#5EA6F0');
  c.fillStyle = gl;
  c.beginPath(); c.moveTo(108, 88); c.quadraticCurveTo(128, 60, 160, 52); c.lineTo(186, 52); c.lineTo(186, 88); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(196, 52); c.lineTo(260, 51); c.quadraticCurveTo(288, 54, 306, 76); c.lineTo(312, 88); c.lineTo(196, 88); c.closePath(); c.fill();
  c.strokeStyle = '#00000055'; c.lineWidth = 2; c.beginPath(); c.moveTo(191, 52); c.lineTo(191, 120); c.moveTo(250, 90); c.lineTo(250, 120); c.stroke();
  c.fillStyle = '#FFF6B0'; c.beginPath(); c.ellipse(388, 100, 12, 6, 0, 0, 7); c.fill();
  c.fillStyle = '#FF2D2D'; c.fillRect(22, 98, 8, 10);
  [[112, 134], [322, 134]].forEach(function (w) {
    c.fillStyle = '#12151D'; c.beginPath(); c.arc(w[0], w[1], 28, 0, 7); c.fill();
    var rg = c.createRadialGradient(w[0] - 4, w[1] - 4, 2, w[0], w[1], 17); rg.addColorStop(0, '#fff'); rg.addColorStop(1, '#8793A8');
    c.fillStyle = rg; c.beginPath(); c.arc(w[0], w[1], 17, 0, 7); c.fill();
    c.strokeStyle = '#4A5568'; c.lineWidth = 3; for (var k = 0; k < 5; k++) { var a = k * 1.2566; c.beginPath(); c.moveTo(w[0], w[1]); c.lineTo(w[0] + Math.cos(a) * 16, w[1] + Math.sin(a) * 16); c.stroke(); }
    c.fillStyle = '#222'; c.beginPath(); c.arc(w[0], w[1], 4, 0, 7); c.fill();
  });
}
function carPct(n) { return (n / TOTAL * 100).toFixed(n >= TOTAL ? 0 : 2) + '%'; }
/* ხატავს მანქანას; newCount = რამდენი უჯრა ახლახან შეიღება (ანათებს) */
function paintCar(cv, pts, newCount, phase) {
  var D = carData(), c = cv.getContext('2d'), n = pts >= TOTAL ? D.cells.length : Math.min(D.cells.length, pts > 0 ? Math.max(1, Math.round(pts / TOTAL * D.cells.length)) : 0), i, q;
  cv.width = CW * 2; cv.height = CH * 2; c.clearRect(0, 0, cv.width, cv.height);
  c.save(); c.scale(2, 2);
  c.fillStyle = 'rgba(30,40,80,.18)'; c.beginPath(); c.ellipse(210, 168, 190, 9, 0, 0, 7); c.fill();
  c.fillStyle = '#E9F0FF'; c.fill(D.path, 'nonzero');
  c.restore();
  var m = document.createElement('canvas'); m.width = cv.width; m.height = cv.height; var mc = m.getContext('2d'); mc.scale(2, 2); mc.fillStyle = '#000';
  for (i = 0; i < n; i++) { q = D.cells[i]; mc.fillRect(q.x - 0.2, q.y - 0.2, D.cell + 0.4, D.cell + 0.4); }
  mc.setTransform(1, 0, 0, 1, 0, 0); mc.globalCompositeOperation = 'source-in'; mc.drawImage(D.art, 0, 0); c.drawImage(m, 0, 0);
  c.save(); c.scale(2, 2); c.strokeStyle = '#3B4A78'; c.lineWidth = 2.2; c.lineJoin = 'round'; c.stroke(D.path);
  if (newCount > 0 && n > 0) {
    var from = Math.max(0, n - newCount), sx = 0, sy = 0, cnt = 0;
    for (i = from; i < n; i++) { q = D.cells[i]; sx += q.x; sy += q.y; cnt++; }
    sx /= cnt; sy /= cnt; var t = phase || 0, rad = 8 + 26 * ((t * 1.4) % 1);
    c.lineWidth = 3; c.strokeStyle = 'rgba(255,200,0,' + (1 - (t * 1.4) % 1).toFixed(2) + ')'; c.beginPath(); c.arc(sx + D.cell / 2, sy + D.cell / 2, rad, 0, 7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(t * 18)).toFixed(2) + ')'; c.strokeStyle = '#FF9F1C'; c.lineWidth = 1.5;
    for (i = from; i < n; i++) { q = D.cells[i]; c.fillRect(q.x - 1, q.y - 1, D.cell + 2, D.cell + 2); }
  }
  c.restore();
}
function showCar(box, pts, newCount) {
  box.innerHTML = '<canvas class="carcv"></canvas>'; var cv = box.firstChild, t0 = performance.now();
  paintCar(cv, pts, newCount || 0, 0);
  if (newCount > 0) (function tick() { var t = (performance.now() - t0) / 1000; if (!cv.isConnected || t > 3.5) { paintCar(cv, pts, 0); return; } paintCar(cv, pts, newCount, t); requestAnimationFrame(tick); })();
}

/* ---------- ხმა ---------- */
var Snd = (function () {
  var ctx = null, muted = lsGet(MUTE_KEY) === '1', eng = null, engG = null;
  function ensure() {
    if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { ctx = new AC(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, t, dur, type, vol, f1) {
    var c = ensure(); if (!c || muted) return;
    var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + (t || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol || 0.2, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  return {
    unlock: ensure,
    muted: function () { return muted; },
    toggle: function () { muted = !muted; lsSet(MUTE_KEY, muted ? '1' : '0'); if (muted) Snd.engineOff(); return muted; },
    beep: function (hi) { tone(hi ? 880 : 440, 0, hi ? 0.4 : 0.15, 'square', 0.12); },
    crash: function () { tone(160, 0, 0.35, 'sawtooth', 0.28, 40); tone(90, 0, 0.3, 'square', 0.2, 30); },
    pick: function () { tone(660, 0, 0.1, 'triangle', 0.2); tone(990, 0.08, 0.15, 'triangle', 0.2); },
    atk: function () { tone(900, 0, 0.3, 'sawtooth', 0.15, 200); },
    boom: function () { tone(120, 0, 0.5, 'sawtooth', 0.25, 30); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.12, 0.3, 'triangle', 0.22); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, i * 0.2, 0.35, 'triangle', 0.2); }); },
    engine: function (speed, boosting) {
      var c = ensure(); if (!c || muted) return;
      if (!eng) { eng = c.createOscillator(); engG = c.createGain(); eng.type = 'sawtooth'; engG.gain.value = 0.035; eng.connect(engG); engG.connect(c.destination); eng.start(); }
      eng.frequency.setTargetAtTime(60 + speed * 5 + (boosting ? 40 : 0), c.currentTime, 0.1);
    },
    engineOff: function () { if (eng) { try { eng.stop(); } catch (e) {} eng = null; } }
  };
})();
/* ---------- ტრასა (ერთი seed = ერთი და იგივე ტრასა ორივე მოთამაშესთან) ---------- */
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var THEMES = [
  { n: 'ქალაქი', v: 'car', sky: ['#4FB6FF', '#DDF3FF'], g: ['#7BCB62', '#6FC058'], r: ['#4D566B', '#454E63'], ru: ['#ffffff', '#FF4A4A'], far: 'city', fc: '#93AECB', deco: 'house', obs: 'cone' },
  { n: 'მთა', v: 'car', sky: ['#FF9A4D', '#FFE6B5'], g: ['#6FAE48', '#65A340'], r: ['#6B5B4D', '#645547'], ru: ['#ffffff', '#FF8A00'], far: 'peak', fc: '#A27F6E', deco: 'pine', obs: 'rock' },
  { n: 'სანაპირო', v: 'car', sky: ['#2EC8E0', '#FFF1C2'], g: ['#F2D98F', '#EBCF80'], r: ['#5A6678', '#545F70'], ru: ['#ffffff', '#27C6FF'], far: 'hill', fc: '#4FB8B0', deco: 'palm', obs: 'crate' },
  { n: 'უდაბნო', v: 'car', sky: ['#FFB347', '#FFF0C6'], g: ['#EBC273', '#E3B766'], r: ['#8A6D4B', '#826646'], ru: ['#ffffff', '#C0392B'], far: 'hill', fc: '#D9A25F', deco: 'cactus', obs: 'rock' },
  { n: 'თოვლი', v: 'car', sky: ['#8CCBFF', '#FFFFFF'], g: ['#F4FAFF', '#E6F1FB'], r: ['#7C8DA6', '#74859E'], ru: ['#ffffff', '#2E7BFF'], far: 'peak', fc: '#BFD4EA', deco: 'pine', obs: 'ice' },
  { n: 'ტყე', v: 'car', sky: ['#6DD6A0', '#EEFFD0'], g: ['#3FAE5A', '#37A253'], r: ['#48554A', '#424F44'], ru: ['#ffffff', '#FFD23F'], far: 'hill', fc: '#2F8F4E', deco: 'tree', obs: 'log' },
  { n: 'ღამის ქალაქი', v: 'car', sky: ['#120A3D', '#FF5CA8'], g: ['#2A1A5A', '#241650'], r: ['#2A2F4D', '#232744'], ru: ['#26E7FF', '#FF3DB8'], far: 'city', fc: '#22155E', deco: 'tower', obs: 'barrier', night: true },
  { n: 'ცა', v: 'plane', sky: ['#2F7BFF', '#D8EEFF'], g: ['#FFFFFF', '#EEF6FF'], r: ['#8DBBFF', '#82B2F7'], ru: ['#ffffff', '#FFD23F'], far: 'hill', fc: '#CFE5FF', deco: 'cloud', obs: 'storm' },
  { n: 'ჩასვლა', v: 'plane', sky: ['#FF5FA2', '#FFE29A'], g: ['#FFD7E6', '#FFC9DD'], r: ['#FF9FC0', '#F990B5'], ru: ['#ffffff', '#7B5CFF'], far: 'hill', fc: '#FF9CBF', deco: 'cloud', obs: 'bird' }
];
function genTrack(seed) {
  var r = rng(seed), th = THEMES[Math.floor(r() * THEMES.length)], items = [], d = START_D, t, g, a1 = 0.9 + r() * 0.9, a2 = 0.3 + r() * 0.4, p1 = BASE * (3.8 + r() * 2.2), p2 = BASE * (1.7 + r()), f1 = r() * 6.28, f2 = r() * 6.28, far = [], i;
  while (d < L - BASE * 3) {
    t = r();
    if (t < 0.42) {
      if (r() < 0.2) { g = r() * 1.2 - 0.6; items.push({ k: 'ob', d: d, x: g - 0.62, w: 0.3 }, { k: 'ob', d: d, x: g + 0.62, w: 0.3 }); }
      else items.push({ k: 'ob', d: d, x: r() * 1.7 - 0.85, w: 0.2 });
      d += BASE * (1.4 + r() * 1.4);
    } else if (t < 0.72) { items.push({ k: 'nit', d: d, x: r() * 1.6 - 0.8 }); d += BASE * (1.0 + r() * 1.4); }
    else if (t < 0.88) { items.push({ k: 'pad', d: d, x: r() * 1.2 - 0.6, len: BASE * 0.5 }); d += BASE * (1.2 + r() * 1.4); }
    else { items.push({ k: 'atk', d: d, x: r() * 1.6 - 0.8 }); d += BASE * (1.2 + r() * 1.4); }
  }
  for (i = 0; i < 64; i++) far.push(r());
  return { theme: th, items: items, seed: seed, far: far, curve: function (w) { return a1 * Math.sin(w / p1 + f1) + a2 * Math.sin(w / p2 + f2); } };
}

/* ---------- მოძრავი მანქანა (მოთამაშე და კომპიუტერი ერთი და იგივე წესებით) ---------- */
function Runner(x0) { this.d = 0; this.x = x0 || 0; this.vx = 0; this.v = 0; this.nit = 0; this.bk = 0; this.slow = 0; this.charges = 0; this.hit = {}; this.dyn = []; this.fin = false; this.ev = []; this.ptr = 0; this.pad = 0; }
Runner.prototype.step = function (dt, track, axis, drag, gm) {
  var it = track.items, prev = this.d, px = this.x, i, o, tgt, base = BASE * (gm || 1), lim = 0.9;
  this.ev.length = 0;
  if (drag !== null && drag !== undefined) this.x += (drag - this.x) * Math.min(1, dt * 11); else this.x += axis * 2.1 * dt;
  this.x = Math.max(-lim, Math.min(lim, this.x)); this.vx = dt > 0 ? (this.x - px) / dt : 0;
  if (this.slow > 0) { this.slow -= dt; base *= 0.7; }
  if (this.nit > 0 && this.slow <= 0) { this.nit = Math.max(0, this.nit - dt); tgt = 1; } else tgt = 0;
  this.bk += (tgt - this.bk) * Math.min(1, dt * (tgt ? 3.2 : 1.8));
  this.v += (base * (1 + (BOOST_X - 1) * this.bk) - this.v) * Math.min(1, dt * (this.v < base * 0.97 ? 2.4 : 4));
  this.d += this.v * dt;
  while (this.ptr < it.length && it[this.ptr].d + (it[this.ptr].len || 0) < prev - 3) this.ptr++;
  for (i = this.ptr; i < it.length && it[i].d < this.d + 2; i++) {
    o = it[i]; if (this.hit[i]) continue;
    if (o.k === 'pad') { if (this.d >= o.d - 0.5 && prev <= o.d + o.len && Math.abs(this.x - o.x) < 0.42) { this.hit[i] = 1; this.nit = Math.min(NIT_MAX, this.nit + 2.2); this.ev.push('pad'); } continue; }
    if (this.d < o.d - 0.5 || prev > o.d + 1.5) continue;
    if (o.k === 'ob') { if (Math.abs(this.x - o.x) < o.w + 0.2) { this.hit[i] = 1; this.crash(); } }
    else if (Math.abs(this.x - o.x) < 0.32) {
      this.hit[i] = 1;
      if (o.k === 'nit') { this.nit = Math.min(NIT_MAX, this.nit + 4.5); this.ev.push('nit'); } else if (this.charges < 2) { this.charges++; this.ev.push('gun'); } else this.ev.push('gunfull');
    }
  }
  for (i = 0; i < this.dyn.length; i++) { o = this.dyn[i]; if (!o.hit && this.d >= o.d - 0.5 && prev <= o.d + 1.5 && Math.abs(this.x - o.x) < 0.5) { o.hit = 1; this.crash(); } }
  var self = this; this.dyn = this.dyn.filter(function (q) { return q.d > self.d - 25 * MULT; });
  if (this.d >= L) this.fin = true;
};
Runner.prototype.crash = function () { this.slow = 0.8; this.nit = 0; this.v *= 0.42; this.ev.push('crash'); };
/* ამოვარდნილი ბუსტი: ვინც ჩამორჩა, ოდნავ სწრაფდება; ვინც წინაა, ოდნავ ნელდება — რბოლა ახლოს რჩება */
function gapMul(selfD, otherD) {
  var gap = otherD - selfD;
  return gap > 0 ? 1 + Math.min(1, gap / (L * 0.16)) * 0.16 : 1 - Math.min(1, -gap / (L * 0.22)) * 0.06;
}

/* ---------- ქსელი ---------- */
var curSpeed = 1, mode = null, role = null, code = '', ws = null, wsOpen = false, queue = [], session = null, stake = 1, myName = '', names = { a: '', b: '' }, oppOnline = true, retry = 0, retryT = null, closedByUs = false;
function wsUrl() { var u = new URL('ws', location.href); u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'; return u.href; }
function rawSend(m) { try { ws.send(JSON.stringify(m)); } catch (e) {} }
function sendMsg(m) { if (ws && wsOpen) rawSend(m); else if (m.t === 'create' || m.t === 'join') { queue.push(m); connect(); } }
function connect() {
  if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;
  try { ws = new WebSocket(wsUrl()); } catch (e) { return; }
  var mine = ws;
  ws.onopen = function () {
    wsOpen = true; retry = 0; $('banner').hidden = true;
    if (session && !queue.length) rawSend({ t: 'rejoin', code: session.code, role: session.role, token: session.token });
    queue.splice(0).forEach(rawSend);
  };
  ws.onmessage = function (e) { var m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
  ws.onclose = function () {
    if (ws !== mine) return;
    wsOpen = false;
    if (mode === 'online' && session && !closedByUs) { $('banner').hidden = false; $('banner').textContent = 'კავშირი გაწყდა, ვცდილობთ აღდგენას...'; clearTimeout(retryT); retryT = setTimeout(connect, Math.min(5000, 600 * ++retry)); }
  };
  ws.onerror = function () {};
}
function saveSession() { try { sessionStorage.setItem(SESS_KEY, JSON.stringify(session)); } catch (e) {} }
function clearSession() { session = null; try { sessionStorage.removeItem(SESS_KEY); } catch (e) {} }
function onMsg(m) {
  switch (m.t) {
    case 'created': session = { code: m.code, role: m.role, token: m.token, name: myName }; saveSession(); code = m.code; role = m.role; stake = m.stake; curSpeed = m.speed || 1; showWait(); break;
    case 'joined':
      session = { code: m.code, role: m.role, token: m.token, name: myName }; saveSession(); code = m.code; role = m.role; stake = m.stake; curSpeed = m.speed || 1;
      if (stake > points) { toastLobby('ამ ოთახში ' + stake + ' ქულაზე თამაშობენ, შენ კი ' + points + ' გაქვს.'); leaveToLobby(); }
      break;
    case 'rejoined': break;
    case 'start': if (mode === 'online') { stake = m.stake || stake; curSpeed = m.speed || curSpeed; names = m.names; beginRace(m.seed, m.countdown, m.resume); } break;
    case 'opp':
      if (race) {
        var now = performance.now(), dtm = (now - opp.t) / 1000;
        if (dtm > 0.02 && dtm < 1) opp.est = Math.max(0, Math.min(BASE * 3, (m.d - opp.d) / dtm));
        opp.d = m.d; opp.x = Math.max(-1, Math.min(1, +m.x || 0)); opp.b = !!m.b; opp.t = now;
      }
      break;
    case 'atk': if (race && race.state === 'run') { me.dyn.push({ d: me.d + BASE * 3.2, x: me.x, hit: 0 }); flash('⚠ რაკეტა!'); Snd.atk(); } break;
    case 'result': if (race) finishRace(m.winner === role); break;
    case 'peer': oppOnline = m.online; $('banner').hidden = oppOnline; $('banner').textContent = 'მოწინააღმდეგე გათიშულია, ველოდებით...'; break;
    case 'rematch': if (race && race.state === 'done') $('againBtn').textContent = 'მოწინააღმდეგე ელოდება, კიდევ ერთხელ'; break;
    case 'closed': if (mode === 'online') { toastLobby('მოწინააღმდეგე გავიდა.'); leaveToLobby(); } break;
    case 'err': clearSession(); toastLobby(m.code === 'no_room' ? 'ასეთი ოთახი არ მოიძებნა.' : m.code === 'room_full' ? 'ოთახი სავსეა.' : 'სერვერი დაკავებულია.'); leaveToLobby(true); break;
  }
}

/* ---------- ეკრანები ---------- */
function show(id) { ['s-lobby', 's-wait', 's-game', 's-result', 's-garage'].forEach(function (s) { $(s).hidden = (s !== id); }); document.body.style.overflow = id === 's-game' ? 'hidden' : ''; }
function toastLobby(t) { var el = $('invite'); el.hidden = false; el.textContent = t; }
function showWait() { show('s-wait'); $('codeBig').textContent = code; $('waitStake').textContent = 'ფსონი: ' + stake + ' ქულა · ' + SPEEDS[curSpeed].n; }
function leaveToLobby(keep) {
  stopRace(); closedByUs = true; if (ws && wsOpen && !keep) rawSend({ t: 'leave' }); clearSession(); mode = null; closedByUs = false; $('banner').hidden = true; show('s-lobby'); setPoints(points);
}
function shareURL() { return location.origin + location.pathname + '?room=' + code; }

/* ---------- რბოლა ---------- */
var race = null, me = new Runner(-0.45), opp = { d: 0, rd: 0, x: 0.45, rx: 0.45, b: false, t: 0, est: 0 }, bot = null, track = null, keys = { axis: 0, l: 0, r: 0 }, drag = null, raf = 0, lastT = 0, sendT = 0, botT = 0, cv = null, cx = null, W = 0, H = 0, dpr = 1, particles = [], shake = 0, hitFlash = 0, pal = null, FL = 24;

function startX(r) { return r === 'b' ? 0.45 : -0.45; }
function beginRace(seed, countdownMs, resume) {
  stopRace(); setSpeed(curSpeed);
  track = genTrack(seed); pal = buildPal(track.theme);
  me = new Runner(startX(role)); opp = { d: 0, rd: 0, x: -startX(role), rx: -startX(role), b: false, t: performance.now(), est: 0 };
  bot = (mode === 'bot') ? new Runner(-startX(role)) : null; if (bot) bot.ai = { tx: bot.x, miss: 0 };
  race = { state: 'count', t0: performance.now() + countdownMs, lastBeep: 4, doneSent: false, over: false };
  drag = null; keys.l = keys.r = 0; particles = []; shake = 0; hitFlash = 0;
  show('s-game'); resize();
  $('big').className = 'big'; $('toast').textContent = ''; $('timer').textContent = '';
  Snd.unlock();
  lastT = performance.now(); raf = requestAnimationFrame(loop);
}
function stopRace() { cancelAnimationFrame(raf); raf = 0; race = null; Snd.engineOff(); }
function flash(t) { var el = $('toast'); el.textContent = t; clearTimeout(flash.t); flash.t = setTimeout(function () { el.textContent = ''; }, 1100); }
function setBig(t, cls) { var b = $('big'); b.textContent = t; b.className = 'big ' + (cls || ''); void b.offsetWidth; b.className = 'big pop ' + (cls || ''); }

function loop(now) {
  if (!race) return;
  var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (race.state === 'count') {
    var left = (race.t0 - now) / 1000, n = Math.ceil(left);
    if (left <= 0) { race.state = 'run'; setBig('დაიწყო!', 'sm'); setTimeout(function () { if ($('big').textContent === 'დაიწყო!') $('big').textContent = ''; }, 700); Snd.beep(true); }
    else if (n <= 3 && n !== race.lastBeep) { race.lastBeep = n; setBig(String(n)); Snd.beep(false); }
    else if (n > 3 && n !== race.lastBeep) { race.lastBeep = n; $('big').className = 'big sm'; $('big').textContent = 'ტრასა: ' + track.theme.n; }
  }
  if (race.state === 'run') {
    var el = (now - race.t0) / 1000, axis = keys.r - keys.l;
    if (mode === 'bot') { opp.d = opp.rd = bot.d; opp.x = opp.rx = bot.x; opp.b = bot.bk > 0.2; }
    else { opp.rd += (opp.d + opp.est * Math.min(0.25, (now - opp.t) / 1000) - opp.rd) * Math.min(1, dt * 9); opp.rx += (opp.x - opp.rx) * Math.min(1, dt * 10); }
    if (!me.fin) { me.step(dt, track, axis, drag, gapMul(me.d, opp.rd)); me.ev.forEach(onEv); }
    else { me.d += BASE * dt; me.bk *= 0.97; }
    if (bot) { botThink(dt, el); if (!bot.fin) bot.step(dt, track, 0, bot.ai.tx, gapMul(bot.d, me.d)); else bot.d += BASE * dt; bot.ev.length = 0; }
    var gap = (opp.rd - me.d) / BASE;
    $('timer').textContent = (gap > 0 ? '2-ე' : '1-ლი') + ' · ' + Math.floor(el / 60) + ':' + ('0' + Math.floor(el % 60)).slice(-2);
    Snd.engine(me.v / MULT, me.bk > 0.3);
    if (mode === 'online') {
      if (now - sendT > 80) { sendT = now; rawSend({ t: 'pos', d: +me.d.toFixed(1), x: +me.x.toFixed(3), b: me.bk > 0.3 ? 1 : 0, s: 0 }); }
      if (me.fin && !race.doneSent) { race.doneSent = true; rawSend({ t: 'fin' }); setBig('ფინიში!', 'sm'); }
    } else if (!race.over) {
      if (me.fin || bot.fin) { race.over = true; finishRace(me.fin && (!bot.fin || me.d >= bot.d)); }
      else if (el > 120) { race.over = true; finishRace(me.d >= bot.d); }
    }
  }
  $('pMe').style.left = Math.min(100, me.d / L * 100) + '%'; $('pOpp').style.left = Math.min(100, Math.max(0, opp.rd) / L * 100) + '%';
  $('heatBar').style.width = Math.min(100, me.nit / NIT_MAX * 100) + '%';
  var ch = ''; for (var q = 0; q < me.charges; q++) ch += '🚀'; if ($('charges').textContent !== ch) $('charges').textContent = ch;
  shake = Math.max(0, shake - dt * 3); hitFlash = Math.max(0, hitFlash - dt * 2.5);
  draw(now, dt);
  if (race) raf = requestAnimationFrame(loop);
}
function onEv(e) {
  if (e === 'crash') { Snd.crash(); flash('💥'); shake = 1; hitFlash = 1; spark(W / 2 + me.x * W * 0.1, H * 0.75, 26, '#FFD23F', 260); if (navigator.vibrate) try { navigator.vibrate(80); } catch (x) {} }
  else if (e === 'nit') { Snd.pick(); flash('⚡ ნიტრო!'); }
  else if (e === 'pad') { Snd.pick(); flash('🚀 ბუსტი!'); }
  else if (e === 'gun') { Snd.pick(); flash('🎯 რაკეტა +1'); }
}

/* კომპიუტერი: იგივე ტრასა, იგივე წესები, ზოგჯერ ცდება */
function botThink(dt, el) {
  botT -= dt; if (botT > 0) return; botT = 0.1;
  var b = bot, it = track.items, ai = b.ai, i, o, best = null, bd = 1e9, w = 34 * MULT, danger = null;
  if (ai.miss > 0) { ai.miss -= 0.1; return; }
  for (i = b.ptr; i < it.length && it[i].d < b.d + w; i++) {
    o = it[i]; if (b.hit[i] || it[i].d < b.d + 2) continue;
    if (o.k === 'ob' && Math.abs(o.x - b.x) < o.w + 0.32 && o.d - b.d < bd) { danger = o; bd = o.d - b.d; }
  }
  b.dyn.forEach(function (q) { if (!q.hit && q.d > b.d + 2 && q.d < b.d + w && Math.abs(q.x - b.x) < 0.7 && q.d - b.d < bd) { danger = { x: q.x, w: 0.3 }; bd = q.d - b.d; } });
  if (danger) {
    if (Math.random() < 0.1) { ai.miss = 0.5; return; }
    var left = danger.x - danger.w - 0.35, right = danger.x + danger.w + 0.35;
    var c1 = left >= -0.88 ? left : null, c2 = right <= 0.88 ? right : null;
    ai.tx = c1 === null ? c2 : c2 === null ? c1 : (Math.abs(c1 - b.x) < Math.abs(c2 - b.x) ? c1 : c2);
    if (ai.tx === null) ai.tx = b.x;
  } else {
    for (i = b.ptr; i < it.length && it[i].d < b.d + w * 0.8; i++) {
      o = it[i]; if (b.hit[i] || o.d < b.d + 3 || o.k === 'ob') continue;
      if (Math.abs(o.x - b.x) < 0.8 && o.d - b.d < bd) {
        var blocked = false, j; for (j = i; j < it.length && it[j].d < o.d + 1; j++) if (it[j].k === 'ob' && Math.abs(it[j].x - o.x) < it[j].w + 0.35) blocked = true;
        if (!blocked) { best = o; bd = o.d - b.d; }
      }
    }
    if (best && Math.random() < 0.75) ai.tx = best.x;
  }
  if (b.charges > 0 && el > 3 && Math.random() < 0.05) { b.charges--; me.dyn.push({ d: me.d + BASE * 3.2, x: me.x, hit: 0 }); flash('⚠ რაკეტა!'); Snd.atk(); }
}

function finishRace(won) {
  if (!race || race.state === 'done') return;
  race.state = 'done'; Snd.engineOff();
  var before = points;
  setPoints(won ? before + stake : before - stake);
  var gained = won ? points - before : before - points;
  setTimeout(function () {
    if (!race) return;
    show('s-result');
    $('resTitle').textContent = won ? '🏆 გაიმარჯვე!' : 'წააგე';
    $('resSub').textContent = won ? 'მანქანაზე ' + (gained / PER_CELL < 1 ? 'ახალი უჯრები' : Math.round(gained / PER_CELL) + ' უჯრა') + ' შეიღება.' : 'შემდეგჯერ აუცილებლად გამოგივა.';
    showCar($('resCar'), points, won ? Math.max(1, Math.round(gained / PER_CELL)) : 0);
    var full = points >= TOTAL, broke = points <= 0;
    $('resPts').textContent = (won ? '+' : '−') + gained + ' ქულა · სულ ' + points + ' / ' + TOTAL + ' (' + carPct(points) + ')' + (full ? ' · მანქანა მზადაა!' : '');
    $('againBtn').textContent = broke ? 'ახლიდან დაწყება (10 ქულა)' : 'კიდევ ერთხელ';
    $('againBtn').dataset.broke = broke ? '1' : '';
    if (full) { $('resSub').textContent = PRIZE_TEXT; }
    won ? Snd.win() : Snd.lose();
  }, 900);
  setBig(won ? '🏆' : '😬', '');
}

/* ---------- ხატვა: ფსევდო-3D, პერსპექტივით ---------- */
function resize() {
  cv = $('cv'); cx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  W = cv.clientWidth || window.innerWidth; H = cv.clientHeight || window.innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
}
window.addEventListener('resize', function () { if (race) resize(); });
function buildPal(th) {
  var p = { g1: [], g2: [], r1: [], r2: [], u1: [], u2: [], ln: [] }, f = th.sky[1], i, t;
  for (i = 0; i < FL; i++) {
    t = Math.pow(i / (FL - 1), 1.35) * 0.96;
    p.g1.push(mix(th.g[0], f, t)); p.g2.push(mix(th.g[1], f, t)); p.r1.push(mix(th.r[0], f, t)); p.r2.push(mix(th.r[1], f, t));
    p.u1.push(mix(th.ru[0], f, t)); p.u2.push(mix(th.ru[1], f, t)); p.ln.push(mix('#ffffff', f, t));
  }
  return p;
}
function hf(i) { var x = Math.sin(i * 127.1 + track.seed * 0.013) * 43758.5453; return x - Math.floor(x); }
function ell(x, y, rx, ry) { cx.beginPath(); cx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 6.2832); cx.fill(); }
function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
function glow(x, y, r, c, a) {
  var g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
  cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha *= a; cx.fillStyle = g; cx.fillRect(x - r, y - r, r * 2, r * 2); cx.restore();
}
function spark(x, y, n, col, spd) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = Math.random() * spd; particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.2, l: 0, m: 0.4 + Math.random() * 0.4, c: col, r: 1.5 + Math.random() * 2.5 }); } }

function draw(now, dt) {
  var th = track.theme, hy = H * 0.36, yb = H * 0.79, RWp = Math.min(W * 0.36, H * 0.42) * (1 + me.bk * 0.06), camX = me.x * 0.6, DRAWD = ZC * 14, c0 = track.curve(me.d), i, y, s, dz, wd, alt, lvl, f, cxr, half, g, k, list = [], o;
  var amp = shake * 7 + me.bk * 1.6, ox = (Math.random() - 0.5) * amp, oy = (Math.random() - 0.5) * amp;
  function co(z) { return track.curve(me.d + z) - c0; }
  cx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr);
  /* ცა */
  g = cx.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); cx.fillStyle = g; cx.fillRect(-14, -14, W + 28, hy + 16);
  var par = -c0 * W * 0.14;
  if (th.night) { cx.fillStyle = '#fff'; for (i = 0; i < 46; i++) { cx.globalAlpha = 0.35 + hf(i + 9) * 0.6; cx.fillRect(((hf(i) * W * 1.6 + par * 0.3) % (W + 20) + W + 20) % (W + 20) - 10, hf(i + 50) * hy * 0.8, 1.6, 1.6); } cx.globalAlpha = 1; }
  var sxn = W * (0.2 + 0.6 * hf(3)) + par * 0.5, syn = hy - H * 0.13;
  glow(sxn, syn, H * 0.22, th.night ? 'rgba(255,140,220,.8)' : 'rgba(255,240,180,.95)', 1);
  cx.fillStyle = th.night ? '#FFE6F6' : '#FFF8D6'; ell(sxn, syn, H * 0.045, H * 0.045);
  drawFar(hy, par, th);
  g = cx.createLinearGradient(0, hy - H * 0.1, 0, hy + 2); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, th.sky[1]); cx.fillStyle = g; cx.fillRect(-14, hy - H * 0.1, W + 28, H * 0.1 + 2);
  /* მიწა და გზა */
  for (y = Math.floor(hy) + 1; y < H + 14; y += 2) {
    s = (y - hy) / (yb - hy); dz = ZC * (1 / s - 1); wd = me.d + dz;
    alt = (((Math.floor(wd / STRIPE) % 2) + 2) % 2); f = Math.max(0, dz) / DRAWD; lvl = Math.min(FL - 1, (f * FL) | 0);
    cxr = W / 2 + (co(dz) - camX) * RWp * s; half = RWp * s;
    cx.fillStyle = alt ? pal.g1[lvl] : pal.g2[lvl]; cx.fillRect(-14, y, W + 28, 2.5);
    cx.fillStyle = alt ? pal.u1[lvl] : pal.u2[lvl]; cx.fillRect(cxr - half * 1.14, y, half * 2.28, 2.5);
    cx.fillStyle = alt ? pal.r1[lvl] : pal.r2[lvl]; cx.fillRect(cxr - half, y, half * 2, 2.5);
    cx.fillStyle = pal.ln[lvl];
    cx.fillRect(cxr - half * 0.955, y, half * 0.03, 2.5); cx.fillRect(cxr + half * 0.925, y, half * 0.03, 2.5);
    if (alt) { cx.fillRect(cxr - half * 0.34, y, half * 0.025, 2.5); cx.fillRect(cxr + half * 0.315, y, half * 0.025, 2.5); }
  }
  if (th.night) { /* ნეონის ნათება გზის კიდეებზე */
    cx.save(); cx.globalCompositeOperation = 'lighter'; cx.lineWidth = 6; cx.globalAlpha = 0.35;
    [-1, 1].forEach(function (sd, n) { cx.strokeStyle = th.ru[n]; cx.beginPath(); for (var yy = hy + 6; yy < H; yy += 8) { var ss = (yy - hy) / (yb - hy), dd = ZC * (1 / ss - 1), xx = W / 2 + (co(dd) - camX + sd * 1.1) * RWp * ss; if (yy === hy + 6) cx.moveTo(xx, yy); else cx.lineTo(xx, yy); } cx.stroke(); });
    cx.restore();
  }
  /* ობიექტების შეგროვება */
  var its = track.items, st = Math.max(0, me.ptr - 2);
  for (i = st; i < its.length; i++) { o = its[i]; dz = o.d - me.d; if (dz > DRAWD) break; if (dz < -ZC * 0.6 && !(o.len && dz + o.len > 0)) continue; if (me.hit[i] && o.k !== 'pad') continue; list.push({ dz: dz, t: 'i', o: o, i: i }); }
  var DS = BASE * 0.5, k0 = Math.floor((me.d - 4) / DS);
  for (k = k0; k * DS - me.d < DRAWD; k++) for (i = 0; i < 2; i++) { dz = k * DS - me.d; if (dz < -ZC * 0.6) continue; list.push({ dz: dz, t: 'd', x: (i ? 1 : -1) * (1.55 + hf(k * 2 + i) * 1.7), k: k * 2 + i }); }
  me.dyn.forEach(function (q) { if (!q.hit) list.push({ dz: q.d - me.d, t: 'm', o: q }); });
  if (bot) bot.dyn.forEach(function (q) { if (!q.hit) list.push({ dz: q.d - me.d, t: 'm', o: q }); });
  dz = opp.rd - me.d; if (dz > -6 && dz < DRAWD) list.push({ dz: dz, t: 'v', x: opp.rx, who: opp });
  list.push({ dz: 0, t: 'v', x: me.x, who: me, mine: true });
  list.sort(function (a, b) { return b.dz - a.dz; });
  list.forEach(function (e) {
    var z = e.dz; if (z + ZC < 1) return;
    s = ZC / (z + ZC); var py = hy + (yb - hy) * s, u = RWp * s, px = W / 2 + ((e.x !== undefined ? e.x : (e.o ? e.o.x : 0)) - camX + co(z)) * RWp * s;
    cx.globalAlpha = 1 - Math.min(0.96, Math.pow(Math.max(0, z) / DRAWD, 1.7));
    if (u < 1.5) return;
    if (e.t === 'd') deco(th.deco, px, py, u, e.k, th);
    else if (e.t === 'i') {
      if (e.o.k === 'ob') obstacle(th.obs, px, py, e.o.w * u, u, e.i);
      else if (e.o.k === 'pad') padDraw(e.o, z, co, hy, yb, RWp, now);
      else orb(e.o.k, px, py, u, now, e.i);
    } else if (e.t === 'm') mine(px, py, u, now);
    else if (e.t === 'v') {
      var lean = e.who === me ? -me.vx * 0.5 : -(opp.x - opp.rx) * 3;
      vehicle(px, py, u, { col: e.mine ? '#FF3B2E' : '#2E8BFF', plane: th.v === 'plane', bk: e.mine ? me.bk : (opp.b ? 0.9 : 0), lean: Math.max(-1, Math.min(1, lean)), slow: e.mine && me.slow > 0, now: now, mine: e.mine });
      if (e.mine && me.bk > 0.15) for (var q = 0; q < 2; q++) particles.push({ x: px + (q ? 1 : -1) * u * 0.14, y: py - u * 0.07, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 90, l: 0, m: 0.35, c: Math.random() < 0.5 ? '#7FE3FF' : '#FFB347', r: 2 + Math.random() * 3 });
    }
  });
  cx.globalAlpha = 1;
  /* ნაწილაკები */
  cx.save(); cx.globalCompositeOperation = 'lighter';
  particles = particles.filter(function (p) { p.l += dt; return p.l < p.m; });
  particles.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; cx.globalAlpha = 1 - p.l / p.m; cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.28); cx.fill(); });
  cx.restore(); cx.globalAlpha = 1;
  /* სიჩქარის ხაზები */
  var sp = Math.min(1, me.v / (BASE * 1.3)), la = 0.1 + me.bk * 0.5;
  if (sp > 0.3) { cx.save(); cx.strokeStyle = 'rgba(255,255,255,' + la.toFixed(2) + ')'; cx.lineWidth = 1.6; cx.beginPath(); var nl = 8 + Math.round(me.bk * 26); for (i = 0; i < nl; i++) { var a = Math.random() * 6.28, r1 = H * (0.25 + Math.random() * 0.2), r2 = r1 + H * (0.08 + Math.random() * 0.18) * (0.5 + me.bk); cx.moveTo(W / 2 + Math.cos(a) * r1 * 1.1, hy + 20 + Math.sin(a) * r1); cx.lineTo(W / 2 + Math.cos(a) * r2 * 1.1, hy + 20 + Math.sin(a) * r2); } cx.stroke(); cx.restore(); }
  /* სწრაფი მოძრაობის ბუნდოვანება ბუსტზე */
  if (me.bk > 0.2) { cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 0.2 * me.bk; var zz = 1 + 0.045 * me.bk; cx.drawImage(cv, -(cv.width * (zz - 1)) / 2, -(cv.height * (zz - 1)) / 2 - cv.height * 0.02, cv.width * zz, cv.height * zz); cx.restore(); cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  /* ვინიეტი და დარტყმის წითელი */
  g = cx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.85); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,10,40,' + (0.35 + me.bk * 0.25).toFixed(2) + ')'); cx.fillStyle = g; cx.fillRect(-14, -14, W + 28, H + 28);
  if (hitFlash > 0) { cx.fillStyle = 'rgba(255,40,40,' + (hitFlash * 0.35).toFixed(2) + ')'; cx.fillRect(-14, -14, W + 28, H + 28); }
  /* სხვაობა მოწინააღმდეგესთან */
  if (race && race.state === 'run') {
    var gp = (opp.rd - me.d) / BASE, txt = Math.abs(gp) < 0.12 ? 'ერთად!' : gp > 0 ? 'მოწინააღმდეგე წინ · ' + gp.toFixed(1) + ' წმ' : 'შენ წინ ხარ · ' + (-gp).toFixed(1) + ' წმ';
    cx.font = '800 14px "Noto Sans Georgian",sans-serif'; cx.textAlign = 'center'; var tw = cx.measureText(txt).width + 24;
    cx.fillStyle = Math.abs(gp) < 0.12 ? '#FFD23Fdd' : gp > 0 ? '#FF3B5Cdd' : '#1FBF6Fdd'; rr(W / 2 - tw / 2, H * 0.17, tw, 26, 13); cx.fill();
    cx.fillStyle = Math.abs(gp) < 0.12 ? '#2A1A00' : '#fff'; cx.fillText(txt, W / 2, H * 0.17 + 18);
  }
}
function drawFar(hy, off, th) {
  var N = 64, span = W * 1.9, cw = span / N, base = hy + 1, i, k, x, h, bh, wy;
  cx.fillStyle = th.fc;
  for (k = -1; k <= 1; k++) for (i = 0; i < N; i++) {
    x = i * cw + (off % span) + k * span; if (x > W + cw * 3 || x < -cw * 3) continue; h = track.far[i];
    if (th.far === 'city') {
      bh = H * (0.03 + 0.12 * h); cx.fillStyle = th.fc; cx.fillRect(x, base - bh, cw * 0.92, bh);
      if (th.night) { cx.fillStyle = '#FFD86B'; for (wy = base - bh + 4; wy < base - 4; wy += 7) if (((i * 7 + Math.floor(wy)) % 3) === 0) cx.fillRect(x + cw * 0.2, wy, 2.5, 2.5); }
    } else if (th.far === 'peak') {
      bh = H * (0.07 + 0.15 * h); cx.fillStyle = th.fc; cx.beginPath(); cx.moveTo(x - cw * 1.6, base); cx.lineTo(x + cw * 0.5, base - bh); cx.lineTo(x + cw * 2.6, base); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.moveTo(x + cw * 0.5, base - bh); cx.lineTo(x + cw * 0.05, base - bh * 0.72); cx.lineTo(x + cw * 0.95, base - bh * 0.72); cx.fill();
    } else { bh = H * (0.02 + 0.06 * h); cx.fillStyle = th.fc; cx.beginPath(); cx.ellipse(x + cw / 2, base, cw * 2, bh, 0, Math.PI, 0); cx.fill(); }
  }
}

/* ---- ობიექტები გზის გასწვრივ ---- */
function deco(kind, x, y, u, k, th) {
  var r = hf(k + 77), r2 = hf(k + 31), night = th.night;
  cx.fillStyle = 'rgba(0,0,0,.2)'; ell(x, y, u * 0.35, u * 0.07);
  if (kind === 'house' || kind === 'tower') {
    var w = u * (0.7 + r * 0.5), h = u * (kind === 'tower' ? 2.2 + r2 * 2.2 : 0.9 + r2 * 1.2), cols = night ? ['#3A2A7A', '#2B2060', '#4A2E8A'] : ['#F5E1C8', '#CFE0F5', '#F7C6C6', '#E5F2CF'], c = cols[Math.floor(r * cols.length)], gg;
    gg = cx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gg.addColorStop(0, tint(c, 0.15)); gg.addColorStop(1, tint(c, -0.25)); cx.fillStyle = gg; cx.fillRect(x - w / 2, y - h, w, h);
    cx.fillStyle = night ? '#FFD86B' : '#5B7FA8'; var nx = 3, ny = Math.max(2, Math.floor(h / (u * 0.3))); for (var a = 0; a < nx; a++) for (var b = 0; b < ny; b++) if (!night || ((a * 5 + b * 3 + k) % 3) !== 0) cx.fillRect(x - w / 2 + w * (0.12 + a * 0.3), y - h + u * 0.12 + b * u * 0.3, w * 0.16, u * 0.14);
    if (kind === 'house') { cx.fillStyle = '#C9503A'; cx.beginPath(); cx.moveTo(x - w * 0.6, y - h); cx.lineTo(x, y - h - u * 0.45); cx.lineTo(x + w * 0.6, y - h); cx.fill(); }
    else if (night) { cx.save(); cx.globalCompositeOperation = 'lighter'; cx.fillStyle = r < 0.5 ? '#26E7FF' : '#FF3DB8'; cx.globalAlpha *= 0.8; cx.fillRect(x - w / 2, y - h, w, u * 0.07); cx.restore(); }
  } else if (kind === 'pine') {
    cx.fillStyle = '#5A3A22'; cx.fillRect(x - u * 0.04, y - u * 0.3, u * 0.08, u * 0.3);
    for (var t = 0; t < 3; t++) { cx.fillStyle = tint('#1F7A45', t * 0.12 - 0.1); cx.beginPath(); cx.moveTo(x - u * (0.42 - t * 0.08), y - u * (0.25 + t * 0.42)); cx.lineTo(x, y - u * (0.95 + t * 0.42)); cx.lineTo(x + u * (0.42 - t * 0.08), y - u * (0.25 + t * 0.42)); cx.fill(); }
    if (th.n === 'თოვლი') { cx.fillStyle = '#fff'; cx.beginPath(); cx.moveTo(x - u * 0.12, y - u * 1.55); cx.lineTo(x, y - u * 1.79); cx.lineTo(x + u * 0.12, y - u * 1.55); cx.fill(); }
  } else if (kind === 'tree') {
    cx.fillStyle = '#6B4423'; cx.fillRect(x - u * 0.06, y - u * 0.7, u * 0.12, u * 0.7);
    var gt = cx.createRadialGradient(x - u * 0.15, y - u * 1.15, u * 0.05, x, y - u * 1.0, u * 0.6); gt.addColorStop(0, '#6EE08A'); gt.addColorStop(1, '#1E8A46'); cx.fillStyle = gt; ell(x, y - u * 1.0, u * 0.5, u * 0.48); ell(x - u * 0.28, y - u * 0.8, u * 0.3, u * 0.28); ell(x + u * 0.28, y - u * 0.8, u * 0.3, u * 0.28);
  } else if (kind === 'palm') {
    cx.strokeStyle = '#8A5A2B'; cx.lineWidth = u * 0.09; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + u * 0.2 * (r - 0.5) * 2, y - u * 0.8, x + u * 0.1, y - u * 1.5); cx.stroke();
    cx.strokeStyle = '#2FB560'; cx.lineWidth = u * 0.07; for (var l = 0; l < 6; l++) { var an = l * 1.05 - 0.2; cx.beginPath(); cx.moveTo(x + u * 0.1, y - u * 1.5); cx.quadraticCurveTo(x + u * 0.1 + Math.cos(an) * u * 0.4, y - u * 1.75, x + u * 0.1 + Math.cos(an) * u * 0.75, y - u * 1.4 + Math.sin(an) * u * 0.25); cx.stroke(); }
  } else if (kind === 'cactus') {
    cx.fillStyle = '#3E9B4F'; rr(x - u * 0.09, y - u * 1.0, u * 0.18, u * 1.0, u * 0.09); cx.fill(); rr(x - u * 0.3, y - u * 0.7, u * 0.14, u * 0.4, u * 0.07); cx.fill(); rr(x + u * 0.16, y - u * 0.8, u * 0.14, u * 0.45, u * 0.07); cx.fill();
  } else if (kind === 'cloud') {
    var cy = y - u * (1.1 + r * 1.6), cw = u * (0.8 + r2 * 0.7); cx.fillStyle = 'rgba(255,255,255,.92)'; ell(x, cy, cw * 0.6, cw * 0.22); ell(x - cw * 0.3, cy + cw * 0.04, cw * 0.38, cw * 0.18); ell(x + cw * 0.32, cy + cw * 0.05, cw * 0.4, cw * 0.17); ell(x + cw * 0.05, cy - cw * 0.12, cw * 0.3, cw * 0.16);
  }
}
function obstacle(kind, x, y, hw, u, idx) {
  var w = Math.max(hw, u * 0.12), g;
  cx.fillStyle = 'rgba(0,0,0,.28)'; ell(x, y, w * 1.1, w * 0.22);
  if (kind === 'cone') {
    var n = Math.max(1, Math.round(w / (u * 0.17)));
    for (var q = 0; q < n; q++) { var cxp = x + (n === 1 ? 0 : (q / (n - 1) - 0.5) * w * 1.6), cw = u * 0.15, ch = u * 0.4; g = cx.createLinearGradient(cxp - cw, 0, cxp + cw, 0); g.addColorStop(0, '#FF9A3D'); g.addColorStop(0.5, '#FF6A00'); g.addColorStop(1, '#C94A00'); cx.fillStyle = '#222'; rr(cxp - cw * 1.2, y - cw * 0.3, cw * 2.4, cw * 0.35, 3); cx.fill(); cx.fillStyle = g; cx.beginPath(); cx.moveTo(cxp - cw, y - cw * 0.25); cx.lineTo(cxp - cw * 0.12, y - ch); cx.lineTo(cxp + cw * 0.12, y - ch); cx.lineTo(cxp + cw, y - cw * 0.25); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.moveTo(cxp - cw * 0.62, y - ch * 0.42); cx.lineTo(cxp + cw * 0.62, y - ch * 0.42); cx.lineTo(cxp + cw * 0.4, y - ch * 0.6); cx.lineTo(cxp - cw * 0.4, y - ch * 0.6); cx.fill(); }
  } else if (kind === 'rock') {
    g = cx.createLinearGradient(x - w, y - w * 1.6, x + w, y); g.addColorStop(0, '#B9B3AA'); g.addColorStop(1, '#5E5851'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(x - w * 1.05, y); cx.lineTo(x - w * 0.9, y - w * 0.8); cx.lineTo(x - w * 0.3, y - w * 1.45); cx.lineTo(x + w * 0.35, y - w * 1.3); cx.lineTo(x + w * 1.0, y - w * 0.7); cx.lineTo(x + w * 1.05, y); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.25)'; cx.beginPath(); cx.moveTo(x - w * 0.3, y - w * 1.45); cx.lineTo(x + w * 0.35, y - w * 1.3); cx.lineTo(x, y - w * 0.8); cx.fill();
  } else if (kind === 'crate') {
    var bw = w * 1.5, bh = w * 1.4; g = cx.createLinearGradient(0, y - bh, 0, y); g.addColorStop(0, '#D9A05B'); g.addColorStop(1, '#9A6A32'); cx.fillStyle = g; cx.fillRect(x - bw / 2, y - bh, bw, bh); cx.strokeStyle = '#6B4520'; cx.lineWidth = Math.max(1, w * 0.1); cx.strokeRect(x - bw / 2, y - bh, bw, bh); cx.beginPath(); cx.moveTo(x - bw / 2, y - bh); cx.lineTo(x + bw / 2, y); cx.moveTo(x + bw / 2, y - bh); cx.lineTo(x - bw / 2, y); cx.stroke();
  } else if (kind === 'log') {
    var lh = w * 0.7; g = cx.createLinearGradient(0, y - lh * 2, 0, y); g.addColorStop(0, '#B07A45'); g.addColorStop(1, '#6B4423'); cx.fillStyle = g; rr(x - w * 1.1, y - lh * 1.7, w * 2.2, lh * 1.7, lh * 0.6); cx.fill(); cx.fillStyle = '#E9C99A'; ell(x + w * 1.05, y - lh * 0.85, lh * 0.35, lh * 0.85);
  } else if (kind === 'ice') {
    for (var m = 0; m < 3; m++) { var ix = x + (m - 1) * w * 0.6, ih = w * (1.3 + (m === 1 ? 0.7 : 0)); g = cx.createLinearGradient(ix - w * 0.4, y - ih, ix + w * 0.4, y); g.addColorStop(0, 'rgba(235,252,255,.95)'); g.addColorStop(1, 'rgba(90,190,255,.85)'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(ix - w * 0.45, y); cx.lineTo(ix - w * 0.1, y - ih); cx.lineTo(ix + w * 0.45, y); cx.fill(); }
  } else if (kind === 'barrier') {
    var bh2 = w * 0.9; cx.fillStyle = '#EDEDED'; cx.fillRect(x - w * 1.1, y - bh2, w * 2.2, bh2); cx.fillStyle = '#FF2D6F'; for (var s2 = 0; s2 < 4; s2++) cx.fillRect(x - w * 1.1 + s2 * w * 0.55 + w * 0.1, y - bh2, w * 0.28, bh2); glow(x, y - bh2 / 2, w * 1.6, 'rgba(255,50,120,.8)', 0.6);
  } else if (kind === 'storm') {
    var cy2 = y - w * 1.2; cx.fillStyle = '#3B4466'; ell(x, cy2, w * 1.2, w * 0.55); ell(x - w * 0.6, cy2 + w * 0.1, w * 0.7, w * 0.4); ell(x + w * 0.6, cy2 + w * 0.1, w * 0.7, w * 0.4); cx.fillStyle = '#FFE95A'; cx.beginPath(); cx.moveTo(x - w * 0.1, cy2 + w * 0.3); cx.lineTo(x + w * 0.25, cy2 + w * 0.3); cx.lineTo(x, cy2 + w * 0.8); cx.lineTo(x + w * 0.2, cy2 + w * 0.8); cx.lineTo(x - w * 0.2, cy2 + w * 1.4); cx.lineTo(x - w * 0.05, cy2 + w * 0.9); cx.lineTo(x - w * 0.25, cy2 + w * 0.9); cx.fill(); glow(x, cy2 + w * 0.8, w, 'rgba(255,240,120,.7)', 0.7);
  } else {
    var by = y - w * 1.3 + Math.sin(idx + performance.now() / 150) * w * 0.15; cx.strokeStyle = '#2A2A3A'; cx.lineWidth = Math.max(2, w * 0.18); cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x - w * 1.0, by - w * 0.3); cx.quadraticCurveTo(x - w * 0.5, by - w * 0.6, x, by); cx.quadraticCurveTo(x + w * 0.5, by - w * 0.6, x + w * 1.0, by - w * 0.3); cx.stroke(); cx.fillStyle = '#FF5A3C'; ell(x, by + w * 0.05, w * 0.28, w * 0.22);
  }
}
function orb(kind, x, y, u, now, idx) {
  var r = u * 0.17, by = y - r * 1.9 + Math.sin(now / 220 + idx) * r * 0.25, c1 = kind === 'nit' ? ['#B8F4FF', '#27C6FF', '#1E4BFF'] : ['#FFE2B8', '#FF7A3C', '#C41E3A'], g;
  cx.fillStyle = 'rgba(0,0,0,.25)'; ell(x, y, r * 0.9, r * 0.22);
  glow(x, by, r * 3.2, kind === 'nit' ? 'rgba(60,200,255,.9)' : 'rgba(255,90,60,.9)', 0.9);
  g = cx.createRadialGradient(x - r * 0.3, by - r * 0.3, r * 0.1, x, by, r); g.addColorStop(0, c1[0]); g.addColorStop(0.5, c1[1]); g.addColorStop(1, c1[2]); cx.fillStyle = g; ell(x, by, r, r);
  cx.strokeStyle = 'rgba(255,255,255,.8)'; cx.lineWidth = Math.max(1, r * 0.1); cx.beginPath(); cx.arc(x, by, r, 0, 6.28); cx.stroke();
  cx.fillStyle = '#fff'; cx.beginPath();
  if (kind === 'nit') { cx.moveTo(x + r * 0.15, by - r * 0.7); cx.lineTo(x - r * 0.4, by + r * 0.12); cx.lineTo(x - r * 0.02, by + r * 0.12); cx.lineTo(x - r * 0.18, by + r * 0.72); cx.lineTo(x + r * 0.42, by - r * 0.15); cx.lineTo(x + r * 0.04, by - r * 0.15); }
  else { cx.moveTo(x, by - r * 0.7); cx.lineTo(x + r * 0.3, by + r * 0.1); cx.lineTo(x + r * 0.15, by + r * 0.1); cx.lineTo(x + r * 0.15, by + r * 0.6); cx.lineTo(x - r * 0.15, by + r * 0.6); cx.lineTo(x - r * 0.15, by + r * 0.1); cx.lineTo(x - r * 0.3, by + r * 0.1); }
  cx.fill();
}
function mine(x, y, u, now) {
  var r = u * 0.2; cx.fillStyle = 'rgba(0,0,0,.3)'; ell(x, y, r * 1.1, r * 0.25); glow(x, y - r * 0.8, r * 2.4, 'rgba(255,40,60,.8)', 0.8 + 0.2 * Math.sin(now / 90));
  var g = cx.createRadialGradient(x - r * 0.3, y - r * 1.1, r * 0.1, x, y - r * 0.8, r); g.addColorStop(0, '#FF8A8A'); g.addColorStop(1, '#8E0B22'); cx.fillStyle = g; cx.strokeStyle = '#2A0A12'; cx.lineWidth = Math.max(1, r * 0.12);
  for (var i = 0; i < 8; i++) { var a = i * 0.785; cx.beginPath(); cx.moveTo(x + Math.cos(a) * r * 0.8, y - r * 0.8 + Math.sin(a) * r * 0.8); cx.lineTo(x + Math.cos(a) * r * 1.3, y - r * 0.8 + Math.sin(a) * r * 1.3); cx.stroke(); }
  ell(x, y - r * 0.8, r, r); cx.fillStyle = '#fff'; cx.font = '900 ' + Math.round(r * 1.2) + 'px sans-serif'; cx.textAlign = 'center'; cx.fillText('!', x, y - r * 0.4);
}
function padDraw(o, dz, co, hy, yb, RWp, now) {
  var z1 = dz + o.len, s0 = ZC / (Math.max(dz, -ZC * 0.9) + ZC), s1 = ZC / (z1 + ZC), y0 = hy + (yb - hy) * s0, y1 = hy + (yb - hy) * s1, pw = 0.42, camX = me.x * 0.6;
  var xa = W / 2 + (o.x - camX + co(dz)) * RWp * s0, xb = W / 2 + (o.x - camX + co(z1)) * RWp * s1, w0 = pw * RWp * s0, w1 = pw * RWp * s1, g = cx.createLinearGradient(0, y1, 0, y0);
  g.addColorStop(0, '#FFE95A'); g.addColorStop(1, '#FF8A00'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(xa - w0, y0); cx.lineTo(xa + w0, y0); cx.lineTo(xb + w1, y1); cx.lineTo(xb - w1, y1); cx.fill();
  glow((xa + xb) / 2, (y0 + y1) / 2, w0 * 2.2, 'rgba(255,200,40,.9)', 0.6 + 0.3 * Math.sin(now / 120));
  cx.strokeStyle = '#7A3A00'; cx.lineWidth = Math.max(1, w0 * 0.12); for (var i = 0; i < 3; i++) { var t = (i + 0.5) / 3, yy = y0 + (y1 - y0) * t, xx = xa + (xb - xa) * t, ww = w0 + (w1 - w0) * t; cx.beginPath(); cx.moveTo(xx - ww * 0.6, yy + (y0 - y1) * 0.1 * -1); cx.lineTo(xx, yy - Math.abs(y0 - y1) * 0.12); cx.lineTo(xx + ww * 0.6, yy + (y0 - y1) * 0.1 * -1); cx.stroke(); }
}

/* ---- მანქანა/თვითმფრინავი უკნიდან ---- */
function vehicle(x, y, u, o) {
  var w = u * 0.56, h = w * 0.62, col = o.col, g, bk = o.bk || 0;
  cx.save(); cx.translate(x, y);
  if (o.plane) {
    var fy = -u * 0.38; cx.fillStyle = 'rgba(0,0,0,.28)'; ell(0, 0, w * 0.95, w * 0.12);
    cx.translate(0, fy); cx.rotate(o.lean * 0.18);
    g = cx.createLinearGradient(0, -h * 0.3, 0, h * 0.2); g.addColorStop(0, tint(col, 0.35)); g.addColorStop(1, tint(col, -0.35)); cx.fillStyle = g;
    cx.beginPath(); cx.moveTo(-w * 1.05, h * 0.05); cx.lineTo(-w * 0.12, -h * 0.28); cx.lineTo(w * 0.12, -h * 0.28); cx.lineTo(w * 1.05, h * 0.05); cx.lineTo(w * 0.12, h * 0.2); cx.lineTo(-w * 0.12, h * 0.2); cx.fill();
    cx.fillStyle = tint(col, -0.25); cx.beginPath(); cx.moveTo(-w * 0.32, -h * 0.05); cx.lineTo(-w * 0.5, -h * 0.5); cx.lineTo(-w * 0.2, -h * 0.05); cx.fill(); cx.beginPath(); cx.moveTo(w * 0.32, -h * 0.05); cx.lineTo(w * 0.5, -h * 0.5); cx.lineTo(w * 0.2, -h * 0.05); cx.fill();
    g = cx.createLinearGradient(-w * 0.25, 0, w * 0.25, 0); g.addColorStop(0, tint(col, 0.1)); g.addColorStop(0.5, tint(col, 0.5)); g.addColorStop(1, tint(col, -0.3)); cx.fillStyle = g; rr(-w * 0.18, -h * 0.8, w * 0.36, h * 1.15, w * 0.18); cx.fill();
    cx.fillStyle = '#16233f'; rr(-w * 0.1, -h * 0.72, w * 0.2, h * 0.3, w * 0.1); cx.fill();
    cx.fillStyle = tint(col, -0.1); cx.beginPath(); cx.moveTo(-w * 0.04, -h * 0.5); cx.lineTo(0, -h * 1.15); cx.lineTo(w * 0.04, -h * 0.5); cx.fill();
    glow(0, h * 0.32, w * (0.25 + 0.5 * bk), bk > 0.1 ? 'rgba(120,230,255,1)' : 'rgba(255,170,80,.9)', 0.9);
  } else {
    var lean = o.lean || 0; cx.fillStyle = 'rgba(0,0,0,.4)'; ell(0, w * 0.03, w * 0.66, w * 0.1);
    if (o.mine) glow(0, 0, w * 0.9, 'rgba(255,60,40,.55)', 0.5);
    cx.rotate(lean * 0.06);
    cx.fillStyle = '#0D1018'; rr(-w * 0.58, -h * 0.55, w * 0.2, h * 0.58, w * 0.05); cx.fill(); rr(w * 0.38, -h * 0.55, w * 0.2, h * 0.58, w * 0.05); cx.fill();
    g = cx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, tint(col, 0.4)); g.addColorStop(0.45, col); g.addColorStop(1, tint(col, -0.5)); cx.fillStyle = g;
    cx.beginPath(); cx.moveTo(-w * 0.5, -h * 0.05); cx.lineTo(-w * 0.53, -h * 0.5); cx.quadraticCurveTo(-w * 0.5, -h * 0.74, -w * 0.38, -h * 0.8); cx.lineTo(w * 0.38, -h * 0.8); cx.quadraticCurveTo(w * 0.5, -h * 0.74, w * 0.53, -h * 0.5); cx.lineTo(w * 0.5, -h * 0.05); cx.quadraticCurveTo(0, h * 0.04, -w * 0.5, -h * 0.05); cx.fill();
    g = cx.createLinearGradient(0, -h * 1.25, 0, -h * 0.75); g.addColorStop(0, '#5E96D6'); g.addColorStop(1, '#0F1D38'); cx.fillStyle = g;
    cx.beginPath(); cx.moveTo(-w * 0.38, -h * 0.76); cx.lineTo(-w * 0.28, -h * 1.12); cx.quadraticCurveTo(0, -h * 1.22, w * 0.28, -h * 1.12); cx.lineTo(w * 0.38, -h * 0.76); cx.fill();
    cx.fillStyle = 'rgba(255,255,255,.28)'; cx.beginPath(); cx.moveTo(-w * 0.3, -h * 0.82); cx.lineTo(-w * 0.22, -h * 1.08); cx.lineTo(-w * 0.1, -h * 1.1); cx.lineTo(-w * 0.18, -h * 0.82); cx.fill();
    cx.fillStyle = tint(col, -0.45); cx.fillRect(-w * 0.52, -h * 0.9, w * 1.04, h * 0.09); cx.fillRect(-w * 0.36, -h * 0.84, w * 0.05, h * 0.1); cx.fillRect(w * 0.31, -h * 0.84, w * 0.05, h * 0.1);
    cx.fillStyle = '#ffffffcc'; cx.fillRect(-w * 0.05, -h * 0.8, w * 0.1, h * 0.8);
    var tl = o.slow ? 1 : 0.8; cx.fillStyle = '#FF1E2E'; rr(-w * 0.46, -h * 0.42, w * 0.3, h * 0.12, 3); cx.fill(); rr(w * 0.16, -h * 0.42, w * 0.3, h * 0.12, 3); cx.fill();
    glow(-w * 0.31, -h * 0.36, w * 0.28, 'rgba(255,40,50,1)', tl); glow(w * 0.31, -h * 0.36, w * 0.28, 'rgba(255,40,50,1)', tl);
    cx.fillStyle = '#F2F2F2'; rr(-w * 0.12, -h * 0.28, w * 0.24, h * 0.1, 2); cx.fill();
    cx.fillStyle = '#10131b'; rr(-w * 0.5, -h * 0.12, w * 1.0, h * 0.12, 3); cx.fill(); ell(-w * 0.28, -h * 0.05, w * 0.07, h * 0.05); ell(w * 0.28, -h * 0.05, w * 0.07, h * 0.05);
    glow(-w * 0.28, -h * 0.03, w * (0.18 + 0.5 * bk), bk > 0.1 ? 'rgba(110,225,255,1)' : 'rgba(255,170,80,.7)', 0.35 + 0.65 * Math.min(1, bk * 1.4));
    glow(w * 0.28, -h * 0.03, w * (0.18 + 0.5 * bk), bk > 0.1 ? 'rgba(110,225,255,1)' : 'rgba(255,170,80,.7)', 0.35 + 0.65 * Math.min(1, bk * 1.4));
  }
  cx.restore();
}

/* ---------- მართვა ---------- */
function attack() {
  if (!race || race.state !== 'run' || me.charges < 1) return;
  me.charges--; Snd.atk(); flash('🚀 გაიგზავნა!');
  if (mode === 'online') rawSend({ t: 'atk' }); else if (bot) bot.dyn.push({ d: bot.d + BASE * 3.2, x: bot.x, hit: 0 });
}
function holdBtn(id, fn) {
  var el = $(id);
  el.addEventListener('pointerdown', function (e) { e.preventDefault(); Snd.unlock(); fn(1); el.classList.add('on'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { el.addEventListener(ev, function () { fn(0); el.classList.remove('on'); }); });
}
holdBtn('bL', function (v) { keys.l = v; });
holdBtn('bR', function (v) { keys.r = v; });
$('bAtk').addEventListener('pointerdown', function (e) { e.preventDefault(); attack(); });
window.addEventListener('keydown', function (e) {
  if (!race) return;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.l = 1; else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.r = 1;
  else if (e.key === ' ' || e.key === 'x' || e.key === 'X' || e.key === 'Enter' || e.key === 'ArrowUp') { attack(); e.preventDefault(); }
});
window.addEventListener('keyup', function (e) { if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.l = 0; else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.r = 0; });
/* თითის მოძრაობა ეკრანზე: მანქანა თითს მიჰყვება */
var dragState = null;
$('cv').addEventListener('pointerdown', function (e) { if (!race) return; Snd.unlock(); dragState = { id: e.pointerId, sx: e.clientX, x0: me.x }; try { $('cv').setPointerCapture(e.pointerId); } catch (x) {} });
$('cv').addEventListener('pointermove', function (e) { if (dragState && dragState.id === e.pointerId) drag = Math.max(-0.9, Math.min(0.9, dragState.x0 + (e.clientX - dragState.sx) / (W * 0.24))); });
['pointerup', 'pointercancel'].forEach(function (ev) { $('cv').addEventListener(ev, function (e) { if (dragState && dragState.id === e.pointerId) { dragState = null; drag = null; } }); });
$('sndBtn').onclick = function () { $('sndBtn').textContent = Snd.toggle() ? '🔇' : '🔊'; };
$('sndBtn').textContent = Snd.muted() ? '🔇' : '🔊';

/* ---------- ღილაკები ---------- */
function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14) || 'მოთამაშე'; }
function takeName() { myName = cleanName($('name').value); lsSet(NAME_KEY, myName); }
$('createBtn').onclick = function () { takeName(); Snd.unlock(); mode = 'online'; closedByUs = false; stake = parseInt($('stake').value, 10) || 1; curSpeed = parseInt($('speed').value, 10) || 1; sendMsg({ t: 'create', name: myName, stake: stake, speed: curSpeed }); };
$('joinBtn').onclick = function () { takeName(); Snd.unlock(); var c = $('code').value.trim(); if (!c) { toastLobby('ჩაწერე ოთახის კოდი.'); return; } mode = 'online'; closedByUs = false; sendMsg({ t: 'join', code: c, name: myName }); };
$('botBtn').onclick = function () { takeName(); Snd.unlock(); mode = 'bot'; role = 'a'; curSpeed = parseInt($('speed').value, 10) || 1; stake = Math.min(parseInt($('stake').value, 10) || 1, Math.max(1, points)); names = { a: myName, b: 'კომპიუტერი' }; beginRace((Math.random() * 2e9) | 0 || 1, 3200); };
$('cancelBtn').onclick = function () { leaveToLobby(); };
$('leaveBtn').onclick = function () { if (confirm('გასვლა?')) leaveToLobby(); };
$('homeBtn').onclick = function () { leaveToLobby(); };
$('copyBtn').onclick = function () {
  var url = shareURL();
  if (navigator.share) navigator.share({ title: 'დუელი', text: 'შემოდი ოთახში ' + code, url: url }).catch(function () {});
  else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { $('copyBtn').textContent = 'ბმული დაკოპირდა'; });
};
$('againBtn').onclick = function () {
  if ($('againBtn').dataset.broke) setPoints(START_PTS);
  if (points < stake) { stake = Math.max(1, points); }
  if (mode === 'online') { if (points < stake) { toastLobby('ქულები არ გყოფნის ამ ფსონისთვის.'); leaveToLobby(); return; } rawSend({ t: 'again' }); $('againBtn').textContent = 'ველოდებით მოწინააღმდეგეს...'; }
  else beginRace((Math.random() * 2e9) | 0 || 1, 3200);
};
$('garageBtn').onclick = function () { show('s-garage'); showCar($('garCar'), points, 0); $('garTxt').textContent = points + ' / ' + TOTAL + ' ქულა · შეღებილია ' + carPct(points); $('garPrize').hidden = points < TOTAL; $('garPrize').textContent = PRIZE_TEXT; };
$('garBack').onclick = function () { show('s-lobby'); };

/* ---------- დასაწყისი ---------- */
$('name').value = lsGet(NAME_KEY) || '';
setPoints(points);
(function () {
  var rm = null; try { rm = new URL(location.href).searchParams.get('room'); } catch (e) {}
  if (rm) { $('code').value = rm.toUpperCase().slice(0, 8); $('invite').hidden = false; $('inviteCode').textContent = $('code').value; $('invite').firstChild.nodeValue = 'მეგობარმა გიწვია ოთახში '; }
  try { var s = JSON.parse(sessionStorage.getItem(SESS_KEY) || 'null'); if (s && s.code && s.token && !rm) { session = s; mode = 'online'; role = s.role; code = s.code; myName = s.name || ''; show('s-wait'); showWait(); $('codeBig').textContent = code; connect(); } } catch (e) {}
})();
window.__duel = { me: function () { return me; }, bot: function () { return bot; }, opp: function () { return opp; }, L: function () { return L; }, genTrack: genTrack, Runner: Runner, setPoints: setPoints, setSpeed: setSpeed, carData: carData };
})();
