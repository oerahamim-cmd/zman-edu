(() => {
'use strict';
document.documentElement.lang = 'he';
document.documentElement.dir = 'rtl';

/* =====================================================================
   קבועים
   ===================================================================== */
let PROGRAM_START = ''; // יום ראשון, תחילת השבוע הראשון של התכנית (מגיע מהשרת)
let SCHOOLS = []; // בתי הספר (מגיעים מהשרת)
const ROUNDS = [{ v: 1, t: `סבב ראשון` }, { v: 2, t: `סבב שני` }, { v: 3, t: `סבב שלישי` }];
const AXES = [
  { v: 'identity', t: `זהות וחוזקות` },
  { v: 'goals', t: `יעדים ומטרות` },
  { v: 'agency', t: `אג'נסי` },
  { v: 'other', t: `אחר` },
];
const KINDS = [
  { v: 'intro', t: `שיחת היכרות` },
  { v: 'notebook', t: `שיחת מחברת` },
  { v: 'complex', t: `שיחה מורכבת` },
  { v: 'grades', t: `הערכה לקראת תעודות` },
  { v: 'parents', t: `לקראת יום הורים` },
  { v: 'other', t: `אחר` },
];
// שתי שאלות ציר, בסולם של 1 עד 5. הצד הימני (1) הוא הראשון שקוראים.
const DEPTH_SCALE = { q: 'מה היה אופי השיחה?', from: 'אינפורמטיבית', to: 'מעמיקה', labels: [`אינפורמטיבית מאוד`, `יותר אינפורמטיבית`, `באמצע`, `יותר מעמיקה`, `מעמיקה מאוד`] };
const TALK_SCALE = { q: 'מי דיבר יותר בשיחה?', from: 'אני דיברתי יותר', to: 'התלמיד/ה דיברו יותר', labels: [`אני דיברתי הרבה יותר`, `אני דיברתי קצת יותר`, `חלוקה שווה בערך`, `התלמיד/ה דיברו קצת יותר`, `התלמיד/ה דיברו הרבה יותר`] };
const scaleOpts = (s) => s.labels.map((t, i) => ({ v: i + 1, t: `${i + 1} · ${t}` }));
const FEELINGS = [
  { v: 'inspired', e: '🤩', t: `מעורר השראה` },
  { v: 'good', e: '😊', t: `טוב ומספק` },
  { v: 'neutral', e: '😐', t: `רגיל` },
  { v: 'thoughtful', e: '🤔', t: `מעורר מחשבות` },
  { v: 'frustrated', e: '😕', t: `מתסכל` },
  { v: 'heavy', e: '😔', t: `כבד` },
];
const NONE_REASONS = [{ v: 'holiday', t: `חג או חופשה` }, { v: 'sick', t: `היעדרות` }, { v: 'load', t: `עומס` }, { v: 'other', t: `אחר` }];
const FOLDERS = [
  { id: 'identity', t: `זהות וחוזקות`, icon: 'reflect', d: `שיחות שמזהות חוזקות ובונות תחושת זהות.` },
  { id: 'goals', t: `יעדים ומטרות`, icon: 'target', d: `שיחות על מומחיות, יעדים ומטרות אישיות.` },
  { id: 'agency', t: `אג'נסי`, icon: 'empower', d: `יצירתיות, שותפות ויכולת לפעול ולהשפיע.` },
];
const ICON = { check: 0, chev: 1, calendar: 2, checklist: 3, write: 4, reflect: 5, question: 6, insight: 7, idea: 8, community: 9, school: 10, data: 11, send: 12, secure: 13, person: 14, hourglass: 15, form: 17, team: 18, circle: 19, plan: 20, plant: 21, steps: 22, target: 23, empower: 24, compass: 25, book: 26, note: 27, practice: 28, id: 29, eye: 30, care: 31, alert: 32, gear: 33, trend: 34, pencil: 35, brain: 36, lock: 38, timer: 39, ballot: 40 };
const GROUPS = [
  { n: 1, t: `ראשונים`, d: `יש נקודה (דחוף), בכל קשר. קשר 1–2: שיחה קצרה לבניית קשר. קשר 3: שיחה ממוקדת במה שראיתי.` },
  { n: 2, t: `אחריהם`, d: `בלי נקודה · קשר 1. אלה התלמידים השקטים, ובלי תזמון מכוון הם נשארים אחרונים.` },
  { n: 3, t: `אחר כך`, d: `בלי נקודה · קשר 2. לפי תחושה.` },
  { n: 4, t: `לבסוף`, d: `בלי נקודה · קשר 3. שיחות קצרות לחיזוק יעדים ואג'נסי.` },
];
const URGENT_WORDS = [`נוכחות`, `חברים`, `מצב רוח`, `לימודים`, `התנהגות`];
const LINKS = [{ v: 1, t: `כמעט לא מכיר/ה` }, { v: 2, t: `מכיר/ה את הבסיס` }, { v: 3, t: `קשר ושיח פתוח` }];
const MAP_AXES = [{ v: 'z', t: `ז`, full: `זהות וחוזקות` }, { v: 'y', t: `י`, full: `יעדים ומטרות` }, { v: 'a', t: `א`, full: `אג'נסי` }];

const lab = (list, v) => (list.find((x) => x.v === v) || {}).t || '';
const nConv = (n) => (n === 0 ? 'אין שיחות' : n === 1 ? 'שיחה אחת' : `${n} שיחות`);


/* =====================================================================
   כלי עזר: DOM
   ===================================================================== */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'selected') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  add(el, kids);
  return el;
}
function add(el, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
const areaTone = () => (state.area === 'admin' ? 'purple' : 'blue');
function ic(name, { size = 24, tone } = {}) {
  const i = ICON[name];
  const t = tone || areaTone();
  const el = document.createElement('span');
  el.className = 'ic' + (t === 'white' ? ' w' : t === 'purple' ? ' v' : '');
  el.style.setProperty('--s', size + 'px');
  el.style.setProperty('--x', i % 8);
  el.style.setProperty('--y', Math.floor(i / 8));
  el.setAttribute('aria-hidden', 'true');
  return el;
}
let uid = 0;
const nid = (p = 'x') => `${p}${++uid}`;

function chipGroup({ options, value, onChange, cls = '', multi = false, label }) {
  const name = nid('g');
  const box = h('div', { class: 'chips', role: multi ? 'group' : 'radiogroup', 'aria-label': label || null });
  options.forEach((o) => {
    const inp = h('input', { type: multi ? 'checkbox' : 'radio', name, value: String(o.v), checked: multi ? (value || []).includes(o.v) : value === o.v });
    inp.addEventListener('change', () => onChange(multi ? [...box.querySelectorAll('input:checked')].map((i) => options.find((x) => String(x.v) === i.value).v) : o.v));
    box.append(h('label', { class: `chip ${cls}` }, inp, h('span', null, o.t)));
  });
  return box;
}
// סולם של חמש נקודות בין שני קצוות (למשל אינפורמטיבית ... מעמיקה). מתחת מופיע מה שנבחר, במילים.
function scaleGroup({ value, onChange, scale }) {
  const name = nid('sc');
  const readout = h('p', { class: 'scaleread', 'aria-live': 'polite' }, value ? scale.labels[value - 1] : '');
  const box = h('div', { class: 'scale' }, h('div', { class: 'scalebtns', role: 'radiogroup', 'aria-label': scale.q }, scale.labels.map((t, i) => {
    const inp = h('input', { type: 'radio', name, value: String(i + 1), checked: value === i + 1 });
    inp.addEventListener('change', () => { readout.textContent = t; onChange(i + 1); });
    return h('label', { class: 'scalepick', title: t }, inp, h('span', null, String(i + 1)));
  })), h('div', { class: 'scaleends', 'aria-hidden': 'true' }, h('span', null, scale.from), h('span', null, scale.to)), readout);
  return box;
}
function moodGroup({ value, onChange }) {
  const name = nid('m');
  const box = h('div', { class: 'moods', role: 'radiogroup', 'aria-label': 'איך יצאתם מהשיחה' });
  FEELINGS.forEach((f) => {
    const inp = h('input', { type: 'radio', name, value: f.v, checked: value === f.v });
    inp.addEventListener('change', () => onChange(f.v));
    box.append(h('label', { class: 'mood' }, inp, h('span', null, h('span', { class: 'em', 'aria-hidden': 'true' }, f.e), f.t)));
  });
  return box;
}
// שדה סיסמה או קוד: כפתור "הצגה" מחליף בין נקודות לטקסט גלוי
function withReveal(input) {
  const btn = h('button', { class: 'reveal', type: 'button', 'aria-pressed': 'false', 'aria-label': 'הצגת הסיסמה' }, 'הצגה');
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? 'הסתרה' : 'הצגה';
    btn.setAttribute('aria-pressed', String(show));
    btn.setAttribute('aria-label', show ? 'הסתרת הסיסמה' : 'הצגת הסיסמה');
  });
  return h('div', { class: input.classList.contains('pin') ? 'reveal-wrap pin-wrap' : 'reveal-wrap' }, input, btn);
}
function field(label, input, hint) {
  const id = nid('f');
  if (input.id === '' || !input.id) input.id = id;
  const control = input.type === 'password' ? withReveal(input) : input;
  return h('div', { class: 'field' }, h('label', { for: input.id }, label), control, hint ? h('div', { class: 'hint' }, hint) : null);
}



/* =====================================================================
   מצב האפליקציה והתקשורת עם השרת
   כל מה שמוצג מגיע מהשרת, והשרת הוא שמחליט מי רואה מה. רק שני דברים נשארים במכשיר:
   מיפוי הכיתה (שמות או ראשי תיבות של תלמידים) וטיוטות של מבט שעוד לא נשלח.
   ===================================================================== */
const MAP_KEY = 'zmw.map.v1', DRAFT_KEY = 'zmw.draft.v1', RETURN_KEY = 'zmw.returning', SCHOOL_KEY = 'zmw.school';
const mem = {};
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return k in mem ? mem[k] : null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { mem[k] = v; } };
const lsDel = (k) => { try { localStorage.removeItem(k); } catch { delete mem[k]; } };

let pub = null;          // מידע ציבורי: בתי ספר, תחילת התכנית, ארגז הכלים
let session = null;      // המשתמשת המחוברת: { role, id, name, schoolSlug, schoolName, joinedWeek }
let myReports = [];      // המבטים של המחנכת המחוברת (רק שלה)
let CUR_WEEK = '';
let justRegistered = false;

