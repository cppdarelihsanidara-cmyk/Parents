/* Service worker — Dar El-Ihsan Portal (Parents-main). */
'use strict';

var CACHE_PREFIX = 'de-parents-';
var CACHE = CACHE_PREFIX + 'prod-20261125-di2';
var APP_SCOPE = new URL(self.registration.scope);
var SHELL = [
  './', 'index.html', 'parent.html', 'navback.js', 'icons.js', 'icons.css',
  'portal.css', 'crystal-blue-glass.css', 'pastel-glass.css', 'parent-modern.css', 'pdf-writer.js',
  'pwa.css', 'pwa.js', 'cms-config.js', 'parent.js', 'de-core.js', 'username.js',
  'fr-names.js', 'qr-gen.js', 'logo.png', 'logo-sq.png', 'icon-192.png',
  'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
  'parent.webmanifest', 'manifest.webmanifest'
];

function resolveScopedUrl(rawUrl, fallbackFile) {
  var fallback = new URL(fallbackFile || 'parent.html', APP_SCOPE);
  if (!rawUrl) return fallback;
  try {
    var resolved = new URL(String(rawUrl), APP_SCOPE);
    if (resolved.origin !== self.location.origin || resolved.pathname.indexOf(APP_SCOPE.pathname) !== 0) {
      return fallback;
    }
    return resolved;
  } catch (e) {
    return fallback;
  }
}

function resolveAssetUrl(rawAsset, fallbackFile) {
  var fallback = new URL(fallbackFile, APP_SCOPE).href;
  if (!rawAsset) return fallback;
  try {
    var resolved = new URL(String(rawAsset), APP_SCOPE);
    if (resolved.origin !== self.location.origin) return fallback;
    return resolved.href;
  } catch (e) {
    return fallback;
  }
}

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
  var rawTarget = (event.notification.data && event.notification.data.url) || event.notification.url;
  var target = resolveScopedUrl(rawTarget, 'parent.html');

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
  var payload = {};
  try {
    if (event.data) {
      var parsed = event.data.json();
      if (parsed && typeof parsed === 'object') payload = parsed;
    }
  } catch (error) {
    try {
      if (event.data) payload = { body: event.data.text() };
    } catch (e2) {}
  }

  var title = String(payload.title || 'دار الإحسان').trim() || 'دار الإحسان';
  var body = String(payload.body || 'لديك إشعار جديد في فضاء الأولياء').trim() || 'لديك إشعار جديد في فضاء الأولياء';
  var rawUrl = (payload.data && payload.data.url) || payload.url || 'parent.html';
  var targetUrl = resolveScopedUrl(rawUrl, 'parent.html').href;

  var options = {
    body: body,
    icon: resolveAssetUrl(payload.icon, 'icon-192.png'),
    badge: resolveAssetUrl(payload.badge, 'logo-sq.png'),
    vibrate: [200, 100, 200, 100, 400],
    tag: String(payload.tag || ('de-push-' + Date.now())),
    renotify: true,
    requireInteraction: payload.requireInteraction !== false,
    data: Object.assign({}, payload.data && typeof payload.data === 'object' ? payload.data : {}, { url: targetUrl })
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil((async function () {
    try {
      var appServerKey = event.oldSubscription && event.oldSubscription.options
        ? event.oldSubscription.options.applicationServerKey
        : null;
      if (!appServerKey) return;
      var newSub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey
      });
      var clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (var i = 0; i < clients.length; i++) {
        clients[i].postMessage({ type: 'DE_PUSH_SUBSCRIPTION_CHANGED', subscription: newSub.toJSON() });
      }
    } catch (err) {
      console.warn('pushsubscriptionchange renewal deferred:', err);
    }
  })());
});
