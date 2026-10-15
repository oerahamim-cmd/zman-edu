'use strict';
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const auth = require('./auth');

class HttpError extends Error {
  constructor(status, message, code, extra) {
    super(message);
    this.status = status;
    this.code = code || null;
    this.extra = extra || null;
  }
}

class CsvResponse {
  constructor(filename, text) { this.filename = filename; this.text = text; }
}

// ---------- טבלת הנתיבים. כל נתיב מצהיר מי רשאי לגשת אליו: 'public' | 'any' | [תפקידים] ----------
const routes = [];

function route(method, pattern, access, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:([a-z_]+)/gi, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, pattern, access, re, keys, handler });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

function isSecureRequest(req) {
  if (req.socket.encrypted) return true;
  return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

function clientIp(req) {
  // ב-Vercel ובפרוקסי שלנו הכותרות האלה מוצבות על ידי הפלטפורמה ולא על ידי הלקוח
  if (config.TRUST_PROXY) {
    const h = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'];
    if (h) return String(h).split(',')[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function securityHeaders(res, secure) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; '));
  if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  // ב-Vercel הגוף יכול להגיע כבר מפוענח (req.body). בשרת רגיל אין req.body וקוראים מהזרם.
  if (config.ON_VERCEL) {
    let b;
    try { b = req.body; } catch { return Promise.reject(new HttpError(400, 'JSON לא תקין.')); }
    if (b !== undefined) {
      const text = typeof b === 'string' ? b : Buffer.isBuffer(b) ? b.toString('utf8') : JSON.stringify(b);
      if (Buffer.byteLength(text) > config.MAX_BODY_BYTES) return Promise.reject(new HttpError(413, 'הבקשה גדולה מדי.'));
      return Promise.resolve(text);
    }
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > config.MAX_BODY_BYTES) { reject(new HttpError(413, 'הבקשה גדולה מדי.')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) { try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* מתעלמים מעוגייה פגומה */ } }
  }
  return out;
}

// הגנה מפני CSRF: SameSite=Strict על העוגייה + בדיקת Origin/Sec-Fetch-Site + דרישת JSON בבקשות כתיבה
function csrfCheck(req) {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'בקשה חוצת-אתרים נחסמה.');
  const origin = req.headers.origin;
  if (origin) {
    let host;
    try { host = new URL(origin).host; } catch { throw new HttpError(403, 'Origin לא תקין.'); }
    if (host !== req.headers.host) throw new HttpError(403, 'בקשה חוצת-אתרים נחסמה.');
  }
}

function cookieFlags(secure, maxAgeSeconds) {
  let f = 'Path=/; HttpOnly; SameSite=Strict';
  if (maxAgeSeconds !== undefined) f += `; Max-Age=${maxAgeSeconds}`;
  if (secure || config.PRODUCTION) f += '; Secure';
  return f;
}

async function handleApi(req, res, url, secure) {
  const method = req.method;
  let matched = null;
  const params = {};
  let pathMatched = false;
  for (const r of routes) {
    const m = r.re.exec(url.pathname);
    if (!m) continue;
    pathMatched = true;
    if (r.method !== method) continue;
    matched = r;
    try { r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); } catch { throw new HttpError(400, 'כתובת לא תקינה.'); }
    break;
  }
  if (!matched) throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'שיטה לא נתמכת.' : 'לא נמצא.');

  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies.sid || null;
  const user = await auth.getSessionUser(sessionToken);

  // ----- הרשאות: נבדקות בשרת לפני שמריצים כל לוגיקה -----
  if (matched.access !== 'public') {
    if (!user) throw new HttpError(401, 'יש להתחבר.', 'unauthenticated');
    if (Array.isArray(matched.access) && !matched.access.includes(user.role)) throw new HttpError(403, 'אין הרשאה לפעולה הזו.', 'forbidden');
  }

  let body = {};
  if (method !== 'GET' && method !== 'HEAD') {
    csrfCheck(req);
    const raw = await readBody(req);
    if (raw.length) {
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'נדרש Content-Type: application/json.');
      try { body = JSON.parse(raw); } catch { throw new HttpError(400, 'JSON לא תקין.'); }
      if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'גוף הבקשה לא תקין.');
    }
  }

  const outCookies = [];
  const ctx = {
    req, res, user, params, body, secure,
    query: Object.fromEntries(url.searchParams.entries()),
    ip: clientIp(req),
    sessionToken,
    setSessionCookie(token, remember) {
      outCookies.push(`sid=${token}; ${cookieFlags(secure, remember ? config.REMEMBER_DAYS * 86400 : undefined)}`);
    },
    clearSessionCookie() { outCookies.push(`sid=; ${cookieFlags(secure, 0)}`); },
    status: 200,
  };

  const result = await matched.handler(ctx);
  if (outCookies.length) res.setHeader('Set-Cookie', outCookies);

  if (result instanceof CsvResponse) {
    const text = '﻿' + result.text; // BOM כדי ש-Excel יפתח עברית נכון
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store',
      'Content-Length': Buffer.byteLength(text),
    });
    res.end(text);
    return;
  }
  sendJson(res, ctx.status, result === undefined ? { ok: true } : result);
}

function serveStatic(req, res, url) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end('Bad request'); return; }
  if (rel.includes('\0')) { res.writeHead(400); res.end('Bad request'); return; }
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(config.PUBLIC_DIR, rel));
  if (!file.startsWith(config.PUBLIC_DIR + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('לא נמצא'); return; }
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': ['.png', '.jpg', '.webp', '.pdf'].includes(ext) ? 'public, max-age=86400' : 'no-cache',
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).pipe(res);
  });
}

async function requestListener(req, res) {
  const secure = isSecureRequest(req);
  securityHeaders(res, secure);
  try {
    const url = new URL(req.url, 'http://localhost');

    // בדיקת תקינות של שרת האירוח עוברת גם ב-HTTP פנימי (לפני הפרוקסי), ולא מחזירה נתונים
    if (config.FORCE_HTTPS && !secure && url.pathname !== '/healthz' && url.pathname !== '/api/healthz') {
      if (req.method === 'GET' && !url.pathname.startsWith('/api/') && req.headers.host) {
        res.writeHead(308, { Location: `https://${req.headers.host}${req.url}` });
        res.end();
        return;
      }
      throw new HttpError(400, 'נדרש חיבור HTTPS.', 'https_required');
    }

    if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') { await handleApi(req, res, url, secure); return; }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'שיטה לא נתמכת.');
    serveStatic(req, res, url);
  } catch (err) {
    if (res.headersSent) { res.end(); return; }
    if (err instanceof HttpError) sendJson(res, err.status, { error: err.message, code: err.code, ...(err.extra || {}) });
    else if (err && err.code === 'NO_DATABASE') sendJson(res, 503, { error: 'בסיס הנתונים עוד לא מחובר לפרויקט. ב-Vercel: Storage ← Create Database ← Neon ← Connect to project, ואז לפרוס מחדש.', code: 'no_database' });
    else { console.error('Unhandled error:', err && err.message); sendJson(res, 500, { error: 'שגיאה פנימית. נסו שוב.' }); }
  }
}

module.exports = { HttpError, CsvResponse, route, routes, requestListener };
