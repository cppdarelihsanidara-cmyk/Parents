/* Service worker — دار الإحسان.
   الاستراتيجية: الشبكة أولاً مع تجاوز الكاش القديم لتطبيق كافة التعديلات فوراً. */
'use strict';
var CACHE = 'de-shell-v20261102-v1';
var SHELL = ['./', 'index.html', 'site.html', 'go-login.js', 'navback.js', 'icons.js', 'icons.css', 'parent.html', 'manage.html', 'archive-download.html', 'qr.html', '404.html',
  'style.css', 'cms.css', 'portal.css', 'qr.css', 'manage-theme.css', 'parent-modern.css', 'pdf-writer.js', 'zip-builder.js', 'mobile-admin.css', 'manage.webmanifest', 'pwa.css', 'pwa.js',
  'script.js', 'i18n-data.js', 'cms.js', 'cms-config.js', 'news.json', 'parent.js', 'parent-guard.js', 'de-core.js', 'username.js', 'manage.js', 'xlsx-writer.js', 'card.js', 'centers.js', 'fr-names.js', 'qr-encoder.js', 'qr-gen.js', 'qr.js', '404.js',
  'logo.png', 'logo-sq.png', 'cover.jpg', 'hero-background.jpg', 'icon-192.png', 'manifest.webmanifest'];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      if (k !== CACHE) {
        console.log('Deleting old cache:', k);
        return caches.delete(k);
      }
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // استراتيجية الشبكة أولاً Network First لضمان تحميل أحدث تعديلات JS و CSS دائماً
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('manage.html').then(function (h) { return h || caches.match('index.html'); });
        return Response.error();
      });
    })
  );
});

/* أحداث الإشعارات الهاتفية */
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var targetUrl = (e.notification.data && e.notification.data.url) || './parent.html';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf('parent.html') !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('push', function (e) {
  var payload = { title: 'دار الإحسان', body: 'لديك إشعار جديد في فضاء الأولياء' };
  try {
    if (e.data) payload = Object.assign(payload, e.data.json());
  } catch (err) {
    if (e.data) payload.body = e.data.text();
  }
  var options = {
    body: payload.body,
    icon: 'logo-sq.png',
    badge: 'logo-sq.png',
    vibrate: [200, 100, 200, 100, 400],
    tag: payload.tag || ('de-push-' + Date.now()),
    renotify: true,
    requireInteraction: true,
    data: { url: payload.url || './parent.html' }
  };
  e.waitUntil(self.registration.showNotification(payload.title, options));
});
