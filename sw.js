/* Service worker — Dar El-Ihsan Parents portal. */
'use strict';

var CACHE_PREFIX = 'de-parents-';
var CACHE = CACHE_PREFIX + 'prod-20261123-pushfix3';
var APP_SCOPE = new URL(self.registration.scope);
var SHELL = [
  './',
  'index.html',
  'parent.html',
  'navback.js',
  'icons.js',
  'icons.css',
  'portal.css',
  'crystal-blue-glass.css',
  'parent-modern.css',
  'pdf-writer.js',
  'pwa.css',
  'pwa.js',
  'cms-config.js',
  'parent.js',
  'de-core.js',
  'username.js',
  'fr-names.js',
  'qr-gen.js',
  'logo.png',
  'logo-sq.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'parent.webmanifest',
  'manifest.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(SHELL.map(function (file) {
        var url = new URL(file, APP_SCOPE).href;
        return cache.add(url).catch(function (error) {
          console.warn('PWA shell asset was not cached:', file, error);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE) return caches.delete(key);
        return false;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf(APP_SCOPE.pathname) !== 0) return;

  event.respondWith(
    fetch(request, { cache: 'no-store' }).then(function (response) {
      if (response && response.ok && response.type === 'basic') {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(request, copy).catch(function () {});
        }).catch(function () {});
      }
      return response;
    }).catch(function () {
      return caches.match(request, { ignoreSearch: true }).then(function (cached) {
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match(new URL('parent.html', APP_SCOPE).href)
            .then(function (parentPage) {
              return parentPage || caches.match(new URL('index.html', APP_SCOPE).href);
            })
            .then(function (fallback) { return fallback || Response.error(); });
        }
        return Response.error();
      });
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var rawTarget = event.notification.data && event.notification.data.url;
  var target;
  try {
    target = new URL(rawTarget || 'parent.html', APP_SCOPE);
    if (target.origin !== self.location.origin || target.pathname.indexOf(APP_SCOPE.pathname) !== 0) {
      target = new URL('parent.html', APP_SCOPE);
    }
  } catch (error) {
    target = new URL('parent.html', APP_SCOPE);
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        if (client.url.indexOf(APP_SCOPE.origin + APP_SCOPE.pathname) === 0 && 'focus' in client) {
          var navigation = client.url !== target.href && 'navigate' in client
            ? client.navigate(target.href)
            : Promise.resolve(client);
          return Promise.resolve(navigation).then(function (focusedClient) {
            return (focusedClient || client).focus();
          });
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target.href);
    })
  );
});

self.addEventListener('push', function (event) {
  var payload = { title: 'دار الإحسان', body: 'لديك إشعار جديد في فضاء الأولياء' };
  try {
    if (event.data) {
      var data = event.data.json();
      if (data && typeof data === 'object') payload = Object.assign(payload, data);
    }
  } catch (error) {
    if (event.data) payload.body = event.data.text();
  }

  var options = {
    body: String(payload.body || 'لديك إشعار جديد في فضاء الأولياء'),
    icon: new URL('logo-sq.png', APP_SCOPE).href,
    badge: new URL('logo-sq.png', APP_SCOPE).href,
    vibrate: [200, 100, 200, 100, 400],
    tag: String(payload.tag || ('de-push-' + Date.now())),
    renotify: true,
    requireInteraction: true,
    data: { url: payload.url || new URL('parent.html', APP_SCOPE).href }
  };
  var title = String(payload.title || 'دار الإحسان');
  event.waitUntil(self.registration.showNotification(title, options));
});
