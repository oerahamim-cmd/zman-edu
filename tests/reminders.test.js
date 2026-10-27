'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, db } = require('./helpers');
const reminders = require('../server/reminders');

let app;
const sent = [];
before(async () => { app = await setup({ seed: false }); reminders.setSink((m) => sent.push(m)); });
after(async () => { reminders.setSink(null); delete process.env.CRON_SECRET; await app.close(); });

// "היום" בבדיקות הוא רביעי 14.10.2026 (יום 3), והשבוע מתחיל ב-11.10
async function newEducator(name) {
  const c = app.client();
  const r = await c.post('/api/auth/educator/register', { school: 'rabin', name, code: '1234', joinCode: (await app.joinCodes()).rabin.educator });
  assert.equal(r.status, 200);
  return c;
}
const NOW = new Date('2026-10-14T14:10:00Z'); // 17:10 בשעון ישראל
const conv = { axes: ['identity'], kinds: ['intro'], depth: 2, talkPct: 50, feeling: 'good', note: '' };

test('הגדרת תזכורת: ערכים לא תקינים נדחים, ומייל נשמר רק כשבוחרים מייל', async () => {
  const c = await newEducator('תזכורת אחת');
  assert.equal((await c.get('/api/me/reminder')).json.reminder, null);
  for (const bad of [{ day: 6, hour: 17 }, { day: 2, hour: 23 }, { day: 2, hour: 17, mail: true }, { day: 2, hour: 17, mail: true, email: 'לא מייל' }, { day: '2', hour: 17 }]) {
    assert.equal((await c.put('/api/me/reminder', bad)).status, 400, JSON.stringify(bad));
  }
  assert.equal((await c.put('/api/me/reminder', { day: 4, hour: 17, push: true, mail: true, email: 'a@b.org' })).status, 200);
  assert.deepEqual((await c.get('/api/me/reminder')).json.reminder, { day: 4, hour: 17, push: true, mail: true, email: 'a@b.org', skipWeek: false });
  await c.put('/api/me/reminder', { day: 4, hour: 17, push: true, mail: false, email: 'a@b.org' });
  assert.equal((await c.get('/api/me/reminder')).json.reminder.email, '');
  // מובילה ומנהלת לא מגדירות תזכורת
  assert.equal((await app.client().get('/api/me/reminder')).status, 401);
});

test('מנוי להתראות: רק כתובת https, ועד חמישה מכשירים', async () => {
  const c = await newEducator('תזכורת שתיים');
  assert.equal((await c.post('/api/me/push-subscriptions', { endpoint: 'http://x', keys: { p256dh: 'a', auth: 'b' } })).status, 400);
  for (let i = 0; i < 7; i++) assert.equal((await c.post('/api/me/push-subscriptions', { endpoint: `https://push.example/${i}`, keys: { p256dh: 'p', auth: 'a' } })).status, 200);
  const id = (await db.get("SELECT id FROM users WHERE name = 'תזכורת שתיים'")).id;
  assert.equal((await db.get('SELECT COUNT(*)::int AS n FROM push_subscriptions WHERE user_id = ?', [id])).n, 5);
});

test('ריצה שעתית: רק ביום ובשעה שנבחרו, פעם אחת, ולא למי שכבר שלחה או דילגה', async () => {
  const a = await newEducator('תזכורת שלוש'), b = await newEducator('תזכורת ארבע'), d = await newEducator('תזכורת חמש'), e = await newEducator('תזכורת שש');
  await a.put('/api/me/reminder', { day: 3, hour: 17, push: true, mail: true, email: 'three@example.org' });
  await a.post('/api/me/push-subscriptions', { endpoint: 'https://push.example/three', keys: { p256dh: 'p', auth: 'a' } });
  await b.put('/api/me/reminder', { day: 3, hour: 17, mail: true, email: 'four@example.org' });
  assert.equal((await b.put('/api/me/reports/2026-10-11', { convs: [conv] })).status, 200); // כבר שלחה מבט
  await d.put('/api/me/reminder', { day: 3, hour: 17, mail: true, email: 'five@example.org', skipWeek: true }); // מדלגת השבוע
  await e.put('/api/me/reminder', { day: 3, hour: 9, mail: true, email: 'six@example.org' }); // שעה אחרת
  sent.length = 0;
  const r = await reminders.run(NOW);
  assert.equal(r.sent, 1);
  assert.equal(r.alreadyDone, 1);
  assert.deepEqual(sent.map((m) => m.channel).sort(), ['mail', 'push']);
  assert.equal(sent.find((m) => m.channel === 'mail').to, 'three@example.org');
  assert.equal(sent[0].payload.url, '/#/me/report/2026-10-11'); // נגיעה בתזכורת פותחת ישר את המבט לשבוע הזה
  sent.length = 0;
  assert.equal((await reminders.run(NOW)).sent, 0); // לא פעמיים באותו יום
  assert.equal(sent.length, 0);
});

test('הנתיב השעתי מוגן בסוד', async () => {
  const c = app.client();
  delete process.env.CRON_SECRET;
  assert.equal((await c.get('/api/cron/reminders')).status, 503);
  process.env.CRON_SECRET = 'cron-secret-for-tests-123';
  assert.equal((await c.get('/api/cron/reminders')).status, 401);
  assert.equal((await c.get('/api/cron/reminders', { Authorization: 'Bearer wrong-secret-for-tests-12' })).status, 401);
  const ok = await c.get('/api/cron/reminders', { Authorization: 'Bearer cron-secret-for-tests-123' });
  assert.equal(ok.status, 200);
  assert.ok('due' in ok.json);
});
