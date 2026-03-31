// EG Custom Woodworking — Service Worker
// Strategy: network-first for the app HTML, cache-first for fonts/static assets.
// Bump CACHE_VERSION with every deploy to invalidate old caches immediately.

const CACHE_VERSION = 'egcw-v12';
const APP_SHELL = [
  '/GrasseWoodshop/woodworking-app.html',
];

// ── Install: pre-cache the app shell ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL))
  );
  // Take over immediately — don't wait for old SW to finish
  self.skipWaiting();
});

// ── Activate: delete all old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    )
  );
  // Claim all open tabs immediately
  self.clients.claim();
});

// ── Fetch: network-first for HTML, cache-first for everything else ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests and Google Fonts
  const isSameOrigin = url.origin === self.location.origin;
  const isFonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!isSameOrigin && !isFonts) return;

  // Network-first for the main HTML file
  if (url.pathname.endsWith('woodworking-app.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          // Cache the fresh response
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for fonts and other static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
