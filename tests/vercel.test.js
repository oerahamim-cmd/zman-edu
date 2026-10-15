'use strict';
// מדמה את הכניסה של Vercel: הפונקציה api/[...path].js מקבלת (req, res) מפלטפורמה שמפענחת את הגוף מראש
// ומציבה את כתובת הלקוח בכותרות. כאן עוטפים שרת רגיל באותה פונקציה בדיוק.
process.env.VERCEL = '1';
process.env.PG_MEMORY = '1';
delete process.env.DATABASE_URL;
process.env.FAKE_TODAY = '2026-10-14';
process.env.PROGRAM_START = '2026-09-06';
process.env.SETUP_CODE = 'vercel-setup-code';
process.env.NODE_ENV = 'production';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const handler = require('../api/[...path].js');
const db = require('../server/db');
const auth = require('../server/auth');

let server, base;

// כמו Vercel: req.body מפוענח (JSON → אובייקט), ו-req.query מכיל את פרמטרי הנתיב
function vercelLike(req, res) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    const type = String(req.headers['content-type'] || '');
    const q = new URL(req.url, 'http://localhost').searchParams;
    req.query = {};
    for (const k of new Set(q.keys())) req.query[k] = q.getAll(k).length > 1 ? q.getAll(k) : q.get(k);
    Object.defineProperty(req, 'body', { configurable: true, get() { if (!raw) return undefined; if (type.startsWith('application/json')) { try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON'); } } return raw; } });
    handler(req, res).catch((e) => { res.statusCode = 500; res.end(String(e.message)); });
  });
}

before(async () => {
  await db.ready();
  server = http.createServer(vercelLike);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server.closeAllConnections?.(); await new Promise((r) => server.close(r)); await db.close(); });

const H = (extra = {}) => ({ 'X-Forwarded-Proto': 'https', 'Content-Type': 'application/json', ...extra });

test('נתיבי ה-API עובדים דרך הפונקציה, כולל בריאות עם בדיקת בסיס הנתונים', async () => {
  const health = await fetch(`${base}/api/healthz`, { headers: H() });
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  const pub = await (await fetch(`${base}/api/public`, { headers: H() })).json();
  assert.equal(pub.schools.length, 3);
  assert.equal(pub.setupNeeded, true);
  assert.equal((await fetch(`${base}/api/nope`, { headers: H() })).status, 404);
});

test('גוף JSON מפוענח מראש (כמו ב-Vercel) מתקבל, וגוף שבור נדחה יפה', async () => {
  const bad = await fetch(`${base}/api/auth/manager/setup`, { method: 'POST', headers: H(), body: '{not json' });
  assert.equal(bad.status, 400);
  const wrong = await fetch(`${base}/api/auth/manager/setup`, { method: 'POST', headers: H(), body: JSON.stringify({ setupCode: 'nope', name: 'מנהלת', email: 'v@example.org', password: 'long-enough-password' }) });
  assert.equal(wrong.status, 403);
  const ok = await fetch(`${base}/api/auth/manager/setup`, { method: 'POST', headers: H(), body: JSON.stringify({ setupCode: 'vercel-setup-code', name: 'מנהלת', email: 'v@example.org', password: 'long-enough-password' }) });
  assert.equal(ok.status, 200);
  const cookie = ok.headers.getSetCookie().join(';');
  assert.match(cookie, /Secure/);
  const sid = cookie.split(';')[0];
  const me = await fetch(`${base}/api/admin/leads`, { headers: H({ Cookie: sid }) });
  assert.equal(me.status, 200);
});

test('כתובת הלקוח נלקחת מהכותרות של הפלטפורמה: נעילה לפי חשבון, בלי לחסום לקוחות אחרים', async () => {
  await auth.resetThrottle();
  const login = (ip, password) => fetch(`${base}/api/auth/manager/login`, { method: 'POST', headers: H({ 'X-Forwarded-For': ip }), body: JSON.stringify({ email: 'v@example.org', password }) });
  for (let i = 0; i < 8; i++) assert.equal((await login('198.51.100.1', 'wrong-password-x')).status, 401);
  assert.equal((await login('198.51.100.9', 'long-enough-password')).status, 429, 'החשבון ננעל גם לכתובת אחרת');
  await auth.resetThrottle();
  // חסימת כתובת אחת לא חוסמת כתובת אחרת
  for (let i = 0; i < 60; i++) await auth.failed('ip:198.51.100.2');
  assert.equal((await login('198.51.100.2', 'long-enough-password')).status, 429);
  assert.equal((await login('198.51.100.3', 'long-enough-password')).status, 200);
  await auth.resetThrottle();
});

test('שחזור הנתיב מפרמטר הנתיב אם הכתובת הגיעה בלי /api', async () => {
  // כאן req.query מוצב כמו ש-Vercel עושה לנתיב עם סימון [...path]
  const r = await fetch(`${base}/rewritten-by-platform?path=public`, { headers: H() });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).schools.length, 3);
  const nested = await fetch(`${base}/rewritten-by-platform?path=auth&path=educator&path=login`, { method: 'POST', headers: H(), body: JSON.stringify({ school: 'rabin', name: 'מחנכת שלא קיימת', code: '1111' }) });
  assert.equal(nested.status, 401, 'נתיב מרובה מקטעים הגיע ל-login');
});
