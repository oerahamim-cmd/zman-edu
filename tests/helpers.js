'use strict';
// בדיקות רצות על שרת אמיתי בתהליך, עם Postgres מובנה (PGlite) בזיכרון ו"היום" קבוע (רביעי 14.10.2026, השבוע מתחיל ב-11.10).
process.env.PG_MEMORY = '1';
delete process.env.DATABASE_URL;
process.env.FAKE_TODAY = '2026-10-14';
process.env.PROGRAM_START = '2026-09-06';
process.env.SETUP_CODE = 'test-setup-code-123';
process.env.NODE_ENV = 'test';
delete process.env.VERCEL;

const { start } = require('../server/app');
const db = require('../server/db');
const auth = require('../server/auth');
const { seedDemo, EDUCATORS } = require('../server/seed');

class Client {
  constructor(base) { this.base = base; this.cookie = ''; }
  async req(method, path, body, headers = {}) {
    const res = await fetch(this.base + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    for (const sc of res.headers.getSetCookie?.() || []) {
      const [pair] = sc.split(';');
      const [k, v] = pair.split('=');
      if (k === 'sid') this.cookie = v ? `sid=${v}` : '';
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    const text = bytes.toString('utf8'); // לא מסיר BOM (בניגוד ל-res.text())
    let json = null;
    try { json = JSON.parse(text); } catch { /* לא JSON (CSV וכד') */ }
    return { status: res.status, json, text, bytes, headers: res.headers };
  }
  get(p, h) { return this.req('GET', p, undefined, h); }
  post(p, b = {}, h) { return this.req('POST', p, b, h); }
  put(p, b = {}, h) { return this.req('PUT', p, b, h); }
  del(p, h) { return this.req('DELETE', p, undefined, h); }
}

async function setup({ seed = true } = {}) {
  await db.ready();
  await auth.resetThrottle();
  const srv = await start(0, '127.0.0.1');
  if (seed) await seedDemo();
  const base = `http://127.0.0.1:${srv.port}`;
  const joinCodes = async () => Object.fromEntries((await db.all('SELECT slug, educator_code, lead_code FROM schools')).map((s) => [s.slug, { educator: s.educator_code, lead: s.lead_code }]));
  return { srv, base, client: () => new Client(base), joinCodes, close: () => srv.close() };
}

const educatorLogin = (c, i) => c.post('/api/auth/educator/login', { school: EDUCATORS[i][0], name: EDUCATORS[i][1], code: String(1000 + i * 37) });
const leadLogin = (c, school, name, code) => c.post('/api/auth/lead/login', { school, name, code });
const managerLogin = (c) => c.post('/api/auth/manager/login', { email: 'manager@example.org', password: 'demo-password-1234' });

module.exports = { setup, Client, educatorLogin, leadLogin, managerLogin, EDUCATORS, db };
