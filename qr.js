/* التوجيه الآمن من بطاقة التلميذ (QR) إلى فضاء الأولياء دون تسريب أي بيانات شخصية */
(function () {
  'use strict';
  var params = new URLSearchParams(window.location.search);
  var u = (params.get('u') || '').trim().toLowerCase();
  var m = (params.get('m') || '').trim();
  var id = (params.get('id') || '').trim();

  if (!u && m) {
    u = ('000' + m.replace(/\D/g, '')).slice(-3);
  } else if (!u && id) {
    var mFromId = id.match(/(\d{3})$/);
    if (mFromId) {
      u = mFromId[1];
    }
  }

  // التوجيه إلى فضاء الأولياء باسم المستخدم الممرر فقط دون أي جداول أسماء مضمنة
  var target = 'parent.html' + (u ? ('?u=' + encodeURIComponent(u)) : '');
  window.location.replace(target);
})();