async function api(method, path, body) {
  let res;
  try {
    res = await fetch(path, { method, headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  } catch {
    throw Object.assign(new Error('אין חיבור לשרת. בדקו את החיבור ונסו שוב.'), { status: 0 });
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((json && json.error) || 'משהו השתבש. נסו שוב.'), { status: res.status, code: json && json.code });
  return json;
}
function applyPublic(p) {
  pub = p;
  SCHOOLS = p.schools.map((s) => ({ id: s.slug, name: s.name }));
  PROGRAM_START = p.programStart;
  CUR_WEEK = p.curWeek;
}
const refreshPublic = async () => applyPublic(await api('GET', '/api/public'));

const me = () => (session && session.role === 'educator' ? session : null);
const isAdmin = () => !!(session && session.role === 'manager');
const leadUser = () => (session && session.role === 'lead' ? session : null);
const schoolName = (id) => (SCHOOLS.find((s) => s.id === id) || {}).name || '';
const firstName = (n) => n.split(' ')[0];
const myReport = (w) => myReports.find((r) => r.week === w);
const joinWeek = () => (session.joinedWeek > PROGRAM_START ? session.joinedWeek : PROGRAM_START);
const qs = (o) => { const p = Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== 'all'); return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : ''; };

async function loadMe() { myReports = (await api('GET', '/api/me')).reports; }
async function enter(user) { session = user; myReports = []; if (user.role === 'educator') await loadMe(); }
async function logout() { try { await api('POST', '/api/auth/logout'); } catch { /* גם אם השרת לא ענה, מנקים את המסך */ } session = null; myReports = []; go('/'); }

// תצוגה שנטענת מהשרת: מציגה "טוענים…", ואז את התוכן. אם בזמן הטעינה עברו למסך אחר, התשובה נזרקת.
let viewToken = 0;
function asyncView(load, paint, onError) {
  const mine = viewToken;
  const host = h('div', { class: 'stack', style: 'gap:var(--gap)' }, h('section', { class: 'frame' }, h('p', { class: 'muted', role: 'status' }, 'טוענים…')));
  load().then((data) => {
    if (mine !== viewToken) return;
    clear(host);
    add(host, [paint(data, host)]);
  }, (err) => {
    if (mine !== viewToken) return;
    if (err.status === 401) { session = null; myReports = []; render(); return; }
    clear(host);
    if (onError && onError(err, host)) return;
    add(host, h('section', { class: 'frame' }, h('h3', null, 'לא הצלחנו לטעון'), h('p', { class: 'muted' }, err.message), h('div', null, h('button', { class: 'btn soft', onclick: () => render() }, 'לנסות שוב'))));
  });
  return host;
}


/* ---------- תאריכים: שבוע = ראשון עד שבת ---------- */
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (s, n) => { const d = fromYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const weekOf = (d = new Date()) => { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return ymd(x); };
const MONTHS = [`ינואר`, `פברואר`, `מרץ`, `אפריל`, `מאי`, `יוני`, `יולי`, `אוגוסט`, `ספטמבר`, `אוקטובר`, `נובמבר`, `דצמבר`];
function weekLabel(ws) {
  const a = fromYmd(ws), b = fromYmd(addDays(ws, 6));
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ב${MONTHS[a.getMonth()]}` : `${a.getDate()} ב${MONTHS[a.getMonth()]} – ${b.getDate()} ב${MONTHS[b.getMonth()]}`;
}
const shortDate = (s) => { const d = fromYmd(s.slice(0, 10)); return `${d.getDate()}.${d.getMonth() + 1}`; };
const weekNo = (ws) => Math.round((fromYmd(ws) - fromYmd(PROGRAM_START)) / (7 * 86400000)) + 1;
const weeksBetween = (from, to) => { const out = []; for (let w = from; w <= to; w = addDays(w, 7)) out.push(w); return out; };

/* ---------- זיהוי שמות בטקסט חופשי (התראה עדינה) ---------- */
const NAME_LIST = `אבישי אברהם אהרון אהוד אוהד אופיר אוריאל אורי אחמד אילון אילן איתי איתן אלעד אלון אליהו אליעד אלירן אמיר אמנון אסף אפרים ארז אריאל אריק בועז בנימין ברק גבריאל גד גדי גיא גידי גלעד דביר דוד דורון דן דני דניאל דקל הלל חגי חנן יאיר יגאל ידידיה יהב יהודה יהונתן יואב יובל יוסי יוסף יונתן יוני יותם יעקב יצחק ירון ישי ישראל כפיר לביא ליאור לירון ליאם לידור מאור מתן מיכאל מיקי מנחם מקס משה מרדכי נבו נדב ניב ניסים נסים נתנאל סהר סער עדי עידו עילי עידן עומר עופר עמוס עמיחי עמיר עמנואל פלג צחי צבי קובי רועי רון רן רפאל רונן שגיא שהם שלומי שמעון שמואל שלמה שאול תומר תמיר
אביגיל אגם אדוה אווה איילת איריס אילנה אלינור אלונה אמיליה אמילי אנה אסתר אפרת אורלי אורית אורנה אושרת ברכה בתיה דבורה דורית דניאלה דנה דפנה הדס הילה הילי חגית חווה חנה טליה טלי יאנה יסמין יעל יערה יפעת יפית כרמית לאה ליאן ליאת לילך לימור ליהי לינוי לירז ליה מאיה מורן מיכל מילי מירב מירי מיטל מיה מלי מעיין מרים מריה מרינה נאוה נגה נועה נופר נטע נעמה נעמי נטלי ניקול ניצן נירית נינה סיוון סיגל סימה ספיר עדן עלמה ענבר ענת עינב עפרה פנינה צופית קארין קורל רבקה רוני רוית רונה רונית רות רחל ריטה רינה רעות שולמית שושנה שירן שירלי שלומית שקד שרית שרה תהילה תמר תכלת תמי תהל
אלכסנדר אלכסנדרה אלכס דמיטרי דימה ולדימיר ויקטור ויקטוריה סרגיי איגור יבגני אולג אנטון ארטיום קיריל מקסים נטליה נטשה אנסטסיה ליזה סבטלנה אירינה אולגה יוליה קסניה פולינה מילנה דריה ניקיטה רומן ארקדי בוריס פבל סשה יורי אנדריי אלינה אלנה ואדים ויטלי דניס קטיה ורוניקה מוחמד יוסוף פאטמה סארה`.split(/\s+/);
const NAMES = new Set(NAME_LIST);
const PREFIX = 'והבלש';
function findNames(text) {
  const found = new Set();
  for (const raw of String(text || '').match(/[א-תA-Za-z'-]+/g) || []) {
    const w = raw.replace(/^['-]+|['-]+$/g, '');
    if (w.length < 2) continue;
    if (/^[A-Za-z]+$/.test(w)) { if (/^[A-Z][a-z]{2,}$/.test(w)) found.add(w); continue; }
    const cands = [w];
    if (w.length >= 4 && PREFIX.includes(w[0])) cands.push(w.slice(1));
    if (w.length >= 5 && PREFIX.includes(w[0]) && PREFIX.includes(w[1])) cands.push(w.slice(2));
    if (cands.some((c) => NAMES.has(c))) found.add(w);
  }
  return [...found];
}



/* ---------- הודעות, חלונות, הדבקה והורדה ---------- */
let toastTimer = null;
function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 3200);
}
function openSheet(build) {
  const close = () => ov.remove();
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' });
  const ov = h('div', { class: 'overlay', onclick: (e) => { if (e.target === ov) close(); } }, sheet);
  add(sheet, [build(close)]);
  document.body.append(ov);
  return close;
}
async function copyText(text, okMsg = 'הועתק') {
  try { await navigator.clipboard.writeText(text); toast(okMsg); return true; } catch { /* ננסה חלופה */ }
  try {
    const ta = h('textarea', { style: 'position:fixed;opacity:0;top:0' }, text); document.body.append(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); if (ok) { toast(okMsg); return true; }
  } catch { /* ממשיכים להצגה ידנית */ }
  openSheet((close) => [h('h3', null, 'העתקה ידנית'), h('p', { class: 'muted' }, 'הדפדפן לא אפשר העתקה אוטומטית. אפשר לסמן את הטקסט ולהעתיק.'),
    h('textarea', { class: 'textarea copybox', readonly: true, onfocus: (e) => e.target.select() }, text), h('button', { class: 'btn', onclick: close }, 'סגירה')]);
  return false;
}
function download(name, text, mime = 'text/plain') {
  try {
    const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + text], { type: mime + ';charset=utf-8' })), download: name });
    document.body.append(a); a.click(); a.remove(); return true;
  } catch { return false; }
}
function confirmInline(host, message, yesLabel, onYes) {
  host.querySelector('.confirm')?.remove();
  const box = h('div', { class: 'confirm', role: 'alert' }, h('p', null, message),
    h('button', { class: 'btn sm danger', onclick: () => { box.remove(); onYes(); } }, yesLabel),
    h('button', { class: 'btn sm soft', onclick: () => box.remove() }, 'ביטול'));
  host.append(box);
  return box;
}



/* =====================================================================
   ניווט
   ===================================================================== */
const state = { area: 'public', demoReset: false };
const app = h('div', { class: 'wrap' });
document.body.append(app);
let current = '';
function go(path) {
  current = path;
  try { if (location.hash !== '#' + path) location.hash = path; } catch { /* בתוך חלון מוגבל: ממשיכים בלי כתובת */ }
  render();
}
window.addEventListener('hashchange', () => { const p = location.hash.slice(1) || '/'; if (p !== current) { current = p; render(); } });
const route = () => (current || '/').split('?')[0];


function header() {
  const p = route();
  const links = [{ to: '/', t: 'בית' }, { to: '/me', t: 'שיחות אישיות' }, { to: '/mapping', t: 'מיפוי הכיתה' }, { to: '/tools', t: 'ארגז כלים' }];
  if (leadUser()) links.push({ to: '/lead', t: 'מובילות' });
  if (isAdmin()) links.push({ to: '/admin', t: 'מנהלת התכנית' });
  const active = (to) => (to === '/' ? p === '/' : p === to || p.startsWith(to + '/'));
  return h('header', { class: 'frame top' },
    h('a', { class: 'brand', href: '#/', 'aria-label': 'זמן לחינוך, לדף הבית', onclick: (e) => { e.preventDefault(); go('/'); } },
      h('img', { class: 'l-hotam', src: 'assets/logo/hotam-logo.png', alt: 'חותם' }), h('span', { class: 'sep', 'aria-hidden': 'true' }),
      h('img', { class: 'l-ort', src: 'assets/logo/ort-logo.png', alt: 'רשת אורט' }), h('span', { class: 'sep', 'aria-hidden': 'true' }),
      h('img', { class: 'l-zman', src: 'assets/logo/zman-logo.png', alt: 'זמן לחינוך' })),
    h('nav', { class: 'nav', 'aria-label': 'ניווט ראשי' }, links.map((l) => h('a', { href: '#' + l.to, 'aria-current': active(l.to) ? 'page' : null, onclick: (e) => { e.preventDefault(); go(l.to); } }, l.t))));
}
const ROLE_LABEL = { educator: 'מחנכת', lead: 'מובילה זמן לחינוך', manager: 'מנהלת התכנית' };
function sessionBar() {
  if (!session) return null;
  return h('div', { class: 'sessionbar' }, h('b', null, ROLE_LABEL[session.role]), h('span', null, [session.name, session.schoolName].filter(Boolean).join(' · ')),
    h('button', { class: 'btn', onclick: logout }, 'יציאה'));
}

let lastRoute = null;
function render() {
  viewToken++;
  const p = route();
  const y0 = window.scrollY, same = p === lastRoute;
  lastRoute = p;
    if (!p.startsWith('/tools/cards') && typeof cardsLeave === 'function') cardsLeave();
  if (p !== '/tools/identity/cards') sc = null;
  state.area = p.startsWith('/admin') || p.startsWith('/lead') ? 'admin' : 'public';
  const view = resolve(p);
  clear(app);
  app.className = 'wrap' + (state.area === 'admin' ? ' admin' : '');
  add(app, [header(), sessionBar(), view, h('p', { class: 'footer-note' }, 'זמן לחינוך · חותם ורשת אורט')]);
  window.scrollTo(0, same ? y0 : 0);
}
function resolve(p) {
  let m;
  if (p === '/') return viewHome();
  if (p === '/tools') return viewTools();
  if (p === '/tools/cards' || p.startsWith('/tools/cards/')) return viewCards(p);
  if (p === '/tools/identity/listen') return viewListen();
  if (p === '/tools/identity/cards') return viewStrengthCards();
  if ((m = /^\/tools\/(identity|goals|agency)$/.exec(p))) return viewFolder(m[1]);
  const gate = (path, view) => (me() ? view() : isAdmin() || leadUser() ? viewEducatorsOnly() : viewEnter('new', path));
  const gateMap = (path, view) => gate(path, () => { ensureMap(); pingMapping(); return view(); });
  const gateLead = (path, view) => (leadUser() ? view() : me() || isAdmin() ? viewLeadsOnly() : viewEnter('lead', path));
  if (p === '/mapping') return gateMap(p, viewMappingHome);
  if (p === '/mapping/map') return gateMap(p, viewMap);
  if (p === '/mapping/circles') return gateMap(p, viewCircles);
  if (p === '/mapping/class') return gateMap(p, viewClass);
  if (p === '/mapping/helper') return gateMap(p, viewHelper);
  if (p.startsWith('/tools/mapping')) return redirect(p.replace('/tools/mapping', '/mapping'));
  if (p === '/enter') return viewEnter('new', '/me');
  if (p === '/enter/manager') return viewEnter('manager', '/admin');
  if (p === '/me') return gate(p, viewMe);
  if ((m = /^\/me\/report\/(\d{4}-\d{2}-\d{2})$/.exec(p))) { const wk = m[1]; return gate(p, () => viewReport(wk)); }
  if (p.startsWith('/lead')) return gateLead(p, () => viewLead(p));
  if (p.startsWith('/admin')) return isAdmin() ? viewAdmin(p) : redirect('/enter/manager');
  return h('section', { class: 'frame' }, h('h2', null, 'העמוד לא נמצא'), h('a', { class: 'btn', href: '#/', onclick: (e) => { e.preventDefault(); go('/'); } }, 'לדף הבית'));
}
function viewEducatorsOnly() {
  return h('section', { class: 'frame' }, h('h2', null, 'האזור הזה אישי לכל מחנכת'),
    h('p', { class: 'muted', style: 'max-width:56ch' }, 'השיחות האישיות והמיפוי נפתחים בכניסה של המחנכת, בקוד האישי שלה. מנהלת התכנית והמובילות רואות את המבטים במסכים שלהן, ואת תוכן המיפוי הן לא רואות.'),
    h('div', { class: 'row' }, isAdmin() ? link('/admin', 'למסך מנהלת התכנית') : link('/lead', 'למסך המובילה')));
}
function viewLeadsOnly() {
  return h('section', { class: 'frame' }, h('h2', null, 'האזור הזה למובילות זמן לחינוך'),
    h('p', { class: 'muted', style: 'max-width:56ch' }, 'בכל בית ספר יש מובילה, והיא רואה רק את הנתונים של בית הספר שלה. הכניסה בשם ובקוד אישי.'),
    h('div', { class: 'row' }, isAdmin() ? link('/admin/leads', 'לניהול המובילות') : link('/me', 'לשיחות האישיות שלי')));
}



function redirect(to) { setTimeout(() => go(to), 0); return h('section', { class: 'frame' }, h('p', null, 'מעבירים לדף הכניסה…')); }
const link = (to, text, cls = 'btn') => h('a', { class: cls, href: '#' + to, onclick: (e) => { e.preventDefault(); go(to); } }, text);


/* =====================================================================
   בית
   ===================================================================== */

function viewHome() {
  const staff = leadUser() || isAdmin();
  const hello = session ? `שלום ${firstName(session.name)}` : null;
  const actions = !session ? [link('/me', 'כניסה למחנכות', 'btn'), link('/tools', 'לארגז הכלים', 'btn soft')]
    : me() ? [link('/me', 'למבט השבועי', 'btn'), link('/mapping', 'למיפוי הכיתה', 'btn soft')]
      : [link(leadUser() ? '/lead' : '/admin', leadUser() ? 'למסך המובילה' : 'למסך מנהלת התכנית', 'btn'), link('/tools', 'לארגז הכלים', 'btn soft')];
  const hero = h('section', { class: 'frame hero' },
    h('p', { class: 'kicker' }, 'זמן לחינוך'),
    h('h1', null, hello || 'שיחות אישיות עם התלמידים'),
    h('p', { class: 'herosub' }, session ? (me() ? 'מה נעשה היום?' : 'ברוכים הבאים.') : 'כלים קצרים שעוזרים לתכנן שיחות אישיות ולהעמיק אותן.'),
    h('div', { class: 'row' }, actions));
  const tile = (to, icon, title, line, tag) => h('a', { class: 'folder tile', href: '#' + to, onclick: (e) => { e.preventDefault(); go(to); } },
    h('span', { class: 'ic-big' }, ic(icon, { size: 38, tone: 'blue' })), h('h3', null, title), h('p', { class: 'muted' }, line), h('span', { class: 'tag', style: 'align-self:flex-start' }, tag));
  const tiles = h('div', { class: 'grid tiles' },
    tile('/me', 'calendar', 'המבט השבועי', 'דקה בשבוע: איך היו השיחות?', 'למחנכות, בכניסה'),
    tile('/mapping', 'compass', 'מיפוי הכיתה', 'עם מי לשוחח, ומתי.', 'למחנכות, בכניסה'),
    tile('/tools/cards', 'idea', 'קלפי שיח', 'שאלות ותמונות לשיחה אישית.', 'פתוח לכולם'),
    tile('/tools', 'book', 'ארגז כלים', 'כלים ופרקטיקות לשיחות.', 'פתוח לכולם'));
  const who = pub.leadSeesNames ? 'מנהלת התכנית רואה את כל המבטים. מובילת בית הספר רואה רק את בית הספר שלה, כולל שמות והערות.' : 'מנהלת התכנית רואה את כל המבטים. מובילת בית הספר רואה רק נתונים מצטברים של בית הספר שלה, בלי שמות.';
  const more = h('section', { class: 'frame quiet' },
    h('details', null, h('summary', null, ic('lock', { size: 20 }), 'מה נשמר, ומי רואה?'),
      h('ul', { class: 'plain' },
        h('li', null, 'לא נשמרים שמות תלמידים ולא תיעוד על ילד או ילדה.'),
        h('li', null, 'בכל שבוע נשמר מספר השיחות, ולכל שיחה כמה בחירות קצרות והערה חופשית.'),
        h('li', null, 'מיפוי הכיתה נשאר במכשיר שלכם. מנהלת התכנית יודעת רק אם פתחתם אותו.'),
        h('li', null, who))),
    session ? null : h('details', null, h('summary', null, ic('question', { size: 20 }), 'פעם ראשונה? איך נכנסים'),
      h('ol', { class: 'plain' },
        h('li', null, 'לוחצים "כניסה למחנכות" ובוחרים "זו הפעם הראשונה שלי".'),
        h('li', null, 'מזינים את קוד ההצטרפות של בית הספר (מקבלים מהתכנית) ובוחרים קוד אישי בן ארבע ספרות.'),
        h('li', null, 'מכאן נכנסים עם בית ספר, שם והקוד. אותו קוד פותח גם את מיפוי הכיתה.'))));
  return h('div', { class: 'stack', style: 'gap:var(--gap)' }, hero, tiles, more,
    staff ? null : h('p', { class: 'small muted', style: 'text-align:center' }, 'מובילה או מנהלת התכנית? ', h('a', { href: '#/lead', onclick: (e) => { e.preventDefault(); go('/lead'); } }, 'כניסת צוות')));
}



/* =====================================================================
   ארגז כלים (פתוח לכולם)
   ===================================================================== */
function viewTools() {
  const count = (id) => pub.tools.filter((t) => t.folder === id && !t.example).length + (id === 'identity' ? IDENTITY_TOOLS.length : 0);
  return h('div', { class: 'stack', style: 'gap:var(--gap)' },
    h('section', { class: 'frame' }, h('h2', null, 'ארגז כלים'), h('p', { class: 'muted', style: 'max-width:60ch' }, 'כלים ופרקטיקות לשיחות אישיות. פתוח לכולם, בלי כניסה. התכנים יתווספו כאן לאורך השנה.')),
    h('a', { class: 'frame cardsfeature', href: '#/tools/cards', onclick: (e) => { e.preventDefault(); go('/tools/cards'); } },
      h('img', { src: 'cards/t05.webp', alt: '', loading: 'lazy' }),
      h('div', { class: 'stack' }, h('span', { class: 'tag lead', style: 'align-self:flex-start' }, 'חדש'), h('h3', null, 'קלפי שיח וקשר אישי'), h('p', { class: 'muted' }, `${((window.ZMAN_CARDS || {}).cards || []).length || 63} קלפים עם שאלה בצד אחד ותמונה בצד השני: לפי נושא, דרך תמונה, קלף מעורבב או לפי עומק וסוג השיחה. עובד גם בטלפון, בשיחה אישית.`), h('span', { class: 'btn', style: 'align-self:flex-start' }, 'לפתיחת הקלפים'))),
    h('div', { class: 'grid' }, FOLDERS.map((f) => h('a', { class: 'folder', href: '#/tools/' + f.id, onclick: (e) => { e.preventDefault(); go('/tools/' + f.id); } },
      h('span', { class: 'ic-big' }, ic(f.icon, { size: 38, tone: 'blue' })), h('h3', null, f.t), h('p', { class: 'muted' }, f.d),
      h('span', { class: 'tag', style: 'align-self:flex-start' }, `${count(f.id)} כלים`)))));
}

function viewFolder(id) {
  const f = FOLDERS.find((x) => x.id === id);
  const back = link('/tools', 'ארגז כלים', 'btn ghost');
  const items = pub.tools.filter((t) => t.folder === id);
  const builtin = id === 'identity' ? IDENTITY_TOOLS.map(identityTile) : [];
  const list = builtin.length || items.length ? [...builtin, ...items.filter((t) => !builtin.length || !t.example).map(toolCard)] : [h('div', { class: 'frame' }, h('p', { class: 'muted' }, 'הכלים והפרקטיקות בציר הזה יתווספו כאן.'))];
  return h('div', { class: 'stack', style: 'gap:var(--gap)' },
    h('section', { class: 'frame' }, h('div', null, back), h('div', { class: 'row' }, ic(f.icon, { size: 44, tone: 'blue' }), h('h2', null, f.t)), h('p', { class: 'muted' }, f.d)),
    h('div', { class: 'grid' }, list),
    isAdmin() ? h('div', null, link('/admin/tools', 'הוספה ועריכה של כלים', 'btn soft')) : null);
}
function toolCard(t) {
  return h('article', { class: 'frame tool' + (t.example ? ' example' : '') },
    h('div', { class: 'row' }, h('span', { class: 'tag lead' }, t.type || 'כלי'), t.example ? h('span', { class: 'tag' }, 'דוגמה לתצוגה') : null),
    h('h3', null, t.title), h('p', { class: 'muted' }, t.desc),
    t.url ? h('div', null, h('a', { class: 'btn sm', href: t.url, target: '_blank', rel: 'noopener' }, 'פתיחה')) : null);
}

/* =====================================================================
   זהות וחוזקות: שני כלים. "להקשיב לכוחות" (למחנכת) ו"יש בי יותר ממה שרואים" (שיחה משותפת)
   התוכן ב-js/identity-data.js. שום דבר לא נשלח לשרת ולא נשמר: הכול נשאר על המסך.
   ===================================================================== */
const IDT = () => window.ZMAN_IDENTITY;
const IDENTITY_TOOLS = [
  { to: '/tools/identity/listen', icon: 'eye', t: 'להקשיב לכוחות', who: 'למחנכת', d: 'ארבע עדשות להקשבה לסיפור של התלמיד/ה, וארבעה שלבים לשיקוף חוזקה בלי לתייג.' },
  { to: '/tools/identity/cards', icon: 'care', t: 'יש בי יותר ממה שרואים', who: 'שיחה משותפת', d: 'התלמיד/ה בוחר/ת קלף ומספר/ת סיפור, והמחנכת מציעה חוזקות. התלמיד/ה מסכימ/ה, מדייק/ת או דוחה.' },
];
function identityTile(x) {
  return h('a', { class: 'folder tile idtool', href: '#' + x.to, onclick: (e) => { e.preventDefault(); go(x.to); } },
    h('span', { class: 'ic-big' }, ic(x.icon, { size: 38, tone: 'blue' })),
    h('div', { class: 'row', style: 'gap:8px' }, h('span', { class: 'tag lead' }, x.who), h('span', { class: 'tag' }, 'בלי תיעוד')),
    h('h3', null, x.t), h('p', { class: 'muted' }, x.d), h('span', { class: 'btn sm', style: 'align-self:flex-start' }, 'לפתיחה'));
}
function idHead(title, sub) {
  return h('section', { class: 'frame' }, h('div', null, link('/tools/identity', 'זהות וחוזקות', 'btn ghost sm')), h('h2', null, title), sub ? h('p', { class: 'muted', style: 'max-width:62ch' }, sub) : null);
}

/* ---------- כלי 1: להקשיב לכוחות ---------- */
let listenTab = 'lenses', listenLens = null, listenEx = 0, listenStep = 1;
const LISTEN_NEXT = ['', 'מה אפשר לשמוע כאן?', 'איזו שאלת בירור היית שואלת?', 'מה התלמיד/ה עשוי/ה לענות?', 'איך היית משקפת?', 'ואיך מרחיבים, אם מתאים?'];
function viewListen() {
  const D = IDT().listen;
  const host = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  const TABS = [['lenses', 'ארבע עדשות'], ['flow', 'מהקשבה לשיקוף'], ['examples', 'דוגמאות חיות']];
  const lenses = () => h('section', { class: 'frame' },
    h('div', { class: 'stack', style: 'gap:6px' }, h('h3', null, 'ארבע עדשות להקשבה'), h('p', { class: 'muted' }, 'בכל שיחה אפשר להקשיב דרך עדשה אחת או יותר. מקישים על עדשה כדי לראות למה להקשיב ואילו שאלות אפשר לשאול.')),
    h('div', { class: 'lensgrid' }, D.lenses.map((l, i) => {
      const open = listenLens === l.id;
      return h('div', { class: 'lens', 'data-open': String(open) },
        h('button', { class: 'lenshead', type: 'button', 'aria-expanded': String(open), onclick: () => { listenLens = open ? null : l.id; paint(); } },
          h('span', { class: 'lensnum', 'aria-hidden': 'true' }, String(i + 1)), h('span', { class: 'stack', style: 'gap:4px' }, h('b', { class: 'lenstitle' }, l.title), h('span', { class: 'muted' }, l.prompt))),
        open ? h('div', { class: 'lensbody' },
          h('div', { class: 'stack', style: 'gap:8px' }, h('h4', null, 'רמזים להקשבה'), h('div', { class: 'row', style: 'gap:8px' }, l.signals.map((s) => h('span', { class: 'tag' }, s)))),
          h('div', { class: 'stack', style: 'gap:8px' }, h('h4', null, 'שאלות שאפשר לשאול'), l.examples.map((q) => h('p', { class: 'qquote' }, q)))) : null);
    })),
    h('p', { class: 'small muted' }, 'לא כל שיחה צריכה להסתיים בחוזקה. לפעמים הקשבה בלבד היא הדבר הנכון.'));
  const flow = () => h('section', { class: 'frame' },
    h('div', { class: 'stack', style: 'gap:6px' }, h('h3', null, 'מהקשבה לשיקוף'), h('p', { class: 'muted', style: 'max-width:60ch' }, 'זה רצף אפשרי, לא טופס חובה. אפשר להישאר בשלב ההקשבה אם זה מה שהתלמיד/ה צריך/ה, ואין חובה להגיע להרחבה.')),
    h('ol', { class: 'flow' }, D.flow.map((s, i) => h('li', { class: 'flowstep' },
      h('span', { class: 'flowdot', 'aria-hidden': 'true' }, String(i + 1)),
      h('div', { class: 'stack', style: 'gap:8px' },
        h('div', { class: 'row', style: 'gap:10px' }, h('h3', null, s.micro), h('span', { class: 'tag lead' }, s.title)),
        h('p', null, s.instruction),
        h('p', { class: 'qquote' }, h('small', { class: 'qlab' }, 'דוגמה'), s.example))))));
  const examples = () => {
    const e = D.examples[listenEx];
    const msgs = [
      { k: 'st', label: 'התלמיד/ה מספר/ת', text: e.story },
      { k: 'hint' },
      { k: 'ed', label: 'שאלת בירור', text: e.ask },
      { k: 'st', label: 'התלמיד/ה עונה', text: e.reply },
      { k: 'ed', label: 'שיקוף', text: e.reflect },
      { k: 'ed', label: 'הרחבה, אם מתאים', text: e.extend },
    ];
    const shown = msgs.slice(0, listenStep);
    const done = listenStep >= msgs.length;
    const bubbles = shown.map((m, i) => {
      const fresh = i === shown.length - 1 && i > 0 ? ' msg-in' : '';
      if (m.k === 'hint') return h('div', { class: 'hintbox' + fresh }, h('b', null, 'מה אפשר לשמוע כאן? השערות, לא קביעות'), h('div', { class: 'row', style: 'gap:8px' }, e.hints.map((x) => h('span', { class: 'tag' }, x))));
      return h('div', { class: 'msg ' + m.k + fresh }, h('small', null, m.label), h('div', { class: 'mb' }, m.text));
    });
    const controls = h('div', { class: 'row' });
    if (done) add(controls, [h('span', { class: 'tag' }, 'זה סוף הדוגמה')]);
    else add(controls, [h('span', { class: 'muted small' }, LISTEN_NEXT[listenStep]),
      h('button', { class: 'btn', type: 'button', onclick: () => { listenStep++; paint(); } }, 'הצעד הבא'),
      h('button', { class: 'btn soft sm', type: 'button', onclick: () => { listenStep = msgs.length; paint(); } }, 'הצגת הכול')]);
    if (listenStep > 1) add(controls, [h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { listenStep = 1; paint(); } }, 'מההתחלה')]);
    return h('section', { class: 'frame' },
      h('div', { class: 'stack', style: 'gap:6px' }, h('h3', null, 'דוגמאות חיות'), h('p', { class: 'muted', style: 'max-width:60ch' }, 'בוחרות נושא ועוברות על השיחה צעד אחר צעד. לפני שמקישים "הצעד הבא", כדאי לחשוב מה היית עושה. הדוגמאות אינן תסריט.')),
      chipGroup({ options: D.examples.map((x, i) => ({ v: i, t: x.category })), value: listenEx, label: 'נושא הדוגמה', onChange: (v) => { listenEx = v; listenStep = 1; paint(); } }),
      h('div', { class: 'idchat', 'aria-live': 'polite' }, bubbles),
      controls,
      h('p', { class: 'small muted' }, 'חוזקות מוצגות כהשערות ולא כאבחנות: התלמיד/ה יכול/ה לדייק או לדחות.'));
  };
  const principles = h('section', { class: 'frame quiet' }, h('details', null, h('summary', null, ic('insight', { size: 20 }), 'עקרונות להקשבה'),
    h('ul', { class: 'plain' },
      h('li', null, 'לא מחפשות חוזקה בכוח בכל סיפור. לפעמים הקשבה בלבד היא הדבר הנכון.'),
      h('li', null, 'לא הופכות קושי לחוזקה באופן אוטומטי.'),
      h('li', null, 'לא מייחסות לתלמיד/ה תכונה על סמך אירוע אחד.'),
      h('li', null, 'שיקוף טוב מתחיל בהתנהגות שנצפתה ולא בתווית אישיות.'),
      h('li', null, 'התלמיד/ה שותפ/ה לפרשנות, ויכול/ה לדחות או לשנות אותה.'))));
  function paint() {
    clear(host);
    const body = { lenses, flow, examples }[listenTab]();
    add(host, [
      idHead('להקשיב לכוחות', 'תזכורת קצרה למחנכת, בכל שיחה אישית, גם כשהנושא אינו חוזקות. אין מה למלא ואין תיעוד: זה כלי להקשבה.'),
      h('div', { class: 'idtabs', role: 'tablist', 'aria-label': 'חלקי הכלי' }, TABS.map(([id, t]) => h('button', { class: 'idtab', type: 'button', role: 'tab', 'aria-selected': String(listenTab === id), onclick: () => { listenTab = id; paint(); } }, t))),
      body, principles]);
  }
  paint();
  return host;
}

/* ---------- כלי 2: יש בי יותר ממה שרואים ---------- */
let sc = null; // מצב השיחה: חי רק כל עוד נשארים בכלי, ולא נשמר בשום מקום
const scFresh = () => ({ step: 1, q: null, offered: [], resp: {}, own: [], ownText: '' });
const SC_MAX = 3;
const SC_STEPS = ['קלף שאלה', 'הסיפור', 'חוזקות', 'סיכום'];
const SC_RESP = [{ v: 'yes', t: 'מתאים' }, { v: 'close', t: 'קרוב, לא בדיוק' }, { v: 'no', t: 'לא מתאים' }];
function viewStrengthCards() {
  const D = IDT().cards;
  const L = IDT().listen.lenses;
  if (!sc) sc = scFresh();
  const host = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  const strength = (id) => D.strengths.find((s) => s.id === id);
  const go2 = (step) => { sc.step = step; paint(); window.scrollTo(0, 0); };
  const restart = () => { sc = scFresh(); paint(); window.scrollTo(0, 0); };
  const progress = () => h('ol', { class: 'idprog', 'aria-label': 'שלבי השיחה' }, SC_STEPS.map((t, i) => h('li', { class: i + 1 < sc.step ? 'done' : i + 1 === sc.step ? 'cur' : '', 'aria-current': i + 1 === sc.step ? 'step' : null }, `${i + 1}. ${t}`)));

  // 1. בוחרים קלף שאלה
  const stepPick = () => {
    const choose = (q) => { sc.q = q; go2(2); };
    return h('section', { class: 'frame' },
      h('div', { class: 'stack', style: 'gap:6px' }, h('h3', null, 'בוחרים קלף שאלה'), h('p', { class: 'muted', style: 'max-width:60ch' }, 'התלמיד/ה בוחר/ת קלף אחד שיש לו/ה על מה לספר. אין תשובה נכונה, ואפשר תמיד להחליף.')),
      h('div', { class: 'qcards' }, D.questions.map((q) => h('button', { class: 'qcard', type: 'button', onclick: () => choose(q) }, h('span', null, q.title)))),
      h('div', { class: 'row' }, h('button', { class: 'btn soft', type: 'button', onclick: () => choose(D.questions[Math.floor(Math.random() * D.questions.length)]) }, 'קלף מעורבב'), h('span', { class: 'small muted' }, 'כשקשה להחליט.')));
  };

  // 2. הסיפור
  const stepStory = () => h('section', { class: 'frame' },
    h('div', { class: 'storycard' }, h('p', { class: 'qlab' }, 'הקלף שנבחר'), h('p', { class: 'storyq' }, sc.q.title), h('p', { class: 'storyf' }, h('small', null, 'שאלת המשך: '), sc.q.follow)),
    h('div', { class: 'grid' },
      h('div', { class: 'well stack', style: 'gap:6px' }, h('h4', null, 'התלמיד/ה'), h('p', null, 'מספר/ת בחופשיות, כמה שבא לו/ה. אפשר לדלג על חלקים.')),
      h('div', { class: 'well stack', style: 'gap:6px' }, h('h4', null, 'המחנכת'), h('p', null, 'מקשיבה, שואלת שאלות המשך, ועוד לא נותנת שם. השם בא בשלב הבא.'))),
    h('details', { class: 'idlens' }, h('summary', null, 'תזכורת: שאלות המשך לפי ארבע עדשות'),
      h('div', { class: 'grid', style: 'margin-top:12px' }, L.map((l) => h('div', { class: 'well stack', style: 'gap:6px' }, h('h4', null, l.title), h('p', { class: 'small' }, l.examples[0]))))),
    h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'button', onclick: () => go2(3) }, 'סיימנו לספר: לחוזקות'),
      h('button', { class: 'btn soft', type: 'button', onclick: () => go2(4) }, 'לסיים בלי חוזקות'),
      h('button', { class: 'btn ghost', type: 'button', onclick: () => go2(1) }, 'החלפת קלף')),
    h('p', { class: 'small muted' }, 'לא כל שיחה צריכה להסתיים בחוזקה. הסיפור לבדו שווה את הזמן.'));

  // 3. המחנכת מציעה חוזקות כהשערות
  const stepOffer = () => {
    const search = h('input', { class: 'input', type: 'search', placeholder: 'חיפוש חוזקה', 'aria-label': 'חיפוש חוזקה' });
    const counter = h('p', { class: 'tag lead', 'aria-live': 'polite' });
    const next = h('button', { class: 'btn', type: 'button', onclick: () => go2(4) });
    const els = D.strengths.map((s) => {
      const b = h('button', { class: 'scard', type: 'button', onclick: () => {
        const i = sc.offered.indexOf(s.id);
        if (i >= 0) sc.offered.splice(i, 1);
        else if (sc.offered.length < SC_MAX) sc.offered.push(s.id);
        sync();
      } }, h('b', null, s.name), h('span', null, s.desc));
      return { s, b };
    });
    const empty = h('p', { class: 'muted', hidden: true }, 'לא נמצאה חוזקה בשם הזה. אפשר לנסות מילה אחרת.');
    function sync() {
      const full = sc.offered.length >= SC_MAX;
      els.forEach(({ s, b }) => {
        const on = sc.offered.includes(s.id);
        b.setAttribute('aria-pressed', String(on));
        b.setAttribute('aria-disabled', String(full && !on));
      });
      counter.textContent = `הוצעו ${sc.offered.length} מתוך ${SC_MAX}`;
      next.textContent = sc.offered.length ? 'להמשך: מה מתאים לתלמיד/ה?' : 'להמשיך בלי להציע';
    }
    search.addEventListener('input', () => {
      const q = search.value.trim();
      let any = false;
      els.forEach(({ s, b }) => { const ok = !q || (s.name + ' ' + s.desc).includes(q); b.hidden = !ok; if (ok) any = true; });
      empty.hidden = any;
    });
    sync();
    return h('section', { class: 'frame' },
      h('div', { class: 'stack', style: 'gap:6px' }, h('h3', null, 'המחנכת מציעה חוזקות, כהשערות'), h('p', { class: 'muted', style: 'max-width:62ch' }, `בוחרות עד ${SC_MAX} קלפים שנשמעו בסיפור, ואחר כך שואלות את התלמיד/ה אם הם מתאימים. מתחילות ממה שנעשה בסיפור. אין חובה לבחור.`)),
      h('div', { class: 'row between' }, h('div', { style: 'flex:1 1 220px;max-width:340px' }, search), counter),
      h('div', { class: 'scards' }, els.map((x) => x.b)), empty,
      h('div', { class: 'row' }, next, h('button', { class: 'btn ghost', type: 'button', onclick: () => go2(2) }, 'חזרה לסיפור')));
  };

  // 4. תגובת התלמיד/ה וסיכום
  const stepSummary = () => {
    const sumBox = h('div', { class: 'grid', 'aria-live': 'polite' });
    const sumUpdate = () => {
      const chosen = [...sc.offered.filter((id) => sc.resp[id] === 'yes' || sc.resp[id] === 'close').map((id) => ({ t: strength(id).name, n: sc.resp[id] === 'close' ? 'קרוב, לא בדיוק' : '' })),
        ...sc.own.map((id) => ({ t: strength(id).name, n: 'בחירה של התלמיד/ה' })), ...(sc.ownText.trim() ? [{ t: sc.ownText.trim(), n: 'במילים של התלמיד/ה' }] : [])];
      const label = { yes: 'מתאים', close: 'קרוב, לא בדיוק', no: 'התלמיד/ה לא הסכימ/ה' };
      clear(sumBox);
      add(sumBox, [
        h('div', { class: 'well stack', style: 'gap:8px' }, h('h4', null, 'מה התלמיד/ה בחר/ה?'),
          chosen.length ? h('ul', { class: 'sumlist' }, chosen.map((c) => h('li', null, h('b', null, c.t), c.n ? h('small', null, c.n) : null))) : h('p', { class: 'muted small' }, 'עדיין לא נבחרה חוזקה. וזה בסדר גמור.')),
        h('div', { class: 'well stack', style: 'gap:8px' }, h('h4', null, 'מה המחנכת הציעה?'),
          sc.offered.length ? h('ul', { class: 'sumlist' }, sc.offered.map((id) => h('li', null, h('b', null, strength(id).name), h('small', null, label[sc.resp[id]] || 'עדיין בלי תגובה')))) : h('p', { class: 'muted small' }, 'לא הוצעו חוזקות.'))]);
    };
    const offeredBlock = sc.offered.length
      ? h('div', { class: 'stack' }, sc.offered.map((id) => {
        const s = strength(id);
        return h('div', { class: 'respcard' }, h('div', { class: 'stack', style: 'gap:2px' }, h('b', { style: 'font-size:20px' }, s.name), h('span', { class: 'muted' }, s.desc)),
          h('div', { class: 'stack', style: 'gap:6px' }, h('span', { class: 'small muted' }, 'מה התלמיד/ה אומר/ת?'),
            chipGroup({ options: SC_RESP, value: sc.resp[id], cls: 'sm', label: `תגובה לחוזקה ${s.name}`, onChange: (v) => { sc.resp[id] = v; sumUpdate(); } })));
      }))
      : h('p', { class: 'muted' }, 'לא הוצעו חוזקות, ואפשר גם להסתפק בסיפור. אם התלמיד/ה רוצה לומר מה הוא/היא רואה בעצמו/ה, אפשר לבחור למטה.');
    const pills = D.strengths.filter((s) => !sc.offered.includes(s.id)).map((s) => {
      const b = h('button', { class: 'pillbtn', type: 'button', 'aria-pressed': String(sc.own.includes(s.id)), title: s.desc, onclick: () => {
        const i = sc.own.indexOf(s.id);
        if (i >= 0) sc.own.splice(i, 1); else if (sc.own.length < SC_MAX) sc.own.push(s.id); else return;
        b.setAttribute('aria-pressed', String(sc.own.includes(s.id))); sumUpdate();
      } }, s.name);
      return b;
    });
    const ownText = h('input', { class: 'input', type: 'text', maxlength: '60', placeholder: 'חוזקה במילים של התלמיד/ה', 'aria-label': 'חוזקה במילים של התלמיד/ה', value: sc.ownText });
    ownText.addEventListener('input', () => { sc.ownText = ownText.value; sumUpdate(); });
    sumUpdate();
    return h('section', { class: 'frame' },
      h('div', { class: 'stack', style: 'gap:6px' }, h('h3', null, 'מה מתאים לתלמיד/ה?'), h('p', { class: 'muted', style: 'max-width:62ch' }, 'התלמיד/ה מחליט/ה. אפשר להסכים, לדייק, לדחות, או להציע חוזקה אחרת.')),
      offeredBlock,
      h('details', { class: 'idlens', open: sc.own.length > 0 || !sc.offered.length }, h('summary', null, 'התלמיד/ה מציע/ה חוזקה אחרת'),
        h('div', { class: 'stack', style: 'margin-top:12px' }, h('p', { class: 'small muted' }, `אפשר לבחור עד ${SC_MAX} קלפים.`), h('div', { class: 'row', style: 'gap:8px' }, pills), ownText)),
      h('div', { class: 'stack', style: 'gap:10px' }, h('h3', null, 'סיכום אופציונלי'), sumBox,
        h('p', { class: 'privnote small' }, ic('lock', { size: 18 }), ' הסיכום מוצג רק על המסך הזה. הוא לא נשמר: לא בשרת, לא בדפדפן ולא בפרופיל, ונעלם כשיוצאים מהכלי. אם התלמיד/ה מסכימ/ה, אפשר לרשום אותו במחברת.')),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: restart }, 'שיחה חדשה, קלף אחר'), h('button', { class: 'btn soft', type: 'button', onclick: () => go2(sc.offered.length ? 3 : 2) }, 'חזרה'), link('/tools/identity', 'לסיום', 'btn ghost')));
  };

  function paint() {
    clear(host);
    add(host, [idHead('יש בי יותר ממה שרואים', 'שיחה אישית משותפת: סיפור קצר, ואחריו שם לכוחות שנראים בו, בלי תיוג מלמעלה. כל התהליך נשאר על המסך, בלי תיעוד.'),
      progress(), [stepPick, stepStory, stepOffer, stepSummary][sc.step - 1]()]);
  }
  paint();
  return host;
}

/* =====================================================================
   קלפי שיח וקשר אישי (כלי בארגז הכלים, פתוח לכולם)
   מסך פתיחה שבו בוחרים דרך עבודה: לפי נושא, דרך תמונה, קלף מעורבב, לפי עומק השיחה, או דפדוף בכל הקלפים.
   בכל קלף: שאלה בצד אחד, תמונה בצד השני. הקלפים נשארים בדפדפן, ושום דבר לא נשלח או נשמר.
   ===================================================================== */
let cardsMutual = false, cardsWakeWanted = false, cardsWakeLock = null;
let cardsFull = true;   // העדפה: קלפים נפתחים במסך מלא (אפשר לכבות בכפתור "יציאה ממסך מלא")
let cardsRot = false, cardsLocked = false, cardsContain = false, cardsChromeOff = false, cardsHinted = false;
const CARDS_IMMERSIVE = (sub) => /^(topic\/|pictures$|random$|depth\/|type\/)/.test(sub);
// ימינה/שמאלה בהחלקה: כשהמסך מסובב בעזרת CSS, כיוון ההחלקה מתחלף לציר האנכי
const cAxisY = () => cardsRot && !!document.querySelector('.cardsview.rot');
function cardsApply() { // מעדכן את המסך הנוכחי בלי לבנות אותו מחדש (כדי לא לערבב קלפים)
  const v = document.querySelector('.cardsview');
  if (!v) return;
  const on = cardsFull && v.classList.contains('imm');
  v.classList.toggle('full', on); v.classList.toggle('rot', on && cardsRot); v.classList.toggle('contain', cardsContain); v.classList.toggle('nochrome', on && cardsChromeOff);
  document.body.classList.toggle('cards-full', on);
  document.querySelectorAll('.fsbtn').forEach((b) => { b.textContent = cardsFull ? 'יציאה ממסך מלא' : 'מסך מלא'; });
  document.querySelectorAll('.rotbtn').forEach((b) => { b.textContent = cardsRot || cardsLocked ? 'חזרה לאורך' : 'סיבוב לרוחב'; });
  document.querySelectorAll('.fitbtn').forEach((b) => { b.textContent = cardsContain ? 'תמונה ממלאת' : 'תמונה שלמה'; });
}
function cardsSetChrome(show) { cardsChromeOff = !show; cardsApply(); }
// הקשה על הקלף במסך מלא: הסרגלים נעלמים ונשאר רק הקלף. כשהם מוסתרים, הקשה הופכת את הקלף, ונקודה קטנה בפינה מחזירה אותם.
function cardTap(flip) {
  const v = document.querySelector('.cardsview.full');
  if (v && !cardsChromeOff) cardsSetChrome(false); else flip();
}
function cardsNative(on) { // מסך מלא של הדפדפן (מסתיר סרגלים). לא נתמך בכל מכשיר, ואז נשארים עם מסך מלא בתוך האתר
  try {
    if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch { /* ממשיכים */ }
}
function cardsUnlockRot() { cardsRot = false; if (cardsLocked) { cardsLocked = false; try { screen.orientation.unlock(); } catch { /* לא נתמך */ } } }
function cardsSetFull(on) {
  cardsFull = on;
  if (!on) cardsUnlockRot();
  cardsApply(); cardsNative(on);
  cardsWakeWanted = on; cardsSetWake(on);
}
async function cardsToggleRot() {
  if (cardsRot || cardsLocked) { cardsUnlockRot(); cardsApply(); return; }
  try { await screen.orientation.lock('landscape'); cardsLocked = true; } catch { cardsRot = true; } // אם אי אפשר לנעול, מסובבים את התצוגה בעצמנו
  cardsApply();
}
// יציאה מכל מסכי הקלפים (או מעבר למסך תפריט): משחררים מסך מלא, נעילת סיבוב ומסך דלוק
function cardsLeave() {
  document.body.classList.remove('cards-full'); cardsChromeOff = false;
  cardsNative(false); cardsUnlockRot();
  if (cardsWakeLock) cardsSetWake(false);
}
const cardsFsButton = () => h('button', { class: 'btn soft sm fsbtn', type: 'button', onclick: () => cardsSetFull(!cardsFull) }, cardsFull ? 'יציאה ממסך מלא' : 'מסך מלא');
const cardsHideButton = () => h('button', { class: 'btn soft sm hidebtn', type: 'button', onclick: () => cardsSetChrome(false) }, 'הסתרת סרגל');
const cardsRotButton = () => h('button', { class: 'btn soft sm rotbtn', type: 'button', onclick: cardsToggleRot }, cardsRot || cardsLocked ? 'חזרה לאורך' : 'סיבוב לרוחב');
const cardsFitButton = () => h('button', { class: 'btn soft sm fitbtn', type: 'button', onclick: () => { cardsContain = !cardsContain; cardsApply(); } }, cardsContain ? 'תמונה ממלאת' : 'תמונה שלמה');
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && cardsFull && document.body.classList.contains('cards-full')) { cardsFull = false; cardsUnlockRot(); cardsApply(); } });
const cardsData = () => window.ZMAN_CARDS || { categories: [], cards: [] };
const cPad = (n) => String(n).padStart(2, '0');
const cImg = (c) => `cards/c${cPad(c.p || c.n)}.webp`;
const cThumb = (c) => `cards/t${cPad(c.p || c.n)}.webp`;
const cCat = (id) => (cardsData().categories.find((x) => x.id === id) || {}).t || '';
const cShuffle = (a) => { const r = a.slice(); for (let k = r.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [r[k], r[j]] = [r[j], r[k]]; } return r; };
const DEPTHS = [
  { n: 1, t: 'היכרות קלילה', d: 'לשיחות ראשונות ולקשר שרק מתחיל. שאלות קלות, בלי לחץ.', link: 'קשר 1 · כמעט לא מכירים' },
  { n: 2, t: 'להעמיק', d: 'כשכבר יש היכרות ובסיס. שאלות על מה שחשוב, מרגש ומשפיע.', link: 'קשר 2 · מכירים את הבסיס' },
  { n: 3, t: 'שיחה מעמיקה', d: 'כשיש אמון. שאלות כנות על ההרגשה, על הבית ועל מה שלא תמיד אומרים.', link: 'קשר 3 · קשר ושיח פתוח' },
];

async function cardsSetWake(on) {
  try {
    if (on && navigator.wakeLock && !cardsWakeLock) { cardsWakeLock = await navigator.wakeLock.request('screen'); cardsWakeLock.addEventListener('release', () => { cardsWakeLock = null; }); }
    else if (!on && cardsWakeLock) { await cardsWakeLock.release(); cardsWakeLock = null; }
  } catch { cardsWakeLock = null; toast('הדפדפן לא אפשר להשאיר את המסך דלוק'); }
}
// המסך חוזר לדלוק אחרי מעבר לאפליקציה אחרת וחזרה
document.addEventListener('visibilitychange', () => { if (cardsWakeWanted && document.visibilityState === 'visible' && !cardsWakeLock && route().startsWith('/tools/cards')) cardsSetWake(true); });

// קלף אחד שמסתובב: שאלה בצד אחד, תמונה בצד השני. covered = גב סגור שצריך להקיש כדי למשוך את הקלף.
function cFlipper() {
  const front = h('div', { class: 'cardface qface' }), back = h('div', { class: 'cardface imgface' });
  const cover = h('div', { class: 'cardcover', hidden: true }, h('span', { class: 'covermark' }, 'זמן לחינוך'), h('span', null, 'הקישו כדי למשוך קלף'));
  const el = h('div', { class: 'cardflipper', role: 'button', tabindex: '0', 'aria-label': 'הפיכת הקלף' }, h('div', { class: 'cardinner' }, front, back), cover);
  const api = {
    el, flipped: false, covered: false,
    set(c, flipped, covered = false) {
      clear(front); clear(back);
      front.append(h('p', { class: 'cardq' }, c.q), h('span', { class: 'cardcat' }, cCat(c.cat)));
      back.append(h('img', { src: cImg(c), alt: 'תמונה לשיחה', draggable: 'false' }));
      api.flipped = flipped; api.covered = covered;
      el.classList.toggle('flipped', flipped); cover.hidden = !covered;
      el.setAttribute('aria-label', covered ? 'משיכת קלף' : 'הפיכת הקלף');
    },
    flip(to) {
      if (api.covered) { api.covered = false; cover.hidden = true; el.setAttribute('aria-label', 'הפיכת הקלף'); return; }
      api.flipped = to === undefined ? !api.flipped : to;
      el.classList.toggle('flipped', api.flipped);
    },
  };
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); api.flip(); } });
  return api;
}
// הערה למצב הדדי, מסך דלוק ומסך מלא: משותפים לכל הדרכים
function cardsExtras(stage) {
  const note = h('p', { class: 'cardnote', hidden: !cardsMutual }, 'עונים שניכם: קודם התלמיד/ה, ואחר כך המחנך/ת.');
  const row = h('div', { class: 'row cardextras' },
    h('label', { class: 'row small', style: 'gap:8px' }, h('input', { type: 'checkbox', checked: cardsMutual, onchange: (e) => { cardsMutual = e.target.checked; note.hidden = !cardsMutual; } }), 'שיחה הדדית: גם המחנך/ת עונה'),
    navigator.wakeLock && navigator.wakeLock.request ? h('label', { class: 'row small', style: 'gap:8px' }, h('input', { type: 'checkbox', checked: cardsWakeWanted, onchange: (e) => { cardsWakeWanted = e.target.checked; cardsSetWake(cardsWakeWanted); } }), 'לא לכבות את המסך') : null,
    null);
  return [note, row];
}
function cardsHeader(title, sub, back = ['/tools/cards', 'בחירת דרך אחרת']) {
  return h('section', { class: 'frame cardhead' }, h('div', { class: 'row between' }, h('h2', null, title), h('div', { class: 'row' }, cardsHideButton(), cardsFsButton(), cardsRotButton(), cardsFitButton(), link(back[0], back[1], 'btn ghost sm'))), sub ? h('p', { class: 'muted small', style: 'max-width:62ch' }, sub) : null);
}

// חפיסה שמחליקים בה: ימינה = הקלף הבא (כמו דפדוף בעברית), הקשה = הפיכה
function cardDeck({ list, first = 'q', cover = false, start = 0, label = '', onIndex }) {
  const n = list.length; let i = start;
  const fl = cFlipper();
  const counter = h('p', { class: 'small muted cardcount', 'aria-live': 'polite' });
  const anim = h('div', { class: 'cardanim' }, fl.el);
  const slider = h('div', { class: 'cardslider' }, anim);
  function render(dir) {
    fl.set(list[i], first === 'img', cover);
    counter.textContent = `${label}קלף ${i + 1} מתוך ${n}`;
    [1, -1].forEach((d) => { new Image().src = cImg(list[(i + d + n) % n]); });
    if (dir) { anim.classList.remove('in-next', 'in-prev'); void anim.offsetWidth; anim.classList.add(dir > 0 ? 'in-next' : 'in-prev'); }
    if (onIndex) onIndex(i);
  }
  const go = (d) => { i = (i + d + n) % n; render(d); };
  let drag = null, swallowClick = false;
  slider.addEventListener('pointerdown', (e) => { if (e.button) return; drag = { x: e.clientX, y: e.clientY, dx: 0, moved: false }; try { slider.setPointerCapture(e.pointerId); } catch { /* ממשיכים בלי לכידה */ } });
  slider.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag.dx = cAxisY() ? e.clientY - drag.y : e.clientX - drag.x;
    if (Math.abs(drag.dx) > 8) drag.moved = true;
    if (drag.moved) { slider.classList.add('dragging'); slider.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx / 50}deg)`; }
  });
  const end = (e) => {
    if (!drag) return;
    const d = drag; drag = null;
    slider.classList.remove('dragging'); slider.style.transform = '';
    if (e.type === 'pointercancel') return;
    if (d.moved) { swallowClick = true; setTimeout(() => { swallowClick = false; }, 0); if (Math.abs(d.dx) > 70) go(d.dx > 0 ? 1 : -1); }
  };
  slider.addEventListener('pointerup', end); slider.addEventListener('pointercancel', end);
  fl.el.addEventListener('click', () => { if (!swallowClick) cardTap(() => fl.flip()); });
  const onKey = (e) => {
    if (!slider.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName || '')) return;
    if (e.key === 'ArrowLeft') go(1); else if (e.key === 'ArrowRight') go(-1);
  };
  document.addEventListener('keydown', onKey);
  const stage = h('section', { class: 'frame cardstage' }, slider, counter,
    h('div', { class: 'row cardbtns' },
      h('button', { class: 'btn soft', type: 'button', onclick: () => go(-1) }, 'הקודם →'),
      h('button', { class: 'btn', type: 'button', onclick: () => fl.flip() }, cover ? 'משיכה והפיכה' : 'הפיכת הקלף'),
      h('button', { class: 'btn soft', type: 'button', onclick: () => go(1) }, '← הבא')),
    h('p', { class: 'micro muted' }, 'החליקו ימינה לקלף הבא ושמאלה לקודם. הקישו על הקלף כדי להפוך אותו.'));
  add(stage, cardsExtras(stage));
  render(0);
  return stage;
}

