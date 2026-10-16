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
  { v: 'notebook', t: `שיחת מחברת` },
  { v: 'complex', t: `שיחה מורכבת` },
  { v: 'grades', t: `הערכה לקראת תעודות` },
  { v: 'parents', t: `יום הורים` },
  { v: 'deep', t: `שיחת עומק` },
  { v: 'other', t: `אחר` },
];
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
const MAP_KEY = 'zmw.map.v1', DRAFT_KEY = 'zmw.draft.v1';
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
  const links = [{ to: '/', t: 'בית' }, { to: '/tools', t: 'ארגז כלים' }, { to: '/mapping', t: 'מיפוי הכיתה' }];
  links.push({ to: '/me', t: 'שיחות אישיות' });
  links.push({ to: '/lead', t: 'מובילות' });
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
  if ((m = /^\/tools\/(identity|goals|agency)$/.exec(p))) return viewFolder(m[1]);
  const gate = (path, view) => (me() ? view() : isAdmin() || leadUser() ? viewEducatorsOnly() : viewEnter('new', path));
  const gateLead = (path, view) => (leadUser() ? view() : me() || isAdmin() ? viewLeadsOnly() : viewEnter('lead', path));
  if (p === '/mapping') return gate(p, viewMappingHome);
  if (p === '/mapping/map') return gate(p, viewMap);
  if (p === '/mapping/circles') return gate(p, viewCircles);
  if (p === '/mapping/class') return gate(p, viewClass);
  if (p === '/mapping/helper') return gate(p, viewHelper);
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
    h('p', { class: 'muted', style: 'max-width:56ch' }, 'השיחות האישיות והמיפוי נפתחים בכניסה של המחנכת, בקוד האישי שלה. מנהלת התכנית והמובילות רואות את המבטים במסכים שלהן, ואת המיפוי הן לא רואות.'),
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
  const hero = h('section', { class: 'frame lead' },
    h('p', { class: 'small muted' }, 'תכנית זמן לחינוך · חותם ורשת אורט'),
    h('h1', null, 'מבט שבועי', h('br'), h('span', { class: 'reg' }, 'שיחות אישיות')),
    h('p', { style: 'max-width:46ch;font-size:19px' }, 'מביטים אחורה על השבוע: כמה שיחות אישיות קיימתם, ועל כל שיחה עונים על ארבע שאלות קצרות. דקה אחת בשבוע, בלי שמות תלמידים ובלי תיעוד על ילד או ילדה.'),
    h('div', { class: 'row' }, link(me() ? '/me' : '/enter', 'למבט השבועי', 'btn white'), link('/tools', 'לארגז הכלים', 'btn soft')));
  const a = h('section', { class: 'frame' }, ic('calendar', { size: 40 }), h('h3', null, 'המבט השבועי'),
    h('ul', { class: 'stack', style: 'margin:0;padding-inline-start:20px' },
      h('li', null, 'כניסה בקוד אישי בן ארבע ספרות, שבוחרים בעצמכם בפעם הראשונה.'),
      h('li', null, 'פעם בשבוע, לפי תאריכים. אפשר גם להשלים שבוע שפספסתם.'),
      h('li', null, 'מנהלת התכנית רואה את המבטים של כל המחנכות.')),
    h('div', null, link(me() ? '/me' : '/enter', me() ? 'להמשך למבט שלי' : 'כניסה או הרשמה ראשונה')));
  const b = h('section', { class: 'frame' }, ic('book', { size: 40 }), h('h3', null, 'ארגז הכלים'),
    h('p', null, 'כלים ופרקטיקות לשיחות אישיות, בתיקיות לפי ציר. פתוח לכולם, בלי כניסה.'),
    h('div', { class: 'chips' }, FOLDERS.map((f) => h('a', { class: 'tag', href: '#/tools/' + f.id, style: 'text-decoration:none;color:inherit', onclick: (e) => { e.preventDefault(); go('/tools/' + f.id); } }, f.t))),
    h('div', null, link('/tools', 'לארגז הכלים', 'btn soft')));
  const c = h('section', { class: 'frame' }, ic('compass', { size: 40 }), h('h3', null, 'מיפוי הכיתה'),
    h('p', null, 'מפת שיחות ומעגלי קשר: שני כלים למילוי דיגיטלי שעוזרים להחליט עם מי לשוחח ומתי. אישי לכל מחנכת, באותו קוד כניסה, והנתונים נשארים במכשיר שלכם.'),
    h('div', null, link('/mapping', 'למיפוי הכיתה', 'btn soft')));
  const priv = h('section', { class: 'frame' }, h('div', { class: 'row' }, ic('lock', { size: 36 }), h('h3', null, 'מה נשמר ומה לא')),
    h('div', { class: 'grid' },
      h('div', { class: 'well' }, h('h4', null, 'לא נשמר'), h('p', null, 'שמות תלמידים, פרטים מזהים, ותיעוד שיחה לפי ילד או ילדה.')),
      h('div', { class: 'well' }, h('h4', null, 'נשמר'), h('p', null, 'לכל שבוע: מספר השיחות. ולכל שיחה: סבב, ציר, אופי, תחושה והערה חופשית.')),
      h('div', { class: 'well' }, h('h4', null, 'נשאר במכשיר שלכם'), h('p', null, 'מיפוי הכיתה (שמות או ראשי תיבות) לא נשלח לשרת, ומנהלת התכנית לא רואה אותו.')),
      h('div', { class: 'well' }, h('h4', null, 'מי רואה מה'), h('p', null, pub.leadSeesNames ? 'מנהלת התכנית רואה את כל המבטים. מובילת בית הספר רואה רק את בית הספר שלה, כולל שמות והערות.' : 'מנהלת התכנית רואה את כל המבטים. מובילת בית הספר רואה רק נתונים מצטברים של בית הספר שלה, בלי שמות.'))));
  const tryIt = h('section', { class: 'frame' }, h('h3', null, 'איך מתחילים'), h('ol', { class: 'stack', style: 'margin:0;padding-inline-start:22px' },
    h('li', null, 'מחנכות: בלשונית "שיחות אישיות" בוחרים "זו הפעם הראשונה שלי", מזינים את קוד ההצטרפות של בית הספר (מקבלים ממנהלת התכנית) ובוחרים קוד אישי בן ארבע ספרות.'),
    h('li', null, 'פעם בשבוע נכנסים וממלאים את המבט: כמה שיחות אישיות קיימתם, ועל כל שיחה ארבע שאלות קצרות.'),
    h('li', null, 'אחרי הכניסה אפשר לפתוח גם את "מיפוי הכיתה": מפת שיחות ומעגלי קשר, שנשמרים רק במכשיר שלכם.'),
    h('li', null, 'מובילות ומנהלת התכנית נכנסות מהלשוניות "מובילות" ו"מנהלת התכנית".')));
  return h('div', { class: 'stack', style: 'gap:var(--gap)' }, hero, h('div', { class: 'grid' }, a, b, c), priv, tryIt);
}



