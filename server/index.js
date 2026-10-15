'use strict';
const config = require('./config');
const { start } = require('./app');
const db = require('./db');

start().then(async ({ port }) => {
  console.log(`זמן לחינוך · מבט שבועי: http://${config.HOST}:${port}`);
  console.log(process.env.DATABASE_URL ? 'בסיס נתונים: Postgres (DATABASE_URL)' : `בסיס נתונים מקומי (PGlite): ${config.DATA_DIR}`);
  const manager = await db.get("SELECT 1 AS x FROM users WHERE role = 'manager'");
  if (!manager) console.log(config.SETUP_CODE ? 'עדיין אין מנהלת תכנית: היא נכנסת למסך "הקמה ראשונית" עם SETUP_CODE.' : 'עדיין אין מנהלת תכנית, ו-SETUP_CODE לא הוגדר.');
}).catch((err) => { console.error(err.message); process.exit(1); });
