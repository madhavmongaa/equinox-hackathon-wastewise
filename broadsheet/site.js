/* WasteWise · The Broadsheet: page-local choreography.
   The engine (scrollcraft.js) drives acts and publishes --sc-p on each act.
   Everything bespoke here reads that value; the engine is never edited. */
(function () {
  'use strict';

  /* ------------------------------------------------------------ config --
     Where the WasteWise app lives. "/app.html" works when this page is
     deployed as the app's landing page. Point it at the deployed app
     otherwise, e.g. "https://your-domain/app.html". */
  var APP_BASE = window.WW_APP_BASE || '/app.html';
  /* The 3D game. Set this to its URL and the "Play the game" link uses it. */
  var GAME_URL = window.WW_GAME_URL || '';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a || 0, v)); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  Array.prototype.forEach.call(document.querySelectorAll('[data-app]'), function (a) {
    a.href = APP_BASE + a.getAttribute('data-app');
  });
  var gameLink = document.getElementById('gameLink');
  if (gameLink) {
    if (GAME_URL) gameLink.href = GAME_URL;
    else gameLink.href = APP_BASE;
  }

  var dateEl = document.getElementById('todayDate');
  if (dateEl) {
    var d = new Date();
    dateEl.dateTime = d.toISOString().slice(0, 10);
    dateEl.textContent = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  ScrollCraft.mount(document.body);

  var actP = function (el) { var v = parseFloat(el.style.getPropertyValue('--sc-p')); return isNaN(v) ? 0 : v; };

  /* ------------------------------------------------------------- folio -- */
  var folio = document.querySelector('.folio');
  var fPage = document.getElementById('folioPage');
  var fName = document.getElementById('folioName');
  var chapters = Array.prototype.slice.call(document.querySelectorAll('[data-folio]'));
  var lastFolio = '';
  function updateFolio() {
    var probe = innerHeight * 0.32, hit = chapters[0];
    for (var i = 0; i < chapters.length; i++) {
      var r = chapters[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { hit = chapters[i]; break; }
    }
    var key = hit.getAttribute('data-folio');
    if (key === lastFolio) return;
    lastFolio = key;
    var parts = key.split('|');
    fPage.textContent = parts[0];
    fName.textContent = parts[1];
    var ground = hit.id === 'press' ? 'dark' : hit.id === 'coupon' ? 'accent' : (hit.id === 'world' || hit.id === 'classifieds') ? 'surface' : 'light';
    folio.setAttribute('data-ground', ground);
  }

  /* -------------------------------------------- A1: Lulu on her photo -- */
  var front = document.getElementById('front');
  var stage = front.querySelector('[data-sc-stage]');
  var frame = front.querySelector('.front__frame');
  var lulu = front.querySelector('.front__lulu');
  function placeLulu() {
    var p = actP(front);
    var s = stage.getBoundingClientRect();
    var f = frame.getBoundingClientRect();
    var shift = -26 * p; // the sheet's own translate, so we measure its rest pose
    var w = Math.min(f.width * 0.62, (f.height * 1.3) / 1.2);
    lulu.style.setProperty('--lulu-w', w.toFixed(1) + 'px');
    lulu.style.setProperty('--lulu-x', (f.left - s.left + f.width * 0.5).toFixed(1) + 'px');
    lulu.style.setProperty('--lulu-y', (f.bottom - s.top - shift - f.height * 0.1).toFixed(1) + 'px');
  }

  /* --------------------------------------------- A3: the press prints -- */
  var press = document.getElementById('press');
  var print = document.getElementById('print');
  var outlines = press.querySelectorAll('.outline');
  var tags = press.querySelectorAll('.tag');
  var scanline = press.querySelector('.scanline');
  function drawPress(p) {
    var feed = reduce ? 1 : ease(seg(p, 0.02, 0.38));
    print.style.setProperty('--feed', feed.toFixed(4));
    var scan = reduce ? 1 : seg(p, 0.40, 0.58);
    scanline.style.setProperty('--scan', scan.toFixed(4));
    scanline.style.setProperty('--scanOn', reduce ? 0 : (scan > 0 && scan < 1 ? 1 : 0));
    for (var i = 0; i < outlines.length; i++) {
      var a = 0.45 + i * 0.045;
      outlines[i].style.setProperty('--o', (reduce ? 1 : ease(seg(p, a, a + 0.09))).toFixed(4));
      var b = 0.55 + i * 0.045;
      tags[i].style.setProperty('--t', (reduce ? 1 : ease(seg(p, b, b + 0.06))).toFixed(4));
    }
    print.style.setProperty('--found', (reduce || p > 0.6) ? 1 : 0);
    print.style.setProperty('--v', (reduce ? 1 : ease(seg(p, 0.74, 0.86))).toFixed(4));
  }

  /* ---------------------------------------------- A4: globe and heat -- */
  var world = document.getElementById('world');
  var globe = document.getElementById('globe');
  var gctx = globe.getContext('2d');
  var heat = document.getElementById('heat');
  var hctx = heat.getContext('2d');
  var map = document.getElementById('map');
  var LAND = window.WW_LAND || [];
  var RAD = Math.PI / 180;
  var SOHNA = [77.07, 28.25];

  function sizeCanvas(c, cssW, cssH) {
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return dpr;
  }

  function drawGlobe(p) {
    var box = globe.getBoundingClientRect();
    if (!box.width) return;
    var dpr = sizeCanvas(globe, box.width, box.width);
    var W = globe.width, R = W * 0.46, cx = W / 2, cy = W / 2;
    var t = reduce ? 1 : ease(seg(p, 0.0, 0.5));
    var lon0 = -20 + t * 97.07;     // turns until Sohna faces us
    var lat0 = 8 + t * 16;
    var sl = Math.sin(lat0 * RAD), cl = Math.cos(lat0 * RAD);
    gctx.clearRect(0, 0, W, W);
    // the sphere itself, printed
    var g = gctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, '#F7FAF2'); g.addColorStop(1, '#DCE6CC');
    gctx.fillStyle = g; gctx.beginPath(); gctx.arc(cx, cy, R, 0, Math.PI * 2); gctx.fill();
    gctx.strokeStyle = 'rgba(14,38,25,.55)'; gctx.lineWidth = 1.2 * dpr; gctx.stroke();
    // graticule rings
    gctx.strokeStyle = 'rgba(14,38,25,.08)'; gctx.lineWidth = 1 * dpr;
    for (var k = -60; k <= 60; k += 30) {
      gctx.beginPath();
      var first = true;
      for (var L = -180; L <= 180; L += 4) {
        var pr = proj(L, k); if (!pr) { first = true; continue; }
        if (first) { gctx.moveTo(pr[0], pr[1]); first = false; } else gctx.lineTo(pr[0], pr[1]);
      }
      gctx.stroke();
    }
    var dot = Math.max(1.4, R / 150);
    for (var i = 0; i < LAND.length; i += 3) {
      var lon = LAND[i], lat = LAND[i + 1];
      var q = proj(lon, lat); if (!q) continue;
      var india = LAND[i + 2] === 1;
      gctx.globalAlpha = 0.35 + q[2] * 0.65;
      gctx.fillStyle = india ? '#08482D' : '#46594C';
      gctx.beginPath(); gctx.arc(q[0], q[1], india ? dot * 1.25 : dot, 0, Math.PI * 2); gctx.fill();
    }
    gctx.globalAlpha = 1;
    // hotspot
    var s = proj(SOHNA[0], SOHNA[1]);
    if (s) {
      var pulse = reduce ? 0.5 : (performance.now() / 1600) % 1;
      gctx.strokeStyle = 'rgba(255,65,54,' + (0.8 * (1 - pulse)).toFixed(3) + ')';
      gctx.lineWidth = 2 * dpr;
      gctx.beginPath(); gctx.arc(s[0], s[1], dot * (3 + pulse * 9), 0, Math.PI * 2); gctx.stroke();
      gctx.fillStyle = '#FF4136';
      gctx.beginPath(); gctx.arc(s[0], s[1], dot * 2.4, 0, Math.PI * 2); gctx.fill();
      gctx.strokeStyle = '#F7FAF2'; gctx.lineWidth = 1.5 * dpr; gctx.stroke();
    }
    function proj(lon, lat) {
      var la = lat * RAD, dl = (lon - lon0) * RAD;
      var cosc = sl * Math.sin(la) + cl * Math.cos(la) * Math.cos(dl);
      if (cosc < 0.02) return null;
      var x = Math.cos(la) * Math.sin(dl);
      var y = cl * Math.sin(la) - sl * Math.cos(la) * Math.cos(dl);
      return [cx + R * x, cy - R * y, cosc];
    }
  }

  // Sample reports for the illustrative map (positions in the 600 x 440 map).
  var REPORTS = [
    [292, 236, 'critical'], [318, 214, 'high'], [250, 268, 'high'], [208, 300, 'medium'],
    [380, 162, 'critical'], [404, 150, 'medium'], [438, 288, 'high'], [470, 352, 'medium'],
    [120, 352, 'low'], [90, 175, 'low'], [160, 228, 'medium'], [520, 120, 'low'],
    [345, 190, 'high'], [560, 300, 'low'], [276, 250, 'medium']
  ];
  var SEV = { critical: [255, 65, 54, 1.0], high: [255, 138, 0, 0.8], medium: [245, 180, 0, 0.62], low: [34, 197, 94, 0.45] };
  function drawHeat(p) {
    var box = heat.getBoundingClientRect();
    if (!box.width) return;
    sizeCanvas(heat, box.width, box.height);
    var W = heat.width, H = heat.height, sx = W / 600, sy = H / 440;
    hctx.clearRect(0, 0, W, H);
    for (var i = 0; i < REPORTS.length; i++) {
      var r = REPORTS[i], c = SEV[r[2]];
      var a = reduce ? 1 : ease(seg(p, 0.32 + i * 0.012, 0.48 + i * 0.012));
      if (a <= 0) continue;
      var rad = (34 + c[3] * 46) * sx * (0.6 + 0.4 * a);
      var g = hctx.createRadialGradient(r[0] * sx, r[1] * sy, 0, r[0] * sx, r[1] * sy, rad);
      g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.75 * a * c[3] + 0.15 * a).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
      hctx.fillStyle = g;
      hctx.beginPath(); hctx.arc(r[0] * sx, r[1] * sy, rad, 0, Math.PI * 2); hctx.fill();
    }
    for (var j = 0; j < REPORTS.length; j++) {
      var q = REPORTS[j], cc = SEV[q[2]];
      var b = reduce ? 1 : seg(p, 0.38 + j * 0.012, 0.42 + j * 0.012);
      if (b <= 0) continue;
      hctx.globalAlpha = b;
      hctx.fillStyle = 'rgb(' + cc[0] + ',' + cc[1] + ',' + cc[2] + ')';
      hctx.beginPath(); hctx.arc(q[0] * sx, q[1] * sy, 5 * sx, 0, Math.PI * 2); hctx.fill();
      hctx.strokeStyle = '#0E2619'; hctx.lineWidth = 1.4 * sx; hctx.stroke();
    }
    hctx.globalAlpha = 1;
    map.style.setProperty('--route', (reduce ? 1 : ease(seg(p, 0.52, 0.78))).toFixed(4));
  }

  /* -------------------------------------------- the coupon is clipped -- */
  var coupon = document.getElementById('coupon');
  var card = document.getElementById('couponCard');
  function drawCoupon(p) {
    card.style.setProperty('--cw', card.offsetWidth + 'px');
    card.style.setProperty('--snip', (reduce ? 1 : ease(seg(p, 0.02, 0.5))).toFixed(4));
    card.style.setProperty('--cut', (reduce ? 1 : ease(seg(p, 0.5, 0.72))).toFixed(4));
  }

  /* --------------------------------------------------- the frame loop -- */
  function inView(el) { var r = el.getBoundingClientRect(); return r.bottom > -40 && r.top < innerHeight + 40; }
  var last = {};
  function tick() {
    updateFolio();
    if (inView(front)) placeLulu();
    var pp = actP(press);
    if (inView(press) && last.press !== pp) { drawPress(pp); last.press = pp; }
    if (inView(world)) { var wp = actP(world); drawGlobe(wp); if (last.world !== wp) { drawHeat(wp); last.world = wp; } }
    var cp = actP(coupon);
    if (inView(coupon) && last.coupon !== cp) { drawCoupon(cp); last.coupon = cp; }
    requestAnimationFrame(tick);
  }
  drawPress(actP(press));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeLulu);
  addEventListener('resize', function () { last = {}; placeLulu(); });
  requestAnimationFrame(tick);
})();
