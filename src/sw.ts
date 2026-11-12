/// <reference lib="webworker" />
/* Service worker Clair : hors ligne (précache Workbox) + rappels push. */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';
import { GENERIC_MESSAGES, REMINDER_TITLE } from './lib/messages';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] };

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
// navigation hors ligne : toutes les routes servent l'app (sauf l'API)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }));

interface PushPayload { title?: string; body?: string; url?: string; tag?: string }

self.addEventListener('push', event => {
  let data: PushPayload = {};
  try { data = event.data?.json() ?? {}; } catch { data = { body: event.data?.text() }; }
  const body = data.body || GENERIC_MESSAGES[0];
  event.waitUntil(
    self.registration.showNotification(data.title || REMINDER_TITLE, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'clair-daily',   // un seul rappel visible à la fois
      data: { url: data.url || '/?src=rappel' },
    }),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data?.url as string) || '/';
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = wins.find(w => new URL(w.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await existing.navigate(url).catch(() => {});
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
