(function () {
'use strict';
var $ = function (id) { return document.getElementById(id); };
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

/* ---------- პარამეტრები ---------- */
var L = 1500, RW = 16, START_D = 90, BASE = 18, BOOST_X = 1.55, PARTS = 22, START_PTS = 10;
var PRIZE_TEXT = 'ყველა ნაწილი შეღებილია! ეს ტესტ-ვერსიაა და ჯილდოს პირობებს ორგანიზატორი აცხადებს.';
var PTS_KEY = 'duel-points', NAME_KEY = 'duel-name', MUTE_KEY = 'duel-mute', SESS_KEY = 'duel-session';

/* ---------- ქულები და მანქანა ---------- */
var points = (function () { var v = parseInt(lsGet(PTS_KEY), 10); return isFinite(v) && v >= 0 && v <= PARTS ? v : START_PTS; })();
function setPoints(v) { points = Math.max(0, Math.min(PARTS, v)); lsSet(PTS_KEY, String(points)); $('ptsTxt').textContent = points; fillStakes(); }

var PALETTE = ['#FF5A3C', '#FFD23F', '#27C6FF', '#3DDC84', '#B65CFF', '#FF7EB3', '#FF9F1C', '#2E7BFF'];
var PARTDEF = [
  ['rect', 18, 86, 28, 34, 8], ['poly', '46,70 112,70 112,86 46,86'], ['poly', '46,86 112,86 112,116 46,116'],
  ['rect', 112, 86, 76, 30, 0], ['rect', 188, 86, 76, 30, 0], ['rect', 264, 86, 52, 30, 0], ['rect', 316, 86, 40, 34, 8],
  ['poly', '264,70 340,76 356,86 264,86'], ['rect', 338, 90, 16, 10, 3], ['rect', 20, 92, 12, 12, 3], ['rect', 330, 106, 24, 12, 3],
  ['poly', '112,70 140,40 156,40 156,70'], ['rect', 156, 32, 84, 9, 3], ['poly', '240,40 256,40 292,70 240,70'],
  ['rect', 156, 42, 38, 28, 2], ['rect', 196, 42, 42, 28, 2], ['rect', 112, 116, 152, 8, 3], ['rect', 262, 58, 14, 10, 3],
  ['rect', 22, 58, 40, 8, 3], ['rect', 112, 99, 152, 6, 0], ['wheel', 80, 120], ['wheel', 290, 120]
];
function carSVG(n, newFrom) {
  var out = '<svg viewBox="0 0 380 160" role="img" aria-label="მანქანა, ' + n + ' ნაწილი შეღებილია"><ellipse cx="190" cy="148" rx="170" ry="8" fill="#0002"/>', i, d, fill, cls;
  for (i = 0; i < PARTS; i++) {
    d = PARTDEF[i];
    fill = i < n ? PALETTE[i % PALETTE.length] : '#DDE4F3';
    cls = 'part' + (newFrom !== undefined && i >= newFrom && i < n ? ' new' : '');
    if (d[0] === 'rect') out += '<rect class="' + cls + '" x="' + d[1] + '" y="' + d[2] + '" width="' + d[3] + '" height="' + d[4] + '" rx="' + d[5] + '" fill="' + fill + '" stroke="#4A5778" stroke-width="2.5"/>';
    else if (d[0] === 'poly') out += '<polygon class="' + cls + '" points="' + d[1] + '" fill="' + fill + '" stroke="#4A5778" stroke-width="2.5" stroke-linejoin="round"/>';
    else out += '<circle cx="' + d[1] + '" cy="' + d[2] + '" r="25" fill="#1B2238"/><circle class="' + cls + '" cx="' + d[1] + '" cy="' + d[2] + '" r="14" fill="' + fill + '" stroke="#4A5778" stroke-width="2.5"/>';
  }
  return out + '</svg>';
}
function fillStakes() {
  var sel = $('stake'), cur = parseInt(sel.value, 10) || 1, opts = [1, 2, 3, 5, 10].filter(function (v) { return v <= Math.max(1, points); }), h = '';
  opts.forEach(function (v) { h += '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + v + ' ქულა</option>'; });
  sel.innerHTML = h;
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

/* ---------- ტრასა (ერთი seed იძლევა ერთსა და იმავე ტრასას ორივე მოთამაშესთან) ---------- */
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var THEMES = [
  { n: 'ქალაქი', v: 'car', sky: ['#59C8FF', '#E6F8FF'], side: '#8BD66B', road: '#4A5368', deco: 'house', obs: 'cone' },
  { n: 'მთა', v: 'car', sky: ['#FFA45B', '#FFE7B8'], side: '#79B34F', road: '#6B5B4D', deco: 'peak', obs: 'rock' },
  { n: 'სანაპირო', v: 'car', sky: ['#36D1DC', '#FFF3C4'], side: '#F5DFA0', road: '#5A6678', deco: 'palm', obs: 'crate' },
  { n: 'უდაბნო', v: 'car', sky: ['#FFC857', '#FFF1C9'], side: '#F2C879', road: '#8A6D4B', deco: 'cactus', obs: 'rock' },
  { n: 'თოვლი', v: 'car', sky: ['#9AD8FF', '#FFFFFF'], side: '#F4FAFF', road: '#7C8DA6', deco: 'pine', obs: 'ice' },
  { n: 'ტყე', v: 'car', sky: ['#7BE0A0', '#EFFFD0'], side: '#3FAE5A', road: '#48554A', deco: 'tree', obs: 'log' },
  { n: 'ცა', v: 'plane', sky: ['#3C8DFF', '#DDF1FF'], side: '#BFE3FF', road: '#ffffff', deco: 'cloud', obs: 'storm' },
  { n: 'ჩასვლა', v: 'plane', sky: ['#FF6FB5', '#FFE29A'], side: '#FFC1D6', road: '#ffffff', deco: 'cloud', obs: 'bird' }
];
function genTrack(seed) {
  var r = rng(seed), th = THEMES[Math.floor(r() * THEMES.length)], dens = 0.5 + r() * 0.3, n = Math.floor((L - START_D) / RW), rows = [], i, k, ob, free;
  for (i = 0; i < n; i++) {
    ob = [false, false, false];
    if (i > 3 && r() < dens) { k = r() < 0.35 ? 2 : 1; while (k--) ob[Math.floor(r() * 3)] = true; if (ob[0] && ob[1] && ob[2]) ob[Math.floor(r() * 3)] = false; }
    free = [0, 1, 2].filter(function (j) { return !ob[j]; });
    rows.push({ ob: ob, pk: (i > 3 && r() < 0.14) ? free[Math.floor(r() * free.length)] : -1 });
  }
  return { theme: th, rows: rows, amp: 20 + r() * 40, ph: r() * 6.28, seed: seed };
}

/* ---------- მოძრავი მანქანა (მოთამაშე და კომპიუტერი ერთი და იგივე წესებით) ---------- */
function Runner() { this.d = 0; this.x = 1; this.lane = 1; this.speed = 0; this.heat = 0; this.stall = 0; this.slow = 0; this.charges = 0; this.boost = false; this.hit = {}; this.dyn = []; this.fin = false; this.ev = []; }
Runner.prototype.step = function (dt, track, boostIn) {
  var self = this, rows = track.rows, base = BASE, i, o;
  this.ev.length = 0;
  this.x += (this.lane - this.x) * Math.min(1, dt * 14);
  if (this.stall > 0) { this.stall -= dt; this.speed = 0; this.boost = false; if (this.stall <= 0) this.heat = 30; }
  else {
    if (this.slow > 0) { this.slow -= dt; base *= 0.45; }
    this.boost = boostIn && this.heat < 100 && this.slow <= 0;
    if (this.boost) { this.heat += 38 * dt; base *= BOOST_X; } else this.heat = Math.max(0, this.heat - 22 * dt);
    if (this.heat >= 100) { this.stall = 1.4; this.ev.push('overheat'); }
    this.speed = base;
  }
  this.d += this.speed * dt;
  var ln = Math.round(this.x);
  if (Math.abs(this.x - ln) < 0.55) {
    i = Math.round((this.d - START_D) / RW);
    if (i >= 0 && i < rows.length && Math.abs(START_D + i * RW - this.d) < 1.6) {
      if (rows[i].ob[ln] && !this.hit['o' + i]) { this.hit['o' + i] = 1; this.slow = 1.0; this.ev.push('crash'); }
      if (rows[i].pk === ln && !this.hit['p' + i]) { this.hit['p' + i] = 1; if (this.charges < 2) this.charges++; this.ev.push('pick'); }
    }
    for (i = 0; i < this.dyn.length; i++) { o = this.dyn[i]; if (!o.hit && o.lane === ln && Math.abs(o.d - this.d) < 1.6) { o.hit = 1; this.slow = 1.0; this.ev.push('crash'); } }
  }
  this.dyn = this.dyn.filter(function (o) { return o.d > self.d - 20; });
  if (this.d >= L) this.fin = true;
};

/* ---------- ქსელი ---------- */
var mode = null, role = null, code = '', ws = null, wsOpen = false, queue = [], session = null, stake = 1, myName = '', names = { a: '', b: '' }, oppOnline = true, retry = 0, retryT = null, closedByUs = false;
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
    case 'created': session = { code: m.code, role: m.role, token: m.token, name: myName }; saveSession(); code = m.code; role = m.role; stake = m.stake; showWait(); break;
    case 'joined':
      session = { code: m.code, role: m.role, token: m.token, name: myName }; saveSession(); code = m.code; role = m.role; stake = m.stake;
      if (stake > points) { toastLobby('ამ ოთახში ' + stake + ' ქულაზე თამაშობენ, შენ კი ' + points + ' გაქვს.'); leaveToLobby(); }
      break;
    case 'rejoined': break;
    case 'start': if (mode === 'online') { stake = m.stake || stake; names = m.names; beginRace(m.seed, m.countdown, m.resume); } break;
    case 'opp': if (race) { opp.d = m.d; opp.x = m.x; opp.b = !!m.b; opp.s = !!m.s; opp.t = performance.now(); } break;
    case 'atk': if (race && race.state === 'run') { me.dyn.push({ d: me.d + 55, lane: Math.round(me.x), hit: 0 }); flash('⚠ დაბრკოლება!'); Snd.atk(); } break;
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
function showWait() {
  show('s-wait'); $('codeBig').textContent = code; $('waitStake').textContent = 'ფსონი: ' + stake + ' ქულა';
}
function leaveToLobby(keep) {
  stopRace(); closedByUs = true; if (ws && wsOpen && !keep) rawSend({ t: 'leave' }); clearSession(); mode = null; closedByUs = false; $('banner').hidden = true; show('s-lobby'); setPoints(points);
}
function shareURL() { return location.origin + location.pathname + '?room=' + code; }

/* ---------- რბოლა ---------- */
var race = null, me = new Runner(), opp = { d: 0, x: 1, b: false, s: false, t: 0 }, bot = null, track = null, keys = { boost: false }, raf = 0, lastT = 0, sendT = 0, botT = 0, cv = null, cx = null, W = 0, H = 0, view = { ppu: 6 }, particles = [];

function beginRace(seed, countdownMs, resume) {
  stopRace();
  track = genTrack(seed);
  me = new Runner(); opp = { d: 0, x: 1, b: false, s: false, t: performance.now() };
  bot = (mode === 'bot') ? new Runner() : null;
  race = { state: 'count', t0: performance.now() + countdownMs, startedAt: 0, lastBeep: 4, doneSent: false, over: false };
  keys.boost = false; particles = [];
  show('s-game'); resize();
  $('big').className = 'big'; $('toast').textContent = '';
  showTheme();
  Snd.unlock();
  lastT = performance.now(); raf = requestAnimationFrame(loop);
}
function showTheme() { $('timer').textContent = ''; }
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
    var el = (now - race.t0) / 1000;
    if (!me.fin) { me.step(dt, track, keys.boost); me.ev.forEach(onEv); }
    else { me.d += BASE * dt; }
    if (bot) { botThink(dt, el); if (!bot.fin) bot.step(dt, track, bot.wantBoost); else bot.d += BASE * dt; }
    $('timer').textContent = Math.floor(el / 60) + ':' + ('0' + Math.floor(el % 60)).slice(-2);
    Snd.engine(me.speed, me.boost);
    if (mode === 'online') {
      if (now - sendT > 90) { sendT = now; rawSend({ t: 'pos', d: +me.d.toFixed(1), x: +me.x.toFixed(2), b: me.boost ? 1 : 0, s: me.stall > 0 ? 1 : 0 }); }
      if (me.fin && !race.doneSent) { race.doneSent = true; rawSend({ t: 'fin' }); setBig('ფინიში!', 'sm'); }
    } else if (!race.over) {
      if (me.fin || bot.fin) { race.over = true; finishRace(me.fin && (!bot.fin || me.d >= bot.d)); }
      else if (el > 120) { race.over = true; finishRace(me.d >= bot.d); }
    }
  }
  draw(now, dt);
  if (race) raf = requestAnimationFrame(loop);
}
function onEv(e) {
  if (e === 'crash') { Snd.crash(); flash('💥'); burst('#fff'); if (navigator.vibrate) try { navigator.vibrate(80); } catch (x) {} }
  else if (e === 'pick') { Snd.pick(); flash('⚡ +1'); }
  else if (e === 'overheat') { Snd.boom(); flash('🔥 ძრავა გადახურდა!'); }
}
function burst(col) { for (var i = 0; i < 12; i++) particles.push({ x: me.x, d: me.d, vx: (Math.random() - 0.5) * 6, vd: (Math.random() - 0.3) * 20, life: 0.6, c: col }); }

/* კომპიუტერი: იგივე ტრასა, ზოგჯერ ცდება */
function botThink(dt, el) {
  botT -= dt; if (botT > 0) return; botT = 0.1;
  var b = bot, rows = track.rows, i, j, ahead = [], lane = Math.round(b.lane), skill = 0.86;
  if (b.stall > 0) { b.wantBoost = false; return; }
  for (i = Math.floor((b.d - START_D) / RW); i < rows.length && START_D + i * RW < b.d + 30; i++) if (i >= 0 && START_D + i * RW > b.d + 3) ahead.push(rows[i]);
  var blocked = ahead.some(function (r) { return r.ob[lane]; }) || b.dyn.some(function (o) { return o.lane === lane && o.d > b.d && o.d < b.d + 30; });
  if (blocked && Math.random() < skill) {
    var opts = [lane - 1, lane + 1].filter(function (l) { return l >= 0 && l <= 2 && !ahead.some(function (r) { return r.ob[l]; }); });
    if (opts.length) b.lane = opts[Math.floor(Math.random() * opts.length)];
  } else if (!blocked && ahead.length && Math.random() < 0.3) {
    for (j = 0; j < Math.min(2, ahead.length); j++) if (ahead[j].pk >= 0 && Math.abs(ahead[j].pk - lane) === 1 && !ahead.some(function (r) { return r.ob[ahead[j].pk]; })) { b.lane = ahead[j].pk; break; }
  }
  b.wantBoost = b.heat < 62 && Math.random() < 0.8 ? true : (b.boost && b.heat < 80 && Math.random() < 0.5);
  if (b.charges > 0 && el > 3 && Math.random() < 0.06) { b.charges--; me.dyn.push({ d: me.d + 55, lane: Math.round(me.x), hit: 0 }); flash('⚠ დაბრკოლება!'); Snd.atk(); }
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
    $('resSub').textContent = won ? 'მოწინააღმდეგე ბოლოს დარჩა.' : 'შემდეგჯერ აუცილებლად გამოგივა.';
    $('resCar').innerHTML = carSVG(points, won ? before : undefined);
    var full = points >= PARTS, broke = points <= 0;
    $('resPts').textContent = (won ? '+' : '−') + gained + ' ქულა · სულ ' + points + ' / ' + PARTS + (full ? ' · მანქანა მზადაა!' : '');
    $('againBtn').textContent = broke ? 'ახლიდან დაწყება (10 ქულა)' : 'კიდევ ერთხელ';
    $('againBtn').dataset.broke = broke ? '1' : '';
    if (full) { $('resSub').textContent = PRIZE_TEXT; }
    won ? Snd.win() : Snd.lose();
  }, 900);
  setBig(won ? '🏆' : '😬', '');
}

/* ---------- ხატვა ---------- */
function resize() {
  cv = $('cv'); var dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; cx = cv.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.ppu = H / 70;
}
window.addEventListener('resize', function () { if (race) resize(); });
function shiftAt(wd) { var a = track.amp * Math.min(1, W / 420); return a * (Math.sin(wd / 55 + track.ph) - Math.sin(me.d / 55 + track.ph)); }
function sy(wd) { return H * 0.74 - (wd - me.d) * view.ppu; }
function laneW() { return Math.min(W * 0.26, 110); }
function sx(lane, wd) { return W / 2 + shiftAt(wd) + (lane - 1) * laneW(); }
function hf(i) { var x = Math.sin(i * 127.1 + track.seed * 0.013) * 43758.5453; return x - Math.floor(x); }

function draw(now, dt) {
  var th = track.theme, i, y, lw = laneW(), plane = th.v === 'plane';
  var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  if (!plane) { cx.fillStyle = th.side; cx.fillRect(0, H * 0.12, W, H); }
  var topD = me.d + (H * 0.74) / view.ppu + 5, botD = me.d - (H * 0.26) / view.ppu - 5;
  // გზა
  if (!plane) {
    for (y = -10; y < H + 10; y += 8) {
      var wd = me.d + (H * 0.74 - y) / view.ppu, x1 = sx(0, wd) - lw * 0.5 - 8, x2 = sx(2, wd) + lw * 0.5 + 8;
      cx.fillStyle = th.road; cx.fillRect(x1, y, x2 - x1, 9);
      cx.fillStyle = '#fff'; cx.fillRect(x1, y, 5, 9); cx.fillRect(x2 - 5, y, 5, 9);
    }
    cx.fillStyle = '#ffffffaa';
    for (var k = Math.floor(botD / 10); k * 10 < topD; k++) for (i = 0; i < 2; i++) { var wy = k * 10; if (k % 2) continue; cx.fillRect(sx(i + 0.5, wy) - 3, sy(wy) - 9, 6, 20); }
  } else {
    cx.strokeStyle = '#ffffff88'; cx.lineWidth = 3; cx.setLineDash([14, 14]);
    for (i = 0; i < 4; i++) { cx.beginPath(); for (y = -10; y <= H + 10; y += 12) { var w2 = me.d + (H * 0.74 - y) / view.ppu, xx = sx(i - 0.5, w2); y === -10 ? cx.moveTo(xx, y) : cx.lineTo(xx, y); } cx.stroke(); }
    cx.setLineDash([]);
  }
  // დეკორაცია
  for (var di = Math.floor(botD / 22); di * 22 < topD; di++) {
    var wdd = di * 22, yy = sy(wdd), side = (di % 2 ? 1 : -1), off = (plane ? 1.6 : 1.9) + hf(di) * 1.4, px = sx(1, wdd) + side * off * lw;
    deco(th.deco, px, yy, 0.7 + hf(di + 9) * 0.7, lw);
  }
  // საგნები
  var r0 = Math.max(0, Math.floor((botD - START_D) / RW)), r1 = Math.min(track.rows.length - 1, Math.ceil((topD - START_D) / RW));
  for (i = r1; i >= r0; i--) {
    var row = track.rows[i], wrow = START_D + i * RW, ry = sy(wrow);
    for (var l = 0; l < 3; l++) {
      if (row.ob[l]) obstacle(th.obs, sx(l, wrow), ry, lw, !!me.hit['o' + i]);
      else if (row.pk === l && !me.hit['p' + i]) bolt(sx(l, wrow), ry, lw);
    }
  }
  // ფინიში
  var fy = sy(L); if (fy > -40 && fy < H + 40) { var fx1 = sx(0, L) - lw * 0.6, fw = lw * 3.2, cw = fw / 16; for (i = 0; i < 16; i++) for (var q = 0; q < 2; q++) { cx.fillStyle = (i + q) % 2 ? '#111' : '#fff'; cx.fillRect(fx1 + i * cw, fy - 12 + q * 12, cw, 12); } }
  me.dyn.forEach(function (o) { if (!o.hit) hazard(sx(o.lane, o.d), sy(o.d), lw); });
  // მოწინააღმდეგე
  var od = opp.d, ox = opp.x;
  if (bot) { od = bot.d; ox = bot.x; } else od = opp.d + Math.min(0.4, (now - opp.t) / 1000) * BASE;
  var ostall = bot ? bot.stall > 0 : opp.s, ob = bot ? bot.boost : opp.b;
  vehicle(sx(ox, od), sy(od), lw, '#FF5A3C', th.v, 0.75, ob, ostall);
  vehicle(sx(me.x, me.d), sy(me.d), lw, '#FFD23F', th.v, 1, me.boost, me.stall > 0 || me.slow > 0);
  // ნაწილაკები
  particles = particles.filter(function (p) { return (p.life -= dt) > 0; });
  particles.forEach(function (p) { p.x += p.vx * dt / 3; p.d += p.vd * dt; cx.fillStyle = p.c; cx.globalAlpha = Math.max(0, p.life / 0.6); cx.fillRect(sx(p.x, p.d), sy(p.d), 6, 6); cx.globalAlpha = 1; });
  // HUD
  var pr = Math.min(1, me.d / L), po = Math.min(1, Math.max(0, od) / L), bar = document.querySelector('.prog').clientWidth;
  $('pMe').style.left = (pr * bar) + 'px'; $('pOpp').style.left = (po * bar) + 'px';
  $('heatBar').style.width = Math.min(100, me.heat) + '%';
  $('charges').textContent = new Array(me.charges + 1).join('⚡');
}
function deco(kind, x, y, s, lw) {
  var u = lw * 0.5 * s;
  switch (kind) {
    case 'house': cx.fillStyle = '#FF8A5B'; cx.fillRect(x - u, y - u * 1.2, u * 2, u * 1.4); cx.fillStyle = '#C0392B'; cx.beginPath(); cx.moveTo(x - u * 1.2, y - u * 1.2); cx.lineTo(x, y - u * 2); cx.lineTo(x + u * 1.2, y - u * 1.2); cx.fill(); cx.fillStyle = '#FFF3B0'; cx.fillRect(x - u * 0.3, y - u * 0.8, u * 0.6, u * 0.6); break;
    case 'peak': cx.fillStyle = '#8D7B6B'; cx.beginPath(); cx.moveTo(x - u * 1.4, y); cx.lineTo(x, y - u * 2.4); cx.lineTo(x + u * 1.4, y); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.moveTo(x - u * 0.45, y - u * 1.6); cx.lineTo(x, y - u * 2.4); cx.lineTo(x + u * 0.45, y - u * 1.6); cx.fill(); break;
    case 'palm': cx.fillStyle = '#8B5A2B'; cx.fillRect(x - 3, y - u * 2, 6, u * 2); cx.fillStyle = '#2E9E5B'; for (var a = 0; a < 5; a++) { cx.beginPath(); cx.ellipse(x + Math.cos(a * 1.26) * u * 0.8, y - u * 2 + Math.sin(a * 1.26) * u * 0.4, u * 0.7, u * 0.22, a * 1.26, 0, 6.3); cx.fill(); } break;
    case 'cactus': cx.fillStyle = '#2FA05A'; cx.fillRect(x - u * 0.25, y - u * 1.6, u * 0.5, u * 1.6); cx.fillRect(x - u * 0.8, y - u * 1.1, u * 0.5, u * 0.3); cx.fillRect(x - u * 0.8, y - u * 1.4, u * 0.3, u * 0.6); break;
    case 'pine': cx.fillStyle = '#1F7A4D'; for (var t = 0; t < 3; t++) { cx.beginPath(); cx.moveTo(x - u * (1.1 - t * 0.2), y - u * t * 0.7); cx.lineTo(x, y - u * (t * 0.7 + 1.1)); cx.lineTo(x + u * (1.1 - t * 0.2), y - u * t * 0.7); cx.fill(); } break;
    case 'tree': cx.fillStyle = '#7A4B25'; cx.fillRect(x - 4, y - u, 8, u); cx.fillStyle = '#1E9E4A'; cx.beginPath(); cx.arc(x, y - u * 1.5, u * 1.1, 0, 6.3); cx.fill(); break;
    case 'cloud': cx.fillStyle = '#ffffffcc'; cx.beginPath(); cx.arc(x, y, u * 0.8, 0, 6.3); cx.arc(x + u, y + 4, u * 0.6, 0, 6.3); cx.arc(x - u, y + 6, u * 0.55, 0, 6.3); cx.fill(); break;
  }
}
function obstacle(kind, x, y, lw, gone) {
  var u = lw * 0.3; cx.globalAlpha = gone ? 0.35 : 1;
  switch (kind) {
    case 'cone': cx.fillStyle = '#FF6A1F'; cx.beginPath(); cx.moveTo(x - u, y + u); cx.lineTo(x, y - u * 1.1); cx.lineTo(x + u, y + u); cx.fill(); cx.fillStyle = '#fff'; cx.fillRect(x - u * 0.55, y, u * 1.1, u * 0.3); break;
    case 'rock': cx.fillStyle = '#8A8D93'; cx.beginPath(); cx.ellipse(x, y, u * 1.2, u, 0, 0, 6.3); cx.fill(); cx.fillStyle = '#B5B8BE'; cx.beginPath(); cx.ellipse(x - u * 0.3, y - u * 0.3, u * 0.5, u * 0.35, 0, 0, 6.3); cx.fill(); break;
    case 'crate': cx.fillStyle = '#C98A3B'; cx.fillRect(x - u, y - u, u * 2, u * 2); cx.strokeStyle = '#7A4F18'; cx.lineWidth = 3; cx.strokeRect(x - u, y - u, u * 2, u * 2); cx.beginPath(); cx.moveTo(x - u, y - u); cx.lineTo(x + u, y + u); cx.moveTo(x + u, y - u); cx.lineTo(x - u, y + u); cx.stroke(); break;
    case 'ice': cx.fillStyle = '#BFEFFF'; cx.strokeStyle = '#4FB6E6'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(x - u, y + u); cx.lineTo(x - u * 0.5, y - u); cx.lineTo(x + u * 0.6, y - u * 0.8); cx.lineTo(x + u, y + u); cx.closePath(); cx.fill(); cx.stroke(); break;
    case 'log': cx.fillStyle = '#8B5A2B'; cx.fillRect(x - u * 1.3, y - u * 0.5, u * 2.6, u); cx.fillStyle = '#C79A5C'; cx.beginPath(); cx.ellipse(x + u * 1.3, y, u * 0.3, u * 0.5, 0, 0, 6.3); cx.fill(); break;
    case 'storm': cx.fillStyle = '#4B4F6B'; cx.beginPath(); cx.arc(x, y, u, 0, 6.3); cx.arc(x + u * 0.9, y + 4, u * 0.7, 0, 6.3); cx.arc(x - u * 0.9, y + 4, u * 0.7, 0, 6.3); cx.fill(); cx.fillStyle = '#FFD23F'; cx.beginPath(); cx.moveTo(x, y + u * 0.2); cx.lineTo(x - u * 0.3, y + u * 1.1); cx.lineTo(x + u * 0.1, y + u * 0.8); cx.lineTo(x - u * 0.1, y + u * 1.6); cx.lineTo(x + u * 0.4, y + u * 0.5); cx.fill(); break;
    case 'bird': cx.strokeStyle = '#2A2A40'; cx.lineWidth = 5; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(x - u * 1.2, y); cx.quadraticCurveTo(x - u * 0.6, y - u, x, y); cx.quadraticCurveTo(x + u * 0.6, y - u, x + u * 1.2, y); cx.stroke(); break;
  }
  cx.globalAlpha = 1;
}
function bolt(x, y, lw) {
  var u = lw * 0.28, p = 1 + Math.sin(performance.now() / 150) * 0.1; cx.fillStyle = '#FFD23F'; cx.strokeStyle = '#fff'; cx.lineWidth = 3;
  cx.beginPath(); cx.arc(x, y, u * p, 0, 6.3); cx.fill(); cx.stroke();
  cx.fillStyle = '#7A4F00'; cx.beginPath(); cx.moveTo(x + u * 0.1, y - u * 0.7); cx.lineTo(x - u * 0.5, y + u * 0.1); cx.lineTo(x, y + u * 0.1); cx.lineTo(x - u * 0.1, y + u * 0.7); cx.lineTo(x + u * 0.5, y - u * 0.1); cx.lineTo(x, y - u * 0.1); cx.fill();
}
function hazard(x, y, lw) { var u = lw * 0.3; cx.fillStyle = '#FF3B5C'; cx.fillRect(x - u, y - u * 0.7, u * 2, u * 1.4); cx.fillStyle = '#fff'; cx.font = '900 ' + (u * 1.4) + 'px sans-serif'; cx.textAlign = 'center'; cx.fillText('!', x, y + u * 0.5); }
function vehicle(x, y, lw, col, kind, alpha, boost, bad) {
  var w = lw * 0.42, h = lw * 0.78;
  cx.save(); cx.globalAlpha = alpha; cx.translate(x, y);
  if (bad) cx.translate(Math.sin(performance.now() / 30) * 2, 0);
  if (boost) { cx.fillStyle = '#FFB020'; cx.beginPath(); cx.moveTo(-w * 0.3, h * 0.5); cx.lineTo(0, h * 0.5 + h * (0.5 + Math.random() * 0.3)); cx.lineTo(w * 0.3, h * 0.5); cx.fill(); }
  if (kind === 'car') {
    cx.fillStyle = '#10142A'; [[-1, -0.3], [1, -0.3], [-1, 0.3], [1, 0.3]].forEach(function (p) { cx.fillRect(p[0] * w * 0.55 - w * 0.1, p[1] * h - h * 0.12, w * 0.2, h * 0.24); });
    cx.fillStyle = col; rr(-w * 0.5, -h * 0.5, w, h, w * 0.3); cx.fill();
    cx.fillStyle = '#FFFFFFcc'; rr(-w * 0.35, -h * 0.2, w * 0.7, h * 0.28, 6); cx.fill();
    cx.fillStyle = '#0003'; cx.fillRect(-w * 0.35, h * 0.18, w * 0.7, h * 0.12);
    cx.fillStyle = '#fff'; cx.fillRect(-w * 0.4, -h * 0.47, w * 0.2, 4); cx.fillRect(w * 0.2, -h * 0.47, w * 0.2, 4);
  } else {
    cx.fillStyle = col; cx.beginPath(); cx.moveTo(0, -h * 0.55); cx.quadraticCurveTo(w * 0.22, -h * 0.2, w * 0.15, h * 0.4); cx.lineTo(-w * 0.15, h * 0.4); cx.quadraticCurveTo(-w * 0.22, -h * 0.2, 0, -h * 0.55); cx.fill();
    cx.beginPath(); cx.moveTo(-w * 0.12, -h * 0.05); cx.lineTo(-w * 1.0, h * 0.2); cx.lineTo(-w * 1.0, h * 0.32); cx.lineTo(-w * 0.12, h * 0.18); cx.lineTo(w * 0.12, h * 0.18); cx.lineTo(w * 1.0, h * 0.32); cx.lineTo(w * 1.0, h * 0.2); cx.lineTo(w * 0.12, -h * 0.05); cx.fill();
    cx.beginPath(); cx.moveTo(-w * 0.08, h * 0.32); cx.lineTo(-w * 0.5, h * 0.5); cx.lineTo(w * 0.5, h * 0.5); cx.lineTo(w * 0.08, h * 0.32); cx.fill();
    cx.fillStyle = '#E9F7FF'; cx.beginPath(); cx.ellipse(0, -h * 0.25, w * 0.1, h * 0.12, 0, 0, 6.3); cx.fill();
  }
  cx.restore();
}
function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }

