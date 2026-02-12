// Perun Electromobility - Service Worker
const CACHE_NAME = 'eperun-v1';
const OFFLINE_URL = '/offline.html';

// Súbory na cachovanie pre offline režim
const STATIC_ASSETS = [
  '/',
  '/charging',
  '/history',
  '/profile',
  '/login',
  '/register',
  '/offline.html',
  '/manifest.json',
  '/images/perun-logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Inštalácia Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Perun Electromobility...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Okamžite aktivovať nový SW
  self.skipWaiting();
});

// Aktivácia Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  // Prevziať kontrolu nad všetkými klientmi
  self.clients.claim();
});

// Fetch stratégia - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Ignoruj non-GET requesty
  if (event.request.method !== 'GET') return;

  // Ignoruj API volania (okrem stations)
  if (event.request.url.includes('/api/') && !event.request.url.includes('/api/stations')) {
    return;
  }

  // Ignoruj externé URL
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachuj úspešnú odpoveď
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Skús cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Ak je to navigácia, vráť offline stránku
        if (event.request.mode === 'navigate') {
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
        }

        // Inak vráť generickú chybu
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});

// Push notifikácie
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'Perun Electromobility',
    body: 'Máte novú správu',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || 'default',
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Kliknutie na notifikáciu
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  let targetUrl = '/';

  if (action === 'view' && data.url) {
    targetUrl = data.url;
  } else if (data.sessionId) {
    targetUrl = `/charging?session=${data.sessionId}`;
  } else if (data.stationId) {
    targetUrl = `/?station=${data.stationId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Skús nájsť existujúce okno
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      // Ak nie je žiadne okno, otvor nové
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background sync pre offline akcie
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-charging-data') {
    event.waitUntil(syncChargingData());
  }

  if (event.tag === 'sync-history') {
    event.waitUntil(syncHistory());
  }
});

async function syncChargingData() {
  console.log('[SW] Syncing charging data...');
  // Implementácia synchronizácie offline dát
  try {
    // Získaj uložené dáta z IndexedDB
    // Odošli na server
    // Vymaž lokálne dáta po úspešnom syncu
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

async function syncHistory() {
  console.log('[SW] Syncing history...');
  // Implementácia synchronizácie histórie
}

// Periodic background sync (ak je podporovaný)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);

  if (event.tag === 'check-charging-status') {
    event.waitUntil(checkChargingStatus());
  }

  if (event.tag === 'update-stations') {
    event.waitUntil(updateStationsCache());
  }
});

async function checkChargingStatus() {
  console.log('[SW] Checking charging status...');
  // Kontrola aktívnych nabíjacích relácií
}

async function updateStationsCache() {
  console.log('[SW] Updating stations cache...');
  // Aktualizácia cache staníc
  try {
    const response = await fetch('/api/stations');
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/stations', response);
    }
  } catch (error) {
    console.error('[SW] Failed to update stations cache:', error);
  }
}
