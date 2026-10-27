'use strict';
const config = require('./config');
const weeks = require('./weeks');
const auth = require('./auth');
const stats = require('./stats');
const reports = require('./reports');
const db = require('./db');
const { route, HttpError, CsvResponse } = require('./http');
const { FOLDERS, USAGE_TOOLS } = require('./constants');

const { nowIso, audit, nameKey, cleanName, normalizeCode, newJoinCode, programStart, leadSeesNames, setSetting } = db;

const TOO_MANY = (min) => new HttpError(429, `יותר מדי ניסיונות. אפשר לנסות שוב בעוד ${min} דקות.`, 'throttled');
const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const toId = (v) => { const n = Number(v); if (!Number.isInteger(n) || n < 1) throw new HttpError(404, 'לא נמצא.'); return n; };

const schoolBySlug = async (slug) => (await db.get('SELECT * FROM schools WHERE slug = ?', [str(slug, 60)])) || null;
const managerExists = async () => !!(await db.get("SELECT 1 AS x FROM users WHERE role = 'manager'"));

const publicUser = (u) => ({ role: u.role, id: u.id, name: u.name, schoolSlug: u.school_slug || null, schoolName: u.school_name || null, joinedWeek: u.joined_week });

async function sessionUserById(id) {
  return db.get(
    `SELECT u.id, u.role, u.name, u.email, u.school_id, u.joined_week, sc.slug AS school_slug, sc.name AS school_name
       FROM users u LEFT JOIN schools sc ON sc.id = u.school_id WHERE u.id = ?`, [id]);
}

async function startSession(ctx, userId, remember) {
  const user = await sessionUserById(userId);
  const keep = !!remember && user.role !== 'manager';
  ctx.setSessionCookie(await auth.createSession(userId, keep), keep);
  return { user: publicUser(user) };
}

// ====================== ציבורי ======================
const health = async () => { await db.get('SELECT 1 AS ok'); return { ok: true }; };
route('GET', '/healthz', 'public', health);
route('GET', '/api/healthz', 'public', health);

route('GET', '/api/public', 'public', async () => ({
  schools: await db.all('SELECT slug, name FROM schools ORDER BY sort_order'),
  programStart: await programStart(), today: weeks.today(), curWeek: weeks.curWeek(),
  leadSeesNames: await leadSeesNames(),
  setupNeeded: !!config.SETUP_CODE && !(await managerExists()),
  tools: (await db.all('SELECT id, folder, title, description AS "desc", type, url, example FROM tools ORDER BY example, id')).map((t) => ({ ...t, example: !!t.example })),
}));

route('GET', '/api/session', 'public', async (ctx) => ({ user: ctx.user ? publicUser(ctx.user) : null }));

route('POST', '/api/auth/logout', 'public', async (ctx) => {
  await auth.destroySession(ctx.sessionToken);
  ctx.clearSessionCookie();
});

// ====================== כניסה והרשמה: מחנכות ומובילות ======================
async function personFields(body) {
  const school = await schoolBySlug(body.school);
  if (!school) throw new HttpError(400, 'יש לבחור בית ספר.');
  const name = cleanName(str(body.name, 80));
  if (name.length < 2 || name.length > 60) throw new HttpError(400, 'יש לכתוב שם.');
  return { school, name, key: nameKey(name) };
}

