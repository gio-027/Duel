'use strict';
const { spawn } = require('child_process');
const assert = require('assert');
const WebSocket = require('ws');
const PORT = 3502;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function client() {
  return new Promise((res, rej) => {
    const ws = new WebSocket('ws://127.0.0.1:' + PORT + '/ws'), msgs = [];
    ws.on('message', (d) => msgs.push(JSON.parse(d)));
    const c = { ws, msgs, send: (m) => ws.send(JSON.stringify(m)),
      async type(t, ms) { const end = Date.now() + (ms || 2000); for (;;) { const i = msgs.findIndex((m) => m.t === t); if (i >= 0) return msgs.splice(i, 1)[0]; if (Date.now() > end) throw new Error('timeout ' + t + ' have ' + JSON.stringify(msgs)); await sleep(20); } } };
    ws.on('open', () => res(c)); ws.on('error', rej);
  });
}
(async () => {
  const srv = spawn(process.execPath, ['server.js'], { env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.on('data', (d) => String(d).includes('listening') && r()));
  try {
    let r = await fetch('http://127.0.0.1:' + PORT + '/'); assert.strictEqual(r.status, 200);
    assert.strictEqual((await fetch('http://127.0.0.1:' + PORT + '/server.js')).status, 404);
    assert.strictEqual((await fetch('http://127.0.0.1:' + PORT + '/icon-192.png')).status, 200);
    const A = await client(); A.send({ t: 'create', name: 'გიო', stake: 3 });
    const cr = await A.type('created'); assert.strictEqual(cr.stake, 3);
    const B = await client(); B.send({ t: 'join', code: 'ZZZZ' }); assert.strictEqual((await B.type('err')).code, 'no_room');
    B.send({ t: 'join', code: cr.code.toLowerCase(), name: 'ნინო' });
    assert.strictEqual((await B.type('joined')).stake, 3);
    const sa = await A.type('start'), sb = await B.type('start');
    assert.strictEqual(sa.seed, sb.seed); assert.strictEqual(sa.stake, 3);
    A.send({ t: 'pos', d: 50, x: 1, b: 1 });
    const o = await B.type('opp'); assert.strictEqual(o.d, 50);
    await sleep(3400);
    A.send({ t: 'atk' }); await B.type('atk');
    A.send({ t: 'fin' }); await sleep(200);
    assert.ok(!A.msgs.some((m) => m.t === 'result'), 'too early finish must be ignored');
    const C = await client(); C.send({ t: 'join', code: cr.code }); assert.strictEqual((await C.type('err')).code, 'room_full');
    console.log('ok  basic');
    B.ws.close(); assert.strictEqual((await A.type('peer')).online, false);
    A.send({ t: 'leave' }); await sleep(100);
    console.log('ALL TESTS PASSED');
  } finally { srv.kill('SIGTERM'); }
})().then(() => process.exit(0), (e) => { console.error('FAILED', e); process.exit(1); });
