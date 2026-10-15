'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, db } = require('./helpers');

let app;
before(async () => { app = await setup({ seed: false }); });
after(async () => { await app.close(); });

const conv = (over = {}) => ({ round: 1, axis: 'identity', kind: 'notebook', feeling: 'good', note: '', ...over });

// מחנכת חדשה שנרשמה "השבוע" (11.10.2026), ללא מבטים קודמים
async function newEducator(name = 'בדיקה אחת') {
  const c = app.client();
  const r = await c.post('/api/auth/educator/register', { school: 'rabin', name, code: '1234', joinCode: (await app.joinCodes()).rabin.educator });
  assert.equal(r.status, 200);
  return c;
}

test('שליחת מבט לשבוע הנוכחי, קריאה חוזרת ועריכה (אותו שבוע = עדכון, לא כפילות)', async () => {
  const c = await newEducator();
  const put = await c.put('/api/me/reports/2026-10-11', { convs: [conv(), conv({ round: 2, axis: 'other', axisOther: 'שיחה על שינה', kind: 'other', kindOther: 'יוזמה שלו', feeling: 'thoughtful', note: 'שאלה פתוחה' })] });
  assert.equal(put.status, 200);
  assert.equal(put.json.report.convs.length, 2);
  assert.match(put.json.report.at, /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/); // תאריך שליחה לפי שעון ישראל
  assert.equal((await c.get('/api/me')).json.reports.length, 1);
  const edit = await c.put('/api/me/reports/2026-10-11', { convs: [conv({ feeling: 'inspired' })] });
  assert.equal(edit.status, 200);
  const again = await c.get('/api/me');
  assert.equal(again.json.reports.length, 1);
  assert.equal(again.json.reports[0].convs.length, 1);
  assert.equal(again.json.reports[0].convs[0].feeling, 'inspired');
});

test('שבוע בלי שיחות נספר, עם סיבה אופציונלית', async () => {
  const c = await newEducator('בדיקה שתיים');
  const r = await c.put('/api/me/reports/2026-10-11', { convs: [], noneReason: 'holiday' });
  assert.equal(r.status, 200);
  assert.equal(r.json.report.convs.length, 0);
  assert.equal(r.json.report.noneReason, 'holiday');
  assert.equal((await c.put('/api/me/reports/2026-10-11', { convs: [], noneReason: 'bogus' })).status, 400);
  // סיבה לא נשמרת כשיש שיחות
  const withConv = await c.put('/api/me/reports/2026-10-11', { convs: [conv()], noneReason: 'holiday' });
  assert.equal(withConv.json.report.noneReason, '');
});

test('שבועות שלא נפתחים: עתיד, לפני התכנית, לפני ההצטרפות, ויום שאינו ראשון', async () => {
  const c = await newEducator('בדיקה שלוש');
  const body = { convs: [conv()] };
  assert.equal((await c.put('/api/me/reports/2026-10-18', body)).status, 400, 'שבוע עתידי');
  assert.equal((await c.put('/api/me/reports/2026-08-30', body)).status, 400, 'לפני תחילת התכנית');
  assert.equal((await c.put('/api/me/reports/2026-10-04', body)).status, 400, 'לפני שהצטרפה');
  assert.equal((await c.put('/api/me/reports/2026-10-12', body)).status, 400, 'יום שני');
  assert.equal((await c.put('/api/me/reports/not-a-date', body)).status, 400);
  assert.equal((await c.put('/api/me/reports/2026-02-31', body)).status, 400, 'תאריך שלא קיים');
});

test('ולידציה: רק הערכים המותרים, שיחה מלאה, עד 15 שיחות', async () => {
  const c = await newEducator('בדיקה ארבע');
  const bad = [
    [conv({ round: 4 })], [conv({ round: '1' })], [conv({ axis: 'x' })], [conv({ kind: 'x' })], [conv({ feeling: '🙂' })],
    [conv({ axis: 'other', axisOther: '' })], [conv({ kind: 'other', kindOther: '  ' })], [{ round: 1 }], ['x'], [null],
    Array.from({ length: 16 }, () => conv()),
  ];
  for (const convs of bad) assert.equal((await c.put('/api/me/reports/2026-10-11', { convs })).status, 400, JSON.stringify(convs).slice(0, 60));
  assert.equal((await c.put('/api/me/reports/2026-10-11', {})).status, 400);
  assert.equal((await c.put('/api/me/reports/2026-10-11', { convs: Array.from({ length: 15 }, () => conv()) })).status, 200);
});

test('אין בשום מקום שדה לתלמיד: שדות מיותרים נזרקים ולא נשמרים', async () => {
  const c = await newEducator('בדיקה חמש');
  const r = await c.put('/api/me/reports/2026-10-11', { studentName: 'דני כהן', convs: [{ ...conv(), student: 'דני', studentId: 123, name: 'דני' }] });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json.report.convs[0]).sort(), ['axis', 'axisOther', 'feeling', 'kind', 'kindOther', 'note', 'round']);
  assert.ok(!r.text.includes('דני'));
  // גם בסכמה: אין עמודה שמחזיקה מידע על תלמיד
  const cols = await db.all(`SELECT column_name FROM information_schema.columns WHERE table_name IN ('conversations', 'reports')`);
  assert.ok(cols.length > 8);
  for (const { column_name: col } of cols) assert.ok(!/student|pupil|child/i.test(col), `עמודה חשודה: ${col}`);
});

test('טקסט חופשי נחתך לאורך סביר, והערה לא יכולה לשבור את הדף', async () => {
  const c = await newEducator('בדיקה שש');
  const r = await c.put('/api/me/reports/2026-10-11', { convs: [conv({ note: '<img src=x onerror=alert(1)>' + 'א'.repeat(3000) })] });
  assert.equal(r.status, 200);
  assert.ok(r.json.report.convs[0].note.length <= 1000);
  // ההערה נשמרת כטקסט; הממשק מציג אותה כטקסט בלבד (textContent), ולכן אין הרצה
  assert.ok(r.json.report.convs[0].note.startsWith('<img'));
});

test('שמירה במקביל של אותו שבוע לא יוצרת כפילויות', async () => {
  const c = await newEducator('בדיקה שבע');
  const results = await Promise.all(Array.from({ length: 6 }, (_, i) => c.put('/api/me/reports/2026-10-11', { convs: Array.from({ length: i + 1 }, () => conv()) })));
  for (const r of results) assert.equal(r.status, 200);
  const mine = await c.get('/api/me');
  assert.equal(mine.json.reports.length, 1);
  const n = (await db.get(`SELECT COUNT(*)::int AS n FROM conversations c JOIN reports r ON r.id = c.report_id JOIN users u ON u.id = r.educator_id WHERE u.name = ?`, ['בדיקה שבע'])).n;
  assert.equal(n, mine.json.reports[0].convs.length, 'אין שיחות יתומות משמירה קודמת');
});

test('ההגדרות הציבוריות: שבוע נוכחי ותחילת התכנית לפי שעון ישראל', async () => {
  const r = await app.client().get('/api/public');
  assert.equal(r.json.today, '2026-10-14');
  assert.equal(r.json.curWeek, '2026-10-11');
  assert.equal(r.json.programStart, '2026-09-06');
});
