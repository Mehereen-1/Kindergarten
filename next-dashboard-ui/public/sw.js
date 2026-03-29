// Kinder Vision – Service Worker for background push notifications
// This file must be served from the root path (public/sw.js → /sw.js)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// ── Push event ────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Kinder Vision', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Kinder Vision Reminder';
  const options = {
    body: data.body || 'You have a school event notification.',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: data.tag || 'kv-notification',
    data: { url: data.url || '/' },
    requireInteraction: true,   // stays until user dismisses — like a uni reminder
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      { action: 'view', title: 'View Event' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If app is already open, focus it
        for (const client of windowClients) {
          if ('focus' in client) return client.focus();
        }
        // Otherwise open a new tab
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
