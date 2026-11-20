// three.js и данные приходят глобальными: см. index.html.
const THREE = window.THREE;
const { OrbitControls, RoomEnvironment, RoundedBoxGeometry } = window;
const DIAGRAMS = window.DIAGRAMS;

/* ------------------------------------------------------------------ */
/*  утилиты                                                            */
/* ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/[\s\-·]/g, '');

const LS = { oem: 'tiguan.oem.v1', fav: 'tiguan.fav.v1' };
const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* приватный режим — просто не сохраняем */
  }
};

/* ------------------------------------------------------------------ */
/*  данные                                                             */
/* ------------------------------------------------------------------ */

const DATA = window.TIGUAN_DATA;
const PARTS = new Map(DATA.parts.map((p) => [p.id, p]));
const SYSTEMS = new Map(DATA.systems.map((s) => [s.id, s]));
const DIAGRAM_INFO = new Map(DATA.diagrams.map((d) => [d.id, d]));
const FLUIDS = new Map((DATA.fluids || []).map((f) => [f.id, f]));
const ZONES = new Map(DATA.zones.map((z) => [z.id, z]));

const CONF = {
  high: { label: 'сверено', cls: 'high' },
  medium: { label: 'вероятно', cls: 'medium' },
  low: { label: 'проверить', cls: 'low' }
};

let oemOverrides = readJSON(LS.oem, {});
let favorites = new Set(readJSON(LS.fav, []));
const oemOf = (p) => oemOverrides[p.id] || p.oem;
const isFav = (id) => favorites.has(id);

/* ------------------------------------------------------------------ */
/*  состояние и маршруты                                               */
/* ------------------------------------------------------------------ */

let current = { view: 'car', diagram: null, part: null, system: null };
let catalogNote = '';

function go(hash) {
  if (location.hash === hash) return;
  location.hash = hash;
}

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [a, b, c] = raw.split('/');
  if (a === 'd' && b) return { view: 'diagram', diagram: b, part: c || null };
  if (a === 'p' && b) return { view: 'part', part: b };
  if (a === 'catalog') return { view: 'catalog', system: b || null };
  if (a === 'schedule') return { view: 'schedule', km: b ? Number(b) : null };
  if (a === 'fav') return { view: 'favorites' };
  return { view: 'car' };
}

function route() {
  const r = parseRoute();
  let view = r.view;
  let diagram = r.diagram || null;
  let part = r.part || null;
  const system = r.system || null;

  if (view === 'part') {
    const p = PARTS.get(part);
    if (!p) return showCarState();
    if (p.diagram) {
      diagram = p.diagram;
      view = 'diagram';
    } else {
      current = { view: 'catalog', diagram: null, part, system: p.system };
      setView('catalog');
      renderCatalog(p.system, false);
      renderPanel(part);
      renderCrumbs();
      syncTabs();
      return;
    }
  }

  if (view === 'diagram') {
    if (!DIAGRAMS[diagram]) return showCarState();
    if (current.diagram !== diagram) renderDiagram(diagram);
    current = { view, diagram, part: part && PARTS.has(part) ? part : null, system: null };
    setView('diagram');
    setSelected(current.part);
    renderPanel(current.part);
  } else if (view === 'schedule') {
    current = { view: 'schedule', diagram: null, part: null, system: null, km: Number(r.km) || 60000 };
    setView('schedule');
    renderPanel(null);
    renderSchedule(current.km);
  } else if (view === 'catalog' || view === 'favorites') {
    current = { view, diagram: null, part: null, system: view === 'favorites' ? null : system };
    setView('catalog');
    renderPanel(null);
    renderCatalog(current.system, view === 'favorites');
  } else {
    showCarState();
    return;
  }

  renderCrumbs();
  syncTabs();
}

function showCarState() {
  current = { view: 'car', diagram: null, part: null, system: null };
  setView('car');
  renderPanel(null);
  renderCrumbs();
  syncTabs();
}

function setView(name) {
  document.body.dataset.view = name;
  $('#stage').hidden = name !== 'car';
  $('#schema').hidden = name !== 'diagram';
  $('#catalog').hidden = name !== 'catalog';
  $('#schedule').hidden = name !== 'schedule';
  if (name === 'car') {
    hideTip();
    requestAnimationFrame(resize);
  }
}

/* ------------------------------------------------------------------ */
/*  схема                                                              */
/* ------------------------------------------------------------------ */

function renderDiagram(id) {
  const info = DIAGRAM_INFO.get(id);
  $('#schemaTitle').textContent = info.title;
  $('#schemaSub').textContent = info.subtitle;
  $('#schemaBody').innerHTML = DIAGRAMS[id];
  $('#schemaRelated').innerHTML = (info.related || [])
    .map((r) => `<button type="button" class="chip" data-diagram="${r.id}">${esc(r.title)} →</button>`)
    .join('');
}

function setSelected(partId) {
  $$('#schemaBody .hotspot').forEach((hs) => {
    hs.classList.toggle('is-selected', !!partId && hs.dataset.part === partId);
  });
}

$('#schemaBody').addEventListener('click', (e) => {
  const hs = e.target.closest('.hotspot');
  if (!hs) return;
  if (hs.dataset.part) go(`#/d/${current.diagram}/${hs.dataset.part}`);
  else if (hs.dataset.diagram) go(`#/d/${hs.dataset.diagram}`);
});

$('#schemaBody').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const hs = e.target.closest('.hotspot');
  if (!hs) return;
  e.preventDefault();
  hs.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});

$('#schemaRelated').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-diagram]');
  if (btn) go(`#/d/${btn.dataset.diagram}`);
});

