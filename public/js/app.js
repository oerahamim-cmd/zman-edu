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
  { v: 'agency', t: `אייג'נסי` },
  { v: 'other', t: `אחר` },
];
const KINDS = [
  { v: 'intro', t: `שיחת היכרות` },
  { v: 'notebook', t: `שיחה מחברת` },
  { v: 'complex', t: `שיחה מורכבת` },
  { v: 'grades', t: `הערכה לקראת תעודות` },
  { v: 'parents', t: `לקראת יום הורים` },
  { v: 'other', t: `אחר` },
];
// עומק השיחה: חמישה שלבים, ממידע מעשי ועד עולם פנימי (נשמרים כ-1 עד 5). חלוקת הדיבור: פס שגוררים, ונשמר כאחוז הדיבור של התלמיד/ה.
const DEPTH_LEVELS = [
  { n: 1, t: `מידע ומעשיות`, d: `עדכון, תיאום, הסבר: מה צריך לעשות ואיך.` },
  { n: 2, t: `בעיקר עניינית`, d: `בעיקר עניינים מעשיים, עם נגיעה קטנה באישי.` },
  { n: 3, t: `גם וגם`, d: `שילוב של עניינים מעשיים ושיתוף אישי.` },
  { n: 4, t: `בעיקר אישית`, d: `בעיקר מה שהתלמיד/ה חושבים ומרגישים.` },
  { n: 5, t: `עולם פנימי`, d: `ערכים, רגשות, חלומות, מה שבאמת מעסיק אותם.` },
];
const DEPTH_SCALE = { q: 'מה היה אופי השיחה? ממידע ועד עולם פנימי', labels: DEPTH_LEVELS.map((l) => l.t) };
const TALK_SCALE = { q: 'כמה מקום היה לקול של התלמיד/ה בשיחה?', labels: [`בעיקר אני דיברתי`, `אני דיברתי יותר`, `חלוקה שווה בערך`, `התלמיד/ה דיברו יותר`, `בעיקר התלמיד/ה דיברו`] };
const scaleOpts = (s) => s.labels.map((t, i) => ({ v: i + 1, t: `${i + 1} · ${t}` }));
// חמישה טווחים שווים של דיבור התלמיד/ה (תואם לשרת): 1 הכי הרבה דיבור שלי ... 5 הכי הרבה דיבור שלהם
const talkBucket = (pct) => Math.min(5, Math.floor(Math.max(0, pct - 1) / 20) + 1);
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
  { id: 'agency', t: `אייג'נסי`, icon: 'empower', d: `יצירתיות, שותפות ויכולת לפעול ולהשפיע.` },
];
const ICON = { check: 0, chev: 1, calendar: 2, checklist: 3, write: 4, reflect: 5, question: 6, insight: 7, idea: 8, community: 9, school: 10, data: 11, send: 12, secure: 13, person: 14, hourglass: 15, form: 17, team: 18, circle: 19, plan: 20, plant: 21, steps: 22, target: 23, empower: 24, compass: 25, book: 26, note: 27, practice: 28, id: 29, eye: 30, care: 31, alert: 32, gear: 33, trend: 34, pencil: 35, brain: 36, lock: 38, timer: 39, ballot: 40 };

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
  for (const c of [kids].flat(Infinity)) {
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
// חלוקת הדיבור כפס שגוררים: הצד הימני הוא המחנכת והשמאלי התלמיד/ה. נשמר אחוז הדיבור של התלמיד/ה (0 עד 100).
function talkSlider({ value, onChange }) {
  let me = value === null || value === undefined ? null : 100 - value; // אחוז הדיבור של המחנכת
  let dragging = false;
  const meSeg = h('div', { class: 'talkseg me' }), stSeg = h('div', { class: 'talkseg st' });
  const knob = h('span', { class: 'talkknob', 'aria-hidden': 'true' });
  const bar = h('div', { class: 'talkbar', role: 'slider', tabindex: '0', 'aria-label': TALK_SCALE.q, 'aria-valuemin': '0', 'aria-valuemax': '100' }, meSeg, stSeg, h('span', { class: 'talkmid', 'aria-hidden': 'true' }), knob);
  const readout = h('p', { class: 'scaleread', 'aria-live': 'polite' });
  const paint = () => {
    const set = me !== null, m = set ? me : 50;
    bar.classList.toggle('unset', !set);
    meSeg.style.flexBasis = m + '%'; stSeg.style.flexBasis = (100 - m) + '%';
    meSeg.textContent = m >= 22 ? 'אני' : ''; stSeg.textContent = 100 - m >= 22 ? 'התלמיד/ה' : '';
    knob.style.right = m + '%';
    if (set) {
      const text = `אני ${m}% · התלמיד/ה ${100 - m}% (${TALK_SCALE.labels[talkBucket(100 - m) - 1]})`;
      bar.setAttribute('aria-valuenow', String(m)); bar.setAttribute('aria-valuetext', text); readout.textContent = text;
    } else { bar.removeAttribute('aria-valuenow'); readout.textContent = 'אפשר לגרור את הקו, או להקיש על הפס.'; }
  };
  const setMe = (v) => { v = Math.max(0, Math.min(100, v)); if (v === me) return; me = v; paint(); onChange(100 - v); };
  // הפס הפוך (ימין הוא 0): הצד הימני גדל ככל שמזיזים את הקו שמאלה
  const fromEvent = (ev) => { const r = bar.getBoundingClientRect(); return Math.round(((r.right - ev.clientX) / r.width) * 20) * 5; };
  bar.addEventListener('pointerdown', (ev) => { dragging = true; try { bar.setPointerCapture(ev.pointerId); } catch { /* ignore */ } if (me === null) { me = -1; } setMe(fromEvent(ev)); bar.focus(); });
  bar.addEventListener('pointermove', (ev) => { if (dragging) setMe(fromEvent(ev)); });
  const stop = () => { dragging = false; };
  bar.addEventListener('pointerup', stop); bar.addEventListener('pointercancel', stop);
  bar.addEventListener('keydown', (ev) => {
    const d = { ArrowLeft: 5, ArrowUp: 5, ArrowRight: -5, ArrowDown: -5 }[ev.key];
    if (d === undefined) return;
    ev.preventDefault();
    if (me === null) me = 50 - d;
    setMe(me + d);
  });
  paint();
  return h('div', { class: 'talk' }, bar, readout);
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
    throw Object.assign(new Error('אין חיבור לשרת. כדאי לבדוק את החיבור ולנסות שוב.'), { status: 0 });
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error((json && json.error) || 'משהו השתבש. אפשר לנסות שוב.'), { status: res.status, code: json && json.code });
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
  // מובילה ומנהלת התכנית לא נכנסות לשיחות האישיות ולמיפוי (הם של כל מחנכת), ולכן הקישורים האלה לא מוצגים להן
  const staff = leadUser() || isAdmin();
  const links = me() ? [] : [{ to: '/', t: 'בית' }, ...(staff ? [] : [{ to: '/me', t: 'שיחות אישיות' }, { to: '/mapping', t: 'מיפוי הכיתה' }]), { to: '/tools', t: 'ארגז כלים' }];
  if (leadUser()) links.push({ to: '/lead', t: 'מובילות' });
  if (isAdmin()) links.push({ to: '/admin', t: 'מנהלת התכנית' });
  const active = (to) => (to === '/' ? p === '/' : p === to || p.startsWith(to + '/'));
  return h('header', { class: 'frame top' },
    h('a', { class: 'brand', href: '#/', 'aria-label': 'זמן לחינוך, לדף הבית', onclick: (e) => { e.preventDefault(); go('/'); } },
      h('img', { class: 'l-hotam', src: 'assets/logo/hotam-logo.png', alt: 'חותם' }), h('span', { class: 'sep', 'aria-hidden': 'true' }),
      h('img', { class: 'l-ort', src: 'assets/logo/ort-logo.png', alt: 'רשת אורט' }), h('span', { class: 'sep', 'aria-hidden': 'true' }),
      h('img', { class: 'l-zman', src: 'assets/logo/zman-logo.svg', alt: 'זמן לחינוך' })),
    links.length === 0 ? null : h('nav', { class: 'nav', 'aria-label': 'ניווט ראשי' }, links.map((l) => h('a', { href: '#' + l.to, 'aria-current': active(l.to) ? 'page' : null, onclick: (e) => { e.preventDefault(); go(l.to); } }, l.t))));
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
  state.area = p.startsWith('/admin') || p.startsWith('/lead') ? 'admin' : 'public';
  const view = resolve(p);
  clear(app);
  // מחנכת מחוברת: סרגל ניווט תחתון במקום התפריט העליון. במבט השבועי המסך כולו לשאלות, בלי סרגלים
  const edu = !!me() && state.area !== 'admin', inflow = edu && (p.startsWith('/me/report/') || p.startsWith('/welcome') || (p.startsWith('/tools/cards/') && CARDS_IMMERSIVE(p.slice('/tools/cards/'.length))));
  app.className = 'wrap' + (state.area === 'admin' ? ' admin' : '') + (edu ? ' edu' : '') + (inflow ? ' inflow' : '');
  document.body.classList.toggle('has-bn', edu && !inflow);
  add(app, inflow ? [view] : [header(), edu ? null : sessionBar(), view, h('p', { class: 'footer-note' }, 'זמן לחינוך · חותם ורשת אורט'), edu ? eduNav() : null]);
  window.scrollTo(0, same ? y0 : 0);
}
function resolve(p) {
  let m;
  if (p === '/') return me() ? eduHome() : viewHome();
  if (p === '/tools') return toolsHome();
  if (p === '/tools/cards' || p.startsWith('/tools/cards/')) return viewCards(p);
  if (p === '/tools/identity/listen') return listenTool();
  if (p === '/tools/identity/cards') return identityCards();
  if (p === '/tools/goals/journal') return journeyTool();
  if (p === '/tools/agency/partnership') return partnershipTool();
  if ((m = /^\/tools\/(identity|goals|agency)$/.exec(p))) return axisPage(m[1]);
  const gate = (path, view) => (me() ? view() : isAdmin() || leadUser() ? viewEducatorsOnly() : viewEnter('new', path));
  const gateMap = (path, view) => gate(path, () => { ensureMap(); pingMapping(); return view(); });
  const gateLead = (path, view) => (leadUser() ? view() : me() || isAdmin() ? viewLeadsOnly() : viewEnter('lead', path));
  if (p === '/mapping') return gateMap(p, eduClass);
  if (p.startsWith('/mapping/')) return redirect('/mapping');
  if (p.startsWith('/tools/mapping')) return redirect(p.replace('/tools/mapping', '/mapping'));
  if (p === '/enter') return viewEnter('new', '/me');
  if (p === '/enter/manager') return viewEnter('manager', '/admin');
  if (p === '/me') return gate(p, viewMe);
  if (p === '/welcome') return gate(p, eduWelcome);
  if (p === '/reminder') return gate(p, eduReminder);
  if (p === '/welcome/practice') return gate(p, () => eduWeek(CUR_WEEK, { practice: true }));
  if ((m = /^\/me\/report\/(\d{4}-\d{2}-\d{2})$/.exec(p))) { const wk = m[1]; return gate(p, () => eduWeek(wk)); }
  if (p.startsWith('/lead')) return gateLead(p, () => viewLead(p));
  if (p.startsWith('/admin')) return isAdmin() ? viewAdmin(p) : redirect('/enter/manager');
  return h('section', { class: 'frame' }, h('h2', null, 'העמוד לא נמצא'), h('a', { class: 'btn', href: '#/', onclick: (e) => { e.preventDefault(); go('/'); } }, 'לדף הבית'));
}
function viewEducatorsOnly() {
  return h('section', { class: 'frame' }, h('h2', null, 'האזור הזה אישי לכל מחנכת'),
    h('p', { class: 'muted', style: 'max-width:56ch' }, 'השיחות האישיות והמיפוי נפתחים בכניסה של המחנכת, בקוד האישי שלה. מנהלת התכנית והמובילות רואות את המבטים במסכים שלהן. מהמיפוי הן רואות רק כמה תלמידים בכל סבב, בלי שמות.'),
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
        h('li', null, 'שמות התלמידים במיפוי הכיתה נשארים במכשיר שלך. לשרת עולה רק כמה תלמידים בכל סבב, בלי שמות.'), h('li', null, 'אם בחרת תזכורת במייל, הכתובת נשמרת רק בשביל התזכורת.'),
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
   ארגז הכלים: המסכים נמצאים בחלק של חוויית המחנכת (toolsHome, axisPage והכלים עצמם)
   ===================================================================== */
const AG = () => window.ZMAN_AGENCY;

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
      mode('/tools/cards/depth', 'steps', 'לפי עומק וסוג השיחה', 'עומק: קליל, להעמיק או מעמיק, בהתאם לרמת הקשר. סוג: זהות וחוזקות, יעדים ומטרות, אייג\'נסי ושותפות. אפשר לשלב.', 'חדש')),
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
  { id: 'agency', t: "אייג'נסי ושותפות", d: 'שאלות על היכולת לפעול ולהשפיע, ועל מי ואיך אפשר להיעזר.' },
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
        h('div', { class: 'stack', style: 'gap:6px' }, h('h3', null, tp.t), h('p', { class: 'muted' }, tp.d), h('span', { class: 'tag', style: 'align-self:flex-start' }, `${D.cards.filter((c) => c.a.includes(tp.id)).length} קלפים`)))))));
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
  if (imm) setTimeout(focusPrompt, 0);
  if (on && !cardsChromeOff && !cardsHinted) { cardsHinted = true; setTimeout(() => toast('נגיעה בקלף מסתירה את הסרגל'), 700); }
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
const newStudent = (name = '') => ({ id: nid('s') + Math.random().toString(36).slice(2, 6), name, talks: 0, urgent: false, rounds: [false, false, false], last: '' });
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
  const done = async (res, to, fresh) => { await enter(res.user); justRegistered = !!fresh; if (res.user.role !== 'manager') { lsSet(RETURN_KEY, '1'); if (school) lsSet(SCHOOL_KEY, school); } if (res.user.role === 'educator' && !lsGet(ONBOARD_KEY + '.' + res.user.id)) { WEL.step = 0; to = '/welcome'; } go(to); };

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
      field('שם מלא', name, 'כך הכניסה בפעמים הבאות, ולכן כדאי לכתוב אותו כמו שהוא נכתב תמיד.'),
      field(role === 'lead' ? 'קוד הצטרפות של המובילות' : 'קוד הצטרפות של בית הספר', join, role === 'lead' ? 'את הקוד מקבלת המובילה ממנהלת התכנית.' : 'את הקוד מקבלים ממנהלת התכנית (למשל במפגש הליווי). הוא מוודא שרק מחנכות של התכנית נרשמות.'),
      h('div', { class: 'grid' }, field('בחירת קוד אישי', pin, 'ארבע ספרות שקל לך לזכור.'), field('אימות הקוד', pin2)),
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
      schoolPick(), field('שם', name, 'כמו בהרשמה הראשונה.'), field('קוד אישי', pin, 'הקוד נשכח? מנהלת התכנית יכולה לאפס אותו.'),
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
          : 'בוחרים בית ספר, מזינים את קוד ההצטרפות מהתכנית ובוחרים קוד אישי בן ארבע ספרות.';
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
    if (justRegistered) { justRegistered = false; root.push(h('div', { class: 'frame' }, h('div', { class: 'row' }, ic('check', { size: 30 }), h('h4', null, 'הקוד נשמר')), h('p', null, 'בפעם הבאה נכנסים עם בית ספר, שם והקוד שנבחר.'))); }
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
      h('div', { class: 'row' }, link('/tools', 'לארגז הכלים', 'btn soft sm'), link('/mapping', 'למיפוי הכיתה', 'btn soft sm'), h('button', { class: 'btn soft sm', onclick: cc.open }, 'החלפת קוד'), h('button', { class: 'btn soft sm', onclick: () => go('/reminder') }, 'תזכורת שבועית'), h('button', { class: 'btn soft sm', onclick: () => { WEL.step = 0; go('/welcome'); } }, 'הכניסה הראשונה, שוב'), h('button', { class: 'btn soft sm', onclick: logout }, 'יציאה')), cc.box));
    return root;
  });
}

