/* ══════════════════════════════════════════════════════════════════════════════
   DAR EL IHSAN — NATIVE CLIENT-SIDE PDF GENERATOR (منشئ ملفات PDF الرسمية)
   ══════════════════════════════════════════════════════════════════════════════
   - ينتج ملفات PDF 1.4 قياسية حقيقية تفتح في أي قارئ PDF (Acrobat, Chrome, Edge, Safari, iOS, Android).
   - يدعم الصفحات المتعددة ومقاس A4 القياسي (595.28 x 841.89 pt).
   - يرسم كافة الجداول والعلامات والترويسات الرسمية بدقة عالية ومظهر رسمي أنيق.
   - لا يتطلب أي مكتبات خارجية ويعمل دون اتصال بالإنترنت.
   ══════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var A4_W_PT = 595.28;
  var A4_H_PT = 841.89;

  // بناء ملف PDF 1.4 ثنائي قياسي من مصفوفة صور JPEG
  function buildPdfBinary(pagesJpeg) {
    var parts = [];
    var offsets = {};
    var enc = new TextEncoder();

    function writeStr(str) {
      parts.push(enc.encode(str));
    }
    function writeBytes(bytes) {
      if (bytes instanceof Uint8Array) parts.push(bytes);
      else if (bytes instanceof ArrayBuffer) parts.push(new Uint8Array(bytes));
      else parts.push(enc.encode(String(bytes)));
    }
    function currentOffset() {
      var sum = 0;
      for (var i = 0; i < parts.length; i++) sum += parts[i].byteLength;
      return sum;
    }

    // Header
    writeStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    var numPages = pagesJpeg.length;
    // Obj 1: Catalog
    offsets[1] = currentOffset();
    writeStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Obj 2: Pages
    var kidsStr = [];
    for (var i = 0; i < numPages; i++) {
      kidsStr.push((3 + i * 3) + ' 0 R');
    }
    offsets[2] = currentOffset();
    writeStr('2 0 obj\n<< /Type /Pages /Kids [' + kidsStr.join(' ') + '] /Count ' + numPages + ' >>\nendobj\n');

    // Pages & Image XObjects & Content streams
    for (var p = 0; p < numPages; p++) {
      var item = pagesJpeg[p];
      var pObj = 3 + p * 3;
      var imObj = 4 + p * 3;
      var cObj = 5 + p * 3;

      var imgW = item.width || 1240;
      var imgH = item.height || 1754;
      var jpgBytes = item.data;

      // Page Object
      offsets[pObj] = currentOffset();
      writeStr(pObj + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4_W_PT.toFixed(2) + ' ' + A4_H_PT.toFixed(2) + '] /Resources << /XObject << /Im' + (p + 1) + ' ' + imObj + ' 0 R >> >> /Contents ' + cObj + ' 0 R >>\nendobj\n');

      // Image XObject
      offsets[imObj] = currentOffset();
      writeStr(imObj + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + imgW + ' /Height ' + imgH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpgBytes.byteLength + ' >>\nstream\n');
      writeBytes(jpgBytes);
      writeStr('\nendstream\nendobj\n');

      // Content stream
      var cStr = 'q\n' + A4_W_PT.toFixed(2) + ' 0 0 ' + A4_H_PT.toFixed(2) + ' 0 0 cm\n/Im' + (p + 1) + ' Do\nQ\n';
      offsets[cObj] = currentOffset();
      writeStr(cObj + ' 0 obj\n<< /Length ' + cStr.length + ' >>\nstream\n' + cStr + 'endstream\nendobj\n');
    }

    var totalObjs = 2 + numPages * 3;
    var xrefOffset = currentOffset();
    writeStr('xref\n0 ' + (totalObjs + 1) + '\n0000000000 65535 f \n');
    for (var o = 1; o <= totalObjs; o++) {
      var offStr = ('0000000000' + offsets[o]).slice(-10);
      writeStr(offStr + ' 00000 n \n');
    }

    writeStr('trailer\n<< /Size ' + (totalObjs + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n');

    var totalLen = 0;
    for (var k = 0; k < parts.length; k++) totalLen += parts[k].byteLength;
    var full = new Uint8Array(totalLen);
    var pos = 0;
    for (var j = 0; j < parts.length; j++) {
      full.set(parts[j], pos);
      pos += parts[j].byteLength;
    }
    return full;
  }

  // تحويل كانفاس إلى بايتات صورة JPEG
  function canvasToJpegBytes(canvas, quality) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          var reader = new FileReader();
          reader.onload = function () {
            resolve(new Uint8Array(reader.result));
          };
          reader.readAsArrayBuffer(blob);
        }, 'image/jpeg', quality || 0.92);
      } else {
        var dataUrl = canvas.toDataURL('image/jpeg', quality || 0.92);
        var bin = atob(dataUrl.split(',')[1]);
        var u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        resolve(u8);
      }
    });
  }

  // تنزيل ملف PDF في المتصفح مباشرة
  function downloadPdf(pdfBytes, filename) {
    var blob = new Blob([pdfBytes], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  // رسم ترويسة دار الإحسان الرسمية على الكانفاس
  function drawOfficialHeader(ctx, w, titleAr, subAr) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, 1754);

    // الإطار الخارجي الأنيق
    ctx.strokeStyle = '#123E73';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, w - 60, 1694);

    ctx.strokeStyle = '#B4873A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(36, 36, w - 72, 1682);

    // الترويسة العليا
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillStyle = '#123E73';
    ctx.font = 'bold 26px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('الجمهورية الجزائرية الديمقراطية الشعبية', w / 2, 85);

    ctx.font = 'bold 24px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('جمعية أولياء الأطفال المعاقين ذهنيًا — ولاية غرداية', w / 2, 120);

    ctx.fillStyle = '#B4873A';
    ctx.font = 'bold 28px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('المركز النفسي البيداغوجي دار الإحسان — العطف', w / 2, 160);

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(80, 185);
    ctx.lineTo(w - 80, 185);
    ctx.stroke();

    // عنوان الوثيقة الرئيسي
    if (titleAr) {
      ctx.fillStyle = '#123E73';
      ctx.fillRect(80, 205, w - 160, 50);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(titleAr, w / 2, 238);
    }
  }

  // رسم تقرير دوري رسمي وتحويله إلى بايتات PDF
  async function renderReportToPdf(rep, child, secName, brName) {
    var c = document.createElement('canvas');
    c.width = 1240;
    c.height = 1754;
    var ctx = c.getContext('2d');

    drawOfficialHeader(ctx, 1240, rep.title || 'تقرير تربوي وبيداغوجي', 'دار الإحسان');

    // بطاقة معلومات التلميذ
    var chName = (child && child.full_name) || 'غير محدد';
    var chMem = (child && child.membership_no) ? ('N° ' + child.membership_no) : '—';
    var rDate = rep.report_date || (rep.created_at ? rep.created_at.slice(0, 10) : '—');

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(80, 275, 1240 - 160, 130);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.strokeRect(80, 275, 1240 - 160, 130);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.textAlign = 'right';

    ctx.fillText('اسم ولقب التلميذ(ة): ' + chName, 1240 - 110, 315);
    ctx.fillText('رقم القيد / العضوية: ' + chMem, 1240 - 110, 355);
    ctx.fillText('القسم / الفوج: ' + (secName || '—'), 1240 - 110, 390);

    ctx.fillText('الفرع / المركز: ' + (brName || 'المركز الرئيسي'), 580, 315);
    ctx.fillText('تاريخ التقرير: ' + rDate, 580, 355);
    ctx.fillText('طبيعة الإعاقة: ' + ((child && child.disability) || '—'), 580, 390);

    // نص ومحتوى التقرير
    ctx.fillStyle = '#123E73';
    ctx.font = 'bold 22px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('نص وملاحظات التقرير:', 1240 - 100, 450);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(80, 470, 1240 - 160, 850);
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(80, 470, 1240 - 160, 850);

    ctx.fillStyle = '#1E293B';
    ctx.font = '20px "IBM Plex Sans Arabic", "Cairo", sans-serif';

    var text = rep.content || rep.notes || rep.body || 'لا توجد ملاحظات إضافية مسجلة في هذا التقرير.';
    var words = text.split(/\s+/);
    var line = '';
    var y = 515;
    var maxW = 1240 - 220;

    for (var n = 0; n < words.length; n++) {
      var testLine = line + (line ? ' ' : '') + words[n];
      var metrics = ctx.measureText(testLine);
      if (metrics.width > maxW && n > 0) {
        ctx.fillText(line, 1240 - 110, y);
        line = words[n];
        y += 34;
        if (y > 1280) break;
      } else {
        line = testLine;
      }
    }
    if (line && y <= 1280) {
      ctx.fillText(line, 1240 - 110, y);
    }

    // جدول التوقيعات والأختام
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(80, 1360, 1240 - 160, 220);
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(80, 1360, 1240 - 160, 220);

    ctx.fillStyle = '#123E73';
    ctx.font = 'bold 20px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('توقيع وختم المربية المشرفة', 320, 1400);
    ctx.fillText('توقيع وختم مدير المركز', 920, 1400);

    ctx.strokeStyle = '#94A3B8';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(180, 1530); ctx.lineTo(460, 1530);
    ctx.moveTo(780, 1530); ctx.lineTo(1060, 1530);
    ctx.stroke();
    ctx.setLineDash([]);

    // الهامش السفلي
    ctx.font = '16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('المركز النفسي البيداغوجي دار الإحسان — وثيقة إدارية رسمية — معتمدة ومؤرشفة رقمياً', 1240 / 2, 1690);

    var jpg = await canvasToJpegBytes(c, 0.92);
    return buildPdfBinary([{ data: jpg, width: 1240, height: 1754 }]);
  }

  // رسم استمارة التقييم البيداغوجي بكافة جداولها ومجالاتها التفصيلية وتحويلها إلى PDF رسمي متعدد الصفحات
  async function renderEvaluationToPdf(rep, childFullName, secName, kd) {
    var repObj = rep || {};
    var domains = repObj.domains || [];

    // حساب المجاميع الكلية لجميع المجالات
    var totalEarned = 0;
    var totalMax = 0;
    var totalSkills = 0;
    var domainStats = [];

    domains.forEach(function (dm, dIdx) {
      var dEarned = 0;
      var dMax = 0;
      var ratings = dm.ratings || [];
      ratings.forEach(function (it) {
        var sc = 0;
        if (it.score !== '' && it.score != null) {
          var parsed = parseInt(it.score, 10);
          if (!isNaN(parsed)) sc = parsed;
        } else if (it.yn) {
          if (it.yn === 'نعم') sc = 5;
        }
        dEarned += sc;
        dMax += 5;
        totalSkills++;
      });
      totalEarned += dEarned;
      totalMax += dMax;
      var pct = dMax > 0 ? Math.round((dEarned / dMax) * 100) : 0;
      domainStats.push({
        name: dm.domain || ('مجال ' + (dIdx + 1)),
        count: ratings.length,
        earned: dEarned,
        max: dMax,
        pct: pct,
        ratings: ratings
      });
    });

    var overallPct = totalMax > 0 ? ((totalEarned / totalMax) * 100).toFixed(1) : '0';

    var pagesCanvases = [];

    function createPageCanvas(headerTitle) {
      var c = document.createElement('canvas');
      c.width = 1240;
      c.height = 1754;
      var ctx = c.getContext('2d');
      drawOfficialHeader(ctx, 1240, headerTitle, 'دار الإحسان');
      return { canvas: c, ctx: ctx, y: 270 };
    }

    // ══════════════════════════════════════════════════════════════════════
    // الصفحة 1: الترويسة، معلومات الحالة، المشرفين، الوصف العام، الخلاصة والتوصيات
    // ══════════════════════════════════════════════════════════════════════
    var p1 = createPageCanvas('تقرير اللجنة البيداغوجية والتربوية (استمارة التقييم)');
    var ctx1 = p1.ctx;

    // بانر الثلاثي والموسم
    var term = repObj.term || 'الثلاثي الأخير';
    ctx1.fillStyle = '#EAB308';
    ctx1.fillRect(80, 270, 1240 - 160, 42);
    ctx1.fillStyle = '#000000';
    ctx1.font = 'bold 22px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx1.textAlign = 'center';
    ctx1.fillText('تقييم ' + term + ' للموسم الدراسي 2026-2027', 1240 / 2, 298);

    // جدول معلومات الحالة
    ctx1.fillStyle = '#FFFFFF';
    ctx1.fillRect(80, 325, 1240 - 160, 120);
    ctx1.strokeStyle = '#000000';
    ctx1.lineWidth = 1.5;
    ctx1.strokeRect(80, 325, 1240 - 160, 120);

    ctx1.textAlign = 'right';
    ctx1.fillStyle = '#000000';
    ctx1.font = 'bold 19px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx1.fillText('اسم ولقب الحالة: ' + (childFullName || '—'), 1240 - 110, 360);
    ctx1.fillText('نوع الاضطراب: ' + ((kd && kd.disability) || '—'), 1240 - 110, 395);
    ctx1.fillText('درجة الإعاقة: ' + (repObj.degree_of_disability || 'متوسطة'), 1240 - 110, 430);

    ctx1.fillText('القسم ومستوى التأهيل: ' + (secName || '—'), 580, 360);
    ctx1.fillText('تاريخ الميلاد: ' + ((kd && kd.dob) || '—'), 580, 395);
    ctx1.fillText('رقم القيد: ' + ((kd && kd.membership_no) ? ('N° ' + kd.membership_no) : '—'), 580, 430);

    // جدول المشرفين
    ctx1.fillStyle = '#123E73';
    ctx1.fillRect(80, 460, 1240 - 160, 35);
    ctx1.fillStyle = '#FFFFFF';
    ctx1.textAlign = 'center';
    ctx1.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx1.fillText('المشرفون التربويون والبيداغوجيون', 1240 / 2, 484);

    ctx1.fillStyle = '#F8FAFC';
    ctx1.fillRect(80, 495, 1240 - 160, 75);
    ctx1.strokeRect(80, 495, 1240 - 160, 75);

    ctx1.fillStyle = '#000000';
    ctx1.font = '17px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx1.fillText('أمير زكرياء — مدير المركز | التوقيع: .......................................', 1240 / 2, 525);
    ctx1.fillText('المربية المشرفة على القسم | التوقيع: .......................................', 1240 / 2, 555);

    // الوصف العام لأداء الحالة والقدرات
    ctx1.fillStyle = '#7DD3FC';
    ctx1.fillRect(80, 585, 1240 - 160, 35);
    ctx1.fillStyle = '#0C4A6E';
    ctx1.font = 'bold 19px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx1.fillText('الوصف العام لأداء الحالة والقدرات والإمكانيات', 1240 / 2, 609);

    ctx1.fillStyle = '#FFFFFF';
    ctx1.fillRect(80, 620, 1240 - 160, 350);
    ctx1.strokeRect(80, 620, 1240 - 160, 350);

    ctx1.textAlign = 'right';
    ctx1.fillStyle = '#1E293B';
    ctx1.font = '17px "IBM Plex Sans Arabic", "Cairo", sans-serif';

    var ab = repObj.abilities || {};
    var abItems = [
      '• الإمكانيات والقدرات الحالية: ' + (ab.current_potentials || 'استجابة جيدة مع التوجيه البيداغوجي.'),
      '• المهارات المعرفية والفكرية: ' + (ab.cognitive_intellectual || 'تطور ملحوظ في التمييز والتصنيف.'),
      '• اللغة والتواصل (استقبالية تعبيرية): ' + (ab.language_receptive_expressive || 'فهم الأوامر البسيطة والاستجابة بالإشارة والنطق.'),
      '• القدرات الاتصالية والسلوكية: ' + (ab.communication_behavioral || 'تفاعل إيجابي مع المربية والزملاء.'),
      '• المعارف الأكاديمية وما قبل الأكاديمي: ' + (ab.academic_preacademic || 'التعرف على الأشكال والألوان الأساسية.'),
      '• القدرات الحركية والاستقلالية: ' + (ab.motor_independence || 'استقلالية مقبولة في الأنشطة اليومية الذاتية.')
    ];
    for (var a = 0; a < abItems.length; a++) {
      ctx1.fillText(abItems[a].slice(0, 85), 1240 - 110, 655 + a * 55);
    }

    // الخلاصة والتوصيات
    ctx1.fillStyle = '#86EFAC';
    ctx1.fillRect(80, 985, 1240 - 160, 35);
    ctx1.fillStyle = '#064E3B';
    ctx1.textAlign = 'center';
    ctx1.font = 'bold 19px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx1.fillText('الخلاصة والتوصيات التربوية', 1240 / 2, 1009);

    ctx1.fillStyle = '#FFFFFF';
    ctx1.fillRect(80, 1020, 1240 - 160, 330);
    ctx1.strokeRect(80, 1020, 1240 - 160, 330);

    ctx1.textAlign = 'right';
    ctx1.fillStyle = '#065F46';
    ctx1.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx1.fillText('1. نقاط القوة:', 1240 - 110, 1055);
    ctx1.fillStyle = '#1E293B';
    ctx1.font = '17px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    var st = (repObj.strengths && repObj.strengths.length) ? repObj.strengths.join(' ، ') : 'استجابة وتفاعل إيجابي مع الأنشطة الموجهة.';
    ctx1.fillText(st.slice(0, 85), 1240 - 110, 1090);

    ctx1.fillStyle = '#991B1B';
    ctx1.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx1.fillText('2. نقاط الضعف ومجالات التحسين:', 1240 - 110, 1150);
    ctx1.fillStyle = '#1E293B';
    ctx1.font = '17px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    var wk = (repObj.weaknesses && repObj.weaknesses.length) ? repObj.weaknesses.join(' ، ') : 'الحاجة لتعزيز مهارات التركيز والاستقلالية التامة.';
    ctx1.fillText(wk.slice(0, 85), 1240 - 110, 1185);

    ctx1.fillStyle = '#1E40AF';
    ctx1.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx1.fillText('3. التوجيهات والتوصيات للأسرة:', 1240 - 110, 1245);
    ctx1.fillStyle = '#1E293B';
    ctx1.font = '17px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    var rc = (repObj.recommendations && repObj.recommendations.length) ? repObj.recommendations.join(' ، ') : 'مواصلة المتابعة البيداغوجية في البيت والتنسيق المستمر مع المركز.';
    ctx1.fillText(rc.slice(0, 85), 1240 - 110, 1280);

    // توقيعات أسفل الصفحة الأولى
    ctx1.fillStyle = '#F8FAFC';
    ctx1.fillRect(80, 1370, 1240 - 160, 220);
    ctx1.strokeRect(80, 1370, 1240 - 160, 220);

    ctx1.fillStyle = '#123E73';
    ctx1.font = 'bold 19px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx1.textAlign = 'center';
    ctx1.fillText('توقيع وختم المربية المشرفة', 320, 1420);
    ctx1.fillText('توقيع وختم مدير المركز', 920, 1420);

    pagesCanvases.push(p1);

    // ══════════════════════════════════════════════════════════════════════
    // الصفحة 2: كشف درجات التقييم والنتائج الإجمالية لكافة المجالات المختارة
    // ══════════════════════════════════════════════════════════════════════
    var p2 = createPageCanvas('كشف درجات التقييم والنتائج الإجمالية');
    var ctx2 = p2.ctx;

    ctx2.fillStyle = '#E0E7FF';
    ctx2.fillRect(80, 270, 1240 - 160, 42);
    ctx2.fillStyle = '#1E1B4B';
    ctx2.font = 'bold 22px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx2.textAlign = 'center';
    ctx2.fillText('كشف الحساب التجميعي لنتائج المجالات التربوية والبيداغوجية', 1240 / 2, 298);

    // ترويسة الجدول
    var y2 = 330;
    ctx2.fillStyle = '#1E293B';
    ctx2.fillRect(80, y2, 1240 - 160, 45);
    ctx2.fillStyle = '#FFFFFF';
    ctx2.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';

    ctx2.textAlign = 'right';
    ctx2.fillText('المجال التربوي / البيداغوجي', 1240 - 105, y2 + 28);
    ctx2.textAlign = 'center';
    ctx2.fillText('المهارات المقيمة', 620, y2 + 28);
    ctx2.fillText('النقاط المحصلة', 440, y2 + 28);
    ctx2.fillText('المجموع الأقصى', 280, y2 + 28);
    ctx2.fillText('النسبة المئوية', 150, y2 + 28);
    y2 += 45;

    // صفوف المجالات
    domainStats.forEach(function (dm, idx) {
      ctx2.fillStyle = (idx % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
      ctx2.fillRect(80, y2, 1240 - 160, 48);
      ctx2.strokeStyle = '#E2E8F0';
      ctx2.strokeRect(80, y2, 1240 - 160, 48);

      ctx2.textAlign = 'right';
      ctx2.fillStyle = '#0F172A';
      ctx2.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx2.fillText((idx + 1) + '. ' + dm.name, 1240 - 105, y2 + 30);

      ctx2.textAlign = 'center';
      ctx2.font = '17px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx2.fillText(dm.count + ' مهارة', 620, y2 + 30);

      ctx2.fillStyle = '#047857';
      ctx2.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx2.fillText(dm.earned + ' نقطة', 440, y2 + 30);

      ctx2.fillStyle = '#64748B';
      ctx2.font = '17px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx2.fillText(dm.max + ' نقطة', 280, y2 + 30);

      ctx2.fillStyle = '#1D4ED8';
      ctx2.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx2.fillText(dm.pct + '%', 150, y2 + 30);

      y2 += 48;
    });

    // صف المجموع الإجمالي
    ctx2.fillStyle = '#FEF3C7';
    ctx2.fillRect(80, y2, 1240 - 160, 52);
    ctx2.strokeStyle = '#D97706';
    ctx2.lineWidth = 1.5;
    ctx2.strokeRect(80, y2, 1240 - 160, 52);

    ctx2.textAlign = 'right';
    ctx2.fillStyle = '#92400E';
    ctx2.font = 'bold 19px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx2.fillText('النتيجة الإجمالية لكافة المجالات المختارة', 1240 - 105, y2 + 33);

    ctx2.textAlign = 'center';
    ctx2.fillText(totalSkills + ' مهارة', 620, y2 + 33);
    ctx2.fillText(totalEarned + ' نقطة', 440, y2 + 33);
    ctx2.fillText(totalMax + ' نقطة', 280, y2 + 33);
    ctx2.fillText(overallPct + '%', 150, y2 + 33);
    y2 += 70;

    // البانر الملون الكبير للنتيجة الإجمالية
    ctx2.fillStyle = '#065F46';
    ctx2.fillRect(80, y2, 1240 - 160, 85);
    ctx2.strokeStyle = '#047857';
    ctx2.lineWidth = 2;
    ctx2.strokeRect(80, y2, 1240 - 160, 85);

    ctx2.fillStyle = '#FFFFFF';
    ctx2.textAlign = 'center';
    ctx2.font = 'bold 22px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx2.fillText('النتيجة الإجمالية لكافة المجالات المختارة', 1240 / 2, y2 + 35);
    ctx2.font = 'bold 26px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx2.fillText(totalEarned + ' من أصل ' + totalMax + ' نقطة (' + overallPct + '%)', 1240 / 2, y2 + 68);
    y2 += 110;

    // توقيعات الصفحة الثانية
    ctx2.fillStyle = '#F8FAFC';
    ctx2.fillRect(80, y2, 1240 - 160, 240);
    ctx2.strokeStyle = '#CBD5E1';
    ctx2.strokeRect(80, y2, 1240 - 160, 240);

    ctx2.fillStyle = '#123E73';
    ctx2.font = 'bold 19px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx2.textAlign = 'center';
    ctx2.fillText('توقيع وختم المربية المشرفة', 320, y2 + 45);
    ctx2.fillText('توقيع وختم مدير المركز', 920, y2 + 45);

    pagesCanvases.push(p2);

    // ══════════════════════════════════════════════════════════════════════
    // الصفحات 3+: الجداول التفصيلية لكافة المهارات المقيمة في المجالات التربوية
    // ══════════════════════════════════════════════════════════════════════
    var curPage = createPageCanvas('الجداول التفصيلية لكافة المهارات المقيمة');
    pagesCanvases.push(curPage);

    domainStats.forEach(function (dm, dIdx) {
      // فحص المساحة المتبقية لعنوان المجال والترويسة
      if (curPage.y > 1420) {
        curPage = createPageCanvas('الجداول التفصيلية لكافة المهارات المقيمة (تابع)');
        pagesCanvases.push(curPage);
      }

      // عنوان المجال
      var ctxD = curPage.ctx;
      ctxD.fillStyle = '#EEF2FF';
      ctxD.fillRect(80, curPage.y, 1240 - 160, 42);
      ctxD.strokeStyle = '#C7D2FE';
      ctxD.lineWidth = 1;
      ctxD.strokeRect(80, curPage.y, 1240 - 160, 42);

      ctxD.textAlign = 'right';
      ctxD.fillStyle = '#312E81';
      ctxD.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctxD.fillText((dIdx + 1) + '. ' + dm.name + ' (' + dm.count + ' مهارة)', 1240 - 100, curPage.y + 27);

      ctxD.textAlign = 'left';
      ctxD.fillStyle = '#B45309';
      ctxD.fillText('النقاط: ' + dm.earned + ' / ' + dm.max + ' (' + dm.pct + '%)', 100, curPage.y + 27);
      curPage.y += 42;

      // ترويسة جدول المهارات
      ctxD.fillStyle = '#334155';
      ctxD.fillRect(80, curPage.y, 1240 - 160, 36);
      ctxD.fillStyle = '#FFFFFF';
      ctxD.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';

      ctxD.textAlign = 'center';
      ctxD.fillText('#', 1240 - 105, curPage.y + 24);
      ctxD.textAlign = 'right';
      ctxD.fillText('المهارة المقيمة', 1240 - 145, curPage.y + 24);
      ctxD.textAlign = 'center';
      ctxD.fillText('التقييم / النتيجة', 360, curPage.y + 24);
      ctxD.fillText('الملاحظات والتوجيهات', 190, curPage.y + 24);
      curPage.y += 36;

      // مهارات المجال
      dm.ratings.forEach(function (rt, rIdx) {
        if (curPage.y > 1620) {
          curPage = createPageCanvas('الجداول التفصيلية لكافة المهارات المقيمة (تابع)');
          pagesCanvases.push(curPage);
          ctxD = curPage.ctx;

          // إعادة رسم ترويسة الجدول في الصفحة الجديدة
          ctxD.fillStyle = '#334155';
          ctxD.fillRect(80, curPage.y, 1240 - 160, 36);
          ctxD.fillStyle = '#FFFFFF';
          ctxD.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
          ctxD.textAlign = 'center';
          ctxD.fillText('#', 1240 - 105, curPage.y + 24);
          ctxD.textAlign = 'right';
          ctxD.fillText('المهارة المقيمة (' + dm.name + ' - تابع)', 1240 - 145, curPage.y + 24);
          ctxD.textAlign = 'center';
          ctxD.fillText('التقييم / النتيجة', 360, curPage.y + 24);
          ctxD.fillText('الملاحظات والتوجيهات', 190, curPage.y + 24);
          curPage.y += 36;
        }

        ctxD.fillStyle = (rIdx % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
        ctxD.fillRect(80, curPage.y, 1240 - 160, 34);
        ctxD.strokeStyle = '#E2E8F0';
        ctxD.lineWidth = 0.8;
        ctxD.strokeRect(80, curPage.y, 1240 - 160, 34);

        // رقم المهارة
        ctxD.textAlign = 'center';
        ctxD.fillStyle = '#64748B';
        ctxD.font = 'bold 15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctxD.fillText(String(rIdx + 1), 1240 - 105, curPage.y + 23);

        // اسم المهارة
        var skillTitle = rt.skill || rt.item || ('مهارة ' + (rIdx + 1));
        ctxD.textAlign = 'right';
        ctxD.fillStyle = '#0F172A';
        ctxD.font = '15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctxD.fillText(skillTitle.slice(0, 65), 1240 - 145, curPage.y + 23);

        // النتيجة
        var scoreVal = '0 / 5';
        var hasScore = false;
        if (rt.score !== '' && rt.score != null) {
          scoreVal = rt.score + ' / 5';
          hasScore = true;
        } else if (rt.yn) {
          scoreVal = rt.yn;
          hasScore = true;
        }
        ctxD.textAlign = 'center';
        ctxD.fillStyle = hasScore ? '#047857' : '#94A3B8';
        ctxD.font = 'bold 15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctxD.fillText(scoreVal, 360, curPage.y + 23);

        // الملاحظة
        var noteTxt = rt.note || rt.obs || (hasScore ? 'مقيَّمة' : 'لم تقيَّم (درجة صفر)');
        ctxD.fillStyle = '#475569';
        ctxD.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctxD.fillText(noteTxt.slice(0, 25), 190, curPage.y + 23);

        curPage.y += 34;
      });

      curPage.y += 16;
    });

    // إضافة ترقيم الصفحات في ذيل كل صفحة
    var totalPagesCount = pagesCanvases.length;
    pagesCanvases.forEach(function (pObj, pIdx) {
      var ctxP = pObj.ctx;
      ctxP.textAlign = 'center';
      ctxP.fillStyle = '#64748B';
      ctxP.font = '16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctxP.fillText('الصفحة ' + (pIdx + 1) + ' من ' + totalPagesCount + ' — وثيقة تقييم رسمية صادرة عن دار الإحسان', 1240 / 2, 1690);
    });

    // تحويل جميع الكانفاسات إلى صور JPEG ودمجها في PDF واحد قياسي
    var jpegPages = [];
    for (var k = 0; k < pagesCanvases.length; k++) {
      var jpgBytes = await canvasToJpegBytes(pagesCanvases[k].canvas, 0.92);
      jpegPages.push({ data: jpgBytes, width: 1240, height: 1754 });
    }

    return buildPdfBinary(jpegPages);
  }

  // تصدير الكائن العام
  root.DE_PDF = {
    buildPdfBinary: buildPdfBinary,
    canvasToJpegBytes: canvasToJpegBytes,
    downloadPdf: downloadPdf,
    renderReportToPdf: renderReportToPdf,
    renderEvaluationToPdf: renderEvaluationToPdf
  };

})(typeof window !== 'undefined' ? window : global);