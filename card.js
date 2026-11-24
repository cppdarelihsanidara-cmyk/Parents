/* card.js — بطاقة انخراط المنخرط الرسمية (85.6 × 54 مم أفقية) بدقة 300 dpi على Canvas.
   مطابقة للتصميم الرسمي المعتمد: ترويسة وتذييل بموجات كحلي وذهبي، الشعار الأصلي أعلى اليمين
   مع علامة مائية خفيفة بالوسط، حقول مستديرة بحافة كحلي يمنى، رمز QR ديناميكي على اليسار،
   وخانة اسم المستخدم وكلمة المرور أسفل البطاقة. */
(function (root) {
  'use strict';

  var W = 1011, H = 638;
  var NAVY = '#172F50', GOLD = '#C9A449', GOLD_LIGHT = '#E6C97A', INK = '#172F50', WHITE = '#FFFFFF';
  var FONT = '"IBM Plex Sans Arabic", "Cairo", "Tajawal", "Segoe UI", Tahoma, sans-serif';

  function dateLabel(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '—';
  }

  function memberLabel(n) {
    var s = n == null ? '' : String(n).trim();
    s = s.replace(/^N°\s*/i, '').trim();
    return s || '—';
  }

  function disabilityCode(raw) {
    var s = String(raw || '').trim();
    if (!s) return '—';
    var upper = s.toUpperCase();
    if (/\bTSA\b/.test(upper) || s.indexOf('توحد') >= 0) return 'TSA';
    if (/T\.?\s*21/.test(upper) || s.indexOf('داون') >= 0) return 'T21';
    if (/R\.?\s*M\.?/.test(upper) || s.indexOf('تأخر ذهني') >= 0) return 'R.M';
    if (s.indexOf('متعدد') >= 0) return 'POLY';
    if (s.indexOf('دراسي') >= 0) return 'TD';
    return s.length <= 10 ? s : s.slice(0, 10);
  }

  function loadImage(src) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { res(null); };
      img.src = src;
    });
  }

  function fitFont(ctx, text, weight, startPx, maxW) {
    var px = startPx;
    ctx.font = weight + ' ' + px + 'px ' + FONT;
    while (ctx.measureText(text).width > maxW && px > 17) {
      px -= 1;
      ctx.font = weight + ' ' + px + 'px ' + FONT;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function roundRightTab(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  }

  function drawQr(ctx, text, x, y, box) {
    ctx.fillStyle = WHITE;
    ctx.fillRect(x, y, box, box);
    if (root.DE_QR && typeof root.DE_QR.drawToCanvas === 'function') {
      try {
        var tempCanvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
        if (tempCanvas) {
          root.DE_QR.drawToCanvas(tempCanvas, text, { size: box, margin: 4, dark: '#000000', light: '#ffffff' });
          ctx.drawImage(tempCanvas, x, y, box, box);
          return;
        }
      } catch (e1) {}
    }
    var enc = root.DEQR || (root.DE_QR && root.DE_QR.encode ? root.DE_QR : null);
    if (enc && typeof enc.encode === 'function') {
      try {
        var q = enc.encode(text), total = q.size + 8;
        var m = Math.floor(box / total), side = m * total;
        var ox = x + Math.floor((box - side) / 2), oy = y + Math.floor((box - side) / 2);
        ctx.fillStyle = '#000000';
        for (var r = 0; r < q.size; r++) for (var c = 0; c < q.size; c++) {
          if (q.dark(c, r)) ctx.fillRect(ox + (c + 4) * m, oy + (r + 4) * m, m, m);
        }
        return;
      } catch (e2) {}
    }
    ctx.fillStyle = NAVY;
    ctx.font = '700 18px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('QR', x + box / 2, y + box / 2);
  }

  function fontsReady() {
    if (typeof document === 'undefined' || !(document.fonts && document.fonts.load)) return Promise.resolve();
    return Promise.all([
      document.fonts.load('800 38px IBM Plex Sans Arabic'),
      document.fonts.load('700 24px IBM Plex Sans Arabic'),
      document.fonts.load('400 22px IBM Plex Sans Arabic')
    ]).catch(function () {});
  }

  function checkUrl(u) {
    if (!u) return 'https://cppdarelihsanidara-cmyk.github.io/Parents/parent.html';
    try {
      var x = new URL(u, (typeof window !== 'undefined' && window.location) ? window.location.href : 'https://cppdarelihsanidara-cmyk.github.io/Parents/');
      return x.href;
    } catch (e) { return String(u); }
  }

  function render(info) {
    return Promise.resolve().then(function () {
      if (!info || !info.url) throw new Error('رابط البطاقة مفقود.');
      var url = checkUrl(info.url);
      var officialTitle = 'المركز النفسي البيداغوجي دار الإحسان';
      return fontsReady().then(function () {
        return loadImage('logo-sq.png').then(function (lg) { return lg || loadImage('logo.png'); });
      }).then(function (logo) {
        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        var ctx = cv.getContext('2d');
        ctx.direction = 'rtl';
        ctx.textBaseline = 'alphabetic';

        // خلفية بيضاء مع إطار ذهبي وكحلي خارجي
        ctx.fillStyle = WHITE;
        ctx.fillRect(0, 0, W, H);

        // موجة الترويسة الذهبية ثم الكحلية
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(W, 148);
        ctx.bezierCurveTo(W * 0.72, 198, W * 0.25, 130, 0, 92);
        ctx.closePath();
        var goldGrad = ctx.createLinearGradient(0, 0, W, 160);
        goldGrad.addColorStop(0, GOLD_LIGHT);
        goldGrad.addColorStop(0.5, GOLD);
        goldGrad.addColorStop(1, '#B3882B');
        ctx.fillStyle = goldGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W, 0);
        ctx.lineTo(W, 136);
        ctx.bezierCurveTo(W * 0.72, 184, W * 0.25, 118, 0, 74);
        ctx.closePath();
        ctx.fillStyle = NAVY;
        ctx.fill();

        // موجة التذييل الذهبية ثم الكحلية
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(W, H);
        ctx.lineTo(W, H - 96);
        ctx.bezierCurveTo(W * 0.72, H - 140, W * 0.28, H - 64, 0, H - 102);
        ctx.closePath();
        ctx.fillStyle = goldGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(W, H);
        ctx.lineTo(W, H - 82);
        ctx.bezierCurveTo(W * 0.72, H - 124, W * 0.28, H - 52, 0, H - 86);
        ctx.closePath();
        ctx.fillStyle = NAVY;
        ctx.fill();

        // علامة مائية خفيفة للشعار في الوسط
        if (logo && logo.width && logo.height) {
          ctx.save();
          ctx.globalAlpha = 0.08;
          var ws = Math.min(300 / logo.width, 300 / logo.height);
          ctx.drawImage(logo, W / 2 - (logo.width * ws) / 2, H / 2 - (logo.height * ws) / 2 + 12, logo.width * ws, logo.height * ws);
          ctx.restore();
        }

        // الشعار الرسمي أعلى اليمين داخل دائرة بيضاء بإطار ذهبي دون قص أي كتابة
        var lx = W - 92, ly = 84, lr = 75;
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.arc(lx, ly, lr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 4;
        ctx.stroke();

        if (logo && logo.width && logo.height) {
          var s = Math.min((lr * 2 - 10) / logo.width, (lr * 2 - 10) / logo.height);
          ctx.save();
          ctx.beginPath();
          ctx.arc(lx, ly, lr - 4, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(logo, lx - (logo.width * s) / 2, ly - (logo.height * s) / 2, logo.width * s, logo.height * s);
          ctx.restore();
        }

        // العنوان الرسمي في الترويسة
        var titleCenterX = W / 2 - 36;
        ctx.textAlign = 'center';
        ctx.fillStyle = WHITE;
        ctx.font = '800 44px ' + FONT;
        ctx.fillText('بطاقة منخرط', titleCenterX, 66);

        ctx.fillStyle = WHITE;
        ctx.font = '700 23px ' + FONT;
        ctx.fillText(officialTitle, titleCenterX, 114);

        // خطان ذهبيان بجانب اسم المركز
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(titleCenterX - 310, 107);
        ctx.lineTo(titleCenterX - 205, 107);
        ctx.moveTo(titleCenterX + 205, 107);
        ctx.lineTo(titleCenterX + 310, 107);
        ctx.stroke();

        // رمز QR ديناميكي على اليسار
        var qx = 58, qy = 200, qb = 248;
        ctx.fillStyle = WHITE;
        roundRect(ctx, qx - 10, qy - 10, qb + 20, qb + 20, 18);
        ctx.fill();
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 3;
        roundRect(ctx, qx - 10, qy - 10, qb + 20, qb + 20, 18);
        ctx.stroke();
        drawQr(ctx, url, qx, qy, qb);

        ctx.textAlign = 'center';
        ctx.fillStyle = NAVY;
        ctx.font = '700 19px ' + FONT;
        ctx.fillText('امسح الرمز للدخول إلى فضاء الأولياء', qx + qb / 2, qy + qb + 40);

        // حقول البيانات المعتمدة على اليمين (تصميم الكبسولات باللون الكحلي والأبيض)
        var rx = W - 40, colL = 370, rowW = rx - colL;
        var rows = [
          ['رقم التسجيل:', memberLabel(info.membership_no != null ? info.membership_no : info.member_no)],
          ['الإسم واللقب:', info.full_name || '—'],
          ['تاريخ الميلاد:', dateLabel(info.dob)],
          ['نوع الإعاقة:', disabilityCode(info.disability)]
        ];
        rows.forEach(function (rw, idx) {
          var ry = 196 + idx * 78;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
          ctx.strokeStyle = NAVY;
          ctx.lineWidth = 2.2;
          roundRect(ctx, colL, ry, rowW, 60, 18);
          ctx.fill();
          ctx.stroke();

          // اللسان الكحلي على اليمين
          ctx.fillStyle = NAVY;
          roundRightTab(ctx, rx - 38, ry, 38, 60, 16);
          ctx.fill();

          ctx.textAlign = 'right';
          ctx.fillStyle = NAVY;
          ctx.font = '800 22px ' + FONT;
          ctx.fillText(rw[0], rx - 52, ry + 38);

          ctx.textAlign = 'left';
          ctx.fillStyle = INK;
          fitFont(ctx, rw[1], '800', idx === 3 ? 28 : 23, rowW - 220);
          ctx.fillText(rw[1], colL + 22, ry + 38);
        });

        // بيانات الدخول أسفل البطاقة (خانة اسم المستخدم وخانة كلمة المرور)
        var userTxt = info.username ? String(info.username) : memberLabel(info.membership_no != null ? info.membership_no : info.member_no);
        var passTxt = info.password_hint ? String(info.password_hint) : '••••••••';

        ctx.fillStyle = WHITE;
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 2;
        roundRect(ctx, W - 488, H - 72, 340, 48, 22);
        ctx.fill(); ctx.stroke();
        roundRect(ctx, 185, H - 72, 290, 48, 22);
        ctx.fill(); ctx.stroke();

        ctx.textAlign = 'right';
        ctx.fillStyle = NAVY;
        ctx.font = '800 19px ' + FONT;
        ctx.fillText('اسم المستخدم: ' + userTxt, W - 168, H - 41);
        ctx.fillText('كلمة المرور: ' + passTxt, 456, H - 41);

        // إطار خارجي مزدوج بالذهبي والكحلي
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 6;
        roundRect(ctx, 3, 3, W - 6, H - 6, 22);
        ctx.stroke();
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 2;
        roundRect(ctx, 8, 8, W - 16, H - 16, 18);
        ctx.stroke();

        return { jpeg: cv.toDataURL('image/jpeg', 0.96), url: url, width: W, height: H };
      });
    });
  }

  function download(dataUrl, filename) {
    if (typeof document === 'undefined' || !dataUrl) return false;
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || 'member-card.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  function toPdf(card) {
    if (!root.DE_PDF || typeof root.DE_PDF.fromJpeg !== 'function') throw new Error('مكوّن PDF غير محمّل.');
    return root.DE_PDF.fromJpeg(card.jpeg, card.width, card.height, { mmW: 85.6, mmH: 54 });
  }

  function printCard(cardUrl) {
    return new Promise(function (resolve, reject) {
      var w = window.open('', '_blank', 'width=520,height=380');
      if (!w) return reject(new Error('يرجى السماح بالنوافذ المنبثقة للطباعة.'));
      var doc = w.document;
      doc.open(); doc.close();
      doc.title = 'بطاقة منخرط — دار الإحسان';
      var st = doc.createElement('style');
      st.textContent = '@page{size:85.6mm 54mm;margin:0}body{margin:0;display:flex;align-items:center;justify-content:center;background:#fff}img{width:85.6mm;height:54mm;display:block}';
      doc.head.appendChild(st);
      var im = doc.createElement('img');
      im.onload = function () { setTimeout(function () { w.focus(); w.print(); resolve(true); }, 150); };
      im.onerror = function () { reject(new Error('تعذر تحميل صورة البطاقة للطباعة.')); };
      im.src = cardUrl;
      doc.body.appendChild(im);
    });
  }

  root.DECARD = { render: render, download: download, toPdf: toPdf, print: printCard, disabilityCode: disabilityCode };
})(window);