/* =====================================================================
   ארגז כלים (פתוח לכולם)
   ===================================================================== */
function viewTools() {
  const count = (id) => pub.tools.filter((t) => t.folder === id && !t.example).length;
  return h('div', { class: 'stack', style: 'gap:var(--gap)' },
    h('section', { class: 'frame' }, h('h2', null, 'ארגז כלים'), h('p', { class: 'muted', style: 'max-width:60ch' }, 'כלים ופרקטיקות לשיחות אישיות. פתוח לכולם, בלי כניסה. התכנים יתווספו כאן לאורך השנה.')),
    h('div', { class: 'grid' }, FOLDERS.map((f) => h('a', { class: 'folder', href: '#/tools/' + f.id, onclick: (e) => { e.preventDefault(); go('/tools/' + f.id); } },
      h('span', { class: 'ic-big' }, ic(f.icon, { size: 38, tone: 'blue' })), h('h3', null, f.t), h('p', { class: 'muted' }, f.d),
      h('span', { class: 'tag', style: 'align-self:flex-start' }, `${count(f.id)} כלים`)))));
}

function viewFolder(id) {
  const f = FOLDERS.find((x) => x.id === id);
  const back = link('/tools', 'ארגז כלים', 'btn ghost');
  const items = pub.tools.filter((t) => t.folder === id);
  const list = items.length ? items.map(toolCard) : [h('div', { class: 'frame' }, h('p', { class: 'muted' }, 'הכלים והפרקטיקות בציר הזה יתווספו כאן.'))];
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
   מיפוי הכיתה: ארבעה שלבים, וכולם על אותה רשימה
   1. הכיתה שלי (הדבקה או העלאה של רשימת שמות)  2. עוזר לקשר (לא חובה)  3. מעגלי קשר  4. מפת שיחות
   ===================================================================== */
const MAP_TABS = [['/mapping/class', '1 · הכיתה שלי'], ['/mapping/helper', '2 · עוזר לקשר (לא חובה)'], ['/mapping/circles', '3 · מעגלי קשר'], ['/mapping/map', '4 · מפת שיחות']];
function mapNav(active) {
  return h('nav', { class: 'nav mapnav', 'aria-label': 'שלבי המיפוי' }, [['/mapping', 'סקירה'], ...MAP_TABS].map(([to, t]) => h('a', { href: '#' + to, 'aria-current': to === active ? 'page' : null, onclick: (e) => { e.preventDefault(); go(to); } }, t)));
}
function mapHead(title, sub, active) {
  return h('section', { class: 'frame' }, h('h2', null, title), h('p', { class: 'muted', style: 'max-width:62ch' }, sub), mapNav(active));
}
function privacyNote() {
  const e = me();
  return h('details', { class: 'privnote' }, h('summary', null, ic('lock', { size: 18 }), h('span', null, 'הרשימה והמיפוי נשארים רק במכשיר הזה. הם לא נשלחים לשרת, ואף אחד אחר לא רואה אותם.'), h('span', { class: 'small', style: 'margin-inline-start:auto;color:var(--lead);font-weight:500' }, 'מה זה אומר?')),
    h('p', { class: 'small', style: 'margin-top:10px;max-width:70ch' }, `${e ? `המיפוי של ${e.name} ` : 'המיפוי '}נשמר על שמה במכשיר הזה, ונפתח בכל כניסה (באותו קוד של השיחות האישיות). מנהלת התכנית והמובילות לא רואות אותו. כדי לעבוד ממכשיר אחר, מעתיקים את הנתונים (בתחתית הדף "הכיתה שלי") וטוענים אותם שם. כדאי לרשום ראשי תיבות במקום שם מלא, ולמחוק את הנתונים אם המכשיר משותף.`));
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
      step('2', 'עוזר לקשר', 'לא בטוחים מה רמת הקשר עם תלמיד/ה? עד שלוש שאלות קצרות, והצעה איפה למקם אותם.', '/mapping/helper', 'להתחיל שיחה עם העוזר', '', true),
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
const HELPER_Q = {
  know: { short: 'מה יודעים עליהם', text: (n) => `מה אתם יודעים על ${n} מעבר ללימודים? משהו שהוא או היא סיפרו לכם בעצמם.`, opts: [['כמעט כלום. מכירים בעיקר מהשיעור', 0], ['כמה דברים: תחביב, חברים, משפחה, מה אוהבים', 1], ['הרבה, כולל דברים אישיים שסומכים עליכם', 2]] },
  initiative: { short: 'פנייה ביוזמתם', text: (n) => `מתי ${n} פנה או פנתה אליכם ביוזמתם לאחרונה, לא בגלל משימה?`, opts: [['לא קרה עדיין', 0], ['פעם או פעמיים', 1], ['קורה לא מעט', 2]] },
  trust: { short: 'סיכוי שיספרו', text: () => 'אם משהו קשה היה קורה לתלמיד/ה, כמה סביר שהם יספרו לכם על זה בעצמם?', opts: [['לא סביר. כנראה הייתם שומעים ממישהו אחר', 0], ['תלוי במצב', 1], ['סביר מאוד, הם פונים אליכם', 2]] },
  last: { short: 'השיחה האחרונה', text: () => 'איך נראתה השיחה האישית האחרונה ביניכם?', opts: [['עוד לא הייתה לנו שיחה אישית', 0], ['קצרה ועניינית, בלי להתעמק', 0], ['נעימה, אבל נשארנו על פני השטח', 1], ['פתוחה: הם שיתפו ואתם הקשבתם', 2]] },
};
// השאלה הבאה לפי מה שנענה. מסיימים מוקדם כשהתמונה כבר ברורה (שתי תשובות נמוכות, או שתיים גבוהות)
function nextQuestion(scores) {
  if (scores.length === 0) return 'know';
  if (scores.length === 1) return scores[0] === 0 ? 'initiative' : 'trust';
  if (scores.length === 2) return scores[0] + scores[1] === 0 || scores[0] + scores[1] === 4 ? null : 'last';
  return null;
}
function suggestLevel(scores) {
  const sum = scores.reduce((a, b) => a + b, 0);
  if (scores.length <= 2) return sum <= 1 ? 1 : sum >= 3 ? 3 : 2;
  return sum <= 1 ? 1 : sum <= 4 ? 2 : 3;
}

function viewHelper() {
  ensureMap();
  const root = h('div', { class: 'stack', style: 'gap:var(--gap)' });
  function paint(student) {
    clear(root);
    add(root, [mapHead('עוזר לקשר', 'לא בטוחים מה רמת הקשר עם תלמיד/ה? העוזר שואל עד שלוש שאלות קצרות ומציע איפה למקם אותם. זה לא חובה: אפשר גם למקם ישר במעגלים.', '/mapping/helper'), privacyNote(), student ? chat(student) : picker()]);
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
    const scores = [], asked = [];
    const name = student.name || 'התלמיד/ה';
    function ask() {
      clear(opts);
      const key = nextQuestion(scores);
      if (!key) return finish();
      const q = HELPER_Q[key];
      asked.push(key);
      say('bot', h('span', { class: 'micro muted', style: 'display:block' }, `שאלה ${asked.length}`), q.text(name));
      q.opts.forEach(([t, score]) => opts.append(h('button', { class: 'btn soft chatopt', type: 'button', onclick: () => { scores.push(score); say('me', t); ask(); } }, t)));
    }
    function finish() {
      clear(opts);
      const level = suggestLevel(scores), L = LEVEL_COPY[level];
      const why = asked.map((k, i) => `${HELPER_Q[k].short}: ${HELPER_Q[k].opts.find((o) => o[1] === scores[i])[0]}`);
      say('bot', h('b', null, `ההצעה שלי: ${L.title}`), h('p', null, L.text), h('ul', { class: 'why' }, why.map((w) => h('li', null, w))), h('p', null, h('b', null, 'צעד קטן להמשך: '), L.tip));
      const urgent = h('button', { class: 'btn soft sm', type: 'button', 'aria-pressed': String(!!student.urgent), onclick: () => { student.urgent = !student.urgent; if (!student.urgent) student.word = ''; saveMap(); urgent.setAttribute('aria-pressed', String(student.urgent)); urgent.textContent = student.urgent ? 'מסומן כדחוף. לבטל?' : 'יש משהו שלא יכול לחכות? לסמן כדחוף'; } }, student.urgent ? 'מסומן כדחוף. לבטל?' : 'יש משהו שלא יכול לחכות? לסמן כדחוף');
      const place = (v) => {
        student.link = v; delete student.x; delete student.y; saveMap(); clear(opts);
        say('bot', `מיקמתי את ${name} בקשר ${v} (${lab(LINKS, v)}). אפשר לשנות בכל רגע במעגלים או בטבלה.`);
        opts.append(h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => paint(null) }, 'תלמיד/ה נוספ/ת'), link('/mapping/circles', 'לראות במעגלי קשר', 'btn soft'), link('/mapping/map', 'למפת שיחות', 'btn soft')));
      };
      opts.append(h('button', { class: 'btn chatopt', type: 'button', onclick: () => { say('me', `ממקמים בקשר ${level}`); place(level); } }, `למקם את ${name} בקשר ${level}`),
        h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'או לבחור בעצמנו:'), [1, 2, 3].filter((v) => v !== level).map((v) => h('button', { class: 'btn soft sm', type: 'button', onclick: () => { say('me', `ממקמים בקשר ${v}`); place(v); } }, `קשר ${v}`))), urgent,
        h('button', { class: 'btn ghost sm', type: 'button', onclick: () => paint(student) }, 'להתחיל מחדש'));
    }
    say('bot', `היי! אשאל עד שלוש שאלות קצרות על ${name}, ואציע איפה למקם אותם. אין תשובות נכונות, והכול נשאר במכשיר שלכם.`);
    if (student.link) say('bot', `כרגע ${name} מוצבים בקשר ${student.link} (${lab(LINKS, student.link)}).`);
    ask();
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
const saveMap = () => { if (mapOwner) lsSet(MAP_KEY + '.' + mapOwner, JSON.stringify(map)); };
const newStudent = (name = '') => ({ id: nid('s') + Math.random().toString(36).slice(2, 6), name, link: null, urgent: false, word: '', axis: null, rounds: [false, false, false], last: '' });
const groupOf = (s) => (!s.link ? null : s.urgent ? 1 : s.link === 1 ? 2 : s.link === 2 ? 3 : 4);
const chipText = (name) => {
  const t = (name || '').trim(); if (!t) return '?';
  const parts = t.split(/[\s.]+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, 2).map((p) => p[0]).join('') : t.slice(0, 3);
};
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
    h('button', { class: 'btn soft sm', onclick: () => { if (download('mapping-zman-lachinuch.json', JSON.stringify(map, null, 1), 'application/json')) toast('הקובץ נשמר'); } }, 'הורדה כקובץ'),
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
  let tab = mode === 'manager' ? 'manager' : mode === 'lead' ? 'lead' : 'new';
  let school = '';
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
  const done = async (res, to, fresh) => { await enter(res.user); justRegistered = !!fresh; go(to); };

  function paint() {
    clear(root);
    const tabs = chipGroup({ options: [{ v: 'new', t: 'זו הפעם הראשונה שלי' }, { v: 'back', t: 'כבר יש לי קוד' }, { v: 'lead', t: 'מובילה זמן לחינוך' }, { v: 'manager', t: 'מנהלת התכנית' }], value: tab, label: 'סוג כניסה', onChange: (v) => { tab = v; paint(); } });
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
    const ctxText = leadCtx ? 'בכל בית ספר יש מובילה, והיא רואה רק את הנתונים של בית הספר שלה. נכנסים בשם ובקוד אישי, ובפעם הראשונה נרשמים עם קוד ההצטרפות של המובילות.'
      : tab === 'manager' ? 'מנהלת התכנית רואה את כל המבטים של כל בתי הספר, ומנהלת את הכלים, את הקודים ואת הרשאות המובילות.'
        : next.startsWith('/mapping') ? 'המיפוי אישי לכל מחנכת. נכנסים באותו קוד אישי של השיחות האישיות: מי שכבר נכנסה לאחד מהם, מחוברת גם לשני, והמיפוי שלה נשמר לה במכשיר.'
          : 'בפעם הראשונה נרשמים עם קוד ההצטרפות של בית הספר ובוחרים קוד אישי בן ארבע ספרות. בכל פעם הבאה נכנסים עם בית ספר, שם וקוד. אותו קוד פותח גם את מיפוי הכיתה.';
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

function newConv() { return { round: null, axis: null, axisOther: '', kind: null, kindOther: '', feeling: null, note: '' }; }
const convDone = (c) => !!(c.round && c.axis && (c.axis !== 'other' || c.axisOther.trim()) && c.kind && (c.kind !== 'other' || c.kindOther.trim()) && c.feeling);

function viewReport(week) {
  const e = session;
  if (week > CUR_WEEK || week < joinWeek()) return h('section', { class: 'frame' }, h('h2', null, 'השבוע הזה לא פתוח למבט'), link('/me', 'חזרה למבט שלי'));
  const existing = myReport(week);
  // טיוטה של מבט שעוד לא נשלח נשמרת רק במכשיר הזה, ונמחקת כשהמבט נשלח
  const dkey = `${DRAFT_KEY}.${e.id}.${week}`;
  const saved = (() => { try { return JSON.parse(lsGet(dkey) || 'null'); } catch { return null; } })();
  const draft = JSON.parse(JSON.stringify(saved && Array.isArray(saved.convs) ? saved : existing ? { convs: existing.convs, noneReason: existing.noneReason || '' } : { convs: [], noneReason: '' }));
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
        q(2, 'איזה סוג שיחה זו הייתה?', chipGroup({ options: AXES, value: c.axis, label: 'ציר השיחה', onChange: (v) => { c.axis = v; axisOther.hidden = v !== 'other'; touch(); } }), axisOther),
        q(3, 'מה היה אופי השיחה?', chipGroup({ options: KINDS, value: c.kind, label: 'אופי השיחה', onChange: (v) => { c.kind = v; kindOther.hidden = v !== 'other'; touch(); } }), kindOther),
        q(4, 'איך יצאתם מהשיחה?', moodGroup({ value: c.feeling, onChange: (v) => { c.feeling = v; touch(); } }), h('div', { class: 'field' }, h('label', { class: 'hint', for: (note.id = nid('n')) }, 'עוד משהו חשוב להוסיף? (לא חובה)'), note), warn)));
      checkNames();
    });
    status();
  }
  function setCount(n) {
    if (n > draft.convs.length) { while (draft.convs.length < n) draft.convs.push(newConv()); buildCards(); touch(); return; }
    const last = draft.convs[draft.convs.length - 1];
    const hasData = last && (last.round || last.axis || last.kind || last.feeling || last.note.trim());
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
  out.push(h('div', { class: 'grid' },
    h('section', { class: 'frame' }, h('h3', null, 'אחוז השליחה לפי שבוע'), columns(rate, curIdx)),
    h('section', { class: 'frame' }, h('h3', null, 'שיחות לפי שבוע'), columns(convsPerWeek, curIdx))));
  out.push(h('div', { class: 'grid' },
    h('section', { class: 'frame' }, h('h3', null, 'לפי סבב'), barRows(distRows(d.dist.round, ROUNDS))),
    h('section', { class: 'frame' }, h('h3', null, 'לפי סוג שיחה'), barRows(distRows(d.dist.axis, AXES))),
    h('section', { class: 'frame' }, h('h3', null, 'לפי אופי השיחה'), barRows(distRows(d.dist.kind, KINDS))),
    h('section', { class: 'frame' }, h('h3', null, 'איך יצאו מהשיחה'), barRows(distRows(d.dist.feeling, FEELINGS)))));
  out.push(h('p', { class: 'muted small' }, d.masked ? 'ההתפלגויות מתחילת התכנית, לבית הספר שלך. ערכים קטנים מ-5 מוסתרים. אין כאן שום מידע על תלמידים.' : 'ההתפלגויות מתחילת התכנית, לפי בית הספר שנבחר. אין כאן שום מידע על תלמידים.'));
  return out;
}

