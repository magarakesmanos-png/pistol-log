// Air Pistol Log offline support.
// Opens instantly from the saved copy, then quietly fetches any newer version for the next start.
const V = 'apl-v3';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin === location.origin){
    const key = e.request.mode === 'navigate' ? './index.html' : e.request;
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(key, {ignoreSearch: true});
      const fresh = fetch(e.request).then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => null);
      if (hit){ e.waitUntil(fresh); return hit; }
      return (await fresh) || new Response('Offline', {status: 503});
    }));
  } else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' || (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'))){
    // fonts and the pinned sign-in library never change, so keep them for offline use. Sync traffic is never cached.
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request); if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r;
    }));
  }
});
