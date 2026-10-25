'use strict';
// נתוני דוגמה (שמות בדויים) להדגמה ולבדיקות. לא רץ בשום מסלול של production, רק מהפקודה seed-demo או מההדגמה.
const db = require('./db');
const auth = require('./auth');
const weeks = require('./weeks');

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function weighted(r, items) { const tot = items.reduce((s, [, w]) => s + w, 0); let x = r() * tot; for (const [v, w] of items) { x -= w; if (x <= 0) return v; } return items[items.length - 1][0]; }

const NOTE_POOL = [
  'הצלחתי לשאול פחות ולהקשיב יותר. הוא דיבר רוב הזמן.',
  'יצאתי עם שאלה: איך מחברים בין החוזקה שזיהינו ליעד אישי בכיתה?',
  'רעיון: להתחיל את השיחה בשאלה על משהו שגאים בו השבוע.',
  'השיחה נקטעה בצלצול. כדאי לקבוע מראש מקום שקט.',
  'התלמידה פתחה נושא שלא ציפיתי לו. אשמח להעלות אותו במפגש הליווי.',
  'שיחה קצרה אבל עם הרבה אמון. אפשר לבנות עליה סבב שני.',
  'קשה לי עם שיחות שנתקעות בשתיקה. מישהו עם טיפ?',
  'נרגשת מהיעד שהוא בחר לעצמו.',
  'בשיחת יום הורים הצלחתי לעבור מציונים לדרך. פחות שיפוט.',
  'קלפי השיח עזרו לפתוח את השיחה. כדאי לשתף עוד מחנכות.',
];
const EDUCATORS = [
  ['kiryat-motzkin', 'עדי מזרחי'], ['kiryat-motzkin', 'תמר פרידמן'], ['kiryat-motzkin', 'יעל ביטון'], ['kiryat-motzkin', 'רונן לוי'], ['kiryat-motzkin', 'אורלי גבאי'],
  ['naomi-shemer', 'נועה כהן'], ['naomi-shemer', 'מיכל דהן'], ['naomi-shemer', 'אורית אברהם'], ['naomi-shemer', 'איתי שמעוני'], ['naomi-shemer', 'ליאת גולן'],
  ['rabin', 'הילה פרץ'], ['rabin', 'גלית חדד'], ['rabin', 'עומר כהן'], ['rabin', 'שרית אוחנה'], ['rabin', 'דנה סבג'],
];
const LEADS = [
  ['kiryat-motzkin', 'ורד אשכנזי', '2468'], ['naomi-shemer', 'נטע רוזן', '1357'], ['rabin', 'שלומית גבאי', null],
];
const DEMO_MANAGER = { name: 'מנהלת התכנית (דוגמה)', email: 'manager@example.org', password: 'demo-password-1234' };