/* ---------- מסך הפתיחה: בוחרים דרך ---------- */
function cardsHome() {
  const D = cardsData();
  const mode = (to, icon, title, desc, tag) => h('a', { class: 'frame cardmode', href: '#' + to, onclick: (e) => { e.preventDefault(); go(to); } },
    ic(icon, { size: 40, tone: 'blue' }), h('div', { class: 'stack', style: 'gap:6px' }, h('div', { class: 'row' }, h('h3', null, title), tag ? h('span', { class: 'tag lead' }, tag) : null), h('p', { class: 'muted' }, desc)));
  return h('div', { class: 'stack', style: 'gap:var(--gap)' },
    h('section', { class: 'frame cardshero' }, h('div', { class: 'stack' }, h('div', null, link('/tools', 'ארגז כלים', 'btn ghost sm')), h('h2', null, 'קלפי שיח וקשר אישי'),
      h('p', { style: 'max-width:56ch;font-size:18px' }, `${D.cards.length} קלפים לשיחה אישית: בצד אחד שאלה, ובצד השני תמונה. אפשר לפתוח את הטלפון בשיחה ולעבוד איתו כמו עם קלפים אמיתיים. איך נעבוד היום?`)),
      h('img', { src: 'cards/t05.webp', alt: '', loading: 'lazy' })),
    h('div', { class: 'grid cardmodes' },
      mode('/tools/cards/topics', 'checklist', 'לפי נושא', 'התלמיד/ה בוחר/ת נושא, ומשם מקבלים שאלות שקשורות אליו.'),
      mode('/tools/cards/pictures', 'eye', 'דרך תמונה', 'ארבע תמונות על המסך. התלמיד/ה בוחר/ת תמונה אחת, והקלף מסתובב לשאלה.'),
      mode('/tools/cards/random', 'idea', 'קלף מעורבב', 'כל השאלות מעורבבות, ומושכים קלף אחד. אפשר להפוך אותו לתמונה.'),
      mode('/tools/cards/depth', 'steps', 'לפי עומק וסוג השיחה', 'עומק: קליל, להעמיק או מעמיק, בהתאם לרמת הקשר. סוג: זהות וחוזקות, יעדים ומטרות, אג\'נסי ושותפות. אפשר לשלב.', 'חדש')),
    h('section', { class: 'frame' }, h('div', { class: 'row' },
      h('label', { class: 'row small', style: 'gap:8px' }, h('input', { type: 'checkbox', checked: cardsFull, onchange: (e) => { cardsFull = e.target.checked; } }), 'לפתוח את הקלפים במסך מלא (מומלץ בשיחה)'),
      h('label', { class: 'row small', style: 'gap:8px' }, h('input', { type: 'checkbox', checked: cardsMutual, onchange: (e) => { cardsMutual = e.target.checked; } }), 'שיחה הדדית: גם המחנך/ת עונה'),
      link('/tools/cards/browse', 'לדפדף בכל הקלפים', 'btn soft sm'))),
    h('details', { class: 'frame' }, h('summary', { style: 'cursor:pointer;font-weight:700;color:var(--lead)' }, 'איך משתמשים בשיחה'),
      h('div', { class: 'grid', style: 'margin-top:14px' },
        h('div', { class: 'well' }, h('h4', null, 'מכינים'), h('p', { class: 'small' }, 'בוחרים דרך אחת, מוצאים מקום שקט, ופותחים את הטלפון. אפשר לסמן "לא לכבות את המסך" בתחתית הקלף.')),
        h('div', { class: 'well' }, h('h4', null, 'משוחחים'), h('p', { class: 'small' }, 'התלמיד/ה בוחר/ת, ולא מחייבים לענות. אפשר תמיד להחליף קלף. אם רוצים, גם המחנך/ת עונה (סימון "שיחה הדדית").')),
        h('div', { class: 'well' }, h('h4', null, 'ממשיכים'), h('p', { class: 'small' }, 'אחרי השיחה אפשר לעדכן את רמת הקשר ב"מיפוי הכיתה". העוזר לקשר מציע גם קלפים שמתאימים לרמה שיצאה.')))));
}

/* ---------- 1. לפי נושא ---------- */
function cardsTopics() {
  const D = cardsData();
  return h('div', { class: 'stack', style: 'gap:var(--gap)' },
    cardsHeader('בוחרים נושא', 'התלמיד/ה בוחר/ת נושא שמעניין אותם, ומשם מקבלים שאלות שקשורות אליו.'),
    h('div', { class: 'cattiles' }, D.categories.map((cat) => {
      const cards = D.cards.filter((c) => c.cat === cat.id);
      const rep = cards[Math.floor(Math.random() * cards.length)];
      return h('a', { class: 'cattile', href: '#/tools/cards/topic/' + cat.id, onclick: (e) => { e.preventDefault(); go('/tools/cards/topic/' + cat.id); } },
        h('img', { src: cThumb(rep), alt: '', loading: 'lazy' }), h('span', { class: 'cattext' }, h('b', null, cat.t), h('small', null, `${cards.length} שאלות`)));
    })));
}
function cardsTopic(id) {
  const D = cardsData();
  const cat = D.categories.find((c) => c.id === id);
  if (!cat) return redirect('/tools/cards/topics');
  return h('div', { class: 'stack', style: 'gap:var(--gap)' },
    cardsHeader(cat.t, 'מחליקים בין השאלות בנושא, או חוזרים לבחור נושא אחר.', ['/tools/cards/topics', 'לנושאים']),
    cardDeck({ list: cShuffle(D.cards.filter((c) => c.cat === id)) }));
}

/* ---------- 2. דרך תמונה: ארבע תמונות, בוחרים אחת והקלף מסתובב לשאלה ---------- */
function cardsPictures() {
  const D = cardsData();
  const groups = new Map();
  D.cards.forEach((c) => { const k = c.p || c.n; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); });
  const seen = new Set(), usedQ = new Set();
  let shown = []; // מספרי תמונות
  const root = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  function draw() {
    let pool = [...groups.keys()].filter((k) => !seen.has(k));
    if (pool.length < 4) { seen.clear(); pool = [...groups.keys()]; }
    shown = cShuffle(pool).slice(0, 4);
    shown.forEach((k) => seen.add(k));
  }
  function chooseCard(k) {
    const cs = groups.get(k);
    const fresh = cs.filter((c) => !usedQ.has(c.n));
    const c = cShuffle(fresh.length ? fresh : cs)[0];
    usedQ.add(c.n); if (usedQ.size >= D.cards.length) usedQ.clear();
    return c;
  }
  function pick() {
    clear(root);
    const grid = h('div', { class: 'picks' }, shown.map((k, idx) => h('button', { class: 'picktile', type: 'button', 'aria-label': `תמונה ${idx + 1}`, onclick: () => { if (!swallow) show(chooseCard(k)); } }, h('img', { src: cImg(groups.get(k)[0]), alt: '', draggable: 'false' }))));
    // החלקה על התמונות מחליפה את כל הארבע
    let sx = null, swallow = false;
    grid.addEventListener('pointerdown', (e) => { sx = cAxisY() ? e.clientY : e.clientX; });
    grid.addEventListener('pointerup', (e) => { if (sx === null) return; const dx = (cAxisY() ? e.clientY : e.clientX) - sx; sx = null; if (Math.abs(dx) > 70) { swallow = true; setTimeout(() => { swallow = false; }, 0); draw(); pick(); } });
    add(root, [cardsHeader('בוחרים תמונה', 'התלמיד/ה בוחר/ת את התמונה שמדברת אליהם, והקלף יסתובב לשאלה.'),
      h('section', { class: 'frame pickframe' }, grid, h('div', { class: 'row picksrow', style: 'justify-content:center' }, h('button', { class: 'btn soft', type: 'button', onclick: () => { draw(); pick(); } }, 'ארבע תמונות אחרות')), h('p', { class: 'micro muted', style: 'text-align:center' }, 'לא אהבו אף תמונה? מחליקים הצידה או לוחצים על הכפתור.'))]);
    window.scrollTo(0, 0);
  }
  function show(c) {
    clear(root);
    const fl = cFlipper();
    fl.set(c, true); // מתחילים מהתמונה שנבחרה, ואז הקלף מסתובב לשאלה
    setTimeout(() => { if (fl.el.isConnected) fl.flip(false); }, 650);
    fl.el.addEventListener('click', () => cardTap(() => fl.flip()));
    const stage = h('section', { class: 'frame cardstage' }, h('div', { class: 'cardslider' }, h('div', { class: 'cardanim in-next' }, fl.el)),
      h('div', { class: 'row cardbtns' }, h('button', { class: 'btn', type: 'button', onclick: () => fl.flip() }, 'הפיכת הקלף'), h('button', { class: 'btn soft', type: 'button', onclick: pick }, 'לאותן ארבע תמונות'), h('button', { class: 'btn soft', type: 'button', onclick: () => { draw(); pick(); } }, 'ארבע תמונות חדשות')),
      h('p', { class: 'micro muted' }, 'לא מתאימה השאלה? חוזרים לתמונות ובוחרים אחרת. התמונה והשאלה הם שני צדדים של אותו קלף.'));
    add(stage, cardsExtras(stage));
    add(root, [cardsHeader('הקלף שנבחר', null), stage]);
    window.scrollTo(0, 0);
  }
  draw(); pick();
  return root;
}

