// Ortak davranış: bağlantıdaki adı sayfaya yazar, açık/kapalı durumunu ve saat tablosunu üretir.
(function () {
  var body = document.body;
  var p = new URLSearchParams(location.search);

  function temizle(s, yedek) {
    s = (s || '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 48);
    return s || yedek;
  }
  var ad = temizle(p.get('ad'), body.dataset.varsayilan);
  var sehir = temizle(p.get('sehir'), 'Trabzon');

  document.querySelectorAll('[data-ad]').forEach(function (e) { e.textContent = ad; });
  document.querySelectorAll('[data-sehir]').forEach(function (e) { e.textContent = sehir; });
  document.title = ad + ' | ' + body.dataset.tur;

  var baslik = document.querySelector('.ad');
  if (baslik) baslik.dataset.uzun = ad.length > 22 ? 'cok' : ad.length > 12 ? 'orta' : 'kisa';

  var sorgu = encodeURIComponent(ad + ' ' + sehir);
  var harita = document.querySelector('.harita');
  if (harita) harita.src = 'https://maps.google.com/maps?q=' + sorgu + '&z=15&output=embed';
  document.querySelectorAll('[data-yol]').forEach(function (a) {
    a.href = 'https://www.google.com/maps/search/?api=1&query=' + sorgu;
    a.target = '_blank'; a.rel = 'noopener';
  });

  // Saatler: {"1":["09:00","21:00"], ... "0":null}; 0 = Pazar
  var GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  var saatler = JSON.parse(body.dataset.saatler || '{}');

  function yaz(hm) { return hm.replace(':', '.'); }
  // "21.00'de", "09.00'da", "13.00'te": son okunan sayının sesine göre ek
  function ekli(hm) {
    var h = +hm.slice(0, 2), m = +hm.slice(3, 5);
    var n = m || h, son;
    if (n === 0) son = 'a';
    else if (n % 10) son = { 1: 'e', 2: 'e', 3: 'et', 4: 'et', 5: 'et', 6: 'a', 7: 'e', 8: 'e', 9: 'a' }[n % 10];
    else son = { 1: 'a', 2: 'e', 3: 'a', 4: 'at', 5: 'e' }[n / 10];
    var ek = son.length === 2 ? (son[0] === 'a' ? 'ta' : 'te') : (son === 'a' ? 'da' : 'de');
    return yaz(hm) + "'" + ek;
  }

  var simdi = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  var parca = {}; simdi.forEach(function (x) { parca[x.type] = x.value; });
  var bugun = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parca.weekday);
  var dk = (+parca.hour) * 60 + (+parca.minute);
  function dakika(hm) { return (+hm.slice(0, 2)) * 60 + (+hm.slice(3, 5)); }

  var durum = document.querySelector('.durum');
  if (durum && bugun >= 0) {
    var b = saatler[bugun], metin, acik = false;
    if (b && dk >= dakika(b[0]) && dk < dakika(b[1])) {
      acik = true; metin = 'Şu an açık, ' + ekli(b[1]) + ' kapanır';
    } else if (b && dk < dakika(b[0])) {
      metin = 'Şu an kapalı, bugün ' + ekli(b[0]) + ' açılır';
    } else {
      for (var i = 1; i <= 7; i++) {
        var g = (bugun + i) % 7, s = saatler[g];
        if (s) { metin = 'Şu an kapalı, ' + (i === 1 ? 'yarın' : GUNLER[g]) + ' ' + ekli(s[0]) + ' açılır'; break; }
      }
    }
    durum.textContent = metin || '';
    durum.dataset.acik = acik ? 'evet' : 'hayir';
  }

  var tablo = document.querySelector('.saatler tbody');
  if (tablo) {
    [1, 2, 3, 4, 5, 6, 0].forEach(function (g) {
      var tr = document.createElement('tr');
      if (g === bugun) tr.dataset.bugun = '';
      var a = document.createElement('td'); a.textContent = GUNLER[g];
      var c = document.createElement('td');
      c.textContent = saatler[g] ? yaz(saatler[g][0]) + ' - ' + yaz(saatler[g][1]) : 'Kapalı';
      tr.append(a, c); tablo.append(tr);
    });
  }

  // Örnekte gerçek numara yok: butona basınca ne olacağını söyle
  var not = document.createElement('div');
  not.className = 'bildirim'; not.setAttribute('role', 'status');
  body.append(not);
  var zaman;
  var ACIKLAMA = {
    whatsapp: 'Gerçek sitede bu buton, müşterinizi doğrudan sizin WhatsApp hattınıza götürür.',
    ara: 'Gerçek sitede bu buton, telefonunuzu tek dokunuşla arar.',
    instagram: 'Gerçek sitede bu bağlantı sizin Instagram hesabınızı açar.'
  };
  document.querySelectorAll('[data-ornek]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      not.textContent = ACIKLAMA[el.dataset.ornek];
      not.dataset.gorunur = '';
      clearTimeout(zaman);
      zaman = setTimeout(function () { delete not.dataset.gorunur; }, 3200);
    });
  });

  // Sekmeler (kafe menüsü)
  document.querySelectorAll('[role="tablist"]').forEach(function (liste) {
    var sekmeler = liste.querySelectorAll('[role="tab"]');
    sekmeler.forEach(function (s) {
      s.addEventListener('click', function () {
        sekmeler.forEach(function (x) {
          var secili = x === s;
          x.setAttribute('aria-selected', secili);
          x.tabIndex = secili ? 0 : -1;
          document.getElementById(x.getAttribute('aria-controls')).hidden = !secili;
        });
      });
    });
  });
})();
