'use strict';
// תזכורת שבועית למבט: התראה בטלפון (Web Push) ו/או מייל, ביום ובשעה שהמחנכת בחרה.
// נשלחת רק אם המבט לשבוע הזה עוד לא נשלח, ולא בשבוע שהמחנכת סימנה לדלג עליו.
// השליחה רצה פעם בשעה מבחוץ (Vercel Cron או מתזמן חיצוני) דרך נתיב מוגן בסוד. בלי מפתחות בסביבה, הערוץ כבוי.
const config = require('./config');
const db = require('./db');
const weeks = require('./weeks');

const env = (k) => process.env[k] || '';
const pushReady = () => !!(env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY'));
const mailReady = () => !!(env('SMTP_URL') && env('MAIL_FROM'));
const appUrl = () => (env('APP_URL') || 'https://zman-edu.vercel.app').replace(/\/+$/, '');

let webpush = null, mailer = null, sink = null;
function push() {
  if (!webpush) {
    webpush = require('web-push');
    webpush.setVapidDetails(env('VAPID_SUBJECT') || 'mailto:noreply@example.org', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
  }
  return webpush;
}
function mail() {
  if (!mailer) mailer = require('nodemailer').createTransport(env('SMTP_URL'));
  return mailer;
}
// בדיקות בלבד: במקום לשלוח, כל הודעה עוברת לפונקציה הזו
function setSink(fn) { sink = fn; }

// השעה ביום (0 עד 23) לפי שעון ישראל
function hourInIsrael(date) {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone: config.TIMEZONE, hour: '2-digit', hourCycle: 'h23' }).format(date);
  return Number(h);
}

const message = (week) => ({
  title: 'המבט השבועי',
  body: 'שתי דקות על השיחות של השבוע?',
  url: `/#/me/report/${week}`,
});

async function sendPush(userId, payload) {
  const subs = await db.all('SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?', [userId]);
  let n = 0;
  for (const s of subs) {
    if (sink) { sink({ channel: 'push', userId, endpoint: s.endpoint, payload }); n++; continue; }
    try {
      await push().sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 6 * 3600 });
      n++;
    } catch (err) {
      // המנוי פג או בוטל בטלפון: מוחקים אותו, ושולחים שוב רק כשהמחנכת תפעיל מחדש
      if (err && (err.statusCode === 404 || err.statusCode === 410)) await db.run('DELETE FROM push_subscriptions WHERE id = ?', [s.id]);
    }
  }
  return n;
}
async function sendMail(to, payload) {
  const link = appUrl() + payload.url;
  const msg = {
    from: env('MAIL_FROM'), to, subject: 'המבט השבועי · שתי דקות',
    text: `שלום,\n\n${payload.body}\n${link}\n\nזמן לחינוך · אפשר לשנות או לכבות את התזכורת באפליקציה.`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6">שלום,<br><br>${payload.body}<br><a href="${link}" style="display:inline-block;margin:12px 0;padding:12px 20px;background:#0046ff;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold">למבט השבועי</a><br><span style="color:#55585f;font-size:13px">זמן לחינוך · אפשר לשנות או לכבות את התזכורת באפליקציה.</span></div>`,
  };
  if (sink) { sink({ channel: 'mail', to, payload }); return 1; }
  await mail().sendMail(msg);
  return 1;
}

// שליחה לאחת (כפתור "שליחת תזכורת לניסיון"): לשני הערוצים שהמחנכת הפעילה, אם הם זמינים
async function sendTo(userId, week) {
  const r = await db.get('SELECT push, mail, email FROM reminders WHERE user_id = ?', [userId]);
  if (!r) return { push: 0, mail: 0 };
  const payload = message(week);
  const out = { push: 0, mail: 0, failed: [] };
  // ערוץ אחד שנכשל (למשל שרת מייל שלא עונה) לא עוצר את השני
  if (r.push && (pushReady() || sink)) { try { out.push = await sendPush(userId, payload); } catch (err) { out.failed.push('push'); console.error('reminder push failed:', err.message); } }
  if (r.mail && r.email && (mailReady() || sink)) { try { out.mail = await sendMail(r.email, payload); } catch (err) { out.failed.push('mail'); console.error('reminder mail failed:', err.message); } }
  return out;
}

// ריצה שעתית: מי שבחרה את היום והשעה האלה, ועוד לא שלחה מבט לשבוע הזה
async function run(now = new Date()) {
  const today = config.FAKE_TODAY || weeks.dateInIsrael(now);
  const day = weeks.fromYmd(today).getUTCDay(), hour = hourInIsrael(now), wk = weeks.weekStart(today);
  const rows = await db.all(`SELECT r.user_id FROM reminders r JOIN users u ON u.id = r.user_id
    WHERE u.active = 1 AND u.role = 'educator' AND r.day = ? AND r.hour = ? AND (r.push = 1 OR r.mail = 1)
      AND (r.skip_week IS NULL OR r.skip_week <> ?) AND (r.last_sent IS NULL OR r.last_sent <> ?)`, [day, hour, wk, today]);
  const result = { due: rows.length, sent: 0, alreadyDone: 0, failed: 0 };
  for (const { user_id: id } of rows) {
    if (await db.get('SELECT 1 AS x FROM reports WHERE educator_id = ? AND week = ?', [id, wk])) { result.alreadyDone++; continue; }
    try {
      const out = await sendTo(id, wk);
      if (out.push || out.mail) result.sent++;
      if (out.failed.length) result.failed++;
      await db.run('UPDATE reminders SET last_sent = ? WHERE user_id = ?', [today, id]);
    } catch { result.failed++; }
  }
  return result;
}

module.exports = { pushReady, mailReady, run, sendTo, setSink, hourInIsrael };
