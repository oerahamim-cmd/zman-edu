'use strict';
// שבוע = ראשון עד שבת, לפי שעון ישראל. תאריכים נשמרים כמחרוזת YYYY-MM-DD של יום הראשון.
const config = require('./config');

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fromYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(fromYmd(s)) === s;

function addDays(s, n) {
  const d = fromYmd(s);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

// התאריך (YYYY-MM-DD) של רגע נתון בשעון ישראל
function dateInIsrael(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: config.TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const today = () => config.FAKE_TODAY || dateInIsrael();
const weekStart = (s) => addDays(s, -fromYmd(s).getUTCDay());
const curWeek = () => weekStart(today());
const isWeekStart = (s) => isYmd(s) && fromYmd(s).getUTCDay() === 0;

function weeksBetween(from, to) {
  const out = [];
  for (let w = from; w <= to; w = addDays(w, 7)) out.push(w);
  return out;
}

module.exports = { ymd, fromYmd, isYmd, addDays, dateInIsrael, today, weekStart, curWeek, isWeekStart, weeksBetween };
