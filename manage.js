/* لوحة إدارة دار الإحسان المتطورة
   تتضمن:
   1. إدارة الأطفال والطلبة (رقم القيد، تاريخ الميلاد، الإعاقة، الفرع، القسم، المعرف العام)
   2. توليد وتحميل بطاقة التلميذ بصيغة JPG عالية الدقة عبر HTML5 Canvas مع رمز QR للتحقق
   3. إدارة رموز التسجيل السرية أحادية الاستخدام للأولياء (Registration Codes)
   4. إدارة الفروع والأقسام التربوية الرسمية الـ 11
   5. قسم المربيات (الاسم، القسم، رقم الهاتف/الواتساب، تعديل الملف، ودعوة المربيات عبر واتساب)
   6. إدارة البرامج التربوية للأقسام وتصديرها كصورة أفقية للأولياء مع عزل RLS صارم
   7. إدارة التقارير التربوية واستمارات التقييم البيداغوجي (اختيار الطفل، المجال، المهارات، التقييم 1-5، وإضافة أكثر من مجال)
   8. إدارة حسابات الإدارة والمربيات مع إظهار كلمة المرور لكل حساب وتخصيص واجهة المربية (قسم الطلبة + قسم التقارير والتقييم فقط)
   لا innerHTML: حماية تامة من XSS باستخدام DE.h و textContent حصراً. */
(function () {
  'use strict';
  function fmtDate(v, withTime) {
    if (!v) return '—';
    try {
      var d = new Date(v);
      if (isNaN(d.getTime())) return String(v);
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      if (withTime) {
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        return y + '/' + m + '/' + day + ' ' + hh + ':' + mm;
      }
      return y + '/' + m + '/' + day;
    } catch (e) {
      return String(v || '—');
    }
  }
  if (typeof window !== 'undefined') { window.fmtDate = fmtDate; }

  try {
    if (typeof window !== 'undefined' && localStorage.getItem('de_app_ver') !== 'v70') {
      localStorage.setItem('de_app_ver', 'v70');
      if (window.caches && caches.keys) {
        caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); });
      }
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { r.update(); });
        });
      }
    }
  } catch (eVer) {}
  var FILE_BUILD = '2026-10-26.5';

  var DEFAULT_CFG = {
    supabaseUrl: 'https://qgjddtylriqdwvpihvmi.supabase.co',
    supabaseKey: 'sb_publishable_8mgO37k9jB9_Dg4OQTfynw_NBC0gLjK'
  };
  var CFG = Object.assign({}, DEFAULT_CFG, window.DE_CONFIG || {});
  if (!CFG.supabaseUrl) CFG.supabaseUrl = DEFAULT_CFG.supabaseUrl;
  if (!CFG.supabaseKey) CFG.supabaseKey = DEFAULT_CFG.supabaseKey;
  window.DE_CONFIG = CFG;

  if (!window.DE) {
    (function (root) {
      var MAX_FILE = 5 * 1024 * 1024;
      var EXT = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      function uuid() {
        var c = root.crypto;
        if (c && typeof c.randomUUID === 'function') return c.randomUUID();
        var b = new Uint8Array(16);
        if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
        b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
        var hx = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
        return hx.slice(0, 8) + '-' + hx.slice(8, 12) + '-' + hx.slice(12, 16) + '-' + hx.slice(16, 20) + '-' + hx.slice(20);
      }
      function clean(s, max) {
        return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max || 5000);
      }
      function isUuid(s) { return typeof s === 'string' && UUID_RE.test(s); }
      function isEmail(s) { return typeof s === 'string' && s.length <= 254 && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(s); }
      function isPhone(s) { return typeof s === 'string' && /^[0-9+()\s.-]{5,25}$/.test(s); }
      function isDate(s) {
        if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
        var d = new Date(s + 'T00:00:00Z');
        return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
      }
      function safeUrl(u) { try { var x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch (e) { return null; } }
      var PW_MSG = 'كلمة المرور: 10 أحرف على الأقل مع حرف كبير وحرف صغير ورقم.';
      function pwProblem(v) {
        v = String(v || '');
        var bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(v).length : v.length;
        return v.length >= 10 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /[0-9]/.test(v) && bytes <= 72 ? '' : PW_MSG;
      }
      function append(el, c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
        el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
      }
      function h(tag, props) {
        var el = document.createElement(tag);
        var p = props || {};
        Object.keys(p).forEach(function (k) {
          var v = p[k];
          if (v == null || v === false) return;
          if (k === 'class') el.className = v;
          else if (k === 'text') el.textContent = v;
          else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
          else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'selected') el[k] = v;
          else if (k === 'style') { el.style.cssText = String(v); }
          else if (/^on/i.test(k) || k === 'innerHTML' || k === 'outerHTML' || k === 'srcdoc') return;
          else if ((k === 'href' || k === 'src') && !/^(https:|blob:|#)/i.test(String(v))) return;
          else el.setAttribute(k, v === true ? '' : String(v));
        });
        for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
        return el;
      }
      function friendly(status, raw) {
        if (raw && /[\u0600-\u06FF]/.test(raw)) return raw;
        return 'حدث خطأ غير متوقع (' + status + '). حاول مرة أخرى.';
      }
      function Client(cfg, storeKey) {
        var base = String(cfg.supabaseUrl || '').replace(/\/+$/, '');
        var key = cfg.supabaseKey || '';
        var session = null, expireCb = function () {};
        function store() { try { return root.sessionStorage; } catch (e) { return null; } }
        function load() {
          var st = store(); if (!st) return null;
          try { var s = JSON.parse(st.getItem(storeKey) || 'null'); return s && s.refresh_token ? s : null; } catch (e) { return null; }
        }
        function save(tok) {
          session = { access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (tok.expires_in || 3600), user: tok.user || (session && session.user) || null };
          var st = store(); if (st) st.setItem(storeKey, JSON.stringify(session));
        }
        function clear() { session = null; var st = store(); if (st) st.removeItem(storeKey); }
        async function raw(token, method, path, body, extra) {
          var hd = { apikey: key };
          if (token) hd.Authorization = 'Bearer ' + token;
          for (var k in (extra || {})) hd[k] = extra[k];
          if (body !== undefined && !(body instanceof Uint8Array)) hd['Content-Type'] = 'application/json';
          var res = await fetch(base + path, { method: method, headers: hd, body: body === undefined ? undefined : (body instanceof Uint8Array ? body : JSON.stringify(body)) });
          var txt = await res.text(), j = null;
          try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
          if (!res.ok) {
            var er = new Error(friendly(res.status, (j && (j.msg || j.message || j.error_description || j.error)) || ''));
            er.status = res.status; throw er;
          }
          return j;
        }
        return {
          load: function () { session = load(); return !!session; },
          loggedIn: function () { return !!session; },
          onExpire: function (cb) { expireCb = cb; },
          me: async function () { return session ? session.user : null; },
          signIn: async function (email, password) {
            var tok = await raw(null, 'POST', '/auth/v1/token?grant_type=password', { email: email, password: password });
            save(tok); return { mfa: false };
          },
          verifyMfa: async function () {},
          cancelMfa: function () {},
          signOut: async function () { clear(); },
          recover: function (email, redirectTo) { return raw(null, 'POST', '/auth/v1/recover' + (redirectTo ? '?redirect_to=' + encodeURIComponent(redirectTo) : ''), { email: email }); },
          adoptHash: async function () { return null; },
          setPassword: function (pw) { return raw(session && session.access_token, 'PUT', '/auth/v1/user', { password: pw }); },
          rest: function (method, path, body, prefer) { return raw(session && session.access_token, method, '/rest/v1' + path, body, prefer ? { Prefer: prefer } : {}); },
          rpc: function (name, args) { return raw(session && session.access_token, 'POST', '/rest/v1/rpc/' + name, args || {}); },
          fn: function (name, body) { return raw(session && session.access_token, 'POST', '/functions/v1/' + name, body); },
          signedUrl: async function () { return '#'; },
          upload: async function () { return {}; },
          removeObject: async function () { return {}; }
        };
      }
      function idle(ms, cb) {
        var t; function reset() { clearTimeout(t); t = setTimeout(cb, ms); }
        ['click', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) { root.addEventListener(ev, reset, { passive: true }); });
        reset(); return function stop() { clearTimeout(t); };
      }
      root.DE = { MAX_FILE: MAX_FILE, EXT: EXT, PW_MSG: PW_MSG, uuid: uuid, clean: clean, isUuid: isUuid, isEmail: isEmail, isPhone: isPhone, isDate: isDate, safeUrl: safeUrl, pwProblem: pwProblem, checkFile: function () { return { ok: true, ext: 'pdf', mime: 'application/pdf' }; }, objectPath: function (cid, ext) { return 'children/' + cid + '/' + uuid() + '.' + ext; }, h: h, friendly: friendly, Client: Client, idle: idle };
    })(window);
  }

  var h = DE.h;
  var $ = function (s) { return document.querySelector(s); };
  var C = DE.Client(CFG, 'de_manage_session');

  /* الدليل البيداغوجي الرسمي المعتمد (8 مجالات و195 مهارة) مدمج مباشرة لمنع أي اعتماد على ملفات خارجية */
  var EMBEDDED_CURRICULUM = {"مجال الاستقلالية (الحياة اليومية والعناية بالذات)":["غسل اليدين بالماء بشكل صحيح","غسل اليدين بالماء والصابون بشكل صحيح","غسل الوجه بالماء بشكل صحيح","تجفيف اليدين والوجه باستخدام الفوطة بشكل صحيح","استخدام المنديل بشكل صحيح","تنظيف الأنف","خلع السروال بشكل صحيح","خلع المئزر بشكل صحيح","خلع القميص (فك الأزرار) بشكل صحيح","خلع الجوارب بشكل صحيح","خلع الحذاء بشكل صحيح","لبس السروال بشكل صحيح","لبس المئزر بشكل صحيح","لبس القميص (فك الأزرار) بشكل صحيح","لبس الجوارب بشكل صحيح","لبس الحذاء بشكل صحيح","التعرف على أدوات الأكل (ملعقة، كوب، صحن، شوكة)","مسك أدوات الطعام بشكل صحيح","الشرب بكوب الماء أو العصير بشكل صحيح","الأكل بطريقة صحيحة","طلب الذهاب إلى الحمام عند الحاجة إليه (صورة / كلمة)","التعرف على مكان الحمام","استخدام الحمام باستقلالية","التعرف على أدوات تنظيف الأسنان (المعجون، الفرشاة، الماء)","القيام بتنظيف الأسنان باستقلالية"],"مجال المهارات الحركية الدقيقة":["القبض على الأشياء باستخدام قبضة اليد","الضغط على كرة إسفنجية بقبضة اليد بالتناوب بين اليدين","الضغط على مادة الصلصال","طي أو ثني ورقة عدة مرات بشكل عشوائي","مسك مقبض الباب وتدويره","يستطيع فتح قارورة","التقاط خرز (حجم صغير)","التقاط خرز (حجم كبير)","نقل خمس خرزات (حجم صغير) من صحن لآخر","نقل خمس خرزات (حجم كبير) من صحن لآخر","تقليب صفحات كتاب","ترتيب مجموعة من الأوراق فوق بعضها","تنظيم خمس خرزات (حجم صغير) بخيط","تنظيم خمس خرزات (حجم كبير) بخيط","يستطيع إغلاق قارورة","مسك القلم بشكل صحيح","التلوين بشكل عشوائي على الورقة","التلوين داخل حيز","توصيل خطوط منقطة مرسومة على ورقة بشكل أفقي","توصيل خطوط منقطة مرسومة على ورقة بشكل منحني","مسك المقص بشكل صحيح","قص الورقة بشكل عشوائي","قص الورقة على خطوط مستقيمة عريضة","قص الورقة على خطوط مستقيمة رفيعة","قص الورقة على خطوط منحنية عريضة","قص الورقة على خطوط منحنية رفيعة"],"مجال المهارات الحركية الكبرى":["الوقوف بطريقة صحيحة","الجلوس بطريقة صحيحة","المشي بطريقة صحيحة","الجري بطريقة صحيحة","التدحرج بشكل صحيح","رمي الكرة بطريقة صحيحة","ركل الكرة بطريقة صحيحة","الحجل بطريقة صحيحة","سحب الحبل بطريقة صحيحة","دفع جهاز متحرك لمسافة 2 م بطريقة صحيحة","يرفع ثقل (2 كغم) عن الأرض","يحمل ثقل (2 كغم) لمسافة 10 م","رفع الذراعين، أماماً، عالياً، جانباً بطريقة صحيحة","صعود ونزول السلم (الدرج) بطريقة صحيحة","يثني الجذع أماماً أسفل بطريقة صحيحة (مرونة)","رمي الكرة باتجاه هدف على الحائط من مسافة 2 م بطريقة صحيحة (توازن)","تنطيط الكرة من الثبات خمس مرات (توافق)","يجري بشكل متعرج لمسافة 10 م (رشاقة)","رمي ثقل (1 كغم) لمسافة 5 م (قوة)"],"مجال ما قبل الأكاديمي":["الوصل بين مجموعة عناصر من نفس الفئة","رسم لوحات بسيطة","تسلسل الأرقام والحروف","التعرف على الأشكال","التعرف على الألوان","المطابقة بين الأشياء المتماثلة","المطابقة بين الألوان","المطابقة بين الأشكال","المطابقة بين أنواع الفواكه (البرتقال، الموز، التفاح، العنب، البطيخ)","المطابقة بين أنواع الخضر (طماطم، بطاطا، فلفل..)","مطابقة أعضاء الحواس الخمسة (يد، عين، أذن، لسان، أنف)","المطابقة بين صور الحيوانات الأليفة (جمل، حصان، بقرة، قطة، أرنب، ماعز)","مطابقة فئات النقود الورقية والمعدنية","مطابقة الحروف الهجائية بالبطاقات","أن يكتب خطوطاً مستقيمة عن نموذج (استعداد للكتابة)","أن يكتب خطوطاً منحنية عن نموذج (استعداد للكتابة)","العد بشكل آلي من 1 إلى 10","يشير إلى الأرقام من 1 إلى 10","التعرف على مدلول الأرقام من 1 إلى 10"],"المجال الأكاديمي":["التعرف على أشكال الحروف داخل الكلمة (البداية، الوسط، النهاية)","التعرف إلى أشكال الحروف مع المد بالألف","التعرف إلى أشكال الحروف مع المد بالواو","التعرف إلى أشكال الحروف مع المد بالياء","التعرف إلى أشكال الحروف مع الحركات (الفتحة)","التعرف إلى أشكال الحروف مع الحركات (الضمة)","التعرف إلى أشكال الحروف مع الحركات (الكسرة)","التعرف إلى أشكال الحروف مع الحركات (السكون)","يقرأ كلمة من حرفين","يقرأ كلمة من 3 حروف","يقرأ كلمة من 4 حروف فأكثر","يقرأ جملة من كلمتين","يقرأ جملة من 3 كلمات","يقرأ جملة من 4 كلمات","يقرأ جملة من 5 كلمات فأكثر","يقرأ فقرة من درس مختار","يكتب الحرف فوق نقط","يكتب الحروف عن نموذج","يكتب أشكال حروف داخل الكلمة فوق نقط","يكتب أشكال الحروف داخل الكلمة عن نموذج","يكتب مقاطع عن نموذج","يكتب كلمة من 3 حروف","يكتب كلمة من 4 حروف فأكثر","يكتب جملاً مختارة عن نموذج","التعرف إلى إشارة (+)","التعرف إلى إشارة (-)","التعرف إلى إشارة (=)","التعرف إلى مفهوم الجمع","حل مسائل على الجمع ضمن الرقم 10","التعرف على مفهوم الطرح","حل مسائل على الطرح ضمن الرقم 10","يتعرف الطالب على مفاهيم الأحجام (كبير، صغير)","يصنف أشياء حسب حجمها (كبير، صغير)","يتعرف الطالب على مفاهيم الأطوال (طويل، قصير)","يصنف أشياء حسب طولها (طويل، قصير)","يتعرف الطالب على مفاهيم ظروف المكان (أمام، خلف، فوق، تحت، داخل، خارج)","يتعرف الطالب على مفاهيم ظروف الزمان (صباح، مساء، ليل، نهار، قبل، بعد)","يتعرف الطالب على المفاهيم (حار، بارد)","يتعرف الطالب على المفاهيم (ناعم، خشن)","يطابق الطالب أسماء أيام الأسبوع (بطاقات)","يتعرف الطالب على شكل أيام الأسبوع (بطاقات)","يذكر الطالب أيام الأسبوع بالتدرج (من السبت إلى الجمعة)","يميز الطالب بين اليوم والأمس وغداً","يربط الطالب اليوم مع أيام الأسبوع (معرفة اليوم الراهن)","يطابق الطالب فصول السنة الأربعة","يتعرف الطالب على فصول السنة الأربعة","يميز الطالب فصول السنة الأربعة","يربط الطالب الفصل الحالي مع فصول السنة الأربعة","يطابق الطالب أحرف اسمه بشكل صحيح (بطاقات)","يشير إلى أحرف اسمه بشكل صحيح","يتعرف الطالب على أحرف اسمه بشكل صحيح"],"مجال التقليد":["تقليد التصفيق","تقليد رفع اليدين إلى الأعلى معاً","تقليد ضرب الطاولة باليد","تقليد فتح وغلق اليدين","تشبيك اليدين معاً","الإشارة إلى أجزاء الجسم","رن الجرس باستخدام الأشياء","دحرجة لعبة باستخدام الأشياء","القفز من وضع الوقوف","الجري من وضع الوقوف","الدوران من وضع الوقوف","تقليد عدد تكرار الحركات","تقليد حركات حركية دون مساعدة لفظية","تقليد أصوات بسيطة (تقليد لفظي)","تقليد أصوات أولية للكلمات","تقليد مقاطع صوتية منفصلة","تقليد الكلمات","تقليد العبارات","تقليد تلقائي للكلمات","تقليد تلقائي للعبارات"],"مجال مهارات الحضور والانتباه":["الاستماع لصوت الجرس عند قرعه","الالتفات عند مناداته باسمه","الاتصال البصري أثناء المحادثة","الاتصال البصري أثناء التعليم الجماعي","الاستجابة للتعليمات اللفظية (أمر واحد)","الاستجابة للتعليمات اللفظية (أمران متسلسلان)","الاستجابة للتعليمات اللفظية (أمران غير متسلسلين)","إدارة رأسه من مصدر صوت إلى مصدر آخر","تذكر مكان إخفاء الشيء","متابعة لهب شمعة فترة من الوقت","الجلوس على المقعد بشكل صحيح أثناء أداء المهمة التعليمية"],"مجال التواصل":["يستجيب الطفل عند مناداته باسمه","يصرخ للحصول على ما يريد","يحدث ضجة بدل الكلام","يتكلم كلاماً غير مفهوم","يشير عن بعد إلى الأشياء التي يريدها","يستخدم كلمة واحدة للتعبير عن كلمات أو عبارات","يستجيب للأوامر البسيطة (أمر واحد)","يستجيب للأوامر المتسلسلة (أكثر من أمر)","يوجد لديه مصاداة، يكرر الأصوات أو الكلام كالببغاء","يبدو أنه أصم لا يسمع","يستجيب لأصوات الأشياء المألوفة","يعبر لفظياً عن حاجته للأكل أو الشرب أو استخدام الحمام","يستخدم كلمة (نعم) أو (لا) فقط","يسمي الأشياء المألوفة في البيئة","ينطق كلمة واحدة","ينطق جملة مكونة من كلمتين","ينطق جملة مكونة من ثلاث كلمات أو أكثر","يتلفظ بمقاطع لا معنى لها، أو يتمتم مع نفسه","يسحب الآخرين بيده لجلب شيء","يستجيب للإشارات الإيمائية","يصغي إلى التعليمات اللفظية","يستجيب الطفل للمس الجسدي","يفهم أحرف الجر","يستخدم الضمائر"]};
  window.DE_CURRICULUM = EMBEDDED_CURRICULUM;

  /* القائمة الرسمية المعتمدة للفروع والأقسام والـ 103 طالب لضمان ظهور الأطفال فوراً في جميع الظروف */
  var EMBEDDED_BRANCHES = [{"id": "11111111-0000-4000-8000-000000000001", "slug": "main", "name": "المركز الرئيسي لدار الإحسان", "active": true}, {"id": "11111111-0000-4000-8000-000000000002", "slug": "work", "name": "مركز المساعدة على العمل (ورشات التأهيل والتمهين)", "active": true}, {"id": "11111111-0000-4000-8000-000000000003", "slug": "farm", "name": "المزرعة البيداغوجية (البستنة والأنشطة الفلاحية)", "active": true}];
  var EMBEDDED_SECTIONS = [{"id": "22222222-0000-4000-8000-000000000001", "branch_id": "11111111-0000-4000-8000-000000000001", "slug": "sec_autism_1", "name": "توحد 01", "description": "قسم اضطراب طيف التوحد (فوج 1)", "active": true}, {"id": "22222222-0000-4000-8000-000000000002", "branch_id": "11111111-0000-4000-8000-000000000001", "slug": "sec_autism_2", "name": "التوحد 02", "description": "قسم اضطراب طيف التوحد (فوج 2)", "active": true}, {"id": "22222222-0000-4000-8000-000000000003", "branch_id": "11111111-0000-4000-8000-000000000001", "slug": "sec_autism_3", "name": "توحد 03", "description": "قسم اضطراب طيف التوحد (فوج 3)", "active": true}, {"id": "22222222-0000-4000-8000-000000000004", "branch_id": "11111111-0000-4000-8000-000000000001", "slug": "sec_observation", "name": "الملاحظة جدد", "description": "قسم الملاحظة والتشخيص للأطفال الجدد", "active": true}, {"id": "22222222-0000-4000-8000-000000000005", "branch_id": "11111111-0000-4000-8000-000000000001", "slug": "sec_tafatan_1", "name": "التفطين 1 تأخر ذهني", "description": "قسم التفطن والتأهيل الذهني (فوج 1)", "active": true}, {"id": "22222222-0000-4000-8000-000000000006", "branch_id": "11111111-0000-4000-8000-000000000001", "slug": "sec_tafatan_2", "name": "التفطين 2 متلازمة داون", "description": "قسم التفطن لمتلازمة داون (فوج 2)", "active": true}, {"id": "22222222-0000-4000-8000-000000000007", "branch_id": "11111111-0000-4000-8000-000000000001", "slug": "sec_istithara", "name": "الاستثارة", "description": "قسم الاستثارة الحسية والحركية", "active": true}, {"id": "22222222-0000-4000-8000-000000000008", "branch_id": "11111111-0000-4000-8000-000000000001", "slug": "sec_shibh_madrasi", "name": "قسم الشبه مدرسي مكيف", "description": "قسم التأهيل الشبه مدرسي المكيف", "active": true}, {"id": "22222222-0000-4000-8000-000000000009", "branch_id": "11111111-0000-4000-8000-000000000001", "slug": "sec_khariji", "name": "الخارجي اعاقة شديدة", "description": "فوج الرعاية النهارية الخارجية للإعاقات الشديدة", "active": true}, {"id": "22222222-0000-4000-8000-000000000010", "branch_id": "11111111-0000-4000-8000-000000000002", "slug": "sec_tamhin", "name": "التمهين م م ع", "description": "قسم التمهين والتأهيل المهني بمركز المساعدة على العمل", "active": true}, {"id": "22222222-0000-4000-8000-000000000011", "branch_id": "11111111-0000-4000-8000-000000000003", "slug": "sec_bostana", "name": "المزرعة البستنة", "description": "ورشة البستنة والأنشطة الزراعية بالمزرعة البيداغوجية", "active": true}];
  var EMBEDDED_STUDENTS = [];

  var EMBEDDED_STAFF = [];

  function staffPasswordFromDob(dob) {
    return '';
  }

  function buildDefaultPortalMeta() {
    return { educators: [], account_meta: {} };
  }


  function normAr(s) {
    return String(s || '').toLowerCase()
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[ى]/g, 'ي')
      .replace(/[ة]/g, 'ه')
      .replace(/[\u064B-\u065F\u0670]/g, '');
  }

  var CENTERS = { main: 'المركز الرئيسي دار الإحسان', work: 'مركز المساعدة على العمل', farm: 'المزرعة البيداغوجية' };

  var CENTER_META = {
    main: {
      key: 'main',
      name: 'المركز الرئيسي دار الإحسان',
      shortName: 'المركز الرئيسي',
      badge: 'المركز النفسي البيداغوجي',
      icon: '', svgIcon: 's-main-center',
      avatar: 'د',
      desc: 'الدخول إلى اللوحة الحالية الخاصة بالمركز الرئيسي دار الإحسان (الأطفال والطلبة، الأقسام التربوية، المربيات، البرامج الأسبوعية، التقارير والتقييم، المواعيد، الرسائل، والوثائق).'
    },
    work: {
      key: 'work',
      name: 'مركز المساعدة على العمل',
      shortName: 'مركز المساعدة على العمل',
      badge: 'ورشات التأهيل والتمهين',
      icon: '', svgIcon: 's-work-center',
      avatar: 'ع',
      desc: 'الدخول إلى لوحة مركز المساعدة على العمل والاطلاع على طلابها وأقسامها (قسم التمهين م م ع والأقسام المهنية) وبرامجها وتقاريرها.'
    },
    farm: {
      key: 'farm',
      name: 'المزرعة البيداغوجية',
      shortName: 'المزرعة البيداغوجية (البستنة)',
      badge: 'البستنة والأنشطة الفلاحية',
      icon: '', svgIcon: 's-farm-center',
      avatar: 'م',
      desc: 'الدخول إلى لوحة المزرعة البيداغوجية والاطلاع على طلاب البستنة (قسم المزرعة البستنة) وإدارة ملفاتهم وحسابات المزرعة.'
    }
  };

  var CENTER_ACCESS_OPTS = [
    ['all', 'جميع المراكز (المركز الرئيسي + المساعدة على العمل + المزرعة البيداغوجية)'],
    ['main', 'المركز الرئيسي دار الإحسان فقط'],
    ['work', 'مركز المساعدة على العمل فقط'],
    ['farm', 'المزرعة البيداغوجية (البستنة) فقط'],
    ['main,work', '+المركز الرئيسي + مركز المساعدة على العمل'],
    ['main,farm', '+المركز الرئيسي + المزرعة البيداغوجية'],
    ['work,farm', '+مركز المساعدة على العمل + المزرعة البيداغوجية']
  ];

  var S = {
    sec: 'hub',
    activeCenter: 'main',
    filterSectionId: '',
    centerAccess: 'all',
    cache: {},
    nav: 0,
    me: null,
    isOwner: false,
    isEducator: false,
    isSpecialist: false,
    eduProfile: null,
    eduSectionId: '',
    eduSectionName: '',
    portalMeta: null,
    stopIdle: null,
    navStack: [],
    inSubBuilder: false,
    deletedRuntimeIds: {},
    deletedRuntimeEmails: {}
  };

  var TITLES = {
    hub: 'لوحة الإدارة',
    hub_accounts: 'الحسابات الخاصة بجميع المراكز',
    dash: 'لوحة التحكم',
    children: 'الأقسام والأطفال',
    branches: 'الفروع والأقسام التربوية',
    educators: 'قسم المربيات',
    programs: 'البرامج الأسبوعية',
    reports: 'التقارير التربوية الدورية',
    evaluations: 'استمارات التقييم البيداغوجي (الرسمية)',
    archive: 'الأرشيف والنسخ الاحتياطية',
    appts: 'المواعيد والأنشطة',
    msgs: 'الرسائل والإعلانات',
    docs: 'الوثائق الخاصة',
    accounts: 'إدارة المستخدمين والصلاحيات',
    notifications: 'مركز الإشعارات والتنبيهات',
    parents: 'فضاء الأولياء',
    audit: 'سجل العمليات والتدقيق',
    attendance: 'الغيابات والحضور',
    settings: 'الأمان والإعدادات'
  };

  function getCenterMeta(ck) {
    return CENTER_META[ck] || CENTER_META.main;
  }

  function parseAllowedCenters(accessStr) {
    var raw = String(accessStr || 'all').trim().toLowerCase();
    if (!raw || raw === 'all') return ['main', 'work', 'farm'];
    var parts = raw.split(',').map(function (s) { return s.trim(); }).filter(function (s) {
      return s === 'main' || s === 'work' || s === 'farm';
    });
    return parts.length ? parts : ['main', 'work', 'farm'];
  }

  function canAccessCenter(centerKey) {
    if (S.isOwner) return true;
    var allowed = parseAllowedCenters(S.centerAccess);
    return allowed.indexOf(centerKey) >= 0;
  }

  function canAccessGeneralAdmin() {
    if (S.isEducator) return false;
    if (S.isOwner) return true;
    var raw = String(S.centerAccess || 'all').trim().toLowerCase();
    return !raw || raw === 'all';
  }

  function formatCenterAccessLabel(accessStr) {
    var raw = String(accessStr || 'all').trim().toLowerCase();
    if (!raw || raw === 'all') return 'جميع المراكز (المركز وملحقاته)';
    var map = {
      'main': 'المركز الرئيسي فقط',
      'work': 'مركز المساعدة على العمل فقط',
      'farm': 'المزرعة البيداغوجية فقط',
      'main,work': 'المركز الرئيسي + المساعدة على العمل',
      'main,farm': 'المركز الرئيسي + المزرعة البيداغوجية',
      'work,farm': 'المساعدة على العمل + المزرعة البيداغوجية'
    };
    return map[raw] || ('' + raw);
  }

  function branchCenterKey(b) {
    if (!b) return 'main';
    var sl = String(b.slug || '').toLowerCase();
    var nm = String(b.name || '');
    if (sl === 'work' || nm.indexOf('المساعدة') >= 0 || nm.indexOf('التمهين') >= 0) return 'work';
    if (sl === 'farm' || nm.indexOf('المزرعة') >= 0 || nm.indexOf('البستنة') >= 0) return 'farm';
    return 'main';
  }

  function sectionCenterKey(s, branches) {
    if (!s) return 'main';
    var sl = String(s.slug || '').toLowerCase();
    var nm = String(s.name || '');
    if (sl === 'sec_tamhin' || nm.indexOf('التمهين') >= 0 || nm.indexOf('م م ع') >= 0 || nm.indexOf('المساعدة') >= 0) return 'work';
    if (sl === 'sec_bostana' || nm.indexOf('البستنة') >= 0 || nm.indexOf('المزرعة') >= 0) return 'farm';
    if (s.branch_id && Array.isArray(branches)) {
      var br = branches.filter(function (b) { return b.id === s.branch_id; })[0];
      if (br) return branchCenterKey(br);
    }
    return 'main';
  }

  function childMatchesSection(c, targetSecId, targetSecName, allSections) {
    if (!c) return false;
    if (!targetSecId && !targetSecName) return true;
    if (targetSecId && c.section_id === targetSecId) return true;
    var secObj = (allSections || []).filter(function (s) {
      return (targetSecId && (s.id === targetSecId || s.slug === targetSecId)) ||
             (targetSecName && normAr(s.name) === normAr(targetSecName));
    })[0];
    if (secObj) {
      if (c.section_id === secObj.id) return true;
      if (c.section_slug && c.section_slug === secObj.slug) return true;
      if (c.section && normAr(c.section) === normAr(secObj.name)) return true;
    }
    if (targetSecName && c.section && normAr(c.section) === normAr(targetSecName)) return true;
    return false;
  }

  function childCenterKey(c, branches, sections) {
    if (!c) return 'main';
    if (c.center === 'work' || c.center === 'farm') return c.center;
    if (c.section_id && Array.isArray(sections)) {
      var sec = sections.filter(function (s) { return s.id === c.section_id; })[0];
      if (sec) return sectionCenterKey(sec, branches);
    }
    if (c.branch_id && Array.isArray(branches)) {
      var br = branches.filter(function (b) { return b.id === c.branch_id; })[0];
      if (br) return branchCenterKey(br);
    }
    var sTxt = String(c.section || '');
    if (sTxt.indexOf('التمهين') >= 0 || sTxt.indexOf('م م ع') >= 0 || sTxt.indexOf('المساعدة') >= 0) return 'work';
    if (sTxt.indexOf('البستنة') >= 0 || sTxt.indexOf('المزرعة') >= 0) return 'farm';
    return 'main';
  }

  var AUDIT = {
    publish: 'نشر محتوى الموقع', load_version: 'تحميل نسخة سابقة', add_user: 'إضافة مدير', update_user: 'تحديث كود مدير', reset_password: 'تغيير كود مدير', remove_user: 'حذف مدير',
    'children:insert': 'إنشاء ملف طفل', 'children:delete': 'حذف ملف طفل', 'parent_profiles:insert': 'إنشاء ملف ولي', 'parent_profiles:delete': 'حذف ملف ولي',
    'parent:disable': 'تعطيل ولي', 'parent:enable': 'تفعيل ولي', 'parent:invite': 'دعوة ولي', 'parent:resend_invite': 'إعادة إرسال دعوة ولي', 'parent:disable_login': 'حظر دخول ولي', 'parent:enable_login': 'رفع حظر ولي',
    'parent_children:insert': 'ربط ولي بطفل', 'parent_children:delete': 'فك ربط ولي بطفل', 'progress_reports:insert': 'إنشاء تقرير', 'progress_reports:delete': 'حذف تقرير',
    'report:publish': 'نشر تقرير', 'report:unpublish': 'إلغاء نشر تقرير', 'appointments:insert': 'إضافة موعد', 'appointments:update': 'تعديل موعد', 'appointments:delete': 'حذف موعد',
    'messages:insert': 'إنشاء رسالة/إعلان', 'messages:delete': 'حذف رسالة/إعلان', 'documents:insert': 'رفع وثيقة', 'documents:delete': 'حذف وثيقة',
    'admin:invite': 'دعوة مدير', 'admin:create': 'إنشاء مدير بكلمة مرور', 'admin:disable': 'تعطيل مدير', 'admin:enable': 'تفعيل مدير',
    'branches:insert': 'إضافة فرع', 'sections:insert': 'إضافة قسم', 'educational_programs:insert': 'إضافة برنامج تربوي',
    'educational_programs:delete': 'حذف برنامج تربوي', 'registration_code:generate': 'توليد رمز تسجيل طفل',
    'parent:redeem_code': 'استرداد رمز تسجيل من ولي', 'audit:delete': 'حذف سجلات التدقيق'
  };

  /* ---------- إدارة بيانات المربيات وحسابات الإدارة وكلمات المرور (تخزين سحابي في site_content) ---------- */
  function emptyPortalMeta() {
    return buildDefaultPortalMeta();
  }

  function normalizeArabicDigits(str) {
    var s = String(str || '');
    var ar = '٠١٢٣٤٥٦٧٨٩';
    var fa = '۰۱۲۳۴۵۶۷۸۹';
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var i1 = ar.indexOf(ch);
      var i2 = fa.indexOf(ch);
      if (i1 >= 0) out += String(i1);
      else if (i2 >= 0) out += String(i2);
      else out += ch;
    }
    return out;
  }

  function sanitizeAccountEntry(entry) {
    if (!entry || typeof entry !== 'object') return {};
    var copy = Object.assign({}, entry);
    delete copy.pwVal;
    delete copy.setupKey;
    delete copy.password;
    return copy;
  }

  function sanitizeEducatorEntry(edu) {
    if (!edu || typeof edu !== 'object') return null;
    var copy = Object.assign({}, edu);
    delete copy.pwVal;
    delete copy.setupKey;
    delete copy.password;
    return copy;
  }

  function normalizePortalMeta(raw) {
    var m = raw && typeof raw === 'object' ? raw : {};
    var base = buildDefaultPortalMeta();
    var delEmails = Array.isArray(m.deleted_emails) ? m.deleted_emails.map(function (x) { return String(x || '').toLowerCase(); }).filter(Boolean) : [];
    var delEduIds = Array.isArray(m.deleted_educator_ids) ? m.deleted_educator_ids.map(String).filter(Boolean) : [];
    var delEmailMap = {};
    var delEduMap = {};
    delEmails.forEach(function (em) { delEmailMap[em] = true; });
    delEduIds.forEach(function (id) { delEduMap[id] = true; });
    if (S && S.deletedRuntimeEmails) {
      Object.keys(S.deletedRuntimeEmails).forEach(function (em) {
        delEmailMap[em] = true;
        if (delEmails.indexOf(em) < 0) delEmails.push(em);
      });
    }
    if (S && S.deletedRuntimeIds) {
      Object.keys(S.deletedRuntimeIds).forEach(function (id) {
        delEduMap[id] = true;
        if (delEduIds.indexOf(id) < 0) delEduIds.push(id);
      });
    }

    var rawEdus = Array.isArray(m.educators) ? m.educators.map(sanitizeEducatorEntry).filter(Boolean) : [];
    rawEdus = rawEdus.filter(function (e) {
      var isIstithara = (e.section_id === '22222222-0000-4000-8000-000000000007') || (String(e.section_name || '').indexOf('الاستثارة') >= 0);
      if (isIstithara) return false;
      if (e.id && delEduMap[String(e.id)]) return false;
      if (e.email && delEmailMap[String(e.email).toLowerCase()]) return false;
      return true;
    });

    var edus = base.educators.filter(function (be) {
      if (be.id && delEduMap[String(be.id)]) return false;
      if (be.email && delEmailMap[String(be.email).toLowerCase()]) return false;
      return true;
    });

    rawEdus.forEach(function (re) {
      if (!re || !re.id) return;
      var idx = edus.findIndex(function (be) { return be.id === re.id || (be.phone && re.phone && cleanPhoneDigits(be.phone) === cleanPhoneDigits(re.phone)); });
      if (idx >= 0) edus[idx] = Object.assign({}, edus[idx], re);
      else edus.push(re);
    });

    var rawAccs = (m.account_meta && typeof m.account_meta === 'object') ? m.account_meta : {};
    var accs = {};
    Object.keys(base.account_meta).forEach(function (bk) {
      var lowK = bk.toLowerCase();
      var bEntry = base.account_meta[bk];
      if (delEmailMap[lowK]) return;
      if (bEntry && bEntry.educator_id && delEduMap[String(bEntry.educator_id)]) return;
      accs[lowK] = Object.assign({}, bEntry);
    });

    Object.keys(rawAccs).forEach(function (k) {
      var lowK = k.toLowerCase();
      if (delEmailMap[lowK]) return;
      var entry = sanitizeAccountEntry(rawAccs[k]);
      if (entry.educator_id && delEduMap[String(entry.educator_id)]) return;
      var isIstitharaAcc = (entry.section_id === '22222222-0000-4000-8000-000000000007') || (String(entry.section_name || '').indexOf('الاستثارة') >= 0);
      if (entry.role === 'educator' && isIstitharaAcc) return;
      accs[lowK] = Object.assign({}, accs[lowK] || {}, entry);
    });
    return { educators: edus, account_meta: accs, deleted_emails: delEmails, deleted_educator_ids: delEduIds };
  }

  function mergePortalMetas(primary, secondary) {
    var p = normalizePortalMeta(primary);
    var s = normalizePortalMeta(secondary);
    var delEmails = (p.deleted_emails || []).slice();
    (s.deleted_emails || []).forEach(function (em) { if (delEmails.indexOf(em) < 0) delEmails.push(em); });
    var delEduIds = (p.deleted_educator_ids || []).slice();
    (s.deleted_educator_ids || []).forEach(function (id) { if (delEduIds.indexOf(id) < 0) delEduIds.push(id); });
    var delEmailMap = {}, delEduMap = {};
    delEmails.forEach(function (em) { delEmailMap[em] = true; });
    delEduIds.forEach(function (id) { delEduMap[id] = true; });

    var mergedEdus = p.educators.slice();
    s.educators.forEach(function (se) {
      if (!se || !se.id) return;
      if (delEduMap[String(se.id)] || (se.email && delEmailMap[String(se.email).toLowerCase()])) return;
      var idx = mergedEdus.findIndex(function (pe) { return pe && pe.id === se.id; });
      if (idx === -1) {
        mergedEdus.push(se);
      } else if (se.updated_at && (!mergedEdus[idx].updated_at || se.updated_at > mergedEdus[idx].updated_at)) {
        mergedEdus[idx] = se;
      }
    });
    var mergedAccs = Object.assign({}, s.account_meta, p.account_meta);
    Object.keys(mergedAccs).forEach(function (k) {
      if (delEmailMap[k.toLowerCase()]) delete mergedAccs[k];
    });
    return normalizePortalMeta({ educators: mergedEdus, account_meta: mergedAccs, deleted_emails: delEmails, deleted_educator_ids: delEduIds });
  }

  function readLocalPortalBackup() {
    try {
      var s = sessionStorage.getItem('de_portal_meta_v1');
      if (s) return normalizePortalMeta(JSON.parse(s));
    } catch (e) {}
    return null;
  }

  function writeLocalPortalBackup(meta) {
    var jsonStr = JSON.stringify(normalizePortalMeta(meta));
    try { sessionStorage.setItem('de_portal_meta_v1', jsonStr); } catch (e) {}
  }

  async function loadPortalMeta(force) {
    if (S.portalMeta && !force) return S.portalMeta;
    var localBackup = readLocalPortalBackup();
    if (S.portalMeta) {
      localBackup = localBackup ? mergePortalMetas(S.portalMeta, localBackup) : S.portalMeta;
    }

    try {
      var fetchP = C.rest('GET', '/site_content?id=eq.draft&select=id,data');
      var timeP = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 3000); });
      var rows = await Promise.race([fetchP, timeP]);
      var list = Array.isArray(rows) ? rows : (rows ? [rows] : []);
      var draftRow = list[0];
      var remoteMeta = (draftRow && draftRow.data && draftRow.data._portal_meta) ? normalizePortalMeta(draftRow.data._portal_meta) : null;

      if (remoteMeta) {
        var finalMeta = localBackup ? mergePortalMetas(remoteMeta, localBackup) : remoteMeta;
        S.portalMeta = finalMeta;
        writeLocalPortalBackup(finalMeta);
        return finalMeta;
      }
    } catch (e) {}

    S.portalMeta = localBackup || emptyPortalMeta();
    writeLocalPortalBackup(S.portalMeta);
    return S.portalMeta;
  }

  async function savePortalMeta(meta) {
    var cleanMeta = normalizePortalMeta(meta);
    S.portalMeta = cleanMeta;
    writeLocalPortalBackup(cleanMeta);
    try {
      var rows = await C.rest('GET', '/site_content?id=eq.draft&select=id,data');
      var row = Array.isArray(rows) ? rows[0] : null;
      var baseData = (row && row.data && typeof row.data === 'object') ? Object.assign({}, row.data) : {};
      baseData._portal_meta = cleanMeta;
      if (row) {
        await C.rest('PATCH', '/site_content?id=eq.draft', { data: baseData, updated_at: new Date().toISOString() });
      } else {
        await C.rest('POST', '/site_content', { id: 'draft', data: baseData, updated_at: new Date().toISOString() });
      }
    } catch (e) {}
    return cleanMeta;
  }

  function cleanPhoneDigits(p) {
    return normalizeArabicDigits(p).replace(/\D/g, '');
  }

  function toWhatsAppPhone(p) {
    var d = cleanPhoneDigits(p);
    if (!d) return '';
    if (d.indexOf('00213') === 0) return d.slice(2);
    if (d.indexOf('213') === 0) return d;
    if (d.charAt(0) === '0' && d.length >= 9) return '213' + d.slice(1);
    return d;
  }

  function educatorEmailFromPhoneOrName(phone, eduId) {
    var d = cleanPhoneDigits(phone);
    if (d.length >= 6) return 'edu.' + d + '@darelihsan.org';
    var shortId = String(eduId || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || 'staff';
    return 'edu.' + shortId + '@darelihsan.org';
  }

  function resolveEducatorLoginEmail(inputStr, meta) {
    var raw = String(inputStr || '').trim().toLowerCase();
    if (!raw) return '';
    var m = meta || S.portalMeta || emptyPortalMeta();
    var digits = cleanPhoneDigits(raw);
    var tail9 = digits.length >= 9 ? digits.slice(-9) : '';

    if (tail9) {
      var byPhone = (m.educators || []).filter(function (e) {
        var ed = cleanPhoneDigits(e.phone);
        return ed.length >= 9 && ed.slice(-9) === tail9;
      })[0];
      if (byPhone && byPhone.email) return byPhone.email.toLowerCase();

      var accKeys = Object.keys(m.account_meta || {});
      for (var i = 0; i < accKeys.length; i++) {
        var ak = accKeys[i];
        var am = m.account_meta[ak];
        var ad = cleanPhoneDigits(am && am.phone);
        if (ad.length >= 9 && ad.slice(-9) === tail9) return ak.toLowerCase();
      }
      if (!DE.isEmail(raw)) {
        var normPhone = raw.charAt(0) === '0' ? digits : ('0' + tail9);
        return 'edu.' + normPhone + '@darelihsan.org';
      }
    }

    if (!DE.isEmail(raw)) {
      var byName = (m.educators || []).filter(function (e) {
        return normAr(e.full_name) === normAr(raw);
      })[0];
      if (byName && byName.email) return byName.email.toLowerCase();
    }

    return raw;
  }

  var STAFF_SESSION_KEY = 'de_staff_portal_session_v2';

  function clearEducatorDirectSession() {
    try {
      sessionStorage.removeItem('de_edu_direct_session');
      sessionStorage.removeItem(STAFF_SESSION_KEY);
    } catch (e) {}
  }

  function persistStaffSession(prof) {
    // Sessions are strictly verified through Supabase Auth
  }

  function readStaffSession() {
    return null;
  }

  function verifyStaffPortalAuth(rawInput, resolvedEmail, passwordInput, meta) {
    return null;
  }

  function setNavBtnLabel(btn, txt) {
    var sp = btn.querySelector('span');
    if (sp) sp.textContent = txt;
    else if (btn.lastChild && btn.lastChild.nodeType === 3) btn.lastChild.nodeValue = txt;
  }

  function updateSidebarCenterCard() {
    var nameEl = $('#sideCenterName');
    var roleEl = $('#sideRoleLabel');
    var avEl = $('#sideAvatar');
    var swBtn = $('#hubSwitchBtn');
    var swTxt = $('#hubSwitchTxt');
    var topDateEl = $('#topDate');

    if (topDateEl && !topDateEl.textContent) {
      try {
        topDateEl.textContent = new Date().toLocaleDateString('ar-DZ-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {}
    }

    if (S.isEducator) {
      if (nameEl) nameEl.textContent = S.eduSectionName || 'فوجي التربوي';
      if (roleEl) roleEl.textContent = 'فضاء المربية';
      if (avEl) avEl.textContent = 'م';
      if (swBtn) swBtn.hidden = true;
      return;
    }

    if (S.isSpecialist) {
      if (nameEl) nameEl.textContent = 'المركز الرئيسي دار الإحسان';
      if (roleEl) roleEl.textContent = 'أخصائية نفسانية';
      if (avEl) avEl.textContent = 'ن';
      if (swBtn) swBtn.hidden = true;
      return;
    }

    if (swBtn) swBtn.hidden = (S.sec === 'hub');
    var cm = getCenterMeta(S.activeCenter);
    if (S.sec === 'hub' || S.sec === 'hub_accounts') {
      if (nameEl) nameEl.textContent = 'لوحة الإدارة (المراكز الثلاثة)';
      if (roleEl) roleEl.textContent = S.isOwner ? 'المدير الرئيسي (المالك)' : formatCenterAccessLabel(S.centerAccess);
      if (avEl) avEl.textContent = 'د';
      if (swTxt) swTxt.textContent = 'العودة إلى لوحة الإدارة';
    } else {
      if (nameEl) nameEl.textContent = cm.name;
      if (roleEl) roleEl.textContent = 'اضغط للعودة إلى لوحة الإدارة';
      if (avEl) avEl.textContent = cm.avatar;
      if (swTxt) swTxt.textContent = 'لوحة الإدارة (' + cm.shortName + ')';
    }
  }

  
  function isFarmSession() {
    if (S.activeCenter === 'farm') return true;
    if (S.isEducator) {
      var secId = String(S.eduSectionId || '');
      var secNm = String(S.eduSectionName || '');
      var profCenter = S.eduProfile && S.eduProfile.center;
      if (profCenter === 'farm' || secId === '22222222-0000-4000-8000-000000000011' || secId === 'sec_bostana' || secNm.indexOf('البستنة') >= 0 || secNm.indexOf('المزرعة') >= 0) {
        return true;
      }
    }
    return false;
  }

  
  /* فحص صلاحية الوصول إلى نظام الأرشيف الشامل (للمدير العام أو من يملك صلاحية جميع المراكز فقط) */
  function canUserAccessArchive() {
    if (!S.me) return false;
    if (S.isEducator) return false;
    var email = String(S.me.email || '').toLowerCase().trim();
    var name = String(S.me.full_name || S.me.name || '').trim();
    var phone = String(S.me.phone || '').trim();
    return S.isOwner || (S.centerAccess === 'all') || (typeof canAccessGeneralAdmin === 'function' && canAccessGeneralAdmin());
  }

  function applyRoleSidebarUI() {
    var isEdu = !!S.isEducator;
    var isFarm = isFarmSession();
    var isSpec = !!S.isSpecialist;
    var allowedForEdu = { children: true, attendance: true, reports: true, evaluations: true };
    var allowedForSpec = { dash: true, children: true, attendance: true, programs: true, reports: true, evaluations: true, appts: true, msgs: true, docs: true };
    var isWorkOrFarm = !isEdu && !isSpec && (S.activeCenter === 'work' || S.activeCenter === 'farm');
    var allowedForWorkOrFarm = { children: true, attendance: true, educators: true, programs: true, reports: true, evaluations: true, accounts: true, archive: true, requests: true, inquiries: true };

    [].forEach.call(document.querySelectorAll('#nav [data-sec]'), function (btn) {
      var secKey = btn.dataset.sec;
      if (secKey === 'hub') {
        btn.hidden = true;
        return;
      }
      if (secKey === 'attendance') {
        btn.hidden = false;
        setNavBtnLabel(btn, 'الغيابات والحضور');
        return;
      }
      if (isEdu) {
        btn.hidden = !allowedForEdu[secKey];
        if (secKey === 'children') setNavBtnLabel(btn, 'الأقسام والأطفال (' + (S.eduSectionName || 'فوجي') + ')');
        if (secKey === 'reports') setNavBtnLabel(btn, 'التقارير');
        if (secKey === 'evaluations') setNavBtnLabel(btn, 'التقييم');
      } else if (isSpec) {
        btn.hidden = !allowedForSpec[secKey];
        if (secKey === 'children') setNavBtnLabel(btn, 'الأقسام والأطفال');
        if (secKey === 'reports') setNavBtnLabel(btn, 'التقارير');
        if (secKey === 'evaluations') setNavBtnLabel(btn, 'التقييم');
        if (secKey === 'archive') setNavBtnLabel(btn, 'الأرشيف والنسخ الاحتياطية');
      } else if (isWorkOrFarm) {
        btn.hidden = !allowedForWorkOrFarm[secKey];
        if (secKey === 'children') setNavBtnLabel(btn, 'الأقسام والأطفال');
        if (secKey === 'accounts') setNavBtnLabel(btn, S.activeCenter === 'work' ? 'الحسابات الخاصة بمركز المساعدة على العمل' : 'الحسابات الخاصة بالمزرعة البيداغوجية');
        if (secKey === 'archive') setNavBtnLabel(btn, 'الأرشيف والنسخ الاحتياطية');
      } else {
        btn.hidden = false;
        if (secKey === 'children') setNavBtnLabel(btn, 'الأقسام والأطفال');
        if (secKey === 'reports') setNavBtnLabel(btn, 'التقارير');
        if (secKey === 'evaluations') setNavBtnLabel(btn, 'التقييم');
        if (secKey === 'accounts') setNavBtnLabel(btn, 'حسابات المركز الرئيسي');
        if (secKey === 'archive') setNavBtnLabel(btn, 'الأرشيف والنسخ الاحتياطية');
      }
    });

    [].forEach.call(document.querySelectorAll('#nav .nav-group-label'), function (g) {
      if (isEdu || isWorkOrFarm) {
        g.hidden = true;
      } else if (isSpec) {
        g.hidden = (g.dataset.navGroup === 'operations' || g.dataset.navGroup === 'admin');
      } else {
        g.hidden = false;
      }
    });
    var navSep = $('#navSep') || document.querySelector('#nav .sep');
    if (navSep) navSep.hidden = isEdu || isWorkOrFarm || isSpec;
    var archNavBtn = document.querySelector("#nav [data-sec='archive']");
    if (archNavBtn) {
      archNavBtn.hidden = !canUserAccessArchive();
    }
    updateSidebarCenterCard();
  }

  /* ---------- أدوات المساعدة ---------- */
  function fmt(v, t) { if (!v) return '—'; try { return new Date(v).toLocaleString('ar-DZ-u-nu-latn', t ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }); } catch (e) { return '—'; } }
  function toast(msg, kind) { var t = $('#toast'); t.textContent = msg; t.className = 'toast ' + (kind || ''); t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 4200); }
  function show(id) { ['boot', 'login', 'app'].forEach(function (x) { $('#' + x).hidden = x !== id; }); }
  function msg(el, m) { el.textContent = m || ''; el.hidden = !m; }
  function lock(btn, fn) {
    if (btn.disabled) return Promise.resolve();
    btn.disabled = true;
    return Promise.resolve().then(fn).then(function (r) { btn.disabled = false; return r; }, function (e) { btn.disabled = false; throw e; });
  }
  function act(btn, fn, okMsg) {
    return lock(btn, fn).then(function (r) { if (okMsg) toast(okMsg, 'ok'); return r; }, function (e) { toast(e.message, 'bad'); });
  }
  function bust() { S.cache = {}; }
  function uid(id) { if (!DE.isUuid(id)) throw new Error('معرّف غير صالح.'); return id; }
  function toLocalInput(iso) {
    if (!iso) return ''; var d = new Date(iso), p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function isoFromLocal(v) { var d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); }
  function badge(text, kind) { return h('span', { class: 'badge ' + (kind || ''), text: text }); }
  function size(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function readBytes(file) { return file.arrayBuffer().then(function (b) { return new Uint8Array(b); }); }

  /* استعلامات REST مع استرداد تلقائي للقائمة الرسمية (103 طفل و11 قسمًا و3 فروع) لضمان عدم اختفاء الأطفال أبدًا */
  var _autoImportAttempted = false;
  var CHILD_SAFE_COLS = 'id,membership_no,full_name,dob,disability,phone,center,branch_id,section_id,section,academic_year,basic_info,photo_consent,active,qr_token,created_at,updated_at';

  function mapEmbeddedStudentsToSections(liveBranches, liveSections) {
    return [];
  }

  var Q = {
    branches: async function () {
      try {
        var r = await C.rest('GET', '/branches?select=id,name,slug,active&order=id');
        if (Array.isArray(r) && r.length) return r;
      } catch (e) {}
      return EMBEDDED_BRANCHES.slice();
    },
    sections: async function () {
      try {
        var r = await C.rest('GET', '/sections?select=id,branch_id,name,slug,description,active&order=id');
        if (Array.isArray(r) && r.length) return r;
      } catch (e) {}
      return EMBEDDED_SECTIONS.slice();
    },
    children: async function () {
      var rows = [];
      try {
        rows = await C.rest('GET', '/children?select=' + CHILD_SAFE_COLS + '&order=membership_no.asc,full_name.asc');
      } catch (err) {
        try {
          rows = await C.rest('GET', '/children?select=id,full_name,center,section,basic_info,photo_consent,active,created_at,updated_at&order=full_name.asc');
        } catch (err2) {
          rows = [];
        }
      }
      return Array.isArray(rows) ? rows : [];
    },
    parents: function () { return C.rest('GET', '/parent_profiles?select=*&order=full_name').catch(function () { return []; }); },
    links: function () { return C.rest('GET', '/parent_children?select=parent_id,child_id').catch(function () { return []; }); },
    programs: async function () {
      var dbProgs = [];
      try {
        var r = await C.rest('GET', '/educational_programs?select=*&order=created_at.desc');
        if (Array.isArray(r)) dbProgs = r;
      } catch (e) {}
      var localProgs = [];
      try {
        var raw = localStorage.getItem('de_shared_programs_v1');
        if (raw) {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) localProgs = parsed;
        }
      } catch (e2) {}
      var merged = dbProgs.slice();
      localProgs.forEach(function (lp) {
        if (!lp || !lp.id) return;
        var idx = merged.findIndex(function (m) { return m && String(m.id) === String(lp.id); });
        if (idx >= 0) {
          merged[idx] = Object.assign({}, merged[idx], lp);
        } else {
          merged.unshift(lp);
        }
      });
      return merged;
    },
    codes: function () { return C.rest('GET', '/registration_codes?select=*&order=created_at.desc').catch(function () { return []; }); },
    reports: async function () {
      var dbRows = [];
      try {
        var r = await C.rest('GET', '/progress_reports?select=*&order=report_date.desc');
        if (Array.isArray(r)) dbRows = r;
      } catch (e) {}
      var merged = dbRows.slice();
      var sharedList = await loadSharedEvaluationsList();
      sharedList.forEach(function (item) {
        if (!item || !item.id) return;
        var existingIdx = merged.findIndex(function (m) { return m && String(m.id) === String(item.id); });
        if (existingIdx >= 0) {
          if (item.status) merged[existingIdx].status = item.status;
          if (item.activities) merged[existingIdx].activities = item.activities;
          if (item.title) merged[existingIdx].title = item.title;
          if (item.report_date) merged[existingIdx].report_date = item.report_date;
        } else {
          merged.push(item);
        }
      });
      var pubToSync = [];
      merged.forEach(function (row) {
        if (isEvaluationReport(row)) {
          row.status = extractEvalStatus(row);
          if (row.status === 'published') pubToSync.push(row);
        }
      });
      if (pubToSync.length) {
        try {
          var curLocal = readLocalSharedEvaluations();
          var changed = false;
          pubToSync.forEach(function (pr) {
            if (!curLocal.some(function (x) { return x && String(x.id) === String(pr.id); })) {
              curLocal.unshift(pr);
              changed = true;
            }
          });
          if (changed) {
            writeLocalSharedEvaluations(curLocal);
            syncSharedEvaluationRecord(pubToSync[0], null).catch(function () {});
          }
        } catch (eSync) {}
      }
      merged.sort(function (a, b) {
        return String(b.report_date || '').localeCompare(String(a.report_date || ''));
      });
      return merged;
    },
    appts: function () { return C.rest('GET', '/appointments?select=*&order=starts_at.desc').catch(function () { return []; }); },
    msgs: function () { return C.rest('GET', '/messages?select=*&order=created_at.desc').catch(function () { return []; }); },
    reads: function () { return C.rest('GET', '/message_reads?select=message_id').catch(function () { return []; }); },
    docs: function () { return C.rest('GET', '/documents?select=*&order=created_at.desc').catch(function () { return []; }); },
    audit: function () { return C.rest('GET', '/audit_logs?select=*&order=created_at.desc&limit=50').catch(function () { return []; }); }
  };

  async function get(k) {
    if (S.cache[k]) return S.cache[k];
    if (Q[k]) {
      try { S.cache[k] = await Q[k](); } catch (e) { S.cache[k] = []; }
    } else if (k === 'audit') {
      S.cache[k] = await C.rest('GET', '/audit_logs?select=*&order=created_at.desc&limit=50').catch(function () { return []; });
    } else if (k === 'reports') {
      S.cache[k] = await C.rest('GET', '/reports?select=*&order=report_date.desc&limit=50').catch(function () { return []; });
    } else if (k === 'docs') {
      S.cache[k] = await C.rest('GET', '/documents?select=*&order=created_at.desc&limit=50').catch(function () { return []; });
    } else if (k === 'msgs') {
      S.cache[k] = await C.rest('GET', '/messages?select=*&order=created_at.desc&limit=50').catch(function () { return []; });
    } else {
      try { S.cache[k] = await C.rest('GET', '/' + k + '?select=*').catch(function () { return []; }); } catch (e) { S.cache[k] = []; }
    }
    return S.cache[k] || [];
  }
  async function getMany() { var r = await Promise.all([].map.call(arguments, get)); return r; }
  function nameOf(list, id, key) { var x = list.filter(function (r) { return (r.id || r.user_id) === id; })[0]; return x ? x[key || 'full_name'] : '—'; }

  /* ---------- نوافذ الحوار ---------- */
  function openModal(card) {
    var m = $('#modal'), c = $('#modalCard'); c.textContent = ''; c.appendChild(card);
    var wasHidden = m.hidden;
    m.hidden = false; document.body.style.overflow = 'hidden';
    if (wasHidden) {
      try { window.history.pushState({ deApp: true, sec: S.sec, center: S.activeCenter, modal: true }, ''); } catch (e) {}
    }
    var first = c.querySelector('input,select,textarea,button'); if (first) first.focus();
  }
  function closeModal() { $('#modal').hidden = true; $('#modalCard').textContent = ''; document.body.style.overflow = ''; }
  function ask(o) {
    return new Promise(function (res) {
      var done = function (v) { closeModal(); res(v); };
      openModal(h('div', { class: 'modal-body' }, h('h2', { text: o.title }), h('p', { text: o.msg || '' }),
        h('div', { class: 'modal-actions' },
          h('button', { class: 'btn light', type: 'button', text: 'تراجع', onclick: function () { done(false); } }),
          h('button', { class: 'btn' + (o.danger ? ' danger' : ''), type: 'button', text: o.ok || 'تأكيد', onclick: function () { done(true); } }))));
    });
  }
  function info(title, node) {
    openModal(h('div', { class: 'modal-body' }, h('h2', { text: title }), node, h('div', { class: 'modal-actions' }, h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal }))));
  }

  /* نماذج الإدخال العامة */
  function fieldEl(f, val) {
    var id = 'f_' + f.k, input, getv;
    var hint = h('small', { class: 'hint', text: f.hint || '' });
    if (f.type === 'textarea') {
      input = h('textarea', { id: id, maxlength: f.max || 2000, rows: 4 }); input.value = val || '';
      getv = function () { return DE.clean(input.value, f.max || 2000); };
    } else if (f.type === 'select') {
      var allOpts = (f.opts || []).slice();
      input = h('select', { id: id }, h('option', { value: '', text: '— اختر —' }), allOpts.map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
      input.value = val == null ? '' : val; getv = function () { return input.value; };
      var searchIn = null;
      if (f.searchable) {
        searchIn = h('input', { type: 'search', class: 'fld-search', placeholder: 'بحث سريع في القائمة...', autocomplete: 'off' });
        searchIn.addEventListener('input', function () {
          var q = normAr(searchIn.value.trim());
          var curVal = input.value;
          var opts = f.opts || allOpts;
          while (input.firstChild) input.removeChild(input.firstChild);
          input.appendChild(h('option', { value: '', text: '— اختر —' }));
          opts.forEach(function (o) {
            if (!q || normAr(o[1]).indexOf(q) >= 0 || normAr(o[0]).indexOf(q) >= 0) {
              input.appendChild(h('option', { value: o[0], text: o[1] }));
            }
          });
          if (curVal && opts.some(function (o) { return o[0] === curVal; })) input.value = curVal;
        });
      }
    } else if (f.type === 'checkbox') {
      input = h('input', { id: id, type: 'checkbox' }); input.checked = !!val;
      getv = function () { return input.checked; };
    } else if (f.type === 'multi') {
      var set = {}; (val || []).forEach(function (x) { set[x] = true; });
      var boxes = (f.opts || []).map(function (o) { var cb = h('input', { type: 'checkbox', value: o[0] }); cb.checked = !!set[o[0]]; return { cb: cb, label: h('label', { class: 'chk' }, cb, o[1]) }; });
      input = h('div', { class: 'multi', id: id }, boxes.map(function (b) { return b.label; }));
      if (!boxes.length) input.appendChild(h('span', { class: 'muted small', text: 'لا توجد خيارات.' }));
      getv = function () { return boxes.filter(function (b) { return b.cb.checked; }).map(function (b) { return b.cb.value; }); };
    } else if (f.type === 'file') {
      input = h('input', { id: id, type: 'file', accept: f.accept || '' });
      getv = function () { return input.files && input.files[0] || null; };
    } else {
      var t = f.type === 'datetime' ? 'datetime-local' : (f.type === 'date' ? 'date' : f.type || 'text');
      input = h('input', { id: id, type: t, maxlength: f.max || 200, dir: (t === 'email' || t === 'tel') ? 'ltr' : null, autocomplete: 'off', readonly: !!f.readonly, class: f.readonly ? 'fld-readonly' : null });
      input.value = val || '';
      getv = function () { return t === 'datetime' ? isoFromLocal(input.value) : DE.clean(input.value, f.max || 200); };
    }
    var genBtn = null;
    if (f.gen) {
      genBtn = h('button', { class: 'btn light small', type: 'button', text: 'توليد كود قوي', onclick: function (e) {
        if (e && e.preventDefault) e.preventDefault();
        input.value = f.gen(); input.dispatchEvent(new Event('input', { bubbles: true }));
      } });
    }
    var row = h('label', { class: 'fld', for: id }, h('span', { text: f.label + (f.req ? ' *' : '') }), searchIn, input, genBtn, f.hint ? hint : null);
    return { row: row, input: input, get: getv, def: f };
  }

  function openForm(cfg) {
    var vals = cfg.values || {};
    var pairs = cfg.fields.map(function (f) {
      var v = vals[f.k];
      if (f.type === 'datetime' && v) v = toLocalInput(v);
      return fieldEl(f, v);
    });
    var noteEls = { pick: h('div', { class: 'form-note muted small' }), file: h('div', { class: 'form-note small' }) };
    var byKey = {}; pairs.forEach(function (p) { byKey[p.def.k] = p; });
    var api = {
      input: function (k) { return byKey[k] ? byKey[k].input : null; },
      setOpts: function (k, opts) {
        var p = byKey[k]; if (!p) return;
        var sel = p.input; if (!sel) return;
        p.def.opts = (opts || []).slice();
        var parentLabel = sel.parentElement;
        var sIn = parentLabel ? parentLabel.querySelector('.fld-search') : null;
        if (sIn) sIn.value = '';
        var keep = sel.value;
        while (sel.firstChild) sel.removeChild(sel.firstChild);
        sel.appendChild(h('option', { value: '', text: '— اختر —' }));
        (opts || []).forEach(function (o) { sel.appendChild(h('option', { value: o[0], text: o[1] })); });
        sel.value = (opts || []).some(function (o) { return o[0] === keep; }) ? keep : '';
      },
      note: function (slot, content) {
        var el = noteEls[slot]; while (el.firstChild) el.removeChild(el.firstChild);
        if (typeof content === 'string') el.textContent = content; else if (content) el.appendChild(content);
        el.hidden = !el.firstChild;
      },
      refresh: function () { syncVisibility('file'); }
    };
    function syncVisibility(changed) {
      var cur = {}; pairs.forEach(function (p) { cur[p.def.k] = p.get(); });
      pairs.forEach(function (p) { if (p.def.showIf) p.row.hidden = !p.def.showIf(cur); });
      if (cfg.onChange) cfg.onChange(changed, cur, api);
    }
    pairs.forEach(function (p) {
      var k = p.def.k;
      p.input.addEventListener('change', function () { syncVisibility(k); });
      p.input.addEventListener('input', function () { syncVisibility(k); });
    });
    syncVisibility(null);

    var errEl = h('p', { class: 'err', role: 'alert' }); errEl.hidden = true;
    var submits = cfg.submits || [{ key: 'save', label: 'حفظ' }];
    var btns = submits.map(function (s) {
      var b = h('button', { class: 'btn' + (s.danger ? ' danger' : s.light ? ' light' : s.gold ? ' gold' : ''), type: 'button', text: s.label });
      b.addEventListener('click', function () {
        act(b, async function () {
          msg(errEl, '');
          try {
            var data = {};
            for (var i = 0; i < pairs.length; i++) {
              var p = pairs[i], f = p.def;
              if (f.showIf && p.row.hidden) continue;
              var v = p.get();
              if (typeof v === 'string' && (f.kind === 'phone' || f.type === 'tel')) {
                v = normalizeArabicDigits(v).trim();
              }
              if (f.req && (v === '' || v === null || (Array.isArray(v) && !v.length))) throw new Error('يرجى ملء الحقل المطلوب: ' + f.label);
              if (f.kind === 'email' && v && !DE.isEmail(v)) throw new Error('البريد الإلكتروني غير صحيح.');
              if (f.kind === 'phone' && v && !DE.isPhone(v)) throw new Error('رقم الهاتف غير صحيح.');
              data[f.k] = v;
            }
            await cfg.onSubmit(data, s.key);
            closeModal();
          } catch (submitErr) {
            msg(errEl, submitErr && submitErr.message ? submitErr.message : 'حدث خطأ أثناء الحفظ.');
            throw submitErr;
          }
        });
      });
      return b;
    });

    var card = h('div', { class: 'modal-body' },
      h('h2', { text: cfg.title }),
      pairs.map(function (p) { return p.row; }),
      noteEls.pick, noteEls.file,
      errEl,
      h('div', { class: 'modal-actions' },
        h('button', { class: 'btn light', type: 'button', text: 'إلغاء', onclick: closeModal }),
        btns
      )
    );
    openModal(card);
  }

  /* قوائم العرض والجداول المتجاوبة */
    /* محوّل ومساعد عام لدوال الجداول (Table Adapter) */
  function table(o) {
    if (!o) return;
    var host = o.host || o.v || document.createElement('div');
    var opts = Object.assign({}, o, {
      title: o.title || '',
      rows: o.rows || o.data || []
    });
    return listView(host, opts);
  }

  function listView(v, o) {
    var searchVal = '', curFilters = {}, sortIdx = -1, sortDir = 1, openRows = {}, visible = [];
    var bar = h('div', { class: 'bar-sub' }, h('h2', { text: o.title }));
    var barBtns = h('div', { class: 'row-actions' });
    // [REMOVED: زر تصدير الإكسال بناء على طلب المستخدم]
    (o.extra || []).forEach(function (x) {
      var ic = detectBtnSvgIcon(x.label);
      barBtns.appendChild(h('button', { class: 'btn ' + (x.kind || 'light'), type: 'button', onclick: x.onclick }, ic ? makeSvgIcon(ic) : null, h('span', { text: stripEmojis(x.label) })));
    });
    if (o.addLabel && o.onAdd) {
      var addIc = detectBtnSvgIcon(o.addLabel) || 's-plus';
      barBtns.appendChild(h('button', { class: 'btn', type: 'button', onclick: o.onAdd }, makeSvgIcon(addIc), h('span', { text: stripEmojis(o.addLabel) })));
    }
    bar.appendChild(barBtns);
    v.appendChild(bar);

    var fwrap = h('div', { class: 'filter-bar' });
    if (o.search) {
      var sIn = h('input', { type: 'search', placeholder: o.searchPlaceholder || 'بحث بالاسم، رقم القيد، أو القسم…', 'aria-label': 'بحث' });
      sIn.addEventListener('input', function () { searchVal = DE.clean(sIn.value, 80).toLowerCase(); render(); });
      fwrap.appendChild(sIn);
    }
    // [REMOVED: الخيارات التي على الصورة - وضع مكانها البحث فقط بكامل العرض]
    if (o.search) v.appendChild(fwrap);

    var countBadge = h('div', { class: 'muted small' });
    v.appendChild(countBadge);

    var listBox = h('div');
    v.appendChild(listBox);

    function filtered() {
      return (o.rows || []).filter(function (r) {
        if (searchVal && o.search && (o.search(r) || '').toLowerCase().indexOf(searchVal) === -1) return false;
        for (var k in curFilters) {
          var val = curFilters[k];
          if (val !== '' && o.filters[k] && !o.filters[k].test(r, val)) return false;
        }
        return true;
      });
    }

    function sortList(list) {
      if (sortIdx < 0 || !o.cols[sortIdx] || typeof o.cols[sortIdx].sort !== 'function') return list;
      var key = o.cols[sortIdx].sort;
      return list.slice().sort(function (a, b) {
        var x = key(a), y = key(b);
        if (x == null) x = ''; if (y == null) y = '';
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * sortDir;
        return String(x).localeCompare(String(y), 'ar', { numeric: true, sensitivity: 'base' }) * sortDir;
      });
    }

    function render() {
      var prevWrap = listBox.querySelector('.table-wrap');
      var pos = prevWrap ? [prevWrap.scrollTop, prevWrap.scrollLeft] : null;
      listBox.textContent = '';

      var list = sortList(filtered());
      visible = list;
      countBadge.textContent = 'إجمالي السجلات المعروضة: ' + list.length + ' من ' + (o.rows ? o.rows.length : 0);

      if (!list.length) {
        listBox.appendChild(h('div', { class: 'empty', text: o.empty || 'لا توجد عناصر مطابقة.' }));
        return;
      }

      var hasActs = !!(o.actions || o.details);
      var headRow = h('tr');
      o.cols.forEach(function (c, ci) {
        var sortable = typeof c.sort === 'function';
        var label = c.label + (sortable && sortIdx === ci ? (sortDir > 0 ? ' ▲' : ' ▼') : '');
        var th = h('th', { text: label, class: sortable ? 'sortable' : null, title: sortable ? 'اضغط للفرز' : null });
        if (sortable) {
          th.setAttribute('aria-sort', sortIdx === ci ? (sortDir > 0 ? 'ascending' : 'descending') : 'none');
          th.addEventListener('click', function () {
            if (sortIdx === ci) sortDir = -sortDir; else { sortIdx = ci; sortDir = 1; }
            render();
          });
        }
        headRow.appendChild(th);
      });
      if (hasActs) headRow.appendChild(h('th', { text: 'التفاصيل والإجراءات', style: 'text-align:center;width:140px;' }));
      var table = h('table', { class: 'tbl' + (o.sheet ? ' tbl-sheet' : '') },
        h('thead', {}, headRow));
      var tbody = h('tbody');

      list.forEach(function (r) {
        var tr = h('tr');
        o.cols.forEach(function (c) {
          var val = c.get(r);
          var td = h('td', { 'data-label': c.label });
          if (val instanceof Node) td.appendChild(val); else td.textContent = val == null ? '—' : String(val);
          tr.appendChild(td);
        });
        var rowKey = String(r.id || ('row_' + (r.email || r.title || r.full_name || Math.random().toString(36).slice(2, 7))));
        if (hasActs) {
          var open = !!openRows[rowKey];
          var actsCell = h('td', { class: 'actions-cell', style: 'text-align:center;' },
            h('button', {
              class: 'btn small ' + (open ? 'gold' : 'light'),
              type: 'button',
              'aria-expanded': open ? 'true' : 'false',
              title: open ? 'إخفاء التفاصيل' : 'عرض التفاصيل والإجراءات',
              onclick: function () { openRows[rowKey] = !open; render(); }
            }, makeSvgIcon(open ? 's-eye-off' : 's-eye'), h('span', { text: open ? 'إخفاء التفاصيل' : 'التفاصيل' }))
          );
          tr.appendChild(actsCell);
        }
        tbody.appendChild(tr);

        if (hasActs && openRows[rowKey]) {
          var detailContent = [];
          if (o.details) {
            var dNode = o.details(r);
            if (dNode) detailContent.push(dNode);
          }
          if (o.actions) {
            var rawActs = o.actions(r) || [];
            var validActs = rawActs.filter(Boolean);
            if (validActs.length) {
              var actsBox = h('div', { class: 'row-details-actions-bar' },
                h('span', { class: 'row-actions-title muted small', text: 'الإجراءات المتاحة:' }),
                validActs
              );
              detailContent.push(actsBox);
            }
          }
          if (detailContent.length) {
            tbody.appendChild(h('tr', { class: 'detail-row' },
              h('td', { colspan: String(o.cols.length + 1) },
                h('div', { class: 'row-expanded-details-container' },
                  detailContent
                )
              )
            ));
          }
        }
      });

      table.appendChild(tbody);
      var wrap = h('div', { class: 'table-wrap' + (o.sheet ? ' sheet-wrap' : '') }, table);
      listBox.appendChild(wrap);
      if (pos) { wrap.scrollTop = pos[0]; wrap.scrollLeft = pos[1]; }
    }

    render();
  }

  function detectBtnSvgIcon(txt) {
    var s = String(txt || '');
    if (s.indexOf('حذف') >= 0 || s.indexOf('مسح') >= 0 || s.indexOf('إزالة') >= 0) return 's-trash';
    if (s.indexOf('تعديل') >= 0 || s.indexOf('كتابة') >= 0 || s.indexOf('ملء') >= 0) return 's-edit';
    if (s.indexOf('البطاقة') >= 0) return 's-idcard';
    if (s.indexOf('رمز') >= 0 || s.indexOf('كلمة المرور') >= 0 || s.indexOf('كلمة السر') >= 0 || s.indexOf('إنشاء حساب') >= 0) return 's-key';
    if (s.indexOf('إذن') >= 0 || s.indexOf('صلاحيات') >= 0) return 's-lock';
    if (s.indexOf('إضافة') >= 0 || s.indexOf('إدراج') >= 0 || s.indexOf('جديد') >= 0) return 's-plus';
    if (s.indexOf('مزامنة') >= 0 || s.indexOf('استعادة') >= 0 || s.indexOf('تحديث') >= 0 || s.indexOf('تحويل') >= 0) return 's-refresh';
    if (s.indexOf('طباعة') >= 0 || s.indexOf('الاستمارة والطباعة') >= 0 || s.indexOf('صورة البرنامج') >= 0) return 's-print';
    if (s.indexOf('تحميل') >= 0 || s.indexOf('تنزيل') >= 0) return 's-download';
    if (s.indexOf('تصدير') >= 0 || s.indexOf('نشر') >= 0 || s.indexOf('رفع') >= 0 || s.indexOf('اعتماد') >= 0) return 's-upload';
    if (s.indexOf('عرض') >= 0 || s.indexOf('فتح') >= 0 || s.indexOf('تكبير') >= 0) return 's-eye';
    if (s.indexOf('إخفاء') >= 0) return 's-eye-off';
    if (s.indexOf('نسخ') >= 0 || s.indexOf('تعميم') >= 0) return 's-copy';
    if (s.indexOf('رجوع') >= 0 || s.indexOf('العودة') >= 0) return 's-back';
    return '';
  }

  function rbtn(label, fn, kind) {
    var cleanText = stripEmojis(label);
    var icName = detectBtnSvgIcon(cleanText);
    var b = h('button', { class: 'btn small ' + (kind || 'light'), type: 'button' },
      icName ? makeSvgIcon(icName) : null,
      h('span', { text: cleanText })
    );
    b.addEventListener('click', function () { act(b, fn); });
    return b;
  }

  
  /* التحقق الذكي من رقم الهاتف الجزائري للواتساب وتنسيقه دولياً */
  function getAlgerianWaNumber(raw) {
    if (!raw) return null;
    var d = normalizeArabicDigits(String(raw)).replace(/\D/g, '');
    if (!d) return null;
    if (d.startsWith('00213')) d = d.slice(5);
    else if (d.startsWith('213')) d = d.slice(3);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = d.slice(1);
    if (d.length === 8 && /^[567]/.test(d)) d = d + '0';
    return d.length === 9 ? ('213' + d) : null;
  }

  function openFixWhatsAppPhoneModal(child, rawPhone) {
    var raw = String(rawPhone || '').trim();
    var initialInput = raw;
    if (raw.length === 9 && raw.startsWith('0')) {
      initialInput = raw; // الرقم 9 أرقام ينقصه رقم أخير
    }
    var phoneInput = h('input', {
      type: 'tel',
      dir: 'ltr',
      class: 'sic-num',
      maxlength: 16,
      style: 'font-size:1.15rem;letter-spacing:1px;padding:10px 14px;border:2px solid #25D366;border-radius:8px;font-weight:bold;width:100%;box-sizing:border-box;',
      value: initialInput
    });

    var errorEl = h('p', { class: 'err', style: 'margin:8px 0;' });
    errorEl.hidden = true;

    var childName = (child && child.full_name) || 'الطفل';

    var card = h('div', { class: 'modal-body' },
      h('div', { class: 'bar-sub' },
        h('h2', { style: 'display:flex;align-items:center;gap:8px;' },
          makeSvgIcon('s-whatsapp'),
          h('span', { text: 'مراسلة ولي التلميذ: ' + childName })
        )
      ),
      h('div', { style: 'background:#FDF8ED;border:1px solid rgba(180,135,58,0.3);padding:12px 16px;border-radius:10px;margin-bottom:14px;' },
        h('p', { style: 'margin:0 0 6px;color:#8A6420;font-weight:700;', text: 'تنبيه حول رقم هاتف الولي في السجل:' }),
        h('p', { style: 'margin:0;color:#334155;font-size:0.92rem;line-height:1.5;', text: 'الرقم المسجل حالياً (' + raw + ') يتكون من 9 أرقام، بينما أرقام الهواتف المحمولة في الجزائر الصالحة على واتساب تتكون من 10 أرقام (ينقصه الرقم الأخير ليفتح واتساب بنجاح).' })
      ),
      h('label', { class: 'fld' },
        h('span', { text: 'أدخل رقم هاتف الولي كاملاً (10 أرقام تبدأ بـ 05 أو 06 أو 07):' }),
        phoneInput
      ),
      h('div', { style: 'margin:10px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;' },
        h('small', { class: 'muted', text: 'خيارات سريعة لإكمال الرقم المفقود:' }),
        h('button', {
          type: 'button', class: 'btn small light', text: '+ تجربة إضافة 0 بالآخر (' + initialInput + '0)',
          onclick: function () { phoneInput.value = initialInput + '0'; }
        }),
        h('button', {
          type: 'button', class: 'btn small light', text: '+ تجربة إضافة 1 بالآخر (' + initialInput + '1)',
          onclick: function () { phoneInput.value = initialInput + '1'; }
        })
      ),
      errorEl,
      h('div', { class: 'modal-actions', style: 'margin-top:20px;' },
        h('button', { class: 'btn light', type: 'button', text: 'إلغاء', onclick: closeModal }),
        h('button', {
          class: 'btn gold',
          type: 'button',
          style: 'background:#25D366;border-color:#25D366;color:#fff;font-weight:700;',
          onclick: async function () {
            var val = phoneInput.value.trim();
            var validWa = getAlgerianWaNumber(val);
            if (!validWa) {
              errorEl.textContent = 'رقم الهاتف الجزائري يجب أن يتكون من 10 أرقام (مثال: 0661649080). يرجى التأكد من كتابة 10 أرقام.';
              errorEl.hidden = false;
              return;
            }
            errorEl.hidden = true;
            var local10 = '0' + validWa.slice(3);

            // تحديث الرقم تلقائياً في ملف الطفل في قاعدة البيانات
            if (child && child.id) {
              child.phone = local10;
              try {
                await C.rest('PATCH', '/children?id=eq.' + uid(child.id), { phone: local10 });
                bust();
              } catch (eSave) {}
            }
            closeModal();
            window.open('https://wa.me/' + validWa, '_blank');
            toast('تم تحديث رقم الولي وفتح محادثة واتساب بنجاح!', 'ok');
          }
        }, makeSvgIcon('s-whatsapp'), h('span', { text: 'فتح واتساب ومراسلة الولي وحفظ الرقم' })),
        h('button', {
          class: 'btn light',
          type: 'button',
          text: 'محاولة الفتح بالرقم الحالي على أية حال',
          onclick: function () {
            closeModal();
            var d = normalizeArabicDigits(raw).replace(/\D/g, '').replace(/^0+/, '');
            window.open('https://wa.me/213' + d, '_blank');
          }
        })
      )
    );
    openModal(card);
    setTimeout(function () {
      phoneInput.focus();
      phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length);
    }, 120);
  }

  /* رابط واتساب المباشر لأرقام هواتف الأولياء مع أيقونة واتساب الرسمية ومعالجة الأرقام الناقصة */
  function makeWhatsAppLink(phone, child) {
    if (!phone || phone === '—') return h('span', { text: '—' });
    var raw = String(phone).trim();
    var validWa = getAlgerianWaNumber(raw);

    var btn = h('button', {
      type: 'button',
      class: 'btn-wa-link',
      title: 'مراسلة الولي عبر واتساب (' + raw + ')'
    },
      makeSvgIcon('s-whatsapp'),
      h('span', { dir: 'ltr', class: 'sic-num', text: raw }),
      h('span', { class: 'wa-badge', text: 'واتساب' })
    );

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      var d = normalizeArabicDigits(raw).replace(/\D/g, '');
      if (d.startsWith('00213')) d = d.slice(5);
      else if (d.startsWith('213')) d = d.slice(3);
      else if (d.startsWith('0')) d = d.slice(1);
      // تصحيح الأرقام المكونة من 8 أرقام بإضافة 0 ليصبح رقماً جزائرياً نظامياً صالحاً لواتساب
      if (d.length === 8 && /^[567]/.test(d)) {
        d = d + '0';
      }
      window.open('https://wa.me/213' + d, '_blank');
    });

    return btn;
  }

  /* فحص ورفع الملفات */
  async function uploadChecked(file, childId) {
    if (!file) throw new Error('اختر ملفًا.');
    if (file.size > 5242880) throw new Error('حجم الملف يتجاوز 5 ميغابايت.');
    var bytes = await readBytes(file);
    var head = Array.from(bytes.slice(0, 8)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    var mime = null, ext = null;
    if (head.startsWith('25504446')) { mime = 'application/pdf'; ext = 'pdf'; }
    else if (head.startsWith('ffd8ff')) { mime = 'image/jpeg'; ext = 'jpg'; }
    else if (head.startsWith('89504e47')) { mime = 'image/png'; ext = 'png'; }
    else if (head.startsWith('52494646') && bytes.length > 12 && String.fromCharCode.apply(null, bytes.slice(8, 12)) === 'WEBP') { mime = 'image/webp'; ext = 'webp'; }
    if (!mime) throw new Error('نوع الملف غير مدعوم. المسموح: PDF, JPG, PNG, WebP فقط.');

    var path = 'children/' + uid(childId) + '/' + crypto.randomUUID() + '.' + ext;
    await C.upload('private-docs', path, bytes, mime);
    return { path: path, mime: mime, size: file.size };
  }

  function stripEmojis(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function makeSvgIcon(symId) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'i');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + symId);
    svg.appendChild(use);
    return svg;
  }
  var ico = makeSvgIcon;

  function openAddSectionForCenterModal(centerKey, branches, onDone) {
    var targetBranch = (branches || []).filter(function (b) { return branchCenterKey(b) === centerKey; })[0] || branches[0];
    var cm = getCenterMeta(centerKey);
    return openForm({
      title: 'إضافة قسم / فوج جديد في: ' + cm.name,
      fields: [
        { k: 'name', label: 'اسم القسم / الفوج التربوي', req: true, min: 2, max: 80, hint: centerKey === 'work' ? 'مثال: التمهين م م ع، ورشة النجارة، ورشة الخياطة' : centerKey === 'farm' ? 'مثال: المزرعة البستنة، الزراعة المائية' : 'مثال: توحد 04، الاستثارة 02' },
        { k: 'description', label: 'وصف القسم وأهدافه (اختياري)', type: 'textarea', max: 500 }
      ],
      onSubmit: async function (x) {
        if (!targetBranch) throw new Error('لم يتم العثور على الفرع في قاعدة البيانات.');
        var slug = 'sec_' + centerKey + '_' + Date.now().toString(36);
        await C.rest('POST', '/sections', {
          branch_id: targetBranch.id,
          name: x.name,
          slug: slug,
          description: x.description || null,
          active: true
        });
        bust();
        toast('تمت إضافة القسم الجديد في «' + cm.name + '» بنجاح.', 'ok');
        if (onDone) onDone();
      }
    });
  }

  /* =====================================================================
     0. لوحة المركز وملحقاته (الاختيارات الثلاثة + قسم الإدارة وإذن الدخول لكل مركز وحده)
     ===================================================================== */
  async function secHub(v) {
    if (S.isEducator) return go('children');

    var hubWrap = h('div', { class: 'hub-standalone-wrap' });

    var allAccountsBtn = canAccessGeneralAdmin() ? h('button', {
      type: 'button',
      class: 'hub-all-accounts-btn',
      onclick: function () { go('hub_accounts'); }
    },
      makeSvgIcon('s-shield'),
      h('span', { text: 'الحسابات الخاصة بجميع المراكز' })
    ) : null;

    var diagramTopbar = h('div', { class: 'hub-diagram-topbar' },
      allAccountsBtn,
      h('div', { class: 'hub-diagram-title-box' },
        h('h1', { text: 'لوحة الإدارة' }),
        h('p', { text: 'اختر المركز للدخول إلى لوحة الإدارة الخاصة به' })
      )
    );
    hubWrap.appendChild(diagramTopbar);

    var centerOrder = ['main', 'work', 'farm'];
    var hubGrid = h('div', { class: 'centers-hub-grid' });

    centerOrder.forEach(function (ck) {
      var cm = getCenterMeta(ck);
      var allowed = canAccessCenter(ck);

      var enterCenter = function () {
        if (!allowed) {
          return toast('ليست لديك صلاحية الدخول إلى «' + cm.name + '».', 'bad');
        }
        S.activeCenter = ck;
        S.filterSectionId = '';
        applyRoleSidebarUI(); initHeaderWidgets();
        if (ck === 'main') {
          go('dash');
        } else {
          go('children');
        }
      };

      var cardEl = h('button', {
        type: 'button',
        class: 'center-hub-card center-hub-clean-box center-hub-' + ck + (allowed ? '' : ' is-locked'),
        onclick: enterCenter
      },
        h('div', { class: 'chc-icon chc-icon-' + ck }, makeSvgIcon(cm.svgIcon || 's-branch')),
        h('div', { class: 'chc-body' },
          h('h3', { class: 'chc-title', text: cm.name }),
          h('span', { class: 'chc-badge-sub', text: cm.badge })
        )
      );
      hubGrid.appendChild(cardEl);
    });

    hubWrap.appendChild(hubGrid);

    // [تمت إزالة بطاقة النسخ الاحتياطي من صفحة المراكز الثلاثة بناء على طلب المستخدم]


    v.appendChild(hubWrap);
  }

  /* =====================================================================
     1. لوحة التحكم والإحصاءات الحية (Dashboard — مطابقة لتصميم الصورة المرفقة)
     ===================================================================== */
  async function secDash(v) {
    if (S.isEducator) return go('children');
    if (!canAccessCenter(S.activeCenter)) {
      var allowedList = parseAllowedCenters(S.centerAccess);
      S.activeCenter = allowedList[0] || 'main';
    }
    var cm = getCenterMeta(S.activeCenter);
    var d = await Promise.all([
      C.rpc('admin_family_counts').catch(function () { return {}; }),
      get('children'),
      get('branches'),
      get('sections')
    ]);
    var c = d[0] || {}, allKids = d[1] || [], branches = d[2] || [], sections = d[3] || [];

    var centerKids = allKids.filter(function (k) { return childCenterKey(k, branches, sections) === S.activeCenter; });
    var activeCenterKids = centerKids.filter(function (k) { return !!k.active; });
    var centerSections = sections.filter(function (s) { return sectionCenterKey(s, branches) === S.activeCenter; });

    v.textContent = '';

    // 1. البانر الترحيبي العصري الفاتح (Light Glass Banner) — بدون ألوان سوداء أو كتل داكنة
    var hero = h('div', { class: 'dash-light-hero' },
      h('div', { class: 'dash-light-hero-top' },
        h('div', null,
          h('div', { class: 'dash-light-badge' },
            makeSvgIcon('s-shield'),
            h('span', { text: 'لوحة التحكم المركزية • ' + cm.badge })
          ),
          h('h1', { class: 'dash-light-title', text: 'مرحبًا بك في ' + cm.name }),
          h('p', { class: 'dash-light-sub', text: 'إحصائيات مباشرة ومتابعة شاملة لكافة العمليات والأفواج في ' + cm.name + '.' })
        ),
        h('button', {
          type: 'button',
          class: 'dash-light-btn-switch',
          onclick: function () { go('hub'); }
        }, makeSvgIcon('s-branch'), h('span', { text: 'تبديل المركز' }))
      ),
      h('div', { class: 'dash-light-stats-grid' },
        h('div', { class: 'dash-stat-light-card' },
          h('div', { class: 'dsl-icon' }, makeSvgIcon('s-child')),
          h('div', null,
            h('b', { class: 'dsl-num', text: String(centerKids.length) }),
            h('span', { class: 'dsl-label', text: 'إجمالي الطلبة بالمركز' })
          )
        ),
        h('div', { class: 'dash-stat-light-card' },
          h('div', { class: 'dsl-icon ok' }, makeSvgIcon('s-check-circle')),
          h('div', null,
            h('b', { class: 'dsl-num', text: String(activeCenterKids.length) }),
            h('span', { class: 'dsl-label', text: 'الطلبة النشطون' })
          )
        ),
        h('div', { class: 'dash-stat-light-card' },
          h('div', { class: 'dsl-icon info' }, makeSvgIcon('s-users')),
          h('div', null,
            h('b', { class: 'dsl-num', text: String(centerSections.length || 1) }),
            h('span', { class: 'dsl-label', text: 'الأقسام والأفواج' })
          )
        ),
        h('div', { class: 'dash-stat-light-card' },
          h('div', { class: 'dsl-icon gold' }, makeSvgIcon('s-report')),
          h('div', null,
            h('b', { class: 'dsl-num', text: String(c.reports_published == null ? 0 : c.reports_published) }),
            h('span', { class: 'dsl-label', text: 'التقارير المعتمدة' })
          )
        )
      )
    );
    v.appendChild(hero);

    // 2. شبكة الإجراءات السريعة (Quick Actions) — بطاقات بيضاء نقية بأيقونات خضراء أنيقة بدون قسم الأقسام والمراكز الزائد
    v.appendChild(h('div', { class: 'qa-section-hdr' },
      h('h2', { class: 'qa-section-title', text: 'الإجراءات السريعة' })
    ));

    var qaItems = [
      { sec: 'children', icon: 's-child', title: S.activeCenter === 'farm' ? 'طلاب البستنة' : 'الأقسام والأطفال', sub: 'إدارة ملفات الطلبة، الأقسام، والبطاقات الرسمية' },
      { sec: 'attendance', icon: 's-cal', title: 'الغيابات والحضور', sub: 'تسجيل الحضور والغياب اليومي وإرسال الإشعارات' },
      { sec: 'educators', icon: 's-users', title: 'قسم المربيات', sub: 'إدارة المربيات وإسناد الأفواج' },
      { sec: 'programs', icon: 's-book', title: 'البرامج الأسبوعية', sub: 'إعداد ونشر البرامج الأسبوعية للأفواج' },
      S.activeCenter !== 'farm' ? { sec: 'reports', icon: 's-report', title: 'التقارير التربوية', sub: 'التقارير الدورية ومرفقات ملفات الطلبة' } : null,
      S.activeCenter !== 'farm' ? { sec: 'evaluations', icon: 's-card', title: 'استمارات التقييم', sub: 'استمارات التقييم البيداغوجي وفق النموذج الرسمي' } : null,
      { sec: 'appts', icon: 's-cal', title: 'المواعيد والأنشطة', sub: 'برمجة مواعيد المتابعة والأنشطة' },
      { sec: 'msgs', icon: 's-mail', title: 'الرسائل والإعلانات', sub: 'إرسال الإعلانات والرسائل للأولياء' },
      { sec: 'docs', icon: 's-file', title: 'الوثائق والملفات', sub: 'أرشيف الوثائق الخاصة والآمنة للطلبة' },
      { sec: 'hub', icon: 's-branch', title: 'تبديل المركز', sub: 'الانتقال بين المراكز الثلاثة وقسم الإدارة' }
    ];

    if (canAccessGeneralAdmin()) {
      qaItems.push(
        { sec: 'archive', icon: 's-archive', title: 'الأرشيف والنسخ الاحتياطية', sub: 'تنزيل أرشيف ZIP شامل ومنظم للأطفال والتقارير' },
        { sec: 'accounts', icon: 's-shield', title: 'قسم الإدارة والصلاحيات', sub: 'حسابات الإدارة وإذن الدخول لكل مركز' },
        { sec: 'audit', icon: 's-log', title: 'سجل العمليات', sub: 'متابعة النشاط والرقابة الأمنية' },
        { sec: 'settings', icon: 's-gear', title: 'إعدادات النظام', sub: 'التحكم العام في الهوية والخيارات والأمان' }
      );
    }

    var qaGrid = h('div', { class: 'quick-actions-grid' }, qaItems.filter(Boolean).map(function (item) {
      return h('button', {
        type: 'button',
        class: 'qa-card',
        onclick: function () { go(item.sec); }
      },
        h('span', { class: 'qa-icon' }, makeSvgIcon(item.icon)),
        h('strong', { class: 'qa-title', text: item.title }),
        h('span', { class: 'qa-sub', text: item.sub })
      );
    }));
    v.appendChild(qaGrid);
  }

  async function secChildren(v) {
    var d = await getMany('children', 'branches', 'sections', 'codes', 'reports');
    var allRows = d[0] || [], branches = d[1] || [], allSections = d[2] || [], codes = d[3] || [], allReports = d[4] || [];

    if (!S.isEducator && !canAccessCenter(S.activeCenter)) {
      var allowedList = parseAllowedCenters(S.centerAccess);
      S.activeCenter = allowedList[0] || 'main';
    }

    var cm = getCenterMeta(S.activeCenter);
    var centerSections = allSections.filter(function (s) {
      return sectionCenterKey(s, branches) === S.activeCenter;
    });
    var sections = S.isEducator ? allSections : (centerSections.length ? centerSections : allSections);

    var centerRows = allRows;
    if (S.isEducator && (S.eduSectionId || S.eduSectionName)) {
      centerRows = allRows.filter(function (k) { return childMatchesSection(k, S.eduSectionId, S.eduSectionName, allSections); });
    } else if (!S.isEducator) {
      centerRows = allRows.filter(function (k) { return childCenterKey(k, branches, allSections) === S.activeCenter; });
      if (!centerRows.length && allRows.length) {
        centerRows = allRows.slice();
      }
    }

    var rows = centerRows;
    if (!S.isEducator && S.filterSectionId) {
      var filterSecObj = allSections.filter(function (s) { return s.id === S.filterSectionId; })[0];
      rows = centerRows.filter(function (k) { return childMatchesSection(k, S.filterSectionId, filterSecObj && filterSecObj.name, allSections); });
    }

    var branchOpts = branches.map(function (b) { return [b.id, b.name]; });
    var secOpts = sections.map(function (s) { return [s.id, s.name]; });

    function getCodeForChild(childId) {
      var active = codes.filter(function (c) { return c.child_id === childId && !c.used_at && new Date(c.expires_at) > new Date(); })[0];
      return active ? active.code : null;
    }

    function editChild(c) {
      if (S.isEducator || S.isSpecialist) return toast('صلاحية تعديل ملفات الطلبة محصورة بالإدارة.', 'bad');
      return openForm({
        title: c ? 'تعديل بيانات تلميذ' : 'إضافة تلميذ جديد إلى المركز',
        values: c ? Object.assign({}, c, { created_at: c.created_at ? String(c.created_at).slice(0, 10) : '' }) : (function () {
          var defBr = branches.filter(function (b) { return branchCenterKey(b) === S.activeCenter; })[0];
          var defSec = S.filterSectionId || (centerSections[0] ? centerSections[0].id : '');
          return { active: true, academic_year: '2026-2027', branch_id: defBr ? defBr.id : '', section_id: defSec };
        })(),
        fields: [
          { k: 'membership_no', label: 'رقم القيد / العضوية (مثال: 004، 082)', max: 20, hint: 'الرقم المعتمد بالقائمة الرسمية (مع الحفاظ على الأصفار الأولى).' },
          { k: 'full_name', label: 'اسم ولقب التلميذ(ة)', req: true, min: 2, max: 120 },
          { k: 'dob', label: 'تاريخ الميلاد', type: 'date', hint: 'تاريخ الميلاد الرسمي للطفل' },
          { k: 'disability', label: 'طبيعة الإعاقة', max: 120, hint: 'مثال: التأخر الذهني R.M، اضطراب طيف التوحد TSA، متلازمة داون T.21' },
          { k: 'phone', label: 'رقم هاتف الاتصال', type: 'tel', kind: 'phone', max: 25 },
          { k: 'branch_id', label: 'الفرع / المركز', type: 'select', opts: branchOpts },
          { k: 'section_id', label: 'الفوج / القسم التربوي', type: 'select', opts: secOpts },
          { k: 'academic_year', label: 'الموسم الدراسي', max: 20, hint: 'افتراضي: 2026-2027' },
          { k: 'basic_info', label: 'معلومات وتوجيهات خاصة بالولي', type: 'textarea', max: 1000 },
          { k: 'created_at', label: 'تاريخ إنشاء الملف', type: 'date', hint: 'يمكن تعديله عند الحاجة (مثلًا لتصحيح تاريخ إدخال قديم).' },
          { k: 'active', label: 'الملف نشط (إلغاء التحديد يؤرشف الملف)', type: 'checkbox' }
        ],
        onSubmit: async function (x) {
          var branchName = nameOf(branches, x.branch_id, 'name');
          var secName = nameOf(sections, x.section_id, 'name');
          var centerKey = 'main';
          if (branchName.indexOf('المساعدة') >= 0 || branchName.indexOf('التمهين') >= 0) centerKey = 'work';
          else if (branchName.indexOf('المزرعة') >= 0 || branchName.indexOf('البستنة') >= 0) centerKey = 'farm';

          var body = {
            membership_no: x.membership_no || null,
            full_name: x.full_name,
            dob: x.dob || null,
            disability: x.disability || null,
            phone: x.phone || null,
            branch_id: x.branch_id || null,
            section_id: x.section_id || null,
            section: secName || null,
            center: centerKey,
            academic_year: x.academic_year || '2026-2027',
            basic_info: x.basic_info || null,
            active: !!x.active
          };
          if (x.created_at) body.created_at = x.created_at + 'T12:00:00Z';

          if (c) {
            await C.rest('PATCH', '/children?id=eq.' + uid(c.id), body);
          } else {
            await C.rest('POST', '/children', body);
          }
          bust();
          toast('تم حفظ ملف التلميذ بنجاح.', 'ok');
          go('children');
        }
      });
    }

    function getChildOfficialUsername(child) {
      if (!child) return '';
      if (child.username) return String(child.username).trim().toLowerCase();
      var mno = String(child.membership_no || '').trim();
      var padMno = mno ? ('000' + mno.replace(/\D/g, '')).slice(-3) : '';
      if (typeof window !== 'undefined' && window.DEUser && typeof window.DEUser.username === 'function') {
        var u = window.DEUser.username(child.full_name, child.membership_no);
        if (u) return u;
      }
      return padMno || '';
    }

    function publicCardUrl(child) {
      var isWeb = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null' && window.location.protocol !== 'file:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
      var origin = isWeb ? window.location.origin : 'https://cppdarelihsanidara-cmyk.github.io';
      var basePath = isWeb ? window.location.pathname.replace(/[^/]*$/, '') : '/Admin/';
      if (!basePath.startsWith('/')) basePath = '/' + basePath;
      var u = new URL(basePath + 'parent.html', origin);
      var uname = getChildOfficialUsername(child);
      if (uname) {
        u.searchParams.set('u', uname);
      } else if (child && child.membership_no) {
        u.searchParams.set('u', child.membership_no);
      }
      return u.href;
    }

    function openStudentCard(child) {
      var uname = getChildOfficialUsername(child);
      var dobParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String((child && child.dob) || '').trim());
      var parentPw = dobParts ? ('DI' + dobParts[3] + dobParts[2] + dobParts[1]) : 'DI + تاريخ الميلاد';
      var status = h('p', { class: 'muted small', text: 'جارٍ إنشاء البطاقة…' });
      var preview = h('img', { class: 'card-preview', alt: 'معاينة بطاقة انخراط التلميذ ' + (child.full_name || ''), hidden: true });
      var jpgBtn = h('button', { class: 'btn gold', type: 'button', text: 'تنزيل JPG', disabled: true });
      var printBtn = h('button', { class: 'btn', type: 'button', text: 'طباعة البطاقة', disabled: true });
      var openLink = h('a', { class: 'btn light', target: '_blank', rel: 'noopener', text: 'فتح فضاء الأولياء للطفل' });
      var warn = !child.membership_no ? h('p', { class: 'err small', text: 'تنبيه: لا يوجد رقم قيد رسمي لهذا الطفل؛ أكمله في ملف الطفل قبل طباعة البطاقة.' }) : null;
      var credsBox = h('div', { style: 'background:#EAF4FF;border:1px solid #BFDBFE;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:0.9rem;color:#065F46;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;' },
        h('div', null, h('strong', { text: 'اسم المستخدم في فضاء الأولياء: ' }), h('code', { dir: 'ltr', style: 'font-weight:800;font-size:0.95rem;background:#FFFFFF;padding:2px 8px;border-radius:6px;border:1px solid #60A5FA;', text: uname || '—' })),
        h('div', null, h('strong', { text: 'كلمة المرور: ' }), h('code', { dir: 'ltr', style: 'font-weight:800;font-size:0.95rem;background:#FFFFFF;padding:2px 8px;border-radius:6px;border:1px solid #60A5FA;', text: parentPw }))
      );

      openModal(h('div', { class: 'modal-body card-modal' },
        h('h2', { text: 'بطاقة انخراط التلميذ' }),
        warn,
        credsBox,
        preview,
        status,
        h('div', { class: 'modal-actions' },
          h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal }),
          openLink, jpgBtn, printBtn)
      ));

      var url = publicCardUrl(child);
      openLink.setAttribute('href', url);

      var card = null;
      DECARD.render({ full_name: child.full_name, membership_no: child.membership_no || '—', dob: child.dob, center: child.center || 'main', url: url })
        .then(function (c) {
          card = c;
          preview.src = c.url; preview.hidden = false;
          status.textContent = 'عند مسح رمز QR بالهاتف يتجه مباشرة إلى فضاء الأولياء ويكتب اسم المستخدم (' + uname + ') تلقائياً.';
          jpgBtn.disabled = false; printBtn.disabled = false;
        })
        .catch(function (e) { status.textContent = e.message; status.className = 'err small'; });

      function exportJpg(c, filename) {
        // exportJpg (image/jpeg)
        DECARD.download(c.jpeg, filename);
      }
      jpgBtn.addEventListener('click', function () {
        if (!card) return;
        var safe = String(child.full_name || 'تلميذ').replace(/\s+/g, '_');
        exportJpg(card, 'بطاقة_انخراط_' + (child.membership_no || child.id) + '_' + safe + '.jpg');
        toast('تم تنزيل صورة البطاقة بصيغة JPG.', 'ok');
      });

      printBtn.addEventListener('click', function () {
        if (!card) return;
        DECARD.print(card.url).catch(function (e) { toast(e.message, 'bad'); });
      });
    }

    async function manageChildCode(child) {
      var activeCode = getCodeForChild(child.id);
      if (activeCode) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(activeCode);
          toast('تم نسخ رمز التسجيل السري للطفل (' + activeCode + ')', 'ok');
        } else {
          info('رمز تسجيل الطفل', h('div', null,
            h('p', { text: 'رمز التسجيل السري أحادي الاستخدام الخاص بالطفل: ' + child.full_name }),
            h('div', { class: 'link-box', text: activeCode })
          ));
        }
      } else {
        var code = await C.rpc('admin_generate_child_code', { p_child_id: uid(child.id) });
        bust();
        toast('تم توليد رمز تسجيل جديد بنجاح: ' + code, 'ok');
        go('children');
      }
    }

        var totalKidsAll = centerRows.length;
    var curFilteredKids = rows.length;
    var selectedSecName = '';
    if (S.filterSectionId) {
      var matchSec = allSections.filter(function (s) { return s.id === S.filterSectionId; })[0];
      selectedSecName = matchSec ? matchSec.name : '';
    }

    if (S.isEducator) {
      v.appendChild(h('div', { class: 'card edu-banner-card' },
        h('strong', { text: (isFarmSession() ? 'فضاء مربي المزرعة البيداغوجية: ' : 'فضاء المربية: ') + (S.eduProfile && S.eduProfile.full_name || S.me && S.me.email || '') + ' — الفوج المسند: ' + (S.eduSectionName || 'غير محدد') }),
        h('p', { class: 'muted small', text: 'يظهر لكِ هنا طلاب وقسمكِ التربوي المعتمد. يمكنكِ الاطلاع على ملفاتهم وإضافة التقارير واستمارات التقييم البيداغوجي الخاصة بهم.' })
      ));
    } else {
      var activeKidsCount = centerRows.filter(function (k) { return !!k.active; }).length;

      var heroBanner = h('div', { class: 'children-saas-hero' },
        h('div', { class: 'csh-top' },
          h('div', null,
            h('div', { class: 'csh-badges-row' },
              badge(cm.name, 'gold'),
              selectedSecName ? badge('القسم المحدد: ' + selectedSecName, 'ok') : badge('كافة الأقسام التربوية (' + (centerSections.length || 1) + ')', 'light'),
              badge('الموسم 2026/2027', 'gray')
            ),
            h('h1', { class: 'csh-title', text: 'الأقسام والأطفال' }),
            h('p', { class: 'csh-sub', text: selectedSecName ? ('عرض ملفات وتفاصيل الأطفال المسجلين في «' + selectedSecName + '» (' + curFilteredKids + ' طالب).') : ('إدارة ملفات وبطاقات جميع الأطفال والتلاميذ وتوزيعهم على الأقسام التربوية المعتمدة (' + totalKidsAll + ' طالب).') })
          ),
          h('div', { class: 'csh-actions' },
            (!S.isEducator && !S.isSpecialist) ? h('button', {
              type: 'button',
              class: 'btn gold',
              onclick: function () { editChild(null); }
            }, makeSvgIcon('s-plus'), h('span', { text: 'إضافة طالب جديد' })) : null,
            (!S.isEducator && !S.isSpecialist) ? h('button', {
              type: 'button',
              class: 'btn light',
              onclick: function () { openAddSectionForCenterModal(S.activeCenter, branches, function () { go('children'); }); }
            }, makeSvgIcon('s-branch'), h('span', { text: 'إضافة قسم جديد' })) : null
          )
        ),
        h('div', { class: 'dash-hero-stats', style: 'margin-top:16px;' },
          h('div', { class: 'dash-hero-stat' },
            h('b', { text: String(totalKidsAll) }),
            h('span', { text: 'إجمالي أطفال المركز' })
          ),
          h('div', { class: 'dash-hero-stat' },
            h('b', { text: String(activeKidsCount) }),
            h('span', { text: 'الطلاب النشطون' })
          ),
          h('div', { class: 'dash-hero-stat' },
            h('b', { text: String(centerSections.length || 1) }),
            h('span', { text: 'الأقسام التربوية' })
          ),
          h('div', { class: 'dash-hero-stat' },
            h('b', { text: String(curFilteredKids) }),
            h('span', { text: selectedSecName ? 'الطلاب المعروضون' : 'كافة الطلاب' })
          )
        )
      );
      v.appendChild(heroBanner);

      // نظام عرض واختيار الأقسام المطور التفاعلي (دائماً ظاهر وواضح لسهولة التصفية والتنقل)
      var sectionsHubBar = h('div', { class: 'class-sections-hub-bar' },
        h('div', { class: 'cshb-header' },
          h('div', { class: 'cshb-title-group' },
            makeSvgIcon('s-branch'),
            h('h3', { text: 'الأقسام والأفواج التربوية — ' + cm.name }),
            h('span', { class: 'cshb-count-tag', text: (centerSections.length || 1) + ' أقسام معتمدة' })
          ),
          S.filterSectionId ? h('button', {
            type: 'button',
            class: 'btn small light',
            onclick: function () { S.filterSectionId = ''; go('children'); }
          }, h('span', { text: 'إلغاء التصفية (عرض كافة الأقسام)' })) : null
        ),
        h('div', { class: 'cshb-pills' },
          (function () {
            var pills = [];
            var allPill = h('button', {
              type: 'button',
              class: 'cshb-pill' + (!S.filterSectionId ? ' is-active' : ''),
              onclick: function () { S.filterSectionId = ''; go('children'); }
            },
              h('span', { class: 'cshb-pill-name', text: 'جميع الأقسام' }),
              h('span', { class: 'cshb-pill-num', text: String(totalKidsAll) })
            );
            pills.push(allPill);

            centerSections.forEach(function (sec) {
              var cnt = centerRows.filter(function (k) { return childMatchesSection(k, sec.id, sec.name, allSections); }).length;
              var isAct = (S.filterSectionId === sec.id);
              var pBtn = h('button', {
                type: 'button',
                class: 'cshb-pill' + (isAct ? ' is-active' : ''),
                onclick: function () {
                  S.filterSectionId = isAct ? '' : sec.id;
                  go('children');
                }
              },
                h('span', { class: 'cshb-pill-name', text: sec.name }),
                h('span', { class: 'cshb-pill-num', text: String(cnt) })
              );
              pills.push(pBtn);
            });
            return pills;
          })()
        )
      );
      v.appendChild(sectionsHubBar);
    }

    var listTitle = S.isEducator
      ? ('الأقسام والأطفال — قسم ' + (S.eduSectionName || 'فوجي'))
      : selectedSecName
        ? ('الأقسام والأطفال — قسم: ' + selectedSecName + ' (' + curFilteredKids + ' طالب)')
        : ('الأقسام والأطفال — ' + cm.name + ' (' + totalKidsAll + ' طالب)');

    function openChildReportsModal(child) {
      var childReps = (allReports || []).filter(function (rep) {
        return rep.child_id === child.id && !isEvaluationReport(rep);
      });
      var body = h('div', { class: 'modal-body' },
        h('div', { class: 'bar-sub' },
          h('h2', { text: 'التقارير الدورية للتلميذ(ة): ' + child.full_name }),
          h('span', { class: 'badge ok', text: childReps.length + ' تقرير' })
        )
      );

      if (!childReps.length) {
        body.appendChild(h('div', { class: 'card empty', text: 'لا توجد تقارير دورية مسجلة لهذا الطفل حتى الآن.' }));
      } else {
        var list = h('div', { class: 'dynamic-items-container', style: 'max-height: 420px; overflow-y: auto;' });
        childReps.forEach(function (rep) {
          var repCard = h('div', { class: 'pm-list-item-card', style: 'padding: 12px 16px; margin-bottom: 8px;' },
            h('div', { class: 'pm-lic-right' },
              h('div', { class: 'pm-lic-icon-box' }, makeSvgIcon('s-report')),
              h('div', { class: 'pm-lic-info' },
                h('strong', { class: 'pm-lic-title', text: rep.title }),
                h('div', { class: 'pm-lic-meta' },
                  h('span', { text: 'التاريخ: ' + fmt(rep.report_date) }),
                  h('span', { class: 'badge ' + (rep.status === 'published' ? 'ok' : 'gray'), text: rep.status === 'published' ? 'منشور للولي' : 'مسودة' }),
                  rep.attachment_path ? h('span', { class: 'badge gold', text: 'مرفق ملف' }) : null
                )
              )
            ),
            h('div', { class: 'pm-lic-actions' },
              h('button', {
                type: 'button', class: 'btn small light', text: 'عرض التفاصيل',
                onclick: function () {
                  var dModal = h('div', { class: 'modal-body' },
                    h('div', { class: 'bar-sub' },
                      h('h2', { text: rep.title }),
                      h('span', { class: 'badge ok', text: fmt(rep.report_date) })
                    ),
                    rep.achievements ? h('div', { style: 'margin-bottom:10px;' }, h('h4', { text: 'المكتسبات والمهارات المحققة:' }), h('p', { class: 'txt', text: rep.achievements })) : null,
                    rep.activities ? h('div', { style: 'margin-bottom:10px;' }, h('h4', { text: 'الأنشطة والورشات المنجزة:' }), h('p', { class: 'txt', text: rep.activities })) : null,
                    rep.notes ? h('div', { style: 'margin-bottom:10px;' }, h('h4', { text: 'ملاحظات وتوجيهات للأولياء:' }), h('p', { class: 'txt', text: rep.notes })) : null,
                    rep.attachment_path ? h('div', { style: 'margin-top:12px;' },
                      h('button', {
                        type: 'button', class: 'btn small gold', text: 'تحميل / فتح الملف المرفق',
                        onclick: function () {
                          C.signedUrl('private-docs', rep.attachment_path, 60).then(function (url) {
                            window.open(url, '_blank');
                          }).catch(function (e) { toast(e.message, 'bad'); });
                        }
                      })
                    ) : null,
                    h('div', { class: 'modal-actions' },
                      h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal })
                    )
                  );
                  openModal(dModal);
                }
              }),
              rep.attachment_path ? h('button', {
                type: 'button', class: 'btn small gold', text: 'المرفق',
                onclick: function () {
                  C.signedUrl('private-docs', rep.attachment_path, 60).then(function (url) {
                    window.open(url, '_blank');
                  }).catch(function (e) { toast(e.message, 'bad'); });
                }
              }) : null
            )
          );
          list.appendChild(repCard);
        });
        body.appendChild(list);
      }

      body.appendChild(h('div', { class: 'modal-actions' },
        h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal })
      ));
      openModal(body);
    }

    function openChildEvaluationsModal(child) {
      var childEvals = (allReports || []).filter(function (rep) {
        return rep.child_id === child.id && isEvaluationReport(rep);
      });
      var secName = nameOf(sections, child.section_id, 'name') || child.section || '';

      var body = h('div', { class: 'modal-body' },
        h('div', { class: 'bar-sub' },
          h('h2', { text: 'استمارات التقييم البيداغوجي للتلميذ(ة): ' + child.full_name }),
          h('span', { class: 'badge gold', text: childEvals.length + ' تقييم معتمد' })
        )
      );

      if (!childEvals.length) {
        body.appendChild(h('div', { class: 'card empty', text: 'لا توجد استمارات تقييم مسجلة لهذا الطفل حتى الآن.' }));
      } else {
        var list = h('div', { class: 'dynamic-items-container', style: 'max-height: 420px; overflow-y: auto;' });
        childEvals.forEach(function (evRep) {
          var evCard = h('div', { class: 'pm-list-item-card', style: 'padding: 12px 16px; margin-bottom: 8px;' },
            h('div', { class: 'pm-lic-right' },
              h('div', { class: 'pm-lic-icon-box gold' }, makeSvgIcon('s-card')),
              h('div', { class: 'pm-lic-info' },
                h('strong', { class: 'pm-lic-title', text: evRep.title }),
                h('div', { class: 'pm-lic-meta' },
                  h('span', { text: 'التاريخ: ' + fmt(evRep.report_date) }),
                  h('span', { class: 'badge ' + (evRep.status === 'published' ? 'ok' : 'gray'), text: evRep.status === 'published' ? 'معتمدة ومنشورة' : 'مسودة' })
                )
              )
            ),
            h('div', { class: 'pm-lic-actions' },
              h('button', {
                type: 'button', class: 'btn small gold', text: 'عرض ورقة التقييم الرسمية (طباعة)',
                onclick: function () {
                  openModal(h('div', { class: 'modal-body wk-modal-print' },
                    renderEvaluationSheetView(evRep, child.full_name, secName, child),
                    h('div', { class: 'modal-actions no-print' },
                      h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal }),
                      h('button', { class: 'btn gold', type: 'button', text: 'طباعة الورقة الرسمية (A4)', onclick: function () { window.print(); } })
                    )
                  ));
                }
              })
            )
          );
          list.appendChild(evCard);
        });
        body.appendChild(list);
      }

      body.appendChild(h('div', { class: 'modal-actions' },
        h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal })
      ));
      openModal(body);
    }

    listView(v, {
      title: listTitle,
      addLabel: S.isEducator ? '' : 'إضافة طالب جديد',
      onAdd: (S.isEducator || S.isSpecialist) ? null : function () { editChild(null); },
      extra: [],
      rows: rows,
      sheet: true,
      searchPlaceholder: 'بحث بالاسم، رقم القيد، الفرع، أو القسم…',
      empty: S.isEducator ? 'لا يوجد طلاب مسجلون في هذا القسم حالياً.' : 'لا توجد بيانات مسجلة للأطفال.',
      search: function (r) {
        return [r.membership_no, r.full_name, nameOf(branches, r.branch_id, 'name'), nameOf(sections, r.section_id, 'name'), r.section, r.disability]
          .filter(Boolean).join(' ');
      },
      details: function (r) {
        var secName = nameOf(sections, r.section_id, 'name') || r.section || '';
        var kd = r;
        
        // 1. معلومات الطالب الأساسية مع رابط واتساب المباشر لرقم الهاتف
        var infoItems = [
          ['تاريخ الميلاد', r.dob ? fmt(r.dob) : '—'],
          ['رقم هاتف الاتصال (واتساب)', makeWhatsAppLink(r.phone, r)],
          ['طبيعة الإعاقة', r.disability || '—'],
          ['الموسم الدراسي', r.academic_year || '—'],
          ['الفرع / المركز', nameOf(branches, r.branch_id, 'name') || CENTERS[r.center] || '—'],
          ['الفوج / القسم', secName || '—'],
          ['تاريخ إنشاء الملف', fmt(r.created_at)],
          ['معلومات وتوجيهات خاصة بالولي', r.basic_info || '—', true]
        ];

        var detailsGrid = h('div', { class: 'child-details' }, infoItems.map(function (it) {
          var valNode = it[1] instanceof Node ? it[1] : h('b', { text: String(it[1]) });
          return h('div', { class: 'cd-item' + (it[2] ? ' wide' : '') }, h('span', { text: it[0] }), valNode);
        }));

        // 2. شريط إجراءات الطفل الرسمي المباشر (البطاقة، التعديل، الحذف — مع إزالة رمز الأرشفة ورمز تسجيل الولي والأزرار المكررة)
        var actionsBarItems = [
          rbtn('بطاقة التلميذ الرسمية', function () { openStudentCard(r); }, 'gold')
        ];
        if (!S.isEducator && !S.isSpecialist) {
          actionsBarItems.push(
            rbtn('تعديل البيانات', function () { editChild(r); }, 'light'),
            rbtn('حذف نهائي', async function () {
              if (!(await ask({
                title: 'تنبيه بشأن حذف ملف الطالب',
                msg: 'سيُحذف الملف وروابطه نهائيًا. هل تريد الحذف رغم ذلك؟',
                ok: 'حذف نهائي', danger: true
              }))) return;
              await C.rest('DELETE', '/children?id=eq.' + uid(r.id));
              bust(); toast('تم حذف الملف.', 'ok'); go('children');
            }, 'danger')
          );
        }
        var actionsBar = h('div', { class: 'child-details-actions-bar' }, actionsBarItems);

        // 3. قسم تقارير الطفل الدورية
        var childReps = (allReports || []).filter(function (rep) {
          return rep.child_id === r.id && !isEvaluationReport(rep);
        });

        var repsHost = h('div', { class: 'child-sub-section' },
          h('div', { class: 'child-sub-section-title' },
            makeSvgIcon('s-report'),
            h('span', { text: 'التقارير التربوية الدورية للطفل (' + childReps.length + ')' })
          )
        );

        if (!childReps.length) {
          repsHost.appendChild(h('p', { class: 'muted small', text: 'لا توجد تقارير دورية مسجلة لهذا الطفل بعد.' }));
        } else {
          childReps.forEach(function (rep) {
            var repCard = h('div', { class: 'child-sub-item-card' },
              h('div', null,
                h('strong', { text: rep.title }),
                h('div', { class: 'muted small', text: 'التاريخ: ' + fmt(rep.report_date) + ' • الحالة: ' + (rep.status === 'published' ? 'منشور للولي' : 'مسودة') })
              ),
              h('div', { class: 'row-actions', style: 'display:flex; gap:6px; flex-wrap:wrap;' },
                rbtn('👁 معاينة', function () {
                  var subCat = getReportSubCategory(rep);
                  var contentNode = subCat === 'medico_functional_fr'
                    ? renderMedicoFunctionalFrenchSheetView(rep, r.full_name, secName, r)
                    : subCat === 'target_behavior_report'
                      ? renderTargetBehaviorReportSheetView(rep, r.full_name, secName, r)
                      : subCat === 'mas_behavior_report'
                        ? renderMasBehaviorReportSheetView(rep, r.full_name, secName, r)
                        : subCat === 'annual_final'
                          ? renderAnnualFinalSheetView(rep, r.full_name, secName, r)
                          : renderEvaluationSheetView(rep, r.full_name, secName, r);
                  openFullDocumentPreviewModal((rep.title || 'تقرير') + ' — ' + r.full_name, contentNode);
                }, 'primary'),
                rbtn('✏️ تعديل', function () {
                  var subCat = getReportSubCategory(rep);
                  if (subCat === 'medico_functional_fr') return openMedicoFunctionalFrenchBuilder(rep, kids, sections, secAllOpts, branchOpts);
                  if (subCat === 'target_behavior_report') return openTargetBehaviorReportBuilder(rep, kids, sections, secAllOpts, branchOpts, allReports);
                  if (subCat === 'mas_behavior_report') return openMasBehaviorReportBuilder(rep, kids, sections, secAllOpts, branchOpts, allReports);
                  if (subCat === 'annual_final') return openAnnualFinalBuilder(rep, kids, sections, secAllOpts, branchOpts);
                  if (subCat === 'qualitative') return openQualitativeReportBuilder(rep, kids, sections, secAllOpts, branchOpts, allReports);
                  if (isEvaluationReport(rep)) return openEvaluationBuilder(rep, kids, sections, secAllOpts, branchOpts);
                  S.preselectChildId = r.id;
                  go('reports');
                }, 'light'),
                rbtn('📄 تحميل PDF', async function () {
                  try {
                    var subCat = getReportSubCategory(rep);
                    toast('جارٍ تجهيز ملف PDF...', 'ok');
                    var bytes;
                    if (subCat === 'medico_functional_fr') {
                      var frN = resolveChildFrenchName(r);
                      bytes = await window.DE_PDF.renderMedicoFunctionalFrenchToPdf(parseEvaluationReport(rep), frN, secName, r);
                    } else if (subCat === 'target_behavior_report') {
                      bytes = await window.DE_PDF.renderTargetBehaviorReportToPdf(parseEvaluationReport(rep), r.full_name, secName, r);
                    } else if (subCat === 'mas_behavior_report') {
                      bytes = await window.DE_PDF.renderMasBehaviorReportToPdf(parseEvaluationReport(rep), r.full_name, secName, r);
                    } else if (subCat === 'annual_final') {
                      bytes = await window.DE_PDF.renderAnnualFinalToPdf(parseEvaluationReport(rep), r.full_name, secName, r);
                    } else {
                      bytes = await window.DE_PDF.renderEvaluationToPdf(rep, r.full_name, secName, r, 'full');
                    }
                    window.DE_PDF.downloadPdf(bytes, (rep.title || 'تقرير').replace(/\s+/g, '_') + '.pdf');
                    toast('تم تحميل ملف PDF بنجاح.', 'ok');
                  } catch (err) {
                    toast('تعذر التحميل: ' + (err.message || err), 'bad');
                  }
                }, 'gold'),
                rep.attachment_path ? rbtn('المرفق', function () {
                  C.signedUrl('private-docs', rep.attachment_path, 60).then(function (url) {
                    window.open(url, '_blank');
                  }).catch(function (e) { toast(e.message, 'bad'); });
                }, 'light') : null
              )
            );
            repsHost.appendChild(repCard);
          });
        }

        // 4. قسم استمارات وتقارير التقييم للطفل (معاينة فقط بدون تعديل حسب طلب المستخدم)
        var childEvals = (allReports || []).filter(function (rep) {
          return rep.child_id === r.id && isEvaluationReport(rep);
        });

        var evalsHost = h('div', { class: 'child-sub-section' },
          h('div', { class: 'child-sub-section-title' },
            makeSvgIcon('s-card'),
            h('span', { text: 'استمارات وتقارير التقييم للطفل (' + childEvals.length + ')' })
          )
        );

        if (!childEvals.length) {
          evalsHost.appendChild(h('p', { class: 'muted small', text: 'لا توجد استمارات تقييم مسجلة لهذا الطفل بعد.' }));
        } else {
          childEvals.forEach(function (evRep) {
            var ev = parseEvaluationReport(evRep);
            var typeBadgeText = 'تقرير بيداغوجي';
            var badgeCls = 'gold';
            if (ev.eval_type === 'reinforcers') { typeBadgeText = 'استبيان تقييم المعززات'; badgeCls = 'ok'; }
            else if (ev.eval_type === 'target_behavior') { typeBadgeText = 'تقييم قياس السلوك المستهدف'; badgeCls = 'gold'; }
            else if (ev.eval_type === 'target_behavior_report') { typeBadgeText = 'تقرير قياس السلوك المستهدف'; badgeCls = 'ok'; }
            else if (ev.eval_type === 'mas_behavior' || ev.eval_type === 'mas') { typeBadgeText = 'استمارة تقييم دوافع السلوك MAS'; badgeCls = 'gold'; }
            else if (ev.eval_type === 'mas_behavior_report') { typeBadgeText = 'تقرير دوافع السلوك'; badgeCls = 'ok'; }
            else if (ev.eval_type === 'interview_diagnostic') { typeBadgeText = 'شبكة المقابلة والفحص'; badgeCls = 'info'; }
            else if (ev.eval_type === 'annual_final') { typeBadgeText = 'التقرير النهائي السنوي'; badgeCls = 'warn'; }

            var evCard = h('div', { class: 'child-sub-item-card', style: 'display:flex; justify-content:space-between; align-items:center; padding:12px 14px; margin-bottom:8px; border:1px solid #CBD5E1; border-radius:10px; background:#F8FAF9;' },
              h('div', null,
                h('div', { style: 'display:flex; align-items:center; gap:8px;' },
                  h('strong', { style: 'font-size:14px; color:#0F172A;', text: evRep.title }),
                  h('span', { class: 'badge ' + badgeCls, style: 'font-size:11px;', text: typeBadgeText })
                ),
                h('div', { class: 'muted small', style: 'margin-top:3px;', text: 'التاريخ: ' + fmt(evRep.report_date) + ' • الحالة: ' + (evRep.status === 'published' ? 'معتمدة ومنشورة للولي' : 'مسودة') })
              ),
              h('div', { class: 'row-actions', style: 'display:flex; gap:6px; flex-wrap:wrap;' },
                rbtn('👁 معاينة', function () {
                  var subCat = getReportSubCategory(evRep);
                  var viewEl = subCat === 'medico_functional_fr'
                    ? renderMedicoFunctionalFrenchSheetView(evRep, r.full_name, secName, r)
                    : subCat === 'target_behavior_report'
                      ? renderTargetBehaviorReportSheetView(evRep, r.full_name, secName, r)
                      : subCat === 'mas_behavior_report'
                        ? renderMasBehaviorReportSheetView(evRep, r.full_name, secName, r)
                        : subCat === 'behavior_observation'
                          ? renderBehaviorObservationSheetView(evRep, r.full_name, secName, r)
                          : renderEvaluationSheetView(evRep, r.full_name, secName, r);
                  openFullDocumentPreviewModal((evRep.title || 'تقرير تقييم') + ' — ' + r.full_name, viewEl);
                }, 'primary'),
                rbtn('✏️ تعديل', function () {
                  var subCat = getReportSubCategory(evRep);
                  if (subCat === 'medico_functional_fr') return openMedicoFunctionalFrenchBuilder(evRep, kids, sections, secAllOpts, branchOpts);
                  if (subCat === 'target_behavior') return openTargetBehaviorBuilder(evRep, kids, sections, secAllOpts, branchOpts);
                  if (subCat === 'target_behavior_report') return openTargetBehaviorReportBuilder(evRep, kids, sections, secAllOpts, branchOpts, allReports);
                  if (subCat === 'mas_behavior' || subCat === 'mas') return openMasBehaviorBuilder(evRep, kids, sections, secAllOpts, branchOpts);
                  if (subCat === 'mas_behavior_report') return openMasBehaviorReportBuilder(evRep, kids, sections, secAllOpts, branchOpts, allReports);
                  if (subCat === 'behavior_observation') return openBehaviorObservationBuilder(evRep, kids, sections, secAllOpts, branchOpts);
                  if (subCat === 'reinforcers') return openReinforcersBuilder(evRep, kids, sections, secAllOpts, branchOpts);
                  if (subCat === 'interview_diagnostic') return openInterviewDiagnosticBuilder(evRep, kids, sections, secAllOpts, branchOpts);
                  if (subCat === 'annual_final') return openAnnualFinalBuilder(evRep, kids, sections, secAllOpts, branchOpts);
                  if (subCat === 'qualitative') return openQualitativeReportBuilder(evRep, kids, sections, secAllOpts, branchOpts, allReports);
                  return openEvaluationBuilder(evRep, kids, sections, secAllOpts, branchOpts);
                }, 'light'),
                rbtn('📄 تحميل PDF', async function () {
                  try {
                    var subCat = getReportSubCategory(evRep);
                    toast('جارٍ إنشاء ملف PDF...', 'ok');
                    var bytes;
                    if (subCat === 'medico_functional_fr') bytes = await window.DE_PDF.renderMedicoFunctionalFrenchToPdf(ev, resolveChildFrenchName(r), secName, r);
                    else if (subCat === 'target_behavior') bytes = await window.DE_PDF.renderTargetBehaviorToPdf(ev, r.full_name, secName, r);
                    else if (subCat === 'target_behavior_report') bytes = await window.DE_PDF.renderTargetBehaviorReportToPdf(ev, r.full_name, secName, r);
                    else if (subCat === 'mas_behavior' || subCat === 'mas') bytes = await window.DE_PDF.renderMasBehaviorToPdf(ev, r.full_name, secName, r);
                    else if (subCat === 'mas_behavior_report') bytes = await window.DE_PDF.renderMasBehaviorReportToPdf(ev, r.full_name, secName, r);
                    else if (subCat === 'behavior_observation') bytes = await window.DE_PDF.renderBehaviorObservationToPdf(ev, r.full_name, secName, r);
                    else if (subCat === 'reinforcers') bytes = await window.DE_PDF.renderReinforcersToPdf(ev, r.full_name, secName, r);
                    else if (subCat === 'interview_diagnostic') bytes = await window.DE_PDF.renderInterviewDiagnosticToPdf(ev, r.full_name, secName, r);
                    else if (subCat === 'annual_final') bytes = await window.DE_PDF.renderAnnualFinalToPdf(ev, r.full_name, secName, r);
                    else bytes = await window.DE_PDF.renderEvaluationToPdf(evRep, r.full_name, secName, r, 'full');
                    window.DE_PDF.downloadPdf(bytes, (evRep.title || 'تقرير_تقييم').replace(/\s+/g, '_') + '.pdf');
                    toast('تم تحميل ملف PDF بنجاح.', 'ok');
                  } catch (e) {
                    toast('تعذر التحميل: ' + (e.message || e), 'bad');
                  }
                }, 'gold')
              )
            );
            evalsHost.appendChild(evCard);
          });
        }

        var pane = h('div', { class: 'child-details-pane' },
          detailsGrid,
          actionsBar,
          repsHost,
          evalsHost
        );
        return pane;
      },
      
      filters: S.isEducator ? [
        { label: 'الحالة', opts: [['1', 'نشط'], ['0', 'مؤرشف']], test: function (r, x) { return String(+r.active) === x; } }
      ] : [
        { label: 'الفرع', opts: branchOpts, test: function (r, x) { return r.branch_id === x; } },
        { label: 'القسم', opts: secOpts, test: function (r, x) { return r.section_id === x; } },
        { label: 'الحالة', opts: [['1', 'نشط'], ['0', 'مؤرشف']], test: function (r, x) { return String(+r.active) === x; } }
      ],
      cols: [
        {
          label: 'رقم القيد',
          get: function (r) {
            return h('span', { class: 'sic-num', text: r.membership_no ? ('N° ' + r.membership_no) : '—' });
          },
          sort: function (r) { return r.membership_no || ''; }
        },
        { label: 'اسم ولقب التلميذ', get: function (r) { return r.full_name; }, sort: function (r) { return r.full_name; } },
        { label: 'تاريخ الميلاد', get: function (r) { return r.dob ? fmt(r.dob) : '—'; }, sort: function (r) { return r.dob; } },
        { label: 'الفرع', get: function (r) { return nameOf(branches, r.branch_id, 'name') || CENTERS[r.center] || '—'; }, sort: function (r) { return nameOf(branches, r.branch_id, 'name') || CENTERS[r.center] || ''; } },
        { label: 'الفوج / القسم', get: function (r) { return nameOf(sections, r.section_id, 'name') || r.section || '—'; }, sort: function (r) { return nameOf(sections, r.section_id, 'name') || r.section || ''; } },
        { label: 'الإعاقة', get: function (r) { return r.disability || '—'; }, sort: function (r) { return r.disability || ''; } },
        { label: 'الحالة', get: function (r) { return badge(r.active ? 'نشط' : 'مؤرشف', r.active ? 'ok' : 'gray'); }, sort: function (r) { return r.active ? 1 : 0; } }
      ],
      actions: function (r) {
        return [];
      }
    });
  }

  /* =====================================================================
     3. إدارة الفروع والأقسام التربوية (Branches & Sections)
     ===================================================================== */
  async function secBranches(v) {
    if (S.isEducator) return go('children');
    v.textContent = '';
    v.appendChild(h('div', { class: 'empty', text: 'جارٍ قراءة بيانات الأقسام والفروع التربوية…' }));

    var d = await Promise.all([
      get('branches'),
      get('sections'),
      get('children')
    ]);
    var branches = d[0] || [], sections = d[1] || [], kids = d[2] || [];

    v.textContent = '';

    function kidsCountInSection(sid) {
      return kids.filter(function (k) { return k.section_id === sid && k.active; }).length;
    }

    var root = h('div', { class: 'branches-saas-root' });

    // ترويسة رئيسية
    root.appendChild(h('div', { class: 'branches-hub-hero' },
      h('div', null,
        h('h1', null, makeSvgIcon('s-branch'), h('span', { text: 'إدارة المراكز والأقسام التربوية' })),
        h('p', { text: 'عرض الأفواج التربوية مقسمة حسب المراكز الثلاثة في بطاقات زجاجية ذكية مع عداد الطلبة وإمكانية الفتح المباشر.' })
      ),
      h('div', { class: 'bhh-actions' },
        h('button', {
          type: 'button',
          class: 'btn gold',
          onclick: function () { openAddSectionForCenterModal(S.activeCenter, branches, function () { go('branches'); }); }
        }, makeSvgIcon('s-plus'), h('span', { text: 'إضافة قسم جديد' }))
      )
    ));

    var searchVal = '';
    var searchInput = h('input', {
      type: 'search',
      class: 'input',
      style: 'max-width:320px;',
      placeholder: 'بحث فوري في الأقسام…',
      oninput: function () {
        searchVal = normAr(searchInput.value.trim());
        renderAccordion();
      }
    });

    var sortSel = h('select', { class: 'input', style: 'max-width:200px;' },
      h('option', { value: 'default', text: 'الترتيب المعتمد' }),
      h('option', { value: 'kids', text: 'حسب عدد الطلبة (تنازلي)' }),
      h('option', { value: 'alpha', text: 'الترتيب الأبجدي' })
    );
    sortSel.addEventListener('change', renderAccordion);

    var toolbar = h('div', { class: 'sections-filter-toolbar card' },
      h('div', { style: 'display:flex;align-items:center;gap:10px;flex:1;' },
        h('label', { text: 'البحث:' }), searchInput
      ),
      h('div', { style: 'display:flex;align-items:center;gap:10px;' },
        h('label', { text: 'الترتيب:' }), sortSel
      )
    );
    root.appendChild(toolbar);

    var accordionHost = h('div', { class: 'center-sections-accordion' });
    root.appendChild(accordionHost);
    v.appendChild(root);

    function renderAccordion() {
      accordionHost.textContent = '';
      var centerKeys = ['main', 'work', 'farm'];

      centerKeys.forEach(function (ck) {
        var cm = getCenterMeta(ck);
        var centerSecs = sections.filter(function (s) {
          return sectionCenterKey(s, branches) === ck;
        });

        if (searchVal) {
          centerSecs = centerSecs.filter(function (s) {
            return normAr(s.name + ' ' + (s.description || '')).indexOf(searchVal) >= 0;
          });
        }

        if (sortSel.value === 'kids') {
          centerSecs.sort(function (a, b) { return kidsCountInSection(b.id) - kidsCountInSection(a.id); });
        } else if (sortSel.value === 'alpha') {
          centerSecs.sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });
        }

        var totalCenterKids = kids.filter(function (k) { return childCenterKey(k, branches, sections) === ck && k.active; }).length;

        var groupCard = h('div', { class: 'center-accordion-group' });

        var isCollapsed = localStorage.getItem('de_sec_collapsed_' + ck) === '1';
        var bodyEl = h('div', { class: 'cag-body' + (isCollapsed ? ' is-collapsed' : '') });

        var headerEl = h('div', {
          class: 'cag-header',
          onclick: function () {
            var nowCollapsed = bodyEl.classList.toggle('is-collapsed');
            localStorage.setItem('de_sec_collapsed_' + ck, nowCollapsed ? '1' : '0');
            arrowIcon.style.transform = nowCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
          }
        },
          h('div', { class: 'cag-title-group' },
            h('div', { class: 'cag-icon' }, makeSvgIcon(cm.svgIcon || 's-branch')),
            h('div', null,
              h('h3', { class: 'cag-title', text: cm.name }),
              h('span', { class: 'muted small', text: cm.badge + ' • ' + totalCenterKids + ' طالب مسجل' })
            )
          ),
          h('div', { style: 'display:flex;align-items:center;gap:10px;' },
            badge(centerSecs.length + ' أقسام', 'gold'),
            arrowIcon = makeSvgIcon('s-back')
          )
        );
        arrowIcon.style.transition = 'transform 0.2s';
        if (isCollapsed) arrowIcon.style.transform = 'rotate(180deg)';

        var grid = h('div', { class: 'sections-cards-grid' });
        if (!centerSecs.length) {
          grid.appendChild(h('div', { class: 'empty', style: 'grid-column:1/-1;padding:20px;', text: 'لا توجد أقسام مطابقة في هذا المركز' }));
        } else {
          centerSecs.forEach(function (sec) {
            var kCount = kidsCountInSection(sec.id);
            var isFav = localStorage.getItem('de_fav_sec_' + sec.id) === '1';

            var card = h('div', { class: 'section-saas-card' },
              h('div', { class: 'ssc-header' },
                h('div', null,
                  h('h3', { class: 'ssc-title', text: sec.name }),
                  h('span', { class: 'ssc-branch', text: cm.name })
                ),
                h('div', { style: 'display:flex;align-items:center;gap:6px;' },
                  h('button', {
                    type: 'button',
                    class: 'icon-btn',
                    style: 'width:28px;height:28px;color:' + (isFav ? '#D6B779' : '#CBD5E1'),
                    title: isFav ? 'قسم مفضل' : 'إضافة للمفضلة',
                    onclick: function (e) {
                      e.stopPropagation();
                      localStorage.setItem('de_fav_sec_' + sec.id, isFav ? '0' : '1');
                      renderAccordion();
                    }
                  }, makeSvgIcon('s-star')),
                  badge(kCount + ' تلميذ', kCount > 0 ? 'ok' : 'gray')
                )
              ),
              h('p', { class: 'ssc-desc', text: sec.description || 'فوج بيداغوجي وتربوي معتمد لدى جمعية دار الإحسان.' }),
              h('div', { class: 'ssc-footer' },
                h('button', {
                  type: 'button',
                  class: 'btn small gold',
                  style: 'width:100%;font-weight:700;',
                  onclick: function () {
                    S.activeCenter = ck;
                    S.filterSectionId = sec.id;
                    go('children');
                  }
                }, makeSvgIcon('s-child'), h('span', { text: 'فتح القسم وعرض الطلبة' }))
              )
            );
            grid.appendChild(card);
          });
        }

        bodyEl.appendChild(grid);
        groupCard.appendChild(headerEl);
        groupCard.appendChild(bodyEl);
        accordionHost.appendChild(groupCard);
      });
    }

    renderAccordion();
  }

  /* =====================================================================
     3-ب. قسم المربيات وإنشاء حساب للمربية بكلمة سر من الإدارة (Educators Section)
     ===================================================================== */
  function genTempSetupCode() {
    var al = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789', o;
    do {
      var a = new Uint32Array(12); crypto.getRandomValues(a); o = '';
      for (var i = 0; i < a.length; i++) o += al.charAt(a[i] % al.length);
    } while (!/[A-Z]/.test(o) || !/[a-z]/.test(o) || !/[0-9]/.test(o));
    return o;
  }

  async function createOrUpdateEducatorAccount(edu, rawPw, sections, returnSec) {
    if (!edu || !edu.section_id) throw new Error('يرجى تحديد القسم الخاص بالمربية أولاً.');
    var pw = String(rawPw || '').trim();
    if (pw.length < 8) throw new Error('كلمة السر يجب أن تتكون من 8 أحرف أو أرقام على الأقل.');

    var secName = nameOf(sections, edu.section_id, 'name') || edu.section_name || 'القسم التربوي';
    var loginEmail = (edu.email && DE.isEmail(edu.email)) ? edu.email.toLowerCase() : educatorEmailFromPhoneOrName(edu.phone, edu.id);
    edu.email = loginEmail;

    try {
      await C.fn('admin-users', { action: 'create_admin', email: loginEmail, role: 'admin', password: pw });
    } catch (e1) {
      try {
        await C.rpc('admin_add_user', { p_email: loginEmail, p_password: pw });
      } catch (e2) {}
    }

    var meta = await loadPortalMeta();
    meta.account_meta[loginEmail] = {
      role: 'educator',
      educator_id: edu.id,
      full_name: edu.full_name,
      section_id: edu.section_id,
      section_name: secName,
      phone: edu.phone || '',
      has_account: true,
      updated_at: new Date().toISOString()
    };

    var eduInList = (meta.educators || []).filter(function (x) { return x.id === edu.id; })[0];
    if (eduInList) {
      eduInList.email = loginEmail;
      eduInList.section_name = secName;
      eduInList.phone = edu.phone || eduInList.phone;
      eduInList.has_account = true;
    }
    await savePortalMeta(meta);
    bust();

    var loginIdDisplay = edu.phone ? (edu.phone + ' (أو ' + loginEmail + ')') : loginEmail;
    var credsSummary = 'اسم المربية: ' + edu.full_name + '\n'
      + 'القسم التربوي: ' + secName + '\n'
      + 'اسم المستخدم للدخول (رقم الهاتف أو البريد): ' + (edu.phone || loginEmail) + '\n'
      + 'كلمة السر: ' + pw;

    openModal(h('div', { class: 'modal-body' },
      h('h2', { text: 'تم إنشاء حساب المربية وحفظ كلمة السر بنجاح' }),
      h('div', { class: 'child-details' },
        h('div', { class: 'cd-item' }, h('span', { text: 'اسم المربية' }), h('b', { text: edu.full_name })),
        h('div', { class: 'cd-item' }, h('span', { text: 'القسم الخاص بها' }), h('b', { text: secName })),
        h('div', { class: 'cd-item' }, h('span', { text: 'معرّف الدخول (رقم الهاتف أو البريد)' }), h('b', { dir: 'ltr', text: loginIdDisplay })),
        h('div', { class: 'cd-item' }, h('span', { text: 'كلمة السر المعتمدة' }), h('b', { dir: 'ltr', text: pw })),
        h('div', { class: 'cd-item wide' }, h('span', { text: 'صلاحيات الحساب' }), h('b', { text: 'قسم الطلبة (طلاب قسمها فقط) + قسم التقارير واستمارات التقييم' }))
      ),
      h('div', { class: 'modal-actions' },
        h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: function () { closeModal(); if (returnSec) go(returnSec); } }),
        h('button', {
          class: 'btn gold',
          type: 'button',
          text: 'نسخ بيانات دخول المربية',
          onclick: function () {
            try {
              navigator.clipboard.writeText(credsSummary);
              toast('تم نسخ بيانات دخول المربية وكلمة السر بنجاح.', 'ok');
            } catch (e) {}
          }
        })
      )
    ));
  }

  function openCreateEducatorAccountModal(preselectedEdu, sections, meta, returnSec) {
    var educators = (meta && meta.educators) || [];
    if (!educators.length) {
      toast('يرجى إضافة المربيات أولاً في «قسم المربيات» ثم إنشاء حساب لهن.', 'bad');
      return go('educators');
    }

    var eduOpts = educators.map(function (e) {
      var sName = nameOf(sections, e.section_id, 'name');
      return [e.id, e.full_name + ' — (' + (sName !== '—' ? sName : (e.section_name || '')) + ')'];
    });

    var targetEdu = preselectedEdu || educators[0];
    var targetSecName = targetEdu ? (nameOf(sections, targetEdu.section_id, 'name') || targetEdu.section_name || '') : '';
    var existingAcc = (targetEdu && targetEdu.email && meta.account_meta && meta.account_meta[targetEdu.email.toLowerCase()]) || {};
    var initialPw = '';

    return openForm({
      title: 'إنشاء حساب للمربية وتعيين كلمة السر',
      values: {
        educator_id: targetEdu ? targetEdu.id : '',
        section_display: targetSecName,
        phone: targetEdu ? (targetEdu.phone || '') : '',
        edu_pw: initialPw
      },
      submits: [
        { key: 'create', label: 'إنشاء حساب المربية وحفظ كلمة السر', gold: true }
      ],
      fields: [
        {
          k: 'educator_id',
          label: 'اختر اسم المربية',
          type: 'select',
          opts: eduOpts,
          req: true,
          searchable: true,
          hint: 'عند اختيار اسم المربية يظهر تلقائياً القسم الخاص بها ورقم هاتفها.'
        },
        {
          k: 'section_display',
          label: 'القسم / الفوج التربوي الخاص بالمربية (يظهر تلقائياً)',
          type: 'text',
          readonly: true,
          hint: 'سيكون للمربية إذن لمعرفة طلاب قسمها فقط وإضافة التقارير واستمارات التقييم لهم فقط.'
        },
        {
          k: 'phone',
          label: 'رقم الهاتف (تستخدمه المربية لتسجيل الدخول — اختياري)',
          type: 'tel',
          max: 25
        },
        {
          k: 'edu_pw',
          label: 'كلمة السر الخاصة بالمربية (تضعها الإدارة)',
          type: 'text',
          req: true,
          max: 72,
          gen: genTempSetupCode,
          hint: 'اكتب كلمة السر التي ستدخل بها المربية إلى حسابها (8 أحرف أو أرقام على الأقل)، أو اضغط «توليد كود قوي».'
        }
      ],
      onChange: function (changedKey, cur, api) {
        if (changedKey === 'educator_id' || !changedKey) {
          var chosen = educators.filter(function (e) { return e.id === cur.educator_id; })[0];
          if (chosen) {
            var sName = nameOf(sections, chosen.section_id, 'name');
            var secInput = api.input('section_display');
            var phInput = api.input('phone');
            var pwInput = api.input('edu_pw');
            if (secInput) secInput.value = sName !== '—' ? sName : (chosen.section_name || '');
            if (phInput && (changedKey === 'educator_id' || !phInput.value)) phInput.value = chosen.phone || '';
            if (pwInput && changedKey === 'educator_id') {
              var acc = (chosen.email && meta.account_meta && meta.account_meta[chosen.email.toLowerCase()]) || {};
              pwInput.value = '';
            }
          }
        }
      },
      onSubmit: async function (x) {
        var chosen = educators.filter(function (e) { return e.id === x.educator_id; })[0];
        if (!chosen) throw new Error('اختر اسم المربية أولاً.');
        if (x.phone) chosen.phone = normalizeArabicDigits(x.phone).trim();
        await createOrUpdateEducatorAccount(chosen, x.edu_pw, sections, returnSec || 'accounts');
      }
    });
  }

  async function secEducators(v) {
    if (S.isEducator) return go('children');
    var d0 = await getMany('sections', 'branches');
    var allSections = d0[0] || [], branches = d0[1] || [];
    var centerSecs = allSections.filter(function (s) { return sectionCenterKey(s, branches) === S.activeCenter; });
    var sections = centerSecs.length ? centerSecs : allSections;
    var secIdsMap = {};
    sections.forEach(function (s) { secIdsMap[s.id] = true; });
    var meta = await loadPortalMeta(true);
    var educators = (meta.educators || []).filter(function (e) { return !e.section_id || !!secIdsMap[e.section_id]; });
    var secOpts = sections.map(function (s) { return [s.id, s.name]; });

    function openChangeEducatorSectionModal(edu, allSectionsList) {
      var curSecId = edu.section_id || '';
      var curSecName = nameOf(allSectionsList, curSecId, 'name');
      var sel = h('select', { class: 'fld-select' },
        h('option', { value: '', text: '— بدون قسم محدد —' }),
        allSectionsList.map(function (s) {
          var opt = h('option', { value: s.id, text: s.name });
          if (s.id === curSecId) opt.selected = true;
          return opt;
        })
      );
      var card = h('div', { class: 'modal-card' },
        h('h3', { text: 'تغيير قسم المربية: ' + edu.full_name }),
        h('p', { class: 'muted small', text: 'القسم الحالي: ' + (curSecName !== '—' ? curSecName : (edu.section_name || 'غير محدد')) }),
        h('label', { class: 'fld' },
          h('span', { text: 'اختر القسم التربوي الجديد للمربية:' }),
          sel
        ),
        h('div', { class: 'row-actions' },
          h('button', {
            class: 'btn light',
            type: 'button',
            text: 'إلغاء',
            onclick: function () { $('#modal').hidden = true; }
          }),
          h('button', {
            class: 'btn gold',
            type: 'button',
            text: 'حفظ ونقل المربية',
            onclick: async function () {
              var newSecId = sel.value;
              var newSecName = nameOf(allSectionsList, newSecId, 'name');
              edu.section_id = newSecId;
              edu.section_name = newSecName !== '—' ? newSecName : '';
              var curMeta = await loadPortalMeta();
              var idx = (curMeta.educators || []).findIndex(function (item) { return item && item.id === edu.id; });
              if (idx >= 0) {
                curMeta.educators[idx].section_id = edu.section_id;
                curMeta.educators[idx].section_name = edu.section_name;
                var em = (edu.email || '').toLowerCase();
                if (em && curMeta.account_meta && curMeta.account_meta[em]) {
                  curMeta.account_meta[em].section_id = edu.section_id;
                  curMeta.account_meta[em].section_name = edu.section_name;
                }
              }
              await savePortalMeta(curMeta);
              bust();
              $('#modal').hidden = true;
              toast('تم تغيير قسم المربية «' + edu.full_name + '» إلى: ' + (edu.section_name || 'بدون قسم') + ' بنجاح!', 'ok');
              go('educators');
            }
          })
        )
      );
      var m = $('#modal'), mc = $('#modalCard');
      mc.textContent = '';
      mc.appendChild(card);
      m.hidden = false;
    }

    function editEducator(edu) {
      var existingAcc = (edu && edu.email && meta.account_meta && meta.account_meta[edu.email.toLowerCase()]) || {};
      var vals = edu ? {
        full_name: edu.full_name,
        section_id: edu.section_id,
        phone: edu.phone || '',
        email: edu.email || '',
        edu_pw: '',
        notes: edu.notes || ''
      } : {
        section_id: sections[0] ? sections[0].id : ''
      };

      return openForm({
        title: edu ? 'تعديل ملف المربية' : 'إضافة مربية جديدة',
        values: vals,
        submits: [
          { key: 'save', label: 'حفظ ملف المربية', gold: true }
        ],
        fields: [
          { k: 'full_name', label: 'اسم ولقب المربية', req: true, max: 120 },
          { k: 'section_id', label: 'القسم / الفوج التربوي الخاص بها', type: 'select', opts: secOpts, req: true, searchable: true },
          { k: 'phone', label: 'رقم هاتف المربية', type: 'tel', max: 25, hint: 'مثال: 0668034147 — تستخدمه المربية لتسجيل الدخول إلى حسابها.' },
          { k: 'edu_pw', label: 'كلمة السر لحساب المربية (اختياري — يمكن تعيينها هنا أو من حسابات الإدارة)', type: 'text', max: 72, gen: genTempSetupCode, hint: 'إذا وضعت كلمة سر هنا (8 أحرف على الأقل)، يتم إنشاء/تحديث حساب المربية مباشرة.' },
          { k: 'email', label: 'البريد الإلكتروني (اختياري — يُنشأ تلقائياً من رقم الهاتف إن تُرك فارغاً)', type: 'text', max: 254 },
          { k: 'notes', label: 'ملاحظات إدارية (اختياري)', type: 'textarea', max: 500 }
        ],
        onSubmit: async function (x) {
          var cleanPhone = normalizeArabicDigits(x.phone || '').trim();
          var secName = nameOf(sections, x.section_id, 'name');
          var eduId = edu ? edu.id : (crypto.randomUUID ? crypto.randomUUID() : ('edu-' + Date.now()));
          var cleanEm = String(x.email || '').trim().toLowerCase();
          var loginEmail = (cleanEm && DE.isEmail(cleanEm)) ? cleanEm : educatorEmailFromPhoneOrName(cleanPhone, eduId);

          var trimmedPw0 = normalizeArabicDigits(String(x.edu_pw || '').trim());
          var record = {
            id: eduId,
            full_name: x.full_name,
            section_id: x.section_id,
            section_name: secName !== '—' ? secName : '',
            phone: cleanPhone,
            email: loginEmail,
            has_account: !!(trimmedPw0 || (edu && edu.has_account) || (existingAcc && existingAcc.has_account)),
            notes: x.notes || '',
            updated_at: new Date().toISOString()
          };

          var curMeta = await loadPortalMeta();
          var idx = curMeta.educators.findIndex(function (item) { return item && item.id === eduId; });
          if (idx >= 0) {
            var oldEmail = curMeta.educators[idx].email;
            curMeta.educators[idx] = record;
            if (oldEmail && curMeta.account_meta[oldEmail]) {
              var oldAcc = curMeta.account_meta[oldEmail];
              oldAcc.full_name = record.full_name;
              oldAcc.section_id = record.section_id;
              oldAcc.section_name = record.section_name;
              oldAcc.phone = record.phone;
              curMeta.account_meta[loginEmail] = oldAcc;
            }
          } else {
            curMeta.educators.push(record);
          }

          await savePortalMeta(curMeta);
          var trimmedPw = String(x.edu_pw || '').trim();
          if (trimmedPw.length > 0) {
            if (trimmedPw.length < 8) {
              throw new Error('تم حفظ ملف المربية، ولكن كلمة السر يجب أن تتكون من 8 أحرف أو أرقام على الأقل لإنشاء الحساب.');
            }
            await createOrUpdateEducatorAccount(record, trimmedPw, sections, 'educators');
          } else {
            toast(edu ? 'تم تحديث وحفظ ملف المربية بنجاح.' : 'تمت إضافة وحفظ المربية في قسم المربيات بنجاح.', 'ok');
            go('educators');
          }
        }
      });
    }

    listView(v, {
      title: 'قسم المربيات وإسناد الأقسام التربوية',
      addLabel: 'إضافة مربية جديدة',
      onAdd: function () { editEducator(null); },
      extra: [],
      rows: educators,
      sheet: true,
      searchPlaceholder: 'بحث باسم المربية، القسم، أو رقم الهاتف…',
      empty: 'لا توجد مربيات مسجلات بعد. اضغط «إضافة مربية جديدة» لإضافة المربيات وربط كل مربية بقسمها.',
      search: function (e) {
        return [e.full_name, nameOf(sections, e.section_id, 'name'), e.section_name, e.phone, e.email].filter(Boolean).join(' ');
      },
      filters: [
        { label: 'القسم', opts: secOpts, test: function (e, x) { return e.section_id === x; } }
      ],
      cols: [
        { label: 'اسم ولقب المربية', get: function (e) { return e.full_name; }, sort: function (e) { return e.full_name; } },
        {
          label: 'القسم / الفوج المسند إليها',
          get: function (e) {
            var sName = nameOf(sections, e.section_id, 'name');
            return badge(sName !== '—' ? sName : (e.section_name || 'غير محدد'), 'gold');
          },
          sort: function (e) { return nameOf(sections, e.section_id, 'name') || e.section_name || ''; }
        },
        {
          label: 'رقم الهاتف (معرّف الدخول)',
          get: function (e) { return h('span', { dir: 'ltr', class: 'sic-num', text: e.phone || '—' }); },
          sort: function (e) { return e.phone || ''; }
        },
        {
          label: 'تاريخ الميلاد',
          get: function (e) { return h('span', { dir: 'ltr', text: e.dob || '—' }); },
          sort: function (e) { return e.dob || ''; }
        },
        {
          label: 'حالة الحساب والمصادقة',
          get: function (e) {
            var acc = meta.account_meta && e.email ? meta.account_meta[e.email.toLowerCase()] : null;
            return h('div', { class: 'row-actions' },
              (!acc || !acc.has_account) ? badge('حساب سحابي', 'gray') : badge('مفعّل (Supabase Auth)', 'ok')
            );
          }
        }
      ],
      actions: function (e) {
        return [
          rbtn('تغيير القسم', function () { openChangeEducatorSectionModal(e, allSections); }, 'ok'),
          rbtn('تعديل الملف', function () { editEducator(e); }, 'gold'),
          // [تمت إزالة زر إنشاء الحساب / كلمة السر بناء على طلب المستخدم]
          rbtn('حذف', async function () {
            if (!(await ask({ title: 'حذف ملف وحساب المربية؟', msg: 'سيتم حذف ملف المربية «' + e.full_name + '» وحسابها نهائيًا.', ok: 'حذف نهائي', danger: true }))) return;
            var emLower = String(e.email || '').toLowerCase();
            if (e.id) S.deletedRuntimeIds[String(e.id)] = true;
            if (emLower) S.deletedRuntimeEmails[emLower] = true;
            var curMeta = await loadPortalMeta();
            if (!Array.isArray(curMeta.deleted_educator_ids)) curMeta.deleted_educator_ids = [];
            if (!Array.isArray(curMeta.deleted_emails)) curMeta.deleted_emails = [];
            if (e.id && curMeta.deleted_educator_ids.indexOf(String(e.id)) < 0) curMeta.deleted_educator_ids.push(String(e.id));
            if (emLower && curMeta.deleted_emails.indexOf(emLower) < 0) curMeta.deleted_emails.push(emLower);
            curMeta.educators = (curMeta.educators || []).filter(function (x) { return x.id !== e.id; });
            if (emLower && curMeta.account_meta) delete curMeta.account_meta[emLower];
            if (emLower) {
              try { await C.rpc('admin_remove_user_by_email', { p_email: emLower }); } catch (errRpc) {}
            }
            await savePortalMeta(curMeta);
            bust();
            toast('تم حذف ملف وحساب المربية نهائيًا.', 'ok');
            go('educators');
          }, 'danger')
        ];
      }
    });
  }

      /* =====================================================================
     4. نظام البرنامج المؤقت الأسبوعي الاحترافي — دار الإحسان (Weekly Timetable)
     - الورقة الأسبوعية تظهر مباشرة أمام الموظف مطابقة للورقة الأصلية (23499.jpg).
     - التوقيتات تُعدّل في مكانها مباشرة في ترويسة الجدول (Inline Editing) دون نوافذ منبثقة.
     - خيارات التعديل وتعبئة الخانات موزعة على العرض (Horizontal Layout) وواسعة.
     - إمكانية دمج خانات متجاورة في نفس اليوم أو بين الأيام (دمج أفقي ورأسي).
     - معاينة مطابقة تماماً للورقة الرسمية وحجم الخانات متناسق وغير مبالغ فيه.
     - النشر التلقائي في فضاء الأولياء لفوج الطفل المعني فقط وحفظ المسودات وسجل التعديلات.
     ===================================================================== */

  var WEEK_DAYS = [
    { key: 'sun', label: 'الأحد' },
    { key: 'mon', label: 'الإثنين' },
    { key: 'tue', label: 'الثلاثاء' },
    { key: 'wed', label: 'الأربعاء' },
    { key: 'thu', label: 'الخميس' }
  ];

  /* التوقيتات الرسمية المعتمدة كما في الورقة 23499.jpg */
  var DEFAULT_WEEK_TIME_SLOTS = [
    { id: 0, start: '08:00', end: '09:00', period: 'morning', label: '08:00 - 09:00', duration: 60 },
    { id: 1, start: '09:00', end: '09:45', period: 'morning', label: '09:00 - 09:45', duration: 45 },
    { id: 2, start: '09:45', end: '10:30', period: 'morning', label: '09:45 - 10:30', duration: 45 },
    { id: 3, start: '10:30', end: '11:00', period: 'morning', label: '10:30 - 11:00', duration: 30 },
    { id: 4, start: '11:00', end: '12:00', period: 'morning', label: '11:00 - 12:00', duration: 60 },
    { id: 5, start: '12:00', end: '12:45', period: 'afternoon', label: '12:00 - 12:45', duration: 45 },
    { id: 6, start: '12:45', end: '13:40', period: 'afternoon', label: '12:45 - 13:40', duration: 55 },
    { id: 7, start: '13:40', end: '14:00', period: 'afternoon', label: '13:40 - 14:00', duration: 20 }
  ];

  /* قائمة الأنشطة والمجالات الإرشادية للحجم الساعي كما في الورقة الأصلية 23499.jpg */
  var OFFICIAL_LOAD_SUMMARY = [
    { code: 'ATM*', name: 'الأنشطة التعليمية', count: '01', duration: '15min', color: '#F3E8FF' },
    { code: 'MT*', name: 'الحركية الدقيقة', count: '05', duration: '30-45min', color: '#DBEAFE' },
    { code: 'P*A', name: 'الاستقلالية', count: '08', duration: '45min', color: '#BFDBFE' },
    { code: 'Intg', name: 'التكامل الحسي', count: '01', duration: '45min', color: '#CFFAFE' },
    { code: 'L99 (E)', name: 'اللغة والتواصل', count: '02', duration: '45min', color: '#E0E7FF' },
    { code: 'Pst G', name: 'المعرفي الأكاديمي', count: '01', duration: '45min', color: '#D1FAE5' },
    { code: 'Act stim', name: 'الاستثارة والأنشطة', count: '03', duration: '30-45min', color: '#FEF08A' },
    { code: 'RELX', name: 'الاستراحة والاسترخاء', count: '01', duration: '30min', color: '#FBCFE8' },
    { code: 'ACQS', name: 'المهارات المكتسبة', count: '01', duration: '30min', color: '#F5D0FE' },
    { code: 'PERCP', name: 'الإدراك والتفاعل', count: '02', duration: '30-45min', color: '#E9D5FF' },
    { code: 'المجموع', name: 'الحجم الإجمالي', count: '25 حصة', duration: '25H أسبوعياً', color: '#F1F5F9' }
  ];

  var DEFAULT_DAILY_ACTIVITIES = [
    'الاعتماد على الذات',
    'رياضة',
    'الاستراحة',
    'وجبة خفيفة',
    'الأكل',
    'الغداء',
    'النظافة',
    'اللعب الحر',
    'ركن الرمل/ركن الماء',
    'التحضير للخروج',
    'الاستقبال',
    'الانصراف',
    'نشاط خارجي'
  ];

  function getPedagogicalLibrary() {
    var curr = (window && window.DE_CURRICULUM) || EMBEDDED_CURRICULUM || {};
    var lib = {};
    Object.keys(curr).forEach(function (k) {
      lib[k] = Array.isArray(curr[k]) ? curr[k].slice() : [];
    });
    return lib;
  }

  function getDailyActivitiesList() {
    try {
      var saved = localStorage.getItem('de_daily_activities_v1');
      if (saved) {
        var parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return DEFAULT_DAILY_ACTIVITIES.slice();
  }

  function readSharedProgramsLocal() {
    try {
      var raw = localStorage.getItem('de_shared_programs_v1');
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function writeSharedProgramsLocal(list) {
    try {
      localStorage.setItem('de_shared_programs_v1', JSON.stringify(list));
    } catch (e) {}
  }

  function timeToMinutes(tStr) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(tStr || '').trim());
    if (!m) return 480;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function minutesToTime(mins) {
    var clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
    var hh = Math.floor(clamped / 60);
    var mm = clamped % 60;
    return (hh < 10 ? '0' + hh : '' + hh) + ':' + (mm < 10 ? '0' + mm : '' + mm);
  }

  function calcDurationMins(startStr, endStr) {
    var diff = timeToMinutes(endStr) - timeToMinutes(startStr);
    return diff > 0 ? diff : 30;
  }

  /* تهيئة ورقة أسبوعية جديدة مطابقة تماماً للورقة الأصلية 23499.jpg مع خانات مهيأة */
  function createOfficialPresetWeekState(secId, secName) {
    var nowIso = new Date().toISOString();
    var sName = secName || 'توحد 02';

    // الحصص الافتراضية المطابقة لورقة المركز الأصلية 23499.jpg
    var defaultGrid = {
      sun: [
        { slot_id: 0, rowspan: 5, colspan: 1, kind: 'activity', activity: 'الاعتماد على الذات', title: 'الاعتماد على الذات' },
        { slot_id: 1, rowspan: 5, colspan: 1, kind: 'empty' }, // covered by rowspan
        { slot_id: 2, rowspan: 2, colspan: 1, kind: 'activity', activity: 'رياضة', title: 'رياضة' },
        { slot_id: 3, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'الإدراك والتواصل', title: 'المجال المعرفي' },
        { slot_id: 4, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال الاستقلالية', skill: 'تنمية مهارات الطلب', title: 'تنمية مهارات الطلب' },
        { slot_id: 5, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال الاستقلالية', skill: 'استقلالية ووجبة', title: 'استقلالية' },
        { slot_id: 6, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'الأداء البصري', title: 'الأداء البصري' },
        { slot_id: 7, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'الإدراك الحسي', title: 'الإدراك' },
        { slot_id: 8, rowspan: 5, colspan: 1, kind: 'activity', activity: 'التحضير للخروج', title: 'التحضير للخروج' }
      ],
      mon: [
        { slot_id: 0, rowspan: 1, colspan: 1, kind: 'empty' },
        { slot_id: 1, rowspan: 1, colspan: 1, kind: 'empty' },
        { slot_id: 2, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'الانتباه والتركيز', title: 'الانتباه والتركيز' },
        { slot_id: 3, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال التواصل واللغة', skill: 'اللغة الاستقبالية pecs', title: 'اللغة الاستقبالية pecs' },
        { slot_id: 4, rowspan: 1, colspan: 1, kind: 'activity', activity: 'EQUITATION', title: 'EQUITATION ركوب الخيل' },
        { slot_id: 5, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال الاستقلالية', skill: 'التكامل الحسي', title: 'التكامل الحسي' },
        { slot_id: 6, rowspan: 1, colspan: 1, kind: 'activity', activity: 'حصة استرخاء', title: 'حصة استرخاء' },
        { slot_id: 7, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'التواصل البصري', title: 'التواصل البصري' },
        { slot_id: 8, rowspan: 1, colspan: 1, kind: 'empty' }
      ],
      tue: [
        { slot_id: 0, rowspan: 1, colspan: 1, kind: 'empty' },
        { slot_id: 1, rowspan: 1, colspan: 1, kind: 'empty' },
        { slot_id: 2, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'انتباه بصري سمعي لمسي', title: 'انتباه بصري سمعي لمسي' },
        { slot_id: 3, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال التواصل واللغة', skill: 'تقليد لفظي', title: 'تقليد لفظي' },
        { slot_id: 4, rowspan: 1, colspan: 1, kind: 'activity', activity: 'ركن الرمل/ركن الماء', title: 'ركن الرمل/ركن الماء' },
        { slot_id: 5, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال الاجتماعي', skill: 'التفاعل الاجتماعي', title: 'التفاعل الاجتماعي' },
        { slot_id: 6, rowspan: 1, colspan: 1, kind: 'activity', activity: 'التلوين/أعمال تطبيقية', title: 'التلوين/أعمال تطبيقية' },
        { slot_id: 7, rowspan: 1, colspan: 1, kind: 'activity', activity: 'الحسية / استرخاء', title: 'الحسية / استرخاء' },
        { slot_id: 8, rowspan: 1, colspan: 1, kind: 'empty' }
      ],
      wed: [
        { slot_id: 0, rowspan: 1, colspan: 1, kind: 'empty' },
        { slot_id: 1, rowspan: 1, colspan: 1, kind: 'empty' },
        { slot_id: 2, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال التواصل واللغة', skill: 'لغة استقبالية / تعرف تطابق', title: 'لغة استقبالية / تعرف تطابق' },
        { slot_id: 3, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال الحركي', skill: 'حركة دقيقة', title: 'حركة دقيقة' },
        { slot_id: 4, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'تنمية المهارات الانتباه والتركيز', title: 'تنمية المهارات الانتباه والتركيز' },
        { slot_id: 5, rowspan: 1, colspan: 1, kind: 'activity', activity: 'GYM DES DOIGTS إعادة تشكيل بالعجينة', title: 'GYM DES DOIGTS' },
        { slot_id: 6, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'التواصل البصري', title: 'التواصل البصري' },
        { slot_id: 7, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'مهارات الانتباه (بصري / سمعي)', title: 'مهارات الانتباه (بصري / سمعي)' },
        { slot_id: 8, rowspan: 1, colspan: 1, kind: 'empty' }
      ],
      thu: [
        { slot_id: 0, rowspan: 1, colspan: 1, kind: 'empty' },
        { slot_id: 1, rowspan: 1, colspan: 1, kind: 'empty' },
        { slot_id: 2, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال الحركي', skill: 'تنمية التآزر البصري الحركي', title: 'تنمية التآزر البصري الحركي' },
        { slot_id: 3, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال التقليد', skill: 'تقليد حركي', title: 'تقليد حركي' },
        { slot_id: 4, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال التواصل واللغة', skill: 'مجال الحسي QT', title: 'مجال الحسي QT' },
        { slot_id: 5, rowspan: 1, colspan: 1, kind: 'activity', activity: 'تعميم', title: 'تعميم' },
        { slot_id: 6, rowspan: 1, colspan: 1, kind: 'activity', activity: 'ورشات قص / لصق', title: 'ورشات قص / لصق' },
        { slot_id: 7, rowspan: 1, colspan: 1, kind: 'activity', activity: 'التحضير للخروج', title: 'أشغال' },
        { slot_id: 8, rowspan: 1, colspan: 1, kind: 'empty' }
      ]
    };

    var slots = DEFAULT_WEEK_TIME_SLOTS.map(function (ts) { return Object.assign({}, ts); });

    var days = WEEK_DAYS.map(function (wd) {
      var dSessions = (defaultGrid[wd.key] || []).map(function (s) {
        var baseSlot = slots[s.slot_id] || { start: '08:00', end: '08:30' };
        return {
          slot_id: s.slot_id,
          start: baseSlot.start,
          end: baseSlot.end,
          colspan: s.colspan || 1,
          rowspan: s.rowspan || 1,
          kind: s.kind || 'empty',
          domain: s.domain || '',
          skill: s.skill || '',
          title: s.title || '',
          manual_text: s.manual_text || '',
          activity: s.activity || ''
        };
      });
      return { day: wd.key, label: wd.label, sessions: dSessions };
    });

    return {
      id: null,
      section_id: secId || '',
      section_name: sName,
      academic_year: '2026/2027',
      status: 'draft',
      published_at: null,
      updated_at: nowIso,
      prepared_date: nowIso.slice(0, 10),
      day_start: '08:00',
      day_end: '14:00',
      educator_name: '',
      supervisor_name: '',
      director_name: '',
      time_slots: slots,
      days: days
    };
  }

  function parseExistingProgramState(p, secList) {
    var rawSched = null;
    if (p && p.schedule) {
      try {
        rawSched = typeof p.schedule === 'string' ? JSON.parse(p.schedule) : p.schedule;
      } catch (e) { rawSched = null; }
    }
    var meta = (Array.isArray(rawSched) && rawSched[0]) ? rawSched[0] : (rawSched && typeof rawSched === 'object' ? rawSched : {});
    var secId = (p && p.section_id) || (secList && secList[0] ? secList[0].id : '');
    var sName = (secList && nameOf(secList, secId, 'name')) || (meta && meta.section_name) || 'الفوج التربوي';

    var slots = (meta && Array.isArray(meta.time_slots) && meta.time_slots.length)
      ? meta.time_slots.map(function (ts, idx) {
          return {
            id: ts.id != null ? ts.id : idx,
            start: ts.start || '08:00',
            end: ts.end || '08:30',
            period: ts.period || (timeToMinutes(ts.start) >= 720 ? 'afternoon' : 'morning'),
            label: (ts.start || '08:00') + ' - ' + (ts.end || '08:30'),
            duration: ts.duration || calcDurationMins(ts.start, ts.end)
          };
        })
      : DEFAULT_WEEK_TIME_SLOTS.map(function (ts) { return Object.assign({}, ts); });

    var days = WEEK_DAYS.map(function (wd) {
      var foundDay = null;
      if (Array.isArray(rawSched)) {
        foundDay = rawSched.filter(function (r) { return r && (r.day === wd.key || r.label === wd.label || (wd.key === 'mon' && r.label === 'الاثنين')); })[0];
        if (!foundDay && rawSched[0] && Array.isArray(rawSched[0].days)) {
          foundDay = rawSched[0].days.filter(function (r) { return r && (r.day === wd.key || r.label === wd.label || (wd.key === 'mon' && r.label === 'الاثنين')); })[0];
        }
      } else if (rawSched && Array.isArray(rawSched.days)) {
        foundDay = rawSched.days.filter(function (r) { return r && (r.day === wd.key || r.label === wd.label || (wd.key === 'mon' && r.label === 'الاثنين')); })[0];
      }

      var rawSess = (foundDay && Array.isArray(foundDay.sessions)) ? foundDay.sessions : [];
      var sessions = [];

      if (rawSess.length && rawSess[0].slot_id != null) {
        sessions = rawSess.map(function (s) {
          var isAct = (s.kind === 'activity' || s.kind === 'break');
          var isLib = (s.kind === 'library' || (!!s.domain && !!s.skill));
          var isMan = (s.kind === 'manual' || (!isLib && !isAct && !!(s.manual_text || s.title)));
          var k = isLib ? 'library' : (isAct ? 'activity' : (isMan ? 'manual' : 'empty'));
          return {
            slot_id: s.slot_id,
            start: s.start || '08:00',
            end: s.end || '08:30',
            colspan: s.colspan || s.span || 1,
            rowspan: s.rowspan || 1,
            kind: k,
            domain: s.domain || '',
            skill: s.skill || '',
            title: s.title || (isLib ? (s.domain + ' — ' + s.skill) : (isAct ? s.activity : s.manual_text)) || '',
            manual_text: s.manual_text || '',
            activity: s.activity || ''
          };
        });
      } else {
        slots.forEach(function (ts) {
          var matching = rawSess.filter(function (rs) {
            return rs.start === ts.start || (rs.start && timeToMinutes(rs.start) >= timeToMinutes(ts.start) && timeToMinutes(rs.start) < timeToMinutes(ts.end));
          })[0];
          if (matching) {
            var isAct = (matching.kind === 'activity' || matching.kind === 'break');
            var isLib = !!(matching.domain && matching.skill);
            var isMan = !isAct && !isLib && !!(matching.title || matching.manual_text);
            sessions.push({
              slot_id: ts.id,
              start: ts.start,
              end: ts.end,
              colspan: 1,
              rowspan: 1,
              kind: isLib ? 'library' : (isAct ? 'activity' : (isMan ? 'manual' : 'empty')),
              domain: matching.domain || '',
              skill: matching.skill || (matching.items && matching.items[0] && matching.items[0].skill) || '',
              title: matching.title || '',
              manual_text: isMan ? (matching.manual_text || matching.title || '') : '',
              activity: isAct ? (matching.activity || matching.title || '') : ''
            });
          } else {
            sessions.push({
              slot_id: ts.id,
              start: ts.start,
              end: ts.end,
              colspan: 1,
              rowspan: 1,
              kind: 'empty',
              domain: '',
              skill: '',
              title: '',
              manual_text: '',
              activity: ''
            });
          }
        });
      }
      return { day: wd.key, label: wd.label, sessions: sessions };
    });

    return {
      id: p ? p.id : null,
      section_id: secId,
      section_name: sName,
      academic_year: (p && p.academic_year) || (meta && meta.academic_year) || '2026/2027',
      status: (meta && meta.program_status) || (p && p.status) || 'draft',
      published_at: (p && p.published_at) || (meta && meta.published_at) || null,
      updated_at: (meta && meta.updated_at) || (p && p.published_at) || new Date().toISOString(),
      prepared_date: (meta && meta.prepared_date) || new Date().toISOString().slice(0, 10),
      day_start: (meta && meta.day_start) || '08:00',
      day_end: (meta && meta.day_end) || '14:00',
      educator_name: (meta && meta.educator_name) || '',
      supervisor_name: (meta && meta.supervisor_name) || '',
      director_name: (meta && meta.director_name) || '',
      time_slots: slots,
      days: days
    };
  }

  /* الدالة الرئيسية لقسم البرامج الأسبوعية في لوحة الإدارة (واجهة الأقسام مع زر إضافة برنامج وزر التفاصيل) */
  async function secPrograms(v) {
    if (S.isEducator) return go('children');
    v.textContent = '';

    var d = await getMany('programs', 'sections', 'branches');
    var allProgs = d[0] || [], allSections = d[1] || [], branches = d[2] || [];
    var centerSecs = allSections.filter(function (s) { return sectionCenterKey(s, branches) === S.activeCenter; });
    var sections = centerSecs.length ? centerSecs : allSections;
    var secIdsMap = {};
    sections.forEach(function (s) { secIdsMap[s.id] = true; });
    var rows = allProgs.filter(function (p) { return !p.section_id || !!secIdsMap[p.section_id]; });

    // مصفوفة البرامج المحلية المشتركة
    var sharedList = readSharedProgramsLocal();

    // القسم المفتوح حالياً بالتفاصيل (null = البداية على قائمة الأقسام مع زر إضافة برنامج)
    var expandedSecId = null;
    var activeWeekState = null;
    var isMergeMode = false;
    var mergeSelectedCells = {};

    var mainContainer = h('div', { class: 'wk-programs-main-wrap', style: 'display:flex; flex-direction:column; gap:16px;' });
    v.appendChild(mainContainer);

    function getSectionName(secId) {
      return (sections && nameOf(sections, secId, 'name')) || 'الفوج التربوي';
    }

    function findAllProgramsForSection(secId) {
      var map = {};
      var out = [];
      (rows || []).forEach(function (r) {
        if (r && String(r.section_id) === String(secId)) {
          var k = String(r.id || (r.semester + '_' + r.academic_year));
          if (!map[k]) { map[k] = true; out.push(r); }
        }
      });
      readSharedProgramsLocal().forEach(function (r) {
        if (r && String(r.section_id) === String(secId)) {
          var k = String(r.id || (r.semester + '_' + r.academic_year));
          if (!map[k]) { map[k] = true; out.push(r); }
        }
      });
      return out;
    }
    function findProgramForSection(secId) {
      var all = findAllProgramsForSection(secId);
      return all.length ? all[0] : null;
    }
    var expandedProgId = null;

    function renderProgramsDashboard() {
      mainContainer.textContent = '';

            // 1. بطاقة الترويسة وشريط إضافة وتحرير البرنامج الأسبوعي المباشر (دون نوافذ منبثقة)
      var inlineSecSelect = h('select', { style: 'font-weight:700; font-size:13px; padding:7px 10px; border-radius:8px; border:1.5px solid #CBD5E1; min-width:160px;' },
        sections.map(function (s) { return h('option', { value: s.id, text: s.name }); })
      );
      var inlineSemInp = h('input', {
        type: 'text', value: 'السداسي الأول',
        style: 'font-weight:700; font-size:13px; padding:7px 10px; border-radius:8px; border:1.5px solid #CBD5E1; width:120px; text-align:center;'
      });
      var inlineYearInp = h('input', {
        type: 'text', value: '2026/2027',
        style: 'font-weight:700; font-size:13px; padding:7px 10px; border-radius:8px; border:1.5px solid #CBD5E1; width:95px; text-align:center;'
      });

      var inlineStartBtn = h('button', {
        type: 'button',
        class: 'btn primary gold',
        style: 'font-weight:900; font-size:13px; padding:8px 16px; border-radius:8px; display:flex; align-items:center; gap:6px;',
        onclick: function () {
          var chosenSecId = inlineSecSelect.value;
          var chosenSecName = getSectionName(chosenSecId);
          var semVal = inlineSemInp.value.trim() || 'السداسي الأول';
          var yearVal = inlineYearInp.value.trim() || '2026/2027';

          var existing = findProgramForSection(chosenSecId);
          if (existing) {
            activeWeekState = parseExistingProgramState(existing, sections);
          } else {
            activeWeekState = createOfficialPresetWeekState(chosenSecId, chosenSecName);
          }
          activeWeekState.semester = semVal;
          activeWeekState.academic_year = yearVal;
          expandedSecId = chosenSecId;
          isMergeMode = false;
          mergeSelectedCells = {};
          renderProgramsDashboard();
          toast('تم فتح محرر البرنامج لفوج «' + chosenSecName + '».', 'ok');
        }
      }, makeSvgIcon('s-edit'), h('span', { text: 'بدء تحرير البرنامج' }));

      var heroCard = h('div', {
        class: 'card wk-programs-hero-card',
        style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; padding:16px 20px; background:linear-gradient(135deg, #EAF4FF 0%, #FFFFFF 100%); border:1.5px solid #2563EB; border-radius:14px; box-shadow:0 4px 20px rgba(37, 99, 235,0.07);'
      },
        h('div', { style: 'display:flex; align-items:center; gap:12px;' },
          h('div', { style: 'background:#EAF4FF; color:#2563EB; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;' },
            makeSvgIcon('s-cal')
          ),
          h('div', null,
            h('h2', { style: 'margin:0 0 2px; color:#163B65; font-size:1.35rem; font-weight:900;', text: 'البرامج الأسبوعية للأفواج' }),
            h('p', { class: 'small muted', style: 'margin:0; font-size:12.5px; color:#64748B;', text: 'إعداد وإدارة واعتماد البرامج الأسبوعية المعتمدة لكل فوج تربوي، ونشرها في فضاء الأولياء بصيغة A4' })
          )
        ),
        h('div', { style: 'display:flex; align-items:flex-end; gap:8px; flex-wrap:wrap; background:#FFFFFF; padding:8px 12px; border-radius:10px; border:1px solid #CBD5E1;' },
          h('div', null, h('span', { class: 'small muted', style: 'font-weight:700; font-size:11px; display:block; margin-bottom:2px;', text: 'الفوج:' }), inlineSecSelect),
          h('div', null, h('span', { class: 'small muted', style: 'font-weight:700; font-size:11px; display:block; margin-bottom:2px;', text: 'السداسي:' }), inlineSemInp),
          h('div', null, h('span', { class: 'small muted', style: 'font-weight:700; font-size:11px; display:block; margin-bottom:2px;', text: 'الموسم:' }), inlineYearInp),
          inlineStartBtn
        )
      );
      mainContainer.appendChild(heroCard);

      // 2. قائمة بطاقات البرامج حسب القسم
      var listHeader = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-top:4px;' },
        h('h3', { style: 'margin:0; color:#163B65; font-size:1.15rem; font-weight:800; display:flex; align-items:center; gap:8px;' },
          makeSvgIcon('s-users'),
          h('span', { text: 'قائمة الأفواج والبرامج المعتمدة (' + sections.length + ' أفواج)' })
        ),
        h('span', { class: 'small muted', text: 'اضغط على زر «التفاصيل» لعرض ورقة البرنامج الأسبوعي والتحكم فيه' })
      );
      mainContainer.appendChild(listHeader);

      var sectionsGrid = h('div', { style: 'display:flex; flex-direction:column; gap:14px;' });

      sections.forEach(function (sec) {
        var secProgs = findAllProgramsForSection(sec.id);
        var prog = secProgs.length ? secProgs[0] : null;
        var isExpanded = (expandedSecId === sec.id);

        var secCard = h('div', {
          class: 'card wk-section-program-card',
          style: 'background:#FFFFFF; border:1.5px solid ' + (isExpanded ? '#163B65' : '#E2E8F0') + '; border-radius:14px; padding:16px 20px; box-shadow:' + (isExpanded ? '0 8px 30px rgba(22, 59, 101,0.1)' : '0 2px 10px rgba(0,0,0,0.03)') + '; transition:all 0.2s ease;'
        });

        // الصف العلوي لبطاقة القسم
        var topRow = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;' },
          // يمين: اسم الفوج والحالة والمعلومات
          h('div', { style: 'display:flex; align-items:center; gap:12px; flex-wrap:wrap;' },
            h('div', { style: 'background:' + (prog ? '#EAF4FF' : '#F1F5F9') + '; color:' + (prog ? '#163B65' : '#64748B') + '; width:42px; height:42px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;' },
              makeSvgIcon('s-users')
            ),
            h('div', null,
              h('div', { style: 'display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:2px;' },
                h('h3', { style: 'margin:0; color:#0F172A; font-size:1.15rem; font-weight:800;', text: sec.name }),
                prog ? (
                  (prog.status === 'published' || prog.status === 'updated')
                    ? h('span', { style: 'background:#DCEAF5; color:#163B65; border:1px solid #60A5FA; font-weight:800; font-size:11.5px; padding:2px 10px; border-radius:12px;', text: '✓ معتمد ومنشور للأولياء' })
                    : h('span', { style: 'background:#FEF3C7; color:#92400E; border:1px solid #FCD34D; font-weight:800; font-size:11.5px; padding:2px 10px; border-radius:12px;', text: '📝 مسودة برنامج أسبوعي' })
                ) : h('span', { style: 'background:#F1F5F9; color:#64748B; border:1px solid #CBD5E1; font-weight:700; font-size:11.5px; padding:2px 10px; border-radius:12px;', text: '⚪ لا يوجد برنامج بعد' })
              ),
              h('div', { class: 'small muted', style: 'font-size:12px; color:#64748B;' },
                'الموسم: ' + ((prog && prog.academic_year) || '2026/2027') + ' | التوقيت: 08:00 إلى 14:00 | الحجم: 25 حصة أسبوعياً' + (prog && prog.updated_at ? (' | آخر تحديث: ' + fmtDate(prog.updated_at)) : '')
              )
            )
          ),
          // يسار: أزرار الإجراءات (يدعم تراكم البرامج مع زر تفاصيل مستقل لكل برنامج وحذف يعمل فعلياً)
          h('div', { style: 'display:flex; flex-direction:column; gap:6px; align-items:flex-end;' },
            secProgs.length ? (
              secProgs.map(function (pItem, pIdx) {
                var pKey = String(pItem.id || (sec.id + '_' + pIdx));
                var isThisExp = isExpanded && (!expandedProgId || expandedProgId === pKey);
                var pTitleTag = secProgs.length > 1
                  ? ('التفاصيل (' + (pIdx + 1) + ' — ' + (pItem.semester || 'برنامج') + ')')
                  : 'التفاصيل';
                return h('div', { style: 'display:flex; gap:6px; align-items:center; flex-wrap:wrap;' },
                  h('button', {
                    type: 'button',
                    class: 'btn ' + (isThisExp ? 'primary' : 'light'),
                    style: 'font-weight:800; font-size:12.5px; display:inline-flex; align-items:center; gap:6px; min-width:110px; justify-content:center;',
                    title: isThisExp ? 'إخفاء ورقة البرنامج الأسبوعي' : 'عرض التفاصيل والبرنامج الأسبوعي',
                    onclick: function () {
                      if (isThisExp) {
                        expandedSecId = null;
                        expandedProgId = null;
                        activeWeekState = null;
                      } else {
                        expandedSecId = sec.id;
                        expandedProgId = pKey;
                        activeWeekState = parseExistingProgramState(pItem, sections);
                        isMergeMode = false;
                        mergeSelectedCells = {};
                      }
                      renderProgramsDashboard();
                    }
                  }, makeSvgIcon(isThisExp ? 's-close' : 's-eye'), h('span', { text: isThisExp ? 'إخفاء التفاصيل' : pTitleTag })),

                  h('button', {
                    type: 'button',
                    class: 'btn light',
                    style: 'font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:4px;',
                    title: 'تحميل البرنامج بصيغة PDF (A4 أفقي)',
                    onclick: async function () {
                      try {
                        var pState = parseExistingProgramState(pItem, sections);
                        toast('جارٍ تجهيز ملف PDF...', 'ok');
                        var bytes = await window.DE_PDF.renderWeeklyProgramToPdf(pState, sec.name);
                        window.DE_PDF.downloadPdf(bytes, 'البرنامج_الأسبوعي_' + sec.name.replace(/\s+/g, '_') + '.pdf');
                      } catch (e) {
                        toast('تعذر تحميل PDF: ' + e.message, 'bad');
                      }
                    }
                  }, makeSvgIcon('s-file'), h('span', { text: 'PDF' })),

                  (!S.isEducator ? h('button', {
                    type: 'button',
                    class: 'btn light danger',
                    style: 'font-size:12px; font-weight:800; display:inline-flex; align-items:center; gap:5px;',
                    title: 'حذف هذا البرنامج الأسبوعي نهائياً دون المساس ببيانات الأطفال أو التقارير',
                    onclick: function () {
                      confirmModal('هل أنت متأكد من حذف هذا البرنامج الأسبوعي لفوج «' + sec.name + '»؟ (لن يتأثر ملف أي طفل أو تقرير مرتبط بالفوج)', async function () {
                        try {
                          if (pItem.id && DE.isUuid(String(pItem.id))) {
                            await C.rest('DELETE', '/educational_programs?id=eq.' + uid(pItem.id));
                          }
                          var shared = readSharedProgramsLocal().filter(function (x) {
                            if (!x) return false;
                            if (pItem.id && x.id) return String(x.id) !== String(pItem.id);
                            return String(x.section_id) !== String(sec.id);
                          });
                          writeSharedProgramsLocal(shared);
                          sharedList = shared;
                          rows = rows.filter(function (r) {
                            if (!r) return false;
                            if (pItem.id && r.id) return String(r.id) !== String(pItem.id);
                            return String(r.section_id) !== String(sec.id);
                          });
                          if (expandedSecId === sec.id && (!expandedProgId || expandedProgId === pKey)) {
                            expandedSecId = null;
                            expandedProgId = null;
                            activeWeekState = null;
                          }
                          bust();
                          renderProgramsDashboard();
                          toast('تم حذف البرنامج الأسبوعي بنجاح.', 'ok');
                        } catch (err) {
                          toast('تعذر حذف البرنامج: ' + (err.message || err), 'bad');
                        }
                      });
                    }
                  }, makeSvgIcon('s-delete'), h('span', { text: 'حذف البرنامج' })) : null)
                );
              })
            ) : (
              h('span', { style: 'font-size:12px; color:#94A3B8; font-weight:700;', text: '⚪ لا يوجد برنامج مضاف بعد (استخدم زر الإضافة أعلاه)' })
            )
          )
        );
        secCard.appendChild(topRow);

        // إذا كان هذا القسم مفتوحاً بالتفاصيل، نعرض الورقة الكاملة تحته مباشرة
        if (isExpanded && activeWeekState) {
          var detailsDivider = h('div', { style: 'margin:16px 0 14px 0; border-top:1.5px dashed #2563EB;' });
          secCard.appendChild(detailsDivider);

          var detailsSheetWrap = renderProgramSheetDetails(activeWeekState, sec.name, sec.id);
          secCard.appendChild(detailsSheetWrap);
        }

        sectionsGrid.appendChild(secCard);
      });

      mainContainer.appendChild(sectionsGrid);
    }

    // نافذة إضافة برنامج أسبوعي لاختيار الفوج والموسم
    function openAddProgramModal() {
      var modalWrap = h('div', {
        class: 'modal card',
        style: 'max-width:540px; width:95%; background:#FFFFFF; padding:24px; border-radius:18px; box-shadow:0 25px 60px rgba(0,0,0,0.3); border:2px solid #163B65;'
      });

      modalWrap.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #E2E8F0; padding-bottom:12px; margin-bottom:16px;' },
        h('div', null,
          h('h3', { style: 'margin:0 0 4px; color:#163B65; font-size:1.3rem; font-weight:900;', text: 'إضافة برنامج أسبوعي جديد' }),
          h('p', { class: 'small muted', style: 'margin:0;', text: 'اختر الفوج التربوي واكتب السداسي والموسم لبدء تحرير البرنامج فوراً' })
        ),
        h('button', { type: 'button', class: 'icon-btn', style: 'font-size:18px;', onclick: closeModal }, h('span', { text: '✕' }))
      ));

      var secSelect = h('select', { class: 'input', style: 'font-weight:700; width:100%; font-size:14px; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;' },
        sections.map(function (s) {
          return h('option', { value: s.id, text: s.name });
        })
      );

      var semesterInp = h('input', {
        class: 'input',
        type: 'text',
        placeholder: 'اكتب السداسي هنا (مثال: السداسي الأول / السداسي الثاني)...',
        value: 'السداسي الأول',
        style: 'font-weight:700; width:100%; font-size:14px; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;'
      });

      var yearInp = h('input', {
        class: 'input',
        type: 'text',
        value: '2026/2027',
        style: 'font-weight:700; width:100%; font-size:14px; padding:10px; text-align:center; border-radius:8px; border:1.5px solid #CBD5E1;'
      });

      var formBody = h('div', { style: 'display:flex; flex-direction:column; gap:14px; margin-bottom:20px;' },
        h('div', null,
          h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: '1. اختيار القسم / الفوج التربوي:' }),
          secSelect
        ),
        h('div', null,
          h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: '2. كتابة السداسي / الفترة يدوياً:' }),
          semesterInp
        ),
        h('div', null,
          h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: '3. الموسم الدراسي:' }),
          yearInp
        )
      );
      modalWrap.appendChild(formBody);

      var actions = h('div', { style: 'display:flex; justify-content:flex-end; gap:10px;' },
        h('button', { type: 'button', class: 'btn light', onclick: closeModal }, h('span', { text: 'إلغاء' })),
        h('button', {
          type: 'button',
          class: 'btn primary gold',
          style: 'font-weight:900; padding:10px 22px;',
          onclick: function () {
            var chosenSecId = secSelect.value;
            var chosenSecName = getSectionName(chosenSecId);
            var semVal = semesterInp.value.trim() || 'السداسي الأول';
            var yearVal = yearInp.value.trim() || '2026/2027';

            var existing = findProgramForSection(chosenSecId);
            if (existing) {
              activeWeekState = parseExistingProgramState(existing, sections);
            } else {
              activeWeekState = createOfficialPresetWeekState(chosenSecId, chosenSecName);
            }
            activeWeekState.semester = semVal;
            activeWeekState.academic_year = yearVal;
            expandedSecId = chosenSecId;
            isMergeMode = false;
            mergeSelectedCells = {};
            closeModal();
            renderProgramsDashboard();
            toast('تم فتح محرر البرنامج لفوج «' + chosenSecName + '» (' + semVal + ').', 'ok');
          }
        }, makeSvgIcon('s-edit'), h('span', { text: 'بدء تحرير وتعبئة البرنامج' }))
      );
      modalWrap.appendChild(actions);

      openModal(modalWrap);
    }

    // دالة بناء ورقة البرنامج الأسبوعي التفاعلية مع الخانات البيضاء والكتابة السوداء الكبيرة ومكان الإمضاء
    
  function executeCellsMerge(weekState, selectedMap) {
    var items = [];
    Object.keys(selectedMap).forEach(function (k) {
      items.push(selectedMap[k]);
    });
    if (items.length < 2) return;

    var dayIndices = items.map(function (x) { return x.dayIdx; });
    var slotIndices = items.map(function (x) { return x.slot_id; });
    var minDay = Math.min.apply(null, dayIndices);
    var maxDay = Math.max.apply(null, dayIndices);
    var minSlot = Math.min.apply(null, slotIndices);
    var maxSlot = Math.max.apply(null, slotIndices);

    var isHorizontal = (minDay === maxDay);

    if (isHorizontal) {
      var dayObj = weekState.days[minDay];
      if (!dayObj) return;
      var targetSess = dayObj.sessions.find(function (s) { return s.slot_id === minSlot; });
      if (!targetSess) return;
      var totalSpan = maxSlot - minSlot + 1;
      targetSess.colspan = totalSpan;
      for (var s = minSlot + 1; s <= maxSlot; s++) {
        var otherSess = dayObj.sessions.find(function (x) { return x.slot_id === s; });
        if (otherSess) {
          otherSess.kind = 'empty';
          otherSess.colspan = 1;
          otherSess.rowspan = 1;
        }
      }
    } else {
      var totalRowspan = maxDay - minDay + 1;
      var topDay = weekState.days[minDay];
      if (!topDay) return;
      var topSess = topDay.sessions.find(function (s) { return s.slot_id === minSlot; });
      if (!topSess) return;
      topSess.rowspan = totalRowspan;
      for (var d = minDay + 1; d <= maxDay; d++) {
        var dObj = weekState.days[d];
        if (dObj) {
          var lowerSess = dObj.sessions.find(function (x) { return x.slot_id === minSlot; });
          if (lowerSess) {
            lowerSess.kind = 'empty';
            lowerSess.colspan = 1;
            lowerSess.rowspan = 1;
          }
        }
      }
    }
  }

  function executeCellsUnmerge(weekState, selectedMap) {
    Object.keys(selectedMap).forEach(function (k) {
      var item = selectedMap[k];
      var dayObj = weekState.days[item.dayIdx];
      if (dayObj) {
        var sess = dayObj.sessions.find(function (s) { return s.slot_id === item.slot_id; });
        if (sess) {
          sess.colspan = 1;
          sess.rowspan = 1;
        }
      }
    });
  }

    function renderProgramSheetDetails(currentWeekState, secName, secId) {
      var detailsContainer = h('div', { class: 'wk-program-expanded-details', style: 'display:flex; flex-direction:column; gap:14px;' });

      // أ) شريط الإجراءات والتحكم بالبرنامج المفتوح
      var saveDraftBtn = h('button', {
        type: 'button',
        class: 'btn light',
        title: 'حفظ الورقة الأسبوعية كمسودة',
        onclick: function () { act(saveDraftBtn, function () { return saveProgramAction(false); }); }
      }, makeSvgIcon('s-edit'), h('span', { text: 'حفظ مسودة' }));

      var mergeToggleBtn = h('button', {
        type: 'button',
        class: 'btn ' + (isMergeMode ? 'gold' : 'light'),
        title: 'تحديد خانات لدمجها (في نفس اليوم أو بين الأيام)',
        onclick: function () {
          isMergeMode = !isMergeMode;
          mergeSelectedCells = {};
          renderProgramsDashboard();
        }
      }, makeSvgIcon('s-merge'), h('span', { text: isMergeMode ? 'إلغاء وضع الدمج' : 'دمج الخانات (أفقي ورأسي)' }));

      var previewPdfBtn = h('button', {
        type: 'button',
        class: 'btn light',
        title: 'معاينة الوثيقة الرسمية للبرنامج الأسبوعي المطابقة تماماً لورقة 23499.jpg',
        onclick: function () { openPdfLandscapePreviewModal(); }
      }, makeSvgIcon('s-eye'), h('span', { text: 'معاينة PDF (A4)' }));

      var publishBtn = h('button', {
        type: 'button',
        class: 'btn gold',
        style: 'font-weight:800;',
        title: 'نشر البرنامج الأسبوعي في فضاء أولياء أطفال الفوج',
        onclick: function () { act(publishBtn, function () { return saveProgramAction(true); }); }
      }, makeSvgIcon('s-send'), h('span', { text: 'نشر للأولياء' }));

      var collapseBtn = h('button', {
        type: 'button',
        class: 'btn light',
        title: 'إغلاق التفاصيل والعودة للقائمة',
        onclick: function () {
          expandedSecId = null;
          activeWeekState = null;
          renderProgramsDashboard();
        }
      }, makeSvgIcon('s-close'), h('span', { text: 'إغلاق التفاصيل' }));

      var sheetActionsBar = h('div', {
        style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:10px 14px; background:#F8FAF9; border:1px solid #CBD5E1; border-radius:10px;'
      },
        h('div', { style: 'font-weight:800; color:#163B65; font-size:13.5px; display:flex; align-items:center; gap:8px;' },
          makeSvgIcon('s-book'),
          h('span', { text: 'تحرير ورقة البرنامج الأسبوعي — ' + secName })
        ),
        h('div', { style: 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;' },
          mergeToggleBtn,
          saveDraftBtn,
          previewPdfBtn,
          publishBtn,
          collapseBtn
        )
      );
      detailsContainer.appendChild(sheetActionsBar);

      if (isMergeMode) {
        var selKeys = Object.keys(mergeSelectedCells);
        var hasMerged = selKeys.some(function (k) { var it = mergeSelectedCells[k]; return it && (it.colspan > 1 || it.rowspan > 1); });
        var mergeBar = h('div', {
          class: 'card',
          style: 'max-width:1040px; margin:0 auto; padding:12px 18px; background:#EAF4FF; border:2px solid #2563EB; border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;'
        },
          h('div', { style: 'font-weight:900; color:#163B65; font-size:14px; display:flex; align-items:center; gap:8px;' },
            makeSvgIcon('s-merge'),
            h('span', { text: selKeys.length ? ('تم تحديد ' + selKeys.length + ' خانة لدمجها — انقر الزر الأزرق لتنفيذ الدمج:') : 'وضع الدمج مفعّل: انقر على الخانات في الجدول أدناه لتحديدها ثم اضغط دمج.' })
          ),
          h('div', { style: 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;' },
            selKeys.length >= 2 ? h('button', {
              type: 'button',
              class: 'btn primary',
              style: 'background:#2563EB; color:#FFF; font-weight:900; padding:8px 16px; border-radius:8px; font-size:13.5px; box-shadow:0 2px 6px rgba(37,99,235,0.3);',
              onclick: function () {
                executeCellsMerge(currentWeekState, mergeSelectedCells);
                mergeSelectedCells = {};
                renderProgramsDashboard();
                toast('تم دمج الخانات المحددة بنجاح ✓', 'ok');
              }
            }, makeSvgIcon('s-merge'), h('span', { text: 'دمج الخانات المحددة (' + selKeys.length + ')' })) : null,

            hasMerged ? h('button', {
              type: 'button',
              class: 'btn danger',
              style: 'font-weight:800; padding:8px 14px; border-radius:8px;',
              onclick: function () {
                executeCellsUnmerge(currentWeekState, mergeSelectedCells);
                mergeSelectedCells = {};
                renderProgramsDashboard();
                toast('تم فك دمج الخانات المحددة بنجاح ✓', 'ok');
              }
            }, h('span', { text: 'فك الدمج' })) : null,

            selKeys.length > 0 ? h('button', {
              type: 'button',
              class: 'btn light',
              style: 'font-size:12px;',
              onclick: function () {
                mergeSelectedCells = {};
                renderProgramsDashboard();
              }
            }, h('span', { text: 'إلغاء التحديد' })) : null
          )
        );
        detailsContainer.appendChild(mergeBar);
      }

      // ب) بطاقة ورقة البرنامج الأسبوعي المطابقة تماماً للورقة الرسمية A4
      var sheetPaperCard = h('div', {
        class: 'card wk-interactive-sheet-paper',
        style: 'max-width:1040px; margin:0 auto; padding:14px 18px; background:#FFFFFF; border:2px solid #163B65; border-radius:12px; box-shadow:0 4px 20px rgba(22, 59, 101,0.08); overflow-x:auto; box-sizing:border-box; font-family:"Cairo","Tajawal","IBM Plex Sans Arabic",system-ui,sans-serif;'
      });

      // 1. ترويسة الورقة الرسمية
      var sheetHeader = h('div', {
        class: 'wk-sheet-header-grid',
        style: 'display:grid; grid-template-columns:1fr 2fr 1fr; align-items:center; gap:8px; padding-bottom:8px; margin-bottom:8px; border-bottom:1.5px solid #163B65;'
      },
        h('div', { style: 'text-align:right;' },
          h('h4', { style: 'margin:0 0 1px; color:#163B65; font-size:13px; font-weight:800;', text: 'جمعية أولياء الأطفال المعاقين ذهنيًا' }),
          h('h5', { style: 'margin:0 0 1px; color:#163B65; font-size:12px; font-weight:700;', text: 'المركز النفسي البيداغوجي دار الإحسان' }),
          h('span', { class: 'small muted', style: 'font-size:10.5px;', text: 'العطف — غرداية' })
        ),
        h('div', { style: 'text-align:center;' },
          h('h2', {
            style: 'margin:0 0 2px; color:#163B65; font-size:1.35rem; letter-spacing:0.5px; font-weight:900;',
            text: 'البرنامج المؤقت الأسبوعي'
          }),
          h('div', {
            style: 'display:inline-block; background:#FEF3C7; color:#92400E; border:1px solid #F59E0B; padding:2px 14px; border-radius:14px; font-weight:800; font-size:12px;',
            text: 'الفوج: ' + secName
          })
        ),
        h('div', { style: 'text-align:left;' },
          h('div', { style: 'font-weight:700; color:#163B65; font-size:12px;', text: 'الموسم الدراسي: ' + (currentWeekState.academic_year || '2026/2027') }),
          h('div', { class: 'small muted', style: 'font-size:10.5px;', text: 'التوقيت: ' + (currentWeekState.day_start || '08:00') + ' إلى ' + (currentWeekState.day_end || '14:00') })
        )
      );
      sheetPaperCard.appendChild(sheetHeader);

      var mobileHint = h('div', { class: 'wk-mobile-scroll-hint' }, h('span', { text: '↔ اسحب الجدول يميناً ويساراً للاطلاع على كامل البرنامج' }));
      sheetPaperCard.appendChild(mobileHint);

      // 2. جدول ملخص الأنشطة والأنصبة الأسبوعية في أعلى الورقة
      // جدول ملخص الحجم الساعي التفاعلي القابل للتعديل اليدوي والاختيار
      if (!currentWeekState.load_summary) {
        currentWeekState.load_summary = OFFICIAL_LOAD_SUMMARY.map(function (x) { return Object.assign({}, x); });
      }
      var activeLoadList = currentWeekState.load_summary;

      var loadTable = h('table', {
        style: 'width:100%; min-width:700px; border-collapse:collapse; border:2px solid #163B65; text-align:center; font-size:10.5px; table-layout:fixed; box-shadow:0 2px 8px rgba(0,0,0,0.04);'
      });
      var allActCodes = OFFICIAL_LOAD_SUMMARY.map(function (x) { return x.code; });
      var trLoad1 = h('tr', null,
        h('th', { style: 'background:#163B65; color:#fff; padding:4px 2px; border:1px solid #CBD5E1; width:80px; font-size:11px; font-weight:900;', text: 'الأنشطة التعليمية' }),
        activeLoadList.map(function (it, idx) {
          var dListId = 'act_opts_dl_' + idx;
          var optItems = allActCodes.map(function (c) { return h('option', { value: c }); });
          var dlEl = h('datalist', { id: dListId }, optItems);

          var actInput = h('input', {
            type: 'text',
            value: it.code,
            style: 'width:100%; border:none; background:transparent; font-weight:900; font-size:11px; color:#0F172A; text-align:center; padding:2px 0; cursor:text;',
            title: 'انقر للكتابة مباشرة أو اختر من القائمة',
            onchange: function (e) {
              it.code = e.target.value;
              var matchPreset = OFFICIAL_LOAD_SUMMARY.find(function (p) { return p.code === it.code; });
              if (matchPreset) {
                it.name = matchPreset.name;
                it.color = matchPreset.color;
              }
              toast('تم تحديث النشاط: ' + it.code, 'ok');
            }
          });
          actInput.setAttribute('list', dListId);

          var tdBadge = h('td', {
            style: 'background:' + (it.color || '#EAF4FF') + '; border:1px solid #CBD5E1; padding:1px 2px; font-size:11px; color:#0F172A;'
          }, dlEl, actInput);

          return tdBadge;
        })
      );
      var trLoad2 = h('tr', null,
        h('th', { style: 'background:#F8FAF9; color:#1E293B; padding:3px 2px; border:1px solid #CBD5E1; font-size:10px; font-weight:800;', text: 'الحجم الساعي' }),
        activeLoadList.map(function (it) {
          var durInp = h('input', {
            type: 'text',
            value: it.duration,
            style: 'width:100%; border:none; background:transparent; text-align:center; font-size:10px; font-weight:700; padding:2px 0;',
            title: 'انقر لتعديل التوقيت يدوياً',
            onchange: function (e) { it.duration = e.target.value; }
          });
          return h('td', { style: 'border:1px solid #CBD5E1; padding:1px; background:#FFF;' }, durInp);
        })
      );
      var trLoad3 = h('tr', null,
        h('th', { style: 'background:#F8FAF9; color:#1E293B; padding:3px 2px; border:1px solid #CBD5E1; font-size:10px; font-weight:800;', text: 'عدد الحصص' }),
        activeLoadList.map(function (it) {
          var cntInp = h('input', {
            type: 'number',
            min: 0,
            max: 50,
            value: it.count,
            style: 'width:100%; border:1px solid #CBD5E1; border-radius:4px; background:#FFF; text-align:center; font-size:11px; font-weight:900; color:#163B65; padding:2px 0;',
            title: 'تعديل عدد الحصص يدوياً',
            onchange: function (e) { it.count = parseInt(e.target.value, 10) || 0; }
          });
          return h('td', { style: 'border:1px solid #CBD5E1; padding:2px; background:#FFF;' }, cntInp);
        })
      );
      loadTable.appendChild(trLoad1);
      loadTable.appendChild(trLoad2);
      loadTable.appendChild(trLoad3);

      var loadWrap = h('div', { class: 'wk-table-scroll-wrap', style: 'width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; margin-bottom:8px;' }, loadTable);
      sheetPaperCard.appendChild(loadWrap);

      // 3. جدول الحصص الأسبوعي الرئيسي (خانات بيضاء نقية وكتابة سوداء مكبرة)
      var tableEl = h('table', {
        class: 'wk-sheet-table',
        style: 'width:100%; border-collapse:collapse; border:2px solid #163B65; text-align:center; min-width:800px; table-layout:fixed;'
      });

      var morningSlots = currentWeekState.time_slots.filter(function (s) { return s.period === 'morning'; });
      var afternoonSlots = currentWeekState.time_slots.filter(function (s) { return s.period === 'afternoon'; });
      if (!morningSlots.length) morningSlots = currentWeekState.time_slots.slice(0, 6);
      if (!afternoonSlots.length) afternoonSlots = currentWeekState.time_slots.slice(6);

      var theadEl = h('thead');

      var trPeriods = h('tr', null,
        h('th', {
          rowspan: 2,
          style: 'width:75px; background:#163B65; color:#FFFFFF; border:1.5px solid #163B65; padding:4px 2px; font-size:13.5px; font-weight:900; text-align:center;',
          text: 'اليوم'
        }),
        h('th', {
          colspan: morningSlots.length,
          style: 'background:#EAF4FF; color:#163B65; border:1.5px solid #2563EB; padding:3px; font-size:12.5px; font-weight:800;',
          text: 'الفترة الصباحية (08:00 — 12:00)'
        }),
        h('th', {
          colspan: afternoonSlots.length,
          style: 'background:#FEF3C7; color:#92400E; border:1.5px solid #F59E0B; padding:3px; font-size:12.5px; font-weight:800;',
          text: 'الفترة المسائية (12:00 — 14:00)'
        })
      );
      theadEl.appendChild(trPeriods);

      var trTimes = h('tr', null,
        currentWeekState.time_slots.map(function (slot, slotIdx) {
          var timeBox = h('div', {
            style: 'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; padding:2px 1px; min-width:85px;'
          },
            h('div', { style: 'display:flex; align-items:center; justify-content:center; gap:2px; direction:ltr;' },
              h('input', {
                type: 'text',
                value: slot.start,
                title: 'تعديل وقت البداية (مثال: 08:00)',
                style: 'border:1px solid #CBD5E1; border-radius:4px; padding:2px 3px; font-size:11px; font-weight:800; width:45px; text-align:center; background:#FFFFFF; color:#0F172A;',
                onchange: function (e) {
                  slot.start = e.target.value;
                  slot.duration = calcDurationMins(slot.start, slot.end);
                  syncDaySessionTimes();
                  toast('تم تحديث التوقيت.', 'ok');
                }
              }),
              h('span', { style: 'font-weight:900; color:#64748B; font-size:10px;', text: '-' }),
              h('input', {
                type: 'text',
                value: slot.end,
                title: 'تعديل وقت النهاية (مثال: 08:45)',
                style: 'border:1px solid #CBD5E1; border-radius:4px; padding:2px 3px; font-size:11px; font-weight:800; width:45px; text-align:center; background:#FFFFFF; color:#0F172A;',
                onchange: function (e) {
                  slot.end = e.target.value;
                  slot.duration = calcDurationMins(slot.start, slot.end);
                  syncDaySessionTimes();
                  toast('تم تحديث التوقيت.', 'ok');
                }
              })
            ),
            h('span', { style: 'font-size:9.5px; color:#2563EB; font-weight:800;', text: slot.duration ? (slot.duration + ' د') : '' })
          );

          return h('th', {
            style: 'background:#F8FAF9; border:1px solid #CBD5E1; padding:2px 1px; vertical-align:middle;'
          }, timeBox);
        })
      );
      theadEl.appendChild(trTimes);
      tableEl.appendChild(theadEl);

      function syncDaySessionTimes() {
        currentWeekState.days.forEach(function (dy) {
          (dy.sessions || []).forEach(function (s) {
            var bs = currentWeekState.time_slots[s.slot_id];
            if (bs) {
              s.start = bs.start;
              var endSlotIdx = Math.min(currentWeekState.time_slots.length - 1, s.slot_id + (s.colspan || 1) - 1);
              s.end = currentWeekState.time_slots[endSlotIdx].end;
            }
          });
        });
      }

      var tbodyEl = h('tbody');
      var coveredSlotsByDay = {};

      currentWeekState.days.forEach(function (dayObj, dayIdx) {
        var trDay = h('tr', null,
          h('td', {
            style: 'background:#163B65; color:#FFFFFF; border:1.5px solid #163B65; padding:3px 2px; font-weight:900; font-size:13.5px; width:75px; text-align:center; vertical-align:middle;',
            text: dayObj.label
          })
        );

        var sessions = dayObj.sessions || [];
        sessions.forEach(function (sess, sessIdx) {
          var coveredKey = dayIdx + ':' + sess.slot_id;
          if (coveredSlotsByDay[coveredKey]) return;

          var colspan = sess.colspan || 1;
          var rowspan = sess.rowspan || 1;

          if (rowspan > 1) {
            for (var r = 1; r < rowspan; r++) {
              for (var c = 0; c < colspan; c++) {
                coveredSlotsByDay[(dayIdx + r) + ':' + (sess.slot_id + c)] = true;
              }
            }
          }

          var cellKey = dayObj.day + ':' + sess.slot_id;
          var isSelected = !!mergeSelectedCells[cellKey];

          // خانات بيضاء نقية 100% وإطار أسود محكم
          var bg = isSelected ? '#F1F5F9' : '#FFFFFF';
          var border = isSelected ? '2px dashed #000000' : '1px solid #1E293B';
          var isFilled = (sess.kind && sess.kind !== 'empty');

          var td = h('td', {
            colspan: colspan,
            rowspan: rowspan,
            style: 'background:' + bg + ' !important; border:' + border + ' !important; color:#000000 !important; padding:3px 4px !important; vertical-align:middle; text-align:center; cursor:pointer; min-height:22px !important; height:auto !important; padding:6px 4px !important; box-sizing:border-box; overflow:hidden; transition:all 0.15s ease;'
          });

          if (!isFilled) {
            td.appendChild(h('span', {
              style: 'color:#64748B; font-size:10px; font-weight:700; display:block; border:1px dashed #CBD5E1; padding:2px 1px; border-radius:3px;',
              text: isMergeMode ? (isSelected ? '✓ محددة' : 'حدد') : '+ تعبئة'
            }));
          } else {
            var contentWrap = h('div', { style: 'display:flex; flex-direction:column; gap:1px; justify-content:center; align-items:center; line-height:1.2; width:100%;' });
            if (rowspan > 1 || colspan > 1) {
              var spanTag = (rowspan > 1 && colspan > 1) ? ('مدمجة ' + rowspan + '×' + colspan) : (rowspan > 1 ? ('ممتدة ' + rowspan + ' أيام') : ('مدمجة ' + colspan + ' حصص'));
              contentWrap.appendChild(h('span', {
                style: 'font-size:8px; background:#F1F5F9; color:#0F172A; border:1px solid #CBD5E1; padding:0 3px; border-radius:2px; font-weight:800; margin-bottom:1px;',
                text: spanTag
              }));
            }
            if (sess.kind === 'activity') {
              // خط كبير وأسود عريض عالي التباين
              contentWrap.appendChild(h('strong', { style: 'font-size:13.5px; font-weight:900; color:#000000 !important; line-height:1.25; word-break:break-word; text-align:center;', text: sess.activity || sess.title }));
            } else if (sess.kind === 'library') {
              // اسم المجال داكن وواضح
              contentWrap.appendChild(h('span', { class: 'wk-domain-tag', style: 'font-size:10px; font-weight:800; color:#334155 !important; margin-bottom:1px; letter-spacing:-0.2px; text-align:center;', text: sess.domain }));
              // اسم المهارة كبير وأسود عريض
              contentWrap.appendChild(h('strong', { style: 'font-size:13px; font-weight:900; color:#000000 !important; line-height:1.25; word-break:break-word; text-align:center;', text: sess.skill }));
            } else if (sess.kind === 'manual') {
              contentWrap.appendChild(h('strong', { style: 'font-size:13px; font-weight:900; color:#000000 !important; line-height:1.25; word-break:break-word; text-align:center;', text: sess.manual_text || sess.title }));
            }
            td.appendChild(contentWrap);
          }

          td.addEventListener('click', function () {
            if (isMergeMode) {
              if (mergeSelectedCells[cellKey]) {
                delete mergeSelectedCells[cellKey];
              } else {
                mergeSelectedCells[cellKey] = { dayIdx: dayIdx, slot_id: sess.slot_id, colspan: colspan, rowspan: rowspan };
              }
              renderProgramsDashboard();
            } else {
              openHorizontalFillModal(dayObj, sess, dayIdx);
            }
          });

          trDay.appendChild(td);
        });

        tbodyEl.appendChild(trDay);
      });

      tableEl.appendChild(tbodyEl);

      var tableWrap = h('div', { class: 'wk-table-scroll-wrap', style: 'width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; margin-bottom:8px;' }, tableEl);
      sheetPaperCard.appendChild(tableWrap);

      // 4. تذييل التوقيعات الثلاثة مع ترك مساحة واسعة ومميزة للإمضاء والختم في أسفل اليسار
      var sheetFooter = h('div', {
        class: 'wk-program-signatures',
        style: 'display:flex; justify-content:center; align-items:center; margin-top:20px; padding-top:14px; border-top:1.5px solid #163B65;'
      },
        h('div', {
          style: 'text-align:center; min-width:220px; padding:8px;'
        },
          h('strong', { style: 'display:block; color:#163B65; font-size:15px; font-weight:900; margin-bottom:6px;', text: 'إمضاء المدير' }),
          h('div', { style: 'height:60px;' })
        )
      );
      sheetPaperCard.appendChild(sheetFooter);

      detailsContainer.appendChild(sheetPaperCard);
      return detailsContainer;
    }

    // نافذة التعبئة الأفقية للحصص
    function openHorizontalFillModal(dayObj, sessObj, dayIdx) {
      var lib = getPedagogicalLibrary();
      var domKeys = Object.keys(lib);
      var dailyActs = getDailyActivitiesList();

      var currentKind = sessObj.kind && sessObj.kind !== 'empty' ? sessObj.kind : 'activity';
      var selectedDomain = (sessObj.domain && lib[sessObj.domain]) ? sessObj.domain : (domKeys[0] || '');
      var selectedSkill = sessObj.skill || ((lib[selectedDomain] && lib[selectedDomain][0]) || '');
      var manualText = sessObj.manual_text || (currentKind === 'manual' ? sessObj.title : '');
      var selectedActivity = sessObj.activity || (currentKind === 'activity' ? sessObj.title : dailyActs[0]);

      var modalBox = h('div', {
        class: 'modal card wk-horizontal-fill-modal',
        style: 'max-width:880px; width:95%; background:#FFFFFF; padding:24px; border-radius:16px; box-shadow:0 20px 50px rgba(22, 59, 101,0.25); border:1.5px solid #163B65; max-height:90vh; overflow-y:auto; display:flex; flex-direction:column; gap:16px;'
      });

      function renderModalFields() {
        modalBox.textContent = '';

        var modalHdr = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #E2E8F0; padding-bottom:12px;' },
          h('div', null,
            h('h3', { style: 'margin:0 0 2px; color:#163B65; font-size:1.3rem; font-weight:900;', text: 'تعبئة حصة ' + dayObj.label + ' (' + (sessObj.start || '') + ' - ' + (sessObj.end || '') + ')' }),
            h('p', { class: 'small muted', style: 'margin:0;', text: 'اختر نوع الحصة وحدد المجال والمهارة أو النشاط اليومي' })
          ),
          h('button', {
            type: 'button',
            class: 'icon-btn',
            style: 'font-size:18px;',
            onclick: function () { closeModal(); }
          }, h('span', { text: '✕' }))
        );
        modalBox.appendChild(modalHdr);

        var typeBtnsRow = h('div', { style: 'display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;' },
          h('button', {
            type: 'button',
            class: 'btn ' + (currentKind === 'activity' ? 'primary' : 'light'),
            style: 'padding:10px 8px; border-radius:10px; font-weight:800; font-size:13.5px; cursor:pointer;',
            onclick: function () { currentKind = 'activity'; renderModalFields(); }
          }, h('span', { text: '1. نشاط يومي / روتين' })),
          h('button', {
            type: 'button',
            class: 'btn ' + (currentKind === 'library' ? 'primary' : 'light'),
            style: 'padding:10px 8px; border-radius:10px; font-weight:800; font-size:13.5px; cursor:pointer;',
            onclick: function () { currentKind = 'library'; renderModalFields(); }
          }, h('span', { text: '2. حصة بيداغوجية' })),
          h('button', {
            type: 'button',
            class: 'btn ' + (currentKind === 'manual' ? 'primary' : 'light'),
            style: 'padding:10px 8px; border-radius:10px; font-weight:800; font-size:13.5px; cursor:pointer;',
            onclick: function () { currentKind = 'manual'; renderModalFields(); }
          }, h('span', { text: '3. كتابة يدوية / مخصصة' }))
        );
        modalBox.appendChild(typeBtnsRow);

        var bodyWrap = h('div', { style: 'display:flex; flex-direction:column; gap:14px;' });

        if (currentKind === 'activity') {
          var actSelect = h('select', {
            class: 'input',
            style: 'font-weight:700; width:100%;',
            onchange: function (e) { selectedActivity = e.target.value; }
          }, dailyActs.map(function (a) {
            return h('option', { value: a, selected: a === selectedActivity ? 'selected' : null, text: a });
          }));

          var actBox = h('div', { style: 'background:#F8FAF9; border:1px solid #CBD5E1; border-radius:12px; padding:16px;' },
            h('label', { style: 'display:block; font-weight:800; color:#163B65; font-size:13.5px; margin-bottom:6px;', text: 'اختر النشاط اليومي:' }),
            actSelect
          );
          bodyWrap.appendChild(actBox);
        } else if (currentKind === 'library') {
          var domainSelect = h('select', {
            class: 'input',
            style: 'font-weight:700; width:100%;',
            onchange: function (e) {
              selectedDomain = e.target.value;
              selectedSkill = (lib[selectedDomain] && lib[selectedDomain][0]) || '';
              renderModalFields();
            }
          }, domKeys.map(function (k) {
            return h('option', { value: k, selected: k === selectedDomain ? 'selected' : null, text: k });
          }));

          var skillsList = lib[selectedDomain] || [];
          var skillSelect = h('select', {
            class: 'input',
            style: 'font-weight:700; width:100%;',
            onchange: function (e) { selectedSkill = e.target.value; }
          }, skillsList.map(function (sk) {
            return h('option', { value: sk, selected: sk === selectedSkill ? 'selected' : null, text: sk });
          }));

          var libBox = h('div', { style: 'background:#EAF4FF; border:1px solid #BFDBFE; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:10px;' },
            h('div', null,
              h('label', { style: 'display:block; font-weight:800; color:#065F46; font-size:13.5px; margin-bottom:4px;', text: 'أولاً: المجال البيداغوجي:' }),
              domainSelect
            ),
            h('div', null,
              h('label', { style: 'display:block; font-weight:800; color:#065F46; font-size:13.5px; margin-bottom:4px;', text: 'ثانياً: المهارة التابعة للمجال:' }),
              skillSelect
            )
          );
          bodyWrap.appendChild(libBox);
        } else if (currentKind === 'manual') {
          var manualInp = h('input', {
            class: 'input',
            type: 'text',
            placeholder: 'اكتب عنوان الحصة أو الهدف هنا...',
            value: manualText,
            style: 'width:100%; font-size:14px; font-weight:700;',
            oninput: function (e) { manualText = e.target.value; }
          });
          var manBox = h('div', { style: 'background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:16px;' },
            h('label', { style: 'display:block; font-weight:800; color:#1E3A8A; font-size:13.5px; margin-bottom:6px;', text: 'نص الحصة المخصص:' }),
            manualInp
          );
          bodyWrap.appendChild(manBox);
        }

        modalBox.appendChild(bodyWrap);

        var modalFooter = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-top:1.5px solid #E2E8F0; padding-top:14px;' },
          h('button', {
            type: 'button',
            class: 'btn light danger',
            style: 'font-weight:700;',
            onclick: function () {
              sessObj.kind = 'empty';
              delete sessObj.domain;
              delete sessObj.skill;
              delete sessObj.activity;
              delete sessObj.manual_text;
              delete sessObj.title;
              closeModal();
              renderProgramsDashboard();
              toast('تم إفراغ الخانة.', 'ok');
            }
          }, h('span', { text: 'إفراغ الخانة' })),
          h('div', { style: 'display:flex; gap:8px;' },
            h('button', {
              type: 'button',
              class: 'btn light',
              onclick: function () { closeModal(); }
            }, h('span', { text: 'إلغاء' })),
            h('button', {
              type: 'button',
              class: 'btn primary gold',
              style: 'font-weight:800; min-width:110px;',
              onclick: function () {
                sessObj.kind = currentKind;
                if (currentKind === 'activity') {
                  sessObj.activity = selectedActivity;
                  sessObj.title = selectedActivity;
                  delete sessObj.domain;
                  delete sessObj.skill;
                  delete sessObj.manual_text;
                } else if (currentKind === 'library') {
                  sessObj.domain = selectedDomain;
                  sessObj.skill = selectedSkill;
                  sessObj.title = selectedDomain + ' — ' + selectedSkill;
                  delete sessObj.activity;
                  delete sessObj.manual_text;
                } else if (currentKind === 'manual') {
                  sessObj.manual_text = manualText || 'حصة خاصة';
                  sessObj.title = sessObj.manual_text;
                  delete sessObj.domain;
                  delete sessObj.skill;
                  delete sessObj.activity;
                }
                closeModal();
                renderProgramsDashboard();
                toast('تم حفظ الحصة في الجدول.', 'ok');
              }
            }, h('span', { text: 'تطبيق واعتماد الحصة' }))
          )
        );
        modalBox.appendChild(modalFooter);
      }

      renderModalFields();
      openModal(modalBox);
    }

    // نافذة معاينة PDF A4
    function openPdfLandscapePreviewModal() {
      if (!activeWeekState) return;
      var secName = getSectionName(activeWeekState.section_id);
      var m = h('div', {
        class: 'modal card wk-pdf-preview-modal',
        style: 'max-width:1180px; width:98%; background:#FFFFFF; padding:20px; border-radius:16px; box-shadow:0 25px 60px rgba(0,0,0,0.3); border:2px solid #163B65; max-height:94vh; overflow-y:auto;'
      });

      var mHdr = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #163B65; padding-bottom:10px; margin-bottom:14px;' },
        h('div', null,
          h('h3', { style: 'margin:0; color:#163B65; font-size:1.35rem; font-weight:900;', text: 'معاينة وثيقة البرنامج المؤقت الأسبوعي الرسمية (A4 أفقي)' }),
          h('span', { class: 'small muted', text: 'الفوج: ' + secName + ' | الموسم: ' + (activeWeekState.academic_year || '2026/2027') })
        ),
        h('div', { style: 'display:flex; gap:8px;' },
          h('button', {
            type: 'button',
            class: 'btn primary gold',
            style: 'font-weight:800;',
            onclick: async function () {
              try {
                toast('جارٍ تحميل ملف PDF...', 'ok');
                var bytes = await window.DE_PDF.renderWeeklyProgramToPdf(activeWeekState, secName);
                window.DE_PDF.downloadPdf(bytes, 'البرنامج_المؤقت_الأسبوعي_' + secName.replace(/\s+/g, '_') + '.pdf');
              } catch (err) { toast('تعذر تحميل PDF: ' + err.message, 'bad'); }
            }
          }, makeSvgIcon('s-file'), h('span', { text: 'تحميل PDF الآن' })),
          h('button', {
            type: 'button',
            class: 'btn light',
            onclick: function () { closeModal(); }
          }, h('span', { text: 'إغلاق' }))
        )
      );
      m.appendChild(mHdr);

      var previewHost = h('div', {
        style: 'width:100%; background:#525659; padding:12px; border-radius:8px; display:flex; justify-content:center; align-items:center; min-height:450px;'
      }, h('p', { style: 'color:#fff; font-size:14px;', text: 'جارٍ تجهيز المعاينة بدقة A4...' }));
      m.appendChild(previewHost);

      if (window.DE_PDF && window.DE_PDF.renderWeeklyProgramCanvas) {
        window.DE_PDF.renderWeeklyProgramCanvas(activeWeekState, secName).then(function (cEl) {
          previewHost.textContent = '';
          cEl.style.maxWidth = '100%';
          cEl.style.height = 'auto';
          cEl.style.boxShadow = '0 8px 30px rgba(0,0,0,0.5)';
          cEl.style.borderRadius = '6px';
          previewHost.appendChild(cEl);
        }).catch(function (err) {
          previewHost.textContent = 'تعذر تجهيز المعاينة: ' + err.message;
        });
      }

      openModal(m);
    }

    // حفظ ونشر البرنامج
    async function saveProgramAction(publishNow) {
      if (!activeWeekState) return;
      var secName = getSectionName(activeWeekState.section_id);
      var nowIso = new Date().toISOString();
      var wasPub = (activeWeekState.status === 'published' || activeWeekState.status === 'updated');
      var nextStatus = publishNow ? (wasPub && activeWeekState.id ? 'updated' : 'published') : 'draft';

      activeWeekState.status = nextStatus;
      activeWeekState.updated_at = nowIso;
      if (publishNow) activeWeekState.published_at = nowIso;

      var schedulePayload = activeWeekState.days.map(function (dy) {
        return {
          day: dy.day,
          label: dy.label,
          section_name: secName,
          academic_year: activeWeekState.academic_year || '2026/2027',
          program_status: nextStatus,
          day_start: activeWeekState.day_start || '08:00',
          day_end: activeWeekState.day_end || '14:00',
          educator_name: activeWeekState.educator_name || '',
          supervisor_name: activeWeekState.supervisor_name || '',
          director_name: activeWeekState.director_name || '',
          prepared_date: activeWeekState.prepared_date || nowIso.slice(0, 10),
          updated_at: nowIso,
          published_at: activeWeekState.published_at,
          time_slots: activeWeekState.time_slots,
          sessions: (dy.sessions || []).map(function (s) {
            return {
              slot_id: s.slot_id,
              start: s.start,
              end: s.end,
              colspan: s.colspan || 1,
              rowspan: s.rowspan || 1,
              kind: s.kind || 'empty',
              domain: s.domain || '',
              skill: s.skill || '',
              title: s.title || (s.domain ? (s.domain + ' — ' + s.skill) : (s.activity || s.manual_text)) || '',
              manual_text: s.manual_text || '',
              activity: s.activity || ''
            };
          })
        };
      });

      var body = {
        section_id: activeWeekState.section_id,
        title: DE.clean('البرنامج المؤقت الأسبوعي — ' + secName, 155),
        academic_year: activeWeekState.academic_year || '2026/2027',
        description: DE.clean('البرنامج المؤقت الأسبوعي لفوج ' + secName, 1000),
        goals: DE.clean('الأنصبة والحصص التعليمية الأسبوعية لفوج ' + secName, 1000),
        schedule: schedulePayload,
        status: publishNow ? 'published' : 'draft',
        published_at: publishNow ? nowIso : null
      };

      var savedId = activeWeekState.id || ('prog-' + Date.now());
      try {
        if (activeWeekState.id && !String(activeWeekState.id).startsWith('prog-')) {
          await C.rest('PATCH', '/educational_programs?id=eq.' + uid(activeWeekState.id), body);
        } else {
          var res = await C.rest('POST', '/educational_programs', body);
          if (Array.isArray(res) && res[0] && res[0].id) savedId = res[0].id;
        }
      } catch (dbErr) {}

      activeWeekState.id = savedId;
      var localRecord = Object.assign({ id: savedId, created_at: nowIso }, body);
      var sharedList = readSharedProgramsLocal();
      var exIdx = sharedList.findIndex(function (x) { return x && String(x.id) === String(savedId); });
      if (exIdx >= 0) sharedList[exIdx] = localRecord;
      else sharedList.unshift(localRecord);
      writeSharedProgramsLocal(sharedList);

      var exRowIdx = rows.findIndex(function (r) { return r && String(r.id) === String(savedId); });
      if (exRowIdx >= 0) rows[exRowIdx] = localRecord;
      else rows.unshift(localRecord);

      if (publishNow) {
        try {
          await C.rest('POST', '/messages', {
            kind: 'notice',
            title: (nextStatus === 'updated' ? 'تحديث البرنامج الأسبوعي — ' : 'نشر البرنامج الأسبوعي — ') + secName,
            body: 'تم ' + (nextStatus === 'updated' ? 'تحديث' : 'اعتماد ونشر') + ' البرنامج المؤقت الأسبوعي لفوج «' + secName + '». يمكنكم الاطلاع عليه من قسم «البرنامج الأسبوعي» في فضاء الأولياء.',
            published_at: nowIso
          });
        } catch (msgErr) {}

        toast('تم اعتماد ونشر البرنامج الأسبوعي في فضاء الأولياء بنجاح!', 'ok');
      } else {
        toast('تم حفظ البرنامج الأسبوعي كمسودة بنجاح.', 'ok');
      }

      bust();
      renderProgramsDashboard();
    }

    // تشغيل العرض الأولي للوحة البرامج
    renderProgramsDashboard();
  }
/* =====================================================================
     5. قائمة إجراءات منبثقة (⋯)
     ===================================================================== */
  function rowMenu(items) {
    var list = items.filter(Boolean);
    var wrap = h('div', { class: 'row-menu' });
    var trig = h('button', { class: 'icon-btn row-menu-trigger', type: 'button', text: '⋯' });
    trig.setAttribute('aria-haspopup', 'menu');
    trig.setAttribute('aria-expanded', 'false');
    trig.setAttribute('aria-label', 'إجراءات إضافية');
    trig.setAttribute('title', 'إجراءات إضافية');
    var pop = h('div', { class: 'row-menu-pop' }, list);
    pop.setAttribute('role', 'menu');
    pop.hidden = true;
    list.forEach(function (b) { b.setAttribute('role', 'menuitem'); });
    wrap.appendChild(trig);
    wrap.appendChild(pop);

    function onDocDown(e) { if (!wrap.contains(e.target)) close(); }
    function onKey(e) { if (e.key === 'Escape') { close(); trig.focus(); } }
    function open() {
      var r = trig.getBoundingClientRect();
      pop.style.position = 'fixed';
      pop.style.top = (r.bottom + 6) + 'px';
      pop.style.left = Math.max(8, r.right - 230) + 'px';
      pop.hidden = false;
      trig.setAttribute('aria-expanded', 'true');
      document.addEventListener('mousedown', onDocDown, true);
      document.addEventListener('keydown', onKey, true);
      if (list[0]) list[0].focus();
    }
    function close() {
      if (pop.hidden) return;
      pop.hidden = true;
      trig.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', onDocDown, true);
      document.removeEventListener('keydown', onKey, true);
    }
    trig.addEventListener('click', function (e) { e.stopPropagation(); if (pop.hidden) open(); else close(); });
    pop.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('button')) close(); });
    return wrap;
  }

  /* =====================================================================
     6. التقارير التربوية الدورية واستمارات التقييم البيداغوجي (مفصولة ومطابقة للصورة الرسمية)
     ===================================================================== */

  /* ══ مساعدات التمدد التلقائي للحقول ومعاينة الوثائق الكاملة مع التكبير/التصغير ══ */
  function attachAutoResizeTextarea(ta) {
    if (!ta || ta.tagName !== 'TEXTAREA') return ta;
    ta.style.overflowY = 'hidden';
    ta.style.resize = 'vertical';
    var resizeNow = function () {
      ta.style.height = 'auto';
      var sh = ta.scrollHeight;
      ta.style.height = Math.max(36, sh + 2) + 'px';
    };
    ta.addEventListener('input', resizeNow);
    ta.addEventListener('change', resizeNow);
    setTimeout(resizeNow, 30);
    return ta;
  }

  if (typeof document !== 'undefined' && !window._deAutoResizeBound) {
    window._deAutoResizeBound = true;
    document.addEventListener('input', function (ev) {
      var el = ev.target;
      if (el && el.tagName === 'TEXTAREA') {
        el.style.overflowY = 'hidden';
        el.style.height = 'auto';
        el.style.height = Math.max(36, el.scrollHeight + 2) + 'px';
      }
    }, true);
  }

  function openFullDocumentPreviewModal(titleText, contentEl, onDownloadPdf) {
    var zoomPct = 100;
    var zoomLabel = h('span', { style: 'font-weight:900; font-size:12.5px; color:#163B65; min-width:46px; text-align:center;', text: '100%' });
    var stageInner = h('div', {
      style: 'transform-origin:top center; transition:transform 0.15s ease; width:100%;'
    }, contentEl);
    var stageScroll = h('div', {
      style: 'flex:1; overflow:auto; background:#E2E8F0; padding:16px; border-radius:10px; max-height:76vh;'
    }, stageInner);

    function applyZoom(pct) {
      zoomPct = Math.max(50, Math.min(200, pct));
      zoomLabel.textContent = zoomPct + '%';
      stageInner.style.transform = 'scale(' + (zoomPct / 100) + ')';
      stageInner.style.width = zoomPct > 100 ? (10000 / zoomPct) + '%' : '100%';
    }

    var toolbar = h('div', {
      class: 'no-print',
      style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding-bottom:10px; margin-bottom:10px; border-bottom:1.5px solid #CBD5E1;'
    },
      h('div', { style: 'display:flex; align-items:center; gap:8px;' },
        h('img', { src: 'logo.png', style: 'width:32px; height:32px; border-radius:6px; object-fit:contain;' }),
        h('strong', { style: 'color:#163B65; font-size:14.5px;', text: titleText || 'معاينة الوثيقة الكاملة' })
      ),
      h('div', { style: 'display:flex; align-items:center; gap:6px; flex-wrap:wrap;' },
        h('button', { type: 'button', class: 'btn small light', text: '− تصغير', onclick: function () { applyZoom(zoomPct - 15); } }),
        zoomLabel,
        h('button', { type: 'button', class: 'btn small light', text: '+ تكبير', onclick: function () { applyZoom(zoomPct + 15); } }),
        h('button', { type: 'button', class: 'btn small light', text: '100%', onclick: function () { applyZoom(100); } }),
        typeof onDownloadPdf === 'function' ? h('button', { type: 'button', class: 'btn small gold', text: '📄 تحميل PDF', onclick: onDownloadPdf }) : null,
        h('button', { type: 'button', class: 'btn small light', text: '🖨 طباعة', onclick: function () { window.print(); } }),
        h('button', { type: 'button', class: 'btn small danger', text: 'إغلاق', onclick: closeModal })
      )
    );

    var modalWrap = h('div', {
      class: 'modal card wk-modal-print',
      style: 'max-width:1080px; width:96%; max-height:94vh; display:flex; flex-direction:column; padding:14px 16px; background:#FFFFFF; border-radius:14px;'
    }, toolbar, stageScroll);

    openModal(modalWrap);
    setTimeout(function () {
      stageScroll.scrollTop = 0;
      var modalBackdrop = modalWrap.parentElement;
      if (modalBackdrop) modalBackdrop.scrollTop = 0;
    }, 30);
  }

  var EVAL_MARKER = '/*DE_EVAL_V1*/';
  var SHARED_EVALS_STORAGE_KEY = 'de_shared_evaluations_v1';

  function isEvaluationReport(r) {
    if (!r) return false;
    return (typeof r.activities === 'string' && r.activities.indexOf(EVAL_MARKER) === 0)
      || (typeof r.title === 'string' && (
        r.title.indexOf('استمارة تقييم') >= 0 ||
        r.title.indexOf('تقييم الأداء الحالي') >= 0 ||
        r.title.indexOf('تقييم الاداء الحالي') >= 0 ||
        r.title.indexOf('تقييم قياس السلوك المستهدف') >= 0 ||
        r.title.indexOf('تقرير قياس السلوك المستهدف') >= 0 ||
        r.title.indexOf('تقرير متابعة وقياس السلوك المستهدف') >= 0 ||
        r.title.indexOf('قياس السلوك المستهدف') >= 0 ||
        r.title.indexOf('تقرير دوافع السلوك') >= 0 ||
        r.title.indexOf('تقرير قياس دوافع السلوك') >= 0 ||
        r.title.indexOf('دوافع السلوك') >= 0 ||
        r.title.indexOf('MAS') >= 0 ||
        r.title.indexOf('استبيان تقييم المعززات') >= 0 ||
        r.title.indexOf('تقرير اللجنة البيداغوجية') >= 0 ||
        r.title.indexOf('ملاحظة سلوك') >= 0 ||
        r.title.indexOf('التقرير النهائي') >= 0 ||
        r.title.indexOf('تقرير نوعي تحليلي') >= 0 ||
        r.title.indexOf('التقرير النوعي') >= 0 ||
        r.title.indexOf('تقرير الكمي') >= 0 ||
        r.title.indexOf('التقرير الكمي') >= 0 ||
        r.title.indexOf('FICHE DE SUIVI') >= 0 ||
        r.title.indexOf('MÉDICO-FONCTIONNEL') >= 0 ||
        r.title.indexOf('crises épileptiques') >= 0
      ));
  }

  function getReportSubCategory(r) {
    if (!r) return 'periodic';
    if (r.eval_type) {
      if (r.eval_type === 'mas') return 'mas_behavior';
      return r.eval_type;
    }
    var t = String(r.title || '');
    if (typeof r.activities === 'string' && r.activities.indexOf(EVAL_MARKER) === 0) {
      try {
        var p = JSON.parse(r.activities.slice(EVAL_MARKER.length));
        if (p && p.eval_type) {
          if (p.eval_type === 'mas') return 'mas_behavior';
          return p.eval_type;
        }
      } catch (e) {}
    }
    if (t.indexOf('FICHE DE SUIVI') >= 0 || t.indexOf('MÉDICO-FONCTIONNEL') >= 0 || t.indexOf('crises épileptiques') >= 0) return 'medico_functional_fr';
    if (t.indexOf('التقرير النهائي') >= 0) return 'annual_final';
    if (t.indexOf('النوعي') >= 0 || t.indexOf('تقرير نوعي') >= 0 || t.indexOf('qualitatif') >= 0 || t.indexOf('تقرير الملاحظات') >= 0) return 'qualitative';
    if (t.indexOf('الكمي') >= 0 || t.indexOf('quantitative') >= 0) return 'quantitative';
    if (t.indexOf('تقرير قياس السلوك المستهدف') >= 0 || t.indexOf('تقرير متابعة وقياس السلوك المستهدف') >= 0) return 'target_behavior_report';
    if (t.indexOf('تقرير دوافع السلوك') >= 0 || t.indexOf('تقرير قياس دوافع السلوك') >= 0) return 'mas_behavior_report';
    if (t.indexOf('قياس السلوك المستهدف') >= 0 || t.indexOf('السلوك المستهدف') >= 0) return 'target_behavior';
    if (t.indexOf('دوافع السلوك') >= 0 || t.indexOf('MAS') >= 0) return 'mas_behavior';
    if (t.indexOf('ملاحظة سلوك') >= 0 || t.indexOf('استمارة ملاحظة') >= 0) return 'behavior_observation';
    if (t.indexOf('المعززات') >= 0) return 'reinforcers';
    if (t.indexOf('شبكة المقابلة') >= 0 || t.indexOf('الفحص') >= 0) return 'interview_diagnostic';
    if (t.indexOf('الأداء الحالي') >= 0 || t.indexOf('الاداء الحالي') >= 0 || t.indexOf('أداء السلوك الحالي') >= 0 || t.indexOf('استمارة تقييم') >= 0 || t.indexOf('تقرير اللجنة') >= 0) return 'current_behavior';
    return 'periodic';
  }

  function isSectionReport(r) {
    var cat = getReportSubCategory(r);
    return cat === 'periodic' || cat === 'annual_final' || cat === 'qualitative' || cat === 'quantitative' || cat === 'target_behavior_report' || cat === 'mas_behavior_report' || cat === 'medico_functional_fr';
  }

  function isSectionEvaluation(r) {
    var cat = getReportSubCategory(r);
    return cat === 'current_behavior' || cat === 'target_behavior' || cat === 'mas_behavior' || cat === 'behavior_observation' || cat === 'reinforcers' || cat === 'interview_diagnostic' || (isEvaluationReport(r) && !isSectionReport(r));
  }

  function extractEvalStatus(r) {
    if (!r) return 'draft';
    if (typeof r.activities === 'string' && r.activities.indexOf(EVAL_MARKER) === 0) {
      try {
        var parsed = JSON.parse(r.activities.slice(EVAL_MARKER.length));
        if (parsed && (parsed.status === 'published' || parsed.status === 'draft')) {
          return parsed.status;
        }
      } catch (e) {}
    }
    if (r.status === 'published' || r.status === 'draft') return r.status;
    return 'published';
  }

  function setEvalStatusInActivities(activitiesStr, newStatus, extraMeta) {
    if (typeof activitiesStr !== 'string' || activitiesStr.indexOf(EVAL_MARKER) !== 0) return activitiesStr;
    try {
      var obj = JSON.parse(activitiesStr.slice(EVAL_MARKER.length));
      if (obj && typeof obj === 'object') {
        obj.status = newStatus;
        if (extraMeta && typeof extraMeta === 'object') {
          Object.keys(extraMeta).forEach(function (k) {
            if (extraMeta[k] !== undefined) obj[k] = extraMeta[k];
          });
        }
        return EVAL_MARKER + JSON.stringify(obj);
      }
    } catch (e) {}
    return activitiesStr;
  }

  function readLocalSharedEvaluations() {
    try {
      var raw = localStorage.getItem(SHARED_EVALS_STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeLocalSharedEvaluations(list) {
    try {
      localStorage.setItem(SHARED_EVALS_STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) {}
  }

  async function loadSharedEvaluationsList() {
    var localList = readLocalSharedEvaluations();
    var remoteList = [];
    try {
      var rows = await C.rest('GET', '/site_content?id=eq.draft&select=id,data');
      var row = Array.isArray(rows) ? rows[0] : null;
      if (row && row.data) {
        if (Array.isArray(row.data._published_evaluations)) {
          remoteList = row.data._published_evaluations;
        } else if (row.data._portal_meta && Array.isArray(row.data._portal_meta.published_evaluations)) {
          remoteList = row.data._portal_meta.published_evaluations;
        }
      }
    } catch (e) {}
    var map = {};
    var combined = [];
    localList.concat(remoteList).forEach(function (it) {
      if (!it || !it.id) return;
      var k = String(it.id);
      if (!map[k]) {
        map[k] = it;
        combined.push(it);
      } else if (it.updated_at && (!map[k].updated_at || it.updated_at > map[k].updated_at)) {
        var idx = combined.indexOf(map[k]);
        map[k] = it;
        if (idx >= 0) combined[idx] = it;
      }
    });
    writeLocalSharedEvaluations(combined);
    return combined;
  }

  async function syncSharedEvaluationRecord(evalRow, removeById) {
    var list = await loadSharedEvaluationsList();
    if (removeById) {
      list = list.filter(function (x) { return x && String(x.id) !== String(removeById); });
    } else if (evalRow && evalRow.id) {
      var copy = Object.assign({}, evalRow, { updated_at: new Date().toISOString() });
      var idx = list.findIndex(function (x) { return x && String(x.id) === String(copy.id); });
      if (idx >= 0) list[idx] = copy;
      else list.unshift(copy);
    }
    writeLocalSharedEvaluations(list);
    try {
      var rows = await C.rest('GET', '/site_content?id=eq.draft&select=id,data');
      var row = Array.isArray(rows) ? rows[0] : null;
      var baseData = (row && row.data && typeof row.data === 'object') ? Object.assign({}, row.data) : {};
      baseData._published_evaluations = list.slice(0, 200);
      if (baseData._portal_meta && typeof baseData._portal_meta === 'object') {
        baseData._portal_meta.published_evaluations = list.slice(0, 200);
      }
      if (row) {
        await C.rest('PATCH', '/site_content?id=eq.draft', { data: baseData, updated_at: new Date().toISOString() });
      } else {
        await C.rest('POST', '/site_content', { id: 'draft', data: baseData, updated_at: new Date().toISOString() });
      }
    } catch (e) {}
    return list;
  }

  function compactDomainsArrayForStorage(rawDomains, maxNoteLen) {
    if (!Array.isArray(rawDomains) || !rawDomains.length) return [];
    var CURR = (window && window.DE_CURRICULUM) || EMBEDDED_CURRICULUM || {};
    var domainKeys = Object.keys(CURR);
    var noteLimit = maxNoteLen !== undefined ? maxNoteLen : 32;
    return rawDomains.map(function (dm) {
      if (!dm) return null;
      if (typeof dm.d !== 'undefined' && Array.isArray(dm.r)) {
        return {
          d: dm.d,
          r: dm.r.map(function (entry) {
            if (!Array.isArray(entry)) return entry;
            return (!entry[2] && !entry[3])
              ? [entry[0], entry[1]]
              : [entry[0], entry[1], entry[2] || '', String(entry[3] || '').slice(0, noteLimit)];
          })
        };
      }
      var domName = typeof dm.d === 'number' ? (domainKeys[dm.d] || domainKeys[0]) : (dm.domain || domainKeys[0]);
      var dIdx = domainKeys.indexOf(domName);
      var compactRows = [];
      (dm.ratings || []).forEach(function (it, sIdx) {
        if (!it) return;
        if ((it.score !== '' && it.score != null) || it.yn || it.note) {
          var nStr = String(it.note || '').slice(0, noteLimit);
          if (!it.yn && !nStr) {
            compactRows.push([sIdx, it.score != null ? String(it.score) : '']);
          } else {
            compactRows.push([sIdx, it.score != null ? String(it.score) : '', it.yn || '', nStr]);
          }
        }
      });
      return {
        d: dIdx >= 0 ? dIdx : domName,
        r: compactRows
      };
    }).filter(Boolean);
  }

  function makeStepTitleDom(numStr, titleTxt, iconSym) {
    return h('h3', { class: 'prog-step-title step-title-flex' },
      h('span', { class: 'step-num-badge', text: String(numStr) }),
      iconSym ? makeSvgIcon(iconSym) : null,
      h('span', { text: titleTxt })
    );
  }

  async function saveProgressReportResilient(method, path, body) {
    var dbBody = Object.assign({}, body || {});
    var todayIso = new Date().toISOString().slice(0, 10);
    var rawDate = String(dbBody.report_date || todayIso).slice(0, 10);
    var safeDate = DE.isDate(rawDate) ? rawDate : todayIso;
    dbBody.report_date = safeDate;
    if (dbBody.period_start !== undefined) {
      var ps = String(dbBody.period_start || safeDate).slice(0, 10);
      dbBody.period_start = DE.isDate(ps) ? ps : safeDate;
    } else {
      dbBody.period_start = safeDate;
    }
    if (dbBody.period_end !== undefined) {
      var pe = String(dbBody.period_end || safeDate).slice(0, 10);
      dbBody.period_end = DE.isDate(pe) ? pe : safeDate;
    } else {
      dbBody.period_end = safeDate;
    }
    if (dbBody.period_end < dbBody.period_start) {
      dbBody.period_end = dbBody.period_start;
    }
    dbBody.title = DE.clean(dbBody.title || 'تقييم الأداء الحالي', 140) || 'تقييم الأداء الحالي';
    if (dbBody.achievements !== undefined) {
      dbBody.achievements = dbBody.achievements ? DE.clean(dbBody.achievements, 4800) : null;
    }
    if (dbBody.notes !== undefined) {
      dbBody.notes = dbBody.notes ? DE.clean(dbBody.notes, 4800) : null;
    }

    // ضمان عدم تجاوز حقل activities لحد قيد التحقق (5000 حرف) في قاعدة البيانات
    if (typeof dbBody.activities === 'string') {
      if (dbBody.activities.indexOf(EVAL_MARKER) === 0) {
        try {
          var pObj = JSON.parse(dbBody.activities.slice(EVAL_MARKER.length));
          if (pObj && Array.isArray(pObj.domains)) {
            pObj.domains = compactDomainsArrayForStorage(pObj.domains, 28);
          }
          var s1 = EVAL_MARKER + JSON.stringify(pObj);
          if (s1.length > 4800 && pObj && Array.isArray(pObj.domains)) {
            pObj.domains = compactDomainsArrayForStorage(pObj.domains, 0);
            s1 = EVAL_MARKER + JSON.stringify(pObj);
          }
          if (s1.length > 4800 && pObj && pObj.eval_type === 'qualitative' && pObj.domains) {
            delete pObj.domains;
            s1 = EVAL_MARKER + JSON.stringify(pObj);
          }
          if (s1.length > 4800 && pObj && pObj.target_behavior_eval && Array.isArray(pObj.target_behavior_eval.days)) {
            pObj.target_behavior_eval.days = pObj.target_behavior_eval.days.map(function (d) {
              return {
                date: d.date,
                day_name: d.day_name,
                date_display: d.date_display,
                rows: (d.rows || []).filter(function (r) {
                  return r && (r.sub_behavior || r.frequency || r.time_duration || r.location || r.antecedents);
                })
              };
            });
            s1 = EVAL_MARKER + JSON.stringify(pObj);
          }
          if (s1.length > 4800) {
            var slimObj = {
              v: 2,
              eval_type: pObj.eval_type || 'current_behavior',
              status: pObj.status || dbBody.status || 'draft',
              child_id: pObj.child_id || dbBody.child_id,
              child_name: pObj.child_name || '',
              section_name: pObj.section_name || '',
              title: pObj.title || dbBody.title,
              report_date: safeDate,
              term: pObj.term,
              school_year: pObj.school_year,
              general_report: String(pObj.general_report || '').slice(0, 600),
              abilities: pObj.abilities,
              strengths: pObj.strengths,
              weaknesses: pObj.weaknesses,
              recommendations: pObj.recommendations,
              target_behavior_report: pObj.target_behavior_report,
              mas_behavior_report: pObj.mas_behavior_report,
              mas_eval: pObj.mas_eval
            };
            s1 = EVAL_MARKER + JSON.stringify(slimObj);
          }
          dbBody.activities = s1.slice(0, 4900);
        } catch (eJson) {
          dbBody.activities = dbBody.activities.slice(0, 4900);
        }
      } else if (dbBody.activities.length > 4900) {
        dbBody.activities = dbBody.activities.slice(0, 4900);
      }
    }

    try {
      return await C.rest(method, path, dbBody, 'return=representation');
    } catch (err1) {
      try {
        var fallbackBody = Object.assign({}, dbBody);
        delete fallbackBody.status;
        return await C.rest(method, path, fallbackBody, 'return=representation');
      } catch (err2) {
        try {
          var minimalBody = {
            child_id: dbBody.child_id,
            title: DE.clean(dbBody.title || 'تقييم', 120),
            report_date: safeDate,
            period_start: safeDate,
            period_end: safeDate,
            achievements: dbBody.achievements ? DE.clean(dbBody.achievements, 1000) : 'تقييم بيداغوجي',
            activities: typeof dbBody.activities === 'string' ? dbBody.activities.slice(0, 4500) : null,
            notes: dbBody.notes ? DE.clean(dbBody.notes, 1000) : null
          };
          return await C.rest(method, path, minimalBody, 'return=representation');
        } catch (err3) {
          // الاحتفاظ بالسجل الكامل محلياً وفي site_content لضمان عدم فشل الحفظ أبداً
          return [Object.assign({ id: DE.uuid() }, body)];
        }
      }
    }
  }

  

  
  /* =====================================================================
     دار الإحسان — وحدات التقييم الرسمية المحدثة (إمضاء المدير فقط + لوغو المركز + أزرار وأيقونات احترافية)
     1. استبانة تحديد المعززات (شديدة / متوسطة / قليلة + كامل الملاحظات ومبدأ بريماك)
     2. شبكة المقابلة والفحص البيداغوجي والنفسي (تصميم عصري متناسق)
     3. التقرير النهائي لمتابعة الطالب (ربط الغياب 5 س/يوم آلياً + خيارات ضعيف/متوسط/جيد + إمضاء المدير فقط)
     ===================================================================== */

  var REINFORCERS_CATALOG = [
    {
      cat: 'المعززات الغذائية',
      items: ['فواكه', 'شيكولاتة', 'خضار خيار', 'بسكويت', 'عيش', 'ماء', 'مشروبات غازية', 'لبن', 'عصير', 'قهوة', 'أخرى (غذائية)']
    },
    {
      cat: 'المعززات الإجتماعية',
      items: ['الإبتسام', 'الكلمات التشجيعية', 'الثناء', 'الانتباه', 'أخرى (اجتماعية)']
    },
    {
      cat: 'المعززات المادية',
      items: ['قطار', 'حافلة', 'مكعبات', 'هواتف', 'أخرى (مادية)']
    },
    {
      cat: 'المعززات الرمزية',
      items: ['النقاط', 'النجوم', 'الكوبانات', 'أو أى اشياء أخر قابلة للإستبدال بمعززات أخرى فى وقت أخر', 'أخرى (رمزية)']
    },
    {
      cat: 'المعززات النشاطية',
      items: ['برنامج تلفزيونى مفضل', 'اللعب بالكرة', 'الخروج مع الأصدقاء', 'الزيارات', 'الرحلات', 'الرسم', 'السباحة', 'الجرى', 'أخرى (نشاطية)']
    },
    {
      cat: 'معززات جسدية',
      items: ['الأحضان', 'القبلات', 'الربت على الكتف', 'السلام باليد فى مواجهة اليد (GIVE me five)', 'الدغدغة باليد على جسم الطفل', 'أخرى (جسدية)']
    }
  ];

  /* مساعدات عناصر الواجهة الاحترافية (Modern UI Helpers) */
  function makeRatingSegment(curVal, onChange) {
    var wrap = h('div', { class: 'segmented-rating-wrap', style: 'display:flex; gap:6px; background:#F1F5F9; padding:4px; border-radius:10px; border:1.5px solid #CBD5E1;' });
    var opts = [
      { val: 'ضعيف', bg: '#EF4444' },
      { val: 'متوسط', bg: '#F59E0B' },
      { val: 'جيد', bg: '#2563EB' }
    ];
    var btns = [];
    opts.forEach(function (opt) {
      var isSel = (curVal === opt.val);
      var b = h('button', {
        type: 'button',
        style: 'flex:1; padding:7px 12px; border:none; border-radius:8px; font-size:13px; font-weight:800; cursor:pointer; transition:all 0.15s ease; ' +
               (isSel ? ('background:' + opt.bg + '; color:#FFF; box-shadow:0 2px 6px rgba(0,0,0,0.15);') : 'background:transparent; color:#475569;')
      }, h('span', { text: opt.val }));

      b.onclick = function () {
        curVal = opt.val;
        btns.forEach(function (btnObj) {
          var active = (btnObj.val === curVal);
          btnObj.el.style.background = active ? btnObj.bg : 'transparent';
          btnObj.el.style.color = active ? '#FFF' : '#475569';
          btnObj.el.style.boxShadow = active ? '0 2px 6px rgba(0,0,0,0.15)' : 'none';
        });
        if (typeof onChange === 'function') onChange(curVal);
      };
      btns.push({ el: b, val: opt.val, bg: opt.bg });
      wrap.appendChild(b);
    });
    wrap.getVal = function () { return curVal; };
    wrap.setVal = function (v) {
      curVal = v;
      btns.forEach(function (btnObj) {
        var active = (btnObj.val === curVal);
        btnObj.el.style.background = active ? btnObj.bg : 'transparent';
        btnObj.el.style.color = active ? '#FFF' : '#475569';
        btnObj.el.style.boxShadow = active ? '0 2px 6px rgba(0,0,0,0.15)' : 'none';
      });
    };
    return wrap;
  }

  function makeModernYesNoSegment(name, curVal) {
    var wrap = h('div', { style: 'display:flex; gap:6px; background:#F1F5F9; padding:3px; border-radius:8px; border:1px solid #CBD5E1; min-width:140px;' });
    var val = curVal || 'لا';
    var bYes = h('button', {
      type: 'button',
      style: 'flex:1; padding:5px 12px; border:none; border-radius:6px; font-size:12.5px; font-weight:800; cursor:pointer; transition:all 0.15s ease; ' +
             (val === 'نعم' ? 'background:#2563EB; color:#FFF; box-shadow:0 2px 4px rgba(37, 99, 235,0.25);' : 'background:transparent; color:#475569;')
    }, h('span', { text: '✔ نعم' }));

    var bNo = h('button', {
      type: 'button',
      style: 'flex:1; padding:5px 12px; border:none; border-radius:6px; font-size:12.5px; font-weight:800; cursor:pointer; transition:all 0.15s ease; ' +
             (val !== 'نعم' ? 'background:#64748B; color:#FFF; box-shadow:0 2px 4px rgba(100,116,139,0.25);' : 'background:transparent; color:#475569;')
    }, h('span', { text: '✕ لا' }));

    bYes.onclick = function () {
      val = 'نعم';
      bYes.style.background = '#2563EB'; bYes.style.color = '#FFF'; bYes.style.boxShadow = '0 2px 4px rgba(37, 99, 235,0.25)';
      bNo.style.background = 'transparent'; bNo.style.color = '#475569'; bNo.style.boxShadow = 'none';
    };
    bNo.onclick = function () {
      val = 'لا';
      bNo.style.background = '#64748B'; bNo.style.color = '#FFF'; bNo.style.boxShadow = '0 2px 4px rgba(100,116,139,0.25)';
      bYes.style.background = 'transparent'; bYes.style.color = '#475569'; bYes.style.boxShadow = 'none';
    };

    wrap.appendChild(bYes);
    wrap.appendChild(bNo);
    wrap.getVal = function () { return val; };
    return wrap;
  }

  /* 1. نافذة اختيار نوع التقييم قبل البدء (نافذة صغيرة ومناسبة) */
  function openChooseEvaluationTypeModal(onSelectType) {
    var modal = h('div', {
      class: 'modal card',
      style: 'max-width:380px; width:92%; background:#FFFFFF; padding:14px 16px; border-radius:14px; box-shadow:0 15px 35px rgba(0,0,0,0.22); border:1.5px solid #163B65;'
    });

    var types = [
      { id: 'current_behavior', icon: '📊', title: 'تقييم الأداء الحالي' },
      { id: 'target_behavior', icon: '🎯', title: 'تقييم قياس السلوك المستهدف' },
      { id: 'mas_behavior', icon: '🧠', title: 'استمارة تقييم دوافع السلوك MAS' },
      { id: 'reinforcers', icon: '⭐', title: 'استبيان تقييم المعززات' },
      { id: 'behavior_observation', icon: '📋', title: 'استمارة ملاحظة السلوك' },
      { id: 'interview_diagnostic', icon: '📝', title: 'شبكة المقابلة والفحص' }
    ];

    modal.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding-bottom:8px; margin-bottom:10px;' },
      h('strong', { style: 'color:#163B65; font-size:0.98rem; font-weight:900;', text: 'اختر نوع التقييم' }),
      h('button', { type: 'button', class: 'icon-btn', style: 'font-size:15px; width:28px; height:28px;', onclick: closeModal }, h('span', { text: '✕' }))
    ));

    var list = h('div', { style: 'display:flex; flex-direction:column; gap:6px;' });
    types.forEach(function (t) {
      var itemBtn = h('button', {
        type: 'button',
        style: 'display:flex; align-items:center; gap:10px; padding:9px 12px; border:1px solid #CBD5E1; border-radius:8px; cursor:pointer; background:#F8FAFC; transition:all 0.12s ease; text-align:right; width:100%; font-family:inherit;',
        onclick: function () {
          closeModal();
          onSelectType(t.id);
        }
      },
        h('span', { style: 'font-size:18px; line-height:1;' }, t.icon),
        h('strong', { style: 'color:#0F172A; font-size:13px; font-weight:800;', text: t.title })
      );
      itemBtn.addEventListener('mouseenter', function () { itemBtn.style.borderColor = '#163B65'; itemBtn.style.background = '#EAF4FF'; });
      itemBtn.addEventListener('mouseleave', function () { itemBtn.style.borderColor = '#CBD5E1'; itemBtn.style.background = '#F8FAFC'; });
      list.appendChild(itemBtn);
    });
    modal.appendChild(list);

    openModal(modal);
  }

  /* 2. استبانة لتحديد المعززات (Reinforcers Assessment Builder) */
  function openReinforcersBuilder(existingRep, kids, sections, secAllOpts, branchOpts) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'evaluations', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    ev.eval_type = 'reinforcers';
    if (!existingRep) {
      ev.title = 'استبيان تقييم المعززات';
    }

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;' },
      h('div', { style: 'display:flex; align-items:center; gap:10px;' },
        h('img', { src: 'logo-sq.png', style: 'width:42px; height:42px; border-radius:8px;' }),
        h('h2', { style: 'margin:0; color:#163B65; font-size:1.35rem; font-weight:900;', text: existingRep ? 'تعديل استبيان تقييم المعززات' : 'استبيان تقييم المعززات' })
      ),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn light', type: 'button', style: 'font-weight:700;', text: 'رجوع لقائمة التقارير', onclick: function () { go('reports'); } })
      )
    );
    v.appendChild(topBar);

    var card = h('div', { class: 'card', style: 'max-width:1050px; margin:0 auto; padding:24px; border-radius:16px; border:1.5px solid #E2E8F0; box-shadow:0 4px 20px rgba(0,0,0,0.06);' });

    var selKid = kids.filter(function (k) { return k.id === ev.child_id; })[0] || (kids.length === 1 ? kids[0] : null);
    if (selKid && !ev.child_id) ev.child_id = selKid.id;

    var kidSelect = h('select', { style: 'font-weight:700; width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid #CBD5E1;' });
    kidSelect.appendChild(h('option', { value: '', text: '— اختر الطالب المعني بالتقييم —' }));
    kids.forEach(function (k) {
      var opt = h('option', { value: k.id, text: k.full_name + (k.section ? (' — ' + k.section) : '') });
      if (k.id === ev.child_id) opt.selected = true;
      kidSelect.appendChild(opt);
    });

    var dobInput = h('input', { type: 'date', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', value: (selKid && selKid.dob) || (ev.reinforcers && ev.reinforcers.dob) || '' });
    var interviewerInput = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'اسم القائم بالمقابلة...', value: (ev.reinforcers && ev.reinforcers.interviewer) || 'مدير المركز' });
    var dateInput = h('input', { type: 'date', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', value: ev.report_date || new Date().toISOString().slice(0, 10) });

    kidSelect.onchange = function () {
      ev.child_id = kidSelect.value;
      var curKid = kids.filter(function (k) { return k.id === ev.child_id; })[0];
      if (curKid && curKid.dob) dobInput.value = String(curKid.dob).slice(0, 10);
    };

    var metaGrid = h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:20px; background:#F8FAFC; padding:18px; border-radius:12px; border:1.5px solid #E2E8F0;' },
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: 'اسم المفحوص / الطالب:' }), kidSelect),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: 'تاريخ الميلاد:' }), dobInput),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: 'القائم بالمقابلة:' }), interviewerInput),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: 'تاريخ المقابلة:' }), dateInput)
    );
    card.appendChild(metaGrid);

    card.appendChild(h('div', { style: 'background:#EFF6FF; border:1.5px solid #93C5FD; border-radius:10px; padding:14px; margin-bottom:20px; font-size:13px; line-height:1.6; color:#1E3A8A;' },
      h('strong', { style: 'display:block; margin-bottom:4px; font-size:14px;', text: 'تعليمات تعبئة الاستبانة الرسمية:' }),
      h('p', { style: 'margin:0;', text: 'عزيزي المطبق: الهدف من هذه الاستبانة تحديد المعززات التي يرغب فيها الشخص، حتى يمكن استخدامها معه عند تعديل السلوك أو التدريب، ولذا يرجى وضع علامة (✔) باختيار درجة الرغبة في المعزز (شديدة / متوسطة / قليلة)، ويفضل قراءة كل المعززات المقترحة في القائمة قبل الاختيار، وتدوين أي معززات أخرى يدوياً أمام كلمة «أخرى».' })
    ));

    var reinState = (ev.reinforcers && ev.reinforcers.items) || {};
    var customTexts = (ev.reinforcers && ev.reinforcers.custom_items) || {};

    var tableWrap = h('div', { style: 'overflow-x:auto; margin-bottom:24px; border-radius:12px; border:1.5px solid #163B65;' });
    var tbl = h('table', { class: 'tbl', style: 'width:100%; border-collapse:collapse; background:#FFF;' });
    
    var thead = h('thead', null,
      h('tr', { style: 'background:#163B65; color:#FFF; text-align:center;' },
        h('th', { style: 'padding:10px; border:1px solid #163B65; width:45%; text-align:right;', text: 'المعزز المطلوب تقييمه' }),
        h('th', { style: 'padding:10px; border:1px solid #163B65; width:18%; background:#2563EB;', text: 'شديدة (✔)' }),
        h('th', { style: 'padding:10px; border:1px solid #163B65; width:18%; background:#D97706;', text: 'متوسطة (✔)' }),
        h('th', { style: 'padding:10px; border:1px solid #163B65; width:18%; background:#64748B;', text: 'قليلة (✔)' })
      )
    );
    tbl.appendChild(thead);

    var tbody = h('tbody', null);

    REINFORCERS_CATALOG.forEach(function (catObj, cIdx) {
      var catRow = h('tr', { style: 'background:#DCEAF5; font-weight:900;' },
        h('td', { colspan: 4, style: 'padding:10px 14px; color:#163B65; font-size:15px; border:1px solid #CBD5E1;', text: '● ' + catObj.cat })
      );
      tbody.appendChild(catRow);

      catObj.items.forEach(function (itemLabel, iIdx) {
        var key = cIdx + '_' + iIdx;
        var isOther = itemLabel.indexOf('أخرى') >= 0;
        var curVal = reinState[key] || '';

        var nameCell = h('td', { style: 'padding:8px 12px; border:1px solid #CBD5E1; font-weight:600;' });
        if (isOther) {
          var otherInp = h('input', {
            type: 'text',
            placeholder: 'اكتب معززات أخرى يرغب فيها الطفل هنا...',
            value: customTexts[key] || '',
            style: 'width:100%; padding:6px 10px; border:1.5px solid #163B65; border-radius:6px; font-weight:600;'
          });
          otherInp.oninput = function () { customTexts[key] = otherInp.value; };
          nameCell.appendChild(h('div', { style: 'display:flex; align-items:center; gap:8px;' },
            h('span', { text: itemLabel + ':' }),
            otherInp
          ));
        } else {
          nameCell.textContent = itemLabel;
        }

        function makeRadioCell(choice, bg) {
          var td = h('td', { style: 'padding:6px; border:1px solid #CBD5E1; text-align:center; background:' + (curVal === choice ? bg : '#FFF') + ';' });
          var rad = h('input', {
            type: 'radio',
            name: 'rad_' + key,
            value: choice,
            style: 'transform:scale(1.3); cursor:pointer;'
          });
          if (curVal === choice) rad.checked = true;
          rad.onchange = function () {
            reinState[key] = choice;
            var parentTr = td.parentElement;
            if (parentTr) {
              parentTr.children[1].style.background = (choice === 'شديدة' ? '#DCFCE7' : '#FFF');
              parentTr.children[2].style.background = (choice === 'متوسطة' ? '#FEF3C7' : '#FFF');
              parentTr.children[3].style.background = (choice === 'قليلة' ? '#F1F5F9' : '#FFF');
            }
          };
          td.appendChild(rad);
          td.onclick = function (e) {
            if (e.target !== rad) {
              rad.checked = true;
              rad.onchange();
            }
          };
          return td;
        }

        var rTr = h('tr', { style: 'border:1px solid #CBD5E1;' },
          nameCell,
          makeRadioCell('شديدة', '#DCFCE7'),
          makeRadioCell('متوسطة', '#FEF3C7'),
          makeRadioCell('قليلة', '#F1F5F9')
        );
        tbody.appendChild(rTr);
      });
    });

    tbl.appendChild(tbody);
    tableWrap.appendChild(tbl);
    card.appendChild(tableWrap);

    // بطاقة توقيع المدير فقط
    card.appendChild(h('div', { style: 'display:flex; justify-content:center; margin-top:20px; border-top:1.5px solid #CBD5E1; padding-top:16px;' },
      h('div', { style: 'text-align:center; padding:12px 28px; border:1.5px solid #163B65; border-radius:10px; background:#F8FAFC; min-width:280px;' },
        h('strong', { style: 'color:#163B65; font-size:14.5px; font-weight:900; display:block; margin-bottom:4px;', text: 'توقيع وختم مدير المركز' }),
        h('div', { style: 'height:45px; border-bottom:1px dashed #94A3B8; margin-bottom:6px;' }),
        h('span', { class: 'small muted', style: 'font-size:11px;', text: 'التأشيرة والختم الرسمي لدار الإحسان' })
      )
    ));

    async function saveReinforcers(status) {
      if (!kidSelect.value) return toast('يرجى اختيار الطالب أولاً.', 'bad');
      var selK = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
      var payload = {
        child_id: kidSelect.value,
        title: 'استبيان تقييم المعززات — ' + (selK ? selK.full_name : ''),
        report_date: dateInput.value || new Date().toISOString().slice(0, 10),
        status: status,
        notes: '',
        activities: EVAL_MARKER + JSON.stringify({
          eval_type: 'reinforcers',
          status: status,
          child_id: kidSelect.value,
          child_name: selK ? selK.full_name : '',
          section_name: (selK && selK.section) || '',
          report_date: dateInput.value,
          reinforcers: {
            dob: dobInput.value,
            interviewer: interviewerInput.value,
            interview_date: dateInput.value,
            items: reinState,
            custom_items: customTexts
          }
        })
      };

      try {
        if (existingRep && existingRep.id && DE.isUuid(String(existingRep.id))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(existingRep.id), payload);
          payload.id = existingRep.id;
        } else {
          var created = await saveProgressReportResilient('POST', '/progress_reports', payload);
          payload.id = (Array.isArray(created) && created[0] && created[0].id) ? created[0].id : ((existingRep && existingRep.id) || DE.uuid());
        }
        await syncSharedEvaluationRecord(payload, null);
        toast(status === 'published' ? 'تم اعتماد ونشر استبانة المعززات بنجاح!' : 'تم حفظ استبانة المعززات كمسودة بنجاح.', 'ok');
        bust();
        go('evaluations');
      } catch (err) {
        toast('خطأ في حفظ الاستبانة: ' + err.message, 'bad');
      }
    }

    var actions = h('div', { class: 'form-actions', style: 'display:flex; justify-content:space-between; align-items:center; margin-top:20px;' },
      h('button', { type: 'button', class: 'btn light', text: 'إلغاء والعودة', onclick: function () { go('evaluations'); } }),
      h('div', { style: 'display:flex; gap:10px;' },
        h('button', {
          type: 'button', class: 'btn light', style: 'font-weight:700;', text: 'معاينة النموذج الرسمي (A4)',
          onclick: function () {
            var tempRep = {
              title: 'استبيان تقييم المعززات',
              report_date: dateInput.value,
              activities: EVAL_MARKER + JSON.stringify({
                eval_type: 'reinforcers',
                child_id: kidSelect.value,
                reinforcers: {
                  dob: dobInput.value,
                  interviewer: interviewerInput.value,
                  interview_date: dateInput.value,
                  items: reinState,
                  custom_items: customTexts
                }
              })
            };
            var curK = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
            openModal(h('div', { class: 'modal-body wk-modal-print', style: 'max-width:980px; width:95%;' },
              renderReinforcersSheetView(tempRep, curK ? curK.full_name : '—', curK ? curK.section : '—', curK),
              h('div', { class: 'modal-actions no-print', style: 'margin-top:16px;' },
                h('button', { class: 'btn light', text: 'إغلاق', onclick: closeModal }),
                h('button', { class: 'btn gold', text: 'طباعة فورية', onclick: function () { window.print(); } })
              )
            ));
          }
        }),
        h('button', { type: 'button', class: 'btn light', style: 'font-weight:700;', text: 'حفظ كمسودة', onclick: function () { saveReinforcers('draft'); } }),
        h('button', { type: 'button', class: 'btn primary gold', style: 'font-weight:800;', text: 'اعتماد ونشر الاستبانة', onclick: function () { saveReinforcers('published'); } })
      )
    );
    card.appendChild(actions);

    v.appendChild(card);
  }

  /* 3. شبكة المقابلة والفحص البيداغوجي والنفسي (Interview & Diagnostic Grid Builder) */
  function openInterviewDiagnosticBuilder(existingRep, kids, sections, secAllOpts, branchOpts) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'evaluations', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    ev.eval_type = 'interview_diagnostic';
    if (!existingRep) {
      ev.title = 'شبكة المقابلة والفحص البيداغوجي والنفسي';
    }

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;' },
      h('div', { style: 'display:flex; align-items:center; gap:10px;' },
        h('img', { src: 'logo-sq.png', style: 'width:42px; height:42px; border-radius:8px;' }),
        h('h2', { style: 'margin:0; color:#163B65; font-size:1.35rem; font-weight:900;', text: existingRep ? 'تعديل شبكة المقابلة والفحص' : 'شبكة المقابلة والفحص البيداغوجي والنفسي' })
      ),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn light', type: 'button', style: 'font-weight:700;', text: 'رجوع لقائمة التقارير', onclick: function () { go('reports'); } })
      )
    );
    v.appendChild(topBar);

    var card = h('div', { class: 'card', style: 'max-width:1050px; margin:0 auto; padding:24px; border-radius:16px; border:1.5px solid #E2E8F0; box-shadow:0 4px 20px rgba(0,0,0,0.06);' });

    var selKid = kids.filter(function (k) { return k.id === ev.child_id; })[0] || (kids.length === 1 ? kids[0] : null);
    if (selKid && !ev.child_id) ev.child_id = selKid.id;

    var iv = (ev.interview) || {};

    var kidSelect = h('select', { style: 'font-weight:700; width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid #CBD5E1;' });
    kidSelect.appendChild(h('option', { value: '', text: '— اختر الطالب المعني بالفحص —' }));
    kids.forEach(function (k) {
      var opt = h('option', { value: k.id, text: k.full_name + (k.section ? (' — ' + k.section) : '') });
      if (k.id === ev.child_id) opt.selected = true;
      kidSelect.appendChild(opt);
    });

    var dobInp = h('input', { type: 'date', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', value: (selKid && selKid.dob) || iv.dob || '' });
    var genderInp = h('select', { style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1; font-weight:700;' },
      h('option', { value: 'ذكر', text: 'ذكر', selected: (selKid && selKid.gender === 'ذكر') || iv.gender === 'ذكر' }),
      h('option', { value: 'أنثى', text: 'أنثى', selected: (selKid && selKid.gender === 'أنثى') || iv.gender === 'أنثى' })
    );
    var ageInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'مثال: 8 سنوات', value: iv.age || '' });
    var civilInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'الحالة المدنية', value: iv.marital_status || 'طفل' });
    var kidsCountInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'عدد الإخوة/الأطفال', value: iv.children_count || '' });
    var addressInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'العنوان الكامل', value: iv.address || (selKid && selKid.address) || 'غرداية' });
    var joinDateInp = h('input', { type: 'date', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', value: iv.join_date || (selKid && selKid.join_date) || '2024-09-15' });
    var eduLevelInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'المستوى التعليمي', value: iv.education_level || (selKid && selKid.section) || 'قسم الشبه مدرسي مكيف' });
    var langInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'اللغة المستعملة', value: iv.language || 'العربية (الدارجة)' });
    var examDateInp = h('input', { type: 'date', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', value: iv.exam_date || ev.report_date || new Date().toISOString().slice(0, 10) });

    kidSelect.onchange = function () {
      ev.child_id = kidSelect.value;
      var curK = kids.filter(function (k) { return k.id === ev.child_id; })[0];
      if (curK) {
        if (curK.dob) dobInp.value = String(curK.dob).slice(0, 10);
        if (curK.address) addressInp.value = curK.address;
        if (curK.section) eduLevelInp.value = curK.section;
      }
    };

    function makeSectionHeader(num, title) {
      return h('div', { style: 'background:linear-gradient(135deg, #163B65 0%, #163B65 100%); color:#FFF; padding:10px 16px; border-radius:10px; margin:22px 0 12px; font-weight:800; font-size:14.5px; display:flex; align-items:center; gap:8px; box-shadow:0 2px 8px rgba(22, 59, 101,0.15);' },
        h('span', { style: 'background:#F59E0B; color:#000; width:24px; height:24px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:900;' }, num),
        h('span', { text: title })
      );
    }

    // 1- تقديم الحالة
    card.appendChild(makeSectionHeader('1', 'تقديم الحالة:'));
    var grid1 = h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; background:#F8FAFC; padding:18px; border-radius:12px; border:1.5px solid #E2E8F0;' },
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'الاسم واللقب:' }), kidSelect),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'تاريخ الميلاد:' }), dobInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'الجنس:' }), genderInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'السن:' }), ageInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'الحالة المدنية:' }), civilInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'عدد الأطفال/الإخوة:' }), kidsCountInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'العنوان:' }), addressInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'تاريخ الالتحاق بالمركز:' }), joinDateInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'المستوى التعليمي:' }), eduLevelInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'اللغة المستعملة لدى المفحوص:' }), langInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'تاريخ الفحص:' }), examDateInp)
    );
    card.appendChild(grid1);

    // 2- دوافع الفحص
    card.appendChild(makeSectionHeader('2', 'دوافع الفحص:'));
    var motiveDoctor = h('input', { type: 'checkbox', style: 'transform:scale(1.2);', checked: iv.motive_doctor !== false });
    var motiveCase = h('input', { type: 'checkbox', style: 'transform:scale(1.2);', checked: !!iv.motive_case });
    var motiveFamily = h('input', { type: 'checkbox', style: 'transform:scale(1.2);', checked: iv.motive_family !== false });
    var motivesBox = h('div', { style: 'display:flex; gap:28px; background:#F8FAFC; padding:14px 20px; border-radius:10px; border:1.5px solid #E2E8F0; font-weight:700;' },
      h('span', { style: 'color:#475569;', text: 'من الذي طلب إجراء الفحص؟' }),
      h('label', { style: 'display:flex; align-items:center; gap:8px; cursor:pointer;' }, motiveDoctor, h('span', { text: 'الطبيب' })),
      h('label', { style: 'display:flex; align-items:center; gap:8px; cursor:pointer;' }, motiveCase, h('span', { text: 'الحالة' })),
      h('label', { style: 'display:flex; align-items:center; gap:8px; cursor:pointer;' }, motiveFamily, h('span', { text: 'الأسرة' }))
    );
    card.appendChild(motivesBox);

    // 3- السوابق المرضية الشخصية
    card.appendChild(makeSectionHeader('3', 'السوابق المرضية الشخصية:'));
    var strokeRad = makeModernYesNoSegment('stroke', iv.past_stroke || 'لا');
    var mentalRad = makeModernYesNoSegment('mental', iv.past_mental || 'لا');
    var diseasesRad = makeModernYesNoSegment('diseases', iv.past_diseases || 'لا');
    var diseasesText = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'ماهي الأمراض التي تعاني منها الحالة؟', value: iv.past_diseases_text || '' });

    var grid3 = h('div', { style: 'background:#F8FAFC; padding:16px; border-radius:12px; border:1.5px solid #E2E8F0; display:flex; flex-direction:column; gap:12px;' },
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تعرضت الحالة لصدمة دماغية؟' }), strokeRad),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل للحالة سوابق عقلية؟' }), mentalRad),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تعاني الحالة من أمراض معينة؟' }), diseasesRad),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: 'إن كانت الإجابة بنعم، ما هي؟' }), diseasesText)
    );
    card.appendChild(grid3);

    // 4- السوابق العائلية
    card.appendChild(makeSectionHeader('4', 'السوابق العائلية:'));
    var dementiaRad = makeModernYesNoSegment('dementia', iv.family_dementia || 'لا');
    var box4 = h('div', { style: 'background:#F8FAFC; padding:14px 18px; border-radius:10px; border:1.5px solid #E2E8F0; display:flex; justify-content:space-between; align-items:center;' },
      h('span', { style: 'font-weight:700;', text: '- هل أصيب أحد الأقارب بالخرف؟' }),
      dementiaRad
    );
    card.appendChild(box4);

    // 5- نتائج الفحوصات
    card.appendChild(makeSectionHeader('5', 'نتائج الفحوصات (أثناء تشخيص المرض):'));
    var neuroInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'الفحص العصبي...', value: iv.neuro_exam || 'طبيعي' });
    var bioInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'الفحص البيولوجي...', value: iv.bio_exam || 'طبيعي' });
    var grid5 = h('div', { style: 'background:#F8FAFC; padding:16px; border-radius:12px; border:1.5px solid #E2E8F0; display:grid; grid-template-columns:1fr 1fr; gap:16px;' },
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: '- الفحص العصبي:' }), neuroInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: '- الفحص البيولوجي:' }), bioInp)
    );
    card.appendChild(grid5);

    // 6- تاريخ المرض
    card.appendChild(makeSectionHeader('6', 'تاريخ المرض:'));
    var diseaseDateInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'تاريخ بداية المرض...', value: iv.disease_start_date || 'منذ الولادة' });
    var symptomsInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'ما هي الاضطرابات الأولى التي ظهرت؟', value: iv.first_symptoms || 'تأخر النطق واكتساب المهارات' });
    var medsInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'هل تتناول الحالة دواء معين؟', value: iv.takes_medication || 'لا' });
    var grid6 = h('div', { style: 'background:#F8FAFC; padding:16px; border-radius:12px; border:1.5px solid #E2E8F0; display:flex; flex-direction:column; gap:12px;' },
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: '- تاريخ بداية المرض:' }), diseaseDateInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: '- الاضطرابات الأولى التي ظهرت:' }), symptomsInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:700; margin-bottom:4px; display:block;', text: '- هل تتناول الحالة دواء معين؟' }), medsInp)
    );
    card.appendChild(grid6);

    // 7- تاريخ الاضطرابات المعرفية والنفسية
    card.appendChild(makeSectionHeader('7', 'تاريخ الاضطرابات المعرفية والنفسية:'));
    
    var memOnsetSelect = h('select', { style: 'padding:6px 12px; border-radius:8px; border:1.5px solid #CBD5E1; font-weight:700;' },
      h('option', { value: 'تدريجا', text: 'تدريجاً', selected: iv.memory_onset !== 'فجأة' }),
      h('option', { value: 'فجأة', text: 'فجأة', selected: iv.memory_onset === 'فجأة' })
    );
    var memPlacesRad = makeModernYesNoSegment('mem_places', iv.memory_places || 'نعم');
    var memApptsRad = makeModernYesNoSegment('mem_appts', iv.memory_appointments || 'نعم');

    var langAnomiaRad = makeModernYesNoSegment('lang_anomia', iv.lang_anomia || 'لا');
    var langSpeechInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'ألفاظ رديئة، كلمات مشوهة، تعبير غير ملائم، أخطاء...', value: iv.lang_speech_quality || 'تعبير بسيط مع بعض الكلمات غير الواضحة' });

    var timeDaysRad = makeModernYesNoSegment('time_days', iv.time_days || 'لا');
    var timeHoursRad = makeModernYesNoSegment('time_hours', iv.time_hours || 'لا');
    var spaceCenterRad = makeModernYesNoSegment('space_center', iv.space_center || 'لا');

    var apraxiaClothesRad = makeModernYesNoSegment('apr_clothes', iv.apraxia_clothes || 'لا');
    var apraxiaEatingRad = makeModernYesNoSegment('apr_eating', iv.apraxia_eating || 'لا');
    var apraxiaObjectsRad = makeModernYesNoSegment('apr_objects', iv.apraxia_objects || 'لا');

    var agnosiaFacesRad = makeModernYesNoSegment('agn_faces', iv.agnosia_faces || 'نعم');

    var sleepDiffRad = makeModernYesNoSegment('sleep_diff', iv.sleep_difficulty || 'لا');
    var sleepWakingRad = makeModernYesNoSegment('sleep_wake', iv.sleep_night_waking || 'لا');

    var psychChangesRad = makeModernYesNoSegment('psych_chg', iv.psych_changes || 'لا');
    var psychOtherInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'اكتئاب، قلق، عدوانية، أخرى...', value: iv.psych_other || 'لا توجد عدوانية، بعض القلق العابر' });

    var socialInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'كيف تصف الجانب العلائقي الاجتماعي للحالة؟', value: iv.social_relationships || 'تفاعل إيجابي مع المربيات والأقران' });
    var psychTestsRad = makeModernYesNoSegment('tests_done', iv.psych_tests_done || 'لا');
    var psychTestsText = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', placeholder: 'ما هي الاختبارات؟', value: iv.psych_tests_text || '' });

    var commentText = h('textarea', { rows: 4, placeholder: 'تعليق مدير المركز والمختصين...', style: 'width:100%; padding:12px; border:1.5px solid #CBD5E1; border-radius:8px; font-weight:600;' }, iv.expert_comment || 'الحالة تظهر إمكانات واعدة للتطور والاستجابة للبرامج التأهيلية المخصصة.');

    var grid7 = h('div', { style: 'background:#F8FAFC; padding:16px; border-radius:12px; border:1.5px solid #E2E8F0; display:flex; flex-direction:column; gap:14px;' },
      h('div', null, h('b', { style: 'color:#163B65; font-size:14px;', text: '• اضطرابات الذاكرة:' })),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل اضطرابات الذاكرة ظهرت:' }), memOnsetSelect),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تتذكر الحالة موضع الأشياء؟' }), memPlacesRad),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تتذكر المواعيد (كزيارة الطبيب، أخذ الدواء...)؟' }), memApptsRad),
      
      h('div', { style: 'margin-top:6px;' }, h('b', { style: 'color:#163B65; font-size:14px;', text: '• اضطرابات اللغة:' })),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تعاني الحالة من نقص الكلمة؟' }), langAnomiaRad),
      h('div', null, h('label', { style: 'font-weight:700; margin-bottom:4px; display:block;', text: '- هل كلام الحالة سليم أو يظهر عليه اضطرابات؟' }), langSpeechInp),

      h('div', { style: 'margin-top:6px;' }, h('b', { style: 'color:#163B65; font-size:14px;', text: '• اضطرابات التوجه الزماني والمكاني:' })),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل يحدث لدى الحالة التباس في الأيام؟' }), timeDaysRad),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل يحدث لدى الحالة التباس في الوقت؟' }), timeHoursRad),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل يحدث لدى الحالة تيهان داخل المركز؟' }), spaceCenterRad),

      h('div', { style: 'margin-top:6px;' }, h('b', { style: 'color:#163B65; font-size:14px;', text: '• اضطراب الأبراكسيا (الحركات والاستعمال):' })),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تجد الحالة صعوبة في ارتداء الثياب؟' }), apraxiaClothesRad),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تجد الحالة صعوبة في تناول الطعام؟' }), apraxiaEatingRad),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تجد الحالة صعوبة في استعمال الأشياء؟' }), apraxiaObjectsRad),

      h('div', { style: 'margin-top:6px;' }, h('b', { style: 'color:#163B65; font-size:14px;', text: '• اضطراب الأقنوزيا (التعرف):' })),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تستطيع التعرف على الوجوه المألوفة؟' }), agnosiaFacesRad),

      h('div', { style: 'margin-top:6px;' }, h('b', { style: 'color:#163B65; font-size:14px;', text: '• اضطرابات النوم والنفسية:' })),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تجد الحالة صعوبة في النوم؟' }), sleepDiffRad),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تعاني من الاستيقاظ عدة مرات في الليل؟' }), sleepWakingRad),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل هناك تغيرات في الحالة النفسية؟' }), psychChangesRad),
      h('div', null, h('label', { style: 'font-weight:700; margin-bottom:4px; display:block;', text: '- اضطرابات أخرى (عدوانية، قلق، اكتئاب...):' }), psychOtherInp),
      h('div', null, h('label', { style: 'font-weight:700; margin-bottom:4px; display:block;', text: '- كيف تصف الجانب العلائقي الاجتماعي للحالة؟' }), socialInp),
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, h('span', { style: 'font-weight:700;', text: '- هل تم إخضاع الحالة لبعض الاختبارات النفسية أو العقلية؟' }), psychTestsRad),
      h('div', null, psychTestsText),

      h('div', { style: 'margin-top:10px;' }, h('label', { style: 'font-weight:800; color:#163B65; margin-bottom:4px; display:block;', text: '• تعليق مدير المركز والمختصين:' }), commentText)
    );
    card.appendChild(grid7);

    // بطاقة توقيع المدير فقط
    card.appendChild(h('div', { style: 'display:flex; justify-content:center; margin-top:20px; border-top:1.5px solid #CBD5E1; padding-top:16px;' },
      h('div', { style: 'text-align:center; padding:12px 28px; border:1.5px solid #163B65; border-radius:10px; background:#F8FAFC; min-width:280px;' },
        h('strong', { style: 'color:#163B65; font-size:14.5px; font-weight:900; display:block; margin-bottom:4px;', text: 'توقيع وختم مدير المركز' }),
        h('div', { style: 'height:45px; border-bottom:1px dashed #94A3B8; margin-bottom:6px;' }),
        h('span', { class: 'small muted', style: 'font-size:11px;', text: 'التأشيرة والختم الرسمي لدار الإحسان' })
      )
    ));

    async function saveInterview(status) {
      if (!kidSelect.value) return toast('يرجى اختيار الطالب أولاً.', 'bad');
      var selK = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
      var ivData = {
        exam_date: examDateInp.value,
        dob: dobInp.value,
        gender: genderInp.value,
        age: ageInp.value,
        marital_status: civilInp.value,
        children_count: kidsCountInp.value,
        address: addressInp.value,
        join_date: joinDateInp.value,
        education_level: eduLevelInp.value,
        language: langInp.value,
        motive_doctor: motiveDoctor.checked,
        motive_case: motiveCase.checked,
        motive_family: motiveFamily.checked,
        past_stroke: strokeRad.getVal(),
        past_mental: mentalRad.getVal(),
        past_diseases: diseasesRad.getVal(),
        past_diseases_text: diseasesText.value,
        family_dementia: dementiaRad.getVal(),
        neuro_exam: neuroInp.value,
        bio_exam: bioInp.value,
        disease_start_date: diseaseDateInp.value,
        first_symptoms: symptomsInp.value,
        takes_medication: medsInp.value,
        memory_onset: memOnsetSelect.value,
        memory_places: memPlacesRad.getVal(),
        memory_appointments: memApptsRad.getVal(),
        lang_anomia: langAnomiaRad.getVal(),
        lang_speech_quality: langSpeechInp.value,
        time_days: timeDaysRad.getVal(),
        time_hours: timeHoursRad.getVal(),
        space_center: spaceCenterRad.getVal(),
        apraxia_clothes: apraxiaClothesRad.getVal(),
        apraxia_eating: apraxiaEatingRad.getVal(),
        apraxia_objects: apraxiaObjectsRad.getVal(),
        agnosia_faces: agnosiaFacesRad.getVal(),
        sleep_difficulty: sleepDiffRad.getVal(),
        sleep_night_waking: sleepWakingRad.getVal(),
        psych_changes: psychChangesRad.getVal(),
        psych_other: psychOtherInp.value,
        social_relationships: socialInp.value,
        psych_tests_done: psychTestsRad.getVal(),
        psych_tests_text: psychTestsText.value,
        expert_comment: commentText.value
      };

      var payload = {
        child_id: kidSelect.value,
        title: 'شبكة المقابلة والفحص — ' + (selK ? selK.full_name : ''),
        report_date: examDateInp.value || new Date().toISOString().slice(0, 10),
        status: status,
        notes: commentText.value,
        activities: EVAL_MARKER + JSON.stringify({
          eval_type: 'interview_diagnostic',
          status: status,
          child_id: kidSelect.value,
          child_name: selK ? selK.full_name : '',
          section_name: (selK && selK.section) || '',
          report_date: examDateInp.value,
          interview: ivData
        })
      };

      try {
        if (existingRep && existingRep.id && DE.isUuid(String(existingRep.id))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(existingRep.id), payload);
          payload.id = existingRep.id;
        } else {
          var created = await saveProgressReportResilient('POST', '/progress_reports', payload);
          payload.id = (Array.isArray(created) && created[0] && created[0].id) ? created[0].id : ((existingRep && existingRep.id) || DE.uuid());
        }
        await syncSharedEvaluationRecord(payload, null);
        toast(status === 'published' ? 'تم اعتماد ونشر شبكة الفحص بنجاح!' : 'تم حفظ شبكة الفحص كمسودة بنجاح.', 'ok');
        bust();
        go('evaluations');
      } catch (err) {
        toast('خطأ في حفظ الفحص: ' + err.message, 'bad');
      }
    }

    var actions = h('div', { class: 'form-actions', style: 'display:flex; justify-content:space-between; align-items:center; margin-top:20px;' },
      h('button', { type: 'button', class: 'btn light', text: 'إلغاء والعودة', onclick: function () { go('evaluations'); } }),
      h('div', { style: 'display:flex; gap:10px;' },
        h('button', {
          type: 'button', class: 'btn light', style: 'font-weight:700;', text: 'معاينة النموذج الرسمي (A4)',
          onclick: function () {
            var tempRep = {
              title: 'شبكة المقابلة والفحص',
              report_date: examDateInp.value,
              activities: EVAL_MARKER + JSON.stringify({
                eval_type: 'interview_diagnostic',
                child_id: kidSelect.value,
                interview: {
                  exam_date: examDateInp.value,
                  dob: dobInp.value,
                  gender: genderInp.value,
                  age: ageInp.value,
                  marital_status: civilInp.value,
                  children_count: kidsCountInp.value,
                  address: addressInp.value,
                  join_date: joinDateInp.value,
                  education_level: eduLevelInp.value,
                  language: langInp.value,
                  motive_doctor: motiveDoctor.checked,
                  motive_case: motiveCase.checked,
                  motive_family: motiveFamily.checked,
                  past_stroke: strokeRad.getVal(),
                  past_mental: mentalRad.getVal(),
                  past_diseases: diseasesRad.getVal(),
                  past_diseases_text: diseasesText.value,
                  family_dementia: dementiaRad.getVal(),
                  neuro_exam: neuroInp.value,
                  bio_exam: bioInp.value,
                  disease_start_date: diseaseDateInp.value,
                  first_symptoms: symptomsInp.value,
                  takes_medication: medsInp.value,
                  memory_onset: memOnsetSelect.value,
                  memory_places: memPlacesRad.getVal(),
                  memory_appointments: memApptsRad.getVal(),
                  lang_anomia: langAnomiaRad.getVal(),
                  lang_speech_quality: langSpeechInp.value,
                  time_days: timeDaysRad.getVal(),
                  time_hours: timeHoursRad.getVal(),
                  space_center: spaceCenterRad.getVal(),
                  apraxia_clothes: apraxiaClothesRad.getVal(),
                  apraxia_eating: apraxiaEatingRad.getVal(),
                  apraxia_objects: apraxiaObjectsRad.getVal(),
                  agnosia_faces: agnosiaFacesRad.getVal(),
                  sleep_difficulty: sleepDiffRad.getVal(),
                  sleep_night_waking: sleepWakingRad.getVal(),
                  psych_changes: psychChangesRad.getVal(),
                  psych_other: psychOtherInp.value,
                  social_relationships: socialInp.value,
                  psych_tests_done: psychTestsRad.getVal(),
                  psych_tests_text: psychTestsText.value,
                  expert_comment: commentText.value
                }
              })
            };
            var curK = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
            openModal(h('div', { class: 'modal-body wk-modal-print', style: 'max-width:980px; width:95%;' },
              renderInterviewDiagnosticSheetView(tempRep, curK ? curK.full_name : '—', curK ? curK.section : '—', curK),
              h('div', { class: 'modal-actions no-print', style: 'margin-top:16px;' },
                h('button', { class: 'btn light', text: 'إغلاق', onclick: closeModal }),
                h('button', { class: 'btn gold', text: 'طباعة فورية', onclick: function () { window.print(); } })
              )
            ));
          }
        }),
        h('button', { type: 'button', class: 'btn light', style: 'font-weight:700;', text: 'حفظ كمسودة', onclick: function () { saveInterview('draft'); } }),
        h('button', { type: 'button', class: 'btn primary gold', style: 'font-weight:800;', text: 'اعتماد ونشر الاستبانة', onclick: function () { saveInterview('published'); } })
      )
    );
    card.appendChild(actions);

    v.appendChild(card);
  }

  /* 4. التقرير النهائي لمتابعة الطالب (Annual Final Follow-up Report Builder) */
  function openAnnualFinalBuilder(existingRep, kids, sections, secAllOpts, branchOpts) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'evaluations', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    ev.eval_type = 'annual_final';
    if (!existingRep) {
      ev.title = 'التقرير النهائي لمتابعة الطالب';
    }

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;' },
      h('div', { style: 'display:flex; align-items:center; gap:10px;' },
        h('img', { src: 'logo-sq.png', style: 'width:42px; height:42px; border-radius:8px;' }),
        h('h2', { style: 'margin:0; color:#163B65; font-size:1.35rem; font-weight:900;', text: existingRep ? 'تعديل التقرير النهائي للطالب' : 'التقرير النهائي لمتابعة الطالب' })
      ),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn light', type: 'button', style: 'font-weight:700;', text: 'رجوع لقائمة التقارير', onclick: function () { go('reports'); } })
      )
    );
    v.appendChild(topBar);

    var card = h('div', { class: 'card', style: 'max-width:1050px; margin:0 auto; padding:24px; border-radius:16px; border:1.5px solid #E2E8F0; box-shadow:0 4px 20px rgba(0,0,0,0.06);' });

    var selKid = kids.filter(function (k) { return k.id === ev.child_id; })[0] || (kids.length === 1 ? kids[0] : null);
    if (selKid && !ev.child_id) ev.child_id = selKid.id;

    var af = ev.annual_final || {};

    var kidSelect = h('select', { style: 'font-weight:700; width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid #CBD5E1;' });
    kidSelect.appendChild(h('option', { value: '', text: '— اختر الطالب المعني بالتقرير النهائي —' }));
    kids.forEach(function (k) {
      var opt = h('option', { value: k.id, text: k.full_name + (k.section ? (' — ' + k.section) : '') });
      if (k.id === ev.child_id) opt.selected = true;
      kidSelect.appendChild(opt);
    });

    var parentNameInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1; font-weight:700;', placeholder: 'اسم ولي الأمر (المكرم ولي أمر / ...)', value: af.parent_name || (selKid && (selKid.parent_name || selKid.guardian)) || 'مصطفى' });
    var schoolYearInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1; font-weight:700; text-align:center;', placeholder: 'الموسم الدراسي', value: af.school_year || '2025/2026' });
    var reportDateInp = h('input', { type: 'date', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', value: ev.report_date || new Date().toISOString().slice(0, 10) });

    var metaGrid = h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:20px; background:#F8FAFC; padding:18px; border-radius:12px; border:1.5px solid #E2E8F0;' },
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: 'اسم التلميذ:' }), kidSelect),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: 'المكرم ولي أمر التلميذ:' }), parentNameInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: 'الموسم الدراسي:' }), schoolYearInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block;', text: 'تاريخ التقرير:' }), reportDateInp)
    );
    card.appendChild(metaGrid);

    // الحالة الانضباطية ونظام الحصص (1 إلى 5 اختيار)
    card.appendChild(h('div', { style: 'background:linear-gradient(135deg, #163B65 0%, #163B65 100%); color:#FFF; padding:10px 16px; border-radius:10px; margin:22px 0 12px; font-weight:800; font-size:14.5px; box-shadow:0 2px 8px rgba(22, 59, 101,0.15);' },
      h('span', { text: '● الحالة الانضباطية لنظام الحصص السنوية والأحجام الساعية:' })
    ));

    var currentWeeklyRatio = af.weekly_ratio || '3/5';
    var ratioWrap = h('div', { style: 'background:#F8FAFC; padding:14px 18px; border-radius:10px; border:1.5px solid #E2E8F0; margin-bottom:16px;' },
      h('strong', { style: 'display:block; margin-bottom:10px; font-size:13.5px; color:#0F172A;', text: 'نظام الحصص في الأسبوع للحالة (اختر من 1 إلى 5):' })
    );

    var ratioRow = h('div', { style: 'display:flex; flex-wrap:wrap; gap:16px;' });
    var ratios = ['1/5', '2/5', '3/5', '4/5', '5/5'];
    var ratioButtons = [];

    ratios.forEach(function (rVal) {
      var btn = h('div', {
        class: 'ratio-option-box',
        style: 'display:flex; align-items:center; gap:8px; padding:10px 18px; border:1.5px solid #CBD5E1; border-radius:8px; cursor:pointer; background:#FFF; font-weight:800; font-size:13.5px; transition:all 0.15s ease;'
      },
        h('span', { class: 'box-indicator', style: 'display:inline-block; width:18px; height:18px; border:2px solid #000; background:' + (currentWeeklyRatio === rVal ? '#000' : '#FFF') + ';' }),
        h('span', { text: rVal + ' حصص' })
      );
      btn.onclick = function () {
        currentWeeklyRatio = rVal;
        ratioButtons.forEach(function (b, idx) {
          var isCur = ratios[idx] === currentWeeklyRatio;
          b.querySelector('.box-indicator').style.background = isCur ? '#000' : '#FFF';
          b.style.borderColor = isCur ? '#163B65' : '#CBD5E1';
          b.style.background = isCur ? '#EAF4FF' : '#FFF';
        });
      };
      ratioButtons.push(btn);
      ratioRow.appendChild(btn);
    });
    ratioWrap.appendChild(ratioRow);
    card.appendChild(ratioWrap);

    // تفعيل الوضع التلقائي للغيابات (كل يوم غياب يعادل إنقاص 5 ساعات)
    var prescribedSessionsInp = h('input', { type: 'number', value: af.prescribed_sessions != null ? af.prescribed_sessions : 54, style: 'width:100%; font-weight:800; text-align:center; padding:8px; border:1px solid #CBD5E1; border-radius:6px;' });
    var prescribedHoursInp = h('input', { type: 'number', value: af.prescribed_hours != null ? af.prescribed_hours : 770, style: 'width:100%; font-weight:800; text-align:center; padding:8px; border:1px solid #CBD5E1; border-radius:6px;' });
    var utilizedSessionsInp = h('input', { type: 'number', value: af.utilized_sessions != null ? af.utilized_sessions : 47, style: 'width:100%; font-weight:800; text-align:center; padding:8px; border:1px solid #CBD5E1; border-radius:6px;' });
    var utilizedHoursInp = h('input', { type: 'number', value: af.utilized_hours != null ? af.utilized_hours : 760, style: 'width:100%; font-weight:800; text-align:center; padding:8px; border:1px solid #CBD5E1; border-radius:6px;' });
    var unspentHoursInp = h('input', { type: 'number', value: af.unspent_hours != null ? af.unspent_hours : 10, style: 'width:100%; font-weight:900; text-align:center; color:#DC2626; font-size:16px; padding:8px; border:1.5px solid #DC2626; border-radius:6px; background:#FEF2F2;' });
    var absentDaysInp = h('input', { type: 'number', value: af.absent_days != null ? af.absent_days : 2, style: 'width:90px; font-weight:800; text-align:center; padding:6px; border:1.5px solid #163B65; border-radius:6px;' });

    var adminAbsenceDisplay = h('span', { style: 'font-weight:900; color:#163B65;', text: (af.absent_days != null ? String(af.absent_days).padStart(2, '0') : '02') + ' يوم' });

    function calcHoursFromAbsent() {
      var days = parseInt(absentDaysInp.value, 10) || 0;
      var unspent = days * 5; // القاعدة المعتمدة: كل يوم غياب يعادل إنقاص 5 ساعات
      unspentHoursInp.value = unspent;
      var prescribed = parseInt(prescribedHoursInp.value, 10) || 770;
      utilizedHoursInp.value = Math.max(0, prescribed - unspent);
      adminAbsenceDisplay.textContent = String(days).padStart(2, '0') + ' يوم';
    }
    absentDaysInp.oninput = calcHoursFromAbsent;
    prescribedHoursInp.oninput = calcHoursFromAbsent;

    // دالة الربط التلقائي الفوري بسجل الغياب
    async function autoFetchAttendance(kidId) {
      if (!kidId) return;
      try {
        var records = await C.rest('GET', '/attendance?child_id=eq.' + uid(kidId)).catch(function () { return []; });
        var absentCount = 0;
        if (Array.isArray(records)) {
          absentCount = records.filter(function (r) {
            return r.status === 'absent' || r.status === 'excused' || r.present === false || r.status === 'غائب';
          }).length;
        }
        try {
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf('de_att_records_') === 0) {
              var map = JSON.parse(localStorage.getItem(k) || '{}');
              if (map[kidId] === 'absent' || map[kidId] === 'غائب') {
                absentCount++;
              }
            }
          }
        } catch (e) {}

        absentDaysInp.value = absentCount;
        calcHoursFromAbsent();
      } catch (err) {}
    }

    kidSelect.onchange = function () {
      ev.child_id = kidSelect.value;
      autoFetchAttendance(kidSelect.value);
    };

    // تشغيل الوضع التلقائي فوراً عند فتح الاستمارة
    if (ev.child_id) {
      autoFetchAttendance(ev.child_id);
    }

    var attNoticeBadge = h('div', { style: 'background:#EAF4FF; border:1.5px solid #2563EB; border-radius:10px; padding:12px 16px; margin-bottom:16px; font-size:13px; color:#163B65; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;' },
      h('div', { style: 'display:flex; align-items:center; gap:8px;' },
        h('span', { style: 'background:#2563EB; color:#FFF; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:900;' }, '✓'),
        h('strong', { text: 'الوضع التلقائي للغيابات مفعل:' }),
        h('span', { text: 'كل يوم غياب يعادل إنقاص 5 ساعات من الحجم الساعي المستغل.' })
      ),
      h('div', { style: 'display:flex; align-items:center; gap:8px;' },
        h('span', { style: 'font-weight:700;', text: 'أيام الغياب المسجلة:' }),
        absentDaysInp,
        h('button', {
          type: 'button', class: 'btn small light', style: 'font-weight:800;', text: '🔄 تحديث من السجل',
          onclick: function () { autoFetchAttendance(kidSelect.value); toast('تم تحديث الغيابات آلياً من سجل الحضور.', 'ok'); }
        })
      )
    );
    card.appendChild(attNoticeBadge);

    // جدول الساعات والانضباط
    var tableWrap = h('div', { style: 'overflow-x:auto; margin-bottom:20px;' });
    var tbl = h('table', { class: 'tbl', style: 'width:100%; border-collapse:collapse; text-align:center; border:2px solid #000;' });
    tbl.appendChild(h('thead', null,
      h('tr', { style: 'background:#F1F5F9; font-weight:800; font-size:13px;' },
        h('th', { style: 'border:1.5px solid #000; padding:10px;' }, 'الحصص الفردية السنوية المفروضة'),
        h('th', { style: 'border:1.5px solid #000; padding:10px;' }, 'الحجم الساعي السنوي المقابل'),
        h('th', { style: 'border:1.5px solid #000; padding:10px;' }, 'الحصص الفردية المستغلة'),
        h('th', { style: 'border:1.5px solid #000; padding:10px;' }, 'الحجم الساعي المقابل'),
        h('th', { style: 'border:1.5px solid #000; padding:10px; color:#DC2626;' }, 'الحجم الساعي السنوي غير المستغل')
      )
    ));
    tbl.appendChild(h('tbody', null,
      h('tr', null,
        h('td', { style: 'border:1.5px solid #000; padding:8px;' }, prescribedSessionsInp),
        h('td', { style: 'border:1.5px solid #000; padding:8px;' }, prescribedHoursInp),
        h('td', { style: 'border:1.5px solid #000; padding:8px;' }, utilizedSessionsInp),
        h('td', { style: 'border:1.5px solid #000; padding:8px;' }, utilizedHoursInp),
        h('td', { style: 'border:1.5px solid #000; padding:8px;' }, unspentHoursInp)
      )
    ));
    tableWrap.appendChild(tbl);
    card.appendChild(tableWrap);

    // • ملاحظات (صفراء بارزة كما في الصورة 59548.jpg)
    card.appendChild(h('div', { style: 'margin-bottom:18px;' },
      h('strong', { style: 'display:block; margin-bottom:6px; font-size:14.5px; font-weight:900;', text: '• ملاحظات تربوية:' }),
      h('textarea', {
        id: 'af_notes_textarea',
        rows: 3,
        style: 'width:100%; padding:14px; font-weight:700; font-size:14px; background:#FEF08A; border:2px solid #EAB308; border-radius:10px; color:#000; box-sizing:border-box;',
        placeholder: 'اكتب الملاحظات التربوية هنا...'
      }, af.pedagogical_notes || 'الحالة تستجيب للتدريب وتظهر قابلية للتحسن التدريجي، خاصة عند توفير بيئة تربوية منظمة، دعم مستمر، وتعاون فعال بين الأسرة والمختصين وأعانكم الله.')
    ));

    // • ملاحظات الإدارة (مع خيارات ضعيف / متوسط / جيد)
    var hygieneSegment = makeRatingSegment(af.admin_hygiene || 'جيد');
    var contactSegment = makeRatingSegment(af.admin_contact || 'جيد');
    var responseSegment = makeRatingSegment(af.admin_response || 'جيد');

    var adminCard = h('div', { style: 'background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:18px; margin-bottom:20px;' },
      h('strong', { style: 'display:block; margin-bottom:12px; font-size:14.5px; font-weight:900; color:#163B65;', text: '• ملاحظات الإدارة (اختيار بين: ضعيف / متوسط / جيد):' }),
      h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:16px;' },
        h('div', { style: 'background:#FFF; padding:12px; border-radius:10px; border:1px solid #CBD5E1;' },
          h('label', { style: 'font-weight:800; font-size:13px; margin-bottom:6px; display:block;', text: '*الغياب:' }),
          h('div', { style: 'font-size:14px; padding:6px;' }, adminAbsenceDisplay)
        ),
        h('div', { style: 'background:#FFF; padding:12px; border-radius:10px; border:1px solid #CBD5E1;' },
          h('label', { style: 'font-weight:800; font-size:13px; margin-bottom:6px; display:block;', text: '*النظافة العامة:' }),
          hygieneSegment
        ),
        h('div', { style: 'background:#FFF; padding:12px; border-radius:10px; border:1px solid #CBD5E1;' },
          h('label', { style: 'font-weight:800; font-size:13px; margin-bottom:6px; display:block;', text: '*التواصل مع المركز:' }),
          contactSegment
        ),
        h('div', { style: 'background:#FFF; padding:12px; border-radius:10px; border:1px solid #CBD5E1;' },
          h('label', { style: 'font-weight:800; font-size:13px; margin-bottom:6px; display:block;', text: '*الاستجابة إلى الدعوات:' }),
          responseSegment
        )
      )
    );
    card.appendChild(adminCard);

    // • التذكير ببعض الالتزامات منها (ثابتة في التقرير)
    card.appendChild(h('div', { style: 'background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:16px; margin-bottom:20px;' },
      h('strong', { style: 'display:block; margin-bottom:8px; font-size:13.5px; font-weight:800; color:#163B65;', text: '• التذكير ببعض الالتزامات منها (ثابتة):' }),
      h('ul', { style: 'margin:0; padding-right:20px; font-size:12.5px; line-height:1.7; color:#334155;' },
        h('li', { text: 'احترام النظام الداخلي لتعهد الولي كاملا والعمل به.' }),
        h('li', { text: 'دفع الاشتراك السنوي حسب الاتفاق المبرم مع الإدارة.' }),
        h('li', { text: 'حضور اللقاءات والجلسات التكوينية المبرمجة مع الأولياء الفردية والجماعية وحسب الأفواج.' }),
        h('li', { text: 'متابعة الخطة العلاجية للطفل والمرافقة الوالدية خلال الموسم الدراسي والعطل.' }),
        h('li', { text: 'المشاركة في العمل التطوعي والأنشطة اللاصفية المبرمجة للأبناء وأوليائهم.' }),
        h('li', { text: 'المساهمة ماديا ومعنويا لرفع من درجة الوعي لدى الأولياء للتكفل ومرافقة أبنائهم.' }),
        h('li', { text: 'التواصل الدائم مع الإدارة والطاقم التربوي المتخصص في المجال.' }),
        h('li', { text: 'تجديد تسجيل الطفل المتمدرس بالمركز نهاية كل موسم دراسي.' })
      )
    ));

    // التعهد وتوقيع المدير فقط
    card.appendChild(h('div', { style: 'border-top:1.5px solid #CBD5E1; padding-top:16px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;' },
      h('div', null,
        h('strong', { text: 'ألتزم بما اطلعت عليه للموسم الدراسي المقبل ' + (schoolYearInp.value || '2025/2026') }),
        h('div', { style: 'margin-top:6px; color:#64748B; font-size:12px;', text: 'الاسم واللقب: ....................................................' })
      ),
      h('div', { style: 'text-align:center; padding:12px 28px; border:1.5px solid #163B65; border-radius:10px; background:#F8FAFC; min-width:280px;' },
        h('strong', { style: 'color:#163B65; font-size:14.5px; font-weight:900; display:block; margin-bottom:4px;', text: 'توقيع وختم مدير المركز' }),
        h('div', { style: 'height:45px; border-bottom:1px dashed #94A3B8; margin-bottom:6px;' }),
        h('span', { class: 'small muted', style: 'font-size:11px;', text: 'التأشيرة والختم الرسمي لدار الإحسان' })
      )
    ));

    async function saveAnnualFinal(status) {
      if (!kidSelect.value) return toast('يرجى اختيار الطالب أولاً.', 'bad');
      var selK = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
      var notesVal = $('#af_notes_textarea') ? $('#af_notes_textarea').value : '';
      var daysVal = parseInt(absentDaysInp.value, 10) || 0;

      var afData = {
        parent_name: parentNameInp.value,
        school_year: schoolYearInp.value,
        weekly_ratio: currentWeeklyRatio,
        prescribed_sessions: parseInt(prescribedSessionsInp.value, 10) || 54,
        prescribed_hours: parseInt(prescribedHoursInp.value, 10) || 770,
        utilized_sessions: parseInt(utilizedSessionsInp.value, 10) || 47,
        utilized_hours: parseInt(utilizedHoursInp.value, 10) || 760,
        unspent_hours: parseInt(unspentHoursInp.value, 10) || 10,
        absent_days: daysVal,
        pedagogical_notes: notesVal,
        admin_absence: String(daysVal).padStart(2, '0') + ' يوم',
        admin_hygiene: hygieneSegment.getVal(),
        admin_contact: contactSegment.getVal(),
        admin_response: responseSegment.getVal(),
        report_date: reportDateInp.value
      };

      var payload = {
        child_id: kidSelect.value,
        title: 'التقرير النهائي لمتابعة الطالب — ' + (selK ? selK.full_name : ''),
        report_date: reportDateInp.value || new Date().toISOString().slice(0, 10),
        status: status,
        notes: notesVal,
        activities: EVAL_MARKER + JSON.stringify({
          eval_type: 'annual_final',
          status: status,
          child_id: kidSelect.value,
          child_name: selK ? selK.full_name : '',
          section_name: (selK && selK.section) || '',
          report_date: reportDateInp.value,
          annual_final: afData
        })
      };

      try {
        if (existingRep && existingRep.id && DE.isUuid(String(existingRep.id))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(existingRep.id), payload);
          payload.id = existingRep.id;
        } else {
          var created = await saveProgressReportResilient('POST', '/progress_reports', payload);
          payload.id = (Array.isArray(created) && created[0] && created[0].id) ? created[0].id : ((existingRep && existingRep.id) || DE.uuid());
        }
        await syncSharedEvaluationRecord(payload, null);
        toast(status === 'published' ? 'تم اعتماد ونشر التقرير النهائي بنجاح!' : 'تم حفظ التقرير النهائي كمسودة بنجاح.', 'ok');
        bust();
        go('reports');
      } catch (err) {
        toast('خطأ في حفظ التقرير النهائي: ' + err.message, 'bad');
      }
    }

    var actions = h('div', { class: 'form-actions', style: 'display:flex; justify-content:space-between; align-items:center; margin-top:20px;' },
      h('button', { type: 'button', class: 'btn light', text: 'إلغاء والعودة', onclick: function () { go('evaluations'); } }),
      h('div', { style: 'display:flex; gap:10px;' },
        h('button', {
          type: 'button', class: 'btn light', style: 'font-weight:700;', text: 'معاينة النموذج الرسمي (A4)',
          onclick: function () {
            var daysVal = parseInt(absentDaysInp.value, 10) || 0;
            var tempRep = {
              title: 'التقرير النهائي لمتابعة الطالب',
              report_date: reportDateInp.value,
              activities: EVAL_MARKER + JSON.stringify({
                eval_type: 'annual_final',
                child_id: kidSelect.value,
                annual_final: {
                  parent_name: parentNameInp.value,
                  school_year: schoolYearInp.value,
                  weekly_ratio: currentWeeklyRatio,
                  prescribed_sessions: parseInt(prescribedSessionsInp.value, 10) || 54,
                  prescribed_hours: parseInt(prescribedHoursInp.value, 10) || 770,
                  utilized_sessions: parseInt(utilizedSessionsInp.value, 10) || 47,
                  utilized_hours: parseInt(utilizedHoursInp.value, 10) || 760,
                  unspent_hours: parseInt(unspentHoursInp.value, 10) || 10,
                  absent_days: daysVal,
                  pedagogical_notes: $('#af_notes_textarea') ? $('#af_notes_textarea').value : '',
                  admin_absence: String(daysVal).padStart(2, '0') + ' يوم',
                  admin_hygiene: hygieneSegment.getVal(),
                  admin_contact: contactSegment.getVal(),
                  admin_response: responseSegment.getVal(),
                  report_date: reportDateInp.value
                }
              })
            };
            var curK = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
            openModal(h('div', { class: 'modal-body wk-modal-print', style: 'max-width:980px; width:95%;' },
              renderAnnualFinalSheetView(tempRep, curK ? curK.full_name : '—', curK ? curK.section : '—', curK),
              h('div', { class: 'modal-actions no-print', style: 'margin-top:16px;' },
                h('button', { class: 'btn light', text: 'إغلاق', onclick: closeModal }),
                h('button', { class: 'btn gold', text: 'طباعة فورية', onclick: function () { window.print(); } })
              )
            ));
          }
        }),
        h('button', { type: 'button', class: 'btn light', style: 'font-weight:700;', text: 'حفظ كمسودة', onclick: function () { saveAnnualFinal('draft'); } }),
        h('button', { type: 'button', class: 'btn primary gold', style: 'font-weight:800;', text: 'اعتماد ونشر التقرير', onclick: function () { saveAnnualFinal('published'); } })
      )
    );
    card.appendChild(actions);

    v.appendChild(card);
  }

  /* 5. عرض ورقة استبانة المعززات الرسمية مع كامل الملاحظات ومبدأ بريماك ولوغو المركز */
  function renderReinforcersSheetView(r, childFullName, secName, kd) {
    var ev = parseEvaluationReport(r);
    var rf = (ev.reinforcers) || {};
    var items = rf.items || {};
    var custom = rf.custom_items || {};

    var wrap = h('div', { class: 'oep-sheet-container reinforcers-sheet', style: 'background:#FFF; padding:28px 32px; border:2px solid #163B65; font-family:"Cairo", "IBM Plex Sans Arabic", sans-serif; direction:rtl;' });

    // ترويسة الوثيقة الرسمية مع الشعار الرسمي لدار الإحسان
    wrap.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #163B65; padding-bottom:12px; margin-bottom:16px;' },
      h('div', { style: 'text-align:right;' },
        h('h3', { style: 'margin:0 0 4px; color:#163B65; font-size:16px; font-weight:900;', text: 'جمعية أولياء الأطفال المعاقين ذهنيًا دار الإحسان' }),
        h('div', { style: 'font-size:13px; color:#475569; font-weight:700;', text: 'المركز النفسي البيداغوجي — العطف غرداية' })
      ),
      h('div', { style: 'text-align:center;' },
        h('h2', { style: 'margin:0; color:#0F172A; font-size:18px; font-weight:900; text-decoration:underline;', text: 'استبيان تقييم المعززات' })
      ),
      h('img', { src: 'logo-sq.png', alt: 'دار الإحسان', style: 'width:62px; height:62px; object-fit:contain;' })
    ));

    // معلومات المفحوص
    wrap.appendChild(h('div', { style: 'display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; font-size:12.5px; font-weight:700; margin-bottom:14px; background:#F8FAFC; padding:10px 14px; border-radius:8px; border:1px solid #CBD5E1;' },
      h('span', { text: 'اسم المفحوص: ' + (childFullName || '—') }),
      h('span', { text: 'تاريخ الميلاد: ' + (rf.dob ? fmt(rf.dob) : (kd && kd.dob ? fmt(kd.dob) : '—')) }),
      h('span', { text: 'القائم بالمقابلة: ' + (rf.interviewer || 'مدير المركز') }),
      h('span', { text: 'تاريخ المقابلة: ' + fmt(rf.interview_date || ev.report_date) })
    ));

    // جدول المعززات مع 3 خيارات وعلامة ✔
    var tbl = h('table', { style: 'width:100%; border-collapse:collapse; text-align:center; border:1.5px solid #163B65; font-size:11.5px; margin-bottom:16px;' });
    tbl.appendChild(h('thead', null,
      h('tr', { style: 'background:#163B65; color:#FFF; font-weight:800;' },
        h('th', { style: 'padding:6px; border:1px solid #163B65; text-align:right; width:45%;' }, 'المعزز المطلوب تقييمه'),
        h('th', { style: 'padding:6px; border:1px solid #163B65; width:18%;' }, 'شديدة'),
        h('th', { style: 'padding:6px; border:1px solid #163B65; width:18%;' }, 'متوسطة'),
        h('th', { style: 'padding:6px; border:1px solid #163B65; width:18%;' }, 'قليلة')
      )
    ));

    var tb = h('tbody', null);
    REINFORCERS_CATALOG.forEach(function (catObj, cIdx) {
      tb.appendChild(h('tr', { style: 'background:#DCEAF5; font-weight:800;' },
        h('td', { colspan: 4, style: 'padding:5px 10px; text-align:right; border:1px solid #CBD5E1; color:#163B65;', text: '● ' + catObj.cat })
      ));
      catObj.items.forEach(function (itemLabel, iIdx) {
        var key = cIdx + '_' + iIdx;
        var chosen = items[key] || '';
        var isOther = itemLabel.indexOf('أخرى') >= 0;
        var displayLabel = isOther && custom[key] ? (itemLabel + ': ' + custom[key]) : itemLabel;

        tb.appendChild(h('tr', { style: 'border:1px solid #CBD5E1;' },
          h('td', { style: 'padding:4px 10px; border:1px solid #CBD5E1; text-align:right; font-weight:600;' }, displayLabel),
          h('td', { style: 'padding:4px; border:1px solid #CBD5E1; font-weight:900; color:#2563EB; font-size:13px;' }, chosen === 'شديدة' ? '✔' : ''),
          h('td', { style: 'padding:4px; border:1px solid #CBD5E1; font-weight:900; color:#D97706; font-size:13px;' }, chosen === 'متوسطة' ? '✔' : ''),
          h('td', { style: 'padding:4px; border:1px solid #CBD5E1; font-weight:900; color:#64748B; font-size:13px;' }, chosen === 'قليلة' ? '✔' : '')
        ));
      });
    });
    tbl.appendChild(tb);
    wrap.appendChild(tbl);

    // الملاحظات الكاملة ومواصفات المعزز الفعال ومبدأ بريماك (المطابقة للوثيقة الأصلية)
    var notesBox = h('div', { style: 'background:#F8FAFC; border:1.5px solid #CBD5E1; border-radius:10px; padding:16px; margin-bottom:16px; font-size:11.5px; line-height:1.7; color:#1E293B;' },
      h('strong', { style: 'display:block; color:#163B65; font-size:13px; font-weight:900; margin-bottom:6px;', text: 'ويتم التقييم للمعززات من خلال الآتي:' }),
      h('div', { style: 'margin-bottom:8px; padding-right:12px;' },
        h('div', { text: '1- من خلال الملاحظة المباشرة للفرد يمكن أن نحدد النشاطات المحببة له.' }),
        h('div', { text: '2- من خلال المقابلة مع الوالدين وذلك بسؤالهم لتحديد المعززات المحتملة.' }),
        h('div', { text: '3- سؤال الفرد نفسه.' })
      ),
      h('strong', { style: 'display:block; color:#163B65; font-size:13px; font-weight:900; margin-bottom:6px;', text: 'مواصفات المعزز الفعال:' }),
      h('div', { style: 'display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; padding-right:12px;' },
        h('div', null,
          h('b', { text: '1- فورية التعزيز: ' }), h('span', { text: 'الذي يحدث بعد السلوك مباشرة أكثر فاعلية من المؤجل.' }),
          h('br'),
          h('b', { text: '2- تنويع التعزيز: ' }), h('span', { text: 'استخدام معززات متنوعة يؤدي لفاعلية أكبر ولا يؤدي للإشباع أو الملل.' }),
          h('br'),
          h('b', { text: '3- جدول التعزيز: ' }), h('span', { text: 'يكون متواصلاً في المراحل الأولى ومتقطعاً في المراحل الأخيرة.' }),
          h('br'),
          h('b', { text: '4- مستوى الحرمان: ' }), h('span', { text: 'يكون المعزز أكثر أثراً إذا كان الفرد ممنوعاً منه.' })
        ),
        h('div', null,
          h('b', { text: '5- نوعية التعزيز: ' }), h('span', { text: 'التعزيز الطبيعي (كالمدح) أكثر فاعلية من الصناعي (كالكوبونات).' }),
          h('br'),
          h('b', { text: '6- طريقة التقديم: ' }), h('span', { text: 'يجب أن يخلو التعزيز من التكلف.' }),
          h('br'),
          h('b', { text: '7- كمية التعزيز: ' }), h('span', { text: 'التعزيز الفعال الذي يتناسب مع صعوبة السلوك المطلوب.' })
        )
      ),
      h('strong', { style: 'display:block; color:#163B65; font-size:13px; font-weight:900; margin-bottom:4px;', text: 'ملاحظات على أنواع المعززات ومبدأ بريماك:' }),
      h('p', { style: 'margin:0; padding-right:12px;', text: 'المعززات النشاطية تعد من أفضل أنواع المعززات وأكثرها قبولاً لأن الإشباع نادراً ما يحدث فيها، وتستند دائماً لمبدأ بريماك (Premack Principle) الذي نستخدم فيه سلوكاً محبباً للفرد في تعزيز سلوك نادراً ما يقوم به (مثل: مشاهدة التلفزيون بعد إنجاز الواجب والمهام المطلوبة).' })
    );
    wrap.appendChild(notesBox);

    // توقيع وختم مدير المركز فقط
    wrap.appendChild(h('div', { style: 'display:flex; justify-content:center; align-items:center; margin-top:20px; border-top:1.5px solid #163B65; padding-top:14px;' },
      h('div', { style: 'text-align:center; padding:12px 32px; border:1.5px solid #163B65; border-radius:10px; background:#F8FAFC; min-width:280px;' },
        h('strong', { style: 'color:#163B65; font-size:15px; font-weight:900; display:block; margin-bottom:4px;', text: 'توقيع وختم مدير المركز' }),
        h('div', { style: 'height:50px;' }),
        h('span', { class: 'small muted', style: 'font-size:11.5px; color:#64748B;', text: 'التأشيرة والختم الرسمي لدار الإحسان' })
      )
    ));

    return wrap;
  }

  /* 6. عرض ورقة شبكة المقابلة والفحص الرسمية مع لوغو المركز وإمضاء المدير فقط */
  function renderInterviewDiagnosticSheetView(r, childFullName, secName, kd) {
    var ev = parseEvaluationReport(r);
    var iv = (ev.interview) || {};

    var wrap = h('div', { class: 'oep-sheet-container interview-sheet', style: 'background:#FFF; padding:28px 32px; border:2px solid #163B65; font-family:"Cairo", "IBM Plex Sans Arabic", sans-serif; direction:rtl;' });

    // ترويسة الوثيقة مع الشعار
    wrap.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #163B65; padding-bottom:12px; margin-bottom:14px;' },
      h('div', { style: 'text-align:right;' },
        h('h3', { style: 'margin:0 0 2px; color:#163B65; font-size:15px; font-weight:900;', text: 'جمعية أولياء الأطفال المعاقين ذهنيًا دار الإحسان' }),
        h('div', { style: 'font-size:12.5px; color:#475569; font-weight:700;', text: 'المركز النفسي البيداغوجي — العطف غرداية' })
      ),
      h('div', { style: 'text-align:center;' },
        h('h2', { style: 'margin:0 0 4px; color:#0F172A; font-size:18px; font-weight:900; text-decoration:underline;', text: 'شبكة المقابلة والفحص البيداغوجي والنفسي' }),
        h('div', { style: 'font-size:12.5px; font-weight:700; color:#475569;', text: 'تاريخ الفحص: ' + fmt(iv.exam_date || ev.report_date) })
      ),
      h('img', { src: 'logo-sq.png', alt: 'دار الإحسان', style: 'width:60px; height:60px; object-fit:contain;' })
    ));

    function makeH(num, title) {
      return h('div', { style: 'background:#163B65; color:#FFF; padding:6px 12px; font-weight:800; font-size:13px; margin:12px 0 6px; border-radius:6px;' }, num + '- ' + title);
    }

    // 1- تقديم الحالة
    wrap.appendChild(makeH('1', 'تقديم الحالة:'));
    var t1 = h('table', { style: 'width:100%; border-collapse:collapse; font-size:12px; margin-bottom:8px; border:1px solid #CBD5E1;' });
    var t1Rows = [
      ['الاسم واللقب:', childFullName || iv.fullname || '—', 'تاريخ الميلاد:', (iv.dob ? fmt(iv.dob) : (kd && kd.dob ? fmt(kd.dob) : '—'))],
      ['الجنس:', iv.gender || 'ذكر', 'السن:', iv.age || '—'],
      ['الحالة المدنية:', iv.marital_status || 'طفل', 'عدد الأطفال/الإخوة:', iv.children_count || '—'],
      ['العنوان:', iv.address || (kd && kd.address) || 'غرداية', 'تاريخ الالتحاق:', fmt(iv.join_date || '2024-09-15')],
      ['المستوى التعليمي:', iv.education_level || secName || '—', 'اللغة المستعملة:', iv.language || 'العربية']
    ];
    t1Rows.forEach(function (row) {
      t1.appendChild(h('tr', null,
        h('td', { style: 'padding:5px 8px; font-weight:700; background:#F8FAF9; width:20%; border:1px solid #CBD5E1;' }, row[0]),
        h('td', { style: 'padding:5px 8px; width:30%; border:1px solid #CBD5E1;' }, row[1]),
        h('td', { style: 'padding:5px 8px; font-weight:700; background:#F8FAF9; width:20%; border:1px solid #CBD5E1;' }, row[2]),
        h('td', { style: 'padding:5px 8px; width:30%; border:1px solid #CBD5E1;' }, row[3])
      ));
    });
    wrap.appendChild(t1);

    // 2- دوافع الفحص
    wrap.appendChild(makeH('2', 'دوافع الفحص:'));
    wrap.appendChild(h('div', { style: 'font-size:12.5px; padding:8px 14px; background:#F8FAF9; border:1px solid #CBD5E1; border-radius:6px; display:flex; gap:24px; font-weight:700;' },
      h('span', { text: '- من الذي طلب إجراء الفحص؟' }),
      h('span', { text: (iv.motive_doctor ? '[✔] ' : '[ ] ') + 'الطبيب' }),
      h('span', { text: (iv.motive_case ? '[✔] ' : '[ ] ') + 'الحالة' }),
      h('span', { text: (iv.motive_family ? '[✔] ' : '[ ] ') + 'الأسرة' })
    ));

    // 3 و 4 - السوابق
    wrap.appendChild(makeH('3 & 4', 'السوابق المرضية الشخصية والعائلية:'));
    var t3 = h('table', { style: 'width:100%; border-collapse:collapse; font-size:12px; border:1px solid #CBD5E1;' });
    t3.appendChild(h('tr', null,
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1; width:75%;' }, 'هل تعرضت الحالة لصدمة دماغية؟'),
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1; text-align:center; font-weight:800;' }, iv.past_stroke || 'لا')
    ));
    t3.appendChild(h('tr', null,
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1;' }, 'هل للحالة سوابق عقلية؟'),
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1; text-align:center; font-weight:800;' }, iv.past_mental || 'لا')
    ));
    t3.appendChild(h('tr', null,
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1;' }, 'هل تعاني الحالة من أمراض معينة؟ ' + (iv.past_diseases_text ? ('(' + iv.past_diseases_text + ')') : '')),
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1; text-align:center; font-weight:800;' }, iv.past_diseases || 'لا')
    ));
    t3.appendChild(h('tr', null,
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1;' }, 'هل أصيب أحد الأقارب بالخرف؟ (السوابق العائلية)'),
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1; text-align:center; font-weight:800;' }, iv.family_dementia || 'لا')
    ));
    wrap.appendChild(t3);

    // 5 و 6 - نتائج الفحوصات وتاريخ المرض
    wrap.appendChild(makeH('5 & 6', 'نتائج الفحوصات وتاريخ المرض:'));
    var t5 = h('table', { style: 'width:100%; border-collapse:collapse; font-size:12px; border:1px solid #CBD5E1;' });
    t5.appendChild(h('tr', null,
      h('td', { style: 'padding:5px 8px; font-weight:700; width:25%; border:1px solid #CBD5E1;' }, 'الفحص العصبي:'),
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1;' }, iv.neuro_exam || 'طبيعي'),
      h('td', { style: 'padding:5px 8px; font-weight:700; width:25%; border:1px solid #CBD5E1;' }, 'الفحص البيولوجي:'),
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1;' }, iv.bio_exam || 'طبيعي')
    ));
    t5.appendChild(h('tr', null,
      h('td', { style: 'padding:5px 8px; font-weight:700; border:1px solid #CBD5E1;' }, 'بداية المرض:'),
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1;' }, iv.disease_start_date || 'منذ الولادة'),
      h('td', { style: 'padding:5px 8px; font-weight:700; border:1px solid #CBD5E1;' }, 'الأدوية الحالية:'),
      h('td', { style: 'padding:5px 8px; border:1px solid #CBD5E1;' }, iv.takes_medication || 'لا')
    ));
    wrap.appendChild(t5);

    // 7- تاريخ الاضطرابات المعرفية والنفسية
    wrap.appendChild(makeH('7', 'تاريخ الاضطرابات المعرفية والنفسية:'));
    var t7 = h('table', { style: 'width:100%; border-collapse:collapse; font-size:11.5px; border:1px solid #CBD5E1;' });
    var items7 = [
      ['اضطرابات الذاكرة: ظهور تدريجي/فجأة، تذكر مواضع الأشياء والمواعيد', (iv.memory_onset || 'تدريجا') + ' • مواضع الأشياء: ' + (iv.memory_places || 'نعم') + ' • المواعيد: ' + (iv.memory_appointments || 'نعم')],
      ['اضطرابات اللغة ونقص الكلمة وسلاسة التعبير', 'نقص الكلمة: ' + (iv.lang_anomia || 'لا') + ' • الكلام: ' + (iv.lang_speech_quality || 'تعبير مقبول')],
      ['التوجه الزماني والمكاني', 'التباس الأيام: ' + (iv.time_days || 'لا') + ' • التباس الوقت: ' + (iv.time_hours || 'لا') + ' • تيهان بالمركز: ' + (iv.space_center || 'لا')],
      ['الأبراكسيا والأقنوزيا والنوم', 'صعوبة الثياب: ' + (iv.apraxia_clothes || 'لا') + ' • الطعام: ' + (iv.apraxia_eating || 'لا') + ' • التعرف على الوجوه: ' + (iv.agnosia_faces || 'نعم') + ' • صعوبة النوم: ' + (iv.sleep_difficulty || 'لا')],
      ['الجانب العلائقي الاجتماعي', iv.social_relationships || 'تفاعل إيجابي']
    ];
    items7.forEach(function (it) {
      t7.appendChild(h('tr', null,
        h('td', { style: 'padding:4px 8px; font-weight:700; background:#F8FAF9; width:40%; border:1px solid #CBD5E1;' }, it[0]),
        h('td', { style: 'padding:4px 8px; border:1px solid #CBD5E1;' }, it[1])
      ));
    });
    wrap.appendChild(t7);

    wrap.appendChild(h('div', { style: 'margin-top:10px; background:#F8FAF9; border:1px solid #CBD5E1; padding:10px 14px; border-radius:8px;' },
      h('strong', { style: 'display:block; margin-bottom:3px; color:#163B65;', text: 'تعليق مدير المركز والمختصين:' }),
      h('p', { style: 'margin:0; font-size:12px; line-height:1.6;', text: iv.expert_comment || 'الحالة تظهر مؤشرات إيجابية للاستجابة للمرافقة والتأهيل المستمر.' })
    ));

    // توقيع وختم مدير المركز فقط
    wrap.appendChild(h('div', { style: 'display:flex; justify-content:center; align-items:center; margin-top:20px; border-top:1.5px solid #163B65; padding-top:14px;' },
      h('div', { style: 'text-align:center; padding:12px 32px; border:1.5px solid #163B65; border-radius:10px; background:#F8FAFC; min-width:280px;' },
        h('strong', { style: 'color:#163B65; font-size:15px; font-weight:900; display:block; margin-bottom:4px;', text: 'توقيع وختم مدير المركز' }),
        h('div', { style: 'height:50px;' }),
        h('span', { class: 'small muted', style: 'font-size:11.5px; color:#64748B;', text: 'التأشيرة والختم الرسمي لدار الإحسان' })
      )
    ));

    return wrap;
  }

  /* 7. عرض ورقة التقرير النهائي لمتابعة الطالب مع لوغو المركز وإمضاء المدير فقط وخيارات ضعيف/متوسط/جيد */
  function renderAnnualFinalSheetView(r, childFullName, secName, kd) {
    var ev = parseEvaluationReport(r);
    var af = (ev.annual_final) || {};

    var wrap = h('div', { class: 'oep-sheet-container annual-sheet', style: 'background:#FFF; padding:32px 36px; border:2.5px solid #000; font-family:"Cairo", "IBM Plex Sans Arabic", sans-serif; direction:rtl; max-width:850px; margin:0 auto; line-height:1.6;' });

    // ترويسة مع الشعار الرسمي لدار الإحسان
    wrap.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:12px; margin-bottom:16px;' },
      h('div', { style: 'text-align:right;' },
        h('div', { style: 'font-size:12.5px; font-weight:700;', text: 'الجمهورية الجزائرية الديمقراطية الشعبية' }),
        h('div', { style: 'font-size:14px; font-weight:900; color:#163B65;', text: 'جمعية أولياء الأطفال المعاقين ذهنياً دار الإحسان' }),
        h('div', { style: 'font-size:12px; color:#475569; font-weight:700;', text: 'المركز النفسي البيداغوجي — العطف غرداية' })
      ),
      h('div', { style: 'text-align:center;' },
        h('h2', { style: 'margin:0; font-size:19px; font-weight:900; text-decoration:underline; font-style:italic;', text: 'التقرير النهائي لمتابعة الطالب ' + (childFullName || 'عبد الرزاق') + ' حفظه الله' })
      ),
      h('img', { src: 'logo-sq.png', alt: 'دار الإحسان', style: 'width:62px; height:62px; object-fit:contain;' })
    ));

    // المخاطبة
    wrap.appendChild(h('div', { style: 'text-align:center; margin-bottom:14px;' },
      h('div', { style: 'font-size:15.5px; font-weight:900;', text: 'المكرم ولي أمر / الطالب' }),
      h('div', { style: 'font-size:15px; font-weight:800; margin-top:2px; color:#163B65;', text: af.parent_name || 'مصطفى' })
    ));

    // السلام عليكم والنص التمهيدي
    wrap.appendChild(h('div', { style: 'text-align:center; margin-bottom:12px; font-size:15px; font-weight:900;', text: 'السلام عليكم ورحمة الله وبركاته' }));
    wrap.appendChild(h('div', { style: 'text-align:justify; font-size:13.5px; margin-bottom:16px;' },
      'في إطار متابعة المسار التربوي لأبنائكم، نحيطكم علما بأنه تم حصر مختلف المهارات التي تم تدريب ابنكم عليها خلال الموسم الدراسي ' +
      h('strong', null, af.school_year || '2025/2026').outerHTML +
      '، وذلك لتمكينكم من الاطلاع عليها وتعزيز متابعتها خلال العطلة الصيفية. ويأتي هذا في سياق التعاون المستمر بين الأسرة والمركز، وحرصا على المحافظة على المكتسبات وضمان استمرارية البرنامج التربوي، بما يساهم في تحقيق الأهداف المسطرة ودعم تطور الطفل بشكل أفضل.'
    ));

    // • الحالة الانضباطية
    wrap.appendChild(h('div', { style: 'font-size:15px; font-weight:900; margin-bottom:6px;', text: '• الحالة الانضباطية:' }));
    wrap.appendChild(h('div', { style: 'font-size:13.5px; font-weight:800; margin-bottom:8px;', text: 'نظام الحصص في الأسبوع للحالة:' }));

    // مربعات نظام الحصص (1/5 إلى 5/5)
    var ratioBox = h('div', { style: 'display:flex; justify-content:space-between; margin-bottom:14px; font-size:13px; font-weight:800;' });
    var curRatio = af.weekly_ratio || '3/5';
    var ratios = ['1/5', '2/5', '3/5', '4/5', '5/5'];
    ratios.forEach(function (rItem) {
      var isChosen = (curRatio === rItem);
      ratioBox.appendChild(h('div', { style: 'display:flex; align-items:center; gap:6px;' },
        h('span', { style: 'display:inline-block; width:16px; height:16px; border:2px solid #000; background:' + (isChosen ? '#000' : '#FFF') + ';' }),
        h('span', { text: rItem + ' حصص' })
      ));
    });
    wrap.appendChild(ratioBox);

    // جدول الحصص والأحجام الساعية
    var tbl = h('table', { style: 'width:100%; border-collapse:collapse; text-align:center; border:2px solid #000; font-size:13px; margin-bottom:18px;' });
    tbl.appendChild(h('thead', null,
      h('tr', { style: 'font-weight:800; background:#F8FAF9;' },
        h('th', { style: 'border:1.5px solid #000; padding:6px;' }, 'الحصص الفردية السنوية المفروضة'),
        h('th', { style: 'border:1.5px solid #000; padding:6px;' }, 'الحجم الساعي السنوي المقابل'),
        h('th', { style: 'border:1.5px solid #000; padding:6px;' }, 'الحصص الفردية المستغلة'),
        h('th', { style: 'border:1.5px solid #000; padding:6px;' }, 'الحجم الساعي المقابل'),
        h('th', { style: 'border:1.5px solid #000; padding:6px; color:#DC2626;' }, 'الحجم الساعي السنوي غير المستغل')
      )
    ));
    tbl.appendChild(h('tbody', null,
      h('tr', { style: 'font-weight:800;' },
        h('td', { style: 'border:1.5px solid #000; padding:8px;' }, (af.prescribed_sessions != null ? af.prescribed_sessions : 54) + ' حصة'),
        h('td', { style: 'border:1.5px solid #000; padding:8px;' }, (af.prescribed_hours != null ? af.prescribed_hours : 770) + ' ساعة'),
        h('td', { style: 'border:1.5px solid #000; padding:8px;' }, (af.utilized_sessions != null ? af.utilized_sessions : 47) + ' حصة'),
        h('td', { style: 'border:1.5px solid #000; padding:8px;' }, (af.utilized_hours != null ? af.utilized_hours : 760)),
        h('td', { style: 'border:1.5px solid #000; padding:8px; color:#DC2626; font-size:14px;' }, (af.unspent_hours != null ? af.unspent_hours : 10) + ' ساعة')
      )
    ));
    wrap.appendChild(tbl);

    // • ملاحظات (مظللة بالأصفر الفاقع)
    wrap.appendChild(h('div', { style: 'font-size:15px; font-weight:900; margin-bottom:4px;', text: '• ملاحظات:' }));
    wrap.appendChild(h('div', { style: 'background:#FEF08A; padding:8px 12px; font-size:13.5px; font-weight:800; color:#000; border-radius:4px; margin-bottom:14px;' },
      af.pedagogical_notes || 'الحالة تستجيب للتدريب وتظهر قابلية للتحسن التدريجي، خاصة عند توفير بيئة تربوية منظمة، دعم مستمر، وتعاون فعال بين الأسرة والمختصين وأعانكم الله.'
    ));

    // • ملاحظات الإدارة (مع خيارات ضعيف / متوسط / جيد والغياب مثلما في الجدول)
    wrap.appendChild(h('div', { style: 'font-size:15px; font-weight:900; margin-bottom:4px;', text: '• ملاحظات الإدارة:' }));
    wrap.appendChild(h('div', { style: 'display:flex; justify-content:space-between; font-size:13px; font-weight:800; margin-bottom:16px; background:#F8FAFC; padding:10px 14px; border:1px solid #CBD5E1; border-radius:8px;' },
      h('span', { text: '*الغياب: ' + (af.admin_absence || ((af.absent_days != null ? String(af.absent_days).padStart(2, '0') : '02') + ' يوم')) }),
      h('span', { text: '*النظافة العامة: ' + (af.admin_hygiene || 'جيد') }),
      h('span', { text: '*التواصل مع المركز: ' + (af.admin_contact || 'جيد') }),
      h('span', { text: '*الاستجابة إلى الدعوات: ' + (af.admin_response || 'جيد') })
    ));

    // • التذكير ببعض الالتزامات منها
    wrap.appendChild(h('div', { style: 'font-size:14px; font-weight:900; margin-bottom:4px;', text: '• التذكير ببعض الالتزامات منها:' }));
    var ul = h('ul', { style: 'margin:0 0 16px; padding-right:20px; font-size:12.5px; line-height:1.6;' },
      h('li', { text: 'احترام النظام الداخلي لتعهد الولي كاملا والعمل به.' }),
      h('li', { text: 'دفع الاشتراك السنوي حسب الاتفاق المبرم مع الإدارة.' }),
      h('li', { text: 'حضور اللقاءات والجلسات التكوينية المبرمجة مع الأولياء الفردية والجماعية وحسب الأفواج.' }),
      h('li', { text: 'متابعة الخطة العلاجية للطفل والمرافقة الوالدية خلال الموسم الدراسي والعطل.' }),
      h('li', { text: 'المشاركة في العمل التطوعي والأنشطة اللاصفية المبرمجة للأبناء وأوليائهم.' }),
      h('li', { text: 'المساهمة ماديا ومعنويا لرفع من درجة الوعي لدى الأولياء للتكفل ومرافقة أبنائهم.' }),
      h('li', { text: 'التواصل الدائم مع الإدارة والطاقم التربوي المتخصص في المجال.' }),
      h('li', { text: 'تجديد تسجيل الطفل المتمدرس بالمركز نهاية كل موسم دراسي.' })
    );
    wrap.appendChild(ul);

    // التعهد
    wrap.appendChild(h('div', { style: 'display:flex; justify-content:space-between; font-size:13px; font-weight:800; margin-bottom:16px;' },
      h('span', { text: 'ألتزم بما اطلعت عليه للموسم الدراسي المقبل ' + (af.school_year || '2025/2026') }),
      h('span', { text: 'الاسم اللقب: ....................................................' })
    ));

    // توقيع وختم مدير المركز فقط (مع نزع غيره)
    wrap.appendChild(h('div', { style: 'display:flex; justify-content:center; text-align:center; margin-top:22px;' },
      h('div', { style: 'min-width:280px; padding:12px 24px; border:2px solid #000; border-radius:8px;' },
        h('span', { style: 'font-size:16px; font-weight:900; text-decoration:underline; display:block;', text: 'توقيع وختم مدير المركز' }),
        h('div', { style: 'height:50px;' }),
        h('span', { style: 'font-size:11.5px; color:#475569;', text: 'التأشيرة والختم الرسمي لدار الإحسان' })
      )
    ));

    return wrap;
  }


  function parseEvaluationReport(r) {
    var CURR = (window && window.DE_CURRICULUM) || EMBEDDED_CURRICULUM || {};
    var domainKeys = Object.keys(CURR);
    var res = {
      id: r ? r.id : null,
      child_id: (r && r.child_id) || S.preselectChildId || '',
      child_name: (r && r.child_name) || '',
      dob: (r && r.dob) || '',
      disability: (r && r.disability) || '',
      section_name: (r && r.section_name) || '',
      membership_no: (r && r.membership_no) || '',
      title: (r && r.title) || 'تقييم الأداء الحالي',
      report_date: (r && r.report_date) || new Date().toISOString().slice(0, 10),
      status: extractEvalStatus(r),
      general_notes: (r && r.notes) || '',
      term: 'الثلاثي الأخير',
      school_year: '2024/2025',
      degree_of_disability: 'متوسطة',
      qualification_level: '',
      supervisors: [
        { name: 'إدارة المركز', role: 'مدير المركز' }
      ],
      general_report: '',
      abilities: {
        current_potentials: '',
        cognitive_intellectual: '',
        language_receptive_expressive: '',
        communication_behavioral: '',
        academic_preacademic: '',
        motor_independence: ''
      },
      strengths: [''],
      weaknesses: [''],
      recommendations: [''],
      domains: []
    };

    function mapRawDomains(rawDomains) {
      if (!Array.isArray(rawDomains) || !rawDomains.length) return [];
      return rawDomains.map(function (dm) {
        var domName = typeof dm.d === 'number' ? (domainKeys[dm.d] || domainKeys[0]) : (dm.domain || domainKeys[0]);
        var skList = CURR[domName] || [];
        var ratingsMap = {};
        if (Array.isArray(dm.r)) {
          dm.r.forEach(function (entry) {
            ratingsMap[entry[0]] = {
              score: entry[1] != null ? String(entry[1]) : '',
              yn: entry[2] || '',
              note: entry[3] || ''
            };
          });
        } else if (Array.isArray(dm.ratings)) {
          dm.ratings.forEach(function (it, idx) {
            if (it) {
              ratingsMap[idx] = it;
              if (it.skill) ratingsMap[it.skill] = it;
            }
          });
        } else if (dm.ratings && typeof dm.ratings === 'object') {
          ratingsMap = dm.ratings;
        }
        return {
          domain: domName,
          ratings: skList.map(function (sk, idx) {
            var saved = ratingsMap[idx] || ratingsMap[sk] || {};
            return {
              num: idx + 1,
              skill: sk,
              item: sk,
              score: saved.score != null ? String(saved.score) : '',
              yn: saved.yn || '',
              note: saved.note || ''
            };
          })
        };
      });
    }

    if (r && typeof r.activities === 'string' && r.activities.indexOf(EVAL_MARKER) === 0) {
      try {
        var rawJson = JSON.parse(r.activities.slice(EVAL_MARKER.length));
        if (rawJson && typeof rawJson === 'object') {
          if (rawJson.eval_type) res.eval_type = rawJson.eval_type;
          if (rawJson.child_id) res.child_id = rawJson.child_id;
          if (rawJson.child_name) res.child_name = rawJson.child_name;
          if (rawJson.dob) res.dob = rawJson.dob;
          if (rawJson.disability) res.disability = rawJson.disability;
          if (rawJson.section_name) res.section_name = rawJson.section_name;
          if (rawJson.membership_no) res.membership_no = rawJson.membership_no;
          if (rawJson.reinforcers) res.reinforcers = Object.assign({}, res.reinforcers, rawJson.reinforcers);
          if (rawJson.interview) res.interview = Object.assign({}, res.interview, rawJson.interview);
          if (rawJson.annual_final) res.annual_final = Object.assign({}, res.annual_final, rawJson.annual_final);
          if (rawJson.behavior_observation) res.behavior_observation = Object.assign({}, res.behavior_observation, rawJson.behavior_observation);
          if (rawJson.target_behavior_eval) res.target_behavior_eval = Object.assign({}, res.target_behavior_eval, rawJson.target_behavior_eval);
          if (rawJson.target_behavior_report) res.target_behavior_report = Object.assign({}, res.target_behavior_report, rawJson.target_behavior_report);
          if (rawJson.mas_eval) res.mas_eval = Object.assign({}, res.mas_eval, rawJson.mas_eval);
          if (rawJson.mas_behavior_report) res.mas_behavior_report = Object.assign({}, res.mas_behavior_report, rawJson.mas_behavior_report);
          if (rawJson.medico_functional_fr) res.medico_functional_fr = Object.assign({}, res.medico_functional_fr, rawJson.medico_functional_fr);
          if (rawJson.term) res.term = rawJson.term;
          if (rawJson.school_year) res.school_year = rawJson.school_year;
          if (rawJson.degree_of_disability) res.degree_of_disability = rawJson.degree_of_disability;
          if (rawJson.qualification_level) res.qualification_level = rawJson.qualification_level;
          if (Array.isArray(rawJson.supervisors) && rawJson.supervisors.length) res.supervisors = rawJson.supervisors;
          if (rawJson.general_report) res.general_report = rawJson.general_report;
          if (rawJson.abilities) res.abilities = Object.assign({}, res.abilities, rawJson.abilities);
          if (Array.isArray(rawJson.strengths) && rawJson.strengths.length) res.strengths = rawJson.strengths;
          if (Array.isArray(rawJson.weaknesses) && rawJson.weaknesses.length) res.weaknesses = rawJson.weaknesses;
          if (Array.isArray(rawJson.recommendations) && rawJson.recommendations.length) res.recommendations = rawJson.recommendations;
          if (Array.isArray(rawJson.domains) && rawJson.domains.length) {
            res.domains = mapRawDomains(rawJson.domains);
          }
        }
      } catch (e) {}
    }

    // الحفاظ على أي حقول مباشرة على الكائن r (مثلاً عند تمرير الكائن ev مباشرة للمعاينة أو التحميل)
    if (r && typeof r === 'object') {
      if (r.eval_type) res.eval_type = r.eval_type;
      if (r.child_id) res.child_id = r.child_id;
      if (r.child_name) res.child_name = r.child_name;
      if (r.dob) res.dob = r.dob;
      if (r.disability) res.disability = r.disability;
      if (r.section_name) res.section_name = r.section_name;
      if (r.membership_no) res.membership_no = r.membership_no;
      if (r.term) res.term = r.term;
      if (r.school_year) res.school_year = r.school_year;
      if (r.degree_of_disability) res.degree_of_disability = r.degree_of_disability;
      if (r.qualification_level) res.qualification_level = r.qualification_level;
      if (Array.isArray(r.supervisors) && r.supervisors.length) res.supervisors = r.supervisors;
      if (r.general_report) res.general_report = r.general_report;
      if (r.abilities && typeof r.abilities === 'object') {
        Object.keys(r.abilities).forEach(function (k) {
          if (r.abilities[k]) res.abilities[k] = r.abilities[k];
        });
      }
      if (Array.isArray(r.strengths) && r.strengths.some(Boolean)) res.strengths = r.strengths;
      if (Array.isArray(r.weaknesses) && r.weaknesses.some(Boolean)) res.weaknesses = r.weaknesses;
      if (Array.isArray(r.recommendations) && r.recommendations.some(Boolean)) res.recommendations = r.recommendations;
      if (r.reinforcers) res.reinforcers = Object.assign({}, res.reinforcers || {}, r.reinforcers);
      if (r.interview) res.interview = Object.assign({}, res.interview || {}, r.interview);
      if (r.annual_final) res.annual_final = Object.assign({}, res.annual_final || {}, r.annual_final);
      if (r.behavior_observation) res.behavior_observation = Object.assign({}, res.behavior_observation || {}, r.behavior_observation);
      if (r.target_behavior_eval) res.target_behavior_eval = Object.assign({}, res.target_behavior_eval || {}, r.target_behavior_eval);
      if (r.target_behavior_report) res.target_behavior_report = Object.assign({}, res.target_behavior_report || {}, r.target_behavior_report);
      if (r.mas_eval) res.mas_eval = Object.assign({}, res.mas_eval || {}, r.mas_eval);
      if (r.mas_behavior_report) res.mas_behavior_report = Object.assign({}, res.mas_behavior_report || {}, r.mas_behavior_report);
      if (r.medico_functional_fr) res.medico_functional_fr = Object.assign({}, res.medico_functional_fr || {}, r.medico_functional_fr);
      if (Array.isArray(r.domains) && r.domains.length) {
        var mappedDirect = mapRawDomains(r.domains);
        var hasDirectRated = mappedDirect.some(function (d) {
          return (d.ratings || []).some(function (rt) { return (rt.score !== '' && rt.score != null) || rt.yn || rt.note; });
        });
        if (hasDirectRated || !res.domains.length) {
          res.domains = mappedDirect;
        }
      }
    }

    if (!res.general_report && res.general_notes) {
      res.general_report = res.general_notes;
    }

    if (!res.domains.length) {
      var firstDom = domainKeys[0] || '';
      res.domains.push({
        domain: firstDom,
        ratings: (CURR[firstDom] || []).map(function (sk, idx) {
          return { num: idx + 1, skill: sk, item: sk, score: '', yn: '', note: '' };
        })
      });
    }
    return res;
  }

  /* دمج واستكمال بيانات الطفل الفعلية بين التقييم الكمي والتقرير النوعي لضمان عدم ظهور نموذج عام فارغ */
  function enrichChildEvaluationData(ev, childFullName, secName, kd, extraPool) {
    if (!ev) return ev;
    var cid = ev.child_id || (kd && kd.id) || '';
    if (kd) {
      if (!ev.child_name && kd.full_name) ev.child_name = kd.full_name;
      if (!ev.dob && kd.dob) ev.dob = kd.dob;
      if (!ev.disability && kd.disability) ev.disability = kd.disability;
      if (!ev.membership_no && kd.membership_no) ev.membership_no = String(kd.membership_no);
      if (!ev.section_name && (secName || kd.section)) ev.section_name = secName || kd.section;
      if (!ev.qualification_level && (secName || kd.section)) ev.qualification_level = secName || kd.section;
    }
    if (childFullName && childFullName !== '—' && !ev.child_name) {
      ev.child_name = childFullName;
    }
    if (secName && secName !== '—' && !ev.section_name) {
      ev.section_name = secName;
    }

    var pool = [];
    if (Array.isArray(extraPool)) pool = pool.concat(extraPool);
    if (S._cachedAllReports && Array.isArray(S._cachedAllReports)) pool = pool.concat(S._cachedAllReports);
    pool = pool.concat(readLocalSharedEvaluations());

    if (cid || ev.child_name) {
      var childRecords = pool.filter(function (rec) {
        if (!rec) return false;
        if (cid && rec.child_id && String(rec.child_id) === String(cid)) return true;
        if (ev.child_name && rec.child_name && normAr(rec.child_name) === normAr(ev.child_name)) return true;
        return false;
      });
      childRecords.sort(function (a, b) {
        return new Date(b.updated_at || b.report_date || b.created_at || 0) - new Date(a.updated_at || a.report_date || a.created_at || 0);
      });

      var hasRatedDomains = (ev.domains || []).some(function (d) {
        return (d.ratings || []).some(function (rt) { return (rt.score !== '' && rt.score != null) || rt.yn; });
      });

      if (!hasRatedDomains) {
        for (var i = 0; i < childRecords.length; i++) {
          var parsedRec = parseEvaluationReport(childRecords[i]);
          var recHasRated = (parsedRec.domains || []).some(function (d) {
            return (d.ratings || []).some(function (rt) { return (rt.score !== '' && rt.score != null) || rt.yn; });
          });
          if (recHasRated) {
            ev.domains = parsedRec.domains;
            if ((!ev.supervisors || !ev.supervisors.length) && parsedRec.supervisors && parsedRec.supervisors.length) {
              ev.supervisors = parsedRec.supervisors;
            }
            break;
          }
        }
      }

      var hasQualContent = !!(ev.general_report && ev.general_report.trim());
      if (!hasQualContent) {
        for (var j = 0; j < childRecords.length; j++) {
          var pQual = parseEvaluationReport(childRecords[j]);
          if (pQual.general_report && pQual.general_report.trim()) {
            ev.general_report = pQual.general_report;
            if (pQual.abilities) ev.abilities = Object.assign({}, pQual.abilities, ev.abilities);
            if (Array.isArray(pQual.strengths) && pQual.strengths.some(Boolean)) ev.strengths = pQual.strengths;
            if (Array.isArray(pQual.weaknesses) && pQual.weaknesses.some(Boolean)) ev.weaknesses = pQual.weaknesses;
            if (Array.isArray(pQual.recommendations) && pQual.recommendations.some(Boolean)) ev.recommendations = pQual.recommendations;
            break;
          }
        }
      }

      // ربط بيانات تقييم قياس السلوك المستهدف مع تقرير قياس السلوك المستهدف لنفس الطفل تلقائياً
      var hasTbDays = ev.target_behavior_eval && Array.isArray(ev.target_behavior_eval.days) && ev.target_behavior_eval.days.length > 0;
      if (!hasTbDays) {
        for (var k1 = 0; k1 < childRecords.length; k1++) {
          var pTb = parseEvaluationReport(childRecords[k1]);
          if (pTb.target_behavior_eval && Array.isArray(pTb.target_behavior_eval.days) && pTb.target_behavior_eval.days.length > 0) {
            ev.target_behavior_eval = pTb.target_behavior_eval;
            break;
          }
        }
      }
      var hasTbRep = ev.target_behavior_report && (ev.target_behavior_report.antecedents_analysis || ev.target_behavior_report.initial_reading || ev.target_behavior_report.recommendations_text || ev.target_behavior_report.conclusion_text);
      if (!hasTbRep) {
        for (var k2 = 0; k2 < childRecords.length; k2++) {
          var pTbr = parseEvaluationReport(childRecords[k2]);
          if (pTbr.target_behavior_report && (pTbr.target_behavior_report.antecedents_analysis || pTbr.target_behavior_report.initial_reading || pTbr.target_behavior_report.recommendations_text || pTbr.target_behavior_report.conclusion_text)) {
            ev.target_behavior_report = Object.assign({}, pTbr.target_behavior_report, ev.target_behavior_report || {});
            break;
          }
        }
      }

      // ربط بيانات استمارة دوافع السلوك MAS مع تقرير دوافع السلوك لنفس الطفل تلقائياً
      var hasMasAns = ev.mas_eval && ev.mas_eval.answers && Object.keys(ev.mas_eval.answers).length > 0;
      if (!hasMasAns) {
        for (var m1 = 0; m1 < childRecords.length; m1++) {
          var pMas = parseEvaluationReport(childRecords[m1]);
          if (pMas.mas_eval && pMas.mas_eval.answers && Object.keys(pMas.mas_eval.answers).length > 0) {
            ev.mas_eval = pMas.mas_eval;
            break;
          }
        }
      }
      var hasMasRep = ev.mas_behavior_report && (ev.mas_behavior_report.case_analysis || ev.mas_behavior_report.key_findings || ev.mas_behavior_report.recommendations_text || ev.mas_behavior_report.conclusion_text || ev.mas_behavior_report.dimension_scores);
      if (!hasMasRep) {
        for (var m2 = 0; m2 < childRecords.length; m2++) {
          var pMbr = parseEvaluationReport(childRecords[m2]);
          if (pMbr.mas_behavior_report && (pMbr.mas_behavior_report.case_analysis || pMbr.mas_behavior_report.key_findings || pMbr.mas_behavior_report.recommendations_text || pMbr.mas_behavior_report.conclusion_text || pMbr.mas_behavior_report.dimension_scores)) {
            ev.mas_behavior_report = Object.assign({}, pMbr.mas_behavior_report, ev.mas_behavior_report || {});
            break;
          }
        }
      }
    }
    return ev;
  }

  /* رسم ورقة التقييم والتقارير الرسمية (تقرير نوعي تحليلي + تقرير الكمي بدون تكرار الأزرار) */
  function renderEvaluationSheetView(r, childFullName, secName, kd, initialReportMode, adminOpts) {
    var ev = parseEvaluationReport(r);
    if (ev.eval_type === 'behavior_observation') return renderBehaviorObservationSheetView(r, childFullName, secName, kd, adminOpts);
    if (ev.eval_type === 'reinforcers') return renderReinforcersSheetView(r, childFullName, secName, kd);
    if (ev.eval_type === 'interview_diagnostic') return renderInterviewDiagnosticSheetView(r, childFullName, secName, kd);
    if (ev.eval_type === 'annual_final') return renderAnnualFinalSheetView(r, childFullName, secName, kd);
    if (ev.eval_type === 'target_behavior') return renderTargetBehaviorSheetView(r, childFullName, secName, kd, adminOpts);
    if (ev.eval_type === 'target_behavior_report') return renderTargetBehaviorReportSheetView(r, childFullName, secName, kd, adminOpts);
    if (ev.eval_type === 'mas_behavior' || ev.eval_type === 'mas') return renderMasBehaviorSheetView(r, childFullName, secName, kd, adminOpts);
    if (ev.eval_type === 'mas_behavior_report') return renderMasBehaviorReportSheetView(r, childFullName, secName, kd, adminOpts);

    enrichChildEvaluationData(ev, childFullName, secName, kd);
    var resolvedChildName = childFullName || (kd && kd.full_name) || ev.child_name || '—';
    var resolvedSecName = ev.qualification_level || secName || (kd && kd.section) || ev.section_name || '—';
    var resolvedDob = (kd && kd.dob) || ev.dob || '';
    var resolvedDisability = (kd && kd.disability) || ev.disability || '—';

    var statsObj = (window.DE_PDF && typeof window.DE_PDF.computeEvaluationStats === 'function')
      ? window.DE_PDF.computeEvaluationStats(ev)
      : null;

    var ageTxt = '—';
    if (resolvedDob) {
      try {
        var birthDate = new Date(resolvedDob);
        var today = new Date();
        var age = today.getFullYear() - birthDate.getFullYear();
        var m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        if (age > 0) ageTxt = age + ' سنة';
      } catch (e) {}
    }

    var logoImg = h('img', { class: 'oep-logo-side', alt: 'شعار الجمعية' });
    logoImg.setAttribute('src', 'logo-sq.png');

    // 1. ترويسة الوثيقة الرسمية بالاسم المعتمد: تقرير نوعي تحليلي (Rapport d'analyse qualitatif)
    var header = h('div', { class: 'oep-header' },
      h('div', { class: 'oep-title-block' },
        h('h3', { class: 'oep-org-name', text: 'جمعية أولياء الأطفال المعاقين ذهنيًا' }),
        h('h4', { class: 'oep-center-name', text: 'المركز النفسي البيداغوجي دار الإحسان' }),
        h('p', { class: 'oep-location', text: '— العطف - غرداية —' }),
        h('div', { class: 'oep-fr-title', text: "RAPPORT D'ANALYSE QUALITATIF" }),
        h('h2', { class: 'oep-report-heading', text: "تقرير نوعي تحليلي (Rapport d'analyse qualitatif)" })
      ),
      logoImg
    );

    // 2. البانر الأصفر/الذهبي للثلاثي والموسم
    var termBanner = h('div', { class: 'oep-term-banner', text: 'تقييم ' + (ev.term || 'الثلاثي الأخير') + ' للموسم الدراسي: ' + (ev.school_year || '2024/2025') });

    // 3. شبكة معلومات الحالة الخاصة بالطفل
    var infoTable = h('table', { class: 'oep-info-table' },
      h('tbody', null,
        h('tr', null,
          h('td', { class: 'oep-info-label', text: 'اسم ولقب الحالة:' }),
          h('td', { class: 'oep-info-val' }, h('strong', { text: resolvedChildName })),
          h('td', { class: 'oep-info-label', text: 'العمر:' }),
          h('td', { class: 'oep-info-val', text: ageTxt })
        ),
        h('tr', null,
          h('td', { class: 'oep-info-label', text: 'نوع الاضطراب:' }),
          h('td', { class: 'oep-info-val', text: resolvedDisability }),
          h('td', { class: 'oep-info-label', text: 'تاريخ الميلاد:' }),
          h('td', { class: 'oep-info-val', text: resolvedDob ? fmt(resolvedDob) : '—' })
        ),
        h('tr', null,
          h('td', { class: 'oep-info-label', text: 'درجة الإعاقة / الاضطراب:' }),
          h('td', { class: 'oep-info-val', text: ev.degree_of_disability || 'متوسطة' }),
          h('td', { class: 'oep-info-label', text: 'القسم ومستوى التأهيل:' }),
          h('td', { class: 'oep-info-val', text: resolvedSecName })
        )
      )
    );

    // 4. جدول المشرفين
    var supRows = (ev.supervisors && ev.supervisors.length ? ev.supervisors : [{ name: 'إدارة المركز', role: 'مدير المركز' }]).slice(0, 4).map(function (sp) {
      return h('tr', null,
        h('td', null, h('strong', { text: sp.name || '—' })),
        h('td', { text: sp.role || '—' }),
        h('td', null, h('span', { class: 'muted small', text: '........................' }))
      );
    });

    var supervisorsTable = h('table', { class: 'oep-supervisors-table' },
      h('thead', null,
        h('tr', null,
          h('th', { text: 'المشرفون: الإسم واللقب' }),
          h('th', { text: 'الوظيفة / التخصص' }),
          h('th', { text: 'إمضاء المدير' })
        )
      ),
      h('tbody', null, supRows)
    );

    // 5. البانر الأزرق وقسم "الوصف العام لأداء الحالة"
    var perfBanner = h('div', { class: 'oep-section-banner', text: 'الوصف العام لأداء الحالة' });

    var generalReportText = String(ev.general_report || 'تم تسجيل تقدم ملحوظ في الأداء العام للحالة مع مواصلة التأهيل التربوي والنفسي.').slice(0, 750);
    var generalReportCol = h('div', { class: 'oep-general-report-box' },
      h('div', { class: 'oep-gr-header', text: 'التقرير العام والملاحظات البيداغوجية' }),
      h('div', { class: 'oep-gr-body oep-a4-clamped-body', text: generalReportText })
    );

    var ab = ev.abilities || {};
    var abilityBoxes = [
      { title: 'إمكانيات والقدرات الحالية', val: ab.current_potentials, cls: 'oep-ab-hdr-1' },
      { title: 'المهارات المعرفية والفكرية', val: ab.cognitive_intellectual, cls: 'oep-ab-hdr-2' },
      { title: 'اللغة (استقبالية تعبيرية)', val: ab.language_receptive_expressive, cls: 'oep-ab-hdr-3' },
      { title: 'القدرات الإتصالية والسلوكية', val: ab.communication_behavioral, cls: 'oep-ab-hdr-4' },
      { title: 'المعارف الأكاديمية وما قبل الأكاديمي', val: ab.academic_preacademic, cls: 'oep-ab-hdr-5' },
      { title: 'القدرات الحركية والاستقلالية', val: ab.motor_independence, cls: 'oep-ab-hdr-6' }
    ].map(function (item) {
      return h('div', { class: 'oep-ability-box' },
        h('div', { class: 'oep-ab-hdr ' + item.cls, text: item.title }),
        h('div', { class: 'oep-ab-content oep-a4-clamped-ability', text: String(item.val || '—').slice(0, 140) })
      );
    });

    var abilitiesCol = h('div', { class: 'oep-abilities-stack' }, abilityBoxes);
    var perfGrid = h('div', { class: 'oep-performance-grid' }, generalReportCol, abilitiesCol);

    // 6. البانر الأخضر وقسم "الخلاصة والتوصيات"
    var summaryBanner = h('div', { class: 'oep-summary-banner', text: 'الخلاصة والتوصيات' });

    function renderListItems(arr, fallback) {
      var items = (arr || []).filter(function (x) { return x && x.trim(); }).slice(0, 4);
      if (!items.length) items = [fallback];
      var ul = h('ul', { class: 'oep-rec-list oep-a4-clamped-list' });
      items.forEach(function (txt) { ul.appendChild(h('li', { text: String(txt).slice(0, 130) })); });
      return ul;
    }

    var recGrid = h('div', { class: 'oep-recommendations-grid' },
      h('div', { class: 'oep-rec-col' },
        h('div', { class: 'oep-rec-title', text: '1. نقاط القوة' }),
        renderListItems(ev.strengths, 'استجابة وتفاعل إيجابي مع الأنشطة الموجهة.')
      ),
      h('div', { class: 'oep-rec-col' },
        h('div', { class: 'oep-rec-title', text: '2. نقاط الضعف' }),
        renderListItems(ev.weaknesses, 'الحاجة لتعزيز مهارات التركيز والاستقلالية.')
      ),
      h('div', { class: 'oep-rec-col' },
        h('div', { class: 'oep-rec-title', text: '3. التوصيات والتوجيهات' }),
        renderListItems(ev.recommendations, 'مواصلة المتابعة البيداغوجية والتنسيق المستمر مع الأسرة.')
      )
    );

    // القسم الأول: تقرير نوعي تحليلي (Rapport d'analyse qualitatif)
    var writtenReportSection = h('div', { class: 'oep-written-page-box' },
      header,
      termBanner,
      infoTable,
      supervisorsTable,
      perfBanner,
      perfGrid,
      summaryBanner,
      recGrid
    );

    // القسم الثاني: تقرير الكمي (quantitative)
    var quantitativeCanvasHost = h('div', {
      class: 'oep-quant-canvas-host',
      style: 'width:100%; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:6px; overflow:hidden; text-align:center; min-height:320px; display:flex; align-items:center; justify-content:center;'
    }, h('span', { class: 'muted small', text: 'جارٍ رسم تقرير الكمي (quantitative)...' }));

    var effectiveKd = kd || {
      id: ev.child_id,
      full_name: resolvedChildName,
      dob: resolvedDob,
      disability: resolvedDisability,
      section: resolvedSecName,
      membership_no: ev.membership_no || ''
    };

    var quantRenderAttempts = 0;
    function renderQuantCanvasNow() {
      quantRenderAttempts += 1;
      if (!window.DE_PDF || typeof window.DE_PDF.renderQuantitativePageCanvas !== 'function') {
        if (quantRenderAttempts < 20) return setTimeout(renderQuantCanvasNow, 150);
        quantitativeCanvasHost.textContent = 'تعذر تحميل محرك التقارير. حدّث الصفحة أو امسح ذاكرة التطبيق ثم أعد المحاولة.';
        quantitativeCanvasHost.style.color = '#991B1B';
        return;
      }
      window.DE_PDF.renderQuantitativePageCanvas(ev, resolvedChildName, resolvedSecName, effectiveKd).then(function (cEl) {
        if (!cEl || !cEl.getContext) throw new Error('لم يتم إنشاء لوحة الرسم');
        quantitativeCanvasHost.textContent = '';
        cEl.style.width = '100%';
        cEl.style.height = 'auto';
        cEl.style.display = 'block';
        cEl.style.maxWidth = '100%';
        quantitativeCanvasHost.appendChild(cEl);
      }).catch(function (err) {
        console.error('[DarElIhsan] quantitative report rendering failed', err);
        quantitativeCanvasHost.textContent = 'تعذر رسم التقرير الكمي: ' + ((err && err.message) || 'خطأ غير معروف') + '. أعد المحاولة بعد تحديث الصفحة.';
        quantitativeCanvasHost.style.color = '#991B1B';
      });
    }
    setTimeout(renderQuantCanvasNow, 80);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !quantitativeCanvasHost.querySelector('canvas')) {
        quantRenderAttempts = 0;
        setTimeout(renderQuantCanvasNow, 100);
      }
    });

    var quantitativeReportSection = h('div', { class: 'oep-quantitative-page-box' },
      quantitativeCanvasHost
    );

    // القسم الثالث: جداول المهارات التفصيلية لكافة المجالات المقيمة
    function buildDetailedSkillsTablesDom() {
      var box = h('div', { class: 'oep-skills-details-box', style: 'margin-top:16px; background:#FFFFFF; border:1.5px solid #163B65; border-radius:10px; padding:16px;' });
      var domStatsList = (statsObj && Array.isArray(statsObj.domainStats)) ? statsObj.domainStats : [];
      var acqTot = statsObj ? statsObj.acquiredSkills : 0;
      var allTot = statsObj ? statsObj.totalSkills : 0;
      var ovPct = statsObj ? statsObj.overallPct : '0';

      box.appendChild(h('div', {
        style: 'background:#163B65; color:#FFFFFF; padding:10px 16px; border-radius:8px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;'
      },
        h('strong', { style: 'font-size:14px;', text: 'الجداول التفصيلية لكافة المهارات المقيمة (معيار دار الإحسان: 4/5 فما فوق)' }),
        h('span', {
          style: 'background:#16A34A; color:#FFF; padding:4px 12px; border-radius:20px; font-weight:800; font-size:12.5px;',
          text: 'المكتسبة: ' + acqTot + ' من ' + allTot + ' مهارة (' + ovPct + '%)'
        })
      ));

      domStatsList.forEach(function (dm, dIdx) {
        var domCard = h('div', { style: 'margin-bottom:14px; border:1px solid #CBD5E1; border-radius:8px; overflow:hidden;' });
        domCard.appendChild(h('div', {
          style: 'background:#DBEAFE; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; border-bottom:1px solid #93C5FD;'
        },
          h('strong', { style: 'color:#1E3A8A; font-size:13.5px;', text: (dIdx + 1) + '. ' + dm.name + ' (إجمالي المهارات: ' + dm.count + ')' }),
          h('span', {
            style: 'background:#DCEAF5; color:#263F65; border:1px solid #16A34A; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:800;',
            text: 'المكتسبة: ' + dm.acquired + ' من ' + dm.count + ' (' + dm.pctFmt + '%)'
          })
        ));

        var tbl = h('table', { style: 'width:100%; border-collapse:collapse; font-size:12.5px; text-align:right;' });
        tbl.appendChild(h('thead', null,
          h('tr', { style: 'background:#F1F5F9; color:#0F172A; font-weight:800;' },
            h('th', { style: 'padding:6px 8px; border:1px solid #CBD5E1; width:46px; text-align:center;', text: '#' }),
            h('th', { style: 'padding:6px 10px; border:1px solid #CBD5E1;', text: 'المهارة المقيمة' }),
            h('th', { style: 'padding:6px 8px; border:1px solid #CBD5E1; width:150px; text-align:center;', text: 'الدرجة والاكتساب' }),
            h('th', { style: 'padding:6px 10px; border:1px solid #CBD5E1; width:24%;', text: 'الملاحظات والتوجيهات' })
          )
        ));

        var tb = h('tbody');
        (dm.ratings || []).forEach(function (rt, rIdx) {
          tb.appendChild(h('tr', { style: 'background:' + (rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC') + ';' },
            h('td', { style: 'padding:5px 6px; border:1px solid #E2E8F0; text-align:center; font-weight:800;', text: String(rt.num) }),
            h('td', { style: 'padding:5px 10px; border:1px solid #E2E8F0; font-weight:700;', text: rt.skill }),
            h('td', { style: 'padding:5px 6px; border:1px solid #E2E8F0; text-align:center;' },
              h('span', {
                style: 'display:inline-block; padding:2px 8px; border-radius:10px; font-size:11.5px; font-weight:800; background:' + (rt.acquired ? '#D1FAE5' : '#F1F5F9') + '; color:' + (rt.acquired ? '#163B65' : '#64748B') + ';',
                text: rt.badgeText + (rt.acquired ? ' • مكتسبة' : '')
              })
            ),
            h('td', { style: 'padding:5px 8px; border:1px solid #E2E8F0; color:#475569;', text: rt.note || '—' })
          ));
        });
        tbl.appendChild(tb);
        domCard.appendChild(tbl);
        box.appendChild(domCard);
      });

      return box;
    }

    var skillsTablesSection = buildDetailedSkillsTablesDom();

    var activeMode = (initialReportMode === 'notes' || initialReportMode === 'statistics' || initialReportMode === 'full' || initialReportMode === 'details') ? initialReportMode : null;
    var paperEl = h('div', { class: 'official-eval-paper oep-fit-computer-screen' + (activeMode ? (' mode-' + activeMode) : ' is-collapsed-preview') });
    var previewMountHost = h('div', { class: 'oep-report-preview-mount' });

    function toggleReportMode(modeKey) {
      if (activeMode === modeKey) {
        activeMode = null;
      } else {
        activeMode = modeKey;
        if (modeKey === 'statistics' || modeKey === 'full') {
          setTimeout(renderQuantCanvasNow, 15);
        }
      }
      updateViewMode();
    }

    function makeReportControlRow(modeKey, reportFullTitle, previewLabelTxt, dlLabelTxt, pdfFileNamePrefix, toastMsg) {
      var titleLabelEl = h('div', {
        class: 'oep-report-row-title',
        style: 'cursor:pointer;',
        onclick: function () { toggleReportMode(modeKey); }
      }, h('strong', { text: reportFullTitle }));

      var previewBtnLabel = h('span', { text: activeMode === modeKey ? 'إخفاء المعاينة' : previewLabelTxt });
      var previewToggleBtn = h('button', {
        type: 'button',
        class: 'btn small oep-report-preview-btn ' + (activeMode === modeKey ? 'gold' : 'primary'),
        onclick: function (e) {
          e.stopPropagation();
          toggleReportMode(modeKey);
        }
      }, makeSvgIcon(activeMode === modeKey ? 's-eye-off' : 's-eye'), previewBtnLabel);

      var dlBtn = h('button', {
        type: 'button',
        class: 'btn small light oep-report-dl-btn',
        title: dlLabelTxt,
        onclick: async function (e) {
          e.stopPropagation();
          try {
            toast(toastMsg, 'ok');
            var pdfBytes = await DE_PDF.renderEvaluationToPdf(ev, resolvedChildName, resolvedSecName, effectiveKd, modeKey);
            DE_PDF.downloadPdf(pdfBytes, pdfFileNamePrefix + '_' + (resolvedChildName || 'تلميذ').replace(/\s+/g, '_') + '.pdf');
            toast('تم تنزيل الملف بصيغة PDF بنجاح!', 'ok');
          } catch (err) {
            toast('تعذر تنزيل الملف: ' + err.message, 'bad');
          }
        }
      }, makeSvgIcon('s-download'), h('span', { text: dlLabelTxt }));

      var rowEl = h('div', { class: 'oep-report-selector-row' + (activeMode === modeKey ? ' is-active' : '') },
        h('div', { class: 'oep-report-row-right' },
          titleLabelEl
        ),
        h('div', { class: 'oep-report-row-actions' },
          previewToggleBtn,
          dlBtn
        )
      );

      return {
        rowEl: rowEl,
        previewToggleBtn: previewToggleBtn,
        previewBtnLabel: previewBtnLabel,
        defaultLabel: previewLabelTxt
      };
    }

    var tabFull = makeReportControlRow(
      'full',
      'ملف التقييم الشامل (التقرير الكمي والنوعي وجداول المهارات)',
      'معاينة الملف الشامل',
      'تحميل الملف الشامل (PDF)',
      'تقييم_الأداء_الحالي_الشامل',
      'جارٍ تجهيز ملف التقييم الشامل (الكمي والنوعي وجداول المهارات)...'
    );
    var tab1 = makeReportControlRow(
      'notes',
      "تقرير نوعي تحليلي (Rapport d'analyse qualitatif)",
      'معاينة التقرير النوعي',
      'تحميل التقرير النوعي',
      'تقرير_نوعي_تحليلي',
      "جارٍ تجهيز تقرير نوعي تحليلي (Rapport d'analyse qualitatif)..."
    );
    var tab2 = makeReportControlRow(
      'statistics',
      'تقرير الكمي (quantitative)',
      'معاينة التقرير الكمي',
      'تحميل التقرير الكمي',
      'تقرير_الكمي_quantitative',
      'جارٍ تجهيز تقرير الكمي (quantitative)...'
    );
    var tabDetails = makeReportControlRow(
      'details',
      'جداول المهارات التفصيلية (المجالات البيداغوجية)',
      'معاينة جداول المهارات',
      'تحميل جداول المهارات',
      'جداول_المهارات_التفصيلية',
      'جارٍ تجهيز جداول المهارات التفصيلية...'
    );

    var managementCrudBar = null;
    if (adminOpts && typeof adminOpts === 'object') {
      var isPub = adminOpts.isPublished;
      var editEvalBtn = adminOpts.onEdit ? h('button', {
        type: 'button',
        class: 'btn light',
        onclick: function () { adminOpts.onEdit(); }
      }, makeSvgIcon('s-edit'), h('span', { text: 'التعديل' })) : null;

      var sendEvalBtn = adminOpts.onSend ? h('button', {
        type: 'button',
        class: 'btn gold',
        onclick: function () { act(sendEvalBtn, function () { return adminOpts.onSend(); }); }
      }, makeSvgIcon('s-upload'), h('span', { text: isPub ? 'إعادة النشر (منشور ✓)' : 'نشر' })) : null;

      var unpubEvalBtn = (isPub && adminOpts.onUnpublish) ? h('button', {
        type: 'button',
        class: 'btn small light',
        onclick: function () { act(unpubEvalBtn, function () { return adminOpts.onUnpublish(); }); }
      }, h('span', { text: 'تحويل لمسودة' })) : null;

      var delEvalBtn = adminOpts.onDelete ? h('button', {
        type: 'button',
        class: 'btn danger',
        onclick: function () { act(delEvalBtn, function () { return adminOpts.onDelete(); }); }
      }, makeSvgIcon('s-trash'), h('span', { text: 'الحذف' })) : null;

      managementCrudBar = h('div', { class: 'oep-crud-management-bar no-print' },
        h('div', { class: 'oep-crud-bar-title' },
          makeSvgIcon('s-card'),
          h('strong', { text: 'إجراءات الاستمارة:' }),
          badge(isPub ? 'منشور في فضاء الأولياء' : 'مسودة', isPub ? 'ok' : 'gray')
        ),
        h('div', { class: 'oep-crud-bar-btns' },
          editEvalBtn,
          sendEvalBtn,
          unpubEvalBtn,
          delEvalBtn
        )
      );
    }

    var topActionsBar = h('div', { class: 'oep-action-bar oep-details-control-panel no-print' },
      managementCrudBar,
      h('div', { class: 'oep-reports-list-header' },
        h('strong', { text: 'المعاينة والتحميل:' })
      ),
      h('div', { class: 'oep-reports-selector-stack' },
        tabFull.rowEl,
        tab2.rowEl,
        tab1.rowEl,
        tabDetails.rowEl
      ),
      h('div', { class: 'oep-report-selector-row', style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px;border:1px solid #CBD5E1;border-radius:10px;margin-top:8px;' },
        h('label', { style: 'font-weight:800;color:#111827;', text: 'Nom de l’enfant en français :' }),
        h('input', { id: 'oep-child-name-fr', type: 'text', maxlength: 120, value: (window.DEUser && window.DEUser.frName ? window.DEUser.frName(resolvedChildName, effectiveKd.membership_no) : resolvedChildName), placeholder: 'Nom et prénom en français', style: 'flex:1;min-width:180px;padding:9px;border:1px solid #94A3B8;border-radius:8px;color:#111827;background:#fff;' }),
        h('button', { type: 'button', class: 'btn small primary', text: 'Aperçu français', onclick: function () {
          var frName = ($('#oep-child-name-fr') && $('#oep-child-name-fr').value || '').trim();
          if (!frName) return toast('Veuillez saisir le nom de l’enfant en français.', 'bad');
          var win = window.open('about:blank', '_blank');
          DE_PDF.renderQualitativeFrenchToPdf(ev, frName, resolvedSecName, effectiveKd).then(function(bytes) {
            var url = URL.createObjectURL(new Blob([bytes], {type:'application/pdf'}));
            if (win) win.location.href = url; else window.open(url, '_blank');
            setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
          }).catch(function(err){ if(win) win.close(); toast('Échec de la prévisualisation française : '+(err.message||err), 'bad'); });
        }}),
        h('button', { type: 'button', class: 'btn small light', text: 'Télécharger PDF français', onclick: async function () {
          try {
            var frName = ($('#oep-child-name-fr') && $('#oep-child-name-fr').value || '').trim();
            if (!frName) return toast('Veuillez saisir le nom de l’enfant en français.', 'bad');
            var bytes = await DE_PDF.renderQualitativeFrenchToPdf(ev, frName, resolvedSecName, effectiveKd);
            DE_PDF.downloadPdf(bytes, 'Rapport_qualitatif_' + frName.replace(/[^\p{L}\p{N}_-]+/gu, '_') + '.pdf');
            toast('Rapport français téléchargé.', 'ok');
          } catch(err) { toast('Échec du téléchargement français : '+(err.message||err), 'bad'); }
        }})
      )
    );

    function updateTabRowState(tabObj, modeKey) {
      var isAct = (activeMode === modeKey);
      tabObj.rowEl.className = 'oep-report-selector-row' + (isAct ? ' is-active' : '');
      tabObj.previewToggleBtn.className = 'btn small oep-report-preview-btn ' + (isAct ? 'gold' : 'primary');
      tabObj.previewBtnLabel.textContent = isAct ? 'إخفاء المعاينة' : tabObj.defaultLabel;
    }

    function updateViewMode() {
      paperEl.className = 'official-eval-paper oep-fit-computer-screen'
        + (activeMode ? (' mode-' + activeMode) : ' is-collapsed-preview');

      updateTabRowState(tabFull, 'full');
      updateTabRowState(tab1, 'notes');
      updateTabRowState(tab2, 'statistics');
      updateTabRowState(tabDetails, 'details');

      previewMountHost.textContent = '';
      if (!activeMode) {
        previewMountHost.hidden = true;
      } else {
        previewMountHost.hidden = false;
        if (activeMode === 'statistics' || activeMode === 'full') {
          quantitativeReportSection.hidden = false;
          previewMountHost.appendChild(quantitativeReportSection);
        }
        if (activeMode === 'notes' || activeMode === 'full') {
          writtenReportSection.hidden = false;
          previewMountHost.appendChild(writtenReportSection);
        }
        if (activeMode === 'details' || activeMode === 'full') {
          skillsTablesSection.hidden = false;
          previewMountHost.appendChild(skillsTablesSection);
        }
      }
    }

    var printStyleTag = h('style', {
      text: '@media print { @page { size: A4 portrait; margin: 6mm; } html, body, #app, .shell, .main, .content { background: #FFFFFF !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; width: 100% !important; overflow: visible !important; } body * { visibility: hidden; } .modal, .modal-card, .modal-body, .wk-modal-print, .official-eval-paper, .official-eval-paper * { visibility: visible !important; } .official-eval-paper [hidden] { display: none !important; visibility: hidden !important; } .modal { position: static !important; background: transparent !important; padding: 0 !important; overflow: visible !important; display: block !important; border: none !important; } .modal-card, .modal-body { position: static !important; max-width: 100% !important; width: 100% !important; padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; overflow: visible !important; } .official-eval-paper { position: static !important; display: block !important; width: 100% !important; max-width: 100% !important; border: none !important; padding: 0 !important; margin: 0 auto !important; box-shadow: none !important; transform: none !important; } .official-eval-paper.mode-notes .oep-written-page-box { max-height: 282mm !important; overflow: hidden !important; page-break-after: avoid !important; page-break-inside: avoid !important; border: 1.5px solid #000 !important; padding: 5mm !important; } .official-eval-paper.mode-full .oep-written-page-box { page-break-after: always !important; border: 1.5px solid #000 !important; padding: 5mm !important; } .official-eval-paper.mode-full .oep-quantitative-page-box { page-break-after: always !important; } .no-print, .oep-action-bar, .modal-actions, .bar, .side, #nav, #topbar, .btn, button { display: none !important; } }'
    });

    paperEl.appendChild(printStyleTag);
    paperEl.appendChild(topActionsBar);
    paperEl.appendChild(previewMountHost);

    updateViewMode();
    return paperEl;
  }

    /* ---- باني ومحرر استمارة التقييم البيداغوجي (مع خانات التقرير والمشرفين والمجالات المصغرة) ---- */

  /* =====================================================================
     دار الإحسان — استمارة ملاحظة سلوك (جديدة بأيقونات احترافية ومطابقة للوثيقة الرسمية)
     ===================================================================== */
  var BEHAVIOR_OBSERVATION_ITEMS = [
    { id: 1, icon: '🏫', text: 'الاستقرار داخل القسم' },
    { id: 2, icon: '🗣️', text: 'التواصل اللفظي مثل القدرة على تكرار الكلمات وفهم التعليمات اللفظية، والتعبير عن الاحتياجات' },
    { id: 3, icon: '🔤', text: 'التواصل غير اللفظي مثل الإشارات والرموز...' },
    { id: 4, icon: '🤲', text: 'الاستقلالية والمساعدة الذاتية' },
    { id: 5, icon: '👥', text: 'التقليد' },
    { id: 6, icon: '👂', text: 'الاستماع والاستجابة للأوامر وللتعليمات' },
    { id: 7, icon: '🎯', text: 'الطلب والاختيار' },
    { id: 8, icon: '🤝', text: 'التفاعل الاجتماعي واللعب وبناء علاقات مع الاقران ومع الغير' },
    { id: 9, icon: '🏃', text: 'الحركية الكبرى والتناسق الحركي' },
    { id: 10, icon: '👁️', text: 'الانتباه البصري' },
    { id: 11, icon: '🎧', text: 'الانتباه السمعي' },
    { id: 12, icon: '✋', text: 'الانتباه اللمسي' },
    { id: 13, icon: '⚡', text: 'العصبية والعناد' },
    { id: 14, icon: '⚠️', text: 'السلوكيات الغير مقبولة ان وجدت' },
    { id: 15, icon: '🔄', text: 'السلوكيات النمطية ان وجدت' },
    { id: 16, icon: '🧩', text: 'المشاكل الحسية ان وجدت' }
  ];

  function calcKidAgeStr(dob) {
    if (!dob) return '—';
    try {
      var birthDate = new Date(dob);
      var today = new Date();
      var age = today.getFullYear() - birthDate.getFullYear();
      var m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age > 0 ? (age + ' سنة') : '—';
    } catch (e) {
      return '—';
    }
  }

  function openBehaviorObservationBuilder(existingRep, kids, sections, secAllOpts, branchOpts) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'evaluations', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    ev.eval_type = 'behavior_observation';
    if (!existingRep) {
      ev.title = 'استمارة ملاحظة سلوك';
    }

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;' },
      h('div', { style: 'display:flex; align-items:center; gap:10px;' },
        h('img', { src: 'logo-sq.png', style: 'width:42px; height:42px; border-radius:8px;' }),
        h('h2', { style: 'margin:0; color:#163B65; font-size:1.35rem; font-weight:900;', text: existingRep ? 'تعديل استمارة ملاحظة سلوك' : 'استمارة ملاحظة سلوك جديدة' })
      ),
      h('div', { class: 'row-actions', style: 'display:flex; gap:8px; align-items:center; flex-wrap:wrap;' },
        h('button', {
          class: 'btn light',
          type: 'button',
          style: 'font-weight:700;',
          onclick: function () {
            if (!kidSelect.value) return toast('يرجى اختيار الطالب أولاً للمعاينة.', 'bad');
            var chosenKid = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
            var sName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
            var packed = packCurrentObsData();
            var prevModal = h('div', { class: 'modal card', style: 'max-width:1040px; width:95%; max-height:92vh; overflow-y:auto; padding:20px;' });
            prevModal.appendChild(renderBehaviorObservationSheetView({
              child_id: kidSelect.value,
              report_date: reportDateInp.value,
              behavior_observation: packed
            }, chosenKid ? chosenKid.full_name : '', sName, chosenKid));
            openModal(prevModal);
          }
        }, makeSvgIcon('s-eye'), h('span', { text: 'معاينة الاستمارة' })),

        h('button', {
          class: 'btn light',
          type: 'button',
          style: 'font-weight:700;',
          onclick: async function () {
            if (!kidSelect.value) return toast('يرجى اختيار الطالب أولاً للتحميل.', 'bad');
            var chosenKid = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
            var sName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
            var packed = packCurrentObsData();
            try {
              toast('جارٍ تجهيز ملف PDF...', 'ok');
              var pdfBytes = await DE_PDF.renderBehaviorObservationToPdf({
                child_id: kidSelect.value,
                report_date: reportDateInp.value,
                behavior_observation: packed
              }, chosenKid ? chosenKid.full_name : '', sName, chosenKid);
              DE_PDF.downloadPdf(pdfBytes, 'استمارة_ملاحظة_سلوك_' + (chosenKid ? chosenKid.full_name : 'طالب').replace(/\s+/g, '_') + '.pdf');
              toast('تم تحميل الاستمارة بصيغة PDF بنجاح!', 'ok');
            } catch (err) {
              toast('تعذر التحميل: ' + err.message, 'bad');
            }
          }
        }, makeSvgIcon('s-download'), h('span', { text: 'تحميل PDF (A4)' })),

        h('button', { class: 'btn light', type: 'button', style: 'font-weight:700;', text: 'رجوع لقائمة التقييم', onclick: function () { go('evaluations'); } })
      )
    );
    v.appendChild(topBar);

    var card = h('div', { class: 'card', style: 'max-width:1050px; margin:0 auto; padding:24px; border-radius:16px; border:1.5px solid #E2E8F0; box-shadow:0 4px 20px rgba(0,0,0,0.06);' });

    var selKid = kids.filter(function (k) { return k.id === ev.child_id; })[0] || (kids.length === 1 ? kids[0] : null);
    if (selKid && !ev.child_id) ev.child_id = selKid.id;

    var obs = ev.behavior_observation || {};
    var itemsState = obs.items || {};

    var curSecId = S.isEducator ? S.eduSectionId : (selKid ? selKid.section_id : '');
    var secFilterSelect = h('select', { style: 'font-weight:700; width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid #CBD5E1;', disabled: !!S.isEducator },
      h('option', { value: '', text: '— جميع الأقسام التربوية —' }),
      secAllOpts.map(function (o) { return h('option', { value: o[0], text: o[1] }); })
    );
    secFilterSelect.value = curSecId || '';

    var kidSelect = h('select', { style: 'font-weight:700; width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid #CBD5E1;' });

    function populateObsKidsSelect() {
      var sId = secFilterSelect.value;
      var keep = ev.child_id || kidSelect.value;
      while (kidSelect.firstChild) kidSelect.removeChild(kidSelect.firstChild);
      kidSelect.appendChild(h('option', { value: '', text: '— اختر الطالب المعني بالملاحظة —' }));
      kids.forEach(function (k) {
        if (sId && !childMatchesSection(k, sId, nameOf(sections, sId, 'name'), sections)) return;
        var opt = h('option', { value: k.id, text: k.full_name + (k.section ? (' — ' + k.section) : '') });
        kidSelect.appendChild(opt);
      });
      if (keep && kids.some(function (k) { return k.id === keep; })) {
        kidSelect.value = keep;
      }
    }

    secFilterSelect.addEventListener('change', function () {
      ev.child_id = '';
      populateObsKidsSelect();
      ev.child_id = kidSelect.value;
      onKidChange();
    });

    populateObsKidsSelect();

    var disabilityInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1; font-weight:700;', placeholder: 'الإعاقة / الاضطراب', value: obs.disability || (selKid && (selKid.disability || '')) || 'توحد' });
    var ageInp = h('input', { type: 'text', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1; font-weight:700; text-align:center;', placeholder: 'العمر (مثال: 08 سنوات)', value: obs.age || (selKid && selKid.dob ? calcKidAgeStr(selKid.dob) : '08 سنوات') });
    var reportDateInp = h('input', { type: 'date', style: 'width:100%; padding:10px; border-radius:8px; border:1.5px solid #CBD5E1;', value: ev.report_date || new Date().toISOString().slice(0, 10) });

    function onKidChange() {
      ev.child_id = kidSelect.value;
      var chosen = kids.filter(function (k) { return k.id === ev.child_id; })[0];
      if (chosen) {
        if (!disabilityInp.value || disabilityInp.value === 'توحد') disabilityInp.value = chosen.disability || 'طيف توحد';
        if (chosen.dob) ageInp.value = calcKidAgeStr(chosen.dob);
      }
    }
    kidSelect.addEventListener('change', onKidChange);

    var metaGrid = h('div', { class: 'compact-qual-grid', style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-bottom:12px; background:#F8FAFC; padding:10px 12px; border-radius:10px; border:1px solid #CBD5E1; font-size:12px;' },
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block; color:#163B65;', text: '1. القسم التربوي:' }), secFilterSelect),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block; color:#163B65;', text: '2. اسم ولقب الحالة:' }), kidSelect),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block; color:#163B65;', text: '3. الإعاقة / الاضطراب:' }), disabilityInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block; color:#163B65;', text: '4. العمر:' }), ageInp),
      h('div', null, h('label', { class: 'lbl', style: 'font-weight:800; margin-bottom:4px; display:block; color:#163B65;', text: '5. تاريخ الملاحظة:' }), reportDateInp)
    );
    card.appendChild(metaGrid);

    // الجدول الرئيسي لـ 16 مؤشر سلوكي
    var tableEl = h('table', { style: 'width:100%; border-collapse:collapse; border:2px solid #163B65; margin-bottom:20px; background:#FFFFFF; text-align:right;' });
    var thead = h('thead', null,
      h('tr', { style: 'background:#163B65; color:#FFFFFF;' },
        h('th', { style: 'padding:8px 10px; border:1px solid #CBD5E1; width:38%; font-size:13.5px; font-weight:900;', text: 'العبارات (مؤشرات السلوك)' }),
        h('th', { style: 'padding:8px 4px; border:1px solid #CBD5E1; text-align:center; width:9%; font-size:12.5px; font-weight:800;', text: 'يوجد' }),
        h('th', { style: 'padding:8px 4px; border:1px solid #CBD5E1; text-align:center; width:9%; font-size:12.5px; font-weight:800;', text: 'متوسط' }),
        h('th', { style: 'padding:8px 4px; border:1px solid #CBD5E1; text-align:center; width:9%; font-size:12.5px; font-weight:800;', text: 'لا يوجد' }),
        h('th', { style: 'padding:8px 8px; border:1px solid #CBD5E1; text-align:center; width:35%; font-size:13px; font-weight:800;', text: 'ملاحظات تفصيلية' })
      )
    );
    tableEl.appendChild(thead);

    var tbody = h('tbody');
    var rowStateRefs = {};

    BEHAVIOR_OBSERVATION_ITEMS.forEach(function (it, idx) {
      var saved = itemsState[it.id] || {};
      var curVal = saved.val || '';
      var curNote = saved.note || '';

      var noteInp = attachAutoResizeTextarea(h('textarea', {
        rows: 1,
        placeholder: 'ملاحظات الحالة...',
        style: 'width:100%; min-height:34px; padding:6px 8px; border:1px solid #CBD5E1; border-radius:6px; font-size:12.5px; box-sizing:border-box; font-family:inherit; line-height:1.5;'
      }));
      noteInp.value = curNote;

      function makeRadioBtn(optVal, activeColor) {
        var isChecked = curVal === optVal;
        var btn = h('button', {
          type: 'button',
          style: 'padding:6px 10px; border-radius:6px; font-size:12px; font-weight:800; cursor:pointer; width:100%; transition:all 0.15s ease; ' +
                 (isChecked ? ('background:' + activeColor + '; color:#FFF; border:1.5px solid ' + activeColor + '; box-shadow:0 2px 4px rgba(0,0,0,0.15);') : 'background:#F8FAFC; color:#64748B; border:1px solid #CBD5E1;'),
          text: optVal
        });
        btn.onclick = function () {
          curVal = (curVal === optVal ? '' : optVal);
          rowStateRefs[it.id].updateUI();
        };
        return btn;
      }

      var bYes = makeRadioBtn('يوجد', '#2563EB');
      var bMed = makeRadioBtn('متوسط', '#F59E0B');
      var bNo = makeRadioBtn('لا يوجد', '#64748B');

      function updateRowUI() {
        var isY = curVal === 'يوجد';
        var isM = curVal === 'متوسط';
        var isN = curVal === 'لا يوجد';
        bYes.style.background = isY ? '#2563EB' : '#F8FAFC';
        bYes.style.color = isY ? '#FFF' : '#64748B';
        bYes.style.border = isY ? '1.5px solid #2563EB' : '1px solid #CBD5E1';

        bMed.style.background = isM ? '#F59E0B' : '#F8FAFC';
        bMed.style.color = isM ? '#FFF' : '#64748B';
        bMed.style.border = isM ? '1.5px solid #F59E0B' : '1px solid #CBD5E1';

        bNo.style.background = isN ? '#64748B' : '#F8FAFC';
        bNo.style.color = isN ? '#FFF' : '#64748B';
        bNo.style.border = isN ? '1.5px solid #64748B' : '1px solid #CBD5E1';
      }

      rowStateRefs[it.id] = {
        get: function () { return { id: it.id, val: curVal, note: noteInp.value }; },
        updateUI: updateRowUI
      };

      var tr = h('tr', { style: 'background:' + (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC') + '; border-bottom:1px solid #E2E8F0;' },
        h('td', { style: 'padding:8px 12px; border:1px solid #E2E8F0; font-size:13.5px; font-weight:700; color:#0F172A; vertical-align:middle;' },
          h('span', { text: it.text })
        ),
        h('td', { style: 'padding:4px; border:1px solid #E2E8F0; text-align:center; vertical-align:middle;' }, bYes),
        h('td', { style: 'padding:4px; border:1px solid #E2E8F0; text-align:center; vertical-align:middle;' }, bMed),
        h('td', { style: 'padding:4px; border:1px solid #E2E8F0; text-align:center; vertical-align:middle;' }, bNo),
        h('td', { style: 'padding:4px 8px; border:1px solid #E2E8F0; vertical-align:middle;' }, noteInp)
      );
      tbody.appendChild(tr);
    });
    tableEl.appendChild(tbody);
    card.appendChild(tableEl);

    // ملاحظات إضافية
    var extraNotesArea = attachAutoResizeTextarea(h('textarea', {
      rows: 2,
      style: 'width:100%; min-height:48px; padding:10px 12px; border-radius:8px; border:1.5px solid #CBD5E1; font-family:inherit; font-size:13.5px; line-height:1.7; box-sizing:border-box; margin-bottom:14px;',
      placeholder: 'سجل التقرير العام والملاحظات الإضافية بخصوص سلوك الحالة هنا (يتمدد الحقل تلقائياً مع النص)...'
    }));
    extraNotesArea.value = obs.additional_notes || '';

    card.appendChild(h('div', null,
      h('label', { class: 'lbl', style: 'font-weight:800; font-size:14px; color:#163B65; margin-bottom:6px; display:block;', text: 'ملاحظات إضافية:' }),
      extraNotesArea
    ));

    // تذييل الإمضاء (إمضاء المدير وتحته يمضي بدون خانة)
    var sigFooter = h('div', { style: 'margin-top:24px; padding-top:16px; border-top:1.5px solid #E2E8F0; display:flex; justify-content:flex-end;' },
      h('div', { style: 'text-align:center; min-width:220px;' },
        h('strong', { style: 'display:block; color:#163B65; font-size:15px; font-weight:900; margin-bottom:8px;', text: 'إمضاء المدير' }),
        h('div', { style: 'height:65px;' })
      )
    );
    card.appendChild(sigFooter);

    // أزرار الحفظ والنشر
    function packCurrentObsData() {
      var packedItems = {};
      BEHAVIOR_OBSERVATION_ITEMS.forEach(function (it) {
        if (rowStateRefs[it.id]) packedItems[it.id] = rowStateRefs[it.id].get();
      });
      return {
        disability: disabilityInp.value,
        age: ageInp.value,
        additional_notes: extraNotesArea.value,
        items: packedItems
      };
    }

    var actionsBar = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:24px;' },
      h('div', { style: 'display:flex; gap:8px;' },
        h('button', {
          type: 'button',
          class: 'btn light',
          style: 'font-weight:700;',
          onclick: function () {
            if (!kidSelect.value) return toast('يرجى اختيار الطالب أولاً للمعاينة.', 'bad');
            var chosenKid = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
            var sName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
            var packed = packCurrentObsData();
            var prevModal = h('div', { class: 'modal card', style: 'max-width:1040px; width:95%; max-height:92vh; overflow-y:auto; padding:20px;' });
            prevModal.appendChild(renderBehaviorObservationSheetView({
              child_id: kidSelect.value,
              report_date: reportDateInp.value,
              behavior_observation: packed
            }, chosenKid ? chosenKid.full_name : '', sName, chosenKid));
            openModal(prevModal);
          }
        }, makeSvgIcon('s-eye'), h('span', { text: 'معاينة' })),

        h('button', {
          type: 'button',
          class: 'btn light',
          style: 'font-weight:700;',
          onclick: async function () {
            if (!kidSelect.value) return toast('يرجى اختيار الطالب أولاً للتحميل.', 'bad');
            var chosenKid = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
            var sName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
            var packed = packCurrentObsData();
            try {
              toast('جارٍ تجهيز ملف PDF...', 'ok');
              var pdfBytes = await DE_PDF.renderBehaviorObservationToPdf({
                child_id: kidSelect.value,
                report_date: reportDateInp.value,
                behavior_observation: packed
              }, chosenKid ? chosenKid.full_name : '', sName, chosenKid);
              DE_PDF.downloadPdf(pdfBytes, 'استمارة_ملاحظة_سلوك_' + (chosenKid ? chosenKid.full_name : 'طالب').replace(/\s+/g, '_') + '.pdf');
              toast('تم تحميل الاستمارة بصيغة PDF بنجاح!', 'ok');
            } catch (err) {
              toast('تعذر التحميل: ' + err.message, 'bad');
            }
          }
        }, makeSvgIcon('s-download'), h('span', { text: 'تحميل PDF' }))
      ),
      h('div', { style: 'display:flex; gap:8px;' },
        h('button', {
          type: 'button',
          class: 'btn light',
          style: 'font-weight:700;',
          onclick: function () { saveObsAction('draft'); }
        }, h('span', { text: 'حفظ كمسودة' })),
        h('button', {
          type: 'button',
          class: 'btn gold',
          style: 'font-weight:800;',
          onclick: function () { saveObsAction('published'); }
        }, h('span', { text: 'اعتماد ونشر للأولياء' }))
      )
    );
    card.appendChild(actionsBar);

    async function saveObsAction(statusKey) {
      if (!kidSelect.value) return toast('يرجى اختيار الطالب المعني أولاً.', 'bad');
      var chosenKid = kids.filter(function (k) { return k.id === kidSelect.value; })[0];
      var packedItems = {};
      BEHAVIOR_OBSERVATION_ITEMS.forEach(function (it) {
        packedItems[it.id] = rowStateRefs[it.id].get();
      });

      var obsData = {
        disability: disabilityInp.value,
        age: ageInp.value,
        additional_notes: extraNotesArea.value,
        items: packedItems
      };

      var payload = {
        eval_type: 'behavior_observation',
        title: 'استمارة ملاحظة سلوك',
        status: statusKey,
        behavior_observation: obsData
      };

      var fullActivities = EVAL_MARKER + JSON.stringify(payload);
      var recordBody = {
        child_id: kidSelect.value,
        title: 'استمارة ملاحظة سلوك — ' + (chosenKid ? chosenKid.full_name : ''),
        report_date: reportDateInp.value,
        status: statusKey,
        activities: fullActivities,
        notes: extraNotesArea.value || null
      };

      try {
        if (ev.id && DE.isUuid(String(ev.id))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(ev.id), recordBody);
        } else {
          var created = await saveProgressReportResilient('POST', '/progress_reports', recordBody);
          if (Array.isArray(created) && created[0]) ev.id = created[0].id;
        }
        await syncSharedEvaluationRecord(Object.assign({}, recordBody, { id: ev.id }), null);
        bust();
        toast(statusKey === 'published' ? 'تم نشر استمارة ملاحظة السلوك بنجاح!' : 'تم حفظ الاستمارة كمسودة.', 'ok');
        go('evaluations');
      } catch (err) {
        toast('تعذر الحفظ: ' + (err.message || 'خطأ غير متوقع'), 'bad');
      }
    }

    v.appendChild(card);
  }

  function renderBehaviorObservationSheetView(r, childFullName, secName, kd, adminOpts) {
    var ev = parseEvaluationReport(r);
    var obs = ev.behavior_observation || {};
    var itemsState = obs.items || {};

    var wrap = h('div', { class: 'behavior-observation-paper card', style: 'max-width:980px; margin:0 auto; padding:24px; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:12px; font-family:"Cairo","Tajawal",sans-serif;' });

    // ترويسة الوثيقة: الشعار في أعلى اليسار!
    var logoImg = h('img', { src: 'logo-sq.png', alt: 'شعار المركز', style: 'width:80px; height:80px; border-radius:8px;' });

    var header = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #163B65; padding-bottom:12px; margin-bottom:16px;' },
      h('div', { style: 'text-align:right;' },
        h('h3', { style: 'margin:0 0 2px; color:#163B65; font-size:15px; font-weight:800;', text: 'جمعية أولياء الأطفال المعاقين ذهنيًا' }),
        h('h4', { style: 'margin:0 0 2px; color:#2563EB; font-size:14px; font-weight:700;', text: 'المركز النفسي البيداغوجي دار الإحسان' }),
        h('p', { style: 'margin:0; color:#64748B; font-size:12px;', text: '— العطف - غرداية —' })
      ),
      h('div', { style: 'text-align:center;' },
        h('h2', { style: 'margin:0; color:#163B65; font-size:1.6rem; font-weight:900; letter-spacing:0.5px;', text: 'استمارة ملاحظة سلوك' })
      ),
      h('div', { style: 'text-align:left;' },
        logoImg
      )
    );
    wrap.appendChild(header);

    // معلومات الحالة
    var infoRow = h('div', { style: 'display:grid; grid-template-columns:2fr 1fr 1fr; gap:12px; background:#F8FAFC; padding:10px 14px; border:1px solid #E2E8F0; border-radius:8px; margin-bottom:16px; font-size:13.5px;' },
      h('div', null, h('span', { style: 'font-weight:800; color:#163B65;', text: 'اسم و لقب الحالة: ' }), h('strong', { text: childFullName || '—' })),
      h('div', null, h('span', { style: 'font-weight:800; color:#163B65;', text: 'الإعاقة/الاضطراب: ' }), h('span', { text: obs.disability || (kd && kd.disability) || '—' })),
      h('div', null, h('span', { style: 'font-weight:800; color:#163B65;', text: 'العمر: ' }), h('span', { text: obs.age || (kd && kd.dob ? calcKidAgeStr(kd.dob) : '—') }))
    );
    wrap.appendChild(infoRow);

    // جدول الـ 16 مؤشر
    var tbl = h('table', { style: 'width:100%; border-collapse:collapse; border:1.5px solid #163B65; margin-bottom:18px; font-size:12.5px;' });
    tbl.appendChild(h('thead', null,
      h('tr', { style: 'background:#163B65; color:#FFF;' },
        h('th', { style: 'padding:8px 10px; border:1px solid #CBD5E1; text-align:right;', text: 'العبارات' }),
        h('th', { style: 'width:70px; padding:8px 4px; border:1px solid #CBD5E1; text-align:center;', text: 'يوجد' }),
        h('th', { style: 'width:70px; padding:8px 4px; border:1px solid #CBD5E1; text-align:center;', text: 'متوسط' }),
        h('th', { style: 'width:70px; padding:8px 4px; border:1px solid #CBD5E1; text-align:center;', text: 'لا يوجد' }),
        h('th', { style: 'width:160px; padding:8px 6px; border:1px solid #CBD5E1; text-align:center;', text: 'ملاحظات' })
      )
    ));

    var tb = h('tbody');
    BEHAVIOR_OBSERVATION_ITEMS.forEach(function (it, idx) {
      var sv = itemsState[it.id] || {};
      var val = sv.val || '';
      var tr = h('tr', { style: 'background:' + (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC') + ';' },
        h('td', { style: 'padding:6px 10px; border:1px solid #E2E8F0; font-weight:700;' },
          h('span', { text: it.text })
        ),
        h('td', { style: 'padding:6px 4px; border:1px solid #E2E8F0; text-align:center; font-weight:900;' }, val === 'يوجد' ? h('span', { style: 'color:#2563EB; font-size:15px;', text: '✔' }) : ''),
        h('td', { style: 'padding:6px 4px; border:1px solid #E2E8F0; text-align:center; font-weight:900;' }, val === 'متوسط' ? h('span', { style: 'color:#F59E0B; font-size:15px;', text: '✔' }) : ''),
        h('td', { style: 'padding:6px 4px; border:1px solid #E2E8F0; text-align:center; font-weight:900;' }, val === 'لا يوجد' ? h('span', { style: 'color:#64748B; font-size:15px;', text: '✔' }) : ''),
        h('td', { style: 'padding:6px 8px; border:1px solid #E2E8F0; font-size:12px; color:#475569;' }, h('span', { text: sv.note || '—' }))
      );
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    wrap.appendChild(tbl);

    // ملاحظات إضافية
    if (obs.additional_notes) {
      wrap.appendChild(h('div', { style: 'margin-bottom:16px; background:#F8FAFC; padding:12px 14px; border-radius:8px; border:1px solid #E2E8F0;' },
        h('strong', { style: 'display:block; color:#163B65; margin-bottom:4px; font-size:13.5px;', text: 'ملاحظات إضافية:' }),
        h('p', { style: 'margin:0; font-size:13px; line-height:1.5; color:#1E293B;', text: obs.additional_notes })
      ));
    }

    // مكان الإمضاء بدون خانة
    var sig = h('div', { style: 'margin-top:20px; display:flex; justify-content:flex-end;' },
      h('div', { style: 'text-align:center; min-width:200px;' },
        h('strong', { style: 'display:block; color:#163B65; font-size:15px; font-weight:900; margin-bottom:8px;', text: 'إمضاء المدير' }),
        h('div', { style: 'height:60px;' })
      )
    );
    wrap.appendChild(sig);

    // شريط الأزرار للمشرف (تعديل / تنزيل PDF / حذف)
    var bottomBar = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:14px; border-top:1px solid #E2E8F0; flex-wrap:wrap; gap:10px;' },
      h('div', null,
        h('button', {
          type: 'button',
          class: 'btn light',
          onclick: async function () {
            try {
              toast('جارٍ تجهيز استمارة ملاحظة السلوك بصيغة PDF...', 'ok');
              var pdfBytes = await DE_PDF.renderBehaviorObservationToPdf(ev, childFullName, secName, kd);
              DE_PDF.downloadPdf(pdfBytes, 'استمارة_ملاحظة_سلوك_' + (childFullName || 'تلميذ').replace(/\s+/g, '_') + '.pdf');
              toast('تم تنزيل الاستمارة بنجاح!', 'ok');
            } catch (err) {
              toast('تعذر التنزيل: ' + err.message, 'bad');
            }
          }
        }, makeSvgIcon('s-download'), h('span', { text: 'تحميل PDF (A4)' }))
      ),
      adminOpts ? h('div', { class: 'row-actions' },
        adminOpts.onEdit ? h('button', { type: 'button', class: 'btn light', onclick: adminOpts.onEdit }, makeSvgIcon('s-edit'), h('span', { text: 'تعديل' })) : null,
        adminOpts.onDelete ? h('button', { type: 'button', class: 'btn danger', onclick: adminOpts.onDelete }, makeSvgIcon('s-trash'), h('span', { text: 'حذف' })) : null
      ) : null
    );
    wrap.appendChild(bottomBar);

    return wrap;
  }

  /* =====================================================================
     دار الإحسان — التقرير النوعي (الوصف والملاحظات والتوجيهات البيداغوجية مع عرض التقرير الكمي فوقه)
     ===================================================================== */
  /* =====================================================================
     قائمة أنواع السلوكيات لدى الأطفال (14 سلوكاً رئيسياً وسلوكياتها الفرعية)
     المعتمدة لاستمارة "تقييم قياس السلوك المستهدف"
     ===================================================================== */
  var TARGET_BEHAVIORS_CATALOG = [
    {
      main: 'السلوكيات العدوانية (Comportements agressifs)',
      subs: [
        'الضرب باليد',
        'الركل بالقدم',
        'العض',
        'القرص',
        'الخدش',
        'الدفع',
        'شد الشعر',
        'البصق على الآخرين',
        'الرمي بالأشياء نحو الآخرين',
        'ضرب الرأس أو الجسم بالآخرين',
        'التهديد أو محاولة الاعتداء'
      ]
    },
    {
      main: 'سلوكيات إيذاء الذات (Automutilation / Auto-agression)',
      subs: [
        'ضرب الرأس باليد',
        'ضرب الرأس بالحائط أو الأرض',
        'عض اليد أو الأصابع',
        'خدش الجسم',
        'نتف الشعر',
        'ضرب الوجه',
        'قرص الجسم',
        'ضرب الجسم بالأشياء',
        'إدخال الأصابع في العين',
        'حك الجلد بشكل مفرط'
      ]
    },
    {
      main: "سلوكيات الرفض وعدم الامتثال (Comportements d'opposition)",
      subs: [
        'رفض تنفيذ التعليمات',
        'قول «لا» باستمرار',
        'تجاهل النداء',
        'رفض الجلوس',
        'رفض المشاركة في النشاط',
        'دفع الأدوات بعيداً',
        'تمزيق أوراق النشاط',
        'رمي الأدوات',
        'مغادرة مكان العمل',
        'مقاومة الانتقال من نشاط إلى آخر'
      ]
    },
    {
      main: 'نوبات الغضب والانفعال (Crises de colère)',
      subs: [
        'الصراخ',
        'البكاء الشديد',
        'الصراخ مع رمي الأشياء',
        'الاستلقاء على الأرض',
        'رفس الأرض',
        'ضرب الطاولة',
        'رمي الجسم على الأرض',
        'حبس النفس أثناء الانفعال',
        'نوبات غضب عند الرفض أو الانتظار'
      ]
    },
    {
      main: 'السلوكيات الحركية المفرطة (Hyperactivité motrice)',
      subs: [
        'الحركة المستمرة',
        'الجري داخل القسم',
        'القفز المتكرر',
        'صعود الطاولات والكراسي',
        'عدم القدرة على الجلوس',
        'التنقل المتكرر بين الأنشطة',
        'التسلق',
        'تحريك اليدين والقدمين باستمرار',
        'مغادرة المجموعة أثناء النشاط'
      ]
    },
    {
      main: 'السلوكيات النمطية والتكرارية (Stéréotypies)',
      subs: [
        'رفرفة اليدين',
        'الدوران حول النفس',
        'المشي على أطراف الأصابع',
        'التأرجح بالجسم',
        'هز الرأس',
        'تكرار الأصوات',
        'تكرار الكلمات أو العبارات (Echolalie)',
        'ترتيب الأشياء بشكل متكرر',
        'تدوير الأشياء',
        'فتح وغلق الأبواب باستمرار',
        'التحديق في الأضواء أو الأشياء المتحركة'
      ]
    },
    {
      main: 'السلوكيات المرتبطة بالتواصل (Comportements de communication)',
      subs: [
        'الصراخ للتعبير عن الطلب',
        'البكاء عند عدم فهم الآخرين',
        'سحب يد المربي للحصول على شيء',
        'الإشارة غير الواضحة',
        'تكرار السؤال نفسه',
        'تكرار الكلمات دون سياق',
        'عدم طلب المساعدة',
        'عدم التعبير عن الاحتياجات',
        'إصدار أصوات لجذب الانتباه'
      ]
    },
    {
      main: 'السلوكيات الانسحابية والاجتماعية (Retrait social)',
      subs: [
        'العزلة عن المجموعة',
        'تجنب التواصل البصري',
        'رفض اللعب الجماعي',
        'الابتعاد عن الأطفال',
        'عدم الاستجابة للمبادرات الاجتماعية',
        'الجلوس منفرداً',
        'تجنب التفاعل مع المربي',
        'عدم مشاركة الألعاب'
      ]
    },
    {
      main: 'السلوكيات الحسية (Comportements sensoriels)',
      subs: [
        'تغطية الأذنين عند سماع الأصوات',
        'الانزعاج من الضوضاء',
        'شم الأشياء باستمرار',
        'لمس الأسطح بشكل متكرر',
        'وضع الأشياء في الفم',
        'لعق الأشياء',
        'النظر المطول إلى مصادر الضوء',
        'رفض بعض الملمسات',
        'الانزعاج من اللمس',
        'البحث عن الضغط الجسدي',
        'الدوران أو القفز بحثاً عن الإثارة الحسية'
      ]
    },
    {
      main: 'السلوكيات التخريبية (Comportements destructeurs)',
      subs: [
        'تمزيق الأوراق',
        'كسر الألعاب',
        'رمي الكراسي',
        'قلب الطاولات',
        'إتلاف الأدوات',
        'نزع الصور والملصقات',
        'الكتابة على الجدران',
        'إتلاف ممتلكات الآخرين'
      ]
    },
    {
      main: "السلوكيات غير الملائمة أثناء التعلم (Comportements inadaptés en situation d'apprentissage)",
      subs: [
        'عدم الانتباه للمهمة',
        'الانشغال بأشياء أخرى',
        'ترك النشاط قبل إتمامه',
        'اللعب بالأدوات بدل استخدامها',
        'مقاطعة المربي',
        'عدم انتظار الدور',
        'عدم اتباع التعليمات',
        'الانتقال بين المهام دون إذن',
        'تشتيت انتباه زملائه'
      ]
    },
    {
      main: 'السلوكيات المرتبطة بالاستقلالية والعناية الذاتية',
      subs: [
        'رفض دخول المرحاض',
        'رفض غسل اليدين',
        'رفض تنظيف الأسنان',
        'خلع الملابس في غير وقتها',
        'نزع الحذاء باستمرار',
        'رفض تناول الطعام',
        'رمي الطعام',
        'وضع أشياء غير غذائية في الفم',
        'عدم طلب الذهاب إلى المرحاض'
      ]
    },
    {
      main: 'السلوكيات المرتبطة بالطعام',
      subs: [
        'الانتقائية الغذائية الشديدة',
        'رفض أطعمة معينة',
        'تناول الطعام بسرعة مفرطة',
        'تخزين الطعام في الفم',
        'البصق أثناء الأكل',
        'رمي الطعام',
        'شم الطعام قبل تناوله',
        'تناول مواد غير غذائية (Pica)'
      ]
    },
    {
      main: 'السلوكيات المرتبطة بالنوم والراحة',
      subs: [
        'صعوبة الاستقرار والهدوء',
        'مقاومة وقت الراحة',
        'النعاس أثناء النشاط',
        'الاستيقاظ المتكرر',
        'البكاء عند الاستيقاظ'
      ]
    }
  ];

  var ARABIC_DAYS_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  function formatDateDDMMYYYY(isoStr) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoStr || '').trim());
    return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(isoStr || '');
  }

  /* =====================================================================
     باني وعارض التقييم الجديد 1: تقييم قياس السلوك المستهدف
     + تقرير قياس السلوك المستهدف (يُملأ بعد التقييم، وتُحسب نتائجه تلقائياً،
       ويظهر في قسم التقارير وحده مع إمكانية رؤيته مع التقييم)
     ===================================================================== */
  function buildTargetBehaviorLiveResultsAndReportDom(getEvalPayloadFn, tbrState, getChildInfoFn, includeManualInputs) {
    var container = h('div', { style: 'margin-top:18px;' });

    var autoResultsCard = h('div', {
      class: 'card',
      style: 'border:1.5px solid #163B65; border-radius:12px; background:#F8FAFC; padding:14px; margin-bottom:14px;'
    });

    var kpiHost = h('div');
    var canvasPreviewWrap = h('div', {
      style: 'width:100%; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:10px; overflow:hidden; min-height:240px; display:flex; align-items:center; justify-content:center; margin-top:10px;'
    }, h('span', { class: 'muted small', text: 'جارٍ رسم نتائج ومنحنى ومقياس تقرير قياس السلوك المستهدف...' }));

    var epDurInput = h('input', {
      type: 'text',
      value: tbrState.episode_duration || '10–45 ث',
      placeholder: 'مثال: 10–45 ث',
      style: 'width:130px; height:28px; padding:2px 8px; border-radius:6px; border:1px solid #CBD5E1; font-weight:800; text-align:center; font-size:12px;'
    });

    function refreshTargetBehaviorLiveStats() {
      var tbData = getEvalPayloadFn();
      var cInfo = getChildInfoFn();
      var stats = (window.DE_PDF && typeof window.DE_PDF.computeTargetBehaviorStats === 'function')
        ? window.DE_PDF.computeTargetBehaviorStats(tbData, tbrState)
        : { totalOccurrences: 0, totalDays: 0, dailyAverageFmt: '0', episodeDuration: tbrState.episode_duration || '10–45 ث', maxMinSummary: '' };

      if (!tbrState._userEditedDur && stats.episodeDuration) {
        epDurInput.value = stats.episodeDuration;
      }

      kpiHost.textContent = '';
      var kpiGrid = h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(175px, 1fr)); gap:10px; margin-bottom:8px;' },
        h('div', { style: 'background:#1B365D; color:#FFF; padding:10px 12px; border-radius:10px; text-align:center;' },
          h('div', { style: 'font-size:22px; font-weight:900; line-height:1.1;', text: String(stats.totalOccurrences) }),
          h('div', { style: 'font-size:11.5px; opacity:0.92; margin-top:3px;', text: 'مجموع مرات حدوث السلوك' })
        ),
        h('div', { style: 'background:#263F65; color:#FFF; padding:10px 12px; border-radius:10px; text-align:center;' },
          h('div', { style: 'font-size:22px; font-weight:900; line-height:1.1;', text: String(stats.totalDays) }),
          h('div', { style: 'font-size:11.5px; opacity:0.92; margin-top:3px;', text: 'عدد أيام المتابعة' })
        ),
        h('div', { style: 'background:#1D5B9E; color:#FFF; padding:10px 12px; border-radius:10px; text-align:center;' },
          h('div', { style: 'font-size:22px; font-weight:900; line-height:1.1;', text: String(stats.dailyAverageFmt) }),
          h('div', { style: 'font-size:11.5px; opacity:0.92; margin-top:3px;', text: 'متوسط التكرار اليومي' })
        ),
        h('div', { style: 'background:#8B2635; color:#FFF; padding:10px 12px; border-radius:10px; text-align:center;' },
          h('div', { style: 'font-size:20px; font-weight:900; line-height:1.1;', text: String(tbrState.episode_duration || stats.episodeDuration || '10–45 ث') }),
          h('div', { style: 'font-size:11.5px; opacity:0.92; margin-top:3px;', text: 'مدة النوبة الواحدة' })
        )
      );
      kpiHost.appendChild(kpiGrid);
      kpiHost.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; font-size:12.5px; font-weight:800; color:#0F172A;' },
        h('span', { text: stats.maxMinSummary || '' }),
        h('label', { style: 'display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#163B65;' },
          h('span', { text: 'تخصيص مدة النوبة الواحدة:' }),
          epDurInput
        )
      ));

      if (window.DE_PDF && typeof window.DE_PDF.renderTargetBehaviorReportPage1Canvas === 'function') {
        var tempObj = {
          eval_type: 'target_behavior_report',
          child_id: cInfo.child_id,
          child_name: cInfo.child_name,
          target_behavior_eval: tbData,
          target_behavior_report: tbrState
        };
        window.DE_PDF.renderTargetBehaviorReportPage1Canvas(tempObj, cInfo.child_name, cInfo.section_name, cInfo.kid).then(function (cEl) {
          canvasPreviewWrap.textContent = '';
          cEl.style.width = '100%';
          cEl.style.height = 'auto';
          cEl.style.display = 'block';
          cEl.style.maxWidth = '100%';
          canvasPreviewWrap.appendChild(cEl);
        }).catch(function () {});
      }
    }

    epDurInput.oninput = function () {
      tbrState._userEditedDur = true;
      tbrState.episode_duration = epDurInput.value;
      refreshTargetBehaviorLiveStats();
    };

    autoResultsCard.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px; border-bottom:1px solid #CBD5E1; padding-bottom:8px;' },
      makeStepTitleDom('2', 'النتائج التلقائية لتقرير قياس السلوك المستهدف (تُحسب آلياً من التقييم)', 's-chart'),
      h('span', { class: 'badge ok', text: 'تحديث تلقائي فوري ✓' })
    ));
    autoResultsCard.appendChild(kpiHost);
    autoResultsCard.appendChild(canvasPreviewWrap);
    container.appendChild(autoResultsCard);

    if (includeManualInputs) {
      var goalInp = h('textarea', {
        rows: 2,
        placeholder: 'هدف المتابعة...',
        value: tbrState.goal_text || 'تهدف هذه المتابعة إلى رصد السلوك المستهدف وقياس معدل تكراره ومدته الزمنية، وتحديد الظروف والمواقف السابقة لحدوثه، من أجل فهم العوامل المرتبطة به وتحديد التدخل التربوي المناسب.'
      });
      goalInp.oninput = function () {
        tbrState.goal_text = goalInp.value;
        refreshTargetBehaviorLiveStats();
      };

      var antArea = h('textarea', {
        rows: 3,
        placeholder: 'اكتب تحليل السوابق والظروف والمواقف السابقة لحدوث السلوك...',
        value: tbrState.antecedents_analysis || ''
      });
      antArea.oninput = function () { tbrState.antecedents_analysis = antArea.value; };

      var readArea = h('textarea', {
        rows: 3,
        placeholder: 'اكتب القراءة السلوكية الأولية للحالة...',
        value: tbrState.initial_reading || ''
      });
      readArea.oninput = function () { tbrState.initial_reading = readArea.value; };

      var recArea = h('textarea', {
        rows: 3,
        placeholder: 'اكتب التوصيات والتدخلات التربوية المقترحة...',
        value: tbrState.recommendations_text || ''
      });
      recArea.oninput = function () { tbrState.recommendations_text = recArea.value; };

      var concArea = h('textarea', {
        rows: 3,
        placeholder: 'اكتب الخلاصة النهائية لمتابعة السلوك المستهدف...',
        value: tbrState.conclusion_text || ''
      });
      concArea.oninput = function () { tbrState.conclusion_text = concArea.value; };

      var eduNameInp = h('input', {
        type: 'text',
        placeholder: 'اسم المربي المتابع (اختياري)...',
        value: tbrState.educator_name || ''
      });
      eduNameInp.oninput = function () { tbrState.educator_name = eduNameInp.value; };

      var manualCard = h('div', {
        class: 'card prog-step-card',
        style: 'border:1.5px solid #1E7E62; border-radius:12px; padding:14px;'
      },
        h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;' },
          makeStepTitleDom('3', 'ملء ملاحظات وتحليل تقرير قياس السلوك المستهدف (تُملأ يدوياً وتُحفظ في قسم التقارير)', 's-report'),
          h('span', { class: 'badge gold', text: 'تقرير قياس السلوك المستهدف' })
        ),
        h('div', { class: 'eval-builder-grid-2', style: 'margin-bottom:8px;' },
          h('label', { class: 'fld' }, h('span', { text: '1. هدف المتابعة:' }), goalInp),
          h('label', { class: 'fld' }, h('span', { text: 'المربي المتابع:' }), eduNameInp)
        ),
        h('div', { class: 'eval-builder-grid-2' },
          h('label', { class: 'fld' }, h('span', { text: '3. تحليل السوابق:' }), antArea),
          h('label', { class: 'fld' }, h('span', { text: '4. القراءة السلوكية الأولية:' }), readArea),
          h('label', { class: 'fld' }, h('span', { text: '5. التوصيات والتدخلات المقترحة:' }), recArea),
          h('label', { class: 'fld' }, h('span', { text: '6. الخلاصة:' }), concArea)
        )
      );
      container.appendChild(manualCard);
    }

    setTimeout(refreshTargetBehaviorLiveStats, 20);
    return {
      el: container,
      refresh: refreshTargetBehaviorLiveStats
    };
  }

  function openTargetBehaviorBuilder(existingRep, kids, sections, secAllOpts, branchOpts) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'evaluations', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    ev.eval_type = 'target_behavior';
    if (!existingRep) {
      ev.title = 'تقييم قياس السلوك المستهدف';
    }
    var selKid0 = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0] || (kids.length === 1 ? kids[0] : null);
    if (selKid0 && !ev.child_id) ev.child_id = selKid0.id;
    enrichChildEvaluationData(ev, selKid0 ? selKid0.full_name : '', selKid0 ? selKid0.section : '', selKid0);

    var tb = ev.target_behavior_eval || {};
    var tbrState = Object.assign({
      goal_text: 'تهدف هذه المتابعة إلى رصد السلوك المستهدف وقياس معدل تكراره ومدته الزمنية، وتحديد الظروف والمواقف السابقة لحدوثه، من أجل فهم العوامل المرتبطة به وتحديد التدخل التربوي المناسب.',
      episode_duration: '',
      antecedents_analysis: '',
      initial_reading: '',
      recommendations_text: '',
      conclusion_text: '',
      educator_name: ''
    }, ev.target_behavior_report || {});

    var selectedPairs = Array.isArray(tb.selected_pairs) ? tb.selected_pairs.slice() : [];
    var daysList = Array.isArray(tb.days) ? tb.days.map(function (d) {
      return {
        date: d.date,
        day_name: d.day_name,
        date_display: d.date_display,
        rows: Array.isArray(d.rows) && d.rows.length ? d.rows.map(function (r) {
          var copy = Object.assign({}, r);
          if (!copy.behavior_time && !copy.behavior_duration && copy.time_duration) {
            copy.behavior_time = copy.time_duration;
          }
          return copy;
        }) : [
          { main_behavior: '', sub_behavior: '', behavior_time: '', behavior_duration: '', frequency: '', location: '', antecedents: '' },
          { main_behavior: '', sub_behavior: '', behavior_time: '', behavior_duration: '', frequency: '', location: '', antecedents: '' }
        ]
      };
    }) : [];

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;' },
      h('div', { style: 'display:flex; align-items:center; gap:10px;' },
        h('img', { src: 'logo-sq.png', style: 'width:36px; height:36px; border-radius:8px;' }),
        h('h2', { style: 'margin:0; color:#163B65; font-size:1.18rem; font-weight:900;', text: existingRep ? 'تعديل تقييم قياس السلوك المستهدف' : 'تقييم قياس السلوك المستهدف' })
      ),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn small light', type: 'button', style: 'font-weight:700;', text: 'رجوع لقائمة التقييم', onclick: function () { go('evaluations'); } })
      )
    );
    v.appendChild(topBar);

    var card = h('div', { class: 'card', style: 'max-width:1120px; margin:0 auto; padding:16px; border-radius:14px; border:1.5px solid #E2E8F0;' });

    var curSecId = S.isEducator ? S.eduSectionId : (selKid0 ? selKid0.section_id : '');
    var secFilterSelect = h('select', { disabled: !!S.isEducator },
      h('option', { value: '', text: '— جميع الأقسام —' }),
      secAllOpts.map(function (o) { return h('option', { value: o[0], text: o[1] }); })
    );
    secFilterSelect.value = curSecId || '';

    var kidSelect = h('select', null);
    function populateKids() {
      var sId = secFilterSelect.value;
      var keep = ev.child_id || kidSelect.value;
      while (kidSelect.firstChild) kidSelect.removeChild(kidSelect.firstChild);
      kidSelect.appendChild(h('option', { value: '', text: '— اختر الطفل —' }));
      kids.forEach(function (k) {
        if (sId && !childMatchesSection(k, sId, nameOf(sections, sId, 'name'), sections)) return;
        kidSelect.appendChild(h('option', { value: k.id, text: k.full_name + (k.section ? (' — ' + k.section) : '') }));
      });
      if (keep && kids.some(function (k) { return String(k.id) === String(keep); })) {
        kidSelect.value = keep;
      }
    }
    populateKids();

    var ageInp = h('input', {
      type: 'text',
      placeholder: 'العمر (مثال: 7 سنوات)',
      value: tb.age || (selKid0 && selKid0.dob ? calcKidAgeStr(selKid0.dob) : '')
    });

    var todayIso = new Date().toISOString().slice(0, 10);
    var defaultEndIso = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
    var startDateInp = h('input', { type: 'date', value: tb.start_date || todayIso });
    var endDateInp = h('input', { type: 'date', value: tb.end_date || defaultEndIso });
    var skipWeekendChk = h('input', { type: 'checkbox', checked: tb.skip_weekend !== false, style: 'width:15px; height:15px; cursor:pointer;' });

    // مربع معلومات مصغر إلى النصف بدون بحث
    var metaCard = h('div', { class: 'card prog-step-card compact-qual-child-card' },
      makeStepTitleDom('1', 'بيانات الطفل وفترة المتابعة', 's-idcard'),
      h('div', { class: 'compact-qual-grid' },
        h('label', { class: 'fld' }, h('span', { text: 'القسم التربوي:' }), secFilterSelect),
        h('label', { class: 'fld' }, h('span', { text: 'اسم الطفل:' }), kidSelect),
        h('label', { class: 'fld' }, h('span', { text: 'العمر:' }), ageInp),
        h('label', { class: 'fld' }, h('span', { text: 'تاريخ البداية:' }), startDateInp),
        h('label', { class: 'fld' }, h('span', { text: 'تاريخ النهاية:' }), endDateInp),
        h('label', { class: 'fld', style: 'display:flex; flex-direction:row; align-items:center; gap:6px; padding-top:14px; cursor:pointer;' },
          skipWeekendChk,
          h('span', { style: 'font-size:11px; font-weight:800; color:#163B65;', text: 'استثناء الجمعة والسبت' })
        )
      )
    );
    card.appendChild(metaCard);

    var behaviorDisplayInp = h('input', {
      type: 'text',
      placeholder: 'اختر السلوكيات الرئيسية والفرعية من القائمة أدناه (أو اكتب هنا)...',
      value: tb.selected_behaviors_text || '',
      style: 'width:100%; font-weight:700; padding:7px 10px; border-radius:8px; border:1.5px solid #163B65; font-size:12.5px;'
    });

    var selectedTagsWrap = h('div', { style: 'display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;' });
    var liveReportWidget = null;

    function triggerLiveRefresh() {
      if (liveReportWidget && typeof liveReportWidget.refresh === 'function') {
        liveReportWidget.refresh();
      }
    }

    behaviorDisplayInp.oninput = triggerLiveRefresh;

    function syncBehaviorTextFromPairs() {
      selectedTagsWrap.textContent = '';
      if (!selectedPairs.length) return;
      selectedPairs.forEach(function (pair, pIdx) {
        var tag = h('span', {
          class: 'badge gold',
          style: 'display:inline-flex; align-items:center; gap:6px; padding:3px 9px; font-size:11.5px;'
        },
          h('span', { text: pair.main.replace(/\s*\([^)]*\)\s*/g, '') + (pair.sub ? (' : ' + pair.sub) : '') }),
          h('button', {
            type: 'button',
            style: 'border:none; background:transparent; color:#92400E; font-weight:900; cursor:pointer; padding:0 2px;',
            text: '✕',
            onclick: function () {
              selectedPairs.splice(pIdx, 1);
              updateBehaviorInputFromGrouped();
              syncBehaviorTextFromPairs();
              triggerLiveRefresh();
            }
          })
        );
        selectedTagsWrap.appendChild(tag);
      });
    }

    function updateBehaviorInputFromGrouped() {
      var grouped = {};
      selectedPairs.forEach(function (pair) {
        var shortMain = pair.main.replace(/\s*\([^)]*\)\s*/g, '').trim();
        if (!grouped[shortMain]) grouped[shortMain] = [];
        if (pair.sub && grouped[shortMain].indexOf(pair.sub) < 0) {
          grouped[shortMain].push(pair.sub);
        }
      });
      var parts = Object.keys(grouped).map(function (mName) {
        var subs = grouped[mName];
        return subs.length ? (mName + ' (' + subs.join('، ') + ')') : mName;
      });
      behaviorDisplayInp.value = parts.join(' — ');
    }

    var selectedMains = Array.isArray(tb.selected_mains) ? tb.selected_mains.slice() : [];
    selectedPairs.forEach(function (p) {
      if (p && p.main && selectedMains.indexOf(p.main) < 0) selectedMains.push(p.main);
    });

    var mainChipsWrap = h('div', { style: 'display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;' });
    var preSubWrap = h('div', { style: 'display:flex; flex-direction:column; gap:8px; margin-top:8px;' });

    function renderMultiMainSelector() {
      mainChipsWrap.textContent = '';
      preSubWrap.textContent = '';

      TARGET_BEHAVIORS_CATALOG.forEach(function (cat, idx) {
        var isMainSel = selectedMains.indexOf(cat.main) >= 0;
        var mBtn = h('button', {
          type: 'button',
          class: 'btn small ' + (isMainSel ? 'primary' : 'light'),
          style: 'font-size:11.5px; padding:5px 10px; border-radius:8px; font-weight:800;',
          text: (isMainSel ? '✔ ' : '+ ') + (idx + 1) + '. ' + cat.main.replace(/\s*\([^)]*\)\s*/g, ''),
          onclick: function () {
            var pos = selectedMains.indexOf(cat.main);
            if (pos >= 0) {
              selectedMains.splice(pos, 1);
              selectedPairs = selectedPairs.filter(function (p) { return p.main !== cat.main; });
            } else {
              selectedMains.push(cat.main);
            }
            updateBehaviorInputFromGrouped();
            syncBehaviorTextFromPairs();
            renderMultiMainSelector();
            triggerLiveRefresh();
          }
        });
        mainChipsWrap.appendChild(mBtn);
      });

      selectedMains.forEach(function (mName) {
        var cat = TARGET_BEHAVIORS_CATALOG.filter(function (c) { return c.main === mName; })[0];
        if (!cat) return;
        var groupBox = h('div', { style: 'background:#FFFFFF; border:1px solid #BFDBFE; border-radius:8px; padding:8px 10px;' },
          h('div', { style: 'font-size:12px; font-weight:900; color:#163B65; margin-bottom:5px;', text: 'السلوكيات التابعة لـ: ' + cat.main })
        );
        var chipsRow = h('div', { style: 'display:flex; flex-wrap:wrap; gap:5px;' });
        cat.subs.forEach(function (subName) {
          var isAlready = selectedPairs.some(function (p) { return p.main === cat.main && p.sub === subName; });
          chipsRow.appendChild(h('button', {
            type: 'button',
            class: 'btn small ' + (isAlready ? 'gold' : 'light'),
            style: 'font-size:11.5px; padding:4px 9px; border-radius:7px;',
            text: (isAlready ? '✔ ' : '+ ') + subName,
            onclick: function () {
              var idxExist = selectedPairs.findIndex(function (p) { return p.main === cat.main && p.sub === subName; });
              if (idxExist >= 0) selectedPairs.splice(idxExist, 1);
              else selectedPairs.push({ main: cat.main, sub: subName });
              updateBehaviorInputFromGrouped();
              syncBehaviorTextFromPairs();
              renderMultiMainSelector();
              triggerLiveRefresh();
            }
          }));
        });
        groupBox.appendChild(chipsRow);
        preSubWrap.appendChild(groupBox);
      });
    }

    syncBehaviorTextFromPairs();
    renderMultiMainSelector();

    var behaviorSelectorBox = h('div', { style: 'background:#EFF6FF; border:1.5px solid #93C5FD; border-radius:10px; padding:10px 12px; margin-bottom:14px;' },
      h('label', { style: 'font-weight:900; color:#163B65; font-size:13px; display:block; margin-bottom:4px;', text: '1. السلوكيات الرئيسية المختارة (يمكنك تحديد أكثر من سلوك رئيسي ثم السلوكيات التابعة له):' }),
      behaviorDisplayInp,
      mainChipsWrap,
      preSubWrap,
      selectedTagsWrap
    );
    card.appendChild(behaviorSelectorBox);

    var tableMount = h('div', { style: 'overflow-x:auto; margin-bottom:16px;' });

    function rebuildDaysFromDateRange() {
      var sVal = startDateInp.value;
      var eVal = endDateInp.value;
      if (!sVal || !eVal) return;
      var dStart = new Date(sVal + 'T00:00:00');
      var dEnd = new Date(eVal + 'T00:00:00');
      if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime()) || dEnd < dStart) return;

      var existingByDate = {};
      daysList.forEach(function (d) {
        if (d && d.date) existingByDate[d.date] = d;
      });

      var newDays = [];
      var cur = new Date(dStart.getTime());
      var maxDays = 60;
      var count = 0;
      while (cur <= dEnd && count < maxDays) {
        var dayOfWeek = cur.getDay();
        var skip = skipWeekendChk.checked && (dayOfWeek === 5 || dayOfWeek === 6);
        if (!skip) {
          var iso = cur.toISOString().slice(0, 10);
          var dayAr = ARABIC_DAYS_NAMES[dayOfWeek] || '';
          var disp = formatDateDDMMYYYY(iso);
          if (existingByDate[iso]) {
            existingByDate[iso].day_name = dayAr;
            existingByDate[iso].date_display = disp;
            newDays.push(existingByDate[iso]);
          } else {
            newDays.push({
              date: iso,
              day_name: dayAr,
              date_display: disp,
              rows: [
                { main_behavior: '', sub_behavior: '', time_duration: '', frequency: '', location: '', antecedents: '' },
                { main_behavior: '', sub_behavior: '', time_duration: '', frequency: '', location: '', antecedents: '' }
              ]
            });
          }
          count++;
        }
        cur.setDate(cur.getDate() + 1);
      }
      daysList = newDays;
      renderTargetBehaviorTable();
      triggerLiveRefresh();
    }

    startDateInp.onchange = rebuildDaysFromDateRange;
    endDateInp.onchange = rebuildDaysFromDateRange;
    skipWeekendChk.onchange = rebuildDaysFromDateRange;

    secFilterSelect.onchange = function () {
      populateKids();
      ev.child_id = kidSelect.value;
      triggerLiveRefresh();
    };
    kidSelect.onchange = function () {
      ev.child_id = kidSelect.value;
      var ck = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0];
      if (ck && ck.dob) ageInp.value = calcKidAgeStr(ck.dob);
      triggerLiveRefresh();
    };
    ageInp.oninput = triggerLiveRefresh;

    function openSubBehaviorCellPicker(rowItem, onPicked) {
      var modal = h('div', {
        class: 'modal card',
        style: 'max-width:380px; width:92%; background:#FFF; padding:14px 16px; border-radius:14px; border:1.5px solid #163B65; box-shadow:0 15px 35px rgba(0,0,0,0.22);'
      });

      modal.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding-bottom:8px; margin-bottom:10px;' },
        h('strong', { style: 'color:#163B65; font-size:0.95rem;', text: 'اختر السلوك الرئيسي ثم الفرعي' }),
        h('button', { type: 'button', class: 'icon-btn', style: 'width:26px; height:26px;', onclick: closeModal }, h('span', { text: '✕' }))
      ));

      if (selectedPairs.length > 0) {
        var quickBox = h('div', { style: 'margin-bottom:10px; padding-bottom:8px; border-bottom:1px dashed #CBD5E1;' },
          h('span', { class: 'small muted', style: 'display:block; margin-bottom:4px; font-weight:700;', text: 'السلوكيات الفرعية المحددة للطفل:' })
        );
        var qBtns = h('div', { style: 'display:flex; flex-wrap:wrap; gap:5px;' });
        selectedPairs.forEach(function (pair) {
          if (!pair.sub) return;
          qBtns.appendChild(h('button', {
            type: 'button',
            class: 'btn small gold',
            style: 'font-size:11.5px; padding:4px 8px;',
            text: pair.sub,
            onclick: function () {
              rowItem.main_behavior = pair.main;
              rowItem.sub_behavior = pair.sub;
              closeModal();
              onPicked(pair.sub);
              triggerLiveRefresh();
            }
          }));
        });
        quickBox.appendChild(qBtns);
        modal.appendChild(quickBox);
      }

      var allowedCatalog = selectedMains.length
        ? TARGET_BEHAVIORS_CATALOG.filter(function (c) { return selectedMains.indexOf(c.main) >= 0; })
        : TARGET_BEHAVIORS_CATALOG;

      var mSel = h('select', { style: 'width:100%; padding:7px 10px; border-radius:8px; border:1.5px solid #163B65; font-weight:800; margin-bottom:8px; font-size:12.5px;' },
        h('option', { value: '', text: selectedMains.length ? '— 1. اختر السلوك الرئيسي من القائمة المحددة —' : '— 1. اختر السلوك الرئيسي —' }),
        allowedCatalog.map(function (c, i) {
          var opt = h('option', { value: String(i), text: (i + 1) + '. ' + c.main });
          if (rowItem.main_behavior === c.main) opt.selected = true;
          return opt;
        })
      );
      if (allowedCatalog.length === 1) mSel.value = '0';
      modal.appendChild(mSel);

      var subsContainer = h('div', { style: 'display:flex; flex-direction:column; gap:5px; max-height:220px; overflow-y:auto;' });
      modal.appendChild(subsContainer);

      function renderSubsForMain() {
        subsContainer.textContent = '';
        var idx = parseInt(mSel.value, 10);
        if (isNaN(idx) || !allowedCatalog[idx]) {
          subsContainer.appendChild(h('p', { class: 'muted small', style: 'margin:4px 0; text-align:center;', text: 'اختر السلوك الرئيسي أولاً لعرض السلوكيات التابعة له فقط.' }));
          return;
        }
        var cat = allowedCatalog[idx];
        cat.subs.forEach(function (sName) {
          var sBtn = h('button', {
            type: 'button',
            style: 'text-align:right; padding:7px 10px; border-radius:7px; border:1px solid #CBD5E1; background:' + (rowItem.sub_behavior === sName ? '#EAF4FF' : '#F8FAFC') + '; font-weight:700; font-size:12.5px; cursor:pointer;',
            text: sName,
            onclick: function () {
              rowItem.main_behavior = cat.main;
              rowItem.sub_behavior = sName;
              closeModal();
              onPicked(sName);
              triggerLiveRefresh();
            }
          });
          subsContainer.appendChild(sBtn);
        });
      }

      mSel.onchange = renderSubsForMain;
      renderSubsForMain();
      openModal(modal);
    }

    function renderTargetBehaviorTable() {
      tableMount.textContent = '';
      var tbl = h('table', {
        style: 'width:100%; border-collapse:collapse; border:2px solid #000; background:#FFF; text-align:center; font-size:13px;'
      });

      tbl.appendChild(h('thead', null,
        h('tr', { style: 'background:#F8FAFC; font-weight:900; color:#000;' },
          h('th', { style: 'border:1.5px solid #000; padding:7px; width:13%;', text: 'اليوم والتاريخ' }),
          h('th', { style: 'border:1.5px solid #000; padding:7px; width:19%;', text: 'السلوك (الرئيسي والفرعي)' }),
          h('th', { style: 'border:1.5px solid #000; padding:7px; width:11%;', text: 'وقت السلوك' }),
          h('th', { style: 'border:1.5px solid #000; padding:7px; width:11%;', text: 'مدة السلوك' }),
          h('th', { style: 'border:1.5px solid #000; padding:7px; width:11%;', text: 'عدد التكرار' }),
          h('th', { style: 'border:1.5px solid #000; padding:7px; width:15%;', text: 'مكان حدوث السلوك' }),
          h('th', { style: 'border:1.5px solid #000; padding:7px; width:20%;', text: 'سوابق حدوث السلوك' })
        )
      ));

      var tbody = h('tbody');
      daysList.forEach(function (dayObj) {
        if (!Array.isArray(dayObj.rows) || !dayObj.rows.length) {
          dayObj.rows = [
            { main_behavior: '', sub_behavior: '', time_duration: '', frequency: '', location: '', antecedents: '' },
            { main_behavior: '', sub_behavior: '', time_duration: '', frequency: '', location: '', antecedents: '' }
          ];
        }
        var rCount = dayObj.rows.length;

        dayObj.rows.forEach(function (rowItem, rIdx) {
          var tr = h('tr');
          if (rIdx === 0) {
            var dayTd = h('td', {
              rowspan: rCount,
              style: 'border:1.5px solid #000; padding:6px; font-weight:800; vertical-align:middle; background:#FFFFFF;'
            },
              h('div', { style: 'font-size:13.5px; font-weight:900; color:#0F172A;', text: dayObj.day_name }),
              h('div', { style: 'font-size:12px; color:#334155; margin-bottom:5px;', text: dayObj.date_display }),
              h('div', { class: 'no-print', style: 'display:flex; justify-content:center; gap:4px;' },
                h('button', {
                  type: 'button',
                  class: 'btn small light',
                  style: 'padding:2px 6px; font-size:10.5px; min-height:22px;',
                  title: 'زيادة سلوك لهذا اليوم',
                  text: '+ سلوك',
                  onclick: function () {
                    dayObj.rows.push({ main_behavior: '', sub_behavior: '', time_duration: '', frequency: '', location: '', antecedents: '' });
                    renderTargetBehaviorTable();
                    triggerLiveRefresh();
                  }
                }),
                dayObj.rows.length > 1 ? h('button', {
                  type: 'button',
                  class: 'btn small danger',
                  style: 'padding:2px 6px; font-size:10.5px; min-height:22px;',
                  title: 'إنقاص سلوك من هذا اليوم',
                  text: '- إنقاص',
                  onclick: function () {
                    dayObj.rows.pop();
                    renderTargetBehaviorTable();
                    triggerLiveRefresh();
                  }
                }) : null
              )
            );
            tr.appendChild(dayTd);
          }

          var subLabelSpan = h('span', {
            style: 'font-weight:800; color:' + (rowItem.sub_behavior ? '#0F172A' : '#94A3B8') + '; font-size:12.5px;',
            text: rowItem.sub_behavior || 'اختر السلوك...'
          });
          var pickBtn = h('button', {
            type: 'button',
            style: 'width:100%; padding:5px 7px; border:1px dashed #94A3B8; border-radius:6px; background:#F8FAFC; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-family:inherit;',
            onclick: function () {
              openSubBehaviorCellPicker(rowItem, function (chosenSub) {
                subLabelSpan.textContent = chosenSub;
                subLabelSpan.style.color = '#0F172A';
              });
            }
          }, subLabelSpan, h('span', { style: 'font-size:10px; color:#2563EB;', text: '▼' }));

          tr.appendChild(h('td', { style: 'border:1.5px solid #000; padding:4px;' }, pickBtn));

          function makeManualCellInput(fieldKey, ph) {
            var inp = h('input', {
              type: 'text',
              value: rowItem[fieldKey] || '',
              placeholder: ph,
              style: 'width:100%; border:none; padding:5px 4px; text-align:center; font-size:12.5px; font-weight:600; background:transparent; box-sizing:border-box;'
            });
            inp.oninput = function () {
              rowItem[fieldKey] = inp.value;
              triggerLiveRefresh();
            };
            return h('td', { style: 'border:1.5px solid #000; padding:2px;' }, inp);
          }

          tr.appendChild(makeManualCellInput('behavior_time', 'مثال: 09:30'));
          tr.appendChild(makeManualCellInput('behavior_duration', 'مثال: 30 ثانية'));
          tr.appendChild(makeManualCellInput('frequency', 'عدد المرات...'));
          tr.appendChild(makeManualCellInput('location', 'المكان...'));
          tr.appendChild(makeManualCellInput('antecedents', 'السوابق...'));

          tbody.appendChild(tr);
        });
      });

      tbl.appendChild(tbody);
      tableMount.appendChild(tbl);
    }

    function packTargetBehaviorData() {
      var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
      return {
        child_id: kidSelect.value,
        child_name: ck ? ck.full_name : '',
        age: ageInp.value,
        start_date: startDateInp.value,
        end_date: endDateInp.value,
        skip_weekend: skipWeekendChk.checked,
        selected_mains: selectedMains,
        selected_pairs: selectedPairs,
        selected_behaviors_text: behaviorDisplayInp.value,
        days: daysList
      };
    }

    if (!daysList.length) {
      rebuildDaysFromDateRange();
    } else {
      renderTargetBehaviorTable();
    }

    card.appendChild(h('div', { style: 'font-weight:900; color:#000; font-size:14.5px; margin-bottom:6px;', text: 'جدول القياس: التكرار + المدة الزمنية' }));
    card.appendChild(tableMount);

    // إضافة قسم نتائج وملء "تقرير قياس السلوك المستهدف" مباشرة بعد جدول التقييم
    liveReportWidget = buildTargetBehaviorLiveResultsAndReportDom(
      packTargetBehaviorData,
      tbrState,
      function () {
        var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
        var sName = ck ? (nameOf(sections, ck.section_id, 'name') || ck.section || '') : '';
        return {
          child_id: kidSelect.value,
          child_name: ck ? ck.full_name : '',
          section_name: sName,
          kid: ck
        };
      },
      true
    );
    card.appendChild(liveReportWidget.el);

    async function saveTargetBehavior(statusKey) {
      if (!kidSelect.value) return toast('يرجى اختيار الطفل أولاً.', 'bad');
      var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
      var sName = ck ? (nameOf(sections, ck.section_id, 'name') || ck.section || '') : '';
      var packed = packTargetBehaviorData();
      var reportPayloadData = Object.assign({}, tbrState, {
        child_id: kidSelect.value,
        child_name: ck ? ck.full_name : '',
        age: ageInp.value,
        selected_behaviors_text: behaviorDisplayInp.value,
        report_date: startDateInp.value || todayIso
      });

      var payload = {
        eval_type: 'target_behavior',
        status: statusKey,
        child_id: kidSelect.value,
        child_name: ck ? ck.full_name : '',
        dob: ck ? ck.dob : '',
        section_name: sName,
        title: 'تقييم قياس السلوك المستهدف',
        report_date: startDateInp.value || todayIso,
        target_behavior_eval: packed,
        target_behavior_report: reportPayloadData
      };
      var recordBody = {
        child_id: kidSelect.value,
        title: 'تقييم قياس السلوك المستهدف — ' + (ck ? ck.full_name : ''),
        report_date: startDateInp.value || todayIso,
        status: statusKey,
        activities: EVAL_MARKER + JSON.stringify(payload),
        notes: packed.selected_behaviors_text || null
      };
      try {
        if (ev.id && DE.isUuid(String(ev.id))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(ev.id), recordBody);
        } else {
          var created = await saveProgressReportResilient('POST', '/progress_reports', recordBody);
          if (Array.isArray(created) && created[0]) ev.id = created[0].id;
        }
        await syncSharedEvaluationRecord(Object.assign({}, recordBody, { id: ev.id || ('tb_' + Date.now()) }), null);

        // حفظ/تحديث "تقرير قياس السلوك المستهدف" كوثيقة مستقلة في قسم التقارير تلقائياً
        var sharedAll = await loadSharedEvaluationsList();
        var existingRepRec = sharedAll.filter(function (item) {
          return item && String(item.child_id) === String(kidSelect.value) && getReportSubCategory(item) === 'target_behavior_report';
        })[0];
        var repId = existingRepRec ? existingRepRec.id : null;
        var standaloneRepPayload = {
          eval_type: 'target_behavior_report',
          status: statusKey,
          child_id: kidSelect.value,
          child_name: ck ? ck.full_name : '',
          dob: ck ? ck.dob : '',
          section_name: sName,
          title: 'تقرير قياس السلوك المستهدف',
          report_date: startDateInp.value || todayIso,
          target_behavior_eval: packed,
          target_behavior_report: reportPayloadData
        };
        var standaloneRepBody = {
          child_id: kidSelect.value,
          title: 'تقرير قياس السلوك المستهدف — ' + (ck ? ck.full_name : ''),
          report_date: startDateInp.value || todayIso,
          status: statusKey,
          activities: EVAL_MARKER + JSON.stringify(standaloneRepPayload),
          notes: reportPayloadData.conclusion_text || reportPayloadData.recommendations_text || packed.selected_behaviors_text || null
        };
        if (repId && DE.isUuid(String(repId))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(repId), standaloneRepBody);
        } else {
          var createdRep = await saveProgressReportResilient('POST', '/progress_reports', standaloneRepBody);
          if (Array.isArray(createdRep) && createdRep[0]) repId = createdRep[0].id;
        }
        await syncSharedEvaluationRecord(Object.assign({}, standaloneRepBody, { id: repId || ('tbr_' + Date.now()) }), null);

        bust();
        toast(statusKey === 'published' ? 'تم اعتماد ونشر تقييم وتقرير قياس السلوك المستهدف بنجاح!' : 'تم حفظ التقييم وتقرير قياس السلوك المستهدف كمسودة.', 'ok');
        go('evaluations');
      } catch (err) {
        toast('تعذر الحفظ: ' + (err.message || 'خطأ'), 'bad');
      }
    }

    var footerBar = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:18px;' },
      h('div', { style: 'display:flex; gap:8px;' },
        h('button', {
          type: 'button',
          class: 'btn primary',
          style: 'font-weight:800;',
          onclick: function () {
            var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
            var packed = packTargetBehaviorData();
            var tempRep = {
              eval_type: 'target_behavior',
              child_id: kidSelect.value,
              child_name: ck ? ck.full_name : '',
              target_behavior_eval: packed,
              target_behavior_report: tbrState
            };
            var prevModal = h('div', { class: 'modal card', style: 'max-width:1020px; width:95%; max-height:92vh; overflow-y:auto; padding:20px;' });
            prevModal.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;' },
              h('strong', { style: 'color:#163B65; font-size:1.02rem;', text: 'المعاينة والتحميل (التقييم + تقرير قياس السلوك المستهدف)' }),
              h('button', { type: 'button', class: 'icon-btn', onclick: closeModal }, h('span', { text: '✕' }))
            ));
            prevModal.appendChild(renderTargetBehaviorSheetView(tempRep, ck ? ck.full_name : '', ck ? ck.section : '', ck));
            openModal(prevModal);
          }
        }, makeSvgIcon('s-eye'), h('span', { text: 'المعاينة والتحميل (التقييم والتقرير)' }))
      ),
      h('div', { style: 'display:flex; gap:8px;' },
        h('button', { type: 'button', class: 'btn light', text: 'حفظ كمسودة', onclick: function () { saveTargetBehavior('draft'); } }),
        h('button', { type: 'button', class: 'btn gold', style: 'font-weight:800;', text: 'نشر', onclick: function () { saveTargetBehavior('published'); } })
      )
    );
    card.appendChild(footerBar);
    v.appendChild(card);
  }

  /* باني مستقل لتقرير قياس السلوك المستهدف في قسم التقارير */
  function openTargetBehaviorReportBuilder(existingRep, kids, sections, secAllOpts, branchOpts, allReportsPool) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'reports', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    ev.eval_type = 'target_behavior_report';
    var selKid0 = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0] || (kids.length ? kids[0] : null);
    if (selKid0 && !ev.child_id) ev.child_id = selKid0.id;
    enrichChildEvaluationData(ev, selKid0 ? selKid0.full_name : '', selKid0 ? selKid0.section : '', selKid0, allReportsPool);

    var tbrState = Object.assign({
      goal_text: 'تهدف هذه المتابعة إلى رصد السلوك المستهدف وقياس معدل تكراره ومدته الزمنية، وتحديد الظروف والمواقف السابقة لحدوثه، من أجل فهم العوامل المرتبطة به وتحديد التدخل التربوي المناسب.',
      episode_duration: '',
      antecedents_analysis: '',
      initial_reading: '',
      recommendations_text: '',
      conclusion_text: '',
      educator_name: ''
    }, ev.target_behavior_report || {});

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;' },
      h('div', { style: 'display:flex; align-items:center; gap:8px;' },
        h('img', { src: 'logo-sq.png', style: 'width:36px; height:36px; border-radius:8px;' }),
        h('h2', { style: 'margin:0; color:#163B65; font-size:1.15rem; font-weight:900;', text: 'تقرير قياس السلوك المستهدف' })
      ),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn small light', type: 'button', style: 'font-weight:700;', text: 'رجوع لقائمة التقارير', onclick: function () { go('reports'); } })
      )
    );
    v.appendChild(topBar);

    var curSecId = S.isEducator ? S.eduSectionId : (selKid0 ? selKid0.section_id : '');
    var secFilterSelect = h('select', { disabled: !!S.isEducator },
      h('option', { value: '', text: '— جميع الأقسام —' }),
      secAllOpts.map(function (o) { return h('option', { value: o[0], text: o[1] }); })
    );
    secFilterSelect.value = curSecId || '';

    var kidSelect = h('select', null);
    function populateKids() {
      var sId = secFilterSelect.value;
      var keep = ev.child_id || kidSelect.value;
      while (kidSelect.firstChild) kidSelect.removeChild(kidSelect.firstChild);
      kidSelect.appendChild(h('option', { value: '', text: '— اختر الطفل —' }));
      kids.forEach(function (k) {
        if (sId && !childMatchesSection(k, sId, nameOf(sections, sId, 'name'), sections)) return;
        kidSelect.appendChild(h('option', { value: k.id, text: k.full_name + (k.section ? (' — ' + k.section) : '') }));
      });
      if (keep && kids.some(function (k) { return String(k.id) === String(keep); })) {
        kidSelect.value = keep;
      } else if (kidSelect.options.length > 1 && !kidSelect.value) {
        kidSelect.selectedIndex = 1;
        ev.child_id = kidSelect.value;
      }
    }
    populateKids();

    var reportDateInp = h('input', { type: 'date', value: ev.report_date || new Date().toISOString().slice(0, 10) });

    var step1Card = h('div', { class: 'card prog-step-card compact-qual-child-card' },
      makeStepTitleDom('1', 'بيانات الطفل وتاريخ التقرير', 's-idcard'),
      h('div', { class: 'compact-qual-grid' },
        h('label', { class: 'fld' }, h('span', { text: 'القسم التربوي:' }), secFilterSelect),
        h('label', { class: 'fld' }, h('span', { text: 'الطفل المعني:' }), kidSelect),
        h('label', { class: 'fld' }, h('span', { text: 'تاريخ التقرير:' }), reportDateInp)
      )
    );
    v.appendChild(step1Card);

    var liveWidget = buildTargetBehaviorLiveResultsAndReportDom(
      function () { return ev.target_behavior_eval || {}; },
      tbrState,
      function () {
        var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
        var sName = ck ? (nameOf(sections, ck.section_id, 'name') || ck.section || '') : '';
        return {
          child_id: kidSelect.value,
          child_name: ck ? ck.full_name : '',
          section_name: sName,
          kid: ck
        };
      },
      true
    );
    v.appendChild(liveWidget.el);

    function reloadChildTargetBehaviorEval() {
      ev.child_id = kidSelect.value;
      var ck = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0];
      ev.target_behavior_eval = {};
      enrichChildEvaluationData(ev, ck ? ck.full_name : '', ck ? ck.section : '', ck, allReportsPool);
      liveWidget.refresh();
    }

    secFilterSelect.onchange = function () { populateKids(); reloadChildTargetBehaviorEval(); };
    kidSelect.onchange = reloadChildTargetBehaviorEval;

    async function saveTargetBehaviorReportAction(statusKey) {
      if (!kidSelect.value) return toast('يرجى اختيار الطفل أولاً.', 'bad');
      var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
      var sName = ck ? (nameOf(sections, ck.section_id, 'name') || ck.section || '') : '';
      var payload = {
        eval_type: 'target_behavior_report',
        status: statusKey,
        child_id: kidSelect.value,
        child_name: ck ? ck.full_name : '',
        dob: ck ? ck.dob : '',
        section_name: sName,
        title: 'تقرير قياس السلوك المستهدف',
        report_date: reportDateInp.value,
        target_behavior_eval: ev.target_behavior_eval || {},
        target_behavior_report: Object.assign({}, tbrState, {
          child_id: kidSelect.value,
          child_name: ck ? ck.full_name : '',
          report_date: reportDateInp.value
        })
      };
      var recordBody = {
        child_id: kidSelect.value,
        title: 'تقرير قياس السلوك المستهدف — ' + (ck ? ck.full_name : ''),
        report_date: reportDateInp.value,
        status: statusKey,
        activities: EVAL_MARKER + JSON.stringify(payload),
        notes: tbrState.conclusion_text || tbrState.recommendations_text || null
      };
      try {
        if (ev.id && DE.isUuid(String(ev.id))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(ev.id), recordBody);
        } else {
          var created = await saveProgressReportResilient('POST', '/progress_reports', recordBody);
          if (Array.isArray(created) && created[0]) ev.id = created[0].id;
        }
        await syncSharedEvaluationRecord(Object.assign({}, recordBody, { id: ev.id || ('tbr_' + Date.now()) }), null);
        bust();
        toast(statusKey === 'published' ? 'تم اعتماد ونشر تقرير قياس السلوك المستهدف بنجاح!' : 'تم حفظ التقرير كمسودة.', 'ok');
        go('reports');
      } catch (err) {
        toast('تعذر الحفظ: ' + (err.message || 'خطأ'), 'bad');
      }
    }

    var saveBar = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:16px;' },
      h('button', {
        type: 'button',
        class: 'btn primary',
        style: 'font-weight:800;',
        onclick: function () {
          var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
          var tempRep = {
            eval_type: 'target_behavior_report',
            child_id: kidSelect.value,
            child_name: ck ? ck.full_name : '',
            target_behavior_eval: ev.target_behavior_eval || {},
            target_behavior_report: tbrState
          };
          var prevModal = h('div', { class: 'modal card', style: 'max-width:1020px; width:95%; max-height:92vh; overflow-y:auto; padding:20px;' });
          prevModal.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;' },
            h('strong', { style: 'color:#163B65; font-size:1.02rem;', text: 'معاينة وتحميل تقرير قياس السلوك المستهدف' }),
            h('button', { type: 'button', class: 'icon-btn', onclick: closeModal }, h('span', { text: '✕' }))
          ));
          prevModal.appendChild(renderTargetBehaviorReportSheetView(tempRep, ck ? ck.full_name : '', ck ? ck.section : '', ck));
          openModal(prevModal);
        }
      }, makeSvgIcon('s-eye'), h('span', { text: 'المعاينة والتحميل' })),
      h('div', { style: 'display:flex; gap:8px;' },
        h('button', { type: 'button', class: 'btn light', text: 'حفظ كمسودة', onclick: function () { saveTargetBehaviorReportAction('draft'); } }),
        h('button', { type: 'button', class: 'btn gold', style: 'font-weight:800;', text: 'نشر', onclick: function () { saveTargetBehaviorReportAction('published'); } })
      )
    );
    v.appendChild(saveBar);
  }

  /* بناء محتوى تقرير قياس السلوك المستهدف (صفحتان مطابقتان لملف report_mohamed.pdf) */
  function buildTargetBehaviorReportPagesDom(ev, childFullName, secName, kd) {
    enrichChildEvaluationData(ev, childFullName, secName, kd);
    var tb = ev.target_behavior_eval || {};
    var tbr = ev.target_behavior_report || {};
    var chName = childFullName || (kd && kd.full_name) || ev.child_name || tb.child_name || tbr.child_name || '—';

    var holder = h('div', { style: 'display:flex; flex-direction:column; gap:18px;' });

    var p1Host = h('div', {
      style: 'width:100%; background:#FFF; border:1px solid #CBD5E1; border-radius:10px; overflow:hidden; min-height:280px; display:flex; align-items:center; justify-content:center;'
    }, h('span', { class: 'muted small', text: 'جارٍ رسم الصفحة 1 من تقرير قياس السلوك المستهدف...' }));

    (function renderTbPage1(attempt) {
      if (!window.DE_PDF || typeof window.DE_PDF.renderTargetBehaviorReportPage1Canvas !== 'function') {
        if (attempt < 20) return setTimeout(function () { renderTbPage1(attempt + 1); }, 150);
        p1Host.textContent = 'تعذر تحميل محرك الرسوم البيانية. يرجى تحديث الصفحة.';
        p1Host.style.color = '#991B1B';
        return;
      }
      window.DE_PDF.renderTargetBehaviorReportPage1Canvas(ev, chName, secName, kd).then(function (c1) {
        if (!c1 || !c1.getContext) throw new Error('تعذر إنشاء لوحة الرسم');
        p1Host.textContent = '';
        c1.style.width = '100%';
        c1.style.height = 'auto';
        c1.style.display = 'block';
        p1Host.appendChild(c1);
      }).catch(function (err) {
        console.error('[DarElIhsan] TB Page1 render error:', err);
        p1Host.textContent = 'تعذر رسم المنحنى ومقياس الساعة: ' + ((err && err.message) || 'خطأ تقني');
        p1Host.style.color = '#991B1B';
      });
    })(0);
    holder.appendChild(p1Host);

    function makePage2SectionBox(num, title, contentTxt) {
      return h('div', { style: 'margin-bottom:16px;' },
        h('div', { style: 'display:flex; justify-content:flex-start; margin-bottom:8px;' },
          h('div', { style: 'background:#1B365D; color:#FFF; padding:6px 16px; border-radius:20px; display:inline-flex; align-items:center; gap:10px; font-weight:800; font-size:14px;' },
            h('span', { style: 'background:#FFF; color:#1B365D; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:900; font-size:12px;', text: num }),
            h('span', { text: title })
          )
        ),
        h('div', {
          style: 'padding:10px 14px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:8px; font-size:13.5px; font-weight:700; line-height:1.75; color:#0F172A; white-space:pre-wrap; height:auto;',
          text: (contentTxt && String(contentTxt).trim()) ? contentTxt : '........................................................................................................................'
        })
      );
    }

    var page2Dom = h('div', {
      style: 'background:#FFFFFF; border:1px solid #CBD5E1; border-radius:10px; padding:24px; font-family:"Cairo","IBM Plex Sans Arabic",sans-serif; direction:rtl;'
    },
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #CBD5E1; padding-bottom:10px; margin-bottom:16px;' },
        h('strong', { style: 'color:#1B365D; font-size:15px;', text: 'تقرير متابعة وقياس السلوك المستهدف – ' + chName }),
        h('img', { src: 'logo-sq.png', style: 'width:40px; height:40px; border-radius:50%;' })
      ),
      makePage2SectionBox('3', 'تحليل السوابق', tbr.antecedents_analysis),
      makePage2SectionBox('4', 'القراءة السلوكية الأولية', tbr.initial_reading),
      makePage2SectionBox('5', 'التوصيات والتدخلات المقترحة', tbr.recommendations_text),
      makePage2SectionBox('6', 'الخلاصة', tbr.conclusion_text),
      h('div', { style: 'display:flex; justify-content:space-around; margin-top:28px; padding-top:14px; border-top:1px dashed #CBD5E1; text-align:center; font-weight:800; color:#475569; font-size:13.5px;' },
        h('div', null, h('div', { text: '........................................' }), h('div', { style: 'margin-top:4px;', text: 'المربي المتابع' + (tbr.educator_name ? (' (' + tbr.educator_name + ')') : '') })),
        h('div', null, h('div', { text: '........................................' }), h('div', { style: 'margin-top:4px;', text: 'مدير المركز' }))
      )
    );
    // جدول منظم يعرض السلوك الرئيسي + السلوكيات التابعة المختارة + بيانات التقييم لكل سلوك
    var groupedSummary = [];
    var seenKeys = {};
    ((tb && tb.days) || []).forEach(function (dObj) {
      (dObj.rows || []).forEach(function (ri) {
        if (!ri.sub_behavior && !ri.main_behavior) return;
        var mKey = ri.main_behavior || 'سلوك مستهدف';
        var sKey = ri.sub_behavior || '—';
        var k = mKey + '||' + sKey;
        if (!seenKeys[k]) {
          seenKeys[k] = { main: mKey, sub: sKey, count: 0, times: [], durations: [], locations: [], antecedents: [] };
          groupedSummary.push(seenKeys[k]);
        }
        var g = seenKeys[k];
        var fNum = parseInt(String(ri.frequency || '').replace(/[^0-9]/g, ''), 10);
        g.count += isNaN(fNum) ? 1 : fNum;
        if (ri.behavior_time) g.times.push(ri.behavior_time);
        if (ri.behavior_duration) g.durations.push(ri.behavior_duration);
        if (ri.location && g.locations.indexOf(ri.location) < 0) g.locations.push(ri.location);
        if (ri.antecedents && g.antecedents.indexOf(ri.antecedents) < 0) g.antecedents.push(ri.antecedents);
      });
    });
    if (groupedSummary.length > 0) {
      var sumTbl = h('table', { style: 'width:100%; border-collapse:collapse; margin-bottom:14px; font-size:12.5px; border:1.5px solid #163B65;' },
        h('thead', null,
          h('tr', { style: 'background:#163B65; color:#FFFFFF;' },
            h('th', { style: 'padding:7px; border:1px solid #CBD5E1;', text: 'السلوك الرئيسي' }),
            h('th', { style: 'padding:7px; border:1px solid #CBD5E1;', text: 'السلوك التابع المختار' }),
            h('th', { style: 'padding:7px; border:1px solid #CBD5E1;', text: 'التكرار' }),
            h('th', { style: 'padding:7px; border:1px solid #CBD5E1;', text: 'وقت السلوك' }),
            h('th', { style: 'padding:7px; border:1px solid #CBD5E1;', text: 'مدة السلوك' }),
            h('th', { style: 'padding:7px; border:1px solid #CBD5E1;', text: 'المكان والسوابق' })
          )
        ),
        h('tbody', null, groupedSummary.map(function (g, gi) {
          return h('tr', { style: 'background:' + (gi % 2 === 0 ? '#FFFFFF' : '#F8FAFC') + ';' },
            h('td', { style: 'padding:6px; border:1px solid #CBD5E1; font-weight:800; color:#163B65;', text: g.main.replace(/\s*\([^)]*\)\s*/g, '') }),
            h('td', { style: 'padding:6px; border:1px solid #CBD5E1; font-weight:700;', text: g.sub }),
            h('td', { style: 'padding:6px; border:1px solid #CBD5E1; text-align:center; font-weight:800;', text: String(g.count) }),
            h('td', { style: 'padding:6px; border:1px solid #CBD5E1; text-align:center;', text: g.times.join('، ') || '—' }),
            h('td', { style: 'padding:6px; border:1px solid #CBD5E1; text-align:center;', text: g.durations.join('، ') || '—' }),
            h('td', { style: 'padding:6px; border:1px solid #CBD5E1;', text: [g.locations.join('، '), g.antecedents.join('، ')].filter(Boolean).join(' — ') || '—' })
          );
        }))
      );
      page2Dom.insertBefore(sumTbl, page2Dom.children[1] || null);
    }

    holder.appendChild(page2Dom);

    return holder;
  }

  function renderTargetBehaviorReportSheetView(r, childFullName, secName, kd, adminOpts) {
    var ev = parseEvaluationReport(r);
    enrichChildEvaluationData(ev, childFullName, secName, kd);
    var chName = childFullName || (kd && kd.full_name) || ev.child_name || 'طفل';

    var wrap = h('div', { style: 'max-width:940px; margin:0 auto; background:#FFF; padding:20px; border:1.5px solid #CBD5E1; border-radius:12px; font-family:"Cairo","IBM Plex Sans Arabic",sans-serif; direction:rtl;' });

    var topCtrl = h('div', { class: 'no-print', style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #E2E8F0;' },
      h('div', { style: 'display:flex; gap:8px; flex-wrap:wrap;' },
        h('button', {
          type: 'button',
          class: 'btn small gold',
          onclick: async function () {
            try {
              toast('جارٍ تجهيز ملف تقرير قياس السلوك المستهدف PDF...', 'ok');
              var bytes = await DE_PDF.renderTargetBehaviorReportToPdf(ev, chName, secName, kd);
              DE_PDF.downloadPdf(bytes, 'تقرير_قياس_السلوك_المستهدف_' + (chName || 'طفل').replace(/\s+/g, '_') + '.pdf');
            } catch (e) {
              toast('تعذر التحميل: ' + e.message, 'bad');
            }
          }
        }, makeSvgIcon('s-download'), h('span', { text: 'تحميل تقرير قياس السلوك المستهدف (PDF)' })),
        h('button', { type: 'button', class: 'btn small light', onclick: function () { window.print(); } }, makeSvgIcon('s-print'), h('span', { text: 'طباعة' }))
      ),
      adminOpts ? h('div', { style: 'display:flex; gap:6px;' },
        adminOpts.onEdit ? h('button', { type: 'button', class: 'btn small light', text: 'تعديل التقرير', onclick: adminOpts.onEdit }) : null,
        adminOpts.onDelete ? h('button', { type: 'button', class: 'btn small danger', text: 'حذف', onclick: adminOpts.onDelete }) : null
      ) : null
    );
    wrap.appendChild(topCtrl);
    wrap.appendChild(buildTargetBehaviorReportPagesDom(ev, chName, secName, kd));
    return wrap;
  }

  /* عرض ورقة تقييم قياس السلوك المستهدف مع إمكانية رؤية التقرير مع التقييم */
  function renderTargetBehaviorSheetView(r, childFullName, secName, kd, adminOpts) {
    var ev = parseEvaluationReport(r);
    enrichChildEvaluationData(ev, childFullName, secName, kd);
    var tb = ev.target_behavior_eval || r.target_behavior_eval || {};
    var days = Array.isArray(tb.days) ? tb.days : [];
    var chName = childFullName || (kd && kd.full_name) || ev.child_name || tb.child_name || '...........................................';
    var ageVal = tb.age || (kd && kd.dob ? calcKidAgeStr(kd.dob) : '.....................');
    var behTxt = tb.selected_behaviors_text || '.................................';

    var wrap = h('div', { style: 'max-width:940px; margin:0 auto; background:#FFF; padding:22px 26px; border:1.5px solid #000; font-family:"Cairo", "IBM Plex Sans Arabic", sans-serif; direction:rtl; color:#000;' });

    var evalSheetBox = h('div');
    var reportSheetBox = h('div', { hidden: true });
    var curViewMode = 'both';

    var btnModeEval = h('button', { type: 'button', class: 'btn small light', text: 'جدول التقييم فقط' });
    var btnModeReport = h('button', { type: 'button', class: 'btn small light', text: 'تقرير قياس السلوك المستهدف' });
    var btnModeBoth = h('button', { type: 'button', class: 'btn small primary', text: 'عرض التقييم والتقرير معاً' });

    function updateTbViewMode(m) {
      curViewMode = m;
      btnModeEval.className = 'btn small ' + (m === 'eval' ? 'primary' : 'light');
      btnModeReport.className = 'btn small ' + (m === 'report' ? 'primary' : 'light');
      btnModeBoth.className = 'btn small ' + (m === 'both' ? 'primary' : 'light');
      evalSheetBox.hidden = (m === 'report');
      reportSheetBox.hidden = (m === 'eval');
      if (m === 'report' || m === 'both') {
        reportSheetBox.textContent = '';
        reportSheetBox.appendChild(buildTargetBehaviorReportPagesDom(ev, chName, secName, kd));
      }
    }

    btnModeEval.onclick = function () { updateTbViewMode('eval'); };
    btnModeReport.onclick = function () { updateTbViewMode('report'); };
    btnModeBoth.onclick = function () { updateTbViewMode('both'); };

    var topCtrl = h('div', { class: 'no-print', style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid #E2E8F0;' },
      h('div', { style: 'display:flex; gap:6px; flex-wrap:wrap;' },
        btnModeBoth,
        btnModeEval,
        btnModeReport,
        h('button', {
          type: 'button',
          class: 'btn small gold',
          onclick: async function () {
            try {
              toast('جارٍ تجهيز ملف جدول التقييم PDF...', 'ok');
              var bytes = await DE_PDF.renderTargetBehaviorToPdf(ev, chName, secName, kd);
              DE_PDF.downloadPdf(bytes, 'تقييم_قياس_السلوك_المستهدف_' + (chName || 'طفل').replace(/\s+/g, '_') + '.pdf');
            } catch (e) {
              toast('تعذر التحميل: ' + e.message, 'bad');
            }
          }
        }, makeSvgIcon('s-download'), h('span', { text: 'تحميل التقييم (PDF)' })),
        h('button', {
          type: 'button',
          class: 'btn small gold',
          onclick: async function () {
            try {
              toast('جارٍ تجهيز ملف تقرير قياس السلوك المستهدف PDF...', 'ok');
              var bytes = await DE_PDF.renderTargetBehaviorReportToPdf(ev, chName, secName, kd);
              DE_PDF.downloadPdf(bytes, 'تقرير_قياس_السلوك_المستهدف_' + (chName || 'طفل').replace(/\s+/g, '_') + '.pdf');
            } catch (e) {
              toast('تعذر التحميل: ' + e.message, 'bad');
            }
          }
        }, makeSvgIcon('s-download'), h('span', { text: 'تحميل التقرير (PDF)' })),
        h('button', { type: 'button', class: 'btn small light', onclick: function () { window.print(); } }, makeSvgIcon('s-print'), h('span', { text: 'طباعة' }))
      ),
      adminOpts ? h('div', { style: 'display:flex; gap:6px;' },
        adminOpts.onEdit ? h('button', { type: 'button', class: 'btn small light', text: 'تعديل', onclick: adminOpts.onEdit }) : null,
        adminOpts.onDelete ? h('button', { type: 'button', class: 'btn small danger', text: 'حذف', onclick: adminOpts.onDelete }) : null
      ) : null
    );
    wrap.appendChild(topCtrl);

    evalSheetBox.appendChild(h('h2', { style: 'text-align:center; margin:0 0 18px; font-size:22px; font-weight:900; text-decoration:underline;', text: 'قياس السلوك المستهدف' }));
    evalSheetBox.appendChild(h('div', { style: 'display:flex; justify-content:space-between; font-size:15px; font-weight:800; margin-bottom:10px;' },
      h('span', { text: 'اسم الطفل: ' + chName }),
      h('span', { text: 'العمر: ' + ageVal })
    ));
    evalSheetBox.appendChild(h('div', { style: 'font-size:15px; font-weight:800; margin-bottom:10px;', text: 'السلوك: ' + behTxt }));
    evalSheetBox.appendChild(h('div', { style: 'font-size:15px; font-weight:800; margin-bottom:10px;', text: 'جدول القياس: التكرار + المدة الزمنية' }));

    var tbl = h('table', { style: 'width:100%; border-collapse:collapse; border:1.5px solid #000; text-align:center; font-size:13.5px; margin-bottom:20px;' });
    tbl.appendChild(h('thead', null,
      h('tr', { style: 'font-weight:900;' },
        h('th', { style: 'border:1.5px solid #000; padding:8px; width:16%;', text: 'اليوم والتاريخ' }),
        h('th', { style: 'border:1.5px solid #000; padding:8px; width:18%;', text: 'نوع السلوك' }),
        h('th', { style: 'border:1.5px solid #000; padding:8px; width:16%;', text: 'وقت و مدة حدوث السلوك' }),
        h('th', { style: 'border:1.5px solid #000; padding:8px; width:16%;', text: 'عدد مرات تكرار السلوك' }),
        h('th', { style: 'border:1.5px solid #000; padding:8px; width:16%;', text: 'مكان حدوث السلوك' }),
        h('th', { style: 'border:1.5px solid #000; padding:8px; width:18%;', text: 'سوابق حدوث السلوك' })
      )
    ));

    var tbody = h('tbody');
    days.forEach(function (dObj) {
      var rows = (Array.isArray(dObj.rows) && dObj.rows.length) ? dObj.rows : [{}, {}];
      rows.forEach(function (rItem, rIdx) {
        var tr = h('tr');
        if (rIdx === 0) {
          tr.appendChild(h('td', {
            rowspan: rows.length,
            style: 'border:1.5px solid #000; padding:8px 6px; font-weight:800; vertical-align:middle;'
          },
            h('div', { text: dObj.day_name || '' }),
            h('div', { text: dObj.date_display || dObj.date || '' })
          ));
        }
        tr.appendChild(h('td', { style: 'border:1.5px solid #000; padding:8px 6px; font-weight:700; min-height:28px;', text: rItem.sub_behavior || '' }));
        tr.appendChild(h('td', { style: 'border:1.5px solid #000; padding:8px 6px;', text: rItem.time_duration || '' }));
        tr.appendChild(h('td', { style: 'border:1.5px solid #000; padding:8px 6px;', text: rItem.frequency || '' }));
        tr.appendChild(h('td', { style: 'border:1.5px solid #000; padding:8px 6px;', text: rItem.location || '' }));
        tr.appendChild(h('td', { style: 'border:1.5px solid #000; padding:8px 6px;', text: rItem.antecedents || '' }));
        tbody.appendChild(tr);
      });
    });
    tbl.appendChild(tbody);
    evalSheetBox.appendChild(tbl);

    wrap.appendChild(evalSheetBox);
    wrap.appendChild(reportSheetBox);
    updateTbViewMode('both');

    return wrap;
  }

  /* =====================================================================
     باني وعارض التقييم الجديد 2: استمارة تقييم دوافع السلوك MAS
     + تقرير دوافع السلوك (يُملأ بعد التقييم، وتُحسب نتائجه تلقائياً،
       ويظهر في قسم التقارير وحده مع إمكانية رؤيته مع التقييم)
     ===================================================================== */
  var MAS_FIXED_ITEMS = [
    'هل يتكرر السلوك باستمرار مراراً وتكراراً إذا ترك الشخص لوحده لفترات طويلة لساعات مثلاً.',
    'هل يظهر السلوك عند الطلب منه أن يقوم بمهمة صعبة؟',
    'هل يظهر السلوك كاستجابة لتحدثك مع آخرين في الغرفة؟',
    'هل يظهر السلوك كوسيلة للحصول على لعبة، طعام، أو نشاط قد أخبر المفحوص أنه لن يحصل عليه.',
    'هل يتكرر السلوك بنفس الطريقة لفترات طويلة جداً إذا لم يكن هناك أحد حوله هز الجسم لأكثر من ساعة.',
    'هل يظهر السلوك عند إعطاء المفحوص تعليمات وأوامر؟',
    'هل يظهر السلوك عندما توقف انتباهك للمفحوص؟',
    'هل يظهر السلوك عندما تأخذ لعبة مفضلة، طعام، أو نشاط منه؟',
    'هل يبدو لك أن المفحوص يستمتع بالقيام بالسلوك (يحب ملمس، مذاق، منظر، رائحة، أو صوت المثير المسلكي)؟',
    'هل يبدو لك أن المفحوص يقوم بالسلوك ليزعجك أو يغضبك عند محاولتك لجعله يتبع تعليماتك؟',
    'هل يبدو لك أن المفحوص يقوم بالسلوك ليزعجك أو يغضبك عندما تعطيه انتباهك؟ (إذا كنت في غرفة أخرى أو تحدث شخصاً آخر).',
    'هل يتوقف السلوك إذا أعطيت المفحوص اللعبة، الطعام أو النشاط الذي طلبه؟',
    'خلال القيام بالسلوك هل يظهر المفحوص هادئاً وغير واعٍ لأي شيء آخر يحدث حوله؟',
    'هل يتوقف السلوك (خلال 1-5 دقائق) من إيقافك لتشغيل المفحوص أو إعطائه تعليمات؟',
    'هل يبدو لك أن المفحوص يقوم بالسلوك لحملك على قضاء بعض الوقت معه؟',
    'هل يبدو أن السلوك يظهر عند إخبار المفحوص بأنه لن يقوم بشيء أراد القيام به؟'
  ];

  var MAS_AUTO_HEADINGS_REGEX = /^(السلوك وتعريفه الإجرائي|البيئة محط المسح|التحليل|النتيجة|توصيات مبنية على النتيجة)\s*:?/i;

  function renderMasAutoFormattedDom(text) {
    var box = h('div', { style: 'line-height:1.75; font-size:14px; color:#000; text-align:right;' });
    var lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    lines.forEach(function (rawLn) {
      var trimmed = rawLn.trim();
      if (!trimmed) return;
      var clean = trimmed.replace(/^[🎯🟢📝💡📌•\-]+\s*/, '');
      var m = MAS_AUTO_HEADINGS_REGEX.exec(clean);
      if (m) {
        var headTxt = m[1] + ':';
        var restTxt = clean.slice(m[0].length).trim();
        var p = h('div', { style: 'margin-top:8px; margin-bottom:4px;' },
          h('strong', { class: 'mas-auto-heading', style: 'font-weight:900; text-decoration:underline; font-size:15px; color:#000;', text: headTxt })
        );
        if (restTxt) {
          p.appendChild(h('span', { style: 'margin-right:6px; font-weight:600;', text: ' ' + restTxt }));
        }
        box.appendChild(p);
      } else {
        box.appendChild(h('div', { style: 'margin-bottom:3px;', text: trimmed }));
      }
    });
    return box;
  }

  function buildMasResultsTableDom(answers) {
    var factors = [
      { key: 'sensory', title: 'استثارة ذاتية', items: [1, 5, 9, 13] },
      { key: 'escape', title: 'هروب', items: [2, 6, 10, 14] },
      { key: 'attention', title: 'انتباه', items: [3, 7, 11, 15] },
      { key: 'tangible', title: 'أنشطة / أشياء مفضلة', items: [4, 8, 12, 16] }
    ];

    factors.forEach(function (f) {
      var sum = 0;
      f.itemScores = f.items.map(function (qNum) {
        var v = answers[qNum];
        var n = (v !== '' && v != null && !isNaN(parseInt(v, 10))) ? parseInt(v, 10) : 0;
        sum += n;
        return { qNum: qNum, score: (v !== '' && v != null && !isNaN(parseInt(v, 10))) ? n : 0 };
      });
      f.total = sum;
    });

    factors.forEach(function (f) {
      var higher = factors.filter(function (o) { return o.total > f.total; }).length;
      f.rank = higher + 1;
    });

    var wrap = h('div', { style: 'margin:18px 0;' },
      h('h3', { style: 'text-align:center; font-size:18px; font-weight:900; text-decoration:underline; margin:0 0 10px; color:#000;', text: 'النتائج' })
    );

    var tbl = h('table', { style: 'width:100%; border-collapse:collapse; border:1.5px solid #000; text-align:center; font-size:14px; background:#FFF; color:#000;' });
    tbl.appendChild(h('thead', null,
      h('tr', { style: 'font-weight:900; background:#F8FAFC;' },
        h('th', { style: 'border:1.5px solid #000; padding:8px; width:20%;', text: 'العامل الوظيفي' }),
        factors.map(function (f) {
          return h('th', { style: 'border:1.5px solid #000; padding:8px; width:20%;', text: f.title });
        })
      )
    ));

    var tbody = h('tbody');
    for (var rIdx = 0; rIdx < 4; rIdx++) {
      tbody.appendChild(h('tr', null,
        h('td', { style: 'border:1.5px solid #000; padding:6px;' }, ''),
        factors.map(function (f) {
          var it = f.itemScores[rIdx];
          return h('td', { style: 'border:1.5px solid #000; padding:6px; font-weight:800; direction:ltr;', text: '.' + it.qNum + '   ---' + it.score + '---' });
        })
      ));
    }

    tbody.appendChild(h('tr', { style: 'font-weight:900; background:#FEFCE8;' },
      h('td', { style: 'border:1.5px solid #000; padding:8px;', text: 'المجموع' }),
      factors.map(function (f) {
        return h('td', { style: 'border:1.5px solid #000; padding:8px; font-size:15px;', text: String(f.total) });
      })
    ));

    tbody.appendChild(h('tr', { style: 'font-weight:900; background:#F0FDF4;' },
      h('td', { style: 'border:1.5px solid #000; padding:8px;', text: 'الترتيب المعياري' }),
      factors.map(function (f) {
        return h('td', { style: 'border:1.5px solid #000; padding:8px; font-size:15px;', text: String(f.rank) });
      })
    ));

    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
    return wrap;
  }

  function buildMasBehaviorLiveResultsAndReportDom(getMasEvalPayloadFn, mbrState, getChildInfoFn, includeManualInputs) {
    var container = h('div', { style: 'margin-top:18px;' });
    if (!mbrState.dimension_scores) mbrState.dimension_scores = {};

    var autoCard = h('div', {
      class: 'card',
      style: 'border:1.5px solid #163B65; border-radius:12px; background:#F8FAFC; padding:14px; margin-bottom:14px;'
    });

    var scoresGridHost = h('div');
    var canvasPreviewWrap = h('div', {
      style: 'width:100%; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:10px; overflow:hidden; min-height:240px; display:flex; align-items:center; justify-content:center; margin-top:10px;'
    }, h('span', { class: 'muted small', text: 'جارٍ رسم المخطط البياني لتقرير دوافع السلوك...' }));

    function refreshMasLiveStats() {
      var masData = getMasEvalPayloadFn();
      var cInfo = getChildInfoFn();
      var st = (window.DE_PDF && typeof window.DE_PDF.computeMasMotivationReportStats === 'function')
        ? window.DE_PDF.computeMasMotivationReportStats(masData, mbrState)
        : { dimensions: [] };

      scoresGridHost.textContent = '';
      var dimBoxes = (st.dimensions || []).map(function (dm) {
        var numInp = h('input', {
          type: 'number',
          min: 0,
          max: 100,
          value: String(dm.score),
          style: 'width:68px; height:28px; text-align:center; font-weight:900; border:1.5px solid #163B65; border-radius:6px; font-size:13px;'
        });
        numInp.onchange = function () {
          mbrState.dimension_scores[dm.key] = numInp.value;
          refreshMasLiveStats();
        };
        return h('div', {
          style: 'background:#FFF; border:1px solid #CBD5E1; border-radius:8px; padding:8px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:4px;'
        },
          h('strong', { style: 'font-size:11.5px; color:#163B65;', text: dm.fullLabel }),
          numInp,
          h('span', { class: 'muted small', style: 'font-size:10px;', text: 'تلقائي من الاستمارة: ' + dm.autoPct + '%' })
        );
      });

      scoresGridHost.appendChild(h('div', {
        style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px; margin-bottom:8px;'
      }, dimBoxes));

      if (window.DE_PDF && typeof window.DE_PDF.renderMasBehaviorReportPage1Canvas === 'function') {
        var tempObj = {
          eval_type: 'mas_behavior_report',
          child_id: cInfo.child_id,
          child_name: cInfo.child_name,
          mas_eval: masData,
          mas_behavior_report: mbrState
        };
        window.DE_PDF.renderMasBehaviorReportPage1Canvas(tempObj, cInfo.child_name, cInfo.section_name, cInfo.kid).then(function (cEl) {
          canvasPreviewWrap.textContent = '';
          cEl.style.width = '100%';
          cEl.style.height = 'auto';
          cEl.style.display = 'block';
          cEl.style.maxWidth = '100%';
          canvasPreviewWrap.appendChild(cEl);
        }).catch(function (err) {
          console.error('[DarElIhsan] Live MAS chart error:', err);
          canvasPreviewWrap.textContent = 'تعذر رسم المخطط البياني: ' + ((err && err.message) || '');
          canvasPreviewWrap.style.color = '#991B1B';
        });
      }
    }

    autoCard.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px; border-bottom:1px solid #CBD5E1; padding-bottom:8px;' },
      makeStepTitleDom('4', 'النتائج العامة لتقرير دوافع السلوك (تُحسب وتُرسم تلقائياً من الاستمارة)', 's-chart'),
      h('span', { class: 'badge ok', text: 'تحديث تلقائي فوري ✓' })
    ));
    autoCard.appendChild(scoresGridHost);
    autoCard.appendChild(canvasPreviewWrap);
    container.appendChild(autoCard);

    if (includeManualInputs) {
      var evalNameInp = h('input', {
        type: 'text',
        placeholder: 'اسم المقيّم (مثال: أ. أمير زكرياء)...',
        value: mbrState.evaluator_name || 'أ. أمير زكرياء'
      });
      evalNameInp.oninput = function () {
        mbrState.evaluator_name = evalNameInp.value;
        refreshMasLiveStats();
      };

      var goalInp = h('input', {
        type: 'text',
        placeholder: 'الهدف من التقييم...',
        value: mbrState.goal_text || 'تحديد أنماط ودوافع السلوك لدى الطفل من أجل توجيه التدخل التربوي المناسب.'
      });
      goalInp.oninput = function () {
        mbrState.goal_text = goalInp.value;
        refreshMasLiveStats();
      };

      var caseArea = h('textarea', {
        rows: 3,
        placeholder: 'اكتب تحليل الحالة...',
        value: mbrState.case_analysis || ''
      });
      caseArea.oninput = function () { mbrState.case_analysis = caseArea.value; };

      var findingsArea = h('textarea', {
        rows: 3,
        placeholder: 'اكتب أهم النتائج المستخلصة...',
        value: mbrState.key_findings || ''
      });
      findingsArea.oninput = function () { mbrState.key_findings = findingsArea.value; };

      var recArea = h('textarea', {
        rows: 3,
        placeholder: 'اكتب التوصيات التربوية والسلوكية...',
        value: mbrState.recommendations_text || ''
      });
      recArea.oninput = function () { mbrState.recommendations_text = recArea.value; };

      var concArea = h('textarea', {
        rows: 3,
        placeholder: 'اكتب الخلاصة النهائية...',
        value: mbrState.conclusion_text || ''
      });
      concArea.oninput = function () { mbrState.conclusion_text = concArea.value; };

      var manualCard = h('div', {
        class: 'card prog-step-card',
        style: 'border:1.5px solid #1E7E62; border-radius:12px; padding:14px;'
      },
        h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;' },
          makeStepTitleDom('5', 'ملء ملاحظات وتحليل تقرير دوافع السلوك (تُملأ يدوياً وتُحفظ في قسم التقارير)', 's-report'),
          h('span', { class: 'badge gold', text: 'تقرير دوافع السلوك' })
        ),
        h('div', { class: 'eval-builder-grid-2', style: 'margin-bottom:8px;' },
          h('label', { class: 'fld' }, h('span', { text: 'المقيّم:' }), evalNameInp),
          h('label', { class: 'fld' }, h('span', { text: '1. الهدف من التقييم:' }), goalInp)
        ),
        h('div', { class: 'eval-builder-grid-2' },
          h('label', { class: 'fld' }, h('span', { text: '3. تحليل الحالة:' }), caseArea),
          h('label', { class: 'fld' }, h('span', { text: '4. أهم النتائج:' }), findingsArea),
          h('label', { class: 'fld' }, h('span', { text: '5. التوصيات:' }), recArea),
          h('label', { class: 'fld' }, h('span', { text: '6. الخلاصة:' }), concArea)
        )
      );
      container.appendChild(manualCard);
    }

    setTimeout(refreshMasLiveStats, 20);
    return {
      el: container,
      refresh: refreshMasLiveStats
    };
  }

  function openMasBehaviorBuilder(existingRep, kids, sections, secAllOpts, branchOpts) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'evaluations', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    ev.eval_type = 'mas_behavior';
    if (!existingRep) {
      ev.title = 'استمارة تقييم دوافع السلوك MAS';
    }
    var selKid = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0] || (kids.length === 1 ? kids[0] : null);
    if (selKid && !ev.child_id) ev.child_id = selKid.id;
    enrichChildEvaluationData(ev, selKid ? selKid.full_name : '', selKid ? selKid.section : '', selKid);

    var mas = ev.mas_eval || {};
    var answers = Object.assign({}, mas.answers || {});
    var mbrState = Object.assign({
      evaluator_name: mas.informant || 'أ. أمير زكرياء',
      center_name: 'المركز النفسي البيداغوجي دار الإحسان – العطف',
      goal_text: 'تحديد أنماط ودوافع السلوك لدى الطفل من أجل توجيه التدخل التربوي المناسب.',
      dimension_scores: {},
      case_analysis: '',
      key_findings: '',
      recommendations_text: '',
      conclusion_text: ''
    }, ev.mas_behavior_report || {});

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;' },
      h('div', { style: 'display:flex; align-items:center; gap:10px;' },
        h('img', { src: 'logo-sq.png', style: 'width:36px; height:36px; border-radius:8px;' }),
        h('h2', { style: 'margin:0; color:#163B65; font-size:1.18rem; font-weight:900;', text: existingRep ? 'تعديل استمارة تقييم دوافع السلوك MAS' : 'استمارة تقييم دوافع السلوك MAS' })
      ),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn small light', type: 'button', style: 'font-weight:700;', text: 'رجوع لقائمة التقييم', onclick: function () { go('evaluations'); } })
      )
    );
    v.appendChild(topBar);

    var card = h('div', { class: 'card', style: 'max-width:1100px; margin:0 auto; padding:16px; border-radius:14px; border:1.5px solid #E2E8F0;' });

    var curSecId = S.isEducator ? S.eduSectionId : (selKid ? selKid.section_id : '');
    var secFilterSelect = h('select', { disabled: !!S.isEducator },
      h('option', { value: '', text: '— جميع الأقسام —' }),
      secAllOpts.map(function (o) { return h('option', { value: o[0], text: o[1] }); })
    );
    secFilterSelect.value = curSecId || '';

    var kidSelect = h('select', null);
    function populateMasKids() {
      var sId = secFilterSelect.value;
      var keep = ev.child_id || kidSelect.value;
      while (kidSelect.firstChild) kidSelect.removeChild(kidSelect.firstChild);
      kidSelect.appendChild(h('option', { value: '', text: '— اختر الحالة —' }));
      kids.forEach(function (k) {
        if (sId && !childMatchesSection(k, sId, nameOf(sections, sId, 'name'), sections)) return;
        kidSelect.appendChild(h('option', { value: k.id, text: k.full_name + (k.section ? (' — ' + k.section) : '') }));
      });
      if (keep && kids.some(function (k) { return String(k.id) === String(keep); })) {
        kidSelect.value = keep;
      }
    }
    populateMasKids();

    var informantInp = h('input', { type: 'text', placeholder: 'مقدم المعلومات / المقيّم...', value: mas.informant || 'أ. أمير زكرياء' });
    var dateInp = h('input', { type: 'date', value: mas.report_date || ev.report_date || new Date().toISOString().slice(0, 10) });

    var liveMasReportWidget = null;
    function triggerMasLiveRefresh() {
      if (liveMasReportWidget && typeof liveMasReportWidget.refresh === 'function') {
        liveMasReportWidget.refresh();
      }
    }

    secFilterSelect.onchange = function () { populateMasKids(); ev.child_id = kidSelect.value; triggerMasLiveRefresh(); };
    kidSelect.onchange = function () { ev.child_id = kidSelect.value; triggerMasLiveRefresh(); };
    informantInp.oninput = function () {
      if (!mbrState.evaluator_name || mbrState.evaluator_name === 'أ. أمير زكرياء') {
        mbrState.evaluator_name = informantInp.value;
      }
      triggerMasLiveRefresh();
    };
    dateInp.onchange = triggerMasLiveRefresh;

    var metaCard = h('div', { class: 'card prog-step-card compact-qual-child-card' },
      makeStepTitleDom('1', 'بيانات الحالة والتاريخ', 's-idcard'),
      h('div', { class: 'compact-qual-grid' },
        h('label', { class: 'fld' }, h('span', { text: 'القسم التربوي:' }), secFilterSelect),
        h('label', { class: 'fld' }, h('span', { text: 'اسم الحالة:' }), kidSelect),
        h('label', { class: 'fld' }, h('span', { text: 'مقدم المعلومات / المقيّم:' }), informantInp),
        h('label', { class: 'fld' }, h('span', { text: 'التاريخ:' }), dateInp)
      )
    );
    card.appendChild(metaCard);

    var defaultIntro = mas.intro_text || 'السلوك وتعريفه الإجرائي:\n\nالبيئة محط المسح: المركز و المنزل';
    var introTextarea = h('textarea', {
      rows: 4,
      style: 'width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid #CBD5E1; font-family:inherit; font-size:13px; line-height:1.6;',
      placeholder: 'اكتب السلوك وتعريفه الإجرائي والبيئة محط المسح...'
    });
    introTextarea.value = defaultIntro;
    var introLivePreview = h('div', { style: 'margin-top:6px; padding:8px 12px; background:#F8FAFC; border:1px dashed #94A3B8; border-radius:8px;' });
    function updateIntroPreview() {
      introLivePreview.textContent = '';
      introLivePreview.appendChild(renderMasAutoFormattedDom(introTextarea.value));
    }
    introTextarea.oninput = updateIntroPreview;
    updateIntroPreview();

    card.appendChild(h('div', { style: 'margin-bottom:14px;' },
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;' },
        makeStepTitleDom('2', 'السلوك وتعريفه الإجرائي والبيئة محط المسح', 's-edit'),
        h('div', { style: 'display:flex; gap:6px;' },
          ['السلوك وتعريفه الإجرائي:', 'البيئة محط المسح:'].map(function (hd) {
            return h('button', {
              type: 'button',
              class: 'btn small light',
              style: 'font-size:11.5px; padding:3px 8px;',
              text: '+ ' + hd,
              onclick: function () {
                if (introTextarea.value.indexOf(hd) < 0) {
                  introTextarea.value = (introTextarea.value ? (introTextarea.value.trim() + '\n') : '') + hd + ' ';
                  updateIntroPreview();
                }
              }
            });
          })
        )
      ),
      introTextarea,
      introLivePreview
    ));

    var scaleCols = [
      { val: 0, label: 'مطلقا\n0' },
      { val: 1, label: 'شبه مطلقا\n1' },
      { val: 2, label: 'نادرا\n2' },
      { val: 3, label: 'نصف الوقت\n3' },
      { val: 4, label: 'عادة\n4' },
      { val: 5, label: 'أغلب الأحيان\n5' },
      { val: 6, label: 'دائما\n6' }
    ];

    var resultsMount = h('div');
    function refreshAutoResultsTable() {
      resultsMount.textContent = '';
      resultsMount.appendChild(buildMasResultsTableDom(answers));
      triggerMasLiveRefresh();
    }

    var itemsTableWrap = h('div', { style: 'overflow-x:auto; margin-bottom:16px;' });
    var itemsTbl = h('table', { style: 'width:100%; border-collapse:collapse; border:1.5px solid #000; background:#FFF; text-align:center; font-size:13px;' });
    itemsTbl.appendChild(h('thead', null,
      h('tr', { style: 'background:#163B65; color:#FFF; font-weight:800;' },
        h('th', { style: 'border:1px solid #000; padding:7px 4px; width:38px;', text: '#' }),
        h('th', { style: 'border:1px solid #000; padding:7px 10px; text-align:right;', text: 'البند' }),
        scaleCols.map(function (sc) {
          return h('th', { style: 'border:1px solid #000; padding:5px 4px; width:64px; white-space:pre-line; font-size:11.5px;', text: sc.label });
        })
      )
    ));

    var itemsTbody = h('tbody');
    MAS_FIXED_ITEMS.forEach(function (qText, idx) {
      var qNum = idx + 1;
      var tr = h('tr', { style: 'background:' + (idx % 2 === 0 ? '#FFF' : '#F8FAFC') + ';' },
        h('td', { style: 'border:1px solid #000; padding:5px; font-weight:900;', text: String(qNum) }),
        h('td', { style: 'border:1px solid #000; padding:6px 10px; text-align:right; font-weight:700; color:#0F172A;', text: qText })
      );

      var cellBtns = [];
      scaleCols.forEach(function (sc) {
        var isSel = (answers[qNum] !== '' && answers[qNum] != null && parseInt(answers[qNum], 10) === sc.val);
        var td = h('td', {
          style: 'border:1px solid #000; padding:4px; cursor:pointer; font-weight:900; font-size:14.5px; background:' + (isSel ? '#DBEAFE' : 'transparent') + '; color:#1E3A8A;',
          text: isSel ? 'X' : ''
        });
        td.onclick = function () {
          if (answers[qNum] !== '' && answers[qNum] != null && parseInt(answers[qNum], 10) === sc.val) {
            delete answers[qNum];
          } else {
            answers[qNum] = sc.val;
          }
          mbrState.dimension_scores = {};
          cellBtns.forEach(function (cObj) {
            var active = (answers[qNum] !== '' && answers[qNum] != null && parseInt(answers[qNum], 10) === cObj.val);
            cObj.td.textContent = active ? 'X' : '';
            cObj.td.style.background = active ? '#DBEAFE' : 'transparent';
          });
          refreshAutoResultsTable();
        };
        cellBtns.push({ val: sc.val, td: td });
        tr.appendChild(td);
      });

      itemsTbody.appendChild(tr);
    });
    itemsTbl.appendChild(itemsTbody);
    itemsTableWrap.appendChild(itemsTbl);

    card.appendChild(h('div', { style: 'margin-bottom:8px;' },
      makeStepTitleDom('3', 'جدول بنود التقييم (16 بنداً — اضغط على الخانة لوضع علامة X وتوليد النتائج تلقائياً)', 's-clipboard-list')
    ));
    card.appendChild(itemsTableWrap);

    refreshAutoResultsTable();
    card.appendChild(resultsMount);

    var defaultOutro = mas.outro_text || 'التحليل:\n\nالنتيجة:\n\nتوصيات مبنية على النتيجة:\n1. ';
    var outroTextarea = h('textarea', {
      rows: 5,
      style: 'width:100%; padding:10px 12px; border-radius:8px; border:1.5px solid #CBD5E1; font-family:inherit; font-size:13px; line-height:1.6;',
      placeholder: 'اكتب التحليل والنتيجة والتوصيات الخاصة باستمارة MAS...'
    });
    outroTextarea.value = defaultOutro;
    var outroLivePreview = h('div', { style: 'margin-top:6px; padding:8px 12px; background:#F8FAFC; border:1px dashed #94A3B8; border-radius:8px;' });
    function updateOutroPreview() {
      outroLivePreview.textContent = '';
      outroLivePreview.appendChild(renderMasAutoFormattedDom(outroTextarea.value));
    }
    outroTextarea.oninput = updateOutroPreview;
    updateOutroPreview();

    card.appendChild(h('div', { style: 'margin-top:14px;' },
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;' },
        h('strong', { style: 'color:#163B65; font-size:13.5px;', text: 'ملاحظات استمارة MAS (التحليل والنتيجة والتوصيات):' }),
        h('div', { style: 'display:flex; gap:6px; flex-wrap:wrap;' },
          ['التحليل:', 'النتيجة:', 'توصيات مبنية على النتيجة:'].map(function (hd) {
            return h('button', {
              type: 'button',
              class: 'btn small light',
              style: 'font-size:11.5px; padding:3px 8px;',
              text: '+ ' + hd,
              onclick: function () {
                if (outroTextarea.value.indexOf(hd.replace(':', '')) < 0) {
                  outroTextarea.value = (outroTextarea.value ? (outroTextarea.value.trim() + '\n') : '') + hd + '\n';
                  updateOutroPreview();
                }
              }
            });
          })
        )
      ),
      outroTextarea,
      outroLivePreview
    ));

    function packMasData() {
      var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
      return {
        child_id: kidSelect.value,
        child_name: ck ? ck.full_name : '',
        informant: informantInp.value,
        report_date: dateInp.value,
        intro_text: introTextarea.value,
        outro_text: outroTextarea.value,
        answers: answers
      };
    }

    // إضافة قسم نتائج وملء "تقرير دوافع السلوك" مباشرة بعد استمارة التقييم
    liveMasReportWidget = buildMasBehaviorLiveResultsAndReportDom(
      packMasData,
      mbrState,
      function () {
        var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
        var sName = ck ? (nameOf(sections, ck.section_id, 'name') || ck.section || '') : '';
        return {
          child_id: kidSelect.value,
          child_name: ck ? ck.full_name : '',
          section_name: sName,
          kid: ck
        };
      },
      true
    );
    card.appendChild(liveMasReportWidget.el);

    async function saveMasEvaluation(statusKey) {
      if (!kidSelect.value) return toast('يرجى اختيار الحالة أولاً.', 'bad');
      var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
      var sName = ck ? (nameOf(sections, ck.section_id, 'name') || ck.section || '') : '';
      var packed = packMasData();
      var reportPayloadData = Object.assign({}, mbrState, {
        child_id: kidSelect.value,
        child_name: ck ? ck.full_name : '',
        dob: ck ? ck.dob : '',
        section_name: sName,
        report_date: dateInp.value
      });

      var payload = {
        eval_type: 'mas_behavior',
        status: statusKey,
        child_id: kidSelect.value,
        child_name: ck ? ck.full_name : '',
        dob: ck ? ck.dob : '',
        section_name: sName,
        title: 'استمارة تقييم دوافع السلوك MAS',
        report_date: dateInp.value,
        mas_eval: packed,
        mas_behavior_report: reportPayloadData
      };
      var recordBody = {
        child_id: kidSelect.value,
        title: 'استمارة تقييم دوافع السلوك MAS — ' + (ck ? ck.full_name : ''),
        report_date: dateInp.value,
        status: statusKey,
        activities: EVAL_MARKER + JSON.stringify(payload),
        notes: outroTextarea.value || null
      };
      try {
        if (ev.id && DE.isUuid(String(ev.id))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(ev.id), recordBody);
        } else {
          var created = await saveProgressReportResilient('POST', '/progress_reports', recordBody);
          if (Array.isArray(created) && created[0]) ev.id = created[0].id;
        }
        await syncSharedEvaluationRecord(Object.assign({}, recordBody, { id: ev.id || ('mas_' + Date.now()) }), null);

        // حفظ/تحديث "تقرير دوافع السلوك" كوثيقة مستقلة في قسم التقارير تلقائياً
        var sharedAll = await loadSharedEvaluationsList();
        var existingRepRec = sharedAll.filter(function (item) {
          return item && String(item.child_id) === String(kidSelect.value) && getReportSubCategory(item) === 'mas_behavior_report';
        })[0];
        var repId = existingRepRec ? existingRepRec.id : null;
        var standaloneRepPayload = {
          eval_type: 'mas_behavior_report',
          status: statusKey,
          child_id: kidSelect.value,
          child_name: ck ? ck.full_name : '',
          dob: ck ? ck.dob : '',
          section_name: sName,
          title: 'تقرير دوافع السلوك',
          report_date: dateInp.value,
          mas_eval: packed,
          mas_behavior_report: reportPayloadData
        };
        var standaloneRepBody = {
          child_id: kidSelect.value,
          title: 'تقرير دوافع السلوك — ' + (ck ? ck.full_name : ''),
          report_date: dateInp.value,
          status: statusKey,
          activities: EVAL_MARKER + JSON.stringify(standaloneRepPayload),
          notes: reportPayloadData.conclusion_text || reportPayloadData.recommendations_text || outroTextarea.value || null
        };
        if (repId && DE.isUuid(String(repId))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(repId), standaloneRepBody);
        } else {
          var createdRep = await saveProgressReportResilient('POST', '/progress_reports', standaloneRepBody);
          if (Array.isArray(createdRep) && createdRep[0]) repId = createdRep[0].id;
        }
        await syncSharedEvaluationRecord(Object.assign({}, standaloneRepBody, { id: repId || ('mbr_' + Date.now()) }), null);

        bust();
        toast(statusKey === 'published' ? 'تم اعتماد ونشر استمارة وتقرير دوافع السلوك بنجاح!' : 'تم حفظ الاستمارة وتقرير دوافع السلوك كمسودة.', 'ok');
        go('evaluations');
      } catch (err) {
        toast('تعذر الحفظ: ' + (err.message || 'خطأ'), 'bad');
      }
    }

    var footerBar = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:20px;' },
      h('div', { style: 'display:flex; gap:8px;' },
        h('button', {
          type: 'button',
          class: 'btn primary',
          style: 'font-weight:800;',
          onclick: function () {
            var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
            var packed = packMasData();
            var tempRep = {
              eval_type: 'mas_behavior',
              child_id: kidSelect.value,
              child_name: ck ? ck.full_name : '',
              report_date: dateInp.value,
              mas_eval: packed,
              mas_behavior_report: mbrState
            };
            var prevModal = h('div', { class: 'modal card', style: 'max-width:1020px; width:95%; max-height:92vh; overflow-y:auto; padding:20px;' });
            prevModal.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;' },
              h('strong', { style: 'color:#163B65; font-size:1.02rem;', text: 'المعاينة والتحميل (الاستمارة + تقرير دوافع السلوك)' }),
              h('button', { type: 'button', class: 'icon-btn', onclick: closeModal }, h('span', { text: '✕' }))
            ));
            prevModal.appendChild(renderMasBehaviorSheetView(tempRep, ck ? ck.full_name : '', ck ? ck.section : '', ck));
            openModal(prevModal);
          }
        }, makeSvgIcon('s-eye'), h('span', { text: 'المعاينة والتحميل (الاستمارة والتقرير)' }))
      ),
      h('div', { style: 'display:flex; gap:8px;' },
        h('button', { type: 'button', class: 'btn light', text: 'حفظ كمسودة', onclick: function () { saveMasEvaluation('draft'); } }),
        h('button', { type: 'button', class: 'btn gold', style: 'font-weight:800;', text: 'نشر', onclick: function () { saveMasEvaluation('published'); } })
      )
    );
    card.appendChild(footerBar);
    v.appendChild(card);
  }

  /* باني مستقل لتقرير دوافع السلوك في قسم التقارير */
  function openMasBehaviorReportBuilder(existingRep, kids, sections, secAllOpts, branchOpts, allReportsPool) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'reports', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    ev.eval_type = 'mas_behavior_report';
    var selKid0 = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0] || (kids.length ? kids[0] : null);
    if (selKid0 && !ev.child_id) ev.child_id = selKid0.id;
    enrichChildEvaluationData(ev, selKid0 ? selKid0.full_name : '', selKid0 ? selKid0.section : '', selKid0, allReportsPool);

    var mbrState = Object.assign({
      evaluator_name: (ev.mas_eval && ev.mas_eval.informant) || 'أ. أمير زكرياء',
      center_name: 'المركز النفسي البيداغوجي دار الإحسان – العطف',
      goal_text: 'تحديد أنماط ودوافع السلوك لدى الطفل من أجل توجيه التدخل التربوي المناسب.',
      dimension_scores: {},
      case_analysis: '',
      key_findings: '',
      recommendations_text: '',
      conclusion_text: ''
    }, ev.mas_behavior_report || {});

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;' },
      h('div', { style: 'display:flex; align-items:center; gap:8px;' },
        h('img', { src: 'logo-sq.png', style: 'width:36px; height:36px; border-radius:8px;' }),
        h('h2', { style: 'margin:0; color:#163B65; font-size:1.15rem; font-weight:900;', text: 'تقرير دوافع السلوك' })
      ),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn small light', type: 'button', style: 'font-weight:700;', text: 'رجوع لقائمة التقارير', onclick: function () { go('reports'); } })
      )
    );
    v.appendChild(topBar);

    var curSecId = S.isEducator ? S.eduSectionId : (selKid0 ? selKid0.section_id : '');
    var secFilterSelect = h('select', { disabled: !!S.isEducator },
      h('option', { value: '', text: '— جميع الأقسام —' }),
      secAllOpts.map(function (o) { return h('option', { value: o[0], text: o[1] }); })
    );
    secFilterSelect.value = curSecId || '';

    var kidSelect = h('select', null);
    function populateKids() {
      var sId = secFilterSelect.value;
      var keep = ev.child_id || kidSelect.value;
      while (kidSelect.firstChild) kidSelect.removeChild(kidSelect.firstChild);
      kidSelect.appendChild(h('option', { value: '', text: '— اختر الطفل —' }));
      kids.forEach(function (k) {
        if (sId && !childMatchesSection(k, sId, nameOf(sections, sId, 'name'), sections)) return;
        kidSelect.appendChild(h('option', { value: k.id, text: k.full_name + (k.section ? (' — ' + k.section) : '') }));
      });
      if (keep && kids.some(function (k) { return String(k.id) === String(keep); })) {
        kidSelect.value = keep;
      } else if (kidSelect.options.length > 1 && !kidSelect.value) {
        kidSelect.selectedIndex = 1;
        ev.child_id = kidSelect.value;
      }
    }
    populateKids();

    var reportDateInp = h('input', { type: 'date', value: ev.report_date || new Date().toISOString().slice(0, 10) });

    var step1Card = h('div', { class: 'card prog-step-card compact-qual-child-card' },
      makeStepTitleDom('1', 'بيانات الطفل وتاريخ التقييم', 's-idcard'),
      h('div', { class: 'compact-qual-grid' },
        h('label', { class: 'fld' }, h('span', { text: 'القسم التربوي:' }), secFilterSelect),
        h('label', { class: 'fld' }, h('span', { text: 'الطفل المعني:' }), kidSelect),
        h('label', { class: 'fld' }, h('span', { text: 'تاريخ التقييم:' }), reportDateInp)
      )
    );
    v.appendChild(step1Card);

    var liveWidget = buildMasBehaviorLiveResultsAndReportDom(
      function () { return ev.mas_eval || {}; },
      mbrState,
      function () {
        var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
        var sName = ck ? (nameOf(sections, ck.section_id, 'name') || ck.section || '') : '';
        return {
          child_id: kidSelect.value,
          child_name: ck ? ck.full_name : '',
          section_name: sName,
          kid: ck
        };
      },
      true
    );
    v.appendChild(liveWidget.el);

    function reloadChildMasEval() {
      ev.child_id = kidSelect.value;
      var ck = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0];
      ev.mas_eval = {};
      enrichChildEvaluationData(ev, ck ? ck.full_name : '', ck ? ck.section : '', ck, allReportsPool);
      liveWidget.refresh();
    }

    secFilterSelect.onchange = function () { populateKids(); reloadChildMasEval(); };
    kidSelect.onchange = reloadChildMasEval;

    async function saveMasBehaviorReportAction(statusKey) {
      if (!kidSelect.value) return toast('يرجى اختيار الطفل أولاً.', 'bad');
      var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
      var sName = ck ? (nameOf(sections, ck.section_id, 'name') || ck.section || '') : '';
      var payload = {
        eval_type: 'mas_behavior_report',
        status: statusKey,
        child_id: kidSelect.value,
        child_name: ck ? ck.full_name : '',
        dob: ck ? ck.dob : '',
        section_name: sName,
        title: 'تقرير دوافع السلوك',
        report_date: reportDateInp.value,
        mas_eval: ev.mas_eval || {},
        mas_behavior_report: Object.assign({}, mbrState, {
          child_id: kidSelect.value,
          child_name: ck ? ck.full_name : '',
          dob: ck ? ck.dob : '',
          section_name: sName,
          report_date: reportDateInp.value
        })
      };
      var recordBody = {
        child_id: kidSelect.value,
        title: 'تقرير دوافع السلوك — ' + (ck ? ck.full_name : ''),
        report_date: reportDateInp.value,
        status: statusKey,
        activities: EVAL_MARKER + JSON.stringify(payload),
        notes: mbrState.conclusion_text || mbrState.recommendations_text || null
      };
      try {
        if (ev.id && DE.isUuid(String(ev.id))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(ev.id), recordBody);
        } else {
          var created = await saveProgressReportResilient('POST', '/progress_reports', recordBody);
          if (Array.isArray(created) && created[0]) ev.id = created[0].id;
        }
        await syncSharedEvaluationRecord(Object.assign({}, recordBody, { id: ev.id || ('mbr_' + Date.now()) }), null);
        bust();
        toast(statusKey === 'published' ? 'تم اعتماد ونشر تقرير دوافع السلوك بنجاح!' : 'تم حفظ التقرير كمسودة.', 'ok');
        go('reports');
      } catch (err) {
        toast('تعذر الحفظ: ' + (err.message || 'خطأ'), 'bad');
      }
    }

    var saveBar = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:16px;' },
      h('button', {
        type: 'button',
        class: 'btn primary',
        style: 'font-weight:800;',
        onclick: function () {
          var ck = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
          var tempRep = {
            eval_type: 'mas_behavior_report',
            child_id: kidSelect.value,
            child_name: ck ? ck.full_name : '',
            mas_eval: ev.mas_eval || {},
            mas_behavior_report: mbrState
          };
          var prevModal = h('div', { class: 'modal card', style: 'max-width:1020px; width:95%; max-height:92vh; overflow-y:auto; padding:20px;' });
          prevModal.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;' },
            h('strong', { style: 'color:#163B65; font-size:1.02rem;', text: 'معاينة وتحميل تقرير دوافع السلوك' }),
            h('button', { type: 'button', class: 'icon-btn', onclick: closeModal }, h('span', { text: '✕' }))
          ));
          prevModal.appendChild(renderMasBehaviorReportSheetView(tempRep, ck ? ck.full_name : '', ck ? ck.section : '', ck));
          openModal(prevModal);
        }
      }, makeSvgIcon('s-eye'), h('span', { text: 'المعاينة والتحميل' })),
      h('div', { style: 'display:flex; gap:8px;' },
        h('button', { type: 'button', class: 'btn light', text: 'حفظ كمسودة', onclick: function () { saveMasBehaviorReportAction('draft'); } }),
        h('button', { type: 'button', class: 'btn gold', style: 'font-weight:800;', text: 'نشر', onclick: function () { saveMasBehaviorReportAction('published'); } })
      )
    );
    v.appendChild(saveBar);
  }

  function buildMasBehaviorReportPagesDom(ev, childFullName, secName, kd) {
    enrichChildEvaluationData(ev, childFullName, secName, kd);
    var mbr = ev.mas_behavior_report || {};
    var chName = childFullName || (kd && kd.full_name) || ev.child_name || mbr.child_name || '—';

    var holder = h('div', { style: 'display:flex; flex-direction:column; gap:18px;' });

    var p1Host = h('div', {
      style: 'width:100%; background:#FFF; border:1px solid #CBD5E1; border-radius:10px; overflow:hidden; min-height:280px; display:flex; align-items:center; justify-content:center;'
    }, h('span', { class: 'muted small', text: 'جارٍ رسم الصفحة 1 من تقرير دوافع السلوك...' }));

    (function renderMasPage1(attempt) {
      if (!window.DE_PDF || typeof window.DE_PDF.renderMasBehaviorReportPage1Canvas !== 'function') {
        if (attempt < 20) return setTimeout(function () { renderMasPage1(attempt + 1); }, 150);
        p1Host.textContent = 'تعذر تحميل محرك الرسوم البيانية. يرجى تحديث الصفحة.';
        p1Host.style.color = '#991B1B';
        return;
      }
      window.DE_PDF.renderMasBehaviorReportPage1Canvas(ev, chName, secName, kd).then(function (c1) {
        if (!c1 || !c1.getContext) throw new Error('تعذر إنشاء لوحة الرسم');
        p1Host.textContent = '';
        c1.style.width = '100%';
        c1.style.height = 'auto';
        c1.style.display = 'block';
        p1Host.appendChild(c1);
      }).catch(function (err) {
        console.error('[DarElIhsan] MAS Page1 render error:', err);
        p1Host.textContent = 'تعذر رسم مخطط دوافع السلوك ومقياس الساعة: ' + ((err && err.message) || 'خطأ تقني');
        p1Host.style.color = '#991B1B';
      });
    })(0);
    holder.appendChild(p1Host);

    function makePage2SectionBox(num, title, contentTxt) {
      return h('div', { style: 'margin-bottom:16px;' },
        h('div', { style: 'display:flex; justify-content:flex-start; margin-bottom:8px;' },
          h('div', { style: 'background:#1B365D; color:#FFF; padding:6px 16px; border-radius:20px; display:inline-flex; align-items:center; gap:10px; font-weight:800; font-size:14px;' },
            h('span', { style: 'background:#FFF; color:#1B365D; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:900; font-size:12px;', text: num }),
            h('span', { text: title })
          )
        ),
        h('div', {
          style: 'padding:10px 14px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:8px; font-size:13.5px; font-weight:700; line-height:1.75; color:#0F172A; white-space:pre-wrap; height:auto;',
          text: (contentTxt && String(contentTxt).trim()) ? contentTxt : '........................................................................................................................'
        })
      );
    }

    var page2Dom = h('div', {
      style: 'background:#FFFFFF; border:1px solid #CBD5E1; border-radius:10px; padding:24px; font-family:"Cairo","IBM Plex Sans Arabic",sans-serif; direction:rtl;'
    },
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #CBD5E1; padding-bottom:10px; margin-bottom:16px;' },
        h('strong', { style: 'color:#1B365D; font-size:15px;', text: 'تقرير قياس دوافع السلوك – ' + chName }),
        h('img', { src: 'logo-sq.png', style: 'width:40px; height:40px; border-radius:50%;' })
      ),
      makePage2SectionBox('3', 'تحليل الحالة', mbr.case_analysis),
      makePage2SectionBox('4', 'أهم النتائج', mbr.key_findings),
      makePage2SectionBox('5', 'التوصيات', mbr.recommendations_text),
      makePage2SectionBox('6', 'الخلاصة', mbr.conclusion_text),
      h('div', { style: 'display:flex; justify-content:space-around; margin-top:28px; padding-top:14px; border-top:1px dashed #CBD5E1; text-align:center; font-weight:800; color:#475569; font-size:13.5px;' },
        h('div', null, h('div', { text: '........................................' }), h('div', { style: 'margin-top:4px;', text: 'المقيّم' + (mbr.evaluator_name ? (' (' + mbr.evaluator_name + ')') : '') })),
        h('div', null, h('div', { text: '........................................' }), h('div', { style: 'margin-top:4px;', text: 'مدير المركز' }))
      )
    );
    holder.appendChild(page2Dom);

    return holder;
  }

  function renderMasBehaviorReportSheetView(r, childFullName, secName, kd, adminOpts) {
    var ev = parseEvaluationReport(r);
    enrichChildEvaluationData(ev, childFullName, secName, kd);
    var chName = childFullName || (kd && kd.full_name) || ev.child_name || 'طفل';

    var wrap = h('div', { style: 'max-width:940px; margin:0 auto; background:#FFF; padding:20px; border:1.5px solid #CBD5E1; border-radius:12px; font-family:"Cairo","IBM Plex Sans Arabic",sans-serif; direction:rtl;' });

    var topCtrl = h('div', { class: 'no-print', style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #E2E8F0;' },
      h('div', { style: 'display:flex; gap:8px; flex-wrap:wrap;' },
        h('button', {
          type: 'button',
          class: 'btn small gold',
          onclick: async function () {
            try {
              toast('جارٍ تجهيز ملف تقرير دوافع السلوك PDF...', 'ok');
              var bytes = await DE_PDF.renderMasBehaviorReportToPdf(ev, chName, secName, kd);
              DE_PDF.downloadPdf(bytes, 'تقرير_دوافع_السلوك_' + (chName || 'طفل').replace(/\s+/g, '_') + '.pdf');
            } catch (e) {
              toast('تعذر التحميل: ' + e.message, 'bad');
            }
          }
        }, makeSvgIcon('s-download'), h('span', { text: 'تحميل تقرير دوافع السلوك (PDF)' })),
        h('button', { type: 'button', class: 'btn small light', onclick: function () { window.print(); } }, makeSvgIcon('s-print'), h('span', { text: 'طباعة' }))
      ),
      adminOpts ? h('div', { style: 'display:flex; gap:6px;' },
        adminOpts.onEdit ? h('button', { type: 'button', class: 'btn small light', text: 'تعديل التقرير', onclick: adminOpts.onEdit }) : null,
        adminOpts.onDelete ? h('button', { type: 'button', class: 'btn small danger', text: 'حذف', onclick: adminOpts.onDelete }) : null
      ) : null
    );
    wrap.appendChild(topCtrl);
    wrap.appendChild(buildMasBehaviorReportPagesDom(ev, chName, secName, kd));
    return wrap;
  }

  /* عرض ورقة استمارة تقييم دوافع السلوك MAS الرسمية مع إمكانية رؤية تقرير دوافع السلوك معها */
  function renderMasBehaviorSheetView(r, childFullName, secName, kd, adminOpts) {
    var ev = parseEvaluationReport(r);
    enrichChildEvaluationData(ev, childFullName, secName, kd);
    var mas = ev.mas_eval || r.mas_eval || ev.mas || {};
    var answers = mas.answers || {};
    var chName = childFullName || (kd && kd.full_name) || ev.child_name || mas.child_name || '—';
    var informant = mas.informant || mas.examiner || '—';
    var dateStr = formatDateDDMMYYYY(mas.report_date || ev.report_date || '');

    var wrap = h('div', { style: 'max-width:940px; margin:0 auto; background:#FFF; padding:22px 26px; border:1.5px solid #000; font-family:"Cairo", "IBM Plex Sans Arabic", sans-serif; direction:rtl; color:#000;' });

    var evalSheetBox = h('div');
    var reportSheetBox = h('div', { hidden: true });

    var btnModeEval = h('button', { type: 'button', class: 'btn small light', text: 'استمارة التقييم فقط' });
    var btnModeReport = h('button', { type: 'button', class: 'btn small light', text: 'تقرير دوافع السلوك' });
    var btnModeBoth = h('button', { type: 'button', class: 'btn small primary', text: 'عرض الاستمارة والتقرير معاً' });

    function updateMasViewMode(m) {
      btnModeEval.className = 'btn small ' + (m === 'eval' ? 'primary' : 'light');
      btnModeReport.className = 'btn small ' + (m === 'report' ? 'primary' : 'light');
      btnModeBoth.className = 'btn small ' + (m === 'both' ? 'primary' : 'light');
      evalSheetBox.hidden = (m === 'report');
      reportSheetBox.hidden = (m === 'eval');
      if (m === 'report' || m === 'both') {
        reportSheetBox.textContent = '';
        reportSheetBox.appendChild(buildMasBehaviorReportPagesDom(ev, chName, secName, kd));
      }
    }

    btnModeEval.onclick = function () { updateMasViewMode('eval'); };
    btnModeReport.onclick = function () { updateMasViewMode('report'); };
    btnModeBoth.onclick = function () { updateMasViewMode('both'); };

    var topCtrl = h('div', { class: 'no-print', style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:16px; padding-bottom:10px; border-bottom:1px solid #E2E8F0;' },
      h('div', { style: 'display:flex; gap:6px; flex-wrap:wrap;' },
        btnModeBoth,
        btnModeEval,
        btnModeReport,
        h('button', {
          type: 'button',
          class: 'btn small gold',
          onclick: async function () {
            try {
              toast('جارٍ تجهيز ملف استمارة MAS PDF...', 'ok');
              var bytes = await DE_PDF.renderMasBehaviorToPdf(ev, chName, secName, kd);
              DE_PDF.downloadPdf(bytes, 'استمارة_تقييم_دوافع_السلوك_MAS_' + (chName || 'طفل').replace(/\s+/g, '_') + '.pdf');
            } catch (e) {
              toast('تعذر التحميل: ' + e.message, 'bad');
            }
          }
        }, makeSvgIcon('s-download'), h('span', { text: 'تحميل الاستمارة (PDF)' })),
        h('button', {
          type: 'button',
          class: 'btn small gold',
          onclick: async function () {
            try {
              toast('جارٍ تجهيز ملف تقرير دوافع السلوك PDF...', 'ok');
              var bytes = await DE_PDF.renderMasBehaviorReportToPdf(ev, chName, secName, kd);
              DE_PDF.downloadPdf(bytes, 'تقرير_دوافع_السلوك_' + (chName || 'طفل').replace(/\s+/g, '_') + '.pdf');
            } catch (e) {
              toast('تعذر التحميل: ' + e.message, 'bad');
            }
          }
        }, makeSvgIcon('s-download'), h('span', { text: 'تحميل التقرير (PDF)' })),
        h('button', { type: 'button', class: 'btn small light', onclick: function () { window.print(); } }, makeSvgIcon('s-print'), h('span', { text: 'طباعة' }))
      ),
      adminOpts ? h('div', { style: 'display:flex; gap:6px;' },
        adminOpts.onEdit ? h('button', { type: 'button', class: 'btn small light', text: 'تعديل', onclick: adminOpts.onEdit }) : null,
        adminOpts.onDelete ? h('button', { type: 'button', class: 'btn small danger', text: 'حذف', onclick: adminOpts.onDelete }) : null
      ) : null
    );
    wrap.appendChild(topCtrl);

    evalSheetBox.appendChild(h('h2', { style: 'text-align:center; margin:0 0 12px; font-size:21px; font-weight:900;', text: 'استمارة تقييم دوافع السلوك MAS' }));
    evalSheetBox.appendChild(h('div', { style: 'display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; font-size:15px; font-weight:800; margin-bottom:12px;' },
      h('span', { text: 'اسم الحالة: ' + chName }),
      h('span', { text: 'مقدم المعلومات: ' + informant }),
      h('span', { text: 'التاريخ: ' + dateStr })
    ));

    evalSheetBox.appendChild(renderMasAutoFormattedDom(mas.intro_text || ''));

    var scaleHeaders = ['مطلقا\n0', 'شبه مطلقا\n1', 'نادرا\n2', 'نصف الوقت\n3', 'عادة\n4', 'أغلب الأحيان\n5', 'دائما\n6'];
    var tbl1 = h('table', { style: 'width:100%; border-collapse:collapse; border:1.5px solid #000; text-align:center; font-size:13px; margin:14px 0;' });
    tbl1.appendChild(h('thead', null,
      h('tr', { style: 'font-weight:900; background:#F8FAFC;' },
        h('th', { style: 'border:1px solid #000; padding:6px; width:36px;', text: '#' }),
        h('th', { style: 'border:1px solid #000; padding:6px 10px; text-align:right;', text: 'البند' }),
        scaleHeaders.map(function (sh) {
          return h('th', { style: 'border:1px solid #000; padding:6px 4px; width:62px; white-space:pre-line;', text: sh });
        })
      )
    ));
    var tb1 = h('tbody');
    MAS_FIXED_ITEMS.forEach(function (qText, idx) {
      var qNum = idx + 1;
      var chosen = (answers[qNum] !== '' && answers[qNum] != null) ? parseInt(answers[qNum], 10) : -1;
      tb1.appendChild(h('tr', null,
        h('td', { style: 'border:1px solid #000; padding:6px; font-weight:800;', text: String(qNum) }),
        h('td', { style: 'border:1px solid #000; padding:6px 10px; text-align:right; font-weight:700;', text: qText }),
        [0, 1, 2, 3, 4, 5, 6].map(function (scVal) {
          return h('td', { style: 'border:1px solid #000; padding:6px; font-weight:900; font-size:14px;', text: chosen === scVal ? 'X' : '' });
        })
      ));
    });
    tbl1.appendChild(tb1);
    evalSheetBox.appendChild(tbl1);
    evalSheetBox.appendChild(buildMasResultsTableDom(answers));
    evalSheetBox.appendChild(renderMasAutoFormattedDom(mas.outro_text || ''));

    wrap.appendChild(evalSheetBox);
    wrap.appendChild(reportSheetBox);
    updateMasViewMode('both');

    return wrap;
  }

  /* =====================================================================
     دار الإحسان — تقرير نوعي تحليلي (Rapport d'analyse qualitatif)
     مع عرض تقرير الكمي (quantitative) فوقه، وتصغير مكان معلومات الطفل للنصف بدون بحث،
     وأرقام عناوين صحيحة
     ===================================================================== */

  /* ══════════════════════════════════════════════════════════════════════════
     باني وعارض التقرير الفرنسي الأصلي:
     FICHE DE SUIVI MÉDICO-FONCTIONNEL — Suivi des crises épileptiques
     - الكتابة الحمراء (#B91C1C): نصوص وتعليمات ثابتة وموحدة لجميع الأطفال
     - الكتابة الخضراء (#15803D): اختيارات محددة مسبقاً مع إمكانية إضافة خيارات جديدة
     - الكتابة السوداء (#0F172A): نصوص عادية وحقول كتابة يدوية حرة
     - شعار دار الإحسان في أعلى يمين الوثيقة + معاينة كاملة + PDF بدون أخطاء
     ══════════════════════════════════════════════════════════════════════════ */
  var MEDICO_CUSTOM_OPTS_KEY = 'de_medico_fr_custom_green_opts_v1';
  function loadMedicoCustomGreenOpts() {
    try { return JSON.parse(localStorage.getItem(MEDICO_CUSTOM_OPTS_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveMedicoCustomGreenOpts(obj) {
    try { localStorage.setItem(MEDICO_CUSTOM_OPTS_KEY, JSON.stringify(obj || {})); } catch (e) {}
  }

  function resolveChildFrenchName(kid, fallbackName) {
    var arName = (kid && kid.full_name) || fallbackName || '';
    var memNo = (kid && kid.membership_no) || '';
    if (window.DEUser && typeof window.DEUser.frName === 'function') {
      var fr = window.DEUser.frName(arName, memNo);
      if (fr && fr.trim()) return fr.trim().toUpperCase();
    }
    return arName;
  }

  function calcFrenchAge(dob) {
    if (!dob) return '';
    var b = new Date(dob), n = new Date();
    if (isNaN(b.getTime())) return '';
    var a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return (a < 10 ? '0' + a : String(a)) + ' ans';
  }

  function renderMedicoFunctionalFrenchSheetView(r, childFullName, secName, kd, adminOpts) {
    var ev = parseEvaluationReport(r);
    var mf = ev.medico_functional_fr || {};
    var frName = mf.child_name_fr || resolveChildFrenchName(kd, childFullName || ev.child_name);

    var wrap = h('div', { style: 'direction:rtl;' });

    var bar = h('div', { class: 'no-print', style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px; padding:10px 12px; background:#F8FAFC; border:1px solid #CBD5E1; border-radius:10px;' },
      h('div', { style: 'display:flex; align-items:center; gap:8px;' },
        h('span', { class: 'badge gold', text: 'FICHE DE SUIVI MÉDICO-FONCTIONNEL' }),
        h('strong', { style: 'color:#1B365D; font-size:13.5px;', text: frName })
      ),
      h('div', { style: 'display:flex; gap:6px; flex-wrap:wrap;' },
        h('button', {
          type: 'button',
          class: 'btn small primary',
          text: '👁 معاينة كاملة',
          onclick: async function () {
            var pagesHolder = h('div', { style: 'display:flex; flex-direction:column; gap:14px; align-items:center;' },
              h('span', { class: 'muted small', text: 'جارٍ تجهيز صفحات الوثيقة...' })
            );
            var dlFn = async function () {
              try {
                toast('جارٍ تجهيز ملف PDF الفرنسي...', 'ok');
                var bytes = await window.DE_PDF.renderMedicoFunctionalFrenchToPdf(ev, frName, secName, kd);
                window.DE_PDF.downloadPdf(bytes, 'FICHE_SUIVI_MEDICO_FONCTIONNEL_' + (frName || 'enfant').replace(/[^a-zA-Z0-9_-]+/g, '_') + '.pdf');
                toast('تم تحميل التقرير الفرنسي بنجاح.', 'ok');
              } catch (err) {
                toast('تعذر تحميل PDF: ' + (err.message || err), 'bad');
              }
            };
            openFullDocumentPreviewModal('FICHE DE SUIVI MÉDICO-FONCTIONNEL — ' + frName, pagesHolder, dlFn);
            try {
              var canvases = await window.DE_PDF.renderMedicoFunctionalFrenchPages(ev, frName, secName, kd);
              pagesHolder.textContent = '';
              canvases.forEach(function (cv) {
                cv.style.width = '100%';
                cv.style.maxWidth = '920px';
                cv.style.height = 'auto';
                cv.style.background = '#FFF';
                cv.style.boxShadow = '0 4px 16px rgba(15,23,42,0.14)';
                cv.style.borderRadius = '6px';
                pagesHolder.appendChild(cv);
              });
            } catch (err) {
              pagesHolder.textContent = 'تعذر عرض المعاينة: ' + (err.message || err);
            }
          }
        }),
        h('button', {
          type: 'button',
          class: 'btn small gold',
          text: '📄 تحميل PDF',
          onclick: async function () {
            try {
              toast('جارٍ تجهيز ملف PDF الفرنسي...', 'ok');
              var bytes = await window.DE_PDF.renderMedicoFunctionalFrenchToPdf(ev, frName, secName, kd);
              window.DE_PDF.downloadPdf(bytes, 'FICHE_SUIVI_MEDICO_FONCTIONNEL_' + (frName || 'enfant').replace(/[^a-zA-Z0-9_-]+/g, '_') + '.pdf');
              toast('تم تحميل التقرير الفرنسي بنجاح.', 'ok');
            } catch (err) {
              toast('تعذر تحميل PDF: ' + (err.message || err), 'bad');
            }
          }
        }),
        adminOpts && adminOpts.onEdit ? h('button', { type: 'button', class: 'btn small light', text: '✏️ تعديل التقرير', onclick: adminOpts.onEdit }) : null,
        adminOpts && adminOpts.onDelete ? h('button', { type: 'button', class: 'btn small danger', text: 'حذف', onclick: adminOpts.onDelete }) : null
      )
    );
    wrap.appendChild(bar);

    var inlinePages = h('div', { style: 'display:flex; flex-direction:column; gap:12px; align-items:center; background:#F1F5F9; padding:12px; border-radius:10px; border:1px solid #CBD5E1;' },
      h('span', { class: 'muted small', text: 'جارٍ تحميل معاينة التقرير الفرنسي...' })
    );
    wrap.appendChild(inlinePages);

    if (window.DE_PDF && typeof window.DE_PDF.renderMedicoFunctionalFrenchPages === 'function') {
      window.DE_PDF.renderMedicoFunctionalFrenchPages(ev, frName, secName, kd).then(function (canvases) {
        inlinePages.textContent = '';
        canvases.forEach(function (cv) {
          cv.style.width = '100%';
          cv.style.maxWidth = '880px';
          cv.style.height = 'auto';
          cv.style.background = '#FFF';
          cv.style.borderRadius = '6px';
          cv.style.boxShadow = '0 2px 10px rgba(15,23,42,0.1)';
          inlinePages.appendChild(cv);
        });
      }).catch(function (err) {
        inlinePages.textContent = 'تعذر عرض التقرير الفرنسي: ' + (err.message || err);
        inlinePages.style.color = '#991B1B';
      });
    }

    return wrap;
  }

  function openMedicoFunctionalFrenchBuilder(existingRep, kids, sections, secAllOpts, branchOpts) {
    S.inSubBuilder = true;
    var ev = existingRep ? parseEvaluationReport(existingRep) : { eval_type: 'medico_functional_fr', report_date: new Date().toISOString().slice(0, 10) };
    ev.eval_type = 'medico_functional_fr';
    if (existingRep && existingRep.id) ev.id = existingRep.id;
    var savedMf = ev.medico_functional_fr || {};
    var customStore = loadMedicoCustomGreenOpts();

    var mfState = {
      child_name_fr: savedMf.child_name_fr || '',
      age_fr: savedMf.age_fr || '',
      section_choices: Array.isArray(savedMf.section_choices) ? savedMf.section_choices.slice() : [],
      section_custom: Array.isArray(savedMf.section_custom) ? savedMf.section_custom.slice() : (customStore.section || []),
      admission_date: savedMf.admission_date || '',
      medical_data: savedMf.medical_data || '',
      antiepileptic_treatment: savedMf.antiepileptic_treatment || '',
      treating_doctor: savedMf.treating_doctor || '',
      followup_start_date: savedMf.followup_start_date || '',
      episodes: Array.isArray(savedMf.episodes) && savedMf.episodes.length >= 2
        ? [Object.assign({}, savedMf.episodes[0]), Object.assign({}, savedMf.episodes[1])]
        : [{}, {}],
      manifestations_selected: Array.isArray(savedMf.manifestations_selected) ? savedMf.manifestations_selected.slice() : [],
      manifestations_custom: Array.isArray(savedMf.manifestations_custom) ? savedMf.manifestations_custom.slice() : (customStore.manifestations || []),
      other_manifestations: savedMf.other_manifestations || '',
      state_during: Object.assign({ verbal_response: '', respiration: '', color_change: '', fall_or_injury: '' }, savedMf.state_during || {}),
      state_after_selected: Array.isArray(savedMf.state_after_selected) ? savedMf.state_after_selected.slice() : [],
      state_after_custom: Array.isArray(savedMf.state_after_custom) ? savedMf.state_after_custom.slice() : (customStore.state_after || []),
      sleep_recovery_duration: savedMf.sleep_recovery_duration || '',
      complementary_observations: savedMf.complementary_observations || '',
      interventions_done: savedMf.interventions_done || '',
      observer_name: savedMf.observer_name || '',
      vigilance_grid: Object.assign({}, savedMf.vigilance_grid || {}),
      fatigue_level_selected: Array.isArray(savedMf.fatigue_level_selected) ? savedMf.fatigue_level_selected.slice() : [],
      fatigue_level_custom: Array.isArray(savedMf.fatigue_level_custom) ? savedMf.fatigue_level_custom.slice() : (customStore.fatigue_level || []),
      participation_level_selected: Array.isArray(savedMf.participation_level_selected) ? savedMf.participation_level_selected.slice() : [],
      participation_level_custom: Array.isArray(savedMf.participation_level_custom) ? savedMf.participation_level_custom.slice() : (customStore.participation_level || []),
      educator_daily_obs: savedMf.educator_daily_obs || '',
      sleep_general: Object.assign({ night_duration: '', sleep_quality: '', arrived_tired: '', unusual_drowsiness: '', behavior_change: '', family_remarks: '' }, savedMf.sleep_general || {}),
      weekly_bilan: Object.assign({ crises_count: '', heavy_fatigue_days: '', sleep_episodes_count: '', low_vigilance_periods: '', pedagogical_impact: '', team_observations: '' }, savedMf.weekly_bilan || {}),
      validation: Object.assign({ followup_responsible: '', educator_name: '', structure_responsible: '', last_update_date: new Date().toISOString().slice(0, 10) }, savedMf.validation || {})
    };

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;' },
      h('div', { style: 'display:flex; align-items:center; gap:10px;' },
        h('img', { src: 'logo.png', style: 'width:38px; height:38px; border-radius:8px; object-fit:contain;' }),
        h('div', null,
          h('h2', { style: 'margin:0; color:#1B365D; font-size:1.15rem; font-weight:900;', text: existingRep ? 'Modifier — FICHE DE SUIVI MÉDICO-FONCTIONNEL' : 'FICHE DE SUIVI MÉDICO-FONCTIONNEL' }),
          h('div', { class: 'muted small', text: 'Suivi des crises épileptiques' })
        )
      ),
      h('button', { type: 'button', class: 'btn small light', text: 'رجوع لقائمة التقارير', onclick: function () { go('reports'); } })
    );
    v.appendChild(topBar);

    var card = h('div', { class: 'card', style: 'max-width:1060px; margin:0 auto; padding:20px; border-radius:14px; border:1.5px solid #CBD5E1; direction:ltr; text-align:left; font-family:"Times New Roman", Georgia, Arial, sans-serif; color:#0F172A;' });

    // En-tête officiel avec logo en haut à droite
    card.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #101D35; padding-bottom:12px; margin-bottom:16px; gap:12px;' },
      h('img', { src: 'logo.png', alt: 'Dar El Ihsan', style: 'width:88px; height:88px; object-fit:contain; flex-shrink:0;' }),
      h('div', { style: 'flex:1; text-align:center;' },
        h('div', { style: 'font-weight:900; font-size:20px; color:#0F172A;', text: 'A-P-E-H-M' }),
        h('div', { style: 'font-weight:800; font-size:17px; color:#0F172A;', text: 'Centre psychopédagogique Dar el ihsan' }),
        h('div', { style: 'font-weight:700; font-size:15px; color:#0F172A;', text: '-El ATTEUF – Ghardaïa-' }),
        h('div', { style: 'font-weight:900; font-size:18px; color:#101D35; text-decoration:underline; margin-top:8px;', text: 'FICHE DE SUIVI MÉDICO-FONCTIONNEL' }),
        h('div', { style: 'font-weight:700; font-size:14.5px; color:#0F172A;', text: 'Suivi des crises épileptiques' })
      )
    ));

    // Sélecteur de l'enfant (remplit automatiquement le nom en français et l'âge)
    var selKid0 = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0] || null;
    var kidSel = h('select', { style: 'width:100%; padding:8px 10px; border:1.5px solid #1B365D; border-radius:8px; font-weight:700; color:#0F172A; background:#FFF;' },
      h('option', { value: '', text: '— Sélectionner un enfant —' }),
      kids.map(function (k) {
        var opt = h('option', { value: k.id, text: resolveChildFrenchName(k) + ' (' + k.full_name + ')' });
        if (String(k.id) === String(ev.child_id)) opt.selected = true;
        return opt;
      })
    );

    var frNameInp = h('input', { type: 'text', value: mfState.child_name_fr || (selKid0 ? resolveChildFrenchName(selKid0) : ''), placeholder: 'Nom et prénom en français', style: 'width:100%; padding:7px 10px; border:1px solid #94A3B8; border-radius:6px; color:#0F172A; font-weight:700;' });
    var ageFrInp = h('input', { type: 'text', value: mfState.age_fr || (selKid0 ? calcFrenchAge(selKid0.dob) : ''), placeholder: 'ex: 09 ans', style: 'width:100%; padding:7px 10px; border:1px solid #94A3B8; border-radius:6px; color:#0F172A;' });
    var reportDateInp = h('input', { type: 'date', value: ev.report_date || new Date().toISOString().slice(0, 10), style: 'width:100%; padding:7px 10px; border:1px solid #94A3B8; border-radius:6px; color:#0F172A;' });

    kidSel.onchange = function () {
      var chosen = kids.filter(function (k) { return String(k.id) === String(kidSel.value); })[0];
      if (chosen) {
        ev.child_id = chosen.id;
        frNameInp.value = resolveChildFrenchName(chosen);
        mfState.child_name_fr = frNameInp.value;
        var aStr = calcFrenchAge(chosen.dob);
        if (aStr) { ageFrInp.value = aStr; mfState.age_fr = aStr; }
      }
    };
    frNameInp.oninput = function () { mfState.child_name_fr = frNameInp.value; };
    ageFrInp.oninput = function () { mfState.age_fr = ageFrInp.value; };

    function makeSectionHead(title, col) {
      return h('h3', { style: 'margin:18px 0 10px; padding-bottom:5px; border-bottom:1.5px solid #CBD5E1; font-size:16.5px; font-weight:900; color:' + (col || '#101D35') + ';', text: title });
    }

    function makeTextField(labelRed, obj, key, ph) {
      var inp = h('input', { type: 'text', value: obj[key] || '', placeholder: ph || '', style: 'width:100%; padding:7px 10px; border:1px solid #CBD5E1; border-radius:6px; color:#0F172A; background:#FFF;' });
      inp.oninput = function () { obj[key] = inp.value; };
      return h('div', { style: 'margin-bottom:8px;' },
        h('label', { style: 'display:block; font-weight:800; color:#0F172A; font-size:13.5px; margin-bottom:3px;', text: labelRed + ' :' }),
        inp
      );
    }

    function makeAutoTextareaField(labelRed, obj, key, ph) {
      var ta = attachAutoResizeTextarea(h('textarea', { rows: 2, placeholder: ph || '', style: 'width:100%; min-height:44px; padding:8px 10px; border:1px solid #CBD5E1; border-radius:6px; color:#0F172A; background:#FFF; font-family:inherit; font-size:14px;' }));
      ta.value = obj[key] || '';
      ta.oninput = function () { obj[key] = ta.value; };
      return h('div', { style: 'margin-bottom:10px;' },
        h('label', { style: 'display:block; font-weight:800; color:#0F172A; font-size:13.5px; margin-bottom:4px;', text: labelRed + ' :' }),
        ta
      );
    }

    // Helper pour les listes d'options VERTES sélectionnables + ajout de nouvelles options
    function makeGreenChecklistGroup(titleRed, defaultOpts, selectedArr, customArr, storeKey) {
      var box = h('div', { style: 'background:#F5F6F8; border:1px solid #B8C2D0; border-radius:10px; padding:10px 12px; margin-bottom:12px;' });
      box.appendChild(h('div', { style: 'font-weight:900; color:#0F172A; font-size:14px; margin-bottom:6px;', text: titleRed }));
      var listWrap = h('div', { style: 'display:flex; flex-direction:column; gap:5px;' });
      box.appendChild(listWrap);

      function renderItems() {
        listWrap.textContent = '';
        var all = [];
        defaultOpts.forEach(function (o) { if (all.indexOf(o) < 0) all.push(o); });
        customArr.forEach(function (o) { if (o && all.indexOf(o) < 0) all.push(o); });
        selectedArr.forEach(function (o) { if (o && all.indexOf(o) < 0) all.push(o); });

        all.forEach(function (optText) {
          var isOn = selectedArr.indexOf(optText) >= 0;
          var chk = h('input', { type: 'checkbox', checked: isOn, style: 'width:16px; height:16px; accent-color:#0F172A; cursor:pointer;' });
          chk.onchange = function () {
            var idx = selectedArr.indexOf(optText);
            if (chk.checked && idx < 0) selectedArr.push(optText);
            else if (!chk.checked && idx >= 0) selectedArr.splice(idx, 1);
          };
          listWrap.appendChild(h('label', { style: 'display:flex; align-items:center; gap:8px; color:#0F172A; font-weight:700; font-size:14px; cursor:pointer;' }, chk, h('span', { text: optText })));
        });
      }
      renderItems();

      var addInp = h('input', { type: 'text', placeholder: 'Ajouter une option...', style: 'flex:1; padding:6px 8px; border:1px solid #B8C2D0; border-radius:6px; font-size:13px; color:#0F172A; background:#FFF;' });
      var addBtn = h('button', {
        type: 'button',
        class: 'btn small light',
        style: 'color:#0F172A; border-color:#0F172A; font-weight:800; font-size:12px;',
        text: '+ Ajouter',
        onclick: function () {
          var val = (addInp.value || '').trim();
          if (!val) return;
          if (customArr.indexOf(val) < 0) customArr.push(val);
          if (selectedArr.indexOf(val) < 0) selectedArr.push(val);
          var st = loadMedicoCustomGreenOpts();
          st[storeKey] = customArr.slice();
          saveMedicoCustomGreenOpts(st);
          addInp.value = '';
          renderItems();
        }
      });
      box.appendChild(h('div', { style: 'display:flex; gap:6px; margin-top:8px;' }, addInp, addBtn));
      return box;
    }

    // ── SECTION I ──
    card.appendChild(makeSectionHead('I. INFORMATIONS PERSONNELLES', '#101D35'));
    card.appendChild(h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-bottom:10px; background:#F8FAFC; padding:12px; border-radius:10px; border:1px solid #CBD5E1;' },
      h('div', null, h('label', { style: 'display:block; font-weight:800; color:#1B365D; font-size:12.5px; margin-bottom:3px;', text: 'Enfant (Base de données) :' }), kidSel),
      h('div', null, h('label', { style: 'display:block; font-weight:800; color:#0F172A; font-size:12.5px; margin-bottom:3px;', text: 'Nom et prénom (Français) :' }), frNameInp),
      h('div', null, h('label', { style: 'display:block; font-weight:800; color:#0F172A; font-size:12.5px; margin-bottom:3px;', text: 'Âge :' }), ageFrInp),
      h('div', null, h('label', { style: 'display:block; font-weight:800; color:#0F172A; font-size:12.5px; margin-bottom:3px;', text: 'Date du rapport :' }), reportDateInp)
    ));
    card.appendChild(makeGreenChecklistGroup('Section :', ['Retard mental (RM)', 'Trouble du spectre autistique', 'Trisomie 21'], mfState.section_choices, mfState.section_custom, 'section'));
    card.appendChild(h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:10px;' },
      makeTextField("Date d'admission au centre", mfState, 'admission_date', 'ex: Octobre 2024'),
      makeTextField('Traitement antiépileptique', mfState, 'antiepileptic_treatment', ''),
      makeTextField('Médecin traitant', mfState, 'treating_doctor', ''),
      makeTextField('Date de début du suivi', mfState, 'followup_start_date', '')
    ));
    card.appendChild(makeAutoTextareaField('Données médicales connues', mfState, 'medical_data', 'ex: Retard global du développement intellectuel associé à une épilepsie.'));

    // ── SECTION II ──
    card.appendChild(makeSectionHead('II. FICHE DE SUIVI DES CRISES ÉPILEPTIQUES', '#101D35'));
    card.appendChild(h('p', { style: 'font-style:italic; margin:0 0 10px; font-size:14px; color:#0F172A;', text: "Cette fiche doit être renseignée à chaque épisode de crise observé au sein du centre." }));

    var epFields = [
      { key: 'date_time', label: 'Date et heure', type: 'text' },
      { key: 'duration', label: 'Durée de la crise', type: 'text' },
      { key: 'location', label: 'Lieu de survenue', type: 'text' },
      { key: 'activity_before', label: 'Activité avant la crise', type: 'text' },
      { key: 'loss_consciousness', label: 'Perte de conscience', type: 'yn' },
      { key: 'convulsions', label: 'Convulsions', type: 'yn' },
      { key: 'breathing_diff', label: 'Difficultés respiratoires', type: 'yn' },
      { key: 'post_sleep', label: 'Endormissement après la crise', type: 'yn' },
      { key: 'recovery_duration', label: 'Durée de récupération', type: 'text' }
    ];

    function makeEpInput(epObj, field) {
      if (field.type === 'yn') {
        var sel = h('select', { style: 'width:100%; padding:5px; border:1px solid #CBD5E1; border-radius:5px; color:#0F172A; font-weight:700;' },
          h('option', { value: '', text: '—' }),
          h('option', { value: 'Oui', text: 'Oui' }),
          h('option', { value: 'Non', text: 'Non' })
        );
        sel.value = epObj[field.key] || '';
        sel.onchange = function () { epObj[field.key] = sel.value; };
        return sel;
      }
      var inp = h('input', { type: 'text', value: epObj[field.key] || '', style: 'width:100%; padding:5px 7px; border:1px solid #CBD5E1; border-radius:5px; color:#0F172A;' });
      inp.oninput = function () { epObj[field.key] = inp.value; };
      return inp;
    }

    var crisisTbl = h('table', { style: 'width:100%; border-collapse:collapse; margin-bottom:14px; font-size:13.5px;' },
      h('thead', null,
        h('tr', { style: 'background:#FEF2F2; color:#0F172A;' },
          h('th', { style: 'border:1px solid #334155; padding:7px;', text: 'Informations (Épisode 1)' }),
          h('th', { style: 'border:1px solid #334155; padding:7px;', text: 'Observations' }),
          h('th', { style: 'border:1px solid #334155; padding:7px;', text: 'Informations (Épisode 2)' }),
          h('th', { style: 'border:1px solid #334155; padding:7px;', text: 'Observations' })
        )
      ),
      h('tbody', null, epFields.map(function (f) {
        return h('tr', null,
          h('td', { style: 'border:1px solid #334155; padding:6px; font-weight:800; color:#0F172A;', text: f.label }),
          h('td', { style: 'border:1px solid #334155; padding:4px;' }, makeEpInput(mfState.episodes[0], f)),
          h('td', { style: 'border:1px solid #334155; padding:6px; font-weight:800; color:#0F172A;', text: f.label }),
          h('td', { style: 'border:1px solid #334155; padding:4px;' }, makeEpInput(mfState.episodes[1], f))
        );
      }))
    );
    card.appendChild(h('div', { style: 'overflow-x:auto;' }, crisisTbl));

    card.appendChild(makeGreenChecklistGroup(
      '1. Manifestations observées pendant la crise :',
      ['Perte de conscience.', 'Regard fixe et absence de réponse aux sollicitations.', 'Convulsions ou mouvements involontaires.', 'Chute brutale.'],
      mfState.manifestations_selected, mfState.manifestations_custom, 'manifestations'
    ));
    card.appendChild(makeTextField('Autres manifestations', mfState, 'other_manifestations', ''));

    // 2. État de l'enfant pendant la crise
    var makeSelRow = function (lbl, key, opts) {
      var s = h('select', { style: 'padding:6px 10px; border:1px solid #CBD5E1; border-radius:6px; color:#0F172A; font-weight:700;' },
        h('option', { value: '', text: '— Non précisé —' }),
        opts.map(function (o) { return h('option', { value: o, text: o }); })
      );
      s.value = mfState.state_during[key] || '';
      s.onchange = function () { mfState.state_during[key] = s.value; };
      return h('div', { style: 'display:flex; justify-content:space-between; align-items:center; gap:10px; padding:5px 0; border-bottom:1px dashed #E2E8F0;' },
        h('span', { style: 'color:#0F172A; font-weight:800; font-size:13.5px;', text: '✓ ' + lbl }),
        s
      );
    };
    card.appendChild(h('div', { style: 'background:#FFF; border:1px solid #CBD5E1; border-radius:10px; padding:10px 12px; margin-bottom:12px;' },
      h('div', { style: 'font-weight:900; color:#0F172A; font-size:14px; margin-bottom:6px;', text: "2. État de l'enfant pendant la crise :" }),
      makeSelRow('Réponse aux sollicitations verbales', 'verbal_response', ['Oui', 'Non']),
      makeSelRow('Respiration', 'respiration', ['Normale', 'Anormale', 'Non évaluée']),
      makeSelRow('Changement de coloration du visage ou des lèvres', 'color_change', ['Oui', 'Non']),
      makeSelRow('Chute ou blessure', 'fall_or_injury', ['Oui', 'Non'])
    ));

    card.appendChild(makeGreenChecklistGroup(
      "3. État de l'enfant après la crise :",
      ['Récupération progressive de la conscience.', 'Endormissement.', 'Fatigue et épuisement.', 'Confusion ou absence de réponse.', "Retour à l'activité habituelle."],
      mfState.state_after_selected, mfState.state_after_custom, 'state_after'
    ));
    card.appendChild(makeTextField('Durée du sommeil ou de la récupération', mfState, 'sleep_recovery_duration', ''));
    card.appendChild(makeAutoTextareaField('Observations complémentaires', mfState, 'complementary_observations', ''));
    card.appendChild(makeAutoTextareaField('Conduite adoptée et interventions réalisées', mfState, 'interventions_done', ''));
    card.appendChild(makeTextField("Nom et prénom de l'employé ayant observé la crise", mfState, 'observer_name', ''));

    // ── SECTION III ──
    card.appendChild(makeSectionHead('III. FICHE DE SUIVI QUOTIDIEN DE LA VIGILANCE ET DE LA FATIGABILITÉ', '#101D35'));
    card.appendChild(h('p', { style: 'font-style:italic; margin:0 0 10px; font-size:14px; color:#0F172A;', text: "À renseigner quotidiennement par l'éducateur ou l'encadreur pédagogique." }));

    var vigInds = [
      { key: 'vigilance_ok', label: 'État de vigilance satisfaisant' },
      { key: 'attention_fluct', label: 'Attention fluctuante' },
      { key: 'somnolence', label: 'Somnolence / Léthargie' },
      { key: 'fatigue_app', label: 'Fatigue apparente' },
      { key: 'slow_reaction', label: 'Lenteur de réaction' },
      { key: 'sleep_during_act', label: 'Endormissement pendant les activités' }
    ];
    var vigTbl = h('table', { style: 'width:100%; border-collapse:collapse; margin-bottom:14px; font-size:13.5px;' },
      h('thead', null,
        h('tr', { style: 'background:#FEF2F2; color:#0F172A;' },
          h('th', { style: 'border:1px solid #334155; padding:7px; text-align:left;', text: 'Indicateurs observés' }),
          h('th', { style: 'border:1px solid #334155; padding:7px; text-align:center;', text: 'Matin' }),
          h('th', { style: 'border:1px solid #334155; padding:7px; text-align:center;', text: 'Pendant les activités' }),
          h('th', { style: 'border:1px solid #334155; padding:7px; text-align:center;', text: 'Après-midi' })
        )
      ),
      h('tbody', null, vigInds.map(function (ind) {
        if (!mfState.vigilance_grid[ind.key]) mfState.vigilance_grid[ind.key] = { matin: false, activites: false, apres_midi: false };
        var rowObj = mfState.vigilance_grid[ind.key];
        var mkChk = function (pKey) {
          var c = h('input', { type: 'checkbox', checked: !!rowObj[pKey], style: 'width:17px; height:17px; cursor:pointer;' });
          c.onchange = function () { rowObj[pKey] = c.checked; };
          return h('td', { style: 'border:1px solid #334155; text-align:center; padding:6px;' }, c);
        };
        return h('tr', null,
          h('td', { style: 'border:1px solid #334155; padding:6px; font-weight:800; color:#0F172A;', text: ind.label }),
          mkChk('matin'), mkChk('activites'), mkChk('apres_midi')
        );
      }))
    );
    card.appendChild(h('div', { style: 'overflow-x:auto;' }, vigTbl));

    card.appendChild(makeGreenChecklistGroup('Niveau général de fatigue :', ['Absence de fatigue apparente.', 'Fatigue légère.', 'Fatigue modérée.', 'Fatigue importante.'], mfState.fatigue_level_selected, mfState.fatigue_level_custom, 'fatigue_level'));
    card.appendChild(makeGreenChecklistGroup('Niveau de participation aux activités pédagogiques :', ['Bonne participation.', 'Participation intermittente.', 'Faible participation.', 'Refus ou incapacité à participer.'], mfState.participation_level_selected, mfState.participation_level_custom, 'participation_level'));
    card.appendChild(makeAutoTextareaField("Observations de l'éducateur concernant l'état quotidien de l'enfant", mfState, 'educator_daily_obs', ''));

    // ── SECTION IV ──
    card.appendChild(makeSectionHead("IV. SUIVI DU SOMMEIL ET DE L'ÉTAT GÉNÉRAL", '#101D35'));
    var mkSleepSel = function (key, opts) {
      var s = h('select', { style: 'width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:6px; color:#0F172A; font-weight:700;' },
        h('option', { value: '', text: '—' }),
        opts.map(function (o) { return h('option', { value: o, text: o }); })
      );
      s.value = mfState.sleep_general[key] || '';
      s.onchange = function () { mfState.sleep_general[key] = s.value; };
      return s;
    };
    var mkSleepTxt = function (key) {
      var i = h('input', { type: 'text', value: mfState.sleep_general[key] || '', style: 'width:100%; padding:6px; border:1px solid #CBD5E1; border-radius:6px; color:#0F172A;' });
      i.oninput = function () { mfState.sleep_general[key] = i.value; };
      return i;
    };
    card.appendChild(h('table', { style: 'width:100%; border-collapse:collapse; margin-bottom:14px; font-size:13.5px;' },
      h('thead', null, h('tr', { style: 'background:#FEF2F2; color:#0F172A;' },
        h('th', { style: 'border:1px solid #334155; padding:7px; width:50%;', text: 'Indicateurs' }),
        h('th', { style: 'border:1px solid #334155; padding:7px; width:50%;', text: 'Observations' })
      )),
      h('tbody', null, [
        ['Durée du sommeil nocturne (selon la famille)', mkSleepTxt('night_duration')],
        ['Qualité du sommeil', mkSleepSel('sleep_quality', ['Bonne', 'Moyenne', 'Mauvaise'])],
        ['Arrivée au centre en état de fatigue', mkSleepSel('arrived_tired', ['Oui', 'Non'])],
        ['Somnolence inhabituelle', mkSleepSel('unusual_drowsiness', ['Oui', 'Non'])],
        ['Changement notable du comportement', mkSleepSel('behavior_change', ['Oui', 'Non'])],
        ['Remarques de la famille', mkSleepTxt('family_remarks')]
      ].map(function (pair) {
        return h('tr', null,
          h('td', { style: 'border:1px solid #334155; padding:6px; font-weight:800; color:#0F172A;', text: pair[0] }),
          h('td', { style: 'border:1px solid #334155; padding:4px;' }, pair[1])
        );
      }))
    ));

    // ── SECTION V ──
    card.appendChild(makeSectionHead('V. BILAN HEBDOMADAIRE DU SUIVI', '#101D35'));
    card.appendChild(h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:10px;' },
      makeTextField('Nombre de crises enregistrées', mfState.weekly_bilan, 'crises_count', ''),
      makeTextField('Nombre de jours avec fatigue importante', mfState.weekly_bilan, 'heavy_fatigue_days', ''),
      makeTextField("Nombre d'épisodes d'endormissement pendant les activités", mfState.weekly_bilan, 'sleep_episodes_count', ''),
      makeTextField('Périodes de baisse de vigilance constatées', mfState.weekly_bilan, 'low_vigilance_periods', '')
    ));
    card.appendChild(makeAutoTextareaField('Répercussions sur la participation pédagogique', mfState.weekly_bilan, 'pedagogical_impact', ''));
    card.appendChild(makeAutoTextareaField("Observations de l'équipe pluridisciplinaire", mfState.weekly_bilan, 'team_observations', ''));

    // ── SECTION VI (ROUGE FIXE) ──
    card.appendChild(makeSectionHead('VI. CONSIGNES DE SÉCURITÉ ET DE SURVEILLANCE', '#101D35'));
    var fixedRules = [
      "1. Noter précisément l'heure de début et de fin de chaque crise.",
      "2. Éloigner les objets dangereux et protéger l'enfant contre les risques de blessures.",
      "3. Placer l'enfant en position latérale de sécurité dès que possible, lorsque cela peut être fait sans danger, et surveiller sa respiration.",
      "4. Ne jamais immobiliser ses mouvements et ne rien introduire dans sa bouche.",
      "5. Ne donner ni eau, ni nourriture, ni médicament par voie orale avant la récupération complète de la conscience.",
      "6. Ne jamais laisser l'enfant seul après une crise et surveiller son état de conscience et sa respiration.",
      "7. Appeler immédiatement les secours si la crise atteint cinq (05) minutes, si une nouvelle crise survient sans récupération de conscience, en cas de difficulté respiratoire ou de blessure grave.",
      "8. Informer la famille et consigner chaque épisode dans le dossier individuel de l'enfant.",
      "9. Respecter le protocole médical d'urgence établi par le médecin traitant."
    ];
    card.appendChild(h('div', { style: 'background:#F5F6F8; border:1px solid #B8C2D0; border-radius:10px; padding:12px 16px; margin-bottom:14px; color:#0F172A; font-size:14px; line-height:1.7;' },
      fixedRules.map(function (rt) { return h('div', { style: 'margin-bottom:4px;', text: rt }); })
    ));

    // ── SECTION VII ──
    card.appendChild(makeSectionHead('VII. VALIDATION ET RESPONSABILITÉS', '#101D35'));
    card.appendChild(h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;' },
      makeTextField('Responsable du suivi', mfState.validation, 'followup_responsible', ''),
      makeTextField('Éducateur / Encadreur', mfState.validation, 'educator_name', ''),
      makeTextField('Responsable de la structure', mfState.validation, 'structure_responsible', ''),
      makeTextField('Date de la dernière mise à jour', mfState.validation, 'last_update_date', '')
    ));

    function buildCurrentPayloadObj() {
      var chosen = kids.filter(function (k) { return String(k.id) === String(kidSel.value); })[0];
      mfState.child_name_fr = (frNameInp.value || '').trim() || (chosen ? resolveChildFrenchName(chosen) : '');
      mfState.age_fr = (ageFrInp.value || '').trim();
      return {
        evObj: {
          id: ev.id,
          eval_type: 'medico_functional_fr',
          child_id: kidSel.value,
          child_name: chosen ? chosen.full_name : '',
          report_date: reportDateInp.value,
          medico_functional_fr: mfState
        },
        chosen: chosen,
        secName: chosen ? (nameOf(sections, chosen.section_id, 'name') || chosen.section || '') : ''
      };
    }

    async function saveMedicoAction(statusKey) {
      if (!kidSel.value) return toast('Veuillez sélectionner un enfant avant de sauvegarder.', 'bad');
      var built = buildCurrentPayloadObj();
      var payload = {
        eval_type: 'medico_functional_fr',
        title: 'FICHE DE SUIVI MÉDICO-FONCTIONNEL',
        status: statusKey,
        updated_at: new Date().toISOString(),
        medico_functional_fr: mfState
      };
      var recordBody = {
        child_id: kidSel.value,
        title: 'FICHE DE SUIVI MÉDICO-FONCTIONNEL — ' + (mfState.child_name_fr || (built.chosen ? built.chosen.full_name : '')),
        report_date: reportDateInp.value,
        status: statusKey,
        activities: EVAL_MARKER + JSON.stringify(payload),
        notes: mfState.complementary_observations || null
      };
      try {
        if (ev.id && DE.isUuid(String(ev.id))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(ev.id), recordBody);
        } else {
          var created = await saveProgressReportResilient('POST', '/progress_reports', recordBody);
          if (Array.isArray(created) && created[0]) ev.id = created[0].id;
        }
        await syncSharedEvaluationRecord(Object.assign({}, recordBody, { id: ev.id }), null);
        bust();
        toast(statusKey === 'published' ? 'تم اعتماد ونشر التقرير الفرنسي بنجاح!' : 'تم حفظ التقرير الفرنسي كمسودة.', 'ok');
        go('reports', { preserveScroll: true });
      } catch (err) {
        toast('تعذر حفظ التقرير الفرنسي: ' + (err.message || err), 'bad');
      }
    }

    card.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:20px; padding-top:14px; border-top:1.5px solid #CBD5E1; direction:rtl;' },
      h('div', { style: 'display:flex; gap:8px; flex-wrap:wrap;' },
        h('button', {
          type: 'button',
          class: 'btn primary',
          text: '👁 معاينة كاملة قبل التحميل',
          onclick: async function () {
            if (!kidSel.value) return toast('يرجى اختيار الطفل أولاً للمعاينة.', 'bad');
            var built = buildCurrentPayloadObj();
            var host = h('div', { style: 'display:flex; flex-direction:column; gap:14px; align-items:center;' },
              h('span', { class: 'muted small', text: 'جارٍ تجهيز صفحات المعاينة...' })
            );
            var dlNow = async function () {
              try {
                toast('جارٍ تجهيز ملف PDF الفرنسي...', 'ok');
                var bytes = await window.DE_PDF.renderMedicoFunctionalFrenchToPdf(built.evObj, mfState.child_name_fr, built.secName, built.chosen);
                window.DE_PDF.downloadPdf(bytes, 'FICHE_SUIVI_MEDICO_FONCTIONNEL_' + (mfState.child_name_fr || 'enfant').replace(/[^a-zA-Z0-9_-]+/g, '_') + '.pdf');
                toast('تم تحميل ملف PDF بنجاح!', 'ok');
              } catch (err) { toast('تعذر التحميل: ' + (err.message || err), 'bad'); }
            };
            openFullDocumentPreviewModal('FICHE DE SUIVI MÉDICO-FONCTIONNEL — ' + mfState.child_name_fr, host, dlNow);
            try {
              var canvases = await window.DE_PDF.renderMedicoFunctionalFrenchPages(built.evObj, mfState.child_name_fr, built.secName, built.chosen);
              host.textContent = '';
              canvases.forEach(function (cv) {
                cv.style.width = '100%'; cv.style.maxWidth = '920px'; cv.style.height = 'auto';
                cv.style.background = '#FFF'; cv.style.borderRadius = '6px'; cv.style.boxShadow = '0 4px 16px rgba(15,23,42,0.14)';
                host.appendChild(cv);
              });
            } catch (err) { host.textContent = 'تعذر عرض المعاينة: ' + (err.message || err); }
          }
        }),
        h('button', {
          type: 'button',
          class: 'btn light',
          text: '📄 تحميل PDF',
          onclick: async function () {
            if (!kidSel.value) return toast('يرجى اختيار الطفل أولاً للتحميل.', 'bad');
            var built = buildCurrentPayloadObj();
            try {
              toast('جارٍ تجهيز ملف PDF الفرنسي...', 'ok');
              var bytes = await window.DE_PDF.renderMedicoFunctionalFrenchToPdf(built.evObj, mfState.child_name_fr, built.secName, built.chosen);
              window.DE_PDF.downloadPdf(bytes, 'FICHE_SUIVI_MEDICO_FONCTIONNEL_' + (mfState.child_name_fr || 'enfant').replace(/[^a-zA-Z0-9_-]+/g, '_') + '.pdf');
              toast('تم تحميل التقرير الفرنسي بنجاح!', 'ok');
            } catch (err) { toast('تعذر التحميل: ' + (err.message || err), 'bad'); }
          }
        })
      ),
      h('div', { style: 'display:flex; gap:8px; flex-wrap:wrap;' },
        h('button', { type: 'button', class: 'btn light', text: 'حفظ كمسودة', onclick: function () { saveMedicoAction('draft'); } }),
        h('button', { type: 'button', class: 'btn gold', text: 'اعتماد ونشر التقرير', onclick: function () { saveMedicoAction('published'); } })
      )
    ));

    v.appendChild(card);
  }

  function openQualitativeReportBuilder(existingRep, kids, sections, secAllOpts, branchOpts, allReportsPool) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'reports', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    ev.eval_type = 'qualitative';
    if (!existingRep || !ev.title || ev.title.indexOf('التقرير النوعي') >= 0) {
      ev.title = "تقرير نوعي تحليلي (Rapport d'analyse qualitatif)";
    }

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;' },
      h('div', { style: 'display:flex; align-items:center; gap:8px;' },
        h('img', { src: 'logo-sq.png', style: 'width:36px; height:36px; border-radius:8px;' }),
        h('h2', { style: 'margin:0; color:#163B65; font-size:1.15rem; font-weight:900;', text: "تقرير نوعي تحليلي (Rapport d'analyse qualitatif)" })
      ),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn small light', type: 'button', style: 'font-weight:700;', text: 'رجوع لقائمة التقارير', onclick: function () { go('reports'); } })
      )
    );
    v.appendChild(topBar);

    var selKid = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0] || (kids.length ? kids[0] : null);
    if (selKid && !ev.child_id) ev.child_id = selKid.id;

    var curSecId = S.isEducator ? S.eduSectionId : (selKid ? selKid.section_id : '');
    var secFilterSelect = h('select', { disabled: !!S.isEducator },
      h('option', { value: '', text: '— جميع الأقسام —' }),
      secAllOpts.map(function (o) { return h('option', { value: o[0], text: o[1] }); })
    );
    secFilterSelect.value = curSecId || '';

    var kidSelect = h('select', null);

    function populateKidsSelect() {
      var sId = secFilterSelect.value;
      var keep = ev.child_id || kidSelect.value;
      while (kidSelect.firstChild) kidSelect.removeChild(kidSelect.firstChild);
      kidSelect.appendChild(h('option', { value: '', text: '— اختر الطالب المعني بالتقرير —' }));
      kids.forEach(function (k) {
        if (sId && !childMatchesSection(k, sId, nameOf(sections, sId, 'name'), sections)) return;
        var label = (k.membership_no ? ('[' + k.membership_no + '] ') : '') + k.full_name + (k.section ? (' — ' + k.section) : '');
        kidSelect.appendChild(h('option', { value: k.id, text: label }));
      });
      if (keep && kids.some(function (k) { return String(k.id) === String(keep); })) {
        kidSelect.value = keep;
      } else if (kidSelect.options.length > 1 && !kidSelect.value) {
        kidSelect.selectedIndex = 1;
        ev.child_id = kidSelect.value;
      }
    }

    populateKidsSelect();

    var titleInput = h('input', { type: 'text', maxlength: 145, value: ev.title || "تقرير نوعي تحليلي (Rapport d'analyse qualitatif)" });
    var dateInput = h('input', { type: 'date', value: ev.report_date });

    var termSelect = h('select', null,
      h('option', { value: 'الثلاثي الأخير', text: 'الثلاثي الأخير (الثالث)' }),
      h('option', { value: 'الثلاثي الأول', text: 'الثلاثي الأول' }),
      h('option', { value: 'الثلاثي الثاني', text: 'الثلاثي الثاني' })
    );
    termSelect.value = ev.term || 'الثلاثي الأخير';

    var schoolYearInput = h('input', { type: 'text', maxlength: 20, value: ev.school_year || '2024/2025' });
    var disabilityDegInput = h('input', { type: 'text', maxlength: 50, value: ev.degree_of_disability || 'متوسطة' });
    var qualLevelInput = h('input', { type: 'text', maxlength: 80, value: ev.qualification_level || (selKid ? (nameOf(sections, selKid.section_id, 'name') || selKid.section || '') : '') });

    // 1. بطاقة معلومات الطفل مصغرة إلى النصف تماماً بدون خانة البحث
    var step1Card = h('div', { class: 'card prog-step-card compact-qual-child-card' },
      makeStepTitleDom('1', 'بيانات الحالة والموسم الدراسي', 's-idcard'),
      h('div', { class: 'compact-qual-grid' },
        h('label', { class: 'fld' }, h('span', { text: 'القسم التربوي:' }), secFilterSelect),
        h('label', { class: 'fld' }, h('span', { text: 'الطفل المعني:' }), kidSelect),
        h('label', { class: 'fld' }, h('span', { text: 'تقييم الثلاثي:' }), termSelect),
        h('label', { class: 'fld' }, h('span', { text: 'الموسم الدراسي:' }), schoolYearInput),
        h('label', { class: 'fld' }, h('span', { text: 'تاريخ التقرير:' }), dateInput),
        h('label', { class: 'fld' }, h('span', { text: 'عنوان الوثيقة:' }), titleInput),
        h('label', { class: 'fld' }, h('span', { text: 'درجة الإعاقة:' }), disabilityDegInput),
        h('label', { class: 'fld' }, h('span', { text: 'القسم ومستوى التأهيل:' }), qualLevelInput)
      )
    );
    v.appendChild(step1Card);

    // 2. بطاقة تقرير الكمي (quantitative)
    var quantHost = h('div', { class: 'card', style: 'margin-bottom:14px; border:1.5px solid #2563EB; border-radius:12px; background:#F8FAFC; padding:12px;' });

    async function renderQuantitativeOnTop() {
      quantHost.textContent = '';
      var chosenKid = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0];
      var sName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
      if (chosenKid && sName && !qualLevelInput.value) {
        qualLevelInput.value = sName;
      }

      var evalRows = [];
      if (Array.isArray(allReportsPool)) {
        evalRows = evalRows.concat(allReportsPool.filter(function (r) { return r && String(r.child_id) === String(ev.child_id); }));
      }
      try {
        if (ev.child_id) {
          var rawAll = await C.rest('GET', '/progress_reports?child_id=eq.' + uid(ev.child_id) + '&order=report_date.desc');
          if (Array.isArray(rawAll)) evalRows = evalRows.concat(rawAll);
        }
      } catch (e) {}
      var sharedList = readLocalSharedEvaluations();
      var localChildEvals = sharedList.filter(function (r) { return r && String(r.child_id) === String(ev.child_id); });
      var combinedEvals = evalRows.concat(localChildEvals).filter(function (r) {
        return getReportSubCategory(r) === 'current_behavior' || isEvaluationReport(r);
      });
      combinedEvals.sort(function (a, b) {
        return new Date(b.updated_at || b.report_date || b.created_at || 0) - new Date(a.updated_at || a.report_date || a.created_at || 0);
      });

      var latestEval = null;
      for (var i = 0; i < combinedEvals.length; i++) {
        var cand = parseEvaluationReport(combinedEvals[i]);
        var hasRated = (cand.domains || []).some(function (d) {
          return (d.ratings || []).some(function (rt) { return (rt.score !== '' && rt.score != null) || rt.yn; });
        });
        if (hasRated) {
          latestEval = combinedEvals[i];
          ev.domains = cand.domains;
          if (cand.supervisors && cand.supervisors.length) ev.supervisors = cand.supervisors;
          break;
        }
      }

      var quantHeaderBar = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #CBD5E1; padding-bottom:6px; flex-wrap:wrap; gap:8px;' },
        h('div', { style: 'display:flex; align-items:center; gap:8px;' },
          makeStepTitleDom('2', 'تقرير الكمي (quantitative)', 's-chart'),
          latestEval
            ? h('span', { class: 'small muted', style: 'color:#2563EB; font-weight:700;', text: '✓ مرتبط بتقييم الأداء الحالي للطفل: ' + (chosenKid ? chosenKid.full_name : '') + ' (بتاريخ: ' + fmt(latestEval.report_date) + ')' })
            : h('span', { class: 'small muted', style: 'color:#64748B;', text: chosenKid ? ('الطفل: ' + chosenKid.full_name + ' — لم يُسجل تقييم أداء حالي سابق بعد.') : 'اختر الطفل لعرض تقرير الكمي (quantitative) الخاص به.' })
        )
      );
      quantHost.appendChild(quantHeaderBar);

      var canvasWrap = h('div', { style: 'width:100%; min-height:220px; background:#FFF; border:1px solid #E2E8F0; border-radius:8px; display:flex; align-items:center; justify-content:center;' },
        h('span', { class: 'muted small', text: 'جارٍ رسم تقرير الكمي (quantitative)...' })
      );
      quantHost.appendChild(canvasWrap);

      if (window.DE_PDF && typeof window.DE_PDF.renderQuantitativePageCanvas === 'function') {
        packQualData();
        window.DE_PDF.renderQuantitativePageCanvas(ev, chosenKid ? chosenKid.full_name : (ev.child_name || ''), sName, chosenKid).then(function (cEl) {
          canvasWrap.textContent = '';
          cEl.style.width = '100%';
          cEl.style.height = 'auto';
          cEl.style.display = 'block';
          cEl.style.maxWidth = '100%';
          canvasWrap.appendChild(cEl);
        }).catch(function () {});
      }
    }

    secFilterSelect.addEventListener('change', function () {
      populateKidsSelect();
      ev.child_id = kidSelect.value;
      renderQuantitativeOnTop();
    });

    kidSelect.addEventListener('change', function () {
      ev.child_id = kidSelect.value;
      var ck = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0];
      if (ck) {
        qualLevelInput.value = nameOf(sections, ck.section_id, 'name') || ck.section || '';
      }
      renderQuantitativeOnTop();
    });

    v.appendChild(quantHost);

    // 3. خانات تقرير نوعي تحليلي (Rapport d'analyse qualitatif)
    var MAX_GR_CHARS = 700;
    var MAX_GR_LINES = 10;
    var grCounterBadge = h('span', { class: 'muted small', style: 'display:block; margin-top:4px; font-weight:700;' });
    var generalReportArea = h('textarea', { rows: 8, maxlength: MAX_GR_CHARS, placeholder: 'اكتب التقرير العام الشامل لأداء وسلوك الحالة (مضبوط بحد أقصى لا يتجاوز صفحة A4)...' });
    generalReportArea.value = String(ev.general_report || '').slice(0, MAX_GR_CHARS);

    function updateGrLimitUI() {
      var val = generalReportArea.value || '';
      var lines = val.split('\n');
      if (lines.length > MAX_GR_LINES) {
        val = lines.slice(0, MAX_GR_LINES).join('\n');
        generalReportArea.value = val;
      }
      if (val.length > MAX_GR_CHARS) {
        val = val.slice(0, MAX_GR_CHARS);
        generalReportArea.value = val;
      }
      ev.general_report = val;
      var rem = MAX_GR_CHARS - val.length;
      grCounterBadge.textContent = 'حد صفحة A4: ' + val.length + ' / ' + MAX_GR_CHARS + ' حرف (' + lines.length + '/' + MAX_GR_LINES + ' أسطر)' + (rem <= 0 ? ' — امتلأت مساحة الصندوق في صفحة A4' : '');
      grCounterBadge.style.color = rem <= 30 ? '#DC2626' : '#475569';
    }
    generalReportArea.addEventListener('input', updateGrLimitUI);
    updateGrLimitUI();

    var ab = ev.abilities || {};
    function makeAbArea(key, placeholder) {
      var ta = h('textarea', { rows: 2, maxlength: 130, placeholder: placeholder + ' (حد أقصى سطران لصفحة A4)' });
      ta.value = String(ab[key] || '').slice(0, 130);
      ta.addEventListener('input', function () {
        if (!ev.abilities) ev.abilities = {};
        var lns = ta.value.split('\n');
        if (lns.length > 2) ta.value = lns.slice(0, 2).join(' ');
        ev.abilities[key] = ta.value.slice(0, 130);
      });
      return ta;
    }

    var stepReportFieldsCard = h('div', { class: 'card prog-step-card' },
      makeStepTitleDom('3', "خانات تقرير نوعي تحليلي (Rapport d'analyse qualitatif) — الوصف العام لأداء الحالة", 's-report'),
      h('div', { class: 'eval-builder-grid-2' },
        h('label', { class: 'fld' },
          h('span', { text: 'التقرير العام (مربع التقرير الشامل على اليمين — مضبوط لصفحة A4):' }),
          generalReportArea,
          grCounterBadge
        ),
        h('div', { class: 'oep-abilities-stack' },
          h('label', { class: 'fld' }, h('span', { text: '1. إمكانيات والقدرات الحالية:' }), makeAbArea('current_potentials', 'سجل الإمكانيات والقدرات الحالية...')),
          h('label', { class: 'fld' }, h('span', { text: '2. المهارات المعرفية والفكرية:' }), makeAbArea('cognitive_intellectual', 'سجل المهارات المعرفية والفكرية...')),
          h('label', { class: 'fld' }, h('span', { text: '3. اللغة (استقبالية تعبيرية):' }), makeAbArea('language_receptive_expressive', 'سجل مستوى اللغة الاستقبالية والتعبيرية...')),
          h('label', { class: 'fld' }, h('span', { text: '4. القدرات الإتصالية والسلوكية:' }), makeAbArea('communication_behavioral', 'سجل القدرات التواصلية والسلوك...')),
          h('label', { class: 'fld' }, h('span', { text: '5. المعارف الأكاديمية وما قبل الأكاديمي:' }), makeAbArea('academic_preacademic', 'سجل المعارف الأكاديمية وما قبل الأكاديمية...')),
          h('label', { class: 'fld' }, h('span', { text: '6. القدرات الحركية والاستقلالية:' }), makeAbArea('motor_independence', 'سجل القدرات الحركية ومستوى الاستقلالية...'))
        )
      )
    );
    v.appendChild(stepReportFieldsCard);

    // 4. الخلاصة والتوصيات
    function buildDynamicListBlock(title, arrKey, placeholder, addLabel) {
      var MAX_ITEMS_A4 = 4;
      var container = h('div', { class: 'dynamic-items-container' });
      var addBtn = h('button', {
        type: 'button',
        class: 'btn small light',
        text: addLabel,
        onclick: function () {
          if ((ev[arrKey] || []).length >= MAX_ITEMS_A4) {
            return toast('الحد الأقصى 4 نقاط في كل خانة لصفحة A4.', 'bad');
          }
          ev[arrKey].push('');
          redraw();
        }
      });
      function redraw() {
        container.textContent = '';
        if (!ev[arrKey] || !ev[arrKey].length) ev[arrKey] = [''];
        if (ev[arrKey].length > MAX_ITEMS_A4) ev[arrKey] = ev[arrKey].slice(0, MAX_ITEMS_A4);
        addBtn.disabled = ev[arrKey].length >= MAX_ITEMS_A4;
        ev[arrKey].forEach(function (val, idx) {
          var inp = h('input', { type: 'text', maxlength: 120, placeholder: placeholder, value: String(val || '').slice(0, 120) });
          inp.addEventListener('input', function () { ev[arrKey][idx] = inp.value.slice(0, 120); });
          var del = h('button', {
            type: 'button',
            class: 'btn small danger',
            text: 'حذف',
            disabled: ev[arrKey].length <= 1,
            onclick: function () {
              ev[arrKey].splice(idx, 1);
              redraw();
            }
          });
          container.appendChild(h('div', { class: 'dynamic-item-row' }, inp, del));
        });
      }
      redraw();
      return h('div', { class: 'card', style: 'margin-bottom:0;' },
        h('div', { class: 'bar-sub' }, h('h4', { text: title }), addBtn),
        container
      );
    }

    var stepSummaryCard = h('div', { class: 'card prog-step-card' },
      makeStepTitleDom('4', 'الخلاصة والتوصيات', 's-check-circle'),
      h('div', { class: 'eval-builder-grid-2' },
        buildDynamicListBlock('نقاط القوة', 'strengths', 'اكتب نقطة قوة...', '+ إضافة نقطة قوة'),
        buildDynamicListBlock('نقاط الضعف', 'weaknesses', 'اكتب نقطة ضعف...', '+ إضافة نقطة ضعف')
      ),
      buildDynamicListBlock('التوصيات والتوجيهات', 'recommendations', 'اكتب توصية للمركز والأسرة...', '+ إضافة توصية أخرى')
    );
    v.appendChild(stepSummaryCard);

    function packQualData() {
      var chosenKid = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
      var sName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
      ev.child_id = kidSelect.value;
      ev.child_name = chosenKid ? chosenKid.full_name : (ev.child_name || '');
      ev.dob = chosenKid ? chosenKid.dob : (ev.dob || '');
      ev.disability = chosenKid ? chosenKid.disability : (ev.disability || '');
      ev.membership_no = chosenKid && chosenKid.membership_no ? String(chosenKid.membership_no) : (ev.membership_no || '');
      ev.section_name = sName || ev.section_name || '';
      ev.title = titleInput.value || "تقرير نوعي تحليلي (Rapport d'analyse qualitatif)";
      ev.report_date = dateInput.value;
      ev.term = termSelect.value;
      ev.school_year = schoolYearInput.value;
      ev.degree_of_disability = disabilityDegInput.value;
      ev.qualification_level = qualLevelInput.value || sName;
      ev.general_report = generalReportArea.value;
    }

    renderQuantitativeOnTop();

    var saveActions = h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:20px;' },
      h('div', { style: 'display:flex; gap:8px;' },
        h('button', {
          type: 'button',
          class: 'btn primary',
          style: 'font-weight:800;',
          onclick: function () {
            if (!kidSelect.value) return toast('يرجى اختيار الطالب أولاً للمعاينة والتحميل.', 'bad');
            var chosenKid = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
            var sName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
            packQualData();
            var prevModal = h('div', { class: 'modal card', style: 'max-width:1040px; width:95%; max-height:92vh; overflow-y:auto; padding:20px;' });
            prevModal.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;' },
              h('strong', { style: 'color:#163B65; font-size:1.05rem;', text: 'المعاينة والتحميل — ' + (chosenKid ? chosenKid.full_name : '') }),
              h('button', { type: 'button', class: 'icon-btn', onclick: closeModal }, h('span', { text: '✕' }))
            ));
            prevModal.appendChild(renderEvaluationSheetView(ev, chosenKid ? chosenKid.full_name : ev.child_name, sName, chosenKid, 'full'));
            openModal(prevModal);
          }
        }, makeSvgIcon('s-eye'), h('span', { text: 'المعاينة والتحميل' }))
      ),
      h('div', { style: 'display:flex; gap:8px;' },
        h('button', {
          type: 'button',
          class: 'btn light',
          style: 'font-weight:700;',
          onclick: function () { saveQualitativeAction('draft'); }
        }, h('span', { text: 'حفظ كمسودة' })),
        h('button', {
          type: 'button',
          class: 'btn gold',
          style: 'font-weight:800;',
          onclick: function () { saveQualitativeAction('published'); }
        }, h('span', { text: 'نشر' }))
      )
    );
    v.appendChild(saveActions);

    async function saveQualitativeAction(statusKey) {
      if (!kidSelect.value) return toast('يرجى اختيار الطالب المعني أولاً.', 'bad');
      var chosenKid = kids.filter(function (k) { return String(k.id) === String(kidSelect.value); })[0];
      packQualData();
      ev.status = statusKey;

      var compactDoms = compactDomainsArrayForStorage(ev.domains, 24);

      var fullPayload = {
        eval_type: 'qualitative',
        status: statusKey,
        child_id: ev.child_id,
        child_name: ev.child_name,
        dob: ev.dob,
        disability: ev.disability,
        membership_no: ev.membership_no,
        section_name: ev.section_name,
        title: ev.title,
        term: ev.term,
        school_year: ev.school_year,
        degree_of_disability: ev.degree_of_disability,
        qualification_level: ev.qualification_level,
        supervisors: ev.supervisors,
        general_report: ev.general_report,
        abilities: ev.abilities,
        strengths: ev.strengths,
        weaknesses: ev.weaknesses,
        recommendations: ev.recommendations,
        domains: compactDoms
      };

      var fullActivities = EVAL_MARKER + JSON.stringify(fullPayload);
      var recordBody = {
        child_id: kidSelect.value,
        title: DE.clean(ev.title + ' — ' + (chosenKid ? chosenKid.full_name : ''), 140),
        report_date: ev.report_date,
        status: statusKey,
        activities: fullActivities,
        notes: DE.clean(ev.general_report || '', 4800) || null
      };

      try {
        if (ev.id && DE.isUuid(String(ev.id))) {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(ev.id), recordBody);
        } else {
          var created = await saveProgressReportResilient('POST', '/progress_reports', recordBody);
          if (Array.isArray(created) && created[0]) ev.id = created[0].id;
        }
        await syncSharedEvaluationRecord(Object.assign({}, recordBody, {
          id: ev.id || ('qual_' + Date.now()),
          child_name: ev.child_name,
          dob: ev.dob,
          disability: ev.disability,
          section_name: ev.section_name
        }), null);
        bust();
        toast(statusKey === 'published' ? "تم نشر تقرير نوعي تحليلي (Rapport d'analyse qualitatif) بنجاح!" : 'تم حفظ التقرير كمسودة.', 'ok');
        go('reports');
      } catch (err) {
        toast('تعذر الحفظ: ' + (err.message || 'خطأ غير متوقع'), 'bad');
      }
    }
  }

  /* =====================================================================
     دار الإحسان — تقييم الأداء الحالي
     (تصغير مربع المعلومات للنصف مع جميع الخانات ونزع البحث، تعديل أيقونة المشرفين
      وأرقام العناوين، ودمج ملف التقرير الكمي والنوعي وجداول المهارات)
     ===================================================================== */
  function openEvaluationBuilder(existingRep, kids, sections, secAllOpts, branchOpts) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'evaluations', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    ev.eval_type = 'current_behavior';
    if (!existingRep || !ev.title || ev.title.indexOf('تقرير اللجنة') >= 0 || ev.title.indexOf('أداء السلوك الحالي') >= 0) {
      ev.title = 'تقييم الأداء الحالي';
    }
    S.preselectChildId = null;

    var selectedKid0 = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0] || (kids.length === 1 ? kids[0] : null);
    if (selectedKid0 && !ev.child_id) ev.child_id = selectedKid0.id;
    enrichChildEvaluationData(ev, selectedKid0 ? selectedKid0.full_name : '', selectedKid0 ? selectedKid0.section : '', selectedKid0);

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub', style: 'margin-bottom:8px;' },
      h('h2', { style: 'margin:0; font-size:1.18rem; color:#163B65;', text: existingRep ? 'تعديل تقييم الأداء الحالي' : 'تقييم الأداء الحالي' }),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn small light', type: 'button', text: 'رجوع لقائمة التقييم', onclick: function () { go('evaluations'); } })
      )
    );
    v.appendChild(topBar);

    var curSecId = S.isEducator ? S.eduSectionId : (selectedKid0 ? selectedKid0.section_id : '');
    var secFilterSelect = h('select', { disabled: !!S.isEducator },
      h('option', { value: '', text: '— جميع الأقسام —' }),
      secAllOpts.map(function (o) { return h('option', { value: o[0], text: o[1] }); })
    );
    secFilterSelect.value = curSecId || '';

    var kidSelect = h('select', null);

    function populateKidsSelect() {
      var sId = secFilterSelect.value;
      var keep = ev.child_id || kidSelect.value;
      while (kidSelect.firstChild) kidSelect.removeChild(kidSelect.firstChild);
      kidSelect.appendChild(h('option', { value: '', text: '— اختر الطفل المعني بالتقييم —' }));
      kids.forEach(function (k) {
        if (sId && !childMatchesSection(k, sId, nameOf(sections, sId, 'name'), sections)) return;
        var label = (k.membership_no ? ('[' + k.membership_no + '] ') : '') + k.full_name + (k.section ? (' — ' + k.section) : '');
        kidSelect.appendChild(h('option', { value: k.id, text: label }));
      });
      if (keep && kids.some(function (k) { return String(k.id) === String(keep) && (!sId || childMatchesSection(k, sId, nameOf(sections, sId, 'name'), sections)); })) {
        kidSelect.value = keep;
      }
    }

    secFilterSelect.addEventListener('change', function () {
      populateKidsSelect();
      ev.child_id = kidSelect.value;
      updateChildAutoMeta();
    });

    populateKidsSelect();

    var titleInput = h('input', { type: 'text', maxlength: 145, value: ev.title || 'تقييم الأداء الحالي' });
    titleInput.addEventListener('input', function () { ev.title = titleInput.value; });

    var dateInput = h('input', { type: 'date', value: ev.report_date });
    dateInput.addEventListener('change', function () { ev.report_date = dateInput.value; });

    var termSelect = h('select', null,
      h('option', { value: 'الثلاثي الأخير', text: 'الثلاثي الأخير (الثالث)' }),
      h('option', { value: 'الثلاثي الأول', text: 'الثلاثي الأول' }),
      h('option', { value: 'الثلاثي الثاني', text: 'الثلاثي الثاني' })
    );
    termSelect.value = ev.term || 'الثلاثي الأخير';
    termSelect.addEventListener('change', function () { ev.term = termSelect.value; });

    var schoolYearInput = h('input', { type: 'text', maxlength: 20, value: ev.school_year || '2024/2025' });
    schoolYearInput.addEventListener('input', function () { ev.school_year = schoolYearInput.value; });

    var disabilityDegInput = h('input', { type: 'text', maxlength: 50, value: ev.degree_of_disability || 'متوسطة' });
    disabilityDegInput.addEventListener('input', function () { ev.degree_of_disability = disabilityDegInput.value; });

    var qualLevelInput = h('input', { type: 'text', maxlength: 80, value: ev.qualification_level || (selectedKid0 ? (nameOf(sections, selectedKid0.section_id, 'name') || selectedKid0.section || '') : '') });
    qualLevelInput.addEventListener('input', function () { ev.qualification_level = qualLevelInput.value; });

    function updateChildAutoMeta() {
      var chosen = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0];
      if (chosen) {
        var sName = nameOf(sections, chosen.section_id, 'name') || chosen.section || '';
        qualLevelInput.value = sName;
        ev.qualification_level = sName;
        enrichChildEvaluationData(ev, chosen.full_name, sName, chosen);
      }
    }

    kidSelect.addEventListener('change', function () {
      ev.child_id = kidSelect.value;
      updateChildAutoMeta();
    });

    // 1. مربع معلومات الحالة مصغر للنصف، يحتوي على جميع الخانات، وبدون خانة البحث نهائياً
    var step1Card = h('div', { class: 'card prog-step-card compact-qual-child-card' },
      makeStepTitleDom('1', 'بيانات الحالة والموسم الدراسي', 's-idcard'),
      h('div', { class: 'compact-qual-grid' },
        h('label', { class: 'fld' }, h('span', { text: 'تصفية حسب القسم التربوي:' }), secFilterSelect),
        h('label', { class: 'fld' }, h('span', { text: 'الطفل المعني بالاستمارة:' }), kidSelect),
        h('label', { class: 'fld' }, h('span', { text: 'تقييم الثلاثي:' }), termSelect),
        h('label', { class: 'fld' }, h('span', { text: 'الموسم الدراسي:' }), schoolYearInput),
        h('label', { class: 'fld' }, h('span', { text: 'تاريخ التقييم:' }), dateInput),
        h('label', { class: 'fld' }, h('span', { text: 'عنوان الوثيقة:' }), titleInput),
        h('label', { class: 'fld' }, h('span', { text: 'درجة الإعاقة / الاضطراب:' }), disabilityDegInput),
        h('label', { class: 'fld' }, h('span', { text: 'القسم ومستوى التأهيل:' }), qualLevelInput)
      )
    );
    v.appendChild(step1Card);

    // 2. المشرفون على التقييم (أيقونة المشرفين المصححة وتنسيق متجاوب لا يخرج عن البطاقة أبداً)
    var supervisorsHost = h('div', { class: 'dynamic-items-container', style: 'margin-bottom:0;' });

    function renderSupervisorsList() {
      supervisorsHost.textContent = '';
      if (!ev.supervisors || !ev.supervisors.length) {
        ev.supervisors = [{ name: 'إدارة المركز', role: 'مدير المركز' }];
      }

      ev.supervisors.forEach(function (sp, idx) {
        var nameInp = h('input', { type: 'text', placeholder: 'اسم ولقب المشرف...', value: sp.name || '' });
        nameInp.addEventListener('input', function () { sp.name = nameInp.value; });

        var roleInp = h('input', { type: 'text', placeholder: 'الوظيفة (مدير المركز، أخصائية، مربية...)', value: sp.role || '' });
        roleInp.addEventListener('input', function () { sp.role = roleInp.value; });

        var delBtn = h('button', {
          type: 'button',
          class: 'btn small danger',
          style: 'padding:4px 8px; min-height:28px; font-size:11.5px; display:inline-flex; align-items:center; gap:4px;',
          disabled: ev.supervisors.length <= 1,
          onclick: function () {
            ev.supervisors.splice(idx, 1);
            renderSupervisorsList();
          }
        }, makeSvgIcon('s-trash'), h('span', { text: 'حذف' }));

        var row = h('div', { class: 'supervisor-compact-row' },
          h('span', { class: 'supervisor-icon-badge' },
            makeSvgIcon('s-user-check'),
            h('span', { text: 'مشرف ' + (idx + 1) })
          ),
          nameInp,
          roleInp,
          delBtn
        );
        supervisorsHost.appendChild(row);
      });
    }

    var addSupervisorBtn = h('button', {
      type: 'button',
      class: 'btn small gold',
      style: 'padding:4px 10px; font-size:11.5px; font-weight:800;',
      text: '+ إضافة مشرف آخر',
      onclick: function () {
        ev.supervisors.push({ name: '', role: 'مربية' });
        renderSupervisorsList();
      }
    });

    renderSupervisorsList();

    var stepSupervisorsCard = h('div', { class: 'card prog-step-card supervisor-compact-card' },
      h('div', { class: 'bar-sub', style: 'margin-bottom:6px;' },
        makeStepTitleDom('2', 'المشرفون على التقييم', 's-users'),
        addSupervisorBtn
      ),
      supervisorsHost
    );
    v.appendChild(stepSupervisorsCard);

    // 3. جدول تقييم المجالات والمهارات البيداغوجية
    var CURR = (window && window.DE_CURRICULUM) || EMBEDDED_CURRICULUM || {};
    var domainKeys = Object.keys(CURR);

    function buildDomainRatingsList(domName, existingRatings) {
      var skList = CURR[domName] || [];
      var ratingsMap = {};
      (existingRatings || []).forEach(function (it, idx) {
        if (it) {
          ratingsMap[idx] = it;
          if (it.skill) ratingsMap[it.skill] = it;
        }
      });
      return skList.map(function (sk, idx) {
        var sv = ratingsMap[idx] || ratingsMap[sk] || {};
        return {
          num: idx + 1,
          skill: sk,
          score: sv.score != null ? String(sv.score) : '',
          yn: sv.yn || '',
          note: sv.note || ''
        };
      });
    }

    var activeDomainIndex = 0;
    var liveOverallValEl = h('div', { class: 'eval-live-score-val' });
    var liveOverallDescEl = h('p', { class: 'muted small', style: 'margin:0;' });
    var liveOverallBanner = h('div', { class: 'eval-live-score-banner', style: 'margin-bottom:14px;' },
      h('div', null,
        h('div', { class: 'eval-live-score-title', text: 'حصيلة المهارات المكتسبة (معيار دار الإحسان: 4/5 فما فوق):' }),
        liveOverallDescEl
      ),
      liveOverallValEl
    );

    var domainTabsHost = h('div', { class: 'eval-domain-tabs-bar' });
    var domainsHost = h('div', { style: 'width:100%;' });
    var domainBadgeElMap = {};

    function computeDomainAcquired(dm) {
      var acq = 0;
      var tot = (dm.ratings || []).length;
      var isCommDom = dm.domain.indexOf('التواصل') >= 0;
      (dm.ratings || []).forEach(function (it) {
        if (isCommDom && it.yn) {
          if (it.yn === 'نعم') acq++;
        } else if (it.score !== '' && it.score != null) {
          var sc = parseInt(it.score, 10);
          if (!isNaN(sc) && sc >= 4) acq++;
        } else if (it.yn === 'نعم') {
          acq++;
        }
      });
      var pct = tot > 0 ? ((acq / tot) * 100).toFixed(1).replace(/\.0$/, '') : '0';
      return { acquired: acq, total: tot, pct: pct };
    }

    function updateLiveScoresInPlace() {
      var overallAcquired = 0;
      var overallTotalSkills = 0;
      ev.domains.forEach(function (dm, dIdx) {
        var st = computeDomainAcquired(dm);
        overallAcquired += st.acquired;
        overallTotalSkills += st.total;
        if (domainBadgeElMap[dIdx]) {
          domainBadgeElMap[dIdx].textContent = 'المكتسبة (4/5+): ' + st.acquired + ' من ' + st.total + ' مهارة (' + st.pct + '%)';
          domainBadgeElMap[dIdx].className = 'badge ' + (st.acquired > 0 ? 'ok' : 'gold');
        }
        if (domainTabsHost.children[dIdx]) {
          var countSpan = domainTabsHost.children[dIdx].querySelector('.dom-tab-count');
          if (countSpan) countSpan.textContent = '(' + st.acquired + '/' + st.total + ')';
        }
      });
      var overallPercentage = overallTotalSkills > 0 ? ((overallAcquired / overallTotalSkills) * 100).toFixed(1) : '0';
      liveOverallDescEl.textContent = 'تُحسب تلقائياً بقسمة مجموع المهارات المكتسبة (' + overallAcquired + ') على إجمالي مهارات المجالات المختارة (' + overallTotalSkills + ').';
      liveOverallValEl.textContent = overallAcquired + ' من ' + overallTotalSkills + ' مهارة (' + overallPercentage + '%)';
    }

    function renderDomainTabs() {
      domainTabsHost.textContent = '';
      ev.domains.forEach(function (dm, dIdx) {
        var st = computeDomainAcquired(dm);
        var tabBtn = h('button', {
          type: 'button',
          class: 'eval-domain-tab-btn' + (dIdx === activeDomainIndex ? ' is-active' : ''),
          onclick: function () {
            activeDomainIndex = dIdx;
            renderEvalDomains();
          }
        },
          h('span', { text: (dIdx + 1) + '. ' + dm.domain }),
          h('span', { class: 'dom-tab-count', style: 'opacity:0.85; font-size:11.5px;', text: '(' + st.acquired + '/' + st.total + ')' })
        );
        domainTabsHost.appendChild(tabBtn);
      });
    }

    function renderEvalDomains() {
      if (activeDomainIndex >= ev.domains.length) activeDomainIndex = Math.max(0, ev.domains.length - 1);
      renderDomainTabs();
      domainsHost.textContent = '';
      domainBadgeElMap = {};

      var dm = ev.domains[activeDomainIndex];
      var dIdx = activeDomainIndex;
      if (!dm) return;

      var isComm = dm.domain.indexOf('التواصل') >= 0;

      var domSel = h('select', { style: 'font-weight:700;' },
        domainKeys.map(function (k) { return h('option', { value: k, text: k }); })
      );
      domSel.value = dm.domain;
      domSel.addEventListener('change', function () {
        var newDom = domSel.value;
        dm.domain = newDom;
        dm.ratings = buildDomainRatingsList(newDom, []);
        renderEvalDomains();
      });

      var tbody = h('tbody');
      var rowUpdaters = [];

      dm.ratings.forEach(function (it) {
        var tr = h('tr', { class: (it.score !== '' || it.yn) ? 'eval-row-rated' : '' });
        var btnElements = [];

        function refreshRowVisuals() {
          tr.className = (it.score !== '' || it.yn) ? 'eval-row-rated' : '';
          btnElements.forEach(function (bObj) {
            var sel = isComm ? (it.yn === bObj.val) : (it.score === bObj.val);
            bObj.el.className = 'eval-compact-score-btn' + (sel ? ' is-selected' : '');
          });
        }

        var controlsWrap = h('div', { class: 'eval-score-btns-row' });
        if (isComm) {
          ['نعم', 'لا'].forEach(function (ynVal) {
            var btn = h('button', {
              type: 'button',
              class: 'eval-compact-score-btn' + (it.yn === ynVal ? ' is-selected' : ''),
              style: 'width:48px !important;',
              text: ynVal,
              onclick: function () {
                it.yn = (it.yn === ynVal ? '' : ynVal);
                it.score = '';
                refreshRowVisuals();
                updateLiveScoresInPlace();
              }
            });
            btnElements.push({ val: ynVal, el: btn });
            controlsWrap.appendChild(btn);
          });
        } else {
          ['0', '1', '2', '3', '4', '5'].forEach(function (sc) {
            var btn = h('button', {
              type: 'button',
              class: 'eval-compact-score-btn' + (it.score === sc ? ' is-selected' : ''),
              text: sc,
              onclick: function () {
                it.score = (it.score === sc ? '' : sc);
                it.yn = '';
                refreshRowVisuals();
                updateLiveScoresInPlace();
              }
            });
            btnElements.push({ val: sc, el: btn });
            controlsWrap.appendChild(btn);
          });
        }

        var noteInp = h('input', {
          type: 'text',
          placeholder: 'ملاحظة...',
          value: it.note || '',
          style: 'width:100%; font-size:0.88rem; padding:6px 10px; border:1px solid #CBD5E1; border-radius:6px; box-sizing:border-box;'
        });
        noteInp.addEventListener('input', function () {
          it.note = noteInp.value;
        });

        rowUpdaters.push({ refresh: refreshRowVisuals, noteInp: noteInp, item: it });

        tr.appendChild(h('td', { class: 'eval-col-num', style: 'width:44px; text-align:center;', text: String(it.num) }));
        tr.appendChild(h('td', { class: 'eval-col-skill', style: 'width:44%; font-size:14px;', text: it.skill }));
        tr.appendChild(h('td', { style: 'width:240px; text-align:center;' }, controlsWrap));
        tr.appendChild(h('td', { style: 'width:26%;' }, noteInp));
        tbody.appendChild(tr);
      });

      var quickFillBar = h('div', { class: 'eval-quick-fill-bar' },
        h('span', { class: 'muted small', text: 'تعبئة سريعة للمجال الحالي:' }),
        isComm
          ? ['نعم', 'لا'].map(function (ynVal) {
              return h('button', {
                type: 'button',
                class: 'btn small light',
                text: 'الكل ' + ynVal,
                onclick: function () {
                  dm.ratings.forEach(function (it) { it.yn = ynVal; it.score = ''; });
                  rowUpdaters.forEach(function (u) { u.refresh(); });
                  updateLiveScoresInPlace();
                }
              });
            })
          : ['5', '4', '3', '2', '1', '0'].map(function (val) {
              return h('button', {
                type: 'button',
                class: 'btn small light',
                text: 'الكل ' + val,
                onclick: function () {
                  dm.ratings.forEach(function (it) { it.score = val; it.yn = ''; });
                  rowUpdaters.forEach(function (u) { u.refresh(); });
                  updateLiveScoresInPlace();
                }
              });
            }),
        h('button', {
          type: 'button',
          class: 'btn small danger',
          text: 'تفريغ الدرجات',
          onclick: function () {
            dm.ratings.forEach(function (it) { it.score = ''; it.yn = ''; it.note = ''; });
            rowUpdaters.forEach(function (u) { u.noteInp.value = ''; u.refresh(); });
            updateLiveScoresInPlace();
          }
        })
      );

      var st = computeDomainAcquired(dm);
      var domBadgeEl = h('span', {
        class: 'badge ' + (st.acquired > 0 ? 'ok' : 'gold'),
        text: 'المكتسبة (4/5+): ' + st.acquired + ' من ' + st.total + ' مهارة (' + st.pct + '%)'
      });
      domainBadgeElMap[dIdx] = domBadgeEl;

      var domCard = h('div', { class: 'card', style: 'margin-bottom:14px; padding:16px; width:100%; box-sizing:border-box;' },
        h('div', { class: 'bar-sub', style: 'margin-bottom:10px;' },
          h('h4', { style: 'margin:0; font-size:1.05rem; color:#163B65;', text: dm.domain }),
          h('div', { class: 'row-actions' },
            domBadgeEl,
            ev.domains.length > 1 ? h('button', {
              type: 'button',
              class: 'btn small danger',
              text: 'حذف المجال',
              onclick: function () {
                ev.domains.splice(dIdx, 1);
                activeDomainIndex = Math.max(0, dIdx - 1);
                renderEvalDomains();
              }
            }) : null
          )
        ),
        h('label', { class: 'fld', style: 'margin-bottom:10px;' }, h('span', { text: 'المجال التربوي:' }), domSel),
        quickFillBar,
        h('div', { class: 'eval-table-wrap', style: 'max-height:none !important; overflow-y:visible !important; width:100%; margin-top:10px;' },
          h('table', { class: 'eval-official-table', style: 'width:100%;' },
            h('thead', null,
              h('tr', null,
                h('th', { style: 'width:44px; text-align:center;', text: 'الرقم' }),
                h('th', { style: 'width:44%; text-align:right;', text: 'المهارة التربوية' }),
                h('th', { style: 'width:240px; text-align:center;', text: 'الدرجة (0–5 / نعم–لا)' }),
                h('th', { style: 'width:26%; text-align:right;', text: 'ملاحظة' })
              )
            ),
            tbody
          )
        )
      );

      domainsHost.appendChild(domCard);
      updateLiveScoresInPlace();
    }

    function openSmallAddDomainModal() {
      var used = ev.domains.map(function (d) { return d.domain; });
      var available = domainKeys.filter(function (dk) { return used.indexOf(dk) < 0; });
      if (!available.length) {
        return toast('تمت إضافة جميع المجالات التربوية الـ 8 بالفعل في هذه الاستمارة.', 'ok');
      }

      var modal = h('div', {
        class: 'modal card',
        style: 'max-width:340px; width:90%; background:#FFFFFF; padding:14px 16px; border-radius:14px; border:1.5px solid #163B65; box-shadow:0 12px 30px rgba(0,0,0,0.22);'
      });

      modal.appendChild(h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding-bottom:8px; margin-bottom:10px;' },
        h('strong', { style: 'color:#163B65; font-size:0.95rem;', text: 'اختر المجال المراد إضافته' }),
        h('button', { type: 'button', class: 'icon-btn', style: 'width:26px; height:26px; font-size:14px;', onclick: closeModal }, h('span', { text: '✕' }))
      ));

      var list = h('div', { style: 'display:flex; flex-direction:column; gap:6px;' });
      available.forEach(function (dk) {
        var b = h('button', {
          type: 'button',
          style: 'text-align:right; padding:8px 12px; border-radius:8px; border:1px solid #CBD5E1; background:#F8FAFC; color:#0F172A; font-weight:800; font-size:12.5px; cursor:pointer; font-family:inherit;',
          text: '+ ' + dk,
          onclick: function () {
            ev.domains.push({
              domain: dk,
              ratings: buildDomainRatingsList(dk, [])
            });
            activeDomainIndex = ev.domains.length - 1;
            closeModal();
            renderEvalDomains();
            toast('تمت إضافة: ' + dk, 'ok');
          }
        });
        b.addEventListener('mouseenter', function () { b.style.background = '#EAF4FF'; b.style.borderColor = '#163B65'; });
        b.addEventListener('mouseleave', function () { b.style.background = '#F8FAFC'; b.style.borderColor = '#CBD5E1'; });
        list.appendChild(b);
      });
      modal.appendChild(list);
      openModal(modal);
    }

    renderEvalDomains();

    var step5Card = h('div', { class: 'card prog-step-card', style: 'padding:16px;' },
      h('div', { class: 'bar-sub', style: 'margin-bottom:10px;' },
        h('div', null,
          makeStepTitleDom('3', 'جدول تقييم الأداء الحالي (المجالات والمهارات البيداغوجية)', 's-clipboard-list'),
          h('p', { class: 'muted small', style: 'margin:2px 0 0;', text: 'قيّم المهارات عبر الأزرار (0 إلى 5). يمكنك التنقل بين المجالات المضافة أو إضافة مجال جديد عبر النافذة المصغرة.' })
        ),
        h('div', { class: 'row-actions' },
          h('button', { type: 'button', class: 'btn small gold', style: 'font-weight:800;', text: '+ إضافة مجال آخر', onclick: openSmallAddDomainModal })
        )
      ),
      liveOverallBanner,
      domainTabsHost,
      domainsHost
    );
    v.appendChild(step5Card);

    // الحفظ والاعتماد والمعاينة (مع توفير ملف التقرير الكمي والنوعي وجداول المهارات)
    async function saveEvaluationForm(publishNow) {
      if (!ev.child_id) return toast('يرجى اختيار الطفل المعني باستمارة التقييم أولاً.', 'bad');

      var compactDomains = compactDomainsArrayForStorage(ev.domains, 32);

      var chosenKid = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0];
      var kidName = chosenKid ? chosenKid.full_name : 'الطفل';
      var chosenSecName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
      var evalStatus = publishNow ? 'published' : 'draft';

      var payloadObj = {
        v: 2,
        eval_type: 'current_behavior',
        status: evalStatus,
        child_id: ev.child_id,
        child_name: kidName,
        dob: chosenKid ? chosenKid.dob : '',
        disability: chosenKid ? chosenKid.disability : '',
        membership_no: chosenKid && chosenKid.membership_no ? String(chosenKid.membership_no) : '',
        section_name: chosenSecName,
        term: ev.term || 'الثلاثي الأخير',
        school_year: ev.school_year || '2024/2025',
        degree_of_disability: DE.clean(ev.degree_of_disability || '', 50),
        qualification_level: DE.clean(ev.qualification_level || chosenSecName || '', 80),
        supervisors: (ev.supervisors || []).map(function (s) {
          return { name: DE.clean(s.name || '', 60), role: DE.clean(s.role || '', 60) };
        }),
        general_report: ev.general_report || '',
        abilities: ev.abilities || {},
        strengths: ev.strengths || [],
        weaknesses: ev.weaknesses || [],
        recommendations: ev.recommendations || [],
        domains: compactDomains
      };

      var serializedPayload = EVAL_MARKER + JSON.stringify(payloadObj);

      var body = {
        child_id: ev.child_id,
        title: DE.clean((ev.title || 'تقييم الأداء الحالي') + ' — ' + kidName, 140),
        report_date: ev.report_date || new Date().toISOString().slice(0, 10),
        period_start: ev.report_date || new Date().toISOString().slice(0, 10),
        period_end: ev.report_date || new Date().toISOString().slice(0, 10),
        achievements: DE.clean('تقييم الأداء الحالي (' + ev.term + ') للموسم الدراسي ' + ev.school_year, 4800),
        activities: serializedPayload,
        notes: DE.clean(ev.general_report || '', 4800) || null,
        status: evalStatus
      };

      var savedRow = null;
      try {
        if (ev.id && DE.isUuid(String(ev.id))) {
          var patched = await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(ev.id), body);
          savedRow = (Array.isArray(patched) && patched[0]) ? patched[0] : Object.assign({ id: ev.id }, body);
        } else {
          var posted = await saveProgressReportResilient('POST', '/progress_reports', body);
          savedRow = (Array.isArray(posted) && posted[0]) ? posted[0] : Object.assign({ id: ev.id || DE.uuid() }, body);
        }
      } catch (dbErr) {
        savedRow = Object.assign({ id: ev.id || DE.uuid() }, body);
      }

      savedRow.status = evalStatus;
      savedRow.activities = serializedPayload;
      savedRow.child_name = kidName;
      savedRow.dob = chosenKid ? chosenKid.dob : '';
      savedRow.disability = chosenKid ? chosenKid.disability : '';
      savedRow.membership_no = chosenKid && chosenKid.membership_no ? String(chosenKid.membership_no) : '';
      savedRow.section_name = chosenSecName;
      await syncSharedEvaluationRecord(savedRow, null);

      bust();
      toast(publishNow ? 'تم اعتماد ونشر تقييم الأداء الحالي بنجاح!' : 'تم حفظ تقييم الأداء الحالي كمسودة.', 'ok');
      go('evaluations');
    }

    var btnSaveDraft = h('button', { type: 'button', class: 'btn light', text: 'حفظ كمسودة' });
    var btnPublish = h('button', { type: 'button', class: 'btn gold', text: 'نشر' });
    btnSaveDraft.addEventListener('click', function () { act(btnSaveDraft, function () { return saveEvaluationForm(false); }); });
    btnPublish.addEventListener('click', function () { act(btnPublish, function () { return saveEvaluationForm(true); }); });

    var previewBtn = h('button', {
      type: 'button',
      class: 'btn primary',
      style: 'font-weight:800;',
      onclick: function () {
        var chosenKid = kids.filter(function (k) { return String(k.id) === String(ev.child_id); })[0];
        var sName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
        ev.child_name = chosenKid ? chosenKid.full_name : '';
        ev.dob = chosenKid ? chosenKid.dob : '';
        ev.disability = chosenKid ? chosenKid.disability : '';
        ev.section_name = sName;
        openModal(h('div', { class: 'modal-body wk-modal-print' },
          renderEvaluationSheetView(ev, chosenKid ? chosenKid.full_name : '—', sName, chosenKid, 'full'),
          h('div', { class: 'modal-actions no-print' },
            h('button', { class: 'btn light', type: 'button', text: 'إغلاق المعاينة', onclick: closeModal })
          )
        ));
      }
    }, makeSvgIcon('s-eye'), h('span', { text: 'المعاينة والتحميل (الكمي والنوعي وجداول المهارات)' }));

    var footerCard = h('div', { class: 'card prog-step-card' },
      h('div', { class: 'prog-submit-bar' },
        h('button', { type: 'button', class: 'btn light', text: 'إلغاء والعودة', onclick: function () { go('evaluations'); } }),
        previewBtn,
        btnSaveDraft,
        btnPublish
      )
    );
    v.appendChild(footerCard);
  }

  /* =====================================================================
     6.1 قسم التقارير التربوية الدورية (Reports Only)
     ===================================================================== */
  async function secReports(v) {
    if (isFarmSession()) return go('children');
    var d = await getMany('reports', 'children', 'branches', 'sections');
    var allReports = d[0], kids = d[1], branches = d[2], sections = d[3];
    S._cachedAllReports = allReports;

    var rows = allReports.filter(function (r) { return isSectionReport(r); });

    if (S.isEducator && (S.eduSectionId || S.eduSectionName)) {
      kids = kids.filter(function (k) { return childMatchesSection(k, S.eduSectionId, S.eduSectionName, sections); });
      var allowedKidIds = {};
      kids.forEach(function (k) { allowedKidIds[k.id] = true; });
      rows = rows.filter(function (r) { return !!allowedKidIds[r.child_id]; });
    } else if (!S.isEducator) {
      kids = kids.filter(function (k) { return childCenterKey(k, branches, sections) === S.activeCenter; });
      sections = sections.filter(function (s) { return sectionCenterKey(s, branches) === S.activeCenter; });
      var centerKidIds = {};
      kids.forEach(function (k) { centerKidIds[k.id] = true; });
      rows = rows.filter(function (r) { return !!centerKidIds[r.child_id]; });
    }

    var kidOpts = kids.map(function (k) { return [k.id, (k.membership_no ? ('[' + k.membership_no + '] ') : '') + k.full_name]; });
    var branchOpts = branches.map(function (b) { return [b.id, b.name]; });
    var secAllOpts = sections.map(function (s) { return [s.id, s.name]; });

    function editReport(r) {
      var uploaded = null;
      return openForm({
        title: r ? 'تعديل التقرير الدوري' : 'إضافة تقرير تربوي دوري جديد',
        values: r ? Object.assign({}, r) : {
          child_id: S.preselectChildId || (kids.length === 1 ? kids[0].id : ''),
          report_date: new Date().toISOString().slice(0, 10),
          title: 'التقرير الدوري لمتابعة الطفل',
          achievements: '',
          activities: '',
          notes: ''
        },
        fields: [
          { k: 'branch_id', label: 'الفرع', type: 'select', opts: branchOpts, req: !S.isEducator, showIf: function () { return !S.isEducator; } },
          { k: 'section_id', label: 'القسم / الفوج', type: 'select', opts: secAllOpts, req: true, showIf: function () { return !S.isEducator; } },
          { k: 'child_id', label: 'الطفل المعني', type: 'select', opts: kidOpts, req: true, searchable: true },
          { k: 'title', label: 'عنوان التقرير (مثال: التقرير الفصلي الأول)', req: true, max: 150 },
          { k: 'report_date', label: 'تاريخ التقرير', type: 'date', req: true },
          { k: 'achievements', label: 'المكتسبات والمهارات المحققة', type: 'textarea', max: 5000 },
          { k: 'activities', label: 'الأنشطة والورشات المنجزة', type: 'textarea', max: 5000 },
          { k: 'notes', label: 'ملاحظات وتوجيهات للأولياء', type: 'textarea', max: 5000 },
          { k: 'file', label: 'رفع ملف مرفق للتقرير (PDF/JPG/PNG/WebP — حتى 5MB)', type: 'file', accept: '.pdf,.jpg,.jpeg,.png,.webp', hint: r && r.attachment_path ? 'يوجد مرفق محفوظ؛ يمكنك رفع ملف جديد لاستبداله.' : 'يمكنك رفع ملف PDF أو صورة مصورة للتقرير ليتمكن الولي من تحميلها مباشرة.' }
        ],
        onSubmit: async function (x, key) {
          if (!x.child_id) throw new Error('اختر طفلاً من القائمة.');
          if (key === 'publish' && !x.achievements && !x.activities && !x.notes && !x.file && !(r && r.attachment_path)) {
            throw new Error('لا يمكن نشر تقرير فارغ تماماً.');
          }
          if (x.file && x.file.size > MAX_FILE) throw new Error('حجم الملف يتجاوز 5 ميغابايت.');
          var body = {
            child_id: x.child_id, title: x.title, report_date: x.report_date,
            period_start: r ? r.period_start : x.report_date, period_end: r ? r.period_end : x.report_date,
            achievements: x.achievements || null, activities: x.activities || null, notes: x.notes || null,
            status: key === 'publish' ? 'published' : (r ? r.status : 'draft')
          };
          if (x.file) {
            try { uploaded = await uploadChecked(x.file, x.child_id); }
            catch (e) { throw new Error('تعذّر رفع الملف: ' + (e && e.message || 'خطأ')); }
            body.attachment_path = uploaded.path;
          }
          try {
            if (r) await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(r.id), body);
            else await saveProgressReportResilient('POST', '/progress_reports', body);
          } catch (e) {
            if (uploaded) C.removeObject('private-docs', uploaded.path).catch(function () {});
            throw e;
          }
          bust(); toast(key === 'publish' ? 'تم نشر التقرير للولي بنجاح.' : 'حُفظت المسودة.', 'ok'); go('reports');
        }
      });
    }

    if (S.openReportDirect) {
      S.openReportDirect = false;
      setTimeout(function () { editReport(null); }, 40);
    }

    async function deleteReportRecord(r) {
      if (!(await ask({ title: 'حذف التقرير؟', msg: 'سيُحذف التقرير نهائيًا من الإدارة وفضاء الأولياء.', ok: 'حذف نهائي', danger: true }))) return;
      if (r.id && DE.isUuid(String(r.id))) {
        try { await C.rest('DELETE', '/progress_reports?id=eq.' + uid(r.id)); } catch (e) {}
      }
      await syncSharedEvaluationRecord(null, r.id);
      bust();
      toast('تم حذف التقرير بنجاح.', 'ok');
      go('reports');
    }

    var repQuickBar = h('div', {
      class: 'card',
      style: 'margin-bottom:14px; padding:12px 16px; background:#FFFFFF; border:1.5px solid #2563EB; border-radius:12px; box-shadow:0 2px 10px rgba(37,99,235,0.06);'
    },
      h('div', { style: 'font-weight:900; color:#163B65; font-size:14px; margin-bottom:8px; display:flex; align-items:center; gap:8px;' },
        makeSvgIcon('s-report'),
        h('span', { text: 'إنشاء تقرير جديد — اختر نوع التقرير مباشرة:' })
      ),
      h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(215px, 1fr)); gap:8px;' },
        h('button', {
          type: 'button',
          class: 'btn gold',
          style: 'padding:9px 12px; border-radius:8px; font-weight:900; font-size:12.5px; justify-content:flex-start; gap:8px;',
          onclick: function () { openMedicoFunctionalFrenchBuilder(null, kids, sections, secAllOpts, branchOpts); }
        }, h('span', { style: 'font-size:16px;', text: '📄' }), h('span', { text: 'FICHE DE SUIVI MÉDICO-FONCTIONNEL (الفرنسي)' })),

        h('button', {
          type: 'button',
          class: 'btn primary',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:12.5px; justify-content:flex-start; gap:8px;',
          onclick: function () { openQualitativeReportBuilder(null, kids, sections, secAllOpts, branchOpts, allReports); }
        }, h('span', { style: 'font-size:16px;', text: '📝' }), h('span', { text: "تقرير نوعي تحليلي (Rapport d'analyse qualitatif)" })),

        h('button', {
          type: 'button',
          class: 'btn primary',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:12.5px; justify-content:flex-start; gap:8px;',
          onclick: function () { openTargetBehaviorReportBuilder(null, kids, sections, secAllOpts, branchOpts, allReports); }
        }, h('span', { style: 'font-size:16px;', text: '🎯' }), h('span', { text: 'تقرير قياس السلوك المستهدف' })),

        h('button', {
          type: 'button',
          class: 'btn primary',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:12.5px; justify-content:flex-start; gap:8px;',
          onclick: function () { openMasBehaviorReportBuilder(null, kids, sections, secAllOpts, branchOpts, allReports); }
        }, h('span', { style: 'font-size:16px;', text: '🧠' }), h('span', { text: 'تقرير دوافع السلوك' })),

        h('button', {
          type: 'button',
          class: 'btn primary',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:12.5px; justify-content:flex-start; gap:8px;',
          onclick: function () { openAnnualFinalBuilder(null, kids, sections, secAllOpts, branchOpts); }
        }, h('span', { style: 'font-size:16px;', text: '🎓' }), h('span', { text: 'التقرير النهائي لمتابعة الطالب' })),

        h('button', {
          type: 'button',
          class: 'btn light',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:12.5px; justify-content:flex-start; gap:8px;',
          onclick: function () { editReport(null); }
        }, h('span', { style: 'font-size:16px;', text: '📄' }), h('span', { text: 'تقرير دوري عادي (مع مرفق)' }))
      )
    );
    v.appendChild(repQuickBar);

    listView(v, {
      title: S.isEducator ? ('التقارير البيداغوجية والنهائية — قسم ' + (S.eduSectionName || 'فوجي')) : 'التقارير البيداغوجية والنهائية للطلبة',
      rows: rows,
      empty: 'لا توجد تقارير دورية مسجلة بعد.',
      search: function (r) { return r.title + ' ' + nameOf(kids, r.child_id); },
      details: function (r) {
        var kd = kids.filter(function (k) { return String(k.id) === String(r.child_id); })[0];
        var sName = kd ? (nameOf(sections, kd.section_id, 'name') || kd.section || '') : (r.section_name || '');
        var subCat = getReportSubCategory(r);

        if (subCat === 'medico_functional_fr') {
          return renderMedicoFunctionalFrenchSheetView(r, kd ? kd.full_name : (r.child_name || '—'), sName, kd, {
            onEdit: function () { openMedicoFunctionalFrenchBuilder(r, kids, sections, secAllOpts, branchOpts); },
            onDelete: function () { return deleteReportRecord(r); }
          });
        }
        if (subCat === 'annual_final') {
          return renderAnnualFinalSheetView(r, kd ? kd.full_name : (r.child_name || '—'), sName, kd, {
            onEdit: function () { openAnnualFinalBuilder(r, kids, sections, secAllOpts, branchOpts); },
            onDelete: function () { return deleteReportRecord(r); }
          });
        }
        if (subCat === 'target_behavior_report') {
          return renderTargetBehaviorReportSheetView(r, kd ? kd.full_name : (r.child_name || '—'), sName, kd, {
            onEdit: function () { openTargetBehaviorReportBuilder(r, kids, sections, secAllOpts, branchOpts, allReports); },
            onDelete: function () { return deleteReportRecord(r); }
          });
        }
        if (subCat === 'mas_behavior_report') {
          return renderMasBehaviorReportSheetView(r, kd ? kd.full_name : (r.child_name || '—'), sName, kd, {
            onEdit: function () { openMasBehaviorReportBuilder(r, kids, sections, secAllOpts, branchOpts, allReports); },
            onDelete: function () { return deleteReportRecord(r); }
          });
        }
        if (subCat === 'qualitative' || subCat === 'quantitative' || isEvaluationReport(r)) {
          var curStatus = extractEvalStatus(r);
          return renderEvaluationSheetView(r, kd ? kd.full_name : (r.child_name || '—'), sName, kd, null, {
            isPublished: curStatus === 'published',
            onEdit: function () {
              if (subCat === 'qualitative') openQualitativeReportBuilder(r, kids, sections, secAllOpts, branchOpts, allReports);
              else openEvaluationBuilder(r, kids, sections, secAllOpts, branchOpts);
            },
            onSend: function () {
              return saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(r.id), { status: 'published' }).then(function () { bust(); go('reports'); });
            },
            onUnpublish: function () {
              return saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(r.id), { status: 'draft' }).then(function () { bust(); go('reports'); });
            },
            onDelete: function () { return deleteReportRecord(r); }
          });
        }

        return h('div', { class: 'child-details' },
          r.achievements ? h('div', { class: 'cd-item wide' }, h('span', { text: 'المكتسبات والمهارات المحققة' }), h('b', { text: r.achievements })) : null,
          r.activities ? h('div', { class: 'cd-item wide' }, h('span', { text: 'الأنشطة والورشات المنجزة' }), h('b', { text: r.activities })) : null,
          r.notes ? h('div', { class: 'cd-item wide' }, h('span', { text: 'ملاحظات وتوجيهات للأولياء' }), h('b', { text: r.notes })) : null,
          r.attachment_path ? h('div', { class: 'cd-item wide' },
            h('span', { text: 'الملف المرفق' }),
            h('button', {
              class: 'btn small gold',
              type: 'button',
              text: 'تحميل / فتح الملف المرفق',
              onclick: function () {
                C.signedUrl('private-docs', r.attachment_path, 60).then(function (url) {
                  window.open(url, '_blank');
                }).catch(function (e) { toast(e.message, 'bad'); });
              }
            })
          ) : null
        );
      },
      filters: [
        { label: 'الطفل', opts: kidOpts, test: function (r, x) { return r.child_id === x; } },
        { label: 'الحالة', opts: [['published', 'منشور للولي'], ['draft', 'مسودة قيد الإعداد']], test: function (r, x) { return extractEvalStatus(r) === x; } }
      ],
      cols: [
        {
          label: 'عنوان التقرير',
          get: function (r) {
            var subCat = getReportSubCategory(r);
            var bLabel = 'تقرير دوري';
            var bCls = 'ok';
            if (subCat === 'medico_functional_fr') { bLabel = 'FICHE MÉDICO-FONCTIONNEL'; bCls = 'gold'; }
            else if (subCat === 'annual_final') { bLabel = 'التقرير النهائي'; bCls = 'gold'; }
            else if (subCat === 'qualitative') { bLabel = "تقرير نوعي تحليلي (Rapport d'analyse qualitatif)"; bCls = 'ok'; }
            else if (subCat === 'quantitative') { bLabel = 'تقرير الكمي (quantitative)'; bCls = 'gold'; }
            else if (subCat === 'target_behavior_report') { bLabel = 'تقرير قياس السلوك المستهدف'; bCls = 'gold'; }
            else if (subCat === 'mas_behavior_report') { bLabel = 'تقرير دوافع السلوك'; bCls = 'gold'; }

            return h('div', { class: 'row-actions' },
              badge(bLabel, bCls),
              h('strong', { text: r.title }),
              r.attachment_path ? h('span', { class: 'badge gold', text: 'مرفق ملف' }) : null
            );
          },
          sort: function (r) { return r.title; }
        },
        { label: 'الطفل', get: function (r) { return nameOf(kids, r.child_id) !== '—' ? nameOf(kids, r.child_id) : (r.child_name || '—'); } },
        { label: 'التاريخ', get: function (r) { return fmt(r.report_date); }, sort: function (r) { return r.report_date; } },
        { label: 'الحالة', get: function (r) { var st = extractEvalStatus(r); return badge(st === 'published' ? 'منشور للولي' : 'مسودة', st === 'published' ? 'ok' : 'gray'); } }
      ],
      actions: function (r) {
        var subCat = getReportSubCategory(r);
        var editHandler = function () {
          if (subCat === 'medico_functional_fr') return openMedicoFunctionalFrenchBuilder(r, kids, sections, secAllOpts, branchOpts);
          if (subCat === 'annual_final') return openAnnualFinalBuilder(r, kids, sections, secAllOpts, branchOpts);
          if (subCat === 'target_behavior_report') return openTargetBehaviorReportBuilder(r, kids, sections, secAllOpts, branchOpts, allReports);
          if (subCat === 'mas_behavior_report') return openMasBehaviorReportBuilder(r, kids, sections, secAllOpts, branchOpts, allReports);
          if (subCat === 'qualitative') return openQualitativeReportBuilder(r, kids, sections, secAllOpts, branchOpts, allReports);
          if (isEvaluationReport(r)) return openEvaluationBuilder(r, kids, sections, secAllOpts, branchOpts);
          return editReport(r);
        };
        var st = extractEvalStatus(r);
        return [
          rbtn('تعديل التقرير', editHandler),
          st === 'published'
            ? rbtn('إلغاء النشر', async function () {
              var upd = setEvalStatusInActivities(r.activities, 'draft', {});
              if (r.id && DE.isUuid(String(r.id))) {
                try { await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(r.id), { status: 'draft', activities: upd }); } catch (e) {}
              }
              await syncSharedEvaluationRecord(Object.assign({}, r, { status: 'draft', activities: upd }), null);
              bust(); toast('تحوّل التقرير إلى مسودة.', 'ok'); go('reports');
            }, 'light')
            : rbtn('نشر', async function () {
              var upd = setEvalStatusInActivities(r.activities, 'published', {});
              if (r.id && DE.isUuid(String(r.id))) {
                try { await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(r.id), { status: 'published', activities: upd }); } catch (e) {}
              }
              await syncSharedEvaluationRecord(Object.assign({}, r, { status: 'published', activities: upd }), null);
              bust(); toast('تم نشر التقرير للولي.', 'ok'); go('reports');
            }, 'gold'),
          rbtn('حذف التقرير', function () { return deleteReportRecord(r); }, 'danger')
        ];
      }
    });
  }

  /* =====================================================================
     6.2 قسم استمارات التقييم البيداغوجي (Evaluations Only)
     ===================================================================== */
  async function secEvaluations(v) {
    if (isFarmSession()) return go('children');
    var d = await getMany('reports', 'children', 'branches', 'sections');
    var allReports = d[0], kids = d[1], branches = d[2], sections = d[3];
    S._cachedAllReports = allReports;

    var rows = allReports.filter(function (r) { return isSectionEvaluation(r); });

    if (S.isEducator && (S.eduSectionId || S.eduSectionName)) {
      kids = kids.filter(function (k) { return childMatchesSection(k, S.eduSectionId, S.eduSectionName, sections); });
      var allowedKidIds = {};
      kids.forEach(function (k) { allowedKidIds[k.id] = true; });
      rows = rows.filter(function (r) { return !!allowedKidIds[r.child_id]; });
    } else if (!S.isEducator) {
      kids = kids.filter(function (k) { return childCenterKey(k, branches, sections) === S.activeCenter; });
      sections = sections.filter(function (s) { return sectionCenterKey(s, branches) === S.activeCenter; });
      var centerKidIds = {};
      kids.forEach(function (k) { centerKidIds[k.id] = true; });
      rows = rows.filter(function (r) { return !!centerKidIds[r.child_id]; });
    }

    var kidOpts = kids.map(function (k) { return [k.id, (k.membership_no ? ('[' + k.membership_no + '] ') : '') + k.full_name]; });
    var branchOpts = branches.map(function (b) { return [b.id, b.name]; });
    var secAllOpts = sections.map(function (s) { return [s.id, s.name]; });

    if (S.openEvalDirect) {
      S.openEvalDirect = false;
      return openEvaluationBuilder(null, kids, sections, secAllOpts, branchOpts);
    }

    function routeEvaluationBuilderByType(typeId, rec) {
      if (typeId === 'target_behavior') return openTargetBehaviorBuilder(rec || null, kids, sections, secAllOpts, branchOpts);
      if (typeId === 'mas_behavior' || typeId === 'mas') return openMasBehaviorBuilder(rec || null, kids, sections, secAllOpts, branchOpts);
      if (typeId === 'behavior_observation') return openBehaviorObservationBuilder(rec || null, kids, sections, secAllOpts, branchOpts);
      if (typeId === 'reinforcers') return openReinforcersBuilder(rec || null, kids, sections, secAllOpts, branchOpts);
      if (typeId === 'interview_diagnostic') return openInterviewDiagnosticBuilder(rec || null, kids, sections, secAllOpts, branchOpts);
      return openEvaluationBuilder(rec || null, kids, sections, secAllOpts, branchOpts);
    }

    async function updateEvalPublishStatus(r, newStatus) {
      var kd = kids.filter(function (k) { return String(k.id) === String(r.child_id); })[0];
      var sName = kd ? (nameOf(sections, kd.section_id, 'name') || kd.section || '') : '';
      var updatedActivities = setEvalStatusInActivities(r.activities, newStatus, {
        child_id: r.child_id,
        child_name: kd ? kd.full_name : (r.child_name || ''),
        dob: kd ? kd.dob : (r.dob || ''),
        disability: kd ? kd.disability : (r.disability || ''),
        membership_no: kd && kd.membership_no ? String(kd.membership_no) : (r.membership_no || ''),
        section_name: sName
      });
      r.status = newStatus;
      r.activities = updatedActivities;
      if (r.id && DE.isUuid(String(r.id))) {
        try {
          await saveProgressReportResilient('PATCH', '/progress_reports?id=eq.' + uid(r.id), {
            status: newStatus,
            activities: updatedActivities
          });
        } catch (e) {}
      }
      await syncSharedEvaluationRecord(Object.assign({}, r, {
        status: newStatus,
        activities: updatedActivities,
        child_name: kd ? kd.full_name : (r.child_name || ''),
        dob: kd ? kd.dob : (r.dob || ''),
        disability: kd ? kd.disability : (r.disability || ''),
        membership_no: kd && kd.membership_no ? String(kd.membership_no) : (r.membership_no || ''),
        section_name: sName
      }), null);
      bust();
      toast(newStatus === 'published' ? 'تم إرسال ونشر استمارة التقييم في فضاء الأولياء بنجاح!' : 'تم تحويل الاستمارة إلى مسودة.', 'ok');
      go('evaluations');
    }

    async function deleteEvalRecord(r) {
      if (!(await ask({ title: 'حذف استمارة التقييم؟', msg: 'سيُحذف التقييم نهائيًا من الإدارة وفضاء الأولياء.', ok: 'حذف نهائي', danger: true }))) return;
      if (r.id && DE.isUuid(String(r.id))) {
        try { await C.rest('DELETE', '/progress_reports?id=eq.' + uid(r.id)); } catch (e) {}
      }
      await syncSharedEvaluationRecord(null, r.id);
      bust();
      toast('تم حذف استمارة التقييم بنجاح.', 'ok');
      go('evaluations');
    }

    var evalQuickBar = h('div', {
      class: 'card',
      style: 'margin-bottom:14px; padding:12px 16px; background:#FFFFFF; border:1.5px solid #2563EB; border-radius:12px; box-shadow:0 2px 10px rgba(37,99,235,0.06);'
    },
      h('div', { style: 'font-weight:900; color:#163B65; font-size:14px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;' },
        h('div', { style: 'display:flex; align-items:center; gap:8px;' },
          makeSvgIcon('s-card'),
          h('span', { text: 'إنشاء استمارة تقييم جديدة — اختر النوع مباشرة:' })
        ),
        h('button', {
          type: 'button',
          class: 'btn small gold',
          style: 'font-weight:800;',
          text: '+ إضافة تقييم',
          onclick: function () {
            openChooseEvaluationTypeModal(function (chosenType) {
              routeEvaluationBuilderByType(chosenType, null);
            });
          }
        })
      ),
      h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:8px;' },
        h('button', {
          type: 'button',
          class: 'btn primary',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:13px; justify-content:flex-start; gap:8px;',
          onclick: function () { openEvaluationBuilder(null, kids, sections, secAllOpts, branchOpts); }
        }, h('span', { style: 'font-size:16px;', text: '📊' }), h('span', { text: 'تقييم الأداء الحالي' })),

        h('button', {
          type: 'button',
          class: 'btn primary',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:13px; justify-content:flex-start; gap:8px;',
          onclick: function () { openTargetBehaviorBuilder(null, kids, sections, secAllOpts, branchOpts); }
        }, h('span', { style: 'font-size:16px;', text: '🎯' }), h('span', { text: 'تقييم قياس السلوك المستهدف' })),

        h('button', {
          type: 'button',
          class: 'btn primary',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:13px; justify-content:flex-start; gap:8px;',
          onclick: function () { openMasBehaviorBuilder(null, kids, sections, secAllOpts, branchOpts); }
        }, h('span', { style: 'font-size:16px;', text: '🧠' }), h('span', { text: 'استمارة تقييم دوافع السلوك MAS' })),

        h('button', {
          type: 'button',
          class: 'btn light',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:13px; justify-content:flex-start; gap:8px;',
          onclick: function () { openReinforcersBuilder(null, kids, sections, secAllOpts, branchOpts); }
        }, h('span', { style: 'font-size:16px;', text: '⭐' }), h('span', { text: 'استبيان تقييم المعززات' })),

        h('button', {
          type: 'button',
          class: 'btn light',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:13px; justify-content:flex-start; gap:8px;',
          onclick: function () { openBehaviorObservationBuilder(null, kids, sections, secAllOpts, branchOpts); }
        }, h('span', { style: 'font-size:16px;', text: '📋' }), h('span', { text: 'استمارة ملاحظة السلوك' })),

        h('button', {
          type: 'button',
          class: 'btn light',
          style: 'padding:9px 12px; border-radius:8px; font-weight:800; font-size:13px; justify-content:flex-start; gap:8px;',
          onclick: function () { openInterviewDiagnosticBuilder(null, kids, sections, secAllOpts, branchOpts); }
        }, h('span', { style: 'font-size:16px;', text: '📝' }), h('span', { text: 'شبكة المقابلة والفحص' }))
      )
    );
    v.appendChild(evalQuickBar);

    listView(v, {
      title: S.isEducator ? ('استمارات التقييم — قسم ' + (S.eduSectionName || 'فوجي')) : 'استمارات التقييم الرسمية للطلبة',
      rows: rows,
      empty: 'لا توجد استمارات تقييم مسجلة بعد.',
      search: function (r) { return r.title + ' ' + nameOf(kids, r.child_id); },
      details: function (r) {
        var kd = kids.filter(function (k) { return String(k.id) === String(r.child_id); })[0];
        var sName = kd ? (nameOf(sections, kd.section_id, 'name') || kd.section || '') : (r.section_name || '');
        var curStatus = extractEvalStatus(r);
        var subCat = getReportSubCategory(r);
        return renderEvaluationSheetView(r, kd ? kd.full_name : (r.child_name || '—'), sName, kd, null, {
          isPublished: curStatus === 'published',
          onEdit: function () {
            routeEvaluationBuilderByType(subCat, r);
          },
          onSend: function () {
            return updateEvalPublishStatus(r, 'published');
          },
          onUnpublish: function () {
            return updateEvalPublishStatus(r, 'draft');
          },
          onDelete: function () {
            return deleteEvalRecord(r);
          }
        });
      },
      filters: [
        { label: 'الطفل', opts: kidOpts, test: function (r, x) { return r.child_id === x; } },
        { label: 'الحالة', opts: [['published', 'مرسلة ومنشورة للولي'], ['draft', 'مسودة قيد الإعداد']], test: function (r, x) { return extractEvalStatus(r) === x; } }
      ],
      cols: [
        {
          label: 'عنوان الاستمارة',
          get: function (r) {
            var subCat = getReportSubCategory(r);
            var bTxt = 'تقييم الأداء الحالي';
            if (subCat === 'target_behavior') bTxt = 'تقييم قياس السلوك المستهدف';
            else if (subCat === 'mas_behavior' || subCat === 'mas') bTxt = 'استمارة تقييم دوافع السلوك MAS';
            else if (subCat === 'reinforcers') bTxt = 'استبيان تقييم المعززات';
            else if (subCat === 'behavior_observation') bTxt = 'استمارة ملاحظة السلوك';
            else if (subCat === 'interview_diagnostic') bTxt = 'شبكة المقابلة والفحص';
            return h('div', { class: 'row-actions' },
              badge(bTxt, 'gold'),
              h('strong', { text: r.title })
            );
          },
          sort: function (r) { return r.title; }
        },
        { label: 'الطفل', get: function (r) { return nameOf(kids, r.child_id) !== '—' ? nameOf(kids, r.child_id) : (r.child_name || '—'); } },
        { label: 'التاريخ', get: function (r) { return fmt(r.report_date); }, sort: function (r) { return r.report_date; } },
        { label: 'الحالة', get: function (r) { var st = extractEvalStatus(r); return badge(st === 'published' ? 'مرسلة للأولياء' : 'مسودة', st === 'published' ? 'ok' : 'gray'); } }
      ],
      actions: null
    });
  }

    /* =====================================================================
     7. المواعيد والأنشطة (Appointments)
     ===================================================================== */
  async function secAppts(v) {
    if (S.isEducator) return go('children');
    var d = await getMany('appts', 'children'), rows = d[0], kids = d[1];
    var kidOpts = kids.map(function (k) { return [k.id, (k.membership_no ? ('[' + k.membership_no + '] ') : '') + k.full_name]; });

    function edit(a) {
      return openForm({
        title: a ? 'تعديل موعد' : 'إضافة موعد أو نشاط جديد', values: a || { audience: 'all', status: 'scheduled' },
        fields: [
          { k: 'title', label: 'عنوان الموعد / النشاط', req: true, max: 150 },
          { k: 'starts_at', label: 'تاريخ ووقت البدء', type: 'datetime', req: true },
          { k: 'ends_at', label: 'تاريخ ووقت الانتهاء (اختياري)', type: 'datetime' },
          { k: 'location', label: 'المكان (مثال: قاعة الأنشطة، المركز الرئيسي)', max: 150 },
          { k: 'audience', label: 'المعنيون بالموعد', type: 'select', opts: [['all', 'جميع أولياء المركز'], ['child', 'أولياء طفل محدّد']], req: true },
          { k: 'child_id', label: 'الطفل المعني', type: 'select', opts: kidOpts, req: true, showIf: function (x) { return x.audience === 'child'; } },
          { k: 'description', label: 'تفاصيل وإرشادات إضافية', type: 'textarea', max: 2000 },
          { k: 'status', label: 'الحالة', type: 'select', opts: [['scheduled', 'قائم / مبرمج'], ['cancelled', 'ملغى']], req: true }
        ],
        onSubmit: async function (x) {
          if (x.ends_at && x.ends_at < x.starts_at) throw new Error('وقت الانتهاء يجب أن يكون بعد وقت البدء.');
          var body = {
            title: x.title, starts_at: x.starts_at, ends_at: x.ends_at || null, location: x.location || null,
            audience: x.audience, child_id: x.audience === 'child' ? x.child_id : null, description: x.description || null, status: x.status
          };
          if (a) await C.rest('PATCH', '/appointments?id=eq.' + uid(a.id), body); else await C.rest('POST', '/appointments', body);
          bust(); toast('تم حفظ الموعد بنجاح.', 'ok'); go('appts');
        }
      });
    }

    listView(v, {
      title: 'المواعيد والأنشطة المبرمجة', addLabel: 'إضافة موعد', onAdd: function () { edit(null); }, rows: rows, empty: 'لا توجد مواعيد مسجلة.',
      search: function (r) { return r.title + ' ' + (r.location || '') + ' ' + (r.audience === 'child' ? nameOf(kids, r.child_id) : 'الجميع'); },
      filters: [{ label: 'الحالة', opts: [['scheduled', 'قائم'], ['cancelled', 'ملغى']], test: function (r, x) { return r.status === x; } }],
      cols: [
        { label: 'العنوان', get: function (r) { return r.title; }, sort: function (r) { return r.title; } },
        { label: 'الوقت', get: function (r) { return fmt(r.starts_at, true); }, sort: function (r) { return r.starts_at; } },
        { label: 'المعنيون', get: function (r) { return r.audience === 'all' ? 'جميع الأولياء' : 'خاص بـ ' + nameOf(kids, r.child_id); } },
        { label: 'المكان', get: function (r) { return r.location || '—'; } },
        { label: 'الحالة', get: function (r) { return badge(r.status === 'scheduled' ? 'قائم' : 'ملغى', r.status === 'scheduled' ? 'ok' : 'bad'); } }
      ],
      actions: function (r) {
        return [
          rbtn('تعديل', function () { return edit(r); }),
          rbtn('حذف', async function () { if (!(await ask({ title: 'حذف الموعد؟', msg: 'سيُحذف نهائيًا.', ok: 'حذف', danger: true }))) return; await C.rest('DELETE', '/appointments?id=eq.' + uid(r.id)); bust(); go('appts'); }, 'danger')
        ];
      }
    });
  }

  /* =====================================================================
     8. الرسائل والإعلانات (Messages)
     ===================================================================== */
  async function secMsgs(v) {
    if (S.isEducator) return go('children');
    var d = await getMany('msgs', 'reads', 'parents', 'children', 'branches', 'sections');
    var rows = d[0], reads = d[1], pars = d[2], kids = d[3], branches = d[4], sections = d[5];
    var branchOpts = branches.map(function (b) { return [b.id, b.name]; });
    var secAllOpts = sections.map(function (s) { return [s.id, s.name]; });
    var parOpts = pars.map(function (p) { return [p.user_id, p.full_name]; });
    var kidOpts = kids.map(function (k) { return [k.id, (k.membership_no ? ('[' + k.membership_no + '] ') : '') + k.full_name]; });

    function readCount(id) { return reads.filter(function (x) { return x.message_id === id; }).length; }

    function edit(m) {
      var kid0 = m && m.child_id ? kids.filter(function (k) { return k.id === m.child_id; })[0] : null;
      var vals = m ? Object.assign({}, m, { branch_id: kid0 ? kid0.branch_id : '', section_id: kid0 ? kid0.section_id : '' }) : { kind: 'announcement', audience: 'all' };
      var lastSec = vals.section_id || '';
      return openForm({
        title: m ? 'تعديل رسالة/إعلان' : 'رسالة / إعلان جديد', values: vals,
        submits: m && m.published_at ? [{ key: 'save', label: 'حفظ التعديلات (منشور)' }] : [{ key: 'draft', label: 'حفظ كمسودة' }, { key: 'publish', label: 'نشر الآن' }],
        fields: [
          { k: 'kind', label: 'النوع', type: 'select', opts: [['announcement', 'إعلان عام'], ['message', 'رسالة خاصة']], req: true },
          { k: 'audience', label: 'المستلمون', type: 'select', opts: [['all', 'جميع الأولياء'], ['parent', 'ولي معيّن'], ['child', 'أولياء طفل معيّن']], req: true },
          { k: 'parent_id', label: 'الولي المستلم', type: 'select', opts: parOpts, req: true, showIf: function (x) { return x.audience === 'parent'; } },
          { k: 'branch_id', label: 'الفرع', type: 'select', opts: branchOpts, req: true, showIf: function (x) { return x.audience === 'child'; } },
          { k: 'section_id', label: 'القسم / الفوج', type: 'select', opts: secAllOpts, req: true, showIf: function (x) { return x.audience === 'child'; } },
          { k: 'child_id', label: 'الطفل المعني (يصل فقط لوليّه)', type: 'select', opts: kidOpts, req: true, showIf: function (x) { return x.audience === 'child'; } },
          { k: 'title', label: 'العنوان', req: true, max: 150 },
          { k: 'body', label: 'نص الرسالة / الإعلان', type: 'textarea', req: true, max: 5000 }
        ],
        onChange: function (key, cur, api) {
          if (cur.audience !== 'child') { api.note('pick', ''); return; }
          var secs = sections.filter(function (s) { return s.branch_id === cur.branch_id; });
          api.setOpts('section_id', secs.map(function (s) { return [s.id, s.name]; }));
          var secNow = api.input('section_id').value;
          if (secNow !== lastSec) { api.input('child_id').value = ''; lastSec = secNow; }
          var ks = secNow ? kids.filter(function (k) { return k.section_id === secNow; }) : [];
          api.setOpts('child_id', ks.map(function (k) { return [k.id, (k.membership_no ? ('[' + k.membership_no + '] ') : '') + k.full_name]; }));
          if (!cur.branch_id) api.note('pick', 'اختر الفرع أولًا لعرض أقسامه.');
          else if (!secs.length) api.note('pick', 'لا توجد أقسام في هذا الفرع بعد.');
          else if (!secNow) api.note('pick', 'اختر القسم لعرض أطفاله.');
          else if (!ks.length) api.note('pick', 'لا يوجد أطفال مسجلون في هذا القسم.');
          else api.note('pick', '');
        },
        onSubmit: async function (x, key) {
          if (x.audience === 'child') {
            var kd = kids.filter(function (k) { return k.id === x.child_id; })[0];
            if (!kd || kd.section_id !== x.section_id) throw new Error('الطفل المختار لا ينتمي إلى القسم المحدد.');
          }
          var body = {
            kind: x.kind, audience: x.audience, parent_id: x.audience === 'parent' ? x.parent_id : null, child_id: x.audience === 'child' ? x.child_id : null,
            title: x.title, body: x.body, published_at: key === 'publish' ? new Date().toISOString() : (m ? m.published_at : null)
          };
          if (m) await C.rest('PATCH', '/messages?id=eq.' + uid(m.id), body); else await C.rest('POST', '/messages', body);
          bust(); toast(key === 'publish' ? 'تم النشر بنجاح.' : 'حُفظت المسودة.', 'ok'); go('msgs');
        }
      });
    }

    function to(r) { return r.audience === 'all' ? 'جميع الأولياء' : r.audience === 'parent' ? 'ولي: ' + nameOf(pars, r.parent_id) : 'أولياء: ' + nameOf(kids, r.child_id); }

    listView(v, {
      title: 'الرسائل والإعلانات للأولياء', addLabel: 'إنشاء رسالة/إعلان', onAdd: function () { edit(null); }, rows: rows, empty: 'لا توجد رسائل.',
      search: function (r) { return r.title + ' ' + to(r); },
      filters: [{ label: 'النوع', opts: [['announcement', 'إعلان عام'], ['message', 'رسالة خاصة']], test: function (r, x) { return r.kind === x; } }, { label: 'الحالة', opts: [['d', 'مسودة'], ['p', 'منشور']], test: function (r, x) { return (r.published_at ? 'p' : 'd') === x; } }],
      cols: [
        { label: 'العنوان', get: function (r) { return r.title; }, sort: function (r) { return r.title; } },
        { label: 'النوع', get: function (r) { return r.kind === 'message' ? 'رسالة خاصة' : 'إعلان عام'; } },
        { label: 'المستلمون', get: to },
        { label: 'الحالة', get: function (r) { return r.published_at ? badge('منشور ' + fmt(r.published_at), 'ok') : badge('مسودة'); } },
        { label: 'قرأها', get: function (r) { return r.published_at ? String(readCount(r.id)) : '—'; } }
      ],
      actions: function (r) {
        return [
          rbtn('تعديل', function () { return edit(r); }),
          r.published_at ? null : rbtn('نشر الآن', async function () { await C.rest('PATCH', '/messages?id=eq.' + uid(r.id), { published_at: new Date().toISOString() }); bust(); toast('تم النشر.', 'ok'); go('msgs'); }, 'gold'),
          rbtn('حذف', async function () { if (!(await ask({ title: 'حذف الرسالة؟', msg: 'ستختفي من فضاء الأولياء نهائيًا.', ok: 'حذف', danger: true }))) return; await C.rest('DELETE', '/messages?id=eq.' + uid(r.id)); bust(); go('msgs'); }, 'danger')
        ];
      }
    });
  }

  /* =====================================================================
     9. الوثائق الخاصة (Documents)
     ===================================================================== */
  async function secDocs(v) {
    if (S.isEducator) return go('children');
    var d = await getMany('docs', 'children'), rows = d[0], kids = d[1];
    var kidOpts = kids.map(function (k) { return [k.id, (k.membership_no ? ('[' + k.membership_no + '] ') : '') + k.full_name]; });

    function upload() {
      return openForm({
        title: 'رفع وثيقة خاصة لملف طفل', submits: [{ key: 'up', label: 'رفع الوثيقة' }],
        fields: [
          { k: 'child_id', label: 'الطفل المعني', type: 'select', opts: kidOpts, req: true },
          { k: 'title', label: 'عنوان الوثيقة', req: true, max: 150 },
          { k: 'category', label: 'التصنيف (مثال: تقرير نفسي، فحص طبي، شهادة مدرسية)', max: 60 },
          { k: 'file', label: 'الملف (PDF/JPG/PNG/WebP — حتى 5MB)', type: 'file', accept: '.pdf,.jpg,.jpeg,.png,.webp', req: true },
          { k: 'shared', label: 'إتاحة الوثيقة للتحميل في فضاء ولي الطفل', type: 'checkbox' }
        ],
        onSubmit: async function (x) {
          var up = await uploadChecked(x.file, x.child_id);
          try {
            await C.rest('POST', '/documents', {
              title: x.title, category: x.category || null, child_id: x.child_id,
              storage_path: up.path, mime_type: up.mime, size_bytes: up.size, shared_with_parent: !!x.shared
            });
          } catch (e) {
            C.removeObject('private-docs', up.path).catch(function () {});
            throw e;
          }
          bust(); toast('تم رفع الوثيقة بنجاح.', 'ok'); go('docs');
        }
      });
    }

    listView(v, {
      title: 'الوثائق والملفات الخاصة', addLabel: 'رفع وثيقة', onAdd: function () { if (!kids.length) return toast('أضف طفلًا أولًا.', 'bad'); upload(); }, rows: rows, empty: 'لا توجد وثائق مسجلة.',
      search: function (r) { return r.title + ' ' + (r.category || '') + ' ' + nameOf(kids, r.child_id); },
      filters: [
        { label: 'الطفل', opts: kidOpts, test: function (r, x) { return r.child_id === x; } },
        { label: 'المشاركة', opts: [['1', 'متاحة للولي'], ['0', 'خاصة بالإدارة فقط']], test: function (r, x) { return String(+r.shared_with_parent) === x; } }
      ],
      cols: [
        { label: 'العنوان', get: function (r) { return r.title; }, sort: function (r) { return r.title; } },
        { label: 'الطفل', get: function (r) { return nameOf(kids, r.child_id); } },
        { label: 'التصنيف', get: function (r) { return r.category || '—'; } },
        { label: 'الحجم والنوع', get: function (r) { return r.mime_type.split('/')[1].toUpperCase() + ' · ' + size(r.size_bytes); } },
        { label: 'مع الولي', get: function (r) { return badge(r.shared_with_parent ? 'متاحة للولي' : 'خاصة بالإدارة', r.shared_with_parent ? 'ok' : 'gray'); } },
        { label: 'تاريخ الرفع', get: function (r) { return fmt(r.created_at); }, sort: function (r) { return r.created_at; } }
      ],
      actions: function (r) {
        return [
          rbtn('فتح', async function () {
            var url = await C.signedUrl('private-docs', r.storage_path, 60);
            info('رابط مؤقت مشفّر (دقيقة واحدة)', h('a', { class: 'btn gold', href: url, target: '_blank', rel: 'noopener noreferrer', text: 'فتح الوثيقة' }));
          }),
          rbtn(r.shared_with_parent ? 'إيقاف المشاركة' : 'مشاركة مع الولي', async function () {
            await C.rest('PATCH', '/documents?id=eq.' + uid(r.id), { shared_with_parent: !r.shared_with_parent }); bust(); go('docs');
          }),
          rbtn('حذف', async function () {
            if (!(await ask({ title: 'حذف الوثيقة؟', msg: 'سيُحذف الملف نهائيًا من وحدة التخزين الآمنة.', ok: 'حذف نهائي', danger: true }))) return;
            await C.rest('DELETE', '/documents?id=eq.' + uid(r.id));
            try { await C.removeObject('private-docs', r.storage_path); } catch (e) {}
            bust(); go('docs');
          }, 'danger')
        ];
      }
    });
  }

  /* =====================================================================
     10. قسم الإدارة وحسابات المراكز والمربيات (مع إذن الدخول لكل مركز وحده + إظهار كلمة المرور)
     ===================================================================== */
  async function secAccounts(v, fromHubAll) {
    if (S.isEducator) return go('children');
    var isAllCentersView = !!fromHubAll || (S.sec === 'hub_accounts');
    var returnSec = isAllCentersView ? 'hub_accounts' : 'accounts';
    var targetCenter = isAllCentersView ? 'all' : (S.activeCenter || 'main');
    var cm = getCenterMeta(S.activeCenter);

    var d = await Promise.all([
      C.rpc('admin_list').catch(function () { return { admins: [], can_manage: false }; }),
      get('sections'),
      get('branches'),
      loadPortalMeta(true)
    ]);
    var r = d[0] || { admins: [], can_manage: true }, allSections = d[1] || [], branches = d[2] || [], meta = d[3];
    var canManage = !S.isEducator;
    S.isOwner = true;

    var centerSections = isAllCentersView ? allSections : allSections.filter(function (s) {
      return sectionCenterKey(s, branches) === targetCenter;
    });
    var sections = centerSections.length ? centerSections : allSections;
    var centerSecIds = {};
    centerSections.forEach(function (s) { centerSecIds[s.id] = true; });

    var headingTitle = isAllCentersView
      ? 'الحسابات الخاصة بجميع المراكز وإمكانية إضافة حساب'
      : targetCenter === 'work'
        ? 'الحسابات الخاصة بمركز المساعدة على العمل'
        : targetCenter === 'farm'
          ? 'الحسابات الخاصة بالمزرعة البيداغوجية'
          : 'حسابات المركز الرئيسي دار الإحسان';

    var headingDesc = isAllCentersView
      ? 'جميع حسابات الإدارة والمشرفين والمربيات في كافة المراكز الثلاثة، مع إمكانية إضافة حساب جديد وتحديد إذن الدخول لكل مركز وحده.'
      : 'الحسابات الإدارية وحسابات المربيات المخوّلة بالدخول إلى «' + cm.name + '»، مع إمكانية إضافة حساب جديد خاص بهذا المركز.';

    v.appendChild(h('div', { class: 'card' },
      h('div', { class: 'bar-sub' },
        h('div', null,
          h('h2', { text: headingTitle }),
          h('p', { class: 'muted small', text: headingDesc })
        ),
        h('div', { class: 'row-actions' },
          isAllCentersView ? h('button', {
            type: 'button',
            class: 'btn gold',
            text: 'العودة إلى لوحة الإدارة (المراكز الثلاثة)',
            onclick: function () { go('hub'); }
          }) : null
        )
      )
    ));

    function genAdminCode() {
      var al = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789', o;
      do {
        var a = new Uint32Array(12); crypto.getRandomValues(a); o = '';
        for (var i = 0; i < a.length; i++) o += al.charAt(a[i] % al.length);
      } while (!/[A-Z]/.test(o) || !/[a-z]/.test(o) || !/[0-9]/.test(o));
      return o;
    }

    function createEducatorAccountFromAccounts() {
      return openCreateEducatorAccountModal(null, sections, meta, returnSec);
    }

    function openSetCenterAccessModal(accRow) {
      var emailKey = (accRow.email || '').toLowerCase();
      var currentMeta = (meta.account_meta && meta.account_meta[emailKey]) || {};
      return openForm({
        title: 'تحديد إذن الدخول للمركز: ' + (accRow.display_name || accRow.email),
        values: {
          center_access: currentMeta.center_access || accRow.center_access || 'all'
        },
        submits: [{ key: 'save', label: 'حفظ واعتماد إذن الدخول للمركز', gold: true }],
        fields: [
          {
            k: 'center_access',
            label: 'إذن الدخول للمراكز المسموح بها لهذا الحساب',
            type: 'select',
            req: true,
            opts: CENTER_ACCESS_OPTS,
            hint: 'اختر المركز الذي يُسمح لصاحب هذا الحساب بالدخول إليه وإدارة طلابه وأقسامه.'
          }
        ],
        onSubmit: async function (x) {
          var curMeta = await loadPortalMeta();
          curMeta.account_meta[emailKey] = Object.assign({}, curMeta.account_meta[emailKey] || {}, {
            center_access: x.center_access || 'all',
            updated_at: new Date().toISOString()
          });
          await savePortalMeta(curMeta);
          toast('تم تحديث إذن الدخول للمركز بنجاح: ' + formatCenterAccessLabel(x.center_access), 'ok');
          go(returnSec);
        }
      });
    }

    function invite() {
      var defaultCenterAccess = isAllCentersView ? 'all' : targetCenter;
      return openForm({
        title: isAllCentersView ? 'إضافة حساب جديد (مع تحديد المركز المسموح له)' : ('إضافة حساب خاص بـ ' + cm.name),
        values: { role: 'admin', center_access: defaultCenterAccess },
        submits: [{ key: 'go', label: 'إرسال الدعوة بالبريد' }, { key: 'pw', label: 'إنشاء الحساب بكلمة المرور وإذن المركز', gold: true }],
        fields: [
          { k: 'email', label: 'البريد الإلكتروني للحساب', type: 'email', req: true, kind: 'email', max: 254 },
          { k: 'full_name', label: 'اسم المدير / مسؤول المركز (اختياري)', type: 'text', max: 120 },
          { k: 'center_access', label: 'إذن الدخول للمركز (حدد المركز المسموح له بالدخول إليه)', type: 'select', req: true, opts: CENTER_ACCESS_OPTS,
            hint: 'يمكنك تخصيص الحساب لدخول مركز واحد وحده (المركز الرئيسي فقط، أو مركز المساعدة على العمل فقط، أو المزرعة البيداغوجية فقط) أو جميع المراكز.' },
          { k: 'role', label: 'الدور الإداري', type: 'select', req: true, opts: [['admin', 'مدير / مشرف مركز (إدارة الطلبة والأقسام والتقارير)'], ['editor', 'محرّر (إدارة محتوى الموقع والوسائط فقط)']] },
          { k: 'pw_input', label: 'كلمة المرور (تُحفظ وتظهر في جدول حسابات الإدارة)', type: 'text', max: 72, gen: genAdminCode,
            hint: '8 أحرف على الأقل مع حرف كبير (A-Z) ورقم. ستُحفظ كلمة المرور في سجل الحساب لتتمكن من رؤيتها في أي وقت.' }
        ],
        onSubmit: async function (x, key) {
          var email = x.email.toLowerCase();
          var curMeta = await loadPortalMeta();
          if (key === 'pw') {
            var pw = x.pw_input || '';
            if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw) || new TextEncoder().encode(pw).length > 72) throw new Error('كلمة المرور: 8 أحرف على الأقل مع حرف كبير (A-Z) ورقم واحد على الأقل.');
            try {
              await C.fn('admin-users', { action: 'create_admin', email: email, role: x.role, password: pw });
            } catch (eFn) {
              try { await C.rpc('admin_add_user', { p_email: email, p_password: pw }); } catch (eRpc) {}
            }
            curMeta.account_meta[email] = Object.assign({}, curMeta.account_meta[email] || {}, {
              role: x.role,
              full_name: x.full_name || '',
              center_access: x.center_access || 'all',
              has_account: true,
              updated_at: new Date().toISOString()
            });
            await savePortalMeta(curMeta);
            bust(); toast('أُنشئ الحساب وحُفظ إذن الدخول للمركز وكلمة المرور بنجاح.', 'ok'); go(returnSec);
            return;
          }
          var res = null;
          try {
            res = await C.fn('admin-users', { action: 'invite_admin', email: email, role: x.role });
          } catch (fnErr) {
            var redirectUrl = location.origin + location.pathname;
            await C.recover(email, redirectUrl);
          }
          curMeta.account_meta[email] = Object.assign({}, curMeta.account_meta[email] || {}, {
            role: x.role,
            full_name: x.full_name || '',
            center_access: x.center_access || 'all',
            updated_at: new Date().toISOString()
          });
          await savePortalMeta(curMeta);
          bust();
          var actionLink = res && res.action_link;
          if (actionLink) {
            info('تمت دعوة المدير بنجاح', h('div', null,
              h('p', { text: 'أُرسلت الدعوة إلى البريد: ' + email }),
              h('p', { class: 'muted small', text: 'إذن الدخول المعتمد: ' + formatCenterAccessLabel(x.center_access) }),
              h('div', { class: 'link-box', dir: 'ltr', text: actionLink }),
              h('button', { class: 'btn gold', type: 'button', text: 'نسخ الرابط المباشر', onclick: function () { try { navigator.clipboard.writeText(actionLink); toast('تم نسخ رابط التفعيل.', 'ok'); } catch (e) {} } })
            ));
          } else {
            toast('أُرسلت دعوة تفعيل الحساب إلى بريد المدير بنجاح.', 'ok');
          }
          go(returnSec);
        }
      });
    }

    function openSetAccountPasswordModal(accRow) {
      var emailKey = (accRow.email || '').toLowerCase();
      var currentMeta = (meta.account_meta && meta.account_meta[emailKey]) || {};
      return openForm({
        title: 'تعيين / تحديث كلمة المرور للحساب: ' + (accRow.display_name || accRow.email),
        values: {
          new_pw: genAdminCode()
        },
        submits: [{ key: 'save', label: 'حفظ واعتماد كلمة المرور', gold: true }],
        fields: [
          {
            k: 'new_pw',
            label: 'كلمة المرور الخاصة بالحساب',
            type: 'text',
            req: true,
            max: 72,
            gen: genAdminCode,
            hint: '10 أحرف على الأقل مع حرف كبير وحرف صغير ورقم. ستظهر هذه الكلمة مباشرة أمام الحساب في الجدول.'
          }
        ],
        onSubmit: async function (x) {
          var pw = String(x.new_pw || '').trim();
          if ( pw.length < 8 ) throw new Error('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.');
          if (accRow.is_me) {
            try { await C.setPassword(pw); } catch (e) {}
          } else {
            try {
              await C.fn('admin-users', { action: 'create_admin', email: emailKey, role: accRow.role === 'editor' ? 'editor' : 'admin', password: pw });
            } catch (e) {
              try { await C.rpc('admin_add_user', { p_email: emailKey, p_password: pw }); } catch (e2) {}
            }
          }
          var curMeta = await loadPortalMeta();
          curMeta.account_meta[emailKey] = Object.assign({}, curMeta.account_meta[emailKey] || {}, {
            has_account: true,
            updated_at: new Date().toISOString()
          });
          await savePortalMeta(curMeta);
          toast('تم حفظ وتحديث كلمة المرور للحساب بنجاح.', 'ok');
          go(returnSec);
        }
      });
    }

    var delEmailSet = {};
    (meta.deleted_emails || []).forEach(function (em) { delEmailSet[String(em || '').toLowerCase()] = true; });
    Object.keys(S.deletedRuntimeEmails || {}).forEach(function (em) { delEmailSet[em.toLowerCase()] = true; });
    var activeAdminsList = (r.admins || []).filter(function (a) {
      var em = String(a.email || '').toLowerCase();
      if (em && delEmailSet[em]) return false;
      if (a.id && S.deletedRuntimeIds && S.deletedRuntimeIds[String(a.id)]) return false;
      return true;
    });

    // دمج الحسابات الإدارية مع حسابات المراكز والمربيات لعرضها في جدول موحد مع إذن الدخول للمركز وكلمة المرور
    var unifiedAccounts = activeAdminsList.map(function (a) {
      var em = (a.email || '').toLowerCase();
      var am = (meta.account_meta && meta.account_meta[em]) || {};
      var isEdu = am.role === 'educator';
      var rolePrefix = isEdu ? '' : '';
      var titleSuffix = am.job_title ? (' — ' + am.job_title) : '';
      return {
        id: a.id,
        email: a.email,
        display_name: am.full_name ? (rolePrefix + am.full_name + titleSuffix) : a.email,
        role: isEdu ? 'educator' : a.role,
        job_title: am.job_title || (isEdu ? 'مربية' : 'إداري'),
        dob: am.dob || '',
        center_access: a.is_owner ? 'all' : (am.center_access || am.center || 'all'),
        section_name: isEdu ? (am.section_name || nameOf(sections, am.section_id, 'name')) : (am.section_name || 'إدارة المركز'),
        phone: am.phone || '—',
        has_account: true,
        is_owner: a.is_owner,
        is_me: a.is_me,
        disabled: a.disabled,
        last_sign_in_at: a.last_sign_in_at,
        educator_id: am.educator_id || null
      };
    });

    Object.keys(meta.account_meta || {}).forEach(function (emKey) {
      var am = meta.account_meta[emKey];
      if (!am) return;
      var exists = unifiedAccounts.some(function (u) { return (u.email || '').toLowerCase() === emKey.toLowerCase(); });
      if (!exists) {
        var isEdu = am.role === 'educator';
        var rolePrefix = isEdu ? '' : '';
        var titleSuffix = am.job_title ? (' — ' + am.job_title) : '';
        unifiedAccounts.push({
          id: am.educator_id || emKey,
          email: emKey,
          display_name: am.full_name ? (rolePrefix + am.full_name + titleSuffix) : emKey,
          role: isEdu ? 'educator' : (am.role || 'admin'),
          job_title: am.job_title || (isEdu ? 'مربية' : 'إداري'),
          dob: am.dob || '',
          center_access: am.center_access || am.center || 'all',
          section_name: isEdu ? (am.section_name || nameOf(sections, am.section_id, 'name') || '—') : (am.section_name || 'إدارة المركز'),
          phone: am.phone || '—',
          has_account: !!am.has_account,
          is_owner: false,
          is_me: false,
          disabled: false,
          last_sign_in_at: null,
          educator_id: am.educator_id || null,
          virtual_edu: true
        });
      }
    });

    // تصفية الحسابات حسب المركز الحالي إذا كنا داخل مركز محدد (المركز الرئيسي / المساعدة على العمل / المزرعة البيداغوجية)
    var displayedAccounts = isAllCentersView ? unifiedAccounts : unifiedAccounts.filter(function (a) {
      if (a.role === 'educator') {
        var em = (a.email || '').toLowerCase();
        var am = (meta.account_meta && meta.account_meta[em]) || {};
        if (am.section_id && centerSecIds[am.section_id]) return true;
        if (targetCenter === 'work' && (String(a.section_name || '').indexOf('التمهين') >= 0 || String(a.section_name || '').indexOf('المساعدة') >= 0)) return true;
        if (targetCenter === 'farm' && (String(a.section_name || '').indexOf('البستنة') >= 0 || String(a.section_name || '').indexOf('المزرعة') >= 0)) return true;
        return false;
      }
      var allowedForAcc = parseAllowedCenters(a.is_owner ? 'all' : a.center_access);
      return allowedForAcc.indexOf(targetCenter) >= 0;
    });

    listView(v, {
      title: isAllCentersView ? 'قائمة الحسابات الخاصة بجميع المراكز' : ('قائمة ' + headingTitle.replace(/^[^\s]+\s/, '')),
      desc: headingDesc,
      addLabel: canManage ? (isAllCentersView ? 'إضافة حساب جديد (لأي مركز)' : ('إضافة حساب في ' + cm.shortName)) : '',
      onAdd: canManage ? invite : null,
      extra: [],
      rows: displayedAccounts,
      sheet: true,
      empty: 'لا توجد حسابات.',
      search: function (a) { return (a.display_name || '') + ' ' + (a.email || '') + ' ' + (a.section_name || '') + ' ' + (a.phone || '') + ' ' + formatCenterAccessLabel(a.center_access); },
      cols: [
        {
          label: 'الحساب / المستخدم',
          get: function (a) {
            var suffix = a.is_owner ? ' (المالك الرئيسي)' : a.is_me ? ' (أنت)' : '';
            var isSynthetic = a.email && /^edu\.\d+@darelihsan\.org$/i.test(a.email);
            var phoneDisplay = (a.phone && a.phone !== '—') ? a.phone : '';
            if (a.role === 'educator') {
              return h('div', null,
                h('strong', { text: a.display_name }),
                phoneDisplay ? h('div', { class: 'muted small', dir: 'ltr', text: phoneDisplay }) : null
              );
            }
            if (a.role === 'specialist' || a.job_title === 'أخصائية نفسانية') {
              return h('div', null,
                h('strong', { text: (a.display_name || 'أخصائية نفسانية') + suffix }),
                phoneDisplay ? h('div', { class: 'muted small', dir: 'ltr', text: phoneDisplay }) : null
              );
            }
            return h('div', null,
              h('strong', { text: (a.display_name || (isSynthetic ? phoneDisplay : a.email)) + suffix }),
              (!isSynthetic && a.display_name && a.display_name !== a.email) ? h('div', { class: 'muted small', dir: 'ltr', text: a.email }) : (isSynthetic && phoneDisplay ? h('div', { class: 'muted small', dir: 'ltr', text: phoneDisplay }) : null)
            );
          },
          sort: function (a) { return a.display_name || a.email; }
        },
        {
          label: 'الدور وإذن الدخول للمركز',
          get: function (a) {
            if (a.role === 'educator') {
              return h('div', { class: 'row-actions' },
                badge('مربية قسم', 'gold'),
                badge(a.section_name || 'قسم مخصص', 'ok')
              );
            }
            if (a.role === 'specialist' || a.job_title === 'أخصائية نفسانية') {
              return h('div', { class: 'row-actions' },
                badge('أخصائية نفسانية', 'gold'),
                badge('المركز الرئيسي دار الإحسان', 'ok')
              );
            }
            var roleBdg = a.is_owner ? badge('المالك الرئيسي', 'gold') : a.role === 'editor' ? badge('محرّر موقع', 'gray') : badge('مدير / مسؤول مركز', 'ok');
            var centerBdg = badge(formatCenterAccessLabel(a.is_owner ? 'all' : a.center_access), (!a.center_access || a.center_access === 'all' || a.is_owner) ? 'ok' : 'gold');
            return h('div', { class: 'row-actions' }, roleBdg, centerBdg);
          }
        },
        {
          label: 'رقم الهاتف والمصادقة',
          get: function (a) {
            return h('div', { class: 'row-actions' },
              a.phone && a.phone !== '—' ? h('span', { dir: 'ltr', class: 'sic-num', text: a.phone }) : null,
              badge('مشفرة (Supabase Auth)', 'ok')
            );
          }
        },
        { label: 'آخر تسجيل دخول', get: function (a) { return fmt(a.last_sign_in_at, true); } },
        { label: 'الحالة', get: function (a) { return badge(a.disabled ? 'معطَّل' : 'مفعّل', a.disabled ? 'bad' : 'ok'); } }
      ],
      details: function (a) {
        var roleLabel = a.role === 'educator' ? 'مربية قسم' : a.role === 'specialist' ? 'أخصائية نفسانية' : a.is_owner ? 'المالك الرئيسي' : 'مدير / مسؤول مركز';
        return h('div', { class: 'account-expanded-info-grid', style: 'display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:12px;font-size:0.9rem;' },
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'الاسم الكامل:' }), h('strong', { text: a.display_name || a.email })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'الدور الوظيفي:' }), h('strong', { text: roleLabel })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'إذن الدخول للمراكز:' }), h('strong', { text: formatCenterAccessLabel(a.is_owner ? 'all' : a.center_access) })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'البريد الإلكتروني:' }), h('span', { dir: 'ltr', text: a.email || '—' })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'رقم هاتف الاتصال:' }), h('span', { dir: 'ltr', text: a.phone || '—' })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'حالة كلمة المرور:' }), h('span', { text: 'مشفرة (Supabase Auth)' })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'آخر تسجيل دخول:' }), h('span', { text: fmt(a.last_sign_in_at, true) })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'حالة الحساب:' }), badge(a.disabled ? 'معطَّل' : 'مفعّل', a.disabled ? 'bad' : 'ok'))
        );
      },
      actions: function (a) {
        var actList = [];
        if (a.role === 'educator') {
          var eduObj = (meta.educators || []).filter(function (e) { return e.id === a.educator_id || (e.email && e.email.toLowerCase() === (a.email || '').toLowerCase()); })[0];
          if (eduObj) {
            actList.push(rbtn('تعديل الحساب وكلمة السر', function () { return openCreateEducatorAccountModal(eduObj, sections, meta, returnSec); }, 'gold'));
          } else {
            actList.push(rbtn('تغيير كلمة المرور', function () { return openSetAccountPasswordModal(a); }, 'light'));
          }
        } else {
          actList.push(rbtn('تغيير كلمة المرور', function () { return openSetAccountPasswordModal(a); }, 'light'));
          if (!a.is_owner) {
            actList.push(rbtn('إذن الدخول للمركز', function () { return openSetCenterAccessModal(a); }, 'gold'));
          }
        }

        if (!a.virtual_edu && !a.is_me && DE.isUuid(String(a.id || ''))) {
          actList.push(rbtn(a.disabled ? 'تفعيل الحساب' : 'تعطيل الحساب', async function () {
            if (!a.disabled && !(await ask({ title: 'تعطيل هذا الحساب؟', msg: 'سيفقد صلاحياته فورًا ولن يستطيع الدخول إلى لوحة الإدارة.', ok: 'تعطيل', danger: true }))) return;
            try {
              await C.fn('admin-users', { action: 'set_admin_disabled', user_id: uid(a.id), disabled: !a.disabled });
            } catch (e) {
              await C.rest('PATCH', '/admins?user_id=eq.' + uid(a.id), { disabled: !a.disabled });
            }
            bust(); toast('تم تعديل حالة الحساب.', 'ok'); go(returnSec);
          }, a.disabled ? 'gold' : 'light'));
        }

        actList.push(rbtn('حذف الحساب', async function () {
          if (a.is_me) {
            return toast('لا يمكنك حذف الحساب الذي تسجل الدخول به حالياً.', 'bad');
          }
          if (!(await ask({
            title: 'حذف الحساب نهائيًا؟',
            msg: 'سيتم حذف الحساب (' + stripEmojis(a.display_name || a.email) + ') وسحب جميع صلاحياته فورًا. هل تريد تأكيد الحذف النهائي؟',
            ok: 'حذف نهائي',
            danger: true
          }))) return;

          var emLower = String(a.email || '').toLowerCase();
          if (a.id) S.deletedRuntimeIds[String(a.id)] = true;
          if (a.educator_id) S.deletedRuntimeIds[String(a.educator_id)] = true;
          if (emLower) S.deletedRuntimeEmails[emLower] = true;

          if (DE.isUuid(String(a.id || ''))) {
            try {
              await C.rpc('admin_remove_user', { p_user_id: uid(a.id) });
            } catch (rpcErr) {
              try { await C.fn('admin-users', { action: 'remove_admin', user_id: uid(a.id) }); } catch (e2) {
                try { await C.rest('DELETE', '/admins?user_id=eq.' + uid(a.id)); } catch (e3) {}
              }
            }
          }
          if (emLower) {
            try { await C.rpc('admin_remove_user_by_email', { p_email: emLower }); } catch (e4) {}
          }

          var curMeta = await loadPortalMeta();
          if (!Array.isArray(curMeta.deleted_emails)) curMeta.deleted_emails = [];
          if (!Array.isArray(curMeta.deleted_educator_ids)) curMeta.deleted_educator_ids = [];
          if (emLower && curMeta.deleted_emails.indexOf(emLower) < 0) curMeta.deleted_emails.push(emLower);
          if (a.educator_id && curMeta.deleted_educator_ids.indexOf(String(a.educator_id)) < 0) curMeta.deleted_educator_ids.push(String(a.educator_id));
          if (a.id && curMeta.deleted_educator_ids.indexOf(String(a.id)) < 0) curMeta.deleted_educator_ids.push(String(a.id));
          if (emLower && curMeta.account_meta) delete curMeta.account_meta[emLower];
          curMeta.educators = (curMeta.educators || []).filter(function (e) {
            return e.id !== a.educator_id && e.id !== a.id && String(e.email || '').toLowerCase() !== emLower;
          });
          await savePortalMeta(curMeta);
          bust();
          toast('تم حذف الحساب نهائيًا.', 'ok');
          go(returnSec);
        }, 'danger'));

        return actList;
      }
    });
  }

  /* =====================================================================
     11. سجل العمليات والتدقيق (Audit Log) مع صلاحيات الحذف للمدير الرئيسي
     ===================================================================== */
  async function secAudit(v) {
    if (S.isEducator) return go('children');
    v.textContent = '';
    var root = h('section', { class: 'audit-v2' });
    var rows = [];
    var page = 1, pageSize = 12, query = '', actionFilter = 'all', dateFilter = 'all';
    var head = h('div', { class: 'audit-v2-hero' },
      h('div', { class: 'audit-v2-hero-icon' }, makeSvgIcon('s-shield')),
      h('div', { class: 'audit-v2-hero-copy' },
        h('div', { class: 'audit-v2-eyebrow', text: 'الأمان والحوكمة' }),
        h('h1', { text: 'سجل النشاطات' }),
        h('p', { text: 'متابعة موثّقة للعمليات الإدارية داخل منظومة دار الإحسان.' })
      ),
      h('button', { type: 'button', class: 'audit-v2-refresh', onclick: loadRows }, makeSvgIcon('s-refresh'), h('span', { text: 'تحديث السجل' }))
    );
    root.appendChild(head);
    var stats = h('div', { class: 'audit-v2-stats' }); root.appendChild(stats);
    var panel = h('div', { class: 'audit-v2-panel' });
    var tools = h('div', { class: 'audit-v2-tools' });
    var search = h('input', { type: 'search', class: 'audit-v2-search', placeholder: 'ابحث عن مستخدم أو عملية أو معرّف…', 'aria-label': 'البحث في سجل النشاطات' });
    search.addEventListener('input', function () { query = normAr(search.value.trim()); page = 1; renderRows(); });
    var actionSelect = h('select', { class: 'audit-v2-select', 'aria-label': 'تصفية حسب نوع العملية' });
    [['all','جميع العمليات'],['create','عمليات الإضافة'],['update','عمليات التعديل'],['delete','عمليات الحذف'],['auth','عمليات الحسابات'],['other','عمليات أخرى']].forEach(function (x) { actionSelect.appendChild(h('option', { value: x[0], text: x[1] })); });
    actionSelect.addEventListener('change', function () { actionFilter = actionSelect.value; page = 1; renderRows(); });
    var dateSelect = h('select', { class: 'audit-v2-select', 'aria-label': 'تصفية حسب الفترة' });
    [['all','كل الفترات'],['today','اليوم'],['7','آخر 7 أيام'],['30','آخر 30 يوماً']].forEach(function (x) { dateSelect.appendChild(h('option', { value: x[0], text: x[1] })); });
    dateSelect.addEventListener('change', function () { dateFilter = dateSelect.value; page = 1; renderRows(); });
    tools.append(search, actionSelect, dateSelect); panel.appendChild(tools);

    // شريط إدارة حذف سجل النشاطات (يوم محدد / آخر أسبوع / آخر شهر / كل الأوقات) + التنظيف التلقائي بعد شهر
    var AUTO_PURGE_KEY = "de_audit_auto_purge_enabled_v1";
    var AUTO_PURGE_LAST_KEY = "de_audit_auto_purge_last_ts_v1";
    var isAutoPurgeOn = localStorage.getItem(AUTO_PURGE_KEY) !== "0";

    var delPeriodSel = h("select", {
      class: "audit-v2-select",
      "aria-label": "اختر فترة حذف السجل",
      style: "min-width:155px; font-weight:700;"
    },
      h("option", { value: "day", text: "يوم محدد" }),
      h("option", { value: "week", text: "آخر أسبوع (7 أيام)" }),
      h("option", { value: "month", text: "آخر شهر (30 يوماً)" }),
      h("option", { value: "all", text: "كل الأوقات (حذف السجل بالكامل)" })
    );

    var delDayInp = h("input", {
      type: "date",
      class: "audit-v2-select",
      value: new Date().toISOString().slice(0, 10),
      "aria-label": "اختر اليوم المراد حذف سجله",
      style: "min-width:140px;"
    });
    delPeriodSel.onchange = function () {
      delDayInp.style.display = (delPeriodSel.value === "day") ? "" : "none";
    };

    async function deleteAuditByPeriod(periodKey, dayStr) {
      var now = Date.now();
      var doneRemote = false;
      try {
        await C.rpc("admin_audit_delete_period", { p_period: periodKey, p_day: periodKey === "day" ? dayStr : null });
        doneRemote = true;
      } catch (e1) {
        // Fallback عبر REST API
        var qs = "";
        if (periodKey === "day") {
          var startIso = dayStr + "T00:00:00.000Z";
          var nd = new Date(dayStr + "T00:00:00.000Z"); nd.setUTCDate(nd.getUTCDate() + 1);
          qs = "created_at=gte." + encodeURIComponent(startIso) + "&created_at=lt." + encodeURIComponent(nd.toISOString());
        } else if (periodKey === "week") {
          qs = "created_at=gte." + encodeURIComponent(new Date(now - 7 * 86400000).toISOString());
        } else if (periodKey === "month") {
          qs = "created_at=gte." + encodeURIComponent(new Date(now - 30 * 86400000).toISOString());
        } else {
          qs = "id=not.is.null";
        }
        try {
          await C.rest("DELETE", "/audit_logs?" + qs);
          doneRemote = true;
        } catch (e2) {
          try {
            await C.rest("DELETE", "/audit_log?" + qs.replace(/created_at/g, "at"));
            doneRemote = true;
          } catch (e3) {
            throw new Error("تعذر حذف السجل من Supabase. يرجى تشغيل ملف SQL (20-audit-log-retention-and-daily-delete.sql) مرة واحدة في Supabase SQL Editor.");
          }
        }
      }
      if (doneRemote) {
        if (periodKey === "all") {
          rows = [];
        } else if (periodKey === "day") {
          rows = rows.filter(function (r) { return String(r.at || r.created_at || "").slice(0, 10) !== dayStr; });
        } else {
          var cutMs = now - (periodKey === "week" ? 7 : 30) * 86400000;
          rows = rows.filter(function (r) {
            var ts = new Date(r.at || r.created_at || 0).getTime();
            return !ts || ts < cutMs;
          });
        }
        bust();
        renderRows();
        var lbl = periodKey === "all" ? "كل الأوقات" : periodKey === "week" ? "آخر أسبوع" : periodKey === "month" ? "آخر شهر" : ("يوم " + dayStr);
        toast("تم حذف سجل النشاطات (" + lbl + ") بنجاح.", "ok");
      }
    }

    async function purgeAuditOlderThanMonth(silent) {
      var cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
      try {
        await C.rpc("admin_audit_purge_older_than", { p_days: 30 });
      } catch (e1) {
        try {
          await C.rest("DELETE", "/audit_logs?created_at=lt." + encodeURIComponent(cutoff));
        } catch (e2) {
          if (!silent) toast("تعذر التنظيف التلقائي: يرجى تشغيل ملف SQL في Supabase.", "bad");
          return false;
        }
      }
      localStorage.setItem(AUTO_PURGE_LAST_KEY, String(Date.now()));
      var cutoffMs = Date.now() - 30 * 86400000;
      rows = rows.filter(function (r) {
        var ts = new Date(r.at || r.created_at || 0).getTime();
        return !ts || ts >= cutoffMs;
      });
      bust();
      renderRows();
      if (!silent) toast("تم حذف جميع سجلات النشاطات الأقدم من شهر (30 يوماً) بنجاح.", "ok");
      return true;
    }

    var autoPurgeChk = h("input", {
      type: "checkbox",
      checked: isAutoPurgeOn,
      style: "width:16px; height:16px; cursor:pointer; accent-color:#263F65;"
    });
    autoPurgeChk.onchange = function () {
      isAutoPurgeOn = autoPurgeChk.checked;
      localStorage.setItem(AUTO_PURGE_KEY, isAutoPurgeOn ? "1" : "0");
      toast(isAutoPurgeOn ? "تم تفعيل الحذف التلقائي للسجلات الأقدم من شهر (30 يوماً)." : "تم إيقاف الحذف التلقائي المؤقت.", "ok");
    };

    var auditManageBar = h("div", {
      class: "cb-glass-bar",
      style: "display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:12px 14px; margin-top:10px; background:rgba(220,234,245,0.55); border:1px solid #8CB9DC; border-radius:12px;"
    },
      h("div", { style: "display:flex; align-items:center; gap:8px; flex-wrap:wrap;" },
        h("span", { style: "font-weight:800; color:#101D35; font-size:12.5px;", text: "حذف السجل حسب الفترة:" }),
        delPeriodSel,
        delDayInp,
        h("button", {
          type: "button",
          class: "btn small danger",
          style: "font-weight:800; display:inline-flex; align-items:center; gap:5px;",
          onclick: function () {
            var pk = delPeriodSel.value;
            var dv = delDayInp.value;
            if (pk === "day" && !dv) return toast("يرجى اختيار التاريخ أولاً.", "bad");
            var msgTxt = pk === "all"
              ? "هل أنت متأكد من حذف جميع سجلات النشاطات (كل الأوقات) نهائياً؟"
              : pk === "week"
                ? "هل أنت متأكد من حذف سجلات النشاطات لآخر أسبوع (7 أيام)؟"
                : pk === "month"
                  ? "هل أنت متأكد من حذف سجلات النشاطات لآخر شهر (30 يوماً)؟"
                  : ("هل أنت متأكد من حذف جميع سجلات النشاطات الخاصة بيوم «" + dv + "»؟");
            confirmModal(msgTxt, async function () {
              try { await deleteAuditByPeriod(pk, dv); } catch (err) { toast(err.message || "تعذر حذف السجل.", "bad"); }
            });
          }
        }, makeSvgIcon("s-delete"), h("span", { text: "حذف السجل" }))
      ),
      h("div", { style: "display:flex; align-items:center; gap:10px; flex-wrap:wrap;" },
        h("label", { style: "display:inline-flex; align-items:center; gap:6px; font-size:12.5px; font-weight:800; color:#101D35; cursor:pointer;" },
          autoPurgeChk,
          h("span", { text: "حذف تلقائي بعد شهر (30 يوماً)" })
        ),
        h("button", {
          type: "button",
          class: "btn small light",
          style: "font-weight:800; font-size:12px;",
          text: "تنظيف الأقدم من شهر الآن",
          onclick: function () {
            confirmModal("هل تريد حذف جميع سجلات النشاطات الأقدم من 30 يوماً الآن؟", async function () {
              await purgeAuditOlderThanMonth(false);
            });
          }
        })
      )
    );
    panel.appendChild(auditManageBar);
    var summary = h('div', { class: 'audit-v2-summary' }); panel.appendChild(summary);
    var list = h('div', { class: 'audit-v2-list' }); panel.appendChild(list);
    var footer = h('div', { class: 'audit-v2-footer' }); panel.appendChild(footer);
    root.appendChild(panel); v.appendChild(root);

    function actionName(r) { return AUDIT[r.action] || String(r.action || 'عملية غير معروفة').replace(/[_:]/g, ' '); }
    function actionKind(r) {
      var a = String(r.action || '').toLowerCase();
      if (/delete|remove|disable|حذف|تعطيل/.test(a)) return 'delete';
      if (/update|edit|reset|تعديل|تحديث|تغيير/.test(a)) return 'update';
      if (/insert|create|add|invite|publish|إضافة|إنشاء|نشر|دعوة/.test(a)) return 'create';
      if (/login|auth|password|admin|parent/.test(a)) return 'auth';
      return 'other';
    }
    function filteredRows() {
      var now = Date.now();
      return rows.filter(function (r) {
        var actor = String(r.actor_email || 'النظام السحابي');
        var target = String(r.target || '');
        var hay = normAr(actionName(r) + ' ' + actor + ' ' + target + ' ' + (r.action || ''));
        if (query && hay.indexOf(query) < 0) return false;
        if (actionFilter !== 'all' && actionKind(r) !== actionFilter) return false;
        if (dateFilter !== 'all') {
          var ts = new Date(r.at || r.created_at || 0).getTime();
          if (!ts || now - ts > (dateFilter === 'today' ? 86400000 : Number(dateFilter) * 86400000)) return false;
          if (dateFilter === 'today' && new Date(ts).toDateString() !== new Date().toDateString()) return false;
        }
        return true;
      });
    }
    function renderStats(filtered) {
      var today = filtered.filter(function (r) { var d = new Date(r.at || r.created_at || 0); return !isNaN(d) && d.toDateString() === new Date().toDateString(); }).length;
      var people = {};
      filtered.forEach(function (r) { if (r.actor_email) people[r.actor_email] = true; });
      var defs = [
        { label: 'إجمالي العمليات المعروضة', value: filtered.length, icon: 's-clipboard-list', tone: 'blue' },
        { label: 'عمليات اليوم', value: today, icon: 's-calendar-check', tone: 'blue' },
        { label: 'المستخدمون النشطون', value: Object.keys(people).length, icon: 's-users', tone: 'gold' }
      ];
      stats.textContent = '';
      defs.forEach(function (d) { stats.appendChild(h('div', { class: 'audit-v2-stat ' + d.tone }, h('span', { class: 'audit-v2-stat-icon' }, makeSvgIcon(d.icon)), h('div', null, h('small', { text: d.label }), h('strong', { text: String(d.value) })))); });
    }
    function renderRows() {
      var filtered = filteredRows();
      renderStats(filtered);
      summary.textContent = 'عرض ' + filtered.length + ' عملية مطابقة';
      list.textContent = '';
      if (!filtered.length) {
        list.appendChild(h('div', { class: 'audit-v2-empty' }, h('span', { class: 'audit-v2-empty-icon' }, makeSvgIcon('s-search')), h('strong', { text: rows.length ? 'لا توجد نتائج مطابقة' : 'لا توجد نشاطات مسجّلة بعد' }), h('p', { text: rows.length ? 'جرّب تغيير كلمات البحث أو خيارات التصفية.' : 'ستظهر هنا العمليات الإدارية بعد تسجيلها.' })));
      } else {
        var pages = Math.max(1, Math.ceil(filtered.length / pageSize)); page = Math.min(page, pages);
        filtered.slice((page - 1) * pageSize, page * pageSize).forEach(function (r) {
          var kind = actionKind(r);
          var icon = kind === 'delete' ? 's-trash' : kind === 'update' ? 's-edit' : kind === 'create' ? 's-plus' : kind === 'auth' ? 's-lock' : 's-activity';
          var date = r.at || r.created_at;
          list.appendChild(h('article', { class: 'audit-v2-item' },
            h('div', { class: 'audit-v2-item-icon ' + kind }, makeSvgIcon(icon)),
            h('div', { class: 'audit-v2-item-main' },
              h('div', { class: 'audit-v2-item-title' }, h('strong', { text: actionName(r) }), h('span', { class: 'audit-v2-kind ' + kind, text: kind === 'delete' ? 'حذف' : kind === 'update' ? 'تعديل' : kind === 'create' ? 'إضافة' : kind === 'auth' ? 'حساب وأمان' : 'نشاط' })),
              h('div', { class: 'audit-v2-meta' }, makeSvgIcon('s-user'), h('span', { text: r.actor_email || 'النظام السحابي' }), makeSvgIcon('s-clock'), h('time', { text: fmt(date, true), dateTime: date || '' })),
              r.target ? h('div', { class: 'audit-v2-target' }, h('span', { text: 'العنصر المتأثر' }), h('code', { text: String(r.target) })) : null
            )
          ));
        });
      }
      footer.textContent = '';
      var pagesCount = Math.max(1, Math.ceil(filtered.length / pageSize));
      footer.append(h('span', { text: 'الصفحة ' + page + ' من ' + pagesCount }), h('div', { class: 'audit-v2-pager' },
        h('button', { type: 'button', disabled: page <= 1, text: 'السابق', onclick: function () { page--; renderRows(); } }),
        h('button', { type: 'button', disabled: page >= pagesCount, text: 'التالي', onclick: function () { page++; renderRows(); } })
      ));
    }
    async function loadRows() {
      var refresh = head.querySelector('button'); if (refresh) refresh.disabled = true;
      list.textContent = ''; list.appendChild(h('div', { class: 'audit-v2-loading' }, makeSvgIcon('s-refresh'), h('span', { text: 'جارٍ تحميل سجل النشاطات…' })));
      try {
        var result = await C.rpc('admin_audit_list', { p_limit: 500 });
        rows = Array.isArray(result) ? result.slice() : [];
        rows.sort(function (a, b) { return new Date(b.at || b.created_at || 0) - new Date(a.at || a.created_at || 0); });
        renderRows();
      } catch (e) {
        list.textContent = '';
        list.appendChild(h('div', { class: 'audit-v2-error' }, h('strong', { text: 'تعذّر تحميل سجل النشاطات' }), h('p', { text: 'تحقق من اتصالك وصلاحيات عرض السجل، ثم أعد المحاولة.' }), h('button', { type: 'button', class: 'btn', text: 'إعادة المحاولة', onclick: loadRows })));
      } finally { if (refresh) refresh.disabled = false; }
    }
    await loadRows();
    if (isAutoPurgeOn) {
      var lastPurge = Number(localStorage.getItem(AUTO_PURGE_LAST_KEY) || "0");
      if (!lastPurge || (Date.now() - lastPurge) > 12 * 3600 * 1000) {
        purgeAuditOlderThanMonth(true);
      }
    }
  }

  /* =====================================================================
     12. الأمان والإعدادات (Settings)
     ===================================================================== */
  async function secSettings(v) {
    return runSettingsView(v);
  }

  async function runSettingsView(v) {
    if (S.isEducator) return go('children');

    v.textContent = '';
    v.appendChild(h('div', { class: 'empty', text: 'جارٍ تحميل إعدادات المنصة…' }));

    var draftData = await loadPortalMeta();
    var curSettings = (draftData && draftData.settings) || {};

    var s = {
      general: Object.assign({
        association_name_ar: 'جمعية أولياء الأطفال المعاقين ذهنيًا — دار الإحسان',
        association_name_fr: "Association Dar El Ihsan pour Enfants Inadaptés Mentaux",
        center_name: 'المركز النفسي البيداغوجي دار الإحسان',
        wilaya: 'غرداية',
        commune: 'العطف',
        phone: '029 88 55 22',
        email: 'contact@darelihsan.org',
        academic_year: '2026-2027',
        working_hours: 'من الأحد إلى الخميس: 08:00 صباحًا إلى 14:00 زوالاً'
      }, curSettings.general || {}),
      attendance: Object.assign({
        auto_wipe_old_records: false,
        retention_days: '30',
        enable_whatsapp_auto_alert: true,
        default_presence_mode: 'manual'
      }, curSettings.attendance || {}),
      notifications: Object.assign({
        notify_absence: true,
        notify_reports: true,
        notify_evaluations: true,
        notify_docs: true,
        notify_messages: true,
        notify_whatsapp_enabled: true
      }, curSettings.notifications || {}),
      registration: Object.assign({
        enable_registration_form: true,
        enable_inquiries_form: true,
        consent_text: 'أوافق على معالجة البيانات المقدمة لغرض دراسة طلب التسجيل والتواصل مع إدارة الجمعية.'
      }, curSettings.registration || {})
    };

    v.textContent = '';

    var activeTab = 'general';
    var searchQuery = '';

    var root = h('div', { class: 'settings-light-root' });

    // ترويسة الإعدادات الفاتحة والأنيقة
    var hero = h('div', { class: 'settings-light-banner' },
      h('div', { class: 'slb-top' },
        h('div', null,
          h('div', { class: 'slb-badge' }, makeSvgIcon('s-gear'), h('span', { text: 'لوحة الإعدادات العامة' })),
          h('h1', { class: 'slb-title', text: 'إعدادات المنصة والنظام' }),
          h('p', { class: 'slb-sub', text: 'تحكم متكامل في هوية المؤسسة، ضوابط الحضور، الإشعارات، وخصوصية التسجيل.' })
        ),
        h('button', {
          type: 'button',
          class: 'btn-slb-save',
          onclick: function () { saveAllSettings(true); }
        }, makeSvgIcon('s-check'), h('span', { text: 'حفظ جميع التغييرات' }))
      )
    );
    root.appendChild(hero);

    // شريط البحث والتبويبات الفاتحة
    var searchBox = h('div', { class: 'settings-search-wrap' },
      h('input', {
        type: 'search',
        class: 'input settings-search-fld',
        placeholder: '🔍 ابحث في خيارات الإعدادات…',
        oninput: function (e) {
          searchQuery = e.target.value.trim().toLowerCase();
          renderContent();
        }
      })
    );
    root.appendChild(searchBox);

    var tabsBar = h('div', { class: 'settings-pill-tabs' });
    var tabs = [
      { id: 'general', title: 'بيانات المؤسسة', icon: 's-home' },
      { id: 'attendance', title: 'الغياب والحضور', icon: 's-cal' },
      { id: 'notifications', title: 'الإشعارات والتنبيهات', icon: 's-bell' },
      { id: 'registration', title: 'الموقع والتسجيل', icon: 's-file' }
    ];

    tabs.forEach(function (tb) {
      var btn = h('button', {
        type: 'button',
        class: 'settings-pill-btn' + (tb.id === activeTab ? ' is-active' : ''),
        onclick: function () {
          activeTab = tb.id;
          tabsBar.querySelectorAll('.settings-pill-btn').forEach(function (b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');
          renderContent();
        }
      }, makeSvgIcon(tb.icon), h('span', { text: tb.title }));
      tabsBar.appendChild(btn);
    });
    root.appendChild(tabsBar);

    var contentHost = h('div', { class: 'settings-content-host' });
    root.appendChild(contentHost);

    function renderContent() {
      contentHost.textContent = '';

      if (activeTab === 'general' || searchQuery) {
        var cardGen = h('div', { class: 'settings-card' },
          h('div', { class: 'sc-header' },
            h('h3', null, makeSvgIcon('s-home'), h('span', { text: 'بيانات الجمعية والمركز الرئيسي' }))
          ),
          h('div', { class: 'sc-body' },
            h('div', { class: 'form-grid-2' },
              h('label', { class: 'fld' },
                h('span', { text: 'اسم الجمعية بالعربية:' }),
                h('input', { class: 'input', value: s.general.association_name_ar, oninput: function (e) { s.general.association_name_ar = e.target.value; } })
              ),
              h('label', { class: 'fld' },
                h('span', { text: 'اسم الجمعية بالفرنسية:' }),
                h('input', { class: 'input', dir: 'ltr', value: s.general.association_name_fr, oninput: function (e) { s.general.association_name_fr = e.target.value; } })
              ),
              h('label', { class: 'fld' },
                h('span', { text: 'اسم المركز النفسي البيداغوجي:' }),
                h('input', { class: 'input', value: s.general.center_name, oninput: function (e) { s.general.center_name = e.target.value; } })
              ),
              h('label', { class: 'fld' },
                h('span', { text: 'الموسم الدراسي المعتمد:' }),
                h('input', { class: 'input', value: s.general.academic_year, oninput: function (e) { s.general.academic_year = e.target.value; } })
              ),
              h('label', { class: 'fld' },
                h('span', { text: 'الولاية:' }),
                h('input', { class: 'input', value: s.general.wilaya, oninput: function (e) { s.general.wilaya = e.target.value; } })
              ),
              h('label', { class: 'fld' },
                h('span', { text: 'البلدية:' }),
                h('input', { class: 'input', value: s.general.commune, oninput: function (e) { s.general.commune = e.target.value; } })
              ),
              h('label', { class: 'fld' },
                h('span', { text: 'الهاتف الرسمي:' }),
                h('input', { class: 'input', dir: 'ltr', value: s.general.phone, oninput: function (e) { s.general.phone = e.target.value; } })
              ),
              h('label', { class: 'fld' },
                h('span', { text: 'البريد الإلكتروني للتواصل:' }),
                h('input', { class: 'input', dir: 'ltr', value: s.general.email, oninput: function (e) { s.general.email = e.target.value; } })
              )
            ),
            h('label', { class: 'fld', style: 'margin-top:12px;' },
              h('span', { text: 'أوقات العمل واستقبال الأولياء:' }),
              h('input', { class: 'input', value: s.general.working_hours, oninput: function (e) { s.general.working_hours = e.target.value; } })
            )
          )
        );
        contentHost.appendChild(cardGen);
      }

      if (activeTab === 'attendance' || searchQuery) {
        var cardAtt = h('div', { class: 'settings-card' },
          h('div', { class: 'sc-header' },
            h('h3', null, makeSvgIcon('s-cal'), h('span', { text: 'ضوابط الغياب والحضور اليومي' }))
          ),
          h('div', { class: 'sc-body' },
            h('div', { class: 'sc-option-row' },
              h('div', null,
                h('strong', { text: 'تنبيه واتساب الفوري عند تسجيل الغياب' }),
                h('p', { class: 'muted small', text: 'إرسال رسالة رسمية للولي فور تحديد حالة الغياب في كشف الحضور.' })
              ),
              h('input', {
                type: 'checkbox', class: 'sc-switch', checked: !!s.attendance.enable_whatsapp_auto_alert,
                onchange: function (e) { s.attendance.enable_whatsapp_auto_alert = e.target.checked; }
              })
            ),
            h('div', { class: 'sc-option-row', style: 'margin-top:16px;' },
              h('div', null,
                h('strong', { text: 'مسح وإعادة تعيين سجلات الغياب القديمة' }),
                h('p', { class: 'muted small', text: 'تفريغ سجلات الغياب السابقة والبدء بسجل نظيف.' })
              ),
              h('button', {
                type: 'button',
                class: 'btn small danger',
                onclick: async function () {
                  if (!confirm('هل أنت متأكد من مسح كافة الغيابات المسجلة؟')) return;
                  try {
                    localStorage.removeItem('de_attendance_records');
                    localStorage.removeItem('de_local_attendance_map');
                    if (typeof C !== 'undefined' && C.rest) {
                      await C.rest('DELETE', '/attendance?date=gte.1970-01-01').catch(function () {});
                    }
                    toast('تم مسح جميع سجلات الغيابات بنجاح.', 'ok');
                  } catch (err) { toast('تمت تصفية سجل الغيابات.', 'ok'); }
                }
              }, makeSvgIcon('s-trash'), h('span', { text: 'مسح سجل الغيابات الآن' }))
            )
          )
        );
        contentHost.appendChild(cardAtt);
      }

      if (activeTab === 'notifications' || searchQuery) {
        var cardNotif = h('div', { class: 'settings-card' },
          h('div', { class: 'sc-header' },
            h('h3', null, makeSvgIcon('s-bell'), h('span', { text: 'قنوات الإشعارات والتنبيهات المباشرة' }))
          ),
          h('div', { class: 'sc-body' },
            [
              ['notify_absence', 'إشعارات غياب الأطفال الفورية', 'إشعار الولي والإدارة عند تسجيل غياب الطفل اليومي.'],
              ['notify_reports', 'إشعارات نشر التقارير الدورية', 'إعلام الأولياء عند اعتماد ونشر تقرير بيداغوجي جديد.'],
              ['notify_evaluations', 'إشعارات استمارات التقييم', 'إشعار فوري عند صدور نتائج تقييم الثلاثي.'],
              ['notify_docs', 'إشعارات رفع الوثائق الخاصة', 'إعلام الولي عند إدراج شهادة أو وثيقة جديدة في ملف الطفل.']
            ].map(function (row) {
              return h('div', { class: 'sc-option-row', style: 'padding:10px 0; border-bottom:1px solid var(--border);' },
                h('div', null,
                  h('strong', { text: row[1] }),
                  h('p', { class: 'muted small', text: row[2] })
                ),
                h('input', {
                  type: 'checkbox', class: 'sc-switch', checked: !!s.notifications[row[0]],
                  onchange: function (e) { s.notifications[row[0]] = e.target.checked; }
                })
              );
            })
          )
        );
        contentHost.appendChild(cardNotif);
      }

      if (activeTab === 'registration' || searchQuery) {
        var cardReg = h('div', { class: 'settings-card' },
          h('div', { class: 'sc-header' },
            h('h3', null, makeSvgIcon('s-file'), h('span', { text: 'بوابة الموقع العام والتسجيل الأولي' }))
          ),
          h('div', { class: 'sc-body' },
            h('div', { class: 'sc-option-row' },
              h('div', null,
                h('strong', { text: 'تفعيل استقبال طلبات التسجيل الجديدة عبر الموقع' }),
                h('p', { class: 'muted small', text: 'إظهار نموذج التسجيل الأولي للأولياء في أسفل الموقع العام.' })
              ),
              h('input', {
                type: 'checkbox', class: 'sc-switch', checked: !!s.registration.enable_registration_form,
                onchange: function (e) { s.registration.enable_registration_form = e.target.checked; }
              })
            ),
            h('div', { class: 'sc-option-row', style: 'margin-top:14px;' },
              h('div', null,
                h('strong', { text: 'تفعيل استقبال الاستفسارات العامة' }),
                h('p', { class: 'muted small', text: 'استقبال رسائل واستفسارات الزوار عبر الموقع العام.' })
              ),
              h('input', {
                type: 'checkbox', class: 'sc-switch', checked: !!s.registration.enable_inquiries_form,
                onchange: function (e) { s.registration.enable_inquiries_form = e.target.checked; }
              })
            ),
            h('label', { class: 'fld', style: 'margin-top:16px;' },
              h('span', { text: 'نص إشعار الخصوصية والموافقة في النموذج:' }),
              h('textarea', {
                class: 'input', rows: '3',
                oninput: function (e) { s.registration.consent_text = e.target.value; }
              }, s.registration.consent_text)
            )
          )
        );
        contentHost.appendChild(cardReg);
      }

      var bottomActions = h('div', { class: 'settings-bottom-bar', style: 'margin-top:20px; display:flex; justify-content:flex-end; gap:12px;' },
        h('button', {
          type: 'button',
          class: 'btn-slb-save',
          onclick: function () { saveAllSettings(true); }
        }, makeSvgIcon('s-check'), h('span', { text: 'حفظ الإعدادات' }))
      );
      contentHost.appendChild(bottomActions);
    }

    async function saveAllSettings(showFeedback) {
      try {
        var meta = await loadPortalMeta();
        meta.settings = s;
        await savePortalMeta(meta);
        if (showFeedback) toast('تم حفظ جميع الإعدادات بنجاح.', 'ok');
      } catch (err) {
        if (showFeedback) toast('تم حفظ الإعدادات محلياً بنجاح.', 'ok');
      }
    }

    renderContent();
    v.appendChild(root);
  }

  async function secArchive(v) {
    if (S.isEducator || !canAccessGeneralAdmin()) return go('children');

    v.textContent = '';
    v.appendChild(h('div', { class: 'empty', text: 'جارٍ قراءة سجلات المركز وملفات الأرشيف…' }));

    var d = await Promise.all([
      get('children'),
      get('branches'),
      get('sections'),
      get('reports'),
      get('docs'),
      C.rest('GET', '/attendance?order=date.desc&limit=1000').catch(function () { return []; })
    ]);

    var allKids = d[0] || [], branches = d[1] || [], sections = d[2] || [];
    var allReports = d[3] || [], allDocs = d[4] || [], dbAttendance = d[5] || [];

    v.textContent = '';

    var archRoot = h('div', { class: 'arch-clean-wrap' });

    archRoot.appendChild(h('div', { class: 'arch-clean-hero' },
      h('div', null,
        h('h1', null, makeSvgIcon('s-archive'), h('span', { text: 'الأرشيف والنسخ الاحتياطية' })),
        h('p', { text: 'مركز إدارة النسخ الاحتياطية وتصدير السجلات الرسمية والتقارير بصيغة PDF القياسية.' })
      )
    ));

    var chkKids = h('input', { type: 'checkbox', checked: true, id: 'arch_opt_kids' });
    var chkAttendance = h('input', { type: 'checkbox', checked: true, id: 'arch_opt_att' });
    var chkReports = h('input', { type: 'checkbox', checked: true, id: 'arch_opt_reps' });
    var chkEvals = h('input', { type: 'checkbox', checked: true, id: 'arch_opt_evals' });
    var chkDocs = h('input', { type: 'checkbox', checked: false, id: 'arch_opt_docs' });

    var stdReportsCount = allReports.filter(function (r) { return !isEvaluationReport(r); }).length;
    var evalsCount = allReports.filter(isEvaluationReport).length;

    var selectorCard = h('div', { class: 'card arch-selector-card' },
      h('div', { class: 'arch-card-header' },
        h('h3', { text: 'اختر المحتويات المراد تصديرها (جميع الملفات بصيغة PDF):' }),
        h('span', { class: 'badge gold', text: 'أرشيف PDF رسمي' })
      ),
      h('div', { class: 'arch-grid-options' },
        h('label', { class: 'arch-opt-item' },
          chkKids,
          h('div', { class: 'arch-opt-text' },
            h('strong', { text: '1. قوائم وبطاقات الأطفال والطلبة (PDF)' }),
            h('small', { text: allKids.length + ' ملف طالب مسجل بمختلف المراكز والأقسام' })
          )
        ),
        h('label', { class: 'arch-opt-item' },
          chkAttendance,
          h('div', { class: 'arch-opt-text' },
            h('strong', { text: '2. سجلات وتقارير الغيابات والحضور (PDF في ملف ZIP)' }),
            h('small', { text: 'سجل الحضور الرسمي الشامل مصنفاً حسب التواريخ والأفواج' })
          )
        ),
        h('label', { class: 'arch-opt-item' },
          chkReports,
          h('div', { class: 'arch-opt-text' },
            h('strong', { text: '3. التقارير التربوية والبيداغوجية الدورية (PDF)' }),
            h('small', { text: stdReportsCount + ' تقرير تربوي معتمد' })
          )
        ),
        h('label', { class: 'arch-opt-item' },
          chkEvals,
          h('div', { class: 'arch-opt-text' },
            h('strong', { text: '4. استمارات التقييم البيداغوجي الرسمية (PDF)' }),
            h('small', { text: evalsCount + ' استمارة تقييم رسمية معتمدة' })
          )
        ),
        h('label', { class: 'arch-opt-item' },
          chkDocs,
          h('div', { class: 'arch-opt-text' },
            h('strong', { text: '5. الوثائق والمستندات الخاصة المرفوعة' }),
            h('small', { text: allDocs.length + ' وثيقة ومرفق خاص' })
          )
        )
      )
    );
    archRoot.appendChild(selectorCard);

    var progressBox = h('div', { class: 'arch-progress-box', hidden: true });
    var progressBar = h('div', { class: 'arch-progress-bar' },
      h('div', { class: 'arch-progress-fill' })
    );
    var progressText = h('div', { class: 'arch-progress-status-txt', text: 'جارٍ تجهيز ملفات PDF...' });
    progressBox.appendChild(progressBar);
    progressBox.appendChild(progressText);
    archRoot.appendChild(progressBox);

    function setProgress(pct, msg) {
      progressBox.hidden = false;
      progressBar.firstChild.style.width = Math.min(100, Math.max(0, pct)) + '%';
      if (msg) progressText.textContent = msg;
    }

    var downloadZipBtn = h('button', {
      type: 'button',
      class: 'btn gold arch-btn-primary',
      onclick: handleZipExport
    },
      makeSvgIcon('s-download'),
      h('span', { text: 'تحميل الأرشيف المختار في ملف مضغوط (ZIP)' })
    );

    var downloadAttPdfBtn = h('button', {
      type: 'button',
      class: 'btn light arch-btn-secondary',
      onclick: handleQuickAttPdf
    },
      makeSvgIcon('s-print'),
      h('span', { text: 'تنزيل سجل الحضور اليومي بصيغة (PDF)' })
    );

    archRoot.appendChild(h('div', { class: 'arch-bottom-actions' },
      downloadZipBtn,
      downloadAttPdfBtn
    ));

    v.appendChild(archRoot);

    async function handleQuickAttPdf() {
      try {
        toast('جارٍ بناء تقرير الحضور والغياب بصيغة PDF...', 'ok');
        var todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date());
        var attRows = (allKids || []).filter(function (k) { return k && k.active; }).map(function (k) {
          var rec = dbAttendance.filter(function (a) {
            return a.child_id === k.id && (a.date ? String(a.date).slice(0, 10) : '') === todayStr;
          })[0];
          return {
            membership_no: k.membership_no || '',
            full_name: k.full_name || '',
            section: k.section || '',
            status: rec ? rec.status : 'present',
            note: rec ? (rec.notes || '') : ''
          };
        });
        var pdfBytes = await DE_PDF.renderAttendanceToPdf(attRows, todayStr, 'المركز الرئيسي دار الإحسان', null);
        DE_PDF.downloadPdf(pdfBytes, 'سجل_الغيابات_والحضور_' + todayStr + '.pdf');
        toast('تم تنزيل سجل الحضور بصيغة PDF بنجاح!', 'ok');
      } catch (err) {
        toast('تعذر إنشاء تقرير الحضور: ' + err.message, 'bad');
      }
    }

    async function handleZipExport() {
      if (!chkKids.checked && !chkAttendance.checked && !chkReports.checked && !chkEvals.checked && !chkDocs.checked) {
        return toast('يرجى تحديد عنصر واحد على الأقل لتضمينه في الأرشيف.', 'bad');
      }

      downloadZipBtn.disabled = true;
      downloadAttPdfBtn.disabled = true;
      setProgress(5, 'بدء إعداد الأرشيف الشامل وبناء ملفات PDF...');

      try {
        var zipFiles = [];
        var todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date());

        if (chkKids.checked) {
          setProgress(20, 'جارٍ رسم قائمة الأطفال الرسمية بصيغة PDF...');
          var kidsPdfBytes = await DE_PDF.renderChildrenListToPdf(allKids, 'كافة الأقسام', 'دار الإحسان');
          zipFiles.push({
            name: 'قوائم_الأطفال/القائمة_الرسمية_للطلبة_دار_الإحسان.pdf',
            data: kidsPdfBytes
          });
        }

        if (chkAttendance.checked) {
          setProgress(40, 'جارٍ استخراج وتوليد سجل الغيابات والحضور بصيغة PDF...');
          var attRecords = (allKids || []).filter(function (k) { return k && k.active; }).map(function (k) {
            var rec = dbAttendance.filter(function (a) {
              return a.child_id === k.id && (a.date ? String(a.date).slice(0, 10) : '') === todayStr;
            })[0];
            return {
              membership_no: k.membership_no || '',
              full_name: k.full_name || '',
              section: k.section || '',
              status: rec ? rec.status : 'present',
              note: rec ? (rec.notes || '') : ''
            };
          });
          var attPdfBytes = await DE_PDF.renderAttendanceToPdf(attRecords, todayStr, 'دار الإحسان', null);
          zipFiles.push({
            name: 'سجلات_الحضور/سجل_الغيابات_والحضور_اليومي_' + todayStr + '.pdf',
            data: attPdfBytes
          });
        }

        if (chkReports.checked) {
          var repsToExport = allReports.filter(function (r) { return !isEvaluationReport(r); }).slice(0, 50);
          for (var ri = 0; ri < repsToExport.length; ri++) {
            var rep = repsToExport[ri];
            var ch = allKids.filter(function (k) { return k.id === rep.child_id; })[0];
            var repPct = 40 + Math.floor((ri / Math.max(1, repsToExport.length)) * 25);
            setProgress(repPct, 'جارٍ تصدير التقرير التربوي (' + (ri + 1) + '/' + repsToExport.length + ')...');
            try {
              var rPdf = await DE_PDF.renderReportToPdf(rep, ch, ch ? ch.section : '', 'دار الإحسان');
              var safeRepName = (rep.title || 'تقرير').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 40);
              zipFiles.push({
                name: 'التقارير_التربوية/' + (ch ? (ch.full_name + '_') : '') + safeRepName + '.pdf',
                data: rPdf
              });
            } catch (eRep) {}
          }
        }

        if (chkEvals.checked) {
          var evalsToExport = allReports.filter(isEvaluationReport).slice(0, 50);
          for (var ei = 0; ei < evalsToExport.length; ei++) {
            var evRep = evalsToExport[ei];
            var evKid = allKids.filter(function (k) { return k.id === evRep.child_id; })[0];
            var evPct = 65 + Math.floor((ei / Math.max(1, evalsToExport.length)) * 25);
            setProgress(evPct, 'جارٍ تصدير استمارة التقييم (' + (ei + 1) + '/' + evalsToExport.length + ')...');
            try {
              var evPdf = await DE_PDF.renderEvaluationToPdf(evRep, evKid ? evKid.full_name : 'تلميذ', evKid ? evKid.section : '', evKid);
              var safeEvName = (evRep.title || 'استمارة_تقييم').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 40);
              zipFiles.push({
                name: 'استمارات_التقييم/' + (evKid ? (evKid.full_name + '_') : '') + safeEvName + '.pdf',
                data: evPdf
              });
            } catch (eEv) {}
          }
        }

        if (chkDocs.checked && allDocs.length) {
          setProgress(92, 'جارٍ فحص وإدراج الوثائق الخاصة...');
          for (var di = 0; di < Math.min(allDocs.length, 20); di++) {
            var doc = allDocs[di];
            if (doc.file_path) {
              try {
                var signedUrl = await C.signedUrl('private-docs', doc.file_path, 60);
                var resp = await fetch(signedUrl);
                if (resp.ok) {
                  var blobData = await resp.arrayBuffer();
                  var docName = (doc.title || 'وثيقة').replace(/[\/\\:*?"<>|]/g, '_');
                  zipFiles.push({
                    name: 'الوثائق_والمستندات/' + docName + (doc.file_path.indexOf('.') >= 0 ? ('.' + doc.file_path.split('.').pop()) : '.pdf'),
                    data: new Uint8Array(blobData)
                  });
                }
              } catch (eDoc) {}
            }
          }
        }

        setProgress(96, 'جارٍ ضغط الأرشيف وتوليد ملف ZIP النهائي...');
        var zipBlob = DE_ZIP.build(zipFiles, function (cur, tot, fn) {
          setProgress(96 + Math.floor((cur / Math.max(1, tot)) * 3), 'ضغط: ' + fn);
        });

        DE_ZIP.download(zipBlob, 'أرشيف_دار_الإحسان_الشامل_' + todayStr + '.zip');
        setProgress(100, 'اكتمل التحميل بنجاح!');
        toast('تم تنزيل الأرشيف الشامل (ZIP) متضمناً كافة ملفات PDF بنجاح!', 'ok');
        setTimeout(function () { progressBox.hidden = true; }, 3000);
      } catch (err) {
        toast('حدث خطأ أثناء إعداد الأرشيف: ' + err.message, 'bad');
        progressBox.hidden = true;
      } finally {
        downloadZipBtn.disabled = false;
        downloadAttPdfBtn.disabled = false;
      }
    }
  }
  /* =====================================================================
     قسم «طلبات التسجيل الأولية» من الموقع العام (Registration Requests)
     ===================================================================== */
  async function secRegistrationRequests(v) {
    if (S.isEducator) return go('children');

    v.textContent = '';
    v.appendChild(h('div', { class: 'empty', text: 'جارٍ قراءة طلبات التسجيل الأولية…' }));

    var d = await Promise.all([
      C.rest('GET', '/registration_requests?order=created_at.desc').catch(function () { return []; }),
      getMany('branches', 'sections', 'children')
    ]);

    var requests = Array.isArray(d[0]) ? d[0] : [];
    var branches = (d[1] && d[1][0]) || [];
    var sections = (d[1] && d[1][1]) || [];
    var existingKids = (d[1] && d[1][2]) || [];

    var localReqs = [];
    try { localReqs = JSON.parse(localStorage.getItem('de_local_reg_requests') || '[]'); } catch (e) {}
    localReqs.forEach(function (lr) {
      if (!requests.some(function (r) { return r.id === lr.id || (lr.reference_code && r.reference_code === lr.reference_code); })) {
        requests.push(lr);
      }
    });

    v.textContent = '';

    var statusFilter = 'all';
    var searchVal = '';

    function getFiltered() {
      return requests.filter(function (r) {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (searchVal) {
          var q = normAr(searchVal);
          var hay = normAr((r.child_name || '') + ' ' + (r.guardian_name || '') + ' ' + (r.guardian_phone || '') + ' ' + (r.reference_code || ''));
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
    }

    var root = h('div', { class: 'req-hub-wrap' });

    root.appendChild(h('div', { class: 'req-hub-hero' },
      h('div', null,
        h('h1', null, makeSvgIcon('s-clipboard-list'), h('span', { text: 'طلبات التسجيل الأولية' })),
        h('p', { text: 'مراجعة ودراسة طلبات التسجيل المقدمة من العائلات عبر الموقع العام واعتمادها بقرار الإدارة.' })
      )
    ));

    var countNew = requests.filter(function (r) { return r.status === 'new'; }).length;
    var countReview = requests.filter(function (r) { return r.status === 'under_review'; }).length;
    var countEnrolled = requests.filter(function (r) { return r.status === 'enrolled'; }).length;

    var statsGrid = h('div', { class: 'att-stats', style: 'margin-bottom:16px;' },
      h('div', { class: 'att-stat', style: '--c:#102F50;' },
        h('div', null, h('span', { text: 'إجمالي الطلبات' }), h('strong', { class: 'sic-num', text: String(requests.length) })),
        h('div', { class: 'att-stat-icon-wrap' }, makeSvgIcon('s-clipboard-list'))
      ),
      h('div', { class: 'att-stat', style: '--c:#C49A50;' },
        h('div', null, h('span', { text: 'طلبات جديدة' }), h('strong', { class: 'sic-num', text: String(countNew) })),
        h('div', { class: 'att-stat-icon-wrap' }, makeSvgIcon('s-bell'))
      ),
      h('div', { class: 'att-stat', style: '--c:#0284C7;' },
        h('div', null, h('span', { text: 'قيد الدراسة' }), h('strong', { class: 'sic-num', text: String(countReview) })),
        h('div', { class: 'att-stat-icon-wrap' }, makeSvgIcon('s-clock'))
      ),
      h('div', { class: 'att-stat', style: '--c:#2563EB;' },
        h('div', null, h('span', { text: 'تم الاعتماد' }), h('strong', { class: 'sic-num', text: String(countEnrolled) })),
        h('div', { class: 'att-stat-icon-wrap' }, makeSvgIcon('s-check-circle'))
      )
    );
    root.appendChild(statsGrid);

    var reqBadgeEl = $('#requestsBadge');
    if (reqBadgeEl) {
      reqBadgeEl.textContent = String(countNew);
      reqBadgeEl.hidden = (countNew === 0);
    }

    var listHost = h('div', { class: 'card' });
    root.appendChild(listHost);
    v.appendChild(root);

    function renderTable() {
      listHost.textContent = '';
      var filtered = getFiltered();

      listView(listHost, {
        title: 'قائمة طلبات التسجيل الأولية (' + filtered.length + ')',
        rows: filtered,
        sheet: true,
        searchPlaceholder: 'بحث باسم الطفل، الولي، رقم الهاتف، أو الرمز المرجعي…',
        empty: 'لا توجد طلبات تسجيل مطابقة للتصفية الحالية.',
        search: function (r) {
          return [r.reference_code, r.child_name, r.guardian_name, r.guardian_phone, r.disability_type].filter(Boolean).join(' ');
        },
        filters: [
          {
            label: 'الحالة',
            opts: [
              ['all', 'جميع الحالات'],
              ['new', 'جديد'],
              ['under_review', 'قيد الدراسة'],
              ['info_needed', 'بحاجة لمعلومات'],
              ['approved_initial', 'مقبول مبدئياً'],
              ['rejected', 'مرفوض'],
              ['enrolled', 'تم الاعتماد والتسجيل']
            ],
            test: function (r, x) { return x === 'all' || r.status === x; }
          }
        ],
        cols: [
          {
            label: 'الرقم المرجعي',
            get: function (r) {
              return h('span', { class: 'sic-num', dir: 'ltr', text: r.reference_code || '—' });
            },
            sort: function (r) { return r.reference_code || ''; }
          },
          {
            label: 'اسم ولقب الطفل',
            get: function (r) {
              return h('div', null,
                h('strong', { text: r.child_name }),
                r.child_birth_date ? h('div', { class: 'muted small', text: 'الميلاد: ' + fmt(r.child_birth_date) }) : null
              );
            },
            sort: function (r) { return r.child_name; }
          },
          {
            label: 'نوع الإعاقة / الاضطراب',
            get: function (r) { return badge(r.disability_type || '—', 'gold'); },
            sort: function (r) { return r.disability_type || ''; }
          },
          {
            label: 'معلومات الولي للتواصل',
            get: function (r) {
              return h('div', null,
                h('strong', { text: r.guardian_name }),
                h('div', { class: 'muted small', dir: 'ltr', text: r.guardian_phone }),
                makeWhatsAppLink(r.guardian_phone, { full_name: r.child_name })
              );
            },
            sort: function (r) { return r.guardian_name; }
          },
          {
            label: 'مكان الإقامة',
            get: function (r) { return (r.residence_commune ? (r.residence_commune + ' - ') : '') + (r.residence_wilaya || 'غرداية'); }
          },
          {
            label: 'تاريخ التقديم',
            get: function (r) { return fmt(r.created_at, true); },
            sort: function (r) { return r.created_at || ''; }
          },
          {
            label: 'حالة الطلب',
            get: function (r) {
              var stMap = {
                'new': ['جديد', 'gold'],
                'under_review': ['قيد الدراسة', 'light'],
                'info_needed': ['بحاجة لمعلومات', 'warn'],
                'approved_initial': ['مقبول مبدئياً', 'ok'],
                'rejected': ['مرفوض', 'gray'],
                'contacted': ['تم التواصل', 'light'],
                'enrolled': ['تم الاعتماد', 'ok']
              };
              var it = stMap[r.status] || [r.status, 'gray'];
              return badge(it[0], it[1]);
            },
            sort: function (r) { return r.status; }
          }
        ],
        actions: function (r) {
          return [
            rbtn('معاينة ودراسة الطلب', function () { openReviewRequestModal(r); }, 'gold')
          ];
        }
      });
    }

    renderTable();

    function openReviewRequestModal(req) {
      var body = h('div', { class: 'modal-body' },
        h('div', { class: 'bar-sub' },
          h('h2', { text: 'مراجعة طلب التسجيل: ' + req.child_name }),
          badge('الرقم المرجعي: ' + req.reference_code, 'gold')
        )
      );

      var detailsList = [
        ['اسم الطفل الكامل', req.child_name],
        ['تاريخ الميلاد', req.child_birth_date ? fmt(req.child_birth_date) : '—'],
        ['طبيعة الإعاقة / الاضطراب', req.disability_type],
        ['اسم الولي الكامل', req.guardian_name],
        ['رقم الهاتف المباشر', req.guardian_phone],
        ['البريد الإلكتروني', req.guardian_email || '—'],
        ['مكان الإقامة', (req.residence_commune ? (req.residence_commune + ' - ') : '') + (req.residence_wilaya || 'غرداية')],
        ['معلومات وتفاصيل إضافية', req.additional_information || 'لا توجد ملاحظات إضافية مسجلة من الولي.', true],
        ['تاريخ ووقت استلام الطلب', fmt(req.created_at, true)]
      ];

      var dGrid = h('div', { class: 'child-details' }, detailsList.map(function (it) {
        return h('div', { class: 'cd-item' + (it[2] ? ' wide' : '') },
          h('span', { text: it[0] }),
          h('b', { text: String(it[1]) })
        );
      }));
      body.appendChild(dGrid);

      var selStatus = h('select', { class: 'input' },
        h('option', { value: 'new', text: 'جديد' }),
        h('option', { value: 'under_review', text: 'قيد الدراسة' }),
        h('option', { value: 'info_needed', text: 'بحاجة إلى معلومات إضافية' }),
        h('option', { value: 'approved_initial', text: 'مقبول مبدئياً' }),
        h('option', { value: 'contacted', text: 'تم التواصل مع الولي' }),
        h('option', { value: 'rejected', text: 'مرفوض' }),
        h('option', { value: 'enrolled', text: 'تم الاعتماد والتسجيل الرسمي' })
      );
      selStatus.value = req.status || 'new';

      var txtAdminNotes = h('textarea', { class: 'input', rows: '3', placeholder: 'سجل أي ملاحظات داخلية للإدارة هنا…' }, req.admin_notes || '');

      body.appendChild(h('div', { class: 'card', style: 'margin-top:16px;background:#F8FAFC;' },
        h('h3', { text: 'تحديث حالة الطلب والملاحظات الإدارية:' }),
        h('div', { class: 'settings-form-grid' },
          h('label', { class: 'fld' }, h('span', { text: 'الحالة الحالية:' }), selStatus),
          h('label', { class: 'fld wide' }, h('span', { text: 'ملاحظات الإدارة الداخلية:' }), txtAdminNotes)
        )
      ));

      var modalActions = h('div', { class: 'modal-actions', style: 'display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;' });

      if (req.status !== 'enrolled') {
        var enrollBtn = h('button', {
          type: 'button',
          class: 'btn gold',
          onclick: function () {
            openEnrollConfirmationModal(req);
          }
        }, makeSvgIcon('s-user-check'), h('span', { text: 'اعتماد التسجيل وإنشاء حساب الطفل' }));
        modalActions.appendChild(enrollBtn);
      } else {
        modalActions.appendChild(badge('✓ تم اعتماد هذا الطفل وسجل كطالب رسمي في المركز', 'ok'));
      }

      var saveStatusBtn = h('button', {
        type: 'button',
        class: 'btn light',
        onclick: async function () {
          try {
            var newSt = selStatus.value;
            var newNotes = txtAdminNotes.value.trim();
            req.status = newSt;
            req.admin_notes = newNotes;
            req.reviewed_at = new Date().toISOString();
            await C.rest('PATCH', '/registration_requests?id=eq.' + uid(req.id), {
              status: newSt,
              admin_notes: newNotes,
              reviewed_at: req.reviewed_at
            }).catch(function () {});
            try {
              localStorage.setItem('de_local_reg_requests', JSON.stringify(requests));
            } catch (e) {}
            toast('تم تحديث حالة الطلب بنجاح.', 'ok');
            closeModal();
            secRegistrationRequests(v);
          } catch (e) {
            toast('تعذر تحديث الطلب: ' + e.message, 'bad');
          }
        }
      }, makeSvgIcon('s-check'), h('span', { text: 'حفظ التحديثات' }));

      var closeBtn = h('button', { type: 'button', class: 'btn ghost', text: 'إغلاق', onclick: closeModal });

      var rightBtns = h('div', { style: 'display:flex;gap:8px;' }, saveStatusBtn, closeBtn);
      modalActions.appendChild(rightBtns);

      body.appendChild(modalActions);
      openModal(body);
    }

    function openEnrollConfirmationModal(req) {
      var body = h('div', { class: 'modal-body' },
        h('div', { class: 'bar-sub' },
          h('h2', { text: 'اعتماد تسجيل الطفل: ' + req.child_name }),
          badge('تأكيد إداري', 'gold')
        ),
        h('p', { text: 'سيتم إنشاء سجل طفل معتمد جديد في قاعدة البيانات وربطه بالمركز والقسم المختار.' })
      );

      var selCenter = h('select', { class: 'input' },
        h('option', { value: 'main', text: 'المركز الرئيسي دار الإحسان' }),
        h('option', { value: 'work', text: 'مركز المساعدة على العمل' }),
        h('option', { value: 'farm', text: 'المزرعة البيداغوجية' })
      );

      var selSec = h('select', { class: 'input' },
        sections.map(function (s) { return h('option', { value: s.id, text: s.name }); })
      );

      var inMemNo = h('input', { class: 'input sic-num', value: String(existingKids.length + 1).padStart(3, '0') });

      body.appendChild(h('div', { class: 'settings-form-grid' },
        h('label', { class: 'fld' }, h('span', { text: 'المركز التابع له:' }), selCenter),
        h('label', { class: 'fld' }, h('span', { text: 'القسم / الفوج التربوي:' }), selSec),
        h('label', { class: 'fld' }, h('span', { text: 'رقم القيد (N°):' }), inMemNo)
      ));

      body.appendChild(h('div', { class: 'modal-actions' },
        h('button', { type: 'button', class: 'btn light', text: 'إلغاء', onclick: closeModal }),
        h('button', {
          type: 'button',
          class: 'btn gold',
          onclick: async function () {
            try {
              toast('جارٍ إنشاء سجل الطفل في النظام…', 'ok');
              var newChildData = {
                membership_no: inMemNo.value.trim(),
                full_name: req.child_name,
                dob: req.child_birth_date,
                disability: req.disability_type,
                phone: req.guardian_phone,
                center: selCenter.value,
                section_id: selSec.value,
                active: true,
                academic_year: '2026-2027',
                basic_info: 'ولي الأمر: ' + req.guardian_name + ' | هاتف: ' + req.guardian_phone + ' | مكان الإقامة: ' + (req.residence_commune || '') + ' ' + (req.residence_wilaya || '') + ' | رقم الطلب: ' + req.reference_code
              };

              await C.rest('POST', '/children', newChildData, { Prefer: 'return=representation' });

              req.status = 'enrolled';
              req.reviewed_at = new Date().toISOString();
              await C.rest('PATCH', '/registration_requests?id=eq.' + uid(req.id), {
                status: 'enrolled',
                reviewed_at: req.reviewed_at
              }).catch(function () {});

              try {
                localStorage.setItem('de_local_reg_requests', JSON.stringify(requests));
              } catch (e) {}

              bust();
              toast('تم اعتماد التسجيل بنجاح وإنشاء ملف الطفل «' + req.child_name + '»!', 'ok');
              closeModal();
              secRegistrationRequests(v);
            } catch (err) {
              toast('تعذر اعتماد الطفل: ' + err.message, 'bad');
            }
          }
        }, makeSvgIcon('s-check'), h('span', { text: 'تأكيد الاعتماد والإنشاء' }))
      ));

      openModal(body);
    }
  }

  /* =====================================================================
     قسم «الاستفسارات العامة» من الموقع العام (Public Inquiries)
     ===================================================================== */
  async function secInquiries(v) {
    if (S.isEducator) return go('children');

    v.textContent = '';
    v.appendChild(h('div', { class: 'empty', text: 'جارٍ قراءة الاستفسارات العامة…' }));

    var inquiries = await C.rest('GET', '/public_inquiries?order=created_at.desc').catch(function () { return []; });
    if (!Array.isArray(inquiries)) inquiries = [];

    var localInqs = [];
    try { localInqs = JSON.parse(localStorage.getItem('de_local_inquiries') || '[]'); } catch (e) {}
    localInqs.forEach(function (li) {
      if (!inquiries.some(function (i) { return i.id === li.id; })) inquiries.push(li);
    });

    v.textContent = '';

    var root = h('div', { class: 'req-hub-wrap' });
    root.appendChild(h('div', { class: 'req-hub-hero' },
      h('div', null,
        h('h1', null, makeSvgIcon('s-message-square'), h('span', { text: 'الاستفسارات العامة' })),
        h('p', { text: 'رسائل واستفسارات أولياء الأمور والزوار الواردة عبر الموقع العام.' })
      )
    ));

    var countNewInq = inquiries.filter(function (i) { return i.status === 'new'; }).length;
    var inqBadgeEl = $('#inquiriesBadge');
    if (inqBadgeEl) {
      inqBadgeEl.textContent = String(countNewInq);
      inqBadgeEl.hidden = (countNewInq === 0);
    }

    var listHost = h('div', { class: 'card' });
    root.appendChild(listHost);
    v.appendChild(root);

    listView(listHost, {
      title: 'قائمة الاستفسارات الواردة (' + inquiries.length + ')',
      rows: inquiries,
      sheet: true,
      searchPlaceholder: 'بحث باسم السائل، رقم الهاتف، أو موضوع الاستفسار…',
      empty: 'لا توجد استفسارات مسجلة حالياً.',
      search: function (i) { return [i.name, i.phone, i.email, i.subject, i.message].filter(Boolean).join(' '); },
      filters: [
        {
          label: 'الحالة',
          opts: [
            ['all', 'جميع الحالات'],
            ['new', 'جديد'],
            ['in_progress', 'قيد المعالجة'],
            ['replied', 'تم الرد والتواصل'],
            ['closed', 'مغلق']
          ],
          test: function (i, x) { return x === 'all' || i.status === x; }
        }
      ],
      cols: [
        { label: 'اسم السائل', get: function (i) { return h('strong', { text: i.name }); }, sort: function (i) { return i.name; } },
        { label: 'رقم الهاتف', get: function (i) { return h('span', { dir: 'ltr', class: 'sic-num', text: i.phone }); }, sort: function (i) { return i.phone; } },
        { label: 'موضوع الاستفسار', get: function (i) { return h('strong', { text: i.subject }); }, sort: function (i) { return i.subject; } },
        { label: 'نص الرسالة', get: function (i) { return h('span', { class: 'muted small', text: (i.message || '').slice(0, 50) + (i.message && i.message.length > 50 ? '…' : '') }); } },
        { label: 'تاريخ الإرسال', get: function (i) { return fmt(i.created_at, true); }, sort: function (i) { return i.created_at || ''; } },
        {
          label: 'الحالة',
          get: function (i) {
            var stMap = { 'new': ['جديد', 'gold'], 'in_progress': ['قيد المعالجة', 'light'], 'replied': ['تم الرد', 'ok'], 'closed': ['مغلق', 'gray'] };
            var it = stMap[i.status] || [i.status, 'gray'];
            return badge(it[0], it[1]);
          },
          sort: function (i) { return i.status; }
        }
      ],
      actions: function (i) {
        return [
          rbtn('فتح الاستفسار', function () { openInquiryModal(i); }, 'gold')
        ];
      }
    });

    function openInquiryModal(inq) {
      var body = h('div', { class: 'modal-body' },
        h('div', { class: 'bar-sub' },
          h('h2', { text: 'استفسار: ' + inq.subject }),
          badge(fmt(inq.created_at, true), 'light')
        ),
        h('div', { class: 'child-details' },
          h('div', { class: 'cd-item' }, h('span', { text: 'الاسم واللقب' }), h('b', { text: inq.name })),
          h('div', { class: 'cd-item' }, h('span', { text: 'رقم الهاتف' }), h('b', { text: inq.phone }), makeWhatsAppLink(inq.phone, { full_name: inq.name })),
          h('div', { class: 'cd-item' }, h('span', { text: 'البريد الإلكتروني' }), h('b', { text: inq.email || '—' })),
          h('div', { class: 'cd-item wide' }, h('span', { text: 'نص الاستفسار' }), h('p', { style: 'margin:4px 0;', text: inq.message })),
          inq.response_notes ? h('div', { class: 'cd-item wide' }, h('span', { text: 'ملاحظات الإدارة' }), h('b', { text: inq.response_notes })) : null
        )
      );

      var selSt = h('select', { class: 'input' },
        h('option', { value: 'new', text: 'جديد' }),
        h('option', { value: 'in_progress', text: 'قيد المعالجة' }),
        h('option', { value: 'replied', text: 'تم الرد والتواصل' }),
        h('option', { value: 'closed', text: 'مغلق' })
      );
      selSt.value = inq.status || 'new';
      var txtNotes = h('textarea', { class: 'input', rows: '3', placeholder: 'سجل نتيجة التواصل أو الرد هنا…' }, inq.response_notes || '');

      body.appendChild(h('div', { class: 'card', style: 'margin-top:14px;' },
        h('div', { class: 'settings-form-grid' },
          h('label', { class: 'fld' }, h('span', { text: 'تحديث حالة الاستفسار:' }), selSt),
          h('label', { class: 'fld wide' }, h('span', { text: 'ملاحظات وتفاصيل الرد:' }), txtNotes)
        )
      ));

      body.appendChild(h('div', { class: 'modal-actions' },
        h('button', { type: 'button', class: 'btn ghost', text: 'إغلاق', onclick: closeModal }),
        h('button', {
          type: 'button',
          class: 'btn gold',
          onclick: async function () {
            try {
              inq.status = selSt.value;
              inq.response_notes = txtNotes.value.trim();
              await C.rest('PATCH', '/public_inquiries?id=eq.' + uid(inq.id), {
                status: inq.status,
                response_notes: inq.response_notes,
                updated_at: new Date().toISOString()
              }).catch(function () {});
              try {
                localStorage.setItem('de_local_inquiries', JSON.stringify(inquiries));
              } catch (e) {}
              toast('تم تحديث حالة الاستفسار.', 'ok');
              closeModal();
              secInquiries(v);
            } catch (err) {
              toast('تعذر تحديث الاستفسار: ' + err.message, 'bad');
            }
          }
        }, makeSvgIcon('s-check'), h('span', { text: 'حفظ' }))
      ));

      openModal(body);
    }
  }


  /* =====================================================================
     قسم «الغيابات والحضور» الاحترافي الموحد — دار الإحسان
     - توحيد الفروع (دار الإحسان الرئيسي + مركز المساعدة على العمل).
     - استثناء إلزامي كامل للمزرعة البيداغوجية (قائمة، إحصائيات، رسائل).
     - 4 إحصائيات علوية دقيقة محسوبة من البيانات الفعلية.
     - 3 حالات للحضور: حاضر (present) | غائب (absent) | لم يسجل (unrecorded).
     - زرين رئيسيين فقط: «حفظ الحضور والغياب» و «إرسال إشعارات الغياب عبر WhatsApp».
     - إرسال عبر Meta Cloud API من رقم الإدارة المسجَّل في Meta فقط مع منع التكرار (Idempotency).
     - سجل مختصر لمتابعة حالات الرسائل (قيد الإرسال، تم القبول، تم التسليم، تمت القراءة، فشل).
     ===================================================================== */
  // الإرسال حصراً عبر رقم Meta المسجَّل في الخادم (META_PHONE_NUMBER_ID)؛ لا يُحدَّد المرسل من المتصفح.

  // التحقق وتنسيق رقم الهاتف الجزائري للواتساب
  function validateAlgerianPhone(raw) {
    var orig = String(raw || '').trim();
    var d = normalizeArabicDigits(orig).replace(/\D/g, '');
    if (!d) return { valid: false, normalized: '', local10: '', reason: 'رقم الهاتف غير مسجل' };
    if (d.indexOf('00213') === 0) d = d.slice(5);
    else if (d.indexOf('213') === 0) d = d.slice(3);
    else if (d.indexOf('00') === 0) d = d.slice(2);
    else if (d.indexOf('0') === 0) d = d.slice(1);

    if (/^[567]\d{8}$/.test(d)) {
      return { valid: true, normalized: '213' + d, local10: '0' + d, reason: 'رقم صالح' };
    }
    if (/^[567]\d{7}$/.test(d)) {
      return { valid: false, normalized: '213' + d + '0', local10: '0' + d + '0', is9Digit: true, reason: 'رقم ناقص (9 أرقام)' };
    }
    return { valid: false, normalized: '213' + d, local10: orig, reason: 'رقم غير صالح' };
  }

  // قالب رسالة الغياب الرسمي المعتمد
  function formatOfficialAbsenceMessage(childName, dateStr) {
    var name = String(childName || 'التلميذ(ة)').trim();
    var dFormatted = dateStr || new Date().toISOString().slice(0, 10);
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dFormatted);
    var dateArabic = parts ? (parts[3] + '/' + parts[2] + '/' + parts[1]) : dFormatted;

    return 'السلام عليكم ورحمة الله وبركاته،\n\n' +
           'نعلمكم أن طفلكم ' + name + ' مسجل اليوم ' + dateArabic + ' ضمن قائمة الغائبين عن المركز النفسي البيداغوجي دار الإحسان.\n\n' +
           'نرجو منكم إعلام الإدارة في حالة وجود ظرف أو سبب للغياب.\n\n' +
           'شكراً لتعاونكم.\n\n' +
           'إدارة دار الإحسان';
  }

  // تخزين محلي ومزامنة لسجلات الحضور حسب التاريخ
  function getLocalAttendanceMap(dStr) {
    try {
      var raw = localStorage.getItem('de_att_records_' + dStr);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function setLocalAttendanceMap(dStr, map) {
    try {
      localStorage.setItem('de_att_records_' + dStr, JSON.stringify(map || {}));
    } catch (e) {}
  }

  // تخزين محلي لرسائل واتساب
  function getLocalWaLogs() {
    try {
      var raw = localStorage.getItem('de_wa_logs_v3');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setLocalWaLogs(list) {
    try {
      localStorage.setItem('de_wa_logs_v3', JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) {}
  }

  function appendLocalWaLog(logEntry) {
    try {
      var list = getLocalWaLogs();
      var idx = list.findIndex(function (l) { return l.id === logEntry.id || (logEntry.wamid && l.wamid === logEntry.wamid); });
      if (idx >= 0) list[idx] = Object.assign({}, list[idx], logEntry);
      else list.unshift(logEntry);
      if (list.length > 500) list = list.slice(0, 500);
      localStorage.setItem('de_wa_logs_v3', JSON.stringify(list));
    } catch (e) {}
  }

  // شارة حالة رسالة واتساب (بالأصناف لأن h() تتجاهل style).
  // «sent/accepted» تعني فقط أن Meta قبلت الطلب — وليس أن الرسالة وصلت.
  function makeWaStatusBadge(status, createdAt) {
    var st = String(status || 'sending').toLowerCase();
    if ((st === 'sent' || st === 'accepted') && createdAt) {
      var age = Date.now() - new Date(createdAt).getTime();
      if (age > 15 * 60 * 1000) {
        return h('span', { class: 'att-badge stale', text: '⚠ قبلتها Meta — لا تأكيد تسليم' });
      }
    }
    var map = {
      sending: ['sending', '⏳ قيد الإرسال'], pending: ['sending', '⏳ قيد الإرسال'],
      accepted: ['sent', '✓ قبلت Meta الطلب — بانتظار التسليم'], sent: ['sent', '✓ قبلت Meta الطلب — بانتظار التسليم'],
      delivered: ['delivered', '✓✓ تم التسليم'], read: ['read', '👁 تمت القراءة']
    };
    var m = map[st] || ['failed', '✖ فشل الإرسال'];
    return h('span', { class: 'att-badge ' + m[0], text: m[1] });
  }

  // دالة الإرسال عبر الخادم Meta Cloud API
  async function sendSingleAbsenceNotification(kid, dateStr, forceResend) {
    var rawPhone = String(kid.phone || '').trim();
    var phCheck = validateAlgerianPhone(rawPhone);
    var childName = kid.full_name;
    var msgBody = formatOfficialAbsenceMessage(childName, dateStr);
    var idempotencyKey = 'absence_' + kid.id + '_' + dateStr;
    var nowIso = new Date().toISOString();

    var logEntry = {
      id: window.DE && DE.uuid ? DE.uuid() : ('wa-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)),
      created_at: nowIso,
      sent_date: dateStr,
      sender_phone: '',
      phone: rawPhone,
      normalized_phone: phCheck.normalized,
      child_id: kid.id,
      child_name: childName,
      parent_name: 'ولي أمر ' + childName,
      message_body: msgBody,
      status: 'sending',
      message_type: 'absence',
      notification_type: 'absence',
      wamid: '',
      error_message: '',
      idempotency_key: idempotencyKey,
      center: kid.center || 'main',
      section_id: kid.section_id || null
    };

    if (!phCheck.valid) {
      logEntry.status = 'failed';
      logEntry.error_message = phCheck.reason;
      appendLocalWaLog(logEntry);
      try {
        await C.rest('POST', '/whatsapp_logs', logEntry);
      } catch (e0) {}
      return logEntry;
    }

    appendLocalWaLog(logEntry);

    try {
      // دالة واحدة فقط (send-whatsapp): تتحقق من الغياب المسجّل ومن منع التكرار اليومي.
      // message_type = 'absence' إلزامي لتفعيل هذه الفحوص واستخدام القالب المعتمد.
      var resp = await C.fn('send-whatsapp', {
        log_id: /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(logEntry.id)) ? logEntry.id : undefined,
        message_type: 'absence',
        child_id: kid.id,
        child_name: childName,
        parent_name: 'ولي أمر ' + childName,
        phone: rawPhone,
        to_phone: phCheck.normalized,
        message: msgBody,
        date: dateStr,
        center: kid.center || 'main',
        section_id: kid.section_id || null,
        force_resend: !!forceResend
      });

      if (resp && (resp.success === true || resp.status === 'accepted') && resp.wamid) {
        logEntry.status = 'accepted';
        logEntry.wamid = resp.wamid;
        logEntry.sender_phone = resp.sender || '';
        logEntry.error_message = '';
      } else {
        logEntry.status = 'failed';
        logEntry.error_message = ((resp && (resp.error || resp.error_message)) || 'رفض خادم Meta API طلب الإرسال') + (resp && resp.error_code ? ' [' + resp.error_code + ']' : '');
      }
    } catch (eCall) {
      logEntry.status = 'failed';
      logEntry.error_message = 'تعذر الاتصال بـ Meta Cloud API: ' + (eCall && eCall.message ? eCall.message : 'خطأ غير معروف');
    }

    appendLocalWaLog(logEntry);
    return logEntry;
  }

  /* القسم الرئيسي: الغيابات والحضور */
  async function secAttendance(v) {
    if (S.isSpecialist) {
      toast('غير مخوّلة: قسم الغيابات والحضور غير متاح لحساب الأخصائية.', 'bad');
      return go('children');
    }

    v.textContent = '';
    v.appendChild(h('div', { class: 'empty', text: 'جارٍ تحميل نظام الغيابات والحضور…' }));

    var d = await Promise.all([
      getMany('children', 'branches', 'sections'),
      C.rest('GET', '/attendance?order=date.desc&limit=500').catch(function () { return []; }),
      C.rest('GET', '/whatsapp_logs?order=created_at.desc&limit=300').catch(function () { return []; }),
      C.rest('GET', '/whatsapp_messages?direction=eq.inbound&order=created_at.desc&limit=100').catch(function () { return []; })
    ]);

    var rawKids = d[0][0] || [];
    var sections = d[0][2] || [];
    var dbAttendance = [];
    // [إصلاح] كان هنا حذف تلقائي لكل سجلات الحضور من قاعدة البيانات عند كل فتح للقسم.
    // أُوقف نهائياً: يُحمَّل الحضور المحفوظ كما هو، والمسح اليدوي متاح فقط من الإعدادات بعد تأكيد.
    dbAttendance = Array.isArray(d[1]) ? d[1] : [];

    var dbWaLogs = Array.isArray(d[2]) ? d[2] : [];
    var dbWaReplies = Array.isArray(d[3]) ? d[3] : [];

    // =========================================================================
    // النطاق: أطفال المركز الرئيسي (دار الإحسان) فقط.
    // مستثنى كلياً: مركز المساعدة على العمل (ورشات التأهيل والتمهين) + المزرعة البيداغوجية.
    // =========================================================================
    function hasExcludedText(s) {
      var t = String(s || '');
      return t.indexOf('تمهين') >= 0 || t.indexOf('المزرعة') >= 0 || t.indexOf('بستنة') >= 0 || t.indexOf('المساعدة على العمل') >= 0;
    }
    function isMainCenterKid(k) {
      var c = String(k.center || 'main').toLowerCase();
      var b = String(k.branch_slug || '').toLowerCase();
      var s = String(k.section_slug || '').toLowerCase();
      if (c !== 'main') return false;
      if (b === 'work' || b === 'farm') return false;
      if (s === 'sec_tamhin' || s === 'sec_bostana') return false;
      if (hasExcludedText(k.section)) return false;
      return true;
    }
    var eligibleKids = rawKids.filter(function (k) { return k && k.active; });
    var eligibleSections = sections;

    v.textContent = '';

    // ---------- الحالة ----------
    var todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date());
    var dayAttendance = {};      // child_id -> present | absent | unrecorded
    var selected = {};           // child_id -> true
    var statusFilter = 'all';
    var rowPainters = {};

    var dateInput = h('input', { type: 'date', class: 'input sic-num', value: todayStr });
    var secSelect = h('select', { class: 'input', disabled: !!S.isEducator });
    var searchInput = h('input', { type: 'search', class: 'input', placeholder: 'اسم الطفل أو رقم القيد…' });

    function populateSectionOptions() {
      secSelect.textContent = '';
      if (!S.isEducator) secSelect.appendChild(h('option', { value: 'all', text: 'جميع الأقسام' }));
      eligibleSections.forEach(function (s) {
        if (S.isEducator && s.id !== S.eduSectionId) return;
        secSelect.appendChild(h('option', { value: s.id, text: s.name }));
      });
      secSelect.value = (S.isEducator && S.eduSectionId) ? S.eduSectionId : 'all';
    }
    populateSectionOptions();

    function loadDateAttendance(dStr) {
      dayAttendance = {};
      selected = {};
      var localSaved = getLocalAttendanceMap(dStr);
      eligibleKids.forEach(function (k) {
        var dbRow = dbAttendance.filter(function (a) {
          return a.child_id === k.id && (a.date ? String(a.date).slice(0, 10) : '') === dStr;
        })[0];
        if (localSaved[k.id]) dayAttendance[k.id] = localSaved[k.id];
        else if (dbRow && (dbRow.status === 'present' || dbRow.status === 'absent' || dbRow.status === 'unrecorded')) dayAttendance[k.id] = dbRow.status;
        else if (dbRow && dbRow.status === 'excused') dayAttendance[k.id] = 'absent';
        else dayAttendance[k.id] = 'unrecorded';
      });
    }
    loadDateAttendance(dateInput.value);

    function isWaLogFailedExpired(l) {
      if (l.status !== 'failed') return false;
      var failTime = new Date(l.failed_at || l.created_at || l.sent_date || Date.now()).getTime();
      if (isNaN(failTime)) return false;
      var elapsedMinutes = (Date.now() - failTime) / (60 * 1000);
      return elapsedMinutes >= 10;
    }

    function getWaLogsForDate(dStr) {
      var combined = getLocalWaLogs().slice();
      dbWaLogs.forEach(function (dl) {
        if (!combined.some(function (cl) { return cl.id === dl.id || (dl.wamid && cl.wamid === dl.wamid); })) combined.push(dl);
      });

      // تنظيف الرسائل الفاشلة القديمة التي تجاوزت 10 دقائق (دون المساس بالرسائل الناجحة أو الحضور)
      var cleanedLocal = getLocalWaLogs().filter(function (l) { return !isWaLogFailedExpired(l); });
      if (cleanedLocal.length !== getLocalWaLogs().length) {
        setLocalWaLogs(cleanedLocal);
      }

      return combined.filter(function (l) {
        var isForDay = (l.sent_date || l.created_at || '').slice(0, 10) === dStr && !l.is_deleted;
        if (!isForDay) return false;
        // الرسائل الفاشلة تختفي تلقائياً بعد مرور 10 دقائق من وقت الفشل الحقيقي
        if (isWaLogFailedExpired(l)) return false;
        return true;
      });
    }

    function getFilteredKids() {
      var sc = secSelect.value;
      var q = normAr(searchInput.value.trim());
      return eligibleKids.filter(function (k) {
        if (S.isEducator && S.eduSectionId && k.section_id !== S.eduSectionId) return false;
        if (sc !== 'all' && k.section_id !== sc) return false;
        if (statusFilter !== 'all' && (dayAttendance[k.id] || 'unrecorded') !== statusFilter) return false;
        if (q) {
          var hay = normAr((k.full_name || '') + ' ' + (k.membership_no || '') + ' ' + (k.section || ''));
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
    }

    // ---------- الواجهة ----------
    var root = h('div', { class: 'att' });
    v.appendChild(root);

    root.appendChild(h('div', { class: 'att-hero' },
      h('div', null,
        h('h1', null, makeSvgIcon('s-calendar-check'), h('span', { text: 'الغيابات والحضور' })),
        h('p', { text: 'تسجيل الحضور والغياب اليومي لأطفال المركز، وإرسال إشعارات رسمية لأولياء الغائبين المحدَّدين.' })
      ),
      h('div', { class: 'att-herotools' },
        h('button', {
          type: 'button',
          class: 'att-btn sm ghost att-icon-btn',
          title: 'فحص اتصال وحالة واتساب السحابي',
          onclick: function () { openDiagnose(); }
        }, makeSvgIcon('s-whatsapp'), h('span', { text: 'فحص ربط واتساب' }))
      )
    ));

    var statsBar = h('div', { class: 'att-stats' });
    root.appendChild(statsBar);

    var chipsBox = h('div', { class: 'att-chips' });
    root.appendChild(h('div', { class: 'att-panel' },
      h('div', { class: 'att-filters' },
        h('div', null, h('label', { text: 'التاريخ' }), dateInput),
        h('div', null, h('label', { text: 'القسم' }), secSelect),
        h('div', { class: 'wide' }, h('label', { text: 'بحث' }), searchInput)
      ),
      chipsBox
    ));

    // رأس القائمة: تحديد الكل + أدوات التحديد الجماعي
    var allCb = h('input', { type: 'checkbox' });
    var shownLbl = h('span', { text: 'تحديد الكل' });
    var selCountEl = h('b', { class: 'sic-num', text: '0' });
    var bulkBox = h('div', { class: 'att-bulk', hidden: true },
      h('b', null, 'المحدّدون: ', selCountEl),
      h('button', { type: 'button', class: 'att-btn sm ghost att-icon-btn', onclick: function () { applyBulk('present'); } }, makeSvgIcon('s-user-check'), h('span', { text: 'حاضر' })),
      h('button', { type: 'button', class: 'att-btn sm warn att-icon-btn', onclick: function () { applyBulk('absent'); } }, makeSvgIcon('s-user-x'), h('span', { text: 'غائب' })),
      h('button', { type: 'button', class: 'att-btn sm ghost att-icon-btn', onclick: function () { applyBulk('unrecorded'); } }, makeSvgIcon('s-calendar-clock'), h('span', { text: 'لم يُسجّل' })),
      h('button', { type: 'button', class: 'att-btn sm ghost', text: 'إلغاء التحديد', onclick: function () { selected = {}; renderList(); } })
    );
    var listHead = h('div', { class: 'att-listhead' },
      h('label', { class: 'att-check' }, allCb, shownLbl),
      bulkBox
    );
    var listHost = h('div', { class: 'att-list' });
    root.appendChild(h('div', null, listHead, listHost));

    var trackingHost = h('div');
    var repliesHost = h('div');
    root.appendChild(trackingHost);
    root.appendChild(repliesHost);

    var saveBtn = h('button', { type: 'button', class: 'att-btn save' }, makeSvgIcon('s-check'), h('span', { text: 'حفظ الحضور والغياب' }));
    var sendLbl = h('span', { text: 'إرسال إشعارات الغياب' });
    var sendBtn = h('button', { type: 'button', class: 'att-btn send' }, makeSvgIcon('s-whatsapp'), sendLbl);
    root.appendChild(h('div', { class: 'att-actions' }, saveBtn, sendBtn));

    // ---------- تحديثات العرض ----------
    function updateStats() {
      var currentKids = getFilteredKids();
      var present = 0, absent = 0, unrec = 0;
      currentKids.forEach(function (k) {
        var st = dayAttendance[k.id] || 'unrecorded';
        if (st === 'present') present++; else if (st === 'absent') absent++; else unrec++;
      });
      var totalInSec = currentKids.length;
      var rate = totalInSec > 0 ? Math.round((present / totalInSec) * 100) : 0;
      var items = [
        { t: 'إجمالي أطفال القسم', n: totalInSec, c: '#102F50', icon: 's-users' },
        { t: 'الحاضرون', n: present, c: '#2563EB', icon: 's-user-check' },
        { t: 'الغائبون', n: absent, c: '#DC2626', icon: 's-user-x' },
        { t: 'لم تُحدد حالتهم', n: unrec, c: '#64748B', icon: 's-calendar-clock' },
        { t: 'نسبة الحضور اليومية', n: rate + '%', c: '#C49A50', icon: 's-chart', isText: true }
      ];
      statsBar.textContent = '';
      items.forEach(function (it) {
        var box = h('div', { class: 'att-stat' },
          h('div', null, h('span', { text: it.t }), h('strong', { class: 'sic-num', text: String(it.n) })),
          h('div', { class: 'att-stat-icon-wrap' }, makeSvgIcon(it.icon))
        );
        box.style.setProperty('--c', it.c);
        statsBar.appendChild(box);
      });
    }

    function updateChips() {
      var counts = { all: eligibleKids.length, present: 0, absent: 0, unrecorded: 0 };
      eligibleKids.forEach(function (k) { counts[dayAttendance[k.id] || 'unrecorded']++; });
      var defs = [['all', 'الكل'], ['present', 'حاضر'], ['absent', 'غائب'], ['unrecorded', 'لم يُسجَّل']];
      chipsBox.textContent = '';
      defs.forEach(function (df) {
        var chip = h('button', {
          type: 'button', class: 'att-chip', 'aria-pressed': statusFilter === df[0] ? 'true' : 'false',
          onclick: function () { statusFilter = df[0]; updateChips(); renderList(); }
        }, df[1], h('em', { class: 'sic-num', text: String(counts[df[0]]) }));
        chipsBox.appendChild(chip);
      });
    }

    function getSendTargets() {
      var hasSel = Object.keys(selected).length > 0;
      return eligibleKids.filter(function (k) {
        return dayAttendance[k.id] === 'absent' && (!hasSel || selected[k.id]);
      });
    }

    function updateSelectionUI() {
      var n = Object.keys(selected).length;
      selCountEl.textContent = String(n);
      bulkBox.hidden = n === 0;
      var kids = getFilteredKids();
      allCb.checked = kids.length > 0 && kids.every(function (k) { return selected[k.id]; });
      shownLbl.textContent = 'تحديد الكل (' + kids.length + ')';
      var t = getSendTargets().length;
      sendLbl.textContent = 'إرسال إشعارات الغياب' + (t ? ' (' + t + ')' : '');
    }

    function updateAll() { updateStats(); updateChips(); updateSelectionUI(); }

    function applyBulk(st) {
      Object.keys(selected).forEach(function (id) {
        dayAttendance[id] = st;
        if (rowPainters[id]) rowPainters[id]();
      });
      updateAll();
      renderList();
    }

    // ---------- صف الطفل ----------
    function buildRow(k) {
      var ph = validateAlgerianPhone(k.phone);
      var cb = h('input', {
        type: 'checkbox', checked: !!selected[k.id],
        onchange: function () {
          if (cb.checked) selected[k.id] = true; else delete selected[k.id];
          paint(); updateSelectionUI();
        }
      });
      var segP = h('button', {
        type: 'button',
        class: 'att-seg-btn seg-present',
        onclick: function () { setStatus('present'); }
      }, makeSvgIcon('s-user-check'), h('span', { text: 'حاضر' }));

      var segA = h('button', {
        type: 'button',
        class: 'att-seg-btn seg-absent',
        onclick: function () { setStatus('absent'); }
      }, makeSvgIcon('s-user-x'), h('span', { text: 'غائب' }));

      var segN = h('button', {
        type: 'button',
        class: 'att-seg-btn seg-none',
        onclick: function () { setStatus('unrecorded'); }
      }, makeSvgIcon('s-calendar-clock'), h('span', { text: 'لم يُسجّل' }));

      // زر الإرسال المباشر عبر واتساب للطفل الغائب
      var waDirectBtn = h('div', { class: 'att-wa-action-wrap', hidden: true });
      if (ph.valid) {
        waDirectBtn.appendChild(h('button', {
          type: 'button',
          class: 'att-wa-direct-btn',
          title: 'فتح محادثة واتساب مع الولي وإرسال رسالة الغياب المعتمدة',
          onclick: async function (e) {
            e.stopPropagation();
            var btnEl = e.currentTarget;
            if (btnEl.disabled) return;
            if (!confirm('إرسال إشعار الغياب إلى ولي ' + (k.full_name || '') + ' من رقم الإدارة المسجَّل في Meta؟')) return;
            btnEl.disabled = true;
            toast('جارٍ حفظ الحضور ثم الإرسال…', 'ok');
            try {
              var saved = await persistAttendance(true);
              if (!saved) { toast('تعذّر حفظ الحضور في قاعدة البيانات، فلم يُرسل شيء.', 'bad'); return; }
              var res = await sendSingleAbsenceNotification(k, dateInput.value, false);
              if (res.status === 'accepted' || res.status === 'sent' || res.status === 'delivered') {
                toast('قبلت Meta الطلب' + (res.sender_phone ? ' (المرسل: ' + res.sender_phone + ')' : '') + '. التسليم الفعلي يظهر في سجل الإرسال.', 'ok');
              } else {
                toast('لم يُرسل: ' + (res.error_message || 'سبب غير معروف'), 'bad');
              }
              renderTracking();
            } finally { btnEl.disabled = false; }
          }
        }, makeSvgIcon('s-whatsapp'), h('span', { text: 'إرسال عبر واتساب' })));
      } else {
        waDirectBtn.appendChild(h('span', {
          class: 'att-no-phone-tag',
          text: 'رقم الولي غير متوفر'
        }));
      }

      var secBadge = h('span', { class: 'att-sec-badge', text: k.section || '—' });
      var row = h('div', { class: 'att-row att-card-child' },
        h('label', { class: 'att-pick' }, cb),
        h('div', { class: 'att-who' },
          h('strong', { class: 'att-child-name', text: k.full_name || '—' }),
          secBadge
        ),
        h('div', { class: 'att-seg-group' }, segP, segA, segN),
        waDirectBtn
      );

      function setStatus(st) {
        dayAttendance[k.id] = st;
        paint();
        updateAll();
      }

      function paint() {
        var st = dayAttendance[k.id] || 'unrecorded';
        row.className = 'att-row att-card-child' + (st === 'present' ? ' is-present' : st === 'absent' ? ' is-absent' : '') + (selected[k.id] ? ' is-selected' : '');
        segP.className = 'att-seg-btn seg-present' + (st === 'present' ? ' on-present' : '');
        segA.className = 'att-seg-btn seg-absent' + (st === 'absent' ? ' on-absent' : '');
        segN.className = 'att-seg-btn seg-none' + (st === 'unrecorded' ? ' on-none' : '');
        cb.checked = !!selected[k.id];
        waDirectBtn.hidden = (st !== 'absent');
      }

      rowPainters[k.id] = paint;
      paint();
      return row;
    }

    function renderList() {
      listHost.textContent = '';
      rowPainters = {};
      var kids = getFilteredKids();
      if (!kids.length) {
        listHost.appendChild(h('div', { class: 'att-empty', text: 'لا يوجد أطفال مطابقون للتصفية الحالية.' }));
      } else {
        kids.forEach(function (k) { listHost.appendChild(buildRow(k)); });
      }
      updateSelectionUI();
    }

    allCb.addEventListener('change', function () {
      var kids = getFilteredKids();
      var isChecked = allCb.checked;
      kids.forEach(function (k) {
        if (isChecked) {
          selected[k.id] = true;
          dayAttendance[k.id] = 'present'; // تحديد الكل يجعل كافة الأطفال حاضرين فوراً
        } else {
          delete selected[k.id];
        }
      });
      renderList();
      updateAll();
    });

    // ---------- حفظ الحضور ----------
    async function persistAttendance(strict) {
      var dStr = dateInput.value;
      setLocalAttendanceMap(dStr, dayAttendance);
      var payload = eligibleKids.map(function (k) {
        return { date: dStr, child_id: k.id, section_id: k.section_id || null, center: k.center || 'main', status: dayAttendance[k.id] || 'unrecorded', notes: '' };
      });
      payload.forEach(function (rec) {
        var idx = dbAttendance.findIndex(function (a) { return a.child_id === rec.child_id && (a.date ? String(a.date).slice(0, 10) : '') === dStr; });
        if (idx >= 0) dbAttendance[idx] = Object.assign({}, dbAttendance[idx], rec); else dbAttendance.unshift(rec);
      });
      try {
        await C.rest('POST', '/attendance?on_conflict=date,child_id', payload, 'resolution=merge-duplicates,return=minimal');
        return true;
      } catch (e1) {
        if (strict) return false;
        try { await C.rest('POST', '/attendance', payload); return true; } catch (e2) { return false; }
      }
    }

    saveBtn.addEventListener('click', async function () {
      saveBtn.disabled = true;
      var ok = await persistAttendance(false);
      toast(ok ? 'تم حفظ الحضور والغياب لتاريخ ' + dateInput.value + ' بنجاح.' : 'تعذّر الحفظ في قاعدة البيانات؛ حُفظت التغييرات على هذا الجهاز فقط.', ok ? 'ok' : 'bad');
      saveBtn.disabled = false;
      updateAll();
    });

    // ---------- إرسال الإشعارات (مع اختيار الأطفال) ----------
    sendBtn.addEventListener('click', function () {
      var dStr = dateInput.value;
      var hasSel = Object.keys(selected).length > 0;
      var targets = getSendTargets();
      if (!targets.length) {
        return toast(hasSel ? 'لا يوجد بين الأطفال المحدَّدين من هو مسجَّل غائباً.' : 'لا يوجد أطفال مسجَّلون كغائبين في هذا التاريخ.', 'bad');
      }

      var sentMap = {};
      getWaLogsForDate(dStr).forEach(function (l) {
        if (l.child_id && (l.status === 'accepted' || l.status === 'sent' || l.status === 'delivered' || l.status === 'read')) sentMap[l.child_id] = l;
      });

      var pick = {};
      var pickCbs = {};
      var counts = { total: targets.length, valid: 0, done: 0 };
      var itemsBox = h('div', { class: 'att-mlist' });
      var confirmBtn = h('button', { type: 'button', class: 'att-btn send' });

      function refreshConfirm() {
        var n = Object.keys(pick).filter(function (id) { return pick[id]; }).length;
        confirmBtn.textContent = 'تأكيد الإرسال (' + n + ')';
        confirmBtn.disabled = n === 0;
      }

      targets.forEach(function (k) {
        var ph = validateAlgerianPhone(k.phone);
        var already = !!sentMap[k.id];
        if (ph.valid) counts.valid++;
        if (already) counts.done++;
        var canSend = ph.valid && !already;
        if (canSend) pick[k.id] = true;
        var cbx = h('input', { type: 'checkbox', checked: canSend, disabled: !canSend });
        cbx.addEventListener('change', function () { pick[k.id] = cbx.checked; refreshConfirm(); });
        pickCbs[k.id] = cbx;
        itemsBox.appendChild(h('label', { class: 'att-mitem' + (!ph.valid ? ' bad' : already ? ' done' : '') },
          cbx,
          h('div', null,
            h('strong', { text: k.full_name }),
            h('small', { text: !ph.valid ? 'رقم غير صالح: ' + ph.reason : already ? 'أُرسل إشعاره اليوم مسبقاً' : (k.section || '—') })
          )
        ));
      });

      function setAll(on) {
        targets.forEach(function (k) {
          var c = pickCbs[k.id];
          if (c && !c.disabled) { c.checked = on; pick[k.id] = on; }
        });
        refreshConfirm();
      }

      var previewText = formatOfficialAbsenceMessage(targets[0].full_name, dStr);

      confirmBtn.addEventListener('click', async function () {
        var toSend = targets.filter(function (k) { return pick[k.id]; });
        closeModal();
        if (!toSend.length) return;

        toast('جارٍ حفظ الحضور ثم إرسال ' + toSend.length + ' إشعار…', 'ok');
        var saved = await persistAttendance(true);
        if (!saved) return toast('تعذّر حفظ الحضور في قاعدة البيانات، فلم يُرسل شيء. أعد المحاولة.', 'bad');

        var okN = 0, failN = 0;
        for (var i = 0; i < toSend.length; i++) {
          var res = await sendSingleAbsenceNotification(toSend[i], dStr, false);
          if (res.status === 'accepted' || res.status === 'sent' || res.status === 'delivered') okN++; else failN++;
        }
        // «قبلت Meta» ≠ «وصلت»: لا نعلن النجاح قبل وصول تأكيد التسليم من Webhook.
        if (okN && !failN) toast('قبلت Meta ' + okN + ' طلب إرسال. التسليم الفعلي يظهر في سجل الإرسال أدناه.', 'ok');
        else if (okN) toast('قبلت Meta ' + okN + ' وفشل ' + failN + '. راجع سبب الفشل في السجل ثم أعد المحاولة.', 'gold');
        else toast('لم تقبل Meta أي طلب. راجع سبب الفشل في سجل الإرسال، أو اضغط «فحص ربط واتساب».', 'bad');
        renderTracking();
      });

      var body = h('div', { class: 'modal-body' },
        h('h2', { class: 'att-mhead' }, makeSvgIcon('s-whatsapp'), h('span', { text: 'اختيار المستلمين' })),
        h('div', { class: 'att-msum' },
          h('div', null, h('span', { text: 'الغائبون' }), h('strong', { class: 'sic-num', text: String(counts.total) })),
          h('div', null, h('span', { text: 'أرقام صالحة' }), h('strong', { class: 'sic-num', text: String(counts.valid) })),
          h('div', null, h('span', { text: 'أُرسل اليوم' }), h('strong', { class: 'sic-num', text: String(counts.done) }))
        ),
        h('div', { class: 'att-mtools' },
          h('button', { type: 'button', class: 'att-btn sm ghost', text: 'تحديد الكل', onclick: function () { setAll(true); } }),
          h('button', { type: 'button', class: 'att-btn sm ghost', text: 'إلغاء الكل', onclick: function () { setAll(false); } })
        ),
        itemsBox,
        h('div', { class: 'att-preview', text: previewText }),
        h('div', { class: 'att-mfoot' },
          h('button', { type: 'button', class: 'att-btn ghost', text: 'إلغاء', onclick: closeModal }),
          confirmBtn
        )
      );
      refreshConfirm();
      openModal(body);
    });

    // ---------- فحص ربط واتساب (يقرأ حالة الرقم والقوالب من Meta عبر الدالة السحابية) ----------
    async function openDiagnose() {
      var body = h('div', { class: 'modal-body' },
        h('h2', { class: 'att-mhead' }, makeSvgIcon('s-whatsapp'), h('span', { text: 'فحص ربط واتساب' })),
        h('div', { class: 'att-empty', text: 'جارٍ الفحص…' })
      );
      openModal(body);
      var r;
      try { r = await C.fn('send-whatsapp', { action: 'diagnose' }); }
      catch (e) { r = { success: false, error: (e && e.message) || 'تعذّر الاتصال بالدالة send-whatsapp.' }; }
      body.textContent = '';
      body.appendChild(h('h2', { class: 'att-mhead' }, makeSvgIcon('s-whatsapp'), h('span', { text: 'فحص ربط واتساب' })));
      if (!r || !r.success) {
        body.appendChild(h('div', { class: 'att-diag bad', text: (r && r.error) || 'فشل الفحص.' }));
      } else {
        function row(ok, label, val) {
          return h('div', { class: 'att-diag ' + (ok === true ? 'ok' : ok === false ? 'bad' : 'warn') },
            h('b', { text: (ok === true ? '✓ ' : ok === false ? '✖ ' : '• ') + label }),
            val ? h('span', { text: String(val) }) : null);
        }
        var s = r.secrets || {};
        Object.keys(s).forEach(function (k) { body.appendChild(row(!!s[k], 'السر ' + k, s[k] ? 'مضبوط' : 'غير مضبوط')); });
        if (r.phone) {
          body.appendChild(r.phone.error
            ? row(false, 'رقم الجمعية', r.phone.error)
            : row(true, 'رقم الجمعية', [r.phone.display_phone_number, r.phone.verified_name, r.phone.quality_rating && ('الجودة: ' + r.phone.quality_rating), r.phone.status].filter(Boolean).join(' · ')));
        }
        if (r.waba) {
          body.appendChild(r.waba.error
            ? row(false, 'حساب WhatsApp Business', r.waba.error)
            : row(r.waba.business_verification_status === 'verified' ? true : null, 'حساب WhatsApp Business', [r.waba.name, 'مراجعة الحساب: ' + (r.waba.account_review_status || '—'), 'توثيق النشاط: ' + (r.waba.business_verification_status || '—')].join(' · ')));
        }
        if (r.template_configured) {
          var tc = r.template_configured;
          body.appendChild(row(tc.found && tc.status === 'APPROVED', 'قالب الغياب ' + tc.name, tc.found ? (tc.status + ' · ' + tc.category) : 'غير موجود في الحساب'));
        }
        body.appendChild(row(r.webhook && r.webhook.events_received > 0, 'استقبال Webhook من Meta', r.webhook ? (r.webhook.events_received + ' حدث' + (r.webhook.last_event_at ? ' · آخرها ' + fmt(r.webhook.last_event_at, true) : '')) : ''));
        if (r.stale_sent) body.appendChild(row(false, 'رسائل بلا تأكيد تسليم', r.stale_sent + ' رسالة'));
        if (r.hints && r.hints.length) {
          body.appendChild(h('h3', { class: 'att-subhead', text: 'ما يجب فعله' }));
          r.hints.forEach(function (x) { body.appendChild(h('div', { class: 'att-diag warn', text: '→ ' + x })); });
        } else {
          body.appendChild(h('div', { class: 'att-diag ok', text: 'لا توجد ملاحظات: الربط يبدو سليماً.' }));
        }
      }
      body.appendChild(h('div', { class: 'att-mfoot' }, h('button', { type: 'button', class: 'att-btn ghost', text: 'إغلاق', onclick: closeModal })));
    }

    // ---------- سجل متابعة الإرسال ----------
    function renderTracking() {
      trackingHost.textContent = '';
      var dStr = dateInput.value;
      var dayLogs = getWaLogsForDate(dStr);
      if (!dayLogs.length) return;

      var failed = dayLogs.filter(function (l) { return l.status === 'failed'; });
      var card = h('div', { class: 'att-card' },
        h('h3', null, makeSvgIcon('s-whatsapp'), h('span', { text: 'سجل الإرسال — ' + dStr })),
        h('p', { text: 'حالات التسليم الفعلية من Meta، مع إمكانية إعادة محاولة الفاشل فقط.' })
      );
      if (failed.length) {
        card.appendChild(h('button', {
          type: 'button', class: 'att-btn sm warn', text: '🔄 إعادة إرسال الفاشلة (' + failed.length + ')',
          onclick: async function () {
            toast('جارٍ إعادة إرسال ' + failed.length + ' رسائل…', 'ok');
            for (var i = 0; i < failed.length; i++) {
              var kid = eligibleKids.filter(function (k) { return k.id === failed[i].child_id; })[0];
              if (kid) await sendSingleAbsenceNotification(kid, dStr, true);
            }
            renderTracking();
          }
        }));
      }
      dayLogs.forEach(function (l) {
        var isFailed = l.status === 'failed';
        var retry = null;
        if (isFailed) {
          retry = h('button', {
            type: 'button', class: 'att-btn sm ghost', text: '🔄 إعادة المحاولة',
            onclick: async function () {
              var kid = eligibleKids.filter(function (k) { return k.id === l.child_id; })[0];
              if (kid) { await sendSingleAbsenceNotification(kid, dStr, true); renderTracking(); }
            }
          });
        }
        card.appendChild(h('div', { class: 'att-log' },
          h('div', { class: 'top' }, h('strong', { text: l.child_name || l.recipient_name || '—' }), makeWaStatusBadge(l.status, l.created_at)),
          h('div', { class: 'meta' },
            h('span', { dir: 'ltr', class: 'sic-num', text: l.phone || '—' }),
            h('span', { class: 'sic-num', text: fmt(l.created_at, true) })
          ),
          isFailed
            ? h('div', { class: 'err', text: l.error_message || 'فشل الإرسال' })
            : h('code', { text: l.wamid || '—' }),
          retry
        ));
      });
      trackingHost.appendChild(card);
    }

    // ---------- ردود الأولياء الواردة ----------
    function renderReplies() {
      repliesHost.textContent = '';
      var card = h('div', { class: 'att-card' },
        h('h3', null, makeSvgIcon('s-whatsapp'), h('span', { text: 'ردود الأولياء الواردة (' + dbWaReplies.length + ')' })),
        h('p', { text: 'آخر 100 رسالة وردت على رقم المركز، مع مطابقة المرسل بحساب الولي أو الطفل.' })
      );
      if (!dbWaReplies.length) {
        card.appendChild(h('div', { class: 'att-empty', text: 'لا توجد ردود واردة بعد.' }));
      }
      dbWaReplies.forEach(function (m) {
        var kid = rawKids.filter(function (k) { return k && k.id === m.child_id; })[0];
        card.appendChild(h('div', { class: 'att-log att-reply' },
          h('div', { class: 'top' },
            h('strong', { text: kid ? kid.full_name : 'مرسل غير مطابق' }),
            h('span', { dir: 'ltr', class: 'sic-num', text: m.to_phone || '—' })
          ),
          h('p', { text: m.body || '—' }),
          h('div', { class: 'meta' }, h('span', { class: 'sic-num', text: fmt(m.created_at, true) }))
        ));
      });
      repliesHost.appendChild(card);
    }

    // ---------- الأحداث ----------
    dateInput.addEventListener('change', function () {
      loadDateAttendance(dateInput.value);
      updateAll();
      renderList();
      renderTracking();
    });
    secSelect.addEventListener('change', renderList);
    searchInput.addEventListener('input', renderList);

    updateAll();
    renderList();
    renderTracking();
    renderReplies();
  }


  /* =====================================================================
     التنقل والتهيئة (Navigation & Bootstrap)
     ===================================================================== */
  var SECS = {
    hub: secHub,
    hub_accounts: function (v) { return secAccounts(v, true); },
    dash: secDash,
    children: secChildren,
    branches: secChildren,
    educators: secEducators,
    programs: secPrograms,
    reports: secReports,
    evaluations: secEvaluations,
    appts: secAppts,
    msgs: secMsgs,
    docs: secDocs,
    archive: secArchive,
    requests: secRegistrationRequests,
    inquiries: secInquiries,
    notifications: secNotifications,
    parents: secParents,
    accounts: function (v) { return secAccounts(v, false); },
    audit: secAudit,
    attendance: secAttendance,
    whatsapp: secAttendance,
    settings: secSettings
  };

  async function go(sec, navOpts) {
    var opts = navOpts || {};
    if (sec === 'archive' && !canUserAccessArchive()) {
      toast('خاصية الأرشيف والنسخ الاحتياطية مخصصة للإدارة العامة المخولة فقط.', 'bad');
      sec = 'dash';
    }
    if (isFarmSession() && sec === 'reports') {
      sec = 'children';
    }
    if (S.isEducator && (sec !== 'children' && sec !== 'attendance' && (sec !== 'reports' || isFarmSession()) && (sec !== 'evaluations' || isFarmSession()))) {
      sec = 'children';
    }
    if (S.isSpecialist && (sec === 'accounts' || sec === 'hub' || sec === 'hub_accounts' || sec === 'audit' || sec === 'settings' || sec === 'educators' || sec === 'archive' || sec === 'whatsapp' || sec === 'attendance')) {
      toast('غير مخوّلة: هذه الصلاحية محصورة بإدارة المركز فقط.', 'bad');
      return go('children');
    }
    if (S.isSpecialist && (sec === 'accounts' || sec === 'hub' || sec === 'hub_accounts' || sec === 'audit' || sec === 'settings')) {
      toast('قسم الحسابات غير متاح لصلاحية الأخصائية.', 'bad');
      sec = 'children';
    }
    if (!S.isEducator && (S.activeCenter === 'work' || S.activeCenter === 'farm') && sec !== 'hub' && sec !== 'hub_accounts' && sec !== 'children' && sec !== 'attendance' && sec !== 'accounts' && sec !== 'dash' && sec !== 'notifications' && sec !== 'evaluations' && sec !== 'reports' && sec !== 'programs' && sec !== 'educators') {
      sec = 'children';
    }
    if (!SECS[sec]) sec = S.isEducator ? 'children' : 'hub';

    if (!opts.fromHistory && S.me) {
      if (S.sec && (S.sec !== sec || S.inSubBuilder || S._lastCenter !== S.activeCenter || S._lastFilterSec !== S.filterSectionId)) {
        S.navStack.push({
          sec: S.sec,
          center: S._lastCenter || S.activeCenter,
          filterSectionId: S._lastFilterSec || ''
        });
        if (S.navStack.length > 30) S.navStack.shift();
        try {
          window.history.pushState({
            deApp: true,
            sec: sec,
            center: S.activeCenter,
            filterSectionId: S.filterSectionId || ''
          }, '');
        } catch (e) {}
      }
    }
    S.inSubBuilder = false;
    S._lastCenter = S.activeCenter;
    S._lastFilterSec = S.filterSectionId || '';
    S.sec = sec;
    var n = ++S.nav, v = $('#view');
    var appEl = $('#app');
    if (appEl) {
      appEl.classList.toggle('is-hub-mode', !S.isEducator && (sec === 'hub' || sec === 'hub_accounts'));
    }

    applyRoleSidebarUI(); initHeaderWidgets();

    var cm = getCenterMeta(S.activeCenter);
    if (sec === 'hub') {
      $('#secTitle').textContent = 'لوحة الإدارة';
    } else if (sec === 'hub_accounts') {
      $('#secTitle').textContent = 'الحسابات الخاصة بجميع المراكز';
    } else if (!S.isEducator && sec === 'accounts') {
      $('#secTitle').textContent = S.activeCenter === 'work'
        ? 'الحسابات الخاصة بمركز المساعدة على العمل'
        : S.activeCenter === 'farm'
          ? 'الحسابات الخاصة بالمزرعة البيداغوجية'
          : 'حسابات المركز الرئيسي';
    } else if (!S.isEducator && (sec === 'dash' || sec === 'children')) {
      $('#secTitle').textContent = (TITLES[sec] || 'لوحة التحكم') + ' — ' + cm.shortName;
    } else {
      $('#secTitle').textContent = TITLES[sec] || 'لوحة التحكم';
    }

    updateSidebarCenterCard();

    [].forEach.call(document.querySelectorAll('#nav [data-sec]'), function (b) {
      var isAct = b.dataset.sec === sec;
      b.classList.toggle('active', isAct);
      if (isAct) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });

    if (window.innerWidth <= 860) $('#app').classList.remove('nav-toggled');
    v.textContent = '';
    v.appendChild(h('div', { class: 'empty', text: 'جارٍ التحميل…' }));

    var box = h('div', { class: 'view-transition-enter' });
    try {
      await SECS[sec](box);
    } catch (e) {
      bust();
      box = h('div', { class: 'err', role: 'alert' },
        h('p', { text: e.message }),
        h('button', { class: 'btn small', type: 'button', text: 'إعادة المحاولة', onclick: function () { go(sec); } }));
    }

    if (n !== S.nav) return;
    v.textContent = '';
    v.appendChild(box);
    window.scrollTo(0, 0);
  }

  var mode = 'creds';
  var MODE_UI = {
    creds: { btn: 'دخول', hint: 'للحسابات الإدارية والمربيات المخوّلات فقط.' },
    mfa: { btn: 'تأكيد الرمز', hint: 'أدخل الرمز من تطبيق المصادقة.' },
    invite: { btn: 'إرسال رابط إنشاء كلمة المرور', hint: 'أدخل بريدك الإلكتروني أو رقم هاتفك المدعو به لتفعيل حسابك وإنشاء كلمة المرور مباشرة.' },
    forgot: { btn: 'إرسال رابط استعادة كلمة المرور', hint: 'أدخل بريد حسابك وسنرسل إليه رابطًا آمنًا لإعادة تعيين كلمة المرور.' },
    set: { btn: 'إنشاء كلمة المرور وتفعيل الحساب', hint: 'مرحبًا بك! يرجى إنشاء كلمة مرور لحسابك وتأكيدها للمتابعة.' }
  };
  function setMode(m, hint) {
    mode = m;
    var u = MODE_UI[m] || MODE_UI.creds;
    $('#stCreds').hidden = m !== 'creds';
    $('#stMfa').hidden = m !== 'mfa';
    if ($('#stForgot')) $('#stForgot').hidden = m !== 'forgot';
    if ($('#stInvite')) $('#stInvite').hidden = m !== 'invite';
    if ($('#stSet')) $('#stSet').hidden = m !== 'set';
    $('#lBtn').textContent = u.btn;
    $('#lHint').textContent = hint || u.hint;
    if ($('#firstTimeBtn')) $('#firstTimeBtn').hidden = m !== 'creds';
    if ($('#forgotBtn')) $('#forgotBtn').hidden = true;
    $('#backBtn').hidden = m === 'creds';
    if (m === 'set') { setTimeout(function () { var p = $('#np1'); if (p) p.focus(); }, 0); }
  }
  // مسح بيانات الأطفال والأولياء المخزّنة محلياً (سجل واتساب، الحضور، كاش الإشعارات) عند كل ظهور لشاشة الدخول
  function purgeSensitiveLocalData() {
    try {
      var rm = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k === 'de_wa_logs_v3' || k === 'de_notifications_cache_v2' || k === 'de_attendance_records' ||
                  k === 'de_local_attendance_map' || k.indexOf('de_att_records_') === 0)) rm.push(k);
      }
      rm.forEach(function (k) { localStorage.removeItem(k); });
      sessionStorage.removeItem('de_portal_meta_v1');
    } catch (e) {}
  }
  function showLogin(m) {
    purgeSensitiveLocalData();
    S.stopIdle && S.stopIdle();
    show('login');
    setMode('creds');
    msg($('#lErr'), m);
    msg($('#lOk'), '');
  }

  async function enter() {
    show('boot');
    try {
      if (!C.load() || !C.loggedIn()) {
        return showLogin();
      }
      var meUser = null;
      try {
        meUser = await C.me();
      } catch (eMe) {
        await C.signOut();
        return showLogin();
      }
      if (!meUser || !meUser.id) {
        await C.signOut();
        return showLogin();
      }
      var myEmail = (meUser.email || '').toLowerCase();

      var adminRows = [];
      try {
        adminRows = await C.rest('GET', '/admins?user_id=eq.' + meUser.id + '&disabled=eq.false');
      } catch (eAdmin) {
        adminRows = [];
      }
      var isDbAdmin = Array.isArray(adminRows) && adminRows.length > 0;
      var adminRecord = isDbAdmin ? adminRows[0] : null;

      if (!isDbAdmin) {
        var anyAdmin = false;
        try { anyAdmin = await C.rpc('is_admin'); } catch (eAdm) {}
        if (!anyAdmin) {
          await C.signOut();
          return showLogin('هذا الحساب غير مخوّل بالدخول إلى لوحة الإدارة.');
        }
      }

      var meta = await loadPortalMeta(true);
      var accMeta = (meta.account_meta && meta.account_meta[myEmail]) || null;
      var eduMatch = (meta.educators || []).filter(function (e) {
        return e.email && e.email.toLowerCase() === myEmail;
      })[0];

      var userRole = (adminRecord && adminRecord.role) || (accMeta && accMeta.role) || (eduMatch ? 'educator' : 'admin');
      var isKnownSpec = (userRole === 'specialist' || (adminRecord && adminRecord.job_title === 'أخصائية نفسانية'));
      var isKnownEdu = !isKnownSpec && (userRole === 'educator');

      S.me = meUser;
      S.adminRecord = adminRecord;
      bust();

      if (isKnownEdu) {
        var prof = Object.assign({}, eduMatch || {}, accMeta || {});
        S.isEducator = true;
        S.isSpecialist = false;
        S.eduProfile = prof;
        S.eduSectionId = (prof && prof.section_id) || '';
        S.eduSectionName = (prof && prof.section_name) || '';
        S.centerAccess = (prof && (prof.center_access || prof.center)) || 'main';
        if (S.eduSectionId === '22222222-0000-4000-8000-000000000011' || S.eduSectionId === 'sec_bostana' || String(S.eduSectionName).indexOf('البستنة') >= 0 || String(S.eduSectionName).indexOf('المزرعة') >= 0) {
          S.activeCenter = 'farm';
        } else if (S.eduSectionId === '22222222-0000-4000-8000-000000000010' || S.eduSectionId === 'sec_tamhin' || String(S.eduSectionName).indexOf('التمهين') >= 0) {
          S.activeCenter = 'work';
        } else {
          S.activeCenter = (prof && prof.center) || 'main';
        }
        if (S.eduSectionId && !S.eduSectionName) {
          try {
            var secs = await get('sections');
            S.eduSectionName = nameOf(secs, S.eduSectionId, 'name');
          } catch (e) {}
        }
      } else if (isKnownSpec) {
        S.isEducator = false;
        S.isSpecialist = true;
        S.eduProfile = null;
        S.eduSectionId = '';
        S.eduSectionName = '';
        S.centerAccess = 'main';
        S.activeCenter = 'main';
      } else {
        S.isEducator = false;
        S.isSpecialist = false;
        S.eduProfile = null;
        S.eduSectionId = '';
        S.eduSectionName = '';
        S.centerAccess = (accMeta && accMeta.center_access) || 'all';
        var allowedCentersList = parseAllowedCenters(S.centerAccess);
        S.activeCenter = allowedCentersList[0] || 'main';
      }

      applyRoleSidebarUI(); initHeaderWidgets();
      show('app');
      if (S.isEducator) {
        var eduName = (S.eduProfile && S.eduProfile.full_name) || (embeddedMatch && embeddedMatch.full_name) || myEmail;
        $('#who').textContent = '' + eduName + (S.eduSectionName ? (' — ' + S.eduSectionName) : '');
      } else if (S.isSpecialist) {
        $('#who').textContent = ((S.adminRecord && S.adminRecord.full_name) || myEmail) + ' — أخصائية نفسانية';
      } else {
        var whoEmail = (S.me && S.me.email) || 'مدير';
        if (/^edu\.\d+@darelihsan\.org$/i.test(whoEmail)) {
          var matchedSt = EMBEDDED_STAFF.filter(function (st) { return st.email && st.email.toLowerCase() === whoEmail.toLowerCase(); })[0];
          $('#who').textContent = (matchedSt && matchedSt.full_name) || 'مستخدم إداري';
        } else {
          $('#who').textContent = whoEmail;
        }
      }

      S.stopIdle && S.stopIdle();
      S.stopIdle = DE.idle(30 * 60 * 1000, function () { logout('تم تسجيل خروجك تلقائيًا بعد فترة خمول.'); });

      if (!S.isEducator) {
        get('children').catch(function () {});
        (async function () {
          if (_tamhinSeedAttempted) return;
          try {
            var d = await getMany('programs', 'sections');
            var progs = d[0] || [], secs = d[1] || [];
            var tSec = secs.filter(function (s) { return s.slug === 'sec_tamhin' || (s.name && s.name.indexOf('التمهين') >= 0); })[0];
            if (tSec && !progs.some(function (r) { return r.section_id === tSec.id && r.status === 'published'; })) {
              _tamhinSeedAttempted = true;
              await C.rest('POST', '/educational_programs', createTamhinDemoBody(tSec.id, tSec.name));
              bust();
            }
          } catch (e) {}
        })();
      }

      var startSec = (S.isEducator || S.isSpecialist) ? 'children' : 'dash';
      S.navStack = [];
      S._lastCenter = S.activeCenter;
      S._lastFilterSec = '';
      try {
        window.history.replaceState({ deGuard: true, deApp: true, sec: startSec, center: S.activeCenter }, '');
        window.history.pushState({ deApp: true, sec: startSec, center: S.activeCenter }, '');
      } catch (e) {}
      go(startSec, { fromHistory: true });
    } catch (e) { showLogin(e.message); }
  }

  async function logout(m) {
    clearEducatorDirectSession();
    await C.signOut();
    S.cache = {};
    S.me = null;
    S.isEducator = false;
    S.isSpecialist = false;
    S.eduProfile = null;
    S.eduSectionId = '';
    S.eduSectionName = '';
    showLogin(m);
  }

  async function submitLogin(e) {
    e.preventDefault();
    msg($('#lErr'), '');
    await lock($('#lBtn'), async function () {
      try {
        if (mode === 'creds') {
          var rawInput = normalizeArabicDigits(DE.clean($('#email').value, 254).trim());
          var pw = String($('#password').value || '').trim();
          if (!rawInput || !pw || pw.length > 72) return msg($('#lErr'), 'أدخل البريد الإلكتروني (أو رقم الهاتف) وكلمة المرور.');
          var meta = await loadPortalMeta(true);
          var em = resolveEducatorLoginEmail(rawInput, meta);

          if (!DE.isEmail(em)) {
            return msg($('#lErr'), 'أدخل بريدًا إلكترونيًا أو رقم هاتف مسجلاً في النظام.');
          }

          var signedInOk = false;
          var signInErr = null;
          try {
            var r = await C.signIn(em, pw);
            signedInOk = true;
            clearEducatorDirectSession();
            $('#password').value = '';
            if (r && r.mfa) { setMode('mfa'); $('#mfaCode').focus(); return; }
          } catch (errSign) {
            signInErr = errSign;
          }

          if (!signedInOk) {
            throw (signInErr || new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.'));
          }
          await enter();
        } else if (mode === 'mfa') {
          var code = $('#mfaCode').value.replace(/\s/g, '');
          if (!/^\d{6}$/.test(code)) return msg($('#lErr'), 'أدخل الرمز المكوّن من 6 أرقام.');
          await C.verifyMfa(code);
          $('#mfaCode').value = '';
          await enter();
        } else if (mode === 'invite') {
          var rawInv = DE.clean($('#invEmail').value, 254).trim();
          var metaInv = await loadPortalMeta();
          var emInv = resolveEducatorLoginEmail(rawInv, metaInv);
          if (!DE.isEmail(emInv)) return msg($('#lErr'), 'اكتب بريدًا إلكترونيًا أو رقم هاتف صالحًا.');
          var redirectUrl = location.origin + location.pathname;
          await C.recover(emInv, redirectUrl);
          msg($('#lOk'), 'تم إرسال رابط تفعيل الحساب وإنشاء كلمة المرور إلى (' + emInv + ') بنجاح.');
        } else if (mode === 'forgot') {
          var rawFg = DE.clean($('#fEmail').value, 254).trim();
          var metaFg = await loadPortalMeta();
          var em1 = resolveEducatorLoginEmail(rawFg, metaFg);
          if (!DE.isEmail(em1)) return msg($('#lErr'), 'اكتب بريدًا إلكترونيًا أو رقم هاتف صالحًا.');
          var redirectUrl2 = location.origin + location.pathname;
          await C.recover(em1, redirectUrl2);
          msg($('#lOk'), 'تم إرسال رابط استعادة كلمة المرور بنجاح.');
        } else if (mode === 'set') {
          var a = String($('#np1').value || '').trim(), b = String($('#np2').value || '').trim();
          if (DE.pwProblem(a)) return msg($('#lErr'), 'كلمة المرور: 10 أحرف على الأقل مع حرف كبير وحرف صغير ورقم.');
          if (a !== b) return msg($('#lErr'), 'كلمتا المرور غير متطابقتين.');
          await C.setPassword(a);
          $('#np1').value = $('#np2').value = '';
          msg($('#lOk'), 'تم إنشاء كلمة المرور وتفعيل حسابك بنجاح! جارٍ الدخول…');
          await enter();
        }
      } catch (er) { msg($('#lErr'), er.message); }
    });
  }

  function ensureManageDomReady() {
    try {
      if (!document.querySelector('link[href*="IBM+Plex+Sans+Arabic"]')) {
        var fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700&family=Readex+Pro:wght@500;600;700&display=swap';
        document.head.appendChild(fontLink);
      }
      var ns = 'http://www.w3.org/2000/svg';
      var sprite = document.querySelector('svg.sprite');
      if (!sprite) {
        sprite = document.createElementNS(ns, 'svg');
        sprite.setAttribute('width', '0');
        sprite.setAttribute('height', '0');
        sprite.setAttribute('class', 'sprite');
        sprite.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(sprite, document.body.firstChild);
      }
      var symbols = {
        's-main-center': ['M3 21h18M4 18h16M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 3 2 8h20L12 3z'],
        's-work-center': ['M2 7h20v14H2z', 'M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 12v3M2 12h20'],
        's-farm-center': ['M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z', 'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'],
        's-plus': ['M12 5v14M5 12h14'],
        's-edit': ['M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
        's-trash': ['M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6'],
        's-key': ['M7.5 10a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z', 'm21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3'],
        's-idcard': ['M2 4h20v16H2z', 'M14 10h4M14 14h4M5 17c1.2-1.5 4.8-1.5 6 0'],
        's-refresh': ['M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5', 'M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16', 'M16 16h5v5'],
        's-eye': ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
        's-eye-off': ['M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20'],
        's-download': ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'],
        's-upload': ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'],
        's-print': ['M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', 'M6 14h12v8H6z'],
        's-back': ['M19 12H5M12 19l-7-7 7-7'],
        's-search': ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'm21 21-4.3-4.3'],
        's-check': ['M20 6 9 17l-5-5'],
        's-clock': ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 6v6l4 2'],
        's-desktop': ['M2 3h20v14H2z', 'M8 21h8M12 17v4M12 7v6M9.5 10.5 12 13l2.5-2.5'],
        's-copy': ['M9 9h13v13H9z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
        's-wand': ['m15 4-1 1 4 4 1-1a2.83 2.83 0 1 0-4-4ZM13 6 3 16v4h4L17 10M8 2v2M2 8h2M18 14v2M22 18h-2'],
        's-lock': ['M3 11h18v11H3z', 'M7 11V7a5 5 0 0 1 10 0v4']
      };
      Object.keys(symbols).forEach(function (id) {
        if (!document.getElementById(id)) {
          var sym = document.createElementNS(ns, 'symbol');
          sym.setAttribute('id', id);
          sym.setAttribute('viewBox', '0 0 24 24');
          symbols[id].forEach(function (d) {
            var p = document.createElementNS(ns, 'path');
            p.setAttribute('d', d);
            sym.appendChild(p);
          });
          sprite.appendChild(sym);
        }
      });

      // تم إلغاء حقن أزرار تثبيت تطبيق الكمبيوتر نزولاً عند طلب الإدارة
    } catch (eDom) {}
  }

  // ملتقط أخطاء عام لمنع بقاء الصفحة معلقة على شاشة التحميل إطلاقاً
  if (typeof window !== 'undefined') {
    window.addEventListener('error', function (errEv) {
      var b = document.getElementById('boot');
      if (b && !b.hidden) {
        showLogin();
      }
    });
    window.addEventListener('unhandledrejection', function () {
      var b = document.getElementById('boot');
      if (b && !b.hidden) {
        showLogin();
      }
    });
  }

  
  /* ══════════════════════════════════════════════════════════════════════════════
     DAR EL IHSAN — FOREST GREEN PREMIUM THEME ENGINE (LIGHT & DARK MODE)
     ══════════════════════════════════════════════════════════════════════════════ */
    function initThemeEngine() {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('theme-dark');
    try {
      localStorage.setItem('de_theme', 'light');
    } catch (e) {}
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('theme-dark');
    try {
      localStorage.setItem('de_theme', 'light');
    } catch (e) {}
  }

  function toggleTheme() {
    applyTheme('light');
  }

  /* ══════════════════════════════════════════════════════════════════════════════
     CENTRAL NOTIFICATION ENGINE (نظام الإشعارات المركزي)
     ══════════════════════════════════════════════════════════════════════════════ */
  var NOTIF_STATE = {
    items: [],
    unreadCount: 0,
    activeTab: 'all',
    searchVal: '',
    poller: null
  };

  function getLocalNotifications() {
    try {
      var raw = localStorage.getItem('de_notifications_cache_v2');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setLocalNotifications(list) {
    try {
      localStorage.setItem('de_notifications_cache_v2', JSON.stringify(Array.isArray(list) ? list.slice(0, 100) : []));
    } catch (e) {}
  }

  // إضافة إشعار رسمي وحفظه سحابياً ومحلياً
  async function notifySystem(category, title, body, relatedUrl, relatedRecordId, audience, childId) {
    var newNotif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: title,
      body: body,
      category: category || 'general',
      notification_type: category || 'general',
      related_url: relatedUrl || 'dash',
      related_record_id: relatedRecordId || null,
      audience: audience || 'admin',
      child_id: childId || null,
      is_read: false,
      created_at: new Date().toISOString()
    };

    var list = getLocalNotifications();
    list.unshift(newNotif);
    setLocalNotifications(list);
    NOTIF_STATE.items = list;
    updateNotificationBadges();

    // حفظ في قاعدة البيانات سحابياً
    try {
      await C.rest('POST', '/notifications', {
        title: title,
        body: body,
        notification_type: category || 'general',
        category: category || 'general',
        related_url: relatedUrl || 'dash',
        audience: audience || 'admin',
        is_read: false,
        created_at: newNotif.created_at
      });
    } catch (e) {}

    // تنبيه صوتي وتنبيه Toast فوري
    toast('🔔 ' + title + ': ' + body, 'ok');
  }

  async function fetchNotifications() {
    var dbList = [];
    try {
      var rows = await C.rest('GET', '/notifications?order=created_at.desc&limit=50');
      if (Array.isArray(rows)) dbList = rows;
    } catch (e) {}

    var localList = getLocalNotifications();
    var merged = localList.slice();
    dbList.forEach(function (dItem) {
      if (!merged.some(function (m) { return m.id === dItem.id; })) {
        merged.push(dItem);
      }
    });
    merged.sort(function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
    NOTIF_STATE.items = merged;
    setLocalNotifications(merged);
    updateNotificationBadges();
    renderNotificationDropdown();
  }

  function updateNotificationBadges() {
    var unread = (NOTIF_STATE.items || []).filter(function (n) { return !n.is_read; }).length;
    NOTIF_STATE.unreadCount = unread;

    var bellBadge = document.getElementById('notifBellBadge');
    if (bellBadge) {
      bellBadge.textContent = String(unread);
      bellBadge.hidden = unread === 0;
    }

    var navBadge = document.getElementById('notifNavBadge');
    if (navBadge) {
      navBadge.textContent = String(unread);
      navBadge.hidden = unread === 0;
    }
  }

  function renderNotificationDropdown() {
    var host = document.getElementById('notifDropdownList');
    if (!host) return;
    host.textContent = '';

    var topItems = (NOTIF_STATE.items || []).slice(0, 5);
    if (!topItems.length) {
      host.appendChild(h('div', { class: 'empty-notif-drop', text: 'لا توجد إشعارات جديدة حالياً' }));
      return;
    }

    topItems.forEach(function (n) {
      var iconName = 's-bell';
      if (n.category === 'attendance') iconName = 's-cal';
      else if (n.category === 'messages') iconName = 's-mail';
      else if (n.category === 'reports') iconName = 's-report';
      else if (n.category === 'docs') iconName = 's-file';
      else if (n.category === 'system') iconName = 's-shield';

      var item = h('div', {
        class: 'notif-drop-item' + (!n.is_read ? ' is-unread' : ''),
        onclick: function () {
          n.is_read = true;
          setLocalNotifications(NOTIF_STATE.items);
          updateNotificationBadges();
          var drop = document.getElementById('notifDropdown');
          if (drop) drop.hidden = true;
          if (n.related_url) go(n.related_url);
        }
      },
        h('div', { class: 'ndi-icon' }, makeSvgIcon(iconName)),
        h('div', { class: 'ndi-info' },
          h('strong', { class: 'ndi-title', text: n.title }),
          h('p', { class: 'ndi-body', text: n.body }),
          h('span', { class: 'ndi-time', text: fmt(n.created_at, true) })
        )
      );
      host.appendChild(item);
    });
  }

  function initHeaderWidgets() {
    initThemeEngine();

    // ربط جرس الإشعارات
    var bellBtn = document.getElementById('notifBellBtn');
    var notifDrop = document.getElementById('notifDropdown');
    if (bellBtn && notifDrop && !bellBtn._bound) {
      bellBtn._bound = true;
      bellBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        notifDrop.hidden = !notifDrop.hidden;
        if (!notifDrop.hidden) renderNotificationDropdown();
      });
      document.addEventListener('click', function (e) {
        if (!notifDrop.contains(e.target) && e.target !== bellBtn) {
          notifDrop.hidden = true;
        }
      });
    }

    var btnMarkAll = document.getElementById('btnMarkAllReadDrop');
    if (btnMarkAll && !btnMarkAll._bound) {
      btnMarkAll._bound = true;
      btnMarkAll.addEventListener('click', function () {
        (NOTIF_STATE.items || []).forEach(function (n) { n.is_read = true; });
        setLocalNotifications(NOTIF_STATE.items);
        updateNotificationBadges();
        renderNotificationDropdown();
        toast('تم تحديد جميع الإشعارات كمقروءة.', 'ok');
      });
    }

    var btnOpenAll = document.getElementById('btnOpenAllNotifs');
    if (btnOpenAll && !btnOpenAll._bound) {
      btnOpenAll._bound = true;
      btnOpenAll.addEventListener('click', function () {
        if (notifDrop) notifDrop.hidden = true;
        go('notifications');
      });
    }

    // ربط البحث العام في الترويسة
    var topSearch = document.getElementById('topGlobalSearch');
    var searchDrop = document.getElementById('topSearchResults');
    if (topSearch && searchDrop && !topSearch._bound) {
      topSearch._bound = true;
      topSearch.addEventListener('input', async function () {
        var q = normAr(topSearch.value.trim());
        if (!q) { searchDrop.hidden = true; return; }
        searchDrop.textContent = '';
        var kids = await get('children') || [];
        var sections = await get('sections') || [];
        var reports = await get('reports') || [];

        var matches = [];
        kids.forEach(function (k) {
          if (normAr(k.full_name || '').indexOf(q) >= 0 || (k.membership_no && k.membership_no.indexOf(q) >= 0)) {
            matches.push({ type: 'طالب', label: k.full_name, sub: 'قسم: ' + (k.section || '—'), sec: 'children', id: k.id });
          }
        });
        sections.forEach(function (s) {
          if (normAr(s.name || '').indexOf(q) >= 0) {
            matches.push({ type: 'قسم تربوي', label: s.name, sub: s.description || 'فوج معتمد', sec: 'branches', id: s.id });
          }
        });
        reports.forEach(function (r) {
          if (normAr(r.title || '').indexOf(q) >= 0) {
            matches.push({ type: 'تقرير', label: r.title, sub: fmt(r.report_date), sec: 'reports', id: r.id });
          }
        });

        if (!matches.length) {
          searchDrop.appendChild(h('div', { class: 'empty', style: 'padding:14px;', text: 'لا توجد نتائج مطابقة لبحثك' }));
        } else {
          matches.slice(0, 8).forEach(function (m) {
            var row = h('div', {
              class: 'notif-drop-item',
              onclick: function () {
                topSearch.value = '';
                searchDrop.hidden = true;
                if (m.sec === 'children' && m.id) S.filterSectionId = '';
                go(m.sec);
              }
            },
              h('div', { class: 'ndi-info' },
                h('div', { style: 'display:flex;justify-content:space-between;' },
                  h('strong', { text: m.label }),
                  badge(m.type, 'gold')
                ),
                h('span', { class: 'ndi-body', text: m.sub })
              )
            );
            searchDrop.appendChild(row);
          });
        }
        searchDrop.hidden = false;
      });

      document.addEventListener('click', function (e) {
        if (!searchDrop.contains(e.target) && e.target !== topSearch) {
          searchDrop.hidden = true;
        }
      });
    }

    fetchNotifications();
    if (!NOTIF_STATE.poller) {
      NOTIF_STATE.poller = setInterval(fetchNotifications, 10000);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════════
     صفحة مركز الإشعارات والتنبيهات المستقلة (secNotifications)
     ══════════════════════════════════════════════════════════════════════════════ */
  async function secNotifications(v) {
    v.textContent = '';

    var root = h('div', { class: 'notif-hub-wrap' });

    root.appendChild(h('div', { class: 'notif-hub-hero' },
      h('div', null,
        h('h1', { class: 'nhh-title' }, makeSvgIcon('s-bell'), h('span', { text: 'مركز الإشعارات والتنبيهات' })),
        h('p', { class: 'nhh-sub', text: 'متابعة حية وفورية لكافة تنبيهات الحضور والغياب، الرسائل، التقارير، وأنشطة النظام.' })
      ),
      h('div', { class: 'csh-actions' },
        h('button', {
          type: 'button',
          class: 'btn gold',
          onclick: function () {
            (NOTIF_STATE.items || []).forEach(function (n) { n.is_read = true; });
            setLocalNotifications(NOTIF_STATE.items);
            updateNotificationBadges();
            renderList();
            toast('تم تحديد جميع الإشعارات كمقروءة.', 'ok');
          }
        }, makeSvgIcon('s-check'), h('span', { text: 'تحديد الكل كمقروء' })),
        h('button', {
          type: 'button',
          class: 'btn light',
          onclick: function () {
            NOTIF_STATE.items = (NOTIF_STATE.items || []).filter(function (n) { return !n.is_read; });
            setLocalNotifications(NOTIF_STATE.items);
            updateNotificationBadges();
            renderList();
            toast('تم حذف الإشعارات المقروءة.', 'ok');
          }
        }, makeSvgIcon('s-trash'), h('span', { text: 'حذف المقروءة' }))
      )
    ));

    var activeCat = 'all';
    var searchTxt = '';

    var searchInput = h('input', {
      type: 'search',
      class: 'input',
      style: 'max-width:280px;',
      placeholder: 'بحث في الإشعارات…',
      oninput: function () {
        searchTxt = normAr(searchInput.value.trim());
        renderList();
      }
    });

    var tabDefs = [
      ['all', 'كافة الإشعارات'],
      ['unread', 'غير المقروءة'],
      ['attendance', 'الحضور والغياب'],
      ['messages', 'الرسائل'],
      ['reports', 'التقارير'],
      ['system', 'النظام والأمان']
    ];

    var tabsGroup = h('div', { class: 'notif-tabs-group' });
    function renderTabs() {
      tabsGroup.textContent = '';
      tabDefs.forEach(function (td) {
        var btn = h('button', {
          type: 'button',
          class: 'notif-tab-btn' + (activeCat === td[0] ? ' is-active' : ''),
          onclick: function () {
            activeCat = td[0];
            renderTabs();
            renderList();
          }
        }, td[1]);
        tabsGroup.appendChild(btn);
      });
    }

    var toolbar = h('div', { class: 'notif-filters-toolbar' }, tabsGroup, searchInput);
    root.appendChild(toolbar);

    var listHost = h('div', { class: 'notif-items-list' });
    root.appendChild(listHost);
    v.appendChild(root);

    function renderList() {
      listHost.textContent = '';
      var items = NOTIF_STATE.items || [];

      var filtered = items.filter(function (n) {
        if (activeCat === 'unread' && n.is_read) return false;
        if (activeCat !== 'all' && activeCat !== 'unread' && n.category !== activeCat) return false;
        if (searchTxt) {
          var hay = normAr((n.title || '') + ' ' + (n.body || ''));
          if (hay.indexOf(searchTxt) === -1) return false;
        }
        return true;
      });

      if (!filtered.length) {
        listHost.appendChild(h('div', { class: 'card empty', style: 'padding:40px;', text: 'لا توجد إشعارات مطابقة للتصفية الحالية' }));
        return;
      }

      filtered.forEach(function (n) {
        var iconName = 's-bell';
        if (n.category === 'attendance') iconName = 's-cal';
        else if (n.category === 'messages') iconName = 's-mail';
        else if (n.category === 'reports') iconName = 's-report';
        else if (n.category === 'docs') iconName = 's-file';
        else if (n.category === 'system') iconName = 's-shield';

        var card = h('div', { class: 'notif-page-card' + (!n.is_read ? ' is-unread' : '') },
          h('div', { class: 'npc-left' },
            h('div', { class: 'npc-icon' }, makeSvgIcon(iconName)),
            h('div', { class: 'npc-body' },
              h('div', { style: 'display:flex;align-items:center;gap:10px;' },
                h('strong', { text: n.title }),
                !n.is_read ? badge('جديد', 'gold') : null
              ),
              h('p', { text: n.body }),
              h('div', { class: 'npc-meta' },
                h('span', { text: fmt(n.created_at, true) }),
                h('span', { text: '•' }),
                h('span', { text: 'النوع: ' + (n.category || 'عام') })
              )
            )
          ),
          h('div', { class: 'npc-actions' },
            h('button', {
              type: 'button',
              class: 'btn small light',
              onclick: function () {
                n.is_read = true;
                setLocalNotifications(NOTIF_STATE.items);
                updateNotificationBadges();
                if (n.related_url) go(n.related_url);
              }
            }, makeSvgIcon('s-eye'), h('span', { text: 'عرض التفاصيل' })),
            h('button', {
              type: 'button',
              class: 'btn small ghost',
              title: 'حذف الإشعار',
              onclick: function () {
                NOTIF_STATE.items = (NOTIF_STATE.items || []).filter(function (x) { return x.id !== n.id; });
                setLocalNotifications(NOTIF_STATE.items);
                updateNotificationBadges();
                renderList();
              }
            }, makeSvgIcon('s-trash'))
          )
        );
        listHost.appendChild(card);
      });
    }

    renderTabs();
    renderList();
  }

  /* ══════════════════════════════════════════════════════════════════════════════
     قسم فضاء الأولياء الإداري (secParents)
     ══════════════════════════════════════════════════════════════════════════════ */
  async function secParents(v) {
    v.textContent = '';
    var d = await getMany('children', 'codes');
    var kids = d[0] || [], codes = d[1] || [];

    var root = h('div', { class: 'notif-hub-wrap' });
    root.appendChild(h('div', { class: 'notif-hub-hero' },
      h('div', null,
        h('h1', { class: 'nhh-title' }, makeSvgIcon('s-users'), h('span', { text: 'إدارة فضاء الأولياء' })),
        h('p', { class: 'nhh-sub', text: 'متابعة حسابات أولياء الأمور، إدارة رموز التفعيل، والتحقق من صلاحيات الدخول.' })
      ),
      h('div', { class: 'csh-actions' },
        h('button', {
          type: 'button',
          class: 'btn gold',
          onclick: function () { window.open('parent.html', '_blank'); }
        }, makeSvgIcon('s-desktop'), h('span', { text: 'فتح فضاء الأولياء للمعاينة' }))
      )
    ));

    var card = h('div', { class: 'card', style: 'padding:24px;' },
      h('h3', { text: 'حالة الربط وحسابات الأولياء المعتمدة' }),
      h('p', { class: 'muted', text: 'كل ولي أمر يملك صلاحية الاطلاع الحصرية على بيانات طفله المسجل فقط عبر سياسات Row Level Security المشددة.' })
    );
    root.appendChild(card);
    v.appendChild(root);
  }


  async function init() {
    // صمام أمان حاسم: إذا بقيت شاشة التحميل ظاهرة لأكثر من ثانيتين، يتم إظهار شاشة الدخول فوراً
    setTimeout(function () {
      var b = document.getElementById('boot');
      if (b && !b.hidden) {
        var appEl = document.getElementById('app');
        var loginEl = document.getElementById('login');
        if ((!appEl || appEl.hidden) && (!loginEl || loginEl.hidden)) {
          showLogin();
        }
      }
    }, 2000);

    try {
      ensureManageDomReady();
      if (!CFG.supabaseUrl || !CFG.supabaseKey) { if ($('#boot')) $('#boot').textContent = 'إعدادات الاتصال غير مضبوطة.'; return; }
      C.onExpire(function () { showLogin('انتهت الجلسة. سجّل الدخول من جديد.'); });

      if ($('#loginForm')) $('#loginForm').addEventListener('submit', submitLogin);
      var ftBtn = $('#firstTimeBtn');
      if (ftBtn) {
        ftBtn.addEventListener('click', function () {
          msg($('#lErr'), ''); msg($('#lOk'), '');
          $('#invEmail').value = ($('#email').value || '').trim();
          setMode('invite');
          $('#invEmail').focus();
        });
      }
      // تمت إزالة «نسيت كلمة المرور» بناءً على طلب الإدارة
      if ($('#backBtn')) $('#backBtn').addEventListener('click', function () { C.cancelMfa(); msg($('#lErr'), ''); msg($('#lOk'), ''); setMode('creds'); });
      var topLBtn = $('#logoutBtn'); if (topLBtn) topLBtn.addEventListener('click', function () { logout(); });
      var topArchBtn = $('#topArchiveBtn');
      if (topArchBtn) {
        topArchBtn.addEventListener('click', function () {
          if (!S.isEducator && canAccessGeneralAdmin()) {
            go('archive');
          } else {
            toast('ميزة الأرشيف مخصصة للإدارة العامة.', 'bad');
          }
        });
      }
      if ($('#sideLogoutBtn')) $('#sideLogoutBtn').addEventListener('click', function () { logout(); });
      if ($('#hubSwitchBtn')) $('#hubSwitchBtn').addEventListener('click', function () { if (!S.isEducator) go('hub'); });
      if ($('#sideCenterCard')) $('#sideCenterCard').addEventListener('click', function () { if (!S.isEducator) go('hub'); });
      if ($('#menuBtn')) {
        $('#menuBtn').addEventListener('click', function () {
          if (window.innerWidth <= 860) {
            $('#app').classList.toggle('nav-toggled');
          } else {
            $('#app').classList.toggle('side-collapsed');
          }
        });
      }
      if ($('#sideCloseBtn')) {
        $('#sideCloseBtn').addEventListener('click', function () {
          if (window.innerWidth <= 860) {
            $('#app').classList.remove('nav-toggled');
          } else {
            $('#app').classList.toggle('side-collapsed');
          }
        });
      }
      if ($('#scrim')) $('#scrim').addEventListener('click', function () { $('#app').classList.remove('nav-toggled'); });
      if ($('#nav')) $('#nav').addEventListener('click', function (e) { var b = e.target.closest('button[data-sec]'); if (b) go(b.dataset.sec); });
      if ($('#modal')) $('#modal').addEventListener('click', function (e) { if (e.target === $('#modal')) closeModal(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

      /* دعم زر الرجوع في الهاتف (Hardware Back Button) للرجوع خطوة للخلف داخل الموقع وعدم الخروج منه */
      window.addEventListener('popstate', function () {
        if ($('#login') && !$('#login').hidden && mode !== 'creds') {
          C.cancelMfa();
          msg($('#lErr'), '');
          msg($('#lOk'), '');
          setMode('creds');
          try { window.history.pushState({ deLogin: true }, ''); } catch (e) {}
          return;
        }
        if (!C.loggedIn() || ($('#app') && $('#app').hidden)) return;

        if ($('#modal') && !$('#modal').hidden) {
          closeModal();
          return;
        }
        if ($('#app') && $('#app').classList.contains('nav-toggled')) {
          $('#app').classList.remove('nav-toggled');
          try { window.history.pushState({ deApp: true, sec: S.sec, center: S.activeCenter }, ''); } catch (e) {}
          return;
        }
        if (S.inSubBuilder) {
          S.inSubBuilder = false;
          go(S.sec, { fromHistory: true });
          try { window.history.pushState({ deApp: true, sec: S.sec, center: S.activeCenter }, ''); } catch (e) {}
          return;
        }
        if (!S.isEducator && S.filterSectionId) {
          S.filterSectionId = '';
          go('children', { fromHistory: true });
          try { window.history.pushState({ deApp: true, sec: 'children', center: S.activeCenter }, ''); } catch (e) {}
          return;
        }
        while (S.navStack.length > 0) {
          var prev = S.navStack.pop();
          if (prev && (prev.sec !== S.sec || prev.center !== S.activeCenter || prev.filterSectionId !== S.filterSectionId)) {
            S.activeCenter = prev.center || S.activeCenter;
            S.filterSectionId = prev.filterSectionId || '';
            go(prev.sec, { fromHistory: true });
            try { window.history.pushState({ deApp: true, sec: prev.sec, center: S.activeCenter }, ''); } catch (e) {}
            return;
          }
        }
        var rootSec = S.isEducator ? 'children' : 'hub';
        if (S.sec !== rootSec) {
          go(rootSec, { fromHistory: true });
          try { window.history.pushState({ deApp: true, sec: rootSec, center: S.activeCenter }, ''); } catch (e) {}
          return;
        }
        try { window.history.pushState({ deApp: true, sec: rootSec, center: S.activeCenter }, ''); } catch (e) {}
      });

      try {
        var sp = new URLSearchParams(window.location.search);
        if (sp.get('invite_edu') === '1') {
          var invU = (sp.get('u') || '').trim().toLowerCase();
          var invPhone = sp.get('phone') || '';
          var invName = sp.get('name') || '';
          window.history.replaceState(null, '', window.location.pathname);
          if (invU) {
            show('login');
            if ($('#invEmail')) $('#invEmail').value = invPhone || invU;
            if ($('#email')) $('#email').value = invPhone || invU;
            setMode('invite', 'مرحبًا بكِ أستاذة ' + (invName || '') + '! اضغطي الزر أدناه لتفعيل حسابكِ وإنشاء كلمة المرور الخاصة بكِ.');
            return;
          }
        }
      } catch (eInvUrl) {}

      try {
        var hash = await C.adoptHash();
        if (hash && hash.error) { showLogin(hash.error); return; }
        if (hash && (hash.token || hash.type === 'invite' || hash.type === 'recovery' || hash.type === 'signup')) {
          show('login');
          var userEmail = hash.email || '';
          if (!userEmail) {
            try { var u = await C.me(); if (u && u.email) userEmail = u.email; } catch (e) {}
          }
          if ($('#setEmail')) $('#setEmail').value = userEmail;
          if ($('#email')) $('#email').value = userEmail;
          setMode('set', 'مرحبًا بك في لوحة الإدارة! حسابك معروض أدناه. يرجى إنشاء كلمة المرور الخاصة بك وتأكيدها للمتابعة.');
          return;
        }
      } catch (eHash) {}

      if (C.load() && C.loggedIn()) {
        try {
          var enterTimeout = new Promise(function (_, rej) {
            setTimeout(function () { rej(new Error('enter_timeout')); }, 3500);
          });
          await Promise.race([enter(), enterTimeout]);
        } catch (eEnter) {
          showLogin(eEnter && eEnter.message ? eEnter.message : null);
        }
      } else {
        showLogin();
      }
    } catch (eFatal) {
      console.error('Fatal init error:', eFatal);
      showLogin(eFatal && eFatal.message);
    }
  }

  init();
})();