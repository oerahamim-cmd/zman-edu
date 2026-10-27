'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setup, educatorLogin, leadLogin, managerLogin, EDUCATORS, db } = require('./helpers');

let app;
before(async () => { app = await setup(); });
after(async () => { await app.close(); });

const NAOMI = EDUCATORS.filter((e) => e[0] === 'naomi-shemer').map((e) => e[1]);
const OTHERS = EDUCATORS.filter((e) => e[0] !== 'naomi-shemer').map((e) => e[1]);
const idOf = async (name) => (await db.get('SELECT id FROM users WHERE name = ?', [name])).id;
const leadNaomi = async () => { const c = app.client(); const r = await leadLogin(c, 'naomi-shemer', 'נטע רוזן', '1357'); assert.equal(r.status, 200); return c; };
const manager = async () => { const c = app.client(); const r = await managerLogin(c); assert.equal(r.status, 200); return c; };
const setLeadNames = async (on) => { const m = await manager(); const r = await m.put('/api/admin/settings', { leadSeesNames: on }); assert.equal(r.status, 200); };

test('בלי כניסה: כל נתיבי המידע סגורים (401)', async () => {
  const c = app.client();
  for (const p of ['/api/me', '/api/lead/overview', '/api/admin/overview', '/api/admin/educators', '/api/admin/leads', '/api/admin/export.csv', '/api/admin/audit']) {
    assert.equal((await c.get(p)).status, 401, p);
  }
  assert.equal((await c.put('/api/me/reports/2026-10-11', { convs: [] })).status, 401);
  assert.equal((await c.put('/api/admin/settings', { leadSeesNames: true })).status, 401);
});

test('הנתיב הציבורי לא מחזיר משתמשים, קודי הצטרפות או מבטים', async () => {
  const r = await app.client().get('/api/public');
  assert.equal(r.status, 200);
  assert.equal(r.json.schools.length, 4);
  for (const n of [...NAOMI, ...OTHERS]) assert.ok(!r.text.includes(n), `שם ${n} דלף`);
  for (const s of Object.values(await app.joinCodes())) { assert.ok(!r.text.includes(s.educator)); assert.ok(!r.text.includes(s.lead)); }
});

test('מחנכת לא נכנסת לאזורי מובילה ומנהלת', async () => {
  const c = app.client();
  assert.equal((await educatorLogin(c, 5)).status, 200);
  for (const p of ['/api/lead/overview', '/api/lead/educators', '/api/admin/overview', '/api/admin/educators', '/api/admin/leads', '/api/admin/export', '/api/admin/audit']) {
    assert.equal((await c.get(p)).status, 403, p);
  }
  assert.equal((await c.put('/api/admin/settings', { leadSeesNames: true })).status, 403);
  assert.equal((await c.post(`/api/admin/educators/${await idOf(NAOMI[1])}/reset-code`)).status, 403);
});

test('מחנכת רואה רק את המבטים שלה', async () => {
  const c = app.client();
  await educatorLogin(c, 5);
  const me = await c.get('/api/me');
  assert.equal(me.status, 200);
  assert.equal(me.json.user.name, NAOMI[0]);
  const mine = (await db.get('SELECT COUNT(*)::int AS n FROM reports WHERE educator_id = ?', [await idOf(NAOMI[0])])).n;
  assert.equal(me.json.reports.length, mine);
  for (const n of [...NAOMI.slice(1), ...OTHERS]) assert.ok(!me.text.includes(n), `שם ${n} דלף`);
});

test('מובילה: רק בית הספר שלה, ובברירת מחדל רק נתונים מצטברים', async () => {
  await setLeadNames(false);
  const c = await leadNaomi();
  const r = await c.get('/api/lead/overview');
  assert.equal(r.status, 200);
  assert.equal(r.json.masked, true);
  assert.equal(r.json.expected, 5);
  for (const n of [...NAOMI, ...OTHERS]) assert.ok(!r.text.includes(n), `שם ${n} דלף למובילה`);
  assert.ok(!('matrix' in r.json) && !('missing' in r.json), 'אין רשימות שמיות במצב מצטבר');
  // ערך קטן מהסף לא נשלח בכלל, ולא רק מוסתר בתצוגה
  const all = Object.values(r.json.dist).flat();
  assert.ok(all.some((x) => x.hidden), 'הנתונים בדוגמה כוללים ערך מתחת ל-5');
  for (const x of all) { if (x.hidden) assert.ok(!('n' in x), 'ערך מוסתר דלף'); else assert.ok(x.n >= 5); }
  // פרמטר של בית ספר אחר מהדפדפן מתעלמים ממנו
  const other = await c.get('/api/lead/overview?school=rabin');
  assert.equal(other.json.schoolId, r.json.schoolId);
  assert.equal(other.json.expected, 5);
  // הרשימות השמיות והערות החופשיות סגורות
  for (const p of ['/api/lead/educators', `/api/lead/educators/${await idOf(NAOMI[0])}`, '/api/lead/notes']) assert.equal((await c.get(p)).status, 403, p);
  // ושום נתיב של מנהלת התכנית
  for (const p of ['/api/admin/overview', '/api/admin/educators', '/api/admin/leads', '/api/admin/export.csv']) assert.equal((await c.get(p)).status, 403, p);
});

