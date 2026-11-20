// three.js и данные приходят глобальными: см. index.html.
const THREE = window.THREE;
const { OrbitControls, RoomEnvironment, GLTFLoader, DRACOLoader } = window;
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

  loadCar();

  raycaster = new THREE.Raycaster();
  resize();
  new ResizeObserver(() => resize()).observe(stageEl);
  window.addEventListener('resize', resize);

  canvasEl.addEventListener('pointermove', onPointerMove);
  canvasEl.addEventListener('pointerdown', onPointerDown);
  canvasEl.addEventListener('pointerup', onPointerUp);
  canvasEl.addEventListener('pointerleave', () => setHover(null));

  controls.addEventListener('start', stopSpinOnInteraction);

  window.__tiguan = { camera, controls, scene, renderer, meshesByZone, pickables };

  requestAnimationFrame(tick);
}

function loadCar() {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
  loader.setDRACOLoader(draco);

  const bin = atob(window.TIGUAN_GLB_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);

  loader.parse(
    bytes.buffer,
    '',
    (gltf) => {
      const group = new THREE.Group();
      const model = gltf.scene;
      group.add(model);
      scene.add(group);

      // масштаб и посадка на землю
      let box = new THREE.Box3().setFromObject(model);
      let size = box.getSize(new THREE.Vector3());
      if (size.z > size.x) model.rotation.y = Math.PI / 2;
      model.updateMatrixWorld(true);

      box = new THREE.Box3().setFromObject(model);
      size = box.getSize(new THREE.Vector3());
      model.scale.setScalar(4.5 / size.x);
      model.updateMatrixWorld(true);

      box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      model.updateMatrixWorld(true);

      // перед — там, где фары
      let hlX = 0;
      let hlN = 0;
      model.traverse((o) => {
        if (o.isMesh && /headlight/i.test(o.name)) {
          hlX += new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).x;
          hlN += 1;
        }
      });
      if (hlN && hlX / hlN > 0) {
        group.rotation.y = Math.PI;
        group.updateMatrixWorld(true);
      }

      // материалы
      model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        const m = o.material;
        if (!m) return;
        if (m.transmission) {
          m.transmission = 0;
          m.transparent = true;
          m.opacity = 0.6;
          m.depthWrite = false;
        }
        if (m.name === 'carpaint') {
          m.color.setHex(0x1b3f66);
          m.metalness = 0.55;
          m.roughness = 0.32;
        }
        m.envMapIntensity = 0.9;
      });

      // зоны
      const rules = [
        [/lf_door|lf_volkswagen/i, 'doorFL'],
        [/rf_door|rf_volkswagen/i, 'doorFR'],
        [/lr_door/i, 'doorRL'],
        [/rr_door/i, 'doorRR'],
        [/trunk/i, 'tailgate']
      ];
      model.traverse((o) => {
        if (!o.isMesh) return;
        const n = `${o.name} ${o.parent && o.parent.name ? o.parent.name : ''}`;
        for (const [re, zone] of rules) {
          if (re.test(n)) {
            tag(o, zone);
            return;
          }
        }
        if (/headlight/i.test(n)) {
          tag(o, 'headlightL');
          return;
        }
        if (/tire|hub|brake/i.test(n)) {
          const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
          tag(o, c.x < 0 ? 'wheelFL' : 'wheelRL');
        }
      });

      // капот в модели — часть меша кузова: вырезаем его геометрию
      // и подсвечиваем так же, как двери (emissive), а не плёнкой
      const bodyMeshes = [];
      model.traverse((o) => {
        if (o.isMesh && o.material && o.material.name === 'carpaint') bodyMeshes.push(o);
      });

      const hp = [];
      const hn = [];
      const hu = [];
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c = new THREE.Vector3();
      const na = new THREE.Vector3();
      const nb = new THREE.Vector3();
      const nc = new THREE.Vector3();
      const centroid = new THREE.Vector3();

      bodyMeshes.forEach((m) => {
        m.updateWorldMatrix(true, false);
        const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
        const pos = geo.attributes.position;
        const nor = geo.attributes.normal;
        const uvs = geo.attributes.uv || null;
        for (let i = 0; i + 2 < pos.count; i += 3) {
          a.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
          b.fromBufferAttribute(pos, i + 1).applyMatrix4(m.matrixWorld);
          c.fromBufferAttribute(pos, i + 2).applyMatrix4(m.matrixWorld);
          centroid.copy(a).add(b).add(c).multiplyScalar(1 / 3);
          if (centroid.y < 0.88) continue;
          if (centroid.x > -0.84 || centroid.x < -2.16) continue;
          if (Math.abs(centroid.z) > 0.7) continue;
          na.fromBufferAttribute(nor, i).transformDirection(m.matrixWorld);
          nb.fromBufferAttribute(nor, i + 1).transformDirection(m.matrixWorld);
          nc.fromBufferAttribute(nor, i + 2).transformDirection(m.matrixWorld);
          if (na.y < 0.35 || nb.y < 0.35 || nc.y < 0.35) continue;
          hp.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
          hn.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nc.x, nc.y, nc.z);
          if (uvs) {
            hu.push(uvs.getX(i), uvs.getY(i), uvs.getX(i + 1), uvs.getY(i + 1), uvs.getX(i + 2), uvs.getY(i + 2));
          }
        }
      });

      if (hp.length) {
        const hoodGeo = new THREE.BufferGeometry();
        hoodGeo.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
        hoodGeo.setAttribute('normal', new THREE.Float32BufferAttribute(hn, 3));
        if (hu.length) hoodGeo.setAttribute('uv', new THREE.Float32BufferAttribute(hu, 2));
        const paint = bodyMeshes[0].material.clone();
        paint.polygonOffset = true;
        paint.polygonOffsetFactor = -2;
        paint.polygonOffsetUnits = -2;
        const hoodMesh = new THREE.Mesh(hoodGeo, paint);
        hoodMesh.position.y = 0.0006;
        hoodMesh.userData.zone = 'hood';
        hoodMesh.userData.baseEmissive = 0x000000;
        hoodMesh.userData.baseEmissiveIntensity = 1;
        scene.add(hoodMesh);
        pickables.push(hoodMesh);
        if (!meshesByZone.has('hood')) meshesByZone.set('hood', []);
        meshesByZone.get('hood').push(hoodMesh);
      }

      window.__carLoaded = true;
      hideLoader();
    },
    (err) => {
      console.error('GLTF error', err);
      hideLoader();
    }
  );
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
    if (m.userData.ghost) {
      m.material.opacity = on ? 0.26 : 0;
      return;
    }
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

let loaderHidden = false;
function hideLoader() {
  if (loaderHidden) return;
  loaderHidden = true;
  const loading = $('#loading');
  if (!loading) return;
  loading.classList.add('is-hidden');
  setTimeout(() => loading.remove(), 600);
}
setTimeout(hideLoader, 15000);
