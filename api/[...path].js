'use strict';
// הכניסה של Vercel: כל בקשה ל-/api/... מגיעה לכאן. הדפים עצמם (תיקיית public) מוגשים ישירות על ידי Vercel.
const { requestListener } = require('../server/http');
require('../server/routes');

module.exports = async (req, res) => {
  // Vercel שומרת על הכתובת המקורית ב-req.url. אם משום מה הכתובת הגיעה בלי הנתיב, משחזרים אותו מפרמטר הנתיב.
  try {
    const u = new URL(req.url, 'http://localhost');
    if (!u.pathname.startsWith('/api/') && req.query && req.query.path) {
      const p = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
      u.searchParams.delete('path');
      req.url = `/api/${p}${u.search}`;
    }
  } catch { /* ממשיכים עם הכתובת כמו שהיא */ }
  await requestListener(req, res);
};
