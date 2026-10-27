'use strict';
// חישובי הצפייה של מנהלת התכנית והמובילות. הכול מחושב כאן, בשרת, לפי היקף ההרשאה:
//   scope.school: מזהה בית ספר (מובילה) או null (מנהלת התכנית, כל בתי הספר)
//   scope.names:  האם רואים שמות מחנכות והערות חופשיות
//   scope.mask:   האם ערכים קטנים מ-K_MIN מוסתרים (לא נשלח כלל הערך האמיתי)
const db = require('./db');
const weeks = require('./weeks');
const config = require('./config');
const { ROUNDS, AXES, KINDS, SCALE, FEELINGS, LABELS } = require('./constants');
const { loadReports } = require('./reports');
const { HttpError } = require('./http');

async function educatorsOf(schoolId) {
  const sql = `SELECT u.id, u.name, u.school_id, u.joined_week, u.last_login_at, (u.secret_hash IS NOT NULL) AS has_code, s.slug AS school_slug, s.name AS school_name
                 FROM users u JOIN schools s ON s.id = u.school_id
                WHERE u.role = 'educator' AND u.active = 1 ${schoolId ? 'AND u.school_id = ?' : ''}
             ORDER BY s.sort_order, u.name`;
  return db.all(sql, schoolId ? [schoolId] : []);
}

// בית הספר שעליו מסתכלים: מובילה תמיד רק על שלה (הפרמטר מהדפדפן מתעלמים ממנו). מנהלת התכנית: 'all' או slug.
async function resolveSchool(scope, schoolParam) {
  if (scope.school) return scope.school;
  if (!schoolParam || schoolParam === 'all') return null;
  const row = await db.get('SELECT id FROM schools WHERE slug = ?', [String(schoolParam).slice(0, 60)]);
  if (!row) throw new HttpError(400, 'בית הספר לא קיים.');
  return row.id;
}

// מי השתמשה במיפוי הכיתה: רק עצם הפתיחה (ומתי), לא תוכן. מגיע רק למנהלת התכנית.
async function usageOf(ids, tool = 'mapping') {
  const out = new Map();
  if (!ids.length) return out;
  for (const u of await db.all(`SELECT user_id, first_day, last_day, days, started_day FROM tool_usage WHERE tool = ? AND user_id IN ${db.inList(ids)}`, [tool, ...ids])) {
    out.set(u.user_id, { firstDay: u.first_day, lastDay: u.last_day, days: u.days, started: !!u.started_day });
  }
  return out;
}
const joinWeekOf = (e, start) => (e.joined_week > start ? e.joined_week : start);

function distribution(allConvs, getter, values, mask) {
  const counts = new Map(values.map((v) => [v, 0]));
  for (const c of allConvs) { const v = getter(c); if (counts.has(v)) counts.set(v, counts.get(v) + 1); }
  return values.map((v) => {
    const n = counts.get(v);
    // ערך קטן מהסף לא נשלח בכלל (גם לא בתגובת ה-API), ולא רק מוסתר בתצוגה
    return mask && n < config.K_MIN ? { v, hidden: true } : { v, n };
  });
}

