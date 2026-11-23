/* Dar El Ihsan — Unified Light / Dark Glass Theme Switcher (Zero-FOUC, Cross-Page Sync) */
(function () {
  'use strict';
  var KEY = 'de_theme_mode_v1';

  function getStoredTheme() {
    try {
      var v = localStorage.getItem(KEY);
      if (v === 'dark' || v === 'light') return v;
    } catch (e) {}
    return 'light'; // الوضع النهاري هو الافتراضي النظيف
  }

  function applyTheme(mode) {
    var m = (mode === 'dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', m);
    document.documentElement.style.colorScheme = m;
    var btns = document.querySelectorAll('.de-theme-toggle-btn');
    for (var i = 0; i < btns.length; i++) {
      updateBtnVisual(btns[i], m);
    }
  }

  function updateBtnVisual(btn, mode) {
    var isDark = (mode === 'dark');
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    btn.setAttribute('title', isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي الزجاجي');
    btn.setAttribute('aria-label', isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي الزجاجي');
    // بناء DOM آمن بدون innerHTML (متوافق مع CSP)
    btn.textContent = '';
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    if (isDark) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z');
      svg.appendChild(p);
    } else {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', '12');
      c.setAttribute('cy', '12');
      c.setAttribute('r', '4');
      svg.appendChild(c);
      var rays = document.createElementNS(NS, 'path');
      rays.setAttribute('d', 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41');
      svg.appendChild(rays);
    }
    var lbl = document.createElement('span');
    lbl.className = 'de-theme-lbl';
    lbl.textContent = isDark ? 'ليلي' : 'نهاري';
    btn.appendChild(svg);
    btn.appendChild(lbl);
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = (cur === 'dark') ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch (e) {}
    applyTheme(next);
  }

  // تطبيق فوري قبل الرسم لمنع أي وميض (Zero FOUC)
  applyTheme(getStoredTheme());

  // مزامنة تلقائية بين صفحات ونوافذ الموقع
  window.addEventListener('storage', function (ev) {
    if (ev && ev.key === KEY && (ev.newValue === 'dark' || ev.newValue === 'light')) {
      applyTheme(ev.newValue);
    }
  });

  function mountToggleButton() {
    if (document.querySelector('.de-theme-toggle-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'de-theme-toggle-btn';
    btn.addEventListener('click', toggleTheme);
    updateBtnVisual(btn, getStoredTheme());

    // البحث عن أنسب موضع في الترويسة أو الشريط العلوي
    var target =
      document.querySelector('.topbar-actions') ||
      document.querySelector('.topbar') ||
      document.querySelector('.pm-top-actions') ||
      document.querySelector('.p-header') ||
      document.querySelector('header .nav-actions') ||
      document.querySelector('header nav') ||
      document.querySelector('header');

    if (target) {
      target.appendChild(btn);
    } else {
      btn.classList.add('is-floating');
      document.body.appendChild(btn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountToggleButton);
  } else {
    mountToggleButton();
  }

  window.DE_THEME = {
    get: getStoredTheme,
    set: function (m) {
      var val = (m === 'dark') ? 'dark' : 'light';
      try { localStorage.setItem(KEY, val); } catch (e) {}
      applyTheme(val);
    },
    toggle: toggleTheme
  };
})();