/* ------------------------------------------------------------------ */
/*  карточка детали                                                    */
/* ------------------------------------------------------------------ */

function renderPanel(partId) {
  const panel = $('#panel');
  const body = $('#panelBody');
  const p = partId ? PARTS.get(partId) : null;

  if (!p) {
    panel.classList.remove('is-open');
    document.body.dataset.panel = 'closed';
    body.innerHTML = '';
    return;
  }

  body.innerHTML = cardHTML(p);
  panel.classList.add('is-open');
  document.body.dataset.panel = 'open';
}

function cardHTML(p) {
  const oem = oemOf(p);
  const changed = !!oemOverrides[p.id];
  const conf = CONF[p.confidence] || CONF.medium;
  const sys = SYSTEMS.get(p.system);
  const fluid = p.fluid ? FLUIDS.get(p.fluid) : null;
  const drawn = !!document.querySelector(`#schemaBody [data-part="${p.id}"]`);

  return `
    <div class="card-head">
      <span class="badge badge-${conf.cls}">${conf.label}</span>
      <button type="button" class="icon-btn ${isFav(p.id) ? 'is-on' : ''}" data-act="fav" title="В избранное">★</button>
      <button type="button" class="icon-btn" data-act="close" title="Закрыть (Esc)">✕</button>
    </div>
    <h3>${esc(p.name)}</h3>
    <div class="oem-row" data-oem-row>
      <code class="oem">${esc(oem)}</code>
      <button type="button" class="icon-btn" data-act="copy" title="Скопировать номер">⧉</button>
      <button type="button" class="icon-btn" data-act="edit" title="Исправить номер">✎</button>
    </div>
    ${changed ? `<div class="oem-note">изменено вручную <span class="orig">${esc(p.oem)}</span><button type="button" data-act="reset">вернуть</button></div>` : ''}
    <dl class="meta">
      <div><dt>Система</dt><dd>${esc(sys.title)}</dd></div>
      <div><dt>Количество</dt><dd>${p.qty} шт.</dd></div>
      <div><dt>Где искать</dt><dd>${esc(p.location)}</dd></div>
    </dl>
    ${serviceBlock(p)}
    ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
    ${fluid ? fluidBlock(fluid) : ''}
    ${p.zone ? miniMap(p.zone) : ''}
    <div class="panel-actions">
      <button type="button" class="btn" data-act="catalog">Все детали системы</button>
      ${drawn || p.diagram ? `<button type="button" class="btn btn-primary" data-act="diagram">${drawn ? 'Показать на схеме' : 'Схема узла'}</button>` : ''}
    </div>`;
}

function fmtKm(n) {
  return `${Number(n).toLocaleString('ru-RU')} км`;
}

function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function serviceBlock(p) {
  const s = p.service;
  if (!s) return '';
  const when = s.atKm && s.atKm.length
    ? s.atKm.map(fmtKm).join(', ')
    : s.everyKm
      ? `каждые ${fmtKm(s.everyKm)}`
      : '';
  if (!when) return '';
  return `<div class="svc"><span class="svc-act">${esc(s.action || 'замена')}</span><span class="svc-when">${esc(when)}</span></div>`;
}

function fluidBlock(f) {
  return `<div class="fluid">
    <div class="fluid-title">${esc(f.title)}</div>
    <dl class="fluid-list">
      <div><dt>Характеристики</dt><dd>${esc(f.spec)}</dd></div>
      ${f.code && f.code !== '—' ? `<div><dt>Код</dt><dd class="fluid-code">${esc(f.code)}</dd></div>` : ''}
      <div><dt>Объём</dt><dd>${esc(f.volume)}</dd></div>
      <div><dt>Замена</dt><dd>${esc(f.interval)}</dd></div>
    </dl>
  </div>`;
}

function miniMap(zoneId) {
  const z = ZONES.get(zoneId);
  const m = (z && z.marker) || { x: 100, y: 45 };
  return `
  <div class="minimap" aria-hidden="true">
    <svg viewBox="0 0 200 82">
      <path class="mm-body" d="M 10 58 L 10 46 Q 10 40 20 38 L 44 34 Q 56 18 78 16 L 122 16 Q 142 17 154 32 L 182 38 Q 192 41 192 50 L 192 58 Z"/>
      <circle class="mm-wheel" cx="52" cy="58" r="12"/>
      <circle class="mm-wheel" cx="150" cy="58" r="12"/>
      <circle class="mm-pulse" cx="${m.x}" cy="${m.y}" r="7"/>
      <circle class="mm-dot" cx="${m.x}" cy="${m.y}" r="3.4"/>
      <text class="mm-cap" x="12" y="79">перед</text>
      <text class="mm-cap" x="188" y="79" text-anchor="end">зад</text>
    </svg>
  </div>`;
}

$('#panelBody').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  const p = PARTS.get(current.part);
  if (!p) return;

  if (act === 'close') {
    if (current.view === 'diagram') go(`#/d/${current.diagram}`);
    else go(`#/catalog/${p.system}`);
  } else if (act === 'copy') {
    await copyText(oemOf(p));
    toast('Номер скопирован');
  } else if (act === 'fav') {
    toggleFav(p.id);
  } else if (act === 'edit') {
    startOemEdit(p);
  } else if (act === 'reset') {
    delete oemOverrides[p.id];
    writeJSON(LS.oem, oemOverrides);
    renderPanel(p.id);
    renderCatalog(current.system, current.view === 'favorites');
    toast('Вернул исходный номер');
  } else if (act === 'catalog') {
    go(`#/catalog/${p.system}`);
  } else if (act === 'diagram') {
    if (p.diagram) go(`#/d/${p.diagram}/${p.id}`);
  }
});

