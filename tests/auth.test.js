'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, educatorLogin, leadLogin, EDUCATORS, db } = require('./helpers');
const auth = require('../server/auth');

let app;
before(async () => { app = await setup(); });
after(async () => { await app.close(); });

const idOf = async (name) => (await db.get('SELECT id FROM users WHERE name = ?', [name])).id;

test('הרשמת מחנכת: קוד הצטרפות חובה, ואז כניסה אוטומטית', async () => {
  const c = app.client();
  const codes = await app.joinCodes();
  const base = { school: 'rabin', name: 'מחנכת חדשה', code: '4321' };
  const bad = await c.post('/api/auth/educator/register', { ...base, joinCode: 'AAA-AAA' });
  assert.equal(bad.status, 403);
  assert.equal(c.cookie, '', 'לא נפתח סשן');
  assert.equal((await c.post('/api/auth/educator/register', { ...base, code: '12', joinCode: codes.rabin.educator })).status, 400);
  // קוד של מובילה לא פותח הרשמה כמחנכת, וקוד של בית ספר אחר לא מתאים
  assert.equal((await c.post('/api/auth/educator/register', { ...base, joinCode: codes.rabin.lead })).status, 403);
  assert.equal((await c.post('/api/auth/educator/register', { ...base, joinCode: codes['naomi-shemer'].educator })).status, 403);
  const ok = await c.post('/api/auth/educator/register', { ...base, joinCode: codes.rabin.educator.toLowerCase().replace('-', ' ') });
  assert.equal(ok.status, 200, 'קוד הצטרפות לא רגיש לרישיות ולמקף');
  assert.equal(ok.json.user.role, 'educator');
  assert.equal(ok.json.user.joinedWeek, '2026-10-11');
  assert.equal((await c.get('/api/me')).status, 200);
});

test('שם שכבר קיים (גם עם רווחים וגרשיים שונים) נדחה, ושם לא קיים לא נחשף', async () => {
  const c = app.client();
  const codes = await app.joinCodes();
  const dup = await c.post('/api/auth/educator/register', { school: 'naomi-shemer', name: '  נועה   כהן ', code: '5555', joinCode: codes['naomi-shemer'].educator });
  assert.equal(dup.status, 409);
  const a = await c.post('/api/auth/educator/login', { school: 'naomi-shemer', name: 'אין כזו', code: '1111' });
  const b = await c.post('/api/auth/educator/login', { school: 'naomi-shemer', name: 'נועה כהן', code: '0000' });
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.deepEqual(a.json, b.json, 'אותה תשובה לשם לא קיים ולקוד שגוי');
});

test('הקוד נשמר מוצפן (scrypt), לא כטקסט', async () => {
  const rows = await db.all('SELECT secret_hash FROM users WHERE secret_hash IS NOT NULL');
  assert.ok(rows.length > 10);
  for (const r of rows) assert.match(r.secret_hash, /^scrypt\$/);
});

test('ניחוש קוד: נעילה אחרי 8 ניסיונות, גם לקוד הנכון', async () => {
  await auth.resetThrottle();
  const c = app.client();
  const [slug, name] = EDUCATORS[1];
  for (let i = 0; i < 8; i++) assert.equal((await c.post('/api/auth/educator/login', { school: slug, name, code: '9999' })).status, 401);
  const locked = await c.post('/api/auth/educator/login', { school: slug, name, code: String(1000 + 37) });
  assert.equal(locked.status, 429);
  assert.match(locked.json.error, /יותר מדי ניסיונות/);
  // חשבון אחר באותה כתובת עדיין נכנס (בית ספר שלם יושב על אותו IP)
  assert.equal((await educatorLogin(app.client(), 2)).status, 200);
  await auth.resetThrottle();
});

test('ניחוש קוד במקביל: גם 30 ניסיונות בו-זמניים לא עוברים את המגבלה', async () => {
  await auth.resetThrottle();
  const [slug, name] = EDUCATORS[3];
  const tries = await Promise.all(Array.from({ length: 30 }, (_, i) => app.client().post('/api/auth/educator/login', { school: slug, name, code: String(8000 + i) })));
  const reached = tries.filter((r) => r.status === 401).length;
  assert.ok(reached <= 8, `רק 8 ניסיונות מותרים, ונבדקו ${reached}`);
  assert.ok(tries.filter((r) => r.status === 429).length >= 22);
  await auth.resetThrottle();
});