async function seedDemo() {
  const start = await db.programStart(), cur = weeks.curWeek();
  const r = rng(20261014);
  const schoolId = {};
  for (const s of await db.all('SELECT id, slug FROM schools')) schoolId[s.slug] = s.id;
  const total = weeks.weeksBetween(start, cur).length;
  const now = db.nowIso();
  const managerHash = await auth.hashSecret(DEMO_MANAGER.password);
  const leadHashes = await Promise.all(LEADS.map(([, , pin]) => (pin ? auth.hashSecret(pin) : null)));
  const eduHashes = await Promise.all(EDUCATORS.map((_, i) => auth.hashSecret(String(1000 + i * 37))));

  await db.tx(async (t) => {
    if (!(await t.get("SELECT 1 AS x FROM users WHERE role = 'manager'"))) {
      await t.run('INSERT INTO users (role, school_id, name, name_key, email, secret_hash, active, created_at, joined_week) VALUES (?, NULL, ?, ?, ?, ?, 1, ?, ?)',
        ['manager', DEMO_MANAGER.name, db.nameKey(DEMO_MANAGER.name), DEMO_MANAGER.email, managerHash, now, start]);
    }
    for (const [i, [slug, name]] of LEADS.entries()) {
      await t.run('INSERT INTO users (role, school_id, name, name_key, secret_hash, active, created_at, joined_week) VALUES (?, ?, ?, ?, ?, 1, ?, ?)', ['lead', schoolId[slug], name, db.nameKey(name), leadHashes[i], now, start]);
    }
    for (const [i, [slug, name]] of EDUCATORS.entries()) {
      const joined = weeks.addDays(start, i < 10 ? 0 : 7 * Math.min(1, total - 1));
      const id = (await t.get('INSERT INTO users (role, school_id, name, name_key, secret_hash, active, created_at, joined_week) VALUES (?, ?, ?, ?, ?, 1, ?, ?) RETURNING id',
        ['educator', schoolId[slug], name, db.nameKey(name), eduHashes[i], now, joined])).id;
      const reliab = 0.55 + r() * 0.4;
      if (r() < 0.45) { // כחלק מהמחנכות כבר פתחו את מיפוי הכיתה (רק עצם השימוש נשמר)
        const first = weeks.addDays(joined, Math.floor(r() * 4));
        await t.run('INSERT INTO tool_usage (user_id, tool, first_day, last_day, days, started_day) VALUES (?, ?, ?, ?, ?, ?)', [id, 'mapping', first, weeks.addDays(first, 2 + Math.floor(r() * 5)), 1 + Math.floor(r() * 5), r() < 0.7 ? first : null]);
      }
      for (const [wi, w] of weeks.weeksBetween(joined, cur).entries()) {
        const isCur = w === cur;
        if (!(isCur ? r() < 0.45 : r() < reliab)) continue;
        const n = weighted(r, [[0, 0.07], [1, 0.14], [2, 0.22], [3, 0.26], [4, 0.17], [5, 0.1], [6, 0.04]]);
        const at = new Date(`${weeks.addDays(w, isCur ? 0 : 5)}T10:00:00Z`).toISOString();
        const rid = (await t.get('INSERT INTO reports (educator_id, week, none_reason, submitted_at, updated_at) VALUES (?, ?, ?, ?, ?) RETURNING id', [id, w, n === 0 ? 'holiday' : null, at, at])).id;
        for (let k = 0; k < n; k++) {
          const roundW = wi < 3 ? [[1, 0.85], [2, 0.12], [3, 0.03]] : wi < 6 ? [[1, 0.5], [2, 0.4], [3, 0.1]] : [[1, 0.3], [2, 0.45], [3, 0.25]];
          const axis = weighted(r, [['identity', 0.4], ['goals', 0.3], ['agency', 0.25], ['other', 0.05]]);
          const kind = weighted(r, [['intro', 0.15], ['notebook', 0.3], ['complex', 0.2], ['grades', 0.1], ['parents', 0.1], ['other', 0.15]]);
          await t.run('INSERT INTO conversations (report_id, seq, round, axis, axis_other, kind, kind_other, depth, talk_pct, feeling, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [rid, k + 1, weighted(r, roundW), axis === 'identity' && k % 3 === 0 ? 'identity,agency' : axis, axis === 'other' ? 'שיחה על איזון בין לימודים לפעילות אחר הצהריים' : null, kind, kind === 'other' ? 'שיחה בהפסקה' : null,
              weighted(r, [[1, 0.1], [2, 0.2], [3, 0.3], [4, 0.25], [5, 0.15]]), Math.max(0, Math.min(100, Math.round((weighted(r, [[1, 0.1], [2, 0.3], [3, 0.3], [4, 0.2], [5, 0.1]]) - 1) * 20 + 10 + (r() - 0.5) * 16))),
              weighted(r, [['inspired', 0.2], ['good', 0.35], ['neutral', 0.15], ['thoughtful', 0.15], ['frustrated', 0.1], ['heavy', 0.05]]), r() < 0.4 ? NOTE_POOL[Math.floor(r() * NOTE_POOL.length)] : null]);
        }
      }
    }
  });
  return { educators: EDUCATORS.length, leads: LEADS.length };
}

module.exports = { seedDemo, DEMO_MANAGER, EDUCATORS, LEADS };
