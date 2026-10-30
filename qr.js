/* التوجيه المباشر من بطاقة التلميذ (QR) إلى فضاء الأولياء مع كتابة اسم المستخدم تلقائياً */
(function () {
  'use strict';
  var OFFICIAL_USERNAMES = {
    "004": "hadj.brahim.004", "021": "hadj.brahim.021", "022": "behoun.ali.022", "050": "said.mustapha.050",
    "077": "behoun.ali.077", "082": "hadj.mohamed.082", "086": "hadj.brahim.086", "087": "khelif.brahim.087",
    "090": "ouled.hadjou.090", "101": "taleb.bahmed.101", "103": "behoun.aicha.103", "104": "behoun.wissam.104",
    "111": "behoun.zoulikha.111", "112": "kendouzi.nasr.112", "114": "asmaoui.amine.114", "116": "salah.mehdi.116",
    "117": "derrine.soumia.117", "118": "derrine.mounir.118", "119": "derrine.bachir.119", "132": "hammou.ali.132",
    "138": "hammou.ali.138", "142": "bouhdiba.mohamed.142", "146": "habirech.djihane.146", "153": "elabed.hasna.153",
    "159": "asmaoui.mohamed.159", "160": "behoun.ali.160", "165": "hammou.ali.165", "167": "klimani.anfel.167",
    "168": "klimani.aya.168", "170": "ben.ali.170", "173": "ben.yahia.173", "176": "kebir.hadj.176",
    "180": "zerguoun.safouane.180", "187": "kharoubi.zakaria.187", "188": "skouti.aissa.188", "189": "chara.rayan.189",
    "190": "ben.hamouda.190", "192": "chara.khaled.192", "196": "behchou.smail.196", "197": "klimani.aya.197",
    "198": "ben.rim.198", "200": "ben.youssef.200", "201": "babaomar.tiaziit.201", "202": "bakli.elhadj.202",
    "204": "bebou.mohamed.204", "206": "ben.afou.206", "209": "goumar.mohamed.209", "213": "yacoub.nadir.213",
    "216": "abi.smail.216", "219": "hadj.mohamed.219", "223": "ouled.ali.223", "224": "mesehel.louai.224",
    "226": "dahan.abd.226", "227": "gebsi.mehdi.227", "228": "himoud.oussama.228", "231": "mehiri.youssef.231",
    "236": "hadj.said.236", "238": "baba.omar.238", "239": "baba.omar.239", "240": "ben.moussa.240",
    "243": "hadj.mohamed.243", "247": "djarada.brahim.247", "249": "hata.slimane.249", "250": "hadj.smail.250",
    "251": "said.fatima.251", "254": "boual.mustapha.254", "255": "ben.khelifa.255", "256": "ben.ahmed.256",
    "257": "chamikha.abd.257", "258": "ouled.cheikh.258", "259": "aissa.ezz.259", "263": "salem.youssef.263",
    "264": "hamel.sihem.264", "265": "hamel.abd.265", "267": "belloulou.elhadj.267", "273": "elouahedj.bakir.273",
    "274": "touhami.rim.274", "275": "ouled.hadjou.275", "276": "seddiki.mohamed.276", "279": "kendouz.nihal.279",
    "280": "metiaz.toufik.280", "281": "akif.abd.281", "283": "daoudi.siham.283", "288": "hadj.aissa.288",
    "289": "bennoura.mounir.289", "291": "daoudi.rabie.291", "293": "righi.aya.293", "296": "abbas.lokmane.296",
    "297": "cheikh.mohamed.297", "301": "asmaoui.ayoub.301", "305": "yahia.cherif.305", "306": "ben.seghir.306",
    "307": "ghebchi.nourelhouda.307", "310": "daoudi.elhadj.310", "311": "cheikh.dahmane.311", "312": "ben.younes.312",
    "313": "laaziz.yasmine.313", "314": "nouh.mefnoun.314", "315": "bourezma.brahim.315", "316": "zitari.nour.316",
    "317": "daoudi.taha.317", "318": "djebrit.saad.318", "320": "bitour.mohamed.320"
  };

  var params = new URLSearchParams(window.location.search);
  var u = (params.get('u') || '').trim().toLowerCase();
  var m = (params.get('m') || '').trim();
  var id = (params.get('id') || '').trim();

  if (!u && m) {
    var padM = ('000' + m.replace(/\D/g, '')).slice(-3);
    u = OFFICIAL_USERNAMES[padM] || padM;
  }
  if (!u && id) {
    var mFromId = id.match(/(\d{3})$/);
    if (mFromId) {
      u = OFFICIAL_USERNAMES[mFromId[1]] || mFromId[1];
    }
  }

  var target = 'parent.html' + (u ? ('?u=' + encodeURIComponent(u)) : '');
  window.location.replace(target);
})();
