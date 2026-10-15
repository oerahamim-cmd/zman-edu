'use strict';
// בודק את מנהל ההתקן של הענן (pg) מול שרת Postgres אמיתי בפרוטוקול הרשת (PGlite מאחורי socket),
// כמו שהאפליקציה תתחבר ל-Neon דרך DATABASE_URL. שאר הבדיקות רצות על PGlite ישירות.
const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

const PORT = 5500 + Math.floor(Math.random() * 400);
let pg, socket, app;

process.env.FAKE_TODAY = '2026-10-14';
process.env.PROGRAM_START = '2026-09-06';
process.env.SETUP_CODE = 'wire-setup-code';
process.env.NODE_ENV = 'test';
process.env.PG_POOL_MAX = '1'; // שרת ה-socket של PGlite מטפל בחיבור אחד בכל רגע
delete process.env.PG_MEMORY;
delete process.env.VERCEL;

before(async () => {
  pg = await PGlite.create();
  socket = new PGLiteSocketServer({ db: pg, port: PORT, host: '127.0.0.1' });
  await socket.start();
  process.env.DATABASE_URL = `postgres://postgres:postgres@127.0.0.1:${PORT}/postgres`;
  const { start } = require('../server/app');
  const { seedDemo } = require('../server/seed');
  app = await start(0, '127.0.0.1');
  await seedDemo();
});
after(async () => {
  await app.close();
  await socket.stop();
  await pg.close();
});

const call = async (method, path, body, cookie = '') => {
  const res = await fetch(`http://127.0.0.1:${app.port}${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* */ }
  const sid = (res.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).find((c) => c.startsWith('sid=')) || '';
  return { status: res.status, json, text, sid };
};

test('דרך pg: סכמה, נתוני דוגמה וקריאה ציבורית (כולל סוגי נתונים)', async () => {
  const r = await call('GET', '/api/public');
  assert.equal(r.status, 200);
  assert.equal(r.json.schools.length, 4);
  assert.equal(typeof r.json.tools[0].id, 'number', 'מזהים הם מספרים, לא מחרוזות');
  assert.equal(r.json.tools[0].desc.length > 0, true);
});

test('דרך pg: הרשמה, כניסה, שליחת מבט בטרנזקציה וקריאה חוזרת', async () => {
  const codes = await require('../server/db').all('SELECT slug, educator_code FROM schools');
  const rabin = codes.find((c) => c.slug === 'rabin').educator_code;
  const reg = await call('POST', '/api/auth/educator/register', { school: 'rabin', name: 'בדיקת רשת', code: '2468', joinCode: rabin });
  assert.equal(reg.status, 200);
  assert.equal(typeof reg.json.user.id, 'number');
  const put = await call('PUT', '/api/me/reports/2026-10-11', { convs: [{ round: 1, axis: 'identity', kind: 'notebook', feeling: 'good', note: 'בדיקה' }, { round: 2, axis: 'goals', kind: 'deep', feeling: 'inspired', note: '' }] }, reg.sid);
  assert.equal(put.status, 200);
  assert.equal(put.json.report.convs.length, 2);
  const again = await call('PUT', '/api/me/reports/2026-10-11', { convs: [{ round: 3, axis: 'agency', kind: 'complex', feeling: 'heavy', note: '' }] }, reg.sid);
  assert.equal(again.json.report.convs.length, 1);
  assert.equal((await call('GET', '/api/me', undefined, reg.sid)).json.reports.length, 1);
  assert.equal((await call('POST', '/api/auth/educator/login', { school: 'rabin', name: 'בדיקת רשת', code: '0000' })).status, 401);
});

test('דרך pg: מובילה רואה מצטבר בלבד, ובית ספר אחר לא נחשף', async () => {
  const lead = await call('POST', '/api/auth/lead/login', { school: 'naomi-shemer', name: 'נטע רוזן', code: '1357' });
  assert.equal(lead.status, 200);
  const ov = await call('GET', '/api/lead/overview?school=rabin', undefined, lead.sid);
  assert.equal(ov.status, 200);
  assert.equal(ov.json.masked, true);
  assert.equal(ov.json.expected, 5);
  for (const n of ['נועה כהן', 'מיכל דהן', 'הילה פרץ', 'עדי מזרחי', 'בדיקת רשת']) assert.ok(!ov.text.includes(n), `שם ${n} דלף`);
  for (const x of Object.values(ov.json.dist).flat()) if (x.hidden) assert.ok(!('n' in x));
  assert.equal((await call('GET', '/api/lead/educators', undefined, lead.sid)).status, 403);
});

test('דרך pg: מנהלת, יומן append-only, והגבלת ניסיונות מקבילים', async () => {
  const m = await call('POST', '/api/auth/manager/login', { email: 'manager@example.org', password: 'demo-password-1234' });
  assert.equal(m.status, 200);
  const ov = await call('GET', '/api/admin/overview', undefined, m.sid);
  assert.equal(ov.json.masked, false);
  assert.ok(ov.json.matrix.rows.length >= 15);
  const csv = await call('GET', '/api/admin/export.csv', undefined, m.sid);
  assert.equal(csv.status, 200);
  assert.ok((await call('GET', '/api/admin/audit', undefined, m.sid)).json.entries.length > 0);
  const db = require('../server/db');
  await assert.rejects(db.run('DELETE FROM audit_log'), /append-only/);
  // ניסיונות מקבילים נחסמים גם דרך pg
  const tries = await Promise.all(Array.from({ length: 20 }, (_, i) => call('POST', '/api/auth/educator/login', { school: 'rabin', name: 'עומר כהן', code: String(7000 + i) })));
  assert.ok(tries.filter((t) => t.status === 401).length <= 8);
  assert.ok(tries.filter((t) => t.status === 429).length >= 12);
});