/* ---------- მართვა ---------- */
function move(dir) { if (race && race.state !== 'done') me.lane = Math.max(0, Math.min(2, me.lane + dir)); }
function attack() {
  if (!race || race.state !== 'run' || me.charges < 1) return;
  me.charges--; Snd.atk(); flash('🚀 გაგზავნე!');
  if (mode === 'online') rawSend({ t: 'atk' }); else if (bot) bot.dyn.push({ d: bot.d + 55, lane: Math.round(bot.x), hit: 0 });
}
function hold(id, on) {
  var el = $(id);
  el.addEventListener('pointerdown', function (e) { e.preventDefault(); Snd.unlock(); on(true); el.classList.add('on'); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { el.addEventListener(ev, function () { on(false); el.classList.remove('on'); }); });
}
$('bL').addEventListener('pointerdown', function (e) { e.preventDefault(); move(-1); });
$('bR').addEventListener('pointerdown', function (e) { e.preventDefault(); move(1); });
$('bAtk').addEventListener('pointerdown', function (e) { e.preventDefault(); attack(); });
hold('bBoost', function (v) { keys.boost = v; });
window.addEventListener('keydown', function (e) {
  if (!race) return;
  if (e.key === 'ArrowLeft' || e.key === 'a') move(-1); else if (e.key === 'ArrowRight' || e.key === 'd') move(1);
  else if (e.key === ' ' || e.key === 'ArrowUp') { keys.boost = true; e.preventDefault(); } else if (e.key === 'x' || e.key === 'Enter') attack();
});
window.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'ArrowUp') keys.boost = false; });
$('cv').addEventListener('pointerdown', function (e) { if (e.clientY < H * 0.7) move(e.clientX < W / 2 ? -1 : 1); });
$('sndBtn').onclick = function () { $('sndBtn').textContent = Snd.toggle() ? '🔇' : '🔊'; };
$('sndBtn').textContent = Snd.muted() ? '🔇' : '🔊';

