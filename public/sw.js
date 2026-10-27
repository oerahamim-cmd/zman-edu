// זמן לחינוך: service worker מינימלי. הוא לא שומר שום דבר במטמון, כדי שתמיד תיטען הגרסה העדכנית.
// הוא קיים כדי שאפשר יהיה להוסיף את האפליקציה למסך הבית, ובהמשך לקבל תזכורות שבועיות.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
