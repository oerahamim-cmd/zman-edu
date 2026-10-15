'use strict';
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const config = require('./config');
const db = require('./db');

const scrypt = promisify(crypto.scrypt);

// ---------- קודים וסיסמאות (scrypt עם מלח אקראי לכל משתמש) ----------
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

async function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(secret, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

async function verifySecret(secret, stored) {
  if (!stored || typeof secret !== 'string') return false;
  const [scheme, N, r, p, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(secret, Buffer.from(saltB64, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return crypto.timingSafeEqual(actual, expected);
}

// אימות מדומה, כדי שהזמן לא יחשוף אם השם קיים
let dummyHash = null;
async function burn() {
  if (!dummyHash) dummyHash = await hashSecret('dummy-secret-for-timing');
  await verifySecret('x', dummyHash);
}

const CODE_RE = /^\d{4}$/;
const checkPersonalCode = (code) => (typeof code === 'string' && CODE_RE.test(code) ? null : 'הקוד האישי הוא ארבע ספרות.');

function checkPasswordPolicy(password) {
  if (typeof password !== 'string' || password.length < config.MIN_MANAGER_PASSWORD) return `הסיסמה חייבת להכיל לפחות ${config.MIN_MANAGER_PASSWORD} תווים.`;
  if (password.length > 200) return 'הסיסמה ארוכה מדי.';
  if (/^(.)\1+$/.test(password)) return 'הסיסמה קלה מדי לניחוש.';
  return null;
}

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

// ---------- אסימונים וסשנים ----------
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');

function sessionTimes(remember) {
  return {
    idleMs: (remember ? config.REMEMBER_DAYS * 24 : config.SESSION_IDLE_HOURS) * 3600e3,
    maxMs: (remember ? config.REMEMBER_DAYS : config.SESSION_MAX_DAYS) * 86400e3,
  };
}

async function createSession(userId, remember = false) {
  const token = newToken();
  const now = new Date();
  const { idleMs } = sessionTimes(remember);
  await db.run('INSERT INTO sessions (token_hash, user_id, remember, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [sha256(token), userId, remember ? 1 : 0, now.toISOString(), now.toISOString(), new Date(now.getTime() + idleMs).toISOString()]);
  await db.run('UPDATE users SET last_login_at = ? WHERE id = ?', [now.toISOString(), userId]);
  await db.run('DELETE FROM sessions WHERE expires_at < ?', [now.toISOString()]); // ניקוי סשנים שפג תוקפם
  return token;
}

async function getSessionUser(token) {
  if (!token) return null;
  const hash = sha256(token);
  const row = await db.get(
    `SELECT s.created_at AS s_created, s.last_seen_at, s.expires_at, s.remember,
            u.id, u.role, u.name, u.email, u.school_id, u.active, u.joined_week,
            sc.name AS school_name, sc.slug AS school_slug
       FROM sessions s
       JOIN users u ON u.id = s.user_id
  LEFT JOIN schools sc ON sc.id = u.school_id
      WHERE s.token_hash = ?`, [hash]);
  if (!row) return null;
  const now = Date.now();
  const { idleMs, maxMs } = sessionTimes(!!row.remember);
  const absoluteLimit = new Date(row.s_created).getTime() + maxMs;
  if (!row.active || now > new Date(row.expires_at).getTime() || now > absoluteLimit) {
    await db.run('DELETE FROM sessions WHERE token_hash = ?', [hash]);
    return null;
  }
  if (now - new Date(row.last_seen_at).getTime() > 5 * 60e3) {
    await db.run('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?',
      [new Date(now).toISOString(), new Date(Math.min(now + idleMs, absoluteLimit)).toISOString(), hash]);
  }
  return {
    id: row.id, role: row.role, name: row.name, email: row.email, school_id: row.school_id,
    school_slug: row.school_slug, school_name: row.school_name, joined_week: row.joined_week, remember: !!row.remember,
  };
}

const destroySession = async (token) => { if (token) await db.run('DELETE FROM sessions WHERE token_hash = ?', [sha256(token)]); };
const destroyUserSessions = async (userId, exceptToken) => db.run('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?', [userId, exceptToken ? sha256(exceptToken) : '']);

// ---------- הגבלת ניסיונות ----------
// הספירה נשמרת בבסיס הנתונים, כי בענן כל בקשה יכולה לרוץ בתהליך אחר.
// בית ספר שלם יושב על אותה כתובת IP (מפגש מחנכות, כולן נכנסות יחד), ולכן המגבלה לפי IP גבוהה מהמגבלה לפי חשבון.
// קוד אישי הוא ארבע ספרות, ולכן ניחוש של חשבון בודד נחסם אחרי 8 ניסיונות ל-15 דקות.
const WINDOW_MS = 15 * 60e3;
const LIMITS = { acct: 8, ip: 60, code: 20 };
const limitFor = (key) => (key.startsWith('ip:') ? LIMITS.ip : key.startsWith('code:') || key.startsWith('setup:') ? LIMITS.code : LIMITS.acct);
const minutesLeft = (firstAt) => Math.max(1, Math.ceil((Date.parse(firstAt) + WINDOW_MS - Date.now()) / 60e3));

// מגדיל את המונה בפעולה אטומה אחת (גם אם כמה בקשות מגיעות במקביל)
async function bump(key) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS).toISOString();
  const r = await db.get(
    `INSERT INTO throttle (key, count, first_at) VALUES (?, 1, ?)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN throttle.first_at <= ? THEN 1 ELSE throttle.count + 1 END,
       first_at = CASE WHEN throttle.first_at <= ? THEN excluded.first_at ELSE throttle.first_at END
     RETURNING count, first_at`, [key, now.toISOString(), windowStart, windowStart]);
  if (Math.random() < 0.02) await db.run('DELETE FROM throttle WHERE first_at < ?', [new Date(now.getTime() - 86400e3).toISOString()]);
  return r;
}

// שומר מקום לניסיון לפני שבודקים את הקוד: כך גם ניסיונות מקבילים נספרים. מחזיר כמה דקות החסימה נמשכת (0 = מותר).
async function hit(key) {
  const r = await bump(key);
  return r.count > limitFor(key) ? minutesLeft(r.first_at) : 0;
}
// בדיקה בלי להגדיל (מפתחות שנספרים רק בכישלון)
async function blockedMinutes(key) {
  const r = await db.get('SELECT count, first_at FROM throttle WHERE key = ?', [key]);
  if (!r || Date.parse(r.first_at) + WINDOW_MS <= Date.now()) return 0;
  return r.count >= limitFor(key) ? minutesLeft(r.first_at) : 0;
}
const failed = async (key) => { await bump(key); };
const clear = async (key) => { await db.run('DELETE FROM throttle WHERE key = ?', [key]); };
const resetThrottle = async () => { await db.run('DELETE FROM throttle'); };

module.exports = {
  hashSecret, verifySecret, burn, checkPersonalCode, checkPasswordPolicy, safeEqual,
  createSession, getSessionUser, destroySession, destroyUserSessions,
  hit, blockedMinutes, failed, clear, resetThrottle,
};
