'use strict';
// בסיס נתונים: Postgres. בענן (Vercel) מתחברים אליו דרך DATABASE_URL (למשל Neon).
// בהרצה מקומית ובבדיקות, בלי DATABASE_URL, רץ Postgres מובנה בתוך התהליך (PGlite): אותו SQL בדיוק.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');
const weeks = require('./weeks');
const { SCHOOLS } = require('./constants');

// SQL נכתב עם ? והמתאם הופך אותו ל-$1, $2…
const toPg = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };
const inList = (arr) => `(${arr.map(() => '?').join(',')})`;

let impl = null;
let initPromise = null;

async function connect() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = require('pg');
    const local = /(^|@)(localhost|127\.0\.0\.1)(:|\/)/.test(url);
    const pool = new Pool({ connectionString: url, max: Number(process.env.PG_POOL_MAX) || 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000, ...(local ? { ssl: false } : {}) });
    pool.on('error', () => { /* חיבור שנסגר ברקע: ייפתח חדש בשאילתה הבאה */ });
    return {
      kind: 'pg',
      query: (t, v) => pool.query(t, v),
      async transaction(fn) {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          const out = await fn({ query: (t, v) => c.query(t, v) });
          await c.query('COMMIT');
          return out;
        } catch (err) {
          try { await c.query('ROLLBACK'); } catch { /* החיבור כבר נסגר */ }
          throw err;
        } finally { c.release(); }
      },
      close: () => pool.end(),
    };
  }
  // בענן אין בסיס נתונים מקומי: אם DATABASE_URL לא הוגדר, מסבירים מה חסר
  if (config.ON_VERCEL && process.env.PG_MEMORY !== '1') {
    throw Object.assign(new Error('DATABASE_URL is not set'), { code: 'NO_DATABASE' });
  }
  // PGlite נטען בשם מחושב כדי שהוא לא ייארז לפונקציה בענן (הוא רק ל-devDependencies)
  const { PGlite } = require(['@electric-sql', 'pglite'].join('/'));
  let pg;
  if (process.env.PG_MEMORY === '1' || process.env.DB_FILE === ':memory:') pg = new PGlite();
  else { const dir = path.join(config.DATA_DIR, 'pgdata'); fs.mkdirSync(dir, { recursive: true }); pg = new PGlite(dir); }
  await pg.waitReady;
  return {
    kind: 'pglite',
    query: (t, v) => pg.query(t, v).then((r) => ({ rows: r.rows, rowCount: r.affectedRows ?? r.rows.length })),
    transaction: (fn) => pg.transaction((tx) => fn({ query: (t, v) => tx.query(t, v).then((r) => ({ rows: r.rows, rowCount: r.affectedRows ?? r.rows.length })) })),
    close: () => pg.close(),
  };
}

const wrap = (r) => ({
  all: async (sql, p = []) => (await r.query(toPg(sql), p)).rows,
  get: async (sql, p = []) => (await r.query(toPg(sql), p)).rows[0],
  run: async (sql, p = []) => { const x = await r.query(toPg(sql), p); return { rowCount: x.rowCount, rows: x.rows }; },
});