async function registerPerson(ctx, role) {
  const { school, name, key } = await personFields(ctx.body);
  const code = str(ctx.body.code, 20);
  const err = auth.checkPersonalCode(code);
  if (err) throw new HttpError(400, err);
  const ipKey = `ip:${ctx.ip}`, codeKey = `code:${ctx.ip}`;
  const wait = Math.max(await auth.blockedMinutes(ipKey), await auth.blockedMinutes(codeKey));
  if (wait) throw TOO_MANY(wait);
  // קוד ההצטרפות של בית הספר (נפרד למחנכות ולמובילה) הוא מה שמונע מאדם זר להירשם
  const expected = role === 'lead' ? school.lead_code : school.educator_code;
  if (!auth.safeEqual(normalizeCode(ctx.body.joinCode), normalizeCode(expected))) {
    await auth.failed(codeKey);
    throw new HttpError(403, 'קוד ההצטרפות לא נכון. את הקוד של בית הספר מקבלים ממנהלת התכנית.', 'bad_join_code');
  }
  const existing = await db.get('SELECT id, secret_hash FROM users WHERE school_id = ? AND role = ? AND name_key = ?', [school.id, role, key]);
  if (existing && existing.secret_hash) {
    throw new HttpError(409, role === 'lead' ? 'כבר קיימת מובילה בשם הזה בבית הספר. אם זו את, בחרו "כבר יש לי קוד".' : 'כבר קיימת מחנכת בשם הזה בבית הספר. אם זו את, בחרו "כבר יש לי קוד".', 'exists');
  }
  const hash = await auth.hashSecret(code);
  let id;
  if (existing) { // חשבון שהקוד שלו אופס (או שהוסר): בוחרים קוד חדש
    id = existing.id;
    await db.run('UPDATE users SET secret_hash = ?, active = 1, name = ? WHERE id = ?', [hash, name, id]);
  } else {
    try {
      id = (await db.get('INSERT INTO users (role, school_id, name, name_key, secret_hash, active, created_at, joined_week) VALUES (?, ?, ?, ?, ?, 1, ?, ?) RETURNING id',
        [role, school.id, name, key, hash, nowIso(), weeks.weekStart(weeks.today())])).id;
    } catch (e) {
      if (e && e.code === '23505') throw new HttpError(409, 'כבר קיימת הרשמה בשם הזה בבית הספר.', 'exists'); // שתי הרשמות באותו רגע
      throw e;
    }
  }
  await audit({ id, role }, 'register', school.slug);
  return startSession(ctx, id, ctx.body.remember);
}

async function loginPerson(ctx, role) {
  const { school, key } = await personFields(ctx.body);
  const acctKey = `acct:${role}:${school.id}:${key}`, ipKey = `ip:${ctx.ip}`;
  // הניסיון נספר לפני הבדיקה, כך שגם ניסיונות מקבילים נחסמים
  const wait = Math.max(await auth.hit(acctKey), await auth.blockedMinutes(ipKey));
  if (wait) throw TOO_MANY(wait);
  const u = await db.get('SELECT id, secret_hash, active FROM users WHERE school_id = ? AND role = ? AND name_key = ?', [school.id, role, key]);
  let ok = false;
  if (u && u.active && u.secret_hash) ok = await auth.verifySecret(str(ctx.body.code, 20), u.secret_hash); else await auth.burn();
  if (!ok) {
    await auth.failed(ipKey);
    throw new HttpError(401, 'השם או הקוד לא תואמים. אם הקוד אופס, בחרו "זו הפעם הראשונה שלי" ובחרו קוד חדש.', 'bad_login');
  }
  await auth.clear(acctKey);
  return startSession(ctx, u.id, ctx.body.remember);
}

route('POST', '/api/auth/educator/register', 'public', (ctx) => registerPerson(ctx, 'educator'));
route('POST', '/api/auth/educator/login', 'public', (ctx) => loginPerson(ctx, 'educator'));
route('POST', '/api/auth/lead/register', 'public', (ctx) => registerPerson(ctx, 'lead'));
route('POST', '/api/auth/lead/login', 'public', (ctx) => loginPerson(ctx, 'lead'));