function startOemEdit(p) {
  const row = $('[data-oem-row]');
  if (!row) return;
  row.innerHTML = `
    <input class="oem-edit" id="oemInput" value="${esc(oemOf(p))}" spellcheck="false" autocomplete="off">
    <button type="button" class="icon-btn" data-act="save" title="Сохранить">✓</button>
    <button type="button" class="icon-btn" data-act="cancel" title="Отмена">✕</button>`;

  const input = $('#oemInput');
  input.focus();
  input.select();

  const save = () => {
    const value = input.value.trim().replace(/\s+/g, ' ');
    if (!value) return;
    if (value === p.oem) delete oemOverrides[p.id];
    else oemOverrides[p.id] = value;
    writeJSON(LS.oem, oemOverrides);
    renderPanel(p.id);
    if (!$('#searchResults').hidden) refreshSearch();
    toast('Номер сохранён в этом браузере');
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') {
      e.stopPropagation();
      renderPanel(p.id);
    }
  });

  row.querySelector('[data-act="save"]').addEventListener('click', save);
  row.querySelector('[data-act="cancel"]').addEventListener('click', () => renderPanel(p.id));
}

function toggleFav(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  writeJSON(LS.fav, [...favorites]);

  if (current.part) renderPanel(current.part);
  if (current.view === 'catalog' || current.view === 'favorites') {
    renderCatalog(current.system, current.view === 'favorites');
  }
  toast(favorites.has(id) ? 'Добавлено в избранное' : 'Убрано из избранного');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

/* ------------------------------------------------------------------ */
/*  каталог                                                            */
/* ------------------------------------------------------------------ */

function renderCatalog(system, favMode) {
  const parts = DATA.parts.filter((p) => (favMode ? isFav(p.id) : !system || p.system === system));

  $('#catalogTitle').textContent = favMode ? 'Избранное' : system ? SYSTEMS.get(system).title : 'Все детали';
  $('#catalogSub').textContent = favMode
    ? `${parts.length} отмечено · звёздочка в карточке`
    : `${parts.length} из ${DATA.parts.length} · номер можно исправить в карточке`;

  const chips = [];
  if (system && !favMode) chips.push(`<button type="button" class="chip" data-system="all">Все системы</button>`);
  DATA.systems.forEach((s) => {
    const count = DATA.parts.filter((p) => p.system === s.id && (!favMode || isFav(p.id))).length;
    if (!count) return;
    chips.push(
      `<button type="button" class="chip ${system === s.id ? 'is-active' : ''}" data-system="${s.id}">${esc(s.title)} <span class="chip-count">${count}</span></button>`
    );
  });
  $('#catalogFilters').innerHTML = chips.join('');

  const banner = $('#catalogBanner');
  if (catalogNote) {
    banner.hidden = false;
    banner.textContent = catalogNote;
    catalogNote = '';
  } else {
    banner.hidden = true;
  }

  $('#catalogBody').innerHTML = parts.length
    ? parts
        .map(
          (p) => `
      <div class="part-card" role="button" tabindex="0" data-part="${p.id}">
        <span class="pc-name">${esc(p.name)}</span>
        <span class="pc-oem">${esc(oemOf(p))}</span>
        <span class="pc-system">${esc(SYSTEMS.get(p.system).title)}${oemOverrides[p.id] ? ' · номер изменён' : ''}</span>
        ${p.service ? `<span class="pc-service">${esc(p.service.action || 'замена')} ${p.service.atKm ? 'на ' + p.service.atKm.map(fmtKm).join(', ') : p.service.everyKm ? 'каждые ' + fmtKm(p.service.everyKm) : ''}</span>` : ''}
        <button type="button" class="pc-fav ${isFav(p.id) ? 'is-on' : ''}" data-fav="${p.id}" title="В избранное">★</button>
      </div>`
        )
        .join('')
    : `<p class="catalog-empty">${favMode ? 'Пока ничего не отмечено. Откройте деталь и нажмите ★.' : 'Ничего не найдено.'}</p>`;
}

$('#catalogBody').addEventListener('click', (e) => {
  const fav = e.target.closest('.pc-fav');
  if (fav) {
    e.stopPropagation();
    toggleFav(fav.dataset.fav);
    return;
  }
  const card = e.target.closest('.part-card');
  if (!card) return;
  const p = PARTS.get(card.dataset.part);
  if (p) go(p.diagram ? `#/d/${p.diagram}/${p.id}` : `#/p/${p.id}`);
});

$('#catalogBody').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.part-card');
  if (!card) return;
  e.preventDefault();
  card.click();
});

$('#catalogFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-system]');
  if (!btn) return;
  const v = btn.dataset.system;
  go(v === 'all' ? '#/catalog' : `#/catalog/${v}`);
});


/* ------------------------------------------------------------------ */
/*  регламент ТО                                                       */
/* ------------------------------------------------------------------ */

const KM_STEP = 15000;
const KM_MAX = 250000;
const KM_POINTS = Array.from({ length: Math.floor(KM_MAX / KM_STEP) }, (_, i) => (i + 1) * KM_STEP);

function scheduleAt(km) {
  const rows = [];

  DATA.parts.forEach((p) => {
    const s = p.service;
    if (!s) return;
    if (s.atKm && s.atKm.length) {
      if (s.atKm.includes(km)) rows.push({ p, s });
      return;
    }
    if (s.everyKm && km >= (s.firstAtKm || s.everyKm) && km % s.everyKm === 0) rows.push({ p, s });
  });

  (DATA.fluids || []).forEach((f) => {
    if (f.everyKm && km >= f.everyKm && km % f.everyKm === 0) {
      rows.push({ f, s: { action: f.action, everyKm: f.everyKm } });
    }
  });

  return rows;
}

