// הורדת מיפוי הכיתה כקובץ PDF. הכול נבנה בדפדפן, במכשיר של המחנכת: שום דבר לא נשלח לשרת.
// העמודים מצוירים על קנבס (כך שהעברית נראית בדיוק כמו באתר) ונארזים בקובץ PDF פשוט, עמוד אחד לכל תמונה.
(() => {
  'use strict';
  const W = 1240, H = 1754;          // A4 ב-150 dpi
  const M = 70;                      // שוליים
  const FONT = '"Rubik", "Segoe UI", "Arial Hebrew", Arial, sans-serif';
  const INK = '#161616', MUTED = '#55585f', LEAD = '#0046ff', SOFT = '#f0f0f0', VIOLET = '#6437eb', LINE = '#d9dbe0';
  const LINK_TEXT = { 1: 'כמעט לא מכיר/ה', 2: 'מכיר/ה את הבסיס', 3: 'קשר ושיח פתוח' };
  const AXIS_TEXT = { z: 'ז', y: 'י', a: 'א' };
  const GROUPS = [
    { n: 1, t: 'ראשונים', d: 'יש נקודה (דחוף), בכל קשר' },
    { n: 2, t: 'אחריהם', d: 'בלי נקודה · קשר 1' },
    { n: 3, t: 'אחר כך', d: 'בלי נקודה · קשר 2' },
    { n: 4, t: 'לבסוף', d: 'בלי נקודה · קשר 3' },
  ];
  const groupOf = (s) => (!s.link ? null : s.urgent ? 1 : s.link === 1 ? 2 : s.link === 2 ? 3 : 4);
  const R = [0.07, 0.21, 0.35, 0.48];

  function newPage() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.direction = 'rtl'; g.textBaseline = 'alphabetic';
    return { c, g };
  }
  const font = (g, size, weight = 400) => { g.font = `${weight} ${size}px ${FONT}`; };
  // טקסט מיושר לימין (או לשמאל/למרכז) ב-x נתון. מקצר עם "…" אם הוא רחב מ-maxW
  function text(g, str, x, y, { size = 26, weight = 400, color = INK, align = 'right', maxW = 0 } = {}) {
    font(g, size, weight); g.fillStyle = color; g.textAlign = align;
    let s = String(str ?? '');
    if (maxW && g.measureText(s).width > maxW) {
      while (s.length > 1 && g.measureText(s + '…').width > maxW) s = s.slice(0, -1);
      s += '…';
    }
    g.fillText(s, x, y);
    return g.measureText(s).width;
  }
  function wrap(g, str, maxW, size, weight = 400) {
    font(g, size, weight);
    const words = String(str).split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const hline = (g, y, x0 = M, x1 = W - M, color = LINE, w = 2) => { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); };

  function header(g, info, big) {
    text(g, 'מיפוי הכיתה', W - M, M + 52, { size: big ? 64 : 40, weight: 900 });
    const sub = [info.cls ? `כיתה ${info.cls}` : '', info.round ? `סבב ${['ראשון', 'שני', 'שלישי'][info.round - 1] || info.round}` : '', info.date].filter(Boolean).join('  ·  ');
    text(g, sub, W - M, M + (big ? 110 : 96), { size: 28, color: MUTED });
    text(g, 'זמן לחינוך', M, M + 52, { size: 30, weight: 700, color: LEAD, align: 'left' });
    return M + (big ? 144 : 124);
  }
  function footer(g, i, n, info) {
    hline(g, H - 78, M, W - M);
    text(g, 'המיפוי נוצר במכשיר שלי ולא נשלח לשרת. כדאי לשמור את הקובץ במקום מאובטח.', W - M, H - 38, { size: 22, color: MUTED });
    text(g, `עמוד ${i} מתוך ${n}`, M, H - 38, { size: 22, color: MUTED, align: 'left' });
  }

  // ---------- טבלה ----------
  const COLS = [['#', 46, 'center'], ['שם או ראשי תיבות', 290, 'right'], ['קשר', 150, 'center'], ['דחוף', 150, 'center'], ['ציר', 90, 'center'], ['סבבי שיחות', 150, 'center'], ['שיחה אחרונה', 150, 'center'], ['קבוצה', 96, 'center']];
  function tableHead(g, y) {
    g.fillStyle = SOFT; roundRect(g, M, y, W - 2 * M, 52, 14); g.fill();
    let x = W - M;
    for (const [label, w, al] of COLS) { text(g, label, al === 'right' ? x - 14 : x - w / 2, y + 35, { size: 22, weight: 700, color: MUTED, align: al === 'right' ? 'right' : 'center', maxW: w - 12 }); x -= w; }
    return y + 52;
  }
  function tableRow(g, s, i, y) {
    const h = 52;
    let x = W - M;
    const cell = (w) => { const c = { cx: x - w / 2, left: x - w, right: x }; x -= w; return c; };
    const mid = y + 35;
    let c = cell(COLS[0][1]); text(g, String(i + 1), c.cx, mid, { size: 22, color: MUTED, align: 'center' });
    c = cell(COLS[1][1]); text(g, s.name || '(ללא שם)', c.right - 14, mid, { size: 27, weight: 500, maxW: COLS[1][1] - 24 });
    c = cell(COLS[2][1]); text(g, s.link ? String(s.link) : '–', c.cx, mid, { size: 26, weight: s.link ? 700 : 400, color: s.link ? LEAD : MUTED, align: 'center' });
    c = cell(COLS[3][1]);
    if (s.urgent) { g.fillStyle = VIOLET; g.beginPath(); g.arc(c.right - 28, y + 26, 10, 0, Math.PI * 2); g.fill(); text(g, s.word || '', c.right - 46, mid - 1, { size: 22, color: INK, maxW: COLS[3][1] - 60 }); } else text(g, '', c.cx, mid);
    c = cell(COLS[4][1]); text(g, s.axis ? AXIS_TEXT[s.axis] || '' : '', c.cx, mid, { size: 26, weight: 700, color: s.axis ? INK : MUTED, align: 'center' });
    c = cell(COLS[5][1]);
    for (let k = 0; k < 3; k++) { const cx = c.cx + (1 - k) * 36; g.beginPath(); g.arc(cx, y + 26, 11, 0, Math.PI * 2); if ((s.rounds || [])[k]) { g.fillStyle = LEAD; g.fill(); } else { g.strokeStyle = LEAD; g.lineWidth = 3; g.stroke(); } }
    c = cell(COLS[6][1]);
    const last = s.last ? s.last.slice(0, 10).split('-').reverse().map(Number) : null;
    text(g, last ? `${last[0]}.${last[1]}.${String(last[2]).slice(2)}` : '–', c.cx, mid, { size: 22, color: s.last ? INK : MUTED, align: 'center' });
    c = cell(COLS[7][1]);
    const gr = groupOf(s);
    if (gr) { g.fillStyle = LEAD; g.beginPath(); g.arc(c.cx, y + 26, 20, 0, Math.PI * 2); g.fill(); text(g, String(gr), c.cx, y + 35, { size: 24, weight: 900, color: '#fff', align: 'center' }); } else text(g, '–', c.cx, mid, { size: 24, color: MUTED, align: 'center' });
    hline(g, y + h, M, W - M, '#ececf0', 2);
    return y + h;
  }

  // ---------- מעגלי קשר ----------
  function placeAll(students) {
    const ringOf = (x, y) => { const d = Math.hypot(x - 0.5, y - 0.5); return d < R[0] ? null : d < R[1] ? 3 : d < R[2] ? 2 : d <= R[3] + 0.04 ? 1 : 0; };
    const out = [];
    const pending = { 1: [], 2: [], 3: [] };
    for (const s of students) {
      if (!s.link) continue;
      if (typeof s.x === 'number' && typeof s.y === 'number' && ringOf(s.x, s.y) === s.link) out.push({ s, x: s.x, y: s.y }); else pending[s.link].push(s);
    }
    // מי שאין לו מיקום שמור (למשל מי שסומן רק בטבלה): פיזור שווה לאורך הטבעת
    const band = { 3: (R[0] + R[1]) / 2, 2: (R[1] + R[2]) / 2, 1: (R[2] + R[3]) / 2 };
    for (const link of [1, 2, 3]) {
      const list = pending[link];
      list.forEach((s, k) => { const a = -Math.PI / 2 + 0.5 + (k / list.length) * Math.PI * 2; out.push({ s, x: 0.5 + band[link] * Math.cos(a), y: 0.5 + band[link] * Math.sin(a) }); });
    }
    return out;
  }
  function circlesBlock(g, top, size, students) {
    const x0 = (W - size) / 2, cx = x0 + size / 2, cy = top + size / 2;
    g.strokeStyle = LEAD; g.lineWidth = 3;
    for (const [r, dash] of [[0.48, false], [0.35, true], [0.21, false]]) { g.setLineDash(dash ? [14, 10] : []); g.beginPath(); g.arc(cx, cy, r * size, 0, Math.PI * 2); g.stroke(); }
    g.setLineDash([]);
    g.fillStyle = LEAD; g.beginPath(); g.arc(cx, cy, R[0] * size, 0, Math.PI * 2); g.fill();
    text(g, 'אני', cx, cy + 10, { size: 30, weight: 900, color: '#fff', align: 'center' });
    [[3, 0.13], [2, 0.275], [1, 0.415]].forEach(([ring, off]) => {
      const ly = top + size * (0.5 - off - 0.03), lt = `${ring} · ${LINK_TEXT[ring]}`;
      font(g, 21, 400); const lw = g.measureText(lt).width + 24;
      g.fillStyle = '#fff'; g.fillRect(cx - lw / 2, ly - 24, lw, 34);
      text(g, lt, cx, ly, { size: 21, color: MUTED, align: 'center' });
    });
    for (const { s, x, y } of placeAll(students)) {
      const label = (s.name || '').trim() || '?';
      font(g, 22, 700);
      const w = Math.min(190, g.measureText(label).width + 28), h = 38;
      const px = x0 + x * size, py = top + y * size;
      roundRect(g, px - w / 2, py - h / 2, w, h, 19);
      g.fillStyle = s.urgent ? VIOLET : '#fff'; g.fill(); g.strokeStyle = s.urgent ? VIOLET : LEAD; g.lineWidth = 3; g.stroke();
      text(g, label, px, py + 8, { size: 22, weight: 700, color: s.urgent ? '#fff' : INK, align: 'center', maxW: w - 20 });
    }
  }
  function groupsBlock(g, top, students) {
    let y = top;
    for (const gr of GROUPS) {
      const members = students.filter((s) => groupOf(s) === gr.n);
      g.fillStyle = LEAD; g.beginPath(); g.arc(W - M - 20, y + 20, 20, 0, Math.PI * 2); g.fill();
      text(g, String(gr.n), W - M - 20, y + 29, { size: 24, weight: 900, color: '#fff', align: 'center' });
      text(g, `${gr.t} (${members.length})`, W - M - 56, y + 30, { size: 27, weight: 700 });
      text(g, gr.d, M, y + 30, { size: 21, color: MUTED, align: 'left' });
      const names = members.map((s) => (s.name || '(ללא שם)') + (s.urgent && s.word ? ` (${s.word})` : '')).join('  ·  ') || 'אין תלמידים בקבוצה';
      const lines = wrap(g, names, W - 2 * M - 56, 23);
      lines.slice(0, 2).forEach((l, k) => text(g, k === 1 && lines.length > 2 ? l + ' …' : l, W - M - 56, y + 66 + k * 32, { size: 23, color: members.length ? INK : MUTED }));
      y += 66 + Math.min(2, lines.length) * 32 + 22;
    }
    return y;
  }

  // ---------- בניית הקבצים ----------
  const jpegBytes = (c) => { const b64 = c.toDataURL('image/jpeg', 0.9).split(',')[1], bin = atob(b64), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };

  function buildPdf(images, title) {
    const enc = new TextEncoder(), chunks = [], offs = [];
    let len = 0;
    const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n${body}\nendobj\n`); };
    push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // %PDF-1.4 + שורת סימון בינרית
    const N = images.length, info = 3 + 3 * N;
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${images.map((_, i) => `${3 + 3 * i} 0 R`).join(' ')}] /Count ${N} >>`);
    images.forEach((img, i) => {
      const page = 3 + 3 * i, cont = page + 1, im = page + 2;
      obj(page, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${cont} 0 R >>`);
      const stream = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
      obj(cont, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      offs[im] = len;
      push(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);
      push(img); push('\nendstream\nendobj\n');
    });
    const hex = Array.from(`﻿${title}`).map((ch) => ch.charCodeAt(0).toString(16).padStart(4, '0')).join('').toUpperCase();
    obj(info, `<< /Title <${hex}> /Producer (zman-lachinuch) >>`);
    const xref = len;
    let x = `xref\n0 ${info + 1}\n0000000000 65535 f \n`;
    for (let n = 1; n <= info; n++) x += `${String(offs[n]).padStart(10, '0')} 00000 n \n`;
    x += `trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    push(x);
    return new Blob(chunks, { type: 'application/pdf' });
  }

  async function mappingPdf(map, { date = '' } = {}) {
    try { await Promise.all([document.fonts.load(`700 28px Rubik`), document.fonts.load(`400 28px Rubik`), document.fonts.load(`900 28px Rubik`)]); } catch { /* ממשיכים עם גופן חלופי */ }
    const students = map.students || [];
    const info = { cls: (map.cls || '').trim(), round: map.round, date };
    const pages = [];
    // טבלה: עמוד ראשון עם כותרת גדולה, והמשך בעמודים נוספים
    let i = 0, first = true;
    do {
      const { c, g } = newPage();
      let y = header(g, info, first);
      if (first) { text(g, 'כל התלמידים: קשר, דחוף, ציר שיחה, סבבים ושיחה אחרונה. הקבוצה מסדרת את סדר השיחות.', W - M, y + 10, { size: 24, color: MUTED }); y += 40; }
      y = tableHead(g, y + 8) + 4;
      const room = Math.floor((H - 110 - y) / 52);
      for (let k = 0; k < room && i < students.length; k++, i++) y = tableRow(g, students[i], i, y);
      pages.push({ c, g }); first = false;
    } while (i < students.length);
    // מעגלי קשר וסדר מוצע
    const circ = newPage();
    const y0 = header(circ.g, info, false);
    text(circ.g, 'מעגלי קשר: ככל שהשם קרוב יותר למרכז, הקשר חזק יותר.', W - M, y0 + 10, { size: 24, color: MUTED });
    const size = 740;
    circlesBlock(circ.g, y0 + 40, size, students);
    const yEnd = y0 + 40 + size + 36;
    text(circ.g, 'סדר מוצע לשיחות', W - M, yEnd + 24, { size: 32, weight: 900 });
    groupsBlock(circ.g, yEnd + 48, students);
    pages.push(circ);
    pages.forEach((p, k) => footer(p.g, k + 1, pages.length, info));
    return buildPdf(pages.map((p) => jpegBytes(p.c)), `מיפוי הכיתה${info.cls ? ' ' + info.cls : ''}`);
  }

  window.ZmanPdf = { mappingPdf, buildPdf };
})();