test('ניחוש קוד הצטרפות נחסם', async () => {
  await auth.resetThrottle();
  const c = app.client();
  const codes = await app.joinCodes();
  const body = (joinCode) => ({ school: 'rabin', name: 'ניחוש קוד', code: '1234', joinCode });
  for (let i = 0; i < 20; i++) assert.equal((await c.post('/api/auth/educator/register', body(`BAD-${String(i).padStart(3, '0')}`))).status, 403);
  assert.equal((await c.post('/api/auth/educator/register', body(codes.rabin.educator))).status, 429);
  await auth.resetThrottle();
});

test('כניסה: "להישאר מחוברים" יוצר עוגייה מתמשכת, בלעדיו עוגיית סשן', async () => {
  const c = app.client();
  const [slug, name] = EDUCATORS[3];
  const code = String(1000 + 3 * 37);
  const a = await c.post('/api/auth/educator/login', { school: slug, name, code });
  const sa = a.headers.getSetCookie().join(';');
  assert.match(sa, /HttpOnly/);
  assert.match(sa, /SameSite=Strict/);
  assert.ok(!/Max-Age=\d{3,}/.test(sa), 'בלי "להישאר מחוברים" אין Max-Age ארוך');
  const b = await c.post('/api/auth/educator/login', { school: slug, name, code, remember: true });
  assert.match(b.headers.getSetCookie().join(';'), /Max-Age=2592000/);
});

test('יציאה סוגרת את הסשן בשרת', async () => {
  const c = app.client();
  await educatorLogin(c, 4);
  const cookie = c.cookie;
  assert.equal((await c.get('/api/me')).status, 200);
  await c.post('/api/auth/logout');
  const stale = app.client();
  stale.cookie = cookie;
  assert.equal((await stale.get('/api/me')).status, 401, 'העוגייה הישנה כבר לא עובדת');
});

test('החלפת קוד: דורשת את הנוכחי, ומנתקת מכשירים אחרים', async () => {
  const [slug, name] = EDUCATORS[6];
  const a = app.client(), b = app.client();
  await educatorLogin(a, 6); await educatorLogin(b, 6);
  assert.equal((await a.post('/api/me/code', { current: '0000', next: '2222' })).status, 401);
  assert.equal((await a.post('/api/me/code', { current: String(1000 + 6 * 37), next: 'abcd' })).status, 400);
  assert.equal((await a.post('/api/me/code', { current: String(1000 + 6 * 37), next: '2222' })).status, 200);
  assert.equal((await b.get('/api/me')).status, 401, 'המכשיר השני נותק');
  assert.equal((await a.get('/api/me')).status, 200);
  assert.equal((await app.client().post('/api/auth/educator/login', { school: slug, name, code: '2222' })).status, 200);
});

test('איפוס קוד על ידי המנהלת: בוחרים קוד חדש עם קוד ההצטרפות, והמבטים נשמרים', async () => {
  const m = app.client();
  assert.equal((await m.post('/api/auth/manager/login', { email: 'manager@example.org', password: 'demo-password-1234' })).status, 200);
  const [slug, name] = EDUCATORS[7];
  const id = await idOf(name);
  const reportsBefore = (await db.get('SELECT COUNT(*)::int AS n FROM reports WHERE educator_id = ?', [id])).n;
  const edu = app.client();
  await educatorLogin(edu, 7);
  assert.equal((await m.post(`/api/admin/educators/${id}/reset-code`)).status, 200);
  assert.equal((await edu.get('/api/me')).status, 401, 'הסשן הקיים נסגר');
  assert.equal((await app.client().post('/api/auth/educator/login', { school: slug, name, code: String(1000 + 7 * 37) })).status, 401);
  const again = app.client();
  const reg = await again.post('/api/auth/educator/register', { school: slug, name, code: '7777', joinCode: (await app.joinCodes())[slug].educator });
  assert.equal(reg.status, 200);
  assert.equal(reg.json.user.id, id, 'אותו חשבון');
  assert.equal((await again.get('/api/me')).json.reports.length, reportsBefore);
});