function renderSchedule(km) {
  if (!KM_POINTS.includes(km)) km = 60000;

  $('#kmRow').innerHTML = KM_POINTS.map(
    (k) => `<button type="button" class="km-chip ${k === km ? 'is-active' : ''}" data-km="${k}">${fmtKm(k)}</button>`
  ).join('');

  const rows = scheduleAt(km);
  const groups = new Map();
  rows.forEach((r) => {
    const sysId = r.p ? r.p.system : r.f.system;
    if (!groups.has(sysId)) groups.set(sysId, []);
    groups.get(sysId).push(r);
  });

  const order = DATA.systems.map((x) => x.id);
  const sorted = [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  const changes = rows.filter((r) => (r.s.action || 'замена') === 'замена').length;

  const checks = rows.length - changes;
  $('#scheduleSub').textContent = rows.length
    ? `${fmtKm(km)} · ${rows.length} ${plural(rows.length, 'работа', 'работы', 'работ')}: ` +
      `${changes} ${plural(changes, 'замена', 'замены', 'замен')}, ${checks} ${plural(checks, 'проверка', 'проверки', 'проверок')}`
    : `${fmtKm(km)} · плановых работ нет`;

  $('#scheduleBody').innerHTML = sorted.length
    ? sorted
        .map(
          ([sysId, items]) => `
        <div class="sched-group">
          <div class="sched-group-title">${esc(SYSTEMS.get(sysId).title)}</div>
          ${items.map(scheduleRowHTML).join('')}
        </div>`
        )
        .join('')
    : `<p class="catalog-empty">На этом пробеге плановых работ нет.</p>`;
}

function scheduleRowHTML(r) {
  const action = r.s.action || 'замена';
  if (r.f) {
    const meta = r.f.code && r.f.code !== '—' ? `${r.f.code} · ${r.f.volume}` : r.f.volume;
    return `<div class="sched-item is-fluid">
      <span class="si-act ${action === 'проверка' ? 'is-check' : ''}">${esc(action)}</span>
      <span class="si-name">${esc(r.f.title)}</span>
      <span class="si-meta">${esc(meta)}</span>
    </div>`;
  }
  return `<button type="button" class="sched-item" data-part="${r.p.id}">
    <span class="si-act ${action === 'проверка' ? 'is-check' : ''}">${esc(action)}</span>
    <span class="si-name">${esc(r.p.name)}</span>
    <span class="si-meta">${esc(oemOf(r.p))}</span>
  </button>`;
}

$('#kmRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-km]');
  if (btn) go(`#/schedule/${btn.dataset.km}`);
});

$('#scheduleBody').addEventListener('click', (e) => {
  const item = e.target.closest('[data-part]');
  if (!item) return;
  const p = PARTS.get(item.dataset.part);
  if (!p) return;
  go(p.diagram ? `#/d/${p.diagram}/${p.id}` : `#/p/${p.id}`);
});

/* ------------------------------------------------------------------ */
/*  хлебные крошки, вкладки                                            */
/* ------------------------------------------------------------------ */

function renderCrumbs() {
  const items = [`<button type="button" data-crumb="car">Tiguan II</button>`];

  if (current.view === 'diagram') {
    items.push(`<span class="sep">›</span><button type="button" data-crumb="diagram">${esc(DIAGRAM_INFO.get(current.diagram).title)}</button>`);
    if (current.part) items.push(`<span class="sep">›</span><span class="current">${esc(PARTS.get(current.part).name)}</span>`);
  } else if (current.view === 'schedule') {
    items.push(`<span class="sep">›</span><span class="current">Регламент ТО</span>`);
  } else if (current.view === 'catalog') {
    items.push(`<span class="sep">›</span><span class="current">${esc(current.system ? SYSTEMS.get(current.system).title : 'Все детали')}</span>`);
    if (current.part) items.push(`<span class="sep">›</span><span class="current">${esc(PARTS.get(current.part).name)}</span>`);
  } else if (current.view === 'favorites') {
    items.push(`<span class="sep">›</span><span class="current">Избранное</span>`);
  }

  $('#crumbs').innerHTML = items.join('');
}

$('#crumbs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-crumb]');
  if (!btn) return;
  if (btn.dataset.crumb === 'car') go('#/car');
  else go(`#/d/${current.diagram}`);
});

function syncTabs() {
  const map = { car: 'car', diagram: 'car', catalog: 'catalog', favorites: 'favorites', schedule: 'schedule' };
  $$('#tabs button').forEach((b) => b.classList.toggle('is-active', b.dataset.view === map[current.view]));
}

$$('#tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    const v = b.dataset.view;
    go(v === 'car' ? '#/car' : v === 'catalog' ? '#/catalog' : v === 'schedule' ? '#/schedule' : '#/fav');
  });
});

/* ------------------------------------------------------------------ */
/*  поиск                                                              */
/* ------------------------------------------------------------------ */

const searchInput = $('#search');
const searchResults = $('#searchResults');
let searchActive = -1;
let searchItems = [];

function refreshSearch() {
  const q = norm(searchInput.value.trim());
  if (!q) {
    hideSearch();
    return;
  }

  searchItems = DATA.parts
    .filter((p) => norm(p.name).includes(q) || norm(oemOf(p)).includes(q))
    .slice(0, 8);

  if (!searchItems.length) {
    searchResults.innerHTML = `<div class="search-empty">Ничего не найдено</div>`;
    searchResults.hidden = false;
    return;
  }

  searchResults.innerHTML = searchItems
    .map(
      (p, i) => `
      <button type="button" class="search-item ${i === searchActive ? 'is-active' : ''}" data-part="${p.id}">
        <span class="nm">${esc(p.name)}</span>
        <span class="no">${esc(oemOf(p))}</span>
      </button>`
    )
    .join('');
  searchResults.hidden = false;
}

