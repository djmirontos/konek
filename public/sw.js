// Klasmeyt Service Worker - Push Notifications
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      conversationId: data.conversationId || null,
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' }
    ],
    requireInteraction: false,
    tag: data.tag || 'konek-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Klasmeyt', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  // Track dismissed notifications if needed
});

// Background sync for offline support
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    event.waitUntil(Promise.resolve());
  }
});