/* ---------- 3. קלף מעורבב: משכו קלף ---------- */
function cardsRandom() {
  return h('div', { class: 'stack', style: 'gap:var(--gap)' },
    cardsHeader('קלף מעורבב', 'כל השאלות מעורבבות. מקישים כדי למשוך קלף, ושוב כדי להפוך אותו לתמונה. מחליקים לקלף הבא.'),
    cardDeck({ list: cShuffle(cardsData().cards), cover: true }));
}

/* ---------- 4. לפי עומק השיחה ולפי סוג השיחה (אפשר גם לשלב) ---------- */
const CARD_TYPES = [
  { id: 'identity', t: 'זהות וחוזקות', d: 'שאלות על מי שאני: חוזקות, רגשות, מה מרגש ומה חשוב לי.' },
  { id: 'goals', t: 'יעדים ומטרות', d: 'שאלות על חלומות, על מה שרוצים להשיג ועל ההחלטות הבאות.' },
  { id: 'agency', t: "אג'נסי ושותפות", d: 'שאלות על היכולת לפעול ולהשפיע, ועל מי ואיך אפשר להיעזר.' },
];
function cardsDepthHome() {
  const D = cardsData();
  return h('div', { class: 'stack', style: 'gap:var(--gap)' },
    cardsHeader('לפי עומק וסוג השיחה', 'בוחרים כמה עמוק רוצים להגיע, ועל מה רוצים לדבר. אפשר גם לשלב בין השניים. שאלה יכולה להתאים ליותר מסוג אחד.'),
    h('section', { class: 'frame' }, h('h3', null, 'עומק השיחה'), h('p', { class: 'muted small' }, 'מתאים לרמת הקשר עם התלמיד/ה.'),
      h('div', { class: 'grid cardmodes' }, DEPTHS.map((dp) => h('a', { class: 'frame cardmode depth', href: '#/tools/cards/depth/' + dp.n, onclick: (e) => { e.preventDefault(); go('/tools/cards/depth/' + dp.n); } },
        h('span', { class: 'group-badge' }, dp.n), h('div', { class: 'stack', style: 'gap:6px' }, h('h3', null, dp.t), h('p', { class: 'muted' }, dp.d), h('span', { class: 'tag', style: 'align-self:flex-start' }, `${dp.link} · ${D.cards.filter((c) => c.d === dp.n).length} קלפים`)))))),
    h('section', { class: 'frame' }, h('h3', null, 'סוג השיחה'), h('p', { class: 'muted small' }, 'על מה רוצים לדבר: אותם שלושה צירים של המבט השבועי.'),
      h('div', { class: 'grid cardmodes' }, CARD_TYPES.map((tp) => h('a', { class: 'frame cardmode depth', href: '#/tools/cards/type/' + tp.id, onclick: (e) => { e.preventDefault(); go('/tools/cards/type/' + tp.id); } },
        h('div', { class: 'stack', style: 'gap:6px' }, h('h3', null, tp.t), h('p', { class: 'muted' }, tp.d), h('span', { class: 'tag', style: 'align-self:flex-start' }, `${D.cards.filter((c) => c.a.includes(tp.id)).length} קלפים`)))))),
    h('p', { class: 'small muted' }, 'לא בטוחים באיזה קשר אתם? ', link('/mapping/helper', 'העוזר לקשר', 'btn ghost sm'), ' עוזר להבין, ואז מציע קלפים שמתאימים.'));
}
// עמוד אחד לשני הסינונים: אפשר לבחור עומק, סוג, או את שניהם
function cardsFocus(init) {
  const D = cardsData();
  const st = { depth: init.depth || 0, axis: init.axis || 'all' };
  const root = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  function paint() {
    clear(root);
    const list = cShuffle(D.cards.filter((c) => (!st.depth || c.d === st.depth) && (st.axis === 'all' || c.a.includes(st.axis))));
    const dp = DEPTHS.find((x) => x.n === st.depth), tp = CARD_TYPES.find((x) => x.id === st.axis);
    const sub = [dp ? `${dp.d} מתאים ל${dp.link}.` : null, tp ? tp.d : null].filter(Boolean).join(' ') || 'כל הקלפים, בלי סינון.';
    const depthChips = chipGroup({ options: [{ v: 0, t: 'כל הרמות' }, ...DEPTHS.map((x) => ({ v: x.n, t: x.t }))], value: st.depth, cls: 'sm', label: 'עומק השיחה', onChange: (v) => { st.depth = v; paint(); } });
    const typeChips = chipGroup({ options: [{ v: 'all', t: 'כל הסוגים' }, ...CARD_TYPES.map((x) => ({ v: x.id, t: x.t }))], value: st.axis, cls: 'sm', label: 'סוג השיחה', onChange: (v) => { st.axis = v; paint(); } });
    add(root, [cardsHeader(dp && !tp ? dp.t : tp && !dp ? tp.t : 'שיחה מותאמת', sub, ['/tools/cards/depth', 'לעומק ולסוג']),
      h('section', { class: 'frame' }, h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'עומק השיחה'), depthChips), h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'סוג השיחה'), typeChips), h('p', { class: 'micro muted' }, `${list.length} קלפים מתאימים. שאלה יכולה להתאים ליותר מסוג אחד.`)),
      list.length ? cardDeck({ list }) : h('section', { class: 'frame' }, h('p', { class: 'muted' }, 'אין קלפים בשילוב הזה. אפשר לבחור "כל הרמות" או "כל הסוגים".'))]);
  }
  paint();
  return root;
}

/* ---------- דפדוף בכל הקלפים: חפיסה או פריסה, עם סינון ---------- */
function cardsBrowse() {
  const D = cardsData();
  const st = { view: 'deck', cat: 'all', first: 'q', i: 0, list: [], filtersOpen: undefined };
  const root = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  const reset = (shuffle) => { const p = D.cards.filter((c) => st.cat === 'all' || c.cat === st.cat); st.list = shuffle ? cShuffle(p) : p; st.i = 0; };
  function filters() {
    const cat = chipGroup({ options: [{ v: 'all', t: 'כל הנושאים' }, ...D.categories.map((c) => ({ v: c.id, t: c.t }))], value: st.cat, cls: 'sm', label: 'נושא', onChange: (v) => { st.cat = v; reset(false); paint(); } });
    const first = chipGroup({ options: [{ v: 'q', t: 'שאלה קודם' }, { v: 'img', t: 'תמונה קודם' }], value: st.first, cls: 'sm', label: 'מה רואים קודם', onChange: (v) => { st.first = v; paint(); } });
    const open = st.filtersOpen === undefined ? st.view === 'spread' : st.filtersOpen;
    const box = h('details', { class: 'frame filters', open }, h('summary', { style: 'cursor:pointer;font-weight:700;color:var(--lead);display:flex;gap:10px;flex-wrap:wrap;align-items:baseline' }, 'נושא וסידור הקלפים', h('span', { class: 'small muted', style: 'font-weight:400' }, `${st.cat === 'all' ? 'כל הנושאים' : cCat(st.cat)} · ${st.first === 'q' ? 'שאלה קודם' : 'תמונה קודם'}`)),
      h('div', { class: 'stack', style: 'margin-top:14px' }, h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'נושא'), cat), h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'מה רואים קודם'), first),
        h('div', { class: 'row' }, h('button', { class: 'btn soft sm', type: 'button', onclick: () => { reset(true); paint(); toast('הקלפים עורבבו'); } }, 'ערבוב'))));
    box.addEventListener('toggle', () => { st.filtersOpen = box.open; });
    return box;
  }
  function head() {
    const view = chipGroup({ options: [{ v: 'deck', t: 'חפיסה' }, { v: 'spread', t: 'פריסה' }], value: st.view, cls: 'sm', label: 'תצוגה', onChange: (v) => { st.view = v; st.filtersOpen = v === 'spread'; paint(); } });
    return h('section', { class: 'frame cardhead' }, h('div', { class: 'row between' }, h('h2', null, 'כל הקלפים'), h('div', { class: 'row' }, cardsHideButton(), cardsFsButton(), cardsRotButton(), cardsFitButton(), link('/tools/cards', 'בחירת דרך אחרת', 'btn ghost sm'))), h('p', { class: 'muted small' }, 'מדפדפים בכל הקלפים, בחפיסה או בפריסה.'), view);
  }
  function spread() {
    const picture = st.first === 'img';
    return h('section', { class: 'frame' }, h('h3', null, picture ? 'בוחרים תמונה' : 'בוחרים שאלה'),
      h('div', { class: 'cardgrid' }, (picture ? st.list.filter((c, i, arr) => arr.findIndex((x) => (x.p || x.n) === (c.p || c.n)) === i) : st.list).map((c, idx) => h('button', { class: 'cardtile ' + (picture ? 'pic' : 'ques'), type: 'button', 'aria-label': picture ? `תמונה ${idx + 1}` : c.q, onclick: () => { st.view = 'deck'; st.i = st.list.indexOf(c); paint(); window.scrollTo(0, 0); } },
        picture ? h('img', { src: cThumb(c), alt: '', loading: 'lazy', draggable: 'false' }) : h('span', null, c.q)))));
  }
  function paint() {
    const y0 = window.scrollY;
    clear(root);
    add(root, st.view === 'deck' ? [head(), cardDeck({ list: st.list, first: st.first, start: st.i, onIndex: (k) => { st.i = k; } }), filters()] : [head(), filters(), spread()]);
    setTimeout(() => { const v = document.querySelector('.cardsview'); if (v) { v.classList.toggle('imm', st.view === 'deck'); cardsApply(); if (st.view === 'deck' && cardsFull && !cardsWakeLock) cardsSetWake(true); } }, 0);
    window.scrollTo(0, y0);
  }
  reset(false); paint();
  return root;
}

function viewCards(p) {
  const sub = p.replace(/^\/tools\/cards\/?/, '');
  const imm = CARDS_IMMERSIVE(sub);
  const on = imm && cardsFull;
  document.body.classList.toggle('cards-full', on);
  // הקלף נפתח במסך מלא. הבקשה למסך מלא של הדפדפן נעשית מתוך הלחיצה שהביאה אותנו לכאן.
  if (on) { cardsNative(true); if (!cardsWakeLock) cardsSetWake(true); } else if (!imm && sub !== 'browse') cardsLeave();
  if (on && !cardsChromeOff && !cardsHinted) { cardsHinted = true; setTimeout(() => toast('הקישו על הקלף כדי להסתיר את הסרגל'), 700); }
  return h('div', { class: 'cardsview' + (imm ? ' imm' : '') + (on ? ' full' : '') + (on && cardsRot ? ' rot' : '') + (cardsContain ? ' contain' : '') + (on && cardsChromeOff ? ' nochrome' : '') }, cardsRoute(p),
    h('button', { class: 'chromehandle', type: 'button', 'aria-label': 'הצגת הסרגל', onclick: () => cardsSetChrome(true) }, '⋯'));
}
function cardsRoute(p) {
  const sub = p.replace(/^\/tools\/cards\/?/, '');
  let m;
  if (!sub) return cardsHome();
  if (sub === 'topics') return cardsTopics();
  if ((m = /^topic\/([a-z]+)$/.exec(sub))) return cardsTopic(m[1]);
  if (sub === 'pictures') return cardsPictures();
  if (sub === 'random') return cardsRandom();
  if (sub === 'depth') return cardsDepthHome();
  if ((m = /^depth\/([123])$/.exec(sub))) return cardsFocus({ depth: Number(m[1]) });
  if ((m = /^type\/(identity|goals|agency)$/.exec(sub))) return cardsFocus({ axis: m[1] });
  if (sub === 'browse') return cardsBrowse();
  return redirect('/tools/cards');
}

/* =====================================================================
   מיפוי הכיתה: ארבעה שלבים, וכולם על אותה רשימה
   1. הכיתה שלי (הדבקה או העלאה של רשימת שמות)  2. עוזר לקשר (לא חובה)  3. מעגלי קשר  4. מפת שיחות
   ===================================================================== */
const MAP_TABS = [['/mapping/class', '1 · הכיתה שלי'], ['/mapping/helper', '2 · עוזר לקשר (לא חובה)'], ['/mapping/circles', '3 · מעגלי קשר'], ['/mapping/map', '4 · מפת שיחות']];
function mapNav(active) {
  return h('nav', { class: 'nav mapnav', 'aria-label': 'שלבי המיפוי' }, [['/mapping', 'סקירה'], ...MAP_TABS].map(([to, t]) => h('a', { href: '#' + to, 'aria-current': to === active ? 'page' : null, onclick: (e) => { e.preventDefault(); go(to); } }, t)));
}
function mapHead(title, sub, active) {
  return h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('h2', null, title), active === '/mapping/map' || active === '/mapping/circles' ? pdfButton('btn sm') : null), h('p', { class: 'muted', style: 'max-width:62ch' }, sub), mapNav(active));
}
function privacyNote() {
  const e = me();
  return h('details', { class: 'privnote' }, h('summary', null, ic('lock', { size: 18 }), h('span', null, 'הרשימה והמיפוי נשארים רק במכשיר הזה. הם לא נשלחים לשרת, ואף אחד אחר לא רואה אותם.'), h('span', { class: 'small', style: 'margin-inline-start:auto;color:var(--lead);font-weight:500' }, 'מה זה אומר?')),
    h('p', { class: 'small', style: 'margin-top:10px;max-width:70ch' }, `${e ? `המיפוי של ${e.name} ` : 'המיפוי '}נשמר על שמה במכשיר הזה, ונפתח בכל כניסה (באותו קוד של השיחות האישיות). מנהלת התכנית והמובילות לא רואות אותו ולא את השמות. מנהלת התכנית יכולה לדעת רק שנכנסת למיפוי ומתי, ושום דבר מהתוכן. כדי לעבוד ממכשיר אחר, מעתיקים את הנתונים (בתחתית הדף "הכיתה שלי") וטוענים אותם שם. כדאי לרשום ראשי תיבות במקום שם מלא, ולמחוק את הנתונים אם המכשיר משותף.`));
}
function emptyRoster() {
  return h('div', { class: 'well stack' }, h('b', null, 'עדיין אין תלמידים ברשימה'), h('p', { class: 'muted' }, 'מתחילים בשלב 1: מדביקים או מעלים את רשימת השמות של הכיתה, ואז היא מופיעה כאן וגם במעגלי הקשר.'), h('div', null, link('/mapping/class', 'להוספת רשימת הכיתה')));
}

/* ---------- רשימת שמות: פענוח והוספה ---------- */
// שורה לכל תלמיד/ה. מבינים מספור בתחילת שורה, עמודות מאקסל (טאב) ורשימה בשורה אחת מופרדת בפסיקים
function parseNames(text) {
  let lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/);
  if (lines.filter((l) => l.trim()).length === 1 && /[,;]/.test(lines[0])) lines = lines[0].split(/[,;]/);
  const out = [], seen = new Set();
  for (let l of lines) {
    l = l.split('\t').map((c) => c.trim()).filter(Boolean).join(' ');
    l = l.replace(/^[0-9]+[.)\-:]\s*/, '').replace(/^["']+|["']+$/g, '').replace(/\s+/g, ' ').trim();
    if (!l) continue;
    if (l.length > 40) l = l.slice(0, 40);
    const k = l.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k); out.push(l);
  }
  return out;
}
const nameKey = (s) => (s.name || '').trim().toLowerCase();
const MAX_STUDENTS = 80;
// replace=false: מוסיפים שמות חדשים. replace=true: הרשימה היא מה שהודבק; שמות קיימים נשארים עם הקשר שלהם, שמות שלא הודבקו יוצאים
function applyNames(names, replace) {
  let added = 0, dup = 0, removed = 0;
  if (replace) {
    const want = new Set(names.map((n) => n.toLowerCase()));
    const keep = map.students.filter((s) => want.has(nameKey(s)));
    removed = map.students.length - keep.length;
    const byKey = new Map(keep.map((s) => [nameKey(s), s]));
    map.students = names.map((n) => byKey.get(n.toLowerCase()) || (added++, newStudent(n))).slice(0, MAX_STUDENTS);
    dup = names.length - added;
  } else {
    const have = new Set(map.students.map(nameKey));
    for (const n of names) {
      if (have.has(n.toLowerCase())) { dup++; continue; }
      if (map.students.length >= MAX_STUDENTS) break;
      have.add(n.toLowerCase()); map.students.push(newStudent(n)); added++;
    }
  }
  saveMap();
  return { added, dup, removed };
}

function viewMappingHome() {
  ensureMap();
  const n = map.students.length, placed = map.students.filter((s) => s.link).length;
  const step = (num, title, desc, to, btn, status, optional) => h('article', { class: 'frame stepcard' },
    h('div', { class: 'row' }, h('span', { class: 'group-badge' }, num), h('h3', null, title), optional ? h('span', { class: 'tag' }, 'לא חובה') : null),
    h('p', null, desc), status ? h('p', { class: 'small muted' }, status) : null, h('div', null, link(to, btn)));
  const orig = (title, desc, pdf, imgs) => h('div', { class: 'well stack' }, h('b', null, title), h('p', { class: 'small' }, desc),
    h('div', { class: 'row' }, h('a', { class: 'btn soft sm', href: pdf, target: '_blank', rel: 'noopener' }, 'הקובץ המקורי (PDF)')),
    h('details', null, h('summary', { style: 'cursor:pointer;font-weight:500;color:var(--lead)' }, 'תצוגה מקדימה'), h('div', { class: 'previews', style: 'margin-top:14px' }, imgs.map((s) => h('img', { class: 'preview-img', src: s, alt: `תצוגה מקדימה של ${title}`, loading: 'lazy' })))));
  return h('div', { class: 'stack', style: 'gap:var(--gap)' },
    mapHead('מיפוי הכיתה', 'עוזר להחליט עם מי לשוחח ומתי: כל תלמיד/ה במעגל שמתאים לרמת הקשר איתם, ומהמיפוי יוצא סדר שיחות מוצע. עובדים בארבעה שלבים, על אותה רשימה.', '/mapping'),
    privacyNote(),
    h('div', { class: 'grid' },
      step('1', 'הכיתה שלי', 'מדביקים או מעלים את רשימת השמות של הכיתה, פעם אחת.', '/mapping/class', n ? 'לרשימה שלי' : 'להוספת הרשימה', n ? `${n} תלמידים ברשימה` : 'עוד אין רשימה'),
      step('2', 'עוזר לקשר', 'לא בטוחים מה רמת הקשר עם תלמיד/ה? עד שלוש שאלות של כן או לא, והמלצה באיזה מעגל למקם אותם.', '/mapping/helper', 'להתחיל שיחה עם העוזר', '', true),
      step('3', 'מעגלי קשר', 'גוררים כל תלמיד/ה למעגל שמתאים: תמונה אחת של כל הכיתה.', '/mapping/circles', 'למעגלי קשר', n ? `${placed} מתוך ${n} כבר ממוקמים` : ''),
      step('4', 'מפת שיחות', 'אותם נתונים בטבלה: דחוף, ציר שיחה, סבבים ושיחה אחרונה, וסדר מוצע לשיחות.', '/mapping/map', 'למפת שיחות', '')),
    h('details', { class: 'frame' }, h('summary', { style: 'font-weight:700;font-size:19px;cursor:pointer' }, 'הקבצים המקוריים של המפה והמעגלים'),
      h('div', { class: 'grid', style: 'margin-top:14px' },
        orig('מפת שיחות', 'דף מיפוי לכיתה: חמישה שדות לכל תלמיד/ה, וקבוצה שמסדרת את סדר השיחות.', 'assets/pdf/map-sichot.pdf', ['assets/preview/map-1.png', 'assets/preview/map-2.png']),
        orig('מעגלי קשר', 'אותה מפה בתמונה: כל תלמיד/ה במעגל שמתאים לקשר.', 'assets/pdf/maagalei-kesher.pdf', ['assets/preview/circles-1.png']))));
}

/* ---------- 1. הכיתה שלי ---------- */
function viewClass() {
  ensureMap();
  const root = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  function paint() {
    const y0 = window.scrollY;
    clear(root);
    const ta = h('textarea', { class: 'textarea', style: 'min-height:170px', placeholder: 'שורה לכל תלמיד/ה, למשל:\nא.כ\nב.ל\nג.מ\n\nאפשר גם להדביק עמודה מאקסל או מגוגל שיטס.', 'aria-label': 'רשימת שמות להדבקה' });
    const preview = h('p', { class: 'small', 'aria-live': 'polite', style: 'min-height:1.4em' });
    const refresh = () => {
      const names = parseNames(ta.value), have = new Set(map.students.map(nameKey));
      const dup = names.filter((x) => have.has(x.toLowerCase())).length;
      preview.textContent = names.length ? `נמצאו ${names.length} שמות${dup ? `, ${dup} מהם כבר ברשימה` : ''}.` : '';
    };
    ta.addEventListener('input', refresh);
    const loadFile = (f) => {
      if (!f) return;
      if (f.size > 300000) return toast('הקובץ גדול מדי. אפשר להדביק את העמודה עם השמות.');
      const read = (enc) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(f, enc); });
      read('utf-8').then(async (t) => {
        if (t.includes('�')) t = await read('windows-1255'); // קובץ עברית ישן מאקסל
        if (/\.csv$/i.test(f.name)) t = t.replace(/[,;]/g, '\t');
        ta.value = (ta.value.trim() ? ta.value.trimEnd() + '\n' : '') + t;
        refresh(); toast('הקובץ נטען. בודקים את הרשימה ולוחצים "הוספה לרשימה".');
      });
    };
    const fileInput = h('input', { type: 'file', accept: '.txt,.csv,text/plain,text/csv', hidden: true, 'aria-label': 'בחירת קובץ', onchange: (e) => { loadFile(e.target.files[0]); e.target.value = ''; } });
    const confirmHost = h('div', { class: 'stack' });
    const done = (r, replace) => { ta.value = ''; paint(); toast(replace ? `הרשימה עודכנה: ${r.added} חדשים${r.removed ? `, ${r.removed} הוסרו` : ''}.` : `נוספו ${r.added} תלמידים${r.dup ? `, ${r.dup} כבר היו ברשימה` : ''}.`); };
    const addBtn = h('button', { class: 'btn', onclick: () => { const names = parseNames(ta.value); if (!names.length) return toast('עוד אין שמות להוספה. מדביקים או מעלים רשימה.'); done(applyNames(names, false), false); } }, 'הוספה לרשימה');
    const replaceBtn = h('button', { class: 'btn soft', onclick: () => {
      const names = parseNames(ta.value); if (!names.length) return toast('עוד אין שמות להוספה. מדביקים או מעלים רשימה.');
      if (!map.students.length) return done(applyNames(names, false), false);
      confirmInline(confirmHost, 'לעדכן את הרשימה לפי מה שהדבקתם? שמות שלא מופיעים בהדבקה יוסרו (יחד עם הקשר שסומן להם). שמות שכבר ברשימה נשארים עם הקשר שלהם.', 'עדכון הרשימה', () => done(applyNames(names, true), true));
    } }, 'עדכון הרשימה לפי ההדבקה');
    const addOne = h('input', { class: 'input', placeholder: 'שם או ראשי תיבות, ואז Enter', 'aria-label': 'הוספת תלמיד/ה אחד/ת', onkeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) { applyNames(parseNames(e.target.value), false); paint(); setTimeout(() => root.querySelector('[aria-label="הוספת תלמיד/ה אחד/ת"]')?.focus(), 0); } } });
    const listHost = h('div', { class: 'stack', style: 'gap:8px' });
    map.students.forEach((s, i) => listHost.append(h('div', { class: 'rosterrow' },
      h('span', { class: 'small muted' }, String(i + 1)),
      h('input', { class: 'input', value: s.name, 'aria-label': `שם תלמיד/ה ${i + 1}`, oninput: (e) => { s.name = e.target.value; saveMap(); } }),
      s.link ? h('span', { class: 'tag lead' }, `קשר ${s.link}`) : h('span', { class: 'tag' }, 'טרם מוקם'),
      h('button', { class: 'xbtn', 'aria-label': `הסרת ${s.name || 'תלמיד/ה'}`, onclick: () => { map.students = map.students.filter((x) => x.id !== s.id); saveMap(); paint(); } }, '×'))));
    const sample = () => { applyNames(['א.כ', 'ב.ל', 'ג.מ', 'ד.ש', 'ה.ר', 'ו.ט', 'ז.ח', 'ח.נ'], false); paint(); toast('נוספו ראשי תיבות בדויים לדוגמה'); };
    const clearHost = h('div', { class: 'stack' });
    add(root, [
      mapHead('הכיתה שלי', 'שלב ראשון: רשימת השמות של הכיתה. מכאן היא עוברת אוטומטית למעגלי הקשר ולמפת השיחות, ואין צורך להקליד שוב.', '/mapping/class'),
      privacyNote(),
      h('section', { class: 'frame' }, h('h3', null, 'פרטי הכיתה'), classFields(paint)),
      h('section', { class: 'frame' }, h('h3', null, 'הוספת רשימת שמות'),
        h('ol', { class: 'steps' }, h('li', null, 'מעתיקים את השמות מהקובץ שלכם (אקסל, וורד, גוגל שיטס, רשימת תלמידים) ומדביקים בתיבה. שורה לכל תלמיד/ה.'), h('li', null, 'או לוחצים "העלאת קובץ" ובוחרים קובץ טקסט או CSV.'), h('li', null, 'בודקים את מספר השמות שנמצאו, ולוחצים "הוספה לרשימה".')),
        ta, preview,
        h('div', { class: 'row' }, addBtn, replaceBtn, h('button', { class: 'btn soft', onclick: () => fileInput.click() }, 'העלאת קובץ (txt או csv)'), fileInput),
        confirmHost,
        h('p', { class: 'small muted' }, 'מומלץ ראשי תיבות במקום שם מלא. עד 80 תלמידים. קובץ אקסל (xlsx) אי אפשר להעלות ישירות: מעתיקים את העמודה ומדביקים.')),
      h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('h3', null, `הרשימה שלי (${map.students.length})`), map.students.length ? null : h('button', { class: 'btn soft sm', onclick: sample }, 'נסו עם כיתה לדוגמה')),
        map.students.length ? listHost : h('p', { class: 'muted' }, 'עדיין אין תלמידים. מדביקים רשימה למעלה, או מוסיפים אחד אחד.'),
        h('div', { class: 'row' }, h('div', { style: 'flex:1 1 260px' }, addOne),
          map.students.length ? h('button', { class: 'btn ghost sm', onclick: () => confirmInline(clearHost, 'למחוק את כל הרשימה והמיפוי מהמכשיר הזה? אי אפשר לשחזר.', 'מחיקה', () => { map.students = []; saveMap(); paint(); toast('הרשימה נמחקה'); }) }, 'ניקוי הרשימה') : null), clearHost),
      map.students.length ? h('section', { class: 'frame lead' }, h('h3', null, 'מה עכשיו?'), h('p', null, 'אפשר לגרור כל תלמיד/ה למעגל ישר, או לבקש עזרה מהעוזר אם לא בטוחים מה רמת הקשר.'),
        h('div', { class: 'row' }, link('/mapping/circles', 'למעגלי קשר', 'btn white'), link('/mapping/helper', 'לעוזר לקשר', 'btn soft'), link('/mapping/map', 'למפת שיחות', 'btn soft'))) : null,
      h('section', { class: 'frame' }, h('h3', null, 'שמירה וגיבוי'), h('p', { class: 'muted' }, 'הכול נשמר אוטומטית במכשיר הזה. כדי להעביר למכשיר אחר, מעתיקים את הנתונים ושומרים אותם בקובץ שלכם.'), mapActions(paint))]);
    window.scrollTo(0, y0);
  }
  paint();
  return root;
}