function hideSearch() {
  searchResults.hidden = true;
  searchResults.innerHTML = '';
  searchActive = -1;
}

searchInput.addEventListener('input', () => {
  searchActive = -1;
  refreshSearch();
});

searchInput.addEventListener('focus', () => {
  if (searchInput.value.trim()) refreshSearch();
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideSearch();
    searchInput.blur();
    return;
  }
  if (!searchItems.length || searchResults.hidden) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    searchActive = (searchActive + (e.key === 'ArrowDown' ? 1 : -1) + searchItems.length) % searchItems.length;
    refreshSearch();
  } else if (e.key === 'Enter') {
    const p = searchItems[Math.max(0, searchActive)];
    if (p) {
      hideSearch();
      searchInput.blur();
      go(p.diagram ? `#/d/${p.diagram}/${p.id}` : `#/p/${p.id}`);
    }
  }
});

searchResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-part]');
  if (!item) return;
  const p = PARTS.get(item.dataset.part);
  hideSearch();
  searchInput.blur();
  if (p) go(p.diagram ? `#/d/${p.diagram}/${p.id}` : `#/p/${p.id}`);
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search')) hideSearch();
});

/* ------------------------------------------------------------------ */
/*  тост                                                               */
/* ------------------------------------------------------------------ */

let toastTimer = 0;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-on'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('is-on');
    setTimeout(() => (el.hidden = true), 220);
  }, 1800);
}

/* ------------------------------------------------------------------ */
/*  three.js: сцена                                                    */
/* ------------------------------------------------------------------ */

let renderer;
let scene;
let camera;
let controls;
let stageEl;
let canvasEl;
let tooltipEl;
let raycaster;
const pointerNDC = new THREE.Vector2(-10, -10);
const pickables = [];
const meshesByZone = new Map();
const clock = new THREE.Clock();

let hoverZone = null;
let camTween = null;
let autoSpinWanted = true;

const HOME = {
  pos: new THREE.Vector3(-5.5, 2.25, 6.1),
  target: new THREE.Vector3(0, 0.82, 0)
};

function initThree() {
  stageEl = $('#stage');
  canvasEl = $('#scene');
  tooltipEl = $('#tooltip');

  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070b11, 12, 26);

  camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.copy(HOME.pos);

  controls = new OrbitControls(camera, canvasEl);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 4.2;
  controls.maxDistance = 10.5;
  controls.minPolarAngle = 0.32;
  controls.maxPolarAngle = 1.48;
  controls.rotateSpeed = 0.75;
  controls.zoomSpeed = 0.65;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x0a0f16, 0.55));

  const key = new THREE.DirectionalLight(0xffffff, 3.1);
  key.position.set(-4.5, 7.5, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 22;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x6aa8ff, 1.25);
  fill.position.set(7, 3, -4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffb27a, 2.1);
  rim.position.set(2, 4.5, -7);
  scene.add(rim);

  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.ShadowMaterial({ opacity: 0.4 }));
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.001;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const grid = new THREE.GridHelper(26, 52, 0x1b3047, 0x0f1c2a);
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  grid.position.y = 0.002;
  scene.add(grid);

  buildCar();

  raycaster = new THREE.Raycaster();
  resize();
  new ResizeObserver(() => resize()).observe(stageEl);
  window.addEventListener('resize', resize);

  canvasEl.addEventListener('pointermove', onPointerMove);
  canvasEl.addEventListener('pointerdown', onPointerDown);
  canvasEl.addEventListener('pointerup', onPointerUp);
  canvasEl.addEventListener('pointerleave', () => setHover(null));

  controls.addEventListener('start', stopSpinOnInteraction);

  requestAnimationFrame(tick);
}

