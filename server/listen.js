'use strict';
// בוט "המקרה שלי" בכלי "להקשיב לכוחות": מחנכת מתארת התמודדות משיחה אישית, והבוט מדבר איתה עליה.
// שום דבר לא נשמר בשרת ולא נרשם ביומן. התוכן עובר ל-Anthropic רק כדי לקבל תשובה.
// משתני סביבה ב-Vercel: ANTHROPIC_API_KEY (המפתח) ו-ANTHROPIC_MODEL (שם המודל). בלעדיהם הנתיב מחזיר 503 והכלי נופל לדוגמאות מוכנות.
const auth = require('./auth');
const { route, HttpError } = require('./http');

const MAX_MESSAGES = 16;
const MAX_CHARS = 1200;
const TIMEOUT_MS = 12000;

const SYSTEM = `את/ה בן/בת שיח למחנכות ולמחנכים בכיתה י׳ שמתכוננים לשיחה אישית עם תלמיד/ה או חושבים על שיחה שהייתה.
המחנך/ת מתאר/ת התמודדות, ואת/ה עוזר/ת לחשוב עליה יחד, לא נותן/ת הרצאה.
איך עונים:
- קודם מקשיבים: משקפים במשפט אחד מה שמענו, ושואלים שאלה אחת שמפרישה את הסיפור (מה קרה בפועל, מה התלמיד/ה עשו, מה חשוב להם).
- כשיש מקום, מציעים ניסוח קצר שאפשר להגיד לתלמיד/ה, בגרשיים, בעברית יומיומית.
- שם לכוח מוצע רק כהשערה עם סימן שאלה, ורק אחרי שברור מה קרה. התלמיד/ה שותפ/ה לפרשנות ויכול/ה לדחות אותה.
- קושי נשאר קושי: לא הופכים אותו לחוזקה. לא כל שיחה צריכה להסתיים בחוזקה.
- כשעולה מצוקה, פגיעה עצמית, אלימות או פחד, נשארים בהקשבה ומזכירים לערב את היועצת ולפעול לפי נוהל בית הספר.
- אם נכתבו שם או פרט מזהה, מבקשים בעדינות להמשיך בלי פרטים מזהים.
סגנון: עברית פשוטה וחמה, בלי סימני קריאה ובלי אימוג׳י, כתיבה שאינה מניחה מגדר (תלמיד/ה, מחנך/ת). עד 120 מילים בתשובה. עונים תמיד בעברית.`;

function cleanMessages(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_MESSAGES) throw new HttpError(400, 'השיחה לא תקינה.');
  const out = raw.map((m) => {
    const role = m && m.role === 'assistant' ? 'assistant' : 'user';
    const text = m && typeof m.text === 'string' ? m.text.trim().slice(0, MAX_CHARS) : '';
    if (!text) throw new HttpError(400, 'השיחה לא תקינה.');
    return { role, content: text };
  });
  if (out[0].role !== 'user' || out[out.length - 1].role !== 'user') throw new HttpError(400, 'השיחה לא תקינה.');
  for (let i = 1; i < out.length; i++) if (out[i].role === out[i - 1].role) throw new HttpError(400, 'השיחה לא תקינה.');
  return out;
}

route('POST', '/api/listen/chat', 'any', async (ctx) => {
  const key = process.env.ANTHROPIC_API_KEY, model = process.env.ANTHROPIC_MODEL;
  if (!key || !model) throw new HttpError(503, 'הבוט עדיין לא מחובר.', 'bot_off');
  const messages = cleanMessages(ctx.body.messages);
  const wait = await auth.hit(`bot:${ctx.user.id}`);
  if (wait) throw new HttpError(429, `שלחתם הרבה הודעות. אפשר להמשיך בעוד ${wait} דקות.`, 'throttled');

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 500, system: SYSTEM, messages }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch { throw new HttpError(502, 'הבוט לא ענה. אפשר לנסות שוב.', 'bot_down'); }
  if (!r.ok) throw new HttpError(502, 'הבוט לא ענה. אפשר לנסות שוב.', 'bot_down');
  const data = await r.json().catch(() => null);
  const reply = data && Array.isArray(data.content) ? (data.content.find((c) => c.type === 'text') || {}).text : '';
  if (!reply) throw new HttpError(502, 'הבוט לא ענה. אפשר לנסות שוב.', 'bot_down');
  return { reply: reply.trim() };
});

module.exports = { cleanMessages, SYSTEM };