/* ---------- 2. עוזר לקשר: עד שלוש שאלות ---------- */
// עוזר מונחה (בלי בינה מלאכותית ובלי שרת): שאלות קבועות והצעה לפי התשובות. שום דבר לא נשלח ולא נשמר, חוץ מהמיקום שבוחרים.
const LEVEL_COPY = {
  1: { title: 'קשר 1 · כמעט לא מכירים', text: 'כרגע הקשר בתחילתו, וזה בסדר גמור: זו נקודת פתיחה, לא ציון.', tip: 'שיחה קצרה אחת בלי ציפיות. שאלו על משהו שהוא או היא נהנים ממנו, והקשיבו יותר ממה שאתם מדברים.' },
  2: { title: 'קשר 2 · מכירים את הבסיס', text: 'יש היכרות ויש בסיס, ועוד לא נבנה אמון עמוק.', tip: 'שיחה ממוקדת. בקשו מהם לספר על רגע מהשבוע שהם גאים בו, ושאלו מה עזר להם שם.' },
  3: { title: 'קשר 3 · קשר ושיח פתוח', text: 'יש אמון, והם פונים אליכם. כדאי לשמור עליו.', tip: 'אפשר לדבר על יעדים וצעדים: מה הוא או היא רוצים שיתחיל לזוז?' },
};
// מספר = הקשר שמומלץ. מחרוזת = השאלה הבאה.
const HELPER_TREE = {
  personal: { short: 'סיפרו משהו אישי', text: (n) => `האם ${n} סיפר/ה לכם בעצמם משהו אישי, שלא קשור ללימודים?`, no: 'initiative', yes: 'hard' },
  initiative: { short: 'פנו ביוזמתם', text: (n) => `האם ${n} פנה/פנתה אליכם ביוזמתם, ולו פעם אחת?`, no: 1, yes: 2 },
  hard: { short: 'ישתפו במשהו קשה', text: () => 'אם יקרה להם משהו קשה, סביר שתשמעו על זה מהם בעצמם?', no: 2, yes: 'open' },
  open: { short: 'שיחה פתוחה', text: () => 'האם הייתה ביניכם שיחה אישית שבה הם שיתפו ואתם הקשבתם?', no: 2, yes: 3 },
};

function viewHelper() {
  ensureMap();
  const root = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  function paint(student) {
    clear(root);
    add(root, [mapHead('עוזר לקשר', 'לא בטוחים מה רמת הקשר עם תלמיד/ה? העוזר שואל עד שלוש שאלות של כן או לא, ואחריהן ממליץ באיזה מעגל למקם אותם. זה לא חובה: אפשר גם למקם ישר במעגלים.', '/mapping/helper'), privacyNote(), student ? chat(student) : picker()]);
  }
  function picker() {
    const addOne = h('input', { class: 'input', placeholder: 'או כותבים שם חדש, ואז Enter', 'aria-label': 'שם תלמיד/ה חדש/ה', onkeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) { const [nm] = parseNames(e.target.value); applyNames([nm], false); paint(map.students.find((s) => nameKey(s) === nm.toLowerCase())); } } });
    return h('section', { class: 'frame' }, h('h3', null, 'על מי נדבר?'),
      map.students.length ? h('div', { class: 'chips' }, map.students.map((s) => h('button', { class: 'tag pick', type: 'button', onclick: () => paint(s) }, s.name || '(ללא שם)', s.link ? h('span', { class: 'micro', style: 'margin-inline-start:6px;opacity:.8' }, `קשר ${s.link}`) : null)))
        : h('p', { class: 'muted' }, 'עוד אין רשימה. אפשר להוסיף שם כאן, או להדביק רשימה שלמה בשלב 1.'),
      h('div', { class: 'row' }, h('div', { style: 'flex:1 1 260px' }, addOne), link('/mapping/class', 'להדבקת רשימה שלמה', 'btn soft sm')));
  }
  function chat(student) {
    const log = h('div', { class: 'chatlog', 'aria-live': 'polite' });
    const opts = h('div', { class: 'chatopts' });
    const say = (who, ...content) => { const b = h('div', { class: 'bubble ' + who }, ...content); log.append(b); b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return b; };
    const trail = []; // [{ key, yes }]
    const name = student.name || 'התלמיד/ה';
    function ask(key) {
      clear(opts);
      const q = HELPER_TREE[key];
      say('bot', h('span', { class: 'micro muted', style: 'display:block' }, `שאלה ${trail.length + 1} מתוך 3 לכל היותר`), q.text(name));
      const answer = (yes) => {
        trail.push({ key, yes });
        say('me', yes ? 'כן' : 'לא');
        const next = yes ? q.yes : q.no;
        if (typeof next === 'number') finish(next); else ask(next);
      };
      opts.classList.add('yn');
      opts.append(h('button', { class: 'btn chatopt', type: 'button', onclick: () => answer(true) }, 'כן'), h('button', { class: 'btn soft chatopt', type: 'button', onclick: () => answer(false) }, 'לא'));
    }
    function finish(level) {
      clear(opts); opts.classList.remove('yn');
      const L = LEVEL_COPY[level];
      const why = trail.map((t) => `${HELPER_TREE[t.key].short}: ${t.yes ? 'כן' : 'לא'}`);
      say('bot', h('b', null, `ההמלצה שלי: ${L.title}`), h('p', null, L.text), h('ul', { class: 'why' }, why.map((w) => h('li', null, w))), h('p', null, h('b', null, 'צעד קטן להמשך: '), L.tip));
      const urgentLabel = () => (student.urgent ? 'מסומן כדחוף. לבטל?' : 'יש משהו שלא יכול לחכות? לסמן כדחוף');
      const urgent = h('button', { class: 'btn soft sm', type: 'button', 'aria-pressed': String(!!student.urgent), onclick: () => { student.urgent = !student.urgent; if (!student.urgent) student.word = ''; saveMap(); urgent.setAttribute('aria-pressed', String(student.urgent)); urgent.textContent = urgentLabel(); } }, urgentLabel());
      const place = (v) => {
        student.link = v; delete student.x; delete student.y; saveMap(); clear(opts);
        say('bot', `מיקמתי את ${name} בקשר ${v} (${lab(LINKS, v)}). אפשר לשנות בכל רגע במעגלים או בטבלה.`);
        opts.append(h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => paint(null) }, 'תלמיד/ה נוספ/ת'), link('/mapping/circles', 'לראות במעגלי קשר', 'btn soft'), link('/tools/cards/depth/' + v, 'קלפי שיח לקשר הזה', 'btn soft'), link('/mapping/map', 'למפת שיחות', 'btn soft')));
      };
      opts.append(h('button', { class: 'btn chatopt', type: 'button', onclick: () => { say('me', `ממקמים בקשר ${level}`); place(level); } }, `למקם את ${name} בקשר ${level}`),
        h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'או לבחור בעצמנו:'), [1, 2, 3].filter((v) => v !== level).map((v) => h('button', { class: 'btn soft sm', type: 'button', onclick: () => { say('me', `ממקמים בקשר ${v}`); place(v); } }, `קשר ${v}`))), urgent,
        h('div', { class: 'row' }, link('/tools/cards/depth/' + level, 'קלפי שיח שמתאימים לקשר הזה', 'btn soft sm')),
        h('button', { class: 'btn ghost sm', type: 'button', onclick: () => paint(student) }, 'להתחיל מחדש'));
    }
    say('bot', `היי! אשאל עד שלוש שאלות קצרות, כן או לא, על ${name}, ואמליץ באיזה מעגל למקם אותם. אין תשובות נכונות, והכול נשאר במכשיר שלכם.`);
    if (student.link) say('bot', `כרגע ${name} מוצבים בקשר ${student.link} (${lab(LINKS, student.link)}).`);
    ask('personal');
    return h('section', { class: 'frame chat' }, h('div', { class: 'row between' }, h('h3', null, `שיחה על ${name}`), h('button', { class: 'btn ghost sm', type: 'button', onclick: () => paint(null) }, 'בחירת תלמיד/ה אחר/ת')), log, opts);
  }
  paint(null);
  return root;
}


/* =====================================================================
   מיפוי הכיתה: נתונים מקומיים בלבד
   ===================================================================== */
// המיפוי נשמר במכשיר, על שם המחנכת שנכנסה (מפתח נפרד לכל מחנכת). הוא לא נשלח לשרת.
const emptyMap = () => ({ cls: '', round: 1, students: [] });
let map = emptyMap(), mapOwner = null;
function ensureMap() {
  const e = me(); const id = e ? e.id : null;
  if (id === mapOwner) return;
  mapOwner = id; map = emptyMap();
  if (id) { try { const m = JSON.parse(lsGet(MAP_KEY + '.' + id) || 'null'); if (m && Array.isArray(m.students)) map = m; } catch { /* ריק */ } }
}
const saveMap = () => { if (mapOwner) { lsSet(MAP_KEY + '.' + mapOwner, JSON.stringify(map)); pingMapping(); } };
// מנהלת התכנית רואה רק שהמחנכת השתמשה במיפוי ומתי. נשלח רק "נפתח" ו"יש רשימה", בלי שמות ובלי שום תוכן. שגיאה לא מפריעה לעבודה.
let mapPing = { at: 0, started: false };
function pingMapping() {
  if (!me() || !mapOwner) return;
  const started = map.students.length > 0;
  if (Date.now() - mapPing.at < 3600000 && (mapPing.started || !started)) return;
  mapPing = { at: Date.now(), started };
  api('POST', '/api/me/usage', { tool: 'mapping', started }).catch(() => { mapPing.at = 0; });
}
const newStudent = (name = '') => ({ id: nid('s') + Math.random().toString(36).slice(2, 6), name, link: null, urgent: false, word: '', axis: null, rounds: [false, false, false], last: '' });
const groupOf = (s) => (!s.link ? null : s.urgent ? 1 : s.link === 1 ? 2 : s.link === 2 ? 3 : 4);
const chipText = (name) => {
  const t = (name || '').trim(); if (!t) return '?';
  const parts = t.split(/[\s.]+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, 2).map((p) => p[0]).join('') : t.slice(0, 3);
};
// הורדת המיפוי כקובץ PDF (נבנה במכשיר, לא עובר בשרת)
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  if (!('download' in a)) { window.open(url, '_blank'); return; }
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function pdfButton(cls = 'btn soft sm') {
  return h('button', { class: cls, type: 'button', onclick: async (e) => {
    if (!map.students.length) return toast('עוד אין תלמידים במיפוי. מוסיפים רשימה בשלב 1.');
    const b = e.currentTarget, label = b.textContent;
    b.disabled = true; b.textContent = 'מכין את הקובץ…';
    try {
      const blob = await window.ZmanPdf.mappingPdf(map, { date: new Date().toLocaleDateString('he-IL') });
      saveBlob(blob, `מיפוי-כיתה${(map.cls || '').trim() ? '-' + map.cls.trim().replace(/\s+/g, '-') : ''}.pdf`);
      toast('קובץ ה-PDF ירד למכשיר');
    } catch { toast('לא הצלחנו להכין את הקובץ. אפשר לנסות שוב.'); } finally { b.disabled = false; b.textContent = label; }
  } }, 'הורדה כ-PDF');
}
function mapActions(rerender) {
  const host = h('div', { class: 'stack' });
  const row = h('div', { class: 'row' },
    h('button', { class: 'btn soft sm', onclick: () => copyText(JSON.stringify(map), 'הנתונים הועתקו. אפשר להדביק ולשמור אותם בקובץ שלכם.') }, 'העתקת הנתונים לשמירה'),
    h('button', { class: 'btn soft sm', onclick: () => openSheet((close) => {
      const ta = h('textarea', { class: 'textarea copybox', placeholder: 'הדביקו כאן נתונים ששמרתם קודם' });
      return [h('h3', null, 'טעינת נתונים שנשמרו'), h('p', { class: 'muted' }, 'מחליף את מה שמופיע עכשיו במפה.'), ta,
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => {
          try { const m = JSON.parse(ta.value); if (!m || !Array.isArray(m.students)) throw new Error('x'); map = m; saveMap(); close(); rerender(); toast('הנתונים נטענו'); } catch { toast('הטקסט לא נראה כמו נתוני מפה'); }
        } }, 'טעינה'), h('button', { class: 'btn soft', onclick: close }, 'ביטול'))];
    }) }, 'טעינת נתונים שנשמרו'),
    pdfButton('btn sm'),
    h('button', { class: 'btn soft sm', onclick: () => confirmInline(host, 'למחוק את כל נתוני המיפוי מהמכשיר הזה? אי אפשר לשחזר.', 'מחיקה', () => { map = { cls: '', round: 1, students: [] }; saveMap(); rerender(); toast('הנתונים נמחקו מהמכשיר'); }) }, 'מחיקת הנתונים מהמכשיר'));
  host.append(row);
  return host;
}
function classFields(rerender) {
  const cls = h('input', { class: 'input', value: map.cls, placeholder: 'למשל ט׳ 2', oninput: (e) => { map.cls = e.target.value; saveMap(); } });
  return h('div', { class: 'grid' },
    field('כיתה', cls),
    h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'סבב נוכחי'), chipGroup({ options: ROUNDS, value: map.round, label: 'סבב נוכחי', onChange: (v) => { map.round = v; saveMap(); } })));
}
function guide() {
  return h('details', { class: 'frame' }, h('summary', { style: 'font-weight:700;font-size:19px;cursor:pointer' }, 'איך ממלאים'),
    h('div', { class: 'stack', style: 'margin-top:14px' },
      h('p', null, h('b', null, 'למה ממפים. '), 'השעתיים הנוספות במשרה נועדו לבניית אמון, תחושת שייכות ומשמעות, ולא רק למעקב. המטרה: שלושה סבבי שיחות אישיות עם כל תלמיד/ה לאורך השנה. המפה היא כלי לקביעת סדר השיחות, לא תיוג של תלמידים.'),
      h('div', { class: 'grid' },
        h('div', { class: 'well' }, h('h4', null, 'קשר'), h('p', null, '1 כמעט לא מכיר/ה · 2 מכיר/ה את הבסיס · 3 קשר ושיח פתוח.')),
        h('div', { class: 'well' }, h('h4', null, 'דחוף'), h('p', null, 'נקודה ליד מי שיש לו או לה משהו שלא יכול לחכות, גם אם אתם מכירים אותו או אותה מצוין, ועוד מילה אחת. מומלץ עד חמש נקודות בכל פעם.')),
        h('div', { class: 'well' }, h('h4', null, 'ציר שיחה'), h('p', null, 'ז זהות וחוזקות · י יעדים ומטרות · א אג׳נסי. מה אני רוצה שיתחיל לזוז.')),
        h('div', { class: 'well' }, h('h4', null, 'סבבי שיחות'), h('p', null, 'מסמנים עיגול על כל סבב שהתקיים, עד שלושה.')),
        h('div', { class: 'well' }, h('h4', null, 'שיחה אחרונה'), h('p', null, 'התאריך של השיחה האחרונה, מכל סוג. כך אף תלמיד/ה לא נשכחים.')))));
}
function groupSummary() {
  const box = h('section', { class: 'frame' }, h('h3', null, 'סדר מוצע לשיחות'),
    h('p', { class: 'muted' }, 'הקבוצה מחושבת לפי הקשר והנקודה. מתחילים מקבוצה 1.'));
  const placed = map.students.filter((s) => s.link);
  if (!placed.length) { box.append(h('p', { class: 'muted' }, 'כשיסומן קשר לתלמידים, יופיע כאן הסדר המוצע.')); return box; }
  const done = map.students.reduce((n, s) => n + s.rounds.filter(Boolean).length, 0);
  box.append(h('div', { class: 'stack' }, h('div', { class: 'row between' }, h('span', { class: 'small' }, `סבבי שיחות שהתקיימו: ${done} מתוך ${map.students.length * 3}`), h('span', { class: 'small num' }, `${map.students.length ? Math.round((done / (map.students.length * 3)) * 100) : 0}%`)),
    h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: `width:${map.students.length ? (done / (map.students.length * 3)) * 100 : 0}%` }))));
  const grid = h('div', { class: 'grid' });
  GROUPS.forEach((g) => {
    const members = placed.filter((s) => groupOf(s) === g.n);
    grid.append(h('div', { class: 'well stack' }, h('div', { class: 'row' }, h('span', { class: 'group-badge' }, g.n), h('h4', null, g.t)), h('p', { class: 'small muted' }, g.d),
      h('div', { class: 'chips' }, members.length ? members.map((s) => h('span', { class: 'tag' + (s.urgent ? ' todo' : '') }, s.name || '(ללא שם)', s.urgent && s.word ? ` · ${s.word}` : '')) : h('span', { class: 'micro muted' }, 'אין תלמידים בקבוצה'))));
  });
  box.append(grid);
  return box;
}

function viewMap() {
  ensureMap();
  const root = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  const sample = () => ['א.כ', 'ב.ל', 'ג.מ', 'ד.ש', 'ה.ר', 'ו.ט', 'ז.ח', 'ח.נ'].map((n, i) => ({ ...newStudent(n), link: [1, 2, 3, 1, 2, 3, 2, 1][i], urgent: i === 0 || i === 4, word: i === 0 ? 'נוכחות' : i === 4 ? 'חברים' : '', axis: ['z', 'y', 'a'][i % 3], rounds: [i % 3 !== 0, i % 4 === 0, false], last: i % 2 ? '' : addDays(ymd(new Date()), -(i * 4)) }));
  function paint() {
    const y0 = window.scrollY;
    clear(root);
    const list = h('div', { class: 'stack', style: 'gap:8px' });
    list.append(h('div', { class: 'maphead', 'aria-hidden': 'true' }, h('span', null, '#'), h('span', null, 'שם או ראשי תיבות'), h('span', null, 'קשר'), h('span', null, 'דחוף'), h('span', null, 'ציר שיחה'), h('span', null, 'סבבי שיחות'), h('span', null, 'שיחה אחרונה'), h('span', null, 'קבוצה'), h('span', null, '')));
    map.students.forEach((s, i) => list.append(studentRow(s, i, paint)));
    const addName = h('input', { class: 'input', placeholder: 'הוספת שם אחד, ואז Enter', 'aria-label': 'הוספת תלמיד/ה', onkeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) { applyNames(parseNames(e.target.value), false); paint(); setTimeout(() => root.querySelector('[aria-label="הוספת תלמיד/ה"]')?.focus(), 0); } } });
    add(root, [mapHead('מפת שיחות', `${map.cls ? 'כיתה ' + map.cls + '. ' : ''}טבלה אחת לכל הכיתה: קשר, דחוף, ציר שיחה, סבבים ושיחה אחרונה. הקבוצה בעמודה האחרונה מחושבת לבד ומסדרת את סדר השיחות.`, '/mapping/map'), privacyNote(), guide(),
      h('section', { class: 'frame' },
        map.students.length ? h('div', { class: 'tablewrap', style: 'overflow:visible' }, list) : emptyRoster(),
        h('div', { class: 'row' }, h('div', { style: 'flex:1 1 260px' }, addName), link('/mapping/class', 'הוספת רשימה שלמה', 'btn soft sm'), link('/mapping/helper', 'לא בטוחים בקשר? העוזר', 'btn soft sm'))),
      groupSummary(),
      h('section', { class: 'frame' }, h('h3', null, 'שמירה וגיבוי'), h('p', { class: 'muted' }, 'המפה נשמרת אוטומטית במכשיר הזה. כדי להעביר אותה למכשיר אחר, מעתיקים את הנתונים ושומרים אותם בקובץ שלכם.'), mapActions(paint))]);
    window.scrollTo(0, y0);
  }
  paint();
  return root;
}
function studentRow(s, i, repaint) {
  const upd = (patch) => { Object.assign(s, patch); saveMap(); repaint(); };
  const seg = (opts, val, set, lbl) => h('div', { class: 'seg', role: 'radiogroup', 'aria-label': lbl },
    opts.map((o) => { const name = nid('r'); const inp = h('input', { type: 'radio', name, value: String(o.v), checked: val === o.v, onchange: () => set(o.v) });
      return h('label', { class: 'chip sm dot', title: o.full || o.t }, inp, h('span', null, o.short || String(o.v))); }));
  const rowEl = h('div', { class: 'maprow' },
    h('div', { class: 'cell idx' }, String(i + 1)),
    h('div', { class: 'cell wide', 'data-label': 'שם או ראשי תיבות' }, h('input', { class: 'input', value: s.name, 'aria-label': `שם תלמיד/ה ${i + 1}`, oninput: (e) => { s.name = e.target.value; saveMap(); } })),
    h('div', { class: 'cell', 'data-label': 'קשר (1 עד 3)' }, seg(LINKS, s.link, (v) => upd({ link: v }), 'קשר')),
    h('div', { class: 'cell', 'data-label': 'דחוף' }, h('div', { class: 'urgent-cell' },
      h('button', { class: 'dotbtn', 'aria-pressed': String(s.urgent), 'aria-label': 'דחוף', onclick: () => upd({ urgent: !s.urgent, word: s.urgent ? '' : s.word }) }, h('i')),
      s.urgent ? (() => { const sel = h('select', { class: 'select', 'aria-label': 'מילה אחת לדחוף', onchange: (e) => { s.word = e.target.value; saveMap(); } }, h('option', { value: '' }, 'מילה'), URGENT_WORDS.map((w) => h('option', { value: w, selected: s.word === w }, w))); return sel; })() : null)),
    h('div', { class: 'cell', 'data-label': 'ציר שיחה' }, seg(MAP_AXES.map((a) => ({ v: a.v, t: a.full, full: a.full, short: a.t })), s.axis, (v) => upd({ axis: s.axis === v ? null : v }), 'ציר שיחה')),
    h('div', { class: 'cell', 'data-label': 'סבבי שיחות' }, h('div', { class: 'rounds' }, s.rounds.map((on, k) => h('button', { class: 'rbtn', 'aria-pressed': String(on), 'aria-label': `סבב ${k + 1}`, onclick: () => { s.rounds[k] = !s.rounds[k]; upd({}); } })))),
    h('div', { class: 'cell', 'data-label': 'שיחה אחרונה' }, h('input', { class: 'input', type: 'date', value: s.last, 'aria-label': 'תאריך שיחה אחרונה', style: 'padding:9px 10px', onchange: (e) => { s.last = e.target.value; saveMap(); } })),
    h('div', { class: 'cell', 'data-label': 'קבוצה' }, groupOf(s) ? h('span', { class: 'group-badge' }, groupOf(s)) : h('span', { class: 'group-badge none' }, '–')),
    h('div', { class: 'cell x' }, h('button', { class: 'xbtn', 'aria-label': `הסרת שורה ${i + 1}`, onclick: () => { map.students = map.students.filter((x) => x.id !== s.id); saveMap(); repaint(); } }, '×')));
  return rowEl;
}

