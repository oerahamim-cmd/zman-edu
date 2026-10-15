'use strict';
// הכניסה של Vercel: כל בקשה ל-/api/... מגיעה לכאן דרך ה-rewrite ב-vercel.json. הדפים עצמם (תיקיית public) מוגשים ישירות על ידי Vercel.
// (סימון [...path] בשם הקובץ לא תפס נתיבים מרובי מקטעים כמו /api/auth/manager/setup, ולכן משתמשים ב-rewrite.)
const { requestListener } = require('../server/http');
require('../server/routes');

module.exports = async (req, res) => {
  // ה-rewrite מעביר את הנתיב המקורי בפרמטר path. אם הכתובת כבר מכילה את הנתיב המקורי, משאירים אותה.
  try {
    const u = new URL(req.url, 'http://localhost');
    const viaRewrite = u.pathname === '/api/handler' || !u.pathname.startsWith('/api/');
    const raw = req.query && req.query.path !== undefined ? req.query.path : u.searchParams.get('path');
    if (viaRewrite && raw) {
      const p = Array.isArray(raw) ? raw.join('/') : String(raw);
      u.searchParams.delete('path');
      req.url = `/api/${p}${u.search}`;
    }
  } catch { /* ממשיכים עם הכתובת כמו שהיא */ }
  await requestListener(req, res);
};