test('מובילה: סכום המבטים בתצוגה מצטברת תואם את בית הספר שלה בלבד', async () => {
  await setLeadNames(false);
  const c = await leadNaomi();
  const r = await c.get('/api/lead/overview');
  const row = await db.get(
    `SELECT COUNT(*)::int AS n FROM conversations c JOIN reports r ON r.id = c.report_id JOIN users u ON u.id = r.educator_id JOIN schools s ON s.id = u.school_id WHERE s.slug = 'naomi-shemer' AND r.week = ?`, [r.json.week]);
  assert.equal(r.json.convs, row.n);
});

test('מובילה במצב שמות: רק בית הספר שלה, ומחנכת מבית ספר אחר לא נמצאת', async () => {
  await setLeadNames(true);
  const c = await leadNaomi();
  const ov = await c.get('/api/lead/overview');
  assert.equal(ov.json.masked, false);
  assert.deepEqual(ov.json.matrix.rows.map((x) => x.name).sort(), [...NAOMI].sort());
  for (const n of OTHERS) assert.ok(!ov.text.includes(n), `שם ${n} מבית ספר אחר דלף`);

  const list = await c.get('/api/lead/educators?school=rabin');
  assert.equal(list.status, 200);
  assert.deepEqual(list.json.educators.map((x) => x.name).sort(), [...NAOMI].sort(), 'הפרמטר school לא משנה את ההיקף');
  for (const n of OTHERS) assert.ok(!list.text.includes(n));

  assert.equal((await c.get(`/api/lead/educators/${await idOf(NAOMI[2])}`)).status, 200);
  const foreign = await c.get(`/api/lead/educators/${await idOf(OTHERS[0])}`);
  const missing = await c.get('/api/lead/educators/999999');
  assert.equal(foreign.status, 404);
  assert.deepEqual(foreign.json, missing.json, 'אותה תשובה כמו על מחנכת שלא קיימת');
  assert.equal((await c.get('/api/lead/educators/abc')).status, 404);

  const notes = await c.get('/api/lead/notes?school=rabin');
  assert.equal(notes.status, 200);
  for (const it of notes.json.items) assert.ok(NAOMI.includes(it.educator), `הערה של ${it.educator} מבית ספר אחר`);
  for (const n of OTHERS) assert.ok(!notes.text.includes(n));
  await setLeadNames(false);
});

test('מנהלת התכנית רואה את כולם, ופעולות רגישות נרשמות ביומן', async () => {
  const m = await manager();
  const ov = await m.get('/api/admin/overview');
  const later = (await db.get("SELECT COUNT(*)::int AS n FROM users WHERE role='educator' AND joined_week > ?", [ov.json.week])).n;
  assert.equal(ov.json.expected, 15 - later);
  const one = await m.get('/api/admin/overview?school=rabin');
  assert.ok(one.json.expected <= 5);
  assert.equal((await m.get('/api/admin/educators')).json.educators.length, 15);
  assert.equal((await m.get(`/api/admin/educators/${await idOf(OTHERS[0])}`)).status, 200);
  assert.equal((await m.get('/api/admin/notes')).status, 200);
  const csv = await m.get('/api/admin/export.csv');
  assert.equal(csv.status, 200);
  assert.deepEqual([...csv.bytes.subarray(0, 3)], [0xEF, 0xBB, 0xBF], 'BOM לעברית באקסל');
  assert.match(csv.headers.get('content-disposition'), /attachment/);
  const actions = (await m.get('/api/admin/audit')).json.entries.map((e) => e.action);
  for (const a of ['view_educators', 'view_educator', 'view_notes', 'export_csv']) assert.ok(actions.includes(a), `חסר ביומן: ${a}`);
});

test('יומן הגישה הוא append-only', async () => {
  await assert.rejects(db.run('UPDATE audit_log SET action = ?', ['x']), /append-only/);
  await assert.rejects(db.run('DELETE FROM audit_log'), /append-only/);
  await assert.rejects(db.run('TRUNCATE audit_log'), /append-only/);
});

