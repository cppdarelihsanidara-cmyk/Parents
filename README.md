# فضاء أولياء دار الإحسان (Dar El Ihsan Parents Portal)

بوابة أولياء الأمور المستقلة وتطبيق الويب التقدمي (PWA) لدار الإحسان.

## الميزات الرئيسية
- تسجيل دخول آمن ومستمر لأولياء الأمور مع استعادة الجلسة تلقائياً.
- متابعة بيانات الطفل، بطاقة الانخراط الرقمية، الأنشطة، والبرامج التربوية.
- الاطلاع الكامل على التقارير واستمارات التقييم البيداغوجي (مع نزع أزرار التنزيل والطباعة وفق التوجيهات الرسمية ليبقى الاطلاع على الشاشة فقط).
- دعم إشعارات الويب الحقيقية (Web Push Notifications) حتى عند إغلاق التطبيق.
- تطبيق PWA متجاوب بالكامل مع الهواتف الذكية (Android و iPhone) وشاشات الكمبيوتر.

## النشر على GitHub Pages
المشروع جاهز ومستقل للرفع على مستودع GitHub خاص به ونشره تلقائياً على GitHub Pages عبر `.github/workflows/deploy.yml`.

## التدقيق والإصلاح الأمني الشامل (Security Hardening v18.0)
- **إزالة بيانات الأطفال:** حذف مصفوفة بيانات الأطفال المضمنة (`EMBEDDED_STUDENTS`) وقصر مصدر البيانات على Supabase API بعد المصادقة.
- **إلغاء التجاوز والمصادقة المحلية:** إلغاء `verifyParentEmbeddedAuth` و `readParentDirectSession` وجعل Supabase Auth الوسيلة الحصرية لإثبات الهوية.
- **منع ثغرات IDOR:** عزل بيانات كل ولي أمر وحصر اطلاعه على أطفاله المرتبطين بحسابه عبر RLS خادمي صارم.
- **تطبيق مايغريشن RLS رقم 18:** تنفيذ `18-security-privacy-hardening-rbac-rls.sql` داخل Supabase SQL Editor.


## Security remediation package (2026-11)

- Run `npm run build` to validate JavaScript syntax and local HTML assets; this is a static-site check, not a full browser/integration test.
- The repository contains `18-security-privacy-hardening-rbac-rls.sql`. Review it against the live schema, then run it once in Supabase SQL Editor as database owner. Do not run it against production until the `children.qr_token` and `children.active` column assumptions have been confirmed.
- Set `META_WA_VERIFY_TOKEN` (or the exact environment variable used by the deployed Edge Function) in Supabase Secrets to a newly generated random value. Do not put the value in SQL, Git, HTML, or `cms-config.js`. Update the Meta webhook configuration to match.
- The public QR endpoint now uses `public_child_card_safe`, returning only membership number, name, center, and academic year. Legacy QR links using `?id=` are intentionally rejected; reissue cards using the `?c=` token.
- `cms-config.js` may contain only the public Supabase URL and publishable/anon key. Never commit `service_role`, passwords, personal child records, or real test-message logs.
- If deploying these folders as separate GitHub Pages repositories, replace cross-folder links such as `../01_Parents_Portal/parent.html` with the final HTTPS URL of the parents portal before deployment. They work as relative links only when the three folders are hosted together under one root.
- This package cannot apply migrations to your live Supabase project or deploy to GitHub without connected account access. After migration, run the role-isolation tests documented in `SECURITY-TEST-PLAN.md`.
