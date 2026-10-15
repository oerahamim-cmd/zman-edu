'use strict';
// שרת מקומי (הרצה במחשב, הדגמה ובדיקות). בענן (Vercel) משתמשים ב-api/handler.js, ולא בקובץ הזה.
const http = require('node:http');
const config = require('./config');
const { requestListener } = require('./http');
require('./routes');
const db = require('./db');

async function start(port = config.PORT, host = config.HOST) {
  await db.ready();
  const server = http.createServer(requestListener);
  await new Promise((resolve) => server.listen(port, host, resolve));
  return {
    server,
    port: server.address().port,
    close: async () => { server.closeAllConnections?.(); await new Promise((r) => server.close(r)); await db.close(); },
  };
}

module.exports = { start };