test('ייצוא: תא שמתחיל בנוסחה לא יורץ באקסל', async () => {
  const id = await idOf(NAOMI[0]);
  const rep = await db.get('SELECT id FROM reports WHERE educator_id = ? ORDER BY week DESC LIMIT 1', [id]);
  await db.run('INSERT INTO conversations (report_id, seq, round, axis, kind, feeling, note) VALUES (?, 99, 1, ?, ?, ?, ?)', [rep.id, 'identity', 'deep', 'good', '=HYPERLINK("http://evil.example","x")']);
  const m = await manager();
  const csv = await m.get('/api/admin/export.csv');
  assert.ok(csv.text.includes(`'=HYPERLINK`), 'הנוסחה לא נוטרלה');
  assert.ok(!/(^|,)"?=HYPERLINK/m.test(csv.text), 'נוסחה גולמית בקובץ');
});

test('רק מנהלת התכנית משנה הגדרות, קודים וכלים; מובילה לא', async () => {
  const lead = await leadNaomi();
  assert.equal((await lead.put('/api/admin/settings', { leadSeesNames: true })).status, 403);
  assert.equal((await lead.post('/api/admin/schools/naomi-shemer/codes', { which: 'educator' })).status, 403);
  assert.equal((await lead.post('/api/admin/tools', { folder: 'identity', title: 'x' })).status, 403);
  const m = await manager();
  assert.equal((await m.post('/api/admin/tools', { folder: 'identity', title: 'כלי בדיקה', url: 'http://insecure.example' })).status, 400, 'קישור בלי https נדחה');
  assert.equal((await m.post('/api/admin/tools', { folder: 'bogus', title: 'x' })).status, 400);
  const add = await m.post('/api/admin/tools', { folder: 'goals', title: 'כלי בדיקה', desc: 'תיאור', type: 'פרקטיקה', url: 'https://example.org/x' });
  assert.equal(add.status, 200);
  const pub = await app.client().get('/api/public');
  assert.ok(pub.json.tools.some((t) => t.title === 'כלי בדיקה' && t.folder === 'goals' && t.desc === 'תיאור'));
  assert.equal((await m.del(`/api/admin/tools/${add.json.id}`)).status, 200);
});

test('החלפת קוד הצטרפות מבטלת את הישן', async () => {
  const m = await manager();
  const before = (await app.joinCodes())['rabin'].educator;
  const r = await m.post('/api/admin/schools/rabin/codes', { which: 'educator' });
  assert.equal(r.status, 200);
  assert.notEqual(r.json.code, before);
  const bad = await app.client().post('/api/auth/educator/register', { school: 'rabin', name: 'מחנכת חדשה בדיקה', joinCode: before, code: '4321' });
  assert.equal(bad.status, 403);
});

test('מי השתמשה במיפוי: רק מנהלת התכנית רואה, ובלי נתוני מיפוי', async () => {
  const id = await idOf(NAOMI[1]);
  await db.run('INSERT INTO tool_usage (user_id, tool, first_day, last_day, days, started_day) VALUES (?, ?, ?, ?, 2, ?) ON CONFLICT (user_id, tool) DO NOTHING', [id, 'mapping', '2026-10-12', '2026-10-13', '2026-10-12']);
  const m = await manager();
  const list = await m.get('/api/admin/educators');
  const mine = list.json.educators.find((e) => e.id === id);
  assert.equal(mine.mapping.started, true);
  assert.deepEqual(Object.keys(mine.mapping).sort(), ['days', 'firstDay', 'lastDay', 'started']);
  const ov = await m.get('/api/admin/overview');
  assert.ok(ov.json.mapping.opened >= 1 && ov.json.mapping.users.some((u) => u.id === id));
  assert.equal((await m.get(`/api/admin/educators/${id}`)).json.educator.mapping.days, 2);
  // מובילה לא מקבלת את זה, גם כשהיא רואה שמות
  await m.put('/api/admin/settings', { leadSeesNames: true });
  const lead = await leadNaomi();
  assert.ok(!('mapping' in (await lead.get('/api/lead/overview')).json));
  assert.ok(!(await lead.get('/api/lead/educators')).json.educators.some((e) => 'mapping' in e));
  assert.ok(!('mapping' in (await lead.get(`/api/lead/educators/${id}`)).json.educator));
  await m.put('/api/admin/settings', { leadSeesNames: false });
});

test('מחנכת שהוסרה: אי אפשר להירשם מחדש לחשבון שלה ולרשת את המבטים, גם עם קוד ההצטרפות', async () => {
  // בוחרים מחנכת עם מבטים (מבית ספר שלא נבדק אחרי כן), מסירים אותה, ומנסים "להשתלט" עליה
  // בהרשמה מחדש עם קוד ההצטרפות של בית הספר
  const victim = await db.get(
    `SELECT u.id, u.name, s.slug FROM users u JOIN schools s ON s.id = u.school_id
       JOIN reports r ON r.educator_id = u.id
      WHERE u.role = 'educator' AND u.active = 1 AND s.slug <> 'naomi-shemer'
      GROUP BY u.id, u.name, s.slug HAVING COUNT(r.id) > 0 LIMIT 1`);
  const beforeReports = (await db.get('SELECT COUNT(*)::int AS n FROM reports WHERE educator_id = ?', [victim.id])).n;
  assert.ok(beforeReports > 0);

  const m = await manager();
  assert.equal((await m.post(`/api/admin/educators/${victim.id}/remove`)).status, 200);

  const join = (await app.joinCodes())[victim.slug].educator;
  const outsider = app.client();
  const reg = await outsider.post('/api/auth/educator/register', { school: victim.slug, name: victim.name, joinCode: join, code: '9191' });

  if (reg.status === 200) {
    // אם מתאפשרת הרשמה, זה חייב להיות חשבון חדש וריק — לא החשבון שהוסר ולא המבטים שלו
    assert.notEqual(reg.json.user.id, victim.id, 'קיבל בחזרה את מזהה החשבון שהוסר');
    const mine = await outsider.get('/api/me');
    assert.equal(mine.json.reports.length, 0, 'ירש מבטים של חשבון שהוסר');
  } else {
    assert.ok(reg.status === 403 || reg.status === 409, `סטטוס לא צפוי ${reg.status}`);
  }
  // המבטים של החשבון שהוסר נשמרים במסד (לייצוא ולסטטיסטיקה), מקושרים למזהה הישן בלבד
  assert.equal((await db.get('SELECT COUNT(*)::int AS n FROM reports WHERE educator_id = ?', [victim.id])).n, beforeReports);
});

test('סבבים מהמיפוי: מחנכת שולחת רק ארבעה מספרים, מובילה רואה סכום לבית הספר, מנהלת גם לכל מחנכת', async () => {
  const e = app.client();
  assert.equal((await educatorLogin(e, EDUCATORS.findIndex((x) => x[1] === NAOMI[0]))).status, 200);
  for (const bad of [{ r0: 1, r1: 2, r2: 3 }, { r0: -1, r1: 0, r2: 0, r3: 0 }, { r0: 1.5, r1: 0, r2: 0, r3: 0 }, { r0: '3', r1: 0, r2: 0, r3: 0 }, { r0: 999, r1: 0, r2: 0, r3: 0 }]) {
    assert.equal((await e.put('/api/me/class-rounds', bad)).status, 400, JSON.stringify(bad));
  }
  assert.equal((await e.put('/api/me/class-rounds', { r0: 8, r1: 12, r2: 6, r3: 2, names: ['נועה'] })).status, 200);
  const row = await db.get('SELECT * FROM class_rounds WHERE user_id = ?', [await idOf(NAOMI[0])]);
  assert.deepEqual(Object.keys(row).sort(), ['r0', 'r1', 'r2', 'r3', 'updated_at', 'user_id']); // שום שדה נוסף לא נשמר
  await setLeadNames(false);
  const lead = await leadNaomi();
  assert.equal((await lead.put('/api/me/class-rounds', { r0: 1, r1: 1, r2: 1, r3: 1 })).status, 403);
  const lv = (await lead.get('/api/lead/overview')).json.classRounds;
  assert.equal(lv.educators, 1);
  assert.deepEqual(lv.rounds.map((x) => (x.hidden ? 'h' : x.n)), [8, 12, 6, 'h']); // 2 מתחת לסף: לא נשלח
  const m = await manager();
  const av = (await m.get('/api/admin/overview')).json.classRounds;
  assert.deepEqual(av.rounds.map((x) => x.n), [8, 12, 6, 2]);
  assert.deepEqual((await m.get(`/api/admin/educators/${await idOf(NAOMI[0])}`)).json.educator.classRounds.r, [8, 12, 6, 2]);
  // גם כשהמובילה רואה שמות, אין לה את המספרים של מחנכת בודדת
  await m.put('/api/admin/settings', { leadSeesNames: true });
  const one = await (await leadNaomi()).get(`/api/lead/educators/${await idOf(NAOMI[0])}`);
  assert.equal(one.status, 200);
  assert.ok(!('classRounds' in one.json.educator));
  await m.put('/api/admin/settings', { leadSeesNames: false });
});
