/* ══════════════════════════════════════════════════════════════════════════════
   DAR EL IHSAN — NATIVE CLIENT-SIDE PDF & REPORT GENERATOR (منشئ ملفات وتقارير التقييم الرسمية)
   ══════════════════════════════════════════════════════════════════════════════
   - ينتج ملفات PDF 1.4 قياسية حقيقية تفتح في أي قارئ PDF (Acrobat, Chrome, Edge, Safari, iOS, Android).
   - يدعم 3 أنماط رسمية لتقارير التقييم البيداغوجي:
     1) notes      : التقرير البيداغوجي الوصفي (تقرير الملاحظات والتوجيهات) — مضبوط في صفحة A4 واحدة.
     2) statistics : التقرير التقييمي الكمي (كشف النتائج والأداء البياني: جدول المجالات + المشرفون + الأعمدة البيانية + الدائرة النسبية) مطابق للصورة الرسمية (56725.jpg).
     3) full       : التقرير البيداغوجي الشامل (للإدارة فقط: يجمع تقرير الملاحظات + التقرير الكمي + الجداول التفصيلية لكافة المجالات والمهارات).
   - معيار اكتساب المهارة المعتمد في دار الإحسان: المهارة مكتسبة عند درجة 4/5 فما فوق (أو "نعم").
   ══════════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var A4_W_PT = 595.28;
  var A4_H_PT = 841.89;
  var EVAL_MARKER = '/*DE_EVAL_V1*/';

  var DOMAIN_SHORT_NAMES = {
    'مجال الاستقلالية (الحياة اليومية والعناية بالذات)': 'مهارات الاعتماد على الذات',
    'الرعاية الذاتية (الحياة اليومية والعناية بالذات)': 'مهارات الاعتماد على الذات',
    'مجال المهارات الحركية الدقيقة': 'الحركة الدقيقة',
    'التربية الحركية الدقيقة': 'الحركة الدقيقة',
    'مجال المهارات الحركية الكبرى': 'الحركة الكبرى',
    'التربية الحركية الكبرى': 'الحركة الكبرى',
    'مجال ما قبل الأكاديمي': 'مهارات ما قبل الأكاديمي',
    'ما قبل الأكاديمي': 'مهارات ما قبل الأكاديمي',
    'المجال الأكاديمي': 'المهارات الأكاديمية',
    'الأكاديمي': 'المهارات الأكاديمية',
    'مجال التقليد': 'التقليد والمحاكاة',
    'الإدراك الحسي': 'الإدراك الحسي والحواس',
    'مجال مهارات الحضور والانتباه': 'مهارات الحضور والانتباه',
    'التفاعل الاجتماعي': 'المهارات الاجتماعية',
    'مجال التواصل': 'التواصل واللغة',
    'النطق والتواصل وحضور والانتباه': 'اللغة والتواصل والانتباه'
  };

  var SLICE_PALETTE = [
    '#16A34A', '#2563EB', '#EA580C', '#7C3AED', '#0891B2',
    '#DB2777', '#CA8A04', '#4F46E5', '#0D9488', '#DC2626',
    '#65A30D', '#9333EA', '#0284C7', '#D97706', '#059669'
  ];

  // دالة تظليل وتفتيح الألوان لرسم الحواف والمجسم ثلاثي الأبعاد للدائرة النسبية
  function shadeHexColor(hex, factor) {
    var s = String(hex || '#16A34A').replace(/^#/, '');
    if (s.length === 3) {
      s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    }
    var num = parseInt(s, 16);
    if (isNaN(num)) return hex;
    var r = (num >> 16) & 255;
    var g = (num >> 8) & 255;
    var b = num & 255;
    if (factor < 1) {
      r = Math.max(0, Math.min(255, Math.round(r * factor)));
      g = Math.max(0, Math.min(255, Math.round(g * factor)));
      b = Math.max(0, Math.min(255, Math.round(b * factor)));
    } else {
      var boost = factor - 1;
      r = Math.max(0, Math.min(255, Math.round(r + (255 - r) * boost)));
      g = Math.max(0, Math.min(255, Math.round(g + (255 - g) * boost)));
      b = Math.max(0, Math.min(255, Math.round(b + (255 - b) * boost)));
    }
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function shortenDomainName(name) {
    var s = String(name || '').trim();
    if (DOMAIN_SHORT_NAMES[s]) return DOMAIN_SHORT_NAMES[s];
    s = s.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    return s.length > 26 ? s.slice(0, 26) : s;
  }

  function formatPctAr(val, decimals) {
    var d = decimals != null ? decimals : 1;
    var n = Number(val || 0);
    if (!isFinite(n)) n = 0;
    var fixed = n.toFixed(d).replace(/\.0+$/, '');
    return fixed;
  }

  function formatPctComma(val, decimals) {
    var d = decimals != null ? decimals : 1;
    var n = Number(val || 0);
    if (!isFinite(n)) n = 0;
    return n.toFixed(d).replace('.', ',');
  }

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
      var isLandscape = imgW > imgH;
      var pageW = isLandscape ? A4_H_PT : A4_W_PT;
      var pageH = isLandscape ? A4_W_PT : A4_H_PT;
      var jpgBytes = item.data;

      offsets[pObj] = currentOffset();
      writeStr(pObj + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageW.toFixed(2) + ' ' + pageH.toFixed(2) + '] /Resources << /XObject << /Im' + (p + 1) + ' ' + imObj + ' 0 R >> >> /Contents ' + cObj + ' 0 R >>\nendobj\n');

      offsets[imObj] = currentOffset();
      writeStr(imObj + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + imgW + ' /Height ' + imgH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpgBytes.byteLength + ' >>\nstream\n');
      writeBytes(jpgBytes);
      writeStr('\nendstream\nendobj\n');

      var cStr = 'q\n' + pageW.toFixed(2) + ' 0 0 ' + pageH.toFixed(2) + ' 0 0 cm\n/Im' + (p + 1) + ' Do\nQ\n';
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

  function drawRoundedRect(ctx, x, y, w, h, r) {
    roundRect(ctx, x, y, w, h, r);
  }

  function wrapLines(ctx, text, maxW, maxLines) {
    var cleanText = String(text || '').replace(/\r\n/g, '\n');
    var paragraphs = cleanText.split('\n');
    var lines = [];
    paragraphs.forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean);
      if (!words.length) return;
      var cur = '';
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
    });
    if (!lines.length) return ['—'];
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/[.\s…]+$/, '') + '…';
    }
    return lines;
  }

  // استخراج وتحليل بيانات التقييم سواء مُرّر الكائن الخام r أو الكائن المحلل ev
  function ensureParsedEval(rep) {
    if (!rep) return { domains: [], supervisors: [], abilities: {}, strengths: [], weaknesses: [], recommendations: [] };
    if (Array.isArray(rep.domains) && rep.domains.length > 0 && rep.domains[0].ratings && (!rep.activities || typeof rep.activities !== 'string')) {
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
      supervisors: Array.isArray(rep.supervisors) && rep.supervisors.length ? rep.supervisors : [{ name: 'إدارة المركز', role: 'مدير المركز' }],
      general_report: rep.general_report || rep.notes || '',
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
      domains: Array.isArray(rep.domains) && rep.domains.length && rep.domains[0].ratings ? rep.domains : []
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

          if (Array.isArray(rawJson.domains) && rawJson.domains.length) {
            res.domains = rawJson.domains.map(function (dm) {
              if (dm.domain && Array.isArray(dm.ratings)) {
                var baseList = cur[dm.domain] || [];
                return {
                  domain: dm.domain,
                  ratings: dm.ratings.map(function (rt, idx) {
                    var skName = (rt && (rt.skill || rt.item)) || baseList[idx] || ('مهارة ' + (idx + 1));
                    return {
                      num: idx + 1,
                      skill: skName,
                      item: skName,
                      score: (rt && rt.score != null) ? String(rt.score) : '',
                      yn: (rt && rt.yn) || '',
                      note: (rt && (rt.note || rt.obs)) || ''
                    };
                  })
                };
              }
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

  // حساب إحصائيات المجالات والمهارات وفق معيار دار الإحسان: المهارة مكتسبة عند 4/5 فما فوق
  function computeEvaluationStats(rep) {
    var ev = ensureParsedEval(rep);
    var cur = (root && root.DE_CURRICULUM) || {};
    var totalEarned = 0, totalMax = 0, totalSkills = 0, acquiredSkills = 0;

    var domainStats = (ev.domains || []).map(function (dm, dIdx) {
      var dEarned = 0, dMax = 0, dAcquired = 0;
      var rawRatings = dm.ratings || [];
      var domSkills = cur[dm.domain] || [];
      var count = rawRatings.length || domSkills.length;
      var normalizedRatings = [];

      for (var sIdx = 0; sIdx < count; sIdx++) {
        var it = rawRatings[sIdx] || {};
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
        // معيار دار الإحسان: المهارة تُحسب مكتسبة عند الدرجة 4/5 فما فوق (أو "نعم")
        var acquired = isRated && sc >= 4;
        if (acquired) {
          acquiredSkills++;
          dAcquired++;
        }
        normalizedRatings.push({
          num: sIdx + 1,
          skill: skName,
          score: sc,
          acquired: acquired,
          isRated: isRated,
          badgeText: isRated ? (it.yn ? it.yn : (sc + '/5')) : '0/5',
          statusText: acquired ? 'مكتسبة' : (isRated ? 'غير مكتسبة' : 'لم تقيَّم'),
          note: it.note || it.obs || (acquired ? 'مكتسبة (4/5 فما فوق)' : (isRated ? 'قيد الاكتساب' : 'لم تقيَّم'))
        });
      }

      totalEarned += dEarned;
      totalMax += dMax;
      // النسبة المئوية للمجال محسوبة من عدد المهارات المكتسبة مقسوماً على إجمالي مهارات المجال
      var pctNum = count > 0 ? (dAcquired / count) * 100 : 0;
      var pctRound = Math.round(pctNum * 10) / 10;
      return {
        name: dm.domain || ('مجال ' + (dIdx + 1)),
        shortName: shortenDomainName(dm.domain || ('مجال ' + (dIdx + 1))),
        count: count,
        acquired: dAcquired,
        earned: dEarned,
        max: dMax,
        pctNum: pctNum,
        pct: pctRound,
        pctFmt: formatPctAr(pctNum, 1),
        pctComma: formatPctComma(pctNum, 1),
        color: SLICE_PALETTE[dIdx % SLICE_PALETTE.length],
        ratings: normalizedRatings
      };
    });

    var overallPctNum = totalSkills > 0 ? (acquiredSkills / totalSkills) * 100 : 0;
    var overallPointsPctNum = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

    return {
      ev: ev,
      domainStats: domainStats,
      totalSkills: totalSkills,
      acquiredSkills: acquiredSkills,
      remainingSkills: Math.max(0, totalSkills - acquiredSkills),
      overallPctNum: overallPctNum,
      overallPct: formatPctAr(overallPctNum, 2),
      overallPctComma: formatPctComma(overallPctNum, 2),
      remainingPctNum: Math.max(0, 100 - overallPctNum),
      remainingPctComma: formatPctComma(Math.max(0, 100 - overallPctNum), 1),
      totalEarned: totalEarned,
      totalMax: totalMax,
      overallPointsPct: formatPctAr(overallPointsPctNum, 1)
    };
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

  // رسم شعار العلم الوطني الجزائري الدائري (مطابق لأعلى يسار الورقة في الصورة 56725.jpg)
  function drawAlgeriaFlagCircle(ctx, cx, cy, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // النصف الأيسر أخضر والنصف الأيمن أبيض (كما في الصورة 56725.jpg)
    ctx.fillStyle = '#00853F';
    ctx.fillRect(cx - r, cy - r, r, r * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx, cy - r, r, r * 2);

    // الهلال الأحمر في المنتصف
    ctx.fillStyle = '#D21034';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.50, 0, Math.PI * 2);
    ctx.fill();

    // تفريغ الهلال
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + r * 0.12, cy, r * 0.40, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#00853F';
    ctx.fillRect(cx - r, cy - r, r, r * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx, cy - r, r, r * 2);
    ctx.restore();

    // النجمة الخماسية الحمراء
    var sx = cx + r * 0.18;
    var sy = cy;
    var outerR = r * 0.22;
    var innerR = outerR * 0.38;
    ctx.fillStyle = '#D21034';
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + (i * Math.PI) / 5;
      var rad = (i % 2 === 0) ? outerR : innerR;
      var px = sx + Math.cos(ang) * rad;
      var py = sy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // إطار دائري ناعم
    ctx.save();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // رسم صفحة التقرير الكمي لنتائج التقييم مطابقة 100% للصورة المرفقة (56725.jpg)
  function drawQuantitativeEvaluationPage(ctx, W, statsObj, childFullName, secName, kd, logoImg) {
    var ev = statsObj.ev;
    var domainStats = statsObj.domainStats;
    var totalSkills = statsObj.totalSkills;
    var acquiredSkills = statsObj.acquiredSkills;
    var overallPctNum = statsObj.overallPctNum;
    var overallPctComma = statsObj.overallPctComma;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, 1754);

    // الإطار الخارجي للصفحة
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, W - 64, 1690);

    // 1. الترويسة العلوية المطابقة للصورة (56725.jpg)
    // الشعار على اليمين
    if (logoImg && logoImg.width) {
      ctx.drawImage(logoImg, W - 48 - 130, 44, 125, 125);
    }
    // العلم الجزائري الدائري على اليسار
    drawAlgeriaFlagCircle(ctx, 112, 106, 56);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 22px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('جمعية أولياء الأطفال المعاقين ذهنيًا', W / 2, 74);
    ctx.font = 'bold 21px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('المركز النفسي البيداغوجي دار الإحسان', W / 2, 106);
    ctx.font = 'bold 19px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('- العطف - غرداية -', W / 2, 136);

    ctx.fillStyle = '#1D4ED8';
    ctx.font = 'bold 23px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    var schoolYrTxt = (ev.school_year || '2024 - 2025').replace('/', ' - ');
    ctx.fillText('نتائج تقييم الأداء الحالي ' + schoolYrTxt, W / 2, 172);

    // 2. سطر بيانات الطالب (اسم ولقب الحالة | تاريخ الميلاد | فوج)
    var dobFmt = '—';
    if (kd && kd.dob) {
      var mDob = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(kd.dob).trim());
      dobFmt = mDob ? (mDob[1] + '/' + mDob[2] + '/' + mDob[3]) : String(kd.dob);
    }
    var memPrefix = (kd && kd.membership_no) ? (kd.membership_no + ' * ') : '';
    var studentFullLabel = memPrefix + (childFullName || (kd && kd.full_name) || 'تلميذ المركز');
    var groupLabel = ev.qualification_level || secName || (kd && kd.section) || 'القسم الخاص';

    var infoY = 216;
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'right';
    ctx.font = 'bold 18px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('اسم ولقب الحالة:   ' + studentFullLabel, W - 52, infoY);
    ctx.fillText('تاريخ الميلاد:   ' + dobFmt, 535, infoY);
    ctx.fillText('فوج:   ' + groupLabel, 285, infoY);

    // ══════════════════════════════════════════════════════════════════════════
    // 3. النصف العلوي والأوسط:
    //    - على اليمين: جدول المجالات وعدد المهارات المكتسبة فقط + المجموع العام
    //    - على اليسار (أعلى): جدول المشرفين (مع عمود "المشرفون" العمودي)
    //    - على اليسار (وسط): مخطط الأعمدة البيانية (برتقالي للمجال + أخضر للمكتسبة + النسب)
    // ══════════════════════════════════════════════════════════════════════════

    // أ) جدول المجالات على اليمين (عمودان فقط: المجال | عدد المهارات المكتسبة)
    var tblRightX = 796;
    var tblW = (W - 52) - tblRightX; // 392px
    var colCountW = 128;              // العمود الأيسر: عدد المهارات المكتسبة
    var colDomainW = tblW - colCountW; // العمود الأيمن: المجال (264px)
    var tblTopY = 268;
    var tblMaxBottomY = 956;

    var numDomainRows = Math.max(1, domainStats.length);
    var headerH = 34;
    var totalRowH = 38;
    var availRowsH = tblMaxBottomY - tblTopY - headerH - totalRowH;
    var domRowH = Math.min(38, Math.max(24, Math.floor(availRowsH / numDomainRows)));

    // ترويسة جدول المجالات (المجال | عدد المهارات المكتسبة)
    ctx.fillStyle = '#EEF2FF';
    ctx.fillRect(tblRightX, tblTopY, tblW, headerH);
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(tblRightX, tblTopY, colCountW, headerH);
    ctx.strokeRect(tblRightX + colCountW, tblTopY, colDomainW, headerH);

    ctx.fillStyle = '#1E1B4B';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14.5px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('المجال', tblRightX + colCountW + colDomainW / 2, tblTopY + 23);
    ctx.font = 'bold 12.5px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('عدد المهارات المكتسبة', tblRightX + colCountW / 2, tblTopY + 22);

    var curTblY = tblTopY + headerH;
    domainStats.forEach(function (dm, idx) {
      ctx.fillStyle = (idx % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
      ctx.fillRect(tblRightX, curTblY, tblW, domRowH);
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 1.1;
      ctx.strokeRect(tblRightX, curTblY, colCountW, domRowH);
      ctx.strokeRect(tblRightX + colCountW, curTblY, colDomainW, domRowH);

      var textY = curTblY + Math.round(domRowH * 0.68);
      // اسم المجال فقط
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px "Cairo", "IBM Plex Sans Arabic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(dm.shortName, tblRightX + colCountW + colDomainW / 2, textY);

      // عدد المهارات المكتسبة باللون الأحمر كما في الصورة
      ctx.fillStyle = '#DC2626';
      ctx.font = 'bold 16px "Cairo", "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(String(dm.acquired), tblRightX + colCountW / 2, textY);

      curTblY += domRowH;
    });

    // صف المجموع العام في أسفل جدول المجالات
    ctx.fillStyle = '#FFF1F2';
    ctx.fillRect(tblRightX, curTblY, tblW, totalRowH);
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tblRightX, curTblY, colCountW, totalRowH);
    ctx.strokeRect(tblRightX + colCountW, curTblY, colDomainW, totalRowH);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 18px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('المجموع العام', tblRightX + colCountW + colDomainW / 2, curTblY + 26);

    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 20px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(String(acquiredSkills), tblRightX + colCountW / 2, curTblY + 27);

    // ب) جدول المشرفين في أعلى اليسار (مطابق للصورة 56725.jpg)
    var supX = 52;
    var supTopY = 236;
    var supColSignW = 175; // الامضاء
    var supColRoleW = 185; // التخصص
    var supColNameW = 185; // اسم المشرف
    var supVertW = 60;     // عمود "المشرفون" العمودي
    var supRowH = 33;

    var supsList = (ev.supervisors && ev.supervisors.length) ? ev.supervisors.slice(0, 5) : [{ name: 'إدارة المركز', role: 'مدير المركز' }];
    var displaySupsCount = Math.max(4, supsList.length);

    // ترويسة جدول المشرفين (3 أعمدة: اسم المشرف | التخصص | الامضاء)
    var sxSign = supX;
    var sxRole = sxSign + supColSignW;
    var sxName = sxRole + supColRoleW;
    var sxVert = sxName + supColNameW;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sxSign, supTopY, supColSignW + supColRoleW + supColNameW, supRowH);
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(sxSign, supTopY, supColSignW, supRowH);
    ctx.strokeRect(sxRole, supTopY, supColRoleW, supRowH);
    ctx.strokeRect(sxName, supTopY, supColNameW, supRowH);

    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('اسم المشرف', sxName + supColNameW / 2, supTopY + 22);
    ctx.fillText('التخصص', sxRole + supColRoleW / 2, supTopY + 22);
    ctx.fillText('الامضاء', sxSign + supColSignW / 2, supTopY + 22);

    // صفوف المشرفين
    var sy = supTopY + supRowH;
    for (var si = 0; si < displaySupsCount; si++) {
      var sp = supsList[si] || { name: '', role: '' };
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sxSign, sy, supColSignW + supColRoleW + supColNameW, supRowH);
      ctx.strokeStyle = '#6366F1';
      ctx.strokeRect(sxSign, sy, supColSignW, supRowH);
      ctx.strokeRect(sxRole, sy, supColRoleW, supRowH);
      ctx.strokeRect(sxName, sy, supColNameW, supRowH);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14.5px "Cairo", "IBM Plex Sans Arabic", sans-serif';
      if (sp.name) ctx.fillText(String(sp.name).slice(0, 26), sxName + supColNameW / 2, sy + 22);
      if (sp.role) ctx.fillText(String(sp.role).slice(0, 26), sxRole + supColRoleW / 2, sy + 22);
      sy += supRowH;
    }

    // الخلية العمودية المدمجة "المشرفون" على يمين صفوف المشرفين
    var vertH = displaySupsCount * supRowH;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sxVert, supTopY + supRowH, supVertW, vertH);
    ctx.strokeStyle = '#6366F1';
    ctx.strokeRect(sxVert, supTopY + supRowH, supVertW, vertH);

    ctx.save();
    ctx.translate(sxVert + supVertW / 2 + 5, supTopY + supRowH + vertH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('المشرفون', 0, 0);
    ctx.restore();

    // ج) مخطط الأعمدة البيانية (تحت جدول المشرفين على اليسار)
    var chartTitleY = sy + 28;
    var chartCenterX = 418;
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('أعمدة بيانية تمثل نتائج تقييم الأداء الحالي للطالب ' + studentFullLabel, chartCenterX, chartTitleY);

    // وسيلة إيضاح مختصرة للأعمدة بدون أي تداخل
    var legY = chartTitleY + 22;
    ctx.font = 'bold 11.5px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.textAlign = 'right';

    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(758, legY - 10, 12, 12);
    ctx.fillStyle = '#334155';
    ctx.fillText('البرتقالي: المجال (في الأعلى إجمالي المهارات)', 752, legY);

    ctx.fillStyle = '#16A34A';
    ctx.fillRect(465, legY - 10, 12, 12);
    ctx.fillStyle = '#15803D';
    ctx.fillText('الأخضر: عدد ونسبة المهارات المكتسبة (بمعيار 4/5 فما فوق)', 459, legY);

    var plotX = 104;
    var plotY = legY + 34;
    var plotW = 670;
    var plotH = 235;

    // شبكة المحور العمودي (0%، 25%، 50%، 75%، 100%)
    var yTicks = [0, 25, 50, 75, 100];
    ctx.textAlign = 'right';
    ctx.font = 'bold 12.5px "Plus Jakarta Sans", "Cairo", sans-serif';
    yTicks.forEach(function (tk) {
      var ty = plotY + plotH - (tk / 100) * plotH;
      ctx.strokeStyle = tk === 0 ? '#64748B' : '#E2E8F0';
      ctx.lineWidth = tk === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(plotX, ty);
      ctx.lineTo(plotX + plotW, ty);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      if (tk === 100) {
        ctx.fillText('100', plotX - 10, ty + 2);
        ctx.fillText('%', plotX - 14, ty + 16);
      } else {
        ctx.fillText(tk + '%', plotX - 10, ty + 4);
      }
    });

    // بيانات الأعمدة: المجالات + عمود المجموع العام
    var barItems = domainStats.map(function (dm) {
      return {
        label: dm.shortName,
        count: dm.count,
        acquired: dm.acquired,
        pctNum: dm.pctNum,
        pctFmt: dm.pctFmt,
        isTotal: false
      };
    });
    barItems.push({
      label: 'المجموع العام',
      count: totalSkills,
      acquired: acquiredSkills,
      pctNum: overallPctNum,
      pctFmt: formatPctAr(overallPctNum, 1),
      isTotal: true
    });

    var numBars = barItems.length;
    var slotW = plotW / numBars;
    var barW = Math.min(34, Math.max(14, Math.floor(slotW * 0.62)));

    barItems.forEach(function (item, bIdx) {
      var bx = plotX + bIdx * slotW + (slotW - barW) / 2;
      var cxBar = bx + barW / 2;

      // 1. في أعلى العمود باللون الأحمر: إجمالي عدد المهارات لذلك المجال
      ctx.fillStyle = '#DC2626';
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px "Plus Jakarta Sans", "Cairo", sans-serif';
      ctx.fillText(String(item.count), cxBar, plotY - 8);

      // 2. العمود البرتقالي الكامل (يمثل المجال 100%)
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(bx, plotY, barW, plotH);
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(bx, plotY, barW, plotH);

      // 3. الشريط الأخضر في الأسفل بحسب نسبة المهارات المكتسبة في ذلك المجال
      var clampedPct = Math.max(0, Math.min(100, item.pctNum));
      var greenH = (clampedPct / 100) * plotH;
      if (item.acquired > 0 && greenH < 20) greenH = 20;

      if (item.acquired > 0) {
        var gy = plotY + plotH - greenH;
        ctx.fillStyle = item.isTotal ? '#0284C7' : '#16A34A';
        ctx.fillRect(bx, gy, barW, greenH);
        ctx.strokeStyle = item.isTotal ? '#0369A1' : '#15803D';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, gy, barW, greenH);

        // رقم المهارات المكتسبة داخل الشريط الأخضر
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px "Plus Jakarta Sans", "Cairo", sans-serif';
        ctx.fillText(String(item.acquired), cxBar, plotY + plotH - 5);
      } else {
        // عند صفر مهارات مكتسبة يظهر 0 باللون الأخضر أسفل خط القاعدة كما في الصورة 56725.jpg
        ctx.fillStyle = '#15803D';
        ctx.font = 'bold 12px "Plus Jakarta Sans", "Cairo", sans-serif';
        ctx.fillText('0', cxBar, plotY + plotH + 14);
      }

      // 4. كتابة النسبة المئوية للمجال على العمود مباشرة (حسب المهارات المكتسبة في المجال)
      ctx.save();
      var pctText = item.pctFmt + '%';
      var pctMidY = plotY + plotH * 0.45;
      ctx.translate(cxBar + 4, pctMidY);
      ctx.rotate(-Math.PI / 2);
      ctx.font = 'bold 11.5px "Plus Jakarta Sans", "Cairo", sans-serif';
      var tw = ctx.measureText(pctText).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      roundRect(ctx, -tw / 2 - 4, -11, tw + 8, 15, 4);
      ctx.fill();
      ctx.fillStyle = item.acquired > 0 ? '#15803D' : '#7C2D12';
      ctx.textAlign = 'center';
      ctx.fillText(pctText, 0, 0);
      ctx.restore();

      // 5. اسم المجال عمودياً تحت العمود وبجانبه نسبته
      ctx.save();
      ctx.translate(cxBar + 4, plotY + plotH + 22);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = item.isTotal ? '#1E3A8A' : '#0F172A';
      ctx.font = (item.isTotal ? 'bold 13px ' : 'bold 12.5px ') + '"Cairo", "IBM Plex Sans Arabic", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.label, 0, 0);
      ctx.restore();
    });

    // السطر الأحمر أسفل مخطط الأعمدة كما في الصورة 56725.jpg
    var summaryLineY = plotY + plotH + 178;
    ctx.fillStyle = '#DC2626';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText(
      'نتائج تقييم الأداء الحالي للطالب ' + studentFullLabel + ' - النسبة العامة ' + overallPctComma + ' %',
      chartCenterX,
      summaryLineY
    );

    // ══════════════════════════════════════════════════════════════════════════
    // 4. القسم السفلي: الدائرة النسبية (Donut Chart) مطابقة للصورة 56725.jpg
    //    مع تطابق النسب المئوية في الدائرة مع النسب المئوية في الأعمدة
    // ══════════════════════════════════════════════════════════════════════════
    var donutBoxX = 52;
    var donutBoxY = 982;
    var donutBoxW = W - 104;
    var donutBoxH = 665;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(donutBoxX, donutBoxY, donutBoxW, donutBoxH);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(donutBoxX, donutBoxY, donutBoxW, donutBoxH);

    // بناء شرائح الدائرة النسبية بحيث تتطابق نسب كل مجال مع نسبته في الأعمدة
    // إجمالي الدائرة = 100% (موزعة بين المجالات المكتسبة والمتبقي لبلوغ 100%)
    var activeDomains = domainStats.filter(function (d) { return d.acquired > 0; });
    var donutSlices = [];
    var sumActivePct = 0;
    activeDomains.forEach(function (d) { sumActivePct += d.pctNum; });

    // حصة المكتسب الإجمالية في الحلقة الدائرية (مع حد أدنى بصري واضح عند وجود مهارات مكتسبة)
    var visualAcquiredShare = Math.min(0.92, Math.max(overallPctNum / 100, activeDomains.length ? Math.min(0.35, activeDomains.length * 0.04) : 0));
    if (overallPctNum >= 99.9) visualAcquiredShare = 1.0;
    if (acquiredSkills === 0) visualAcquiredShare = 0;

    var startAng = -Math.PI / 2;
    var curAng = startAng;

    activeDomains.forEach(function (d) {
      var weight = sumActivePct > 0 ? (d.pctNum / sumActivePct) : (1 / activeDomains.length);
      var sweep = visualAcquiredShare * Math.PI * 2 * weight;
      donutSlices.push({
        label: d.shortName,
        pctText: d.pctComma + '% (' + d.acquired + '/' + d.count + ')',
        pctOnly: d.pctComma + '%',
        color: d.color,
        darkColor: '#1E293B',
        start: curAng,
        end: curAng + sweep,
        mid: curAng + sweep / 2,
        isRemaining: false
      });
      curAng += sweep;
    });

    if (visualAcquiredShare < 1.0) {
      var remSweep = (1 - visualAcquiredShare) * Math.PI * 2;
      donutSlices.push({
        label: 'المتبقي لبلوغ 100%',
        pctText: statsObj.remainingPctComma + '%',
        pctOnly: statsObj.remainingPctComma + '%',
        color: '#F3DCE2',
        wallBaseColor: '#C49AA7',
        rimColor: '#885E6B',
        start: curAng,
        end: curAng + remSweep,
        mid: curAng + remSweep / 2,
        isRemaining: true
      });
    }

    donutSlices.forEach(function (sl) {
      if (!sl.wallBaseColor) sl.wallBaseColor = sl.color;
      if (!sl.rimColor) sl.rimColor = shadeHexColor(sl.color, 0.44);
    });

    var dCx = W / 2;
    var dCy = donutBoxY + 258;
    var outerR = 192;
    var innerR = 100;
    var tiltY = 0.63;
    var depth3D = 38;

    // 1) ظل سفلي ناعم تحت المجسم ثلاثي الأبعاد لإبراز العمق والارتفاع
    ctx.save();
    ctx.translate(dCx, dCy + depth3D + 12);
    ctx.scale(1, tiltY);
    ctx.beginPath();
    ctx.arc(0, 0, outerR + 8, 0, Math.PI * 2, false);
    ctx.arc(0, 0, Math.max(10, innerR - 8), Math.PI * 2, 0, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
    ctx.fill();
    ctx.restore();

    // 2) بناء الجدران والحواف الجانبية ثلاثية الأبعاد (Extruded 3D Solid Walls & Colored Edges)
    //    نرسم طبقات المجسم الملساء من الأسفل (depth3D) إلى الأعلى (1) بتدرج لوني ثلاثي الأبعاد لكل شريحة بدون خطوط متداخلة
    for (var dz = depth3D; dz >= 1; dz--) {
      var progress = 1 - (dz / depth3D); // 0 في القاعدة السفلية -> 1 قرب السطح العلوي
      var wallShade = 0.56 + 0.24 * progress;
      ctx.save();
      ctx.translate(dCx, dCy + dz);
      ctx.scale(1, tiltY);
      donutSlices.forEach(function (sl) {
        ctx.beginPath();
        ctx.arc(0, 0, outerR, sl.start, sl.end, false);
        ctx.arc(0, 0, innerR, sl.end, sl.start, true);
        ctx.closePath();
        ctx.fillStyle = shadeHexColor(sl.wallBaseColor, sl.isRemaining ? (0.78 + 0.16 * progress) : wallShade);
        ctx.fill();
      });
      ctx.restore();
    }

    // 3) رسم الحافة السفلية المرئية فقط (الأمامية الخارجية + الخلفية داخل التجويف) والخطوط العمودية الفاصلة بين الشرائح
    donutSlices.forEach(function (sl) {
      // أ) القوس السفلي الخارجي (يظهر فقط في النصف الأمامي حيث sin(angle) >= 0 أي بين 0 و PI)
      var visStart = Math.max(0, Math.min(Math.PI, sl.start));
      var visEnd = Math.max(0, Math.min(Math.PI, sl.end));
      if (visEnd > visStart + 0.01) {
        ctx.save();
        ctx.translate(dCx, dCy + depth3D);
        ctx.scale(1, tiltY);
        ctx.beginPath();
        ctx.arc(0, 0, outerR, visStart, visEnd, false);
        ctx.strokeStyle = sl.rimColor;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.restore();
      }

      // ب) خطوط الحواف العمودية الأمامية والداخلية بين الشرائح لإبراز المجسم ثلاثي الأبعاد
      [sl.start, sl.end].forEach(function (ang) {
        var sinVal = Math.sin(ang);
        var cosVal = Math.cos(ang);
        if (sinVal > 0.04) {
          // حافة عمودية على الجدار الخارجي الأمامي
          var vx = dCx + cosVal * outerR;
          var vyTop = dCy + sinVal * outerR * tiltY;
          ctx.beginPath();
          ctx.moveTo(vx, vyTop);
          ctx.lineTo(vx, vyTop + depth3D);
          ctx.strokeStyle = sl.rimColor;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else if (sinVal < -0.04) {
          // حافة عمودية داخل جدار التجويف الأوسط الخلفي
          var vxIn = dCx + cosVal * innerR;
          var vyInTop = dCy + sinVal * innerR * tiltY;
          ctx.beginPath();
          ctx.moveTo(vxIn, vyInTop);
          ctx.lineTo(vxIn, vyInTop + depth3D);
          ctx.strokeStyle = sl.rimColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    });

    // 4) رسم السطح العلوي للحلقة الدائرية ثلاثية الأبعاد مع تلوين الحواف (Top Beveled 3D Ring with Colored Edges)
    ctx.save();
    ctx.translate(dCx, dCy);
    ctx.scale(1, tiltY);
    donutSlices.forEach(function (sl) {
      ctx.beginPath();
      ctx.arc(0, 0, outerR, sl.start, sl.end, false);
      ctx.arc(0, 0, innerR, sl.end, sl.start, true);
      ctx.closePath();

      // تدرج إضاءة علوي يمنح السطح مظهر المجسم المحدب
      var grad = ctx.createRadialGradient(-outerR * 0.2, -outerR * 0.2, innerR * 0.4, 0, 0, outerR);
      if (sl.isRemaining) {
        grad.addColorStop(0, '#FFF5F7');
        grad.addColorStop(0.65, '#F3DCE2');
        grad.addColorStop(1, '#E2C2CB');
      } else {
        grad.addColorStop(0, shadeHexColor(sl.color, 1.22));
        grad.addColorStop(0.55, sl.color);
        grad.addColorStop(1, shadeHexColor(sl.color, 0.86));
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // تلوين حواف كل شريحة بلون ثلاثي الأبعاد غامق ومميز من الحواف الخارجية والداخلية
      ctx.strokeStyle = sl.isRemaining ? '#9F7481' : shadeHexColor(sl.color, 0.52);
      ctx.lineWidth = 3.2;
      ctx.stroke();

      // لمعة الحافة الداخلية العلوية (3D Inner Specular Rim Highlight)
      ctx.beginPath();
      ctx.arc(0, 0, outerR - 2.2, sl.start + 0.01, sl.end - 0.01, false);
      ctx.strokeStyle = sl.isRemaining ? 'rgba(255,255,255,0.85)' : shadeHexColor(sl.color, 1.35);
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, innerR + 2.2, sl.start + 0.01, sl.end - 0.01, false);
      ctx.strokeStyle = sl.isRemaining ? '#B08592' : shadeHexColor(sl.color, 0.62);
      ctx.lineWidth = 2.0;
      ctx.stroke();
    });
    ctx.restore();

    // رسم خطوط الإشارة والتسميات والنسب المئوية المطابقة للأعمدة على يمين ويسار الدائرة
    var rightCallouts = [];
    var leftCallouts = [];
    donutSlices.forEach(function (sl) {
      if (sl.isRemaining) {
        leftCallouts.push(sl);
      } else if (Math.cos(sl.mid) >= -0.1) {
        rightCallouts.push(sl);
      } else {
        leftCallouts.push(sl);
      }
    });

    function drawCalloutList(list, isRightSide) {
      var count = list.length;
      if (!count) return;
      var minY = donutBoxY + 55;
      var maxY = donutBoxY + 465;
      var stepY = count > 1 ? Math.min(68, (maxY - minY) / (count - 1)) : 0;
      var startY = count === 1 ? (isRightSide ? donutBoxY + 70 : donutBoxY + 410) : (donutBoxY + 65);

      list.forEach(function (sl, idx) {
        var anchorX = dCx + Math.cos(sl.mid) * ((outerR + innerR) / 2);
        var anchorY = dCy + Math.sin(sl.mid) * ((outerR + innerR) / 2) * tiltY + (sl.isRemaining ? depth3D * 0.4 : 0);
        var labelY = sl.isRemaining && count === 1 ? (donutBoxY + 420) : (startY + idx * stepY);
        var edgeX = isRightSide ? (W - 76) : 76;
        var kneeX = isRightSide ? (dCx + outerR + 36) : (dCx - outerR - 36);

        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(anchorX, anchorY);
        ctx.lineTo(kneeX, labelY);
        ctx.lineTo(edgeX, labelY);
        ctx.stroke();

        ctx.fillStyle = '#64748B';
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = isRightSide ? 'right' : 'left';
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 14.5px "Cairo", "IBM Plex Sans Arabic", sans-serif';
        ctx.fillText(sl.label, edgeX, labelY - 7);

        ctx.fillStyle = sl.isRemaining ? '#64748B' : '#15803D';
        ctx.font = 'bold 14px "Plus Jakarta Sans", "Cairo", sans-serif';
        ctx.fillText(sl.pctText, edgeX, labelY + 18);
      });
    }

    drawCalloutList(rightCallouts, true);
    drawCalloutList(leftCallouts, false);

    // أسفل الورقة:
    // - على اليسار: إطار مخصص للإمضاء والختم (بطلب الإدارة)
    // - على اليمين: جدول مطابقة النسب المئوية للمجالات أسفل الدائرة النسبية
    var stripY = donutBoxY + 492;
    var stripH = 156;

    // أ) مكان الإمضاء والختم في الأسفل على اليسار
    var stampBoxX = donutBoxX + 16; // 68
    var stampBoxW = 336;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(stampBoxX, stripY, stampBoxW, stripH);
    ctx.strokeStyle = '#1E3A8A';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(stampBoxX, stripY, stampBoxW, stripH);

    // ترويسة صندوق الإمضاء والختم
    ctx.fillStyle = '#EEF2FF';
    ctx.fillRect(stampBoxX + 1, stripY + 1, stampBoxW - 2, 32);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(stampBoxX, stripY, stampBoxW, 32);

    ctx.fillStyle = '#1E1B4B';
    ctx.textAlign = 'center';
    ctx.font = 'bold 14.5px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('الإمضاء والختم', stampBoxX + stampBoxW / 2, stripY + 22);

    // مساحة فارغة مخصصة للتوقيع والختم الرسمي
    ctx.fillStyle = '#64748B';
    ctx.font = '12px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('تأشيرة وختم إدارة المركز النفسي البيداغوجي', stampBoxX + stampBoxW / 2, stripY + 54);
    ctx.strokeStyle = '#94A3B8';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(stampBoxX + 18, stripY + 64, stampBoxW - 36, 78);
    ctx.setLineDash([]);

    // ب) جدول مطابقة النسب المئوية للمجالات على اليمين
    var domStripX = stampBoxX + stampBoxW + 14; // 418
    var domStripW = (donutBoxX + donutBoxW - 16) - domStripX; // 754
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(domStripX, stripY, domStripW, stripH);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(domStripX, stripY, domStripW, stripH);

    ctx.fillStyle = '#1E3A8A';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13.5px "Cairo", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('نسب اكتساب المهارات حسب المجالات (مطابقة للأعمدة — معيار 4/5 فما فوق)', domStripX + domStripW / 2, stripY + 22);

    var colsPerRow = 2;
    var cellW = (domStripW - 16) / colsPerRow;
    var cellH = 26;

    domainStats.slice(0, 8).forEach(function (dm, idx) {
      var rIdx = Math.floor(idx / colsPerRow);
      var cIdx = idx % colsPerRow;
      var cxCell = (domStripX + domStripW - 8) - (cIdx + 1) * cellW;
      var cyCell = stripY + 30 + rIdx * (cellH + 4);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cxCell + 3, cyCell, cellW - 6, cellH);
      ctx.strokeStyle = '#E2E8F0';
      ctx.strokeRect(cxCell + 3, cyCell, cellW - 6, cellH);

      // نقطة لونية للمجال
      ctx.fillStyle = dm.color;
      ctx.beginPath();
      ctx.arc(cxCell + cellW - 13, cyCell + cellH / 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // اسم المجال
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'right';
      ctx.font = 'bold 11.5px "Cairo", "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(dm.shortName, cxCell + cellW - 22, cyCell + 18);

      // النسبة المئوية
      ctx.fillStyle = dm.acquired > 0 ? '#15803D' : '#64748B';
      ctx.textAlign = 'left';
      ctx.font = 'bold 11.5px "Plus Jakarta Sans", "Cairo", sans-serif';
      ctx.fillText(dm.pctFmt + '% (' + dm.acquired + '/' + dm.count + ')', cxCell + 8, cyCell + 18);
    });
  }

  // توليد عنصر Canvas لصفحة التقرير الكمي لعرضه مباشرة على شاشة الكمبيوتر أو طباعته
  async function renderQuantitativePageCanvas(rep, childFullName, secName, kd) {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) {}
    }
    var logoImg = await loadLogoImage();
    var statsObj = computeEvaluationStats(rep);
    var c = document.createElement('canvas');
    c.width = 1240;
    c.height = 1754;
    var ctx = c.getContext('2d');
    drawQuantitativeEvaluationPage(ctx, 1240, statsObj, childFullName, secName, kd, logoImg);
    return c;
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

  /* رسم استمارة التقييم البيداغوجي (notes | statistics | full) */
  async function renderEvaluationToPdf(rep, childFullName, secName, kd, reportType) {
    reportType = reportType || 'full'; // 'notes' | 'statistics' | 'full'
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) {}
    }
    var reportTemplateVersion = 'DE-EVAL-2.0';
    var generatedAtText = new Date().toLocaleString('ar-DZ', {
      timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    var statsObj = computeEvaluationStats(rep);
    var ev = statsObj.ev;
    var domainStats = statsObj.domainStats;
    var logoImg = await loadLogoImage();
    var W = 1240;
    var M = 56;
    var CW = W - M * 2; // 1128

    // حساب العمر وتاريخ الميلاد
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

    // ══════════════════════════════════════════════════════════════════════════
    // القسم الأول: التقرير البيداغوجي الوصفي (تقرير الملاحظات والتوجيهات)
    // يُرسم عندما يكون reportType === 'notes' أو 'full'
    // مضبوط بدقة ليبقى داخل صفحة A4 واحدة دون تجاوزها أبداً
    // ══════════════════════════════════════════════════════════════════════════
    if (reportType === 'notes' || reportType === 'full') {
      var pNotes = newPage('تقرير اللجنة البيداغوجية والتربوية — الملاحظات والتوجيهات');
      var ctx = pNotes.ctx;
      var y = pNotes.y;

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

      // 2. جدول معلومات الحالة (4 أعمدة)
      var c1W = 180, c2W = 384, c3W = 180, c4W = 384;
      var x1 = W - M - c1W;
      var x2 = x1 - c2W;
      var x3 = x2 - c3W;
      var x4 = M;

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
      y += 10;

      // 3. جدول المشرفين (بحد أقصى 4 صفوف للحفاظ على مقاس صفحة A4)
      var sW1 = 488, sW2 = 320, sW3 = 320;
      var sx1 = W - M - sW1;
      var sx2 = sx1 - sW2;
      var sx3 = M;

      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(sx1, y, sW1, 32);
      ctx.fillRect(sx2, y, sW2, 32);
      ctx.fillRect(sx3, y, sW3, 32);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(sx1, y, sW1, 32);
      ctx.strokeRect(sx2, y, sW2, 32);
      ctx.strokeRect(sx3, y, sW3, 32);

      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 15.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText('المشرفون: الإسم واللقب', sx1 + sW1 / 2, y + 22);
      ctx.fillText('الوظيفة / التخصص', sx2 + sW2 / 2, y + 22);
      ctx.fillText('التوقيع والختم', sx3 + sW3 / 2, y + 22);
      y += 32;

      var sups = (ev.supervisors && ev.supervisors.length) ? ev.supervisors : [{ name: 'إدارة المركز', role: 'مدير المركز' }];
      sups.slice(0, 4).forEach(function (sp) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx1, y, sW1, 30);
        ctx.fillRect(sx2, y, sW2, 30);
        ctx.fillRect(sx3, y, sW3, 30);
        ctx.strokeRect(sx1, y, sW1, 30);
        ctx.strokeRect(sx2, y, sW2, 30);
        ctx.strokeRect(sx3, y, sW3, 30);

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(sp.name || '—', sx1 + sW1 / 2, y + 21);
        ctx.font = '15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(sp.role || '—', sx2 + sW2 / 2, y + 21);
        ctx.fillStyle = '#64748B';
        ctx.fillText('........................', sx3 + sW3 / 2, y + 21);
        y += 30;
      });
      y += 14;

      // 4. البانر الأزرق السماوي: الوصف العام لأداء الحالة
      ctx.fillStyle = '#7DD3FC';
      ctx.fillRect(M, y, CW, 36);
      ctx.strokeStyle = '#0284C7';
      ctx.strokeRect(M, y, CW, 36);
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 19px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText('الوصف العام لأداء الحالة', W / 2, y + 25);
      y += 44;

      // 5. شبكة الوصف العام (يمين: التقرير العام، يسار: 6 صناديق ملونة للقدرات)
      // ارتفاع مضبوط بدقة لملء صفحة A4 بشكل متوازن دون تجاوزها
      var colGap = 14;
      var halfW = (CW - colGap) / 2; // 557
      var rightColX = W - M - halfW;
      var leftColX = M;
      var gridH = 444; // 6 صناديق × 74px

      // يمين: التقرير العام
      ctx.fillStyle = '#93C5FD';
      ctx.fillRect(rightColX, y, halfW, 34);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(rightColX, y, halfW, 34);
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 17px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText('التقرير العام والملاحظات البيداغوجية', rightColX + halfW / 2, y + 24);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(rightColX, y + 34, halfW, gridH - 34);
      ctx.strokeRect(rightColX, y + 34, halfW, gridH - 34);

      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'right';
      ctx.font = '16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      var grMaxLines = Math.floor((gridH - 60) / 30); // 12 سطراً كحد أقصى لا يتجاوز الصندوق
      var grLines = wrapLines(
        ctx,
        ev.general_report || 'تم تسجيل تقدم ملحوظ في الأداء العام للحالة مع مواصلة التأهيل التربوي والنفسي.',
        halfW - 28,
        grMaxLines
      );
      grLines.forEach(function (ln, idx) {
        ctx.fillText(ln, rightColX + halfW - 14, y + 66 + idx * 30);
      });

      // يسار: 6 صناديق القدرات بألوانها الرسمية
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
        ctx.fillRect(leftColX, ay, halfW, 26);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(leftColX, ay, halfW, 26);
        ctx.fillStyle = item.fg;
        ctx.textAlign = 'right';
        ctx.font = 'bold 14.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(item.title, leftColX + halfW - 10, ay + 19);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(leftColX, ay + 26, halfW, 44);
        ctx.strokeRect(leftColX, ay + 26, halfW, 44);
        ctx.fillStyle = '#1E293B';
        ctx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        var abLines = wrapLines(ctx, item.val || '—', halfW - 22, 2);
        abLines.forEach(function (aln, aIdx) {
          ctx.fillText(aln, leftColX + halfW - 10, ay + 44 + aIdx * 19);
        });
        ay += 74;
      });

      y += gridH + 16;

      // 6. البانر الأخضر: الخلاصة والتوصيات + 3 أعمدة
      ctx.fillStyle = '#86EFAC';
      ctx.fillRect(M, y, CW, 34);
      ctx.strokeStyle = '#16A34A';
      ctx.strokeRect(M, y, CW, 34);
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      ctx.fillText('الخلاصة والتوصيات', W / 2, y + 24);
      y += 40;

      var recColW = CW / 3; // 376
      var recH = Math.min(260, Math.max(140, 1520 - y));
      var recCols = [
        { title: '1. نقاط القوة', arr: ev.strengths, fb: 'استجابة وتفاعل إيجابي مع الأنشطة الموجهة.', x: W - M - recColW },
        { title: '2. نقاط الضعف', arr: ev.weaknesses, fb: 'الحاجة لتعزيز مهارات التركيز والاستقلالية.', x: W - M - recColW * 2 },
        { title: '3. التوصيات والتوجيهات', arr: ev.recommendations, fb: 'مواصلة المتابعة البيداغوجية والتنسيق المستمر مع الأسرة.', x: M }
      ];
      recCols.forEach(function (rc) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(rc.x, y, recColW, recH);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(rc.x, y, recColW, recH);

        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(rc.x, y, recColW, 30);
        ctx.strokeRect(rc.x, y, recColW, 30);

        ctx.fillStyle = '#0F172A';
        ctx.textAlign = 'center';
        ctx.font = 'bold 15.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillText(rc.title, rc.x + recColW / 2, y + 21);

        var items = (rc.arr || []).filter(function (x) { return x && String(x).trim(); });
        if (!items.length) items = [rc.fb];
        ctx.textAlign = 'right';
        ctx.font = '14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.fillStyle = '#1E293B';

        var maxRecLines = Math.floor((recH - 44) / 22);
        var allRecLines = [];
        items.forEach(function (itTxt) {
          var wrapped = wrapLines(ctx, '• ' + itTxt, recColW - 22, 3);
          allRecLines = allRecLines.concat(wrapped);
        });
        if (allRecLines.length > maxRecLines) {
          allRecLines = allRecLines.slice(0, maxRecLines);
          allRecLines[maxRecLines - 1] = allRecLines[maxRecLines - 1].replace(/[.\s…]+$/, '') + '…';
        }
        allRecLines.forEach(function (ln, lIdx) {
          ctx.fillText(ln, rc.x + recColW - 10, y + 52 + lIdx * 22);
        });
      });
      y += recH + 18;

      // تذييل التوقيعات والاعتماد الرسمي أسفل صفحة الملاحظات
      if (y < 1610) {
        var footY = Math.max(y, 1555);
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(M, footY, CW, 85);
        ctx.strokeStyle = '#CBD5E1';
        ctx.strokeRect(M, footY, CW, 85);
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 15px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('إمضاء اللجنة البيداغوجية المشرفة', W - M - 260, footY + 32);
        ctx.fillText('ختم وتأشيرة إدارة المركز النفسي البيداغوجي دار الإحسان', M + 280, footY + 32);
        ctx.fillStyle = '#64748B';
        ctx.fillText('..................................................', W - M - 260, footY + 66);
        ctx.fillText('..................................................', M + 280, footY + 66);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // القسم الثاني: التقرير التقييمي الكمي (الجدول + المشرفون + الأعمدة + الدائرة النسبية)
    // يُرسم عندما يكون reportType === 'statistics' أو 'full'
    // ══════════════════════════════════════════════════════════════════════════
    if (reportType === 'statistics' || reportType === 'full') {
      var qCanvas = document.createElement('canvas');
      qCanvas.width = W;
      qCanvas.height = 1754;
      var qCtx = qCanvas.getContext('2d');
      drawQuantitativeEvaluationPage(qCtx, W, statsObj, childFullName, secName, kd, logoImg);
      pages.push({ canvas: qCanvas, ctx: qCtx, y: 1650 });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // القسم الثالث: الجداول التفصيلية لكافة المجالات والمهارات المقيمة (للإدارة في التقرير الشامل)
    // يُرسم عندما يكون reportType === 'full' أو 'details'
    // ══════════════════════════════════════════════════════════════════════════
    if (reportType === 'full' || reportType === 'details') {
      var pDet = newPage('الجداول التفصيلية لكافة المهارات المقيمة في المجالات التربوية');
      var dCtx = pDet.ctx;
      var dy = pDet.y;

      // شريط ملخص معيار الاكتساب
      dCtx.fillStyle = '#123E73';
      roundRect(dCtx, M, dy, CW, 40, 8);
      dCtx.fill();
      dCtx.fillStyle = '#FFFFFF';
      dCtx.textAlign = 'right';
      dCtx.font = 'bold 16px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      dCtx.fillText('معيار دار الإحسان: تُحسب المهارة مكتسبة عند الدرجة 4/5 فما فوق', W - M - 18, dy + 26);

      dCtx.fillStyle = '#16A34A';
      roundRect(dCtx, M + 16, dy + 7, 320, 26, 13);
      dCtx.fill();
      dCtx.fillStyle = '#FFFFFF';
      dCtx.textAlign = 'center';
      dCtx.font = 'bold 14.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      dCtx.fillText('المكتسبة: ' + statsObj.acquiredSkills + ' من ' + statsObj.totalSkills + ' مهارة (' + statsObj.overallPct + '%)', M + 176, dy + 25);
      dy += 52;

      var skW = [60, 628, 180, 260];
      var skX = [
        W - M - skW[0],
        W - M - skW[0] - skW[1],
        W - M - skW[0] - skW[1] - skW[2],
        M
      ];

      function drawSkillTableHeader(cCtx, curY) {
        var hdrs = ['#', 'المهارة المقيمة', 'الدرجة والاكتساب', 'الملاحظات والتوجيهات'];
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
        if (dy > 1560) {
          pDet = newPage('الجداول التفصيلية لكافة المهارات المقيمة (تابع)');
          dCtx = pDet.ctx;
          dy = pDet.y;
        }

        // ترويسة المجال التربوي مع شارة المهارات المكتسبة والنسبة
        dCtx.fillStyle = '#DBEAFE';
        dCtx.fillRect(M, dy, CW, 34);
        dCtx.strokeStyle = '#93C5FD';
        dCtx.strokeRect(M, dy, CW, 34);

        dCtx.fillStyle = '#1E3A8A';
        dCtx.textAlign = 'right';
        dCtx.font = 'bold 15.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        dCtx.fillText((dIdx + 1) + '. ' + dm.name + ' (إجمالي المهارات: ' + dm.count + ')', W - M - 14, dy + 23);

        dCtx.fillStyle = '#DCFCE7';
        roundRect(dCtx, M + 14, dy + 5, 290, 24, 12);
        dCtx.fill();
        dCtx.strokeStyle = '#16A34A';
        dCtx.stroke();
        dCtx.fillStyle = '#15803D';
        dCtx.textAlign = 'center';
        dCtx.font = 'bold 13.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
        dCtx.fillText('المكتسبة: ' + dm.acquired + ' من ' + dm.count + ' (' + dm.pctFmt + '%)', M + 159, dy + 22);
        dy += 34;

        dy = drawSkillTableHeader(dCtx, dy);

        dm.ratings.forEach(function (rt, rIdx) {
          if (dy > 1640) {
            pDet = newPage('الجداول التفصيلية لكافة المهارات المقيمة (تابع)');
            dCtx = pDet.ctx;
            dy = pDet.y;
            dy = drawSkillTableHeader(dCtx, dy);
          }

          var rh = 28;
          var rowBg = (rIdx % 2 === 0) ? '#FFFFFF' : '#F8FAFC';
          for (var ci = 0; ci < 4; ci++) {
            dCtx.fillStyle = rowBg;
            dCtx.fillRect(skX[ci], dy, skW[ci], rh);
            dCtx.strokeStyle = '#CBD5E1';
            dCtx.lineWidth = 0.8;
            dCtx.strokeRect(skX[ci], dy, skW[ci], rh);
          }

          dCtx.fillStyle = '#0F172A';
          dCtx.textAlign = 'center';
          dCtx.font = 'bold 14px "IBM Plex Sans Arabic", "Cairo", sans-serif';
          dCtx.fillText(String(rt.num), skX[0] + skW[0] / 2, dy + 19);

          dCtx.textAlign = 'right';
          dCtx.font = 'bold 13.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
          dCtx.fillText(String(rt.skill).slice(0, 72), skX[1] + skW[1] - 10, dy + 19);

          // شارة الدرجة والاكتساب
          dCtx.fillStyle = rt.acquired ? '#D1FAE5' : '#F1F5F9';
          roundRect(dCtx, skX[2] + 18, dy + 4, skW[2] - 36, 20, 10);
          dCtx.fill();
          dCtx.fillStyle = rt.acquired ? '#047857' : '#64748B';
          dCtx.textAlign = 'center';
          dCtx.font = 'bold 12.5px "IBM Plex Sans Arabic", "Cairo", sans-serif';
          dCtx.fillText(rt.badgeText + (rt.acquired ? ' • مكتسبة' : ''), skX[2] + skW[2] / 2, dy + 18);

          dCtx.fillStyle = '#475569';
          dCtx.font = '13px "IBM Plex Sans Arabic", "Cairo", sans-serif';
          dCtx.fillText(String(rt.note).slice(0, 34), skX[3] + skW[3] / 2, dy + 19);

          dy += rh;
        });

        dy += 14;
      });
    }

    // ترقيم الصفحات في أسفل كل صفحة
    var totalPages = pages.length;
    pages.forEach(function (pg, idx) {
      var cCtx = pg.ctx;
      cCtx.fillStyle = '#64748B';
      cCtx.textAlign = 'center';
      cCtx.font = '13px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      cCtx.fillText('الصفحة ' + (idx + 1) + ' من ' + totalPages + ' — المركز النفسي البيداغوجي دار الإحسان (العطف - غرداية)', W / 2, 1685);
      cCtx.font = '12px "IBM Plex Sans Arabic", "Cairo", sans-serif';
      cCtx.fillText('نسخة التقرير: ' + reportTemplateVersion + ' | تاريخ ووقت الإنشاء: ' + generatedAtText, W / 2, 1708);
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


    /* =====================================================================
     توليد وثيقة البرنامج الأسبوعي بصيغة A4 أفقي (Landscape 1754x1240)
     مطابقة تماماً للورقة الأصلية المعتمدة لمركز دار الإحسان بتصميم عصري منظم
     ===================================================================== */
  var DOMAIN_PALETTE = [
    { bg: '#ECFDF5', border: '#10B981', badgeBg: '#059669', text: '#064E3B' },
    { bg: '#EFF6FF', border: '#3B82F6', badgeBg: '#2563EB', text: '#1E3A8A' },
    { bg: '#FEF3C7', border: '#F59E0B', badgeBg: '#D97706', text: '#78350F' },
    { bg: '#F3E8FF', border: '#A855F7', badgeBg: '#7C3AED', text: '#4C1D95' },
    { bg: '#FFE4E6', border: '#F43F5E', badgeBg: '#E11D48', text: '#881337' },
    { bg: '#E0F2FE', border: '#0EA5E9', badgeBg: '#0284C7', text: '#0C4A6E' },
    { bg: '#F1F5F9', border: '#64748B', badgeBg: '#475569', text: '#0F172A' },
    { bg: '#FCE7F3', border: '#EC4899', badgeBg: '#DB2777', text: '#831843' }
  ];

  function hashDomainIdx(domName) {
    var s = String(domName || '');
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return h % DOMAIN_PALETTE.length;
  }

  function drawWeeklyProgramLandscapePage(ctx, W, H, progState, secName, logoImg) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // الإطار الخارجي المزدوج بهوية Forest لدار الإحسان
    var M = 34;
    ctx.strokeStyle = '#14532D';
    ctx.lineWidth = 3;
    ctx.strokeRect(M, M, W - M * 2, H - M * 2);
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(M + 6, M + 6, W - (M + 6) * 2, H - (M + 6) * 2);

    // 1. رأس الصفحة (Header) المطابق للورقة الأصلية
    var hdrX = M + 14;
    var hdrY = M + 14;
    var hdrW = W - (M + 14) * 2;
    var hdrH = 132;

    ctx.fillStyle = '#F8FAF9';
    roundRect(ctx, hdrX, hdrY, hdrW, hdrH, 12);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // الشعار على اليمين
    if (logoImg && logoImg.width) {
      ctx.drawImage(logoImg, W - hdrX - 116, hdrY + 11, 106, 106);
    }
    // العلم الجزائري على اليسار
    drawAlgeriaFlagCircle(ctx, hdrX + 66, hdrY + 66, 44);

    // بيانات الجمعية والمركز على اليمين بجانب الشعار
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F3D2E';
    ctx.font = 'bold 20px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('جمعية أولياء الأطفال المعاقين ذهنيًا', W - hdrX - 132, hdrY + 38);
    ctx.fillStyle = '#14532D';
    ctx.font = 'bold 18px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('المركز النفسي البيداغوجي دار الإحسان — العطف - غرداية', W - hdrX - 132, hdrY + 68);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 15px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    var prepDate = (progState && progState.prepared_date) || (progState && progState.published_at ? String(progState.published_at).slice(0, 10) : new Date().toISOString().slice(0, 10));
    ctx.fillText('تاريخ إعداد البرنامج: ' + prepDate, W - hdrX - 132, hdrY + 98);

    // العنوان الرئيسي في الوسط: «البرنامج الأسبوعي»
    ctx.textAlign = 'center';
    ctx.fillStyle = '#14532D';
    roundRect(ctx, W / 2 - 210, hdrY + 14, 420, 48, 24);
    ctx.fill();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('البرنامج الأسبوعي', W / 2, hdrY + 47);

    // اسم الفوج أو الوحدة تحت العنوان
    var groupTitle = secName || (progState && progState.section_name) || 'الفوج التربوي';
    ctx.fillStyle = '#FEF3C7';
    roundRect(ctx, W / 2 - 190, hdrY + 72, 380, 42, 10);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 19px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('الفوج / الوحدة: ' + groupTitle, W / 2, hdrY + 100);

    // بيانات الموسم الدراسي والدوام على اليسار بجانب العلم
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F3D2E';
    ctx.font = 'bold 17px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    var acYear = (progState && progState.academic_year) || '2026/2027';
    ctx.fillText('الموسم الدراسي: ' + acYear, hdrX + 128, hdrY + 42);

    var dayStart = (progState && progState.day_start) || '08:00';
    var dayEnd = (progState && progState.day_end) || '14:00';
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 15px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('التوقيت اليومي: ' + dayStart + ' - ' + dayEnd, hdrX + 128, hdrY + 72);

    var statusLabel = (progState && progState.status === 'published') ? 'منشور ومعتمد' : ((progState && progState.status === 'updated') ? 'تم تحديثه' : 'مسودة');
    ctx.fillStyle = (progState && (progState.status === 'published' || progState.status === 'updated')) ? '#15803D' : '#64748B';
    ctx.font = 'bold 14.5px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('حالة البرنامج: ' + statusLabel, hdrX + 128, hdrY + 100);

    // 2. جدول الحصص الأسبوعي المطابق للورقة الأصلية
    var tblX = hdrX;
    var tblY = hdrY + hdrH + 14;
    var tblW = hdrW;
    var footerH = 112;
    var tblH = (H - M - 14 - footerH - 12) - tblY;

    var daysList = (progState && Array.isArray(progState.days) && progState.days.length) ? progState.days : [
      { day: 'sun', label: 'الأحد', sessions: [] },
      { day: 'mon', label: 'الإثنين', sessions: [] },
      { day: 'tue', label: 'الثلاثاء', sessions: [] },
      { day: 'wed', label: 'الأربعاء', sessions: [] },
      { day: 'thu', label: 'الخميس', sessions: [] }
    ];

    var timeSlots = (progState && Array.isArray(progState.time_slots) && progState.time_slots.length)
      ? progState.time_slots
      : [
          { id: 0, start: '08:00', end: '08:30', period: 'morning' },
          { id: 1, start: '08:30', end: '09:30', period: 'morning' },
          { id: 2, start: '09:30', end: '10:00', period: 'morning' },
          { id: 3, start: '10:00', end: '11:00', period: 'morning' },
          { id: 4, start: '11:00', end: '11:30', period: 'morning' },
          { id: 5, start: '11:30', end: '12:30', period: 'morning' },
          { id: 6, start: '12:30', end: '13:30', period: 'afternoon' },
          { id: 7, start: '13:30', end: '14:00', period: 'afternoon' }
        ];

    // شريط الفترات الصباحية والمسائية
    var morningSlots = timeSlots.filter(function (s) { return s.period === 'morning'; });
    var afternoonSlots = timeSlots.filter(function (s) { return s.period === 'afternoon'; });
    if (!morningSlots.length) morningSlots = timeSlots.slice(0, 6);
    if (!afternoonSlots.length) afternoonSlots = timeSlots.slice(6);

    var dayColW = 120; // عمود اسم اليوم على اليمين
    var slotsAreaW = tblW - dayColW;
    var totalSlotsCount = timeSlots.length;
    var baseSlotW = slotsAreaW / totalSlotsCount;

    var periodBarH = 34;
    var timeBarH = 28;
    var tableHeaderH = periodBarH + timeBarH;

    // رسم خلية "اليوم"
    ctx.fillStyle = '#14532D';
    ctx.fillRect(tblX + tblW - dayColW, tblY, dayColW, tableHeaderH);
    ctx.strokeStyle = '#0F3D2E';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tblX + tblW - dayColW, tblY, dayColW, tableHeaderH);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('اليوم', tblX + tblW - dayColW / 2, tblY + tableHeaderH / 2 + 6);

    // رسم شريط الفترة الصباحية
    var morningW = morningSlots.length * baseSlotW;
    var morningX = tblX + tblW - dayColW - morningW;
    ctx.fillStyle = '#ECFDF5';
    ctx.fillRect(morningX, tblY, morningW, periodBarH);
    ctx.strokeStyle = '#10B981';
    ctx.strokeRect(morningX, tblY, morningW, periodBarH);

    ctx.fillStyle = '#064E3B';
    ctx.font = 'bold 16px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('الفترة الصباحية', morningX + morningW / 2, tblY + 23);

    // رسم شريط الفترة المسائية
    var afternoonW = afternoonSlots.length * baseSlotW;
    var afternoonX = tblX;
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(afternoonX, tblY, afternoonW, periodBarH);
    ctx.strokeStyle = '#F59E0B';
    ctx.strokeRect(afternoonX, tblY, afternoonW, periodBarH);

    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 16px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
    ctx.fillText('الفترة المسائية', afternoonX + afternoonW / 2, tblY + 23);

    // رسم شريط التوقيتات الدقيقة لكل خانة
    timeSlots.forEach(function (slot, sIdx) {
      var sx = tblX + tblW - dayColW - (sIdx + 1) * baseSlotW;
      ctx.fillStyle = '#F8FAF9';
      ctx.fillRect(sx, tblY + periodBarH, baseSlotW, timeBarH);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, tblY + periodBarH, baseSlotW, timeBarH);

      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 12.5px "Cairo", "Tajawal", "Plus Jakarta Sans", sans-serif';
      ctx.fillText(slot.start + ' - ' + slot.end, sx + baseSlotW / 2, tblY + periodBarH + 19);
    });

    // رسم صفوف الأيام الـ 5 مع الخانات العادية والمدمجة
    var gridTopY = tblY + tableHeaderH;
    var gridAvailH = tblH - tableHeaderH;
    var numDays = daysList.length;
    var dayRowH = Math.floor(gridAvailH / numDays);

    daysList.forEach(function (dyObj, dIdx) {
      var ry = gridTopY + dIdx * dayRowH;
      var dayRightX = tblX + tblW - dayColW;

      // خلية اسم اليوم
      ctx.fillStyle = (dIdx % 2 === 0) ? '#14532D' : '#0F3D2E';
      ctx.fillRect(dayRightX, ry, dayColW, dayRowH);
      ctx.strokeStyle = '#0F3D2E';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(dayRightX, ry, dayColW, dayRowH);

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(dyObj.label || '', dayRightX + dayColW / 2, ry + dayRowH / 2 + 7);

      // رسم الحصص في هذا اليوم مع دعم الدمج (span)
      var slotOffsetCursor = 0;
      var sessions = dyObj.sessions || [];

      sessions.forEach(function (sess) {
        var span = sess.span || 1;
        var cellW = span * baseSlotW;
        var sx = dayRightX - (slotOffsetCursor + span) * baseSlotW;

        var isAct = (sess.kind === 'activity' || sess.kind === 'break');
        var isLib = (sess.kind === 'library' || (!isAct && sess.domain && sess.skill));
        var isMan = (sess.kind === 'manual' || (!isAct && !isLib && (sess.manual_text || sess.title)));
        var isFilled = (isAct || isLib || isMan);

        if (!isFilled) {
          // خانة فارغة مطابقة للورقة
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(sx, ry, cellW, dayRowH);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 1;
          ctx.strokeRect(sx, ry, cellW, dayRowH);
        } else if (isAct) {
          // نشاط يومي / فترة تنظيمية (كهرماني دافئ)
          ctx.fillStyle = '#FFFBEB';
          ctx.fillRect(sx, ry, cellW, dayRowH);
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx, ry, cellW, dayRowH);

          // شارة نشاط يومي
          ctx.fillStyle = '#D97706';
          ctx.font = 'bold 11px "Cairo", "Tajawal", sans-serif';
          ctx.fillText('نشاط يومي', sx + cellW / 2, ry + 22);

          // اسم النشاط
          ctx.fillStyle = '#78350F';
          ctx.font = 'bold 15px "Cairo", "Tajawal", sans-serif';
          var actText = sess.activity || sess.title || 'نشاط يومي';
          var actLines = wrapLines(ctx, actText, cellW - 14, 2);
          actLines.forEach(function (aln, lIdx) {
            ctx.fillText(aln, sx + cellW / 2, ry + 44 + lIdx * 19);
          });
        } else if (isLib) {
          // حصة بيداغوجية من المكتبة (لون المجال + اسم المجال + المهارة)
          var pal = DOMAIN_PALETTE[hashDomainIdx(sess.domain)];
          ctx.fillStyle = pal.bg;
          ctx.fillRect(sx, ry, cellW, dayRowH);
          ctx.strokeStyle = pal.border;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx, ry, cellW, dayRowH);

          // شارة المجال
          ctx.fillStyle = pal.badgeBg;
          roundRect(ctx, sx + 4, ry + 6, cellW - 8, 22, 4);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11.5px "Cairo", "Tajawal", sans-serif';
          var shortDom = String(sess.domain || 'مجال بيداغوجي').replace(/\s*\(.*?\)\s*/g, '').trim();
          var domWrap = wrapLines(ctx, shortDom, cellW - 12, 1);
          ctx.fillText(domWrap[0] || shortDom, sx + cellW / 2, ry + 21);

          // اسم المهارة
          ctx.fillStyle = pal.text;
          ctx.font = 'bold 12.5px "Cairo", "Tajawal", sans-serif';
          var skText = sess.skill || sess.title || 'مهارة تربوية';
          var skLines = wrapLines(ctx, skText, cellW - 12, 3);
          skLines.forEach(function (sln, lIdx) {
            ctx.fillText(sln, sx + cellW / 2, ry + 45 + lIdx * 16);
          });
        } else if (isMan) {
          // ملء يدوي مستقل (أزرق هادئ)
          ctx.fillStyle = '#EFF6FF';
          ctx.fillRect(sx, ry, cellW, dayRowH);
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx, ry, cellW, dayRowH);

          // شارة ملء يدوي
          ctx.fillStyle = '#2563EB';
          ctx.font = 'bold 11px "Cairo", "Tajawal", sans-serif';
          ctx.fillText('إدخال مخصص', sx + cellW / 2, ry + 22);

          // النص اليدوي
          ctx.fillStyle = '#1E3A8A';
          ctx.font = 'bold 13px "Cairo", "Tajawal", sans-serif';
          var manText = sess.manual_text || sess.title || '';
          var manLines = wrapLines(ctx, manText, cellW - 12, 3);
          manLines.forEach(function (mln, lIdx) {
            ctx.fillText(mln, sx + cellW / 2, ry + 44 + lIdx * 17);
          });
        }

        slotOffsetCursor += span;
      });
    });

    // 3. تذييل التوقيعات الرسمية (توقيع المربي + المشرف البيداغوجي + المدير)
    var footY = H - M - 14 - footerH;
    ctx.fillStyle = '#F8FAF9';
    roundRect(ctx, tblX, footY, tblW, footerH, 10);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    var signBoxW = Math.floor((tblW - 48) / 3);
    var educatorName = (progState && progState.educator_name) || '';
    var supervisorName = (progState && progState.supervisor_name) || '';
    var directorName = (progState && progState.director_name) || '';

    var signCols = [
      { title: 'توقيع المربي(ة) المشرف(ة) على الفوج', sub: educatorName || 'الاسم والإمضاء', x: tblX + tblW - 12 - signBoxW },
      { title: 'توقيع المشرف البيداغوجي', sub: supervisorName || 'الاسم والتأشيرة', x: tblX + Math.floor((tblW - signBoxW) / 2) },
      { title: 'توقيع وختم مدير المركز', sub: directorName || 'الإمضاء والختم الرسمي', x: tblX + 12 }
    ];

    signCols.forEach(function (sc) {
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, sc.x, footY + 10, signBoxW, footerH - 20, 8);
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#0F3D2E';
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(sc.title, sc.x + signBoxW / 2, footY + 34);

      ctx.fillStyle = '#475569';
      ctx.font = '13.5px "Cairo", "Tajawal", "IBM Plex Sans Arabic", sans-serif';
      ctx.fillText(sc.sub, sc.x + signBoxW / 2, footY + 58);

      ctx.fillStyle = '#94A3B8';
      ctx.fillText('............................................................', sc.x + signBoxW / 2, footY + 84);
    });
  }

  async function renderWeeklyProgramCanvas(progState, secName) {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (e) {}
    }
    var logoImg = await loadLogoImage();
    var c = document.createElement('canvas');
    c.width = 1754;
    c.height = 1240;
    var ctx = c.getContext('2d');
    drawWeeklyProgramLandscapePage(ctx, 1754, 1240, progState, secName, logoImg);
    return c;
  }

  async function renderWeeklyProgramToPdf(progState, secName) {
    var c = await renderWeeklyProgramCanvas(progState, secName);
    var jpgBytes = await canvasToJpegBytes(c, 0.95);
    return buildPdfBinary([{ data: jpgBytes, width: 1754, height: 1240 }]);
  }

  root.DE_PDF = {
    buildPdfBinary: buildPdfBinary,
    canvasToJpegBytes: canvasToJpegBytes,
    downloadPdf: downloadPdf,
    computeEvaluationStats: computeEvaluationStats,
    renderQuantitativePageCanvas: renderQuantitativePageCanvas,
    renderWeeklyProgramCanvas: renderWeeklyProgramCanvas,
    renderWeeklyProgramToPdf: renderWeeklyProgramToPdf,
    renderReportToPdf: renderReportToPdf,
    renderEvaluationToPdf: renderEvaluationToPdf,
    renderAttendanceToPdf: renderAttendanceToPdf,
    renderChildrenListToPdf: renderChildrenListToPdf
  };

})(typeof window !== 'undefined' ? window : globalThis);