// קוד הצטרפות: 6 תווים בלי תווים מבלבלים (0/O, 1/I). מוצג כ-XXX-XXX, וההשוואה לא רגישה לרישיות ולמקפים.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newJoinCode() {
  const bytes = crypto.randomBytes(6);
  let s = '';
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}
const normalizeCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// מפתח השוואה לשם: בלי ניקוד, גרש וגרשיים, רווחים כפולים והבדלי רישיות
function nameKey(name) {
  return String(name || '').normalize('NFC')
    .replace(/[֑-ׇ]/g, '')
    .replace(/[׳'’`"״]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
const cleanName = (name) => String(name || '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ID = 'INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY';
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS schools (
    id ${ID}, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL UNIQUE, sort_order INTEGER NOT NULL DEFAULT 0,
    educator_code TEXT, lead_code TEXT)`,
  `CREATE TABLE IF NOT EXISTS users (
    id ${ID},
    role TEXT NOT NULL CHECK (role IN ('educator','lead','manager')),
    school_id INTEGER REFERENCES schools(id),
    name TEXT NOT NULL, name_key TEXT NOT NULL, email TEXT, secret_hash TEXT,
    active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, joined_week TEXT NOT NULL, last_login_at TEXT,
    CHECK ((role = 'manager' AND school_id IS NULL AND email IS NOT NULL) OR (role IN ('educator','lead') AND school_id IS NOT NULL)))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_person ON users(school_id, role, name_key) WHERE role IN ('educator','lead')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE role = 'manager'`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remember INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, expires_at TEXT NOT NULL)`,
  // המבט השבועי: אין כאן תלמידים. רק מספר שיחות, ועל כל שיחה: סבב, סוג, אופי, תחושה והערה חופשית.
  `CREATE TABLE IF NOT EXISTS reports (
    id ${ID}, educator_id INTEGER NOT NULL REFERENCES users(id), week TEXT NOT NULL, none_reason TEXT,
    submitted_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (educator_id, week))`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id ${ID}, report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE, seq INTEGER NOT NULL,
    round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 3), axis TEXT NOT NULL, axis_other TEXT,
    kind TEXT NOT NULL, kind_other TEXT, feeling TEXT NOT NULL, note TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_conv_report ON conversations(report_id)`,
  `CREATE TABLE IF NOT EXISTS tools (
    id ${ID}, folder TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'כלי', url TEXT NOT NULL DEFAULT '', example INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  // הגבלת ניסיונות כניסה. בענן כל בקשה יכולה לרוץ בתהליך אחר, ולכן הספירה נשמרת בבסיס הנתונים.
  `CREATE TABLE IF NOT EXISTS throttle (key TEXT PRIMARY KEY, count INTEGER NOT NULL, first_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id ${ID}, user_id INTEGER REFERENCES users(id), role TEXT, action TEXT NOT NULL, target TEXT, timestamp TEXT NOT NULL)`,
  // יומן הגישה הוא append-only: אי אפשר לעדכן או למחוק שורות (גם לא דרך קוד האפליקציה)
  `CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'audit_log is append-only'; END; $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS audit_log_no_change ON audit_log`,
  `CREATE TRIGGER audit_log_no_change BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_append_only()`,
  `DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log`,
  `CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only()`,
];

const nowIso = () => new Date().toISOString();

async function init() {
  impl = await connect();
  await impl.transaction(async (t) => {
    const { all, get, run } = wrap(t);
    // נעילה: אם כמה מופעים עולים יחד בפעם הראשונה, רק אחד יוצר את הטבלאות
    await t.query('SELECT pg_advisory_xact_lock(424242)');
    const has = await get(`SELECT to_regclass('public.schools') AS t`);
    if (!has.t) for (const stmt of SCHEMA) await t.query(stmt);

    for (const s of SCHOOLS) await run('INSERT INTO schools (slug, name, sort_order) VALUES (?, ?, ?) ON CONFLICT (slug) DO NOTHING', [s.slug, s.name, s.order]);
    // קודי הצטרפות: נוצרים פעם אחת, ומנהלת התכנית יכולה להחליף אותם בכל רגע
    const rows = await all('SELECT id, educator_code, lead_code FROM schools');
    const taken = new Set(rows.flatMap((r) => [normalizeCode(r.educator_code), normalizeCode(r.lead_code)]).filter(Boolean));
    const fresh = () => { let c; do { c = newJoinCode(); } while (taken.has(normalizeCode(c))); taken.add(normalizeCode(c)); return c; };
    for (const r of rows) {
      if (!r.educator_code) await run('UPDATE schools SET educator_code = ? WHERE id = ?', [fresh(), r.id]);
      if (!r.lead_code) await run('UPDATE schools SET lead_code = ? WHERE id = ?', [fresh(), r.id]);
    }

    await run(`INSERT INTO settings (key, value) VALUES ('lead_sees_names', '0') ON CONFLICT (key) DO NOTHING`);
    // השבוע הראשון של המבט השבועי: משתנה סביבה, ואם אין: השבוע שבו האפליקציה הופעלה לראשונה
    const envStart = config.PROGRAM_START && weeks.isWeekStart(config.PROGRAM_START) ? config.PROGRAM_START : null;
    await run(`INSERT INTO settings (key, value) VALUES ('program_start', ?) ON CONFLICT (key) DO NOTHING`, [envStart || weeks.weekStart(weeks.today())]);
    if (envStart) await run(`UPDATE settings SET value = ? WHERE key = 'program_start'`, [envStart]);

    // שלוש תיקיות הציר, בכל אחת כרטיס דוגמה אחד שמסומן כדוגמה (מנהלת התכנית מוסיפה ומסירה כלים)
    if ((await get('SELECT COUNT(*)::int AS n FROM tools')).n === 0) {
      for (const folder of ['identity', 'goals', 'agency']) {
        await run('INSERT INTO tools (folder, title, description, type, url, example, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
          [folder, 'שם הכלי יופיע כאן', 'תיאור קצר של הכלי או הפרקטיקה: מה עושים, כמה זמן זה לוקח ובאיזה מצב משתמשים בו.', 'כלי', '', nowIso()]);
      }
    }
  });
}

function ready() {
  if (!initPromise) initPromise = init().catch((err) => { initPromise = null; impl = null; throw err; });
  return initPromise;
}

const all = async (sql, p) => { await ready(); return wrap(impl).all(sql, p); };
const get = async (sql, p) => { await ready(); return wrap(impl).get(sql, p); };
const run = async (sql, p) => { await ready(); return wrap(impl).run(sql, p); };
const tx = async (fn) => { await ready(); return impl.transaction((t) => fn(wrap(t))); };

async function close() {
  const i = impl;
  impl = null; initPromise = null; programStartCache = null;
  if (i) await i.close();
}

async function getSetting(key) { const r = await get('SELECT value FROM settings WHERE key = ?', [key]); return r ? r.value : null; }
async function setSetting(key, value) { await run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', [key, String(value)]); if (key === 'program_start') programStartCache = null; }
let programStartCache = null;
async function programStart() { if (!programStartCache) programStartCache = await getSetting('program_start'); return programStartCache; }
const leadSeesNames = async () => (await getSetting('lead_sees_names')) === '1';

async function audit(user, action, target) {
  await run('INSERT INTO audit_log (user_id, role, action, target, timestamp) VALUES (?, ?, ?, ?, ?)',
    [user ? user.id : null, user ? user.role : null, action, target === undefined ? null : String(target), nowIso()]);
}

module.exports = { all, get, run, tx, ready, close, inList, nowIso, audit, getSetting, setSetting, programStart, leadSeesNames, newJoinCode, normalizeCode, nameKey, cleanName };
