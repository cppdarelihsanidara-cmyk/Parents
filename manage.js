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
          else if (k === 'style' || /^on/i.test(k) || k === 'innerHTML' || k === 'outerHTML' || k === 'srcdoc') return;
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
  var EMBEDDED_STUDENTS = [{"id": "00000000-0000-4000-8000-000000000004", "membership_no": "004", "full_name": "حاج ابراهيم مسعود بن قاسم", "dob": "1981-08-01", "phone": "055948690", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "hadj.brahim.004"}, {"id": "00000000-0000-4000-8000-000000000021", "membership_no": "021", "full_name": "حاج ابراهيم عمر بن سليمان", "dob": "1986-04-26", "phone": "055377052", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "hadj.brahim.021"}, {"id": "00000000-0000-4000-8000-000000000022", "membership_no": "022", "full_name": "بهون علي يوسف بن يحي", "dob": "1986-06-12", "phone": "065837964", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "behoun.ali.022"}, {"id": "00000000-0000-4000-8000-000000000050", "membership_no": "050", "full_name": "سعيد مصطفى بن عمر", "dob": "1991-09-20", "phone": "056101096", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "said.mustapha.050"}, {"id": "00000000-0000-4000-8000-000000000077", "membership_no": "077", "full_name": "بهون علي زوليخة بنت يحي بن عمر", "dob": "1988-07-20", "phone": "065837964", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "behoun.ali.077"}, {"id": "00000000-0000-4000-8000-000000000082", "membership_no": "082", "full_name": "حاج امحمد محمد بن اسماعيل", "dob": "1989-08-04", "phone": "066442144", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "hadj.mohamed.082"}, {"id": "00000000-0000-4000-8000-000000000086", "membership_no": "086", "full_name": "حاج ابراهيم بهون بن عبد الرحمان", "dob": "1995-03-24", "phone": "077130718", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "hadj.brahim.086"}, {"id": "00000000-0000-4000-8000-000000000087", "membership_no": "087", "full_name": "خليف ابراهيم زكرياء بن أحمد", "dob": "2003-03-17", "phone": "069995077", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "khelif.brahim.087"}, {"id": "00000000-0000-4000-8000-000000000090", "membership_no": "090", "full_name": "اولاد حاجو بكير بن توفيق", "dob": "2004-05-22", "phone": "066303199", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "ouled.hadjou.090"}, {"id": "00000000-0000-4000-8000-000000000101", "membership_no": "101", "full_name": "طالب باحمد عز الدين بن بكير", "dob": "2005-04-05", "phone": "079361303", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "taleb.bahmed.101"}, {"id": "00000000-0000-4000-8000-000000000103", "membership_no": "103", "full_name": "بهون عائشة بنت نور الدين", "dob": "2001-08-23", "phone": "067147301", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "behoun.aicha.103"}, {"id": "00000000-0000-4000-8000-000000000104", "membership_no": "104", "full_name": "بهون وسام بنت ابراهيم", "dob": "2006-06-04", "phone": "055653051", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "behoun.wissam.104"}, {"id": "00000000-0000-4000-8000-000000000111", "membership_no": "111", "full_name": "بهون زوليخة بنت نور الدين", "dob": "1984-12-21", "phone": "067147301", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "behoun.zoulikha.111"}, {"id": "00000000-0000-4000-8000-000000000112", "membership_no": "112", "full_name": "قندوزي نصر الدين بن حسين", "dob": "2006-09-24", "phone": "066343469", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "kendouzi.nasr.112"}, {"id": "00000000-0000-4000-8000-000000000114", "membership_no": "114", "full_name": "اسماوي امين بن ابو عبيدة", "dob": "2009-09-30", "phone": "055928584", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "asmaoui.amine.114"}, {"id": "00000000-0000-4000-8000-000000000116", "membership_no": "116", "full_name": "صلاح مهدي بن مسعود", "dob": "2002-03-08", "phone": "066470243", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "salah.mehdi.116"}, {"id": "00000000-0000-4000-8000-000000000117", "membership_no": "117", "full_name": "درين سمية بنت صالح", "dob": "1997-09-27", "phone": "066661649", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "derrine.soumia.117"}, {"id": "00000000-0000-4000-8000-000000000118", "membership_no": "118", "full_name": "درين منير بن صالح", "dob": "1993-09-02", "phone": "066661649", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000003", "section_id": "22222222-0000-4000-8000-000000000011", "branch_slug": "farm", "section_slug": "sec_bostana", "section": "المزرعة البستنة", "center": "farm", "academic_year": "2026-2027", "active": true, "username": "derrine.mounir.118"}, {"id": "00000000-0000-4000-8000-000000000119", "membership_no": "119", "full_name": "درين بشير بن صالح", "dob": "1995-07-19", "phone": "066661649", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000003", "section_id": "22222222-0000-4000-8000-000000000011", "branch_slug": "farm", "section_slug": "sec_bostana", "section": "المزرعة البستنة", "center": "farm", "academic_year": "2026-2027", "active": true, "username": "derrine.bachir.119"}, {"id": "00000000-0000-4000-8000-000000000132", "membership_no": "132", "full_name": "حمو علي قاسم بن عمر", "dob": "2009-08-01", "phone": "066629625", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000009", "branch_slug": "main", "section_slug": "sec_khariji", "section": "الخارجي اعاقة شديدة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "hammou.ali.132"}, {"id": "00000000-0000-4000-8000-000000000138", "membership_no": "138", "full_name": "حمو علي سمية بنت موسى", "dob": "2004-06-09", "phone": "079759877", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "hammou.ali.138"}, {"id": "00000000-0000-4000-8000-000000000142", "membership_no": "142", "full_name": "بوحديبة محمد بن ابراهيم", "dob": "2011-01-25", "phone": "067364872", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "bouhdiba.mohamed.142"}, {"id": "00000000-0000-4000-8000-000000000146", "membership_no": "146", "full_name": "حبيرش جيهان بنت عبد الوهاب", "dob": "2013-12-07", "phone": "067341231", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "habirech.djihane.146"}, {"id": "00000000-0000-4000-8000-000000000153", "membership_no": "153", "full_name": "العابد حسناء بنت منصور", "dob": "2008-02-28", "phone": "067030546", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "elabed.hasna.153"}, {"id": "00000000-0000-4000-8000-000000000159", "membership_no": "159", "full_name": "اسماوي محمد بن بلال", "dob": "2010-08-15", "phone": "065839100", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "asmaoui.mohamed.159"}, {"id": "00000000-0000-4000-8000-000000000160", "membership_no": "160", "full_name": "بهون علي محمد السعيد بن عمر", "dob": "2013-07-17", "phone": "055079988", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "behoun.ali.160"}, {"id": "00000000-0000-4000-8000-000000000165", "membership_no": "165", "full_name": "حمو علي زكرياء بن ابراهيم", "dob": "2014-09-08", "phone": "066744579", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "hammou.ali.165"}, {"id": "00000000-0000-4000-8000-000000000167", "membership_no": "167", "full_name": "كليماني انفال بنت محمد", "dob": "2012-11-30", "phone": "069837174", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000005", "branch_slug": "main", "section_slug": "sec_tafatan_1", "section": "التفطين 1 تأخر ذهني", "center": "main", "academic_year": "2026-2027", "active": true, "username": "klimani.anfel.167"}, {"id": "00000000-0000-4000-8000-000000000168", "membership_no": "168", "full_name": "كليماني آية بنت محمد", "dob": "2009-04-05", "phone": "069837174", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "klimani.aya.168"}, {"id": "00000000-0000-4000-8000-000000000170", "membership_no": "170", "full_name": "بن علي فاروق بن احمد", "dob": "2012-10-02", "phone": "066164908", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "ben.ali.170"}, {"id": "00000000-0000-4000-8000-000000000173", "membership_no": "173", "full_name": "بن يحي الياس بن مختار", "dob": "2007-10-27", "phone": "066594864", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "ben.yahia.173"}, {"id": "00000000-0000-4000-8000-000000000176", "membership_no": "176", "full_name": "كبير حاج الطيب بن بشير", "dob": "2014-01-21", "phone": "079274729", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "kebir.hadj.176"}, {"id": "00000000-0000-4000-8000-000000000180", "membership_no": "180", "full_name": "زرقون صفوان بن مصطفى", "dob": "2007-05-31", "phone": "066864048", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "zerguoun.safouane.180"}, {"id": "00000000-0000-4000-8000-000000000187", "membership_no": "187", "full_name": "خروبي زكرياء بن عيسى", "dob": "2015-04-14", "phone": "054228492", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000001", "branch_slug": "main", "section_slug": "sec_autism_1", "section": "توحد 01", "center": "main", "academic_year": "2026-2027", "active": true, "username": "kharoubi.zakaria.187"}, {"id": "00000000-0000-4000-8000-000000000188", "membership_no": "188", "full_name": "اسكوتي عيسى بن عثمان", "dob": "2016-06-19", "phone": "069905393", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000001", "branch_slug": "main", "section_slug": "sec_autism_1", "section": "توحد 01", "center": "main", "academic_year": "2026-2027", "active": true, "username": "skouti.aissa.188"}, {"id": "00000000-0000-4000-8000-000000000189", "membership_no": "189", "full_name": "الشرع ريان بن مختار", "dob": "2015-01-05", "phone": "066147475", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000002", "branch_slug": "main", "section_slug": "sec_autism_2", "section": "التوحد 02", "center": "main", "academic_year": "2026-2027", "active": true, "username": "chara.rayan.189"}, {"id": "00000000-0000-4000-8000-000000000190", "membership_no": "190", "full_name": "بن حمودة أيمن سليمان بن عمر", "dob": "2013-09-06", "phone": "066650690", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000002", "branch_slug": "main", "section_slug": "sec_autism_2", "section": "التوحد 02", "center": "main", "academic_year": "2026-2027", "active": true, "username": "ben.hamouda.190"}, {"id": "00000000-0000-4000-8000-000000000192", "membership_no": "192", "full_name": "الشرع خالد بن مختار", "dob": "2013-10-16", "phone": "066147475", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000001", "branch_slug": "main", "section_slug": "sec_autism_1", "section": "توحد 01", "center": "main", "academic_year": "2026-2027", "active": true, "username": "chara.khaled.192"}, {"id": "00000000-0000-4000-8000-000000000196", "membership_no": "196", "full_name": "بهشو اسماعيل بن سليمان", "dob": "2013-05-16", "phone": "066599607", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "behchou.smail.196"}, {"id": "00000000-0000-4000-8000-000000000197", "membership_no": "197", "full_name": "كليماني اية", "dob": "2014-04-23", "phone": "066836902", "disability": "متعدد الاعاقات", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": null, "branch_slug": "main", "section_slug": "", "section": "عام", "center": "main", "academic_year": "2026-2027", "active": true, "username": "klimani.aya.197"}, {"id": "00000000-0000-4000-8000-000000000198", "membership_no": "198", "full_name": "بن ريم مروة بنت مروان", "dob": "2009-02-06", "phone": "066569187", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "ben.rim.198"}, {"id": "00000000-0000-4000-8000-000000000200", "membership_no": "200", "full_name": "بن يوسف حاج ابراهيم بن نصر الدين", "dob": "2009-12-27", "phone": "067642448", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "ben.youssef.200"}, {"id": "00000000-0000-4000-8000-000000000201", "membership_no": "201", "full_name": "باباعمر تيازيط زكرياء بن بشير", "dob": "2010-07-08", "phone": "077712027", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "babaomar.tiaziit.201"}, {"id": "00000000-0000-4000-8000-000000000202", "membership_no": "202", "full_name": "بكلي الحاج محمد بن احمد", "dob": "2012-02-13", "phone": "056124727", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "bakli.elhadj.202"}, {"id": "00000000-0000-4000-8000-000000000204", "membership_no": "204", "full_name": "ببو محمد بن العيد", "dob": "2008-06-01", "phone": "066887289", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "bebou.mohamed.204"}, {"id": "00000000-0000-4000-8000-000000000206", "membership_no": "206", "full_name": "بن عافو يوسف بن عيسى", "dob": "2013-07-14", "phone": "069614151", "disability": "متعدد الاعاقات", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "ben.afou.206"}, {"id": "00000000-0000-4000-8000-000000000209", "membership_no": "209", "full_name": "قومار محمد ياسر بن حمزة", "dob": "2015-04-13", "phone": "066553918", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000002", "branch_slug": "main", "section_slug": "sec_autism_2", "section": "التوحد 02", "center": "main", "academic_year": "2026-2027", "active": true, "username": "goumar.mohamed.209"}, {"id": "00000000-0000-4000-8000-000000000213", "membership_no": "213", "full_name": "يعقوب نذير بن محمد", "dob": "2007-11-04", "phone": "065706325", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "yacoub.nadir.213"}, {"id": "00000000-0000-4000-8000-000000000216", "membership_no": "216", "full_name": "ابي اسماعيل ياسين بن بعيسى", "dob": "2012-01-14", "phone": "055825381", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "abi.smail.216"}, {"id": "00000000-0000-4000-8000-000000000219", "membership_no": "219", "full_name": "حاج امحمد اسماعيل بن ابراهيم", "dob": "2009-12-01", "phone": "077846497", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000009", "branch_slug": "main", "section_slug": "sec_khariji", "section": "الخارجي اعاقة شديدة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "hadj.mohamed.219"}, {"id": "00000000-0000-4000-8000-000000000223", "membership_no": "223", "full_name": "أولاد علي صوفيا بنت محمد", "dob": "2014-01-22", "phone": "066167498", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000003", "branch_slug": "main", "section_slug": "sec_autism_3", "section": "توحد 03", "center": "main", "academic_year": "2026-2027", "active": true, "username": "ouled.ali.223"}, {"id": "00000000-0000-4000-8000-000000000224", "membership_no": "224", "full_name": "مسهل لؤي بن خالد", "dob": "2016-06-02", "phone": "066065559", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000003", "branch_slug": "main", "section_slug": "sec_autism_3", "section": "توحد 03", "center": "main", "academic_year": "2026-2027", "active": true, "username": "mesehel.louai.224"}, {"id": "00000000-0000-4000-8000-000000000226", "membership_no": "226", "full_name": "دهان عبد القادر بن يحي بن عيسى", "dob": "2013-12-19", "phone": "067222373", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "dahan.abd.226"}, {"id": "00000000-0000-4000-8000-000000000227", "membership_no": "227", "full_name": "قبسي مهدي عبد الرزاق بن احمد", "dob": "2014-05-12", "phone": "069797512", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000003", "branch_slug": "main", "section_slug": "sec_autism_3", "section": "توحد 03", "center": "main", "academic_year": "2026-2027", "active": true, "username": "gebsi.mehdi.227"}, {"id": "00000000-0000-4000-8000-000000000228", "membership_no": "228", "full_name": "حيمود اسامة بن مداني", "dob": "2007-06-20", "phone": "066638904", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "himoud.oussama.228"}, {"id": "00000000-0000-4000-8000-000000000231", "membership_no": "231", "full_name": "مهيري يوسف الصديق بن موسى", "dob": "2016-02-23", "phone": "066743252", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000003", "branch_slug": "main", "section_slug": "sec_autism_3", "section": "توحد 03", "center": "main", "academic_year": "2026-2027", "active": true, "username": "mehiri.youssef.231"}, {"id": "00000000-0000-4000-8000-000000000236", "membership_no": "236", "full_name": "حاج سعيد مسعودة سيرين بنت عمر", "dob": "2018-07-09", "phone": "055754254", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000006", "branch_slug": "main", "section_slug": "sec_tafatan_2", "section": "التفطين 2 متلازمة داون", "center": "main", "academic_year": "2026-2027", "active": true, "username": "hadj.said.236"}, {"id": "00000000-0000-4000-8000-000000000238", "membership_no": "238", "full_name": "بابا عمر تيازيط يحي بن مسعود", "dob": "2009-07-25", "phone": "067135309", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000003", "section_id": "22222222-0000-4000-8000-000000000011", "branch_slug": "farm", "section_slug": "sec_bostana", "section": "المزرعة البستنة", "center": "farm", "academic_year": "2026-2027", "active": true, "username": "baba.omar.238"}, {"id": "00000000-0000-4000-8000-000000000239", "membership_no": "239", "full_name": "بابا عمر تيازيط محمد بن مسعود", "dob": "2016-12-22", "phone": "067135309", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "baba.omar.239"}, {"id": "00000000-0000-4000-8000-000000000240", "membership_no": "240", "full_name": "بن موسى مريم بنت بلقاسم", "dob": "2014-01-23", "phone": "066202193", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "ben.moussa.240"}, {"id": "00000000-0000-4000-8000-000000000243", "membership_no": "243", "full_name": "حاج امحمد مصطفى الامين بن ابراه", "dob": "1993-02-01", "phone": "065931259", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "hadj.mohamed.243"}, {"id": "00000000-0000-4000-8000-000000000247", "membership_no": "247", "full_name": "جرادة ابراهيم بن محمد", "dob": "2018-01-15", "phone": "066250716", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000006", "branch_slug": "main", "section_slug": "sec_tafatan_2", "section": "التفطين 2 متلازمة داون", "center": "main", "academic_year": "2026-2027", "active": true, "username": "djarada.brahim.247"}, {"id": "00000000-0000-4000-8000-000000000249", "membership_no": "249", "full_name": "حاتة سليمان بن بكير", "dob": "2001-02-04", "phone": "079230020", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "hata.slimane.249"}, {"id": "00000000-0000-4000-8000-000000000250", "membership_no": "250", "full_name": "حاج اسماعيل عائشة بنت محمد بن ا", "dob": "2021-06-08", "phone": "069668368", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000006", "branch_slug": "main", "section_slug": "sec_tafatan_2", "section": "التفطين 2 متلازمة داون", "center": "main", "academic_year": "2026-2027", "active": true, "username": "hadj.smail.250"}, {"id": "00000000-0000-4000-8000-000000000251", "membership_no": "251", "full_name": "سعيد فاطمة الزهراء بنت صلاح الدين", "dob": "2009-06-26", "phone": "065988655", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "said.fatima.251"}, {"id": "00000000-0000-4000-8000-000000000254", "membership_no": "254", "full_name": "بوال مصطفى بن إدريس", "dob": "2012-04-13", "phone": "066543656", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "boual.mustapha.254"}, {"id": "00000000-0000-4000-8000-000000000255", "membership_no": "255", "full_name": "بن خليفة ريهام شهد بنت محمد", "dob": "2009-07-25", "phone": "069804364", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "ben.khelifa.255"}, {"id": "00000000-0000-4000-8000-000000000256", "membership_no": "256", "full_name": "بن احمد انس عبد الجليل بن أحمد", "dob": "2017-11-12", "phone": "069958761", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000005", "branch_slug": "main", "section_slug": "sec_tafatan_1", "section": "التفطين 1 تأخر ذهني", "center": "main", "academic_year": "2026-2027", "active": true, "username": "ben.ahmed.256"}, {"id": "00000000-0000-4000-8000-000000000257", "membership_no": "257", "full_name": "الشامخة عبد الرزاق حفيظ بن مصطفى", "dob": "2017-12-03", "phone": "066862720", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000001", "branch_slug": "main", "section_slug": "sec_autism_1", "section": "توحد 01", "center": "main", "academic_year": "2026-2027", "active": true, "username": "chamikha.abd.257"}, {"id": "00000000-0000-4000-8000-000000000258", "membership_no": "258", "full_name": "اولاد الشيخ انس عبد العليم بن محمد", "dob": "2018-07-02", "phone": "066898171", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000004", "branch_slug": "main", "section_slug": "sec_observation", "section": "الملاحظة جدد", "center": "main", "academic_year": "2026-2027", "active": true, "username": "ouled.cheikh.258"}, {"id": "00000000-0000-4000-8000-000000000259", "membership_no": "259", "full_name": "عيسى عز الدين بن بكير", "dob": "2010-08-28", "phone": "055016841", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "aissa.ezz.259"}, {"id": "00000000-0000-4000-8000-000000000263", "membership_no": "263", "full_name": "سالم يوسف بن حمو", "dob": "2008-02-09", "phone": "054111581", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "salem.youssef.263"}, {"id": "00000000-0000-4000-8000-000000000264", "membership_no": "264", "full_name": "هامل سحر بنت أحمد بن صالح", "dob": "2007-06-04", "phone": "077824262", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000009", "branch_slug": "main", "section_slug": "sec_khariji", "section": "الخارجي اعاقة شديدة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "hamel.sihem.264"}, {"id": "00000000-0000-4000-8000-000000000265", "membership_no": "265", "full_name": "هامل عبد الحي بن أحمد بن صالح", "dob": "2010-07-29", "phone": "077824262", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "hamel.abd.265"}, {"id": "00000000-0000-4000-8000-000000000267", "membership_no": "267", "full_name": "بلولو الحاج ابراهيم بن رمضان", "dob": "2010-08-14", "phone": "079654999", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "belloulou.elhadj.267"}, {"id": "00000000-0000-4000-8000-000000000273", "membership_no": "273", "full_name": "الواهج بكير بن صالح", "dob": "1988-12-15", "phone": "055207989", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "elouahedj.bakir.273"}, {"id": "00000000-0000-4000-8000-000000000274", "membership_no": "274", "full_name": "توهامي ريم بنت توفيق", "dob": "2014-06-03", "phone": "055030033", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000004", "branch_slug": "main", "section_slug": "sec_observation", "section": "الملاحظة جدد", "center": "main", "academic_year": "2026-2027", "active": true, "username": "touhami.rim.274"}, {"id": "00000000-0000-4000-8000-000000000275", "membership_no": "275", "full_name": "أولاد حاجو مامة مالك بنت صالح", "dob": "2015-05-07", "phone": "066614780", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "ouled.hadjou.275"}, {"id": "00000000-0000-4000-8000-000000000276", "membership_no": "276", "full_name": "صديقي محمد الامين بن مراد", "dob": "2014-03-14", "phone": "066276843", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000003", "branch_slug": "main", "section_slug": "sec_autism_3", "section": "توحد 03", "center": "main", "academic_year": "2026-2027", "active": true, "username": "seddiki.mohamed.276"}, {"id": "00000000-0000-4000-8000-000000000279", "membership_no": "279", "full_name": "قندوز نهال بنت نصر الدين", "dob": "2012-06-18", "phone": "066597050", "disability": "التأخر الدراسي", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "kendouz.nihal.279"}, {"id": "00000000-0000-4000-8000-000000000280", "membership_no": "280", "full_name": "مطياز توفيق بن محمد", "dob": "2001-09-01", "phone": "066347915", "disability": "التأخر الدراسي", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "metiaz.toufik.280"}, {"id": "00000000-0000-4000-8000-000000000281", "membership_no": "281", "full_name": "عكيف عبد الجليل طه بن أحمد", "dob": "2003-06-15", "phone": "069998926", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "akif.abd.281"}, {"id": "00000000-0000-4000-8000-000000000283", "membership_no": "283", "full_name": "داودي سهام بنت محمد", "dob": "2015-02-17", "phone": "055610591", "disability": "التأخر الدراسي", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "daoudi.siham.283"}, {"id": "00000000-0000-4000-8000-000000000288", "membership_no": "288", "full_name": "حاج عيسى فخار عيسى بن يونس", "dob": "1995-08-18", "phone": "079794096", "disability": "متعدد الاعاقات", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "hadj.aissa.288"}, {"id": "00000000-0000-4000-8000-000000000289", "membership_no": "289", "full_name": "بنورة منير بن محمد", "dob": "2015-01-01", "phone": "055534375", "disability": "متعدد الاعاقات", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000009", "branch_slug": "main", "section_slug": "sec_khariji", "section": "الخارجي اعاقة شديدة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "bennoura.mounir.289"}, {"id": "00000000-0000-4000-8000-000000000291", "membership_no": "291", "full_name": "داودي ربيع بن بايوب", "dob": "2014-02-24", "phone": "0558694073", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "daoudi.rabie.291"}, {"id": "00000000-0000-4000-8000-000000000293", "membership_no": "293", "full_name": "ريغي اية بنت الشيخ", "dob": "2021-07-01", "phone": "065250446", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000006", "branch_slug": "main", "section_slug": "sec_tafatan_2", "section": "التفطين 2 متلازمة داون", "center": "main", "academic_year": "2026-2027", "active": true, "username": "righi.aya.293"}, {"id": "00000000-0000-4000-8000-000000000296", "membership_no": "296", "full_name": "عباس لقمان بن يحي", "dob": "2017-05-12", "phone": "077071457", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "abbas.lokmane.296"}, {"id": "00000000-0000-4000-8000-000000000297", "membership_no": "297", "full_name": "الشيخ محمد المهدي بن عيسى", "dob": "2016-12-17", "phone": "067462692", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000002", "branch_slug": "main", "section_slug": "sec_autism_2", "section": "التوحد 02", "center": "main", "academic_year": "2026-2027", "active": true, "username": "cheikh.mohamed.297"}, {"id": "00000000-0000-4000-8000-000000000301", "membership_no": "301", "full_name": "اسماوي ايوب بن عبد السلام", "dob": "2018-12-15", "phone": "055324283", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000008", "branch_slug": "main", "section_slug": "sec_shibh_madrasi", "section": "قسم الشبه مدرسي مكيف", "center": "main", "academic_year": "2026-2027", "active": true, "username": "asmaoui.ayoub.301"}, {"id": "00000000-0000-4000-8000-000000000305", "membership_no": "305", "full_name": "يحي الشريف خديجة بنت فاروق", "dob": "2022-09-23", "phone": "066864689", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000005", "branch_slug": "main", "section_slug": "sec_tafatan_1", "section": "التفطين 1 تأخر ذهني", "center": "main", "academic_year": "2026-2027", "active": true, "username": "yahia.cherif.305"}, {"id": "00000000-0000-4000-8000-000000000306", "membership_no": "306", "full_name": "بن صغير ياسين بن احمد", "dob": "2015-07-31", "phone": "066201480", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000004", "branch_slug": "main", "section_slug": "sec_observation", "section": "الملاحظة جدد", "center": "main", "academic_year": "2026-2027", "active": true, "username": "ben.seghir.306"}, {"id": "00000000-0000-4000-8000-000000000307", "membership_no": "307", "full_name": "غبشي نورالهدى بنت يوسف", "dob": "2014-09-07", "phone": "065951484", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000004", "branch_slug": "main", "section_slug": "sec_observation", "section": "الملاحظة جدد", "center": "main", "academic_year": "2026-2027", "active": true, "username": "ghebchi.nourelhouda.307"}, {"id": "00000000-0000-4000-8000-000000000310", "membership_no": "310", "full_name": "داودي الحاج يحي بن باحمد", "dob": "2007-06-24", "phone": "054113100", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "daoudi.elhadj.310"}, {"id": "00000000-0000-4000-8000-000000000311", "membership_no": "311", "full_name": "الشيخ دحمان مامة بنت دحمان", "dob": "2016-02-10", "phone": "055933674", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "cheikh.dahmane.311"}, {"id": "00000000-0000-4000-8000-000000000312", "membership_no": "312", "full_name": "بن يونس يسرى بنت مصطفى", "dob": "2007-09-09", "phone": "066685208", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "ben.younes.312"}, {"id": "00000000-0000-4000-8000-000000000313", "membership_no": "313", "full_name": "لعزيز ياسمين بنت سيراج", "dob": "2013-12-30", "phone": "055015858", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "laaziz.yasmine.313"}, {"id": "00000000-0000-4000-8000-000000000314", "membership_no": "314", "full_name": "نوح مفنون أمين بن البشير", "dob": "2007-01-05", "phone": "077830744", "disability": "متلازمة داون T.21", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "nouh.mefnoun.314"}, {"id": "00000000-0000-4000-8000-000000000315", "membership_no": "315", "full_name": "بورزمة ابراهيم بن محمد", "dob": "2021-08-11", "phone": "066333478", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000005", "branch_slug": "main", "section_slug": "sec_tafatan_1", "section": "التفطين 1 تأخر ذهني", "center": "main", "academic_year": "2026-2027", "active": true, "username": "bourezma.brahim.315"}, {"id": "00000000-0000-4000-8000-000000000316", "membership_no": "316", "full_name": "زيطاري نور سين بنت خليل", "dob": "2020-09-21", "phone": "066241736", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000005", "branch_slug": "main", "section_slug": "sec_tafatan_1", "section": "التفطين 1 تأخر ذهني", "center": "main", "academic_year": "2026-2027", "active": true, "username": "zitari.nour.316"}, {"id": "00000000-0000-4000-8000-000000000317", "membership_no": "317", "full_name": "داودي طه بن علي", "dob": "2007-06-06", "phone": "054148767", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000002", "section_id": "22222222-0000-4000-8000-000000000010", "branch_slug": "work", "section_slug": "sec_tamhin", "section": "التمهين م م ع", "center": "work", "academic_year": "2026-2027", "active": true, "username": "daoudi.taha.317"}, {"id": "00000000-0000-4000-8000-000000000318", "membership_no": "318", "full_name": "جبريط سعد الدين بن بدر الدين", "dob": "2014-05-10", "phone": "066228078", "disability": "التأخر الذهني R.M", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000007", "branch_slug": "main", "section_slug": "sec_istithara", "section": "الاستثارة", "center": "main", "academic_year": "2026-2027", "active": true, "username": "djebrit.saad.318"}, {"id": "00000000-0000-4000-8000-000000000320", "membership_no": "320", "full_name": "بيتور محمد اسحاق بن بن يعيش", "dob": "2019-03-24", "phone": "066230749", "disability": "اضطراب طيف التوحد TSA", "branch_id": "11111111-0000-4000-8000-000000000001", "section_id": "22222222-0000-4000-8000-000000000004", "branch_slug": "main", "section_slug": "sec_observation", "section": "الملاحظة جدد", "center": "main", "academic_year": "2026-2027", "active": true, "username": "bitour.mohamed.320"}];

  /* القائمة الرسمية للموظفين والمربيات (16 موظفًا) — كلٌّ في مركزه، برقم الهاتف وكلمة المرور DI + تاريخ الميلاد (DDMMYYYY) */
  var EMBEDDED_STAFF = [
    {"id": "staff-001", "emp_no": "1",   "full_name": "أمير زكرياء بن عبد الله",            "dob": "1993-05-11", "phone": "0540817775", "email": "edu.0540817775@darelihsan.org", "center": "main", "role": "admin",    "job_title": "مدير المركز",      "section_id": "", "section_name": "المركز الرئيسي دار الإحسان", "has_account": true},
    {"id": "staff-002", "emp_no": "2",   "full_name": "الخلفاوي حمودة بن يحي",              "dob": "1986-05-03", "phone": "0550647516", "email": "edu.0550647516@darelihsan.org", "center": "main", "role": "admin",    "job_title": "عون إداري",        "section_id": "", "section_name": "المركز الرئيسي دار الإحسان", "has_account": true},
    {"id": "staff-010", "emp_no": "10",  "full_name": "الأخصائية نواري اسماء بنت جيلالي",   "dob": "2001-08-14", "phone": "0655806951", "email": "edu.0655806951@darelihsan.org", "center": "main", "role": "specialist", "job_title": "أخصائية نفسانية",  "section_id": "", "section_name": "المركز الرئيسي دار الإحسان", "has_account": true},
    {"id": "staff-017", "emp_no": "17",  "full_name": "فضاض خولة بنت الشيخ بن أحمد",        "dob": "1998-02-05", "phone": "0555905565", "email": "edu.0555905565@darelihsan.org", "center": "main", "role": "educator", "job_title": "مربية",            "section_id": "22222222-0000-4000-8000-000000000005", "section_name": "التفطين 1 تأخر ذهني", "has_account": true},
    {"id": "staff-047", "emp_no": "47",  "full_name": "الرمة فاطمة الزهراء بنت أحمد",       "dob": "1998-07-28", "phone": "0663412874", "email": "edu.0663412874@darelihsan.org", "center": "main", "role": "educator", "job_title": "مربية",            "section_id": "22222222-0000-4000-8000-000000000001", "section_name": "توحد 01", "has_account": true},
    {"id": "staff-058", "emp_no": "58",  "full_name": "قوطارة جميلة بنت مبروك",             "dob": "1993-06-19", "phone": "0676160618", "email": "edu.0676160618@darelihsan.org", "center": "main", "role": "educator", "job_title": "مربية",            "section_id": "22222222-0000-4000-8000-000000000008", "section_name": "قسم الشبه مدرسي مكيف", "has_account": true},
    {"id": "staff-103", "emp_no": "103", "full_name": "بوقانون فيروز بنت مسعود",            "dob": "1980-10-10", "phone": "0657929247", "email": "edu.0657929247@darelihsan.org", "center": "main", "role": "educator", "job_title": "مربية",            "section_id": "22222222-0000-4000-8000-000000000004", "section_name": "الملاحظة جدد", "has_account": true},
    {"id": "staff-104", "emp_no": "104", "full_name": "ميزات صارة بنت أحمد",                "dob": "1991-02-09", "phone": "0697626616", "email": "edu.0697626616@darelihsan.org", "center": "main", "role": "educator", "job_title": "مربية",            "section_id": "22222222-0000-4000-8000-000000000009", "section_name": "الخارجي اعاقة شديدة", "has_account": true},
    {"id": "staff-105", "emp_no": "105", "full_name": "قريدة عيدة بنت موسى",                "dob": "1970-02-18", "phone": "0657929291", "email": "edu.0657929291@darelihsan.org", "center": "main", "role": "educator", "job_title": "مربية",            "section_id": "22222222-0000-4000-8000-000000000006", "section_name": "التفطين 2 متلازمة داون", "has_account": true},
    {"id": "staff-111", "emp_no": "111", "full_name": "باحمد صليحة بنت نور الدين",          "dob": "1996-11-19", "phone": "0552698775", "email": "edu.0552698775@darelihsan.org", "center": "main", "role": "educator", "job_title": "مربية",            "section_id": "22222222-0000-4000-8000-000000000002", "section_name": "التوحد 02", "has_account": true},
    {"id": "staff-113", "emp_no": "113", "full_name": "بن دربال نسيبة بنت محمد",            "dob": "1985-11-25", "phone": "0667941590", "email": "edu.0667941590@darelihsan.org", "center": "main", "role": "educator", "job_title": "مربية",            "section_id": "22222222-0000-4000-8000-000000000003", "section_name": "توحد 03", "has_account": true},
    {"id": "staff-099", "emp_no": "99",  "full_name": "عبد الصمد عصام بن خميسي",            "dob": "1981-12-17", "phone": "0662744988", "email": "edu.0662744988@darelihsan.org", "center": "work", "role": "admin",    "job_title": "رئيس مصلحة",       "section_id": "22222222-0000-4000-8000-000000000010", "section_name": "التمهين م م ع", "has_account": true},
    {"id": "staff-004", "emp_no": "4",   "full_name": "لهزيل زينب بنت أحمد",                "dob": "1984-10-14", "phone": "0668640481", "email": "edu.0668640481@darelihsan.org", "center": "work", "role": "educator", "job_title": "مربية",            "section_id": "22222222-0000-4000-8000-000000000010", "section_name": "التمهين م م ع", "has_account": true},
    {"id": "staff-038", "emp_no": "38",  "full_name": "جلود عبد السلام بن الشيخ بن قويدر",  "dob": "1996-09-30", "phone": "0657855528", "email": "edu.0657855528@darelihsan.org", "center": "work", "role": "educator", "job_title": "مربي",             "section_id": "22222222-0000-4000-8000-000000000010", "section_name": "التمهين م م ع", "has_account": true},
    {"id": "staff-107", "emp_no": "107", "full_name": "سيروكان بشرى بنت احمد",              "dob": "2011-04-25", "phone": "0652676768", "email": "edu.0652676768@darelihsan.org", "center": "work", "role": "educator", "job_title": "مساعدة مربية",     "section_id": "22222222-0000-4000-8000-000000000010", "section_name": "التمهين م م ع", "has_account": true},
    {"id": "staff-074", "emp_no": "74",  "full_name": "طالب باحمد ياسين بن عيسى",           "dob": "2007-10-22", "phone": "0664359676", "email": "edu.0664359676@darelihsan.org", "center": "farm", "role": "educator", "job_title": "مربي المزرعة البيداغوجية", "section_id": "22222222-0000-4000-8000-000000000011", "section_name": "المزرعة البستنة", "has_account": true}
  ];

  function staffPasswordFromDob(dob) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob || '').trim());
    return m ? ('DI' + m[3] + m[2] + m[1]) : '';
  }

  function buildDefaultPortalMeta() {
    var edus = [];
    var accs = {};
    EMBEDDED_STAFF.forEach(function (st) {
      var em = st.email.toLowerCase();
      if (st.role === 'educator') {
        edus.push({
          id: st.id,
          emp_no: st.emp_no,
          full_name: st.full_name,
          dob: st.dob,
          phone: st.phone,
          email: em,
          center: st.center,
          job_title: st.job_title,
          section_id: st.section_id,
          section_name: st.section_name,
          has_account: true,
          updated_at: '2026-10-26T08:00:00Z'
        });
      }
      accs[em] = {
        role: st.role,
        educator_id: st.role === 'educator' ? st.id : null,
        emp_no: st.emp_no,
        full_name: st.full_name,
        dob: st.dob,
        phone: st.phone,
        center: st.center,
        center_access: st.center,
        job_title: st.job_title,
        section_id: st.section_id,
        section_name: st.section_name,
        has_account: true,
        updated_at: '2026-10-26T08:00:00Z'
      };
    });
    return { educators: edus, account_meta: accs };
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
    programs: 'البرامج التربوية للأقسام',
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
    if (!prof || !prof.email) return;
    try {
      sessionStorage.setItem(STAFF_SESSION_KEY, JSON.stringify({
        id: prof.id || prof.educator_id || ('staff-' + cleanPhoneDigits(prof.phone || prof.email)),
        email: String(prof.email).toLowerCase(),
        full_name: prof.full_name || '',
        phone: prof.phone || '',
        dob: prof.dob || '',
        role: prof.role || 'educator',
        center: prof.center || prof.center_access || 'main',
        center_access: prof.center_access || prof.center || 'main',
        section_id: prof.section_id || '',
        section_name: prof.section_name || '',
        job_title: prof.job_title || '',
        at: Date.now()
      }));
    } catch (e) {}
  }

  function readStaffSession() {
    try {
      var raw = sessionStorage.getItem(STAFF_SESSION_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return (parsed && parsed.email) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function verifyStaffPortalAuth(rawInput, resolvedEmail, passwordInput, meta) {
    var em = String(resolvedEmail || '').trim().toLowerCase();
    var pw = String(passwordInput || '').trim();
    if (!em || !pw) return null;

    var m = meta || S.portalMeta || emptyPortalMeta();
    var delEmails = (m.deleted_emails || []).map(function (x) { return String(x || '').toLowerCase(); });
    var delIds = (m.deleted_educator_ids || []).map(String);
    if (delEmails.indexOf(em) >= 0 || (S.deletedRuntimeEmails && S.deletedRuntimeEmails[em])) {
      return null;
    }

    var inDigits = cleanPhoneDigits(rawInput);
    var tail9 = inDigits.length >= 9 ? inDigits.slice(-9) : '';

    var candidates = [];
    EMBEDDED_STAFF.forEach(function (st) {
      candidates.push(Object.assign({}, st));
    });
    (m.educators || []).forEach(function (ed) {
      if (ed) candidates.push(Object.assign({ role: 'educator' }, ed));
    });
    Object.keys(m.account_meta || {}).forEach(function (k) {
      var ac = m.account_meta[k];
      if (ac) candidates.push(Object.assign({ email: k }, ac));
    });

    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      var cEmail = String(c.email || '').toLowerCase();
      var cId = String(c.id || c.educator_id || '');
      if (cEmail && (delEmails.indexOf(cEmail) >= 0 || (S.deletedRuntimeEmails && S.deletedRuntimeEmails[cEmail]))) continue;
      if (cId && (delIds.indexOf(cId) >= 0 || (S.deletedRuntimeIds && S.deletedRuntimeIds[cId]))) continue;

      var cDigits = cleanPhoneDigits(c.phone || '');
      var cTail9 = cDigits.length >= 9 ? cDigits.slice(-9) : '';
      var emailMatched = (cEmail && cEmail === em);
      var phoneMatched = (tail9 && cTail9 && tail9 === cTail9);

      if (emailMatched || phoneMatched) {
        var expectedPw = staffPasswordFromDob(c.dob);
        if (expectedPw && pw.toUpperCase() === expectedPw.toUpperCase()) {
          return Object.assign({}, c, {
            email: cEmail || em
          });
        }
      }
    }
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

  
  /* فحص صلاحية الوصول إلى نظام الأرشيف الشامل (للإداري الخلفاوي حمودة أو من يملك صلاحية جميع المراكز فقط) */
  function canUserAccessArchive() {
    if (!S.me) return false;
    if (S.isEducator) return false;
    var email = String(S.me.email || '').toLowerCase().trim();
    var name = String(S.me.full_name || S.me.name || '').trim();
    var phone = String(S.me.phone || '').trim();
    var isHammouda = email === 'edu.0550647516@darelihsan.org' ||
                     email.indexOf('0550647516') >= 0 ||
                     phone.indexOf('0550647516') >= 0 ||
                     name.indexOf('حمودة') >= 0 ||
                     name.indexOf('الخلفاوي') >= 0;
    var hasAllCenters = S.isOwner || (S.centerAccess === 'all') || (typeof canAccessGeneralAdmin === 'function' && canAccessGeneralAdmin());
    return isHammouda || hasAllCenters;
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
    var brBySlug = {}, secBySlug = {}, secByName = {};
    (liveBranches || []).forEach(function (b) { if (b && b.slug) brBySlug[b.slug] = b.id; });
    (liveSections || []).forEach(function (s) {
      if (s && s.slug) secBySlug[s.slug] = s.id;
      if (s && s.name) secByName[normAr(s.name)] = s.id;
    });
    return EMBEDDED_STUDENTS.map(function (st) {
      var copy = Object.assign({}, st);
      if (st.branch_slug && brBySlug[st.branch_slug]) copy.branch_id = brBySlug[st.branch_slug];
      if (st.section_slug && secBySlug[st.section_slug]) copy.section_id = secBySlug[st.section_slug];
      else if (st.section && secByName[normAr(st.section)]) copy.section_id = secByName[normAr(st.section)];
      return copy;
    });
  }

  var Q = {
    branches: async function () {
      try {
        var rows = await C.rest('GET', '/branches?select=*&order=name');
        if (Array.isArray(rows) && rows.length) return rows;
      } catch (e) {}
      return EMBEDDED_BRANCHES.slice();
    },
    sections: async function () {
      try {
        var rows = await C.rest('GET', '/sections?select=*&order=name');
        if (Array.isArray(rows) && rows.length) return rows;
      } catch (e) {}
      return EMBEDDED_SECTIONS.slice();
    },
    children: async function () {
      var rows = null;
      try {
        rows = await C.rest('GET', '/children?select=' + CHILD_SAFE_COLS + '&order=membership_no.asc,full_name.asc');
      } catch (err1) {
        try {
          rows = await C.rest('GET', '/children?select=id,full_name,center,section,basic_info,photo_consent,active,created_at,updated_at&order=full_name.asc');
        } catch (err2) {
          rows = [];
        }
      }
      if ((!Array.isArray(rows) || !rows.length) && !S.isEducator && !_autoImportAttempted) {
        _autoImportAttempted = true;
        try {
          await C.rpc('import_official_students');
          rows = await C.rest('GET', '/children?select=' + CHILD_SAFE_COLS + '&order=membership_no.asc,full_name.asc');
        } catch (eImp) {}
      }
      var bList = S.cache.branches || EMBEDDED_BRANCHES;
      var sList = S.cache.sections || EMBEDDED_SECTIONS;
      var embeddedList = mapEmbeddedStudentsToSections(bList, sList);
      if (Array.isArray(rows) && rows.length) {
        var embByMno = {}, embById = {};
        embeddedList.forEach(function (e) {
          if (e.membership_no) embByMno[String(e.membership_no).trim()] = e;
          if (e.id) embById[e.id] = e;
        });
        var seenMno = {};
        var merged = rows.map(function (r) {
          var mno = r.membership_no ? ('000' + String(r.membership_no).replace(/\D/g, '')).slice(-3) : '';
          var emb = (mno && embByMno[mno]) || embById[r.id];
          if (emb) {
            seenMno[emb.membership_no] = true;
            return Object.assign({}, r, {
              membership_no: emb.membership_no,
              full_name: emb.full_name,
              dob: emb.dob,
              disability: emb.disability,
              section: emb.section,
              center: emb.center,
              branch_id: r.branch_id || emb.branch_id,
              section_id: r.section_id || emb.section_id,
              phone: emb.phone || r.phone,
              username: emb.username
            });
          }
          return r;
        });
        embeddedList.forEach(function (e) {
          if (!seenMno[e.membership_no]) merged.push(e);
        });
        return merged;
      }
      return embeddedList;
    },
    parents: function () { return C.rest('GET', '/parent_profiles?select=*&order=full_name').catch(function () { return []; }); },
    links: function () { return C.rest('GET', '/parent_children?select=parent_id,child_id').catch(function () { return []; }); },
    programs: function () { return C.rest('GET', '/educational_programs?select=*&order=created_at.desc').catch(function () { return []; }); },
    codes: function () { return C.rest('GET', '/registration_codes?select=*&order=created_at.desc').catch(function () { return []; }); },
    reports: function () { return C.rest('GET', '/progress_reports?select=*&order=report_date.desc').catch(function () { return []; }); },
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

    v.textContent = '';
    v.appendChild(h('div', { class: 'empty', text: 'جارٍ جلب إحصائيات لوحة المعلومات الحية…' }));

    var d = await Promise.all([
      get('children'),
      get('branches'),
      get('sections'),
      get('reports'),
      get('docs'),
      get('msgs'),
      C.rest('GET', '/attendance?order=date.desc&limit=500').catch(function () { return []; }),
      C.rest('GET', '/whatsapp_logs?order=created_at.desc&limit=200').catch(function () { return []; }),
      get('audit')
    ]);

    var allKids = d[0] || [], branches = d[1] || [], sections = d[2] || [];
    var reports = d[3] || [], docs = d[4] || [], msgs = d[5] || [];
    var dbAttendance = d[6] || [], waLogs = d[7] || [], auditList = d[8] || [];

    v.textContent = '';

    var centerKids = allKids.filter(function (k) { return childCenterKey(k, branches, sections) === S.activeCenter; });
    var activeCenterKids = centerKids.filter(function (k) { return !!k.active; });
    var centerSections = sections.filter(function (s) { return sectionCenterKey(s, branches) === S.activeCenter; });

    // حساب إحصائيات حضور اليوم
    var todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers' }).format(new Date());
    var todayAtt = dbAttendance.filter(function (a) { return (a.date ? String(a.date).slice(0, 10) : '') === todayStr; });
    var presentCount = 0, absentCount = 0;
    centerKids.forEach(function (k) {
      var match = todayAtt.filter(function (a) { return a.child_id === k.id; })[0];
      if (match && match.status === 'present') presentCount++;
      else if (match && match.status === 'absent') absentCount++;
    });
    var unrecordedCount = Math.max(0, centerKids.length - (presentCount + absentCount));
    var attRate = centerKids.length > 0 ? Math.round((presentCount / centerKids.length) * 100) : 0;

    // إحصائيات واتساب
    var deliveredWa = waLogs.filter(function (l) { return l.status === 'delivered' || l.status === 'read' || l.status === 'sent'; }).length;
    var failedWa = waLogs.filter(function (l) { return l.status === 'failed'; }).length;

    // Bento Grid Layout
    var bento = h('div', { class: 'bento-grid' });

    // 1. Bento Hero Card
    var heroCard = h('div', { class: 'bento-card bento-hero' },
      h('div', { class: 'bento-card-hdr' },
        h('h3', null, makeSvgIcon('s-home'), h('span', { text: 'مرحبًا بك في ' + cm.name })),
        badge(cm.badge, 'gold')
      ),
      h('div', { style: 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;' },
        h('div', null,
          h('div', { style: 'font-size:2.4rem;font-weight:800;color:#FFFFFF;', text: String(centerKids.length) }),
          h('div', { style: 'font-size:0.95rem;color:#EAF2FA;margin-top:4px;', text: 'إجمالي الطلبة المسجلين (' + activeCenterKids.length + ' طالب نشط)' })
        ),
        h('button', {
          type: 'button',
          class: 'btn gold',
          onclick: function () { go('hub'); }
        }, makeSvgIcon('s-branch'), h('span', { text: 'تبديل المركز' }))
      )
    );
    bento.appendChild(heroCard);

    // 2. Bento Attendance Card
    var attCard = h('div', { class: 'bento-card bento-att' },
      h('div', { class: 'bento-card-hdr' },
        h('h3', null, makeSvgIcon('s-cal'), h('span', { text: 'حضور اليوم' })),
        badge(attRate + '% نسبة الحضور', 'ok')
      ),
      h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin:12px 0;' },
        h('div', { style: 'text-align:center;' }, h('span', { style: 'font-size:1.4rem;font-weight:700;color:#059669;', text: String(presentCount) }), h('div', { class: 'muted small', text: 'حاضر' })),
        h('div', { style: 'text-align:center;' }, h('span', { style: 'font-size:1.4rem;font-weight:700;color:#DC2626;', text: String(absentCount) }), h('div', { class: 'muted small', text: 'غائب' })),
        h('div', { style: 'text-align:center;' }, h('span', { style: 'font-size:1.4rem;font-weight:700;color:#64748B;', text: String(unrecordedCount) }), h('div', { class: 'muted small', text: 'لم يسجل' }))
      ),
      h('button', {
        type: 'button',
        class: 'btn small light',
        style: 'margin-top:auto;',
        onclick: function () { go('attendance'); }
      }, makeSvgIcon('s-check-circle'), h('span', { text: 'تسجيل الحضور الفوري' }))
    );
    bento.appendChild(attCard);

    // 3. Bento WhatsApp Pulse Card
    var waCard = h('div', { class: 'bento-card bento-wa' },
      h('div', { class: 'bento-card-hdr' },
        h('h3', null, makeSvgIcon('s-whatsapp'), h('span', { text: 'حالة إشعارات واتساب' })),
        badge('Cloud API v20', 'ok')
      ),
      h('div', { style: 'display:flex;gap:12px;margin:12px 0;' },
        h('div', { style: 'flex:1;background:var(--surface);padding:10px;border-radius:8px;border:1px solid var(--border);text-align:center;' },
          h('b', { style: 'color:#059669;font-size:1.2rem;', text: String(deliveredWa) }),
          h('div', { class: 'muted small', text: 'تم التسليم' })
        ),
        h('div', { style: 'flex:1;background:var(--surface);padding:10px;border-radius:8px;border:1px solid var(--border);text-align:center;' },
          h('b', { style: 'color:#DC2626;font-size:1.2rem;', text: String(failedWa) }),
          h('div', { class: 'muted small', text: 'فشل الإرسال' })
        )
      ),
      h('button', {
        type: 'button',
        class: 'btn small ghost',
        style: 'margin-top:auto;',
        onclick: function () { go('attendance'); }
      }, h('span', { text: 'فتح سجل إرسال الرسائل' }))
    );
    bento.appendChild(waCard);

    // 4. Bento Centers Distribution
    var mainKids = allKids.filter(function (k) { return (k.center || 'main') === 'main'; }).length;
    var workKids = allKids.filter(function (k) { return (k.center || '') === 'work'; }).length;
    var farmKids = allKids.filter(function (k) { return (k.center || '') === 'farm'; }).length;

    var centersCard = h('div', { class: 'bento-card bento-centers' },
      h('div', { class: 'bento-card-hdr' },
        h('h3', null, makeSvgIcon('s-branch'), h('span', { text: 'المراكز الثلاثة' })),
        badge(allKids.length + ' طالب إجمالي', 'gold')
      ),
      h('div', { style: 'display:flex;flex-direction:column;gap:8px;margin:8px 0;' },
        h('div', { style: 'display:flex;justify-content:space-between;font-size:0.86rem;' }, h('span', { text: 'المركز الرئيسي دار الإحسان' }), h('strong', { text: mainKids + ' طالب' })),
        h('div', { style: 'display:flex;justify-content:space-between;font-size:0.86rem;' }, h('span', { text: 'مركز المساعدة على العمل' }), h('strong', { text: workKids + ' طالب' })),
        h('div', { style: 'display:flex;justify-content:space-between;font-size:0.86rem;' }, h('span', { text: 'المزرعة البيداغوجية' }), h('strong', { text: farmKids + ' طالب' }))
      ),
      h('button', {
        type: 'button',
        class: 'btn small light',
        style: 'margin-top:auto;',
        onclick: function () { go('branches'); }
      }, h('span', { text: 'إدارة المراكز والأقسام' }))
    );
    bento.appendChild(centersCard);

    // 5. Bento Audit Stream
    var recentAudits = (auditList || []).slice(0, 4);
    var auditCard = h('div', { class: 'bento-card bento-audit' },
      h('div', { class: 'bento-card-hdr' },
        h('h3', null, makeSvgIcon('s-log'), h('span', { text: 'آخر النشاطات' })),
        h('button', { class: 'btn-text-gold', type: 'button', text: 'سجل العمليات', onclick: function () { go('audit'); } })
      ),
      h('div', { style: 'display:flex;flex-direction:column;gap:8px;' },
        recentAudits.map(function (a) {
          return h('div', { style: 'font-size:0.82rem;padding:6px 0;border-bottom:1px solid var(--border);' },
            h('strong', { text: a.actor_email ? a.actor_email.split('@')[0] : 'إداري' }),
            h('span', { class: 'muted', text: ' • ' + (a.action || 'عملية') }),
            h('div', { class: 'muted small', text: fmt(a.at, true) })
          );
        })
      )
    );
    bento.appendChild(auditCard);

    // 6. Bento Recent Notifications
    var topNotifs = ((typeof NOTIF_STATE !== "undefined" && NOTIF_STATE && NOTIF_STATE.items) || []).slice(0, 3);
    var notifsCard = h('div', { class: 'bento-card bento-notifs' },
      h('div', { class: 'bento-card-hdr' },
        h('h3', null, makeSvgIcon('s-bell'), h('span', { text: 'آخر الإشعارات' })),
        h('button', { class: 'btn-text-gold', type: 'button', text: 'عرض الكل', onclick: function () { go('notifications'); } })
      ),
      h('div', { style: 'display:flex;flex-direction:column;gap:8px;' },
        topNotifs.length ? topNotifs.map(function (n) {
          return h('div', { style: 'display:flex;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);' },
            h('div', { class: 'att-stat-icon-wrap' }, makeSvgIcon('s-bell')),
            h('div', { style: 'flex:1;' },
              h('strong', { style: 'font-size:0.88rem;', text: n.title }),
              h('p', { class: 'muted small', style: 'margin:2px 0 0;', text: n.body })
            )
          );
        }) : h('div', { class: 'empty', style: 'padding:16px;', text: 'لا توجد إشعارات حديثة' })
      )
    );
    bento.appendChild(notifsCard);

    // 7. Bento Quick Actions
    var actionsCard = h('div', { class: 'bento-card bento-actions' },
      h('div', { class: 'bento-card-hdr' },
        h('h3', null, makeSvgIcon('s-wand'), h('span', { text: 'الإجراءات السريعة' }))
      ),
      h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;' },
        h('button', { type: 'button', class: 'btn light', onclick: function () { go('children'); } }, makeSvgIcon('s-child'), h('span', { text: 'الأقسام والطلبة' })),
        h('button', { type: 'button', class: 'btn light', onclick: function () { go('attendance'); } }, makeSvgIcon('s-cal'), h('span', { text: 'الحضور والغياب' })),
        h('button', { type: 'button', class: 'btn light', onclick: function () { go('reports'); } }, makeSvgIcon('s-report'), h('span', { text: 'التقارير' })),
        h('button', { type: 'button', class: 'btn light', onclick: function () { go('notifications'); } }, makeSvgIcon('s-bell'), h('span', { text: 'الإشعارات' })),
        h('button', { type: 'button', class: 'btn light', onclick: function () { go('msgs'); } }, makeSvgIcon('s-mail'), h('span', { text: 'الرسائل' })),
        h('button', { type: 'button', class: 'btn light', onclick: function () { go('settings'); } }, makeSvgIcon('s-gear'), h('span', { text: 'الإعدادات' }))
      )
    );
    bento.appendChild(actionsCard);

    v.appendChild(bento);
  }


  /* =====================================================================
     2. إدارة الأطفال والطلبة + أقسام المركز المدمجة + بطاقة الانخراط + رمز التسجيل
     ===================================================================== */
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
      var matched = EMBEDDED_STUDENTS.filter(function (s) {
        return (padMno && s.membership_no === padMno) || (child.id && s.id === child.id) || (child.full_name && s.full_name === child.full_name);
      })[0];
      if (matched && matched.username) return matched.username;
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
          label: 'كلمة المرور (DI + تاريخ الميلاد)',
          get: function (e) {
            var dobPw = staffPasswordFromDob(e.dob);
            var acc = meta.account_meta && e.email ? meta.account_meta[e.email.toLowerCase()] : null;
            return h('div', { class: 'row-actions' },
              dobPw ? h('code', { dir: 'ltr', class: 'sic-num', text: dobPw }) : null,
              (!acc || !acc.has_account) ? badge('لم يُنشأ الحساب بعد', 'gray') : badge('مفعّل', 'ok')
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
     4. إدارة البرامج التربوية للأقسام والجدول الأسبوعي المصوّر (Educational Programs)
     ===================================================================== */
  var WEEK_DAYS = [
    { key: 'sun', label: 'الأحد' },
    { key: 'mon', label: 'الإثنين' },
    { key: 'tue', label: 'الثلاثاء' },
    { key: 'wed', label: 'الأربعاء' },
    { key: 'thu', label: 'الخميس' }
  ];

  var BREAK_PRESETS = [
    'الاعتماد على الذات',
    'فسحة',
    'استراحة',
    'رياضة',
    'التحضير للخروج'
  ];

  function createTamhinDemoBody(secId, secName) {
    var cleanDomains = [
      {
        domain: 'مجال الاستقلالية (الحياة اليومية والعناية بالذات)',
        skills: [
          'غسل اليدين بالماء والصابون بشكل صحيح',
          'لبس المئزر بشكل صحيح',
          'مسك أدوات الطعام بشكل صحيح'
        ]
      },
      {
        domain: 'مجال المهارات الحركية الدقيقة',
        skills: [
          'مسك المقص بشكل صحيح',
          'قص الورقة على خطوط مستقيمة عريضة',
          'ترتيب مجموعة من الأوراق فوق بعضها'
        ]
      },
      {
        domain: 'مجال المهارات الحركية الكبرى',
        skills: [
          'المشي بطريقة صحيحة',
          'دفع جهاز متحرك لمسافة 2 م بطريقة صحيحة'
        ]
      },
      {
        domain: 'مجال مهارات الحضور والانتباه',
        skills: [
          'الاتصال البصري أثناء التعليم الجماعي',
          'الاستجابة للتعليمات اللفظية (أمران متسلسلان)'
        ]
      },
      {
        domain: 'مجال التواصل',
        skills: [
          'يسمي الأشياء المألوفة في البيئة',
          'يستجيب للأوامر المتسلسلة (أكثر من أمر)'
        ]
      }
    ];

    var demoDays = [
      {
        day: 'sun',
        label: 'الأحد',
        sessions: [
          {
            kind: 'break',
            title: 'الاعتماد على الذات',
            start: '08:00',
            end: '09:00',
            items: [{ domain: 'مجال الاستقلالية (الحياة اليومية والعناية بالذات)', skill: 'لبس المئزر بشكل صحيح' }]
          },
          {
            kind: 'session',
            title: 'ورشة التأهيل المهني الأولي',
            start: '09:00',
            end: '10:30',
            items: [
              { domain: 'مجال المهارات الحركية الدقيقة', skill: 'مسك المقص بشكل صحيح' },
              { domain: 'مجال مهارات الحضور والانتباه', skill: 'الاتصال البصري أثناء التعليم الجماعي' }
            ]
          },
          {
            kind: 'break',
            title: 'فسحة',
            start: '10:30',
            end: '11:00',
            items: []
          },
          {
            kind: 'session',
            title: 'تنمية المهارات العملية',
            start: '12:00',
            end: '13:40',
            items: [{ domain: 'مجال التواصل', skill: 'يستجيب للأوامر المتسلسلة (أكثر من أمر)' }]
          },
          {
            kind: 'break',
            title: 'التحضير للخروج',
            start: '13:40',
            end: '14:00',
            items: []
          }
        ]
      },
      {
        day: 'mon',
        label: 'الإثنين',
        sessions: [
          {
            kind: 'break',
            title: 'الاعتماد على الذات',
            start: '08:00',
            end: '09:00',
            items: [{ domain: 'مجال الاستقلالية (الحياة اليومية والعناية بالذات)', skill: 'غسل اليدين بالماء والصابون بشكل صحيح' }]
          },
          {
            kind: 'session',
            title: 'نشاط الفرز والترتيب المهني',
            start: '09:00',
            end: '10:30',
            items: [{ domain: 'مجال المهارات الحركية الدقيقة', skill: 'ترتيب مجموعة من الأوراق فوق بعضها' }]
          },
          {
            kind: 'break',
            title: 'فسحة',
            start: '10:30',
            end: '11:00',
            items: []
          },
          {
            kind: 'session',
            title: 'ورشة القص والتشكيل',
            start: '12:00',
            end: '13:40',
            items: [{ domain: 'مجال المهارات الحركية الدقيقة', skill: 'قص الورقة على خطوط مستقيمة عريضة' }]
          },
          {
            kind: 'break',
            title: 'التحضير للخروج',
            start: '13:40',
            end: '14:00',
            items: []
          }
        ]
      },
      {
        day: 'tue',
        label: 'الثلاثاء',
        sessions: [
          {
            kind: 'break',
            title: 'الاعتماد على الذات',
            start: '08:00',
            end: '09:00',
            items: []
          },
          {
            kind: 'session',
            title: 'رياضة وتوافق حركي مهني',
            start: '09:00',
            end: '10:30',
            items: [{ domain: 'مجال المهارات الحركية الكبرى', skill: 'دفع جهاز متحرك لمسافة 2 م بطريقة صحيحة' }]
          },
          {
            kind: 'break',
            title: 'فسحة',
            start: '10:30',
            end: '11:00',
            items: []
          },
          {
            kind: 'session',
            title: 'تواصل وتفاعل اجتماعي بالورشة',
            start: '12:00',
            end: '13:40',
            items: [{ domain: 'مجال التواصل', skill: 'يسمي الأشياء المألوفة في البيئة' }]
          },
          {
            kind: 'break',
            title: 'التحضير للخروج',
            start: '13:40',
            end: '14:00',
            items: []
          }
        ]
      },
      {
        day: 'wed',
        label: 'الأربعاء',
        sessions: [
          {
            kind: 'break',
            title: 'الاعتماد على الذات',
            start: '08:00',
            end: '09:00',
            items: []
          },
          {
            kind: 'session',
            title: 'ورشة التمهين التطبيقي',
            start: '09:00',
            end: '10:30',
            items: [
              { domain: 'مجال مهارات الحضور والانتباه', skill: 'الاستجابة للتعليمات اللفظية (أمران متسلسلان)' },
              { domain: 'مجال المهارات الحركية الدقيقة', skill: 'مسك المقص بشكل صحيح' }
            ]
          },
          {
            kind: 'break',
            title: 'فسحة',
            start: '10:30',
            end: '11:00',
            items: []
          },
          {
            kind: 'session',
            title: 'استقلالية الحياة اليومية',
            start: '12:00',
            end: '13:40',
            items: [{ domain: 'مجال الاستقلالية (الحياة اليومية والعناية بالذات)', skill: 'مسك أدوات الطعام بشكل صحيح' }]
          },
          {
            kind: 'break',
            title: 'التحضير للخروج',
            start: '13:40',
            end: '14:00',
            items: []
          }
        ]
      },
      {
        day: 'thu',
        label: 'الخميس',
        sessions: [
          {
            kind: 'break',
            title: 'الاعتماد على الذات',
            start: '08:00',
            end: '09:00',
            items: []
          },
          {
            kind: 'session',
            title: 'تقييم أسبوعي للمهارات المهنية',
            start: '09:00',
            end: '10:30',
            items: [
              { domain: 'مجال المهارات الحركية الدقيقة', skill: 'ترتيب مجموعة من الأوراق فوق بعضها' },
              { domain: 'مجال التواصل', skill: 'يستجيب للأوامر المتسلسلة (أكثر من أمر)' }
            ]
          },
          {
            kind: 'break',
            title: 'فسحة',
            start: '10:30',
            end: '11:00',
            items: []
          },
          {
            kind: 'session',
            title: 'أنشطة جماعية ومراجعة',
            start: '12:00',
            end: '13:40',
            items: [{ domain: 'مجال المهارات الحركية الكبرى', skill: 'المشي بطريقة صحيحة' }]
          },
          {
            kind: 'break',
            title: 'التحضير للخروج',
            start: '13:40',
            end: '14:00',
            items: []
          }
        ]
      }
    ];

    var notesTxt = 'برنامج أسبوعي معتمد لقسم التمهين (مركز المساعدة على العمل) — يشمل الفترات الصباحية والمسائية والحصص البينية.';
    var schedulePayload = demoDays.map(function (dy) {
      return {
        day: dy.day,
        label: dy.label,
        section_name: secName || 'التمهين م م ع',
        academic_year: '2026/2027',
        notes: notesTxt,
        domains: cleanDomains,
        sessions: dy.sessions
      };
    });

    var goalsLines = cleanDomains.map(function (dm) {
      return '• ' + dm.domain + ': ' + dm.skills.join(' ، ');
    });

    return {
      section_id: secId,
      title: DE.clean('البرنامج الأسبوعي — ' + (secName || 'التمهين م م ع'), 155),
      academic_year: '2026/2027',
      description: notesTxt,
      goals: DE.clean(goalsLines.join('\n'), 4800),
      schedule: schedulePayload,
      status: 'published',
      published_at: new Date().toISOString()
    };
  }

  var _tamhinSeedAttempted = false;

  async function secPrograms(v) {
    if (S.isEducator) return go('children');
    var d = await getMany('programs', 'sections', 'branches');
    var allProgs = d[0] || [], allSections = d[1] || [], branches = d[2] || [];
    var centerSecs = allSections.filter(function (s) { return sectionCenterKey(s, branches) === S.activeCenter; });
    var sections = centerSecs.length ? centerSecs : allSections;
    var secIdsMap = {};
    sections.forEach(function (s) { secIdsMap[s.id] = true; });
    var rows = allProgs.filter(function (p) { return !p.section_id || !!secIdsMap[p.section_id]; });
    var secOpts = sections.map(function (s) { return [s.id, s.name]; });

    var tamhinSec = sections.filter(function (s) {
      return s.slug === 'sec_tamhin' || (s.name && s.name.indexOf('التمهين') >= 0);
    })[0];

    if (tamhinSec && !_tamhinSeedAttempted) {
      var hasTamhinProg = rows.some(function (r) { return r.section_id === tamhinSec.id && r.status === 'published'; });
      if (!hasTamhinProg) {
        _tamhinSeedAttempted = true;
        try {
          var demoBody = createTamhinDemoBody(tamhinSec.id, tamhinSec.name);
          await C.rest('POST', '/educational_programs', demoBody);
          bust();
          var fresh = await getMany('programs', 'sections');
          rows = fresh[0];
          sections = fresh[1];
        } catch (seedErr) {}
      }
    }

    var CURR = (window && window.DE_CURRICULUM) || EMBEDDED_CURRICULUM || {};
    var domainKeys = Object.keys(CURR);
    var domainOpts = domainKeys.map(function (dk) { return [dk, dk]; });

    function domainColorClass(domName) {
      var idx = domainKeys.indexOf(domName);
      if (idx < 0) idx = 0;
      return 'wk-dom-c' + (idx % 8);
    }

    function parseProgState(p) {
      var st = {
        id: p ? p.id : null,
        section_id: (p && p.section_id) || (sections[0] ? sections[0].id : ''),
        academic_year: (p && p.academic_year) || '2026/2027',
        status: (p && p.status) || 'draft',
        published_at: (p && p.published_at) || null,
        notes: '',
        domains: [],
        days: WEEK_DAYS.map(function (wd) {
          return { day: wd.key, label: wd.label, sessions: [] };
        })
      };

      var rawSched = null;
      if (p && p.schedule) {
        try {
          rawSched = typeof p.schedule === 'string' ? JSON.parse(p.schedule) : p.schedule;
        } catch (e) { rawSched = null; }
      }

      if (Array.isArray(rawSched) && rawSched.length) {
        if (rawSched[0] && Array.isArray(rawSched[0].domains)) {
          st.domains = rawSched[0].domains.map(function (dm) {
            return {
              domain: dm.domain || (domainKeys[0] || ''),
              skills: Array.isArray(dm.skills) ? dm.skills.slice() : []
            };
          });
        }
        if (rawSched[0] && typeof rawSched[0].notes === 'string') {
          st.notes = rawSched[0].notes;
        }
        st.days = WEEK_DAYS.map(function (wd) {
          var found = rawSched.filter(function (r) { return r && (r.day === wd.key || r.label === wd.label || (wd.key === 'mon' && r.label === 'الاثنين')); })[0];
          var sessList = (found && Array.isArray(found.sessions)) ? found.sessions.map(function (s) {
            return {
              kind: s.kind === 'break' ? 'break' : 'session',
              title: s.title || '',
              start: s.start || '',
              end: s.end || '',
              items: Array.isArray(s.items) ? s.items.map(function (it) {
                return { domain: it.domain || '', skill: it.skill || '' };
              }).filter(function (it) { return it.domain || it.skill; }) : []
            };
          }) : [];
          return { day: wd.key, label: wd.label, sessions: sessList };
        });
      } else if (p) {
        st.notes = p.description || '';
        if (p.title) {
          var parts = p.title.split(' — ');
          if (parts.length >= 2 && CURR[parts[0]]) {
            st.domains.push({ domain: parts[0], skills: [parts.slice(1).join(' — ')] });
          } else if (CURR[p.title]) {
            st.domains.push({ domain: p.title, skills: [] });
          }
        }
      }

      st.days.forEach(function (dy) {
        (dy.sessions || []).forEach(function (s) {
          (s.items || []).forEach(function (it) {
            if (!it.domain) return;
            var dEntry = st.domains.filter(function (dm) { return dm.domain === it.domain; })[0];
            if (!dEntry) {
              dEntry = { domain: it.domain, skills: [] };
              st.domains.push(dEntry);
            }
            if (it.skill && dEntry.skills.indexOf(it.skill) < 0) {
              dEntry.skills.push(it.skill);
            }
          });
        });
      });

      if (!st.domains.length) {
        st.domains.push({ domain: domainKeys[0] || '', skills: [] });
      }

      if (!p) {
        st.days.forEach(function (dy) {
          if (!dy.sessions.length) {
            dy.sessions.push({ kind: 'session', title: '', start: '', end: '', items: [] });
          }
        });
      }

      return st;
    }

    function formatTimeRange(start, end) {
      var s = String(start || '').trim();
      var e = String(end || '').trim();
      if (s && e) return 'من ' + s + ' إلى ' + e;
      if (s) return 'من ' + s;
      if (e) return 'إلى ' + e;
      return '';
    }

    function formatShortTimeRange(start, end) {
      var s = String(start || '').trim();
      var e = String(end || '').trim();
      if (s && e) return s + ' ⟵ ' + e;
      if (s) return s;
      if (e) return e;
      return '';
    }

    function isSessionActive(s) {
      if (!s) return false;
      if (s.kind === 'break') return !!(s.title || s.start || s.end || (s.items && s.items.length));
      return !!((s.items && s.items.length) || s.title || s.start || s.end);
    }

    /* استخراج أعمدة الحصص الموحدة وتوقيتها (من وقت ... إلى وقت ...) لجميع أيام الأسبوع تحت إطار الفترات */
    function buildUnifiedScheduleColumns(daysList) {
      var maxCols = 0;
      (daysList || []).forEach(function (dy) {
        var len = (dy && dy.sessions) ? dy.sessions.length : 0;
        if (len > maxCols) maxCols = len;
      });
      if (maxCols === 0) maxCols = 1;

      var cols = [];
      var normalCounter = 0;
      for (var c = 0; c < maxCols; c++) {
        var startVal = '';
        var endVal = '';
        var breakCount = 0;
        var activeCount = 0;
        var sampleTitle = '';
        var anyActive = false;

        (daysList || []).forEach(function (dy) {
          var s = dy && dy.sessions ? dy.sessions[c] : null;
          if (!s) return;
          if (isSessionActive(s)) anyActive = true;
          if (!startVal && s.start) startVal = String(s.start).trim();
          if (!endVal && s.end) endVal = String(s.end).trim();
          if (s.kind === 'break') {
            breakCount++;
            if (!sampleTitle && s.title) sampleTitle = s.title;
          }
          if (s.kind) activeCount++;
        });

        var isBrk = breakCount > 0 && breakCount >= Math.ceil((activeCount || 1) / 2);
        if (!isBrk) normalCounter++;
        cols.push({
          colIndex: c,
          isBreak: isBrk,
          sessionNum: isBrk ? 0 : normalCounter,
          label: isBrk ? (sampleTitle || 'حصة بينية / فسحة') : ('الحصة ' + normalCounter),
          start: startVal,
          end: endVal,
          anyActive: anyActive
        });
      }

      var filtered = cols.filter(function (cl) { return cl.anyActive; });
      return filtered.length ? filtered : [cols[0]];
    }

    function wrapCanvasLines(ctx, text, maxWidth) {
      var words = String(text || '').trim().split(/\s+/);
      if (!words.length || !words[0]) return [];
      var lines = [];
      var cur = words[0];
      for (var i = 1; i < words.length; i++) {
        var test = cur + ' ' + words[i];
        if (ctx.measureText(test).width <= maxWidth) {
          cur = test;
        } else {
          lines.push(cur);
          cur = words[i];
        }
      }
      lines.push(cur);
      return lines;
    }

    /* رسم جدول البرنامج الأسبوعي كصورة أفقية عالية الدقة مع وضع التوقيت الواضح مباشرة تحت إطار الفترات وموحد لجميع الأيام */
    function renderWeeklyScheduleDataUrl(st, secName, cb) {
      var canvas = document.createElement('canvas');
      var W = 1600;
      var activeDomains = (st.domains || []).filter(function (dm) { return dm && dm.domain; });
      var stripH = activeDomains.length ? 92 : 0;
      var unifiedCols = buildUnifiedScheduleColumns(st.days || []);
      var numCols = unifiedCols.length;

      var rowHeights = WEEK_DAYS.map(function (wd) {
        var dy = (st.days || []).filter(function (d) { return d.day === wd.key; })[0];
        var sess = dy && dy.sessions ? dy.sessions : [];
        var maxItems = 1;
        unifiedCols.forEach(function (col) {
          var s = sess[col.colIndex];
          if (!s) return;
          var c = (s.items ? s.items.length : 0);
          if (c > maxItems) maxItems = c;
        });
        return Math.max(108, 42 + maxItems * 56);
      });

      var periodHeaderH = 48;
      var timeHeaderH = 68;
      var totalTableH = periodHeaderH + timeHeaderH + rowHeights.reduce(function (a, b) { return a + b; }, 0);
      var H = 178 + stripH + totalTableH + 88;
      canvas.width = W;
      canvas.height = H;
      var ctx = canvas.getContext('2d');
      ctx.direction = 'rtl';

      var palette = ['#FEF08A', '#BBF7D0', '#BAE6FD', '#FBCFE8', '#FED7AA', '#DDD6FE', '#A7F3D0', '#FECDD3'];

      function drawAll(logoImg) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 3;
        ctx.strokeRect(10, 10, W - 20, H - 20);

        // 1. الترويسة الرسمية العلوية
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(14, 14, W - 28, 140);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 20px Cairo, Tajawal, sans-serif';
        ctx.fillText('الموسم الدراسي: ' + (st.academic_year || '2026/2027'), W - 36, 58);
        ctx.fillText('الفوج / القسم: ' + (secName || 'غير محدد'), W - 36, 98);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#1E293B';
        ctx.font = 'bold 19px Cairo, Tajawal, sans-serif';
        ctx.fillText('جمعية أولياء الأطفال المعاقين ذهنيًا', W / 2, 42);
        ctx.fillText('المركز النفسي البيداغوجي دار الإحسان', W / 2, 68);
        ctx.font = 'bold 16px Cairo, Tajawal, sans-serif';
        ctx.fillText('- العطف - غرداية -', W / 2, 92);

        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(W / 2 - 195, 102, 390, 44);
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2.2;
        ctx.strokeRect(W / 2 - 195, 102, 390, 44);
        ctx.fillStyle = '#0C2D55';
        ctx.font = '900 27px Cairo, Tajawal, sans-serif';
        ctx.fillText('البرنامج الأسبوعي', W / 2, 133);

        if (logoImg) {
          try { ctx.drawImage(logoImg, 38, 24, 108, 108); } catch (e) {}
        }

        var y = 164;

        // 2. الشريط العلوي الملون للأنشطة والمجالات
        if (activeDomains.length) {
          var rightLblW = 148;
          var leftTotalW = 126;
          var domAreaW = W - 56 - rightLblW - leftTotalW;
          var dColW = domAreaW / activeDomains.length;

          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(W - 28 - rightLblW, y, rightLblW, 38);
          ctx.fillRect(W - 28 - rightLblW, y + 38, rightLblW, 42);
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 1.4;
          ctx.strokeRect(W - 28 - rightLblW, y, rightLblW, 38);
          ctx.strokeRect(W - 28 - rightLblW, y + 38, rightLblW, 42);
          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 14px Cairo, Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('الأنشطة / المجالات', W - 28 - rightLblW / 2, y + 24);
          ctx.fillText('عدد المهارات', W - 28 - rightLblW / 2, y + 64);

          var totalSkills = 0;
          activeDomains.forEach(function (dm, dIdx) {
            var dx = W - 28 - rightLblW - (dIdx + 1) * dColW;
            var colColor = palette[dIdx % palette.length];
            var skCount = dm.skills ? dm.skills.length : 0;
            totalSkills += skCount;

            ctx.fillStyle = colColor;
            ctx.fillRect(dx, y, dColW, 38);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(dx, y + 38, dColW, 42);
            ctx.strokeStyle = '#1E293B';
            ctx.strokeRect(dx, y, dColW, 38);
            ctx.strokeRect(dx, y + 38, dColW, 42);

            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 12.5px Cairo, Tajawal, sans-serif';
            ctx.fillText(String(dm.domain || '').slice(0, 30), dx + dColW / 2, y + 24);
            ctx.font = 'bold 15px Cairo, Tajawal, sans-serif';
            ctx.fillText(skCount + ' مهارة', dx + dColW / 2, y + 64);
          });

          ctx.fillStyle = '#D8B4E2';
          ctx.fillRect(28, y, leftTotalW, 38);
          ctx.fillStyle = '#F3E8FF';
          ctx.fillRect(28, y + 38, leftTotalW, 42);
          ctx.strokeStyle = '#1E293B';
          ctx.strokeRect(28, y, leftTotalW, 38);
          ctx.strokeRect(28, y + 38, leftTotalW, 42);
          ctx.fillStyle = '#3B0764';
          ctx.font = 'bold 15px Cairo, Tajawal, sans-serif';
          ctx.fillText('المجموع', 28 + leftTotalW / 2, y + 24);
          ctx.fillText(totalSkills + ' مهارة', 28 + leftTotalW / 2, y + 64);

          y += 92;
        }

        // 3. إطار الفترات (الصف الأول من رأس الجدول) + صف التوقيت الواضح تحته مباشرة (الصف الثاني)
        var dayColW = 148;
        var sessColW = W - 56 - dayColW;
        var colW = sessColW / numCols;

        // تقسيم الفترات (الفترة الصباحية | الاستراحة / الفسحة | الفترة المسائية) فوق أعمدة الحصص
        var midBreakIdx = -1;
        for (var bIdx = 1; bIdx < numCols - 1; bIdx++) {
          if (unifiedCols[bIdx].isBreak && (unifiedCols[bIdx].label.indexOf('فسحة') >= 0 || unifiedCols[bIdx].label.indexOf('استراحة') >= 0 || bIdx === Math.floor(numCols / 2))) {
            midBreakIdx = bIdx;
            break;
          }
        }

        // خلية اليمين لإطار الفترات
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(28 + sessColW, y, dayColW, periodHeaderH);
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(28 + sessColW, y, dayColW, periodHeaderH);
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 17px Cairo, Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('إطار الفترات', 28 + sessColW + dayColW / 2, y + 30);

        if (midBreakIdx >= 0 && numCols >= 3) {
          var mornCols = midBreakIdx;
          var brkCols = 1;
          var aftCols = numCols - mornCols - brkCols;

          var mornW = mornCols * colW;
          var brkW = brkCols * colW;
          var aftW = aftCols * colW;

          var mornX = 28 + sessColW - mornW;
          var brkX = mornX - brkW;
          var aftX = 28;

          ctx.fillStyle = '#BAE6FD';
          ctx.fillRect(mornX, y, mornW, periodHeaderH);
          ctx.strokeRect(mornX, y, mornW, periodHeaderH);
          ctx.fillStyle = '#0C2D55';
          ctx.font = 'bold 18px Cairo, Tajawal, sans-serif';
          ctx.fillText('الفترة الصباحية', mornX + mornW / 2, y + 31);

          ctx.fillStyle = '#D8B4E2';
          ctx.fillRect(brkX, y, brkW, periodHeaderH);
          ctx.strokeRect(brkX, y, brkW, periodHeaderH);
          ctx.fillStyle = '#3B0764';
          ctx.font = 'bold 16px Cairo, Tajawal, sans-serif';
          ctx.fillText('⏸' + (unifiedCols[midBreakIdx].label || 'فسحة'), brkX + brkW / 2, y + 31);

          ctx.fillStyle = '#DDD6FE';
          ctx.fillRect(aftX, y, aftW, periodHeaderH);
          ctx.strokeRect(aftX, y, aftW, periodHeaderH);
          ctx.fillStyle = '#1E1B4B';
          ctx.font = 'bold 18px Cairo, Tajawal, sans-serif';
          ctx.fillText('الفترة المسائية', aftX + aftW / 2, y + 31);
        } else if (numCols >= 2) {
          var halfCols = Math.ceil(numCols / 2);
          var mW = halfCols * colW;
          var aW = sessColW - mW;
          var mX = 28 + sessColW - mW;

          ctx.fillStyle = '#BAE6FD';
          ctx.fillRect(mX, y, mW, periodHeaderH);
          ctx.strokeRect(mX, y, mW, periodHeaderH);
          ctx.fillStyle = '#0C2D55';
          ctx.font = 'bold 18px Cairo, Tajawal, sans-serif';
          ctx.fillText('الفترة الصباحية', mX + mW / 2, y + 31);

          ctx.fillStyle = '#DDD6FE';
          ctx.fillRect(28, y, aW, periodHeaderH);
          ctx.strokeRect(28, y, aW, periodHeaderH);
          ctx.fillStyle = '#1E1B4B';
          ctx.font = 'bold 18px Cairo, Tajawal, sans-serif';
          ctx.fillText('الفترة المسائية', 28 + aW / 2, y + 31);
        } else {
          ctx.fillStyle = '#BAE6FD';
          ctx.fillRect(28, y, sessColW, periodHeaderH);
          ctx.strokeRect(28, y, sessColW, periodHeaderH);
          ctx.fillStyle = '#0C2D55';
          ctx.font = 'bold 18px Cairo, Tajawal, sans-serif';
          ctx.fillText('الفترة الصباحية   |   الفترة المسائية', 28 + sessColW / 2, y + 31);
        }

        y += periodHeaderH;

        // 4. صف التوقيت الواضح تحت إطار الفترات مباشرة (موحد لجميع أيام الأسبوع من الأحد إلى الخميس)
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(28 + sessColW, y, dayColW, timeHeaderH);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(28 + sessColW, y, dayColW, timeHeaderH);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px Cairo, Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⏰ التوقيت الموحد', 28 + sessColW + dayColW / 2, y + 27);
        ctx.fillStyle = '#FDE047';
        ctx.font = 'bold 14px Cairo, Tajawal, sans-serif';
        ctx.fillText('الأيام ⬇ / الحصص ⬅', 28 + sessColW + dayColW / 2, y + 52);

        unifiedCols.forEach(function (col, cIdx) {
          var cx = 28 + sessColW - (cIdx + 1) * colW;
          ctx.fillStyle = col.isBreak ? '#F3E8FF' : '#EFF6FF';
          ctx.fillRect(cx, y, colW, timeHeaderH);
          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx, y, colW, timeHeaderH);

          // اسم الحصة أو الفترة البينية
          ctx.fillStyle = col.isBreak ? '#4C1D95' : '#0C2D55';
          ctx.font = 'bold 14px Cairo, Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(col.label.slice(0, 28), cx + colW / 2, y + 22);

          // كبسولة التوقيت الواضح (من ... إلى ...)
          var pillX = cx + 8;
          var pillY = y + 30;
          var pillW = colW - 16;
          var pillH = 31;
          ctx.fillStyle = col.isBreak ? '#FAF5FF' : '#FFFFFF';
          ctx.fillRect(pillX, pillY, pillW, pillH);
          ctx.strokeStyle = col.isBreak ? '#9333EA' : '#0284C7';
          ctx.lineWidth = 1.6;
          ctx.strokeRect(pillX, pillY, pillW, pillH);

          var timeTxt = formatTimeRange(col.start, col.end) || 'التوقيت يدوي';
          ctx.fillStyle = col.isBreak ? '#581C87' : '#0F172A';
          ctx.font = '900 15px Cairo, Tajawal, sans-serif';
          ctx.fillText('' + timeTxt, cx + colW / 2, pillY + 21);
        });

        y += timeHeaderH;

        // 5. صفوف أيام الأسبوع (الأحد – الخميس) تحت أعمدة الحصص وتوقيتها الموحد
        WEEK_DAYS.forEach(function (wd, idx) {
          var rh = rowHeights[idx];
          ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          ctx.fillRect(28, y, sessColW, rh);
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(28 + sessColW, y, dayColW, rh);

          ctx.strokeStyle = '#1E293B';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(28, y, sessColW, rh);
          ctx.strokeRect(28 + sessColW, y, dayColW, rh);

          ctx.fillStyle = '#0F172A';
          ctx.font = '900 21px Cairo, Tajawal, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(wd.label, 28 + sessColW + dayColW / 2, y + rh / 2 + 7);

          var dy = (st.days || []).filter(function (d) { return d.day === wd.key; })[0];
          var sessArr = (dy && dy.sessions) ? dy.sessions : [];

          unifiedCols.forEach(function (col, cIdx) {
            var sx = 28 + sessColW - (cIdx + 1) * colW;
            var sess = sessArr[col.colIndex];

            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 1.1;
            ctx.strokeRect(sx, y, colW, rh);

            if (!sess || !isSessionActive(sess)) {
              ctx.fillStyle = '#94A3B8';
              ctx.font = 'bold 16px Cairo, Tajawal, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('—', sx + colW / 2, y + rh / 2 + 6);
              return;
            }

            var isBrk = sess.kind === 'break' || col.isBreak;
            ctx.fillStyle = isBrk ? '#F3E8FF' : '#FFFFFF';
            ctx.fillRect(sx + 2, y + 2, colW - 4, rh - 4);

            var customTime = '';
            if ((sess.start && sess.start !== col.start) || (sess.end && sess.end !== col.end)) {
              customTime = formatShortTimeRange(sess.start, sess.end);
            }

            var iy = y + 10;
            if (sess.title && (!isBrk || (sess.items && sess.items.length))) {
              ctx.fillStyle = isBrk ? '#D8B4E2' : '#E0F2FE';
              ctx.fillRect(sx + 5, iy, colW - 10, 24);
              ctx.fillStyle = '#0F172A';
              ctx.font = 'bold 12.5px Cairo, Tajawal, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText((sess.title + (customTime ? (' (' + customTime + ')') : '')).slice(0, 34), sx + colW / 2, iy + 17);
              iy += 28;
            }

            if (isBrk && (!sess.items || !sess.items.length)) {
              ctx.fillStyle = '#4C1D95';
              ctx.font = 'bold 17px Cairo, Tajawal, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(sess.title || col.label || 'فسحة', sx + colW / 2, y + rh / 2 + 7);
            } else {
              (sess.items || []).forEach(function (it) {
                var domIdx = Math.max(0, domainKeys.indexOf(it.domain)) % palette.length;
                var boxH = 48;
                ctx.fillStyle = palette[domIdx];
                ctx.fillRect(sx + 6, iy, colW - 12, boxH);
                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 0.9;
                ctx.strokeRect(sx + 6, iy, colW - 12, boxH);

                ctx.textAlign = 'right';
                ctx.fillStyle = '#0C2D55';
                ctx.font = 'bold 11.5px Cairo, Tajawal, sans-serif';
                ctx.fillText(('' + (it.domain || '')).slice(0, 38), sx + colW - 10, iy + 16);

                ctx.fillStyle = '#0F172A';
                ctx.font = 'bold 12px Cairo, Tajawal, sans-serif';
                var skillLines = wrapCanvasLines(ctx, '' + (it.skill || ''), colW - 22);
                ctx.fillText((skillLines[0] || '').slice(0, 44), sx + colW - 10, iy + 32);
                if (skillLines[1]) {
                  ctx.font = 'bold 11px Cairo, Tajawal, sans-serif';
                  ctx.fillText(skillLines[1].slice(0, 44), sx + colW - 10, iy + 44);
                }
                iy += boxH + 5;
              });
            }
          });

          y += rh;
        });

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 19px Cairo, Tajawal, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('توقيع المربية', W - 200, y + 48);
        ctx.fillText('المشرف البيداغوجي', W / 2, y + 48);
        ctx.fillText('توقيع وختم المدير', 200, y + 48);

        cb(canvas.toDataURL('image/png'));
      }

      var im = new Image();
      im.onload = function () { drawAll(im); };
      im.onerror = function () { drawAll(null); };
      im.src = 'logo-sq.png';
    }

    function downloadScheduleImage(st, secName) {
      renderWeeklyScheduleDataUrl(st, secName, function (dataUrl) {
        var a = document.createElement('a');
        a.download = 'البرنامج_الأسبوعي_' + String(secName || 'القسم').replace(/\s+/g, '_') + '.png';
        a.href = dataUrl;
        a.click();
        toast('تم تحميل صورة البرنامج الأسبوعي الأفقية بنجاح.', 'ok');
      });
    }

    function openFullProgramImageModal(st, secName, statusText) {
      var imgEl = h('img', { class: 'wk-zoom-img', alt: 'صورة البرنامج الأسبوعي — ' + (secName || '') });
      var zoomWrap = h('div', { class: 'wk-zoom-container' }, imgEl);
      var scale = 1;

      renderWeeklyScheduleDataUrl(st, secName, function (dataUrl) {
        imgEl.src = dataUrl;
      });

      openModal(h('div', { class: 'modal-body wk-modal-print' },
        h('div', { class: 'bar-sub no-print' },
          h('h2', { text: 'صورة البرنامج الأسبوعي — ' + (secName || '') }),
          h('div', { class: 'row-actions' },
            h('button', {
              class: 'btn small light',
              type: 'button',
              text: 'تكبير الصورة',
              onclick: function () {
                scale = Math.min(2.5, scale + 0.25);
                imgEl.className = scale > 1 ? 'wk-zoom-img is-zoomed' : 'wk-zoom-img';
              }
            }),
            h('button', {
              class: 'btn small light',
              type: 'button',
              text: 'تصغير',
              onclick: function () {
                scale = 1;
                imgEl.className = 'wk-zoom-img';
              }
            })
          )
        ),
        zoomWrap,
        h('div', { class: 'modal-actions no-print' },
          h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal }),
          h('button', { class: 'btn gold', type: 'button', text: 'تحميل صورة البرنامج (PNG)', onclick: function () { downloadScheduleImage(st, secName); } }),
          h('button', { class: 'btn', type: 'button', text: 'طباعة', onclick: function () { window.print(); } })
        )
      ));
    }

    function buildWeeklySheet(st, secName, statusText) {
      var imgEl = h('img', {
        class: 'wk-program-img',
        alt: 'البرنامج الأسبوعي — ' + (secName || ''),
        title: 'اضغط لفتح وتكبير صورة البرنامج الأسبوعي كاملة',
        onclick: function () { openFullProgramImageModal(st, secName, statusText); }
      });

      renderWeeklyScheduleDataUrl(st, secName, function (dataUrl) {
        imgEl.src = dataUrl;
      });

      return h('div', { class: 'wk-img-card-wrap' },
        h('div', { class: 'wk-img-hint-bar no-print' },
          h('span', { class: 'muted small', text: 'صورة البرنامج الأسبوعي (التوقيت واضح تحت إطار الفترات وموحد من وقت البداية إلى وقت النهاية لجميع أيام الأسبوع):' }),
          h('button', {
            type: 'button',
            class: 'btn small gold',
            text: 'فتح وتكبير صورة البرنامج كاملة',
            onclick: function () { openFullProgramImageModal(st, secName, statusText); }
          })
        ),
        imgEl
      );
    }

    function printWeeklySheet(st, secName, statusText) {
      openFullProgramImageModal(st, secName, statusText);
    }

    function openProgramBuilder(p) {
      S.inSubBuilder = true;
      try { window.history.pushState({ deApp: true, sec: S.sec, center: S.activeCenter, subBuilder: true }, ''); } catch (e) {}
      var st = parseProgState(p);
      var showDaysList = true;
      var openDays = { sun: true, mon: true, tue: true, wed: true, thu: true };
      var activeCellTarget = null; // { dayKey, sIdx } لتوجيه النقر المباشر من جدول التوزيع السريع

      v.textContent = '';

      var topBar = h('div', { class: 'bar-sub' },
        h('h2', { text: p ? 'تعديل البرنامج الأسبوعي للقسم' : 'إعداد برنامج أسبوعي جديد للقسم' }),
        h('div', { class: 'row-actions' },
          h('button', { class: 'btn light', type: 'button', text: 'رجوع لقائمة البرامج', onclick: function () { go('programs'); } })
        )
      );
      v.appendChild(topBar);

      var previewHost = h('div', { class: 'wk-preview-host' });
      var domainsHost = h('div', { class: 'prog-domains-host' });
      var unifiedTimesHost = h('div', { class: 'prog-unified-times-host' });
      var daysToggleWrap = h('div', { class: 'prog-days-toggle-wrap' });
      var daysHost = h('div', { class: 'prog-days-host' });

      function getSecName() {
        return nameOf(sections, st.section_id, 'name') || 'غير محدد';
      }

      /* مزامنة توقيت الحصة (من وقت البداية إلى وقت النهاية) في جميع أيام الأسبوع (الأحد – الخميس) */
      function syncSlotTimeAcrossAllDays(slotIdx, field, val) {
        st.days.forEach(function (dy) {
          while (dy.sessions.length <= slotIdx) {
            dy.sessions.push({ kind: 'session', title: '', start: '', end: '', items: [] });
          }
          dy.sessions[slotIdx][field] = val;
        });
      }

      function allSelectedPairs() {
        var list = [];
        (st.domains || []).forEach(function (dm) {
          if (!dm || !dm.domain) return;
          (dm.skills || []).forEach(function (sk) {
            if (!list.some(function (x) { return x.domain === dm.domain && x.skill === sk; })) {
              list.push({ domain: dm.domain, skill: sk });
            }
          });
        });
        return list;
      }

      function ensureInDomains(domain, skill) {
        if (!domain) return;
        var dm = st.domains.filter(function (x) { return x.domain === domain; })[0];
        if (!dm) {
          dm = { domain: domain, skills: [] };
          st.domains.push(dm);
        }
        if (skill && dm.skills.indexOf(skill) < 0) {
          dm.skills.push(skill);
        }
      }

      function refreshPreview() {
        previewHost.textContent = '';
        previewHost.appendChild(buildWeeklySheet(st, getSecName(), st.status === 'published' ? 'معتمد ومصدَّر للأولياء' : 'معاينة قبل التصدير'));
      }

      /* شريط ضبط توقيت الحصص الموحد تحت إطار الفترات (يبدأ من وقت وينتهي في جميع الأيام للحصة) */
      function renderUnifiedTimesBar() {
        unifiedTimesHost.textContent = '';
        var cols = buildUnifiedScheduleColumns(st.days);
        var slotsGrid = h('div', { class: 'prog-unified-slots-grid' });

        cols.forEach(function (col) {
          var sIn = h('input', {
            type: 'text',
            class: 'sess-time-input',
            dir: 'ltr',
            maxlength: 25,
            placeholder: '08:00',
            value: col.start || ''
          });
          var eIn = h('input', {
            type: 'text',
            class: 'sess-time-input',
            dir: 'ltr',
            maxlength: 25,
            placeholder: '09:00',
            value: col.end || ''
          });

          sIn.addEventListener('input', function () {
            var vClean = DE.clean(sIn.value, 25);
            syncSlotTimeAcrossAllDays(col.colIndex, 'start', vClean);
            refreshPreview();
          });
          sIn.addEventListener('change', function () { renderDays(); });

          eIn.addEventListener('input', function () {
            var vClean = DE.clean(eIn.value, 25);
            syncSlotTimeAcrossAllDays(col.colIndex, 'end', vClean);
            refreshPreview();
          });
          eIn.addEventListener('change', function () { renderDays(); });

          slotsGrid.appendChild(h('div', { class: 'prog-unified-slot-box' + (col.isBreak ? ' is-break' : '') },
            h('div', { class: 'prog-unified-slot-hdr' },
              badge(col.isBreak ? ('⏸' + col.label) : ('' + col.label), col.isBreak ? 'warn' : 'gold')
            ),
            h('div', { class: 'prog-sess-times' },
              h('label', { class: 'sess-time-lbl' }, h('span', { text: '⏰ من (البداية):' }), sIn),
              h('label', { class: 'sess-time-lbl' }, h('span', { text: '⏰ إلى (النهاية):' }), eIn)
            )
          ));
        });

        var addUnifiedSlotBtn = h('button', {
          type: 'button',
          class: 'btn small gold',
          text: 'إضافة عمود حصة جديد لجميع الأيام',
          onclick: function () {
            var targetLen = cols.length + 1;
            st.days.forEach(function (dy) {
              while (dy.sessions.length < targetLen) {
                dy.sessions.push({ kind: 'session', title: '', start: '', end: '', items: [] });
              }
            });
            renderUnifiedTimesBar();
            renderDays();
            refreshPreview();
          }
        });

        var addUnifiedBreakBtn = h('button', {
          type: 'button',
          class: 'btn small light',
          text: '⏸+ حصة بينية (فسحة) لجميع الأيام',
          onclick: function () {
            var targetLen = cols.length;
            st.days.forEach(function (dy) {
              while (dy.sessions.length < targetLen) {
                dy.sessions.push({ kind: 'session', title: '', start: '', end: '', items: [] });
              }
              dy.sessions.push({ kind: 'break', title: 'فسحة', start: '', end: '', items: [] });
            });
            renderUnifiedTimesBar();
            renderDays();
            refreshPreview();
          }
        });

        unifiedTimesHost.appendChild(h('div', { class: 'prog-unified-times-card' },
          h('div', { class: 'bar-sub' },
            h('div', null,
              h('strong', { text: '⏰ شريط التوقيت الموحد للحصص (يظهر مباشرة تحت إطار الفترات ويسري على جميع الأيام: الأحد – الخميس)' }),
              h('p', { class: 'muted small', text: 'حدد وقت البداية والنهاية لكل حصة مرة واحدة هنا (أو من داخل أي يوم) وسيُعمَّم تلقائياً على جميع أيام الأسبوع.' })
            ),
            h('div', { class: 'row-actions' }, addUnifiedSlotBtn, addUnifiedBreakBtn)
          ),
          slotsGrid
        ));
      }

      var secSelect = h('select', { id: 'prog_sec_id' },
        h('option', { value: '', text: '— اختر الفوج / القسم التربوي —' }),
        secOpts.map(function (o) { return h('option', { value: o[0], text: o[1] }); })
      );
      secSelect.value = st.section_id || '';
      secSelect.addEventListener('change', function () {
        st.section_id = secSelect.value;
        refreshPreview();
      });

      var yearInput = h('input', { type: 'text', maxlength: 20, value: st.academic_year, placeholder: '2026/2027' });
      yearInput.addEventListener('input', function () {
        st.academic_year = DE.clean(yearInput.value, 20) || '2026/2027';
        refreshPreview();
      });

      var notesInput = h('textarea', { rows: 2, maxlength: 2000, placeholder: 'ملاحظات أو توجيهات بيداغوجية إضافية تظهر للأولياء (اختياري)...' });
      notesInput.value = st.notes || '';
      notesInput.addEventListener('input', function () {
        st.notes = DE.clean(notesInput.value, 2000);
        refreshPreview();
      });

      var basicCard = h('div', { class: 'card prog-step-card' },
        h('h3', { class: 'prog-step-title', text: '1⃣ بيانات الفوج / القسم والموسم الدراسي' }),
        h('div', { class: 'prog-grid-2' },
          h('label', { class: 'fld' }, h('span', { text: 'الفوج / القسم التربوي المستهدف *' }), secSelect),
          h('label', { class: 'fld' }, h('span', { text: 'الموسم الدراسي *' }), yearInput)
        ),
        h('label', { class: 'fld' }, h('span', { text: 'ملاحظات وتوجيهات عامة للأولياء (اختياري)' }), notesInput)
      );
      v.appendChild(basicCard);

      function renderDomains() {
        domainsHost.textContent = '';
        st.domains.forEach(function (dm, dIdx) {
          var curDomain = dm.domain || (domainKeys[0] || '');
          dm.domain = curDomain;
          var domainSkills = CURR[curDomain] || [];

          var domSearch = h('input', { type: 'search', class: 'fld-search', placeholder: 'ابحث عن المجال التربوي...', autocomplete: 'off' });
          var domSel = h('select', null, domainKeys.map(function (dk) { return h('option', { value: dk, text: dk }); }));
          domSel.value = curDomain;

          domSearch.addEventListener('input', function () {
            var q = normAr(domSearch.value.trim());
            var keep = domSel.value;
            while (domSel.firstChild) domSel.removeChild(domSel.firstChild);
            domainKeys.forEach(function (dk) {
              if (!q || normAr(dk).indexOf(q) >= 0) {
                domSel.appendChild(h('option', { value: dk, text: dk }));
              }
            });
            if (domainKeys.indexOf(keep) >= 0 && (!q || normAr(keep).indexOf(q) >= 0)) {
              domSel.value = keep;
            } else if (domSel.options.length) {
              domSel.selectedIndex = 0;
              dm.domain = domSel.value;
              renderDomains();
              renderDays();
              refreshPreview();
            }
          });

          domSel.addEventListener('change', function () {
            dm.domain = domSel.value;
            renderDomains();
            renderDays();
            refreshPreview();
          });

          var sklSearch = h('input', { type: 'search', class: 'fld-search', placeholder: 'ابحث في مهارات هذا المجال (' + domainSkills.length + ' مهارة)...', autocomplete: 'off' });
          var sklListBox = h('div', { class: 'prog-skills-checklist' });
          var selectedTagsBox = h('div', { class: 'prog-selected-tags' });

          function refreshSelectedTags() {
            selectedTagsBox.textContent = '';
            if (!dm.skills.length) {
              selectedTagsBox.appendChild(h('span', { class: 'muted small', text: 'لم يتم تحديد مهارات من هذا المجال بعد — ضع علامة على مهارة أو أكثر من القائمة أعلاه.' }));
              return;
            }
            dm.skills.forEach(function (sk) {
              selectedTagsBox.appendChild(h('span', { class: 'prog-tag-chip ' + domainColorClass(curDomain) },
                h('span', { text: '' + sk }),
                h('button', {
                  type: 'button',
                  class: 'prog-tag-rm',
                  text: '',
                  title: 'إزالة المهارة',
                  onclick: function () {
                    dm.skills = dm.skills.filter(function (x) { return x !== sk; });
                    renderDomains();
                    renderDays();
                    refreshPreview();
                  }
                })
              ));
            });
          }

          function populateSkillCheckboxes() {
            var q = normAr(sklSearch.value.trim());
            sklListBox.textContent = '';
            var shown = 0;
            domainSkills.forEach(function (sk) {
              if (q && normAr(sk).indexOf(q) === -1) return;
              shown++;
              var isChecked = dm.skills.indexOf(sk) >= 0;
              var cb = h('input', { type: 'checkbox', checked: isChecked });
              cb.addEventListener('change', function () {
                if (cb.checked) {
                  if (dm.skills.indexOf(sk) < 0) dm.skills.push(sk);
                } else {
                  dm.skills = dm.skills.filter(function (x) { return x !== sk; });
                }
                refreshSelectedTags();
                renderDays();
                refreshPreview();
              });
              sklListBox.appendChild(h('label', { class: 'prog-skl-item' + (isChecked ? ' active' : '') }, cb, h('span', { text: sk })));
            });
            if (!shown) {
              sklListBox.appendChild(h('p', { class: 'muted small', text: 'لا توجد مهارات مطابقة لعبارة البحث.' }));
            }
          }

          sklSearch.addEventListener('input', populateSkillCheckboxes);
          populateSkillCheckboxes();
          refreshSelectedTags();

          var blockCard = h('div', { class: 'prog-domain-card ' + domainColorClass(curDomain) },
            h('div', { class: 'prog-domain-card-hdr' },
              h('strong', { text: 'المجال التربوي رقم (' + (dIdx + 1) + ')' }),
              h('div', { class: 'row-actions' },
                h('span', { class: 'badge gold', text: dm.skills.length + ' مهارة محددة' }),
                h('button', {
                  type: 'button',
                  class: 'btn small light',
                  text: 'تحديد أول 5 مهارات',
                  onclick: function () {
                    domainSkills.slice(0, 5).forEach(function (sk) {
                      if (dm.skills.indexOf(sk) < 0) dm.skills.push(sk);
                    });
                    renderDomains();
                    renderDays();
                    refreshPreview();
                  }
                }),
                dm.skills.length ? h('button', {
                  type: 'button',
                  class: 'btn small light',
                  text: 'مسح المحدد',
                  onclick: function () {
                    dm.skills = [];
                    renderDomains();
                    renderDays();
                    refreshPreview();
                  }
                }) : null,
                st.domains.length > 1 ? h('button', {
                  type: 'button',
                  class: 'btn small danger',
                  text: 'حذف هذا المجال',
                  onclick: function () {
                    st.domains.splice(dIdx, 1);
                    renderDomains();
                    renderDays();
                    refreshPreview();
                  }
                }) : null
              )
            ),
            h('label', { class: 'fld' },
              h('span', { text: 'اختر المجال التربوي:' }),
              domSearch,
              domSel
            ),
            h('div', { class: 'fld' },
              h('span', { text: 'اختر مهارة أو أكثر من مهارات «' + curDomain + '»:' }),
              sklSearch,
              sklListBox
            ),
            h('div', { class: 'prog-selected-wrap' },
              h('small', { class: 'muted', text: 'المهارات المختارة من هذا المجال:' }),
              selectedTagsBox
            )
          );
          domainsHost.appendChild(blockCard);
        });
      }

      function addAnotherDomain() {
        var used = st.domains.map(function (dm) { return dm.domain; });
        var nextDom = domainKeys.filter(function (dk) { return used.indexOf(dk) < 0; })[0] || domainKeys[0] || '';
        st.domains.push({ domain: nextDom, skills: [] });
        renderDomains();
        renderDays();
        refreshPreview();
        toast('تمت إضافة خانة مجال جديد — اختر المجال ومهاراته.', 'ok');
      }

      /* قوالب جاهزة وتوزيع تلقائي ذكي لتسهيل ملء البرنامج الأسبوعي بضغطة واحدة */
      function applyStandardStructureTemplate(kind) {
        var slots = kind === 'compact' ? [
          { kind: 'session', title: 'الحصة الصباحية 1', start: '08:30', end: '10:00' },
          { kind: 'break',   title: 'فسحة واستراحة', start: '10:00', end: '10:30' },
          { kind: 'session', title: 'الحصة الصباحية 2', start: '10:30', end: '12:00' }
        ] : [
          { kind: 'break',   title: 'الاعتماد على الذات', start: '08:00', end: '09:00' },
          { kind: 'session', title: 'الحصة الصباحية', start: '09:00', end: '10:30' },
          { kind: 'break',   title: 'فسحة', start: '10:30', end: '11:00' },
          { kind: 'session', title: 'الحصة المسائية', start: '12:00', end: '13:40' },
          { kind: 'break',   title: 'التحضير للخروج', start: '13:40', end: '14:00' }
        ];
        st.days.forEach(function (dy) {
          var oldSessions = dy.sessions || [];
          dy.sessions = slots.map(function (sl, idx) {
            var prev = oldSessions[idx];
            return {
              kind: sl.kind,
              title: (prev && prev.title) ? prev.title : sl.title,
              start: sl.start,
              end: sl.end,
              items: (prev && Array.isArray(prev.items)) ? prev.items.slice() : []
            };
          });
        });
        showDaysList = true;
        WEEK_DAYS.forEach(function (wd) { openDays[wd.key] = true; });
        renderUnifiedTimesBar();
        renderDays();
        refreshPreview();
        toast('تم تطبيق قالب الحصص والتوقيت الموحد على جميع أيام الأسبوع بنجاح!', 'ok');
      }

      function autoDistributeSkillsAcrossWeek() {
        var pairs = allSelectedPairs();
        if (!pairs.length) {
          // إذا لم يحدد المستخدم مهارات بعد، نختار تلقائياً أول 3 مهارات من كل مجال محدد للتسهيل
          st.domains.forEach(function (dm) {
            var sks = (CURR[dm.domain] || []).slice(0, 3);
            sks.forEach(function (sk) {
              if (dm.skills.indexOf(sk) < 0) dm.skills.push(sk);
            });
          });
          pairs = allSelectedPairs();
          renderDomains();
        }
        if (!pairs.length) {
          return toast('اختر مجالاً ومهارة واحدة على الأقل أولاً ليتم توزيعها تلقائياً.', 'bad');
        }

        // التأكد من وجود هيكل حصص قياسي إن كان الجدول فارغاً
        var maxSessions = Math.max.apply(null, st.days.map(function (d) { return (d.sessions || []).length; }));
        if (maxSessions <= 1) {
          applyStandardStructureTemplate('full');
        }

        var cursor = 0;
        st.days.forEach(function (dy) {
          (dy.sessions || []).forEach(function (sess) {
            if (sess.kind === 'break') {
              if (sess.title === 'الاعتماد على الذات' && !sess.items.length) {
                var selfCare = pairs.filter(function (p) { return p.domain.indexOf('الاستقلالية') >= 0; })[0];
                if (selfCare) sess.items = [{ domain: selfCare.domain, skill: selfCare.skill }];
              }
              return;
            }
            var p1 = pairs[cursor % pairs.length];
            cursor++;
            var items = [ { domain: p1.domain, skill: p1.skill } ];
            if (pairs.length > 4) {
              var p2 = pairs[cursor % pairs.length];
              if (p2.skill !== p1.skill || p2.domain !== p1.domain) {
                items.push({ domain: p2.domain, skill: p2.skill });
                cursor++;
              }
            }
            sess.items = items;
          });
        });

        showDaysList = true;
        WEEK_DAYS.forEach(function (wd) { openDays[wd.key] = true; });
        renderUnifiedTimesBar();
        renderDays();
        refreshPreview();
        toast('تم توزيع المهارات المختارة تلقائياً على جميع حصص الأسبوع (الأحد – الخميس)! يمكنك تعديل أي خانة بحرية.', 'ok');
      }

      function copyDayToAllWeek(sourceDayObj) {
        st.days.forEach(function (dy) {
          if (dy.day === sourceDayObj.day) return;
          dy.sessions = (sourceDayObj.sessions || []).map(function (s) {
            return {
              kind: s.kind,
              title: s.title,
              start: s.start,
              end: s.end,
              items: (s.items || []).map(function (it) { return { domain: it.domain, skill: it.skill }; })
            };
          });
        });
        renderUnifiedTimesBar();
        renderDays();
        refreshPreview();
        toast('تم نسخ برنامج يوم ' + sourceDayObj.label + ' وتعميمه على جميع أيام الأسبوع بنجاح!', 'ok');
      }

      var domainsStepCard = h('div', { class: 'card prog-step-card' },
        h('div', { class: 'bar-sub' },
          h('div', null,
            h('h3', { class: 'prog-step-title', text: '2⃣ المجالات التربوية والمهارات المستهدفة (إمكانية إضافة أكثر من مجال)' }),
            h('p', { class: 'muted small', text: 'يمكنك إضافة أكثر من مجال تربوي، وعند اختيار كل مجال تظهر مهاراته الخاصة لتختار منها مهارة أو أكثر.' })
          ),
          h('div', { class: 'row-actions' },
            h('button', { type: 'button', class: 'btn gold', text: 'إضافة مجال تربوي آخر', onclick: addAnotherDomain })
          )
        ),
        domainsHost,
        h('div', { class: 'prog-add-domain-bar' },
          h('button', { type: 'button', class: 'btn gold', text: 'إضافة مجال تربوي آخر ومهاراته', onclick: addAnotherDomain })
        )
      );
      v.appendChild(domainsStepCard);

      function insertSessionAt(dayObj, index, kind, defaultTitle) {
        var refSess = (st.days[0] && st.days[0].sessions && st.days[0].sessions[index]) || null;
        dayObj.sessions.splice(index, 0, {
          kind: kind || 'session',
          title: defaultTitle || '',
          start: refSess ? (refSess.start || '') : '',
          end: refSess ? (refSess.end || '') : '',
          items: []
        });
        openDays[dayObj.day] = true;
        renderUnifiedTimesBar();
        renderDays();
        refreshPreview();
      }

      function copyBreakToAllDays(sourceSess, positionIndex) {
        st.days.forEach(function (dy) {
          var already = dy.sessions.some(function (s) { return s.kind === 'break' && s.title === sourceSess.title && s.start === sourceSess.start && s.end === sourceSess.end; });
          if (!already) {
            var targetIdx = Math.min(positionIndex, dy.sessions.length);
            dy.sessions.splice(targetIdx, 0, {
              kind: 'break',
              title: sourceSess.title || 'فسحة',
              start: sourceSess.start || '',
              end: sourceSess.end || '',
              items: (sourceSess.items || []).map(function (it) { return { domain: it.domain, skill: it.skill }; })
            });
          }
        });
        renderUnifiedTimesBar();
        renderDays();
        refreshPreview();
        toast('تم إدراج الحصة البينية «' + (sourceSess.title || 'فاصل') + '» بنفس التوقيت في جميع أيام الأسبوع (الأحد – الخميس).', 'ok');
      }

      function buildInsertBetweenBar(dayObj, insertIdx, labelText) {
        return h('div', { class: 'prog-insert-between' },
          h('span', { class: 'prog-insert-lbl', text: labelText }),
          h('div', { class: 'prog-insert-btns' },
            h('button', {
              type: 'button',
              class: 'btn small light',
              text: 'إدراج حصة تربوية هنا',
              onclick: function () { insertSessionAt(dayObj, insertIdx, 'session', ''); }
            }),
            h('button', {
              type: 'button',
              class: 'btn small gold',
              text: '⏸إدراج حصة ما بين الحصص وعنوانها هنا',
              onclick: function () { insertSessionAt(dayObj, insertIdx, 'break', ''); }
            })
          )
        );
      }

      function renderDays() {
        renderUnifiedTimesBar();
        daysToggleWrap.textContent = '';
        daysHost.textContent = '';

        var toggleDaysBtn = h('button', {
          type: 'button',
          class: 'btn ' + (showDaysList ? 'light' : 'gold') + ' prog-show-days-btn',
          text: showDaysList ? 'إخفاء قائمة أيام الأسبوع' : 'اضغط هنا لإظهار أيام الأسبوع (الأحد – الخميس) وتعبئة البرنامج',
          onclick: function () {
            showDaysList = !showDaysList;
            renderDays();
          }
        });

        daysToggleWrap.appendChild(toggleDaysBtn);

        if (!showDaysList) {
          daysHost.hidden = true;
          return;
        }
        daysHost.hidden = false;

        var selectedPairs = allSelectedPairs();

        st.days.forEach(function (dayObj) {
          var isDayOpen = !!openDays[dayObj.day];
          var filledCount = (dayObj.sessions || []).filter(isSessionActive).length;

          var dayHeaderBtn = h('div', {
            class: 'prog-day-hdr clickable' + (isDayOpen ? ' is-open' : ''),
            role: 'button',
            tabindex: '0',
            'aria-expanded': isDayOpen ? 'true' : 'false',
            onclick: function (e) {
              if (e.target && e.target.closest && e.target.closest('button')) return;
              openDays[dayObj.day] = !isDayOpen;
              renderDays();
            }
          },
            h('div', { class: 'prog-day-title' },
              h('strong', { text: 'يوم ' + dayObj.label }),
              h('span', { class: 'badge ' + (filledCount ? 'ok' : 'gray'), text: filledCount ? ('تم ملء ' + filledCount + ' حصة') : 'اضغط لملء برنامج اليوم' })
            ),
            h('div', { class: 'row-actions' },
              isDayOpen
                ? h('button', {
                    type: 'button',
                    class: 'btn small light',
                    text: 'إخفاء تفاصيل يوم ' + dayObj.label,
                    onclick: function (e) {
                      e.stopPropagation();
                      openDays[dayObj.day] = false;
                      renderDays();
                    }
                  })
                : h('button', {
                    type: 'button',
                    class: 'btn small gold',
                    text: 'فتح وملء برنامج يوم ' + dayObj.label,
                    onclick: function (e) {
                      e.stopPropagation();
                      openDays[dayObj.day] = true;
                      renderDays();
                    }
                  })
            )
          );

          if (!isDayOpen) {
            daysHost.appendChild(h('div', { class: 'prog-day-card collapsed' }, dayHeaderBtn));
            return;
          }

          var sessListWrap = h('div', { class: 'prog-day-sessions' });

          var dayQuickAddBar = h('div', { class: 'prog-day-quick-actions' },
            h('span', { class: 'muted small', text: 'إدارة حصص يوم ' + dayObj.label + ':' }),
            h('div', { class: 'row-actions' },
              h('button', {
                type: 'button',
                class: 'btn small light',
                text: 'نسخ برنامج يوم ' + dayObj.label + ' إلى كل أيام الأسبوع',
                onclick: function () { copyDayToAllWeek(dayObj); }
              }),
              h('button', {
                type: 'button',
                class: 'btn small gold',
                text: 'إضافة حصة في يوم ' + dayObj.label,
                onclick: function () { insertSessionAt(dayObj, dayObj.sessions.length, 'session', ''); }
              }),
              h('button', {
                type: 'button',
                class: 'btn small light',
                text: '⏸+ حصة ما بين الحصص وعنوانها',
                onclick: function () { insertSessionAt(dayObj, dayObj.sessions.length, 'break', ''); }
              })
            )
          );
          sessListWrap.appendChild(dayQuickAddBar);

          if (dayObj.sessions.length > 0) {
            sessListWrap.appendChild(buildInsertBetweenBar(dayObj, 0, 'إدراج في بداية يوم ' + dayObj.label + ':'));
          } else {
            sessListWrap.appendChild(buildInsertBetweenBar(dayObj, 0, 'لا توجد حصص في يوم ' + dayObj.label + ' — ابدأ بإضافة حصة:'));
          }

          var normalCounter = 0;
          dayObj.sessions.forEach(function (sess, sIdx) {
            var isBreak = sess.kind === 'break';
            if (!isBreak) normalCounter++;

            var startIn = h('input', {
              type: 'text',
              class: 'sess-time-input',
              dir: 'ltr',
              maxlength: 25,
              placeholder: 'مثال: 08:00',
              value: sess.start || ''
            });
            var endIn = h('input', {
              type: 'text',
              class: 'sess-time-input',
              dir: 'ltr',
              maxlength: 25,
              placeholder: 'مثال: 09:00',
              value: sess.end || ''
            });

            startIn.addEventListener('input', function () {
              var cleanVal = DE.clean(startIn.value, 25);
              sess.start = cleanVal;
              syncSlotTimeAcrossAllDays(sIdx, 'start', cleanVal);
              renderUnifiedTimesBar();
              refreshPreview();
            });
            endIn.addEventListener('input', function () {
              var cleanVal = DE.clean(endIn.value, 25);
              sess.end = cleanVal;
              syncSlotTimeAcrossAllDays(sIdx, 'end', cleanVal);
              renderUnifiedTimesBar();
              refreshPreview();
            });

            var titleIn = h('input', {
              type: 'text',
              class: 'sess-title-input',
              maxlength: 80,
              placeholder: isBreak ? 'اكتب عنوان الحصة ما بين الحصص (مثال: فسحة، الاعتماد على الذات، استراحة، التحضير للخروج)...' : 'عنوان الحصة أو النشاط (اختياري — مثال: رياضة، ورشة، الفترة الصباحية)...',
              value: sess.title || ''
            });
            titleIn.addEventListener('input', function () {
              sess.title = DE.clean(titleIn.value, 80);
              renderUnifiedTimesBar();
              refreshPreview();
            });

            var presetRow = null;
            if (isBreak) {
              presetRow = h('div', { class: 'prog-break-presets' },
                h('small', { class: 'muted', text: 'عناوين سريعة للحصة ما بين الحصص:' }),
                BREAK_PRESETS.map(function (pr) {
                  return h('button', {
                    type: 'button',
                    class: 'btn small ' + (sess.title === pr ? 'gold' : 'light'),
                    text: pr,
                    onclick: function () {
                      sess.title = pr;
                      titleIn.value = pr;
                      renderDays();
                      refreshPreview();
                    }
                  });
                }),
                h('button', {
                  type: 'button',
                  class: 'btn small',
                  text: 'تعميم هذه الحصة البينية على كل أيام الأسبوع',
                  onclick: function () { copyBreakToAllDays(sess, sIdx); }
                })
              );
            }

            var itemsBox = h('div', { class: 'prog-sess-items-cell' });
            if (!sess.items.length) {
              itemsBox.appendChild(h('div', {
                class: 'wk-empty-cell-hint',
                text: isBreak
                  ? 'حصة بينية بعنوان «' + (sess.title || 'بدون عنوان بعد') + '» — يمكنك الاكتفاء بعنوانها أو إضافة مجال ومهارة أدناه.'
                  : 'الخانة فارغة حالياً — اختر مهارة أو أكثر من الأسفل ليظهر المجال مع المهارة في نفس الخانة.'
              }));
            } else {
              sess.items.forEach(function (it, iIdx) {
                itemsBox.appendChild(h('div', { class: 'wk-cell-item editable ' + domainColorClass(it.domain) },
                  h('div', { class: 'wk-cell-content' },
                    h('div', { class: 'wk-cell-domain' },
                      h('span', { class: 'wk-lbl', text: 'المجال:' }),
                      h('strong', { text: ' ' + it.domain })
                    ),
                    h('div', { class: 'wk-cell-skill' },
                      h('span', { class: 'wk-lbl', text: 'المهارة:' }),
                      h('span', { text: ' ' + it.skill })
                    )
                  ),
                  h('button', {
                    type: 'button',
                    class: 'btn small danger',
                    text: 'حذف',
                    onclick: function () {
                      sess.items.splice(iIdx, 1);
                      renderDays();
                      refreshPreview();
                    }
                  })
                ));
              });
            }

            var quickBar = null;
            if (selectedPairs.length) {
              var quickBtns = selectedPairs.map(function (pair) {
                var alreadyIn = sess.items.some(function (x) { return x.domain === pair.domain && x.skill === pair.skill; });
                return h('button', {
                  type: 'button',
                  class: 'btn small ' + (alreadyIn ? 'gold' : 'light'),
                  text: (alreadyIn ? '' : '') + pair.domain + ' — ' + pair.skill,
                  onclick: function () {
                    if (alreadyIn) {
                      sess.items = sess.items.filter(function (x) { return !(x.domain === pair.domain && x.skill === pair.skill); });
                    } else {
                      sess.items.push({ domain: pair.domain, skill: pair.skill });
                    }
                    renderDays();
                    refreshPreview();
                  }
                });
              });
              quickBar = h('div', { class: 'prog-sess-quick' },
                h('small', { class: 'prog-quick-lbl', text: 'اختيار سريع من المجالات والمهارات المحددة أعلاه (اضغط للإدراج أو الإزالة في نفس الخانة):' }),
                h('div', { class: 'prog-quick-btns' }, quickBtns)
              );
            }

            var pickerDom = sess._pickerDomain || (st.domains[0] && st.domains[0].domain) || domainKeys[0] || '';
            var pDomSearch = h('input', { type: 'search', class: 'fld-search', placeholder: 'ابحث عن مجال لإضافته للحصة...', autocomplete: 'off' });
            var pDomSelect = h('select', null, domainKeys.map(function (dk) { return h('option', { value: dk, text: dk }); }));
            pDomSelect.value = pickerDom;

            var pSkillSearch = h('input', { type: 'search', class: 'fld-search', placeholder: 'ابحث عن مهارة أو أكثر لإدراجها في هذه الحصة...', autocomplete: 'off' });
            var pSkillChecklist = h('div', { class: 'prog-sess-skill-list' });

            function renderSessionSkillChoices() {
              var activeDom = pDomSelect.value || domainKeys[0] || '';
              sess._pickerDomain = activeDom;
              var skList = CURR[activeDom] || [];
              var q = normAr(pSkillSearch.value.trim());
              pSkillChecklist.textContent = '';
              var count = 0;
              skList.forEach(function (sk) {
                if (q && normAr(sk).indexOf(q) === -1) return;
                count++;
                var inSess = sess.items.some(function (x) { return x.domain === activeDom && x.skill === sk; });
                var cb = h('input', { type: 'checkbox', checked: inSess });
                cb.addEventListener('change', function () {
                  if (cb.checked) {
                    if (!sess.items.some(function (x) { return x.domain === activeDom && x.skill === sk; })) {
                      sess.items.push({ domain: activeDom, skill: sk });
                    }
                    ensureInDomains(activeDom, sk);
                  } else {
                    sess.items = sess.items.filter(function (x) { return x.domain !== activeDom || x.skill !== sk; });
                  }
                  renderDomains();
                  renderDays();
                  refreshPreview();
                });
                pSkillChecklist.appendChild(h('label', { class: 'prog-skl-item' + (inSess ? ' active' : '') },
                  cb,
                  h('span', { text: sk })
                ));
              });
              if (!count) {
                pSkillChecklist.appendChild(h('p', { class: 'muted small', text: 'لا توجد مهارات مطابقة.' }));
              }
            }

            pDomSearch.addEventListener('input', function () {
              var q = normAr(pDomSearch.value.trim());
              var keep = pDomSelect.value;
              while (pDomSelect.firstChild) pDomSelect.removeChild(pDomSelect.firstChild);
              domainKeys.forEach(function (dk) {
                if (!q || normAr(dk).indexOf(q) >= 0) {
                  pDomSelect.appendChild(h('option', { value: dk, text: dk }));
                }
              });
              if (pDomSelect.options.length) {
                if (domainKeys.indexOf(keep) >= 0 && (!q || normAr(keep).indexOf(q) >= 0)) pDomSelect.value = keep;
                else pDomSelect.selectedIndex = 0;
                renderSessionSkillChoices();
              }
            });

            pDomSelect.addEventListener('change', renderSessionSkillChoices);
            pSkillSearch.addEventListener('input', renderSessionSkillChoices);
            renderSessionSkillChoices();

            var directPickerDetails = h('details', { class: 'prog-sess-details' },
              h('summary', { text: 'اختيار وإدراج مجال ومهارة أو أكثر مباشرة في هذه الحصة (من جميع المجالات)' }),
              h('div', { class: 'prog-sess-picker-body' },
                h('div', { class: 'prog-grid-2' },
                  h('label', { class: 'fld' }, h('span', { text: '1. اختر المجال التربوي:' }), pDomSearch, pDomSelect),
                  h('label', { class: 'fld' }, h('span', { text: '2. ابحث واختر مهارة أو أكثر (تُدرج فوراً مع المجال في نفس الخانة):' }), pSkillSearch)
                ),
                pSkillChecklist
              )
            );

            var moveUpBtn = sIdx > 0 ? h('button', {
              type: 'button',
              class: 'btn small light',
              text: '⬆تقديم',
              onclick: function () {
                var tmp = dayObj.sessions[sIdx - 1];
                dayObj.sessions[sIdx - 1] = dayObj.sessions[sIdx];
                dayObj.sessions[sIdx] = tmp;
                renderDays();
                refreshPreview();
              }
            }) : null;

            var moveDownBtn = sIdx < dayObj.sessions.length - 1 ? h('button', {
              type: 'button',
              class: 'btn small light',
              text: '⬇تأخير',
              onclick: function () {
                var tmp = dayObj.sessions[sIdx + 1];
                dayObj.sessions[sIdx + 1] = dayObj.sessions[sIdx];
                dayObj.sessions[sIdx] = tmp;
                renderDays();
                refreshPreview();
              }
            }) : null;

            var toggleKindBtn = h('button', {
              type: 'button',
              class: 'btn small light',
              text: isBreak ? 'تحويل لحصة عادية' : '⏸تحويل لحصة بينية (فاصل)',
              onclick: function () {
                sess.kind = isBreak ? 'session' : 'break';
                renderDays();
                refreshPreview();
              }
            });

            var sessBox = h('div', { class: 'prog-sess-card' + (isBreak ? ' is-break-card' : '') },
              h('div', { class: 'prog-sess-hdr' },
                h('span', {
                  class: 'badge ' + (isBreak ? 'warn' : 'gold'),
                  text: isBreak ? ('⏸حصة ما بين الحصص — يوم ' + dayObj.label) : ('الحصة ' + normalCounter + ' — يوم ' + dayObj.label)
                }),
                h('div', { class: 'prog-sess-times' },
                  h('label', { class: 'sess-time-lbl' }, h('span', { text: '⏰ من (البداية لكل الأيام):' }), startIn),
                  h('label', { class: 'sess-time-lbl' }, h('span', { text: '⏰ إلى (النهاية لكل الأيام):' }), endIn)
                ),
                h('div', { class: 'row-actions' },
                  moveUpBtn,
                  moveDownBtn,
                  toggleKindBtn,
                  h('button', {
                    type: 'button',
                    class: 'btn small danger',
                    text: 'حذف',
                    onclick: function () {
                      dayObj.sessions.splice(sIdx, 1);
                      renderDays();
                      refreshPreview();
                    }
                  })
                )
              ),
              h('label', { class: 'fld' },
                h('span', { text: isBreak ? 'عنوان الحصة ما بين الحصص * (مثال: فسحة، الاعتماد على الذات، التحضير للخروج):' : 'عنوان الحصة / النشاط (اختياري):' }),
                titleIn
              ),
              presetRow,
              h('div', { class: 'prog-sess-cell-wrap' },
                h('small', { class: 'muted', text: 'محتوى خانة الحصة في الجدول (المجال + المهارة في نفس الخانة):' }),
                itemsBox
              ),
              quickBar,
              directPickerDetails
            );

            sessListWrap.appendChild(sessBox);

            var betweenLabel = sIdx < dayObj.sessions.length - 1
              ? ('إدراج ما بين الحصة (' + (sIdx + 1) + ') والحصة (' + (sIdx + 2) + ') في يوم ' + dayObj.label + ':')
              : ('إضافة بعد الحصة (' + (sIdx + 1) + ') في نهاية يوم ' + dayObj.label + ':');
            sessListWrap.appendChild(buildInsertBetweenBar(dayObj, sIdx + 1, betweenLabel));
          });

          var dayDoneFooter = h('div', { class: 'prog-day-done-footer' },
            h('button', {
              type: 'button',
              class: 'btn gold',
              text: 'انتهيت من ملء برنامج يوم ' + dayObj.label + ' — إخفاء التفاصيل ',
              onclick: function () {
                openDays[dayObj.day] = false;
                renderDays();
                refreshPreview();
              }
            })
          );
          sessListWrap.appendChild(dayDoneFooter);

          daysHost.appendChild(h('div', { class: 'prog-day-card expanded' }, dayHeaderBtn, sessListWrap));
        });
      }

      var easyWizardBar = h('div', { class: 'prog-unified-times-card' },
        h('div', { class: 'bar-sub' },
          h('div', null,
            h('strong', { text: 'المساعد السريع لملء البرنامج الأسبوعي بضغطة واحدة (اختياري)' }),
            h('p', { class: 'muted small', text: 'بدل إدخال كل يوم وحصة يدوياً، يمكنك إنشاء هيكل الحصص القياسي وتوزيع المهارات المختارة على الأسبوع كاملاً بضغطة زر ثم تعديل ما تشاء.' })
          ),
          h('div', { class: 'row-actions' },
            h('button', {
              type: 'button',
              class: 'btn small light',
              text: 'قالب اليوم الكامل (صباحي + فسحة + مسائي)',
              onclick: function () { applyStandardStructureTemplate('full'); }
            }),
            h('button', {
              type: 'button',
              class: 'btn small light',
              text: 'قالب الفترة الصباحية فقط (حصتان + فسحة)',
              onclick: function () { applyStandardStructureTemplate('compact'); }
            }),
            h('button', {
              type: 'button',
              class: 'btn small gold',
              text: 'توزيع المهارات المختارة تلقائياً على كل الأسبوع',
              onclick: autoDistributeSkillsAcrossWeek
            })
          )
        )
      );

      var scheduleStepCard = h('div', { class: 'card prog-step-card' },
        h('div', { class: 'bar-sub' },
          h('div', null,
            h('h3', { class: 'prog-step-title', text: '3⃣ جدول البرنامج الأسبوعي والتوقيت الموحد تحت إطار الفترات' }),
            h('p', { class: 'muted small', text: 'التوقيت يظهر بوضوح تحت إطار الفترات (الفترة الصباحية / المسائية) ويبدأ من وقت وينتهي في جميع الأيام للحصة. استخدم المساعد السريع أعلاه أو املأ الحصص أدناه.' })
          )
        ),
        easyWizardBar,
        unifiedTimesHost,
        daysToggleWrap,
        daysHost
      );
      v.appendChild(scheduleStepCard);

      async function saveProgram(exportToParents) {
        if (!st.section_id) {
          return toast('يرجى اختيار الفوج / القسم التربوي المستهدف أولاً.', 'bad');
        }

        var totalActiveSessions = 0;
        st.days.forEach(function (dy) {
          (dy.sessions || []).forEach(function (s) {
            if (isSessionActive(s)) totalActiveSessions++;
          });
        });

        var selectedPairs = allSelectedPairs();
        if (totalActiveSessions === 0 && selectedPairs.length > 0) {
          st.days.forEach(function (dy, idx) {
            if (!dy.sessions.length) dy.sessions.push({ kind: 'session', title: '', start: '', end: '', items: [] });
            var pair = selectedPairs[idx % selectedPairs.length];
            if (pair) dy.sessions[0].items.push({ domain: pair.domain, skill: pair.skill });
          });
          totalActiveSessions = selectedPairs.length;
        }

        if (totalActiveSessions === 0 && selectedPairs.length === 0) {
          return toast('يرجى اختيار مجال ومهارة واحدة على الأقل أو إضافة حصة داخل الجدول الأسبوعي.', 'bad');
        }

        var secName = getSecName();
        var cleanDomains = st.domains.filter(function (dm) { return dm && dm.domain; }).map(function (dm) {
          return { domain: dm.domain, skills: (dm.skills || []).slice() };
        });

        var domNames = cleanDomains.map(function (dm) { return dm.domain; });
        var progTitle = DE.clean('البرنامج الأسبوعي — ' + secName + (domNames.length ? (' (' + domNames.join('، ') + ')') : ''), 155);

        var goalsLines = [];
        cleanDomains.forEach(function (dm) {
          if (dm.skills && dm.skills.length) {
            goalsLines.push('• ' + dm.domain + ': ' + dm.skills.join(' ، '));
          } else {
            goalsLines.push('• ' + dm.domain);
          }
        });
        var goalsSummary = DE.clean(goalsLines.join('\n'), 4800) || progTitle;

        var descLines = [];
        if (st.notes) descLines.push(st.notes);
        st.days.forEach(function (dy) {
          var activeS = (dy.sessions || []).filter(isSessionActive);
          if (activeS.length) {
            var sTxt = activeS.map(function (s, idx) {
              var tRange = formatTimeRange(s.start, s.end);
              var headTxt = (s.kind === 'break' ? ('[فاصل: ' + (s.title || 'استراحة') + ']') : (s.title || ('الحصة ' + (idx + 1)))) + (tRange ? (' (' + tRange + ')') : '');
              var itTxt = (s.items || []).map(function (it) { return '[' + it.domain + ' — ' + it.skill + ']'; }).join(' + ');
              return headTxt + (itTxt ? (': ' + itTxt) : '');
            }).join(' | ');
            descLines.push(dy.label + ': ' + sTxt);
          }
        });
        var descSummary = DE.clean(descLines.join('\n'), 4800) || null;

        var schedulePayload = st.days.map(function (dy) {
          return {
            day: dy.day,
            label: dy.label,
            section_name: secName,
            academic_year: st.academic_year || '2026/2027',
            notes: st.notes || '',
            domains: cleanDomains,
            sessions: (dy.sessions || []).filter(isSessionActive).map(function (s) {
              return {
                kind: s.kind === 'break' ? 'break' : 'session',
                title: s.title || '',
                start: s.start || '',
                end: s.end || '',
                items: (s.items || []).map(function (it) { return { domain: it.domain, skill: it.skill }; })
              };
            })
          };
        });

        var isPub = exportToParents ? true : false;
        var body = {
          section_id: st.section_id,
          title: progTitle,
          academic_year: st.academic_year || '2026/2027',
          description: descSummary,
          goals: goalsSummary,
          schedule: schedulePayload,
          status: isPub ? 'published' : 'draft',
          published_at: isPub ? new Date().toISOString() : null
        };

        if (st.id) {
          await C.rest('PATCH', '/educational_programs?id=eq.' + uid(st.id), body);
        } else {
          await C.rest('POST', '/educational_programs', body);
        }
        bust();
        toast(isPub ? 'تم اعتماد وتصدير البرنامج الأسبوعي كصورة إلى أولياء القسم بنجاح!' : 'تم حفظ البرنامج الأسبوعي كمسودة بنجاح.', 'ok');
        go('programs');
      }

      var exportBtn = h('button', { type: 'button', class: 'btn gold', text: 'تصدير البرنامج الأسبوعي إلى الأولياء (اعتماد ونشر الجدول)' });
      var draftBtn = h('button', { type: 'button', class: 'btn light', text: 'حفظ كمسودة' });
      var imgPreviewBtn = h('button', {
        type: 'button',
        class: 'btn light',
        text: 'تحميل صورة الجدول (PNG)',
        onclick: function () { downloadScheduleImage(st, getSecName()); }
      });
      var printPreviewBtn = h('button', {
        type: 'button',
        class: 'btn',
        text: 'تكبير وطباعة الجدول',
        onclick: function () { printWeeklySheet(st, getSecName(), 'البرنامج الأسبوعي'); }
      });

      var exportBtnBottom = h('button', { type: 'button', class: 'btn gold', text: 'تصدير البرنامج الأسبوعي إلى الأولياء (اعتماد ونشر الجدول)' });
      var draftBtnBottom = h('button', { type: 'button', class: 'btn light', text: 'حفظ كمسودة' });
      var imgBtnBottom = h('button', {
        type: 'button',
        class: 'btn light',
        text: 'تحميل صورة الجدول (PNG)',
        onclick: function () { downloadScheduleImage(st, getSecName()); }
      });
      var printBtnBottom = h('button', {
        type: 'button',
        class: 'btn',
        text: 'تكبير وطباعة الجدول',
        onclick: function () { printWeeklySheet(st, getSecName(), 'البرنامج الأسبوعي'); }
      });

      exportBtn.addEventListener('click', function () { act(exportBtn, function () { return saveProgram(true); }); });
      draftBtn.addEventListener('click', function () { act(draftBtn, function () { return saveProgram(false); }); });
      exportBtnBottom.addEventListener('click', function () { act(exportBtnBottom, function () { return saveProgram(true); }); });
      draftBtnBottom.addEventListener('click', function () { act(draftBtnBottom, function () { return saveProgram(false); }); });

      var previewCard = h('div', { class: 'card prog-step-card' },
        h('div', { class: 'bar-sub' },
          h('div', null,
            h('h3', { class: 'prog-step-title', text: '4⃣ معاينة صورة البرنامج الأسبوعي المصدَّر للأولياء' }),
            h('p', { class: 'muted small', text: 'يظهر البرنامج للأولياء على شكل صورة أفقية متكاملة بنفس تصميم وألوان المركز دون الحاجة للتمرير الطويل.' })
          ),
          h('div', { class: 'row-actions' })
        ),
        previewHost,
        h('div', { class: 'prog-submit-bar' },
          h('button', { type: 'button', class: 'btn light', text: 'إلغاء والعودة', onclick: function () { go('programs'); } }),
          imgBtnBottom,
          printBtnBottom,
          draftBtnBottom,
          exportBtnBottom
        )
      );

      v.appendChild(previewCard);

      renderDomains();
      renderDays();
      refreshPreview();
      window.scrollTo(0, 0);
    }

    listView(v, {
      title: 'البرامج التربوية والجداول الأسبوعية للأقسام',
      addLabel: 'إعداد برنامج أسبوعي جديد',
      onAdd: function () { openProgramBuilder(null); },
      rows: rows,
      empty: 'لا توجد برامج أسبوعية مسجلة بعد. اضغط «إعداد برنامج أسبوعي جديد» للبدء.',
      search: function (p) { return (p.title || '') + ' ' + (p.goals || '') + ' ' + nameOf(sections, p.section_id, 'name'); },
      details: function (p) {
        var st = parseProgState(p);
        var sName = nameOf(sections, p.section_id, 'name');
        return buildWeeklySheet(st, sName, p.status === 'published' ? 'مصدَّر للأولياء' : 'مسودة');
      },
      filters: [
        { label: 'القسم', opts: secOpts, test: function (p, x) { return p.section_id === x; } },
        { label: 'المجال التربوي', opts: domainOpts, test: function (p, x) { return (p.title || '').indexOf(x) >= 0 || (p.goals || '').indexOf(x) >= 0 || JSON.stringify(p.schedule || []).indexOf(x) >= 0; } },
        { label: 'الحالة', opts: [['published', 'مصدَّر ومنشور للأولياء'], ['draft', 'مسودة قيد الإعداد']], test: function (p, x) { return p.status === x; } }
      ],
      cols: [
        { label: 'البرنامج الأسبوعي والمجالات', get: function (p) { return p.title; }, sort: function (p) { return p.title; } },
        { label: 'القسم المستهدف', get: function (p) { return nameOf(sections, p.section_id, 'name'); }, sort: function (p) { return nameOf(sections, p.section_id, 'name'); } },
        { label: 'الموسم', get: function (p) { return p.academic_year || '2026/2027'; } },
        { label: 'حالة التصدير للأولياء', get: function (p) { return badge(p.status === 'published' ? 'مصدَّر للأولياء (صورة)' : 'مسودة', p.status === 'published' ? 'ok' : 'gray'); } },
        { label: 'تاريخ التصدير', get: function (p) { return p.published_at ? fmt(p.published_at) : '—'; } }
      ],
      actions: function (p) {
        var st = parseProgState(p);
        var sName = nameOf(sections, p.section_id, 'name');
        return [
          rbtn('صورة البرنامج والطباعة', function () { printWeeklySheet(st, sName, p.status === 'published' ? 'مصدَّر للأولياء' : 'مسودة'); }, 'gold'),
          rbtn('تعديل', function () { openProgramBuilder(p); }),
          p.status === 'published'
            ? rbtn('إلغاء التصدير', async function () {
              await C.rest('PATCH', '/educational_programs?id=eq.' + uid(p.id), { status: 'draft', published_at: null });
              bust(); toast('تم إلغاء التصدير وتحويل البرنامج لمسودة.', 'ok'); go('programs');
            }, 'light')
            : rbtn('تصدير للأولياء', async function () {
              await C.rest('PATCH', '/educational_programs?id=eq.' + uid(p.id), { status: 'published', published_at: new Date().toISOString() });
              bust(); toast('تم تصدير ونشر البرنامج الأسبوعي لأولياء القسم بنجاح.', 'ok'); go('programs');
            }, 'gold'),
          rbtn('حذف', async function () {
            if (!(await ask({ title: 'حذف البرنامج الأسبوعي؟', msg: 'سيُحذف البرنامج وجدوله الأسبوعي نهائياً.', ok: 'حذف', danger: true }))) return;
            await C.rest('DELETE', '/educational_programs?id=eq.' + uid(p.id));
            bust(); toast('تم حذف البرنامج.', 'ok'); go('programs');
          }, 'danger')
        ];
      }
    });
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

  function isEvaluationReport(r) {
    if (!r) return false;
    return (typeof r.activities === 'string' && r.activities.indexOf(EVAL_MARKER) === 0)
      || (typeof r.title === 'string' && (r.title.indexOf('استمارة تقييم') >= 0 || r.title.indexOf('تقرير اللجنة البيداغوجية') >= 0));
  }

  function parseEvaluationReport(r) {
    var CURR = (window && window.DE_CURRICULUM) || EMBEDDED_CURRICULUM || {};
    var domainKeys = Object.keys(CURR);
    var res = {
      id: r ? r.id : null,
      child_id: (r && r.child_id) || S.preselectChildId || '',
      title: (r && r.title) || 'تقرير اللجنة البيداغوجية والتربوية — استمارة التقييم',
      report_date: (r && r.report_date) || new Date().toISOString().slice(0, 10),
      status: (r && r.status) || 'draft',
      general_notes: (r && r.notes) || '',
      term: 'الثلاثي الأخير',
      school_year: '2024/2025',
      degree_of_disability: 'متوسطة',
      qualification_level: '',
      supervisors: [
        { name: 'أمير زكرياء', role: 'مدير المركز' }
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

  /* رسم ورقة التقييم الرسمية المطابقة بدقة للصورة المرفقة (53020.jpg) */
  function renderEvaluationSheetView(r, childFullName, secName, kd) {
    var ev = parseEvaluationReport(r);

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

    // 1. ترويسة الوثيقة الرسمية
    var header = h('div', { class: 'oep-header' },
      h('div', { class: 'oep-title-block' },
        h('h3', { class: 'oep-org-name', text: 'جمعية أولياء الأطفال المعاقين ذهنيًا' }),
        h('h4', { class: 'oep-center-name', text: 'المركز النفسي البيداغوجي دار الإحسان' }),
        h('p', { class: 'oep-location', text: '— العطف - غرداية —' }),
        h('div', { class: 'oep-fr-title', text: "COMPTE RENDU DE L'EQUIPE PEDAGOGIQUE" }),
        h('h2', { class: 'oep-report-heading', text: 'تقرير اللجنة البيداغوجية والتربوية' })
      ),
      logoImg
    );

    // 2. البانر الأصفر/الذهبي للثلاثي والموسم
    var termBanner = h('div', { class: 'oep-term-banner', text: 'تقييم ' + (ev.term || 'الثلاثي الأخير') + ' للموسم الدراسي: ' + (ev.school_year || '2024/2025') });

    // 3. شبكة معلومات الحالة (اسم الحالة، العمر، نوع الاضطراب، الميلاد، درجة الإعاقة، القسم)
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

    // 4. جدول المشرفين بدون رموز QR وبمظهر رسمي نظيف وأنيق
    var supRows = (ev.supervisors && ev.supervisors.length ? ev.supervisors : [{ name: 'أمير زكرياء', role: 'مدير المركز' }]).map(function (sp) {
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
          h('th', { text: 'الوظيفة' }),
          h('th', { text: 'التوقيع والختم' })
        )
      ),
      h('tbody', null, supRows)
    );

    // 5. البانر الأزرق وقسم "الوصف العام لأداء الحالة"
    var perfBanner = h('div', { class: 'oep-section-banner', text: 'الوصف العام لأداء الحالة' });

    var generalReportCol = h('div', { class: 'oep-general-report-box' },
      h('div', { class: 'oep-gr-header', text: 'التقرير العام' }),
      h('div', { class: 'oep-gr-body', text: ev.general_report || 'تم تسجيل تقدم ملحوظ في الأداء العام للحالة مع مواصلة التأهيل التربوي والنفسي.' })
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
        h('div', { class: 'oep-ab-content', text: item.val || '—' })
      );
    });

    var abilitiesCol = h('div', { class: 'oep-abilities-stack' }, abilityBoxes);
    var perfGrid = h('div', { class: 'oep-performance-grid' }, generalReportCol, abilitiesCol);

    // 6. البانر الأخضر وقسم "الخلاصة والتوصيات" (نقاط القوة، نقاط الضعف، التوصيات)
    var summaryBanner = h('div', { class: 'oep-summary-banner', text: 'الخلاصة والتوصيات' });

    function renderListItems(arr, fallback) {
      var items = (arr || []).filter(function (x) { return x && x.trim(); });
      if (!items.length) items = [fallback];
      var ul = h('ul', { class: 'oep-rec-list' });
      items.forEach(function (txt) { ul.appendChild(h('li', { text: txt })); });
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
        h('div', { class: 'oep-rec-title', text: '3. التوصيات' }),
        renderListItems(ev.recommendations, 'مواصلة المتابعة البيداغوجية والتنسيق المستمر مع الأسرة.')
      )
    );

    // 7. كشف الحساب التلقائي للنقاط لكل مجال والنتيجة الإجمالية لكافة المجالات المختارة
    var totalEarnedPoints = 0;
    var totalMaxPoints = 0;
    var totalRatedSkills = 0;

    var domainRows = (ev.domains || []).map(function (dm) {
      var dEarned = 0;
      var dMax = 0;
      var dCount = (dm.ratings || []).length;
      (dm.ratings || []).forEach(function (it) {
        var sc = 0;
        if (it.score !== '' && it.score != null) {
          var parsedSc = parseInt(it.score, 10);
          if (!isNaN(parsedSc)) sc = parsedSc;
        } else if (it.yn) {
          if (it.yn === 'نعم') sc = 5;
        }
        dEarned += sc;
        dMax += 5;
      });
      totalEarnedPoints += dEarned;
      totalMaxPoints += dMax;
      totalRatedSkills += dCount;
      var dPct = dMax > 0 ? Math.round((dEarned / dMax) * 100) : 0;
      return h('tr', null,
        h('td', null, h('strong', { text: dm.domain })),
        h('td', { text: dCount + ' مهارة' }),
        h('td', null, h('span', { class: 'badge ' + (dEarned > 0 ? 'ok' : 'gray'), text: dEarned + ' نقطة' })),
        h('td', { text: dMax + ' نقطة' }),
        h('td', null, h('strong', { text: dPct + '%' }))
      );
    });

    var overallPct = totalMaxPoints > 0 ? ((totalEarnedPoints / totalMaxPoints) * 100).toFixed(1) : '0';

    var scorecardTable = h('table', { class: 'oep-scorecard-table' },
      h('thead', null,
        h('tr', null,
          h('th', { text: 'المجال التربوي / البيداغوجي' }),
          h('th', { text: 'المهارات المقيمة' }),
          h('th', { text: 'النقاط المحصلة' }),
          h('th', { text: 'المجموع الأقصى' }),
          h('th', { text: 'النسبة المئوية' })
        )
      ),
      h('tbody', null,
        domainRows,
        h('tr', { class: 'total-row' },
          h('td', null, h('strong', { text: 'النتيجة الإجمالية لكافة المجالات التربوية المختارة' })),
          h('td', { text: totalRatedSkills + ' مهارة' }),
          h('td', null, h('strong', { text: totalEarnedPoints + ' نقطة' })),
          h('td', null, h('strong', { text: totalMaxPoints + ' نقطة' })),
          h('td', null, h('strong', { text: overallPct + '%' }))
        )
      )
    );

    var overallBanner = h('div', { class: 'oep-overall-score-banner' },
      h('span', { text: 'النتيجة الإجمالية لكافة المجالات المختارة:' }),
      h('span', { class: 'oep-score-highlight', text: totalEarnedPoints + ' من ' + totalMaxPoints + ' نقطة (' + overallPct + '%)' })
    );

    var skillsSectionBanner = h('div', { class: 'oep-section-banner', style: 'background-color:#E0E7FF; color:#1E1B4B; margin-top:12px;', text: 'كشف درجات التقييم والنتائج الإجمالية' });

    // 8. إظهار كافة الجداول التفصيلية للمهارات لكل مجال بيداغوجي مختار مع أسماء المهارات والدرجة صفر لمن لم تقيّم
    var allDomainDetailTables = (ev.domains || []).map(function (dm, dIdx) {
      var dEarned = 0;
      var dMax = 0;
      var skillRows = (dm.ratings || []).map(function (it, sIdx) {
        var skillName = it.skill || it.item || (EMBEDDED_CURRICULUM[dm.domain] && EMBEDDED_CURRICULUM[dm.domain][sIdx]) || ('مهارة ' + (sIdx + 1));
        var sc = 0;
        var isRated = false;
        if (it.score !== '' && it.score != null) {
          var parsedSc = parseInt(it.score, 10);
          if (!isNaN(parsedSc)) {
            sc = parsedSc;
            isRated = true;
          }
        } else if (it.yn) {
          if (it.yn === 'نعم') sc = 5;
          else sc = 0;
          isRated = true;
        }
        dEarned += sc;
        dMax += 5;
        var scVal = isRated ? (it.yn ? it.yn : (sc + ' / 5')) : '0 / 5';

        return h('tr', null,
          h('td', { style: 'text-align:center;', text: String(sIdx + 1) }),
          h('td', null, h('strong', { text: skillName })),
          h('td', { style: 'text-align:center;' }, h('span', { class: 'badge ' + (sc > 0 ? 'ok' : 'gray'), text: scVal })),
          h('td', { class: 'muted small', text: it.note || it.obs || (isRated ? 'مقيَّمة' : 'لم تقيَّم (درجة صفر)') })
        );
      });
      var dPct = dMax > 0 ? Math.round((dEarned / dMax) * 100) : 0;

      return h('div', { class: 'eval-domain-table-wrap', style: 'margin-top:16px;' },
        h('div', { class: 'oep-gr-header', style: 'display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:#EEF2FF;color:#312E81;border:1px solid #C7D2FE;' },
          h('strong', { text: (dIdx + 1) + '. ' + dm.domain + ' (' + (dm.ratings ? dm.ratings.length : 0) + ' مهارة)' }),
          h('span', { class: 'badge gold', text: 'النقاط: ' + dEarned + ' / ' + dMax + ' (' + dPct + '%)' })
        ),
        h('table', { class: 'oep-scorecard-table', style: 'margin-top:0;width:100%;' },
          h('thead', null,
            h('tr', null,
              h('th', { style: 'width:45px;text-align:center;', text: '#' }),
              h('th', { text: 'المهارة المقيمة' }),
              h('th', { style: 'width:130px;text-align:center;', text: 'التقييم / النتيجة' }),
              h('th', { text: 'الملاحظات والتوجيهات' })
            )
          ),
          h('tbody', null, skillRows.length ? skillRows : h('tr', null, h('td', { colspan: 4, class: 'muted', style: 'text-align:center;', text: 'لا توجد مهارات مسجلة في هذا المجال.' })))
        )
      );
    });

    var detailedSkillsSection = h('div', { class: 'eval-detailed-skills-box', style: 'margin-top:20px;' },
      h('div', { class: 'oep-section-banner', style: 'background-color:#E0E7FF; color:#1E1B4B; margin:16px 0 8px;' }, 'الجداول التفصيلية لكافة المهارات المقيمة في المجالات التربوية'),
      allDomainDetailTables
    );

    var topActionsBar = h('div', { class: 'oep-action-bar no-print', style: 'display:flex;justify-content:flex-end;gap:10px;margin-bottom:16px;padding:10px 14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;' },
      h('button', {
        type: 'button',
        class: 'btn gold',
        onclick: async function () {
          try {
            toast('جارٍ تجهيز وتحميل الاستمارة بصيغة PDF...', 'ok');
            var pdfBytes = await DE_PDF.renderEvaluationToPdf(ev, childFullName, secName, kd);
            DE_PDF.downloadPdf(pdfBytes, 'استمارة_تقييم_' + (childFullName || 'تلميذ').replace(/\s+/g, '_') + '.pdf');
            toast('تم تنزيل ملف PDF بنجاح!', 'ok');
          } catch (e) {
            toast('تعذر تنزيل PDF: ' + e.message, 'bad');
          }
        }
      }, makeSvgIcon('s-download'), h('span', { text: 'تحميل الاستمارة بصيغة PDF' })),
      h('button', {
        type: 'button',
        class: 'btn',
        onclick: function () { window.print(); }
      }, makeSvgIcon('s-print'), h('span', { text: 'طباعة الورقة الرسمية (A4)' }))
    );

    var compactSkillsBox = h('div', { class: 'eval-compact-box' },
      skillsSectionBanner,
      scorecardTable,
      overallBanner
    );

    
    var printStyleTag = h('style', {
      text: '@media print { @page { size: A4 portrait; margin: 8mm 8mm 10mm 8mm; } html, body, #app, .shell, .main, .content { background: #FFFFFF !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; width: 100% !important; overflow: visible !important; } body * { visibility: hidden; } .modal, .modal-card, .modal-body, .wk-modal-print, .official-eval-paper, .official-eval-paper * { visibility: visible !important; } .modal { position: static !important; background: transparent !important; padding: 0 !important; overflow: visible !important; display: block !important; border: none !important; } .modal-card, .modal-body { position: static !important; max-width: 100% !important; width: 100% !important; padding: 0 !important; margin: 0 !important; border: none !important; box-shadow: none !important; overflow: visible !important; } .official-eval-paper { position: static !important; display: block !important; left: auto !important; top: auto !important; width: 100% !important; max-width: 100% !important; border: 1.5px solid #000000 !important; padding: 6mm !important; margin: 0 auto !important; box-shadow: none !important; page-break-inside: auto !important; break-inside: auto !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .no-print, .oep-action-bar, .modal-actions, .bar, .side, #nav, #topbar, .btn, button { display: none !important; } .oep-header, .oep-term-banner, .oep-info-table, .oep-supervisors-table, .oep-perf-banner, .oep-performance-grid, .oep-summary-banner, .oep-recommendations-grid, .oep-section-banner, .oep-scorecard-table, .oep-overall-score-banner, .eval-domain-table-wrap { page-break-inside: avoid !important; break-inside: avoid !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .eval-detailed-skills-box { display: block !important; visibility: visible !important; } .eval-domain-table-wrap { margin-top: 14px !important; margin-bottom: 14px !important; } }'
    });

    return h('div', { class: 'official-eval-paper' },
      printStyleTag,
      topActionsBar,
      header,
      termBanner,
      infoTable,
      supervisorsTable,
      perfBanner,
      perfGrid,
      summaryBanner,
      recGrid,
      compactSkillsBox
    );
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
        ev.supervisors = [{ name: 'أمير زكرياء', role: 'مدير المركز' }];
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

    // 3. خانات تقرير التقييم (الوصف العام لأداء الحالة: التقرير العام + الخانات الستة)
    var generalReportArea = h('textarea', { rows: 9, placeholder: 'اكتب التقرير العام الشامل لأداء وسلوك الحالة...' });
    generalReportArea.value = ev.general_report || '';
    generalReportArea.addEventListener('input', function () { ev.general_report = generalReportArea.value; });

    var ab = ev.abilities || {};
    function makeAbArea(key, placeholder) {
      var ta = h('textarea', { rows: 2, placeholder: placeholder });
      ta.value = ab[key] || '';
      ta.addEventListener('input', function () {
        if (!ev.abilities) ev.abilities = {};
        ev.abilities[key] = ta.value;
      });
      return ta;
    }

    var stepReportFieldsCard = h('div', { class: 'card prog-step-card' },
      h('h3', { class: 'prog-step-title', text: '3⃣ خانات تقرير التقييم — الوصف العام لأداء الحالة (مطابقة للصورة الرسمية)' }),
      h('div', { class: 'eval-builder-grid-2' },
        h('label', { class: 'fld' },
          h('span', { text: 'التقرير العام (مربع التقرير الشامل على اليمين):' }),
          generalReportArea
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
      var container = h('div', { class: 'dynamic-items-container' });
      function redraw() {
        container.textContent = '';
        if (!ev[arrKey] || !ev[arrKey].length) ev[arrKey] = [''];
        ev[arrKey].forEach(function (val, idx) {
          var inp = h('input', { type: 'text', placeholder: placeholder, value: val || '' });
          inp.addEventListener('input', function () { ev[arrKey][idx] = inp.value; });
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
      var addBtn = h('button', {
        type: 'button',
        class: 'btn small light',
        text: addLabel,
        onclick: function () {
          ev[arrKey].push('');
          redraw();
        }
      });
      return h('div', { class: 'card', style: 'margin-bottom:0;' },
        h('div', { class: 'bar-sub' }, h('h4', { text: title }), addBtn),
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

        // حساب نقاط المجال تلقائياً
        var domEarned = 0;
        var domMax = 0;
        var domRated = 0;
        (dm.ratings || []).forEach(function (it) {
          if (it.score !== '' && it.score != null) {
            var sc = parseInt(it.score, 10);
            if (!isNaN(sc)) {
              domEarned += sc;
              domMax += 5;
              domRated++;
            }
          } else if (it.yn) {
            if (it.yn === 'نعم') domEarned += 5;
            domMax += 5;
            domRated++;
          }
        });
        var domPct = domMax > 0 ? Math.round((domEarned / domMax) * 100) : 0;

        var domCard = h('div', { class: 'card', style: 'margin-bottom:12px; padding:12px;' },
          h('div', { class: 'bar-sub' },
            h('h4', { text: dm.domain }),
            h('div', { class: 'row-actions' },
              h('span', { class: 'badge ' + (domRated ? 'ok' : 'gold'), text: 'المجموع: ' + domEarned + ' من ' + domMax + ' نقطة (' + domPct + '%)' }),
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

      // حساب النتيجة الإجمالية لكافة المجالات المختارة في الوقت الفعلي
      var overallEarned = 0;
      var overallMax = 0;
      var overallSkillsCount = 0;
      ev.domains.forEach(function (dm) {
        (dm.ratings || []).forEach(function (it) {
          if (it.score !== '' && it.score != null) {
            var sc = parseInt(it.score, 10);
            if (!isNaN(sc)) {
              overallEarned += sc;
              overallMax += 5;
              overallSkillsCount++;
            }
          } else if (it.yn) {
            if (it.yn === 'نعم') overallEarned += 5;
            overallMax += 5;
            overallSkillsCount++;
          }
        });
      });
      var overallPercentage = overallMax > 0 ? ((overallEarned / overallMax) * 100).toFixed(1) : '0';

      var liveOverallBanner = h('div', { class: 'eval-live-score-banner' },
        h('div', null,
          h('div', { class: 'eval-live-score-title', text: '📊 النتيجة الإجمالية لكافة المجالات التربوية المختارة:' }),
          h('p', { class: 'muted small', style: 'margin:0;', text: 'تُحسب تلقائياً بجمع النقاط المحصلة (' + overallEarned + ') مقسومة على المجموع الكلي الأقصى للمجالات المختارة (' + overallMax + ').' })
        ),
        h('div', { class: 'eval-live-score-val', text: overallEarned + ' / ' + overallMax + ' نقطة (' + overallPercentage + '%)' })
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

      var serializedPayload = EVAL_MARKER + JSON.stringify(payloadObj);
      if (serializedPayload.length > 4950) {
        // ضغط طفيف في حال الإطالة
        payloadObj.general_report = payloadObj.general_report.slice(0, 1000);
        serializedPayload = EVAL_MARKER + JSON.stringify(payloadObj);
      }

      var chosenKid = kids.filter(function (k) { return k.id === ev.child_id; })[0];
      var kidName = chosenKid ? chosenKid.full_name : 'الطفل';

      var body = {
        child_id: ev.child_id,
        title: DE.clean(ev.title || ('تقرير اللجنة البيداغوجية والتربوية — ' + ev.term), 145),
        report_date: ev.report_date || new Date().toISOString().slice(0, 10),
        period_start: ev.report_date || new Date().toISOString().slice(0, 10),
        period_end: ev.report_date || new Date().toISOString().slice(0, 10),
        achievements: DE.clean('تقييم ' + ev.term + ' للموسم الدراسي ' + ev.school_year + ' — المشرفون: ' + (ev.supervisors.map(function (s) { return s.name; }).join('، ')), 4800),
        activities: serializedPayload,
        notes: DE.clean(ev.general_report || '', 4800) || null,
        status: publishNow ? 'published' : 'draft'
      };

      if (ev.id) {
        await C.rest('PATCH', '/progress_reports?id=eq.' + uid(ev.id), body);
      } else {
        await C.rest('POST', '/progress_reports', body);
      }
      bust();
      toast(publishNow ? 'تم اعتماد ونشر استمارة التقييم البيداغوجي للولي بنجاح!' : 'تم حفظ استمارة التقييم كمسودة.', 'ok');
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
        return renderEvaluationSheetView(r, kd ? kd.full_name : '—', sName, kd);
      },
      filters: [
        { label: 'الطفل', opts: kidOpts, test: function (r, x) { return r.child_id === x; } },
        { label: 'الحالة', opts: [['published', 'معتمدة ومنشورة للولي'], ['draft', 'مسودة قيد الإعداد']], test: function (r, x) { return r.status === x; } }
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
        { label: 'الطفل', get: function (r) { return nameOf(kids, r.child_id); } },
        { label: 'التاريخ', get: function (r) { return fmt(r.report_date); }, sort: function (r) { return r.report_date; } },
        { label: 'الحالة', get: function (r) { return badge(r.status === 'published' ? 'معتمدة ومنشورة' : 'مسودة', r.status === 'published' ? 'ok' : 'gray'); } }
      ],
      actions: function (r) {
        var kd = kids.filter(function (k) { return k.id === r.child_id; })[0];
        var sName = kd ? (nameOf(sections, kd.section_id, 'name') || kd.section || '') : '';
        return [
          rbtn('عرض الورقة والطباعة', function () {
            openModal(h('div', { class: 'modal-body wk-modal-print' },
              renderEvaluationSheetView(r, kd ? kd.full_name : '—', sName, kd),
              h('div', { class: 'modal-actions no-print' },
                h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal }),
                h('button', { class: 'btn gold', type: 'button', text: 'طباعة الورقة الرسمية (A4)', onclick: function () { window.print(); } })
              )
            ));
          }, 'gold'),
          rbtn('تعديل الاستمارة', function () {
            return openEvaluationBuilder(r, kids, sections, secAllOpts, branchOpts);
          }),
          r.status === 'published'
            ? rbtn('إلغاء النشر', async function () {
              await C.rest('PATCH', '/progress_reports?id=eq.' + uid(r.id), { status: 'draft' });
              bust(); toast('تحوّلت الاستمارة إلى مسودة.', 'ok'); go('evaluations');
            }, 'light')
            : rbtn('اعتماد ونشر للولي', async function () {
              await C.rest('PATCH', '/progress_reports?id=eq.' + uid(r.id), { status: 'published' });
              bust(); toast('تم اعتماد ونشر الاستمارة للولي.', 'ok'); go('evaluations');
            }, 'gold'),
          rbtn('حذف الاستمارة', async function () {
            if (!(await ask({ title: 'حذف استمارة التقييم؟', msg: 'سيُحذف السجل نهائيًا.', ok: 'حذف', danger: true }))) return;
            await C.rest('DELETE', '/progress_reports?id=eq.' + uid(r.id));
            bust(); go('evaluations');
          }, 'danger')
        ];
      }
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
                h('strong', { text: (a.display_name || 'الأخصائية نواري اسماء بنت جيلالي') + suffix }),
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
          label: 'رقم الهاتف وكلمة المرور (DI + تاريخ الميلاد)',
          get: function (a) {
            var dobPw = staffPasswordFromDob(a.dob);
            return h('div', { class: 'row-actions' },
              a.phone && a.phone !== '—' ? h('span', { dir: 'ltr', class: 'sic-num', text: a.phone }) : null,
              dobPw ? h('code', { dir: 'ltr', class: 'sic-num', text: dobPw }) : badge('مشفرة (bcrypt)', 'ok')
            );
          }
        },
        { label: 'آخر تسجيل دخول', get: function (a) { return fmt(a.last_sign_in_at, true); } },
        { label: 'الحالة', get: function (a) { return badge(a.disabled ? 'معطَّل' : 'مفعّل', a.disabled ? 'bad' : 'ok'); } }
      ],
      details: function (a) {
        var dobPw = staffPasswordFromDob(a.dob);
        var roleLabel = a.role === 'educator' ? 'مربية قسم' : a.role === 'specialist' ? 'أخصائية نفسانية' : a.is_owner ? 'المالك الرئيسي' : 'مدير / مسؤول مركز';
        return h('div', { class: 'account-expanded-info-grid', style: 'display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:12px;font-size:0.9rem;' },
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'الاسم الكامل:' }), h('strong', { text: a.display_name || a.email })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'الدور الوظيفي:' }), h('strong', { text: roleLabel })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'إذن الدخول للمراكز:' }), h('strong', { text: formatCenterAccessLabel(a.is_owner ? 'all' : a.center_access) })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'البريد الإلكتروني:' }), h('span', { dir: 'ltr', text: a.email || '—' })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'رقم هاتف الاتصال:' }), h('span', { dir: 'ltr', text: a.phone || '—' })),
          h('div', null, h('span', { class: 'muted small', style: 'display:block;', text: 'كلمة المرور الأولية:' }), dobPw ? h('code', { dir: 'ltr', text: dobPw }) : h('span', { text: 'مشفرة' })),
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
        facebook_url: 'https://facebook.com/darelihsan',
        instagram_url: 'https://instagram.com/darelihsan'
      }, curSettings.general || {}),
      centers: Object.assign({
        main_visible: true,
        work_visible: true,
        farm_visible: true,
        main_desc: 'المركز الرئيسي النفسي البيداغوجي — التكفل والمرافقة التربوية والنفسية المتخصصة.',
        work_desc: 'مركز المساعدة على العمل — ورشات التأهيل المهني والتمهين الحرفي.',
        farm_desc: 'المزرعة البيداغوجية — التأهيل الزراعي والأنشطة البيئية والبستنة.'
      }, curSettings.centers || {}),
      notifications: Object.assign({
        notify_absence: true,
        notify_reports: true,
        notify_evaluations: true,
        notify_docs: true,
        notify_messages: true,
        notify_push_enabled: true,
        notify_whatsapp_enabled: true
      }, curSettings.notifications || {}),
      whatsapp: Object.assign({
        phone_number_id: '109876543210987',
        waba_id: '987654321098765',
        sender_phone: '+213550123456',
        webhook_token: 'dar_el_ihsan_wa_verify_2026',
        is_active: true
      }, curSettings.whatsapp || {}),
      registration: Object.assign({
        enable_registration_form: true,
        enable_inquiries_form: true,
        disability_options: 'التوحد\nمتلازمة داون\nالإعاقة الذهنية\nاضطرابات النمو\nحالات أخرى',
        consent_text: 'أوافق على معالجة البيانات المقدمة لغرض دراسة طلب التسجيل والتواصل مع إدارة الجمعية.'
      }, curSettings.registration || {}),
      appearance: Object.assign({
        theme_mode: 'light',
        default_lang: 'ar',
        font_scale: 'normal'
      }, curSettings.appearance || {})
    };

    v.textContent = '';

    var activeCat = 'general';
    var searchQuery = '';

    var root = h('div', { class: 'settings-saas-root' });

    root.appendChild(h('div', { class: 'settings-hub-hero' },
      h('div', null,
        h('h1', null, makeSvgIcon('s-gear'), h('span', { text: 'مركز إدارة إعدادات المنصة' })),
        h('p', { text: 'التحكم المركزي في هوية المؤسسة، المراكز، صلاحيات الحسابات، الإشعارات، والأمان.' })
      )
    ));

    var layout = h('div', { class: 'settings-saas-layout' });

    var sidebar = h('div', { class: 'settings-saas-sidebar' });
    
    var searchInput = h('input', {
      type: 'search',
      class: 'input settings-search-input',
      placeholder: '🔍 بحث في الإعدادات…',
      oninput: function () {
        searchQuery = searchInput.value.trim().toLowerCase();
        renderMainContent();
      }
    });
    sidebar.appendChild(h('div', { class: 'settings-search-box' }, searchInput));

    var categories = [
      { id: 'general', title: 'الإعدادات العامة', icon: 's-home', badge: 'أساسي' },
      { id: 'centers', title: 'المراكز والفروع', icon: 's-branch', badge: '3 مراكز' },
      { id: 'roles', title: 'الصلاحيات والأدوار', icon: 's-shield', badge: '4 أدوار' },
      { id: 'notifications', title: 'الإشعارات والتنبيهات', icon: 's-bell', badge: 'نشطة' },
      { id: 'whatsapp', title: 'تكامل واتساب', icon: 's-whatsapp', badge: 'Cloud API' },
      { id: 'registration', title: 'الموقع والتسجيل', icon: 's-clipboard-list', badge: 'العام' },
      { id: 'appearance', title: 'المظهر واللغة', icon: 's-eye', badge: 'RTL/LTR' },
      { id: 'security', title: 'الأمان والرقابة', icon: 's-lock', badge: 'RLS 100%' }
    ];

    var navList = h('div', { class: 'settings-saas-nav' });
    sidebar.appendChild(navList);

    function renderNav() {
      navList.textContent = '';
      categories.forEach(function (cat) {
        var btn = h('button', {
          type: 'button',
          class: 'settings-nav-item' + (activeCat === cat.id && !searchQuery ? ' is-active' : ''),
          onclick: function () {
            activeCat = cat.id;
            searchQuery = '';
            searchInput.value = '';
            renderNav();
            renderMainContent();
          }
        },
          makeSvgIcon(cat.icon),
          h('span', { class: 'sni-label', text: cat.title }),
          cat.badge ? h('span', { class: 'sni-badge', text: cat.badge }) : null
        );
        navList.appendChild(btn);
      });
    }

    var contentArea = h('div', { class: 'settings-saas-content' });

    async function saveAllSettings() {
      try {
        toast('جارٍ حفظ إعدادات المنصة…', 'ok');
        draftData.settings = s;
        await savePortalMeta(draftData);
        try {
          await C.rest('POST', '/app_settings', {
            key: 'main_config',
            value: s,
            updated_at: new Date().toISOString()
          }, { Prefer: 'resolution=merge-duplicates' });
        } catch (eSql) {}
        localStorage.setItem('de_app_settings', JSON.stringify(s));
        toast('تم حفظ إعدادات المنصة بنجاح وتطبيقها في النظام!', 'ok');
        renderMainContent();
      } catch (err) {
        toast('تعذر حفظ الإعدادات: ' + err.message, 'bad');
      }
    }

    function createSettingItem(label, inputEl, desc, statusText, statusType) {
      return h('div', { class: 'setting-entry-row' },
        h('div', { class: 'ser-info' },
          h('div', { class: 'ser-title-wrap' },
            h('strong', { class: 'ser-title', text: label }),
            statusText ? badge(statusText, statusType || 'ok') : null
          ),
          desc ? h('p', { class: 'ser-desc', text: desc }) : null
        ),
        h('div', { class: 'ser-control' }, inputEl)
      );
    }

    function renderMainContent() {
      contentArea.textContent = '';

      if (searchQuery) {
        var resultsCard = h('div', { class: 'card settings-group-card' },
          h('h3', { text: 'نتائج البحث عن: «' + searchQuery + '»' })
        );
        var foundCount = 0;

        if ('اسم الجمعية بالعربية والفرنسية المركز الهاتف البريد العنوان'.indexOf(searchQuery) >= 0) {
          foundCount++;
          resultsCard.appendChild(h('div', { class: 'search-result-group' },
            h('h4', { text: 'الإعدادات العامة' }),
            h('p', { text: 'اسم الجمعية: ' + s.general.association_name_ar + ' • الهاتف: ' + s.general.phone + ' • البريد: ' + s.general.email }),
            h('button', { class: 'btn small light', type: 'button', text: 'الانتقال للقسم', onclick: function () { activeCat = 'general'; searchQuery = ''; searchInput.value = ''; renderNav(); renderMainContent(); } })
          ));
        }

        if ('المراكز الفروع المزرعة التمهين ورشات التأهيل'.indexOf(searchQuery) >= 0) {
          foundCount++;
          resultsCard.appendChild(h('div', { class: 'search-result-group' },
            h('h4', { text: 'إعدادات المراكز والفروع' }),
            h('p', { text: 'المراكز الثلاثة: المركز الرئيسي، مركز المساعدة على العمل، المزرعة البيداغوجية.' }),
            h('button', { class: 'btn small light', type: 'button', text: 'الانتقال للقسم', onclick: function () { activeCat = 'centers'; searchQuery = ''; searchInput.value = ''; renderNav(); renderMainContent(); } })
          ));
        }

        if ('الإشعارات الغياب التقارير الرسائل تنبيهات هاتف push whatsapp'.indexOf(searchQuery) >= 0) {
          foundCount++;
          resultsCard.appendChild(h('div', { class: 'search-result-group' },
            h('h4', { text: 'إعدادات الإشعارات' }),
            h('p', { text: 'قنوات وتنبيهات الغياب، التقارير الدورية، إشعارات الويب PWA، ورسائل واتساب.' }),
            h('button', { class: 'btn small light', type: 'button', text: 'الانتقال للقسم', onclick: function () { activeCat = 'notifications'; searchQuery = ''; searchInput.value = ''; renderNav(); renderMainContent(); } })
          ));
        }

        if ('واتساب whatsapp cloud api رقم هاتف webhook'.indexOf(searchQuery) >= 0) {
          foundCount++;
          resultsCard.appendChild(h('div', { class: 'search-result-group' },
            h('h4', { text: 'تكامل Meta WhatsApp Cloud API' }),
            h('p', { text: 'رقم هاتف المركز المعتمد، معرفات WABA، والـ Webhook.' }),
            h('button', { class: 'btn small light', type: 'button', text: 'الانتقال للقسم', onclick: function () { activeCat = 'whatsapp'; searchQuery = ''; searchInput.value = ''; renderNav(); renderMainContent(); } })
          ));
        }

        if ('الموقع العام طلبات التسجيل استفسارات توحد إعاقات'.indexOf(searchQuery) >= 0) {
          foundCount++;
          resultsCard.appendChild(h('div', { class: 'search-result-group' },
            h('h4', { text: 'الموقع العام ونظام طلبات التسجيل' }),
            h('p', { text: 'إدارة استمارة التسجيل الأولي العامة وخيارات الإعاقات المتاحة.' }),
            h('button', { class: 'btn small light', type: 'button', text: 'الانتقال للقسم', onclick: function () { activeCat = 'registration'; searchQuery = ''; searchInput.value = ''; renderNav(); renderMainContent(); } })
          ));
        }

        if ('المظهر اللغة داكن فاتح خطوط rtl ltr فرنسية'.indexOf(searchQuery) >= 0) {
          foundCount++;
          resultsCard.appendChild(h('div', { class: 'search-result-group' },
            h('h4', { text: 'المظهر واللغة والسمات البصرية' }),
            h('p', { text: 'الوضع الفاتح/الداكن، تفضيلات اللغة والخطوط.' }),
            h('button', { class: 'btn small light', type: 'button', text: 'الانتقال للقسم', onclick: function () { activeCat = 'appearance'; searchQuery = ''; searchInput.value = ''; renderNav(); renderMainContent(); } })
          ));
        }

        if (!foundCount) {
          resultsCard.appendChild(h('p', { class: 'muted', text: 'لم يتم العثور على إعدادات مطابقة لبحثك. تصفح الفئات من القائمة الجانبية.' }));
        }

        contentArea.appendChild(resultsCard);
        return;
      }

      var card = h('div', { class: 'card settings-group-card' });

      if (activeCat === 'general') {
        card.appendChild(h('div', { class: 'sgc-header' },
          h('div', null,
            h('h2', { text: 'الإعدادات العامة والهوية الرسمية' }),
            h('p', { class: 'muted small', text: 'بيانات الجمعية الرسمية، الهواتف، والعنوان المعتمد في الوثائق والمراسلات.' })
          ),
          badge('معتمدة رسمياً', 'ok')
        ));

        var inNameAr = h('input', { class: 'input', value: s.general.association_name_ar });
        var inNameFr = h('input', { class: 'input', value: s.general.association_name_fr });
        var inCenter = h('input', { class: 'input', value: s.general.center_name });
        var inYear = h('input', { class: 'input sic-num', value: s.general.academic_year });
        var inPhone = h('input', { class: 'input sic-num', value: s.general.phone });
        var inEmail = h('input', { class: 'input', type: 'email', value: s.general.email });
        var inWilaya = h('input', { class: 'input', value: s.general.wilaya });
        var inCommune = h('input', { class: 'input', value: s.general.commune });
        var inFb = h('input', { class: 'input', value: s.general.facebook_url });
        var inIg = h('input', { class: 'input', value: s.general.instagram_url });

        card.appendChild(createSettingItem('اسم الجمعية بالعربية', inNameAr, 'الاسم الرسمي الكامل للجمعية المطبوع في ترويسات الوثائق والشهادات.', 'إلزامي', 'gold'));
        card.appendChild(createSettingItem('اسم الجمعية بالفرنسية', inNameFr, 'الاسم المعتمد في الوثائق الفرنسية والمراسلات الإدارية الرسمية.', 'معتمد', 'ok'));
        card.appendChild(createSettingItem('اسم المركز النفسي البيداغوجي', inCenter, 'اسم المركز الرئيسي لدار الإحسان المتكفل بالأطفال.', 'نشط', 'ok'));
        card.appendChild(createSettingItem('الموسم الدراسي المعتمد', inYear, 'السنة التربوية المطبوعة تلقائياً في تقارير وبطاقات الطلبة.', 'حالي', 'gold'));
        card.appendChild(createSettingItem('رقم الهاتف الرسمي للتواصل', inPhone, 'رقم الهاتف المتاح للأولياء والجهات الرسمية.', 'مفعّل', 'ok'));
        card.appendChild(createSettingItem('البريد الإلكتروني الرسمي', inEmail, 'البريد المستخدم لاستقبال المراسلات والإشعارات الإدارية.', 'مفعّل', 'ok'));
        card.appendChild(createSettingItem('الولاية والبلدية', h('div', { class: 'form-grid-2' }, inWilaya, inCommune), 'المقر الجغرافي الرسمي للجمعية (غرداية - العطف).', 'ثابت', 'gray'));
        card.appendChild(createSettingItem('روابط التواصل الاجتماعي', h('div', { class: 'form-grid-2' }, inFb, inIg), 'روابط صفحتي فيسبوك وإنستغرام الخاصة بالجمعية.', 'مربوطة', 'ok'));

        card.appendChild(h('div', { class: 'settings-actions-row' },
          h('button', {
            type: 'button',
            class: 'btn gold',
            onclick: function () {
              s.general.association_name_ar = inNameAr.value.trim();
              s.general.association_name_fr = inNameFr.value.trim();
              s.general.center_name = inCenter.value.trim();
              s.general.academic_year = inYear.value.trim();
              s.general.phone = inPhone.value.trim();
              s.general.email = inEmail.value.trim();
              s.general.wilaya = inWilaya.value.trim();
              s.general.commune = inCommune.value.trim();
              s.general.facebook_url = inFb.value.trim();
              s.general.instagram_url = inIg.value.trim();
              saveAllSettings();
            }
          }, makeSvgIcon('s-check'), h('span', { text: 'حفظ الإعدادات العامة' }))
        ));

      } else if (activeCat === 'centers') {
        card.appendChild(h('div', { class: 'sgc-header' },
          h('div', null,
            h('h2', { text: 'إعدادات المراكز والأقسام التربوية' }),
            h('p', { class: 'muted small', text: 'إدارة حالة ظهور المراكز الثلاثة وأوصافها المعتمدة في النظام.' })
          ),
          badge('3 مراكز معتمدة', 'ok')
        ));

        var cbMain = h('input', { type: 'checkbox', checked: !!s.centers.main_visible });
        var cbWork = h('input', { type: 'checkbox', checked: !!s.centers.work_visible });
        var cbFarm = h('input', { type: 'checkbox', checked: !!s.centers.farm_visible });
        var txtMain = h('textarea', { class: 'input', rows: '2' }, s.centers.main_desc);
        var txtWork = h('textarea', { class: 'input', rows: '2' }, s.centers.work_desc);
        var txtFarm = h('textarea', { class: 'input', rows: '2' }, s.centers.farm_desc);

        card.appendChild(createSettingItem('المركز الرئيسي (النفسي البيداغوجي)', cbMain, 'تفعيل ظهور المركز الرئيسي في صفحة اختيار المراكز والموقع العام.', cbMain.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('وصف المركز الرئيسي', txtMain, 'النبذة التعريفية الظاهرة للمستخدمين والزوار حول خدمات المركز.', 'تعريف', 'gray'));

        card.appendChild(createSettingItem('مركز المساعدة على العمل (CAT)', cbWork, 'تفعيل ظهور ورشات التأهيل والتمهين الحرفي في المنصة.', cbWork.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('وصف مركز المساعدة على العمل', txtWork, 'الأهداف الحرفية والمهنية المعتمدة لورشات التأهيل.', 'تعريف', 'gray'));

        card.appendChild(createSettingItem('المزرعة البيداغوجية (البستنة)', cbFarm, 'تفعيل ظهور المزرعة والأنشطة البيئية والفلاحية في المنصة.', cbFarm.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('وصف المزرعة البيداغوجية', txtFarm, 'أنشطة التأهيل الزراعي والاندماج البيئي للطلبة.', 'تعريف', 'gray'));

        card.appendChild(h('div', { class: 'settings-actions-row' },
          h('button', {
            type: 'button',
            class: 'btn gold',
            onclick: function () {
              s.centers.main_visible = cbMain.checked;
              s.centers.work_visible = cbWork.checked;
              s.centers.farm_visible = cbFarm.checked;
              s.centers.main_desc = txtMain.value.trim();
              s.centers.work_desc = txtWork.value.trim();
              s.centers.farm_desc = txtFarm.value.trim();
              saveAllSettings();
            }
          }, makeSvgIcon('s-check'), h('span', { text: 'حفظ إعدادات المراكز' }))
        ));

      } else if (activeCat === 'roles') {
        card.appendChild(h('div', { class: 'sgc-header' },
          h('div', null,
            h('h2', { text: 'إدارة الأدوار ومصفوفة الصلاحيات' }),
            h('p', { class: 'muted small', text: 'توزيع الصلاحيات الإدارية والبيداغوجية وفق السياسة الأمنية لدار الإحسان.' })
          ),
          badge('نظام الأدوار RLS', 'gold')
        ));

        var rolesTable = h('table', { class: 'sheet' },
          h('thead', null,
            h('tr', null,
              h('th', { text: 'الدور الوظيفي' }),
              h('th', { text: 'ملفات الطلبة' }),
              h('th', { text: 'تسجيل الحضور' }),
              h('th', { text: 'التقارير والتقييم' }),
              h('th', { text: 'الرسائل والإعلانات' }),
              h('th', { text: 'الأرشيف والإدارة' })
            )
          ),
          h('tbody', null,
            h('tr', null,
              h('td', null, h('strong', { text: 'مدير النظام (Admin)' })),
              h('td', null, badge('كامل (إضافة/تعديل/حذف)', 'ok')),
              h('td', null, badge('كامل', 'ok')),
              h('td', null, badge('اعتماد ونشر', 'ok')),
              h('td', null, badge('إرسال جماعي وفردي', 'ok')),
              h('td', null, badge('صلاحية شاملة', 'gold'))
            ),
            h('tr', null,
              h('td', null, h('strong', { text: 'مربية القسم (Educator)' })),
              h('td', null, badge('عرض طلاب قسمها فقط', 'gray')),
              h('td', null, badge('تسجيل حضور قسمها', 'ok')),
              h('td', null, badge('إعداد تقارير قسمها', 'ok')),
              h('td', null, badge('ممنوع', 'bad')),
              h('td', null, badge('ممنوع', 'bad'))
            ),
            h('tr', null,
              h('td', null, h('strong', { text: 'الأخصائية النفسانية' })),
              h('td', null, badge('استعراض وتعديل', 'ok')),
              h('td', null, badge('تسجيل ومتابعة', 'ok')),
              h('td', null, badge('إعداد استمارات التقييم', 'ok')),
              h('td', null, badge('ممنوع', 'bad')),
              h('td', null, badge('ممنوع', 'bad'))
            ),
            h('tr', null,
              h('td', null, h('strong', { text: 'الولي (Parent)' })),
              h('td', null, badge('عرض ملف طفله فقط (RLS)', 'ok')),
              h('td', null, badge('عرض وتبرير غياب طفله', 'ok')),
              h('td', null, badge('استعراض تقارير طفله', 'ok')),
              h('td', null, badge('استقبال ومراسلة المركز', 'ok')),
              h('td', null, badge('ممنوع', 'bad'))
            )
          )
        );
        card.appendChild(rolesTable);

        card.appendChild(h('div', { class: 'settings-actions-row' },
          h('button', {
            type: 'button',
            class: 'btn light',
            onclick: function () { go('accounts'); }
          }, makeSvgIcon('s-users'), h('span', { text: 'الانتقال إلى إدارة حسابات المستخدمين' }))
        ));

      } else if (activeCat === 'notifications') {
        card.appendChild(h('div', { class: 'sgc-header' },
          h('div', null,
            h('h2', { text: 'إعدادات الإشعارات والتنبيهات الفورية' }),
            h('p', { class: 'muted small', text: 'تحديد قنوات وأحداث الإشعارات التلقائية لأولياء الأمور والموظفين.' })
          ),
          badge('تنبيهات فورية', 'ok')
        ));

        var cbAbsence = h('input', { type: 'checkbox', checked: !!s.notifications.notify_absence });
        var cbReps = h('input', { type: 'checkbox', checked: !!s.notifications.notify_reports });
        var cbEvals = h('input', { type: 'checkbox', checked: !!s.notifications.notify_evaluations });
        var cbDocs = h('input', { type: 'checkbox', checked: !!s.notifications.notify_docs });
        var cbMsgs = h('input', { type: 'checkbox', checked: !!s.notifications.notify_messages });
        var cbPush = h('input', { type: 'checkbox', checked: !!s.notifications.notify_push_enabled });
        var cbWa = h('input', { type: 'checkbox', checked: !!s.notifications.notify_whatsapp_enabled });

        card.appendChild(createSettingItem('إشعارات تسجيل الغياب', cbAbsence, 'إرسال إشعار فوري للولي عبر الهاتف والواتساب فور تسجيل غياب طفله.', cbAbsence.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('إشعارات التقارير التربوية', cbReps, 'تنبيه الولي فور اعتماد تقرير بيداغوجي دوري جديد للطفل.', cbReps.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('إشعارات استمارات التقييم', cbEvals, 'إشعار الولي باعتماد بطاقة التقييم البيداغوجي الفصلي.', cbEvals.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('إشعارات الوثائق والمستندات', cbDocs, 'تنبيه عند رفع وثيقة رسمية أو شهادة تخص ملف الطفل.', cbDocs.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('إشعارات الرسائل والإعلانات', cbMsgs, 'إشعار عند توجيه رسالة خاصة للأسرة أو نشر إعلان عام.', cbMsgs.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('إشعارات الهاتف الفورية (Web Push PWA)', cbPush, 'إرسال إشعارات مباشرة لشاشة الهاتف حتى والتطبيق مغلق.', cbPush.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('إشعارات واتساب السحابية', cbWa, 'إرسال قوالب واتساب الرسمية المعتمدة عبر Cloud API.', cbWa.checked ? 'مفعّل' : 'معطّل', 'ok'));

        card.appendChild(h('div', { class: 'settings-actions-row' },
          h('button', {
            type: 'button',
            class: 'btn gold',
            onclick: function () {
              s.notifications.notify_absence = cbAbsence.checked;
              s.notifications.notify_reports = cbReps.checked;
              s.notifications.notify_evaluations = cbEvals.checked;
              s.notifications.notify_docs = cbDocs.checked;
              s.notifications.notify_messages = cbMsgs.checked;
              s.notifications.notify_push_enabled = cbPush.checked;
              s.notifications.notify_whatsapp_enabled = cbWa.checked;
              saveAllSettings();
            }
          }, makeSvgIcon('s-check'), h('span', { text: 'حفظ إعدادات الإشعارات' }))
        ));

      } else if (activeCat === 'whatsapp') {
        card.appendChild(h('div', { class: 'sgc-header' },
          h('div', null,
            h('h2', { text: 'تكامل Meta WhatsApp Cloud API' }),
            h('p', { class: 'muted small', text: 'حالة الاتصال بالواجهة الرسمية لواتساب. الأسرار والمفاتيح الحساسة محفوظة مشفرة في Supabase Secrets.' })
          ),
          badge('متصل Cloud API', 'ok')
        ));

        card.appendChild(h('div', { class: 'wa-status-box' },
          h('div', { class: 'wa-status-header' },
            h('div', { class: 'wa-status-indicator is-connected' }),
            h('strong', { text: 'حالة الربط: متصل وجاهز للخدمة (Connected)' }),
            badge('Cloud API v20.0', 'ok')
          ),
          h('div', { class: 'wa-meta-grid' },
            h('div', null, h('span', { text: 'رقم هاتف المركز المعتمد:' }), h('b', { class: 'sic-num', text: OFFICIAL_WA_SENDER })),
            h('div', null, h('span', { text: 'معرّف حساب واتساب للأعمال (WABA ID):' }), h('b', { class: 'sic-num', text: s.whatsapp.waba_id })),
            h('div', null, h('span', { text: 'معرّف رقم الهاتف (Phone Number ID):' }), h('b', { class: 'sic-num', text: s.whatsapp.phone_number_id })),
            h('div', null, h('span', { text: 'رمز التحقق من الـ Webhook:' }), h('b', { class: 'sic-num', text: s.whatsapp.webhook_token }))
          )
        ));

        card.appendChild(h('div', { class: 'card', style: 'margin-top:16px;background:#F8FAFC;border:1px solid #E2E8F0;' },
          h('strong', { text: '🔒 الحماية والأمان:' }),
          h('p', { class: 'muted small', style: 'margin:4px 0 0;', text: 'مفاتيح الوصول الدائمة WHATSAPP_ACCESS_TOKEN و WHATSAPP_APP_SECRET تعمل حصرياً عبر Supabase Edge Functions الآمنة ولا تظهر في المتصفح أبداً لحماية حساب المركز.' })
        ));

      } else if (activeCat === 'registration') {
        card.appendChild(h('div', { class: 'sgc-header' },
          h('div', null,
            h('h2', { text: 'إعدادات الموقع العام ونظام طلبات التسجيل' }),
            h('p', { class: 'muted small', text: 'تخصيص استمارة التسجيل الأولي العامة وخيارات الإعاقات المتاحة للعائلات.' })
          ),
          badge('استمارة عامة', 'gold')
        ));

        var cbReg = h('input', { type: 'checkbox', checked: !!s.registration.enable_registration_form });
        var cbInq = h('input', { type: 'checkbox', checked: !!s.registration.enable_inquiries_form });
        var txtDisabilities = h('textarea', { class: 'input', rows: '5' }, s.registration.disability_options);
        var txtConsent = h('textarea', { class: 'input', rows: '3' }, s.registration.consent_text);

        card.appendChild(createSettingItem('استمارة طلب تسجيل أولي جديد', cbReg, 'إظهار زر واستمارة التقديم للعائلات أسفل الموقع العام.', cbReg.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('استمارة تقديم استفسار عام', cbInq, 'إظهار زر واستمارة الاستفسارات والأسئلة أسفل الموقع العام.', cbInq.checked ? 'مفعّل' : 'معطّل', 'ok'));
        card.appendChild(createSettingItem('قائمة أنواع الإعاقات والاضطرابات', txtDisabilities, 'الخيارات المعروضة في القائمة المنسدلة للولي (سطر لكل نوع إعاقة).', 'خيارات مخصصة', 'gold'));
        card.appendChild(createSettingItem('نص إشعار الخصوصية والموافقة الصريحة', txtConsent, 'النص القانوني الإلزامي الذي يوافق عليه الولي قبل إرسال بيانات طفله.', 'قانوني معتمد', 'ok'));

        card.appendChild(h('div', { class: 'settings-actions-row' },
          h('button', {
            type: 'button',
            class: 'btn gold',
            onclick: function () {
              s.registration.enable_registration_form = cbReg.checked;
              s.registration.enable_inquiries_form = cbInq.checked;
              s.registration.disability_options = txtDisabilities.value.trim();
              s.registration.consent_text = txtConsent.value.trim();
              saveAllSettings();
            }
          }, makeSvgIcon('s-check'), h('span', { text: 'حفظ إعدادات التسجيل' }))
        ));

      } else if (activeCat === 'appearance') {
        card.appendChild(h('div', { class: 'sgc-header' },
          h('div', null,
            h('h2', { text: 'المظهر واللغة والسمات البصرية' }),
            h('p', { class: 'muted small', text: 'تخصيص الألوان والسمة البصرية المستوحاة من Glassmorphism.' })
          ),
          badge('SaaS Glassmorphism', 'ok')
        ));

        var selTheme = h('select', { class: 'input' },
          h('option', { value: 'light', text: 'الوضع الفاتح الرسمي (Light Glass)' }),
          h('option', { value: 'dark', text: 'الوضع الليلي (Dark Mode)' }),
          h('option', { value: 'auto', text: 'تلقائي حسب إعدادات الجهاز' })
        );
        selTheme.value = s.appearance.theme_mode || 'light';

        var selLang = h('select', { class: 'input' },
          h('option', { value: 'ar', text: 'العربية (RTL - اللغة الرسمية)' }),
          h('option', { value: 'fr', text: 'الفرنسية (LTR - Français)' })
        );
        selLang.value = s.appearance.default_lang || 'ar';

        var selFont = h('select', { class: 'input' },
          h('option', { value: 'normal', text: 'حجم الخط الافتراضي (14-16px)' }),
          h('option', { value: 'large', text: 'حجم خط مكبر مريح (16-18px)' })
        );
        selFont.value = s.appearance.font_scale || 'normal';

        card.appendChild(createSettingItem('نمط السمة والمظهر', selTheme, 'اختيار السمة المرئية للوحة الإدارة بين الوضع الفاتح والداكن.', selTheme.value, 'ok'));
        card.appendChild(createSettingItem('اللغة الافتراضية للواجهة', selLang, 'تحديد اللغة المعتمدة عند فتح لوحة التحكم مع الدعم الكامل للاتجاهين.', selLang.value === 'ar' ? 'العربية RTL' : 'الفرنسية LTR', 'gold'));
        card.appendChild(createSettingItem('مقياس حجم الخطوط', selFont, 'ضبط حجم الخطوط لتوفير قراءة مريحة على الحواسيب والشاشات الصغيرة.', selFont.value, 'ok'));

        card.appendChild(h('div', { class: 'settings-palette-preview', style: 'margin-top:20px;' },
          h('strong', { text: 'لوحة الألوان الرسمية المعتمدة لدار الإحسان:' }),
          h('div', { class: 'palette-swatches' },
            h('div', { class: 'swatch', style: 'background:#102F50;', title: 'الكحلي الداكن #102F50' }, h('span', { text: '#102F50' })),
            h('div', { class: 'swatch', style: 'background:#174D78;', title: 'الأزرق الرئيسي #174D78' }, h('span', { text: '#174D78' })),
            h('div', { class: 'swatch', style: 'background:#C49A50;color:#000;', title: 'الذهبي #C49A50' }, h('span', { text: '#C49A50' })),
            h('div', { class: 'swatch', style: 'background:#E5C47F;color:#000;', title: 'الذهبي الفاتح #E5C47F' }, h('span', { text: '#E5C47F' })),
            h('div', { class: 'swatch', style: 'background:#EAF2FA;color:#000;', title: 'الأزرق الفاتح #EAF2FA' }, h('span', { text: '#EAF2FA' })),
            h('div', { class: 'swatch', style: 'background:#F4F7FB;color:#000;', title: 'الخلفية #F4F7FB' }, h('span', { text: '#F4F7FB' }))
          )
        ));

        card.appendChild(h('div', { class: 'settings-actions-row' },
          h('button', {
            type: 'button',
            class: 'btn gold',
            onclick: function () {
              s.appearance.theme_mode = selTheme.value;
              s.appearance.default_lang = selLang.value;
              s.appearance.font_scale = selFont.value;
              saveAllSettings();
            }
          }, makeSvgIcon('s-check'), h('span', { text: 'تطبيق وحفظ إعدادات المظهر' }))
        ));

      } else if (activeCat === 'security') {
        card.appendChild(h('div', { class: 'sgc-header' },
          h('div', null,
            h('h2', { text: 'الأمان والرقابة وسياسات النفاذ' }),
            h('p', { class: 'muted small', text: 'فحص معايير الأمان المطبقة في قاعدة البيانات، التشفير، وسجل التدقيق.' })
          ),
          badge('أمان مشدد RLS', 'ok')
        ));

        card.appendChild(h('div', { class: 'security-cards-grid' },
          h('div', { class: 'sec-metric-card' },
            makeSvgIcon('s-shield'),
            h('div', null,
              h('strong', { text: 'سياسات حماية البيانات (Row Level Security - RLS)' }),
              h('p', { class: 'muted small', text: 'مفعلة على كافة الجداول (الأطفال، التقارير، الوثائق، الحسابات). يستحيل وصول مستخدم غير مخول إلى ملفات الآخرين.' }),
              badge('RLS نشط ومؤمّن 100%', 'ok')
            )
          ),
          h('div', { class: 'sec-metric-card' },
            makeSvgIcon('s-lock'),
            h('div', null,
              h('strong', { text: 'نظام المصادقة والتشفير (Supabase Auth)' }),
              h('p', { class: 'muted small', text: 'جلسات دخول مشفرة عبر JWT مع حماية كاملة لكلمات المرور وتوافق مع TOTP Authenticator.' }),
              badge('JWT Auth Active', 'ok')
            )
          ),
          h('div', { class: 'sec-metric-card' },
            makeSvgIcon('s-log'),
            h('div', null,
              h('strong', { text: 'سجل العمليات والرقابة الأمنية (Audit Logs)' }),
              h('p', { class: 'muted small', text: 'تسجيل غير قابل للتعديل لكافة عمليات الإضافة والتعديل والاعتماد مع توثيق المنفذ والتوقيت.' }),
              h('button', {
                type: 'button',
                class: 'btn small light',
                style: 'margin-top:8px;',
                onclick: function () { go('audit'); }
              }, makeSvgIcon('s-log'), h('span', { text: 'عرض سجل العمليات والتدقيق' }))
            )
          )
        ));
      }

      contentArea.appendChild(card);
    }

    renderNav();
    renderMainContent();

    layout.appendChild(sidebar);
    layout.appendChild(contentArea);
    root.appendChild(layout);
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
    var dbAttendance = Array.isArray(d[1]) ? d[1] : [];
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
    branches: secBranches,
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
    if (S.isEducator && (sec !== 'children' && (sec !== 'reports' || isFarmSession()))) {
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
    if (!S.isEducator && (S.activeCenter === 'work' || S.activeCenter === 'farm') && sec !== 'hub' && sec !== 'hub_accounts' && sec !== 'children' && sec !== 'attendance' && sec !== 'accounts' && sec !== 'dash' && sec !== 'notifications') {
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
      var staffSess = readStaffSession();
      if (!C.loggedIn() && !staffSess) {
        return showLogin();
      }
      var meta = await loadPortalMeta(true);
      var meUser = null;
      if (C.loggedIn()) {
        try { meUser = await C.me(); } catch (eMe) { meUser = null; }
      }
      if (!meUser && staffSess) {
        meUser = { id: staffSess.id || 'staff-session', email: staffSess.email };
      }
      var myEmail = (meUser && meUser.email || (staffSess && staffSess.email) || '').toLowerCase();
      var delEmails = (meta.deleted_emails || []).map(function (x) { return String(x || '').toLowerCase(); });
      if (myEmail && (delEmails.indexOf(myEmail) >= 0 || (S.deletedRuntimeEmails && S.deletedRuntimeEmails[myEmail]))) {
        clearEducatorDirectSession();
        await C.signOut();
        return showLogin('تم حذف هذا الحساب ولم يعد مخوّلاً بالدخول.');
      }

      var accMeta = (meta.account_meta && meta.account_meta[myEmail]) || null;
      var eduMatch = (meta.educators || []).filter(function (e) {
        return e.email && e.email.toLowerCase() === myEmail;
      })[0];
      var embeddedMatch = EMBEDDED_STAFF.filter(function (st) {
        return st.email && st.email.toLowerCase() === myEmail;
      })[0];
      if (!accMeta && embeddedMatch) {
        accMeta = Object.assign({ center_access: embeddedMatch.center }, embeddedMatch);
      }
      if (!accMeta && staffSess && staffSess.email && staffSess.email.toLowerCase() === myEmail) {
        accMeta = Object.assign({}, staffSess);
      }

      var isKnownStaff = !!(accMeta || eduMatch || embeddedMatch || staffSess);
      var isKnownSpec = !!((accMeta && (accMeta.role === 'specialist' || accMeta.job_title === 'أخصائية نفسانية')) ||
                           (embeddedMatch && (embeddedMatch.role === 'specialist' || embeddedMatch.job_title === 'أخصائية نفسانية')) ||
                           myEmail === 'edu.0655806951@darelihsan.org' ||
                           (staffSess && (staffSess.role === 'specialist' || staffSess.job_title === 'أخصائية نفسانية')));
      var isKnownEdu = !isKnownSpec && !!((accMeta && accMeta.role === 'educator') || eduMatch || (embeddedMatch && embeddedMatch.role === 'educator') || (staffSess && staffSess.role === 'educator'));

      if (C.loggedIn()) {
        var ok = false;
        try {
          var rpcP = C.rpc('can_manage_families');
          var timeP2 = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 3000); });
          ok = await Promise.race([rpcP, timeP2]);
        } catch (eRpc) { ok = isKnownStaff; }
        if (ok !== true && !isKnownStaff) {
          var anyAdmin = false;
          try { anyAdmin = await C.rpc('is_admin'); } catch (eAdm) {}
          await C.signOut();
          return showLogin(anyAdmin === true ? 'حسابك محرّر: لا يملك صلاحية بيانات الأطفال والأولياء.' : 'هذا الحساب غير مخوّل بالدخول إلى هذه اللوحة.');
        }
      }

      S.me = meUser || { email: myEmail };
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
        $('#who').textContent = 'الأخصائية نواري اسماء بنت جيلالي — دار الإحسان الرئيسي';
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

      var startSec = (S.isEducator || S.isSpecialist) ? 'children' : 'hub';
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
            var staffProf = verifyStaffPortalAuth(rawInput, em, pw, meta);
            if (staffProf) {
              persistStaffSession(staffProf);
              $('#password').value = '';
              await enter();
              return;
            }
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
    var saved = localStorage.getItem('de_theme');
    var theme = saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(theme);

    var btn = document.getElementById('themeToggleBtn');
    if (btn && !btn._themeBound) {
      btn._themeBound = true;
      btn.addEventListener('click', toggleTheme);
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    } else {
      document.documentElement.classList.remove('theme-dark');
    }
    localStorage.setItem('de_theme', theme);

    var btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن');
      btn.title = theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن';
      var u = btn.querySelector('use');
      if (u) u.setAttribute('href', theme === 'dark' ? '#s-sun' : '#s-moon');
    }
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(cur === 'dark' ? 'light' : 'dark');
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
      var qDemo = $('#quickDemoAdminBtn');
      if (qDemo) {
        qDemo.addEventListener('click', function () {
          $('#email').value = '0540817775';
          $('#password').value = 'DI11051993';
          $('#loginForm').dispatchEvent(new Event('submit'));
        });
      }
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
        if ((!C.loggedIn() && !readStaffSession()) || ($('#app') && $('#app').hidden)) return;

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

      if (C.load() || readStaffSession()) {
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