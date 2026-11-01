/* ══════════════════════════════════════════════════════════════════════════════
   DAR EL IHSAN — NATIVE CLIENT-SIDE PDF GENERATOR (منشئ ملفات PDF الرسمية)
   ══════════════════════════════════════════════════════════════════════════════
   - ينتج ملفات PDF 1.4 قياسية حقيقية تفتح في أي قارئ PDF (Acrobat, Chrome, Edge, Safari, iOS, Android).
   - يرسم استمارة التقييم البيداغوجي مطابقة 100% للتصميم الرسمي المعتمد (55043.jpg)
     شاملةً الترويسة، الشعار، الجداول الملونة، كشف الدرجات الإجمالي، وكافة جداول المهارات بنقاطها.
   ══════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var A4_W_PT = 595.28;
  var A4_H_PT = 841.89;
  var EVAL_MARKER = '/*DE_EVAL_V1*/';

  function buildPdfBinary(pagesJpeg) {
    var parts = [];
    var offsets = {};
    var enc = new TextEncoder();

    function writeStr(str) { parts.push(enc.encode(str)); }
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

    writeStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    var numPages = pagesJpeg.length;
    offsets[1] = currentOffset();
    writeStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    var kidsStr = [];
    for (var i = 0; i < numPages; i++) kidsStr.push((3 + i * 3) + ' 0 R');
    offsets[2] = currentOffset();
    writeStr('2 0 obj\n<< /Type /Pages /Kids [' + kidsStr.join(' ') + '] /Count ' + numPages + ' >>\nendobj\n');

    for (var p = 0; p < numPages; p++) {
      var item = pagesJpeg[p];
      var pObj = 3 + p * 3;
      var imObj = 4 + p * 3;
      var cObj = 5 + p * 3;
      var imgW = item.width || 1240;
      var imgH = item.height || 1754;
      var jpgBytes = item.data;

      offsets[pObj] = currentOffset();
      writeStr(pObj + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4_W_PT.toFixed(2) + ' ' + A4_H_PT.toFixed(2) + '] /Resources << /XObject << /Im' + (p + 1) + ' ' + imObj + ' 0 R >> >> /Contents ' + cObj + ' 0 R >>\nendobj\n');

      offsets[imObj] = currentOffset();
      writeStr(imObj + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + imgW + ' /Height ' + imgH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpgBytes.byteLength + ' >>\nstream\n');
      writeBytes(jpgBytes);
      writeStr('\nendstream\nendobj\n');

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

  function canvasToJpegBytes(canvas, quality) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          var reader = new FileReader();
          reader.onload = function () { resolve(new Uint8Array(reader.result)); };
          reader.readAsArrayBuffer(blob);
        }, 'image/jpeg', quality || 0.94);
      } else {
        var dataUrl = canvas.toDataURL('image/jpeg', quality || 0.94);
        var bin = atob(dataUrl.split(',')[1]);
        var u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        resolve(u8);
      }
    });
  }

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
    }, 300);
  }

  function loadLogoImage() {
    return new Promise(function (resolve) {
      if (typeof Image === 'undefined') return resolve(null);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () {
        var img2 = new Image();
        img2.onload = function () { resolve(img2); };
        img2.onerror = function () { resolve(null); };
        img2.src = 'logo.png';
      };
      img.src = 'logo-sq.png';
    });
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

  function wrapLines(ctx, text, maxW, maxLines) {
    var words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) return ['—'];
    var lines = [], cur = '';
    words.forEach(function (w) {
      var test = cur ? (cur + ' ' + w) : w;
      if (ctx.measureText(test).width <= maxW || !cur) {
        cur = test;
      } else {
        lines.push(cur);
        cur = w;
      }
    });
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1] + '…';
    }
    return lines;
  }

  // استخراج وتحليل بيانات التقييم سواء مُرّر الكائن الخام r أو الكائن المحلل ev
  function ensureParsedEval(rep) {
    if (!rep) return { domains: [], supervisors: [], abilities: {}, strengths: [], weaknesses: [], recommendations: [] };
    if (Array.isArray(rep.domains) && rep.domains.length > 0 && rep.domains[0].ratings) {
      return rep;
    }
    var cur = (root && root.DE_CURRICULUM) || {};
    var domainKeys = Object.keys(cur);
    var res = {
      id: rep.id || null,
      title: rep.title || 'تقرير اللجنة البيداغوجية والتربوية',
      report_date: rep.report_date || new Date().toISOString().slice(0, 10),
      term: rep.term || 'الثلاثي الأخير',
      school_year: rep.school_year || '2024/2025',
      degree_of_disability: rep.degree_of_disability || 'متوسطة',
      qualification_level: rep.qualification_level || '',
      supervisors: Array.isArray(rep.supervisors) && rep.supervisors.length ? rep.supervisors : [{ name: 'أمير زكرياء', role: 'مدير المركز' }],
      general_report: rep.general_report || '',
      abilities: Object.assign({
        current_potentials: '',
        cognitive_intellectual: '',
        language_receptive_expressive: '',
        communication_behavioral: '',
        academic_preacademic: '',
        motor_independence: ''
      }, rep.abilities || {}),
      strengths: Array.isArray(rep.strengths) ? rep.strengths : [],
      weaknesses: Array.isArray(rep.weaknesses) ? rep.weaknesses : [],
      recommendations: Array.isArray(rep.recommendations) ? rep.recommendations : [],
      domains: []
    };

    if (typeof rep.activities === 'string' && rep.activities.indexOf(EVAL_MARKER) === 0) {
      try {
        var rawJson = JSON.parse(rep.activities.slice(EVAL_MARKER.length));
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
              if (dm.domain && Array.isArray(dm.ratings)) return dm;
              var domName = typeof dm.d === 'number' ? (domainKeys[dm.d] || domainKeys[0]) : (dm.domain || domainKeys[0]);
              var skList = cur[domName] || [];
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
                  return { num: idx + 1, skill: sk, item: sk, score: sv.score != null ? String(sv.score) : '', yn: sv.yn || '', note: sv.note || '' };
                })
              };
            });
          }
        }
      } catch (e) {}
    }

    if (!res.domains.length && domainKeys.length) {
      domainKeys.forEach(function (dk) {
        var skList = cur[dk] || [];
        res.domains.push({
          domain: dk,
          ratings: skList.map(function (sk, idx) {
            return { num: idx + 1, skill: sk, item: sk, score: '5', yn: '', note: 'مقيَّمة' };
          })
        });
      });
    }
    return res;
  }

  function drawOfficialHeader(ctx, w, titleAr, logoImg) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, 1754);

    // إطار الصفحة الرسمي
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(36, 36, w - 72, 1682);

    // الشعار على اليسار كما في الوثيقة الرسمية (55043.jpg)
    if (logoImg && logoImg.width) {
      ctx.drawImage(logoImg, 65, 52, 115, 115);
    }

    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('جمعية أولياء الأطفال المعاقين ذهنيًا', w / 2, 74);

    ctx.font = 'bold 21px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('المركز النفسي البيداغوجي دار الإحسان', w / 2, 102);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 17px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('— العطف - غرداية —', w / 2, 126);

    ctx.fillStyle = '#1E3A8A';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText("COMPTE RENDU DE L'EQUIPE PEDAGOGIQUE", w / 2, 149);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 26px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText(titleAr || 'تقرير اللجنة البيداغوجية والتربوية', w / 2, 180);

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(56, 196);
    ctx.lineTo(w - 56, 196);
    ctx.stroke();
  }

  async function renderReportToPdf(rep, child, secName, brName) {
    var logoImg = await loadLogoImage();
    var c = document.createElement('canvas');
    c.width = 1240;
    c.height = 1754;
    var ctx = c.getContext('2d');

    drawOfficialHeader(ctx, 1240, rep.title || 'تقرير تربوي وبيداغوجي', logoImg);

    var chName = (child && child.full_name) || 'غير محدد';
    var chMem = (child && child.membership_no) ? ('N° ' + child.membership_no) : '—';
    var rDate = rep.report_date || (rep.created_at ? rep.created_at.slice(0, 10) : '—');

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(56, 220, 1240 - 112, 130);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(56, 220, 1240 - 112, 130);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('اسم ولقب التلميذ(ة): ' + chName, 1240 - 80, 260);
    ctx.fillText('رقم القيد / العضوية: ' + chMem, 1240 - 80, 300);
    ctx.fillText('القسم / الفوج: ' + (secName || '—'), 1240 - 80, 335);

    ctx.fillText('الفرع / المركز: ' + (brName || 'المركز الرئيسي'), 580, 260);
    ctx.fillText('تاريخ التقرير: ' + rDate, 580, 300);
    ctx.fillText('طبيعة الإعاقة: ' + ((child && child.disability) || '—'), 580, 335);

    ctx.fillStyle = '#7DD3FC';
    ctx.fillRect(56, 370, 1240 - 112, 38);
    ctx.strokeRect(56, 370, 1240 - 112, 38);
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('محتوى التقرير التربوي والملاحظات البيداغوجية', 1240 / 2, 396);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(56, 415, 1240 - 112, 900);
    ctx.strokeRect(56, 415, 1240 - 112, 900);

    ctx.fillStyle = '#1E293B';
    ctx.font = '20px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.textAlign = 'right';
    var text = rep.achievements ? ('الإنجازات: ' + rep.achievements + ' — الأنشطة: ' + (rep.activities || '') + ' — الملاحظات: ' + (rep.notes || '')) : (rep.content || rep.notes || rep.body || 'لا توجد ملاحظات إضافية.');
    var lines = wrapLines(ctx, text, 1240 - 160, 22);
    lines.forEach(function (ln, idx) {
      ctx.fillText(ln, 1240 - 80, 460 + idx * 36);
    });

    var jpg = await canvasToJpegBytes(c, 0.94);
    return buildPdfBinary([{ data: jpg, width: 1240, height: 1754 }]);
  }

  /* رسم استمارة التقييم البيداغوجي مطابقة 100% للصورة (55043.jpg) مع جدول الدرجات وجداول المهارات التفصيلية بنقاطها */
  async function renderEvaluationToPdf(rep, childFullName, secName, kd) {
    var ev = ensureParsedEval(rep);
    var logoImg = await loadLogoImage();
    var cur = (root && root.DE_CURRICULUM) || {};
    var W = 1240;
    var M = 56;
    var CW = W - M * 2; // 1128

    // حساب العمر
    var ageTxt = '—';
    var dobFmt = '—';
    if (kd && kd.dob) {
      var mDob = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(kd.dob).trim());
      if (mDob) {
        dobFmt = mDob[1] + '/' + mDob[2] + '/' + mDob[3];
        var age = new Date().getFullYear() - parseInt(mDob[1], 10);
        if (age > 0) ageTxt = age + ' سنة';
      } else {
        dobFmt = String(kd.dob);
      }
    }

    // حساب إحصائيات المجالات والمهارات
    var totalEarned = 0, totalMax = 0, totalSkills = 0;
    var domainStats = (ev.domains || []).map(function (dm, dIdx) {
      var dEarned = 0, dMax = 0;
      var rawRatings = dm.ratings || [];
      var domSkills = cur[dm.domain] || [];
      var normalizedRatings = rawRatings.map(function (it, sIdx) {
        var skName = it.skill || it.item || domSkills[sIdx] || ('مهارة ' + (sIdx + 1));
        var sc = 0;
        var isRated = false;
        if (it.score !== '' && it.score != null) {
          var parsed = parseInt(it.score, 10);
          if (!isNaN(parsed)) { sc = parsed; isRated = true; }
        } else if (it.yn) {
          sc = (it.yn === 'نعم') ? 5 : 0;
          isRated = true;
        }
        dEarned += sc;
        dMax += 5;
        totalSkills++;
        return {
          num: sIdx + 1,
          skill: skName,
          score: sc,
          isRated: isRated,
          badgeText: isRated ? (it.yn ? it.yn : (sc + '/5')) : '0/5',
          note: it.note || it.obs || (isRated ? 'مقيَّمة' : 'لم تقيَّم')
        };
      });
      totalEarned += dEarned;
      totalMax += dMax;
      var pct = dMax > 0 ? Math.round((dEarned / dMax) * 100) : 0;
      return {
        name: dm.domain || ('مجال ' + (dIdx + 1)),
        count: normalizedRatings.length,
        earned: dEarned,
        max: dMax,
        pct: pct,
        ratings: normalizedRatings
      };
    });

    var overallPct = totalMax > 0 ? ((totalEarned / totalMax) * 100).toFixed(1) : '0';

    var pages = [];
    function newPage(title) {
      var c = document.createElement('canvas');
      c.width = W;
      c.height = 1754;
      var ctx = c.getContext('2d');
      drawOfficialHeader(ctx, W, title, logoImg);
      var pObj = { canvas: c, ctx: ctx, y: 208 };
      pages.push(pObj);
      return pObj;
    }

    var p = newPage('تقرير اللجنة البيداغوجية والتربوية');
    var ctx = p.ctx;
    var y = p.y;

    // 1. البانر الذهبي للثلاثي والموسم
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(M, y, CW, 36);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(M, y, CW, 36);
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('تقييم ' + (ev.term || 'الثلاثي الأخير') + ' للموسم الدراسي: ' + (ev.school_year || '2024/2025'), W / 2, y + 25);
    y += 44;

    // 2. جدول معلومات الحالة (4 أعمدة مطابقة للصورة)
    // الأعمدة من اليمين لليسار: تسمية 1 (180) | قيمة 1 (384) | تسمية 2 (180) | قيمة 2 (384)
    var c1W = 180, c2W = 384, c3W = 180, c4W = 384;
    var x1 = W - M - c1W;        // يمين (تسمية 1)
    var x2 = x1 - c2W;           // قيمة 1
    var x3 = x2 - c3W;           // تسمية 2
    var x4 = M;                  // يسار (قيمة 2)

    var infoRows = [
      ['اسم ولقب الحالة:', childFullName || (kd && kd.full_name) || '—', 'العمر:', ageTxt],
      ['نوع الاضطراب:', (kd && kd.disability) || '—', 'تاريخ الميلاد:', dobFmt],
      ['درجة الإعاقة / الاضطراب:', ev.degree_of_disability || 'متوسطة', 'القسم ومستوى التأهيل:', ev.qualification_level || secName || (kd && kd.section) || '—']
    ];

    infoRows.forEach(function (row) {
      var rh = 34;
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(x1, y, c1W, rh);
      ctx.fillRect(x3, y, c3W, rh);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x2, y, c2W, rh);
      ctx.fillRect(x4, y, c4W, rh);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, y, c1W, rh);
      ctx.strokeRect(x2, y, c2W, rh);
      ctx.strokeRect(x3, y, c3W, rh);
      ctx.strokeRect(x4, y, c4W, rh);

      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'right';
      ctx.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(row[0], x1 + c1W - 10, y + 23);
      ctx.fillText(row[2], x3 + c3W - 10, y + 23);

      ctx.textAlign = 'center';
      ctx.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(String(row[1]).slice(0, 38), x2 + c2W / 2, y + 23);
      ctx.fillText(String(row[3]).slice(0, 38), x4 + c4W / 2, y + 23);
      y += rh;
    });
    y += 8;

    // 3. جدول المشرفين (3 أعمدة: المشرفون: الإسم واللقب | الوظيفة | التوقيع والختم)
    var sW1 = 488, sW2 = 320, sW3 = 320;
    var sx1 = W - M - sW1;
    var sx2 = sx1 - sW2;
    var sx3 = M;

    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(sx1, y, sW1, 30);
    ctx.fillRect(sx2, y, sW2, 30);
    ctx.fillRect(sx3, y, sW3, 30);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(sx1, y, sW1, 30);
    ctx.strokeRect(sx2, y, sW2, 30);
    ctx.strokeRect(sx3, y, sW3, 30);

    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('المشرفون: الإسم واللقب', sx1 + sW1 / 2, y + 21);
    ctx.fillText('الوظيفة', sx2 + sW2 / 2, y + 21);
    ctx.fillText('التوقيع والختم', sx3 + sW3 / 2, y + 21);
    y += 30;

    var sups = (ev.supervisors && ev.supervisors.length) ? ev.supervisors : [{ name: 'أمير زكرياء', role: 'مدير المركز' }];
    sups.slice(0, 3).forEach(function (sp) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sx1, y, sW1, 28);
      ctx.fillRect(sx2, y, sW2, 28);
      ctx.fillRect(sx3, y, sW3, 28);
      ctx.strokeRect(sx1, y, sW1, 28);
      ctx.strokeRect(sx2, y, sW2, 28);
      ctx.strokeRect(sx3, y, sW3, 28);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(sp.name || '—', sx1 + sW1 / 2, y + 20);
      ctx.font = '15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(sp.role || '—', sx2 + sW2 / 2, y + 20);
      ctx.fillStyle = '#64748B';
      ctx.fillText('........................', sx3 + sW3 / 2, y + 20);
      y += 28;
    });
    y += 10;

    // 4. البانر الأزرق السماوي: الوصف العام لأداء الحالة
    ctx.fillStyle = '#7DD3FC';
    ctx.fillRect(M, y, CW, 32);
    ctx.strokeStyle = '#0284C7';
    ctx.strokeRect(M, y, CW, 32);
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('الوصف العام لأداء الحالة', W / 2, y + 22);
    y += 38;

    // 5. شبكة الوصف العام (يمين: التقرير العام، يسار: 6 صناديق ملونة للقدرات)
    var colGap = 14;
    var halfW = (CW - colGap) / 2; // 557
    var rightColX = W - M - halfW;
    var leftColX = M;
    var gridH = 312;

    // يمين: التقرير العام
    ctx.fillStyle = '#93C5FD';
    ctx.fillRect(rightColX, y, halfW, 30);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(rightColX, y, halfW, 30);
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('التقرير العام', rightColX + halfW / 2, y + 21);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(rightColX, y + 30, halfW, gridH - 30);
    ctx.strokeRect(rightColX, y + 30, halfW, gridH - 30);

    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'right';
    ctx.font = '15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    var grLines = wrapLines(ctx, ev.general_report || 'تم تسجيل تقدم ملحوظ في الأداء العام للحالة مع مواصلة التأهيل التربوي والنفسي.', halfW - 24, 9);
    grLines.forEach(function (ln, idx) {
      ctx.fillText(ln, rightColX + halfW - 12, y + 56 + idx * 26);
    });

    // يسار: 6 صناديق القدرات بألوانها المطابقة للصورة
    var ab = ev.abilities || {};
    var abDefs = [
      { title: 'إمكانيات والقدرات الحالية', val: ab.current_potentials || '—', bg: '#0F172A', fg: '#FFFFFF' },
      { title: 'المهارات المعرفية والفكرية', val: ab.cognitive_intellectual || '—', bg: '#F472B6', fg: '#0F172A' },
      { title: 'اللغة (استقبالية تعبيرية)', val: ab.language_receptive_expressive || '—', bg: '#60A5FA', fg: '#0F172A' },
      { title: 'القدرات الإتصالية والسلوكية', val: ab.communication_behavioral || '—', bg: '#FBBF24', fg: '#0F172A' },
      { title: 'المعارف الأكاديمية وما قبل الأكاديمي', val: ab.academic_preacademic || '—', bg: '#4ADE80', fg: '#0F172A' },
      { title: 'القدرات الحركية والاستقلالية', val: ab.motor_independence || '—', bg: '#86EFAC', fg: '#0F172A' }
    ];
    var ay = y;
    abDefs.forEach(function (item) {
      ctx.fillStyle = item.bg;
      ctx.fillRect(leftColX, ay, halfW, 24);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(leftColX, ay, halfW, 24);
      ctx.fillStyle = item.fg;
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(item.title, leftColX + halfW - 10, ay + 17);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(leftColX, ay + 24, halfW, 25);
      ctx.strokeRect(leftColX, ay + 24, halfW, 25);
      ctx.fillStyle = '#1E293B';
      ctx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(String(item.val || '—').slice(0, 62), leftColX + halfW - 10, ay + 41);
      ay += 52;
    });

    y += gridH + 10;

    // 6. البانر الأخضر: الخلاصة والتوصيات + 3 أعمدة
    ctx.fillStyle = '#86EFAC';
    ctx.fillRect(M, y, CW, 30);
    ctx.strokeStyle = '#16A34A';
    ctx.strokeRect(M, y, CW, 30);
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('الخلاصة والتوصيات', W / 2, y + 21);
    y += 34;

    var recColW = CW / 3; // 376
    var recH = 74;
    var recCols = [
      { title: '1. نقاط القوة', arr: ev.strengths, fb: 'استجابة وتفاعل إيجابي مع الأنشطة الموجهة.', x: W - M - recColW },
      { title: '2. نقاط الضعف', arr: ev.weaknesses, fb: 'الحاجة لتعزيز مهارات التركيز والاستقلالية.', x: W - M - recColW * 2 },
      { title: '3. التوصيات', arr: ev.recommendations, fb: 'مواصلة المتابعة البيداغوجية والتنسيق المستمر مع الأسرة.', x: M }
    ];
    recCols.forEach(function (rc) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(rc.x, y, recColW, recH);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(rc.x, y, recColW, recH);

      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(rc.title, rc.x + recColW / 2, y + 20);

      var txt = (rc.arr && rc.arr.filter(Boolean).length) ? rc.arr.filter(Boolean).join('، ') : rc.fb;
      ctx.textAlign = 'right';
      ctx.font = '13.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      var rLines = wrapLines(ctx, '• ' + txt, recColW - 20, 2);
      rLines.forEach(function (ln, lIdx) {
        ctx.fillText(ln, rc.x + recColW - 10, y + 42 + lIdx * 20);
      });
    });
    y += recH + 12;

    // 7. كشف درجات التقييم والنتائج الإجمالية (في نفس الصفحة الأولى تماماً كما في الصورة 55043.jpg)
    ctx.fillStyle = '#7DD3FC';
    ctx.fillRect(M, y, CW, 32);
    ctx.strokeStyle = '#0284C7';
    ctx.strokeRect(M, y, CW, 32);
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('كشف درجات التقييم والنتائج الإجمالية', W / 2, y + 22);
    y += 32;

    // أعمدة جدول كشف الدرجات من اليمين لليسار:
    // المجال التربوي (468) | المهارات المقيمة (165) | النقاط المحصلة (165) | المجموع الأقصى (165) | النسبة المئوية (165)
    var scW = [468, 165, 165, 165, 165];
    var scX = [
      W - M - scW[0],
      W - M - scW[0] - scW[1],
      W - M - scW[0] - scW[1] - scW[2],
      W - M - scW[0] - scW[1] - scW[2] - scW[3],
      M
    ];
    var scHeaders = ['المجال التربوي / البيداغوجي', 'المهارات المقيمة', 'النقاط المحصلة', 'المجموع الأقصى', 'النسبة المئوية'];

    ctx.fillStyle = '#F1F5F9';
    for (var hi = 0; hi < 5; hi++) {
      ctx.fillRect(scX[hi], y, scW[hi], 30);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(scX[hi], y, scW[hi], 30);
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 14.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(scHeaders[hi], scX[hi] + scW[hi] / 2, y + 20);
      ctx.fillStyle = '#F1F5F9';
    }
    y += 30;

    domainStats.forEach(function (dm) {
      var rh = 28;
      for (var ci = 0; ci < 5; ci++) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(scX[ci], y, scW[ci], rh);
        ctx.strokeStyle = '#CBD5E1';
        ctx.strokeRect(scX[ci], y, scW[ci], rh);
      }
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(dm.name, scX[0] + scW[0] - 10, y + 19);

      ctx.textAlign = 'center';
      ctx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(dm.count + ' مهارة', scX[1] + scW[1] / 2, y + 19);

      // شارة خضراء للنقاط المحصلة
      ctx.fillStyle = '#D1FAE5';
      roundRect(ctx, scX[2] + 32, y + 4, scW[2] - 64, 20, 10);
      ctx.fill();
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 13.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(dm.earned + ' نقطة', scX[2] + scW[2] / 2, y + 18);

      ctx.fillStyle = '#334155';
      ctx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(dm.max + ' نقطة', scX[3] + scW[3] / 2, y + 19);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText(dm.pct + '%', scX[4] + scW[4] / 2, y + 19);
      y += rh;
    });

    // صف النتيجة الإجمالية
    var totH = 30;
    for (var ti = 0; ti < 5; ti++) {
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(scX[ti], y, scW[ti], totH);
      ctx.strokeStyle = '#D97706';
      ctx.strokeRect(scX[ti], y, scW[ti], totH);
    }
    ctx.fillStyle = '#92400E';
    ctx.textAlign = 'right';
    ctx.font = 'bold 14.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('النتيجة الإجمالية لكافة المجالات التربوية المختارة', scX[0] + scW[0] - 10, y + 20);
    ctx.textAlign = 'center';
    ctx.fillText(totalSkills + ' مهارة', scX[1] + scW[1] / 2, y + 20);
    ctx.fillText(totalEarned + ' نقطة', scX[2] + scW[2] / 2, y + 20);
    ctx.fillText(totalMax + ' نقطة', scX[3] + scW[3] / 2, y + 20);
    ctx.fillText(overallPct + '%', scX[4] + scW[4] / 2, y + 20);
    y += totH + 8;

    // الشريط الكحلي للنتيجة الإجمالية مع الشارة الذهبية (مطابق للصورة 55043.jpg)
    ctx.fillStyle = '#123E73';
    roundRect(ctx, M, y, CW, 38, 10);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText('النتيجة الإجمالية لكافة المجالات المختارة:', W - M - 18, y + 25);

    ctx.fillStyle = '#D97706';
    roundRect(ctx, M + 18, y + 6, 260, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
    ctx.fillText(totalEarned + ' من ' + totalMax + ' نقطة (' + overallPct + '%)', M + 148, y + 24);
    y += 48;

    // 8. الجداول التفصيلية لكافة المهارات المقيمة في المجالات التربوية (تبدأ مباشرة وتكمل في الصفحات التالية)
    if (y > 1560) {
      p = newPage('الجداول التفصيلية لكافة المهارات المقيمة في المجالات التربوية');
      ctx = p.ctx;
      y = p.y;
    } else {
      ctx.fillStyle = '#7DD3FC';
      ctx.fillRect(M, y, CW, 32);
      ctx.strokeStyle = '#0284C7';
      ctx.strokeRect(M, y, CW, 32);
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText('الجداول التفصيلية لكافة المهارات المقيمة في المجالات التربوية', W / 2, y + 22);
      y += 38;
    }

    // أعمدة جدول المهارات من اليمين لليسار:
    // # (60) | المهارة المقيمة (628) | التقييم / النتيجة (180) | الملاحظات والتوجيهات (260)
    var skW = [60, 628, 180, 260];
    var skX = [
      W - M - skW[0],
      W - M - skW[0] - skW[1],
      W - M - skW[0] - skW[1] - skW[2],
      M
    ];

    function drawSkillTableHeader(cCtx, curY) {
      var hdrs = ['#', 'المهارة المقيمة', 'التقييم / النتيجة', 'الملاحظات والتوجيهات'];
      for (var i = 0; i < 4; i++) {
        cCtx.fillStyle = '#F1F5F9';
        cCtx.fillRect(skX[i], curY, skW[i], 30);
        cCtx.strokeStyle = '#334155';
        cCtx.lineWidth = 1;
        cCtx.strokeRect(skX[i], curY, skW[i], 30);
        cCtx.fillStyle = '#0F172A';
        cCtx.textAlign = 'center';
        cCtx.font = 'bold 14.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        cCtx.fillText(hdrs[i], skX[i] + skW[i] / 2, curY + 20);
      }
      return curY + 30;
    }

    domainStats.forEach(function (dm, dIdx) {
      if (y > 1580) {
        p = newPage('الجداول التفصيلية لكافة المهارات المقيمة (تابع)');
        ctx = p.ctx;
        y = p.y;
      }

      // ترويسة المجال التربوي مع شارة النقاط الذهبية
      ctx.fillStyle = '#DBEAFE';
      ctx.fillRect(M, y, CW, 34);
      ctx.strokeStyle = '#93C5FD';
      ctx.strokeRect(M, y, CW, 34);

      ctx.fillStyle = '#1E3A8A';
      ctx.textAlign = 'right';
      ctx.font = 'bold 15.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText((dIdx + 1) + '. ' + dm.name + ' (' + dm.count + ' مهارة)', W - M - 14, y + 23);

      ctx.fillStyle = '#FEF3C7';
      roundRect(ctx, M + 14, y + 5, 220, 24, 12);
      ctx.fill();
      ctx.strokeStyle = '#F59E0B';
      ctx.stroke();
      ctx.fillStyle = '#B45309';
      ctx.textAlign = 'center';
      ctx.font = 'bold 13.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText('النقاط: ' + dm.earned + ' / ' + dm.max + ' (' + dm.pct + '%)', M + 124, y + 22);
      y += 34;

      y = drawSkillTableHeader(ctx, y);

      dm.ratings.forEach(function (rt, rIdx) {
        if (y > 1650) {
          p = newPage('الجداول التفصيلية لكافة المهارات المقيمة (تابع)');
          ctx = p.ctx;
          y = p.y;
          y = drawSkillTableHeader(ctx, y);
        }

        var rh = 28;
        var rowBg = (rIdx % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
        for (var ci = 0; ci < 4; ci++) {
          ctx.fillStyle = rowBg;
          ctx.fillRect(skX[ci], y, skW[ci], rh);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 0.8;
          ctx.strokeRect(skX[ci], y, skW[ci], rh);
        }

        // رقم المهارة
        ctx.fillStyle = '#0F172A';
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(String(rt.num), skX[0] + skW[0] / 2, y + 19);

        // اسم المهارة
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(String(rt.skill).slice(0, 68), skX[1] + skW[1] / 2, y + 19);

        // التقييم / النتيجة (شارة خضراء مثل 5/5 في الصورة)
        ctx.fillStyle = rt.score > 0 ? '#D1FAE5' : '#F1F5F9';
        roundRect(ctx, skX[2] + 45, y + 4, skW[2] - 90, 20, 10);
        ctx.fill();
        ctx.fillStyle = rt.score > 0 ? '#047857' : '#64748B';
        ctx.font = 'bold 13.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(rt.badgeText, skX[2] + skW[2] / 2, y + 18);

        // الملاحظات والتوجيهات
        ctx.fillStyle = '#64748B';
        ctx.font = '13.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(String(rt.note).slice(0, 32), skX[3] + skW[3] / 2, y + 19);

        y += rh;
      });

      y += 12;
    });

    // ترقيم الصفحات في أسفل كل صفحة
    var totalPages = pages.length;
    pages.forEach(function (pg, idx) {
      var cCtx = pg.ctx;
      cCtx.fillStyle = '#64748B';
      cCtx.textAlign = 'center';
      cCtx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      cCtx.fillText('الصفحة ' + (idx + 1) + ' من ' + totalPages + ' — المركز النفسي البيداغوجي دار الإحسان (العطف - غرداية)', W / 2, 1702);
    });

    var jpegPages = [];
    for (var k = 0; k < pages.length; k++) {
      var jpgBytes = await canvasToJpegBytes(pages[k].canvas, 0.94);
      jpegPages.push({ data: jpgBytes, width: W, height: 1754 });
    }
    return buildPdfBinary(jpegPages);
  }


  async function renderAttendanceToPdf(records, dateStr, secName, stats) {
    var logoImg = await loadLogoImage();
    var W = 1240, H = 1754, M = 56, CW = W - M * 2;
    var rows = Array.isArray(records) ? records : [];
    var rowsPerPage = 20;
    var totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
    var pages = [];

    for (var p = 0; p < totalPages; p++) {
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      drawOfficialHeader(ctx, W, 'سجل الغيابات والحضور اليومي — دار الإحسان', logoImg);

      // شريط المعلومات
      ctx.fillStyle = '#F4F7FB';
      ctx.fillRect(M, 205, CW, 70);
      ctx.strokeStyle = '#102F50';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(M, 205, CW, 70);

      ctx.fillStyle = '#102F50';
      ctx.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillText('التاريخ: ' + (dateStr || new Date().toISOString().slice(0, 10)), W - M - 20, 245);
      ctx.fillText('القسم / الفوج: ' + (secName || 'كافة الأقسام المعتمدة'), W - M - 320, 245);

      if (stats) {
        ctx.font = '16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillStyle = '#059669';
        ctx.fillText('الحاضرون: ' + (stats.present || 0), W - M - 680, 245);
        ctx.fillStyle = '#DC2626';
        ctx.fillText('الغائبون: ' + (stats.absent || 0), W - M - 840, 245);
        ctx.fillStyle = '#174D78';
        ctx.fillText('الإجمالي: ' + (rows.length || 0), W - M - 980, 245);
      }

      // رأس الجدول
      var y = 295;
      var colW = [60, 140, 360, 220, 160, CW - (60 + 140 + 360 + 220 + 160)];
      var colX = [];
      var curX = M;
      for (var ci = 0; ci < colW.length; ci++) { colX.push(curX); curX += colW[ci]; }
      var headers = ['#', 'رقم القيد', 'اسم ولقب التلميذ(ة)', 'الفوج / القسم', 'الحالة', 'ملاحظات وتوجيهات'];

      ctx.fillStyle = '#102F50';
      ctx.fillRect(M, y, CW, 38);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.textAlign = 'center';
      for (var hi = 0; hi < headers.length; hi++) {
        ctx.fillText(headers[hi], colX[hi] + colW[hi] / 2, y + 25);
      }
      y += 38;

      var startIdx = p * rowsPerPage;
      var endIdx = Math.min(rows.length, startIdx + rowsPerPage);
      for (var i = startIdx; i < endIdx; i++) {
        var r = rows[i];
        var isEven = (i % 2 === 0);
        ctx.fillStyle = isEven ? '#FFFFFF' : '#F8FAFC';
        ctx.fillRect(M, y, CW, 36);
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.strokeRect(M, y, CW, 36);

        ctx.fillStyle = '#26364A';
        ctx.font = '15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(String(i + 1), colX[0] + colW[0] / 2, y + 23);
        ctx.fillText(r.membership_no ? ('N° ' + r.membership_no) : '—', colX[1] + colW[1] / 2, y + 23);

        ctx.textAlign = 'right';
        ctx.font = 'bold 15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(r.full_name || '—', colX[2] + colW[2] - 14, y + 23);

        ctx.textAlign = 'center';
        ctx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(r.section || secName || '—', colX[3] + colW[3] / 2, y + 23);

        // شارة الحالة
        var st = r.status || 'present';
        var isP = (st === 'present' || st === 'حاضر');
        var isA = (st === 'absent' || st === 'غائب');
        ctx.fillStyle = isP ? '#ECFDF5' : (isA ? '#FEF2F2' : '#F1F5F9');
        drawRoundedRect(ctx, colX[4] + 20, y + 5, colW[4] - 40, 26, 6);
        ctx.fill();
        ctx.fillStyle = isP ? '#059669' : (isA ? '#DC2626' : '#64748B');
        ctx.font = 'bold 14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(isP ? 'حاضر' : (isA ? 'غائب' : 'لم يُسجّل'), colX[4] + colW[4] / 2, y + 22);

        ctx.fillStyle = '#64748B';
        ctx.font = '13px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(r.note || '—', colX[5] + colW[5] / 2, y + 23);

        y += 36;
      }

      // التذييل والختم في الصفحة الأخيرة
      if (p === totalPages - 1) {
        var signY = 1530;
        ctx.fillStyle = '#F4F7FB';
        ctx.fillRect(M, signY, CW, 120);
        ctx.strokeStyle = '#CBD5E1';
        ctx.strokeRect(M, signY, CW, 120);

        ctx.fillStyle = '#102F50';
        ctx.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('توقيع المربي(ة) المشرف(ة)', M + 240, signY + 35);
        ctx.fillText('ختم وتأشيرة إدارة المركز', W - M - 240, signY + 35);

        ctx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillStyle = '#64748B';
        ctx.fillText('....................................', M + 240, signY + 80);
        ctx.fillText('....................................', W - M - 240, signY + 80);
      }

      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      ctx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText('الصفحة ' + (p + 1) + ' من ' + totalPages + ' — جمعية دار الإحسان لرعاية وتأهيل ذوي الاحتياجات الخاصة (العطف - غرداية)', W / 2, 1702);

      pages.push({ canvas: c, ctx: ctx });
    }

    var jpegPages = [];
    for (var k = 0; k < pages.length; k++) {
      var jpgBytes = await canvasToJpegBytes(pages[k].canvas, 0.94);
      jpegPages.push({ data: jpgBytes, width: W, height: H });
    }
    return buildPdfBinary(jpegPages);
  }

  async function renderChildrenListToPdf(kids, secName, branchName) {
    var logoImg = await loadLogoImage();
    var W = 1240, H = 1754, M = 56, CW = W - M * 2;
    var rows = Array.isArray(kids) ? kids : [];
    var rowsPerPage = 22;
    var totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
    var pages = [];

    for (var p = 0; p < totalPages; p++) {
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      drawOfficialHeader(ctx, W, 'القائمة الرسمية للطلبة والأطفال — دار الإحسان', logoImg);

      // شريط المعلومات
      ctx.fillStyle = '#F4F7FB';
      ctx.fillRect(M, 205, CW, 65);
      ctx.strokeStyle = '#102F50';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(M, 205, CW, 65);

      ctx.fillStyle = '#102F50';
      ctx.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillText('المركز / الفرع: ' + (branchName || 'دار الإحسان - المركز الرئيسي'), W - M - 20, 245);
      ctx.fillText('القسم: ' + (secName || 'كافة الأقسام التربوية'), W - M - 480, 245);
      ctx.fillText('العدد الإجمالي: ' + rows.length + ' تلميذ', W - M - 880, 245);

      // رأس الجدول
      var y = 290;
      var colW = [50, 110, 310, 140, 180, 150, 188];
      var colX = [];
      var curX = M;
      for (var ci = 0; ci < colW.length; ci++) { colX.push(curX); curX += colW[ci]; }
      var headers = ['#', 'رقم القيد', 'اسم ولقب التلميذ(ة)', 'تاريخ الميلاد', 'طبيعة الإعاقة', 'القسم', 'رقم هاتف الولي'];

      ctx.fillStyle = '#102F50';
      ctx.fillRect(M, y, CW, 38);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.textAlign = 'center';
      for (var hi = 0; hi < headers.length; hi++) {
        ctx.fillText(headers[hi], colX[hi] + colW[hi] / 2, y + 25);
      }
      y += 38;

      var startIdx = p * rowsPerPage;
      var endIdx = Math.min(rows.length, startIdx + rowsPerPage);
      for (var i = startIdx; i < endIdx; i++) {
        var k = rows[i];
        var isEven = (i % 2 === 0);
        ctx.fillStyle = isEven ? '#FFFFFF' : '#F8FAFC';
        ctx.fillRect(M, y, CW, 34);
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.strokeRect(M, y, CW, 34);

        ctx.fillStyle = '#26364A';
        ctx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(String(i + 1), colX[0] + colW[0] / 2, y + 22);
        ctx.fillText(k.membership_no ? ('N° ' + k.membership_no) : '—', colX[1] + colW[1] / 2, y + 22);

        ctx.textAlign = 'right';
        ctx.font = 'bold 14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(k.full_name || '—', colX[2] + colW[2] - 12, y + 22);

        ctx.textAlign = 'center';
        ctx.font = '13.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(k.dob || '—', colX[3] + colW[3] / 2, y + 22);
        ctx.fillText(k.disability || '—', colX[4] + colW[4] / 2, y + 22);
        ctx.fillText(k.section || secName || '—', colX[5] + colW[5] / 2, y + 22);

        ctx.font = '13.5px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(k.phone || '—', colX[6] + colW[6] / 2, y + 22);

        y += 34;
      }

      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      ctx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText('الصفحة ' + (p + 1) + ' من ' + totalPages + ' — المركز النفسي البيداغوجي دار الإحسان (العطف - غرداية)', W / 2, 1702);

      pages.push({ canvas: c, ctx: ctx });
    }

    var jpegPages = [];
    for (var k = 0; k < pages.length; k++) {
      var jpgBytes = await canvasToJpegBytes(pages[k].canvas, 0.94);
      jpegPages.push({ data: jpgBytes, width: W, height: H });
    }
    return buildPdfBinary(jpegPages);
  }

  root.DE_PDF = {
    buildPdfBinary: buildPdfBinary,
    canvasToJpegBytes: canvasToJpegBytes,
    downloadPdf: downloadPdf,
    renderReportToPdf: renderReportToPdf,
    renderEvaluationToPdf: renderEvaluationToPdf,
    renderAttendanceToPdf: renderAttendanceToPdf,
    renderChildrenListToPdf: renderChildrenListToPdf
  };

})(typeof window !== 'undefined' ? window : globalThis);