/* ---------- מעגלי קשר ---------- */
function viewCircles() {
  ensureMap();
  const root = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  let sel = null;
  const R = [0.07, 0.21, 0.35, 0.48]; // גבולות הטבעות ביחידות של רוחב הלוח
  const dist = (x, y) => Math.hypot(x - 0.5, y - 0.5);
  const ringOf = (d) => (d < R[0] ? null : d < R[1] ? 3 : d < R[2] ? 2 : d <= R[3] + 0.04 ? 1 : 0);
  const clamp = (v) => Math.min(0.97, Math.max(0.03, v));
  const LABEL_Y = [0.34, 0.195, 0.055]; // מיקום תוויות הטבעות בראש הלוח: לא מניחים שם תלמיד
  // כל תלמיד/ה מקבלים מיקום משלהם (x, y) שנשמר. גרירה של אחד לא מזיזה אף אחד אחר.
  function autoPlace(st, others) {
    const rin = st.link === 3 ? R[0] + 0.045 : st.link === 2 ? R[1] + 0.025 : R[2] + 0.025;
    const rout = st.link === 3 ? R[1] - 0.025 : st.link === 2 ? R[2] - 0.025 : R[3] - 0.01;
    let best = null, bestScore = -1;
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(rin * rin + (rout * rout - rin * rin) * Math.random());
      const x = 0.5 + r * Math.cos(a), y = 0.5 + r * Math.sin(a);
      if (Math.abs(x - 0.5) < 0.16 && LABEL_Y.some((ly) => Math.abs(y - ly) < 0.045)) continue;
      const score = Math.min(9, ...others.map((o) => Math.hypot(o.x - x, o.y - y)));
      if (score > bestScore) { best = { x, y }; bestScore = score; }
    }
    st.x = best ? best.x : 0.5 + rin; st.y = best ? best.y : 0.5;
  }
  // מיקום שמור שלא מתאים לקשר (אחרי עריכה בטבלה, טעינת נתונים ישנים וכד') מקבל מיקום חדש, ושאר התלמידים נשארים במקום
  function ensurePositions() {
    let changed = false;
    const placed = [], pending = [];
    for (const st of map.students) {
      if (!st.link) { if (st.x !== undefined) { delete st.x; delete st.y; changed = true; } continue; }
      if (typeof st.x === 'number' && typeof st.y === 'number' && ringOf(dist(st.x, st.y)) === st.link) placed.push(st); else pending.push(st);
    }
    for (const st of pending) { autoPlace(st, placed); placed.push(st); changed = true; }
    if (changed) saveMap();
  }
  function chipEl(st, pos) {
    const b = h('button', { class: 'pchip' + (st.urgent ? ' urgent' : '') + (sel === st.id ? ' sel' : ''), title: `${st.name || '(ללא שם)'}${st.urgent ? ' · דחוף' + (st.word ? ': ' + st.word : '') : ''}`, 'aria-label': st.name || 'תלמיד/ה' }, h('span', null, (st.name || '').trim() || '?'));
    if (pos) { b.style.left = pos.x * 100 + '%'; b.style.top = pos.y * 100 + '%'; }
    // גרירה: מעתיקים את הצ'יפ לצל שעוקב אחרי האצבע או העכבר, ורק בשחרור שומרים מיקום. הלוח לא נבנה מחדש באמצע גרירה.
    b.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      const start = { x: e.clientX, y: e.clientY };
      let ghost = null;
      const move = (ev) => {
        if (!ghost) {
          if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) <= 6) return;
          ghost = b.cloneNode(true);
          ghost.classList.add('ghost'); ghost.classList.remove('sel');
          ghost.style.left = ''; ghost.style.top = '';
          document.body.append(ghost); b.classList.add('dragging');
        }
        ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
        ev.preventDefault();
      };
      const end = (ev) => {
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
        if (!ghost) { if (ev.type === 'pointerup') { sel = sel === st.id ? null : st.id; paint(); } return; }
        ghost.remove(); b.classList.remove('dragging');
        if (ev.type === 'pointercancel') return;
        const bd = root.querySelector('.board').getBoundingClientRect();
        const x = (ev.clientX - bd.left) / bd.width, y = (ev.clientY - bd.top) / bd.height;
        const r = ringOf(dist(x, y));
        if (r === 0) { st.link = null; delete st.x; delete st.y; } // מחוץ ללוח: חוזרים לרשימה "עדיין לא הוצבו"
        else if (r) { st.link = r; st.x = clamp(x); st.y = clamp(y); }
        saveMap(); paint();
      };
      document.addEventListener('pointermove', move, { passive: false });
      document.addEventListener('pointerup', end);
      document.addEventListener('pointercancel', end);
    });
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = sel === st.id ? null : st.id; paint(); } });
    return b;
  }
  function paint() {
    const y0 = window.scrollY;
    clear(root);
    const board = h('div', { class: 'board', role: 'group', 'aria-label': 'מעגלי קשר' });
    board.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring" cx="50" cy="50" r="48"/><circle class="ring mid" cx="50" cy="50" r="35"/><circle class="ring" cx="50" cy="50" r="21"/><circle class="core" cx="50" cy="50" r="7"/></svg>`;
    board.append(h('span', { class: 'core-t' }, 'אני'));
    [[3, 0.13], [2, 0.275], [1, 0.415]].forEach(([ring, off]) => board.append(h('span', { class: 'ringlabel', style: `top:${(0.5 - off - 0.03) * 100}%` }, `${ring} · ${lab(LINKS, ring)}`)));
    ensurePositions();
    map.students.filter((s) => s.link).forEach((s) => board.append(chipEl(s, { x: s.x, y: s.y })));
    const unplaced = map.students.filter((s) => !s.link);
    const tray = h('div', { class: 'tray' }, unplaced.length ? unplaced.map((s) => chipEl(s, null)) : h('span', { class: 'micro muted' }, 'כל התלמידים הוצבו במעגלים'));
    const legend = h('div', { class: 'row small muted', 'aria-label': 'מקרא המעגלים' }, LINKS.slice().reverse().map((l) => h('span', null, `טבעת ${l.v}: ${l.t}`)));
    const panel = sel ? selPanel(map.students.find((s) => s.id === sel)) : h('p', { class: 'muted small' }, 'גוררים תלמיד/ה לכל מקום במעגל שמתאים, או לוחצים עליו כדי לערוך. הנקודה הסגולה מסמנת דחוף.');
    const addOne = h('input', { class: 'input', placeholder: 'הוספת שם אחד, ואז Enter', 'aria-label': 'הוספת תלמיד/ה', onkeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) { applyNames(parseNames(e.target.value), false); paint(); } } });
    add(root, [mapHead('מעגלי קשר', `${map.cls ? 'כיתה ' + map.cls + '. ' : ''}גוררים כל תלמיד/ה למעגל שמתאים לקשר שלכם איתם. ככל שהשם קרוב יותר למרכז, הקשר חזק יותר.`, '/mapping/circles'), privacyNote(),
      map.students.length ? h('section', { class: 'frame' }, board, legend, h('div', { class: 'stack' }, h('h4', null, 'עדיין לא הוצבו'), tray), panel,
        h('div', { class: 'row' }, h('div', { style: 'flex:1 1 220px' }, addOne), link('/mapping/class', 'הוספת רשימה שלמה', 'btn soft sm'), link('/mapping/helper', 'לא בטוחים? העוזר לקשר', 'btn soft sm')))
        : h('section', { class: 'frame' }, emptyRoster()),
      groupSummary(),
      h('section', { class: 'frame' }, h('h3', null, 'שמירה וגיבוי'), mapActions(paint), h('p', { class: 'small' }, link('/mapping/map', 'לראות את אותה מפה כטבלה', 'btn ghost')))]);
    window.scrollTo(0, y0);
  }
  function selPanel(s) {
    const body = h('div', { class: 'stack' });
    body.append(h('div', { class: 'row between' }, h('h4', null, s.name || '(ללא שם)'), h('button', { class: 'btn ghost sm', onclick: () => { sel = null; paint(); } }, 'סגירה')));
    body.append(field('שם', h('input', { class: 'input', value: s.name, 'aria-label': 'שם התלמיד/ה', onchange: (e) => { s.name = e.target.value.trim(); saveMap(); paint(); } })));
    body.append(h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'קשר'), chipGroup({ options: LINKS, value: s.link, label: 'קשר', onChange: (v) => { s.link = v; saveMap(); paint(); } })));
    body.append(h('div', { class: 'row' }, h('button', { class: 'btn soft sm', 'aria-pressed': String(s.urgent), onclick: () => { s.urgent = !s.urgent; if (!s.urgent) s.word = ''; saveMap(); paint(); } }, s.urgent ? 'להסיר סימון דחוף' : 'סימון כדחוף'),
      s.urgent ? h('select', { class: 'select', style: 'max-width:200px', 'aria-label': 'מילה אחת לדחוף', onchange: (e) => { s.word = e.target.value; saveMap(); paint(); } }, h('option', { value: '' }, 'מילה אחת'), URGENT_WORDS.map((w) => h('option', { value: w, selected: s.word === w }, w))) : null));
    body.append(h('div', { class: 'row' }, h('span', { class: 'small' }, 'סבבי שיחות:'), h('div', { class: 'rounds' }, s.rounds.map((on, k) => h('button', { class: 'rbtn', 'aria-pressed': String(on), 'aria-label': `סבב ${k + 1}`, onclick: () => { s.rounds[k] = !s.rounds[k]; saveMap(); paint(); } }))),
      h('button', { class: 'btn ghost sm', onclick: () => { map.students = map.students.filter((x) => x.id !== s.id); sel = null; saveMap(); paint(); } }, 'הסרה מהמפה')));
    return h('div', { class: 'well' }, body);
  }
  paint();
  return root;
}


/* =====================================================================
   כניסה והרשמה ראשונה (קוד אישי)
   ===================================================================== */
function viewEnter(mode, next = '/me') {
  const root = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  let tab = mode === 'manager' ? 'manager' : mode === 'lead' ? 'lead' : lsGet(RETURN_KEY) ? 'back' : 'new';
  let school = (SCHOOLS.find((x) => x.id === lsGet(SCHOOL_KEY)) || {}).id || '';
  let leadFirst = false, managerReset = false;
  const pinInput = (label, auto) => h('input', { class: 'input pin', type: 'password', inputmode: 'numeric', maxlength: '4', autocomplete: auto, 'aria-label': label });
  const textInput = (label, extra = {}) => h('input', { class: 'input', 'aria-label': label, ...extra });
  const schoolPick = () => h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'בית הספר'), chipGroup({ options: SCHOOLS.map((s) => ({ v: s.id, t: s.name })), value: school, label: 'בית ספר', onChange: (v) => { school = v; } }));

  // שליחה אל השרת: מנטרלת את הכפתור בזמן ההמתנה ומציגה את הודעת השגיאה של השרת כמו שהיא
  const submitter = (err, btn, run) => async (e) => {
    e.preventDefault(); err.textContent = '';
    btn.disabled = true;
    try { await run(); } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
  };
  const pinsOk = (pin, pin2, err) => {
    if (!/^[0-9]{4}$/.test(pin.value)) { err.textContent = 'הקוד האישי הוא ארבע ספרות.'; return false; }
    if (pin.value !== pin2.value) { err.textContent = 'שני הקודים צריכים להיות זהים.'; return false; }
    return true;
  };
  const done = async (res, to, fresh) => { await enter(res.user); justRegistered = !!fresh; if (res.user.role !== 'manager') { lsSet(RETURN_KEY, '1'); if (school) lsSet(SCHOOL_KEY, school); } go(to); };

  function paint() {
    clear(root);
    const staffTab = tab === 'lead' || tab === 'manager';
    const tabs = h('div', { class: 'stack', style: 'gap:10px' }, chipGroup({ options: staffTab ? [{ v: 'lead', t: 'מובילה זמן לחינוך' }, { v: 'manager', t: 'מנהלת התכנית' }] : [{ v: 'new', t: 'זו הפעם הראשונה שלי' }, { v: 'back', t: 'כבר יש לי קוד' }], value: tab, label: 'סוג כניסה', onChange: (v) => { tab = v; paint(); } }),
      h('div', null, h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { tab = staffTab ? (lsGet(RETURN_KEY) ? 'back' : 'new') : 'lead'; paint(); } }, staffTab ? 'חזרה לכניסת מחנכות' : 'מובילה או מנהלת התכנית? כניסת צוות')));
    const err = h('p', { class: 'err', role: 'alert' });
    const keep = h('input', { type: 'checkbox', id: 'keep' });
    const keepRow = h('label', { class: 'row small', for: 'keep', style: 'gap:8px' }, keep, 'להישאר מחוברים במכשיר הזה (לא במחשב משותף)');
    const submitBtn = (t) => h('button', { class: 'btn', type: 'submit' }, t);
    let form;

    if (tab === 'new' || (tab === 'lead' && leadFirst)) {
      const role = tab === 'lead' ? 'lead' : 'educator';
      const name = textInput('שם מלא', { autocomplete: 'name', placeholder: 'שם פרטי ושם משפחה' });
      const join = textInput(role === 'lead' ? 'קוד הצטרפות של המובילות' : 'קוד הצטרפות של בית הספר', { dir: 'ltr', style: 'text-align:right;text-transform:uppercase', maxlength: '8', autocomplete: 'off', autocapitalize: 'characters', placeholder: 'XXX-XXX' });
      const pin = pinInput('בחירת קוד אישי', 'new-password'), pin2 = pinInput('אימות הקוד', 'new-password');
      const btn = submitBtn('יצירת קוד וכניסה');
      form = h('form', { class: 'stack', style: 'gap:20px', onsubmit: (e) => {
        if (!school) { e.preventDefault(); err.textContent = 'יש לבחור בית ספר.'; return; }
        if (name.value.trim().replace(/\s+/g, ' ').length < 2) { e.preventDefault(); err.textContent = 'יש לכתוב שם.'; return; }
        if (!join.value.trim()) { e.preventDefault(); err.textContent = 'יש להזין את קוד ההצטרפות.'; return; }
        if (!pinsOk(pin, pin2, err)) { e.preventDefault(); return; }
        submitter(err, btn, async () => done(await api('POST', `/api/auth/${role}/register`, { school, name: name.value, joinCode: join.value, code: pin.value, remember: keep.checked }), role === 'lead' ? (next.startsWith('/lead') ? next : '/lead') : next, true))(e);
      } },
      tab === 'lead' ? h('p', { class: 'muted' }, 'זו הכניסה הראשונה שלך כמובילה. מזינים את קוד ההצטרפות של המובילות, שמקבלים ממנהלת התכנית, ובוחרים קוד אישי בן ארבע ספרות.') : null,
      schoolPick(),
      field('שם מלא', name, 'כך תיכנסו בפעמים הבאות, ולכן כדאי לכתוב אותו כמו שאתם כותבים אותו תמיד.'),
      field(role === 'lead' ? 'קוד הצטרפות של המובילות' : 'קוד הצטרפות של בית הספר', join, role === 'lead' ? 'את הקוד מקבלת המובילה ממנהלת התכנית.' : 'את הקוד מקבלים ממנהלת התכנית (למשל במפגש הליווי). הוא מוודא שרק מחנכות של התכנית נרשמות.'),
      h('div', { class: 'grid' }, field('בחירת קוד אישי', pin, 'ארבע ספרות שקל לכם לזכור.'), field('אימות הקוד', pin2)),
      tab === 'lead' ? h('div', null, h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { leadFirst = false; paint(); } }, 'כבר יש לי קוד')) : null,
      keepRow, err, h('div', null, btn));
    } else if (tab === 'back' || tab === 'lead') {
      const role = tab === 'lead' ? 'lead' : 'educator';
      const name = textInput('שם', { autocomplete: 'name', placeholder: 'שם פרטי ושם משפחה' });
      const pin = pinInput('קוד אישי', 'current-password');
      const btn = submitBtn('כניסה');
      form = h('form', { class: 'stack', style: 'gap:20px', onsubmit: (e) => {
        if (!school) { e.preventDefault(); err.textContent = 'יש לבחור בית ספר.'; return; }
        if (name.value.trim().length < 2) { e.preventDefault(); err.textContent = 'יש לכתוב שם.'; return; }
        submitter(err, btn, async () => done(await api('POST', `/api/auth/${role}/login`, { school, name: name.value, code: pin.value, remember: keep.checked }), role === 'lead' ? (next.startsWith('/lead') ? next : '/lead') : next, false))(e);
      } },
      schoolPick(), field('שם', name, 'כמו שנרשמתם בפעם הראשונה.'), field('קוד אישי', pin, 'שכחתם את הקוד? מנהלת התכנית יכולה לאפס אותו.'),
      tab === 'lead' ? h('div', null, h('button', { class: 'btn ghost sm', type: 'button', onclick: () => { leadFirst = true; paint(); } }, 'זו הכניסה הראשונה שלי כמובילה')) : null,
      keepRow, err, h('div', null, btn));
    } else if (pub.setupNeeded) {
      const code = textInput('קוד הקמה', { type: 'password', autocomplete: 'off' });
      const name = textInput('שם', { autocomplete: 'name' }), email = textInput('דואל', { type: 'email', autocomplete: 'username', dir: 'ltr', style: 'text-align:right' });
      const pw = textInput('סיסמה', { type: 'password', autocomplete: 'new-password' }), pw2 = textInput('אימות הסיסמה', { type: 'password', autocomplete: 'new-password' });
      const btn = submitBtn('יצירת החשבון וכניסה');
      form = h('form', { class: 'stack', style: 'gap:20px', onsubmit: (e) => {
        if (pw.value !== pw2.value) { e.preventDefault(); err.textContent = 'שתי הסיסמאות צריכות להיות זהות.'; return; }
        submitter(err, btn, async () => { const res = await api('POST', '/api/auth/manager/setup', { setupCode: code.value, name: name.value, email: email.value, password: pw.value }); await refreshPublic(); await done(res, '/admin', false); })(e);
      } },
      h('p', { class: 'muted' }, 'עדיין אין מנהלת תכנית. מזינים את קוד ההקמה (SETUP_CODE, שהוגדר בהגדרות הפרויקט ב-Vercel) ובוחרים שם, דואל וסיסמה.'),
      field('קוד הקמה', code), h('div', { class: 'grid' }, field('שם', name), field('דואל', email)), h('div', { class: 'grid' }, field('סיסמה', pw, 'לפחות 10 תווים.'), field('אימות הסיסמה', pw2)), err, h('div', null, btn));
    } else if (managerReset) {
      // סיסמה שנשכחה: קוד ההקמה (SETUP_CODE) מוגדר בהגדרות הפרויקט, ומי שמכירה אותו בוחרת סיסמה חדשה
      const code = textInput('קוד הקמה', { type: 'password', autocomplete: 'off' });
      const email = textInput('דואל', { type: 'email', autocomplete: 'username', dir: 'ltr', style: 'text-align:right' });
      const pw = textInput('סיסמה חדשה', { type: 'password', autocomplete: 'new-password' }), pw2 = textInput('אימות הסיסמה', { type: 'password', autocomplete: 'new-password' });
      const btn = submitBtn('בחירת סיסמה חדשה וכניסה');
      form = h('form', { class: 'stack', style: 'gap:20px', onsubmit: (e) => {
        if (pw.value !== pw2.value) { e.preventDefault(); err.textContent = 'שתי הסיסמאות צריכות להיות זהות.'; return; }
        submitter(err, btn, async () => done(await api('POST', '/api/auth/manager/reset', { setupCode: code.value, email: email.value, password: pw.value }), '/admin', false))(e);
      } },
      h('p', { class: 'muted' }, 'מזינים את קוד ההקמה (SETUP_CODE), שמופיע בהגדרות הפרויקט ב-Vercel, את הדואל של מנהלת התכנית וסיסמה חדשה.'),
      field('קוד הקמה', code), field('דואל', email), h('div', { class: 'grid' }, field('סיסמה חדשה', pw, 'לפחות 10 תווים.'), field('אימות הסיסמה', pw2)), err,
      h('div', { class: 'row' }, btn, h('button', { class: 'btn ghost', type: 'button', onclick: () => { managerReset = false; paint(); } }, 'חזרה לכניסה')));
    } else {
      const email = textInput('דואל', { type: 'email', autocomplete: 'username', dir: 'ltr', style: 'text-align:right' });
      const pw = textInput('סיסמה', { type: 'password', autocomplete: 'current-password' });
      const btn = submitBtn('כניסה');
      form = h('form', { class: 'stack', style: 'gap:20px', onsubmit: submitter(err, btn, async () => done(await api('POST', '/api/auth/manager/login', { email: email.value, password: pw.value }), '/admin', false)) },
        field('דואל', email), field('סיסמה', pw), err,
        h('div', { class: 'row' }, btn, h('button', { class: 'btn ghost', type: 'button', onclick: () => { managerReset = true; paint(); } }, 'שכחתי סיסמה')));
    }

    const leadCtx = tab === 'lead' || next.startsWith('/lead');
    const ctxTitle = leadCtx ? 'כניסה למובילות זמן לחינוך' : tab === 'manager' ? 'כניסה למנהלת התכנית' : next.startsWith('/mapping') ? 'כניסה למיפוי הכיתה' : 'כניסה לשיחות אישיות';
    const ctxText = leadCtx ? 'נכנסים בשם ובקוד אישי. בפעם הראשונה נרשמים עם קוד ההצטרפות של המובילות.'
      : tab === 'manager' ? 'כניסה בדואל ובסיסמה.'
        : tab === 'back' ? 'נכנסים עם בית ספר, שם והקוד האישי.'
          : 'בוחרים בית ספר, מזינים את קוד ההצטרפות שקיבלתם מהתכנית ובוחרים קוד אישי בן ארבע ספרות.';
    add(root, [h('section', { class: 'frame' }, h('h2', null, ctxTitle), h('p', { class: 'muted', style: 'max-width:56ch' }, ctxText), tabs), h('section', { class: 'frame' }, form)]);
  }
  paint();
  return root;
}


/* =====================================================================
   אזור המחנכת
   ===================================================================== */
// החלפת קוד אישי (מחנכת או מובילה): דורשת את הקוד הנוכחי, ומנתקת מכשירים אחרים
function changeCodeBox() {
  const box = h('div', { class: 'stack' });
  const open = () => {
    clear(box);
    const cur = h('input', { class: 'input pin', type: 'password', inputmode: 'numeric', maxlength: '4', autocomplete: 'current-password', 'aria-label': 'הקוד הנוכחי' });
    const n1 = h('input', { class: 'input pin', type: 'password', inputmode: 'numeric', maxlength: '4', autocomplete: 'new-password', 'aria-label': 'קוד חדש' });
    const err = h('p', { class: 'err', role: 'alert' });
    const btn = h('button', { class: 'btn sm', type: 'submit' }, 'החלפה');
    box.append(h('form', { class: 'well stack', onsubmit: async (ev) => {
      ev.preventDefault(); err.textContent = '';
      if (!/^[0-9]{4}$/.test(n1.value)) return void (err.textContent = 'הקוד החדש הוא ארבע ספרות.');
      btn.disabled = true;
      try { await api('POST', '/api/me/code', { current: cur.value, next: n1.value }); clear(box); toast('הקוד הוחלף. מכשירים אחרים נותקו.'); } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    } }, h('div', { class: 'grid' }, field('הקוד הנוכחי', cur), field('קוד חדש', n1)), err,
      h('div', { class: 'row' }, btn, h('button', { class: 'btn soft sm', type: 'button', onclick: () => clear(box) }, 'ביטול'))));
  };
  return { box, open };
}