function newConv() { return { round: null, axes: [], axisOther: '', kinds: [], kindOther: '', depth: null, talkPct: null, feeling: null, note: '' }; }

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
  if (d.classRounds) {
    const cr = d.classRounds;
    // מגיע מהמיפוי שבמכשיר של כל מחנכת: רק ארבעה מספרים, בלי שמות
    out.push(h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('h3', null, 'סבבי השיחות בכיתות'), h('span', { class: 'tag' }, `${cr.educators} מתוך ${cr.of} מחנכות מיפו`)),
      cr.educators ? barRows([['עוד לא דיברו', 0], ['אחרי סבב ראשון', 1], ['אחרי סבב שני', 2], ['אחרי סבב שלישי', 3]].map(([t, i]) => ({ t, n: cr.rounds[i].n, hidden: !!cr.rounds[i].hidden }))) : h('p', { class: 'muted' }, 'עוד אין מיפוי של כיתה.'),
      h('p', { class: 'small muted' }, d.masked ? 'כמה תלמידים בכל סבב, בכל הכיתות בבית הספר. ערכים קטנים מ-5 מוסתרים. השמות נשארים במכשיר של כל מחנכת.' : 'כמה תלמידים בכל סבב, בכל הכיתות שמופו. מסבב לסבב: עוד שיחה אישית עם אותו תלמיד/ה. השמות נשארים במכשיר של כל מחנכת.')));
  }
  const curNote = curIdx >= 0 && w === d.curWeek ? h('p', { class: 'micro muted' }, 'העמודה הכחולה: השבוע הנוכחי, שעוד פתוח.') : null;
  out.push(h('div', { class: 'grid' },
    h('section', { class: 'frame' }, h('h3', null, 'אחוז השליחה לפי שבוע'), columns(rate, curIdx), curNote),
    h('section', { class: 'frame' }, h('h3', null, 'שיחות לפי שבוע'), columns(convsPerWeek, curIdx), curNote ? curNote.cloneNode(true) : null)));
  // ההתפלגויות מצטברות מתחילת התכנית ולא תלויות בשבוע שנבחר למעלה, ולכן הכותרת אומרת את זה במפורש
  out.push(h('section', { class: 'frame quiet' }, h('h3', null, 'כל השיחות מתחילת התכנית'), h('p', { class: 'small muted' }, 'הנתונים כאן מצטברים, ולא משתנים כשעוברים בין שבועות.')));
  out.push(h('div', { class: 'grid' },
    h('section', { class: 'frame' }, h('h3', null, 'לפי סבב'), barRows(distRows(d.dist.round, ROUNDS))),
    h('section', { class: 'frame' }, h('h3', null, 'לפי ציר'), h('p', { class: 'small muted' }, 'אפשר לסמן כמה צירים לשיחה, ולכן הסכום גדול ממספר השיחות'), barRows(distRows(d.dist.axis, AXES))),
    h('section', { class: 'frame' }, h('h3', null, 'לפי סוג שיחה'), h('p', { class: 'small muted' }, 'גם כאן אפשר לסמן כמה'), barRows(distRows(d.dist.kind, KINDS))),
    h('section', { class: 'frame' }, h('h3', null, 'אופי השיחה'), h('p', { class: 'small muted' }, 'ממידע ומעשיות (1) עד עולם פנימי (5)'), barRows(distRows(d.dist.depth, scaleOpts(DEPTH_SCALE)))),
    h('section', { class: 'frame' }, h('h3', null, 'מקום לקול של התלמיד/ה'), h('p', { class: 'small muted' }, d.talkAvg === null || d.talkAvg === undefined ? 'מהמחנכת (1) עד התלמיד/ה (5)' : `בממוצע התלמיד/ה דיברו כ-${d.talkAvg}% מהשיחה. מהמחנכת (1) עד התלמיד/ה (5)`), barRows(distRows(d.dist.talk, scaleOpts(TALK_SCALE)))),
    h('section', { class: 'frame' }, h('h3', null, 'איך יצאו מהשיחה'), barRows(distRows(d.dist.feeling, FEELINGS)))));
  out.push(h('p', { class: 'muted small' }, d.masked ? 'ההתפלגויות מתחילת התכנית, לבית הספר שלך. ערכים קטנים מ-5 מוסתרים. אין כאן שום מידע על תלמידים.' : 'ההתפלגויות מתחילת התכנית, לפי בית הספר שנבחר. אין כאן שום מידע על תלמידים.'));
  return out;
}

function convLine(c) {
  const ax = c.axes.map((a) => (a === 'other' ? `אחר: ${c.axisOther}` : lab(AXES, a))).join(' · '), kd = c.kinds.map((k) => (k === 'other' ? `אחר: ${c.kindOther}` : lab(KINDS, k))).join(' · ');
  const f = FEELINGS.find((x) => x.v === c.feeling);
  return h('div', { class: 'well stack' }, h('div', { class: 'chips' }, c.round ? h('span', { class: 'tag lead' }, lab(ROUNDS, c.round)) : null, h('span', { class: 'tag' }, ax), h('span', { class: 'tag' }, kd), c.depth ? h('span', { class: 'tag', title: DEPTH_SCALE.q }, `אופי: ${DEPTH_SCALE.labels[c.depth - 1]}`) : null, c.talkPct !== null && c.talkPct !== undefined ? h('span', { class: 'tag', title: TALK_SCALE.q }, `דיבור התלמיד/ה: ${c.talkPct}%`) : null, f ? h('span', { class: 'tag emo', title: f.t }, f.e, h('span', { class: 'micro', style: 'margin-inline-start:6px' }, f.t)) : null), c.note ? h('p', null, c.note) : null);
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
      h('div', { class: 'chips' }, h('span', { class: 'tag lead' }, `${d.reportsCount} מתוך ${d.weeks.length} שבועות`), h('span', { class: 'tag' }, nConv(d.convs)), sc.admin ? h('span', { class: 'row small', style: 'gap:6px' }, 'מיפוי הכיתה:', mappingTag(d.educator.mapping)) : null),
      sc.admin && d.educator.classRounds ? h('p', { class: 'small muted' }, `סבבים בכיתה: ${d.educator.classRounds.r[0]} עוד לא · ${d.educator.classRounds.r[1]} סבב ראשון · ${d.educator.classRounds.r[2]} סבב שני · ${d.educator.classRounds.r[3]} סבב שלישי · עודכן ${shortDate(d.educator.classRounds.at)}`) : null),
    ...d.weeks.map(({ week: w, report: r }) => h('section', { class: 'frame' }, h('div', { class: 'row between' }, h('h4', null, `שבוע ${weekNo(w)} · ${weekLabel(w)}`), r ? h('span', { class: 'tag lead' }, nConv(r.convs.length)) : h('span', { class: 'tag todo' }, 'טרם נשלח')), ...(r ? r.convs.map(convLine) : [])))],
    (err, host) => { if (err.status === 404) { add(host, [notFound()]); return true; } return backToLead(sc)(err); });
}
function adminNotes(sc) {
  return asyncView(() => api('GET', `${sc.api}/notes${qs({ school: sc.admin ? adm.notesSchool : null, feeling: adm.notesFeeling, axis: adm.notesAxis })}`), (d) =>
    h('section', { class: 'frame' }, h('h3', null, `תובנות ושאלות (${d.total})`), h('p', { class: 'muted' }, 'ההערות החופשיות מכל המבטים: תובנות, שאלות שהמחנכות יצאו איתן ורעיונות.'),
      sc.admin ? schoolPills(() => adm.notesSchool, (v) => { adm.notesSchool = v; }) : null,
      h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'תחושה'), chipGroup({ options: [{ v: 'all', t: 'הכול' }, ...FEELINGS.map((x) => ({ v: x.v, t: `${x.e} ${x.t}` }))], value: adm.notesFeeling, cls: 'sm', label: 'תחושה', onChange: (v) => { adm.notesFeeling = v; render(); } })),
      h('div', { class: 'field' }, h('span', { class: 'qlabel' }, 'ציר'), chipGroup({ options: [{ v: 'all', t: 'הכול' }, ...AXES], value: adm.notesAxis, cls: 'sm', label: 'ציר', onChange: (v) => { adm.notesAxis = v; render(); } })),
      h('div', { class: 'grid' }, d.items.length ? d.items.map((it) => h('article', { class: 'well note' }, h('div', { class: 'chips' }, h('span', { class: 'tag lead' }, it.educator), h('span', { class: 'tag' }, `שבוע ${weekNo(it.week)}`), h('span', { class: 'tag' }, it.axes.map((a) => lab(AXES, a)).join(' · ')), (() => { const fe = FEELINGS.find((x) => x.v === it.feeling); return fe ? h('span', { class: 'tag emo', title: fe.t }, fe.e) : null; })()), h('blockquote', null, it.note))) : h('p', { class: 'muted' }, 'אין הערות שמתאימות לסינון.'))),
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
/* =====================================================================
   חוויית המחנכת (עיצוב אוקטובר 2026): דף בית, מבט שבועי בשאלה אחת למסך, סרגל ניווט תחתון וקונפטי.
   השרת והנתונים לא השתנו, חוץ מהסבב שכבר לא נשאל. הנוסחים בפנייה אישית שנקראת לשני הכיוונים:
   עבר בגוף שני ("דיברת"), "שלך" ו"לך", ושם פועל ("לבחור"). בלי ציווי ובלי הווה.
   ===================================================================== */
const BRAND = { blue: '#0046ff', purple: '#6437eb', deep: '#3c5af0', sky: '#0fb4f5', turq: '#23d7cd', light: '#f0f0f0', ink: '#10131f' };
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const svgSpan = (markup, cls = '') => { const s = h('span', { class: cls, 'aria-hidden': 'true' }); s.innerHTML = markup; return s; };

/* ---------- קונפטי, בצבעי המותג בלבד ---------- */
let fxCanvas = null, fxParts = [], fxRaf = 0;
function confetti(n, spread = 1, origin) {
  if (reduceMotion()) n = Math.min(n, 18);
  if (!fxCanvas) { fxCanvas = h('canvas', { class: 'fx', 'aria-hidden': 'true' }); document.body.append(fxCanvas); }
  const dpr = window.devicePixelRatio || 1;
  fxCanvas.width = innerWidth * dpr; fxCanvas.height = innerHeight * dpr;
  const W = fxCanvas.width, H = fxCanvas.height, cols = [BRAND.blue, BRAND.purple, BRAND.sky, BRAND.turq, BRAND.deep];
  const ox = origin ? origin.x * dpr : null, oy = origin ? origin.y * dpr : H * 0.42;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6 * spread, v = (6 + Math.random() * 9) * dpr * (0.8 + spread * 0.3);
    fxParts.push({ x: ox !== null ? ox : W / 2 + (Math.random() - 0.5) * W * 0.3 * spread, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (3 + Math.random() * 4) * dpr, c: cols[k % 5], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, shape: k % 3, life: 0, g: 0.25 * dpr });
  }
  if (!fxRaf) fxTick();
}
function confettiRain(n) {
  if (reduceMotion()) return;
  if (!fxCanvas) confetti(0);
  const dpr = window.devicePixelRatio || 1, W = fxCanvas.width, cols = [BRAND.blue, BRAND.purple, BRAND.sky, BRAND.turq];
  for (let k = 0; k < n; k++) fxParts.push({ x: Math.random() * W, y: -Math.random() * fxCanvas.height * 0.6, vx: (Math.random() - 0.5) * 2, vy: (2 + Math.random() * 3) * dpr, r: (3 + Math.random() * 4) * dpr, c: cols[k % 4], rot: 0, vr: 0.1, shape: k % 3, life: 0, g: 0.25 * dpr });
  if (!fxRaf) fxTick();
}
function fxTick() {
  const cx = fxCanvas.getContext('2d');
  cx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  for (const p of fxParts) {
    p.vy += p.g; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.c;
    if (p.shape === 0) cx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
    else if (p.shape === 1) { cx.beginPath(); cx.arc(0, 0, p.r * 0.7, 0, 7); cx.fill(); }
    else { cx.beginPath(); cx.moveTo(0, -p.r); cx.lineTo(p.r, p.r); cx.lineTo(-p.r, p.r); cx.fill(); }
    cx.restore();
  }
  fxParts = fxParts.filter((p) => p.y < fxCanvas.height + 40 && p.life < 400);
  fxRaf = fxParts.length ? requestAnimationFrame(fxTick) : 0;
  if (!fxRaf) cx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
}
function burstFrom(el, n) { const r = el.getBoundingClientRect(); confetti(n, 0.7, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); }
function heartPop() {
  const el = svgSpan('<svg viewBox="0 0 24 24" width="90" height="90"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="#6437eb"/></svg>', 'heartpop');
  document.body.append(el);
  requestAnimationFrame(() => el.classList.add('go'));
  setTimeout(() => el.remove(), 1400);
}
// חגיגה במדרג: שיחה אחת לב, שתיים קונפטי קטן, שלוש קונפטי, ארבע גדול, חמש ומעלה גם גשם
function celebrate(n) { if (n === 1) heartPop(); else if (n === 2) confetti(40, 0.6); else if (n === 3) confetti(90, 1); else if (n === 4) confetti(150, 1.4); else if (n >= 5) { confetti(160, 1.5); confettiRain(120); } }
const COUNT_MSG = ['גם שבוע בלי שיחות הוא חלק מהדרך', 'שיחה אחת. זו כבר התחלה', 'שתי שיחות. יפה מאוד', 'שלוש שיחות. שבוע עשיר', 'ארבע שיחות. מרשים', 'שבוע יוצא דופן'];

/* ---------- סרגל ניווט תחתון למחנכת ---------- */
function eduNav() {
  const p = route();
  const isOn = (to) => (to === '/' ? p === '/' : to === '/tools' ? p.startsWith('/tools') && !p.startsWith('/tools/cards') : to.startsWith('/me/report') ? p.startsWith('/me') : p === to || p.startsWith(to + '/'));
  const item = (to, icon, t, mid) => {
    const on = isOn(to);
    return h('a', { class: 'bn' + (mid ? ' mid' : '') + (on ? ' on' : ''), href: '#' + to, 'aria-current': on ? 'page' : null, onclick: (e) => { e.preventDefault(); go(to); } },
      mid ? h('span', { class: 'ring' }, ic(icon, { size: 28, tone: 'white' })) : ic(icon, { size: 26, tone: 'blue' }), h('span', { class: 'bnl' }, t));
  };
  return h('nav', { class: 'bottomnav', 'aria-label': 'ניווט' },
    item('/', 'school', 'בית'), item('/mapping', 'community', 'הכיתה'), item(`/me/report/${CUR_WEEK}`, 'calendar', 'מבט שבועי', true),
    item('/tools', 'book', 'כלים'), item('/tools/cards', 'idea', 'קלפי שיח'));
}

