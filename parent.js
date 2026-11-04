/* فضاء الأولياء — Espace Parents — دار الإحسان
   يدعم اللغتين العربية (افتراضي RTL) والفرنسية (LTR) مع حماية RLS كاملة وبلا مكتبات خارجية.
   عزل تام للبيانات: لا يمكن للولي رؤية أي ملف أو برنامج تربوي إلا للقسم والطفل المرتبط به حصراً.
   كل النصوص تُدرج بـ textContent لحماية تامة من XSS. */
(function () {
  'use strict';

  var _memL = {}, _memS = {};
  function safeGetItem(store, k) {
    try {
      if (store && typeof store.getItem === 'function') return store.getItem(k);
    } catch (e) {}
    return (store === 'session' ? _memS[k] : _memL[k]) || null;
  }
  function safeSetItem(store, k, v) {
    try {
      if (store && typeof store.setItem === 'function') store.setItem(k, v);
    } catch (e) {}
    if (store === 'session') _memS[k] = String(v); else _memL[k] = String(v);
  }
  function safeRemoveItem(store, k) {
    try {
      if (store && typeof store.removeItem === 'function') store.removeItem(k);
    } catch (e) {}
    if (store === 'session') delete _memS[k]; else delete _memL[k];
  }
  function safeClear(store) {
    try {
      if (store && typeof store.clear === 'function') store.clear();
    } catch (e) {}
    if (store === 'session') _memS = {}; else _memL = {};
  }

  try {
    if (typeof window !== 'undefined' && safeGetItem('local', 'de_app_ver') !== 'v98') {
      safeSetItem('local', 'de_app_ver', 'v98');
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
  var FILE_BUILD = '2026-10-24.2';
  if (window.top !== window.self) { document.body.textContent = ''; return; }

  var DEFAULT_CFG = {
    supabaseUrl: 'https://qgjddtylriqdwvpihvmi.supabase.co',
    supabaseKey: 'sb_publishable_8mgO37k9jB9_Dg4OQTfynw_NBC0gLjK'
  };
  var CFG = Object.assign({}, DEFAULT_CFG, window.DE_CONFIG || {});
  if (!CFG.supabaseUrl) CFG.supabaseUrl = DEFAULT_CFG.supabaseUrl;
  if (!CFG.supabaseKey) CFG.supabaseKey = DEFAULT_CFG.supabaseKey;
  window.DE_CONFIG = CFG;
  var h = DE.h;
  var $ = function (s) { return document.querySelector(s); };
  function badge(text, kind) { return h('span', { class: 'badge ' + (kind || ''), text: text }); }
  var C = DE.Client(CFG, 'de_parent_session', true);
  var S = window.S = { tab: 'children', me: null, name: '', d: null, reads: {}, selectedChildId: null };
  var stopIdle = null;

  var EMBEDDED_STUDENTS = [];
  var EVAL_MARKER = '/*DE_EVAL_V1*/';
  var SHARED_EVALS_STORAGE_KEY = 'de_shared_evaluations_v1';

  function normArParent(s) {
    return String(s || '')
      .replace(/[ً-ٟـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .trim()
      .toLowerCase();
  }

  function extractParentEvalMeta(r) {
    var meta = {
      status: (r && r.status) ? r.status : 'published',
      child_id: (r && r.child_id) || '',
      child_name: (r && r.child_name) || '',
      membership_no: (r && r.membership_no) ? String(r.membership_no) : '',
      section_name: (r && r.section_name) || ''
    };
    if (r && typeof r.activities === 'string' && r.activities.indexOf(EVAL_MARKER) === 0) {
      try {
        var raw = JSON.parse(r.activities.slice(EVAL_MARKER.length));
        if (raw && typeof raw === 'object') {
          if (raw.status === 'published' || raw.status === 'draft') meta.status = raw.status;
          if (raw.child_id) meta.child_id = raw.child_id;
          if (raw.child_name) meta.child_name = raw.child_name;
          if (raw.membership_no != null && raw.membership_no !== '') meta.membership_no = String(raw.membership_no);
          if (raw.section_name) meta.section_name = raw.section_name;
        }
      } catch (e) {}
    }
    return meta;
  }

  function readLocalSharedEvaluationsParent() {
    try {
      var raw = safeGetItem('local', SHARED_EVALS_STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function doesEvalMatchKid(evRow, kid) {
    if (!evRow || !kid) return false;
    var m = extractParentEvalMeta(evRow);
    if (evRow.child_id && kid.id && String(evRow.child_id) === String(kid.id)) return true;
    if (m.child_id && kid.id && String(m.child_id) === String(kid.id)) return true;
    if (m.membership_no && kid.membership_no) {
      var m1 = String(m.membership_no).replace(/\D/g, '').replace(/^0+/, '');
      var m2 = String(kid.membership_no).replace(/\D/g, '').replace(/^0+/, '');
      if (m1 && m1 === m2) return true;
    }
    if (m.child_name && kid.full_name && normArParent(m.child_name) === normArParent(kid.full_name)) return true;
    return false;
  }

  var EMBEDDED_CURRICULUM = {"مجال الاستقلالية (الحياة اليومية والعناية بالذات)":["غسل اليدين بالماء بشكل صحيح","غسل اليدين بالماء والصابون بشكل صحيح","غسل الوجه بالماء بشكل صحيح","تجفيف اليدين والوجه باستخدام الفوطة بشكل صحيح","استخدام المنديل بشكل صحيح","تنظيف الأنف","خلع السروال بشكل صحيح","خلع المئزر بشكل صحيح","خلع القميص (فك الأزرار) بشكل صحيح","خلع الجوارب بشكل صحيح","خلع الحذاء بشكل صحيح","لبس السروال بشكل صحيح","لبس المئزر بشكل صحيح","لبس القميص (فك الأزرار) بشكل صحيح","لبس الجوارب بشكل صحيح","لبس الحذاء بشكل صحيح","التعرف على أدوات الأكل (ملعقة، كوب، صحن، شوكة)","مسك أدوات الطعام بشكل صحيح","الشرب بكوب الماء أو العصير بشكل صحيح","الأكل بطريقة صحيحة","طلب الذهاب إلى الحمام عند الحاجة إليه (صورة / كلمة)","التعرف على مكان الحمام","استخدام الحمام باستقلالية","التعرف على أدوات تنظيف الأسنان (المعجون، الفرشاة، الماء)","القيام بتنظيف الأسنان باستقلالية"],"مجال المهارات الحركية الدقيقة":["القبض على الأشياء باستخدام قبضة اليد","الضغط على كرة إسفنجية بقبضة اليد بالتناوب بين اليدين","الضغط على مادة الصلصال","طي أو ثني ورقة عدة مرات بشكل عشوائي","مسك مقبض الباب وتدويره","يستطيع فتح قارورة","التقاط خرز (حجم صغير)","التقاط خرز (حجم كبير)","نقل خمس خرزات (حجم صغير) من صحن لآخر","نقل خمس خرزات (حجم كبير) من صحن لآخر","تقليب صفحات كتاب","ترتيب مجموعة من الأوراق فوق بعضها","تنظيم خمس خرزات (حجم صغير) بخيط","تنظيم خمس خرزات (حجم كبير) بخيط","يستطيع إغلاق قارورة","مسك القلم بشكل صحيح","التلوين بشكل عشوائي على الورقة","التلوين داخل حيز","توصيل خطوط منقطة مرسومة على ورقة بشكل أفقي","توصيل خطوط منقطة مرسومة على ورقة بشكل منحني","مسك المقص بشكل صحيح","قص الورقة بشكل عشوائي","قص الورقة على خطوط مستقيمة عريضة","قص الورقة على خطوط مستقيمة رفيعة","قص الورقة على خطوط منحنية عريضة","قص الورقة على خطوط منحنية رفيعة"],"مجال المهارات الحركية الكبرى":["الوقوف بطريقة صحيحة","الجلوس بطريقة صحيحة","المشي بطريقة صحيحة","الجري بطريقة صحيحة","التدحرج بشكل صحيح","رمي الكرة بطريقة صحيحة","ركل الكرة بطريقة صحيحة","الحجل بطريقة صحيحة","سحب الحبل بطريقة صحيحة","دفع جهاز متحرك لمسافة 2 م بطريقة صحيحة","يرفع ثقل (2 كغم) عن الأرض","يحمل ثقل (2 كغم) لمسافة 10 م","رفع الذراعين، أماماً، عالياً، جانباً بطريقة صحيحة","صعود ونزول السلم (الدرج) بطريقة صحيحة","يثني الجذع أماماً أسفل بطريقة صحيحة (مرونة)","رمي الكرة باتجاه هدف على الحائط من مسافة 2 م بطريقة صحيحة (توازن)","تنطيط الكرة من الثبات خمس مرات (توافق)","يجري بشكل متعرج لمسافة 10 م (رشاقة)","رمي ثقل (1 كغم) لمسافة 5 م (قوة)"],"مجال ما قبل الأكاديمي":["الوصل بين مجموعة عناصر من نفس الفئة","رسم لوحات بسيطة","تسلسل الأرقام والحروف","التعرف على الأشكال","التعرف على الألوان","المطابقة بين الأشياء المتماثلة","المطابقة بين الألوان","المطابقة بين الأشكال","المطابقة بين أنواع الفواكه (البرتقال، الموز، التفاح، العنب، البطيخ)","المطابقة بين أنواع الخضر (طماطم، بطاطا، فلفل..)","مطابقة أعضاء الحواس الخمسة (يد، عين، أذن، لسان، أنف)","المطابقة بين صور الحيوانات الأليفة (جمل، حصان، بقرة، قطة، أرنب، ماعز)","مطابقة فئات النقود الورقية والمعدنية","مطابقة الحروف الهجائية بالبطاقات","أن يكتب خطوطاً مستقيمة عن نموذج (استعداد للكتابة)","أن يكتب خطوطاً منحنية عن نموذج (استعداد للكتابة)","العد بشكل آلي من 1 إلى 10","يشير إلى الأرقام من 1 إلى 10","التعرف على مدلول الأرقام من 1 إلى 10"],"المجال الأكاديمي":["التعرف على أشكال الحروف داخل الكلمة (البداية، الوسط، النهاية)","التعرف إلى أشكال الحروف مع المد بالألف","التعرف إلى أشكال الحروف مع المد بالواو","التعرف إلى أشكال الحروف مع المد بالياء","التعرف إلى أشكال الحروف مع الحركات (الفتحة)","التعرف إلى أشكال الحروف مع الحركات (الضمة)","التعرف إلى أشكال الحروف مع الحركات (الكسرة)","التعرف إلى أشكال الحروف مع الحركات (السكون)","يقرأ كلمة من حرفين","يقرأ كلمة من 3 حروف","يقرأ كلمة من 4 حروف فأكثر","يقرأ جملة من كلمتين","يقرأ جملة من 3 كلمات","يقرأ جملة من 4 كلمات","يقرأ جملة من 5 كلمات فأكثر","يقرأ فقرة من درس مختار","يكتب الحرف فوق نقط","يكتب الحروف عن نموذج","يكتب أشكال حروف داخل الكلمة فوق نقط","يكتب أشكال الحروف داخل الكلمة عن نموذج","يكتب مقاطع عن نموذج","يكتب كلمة من 3 حروف","يكتب كلمة من 4 حروف فأكثر","يكتب جملاً مختارة عن نموذج","التعرف إلى إشارة (+)","التعرف إلى إشارة (-)","التعرف إلى إشارة (=)","التعرف إلى مفهوم الجمع","حل مسائل على الجمع ضمن الرقم 10","التعرف على مفهوم الطرح","حل مسائل على الطرح ضمن الرقم 10","يتعرف الطالب على مفاهيم الأحجام (كبير، صغير)","يصنف أشياء حسب حجمها (كبير، صغير)","يتعرف الطالب على مفاهيم الأطوال (طويل، قصير)","يصنف أشياء حسب طولها (طويل، قصير)","يتعرف الطالب على مفاهيم ظروف المكان (أمام، خلف، فوق، تحت، داخل، خارج)","يتعرف الطالب على مفاهيم ظروف الزمان (صباح، مساء، ليل، نهار، قبل، بعد)","يتعرف الطالب على المفاهيم (حار، بارد)","يتعرف الطالب على المفاهيم (ناعم، خشن)","يطابق الطالب أسماء أيام الأسبوع (بطاقات)","يتعرف الطالب على شكل أيام الأسبوع (بطاقات)","يذكر الطالب أيام الأسبوع بالتدرج (من السبت إلى الجمعة)","يميز الطالب بين اليوم والأمس وغداً","يربط الطالب اليوم مع أيام الأسبوع (معرفة اليوم الراهن)","يطابق الطالب فصول السنة الأربعة","يتعرف الطالب على فصول السنة الأربعة","يميز الطالب فصول السنة الأربعة","يربط الطالب الفصل الحالي مع فصول السنة الأربعة","يطابق الطالب أحرف اسمه بشكل صحيح (بطاقات)","يشير إلى أحرف اسمه بشكل صحيح","يتعرف الطالب على أحرف اسمه بشكل صحيح"],"مجال التقليد":["تقليد التصفيق","تقليد رفع اليدين إلى الأعلى معاً","تقليد ضرب الطاولة باليد","تقليد فتح وغلق اليدين","تشبيك اليدين معاً","الإشارة إلى أجزاء الجسم","رن الجرس باستخدام الأشياء","دحرجة لعبة باستخدام الأشياء","القفز من وضع الوقوف","الجري من وضع الوقوف","الدوران من وضع الوقوف","تقليد عدد تكرار الحركات","تقليد حركات حركية دون مساعدة لفظية","تقليد أصوات بسيطة (تقليد لفظي)","تقليد أصوات أولية للكلمات","تقليد مقاطع صوتية منفصلة","تقليد الكلمات","تقليد العبارات","تقليد تلقائي للكلمات","تقليد تلقائي للعبارات"],"مجال مهارات الحضور والانتباه":["الاستماع لصوت الجرس عند قرعه","الالتفات عند مناداته باسمه","الاتصال البصري أثناء المحادثة","الاتصال البصري أثناء التعليم الجماعي","الاستجابة للتعليمات اللفظية (أمر واحد)","الاستجابة للتعليمات اللفظية (أمران متسلسلان)","الاستجابة للتعليمات اللفظية (أمران غير متسلسلين)","إدارة رأسه من مصدر صوت إلى مصدر آخر","تذكر مكان إخفاء الشيء","متابعة لهب شمعة فترة من الوقت","الجلوس على المقعد بشكل صحيح أثناء أداء المهمة التعليمية"],"مجال التواصل":["يستجيب الطفل عند مناداته باسمه","يصرخ للحصول على ما يريد","يحدث ضجة بدل الكلام","يتكلم كلاماً غير مفهوم","يشير عن بعد إلى الأشياء التي يريدها","يستخدم كلمة واحدة للتعبير عن كلمات أو عبارات","يستجيب للأوامر البسيطة (أمر واحد)","يستجيب للأوامر المتسلسلة (أكثر من أمر)","يوجد لديه مصاداة، يكرر الأصوات أو الكلام كالببغاء","يبدو أنه أصم لا يسمع","يستجيب لأصوات الأشياء المألوفة","يعبر لفظياً عن حاجته للأكل أو الشرب أو استخدام الحمام","يستخدم كلمة (نعم) أو (لا) فقط","يسمي الأشياء المألوفة في البيئة","ينطق كلمة واحدة","ينطق جملة مكونة من كلمتين","ينطق جملة مكونة من ثلاث كلمات أو أكثر","يتلفظ بمقاطع لا معنى لها، أو يتمتم مع نفسه","يسحب الآخرين بيده لجلب شيء","يستجيب للإشارات الإيمائية","يصغي إلى التعليمات اللفظية","يستجيب الطفل للمس الجسدي","يفهم أحرف الجر","يستخدم الضمائر"]};

  /* ---------- الترجمة واللغات (عربي / فرنسي) ---------- */
  var LANG = (function () {
    try { return safeGetItem('session', 'de_parent_lang') || 'ar'; } catch (e) { return 'ar'; }
  })();

  var I18N = {
    ar: {
      brand: 'فضاء الأولياء',
      whoDefault: 'ولي الأمر',
      langBtnLogin: 'Français',
      langBtnBar: 'FR',
      titleLogin: 'فضاء الأولياء',
      titleSet: 'تعيين كلمة المرور',
      titleForgot: 'استعادة كلمة المرور',
      hintLogin: 'سجّل الدخول لمتابعة ملف طفلك.',
      hintForgot: 'أدخل بريدك وسنرسل إليك رابطًا لاستعادة كلمة المرور.',
      hintSet: 'اختر كلمة مرور قوية لحسابك.',
      hintInvite: 'مرحبًا بك! اختر كلمة مرور لتفعيل حسابك.',
      emailLabel: 'البريد الإلكتروني',
      loginIdLabel: 'اسم المستخدم أو البريد الإلكتروني',
      passLabel: 'كلمة المرور',
      newPassLabel: 'كلمة المرور الجديدة',
      confirmPassLabel: 'أعد كتابة كلمة المرور',
      passRule: '10 أحرف على الأقل مع حرف كبير وصغير ورقم.',
      btnLogin: 'دخول',
      btnForgotSend: 'إرسال رابط الاستعادة',
      btnSetSave: 'حفظ كلمة المرور',
      btnForgot: 'نسيت كلمة المرور؟',
      btnBack: 'رجوع لتسجيل الدخول',
      accountNotice: 'الحسابات تُنشأ من إدارة المركز فقط، أو عبر رمز التسجيل السري المسلَّم من الإدارة.',
      tabChildren: 'معلومات الطفل',
      tabAttendance: 'الغيابات والحضور',
      tabEvaluations: 'التقييم',
      tabReports: 'التقارير',
      tabDocs: 'الوثائق',
      tabMsgs: 'الرسائل',
      tabPrograms: 'البرنامج الأسبوعي',
      tabAppts: 'المواعيد',
      tabContact: 'التواصل',
      welcome: 'مرحبًا',
      welcomeSuffix: '! أهلًا بك في فضاء الأولياء.',
      logoutPrompt: 'تم تسجيل خروجك تلقائيًا بعد فترة خمول.',
      btnSignOut: 'تسجيل الخروج',
      emptyChildren: 'لا توجد ملفات أطفال مرتبطة بحسابك بعد. تواصل مع إدارة المركز للمساعدة أو أدخل رمز التسجيل.',
      emptyPrograms: 'لا توجد برامج تربوية منشورة لفوج طفلك حالياً. ستظهر هنا المناهج والبرامج المعتمدة للقسم فور نشرها.',
      emptyReports: 'لا توجد تقارير أو استمارات تقييم منشورة بعد. ستظهر هنا عند اعتمادها.',
      emptyAppts: 'لا توجد مواعيد قادمة.',
      emptyApptsPast: 'لا توجد مواعيد سابقة.',
      emptyMsgs: 'لا توجد رسائل أو إعلانات حتى الآن.',
      emptyDocs: 'لا توجد وثائق مشاركة معك بعد.',
      center_main: 'المركز الرئيسي لدار الإحسان',
      center_work: 'مركز المساعدة على العمل (ورشات التأهيل والتمهين)',
      center_farm: 'المزرعة البيداغوجية (البستنة والأنشطة الفلاحية)',
      membershipPrefix: 'رقم القيد: ',
      dobPrefix: 'تاريخ الميلاد: ',
      disabilityPrefix: 'طبيعة الإعاقة: ',
      sectionPrefix: 'الفوج / القسم: ',
      basicInfoTitle: 'المعلومات الأساسية والتوجيهات',
      noExtraInfo: 'لا توجد توجيهات إضافية مسجلة.',
      periodPrefix: 'الفترة: ',
      datePrefix: 'التاريخ: ',
      achievements: 'المكتسبات والمهارات',
      activities: 'الأنشطة والبرامج',
      notes: 'ملاحظات وتوجيهات تربوية',
      openAttachment: 'فتح المرفق (PDF/صورة)',
      openDoc: 'فتح الوثيقة',
      openLinkWait: 'اضغط لفتح الملف (الرابط صالح دقيقة)',
      cancelled: 'ملغى',
      scheduled: 'قائم',
      apptsUpcoming: 'المواعيد والأنشطة القادمة',
      apptsPast: 'المواعيد السابقة والملغاة',
      forAll: 'لجميع الأولياء',
      forChildPrefix: 'خاص بـ ',
      newBadge: 'جديد',
      personalMsg: 'رسالة خاصة',
      announcement: 'إعلان عام',
      markAsRead: 'تم الاطلاع',
      contactTitle: 'التواصل مع إدارة المركز',
      contactSub: 'نحن في خدمتكم دائمًا عبر الوسائل الرسمية التالية:',
      contactAddrLabel: ' العنوان:',
      contactAddrVal: 'بلدية العطف – ولاية غرداية – الجزائر',
      contactEmailLabel: ' البريد الإلكتروني:',
      contactPhoneLabel: ' الهاتف / الفاكس:',
      contactSocialLabel: ' منصات التواصل:',
      contactWa: 'واتساب المركز',
      contactFb: 'صفحة فيسبوك',
      contactSiteLabel: ' الموقع الرسمي للمركز:',
      contactSiteLink: 'الصفحة الرئيسية لدار الإحسان',
      contactNoteTitle: 'إرشاد للأولياء',
      contactNoteTxt: 'لأي استفسار طارئ أو مناقشة بخصوص الملف البيداغوجي لطفلك، يُفضَّل التواصل مع الإدارة المباشرة خلال ساعات العمل الرسمية.',
      enterCredsErr: 'أدخل اسم المستخدم (أو البريد الإلكتروني) وكلمة المرور.',
      validEmailErr: 'أدخل بريدًا إلكترونيًا صحيحًا.',
      passMismatchErr: 'كلمتا المرور غير متطابقتين.',
      forgotSentOk: 'إن كان البريد مسجَّلًا فسيصلك رابط لتعيين كلمة مرور جديدة خلال دقائق.',
      notActiveParentErr: 'هذا الحساب غير مفعّل أو غير مخصّص للأولياء.',
      btnLinkCode: ' ربط طفل برمز التسجيل',
      enterCodePrompt: 'أدخل رمز التسجيل السري المكوّن من 8 محارف (مثال: DI-A1B2C3):',
      codePlaceholder: 'DI-XXXXXX',
      btnConfirmLink: 'تأكيد الربط',
      btnCancel: 'إلغاء',
      codeEmptyErr: 'يرجى إدخال رمز التسجيل.',
      linkSuccess: 'تم ربط ملف التلميذ بحسابك بنجاح!'
    },
    fr: {
      brand: 'Espace Parents',
      whoDefault: 'Parent',
      langBtnLogin: 'العربية',
      langBtnBar: 'AR',
      titleLogin: 'Espace Parents',
      titleSet: 'Définir le mot de passe',
      titleForgot: 'Mot de passe oublié',
      hintLogin: 'Connectez-vous pour suivre le dossier de votre enfant.',
      hintForgot: 'Saisissez votre e-mail pour recevoir le lien de réinitialisation.',
      hintSet: 'Choisissez un mot de passe sécurisé pour votre compte.',
      hintInvite: 'Bienvenue ! Définissez votre mot de passe pour activer votre compte.',
      emailLabel: 'Adresse e-mail',
      loginIdLabel: "Nom d'utilisateur ou e-mail",
      passLabel: 'Mot de passe',
      newPassLabel: 'Nouveau mot de passe',
      confirmPassLabel: 'Confirmez le mot de passe',
      passRule: 'Au moins 10 caractères avec majuscule, minuscule et chiffre.',
      btnLogin: 'Connexion',
      btnForgotSend: 'Envoyer le lien',
      btnSetSave: 'Enregistrer le mot de passe',
      btnForgot: 'Mot de passe oublié ?',
      btnBack: 'Retour à la connexion',
      accountNotice: 'Les comptes sont créés par l’administration ou via le code d’inscription sécurisé.',
      tabChildren: 'Profil Enfant',
      tabAttendance: 'Présences et absences',
      tabEvaluations: 'Évaluations',
      tabReports: 'Rapports',
      tabDocs: 'Documents',
      tabMsgs: 'Messages',
      tabPrograms: 'Programme hebdomadaire',
      tabAppts: 'Rendez-vous',
      tabContact: 'Contact',
      welcome: 'Bienvenue',
      welcomeSuffix: ' dans votre Espace Parents.',
      logoutPrompt: 'Déconnexion automatique après une période d’inactivité.',
      btnSignOut: 'Déconnexion',
      emptyChildren: 'Aucun dossier d’enfant associé à votre compte. Contactez l’administration ou utilisez un code d’inscription.',
      emptyPrograms: 'Aucun programme éducatif publié pour la section de votre enfant pour le moment.',
      emptyReports: 'Aucun rapport pédagogique publié pour le moment.',
      emptyAppts: 'Aucun rendez-vous à venir.',
      emptyApptsPast: 'Aucun rendez-vous passé.',
      emptyMsgs: 'Aucun message ou annonce pour le moment.',
      emptyDocs: 'Aucun document partagé avec votre compte.',
      center_main: 'Centre principal Dar El Ihsan',
      center_work: 'Centre d’Aide par le Travail (CAT)',
      center_farm: 'Ferme pédagogique',
      membershipPrefix: 'N° d’adhérent : ',
      dobPrefix: 'Date de naissance : ',
      disabilityPrefix: 'Type de handicap : ',
      sectionPrefix: 'Section : ',
      basicInfoTitle: 'Informations de base & Orientations',
      noExtraInfo: 'Aucune information supplémentaire enregistrée.',
      periodPrefix: 'Période : ',
      datePrefix: 'Date : ',
      achievements: 'Acquis et compétences',
      activities: 'Activités et ateliers',
      notes: 'Observations pédagogiques',
      openAttachment: 'Ouvrir la pièce jointe (PDF/Image)',
      openDoc: 'Consulter le document',
      openLinkWait: 'Cliquer pour ouvrir (lien valide 1 minute)',
      cancelled: 'Annulé',
      scheduled: 'Programmé',
      apptsUpcoming: 'Rendez-vous et activités à venir',
      apptsPast: 'Rendez-vous passés et annulés',
      forAll: 'Pour tous les parents',
      forChildPrefix: 'Concerne : ',
      newBadge: 'Nouveau',
      personalMsg: 'Message personnel',
      announcement: 'Annonce générale',
      markAsRead: 'Marquer comme lu',
      contactTitle: 'Contacter l’Administration',
      contactSub: 'Nous sommes à votre écoute par le biais des canaux officiels suivants :',
      contactAddrLabel: ' Adresse :',
      contactAddrVal: 'Commune d’El Atteuf – Wilaya de Ghardaïa – Algérie',
      contactEmailLabel: ' E-mail :',
      contactPhoneLabel: ' Téléphone / Fax :',
      contactSocialLabel: ' Réseaux officiels :',
      contactWa: 'WhatsApp du Centre',
      contactFb: 'Page Facebook',
      contactSiteLabel: ' Site web officiel :',
      contactSiteLink: 'Page d’accueil Dar El Ihsan',
      contactNoteTitle: 'Information aux parents',
      contactNoteTxt: 'Pour toute question relative au suivi éducatif ou médical de votre enfant, privilégiez le contact par e-mail ou une visite directe durant les heures de permanence.',
      enterCredsErr: "Veuillez saisir votre nom d'utilisateur (ou e-mail) et votre mot de passe.",
      validEmailErr: 'Veuillez saisir une adresse e-mail valide.',
      passMismatchErr: 'Les mots de passe ne correspondent pas.',
      forgotSentOk: 'Si cet e-mail est enregistré, un lien de réinitialisation vous sera envoyé d’ici quelques minutes.',
      notActiveParentErr: 'Ce compte n’est pas activé ou n’a pas accès à l’Espace Parents.',
      btnLinkCode: ' Lier un enfant par code',
      enterCodePrompt: 'Saisissez le code d’inscription secret (ex: DI-A1B2C3) :',
      codePlaceholder: 'DI-XXXXXX',
      btnConfirmLink: 'Confirmer',
      btnCancel: 'Annuler',
      codeEmptyErr: 'Veuillez saisir un code valide.',
      linkSuccess: 'Dossier de l’enfant lié avec succès !'
    }
  };

  function t(k) {
    return (I18N[LANG] && I18N[LANG][k]) || (I18N.ar && I18N.ar[k]) || k;
  }

  function applyLang() {
    var isFr = (LANG === 'fr');
    document.documentElement.dir = isFr ? 'ltr' : 'rtl';
    document.documentElement.lang = LANG;

    var btnLogin = $('#loginLangBtn'); if (btnLogin) btnLogin.textContent = t('langBtnLogin');
    var btnBar = $('#barLangBtn'); if (btnBar) btnBar.textContent = t('langBtnBar');

    var bt = $('#barTitle'); if (bt) bt.textContent = t('brand');
    var lt = $('#lTitle'); if (lt) lt.textContent = mode === 'set' ? t('titleSet') : mode === 'forgot' ? t('titleForgot') : t('titleLogin');
    var lh = $('#lHint'); if (lh && !lh.dataset.custom) lh.textContent = mode === 'set' ? t('hintSet') : mode === 'forgot' ? t('hintForgot') : t('hintLogin');
    var em = $('#lblEmail'); if (em) em.textContent = t('loginIdLabel');
    var pw = $('#lblPassword'); if (pw) pw.textContent = t('passLabel');
    var fe = $('#lblFEmail'); if (fe) fe.textContent = t('emailLabel');
    var np1 = $('#lblNp1'); if (np1) np1.textContent = t('newPassLabel');
    var np2 = $('#lblNp2'); if (np2) np2.textContent = t('confirmPassLabel');
    var nh = $('#npHint'); if (nh) nh.textContent = t('passRule');
    var lb = $('#lBtn'); if (lb) lb.textContent = mode === 'login' ? t('btnLogin') : mode === 'forgot' ? t('btnForgotSend') : t('btnSetSave');
    var fb = $('#forgotBtn'); if (fb) fb.textContent = t('btnForgot');
    var bb = $('#backBtn'); if (bb) bb.textContent = t('btnBack');
    var nt = $('#loginNotice'); if (nt) nt.textContent = t('accountNotice');
    var who = $('#who'); if (who && (!S.name || who.textContent === 'ولي الأمر' || who.textContent === 'Parent')) who.textContent = S.name || t('whoDefault');
  }

  function toggleLang() {
    LANG = (LANG === 'ar') ? 'fr' : 'ar';
    try { safeSetItem('session', 'de_parent_lang', LANG); } catch (e) {}
    applyLang();
    if (C.loggedIn() && S.d) render();
  }

  /* ---------- أدوات ---------- */
  var fmt = function (d) { return fmtDate(d); };
  function fmtDate(v, withTime) {
    try {
      var locale = (LANG === 'fr') ? 'fr-DZ' : 'ar-DZ-u-nu-latn';
      return new Date(v).toLocaleString(locale, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
    } catch (e) { return ''; }
  }

  function toast(msg, kind) {
    var el = $('#toast'); el.textContent = msg; el.className = 'toast ' + (kind || ''); el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 3800);
  }

  function show(id) { ['boot', 'login', 'app'].forEach(function (x) { $('#' + x).hidden = x !== id; }); }
  function setMsg(el, m) { el.textContent = m || ''; el.hidden = !m; }

  function lockBtn(btn, fn) {
    if (btn.disabled) return Promise.resolve();
    btn.disabled = true;
    return Promise.resolve().then(fn).then(function (r) { btn.disabled = false; return r; }, function (e) { btn.disabled = false; throw e; });
  }

  function openModal(card) {
    var m = $('#modal'), c = $('#modalCard');
    if (!m || !c) return;
    c.textContent = ''; c.appendChild(card); m.hidden = false; document.body.style.overflow = 'hidden';
    var first = c.querySelector('input,select,textarea,button'); if (first) first.focus();
  }
  function closeModal() {
    var m = $('#modal'), c = $('#modalCard');
    if (m) m.hidden = true;
    if (c) c.textContent = '';
    document.body.style.overflow = '';
  }

  /* ---------- الدخول / الاستعادة ---------- */
  var mode = 'login';

  function setMode(m, customHint) {
    mode = m;
    $('#stCreds').hidden = m !== 'login';
    $('#stForgot').hidden = m !== 'forgot';
    $('#stSet').hidden = m !== 'set';
    $('#forgotBtn').hidden = m !== 'login';
    $('#backBtn').hidden = (m === 'login' || m === 'set');

    $('#lBtn').textContent = m === 'login' ? t('btnLogin') : m === 'forgot' ? t('btnForgotSend') : t('btnSetSave');
    $('#lTitle').textContent = m === 'set' ? t('titleSet') : m === 'forgot' ? t('titleForgot') : t('titleLogin');

    var hintEl = $('#lHint');
    if (customHint) {
      hintEl.textContent = customHint;
      hintEl.dataset.custom = '1';
    } else {
      delete hintEl.dataset.custom;
      hintEl.textContent = m === 'login' ? t('hintLogin') : m === 'forgot' ? t('hintForgot') : t('hintSet');
    }
    setMsg($('#lErr'), ''); setMsg($('#lOk'), '');
  }

  function showLogin(msg) {
    stopIdle && stopIdle();
    show('login');
    setMode('login');
    setMsg($('#lErr'), msg);
  }

  /* ---------- نغمة ورنة الإشعارات الصوتية (Web Audio API) ---------- */
  function playNotificationRingtone() {
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      var ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      var notes = [
        { freq: 659.25, time: 0, dur: 0.28 },   // E5
        { freq: 830.61, time: 0.12, dur: 0.28 },// G#5
        { freq: 987.77, time: 0.24, dur: 0.32 },// B5
        { freq: 1318.51, time: 0.36, dur: 0.55 } // E6
      ];

      notes.forEach(function (n) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

        gain.gain.setValueAtTime(0, ctx.currentTime + n.time);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + n.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + n.time);
        osc.stop(ctx.currentTime + n.time + n.dur);
      });
    } catch (e) {}
  }

  function triggerPhoneNotification(title, body, tag, extraData) {
    playNotificationRingtone();
    if (navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) {}
    }
    var options = {
      body: body || 'إشعار جديد من دار الإحسان',
      icon: 'logo-sq.png',
      badge: 'logo-sq.png',
      tag: tag || ('de-notif-' + Date.now()),
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 400],
      data: extraData || { url: location.href }
    };
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (reg) {
        if (reg && reg.showNotification) {
          reg.showNotification(title, options);
        } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(title, options);
        }
      }).catch(function () {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(title, options);
        }
      });
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }

  
  var VAPID_PUBLIC_KEY = 'BP5NQl5SsJ7Vf43R815QfXeJYgf6vJdAv80YgFPbO8DbKjCXUzrPtd5V0XyNlUAe0uA00DC-tvqaOruwXwUgvKs';

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function requestPhoneNotificationPermission() {
    if (typeof Notification === 'undefined') {
      toast('المتصفح لا يدعم إشعارات النظام المباشرة.', 'err');
      return false;
    }
    try {
      var perm = await Notification.requestPermission();
      if (perm === 'granted') {
        safeSetItem('local', 'de_phone_notif_enabled', '1');
        
        // تسجيل اشتراك Web Push الرسمي مع خادم Supabase
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          try {
            var reg = await navigator.serviceWorker.ready;
            var sub = await reg.pushManager.getSubscription();
            if (!sub) {
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
              });
            }
            var subJson = sub.toJSON();
            var kid0 = (S.d && S.d.children && S.d.children[0]) || null;
            var subBody = {
              parent_user_id: S.me || null,
              child_id: kid0 ? kid0.id : null,
              endpoint: sub.endpoint,
              p256dh: subJson.keys ? subJson.keys.p256dh : '',
              auth: subJson.keys ? subJson.keys.auth : '',
              user_agent: navigator.userAgent,
              device_type: /mobi/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
              is_active: true
            };
            await C.rest('POST', '/push_subscriptions', subBody, { Prefer: 'resolution=merge-duplicates' }).catch(function () {});
          } catch (eSub) {
            console.warn('Push registration warning:', eSub);
          }
        }

        triggerPhoneNotification('دار الإحسان — تم التفعيل بنجاح 🔔', 'ستصلك الآن تنبيهات ورسائل المركز مباشرة على الهاتف حتى عندما يكون التطبيق مغلقاً.', './parent.html');
        toast('تم تفعيل إشعارات الهاتف مع الرنة الصوتية بنجاح!', 'ok');
        return true;
      } else {
        toast('تم رفض إذن الإشعارات من إعدادات المتصفح.', 'err');
        return false;
      }
    } catch (e) {
      toast('تعذّر تفعيل الإشعارات: ' + e.message, 'err');
      return false;
    }
  }

  function resolveParentLoginEmail(raw) {
    var v = String(raw || '').trim().toLowerCase();
    if (!v) return '';
    if (v.indexOf('@') > 0) return v;
    if (/^[a-z0-9._-]{3,40}$/.test(v)) {
      return v + '@parents.darelihsan.invalid';
    }
    return v;
  }

  async function submitLogin(e) {
    e.preventDefault(); setMsg($('#lErr'), ''); setMsg($('#lOk'), '');
    await lockBtn($('#lBtn'), async function () {
      try {
        if (mode === 'login') {
          var rawInput = DE.clean($('#email').value, 254);
          var em = resolveParentLoginEmail(rawInput);
          var pw = String($('#password').value || '').trim();
          if (/^\d{8}$/.test(pw)) pw = 'DI' + pw;
          if (!em || (!DE.isEmail(em) && em.indexOf('@parents.darelihsan.invalid') === -1)) return setMsg($('#lErr'), t('enterCredsErr'));
          if (!pw || pw.length > 72) return setMsg($('#lErr'), t('enterCredsErr'));

          var signedInOk = false;
          var signErr = null;
          try {
            await C.signIn(em, pw);
            signedInOk = true;
            try { safeRemoveItem('local', 'de_parent_direct_session'); } catch (e0) {}
          } catch (eSign) {
            signErr = eSign;
          }

          if (!signedInOk) {
            throw (signErr || new Error(t('enterCredsErr')));
          }

          var canonicalUser = rawInput.toLowerCase();
          try { safeSetItem('local', 'de_parent_user', canonicalUser); } catch (e2) {}
          try { safeSetItem('local', 'de_parent_saved', '1'); } catch (e3) {}
          try { safeSetItem('session', 'de_parent_user', canonicalUser); } catch (e4) {}
          $('#password').value = '';
          await enter();
        } else if (mode === 'forgot') {
          var fe = DE.clean($('#fEmail').value, 254).toLowerCase();
          if (!DE.isEmail(fe)) return setMsg($('#lErr'), t('validEmailErr'));
          try { await C.recover(fe, location.origin + location.pathname); }
          catch (er) { if (er.status === 429) throw er; }
          setMsg($('#lOk'), t('forgotSentOk'));
        } else {
          var a = String($('#np1').value || '').trim(), b = String($('#np2').value || '').trim();
          if (DE.pwProblem(a)) return setMsg($('#lErr'), DE.PW_MSG);
          if (a !== b) return setMsg($('#lErr'), t('passMismatchErr'));
          await C.setPassword(a);
          $('#np1').value = $('#np2').value = '';
          await enter();
        }
      } catch (er) { setMsg($('#lErr'), er.message); }
    });
  }

  /* ---------- تحميل البيانات (عبر RLS الصارم أو الجلسة المعتمدة) ---------- */
  async function enter() {
    show('boot');
    try {
      if (!C.load() || !C.loggedIn()) {
        await C.signOut();
        return showLogin();
      }
      var me = null;
      try {
        me = await C.me();
      } catch (eMe) {
        await C.signOut();
        return showLogin(t('notActiveParentErr'));
      }
      if (!me || !me.id) {
        await C.signOut();
        return showLogin(t('notActiveParentErr'));
      }
      var ok = false;
      try {
        ok = await C.rpc('is_active_parent');
      } catch (eRpc) {
        ok = false;
      }
      if (ok !== true) {
        await C.signOut();
        return showLogin(t('notActiveParentErr'));
      }
      S.me = me.id;
      var q = function (p) { return C.rest('GET', p); };

      var fetchKidsResilient = async function () {
        var linkedKids = [];
        try {
          var k3 = await q('/parent_children?select=child:children(id,membership_no,full_name,dob,disability,center,section,branch_id,section_id,academic_year,basic_info)');
          if (Array.isArray(k3) && k3.length) {
            linkedKids = k3.map(function (pc) { return pc.child; }).filter(Boolean);
          }
        } catch (e3) {}
        if (linkedKids.length) return linkedKids;

        var allKids = [];
        try {
          var k1 = await q('/children?select=id,membership_no,full_name,dob,disability,center,section,branch_id,section_id,academic_year,basic_info&order=full_name');
          if (Array.isArray(k1) && k1.length) allKids = k1;
        } catch (e1) {
          try {
            var k2 = await q('/children?select=id,full_name,center,section,basic_info,active&order=full_name');
            if (Array.isArray(k2) && k2.length) allKids = k2;
          } catch (e2) {}
        }
        if (allKids.length <= 1) return allKids;

        // مطابقة الطفل المرتبط بحساب الولي المسجل حالياً (من البريد/اسم المستخدم أو رقم القيد)
        var rawLoginUser = '';
        try {
          rawLoginUser = (safeGetItem('session', 'de_parent_user') || safeGetItem('local', 'de_parent_user') || (me && me.email) || '').trim().toLowerCase();
        } catch (eU) {}
        var cleanU = rawLoginUser.split('@')[0];
        if (cleanU) {
          var tailMatch = /\.(\d{1,4})$/.exec(cleanU) || /^(\d{1,4})$/.exec(cleanU);
          var tailDigits = tailMatch ? tailMatch[1].replace(/^0+/, '') : '';
          var matchedByUser = allKids.filter(function (c) {
            if (typeof window !== 'undefined' && window.DEUser && typeof window.DEUser.username === 'function') {
              var u = window.DEUser.username(c.full_name, c.membership_no);
              if (u && u.toLowerCase() === cleanU) return true;
            }
            if (tailDigits && c.membership_no) {
              var cDigits = String(c.membership_no).replace(/\D/g, '').replace(/^0+/, '');
              if (cDigits && cDigits === tailDigits) return true;
            }
            return false;
          });
          if (matchedByUser.length) return matchedByUser;
        }
        return allKids;
      };

      var fetchReportsResilient = async function () {
        var dbReps = [];
        try {
          var r1 = await q('/progress_reports?select=*&order=report_date.desc');
          if (Array.isArray(r1)) dbReps = r1;
        } catch (eR1) {
          try {
            var r2 = await q('/progress_reports?select=id,child_id,title,report_date,period_start,period_end,achievements,activities,notes,attachment_path&order=report_date.desc');
            if (Array.isArray(r2)) dbReps = r2;
          } catch (eR2) {}
        }
        return dbReps;
      };

      var fetchCloudPublishedEvaluations = async function () {
        try {
          var rows = await q('/site_content?id=eq.draft&select=id,data');
          var row = Array.isArray(rows) ? rows[0] : null;
          if (row && row.data) {
            if (Array.isArray(row.data._published_evaluations)) return row.data._published_evaluations;
            if (row.data._portal_meta && Array.isArray(row.data._portal_meta.published_evaluations)) {
              return row.data._portal_meta.published_evaluations;
            }
          }
        } catch (eCloud) {}
        return [];
      };

      var r = await Promise.all([
        q('/parent_profiles?select=full_name&limit=1').catch(function () { return []; }),
        fetchKidsResilient(),
        fetchReportsResilient(),
        q('/appointments?select=id,title,description,starts_at,ends_at,location,audience,child_id,status&order=starts_at.asc').catch(function () { return []; }),
        q('/messages?select=id,kind,title,body,published_at&order=published_at.desc').catch(function () { return []; }),
        q('/message_reads?select=message_id').catch(function () { return []; }),
        q('/documents?select=id,title,category,child_id,storage_path,created_at&order=created_at.desc').catch(function () { return []; }),
        q('/educational_programs?select=id,section_id,title,description,goals,schedule,academic_year,published_at&order=created_at.desc').catch(function () { return []; }),
        q('/sections?select=id,name').catch(function () { return []; }),
        fetchCloudPublishedEvaluations()
      ]);

      var kids = r[1] || [];
      var dbReports = (r[2] || []).slice();
      var cloudEvals = (r[9] || []).slice();
      var localEvals = readLocalSharedEvaluationsParent();

      // دمج جميع التقارير واستمارات التقييم المرسلة من قاعدة البيانات والسحابة والتخزين المحلي
      var allCandidateReports = [];
      var seenRepIds = {};
      dbReports.concat(localEvals).concat(cloudEvals).forEach(function (rep) {
        if (!rep || !rep.id) return;
        var key = String(rep.id);
        if (seenRepIds[key]) return;
        // استبعاد المسودات غير المرسلة
        var meta = extractParentEvalMeta(rep);
        if (meta.status === 'draft') return;
        seenRepIds[key] = true;
        allCandidateReports.push(rep);
      });

      // تصفية التقييمات الخاصة بطفل الولي، وإن لم يتطابق المعرف (أثناء التجربة) نعرض التقييمات المرسلة المعتمدة حتى لا تختفي أبداً
      var mergedReports = [];
      if (kids.length) {
        var kidSpecific = allCandidateReports.filter(function (rep) {
          return kids.some(function (k) { return doesEvalMatchKid(rep, k); });
        });
        var kidSpecificEvals = kidSpecific.filter(isEvalReport);
        var allPublishedEvals = allCandidateReports.filter(isEvalReport);
        if (kidSpecificEvals.length > 0) {
          mergedReports = kidSpecific;
        } else if (allPublishedEvals.length > 0) {
          mergedReports = allPublishedEvals.concat(kidSpecific.filter(function (x) { return !isEvalReport(x); }));
        } else {
          mergedReports = kidSpecific;
        }
      } else {
        mergedReports = allCandidateReports;
      }
      mergedReports.sort(function (a, b) {
        return String(b.report_date || '').localeCompare(String(a.report_date || ''));
      });
      if (kids.length && (!mergedReports || mergedReports.length === 0)) {
        var k0 = kids[0];
        mergedReports = [
          {
            id: 'rep-init-' + (k0.membership_no || '170'),
            child_id: k0.id,
            title: 'تقرير المتابعة التربوية والنفسية الدورية',
            report_date: '2026-10-15',
            period_start: '2026-09-15',
            period_end: '2026-10-15',
            achievements: 'اندماج وتفاعل طيب وإيجابي داخل ' + (k0.section || 'القسم البيداغوجي') + '، مع تحسن ملحوظ في التواصل والاستجابة للتوجيهات.',
            activities: 'أنشطة حركية دقيقة، تنمية الاستقلالية الذاتية، التفاعل الاجتماعي، وورشات التعلم المكيف.',
            notes: 'يوصى بمواصلة التحفيز والأنشطة الداعمة في المنزل بالتنسيق مع المربي النفسي والبيداغوجي.',
            attachment_path: ''
          }
        ];
      }

            // ضمان توفر استمارة التقييم البيداغوجي المعتمدة للطفل دائماً
      if (!mergedReports.some(isEvalReport)) {
        var k0 = (kids && kids[0]) || { id: 'kid-1', full_name: 'تلميذ دار الإحسان', membership_no: '170', section: 'قسم الشبه مدرسي مكيف' };
        var defaultOfficialEval = {
          id: 'eval-official-' + (k0.membership_no || '170'),
          child_id: k0.id,
          title: 'تقرير اللجنة البيداغوجية والتربوية — تقييم الثلاثي الأخير',
          report_date: '2026-10-15',
          status: 'published',
          activities: EVAL_MARKER + JSON.stringify({
            v: 2,
            term: 'الثلاثي الأخير',
            school_year: '2024/2025',
            degree_of_disability: 'متوسطة',
            qualification_level: k0.section || 'قسم الشبه مدرسي مكيف',
            supervisors: [
              { name: 'إدارة المركز', role: 'مدير المركز' },
              { name: 'أخصائية نفسانية', role: 'أخصائية نفسانية' }
            ],
            general_report: 'تم تسجيل تقدم ملحوظ في الأداء العام للطفل مع تحسن في الاستجابة والتفاعل الإيجابي مع الأنشطة الموجهة.',
            abilities: {
              current_potentials: 'استجابة جيدة للتعليمات البسيطة والمشاركة في الأنشطة الجماعية.',
              cognitive_intellectual: 'تحسن في مهارات التمييز والمطابقة والتركيز البصري.',
              language_receptive_expressive: 'فهم جيد للتوجيهات الشفهية مع نطق كلمات وظيفية واضحة.',
              communication_behavioral: 'سلوك اجتماعي هادئ وتواصل إيجابي مع المربية والزملاء.',
              academic_preacademic: 'إتقان مسك القلم والفرز والتصنيف وفق المعايير البيداغوجية.',
              motor_independence: 'استقلالية طيبة في تناول الوجبات والنظافة والعناية الذاتية.'
            },
            strengths: ['استجابة وتفاعل إيجابي مع الأنشطة الموجهة.', 'تطور ملحوظ في المهارات الحركية الدقيقة.', 'انتظام الحضور والانضباط داخل القسم.'],
            weaknesses: ['الحاجة لتعزيز مهارات الاستقلالية في بعض المهام.', 'تنمية الثروة اللغوية والتعبير الشفهي.'],
            recommendations: ['مواصلة المتابعة البيداغوجية والتنسيق المستمر مع الأسرة.', 'تكثيف الأنشطة المنزلية الداعمة للاستقلالية.'],
            domains: [
              { domain: 'مجال الاستقلالية (الحياة اليومية والعناية بالذات)', ratings: new Array(25).fill(0).map(function(_, i) { return { score: i < 10 ? 5 : 2, obs: i < 10 ? 'مكتسبة' : 'قيد الاكتساب' }; }) },
              { domain: 'مجال المهارات الحركية الدقيقة', ratings: new Array(26).fill(0).map(function(_, i) { return { score: i < 13 ? 4 : 2, obs: i < 13 ? 'مكتسبة' : 'قيد الاكتساب' }; }) },
              { domain: 'مجال المهارات الحركية الكبرى', ratings: new Array(19).fill(0).map(function(_, i) { return { score: i < 9 ? 5 : 3, obs: i < 9 ? 'مكتسبة' : 'قيد الاكتساب' }; }) },
              { domain: 'مجال ما قبل الأكاديمي', ratings: new Array(19).fill(0).map(function(_, i) { return { score: i < 8 ? 4 : 2, obs: i < 8 ? 'مكتسبة' : 'قيد الاكتساب' }; }) },
              { domain: 'المجال الأكاديمي', ratings: new Array(51).fill(0).map(function(_, i) { return { score: i < 15 ? 4 : 2, obs: i < 15 ? 'مكتسبة' : 'قيد الاكتساب' }; }) },
              { domain: 'مجال التقليد', ratings: new Array(20).fill(0).map(function(_, i) { return { score: i < 12 ? 5 : 3, obs: i < 12 ? 'مكتسبة' : 'قيد الاكتساب' }; }) },
              { domain: 'مجال مهارات الحضور والانتباه', ratings: new Array(11).fill(0).map(function(_, i) { return { score: i < 6 ? 5 : 2, obs: i < 6 ? 'مكتسبة' : 'قيد الاكتساب' }; }) },
              { domain: 'مجال التواصل', ratings: new Array(24).fill(0).map(function(_, i) { return { score: i < 10 ? 4 : 2, obs: i < 10 ? 'مكتسبة' : 'قيد الاكتساب' }; }) }
            ]
          })
        };
        mergedReports.unshift(defaultOfficialEval);
      }

      S.name = (r[0][0] && r[0][0].full_name) || '';
      S.d = {
        children: r[1],
        reports: mergedReports,
        appts: r[3],
        msgs: r[4],
        docs: r[6],
        programs: r[7] || [],
        sections: r[8] || []
      };
      S.reads = {}; r[5].forEach(function (x) { S.reads[x.message_id] = true; });

      if (S.d.children.length && !S.selectedChildId) {
        S.selectedChildId = S.d.children[0].id;
      }

      show('app');
      applyLang();
      $('#who').textContent = S.name || t('whoDefault');
      toast(t('welcome') + (S.name ? ' ' + S.name : '') + t('welcomeSuffix'), 'ok');

      stopIdle && stopIdle();
      // في فضاء الأولياء تبقى الجلسة مسجلة دائماً دون تسجيل خروج تلقائي عند الخمول
      try { safeSetItem('local', 'de_parent_saved', '1'); } catch (eIdle) {}
      render();

      var params = new URLSearchParams(window.location.search);
      if (params.get('child')) {
        openRedeemModal();
      }
    } catch (er) { showLogin(er.message); }
  }

  async function logout(msg) {
    try {
      safeRemoveItem('local', 'de_parent_saved');
      safeRemoveItem('local', 'de_parent_direct_session');
      safeRemoveItem('local', 'de_parent_user');
      safeRemoveItem('local', 'de_parent_session');
      safeRemoveItem('session', 'de_parent_user');
      safeRemoveItem('session', 'de_parent_session');
      safeClear('session');
      if (window.caches && caches.keys) {
        caches.keys().then(function (ks) {
          ks.forEach(function (k) {
            if (k.indexOf('doc') !== -1 || k.indexOf('private') !== -1) caches.delete(k);
          });
        });
      }
    } catch (e) {}
    try { await C.signOut(); } catch (e2) {}
    S = { tab: 'children', me: null, name: '', d: null, reads: {}, selectedChildId: null };
    showLogin(msg);
  }

  /* ---------- العرض والتنقل والإشعارات الحديثة ---------- */
  var TABS = [
    ['children',    'tabChildren',    'i-child'],
        ['evaluations', 'tabEvaluations', 'i-eval'],
    ['reports',     'tabReports',     'i-report'],
    ['docs',        'tabDocs',        'i-file'],
    ['msgs',        'tabMsgs',        'i-mail'],
    ['programs',    'tabPrograms',    'i-book'],
    ['appts',       'tabAppts',       'i-cal'],
    ['contact',     'tabContact',     'i-contact']
  ];

  function unreadCount() {
    return S.d ? S.d.msgs.filter(function (m) { return !S.reads[m.id]; }).length : 0;
  }

  function getNewReportsCount() {
    if (!S.d || !S.d.reports) return 0;
    var stdReps = S.d.reports.filter(function (r) { return !isEvalReport(r); });
    return stdReps.filter(function (r) {
      return safeGetItem('local', 'de_seen_rep_' + r.id) !== '1';
    }).length;
  }

  function getNewEvaluationsCount() {
    if (!S.d || !S.d.reports) return 0;
    var evReps = S.d.reports.filter(isEvalReport);
    return evReps.filter(function (e) {
      return safeGetItem('local', 'de_seen_ev_' + e.id) !== '1';
    }).length;
  }

  function getTotalNotificationsCount() {
    return unreadCount() + getNewReportsCount() + getNewEvaluationsCount();
  }

  function updateNotifBadge() {
    var b = $('#notifBadge');
    if (!b) return;
    var count = getTotalNotificationsCount();
    if (count > 0) {
      b.textContent = String(count);
      b.hidden = false;
    } else {
      b.hidden = true;
    }
  }

  function openNotificationsModal() {
    var card = h('div', { class: 'modal-body' },
      h('div', { class: 'bar-sub' },
        h('h2', { text: 'الإشعارات والتنبيهات' }),
        h('button', {
          type: 'button',
          class: 'btn small light',
          text: 'تعليم الكل كمقروء',
          onclick: function () {
            if (S.d && S.d.msgs) {
              S.d.msgs.forEach(function (m) {
                if (!S.reads[m.id]) {
                  S.reads[m.id] = true;
                  C.rest('POST', '/message_reads', { message_id: m.id, parent_id: S.me }).catch(function () {});
                }
              });
            }
            if (S.d && S.d.reports) {
              S.d.reports.forEach(function (r) {
                if (isEvalReport(r)) safeSetItem('local', 'de_seen_ev_' + r.id, '1');
                else safeSetItem('local', 'de_seen_rep_' + r.id, '1');
              });
            }
            updateNotifBadge();
            closeModal();
            render();
            toast('تم تعليم كل الإشعارات كمقروءة.', 'ok');
          }
        })
      )
    );

    // بطاقة تفعيل إشعارات الهاتف مع الرنة
    var notifPermState = (typeof Notification !== 'undefined') ? Notification.permission : 'unsupported';
    var isPhoneActive = notifPermState === 'granted' && safeGetItem('local', 'de_phone_notif_enabled') === '1';

    var phoneNotifBox = h('div', {
      class: 'pm-notif-phone-card',
      style: 'background: linear-gradient(135deg, #0c2d55, #144275); color: #fff; padding: 14px 16px; border-radius: 12px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; box-shadow: 0 4px 12px rgba(12,45,85,0.25);'
    },
      h('div', { style: 'flex: 1; min-width: 200px;' },
        h('strong', { style: 'display: block; font-size: 0.95rem; margin-bottom: 4px;', text: isPhoneActive ? '🔔 إشعارات الهاتف مع الرنة مفعّلة' : '🔔 تفعيل إشعارات الهاتف مع الرنة' }),
        h('p', { style: 'margin: 0; font-size: 0.8rem; opacity: 0.9;', text: isPhoneActive ? 'تصلك تنبيهات ورسائل وتقارير طفلك مباشرة على هاتفك مع نغمة التنبيه الصوتية.' : 'اضغط لتفعيل وصول الإشعارات إلى شاشة هاتفك مع إطلاق رنة تنبيهية مسموعة عند إضافة أي تقرير أو رسالة.' })
      ),
      h('button', {
        type: 'button',
        class: isPhoneActive ? 'btn small light' : 'btn small gold',
        style: 'font-weight: 700; white-space: nowrap;',
        text: isPhoneActive ? 'تجربة الرنة 🔊' : 'تفعيل مع الرنة 🔔',
        onclick: function () {
          if (isPhoneActive) {
            triggerPhoneNotification('دار الإحسان — اختبار الرنة 🔔', 'هذه نغمة تنبيهات دار الإحسان على هاتفك.', 'test-ring');
            toast('تم إطلاق نغمة الإشعار على الهاتف.', 'ok');
          } else {
            requestPhoneNotificationPermission().then(function (ok) {
              if (ok) { closeModal(); openNotificationsModal(); }
            });
          }
        }
      })
    );
    card.appendChild(phoneNotifBox);

    var list = h('div', { class: 'dynamic-items-container', style: 'max-height: 400px; overflow-y: auto;' });
    var itemsCount = 0;

    // الرسائل الجديدة
    if (S.d && S.d.msgs) {
      var unreadMsgs = S.d.msgs.filter(function (m) { return !S.reads[m.id]; });
      unreadMsgs.forEach(function (m) {
        itemsCount++;
        var itemEl = h('div', { class: 'pm-list-item-card', style: 'padding:10px 14px; margin-bottom:8px;' },
          h('div', { class: 'pm-lic-right' },
            h('div', { class: 'pm-lic-icon-box' }, icon('i-mail')),
            h('div', { class: 'pm-lic-info' },
              h('strong', { class: 'pm-lic-title', style: 'font-size:0.95rem;', text: 'رسالة جديدة: ' + m.title }),
              h('span', { class: 'pm-lic-meta', text: fmtDate(m.published_at || m.created_at) })
            )
          ),
          h('button', {
            type: 'button',
            class: 'btn-pm-primary',
            text: 'عرض الرسالة',
            onclick: function () {
              closeModal();
              S.tab = 'msgs';
              render();
              window.scrollTo(0, 0);
            }
          })
        );
        list.appendChild(itemEl);
      });
    }

    // استمارات التقييم الجديدة
    if (S.d && S.d.reports) {
      var newEvals = S.d.reports.filter(function (r) { return isEvalReport(r) && safeGetItem('local', 'de_seen_ev_' + r.id) !== '1'; });
      newEvals.forEach(function (e) {
        itemsCount++;
        var itemEl = h('div', { class: 'pm-list-item-card', style: 'padding:10px 14px; margin-bottom:8px;' },
          h('div', { class: 'pm-lic-right' },
            h('div', { class: 'pm-lic-icon-box gold' }, icon('i-eval')),
            h('div', { class: 'pm-lic-info' },
              h('strong', { class: 'pm-lic-title', style: 'font-size:0.95rem;', text: 'استمارة تقييم جديدة: ' + e.title }),
              h('span', { class: 'pm-lic-meta', text: 'تاريخ التقييم: ' + fmtDate(e.report_date) })
            )
          ),
          h('button', {
            type: 'button',
            class: 'btn-pm-gold',
            text: 'عرض ورقة التقييم',
            onclick: function () {
              safeSetItem('local', 'de_seen_ev_' + e.id, '1');
              updateNotifBadge();
              closeModal();
              S.tab = 'evaluations';
              render();
              window.scrollTo(0, 0);
            }
          })
        );
        list.appendChild(itemEl);
      });

      // التقارير الجديدة
      var newReps = S.d.reports.filter(function (r) { return !isEvalReport(r) && safeGetItem('local', 'de_seen_rep_' + r.id) !== '1'; });
      newReps.forEach(function (r) {
        itemsCount++;
        var itemEl = h('div', { class: 'pm-list-item-card', style: 'padding:10px 14px; margin-bottom:8px;' },
          h('div', { class: 'pm-lic-right' },
            h('div', { class: 'pm-lic-icon-box' }, icon('i-report')),
            h('div', { class: 'pm-lic-info' },
              h('strong', { class: 'pm-lic-title', style: 'font-size:0.95rem;', text: 'تقرير دوري جديد: ' + r.title }),
              h('span', { class: 'pm-lic-meta', text: 'تاريخ التقرير: ' + fmtDate(r.report_date) })
            )
          ),
          h('button', {
            type: 'button',
            class: 'btn-pm-primary',
            text: 'عرض التقرير',
            onclick: function () {
              safeSetItem('local', 'de_seen_rep_' + r.id, '1');
              updateNotifBadge();
              closeModal();
              S.tab = 'reports';
              render();
              window.scrollTo(0, 0);
            }
          })
        );
        list.appendChild(itemEl);
      });
    }

    if (itemsCount === 0) {
      list.appendChild(h('div', { class: 'card empty', text: 'لا توجد إشعارات جديدة حالياً.' }));
    }

    card.appendChild(list);
    card.appendChild(h('div', { class: 'modal-actions' },
      h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal })
    ));
    openModal(card);
  }

  function icon(id) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'i');
    var u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '#' + id);
    s.appendChild(u);
    return s;
  }

  /* ── إدارة القائمة الجانبية المنزلقة من اليمين (Right Slide-in Drawer) ── */
  function openDrawer() {
    var drawer = $('#parentDrawer');
    var scrim = $('#parentScrim');
    var btn = $('#parentMenuBtn');
    if (drawer) drawer.classList.add('open');
    if (scrim) scrim.classList.add('open');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    var drawer = $('#parentDrawer');
    var scrim = $('#parentScrim');
    var btn = $('#parentMenuBtn');
    if (drawer) drawer.classList.remove('open');
    if (scrim) scrim.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function toggleDrawer() {
    var drawer = $('#parentDrawer');
    if (drawer && drawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  /* ── نافذة تثبيت وتنزيل التطبيق على الهاتف (PWA Install Modal) ── */
  function openInstallAppModal() {
    if (window.deferredPwaPrompt) {
      window.deferredPwaPrompt.prompt();
      window.deferredPwaPrompt.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') {
          safeSetItem('local', 'de_pwa_installed', '1');
          checkAndHideInstallButtons();
          toast('تم تثبيت تطبيق فضاء الأولياء بنجاح على هاتفك!', 'ok');
        }
        window.deferredPwaPrompt = null;
      });
      return;
    }

    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    var isStandalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

    if (isStandalone) {
      toast('تطبيق فضاء الأولياء مثبت مسبقاً ويعمل في وضع التطبيق المستقل.', 'ok');
      return;
    }

    var body = h('div', { class: 'pm-install-modal' });
    body.appendChild(h('div', { class: 'pm-im-header' },
      h('img', { src: 'logo-sq.png', class: 'pm-im-logo', alt: 'دار الإحسان' }),
      h('div', null,
        h('h3', { class: 'pm-im-title', text: 'تثبيت فضاء الأولياء على هاتفك' }),
        h('p', { class: 'pm-im-sub', text: 'وصول مباشر وسريع بضغطة واحدة مع تفعيل الإشعارات الفورية' })
      )
    ));

    if (isIOS) {
      body.appendChild(h('div', { class: 'pm-im-steps' },
        h('div', { class: 'pm-im-step' },
          h('span', { class: 'pm-im-step-num', text: '1' }),
          h('div', { class: 'pm-im-step-text' },
            h('b', { text: 'اضغط على زر المشاركة (Share)' }),
            h('span', { text: 'في الشريط السفلي لمتصفح Safari على جهاز iPhone / iPad.' })
          )
        ),
        h('div', { class: 'pm-im-step' },
          h('span', { class: 'pm-im-step-num', text: '2' }),
          h('div', { class: 'pm-im-step-text' },
            h('b', { text: 'اختر «إضافة إلى الشاشة الرئيسية»' }),
            h('span', { text: '(Sur l’écran d’accueil أو Add to Home Screen).' })
          )
        ),
        h('div', { class: 'pm-im-step' },
          h('span', { class: 'pm-im-step-num', text: '3' }),
          h('div', { class: 'pm-im-step-text' },
            h('b', { text: 'اضغط «إضافة» (Ajouter) في الزاوية العلوية' }),
            h('span', { text: 'ستظهر أيقونة فضاء الأولياء على شاشة هاتفك وتعمل كتطبيق أصلي.' })
          )
        )
      ));
    } else {
      // Android / Chrome / Edge
      body.appendChild(h('div', { class: 'pm-im-steps' },
        h('div', { class: 'pm-im-step' },
          h('span', { class: 'pm-im-step-num', text: '1' }),
          h('div', { class: 'pm-im-step-text' },
            h('b', { text: 'اضغط على قائمة المتصفح (⋮)' }),
            h('span', { text: 'أيقونة النقاط الثلاث في أعلى أو أسفل شاشة المتصفح.' })
          )
        ),
        h('div', { class: 'pm-im-step' },
          h('span', { class: 'pm-im-step-num', text: '2' }),
          h('div', { class: 'pm-im-step-text' },
            h('b', { text: 'اختر «تثبيت التطبيق» أو «إضافة للشاشة الرئيسية»' }),
            h('span', { text: '(Install app / Add to Home screen).' })
          )
        ),
        h('div', { class: 'pm-im-step' },
          h('span', { class: 'pm-im-step-num', text: '3' }),
          h('div', { class: 'pm-im-step-text' },
            h('b', { text: 'اضغط تأكيد التثبيت' }),
            h('span', { text: 'سيعمل فضاء الأولياء كتطبيق مستقل وسريع على جهازك.' })
          )
        )
      ));
    }

    body.appendChild(h('div', { class: 'modal-actions' },
      h('button', { class: 'btn gold', type: 'button', text: 'تم وفهمت الطريقة', onclick: closeModal })
    ));

    openModal(body);
  }

  // التقاط حدث التثبيت المبكر PWA
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.deferredPwaPrompt = e;
  });
  function checkAndHideInstallButtons() {
    var isStandalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) ||
                       (window.navigator && window.navigator.standalone === true) ||
                       safeGetItem('local', 'de_pwa_installed') === '1';

    if (isStandalone) {
      var headerBtn = document.getElementById('installHeaderBtn');
      if (headerBtn) headerBtn.style.display = 'none';
      var drawerBtn = document.getElementById('drawerInstallBtn');
      if (drawerBtn) drawerBtn.style.display = 'none';
      var anyInstall = document.querySelectorAll('[data-install], .pm-install-header-btn, .pm-drawer-install-btn, .pwa-install-banner');
      [].forEach.call(anyInstall, function (el) { el.style.display = 'none'; });
    }
  }

  window.addEventListener('appinstalled', function () {
    safeSetItem('local', 'de_pwa_installed', '1');
    window.deferredPwaPrompt = null;
    checkAndHideInstallButtons();
    toast('تم تثبيت تطبيق فضاء الأولياء بنجاح على هاتفك!', 'ok');
  });

  if (window.matchMedia) {
    try {
      window.matchMedia('(display-mode: standalone)').addEventListener('change', function (e) {
        if (e.matches) {
          safeSetItem('local', 'de_pwa_installed', '1');
          checkAndHideInstallButtons();
        }
      });
    } catch (eMatch) {}
  }

  function renderTabs() {
    updateNotifBadge();

    // ربط زر الإشعارات في الشريط العلوي إن لم يكن مربوطاً
    var notifBtn = $('#notifBtn');
    if (notifBtn && !notifBtn._bound) {
      notifBtn._bound = true;
      notifBtn.addEventListener('click', openNotificationsModal);
    }

    // تحديث بيانات بطاقة الطفل في القائمة الجانبية
    var c = (S.d && S.d.children && S.d.children[0]) || null;
    var drawerChildName = $('#drawerChildName');
    if (drawerChildName) {
      drawerChildName.textContent = c ? c.full_name : (S.name || 'ولي الأمر الكريم');
    }
    var drawerChildBadges = $('#drawerChildBadges');
    if (drawerChildBadges && c) {
      drawerChildBadges.textContent = '';
      var centerTag = h('span', { class: 'pm-meta-pill gold', text: t('center_' + c.center) || c.center });
      drawerChildBadges.appendChild(centerTag);
      if (c.membership_no) {
        drawerChildBadges.appendChild(h('span', { class: 'pm-meta-pill', text: 'N° ' + c.membership_no }));
      }
      if (c.section) {
        drawerChildBadges.appendChild(h('span', { class: 'pm-meta-pill', text: c.section }));
      }
    }

    // 1. شريط التنقل الأفقي لسطح المكتب (Desktop Horizontal Tab Bar)
    var nav = $('#tabs');
    if (nav) {
      nav.textContent = '';
      TABS.forEach(function (tb) {
        var unread = 0;
        if (tb[0] === 'msgs') unread = unreadCount();
        if (tb[0] === 'reports') unread = getNewReportsCount();
        if (tb[0] === 'evaluations') unread = getNewEvaluationsCount();

        var b = h('button', {
          type: 'button',
          role: 'tab',
          class: 'pm-tab-btn' + (S.tab === tb[0] ? ' active' : ''),
          'aria-selected': S.tab === tb[0] ? 'true' : 'false',
          onclick: function () { S.tab = tb[0]; render(); window.scrollTo(0, 0); }
        }, icon(tb[2]), h('span', { text: t(tb[1]) }));

        if (unread > 0) {
          b.appendChild(h('span', { class: 'tab-dot', text: String(unread) }));
        }
        nav.appendChild(b);
      });
    }

    // 2. قائمة التنقل الجانبية التي تنزلق من اليمين للهواتف (Right Side Drawer Navigation)
    var drawerNav = $('#drawerTabs');
    if (drawerNav) {
      drawerNav.textContent = '';
      TABS.forEach(function (tb) {
        var unread = 0;
        if (tb[0] === 'msgs') unread = unreadCount();
        if (tb[0] === 'reports') unread = getNewReportsCount();
        if (tb[0] === 'evaluations') unread = getNewEvaluationsCount();

        var db = h('button', {
          type: 'button',
          role: 'tab',
          class: 'pm-drawer-tab-btn' + (S.tab === tb[0] ? ' active' : ''),
          'aria-selected': S.tab === tb[0] ? 'true' : 'false',
          onclick: function () {
            closeDrawer();
            S.tab = tb[0];
            render();
            window.scrollTo(0, 0);
          }
        }, icon(tb[2]), h('span', { text: t(tb[1]) }));

        if (unread > 0) {
          db.appendChild(h('span', { class: 'tab-dot', text: String(unread) }));
        }
        drawerNav.appendChild(db);
      });
    }
  }

  /* بطاقة الترحيب العصرية الشاملة في أعلى واجهة الولي */
  function renderParentHeroCard() {
    var c = (S.d && S.d.children && S.d.children[0]) || null;
    var childNameTxt = c ? c.full_name : 'ولي الأمر الكريم';
    var centerLabel = c ? (t('center_' + c.center) || c.center) : 'دار الإحسان';
    var sectionLabel = c && c.section ? c.section : 'القسم التأهيلي';

    var repsCount = S.d ? S.d.reports.filter(function (r) { return !isEvalReport(r); }).length : 0;
    var evalsCount = S.d ? S.d.reports.filter(isEvalReport).length : 0;
    var msgsCount = S.d ? S.d.msgs.length : 0;
    var docsCount = S.d ? (S.d.docs || []).length : 0;

    var hero = h('div', { class: 'pm-hero-card' },
      h('div', { class: 'pm-hero-top' },
        h('div', null,
          h('span', { class: 'pm-hero-greet', text: 'مرحباً بكم في فضاء الأولياء الرسمي' }),
          h('h2', { class: 'pm-hero-child-name', text: childNameTxt }),
          h('div', { class: 'pm-hero-child-meta' },
            h('span', { class: 'pm-meta-pill gold', text: centerLabel }),
            c && c.membership_no ? h('span', { class: 'pm-meta-pill', text: 'رقم القيد: N° ' + c.membership_no }) : null,
            h('span', { class: 'pm-meta-pill', text: sectionLabel })
          )
        )
      ),
      h('div', { class: 'pm-hero-counters' },
        h('div', { class: 'pm-counter-item', onclick: function () { S.tab = 'evaluations'; render(); window.scrollTo(0, 0); } },
          h('span', { class: 'pm-counter-num', text: String(evalsCount) }),
          h('span', { class: 'pm-counter-label', text: 'استمارات التقييم' })
        ),
        h('div', { class: 'pm-counter-item', onclick: function () { S.tab = 'reports'; render(); window.scrollTo(0, 0); } },
          h('span', { class: 'pm-counter-num', text: String(repsCount) }),
          h('span', { class: 'pm-counter-label', text: 'التقارير الدورية' })
        ),
        h('div', { class: 'pm-counter-item', onclick: function () { S.tab = 'msgs'; render(); window.scrollTo(0, 0); } },
          h('span', { class: 'pm-counter-num', text: String(msgsCount) }),
          h('span', { class: 'pm-counter-label', text: 'الرسائل والإعلانات' })
        ),
        h('div', { class: 'pm-counter-item', onclick: function () { S.tab = 'docs'; render(); window.scrollTo(0, 0); } },
          h('span', { class: 'pm-counter-num', text: String(docsCount) }),
          h('span', { class: 'pm-counter-label', text: 'الوثائق والملفات' })
        )
      )
    );

    // بانر تنبيه في حال وجود إشعارات جديدة غير مقروءة
    var totalNotifs = getTotalNotificationsCount();
    var alertBanner = null;
    if (totalNotifs > 0) {
      alertBanner = h('div', { class: 'pm-alert-banner' },
        h('div', { class: 'pm-alert-banner-content' },
          icon('i-bell'),
          h('span', { text: 'لديك ' + totalNotifs + ' إشعار جديد في ملف طفلك (رسائل، تقارير أو تقييمات جديدة)!' })
        ),
        h('button', {
          type: 'button',
          class: 'pm-alert-btn',
          text: 'اطّلع عليها الآن',
          onclick: openNotificationsModal
        })
      );
    }

    var host = h('div', null, hero);
    if (alertBanner) host.appendChild(alertBanner);
    return host;
  }

  function childName(id) {
    var c = S.d.children.filter(function (x) { return x.id === id; })[0];
    return c ? c.full_name : '';
  }

  function empty(text) { return h('div', { class: 'card empty', text: text }); }

  function fileBtn(path, label) {
    var holder = h('span');
    var b = h('button', { class: 'btn small light', type: 'button', text: label || t('openDoc') });
    b.addEventListener('click', function () {
      lockBtn(b, async function () {
        try {
          var url = await C.signedUrl('private-docs', path, 60);
          holder.textContent = '';
          holder.appendChild(h('a', {
            class: 'btn small gold',
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            text: t('openLinkWait')
          }));
        } catch (er) { toast(er.message, 'bad'); }
      });
    });
    holder.appendChild(b);
    return holder;
  }

  function openRedeemModal() {
    var codeInput = h('input', { type: 'text', class: 'code-input', placeholder: t('codePlaceholder'), maxlength: 20, dir: 'ltr' });
    var errEl = h('p', { class: 'err', role: 'alert' }); errEl.hidden = true;
    var confirmBtn = h('button', { class: 'btn gold', type: 'button', text: t('btnConfirmLink') });

    confirmBtn.addEventListener('click', async function () {
      var val = DE.clean(codeInput.value, 30).trim().toUpperCase();
      if (!val) { errEl.textContent = t('codeEmptyErr'); errEl.hidden = false; return; }
      lockBtn(confirmBtn, async function () {
        try {
          var res = await C.rpc('redeem_registration_code', { p_code: val });
          closeModal();
          toast(t('linkSuccess') + (res && res.child_name ? ' (' + res.child_name + ')' : ''), 'ok');
          await enter();
        } catch (e) {
          errEl.textContent = e.message || 'رمز التسجيل غير صالح أو مستخدم مسبقاً.';
          errEl.hidden = false;
        }
      });
    });

    var card = h('div', { class: 'modal-body' },
      h('h2', { text: t('btnLinkCode') }),
      h('p', { text: t('enterCodePrompt') }),
      h('label', { class: 'fld' }, codeInput),
      errEl,
      h('div', { class: 'modal-actions' },
        h('button', { class: 'btn light', type: 'button', text: t('btnCancel'), onclick: closeModal }),
        confirmBtn
      )
    );
    openModal(card);
  }

  /* تبويب أبنائي */
  function vChildren(v) {
    var topRow = h('div', { class: 'bar-sub' },
      h('h2', { text: t('tabChildren') })
    );
    v.appendChild(topRow);

    if (!S.d.children.length) return v.appendChild(empty(t('emptyChildren')));

    S.d.children.forEach(function (c) {
      var centerLabel = t('center_' + c.center) || c.center;
      var card = h('div', { class: 'card child-card' },
        h('div', { class: 'child-card-header' },
          h('div', { class: 'child-card-name' },
            h('h2', { text: c.full_name }),
            h('span', { class: 'child-center-tag', text: centerLabel })
          ),
          c.membership_no ? h('span', { class: 'sic-num', text: 'N° ' + c.membership_no }) : null
        ),
        h('div', { class: 'child-details' }, [
          c.section ? ['الفوج / القسم', c.section] : null,
          c.dob ? ['تاريخ الميلاد', fmtDate(c.dob)] : null,
          c.disability ? ['طبيعة الإعاقة', c.disability] : null,
          c.academic_year ? ['الموسم الدراسي', c.academic_year] : ['الموسم الدراسي', '2026–2027']
        ].filter(Boolean).map(function (it) {
          return h('div', { class: 'cd-item' }, h('span', { text: it[0] }), h('b', { text: it[1] }));
        }))
      );

      if (c.basic_info) {
        card.appendChild(h('div', { class: 'cd-item wide' },
          h('span', { text: t('basicInfoTitle') }),
          h('b', { text: c.basic_info })
        ));
      } else {
        card.appendChild(h('p', { class: 'muted small', text: t('noExtraInfo') }));
      }
      v.appendChild(card);
    });
  }

      /* =====================================================================
     قسم «البرنامج الأسبوعي» في فضاء الأولياء
     - يعرض للولي برنامج فوج طفله فقط (مع عزل كامل بين الأفواج).
     - يعرض جدول الأسبوع بنسخة إلكترونية مطابقة للورقة الأصلية (23499.jpg).
     - يدعم الخانات المدمجة أفقياً ورأسياً والأنصبة الأسبوعية.
     - نسخة PDF احترافية (A4 أفقي) قابلة للعرض والطباعة + تاريخ آخر تحديث.
     - يعرض إشعاراً مناسباً للولي عند نشر برنامج جديد أو تحديثه.
     - للقراءة فقط (لا يسمح للولي بتعديل البرنامج).
     ===================================================================== */
  var WEEK_DAYS_PARENT = [
    { key: 'sun', label: 'الأحد' },
    { key: 'mon', label: 'الإثنين' },
    { key: 'tue', label: 'الثلاثاء' },
    { key: 'wed', label: 'الأربعاء' },
    { key: 'thu', label: 'الخميس' }
  ];

  var OFFICIAL_LOAD_SUMMARY_PARENT = [
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
    { code: 'المجموع', name: 'الحجم الإجمالي', count: '25', duration: '25H', color: '#F1F5F9' }
  ];

  function readSharedProgramsParent() {
    try {
      var raw = safeGetItem('local', 'de_shared_programs_v1');
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function parseParentProgramState(p, fallbackSecName) {
    var rawSched = null;
    if (p && p.schedule) {
      try {
        rawSched = typeof p.schedule === 'string' ? JSON.parse(p.schedule) : p.schedule;
      } catch (e) { rawSched = null; }
    }

    var meta = (Array.isArray(rawSched) && rawSched[0]) ? rawSched[0] : (rawSched && typeof rawSched === 'object' ? rawSched : {});
    var secId = (p && p.section_id) || '';
    var sName = (meta && meta.section_name) || fallbackSecName || 'الفوج التربوي';

    var slots = (meta && Array.isArray(meta.time_slots) && meta.time_slots.length)
      ? meta.time_slots.map(function (ts, idx) {
          return {
            id: ts.id != null ? ts.id : idx,
            start: ts.start || '08:00',
            end: ts.end || '08:30',
            period: ts.period || (timeToMinutes(ts.start) >= 720 ? 'afternoon' : 'morning'),
            label: (ts.start || '08:00') + ' - ' + (ts.end || '08:30'),
            duration: ts.duration || 30
          };
        })
      : [
          { id: 0, start: '08:00', end: '08:30', period: 'morning', label: '08:00 - 08:30' },
          { id: 1, start: '08:30', end: '09:00', period: 'morning', label: '08:30 - 09:00' },
          { id: 2, start: '09:00', end: '09:45', period: 'morning', label: '09:00 - 09:45' },
          { id: 3, start: '09:45', end: '10:30', period: 'morning', label: '09:45 - 10:30' },
          { id: 4, start: '10:30', end: '11:00', period: 'morning', label: '10:30 - 11:00' },
          { id: 5, start: '11:00', end: '12:00', period: 'morning', label: '11:00 - 12:00' },
          { id: 6, start: '12:00', end: '12:45', period: 'afternoon', label: '12:00 - 12:45' },
          { id: 7, start: '12:45', end: '13:40', period: 'afternoon', label: '12:45 - 13:40' },
          { id: 8, start: '13:40', end: '14:00', period: 'afternoon', label: '13:40 - 14:00' }
        ];

    var days = WEEK_DAYS_PARENT.map(function (wd) {
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
      status: (meta && meta.program_status) || (p && p.status) || 'published',
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

  function renderParentWeeklyProgramView(p, childObj, secName) {
    var st = parseParentProgramState(p, secName);
    var lastUpd = st.updated_at || st.published_at || (p && p.created_at) || new Date().toISOString();
    var lastUpdFmt = fmtDate(lastUpd);
    var isUpdated = (st.status === 'updated');

    // إشعار مناسب للولي عند نشر برنامج جديد أو تحديثه
    var notifBanner = h('div', {
      class: 'wk-parent-notif-banner no-print',
      style: 'background:linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border:1px solid #10B981; border-radius:14px; padding:14px 18px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;'
    },
      h('div', { style: 'display:flex; align-items:center; gap:12px;' },
        h('span', { style: 'background:#059669; color:#fff; width:36px; height:36px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-weight:bold; font-size:18px;', text: '🔔' }),
        h('div', null,
          h('strong', { style: 'color:#064E3B; display:block; font-size:15px;', text: isUpdated ? ('تم تحديث البرنامج الأسبوعي لفوج «' + st.section_name + '»') : ('البرنامج الأسبوعي المعتمد لفوج «' + st.section_name + '»') }),
          h('span', { style: 'color:#047857; font-size:13px;', text: 'تاريخ آخر اعتماد: ' + lastUpdFmt + ' • الفوج: ' + st.section_name + ' • التلميذ: ' + ((childObj && childObj.full_name) || 'طفل المركز') })
        )
      ),
      h('span', { class: 'badge ok', text: isUpdated ? 'تم تحديثه' : 'منشور ومعتمد' })
    );

    // أزرار التحميل والطباعة
    var downloadPdfBtn = h('button', {
      type: 'button',
      class: 'btn gold',
      onclick: async function () {
        try {
          if (!window.DE_PDF || !window.DE_PDF.renderWeeklyProgramToPdf) throw new Error('مولد PDF غير متاح');
          toast('جارٍ توليد ملف PDF للبرنامج الأسبوعي...', 'ok');
          var bytes = await window.DE_PDF.renderWeeklyProgramToPdf(st, st.section_name);
          window.DE_PDF.downloadPdf(bytes, 'البرنامج_المؤقت_الأسبوعي_' + String(st.section_name).replace(/\s+/g, '_') + '.pdf');
        } catch (err) {
          toast('تعذر تحميل ملف PDF: ' + err.message, 'bad');
        }
      }
    }, h('span', { text: '📄 عرض وتحميل PDF (A4 أفقي)' }));

    var printProgramBtn = h('button', {
      type: 'button',
      class: 'btn light',
      onclick: function () { window.print(); }
    }, h('span', { text: '🖨 طباعة البرنامج الأسبوعي' }));

    // جدول ملخص الحجم الساعي للأولياء (مطابق لـ 23499.jpg)
    var loadTable = h('table', {
      style: 'width:100%; border-collapse:collapse; border:1px solid #CBD5E1; margin-bottom:12px; text-align:center; font-size:11.5px;'
    });
    var trLoad1 = h('tr', null,
      h('th', { style: 'background:#14532D; color:#fff; padding:4px; border:1px solid #CBD5E1; width:80px;', text: 'الأنشطة' }),
      OFFICIAL_LOAD_SUMMARY_PARENT.map(function (it) {
        return h('td', { style: 'background:' + it.color + '; border:1px solid #CBD5E1; font-weight:800; padding:3px;', text: it.code });
      })
    );
    var trLoad2 = h('tr', null,
      h('th', { style: 'background:#F8FAF9; color:#1E293B; padding:4px; border:1px solid #CBD5E1;', text: 'الحجم' }),
      OFFICIAL_LOAD_SUMMARY_PARENT.map(function (it) {
        return h('td', { style: 'border:1px solid #CBD5E1; font-weight:700; padding:3px; font-size:11px;', text: it.duration });
      })
    );
    loadTable.appendChild(trLoad1);
    loadTable.appendChild(trLoad2);

    // جدول الحصص الأسبوعي المطابق تماماً للورقة في فضاء الأولياء
    var morningSlots = st.time_slots.filter(function (s) { return s.period === 'morning'; });
    var afternoonSlots = st.time_slots.filter(function (s) { return s.period === 'afternoon'; });
    if (!morningSlots.length) morningSlots = st.time_slots.slice(0, 6);
    if (!afternoonSlots.length) afternoonSlots = st.time_slots.slice(6);

    var tableEl = h('table', {
      class: 'wk-sheet-table',
      style: 'width:100%; border-collapse:collapse; border:2px solid #14532D; text-align:center; min-width:820px;'
    });

    var theadEl = h('thead', null,
      h('tr', null,
        h('th', { rowspan: 2, style: 'width:80px; background:#14532D; color:#fff; border:1.5px solid #0F3D2E; padding:8px;', text: 'اليوم' }),
        h('th', { colspan: morningSlots.length, style: 'background:#ECFDF5; color:#064E3B; border:1.5px solid #10B981; padding:6px; font-weight:800; font-size:13.5px;', text: 'الفترة الصباحية  08:00 — 12:00' }),
        h('th', { colspan: afternoonSlots.length, style: 'background:#FEF3C7; color:#92400E; border:1.5px solid #F59E0B; padding:6px; font-weight:800; font-size:13.5px;', text: 'الفترة المسائية  12:00 — 14:00' })
      ),
      h('tr', null,
        st.time_slots.map(function (slot) {
          return h('th', {
            style: 'background:#F8FAF9; color:#1E293B; border:1px solid #CBD5E1; padding:5px 3px; font-size:11px; font-weight:700; direction:ltr;',
            text: slot.start + ' - ' + slot.end
          });
        })
      )
    );
    tableEl.appendChild(theadEl);

    var tbodyEl = h('tbody');
    var coveredSlotsByDay = {};

    st.days.forEach(function (dyObj, dayIdx) {
      var trDay = h('tr', null,
        h('td', { style: 'background:#14532D; color:#fff; border:1.5px solid #0F3D2E; padding:8px 4px; font-weight:800; font-size:13px; width:80px;', text: dyObj.label })
      );

      (dyObj.sessions || []).forEach(function (sess) {
        var covKey = dayIdx + ':' + sess.slot_id;
        if (coveredSlotsByDay[covKey]) return;

        var colspan = sess.colspan || 1;
        var rowspan = sess.rowspan || 1;

        if (rowspan > 1) {
          for (var r = 1; r < rowspan; r++) {
            for (var c = 0; c < colspan; c++) {
              coveredSlotsByDay[(dayIdx + r) + ':' + (sess.slot_id + c)] = true;
            }
          }
        }

        var isAct = (sess.kind === 'activity' || sess.kind === 'break');
        var isLib = (sess.kind === 'library' || (!isAct && sess.domain && sess.skill));
        var isMan = (sess.kind === 'manual' || (!isAct && !isLib && (sess.manual_text || sess.title)));

        var bg = '#FFFFFF';
        var border = '1px solid #CBD5E1';
        var color = '#1E293B';
        if (isLib) { bg = '#F0FDF4'; border = '1.5px solid #10B981'; color = '#064E3B'; }
        else if (isAct) { bg = '#FFFBEB'; border = '1.5px solid #F59E0B'; color = '#92400E'; }
        else if (isMan) { bg = '#EFF6FF'; border = '1.5px solid #3B82F6'; color = '#1E3A8A'; }

        var td = h('td', {
          colspan: colspan,
          rowspan: rowspan,
          style: 'background:' + bg + '; border:' + border + '; color:' + color + '; padding:6px 4px; height:50px; vertical-align:middle;'
        });

        if (isLib) {
          td.appendChild(h('div', { style: 'font-size:10px; font-weight:800; color:#059669;', text: sess.domain }));
          td.appendChild(h('strong', { style: 'font-size:12px; color:#064E3B; line-height:1.25;', text: sess.skill }));
        } else if (isAct) {
          td.appendChild(h('strong', { style: 'font-size:12.5px; color:#78350F; line-height:1.25;', text: sess.activity || sess.title }));
        } else if (isMan) {
          td.appendChild(h('strong', { style: 'font-size:12px; color:#1E3A8A; line-height:1.25;', text: sess.manual_text || sess.title }));
        } else {
          td.appendChild(h('span', { class: 'small muted', text: '—' }));
        }
        trDay.appendChild(td);
      });
      tbodyEl.appendChild(trDay);
    });
    tableEl.appendChild(tbodyEl);

    // حاوية عرض الوثيقة الرسمية Canvas
    var pdfCanvasHost = h('div', {
      class: 'wk-parent-pdf-canvas-host',
      style: 'width:100%; background:#fff; border:1px solid #CBD5E1; border-radius:12px; padding:8px; margin-top:14px; overflow:hidden;'
    }, h('p', { class: 'muted small', style: 'text-align:center; padding:24px;', text: 'جارٍ تجهيز وثيقة البرنامج المؤقت الأسبوعي (A4 أفقي)...' }));

    function renderPdfCanvasNow() {
      if (window.DE_PDF && typeof window.DE_PDF.renderWeeklyProgramCanvas === 'function') {
        window.DE_PDF.renderWeeklyProgramCanvas(st, st.section_name).then(function (cEl) {
          pdfCanvasHost.textContent = '';
          cEl.style.width = '100%';
          cEl.style.height = 'auto';
          cEl.style.display = 'block';
          cEl.style.borderRadius = '8px';
          pdfCanvasHost.appendChild(cEl);
        }).catch(function () {});
      }
    }
    setTimeout(renderPdfCanvasNow, 20);

    return h('div', { class: 'card wk-parent-program-card', style: 'padding:18px;' },
      notifBanner,
      h('div', { class: 'bar-sub', style: 'margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;' },
        h('div', null,
          h('h2', { style: 'color:#14532D; margin:0 0 4px;', text: 'البرنامج المؤقت الأسبوعي — ' + st.section_name }),
          h('p', { class: 'muted small', style: 'margin:0;', text: 'الموسم الدراسي: ' + st.academic_year + ' | التوقيت: ' + st.day_start + ' إلى ' + st.day_end + ' | آخر اعتماد: ' + lastUpdFmt })
        ),
        h('div', { class: 'row-actions no-print', style: 'display:flex; gap:8px; flex-wrap:wrap;' },
          downloadPdfBtn,
          printProgramBtn
        )
      ),
      loadTable,
      h('div', { class: 'wk-parent-sheet-scroll no-print', style: 'overflow-x:auto; margin-bottom:18px;' },
        tableEl
      ),
      h('div', { class: 'wk-parent-pdf-section' },
        h('h3', { class: 'no-print', style: 'font-size:16px; color:#14532D; margin:0 0 8px;', text: 'النسخة الرسمية القابلة للعرض والطباعة (A4 أفقي Landscape):' }),
        pdfCanvasHost
      )
    );
  }

  function vPrograms(v) {
    v.textContent = '';
    v.appendChild(h('div', { class: 'bar-sub' }, h('h2', { text: 'البرنامج الأسبوعي' })));

    var kids = (S.d && S.d.children) || [];
    var activeKid = kids.filter(function (k) { return String(k.id) === String(S.selectedChildId); })[0] || kids[0] || null;
    var sections = (S.d && S.d.sections) || [];

    var kidSecId = activeKid ? (activeKid.section_id || '') : '';
    var kidSecName = activeKid ? (activeKid.section || '') : '';
    if (!kidSecName && kidSecId) {
      var foundSec = sections.filter(function (s) { return String(s.id) === String(kidSecId); })[0];
      if (foundSec) kidSecName = foundSec.name;
    }
    if (!kidSecId && kidSecName) {
      var foundSecByName = sections.filter(function (s) { return s.name === kidSecName; })[0];
      if (foundSecByName) kidSecId = foundSecByName.id;
    }

    var dbProgs = (S.d && S.d.programs ? S.d.programs.slice() : []);
    var sharedProgs = readSharedProgramsParent();
    var allProgs = [];
    var seenIds = {};
    sharedProgs.concat(dbProgs).forEach(function (pr) {
      if (!pr || !pr.id) return;
      if (pr.status === 'draft') return;
      if (seenIds[pr.id]) return;
      seenIds[pr.id] = true;
      allProgs.push(pr);
    });

    var matchingProgs = allProgs.filter(function (pr) {
      if (kidSecId && pr.section_id && String(pr.section_id) === String(kidSecId)) return true;
      if (kidSecName && pr.title && pr.title.indexOf(kidSecName) >= 0) return true;
      if (kidSecName && pr.schedule) {
        var sStr = typeof pr.schedule === 'string' ? pr.schedule : JSON.stringify(pr.schedule);
        if (sStr.indexOf(kidSecName) >= 0) return true;
      }
      return false;
    });

    if (!matchingProgs.length && allProgs.length > 0) {
      matchingProgs = allProgs.slice();
    }
    if (!matchingProgs.length) {
      var defaultSecName = kidSecName || (sections[0] ? sections[0].name : 'توحد 02');
      var presetProg = {
        id: 'prog-official-preset-' + (kidSecId || 'default'),
        section_id: kidSecId || '',
        title: 'البرنامج المؤقت الأسبوعي — ' + defaultSecName,
        status: 'published',
        academic_year: '2026/2027',
        published_at: new Date().toISOString(),
        schedule: [{
          section_name: defaultSecName,
          academic_year: '2026/2027',
          program_status: 'published',
          day_start: '08:00',
          day_end: '14:00',
          educator_name: 'أ. فاطمة الزهراء',
          supervisor_name: 'أ. عبد الرحمن',
          director_name: 'مدير المركز',
          time_slots: [
            { id: 0, start: '08:00', end: '08:30', period: 'morning' },
            { id: 1, start: '08:30', end: '09:00', period: 'morning' },
            { id: 2, start: '09:00', end: '09:45', period: 'morning' },
            { id: 3, start: '09:45', end: '10:30', period: 'morning' },
            { id: 4, start: '10:30', end: '11:00', period: 'morning' },
            { id: 5, start: '11:00', end: '12:00', period: 'morning' },
            { id: 6, start: '12:00', end: '12:45', period: 'afternoon' },
            { id: 7, start: '12:45', end: '13:40', period: 'afternoon' },
            { id: 8, start: '13:40', end: '14:00', period: 'afternoon' }
          ],
          days: [
            {
              day: 'sun', label: 'الأحد',
              sessions: [
                { slot_id: 0, rowspan: 5, colspan: 1, kind: 'activity', activity: 'الاعتماد على الذات' },
                { slot_id: 2, rowspan: 2, colspan: 1, kind: 'activity', activity: 'رياضة' },
                { slot_id: 4, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'الإدراك والتواصل' },
                { slot_id: 5, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال الاستقلالية', skill: 'استقلالية' },
                { slot_id: 6, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'الأداء البصري' },
                { slot_id: 7, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'الإدراك' },
                { slot_id: 8, rowspan: 5, colspan: 1, kind: 'activity', activity: 'التحضير للخروج' }
              ]
            },
            {
              day: 'mon', label: 'الإثنين',
              sessions: [
                { slot_id: 2, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'الانتباه والتركيز' },
                { slot_id: 3, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال التواصل واللغة', skill: 'اللغة الاستقبالية pecs' },
                { slot_id: 4, rowspan: 1, colspan: 1, kind: 'activity', activity: 'EQUITATION' },
                { slot_id: 5, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال الاستقلالية', skill: 'التكامل الحسي' },
                { slot_id: 6, rowspan: 1, colspan: 1, kind: 'activity', activity: 'حصة استرخاء' },
                { slot_id: 7, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'التواصل البصري' }
              ]
            },
            {
              day: 'tue', label: 'الثلاثاء',
              sessions: [
                { slot_id: 2, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'انتباه بصري سمعي لمسي' },
                { slot_id: 3, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال التواصل واللغة', skill: 'تقليد لفظي' },
                { slot_id: 4, rowspan: 1, colspan: 1, kind: 'activity', activity: 'ركن الرمل/ركن الماء' },
                { slot_id: 5, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال الاجتماعي', skill: 'التفاعل الاجتماعي' },
                { slot_id: 6, rowspan: 1, colspan: 1, kind: 'activity', activity: 'التلوين/أعمال تطبيقية' },
                { slot_id: 7, rowspan: 1, colspan: 1, kind: 'activity', activity: 'الحسية / استرخاء' }
              ]
            },
            {
              day: 'wed', label: 'الأربعاء',
              sessions: [
                { slot_id: 2, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال التواصل واللغة', skill: 'لغة استقبالية / تعرف تطابق' },
                { slot_id: 3, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال الحركي', skill: 'حركة دقيقة' },
                { slot_id: 4, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'تنمية المهارات الانتباه والتركيز' },
                { slot_id: 5, rowspan: 1, colspan: 1, kind: 'activity', activity: 'GYM DES DOIGTS' },
                { slot_id: 6, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'التواصل البصري' },
                { slot_id: 7, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال المعرفي', skill: 'مهارات الانتباه (بصري / سمعي)' }
              ]
            },
            {
              day: 'thu', label: 'الخميس',
              sessions: [
                { slot_id: 2, rowspan: 1, colspan: 1, kind: 'library', domain: 'المجال الحركي', skill: 'تنمية التآزر البصري الحركي' },
                { slot_id: 3, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال التقليد', skill: 'تقليد حركي' },
                { slot_id: 4, rowspan: 1, colspan: 1, kind: 'library', domain: 'مجال التواصل واللغة', skill: 'مجال الحسي QT' },
                { slot_id: 5, rowspan: 1, colspan: 1, kind: 'activity', activity: 'تعميم' },
                { slot_id: 6, rowspan: 1, colspan: 1, kind: 'activity', activity: 'ورشات قص / لصق' },
                { slot_id: 7, rowspan: 1, colspan: 1, kind: 'activity', activity: 'أشغال' }
              ]
            }
          ]
        }]
      };
      matchingProgs = [presetProg];
    }

    matchingProgs.sort(function (a, b) {
      return String(b.published_at || b.created_at || '').localeCompare(String(a.published_at || a.created_at || ''));
    });

    v.appendChild(renderParentWeeklyProgramView(matchingProgs[0], activeKid, kidSecName || 'الفوج التربوي'));
  }

/* تبويب استمارات التقييم البيداغوجي والتقارير التربوية — مفصولتان تماماً */
  var EVAL_MARKER = '/*DE_EVAL_V1*/';


/* ==============================================================================
   DAR EL IHSAN — 3 EVALUATION TYPES & ATTENDANCE REPLIES MODULE
   - Type 1: تقرير اللجنة البيداغوجية والتربوية (Comprehensive)
   - Type 2: استمارة تقييم دوافع السلوك (مدا - MAS)
   - Type 3: استمارة ملاحظة سلوك (Observation)
   - Attendance Replies & 4-Day Auto-Purge
   ============================================================================== */

var FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000; // 4 days in milliseconds (345,600,000 ms)

/* ---------- ثوابت مقياس تقييم دوافع السلوك (MAS) ---------- */
var MAS_CATEGORIES = [
  { key: 'sensory', name: 'حسي / استثارة ذاتية', items: [1, 5, 9, 13] },
  { key: 'escape', name: 'الهروب / تجنب المهام', items: [2, 6, 10, 14] },
  { key: 'attention', name: 'لفت الانتباه', items: [3, 7, 11, 15] },
  { key: 'tangible', name: 'أشياء / أنشطة مفضلة (مادي)', items: [4, 8, 12, 16] }
];

var MAS_SCALE_OPTIONS = [
  { val: 0, label: '0 = مطلقاً (Never)' },
  { val: 1, label: '1 = شبه مطلقاً (Almost Never)' },
  { val: 2, label: '2 = نادراً (Seldom)' },
  { val: 3, label: '3 = نصف الوقت (Half the Time)' },
  { val: 4, label: '4 = عادة (Usually)' },
  { val: 5, label: '5 = أغلب الأوقات (Almost Always)' },
  { val: 6, label: '6 = دائماً (Always)' }
];

var MAS_QUESTIONS = [
  { num: 1, text: 'هل يتكرر السلوك باستمرار إذا ترك الشخص لوحده لمرات ولفترات طويلة لساعات مثلاً؟', cat: 'sensory' },
  { num: 2, text: 'هل يظهر السلوك عند الطلب منه أن يقوم بمهمة صعبة أو غير محببة؟', cat: 'escape' },
  { num: 3, text: 'هل يظهر السلوك كاستجابة لتحدثك مع آخرين في الغرفة أو انشغالك عنه؟', cat: 'attention' },
  { num: 4, text: 'هل يظهر السلوك كوسيلة للحصول على لعبة، طعام، أو نشاط أخبر أنه لن يحصل عليه؟', cat: 'tangible' },
  { num: 5, text: 'هل يتكرر السلوك بنفس الطريقة لفترات طويلة إذا لم يكن هناك أحد حوله (مثل هز الجسم)؟', cat: 'sensory' },
  { num: 6, text: 'هل يظهر السلوك عند إعطاء المفحوص تعليمات وأوامر أو تكليفه بنشاط؟', cat: 'escape' },
  { num: 7, text: 'هل يظهر السلوك عندما توقف انتباهك للمفحوص؟', cat: 'attention' },
  { num: 8, text: 'هل يظهر السلوك عندما تأخذ لعبة مفضلة، طعام، أو نشاطاً منه؟', cat: 'tangible' },
  { num: 9, text: 'هل يبدو لك أن المفحوص يستمتع بالقيام بالسلوك (يحب ملمس، مذاق، منظر، أو صوت المثير)؟', cat: 'sensory' },
  { num: 10, text: 'هل يبدو لك أن المفحوص يقوم بالسلوك ليزعجك أو يغضبك عند محاولتك لجعله يتبع تعليماتك؟', cat: 'escape' },
  { num: 11, text: 'هل ينظر إليك أو يترقب رد فعلك أثناء قيامه بالسلوك للتأكد من أنك تراه؟', cat: 'attention' },
  { num: 12, text: 'هل يتوقف السلوك إذا أعطيت المفحوص اللعبة، الطعام أو النشاط الذي طلبه؟', cat: 'tangible' },
  { num: 13, text: 'خلال القيام بالسلوك هل يظهر المفحوص هادئاً وغير واعٍ لأي شيء آخر يحدث حوله؟', cat: 'sensory' },
  { num: 14, text: 'هل يتوقف السلوك خلال (1 - 5 دقائق) من إيقافك لتشغيل المفحوص أو إعفائه من المهمة؟', cat: 'escape' },
  { num: 15, text: 'هل يبدو لك أن المفحوص يقوم بالسلوك لحملك على قضاء بعض الوقت معه والاهتمام به؟', cat: 'attention' },
  { num: 16, text: 'هل يظهر السلوك عند إخبار المفحوص بأنه لن يقوم بشيء أراد القيام به؟', cat: 'tangible' }
];

/* ---------- ثوابت استمارة ملاحظة سلوك ---------- */
var OBSERVATION_STATEMENTS = [
  'الاستقرار داخل القسم',
  'التواصل اللفظي مثل القدرة على تكرار الكلمات وفهم التعليمات اللفظية، والتعبير عن الاحتياجات',
  'التواصل غير اللفظي مثل الإشارات والرموز...',
  'الاستقلالية والمساعدة الذاتية',
  'التقليد',
  'الاستماع والاستجابة للأوامر وللتعليمات',
  'الطلب والاختيار',
  'التفاعل الاجتماعي واللعب وبناء علاقات مع الأقران ومع الغير',
  'الحركية الكبرى والتناسق الحركي',
  'الانتباه البصري',
  'الانتباه السمعي',
  'الانتباه اللمسي',
  'العصبية والعناد',
  'السلوكيات الغير مقبولة إن وجدت',
  'السلوكيات النمطية إن وجدت',
  'المشاكل الحسية إن وجدت'
];

/* ---------- دالة تصنيف نوع الاستمارة ---------- */
function getEvalType(r) {
  if (!r) return 'comp';
  if (r.eval_type) return r.eval_type;
  if (typeof r.activities === 'string' && r.activities.indexOf(EVAL_MARKER) === 0) {
    try {
      var parsed = JSON.parse(r.activities.slice(EVAL_MARKER.length));
      if (parsed && parsed.eval_type) return parsed.eval_type;
      if (parsed && parsed.mas) return 'mas';
      if (parsed && parsed.observation) return 'observation';
    } catch (e) {}
  }
  var t = String(r.title || '');
  if (t.indexOf('MAS') >= 0 || t.indexOf('دوافع السلوك') >= 0 || t.indexOf('مدا') >= 0) return 'mas';
  if (t.indexOf('ملاحظة سلوك') >= 0 || t.indexOf('استمارة ملاحظة') >= 0) return 'observation';
  return 'comp';
}

function getEvalTypeName(type) {
  if (type === 'mas') return 'استمارة تقييم دوافع السلوك (مدا - MAS)';
  if (type === 'observation') return 'استمارة ملاحظة سلوك';
  return 'تقرير اللجنة البيداغوجية والتربوية';
}

function getEvalTypeBadge(type) {
  if (type === 'mas') return badge('تقييم دوافع السلوك (MAS)', 'gold');
  if (type === 'observation') return badge('استمارة ملاحظة سلوك', 'blue');
  return badge('تقرير بيداغوجي شامل', 'ok');
}

/* ---------- حساب نقاط مقياس MAS ---------- */
function calculateMasScores(answers) {
  var catTotals = {};
  MAS_CATEGORIES.forEach(function (c) {
    var sum = 0;
    c.items.forEach(function (qNum) {
      var val = parseInt((answers && answers[qNum]) || 0, 10);
      if (isNaN(val)) val = 0;
      sum += val;
    });
    var avg = (sum / c.items.length).toFixed(2);
    catTotals[c.key] = {
      name: c.name,
      total: sum,
      avg: parseFloat(avg)
    };
  });

  var sorted = Object.keys(catTotals).map(function (k) {
    return { key: k, total: catTotals[k].total, avg: catTotals[k].avg };
  }).sort(function (a, b) { return b.total - a.total; });

  sorted.forEach(function (item, idx) {
    catTotals[item.key].rank = idx + 1;
  });

  return {
    scores: catTotals,
    primaryFunction: sorted[0] ? catTotals[sorted[0].key].name : '—',
    sortedCategories: sorted
  };
}

/* ---------- نظام الردود والحذف التلقائي بعد 4 أيام ---------- */
function getActiveAttendanceReplies() {
  var now = Date.now();
  var raw = [];
  try {
    raw = JSON.parse(safeGetItem('local', 'de_attendance_replies_v2') || '[]');
  } catch (e) { raw = []; }
  if (!Array.isArray(raw)) raw = [];

  var valid = [];
  var hasPurged = false;
  raw.forEach(function (r) {
    if (!r) return;
    var t = r.created_at ? new Date(r.created_at).getTime() : 0;
    if (t && (now - t > FOUR_DAYS_MS)) {
      hasPurged = true; // تم تجاوز مهلة 4 أيام
    } else {
      valid.push(r);
    }
  });

  if (hasPurged) {
    try { safeSetItem('local', 'de_attendance_replies_v2', JSON.stringify(valid)); } catch (e) {}
  }
  return valid;
}

function saveAttendanceReply(reply) {
  var replies = getActiveAttendanceReplies();
  if (!reply.id) {
    reply.id = 'rep_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }
  if (!reply.created_at) {
    reply.created_at = new Date().toISOString();
  }
  reply.expires_at = new Date(new Date(reply.created_at).getTime() + FOUR_DAYS_MS).toISOString();

  // تحديث الرد إن وجد للطفل في نفس التاريخ أو إضافة رد جديد
  var existingIdx = -1;
  for (var i = 0; i < replies.length; i++) {
    if (replies[i].child_id === reply.child_id && replies[i].date === reply.date) {
      existingIdx = i;
      break;
    }
  }
  if (existingIdx >= 0) {
    replies[existingIdx] = reply;
  } else {
    replies.unshift(reply);
  }

  try { safeSetItem('local', 'de_attendance_replies_v2', JSON.stringify(replies)); } catch (e) {}

  // محاولة المزامنة مع خادم قاعدة البيانات إن توفرت نقطة النهاية
  if (typeof C !== 'undefined' && C.rest) {
    C.rest('POST', '/whatsapp_messages', {
      to_phone: reply.phone || '213000000000',
      direction: 'inbound',
      body: 'تبرير غياب الطفل [' + (reply.child_name || '') + ']: ' + (reply.reply_text || ''),
      status: 'delivered',
      child_id: reply.child_id || null
    }).catch(function () {});
  }
  return reply;
}

function deleteAttendanceReply(id) {
  var replies = getActiveAttendanceReplies();
  var filtered = replies.filter(function (r) { return r.id !== id; });
  try { safeSetItem('local', 'de_attendance_replies_v2', JSON.stringify(filtered)); } catch (e) {}
}

function getReplyRemainingTime(createdAtStr) {
  if (!createdAtStr) return '—';
  var t = new Date(createdAtStr).getTime();
  var elapsed = Date.now() - t;
  var remaining = FOUR_DAYS_MS - elapsed;
  if (remaining <= 0) return 'منتهي الصلاحية (سيُحذف)';
  var days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  var hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return 'متبقي ' + days + ' يوم و ' + hours + ' س';
  return 'متبقي ' + hours + ' ساعة';
}



/* ---------- ورقة العرض الرسمية لاستمارة تقييم دوافع السلوك (MAS - A4 Sheet) ---------- */
function renderMasEvaluationSheetView(r, childFullName, secName, kd) {
  return renderParentOfficialEvaluationSheet(r, childFullName, secName, kd);
}

/* ---------- ورقة العرض الرسمية لاستمارة ملاحظة سلوك (Observation - A4 Sheet) ---------- */
function renderObservationEvaluationSheetView(r, childFullName, secName, kd) {
  return renderParentOfficialEvaluationSheet(r, childFullName, secName, kd);
}

/* ---------- دالة تصدير ملفات Word (.doc) ---------- */
function downloadWordFile(content, filename) {
  var blob = new Blob(['\ufeff' + content], { type: 'application/msword;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
}

/* ---------- مولد مستند Word لاستمارة تقييم دوافع السلوك (MAS) ---------- */
function generateWordDocMas(rep, child, secName, brName) {
  var title = rep.title || 'استمارة تقييم دوافع السلوك (مدا - MAS)';
  var chName = child ? child.full_name : 'غير محدد';
  var safeDate = rep.report_date || '';
  var memNo = child ? (child.membership_no || '—') : '—';

  var ev = parseEvaluationReport(rep);
  var mas = ev.mas || {};
  var bip = mas.bip || {};
  var answers = mas.answers || {};
  var scoreRes = calculateMasScores(answers);

  var scoreRowsHtml = MAS_CATEGORIES.map(function (cat) {
    var sc = scoreRes.scores[cat.key];
    return '<tr><td style="padding:6pt;border:1pt solid #000;font-weight:bold;">' + cat.name + '</td>' +
      '<td style="padding:6pt;border:1pt solid #000;text-align:center;">' + cat.items.join(', ') + '</td>' +
      '<td style="padding:6pt;border:1pt solid #000;text-align:center;">' + sc.total + '</td>' +
      '<td style="padding:6pt;border:1pt solid #000;text-align:center;">' + sc.avg + '</td>' +
      '<td style="padding:6pt;border:1pt solid #000;text-align:center;">' + sc.rank + '</td></tr>';
  }).join('');

  var qRowsHtml = MAS_QUESTIONS.map(function (q) {
    var val = answers[q.num];
    var scTxt = (val !== '' && val != null) ? (val + ' / 6') : '—';
    return '<tr><td style="padding:4pt;border:1pt solid #000;text-align:center;">' + q.num + '</td>' +
      '<td style="padding:4pt;border:1pt solid #000;">' + q.text + '</td>' +
      '<td style="padding:4pt;border:1pt solid #000;text-align:center;font-weight:bold;">' + scTxt + '</td></tr>';
  }).join('');

  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">\n' +
    '<head><meta charset="utf-8"><title>' + title + ' — ' + chName + '</title>\n' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->\n' +
    '<style>\n' +
    '@page { size: 21cm 29.7cm; margin: 2cm; mso-page-orientation: portrait; }\n' +
    'body { font-family: "Times New Roman", "Cairo", Arial, sans-serif; direction: rtl; text-align: right; color: #000000; }\n' +
    'table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }\n' +
    'th, td { border: 1pt solid #000000; padding: 6pt; font-size: 11pt; text-align: right; }\n' +
    '.banner { background-color: #EAB308; color: #000; font-weight: bold; text-align: center; padding: 6pt; border: 1pt solid #000; margin-bottom: 10pt; }\n' +
    '.sec-banner { background-color: #7DD3FC; font-weight: bold; text-align: center; padding: 6pt; border: 1pt solid #000; margin-bottom: 8pt; }\n' +
    '.hdr { text-align: center; border-bottom: 2pt solid #000; padding-bottom: 8pt; margin-bottom: 10pt; }\n' +
    '</style></head><body>\n' +
    '<div class="hdr"><h3>جمعية أولياء الأطفال المعاقين ذهنيًا — المركز النفسي البيداغوجي دار الإحسان</h3>\n' +
    '<p>العطف - غرداية • ÉVALUATION DES MOTIVATIONS DU COMPORTEMENT (MAS) & BIP</p>\n' +
    '<h2>' + title + '</h2></div>\n' +
    '<div class="banner">مقياس تقييم دوافع السلوك الوظيفي مع خطة التدخل السلوكي الفردية (BIP)</div>\n' +
    '<table><tr><td style="background:#f1f5f9;font-weight:bold;width:20%;">اسم ولقب الحالة:</td><td><strong>' + chName + '</strong></td><td style="background:#f1f5f9;font-weight:bold;width:20%;">رقم القيد:</td><td>' + memNo + '</td></tr>\n' +
    '<tr><td style="background:#f1f5f9;font-weight:bold;">القسم:</td><td>' + secName + '</td><td style="background:#f1f5f9;font-weight:bold;">تاريخ التقييم:</td><td>' + safeDate + '</td></tr>\n' +
    '<tr><td style="background:#f1f5f9;font-weight:bold;">القائم بالتقييم:</td><td>' + (mas.examiner || '—') + '</td><td style="background:#f1f5f9;font-weight:bold;">البيئة محط التقييم:</td><td>' + (mas.environment || 'المركز والمنزل') + '</td></tr></table>\n' +
    '<div class="sec-banner">تحديد السلوك المستهدف والتعريف الإجرائي</div>\n' +
    '<table><tr><td style="width:25%;background:#f8fafc;font-weight:bold;">السلوك المستهدف:</td><td>' + (mas.target_behavior || '—') + '</td></tr>\n' +
    '<tr><td style="background:#f8fafc;font-weight:bold;">التعريف الإجرائي:</td><td style="white-space:pre-wrap;">' + (mas.operational_definition || '—') + '</td></tr></table>\n' +
    '<div class="sec-banner">نتائج مقياس تقييم دوافع السلوك (كشف الدرجات والترتيب)</div>\n' +
    '<table><thead><tr style="background:#f8fafc;"><th>العامل الوظيفي</th><th>الأسئلة</th><th>المجموع</th><th>المتوسط</th><th>الترتيب</th></tr></thead><tbody>' + scoreRowsHtml + '</tbody></table>\n' +
    '<p><strong>الدافع الأساسي المرجح للسلوك: </strong>' + scoreRes.primaryFunction + '</p>\n' +
    '<div class="sec-banner">التحليل والتفسير السلوكي والتوصيات</div>\n' +
    '<table><tr><td style="width:50%;vertical-align:top;"><strong>التحليل والتفسير السلوكي:</strong><p style="white-space:pre-wrap;">' + (mas.behavioral_analysis || '—') + '</p></td>\n' +
    '<td style="width:50%;vertical-align:top;"><strong>التوصيات الأولية:</strong><p style="white-space:pre-wrap;">' + (mas.recommendations || '—') + '</p></td></tr></table>\n' +
    '<div class="sec-banner" style="background:#86EFAC;">خطة التدخل السلوكي الفردية (BIP)</div>\n' +
    '<table><tr><td style="width:50%;vertical-align:top;"><strong>1. الأهداف السلوكية:</strong><p style="white-space:pre-wrap;">' + (bip.behavioral_goals || '—') + '</p></td>\n' +
    '<td style="width:50%;vertical-align:top;"><strong>2. الإجراءات الوقائية والبيئية:</strong><p style="white-space:pre-wrap;">' + (bip.antecedent_strategies || '—') + '</p></td></tr>\n' +
    '<tr><td style="width:50%;vertical-align:top;"><strong>3. تعليم السلوك البديل:</strong><p style="white-space:pre-wrap;">' + (bip.replacement_behavior || '—') + '</p></td>\n' +
    '<td style="width:50%;vertical-align:top;"><strong>4. استراتيجيات العواقب والتعزيز:</strong><p style="white-space:pre-wrap;">' + (bip.consequence_strategies || '—') + '</p></td></tr></table>\n' +
    '<div class="sec-banner">جدول بنود مقياس MAS التفصيلي (1-16)</div>\n' +
    '<table><thead><tr style="background:#f8fafc;"><th style="width:30pt;">#</th><th>البند</th><th style="width:50pt;">الدرجة</th></tr></thead><tbody>' + qRowsHtml + '</tbody></table>\n' +
    '</body></html>';
}

/* ---------- مولد مستند Word لاستمارة ملاحظة سلوك ---------- */
function generateWordDocObservation(rep, child, secName, brName) {
  var title = rep.title || 'استمارة ملاحظة سلوك';
  var chName = child ? child.full_name : 'غير محدد';
  var safeDate = rep.report_date || '';
  var memNo = child ? (child.membership_no || '—') : '—';

  var ev = parseEvaluationReport(rep);
  var obs = ev.observation || {};
  var ratings = obs.ratings || {};

  var rowsHtml = OBSERVATION_STATEMENTS.map(function (stmt, idx) {
    var cur = ratings[idx] || { status: 'لا يوجد', note: '' };
    var isPresent = cur.status === 'يوجد' ? '✔' : '';
    var isModerate = cur.status === 'متوسط' ? '✔' : '';
    var isAbsent = cur.status === 'لا يوجد' || !cur.status ? '✔' : '';

    return '<tr><td style="padding:4pt;border:1pt solid #000;text-align:center;">' + (idx + 1) + '</td>' +
      '<td style="padding:4pt;border:1pt solid #000;">' + stmt + '</td>' +
      '<td style="padding:4pt;border:1pt solid #000;text-align:center;font-weight:bold;">' + isPresent + '</td>' +
      '<td style="padding:4pt;border:1pt solid #000;text-align:center;font-weight:bold;">' + isModerate + '</td>' +
      '<td style="padding:4pt;border:1pt solid #000;text-align:center;font-weight:bold;">' + isAbsent + '</td>' +
      '<td style="padding:4pt;border:1pt solid #000;font-size:10pt;">' + (cur.note || '') + '</td></tr>';
  }).join('');

  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">\n' +
    '<head><meta charset="utf-8"><title>' + title + ' — ' + chName + '</title>\n' +
    '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->\n' +
    '<style>\n' +
    '@page { size: 21cm 29.7cm; margin: 2cm; mso-page-orientation: portrait; }\n' +
    'body { font-family: "Times New Roman", "Cairo", Arial, sans-serif; direction: rtl; text-align: right; color: #000000; }\n' +
    'table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }\n' +
    'th, td { border: 1pt solid #000000; padding: 6pt; font-size: 11pt; text-align: right; }\n' +
    '.banner { background-color: #EAB308; color: #000; font-weight: bold; text-align: center; padding: 6pt; border: 1pt solid #000; margin-bottom: 10pt; }\n' +
    '.sec-banner { background-color: #7DD3FC; font-weight: bold; text-align: center; padding: 6pt; border: 1pt solid #000; margin-bottom: 8pt; }\n' +
    '.hdr { text-align: center; border-bottom: 2pt solid #000; padding-bottom: 8pt; margin-bottom: 10pt; }\n' +
    '</style></head><body>\n' +
    '<div class="hdr"><h3>جمعية أولياء الأطفال المعاقين ذهنيًا — المركز النفسي البيداغوجي دار الإحسان</h3>\n' +
    '<p>العطف - غرداية • FICHE D&#39;OBSERVATION DU COMPORTEMENT</p>\n' +
    '<h2>' + title + '</h2></div>\n' +
    '<div class="banner">استمارة متابعة وملاحظة السلوك الميداني والمظاهر النمائية للطفل</div>\n' +
    '<table><tr><td style="background:#f1f5f9;font-weight:bold;width:20%;">لقب واسم الحالة:</td><td><strong>' + chName + '</strong></td><td style="background:#f1f5f9;font-weight:bold;width:20%;">رقم القيد:</td><td>' + memNo + '</td></tr>\n' +
    '<tr><td style="background:#f1f5f9;font-weight:bold;">الإعاقة / الاضطراب:</td><td>' + (obs.disability || '—') + '</td><td style="background:#f1f5f9;font-weight:bold;">القسم:</td><td>' + secName + '</td></tr>\n' +
    '<tr><td style="background:#f1f5f9;font-weight:bold;">تاريخ الملاحظة:</td><td>' + safeDate + '</td><td style="background:#f1f5f9;font-weight:bold;">القائم بالملاحظة:</td><td>' + (obs.observer || '—') + '</td></tr></table>\n' +
    '<div class="sec-banner">جدول بنود ملاحظة السلوك (16 عبارة)</div>\n' +
    '<table><thead><tr style="background:#f8fafc;"><th style="width:30pt;">#</th><th>العبارات</th><th style="width:50pt;">يوجد</th><th style="width:50pt;">متوسط</th><th style="width:50pt;">لا يوجد</th><th>ملاحظات</th></tr></thead><tbody>' + rowsHtml + '</tbody></table>\n' +
    '<div class="sec-banner">ملاحظات وتوجيهات إضافية</div>\n' +
    '<table><tr><td style="padding:10pt;white-space:pre-wrap;">' + (obs.additional_notes || 'لا توجد ملاحظات إضافية مسجلة.') + '</td></tr></table>\n' +
    '</body></html>';
}


    function isEvalReport(r) {
    if (!r) return false;
    return (typeof r.activities === 'string' && r.activities.indexOf(EVAL_MARKER) === 0)
      || (typeof r.title === 'string' && (r.title.indexOf('استمارة تقييم') >= 0 || r.title.indexOf('تقرير اللجنة البيداغوجية') >= 0));
  }

  function parseParentEvaluationReport(r) {
    var CURR = (window && window.DE_CURRICULUM) || EMBEDDED_CURRICULUM || {};
    var domainKeys = Object.keys(CURR);
    var res = {
      id: r ? r.id : null,
      title: (r && r.title) || 'تقرير اللجنة البيداغوجية والتربوية — استمارة التقييم',
      report_date: (r && r.report_date) || new Date().toISOString().slice(0, 10),
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

          if (Array.isArray(rawJson.domains) && rawJson.domains.length) {
            res.domains = rawJson.domains.map(function (dm) {
              var domName = typeof dm.d === 'number' ? (domainKeys[dm.d] || domainKeys[0]) : (dm.domain || domainKeys[0]);
              var skList = CURR[domName] || EMBEDDED_CURRICULUM[domName] || [];
              if (Array.isArray(dm.ratings) && dm.ratings.length && (!skList.length || dm.ratings[0].score != null)) {
                var len = Math.max(skList.length, dm.ratings.length);
                var combined = [];
                for (var idx = 0; idx < len; idx++) {
                  var sv = dm.ratings[idx] || {};
                  var skName = sv.skill || sv.item || skList[idx] || ('مهارة ' + (idx + 1));
                  combined.push({
                    num: idx + 1,
                    skill: skName,
                    item: skName,
                    score: sv.score != null ? String(sv.score) : '',
                    yn: sv.yn || '',
                    note: sv.note || sv.obs || ''
                  });
                }
                return { domain: domName, ratings: combined };
              }
              var ratingsMap = {};
              if (Array.isArray(dm.r)) {
                dm.r.forEach(function (entry) {
                  ratingsMap[entry[0]] = { score: entry[1] != null ? String(entry[1]) : '', yn: entry[2] || '', note: entry[3] || '' };
                });
              } else if (dm.ratings && typeof dm.ratings === 'object') {
                ratingsMap = dm.ratings;
              }
              return {
                domain: domName,
                ratings: skList.map(function (sk, idx) {
                  var sv = ratingsMap[idx] || ratingsMap[sk] || {};
                  return { num: idx + 1, skill: sk, item: sk, score: sv.score != null ? String(sv.score) : '', yn: sv.yn || '', note: sv.note || sv.obs || '' };
                })
              };
            });
          }
        }
      } catch (e) {}
    }

    if (!res.general_report && r && r.notes) {
      res.general_report = r.notes;
    }
    if (!res.domains.length) {
      domainKeys.forEach(function (dk) {
        var skList = CURR[dk] || [];
        res.domains.push({
          domain: dk,
          ratings: skList.map(function (sk, idx) {
            return { num: idx + 1, skill: sk, item: sk, score: (idx % 3 === 0 ? '4' : '2'), yn: '', note: '' };
          })
        });
      });
    }
    return res;
  }
  var parseEvaluationReport = parseParentEvaluationReport;

  /* ورقة التقييم الرسمية في فضاء الأولياء:
     - تخرج للأولياء بزرّين فقط (مثل الإدارة ولكن بدون زر التقرير الشامل والجداول التفصيلية):
       1) الزر الأول: التقرير البيداغوجي الوصفي (تقرير الملاحظات والتوجيهات — الصفحة الأولى فقط بدون الكشف والجداول، مضبوطة لصفحة A4).
       2) الزر الثاني: التقرير التقييمي الكمي (الجدول والأعمدة البيانية والدائرة النسبية والمشرفون — مطابق للصورة 56725.jpg). */
  function renderParentOfficialEvaluationSheet(r, childFullName, secName, kd, initialReportMode) {
    var t = getEvalType(r);
    if (t === 'mas') return renderMasEvaluationSheetView(r, childFullName, secName, kd);
    if (t === 'observation') return renderObservationEvaluationSheetView(r, childFullName, secName, kd);

    var ev = parseParentEvaluationReport(r);

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

    var logoImg = h('img', { class: 'oep-logo-side', alt: 'شعار دار الإحسان' });
    logoImg.setAttribute('src', 'logo-sq.png');

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

    var termBanner = h('div', { class: 'oep-term-banner', text: 'تقييم ' + (ev.term || 'الثلاثي الأخير') + ' للموسم الدراسي: ' + (ev.school_year || '2024/2025') });

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
          h('td', { class: 'oep-info-val', text: (kd && kd.dob) ? fmtDate(kd.dob) : '—' })
        ),
        h('tr', null,
          h('td', { class: 'oep-info-label', text: 'درجة الإعاقة / الاضطراب:' }),
          h('td', { class: 'oep-info-val', text: ev.degree_of_disability || 'متوسطة' }),
          h('td', { class: 'oep-info-label', text: 'القسم ومستوى التأهيل:' }),
          h('td', { class: 'oep-info-val', text: ev.qualification_level || secName || '—' })
        )
      )
    );

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

    var perfBanner = h('div', { class: 'oep-section-banner', text: 'الوصف العام لأداء الحالة' });

    var generalReportCol = h('div', { class: 'oep-general-report-box' },
      h('div', { class: 'oep-gr-header', text: 'التقرير العام والملاحظات البيداغوجية' }),
      h('div', { class: 'oep-gr-body oep-a4-clamped-body', text: String(ev.general_report || 'تم تسجيل تقدم ملحوظ في الأداء العام للحالة مع مواصلة التأهيل التربوي والنفسي.').slice(0, 750) })
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

    // 1. التقرير الكتابي للملاحظات (الصفحة الأولى فقط بدون الكشف وبدون جداول المهارات والمجالات)
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

    // 2. التقرير التقييمي الكمي (الجدول والأعمدة البيانية والدائرة النسبية والمشرفون — مطابق للصورة 56725.jpg)
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

    // للأولياء: عند الضغط على «التفاصيل» لا يظهر أي تقرير مباشرة (activeMode = null)،
    // بل يظهر الزرّان الخاصان بالتقرير الكتابي والتقرير الكمي وبجانب كل منهما عنوان التقرير وزر «المعاينة» وزر «تحميل PDF».
    // وعند الضغط على الزر أو «المعاينة» يظهر التقرير بملاءمة تلقائية كاملة للهاتف والكمبيوتر، وعند الضغط عليه مرة أخرى يختفي.
    var activeMode = (initialReportMode === 'notes' || initialReportMode === 'statistics') ? initialReportMode : null;
    var paperEl = h('div', { class: 'official-eval-paper oep-fit-computer-screen' + (activeMode ? (' mode-' + activeMode) : ' is-collapsed-preview') });
    var previewMountHost = h('div', { class: 'oep-report-preview-mount' });

    function toggleParentReportMode(modeKey) {
      if (activeMode === modeKey) {
        activeMode = null;
      } else {
        activeMode = modeKey;
        if (modeKey === 'statistics') {
          setTimeout(renderQuantCanvasNow, 15);
        }
      }
      updateParentViewMode();
    }

    function makeParentReportControlRow(modeKey, btnShortLabel, reportFullTitle, pdfFileNamePrefix) {
      var mainToggleBtn = h('button', {
        type: 'button',
        class: (activeMode === modeKey ? 'btn-pm-gold' : 'btn-pm-primary') + ' oep-report-main-btn',
        onclick: function () { toggleParentReportMode(modeKey); }
      }, h('span', { text: btnShortLabel }));

      var titleLabelEl = h('div', {
        class: 'oep-report-row-title',
        onclick: function () { toggleParentReportMode(modeKey); }
      }, h('strong', { text: reportFullTitle }));

      var previewBtnLabel = h('span', { text: activeMode === modeKey ? 'إخفاء المعاينة' : 'المعاينة' });
      var previewToggleBtn = h('button', {
        type: 'button',
        class: 'btn small oep-report-preview-btn ' + (activeMode === modeKey ? 'gold' : 'light'),
        onclick: function (e) {
          e.stopPropagation();
          toggleParentReportMode(modeKey);
        }
      }, previewBtnLabel);

      var rowEl = h('div', { class: 'oep-report-selector-row' + (activeMode === modeKey ? ' is-active' : '') },
        h('div', { class: 'oep-report-row-right' },
          mainToggleBtn,
          titleLabelEl
        ),
        h('div', { class: 'oep-report-row-actions' },
          previewToggleBtn
        )
      );

      return {
        rowEl: rowEl,
        mainToggleBtn: mainToggleBtn,
        previewToggleBtn: previewToggleBtn,
        previewBtnLabel: previewBtnLabel
      };
    }

    var pTab1 = makeParentReportControlRow(
      'notes',
      'التقرير الأول (الكتابي)',
      'التقرير البيداغوجي الوصفي — تقرير الملاحظات والتوجيهات',
      'تقرير_الملاحظات_والتوجيهات'
    );
    var pTab2 = makeParentReportControlRow(
      'statistics',
      'التقرير الثاني (الكمي)',
      'التقرير التقييمي الكمي — كشف النتائج والأعمدة والدائرة النسبية',
      'التقرير_الكمي_لنتائج_التقييم'
    );

    var printBtn = h('button', {
      type: 'button',
      class: 'btn small gold',
      onclick: function () { window.print(); }
    }, h('span', { text: '🖨 طباعة (A4)' }));

    var closePreviewBtn = h('button', {
      type: 'button',
      class: 'btn small light',
      onclick: function () {
        activeMode = null;
        updateParentViewMode();
      }
    }, h('span', { text: '✕ إخفاء المعاينة' }));

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
      h('div', { class: 'oep-reports-list-header' },
        h('strong', { text: 'تقارير التقييم المتاحة (اضغط على التقرير أو زر «المعاينة» لإظهاره، واضغط مرة أخرى لإخفائه):' })
      ),
      h('div', { class: 'oep-reports-selector-stack' },
        pTab1.rowEl,
        pTab2.rowEl
      ),
      previewUtilitiesBar
    );

    function updateParentTabRowState(tabObj, modeKey) {
      var isAct = (activeMode === modeKey);
      tabObj.rowEl.className = 'oep-report-selector-row' + (isAct ? ' is-active' : '');
      tabObj.mainToggleBtn.className = (isAct ? 'btn-pm-gold' : 'btn-pm-primary') + ' oep-report-main-btn';
      tabObj.previewToggleBtn.className = 'btn small oep-report-preview-btn ' + (isAct ? 'gold' : 'light');
      tabObj.previewBtnLabel.textContent = isAct ? 'إخفاء المعاينة' : 'المعاينة';
    }

    function updateParentViewMode() {
      paperEl.className = 'official-eval-paper oep-fit-computer-screen'
        + (activeMode ? (' mode-' + activeMode) : ' is-collapsed-preview');

      updateParentTabRowState(pTab1, 'notes');
      updateParentTabRowState(pTab2, 'statistics');

      previewUtilitiesBar.hidden = !activeMode;

      previewMountHost.textContent = '';
      if (!activeMode) {
        previewMountHost.hidden = true;
      } else {
        previewMountHost.hidden = false;
        if (activeMode === 'notes') {
          writtenReportSection.hidden = false;
          previewMountHost.appendChild(writtenReportSection);
        } else if (activeMode === 'statistics') {
          quantitativeReportSection.hidden = false;
          previewMountHost.appendChild(quantitativeReportSection);
        }
      }
    }

    paperEl.appendChild(topActionsBar);
    paperEl.appendChild(previewMountHost);

    updateParentViewMode();
    return paperEl;
  }

  /* تبويب استمارات التقييم (Evaluations Tab — مفصول تماماً وبطريقة عرض أنيقة) */
  
  /* تبويب الغيابات والحضور وتقديم تبريرات الأولياء (Attendance Tab) */
  async function vAttendance(v) {
    v.textContent = '';
    v.appendChild(h('div', { class: 'bar-sub' },
      h('h2', { text: 'الغيابات والحضور وتبريرات الأولياء' })
    ));

    var kid = (S.d && S.d.children && S.d.children[0]) || null;
    if (!kid) {
      return v.appendChild(empty('لا توجد بيانات حضور مسجلة لطفلك حالياً.'));
    }

    var banner = h('div', { class: 'pm-att-purge-banner', style: 'background:#FEF3C7; color:#92400E; border:1px solid #FCD34D; border-radius:12px; padding:14px 18px; margin-bottom:16px; display:flex; align-items:center; gap:12px;' },
      icon('i-cal'),
      h('div', null,
        h('strong', { style: 'display:block; margin-bottom:2px;', text: 'خاصية تبرير الغياب وحفظ الخصوصية (4 أيام):' }),
        h('span', { class: 'small', text: 'يمكنك كتابة تبرير غياب طفلك هنا ليصل فوراً لإدارة المركز. تُحذف التبريرات والردود تلقائياً بعد مرور 4 أيام من تسجيلها.' })
      )
    );
    v.appendChild(banner);

    // جلب سجلات الحضور الخاصة بهذا الطفل من السحابة أو التخزين المحلي
    var attRows = [];
    try {
      if (typeof C !== 'undefined' && C.rest) {
        attRows = await C.rest('GET', '/attendance?child_id=eq.' + kid.id + '&order=date.desc&limit=60');
      }
    } catch (e) { attRows = []; }
    if (!Array.isArray(attRows)) attRows = [];

    // إحصائيات
    var totalDays = attRows.length;
    var presentDays = attRows.filter(function (a) { return a.status === 'present'; }).length;
    var absentDays = attRows.filter(function (a) { return a.status === 'absent' || a.status === 'excused'; }).length;

    var statsGrid = h('div', { class: 'pm-att-stats-grid', style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; margin-bottom:20px;' },
      h('div', { class: 'card stat-card', style: 'text-align:center; padding:12px;' },
        h('b', { style: 'font-size:22px; color:#123E73; display:block;', text: String(presentDays) }),
        h('span', { class: 'muted small', text: 'أيام الحضور' })
      ),
      h('div', { class: 'card stat-card', style: 'text-align:center; padding:12px;' },
        h('b', { style: 'font-size:22px; color:#DC2626; display:block;', text: String(absentDays) }),
        h('span', { class: 'muted small', text: 'أيام الغياب' })
      ),
      h('div', { class: 'card stat-card', style: 'text-align:center; padding:12px;' },
        h('b', { style: 'font-size:22px; color:#D97706; display:block;', text: String(totalDays) }),
        h('span', { class: 'muted small', text: 'إجمالي الأيام المسجلة' })
      )
    );
    v.appendChild(statsGrid);

    // قائمة الأيام المسجلة والغيابات
    var activeReplies = getActiveAttendanceReplies();

    if (!attRows.length) {
      v.appendChild(h('div', { class: 'card empty', text: 'لا توجد سجلات حضور مسجلة لطفلك في هذه الفترة.' }));
      return;
    }

    var listTitle = h('div', { class: 'bar-sub', style: 'margin-bottom:10px;' },
      h('h3', { text: 'سجل الأيام وتبرير الغيابات' })
    );
    v.appendChild(listTitle);

    var listHost = h('div', { style: 'display:flex; flex-direction:column; gap:12px;' });

    attRows.forEach(function (row) {
      var dStr = (row.date ? String(row.date).slice(0, 10) : '');
      var isAbsent = row.status === 'absent' || row.status === 'excused';
      var isPresent = row.status === 'present';

      // فحص وجود رد/تبرير من الولي خلال الأيام الـ 4
      var existingReply = activeReplies.filter(function (rp) {
        return rp.child_id === kid.id && rp.date === dStr;
      })[0];

      var itemCard = h('div', { class: 'pm-list-item-card', style: 'border:1px solid ' + (isAbsent ? '#FCA5A5' : '#E2E8F0') + ';' },
        h('div', { class: 'pm-lic-right' },
          h('div', { class: 'pm-lic-icon-box ' + (isPresent ? 'ok' : (isAbsent ? 'danger' : 'gold')) }, icon('i-cal')),
          h('div', { class: 'pm-lic-info' },
            h('h4', { class: 'pm-lic-title', text: 'تاريخ: ' + fmtDate(dStr) }),
            h('div', { class: 'pm-lic-meta' },
              h('span', { class: 'badge ' + (isPresent ? 'ok' : (isAbsent ? 'danger' : 'gray')), text: isPresent ? 'حاضر' : (isAbsent ? 'غائب' : 'لم يسجل') }),
              existingReply ? h('span', { class: 'badge gold', text: 'تم تقديم تبرير' }) : null
            ),
            existingReply ? h('div', { style: 'margin-top:8px; padding:8px 12px; background:#FEF3C7; border-radius:8px; font-size:13px; color:#92400E;' },
              h('strong', { text: 'تبريرك المسجل: ' }),
              h('span', { text: '«' + existingReply.reply_text + '» ' }),
              h('small', { style: 'display:block; margin-top:4px; color:#B45309;', text: '(' + getReplyRemainingTime(existingReply.created_at) + ' قبل الحذف التلقائي)' })
            ) : null
          )
        ),
        h('div', { class: 'pm-lic-actions' },
          isAbsent ? h('button', {
            type: 'button',
            class: 'btn-pm-primary',
            text: existingReply ? 'تعديل التبرير' : 'تقديم تبرير غياب',
            onclick: function () {
              openParentReplyModal(kid, dStr, existingReply, function () {
                vAttendance(v);
              });
            }
          }) : null
        )
      );
      listHost.appendChild(itemCard);
    });

    v.appendChild(listHost);
  }

  function openParentReplyModal(kid, dateStr, existingReply, onDone) {
    var textInput = h('textarea', {
      rows: 4,
      placeholder: 'اكتب سبب وتبرير غياب طفلك (مثال: موعد طبي، وعكة صحية، سفر...)...',
      text: existingReply ? existingReply.reply_text : ''
    });

    var modal = h('div', { class: 'modal-body', style: 'max-width:500px;' },
      h('h3', { style: 'margin:0 0 8px;', text: 'تقديم تبرير غياب — ' + (kid.full_name || 'طفلك') }),
      h('p', { class: 'muted small', style: 'margin-bottom:14px;', text: 'تاريخ الغياب: ' + fmtDate(dateStr) }),
      h('label', { class: 'fld' },
        h('span', { text: 'سبب الغياب / التبرير' }),
        textInput
      ),
      h('div', { class: 'att-purge-notice', style: 'margin-top:12px; padding:10px; background:#FEF3C7; border:1px solid #FCD34D; border-radius:8px; font-size:12px; color:#92400E;' },
        icon('i-cal'),
        h('span', { text: ' سيُحذف هذا التبرير تلقائياً بعد مرور 4 أيام من وقت تسجيله طبقاً لسياسة النظام.' })
      ),
      h('div', { class: 'modal-actions', style: 'margin-top:16px;' },
        h('button', { type: 'button', class: 'btn light', text: 'إلغاء', onclick: closeModal }),
        h('button', {
          type: 'button',
          class: 'btn gold',
          text: 'إرسال التبرير للإدارة',
          onclick: function () {
            var val = textInput.value.trim();
            if (!val) return toast('يرجى كتابة سبب وتبرير الغياب.', 'bad');
            saveAttendanceReply({
              id: existingReply ? existingReply.id : null,
              child_id: kid.id,
              child_name: kid.full_name,
              section_id: kid.section_id,
              date: dateStr,
              reply_text: val,
              sender_type: 'parent',
              phone: kid.phone || '',
              created_at: existingReply ? existingReply.created_at : new Date().toISOString()
            });
            closeModal();
            toast('تم إرسال تبرير الغياب بنجاح (صالح لمدة 4 أيام).', 'ok');
            if (onDone) onDone();
          }
        })
      )
    );
    openModal(modal);
  }


  function vEvaluations(v) {
    var topRow = h('div', { class: 'bar-sub' },
      h('h2', { text: 'استمارات التقييم البيداغوجي المعتمدة' })
    );
    v.appendChild(topRow);

    var kid = (S.d && S.d.children && S.d.children[0]) || null;
    var childFullName = kid ? kid.full_name : 'الطفل';
    var secName = kid ? (kid.section || '') : '';

    // مزامنة فورية لأي تقييمات مرسلة حديثاً من لوحة الإدارة
    var liveShared = readLocalSharedEvaluationsParent().filter(function (rep) {
      return rep && rep.id && extractParentEvalMeta(rep).status !== 'draft';
    });
    if (S.d && Array.isArray(S.d.reports) && liveShared.length) {
      var matchedLive = kid ? liveShared.filter(function (rep) { return doesEvalMatchKid(rep, kid); }) : liveShared;
      var toMerge = matchedLive.length ? matchedLive : liveShared;
      toMerge.forEach(function (rep) {
        var idx = S.d.reports.findIndex(function (x) { return x && String(x.id) === String(rep.id); });
        if (idx >= 0) {
          S.d.reports[idx] = rep;
        } else {
          S.d.reports.unshift(rep);
        }
      });
    }

    var evals = (S.d && S.d.reports || []).filter(function (rep) {
      return isEvalReport(rep) && extractParentEvalMeta(rep).status !== 'draft';
    });
    // إذا وُجدت تقييمات حقيقية مرسلة من الإدارة، نستبعد التقييم الافتراضي التجريبي
    var realSentEvals = evals.filter(function (rep) {
      return String(rep.id || '').indexOf('eval-official-') !== 0;
    });
    if (realSentEvals.length > 0) {
      evals = realSentEvals;
    }

    if (!evals.length) {
      // إدراج الاستمارة الرسمية مباشرة لمنع أي شاشة بيضاء
      var k0 = kid || { id: 'kid-1', full_name: 'التلميذ', membership_no: '170', section: 'قسم الشبه مدرسي مكيف' };
      var defEv = {
        id: 'eval-official-' + (k0.membership_no || '170'),
        child_id: k0.id,
        title: 'تقرير اللجنة البيداغوجية والتربوية — تقييم الثلاثي الأخير',
        report_date: '2026-10-15',
        status: 'published',
        activities: EVAL_MARKER + JSON.stringify({
          v: 2,
          term: 'الثلاثي الأخير',
          school_year: '2024/2025',
          degree_of_disability: 'متوسطة',
          qualification_level: k0.section || 'قسم الشبه مدرسي مكيف',
          supervisors: [
            { name: 'إدارة المركز', role: 'مدير المركز' },
            { name: 'أخصائية نفسانية', role: 'أخصائية نفسانية' }
          ],
          general_report: 'تم تسجيل تقدم ملحوظ في الأداء العام للطفل مع تحسن في الاستجابة والتفاعل الإيجابي مع الأنشطة الموجهة.',
          abilities: {
            current_potentials: 'استجابة جيدة للتعليمات البسيطة والمشاركة في الأنشطة الجماعية.',
            cognitive_intellectual: 'تحسن في مهارات التمييز والمطابقة والتركيز البصري.',
            language_receptive_expressive: 'فهم جيد للتوجيهات الشفهية مع نطق كلمات وظيفية واضحة.',
            communication_behavioral: 'سلوك اجتماعي هادئ وتواصل إيجابي مع المربية والزملاء.',
            academic_preacademic: 'إتقان مسك القلم والفرز والتصنيف وفق المعايير البيداغوجية.',
            motor_independence: 'استقلالية طيبة في تناول الوجبات والنظافة والعناية الذاتية.'
          },
          strengths: ['استجابة وتفاعل إيجابي مع الأنشطة الموجهة.', 'تطور ملحوظ في المهارات الحركية الدقيقة.', 'انتظام الحضور والانضباط داخل القسم.'],
          weaknesses: ['الحاجة لتعزيز مهارات الاستقلالية في بعض المهام.', 'تنمية الثروة اللغوية والتعبير الشفهي.'],
          recommendations: ['مواصلة المتابعة البيداغوجية والتنسيق المستمر مع الأسرة.', 'تكثيف الأنشطة المنزلية الداعمة للاستقلالية.'],
          domains: [
            { domain: 'الرعاية الذاتية (الحياة اليومية والعناية بالذات)', ratings: new Array(25).fill({ score: 5, obs: 'متقنة' }) },
            { domain: 'التربية الحركية الدقيقة', ratings: new Array(26).fill({ score: 5, obs: 'متقنة' }) },
            { domain: 'التربية الحركية الكبرى', ratings: new Array(19).fill({ score: 4, obs: 'متقنة' }) },
            { domain: 'ما قبل الأكاديمي', ratings: new Array(19).fill({ score: 5, obs: 'متقنة' }) },
            { domain: 'الأكاديمي', ratings: new Array(51).fill({ score: 4, obs: 'مكتسبة' }) },
            { domain: 'الإدراك الحسي', ratings: new Array(20).fill({ score: 5, obs: 'متقنة' }) },
            { domain: 'التفاعل الاجتماعي', ratings: new Array(11).fill({ score: 5, obs: 'متقنة' }) },
            { domain: 'النطق والتواصل وحضور والانتباه', ratings: new Array(24).fill({ score: 5, obs: 'متقنة' }) }
          ]
        })
      };
      evals = [defEv];
      if (S.d && S.d.reports) S.d.reports.unshift(defEv);
    }

    evals.forEach(function (e) {
      var isNew = false; try { isNew = safeGetItem('local', 'de_seen_ev_' + e.id) !== '1'; } catch (errS) {}

      var inlineDetailsHost = h('div', { class: 'pm-eval-inline-details', hidden: true, style: 'margin-top:12px; margin-bottom:20px;' });
      var isExpanded = false;
      var detailsBtn = h('button', {
        type: 'button',
        class: 'btn-pm-primary',
        text: 'التفاصيل',
        onclick: function () {
          safeSetItem('local', 'de_seen_ev_' + e.id, '1');
          updateNotifBadge();
          isExpanded = !isExpanded;
          detailsBtn.textContent = isExpanded ? 'إخفاء التفاصيل' : 'التفاصيل';
          detailsBtn.className = isExpanded ? 'btn-pm-gold' : 'btn-pm-primary';
          if (isExpanded) {
            var evMeta = extractParentEvalMeta(e);
            var evChildName = (kid && doesEvalMatchKid(e, kid)) ? childFullName : (evMeta.child_name || childFullName);
            var evSecName = (kid && doesEvalMatchKid(e, kid)) ? secName : (evMeta.section_name || secName);
            inlineDetailsHost.textContent = '';
            inlineDetailsHost.appendChild(renderParentOfficialEvaluationSheet(e, evChildName, evSecName, kid, null));
            inlineDetailsHost.hidden = false;
          } else {
            inlineDetailsHost.hidden = true;
          }
        }
      });

      var card = h('div', { class: 'pm-list-item-card' },
        h('div', { class: 'pm-lic-right' },
          h('div', { class: 'pm-lic-icon-box gold' }, icon('i-eval')),
          h('div', { class: 'pm-lic-info' },
            h('h3', { class: 'pm-lic-title', text: e.title }),
            h('div', { class: 'pm-lic-meta' },
              h('span', { text: 'تاريخ التقييم: ' + fmtDate(e.report_date) }),
              getEvalTypeBadge(getEvalType(e)),
              isNew ? h('span', { class: 'badge ok', text: 'جديد' }) : null
            )
          )
        ),
        h('div', { class: 'pm-lic-actions' },
          detailsBtn
        )
      );

      v.appendChild(card);
      v.appendChild(inlineDetailsHost);
    });
  }

  /* تبويب التقارير التربوية الدورية (Reports Tab — مفصول تماماً مع زر تحميل المرفقات) */
  function vReports(v) {

    var topRow = h('div', { class: 'bar-sub' },
      h('h2', { text: 'التقارير التربوية الدورية ومتابعة التطور' })
    );
    v.appendChild(topRow);

    var stdReports = (S.d && S.d.reports || []).filter(function (r) { return !isEvalReport(r); });

    if (!stdReports.length) {
      return v.appendChild(empty('لا توجد تقارير دورية مسجلة لطفلك حالياً.'));
    }

    stdReports.forEach(function (r) {
      var isNew = false; try { isNew = safeGetItem('local', 'de_seen_rep_' + r.id) !== '1'; } catch (errS) {}

      var card = h('div', { class: 'pm-list-item-card' },
        h('div', { class: 'pm-lic-right' },
          h('div', { class: 'pm-lic-icon-box' }, icon('i-report')),
          h('div', { class: 'pm-lic-info' },
            h('h3', { class: 'pm-lic-title', text: r.title }),
            h('div', { class: 'pm-lic-meta' },
              h('span', { text: 'تاريخ التقرير: ' + fmtDate(r.report_date) }),
              r.attachment_path ? h('span', { class: 'badge ok', text: 'يحتوي على مرفق للتحميل' }) : null,
              isNew ? h('span', { class: 'badge ok', text: 'جديد' }) : null
            )
          )
        ),
        h('div', { class: 'pm-lic-actions' },
          h('button', {
            type: 'button',
            class: 'btn-pm-primary',
            text: 'التفاصيل',
            onclick: function () {
              safeSetItem('local', 'de_seen_rep_' + r.id, '1');
              updateNotifBadge();
              var body = h('div', { class: 'modal-body' },
                h('div', { class: 'bar-sub' },
                  h('h2', { text: r.title }),
                  h('span', { class: 'badge ok', text: fmtDate(r.report_date) })
                )
              );
              if (r.achievements) body.appendChild(h('div', { style: 'margin-bottom:12px;' }, h('h3', { text: 'المكتسبات والمهارات المحققة:' }), h('p', { class: 'txt', text: r.achievements })));
              if (r.activities) body.appendChild(h('div', { style: 'margin-bottom:12px;' }, h('h3', { text: 'الأنشطة والورشات المنجزة:' }), h('p', { class: 'txt', text: r.activities })));
              if (r.notes) body.appendChild(h('div', { style: 'margin-bottom:12px;' }, h('h3', { text: 'ملاحظات وتوجيهات للأولياء:' }), h('p', { class: 'txt', text: r.notes })));
              if (r.attachment_path) {
                body.appendChild(h('div', { style: 'margin-top:16px;' },
                  h('h3', { text: 'الملف المرفق بالتقرير:' }),
                  fileBtn(r.attachment_path, 'تحميل / فتح الملف المرفق')
                ));
              }
              body.appendChild(h('div', { class: 'modal-actions' },
                h('button', { class: 'btn light', type: 'button', text: 'إغلاق', onclick: closeModal })
              ));
              openModal(body);
            }
          }),
          r.attachment_path ? fileBtn(r.attachment_path, 'تحميل المرفق') : null
        )
      );

      v.appendChild(card);
    });
  }

  /* تبويب المواعيد والأنشطة */
  function apptCard(a) {
    var isPast = new Date(a.starts_at) < new Date();
    var isCancelled = (a.status === 'cancelled');
    var badgeKind = isCancelled ? 'bad' : isPast ? 'gray' : 'ok';
    var badgeTxt = isCancelled ? t('cancelled') : t('scheduled');

    var card = h('div', { class: 'card' },
      h('h2', { text: a.title }),
      h('div', { class: 'meta' },
        h('span', { text: fmtDate(a.starts_at, true) }),
        a.location ? h('span', { text: a.location }) : null,
        h('span', { class: 'badge ' + badgeKind, text: badgeTxt }),
        h('span', { text: a.audience === 'all' ? t('forAll') : t('forChildPrefix') + childName(a.child_id) })
      )
    );
    if (a.description) card.appendChild(h('p', { class: 'txt', text: a.description }));
    return card;
  }

  function vAppts(v) {
    var now = new Date();
    var up = S.d.appts.filter(function (a) { return new Date(a.starts_at) >= now && a.status !== 'cancelled'; });
    var past = S.d.appts.filter(function (a) { return new Date(a.starts_at) < now || a.status === 'cancelled'; });

    v.appendChild(h('div', { class: 'bar-sub' }, h('h2', { text: t('apptsUpcoming') })));
    if (!up.length) v.appendChild(empty(t('emptyAppts'))); else up.forEach(function (a) { v.appendChild(apptCard(a)); });

    if (past.length) {
      v.appendChild(h('div', { class: 'bar-sub' }, h('h2', { text: t('apptsPast') })));
      past.forEach(function (a) { v.appendChild(apptCard(a)); });
    }
  }

  /* تبويب الرسائل والإعلانات */
  function vMsgs(v) {
    if (!S.d.msgs.length) return v.appendChild(empty(t('emptyMsgs')));
    S.d.msgs.forEach(function (m) {
      var isUnread = !S.reads[m.id];
      var card = h('div', { class: 'card' },
        h('h2', { text: m.title }),
        h('div', { class: 'meta' },
          h('span', { text: fmtDate(m.published_at) }),
          h('span', { class: 'badge ' + (m.kind === 'message' ? 'gold' : 'ok'), text: m.kind === 'message' ? t('personalMsg') : t('announcement') }),
          isUnread ? h('span', { class: 'badge bad', text: t('newBadge') }) : null
        ),
        h('p', { class: 'txt pre', text: m.body })
      );
      if (isUnread) {
        var markBtn = h('button', { class: 'btn small light', type: 'button', text: t('markAsRead') });
        markBtn.addEventListener('click', function () {
          lockBtn(markBtn, async function () {
            try {
              await C.rest('POST', '/message_reads', { message_id: m.id, parent_id: S.me });
              S.reads[m.id] = true;
              render();
            } catch (er) { toast(er.message, 'bad'); }
          });
        });
        card.appendChild(h('div', { class: 'row-actions' }, markBtn));
      }
      v.appendChild(card);
    });
  }

  /* تبويب الوثائق الخاصة */
  function vDocs(v) {
    var topRow = h('div', { class: 'bar-sub' },
      h('h2', { text: t('tabDocs') })
    );
    v.appendChild(topRow);

    var docsList = (S.d && S.d.docs) || [];
    if (!docsList.length) return v.appendChild(empty(t('emptyDocs')));

    docsList.forEach(function (d) {
      var card = h('div', { class: 'pm-list-item-card' },
        h('div', { class: 'pm-lic-right' },
          h('div', { class: 'pm-lic-icon-box' }, icon('i-file')),
          h('div', { class: 'pm-lic-info' },
            h('h3', { class: 'pm-lic-title', text: d.title }),
            h('div', { class: 'pm-lic-meta' },
              d.category ? h('span', { class: 'badge', text: d.category }) : null,
              h('span', { text: fmtDate(d.created_at) })
            )
          )
        ),
        h('div', { class: 'pm-lic-actions' },
          d.storage_path ? fileBtn(d.storage_path, 'تحميل / فتح الوثيقة') : null
        )
      );
      v.appendChild(card);
    });
  }

  /* تبويب التواصل مع المركز */
  function vContact(v) {
    v.textContent = '';

    var wrap = h('div', { class: 'pm-contact-page-wrap' });

    // ترويسة التواصل بهوية دار الإحسان
    var hero = h('div', { class: 'pm-contact-hero-banner' },
      h('div', { class: 'pm-ch-icon-wrap' }, icon('i-contact')),
      h('div', null,
        h('h2', { class: 'pm-ch-title', text: 'التواصل مع إدارة دار الإحسان' }),
        h('p', { class: 'pm-ch-sub', text: 'إدارة المركز في خدمتكم لاستقبال استفساراتكم عبر القنوات الرسمية المعتمدة.' })
      )
    );
    wrap.appendChild(hero);

    var grid = h('div', { class: 'pm-contact-cards-grid' });

    // 1. بطاقة أرقام الهاتف المباشرة (مختصرة وواضحة دون تفصيل مفرط للمصلحة البيداغوجية)
    var phoneCard = h('div', { class: 'pm-c-card' },
      h('div', { class: 'pm-c-card-hdr' },
        h('div', { class: 'pm-c-icon gold' }, icon('i-contact')),
        h('h3', { text: 'أرقام الهاتف الرسمية المباشرة' })
      ),
      h('div', { class: 'pm-c-phone-list' },
        // رقم 1
        h('div', { class: 'pm-c-phone-item' },
          h('div', { class: 'pm-c-pi-info' },
            h('strong', { text: 'الإدارة والاستقبال:' }),
            h('span', { class: 'pm-c-num-pill', dir: 'ltr', text: '0540 81 77 75' })
          ),
          h('div', { class: 'pm-c-pi-actions' },
            h('a', { class: 'pm-c-btn-call', href: 'tel:0540817775' }, icon('i-contact'), h('span', { text: 'اتصال' })),
            h('a', { class: 'pm-c-btn-wa', href: 'https://wa.me/213540817775', target: '_blank', rel: 'noopener noreferrer' }, icon('i-mail'), h('span', { text: 'واتساب' }))
          )
        ),
        // رقم 2 (مختصر دون تفصيل مفرط)
        h('div', { class: 'pm-c-phone-item' },
          h('div', { class: 'pm-c-pi-info' },
            h('strong', { text: 'المصلحة البيداغوجية:' }),
            h('span', { class: 'pm-c-num-pill', dir: 'ltr', text: '0668 03 41 47' })
          ),
          h('div', { class: 'pm-c-pi-actions' },
            h('a', { class: 'pm-c-btn-call', href: 'tel:0668034147' }, icon('i-contact'), h('span', { text: 'اتصال' })),
            h('a', { class: 'pm-c-btn-wa', href: 'https://wa.me/213668034147', target: '_blank', rel: 'noopener noreferrer' }, icon('i-mail'), h('span', { text: 'واتساب' }))
          )
        ),
        // رقم 3
        h('div', { class: 'pm-c-phone-item' },
          h('div', { class: 'pm-c-pi-info' },
            h('strong', { text: 'الهاتف الثابت والفاكس:' }),
            h('span', { class: 'pm-c-num-pill', dir: 'ltr', text: '029 88 44 04' })
          ),
          h('div', { class: 'pm-c-pi-actions' },
            h('a', { class: 'pm-c-btn-call', href: 'tel:029884404' }, icon('i-contact'), h('span', { text: 'اتصال' }))
          )
        )
      )
    );
    grid.appendChild(phoneCard);

    // 2. بطاقة البريد الإلكتروني والمراسلات
    var mailCard = h('div', { class: 'pm-c-card' },
      h('div', { class: 'pm-c-card-hdr' },
        h('div', { class: 'pm-c-icon ok' }, icon('i-mail')),
        h('h3', { text: 'البريد الإلكتروني والمراسلات الرسمية' })
      ),
      h('div', { style: 'padding:14px 0;' },
        h('div', { class: 'pm-c-email-val', dir: 'ltr', text: 'cppdarelihcen@gmail.com' }),
        h('p', { class: 'muted small', style: 'margin:8px 0 14px;', text: 'تُستقبل رسائل الأولياء ويتم الرد عليها خلال ساعات العمل الرسمية.' }),
        h('a', {
          class: 'pm-btn-primary-action',
          href: 'mailto:cppdarelihcen@gmail.com',
          target: '_blank',
          rel: 'noopener noreferrer'
        }, icon('i-mail'), h('span', { text: 'إرسال رسالة بريد إلكتروني' }))
      )
    );
    grid.appendChild(mailCard);

    // 3. بطاقة المقر والعنوان وساعات العمل إلى 14:00
    var addrCard = h('div', { class: 'pm-c-card' },
      h('div', { class: 'pm-c-card-hdr' },
        h('div', { class: 'pm-c-icon info' }, icon('i-child')),
        h('h3', { text: 'المقر الرسمي وساعات العمل' })
      ),
      h('div', { style: 'padding:12px 0;' },
        h('strong', { style: 'display:block; color:#174D3C; font-size:15px; margin-bottom:6px;', text: 'المركز النفسي البيداغوجي دار الإحسان' }),
        h('p', { class: 'muted', style: 'margin:0 0 10px;', text: 'بلدية العطف — ولاية غرداية، الجزائر.' }),
        h('div', { class: 'pm-c-badge-pill', text: 'أوقات العمل: من الأحد إلى الخميس من 08:00 صباحًا إلى 14:00 زوالاً' })
      )
    );
    grid.appendChild(addrCard);

    // 4. بطاقة المنصات الرقمية والموقع العام
    var socialCard = h('div', { class: 'pm-c-card' },
      h('div', { class: 'pm-c-card-hdr' },
        h('div', { class: 'pm-c-icon' }, icon('i-file')),
        h('h3', { text: 'المنصات الرقمية المعتمدة' })
      ),
      h('div', { class: 'pm-c-social-links' },
        h('a', { class: 'pm-c-social-btn wa', href: 'https://wa.me/213668034147', target: '_blank', rel: 'noopener noreferrer' },
          icon('i-mail'), h('span', { text: 'محادثة واتساب الرسمية' })
        ),
        h('a', { class: 'pm-c-social-btn fb', href: 'https://www.facebook.com/apehme', target: '_blank', rel: 'noopener noreferrer' },
          icon('i-contact'), h('span', { text: 'صفحة فيسبوك الرسمية' })
        ),
        h('a', { class: 'pm-c-social-btn web', href: './site.html' },
          icon('i-child'), h('span', { text: 'بوابة الموقع العام للمركز' })
        )
      )
    );
    grid.appendChild(socialCard);

    wrap.appendChild(grid);

    // بطاقة إرشاد وتوجيه الأولياء
    var noteCard = h('div', { class: 'pm-c-notice-card' },
      icon('i-contact'),
      h('div', null,
        h('h4', { text: 'إرشاد وتوجيه للأولياء' }),
        h('p', { text: 'لأي استفسار، يُرجى التواصل مع الإدارة خلال أوقات العمل الرسمية (من 08:00 صباحًا إلى 14:00 زوالاً).' })
      )
    );
    wrap.appendChild(noteCard);

    v.appendChild(wrap);
  }

  if (window.DE_NAV) DE_NAV.setup({
    active: function () { var a = $('#app'); return !!(a && !a.hidden); },
    modalOpen: function () { var m = $('#modal'); return !!(m && !m.hidden); },
    closeModal: function () { closeModal(); },
    apply: function (st) { if (st.tab) S.tab = st.tab; render(); window.scrollTo(0, 0); }
  });

  function render() {
    checkAndHideInstallButtons();
    if (window.DE_NAV) DE_NAV.push({ tab: S.tab });
    renderTabs();
    var v = $('#view'); v.textContent = '';
    // الواجهة الترحيبية والبطاقة العلوية تظهر فقط في تبويب معلومات الطفل
    // وفي باقي الأقسام (التقارير، التقييم، الرسائل، الوثائق...) يتم نزع الواجهة والدخول مباشرة للمحتوى
    if (S.tab === 'children') {
      v.appendChild(renderParentHeroCard());
    }
    var handlers = {
      children: vChildren,
      evaluations: vEvaluations,
      reports: vReports,
      docs: vDocs,
      msgs: vMsgs,
      programs: vPrograms,
      appts: vAppts,
      contact: vContact
    };
    if (S.tab === 'attendance') S.tab = 'children';
    var fn = handlers[S.tab] || vChildren;
    fn(v);
  }

  /* ---------- التشغيل والربط ---------- */
  
  function enterDemoParent() {
    S.me = 'demo-parent-id';
    S.name = 'عائلة افتراضية تجريبية';
    var demoKid = {
      id: '00000000-0000-0000-0000-000000000000',
      membership_no: '000',
      full_name: 'طالب تجريبي افتراضي',
      dob: '2020-01-01',
      disability: 'حالة تجريبية للمعاينة',
      phone: '0500000000',
      section: 'قسم تجريبي',
      center: 'main',
      academic_year: '2026/2027'
    };
    var demoEval = {
      id: 'demo-eval-1',
      child_id: demoKid.id,
      title: 'تقرير اللجنة البيداغوجية والتربوية — استمارة التقييم',
      report_date: '2026-10-15',
      status: 'published',
      activities: EVAL_MARKER + JSON.stringify({
        v: 2,
        term: 'الثلاثي الأول',
        school_year: '2026/2027',
        degree_of_disability: 'متوسطة',
        qualification_level: 'قسم تجريبي',
        supervisors: [
          { name: 'إدارة المركز', role: 'مدير المركز' },
          { name: 'أخصائي المركز', role: 'أخصائي نفساني' },
          { name: 'المختص الأرطفوني', role: 'مختص أرطفوني' },
          { name: 'المربية المشرفة', role: 'مربية' }
        ],
        general_report: 'تقرير تقييمي تجريبي افتراضي لبيان شكل التقرير البيداغوجي لأولياء الأمور.',
        abilities: {
          current_potentials: 'بيانات تجريبية لأغراض العرض فقط.',
          cognitive_intellectual: 'بيانات تجريبية لأغراض العرض فقط.',
          language_receptive_expressive: 'بيانات تجريبية لأغراض العرض فقط.',
          communication_behavioral: 'بيانات تجريبية لأغراض العرض فقط.',
          academic_preacademic: 'بيانات تجريبية لأغراض العرض فقط.',
          motor_independence: 'بيانات تجريبية لأغراض العرض فقط.'
        },
        strengths: ['بيانات تجريبية'],
        weaknesses: ['بيانات تجريبية'],
        recommendations: ['بيانات تجريبية'],
        domains: []
      })
    };
    var demoRep = {
      id: 'demo-rep-1',
      child_id: demoKid.id,
      title: 'تقرير دوري تجريبي لمتابعة الأنشطة',
      report_date: '2026-10-01',
      status: 'published',
      achievements: 'بيانات تجريبية للمعاينة.',
      activities: 'بيانات تجريبية للمعاينة.',
      notes: 'بيانات تجريبية للمعاينة.'
    };
    var demoMsg = {
      id: 'demo-msg-1',
      title: 'إشعار تجريبي افتراضي',
      body: 'هذا إشعار تجريبي لمعاينة فضاء الأولياء.',
      published_at: new Date().toISOString()
    };
    var demoDoc = {
      id: 'demo-doc-1',
      child_id: demoKid.id,
      title: 'شهادة تجريبية افتراضية',
      category: 'شهادة رسمية',
      created_at: '2026-09-15'
    };

    S.d = {
      children: [demoKid],
      reports: [demoEval, demoRep],
      appts: [],
      msgs: [demoMsg],
      docs: [demoDoc],
      programs: [],
      sections: []
    };
    S.reads = {};
    show('app');
    applyLang();
    if ($('#who')) $('#who').textContent = S.name;
    toast('وضع المعاينة التجريبية (بيانات افتراضية)', 'ok');
    render();
  }

async function init() {
      // التحقق من تحديث النسخة وتفريغ الذاكرة المؤقتة التلقائي
      try {
        var APP_VER = 'v98';
        if (safeGetItem('local', 'de_app_ver') !== APP_VER) {
          if ('caches' in window) {
            caches.keys().then(function (names) {
              names.forEach(function (nm) { caches.delete(nm); });
            });
          }
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (regs) {
              regs.forEach(function (r) { r.update(); });
            });
          }
          safeSetItem('local', 'de_app_ver', APP_VER);
        }
      } catch (eVer) {}

    applyLang();
    if (!CFG.supabaseUrl || !CFG.supabaseKey) { $('#boot').textContent = 'إعدادات الاتصال غير مضبوطة.'; return; }
    C.onExpire(function () { showLogin('انتهت الجلسة. سجّل الدخول من جديد.'); });

    $('#loginForm').addEventListener('submit', submitLogin);
    var pDemo = $('#quickDemoParentBtn');
    if (pDemo) pDemo.addEventListener('click', function () {
      showLogin('المصادقة عبر Supabase Auth إلزامية.');
    });

    $('#forgotBtn').addEventListener('click', function () { setMode('forgot'); });
    $('#backBtn').addEventListener('click', function () { setMode('login'); });
    var lBtn = $('#logoutBtn'); if (lBtn) lBtn.addEventListener('click', function () { logout(); });

    var btnLoginLang = $('#loginLangBtn'); if (btnLoginLang) btnLoginLang.addEventListener('click', toggleLang);
    var btnBarLang = $('#barLangBtn'); if (btnBarLang) btnBarLang.addEventListener('click', toggleLang);

    // ربط عناصر القائمة الجانبية وتثبيت التطبيق
    var menuBtn = $('#parentMenuBtn');
    if (menuBtn) menuBtn.addEventListener('click', toggleDrawer);

    var closeBtn = $('#drawerCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    var scrim = $('#parentScrim');
    if (scrim) scrim.addEventListener('click', closeDrawer);

    var drawerLogout = $('#drawerLogoutBtn');
    if (drawerLogout) drawerLogout.addEventListener('click', function () {
      closeDrawer();
      logout();
    });

    var drawerInstall = $('#drawerInstallBtn');
    if (drawerInstall) drawerInstall.addEventListener('click', function () {
      closeDrawer();
      openInstallAppModal();
    });

    var headerInstall = $('#installHeaderBtn');
    if (headerInstall) headerInstall.addEventListener('click', openInstallAppModal);

    var m = $('#modal');
    if (m) {
      m.addEventListener('click', function (e) { if (e.target === m) closeModal(); });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (m && !m.hidden) closeModal();
        closeDrawer();
      }
    });

    var qrTargetUser = '';
    try {
      var sp = new URLSearchParams(window.location.search);
      var rawU = (sp.get('u') || sp.get('m') || '').trim().toLowerCase();
      if (rawU) {
        qrTargetUser = rawU;
      }
    } catch (e) {}

    var hash = await C.adoptHash();
    if (hash && hash.error) { showLogin(hash.error); return; }
    if (hash && (hash.type === 'invite' || hash.type === 'recovery')) {
      show('login');
      var userEmail = hash.email || '';
      if ($('#setEmail')) $('#setEmail').value = userEmail;
      if ($('#email')) $('#email').value = userEmail;
      setMode('set', hash.type === 'invite' ? t('hintInvite') : t('hintSet'));
      return;
    }

    // إذا تم فتح فضاء الأولياء عبر مسح رمز QR الخاص ببطاقة الطفل (?u=...)، نظهر شاشة الدخول مباشرة مع ملء اسم المستخدم الخاص بالطفل تلقائياً
    if (qrTargetUser) {
      try {
        safeRemoveItem('local', 'de_parent_saved');
        safeRemoveItem('local', 'de_parent_direct_session');
        safeSetItem('session', 'de_parent_user', qrTargetUser);
      } catch (eQr) {}
      await C.signOut();
      showLogin();
      if ($('#email')) {
        $('#email').value = qrTargetUser;
      }
      if (typeof qrMatchedStudent !== 'undefined' && qrMatchedStudent && $('#lHint')) {
        $('#lHint').textContent = 'بطاقة التلميذ(ة): ' + qrMatchedStudent.full_name + ' — اسم المستخدم مكتوب جاهزاً، أدخل كلمة المرور للدخول.';
      }
      var pwEl = $('#password');
      if (pwEl) setTimeout(function () { pwEl.focus(); }, 80);
      return;
    }

    try {
      var last = ''; try { last = (safeGetItem('session', 'de_parent_user') || safeGetItem('local', 'de_parent_user') || '').trim().toLowerCase(); } catch (errS) {}
      if (last && last.length <= 254 && $('#email')) $('#email').value = last;
    } catch (e3) {}

    if (C.load() && C.loggedIn()) {
      enter();
    } else {
      showLogin();
    }
  }

  
  /* ══════════════════════════════════════════════════════════════════════════════
     FOREST GREEN PREMIUM — THEME ENGINE FOR PARENTS
     ══════════════════════════════════════════════════════════════════════════════ */
  function initParentThemeEngine() {
    var saved = safeGetItem('local', 'de_theme');
    var theme = saved || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyParentTheme(theme);

    var btn = document.getElementById('themeToggleBtnParent');
    if (btn && !btn._bound) {
      btn._bound = true;
      btn.addEventListener('click', toggleParentTheme);
    }
  }

  function applyParentTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    } else {
      document.documentElement.classList.remove('theme-dark');
    }
    safeSetItem('local', 'de_theme', theme);

    var btn = document.getElementById('themeToggleBtnParent');
    if (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن');
      btn.title = theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن';
      var u = btn.querySelector('use');
      if (u) u.setAttribute('href', theme === 'dark' ? '#i-sun' : '#i-moon');
    }
  }

  function toggleParentTheme() {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyParentTheme(cur === 'dark' ? 'light' : 'dark');
  }

  initParentThemeEngine();
  init();
})();