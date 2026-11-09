(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

/* ---------- პარამეტრები ---------- */
/* ---------- პარამეტრები (ახალი რბოლა) ---------- */
var TOTAL = 42000, PER_CELL = 10, CELLS = TOTAL / PER_CELL, START_PTS = 10, NIT_MAX = 10, RACE_SEC = 120;
var HW = 8, G_LAT = 24, STEERV = 2.2, KP = 0.85 * STEERV * HW / G_LAT, BRAKE_X = 2.9;
var SPEEDS = { 1: { v: 50, n: 'საშუალო' }, 2: { v: 66, n: 'სწრაფი' }, 3: { v: 86, n: 'სუპერ სწრაფი' } };
var speedLvl = 1, VMAX = 50, ACC = 14, LEN = 3960;
function setSpeed(lvl) {
  speedLvl = SPEEDS[lvl] ? lvl : 1; VMAX = SPEEDS[speedLvl].v; ACC = 0.28 * VMAX; LEN = Math.round(VMAX * 0.76 * RACE_SEC);
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
  var ROOTS = [38, 34, 41, 36], CH = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];
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
      var i = mus.step, t = mus.next, bpm = 118 + musK * 14, sp = 60 / bpm / 4, bar = Math.floor(i / 16) % 4, st = i % 16, root = ROOTS[bar], ch = CH[bar], n;
      /* ყოველი მეოთხე დარტყმა (four-on-the-floor) და რბილი სნერი */
      if (st % 4 === 0) osc(t, 0.22, 110, 'sine', 0.7, 0, 45);
      if (st === 4 || st === 12) nz(t, 0.12, 0.2, 'bandpass', 1400, 1.2);
      if (st % 2 === 1) nz(t, 0.03, 0.09, 'highpass', 8000);
      /* ბასი: რიტმული ნოტები ფუძის ტონზე */
      if (st === 0 || st === 3 || st === 8 || st === 11) osc(t, sp * 2.2, mtof(root + 12), 'sawtooth', 0.22, 480 + musK * 300);
      /* არპეჯიო: 16-ე ნოტები აკორდის ტონებზე, ოქტავით მაღლა */
      n = ch[st % ch.length] + (st >= 8 ? 12 : 0);
      osc(t, sp * 0.9, mtof(root + 24 + n), 'sawtooth', 0.075, 1800 + musK * 900, 0, 0.005);
      /* პადი: აკორდი ყოველი ტაქტის დასაწყისში */
      if (st === 0) ch.forEach(function (iv) { osc(t, sp * 15, mtof(root + 36 + iv), 'triangle', 0.035, 1200, 0, 0.3); });
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
/* ---------- ტრასა: სწორი მონაკვეთები და მოსახვევები; ყოველ მოსახვევს თავისი სიჩქარის ზღვარი აქვს ---------- */
var THEMES_CAR = THEMES.filter(function (t) { return t.v === 'car'; });
function genTrack(seed) {
  var r = rng(seed), th = THEMES_CAR[Math.floor(r() * THEMES_CAR.length)];
  if (window.__forceTheme != null) th = THEMES_CAR[window.__forceTheme % THEMES_CAR.length];
  var N = Math.ceil(LEN + 240), kap = new Float32Array(N + 4), cx = new Float32Array(N + 2), cy = new Float32Array(N + 2), ch = new Float32Array(N + 2);
  var pos = 90, i, j, dir, f, R, ang, Lc, items = [], curves = [], d;
  while (pos < N) {
    dir = r() < 0.5 ? 1 : -1;
    f = 0.45 + r() * 0.65;                                  /* მოსახვევის სირთულე: 0.45 (ძალიან მკაცრი) … 1.1 (ღია) */
    R = Math.min(220, Math.max(14, f * f * VMAX * VMAX / G_LAT));
    ang = 0.6 + r() * 0.9; Lc = ang * R;
    for (j = 0; j < Lc && pos + j < N; j++) kap[Math.floor(pos + j)] = dir / R * Math.sin(Math.PI * j / Lc);
    curves.push({ d: pos, len: Lc, f: f, dir: dir });
    pos += Lc + 60 + r() * 120;
  }
  for (i = 0; i < N + 1; i++) { ch[i + 1] = ch[i] - kap[i]; cx[i + 1] = cx[i] + Math.sin(ch[i]); cy[i + 1] = cy[i] - Math.cos(ch[i]); }
  d = 60;
  while (d < LEN - 40) { items.push({ k: r() < 0.7 ? 'nit' : 'pad', d: d, x: r() * 1.2 - 0.6 }); d += 45 + r() * 70; }
  /* საგზაო ობიექტები ტროტუარზე: განათების ბოძები, ურნები, ღობეები (ეცემა შეჯახებისას) */
  var props = [];
  for (d = 30; d < LEN - 20; d += 44) { props.push({ k: 'lamp', d: d, x: 1.2 }); props.push({ k: 'lamp', d: d + 22, x: -1.2 }); }
  for (d = 50; d < LEN - 40; d += 70) if (r() < 0.5) props.push({ k: 'bin', d: d, x: r() < 0.5 ? 1.2 : -1.2 });
  for (d = 80; d < LEN - 40; d += 130) props.push({ k: 'fence', d: d, x: (r() < 0.5 ? 1 : -1) * 1.25, len: 18 });
  props.sort(function (a, b) { return a.d - b.d; });
  return { theme: th, items: items, seed: seed, kap: kap, cx: cx, cy: cy, ch: ch, N: N, curves: curves, props: props };
}
/* kapAt, headAt, worldAt — ქვემოთ (უცვლელი) */
function kapAt(t, d) { return t.kap[Math.max(0, Math.min(t.N, Math.floor(d)))]; }
function headAt(t, d) { d = Math.max(0, Math.min(t.N - 1, d)); var i = Math.floor(d), f = d - i; return t.ch[i] + (t.ch[i + 1] - t.ch[i]) * f; }
function worldAt(t, d, xr, o) {
  d = Math.max(0, Math.min(t.N - 1, d)); var i = Math.floor(d), f = d - i, h = t.ch[i] + (t.ch[i + 1] - t.ch[i]) * f, px = t.cx[i] + (t.cx[i + 1] - t.cx[i]) * f, py = t.cy[i] + (t.cy[i + 1] - t.cy[i]) * f;
  o = o || {}; o.x = px + Math.cos(h) * xr * HW; o.y = py + Math.sin(h) * xr * HW; o.h = h; return o;
}

/* ---------- მანქანის ფიზიკა ----------
   გაზი ავტომატურია (პედალი არ არის); ნიტროს აღებისას მანქანა ავტომატურად აჩქარდება
   rev — უკუსვლა: სიჩქარეზე მუხრუჭივით მუშაობს და დრიფტში აგებს მანქანას მოსახვევში; გაჩერებულზე უკან მიდის
   steer — მარცხნივ(-1) … მარჯვნივ(+1)
   მოსახვევში მანქანას გარე მხარეს აგდებს ცენტრიდანული ძალა; საჭე ვერ უმკლავდება თუ სიჩქარე დიდია */
function Car(x0) {
  this.d = 0; this.x = x0 || 0; this.vx = 0; this.v = 0; this.nit = 0; this.bk = 0;
  this.gas = false; this.rev = false; this.nitro = false; this.steer = 0; this.drift = false;
  this.fin = false; this.ev = []; this.ptr = 0; this.hit = {}; this.crashT = 0; this.h = 0; this.a = 0; this.boostT = 0;
  this.T = null;
}
Car.prototype.step = function (dt, T, gm) {
  var prev = this.d, k = kapAt(T, this.d), boost, vmaxNow, acc = 0, ax = Math.abs(this.x), sf, push, it = T.items, i, o, steerAuth, pr = T.props || [];
  this.ev.length = 0;
  this.boostT = Math.max(0, this.boostT - dt);
  boost = !this.rev && this.boostT > 0;
  vmaxNow = VMAX * (gm || 1) * (boost ? 1.3 : 1);
  /* გაზი ავტომატურია: მანქანა ყოველთვის მიდის. უკუსვლა (ტორმუზი) მოსახვევში დრიფტს იწვევს */
  /* დრიფტი: უკუსვლით მოსახვევში, ან მკვეთრ მოსახვევში სიჩქარით შესვლისას */
  this.drift = (!!this.rev && this.v > 8) || (Math.abs(k) > 0.008 && this.v > 0.6 * VMAX);
  if (this.rev) {
    if (this.v > 1) acc -= ACC * BRAKE_X * 0.8;             /* უკუსვლა მუხრუჭივით მუშაობს */
    else acc -= ACC * 0.7;                                   /* გაჩერების შემდეგ უკან მიდის */
    if (this.v < -0.3 * VMAX) acc = 0;
  } else {
    acc += ACC * (boost ? 1.8 : 1) * (1 - this.v / vmaxNow);
  }
  if (ax > 1.12) acc -= 0.26 * ACC * (Math.abs(this.v) / VMAX) * (this.v > 0 ? 1 : -1);  /* გზის გარეთ დრაგი */
  this.v = clamp(this.v + acc * dt, -0.3 * VMAX, vmaxNow);
  var av = Math.abs(this.v);
  sf = Math.min(1, av / (VMAX * 0.3));
  push = KP * this.v * this.v * k / HW;                       /* ცენტრიდანული ძალა მოსახვევში */
  if (this.rev && this.drift) push *= 0.4;                                  /* დრიფტი: მანქანა მოსახვევში შედის, არა გარეთ */
  steerAuth = this.drift ? 1.3 : 1;
  this.vx = push + this.steer * STEERV * sf * steerAuth;
  this.x += this.vx * dt;
  this.d = Math.max(0, this.d + this.v * dt);
  if (this.d >= LEN) this.fin = true;
  this.crashT -= dt;
  /* კიდე (ტროტუარის საზღვარი): მანქანა არ გადადის შენობებში, მხოლოდ მოსრიალებს და ანელებს; საჭით გამოდის */
  var WALL = 1.1, sg = this.x > 0 ? 1 : -1;
  if (Math.abs(this.x) > WALL) {
    if (this.vx * sg > 0) this.vx = 0;
    this.x = WALL * sg;
    this.v *= Math.exp(-0.15 * dt);
    if (this.crashT <= 0 && Math.abs(this.v) > 4) { this.crashT = 0.25; this.ev.push('scrape'); }
  }
  /* ტროტუარზე არსებულ ობიექტებთან შეჯახება */
  for (i = 0; i < pr.length; i++) {
    var P = pr[i];
    if (this.hit['p' + i] || Math.abs(this.x) < 1.0) continue;
    var within = P.k === 'fence' ? (this.d > P.d - 0.6 && this.d < P.d + P.len + 0.6) : Math.abs(this.d - P.d) < 1.3;
    if (within && Math.abs(this.x - P.x) < 0.22) {
      this.hit['p' + i] = 1; this.v *= 0.55; this.x = 0.95 * (this.x > 0 ? 1 : -1);
      this.ev.push({ prop: i });
    }
  }
  if (boost && av > 0.5) this.bk = Math.min(1, this.bk + dt * 4);
  else this.bk = Math.max(0, this.bk - dt * 2);
  while (this.ptr < it.length && it[this.ptr].d < prev - 10) this.ptr++;
  for (i = this.ptr; i < it.length && it[i].d <= this.d + 1; i++) {
    o = it[i];
    if (this.hit[i] || this.d < o.d - 0.5 || Math.abs(this.x - o.x) > 0.5) continue;
    this.hit[i] = 1;
    /* ნიტროს აღებისას სიჩქარე ავტომატურად მატულობს; დროებითი აჩქარება იზრდება, მაქსიმუმი 6 წმ */
    this.boostT = 7.5;                                           /* ნიტრო 7.5 წამი; ახალი აღებისას თავიდან იწყება */
    this.v = Math.min(this.v + 6, VMAX * 1.3);
    this.ev.push({ pick: i, k: o.k });
  }
  this.h = headAt(T, this.d);
  this.a = this.h + clamp(this.vx * 0.09, -0.28, 0.28);
};

/* კომპიუტერი: მოსახვევებამდე აანელებს, საჭეს ცენტრში ინარჩუნებს */
function botDrive(b, T, el) {
  var vt = VMAX * 1.05, j, kk, vs, sf, push, comp;
  for (j = 0; j <= 110; j += 4) {
    kk = Math.abs(kapAt(T, b.d + j));
    if (kk > 0.0005) { vs = Math.sqrt(G_LAT / kk) * 0.93; vt = Math.min(vt, Math.sqrt(vs * vs + 2 * ACC * BRAKE_X * j)); }
  }
  vt *= 1 + 0.06 * Math.sin(el * 0.7);
  b.gas = true; b.rev = false;
  if (b.v > vt) { b.gas = false; b.rev = true; }
  sf = Math.min(1, b.v / (VMAX * 0.3)); push = KP * b.v * b.v * kapAt(T, b.d) / HW;
  comp = sf > 0.05 ? -push / (STEERV * sf) : 0;
  b.steer = clamp(comp + (-b.x) * 1.1, -1, 1);
}

/* სიმულაცია ეკრანის გარეშე (ტესტებისთვის) */
function simRace(lvl, seed, naive) {
  setSpeed(lvl);
  var T = genTrack(seed), c = new Car(0), t = 0, dt = 1 / 60, crashes = 0, props = 0;
  if (naive) c.gas = true;
  while (!c.fin && t < 600) {
    if (!naive) botDrive(c, T, t);
    c.step(dt, T, 1);
    if (c.ev.indexOf('scrape') >= 0) crashes++;
    c.ev.forEach(function (e) { if (typeof e === 'object' && e.prop !== undefined) props++; });
    t += dt;
  }
  return { time: t, crashes: crashes, props: props, L: LEN, theme: T.theme.n };
}

/* ---------- ქსელი ---------- */
var curSpeed = 1, mode = null, role = null, code = '', ws = null, wsOpen = false, queue = [], session = null, stake = 1, myName = '', names = { a: '', b: '' }, retry = 0, retryT = null, closedByUs = false;
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
    case 'start': if (mode === 'online') { stake = m.stake || stake; curSpeed = m.speed || curSpeed; names = m.names; beginRace(m.seed, m.countdown); } break;
    case 'opp': if (race && opp) { opp.d = +m.d || 0; opp.x = clamp(+m.x || 0, -1.6, 1.6); opp.b = !!m.b; opp.s = !!m.s; } break;
    case 'result': if (race) finishRace(m.winner === role); break;
    case 'peer': oppOnline = m.online; $('banner').hidden = oppOnline; $('banner').textContent = 'მოწინააღმდეგე გათიშულია, ველოდებით...'; break;
    case 'rematch': if (race && race.state === 'done') $('againBtn').textContent = 'მოწინააღმდეგე ელოდება, კიდევ ერთხელ'; break;
    case 'closed': if (mode === 'online') { toastLobby('მოწინააღმდეგე გავიდა.'); leaveToLobby(); } break;
    case 'err': clearSession(); toastLobby(m.code === 'no_room' ? 'ასეთი ოთახი არ მოიძებნა.' : m.code === 'room_full' ? 'ოთახი სავსეა.' : 'სერვერი დაკავებულია.'); leaveToLobby(true); break;
  }
}
var oppOnline = true;

