'use strict';
// מצב production אמיתי בתהליך נפרד: חובה HTTPS (דרך הפרוקסי), עוגיות Secure, וכותרת HSTS.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 3600 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${PORT}`;
let child;

before(async () => {
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(PORT), HOST: '127.0.0.1', PG_MEMORY: '1', TRUST_PROXY: '1', SETUP_CODE: 'prod-setup-code' };
  delete env.DATABASE_URL; delete env.VERCEL;
  child = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], { env, stdio: 'ignore' });
  for (let i = 0; i < 150; i++) {
    try { if ((await fetch(`${base}/healthz`)).ok) return; } catch { /* עדיין עולה */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('השרת לא עלה');
});
after(() => { child.kill(); });

const proxied = { 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '203.0.113.7' };
const json = { 'Content-Type': 'application/json' };

test('בדיקת תקינות עוברת גם ב-HTTP פנימי, ושום נתון אחר לא', async () => {
  assert.equal((await fetch(`${base}/healthz`)).status, 200);
  const api = await fetch(`${base}/api/public`);
  assert.equal(api.status, 400);
  assert.equal((await api.json()).code, 'https_required');
  const page = await fetch(`${base}/`, { redirect: 'manual' });
  assert.equal(page.status, 308);
  assert.equal(page.headers.get('location'), `https://127.0.0.1:${PORT}/`, 'מפנה ל-HTTPS באותה כתובת');
});

test('מאחורי פרוקסי HTTPS: האתר עובד, עם HSTS', async () => {
  const r = await fetch(`${base}/api/public`, { headers: proxied });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('strict-transport-security'), /max-age=31536000/);
  assert.equal((await r.json()).setupNeeded, true, 'עוד אין מנהלת, ויש קוד הקמה');
  const html = await fetch(`${base}/`, { headers: proxied });
  assert.equal(html.status, 200);
  assert.match(await html.text(), /\/js\/app\.js/);
});

test('הקמה ראשונית וכניסה: עוגיית הסשן Secure + HttpOnly + SameSite=Strict', async () => {
  const post = (p, body) => fetch(`${base}${p}`, { method: 'POST', headers: { ...proxied, ...json }, body: JSON.stringify(body) });
  const mgr = { name: 'מנהלת', email: 'm@example.org', password: 'long-enough-password' };
  assert.equal((await post('/api/auth/manager/setup', { ...mgr, setupCode: 'wrong' })).status, 403);
  const ok = await post('/api/auth/manager/setup', { ...mgr, setupCode: 'prod-setup-code' });
  assert.equal(ok.status, 200);
  const cookie = ok.headers.getSetCookie().join(';');
  assert.match(cookie, /Secure/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal((await (await fetch(`${base}/api/public`, { headers: proxied })).json()).setupNeeded, false, 'מסך ההקמה נעלם אחרי שנוצרה מנהלת');
  assert.equal((await post('/api/auth/manager/setup', { ...mgr, name: 'עוד אחת', email: 'x@example.org', setupCode: 'prod-setup-code' })).status, 404, 'אי אפשר ליצור מנהלת נוספת דרך המסך');
  assert.equal((await post('/api/auth/manager/login', { email: 'm@example.org', password: 'short' })).status, 401);
  assert.equal((await post('/api/auth/manager/login', { email: 'm@example.org', password: 'long-enough-password' })).status, 200);
});