/* ---------- נתונים קטנים שמשותפים לבית ולמסך הסיום ---------- */
const HOME_TOOLS = [
  { to: '/tools/cards', t: 'קלפי שיח', d: 'שאלות ותמונות לשיחה אישית', i: 'idea', c: BRAND.blue },
  { to: '/tools/identity/listen', t: 'להקשיב לכוחות', d: 'ארבע שאלות לראש, לפני השיחה', i: 'eye', c: BRAND.deep },
  { to: '/tools/identity/cards', t: 'יש בי יותר ממה שרואים', d: 'קלפים לשיחה על חוזקות', i: 'id', c: BRAND.purple },
  { to: '/tools/goals/journal', t: 'המסע שלי', d: 'שיחה על מטרות, ודפים להדפסה', i: 'target', c: BRAND.blue },
  { to: '/tools/agency/partnership', t: 'שותפות תלמידים', d: 'תפקידים לכיתה ושאלות לשיחה', i: 'empower', c: BRAND.purple },
];
const allConvs = () => myReports.flatMap((r) => r.convs);
const avgTalk = (list) => { const v = list.map((c) => c.talkPct).filter((x) => x !== null && x !== undefined); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
function streakWeeks() {
  let w = myReport(CUR_WEEK) ? CUR_WEEK : addDays(CUR_WEEK, -7), n = 0;
  while (w >= joinWeek() && myReport(w)) { n++; w = addDays(w, -7); }
  return n;
}
let together = null, togetherAt = 0;
function togetherBox(host) {
  const paint = () => {
    clear(host);
    if (!together) return;
    const dots = Math.min(together.convs, 160);
    add(host, [h('section', { class: 'together rise' }, h('span', { class: 'tg-k' }, `יחד · ${together.educators} מחנכות בתכנית`), h('span', { class: 'tg-v num' }, nConv(together.convs)),
      h('span', { class: 'tg-s' }, 'בארבעת השבועות האחרונים, בכל בתי הספר. כל נקודה היא שיחה.'),
      h('div', { class: 'tg-dots', 'aria-hidden': 'true' }, Array.from({ length: dots }, (_, i) => h('i', { class: i % 7 === 0 ? 'l' : i % 2 ? 't' : 's' }))))]);
  };
  if (together && Date.now() - togetherAt < 300000) paint();
  else api('GET', '/api/me/together').then((r) => { together = r; togetherAt = Date.now(); if (document.body.contains(host)) paint(); }, () => {});
  return host;
}

/* ---------- דף הבית של המחנכת ---------- */
function eduHome() {
  const e = session, cur = myReport(CUR_WEEK), n = cur ? cur.convs.length : 0;
  ensureMap();
  const weeks = weeksBetween(joinWeek(), CUR_WEEK).slice(-8);
  const counts = weeks.map((w) => (myReport(w) ? myReport(w).convs.length : 0));
  const max = Math.max(4, ...counts);
  const bars = h('div', { class: 'wbars', role: 'img', 'aria-label': `מספר השיחות ב-${weeks.length} השבועות האחרונים: ${counts.join(', ')}` }, weeks.map((w, i) => {
    const now = w === CUR_WEEK, v = counts[i];
    if (now) return h('div', { class: 'wbar now' + (cur ? ' filled' : '') }, h('i', { style: cur ? `height:${Math.max(22, (v / max) * 82)}px` : '' }, cur ? String(v) : '?'), h('b', null, 'השבוע'));
    return h('div', { class: 'wbar' }, h('i', { style: `height:${Math.max(4, (v / max) * 82)}px;animation-delay:${i * 60}ms` }), h('b', null, String(weekNo(w))));
  }));
  const streak = streakWeeks();
  const hero = h('section', { class: 'ehero rise' }, h('span', { class: 'blob b1' }), h('span', { class: 'blob b2' }),
    h('span', { class: 'eyebrow' }, `שבוע ${weekNo(CUR_WEEK)} · ${weekLabel(CUR_WEEK)}`),
    h('h2', null, cur ? 'השבוע סופר. תודה' : 'המבט השבועי'),
    h('p', null, cur ? (n ? `${nConv(n)} נכנסו לסיפור של השנה. אפשר לעדכן עד סוף השבוע.` : 'שבוע בלי שיחות נשמר. אפשר לעדכן עד סוף השבוע.') : 'שתי דקות על השיחות של השבוע. כל שיחה ממלאת את העמודה.'),
    bars,
    link(`/me/report/${CUR_WEEK}`, cur ? 'לעדכן את השבוע' : 'לספר על השבוע', 'cta light'),
    h('small', null, [streak > 1 ? `${streak} שבועות ברצף · ` : '', h('a', { href: '#/me', onclick: (ev) => { ev.preventDefault(); go('/me'); } }, 'כל השבועות שלי')]));
  const list = allConvs(), deep = list.filter((c) => c.depth >= 4).length, talk = avgTalk(list);
  const stat = (v, l, c) => h('div', { class: 'stat' }, h('span', { class: 'sdot', style: `background:${c}` }), h('span', { class: 'sv num' }, v), h('span', { class: 'sl' }, l));
  const kids = map.students.length, waiting = map.students.filter((s) => !talksOf(s)).length;
  const journey = h('section', { class: 'esec rise' }, h('h3', { class: 'sh' }, 'המסע שלך עד עכשיו'),
    h('div', { class: 'hs' }, stat(String(list.length), 'שיחות אישיות מתחילת השנה', BRAND.blue), stat(String(deep), 'שיחות בעומק אישי', BRAND.purple),
      talk !== null ? stat(`${talk}%`, 'מהזמן התלמידים דיברו', BRAND.turq) : null, stat(String(myReports.length), 'שבועות שנשלחו', BRAND.sky)));
  const klass = h('section', { class: 'esec rise' }, h('h3', { class: 'sh' }, 'הכיתה שלי', kids ? link('/mapping', 'לכל הכיתה', 'shl') : null),
    h('div', { class: 'panel' }, kids
      ? [h('div', { class: 'mini', 'aria-hidden': 'true' }, map.students.slice(0, 40).map((s) => h('i', { style: `background:${ROUND_LOOK[roundOf(s)].c}` }))),
        h('div', { class: 'row between' }, h('div', null, h('b', { class: 'big' }, `${waiting} תלמידים`), h('div', { class: 'small muted' }, 'עוד מחכים לשיחה ראשונה')), link('/mapping', 'לבחור 3 להשבוע', 'btn sm'))]
      : h('div', { class: 'row between' }, h('div', null, h('b', null, 'עוד לא הוספת את הכיתה'), h('div', { class: 'small muted' }, 'שמות פרטיים בלבד, נשמרים רק במכשיר שלך')), link('/mapping', 'להוספת הכיתה', 'btn sm'))));
  const tools = h('section', { class: 'esec rise' }, h('h3', { class: 'sh' }, 'כלים לשיחה הבאה', link('/tools', 'לכל הכלים', 'shl')),
    h('div', { class: 'hs' }, HOME_TOOLS.map((t) => h('a', { class: 'tcard', style: `background:${t.c}`, href: '#' + t.to, onclick: (ev) => { ev.preventDefault(); go(t.to); } },
      ic(t.i, { size: 34, tone: 'white' }), h('span', null, h('b', null, t.t), h('span', null, t.d))))));
  const who = pub.leadSeesNames ? 'מנהלת התכנית רואה את כל המבטים. המובילה בבית הספר רואה רק את בית הספר שלה, כולל שמות והערות.' : 'מנהלת התכנית רואה את כל המבטים. המובילה בבית הספר רואה רק נתונים מצטברים של בית הספר שלה, בלי שמות.';
  const privacy = h('section', { class: 'frame quiet' }, h('details', null, h('summary', null, ic('lock', { size: 20 }), 'מה נשמר, ומי רואה?'),
    h('ul', { class: 'plain' }, h('li', null, 'לא נשמרים שמות תלמידים ולא תיעוד על ילד או ילדה.'), h('li', null, 'בכל שבוע נשמר מספר השיחות, ולכל שיחה כמה בחירות קצרות והערה חופשית.'),
      h('li', null, 'שמות התלמידים במיפוי הכיתה נשארים במכשיר של המחנכת. לשרת עולה רק כמה תלמידים בכל סבב, בלי שמות.'), h('li', null, who))));
  const top = h('div', { class: 'etop' }, h('div', null, h('div', { class: 'hello' }, `שלום ${firstName(e.name)}`), h('div', { class: 'small muted' }, e.schoolName)),
    h('a', { class: 'avatar', href: '#/me', 'aria-label': 'השבועות והחשבון שלי', onclick: (ev) => { ev.preventDefault(); go('/me'); } }, firstName(e.name).slice(0, 1)));
  const tg = togetherBox(h('div'));
  const root = h('div', { class: 'ehome' }, top, hero, remChip(), journey, klass, tools, tg, privacy);
  if (justRegistered) { justRegistered = false; toast('הקוד נשמר. בפעם הבאה נכנסים עם בית ספר, שם והקוד.'); }
  return root;
}

/* ---------- איורים: סוגי שיחה, צוללן ופרצופים ---------- */
const KIND_ART = {
  intro: '<svg viewBox="0 0 56 56" width="56" height="56"><rect x="4" y="8" width="30" height="22" rx="10" fill="#0046ff"/><path d="M12 30l-2 8 9-8z" fill="#0046ff"/><rect x="22" y="22" width="30" height="22" rx="10" fill="#23d7cd"/><path d="M44 44l2 8-9-8z" fill="#23d7cd"/><circle cx="31" cy="33" r="2.2" fill="#10131f"/><circle cx="37" cy="33" r="2.2" fill="#10131f"/><circle cx="43" cy="33" r="2.2" fill="#10131f"/><path d="M13 19h12" stroke="#f0f0f0" stroke-width="3" stroke-linecap="round"/></svg>',
  notebook: '<svg viewBox="0 0 56 56" width="56" height="56"><rect x="5" y="16" width="22.5" height="28" rx="5" fill="#0046ff"/><rect x="28.5" y="16" width="22.5" height="28" rx="5" fill="#23d7cd"/><circle cx="28.5" cy="30" r="6.5" fill="#0046ff"/><circle cx="39.75" cy="16" r="5.5" fill="#23d7cd"/><circle cx="16.25" cy="44" r="5.5" fill="#0046ff"/><path d="M44 6l1.6 3.4 3.4 1.6-3.4 1.6L44 16l-1.6-3.4-3.4-1.6 3.4-1.6z" fill="#6437eb"/></svg>',
  complex: '<svg viewBox="0 0 56 56" width="56" height="56"><circle cx="28" cy="28" r="24" fill="#e8efff"/><path d="M10 30c6-14 14 10 20-4s-8-14-12-4 10 18 18 8 2-14-4-8" stroke="#6437eb" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="40" cy="22" r="4" fill="#23d7cd"/></svg>',
  grades: '<svg viewBox="0 0 56 56" width="56" height="56"><rect x="6" y="10" width="40" height="30" rx="4" fill="#f0f0f0" stroke="#0046ff" stroke-width="3"/><path d="M13 20h20M13 27h14" stroke="#0046ff" stroke-width="2.5" stroke-linecap="round"/><circle cx="40" cy="36" r="9" fill="#6437eb"/><path d="M35 43l-3 10 8-5 8 5-3-10" fill="#23d7cd"/><circle cx="40" cy="36" r="4" fill="#f0f0f0"/></svg>',
  parents: '<svg viewBox="0 0 56 56" width="56" height="56"><circle cx="15" cy="16" r="7" fill="#0046ff"/><path d="M4 46c0-12 5-20 11-20s11 8 11 20z" fill="#0046ff"/><circle cx="41" cy="16" r="7" fill="#6437eb"/><path d="M30 46c0-12 5-20 11-20s11 8 11 20z" fill="#6437eb"/><circle cx="28" cy="30" r="5.5" fill="#23d7cd"/><path d="M20 50c0-8 3.5-13 8-13s8 5 8 13z" fill="#23d7cd"/></svg>',
  other: '<svg viewBox="0 0 56 56" width="56" height="56"><path d="M28 6l4.5 13.5L46 24l-13.5 4.5L28 42l-4.5-13.5L10 24l13.5-4.5z" fill="#0fb4f5"/><circle cx="44" cy="44" r="4" fill="#6437eb"/><circle cx="12" cy="44" r="3" fill="#23d7cd"/><circle cx="46" cy="10" r="2.5" fill="#0046ff"/></svg>',
};
const AXIS_LOOK = { identity: { i: 'id', c: BRAND.turq }, goals: { i: 'target', c: BRAND.sky }, agency: { i: 'empower', c: BRAND.purple }, other: { i: 'idea', c: BRAND.deep } };
const DIVER = '<svg class="dsvg" viewBox="0 0 64 64" width="70" height="70"><path d="M20 53l-9 8h11z" fill="#0046ff"/><path d="M44 53l9 8H42z" fill="#0046ff"/><ellipse cx="32" cy="46" rx="13" ry="11" fill="#6437eb"/><path class="arm" d="M21 44q-9-1-11-9" stroke="#6437eb" stroke-width="5" stroke-linecap="round" fill="none"/><path d="M43 44q7 2 9-3" stroke="#6437eb" stroke-width="5" stroke-linecap="round" fill="none"/><circle cx="32" cy="25" r="16" fill="#6437eb"/><circle cx="32" cy="27" r="12.5" fill="#f0f0f0"/><path d="M47 21V7h4" stroke="#0fb4f5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="18" y="17" width="28" height="13" rx="6.5" fill="#23d7cd"/><rect x="20.5" y="19.3" width="23" height="8.4" rx="4.2" fill="#f0f0f0"/><g class="eyes"><circle cx="27.5" cy="23.5" r="2.4" fill="#10131f"/><circle cx="36.5" cy="23.5" r="2.4" fill="#10131f"/></g><circle cx="23" cy="34" r="2" fill="#0fb4f5" opacity=".5"/><circle cx="41" cy="34" r="2" fill="#0fb4f5" opacity=".5"/><path d="M28 34q4 3.5 8 0" stroke="#10131f" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>';
const FISH = '<svg width="30" height="16" viewBox="0 0 30 16"><ellipse cx="11" cy="8" rx="10" ry="6" fill="#f0f0f0"/><path d="M20 8l9-6v12z" fill="#f0f0f0"/><circle cx="6" cy="7" r="1.4" fill="#10131f"/></svg>';
const SEA = [BRAND.turq, BRAND.sky, BRAND.deep, BRAND.blue, BRAND.purple];
const FACE_LOOK = { inspired: { c: '#0046ff', k: '#f0f0f0', f: 'wow' }, good: { c: '#23d7cd', k: '#10131f', f: 'good' }, neutral: { c: '#0fb4f5', k: '#10131f', f: 'flat' }, thoughtful: { c: '#3c5af0', k: '#f0f0f0', f: 'think' }, frustrated: { c: '#6437eb', k: '#f0f0f0', f: 'frus' }, heavy: { c: '#55585f', k: '#f0f0f0', f: 'heavy' } };
const starPath = (x, y, r, fill) => { let p = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); } return `<path d="${p}z" fill="${fill}"/>`; };
function faceSvg({ c, k, f }) {
  const s = `stroke="${k}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const dots = `<g class="eyes"><circle cx="23" cy="31" r="3.2" fill="${k}"/><circle cx="41" cy="31" r="3.2" fill="${k}"/></g>`;
  const P = {
    wow: `${starPath(23, 30, 6.5, k)}${starPath(41, 30, 6.5, k)}<path d="M21 39h22a11 11 0 0 1-22 0z" fill="${k}"/><path d="M7 8v8M3 12h8M57 6v6M54 9h6" stroke="#23d7cd" stroke-width="2.5" stroke-linecap="round"/>`,
    good: `<path d="M18 32q5-6 10 0M36 32q5-6 10 0" ${s}/><path d="M22 40q10 9 20 0" ${s}/><circle cx="16" cy="39" r="3.5" fill="#f0f0f0" opacity=".55"/><circle cx="48" cy="39" r="3.5" fill="#f0f0f0" opacity=".55"/>`,
    flat: `${dots}<path d="M24 43h16" ${s}/>`,
    think: `<g class="eyes"><circle cx="25" cy="29" r="3.2" fill="${k}"/><circle cx="43" cy="29" r="3.2" fill="${k}"/></g><path d="M37 20q5-4 10-1" ${s}/><path d="M26 44q5-3 11 0" ${s}/><circle cx="53" cy="10" r="4" fill="#0fb4f5"/><circle cx="59" cy="3.5" r="2.4" fill="#0fb4f5"/>`,
    frus: `<path d="M17 22l9 4M47 22l-9 4" ${s}/>${dots}<path d="M21 45l4-3 4 3 4-3 4 3 4-3 3 2" ${s}/>`,
    heavy: `<path d="M18 30q5 4 10 0M36 30q5 4 10 0" ${s}/><path d="M25 46q7-5 14 0" ${s}/><path d="M46 36q3.5 4.5 0 7q-3.5-2.5 0-7z" fill="#0fb4f5"/>`,
  };
  return `<svg viewBox="0 0 64 64" width="58" height="58"><circle cx="32" cy="35" r="27" fill="${c}"/>${P[f]}</svg>`;
}
// עומק השיחה כצלילה: גוררים את הצוללן או מקישים על שכבה. נשמר כשלב 1 עד 5, כמו קודם.
function diveSlider({ value, onChange }) {
  let lvl = value || null, drag = false;
  const ruler = h('div', { class: 'ruler', 'aria-hidden': 'true' }, DEPTH_LEVELS.map((l, i) => h('div', { class: 'rl' }, h('b', null, l.t), h('span', null, `${i * 10}–${(i + 1) * 10} מ'`))));
  const diver = svgSpan(DIVER, 'diver');
  const ocean = h('div', { class: 'ocean', role: 'slider', tabindex: '0', 'aria-label': 'עומק השיחה', 'aria-valuemin': '1', 'aria-valuemax': '5' },
    SEA.map((c, i) => h('div', { class: 'band', style: `top:${i * 20}%;background:${c}` })),
    svgSpan('<svg viewBox="0 0 200 12" preserveAspectRatio="none"><path d="M0 6 Q12.5 0 25 6 T50 6 T75 6 T100 6 T125 6 T150 6 T175 6 T200 6 V0 H0z" fill="#f0f0f0"/></svg>', 'wave'),
    [31, 55, 83].map((t, i) => svgSpan(FISH, 'fish')).map((f, i) => { f.style.cssText = `top:${[31, 55, 83][i]}%;--fd:${[9, 12, 15][i]}s;animation-delay:-${[0, 5, 2][i]}s`; return f; }),
    diver);
  const read = h('div', { class: 'depthread', 'aria-live': 'polite' });
  const paint = () => {
    diver.style.top = lvl ? `${(lvl - 0.5) * 20}%` : '34px';
    [...ruler.children].forEach((r, i) => r.classList.toggle('on', i === lvl - 1));
    clear(read);
    if (lvl) { const L = DEPTH_LEVELS[lvl - 1]; add(read, [h('b', null, L.t), h('span', null, L.d)]); ocean.setAttribute('aria-valuenow', String(lvl)); ocean.setAttribute('aria-valuetext', L.t); }
    else add(read, [h('span', null, 'אפשר לגרור את הצוללן למטה, או להקיש על עומק')]);
  };
  const set = (v) => { v = Math.max(1, Math.min(5, v)); if (v === lvl) return; const was = lvl; lvl = v; paint(); onChange(v); if (v === 5 && was !== 5) burstFrom(diver, 30); };
  const at = (ev) => { const r = ocean.getBoundingClientRect(); return Math.ceil(((ev.clientY - r.top) / r.height) * 5); };
  ocean.addEventListener('pointerdown', (ev) => { drag = true; try { ocean.setPointerCapture(ev.pointerId); } catch { /* ignore */ } set(at(ev)); });
  ocean.addEventListener('pointermove', (ev) => { if (drag) set(at(ev)); });
  ocean.addEventListener('pointerup', () => { drag = false; }); ocean.addEventListener('pointercancel', () => { drag = false; });
  ocean.addEventListener('keydown', (ev) => { const d = { ArrowDown: 1, ArrowUp: -1, ArrowLeft: 1, ArrowRight: -1 }[ev.key]; if (d === undefined) return; ev.preventDefault(); set((lvl || 0) + d); });
  // בועות שעולות מהצוללן, יותר ככל שצוללים עמוק
  if (!reduceMotion()) {
    const t = setInterval(() => {
      if (!document.body.contains(ocean)) { clearInterval(t); return; }
      const n = 1 + Math.floor((lvl || 0) / 2);
      for (let k = 0; k < n; k++) {
        const b = h('i', { class: 'bb' }), s = 4 + Math.random() * 7;
        b.style.cssText = `width:${s}px;height:${s}px;left:calc(50% + ${(Math.random() - 0.5) * 30}px);top:calc(${diver.style.top} - 20px);animation-delay:${k * 120}ms`;
        ocean.append(b); setTimeout(() => b.remove(), 2200);
      }
    }, 420);
  }
  paint();
  return h('div', { class: 'stack', style: 'gap:10px' }, h('div', { class: 'dive' }, ruler, ocean), read);
}