/* ---------- ეკრანები ---------- */
function show(id) { ['s-lobby', 's-wait', 's-game', 's-result', 's-garage'].forEach(function (s) { $(s).hidden = (s !== id); }); document.body.style.overflow = id === 's-game' ? 'hidden' : ''; }
function toastLobby(t) { var el = $('invite'); el.hidden = false; el.textContent = t; }
function showWait() { show('s-wait'); $('codeBig').textContent = code; $('waitStake').textContent = 'ფსონი: ' + stake + ' ქულა · ' + SPEEDS[curSpeed].n; }
function leaveToLobby(keep) {
  stopRace(); closedByUs = true; if (ws && wsOpen && !keep) rawSend({ t: 'leave' }); clearSession(); mode = null; closedByUs = false; $('banner').hidden = true; unlockFull(); show('s-lobby'); setPoints(points);
}
function shareURL() { return location.origin + location.pathname + '?room=' + code; }

/* ---------- რბოლა ---------- */
var race = null, me = null, opp = null, bot = null, track = null, raf = 0, lastT = 0, sendT = 0, shake = 0, cv = null, W = 0, H = 0, rendererOK = null;
var ctl = { rev: false };
var SENS_KEY = 'duel-sens', sens = parseFloat(lsGet(SENS_KEY)) || 1.5;
var CTL_KEY = 'duel-ctl', ctlMode = lsGet(CTL_KEY) === 'wheel' ? 'wheel' : 'tilt', tiltSteer = 0, tiltBase = null, tiltListen = false, wheelAng = 0, wheelId = null, wheelLast = 0, hitCD = 0;
var keysSteer = { l: 0, r: 0 }, touchSteer = 0, touchId = null, touchX0 = 0;
function newOpp(x) { return { d: 0, rd: 0, x: x, rx: x, b: false, s: false, lastRd: 0, vEst: 0 }; }
function beginRace(seed, countdownMs) {
  stopRace(); setSpeed(curSpeed);
  track = genTrack(seed);
  calib = (ctlMode === 'tilt' && calibOf() === undefined) ? { t: 0, sum: 0, n: 0, base: null } : null;
  if (calib) flash('დახარე მარჯვენა მხარე ქვემოთ, რომ მანქანამ იცოდეს მიმართულება');
  me = new Car(-0.45);
  opp = newOpp(0.45);
  bot = (mode === 'bot') ? new Car(0.45) : null;
  race = { state: 'count', t0: performance.now() + countdownMs, lastBeep: 4, doneSent: false, over: false, ft: 0, shown: false, won: false };
  ctl.rev = false; touchSteer = 0; keysSteer.l = keysSteer.r = 0; wheelAng = 0; tiltBase = null; tiltSteer = 0; hitCD = 0;
  shake = 0;
  $('s-game').classList.remove('fin');
  $('s-game').classList.toggle('mode-wheel', ctlMode === 'wheel'); $('s-game').classList.toggle('mode-tilt', ctlMode !== 'wheel');
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {}); } catch (e) {}
  show('s-game'); resize();
  if (rendererOK) R3D.setTrack(track, { theme: track.theme, HW: HW, finishD: LEN });
  $('big').className = 'big'; $('big').textContent = ''; $('toast').textContent = ''; $('timer').textContent = ''; $('gap').textContent = '';
  $('spd').textContent = '0'; $('posTxt').textContent = '';
  Snd.unlock();
  lastT = performance.now(); raf = requestAnimationFrame(loop);
}
function resize() {
  cv = $('cv'); W = cv.clientWidth || window.innerWidth; H = cv.clientHeight || window.innerHeight;
  if (rendererOK === null) rendererOK = !!(window.R3D && R3D.init(cv));
  if (rendererOK) R3D.resize(W, H);
  else flash('3D გრაფიკა ამ მოწყობილობაზე ვერ ჩაირთო.');
}
window.addEventListener('resize', function () { if (race) resize(); });
function stopRace() { cancelAnimationFrame(raf); raf = 0; race = null; Snd.engineOff(); Snd.musicStop(); }
function flash(t) { var el = $('toast'); el.textContent = t; clearTimeout(flash.t); flash.t = setTimeout(function () { if (el.textContent === t) el.textContent = ''; }, 1400); }
function setBig(t, cls) { var b = $('big'); b.textContent = t; b.className = 'big ' + (cls || ''); void b.offsetWidth; b.className = 'big pop ' + (cls || ''); }

