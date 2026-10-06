/* global self, clients */

self.addEventListener('push', (event) => {
  let payload = {
    title: 'یادآوری',
    body: 'یک یادآوری جدید دارید',
    url: self.registration.scope,
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    /* keep defaults */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: 'pwa-192x192.png',
      badge: 'pwa-192x192.png',
      dir: 'rtl',
      lang: 'fa',
      tag: 'accounting-reminder',
      data: { url: payload.url || self.registration.scope },
    })
  );
});

/**
 * Push payloads come from outside the app, so a click may only open pages
 * inside this app's scope; anything else falls back to the app root.
 */
function resolveSafeTargetUrl(rawUrl) {
  const scope = self.registration.scope;
  if (!rawUrl) return scope;
  try {
    const target = new URL(String(rawUrl), scope);
    if (target.origin === self.location.origin && target.href.startsWith(scope)) {
      return target.href;
    }
  } catch {
    /* fall through to scope */
  }
  return scope;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = resolveSafeTargetUrl(event.notification.data?.url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
