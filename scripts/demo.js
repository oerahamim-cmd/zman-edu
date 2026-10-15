'use strict';
// הרצה להדגמה: שרת אמיתי על Postgres מובנה (בזיכרון) עם נתוני דוגמה (שמות בדויים). לא נוגע בנתונים האמיתיים.
process.env.PG_MEMORY = '1';
delete process.env.DATABASE_URL;
process.env.PORT = process.env.PORT || '3500';
process.env.SETUP_CODE = process.env.SETUP_CODE || 'demo-setup-code';

// הנתונים מתחילים חמישה שבועות אחורה (ביום ראשון), כדי שיהיו גרפים. מחושב לפני טעינת ההגדרות.
const pad = (n) => String(n).padStart(2, '0');
const d0 = new Date();
d0.setHours(12, 0, 0, 0);
d0.setDate(d0.getDate() - d0.getDay() - 35);
process.env.PROGRAM_START = `${d0.getFullYear()}-${pad(d0.getMonth() + 1)}-${pad(d0.getDate())}`;

const { start } = require('../server/app');
const { seedDemo, DEMO_MANAGER } = require('../server/seed');
const db = require('../server/db');

start().then(async ({ port }) => {
  await seedDemo();
  console.log(`הדגמה: http://127.0.0.1:${port}`);
  console.log(`מנהלת התכנית: ${DEMO_MANAGER.email} / ${DEMO_MANAGER.password}`);
  console.log('מחנכת לדוגמה: נעמי שמר, "נועה כהן", קוד 1185');
  console.log('מובילה לדוגמה: נעמי שמר, "נטע רוזן", קוד 1357');
  for (const s of await db.all('SELECT name, educator_code, lead_code FROM schools ORDER BY sort_order')) console.log(`${s.name}: מחנכות ${s.educator_code}, מובילה ${s.lead_code}`);
});