function viewMe() {
  return asyncView(loadMe, () => {
    const e = session;
    const weeks = weeksBetween(joinWeek(), CUR_WEEK).reverse();
    const done = weeks.filter((w) => myReport(w)).length;
    const convs = myReports.reduce((n, r) => n + r.convs.length, 0);
    const cur = myReport(CUR_WEEK);
    const root = [];
    if (justRegistered) { justRegistered = false; root.push(h('div', { class: 'frame' }, h('div', { class: 'row' }, ic('check', { size: 30 }), h('h4', null, 'הקוד נשמר')), h('p', null, 'בפעם הבאה נכנסים עם בית ספר, שם והקוד שבחרתם.'))); }
    root.push(h('section', { class: 'frame lead' }, h('p', { class: 'small muted' }, e.schoolName),
      h('div', { class: 'week-hero' }, h('div', { class: 'stack' }, h('h1', null, `שלום ${firstName(e.name)}`), h('p', { style: 'font-size:19px' }, `שבוע ${weekNo(CUR_WEEK)} · ${weekLabel(CUR_WEEK)}`),
        h('p', null, cur ? (cur.convs.length ? `המבט לשבוע הזה נשמר: ${nConv(cur.convs.length)}. אפשר לערוך עד סוף השבוע.` : 'המבט לשבוע הזה נשמר: שבוע בלי שיחות. אפשר לערוך עד סוף השבוע.') : 'המבט לשבוע הזה עדיין לא נשלח. זה לוקח כדקה.')),
        h('div', null, link(`/me/report/${CUR_WEEK}`, cur ? 'עריכת המבט' : 'שיחות אישיות שקיימתי השבוע', 'btn white')))));
    const list = h('div', { class: 'weeklist' }, weeks.map((w) => {
      const r = myReport(w);
      return h('div', { class: 'weekrow' }, h('div', null, h('b', null, `שבוע ${weekNo(w)}`), ` · ${weekLabel(w)}`, w === CUR_WEEK ? h('span', { class: 'tag', style: 'margin-inline-start:8px' }, 'השבוע') : null),
        r ? h('span', { class: 'tag lead' }, ic('check', { size: 14, tone: 'white' }), nConv(r.convs.length)) : h('span', { class: 'tag todo' }, 'טרם נשלח'),
        link(`/me/report/${w}`, r ? 'צפייה ועריכה' : w === CUR_WEEK ? 'שיחות אישיות שקיימתי השבוע' : 'שיחות אישיות שקיימתי בשבוע הזה', r ? 'btn soft sm' : 'btn sm'));
    }));
    root.push(h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('h3', null, 'השבועות שלי'), h('span', { class: 'small muted' }, `שבועות שנשלחו: ${done} מתוך ${weeks.length} · ${nConv(convs)}`)), list));
    const cc = changeCodeBox();
    root.push(h('section', { class: 'frame' }, h('h3', null, 'החשבון שלי'), h('p', { class: 'muted' }, `${e.name} · ${e.schoolName}`),
      h('div', { class: 'row' }, link('/tools', 'לארגז הכלים', 'btn soft sm'), link('/mapping', 'למיפוי הכיתה', 'btn soft sm'), h('button', { class: 'btn soft sm', onclick: cc.open }, 'החלפת קוד'), h('button', { class: 'btn soft sm', onclick: logout }, 'יציאה')), cc.box));
    return root;
  });
}

function newConv() { return { round: null, axis: null, axisOther: '', kind: null, kindOther: '', depth: null, talk: null, feeling: null, note: '' }; }
// שיחה ממבט ישן (לפני שתי שאלות הציר) נחשבת שלמה גם בלעדיהן. אפשר להשלים אותן, אבל לא חייבים.
const convDone = (c) => !!(c.round && c.axis && (c.axis !== 'other' || c.axisOther.trim()) && c.kind && (c.kind !== 'other' || c.kindOther.trim()) && (c.legacy || (c.depth && c.talk)) && c.feeling);

function viewReport(week) {
  const e = session;
  if (week > CUR_WEEK || week < joinWeek()) return h('section', { class: 'frame' }, h('h2', null, 'השבוע הזה לא פתוח למבט'), link('/me', 'חזרה למבט שלי'));
  const existing = myReport(week);
  // טיוטה של מבט שעוד לא נשלח נשמרת רק במכשיר הזה, ונמחקת כשהמבט נשלח
  const dkey = `${DRAFT_KEY}.${e.id}.${week}`;
  const saved = (() => { try { return JSON.parse(lsGet(dkey) || 'null'); } catch { return null; } })();
  const draft = JSON.parse(JSON.stringify(saved && Array.isArray(saved.convs) ? saved : existing ? { convs: existing.convs.map((c) => ({ ...c, legacy: c.depth == null && c.talk == null })), noneReason: existing.noneReason || '' } : { convs: [], noneReason: '' }));
  // טיוטה ישנה מהמכשיר: "שיחת עומק" כבר לא ברשימה, ולכן עוברת ל"אחר" עם אותו טקסט
  draft.convs.forEach((c) => { if (c.kind === 'deep') { c.kind = 'other'; c.kindOther = c.kindOther || 'שיחת עומק'; } });
  const root = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  const cardsHost = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  const noneHost = h('div');
  const countOut = h('output', { 'aria-live': 'polite' });
  const minus = h('button', { class: '', type: 'button', 'aria-label': 'פחות שיחה אחת' }, '−');
  const plus = h('button', { type: 'button', 'aria-label': 'עוד שיחה' }, '+');
  const submit = h('button', { class: 'btn', type: 'button' }, existing ? 'שמירת השינויים' : 'שליחת המבט השבועי');
  const summary = h('p', { class: 'muted' });
  const savedNote = h('span', { class: 'micro muted' });
  const submitHost = h('div', { class: 'stack' });
  const errBox = h('p', { class: 'err', role: 'alert' });
  let t = null, sending = false;
  const persist = () => { lsSet(dkey, JSON.stringify(draft)); savedNote.textContent = 'הטיוטה נשמרה במכשיר'; };
  const touch = () => { clearTimeout(t); savedNote.textContent = ''; t = setTimeout(persist, 500); status(); };
  const badges = [];
  function status() {
    const n = draft.convs.length, ok = draft.convs.filter(convDone).length;
    countOut.textContent = String(n);
    minus.disabled = n === 0; plus.disabled = n >= 15;
    summary.textContent = n === 0 ? 'גם שבוע בלי שיחות אישיות נספר.' : `${ok} מתוך ${n} שיחות הושלמו.`;
    submit.disabled = ok < n || sending;
    badges.forEach((b, i) => { if (!b) return; clear(b); const d = draft.convs[i] && convDone(draft.convs[i]); b.className = d ? 'tag lead' : 'tag todo'; add(b, d ? [ic('check', { size: 14, tone: 'white' }), 'הושלמה'] : ['חסרות תשובות']); });
    clear(noneHost);
    if (n === 0) {
      noneHost.append(h('div', { class: 'well stack' }, h('p', null, 'אפשר לדלג על שאלות נוספות. אם רוצים, אפשר לסמן מה הפריע (לא חובה).'),
        chipGroup({ options: NONE_REASONS, value: draft.noneReason, label: 'מה הפריע', cls: 'sm', onChange: (v) => { draft.noneReason = v; touch(); } })));
    }
  }
  function buildCards() {
    clear(cardsHost); badges.length = 0;
    draft.convs.forEach((c, i) => {
      const warn = h('p', { class: 'warn-note', hidden: true });
      const checkNames = () => { const names = findNames([c.note, c.axisOther, c.kindOther].join(' ')); warn.hidden = !names.length; warn.textContent = names.length ? `נראה שמופיע שם (${names.join(', ')}). המבט לא צריך שמות תלמידים: אפשר לכתוב "התלמיד/ה".` : ''; };
      const badge = h('span'); badges[i] = badge;
      const axisOther = h('input', { class: 'input', placeholder: 'על מה דיברתם?', value: c.axisOther, hidden: c.axis !== 'other', maxlength: '120', 'aria-label': 'ציר אחר', oninput: (ev) => { c.axisOther = ev.target.value; checkNames(); touch(); } });
      const kindOther = h('input', { class: 'input', placeholder: 'איזו שיחה זו הייתה?', value: c.kindOther, hidden: c.kind !== 'other', maxlength: '120', 'aria-label': 'אופי אחר', oninput: (ev) => { c.kindOther = ev.target.value; checkNames(); touch(); } });
      const note = h('textarea', { class: 'textarea', placeholder: 'תובנה, שאלה שיצאתם איתה, רעיון…', value: c.note, maxlength: '1000', 'aria-label': 'עוד משהו חשוב להוסיף', oninput: (ev) => { c.note = ev.target.value; checkNames(); touch(); } });
      note.value = c.note;
      const q = (n, label, ...body) => h('div', { class: 'q' }, h('div', { class: 'qlabel' }, h('span', { class: 'qn' }, String(n)), label), ...body);
      cardsHost.append(h('section', { class: 'frame conv' }, h('div', { class: 'conv-head' }, h('h3', null, `שיחה ${i + 1}`), badge),
        q(1, 'איזה סבב זה עם התלמיד/ה?', chipGroup({ options: ROUNDS, value: c.round, label: 'סבב', onChange: (v) => { c.round = v; touch(); } })),
        q(2, 'על איזה ציר דיברתם?', chipGroup({ options: AXES, value: c.axis, label: 'ציר השיחה', onChange: (v) => { c.axis = v; axisOther.hidden = v !== 'other'; touch(); } }), axisOther),
        q(3, 'איזה סוג שיחה זו הייתה?', chipGroup({ options: KINDS, value: c.kind, label: 'סוג השיחה', onChange: (v) => { c.kind = v; kindOther.hidden = v !== 'other'; touch(); } }), kindOther),
        q(4, DEPTH_SCALE.q, scaleGroup({ scale: DEPTH_SCALE, value: c.depth, onChange: (v) => { c.depth = v; touch(); } })),
        q(5, TALK_SCALE.q, scaleGroup({ scale: TALK_SCALE, value: c.talk, onChange: (v) => { c.talk = v; touch(); } })),
        q(6, 'איך יצאתם מהשיחה?', moodGroup({ value: c.feeling, onChange: (v) => { c.feeling = v; touch(); } }), h('div', { class: 'field' }, h('label', { class: 'hint', for: (note.id = nid('n')) }, 'עוד משהו חשוב להוסיף? (לא חובה)'), note), warn)));
      checkNames();
    });
    status();
  }
  function setCount(n) {
    if (n > draft.convs.length) { while (draft.convs.length < n) draft.convs.push(newConv()); buildCards(); touch(); return; }
    const last = draft.convs[draft.convs.length - 1];
    const hasData = last && (last.round || last.axis || last.kind || last.depth || last.talk || last.feeling || last.note.trim());
    const doRemove = () => { draft.convs.pop(); buildCards(); touch(); };
    if (hasData) confirmInline(countHost, `למחוק את שיחה ${draft.convs.length} ואת מה שנכתב בה?`, 'מחיקה', doRemove); else doRemove();
  }
  minus.addEventListener('click', () => setCount(draft.convs.length - 1));
  plus.addEventListener('click', () => setCount(draft.convs.length + 1));
  const countHost = h('div', { class: 'stack' });
  submit.addEventListener('click', () => {
    const doSubmit = async () => {
      sending = true; errBox.textContent = ''; status();
      try {
        const res = await api('PUT', `/api/me/reports/${week}`, { convs: draft.convs, noneReason: draft.convs.length ? '' : draft.noneReason });
        const i = myReports.findIndex((r) => r.week === week);
        if (i >= 0) myReports[i] = res.report; else myReports.push(res.report);
        lsDel(dkey);
        clear(root);
        root.append(h('section', { class: 'frame lead' }, ic('check', { size: 44, tone: 'white' }), h('h2', null, 'תודה'), h('p', { style: 'font-size:19px' }, `המבט לשבוע ${weekNo(week)} (${weekLabel(week)}) נשמר: ${nConv(res.report.convs.length)}.`),
          h('div', { class: 'row' }, link('/me', 'למבט שלי', 'btn white'), link('/tools', 'לארגז הכלים', 'btn soft'))));
        window.scrollTo(0, 0);
      } catch (ex) { sending = false; errBox.textContent = ex.message; status(); }
    };
    const named = draft.convs.some((c) => findNames([c.note, c.axisOther, c.kindOther].join(' ')).length);
    if (named) confirmInline(submitHost, 'נראה שמופיעים שמות בהערות. הכלל: אין שמות תלמידים. לשלוח בכל זאת?', 'שליחה בכל זאת', doSubmit); else doSubmit();
  });
  add(root, [
    h('section', { class: 'frame' }, h('div', null, link('/me', 'המבט שלי', 'btn ghost')), h('p', { class: 'small muted' }, `שבוע ${weekNo(week)}`), h('h2', null, weekLabel(week)),
      h('p', { class: 'muted', style: 'max-width:56ch' }, 'מבט קצר על השיחות האישיות של השבוע. בלי שמות תלמידים, ובלי פרטים מזהים.'),
      week < CUR_WEEK ? h('div', { class: 'tag', style: 'align-self:flex-start' }, 'מבט לשבוע שעבר') : null),
    h('section', { class: 'frame' }, h('h3', null, 'כמה שיחות אישיות קיימתם השבוע?'), h('div', { class: 'row' }, h('div', { class: 'stepper' }, minus, countOut, plus), summary), countHost, noneHost),
    cardsHost,
    h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('div', { class: 'row' }, submit, savedNote)), errBox, submitHost)]);
  buildCards();
  return root;
}


/* =====================================================================
   מנהלת התכנית והמובילות
   כל החישובים והסינון נעשים בשרת: מובילה מקבלת רק את בית הספר שלה, ובברירת מחדל רק נתונים מצטברים
   (בלי שמות ובלי הערות חופשיות, וערכים קטנים מ-5 לא נשלחים אליה בכלל).
   ===================================================================== */
const K_MIN = 5;
const adm = { week: null, school: 'all', notesSchool: 'all', notesFeeling: 'all', notesAxis: 'all' };
const SC_ADMIN = { api: '/api/admin', base: '/admin', admin: true };
const SC_LEAD = { api: '/api/lead', base: '/lead', admin: false };
const scopeSchool = (sc) => (sc.admin ? adm.school : null);

function distRows(list, options) {
  return list.map((d) => { const o = options.find((x) => x.v === d.v); return { t: o.e ? `${o.e} ${o.t}` : o.t, n: d.n, hidden: !!d.hidden }; });
}
function barRows(rows) {
  const max = Math.max(1, ...rows.map((r) => (r.hidden ? 0 : r.n)));
  return h('div', { class: 'bars' }, rows.map((r) => h('div', { class: 'brow' }, h('span', { class: 't' }, r.t), h('div', { class: 'bar-track' }, r.hidden ? null : h('div', { class: 'bar-fill', style: `width:${(r.n / max) * 100}%` })), h('span', { class: 'n' + (r.hidden ? ' hid' : '') }, r.hidden ? `פחות מ-${K_MIN}` : String(r.n)))));
}
function columns(items, curIdx) {
  const max = Math.max(1, ...items.map((i) => i.v));
  return h('div', { role: 'img', 'aria-label': 'תרשים עמודות לפי שבוע' }, h('div', { class: 'cols' }, items.map((i, k) => h('div', { class: 'col' }, h('span', { class: 'v' }, i.label), h('div', { class: 'b' + (k === curIdx ? ' cur' : ''), style: `height:${(i.v / max) * 100}%` })))),
    h('div', { class: 'col-labels' }, items.map((i) => h('span', null, i.w))));
}
function schoolPills(get, set) {
  return chipGroup({ options: [{ v: 'all', t: 'כל בתי הספר' }, ...SCHOOLS.map((s) => ({ v: s.id, t: s.name }))], value: get(), cls: 'sm', label: 'סינון לפי בית ספר', onChange: (v) => { set(v); render(); } });
}
// מובילה שההרשאה לשמות נסגרה לה (או שהיא פתחה כתובת שלא מתאימה לה) חוזרת לסקירה
const backToLead = (sc) => (err) => { if (err.status === 403 && !sc.admin) { setTimeout(() => refreshPublic().then(() => go(sc.base)), 0); return true; } return false; };

function viewAdmin(p) {
  const sub = p.replace(/^\/admin\/?/, '');
  const tabs = [['', 'סקירה שבועית'], ['educators', 'מחנכות'], ['leads', 'מובילות וקודים'], ['notes', 'תובנות ושאלות'], ['tools', 'ארגז כלים'], ['export', 'ייצוא'], ['audit', 'יומן גישה'], ['account', 'החשבון שלי']];
  const nav = h('nav', { class: 'frame', 'aria-label': 'ניווט מנהלת התכנית' }, h('div', { class: 'row between' }, h('div', { class: 'row' }, ic('data', { size: 30 }), h('h2', null, 'מנהלת התכנית')), h('span', { class: 'tag' }, 'גישה לכל המידע של כל המחנכות')),
    h('div', { class: 'nav' }, tabs.map(([to, t]) => { const path = '/admin' + (to ? '/' + to : ''); const act = (to === '' ? sub === '' : sub === to || sub.startsWith(to + '/')); return h('a', { href: '#' + path, 'aria-current': act ? 'page' : null, onclick: (e) => { e.preventDefault(); go(path); } }, t); })));
  let body, m;
  if (sub === '') body = adminOverview(SC_ADMIN);
  else if (sub === 'educators') body = adminEducators(SC_ADMIN);
  else if ((m = /^educators\/(.+)$/.exec(sub))) body = adminEducator(m[1], SC_ADMIN);
  else if (sub === 'leads') body = adminLeads();
  else if (sub === 'notes') body = adminNotes(SC_ADMIN);
  else if (sub === 'tools') body = adminTools();
  else if (sub === 'export') body = adminExport();
  else if (sub === 'audit') body = adminAudit();
  else if (sub === 'account') body = adminAccount();
  else body = h('section', { class: 'frame' }, h('h3', null, 'העמוד לא נמצא'));
  return h('div', { class: 'stack', style: 'gap:var(--gap)' }, nav, body);
}

function viewLead(p) {
  const sub = p.replace(/^\/lead\/?/, '');
  // ההרשאה (מצטבר או עם שמות) נקבעת בשרת. כאן מרעננים אותה כדי שהלשוניות יתאימו למה שהשרת יאפשר.
  return asyncView(refreshPublic, () => {
    const l = session, names = pub.leadSeesNames;
    const tabs = names ? [['', 'סקירה שבועית'], ['educators', 'מחנכות'], ['notes', 'תובנות ושאלות']] : [];
    const head = h('section', { class: 'frame' },
      h('div', { class: 'row between' }, h('div', { class: 'row' }, ic('school', { size: 30 }), h('h2', null, 'מובילה זמן לחינוך')), h('span', { class: 'tag' }, 'רק בית הספר שלך')),
      h('p', { class: 'muted' }, `${l.name} · ${l.schoolName}`),
      h('p', { class: 'small muted' }, names ? 'רואים את הנתונים של בית הספר שלך בלבד, כולל שמות המחנכות וההערות החופשיות.' : 'רואים נתונים מצטברים של בית הספר שלך בלבד: בלי שמות מחנכות ובלי הערות חופשיות. ערכים קטנים מ-5 מוסתרים.'),
      tabs.length ? h('div', { class: 'nav' }, tabs.map(([to, tx]) => { const path = '/lead' + (to ? '/' + to : ''); const act = to === '' ? sub === '' : sub === to || sub.startsWith(to + '/'); return h('a', { href: '#' + path, 'aria-current': act ? 'page' : null, onclick: (e) => { e.preventDefault(); go(path); } }, tx); })) : null);
    let body, m;
    if (names && sub === 'educators') body = adminEducators(SC_LEAD);
    else if (names && (m = /^educators\/(.+)$/.exec(sub))) body = adminEducator(m[1], SC_LEAD);
    else if (names && sub === 'notes') body = adminNotes(SC_LEAD);
    else body = adminOverview(SC_LEAD);
    const cc = changeCodeBox();
    return [head, body, h('section', { class: 'frame' }, h('h3', null, 'החשבון שלי'), h('div', { class: 'row' }, h('button', { class: 'btn soft sm', onclick: cc.open }, 'החלפת קוד'), h('button', { class: 'btn soft sm', onclick: logout }, 'יציאה')), cc.box)];
  });
}

/* ---------- סקירה שבועית ---------- */
function adminOverview(sc) {
  return asyncView(() => api('GET', `${sc.api}/overview${qs({ week: adm.week, school: scopeSchool(sc) })}`), (d) => paintOverview(d, sc));
}
function paintOverview(d, sc) {
  adm.week = d.week;
  const names = !d.masked;
  const w = d.week, prev = addDays(w, -7), next = addDays(w, 7);
  const nav = h('div', { class: 'row' },
    h('button', { class: 'btn soft sm', disabled: prev < d.programStart, onclick: () => { adm.week = prev; render(); } }, h('span', { style: 'display:inline-block;transform:scaleX(-1)' }, ic('chev', { size: 16 })), 'שבוע קודם'),
    h('div', { class: 'stack', style: 'gap:0;text-align:center;min-width:170px' }, h('b', null, `שבוע ${weekNo(w)}`), h('span', { class: 'small muted' }, weekLabel(w))),
    h('button', { class: 'btn soft sm', disabled: next > d.curWeek, onclick: () => { adm.week = next; render(); } }, 'שבוע הבא', ic('chev', { size: 16 })));
  const rate = d.series.map((x) => ({ w: shortDate(x.week), v: x.rate || 0, label: x.rate === null ? '–' : `${x.rate}%` }));
  const convsPerWeek = d.series.map((x) => ({ w: shortDate(x.week), v: x.convs, label: String(x.convs) }));
  const curIdx = d.series.findIndex((x) => x.week === w);
  const remind = `שלום, תזכורת קצרה: המבט השבועי של זמן לחינוך לשבוע ${weekLabel(w)} עדיין פתוח. הוא לוקח כדקה. תודה.`;
  const kpi = (label, big, sub, bar) => h('div', { class: 'well stack' }, h('span', { class: 'small muted' }, label), h('div', { class: 'num', style: 'font:900 40px/1 var(--font);color:var(--lead)' }, big), bar ? h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: `width:${d.pct}%` })) : h('span', { class: 'small muted' }, sub));
  const out = [];
  out.push(h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('h3', null, 'סקירה שבועית'), nav),
    sc.admin ? schoolPills(() => adm.school, (v) => { adm.school = v; }) : h('p', { class: 'small muted' }, session.schoolName),
    h('div', { class: 'grid kpis' }, kpi('שלחו מבט השבוע', `${d.reported} מתוך ${d.expected}`, '', true), kpi('שיחות במבטים', String(d.convs), d.reported ? `ממוצע ${(d.convs / d.reported).toFixed(1)} למבט` : '–'), kpi('אחוז שליחה', `${d.pct}%`, w === d.curWeek ? 'השבוע עוד פתוח' : 'שבוע שהסתיים'))));
  if (names) {
    out.push(h('section', { class: 'frame' }, h('h3', null, `טרם שלחו (${d.missing.length})`),
      d.missing.length ? h('div', { class: 'stack' }, h('div', { class: 'chips' }, d.missing.map((e) => h('a', { class: 'tag todo', href: '#' + sc.base + '/educators/' + e.id, style: 'text-decoration:none', onclick: (ev) => { ev.preventDefault(); go(sc.base + '/educators/' + e.id); } }, sc.admin ? `${e.name} · ${e.schoolName.replace('תיכון אורט ', '')}` : e.name))),
        h('div', null, h('button', { class: 'btn soft sm', onclick: () => copyText(remind, 'נוסח התזכורת הועתק') }, 'העתקת נוסח תזכורת'))) : h('div', { class: 'row' }, ic('check', { size: 26 }), h('p', null, 'כל המחנכות שלחו מבט לשבוע הזה.'))));
    const matrix = h('div', { class: 'tablewrap' }, h('table', { class: 'mx' }, h('thead', null, h('tr', null, h('th', null, 'מחנכת'), d.matrix.cols.map((x) => h('th', null, shortDate(x))))),
      h('tbody', null, d.matrix.rows.map((row) => h('tr', null, h('td', null, h('a', { href: '#' + sc.base + '/educators/' + row.id, onclick: (ev) => { ev.preventDefault(); go(sc.base + '/educators/' + row.id); } }, row.name), sc.admin ? h('span', { class: 'micro muted' }, ` · ${row.schoolName.replace('תיכון אורט ', '')}`) : null),
        d.matrix.cols.map((x, i) => { const c = row.cells[i]; if (c === 'na') return h('td', null, h('span', { class: 'na' }, '·')); return h('td', null, c === 'sent' ? h('button', { class: 'cellbtn', 'aria-label': `פתיחת המבט של ${row.name} לשבוע ${shortDate(x)}`, onclick: () => openReportSheet(sc, row.id, x) }, ic('check', { size: 22 })) : h('span', { class: 'miss', title: 'טרם נשלח', 'aria-label': 'טרם נשלח' })); }))))));
    out.push(h('section', { class: 'frame' }, h('h3', null, 'מי שלח ובאילו שבועות'), h('p', { class: 'muted small' }, 'סימון וי: מבט נשלח (לחיצה פותחת אותו). נקודה סגולה: טרם נשלח.'), matrix));
  } else {
    out.push(h('section', { class: 'frame' }, h('h3', null, `טרם שלחו: ${d.missingCount}`), h('p', { class: 'muted' }, 'מספר המחנכות בבית הספר שעוד לא שלחו מבט לשבוע הזה. שמות המחנכות לא מוצגים.')));
  }
  if (d.mapping) {
    const m = d.mapping, usedIds = new Set(m.users.map((u) => u.id));
    const notUsed = (d.matrix ? d.matrix.rows : []).filter((r) => !usedIds.has(r.id));
    const chip = (u, cls) => h('a', { class: cls, href: '#' + sc.base + '/educators/' + u.id, style: 'text-decoration:none', onclick: (ev) => { ev.preventDefault(); go(sc.base + '/educators/' + u.id); } }, sc.admin ? `${u.name} · ${u.schoolName.replace('תיכון אורט ', '')}` : u.name);
    out.push(h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('h3', null, 'מיפוי הכיתה: מי משתמשת'), h('span', { class: 'tag' }, 'רואים רק שימוש, בלי תוכן')),
      h('div', { class: 'grid kpis' }, kpi('פתחו את המיפוי', `${m.opened} מתוך ${m.of}`, 'לפחות פעם אחת'), kpi('התחילו למפות', `${m.started} מתוך ${m.of}`, 'יש רשימה של תלמידים')),
      h('div', { class: 'stack' }, h('h4', null, `השתמשו (${m.users.length})`),
        m.users.length ? h('div', { class: 'chips' }, m.users.map((u) => chip(u, u.started ? 'tag lead' : 'tag'))) : h('p', { class: 'muted small' }, 'עדיין אף מחנכת לא פתחה את המיפוי.'),
        h('p', { class: 'micro muted' }, 'כחול: התחילה למפות (יש רשימה). אפור: נכנסה למיפוי בלי רשימה עדיין.')),
      notUsed.length ? h('div', { class: 'stack' }, h('h4', null, `עוד לא פתחו (${notUsed.length})`), h('div', { class: 'chips' }, notUsed.map((r) => chip({ id: r.id, name: r.name, schoolName: r.schoolName }, 'tag todo')))) : null,
      h('p', { class: 'small muted' }, 'המיפוי עצמו (שמות התלמידים, המעגלים והסימונים) נשאר במכשיר של כל מחנכת, ואין לך גישה אליו. השרת מקבל רק את העובדה שנפתח, ומתי.')));
  }
  out.push(h('div', { class: 'grid' },
    h('section', { class: 'frame' }, h('h3', null, 'אחוז השליחה לפי שבוע'), columns(rate, curIdx)),
    h('section', { class: 'frame' }, h('h3', null, 'שיחות לפי שבוע'), columns(convsPerWeek, curIdx))));
  out.push(h('div', { class: 'grid' },
    h('section', { class: 'frame' }, h('h3', null, 'לפי סבב'), barRows(distRows(d.dist.round, ROUNDS))),
    h('section', { class: 'frame' }, h('h3', null, 'לפי ציר'), barRows(distRows(d.dist.axis, AXES))),
    h('section', { class: 'frame' }, h('h3', null, 'לפי סוג שיחה'), barRows(distRows(d.dist.kind, KINDS))),
    h('section', { class: 'frame' }, h('h3', null, 'אופי השיחה'), h('p', { class: 'small muted' }, 'מאינפורמטיבית (1) עד מעמיקה (5)'), barRows(distRows(d.dist.depth, scaleOpts(DEPTH_SCALE)))),
    h('section', { class: 'frame' }, h('h3', null, 'מי דיבר יותר'), h('p', { class: 'small muted' }, 'מאני דיברתי (1) עד התלמיד/ה דיברו (5)'), barRows(distRows(d.dist.talk, scaleOpts(TALK_SCALE)))),
    h('section', { class: 'frame' }, h('h3', null, 'איך יצאו מהשיחה'), barRows(distRows(d.dist.feeling, FEELINGS)))));
  out.push(h('p', { class: 'muted small' }, d.masked ? 'ההתפלגויות מתחילת התכנית, לבית הספר שלך. ערכים קטנים מ-5 מוסתרים. אין כאן שום מידע על תלמידים.' : 'ההתפלגויות מתחילת התכנית, לפי בית הספר שנבחר. אין כאן שום מידע על תלמידים.'));
  return out;
}