test('מובילה: הרשמה בקוד הצטרפות נפרד, כניסה חוזרת, וקוד שגוי', async () => {
  const codes = await app.joinCodes();
  const c = app.client();
  // שלומית (רבין) עוד בלי קוד: נרשמת עם קוד ההצטרפות של המובילה, לא של המחנכות
  const body = { school: 'rabin', name: 'שלומית גבאי', code: '8642' };
  assert.equal((await c.post('/api/auth/lead/register', { ...body, joinCode: codes.rabin.educator })).status, 403);
  const ok = await c.post('/api/auth/lead/register', { ...body, joinCode: codes.rabin.lead });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.user.role, 'lead');
  assert.equal((await c.get('/api/lead/overview')).status, 200);
  assert.equal((await leadLogin(app.client(), 'rabin', 'שלומית גבאי', '0000')).status, 401);
  assert.equal((await leadLogin(app.client(), 'rabin', 'שלומית גבאי', '8642')).status, 200);
  // אותו שם כמחנכת לא נותן גישת מובילה, ולהיפך
  assert.equal((await leadLogin(app.client(), 'naomi-shemer', 'נועה כהן', '1185')).status, 401);
});

test('מנהלת: איפוס סיסמה שנשכחה בעזרת קוד ההקמה, ורק איתו', async () => {
  await auth.resetThrottle();
  const c = app.client();
  const mgr = { email: 'manager@example.org', password: 'a-brand-new-password-1' };
  assert.equal((await c.post('/api/auth/manager/reset', { ...mgr, setupCode: 'wrong' })).status, 403);
  assert.equal((await c.post('/api/auth/manager/reset', { ...mgr, setupCode: 'test-setup-code-123', password: 'short' })).status, 400);
  assert.equal((await c.post('/api/auth/manager/reset', { ...mgr, email: 'nobody@example.org', setupCode: 'test-setup-code-123' })).status, 404);
  const old = app.client();
  assert.equal((await old.post('/api/auth/manager/login', { email: mgr.email, password: 'demo-password-1234' })).status, 200);
  const ok = await c.post('/api/auth/manager/reset', { ...mgr, setupCode: 'test-setup-code-123' });
  assert.equal(ok.status, 200);
  assert.equal((await c.get('/api/admin/leads')).status, 200, 'נכנסת מיד אחרי האיפוס');
  assert.equal((await old.get('/api/admin/leads')).status, 401, 'הסשן הישן נסגר');
  assert.equal((await app.client().post('/api/auth/manager/login', { email: mgr.email, password: 'demo-password-1234' })).status, 401);
  assert.equal((await app.client().post('/api/auth/manager/login', mgr)).status, 200);
  // ניחוש קוד ההקמה נחסם
  await auth.resetThrottle();
  for (let i = 0; i < 20; i++) await c.post('/api/auth/manager/reset', { ...mgr, setupCode: `guess-${i}` });
  assert.equal((await c.post('/api/auth/manager/reset', { ...mgr, setupCode: 'test-setup-code-123' })).status, 429);
  await auth.resetThrottle();
});

test('בקשות כתיבה חוצות-אתרים או לא-JSON נחסמות', async () => {
  const c = app.client();
  const [slug, name] = EDUCATORS[8];
  const body = { school: slug, name, code: String(1000 + 8 * 37) };
  assert.equal((await c.post('/api/auth/educator/login', body, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await c.post('/api/auth/educator/login', body, { Origin: 'http://evil.example' })).status, 403);
  const raw = await fetch(`${app.base}/api/auth/educator/login`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
  assert.equal(raw.status, 415);
  const huge = await fetch(`${app.base}/api/auth/educator/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, pad: 'x'.repeat(300 * 1024) }) }).catch(() => ({ status: 413 }));
  assert.equal(huge.status, 413);
});

test('כותרות אבטחה על כל תשובה', async () => {
  const r = await app.client().get('/api/public');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(r.headers.get('cache-control'), 'no-store');
});