/* ---------- המבט השבועי: שאלה אחת למסך ---------- */
const STEPS = ['axis', 'kind', 'depth', 'talk', 'feel'];
function eduWeek(week, opts = {}) {
  const practice = !!opts.practice;
  if (week > CUR_WEEK || week < joinWeek()) return h('section', { class: 'frame' }, h('h2', null, 'השבוע הזה לא פתוח למבט'), link('/', 'חזרה לבית'));
  const e = session, existing = myReport(week);
  // טיוטה של מבט שעוד לא נשלח נשמרת רק במכשיר הזה, ונמחקת כשהמבט נשלח
  const dkey = `${DRAFT_KEY}.${e.id}.${week}`;
  const saved = practice ? null : (() => { try { return JSON.parse(lsGet(dkey) || 'null'); } catch { return null; } })();
  const draft = JSON.parse(JSON.stringify(saved && Array.isArray(saved.convs) ? saved : existing && !practice ? { convs: existing.convs.map((c) => ({ ...c, legacy: c.depth == null && c.talkPct == null })), noneReason: existing.noneReason || '' } : { convs: [], noneReason: '' }));
  draft.convs.forEach((c) => {
    if (!Array.isArray(c.axes)) c.axes = c.axis ? [c.axis] : [];
    if (!Array.isArray(c.kinds)) c.kinds = c.kind ? [c.kind] : [];
    delete c.axis; delete c.kind;
    if (c.kinds.includes('deep')) { c.kinds = [...new Set(c.kinds.map((k) => (k === 'deep' ? 'other' : k)))]; c.kindOther = c.kindOther || 'שיחת עומק'; }
    c.axisOther = c.axisOther || ''; c.kindOther = c.kindOther || ''; c.note = c.note || '';
  });
  const F = { step: 'count', ci: 0, sending: false, err: '' };
  let t = null;
  const persist = () => { if (!practice) lsSet(dkey, JSON.stringify(draft)); };
  const touch = () => { clearTimeout(t); t = setTimeout(persist, 400); };
  const root = h('div', { class: 'wflow' });
  const cur = () => draft.convs[F.ci];
  const nameWarn = (texts) => { const names = findNames(texts.join(' ')); return names.length ? `נראה שמופיע שם (${names.join(', ')}). המבט לא צריך שמות תלמידים: אפשר לכתוב "התלמיד/ה".` : ''; };
  const canNext = () => {
    const c = cur();
    switch (F.step) {
      case 'axis': return c.axes.length && (!c.axes.includes('other') || c.axisOther.trim());
      case 'kind': return c.kinds.length && (!c.kinds.includes('other') || c.kindOther.trim());
      case 'depth': return !!c.depth || !!c.legacy;
      case 'talk': return (c.talkPct !== null && c.talkPct !== undefined) || !!c.legacy;
      case 'feel': return !!c.feeling;
      default: return true;
    }
  };
  let nextBtn = null;
  const upd = () => { if (nextBtn) nextBtn.disabled = !canNext() || F.sending; };
  const go2 = (step) => { F.step = step; paint(); };
  const back = () => {
    const s = F.step, pop = () => { F.ci--; F.step = 'feel'; };
    if (s === 'zero') F.step = 'count';
    else if (s === 'axis') { if (F.ci === 0) F.step = 'count'; else pop(); }
    else if (STEPS.includes(s)) F.step = STEPS[STEPS.indexOf(s) - 1];
    else if (s === 'saved') pop();
    paint();
  };
  const close = () => { persist(); if (practice) { WEL.step = 2; go('/welcome'); } else go('/'); };

  function progress() {
    const n = Math.max(1, draft.convs.length);
    if (F.step === 'count' || F.step === 'zero') return h('div', { class: 'prog' }, h('i', { class: 'c' }), Array.from({ length: n }, () => h('i')));
    return h('div', { class: 'prog' }, h('i', { class: 'd' }), Array.from({ length: n }, (_, k) => h('i', { class: F.step === 'done' || k < F.ci ? 'd' : k === F.ci ? 'c' : '' })));
  }
  function head() {
    return h('div', { class: 'wtop' },
      F.step !== 'count' && F.step !== 'done' ? h('button', { class: 'fbtn', type: 'button', 'aria-label': 'חזרה לשאלה הקודמת', onclick: back }, svgSpan('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>')) : null,
      progress(),
      F.step !== 'done' ? h('button', { class: 'fbtn', type: 'button', 'aria-label': practice ? 'סיום התרגול' : 'סגירה. הטיוטה נשמרת במכשיר', onclick: close }, svgSpan('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>')) : null);
  }
  const q = (kicker, title, sub, ...body) => h('div', { class: 'qwrap' }, kicker ? h('span', { class: 'qk' }, kicker) : null, h('h2', { class: 'qt' }, title), sub ? h('p', { class: 'qs' }, sub) : null, ...body);
  const nextButton = (label, onclick, cls = 'cta') => { nextBtn = h('button', { class: cls, type: 'button', onclick }, label); upd(); return nextBtn; };
  const convKick = () => `שיחה ${F.ci + 1} מתוך ${draft.convs.length}${week < CUR_WEEK ? ` · שבוע ${weekNo(week)}` : ''}`;
  const tile = (on, art, label, onclick) => h('button', { class: 'qtile' + (on ? ' on' : ''), type: 'button', 'aria-pressed': String(on), onclick }, art, h('span', null, label));
  const otherInput = (val, ph, onInput) => {
    const warn = h('p', { class: 'warn-note', hidden: true });
    const inp = h('input', { class: 'input othin', value: val, placeholder: ph, maxlength: '120', 'aria-label': ph, oninput: (ev) => { onInput(ev.target.value); const w = nameWarn([ev.target.value]); warn.hidden = !w; warn.textContent = w; upd(); } });
    return [inp, warn];
  };

  function body() {
    nextBtn = null;
    const s = F.step, n = draft.convs.length;
    if (s === 'count') {
      const out = h('span', { class: 'cnum num', 'aria-live': 'polite' }, String(n));
      const tokens = h('div', { class: 'tokens', 'aria-hidden': 'true' });
      const msg = h('div', { class: 'cmsg' });
      const next = h('button', { class: 'cta', type: 'button' });
      const paintCount = () => {
        const k = draft.convs.length;
        out.textContent = String(k);
        clear(tokens); add(tokens, draft.convs.map((_, i) => h('i', { style: `background:${[BRAND.blue, BRAND.purple, BRAND.turq, BRAND.sky, BRAND.deep][i % 5]}` }, String(i + 1))));
        msg.textContent = k ? COUNT_MSG[Math.min(k, 5)] : '';
        next.textContent = k ? 'לשיחה הראשונה' : week === CUR_WEEK ? 'לא היו השבוע שיחות' : 'לא היו שיחות בשבוע הזה';
        minus.disabled = k === 0; plus.disabled = k >= 15;
      };
      const minus = h('button', { class: 'cbtn', type: 'button', 'aria-label': 'שיחה אחת פחות', onclick: () => { draft.convs.pop(); touch(); paintCount(); } }, '−');
      const plus = h('button', { class: 'cbtn plus', type: 'button', 'aria-label': 'עוד שיחה', onclick: () => { draft.convs.push(newConv()); touch(); paintCount(); out.classList.remove('pop'); void out.offsetWidth; out.classList.add('pop'); celebrate(draft.convs.length); } }, '+');
      next.onclick = () => { F.ci = 0; go2(draft.convs.length ? 'axis' : 'zero'); };
      paintCount();
      return q(`המבט השבועי · שבוע ${weekNo(week)}`, week === CUR_WEEK ? 'כמה שיחות אישיות היו לך השבוע?' : `כמה שיחות אישיות היו לך בשבוע ${weekNo(week)}?`, 'שיחה אישית היא רגע אחד על אחד עם תלמיד/ה, גם קצר.',
        existing ? h('p', { class: 'tag', style: 'align-self:flex-start' }, week === CUR_WEEK ? 'המבט לשבוע הזה כבר נשלח. אפשר לעדכן אותו.' : `המבט לשבוע ${weekNo(week)} כבר נשלח. אפשר לעדכן אותו.`) : null,
        h('div', { class: 'counter' }, minus, out, plus), tokens, msg, next);
    }
    if (s === 'zero') {
      return q('שבוע בלי שיחות', 'מה היה השבוע?', 'זה קורה. זה עוזר לנו להבין את הקצב של השנה. לא חובה לבחור.',
        h('div', { class: 'chips' }, NONE_REASONS.map((r) => h('button', { class: 'zpick' + (draft.noneReason === r.v ? ' on' : ''), type: 'button', 'aria-pressed': String(draft.noneReason === r.v), onclick: () => { draft.noneReason = draft.noneReason === r.v ? '' : r.v; touch(); paint(); } }, r.t))),
        nextButton(F.sending ? 'שולחים…' : 'שליחת המבט', submit), F.err ? h('p', { class: 'err', role: 'alert' }, F.err) : null);
    }
    const c = cur();
    if (s === 'axis') {
      const [inp, warn] = otherInput(c.axisOther, 'על מה עוד דיברתם? כמה מילים', (v) => { c.axisOther = v; touch(); });
      return q(convKick(), 'על מה דיברתם?', 'אפשר לבחור יותר מאחד',
        h('div', { class: 'qtiles' }, AXES.map((a) => tile(c.axes.includes(a.v), h('span', { class: 'tic', style: `background:${AXIS_LOOK[a.v].c}` }, ic(AXIS_LOOK[a.v].i, { size: 30, tone: 'white' })), a.v === 'other' ? 'משהו אחר' : a.t, () => {
          c.axes = c.axes.includes(a.v) ? c.axes.filter((x) => x !== a.v) : [...c.axes, a.v]; touch(); paint(); if (a.v === 'other' && c.axes.includes('other')) root.querySelector('.othin')?.focus();
        }))),
        c.axes.includes('other') ? [inp, warn] : null, nextButton('המשך', () => go2('kind')));
    }
    if (s === 'kind') {
      const [inp, warn] = otherInput(c.kindOther, 'איזו שיחה? כמה מילים', (v) => { c.kindOther = v; touch(); });
      return q(convKick(), 'איזו שיחה זו הייתה?', 'אפשר לבחור יותר מאחת',
        h('div', { class: 'qtiles' }, KINDS.map((k) => {
          const b = tile(c.kinds.includes(k.v), svgSpan(KIND_ART[k.v], 'ill'), k.t, () => {
            const on = !c.kinds.includes(k.v); c.kinds = on ? [...c.kinds, k.v] : c.kinds.filter((x) => x !== k.v); touch(); if (on) burstFrom(b, 18); paint();
            if (k.v === 'other' && on) root.querySelector('.othin')?.focus();
          });
          return b;
        })),
        c.kinds.includes('other') ? [inp, warn] : null, nextButton('המשך', () => go2('depth')));
    }
    if (s === 'depth') {
      return q(convKick(), 'כמה עמוק צללתם?', 'עמוק זה לא בהכרח טוב יותר. גם שיחה עניינית חשובה.',
        diveSlider({ value: c.depth, onChange: (v) => { c.depth = v; touch(); upd(); } }), nextButton('המשך', () => go2('talk')));
    }
    if (s === 'talk') {
      return q(convKick(), TALK_SCALE.q, 'לגרור את הקו לפי התחושה. לא צריך לדייק.',
        talkSlider({ value: c.talkPct, onChange: (v) => { c.talkPct = v; touch(); upd(); } }), nextButton('המשך', () => go2('feel')));
    }
    if (s === 'feel') {
      const warn = h('p', { class: 'warn-note', hidden: true });
      const note = h('textarea', { class: 'textarea', rows: '2', placeholder: 'מילה אחת לזכור (בלי שמות)', maxlength: '1000', 'aria-label': 'מילה אחת לזכור, לא חובה', oninput: (ev) => { c.note = ev.target.value; touch(); const w = nameWarn([c.note]); warn.hidden = !w; warn.textContent = w; } });
      note.value = c.note;
      const last = F.ci >= draft.convs.length - 1;
      const who = pub.leadSeesNames ? 'רק לך, למובילה בבית הספר ולצוות התכנית יש גישה לזה' : 'רק לך ולצוות התכנית יש גישה לזה';
      return q(convKick(), 'איך יצאת מהשיחה?', null,
        h('div', { class: 'faces', role: 'radiogroup', 'aria-label': 'איך יצאת מהשיחה' }, FEELINGS.map((f) => h('button', { class: 'face' + (c.feeling === f.v ? ' on' : ''), type: 'button', role: 'radio', 'aria-checked': String(c.feeling === f.v), onclick: () => { c.feeling = f.v; touch(); paint(); } },
          svgSpan(faceSvg(FACE_LOOK[f.v]), 'fsvg'), h('span', null, f.t)))),
        note, warn, h('p', { class: 'lockline' }, ic('lock', { size: 16 }), who),
        nextButton(last ? (F.sending ? 'שולחים…' : 'שליחת המבט') : 'שמירת השיחה', () => { if (last) submit(); else { F.ci++; go2('saved'); confetti(25, 0.5); } }),
        F.err ? h('p', { class: 'err', role: 'alert' }, F.err) : null);
    }
    if (s === 'saved') {
      const left = draft.convs.length - F.ci;
      return h('div', { class: 'qwrap saved' }, h('div', { class: 'badge' }, ic('check', { size: 54, tone: 'white' })), h('h2', { class: 'qt' }, `שיחה ${F.ci} נשמרה`), h('p', { class: 'qs' }, left === 1 ? 'נשארה עוד שיחה אחת' : `נשארו עוד ${left}`),
        h('button', { class: 'cta violet', type: 'button', onclick: () => { const src = draft.convs[F.ci - 1]; for (let k = F.ci; k < draft.convs.length; k++) draft.convs[k] = { ...JSON.parse(JSON.stringify(src)), note: '' }; touch(); submit(); } }, 'השיחות הבאות דומות לקודמת · שמירה ושליחה'),
        h('button', { class: 'cta', type: 'button', onclick: () => go2('axis') }, `לשאלות על שיחה ${F.ci + 1}`),
        F.err ? h('p', { class: 'err', role: 'alert' }, F.err) : null);
    }
    if (s === 'done') return doneScreen();
    return null;
  }
  function doneScreen() {
    if (practice) return h('div', { class: 'qwrap saved' }, h('div', { class: 'badge v' }, ic('check', { size: 54, tone: 'white' })), h('h2', { class: 'qt' }, 'ככה זה עובד'),
      h('p', { class: 'qs' }, 'פעם בשבוע, בערך שתי דקות. התרגול לא נשמר.'), h('button', { class: 'cta', type: 'button', onclick: () => { WEL.step = 2; go('/welcome'); } }, 'המשך'));
    const r = myReport(week), list = r ? r.convs : [], deep = list.filter((c) => c.depth >= 4).length, talk = avgTalk(list), streak = streakWeeks();
    const sug = talk !== null && talk < 50 ? HOME_TOOLS[1] : HOME_TOOLS[3];
    const sugText = talk !== null && talk < 50 ? 'השבוע דיברת לא מעט. הכלי הזה עוזר להקשיב יותר.' : sug.d;
    return h('div', { class: 'qwrap saved' }, h('div', { class: 'badge v' }, ic('check', { size: 54, tone: 'white' })),
      h('h2', { class: 'qt' }, 'המבט נשלח'), streak > 1 ? h('p', { class: 'qs' }, `${streak} שבועות ברצף`) : null,
      list.length ? h('div', { class: 'sumrow' }, h('div', null, h('b', { class: 'num' }, String(list.length)), h('span', null, 'שיחות')), h('div', null, h('b', { class: 'num' }, String(deep)), h('span', null, 'בעומק אישי')),
        h('div', null, h('b', { class: 'num' }, talk === null ? '–' : `${talk}%`), h('span', null, 'התלמידים דיברו'))) : null,
      togetherBox(h('div', { style: 'width:100%' })),
      list.length ? h('a', { class: 'nextcard', href: '#' + sug.to, onclick: (ev) => { ev.preventDefault(); go(sug.to); } }, h('span', { class: 'small' }, 'רעיון לשבוע הבא'), h('b', null, sug.t), h('span', null, sugText)) : null,
      link('/', 'חזרה לבית', 'cta'));
  }
  function submit() {
    if (F.sending) return;
    const doSubmit = async () => {
      if (practice) { F.step = 'done'; paint(); window.scrollTo(0, 0); celebrate(Math.max(2, Math.min(draft.convs.length + 1, 5))); return; }
      F.sending = true; F.err = ''; upd();
      try {
        const res = await api('PUT', `/api/me/reports/${week}`, { convs: draft.convs.map(({ legacy, ...c }) => c), noneReason: draft.convs.length ? '' : draft.noneReason });
        const i = myReports.findIndex((r) => r.week === week);
        if (i >= 0) myReports[i] = res.report; else myReports.push(res.report);
        lsDel(dkey); clearTimeout(t); t = null;
        F.sending = false; F.step = 'done'; paint(); window.scrollTo(0, 0);
        celebrate(Math.max(2, Math.min(res.report.convs.length + 1, 5)));
      } catch (ex) { F.sending = false; F.err = ex.message; paint(); }
    };
    const named = draft.convs.some((c) => findNames([c.note, c.axisOther, c.kindOther].join(' ')).length);
    if (named) {
      openSheet((closeSheet) => h('div', { class: 'stack' }, h('h3', null, 'נראה שמופיעים שמות'), h('p', null, 'הכלל במבט השבועי: בלי שמות תלמידים. אפשר לחזור ולתקן, או לשלוח בכל זאת.'),
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => closeSheet() }, 'לחזור ולתקן'), h('button', { class: 'btn soft', type: 'button', onclick: () => { closeSheet(); doSubmit(); } }, 'לשלוח בכל זאת'))));
    } else doSubmit();
  }
  function paint() { clear(root); add(root, [head(), practice && PRACTICE_TIPS[F.step] ? h('div', { class: 'ptip' }, ic('idea', { size: 18, tone: 'white' }), PRACTICE_TIPS[F.step]) : null, body()]); }
  paint();
  return root;
}