function rubber() { return 1 + clamp((me.d - bot.d) / 150, -0.05, 0.07); }
function poseOf(c, dt) {
  var p = worldAt(track, c.d, c.x, {});
  return { x: p.x, y: p.y, h: p.h, a: c.a, v: c.v, bk: c.bk, dr: c.drift ? 1 : 0, lean: c.steer * clamp(c.v / VMAX, 0, 1) };
}
function oppPose() {
  var p = worldAt(track, opp.rd, opp.rx, {});
  return { x: p.x, y: p.y, h: p.h, a: p.h, v: opp.vEst, bk: opp.b ? 0.6 : 0, lean: 0 };
}
function isPortrait() { return !!(window.matchMedia && matchMedia('(orientation: portrait)').matches); }
function loop(now) {
  if (!race) return;
  /* ტელეფონი ვერტიკალურადაა: რბოლა ჩერდება (საათიც), სანამ ჰორიზონტალურად არ შემობრუნდება */
  if (race.state !== 'done' && isPortrait()) { race.t0 += now - lastT; lastT = now; requestAnimationFrame(loop); return; }
  var dt = Math.min(0.05, (now - lastT) / 1000), el = (now - race.t0) / 1000, target;
  lastT = now;
  if (race.state === 'done') return;
  if (calib) calibTick(dt);
  if (race.state === 'count') {
    var left = (race.t0 - now) / 1000, n = Math.ceil(left);
    if (left <= 0) { race.state = 'run'; setBig('დაიწყო!', 'sm'); setTimeout(function () { if ($('big').textContent === 'დაიწყო!') $('big').textContent = ''; }, 700); Snd.beep(true); }
    else if (n <= 3 && n !== race.lastBeep) { race.lastBeep = n; setBig(String(n)); Snd.beep(false); }
    else if (n > 3 && n !== race.lastBeep) { race.lastBeep = n; $('big').className = 'big sm'; $('big').textContent = track.theme.n; }
  }
  if (race.state === 'run') {
    if (ctlMode === 'wheel' && wheelId === null) { wheelAng *= Math.exp(-dt * 5); touchSteer = clamp(wheelAng / (Math.PI * 0.25) * sens, -1, 1); $('wheel').style.transform = 'rotate(' + wheelAng + 'rad)'; }
    target = clamp(keysSteer.r - keysSteer.l + (ctlMode === 'wheel' ? touchSteer : tiltSteer), -1, 1);
    me.steer += (target - me.steer) * Math.min(1, dt * 10);
    me.gas = true; me.rev = ctl.rev; me.nitro = false;
    if (me.fin) { me.gas = false; me.rev = true; }
    me.step(dt, track, 1);
    if (me.drift) { race.skidT = (race.skidT || 0) - dt; if (race.skidT <= 0) { Snd.skid(); race.skidT = 0.3; } }
    me.ev.forEach(onEv);
    if (bot) {
      botDrive(bot, track, el); bot.step(dt, track, rubber()); bot.ev.length = 0;
      opp.d = opp.rd = bot.d; opp.x = opp.rx = bot.x; opp.b = bot.bk > 0.2;
    } else {
      opp.rd += (opp.d - opp.rd) * Math.min(1, dt * 6); opp.rx += (opp.x - opp.rx) * Math.min(1, dt * 8);
    }
    opp.vEst = (opp.rd - opp.lastRd) / Math.max(dt, 1e-3); opp.lastRd = opp.rd;
    carCollide(dt);
    var ahead = me.d >= opp.rd, gap = (opp.rd - me.d) / VMAX;
    $('spd').textContent = Math.round(me.v * 5);
    $('posTxt').textContent = (ahead ? '1' : '2') + '/2';
    $('timer').textContent = Math.floor(el / 60) + ':' + ('0' + Math.floor(el % 60)).slice(-2);
    $('gap').textContent = Math.abs(gap) < 0.12 ? 'ერთად!' : gap > 0 ? 'მოწინააღმდეგე წინ · ' + gap.toFixed(1) + ' წმ' : 'შენ წინ ხარ · ' + (-gap).toFixed(1) + ' წმ';
    $('gap').className = 'gap ' + (Math.abs(gap) < 0.12 ? 'eq' : gap > 0 ? 'bad' : 'good');
    $('pMe').style.left = clamp(me.d / LEN, 0, 1) * 100 + '%';
    $('pOpp').style.left = clamp(opp.rd / LEN, 0, 1) * 100 + '%';
    $('revBtn').classList.toggle('on', ctl.rev);
    $('nitroTxt').textContent = me.boostT > 0 ? 'ნიტრო ' + me.boostT.toFixed(1) + ' წმ' : '';
    Snd.engine(me.v / 10, me.bk > 0.3);
    Snd.music(Math.min(1, 0.5 + 0.25 * clamp(me.d / LEN, 0, 1) + 0.25 * me.bk + (Math.abs(gap) < 0.8 ? 0.1 : 0)));
    if (mode === 'online') {
      if (now - sendT > 80) { sendT = now; rawSend({ t: 'pos', d: +me.d.toFixed(1), x: +me.x.toFixed(3), b: me.bk > 0.3 ? 1 : 0, s: 0 }); }
      if (me.fin && !race.doneSent) { race.doneSent = true; rawSend({ t: 'fin' }); setBig('ფინიში!', 'sm'); }
    } else if (!race.over) {
      if (me.fin || bot.fin) { race.over = true; finishRace(me.fin && (!bot.fin || me.d >= bot.d)); }
      else if (el > 220) { race.over = true; finishRace(me.d >= bot.d); }
    }
  } else if (race.state === 'finale') {
    race.ft += dt;
    if (race.ft > 5.6 && !race.shown) { race.shown = true; setBig(race.won ? 'გამარჯვება' : 'წაგება', 'sm'); }
  }
  shake = Math.max(0, shake - dt * 3);
  drawAll(dt);
  if (race) raf = requestAnimationFrame(loop);
}
function drawAll(dt) {
  if (!rendererOK || !track) return;
  var fin = race.state === 'finale' ? { t: race.ft, won: race.won } : null;
  var mp = race.state === 'finale' ? poseOf(me) : (me ? poseOf(me) : null);
  var op = bot ? (race.state === 'finale' ? poseOf(bot) : poseOf(bot)) : oppPose();
  if (mp) { if (race.state === 'finale') mp.v = 0; }
  if (op && race.state === 'finale') op.v = 0;
  R3D.frame({ dt: dt, vmax: VMAX * 1.3, shake: shake, me: mp, opp: op, fin: fin });
}
function onEv(e) {
  var p = worldAt(track, me.d, me.x, {});
  if (e === 'scrape') { Snd.skid(); shake = 0.3; if (rendererOK) R3D.emit('spark', p.x, p.y, 10); flash('კიდეს ეხები, საჭით გაასწორე'); }
  else if (e && typeof e === 'object' && e.pick !== undefined) { Snd.pick(); if (rendererOK) R3D.hideItem(e.pick); flash(e.k === 'pad' ? 'ბუსტი!' : 'ნიტრო!'); }
  else if (e && typeof e === 'object' && e.prop !== undefined) { Snd.crash(); shake = 0.7; if (rendererOK) R3D.knock(e.prop); flash('ბოძს დაეჯახე!'); }
}

