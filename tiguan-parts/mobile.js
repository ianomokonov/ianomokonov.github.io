/* Мобильная версия: только просмотр журнала замен и регламента. */
(function () {
  'use strict';

  var DATA = window.TIGUAN_DATA;
  var LS = {
    log: 'tiguan.log.v1',
    custom: 'tiguan.custom.v1',
    deleted: 'tiguan.deleted.v1',
    oem: 'tiguan.oem.v1',
    fluid: 'tiguan.fluid.v1'
  };

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function fmtKm(n) {
    return Number(n).toLocaleString('ru-RU') + ' км';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var p = String(iso).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso;
  }

  var deleted = readJSON(LS.deleted, { log: [], custom: [] });
  if (!Array.isArray(deleted.log)) deleted.log = [];
  if (!Array.isArray(deleted.custom)) deleted.custom = [];

  /* ---------- свои детали и жидкости ---------- */
  var customSeed = Array.isArray(window.TIGUAN_CUSTOM_SEED) ? window.TIGUAN_CUSTOM_SEED : [];
  var custom = [];
  customSeed.concat(readJSON(LS.custom, [])).forEach(function (p) {
    if (!p || !p.id) return;
    if (deleted.custom.indexOf(p.id) >= 0) return;
    if (!custom.some(function (x) { return x.id === p.id; })) custom.push(p);
  });

  var FLUID_PARTS = (DATA.fluids || []).map(function (f) {
    return {
      id: 'fluid:' + f.id,
      fluidId: f.id,
      isFluid: true,
      name: f.title,
      oem: f.code,
      system: 'fluids'
    };
  });

  var allParts = DATA.parts.concat(custom, FLUID_PARTS);
  var byId = {};
  allParts.forEach(function (p) { byId[p.id] = p; });

  var FLUIDS = {};
  (DATA.fluids || []).forEach(function (f) { FLUIDS[f.id] = f; });

  var oemOverrides = readJSON(LS.oem, {});
  var fluidOverrides = readJSON(LS.fluid, {});

  function codeOf(p) {
    if (p.isFluid) {
      var f = FLUIDS[p.fluidId];
      return (f && (fluidOverrides[p.fluidId] || f.code)) || '—';
    }
    return oemOverrides[p.id] || p.oem;
  }

  /* ---------- журнал: seed + локальные записи ---------- */
  var logBook = {};

  function pushRecord(key, r) {
    if (!r || !r.id) return;
    if (deleted.log.indexOf(r.id) >= 0) return;
    if (!logBook[key]) logBook[key] = [];
    if (!logBook[key].some(function (x) { return x.id === r.id; })) {
      logBook[key].push({ id: r.id, date: r.date, km: Number(r.km) || 0 });
    }
  }

  Object.keys(window.TIGUAN_LOG_SEED || {}).forEach(function (key) {
    (window.TIGUAN_LOG_SEED[key] || []).forEach(function (r) { pushRecord(key, r); });
  });
  Object.keys(readJSON(LS.log, {})).forEach(function (key) {
    (readJSON(LS.log, {})[key] || []).forEach(function (r) { pushRecord(key, r); });
  });

  var rows = [];
  allParts.forEach(function (p) {
    (logBook[p.id] || []).forEach(function (r) {
      rows.push({
        km: Number(r.km) || 0,
        date: r.date,
        name: p.name,
        code: codeOf(p),
        kind: p.isFluid ? 'жидкость' : 'деталь',
        system: p.system
      });
    });
  });
  rows.sort(function (a, b) {
    return a.km - b.km || String(a.date).localeCompare(String(b.date));
  });

  var groups = [];
  rows.forEach(function (r) {
    var last = groups[groups.length - 1];
    if (!last || last.km !== r.km) {
      groups.push({ km: r.km, items: [r] });
    } else {
      last.items.push(r);
    }
  });

  /* ---------- рендер журнала ---------- */
  var journalBody = document.getElementById('journalBody');
  var journalSub = document.getElementById('journalSub');
  var latestKm = groups.length ? groups[groups.length - 1].km : null;

  journalSub.textContent = rows.length
    ? rows.length + ' записей · ' + groups.length + ' пробегов · только просмотр'
    : 'Записей пока нет';

  if (!groups.length) {
    journalBody.innerHTML = '<p class="m-empty">В data/log-seed.js ещё нет замен. Экспортируйте журнал на компьютере кнопкой «Скопировать log-seed.js» и запушьте файл.</p>';
  } else {
    journalBody.innerHTML = groups
      .slice()
      .reverse()
      .map(function (g) {
        var open = g.km === latestKm;
        return (
          '<section class="m-group ' + (open ? 'is-open' : '') + '">' +
          '<button type="button" class="m-group-head" data-km="' + g.km + '">' +
          '<span class="m-group-title">' + fmtKm(g.km) + '</span>' +
          '<span class="m-group-count">' + g.items.length + '</span>' +
          '<span class="m-chev">›</span>' +
          '</button>' +
          '<div class="m-group-body"' + (open ? '' : ' hidden') + '>' +
          g.items
            .map(function (r) {
              return (
                '<div class="m-row">' +
                '<div class="m-row-name">' + esc(r.name) +
                (r.kind === 'жидкость' ? '<span class="m-dot" title="жидкость"></span>' : '') +
                '</div>' +
                '<div class="m-row-meta">' +
                '<span class="m-row-date">' + fmtDate(r.date) + '</span>' +
                '<span class="m-row-code">' + esc(r.code) + '</span>' +
                '</div>' +
                '</div>'
              );
            })
            .join('') +
          '</div></section>'
        );
      })
      .join('');
  }

  journalBody.addEventListener('click', function (e) {
    var head = e.target.closest('.m-group-head');
    if (!head) return;
    var group = head.parentNode;
    var body = group.querySelector('.m-group-body');
    var open = body.hidden;
    body.hidden = !open;
    group.classList.toggle('is-open', open);
  });

  /* ---------- регламент ---------- */
  var KM_STEP = 15000;
  var KM_MAX = 250000;
  var KM_POINTS = [];
  for (var km = KM_STEP; km <= KM_MAX; km += KM_STEP) KM_POINTS.push(km);

  function scheduleAt(km) {
    var out = [];
    DATA.parts.forEach(function (p) {
      var s = p.service;
      if (!s) return;
      if (s.atKm && s.atKm.length) {
        if (s.atKm.indexOf(km) >= 0) out.push({ p: p, s: s });
        return;
      }
      if (s.everyKm && km >= (s.firstAtKm || s.everyKm) && km % s.everyKm === 0) out.push({ p: p, s: s });
    });
    (DATA.fluids || []).forEach(function (f) {
      if (f.everyKm && km >= f.everyKm && km % f.everyKm === 0) {
        out.push({ f: f, s: { action: f.action, everyKm: f.everyKm } });
      }
    });
    return out;
  }

  var kmRow = document.getElementById('kmRow');
  var scheduleBody = document.getElementById('scheduleBody');
  var currentKm = 60000;

  function renderSchedule(km) {
    currentKm = km;
    kmRow.innerHTML = KM_POINTS.map(function (k) {
      return '<button type="button" class="m-chip' + (k === km ? ' is-active' : '') + '" data-km="' + k + '">' + fmtKm(k) + '</button>';
    }).join('');

    var rowsAt = scheduleAt(km);
    if (!rowsAt.length) {
      scheduleBody.innerHTML = '<p class="m-empty">На этом пробеге плановых работ нет.</p>';
      return;
    }
    scheduleBody.innerHTML = rowsAt
      .map(function (r) {
        var action = r.s.action || 'замена';
        var name = r.f ? r.f.title : r.p.name;
        var code = r.f ? (r.f.code || '—') : (oemOverrides[r.p.id] || r.p.oem);
        return (
          '<div class="m-row m-sched">' +
          '<div class="m-row-name"><span class="m-act ' + (action === 'проверка' ? 'is-check' : '') + '">' + esc(action) + '</span>' + esc(name) + '</div>' +
          '<div class="m-row-meta"><span class="m-row-code">' + esc(code) + '</span></div>' +
          '</div>'
        );
      })
      .join('');
  }

  kmRow.addEventListener('click', function (e) {
    var chip = e.target.closest('.m-chip');
    if (chip) renderSchedule(Number(chip.dataset.km));
  });
  renderSchedule(currentKm);

  /* ---------- вкладки ---------- */
  var tabs = document.getElementById('tabs');
  tabs.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-view]');
    if (!btn) return;
    document.body.dataset.view = btn.dataset.view;
    document.querySelectorAll('#tabs button').forEach(function (b) {
      b.classList.toggle('is-active', b === btn);
    });
    document.getElementById('journal').hidden = btn.dataset.view !== 'journal';
    document.getElementById('schedule').hidden = btn.dataset.view !== 'schedule';
    var sub = document.querySelector('.m-brand small');
    if (sub) sub.textContent = btn.dataset.view === 'schedule' ? 'регламент ТО' : 'журнал замен';
    window.scrollTo(0, 0);
  });

  /* ---------- PDF ---------- */
  function exportPdf() {
    var byKm = {};
    rows.forEach(function (r) {
      if (!byKm[r.km]) byKm[r.km] = [];
      byKm[r.km].push(r);
    });
    var kms = Object.keys(byKm).map(Number).sort(function (a, b) { return a - b; });

    var body = kms.length
      ? kms
          .map(function (km) {
            var items = byKm[km];
            return (
              '<section class="print-group">' +
              '<h2>' + fmtKm(km) + '</h2>' +
              '<table><thead><tr><th>Дата</th><th>Деталь / жидкость</th><th>Номер / код</th></tr></thead><tbody>' +
              items
                .map(function (r) {
                  return '<tr><td>' + fmtDate(r.date) + '</td><td>' + esc(r.name) + '</td><td class="mono">' + esc(r.code) + '</td></tr>';
                })
                .join('') +
              '</tbody></table></section>'
            );
          })
          .join('')
      : '<p>Записей о заменах пока нет.</p>';

    document.getElementById('printArea').innerHTML =
      '<div class="print-doc">' +
      '<h1>Tiguan II — журнал замен</h1>' +
      '<p class="print-meta">VIN ' + esc(DATA.vehicle.vin) + ' · ' + esc(DATA.vehicle.meta) + ' · записей: ' + rows.length + '</p>' +
      body +
      '</div>';

    setTimeout(function () { window.print(); }, 120);
  }

  document.getElementById('btnPdf').addEventListener('click', exportPdf);
})();
