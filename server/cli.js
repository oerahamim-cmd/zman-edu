'use strict';
// כלי עזר מקומיים: node server/cli.js <פקודה>
// כדי לעבוד מול בסיס הנתונים האמיתי בענן מגדירים DATABASE_URL (אותו ערך שמוגדר ב-Vercel).
const db = require('./db');

const commands = {
  async 'school-codes'() {
    for (const s of await db.all('SELECT name, educator_code, lead_code FROM schools ORDER BY sort_order')) {
      console.log(`${s.name}\n  קוד הצטרפות למחנכות: ${s.educator_code}\n  קוד הצטרפות למובילה: ${s.lead_code}`);
    }
  },
  async 'seed-demo'() {
    // נתוני דוגמה (שמות בדויים) לא נכנסים לבסיס נתונים אמיתי
    if (process.env.DATABASE_URL) throw new Error('seed-demo רץ רק על בסיס הנתונים המקומי (בלי DATABASE_URL).');
    console.log('נתוני דוגמה נוספו:', await require('./seed').seedDemo());
  },
};

const cmd = process.argv[2];
if (!commands[cmd]) {
  console.log(`פקודות: ${Object.keys(commands).join(', ')}`);
  process.exit(cmd ? 1 : 0);
}
commands[cmd]().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => db.close());