/* ---------- הכיתה שלי: מיפוי במכשיר ----------
   שם פרטי בלבד, ו"נועה כ." רק כשיש שתי נועה. כל שיחה מקדמת סבב: עוד לא, ראשון, שני, שלישי. "דחוף" הוא סימון נפרד.
   השמות נשמרים רק במכשיר. לשרת עולים רק ארבעה מספרים: כמה תלמידים בכל סבב. */
const ROUND_LOOK = [
  { t: 'עוד לא דיברנו', c: '#55585f', fg: '#fff' }, { t: 'סבב ראשון', c: BRAND.turq, fg: BRAND.ink },
  { t: 'סבב שני', c: BRAND.blue, fg: '#fff' }, { t: 'סבב שלישי', c: BRAND.purple, fg: '#fff' }];
// מיפוי ישן סימן סבבים בשלושה עיגולים. מספר העיגולים המסומנים הוא מספר השיחות.
const talksOf = (s) => (Number.isInteger(s.talks) ? s.talks : (s.rounds || []).filter(Boolean).length);
const roundOf = (s) => Math.min(talksOf(s), 3);
function setTalks(s, n) { n = Math.max(0, n); s.talks = n; s.rounds = [n >= 1, n >= 2, n >= 3]; }
const firstOf = (s) => (s.name || '').trim().split(/\s+/)[0] || '?';
const lastOf = (s) => (s.name || '').trim().split(/\s+/).slice(1).join(' ');
const twinsOf = (s) => map.students.filter((o) => firstOf(o) === firstOf(s)).length > 1;
const kidLabel = (s) => (twinsOf(s) && lastOf(s) ? `${firstOf(s)} ${lastOf(s)[0]}.` : firstOf(s));
const twinNoLast = (s) => !lastOf(s) && twinsOf(s);
const roundCounts = () => { const r = [0, 0, 0, 0]; map.students.forEach((s) => { r[roundOf(s)]++; }); return r; };
let roundsTimer = null;
function syncRounds() {
  clearTimeout(roundsTimer);
  roundsTimer = setTimeout(() => { if (!me()) return; const r = roundCounts(); api('PUT', '/api/me/class-rounds', { r0: r[0], r1: r[1], r2: r[2], r3: r[3] }).catch(() => {}); }, 1200);
}
const saveClass = () => { saveMap(); syncRounds(); };
let classEdit = false, classFilter = null, classPick = [];
function bottomSheet(build) {
  const close = () => ov.remove();
  const sh = h('div', { class: 'bsheet', role: 'dialog', 'aria-modal': 'true' });
  const ov = h('div', { class: 'boverlay', onclick: (e) => { if (e.target === ov) close(); } }, sh);
  add(sh, [h('span', { class: 'grab', 'aria-hidden': 'true' }), build(close)]);
  // במסך מלא של הדפדפן רק האלמנט שבמסך מלא נראה, ולכן החלונית נכנסת לתוכו
  (document.fullscreenElement || document.body).append(ov);
  return close;
}
const lockLine = (t) => h('p', { class: 'lockline' }, ic('lock', { size: 16 }), t);
const PRIVACY_CLASS = 'השמות נשמרים רק במכשיר שלך. לשרת עולה רק כמה תלמידים בכל סבב, בלי שמות.';

function eduClass() { ensureMap(); return !map.students.length || classEdit ? classSetup() : classMap(); }

function classSetup() {
  const n = map.students.length, bad = map.students.some(twinNoLast);
  const host = h('div', { class: 'stack' });
  const nm = h('input', { class: 'input', placeholder: 'שם פרטי, למשל: נועה', 'aria-label': 'שם תלמיד/ה', autocomplete: 'off', maxlength: '40' });
  const addOne = () => {
    const names = parseNames(nm.value);
    if (!names.length) { nm.focus(); return; }
    const r = applyNames(names, false); syncRounds();
    if (!r.added) toast(`השם ${names[0]} כבר ברשימה. אם יש עוד תלמיד/ה עם אותו שם, אפשר להוסיף שם משפחה.`);
    classEdit = true; render(); setTimeout(() => document.querySelector('.eclass .addrow .input')?.focus(), 0);
  };
  nm.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addOne(); } });
  const paste = () => bottomSheet((close) => {
    const ta = h('textarea', { class: 'textarea', rows: '7', placeholder: 'שם בכל שורה. אפשר להדביק עמודה מאקסל או מרשימת הכיתה.', 'aria-label': 'רשימת שמות' });
    setTimeout(() => ta.focus(), 0);
    return h('div', { class: 'stack' }, h('h3', null, 'הדבקה של כל הרשימה'), ta,
      h('button', { class: 'cta', type: 'button', onclick: () => { const r = applyNames(parseNames(ta.value), false); syncRounds(); close(); classEdit = true; render(); toast(r.added ? `נוספו ${r.added} שמות` : 'לא נוספו שמות חדשים'); } }, 'הוספת כל הרשימה'));
  });
  const chip = (s) => h('span', { class: 'nchip' + (twinNoLast(s) ? ' warn' : '') }, kidLabel(s),
    h('button', { type: 'button', 'aria-label': `הסרת ${kidLabel(s)}`, onclick: () => {
      const doIt = () => { map.students = map.students.filter((x) => x !== s); saveClass(); render(); };
      if (talksOf(s) || s.urgent) confirmInline(host, `להסיר את ${kidLabel(s)}? הסבבים שסומנו לו או לה יימחקו.`, 'הסרה', doIt); else doIt();
    } }, '×'));
  add(host, [
    h('div', { class: 'mhead' }, h('h2', null, n ? 'שמות התלמידים' : 'נכיר את הכיתה שלך'), h('p', { class: 'muted' }, n ? 'אפשר להוסיף ולמחוק, ואז לחזור לכיתה.' : 'פעם אחת, בערך שתי דקות.')),
    n ? null : h('ol', { class: 'how3' }, h('li', null, h('b', null, '1'), 'הוספת שמות התלמידים'), h('li', null, h('b', null, '2'), 'אחרי כל שיחה, לחיצה על השם'), h('li', null, h('b', null, '3'), 'במבט אחד: עם מי עוד לא דיברת')),
    h('div', { class: 'addrow' }, nm, h('button', { class: 'cta', type: 'button', onclick: addOne }, 'הוספה')),
    h('p', { class: 'small muted' }, 'יש שתי נועה בכיתה? אפשר להוסיף שם משפחה, ויוצג "נועה כ.".'),
    h('button', { class: 'linkbtn', type: 'button', onclick: paste }, 'יש לך רשימה מוכנה? הדבקה של כל השמות בבת אחת'),
    n ? h('div', { class: 'nchips' }, map.students.map(chip)) : null,
    bad ? h('p', { class: 'warn-note' }, 'יש שני תלמידים עם אותו שם. כדאי להסיר את השם המסומן ולהוסיף אותו עם שם משפחה.') : null,
    h('button', { class: 'cta', type: 'button', disabled: !n, onclick: () => { classEdit = false; render(); } }, n ? `סיימתי · ${n} תלמידים` : 'צריך לפחות שם אחד'),
    lockLine(PRIVACY_CLASS)]);
  return h('div', { class: 'eclass' }, host);
}

function classMap() {
  const cnt = roundCounts(), all = map.students;
  const tapped = !!lsGet('zmw.classTapped');
  const pill = (s) => {
    const r = roundOf(s), L = ROUND_LOOK[r];
    const dim = classFilter !== null && (classFilter === 'u' ? !s.urgent : classFilter !== r);
    return h('button', { class: 'kid' + (dim ? ' dim' : '') + (classPick.includes(s.id) ? ' wk' : '') + (!tapped && s === all[0] ? ' pulse' : ''), type: 'button', style: `background:${L.c};color:${L.fg}`,
      'aria-label': `${kidLabel(s)}: ${L.t}${s.urgent ? ', דחוף' : ''}`, onclick: () => kidSheet(s) },
      s.urgent ? h('span', { class: 'flag' }, ic('alert', { size: 14 })) : null, kidLabel(s));
  };
  const urgent = all.filter((s) => s.urgent);
  const waiting = cnt[0];
  const pick3 = () => {
    const pool = all.filter((s) => s.urgent || roundOf(s) === 0).sort((a, b) => (b.urgent - a.urgent) || (roundOf(a) - roundOf(b)) || (Math.random() - 0.5));
    classPick = pool.slice(0, 3).map((s) => s.id); classFilter = null; render();
  };
  return h('div', { class: 'eclass' },
    h('div', { class: 'mhead' }, h('h2', null, 'הכיתה שלי'), h('p', { class: 'muted' }, 'לחיצה על שם: להוסיף שיחה, או לסמן "דחוף".')),
    h('div', { class: 'rstack', 'aria-hidden': 'true' }, cnt.map((n, k) => h('i', { style: `flex:${n};background:${ROUND_LOOK[k].c}` }))),
    h('div', { class: 'legend' }, ROUND_LOOK.map((L, k) => h('button', { class: 'lg' + (classFilter === k ? ' on' : ''), type: 'button', 'aria-pressed': String(classFilter === k), onclick: () => { classFilter = classFilter === k ? null : k; render(); } },
      h('i', { style: `background:${L.c}` }), L.t, h('b', { class: 'num' }, String(cnt[k]))))),
    urgent.length ? h('section', { class: 'urg' }, h('h4', null, ic('alert', { size: 18, tone: 'purple' }), 'דחוף לשיחה', h('span', null, String(urgent.length))), h('div', { class: 'names' }, urgent.map(pill))) : null,
    waiting || urgent.length ? h('div', { class: 'sugg' }, h('p', null, classPick.length ? [h('b', null, 'שלושה להשבוע'), ' מסומנים במסגרת סגולה'] : [h('b', null, `${waiting} תלמידים`), ' עוד מחכים לשיחה ראשונה']),
      h('button', { type: 'button', onclick: pick3 }, classPick.length ? 'לבחור אחרים' : 'לבחור 3 להשבוע')) : null,
    tapped ? null : h('div', { class: 'coach' }, 'לחיצה על שם אחרי שיחה, או כדי לסמן דחוף'),
    h('div', { class: 'names' }, all.map(pill)),
    h('div', { class: 'tipbox' }, lockLine(PRIVACY_CLASS),
      h('button', { class: 'linkbtn', type: 'button', onclick: () => { classEdit = true; render(); } }, 'הוספה או עריכה של שמות'),
      h('button', { class: 'linkbtn', type: 'button', onclick: classData }, 'העברה למכשיר אחר או מחיקה')));
}

function kidSheet(s) {
  lsSet('zmw.classTapped', '1');
  bottomSheet((close) => {
    const n = talksOf(s), L = ROUND_LOOK[roundOf(s)];
    return h('div', { class: 'stack' },
      h('div', { class: 'ksh' }, h('span', { class: 'kid', style: `background:${L.c};color:${L.fg}` }, kidLabel(s)), h('span', null, n ? `${L.t} · ${n === 1 ? 'שיחה אחת' : `${n} שיחות`}` : 'עוד לא דיברתם')),
      h('button', { class: 'cta', type: 'button', onclick: (e) => {
        const first = !talksOf(s); setTalks(s, talksOf(s) + 1); s.last = ymd(new Date());
        classPick = classPick.filter((id) => id !== s.id); saveClass(); close(); render();
        if (first) confetti(30, 0.6); toast(`${kidLabel(s)} · ${ROUND_LOOK[roundOf(s)].t}`);
      } }, '+ הייתה שיחה'),
      h('button', { class: 'cta ' + (s.urgent ? 'violet' : 'ghostc'), type: 'button', onclick: () => { s.urgent = !s.urgent; saveClass(); close(); render(); } }, s.urgent ? 'מסומן כדחוף · לביטול' : 'דחוף לשיחה'),
      n ? h('button', { class: 'linkbtn', type: 'button', style: 'align-self:center', onclick: () => { setTalks(s, n - 1); saveClass(); close(); render(); } }, 'טעות? הורדת שיחה אחת') : null);
  });
}

