const CACHE_NAME = 'konek-v1';
const STATIC_ASSETS = [
  '/',
  '/feeds',
  '/soapbox',
  '/bazaar',
  '/living',
  '/messages',
  '/manifest.json',
  '/feed.png',
  '/soapbox.png',
  '/bazaar.png',
  '/living.png',
  '/chat.png',
  '/like.png',
  '/love.png',
  '/haha.png',
  '/wow.png',
  '/sad.png',
  '/grabe.png',
  '/laban.png',
  '/notification.png',
  '/comment.png',
  '/share.png',
  '/photos.png',
  '/konek.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install — cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http')));
    }).catch(() => {})
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, Supabase API calls, and chrome-extension
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.protocol === 'chrome-extension:') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.match(/\.(png|jpg|svg|ico|js|css|woff2?)$/))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Offline fallback for navigation
          if (event.request.mode === 'navigate') {
            return caches.match('/feeds');
          }
        });
      })
  );
});