function buildCar() {
  const car = new THREE.Group();
  scene.add(car);

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x1a4170,
    metalness: 0.62,
    roughness: 0.3,
    clearcoat: 0.9,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.15
  });
  const paintDark = new THREE.MeshPhysicalMaterial({
    color: 0x14395c,
    metalness: 0.6,
    roughness: 0.34,
    clearcoat: 0.7,
    envMapIntensity: 1.1
  });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.92, metalness: 0.05 });
  const glass = new THREE.MeshBasicMaterial({
    color: 0x0b1722,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xb9c4cf, metalness: 1, roughness: 0.3 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.95, metalness: 0.03 });
  const rim = new THREE.MeshStandardMaterial({ color: 0xa8b3bf, metalness: 0.95, roughness: 0.28 });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0x7d94a8,
    emissive: 0x24445f,
    emissiveIntensity: 0.25,
    metalness: 0.3,
    roughness: 0.1
  });
  const lampBright = new THREE.MeshStandardMaterial({
    color: 0xeaf4ff,
    emissive: 0x7fb4e0,
    emissiveIntensity: 0.9,
    metalness: 0.1,
    roughness: 0.1
  });
  const tailLamp = new THREE.MeshStandardMaterial({
    color: 0x6b0f14,
    emissive: 0x8c1218,
    emissiveIntensity: 0.5,
    metalness: 0.3,
    roughness: 0.3
  });

  const rb = (w, h, d, mat, x, y, z, r = 0.04) => {
    const rr = Math.max(0.002, Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002));
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rr), mat);
    m.position.set(x, y, z);
    car.add(m);
    return m;
  };

  const extrude = (pts, width, mat, bevel) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      steps: 1,
      curveSegments: 8
    });
    geo.translate(0, 0, -width / 2);
    const m = new THREE.Mesh(geo, mat);
    car.add(m);
    return m;
  };

  const bar = (x1, y1, x2, y2, z, thick, mat, depth = 0.06) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const m = new THREE.Mesh(
      new RoundedBoxGeometry(thick, len, depth, 2, Math.min(thick, depth) * 0.35),
      mat
    );
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
    m.rotation.z = Math.atan2(-(x2 - x1), y2 - y1);
    car.add(m);
    return m;
  };

  // дуга арки: от правой точки к левой через верх
  const arch = (cx, cy, r, yBase) => {
    const a = Math.asin((yBase - cy) / r);
    const steps = 12;
    const out = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = a + (Math.PI - 2 * a) * (i / steps);
      out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
    return out;
  };

  const wheelR = 0.385;
  const archR = 0.46;
  const wheelX = 1.34;

  // ---------- кузов с вырезами арок ----------
  const profile = [
    [-2.04, 0.3],
    [-2.24, 0.34],
    [-2.28, 0.62],
    [-2.26, 0.96],
    [-2.16, 1.02],
    [-1.55, 1.06],
    [-0.85, 1.12],
    [0.2, 1.16],
    [1.2, 1.17],
    [1.95, 1.15],
    [2.16, 1.08],
    [2.24, 0.86],
    [2.22, 0.42],
    [2.04, 0.3],
    [wheelX + 0.465, 0.3],
    ...arch(wheelX, 0.37, archR, 0.3),
    [wheelX - 0.465, 0.3],
    [-wheelX + 0.465, 0.3],
    ...arch(-wheelX, 0.37, archR, 0.3),
    [-wheelX - 0.465, 0.3]
  ];
  extrude(profile, 1.76, paint, 0.04);

  // ---------- остекление: трапеция с наклоном внутрь ----------
  const roofLine = [
    [-0.82, 1.13],
    [-0.55, 1.33],
    [-0.25, 1.52],
    [0.0, 1.6],
    [0.4, 1.635],
    [0.8, 1.645],
    [1.1, 1.64],
    [1.35, 1.6],
    [1.6, 1.46],
    [1.8, 1.26],
    [1.95, 1.13]
  ];
  const y0 = 1.12;
  const zb = 0.83;
  const zt = 0.7;
  const ringAt = (y1) => [
    [zb, y0],
    [zb, y0 + (y1 - y0) * 0.65],
    [zt, y1 - 0.05],
    [zt - 0.05, y1],
    [-zt + 0.05, y1],
    [-zt, y1 - 0.05],
    [-zb, y0 + (y1 - y0) * 0.65],
    [-zb, y0]
  ];

  const glassPos = [];
  const glassIdx = [];
  roofLine.forEach(([x, yTop]) => {
    ringAt(yTop).forEach(([z, y]) => glassPos.push(x, y, z));
  });
  const N = 8;
  for (let i = 0; i < roofLine.length - 1; i += 1) {
    for (let j = 0; j < N; j += 1) {
      const a = i * N + j;
      const b = i * N + ((j + 1) % N);
      const c = (i + 1) * N + ((j + 1) % N);
      const d = (i + 1) * N + j;
      glassIdx.push(a, b, c, a, c, d);
    }
  }
  const glassGeo = new THREE.BufferGeometry();
  glassGeo.setAttribute('position', new THREE.Float32BufferAttribute(glassPos, 3));
  glassGeo.setIndex(glassIdx);
  glassGeo.computeVertexNormals();
  const glassMesh = new THREE.Mesh(glassGeo, glass);
  car.add(glassMesh);

  const interior = new THREE.MeshStandardMaterial({ color: 0x0b0f14, roughness: 0.95, metalness: 0.05 });
  rb(1.5, 0.5, 1.36, interior, 0.5, 1.34, 0, 0.05);

  // крыша, стойки, рейлинги
  rb(1.46, 0.05, 1.56, paint, 0.62, 1.646, 0, 0.02).rotation.z = 0.014;
  [-0.76, 0.76].forEach((z) => {
    bar(-0.82, 1.13, -0.14, 1.6, z, 0.07, paint, 0.12);
    bar(1.32, 1.6, 1.93, 1.14, z, 0.13, paint, 0.12);
    rb(0.05, 0.48, 0.1, plastic, 0.35, 1.38, z * 1.01, 0.02);
    rb(2.42, 0.018, 0.02, chrome, 0.55, 1.15, z * 1.04, 0.006);
  });
  [-0.5, 0.5].forEach((z) => rb(1.2, 0.035, 0.05, chrome, 0.6, 1.695, z, 0.015));

  // ---------- двери ----------
  tag(rb(1.12, 0.84, 0.03, paint, -0.26, 0.71, 0.925, 0.02), 'doorFL');
  tag(rb(1.12, 0.84, 0.03, paint, -0.26, 0.71, -0.925, 0.02), 'doorFR');
  tag(rb(0.52, 0.84, 0.03, paint, 0.61, 0.71, 0.925, 0.02), 'doorRL');
  tag(rb(0.52, 0.84, 0.03, paint, 0.61, 0.71, -0.925, 0.02), 'doorRR');

  // ---------- крылья, капот, бамперы ----------
  tag(rb(0.30, 0.62, 0.03, paint, -1.96, 0.83, 0.925, 0.02), 'fenderL');
  tag(rb(0.30, 0.62, 0.03, paint, -1.96, 0.83, -0.925, 0.02), 'fenderR');
  rb(0.28, 0.62, 0.03, paint, 1.94, 0.83, 0.925, 0.02);
  rb(0.28, 0.62, 0.03, paint, 1.94, 0.83, -0.925, 0.02);


  const hood = rb(1.24, 0.045, 1.28, paint, -1.52, 1.06, 0, 0.03);
  hood.rotation.z = 0.05;
  tag(hood, 'hood');

  tag(rb(0.16, 0.64, 1.9, paint, -2.22, 0.6, 0, 0.05), 'bumperF');
  tag(rb(0.16, 0.64, 1.9, paint, 2.22, 0.6, 0, 0.05), 'tailgate');

  // ---------- перед ----------
  tag(rb(0.05, 0.18, 1.08, plastic, -2.31, 0.93, 0, 0.015), 'grille');
  [0.88, 0.94, 1.0].forEach((y) => rb(0.012, 0.012, 0.98, chrome, -2.342, y, 0, 0.004));
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 24), chrome);
  badge.rotation.z = Math.PI / 2;
  badge.position.set(-2.35, 0.94, 0);
  car.add(badge);

  tag(rb(0.05, 0.12, 0.46, lamp, -2.29, 0.94, 0.63, 0.02), 'headlightL');
  tag(rb(0.05, 0.12, 0.46, lamp, -2.29, 0.94, -0.63, 0.02), 'headlightR');
  rb(0.02, 0.02, 1.34, chrome, -2.335, 1.015, 0, 0.005);
  rb(0.015, 0.03, 0.34, lampBright, -2.32, 0.965, 0.64, 0.006);
  rb(0.015, 0.03, 0.34, lampBright, -2.32, 0.965, -0.64, 0.006);

  rb(0.08, 0.22, 1.68, plastic, -2.33, 0.37, 0, 0.02);
  rb(0.06, 0.09, 0.9, chrome, -2.35, 0.28, 0, 0.02);

  // ---------- зад ----------
  tag(rb(0.035, 0.42, 1.56, paint, 2.28, 0.93, 0, 0.02), 'tailgate');
  rb(0.05, 0.13, 0.32, tailLamp, 2.23, 0.95, 0.62, 0.015);
  rb(0.05, 0.13, 0.32, tailLamp, 2.23, 0.95, -0.62, 0.015);
  rb(0.08, 0.22, 1.68, plastic, 2.33, 0.37, 0, 0.02);
  rb(0.06, 0.09, 0.9, chrome, 2.35, 0.28, 0, 0.02);

  // ---------- зеркала, ручки, молдинги ----------
  tag(rb(0.06, 0.11, 0.2, paint, -0.7, 1.17, 0.99, 0.03), 'mirrorL');
  tag(rb(0.06, 0.11, 0.2, paint, -0.7, 1.17, -0.99, 0.03), 'mirrorR');
  rb(0.1, 0.035, 0.12, plastic, -0.66, 1.16, 0.93, 0.01);
  rb(0.1, 0.035, 0.12, plastic, -0.66, 1.16, -0.93, 0.01);

  [-1, 1].forEach((s) => {
    rb(0.14, 0.025, 0.02, chrome, -0.32, 1.02, s * 0.945, 0.006);
    rb(0.14, 0.025, 0.02, chrome, 0.7, 1.02, s * 0.945, 0.006);
    rb(2.3, 0.015, 0.02, chrome, 0.1, 0.44, s * 0.915, 0.005);
  });
  [-1, 1].forEach((s) => {
    rb(2.55, 0.022, 0.012, paint, 0.1, 0.93, s * 0.931, 0.006);
  });
  tag(rb(2.45, 0.12, 0.05, plastic, 0.1, 0.34, 0.9, 0.03), 'sill');
  tag(rb(2.45, 0.12, 0.05, plastic, 0.1, 0.34, -0.9, 0.03), 'sill');

  // ---------- арки, подкрылки, колёса ----------
  [[-wheelX, 1], [-wheelX, -1], [wheelX, 1], [wheelX, -1]].forEach(([x, s]) => {
    const archFlare = new THREE.Mesh(new THREE.TorusGeometry(archR, 0.042, 8, 30, Math.PI), plastic);
    archFlare.position.set(x, 0.37, s * 0.918);
    car.add(archFlare);
  });

  // тёмная ниша за колесом, чтобы арка не просвечивала
  rb(0.9, 0.56, 1.78, plastic, -wheelX, 0.55, 0, 0.04);
  rb(0.9, 0.56, 1.78, plastic, wheelX, 0.55, 0, 0.04);

  const makeWheel = () => {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.245, 32), tyre);
    t.rotation.x = Math.PI / 2;
    g.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.25, 30), rim);
    r.rotation.x = Math.PI / 2;
    g.add(r);
    for (let i = 0; i < 5; i += 1) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.45, 0.03), rim);
      spoke.rotation.z = (i * Math.PI) / 5;
      spoke.position.z = 0.128;
      g.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 20), chrome);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    return g;
  };

  const positions = [
    [-wheelX, 0.8, 'wheelFL'],
    [-wheelX, -0.8, 'wheelFR'],
    [wheelX, 0.8, 'wheelRL'],
    [wheelX, -0.8, 'wheelRR']
  ];
  positions.forEach(([x, z, zone]) => {
    const w = makeWheel();
    w.position.set(x, wheelR, z);
    car.add(w);
    tag(w, zone);
  });

  car.traverse((o) => {
    if (o.isMesh && !o.userData.zone) {
      o.castShadow = !o.material.transparent;
      o.receiveShadow = true;
    }
  });
}

