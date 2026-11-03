(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

/* ---------- პარამეტრები ---------- */
var TOTAL = 42000, PER_CELL = 10, CELLS = TOTAL / PER_CELL, START_PTS = 10, BOOST_X = 1.85, NIT_MAX = 10;
var L = 1350, BASE = 24, START_D = 96, MULT = 1.35, HW = 8;
var SPEEDS = { 1: { m: 1.35, n: 'საშუალო' }, 2: { m: 2, n: 'სწრაფი' }, 3: { m: 3, n: 'სუპერ სწრაფი' } };
var speedLvl = 1;
function setSpeed(lvl) {
  speedLvl = SPEEDS[lvl] ? lvl : 1; MULT = SPEEDS[speedLvl].m;
  L = 1000 * MULT; BASE = 18 * MULT; START_D = BASE * 4; HW = 7 * Math.pow(MULT, 0.9);
}
setSpeed(1);
var PRIZE_TEXT = 'მანქანა მთლიანად შეღებილია! ეს ტესტ-ვერსიაა და ჯილდოს პირობებს ორგანიზატორი აცხადებს.';
var PTS_KEY = 'duel-points', NAME_KEY = 'duel-name', MUTE_KEY = 'duel-mute', SESS_KEY = 'duel-session';

function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
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
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(210, 168, 190, 9, 0, 0, 7); c.fill();
  c.fillStyle = '#171A24'; c.fill(D.path, 'nonzero');
  c.restore();
  var m = document.createElement('canvas'); m.width = cv.width; m.height = cv.height; var mc = m.getContext('2d'); mc.scale(2, 2); mc.fillStyle = '#000';
  for (i = 0; i < n; i++) { q = D.cells[i]; mc.fillRect(q.x - 0.2, q.y - 0.2, D.cell + 0.4, D.cell + 0.4); }
  mc.setTransform(1, 0, 0, 1, 0, 0); mc.globalCompositeOperation = 'source-in'; mc.drawImage(D.art, 0, 0); c.drawImage(m, 0, 0);
  c.save(); c.scale(2, 2); c.strokeStyle = '#8D96AE'; c.lineWidth = 2.2; c.lineJoin = 'round'; c.stroke(D.path);
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
  var ctx = null, muted = lsGet(MUTE_KEY) === '1', eng = null, engG = null, mus = null, musK = 0.5;
  var ROOTS = [38, 31, 36, 33], CH = [[0, 3, 7, 10], [0, 4, 7, 10], [0, 4, 7, 10], [0, 4, 7, 10]], BASSP = [0, 3, 4, 6, 8, 10, 11, 14], BASSN = [0, 0, 7, 0, 12, 7, 0, 10], KICK = [0, 3, 6, 10, 13], MEL = [0, -1, 3, -1, 5, 3, -1, 7, -1, 10, 7, -1, 5, 3, 0, -1];
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function nz(t, dur, vol, type, freq, q) {
    var c = ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = mus.noise; s.loop = true; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(mus.master); s.start(t); s.stop(t + dur + 0.02);
  }
  function osc(t, dur, f, type, vol, cut, f1, att) {
    var c = ctx, o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(); o.type = type; o.frequency.setValueAtTime(f, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(cut || 20000, t); if (cut) fl.frequency.exponentialRampToValueAtTime(Math.max(200, cut * 0.35), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (att || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(mus.master); o.start(t); o.stop(t + dur + 0.02);
  }
  function sched() {
    if (!mus || !ctx) return;
    while (mus.next < ctx.currentTime + 0.25) {
      var i = mus.step, t = mus.next, bpm = 146 + musK * 22, sp = 60 / bpm / 4, bar = Math.floor(i / 16) % 4, st = i % 16, root = ROOTS[bar], ch = CH[bar], k;
      if (KICK.indexOf(st) >= 0) { osc(t, 0.2, 140, 'sine', 0.95, 0, 40); nz(t, 0.025, 0.25, 'lowpass', 900); }
      if (st === 4 || st === 12) { nz(t, 0.17, 0.42, 'bandpass', 1900, 0.7); osc(t, 0.1, 210, 'triangle', 0.2, 0, 120); }
      if (st === 7 || st === 15) nz(t, 0.05, 0.12, 'bandpass', 2200, 0.8);
      nz(t, st === 14 ? 0.16 : 0.035, st % 2 ? 0.1 : 0.17, 'highpass', 7500);
      if (musK > 0.4 && st % 2 === 0) nz(t, 0.05, 0.07, 'bandpass', 1300, 3);
      k = BASSP.indexOf(st); if (k >= 0) osc(t, sp * 1.8, mtof(root + 12 + BASSN[k]), 'sawtooth', 0.36, 700 + musK * 700);
      if (st === 2 || st === 5 || st === 10 || st === 13) ch.forEach(function (iv) { osc(t, sp * 1.7, mtof(root + 24 + iv), 'sawtooth', 0.07, 2600, 0, 0.012); osc(t, sp * 1.7, mtof(root + 24 + iv) * 1.006, 'square', 0.04, 2200, 0, 0.012); });
      if (musK > 0.55 && MEL[st] >= 0) osc(t, sp * 1.8, mtof(root + 36 + MEL[st]), 'square', 0.085, 3200, mtof(root + 36 + MEL[st]) * 0.99, 0.015);
      if (st === 15 && bar === 3) osc(t, sp * 2, mtof(root + 48), 'sawtooth', 0.07, 3500, mtof(root + 60));
      mus.next += sp; mus.step = (i + 1) % 64;
    }
  }
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
    music: function (k) {
      var c = ensure(); if (!c || muted) return; musK = k;
      if (!mus) {
        var nb = c.createBuffer(1, 11025, 22050), dd = nb.getChannelData(0), i; for (i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
        mus = { step: 0, next: c.currentTime + 0.15, noise: nb, master: c.createGain() }; mus.master.gain.value = 0.55; mus.master.connect(c.destination);
        mus.timer = setInterval(sched, 60);
      }
    },
    musicStop: function () { if (mus) { clearInterval(mus.timer); try { mus.master.disconnect(); } catch (e) {} mus = null; } },
    skid: function () { tone(900, 0, 0.35, 'sawtooth', 0.05, 500); },
    transform: function () { var c = ensure(); if (!c || muted) return; tone(80, 1.8, 0.9, 'sawtooth', 0.22, 700); for (var i = 0; i < 9; i++) tone(300 + (i % 3) * 180, 2.0 + i * 0.28, 0.12, 'square', 0.12, 120); tone(200, 3.6, 0.9, 'sawtooth', 0.25, 1600); tone(60, 3.6, 0.6, 'sine', 0.4, 30); },
    engineOff: function () { if (eng) { try { eng.stop(); } catch (e) {} eng = null; } }
  };
})();
/* ---------- ტრასა (ერთი seed = ერთი და იგივე ტრასა ორივე მოთამაშესთან) ---------- */
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var THEMES = [
  { n: 'ძველი თბილისი', v: 'car', roof: 'tile', dark: '#434a63', lamp: '255,176,96', side: 'cobble', prop: 'market', river: false, ground: '#1a1512' },
  { n: 'რუსთაველის გამზირი', v: 'car', roof: 'grey', dark: '#3a4262', lamp: '255,208,140', side: 'stone', prop: 'trees', river: false, ground: '#16171d' },
  { n: 'მტკვრის სანაპირო', v: 'car', roof: 'grey', dark: '#33405e', lamp: '255,192,112', side: 'stone', prop: 'trees', river: true, ground: '#12161c' },
  { n: 'საბურთალო · წვიმა', v: 'car', roof: 'panel', dark: '#363d52', lamp: '255,224,160', side: 'concrete', prop: 'trees', river: false, rain: true, ground: '#14161a' },
  { n: 'ღამის ცა · თბილისი', v: 'plane', roof: 'tile', dark: '#2c3558', lamp: '255,190,110', side: 'cobble', prop: 'market', air: true, ground: '#0d1018' },
  { n: 'ცა · ცეცხლისფერი ბინდი', v: 'plane', roof: 'grey', dark: '#5a3c4c', lamp: '255,160,90', side: 'stone', prop: 'trees', air: true, ground: '#1c1014' }
];
function genTrack(seed) {
  var r = rng(seed), th = THEMES[window.__forceTheme != null ? window.__forceTheme : Math.floor(r() * THEMES.length)], N = Math.ceil(L + 320), kap = new Float32Array(N + 4), pos = BASE * 2.2, h = 0, i, j, dir, R, ang, Lc, kp, items = [], d;
  while (pos < N) {
    dir = h < -0.9 ? -1 : h > 0.9 ? 1 : (r() < 0.5 ? 1 : -1);
    R = (42 + r() * 70) * MULT; ang = 0.7 + r() * 1.1; Lc = ang * Math.PI / 2 * R; kp = dir / R;
    for (j = 0; j < Lc && pos + j < N; j++) kap[Math.floor(pos + j)] = kp * Math.sin(Math.PI * j / Lc);
    h -= dir * ang; pos += Lc + (16 + r() * 40) * MULT;
  }
  var cx = new Float32Array(N + 2), cy = new Float32Array(N + 2), ch = new Float32Array(N + 2); ch[0] = 0;
  for (i = 0; i < N + 1; i++) { ch[i + 1] = ch[i] - kap[i]; cx[i + 1] = cx[i] + Math.sin(ch[i]); cy[i + 1] = cy[i] - Math.cos(ch[i]); }
  d = START_D;
  while (d < L - BASE * 3) {
    items.push(r() < 0.72 ? { k: 'nit', d: d, x: r() * 1.5 - 0.75 } : { k: 'pad', d: d, x: r() * 1.1 - 0.55, len: BASE * 0.55 });
    d += BASE * (1.2 + r() * 1.4);
  }
  return { theme: th, items: items, seed: seed, kap: kap, cx: cx, cy: cy, ch: ch, N: N };
}
function kapAt(t, d) { return t.kap[Math.max(0, Math.min(t.N, Math.floor(d)))]; }
function headAt(t, d) { d = Math.max(0, Math.min(t.N - 1, d)); var i = Math.floor(d), f = d - i; return t.ch[i] + (t.ch[i + 1] - t.ch[i]) * f; }
function worldAt(t, d, xr, o) {
  d = Math.max(0, Math.min(t.N - 1, d)); var i = Math.floor(d), f = d - i, h = t.ch[i] + (t.ch[i + 1] - t.ch[i]) * f, px = t.cx[i] + (t.cx[i + 1] - t.cx[i]) * f, py = t.cy[i] + (t.cy[i + 1] - t.cy[i]) * f;
  o = o || {}; o.x = px + Math.cos(h) * xr * HW; o.y = py + Math.sin(h) * xr * HW; o.h = h; return o;
}

/* ---------- მოძრავი მანქანა (მოთამაშე და კომპიუტერი ერთი და იგივე წესებით) ---------- */
function Runner(x0) { this.d = 0; this.x = x0 || 0; this.vx = 0; this.v = 0; this.nit = 0; this.bk = 0; this.drift = false; this.slip = 0; this.dr = 0; this.hit = {}; this.fin = false; this.ev = []; this.ptr = 0; this.scrapeT = 0; this.auto = false; this.ang = 0; }
Runner.prototype.step = function (dt, track, axis, drag, gm) {
  var it = track.items, prev = this.d, px = this.x, i, o, tgt, base = BASE * (gm || 1), k = kapAt(track, this.d), sk = k > 0 ? 1 : -1, ak = Math.abs(k), inward;
  this.ev.length = 0;
  if (drag !== null && drag !== undefined) this.x += (drag - this.x) * Math.min(1, dt * 6); else this.x += axis * 1.7 * dt;
  this.vx = dt > 0 ? (this.x - px) / dt : 0;
  inward = this.auto ? (ak > 0.004 ? 1 : 0) : Math.max(-sk * axis, -sk * this.vx * 0.9);
  var wasD = this.drift;
  if (ak > 0.0035 && this.v > BASE * 0.55 && inward > (this.drift ? -0.15 : 0.3)) this.drift = true; else this.drift = false;
  if (this.drift && !wasD) this.ev.push('drift');
  this.x += k * this.v * this.v * (0.06 / MULT) * (this.drift ? 0.3 : 1) * dt;
  var tslip = this.drift ? -sk * Math.min(0.62, 0.22 + ak * this.v * 0.045) : 0;
  this.slip += (tslip - this.slip) * Math.min(1, dt * 7);
  if (this.drift) { this.dr += dt; this.nit = Math.min(NIT_MAX, this.nit + dt * 0.85); } else this.dr = 0;
  this.scrapeT -= dt;
  if (this.x > 1 || this.x < -1) { this.x = this.x > 0 ? 1 : -1; this.v *= (1 - 0.9 * dt); if (this.scrapeT <= 0) { this.scrapeT = 0.12; this.ev.push('scrape'); } }
  if (this.nit > 0) { this.nit = Math.max(0, this.nit - dt); tgt = 1; } else tgt = 0;
  this.bk += (tgt - this.bk) * Math.min(1, dt * (tgt ? 3.2 : 1.8));
  this.v += (base * (1 + (BOOST_X - 1) * this.bk) * (this.drift ? 0.97 : 1) - this.v) * Math.min(1, dt * (this.v < base * 0.97 ? 2.4 : 3));
  this.d += this.v * dt;
  while (this.ptr < it.length && it[this.ptr].d + (it[this.ptr].len || 0) < prev - 3) this.ptr++;
  for (i = this.ptr; i < it.length && it[i].d < this.d + 2; i++) {
    o = it[i]; if (this.hit[i]) continue;
    if (o.k === 'pad') { if (this.d >= o.d - 0.5 && prev <= o.d + o.len && Math.abs(this.x - o.x) < 0.45) { this.hit[i] = 1; this.nit = Math.min(NIT_MAX, this.nit + 2.4); this.ev.push('pad'); } continue; }
    if (this.d < o.d - 0.5 || prev > o.d + 1.5) continue;
    if (Math.abs(this.x - o.x) < 0.3) { this.hit[i] = 1; this.nit = Math.min(NIT_MAX, this.nit + 4.5); this.ev.push('nit'); }
  }
  if (this.d >= L) this.fin = true;
};
/* ჩამორჩენილი ოდნავ აჩქარდება, წინა — ოდნავ შენელდება: რბოლა ახლოს რჩება */
function gapMul(selfD, otherD) {
  var gap = otherD - selfD;
  return gap > 0 ? 1 + Math.min(1, gap / (BASE * 1.8)) * 0.5 : 1 - Math.min(1, -gap / (BASE * 1.8)) * 0.2;
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
        opp.d = m.d; opp.x = Math.max(-1, Math.min(1, +m.x || 0)); opp.b = !!m.b; opp.s = !!m.s; opp.t = now;
      }
      break;
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
var race = null, me = new Runner(-0.45), opp = { d: 0, rd: 0, x: 0.45, rx: 0.45, b: false, s: false, t: 0, est: 0, slip: 0 }, bot = null, track = null, keys = { l: 0, r: 0 }, drag = null, raf = 0, lastT = 0, sendT = 0, botT = 0, cv = null, cx = null, W = 0, H = 0, dpr = 1, shake = 0, hitFlash = 0;
function startX(r) { return r === 'b' ? 0.45 : -0.45; }
function beginRace(seed, countdownMs, resume) {
  stopRace(); setSpeed(curSpeed);
  track = genTrack(seed); if (!PAT) PAT = buildPatterns();
  me = new Runner(startX(role)); opp = { d: 0, rd: 0, x: -startX(role), rx: -startX(role), b: false, s: false, t: performance.now(), est: 0, slip: 0 };
  bot = (mode === 'bot') ? new Runner(-startX(role)) : null; if (bot) { bot.auto = true; bot.ai = { tx: bot.x, miss: 0, ph: Math.random() * 6 }; }
  race = { state: 'count', t0: performance.now() + countdownMs, lastBeep: 4, doneSent: false, over: false, ft: 0, shown: false };
  drag = null; keys.l = keys.r = 0; shake = 0; hitFlash = 0; cam.init = false; skids.length = 0; smoke.length = 0; sparksW.length = 0;
  show('s-game'); resize();
  $('big').className = 'big'; $('toast').textContent = ''; $('timer').textContent = ''; $('gap').textContent = '';
  Snd.unlock();
  lastT = performance.now(); raf = requestAnimationFrame(loop);
}
function resize() { cv = $('cv'); cx = cv.getContext('2d'); dpr = Math.min(window.devicePixelRatio || 1, 1.75); W = cv.clientWidth || window.innerWidth; H = cv.clientHeight || window.innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
window.addEventListener('resize', function () { if (race) resize(); });
function stopRace() { cancelAnimationFrame(raf); raf = 0; race = null; Snd.engineOff(); Snd.musicStop(); }
function flash(t) { var el = $('toast'); el.textContent = t; clearTimeout(flash.t); flash.t = setTimeout(function () { el.textContent = ''; }, 1100); }
function setBig(t, cls) { var b = $('big'); b.textContent = t; b.className = 'big ' + (cls || ''); void b.offsetWidth; b.className = 'big pop ' + (cls || ''); }

function loop(now) {
  if (!race) return;
  var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (race.state === 'done') return;
  if (race.state === 'count') {
    var left = (race.t0 - now) / 1000, n = Math.ceil(left);
    if (left <= 0) { race.state = 'run'; setBig('დაიწყო!', 'sm'); setTimeout(function () { if ($('big').textContent === 'დაიწყო!') $('big').textContent = ''; }, 700); Snd.beep(true); }
    else if (n <= 3 && n !== race.lastBeep) { race.lastBeep = n; setBig(String(n)); Snd.beep(false); }
    else if (n > 3 && n !== race.lastBeep) { race.lastBeep = n; $('big').className = 'big sm'; $('big').textContent = track.theme.n; }
  }
  if (race.state === 'run') {
    var el = (now - race.t0) / 1000, axis = keys.r - keys.l;
    if (mode === 'bot') { opp.d = opp.rd = bot.d; opp.x = opp.rx = bot.x; opp.b = bot.bk > 0.2; opp.s = bot.drift; opp.slip = bot.slip; }
    else { opp.rd += (opp.d + opp.est * Math.min(0.25, (now - opp.t) / 1000) - opp.rd) * Math.min(1, dt * 9); opp.rx += (opp.x - opp.rx) * Math.min(1, dt * 10); var ok = kapAt(track, opp.rd), osl = opp.s ? -(ok > 0 ? 1 : -1) * Math.min(0.62, 0.22 + Math.abs(ok) * BASE * 1.4 * 0.045) : 0; opp.slip += (osl - opp.slip) * Math.min(1, dt * 7); }
    if (!me.fin) { me.step(dt, track, axis, drag, gapMul(me.d, opp.rd)); me.ev.forEach(onEv); }
    else { me.d += BASE * 0.6 * dt; me.bk *= 0.97; }
    if (bot) { botThink(dt, el); if (!bot.fin) bot.step(dt, track, 0, bot.ai.tx, gapMul(bot.d, me.d)); else bot.d += BASE * 0.6 * dt; bot.ev.length = 0; }
    var gap = (opp.rd - me.d) / BASE;
    $('timer').textContent = 'ფსონი ' + stake + ' · ' + (gap > 0 ? '2-ე' : '1-ლი') + ' · ' + Math.floor(el / 60) + ':' + ('0' + Math.floor(el % 60)).slice(-2);
    $('gap').textContent = Math.abs(gap) < 0.12 ? 'ერთად!' : gap > 0 ? 'მოწინააღმდეგე წინ · ' + gap.toFixed(1) + ' წმ' : 'შენ წინ ხარ · ' + (-gap).toFixed(1) + ' წმ';
    $('gap').className = 'gap ' + (Math.abs(gap) < 0.12 ? 'eq' : gap > 0 ? 'bad' : 'good');
    Snd.engine(me.v / MULT, me.bk > 0.3); Snd.music(Math.min(1, 0.5 + 0.25 * Math.min(1, me.d / L) + 0.25 * me.bk + (Math.abs(gap) < 0.8 ? 0.1 : 0)));
    if (mode === 'online') {
      if (now - sendT > 80) { sendT = now; rawSend({ t: 'pos', d: +me.d.toFixed(1), x: +me.x.toFixed(3), b: me.bk > 0.3 ? 1 : 0, s: me.drift ? 1 : 0 }); }
      if (me.fin && !race.doneSent) { race.doneSent = true; rawSend({ t: 'fin' }); setBig('ფინიში!', 'sm'); }
    } else if (!race.over) {
      if (me.fin || bot.fin) { race.over = true; finishRace(me.fin && (!bot.fin || me.d >= bot.d)); }
      else if (el > 120) { race.over = true; finishRace(me.d >= bot.d); }
    }
  } else if (race.state === 'finale') {
    race.ft += dt; if (race.ft > 5.6 && !race.shown) { race.shown = true; setBig(race.won ? 'გამარჯვება' : 'წაგება', 'sm'); }
  }
  $('pMe').style.left = Math.min(100, me.d / L * 100) + '%'; $('pOpp').style.left = Math.min(100, Math.max(0, opp.rd) / L * 100) + '%';
  $('heatBar').style.width = Math.min(100, me.nit / NIT_MAX * 100) + '%';
  shake = Math.max(0, shake - dt * 3); hitFlash = Math.max(0, hitFlash - dt * 2.5);
  draw(now, dt);
  if (race) raf = requestAnimationFrame(loop);
}
function onEv(e) {
  var p = worldAt(track, me.d, me.x, {});
  if (e === 'scrape') { Snd.crash(); shake = 0.5; addSparks(p.x + Math.cos(p.h) * me.x * HW * 0.1, p.y + Math.sin(p.h) * me.x * HW * 0.1, 12, 18); if (navigator.vibrate) try { navigator.vibrate(30); } catch (x) {} }
  else if (e === 'drift') Snd.skid();
  else if (e === 'nit') { Snd.pick(); flash('ნიტრო!'); }
  else if (e === 'pad') { Snd.pick(); flash('ბუსტი!'); }
}

/* კომპიუტერი: იგივე ტრასა, იგივე წესები, ზოგჯერ ცდება */
function botThink(dt, el) {
  botT -= dt; if (botT > 0) return; botT = 0.08;
  var b = bot, ai = b.ai, it = track.items, i, o, bd = 1e9, best = null, la = kapAt(track, b.d + 14 * MULT), tx;
  if (ai.miss > 0) { ai.miss -= 0.08; return; }
  tx = -(la > 0 ? 1 : -1) * Math.min(0.62, Math.abs(la) * MULT * 48) + Math.sin(el * 1.3 + ai.ph) * 0.1;
  for (i = b.ptr; i < it.length && it[i].d < b.d + 30 * MULT; i++) { o = it[i]; if (b.hit[i] || o.d < b.d + 2) continue; if (Math.abs(o.x - b.x) < 0.8 && o.d - b.d < bd) { best = o; bd = o.d - b.d; } }
  if (best && Math.random() < 0.8) tx = best.x;
  if (Math.random() < 0.015) { ai.miss = 0.5; tx = (Math.random() - 0.5) * 1.6; }
  ai.tx = clamp(tx, -0.95, 0.95);
}

function finishRace(won) {
  if (!race || race.state === 'finale' || race.state === 'done') return;
  var before = points;
  setPoints(won ? before + stake : before - stake);
  var gained = won ? points - before : before - points, rc = race;
  race.state = 'finale'; race.won = won; race.ft = 0; race.shown = false; Snd.engineOff(); Snd.transform();
  var mp = worldAt(track, me.d, me.x, {}), op = worldAt(track, Math.max(0, opp.rd), opp.rx, {});
  race.f0 = { me: { x: mp.x, y: mp.y, a: mp.h + me.slip }, opp: { x: op.x, y: op.y, a: op.h + (opp.slip || 0) } };
  $('gap').textContent = ''; $('timer').textContent = '';
  setTimeout(function () {
    if (race !== rc) return;
    race.state = 'done'; Snd.musicStop();
    show('s-result');
    $('resTitle').textContent = won ? 'გამარჯვება' : 'წაგება';
    $('resSub').textContent = won ? 'მანქანაზე ' + Math.max(1, Math.round(gained / PER_CELL)) + ' უჯრა შეიღება.' : 'ფსონი ' + stake + ' ქულა დაგაკლდა, მანქანიდან ' + Math.max(1, Math.round(gained / PER_CELL)) + ' უჯრა გაქრა.';
    showCar($('resCar'), points, won ? Math.max(1, Math.round(gained / PER_CELL)) : 0);
    var full = points >= TOTAL, broke = points <= 0;
    $('resPts').textContent = (won ? '+' : '−') + gained + ' ქულა · სულ ' + points + ' / ' + TOTAL + ' (' + carPct(points) + ')' + (full ? ' · მანქანა მზადაა!' : '');
    $('againBtn').textContent = broke ? 'ახლიდან დაწყება (10 ქულა)' : 'კიდევ ერთხელ';
    $('againBtn').dataset.broke = broke ? '1' : '';
    if (full) $('resSub').textContent = PRIZE_TEXT;
    won ? Snd.win() : Snd.lose();
  }, 9500);
}

/* ---------- ხატვა: ზემოდან, ღამის ქუჩა (ტექსტურები) ---------- */
var PAT = null;
function mkc(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function noise(g, w, h, amp, a) { var im = g.getImageData(0, 0, w, h), d = im.data, i, n; for (i = 0; i < d.length; i += 4) { n = (Math.random() - 0.5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0); }
function buildPatterns() {
  var c, g, i, x, y, P = {};
  c = mkc(256, 256); g = c.getContext('2d'); g.fillStyle = '#3a3c42'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 34);
  for (i = 0; i < 26; i++) { g.fillStyle = 'rgba(' + (i % 2 ? '0,0,0,.10' : '255,255,255,.04') + ')'; g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 256, 12 + Math.random() * 40, 8 + Math.random() * 24, Math.random() * 3, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(10,10,12,.55)'; g.lineWidth = 1.2; for (i = 0; i < 5; i++) { x = Math.random() * 256; y = Math.random() * 256; g.beginPath(); g.moveTo(x, y); for (var k = 0; k < 7; k++) { x += (Math.random() - 0.4) * 22; y += (Math.random() - 0.5) * 22; g.lineTo(x, y); } g.stroke(); }
  P.asphalt = c;
  c = mkc(256, 256); g = c.getContext('2d'); g.fillStyle = '#2a2420'; g.fillRect(0, 0, 256, 256);
  for (y = 0; y < 256; y += 16) for (x = (y / 16 % 2) * 8; x < 256; x += 16) { var t = 70 + Math.random() * 60; g.fillStyle = 'rgb(' + (t + 14) + ',' + (t + 4) + ',' + (t - 8) + ')'; g.beginPath(); g.ellipse(x + 8 + (Math.random() - 0.5) * 2, y + 8, 7 + Math.random(), 6.5 + Math.random(), 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.ellipse(x + 6, y + 6, 4, 3, 0, 0, 7); g.fill(); }
  P.cobble = c;
  c = mkc(256, 256); g = c.getContext('2d'); g.fillStyle = '#6a6862'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 22); g.strokeStyle = 'rgba(20,20,20,.5)'; g.lineWidth = 2; for (i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } P.stone = c;
  c = mkc(256, 256); g = c.getContext('2d'); g.fillStyle = '#77756f'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 30); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (i = 0; i <= 256; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); } P.concrete = c;
  c = mkc(256, 256); g = c.getContext('2d'); g.fillStyle = '#9a4a32'; g.fillRect(0, 0, 256, 256); for (y = 0; y < 256; y += 12) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y, 256, 2); for (x = (y / 12 % 2) * 9; x < 256; x += 18) { g.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '255,200,150' : '0,0,0') + ',.08)'; g.fillRect(x, y + 2, 17, 10); } } noise(g, 256, 256, 24); P.tile = c;
  c = mkc(256, 256); g = c.getContext('2d'); g.fillStyle = '#585b63'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 28); g.fillStyle = 'rgba(0,0,0,.25)'; for (x = 0; x < 256; x += 32) g.fillRect(x, 0, 2, 256); P.grey = c;
  c = mkc(256, 256); g = c.getContext('2d'); g.fillStyle = '#44464c'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 40); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; for (i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); } P.panel = c;
  c = mkc(256, 256); g = c.getContext('2d'); g.fillStyle = '#0f1b2a'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 18); P.water = c;
  var out = {}, ctx0 = mkc(2, 2).getContext('2d');
  Object.keys(P).forEach(function (k) { var p = ctx0.createPattern(P[k], 'repeat'); try { p.setTransform(new DOMMatrix().scale(k === 'asphalt' ? 14 / 256 : 9 / 256)); } catch (e) {} out[k] = p; });
  return out;
}
function angd(a, b) { var d = b - a; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }
var cam = { h: 0, init: false }, P_ = { x: 0, y: 0, h: 0 }, skids = [], smoke = [], sparksW = [], shockT = 0, grainCv = null;
function grain() { if (!grainCv) { grainCv = mkc(128, 128); var g = grainCv.getContext('2d'), im = g.createImageData(128, 128), i, v; for (i = 0; i < 16384; i++) { v = Math.random() * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); } return grainCv; }
function hf(i) { var x = Math.sin(i * 127.1 + track.seed * 0.013) * 43758.5453; return x - Math.floor(x); }
function stripPath(a, b, d0, d1, step) {
  var d, o = P_, i, n = 0, xs = [], ys = [];
  cx.beginPath();
  for (d = d0; d <= d1 + 0.01; d += step) { worldAt(track, d, a, o); if (d === d0) cx.moveTo(o.x, o.y); else cx.lineTo(o.x, o.y); }
  for (d = d1; d >= d0 - 0.01; d -= step) { worldAt(track, d, b, o); cx.lineTo(o.x, o.y); }
  cx.closePath();
}
function linePath(xr, d0, d1, step) { var d, o = P_; cx.beginPath(); for (d = d0; d <= d1 + 0.01; d += step) { worldAt(track, d, xr, o); if (d === d0) cx.moveTo(o.x, o.y); else cx.lineTo(o.x, o.y); } }
/* ლანდმარკები: [დაწყება, დასასრული, გვერდი] ინტერვალები, სადაც ჩვეულებრივი შენობები არ იხატება */
function landmarks() { return [{ k: 'narikala', d: L * 0.2, s: -1 }, { k: 'sameba', d: L * 0.7, s: 1 }, { k: 'bridge', d: L * 0.42, s: 0 }]; }
/* ---------- სამყარო (მსოფლიო კოორდინატებში) ---------- */
var lampList = [], glowList = [];
function lmSide(k) { return k === 'sameba' ? (track.theme.river ? -1 : 1) : -1; }
function nearLm(dm, s) {
  var l = landmarks(), i; for (i = 0; i < l.length; i++) { if (l[i].k === 'bridge') continue; if (Math.abs(dm - l[i].d) < HW * 5.5 && lmSide(l[i].k) === s) return true; }
  return false;
}
function drawBuildings(d0, d1, th) {
  var BSZ = HW * 2.6, j, s, r1, r2, r3, dm, len, dep, lat, o = P_, key, k, hue;
  for (j = Math.floor(d0 / BSZ); j * BSZ < d1; j++) for (s = -1; s <= 1; s += 2) {
    if (th.river && s === 1) continue;
    key = j * 2 + (s > 0 ? 1 : 0); r1 = hf(key + 5); r2 = hf(key + 9); r3 = hf(key + 13); dm = (j + 0.5) * BSZ;
    if (dm < 0 || dm > track.N - 30 || nearLm(dm, s)) continue;
    len = BSZ * (0.8 + 0.18 * r1); dep = HW * (1.0 + 1.5 * r2); lat = HW * 1.5 + dep / 2 + HW * 0.08 * r3;
    worldAt(track, dm, s * lat / HW, o);
    cx.save(); cx.translate(o.x, o.y); cx.rotate(o.h);
    cx.fillStyle = PAT[th.roof]; cx.fillRect(-dep / 2, -len / 2, dep, len);
    hue = ['255,150,110', '120,160,255', '255,220,120', '150,255,190', '255,120,160'][Math.floor(r3 * 5)];
    cx.fillStyle = 'rgba(' + hue + ',' + (th.roof === 'tile' ? 0.12 : 0.1) + ')'; cx.fillRect(-dep / 2, -len / 2, dep, len);
    var gr = cx.createLinearGradient(-dep / 2, 0, dep / 2, 0); gr.addColorStop(0, 'rgba(0,0,0,' + (s > 0 ? 0.45 : 0) + ')'); gr.addColorStop(1, 'rgba(0,0,0,' + (s > 0 ? 0 : 0.45) + ')');
    if (th.roof === 'tile') { cx.fillStyle = gr; cx.fillRect(-dep / 2, -len / 2, dep, len); cx.strokeStyle = 'rgba(255,200,160,.35)'; cx.lineWidth = HW * 0.04; cx.beginPath(); cx.moveTo(0, -len / 2); cx.lineTo(0, len / 2); cx.stroke(); }
    else { cx.strokeStyle = 'rgba(0,0,0,.55)'; cx.lineWidth = HW * 0.08; cx.strokeRect(-dep / 2 + HW * 0.12, -len / 2 + HW * 0.12, dep - HW * 0.24, len - HW * 0.24); cx.fillStyle = 'rgba(0,0,0,.35)'; for (k = 0; k < 3; k++) cx.fillRect((hf(key * 7 + k) - 0.5) * dep * 0.5 - HW * 0.2, (hf(key * 11 + k) - 0.5) * len * 0.6 - HW * 0.15, HW * 0.4, HW * 0.3); }
    cx.strokeStyle = 'rgba(0,0,0,.7)'; cx.lineWidth = HW * 0.06; cx.strokeRect(-dep / 2, -len / 2, dep, len);
    var ex = -s * dep / 2, sg = cx.createLinearGradient(ex, 0, ex - s * HW * 0.3, 0); sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = sg; cx.fillRect(Math.min(ex, ex - s * HW * 0.3), -len / 2, HW * 0.3, len);
    if (th.roof === 'tile') { for (k = 0; k < 2; k++) { var by = (k - 0.5) * len * 0.5, bw = HW * 0.18; cx.fillStyle = '#4a2f1b'; cx.fillRect(ex - s * (bw) - (s > 0 ? 0 : 0), by - len * 0.12, bw, len * 0.24); cx.fillStyle = '#2a190d'; cx.fillRect(ex - s * bw, by - len * 0.12, bw, HW * 0.03); cx.fillRect(ex - s * bw, by + len * 0.12 - HW * 0.03, bw, HW * 0.03); } }
    cx.restore();
  }
}
function barrel(x, y, r) { cx.fillStyle = 'rgba(0,0,0,.4)'; cx.beginPath(); cx.arc(x + r * 0.3, y + r * 0.35, r, 0, 7); cx.fill(); var g = cx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#9a6a3a'); g.addColorStop(1, '#4a2c14'); cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, 7); cx.fill(); cx.strokeStyle = '#1e1208'; cx.lineWidth = r * 0.12; cx.beginPath(); cx.arc(x, y, r * 0.7, 0, 7); cx.stroke(); cx.beginPath(); cx.arc(x, y, r * 0.35, 0, 7); cx.stroke(); }
function crate(x, y, r, rot, col) { cx.save(); cx.translate(x, y); cx.rotate(rot); cx.fillStyle = 'rgba(0,0,0,.4)'; cx.fillRect(-r + r * 0.25, -r + r * 0.3, r * 2, r * 2); cx.fillStyle = col || '#8a5a2a'; cx.fillRect(-r, -r, r * 2, r * 2); cx.strokeStyle = '#2d1a0a'; cx.lineWidth = r * 0.12; cx.strokeRect(-r, -r, r * 2, r * 2); cx.beginPath(); cx.moveTo(-r, 0); cx.lineTo(r, 0); cx.moveTo(0, -r); cx.lineTo(0, r); cx.stroke(); cx.restore(); }
function stall(x, y, w, h, rot, hue) { cx.save(); cx.translate(x, y); cx.rotate(rot); cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(-w / 2 + w * 0.08, -h / 2 + h * 0.12, w, h); for (var i = 0; i < 6; i++) { cx.fillStyle = i % 2 ? '#f1ead8' : hue; cx.fillRect(-w / 2 + i * w / 6, -h / 2, w / 6 + 0.2, h); } cx.strokeStyle = 'rgba(0,0,0,.6)'; cx.lineWidth = w * 0.03; cx.strokeRect(-w / 2, -h / 2, w, h); cx.restore(); }
function tree(x, y, r, k) { cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.arc(x + r * 0.25, y + r * 0.3, r, 0, 7); cx.fill(); var g = cx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#3f7a3c'); g.addColorStop(0.7, '#1d4a24'); g.addColorStop(1, '#10301a'); cx.fillStyle = g; cx.beginPath(); for (var i = 0; i < 14; i++) { var a = i / 14 * 6.2832, rr_ = r * (0.86 + 0.16 * hf(k * 31 + i)); cx.lineTo(x + Math.cos(a) * rr_, y + Math.sin(a) * rr_); } cx.closePath(); cx.fill(); for (i = 0; i < 6; i++) { cx.fillStyle = 'rgba(120,200,110,.18)'; cx.beginPath(); cx.arc(x + (hf(k + i * 3) - 0.5) * r, y + (hf(k + i * 5) - 0.5) * r, r * 0.22, 0, 7); cx.fill(); } }
function drawProps(d0, d1, th) {
  var PS = HW * 1.2, k, o = P_, r, s, t, p;
  lampList.length = 0;
  for (k = Math.floor(d0 / PS); k * PS < d1; k++) {
    var d = k * PS; if (d < 0 || d > track.N - 20) continue;
    r = hf(k + 700);
    if (k % 4 === 0) for (s = -1; s <= 1; s += 2) {
      if (th.river && s === 1 && false) continue;
      worldAt(track, d, s * 1.33, o); cx.save(); cx.translate(o.x, o.y); cx.rotate(o.h);
      cx.strokeStyle = '#15171c'; cx.lineWidth = HW * 0.06; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(-s * HW * 0.3, 0); cx.stroke();
      cx.fillStyle = '#0c0d11'; cx.beginPath(); cx.arc(0, 0, HW * 0.07, 0, 7); cx.fill(); cx.fillStyle = '#ffe9b8'; cx.beginPath(); cx.arc(-s * HW * 0.3, 0, HW * 0.07, 0, 7); cx.fill(); cx.restore();
      worldAt(track, d, s * 1.33 - s * 0.3 / HW * HW / HW * 0, o); lampList.push({ x: o.x - Math.cos(o.h) * s * HW * 0.3, y: o.y - Math.sin(o.h) * s * HW * 0.3 });
      continue;
    }
    s = r < 0.5 ? -1 : 1; if (th.river && s === 1) s = -1;
    if (th.prop === 'market') {
      t = hf(k + 900); worldAt(track, d, s * (1.12 + 0.2 * hf(k + 5)), o); cx.save(); cx.translate(o.x, o.y); cx.rotate(o.h);
      if (t < 0.3) barrel(0, 0, HW * 0.11); else if (t < 0.55) { crate(0, 0, HW * 0.1, hf(k) * 1.2, '#8a5a2a'); crate(HW * 0.2, HW * 0.12, HW * 0.08, hf(k + 1) * 2, '#6a4422'); } else if (t < 0.75) stall(0, 0, HW * 0.42, HW * 0.3, 0.1, ['#b3202a', '#2a6ab3', '#c98a1e', '#2a8a4a'][Math.floor(hf(k + 2) * 4)]); else if (t < 0.86) { barrel(0, 0, HW * 0.1); barrel(HW * 0.2, HW * 0.05, HW * 0.1); }
      cx.restore();
    } else if (k % 3 === 1) { worldAt(track, d, s * 1.34, o); tree(o.x, o.y, HW * 0.36, k); }
  }
}
function drawRoad(d0, d1, th) {
  var a, b, i;
  if (th.river) {
    stripPath(1.42, 6, d0, d1, 5); cx.fillStyle = PAT.water; cx.fill();
    stripPath(6, 12, d0, d1, 5); cx.fillStyle = '#10141a'; cx.fill();
    linePath(1.42, d0, d1, 4); cx.strokeStyle = '#2b2f38'; cx.lineWidth = HW * 0.08; cx.stroke(); cx.strokeStyle = '#7d8594'; cx.lineWidth = HW * 0.025; cx.setLineDash([HW * 0.1, HW * 0.4]); cx.stroke(); cx.setLineDash([]);
  }
  [-1, 1].forEach(function (s) { stripPath(s * 1, s * 1.4, d0, d1, 4); cx.fillStyle = PAT[th.side]; cx.fill(); linePath(s * 1.4, d0, d1, 4); cx.strokeStyle = 'rgba(0,0,0,.6)'; cx.lineWidth = HW * 0.04; cx.stroke(); linePath(s * 1.0, d0, d1, 4); cx.strokeStyle = '#9a9a96'; cx.lineWidth = HW * 0.045; cx.stroke(); });
  stripPath(-1, 1, d0, d1, 3); cx.fillStyle = PAT.asphalt; cx.fill();
  [-0.5, 0.5].forEach(function (c) { stripPath(c - 0.12, c + 0.12, d0, d1, 4); cx.fillStyle = 'rgba(0,0,0,.2)'; cx.fill(); });
  [-0.93, 0.93].forEach(function (c) { linePath(c, d0, d1, 3); cx.strokeStyle = 'rgba(235,235,225,.85)'; cx.lineWidth = HW * 0.035; cx.stroke(); });
  linePath(0, d0, d1, 3); cx.strokeStyle = 'rgba(235,235,225,.9)'; cx.lineWidth = HW * 0.04; cx.setLineDash([HW * 0.55, HW * 0.75]); cx.lineDashOffset = 0; cx.stroke(); cx.setLineDash([]);
  /* სველი ასფალტის ბზინვა */
  stripPath(-1, 1, d0, d1, 6); var gg = cx.createLinearGradient(0, 0, 0, 1); cx.fillStyle = 'rgba(120,150,200,.05)'; cx.fill();
}
function drawLandmarksGround(d0, d1, th) {
  var l = landmarks(), i, o = P_, s, k;
  for (i = 0; i < l.length; i++) {
    var m = l[i]; if (m.k === 'bridge' || m.d < d0 - HW * 8 || m.d > d1 + HW * 8) continue; s = lmSide(m.k);
    worldAt(track, m.d, s * 5, o); cx.save(); cx.translate(o.x, o.y); cx.rotate(o.h);
    var rg = cx.createRadialGradient(0, 0, HW, 0, 0, HW * 6.5); rg.addColorStop(0, '#4a4034'); rg.addColorStop(1, '#17130f'); cx.fillStyle = rg; cx.fillRect(-HW * 4.5, -HW * 5.5, HW * 9, HW * 11);
    if (m.k === 'narikala') {
      cx.strokeStyle = '#8a7a64'; cx.lineWidth = HW * 0.5; cx.lineJoin = 'round'; cx.beginPath(); cx.moveTo(-HW * 3.5 * s * -1, -HW * 4.5); cx.lineTo(HW * 1.5 * -s, -HW * 2.5); cx.lineTo(-HW * 1.2 * -s, 0); cx.lineTo(HW * 2 * -s, HW * 2); cx.lineTo(-HW * 2.5 * -s, HW * 4.5); cx.stroke();
      cx.strokeStyle = '#d6c7a8'; cx.lineWidth = HW * 0.5; cx.setLineDash([HW * 0.25, HW * 0.2]); cx.stroke(); cx.setLineDash([]);
      [[-2.2, -4], [1.6, -2.4], [0, 0], [1.9, 2], [-1.6, 4.4]].forEach(function (t, n) { var tx = t[0] * HW * -s * -1, ty = t[1] * HW, tr = HW * (n === 2 ? 1.1 : 0.8); var tg = cx.createRadialGradient(tx - tr * 0.3, ty - tr * 0.3, tr * 0.1, tx, ty, tr); tg.addColorStop(0, '#d8c8a2'); tg.addColorStop(0.6, '#8a7152'); tg.addColorStop(1, '#4a3a28'); cx.fillStyle = tg; cx.beginPath(); cx.arc(tx, ty, tr, 0, 7); cx.fill(); cx.strokeStyle = '#2a2016'; cx.lineWidth = HW * 0.06; cx.stroke(); cx.fillStyle = '#7a3a2a'; cx.beginPath(); cx.arc(tx, ty, tr * 0.5, 0, 7); cx.fill(); });
      cx.fillStyle = '#6a4a38'; cx.fillRect(-HW * 0.8, -HW * 1.4, HW * 1.5, HW * 0.8); cx.fillRect(HW * 0.6, HW * 0.6, HW * 1.2, HW * 0.9);
    } else {
      cx.fillStyle = PAT.stone; cx.fillRect(-HW * 3.2, -HW * 3.2, HW * 6.4, HW * 6.4);
      cx.fillStyle = '#c9b88e'; cx.fillRect(-HW * 0.9, -HW * 2.6, HW * 1.8, HW * 5.2); cx.fillRect(-HW * 2.6, -HW * 0.9, HW * 5.2, HW * 1.8);
      cx.strokeStyle = '#2a2418'; cx.lineWidth = HW * 0.05; cx.strokeRect(-HW * 0.9, -HW * 2.6, HW * 1.8, HW * 5.2); cx.strokeRect(-HW * 2.6, -HW * 0.9, HW * 5.2, HW * 1.8);
      [[0, -1.9, 0.5], [0, 1.9, 0.5], [-1.9, 0, 0.5], [1.9, 0, 0.5], [0, 0, 1.2]].forEach(function (t) { var tr = HW * t[2], tx = t[0] * HW, ty = t[1] * HW, dg = cx.createRadialGradient(tx - tr * 0.3, ty - tr * 0.3, tr * 0.1, tx, ty, tr); dg.addColorStop(0, '#fff2a8'); dg.addColorStop(0.5, '#d9a82a'); dg.addColorStop(1, '#6a4a10'); cx.fillStyle = dg; cx.beginPath(); cx.arc(tx, ty, tr, 0, 7); cx.fill(); cx.strokeStyle = '#4a3208'; cx.lineWidth = HW * 0.04; cx.stroke(); });
      cx.strokeStyle = '#fff2a8'; cx.lineWidth = HW * 0.06; cx.beginPath(); cx.moveTo(0, -HW * 0.5); cx.lineTo(0, HW * 0.5); cx.moveTo(-HW * 0.3, 0); cx.lineTo(HW * 0.3, 0); cx.stroke();
    }
    cx.restore(); worldAt(track, m.d, s * 5, o); glowList.push({ x: o.x, y: o.y, r: HW * 6, c: m.k === 'narikala' ? '255,170,80' : '255,220,150', a: 0.35 });
  }
}
function drawItems(now, sc) {
  var it = track.items, i, o = P_, R = W * 0.04 / sc, pulse;
  for (i = Math.max(0, me.ptr - 2); i < it.length; i++) {
    var q = it[i]; if (q.d > me.d + camRange) break; if (me.hit[i]) continue;
    if (q.k === 'pad') {
      worldAt(track, q.d + q.len / 2, q.x, o); cx.save(); cx.translate(o.x, o.y); cx.rotate(o.h);
      var pg = cx.createLinearGradient(0, q.len / 2, 0, -q.len / 2); pg.addColorStop(0, '#b86a00'); pg.addColorStop(1, '#ffe05a'); cx.fillStyle = pg; cx.fillRect(-HW * 0.38, -q.len / 2, HW * 0.76, q.len);
      cx.strokeStyle = '#3a2000'; cx.lineWidth = HW * 0.07; cx.lineJoin = 'miter'; for (var c = 0; c < 3; c++) { var cy_ = q.len * (0.3 - c * 0.3); cx.beginPath(); cx.moveTo(-HW * 0.25, cy_ + q.len * 0.1); cx.lineTo(0, cy_ - q.len * 0.1); cx.lineTo(HW * 0.25, cy_ + q.len * 0.1); cx.stroke(); }
      cx.restore(); glowList.push({ x: o.x, y: o.y, r: HW * 1.1, c: '255,190,40', a: 0.5 });
    } else {
      worldAt(track, q.d, q.x, o); pulse = 1 + 0.1 * Math.sin(now / 160 + i);
      cx.save(); cx.translate(o.x, o.y); cx.scale(1 / sc, 1 / sc); cx.scale(pulse, pulse);
      var og = cx.createRadialGradient(-W * 0.012, -W * 0.012, 2, 0, 0, W * 0.04); og.addColorStop(0, '#dffaff'); og.addColorStop(0.5, '#27C6FF'); og.addColorStop(1, '#0a3a9a'); cx.fillStyle = og; cx.beginPath(); cx.arc(0, 0, W * 0.04, 0, 7); cx.fill();
      cx.strokeStyle = '#fff'; cx.lineWidth = 2.5; cx.stroke(); cx.fillStyle = '#fff'; var u = W * 0.04; cx.beginPath(); cx.moveTo(u * 0.15, -u * 0.7); cx.lineTo(-u * 0.4, u * 0.1); cx.lineTo(-u * 0.02, u * 0.1); cx.lineTo(-u * 0.15, u * 0.7); cx.lineTo(u * 0.42, -u * 0.15); cx.lineTo(u * 0.04, -u * 0.15); cx.fill();
      cx.restore(); glowList.push({ x: o.x, y: o.y, r: W * 0.1 / sc, c: '60,200,255', a: 0.6 });
    }
  }
}
function drawFinishGround() {
  var o = P_, c, r, cell = HW * 2 / 14, lo = L;
  worldAt(track, lo + cell, 0, o); cx.save(); cx.translate(o.x, o.y); cx.rotate(o.h);
  for (r = 0; r < 3; r++) for (c = 0; c < 14; c++) { cx.fillStyle = (c + r) % 2 ? '#f2f2f2' : '#111'; cx.fillRect(-HW + c * cell, -cell * (r + 1) + cell, cell + 0.02, cell + 0.02); }
  cx.restore();
  worldAt(track, 1, 0, o); cx.save(); cx.translate(o.x, o.y); cx.rotate(o.h); cx.fillStyle = 'rgba(240,240,230,.8)'; cx.fillRect(-HW, -HW * 0.05, HW * 2, HW * 0.08); cx.fillStyle = 'rgba(240,240,230,.5)'; cx.fillRect(-HW * 0.7, HW * 0.2, HW * 0.55, HW * 0.04); cx.fillRect(HW * 0.15, HW * 0.2, HW * 0.55, HW * 0.04); cx.restore();
}
function drawGantry(sc) { /* ფინიშის თაღი — მანქანების ზემოდან */
  var o = P_, hgt = HW * 0.12; worldAt(track, L + HW * 0.1, 0, o); cx.save(); cx.translate(o.x, o.y); cx.rotate(o.h);
  cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(-HW * 1.25 + hgt, -HW * 0.3 + hgt * 2, HW * 2.5, HW * 0.6);
  [-1.2, 1.2].forEach(function (s) { cx.fillStyle = '#1a1c22'; cx.beginPath(); cx.arc(s * HW, 0, HW * 0.14, 0, 7); cx.fill(); cx.fillStyle = '#c9a24b'; cx.beginPath(); cx.arc(s * HW, 0, HW * 0.07, 0, 7); cx.fill(); });
  var bg = cx.createLinearGradient(0, -HW * 0.3, 0, HW * 0.3); bg.addColorStop(0, '#2a2d38'); bg.addColorStop(1, '#101218'); cx.fillStyle = bg; cx.fillRect(-HW * 1.15, -HW * 0.3, HW * 2.3, HW * 0.6);
  for (var c = 0; c < 26; c++) { cx.fillStyle = c % 2 ? '#f4f4f4' : '#111'; cx.fillRect(-HW * 1.15 + c * HW * 2.3 / 26, -HW * 0.3, HW * 2.3 / 26, HW * 0.08); cx.fillStyle = c % 2 ? '#111' : '#f4f4f4'; cx.fillRect(-HW * 1.15 + c * HW * 2.3 / 26, HW * 0.22, HW * 2.3 / 26, HW * 0.08); }
  cx.fillStyle = '#fff'; cx.font = '900 ' + Math.round(HW * 0.3) + 'px "Noto Sans Georgian",sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('ფინიში', 0, HW * 0.01);
  cx.restore(); glowList.push({ x: o.x, y: o.y, r: HW * 2.6, c: '255,255,255', a: 0.35 });
}
function drawBridge(sc) {
  var m = landmarks()[2], o = P_; if (Math.abs(m.d - me.d) > camRange + HW * 4 && Math.abs(m.d - opp.rd) > camRange) return;
  worldAt(track, m.d, 0, o); cx.save(); cx.translate(o.x, o.y); cx.rotate(o.h);
  var w = HW * 4.6, dp = HW * 1.5;
  cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(-w / 2 + HW * 0.25, -dp / 2 + HW * 0.35, w, dp);
  var g = cx.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, 'rgba(150,200,255,.55)'); g.addColorStop(0.5, 'rgba(210,235,255,.35)'); g.addColorStop(1, 'rgba(150,200,255,.55)'); cx.fillStyle = g; cx.fillRect(-w / 2, -dp / 2, w, dp);
  cx.strokeStyle = 'rgba(30,40,60,.9)'; cx.lineWidth = HW * 0.07; cx.strokeRect(-w / 2, -dp / 2, w, dp); cx.beginPath(); for (var i = -4; i <= 4; i++) { cx.moveTo(i * w / 9, -dp / 2); cx.lineTo(i * w / 9 + w * 0.02, dp / 2); } cx.stroke();
  for (i = 0; i < 40; i++) { cx.fillStyle = 'hsl(' + ((i * 37 + Date.now() / 30) % 360) + ',90%,65%)'; cx.beginPath(); cx.arc(-w / 2 + i * w / 39, i % 2 ? -dp / 2 : dp / 2, HW * 0.06, 0, 7); cx.fill(); }
  cx.restore(); glowList.push({ x: o.x, y: o.y, r: HW * 4, c: '120,170,255', a: 0.4 });
}
/* ---------- მანქანები ზემოდან ---------- */
function rrect(x, y, w, h, r) { r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
var STY = {
  me: { b: ['#ff6a5a', '#c4161f', '#4a0710'], glass: '#0a1020', neon: '255,60,40', stripe: 'rgba(255,255,255,.85)' },
  opp: { b: ['#7fd8ff', '#1a5ea8', '#07163a'], glass: '#050b18', neon: '60,190,255', stripe: 'rgba(120,230,255,.9)' },
  rust: { b: ['#d8b08a', '#8a5a3c', '#3a2418'], glass: '#1a1a1a', neon: '0,0,0', stripe: 'rgba(0,0,0,0)' }
};
function bodyGrad(L, st) { var hw = L * 0.22, g = cx.createLinearGradient(-hw, 0, hw, 0); g.addColorStop(0, st.b[2]); g.addColorStop(0.25, st.b[1]); g.addColorStop(0.5, st.b[0]); g.addColorStop(0.75, st.b[1]); g.addColorStop(1, st.b[2]); return g; }
function carTop(L, st, plane) {
  var w = L * 0.44, hw = w / 2, i, s;
  cx.save(); cx.fillStyle = 'rgba(0,0,0,.5)'; rrect(-hw + L * 0.05, -L / 2 + L * 0.07, w, L, w * 0.4); cx.fill(); cx.restore();
  if (plane) {
    cx.fillStyle = bodyGrad(L, st);
    cx.beginPath(); cx.moveTo(-L * 0.62, L * 0.18); cx.lineTo(-L * 0.08, -L * 0.1); cx.lineTo(-L * 0.08, L * 0.08); cx.lineTo(-L * 0.55, L * 0.3); cx.closePath(); cx.fill();
    cx.beginPath(); cx.moveTo(L * 0.62, L * 0.18); cx.lineTo(L * 0.08, -L * 0.1); cx.lineTo(L * 0.08, L * 0.08); cx.lineTo(L * 0.55, L * 0.3); cx.closePath(); cx.fill();
    cx.beginPath(); cx.moveTo(-L * 0.26, L * 0.42); cx.lineTo(-L * 0.06, L * 0.3); cx.lineTo(-L * 0.06, L * 0.46); cx.fill(); cx.beginPath(); cx.moveTo(L * 0.26, L * 0.42); cx.lineTo(L * 0.06, L * 0.3); cx.lineTo(L * 0.06, L * 0.46); cx.fill();
    cx.beginPath(); cx.moveTo(0, -L * 0.52); cx.bezierCurveTo(L * 0.11, -L * 0.3, L * 0.1, L * 0.2, L * 0.05, L * 0.5); cx.lineTo(-L * 0.05, L * 0.5); cx.bezierCurveTo(-L * 0.1, L * 0.2, -L * 0.11, -L * 0.3, 0, -L * 0.52); cx.fill();
    cx.fillStyle = st.glass; cx.beginPath(); cx.ellipse(0, -L * 0.18, L * 0.05, L * 0.12, 0, 0, 7); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.35)'; cx.beginPath(); cx.ellipse(-L * 0.015, -L * 0.21, L * 0.015, L * 0.05, 0, 0, 7); cx.fill();
    cx.strokeStyle = st.stripe; cx.lineWidth = L * 0.015; cx.beginPath(); cx.moveTo(0, -L * 0.1); cx.lineTo(0, L * 0.45); cx.stroke();
    return;
  }
  cx.fillStyle = '#0b0c10'; for (s = -1; s <= 1; s += 2) { rrect(s * hw - L * 0.045 + (s > 0 ? L * 0.02 : -L * 0.02), -L * 0.38, L * 0.09, L * 0.2, L * 0.025); cx.fill(); rrect(s * hw - L * 0.045 + (s > 0 ? L * 0.02 : -L * 0.02), L * 0.2, L * 0.09, L * 0.2, L * 0.025); cx.fill(); }
  cx.fillStyle = bodyGrad(L, st);
  cx.beginPath(); cx.moveTo(0, -L * 0.5); cx.bezierCurveTo(hw * 0.62, -L * 0.5, hw * 0.95, -L * 0.4, hw, -L * 0.28); cx.lineTo(hw, L * 0.3); cx.bezierCurveTo(hw, L * 0.45, hw * 0.7, L * 0.5, hw * 0.5, L * 0.5); cx.lineTo(-hw * 0.5, L * 0.5); cx.bezierCurveTo(-hw * 0.7, L * 0.5, -hw, L * 0.45, -hw, L * 0.3); cx.lineTo(-hw, -L * 0.28); cx.bezierCurveTo(-hw * 0.95, -L * 0.4, -hw * 0.62, -L * 0.5, 0, -L * 0.5); cx.closePath(); cx.fill();
  var sh = cx.createLinearGradient(0, -L / 2, 0, L / 2); sh.addColorStop(0, 'rgba(255,255,255,.28)'); sh.addColorStop(0.4, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.35)'); cx.fill(); cx.fillStyle = sh; cx.fill();
  cx.strokeStyle = 'rgba(0,0,0,.55)'; cx.lineWidth = L * 0.012; cx.stroke();
  cx.fillStyle = st.stripe; cx.fillRect(-hw * 0.12, -L * 0.5, hw * 0.24, L); cx.fillRect(-hw * 0.5, -L * 0.5, hw * 0.06, L * 0.9); cx.fillRect(hw * 0.44, -L * 0.5, hw * 0.06, L * 0.9);
  var gg = cx.createLinearGradient(0, -L * 0.16, 0, L * 0.05); gg.addColorStop(0, '#3f6fa8'); gg.addColorStop(1, st.glass); cx.fillStyle = gg;
  cx.beginPath(); cx.moveTo(-hw * 0.62, -L * 0.16); cx.lineTo(hw * 0.62, -L * 0.16); cx.lineTo(hw * 0.82, -L * 0.02); cx.lineTo(-hw * 0.82, -L * 0.02); cx.closePath(); cx.fill();
  cx.beginPath(); cx.moveTo(-hw * 0.7, L * 0.2); cx.lineTo(hw * 0.7, L * 0.2); cx.lineTo(hw * 0.55, L * 0.31); cx.lineTo(-hw * 0.55, L * 0.31); cx.closePath(); cx.fill();
  cx.fillStyle = st.glass; cx.fillRect(-hw * 0.84, -L * 0.02, hw * 0.12, L * 0.22); cx.fillRect(hw * 0.72, -L * 0.02, hw * 0.12, L * 0.22);
  cx.fillStyle = bodyGrad(L, st); cx.fillRect(-hw * 0.72, -L * 0.02, hw * 1.44, L * 0.22); cx.fillStyle = 'rgba(255,255,255,.2)'; cx.fillRect(-hw * 0.72, -L * 0.02, hw * 1.44, L * 0.05); cx.strokeStyle = 'rgba(0,0,0,.45)'; cx.lineWidth = L * 0.01; cx.strokeRect(-hw * 0.72, -L * 0.02, hw * 1.44, L * 0.22);
  cx.fillStyle = '#0d0e12'; rrect(-hw * 1.05, L * 0.4, w * 1.05, L * 0.055, L * 0.015); cx.fill(); cx.fillStyle = st.b[1]; cx.fillRect(-hw * 1.0, L * 0.41, w * 0.95, L * 0.02);
  cx.fillStyle = '#111'; cx.fillRect(-hw * 1.12, -L * 0.14, hw * 0.14, L * 0.07); cx.fillRect(hw * 0.98, -L * 0.14, hw * 0.14, L * 0.07);
  cx.fillStyle = '#fff6c8'; cx.fillRect(-hw * 0.78, -L * 0.455, hw * 0.5, L * 0.03); cx.fillRect(hw * 0.28, -L * 0.455, hw * 0.5, L * 0.03);
  cx.fillStyle = '#ff2630'; cx.fillRect(-hw * 0.86, L * 0.475, hw * 0.55, L * 0.02); cx.fillRect(hw * 0.31, L * 0.475, hw * 0.55, L * 0.02);
  if (st.neon !== '0,0,0') { cx.strokeStyle = 'rgba(' + st.neon + ',.95)'; cx.lineWidth = L * 0.014; cx.beginPath(); cx.moveTo(-hw * 0.9, -L * 0.3); cx.lineTo(-hw * 0.9, L * 0.3); cx.moveTo(hw * 0.9, -L * 0.3); cx.lineTo(hw * 0.9, L * 0.3); cx.stroke(); }
}
function carLights(L, st, a, plane) {
  var w = L * 0.44, hw = w / 2, g, i;
  cx.save(); cx.globalCompositeOperation = 'lighter';
  if (!plane || a.cone) { g = cx.createLinearGradient(0, -L * 0.5, 0, -L * 3.4); g.addColorStop(0, 'rgba(255,240,200,.5)'); g.addColorStop(1, 'rgba(255,240,200,0)'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(-hw * 0.8, -L * 0.48); cx.lineTo(-hw * 3.2, -L * 3.4); cx.lineTo(hw * 3.2, -L * 3.4); cx.lineTo(hw * 0.8, -L * 0.48); cx.closePath(); cx.fill(); }
  if (!plane) for (i = -1; i <= 1; i += 2) { g = cx.createRadialGradient(i * hw * 0.55, L * 0.5, 0, i * hw * 0.55, L * 0.5, L * 0.28); g.addColorStop(0, 'rgba(255,40,50,' + (a.brake ? 0.95 : 0.6) + ')'); g.addColorStop(1, 'rgba(255,40,50,0)'); cx.fillStyle = g; cx.fillRect(i * hw * 0.55 - L * 0.3, L * 0.2, L * 0.6, L * 0.6); }
  if (st.neon !== '0,0,0') { g = cx.createRadialGradient(0, 0, L * 0.1, 0, 0, L * 0.9); g.addColorStop(0, 'rgba(' + st.neon + ',.28)'); g.addColorStop(1, 'rgba(' + st.neon + ',0)'); cx.fillStyle = g; cx.fillRect(-L, -L, L * 2, L * 2); }
  if (a.bk > 0.08) {
    var fl = 0.8 + 0.2 * Math.sin(a.now / 40), len = L * (0.5 + 1.8 * a.bk) * fl;
    for (i = -1; i <= 1; i += 2) { var fx = plane ? i * L * 0.14 : i * hw * 0.5; g = cx.createLinearGradient(0, L * 0.5, 0, L * 0.5 + len); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.2, 'rgba(110,210,255,.9)'); g.addColorStop(1, 'rgba(30,80,255,0)'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(fx - L * 0.06, L * 0.5); cx.lineTo(fx + L * 0.06, L * 0.5); cx.lineTo(fx, L * 0.5 + len); cx.closePath(); cx.fill(); }
  }
  cx.restore();
}
/* ტრანსფორმერის ნაწილები: [x,y,w,h,rot] ან ბორბლისთვის [x,y,r] */
var PARTS = [
  ['body', 'paint', [0, 0, .44, 1.0, 0], [0, 0, .15, .9, 0], [0, .1, .62, .5, 0], .5, 0],
  ['hood', 'paint', [0, -.3, .38, .3, 0], [0, -.48, .12, .2, 0], [0, -.08, .46, .2, 0], .8, .1],
  ['cabin', 'glass', [0, .02, .34, .3, 0], [0, -.2, .1, .22, 0], [0, -.22, .26, .24, 0], 1, .15],
  ['roof', 'paint', [0, .05, .3, .2, 0], [0, 0, .07, .3, 0], [0, -.22, .2, .16, 0], 1.05, .2],
  ['trunk', 'paint', [0, .33, .38, .2, 0], [0, .42, .1, .24, 0], [0, .3, .5, .34, 0], .9, .1],
  ['spoiler', 'paint', [0, .45, .5, .05, 0], [0, .5, .5, .1, 0], [0, 0, 1.1, .14, 0], .9, .25],
  ['doorL', 'paint', [-.2, .02, .05, .4, 0], [-.36, .05, .6, .16, -.3], [-.7, -.02, .2, .46, 0], .7, .05],
  ['doorR', 'paint', [.2, .02, .05, .4, 0], [.36, .05, .6, .16, .3], [.7, -.02, .2, .46, 0], .7, .05],
  ['fb', 'dark', [0, -.47, .4, .06, 0], [0, -.2, .04, .1, 0], [0, .46, .5, .1, 0], .3, .3],
  ['rb', 'dark', [0, .49, .4, .06, 0], [0, .46, .03, .2, 0], [0, .56, .36, .1, 0], .2, .35],
  ['faL', 'dark', [-.05, 0, .05, .05, 0], [-.1, 0, .04, .04, 0], [-.76, -.4, .17, .4, 0], .8, .4],
  ['faR', 'dark', [.05, 0, .05, .05, 0], [.1, 0, .04, .04, 0], [.76, -.4, .17, .4, 0], .8, .4],
  ['fistL', 'wheel', [-.24, -.3, .09], [-.14, -.08, .05], [-.8, -.7, .13], 1, .3],
  ['fistR', 'wheel', [.24, -.3, .09], [.14, -.08, .05], [.8, -.7, .13], 1, .3],
  ['footL', 'wheel', [-.24, .3, .09], [-.5, .18, .03], [-.2, .54, .1], .2, .2],
  ['footR', 'wheel', [.24, .3, .09], [.5, .18, .03], [.2, .54, .1], .2, .2],
  ['eyeL', 'light', [-.14, -.47, .14, .025, 0], [-.04, -.55, .03, .03, 0], [-.07, -.24, .07, .035, 0], 1, .5],
  ['eyeR', 'light', [.14, -.47, .14, .025, 0], [.04, -.55, .03, .03, 0], [.07, -.24, .07, .035, 0], 1, .5],
  ['clL', 'light', [-.15, .495, .14, .02, 0], [-.05, .5, .02, .02, 0], [-.15, .3, .1, .05, 0], .6, .5],
  ['clR', 'light', [.15, .495, .14, .02, 0], [.05, .5, .02, .02, 0], [.15, .3, .1, .05, 0], .6, .5]
];
function lerpA(a, b, t) { var o = [], i; for (i = 0; i < b.length; i++) o.push((a[i] === undefined ? b[i] : a[i]) + (b[i] - (a[i] === undefined ? b[i] : a[i])) * t); return o; }
function partsDraw(L, st, plane, T, endPose, now) {
  var glowEyes = [], k, p, i, e = ease(clamp(T, 0, 1)), sc0 = 1 + 0.5 * e, endB = endPose.b || 0, bob = Math.sin(now / 300) * 0.01;
  var order = PARTS.slice().sort(function (a, b) { return a[5] - b[5]; });
  cx.save(); cx.scale(sc0, sc0);
  for (var pass = 0; pass < 2; pass++) for (k = 0; k < order.length; k++) {
    p = order[k]; var tt = ease(clamp((T - p[6] * 0.55) / 0.45, 0, 1)), base = plane ? p[3] : p[2], rob = p[4].slice();
    var nm = p[0], w_ = endPose.w || 0, l_ = endPose.l || 0;
    if (endB > 0) {
      if (w_) { if (nm === 'fistL' || nm === 'fistR') { var sg = nm === 'fistL' ? -1 : 1; rob = [sg * 0.6, -0.8 + bob * 3, 0.19]; } if (nm === 'faL' || nm === 'faR') { sg = nm === 'faL' ? -1 : 1; rob = [sg * 0.68, -0.5, 0.17, 0.5, sg * 0.25]; } if (nm === 'doorL' || nm === 'doorR') { sg = nm === 'doorL' ? -1 : 1; rob = [sg * 0.66, -0.16, 0.2, 0.44, sg * 0.3]; } }
      if (l_) { if (nm === 'fistL' || nm === 'fistR') { sg = nm === 'fistL' ? -1 : 1; rob = [sg * 0.74, 0.2, 0.1]; } if (nm === 'cabin' || nm === 'roof') rob = [rob[0], rob[1] + 0.05, rob[2], rob[3], rob[4]]; }
      var tgt = rob, src = p[4]; rob = lerpA(p[4], tgt, endB);
    }
    var pose = lerpA(base, rob, tt), zz = p[5] * (0.15 + 0.85 * tt) * (w_ && (nm === 'fistL' || nm === 'fistR') ? 1 + endB : 1);
    if (pass === 0) { cx.save(); cx.fillStyle = 'rgba(0,0,0,.4)'; var so = L * (0.04 + 0.09 * zz); if (p[1] === 'wheel') { cx.beginPath(); cx.arc(pose[0] * L + so, pose[1] * L + so * 1.5, pose[2] * L, 0, 7); cx.fill(); } else if (p[1] !== 'light') { cx.translate(pose[0] * L + so, pose[1] * L + so * 1.5); cx.rotate(pose[4]); rrect(-pose[2] * L / 2, -pose[3] * L / 2, pose[2] * L, pose[3] * L, L * 0.02); cx.fill(); } cx.restore(); continue; }
    cx.save();
    if (p[1] === 'wheel') {
      var r = pose[2] * L; cx.translate(pose[0] * L, pose[1] * L); cx.fillStyle = '#0c0d11'; cx.beginPath(); cx.arc(0, 0, r, 0, 7); cx.fill();
      var rg = cx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r * 0.65); rg.addColorStop(0, '#f4f6fa'); rg.addColorStop(1, '#7c8497'); cx.fillStyle = rg; cx.beginPath(); cx.arc(0, 0, r * 0.62, 0, 7); cx.fill();
      cx.strokeStyle = '#3a3f4d'; cx.lineWidth = r * 0.12; for (i = 0; i < 5; i++) { cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(Math.cos(i * 1.2566) * r * 0.6, Math.sin(i * 1.2566) * r * 0.6); cx.stroke(); }
      if (tt > 0.9 && (nm === 'fistL' || nm === 'fistR')) { cx.strokeStyle = 'rgba(' + st.neon + ',.9)'; cx.lineWidth = r * 0.1; cx.beginPath(); cx.arc(0, 0, r * 0.95, 0, 7); cx.stroke(); }
    } else {
      cx.translate(pose[0] * L, pose[1] * L); cx.rotate(pose[4]); var pw = pose[2] * L, ph = pose[3] * L;
      if (p[1] === 'light') { var on = tt > 0.8 || T <= 0; cx.fillStyle = on ? (nm.indexOf('eye') === 0 ? '#bff4ff' : '#ff4a50') : '#ddd'; rrect(-pw / 2, -ph / 2, pw, ph, ph * 0.4); cx.fill(); if (tt > 0.8) glowEyes.push([cx.getTransform(), nm.indexOf('eye') === 0]); }
      else {
        var gr = cx.createLinearGradient(-pw / 2, 0, pw / 2, 0);
        if (p[1] === 'paint') { gr.addColorStop(0, st.b[2]); gr.addColorStop(0.3, st.b[1]); gr.addColorStop(0.55, st.b[0]); gr.addColorStop(1, st.b[2]); } else if (p[1] === 'glass') { gr.addColorStop(0, st.glass); gr.addColorStop(0.5, '#4a7bb5'); gr.addColorStop(1, st.glass); } else { gr.addColorStop(0, '#15171c'); gr.addColorStop(0.5, '#3a3e4a'); gr.addColorStop(1, '#15171c'); }
        cx.fillStyle = gr; rrect(-pw / 2, -ph / 2, pw, ph, Math.min(pw, ph) * 0.3); cx.fill(); cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = L * 0.008; cx.beginPath(); cx.moveTo(-pw / 2 + 1, ph / 2 - 2); cx.lineTo(-pw / 2 + 1, -ph / 2 + 2); cx.lineTo(pw / 2 - 2, -ph / 2 + 1); cx.stroke(); cx.strokeStyle = 'rgba(0,0,0,.6)'; cx.lineWidth = L * 0.01; rrect(-pw / 2, -ph / 2, pw, ph, Math.min(pw, ph) * 0.3); cx.stroke();
      }
    }
    cx.restore();
  }
  cx.restore();
  return glowEyes;
}
/* ---------- მთავარი ხატვა ---------- */
var camRange = 100, shakeN = 0;
function applyCam(cw, sc, ox, oy) { cx.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr); cx.translate(W / 2, H * 0.68); cx.rotate(-cam.h); cx.scale(sc, sc); cx.translate(-cw.x, -cw.y); }
function addSparks(x, y, n, spd) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = Math.random() * spd; sparksW.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 0, m: 0.35 + Math.random() * 0.4 }); } }
function drawVehicle(pos, ang, L, st, plane, a, parts) {
  cx.save(); cx.translate(pos.x, pos.y); cx.rotate(ang);
  var ge = null;
  if (parts) ge = partsDraw(L, st, plane, parts.T, parts.end, a.now); else carTop(L, st, plane);
  cx.restore(); return ge;
}
function draw(now, dt) {
  var th = track.theme, fin = race && race.state === 'finale', ft = fin ? race.ft : 0, sc0 = (W * 0.46) / (2 * HW), zoom = fin ? 1 + 0.6 * ease(ft / 1.4) : 1, sc = sc0 * zoom, Lp = W * 0.19, L_ = Lp / sc, stopD = L + HW * 1.6;
  var cwp, th_, mePos, oppPos, meAng, oppAng, T = 0, endB = 0, i, o = {};
  if (!fin) { cwp = worldAt(track, me.d, me.x * 0.45, {}); th_ = headAt(track, me.d + BASE * 0.5); }
  else { cwp = worldAt(track, stopD, 0, {}); th_ = headAt(track, stopD); }
  if (!cam.init) { cam.h = th_; cam.init = true; }
  cam.h += angd(cam.h, th_) * Math.min(1, dt * (fin ? 2 : 4.2));
  camRange = H * 0.68 / sc * 1.15 + HW * 2; var back = H * 0.36 / sc * 1.5 + HW * 2, base = fin ? stopD : me.d, d0 = Math.max(0, base - back), d1 = Math.min(track.N - 2, base + camRange);
  var amp = fin ? 0 : shake * 7 + me.bk * 1.4, ox = (Math.random() - 0.5) * amp, oy = (Math.random() - 0.5) * amp;
  /* მანქანების პოზიციები */
  mePos = worldAt(track, me.d, me.x, {}); meAng = mePos.h + me.slip; oppPos = worldAt(track, opp.rd, opp.rx, {}); oppAng = oppPos.h + (opp.slip || 0);
  if (fin) {
    var gt = ease(ft / 1.4), tm = worldAt(track, stopD, race.won ? -0.5 : 0.5, {}), to = worldAt(track, stopD, race.won ? 0.5 : -0.5, {}), f0 = race.f0;
    mePos = { x: f0.me.x + (tm.x - f0.me.x) * gt, y: f0.me.y + (tm.y - f0.me.y) * gt }; oppPos = { x: f0.opp.x + (to.x - f0.opp.x) * gt, y: f0.opp.y + (to.y - f0.opp.y) * gt };
    meAng = f0.me.a + angd(f0.me.a, tm.h) * gt; oppAng = f0.opp.a + angd(f0.opp.a, to.h) * gt;
    T = clamp((ft - 2.0) / 3.4, 0, 1); endB = ease(clamp((ft - 5.4) / 0.8, 0, 1));
  }
  /* ნაწილაკები: კვამლი და დრიფტის კვალი */
  if (!fin) [[me, mePos, meAng], [opp, oppPos, oppAng]].forEach(function (c) {
    var dr = c[0] === me ? me.drift : opp.s; if (!dr) { c.last = null; return; }
    var fw = { x: Math.sin(c[2]), y: -Math.cos(c[2]) }, rt = { x: -fw.y * -1, y: fw.x * -1 };
    [-1, 1].forEach(function (sd) { var px = c[1].x - fw.x * L_ * 0.38 + (-fw.y) * sd * L_ * 0.18, py = c[1].y - fw.y * L_ * 0.38 + fw.x * sd * L_ * 0.18; if (Math.random() < 0.7) smoke.push({ x: px, y: py, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, l: 0, m: 0.9 + Math.random() * 0.5, r: L_ * 0.12 }); var k = c[0] === me ? 'm' : 'o'; var key = k + sd; if (skids[key + 'p']) skids.push({ x1: skids[key + 'p'][0], y1: skids[key + 'p'][1], x2: px, y2: py, t: now }); skids[key + 'p'] = [px, py]; });
  }); else { skids.length = 0; }
  if (skids.length > 260) skids.splice(0, skids.length - 260);
  smoke = smoke.filter(function (p) { p.l += dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.l < p.m; });
  sparksW = sparksW.filter(function (p) { p.l += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; return p.l < p.m; });
  /* სამყარო */
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = th.ground; cx.fillRect(0, 0, W, H);
  applyCam(cwp, sc, ox, oy); glowList.length = 0;
  drawBuildings(d0, d1, th); drawLandmarksGround(d0, d1, th); drawRoad(d0, d1, th); drawProps(d0, d1, th); drawFinishGround();
  cx.lineCap = 'round'; for (i = 0; i < skids.length; i++) { var sk = skids[i]; if (isNaN(sk.x1)) continue; cx.strokeStyle = 'rgba(8,8,10,' + Math.max(0, 0.5 - (now - sk.t) / 12000).toFixed(2) + ')'; cx.lineWidth = L_ * 0.06; cx.beginPath(); cx.moveTo(sk.x1, sk.y1); cx.lineTo(sk.x2, sk.y2); cx.stroke(); }
  drawItems(now, sc);
  smoke.forEach(function (p) { var k = p.l / p.m; cx.fillStyle = 'rgba(190,190,200,' + (0.42 * (1 - k)).toFixed(3) + ')'; cx.beginPath(); cx.arc(p.x, p.y, p.r * (1 + k * 2.2), 0, 7); cx.fill(); });
  /* ღამის დაბნელება + სინათლეები */
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.globalCompositeOperation = 'multiply'; cx.fillStyle = th.dark; cx.fillRect(0, 0, W, H); cx.globalCompositeOperation = 'source-over';
  applyCam(cwp, sc, ox, oy); cx.globalCompositeOperation = 'lighter';
  lampList.forEach(function (p) { var g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, HW * 3.3); g.addColorStop(0, 'rgba(' + th.lamp + ',.34)'); g.addColorStop(0.45, 'rgba(' + th.lamp + ',.12)'); g.addColorStop(1, 'rgba(' + th.lamp + ',0)'); cx.fillStyle = g; cx.fillRect(p.x - HW * 3.3, p.y - HW * 3.3, HW * 6.6, HW * 6.6); });
  glowList.forEach(function (p) { var g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, 'rgba(' + p.c + ',' + p.a + ')'); g.addColorStop(1, 'rgba(' + p.c + ',0)'); cx.fillStyle = g; cx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); });
  cx.globalCompositeOperation = 'source-over';
  /* მანქანები */
  var plane = th.v === 'plane', eyes = [], ge, partsMe = fin && T > 0 ? { T: T, end: { b: endB, w: race.won ? 1 : 0, l: race.won ? 0 : 1 } } : null, partsOpp = fin && T > 0 ? { T: T, end: { b: endB, w: race.won ? 0 : 1, l: race.won ? 1 : 0 } } : null;
  var list = [{ pos: oppPos, ang: oppAng, st: STY.opp, pr: partsOpp, car: opp, mine: false }, { pos: mePos, ang: meAng, st: STY.me, pr: partsMe, car: me, mine: true }];
  if (!fin && opp.rd > me.d) list.reverse(); 
  list.forEach(function (c) {
    var rel = c.mine ? 0 : (opp.rd - me.d); if (!fin && (rel > camRange + 20 || rel < -back - 20)) return;
    ge = drawVehicle(c.pos, c.ang, L_, c.st, plane, { now: now }, c.pr); if (ge) eyes = eyes.concat(ge);
    cx.save(); cx.translate(c.pos.x, c.pos.y); cx.rotate(c.ang);
    if (!c.pr) { cx.globalCompositeOperation = 'lighter'; cx.restore(); cx.save(); cx.translate(c.pos.x, c.pos.y); cx.rotate(c.ang); carLights(L_, c.st, { bk: fin ? 0 : (c.mine ? me.bk : (opp.b ? 0.9 : 0)), brake: fin, now: now, cone: true }, plane); }
    cx.restore();
  });
  if (eyes.length) { cx.save(); cx.globalCompositeOperation = 'lighter'; eyes.forEach(function (e) { cx.setTransform(e[0]); var g = cx.createRadialGradient(0, 0, 0, 0, 0, L_ * 0.2); g.addColorStop(0, e[1] ? 'rgba(160,240,255,.95)' : 'rgba(255,60,70,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = g; cx.fillRect(-L_ * 0.2, -L_ * 0.2, L_ * 0.4, L_ * 0.4); }); cx.restore(); }
  applyCam(cwp, sc, ox, oy);
  if (!fin) { drawGantry(sc); drawBridge(sc); } else drawGantry(sc);
  cx.globalCompositeOperation = 'lighter';
  sparksW.forEach(function (p) { cx.fillStyle = 'rgba(255,' + (150 + Math.floor(p.l / p.m * 90)) + ',60,' + (1 - p.l / p.m).toFixed(2) + ')'; cx.beginPath(); cx.arc(p.x, p.y, L_ * 0.018, 0, 7); cx.fill(); });
  if (fin && T > 0.4 && T < 1.1) { [mePos, oppPos].forEach(function (p) { var rr_ = Math.max(0.1, (T - 0.42) * L_ * 7), a = Math.max(0, 1 - (T - 0.42) / 0.5); cx.strokeStyle = 'rgba(255,230,180,' + a.toFixed(2) + ')'; cx.lineWidth = L_ * 0.12 * a; cx.beginPath(); cx.arc(p.x, p.y, rr_, 0, 7); cx.stroke(); }); if (T < 0.95) { addSparks(mePos.x, mePos.y, 3, L_ * 4); addSparks(oppPos.x, oppPos.y, 3, L_ * 4); } }
  cx.globalCompositeOperation = 'source-over';
  /* ეკრანის ეფექტები */
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!fin && me.bk > 0.12) { cx.strokeStyle = 'rgba(255,255,255,' + (0.1 + me.bk * 0.22).toFixed(2) + ')'; cx.lineWidth = 1.4; cx.beginPath(); for (i = 0; i < 10 + me.bk * 26; i++) { var lx = Math.random() * W, ly = Math.random() * H, ll = H * (0.06 + Math.random() * 0.14) * (0.5 + me.bk); cx.moveTo(lx, ly); cx.lineTo(lx, ly + ll); } cx.stroke(); }
  if (th.rain) { cx.strokeStyle = 'rgba(190,210,235,.3)'; cx.lineWidth = 1; cx.beginPath(); for (i = 0; i < 90; i++) { var rx = Math.random() * (W + 60), ry = Math.random() * H; cx.moveTo(rx, ry); cx.lineTo(rx - 6, ry + 20); } cx.stroke(); }
  var vg = cx.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,4,16,.62)'); cx.fillStyle = vg; cx.fillRect(0, 0, W, H);
  cx.save(); cx.globalCompositeOperation = 'overlay'; cx.globalAlpha = 0.05; var gc = grain(), gx = -Math.floor(Math.random() * 128), gy = -Math.floor(Math.random() * 128), xx, yy; for (xx = gx; xx < W; xx += 128) for (yy = gy; yy < H; yy += 128) cx.drawImage(gc, xx, yy); cx.restore();
  var tg = cx.createLinearGradient(0, 0, 0, H); tg.addColorStop(0, 'rgba(0,60,90,.10)'); tg.addColorStop(1, 'rgba(255,120,40,.08)'); cx.fillStyle = tg; cx.fillRect(0, 0, W, H);
  if (fin) { var fa = Math.max(0, 1 - Math.abs(T - 0.5) / 0.1) * (T > 0 ? 1 : 0); if (T <= 0.02 && ft > 1.95) fa = Math.max(fa, 1 - (ft - 1.95) / 0.1); if (fa > 0) { cx.fillStyle = 'rgba(255,255,255,' + clamp(fa, 0, 0.9).toFixed(2) + ')'; cx.fillRect(0, 0, W, H); } }
  if (!fin) minimap();
  if (hitFlash > 0) { cx.fillStyle = 'rgba(255,40,40,' + (hitFlash * 0.3).toFixed(2) + ')'; cx.fillRect(0, 0, W, H); }
}
function minimap() {
  var x = 10, y = H * 0.2, w = 22, h = H * 0.4, i;
  cx.save(); cx.fillStyle = 'rgba(8,10,16,.72)'; rrect(x, y, w, h, 8); cx.fill(); cx.strokeStyle = '#c9a24b'; cx.lineWidth = 2; cx.stroke();
  for (i = 0; i < 4; i++) { cx.fillStyle = i % 2 ? '#fff' : '#111'; cx.fillRect(x + 3 + i * 4, y + 4, 4, 4); cx.fillStyle = i % 2 ? '#111' : '#fff'; cx.fillRect(x + 3 + i * 4, y + 8, 4, 4); }
  cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.setLineDash([4, 5]); cx.beginPath(); cx.moveTo(x + w / 2, y + 16); cx.lineTo(x + w / 2, y + h - 6); cx.stroke(); cx.setLineDash([]);
  [[Math.max(0, opp.rd), '#7fd8ff', 1], [me.d, '#ff5a4a', -1]].forEach(function (c) { var yy = y + h - 8 - clamp(c[0] / L, 0, 1) * (h - 28); cx.fillStyle = c[1]; rrect(x + w / 2 - 5 + c[2] * 3, yy - 8, 8, 16, 3); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 1; cx.stroke(); });
  cx.restore();
}
/* ---------- მართვა ---------- */
function holdBtn(id, fn) {
  var el = $(id);
  el.addEventListener('pointerdown', function (e) { e.preventDefault(); Snd.unlock(); fn(1); el.classList.add('on'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { el.addEventListener(ev, function () { fn(0); el.classList.remove('on'); }); });
}
holdBtn('bL', function (v) { keys.l = v; });
holdBtn('bR', function (v) { keys.r = v; });
window.addEventListener('keydown', function (e) {
  if (!race) return;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.l = 1; else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.r = 1;
});
window.addEventListener('keyup', function (e) { if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.l = 0; else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.r = 0; });
/* თითის მოძრაობა ეკრანზე: მანქანა თითს მიჰყვება */
var dragState = null;
$('cv').addEventListener('pointerdown', function (e) { if (!race) return; Snd.unlock(); dragState = { id: e.pointerId, sx: e.clientX, x0: me.x }; try { $('cv').setPointerCapture(e.pointerId); } catch (x) {} });
$('cv').addEventListener('pointermove', function (e) { if (dragState && dragState.id === e.pointerId) drag = Math.max(-0.9, Math.min(0.9, dragState.x0 + (e.clientX - dragState.sx) / (W * 0.24))); });
['pointerup', 'pointercancel'].forEach(function (ev) { $('cv').addEventListener(ev, function (e) { if (dragState && dragState.id === e.pointerId) { dragState = null; drag = null; } }); });
$('sndBtn').onclick = function () { $('sndBtn').classList.toggle('off', Snd.toggle()); };
$('sndBtn').classList.toggle('off', Snd.muted());

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
window.__duel = { me: function () { return me; }, bot: function () { return bot; }, opp: function () { return opp; }, L: function () { return L; }, genTrack: genTrack, Runner: Runner, setPoints: setPoints, setSpeed: setSpeed, carData: carData, race: function () { return race; } };
})();