function convLine(c) {
  const ax = c.axis === 'other' ? `אחר: ${c.axisOther}` : lab(AXES, c.axis), kd = c.kind === 'other' ? `אחר: ${c.kindOther}` : lab(KINDS, c.kind);
  const f = FEELINGS.find((x) => x.v === c.feeling);
  return h('div', { class: 'well stack' }, h('div', { class: 'chips' }, h('span', { class: 'tag lead' }, lab(ROUNDS, c.round)), h('span', { class: 'tag' }, ax), h('span', { class: 'tag' }, kd), f ? h('span', { class: 'tag emo', title: f.t }, f.e, h('span', { class: 'micro', style: 'margin-inline-start:6px' }, f.t)) : null), c.note ? h('p', null, c.note) : null);
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
function adminEducators(sc) {
  const host = h('div', { class: 'stack' });
  const act = async (path, okMsg) => { try { await api('POST', path); toast(okMsg); render(); } catch (ex) { toast(ex.message); } };
  return asyncView(() => api('GET', `${sc.api}/educators${qs({ school: scopeSchool(sc) })}`), (d) => h('section', { class: 'frame' }, h('h3', null, `מחנכות (${d.educators.length})`), sc.admin ? schoolPills(() => adm.school, (v) => { adm.school = v; }) : null,
    d.educators.length ? h('div', { class: 'tablewrap' }, h('table', { class: 'mx', style: 'min-width:640px' }, h('thead', null, h('tr', null, h('th', null, 'שם'), h('th', null, 'בית ספר'), h('th', null, 'מבטים'), h('th', null, 'שיחות'), h('th', null, 'מבט אחרון'), h('th', null, ''))),
      h('tbody', null, d.educators.map((e) => h('tr', null,
        h('td', null, e.name, sc.admin && !e.hasCode ? h('span', { class: 'tag todo', style: 'margin-inline-start:8px' }, 'ממתינה לקוד') : null), h('td', { class: 'small' }, e.schoolName.replace('תיכון אורט ', '')), h('td', { class: 'num' }, `${e.reports} מתוך ${e.weeksExpected}`), h('td', { class: 'num' }, String(e.convs)),
        h('td', { class: 'num' }, e.lastAt ? shortDate(e.lastAt) : '–'),
        h('td', null, h('div', { class: 'row', style: 'justify-content:flex-end;flex-wrap:nowrap' }, link(sc.base + '/educators/' + e.id, 'פתיחה', 'btn sm'),
          sc.admin ? h('button', { class: 'btn soft sm', onclick: () => confirmInline(host, `לאפס את הקוד של ${e.name}? היא תיבחר קוד חדש בהרשמה מחדש עם קוד ההצטרפות, והמבטים שלה יישמרו.`, 'איפוס קוד', () => act(`/api/admin/educators/${e.id}/reset-code`, `הקוד של ${e.name} אופס`)) }, 'איפוס קוד') : null,
          sc.admin ? h('button', { class: 'btn soft sm', onclick: () => confirmInline(host, `להסיר את ${e.name} מהרשימות? המבטים שלה לא ייספרו יותר. אפשר לשחזר על ידי הרשמה מחדש עם אותו שם.`, 'הסרה', () => act(`/api/admin/educators/${e.id}/remove`, `${e.name} הוסרה`)) }, 'הסרה') : null))))))) : h('p', { class: 'muted' }, 'עדיין לא נרשמו מחנכות.'), host), backToLead(sc));
}
function adminEducator(id, sc) {
  const notFound = () => h('section', { class: 'frame' }, h('h3', null, 'המחנכת לא נמצאה'), link(sc.base + '/educators', 'לרשימה'));
  return asyncView(() => api('GET', `${sc.api}/educators/${encodeURIComponent(id)}`), (d) => [
    h('section', { class: 'frame' }, h('div', null, link(sc.base + '/educators', 'מחנכות', 'btn ghost')), h('h2', null, d.educator.name), h('p', { class: 'muted' }, `${d.educator.schoolName} · הצטרפות ב-${shortDate(d.educator.joinedWeek)}`),
      h('div', { class: 'chips' }, h('span', { class: 'tag lead' }, `${d.reportsCount} מתוך ${d.weeks.length} שבועות`), h('span', { class: 'tag' }, nConv(d.convs)))),
    ...d.weeks.map(({ week: w, report: r }) => h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('h4', null, `שבוע ${weekNo(w)} · ${weekLabel(w)}`), r ? h('span', { class: 'tag lead' }, nConv(r.convs.length)) : h('span', { class: 'tag todo' }, 'טרם נשלח')), ...(r ? r.convs.map(convLine) : [])))],
    (err, host) => { if (err.status === 404) { add(host, [notFound()]); return true; } return backToLead(sc)(err); });
}
function adminNotes(sc) {
  return asyncView(() => api('GET', `${sc.api}/notes${qs({ school: sc.admin ? adm.notesSchool : null, feeling: adm.notesFeeling, axis: adm.notesAxis })}`), (d) =>
    h('section', { class: 'frame' }, h('h3', null, `תובנות ושאלות (${d.total})`), h('p', { class: 'muted' }, 'ההערות החופשיות מכל המבטים: תובנות, שאלות שהמחנכות יצאו איתן ורעיונות.'),
      sc.admin ? schoolPills(() => adm.notesSchool, (v) => { adm.notesSchool = v; }) : null,
      h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'תחושה'), chipGroup({ options: [{ v: 'all', t: 'הכול' }, ...FEELINGS.map((x) => ({ v: x.v, t: `${x.e} ${x.t}` }))], value: adm.notesFeeling, cls: 'sm', label: 'תחושה', onChange: (v) => { adm.notesFeeling = v; render(); } })),
      h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'סוג שיחה'), chipGroup({ options: [{ v: 'all', t: 'הכול' }, ...AXES], value: adm.notesAxis, cls: 'sm', label: 'סוג שיחה', onChange: (v) => { adm.notesAxis = v; render(); } })),
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
        : `שלום, כמובילה של זמן לחינוך ב${s.name}: נכנסים ל-${location.origin}, לשונית "מובילות", ובוחרים "זו הכניסה הראשונה שלי כמובילה". קוד ההצטרפות של המובילות: ${code}.`;
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