function tag(obj, zone) {
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.material = o.material.clone();
    o.userData.zone = zone;
    o.userData.baseEmissive = o.material.emissive ? o.material.emissive.getHex() : 0x000000;
    o.userData.baseEmissiveIntensity = o.material.emissiveIntensity ?? 1;
    pickables.push(o);
    if (!meshesByZone.has(zone)) meshesByZone.set(zone, []);
    meshesByZone.get(zone).push(o);
  });
}

function resize() {
  if (!renderer || !stageEl) return;
  const w = stageEl.clientWidth;
  const h = stageEl.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function onPointerMove(e) {
  if (current.view !== 'car') return;
  const rect = canvasEl.getBoundingClientRect();
  pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  const hit = pick(e);
  setHover(hit);

  if (hit) {
    tooltipEl.style.left = `${e.clientX - rect.left}px`;
    tooltipEl.style.top = `${e.clientY - rect.top}px`;
  }
}

function pick(e) {
  const rect = canvasEl.getBoundingClientRect();
  pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  return hits.length ? hits[0].object.userData.zone : null;
}

function setHover(zone) {
  if (zone === hoverZone) return;
  if (hoverZone) paintZone(hoverZone, false);
  hoverZone = zone;
  if (zone) paintZone(zone, true);

  canvasEl.style.cursor = zone ? 'pointer' : '';
  const z = zone ? ZONES.get(zone) : null;
  if (z) {
    tooltipEl.textContent = z.title;
    tooltipEl.hidden = false;
  } else {
    tooltipEl.hidden = true;
  }
}

function paintZone(zone, on) {
  (meshesByZone.get(zone) || []).forEach((m) => {
    if (!m.material.emissive) return;
    if (on) {
      m.material.emissive.setHex(0xff4d00);
      m.material.emissiveIntensity = 0.4;
    } else {
      m.material.emissive.setHex(m.userData.baseEmissive);
      m.material.emissiveIntensity = m.userData.baseEmissiveIntensity;
    }
  });
}

let pointerDown = null;

function onPointerUp(e) {
  if (!pointerDown) return;
  const moved = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
  pointerDown = null;
  if (moved > 6) return;
  handleZone(pick(e));
}

function onPointerDown(e) {
  pointerDown = { x: e.clientX, y: e.clientY };
  hideHint();
  stopSpinOnInteraction();
}

function handleZone(zoneId) {
  if (!zoneId) return;
  const z = ZONES.get(zoneId);
  if (!z) return;

  if (z.part && PARTS.has(z.part)) {
    go(`#/d/${PARTS.get(z.part).diagram}/${z.part}`);
  } else if (z.diagram) {
    go(`#/d/${z.diagram}`);
  } else if (z.system) {
    catalogNote = z.note || '';
    go(`#/catalog/${z.system}`);
  }
}

function hideTip() {
  if (tooltipEl) tooltipEl.hidden = true;
  setHover(null);
}

/* ------------------------------------------------------------------ */
/*  камера и анимация                                                  */
/* ------------------------------------------------------------------ */

function stopSpinOnInteraction() {
  if (!controls) return;
  controls.autoRotate = false;
  autoSpinWanted = false;
  $('#btnSpin').classList.remove('is-on');
}

function resetView() {
  camTween = {
    p0: camera.position.clone(),
    p1: HOME.pos.clone(),
    t0: controls.target.clone(),
    t1: HOME.target.clone(),
    start: performance.now(),
    dur: 700
  };
  autoSpinWanted = true;
  controls.autoRotate = true;
  $('#btnSpin').classList.add('is-on');
}

function stepTween(now) {
  if (!camTween) return;
  const k = Math.min(1, (now - camTween.start) / camTween.dur);
  const e = 1 - Math.pow(1 - k, 3);
  camera.position.lerpVectors(camTween.p0, camTween.p1, e);
  controls.target.lerpVectors(camTween.t0, camTween.t1, e);
  if (k >= 1) camTween = null;
}

let hintHidden = false;
function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  $('#hint').classList.add('is-hidden');
}

