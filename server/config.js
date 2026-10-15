'use strict';
const path = require('node:path');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..');

// בהרצה מקומית בלי DATABASE_URL, הנתונים נשמרים בתיקייה. לא בתיקייה שמסונכרנת ל-OneDrive.
function defaultDataDir() {
  if (/onedrive/i.test(ROOT)) {
    const base = process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share');
    return path.join(base, 'zman-weekly-web-data');
  }
  return path.join(ROOT, 'data');
}

const PRODUCTION = process.env.NODE_ENV === 'production';
const ON_VERCEL = !!process.env.VERCEL;

module.exports = {
  ROOT,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  DATA_DIR: process.env.DATA_DIR || defaultDataDir(),
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || '127.0.0.1',
  PRODUCTION,
  ON_VERCEL,
  // ב-production חובה HTTPS. ב-Vercel תמיד מגיעים ב-HTTPS, והכותרת X-Forwarded-Proto מגיעה מהפלטפורמה.
  FORCE_HTTPS: process.env.FORCE_HTTPS ? process.env.FORCE_HTTPS === '1' : PRODUCTION,
  // כתובת הלקוח לפי X-Forwarded-For: בטוח רק כשהפלטפורמה (Vercel) או הפרוקסי שלנו מציבים אותה
  TRUST_PROXY: process.env.TRUST_PROXY === '1' || ON_VERCEL,
  // קוד הקמה: מנהלת התכנית מזינה אותו כדי ליצור את החשבון שלה (פעם אחת) ובשביל איפוס סיסמה שנשכחה.
  // מוגדר במשתני הסביבה של הפרויקט ב-Vercel, ולכן רק מי שמנהלת את הפרויקט מכירה אותו.
  SETUP_CODE: process.env.SETUP_CODE || '',

  // יום ראשון שבו מתחיל השבוע הראשון של המבט השבועי. אם לא הוגדר: השבוע הראשון שבו האפליקציה הופעלה.
  PROGRAM_START: process.env.PROGRAM_START || '',
  // בדיקות בלבד: מקבע את "היום" (YYYY-MM-DD)
  FAKE_TODAY: process.env.FAKE_TODAY || '',
  TIMEZONE: 'Asia/Jerusalem',

  // סף הצגה לנתונים מצטברים שמוצגים למובילה: פחות מ-5 => "פחות מ-5"
  K_MIN: 5,
  MAX_CONVS_PER_WEEK: 15,

  SESSION_IDLE_HOURS: 12,
  SESSION_MAX_DAYS: 7,
  REMEMBER_DAYS: 30,
  MIN_MANAGER_PASSWORD: 10,
  MAX_BODY_BYTES: 256 * 1024,
};