// ====================== מנהלת התכנית: הקמה, כניסה ואיפוס סיסמה ======================
// קוד ההקמה (SETUP_CODE) מוגדר במשתני הסביבה של הפרויקט, ולכן רק מי שמנהלת את הפרויקט מכירה אותו.
async function checkSetupCode(ctx) {
  if (!config.SETUP_CODE) throw new HttpError(404, 'לא נמצא.');
  const key = `setup:${ctx.ip}`;
  const wait = await auth.blockedMinutes(key);
  if (wait) throw TOO_MANY(wait);
  if (!auth.safeEqual(str(ctx.body.setupCode, 200), config.SETUP_CODE)) { await auth.failed(key); throw new HttpError(403, 'קוד ההקמה לא נכון.', 'bad_setup_code'); }
}
const emailOf = (body) => str(body.email, 200).trim().toLowerCase();
function checkManagerFields(body) {
  const name = cleanName(str(body.name, 80)), email = emailOf(body);
  if (name.length < 2) throw new HttpError(400, 'יש לכתוב שם.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'כתובת הדואל לא תקינה.');
  const pwErr = auth.checkPasswordPolicy(body.password);
  if (pwErr) throw new HttpError(400, pwErr);
  return { name, email };
}

route('POST', '/api/auth/manager/setup', 'public', async (ctx) => {
  if (!config.SETUP_CODE || await managerExists()) throw new HttpError(404, 'לא נמצא.');
  await checkSetupCode(ctx);
  const { name, email } = checkManagerFields(ctx.body);
  const id = (await db.get('INSERT INTO users (role, school_id, name, name_key, email, secret_hash, active, created_at, joined_week) VALUES (?, NULL, ?, ?, ?, ?, 1, ?, ?) RETURNING id',
    ['manager', name, nameKey(name), email, await auth.hashSecret(ctx.body.password), nowIso(), await programStart()])).id;
  await audit({ id, role: 'manager' }, 'manager_setup');
  return startSession(ctx, id, false);
});

// סיסמה שנשכחה: מי שמכירה את קוד ההקמה (מההגדרות של הפרויקט) בוחרת סיסמה חדשה
route('POST', '/api/auth/manager/reset', 'public', async (ctx) => {
  await checkSetupCode(ctx);
  const email = emailOf(ctx.body);
  const pwErr = auth.checkPasswordPolicy(ctx.body.password);
  if (pwErr) throw new HttpError(400, pwErr);
  const u = await db.get("SELECT id FROM users WHERE role = 'manager' AND email = ?", [email]);
  if (!u) throw new HttpError(404, 'לא נמצאה מנהלת עם הדואל הזה.');
  await db.run('UPDATE users SET secret_hash = ?, active = 1 WHERE id = ?', [await auth.hashSecret(ctx.body.password), u.id]);
  await auth.destroyUserSessions(u.id);
  await audit({ id: u.id, role: 'manager' }, 'password_reset');
  return startSession(ctx, u.id, false);
});

route('POST', '/api/auth/manager/login', 'public', async (ctx) => {
  const email = emailOf(ctx.body);
  const acctKey = `acct:manager:${email}`, ipKey = `ip:${ctx.ip}`;
  const wait = Math.max(await auth.hit(acctKey), await auth.blockedMinutes(ipKey));
  if (wait) throw TOO_MANY(wait);
  const u = await db.get("SELECT id, secret_hash, active FROM users WHERE role = 'manager' AND email = ?", [email]);
  let ok = false;
  if (u && u.active) ok = await auth.verifySecret(str(ctx.body.password, 200), u.secret_hash); else await auth.burn();
  if (!ok) { await auth.failed(ipKey); throw new HttpError(401, 'הדואל או הסיסמה לא תואמים.', 'bad_login'); }
  await auth.clear(acctKey);
  await audit({ id: u.id, role: 'manager' }, 'manager_login');
  return startSession(ctx, u.id, false);
});

// ====================== החשבון שלי: החלפת קוד או סיסמה ======================
route('POST', '/api/me/code', ['educator', 'lead'], async (ctx) => {
  const acctKey = `acct:code:${ctx.user.id}`;
  const wait = await auth.hit(acctKey);
  if (wait) throw TOO_MANY(wait);
  const row = await db.get('SELECT secret_hash FROM users WHERE id = ?', [ctx.user.id]);
  if (!(await auth.verifySecret(str(ctx.body.current, 20), row.secret_hash))) throw new HttpError(401, 'הקוד הנוכחי לא תואם.', 'bad_login');
  const err = auth.checkPersonalCode(ctx.body.next);
  if (err) throw new HttpError(400, 'הקוד החדש הוא ארבע ספרות.');
  await db.run('UPDATE users SET secret_hash = ? WHERE id = ?', [await auth.hashSecret(ctx.body.next), ctx.user.id]);
  await auth.clear(acctKey);
  await auth.destroyUserSessions(ctx.user.id, ctx.sessionToken);
});

route('POST', '/api/me/password', ['manager'], async (ctx) => {
  const acctKey = `acct:code:${ctx.user.id}`;
  const wait = await auth.hit(acctKey);
  if (wait) throw TOO_MANY(wait);
  const row = await db.get('SELECT secret_hash FROM users WHERE id = ?', [ctx.user.id]);
  if (!(await auth.verifySecret(str(ctx.body.current, 200), row.secret_hash))) throw new HttpError(401, 'הסיסמה הנוכחית לא תואמת.', 'bad_login');
  const err = auth.checkPasswordPolicy(ctx.body.next);
  if (err) throw new HttpError(400, err);
  await db.run('UPDATE users SET secret_hash = ? WHERE id = ?', [await auth.hashSecret(ctx.body.next), ctx.user.id]);
  await auth.clear(acctKey);
  await auth.destroyUserSessions(ctx.user.id, ctx.sessionToken);
  await audit(ctx.user, 'password_change');
});

// ====================== מחנכת: המבטים שלי (רק שלה) ======================
route('GET', '/api/me', ['educator'], async (ctx) => {
  const mine = (await reports.loadReports([ctx.user.id])).get(ctx.user.id) || [];
  return { user: publicUser(ctx.user), reports: mine.map(reports.publicReport), programStart: await programStart(), curWeek: weeks.curWeek() };
});

route('PUT', '/api/me/reports/:week', ['educator'], async (ctx) => {
  reports.checkWeekAllowed(ctx.user, ctx.params.week, await programStart());
  const data = reports.validateReport(ctx.body);
  await reports.upsertReport(ctx.user.id, ctx.params.week, data);
  const saved = ((await reports.loadReports([ctx.user.id])).get(ctx.user.id) || []).find((r) => r.week === ctx.params.week);
  return { report: reports.publicReport(saved) };
});

// "יחד": כמה מחנכות בתכנית, וכמה שיחות אישיות היו בארבעת השבועות האחרונים בכל בתי הספר. שני מספרים כוללים בלבד, בלי שמות ובלי פילוח.
route('GET', '/api/me/together', ['educator'], async () => {
  const from = weeks.addDays(weeks.curWeek(), -21);
  const e = await db.get("SELECT COUNT(*)::int AS n FROM users WHERE role = 'educator' AND active = 1");
  const c = await db.get(`SELECT COUNT(*)::int AS n FROM conversations c JOIN reports r ON r.id = c.report_id JOIN users u ON u.id = r.educator_id
    WHERE u.active = 1 AND r.week >= ?`, [from]);
  return { educators: e.n, convs: c.n };
});

// עצם השימוש בכלי אישי (כרגע: מיפוי הכיתה), כדי שמנהלת התכנית תדע מי משתמשת. נשמר רק מי, מתי וכמה ימים. לא נשלח ולא נשמר שום תוכן.
route('POST', '/api/me/usage', ['educator'], async (ctx) => {
  const tool = ctx.body.tool;
  if (!USAGE_TOOLS.includes(tool)) throw new HttpError(400, 'ערך לא תקין.');
  const today = weeks.today();
  await db.run(`INSERT INTO tool_usage (user_id, tool, first_day, last_day, days, started_day) VALUES (?, ?, ?, ?, 1, ?)
    ON CONFLICT (user_id, tool) DO UPDATE SET
      days = tool_usage.days + CASE WHEN tool_usage.last_day = excluded.last_day THEN 0 ELSE 1 END,
      last_day = excluded.last_day,
      started_day = COALESCE(tool_usage.started_day, excluded.started_day)`, [ctx.user.id, tool, today, today, ctx.body.started === true ? today : null]);
});

// ====================== מנהלת התכנית ומובילות: תצוגות לפי היקף ======================
// מנהלת התכנית רואה הכול. מובילה רואה רק את בית הספר שלה (בית הספר נקבע מהחשבון, לא מהבקשה),
// ובברירת מחדל רק נתונים מצטברים: בלי שמות מחנכות ובלי הערות חופשיות, וערכים קטנים מ-5 לא נשלחים אליה בכלל.
async function scopeOf(user) {
  if (user.role === 'manager') return { school: null, names: true, mask: false, admin: true };
  const names = await leadSeesNames();
  return { school: user.school_id, names, mask: !names, admin: false };
}

function requireNames(scope) {
  if (!scope.names) throw new HttpError(403, 'אין הרשאה לפעולה הזו.', 'forbidden');
}

function staffRoutes(prefix, roles) {
  route('GET', `${prefix}/overview`, roles, async (ctx) => stats.overview(await scopeOf(ctx.user), { week: ctx.query.week, school: ctx.query.school }));
  route('GET', `${prefix}/educators`, roles, async (ctx) => {
    const scope = await scopeOf(ctx.user); requireNames(scope);
    await audit(ctx.user, 'view_educators', ctx.query.school || (scope.school ? 'own_school' : 'all'));
    return { educators: await stats.educatorList(scope, { school: ctx.query.school }) };
  });
  route('GET', `${prefix}/educators/:id`, roles, async (ctx) => {
    const scope = await scopeOf(ctx.user); requireNames(scope);
    const out = await stats.educatorDetail(scope, ctx.params.id);
    await audit(ctx.user, 'view_educator', out.educator.id);
    return out;
  });
  route('GET', `${prefix}/notes`, roles, async (ctx) => {
    const scope = await scopeOf(ctx.user); requireNames(scope);
    await audit(ctx.user, 'view_notes', ctx.query.school || (scope.school ? 'own_school' : 'all'));
    return stats.notes(scope, { school: ctx.query.school, feeling: ctx.query.feeling, axis: ctx.query.axis });
  });
}
staffRoutes('/api/admin', ['manager']);
staffRoutes('/api/lead', ['lead']);

// ====================== מנהלת התכנית בלבד ======================
route('GET', '/api/admin/leads', ['manager'], async () => {
  const schools = await db.all('SELECT id, slug, name, educator_code, lead_code FROM schools ORDER BY sort_order');
  const leads = await db.all("SELECT id, school_id, name, (secret_hash IS NOT NULL) AS has_code, last_login_at FROM users WHERE role = 'lead' AND active = 1 ORDER BY name");
  const counts = await db.all("SELECT school_id, COUNT(*)::int AS n FROM users WHERE role = 'educator' AND active = 1 GROUP BY school_id");
  return {
    leadSeesNames: await leadSeesNames(),
    schools: schools.map((s) => ({
      slug: s.slug, name: s.name, educatorCode: s.educator_code, leadCode: s.lead_code,
      educators: (counts.find((c) => c.school_id === s.id) || { n: 0 }).n,
      leads: leads.filter((l) => l.school_id === s.id).map((l) => ({ id: l.id, name: l.name, hasCode: !!l.has_code, lastLoginAt: l.last_login_at })),
    })),
  };
});

route('PUT', '/api/admin/settings', ['manager'], async (ctx) => {
  if (typeof ctx.body.leadSeesNames !== 'boolean') throw new HttpError(400, 'ערך לא תקין.');
  await setSetting('lead_sees_names', ctx.body.leadSeesNames ? '1' : '0');
  await audit(ctx.user, 'lead_visibility', ctx.body.leadSeesNames ? 'names' : 'aggregated');
  return { leadSeesNames: await leadSeesNames() };
});

route('POST', '/api/admin/schools/:slug/codes', ['manager'], async (ctx) => {
  const school = await schoolBySlug(ctx.params.slug);
  if (!school) throw new HttpError(404, 'לא נמצא.');
  const which = ctx.body.which;
  if (which !== 'educator' && which !== 'lead') throw new HttpError(400, 'ערך לא תקין.');
  const taken = new Set((await db.all('SELECT educator_code, lead_code FROM schools')).flatMap((r) => [normalizeCode(r.educator_code), normalizeCode(r.lead_code)]));
  let code;
  do { code = newJoinCode(); } while (taken.has(normalizeCode(code)));
  await db.run(`UPDATE schools SET ${which === 'lead' ? 'lead_code' : 'educator_code'} = ? WHERE id = ?`, [code, school.id]);
  await audit(ctx.user, 'regenerate_join_code', `${school.slug}:${which}`);
  return { code };
});

async function personInManagerScope(id, role) {
  const u = await db.get('SELECT id, name, role FROM users WHERE id = ? AND role = ? AND active = 1', [toId(id), role]);
  if (!u) throw new HttpError(404, 'לא נמצא.');
  return u;
}

route('POST', '/api/admin/educators/:id/reset-code', ['manager'], async (ctx) => {
  const u = await personInManagerScope(ctx.params.id, 'educator');
  await db.run('UPDATE users SET secret_hash = NULL WHERE id = ?', [u.id]);
  await auth.destroyUserSessions(u.id);
  await audit(ctx.user, 'reset_code', u.id);
});
route('POST', '/api/admin/educators/:id/remove', ['manager'], async (ctx) => {
  const u = await personInManagerScope(ctx.params.id, 'educator');
  // הסרה היא סופית: מלבד איפוס הקוד, פורשים את מפתח השם כך שאי אפשר להירשם מחדש לאותו חשבון
  // (ולרשת את המבטים שלו) עם קוד ההצטרפות. אדם חדש עם אותו שם מקבל חשבון חדש וריק.
  await db.run("UPDATE users SET active = 0, secret_hash = NULL, name_key = 'removed:' || id::text || ':' || name_key WHERE id = ?", [u.id]);
  await auth.destroyUserSessions(u.id);
  await audit(ctx.user, 'remove_educator', u.id);
});
route('POST', '/api/admin/leads/:id/reset-code', ['manager'], async (ctx) => {
  const u = await personInManagerScope(ctx.params.id, 'lead');
  await db.run('UPDATE users SET secret_hash = NULL WHERE id = ?', [u.id]);
  await auth.destroyUserSessions(u.id);
  await audit(ctx.user, 'reset_code', u.id);
});
route('POST', '/api/admin/leads/:id/remove', ['manager'], async (ctx) => {
  const u = await personInManagerScope(ctx.params.id, 'lead');
  // כמו במחנכת: הסרה סופית שפורשת את מפתח השם, כדי שאי אפשר יהיה להירשם מחדש לאותו חשבון
  await db.run("UPDATE users SET active = 0, secret_hash = NULL, name_key = 'removed:' || id::text || ':' || name_key WHERE id = ?", [u.id]);
  await auth.destroyUserSessions(u.id);
  await audit(ctx.user, 'remove_lead', u.id);
});
route('PUT', '/api/admin/leads/:id', ['manager'], async (ctx) => {
  const u = await personInManagerScope(ctx.params.id, 'lead');
  const name = cleanName(str(ctx.body.name, 80));
  if (name.length < 2 || name.length > 60) throw new HttpError(400, 'יש לכתוב שם.');
  try {
    await db.run('UPDATE users SET name = ?, name_key = ? WHERE id = ?', [name, nameKey(name), u.id]);
  } catch (e) {
    if (e && e.code === '23505') throw new HttpError(409, 'כבר קיימת מובילה בשם הזה בבית הספר.');
    throw e;
  }
  await audit(ctx.user, 'rename_lead', u.id);
});

// ----- ארגז הכלים (הקריאה פתוחה לכולם דרך /api/public, העריכה למנהלת התכנית) -----
route('POST', '/api/admin/tools', ['manager'], async (ctx) => {
  const b = ctx.body;
  if (!FOLDERS.includes(b.folder)) throw new HttpError(400, 'יש לבחור תיקייה.');
  const title = str(b.title, 120).trim();
  if (!title) throw new HttpError(400, 'יש לכתוב שם.');
  const url = str(b.url, 500).trim();
  if (url && !/^https:\/\//i.test(url)) throw new HttpError(400, 'הקישור צריך להתחיל ב-https://');
  const type = b.type === 'פרקטיקה' ? 'פרקטיקה' : 'כלי';
  const row = await db.get('INSERT INTO tools (folder, title, description, type, url, example, created_at) VALUES (?, ?, ?, ?, ?, 0, ?) RETURNING id',
    [b.folder, title, str(b.desc, 600).trim(), type, url, nowIso()]);
  await audit(ctx.user, 'tool_add', row.id);
  return { id: row.id };
});
route('DELETE', '/api/admin/tools/:id', ['manager'], async (ctx) => {
  const id = toId(ctx.params.id);
  await db.run('DELETE FROM tools WHERE id = ?', [id]);
  await audit(ctx.user, 'tool_remove', id);
});

// ----- ייצוא ויומן גישה -----
route('GET', '/api/admin/export', ['manager'], async (ctx) => { await audit(ctx.user, 'export_view'); return { rows: await stats.exportRows() }; });
route('GET', '/api/admin/export.csv', ['manager'], async (ctx) => {
  await audit(ctx.user, 'export_csv');
  return new CsvResponse('zman-weekly-export.csv', stats.toCsv(await stats.exportRows()));
});
route('GET', '/api/admin/audit', ['manager'], async () => ({
  entries: await db.all(
    `SELECT a.id, a.timestamp, a.role, a.action, a.target, u.name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 200`),
}));

// בוט "המקרה שלי" בכלי "להקשיב לכוחות"
require('./listen');