// העברה בין מכשירים: מעתיקים טקסט ומדביקים אותו במכשיר השני. שום דבר לא עובר בשרת.
function classData() {
  bottomSheet((close) => {
    const host = h('div', { class: 'stack' });
    const ta = h('textarea', { class: 'textarea', rows: '4', placeholder: 'במכשיר השני: להדביק כאן את הנתונים שהועתקו', 'aria-label': 'נתונים להדבקה' });
    add(host, [h('h3', null, 'העברה למכשיר אחר'),
      h('p', { class: 'small muted' }, 'מעתיקים את הנתונים כאן, ומדביקים אותם במכשיר השני. שום דבר לא עובר בשרת.'),
      h('button', { class: 'cta', type: 'button', onclick: () => copyText(JSON.stringify(map), 'הנתונים הועתקו') }, 'העתקת הנתונים'),
      ta, h('button', { class: 'cta ghostc', type: 'button', onclick: () => {
        try { const m = JSON.parse(ta.value); if (!m || !Array.isArray(m.students)) throw new Error('x'); map = m; saveClass(); close(); render(); toast('הנתונים נטענו'); } catch { toast('הטקסט לא נראה כמו נתוני כיתה'); }
      } }, 'טעינת הנתונים שהודבקו'),
      h('button', { class: 'linkbtn', type: 'button', style: 'align-self:center;color:var(--violet)', onclick: () => confirmInline(host, 'למחוק את כל השמות והסבבים מהמכשיר הזה? אי אפשר לשחזר.', 'מחיקה', () => { map = emptyMap(); saveClass(); close(); classEdit = false; render(); toast('הנתונים נמחקו מהמכשיר'); }) }, 'מחיקת כל הנתונים מהמכשיר')]);
    return host;
  });
}

/* ---------- ארגז הכלים: שלושת צירי ההכשרה, באותו צבע וסמל כמו במבט השבועי ----------
   פתוח לכולם, גם בלי כניסה. שום דבר בכלים לא נשמר ולא נשלח: הבחירות נשארות על המסך. */
const AXIS_WORLD = {
  identity: { c: BRAND.deep, a: BRAND.turq, i: 'id', line: 'לעזור לתלמיד/ה לראות את הכוחות שלו/ה', tools: ['/tools/identity/listen', '/tools/identity/cards'] },
  goals: { c: BRAND.blue, a: BRAND.sky, i: 'target', line: 'מה חשוב לתלמיד/ה להשיג, ואיך מגיעים לשם', tools: ['/tools/goals/journal'] },
  agency: { c: BRAND.purple, a: BRAND.turq, i: 'empower', line: 'לתלמיד/ה יש קול והשפעה בכיתה ובבית הספר', tools: ['/tools/agency/partnership'] },
};
const TOOL_INFO = {
  '/tools/identity/listen': { t: 'להקשיב לכוחות', d: 'ארבע שאלות לראש, שיקוף, ושיחה לדוגמה', i: 'eye', ax: 'identity' },
  '/tools/identity/cards': { t: 'יש בי יותר ממה שרואים', d: 'קלפי סיפור להדפסה, לשיחה האישית', i: 'care', ax: 'identity' },
  '/tools/goals/journal': { t: 'המסע שלי', d: 'שאלות לשיחה על מטרות, ודפים להדפסה', i: 'target', ax: 'goals' },
  '/tools/agency/partnership': { t: 'שותפות תלמידים', d: 'שאלות לשיחה האישית, סולם ותפקידים לכיתה', i: 'team', ax: 'agency' },
};
const HOW_TO = {
  '/tools/identity/listen': ['לפני השיחה: דקה אחת עם ארבע השאלות.', 'בשיחה: להקשיב לסיפור, ולשים לב לאחת מהן.', 'לשקף במילים פשוטות מה התלמיד/ה עשה/תה, ולשאול אם זה מתאים.', 'אם התלמיד/ה לא מסכים/ה עם השם לכוח, אפשר לוותר עליו. לפעמים רק להקשיב זה הכי נכון.'],
  '/tools/identity/cards': ['בחירת קלף שאלה. אפשר להחליף או לדלג.', 'התלמיד/ה מספר/ת. התפקיד שלך: שאלות המשך.', 'אפשר להציע 2–3 קלפי חוזקה, כהצעה ולא כקביעה.', 'התלמיד/ה בוחר/ת, מדייק/ת, דוחה או כותב/ת חוזקה משלו/ה.'],
  '/tools/goals/journal': ['השיחה מתחילה מהתלמיד/ה. התפקיד שלך לשאול ולהקשיב, והתלמיד/ה מנסח/ת וכותב/ת.', 'מספיקות עשר דקות ושאלה אחת טובה. לא צריך להכין תכנית שלמה.', 'מטרה אחת קטנה וברורה עדיפה על שלוש כלליות.'],
  '/tools/agency/partnership': [],
};
const axisCards = (id) => ((window.ZMAN_CARDS || {}).cards || []).filter((c) => (c.a || []).includes(id)).length;
const goA = (to, cls, ...kids) => h('a', { class: cls, href: '#' + to, onclick: (e) => { e.preventDefault(); go(to); } }, ...kids);
const chev = () => svgSpan('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>', 'chev');
const backBtn = (to, label) => goA(to, 'fbtn', svgSpan('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>'), h('span', { class: 'sr' }, label));
const segTabs = (tabs, cur, set) => h('div', { class: 'segt', role: 'tablist' }, tabs.map(([v, t]) => h('button', { class: cur === v ? 'on' : '', type: 'button', role: 'tab', 'aria-selected': String(cur === v), onclick: () => set(v) }, t)));
function howSheet(to) {
  bottomSheet((close) => h('div', { class: 'stack' }, h('h3', null, `איך משתמשים · ${TOOL_INFO[to].t}`),
    h('ol', { class: 'how3' }, HOW_TO[to].map((x, i) => h('li', null, h('b', null, String(i + 1)), x))), h('button', { class: 'cta', type: 'button', onclick: close }, 'הבנתי')));
}
function toolTop(to) {
  const info = TOOL_INFO[to];
  return h('div', { class: 'ttop' }, backBtn('/tools/' + info.ax, FOLDERS.find((f) => f.id === info.ax).t), h('h2', null, info.t),
    HOW_TO[to].length ? h('button', { class: 'howbtn', type: 'button', onclick: () => howSheet(to) }, 'איך משתמשים') : null);
}

function toolsHome() {
  return h('div', { class: 'etools' },
    h('div', { class: 'mhead' }, h('h2', null, 'ארגז הכלים'), h('p', { class: 'muted' }, 'שלושת צירי השיחה האישית, כמו בהכשרה')),
    h('div', { class: 'axes' }, FOLDERS.map((f) => {
      const w = AXIS_WORLD[f.id];
      return goA('/tools/' + f.id, 'axcard', h('span', { class: 'axic', style: `background:${w.a}` }, ic(w.i, { size: 30, tone: 'white' })),
        h('span', { class: 'axt' }, h('b', null, f.t), h('span', null, w.line),
          h('span', { class: 'axtools' }, w.tools.map((to) => h('i', null, TOOL_INFO[to].t)), h('i', null, 'קלפי שיח'))));
    }).map((a, i) => { a.style.background = AXIS_WORLD[FOLDERS[i].id].c; return a; })),
    goA('/tools/cards', 'cardsban', ic('idea', { size: 30 }), h('span', null, h('b', null, 'קלפי שיח · לכל הצירים'), h('span', null, `${((window.ZMAN_CARDS || {}).cards || []).length} קלפים: לפי נושא, דרך תמונה, לפי עומק, או קלף מעורבב`))));
}
function axisPage(id) {
  const f = FOLDERS.find((x) => x.id === id), w = AXIS_WORLD[id];
  const extra = pub.tools.filter((t) => t.folder === id && !t.example);
  const row = (to, icon, title, sub, bg, fg) => goA(to, 'trow', h('span', { class: 'tric', style: `background:${bg}` }, ic(icon, { size: 28, tone: fg || 'white' })), h('span', { class: 'trt' }, h('b', null, title), h('span', null, sub)), chev());
  return h('div', { class: 'etools' },
    h('div', { class: 'axhead', style: `background:${w.c}` }, backBtn('/tools', 'ארגז הכלים'), h('span', { class: 'axic', style: `background:${w.a}` }, ic(w.i, { size: 32, tone: 'white' })), h('h2', null, f.t), h('p', null, w.line)),
    h('div', { class: 'tlist' }, w.tools.map((to) => row(to, TOOL_INFO[to].i, TOOL_INFO[to].t, TOOL_INFO[to].d, w.c)),
      row('/tools/cards/type/' + id, 'idea', 'קלפי שיח לציר הזה', `${axisCards(id)} קלפים, במסך מלא`, w.a),
      extra.map((t) => h('a', { class: 'trow', href: t.url || '#', target: t.url ? '_blank' : null, rel: 'noopener' }, h('span', { class: 'tric', style: `background:${w.c}` }, ic('book', { size: 28, tone: 'white' })), h('span', { class: 'trt' }, h('b', null, t.title), h('span', null, t.desc)), chev()))),
    isAdmin() ? h('div', null, link('/admin/tools', 'הוספה ועריכה של כלים', 'btn soft sm')) : null);
}

