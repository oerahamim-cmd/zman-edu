// זמן לחינוך: service worker מינימלי. הוא לא שומר שום דבר במטמון, כדי שתמיד תיטען הגרסה העדכנית.
// הוא קיים כדי שאפשר יהיה להוסיף את האפליקציה למסך הבית, ולקבל את התזכורת השבועית כהתראה בטלפון.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

// התזכורת השבועית: כותרת, משפט אחד, והכתובת של המבט לשבוע הזה
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* לא JSON */ }
  e.waitUntil(self.registration.showNotification(d.title || 'השיחות שלך השבוע', {
    body: d.body || 'כמה שיחות אישיות היו לך השבוע, ועל מה דיברתם? רגע לשתף, בכמה נגיעות.', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    dir: 'rtl', lang: 'he', tag: 'weekly', data: { url: d.url || '/' },
  }));
});
// נגיעה בהתראה פותחת ישר את השאלה הראשונה של המבט
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.startsWith(self.location.origin) && 'focus' in c) { c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