function finishRace(won) {
  if (!race || race.state === 'finale' || race.state === 'done') return;
  var before = points;
  setPoints(won ? before + stake : before - stake);
  var gained = won ? points - before : before - points, rc = race;
  race.state = 'finale'; race.won = won; race.ft = 0; race.shown = false;
  $('s-game').classList.add('fin');
  me.gas = false; me.rev = true; ctl.rev = false;
  Snd.engineOff(); Snd.transform();
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

/* ---------- მართვა: პედლები, ნიტრო, საჭე (თითით ან ისრებით) ---------- */
function bindHold(id, down, up) {
  var el = $(id);
  el.addEventListener('pointerdown', function (e) { e.preventDefault(); Snd.unlock(); down(); el.classList.add('on'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { el.addEventListener(ev, function () { up(); el.classList.remove('on'); }); });
}
/* ერთადერთი პედალი (უკუსვლა/ტორმუზი), ორივე მართვის რეჟიმში */
bindHold('revBtn', function () { ctl.rev = true; }, function () { ctl.rev = false; });

/* მართვა საჭით: ეკრანზე ბორბალს თითით ატრიალებ */
var wheelEl = $('wheel');
function wc() { var r = wheelEl.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
wheelEl.addEventListener('pointerdown', function (e) { e.preventDefault(); Snd.unlock(); wheelId = e.pointerId; var c = wc(); wheelLast = Math.atan2(e.clientY - c.y, e.clientX - c.x); try { wheelEl.setPointerCapture(e.pointerId); } catch (x) {} });
wheelEl.addEventListener('pointermove', function (e) {
  if (wheelId !== e.pointerId) return;
  var c = wc(), a = Math.atan2(e.clientY - c.y, e.clientX - c.x), d = a - wheelLast;
  if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
  wheelLast = a; wheelAng = clamp(wheelAng + d, -Math.PI * 0.8, Math.PI * 0.8);
  touchSteer = clamp(wheelAng / (Math.PI * 0.25) * sens, -1, 1);
  wheelEl.style.transform = 'rotate(' + wheelAng + 'rad)';
});
['pointerup', 'pointercancel'].forEach(function (ev) { wheelEl.addEventListener(ev, function (e) { if (wheelId === e.pointerId) wheelId = null; }); });

/* მართვა ტელეფონის დახრით */
/* დახრა: აჩქარების სენსორი (სიმძიმის ძალა) ეკრანის ჰორიზონტალურ ღერძზე დაპროექტებული — ორივე ჰორიზონტალურ პოზიციაზე ერთნაირად მუშაობს */
function onMotion(e) {
  var a = e.accelerationIncludingGravity;
  if (!a || typeof a.x !== 'number' || typeof a.y !== 'number') return;
  var ang = ((screen.orientation ? screen.orientation.angle : window.orientation) || 0) * Math.PI / 180;
  var right = a.x * Math.cos(ang) + a.y * Math.sin(ang);
  lastRight = right;
  if (tiltBase === null) tiltBase = right;
  var d = right - tiltBase;
  if (Math.abs(d) < 0.4) tiltBase += d * 0.01;          /* ნელი გასწორება */
  var g = calibOf(); if (g === undefined) g = 1;
  tiltSteer = clamp(g * -d / (9.81 * 0.25) * sens, -1, 1);  /* მარჯვნივ დახრა → მარჯვნივ უხვევს */
}
/* მობილურზე ორიენტაციის ჩაკეტვა მხოლოდ სრულ ეკრანზე მუშაობს; ეს უნდა გაეშვას მომხმარებლის შეხებით */
function goFull() {
  try {
    var el = document.documentElement, p = el.requestFullscreen ? el.requestFullscreen() : null;
    if (p && p.then) p.then(lockLand).catch(lockLand); else lockLand();
  } catch (e) { lockLand(); }
}
function lockLand() { try { if (screen.orientation && screen.orientation.lock) { var t = screen.orientation.type || ''; screen.orientation.lock(t.indexOf('landscape') === 0 ? t : 'landscape-primary').catch(function () {}); } } catch (e) {} }
function unlockFull() { try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {} }
/* ორიენტაციის კალიბრაცია: თითო ჰორიზონტალურ პოზიციაზე ერთხელ ვამოწმებთ, რა მიმართულებით იქნება მარჯვნივ */
var lastRight = 0, calib = null;
function calibKey() { return String((screen.orientation ? screen.orientation.angle : window.orientation) || 0); }
function calibOf() { var v = lsGet('duel-calib-' + calibKey()); return (v === null || v === undefined || v === '') ? undefined : parseFloat(v); }
function calibTick(dt) {
  if (ctlMode !== 'tilt') { calib = null; return; }
  calib.t += dt;
  if (calib.base === null) {
    if (calib.t < 0.8) { calib.sum += lastRight; calib.n++; } else calib.base = calib.sum / Math.max(1, calib.n);
    return;
  }
  var dd = lastRight - calib.base;
  if (Math.abs(dd) > 1.2) { lsSet('duel-calib-' + calibKey(), String(dd < 0 ? 1 : -1)); calib = null; flash('მართვა მზადაა'); }
}
window.addEventListener('resize', function () {
  if (race && ctlMode === 'tilt' && calibOf() === undefined) { calib = { t: 0, sum: 0, n: 0, base: null }; flash('დახარე მარჯვენა მხარე ქვემოთ, რომ მანქანამ იცოდეს მიმართულება'); }
});
function enableTilt() {
  if (tiltListen) return; tiltListen = true;
  window.addEventListener('devicemotion', onMotion);
  try { if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') DeviceMotionEvent.requestPermission().catch(function () {}); } catch (e) {}
}

/* მანქანების შეჯახება ერთმანეთთან: სიჩქარე იკარგება */
function carCollide(dt) {
  hitCD -= dt;
  if (hitCD > 0 || !me) return;
  var oD = bot ? bot.d : opp.rd, oX = bot ? bot.x : opp.rx, dd = me.d - oD, dx = me.x - oX;
  if (Math.abs(dd) < 3.4 && Math.abs(dx) < 0.3) {
    hitCD = 0.6; var sgn = dx >= 0 ? 1 : -1;
    me.v *= 0.7; me.x += 0.25 * sgn;
    if (bot) { bot.v *= 0.7; bot.x -= 0.25 * sgn; }
    Snd.crash(); shake = 0.5;
    if (rendererOK) { var p = worldAt(track, me.d, me.x, {}); R3D.emit('spark', p.x, p.y, 14); }
    flash('შეჯახება!');
  }
}
function markSens() { document.querySelectorAll('.sensb').forEach(function (b) { b.classList.toggle('on', parseFloat(b.dataset.sens) === sens); }); }
document.querySelectorAll('.sensb').forEach(function (b) { b.onclick = function () { sens = parseFloat(b.dataset.sens) || 1; lsSet(SENS_KEY, String(sens)); markSens(); }; });
markSens();
document.querySelectorAll('.segb').forEach(function (b) { b.onclick = function () { ctlMode = b.dataset.ctl; lsSet(CTL_KEY, ctlMode); markCtl(); }; });
function markCtl() { document.querySelectorAll('.segb').forEach(function (b) { b.classList.toggle('on', b.dataset.ctl === ctlMode); }); }
markCtl();

window.addEventListener('keydown', function (e) {
  if (!race) return;
  var k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keysSteer.l = 1;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') keysSteer.r = 1;
  else if (k === 'ArrowDown' || k === 's' || k === 'S') ctl.rev = true;
});
window.addEventListener('keyup', function (e) {
  var k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keysSteer.l = 0;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') keysSteer.r = 0;
  else if (k === 'ArrowDown' || k === 's' || k === 'S') ctl.rev = false;
});
$('sndBtn').onclick = function () { $('sndBtn').classList.toggle('off', Snd.toggle()); };
$('sndBtn').classList.toggle('off', Snd.muted());

/* ---------- ღილაკები ---------- */
function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14) || 'მოთამაშე'; }
function takeName() { myName = cleanName($('name').value); lsSet(NAME_KEY, myName); }
$('createBtn').onclick = function () { enableTilt(); goFull(); takeName(); Snd.unlock(); mode = 'online'; closedByUs = false; stake = parseInt($('stake').value, 10) || 1; curSpeed = parseInt($('speed').value, 10) || 1; sendMsg({ t: 'create', name: myName, stake: stake, speed: curSpeed }); };
$('joinBtn').onclick = function () { enableTilt(); goFull(); takeName(); Snd.unlock(); var c = $('code').value.trim(); if (!c) { toastLobby('ჩაწერე ოთახის კოდი.'); return; } mode = 'online'; closedByUs = false; sendMsg({ t: 'join', code: c, name: myName }); };
$('botBtn').onclick = function () { enableTilt(); goFull(); takeName(); Snd.unlock(); mode = 'bot'; role = 'a'; curSpeed = parseInt($('speed').value, 10) || 1; stake = Math.min(parseInt($('stake').value, 10) || 1, Math.max(1, points)); names = { a: myName, b: 'კომპიუტერი' }; beginRace((Math.random() * 2e9) | 0 || 1, 3200); };
$('cancelBtn').onclick = function () { leaveToLobby(); };
$('leaveBtn').onclick = function () { if (confirm('გასვლა?')) leaveToLobby(); };
$('homeBtn').onclick = function () { leaveToLobby(); };
$('copyBtn').onclick = function () {
  var url = shareURL();
  if (navigator.share) navigator.share({ title: 'გბ', text: 'შემოდი ოთახში ' + code, url: url }).catch(function () {});
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
window.__duel = { ctlMode: function () { return ctlMode; }, genTrack: genTrack, Car: Car, kapAt: kapAt, setSpeed: setSpeed, sim: simRace, setPoints: setPoints, race: function () { return race; }, me: function () { return me; }, bot: function () { return bot; }, opp: function () { return opp; }, len: function () { return LEN; } };
})();