function tick(now) {
  requestAnimationFrame(tick);
  clock.getDelta();
  stepTween(now);
  controls.update();
  if (current.view === 'car') renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ */
/*  панель инструментов сцены                                          */
/* ------------------------------------------------------------------ */

$('#btnReset').addEventListener('click', resetView);
$('#btnSpin').addEventListener('click', () => {
  autoSpinWanted = !autoSpinWanted;
  controls.autoRotate = autoSpinWanted;
  $('#btnSpin').classList.toggle('is-on', autoSpinWanted);
});

const ZONE_CHIPS = [
  { label: 'Моторный отсек', diagram: 'engine-bay' },
  { label: 'Тормоза и подвеска', diagram: 'brake-front' },
  { label: 'Салон', diagram: 'interior' },
  { label: 'Передок', diagram: 'body-front' }
];

$('#zonebar').innerHTML = ZONE_CHIPS.map(
  (c) => `<button type="button" data-diagram="${c.diagram}"><span class="dot">●</span>${c.label}</button>`
).join('');

$('#zonebar').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-diagram]');
  if (btn) go(`#/d/${btn.dataset.diagram}`);
});

/* ------------------------------------------------------------------ */
/*  клавиатура                                                         */
/* ------------------------------------------------------------------ */

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#searchResults').hidden) return;
  if (current.part) go(current.view === 'diagram' ? `#/d/${current.diagram}` : '#/catalog');
  else if (current.view !== 'car') go('#/car');
});

/* ------------------------------------------------------------------ */
/*  старт                                                              */
/* ------------------------------------------------------------------ */

$('.vin').textContent = DATA.vehicle.vin;
$('.vin').title = `${DATA.vehicle.meta} · VIN скрыт намеренно`;

window.addEventListener('hashchange', route);

initThree();
route();

requestAnimationFrame(() => {
  setTimeout(() => {
    const loading = $('#loading');
    loading.classList.add('is-hidden');
    setTimeout(() => loading.remove(), 600);
  }, 250);
});
