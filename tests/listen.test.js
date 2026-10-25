'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, educatorLogin } = require('./helpers');

let app;
const realFetch = global.fetch;
let seen = [];
before(async () => { app = await setup(); });
after(async () => { global.fetch = realFetch; delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_MODEL; await app.close(); });

const ask = (c, messages) => c.post('/api/listen/chat', { messages });
const turn = (...t) => t.map((text, i) => ({ role: i % 2 ? 'assistant' : 'user', text }));

function mockAnthropic(handler) {
  global.fetch = (url, opts) => {
    if (String(url).startsWith('https://api.anthropic.com/')) { seen.push(JSON.parse(opts.body)); return handler(opts); }
    return realFetch(url, opts);
  };
}

test('בוט המקרה שלי: דורש כניסה, ובלי מפתח מחזיר 503 כדי שהכלי יחזור לדוגמאות מוכנות', async () => {
  delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_MODEL;
  const c = app.client();
  assert.equal((await ask(c, turn('שלום'))).status, 401);
  await educatorLogin(c, 0);
  const r = await ask(c, turn('שלום'));
  assert.equal(r.status, 503);
  assert.equal(r.json.code, 'bot_off');
});

test('בוט המקרה שלי: מעביר את השיחה למודל, מחזיר תשובה, ולא שולח את המפתח ללקוח', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test'; process.env.ANTHROPIC_MODEL = 'test-model';
  seen = [];
  mockAnthropic(async (opts) => {
    assert.equal(opts.headers['x-api-key'], 'sk-test');
    return { ok: true, json: async () => ({ content: [{ type: 'text', text: ' מה עשית אז? ' }] }) };
  });
  const c = app.client();
  await educatorLogin(c, 0);
  const r = await ask(c, turn('תלמיד אומר לא יודע', 'ומה קרה לפני?', 'הוא שתק'));
  assert.equal(r.status, 200);
  assert.equal(r.json.reply, 'מה עשית אז?');
  assert.equal(JSON.stringify(r.json).includes('sk-test'), false);
  assert.equal(seen[0].model, 'test-model');
  assert.equal(seen[0].messages.length, 3);
  assert.match(seen[0].system, /סימן שאלה/);
});

test('בוט המקרה שלי: שיחה לא תקינה נדחית, ותקלה במודל לא מדליפה פרטים', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test'; process.env.ANTHROPIC_MODEL = 'test-model';
  const c = app.client();
  await educatorLogin(c, 0);
  assert.equal((await ask(c, [])).status, 400);
  assert.equal((await ask(c, [{ role: 'user', text: 'a' }, { role: 'user', text: 'b' }])).status, 400, 'שתי הודעות רצופות של אותו צד');
  assert.equal((await ask(c, [{ role: 'assistant', text: 'a' }])).status, 400);
  assert.equal((await ask(c, [{ role: 'user', text: '   ' }])).status, 400);
  assert.equal((await ask(c, Array.from({ length: 17 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: 'x' })))).status, 400);
  mockAnthropic(async () => ({ ok: false, status: 500, json: async () => ({ error: 'secret upstream detail' }) }));
  const bad = await ask(c, turn('שלום'));
  assert.equal(bad.status, 502);
  assert.equal(bad.text.includes('secret'), false);
});

test('בוט המקרה שלי: יש הגבלת קצב לכל משתמשת', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test'; process.env.ANTHROPIC_MODEL = 'test-model';
  mockAnthropic(async () => ({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'ok' }] }) }));
  const c = app.client();
  await educatorLogin(c, 2);
  let last = 200;
  for (let i = 0; i < 45; i++) last = (await ask(c, turn('שלום'))).status;
  assert.equal(last, 429);
});
