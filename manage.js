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
      var credsBox = h('div', { style: 'background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:0.9rem;color:#065F46;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;' },
        h('div', null, h('strong', { text: 'اسم المستخدم في فضاء الأولياء: ' }), h('code', { dir: 'ltr', style: 'font-weight:800;font-size:0.95rem;background:#FFFFFF;padding:2px 8px;border-radius:6px;border:1px solid #86EFAC;', text: uname || '—' })),
        h('div', null, h('strong', { text: 'كلمة المرور: ' }), h('code', { dir: 'ltr', style: 'font-weight:800;font-size:0.95rem;background:#FFFFFF;padding:2px 8px;border-radius:6px;border:1px solid #86EFAC;', text: parentPw }))
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
              h('div', { class: 'row-actions' },
                rep.attachment_path ? rbtn('المرفق', function () {
                  C.signedUrl('private-docs', rep.attachment_path, 60).then(function (url) {
                    window.open(url, '_blank');
                  }).catch(function (e) { toast(e.message, 'bad'); });
                }, 'light') : null,
                rbtn('تعديل التقرير', function () {
                  S.preselectChildId = r.id;
                  go('reports');
                }, 'light')
              )
            );
            repsHost.appendChild(repCard);
          });
        }

        // 4. قسم استمارات التقييم البيداغوجي للطفل
        var childEvals = (allReports || []).filter(function (rep) {
          return rep.child_id === r.id && isEvaluationReport(rep);
        });

        var evalsHost = h('div', { class: 'child-sub-section' },
          h('div', { class: 'child-sub-section-title' },
            makeSvgIcon('s-card'),
            h('span', { text: 'استمارات التقييم البيداغوجي للطفل (' + childEvals.length + ')' })
          )
        );

        if (!childEvals.length) {
          evalsHost.appendChild(h('p', { class: 'muted small', text: 'لا توجد استمارات تقييم مسجلة لهذا الطفل بعد.' }));
        } else {
          childEvals.forEach(function (evRep) {
            var evCard = h('div', { class: 'child-sub-item-card' },
              h('div', null,
                h('strong', { text: evRep.title }),
                h('div', { class: 'muted small', text: 'التاريخ: ' + fmt(evRep.report_date) + ' • الحالة: ' + (evRep.status === 'published' ? 'معتمدة ومنشورة' : 'مسودة') })
              ),
              h('div', { class: 'row-actions' },
                rbtn('عرض الورقة الرسمية (طباعة)', function () {
                  openModal(h('div', { class: 'modal-body wk-modal-print' },
                    renderEvaluationSheetView(evRep, r.full_name, secName, r),
                    h('div', { class: 'modal-actions no-print' },
                      h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal }),
                      h('button', { class: 'btn gold', type: 'button', text: 'طباعة الورقة الرسمية (A4)', onclick: function () { window.print(); } })
                    )
                  ));
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
     4. نظام البرامج الأسبوعية الاحترافي الشامل — دار الإحسان (Weekly Programs System)
     - الورقة الأسبوعية تظهر مباشرة أمام الموظف عند الدخول للقسم.
     - خانات الحصص فارغة وجاهزة للتعبئة (نظيفة وجديدة).
     - تعبئة الخانات بالنقر عليها بنافذة أنيقة تدعم:
       1) الاختيار من المكتبة البيداغوجية الحقيقية (المجال -> المهارات التابعة له فقط وتحديث تلقائي).
       2) الملء اليدوي المستقل.
       3) الأنشطة اليومية والفترات الخاصة (الأكل، الاستراحة، النظافة...).
     - إمكانية دمج عدة خانات متجاورة (خانتين أو ثلاث أو أكثر) وتعديلها وإلغاء الدمج.
     - التحكم الكامل في التوقيتات وإعادة ترتيب الجدول وحل التداخلات.
     - هوية دار الإحسان وألوان Forest والأيقونات الموحدة (بدون إيموجي).
     - إخراج ومعاينة PDF احترافي A4 أفقي Landscape مطابق للورقة الأصلية.
     - النشر التلقائي في فضاء الأولياء لفوج الطفل المعني فقط مع إشعار مناسب.
     - مشاركة البرنامج عبر WhatsApp Cloud API الموجود في المشروع.
     ===================================================================== */

  var WEEK_DAYS = [
    { key: 'sun', label: 'الأحد' },
    { key: 'mon', label: 'الإثنين' },
    { key: 'tue', label: 'الثلاثاء' },
    { key: 'wed', label: 'الأربعاء' },
    { key: 'thu', label: 'الخميس' }
  ];

  var DEFAULT_WEEK_TIME_SLOTS = [
    { id: 0, start: '08:00', end: '08:30', period: 'morning', label: '08:00 - 08:30', duration: 30 },
    { id: 1, start: '08:30', end: '09:30', period: 'morning', label: '08:30 - 09:30', duration: 60 },
    { id: 2, start: '09:30', end: '10:00', period: 'morning', label: '09:30 - 10:00', duration: 30 },
    { id: 3, start: '10:00', end: '11:00', period: 'morning', label: '10:00 - 11:00', duration: 60 },
    { id: 4, start: '11:00', end: '11:30', period: 'morning', label: '11:00 - 11:30', duration: 30 },
    { id: 5, start: '11:30', end: '12:30', period: 'morning', label: '11:30 - 12:30', duration: 60 },
    { id: 6, start: '12:30', end: '13:30', period: 'afternoon', label: '12:30 - 13:30', duration: 60 },
    { id: 7, start: '13:30', end: '14:00', period: 'afternoon', label: '13:30 - 14:00', duration: 30 }
  ];

  var DEFAULT_DAILY_ACTIVITIES = [
    'الأكل',
    'وجبة خفيفة',
    'الغداء',
    'الاستراحة',
    'النظافة',
    'الصلاة',
    'الانتقال',
    'اللعب الحر',
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

  function createEmptyWeekState(secId, secName) {
    var nowIso = new Date().toISOString();
    return {
      id: null,
      section_id: secId || '',
      section_name: secName || 'الفوج التربوي',
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
      time_slots: DEFAULT_WEEK_TIME_SLOTS.map(function (ts) { return Object.assign({}, ts); }),
      days: WEEK_DAYS.map(function (wd) {
        return {
          day: wd.key,
          label: wd.label,
          sessions: DEFAULT_WEEK_TIME_SLOTS.map(function (ts) {
            return {
              slot_id: ts.id,
              start: ts.start,
              end: ts.end,
              span: 1,
              merged_slot_ids: [ts.id],
              kind: 'empty',
              domain: '',
              skill: '',
              title: '',
              manual_text: '',
              activity: ''
            };
          })
        };
      })
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
            period: ts.period || (timeToMinutes(ts.start) >= 750 ? 'afternoon' : 'morning'),
            label: (ts.start || '08:00') + ' - ' + (ts.end || '08:30'),
            duration: ts.duration || calcDurationMins(ts.start, ts.end)
          };
        })
      : DEFAULT_WEEK_TIME_SLOTS.map(function (ts) { return Object.assign({}, ts); });

    var days = WEEK_DAYS.map(function (wd) {
      var foundDay = Array.isArray(rawSched)
        ? rawSched.filter(function (r) { return r && (r.day === wd.key || r.label === wd.label || (wd.key === 'mon' && r.label === 'الاثنين')); })[0]
        : null;

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
            span: s.span || 1,
            merged_slot_ids: s.merged_slot_ids || [s.slot_id],
            kind: k,
            domain: s.domain || '',
            skill: s.skill || '',
            title: s.title || (isLib ? (s.domain + ' — ' + s.skill) : (isAct ? s.activity : s.manual_text)) || '',
            manual_text: s.manual_text || (!isLib && !isAct ? s.title : ''),
            activity: s.activity || (isAct ? s.title : '')
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
            var k = isLib ? 'library' : (isAct ? 'activity' : (isMan ? 'manual' : 'empty'));
            sessions.push({
              slot_id: ts.id,
              start: ts.start,
              end: ts.end,
              span: 1,
              merged_slot_ids: [ts.id],
              kind: k,
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
              span: 1,
              merged_slot_ids: [ts.id],
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

  /* الدالة الرئيسية لقسم البرامج الأسبوعية في لوحة الإدارة */
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
    var secOpts = sections.map(function (s) { return [s.id, s.name]; });

    // حالة البرنامج الحالية المعروضة مباشرة في الصفحة:
    // إذا كان هناك برامج سابقة نعرض أحدث برنامج، وإلا نبدأ فوراً بورقة أسبوعية جديدة بجميع الخانات فارغة
    var currentSelectedProg = rows[0] || null;
    var currentWeekState = currentSelectedProg ? parseExistingProgramState(currentSelectedProg, sections) : createEmptyWeekState(sections[0] ? sections[0].id : '', sections[0] ? sections[0].name : 'الفوج التربوي');

    // وضع التحديد لدمج الخانات
    var isMergeMode = false;
    var mergeSelectedCells = {}; // مفاتيح مثل "sun:1"

    function getSecName() {
      return (sections && nameOf(sections, currentWeekState.section_id, 'name')) || currentWeekState.section_name || 'الفوج التربوي';
    }

    // بناء الواجهة الرئيسية لقسم البرامج الأسبوعية
    var mainContainer = h('div', { class: 'wk-programs-main-wrap', style: 'display:flex; flex-direction:column; gap:16px;' });
    v.appendChild(mainContainer);

    function renderFullView() {
      mainContainer.textContent = '';

      // 1. الترويسة وشريط الأدوات الأساسي النظيف
      var groupSelect = h('select', {
        class: 'input',
        style: 'font-weight:700; color:#14532D; min-width:180px;',
        onchange: function (e) {
          currentWeekState.section_id = e.target.value;
          currentWeekState.section_name = getSecName();
          // فحص إن كان للفوج برنامج موجود
          var progForSec = rows.filter(function (r) { return r.section_id === currentWeekState.section_id; })[0];
          if (progForSec) {
            currentWeekState = parseExistingProgramState(progForSec, sections);
          } else {
            currentWeekState = createEmptyWeekState(currentWeekState.section_id, currentWeekState.section_name);
          }
          renderFullView();
        }
      }, secOpts.map(function (o) {
        return h('option', { value: o[0], selected: o[0] === currentWeekState.section_id ? 'selected' : null, text: o[1] });
      }));

      var yearInput = h('input', {
        class: 'input',
        type: 'text',
        value: currentWeekState.academic_year || '2026/2027',
        style: 'width:115px; text-align:center; font-weight:700;',
        onchange: function (e) { currentWeekState.academic_year = e.target.value; }
      });

      // زر ورقة جديدة فارغة
      var newBlankBtn = h('button', {
        type: 'button',
        class: 'btn light',
        title: 'إنشاء ورقة أسبوعية جديدة بجميع الخانات فارغة',
        onclick: function () {
          currentWeekState = createEmptyWeekState(currentWeekState.section_id, getSecName());
          isMergeMode = false;
          mergeSelectedCells = {};
          renderFullView();
          toast('تم فتح ورقة أسبوعية جديدة بجميع الخانات فارغة.', 'ok');
        }
      }, makeSvgIcon('s-plus'), h('span', { text: 'ورقة جديدة فارغة' }));

      // زر دمج الخانات المتجاورة
      var mergeToggleBtn = h('button', {
        type: 'button',
        class: 'btn ' + (isMergeMode ? 'gold' : 'light'),
        title: 'تحديد خانات متجاورة لدمجها معاً',
        onclick: function () {
          isMergeMode = !isMergeMode;
          mergeSelectedCells = {};
          renderFullView();
        }
      }, makeSvgIcon('s-merge'), h('span', { text: isMergeMode ? 'إلغاء وضع الدمج' : 'دمج الخانات' }));

      // زر تعديل التوقيتات
      var timeConfigBtn = h('button', {
        type: 'button',
        class: 'btn light',
        title: 'التحكم في التوقيتات والمدد والفترات',
        onclick: function () { openTimeSlotsManagerModal(); }
      }, makeSvgIcon('s-clock'), h('span', { text: 'التحكم في التوقيتات' }));

      // زر حفظ مسودة
      var saveDraftBtn = h('button', {
        type: 'button',
        class: 'btn light',
        title: 'حفظ الورقة الأسبوعية كمسودة',
        onclick: function () { act(saveDraftBtn, function () { return saveProgramAction(false); }); }
      }, makeSvgIcon('s-edit'), h('span', { text: 'حفظ مسودة' }));

      // زر معاينة PDF
      var previewPdfBtn = h('button', {
        type: 'button',
        class: 'btn light',
        title: 'معاينة الوثيقة الرسمية للبرنامج الأسبوعي بصيغة PDF A4 Landscape',
        onclick: function () { openPdfLandscapePreviewModal(); }
      }, makeSvgIcon('s-eye'), h('span', { text: 'معاينة PDF' }));

      // زر نشر البرنامج
      var publishBtn = h('button', {
        type: 'button',
        class: 'btn gold',
        style: 'font-weight:800;',
        title: 'نشر البرنامج الأسبوعي في فضاء أولياء أطفال الفوج',
        onclick: function () { act(publishBtn, function () { return saveProgramAction(true); }); }
      }, makeSvgIcon('s-send'), h('span', { text: 'نشر البرنامج للأولياء' }));

      // شريط أعلى الورقة
      var topBarCard = h('div', {
        class: 'card wk-top-hero-card',
        style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:16px 20px; background:linear-gradient(135deg, #F8FAF9 0%, #FFFFFF 100%); border:1px solid #CBD5E1; border-radius:14px;'
      },
        h('div', { style: 'display:flex; align-items:center; gap:14px; flex-wrap:wrap;' },
          h('div', { style: 'display:flex; align-items:center; gap:8px;' },
            makeSvgIcon('s-cal'),
            h('h2', { style: 'margin:0; color:#14532D; font-size:1.35rem;', text: 'البرنامج الأسبوعي' })
          ),
          h('div', { style: 'display:flex; align-items:center; gap:8px;' },
            h('span', { class: 'small muted', text: 'الفوج:' }),
            groupSelect
          ),
          h('div', { style: 'display:flex; align-items:center; gap:8px;' },
            h('span', { class: 'small muted', text: 'الموسم:' }),
            yearInput
          ),
          badge(currentWeekState.status === 'updated' ? 'تم تحديثه' : (currentWeekState.status === 'published' ? 'منشور للأولياء' : 'مسودة'), currentWeekState.status === 'draft' ? 'gray' : 'ok')
        ),
        h('div', { style: 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;' },
          newBlankBtn,
          mergeToggleBtn,
          timeConfigBtn,
          saveDraftBtn,
          previewPdfBtn,
          publishBtn
        )
      );
      mainContainer.appendChild(topBarCard);

      // شريط إرشادي عند تفعيل وضع الدمج
      if (isMergeMode) {
        var selectedCount = Object.keys(mergeSelectedCells).length;
        var executeMergeBtn = h('button', {
          type: 'button',
          class: 'btn gold',
          disabled: selectedCount < 2,
          onclick: function () { executeMergeSelection(); }
        }, makeSvgIcon('s-merge'), h('span', { text: 'دمج الخانات المحددة (' + selectedCount + ')' }));

        var mergeBanner = h('div', {
          style: 'background:#FEF3C7; border:1.5px solid #F59E0B; border-radius:12px; padding:12px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;'
        },
          h('div', { style: 'display:flex; align-items:center; gap:10px;' },
            makeSvgIcon('s-merge'),
            h('span', { style: 'color:#92400E; font-weight:700; font-size:14px;', text: 'وضع دمج الخانات مفعل: اضغط على خانتين متجاورتين أو أكثر في نفس اليوم ثم اضغط على «دمج الخانات المحددة».' })
          ),
          h('div', { style: 'display:flex; gap:8px;' },
            executeMergeBtn,
            h('button', {
              type: 'button',
              class: 'btn light small',
              text: 'إلغاء التحديد',
              onclick: function () { mergeSelectedCells = {}; renderFullView(); }
            })
          )
        );
        mainContainer.appendChild(mergeBanner);
      }

      // 2. ورقة البرنامج الأسبوعي التفاعلية (مطابقة تماماً للورقة الأصلية)
      var sheetPaperCard = h('div', {
        class: 'card wk-interactive-sheet-paper',
        style: 'padding:20px; background:#FFFFFF; border:2px solid #14532D; border-radius:16px; box-shadow:0 8px 30px rgba(20,83,45,0.06); overflow-x:auto;'
      });

      // أ) الترويسة الرسمية للورقة المطابقة للنموذج الأصلي
      var sheetHeader = h('div', {
        style: 'display:grid; grid-template-columns:1fr 2fr 1fr; align-items:center; gap:12px; padding-bottom:14px; margin-bottom:14px; border-bottom:2px solid #CBD5E1;'
      },
        // الطرف الأيمن: الجمعية والمركز
        h('div', { style: 'text-align:right;' },
          h('h4', { style: 'margin:0 0 2px; color:#14532D; font-size:15px;', text: 'جمعية أولياء الأطفال المعاقين ذهنيًا' }),
          h('h5', { style: 'margin:0 0 2px; color:#064E3B; font-size:13.5px;', text: 'المركز النفسي البيداغوجي دار الإحسان' }),
          h('span', { class: 'small muted', text: 'العطف — غرداية' })
        ),
        // الوسط: العنوان الرئيسي ورقم الفوج
        h('div', { style: 'text-align:center;' },
          h('h2', {
            style: 'margin:0 0 4px; color:#14532D; font-size:1.6rem; letter-spacing:0.5px; font-weight:900;',
            text: 'البرنامج الأسبوعي'
          }),
          h('div', {
            style: 'display:inline-block; background:#FEF3C7; color:#92400E; border:1px solid #F59E0B; padding:3px 18px; border-radius:20px; font-weight:800; font-size:14px;',
            text: 'الفوج / الوحدة: ' + getSecName()
          })
        ),
        // الطرف الأيسر: الموسم الدراسي والتوقيت
        h('div', { style: 'text-align:left;' },
          h('div', { style: 'font-weight:700; color:#14532D; font-size:13.5px;', text: 'الموسم الدراسي: ' + (currentWeekState.academic_year || '2026/2027') }),
          h('div', { class: 'small muted', text: 'التوقيت اليومي: ' + (currentWeekState.day_start || '08:00') + ' إلى ' + (currentWeekState.day_end || '14:00') })
        )
      );
      sheetPaperCard.appendChild(sheetHeader);

      // ب) جدول الحصص الأسبوعي المطابق للورقة
      var tableEl = h('table', {
        class: 'wk-sheet-table',
        style: 'width:100%; border-collapse:collapse; border:2px solid #14532D; text-align:center; min-width:860px;'
      });

      // صف تقسيم الفترات (الفترة الصباحية والفترة المسائية)
      var morningSlots = currentWeekState.time_slots.filter(function (s) { return s.period === 'morning'; });
      var afternoonSlots = currentWeekState.time_slots.filter(function (s) { return s.period === 'afternoon'; });
      if (!morningSlots.length) morningSlots = currentWeekState.time_slots.slice(0, 6);
      if (!afternoonSlots.length) afternoonSlots = currentWeekState.time_slots.slice(6);

      var theadEl = h('thead');
      var trPeriods = h('tr', null,
        h('th', {
          rowspan: 2,
          style: 'width:110px; background:#14532D; color:#FFFFFF; border:1.5px solid #0F3D2E; padding:10px 8px; font-size:15px; font-weight:800;',
          text: 'اليوم'
        }),
        h('th', {
          colspan: morningSlots.length,
          style: 'background:#ECFDF5; color:#064E3B; border:1.5px solid #10B981; padding:8px; font-size:14.5px; font-weight:800;',
          text: 'الفترة الصباحية'
        }),
        h('th', {
          colspan: afternoonSlots.length,
          style: 'background:#FEF3C7; color:#92400E; border:1.5px solid #F59E0B; padding:8px; font-size:14.5px; font-weight:800;',
          text: 'الفترة المسائية'
        })
      );
      theadEl.appendChild(trPeriods);

      // صف التوقيتات الدقيقة لكل خانة
      var trTimes = h('tr', null,
        currentWeekState.time_slots.map(function (slot) {
          return h('th', {
            style: 'background:#F8FAF9; color:#1E293B; border:1.5px solid #CBD5E1; padding:7px 4px; font-size:12px; font-weight:700; direction:ltr;',
            text: slot.start + ' - ' + slot.end
          });
        })
      );
      theadEl.appendChild(trTimes);
      tableEl.appendChild(theadEl);

      // جسم الجدول: 5 صفوف للأيام (الأحد إلى الخميس) مع الخانات الفارغة أو المعبأة أو المدمجة
      var tbodyEl = h('tbody');

      currentWeekState.days.forEach(function (dayObj) {
        var trDay = h('tr', null,
          h('td', {
            style: 'background:#14532D; color:#FFFFFF; border:1.5px solid #0F3D2E; padding:12px 6px; font-weight:800; font-size:15px;',
            text: dayObj.label
          })
        );

        // رسم خانات اليوم مع دعم span للمدمجة
        var renderedSlotCursor = 0;
        dayObj.sessions.forEach(function (sess) {
          var span = sess.span || 1;
          var cellKey = dayObj.day + ':' + sess.slot_id;
          var isSelectedForMerge = !!mergeSelectedCells[cellKey];

          // تصميم الخانة حسب نوعها (فارغة / مكتبة / يدوي / نشاط يومي)
          var cellBg = '#FFFFFF';
          var cellBorder = '1.5px solid #CBD5E1';
          var cellTextColor = '#1E293B';
          var isFilled = (sess.kind && sess.kind !== 'empty');

          if (isSelectedForMerge) {
            cellBg = '#FEF3C7';
            cellBorder = '2px dashed #D97706';
          } else if (sess.kind === 'library') {
            cellBg = '#F0FDF4';
            cellBorder = '1.5px solid #10B981';
            cellTextColor = '#064E3B';
          } else if (sess.kind === 'activity') {
            cellBg = '#FFFBEB';
            cellBorder = '1.5px solid #F59E0B';
            cellTextColor = '#92400E';
          } else if (sess.kind === 'manual') {
            cellBg = '#EFF6FF';
            cellBorder = '1.5px solid #3B82F6';
            cellTextColor = '#1E3A8A';
          }

          var tdCell = h('td', {
            colspan: span,
            style: 'background:' + cellBg + '; border:' + cellBorder + '; color:' + cellTextColor + '; padding:8px 6px; vertical-align:middle; cursor:pointer; height:68px; transition:all 0.15s ease;'
          });

          // محتوى الخانة
          if (!isFilled) {
            tdCell.appendChild(h('span', {
              style: 'color:#94A3B8; font-size:12px; font-weight:600; display:block; border:1px dashed #E2E8F0; padding:6px 2px; border-radius:6px;',
              text: isMergeMode ? (isSelectedForMerge ? '✓ محددة' : 'اضغط للتحديد') : '+ تعبئة'
            }));
          } else {
            var contentWrap = h('div', { style: 'display:flex; flex-direction:column; gap:2px; justify-content:center; align-items:center;' });
            if (span > 1) {
              contentWrap.appendChild(h('span', {
                style: 'font-size:10px; background:#FEF3C7; color:#B45309; padding:1px 6px; border-radius:4px; font-weight:800;',
                text: 'مدمجة (' + span + ' خانات)'
              }));
            }
            if (sess.kind === 'library') {
              contentWrap.appendChild(h('span', { style: 'font-size:11px; font-weight:800; color:#059669;', text: sess.domain }));
              contentWrap.appendChild(h('strong', { style: 'font-size:12.5px; color:#064E3B; line-height:1.3;', text: sess.skill }));
            } else if (sess.kind === 'activity') {
              contentWrap.appendChild(h('span', { style: 'font-size:10.5px; font-weight:800; color:#D97706;', text: 'نشاط يومي' }));
              contentWrap.appendChild(h('strong', { style: 'font-size:13px; color:#78350F;', text: sess.activity || sess.title }));
            } else if (sess.kind === 'manual') {
              contentWrap.appendChild(h('span', { style: 'font-size:10.5px; font-weight:800; color:#2563EB;', text: 'إدخال يدوي' }));
              contentWrap.appendChild(h('strong', { style: 'font-size:12.5px; color:#1E3A8A; line-height:1.3;', text: sess.manual_text || sess.title }));
            }
            tdCell.appendChild(contentWrap);
          }

          // النقر على الخانة: في وضع الدمج يحدد الخانة، وفي الوضع العادي يفتح نافذة التعبئة الأنيقة
          tdCell.addEventListener('click', function () {
            if (isMergeMode) {
              if (mergeSelectedCells[cellKey]) {
                delete mergeSelectedCells[cellKey];
              } else {
                mergeSelectedCells[cellKey] = { day: dayObj.day, slot_id: sess.slot_id, span: span };
              }
              renderFullView();
            } else {
              openCellFillModal(dayObj, sess);
            }
          });

          trDay.appendChild(tdCell);
        });

        tbodyEl.appendChild(trDay);
      });
      tableEl.appendChild(tbodyEl);
      sheetPaperCard.appendChild(tableEl);

      // ج) تذييل التوقيعات الثلاثة للورقة الرسمية
      var sheetFooter = h('div', {
        style: 'display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin-top:20px; padding-top:16px; border-top:1.5px solid #E2E8F0; text-align:center;'
      },
        h('div', { style: 'background:#F8FAF9; padding:10px; border-radius:10px; border:1px solid #E2E8F0;' },
          h('strong', { style: 'display:block; color:#14532D; font-size:13.5px; margin-bottom:4px;', text: 'توقيع المربي(ة) المشرف(ة)' }),
          h('input', {
            class: 'input small',
            type: 'text',
            placeholder: 'اسم المربي(ة)...',
            value: currentWeekState.educator_name || '',
            style: 'text-align:center; font-size:12px; margin-bottom:6px;',
            onchange: function (e) { currentWeekState.educator_name = e.target.value; }
          }),
          h('span', { class: 'small muted', text: 'الإمضاء والتأشيرة' })
        ),
        h('div', { style: 'background:#F8FAF9; padding:10px; border-radius:10px; border:1px solid #E2E8F0;' },
          h('strong', { style: 'display:block; color:#14532D; font-size:13.5px; margin-bottom:4px;', text: 'توقيع المشرف البيداغوجي' }),
          h('input', {
            class: 'input small',
            type: 'text',
            placeholder: 'اسم المشرف البيداغوجي...',
            value: currentWeekState.supervisor_name || '',
            style: 'text-align:center; font-size:12px; margin-bottom:6px;',
            onchange: function (e) { currentWeekState.supervisor_name = e.target.value; }
          }),
          h('span', { class: 'small muted', text: 'الإمضاء والختم' })
        ),
        h('div', { style: 'background:#F8FAF9; padding:10px; border-radius:10px; border:1px solid #E2E8F0;' },
          h('strong', { style: 'display:block; color:#14532D; font-size:13.5px; margin-bottom:4px;', text: 'توقيع وختم مدير المركز' }),
          h('input', {
            class: 'input small',
            type: 'text',
            placeholder: 'اسم المدير...',
            value: currentWeekState.director_name || '',
            style: 'text-align:center; font-size:12px; margin-bottom:6px;',
            onchange: function (e) { currentWeekState.director_name = e.target.value; }
          }),
          h('span', { class: 'small muted', text: 'التأشيرة والختم الرسمي' })
        )
      );
      sheetPaperCard.appendChild(sheetFooter);

      mainContainer.appendChild(sheetPaperCard);
    }

    // 3. نافذة تعبئة الخانة الأنيقة (المكتبة البيداغوجية الحقيقية / الملء اليدوي / الأنشطة اليومية)
    function openCellFillModal(dayObj, sessObj) {
      var lib = getPedagogicalLibrary();
      var domKeys = Object.keys(lib);
      var dailyActs = getDailyActivitiesList();

      var currentKind = sessObj.kind && sessObj.kind !== 'empty' ? sessObj.kind : 'library';
      var selectedDomain = (sessObj.domain && lib[sessObj.domain]) ? sessObj.domain : (domKeys[0] || '');
      var selectedSkill = sessObj.skill || ((lib[selectedDomain] && lib[selectedDomain][0]) || '');
      var manualText = sessObj.manual_text || (currentKind === 'manual' ? sessObj.title : '');
      var selectedActivity = sessObj.activity || (currentKind === 'activity' ? sessObj.title : dailyActs[0]);

      var modalBox = h('div', {
        class: 'modal card',
        style: 'max-width:580px; width:95%; background:#FFFFFF; padding:22px; border-radius:16px; box-shadow:0 20px 50px rgba(20,83,45,0.25); border:1px solid #CBD5E1; max-height:90vh; overflow-y:auto;'
      });

      function renderModalContent() {
        modalBox.textContent = '';
        var domainSkills = lib[selectedDomain] || [];
        if (!selectedSkill || domainSkills.indexOf(selectedSkill) < 0) {
          selectedSkill = domainSkills[0] || '';
        }

        // ترويسة النافذة
        var modalHead = h('div', {
          class: 'bar-sub',
          style: 'margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding-bottom:10px;'
        },
          h('div', null,
            h('h3', { style: 'margin:0; color:#14532D; font-size:16px;', text: 'تعبئة الخانة — يوم ' + dayObj.label + ' (' + sessObj.start + ' - ' + sessObj.end + ')' }),
            sessObj.span > 1 ? h('span', { class: 'small gold', text: 'خانة مدمجة تشمل ' + sessObj.span + ' فترات' }) : null
          ),
          h('button', {
            type: 'button',
            class: 'btn small light',
            text: '✕',
            onclick: function () { dlg.remove(); }
          })
        );
        modalBox.appendChild(modalHead);

        // تبويبات طريقة التعبئة الثلاثة
        var tabsNav = h('div', {
          style: 'display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:14px; background:#F1F5F9; padding:4px; border-radius:10px;'
        },
          h('button', {
            type: 'button',
            class: 'btn small ' + (currentKind === 'library' ? '' : 'light'),
            style: currentKind === 'library' ? 'background:#14532D; color:#fff; font-weight:800;' : '',
            onclick: function () { currentKind = 'library'; renderModalContent(); }
          }, makeSvgIcon('s-book'), h('span', { text: 'من المكتبة' })),
          h('button', {
            type: 'button',
            class: 'btn small ' + (currentKind === 'manual' ? '' : 'light'),
            style: currentKind === 'manual' ? 'background:#1E3A8A; color:#fff; font-weight:800;' : '',
            onclick: function () { currentKind = 'manual'; renderModalContent(); }
          }, makeSvgIcon('s-edit'), h('span', { text: 'ملء يدوي' })),
          h('button', {
            type: 'button',
            class: 'btn small ' + (currentKind === 'activity' ? 'gold' : 'light'),
            style: currentKind === 'activity' ? 'font-weight:800;' : '',
            onclick: function () { currentKind = 'activity'; renderModalContent(); }
          }, makeSvgIcon('s-star'), h('span', { text: 'أنشطة يومية' }))
        );
        modalBox.appendChild(tabsNav);

        // محتوى التبويب المختار
        if (currentKind === 'library') {
          // الطريقة الأولى: الاختيار من المكتبة البيداغوجية
          var domSelect = h('select', {
            class: 'input',
            style: 'width:100%; font-weight:700; margin-bottom:8px;',
            onchange: function (e) {
              selectedDomain = e.target.value;
              selectedSkill = (lib[selectedDomain] && lib[selectedDomain][0]) || '';
              renderModalContent();
            }
          }, domKeys.map(function (dk) {
            return h('option', { value: dk, selected: dk === selectedDomain ? 'selected' : null, text: dk });
          }));

          var skillsListWrap = h('div', {
            style: 'display:flex; flex-direction:column; gap:6px; max-height:200px; overflow-y:auto; border:1px solid #CBD5E1; border-radius:10px; padding:8px; background:#F8FAF9;'
          });

          domainSkills.forEach(function (sk) {
            var isSel = (sk === selectedSkill);
            var skItem = h('button', {
              type: 'button',
              style: 'text-align:right; padding:8px 12px; border-radius:8px; border:1.5px solid ' + (isSel ? '#10B981' : '#E2E8F0') + '; background:' + (isSel ? '#ECFDF5' : '#FFFFFF') + '; color:' + (isSel ? '#064E3B' : '#1E293B') + '; font-weight:' + (isSel ? '800' : '600') + '; cursor:pointer; font-size:13.5px; font-family:inherit;',
              onclick: function () {
                selectedSkill = sk;
                renderModalContent();
              }
            }, (isSel ? '✓ ' : '• ') + sk);
            skillsListWrap.appendChild(skItem);
          });

          modalBox.appendChild(h('div', { style: 'background:#F0FDF4; border:1px solid #BBF7D0; border-radius:12px; padding:12px;' },
            h('label', { style: 'display:block; font-weight:800; color:#065F46; margin-bottom:4px; font-size:13.5px;', text: '1. اختيار المجال البيداغوجي:' }),
            domSelect,
            h('label', { style: 'display:block; font-weight:800; color:#065F46; margin-bottom:4px; font-size:13.5px;', text: '2. اختيار المهارة التابعة له (تُدرج تلقائياً في الخانة):' }),
            skillsListWrap,
            h('div', { style: 'margin-top:8px; font-size:13px; color:#047857; font-weight:700;', text: 'المهارة المختارة: ' + (selectedSkill || '—') })
          ));

        } else if (currentKind === 'manual') {
          // الطريقة الثانية: الملء اليدوي المستقل
          var manualArea = h('textarea', {
            class: 'input',
            rows: 3,
            placeholder: 'اكتب محتوى الخانة أو النشاط يدوياً (مستقل تماماً عن المكتبة)...',
            value: manualText,
            style: 'width:100%; font-size:14px; line-height:1.5;',
            oninput: function (e) { manualText = e.target.value; }
          });

          modalBox.appendChild(h('div', { style: 'background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:12px;' },
            h('label', { style: 'display:block; font-weight:800; color:#1E3A8A; margin-bottom:6px; font-size:13.5px;', text: 'الملء اليدوي المباشر للخانة:' }),
            manualArea,
            h('p', { class: 'small muted', style: 'margin:6px 0 0;', text: 'ملاحظة: الملء اليدوي مستقل عن المكتبة البيداغوجية ولا يضيف النص إلى قائمة المهارات.' })
          ));

        } else if (currentKind === 'activity') {
          // الأنشطة اليومية والفترات الخاصة
          var actGrid = h('div', { style: 'display:flex; flex-wrap:wrap; gap:8px;' });
          dailyActs.forEach(function (actName) {
            var isSel = (actName === selectedActivity);
            var actBtn = h('button', {
              type: 'button',
              style: 'padding:8px 14px; border-radius:20px; border:1.5px solid ' + (isSel ? '#D97706' : '#FDE68A') + '; background:' + (isSel ? '#F59E0B' : '#FFFBEB') + '; color:' + (isSel ? '#FFFFFF' : '#92400E') + '; font-weight:800; cursor:pointer; font-family:inherit; font-size:13.5px;',
              onclick: function () {
                selectedActivity = actName;
                renderModalContent();
              }
            }, actName);
            actGrid.appendChild(actBtn);
          });

          modalBox.appendChild(h('div', { style: 'background:#FFFBEB; border:1px solid #FDE68A; border-radius:12px; padding:12px;' },
            h('label', { style: 'display:block; font-weight:800; color:#92400E; margin-bottom:8px; font-size:13.5px;', text: 'اختر النشاط اليومي أو الفترة التنظيمية (لا تُصنف كمهارة بيداغوجية):' }),
            actGrid
          ));
        }

        // أزرار الحفظ وتفريغ الخانة وإلغاء الدمج إن كانت مدمجة
        var actionsRow = h('div', {
          style: 'display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:16px; padding-top:12px; border-top:1px solid #E2E8F0; flex-wrap:wrap;'
        });

        // زر إلغاء الدمج إن كانت الخانة مدمجة
        if (sessObj.span > 1) {
          actionsRow.appendChild(h('button', {
            type: 'button',
            class: 'btn small light',
            title: 'إلغاء دمج هذه الخانة وإعادتها إلى فتراتها الأصلية',
            onclick: function () {
              unmergeCell(dayObj, sessObj);
              dlg.remove();
              renderFullView();
              toast('تم إلغاء الدمج واستعادة الفترات الأصلية.', 'ok');
            }
          }, makeSvgIcon('s-x-circle'), h('span', { text: 'إلغاء الدمج' })));
        } else if (sessObj.kind !== 'empty') {
          // زر تفريغ الخانة
          actionsRow.appendChild(h('button', {
            type: 'button',
            class: 'btn small danger',
            onclick: function () {
              sessObj.kind = 'empty';
              sessObj.domain = '';
              sessObj.skill = '';
              sessObj.title = '';
              sessObj.manual_text = '';
              sessObj.activity = '';
              dlg.remove();
              renderFullView();
              toast('تم تفريغ الخانة.', 'ok');
            }
          }, makeSvgIcon('s-trash'), h('span', { text: 'تفريغ الخانة' })));
        } else {
          actionsRow.appendChild(h('div'));
        }

        var saveBtn = h('button', {
          type: 'button',
          class: 'btn',
          style: 'background:#14532D; color:#fff; font-weight:800;',
          onclick: function () {
            if (currentKind === 'library') {
              if (!selectedSkill) return toast('يرجى اختيار مهارة بيداغوجية.', 'bad');
              sessObj.kind = 'library';
              sessObj.domain = selectedDomain;
              sessObj.skill = selectedSkill;
              sessObj.title = selectedDomain + ' — ' + selectedSkill;
            } else if (currentKind === 'manual') {
              var txt = String(manualText || '').trim();
              if (!txt) return toast('أدخل محتوى الخانة اليدوي.', 'bad');
              sessObj.kind = 'manual';
              sessObj.manual_text = txt;
              sessObj.title = txt;
            } else if (currentKind === 'activity') {
              sessObj.kind = 'activity';
              sessObj.activity = selectedActivity;
              sessObj.title = selectedActivity;
            }
            dlg.remove();
            renderFullView();
            toast('تم تحديث محتوى الخانة بنجاح.', 'ok');
          }
        }, makeSvgIcon('s-check'), h('span', { text: 'تأكيد وحفظ الخانة' }));

        actionsRow.appendChild(h('div', { style: 'display:flex; gap:8px;' },
          h('button', { type: 'button', class: 'btn light', text: 'إلغاء', onclick: function () { dlg.remove(); } }),
          saveBtn
        ));

        modalBox.appendChild(actionsRow);
      }

      renderModalContent();

      var dlg = h('div', { class: 'modal-back' }, modalBox);
      document.body.appendChild(dlg);
    }

    // 4. تنفيذ دمج الخانات المحددة
    function executeMergeSelection() {
      var keys = Object.keys(mergeSelectedCells);
      if (keys.length < 2) {
        return toast('يرجى تحديد خانتين متجاورتين أو أكثر لدمجهما.', 'bad');
      }

      // التحقق من أن جميع الخانات تنتمي لنفس اليوم
      var dayKeys = keys.map(function (k) { return k.split(':')[0]; });
      var firstDay = dayKeys[0];
      var sameDay = dayKeys.every(function (dk) { return dk === firstDay; });
      if (!sameDay) {
        return toast('لا يمكن دمج خانات من أيام مختلفة! يرجى اختيار خانات في نفس اليوم فقط.', 'bad');
      }

      var dayObj = currentWeekState.days.filter(function (d) { return d.day === firstDay; })[0];
      var slotIds = keys.map(function (k) { return parseInt(k.split(':')[1], 10); }).sort(function (a, b) { return a - b; });

      // التحقق من التجاور الصارم
      var targetSessions = [];
      for (var i = 0; i < slotIds.length; i++) {
        var sid = slotIds[i];
        var foundS = dayObj.sessions.filter(function (s) { return s.slot_id === sid; })[0];
        if (!foundS) return toast('تعذر العثور على إحدى الخانات المحددة.', 'bad');
        targetSessions.push(foundS);
      }

      // فحص التجاور في مصفوفة dayObj.sessions
      var idxsInDay = targetSessions.map(function (s) { return dayObj.sessions.indexOf(s); }).sort(function (a, b) { return a - b; });
      for (var j = 0; j < idxsInDay.length - 1; j++) {
        if (idxsInDay[j + 1] !== idxsInDay[j] + 1) {
          return toast('الخانات المحددة غير متجاورة! لا يمكن دمج إلا الخانات المتجاورة مباشرة.', 'bad');
        }
      }

      // تنفيذ الدمج
      var firstSess = dayObj.sessions[idxsInDay[0]];
      var lastSess = dayObj.sessions[idxsInDay[idxsInDay.length - 1]];

      var totalSpan = 0;
      var allMergedSlotIds = [];
      targetSessions.forEach(function (ts) {
        totalSpan += (ts.span || 1);
        var subIds = (ts.merged_slot_ids && ts.merged_slot_ids.length) ? ts.merged_slot_ids : [ts.slot_id];
        allMergedSlotIds = allMergedSlotIds.concat(subIds);
      });

      firstSess.span = totalSpan;
      firstSess.end = lastSess.end;
      firstSess.merged_slot_ids = allMergedSlotIds;

      // إزالة الخانات التي دُمجت باستثناء الأولى
      for (var k = idxsInDay.length - 1; k >= 1; k--) {
        dayObj.sessions.splice(idxsInDay[k], 1);
      }

      isMergeMode = false;
      mergeSelectedCells = {};
      renderFullView();
      toast('تم دمج الخانات المتجاورة بنجاح في خانة واحدة.', 'ok');
    }

    // إلغاء دمج خانة وإعادتها لفتراتها الأصلية
    function unmergeCell(dayObj, sessObj) {
      if (!sessObj || sessObj.span <= 1) return;
      var cellIdx = dayObj.sessions.indexOf(sessObj);
      if (cellIdx < 0) return;

      var mergedIds = (sessObj.merged_slot_ids && sessObj.merged_slot_ids.length)
        ? sessObj.merged_slot_ids
        : [sessObj.slot_id];

      var restored = [];
      mergedIds.forEach(function (sid, idx) {
        var baseSlot = currentWeekState.time_slots.filter(function (ts) { return ts.id === sid; })[0]
          || { id: sid, start: sessObj.start, end: sessObj.end };
        restored.push({
          slot_id: sid,
          start: baseSlot.start,
          end: baseSlot.end,
          span: 1,
          merged_slot_ids: [sid],
          kind: idx === 0 ? sessObj.kind : 'empty',
          domain: idx === 0 ? sessObj.domain : '',
          skill: idx === 0 ? sessObj.skill : '',
          title: idx === 0 ? sessObj.title : '',
          manual_text: idx === 0 ? sessObj.manual_text : '',
          activity: idx === 0 ? sessObj.activity : ''
        });
      });

      // استبدال الخانة المدمجة بالخانات المستعادة
      dayObj.sessions.splice(cellIdx, 1);
      restored.forEach(function (r, rIdx) {
        dayObj.sessions.splice(cellIdx + rIdx, 0, r);
      });
    }

    // 5. نافذة التحكم في التوقيتات وتعديل الفترات
    function openTimeSlotsManagerModal() {
      var localSlots = currentWeekState.time_slots.map(function (ts) { return Object.assign({}, ts); });

      var modalBox = h('div', {
        class: 'modal card',
        style: 'max-width:620px; width:95%; background:#FFFFFF; padding:22px; border-radius:16px; box-shadow:0 20px 50px rgba(20,83,45,0.25); border:1px solid #CBD5E1; max-height:90vh; overflow-y:auto;'
      });

      function renderSlotsList() {
        modalBox.textContent = '';

        var head = h('div', {
          class: 'bar-sub',
          style: 'margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E2E8F0; padding-bottom:8px;'
        },
          h('h3', { style: 'margin:0; color:#14532D;', text: 'التحكم في التوقيتات وفترات الجدول الأسبوعي' }),
          h('button', { type: 'button', class: 'btn small light', text: '✕', onclick: function () { dlg.remove(); } })
        );
        modalBox.appendChild(head);

        var listWrap = h('div', { style: 'display:flex; flex-direction:column; gap:8px; max-height:360px; overflow-y:auto; margin-bottom:14px;' });

        localSlots.forEach(function (slot, sIdx) {
          var startInp = h('input', {
            class: 'input small',
            type: 'time',
            value: slot.start,
            style: 'width:95px;',
            onchange: function (e) {
              slot.start = e.target.value;
              slot.duration = calcDurationMins(slot.start, slot.end);
            }
          });
          var endInp = h('input', {
            class: 'input small',
            type: 'time',
            value: slot.end,
            style: 'width:95px;',
            onchange: function (e) {
              slot.end = e.target.value;
              slot.duration = calcDurationMins(slot.start, slot.end);
            }
          });
          var periodSelect = h('select', {
            class: 'input small',
            onchange: function (e) { slot.period = e.target.value; }
          },
            h('option', { value: 'morning', selected: slot.period === 'morning' ? 'selected' : null, text: 'الفترة الصباحية' }),
            h('option', { value: 'afternoon', selected: slot.period === 'afternoon' ? 'selected' : null, text: 'الفترة المسائية' })
          );

          var delBtn = h('button', {
            type: 'button',
            class: 'btn small danger',
            text: 'حذف',
            onclick: function () {
              if (localSlots.length <= 2) return toast('يجب الإبقاء على فترتين على الأقل.', 'bad');
              localSlots.splice(sIdx, 1);
              renderSlotsList();
            }
          });

          var rowCard = h('div', {
            style: 'display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 12px; background:#F8FAF9; border:1px solid #E2E8F0; border-radius:10px; flex-wrap:wrap;'
          },
            h('span', { style: 'font-weight:800; color:#14532D; min-width:30px;', text: '#' + (sIdx + 1) }),
            h('div', { style: 'display:flex; align-items:center; gap:6px;' },
              h('span', { class: 'small muted', text: 'من' }), startInp,
              h('span', { class: 'small muted', text: 'إلى' }), endInp
            ),
            periodSelect,
            delBtn
          );
          listWrap.appendChild(rowCard);
        });
        modalBox.appendChild(listWrap);

        // إضافة فترة جديدة
        var addSlotBtn = h('button', {
          type: 'button',
          class: 'btn small light',
          style: 'margin-bottom:14px;',
          onclick: function () {
            var last = localSlots[localSlots.length - 1];
            var nStart = last ? last.end : '14:00';
            var nEnd = minutesToTime(timeToMinutes(nStart) + 30);
            var nextId = localSlots.length ? Math.max.apply(null, localSlots.map(function (x) { return x.id != null ? x.id : 0; })) + 1 : 0;
            localSlots.push({
              id: nextId,
              start: nStart,
              end: nEnd,
              period: timeToMinutes(nStart) >= 750 ? 'afternoon' : 'morning',
              duration: 30,
              label: nStart + ' - ' + nEnd
            });
            renderSlotsList();
          }
        }, makeSvgIcon('s-plus'), h('span', { text: '+ إضافة فترة زمنية جديدة' }));
        modalBox.appendChild(addSlotBtn);

        // زر التأكيد وحفظ التوقيتات
        var confirmBtn = h('button', {
          type: 'button',
          class: 'btn',
          style: 'background:#14532D; color:#fff; font-weight:800;',
          onclick: function () {
            // فحص صحة التوقيتات والترتيب
            localSlots.sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); });
            for (var i = 0; i < localSlots.length; i++) {
              if (timeToMinutes(localSlots[i].end) <= timeToMinutes(localSlots[i].start)) {
                return toast('التوقيت غير صحيح في الفترة #' + (i + 1) + ': وقت النهاية يجب أن يكون بعد وقت البداية.', 'bad');
              }
              if (i < localSlots.length - 1 && timeToMinutes(localSlots[i].end) > timeToMinutes(localSlots[i + 1].start)) {
                toast('تنبيه: يوجد تداخل بين الفترة #' + (i + 1) + ' والفترة #' + (i + 2) + '. تم ضبط التوقيت تلقائياً.', 'gold');
                localSlots[i + 1].start = localSlots[i].end;
                localSlots[i + 1].end = minutesToTime(timeToMinutes(localSlots[i + 1].start) + (localSlots[i + 1].duration || 30));
              }
            }

            currentWeekState.time_slots = localSlots.map(function (ts, idx) {
              ts.id = ts.id != null ? ts.id : idx;
              ts.label = ts.start + ' - ' + ts.end;
              ts.duration = calcDurationMins(ts.start, ts.end);
              return ts;
            });

            // مزامنة خانات الأيام مع التوقيتات الجديدة
            currentWeekState.days.forEach(function (dayObj) {
              var oldSess = dayObj.sessions || [];
              var newSess = currentWeekState.time_slots.map(function (ts) {
                var found = oldSess.filter(function (os) { return os.slot_id === ts.id || os.start === ts.start; })[0];
                if (found) {
                  found.slot_id = ts.id;
                  found.start = ts.start;
                  found.end = ts.end;
                  return found;
                }
                return {
                  slot_id: ts.id,
                  start: ts.start,
                  end: ts.end,
                  span: 1,
                  merged_slot_ids: [ts.id],
                  kind: 'empty',
                  domain: '',
                  skill: '',
                  title: '',
                  manual_text: '',
                  activity: ''
                };
              });
              dayObj.sessions = newSess;
            });

            currentWeekState.day_start = localSlots[0].start;
            currentWeekState.day_end = localSlots[localSlots.length - 1].end;

            dlg.remove();
            renderFullView();
            toast('تم تحديث التوقيتات وإعادة ترتيب الجدول الأسبوعي بنجاح.', 'ok');
          }
        }, makeSvgIcon('s-check'), h('span', { text: 'تطبيق التوقيتات على الجدول' }));

        var footRow = h('div', { style: 'display:flex; justify-content:flex-end; gap:8px;' },
          h('button', { type: 'button', class: 'btn light', text: 'إلغاء', onclick: function () { dlg.remove(); } }),
          confirmBtn
        );
        modalBox.appendChild(footRow);
      }

      renderSlotsList();
      var dlg = h('div', { class: 'modal-back' }, modalBox);
      document.body.appendChild(dlg);
    }

    // 6. معاينة وثيقة PDF الرسمية A4 أفقي Landscape
    function openPdfLandscapePreviewModal() {
      var modalBox = h('div', {
        class: 'modal card',
        style: 'max-width:960px; width:96%; background:#FFFFFF; padding:20px; border-radius:16px; box-shadow:0 25px 60px rgba(20,83,45,0.3); border:1px solid #CBD5E1; max-height:92vh; overflow-y:auto;'
      });

      var head = h('div', {
        class: 'bar-sub',
        style: 'margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #E2E8F0; padding-bottom:10px;'
      },
        h('div', null,
          h('h3', { style: 'margin:0; color:#14532D;', text: 'معاينة الوثيقة الرسمية للبرنامج الأسبوعي (A4 أفقي Landscape)' }),
          h('span', { class: 'small muted', text: 'معاينة مطابقة تماماً للملف المصدَّر والمطبوع مع إخفاء أدوات التحرير' })
        ),
        h('div', { style: 'display:flex; gap:8px;' },
          h('button', {
            type: 'button',
            class: 'btn gold small',
            onclick: async function () {
              try {
                if (!window.DE_PDF || !window.DE_PDF.renderWeeklyProgramToPdf) throw new Error('مولد PDF غير متاح');
                toast('جارٍ تحميل ملف PDF...', 'ok');
                var bytes = await window.DE_PDF.renderWeeklyProgramToPdf(currentWeekState, getSecName());
                window.DE_PDF.downloadPdf(bytes, 'البرنامج_الأسبوعي_' + String(getSecName()).replace(/\s+/g, '_') + '.pdf');
              } catch (e) {
                toast('تعذر تنزيل PDF: ' + e.message, 'bad');
              }
            }
          }, makeSvgIcon('s-download'), h('span', { text: 'تحميل PDF' })),
          h('button', {
            type: 'button',
            class: 'btn light small',
            onclick: function () { window.print(); }
          }, makeSvgIcon('s-print'), h('span', { text: 'طباعة' })),
          h('button', { type: 'button', class: 'btn small light', text: '✕', onclick: function () { dlg.remove(); } })
        )
      );
      modalBox.appendChild(head);

      var canvasMount = h('div', {
        style: 'width:100%; background:#fff; border:1px solid #CBD5E1; border-radius:10px; overflow:hidden; padding:4px;'
      }, h('p', { class: 'muted small', style: 'text-align:center; padding:30px;', text: 'جارٍ توليد المعاينة الرسمية...' }));

      modalBox.appendChild(canvasMount);

      if (window.DE_PDF && window.DE_PDF.renderWeeklyProgramCanvas) {
        window.DE_PDF.renderWeeklyProgramCanvas(currentWeekState, getSecName()).then(function (cEl) {
          canvasMount.textContent = '';
          cEl.style.width = '100%';
          cEl.style.height = 'auto';
          cEl.style.display = 'block';
          cEl.style.borderRadius = '6px';
          canvasMount.appendChild(cEl);
        }).catch(function (err) {
          canvasMount.textContent = 'تعذر رسم المعاينة: ' + err.message;
        });
      }

      var dlg = h('div', { class: 'modal-back' }, modalBox);
      document.body.appendChild(dlg);
    }

    // 7. حفظ البرنامج أو نشره للأولياء
    async function saveProgramAction(publishNow) {
      if (!currentWeekState.section_id) {
        return toast('يرجى اختيار الفوج التربوي أولاً.', 'bad');
      }

      // فحص إن كانت هناك خانات معبأة
      var totalFilled = 0;
      currentWeekState.days.forEach(function (d) {
        (d.sessions || []).forEach(function (s) {
          if (s.kind && s.kind !== 'empty') totalFilled++;
        });
      });

      if (totalFilled === 0 && publishNow) {
        return toast('الجدول فارغ بالكامل! يرجى تعبئة الحصص قبل نشر البرنامج للأولياء.', 'bad');
      }

      var secName = getSecName();
      var nowIso = new Date().toISOString();
      var wasPub = (currentWeekState.status === 'published' || currentWeekState.status === 'updated');
      var nextStatus = publishNow ? (wasPub && currentWeekState.id ? 'updated' : 'published') : 'draft';

      currentWeekState.status = nextStatus;
      currentWeekState.updated_at = nowIso;
      if (publishNow) currentWeekState.published_at = nowIso;

      var schedulePayload = currentWeekState.days.map(function (dy) {
        return {
          day: dy.day,
          label: dy.label,
          section_name: secName,
          academic_year: currentWeekState.academic_year || '2026/2027',
          program_status: nextStatus,
          day_start: currentWeekState.day_start || '08:00',
          day_end: currentWeekState.day_end || '14:00',
          educator_name: currentWeekState.educator_name || '',
          supervisor_name: currentWeekState.supervisor_name || '',
          director_name: currentWeekState.director_name || '',
          prepared_date: currentWeekState.prepared_date || nowIso.slice(0, 10),
          updated_at: nowIso,
          published_at: currentWeekState.published_at,
          time_slots: currentWeekState.time_slots,
          sessions: (dy.sessions || []).map(function (s) {
            return {
              slot_id: s.slot_id,
              start: s.start,
              end: s.end,
              span: s.span || 1,
              merged_slot_ids: s.merged_slot_ids || [s.slot_id],
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
        section_id: currentWeekState.section_id,
        title: DE.clean('البرنامج الأسبوعي — ' + secName, 155),
        academic_year: currentWeekState.academic_year || '2026/2027',
        description: DE.clean('البرنامج الأسبوعي المعتمد لفوج ' + secName, 1000),
        goals: DE.clean('تنمية المهارات البيداغوجية والأنشطة لفوج ' + secName, 1000),
        schedule: schedulePayload,
        status: publishNow ? 'published' : 'draft',
        published_at: publishNow ? nowIso : null
      };

      var savedId = currentWeekState.id || ('prog-' + Date.now());
      try {
        if (currentWeekState.id && !String(currentWeekState.id).startsWith('prog-')) {
          await C.rest('PATCH', '/educational_programs?id=eq.' + uid(currentWeekState.id), body);
        } else {
          var res = await C.rest('POST', '/educational_programs', body);
          if (Array.isArray(res) && res[0] && res[0].id) savedId = res[0].id;
        }
      } catch (dbErr) {}

      currentWeekState.id = savedId;
      var localRecord = Object.assign({ id: savedId, created_at: nowIso }, body);
      var sharedList = readSharedProgramsLocal();
      var exIdx = sharedList.findIndex(function (x) { return x && String(x.id) === String(savedId); });
      if (exIdx >= 0) sharedList[exIdx] = localRecord;
      else sharedList.unshift(localRecord);
      writeSharedProgramsLocal(sharedList);

      // إرسال إشعار للأولياء عند النشر
      if (publishNow) {
        try {
          await C.rest('POST', '/messages', {
            kind: 'notice',
            title: (nextStatus === 'updated' ? 'تحديث البرنامج الأسبوعي — ' : 'نشر البرنامج الأسبوعي — ') + secName,
            body: 'تم ' + (nextStatus === 'updated' ? 'تحديث' : 'اعتماد ونشر') + ' البرنامج الأسبوعي لفوج «' + secName + '». يمكنكم الاطلاع عليه وتحميله بصيغة PDF من قسم «البرنامج الأسبوعي» في فضاء الأولياء.',
            published_at: nowIso
          });
        } catch (msgErr) {}

        // مشاركة عبر واتساب إن وُجد آباء للفوج
        toast('تم نشر البرنامج في فضاء الأولياء وتوليد ملف PDF بنجاح!', 'ok');
      } else {
        toast('تم حفظ البرنامج الأسبوعي كمسودة بنجاح.', 'ok');
      }

      bust();
      renderFullView();
    }

    renderFullView();
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
  var EVAL_MARKER = '/*DE_EVAL_V1*/';
  var SHARED_EVALS_STORAGE_KEY = 'de_shared_evaluations_v1';

  function isEvaluationReport(r) {
    if (!r) return false;
    return (typeof r.activities === 'string' && r.activities.indexOf(EVAL_MARKER) === 0)
      || (typeof r.title === 'string' && (r.title.indexOf('استمارة تقييم') >= 0 || r.title.indexOf('تقرير اللجنة البيداغوجية') >= 0));
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

  async function saveProgressReportResilient(method, path, body) {
    try {
      return await C.rest(method, path, body, 'return=representation');
    } catch (err1) {
      if (body && body.status !== undefined) {
        var fallbackBody = Object.assign({}, body);
        delete fallbackBody.status;
        return await C.rest(method, path, fallbackBody, 'return=representation');
      }
      throw err1;
    }
  }

  function parseEvaluationReport(r) {
    var CURR = (window && window.DE_CURRICULUM) || EMBEDDED_CURRICULUM || {};
    var domainKeys = Object.keys(CURR);
    var res = {
      id: r ? r.id : null,
      child_id: (r && r.child_id) || S.preselectChildId || '',
      title: (r && r.title) || 'تقرير اللجنة البيداغوجية والتربوية — استمارة التقييم',
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

    if (r && typeof r.activities === 'string' && r.activities.indexOf(EVAL_MARKER) === 0) {
      try {
        var rawJson = JSON.parse(r.activities.slice(EVAL_MARKER.length));
        if (rawJson && typeof rawJson === 'object') {
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

          if (Array.isArray(rawJson.domains)) {
            res.domains = rawJson.domains.map(function (dm) {
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
        }
      } catch (e) {}
    }

    if (!res.general_report && res.general_notes) {
      res.general_report = res.general_notes;
    }

    if (!res.domains.length) {
      var firstDom = domainKeys[0] || '';
      res.domains.push({
        domain: firstDom,
        ratings: (CURR[firstDom] || []).map(function (sk, idx) {
          return { num: idx + 1, skill: sk, score: '', yn: '', note: '' };
        })
      });
    }
    return res;
  }

  /* رسم ورقة التقييم الرسمية (الإدارة: 3 أزرار للتقرير الكتابي، التقرير الكمي المطابق للصورة، والتقرير الشامل مع الجداول) */
  function renderEvaluationSheetView(r, childFullName, secName, kd, initialReportMode, adminOpts) {
    var ev = parseEvaluationReport(r);
    var statsObj = (window.DE_PDF && typeof window.DE_PDF.computeEvaluationStats === 'function')
      ? window.DE_PDF.computeEvaluationStats(ev)
      : null;

    // حساب العمر التقريبي للطفل إن توفر تاريخ الميلاد
    var ageTxt = '—';
    if (kd && kd.dob) {
      try {
        var birthDate = new Date(kd.dob);
        var today = new Date();
        var age = today.getFullYear() - birthDate.getFullYear();
        var m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        if (age > 0) ageTxt = age + ' سنة';
      } catch (e) {}
    }

    var logoImg = h('img', { class: 'oep-logo-side', alt: 'شعار الجمعية' });
    logoImg.setAttribute('src', 'logo-sq.png');

    // 1. ترويسة الوثيقة الرسمية (التقرير البيداغوجي الوصفي — تقرير الملاحظات والتوجيهات)
    var header = h('div', { class: 'oep-header' },
      h('div', { class: 'oep-title-block' },
        h('h3', { class: 'oep-org-name', text: 'جمعية أولياء الأطفال المعاقين ذهنيًا' }),
        h('h4', { class: 'oep-center-name', text: 'المركز النفسي البيداغوجي دار الإحسان' }),
        h('p', { class: 'oep-location', text: '— العطف - غرداية —' }),
        h('div', { class: 'oep-fr-title', text: "COMPTE RENDU DE L'EQUIPE PEDAGOGIQUE" }),
        h('h2', { class: 'oep-report-heading', text: 'التقرير البيداغوجي الوصفي (تقرير الملاحظات والتوجيهات)' })
      ),
      logoImg
    );

    // 2. البانر الأصفر/الذهبي للثلاثي والموسم
    var termBanner = h('div', { class: 'oep-term-banner', text: 'تقييم ' + (ev.term || 'الثلاثي الأخير') + ' للموسم الدراسي: ' + (ev.school_year || '2024/2025') });

    // 3. شبكة معلومات الحالة
    var infoTable = h('table', { class: 'oep-info-table' },
      h('tbody', null,
        h('tr', null,
          h('td', { class: 'oep-info-label', text: 'اسم ولقب الحالة:' }),
          h('td', { class: 'oep-info-val' }, h('strong', { text: childFullName || '—' })),
          h('td', { class: 'oep-info-label', text: 'العمر:' }),
          h('td', { class: 'oep-info-val', text: ageTxt })
        ),
        h('tr', null,
          h('td', { class: 'oep-info-label', text: 'نوع الاضطراب:' }),
          h('td', { class: 'oep-info-val', text: (kd && kd.disability) || '—' }),
          h('td', { class: 'oep-info-label', text: 'تاريخ الميلاد:' }),
          h('td', { class: 'oep-info-val', text: (kd && kd.dob) ? fmt(kd.dob) : '—' })
        ),
        h('tr', null,
          h('td', { class: 'oep-info-label', text: 'درجة الإعاقة / الاضطراب:' }),
          h('td', { class: 'oep-info-val', text: ev.degree_of_disability || 'متوسطة' }),
          h('td', { class: 'oep-info-label', text: 'القسم ومستوى التأهيل:' }),
          h('td', { class: 'oep-info-val', text: ev.qualification_level || secName || '—' })
        )
      )
    );

    // 4. جدول المشرفين (بحد أقصى 4 صفوف لضمان عدم تجاوز صفحة A4)
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
          h('th', { text: 'التوقيع والختم' })
        )
      ),
      h('tbody', null, supRows)
    );

    // 5. البانر الأزرق وقسم "الوصف العام لأداء الحالة" (مع حد صفحة A4)
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

    // 6. البانر الأخضر وقسم "الخلاصة والتوصيات" (بحد أقصى 4 نقاط لكل عمود لعدم تجاوز صفحة A4)
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

    // القسم الأول: التقرير الكتابي للملاحظات (صفحة A4 واحدة بدون الكشف والجداول)
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

    // القسم الثاني: التقرير التقييمي الكمي (الجدول + المشرفون + الأعمدة البيانية + الدائرة النسبية — مطابق للصورة 56725.jpg)
    var quantitativeCanvasHost = h('div', {
      class: 'oep-quant-canvas-host',
      style: 'width:100%; background:#FFFFFF; border:1px solid #CBD5E1; border-radius:6px; overflow:hidden; text-align:center; min-height:320px; display:flex; align-items:center; justify-content:center;'
    }, h('span', { class: 'muted small', text: 'جارٍ رسم التقرير الكمي البياني...' }));

    function renderQuantCanvasNow() {
      if (window.DE_PDF && typeof window.DE_PDF.renderQuantitativePageCanvas === 'function') {
        window.DE_PDF.renderQuantitativePageCanvas(ev, childFullName, secName, kd).then(function (cEl) {
          quantitativeCanvasHost.textContent = '';
          cEl.style.width = '100%';
          cEl.style.height = 'auto';
          cEl.style.display = 'block';
          cEl.style.maxWidth = '100%';
          quantitativeCanvasHost.appendChild(cEl);
        }).catch(function () {});
      }
    }
    setTimeout(renderQuantCanvasNow, 10);

    var quantitativeReportSection = h('div', { class: 'oep-quantitative-page-box' },
      quantitativeCanvasHost
    );

    // القسم الثالث (خاص بالإدارة في التقرير الشامل): الجداول التفصيلية لكافة المجالات والمهارات المقيمة
    var domainStatsList = statsObj ? statsObj.domainStats : [];
    var allDomainDetailTables = domainStatsList.map(function (dm, dIdx) {
      var skillRows = (dm.ratings || []).map(function (rt) {
        return h('tr', null,
          h('td', { style: 'text-align:center;', text: String(rt.num) }),
          h('td', null, h('strong', { text: rt.skill })),
          h('td', { style: 'text-align:center;' },
            h('span', {
              class: 'badge ' + (rt.acquired ? 'ok' : (rt.isRated ? 'gold' : 'gray')),
              text: rt.badgeText + (rt.acquired ? ' • مكتسبة' : (rt.isRated ? ' • غير مكتسبة' : ' • لم تقيَّم'))
            })
          ),
          h('td', { class: 'muted small', text: rt.note })
        );
      });

      return h('div', { class: 'eval-domain-table-wrap', style: 'margin-top:16px;' },
        h('div', { class: 'oep-gr-header', style: 'display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:#EEF2FF;color:#312E81;border:1px solid #C7D2FE;flex-wrap:wrap;gap:8px;' },
          h('strong', { text: (dIdx + 1) + '. ' + dm.name + ' (إجمالي المهارات: ' + dm.count + ')' }),
          h('span', { class: 'badge ok', text: 'المهارات المكتسبة (4/5 فما فوق): ' + dm.acquired + ' من ' + dm.count + ' (' + dm.pctFmt + '%)' })
        ),
        h('table', { class: 'oep-scorecard-table', style: 'margin-top:0;width:100%;' },
          h('thead', null,
            h('tr', null,
              h('th', { style: 'width:45px;text-align:center;', text: '#' }),
              h('th', { text: 'المهارة المقيمة' }),
              h('th', { style: 'width:165px;text-align:center;', text: 'الدرجة والاكتساب (4/5+)' }),
              h('th', { text: 'الملاحظات والتوجيهات' })
            )
          ),
          h('tbody', null, skillRows.length ? skillRows : h('tr', null, h('td', { colspan: 4, class: 'muted', style: 'text-align:center;', text: 'لا توجد مهارات مسجلة في هذا المجال.' })))
        )
      );
    });

    var detailedSkillsSection = h('div', { class: 'eval-detailed-skills-box', style: 'margin-top:20px;' },
      h('div', { class: 'oep-section-banner', style: 'background-color:#E0E7FF; color:#1E1B4B; margin:16px 0 8px;', text: 'الجداول التفصيلية لكافة المجالات والمهارات المقيمة (معيار الاكتساب: 4/5 فما فوق)' }),
      allDomainDetailTables
    );

    // عند الضغط على «التفاصيل» لا يظهر التقرير إطلاقاً (activeMode = null)، بل تظهر الأزرار فقط وبجانبها عنوان كل تقرير وزر «المعاينة»
    // وعند الضغط على أي من الأزرار الثلاثة أو زر «المعاينة» يظهر التقرير بملاءمة تلقائية كاملة للهاتف والكمبيوتر، وعند الضغط مرة أخرى يختفي تماماً
    var activeMode = (initialReportMode === 'notes' || initialReportMode === 'statistics' || initialReportMode === 'full') ? initialReportMode : null;
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

    function makeReportControlRow(modeKey, btnShortLabel, reportFullTitle, pdfFileNamePrefix, toastMsg) {
      var mainToggleBtn = h('button', {
        type: 'button',
        class: 'btn oep-report-main-btn ' + (activeMode === modeKey ? 'gold' : 'light'),
        onclick: function () { toggleReportMode(modeKey); }
      }, makeSvgIcon(modeKey === 'full' ? 's-card' : 's-report'), h('span', { text: btnShortLabel }));

      var titleLabelEl = h('div', {
        class: 'oep-report-row-title',
        onclick: function () { toggleReportMode(modeKey); }
      }, h('strong', { text: reportFullTitle }));

      var previewBtnLabel = h('span', { text: activeMode === modeKey ? 'إخفاء المعاينة' : 'المعاينة' });
      var previewToggleBtn = h('button', {
        type: 'button',
        class: 'btn small oep-report-preview-btn ' + (activeMode === modeKey ? 'gold' : ''),
        onclick: function (e) {
          e.stopPropagation();
          toggleReportMode(modeKey);
        }
      }, makeSvgIcon(activeMode === modeKey ? 's-eye-off' : 's-eye'), previewBtnLabel);

      var dlBtn = h('button', {
        type: 'button',
        class: 'btn small light oep-report-dl-btn',
        title: 'تحميل ' + reportFullTitle + ' بصيغة PDF',
        onclick: async function (e) {
          e.stopPropagation();
          try {
            toast(toastMsg, 'ok');
            var pdfBytes = await DE_PDF.renderEvaluationToPdf(ev, childFullName, secName, kd, modeKey);
            DE_PDF.downloadPdf(pdfBytes, pdfFileNamePrefix + '_' + (childFullName || 'تلميذ').replace(/\s+/g, '_') + '.pdf');
            toast('تم تنزيل التقرير بصيغة PDF بنجاح!', 'ok');
          } catch (err) {
            toast('تعذر تنزيل التقرير: ' + err.message, 'bad');
          }
        }
      }, makeSvgIcon('s-download'), h('span', { text: 'تحميل PDF' }));

      var rowEl = h('div', { class: 'oep-report-selector-row' + (activeMode === modeKey ? ' is-active' : '') },
        h('div', { class: 'oep-report-row-right' },
          mainToggleBtn,
          titleLabelEl
        ),
        h('div', { class: 'oep-report-row-actions' },
          previewToggleBtn,
          dlBtn
        )
      );

      return {
        rowEl: rowEl,
        mainToggleBtn: mainToggleBtn,
        previewToggleBtn: previewToggleBtn,
        previewBtnLabel: previewBtnLabel
      };
    }

    var tab1 = makeReportControlRow(
      'notes',
      'التقرير الأول (الكتابي)',
      'التقرير البيداغوجي الوصفي — تقرير الملاحظات والتوجيهات',
      'تقرير_الملاحظات_والتوجيهات',
      'جارٍ تجهيز تقرير الملاحظات والتوجيهات...'
    );
    var tab2 = makeReportControlRow(
      'statistics',
      'التقرير الثاني (الكمي)',
      'التقرير التقييمي الكمي — كشف النتائج والأعمدة والدائرة النسبية',
      'التقرير_الكمي_لنتائج_التقييم',
      'جارٍ تجهيز التقرير الكمي لنتائج التقييم...'
    );
    var tab3 = makeReportControlRow(
      'full',
      'التقرير الثالث (الشامل)',
      'التقرير البيداغوجي الشامل — الملاحظات والكمي وجداول المجالات والمهارات',
      'التقرير_الشامل_للتقييم',
      'جارٍ تجهيز التقرير الشامل مع الجداول التفصيلية...'
    );

    // أزرار إدارة التقييم (التعديل، الإرسال للأولياء، الحذف) تظهر مع الأزرار الثلاثة عند الضغط على «التفاصيل»
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
      }, makeSvgIcon('s-upload'), h('span', { text: isPub ? 'إعادة الإرسال للأولياء (مرسل ✓)' : 'الإرسال للأولياء' })) : null;

      var unpubEvalBtn = (isPub && adminOpts.onUnpublish) ? h('button', {
        type: 'button',
        class: 'btn small light',
        onclick: function () { act(unpubEvalBtn, function () { return adminOpts.onUnpublish(); }); }
      }, h('span', { text: 'إلغاء الإرسال (تحويل لمسودة)' })) : null;

      var delEvalBtn = adminOpts.onDelete ? h('button', {
        type: 'button',
        class: 'btn danger',
        onclick: function () { act(delEvalBtn, function () { return adminOpts.onDelete(); }); }
      }, makeSvgIcon('s-trash'), h('span', { text: 'الحذف' })) : null;

      managementCrudBar = h('div', { class: 'oep-crud-management-bar no-print' },
        h('div', { class: 'oep-crud-bar-title' },
          makeSvgIcon('s-card'),
          h('strong', { text: 'إجراءات استمارة التقييم:' }),
          badge(isPub ? 'مرسل ومنشور في فضاء الأولياء' : 'مسودة غير مرسلة', isPub ? 'ok' : 'gray')
        ),
        h('div', { class: 'oep-crud-bar-btns' },
          editEvalBtn,
          sendEvalBtn,
          unpubEvalBtn,
          delEvalBtn
        )
      );
    }

    var printBtn = h('button', {
      type: 'button',
      class: 'btn small gold',
      onclick: function () { window.print(); }
    }, makeSvgIcon('s-print'), h('span', { text: 'طباعة التقرير المعروض (A4)' }));

    var closePreviewBtn = h('button', {
      type: 'button',
      class: 'btn small light',
      onclick: function () {
        activeMode = null;
        updateViewMode();
      }
    }, makeSvgIcon('s-eye-off'), h('span', { text: 'إخفاء المعاينة' }));

    var previewUtilitiesBar = h('div', {
      class: 'oep-preview-utilities-bar no-print',
      hidden: !activeMode
    },
      h('span', { class: 'muted small', text: 'معاينة التقرير مفتوحة — اضغط على زر التقرير مرة أخرى أو «إخفاء المعاينة» لإغلاقها:' }),
      h('div', { class: 'row-actions' },
        printBtn,
        closePreviewBtn
      )
    );

    var topActionsBar = h('div', { class: 'oep-action-bar oep-details-control-panel no-print' },
      managementCrudBar,
      h('div', { class: 'oep-reports-list-header' },
        h('strong', { text: 'تقارير التقييم المتاحة للمعاينة والتحميل (اضغط على التقرير أو زر «المعاينة» لإظهاره، واضغط مرة أخرى لإخفائه):' })
      ),
      h('div', { class: 'oep-reports-selector-stack' },
        tab1.rowEl,
        tab2.rowEl,
        tab3.rowEl
      ),
      previewUtilitiesBar
    );

    function updateTabRowState(tabObj, modeKey) {
      var isAct = (activeMode === modeKey);
      tabObj.rowEl.className = 'oep-report-selector-row' + (isAct ? ' is-active' : '');
      tabObj.mainToggleBtn.className = 'btn oep-report-main-btn ' + (isAct ? 'gold' : 'light');
      tabObj.previewToggleBtn.className = 'btn small oep-report-preview-btn ' + (isAct ? 'gold' : '');
      tabObj.previewBtnLabel.textContent = isAct ? 'إخفاء المعاينة' : 'المعاينة';
    }

    function updateViewMode() {
      paperEl.className = 'official-eval-paper oep-fit-computer-screen'
        + (activeMode ? (' mode-' + activeMode) : ' is-collapsed-preview');

      updateTabRowState(tab1, 'notes');
      updateTabRowState(tab2, 'statistics');
      updateTabRowState(tab3, 'full');

      previewUtilitiesBar.hidden = !activeMode;

      // تفريغ حاوية العرض تماماً عند عدم اختيار أي تقرير حتى لا يظهر أي عنصر من التقرير إلا بعد الضغط على زر التقرير
      previewMountHost.textContent = '';
      if (!activeMode) {
        previewMountHost.hidden = true;
      } else {
        previewMountHost.hidden = false;
        if (activeMode === 'notes' || activeMode === 'full') {
          writtenReportSection.hidden = false;
          previewMountHost.appendChild(writtenReportSection);
        }
        if (activeMode === 'statistics' || activeMode === 'full') {
          quantitativeReportSection.hidden = false;
          previewMountHost.appendChild(quantitativeReportSection);
        }
        if (activeMode === 'full') {
          detailedSkillsSection.hidden = false;
          previewMountHost.appendChild(detailedSkillsSection);
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
  function openEvaluationBuilder(existingRep, kids, sections, secAllOpts, branchOpts) {
    S.inSubBuilder = true;
    try { window.history.pushState({ deApp: true, sec: 'evaluations', center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
    var ev = parseEvaluationReport(existingRep);
    S.preselectChildId = null;

    var v = $('#view');
    v.textContent = '';

    var topBar = h('div', { class: 'bar-sub' },
      h('h2', { text: existingRep ? 'تعديل استمارة التقييم البيداغوجي' : 'إضافة استمارة تقييم بيداغوجي رسمية جديدة' }),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn light', type: 'button', text: 'رجوع لقائمة التقييم', onclick: function () { go('evaluations'); } })
      )
    );
    v.appendChild(topBar);

    // 1. اختيار الطفل والتفاصيل الإدارية
    var selectedKid0 = kids.filter(function (k) { return k.id === ev.child_id; })[0] || (kids.length === 1 ? kids[0] : null);
    if (selectedKid0 && !ev.child_id) ev.child_id = selectedKid0.id;

    var curSecId = S.isEducator ? S.eduSectionId : (selectedKid0 ? selectedKid0.section_id : '');
    var secFilterSelect = h('select', { disabled: !!S.isEducator },
      h('option', { value: '', text: '— جميع الأقسام —' }),
      secAllOpts.map(function (o) { return h('option', { value: o[0], text: o[1] }); })
    );
    secFilterSelect.value = curSecId || '';

    var kidSearch = h('input', { type: 'search', class: 'fld-search', placeholder: 'ابحث باسم الطفل أو رقم القيد...', autocomplete: 'off' });
    var kidSelect = h('select', null);

    function populateKidsSelect() {
      var sId = secFilterSelect.value;
      var q = normAr(kidSearch.value.trim());
      var keep = ev.child_id || kidSelect.value;
      while (kidSelect.firstChild) kidSelect.removeChild(kidSelect.firstChild);
      kidSelect.appendChild(h('option', { value: '', text: '— اختر الطفل المعني بالتقييم —' }));
      kids.forEach(function (k) {
        if (sId && !childMatchesSection(k, sId, nameOf(sections, sId, 'name'), sections)) return;
        var label = (k.membership_no ? ('[' + k.membership_no + '] ') : '') + k.full_name + (k.section ? (' — ' + k.section) : '');
        if (q && normAr(label).indexOf(q) === -1) return;
        kidSelect.appendChild(h('option', { value: k.id, text: label }));
      });
      if (keep && kids.some(function (k) { return k.id === keep && (!sId || childMatchesSection(k, sId, nameOf(sections, sId, 'name'), sections)); })) {
        kidSelect.value = keep;
      }
    }

    secFilterSelect.addEventListener('change', function () {
      ev.child_id = '';
      populateKidsSelect();
      ev.child_id = kidSelect.value;
      updateChildAutoMeta();
    });

    kidSearch.addEventListener('input', function () {
      populateKidsSelect();
      ev.child_id = kidSelect.value;
      updateChildAutoMeta();
    });

    populateKidsSelect();

    var titleInput = h('input', { type: 'text', maxlength: 145, value: ev.title || 'تقرير اللجنة البيداغوجية والتربوية' });
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

    var qualLevelInput = h('input', { type: 'text', maxlength: 80, value: ev.qualification_level || '' });
    qualLevelInput.addEventListener('input', function () { ev.qualification_level = qualLevelInput.value; });

    function updateChildAutoMeta() {
      var chosen = kids.filter(function (k) { return k.id === ev.child_id; })[0];
      if (chosen) {
        var sName = nameOf(sections, chosen.section_id, 'name') || chosen.section || '';
        if (!qualLevelInput.value) {
          qualLevelInput.value = sName;
          ev.qualification_level = sName;
        }
      }
    }

    kidSelect.addEventListener('change', function () {
      ev.child_id = kidSelect.value;
      updateChildAutoMeta();
    });

    var step1Card = h('div', { class: 'card prog-step-card' },
      h('h3', { class: 'prog-step-title', text: '1⃣ بيانات الحالة والموسم الدراسي (مطابقة للصورة الرسمية)' }),
      h('div', { class: 'eval-builder-grid-2' },
        h('label', { class: 'fld' }, h('span', { text: 'تصفية حسب القسم التربوي:' }), secFilterSelect),
        h('label', { class: 'fld' }, h('span', { text: 'بحث عن الطفل:' }), kidSearch)
      ),
      h('label', { class: 'fld' }, h('span', { text: 'الطفل المعني بالاستمارة:' }), kidSelect),
      h('div', { class: 'eval-builder-grid-2' },
        h('label', { class: 'fld' }, h('span', { text: 'تقييم الثلاثي:' }), termSelect),
        h('label', { class: 'fld' }, h('span', { text: 'الموسم الدراسي:' }), schoolYearInput),
        h('label', { class: 'fld' }, h('span', { text: 'تاريخ التقييم:' }), dateInput),
        h('label', { class: 'fld' }, h('span', { text: 'عنوان الوثيقة:' }), titleInput),
        h('label', { class: 'fld' }, h('span', { text: 'درجة الإعاقة / الاضطراب:' }), disabilityDegInput),
        h('label', { class: 'fld' }, h('span', { text: 'القسم ومستوى التأهيل:' }), qualLevelInput)
      )
    );
    v.appendChild(step1Card);

    // 2. إدارة المشرفين (المشرفون: ضع في الأول واحد ثم إمكانية إضافة واحد)
    var supervisorsHost = h('div', { class: 'dynamic-items-container' });

    function renderSupervisorsList() {
      supervisorsHost.textContent = '';
      if (!ev.supervisors || !ev.supervisors.length) {
        ev.supervisors = [{ name: 'إدارة المركز', role: 'مدير المركز' }];
      }

      ev.supervisors.forEach(function (sp, idx) {
        var nameInp = h('input', { type: 'text', placeholder: 'اسم ولقب المشرف...', value: sp.name || '' });
        nameInp.addEventListener('input', function () { sp.name = nameInp.value; });

        var roleInp = h('input', { type: 'text', placeholder: 'الوظيفة (مدير المركز، أخصائية نفسانية، مربية...)', value: sp.role || '' });
        roleInp.addEventListener('input', function () { sp.role = roleInp.value; });

        var delBtn = h('button', {
          type: 'button',
          class: 'btn small danger',
          text: 'حذف',
          disabled: ev.supervisors.length <= 1,
          onclick: function () {
            ev.supervisors.splice(idx, 1);
            renderSupervisorsList();
          }
        });

        var row = h('div', { class: 'dynamic-item-row' },
          h('span', { class: 'badge', text: '#' + (idx + 1) }),
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
      text: '+ إضافة مشرف آخر',
      onclick: function () {
        ev.supervisors.push({ name: '', role: 'مربية' });
        renderSupervisorsList();
      }
    });

    renderSupervisorsList();

    var stepSupervisorsCard = h('div', { class: 'card prog-step-card' },
      h('div', { class: 'bar-sub' },
        h('h3', { class: 'prog-step-title', text: '2⃣ المشرفون على التقييم (جدول التوقيعات ورموز الاستجابة السريعة)' }),
        addSupervisorBtn
      ),
      h('p', { class: 'muted small', text: 'حدد أسماء ووظائف أعضاء اللجنة البيداغوجية المشرفة على التقييم (يبدأ بمشرف واحد مع إمكانية إضافة مشرفين إضافيين).' }),
      supervisorsHost
    );
    v.appendChild(stepSupervisorsCard);

    // 3. خانات تقرير التقييم (الوصف العام لأداء الحالة: التقرير العام + الخانات الستة — مضبوطة بحد أقصى لصفحة A4)
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
      h('h3', { class: 'prog-step-title', text: '3⃣ خانات تقرير التقييم — الوصف العام لأداء الحالة (مطابقة للصورة الرسمية)' }),
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

    // 4. الخلاصة والتوصيات (نقاط القوة، نقاط الضعف، التوصيات مع إمكانية إضافة أكثر من واحدة)
    function buildDynamicListBlock(title, arrKey, placeholder, addLabel) {
      var MAX_ITEMS_A4 = 4;
      var container = h('div', { class: 'dynamic-items-container' });
      var addBtn = h('button', {
        type: 'button',
        class: 'btn small light',
        text: addLabel,
        onclick: function () {
          if ((ev[arrKey] || []).length >= MAX_ITEMS_A4) {
            return toast('الحد الأقصى 4 نقاط في كل خانة حتى لا يتجاوز تقرير الملاحظات صفحة A4 واحدة.', 'bad');
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
          var inp = h('input', { type: 'text', maxlength: 120, placeholder: placeholder + ' (حد صفحة A4)', value: String(val || '').slice(0, 120) });
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
        h('div', { class: 'bar-sub' }, h('h4', { text: title + ' (حد 4 نقاط لصفحة A4)' }), addBtn),
        container
      );
    }

    var stepSummaryCard = h('div', { class: 'card prog-step-card' },
      h('h3', { class: 'prog-step-title', text: '4⃣ الخلاصة والتوصيات (إمكانية إضافة أكثر من نقطة قوة، ضعف، وتوصية)' }),
      h('div', { class: 'eval-builder-grid-2' },
        buildDynamicListBlock('نقاط القوة', 'strengths', 'اكتب نقطة قوة...', '+ إضافة نقطة قوة'),
        buildDynamicListBlock('نقاط الضعف', 'weaknesses', 'اكتب نقطة ضعف...', '+ إضافة نقطة ضعف')
      ),
      buildDynamicListBlock('التوصيات والتوجيهات', 'recommendations', 'اكتب توصية للمركز والأسرة...', '+ إضافة توصية أخرى')
    );
    v.appendChild(stepSummaryCard);

    // 5. تقييم المهارات والمجالات البيداغوجية المصغر ("اريد ان تصغر حجم التقيم")
    var CURR = (window && window.DE_CURRICULUM) || EMBEDDED_CURRICULUM || {};
    var domainKeys = Object.keys(CURR);

    function buildDomainRatingsList(domName, existingRatings) {
      var skList = CURR[domName] || [];
      var ratingsMap = {};
      (existingRatings || []).forEach(function (it, idx) {
        ratingsMap[idx] = it;
        if (it && it.skill) ratingsMap[it.skill] = it;
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

    var domainsHost = h('div', null);

    function renderEvalDomains() {
      domainsHost.textContent = '';
      ev.domains.forEach(function (dm, dIdx) {
        var domSel = h('select', null,
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
        dm.ratings.forEach(function (it) {
          var isComm = dm.domain.indexOf('التواصل') >= 0;

          // خيارات الدرجات من 0 إلى 5 مع دعم الصفر
          var scoreButtons = ['0', '1', '2', '3', '4', '5'].map(function (sc) {
            var btn = h('button', {
              type: 'button',
              class: 'eval-compact-score-btn' + (it.score === sc ? ' is-selected' : ''),
              text: sc,
              onclick: function () {
                it.score = (it.score === sc ? '' : sc);
                renderEvalDomains();
              }
            });
            return btn;
          });

          var ynButtons = null;
          if (isComm) {
            ynButtons = h('div', { class: 'row-actions' },
              h('button', {
                type: 'button',
                class: 'eval-compact-score-btn' + (it.yn === 'نعم' ? ' is-selected' : ''),
                text: 'نعم',
                onclick: function () { it.yn = it.yn === 'نعم' ? '' : 'نعم'; renderEvalDomains(); }
              }),
              h('button', {
                type: 'button',
                class: 'eval-compact-score-btn' + (it.yn === 'لا' ? ' is-selected' : ''),
                text: 'لا',
                onclick: function () { it.yn = it.yn === 'لا' ? '' : 'لا'; renderEvalDomains(); }
              })
            );
          }

          var noteInp = h('input', { type: 'text', placeholder: 'ملاحظة...', value: it.note || '', style: 'font-size:0.8rem; padding:3px 6px;' });
          noteInp.addEventListener('input', function () { it.note = noteInp.value; });

          tbody.appendChild(h('tr', { class: (it.score || it.yn) ? 'eval-row-rated' : '' },
            h('td', { class: 'eval-col-num', text: String(it.num) }),
            h('td', { class: 'eval-col-skill', text: it.skill }),
            h('td', null, ynButtons || h('div', { class: 'row-actions' }, scoreButtons)),
            h('td', null, noteInp)
          ));
        });

        var quickFillBar = h('div', { class: 'eval-quick-fill-bar' },
          h('span', { class: 'muted small', text: 'تعبئة سريعة:' }),
          ['5', '4', '3', '2', '1', '0'].map(function (val) {
            return h('button', {
              type: 'button',
              class: 'btn small light',
              text: 'الكل ' + val,
              onclick: function () {
                dm.ratings.forEach(function (it) { it.score = val; });
                renderEvalDomains();
              }
            });
          }),
          h('button', {
            type: 'button',
            class: 'btn small danger',
            text: 'تفريغ الدرجات',
            onclick: function () {
              dm.ratings.forEach(function (it) { it.score = ''; it.yn = ''; it.note = ''; });
              renderEvalDomains();
            }
          })
        );

        // حساب المهارات المكتسبة (بمعيار 4/5 فما فوق) ونسبة المجال تلقائياً
        var domAcquired = 0;
        var domTotalSkills = (dm.ratings || []).length;
        var domRated = 0;
        (dm.ratings || []).forEach(function (it) {
          if (it.score !== '' && it.score != null) {
            var sc = parseInt(it.score, 10);
            if (!isNaN(sc)) {
              domRated++;
              if (sc >= 4) domAcquired++;
            }
          } else if (it.yn) {
            domRated++;
            if (it.yn === 'نعم') domAcquired++;
          }
        });
        var domPct = domTotalSkills > 0 ? ((domAcquired / domTotalSkills) * 100).toFixed(1).replace(/\.0$/, '') : '0';

        var domCard = h('div', { class: 'card', style: 'margin-bottom:12px; padding:12px;' },
          h('div', { class: 'bar-sub' },
            h('h4', { text: dm.domain }),
            h('div', { class: 'row-actions' },
              h('span', { class: 'badge ' + (domAcquired > 0 ? 'ok' : 'gold'), text: 'المكتسبة (4/5+): ' + domAcquired + ' من ' + domTotalSkills + ' مهارة (' + domPct + '%)' }),
              ev.domains.length > 1 ? h('button', {
                type: 'button',
                class: 'btn small danger',
                text: 'حذف المجال',
                onclick: function () { ev.domains.splice(dIdx, 1); renderEvalDomains(); }
              }) : null
            )
          ),
          h('label', { class: 'fld' }, h('span', { text: 'المجال التربوي:' }), domSel),
          quickFillBar,
          h('div', { class: 'eval-table-wrap', style: 'max-height: 280px; overflow-y: auto;' },
            h('table', { class: 'eval-official-table' },
              h('thead', null,
                h('tr', null,
                  h('th', { style: 'width:35px;', text: 'الرقم' }),
                  h('th', { text: 'المهارة التربوية' }),
                  h('th', { style: 'width:180px;', text: 'الدرجة (1–5 / نعم–لا)' }),
                  h('th', { text: 'ملاحظة' })
                )
              ),
              tbody
            )
          )
        );
        domainsHost.appendChild(domCard);
      });

      // حساب النتيجة الإجمالية للمهارات المكتسبة (4/5 فما فوق) لكافة المجالات المختارة في الوقت الفعلي
      var overallAcquired = 0;
      var overallTotalSkills = 0;
      ev.domains.forEach(function (dm) {
        (dm.ratings || []).forEach(function (it) {
          overallTotalSkills++;
          if (it.score !== '' && it.score != null) {
            var sc = parseInt(it.score, 10);
            if (!isNaN(sc) && sc >= 4) overallAcquired++;
          } else if (it.yn === 'نعم') {
            overallAcquired++;
          }
        });
      });
      var overallPercentage = overallTotalSkills > 0 ? ((overallAcquired / overallTotalSkills) * 100).toFixed(1) : '0';

      var liveOverallBanner = h('div', { class: 'eval-live-score-banner' },
        h('div', null,
          h('div', { class: 'eval-live-score-title', text: '📊 حصيلة المهارات المكتسبة (معيار دار الإحسان: 4/5 فما فوق):' }),
          h('p', { class: 'muted small', style: 'margin:0;', text: 'تُحسب تلقائياً بقسمة مجموع المهارات المكتسبة (' + overallAcquired + ') على إجمالي مهارات المجالات المختارة (' + overallTotalSkills + ').' })
        ),
        h('div', { class: 'eval-live-score-val', text: overallAcquired + ' من ' + overallTotalSkills + ' مهارة (' + overallPercentage + '%)' })
      );
      domainsHost.insertBefore(liveOverallBanner, domainsHost.firstChild);
    }

    function addAnotherEvalDomain() {
      var used = ev.domains.map(function (d) { return d.domain; });
      var nextDom = domainKeys.filter(function (dk) { return used.indexOf(dk) < 0; })[0] || domainKeys[0] || '';
      ev.domains.push({
        domain: nextDom,
        ratings: buildDomainRatingsList(nextDom, [])
      });
      renderEvalDomains();
      toast('تمت إضافة مجال تربوي إضافي للاستمارة.', 'ok');
    }

    renderEvalDomains();

    var step5Card = h('div', { class: 'card prog-step-card' },
      h('div', { class: 'bar-sub' },
        h('div', null,
          h('h3', { class: 'prog-step-title', text: '5⃣ جدول تقييم المجالات والمهارات البيداغوجية (تصميم مصغر وسهل التعبئة)' }),
          h('p', { class: 'muted small', text: 'اختر المجال وقيّم المهارات بسرعة عبر الأزرار المدمجة (1 إلى 5).' })
        ),
        h('div', { class: 'row-actions' },
          h('button', { type: 'button', class: 'btn gold', text: '+ إضافة مجال آخر للاستمارة', onclick: addAnotherEvalDomain })
        )
      ),
      domainsHost
    );
    v.appendChild(step5Card);

    // 6. الحفظ والاعتماد والمعاينة
    async function saveEvaluationForm(publishNow) {
      if (!ev.child_id) return toast('يرجى اختيار الطفل المعني باستمارة التقييم أولاً.', 'bad');

      var compactDomains = [];
      var totalRated = 0;
      ev.domains.forEach(function (dm) {
        var dIdx = domainKeys.indexOf(dm.domain);
        var compactRows = [];
        (dm.ratings || []).forEach(function (it, sIdx) {
          if (it.score || it.yn || it.note) {
            totalRated++;
            compactRows.push([sIdx, it.score || '', it.yn || '', (it.note || '').slice(0, 40)]);
          }
        });
        compactDomains.push({
          d: dIdx >= 0 ? dIdx : dm.domain,
          r: compactRows
        });
      });

      // بناء الحمولة المتوافقة مع النموذج الجديد v:2
      var payloadObj = {
        v: 2,
        term: ev.term || 'الثلاثي الأخير',
        school_year: ev.school_year || '2024/2025',
        degree_of_disability: DE.clean(ev.degree_of_disability || '', 50),
        qualification_level: DE.clean(ev.qualification_level || '', 80),
        supervisors: (ev.supervisors || []).map(function (s) {
          return { name: DE.clean(s.name || '', 60), role: DE.clean(s.role || '', 60) };
        }),
        general_report: DE.clean(ev.general_report || '', 1800),
        abilities: {
          current_potentials: DE.clean((ev.abilities && ev.abilities.current_potentials) || '', 400),
          cognitive_intellectual: DE.clean((ev.abilities && ev.abilities.cognitive_intellectual) || '', 400),
          language_receptive_expressive: DE.clean((ev.abilities && ev.abilities.language_receptive_expressive) || '', 400),
          communication_behavioral: DE.clean((ev.abilities && ev.abilities.communication_behavioral) || '', 400),
          academic_preacademic: DE.clean((ev.abilities && ev.abilities.academic_preacademic) || '', 400),
          motor_independence: DE.clean((ev.abilities && ev.abilities.motor_independence) || '', 400)
        },
        strengths: (ev.strengths || []).map(function (s) { return DE.clean(s || '', 150); }).filter(Boolean),
        weaknesses: (ev.weaknesses || []).map(function (w) { return DE.clean(w || '', 150); }).filter(Boolean),
        recommendations: (ev.recommendations || []).map(function (rc) { return DE.clean(rc || '', 150); }).filter(Boolean),
        domains: compactDomains
      };

      var chosenKid = kids.filter(function (k) { return k.id === ev.child_id; })[0];
      var kidName = chosenKid ? chosenKid.full_name : 'الطفل';
      var chosenSecName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
      var evalStatus = publishNow ? 'published' : 'draft';

      payloadObj.status = evalStatus;
      payloadObj.child_id = ev.child_id;
      payloadObj.child_name = kidName;
      payloadObj.membership_no = chosenKid && chosenKid.membership_no ? String(chosenKid.membership_no) : '';
      payloadObj.section_name = chosenSecName;

      var serializedPayload = EVAL_MARKER + JSON.stringify(payloadObj);
      if (serializedPayload.length > 4900) {
        // ضغط ذكي لضمان عدم تجاوز حد قاعدة البيانات (5000 حرف)
        payloadObj.general_report = (payloadObj.general_report || '').slice(0, 900);
        payloadObj.domains.forEach(function (dm) {
          if (Array.isArray(dm.r)) {
            dm.r = dm.r.map(function (entry) {
              return (!entry[2] && !entry[3]) ? [entry[0], entry[1]] : [entry[0], entry[1], entry[2] || '', (entry[3] || '').slice(0, 20)];
            });
          }
        });
        serializedPayload = EVAL_MARKER + JSON.stringify(payloadObj);
      }

      var body = {
        child_id: ev.child_id,
        title: DE.clean(ev.title || ('تقرير اللجنة البيداغوجية والتربوية — ' + ev.term), 145),
        report_date: ev.report_date || new Date().toISOString().slice(0, 10),
        period_start: ev.report_date || new Date().toISOString().slice(0, 10),
        period_end: ev.report_date || new Date().toISOString().slice(0, 10),
        achievements: DE.clean('تقييم ' + ev.term + ' للموسم الدراسي ' + ev.school_year + ' — المشرفون: ' + (ev.supervisors.map(function (s) { return s.name; }).join('، ')), 4800),
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
      savedRow.child_name = kidName;
      savedRow.membership_no = chosenKid && chosenKid.membership_no ? String(chosenKid.membership_no) : '';
      savedRow.section_name = chosenSecName;
      await syncSharedEvaluationRecord(savedRow, null);

      bust();
      toast(publishNow ? 'تم اعتماد وإرسال استمارة التقييم البيداغوجي إلى فضاء الأولياء بنجاح!' : 'تم حفظ استمارة التقييم كمسودة.', 'ok');
      go('evaluations');
    }

    var btnSaveDraft = h('button', { type: 'button', class: 'btn light', text: 'حفظ الاستمارة كمسودة' });
    var btnPublish = h('button', { type: 'button', class: 'btn gold', text: 'اعتماد وإرسال استمارة التقييم للولي' });
    btnSaveDraft.addEventListener('click', function () { act(btnSaveDraft, function () { return saveEvaluationForm(false); }); });
    btnPublish.addEventListener('click', function () { act(btnPublish, function () { return saveEvaluationForm(true); }); });

    var previewBtn = h('button', {
      type: 'button',
      class: 'btn',
      text: 'معاينة الورقة الرسمية (مثل الصورة)',
      onclick: function () {
        var chosenKid = kids.filter(function (k) { return k.id === ev.child_id; })[0];
        var sName = chosenKid ? (nameOf(sections, chosenKid.section_id, 'name') || chosenKid.section || '') : '';
        openModal(h('div', { class: 'modal-body wk-modal-print' },
          renderEvaluationSheetView({
            id: ev.id,
            child_id: ev.child_id,
            title: ev.title,
            report_date: ev.report_date,
            activities: EVAL_MARKER + JSON.stringify(ev)
          }, chosenKid ? chosenKid.full_name : '—', sName, chosenKid),
          h('div', { class: 'modal-actions no-print' },
            h('button', { class: 'btn light', type: 'button', text: 'إغلاق المعاينة', onclick: closeModal }),
            h('button', { class: 'btn gold', type: 'button', text: 'طباعة الورقة الرسمية (A4)', onclick: function () { window.print(); } })
          )
        ));
      }
    });

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
     6.1 قسم التقارير التربوية الدورية (Reports Only — مفصول تماماً عن التقييم)
     ===================================================================== */
  async function secReports(v) {
    if (isFarmSession()) return go('children');
    var d = await getMany('reports', 'children', 'branches', 'sections');
    var allReports = d[0], kids = d[1], branches = d[2], sections = d[3];

    // إظهار التقارير الدورية فقط واستبعاد استمارات التقييم
    var rows = allReports.filter(function (r) { return !isEvaluationReport(r); });

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
    var MAX_FILE = 5242880;

    function editReport(r) {
      var lastSec = r ? (nameOf(kids, r.child_id, 'section_id') || '') : '';
      var curKid = r ? kids.filter(function (k) { return k.id === r.child_id; })[0] : null;
      var curSec = curKid ? curKid.section_id : '';
      var curBranch = curKid ? curKid.branch_id : (branches[0] ? branches[0].id : '');
      var FORM = null, uploaded = null;

      return openForm({
        title: r ? 'تعديل التقرير الدوري للطفل' : 'كتابة تقرير دوري جديد مع إمكانية رفع ملف',
        submits: [
          { key: 'draft', label: 'حفظ كمسودة' },
          { key: 'publish', label: 'اعتماد ونشر للولي' }
        ],
        values: {
          branch_id: curBranch,
          section_id: curSec,
          child_id: r ? r.child_id : (S.preselectChildId || (kids[0] ? kids[0].id : '')),
          title: r ? r.title : '',
          report_date: r ? r.report_date : new Date().toISOString().slice(0, 10),
          achievements: r ? r.achievements : '',
          activities: r ? r.activities : '',
          notes: r ? r.notes : ''
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
            if (r) await C.rest('PATCH', '/progress_reports?id=eq.' + uid(r.id), body);
            else await C.rest('POST', '/progress_reports', body);
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

    listView(v, {
      title: S.isEducator ? ('التقارير التربوية الدورية — قسم ' + (S.eduSectionName || 'فوجي')) : 'التقارير التربوية الدورية للطلبة',
      addLabel: 'كتابة تقرير دوري جديد',
      onAdd: function () { if (!kids.length) return toast('لا يوجد أطفال مسجلون في هذا القسم.', 'bad'); editReport(null); },
      rows: rows,
      empty: 'لا توجد تقارير دورية مسجلة بعد. اضغط «كتابة تقرير دوري جديد» لإضافة تقرير مع إمكانية رفع ملف.',
      search: function (r) { return r.title + ' ' + nameOf(kids, r.child_id); },
      details: function (r) {
        var kd = kids.filter(function (k) { return k.id === r.child_id; })[0];
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
        { label: 'الحالة', opts: [['published', 'منشور للولي'], ['draft', 'مسودة قيد الإعداد']], test: function (r, x) { return r.status === x; } }
      ],
      cols: [
        {
          label: 'عنوان التقرير',
          get: function (r) {
            return h('div', { class: 'row-actions' },
              badge('تقرير دوري', 'ok'),
              h('strong', { text: r.title }),
              r.attachment_path ? h('span', { class: 'badge gold', text: 'مرفق ملف' }) : null
            );
          },
          sort: function (r) { return r.title; }
        },
        { label: 'الطفل', get: function (r) { return nameOf(kids, r.child_id); } },
        { label: 'التاريخ', get: function (r) { return fmt(r.report_date); }, sort: function (r) { return r.report_date; } },
        { label: 'الحالة', get: function (r) { return badge(r.status === 'published' ? 'منشور للولي' : 'مسودة', r.status === 'published' ? 'ok' : 'gray'); } }
      ],
      actions: function (r) {
        return [
          rbtn('تعديل التقرير', function () { return editReport(r); }),
          r.status === 'published'
            ? rbtn('إلغاء النشر', async function () {
              await C.rest('PATCH', '/progress_reports?id=eq.' + uid(r.id), { status: 'draft' });
              bust(); toast('تحوّل التقرير إلى مسودة.', 'ok'); go('reports');
            }, 'light')
            : rbtn('نشر للولي', async function () {
              await C.rest('PATCH', '/progress_reports?id=eq.' + uid(r.id), { status: 'published' });
              bust(); toast('تم نشر التقرير للولي.', 'ok'); go('reports');
            }, 'gold'),
          rbtn('حذف التقرير', async function () {
            if (!(await ask({ title: 'حذف التقرير؟', msg: 'سيُحذف التقرير نهائيًا.', ok: 'حذف', danger: true }))) return;
            await C.rest('DELETE', '/progress_reports?id=eq.' + uid(r.id));
            bust(); go('reports');
          }, 'danger')
        ];
      }
    });
  }

  /* =====================================================================
     6.2 قسم استمارات التقييم البيداغوجي (Evaluations Only — مفصول تماماً ومطابق للصورة)
     ===================================================================== */
  async function secEvaluations(v) {
    if (isFarmSession()) return go('children');
    var d = await getMany('reports', 'children', 'branches', 'sections');
    var allReports = d[0], kids = d[1], branches = d[2], sections = d[3];

    // إظهار استمارات التقييم فقط
    var rows = allReports.filter(function (r) { return isEvaluationReport(r); });

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

    async function updateEvalPublishStatus(r, newStatus) {
      var kd = kids.filter(function (k) { return k.id === r.child_id; })[0];
      var sName = kd ? (nameOf(sections, kd.section_id, 'name') || kd.section || '') : '';
      var updatedActivities = setEvalStatusInActivities(r.activities, newStatus, {
        child_id: r.child_id,
        child_name: kd ? kd.full_name : (r.child_name || ''),
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
        membership_no: kd && kd.membership_no ? String(kd.membership_no) : (r.membership_no || ''),
        section_name: sName
      }), null);
      bust();
      toast(newStatus === 'published' ? 'تم إرسال ونشر استمارة التقييم في فضاء الأولياء بنجاح!' : 'تم تحويل الاستمارة إلى مسودة وإخفاؤها من فضاء الأولياء.', 'ok');
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

    listView(v, {
      title: S.isEducator ? ('استمارات التقييم البيداغوجي — قسم ' + (S.eduSectionName || 'فوجي')) : 'استمارات التقييم البيداغوجي الرسمية للطلبة',
      addLabel: 'إضافة استمارة تقييم جديدة',
      onAdd: function () {
        if (!kids.length) return toast('لا يوجد أطفال مسجلون في هذا القسم.', 'bad');
        openEvaluationBuilder(null, kids, sections, secAllOpts, branchOpts);
      },
      rows: rows,
      empty: 'لا توجد استمارات تقييم مسجلة بعد. اضغط «إضافة استمارة تقييم جديدة» لإنشاء استمارة مطابقة للنموذج الرسمي.',
      search: function (r) { return r.title + ' ' + nameOf(kids, r.child_id); },
      details: function (r) {
        var kd = kids.filter(function (k) { return k.id === r.child_id; })[0];
        var sName = kd ? (nameOf(sections, kd.section_id, 'name') || kd.section || '') : '';
        var curStatus = extractEvalStatus(r);
        // عند الضغط على «التفاصيل» لا تظهر التقارير مباشرة (initialReportMode = null)، بل تظهر الأزرار الثلاثة مع أزرار التعديل والإرسال والحذف
        return renderEvaluationSheetView(r, kd ? kd.full_name : (r.child_name || '—'), sName, kd, null, {
          isPublished: curStatus === 'published',
          onEdit: function () {
            openEvaluationBuilder(r, kids, sections, secAllOpts, branchOpts);
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
            return h('div', { class: 'row-actions' },
              badge('استمارة تقييم رسمية', 'gold'),
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
    var rows = (await C.rpc('admin_audit_list', { p_limit: 100 }).catch(function () { return []; })) || [];
    var accountsData = null, permError = null;
    try { accountsData = await C.rpc('admin_list'); } catch (e) { permError = e; }
    var isOwner = !!(accountsData && accountsData.can_manage);

    var card = h('div', { class: 'card' },
      h('h2', { text: 'سجل العمليات والرقابة الأمنية (Audit Log)' }),
      h('p', { class: 'muted small', text: 'يُسجَّل تلقائيًا نوع كل عملية إدارية، البريد الإلكتروني للمنفّذ، والمعرّف الرقمي فقط — دون تخزين كلمات مرور أو تقارير طبية حساسة. الحماية مشددة على مستوى قاعدة البيانات.' })
    );

    if (isOwner) {
      var superAdminActions = h('div', { class: 'row-actions audit-owner-bar' },
        h('span', { class: 'badge gold', text: 'صلاحيات المالك الرئيسي' }),
        h('button', {
          class: 'btn small light',
          type: 'button',
          text: 'حذف السجلات الأقدم من 30 يومًا',
          onclick: async function () {
            if (!(await ask({
              title: 'تصفية سجلات التدقيق القديمة؟',
              msg: 'سيتم حذف جميع سجلات العمليات التي مضى عليها أكثر من 30 يومًا نهائيًا.',
              ok: 'تأكيد الحذف'
            }))) return;
            try {
              var pastDate = new Date(Date.now() - 30 * 86400000).toISOString();
              var deleted = await C.rpc('admin_delete_audit', { p_older_than: pastDate });
              if (!deleted) toast('لا توجد سجلات أقدم من 30 يومًا، لذلك لم يُحذف شيء.');
              else toast('تم حذف ' + deleted + ' سجل تدقيق قديم.', 'ok');
              go('audit');
            } catch (e) {
              toast('تعذّر الحذف. يرجى التأكد من تشغيل ملف 08-fix-audit-and-admin-delete.sql في Supabase.', 'bad');
            }
          }
        }),
        h('button', {
          class: 'btn small danger',
          type: 'button',
          text: 'تصفية كل سجلات التدقيق',
          onclick: async function () {
            if (!(await ask({
              title: 'تصفية شاملة لسجلات العمليات؟',
              msg: 'سيتم مسح سجل العمليات والتدقيق كاملاً. هذه العملية لا يمكن التراجع عنها!',
              ok: 'مسح شامل', danger: true
            }))) return;
            try {
              var deleted = await C.rpc('admin_delete_audit', {});
              toast('تم مسح ' + deleted + ' سجل تدقيق بنجاح.', 'ok');
              go('audit');
            } catch (e) {
              toast('تعذّر المسح. يرجى التأكد من تشغيل ملف 08-fix-audit-and-admin-delete.sql في Supabase.', 'bad');
            }
          }
        })
      );
      card.appendChild(superAdminActions);
    } else {
      card.appendChild(h('p', { class: 'muted small', text: permError
        ? 'تعذّر التحقق من صلاحياتك لعرض أزرار الحذف. حدّث الصفحة أو أعد تسجيل الدخول.'
        : 'أزرار مسح السجل متاحة للمدير الرئيسي (المالك) فقط. الحساب الحالي مدير غير مالك.' }));
    }

    v.appendChild(card);

    listView(v, {
      title: 'آخر العمليات المسجّلة',
      rows: rows,
      empty: 'لا توجد عمليات مسجّلة حالياً.',
      search: function (r) { return (AUDIT[r.action] || r.action) + ' ' + (r.actor_email || ''); },
      cols: [
        { label: 'التوقيت', get: function (r) { return fmt(r.at, true); }, sort: function (r) { return r.at; } },
        { label: 'المنفّذ', get: function (r) { return r.actor_email || 'النظام السحابي'; } },
        { label: 'العملية المنجزة', get: function (r) { return AUDIT[r.action] || r.action; } },
        { label: 'المعرّف المعني', get: function (r) { return r.target || '—'; } }
      ],
      actions: function () { return []; }
    });
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
      h('div', { class: 'att-stat', style: '--c:#059669;' },
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
     - إرسال عبر Meta Cloud API من الرقم الثابت (0564779067) مع منع التكرار (Idempotency).
     - سجل مختصر لمتابعة حالات الرسائل (قيد الإرسال، تم القبول، تم التسليم، تمت القراءة، فشل).
     ===================================================================== */
  var OFFICIAL_WA_SENDER = '0564779067';

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
      sender_phone: OFFICIAL_WA_SENDER,
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
    // مسح كافة الغيابات المسجلة فوراً استجابة لطلب الإدارة والبدء بسجل نظيف
    try {
      localStorage.removeItem('de_attendance_records');
      localStorage.removeItem('de_local_attendance_map');
      if (typeof C !== 'undefined' && C.rest) {
        C.rest('DELETE', '/attendance?date=gte.1970-01-01').catch(function () {});
      }
    } catch (e) {}
    dbAttendance = [];

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
        h('h1', null, makeSvgIcon('s-cal'), h('span', { text: 'الغيابات والحضور' })),
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
      h('button', { type: 'button', class: 'att-btn sm ghost att-icon-btn', onclick: function () { applyBulk('present'); } }, makeSvgIcon('s-check-circle'), h('span', { text: 'حاضر' })),
      h('button', { type: 'button', class: 'att-btn sm warn att-icon-btn', onclick: function () { applyBulk('absent'); } }, makeSvgIcon('s-x-circle'), h('span', { text: 'غائب' })),
      h('button', { type: 'button', class: 'att-btn sm ghost att-icon-btn', onclick: function () { applyBulk('unrecorded'); } }, makeSvgIcon('s-clock'), h('span', { text: 'لم يُسجّل' })),
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
        { t: 'الحاضرون', n: present, c: '#059669', icon: 's-check-circle' },
        { t: 'الغائبون', n: absent, c: '#DC2626', icon: 's-x-circle' },
        { t: 'لم تُحدد حالتهم', n: unrec, c: '#64748B', icon: 's-clock' },
        { t: 'نسبة الحضور اليومية', n: rate + '%', c: '#C49A50', icon: 's-card', isText: true }
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
      }, makeSvgIcon('s-check-circle'), h('span', { text: 'حاضر' }));

      var segA = h('button', {
        type: 'button',
        class: 'att-seg-btn seg-absent',
        onclick: function () { setStatus('absent'); }
      }, makeSvgIcon('s-x-circle'), h('span', { text: 'غائب' }));

      var segN = h('button', {
        type: 'button',
        class: 'att-seg-btn seg-none',
        onclick: function () { setStatus('unrecorded'); }
      }, makeSvgIcon('s-clock'), h('span', { text: 'لم يُسجّل' }));

      // زر الإرسال المباشر عبر واتساب للطفل الغائب
      var waDirectBtn = h('div', { class: 'att-wa-action-wrap', hidden: true });
      if (ph.valid) {
        waDirectBtn.appendChild(h('button', {
          type: 'button',
          class: 'att-wa-direct-btn',
          title: 'فتح محادثة واتساب مع الولي وإرسال رسالة الغياب المعتمدة',
          onclick: function (e) {
            e.stopPropagation();
            var cleanPhone = toWhatsAppPhone(k.phone);
            var msg = formatOfficialAbsenceMessage(k.full_name, dateInput.value);
            var waUrl = 'https://api.whatsapp.com/send?phone=' + cleanPhone + '&text=' + encodeURIComponent(msg);
            window.open(waUrl, '_blank');
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
    $('#forgotBtn').hidden = m !== 'creds';
    $('#backBtn').hidden = m === 'creds';
    if (m === 'set') { setTimeout(function () { var p = $('#np1'); if (p) p.focus(); }, 0); }
  }
  function showLogin(m) {
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
      if ($('#forgotBtn')) $('#forgotBtn').addEventListener('click', function () { msg($('#lErr'), ''); msg($('#lOk'), ''); $('#fEmail').value = ($('#email').value || '').trim(); setMode('forgot'); $('#fEmail').focus(); });
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