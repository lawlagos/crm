const BASE = new URL('./', self.location.href).pathname;
const CACHE_PREFIX = 'central-crm-public-';
const CACHE = `${CACHE_PREFIX}v1`;
const FILES = ['offline.html', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'].map(file => BASE + file);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => { if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE) || url.search) return;
  if (FILES.includes(url.pathname)) { event.respondWith(caches.open(CACHE).then(async cache => await cache.match(event.request) || fetch(event.request))); return; }
  if (url.pathname.startsWith(`${BASE}assets/`) && /[.-][\w-]+\.(?:js|css|woff2?|svg|png)$/.test(url.pathname)) { event.respondWith(caches.open(CACHE).then(async cache => { const cached = await cache.match(event.request); if (cached) return cached; const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; })); return; }
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match(`${BASE}offline.html`)));
});
self.addEventListener('push', event => event.waitUntil(self.registration.showNotification('Central', { body: 'Há uma atualização para conferir no seu espaço.', icon: `${BASE}icon-192.png`, badge: `${BASE}icon-192.png`, tag: 'central-reminder' })));
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => { const client = clients.find(item => new URL(item.url).pathname.startsWith(BASE)); if (client) return client.focus(); return self.clients.openWindow(`${BASE}#/`); })); });

