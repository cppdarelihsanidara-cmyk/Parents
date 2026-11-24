/* PWA registration and install prompt — Dar El-Ihsan Parents portal. */
(function () {
  'use strict';

  var BUILD = '20261124_pastel1';
  var CACHE_PREFIX = 'de-parents-';
  var secure = window.isSecureContext || location.protocol === 'https:' ||
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  function clearOwnedCaches() {
    if (!('caches' in window)) return Promise.resolve();
    return caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        return name.indexOf(CACHE_PREFIX) === 0 ? caches.delete(name) : false;
      }));
    });
  }

  /* Register once, as soon as this deferred script runs; do not wait for window.load. */
  if (secure && 'serviceWorker' in navigator) {
    try {
      if (localStorage.getItem('de_parents_pwa_ver') !== BUILD) {
        clearOwnedCaches();
        localStorage.setItem('de_parents_pwa_ver', BUILD);
      }
    } catch (e) {}

    var reloadedForController = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloadedForController) return;
      reloadedForController = true;
      window.location.reload();
    });

    var appBase = new URL('.', document.baseURI || location.href);
    var swUrl = new URL('sw.js?v=' + BUILD, appBase);
    window.DE_PWA_REGISTRATION = navigator.serviceWorker.register(swUrl.href, {
      scope: appBase.pathname,
      updateViaCache: 'none'
    }).then(function (reg) {
      return reg.update().catch(function () {}).then(function () { return reg; });
    }).catch(function (err) {
      window.DE_PWA_REGISTRATION_ERROR = err;
      console.warn('Dar El-Ihsan service worker registration failed:', err);
      throw err;
    });
    /* Avoid an unhandled rejection while keeping the promise available for diagnostics. */
    window.DE_PWA_REGISTRATION.catch(function () {});
  }

  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var installBtns = [].slice.call(document.querySelectorAll('[data-install]'));

  if (installBtns.length && !standalone) {
    var savedPrompt = null;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      savedPrompt = e;
    });
    window.addEventListener('appinstalled', function () {
      savedPrompt = null;
      installBtns.forEach(function (b) { b.hidden = true; });
    });
    installBtns.forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function () {
        if (!savedPrompt) return showInstallHint();
        savedPrompt.prompt();
        savedPrompt.userChoice.then(function () { savedPrompt = null; }).catch(function () { savedPrompt = null; });
      });
    });
  }

  function showInstallHint() {
    var old = document.querySelector('.pwa-bar.pwa-hint');
    if (old) old.remove();
    var box = document.createElement('div');
    box.className = 'pwa-bar pwa-hint';
    box.setAttribute('role', 'status');
    var msg = document.createElement('span');
    msg.className = 'pwa-msg';
    msg.textContent = 'إن لم تظهر نافذة التثبيت: من قائمة المتصفح (⋮ أو ⋯) اختر «تثبيت» أو «إنشاء اختصار»، وعلى Mac اختر من قائمة ملف «إضافة إلى الرصيف». ';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'pwa-x';
    close.textContent = '×';
    close.setAttribute('aria-label', 'إغلاق');
    close.addEventListener('click', function () { box.remove(); });
    box.appendChild(msg);
    box.appendChild(close);
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.remove(); }, 15000);
  }

  if (/qr\.html$/.test(location.pathname) || standalone || installBtns.length) return;

  var KEY = 'de-install-dismissed';
  try {
    var dismissedAt = +localStorage.getItem(KEY);
    if (dismissedAt && Date.now() - dismissedAt < 14 * 864e5) return;
  } catch (e) {}

  var french = (document.documentElement.lang || 'ar').slice(0, 2) === 'fr';
  var T = french
    ? { msg: 'Installez l’application sur votre téléphone', btn: 'Installer', close: 'Fermer', ios: 'Appuyez sur Partager puis « Sur l’écran d’accueil »' }
    : { msg: 'ثبّت التطبيق على هاتفك للوصول السريع', btn: 'تثبيت', close: 'إغلاق', ios: 'اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»' };
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var deferred = null;
  var bar = null;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }
  function hide(remember) {
    if (bar) { bar.remove(); bar = null; }
    if (remember) {
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
    }
  }
  function show(iosHint) {
    if (bar) return;
    bar = el('div', 'pwa-bar');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', T.msg);
    bar.appendChild(el('span', 'pwa-msg', iosHint ? T.ios : T.msg));
    if (!iosHint) {
      var button = el('button', 'pwa-btn', T.btn);
      button.type = 'button';
      button.addEventListener('click', function () {
        if (!deferred) return hide(true);
        deferred.prompt();
        deferred.userChoice.then(function () { deferred = null; hide(true); }).catch(function () { deferred = null; hide(true); });
      });
      bar.appendChild(button);
    }
    var close = el('button', 'pwa-x', '×');
    close.type = 'button';
    close.setAttribute('aria-label', T.close);
    close.addEventListener('click', function () { hide(true); });
    bar.appendChild(close);
    document.body.appendChild(bar);
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    show(false);
  });
  window.addEventListener('appinstalled', function () { deferred = null; hide(true); });
  if (isIOS) window.addEventListener('load', function () { setTimeout(function () { show(true); }, 2500); });
})();