// חלוקת הדיבור נשמרת באחוזים (כמה מהשיחה התלמיד/ה דיברו). לפילוח מחלקים לחמישה טווחים שווים: 1 הכי הרבה דיבור של המחנכת ... 5 הכי הרבה דיבור של התלמיד/ה
const talkBucket = (pct) => (Number.isInteger(pct) ? Math.min(5, Math.floor(Math.max(0, pct - 1) / 20) + 1) : null);
// ממוצע דיבור התלמיד/ה: כמו שאר הערכים, לא נשלח כשיש פחות מ-K_MIN שיחות עם תשובה
function talkAverage(allConvs, mask) {
  const vals = allConvs.map((c) => c.talkPct).filter(Number.isInteger);
  if (!vals.length || (mask && vals.length < config.K_MIN)) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

async function overview(scope, { week, school } = {}) {
  const start = await db.programStart();
  const cur = weeks.curWeek();
  let w = cur;
  if (week !== undefined) {
    if (!weeks.isWeekStart(week) || week < start || week > cur) throw new HttpError(400, 'השבוע לא תקין.');
    w = week;
  }
  const schoolId = await resolveSchool(scope, school);
  const edus = await educatorsOf(schoolId);
  const reports = await loadReports(edus.map((e) => e.id));
  const reportOf = (e, wk) => (reports.get(e.id) || []).find((r) => r.week === wk);

  // מצופות: מי שהצטרפה עד אותו שבוע, וגם מי ששלחה מבט עליו
  const expectedIn = (wk) => edus.filter((e) => joinWeekOf(e, start) <= wk || reportOf(e, wk));
  const expected = expectedIn(w);
  const reported = expected.filter((e) => reportOf(e, w));
  const missing = expected.filter((e) => !reportOf(e, w));
  const total = reported.reduce((n, e) => n + reportOf(e, w).convs.length, 0);

  const series = weeks.weeksBetween(start, cur).map((wk) => {
    const ex = expectedIn(wk);
    const rp = ex.filter((e) => reportOf(e, wk));
    return { week: wk, rate: ex.length ? Math.round((rp.length / ex.length) * 100) : null, convs: rp.reduce((n, e) => n + reportOf(e, wk).convs.length, 0) };
  });

  const allConvs = edus.flatMap((e) => reports.get(e.id) || []).flatMap((r) => r.convs);
  const mask = !!scope.mask;
  const out = {
    week: w, programStart: start, curWeek: cur, schoolId: schoolId || null,
    expected: expected.length, reported: reported.length, missingCount: missing.length, convs: total,
    pct: expected.length ? Math.round((reported.length / expected.length) * 100) : 0,
    series,
    dist: {
      round: distribution(allConvs, (c) => c.round, ROUNDS, mask),
      // אפשר לסמן כמה צירים וסוגים לשיחה, ולכן שיחה נספרת בכל אחד מהם
      axis: distribution(allConvs.flatMap((c) => c.axes), (v) => v, AXES, mask),
      kind: distribution(allConvs.flatMap((c) => c.kinds), (v) => v, KINDS, mask),
      feeling: distribution(allConvs, (c) => c.feeling, FEELINGS, mask),
      depth: distribution(allConvs, (c) => c.depth, SCALE, mask),
      talk: distribution(allConvs, (c) => talkBucket(c.talkPct), SCALE, mask),
    },
    talkAvg: talkAverage(allConvs, mask),
    masked: mask,
  };

  if (scope.admin) {
    const use = await usageOf(edus.map((e) => e.id));
    out.mapping = {
      of: edus.length, opened: use.size, started: [...use.values()].filter((u) => u.started).length,
      users: edus.filter((e) => use.has(e.id)).map((e) => ({ id: e.id, name: e.name, schoolName: e.school_name, ...use.get(e.id) })),
    };
  }
  if (scope.names) {
    out.missing = missing.map((e) => ({ id: e.id, name: e.name, schoolName: e.school_name }));
    const firstCol = weeks.addDays(w, -35) < start ? start : weeks.addDays(w, -35);
    const cols = weeks.weeksBetween(firstCol, w);
    out.matrix = {
      cols,
      rows: edus.map((e) => ({
        id: e.id, name: e.name, schoolName: e.school_name,
        cells: cols.map((wk) => { const r = reportOf(e, wk); if (!r && joinWeekOf(e, start) > wk) return 'na'; return r ? 'sent' : 'miss'; }),
      })),
    };
  }
  return out;
}

async function educatorList(scope, { school } = {}) {
  const start = await db.programStart();
  const schoolId = await resolveSchool(scope, school);
  const edus = await educatorsOf(schoolId);
  const reports = await loadReports(edus.map((e) => e.id));
  const cur = weeks.curWeek();
  const use = scope.admin ? await usageOf(edus.map((e) => e.id)) : null;
  return edus.map((e) => {
    const rp = (reports.get(e.id) || []).slice().sort((a, b) => (a.week < b.week ? 1 : -1));
    return {
      id: e.id, name: e.name, schoolSlug: e.school_slug, schoolName: e.school_name, hasCode: !!e.has_code,
      reports: rp.length, weeksExpected: weeks.weeksBetween(joinWeekOf(e, start), cur).length,
      convs: rp.reduce((n, r) => n + r.convs.length, 0), lastAt: rp[0] ? rp[0].at : null,
      ...(use ? { mapping: use.get(e.id) || null } : {}),
    };
  });
}

async function educatorDetail(scope, id) {
  const start = await db.programStart();
  const e = Number.isInteger(Number(id)) ? await db.get(`SELECT u.id, u.name, u.school_id, u.joined_week, s.slug AS school_slug, s.name AS school_name FROM users u JOIN schools s ON s.id = u.school_id WHERE u.id = ? AND u.role = 'educator'`, [Number(id)]) : null;
  // מובילה לא פותחת מחנכת של בית ספר אחר: מקבלת בדיוק את אותה תשובה כמו על מחנכת שלא קיימת
  if (!e || (scope.school && e.school_id !== scope.school)) throw new HttpError(404, 'המחנכת לא נמצאה.');
  const reports = (await loadReports([e.id])).get(e.id) || [];
  const joinWeek = joinWeekOf(e, start);
  const list = weeks.weeksBetween(joinWeek, weeks.curWeek()).reverse().map((wk) => {
    const r = reports.find((x) => x.week === wk);
    return { week: wk, report: r ? { week: r.week, noneReason: r.noneReason, at: r.at, convs: r.convs } : null };
  });
  const mapping = scope.admin ? ((await usageOf([e.id])).get(e.id) || null) : undefined;
  return { educator: { id: e.id, name: e.name, schoolName: e.school_name, joinedWeek: joinWeek, ...(scope.admin ? { mapping } : {}) }, weeks: list, reportsCount: reports.length, convs: reports.reduce((n, r) => n + r.convs.length, 0) };
}

async function notes(scope, { school, feeling, axis } = {}) {
  const schoolId = await resolveSchool(scope, school);
  const edus = await educatorsOf(schoolId);
  const reports = await loadReports(edus.map((e) => e.id));
  const items = [];
  for (const e of edus) {
    for (const r of reports.get(e.id) || []) {
      for (const c of r.convs) {
        if (!c.note) continue;
        if (feeling && feeling !== 'all' && c.feeling !== feeling) continue;
        if (axis && axis !== 'all' && !c.axes.includes(axis)) continue;
        items.push({ educator: e.name, week: r.week, axes: c.axes, feeling: c.feeling, note: c.note });
      }
    }
  }
  items.sort((a, b) => (a.week < b.week ? 1 : a.week > b.week ? -1 : 0));
  return { total: items.length, items: items.slice(0, 60) };
}

async function exportRows() {
  const start = await db.programStart();
  const edus = await educatorsOf(null);
  const reports = await loadReports(edus.map((e) => e.id));
  const rows = [['שבוע (תאריך תחילה)', 'שבוע בתכנית', 'בית ספר', 'מחנכת', 'שיחות בשבוע', 'סבב', 'ציר', 'סוג שיחה', 'אופי השיחה (1 מידע ומעשיות עד 5 עולם פנימי)', 'כמה מהשיחה התלמיד/ה דיברו (אחוז)', 'תחושה', 'הערה', 'תאריך שליחה']];
  const weekNo = (wk) => Math.round((weeks.fromYmd(wk) - weeks.fromYmd(start)) / (7 * 86400000)) + 1;
  const all = [];
  for (const e of edus) for (const r of reports.get(e.id) || []) all.push({ e, r });
  all.sort((a, b) => (a.r.week < b.r.week ? -1 : a.r.week > b.r.week ? 1 : a.e.name.localeCompare(b.e.name, 'he')));
  for (const { e, r } of all) {
    const base = [r.week, weekNo(r.week), e.school_name, e.name, r.convs.length];
    if (!r.convs.length) rows.push([...base, '', '', '', '', '', '', r.noneReason ? `ללא שיחות: ${LABELS.none[r.noneReason] || ''}` : '', r.at]);
    for (const c of r.convs) {
      rows.push([...base, LABELS.round[c.round] || '',c.axes.map((a) => (a === 'other' ? `אחר: ${c.axisOther}` : LABELS.axis[a])).join(' + '), c.kinds.map((k) => (k === 'other' ? `אחר: ${c.kindOther}` : LABELS.kind[k])).join(' + '), c.depth ?? '', c.talkPct ?? '', LABELS.feeling[c.feeling], c.note || '', r.at]);
    }
  }
  return rows;
}

const csvCell = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
// מונע הרצת נוסחאות כשפותחים את הקובץ באקסל (תא שמתחיל בתו נוסחה)
const safeCell = (v) => (typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const toCsv = (rows) => rows.map((r) => r.map((v) => csvCell(safeCell(v))).join(',')).join('\r\n');

module.exports = { educatorsOf, resolveSchool, overview, educatorList, educatorDetail, notes, exportRows, toCsv };