function convLine(c) {
  const ax = c.axis === 'other' ? `אחר: ${c.axisOther}` : lab(AXES, c.axis), kd = c.kind === 'other' ? `אחר: ${c.kindOther}` : lab(KINDS, c.kind);
  const f = FEELINGS.find((x) => x.v === c.feeling);
  return h('div', { class: 'well stack' }, h('div', { class: 'chips' }, h('span', { class: 'tag lead' }, lab(ROUNDS, c.round)), h('span', { class: 'tag' }, ax), h('span', { class: 'tag' }, kd), c.depth ? h('span', { class: 'tag', title: DEPTH_SCALE.q }, `אופי: ${DEPTH_SCALE.labels[c.depth - 1]}`) : null, c.talk ? h('span', { class: 'tag', title: TALK_SCALE.q }, `דיבור: ${TALK_SCALE.labels[c.talk - 1]}`) : null, f ? h('span', { class: 'tag emo', title: f.t }, f.e, h('span', { class: 'micro', style: 'margin-inline-start:6px' }, f.t)) : null), c.note ? h('p', null, c.note) : null);
}
async function openReportSheet(sc, eid, week) {
  try {
    const d = await api('GET', `${sc.api}/educators/${eid}`);
    const r = d.weeks.find((x) => x.week === week);
    if (!r || !r.report) return toast('לא נמצא מבט לשבוע הזה');
    const rep = r.report;
    openSheet((close) => [h('div', { class: 'row between' }, h('div', null, h('h3', null, d.educator.name), h('p', { class: 'small muted' }, `${d.educator.schoolName} · שבוע ${weekNo(week)} · ${weekLabel(week)}`)), h('button', { class: 'btn ghost sm', onclick: close }, 'סגירה')),
      h('p', null, `${nConv(rep.convs.length)}${rep.convs.length === 0 && rep.noneReason ? ` · ${lab(NONE_REASONS, rep.noneReason)}` : ''}`), ...rep.convs.map(convLine)]);
  } catch (ex) { toast(ex.message); }
}

/* ---------- מחנכות ---------- */
// שימוש במיפוי הכיתה: רק עצם השימוש (נפתח, התחילה למפות, ומתי). בלי תוכן.
function mappingTag(m) {
  if (!m) return h('span', { class: 'tag todo' }, 'עוד לא נכנסה');
  return h('span', { class: m.started ? 'tag lead' : 'tag', title: `${m.days} ימי שימוש · פעם אחרונה ${shortDate(m.lastDay)}` }, m.started ? 'התחילה למפות' : 'נכנסה', h('span', { class: 'micro', style: 'margin-inline-start:6px' }, shortDate(m.lastDay)));
}
function adminEducators(sc) {
  const host = h('div', { class: 'stack' });
  const act = async (path, okMsg) => { try { await api('POST', path); toast(okMsg); render(); } catch (ex) { toast(ex.message); } };
  return asyncView(() => api('GET', `${sc.api}/educators${qs({ school: scopeSchool(sc) })}`), (d) => h('section', { class: 'frame' }, h('h3', null, `מחנכות (${d.educators.length})`), sc.admin ? schoolPills(() => adm.school, (v) => { adm.school = v; }) : null,
    d.educators.length ? h('div', { class: 'tablewrap' }, h('table', { class: 'mx', style: 'min-width:640px' }, h('thead', null, h('tr', null, h('th', null, 'שם'), h('th', null, 'בית ספר'), h('th', null, 'מבטים'), h('th', null, 'שיחות'), h('th', null, 'מבט אחרון'), sc.admin ? h('th', null, 'מיפוי הכיתה') : null, h('th', null, ''))),
      h('tbody', null, d.educators.map((e) => h('tr', null,
        h('td', null, e.name, sc.admin && !e.hasCode ? h('span', { class: 'tag todo', style: 'margin-inline-start:8px' }, 'ממתינה לקוד') : null), h('td', { class: 'small' }, e.schoolName.replace('תיכון אורט ', '')), h('td', { class: 'num' }, `${e.reports} מתוך ${e.weeksExpected}`), h('td', { class: 'num' }, String(e.convs)),
        h('td', { class: 'num' }, e.lastAt ? shortDate(e.lastAt) : '–'),
        sc.admin ? h('td', { class: 'small' }, mappingTag(e.mapping)) : null,
        h('td', null, h('div', { class: 'row', style: 'justify-content:flex-end;flex-wrap:nowrap' }, link(sc.base + '/educators/' + e.id, 'פתיחה', 'btn sm'),
          sc.admin ? h('button', { class: 'btn soft sm', onclick: () => confirmInline(host, `לאפס את הקוד של ${e.name}? היא תיבחר קוד חדש בהרשמה מחדש עם קוד ההצטרפות, והמבטים שלה יישמרו.`, 'איפוס קוד', () => act(`/api/admin/educators/${e.id}/reset-code`, `הקוד של ${e.name} אופס`)) }, 'איפוס קוד') : null,
          sc.admin ? h('button', { class: 'btn soft sm', onclick: () => confirmInline(host, `להסיר את ${e.name} מהרשימות? המבטים שלה לא ייספרו יותר. אפשר לשחזר על ידי הרשמה מחדש עם אותו שם.`, 'הסרה', () => act(`/api/admin/educators/${e.id}/remove`, `${e.name} הוסרה`)) }, 'הסרה') : null))))))) : h('p', { class: 'muted' }, 'עדיין לא נרשמו מחנכות.'), host), backToLead(sc));
}
function adminEducator(id, sc) {
  const notFound = () => h('section', { class: 'frame' }, h('h3', null, 'המחנכת לא נמצאה'), link(sc.base + '/educators', 'לרשימה'));
  return asyncView(() => api('GET', `${sc.api}/educators/${encodeURIComponent(id)}`), (d) => [
    h('section', { class: 'frame' }, h('div', null, link(sc.base + '/educators', 'מחנכות', 'btn ghost')), h('h2', null, d.educator.name), h('p', { class: 'muted' }, `${d.educator.schoolName} · הצטרפות ב-${shortDate(d.educator.joinedWeek)}`),
      h('div', { class: 'chips' }, h('span', { class: 'tag lead' }, `${d.reportsCount} מתוך ${d.weeks.length} שבועות`), h('span', { class: 'tag' }, nConv(d.convs)), sc.admin ? h('span', { class: 'row small', style: 'gap:6px' }, 'מיפוי הכיתה:', mappingTag(d.educator.mapping)) : null)),
    ...d.weeks.map(({ week: w, report: r }) => h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('h4', null, `שבוע ${weekNo(w)} · ${weekLabel(w)}`), r ? h('span', { class: 'tag lead' }, nConv(r.convs.length)) : h('span', { class: 'tag todo' }, 'טרם נשלח')), ...(r ? r.convs.map(convLine) : [])))],
    (err, host) => { if (err.status === 404) { add(host, [notFound()]); return true; } return backToLead(sc)(err); });
}
function adminNotes(sc) {
  return asyncView(() => api('GET', `${sc.api}/notes${qs({ school: sc.admin ? adm.notesSchool : null, feeling: adm.notesFeeling, axis: adm.notesAxis })}`), (d) =>
    h('section', { class: 'frame' }, h('h3', null, `תובנות ושאלות (${d.total})`), h('p', { class: 'muted' }, 'ההערות החופשיות מכל המבטים: תובנות, שאלות שהמחנכות יצאו איתן ורעיונות.'),
      sc.admin ? schoolPills(() => adm.notesSchool, (v) => { adm.notesSchool = v; }) : null,
      h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'תחושה'), chipGroup({ options: [{ v: 'all', t: 'הכול' }, ...FEELINGS.map((x) => ({ v: x.v, t: `${x.e} ${x.t}` }))], value: adm.notesFeeling, cls: 'sm', label: 'תחושה', onChange: (v) => { adm.notesFeeling = v; render(); } })),
      h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'ציר'), chipGroup({ options: [{ v: 'all', t: 'הכול' }, ...AXES], value: adm.notesAxis, cls: 'sm', label: 'ציר', onChange: (v) => { adm.notesAxis = v; render(); } })),
      h('div', { class: 'grid' }, d.items.length ? d.items.map((it) => h('article', { class: 'well note' }, h('div', { class: 'chips' }, h('span', { class: 'tag lead' }, it.educator), h('span', { class: 'tag' }, `שבוע ${weekNo(it.week)}`), h('span', { class: 'tag' }, it.axis === 'other' ? 'אחר' : lab(AXES, it.axis)), (() => { const fe = FEELINGS.find((x) => x.v === it.feeling); return fe ? h('span', { class: 'tag emo', title: fe.t }, fe.e) : null; })()), h('blockquote', null, it.note))) : h('p', { class: 'muted' }, 'אין הערות שמתאימות לסינון.'))),
    backToLead(sc));
}

/* ---------- מובילות וקודי הצטרפות ---------- */
function adminLeads() {
  return asyncView(() => api('GET', '/api/admin/leads'), (d) => {
    const names = d.leadSeesNames;
    const act = async (fn, okMsg) => { try { await fn(); if (okMsg) toast(okMsg); render(); } catch (ex) { toast(ex.message); } };
    const out = [];
    out.push(h('section', { class: 'frame' }, h('h3', null, 'מה המובילה רואה'),
      h('p', { class: 'muted', style: 'max-width:62ch' }, 'בכל בית ספר יש מובילה. היא נכנסת בשם ובקוד, ורואה רק את הנתונים של בית הספר שלה. אפשר לבחור כמה פירוט היא רואה. השינוי חל מיד.'),
      chipGroup({ options: [{ v: 'agg', t: 'נתונים מצטברים בלבד (ברירת מחדל)' }, { v: 'names', t: 'גם שמות המחנכות וההערות החופשיות' }], value: names ? 'names' : 'agg', label: 'מה המובילה רואה',
        onChange: (v) => act(async () => { await api('PUT', '/api/admin/settings', { leadSeesNames: v === 'names' }); await refreshPublic(); }, 'ההגדרה נשמרה') }),
      h('div', { class: 'well' }, h('p', { class: 'small' }, names
        ? 'המובילה רואה מי שלחה מבט ובאילו שבועות, את המבטים של כל מחנכת ואת ההערות החופשיות, בבית הספר שלה בלבד. כדאי לעדכן את המחנכות, כי זה משנה את מה שנאמר להן על מי רואה מה.'
        : 'המובילה רואה סיכומים של בית הספר שלה: כמה מחנכות שלחו מבט, כמה שיחות, והתפלגויות (ערכים קטנים מ-5 לא נשלחים אליה בכלל). בלי שמות מחנכות ובלי הערות חופשיות.'))));
    const codeRow = (s, which, label, code) => {
      const host = h('div', { class: 'stack' });
      const invite = which === 'educator'
        ? `שלום, זמן לחינוך · מבט שבועי עולה לאוויר. נכנסים ל-${location.origin}, לשונית "שיחות אישיות", ובוחרים "זו הפעם הראשונה שלי". בית הספר: ${s.name}. קוד ההצטרפות: ${code}. אחר כך בוחרים קוד אישי בן ארבע ספרות. תודה!`
        : `שלום, כמובילה של זמן לחינוך ב${s.name}: נכנסים לקישור ${location.origin}/#/lead ובוחרים "זו הכניסה הראשונה שלי כמובילה". קוד ההצטרפות של המובילות: ${code}.`;
      return h('div', { class: 'stack', style: 'gap:10px' }, h('div', { class: 'row between' }, h('span', { class: 'qlabel' }, label), h('div', { class: 'row' }, h('code', { class: 'joincode', dir: 'ltr' }, code),
        h('button', { class: 'btn soft sm', onclick: () => copyText(code, 'הקוד הועתק') }, 'העתקת הקוד'), h('button', { class: 'btn soft sm', onclick: () => copyText(invite, 'נוסח ההודעה הועתק') }, 'העתקת נוסח הודעה'),
        h('button', { class: 'btn soft sm', onclick: () => confirmInline(host, 'להחליף את הקוד? מי שכבר נרשמה לא מושפעת. מי שעוד לא נרשמה תצטרך את הקוד החדש.', 'החלפת הקוד', () => act(() => api('POST', `/api/admin/schools/${s.slug}/codes`, { which }), 'הקוד הוחלף')) }, 'החלפת קוד'))), host);
    };
    d.schools.forEach((s) => {
      out.push(h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('h3', null, s.name), h('span', { class: 'tag' }, `${s.educators} מחנכות רשומות`)),
        codeRow(s, 'educator', 'קוד הצטרפות למחנכות', s.educatorCode), codeRow(s, 'lead', 'קוד הצטרפות למובילה', s.leadCode),
        h('div', { class: 'stack' }, h('span', { class: 'qlabel' }, 'מובילה'),
          s.leads.length ? s.leads.map((l) => {
            const host = h('div', { class: 'stack' });
            const nameIn = h('input', { class: 'input', value: l.name, 'aria-label': `שם המובילה ב${s.name}`, style: 'max-width:260px' });
            return h('div', { class: 'well stack' }, h('div', { class: 'row between' }, h('b', null, l.name), l.hasCode ? h('span', { class: 'tag lead' }, 'יש קוד') : h('span', { class: 'tag todo' }, 'ממתינה לקוד')),
              h('div', { class: 'row' }, nameIn,
                h('button', { class: 'btn soft sm', onclick: () => act(() => api('PUT', `/api/admin/leads/${l.id}`, { name: nameIn.value }), 'השם נשמר') }, 'שמירת שם'),
                h('button', { class: 'btn soft sm', onclick: () => confirmInline(host, `לאפס את הקוד של ${l.name}? תיבחר קוד חדש בהרשמה מחדש עם קוד ההצטרפות של המובילות.`, 'איפוס קוד', () => act(() => api('POST', `/api/admin/leads/${l.id}/reset-code`), 'הקוד אופס')) }, 'איפוס קוד'),
                h('button', { class: 'btn soft sm', onclick: () => confirmInline(host, `להסיר את ${l.name} מרשימת המובילות?`, 'הסרה', () => act(() => api('POST', `/api/admin/leads/${l.id}/remove`), 'המובילה הוסרה')) }, 'הסרה')), host);
          }) : h('p', { class: 'muted' }, 'טרם נרשמה מובילה. היא נרשמת בעצמה עם קוד ההצטרפות של המובילות.'))));
    });
    out.push(h('p', { class: 'small muted', style: 'max-width:62ch' }, 'אחרי שהמובילה נרשמה כדאי להחליף את קוד ההצטרפות שלה, כדי שלא תוכל להירשם מי שאינה המובילה.'));
    return out;
  });
}

/* ---------- ארגז כלים: עריכה ---------- */
function adminTools() {
  const host = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  function paint() {
    clear(host);
    const title = h('input', { class: 'input', placeholder: 'שם הכלי או הפרקטיקה', maxlength: '120' });
    const desc = h('textarea', { class: 'textarea', placeholder: 'תיאור קצר', maxlength: '600' });
    const url = h('input', { class: 'input', placeholder: 'קישור (לא חובה), למשל https://…', dir: 'ltr', style: 'text-align:right', maxlength: '500' });
    let folder = 'identity', type = 'כלי';
    const err = h('p', { class: 'err', role: 'alert' });
    const form = h('form', { class: 'frame', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      if (!title.value.trim()) return void (err.textContent = 'יש לכתוב שם.');
      const u = url.value.trim(); if (u && !/^https:\/\//i.test(u)) return void (err.textContent = 'הקישור צריך להתחיל ב-https://');
      try { await api('POST', '/api/admin/tools', { folder, title: title.value, desc: desc.value, type, url: u }); await refreshPublic(); paint(); toast('הכלי נוסף לתיקייה'); } catch (ex) { err.textContent = ex.message; }
    } }, h('h3', null, 'הוספת כלי או פרקטיקה'),
      h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'תיקייה'), chipGroup({ options: FOLDERS.map((f) => ({ v: f.id, t: f.t })), value: folder, label: 'תיקייה', onChange: (v) => { folder = v; } })),
      h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'סוג'), chipGroup({ options: [{ v: 'כלי', t: 'כלי' }, { v: 'פרקטיקה', t: 'פרקטיקה' }], value: type, label: 'סוג', onChange: (v) => { type = v; } })),
      field('שם', title), field('תיאור', desc), field('קישור לקובץ או לדף', url, 'קישור לקובץ שמאוחסן בשיתוף של חותם (Drive או SharePoint), או לדף באינטרנט.'), err, h('div', null, h('button', { class: 'btn', type: 'submit' }, 'הוספה')));
    host.append(form);
    FOLDERS.forEach((f) => {
      const items = pub.tools.filter((t) => t.folder === f.id);
      host.append(h('section', { class: 'frame' }, h('div', { class: 'row' }, ic(f.icon, { size: 32 }), h('h3', null, f.t)), items.length ? items.map((t) => h('div', { class: 'well row between' }, h('div', null, h('b', null, t.title), t.example ? h('span', { class: 'tag', style: 'margin-inline-start:8px' }, 'דוגמה') : null, h('p', { class: 'small muted' }, t.desc)),
        h('button', { class: 'btn soft sm', onclick: async () => { try { await api('DELETE', `/api/admin/tools/${t.id}`); await refreshPublic(); paint(); } catch (ex) { toast(ex.message); } } }, 'הסרה'))) : h('p', { class: 'muted' }, 'אין עדיין כלים בתיקייה הזו.')));
    });
  }
  paint();
  return host;
}

/* ---------- ייצוא, יומן גישה, חשבון ---------- */
function adminExport() {
  return asyncView(() => api('GET', '/api/admin/export'), (d) => {
    const rows = d.rows;
    const clean = (v) => String(v ?? '').replace(/[\t\r\n]+/g, ' ');
    const tsv = rows.map((r) => r.map(clean).join('\t')).join('\n');
    return h('section', { class: 'frame' }, h('h3', null, 'ייצוא נתונים'), h('p', { class: 'muted', style: 'max-width:60ch' }, `שורה לכל שיחה, עם המחנכת, בית הספר והשבוע. כרגע ${rows.length - 1} שורות. אין בקובץ מידע על תלמידים. הייצוא נרשם ביומן הגישה.`),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => copyText(tsv, 'הנתונים הועתקו. אפשר להדביק באקסל או בגוגל שיטס.') }, 'העתקה לגיליון'), h('a', { class: 'btn soft', href: '/api/admin/export.csv', download: 'zman-weekly-export.csv' }, 'הורדה כקובץ CSV')),
      h('div', { class: 'tablewrap' }, h('table', { class: 'mx', style: 'min-width:720px' }, h('thead', null, h('tr', null, rows[0].map((c) => h('th', null, c)))), h('tbody', null, rows.slice(1, 9).map((r) => h('tr', null, r.map((c, i) => h('td', { style: 'text-align:start;' + (i === 9 ? 'min-width:220px' : i === 2 ? 'min-width:170px' : '') }, String(c)))))))),
      h('p', { class: 'micro muted' }, 'מוצגות 8 שורות ראשונות מתוך הקובץ.'));
  });
}
const AUDIT_LABELS = {
  view_educators: 'צפייה ברשימת מחנכות', view_educator: 'פתיחת מחנכת', view_notes: 'צפייה בהערות החופשיות', export_view: 'צפייה בייצוא', export_csv: 'הורדת קובץ ייצוא',
  reset_code: 'איפוס קוד', remove_educator: 'הסרת מחנכת', remove_lead: 'הסרת מובילה', rename_lead: 'שינוי שם מובילה', lead_visibility: 'שינוי הרשאת המובילות', regenerate_join_code: 'החלפת קוד הצטרפות',
  manager_login: 'כניסת מנהלת', manager_setup: 'הקמת חשבון מנהלת', password_change: 'החלפת סיסמה', tool_add: 'הוספת כלי', tool_remove: 'הסרת כלי', register: 'הרשמה',
};
const TARGET_LABELS = { names: 'שמות והערות', aggregated: 'נתונים מצטברים', own_school: 'בית הספר שלה', all: 'כל בתי הספר' };
function adminAudit() {
  return asyncView(() => api('GET', '/api/admin/audit'), (d) => h('section', { class: 'frame' }, h('h3', null, 'יומן גישה'), h('p', { class: 'muted', style: 'max-width:62ch' }, 'מי פתחה מה ומתי: צפייה במידע על מחנכות, ייצוא, איפוס קודים ושינוי הרשאות. היומן רק מצטבר, ואי אפשר לערוך או למחוק בו. מוצגות 200 הפעולות האחרונות.'),
    h('div', { class: 'tablewrap' }, h('table', { class: 'mx', style: 'min-width:560px' }, h('thead', null, h('tr', null, ['מתי', 'מי', 'פעולה', 'על מה'].map((c) => h('th', null, c)))),
      h('tbody', null, d.entries.map((e) => h('tr', null, h('td', { class: 'small', style: 'text-align:start' }, new Date(e.timestamp).toLocaleString('he-IL')), h('td', { style: 'text-align:start' }, `${e.name || ''}${e.role ? ` (${ROLE_LABEL[e.role] || e.role})` : ''}`), h('td', { style: 'text-align:start' }, AUDIT_LABELS[e.action] || e.action), h('td', { class: 'small', style: 'text-align:start' }, TARGET_LABELS[e.target] || e.target || ''))))))));
}
function adminAccount() {
  const cur = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', 'aria-label': 'הסיסמה הנוכחית' });
  const n1 = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', 'aria-label': 'סיסמה חדשה' }), n2 = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', 'aria-label': 'אימות הסיסמה' });
  const err = h('p', { class: 'err', role: 'alert' });
  const btn = h('button', { class: 'btn', type: 'submit' }, 'החלפת סיסמה');
  return h('section', { class: 'frame' }, h('h3', null, 'החשבון שלי'), h('p', { class: 'muted' }, `${session.name}`),
    h('form', { class: 'stack', style: 'max-width:420px', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = '';
      if (n1.value !== n2.value) return void (err.textContent = 'שתי הסיסמאות החדשות צריכות להיות זהות.');
      btn.disabled = true;
      try { await api('POST', '/api/me/password', { current: cur.value, next: n1.value }); cur.value = n1.value = n2.value = ''; toast('הסיסמה הוחלפה. מכשירים אחרים נותקו.'); } catch (ex) { err.textContent = ex.message; }
      btn.disabled = false;
    } }, field('הסיסמה הנוכחית', cur), field('סיסמה חדשה', n1, 'לפחות 10 תווים.'), field('אימות הסיסמה', n2), err, h('div', { class: 'row' }, btn, h('button', { class: 'btn soft', type: 'button', onclick: logout }, 'יציאה'))));
}

/* ---------- פתיחה ---------- */
async function boot() {
  try {
    await refreshPublic();
    const s = await api('GET', '/api/session');
    if (s.user) await enter(s.user);
  } catch (err) {
    clear(app);
    add(app, h('section', { class: 'frame' }, h('h2', null, 'האתר לא זמין כרגע'), h('p', { class: 'muted' }, err.message), h('div', null, h('button', { class: 'btn', onclick: () => location.reload() }, 'לנסות שוב'))));
    return;
  }
  current = location.hash.slice(1) || '/';
  render();
}
boot();
})();
