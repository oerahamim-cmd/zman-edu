'use strict';
const db = require('./db');
const weeks = require('./weeks');
const config = require('./config');
const { ROUNDS, AXES, KINDS, SCALE, FEELINGS, NONE_REASONS } = require('./constants');
const { HttpError } = require('./http');

const clip = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// שבוע שמותר לשלוח עליו מבט: ראשון, לא לפני תחילת התכנית ולא לפני שבוע ההצטרפות, ולא בעתיד
function checkWeekAllowed(user, week, programStart) {
  if (!weeks.isWeekStart(week)) throw new HttpError(400, 'השבוע לא תקין.');
  const first = user.joined_week > programStart ? user.joined_week : programStart;
  if (week < first || week > weeks.curWeek()) throw new HttpError(400, 'השבוע הזה לא פתוח למבט.');
}

// בחירה מרובה: מערך של ערכים מותרים (בלי כפילויות, בסדר הרשימה), או ערך בודד ישן. null אם ריק או שיש ערך לא מוכר
function pickMany(list, single, allowed) {
  const raw = Array.isArray(list) ? list : single !== undefined && single !== null ? [single] : [];
  if (!raw.length || !raw.every((v) => allowed.includes(v))) return null;
  return allowed.filter((v) => raw.includes(v));
}

// בדיקת תקינות של מבט: כל שיחה חייבת תשובות מלאות. אין שדה לתלמיד: רק הערכים המותרים וטקסט קצר.
function validateReport(body) {
  if (!Array.isArray(body.convs)) throw new HttpError(400, 'חסרות השיחות.');
  if (body.convs.length > config.MAX_CONVS_PER_WEEK) throw new HttpError(400, `אפשר לדווח על עד ${config.MAX_CONVS_PER_WEEK} שיחות בשבוע.`);
  const convs = body.convs.map((c, i) => {
    if (!c || typeof c !== 'object') throw new HttpError(400, `שיחה ${i + 1} לא תקינה.`);
    // הסבב כבר לא נשאל במבט השבועי. מבט ישן שנערך מחדש עדיין יכול לשלוח אותו, ואז הוא חייב להיות בטווח
    if (c.round !== undefined && c.round !== null && !ROUNDS.includes(c.round)) throw new HttpError(400, `בשיחה ${i + 1} ערך לא תקין בסבב.`);
    // אפשר לסמן כמה צירים וכמה סוגי שיחה. ערך בודד (axis / kind) מהמבטים הישנים מתקבל גם הוא
    const axes = pickMany(c.axes, c.axis, AXES), kinds = pickMany(c.kinds, c.kind, KINDS);
    if (!axes) throw new HttpError(400, `בשיחה ${i + 1} חסר ציר שיחה.`);
    if (!kinds) throw new HttpError(400, `בשיחה ${i + 1} חסר סוג שיחה.`);
    if (!FEELINGS.includes(c.feeling)) throw new HttpError(400, `בשיחה ${i + 1} חסר איך יצאו מהשיחה.`);
    // שתי שאלות הציר אופציונליות בשרת (מבטים ישנים נשמרו בלעדיהן), אבל אם נשלחו הן חייבות להיות בטווח:
    // עומק השיחה הוא שלב 1 עד 5, וחלוקת הדיבור היא אחוז שלם (0 עד 100) של דיבור התלמיד/ה
    if (c.depth !== undefined && c.depth !== null && !SCALE.includes(c.depth)) throw new HttpError(400, `בשיחה ${i + 1} ערך לא תקין בשאלת עומק השיחה.`);
    if (c.talkPct !== undefined && c.talkPct !== null && !(Number.isInteger(c.talkPct) && c.talkPct >= 0 && c.talkPct <= 100)) throw new HttpError(400, `בשיחה ${i + 1} ערך לא תקין בשאלת חלוקת הדיבור.`);
    const axisOther = axes.includes('other') ? clip(c.axisOther, 120) : '';
    const kindOther = kinds.includes('other') ? clip(c.kindOther, 120) : '';
    if (axes.includes('other') && !axisOther) throw new HttpError(400, `בשיחה ${i + 1} צריך לכתוב על מה דיברתם.`);
    if (kinds.includes('other') && !kindOther) throw new HttpError(400, `בשיחה ${i + 1} צריך לכתוב איזו שיחה זו הייתה.`);
    return { round: c.round ?? null, axes, axisOther, kinds, kindOther, depth: c.depth ?? null, talkPct: c.talkPct ?? null, feeling: c.feeling, note: clip(c.note, 1000) };
  });
  let noneReason = '';
  if (!convs.length && body.noneReason) {
    if (!NONE_REASONS.includes(body.noneReason)) throw new HttpError(400, 'הסיבה לא תקינה.');
    noneReason = body.noneReason;
  }
  return { convs, noneReason };
}

async function upsertReport(educatorId, week, { convs, noneReason }) {
  return db.tx(async (t) => {
    const now = db.nowIso();
    const rep = await t.get(
      `INSERT INTO reports (educator_id, week, none_reason, submitted_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (educator_id, week) DO UPDATE SET none_reason = excluded.none_reason, updated_at = excluded.updated_at
       RETURNING id`, [educatorId, week, noneReason || null, now, now]);
    await t.run('DELETE FROM conversations WHERE report_id = ?', [rep.id]);
    let seq = 0;
    for (const c of convs) {
      await t.run('INSERT INTO conversations (report_id, seq, round, axis, axis_other, kind, kind_other, depth, talk_pct, feeling, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [rep.id, ++seq, c.round, c.axes.join(','), c.axisOther || null, c.kinds.join(','), c.kindOther || null, c.depth, c.talkPct, c.feeling, c.note || null]);
    }
    return rep.id;
  });
}

const serializeConv = (c) => ({ round: c.round, axes: c.axis.split(','), axisOther: c.axis_other || '', kinds: c.kind.split(','), kindOther: c.kind_other || '', depth: c.depth ?? null, talkPct: c.talk_pct ?? null, feeling: c.feeling, note: c.note || '' });

// כל המבטים של קבוצת מחנכות (מזהים), עם השיחות. החזרה: Map(educatorId -> [report])
async function loadReports(educatorIds) {
  const out = new Map();
  if (!educatorIds.length) return out;
  const reps = await db.all(`SELECT id, educator_id, week, none_reason, submitted_at FROM reports WHERE educator_id IN ${db.inList(educatorIds)} ORDER BY week`, educatorIds);
  const byId = new Map();
  for (const r of reps) {
    const rec = { id: r.id, educator_id: r.educator_id, week: r.week, noneReason: r.none_reason || '', at: weeks.dateInIsrael(new Date(r.submitted_at)), convs: [] };
    byId.set(r.id, rec);
    if (!out.has(r.educator_id)) out.set(r.educator_id, []);
    out.get(r.educator_id).push(rec);
  }
  if (reps.length) {
    const ids = reps.map((r) => r.id);
    for (const c of await db.all(`SELECT * FROM conversations WHERE report_id IN ${db.inList(ids)} ORDER BY report_id, seq`, ids)) byId.get(c.report_id).convs.push(serializeConv(c));
  }
  return out;
}

const publicReport = (r) => (r ? { week: r.week, noneReason: r.noneReason, at: r.at, convs: r.convs } : null);

module.exports = { checkWeekAllowed, validateReport, upsertReport, loadReports, publicReport };