/* ---------- להקשיב לכוחות: לפני השיחה, לשקף כוח, שיחה לדוגמה ---------- */
const LT = { tab: 'before', flip: new Set(), ex: null, n: 0, word: '', ask: false, mine: null };
function listenTool() {
  const D = window.ZMAN_LISTEN, root = h('div', { class: 'etools' });
  if (!LT.ex) LT.ex = D.examples[0].id;
  const lookOf = ['compass', 'care', 'team', 'idea'], colOf = [BRAND.blue, BRAND.purple, BRAND.deep, BRAND.sky];
  const reflInner = (r, i, f) => [h('span', { class: 'rn' }, String(i + 1)), h('b', null, r.title), h('span', { class: 'rm' }, r.micro),
    f ? [h('span', { class: 'rlb ok' }, 'אפשר לומר'), h('span', { class: 'rq' }, r.tryThis), h('span', { class: 'rins' }, r.instruction)]
      : [h('span', { class: 'rlb' }, 'נוטים לומר'), h('span', { class: 'rq no' }, r.insteadOf), h('span', { class: 'rtap' }, 'להפוך')]];
  const chat = (e) => {
    const shown = e.lines.slice(0, LT.n), end = LT.n >= e.lines.length;
    return [h('div', { class: 'chat', 'aria-live': 'polite' }, shown.map((l) => h('div', { class: 'bub2 ' + (l.who === 'student' ? 's' : 't') }, h('span', null, l.who === 'student' ? 'תלמיד/ה' : 'מחנך/ת'), l.text)),
      end ? h('div', { class: 'hints' }, h('span', null, e.hintLabel || 'כוחות אפשריים'), e.hints.map((x) => h('i', null, x))) : null, end && e.note ? h('p', { class: 'exnote' }, e.note) : null),
    end ? null : h('button', { class: 'cta', type: 'button', onclick: () => { LT.n++; paint(); root.querySelector('.chat')?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }, LT.n ? 'המשך השיחה' : 'להתחיל את השיחה')];
  };
  const mine = () => {
    if (LT.mine) return [h('p', { class: 'small muted' }, `המילה: ${LT.word} · `, h('button', { class: 'linkbtn', type: 'button', onclick: () => { LT.mine = null; LT.word = ''; LT.n = 0; paint(); } }, 'מילה אחרת')), ...chat(LT.mine),
      h('p', { class: 'small muted' }, 'הדוגמה נבנית אוטומטית סביב המילה, ואינה שיחה אמיתית.')];
    if (LT.ask) return [h('h3', null, 'איך התלמיד/ה מדבר/ת על זה?'), h('p', { class: 'small muted' }, 'אותה מילה יכולה להיות סיפור הצלחה או סיפור כאב.'),
      ...[['good', 'בהתלהבות או בגאווה'], ['hard', 'בקושי: מתקשה, נכשל/ה, או רוצה להתרחק'], ['unsure', 'עוד לא ברור']].map(([m, t]) => h('button', { class: 'cta ghostc', type: 'button', onclick: () => { LT.mine = D.exampleForTopic(LT.word, m); LT.ask = false; LT.n = 0; paint(); } }, t))];
    const inp = h('input', { class: 'input', maxlength: '30', placeholder: 'מילה אחת, למשל: גיימינג', 'aria-label': 'מילה על הנושא', value: LT.word });
    const goWord = (w) => { w = String(w).replace(/["״׳']/g, '').trim(); if (w.length < 2) return; LT.word = w; LT.ask = true; paint(); };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') goWord(inp.value); });
    return [h('h3', null, 'על מה התלמיד/ה מספר/ת?'), h('div', { class: 'addrow' }, inp, h('button', { class: 'cta', type: 'button', onclick: () => goWord(inp.value) }, 'להמשך')),
      h('div', { class: 'chips' }, D.topicSuggestions.map((s) => h('button', { class: 'zpick', type: 'button', onclick: () => goWord(s) }, s))),
      h('p', { class: 'small muted' }, 'בלי שמות של תלמידים. הטקסט נשאר על המסך ולא נשמר.')];
  };
  function body() {
    if (LT.tab === 'reflect') return [h('p', { class: 'tagline' }, 'לשקף כוח בארבעה צעדים'), h('p', { class: 'qs' }, 'על כל קלף: מה נוטים לומר. בצד השני: מה אפשר לומר במקום.'),
      h('div', { class: 'rgrid' }, D.reflect.map((r, i) => h('button', { class: 'rcard' + (LT.flip.has(i) ? ' f' : ''), type: 'button', 'aria-pressed': String(LT.flip.has(i)), onclick: (e) => {
        const el = e.currentTarget, on = !LT.flip.has(i); on ? LT.flip.add(i) : LT.flip.delete(i);
        el.classList.toggle('f', on); el.setAttribute('aria-pressed', String(on)); clear(el); add(el, reflInner(r, i, on)); el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim');
      } }, reflInner(r, i, LT.flip.has(i)))))];
    if (LT.tab === 'example') {
      const cur = D.examples.find((x) => x.id === LT.ex);
      return [h('div', { class: 'chips' }, [...D.examples.map((x) => [x.id, x.category]), ['mine', '+ המקרה שלי']].map(([v, t]) => h('button', { class: 'zpick' + (LT.ex === v ? ' on' : ''), type: 'button', onclick: () => { LT.ex = v; LT.n = 0; paint(); } }, t))),
        ...(LT.ex === 'mine' ? mine() : chat(cur)), h('p', { class: 'small muted' }, 'חוזקות מוצגות כהשערות ולא כאבחנות: התלמיד/ה יכול/ה לדייק או לדחות.')];
    }
    return [h('p', { class: 'tagline' }, 'ארבע שאלות לראש'), h('p', { class: 'qs' }, 'דקה לפני השיחה. בשיחה עצמה: להקשיב, ולשים לב לאחת מהן.'),
      h('div', { class: 'pocket' }, D.lenses.map((l, i) => h('div', { class: 'pk', style: `--lc:${colOf[i]}` }, h('span', { class: 'lic', style: `background:${colOf[i]}` }, ic(lookOf[i], { size: 20, tone: 'white' })), h('b', null, l.title), h('span', null, `"${l.examples[0]}"`)))),
      h('details', { class: 'more' }, h('summary', null, 'עוד דגשים להקשבה'), h('ul', { class: 'plain' }, D.principles.map((p) => h('li', null, p))))];
  }
  function paint() {
    clear(root);
    add(root, [toolTop('/tools/identity/listen'), segTabs([['before', 'לפני השיחה'], ['reflect', 'לשקף כוח'], ['example', 'שיחה לדוגמה']], LT.tab, (v) => { LT.tab = v; paint(); }), h('div', { class: 'tbody' }, body())]);
  }
  paint();
  return root;
}

/* ---------- יש בי יותר ממה שרואים: קובץ להדפסה בלבד, לשיחה האישית ---------- */
function identityCards() {
  const pdf = 'assets/pdf/kalfei-sicha.pdf';
  return h('div', { class: 'etools' }, toolTop('/tools/identity/cards'),
    h('div', { class: 'tbody' }, h('p', { class: 'tagline' }, 'קלפי סיפור להדפסה'), h('p', { class: 'qs' }, 'לשיחה האישית: להדפיס, לגזור ולפרוש על השולחן.'),
      h('div', { class: 'preview' }, h('div', { class: 'pvwrap' }, h('img', { src: 'assets/preview/cards-guide-1.jpg', alt: 'עמוד ההסבר של קלפי יש בי יותר ממה שרואים', loading: 'lazy' }),
        h('img', { class: 'lg1', src: 'assets/logo/ort-logo.png', alt: '' }), h('img', { class: 'lg2', src: 'assets/logo/zman-logo.svg', alt: '' }))),
      h('div', { class: 'facts' }, h('span', null, '7 עמודי A4'), h('span', null, 'קלפים לגזירה'), h('span', null, 'לשיחה אחד על אחד')),
      h('a', { class: 'cta', href: pdf, download: 'kalfei-sicha-hotam.pdf' }, 'הורדה והדפסה של הקלפים')));
}

/* ---------- המסע שלי: למחנכת, ומדף של דפים להדפסה ---------- */
const JR = { tab: 'teach', q: 0, sel: new Set(), half: 0 };
function pageArt(id, c) {
  const l = (y, w = 70) => `<rect x="15" y="${y}" width="${w}" height="4" rx="2" fill="#dcdcdc"/>`;
  const A = {
    swot: `<rect x="12" y="30" width="36" height="34" rx="5" fill="${c}"/><rect x="52" y="30" width="36" height="34" rx="5" fill="#e8efff"/><rect x="12" y="68" width="36" height="34" rx="5" fill="#e8efff"/><rect x="52" y="68" width="36" height="34" rx="5" fill="${c}" opacity=".5"/>`,
    smart: [0, 1, 2, 3, 4].map((i) => `<circle cx="82" cy="${36 + i * 15}" r="5" fill="${c}"/>` + l(34 + i * 15, 55)).join(''),
    ideas: [15, 42, 69].map((x) => `<rect x="${x}" y="30" width="20" height="8" rx="3" fill="${c}"/>` + [46, 56, 66, 76].map((y) => `<rect x="${x}" y="${y}" width="20" height="4" rx="2" fill="#dcdcdc"/>`).join('')).join(''),
    plan: [0, 1, 2].map((i) => `<rect x="60" y="${32 + i * 24}" width="28" height="16" rx="4" fill="${c}"/><path d="M55 ${40 + i * 24}h-8" stroke="${c}" stroke-width="3"/>` + l(38 + i * 24, 30)).join(''),
    stop: `<circle cx="50" cy="52" r="20" fill="none" stroke="${c}" stroke-width="6"/><rect x="44" y="44" width="4" height="16" rx="2" fill="${c}"/><rect x="52" y="44" width="4" height="16" rx="2" fill="${c}"/>` + l(84) + l(94, 50),
    talks: [0, 1, 2].map((i) => `<rect x="12" y="${30 + i * 25}" width="76" height="20" rx="5" fill="none" stroke="${c}" stroke-width="2.5"/>`).join(''),
    before: [0, 1, 2, 3, 4].map((i) => `<path d="M84 ${32 + i * 15}l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z" fill="${i < 3 ? c : '#dcdcdc'}"/>` + l(35 + i * 15, 55)).join(''),
    after: `<rect x="12" y="30" width="60" height="26" rx="10" fill="${c}"/><rect x="28" y="62" width="60" height="26" rx="10" fill="#e8efff"/>` + l(96, 50),
    cert: `<circle cx="50" cy="62" r="30" fill="#e8efff"/><path d="M50 62V32A30 30 0 0 1 80 62z" fill="${c}"/><circle cx="50" cy="62" r="12" fill="${c}" opacity=".6"/><path d="M20 62h60M50 32v60" stroke="#f0f0f0" stroke-width="2"/>`,
    celebrate: `<path d="M50 28l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill="${c}"/><circle cx="20" cy="34" r="3" fill="#23d7cd"/><circle cx="82" cy="80" r="3" fill="#0046ff"/>` + l(88) + l(98, 48),
  };
  return `<svg viewBox="0 0 100 112">${A[id] || l(40) + l(52) + l(64, 50)}</svg>`;
}
function blobDownload(blob, name) {
  const url = URL.createObjectURL(blob), a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
// כמה דפים בבת אחת: מאחדים את קובצי ה-PDF בדפדפן לקובץ אחד, ואז הורדה אחת
let pdfLibLoading = null;
const loadPdfLib = () => pdfLibLoading || (pdfLibLoading = new Promise((ok, bad) => { if (window.PDFLib) return ok(window.PDFLib); const s = h('script', { src: '/js/vendor/pdf-lib.min.js' }); s.onload = () => ok(window.PDFLib); s.onerror = () => { pdfLibLoading = null; bad(new Error('x')); }; document.head.append(s); }));
async function mergePdfs(files) {
  const { PDFDocument } = await loadPdfLib();
  const out = await PDFDocument.create();
  for (const f of files) {
    const src = await PDFDocument.load(await (await fetch(f)).arrayBuffer());
    (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
  }
  return new Blob([await out.save()], { type: 'application/pdf' });
}
function journeyTool() {
  const G = window.ZMAN_GOALS, root = h('div', { class: 'etools' });
  const COLS = [BRAND.turq, BRAND.sky, BRAND.purple];
  const teach = () => {
    const q = G.questions[JR.q];
    return [h('div', { class: 'quote' }, h('span', null, 'הכלל'), h('b', null, 'עשר דקות ושאלה אחת טובה. לא צריך תכנית שלמה.')),
      h('h3', { class: 'sub2' }, 'שלושה רגעים בשנה'),
      h('div', { class: 'moments' }, G.moments.map((m) => h('div', { class: 'moment' }, h('span', { class: 'mn' }, String(m.n)), h('b', null, m.t), h('span', null, m.when),
        h('span', { class: 'mp' }, m.pages.replace(/^דפים?:\s*/, '').split(/,\s*/).map((p) => h('i', null, p)))))),
      h('h3', { class: 'sub2' }, 'שאלות שעוזרות לשיחה'),
      h('div', { class: 'chips' }, G.questions.map((x, i) => h('button', { class: 'zpick' + (JR.q === i ? ' on' : ''), type: 'button', onclick: () => { JR.q = i; paint(); } }, x.t))),
      h('div', { class: 'qstack' }, q.q.map((x, i) => h('div', { class: 'qbub', style: `animation-delay:${i * 70}ms` }, x))),
      h('h3', { class: 'sub2' }, 'שלושה דגשים'),
      h('div', { class: 'tips3' }, [['ear', 'הכול מתחיל מהתלמיד/ה', 'לשאול, ולתת לתלמיד/ה לנסח'], ['target', 'מטרה אחת קטנה', 'עדיפה על שלוש כלליות'], ['empower', 'המטרה שלו/ה', 'אפשר להציע, ההחלטה אצלו/ה']]
        .map(([i, b, t]) => h('span', null, ic(i === 'ear' ? 'eye' : i, { size: 22 }), h('b', null, b), t))),
      h('div', { class: 'oc2' }, h('div', { class: 'quote' }, h('span', null, 'לפתוח'), h('b', null, G.open)), h('div', { class: 'quote v' }, h('span', null, 'לסגור'), h('b', null, G.close)))];
  };
  const fileOf = (item) => G.files.dir + (item.f[Math.min(JR.half, item.f.length - 1)] || item.f[0])[0];
  const printTab = () => {
    const chosen = G.pageGroups.flatMap((g) => g.items).filter((it) => JR.sel.has(it.id));
    const bar = h('div', { class: 'printbar' + (chosen.length ? ' on' : '') }, h('span', null, chosen.length ? `${chosen.length} ${chosen.length === 1 ? 'דף נבחר' : 'דפים נבחרו'}` : 'עוד לא נבחרו דפים'),
      h('button', { class: 'cta', type: 'button', disabled: !chosen.length, onclick: async (e) => {
        const b = e.currentTarget, label = b.textContent; b.disabled = true; b.textContent = 'מכינים…';
        try { blobDownload(chosen.length === 1 ? await (await fetch(fileOf(chosen[0]))).blob() : await mergePdfs(chosen.map(fileOf)), chosen.length === 1 ? fileOf(chosen[0]).split('/').pop() : 'yoman-dapim.pdf'); toast('הקובץ ירד למכשיר'); }
        catch { toast('לא הצלחנו להכין את הקובץ. אפשר לנסות שוב.'); } finally { b.disabled = false; b.textContent = label; }
      } }, 'הדפסה'));
    return [h('div', { class: 'book' }, h('div', { class: 'fan', 'aria-hidden': 'true' }, h('i', { style: `background:${BRAND.turq}` }), h('i', { style: `background:${BRAND.sky}` }), h('i', { style: `background:${BRAND.purple}` }, h('b', null, 'המסע', h('br'), 'שלי'))),
        h('div', { class: 'bookt' }, h('b', null, 'החוברת המלאה'), h('span', null, '20 עמודים לכל השנה'),
          h('div', { class: 'addrow' }, h('a', { class: 'cta light', href: G.files.print, download: 'yoman-hamasa-a4.pdf' }, 'A4'), h('a', { class: 'cta clear', href: G.files.a5, download: 'yoman-hamasa-a5.pdf' }, 'A5 חוברת')))),
      h('p', { class: 'tagline', style: 'font-size:19px' }, 'או רק מה שצריך לשיחה הבאה'),
      h('div', { class: 'row between' }, h('p', { class: 'qs', style: 'margin:0' }, 'נגיעה בדף בוחרת אותו'), segTabs([[0, 'מחצית א׳'], [1, 'מחצית ב׳']], JR.half, (v) => { JR.half = v; paint(); })),
      G.pageGroups.map((g, gi) => h('div', { class: 'shelf' }, h('h4', null, h('span', { style: `background:${COLS[gi]}` }, String(gi + 1)), g.t),
        h('div', { class: 'pages2' }, g.items.map((it) => { const on = JR.sel.has(it.id); return h('button', { class: 'pg2' + (on ? ' on' : ''), type: 'button', 'aria-pressed': String(on), onclick: () => { on ? JR.sel.delete(it.id) : JR.sel.add(it.id); paint(); } },
          h('span', { class: 'sheet2', style: `--pc:${COLS[gi]}` }, h('i', { class: 'top' }), svgSpan(pageArt(it.id, COLS[gi]), 'art'), h('span', { class: 'ok2' }, ic('check', { size: 14, tone: 'white' }))),
          h('b', null, it.t), h('span', null, [it.tag, it.time].filter(Boolean).join(' · '))); })))),
      bar];
  };
  function paint() {
    const y = window.scrollY; clear(root);
    add(root, [toolTop('/tools/goals/journal'), segTabs([['teach', 'למחנכת'], ['print', 'להדפסה']], JR.tab, (v) => { JR.tab = v; paint(); window.scrollTo(0, 0); }), h('div', { class: 'tbody' }, JR.tab === 'print' ? printTab() : teach())]);
    window.scrollTo(0, y);
  }
  paint();
  return root;
}

/* ---------- שותפות תלמידים: בשיחה האישית, סולם השותפות, בכיתה ---------- */
const AGS = { tab: 'talk', q: 0, rung: 2, roles: new Set(), names: {} };
function partnershipTool() {
  const D = AG(), root = h('div', { class: 'etools' });
  const RUNG = [BRAND.sky, BRAND.turq, BRAND.deep, BRAND.blue, BRAND.purple, BRAND.purple];
  const talk = () => [h('p', { class: 'qs' }, 'לכל תלמיד/ה יש תפקיד בכיתה. בשיחה האישית אפשר לשאול עליו, וכך לדבר על השפעה ועל קול.'),
    h('div', { class: 'bigq' }, ic('empower', { size: 36, tone: 'white' }), h('h3', null, D.questions[AGS.q]), h('span', { class: 'dots' }, D.questions.map((_, i) => h('i', { class: i === AGS.q ? 'on' : '' })))),
    h('div', { class: 'addrow' }, h('button', { class: 'cta ghostc', type: 'button', onclick: () => { AGS.q = (AGS.q + D.questions.length - 1) % D.questions.length; paint(); } }, 'הקודמת'),
      h('button', { class: 'cta violet', type: 'button', onclick: () => { AGS.q = (AGS.q + 1) % D.questions.length; paint(); } }, 'השאלה הבאה')),
    h('p', { class: 'small muted' }, 'אחרי השיחה, במבט השבועי, מסמנים את הציר אייג\'נסי.'), goA('/tools/cards/type/agency', 'linkbtn', 'קלפי שיח לאייג\'נסי')];
  const ladder = () => {
    const r = D.ladder[AGS.rung];
    return [h('p', { class: 'qs' }, 'על מה הכיתה מחליטה, ובאיזה שלב? אין שלב נכון אחד. נגיעה בשלב מראה דוגמה.'),
      h('div', { class: 'ladder' }, D.ladder.map((_, i) => i).reverse().map((i) => h('button', { class: 'rung' + (AGS.rung === i ? ' on' : ''), type: 'button', style: `width:${55 + i * 9}%;background:${RUNG[i]};color:${i < 2 ? 'var(--ink)' : '#fff'}`, onclick: () => { AGS.rung = i; paint(); } }, h('span', null, String(i + 1)), D.ladder[i].t))),
      h('div', { class: 'depthread' }, h('b', null, `${AGS.rung + 1} · ${r.t}`), h('span', null, r.d), h('span', { style: 'color:var(--ink)' }, `לדוגמה: ${r.ex}`)), h('p', { class: 'micro muted' }, D.ladderSource)];
  };
  const cls = () => {
    const chosen = [...AGS.roles];
    return [h('p', { class: 'tagline' }, 'הכיתה שלנו מנהלת'), h('p', { class: 'qs' }, 'בשיעור חינוך: כל תלמיד/ה בוחר/ת תפקיד, והכרזה נתלית בכיתה. אחר כך התפקיד עולה בשיחה האישית.'),
      h('ol', { class: 'how3' }, D.steps.map((s) => h('li', null, h('b', null, String(s.n)), `${s.t} · ${s.time}`))),
      h('h3', { class: 'sub2' }, 'בחירת תפקידים לכרזה'),
      D.roleGroups.map((g) => h('div', { class: 'stack', style: 'gap:8px' }, h('h4', { class: 'small muted' }, g.t),
        h('div', { class: 'chips' }, g.items.map((r) => h('button', { class: 'zpick' + (AGS.roles.has(r) ? ' on' : ''), type: 'button', 'aria-pressed': String(AGS.roles.has(r)), onclick: () => { AGS.roles.has(r) ? AGS.roles.delete(r) : AGS.roles.add(r); paint(); } }, r))))),
      chosen.length ? h('div', { class: 'stack', style: 'gap:8px' }, h('h4', { class: 'small muted' }, 'שמות (לא חובה, אפשר גם לכתוב ביד על הכרזה)'),
        chosen.map((r) => h('label', { class: 'rolename' }, h('span', null, r), h('input', { class: 'input', value: AGS.names[r] || '', maxlength: '60', placeholder: 'שמות', oninput: (e) => { AGS.names[r] = e.target.value; } })))) : null,
      h('button', { class: 'cta violet', type: 'button', onclick: printPoster }, chosen.length ? `הדפסת הכרזה (${chosen.length} תפקידים)` : 'הדפסת כרזה ריקה'),
      h('p', { class: 'small muted' }, 'הבחירה והשמות נשארים על המסך בלבד, ולא נשמרים ולא נשלחים.'),
      h('a', { class: 'linkbtn', href: D.files.pdf, download: 'shutfut-talmidim.pdf' }, 'החוברת המלאה להדפסה (7 עמודים)')];
  };
  function paint() {
    const y = window.scrollY; clear(root);
    add(root, [toolTop('/tools/agency/partnership'), segTabs([['talk', 'בשיחה האישית'], ['ladder', 'סולם השותפות'], ['class', 'בכיתה']], AGS.tab, (v) => { AGS.tab = v; paint(); }),
      h('div', { class: 'tbody' }, ({ talk, ladder, class: cls })[AGS.tab]())]);
    window.scrollTo(0, y);
  }
  paint();
  return root;
}
// כרזה לקיר הכיתה: דף שמופיע רק בהדפסה, ונעלם אחריה
function printPoster() {
  const chosen = [...AGS.roles], cols = [BRAND.blue, BRAND.purple, BRAND.deep, BRAND.turq, BRAND.sky];
  const cells = chosen.length ? chosen : Array.from({ length: 8 }, () => '');
  const sheet = h('div', { id: 'printsheet', dir: 'rtl' },
    h('div', { class: 'ps-head' }, h('img', { src: 'assets/logo/hotam-logo.png', alt: 'חותם' }), h('img', { src: 'assets/logo/ort-logo.png', alt: 'רשת אורט' }), h('img', { src: 'assets/logo/zman-logo.svg', alt: 'זמן לחינוך' })),
    h('div', { class: 'ps-hero' }, h('b', null, 'הכיתה שלנו מנהלת'), h('span', null, 'כל אחד ואחת אחראים על משהו')),
    h('div', { class: 'ps-grid' }, cells.map((r, i) => h('div', { class: 'ps-role', style: `border-color:${cols[i % 5]}` }, h('span', { class: 'ps-t', style: `color:${cols[i % 5]}` }, r || 'תפקיד:'), h('span', { class: 'ps-n' }, AGS.names[r] || '')))),
    h('p', { class: 'ps-foot' }, 'זמן לחינוך · שותפות תלמידים'));
  document.body.append(sheet);
  const done = () => { sheet.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(() => window.print(), 50);
}

/* ---------- קלפי שיח: רגע לפני השיחה (פעם אחת בכל כניסה) ---------- */
let focusShown = false;
function focusPrompt() {
  if (focusShown) return; focusShown = true;
  bottomSheet((close) => h('div', { class: 'stack' }, h('h3', null, 'רגע לפני השיחה'),
    h('ol', { class: 'how3' }, h('li', null, h('b', null, '1'), h('span', null, 'כדאי להפעיל "נא לא להפריע", כדי שהודעות לא יקפצו על הקלף.', h('small', null, 'iPhone: מרכז הבקרה ← מיקוד · Android: משיכה מלמעלה ← נא לא להפריע'))),
      h('li', null, h('b', null, '2'), 'המסך נשאר דלוק כל עוד הקלפים פתוחים.')),
    h('button', { class: 'cta', type: 'button', onclick: close }, 'אפשר להתחיל')));
}

/* ---------- כניסה ראשונה: פתיחה, מבט שבועי לתרגול, והוספה למסך הבית ----------
   מופיעה פעם אחת בכל מכשיר אחרי הכניסה, ואפשר לראות אותה שוב מ"השבועות שלי". התרגול לא נשמר. */
const ONBOARD_KEY = 'zmw.onboarded';
const WEL = { step: 0, os: null };
const PRACTICE_TIPS = {
  count: 'תרגול: אפשר לבחור כל מספר. שום דבר לא נשמר.', zero: 'גם שבוע בלי שיחות נשלח בשתי נגיעות.',
  axis: 'אלה הצירים מההכשרה. אפשר לבחור כמה.', kind: 'ואיזו שיחה זו הייתה.', depth: 'גרירה של הצוללן, או נגיעה בעומק.',
  talk: 'כמה מקום היה לקול של התלמיד/ה.', feel: 'ואיך השיחה הייתה בשבילך.', saved: 'כשהשיחות דומות, כפתור אחד שומר את כולן.',
};
// הוספה למסך הבית: ב-Android הדפדפן מציע התקנה בלחיצה אחת. באייפון מסבירים איפה הכפתור.
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
window.addEventListener('appinstalled', () => { installPrompt = null; });
const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch { return false; } };
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function finishWelcome() { const e = me(); if (e) lsSet(ONBOARD_KEY + '.' + e.id, '1'); WEL.step = 0; }
function eduWelcome() {
  const dots = (n) => h('div', { class: 'odots', 'aria-hidden': 'true' }, [0, 1, 2, 3].map((i) => h('i', { class: i === n ? 'on' : '' })));
  if (WEL.step === 2) {
    return h('div', { class: 'onb' }, h('span', { class: 'obadge' }, ic('calendar', { size: 34, tone: 'white' })), h('h2', null, 'מתי נוח לקבל תזכורת?'), h('p', null, 'פעם בשבוע, בזמן שמתאים לך.'),
      reminderPanel(() => { WEL.step = 3; render(); }, 'המשך'),
      h('button', { class: 'linkbtn', type: 'button', style: 'align-self:center', onclick: () => { WEL.step = 3; render(); } }, 'בלי תזכורת בינתיים'), dots(2));
  }
  if (WEL.step === 3) {
    if (!WEL.os) WEL.os = isIOS() ? 'ios' : 'android';
    const ios = WEL.os === 'ios';
    const steps = ios ? [['send', 'נגיעה בכפתור השיתוף בתחתית הדפדפן'], ['plan', '"הוספה למסך הבית"'], ['check', '"הוספה", וזהו']]
      : [['gear', 'נגיעה בשלוש הנקודות למעלה'], ['plan', '"הוספה למסך הבית" או "התקנת אפליקציה"'], ['check', '"הוספה", וזהו']];
    const done = () => { finishWelcome(); go('/'); setTimeout(() => { confetti(90, 1); toast('הכול מוכן'); }, 50); };
    return h('div', { class: 'onb' },
      h('span', { class: 'obadge' }, ic('school', { size: 34, tone: 'white' })), h('h2', null, 'על המסך של הטלפון'),
      isStandalone() ? h('p', null, 'האפליקציה כבר נפתחת מהמסך של הטלפון. אפשר להמשיך.')
        : [h('p', null, 'כך האפליקציה נפתחת בנגיעה אחת, כמו כל אפליקציה.'),
          installPrompt ? h('button', { class: 'cta', type: 'button', onclick: async () => { const p = installPrompt; installPrompt = null; try { p.prompt(); await p.userChoice; } catch { /* הדפדפן סירב */ } render(); } }, 'הוספה למסך הבית') : null,
          segTabs([['ios', 'iPhone'], ['android', 'Android']], WEL.os, (v) => { WEL.os = v; render(); }),
          h('ol', { class: 'how3' }, steps.map(([, t], k) => h('li', null, h('b', null, String(k + 1)), t))),
          h('div', { class: 'homegrid', 'aria-hidden': 'true' }, Array.from({ length: 8 }, (_, i) => (i === 5 ? h('span', { class: 'appic on' }, h('img', { src: '/icons/icon-192.png', alt: '' }), h('small', null, 'זמן לחינוך')) : h('span', { class: 'appic' }, h('i'), h('small')))))],
      h('div', { class: 'spacer' }), h('button', { class: 'cta', type: 'button', onclick: done }, 'סיימתי'), dots(3));
  }
  return h('div', { class: 'onb' },
    h('img', { class: 'onblogo', src: 'assets/logo/zman-logo.svg', alt: 'זמן לחינוך' }),
    h('div', { class: 'onbart', 'aria-hidden': 'true' }, h('span', { class: 'oa1' }, h('i', { style: 'height:30%' }), h('i', { style: 'height:55%' }), h('i', { style: 'height:80%' }), h('i', { class: 'q' }, '?')),
      h('span', { class: 'oa2' }, ic('idea', { size: 34, tone: 'white' })), h('span', { class: 'oa3' }, ROUND_LOOK.concat(ROUND_LOOK.slice(1, 3)).map((L) => h('i', { style: `background:${L.c}` })))),
    h('h2', null, 'שמחים שהגעת'),
    h('p', null, 'כאן אפשר לספר על השיחות האישיות שלך, בשתי דקות בשבוע, ולמצוא כלים לשיחה הבאה.'),
    h('div', { class: 'spacer' }),
    h('button', { class: 'cta', type: 'button', onclick: () => go('/welcome/practice') }, 'לנסות עכשיו · דקה אחת'),
    h('button', { class: 'linkbtn', type: 'button', style: 'align-self:center', onclick: () => { finishWelcome(); go('/'); } }, 'לדלג לדף הבית'), dots(0));
}

/* ---------- תזכורת שבועית: יום, שעה, התראה בטלפון ו/או מייל ----------
   ההגדרות נשמרות בשרת. מייל נשמר רק אם בוחרים תזכורת במייל. נגיעה בתזכורת פותחת ישר את המבט לשבוע הזה. */
const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
let REM = null;
async function loadReminder(force) { if (!REM || force) REM = await api('GET', '/api/me/reminder'); return REM; }
const remOn = () => !!(REM && REM.reminder && (REM.reminder.push || REM.reminder.mail));
const remLabel = () => (!remOn() ? 'להגדרת תזכורת שבועית' : REM.reminder.skipWeek ? 'בלי תזכורת השבוע' : `תזכורת בימי ${DAYS_HE[REM.reminder.day]} · ${REM.reminder.hour}:00`);
function remChip() {
  const chip = h('a', { class: 'remchip', href: '#/reminder', onclick: (e) => { e.preventDefault(); go('/reminder'); } }, ic('calendar', { size: 18 }), h('span', null, REM ? remLabel() : 'תזכורת שבועית'));
  if (!REM) loadReminder().then(() => { if (document.body.contains(chip)) chip.lastChild.textContent = remLabel(); }, () => {});
  return chip;
}
const b64ToBytes = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };
// הפעלת התראות בטלפון. מחזיר 'ok' או סיבה למה לא
async function enablePush() {
  if (isIOS() && !isStandalone()) return 'ios-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (!REM.pushReady || !REM.vapidPublicKey) return 'server';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.ready;
  // טלפון שלא עונה לבקשה תוך 20 שניות: מחזירים תשובה, ולא משאירים את הכפתור תקוע
  const late = new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 20000));
  const sub = await Promise.race([(async () => (await reg.pushManager.getSubscription()) || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(REM.vapidPublicKey) }))(), late]);
  await api('POST', '/api/me/push-subscriptions', sub.toJSON());
  return 'ok';
}
const PUSH_WHY = {
  'ios-install': 'באייפון, התראות עובדות רק אחרי שהאפליקציה נוספה למסך הבית. אפשר להוסיף אותה ואז לחזור לכאן.',
  unsupported: 'הדפדפן הזה לא תומך בהתראות. אפשר לבחור מייל במקום.',
  server: 'ההתראות בטלפון עוד לא הופעלו באפליקציה. ההגדרה תישמר ותעבוד ברגע שיופעלו.',
  denied: 'ההתראות חסומות בהגדרות של הטלפון. אפשר לאשר אותן שם, או לבחור מייל.',
  failed: 'לא הצלחנו להפעיל התראות במכשיר הזה. אפשר לנסות שוב, או לבחור מייל.',
};
// הלוח עצמו: משמש גם בדף התזכורת וגם בכניסה הראשונה
function reminderPanel(onSaved, saveLabel = 'שמירה') {
  const host = h('div', { class: 'remb' }, h('p', { class: 'muted', role: 'status' }, 'טוענים…'));
  let D = null, note = '';
  const paint = () => {
    clear(host);
    const hourOpts = [13, 15, 17, 20];
    add(host, [
      h('h3', { class: 'sub2' }, 'באיזה יום?'),
      h('div', { class: 'days' }, DAYS_HE.map((d, i) => h('button', { class: 'day' + (D.day === i ? ' on' : ''), type: 'button', 'aria-pressed': String(D.day === i), 'aria-label': d, onclick: () => { D.day = i; paint(); } }, 'אבגדהו'[i] + '׳'))),
      h('h3', { class: 'sub2' }, 'באיזו שעה?'),
      h('div', { class: 'chips' }, hourOpts.map((x) => h('button', { class: 'zpick' + (D.hour === x ? ' on' : ''), type: 'button', onclick: () => { D.hour = x; paint(); } }, `${x}:00`)),
        h('select', { class: 'select hoursel', 'aria-label': 'שעה אחרת', onchange: (e) => { D.hour = Number(e.target.value); paint(); } },
          Array.from({ length: 17 }, (_, k) => k + 6).map((x) => h('option', { value: String(x), selected: D.hour === x }, hourOpts.includes(x) ? `${x}:00` : `שעה אחרת · ${x}:00`)))),
      h('h3', { class: 'sub2' }, 'איך? אפשר את שתיהן'),
      h('div', { class: 'chtog' },
        h('button', { class: D.push ? 'on' : '', type: 'button', 'aria-pressed': String(D.push), onclick: async () => {
          if (D.push) { D.push = false; note = ''; paint(); return; }
          note = 'מפעילים התראות…'; paint();
          const r = await enablePush().catch(() => 'failed');
          D.push = r === 'ok' || r === 'server'; note = r === 'ok' ? '' : PUSH_WHY[r]; paint();
        } }, ic(D.push ? 'check' : 'idea', { size: 18 }), 'התראה בטלפון'),
        h('button', { class: D.mail ? 'on' : '', type: 'button', 'aria-pressed': String(D.mail), onclick: () => { D.mail = !D.mail; paint(); if (D.mail) setTimeout(() => host.querySelector('.remmail')?.focus(), 0); } }, ic(D.mail ? 'check' : 'send', { size: 18 }), 'מייל')),
      note ? h('p', { class: 'warn-note' }, note) : null,
      D.mail ? [h('input', { class: 'input remmail', type: 'email', value: D.email, placeholder: 'כתובת המייל שלך', 'aria-label': 'כתובת המייל לתזכורת', autocomplete: 'email', oninput: (e) => { D.email = e.target.value; } }),
        h('p', { class: 'small muted' }, 'הכתובת נשמרת רק בשביל התזכורת, ונמחקת כשמכבים את המייל.'), REM.mailReady ? null : h('p', { class: 'small muted' }, 'המייל עוד לא הופעל באפליקציה. ההגדרה תישמר ותעבוד ברגע שיופעל.')] : null,
      D.push ? h('div', { class: 'lock' }, h('span', { class: 'lktime num' }, `${D.hour}:00`), h('span', { class: 'lkday' }, `יום ${DAYS_HE[D.day]}`),
        h('span', { class: 'ncard' }, h('img', { src: '/icons/icon-192.png', alt: '' }), h('span', null, h('b', null, 'המבט השבועי'), 'שתי דקות על השיחות של השבוע?'), h('small', null, 'עכשיו'))) : null,
      D.mail ? h('div', { class: 'mail2' }, h('img', { src: '/icons/icon-192.png', alt: '' }), h('span', null, h('b', null, 'זמן לחינוך'), h('span', { class: 'subj' }, 'המבט השבועי · שתי דקות'), h('span', { class: 'snip' }, `יום ${DAYS_HE[D.day]}, ${D.hour}:00 · כפתור אחד שפותח את המבט`))) : null,
      D.push || D.mail ? h('p', { class: 'small muted', style: 'text-align:center' }, 'נגיעה בתזכורת פותחת ישר את השאלה הראשונה. אם המבט כבר נשלח, לא תגיע תזכורת.') : null,
      remOn() || D.push || D.mail ? h('button', { class: 'cta ' + (D.skipWeek ? 'violet' : 'ghostc'), type: 'button', onclick: () => { D.skipWeek = !D.skipWeek; paint(); } }, D.skipWeek ? 'בלי תזכורת השבוע · לביטול' : 'השבוע חג או חופשה? דילוג על תזכורת אחת') : null,
      h('button', { class: 'cta', type: 'button', onclick: async (e) => {
        if (D.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(D.email.trim())) { toast('כדאי לבדוק את כתובת המייל'); return; }
        const b = e.currentTarget; b.disabled = true;
        try { await api('PUT', '/api/me/reminder', { day: D.day, hour: D.hour, push: D.push, mail: D.mail, email: D.email.trim(), skipWeek: D.skipWeek }); await loadReminder(true); toast(D.push || D.mail ? 'התזכורת נשמרה' : 'התזכורת כבויה'); if (onSaved) onSaved(); else paint(); }
        catch (ex) { toast(ex.message); b.disabled = false; }
      } }, saveLabel),
      remOn() && !onSaved ? h('button', { class: 'linkbtn', type: 'button', style: 'align-self:center', onclick: async () => {
        try { const r = (await api('POST', '/api/me/reminder/test')).sent; toast(r.failed && r.failed.length ? `לא נשלח ${r.failed.includes('mail') ? 'מייל' : 'התראה'}. כדאי לבדוק את ההגדרות ולנסות שוב.` : r.push || r.mail ? `נשלחה תזכורת לניסיון${r.push ? ' לטלפון' : ''}${r.push && r.mail ? ' ו' : ''}${r.mail ? 'למייל' : ''}` : 'לא נשלח: הערוצים עוד לא פעילים באפליקציה'); } catch (ex) { toast(ex.message); }
      } }, 'שליחת תזכורת לניסיון') : null]);
  };
  loadReminder(true).then(() => { const r = REM.reminder || {}; D = { day: r.day ?? 4, hour: r.hour ?? 17, push: !!r.push, mail: !!r.mail, email: r.email || '', skipWeek: !!r.skipWeek }; paint(); },
    (ex) => { clear(host); add(host, [h('p', { class: 'err' }, ex.message)]); });
  return host;
}
function eduReminder() {
  return h('div', { class: 'etools' }, h('div', { class: 'ttop' }, backBtn('/', 'בית'), h('h2', null, 'תזכורת שבועית')),
    h('p', { class: 'qs' }, 'פעם בשבוע, בזמן שמתאים לך.'), reminderPanel(null));
}

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
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}
boot();
})();