/* ---------- ღილაკები ---------- */
function cleanName(s) { return String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14) || 'მოთამაშე'; }
function takeName() { myName = cleanName($('name').value); lsSet(NAME_KEY, myName); }
$('createBtn').onclick = function () { takeName(); Snd.unlock(); mode = 'online'; closedByUs = false; stake = parseInt($('stake').value, 10) || 1; sendMsg({ t: 'create', name: myName, stake: stake }); };
$('joinBtn').onclick = function () { takeName(); Snd.unlock(); var c = $('code').value.trim(); if (!c) { toastLobby('ჩაწერე ოთახის კოდი.'); return; } mode = 'online'; closedByUs = false; sendMsg({ t: 'join', code: c, name: myName }); };
$('botBtn').onclick = function () { takeName(); Snd.unlock(); mode = 'bot'; role = 'a'; stake = Math.min(parseInt($('stake').value, 10) || 1, Math.max(1, points)); names = { a: myName, b: 'კომპიუტერი' }; beginRace((Math.random() * 2e9) | 0 || 1, 3200); };
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
$('garageBtn').onclick = function () { show('s-garage'); $('garCar').innerHTML = carSVG(points); $('garTxt').textContent = points + ' / ' + PARTS + ' ნაწილი შეღებილია'; $('garPrize').hidden = points < PARTS; $('garPrize').textContent = PRIZE_TEXT; };
$('garBack').onclick = function () { show('s-lobby'); };

/* ---------- დასაწყისი ---------- */
$('name').value = lsGet(NAME_KEY) || '';
setPoints(points);
(function () {
  var rm = null; try { rm = new URL(location.href).searchParams.get('room'); } catch (e) {}
  if (rm) { $('code').value = rm.toUpperCase().slice(0, 8); $('invite').hidden = false; $('inviteCode').textContent = $('code').value; $('invite').firstChild.nodeValue = 'მეგობარმა გიწვია ოთახში '; }
  try { var s = JSON.parse(sessionStorage.getItem(SESS_KEY) || 'null'); if (s && s.code && s.token && !rm) { session = s; mode = 'online'; role = s.role; code = s.code; myName = s.name || ''; show('s-wait'); showWait(); $('codeBig').textContent = code; connect(); } } catch (e) {}
})();
window.__duel = { me: function () { return me; }, genTrack: genTrack, Runner: Runner, setPoints: setPoints };
})();
