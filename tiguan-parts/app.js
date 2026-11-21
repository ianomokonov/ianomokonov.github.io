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

const LS = {
  oem: 'tiguan.oem.v1',
  fav: 'tiguan.fav.v1',
  fluid: 'tiguan.fluid.v1',
  custom: 'tiguan.custom.v1',
  log: 'tiguan.log.v1',
  mileage: 'tiguan.mileage.v1',
  conf: 'tiguan.conf.v1'
};
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
const SYSTEMS = new Map(DATA.systems.map((s) => [s.id, s]));
SYSTEMS.set('fluids', { id: 'fluids', title: 'Жидкости и масла' });
const DIAGRAM_INFO = new Map(DATA.diagrams.map((d) => [d.id, d]));
const FLUIDS = new Map((DATA.fluids || []).map((f) => [f.id, f]));
const ZONES = new Map(DATA.zones.map((z) => [z.id, z]));
const INSTALL = window.TIGUAN_INSTALL || {};
const INSTALL_FLUIDS = window.TIGUAN_INSTALL_FLUIDS || {};
const DIY_LEVELS = {
  1: ['Можно самому', 'diy-1'],
  2: ['Нужен инструмент', 'diy-2'],
  3: ['Сложно', 'diy-3'],
  4: ['Только сервис', 'diy-4']
};

const CONF = {
  high: { label: 'сверено', cls: 'high' },
  medium: { label: 'вероятно', cls: 'medium' },
  low: { label: 'проверить', cls: 'low' },
  custom: { label: 'своя', cls: 'medium' }
};

// свои детали и журнал замен живут только в браузере
let customParts = readJSON(LS.custom, []);
let logBook = readJSON(LS.log, {});

const FLUID_PARTS = (DATA.fluids || []).map((f) => ({
  id: `fluid:${f.id}`,
  fluidId: f.id,
  isFluid: true,
  name: f.title,
  oem: f.code,
  system: 'fluids',
  qty: 1,
  confidence: 'medium',
  location: 'Жидкость',
  note: '',
  diagram: null,
  zone: null
}));

let PARTS = new Map();
function rebuildParts() {
  PARTS = new Map([...DATA.parts, ...customParts, ...FLUID_PARTS].map((p) => [p.id, p]));
}
rebuildParts();

// слияние записей и своих деталей из data/log-seed.js (идемпотентно, с учётом удалений)
const deletedIds = readJSON('tiguan.deleted.v1', { log: [], custom: [] });
if (!Array.isArray(deletedIds.log)) deletedIds.log = [];
if (!Array.isArray(deletedIds.custom)) deletedIds.custom = [];

(function applySeeds() {
  let customTouched = false;
  if (Array.isArray(window.TIGUAN_CUSTOM_SEED)) {
    window.TIGUAN_CUSTOM_SEED.forEach((p) => {
      if (!p || !p.id || deletedIds.custom.includes(p.id)) return;
      if (!customParts.some((x) => x.id === p.id)) {
        customParts.push(p);
        customTouched = true;
      }
    });
    if (customTouched) writeJSON(LS.custom, customParts);
  }

  if (window.TIGUAN_LOG_SEED) {
    Object.entries(window.TIGUAN_LOG_SEED).forEach(([key, recs]) => {
      if (!Array.isArray(recs)) return;
      if (!logBook[key]) logBook[key] = [];
      recs.forEach((r) => {
        if (!r || !r.id || deletedIds.log.includes(r.id)) return;
        if (!logBook[key].some((x) => x.id === r.id)) {
          logBook[key].push({ id: r.id, date: r.date, km: Number(r.km) || 0, note: r.note || '' });
        }
      });
    });
    writeJSON(LS.log, logBook);
  }
})();

rebuildParts();

const allParts = () => DATA.parts.concat(customParts, FLUID_PARTS);

let oemOverrides = readJSON(LS.oem, {});
let confOverrides = readJSON(LS.conf, {});
let fluidOverrides = readJSON(LS.fluid, {});
let favorites = new Set(readJSON(LS.fav, []));
let mileage = Number(readJSON(LS.mileage, 122900)) || 122900;
let deferred = readJSON('tiguan.deferred.v1', {});

function nextServiceKm() {
  return Math.floor(mileage / 15000) * 15000 + 15000;
}
const fluidCodeOf = (f) => fluidOverrides[f.id] || f.code;
const oemOf = (p) => (p.isFluid ? fluidCodeOf(FLUIDS.get(p.fluidId)) : oemOverrides[p.id] || p.oem);
const confOf = (p) => CONF[confOverrides[p.id] || p.confidence] || CONF.medium;
const isFav = (id) => favorites.has(id);

const logOf = (key) => logBook[key] || [];

function addLog(key, date, km, note) {
  if (!logBook[key]) logBook[key] = [];
  logBook[key].push({
    id: `l${Date.now()}${Math.random().toString(16).slice(2, 6)}`,
    date,
    km: Number(km),
    note: String(note || '').trim()
  });
  writeJSON(LS.log, logBook);
  if (deferred[key]) {
    delete deferred[key];
    writeJSON('tiguan.deferred.v1', deferred);
  }
}

function updateLog(key, id, patch) {
  const rec = logOf(key).find((r) => r.id === id);
  if (!rec) return;
  Object.assign(rec, patch);
  if (!rec.note) delete rec.note;
  writeJSON(LS.log, logBook);
}

function delLog(key, id) {
  if (!deletedIds.log.includes(id)) {
    deletedIds.log.push(id);
    writeJSON('tiguan.deleted.v1', deletedIds);
  }
  logBook[key] = logOf(key).filter((r) => r.id !== id);
  if (!logBook[key].length) delete logBook[key];
  writeJSON(LS.log, logBook);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
  if (a === 'advice') return { view: 'advice' };
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
  } else if (view === 'advice') {
    current = { view: 'advice', diagram: null, part: null, system: null };
    setView('advice');
    renderPanel(null);
    renderAdvice();
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
  $('#advice').hidden = name !== 'advice';
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
  if (p.isFluid) return fluidCardHTML(p);

  const oem = oemOf(p);
  const changed = !!oemOverrides[p.id];
  const conf = confOf(p);
  const sys = SYSTEMS.get(p.system);
  const fluid = p.fluid ? FLUIDS.get(p.fluid) : null;
  const drawn = !!document.querySelector(`#schemaBody [data-part="${p.id}"]`);
  const isCustom = !!p.custom;

  return `
    <div class="card-head">
      <button type="button" class="badge badge-${conf.cls} conf-btn" data-act="conf" title="Изменить достоверность">${conf.label}</button>
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
      <div><dt>Где искать</dt><dd>${esc(p.location || '—')}</dd></div>
    </dl>
    ${serviceBlock(p)}
    ${installBlock(p)}
    ${logSection(p)}
    ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
    ${fluid ? fluidBlock(fluid) : ''}
    ${p.zone ? miniMap(p.zone) : ''}
    <div class="panel-actions">
      <button type="button" class="btn" data-act="catalog">Все детали системы</button>
      ${isCustom ? `<button type="button" class="btn" data-act="custom-edit">Изменить</button><button type="button" class="btn btn-danger" data-act="custom-del">Удалить</button>` : ''}
      ${drawn || p.diagram ? `<button type="button" class="btn btn-primary" data-act="diagram">${drawn ? 'Показать на схеме' : 'Схема узла'}</button>` : ''}
    </div>`;
}

function installBlock(p) {
  const data = p.isFluid ? INSTALL_FLUIDS[p.fluidId] : INSTALL[p.id];
  if (!data) return '';
  const lvl = DIY_LEVELS[data.level] || DIY_LEVELS[2];
  const href =
    data.link ||
    `https://www.youtube.com/results?search_query=${encodeURIComponent('Tiguan 2 замена ' + p.name)}`;

  return `<div class="install">
    <div class="install-top">
      <span class="diy ${lvl[1]}">${lvl[0]}</span>
      ${data.time ? `<span class="install-time">${esc(data.time)}</span>` : ''}
    </div>
    ${
      data.tools && data.tools.length
        ? `<div class="install-tools"><span class="install-label">Инструменты</span>${data.tools
            .map((t) => `<span class="install-tool">${esc(t)}</span>`)
            .join('')}</div>`
        : ''
    }
    ${data.steps ? `<p class="install-steps">${esc(data.steps)}</p>` : ''}
    <a class="install-link" href="${href}" target="_blank" rel="noopener noreferrer">Видео и инструкции →</a>
  </div>`;
}

function fluidCardHTML(p) {
  const f = FLUIDS.get(p.fluidId);
  const code = fluidCodeOf(f);
  const changed = !!fluidOverrides[f.id];

  return `
    <div class="card-head">
      <span class="badge badge-fluid">жидкость</span>
      <button type="button" class="icon-btn ${isFav(p.id) ? 'is-on' : ''}" data-act="fav" title="В избранное">★</button>
      <button type="button" class="icon-btn" data-act="close" title="Закрыть (Esc)">✕</button>
    </div>
    <h3>${esc(f.title)}</h3>
    <div class="oem-row" data-fluid-code-row>
      <code class="oem">${esc(code)}</code>
      <button type="button" class="icon-btn" data-act="fluid-code-edit" title="Исправить код">✎</button>
    </div>
    ${changed ? `<div class="oem-note">код изменён вручную <span class="orig">${esc(f.code)}</span><button type="button" data-act="fluid-code-reset">вернуть</button></div>` : ''}
    <dl class="meta">
      <div><dt>Тип</dt><dd>Жидкость</dd></div>
      <div><dt>Характеристики</dt><dd>${esc(f.spec)}</dd></div>
      <div><dt>Объём</dt><dd>${esc(f.volume)}</dd></div>
      <div><dt>Интервал</dt><dd>${esc(f.interval)}</dd></div>
    </dl>
    ${installBlock(p)}
    ${logSection(p)}
    <div class="panel-actions">
      <button type="button" class="btn" data-act="fluids">Все жидкости</button>
    </div>`;
}

function logSection(p) {
  const recs = logOf(p.id)
    .slice()
    .sort((a, b) => a.km - b.km || String(a.date).localeCompare(String(b.date)));

  return `<div class="log">
    <div class="log-title">Замены <span class="log-count">${recs.length}</span></div>
    ${
      recs.length
        ? recs
            .map(
              (r) => `<div class="log-item" data-rid="${r.id}">
        <div class="log-row">
          <span class="log-date">${fmtDate(r.date)}</span>
          <span class="log-km">${fmtKm(r.km)}</span>
          <span class="log-actions">
            <button type="button" class="icon-btn mini" data-act="log-edit" data-id="${r.id}" title="Изменить запись">✎</button>
            <button type="button" class="icon-btn mini" data-act="log-del" data-id="${r.id}" title="Удалить запись">✕</button>
          </span>
        </div>
        ${r.note ? `<div class="log-note">${esc(r.note)}</div>` : ''}
      </div>`
            )
            .join('')
        : `<div class="log-empty">Пока нет записей</div>`
    }
    <div class="log-add">
      <input type="date" id="logDate" value="${todayISO()}" aria-label="Дата замены">
      <input type="number" id="logKm" min="0" step="1000" placeholder="Пробег, км" aria-label="Пробег">
      <button type="button" class="btn" data-act="log-add">Добавить</button>
    </div>
    <input type="text" class="log-note-input" id="logNote" maxlength="120"
      placeholder="Комментарий: какая запчасть" aria-label="Комментарий">
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
  const code = fluidCodeOf(f);
  const changed = !!fluidOverrides[f.id];
  return `<div class="fluid">
    <div class="fluid-title">${esc(f.title)}</div>
    <dl class="fluid-list">
      <div><dt>Характеристики</dt><dd>${esc(f.spec)}</dd></div>
      <div data-fluid-row><dt>Код</dt><dd>
        <span class="fluid-code">${esc(code)}</span>
        <button type="button" class="icon-btn mini" data-act="fluid-edit" title="Исправить код">✎</button>
      </dd></div>
      <div><dt>Объём</dt><dd>${esc(f.volume)}</dd></div>
      <div><dt>Замена</dt><dd>${esc(f.interval)}</dd></div>
    </dl>
    ${changed ? `<div class="fluid-changed">код изменён вручную <span class="orig">${esc(f.code)}</span><button type="button" data-act="fluid-reset">вернуть</button></div>` : ''}
  </div>`;
}

function startFluidEdit(f) {
  const row = document.querySelector('[data-fluid-row]');
  if (!row) return;
  row.innerHTML = `<dt>Код</dt><dd>
    <input class="oem-edit" id="fluidInput" value="${esc(fluidCodeOf(f))}" spellcheck="false" autocomplete="off">
    <button type="button" class="icon-btn" data-act="fluid-save" title="Сохранить">✓</button>
    <button type="button" class="icon-btn" data-act="fluid-cancel" title="Отмена">✕</button>
  </dd>`;
  bindFluidInput(f, '#fluidInput', 'fluid-save');
}

function startFluidCodeEdit(f) {
  const row = document.querySelector('[data-fluid-code-row]');
  if (!row) return;
  row.innerHTML = `
    <input class="oem-edit" id="fluidCodeInput" value="${esc(fluidCodeOf(f))}" spellcheck="false" autocomplete="off">
    <button type="button" class="icon-btn" data-act="fluid-code-save" title="Сохранить">✓</button>
    <button type="button" class="icon-btn" data-act="fluid-code-cancel" title="Отмена">✕</button>`;
  bindFluidInput(f, '#fluidCodeInput', 'fluid-code-save');
}

function bindFluidInput(f, selector, saveAct) {
  const input = $(selector);
  if (!input) return;
  input.focus();
  input.select();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const btn = document.querySelector(`[data-act="${saveAct}"]`);
      if (btn) btn.click();
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      renderPanel(current.part);
    }
  });
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
  } else if (act === 'conf') {
    openConfidence(p);
  } else if (act === 'edit') {
    startOemEdit(p);
  } else if (act === 'fluid-edit') {
    const f = FLUIDS.get(p.fluid);
    if (f) startFluidEdit(f);
  } else if (act === 'fluid-save') {
    const f = FLUIDS.get(p.fluid);
    const input = $('#fluidInput');
    if (!f || !input) return;
    const value = input.value.trim().replace(/\s+/g, ' ');
    if (!value) return;
    if (value === f.code) delete fluidOverrides[f.id];
    else {
      fluidOverrides[f.id] = value;
      confOverrides[p.id] = 'high';
      writeJSON(LS.conf, confOverrides);
    }
    writeJSON(LS.fluid, fluidOverrides);
    renderPanel(p.id);
    toast('Код сохранён в этом браузере');
  } else if (act === 'fluid-cancel') {
    renderPanel(p.id);
  } else if (act === 'fluid-reset') {
    const f = FLUIDS.get(p.fluid);
    if (f) {
      delete fluidOverrides[f.id];
      writeJSON(LS.fluid, fluidOverrides);
      renderPanel(p.id);
      toast('Вернул исходный код');
    }
  } else if (act === 'log-add') {
    const dateEl = $('#logDate');
    const kmEl = $('#logKm');
    if (!dateEl || !kmEl) return;
    const km = Number(kmEl.value);
    if (!dateEl.value || !km) {
      toast('Укажите дату и пробег');
      return;
    }
    const noteEl = $('#logNote');
    addLog(p.id, dateEl.value, km, noteEl ? noteEl.value : '');
    renderPanel(p.id);
    renderCatalog(current.system, current.view === 'favorites');
    toast('Замена добавлена');
  } else if (act === 'log-edit') {
    const rec = logOf(p.id).find((r) => r.id === btn.dataset.id);
    const item = btn.closest('.log-item');
    if (!rec || !item) return;
    item.innerHTML = `<div class="log-edit">
      <input type="date" id="logEditDate" value="${rec.date}" aria-label="Дата">
      <input type="number" id="logEditKm" min="0" step="1000" value="${rec.km}" aria-label="Пробег">
      <input type="text" id="logEditNote" maxlength="120" placeholder="Комментарий: какая запчасть" value="${esc(rec.note || '')}" aria-label="Комментарий">
      <div class="log-edit-actions">
        <button type="button" class="icon-btn mini" data-act="log-save" data-id="${rec.id}" title="Сохранить">✓</button>
        <button type="button" class="icon-btn mini" data-act="log-cancel" title="Отмена">✕</button>
      </div>
    </div>`;
    const noteInput = $('#logEditNote');
    if (noteInput) noteInput.focus();
  } else if (act === 'log-save') {
    const dateEl = $('#logEditDate');
    const kmEl = $('#logEditKm');
    const noteEl = $('#logEditNote');
    if (!dateEl || !kmEl) return;
    const km = Number(kmEl.value);
    if (!dateEl.value || !km) {
      toast('Укажите дату и пробег');
      return;
    }
    updateLog(p.id, btn.dataset.id, {
      date: dateEl.value,
      km,
      note: (noteEl ? noteEl.value : '').trim()
    });
    renderPanel(p.id);
    renderCatalog(current.system, current.view === 'favorites');
    toast('Запись обновлена');
  } else if (act === 'log-cancel') {
    renderPanel(p.id);
  } else if (act === 'log-del') {
    delLog(p.id, btn.dataset.id);
    renderPanel(p.id);
    renderCatalog(current.system, current.view === 'favorites');
    toast('Запись удалена');
  } else if (act === 'fluid-code-edit') {
    const f = FLUIDS.get(p.fluidId);
    if (f) startFluidCodeEdit(f);
  } else if (act === 'fluid-code-save') {
    const f = FLUIDS.get(p.fluidId);
    const input = $('#fluidCodeInput');
    if (!f || !input) return;
    const value = input.value.trim().replace(/\s+/g, ' ');
    if (!value) return;
    if (value === f.code) delete fluidOverrides[f.id];
    else {
      fluidOverrides[f.id] = value;
      confOverrides[p.id] = 'high';
      writeJSON(LS.conf, confOverrides);
    }
    writeJSON(LS.fluid, fluidOverrides);
    renderPanel(p.id);
    toast('Код сохранён в этом браузере');
  } else if (act === 'fluid-code-cancel') {
    renderPanel(p.id);
  } else if (act === 'fluid-code-reset') {
    const f = FLUIDS.get(p.fluidId);
    if (f) {
      delete fluidOverrides[f.id];
      writeJSON(LS.fluid, fluidOverrides);
      renderPanel(p.id);
      toast('Вернул исходный код');
    }
  } else if (act === 'custom-edit') {
    openPartForm(p);
  } else if (act === 'custom-del') {
    if (!window.confirm(`Удалить «${p.name}»?`)) return;
    customParts = customParts.filter((x) => x.id !== p.id);
    if (!deletedIds.custom.includes(p.id)) {
      deletedIds.custom.push(p.id);
      writeJSON('tiguan.deleted.v1', deletedIds);
    }
    writeJSON(LS.custom, customParts);
    rebuildParts();
    go(`#/catalog/${p.system}`);
    toast('Деталь удалена');
  } else if (act === 'fluids') {
    go('#/catalog/fluids');
  } else if (act === 'reset') {
    delete oemOverrides[p.id];
    delete confOverrides[p.id];
    writeJSON(LS.oem, oemOverrides);
    writeJSON(LS.conf, confOverrides);
    renderPanel(p.id);
    renderCatalog(current.system, current.view === 'favorites');
    toast('Вернул исходный номер');
  } else if (act === 'catalog') {
    go(`#/catalog/${p.system}`);
  } else if (act === 'diagram') {
    if (p.diagram) go(`#/d/${p.diagram}/${p.id}`);
  }
});

function openConfidence(p) {
  const cur = confOverrides[p.id] || p.confidence;
  const options = [
    ['high', 'сверено', 'подтверждён по VIN, счёту или каталогу'],
    ['medium', 'вероятно', 'похоже на правду, лучше проверить'],
    ['low', 'проверить', 'не подтверждён']
  ];

  openModal(`<h3>Достоверность кода</h3>
    <p class="modal-note">${esc(p.name)}</p>
    <div class="conf-options">
      ${options
        .map(
          ([value, label, desc]) =>
            `<button type="button" class="conf-opt${cur === value ? ' is-active' : ''}" data-act="conf-set" data-value="${value}" data-key="${p.id}">
              <span class="badge badge-${value}">${label}</span>
              <small>${desc}</small>
            </button>`
        )
        .join('')}
    </div>
    <div class="modal-actions">
      <button type="button" class="btn" data-act="conf-cancel">Отмена</button>
    </div>`);
}

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
    else {
      oemOverrides[p.id] = value;
      confOverrides[p.id] = 'high';
      writeJSON(LS.conf, confOverrides);
    }
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

const collapsedGroups = new Set(
  readJSON('tiguan.collapsed.v1', DATA.systems.map((s) => s.id).concat('fluids'))
);

function partCardHTML(p) {
  const isFluid = !!p.isFluid;
  const changed = isFluid ? !!fluidOverrides[p.fluidId] : !!oemOverrides[p.id];
  const status = isFluid
    ? `Жидкость${changed ? ' · код изменён' : ''}`
    : p.custom
      ? 'Своя деталь'
      : `${esc(SYSTEMS.get(p.system).title)}${changed ? ' · номер изменён' : ''}`;
  const recs = logOf(p.id).length;

  const conf = confOf(p);

  return `<div class="part-card ${isFluid ? 'is-fluid' : ''}" role="button" tabindex="0" data-part="${p.id}">
    <span class="pc-name">${esc(p.name)}</span>
    <span class="pc-oem-row">
      <code class="pc-oem">${esc(oemOf(p))}</code>
      <span class="pc-dot is-${conf.cls}" title="${conf.label}" aria-label="Достоверность: ${conf.label}"></span>
      <button type="button" class="pc-copy" data-copy-code="${p.id}" title="Скопировать код">⧉</button>
    </span>
    <span class="pc-system">${status}</span>
    ${p.service ? `<span class="pc-service">${esc(p.service.action || 'замена')} ${p.service.atKm ? 'на ' + p.service.atKm.map(fmtKm).join(', ') : p.service.everyKm ? 'каждые ' + fmtKm(p.service.everyKm) : ''}</span>` : ''}
    ${recs ? `<span class="pc-log">замен: ${recs}</span>` : ''}
    <button type="button" class="pc-fav ${isFav(p.id) ? 'is-on' : ''}" data-fav="${p.id}" title="В избранное">★</button>
  </div>`;
}

function renderCatalog(system, favMode) {
  const parts = favMode ? allParts().filter((p) => isFav(p.id)) : allParts();

  $('#catalogTitle').textContent = favMode ? 'Избранное' : 'Каталог';
  $('#catalogSub').textContent = favMode
    ? `${parts.length} отмечено · звёздочка в карточке`
    : `${parts.length} деталей и жидкостей · журнал замен и свои запчасти хранятся в браузере`;

  $('#catalogFilters').innerHTML = `
    <button type="button" class="btn" data-act="expand-all">Развернуть</button>
    <button type="button" class="btn" data-act="collapse-all">Свернуть</button>
    <button type="button" class="btn" data-act="pdf">Экспорт PDF</button>
    <button type="button" class="btn" data-act="seed">Скопировать log-seed.js</button>
    <button type="button" class="btn btn-primary" data-act="add-part">+ Деталь</button>
    <a class="btn" href="mobile.html">Мобильная</a>`;

  const banner = $('#catalogBanner');
  if (catalogNote) {
    banner.hidden = false;
    banner.textContent = catalogNote;
    catalogNote = '';
  } else {
    banner.hidden = true;
  }

  if (!parts.length) {
    $('#catalogBody').innerHTML = `<p class="catalog-empty">${
      favMode ? 'Пока ничего не отмечено. Откройте деталь и нажмите ★.' : 'Ничего не найдено.'
    }</p>`;
    return;
  }

  const groups = new Map();
  parts.forEach((p) => {
    if (!groups.has(p.system)) groups.set(p.system, []);
    groups.get(p.system).push(p);
  });

  const order = DATA.systems.map((s) => s.id).concat('fluids');
  const sorted = order.filter((id) => groups.has(id)).map((id) => [id, groups.get(id)]);

  $('#catalogBody').innerHTML = sorted
    .map(([id, items]) => {
      const open = system ? id === system : !collapsedGroups.has(id);
      return `<section class="acc ${open ? 'is-open' : ''}" data-group="${id}">
        <button type="button" class="acc-head" data-acc="${id}">
          <span class="acc-title">${esc(SYSTEMS.get(id).title)}</span>
          <span class="acc-count">${items.length}</span>
          <span class="acc-chevron">›</span>
        </button>
        <div class="acc-body" ${open ? '' : 'hidden'}>
          <div class="part-grid">${items.map(partCardHTML).join('')}</div>
        </div>
      </section>`;
    })
    .join('');

  if (system) {
    const el = $(`#catalogBody [data-group="${system}"]`);
    if (el) el.scrollIntoView({ block: 'start' });
  }
}

$('#catalogBody').addEventListener('click', (e) => {
  const acc = e.target.closest('[data-acc]');
  if (acc) {
    const id = acc.dataset.acc;
    const section = acc.closest('.acc');
    const body = section.querySelector('.acc-body');
    const open = body.hidden;
    body.hidden = !open;
    section.classList.toggle('is-open', open);
    if (open) collapsedGroups.delete(id);
    else collapsedGroups.add(id);
    writeJSON('tiguan.collapsed.v1', [...collapsedGroups]);
    return;
  }

  const copyBtn = e.target.closest('[data-copy-code]');
  if (copyBtn) {
    e.stopPropagation();
    const p = PARTS.get(copyBtn.dataset.copyCode);
    if (p) {
      copyText(oemOf(p));
      toast('Код скопирован');
    }
    return;
  }

  const fav = e.target.closest('.pc-fav');
  if (fav) {
    e.stopPropagation();
    toggleFav(fav.dataset.fav);
    return;
  }

  const card = e.target.closest('.part-card');
  if (!card) return;
  const p = PARTS.get(card.dataset.part);
  if (!p) return;
  go(p.diagram ? `#/d/${p.diagram}/${p.id}` : `#/p/${p.id}`);
});

$('#catalogBody').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest('.part-card');
  if (!card) return;
  e.preventDefault();
  card.click();
});

$('#catalogFilters').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;

  if (act === 'expand-all') {
    collapsedGroups.clear();
    writeJSON('tiguan.collapsed.v1', []);
    $$('#catalogBody .acc').forEach((sec) => {
      sec.classList.add('is-open');
      const body = sec.querySelector('.acc-body');
      if (body) body.hidden = false;
    });
  } else if (act === 'collapse-all') {
    $$('#catalogBody .acc').forEach((sec) => {
      sec.classList.remove('is-open');
      const body = sec.querySelector('.acc-body');
      if (body) body.hidden = true;
      collapsedGroups.add(sec.dataset.group);
    });
    writeJSON('tiguan.collapsed.v1', [...collapsedGroups]);
  } else if (act === 'pdf') {
    exportPdf();
  } else if (act === 'seed') {
    exportSeed();
  } else if (act === 'add-part') {
    openPartForm(null);
  }
});

/* ---------- модальное окно и свои детали ---------- */

let editingPartId = null;

function openModal(html) {
  $('#modalCard').innerHTML = html;
  $('#modal').hidden = false;
}

function closeModal() {
  $('#modal').hidden = true;
  $('#modalCard').innerHTML = '';
  editingPartId = null;
}

function openPartForm(existing) {
  editingPartId = existing ? existing.id : null;
  const systems = DATA.systems
    .map(
      (s) =>
        `<option value="${s.id}" ${existing && existing.system === s.id ? 'selected' : ''}>${esc(s.title)}</option>`
    )
    .join('');

  openModal(`
    <h3>${existing ? 'Изменить деталь' : 'Своя деталь'}</h3>
    <div class="form">
      <label>Название<input id="cpName" value="${existing ? esc(existing.name) : ''}" placeholder="например, патрубок интеркулера"></label>
      <label>Оригинальный номер<input id="cpOem" value="${existing ? esc(existing.oem) : ''}" placeholder="5Q0 ..."></label>
      <label>Группа<select id="cpSystem">${systems}</select></label>
      <label>Количество<input id="cpQty" type="number" min="1" step="1" value="${existing ? existing.qty : 1}"></label>
      <label>Где искать / примечание<textarea id="cpNote" rows="3" placeholder="Перед двигателем, под кожухом…">${existing ? esc(existing.note || '') : ''}</textarea></label>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn" data-act="cp-cancel">Отмена</button>
      <button type="button" class="btn btn-primary" data-act="cp-save">${existing ? 'Сохранить' : 'Добавить'}</button>
    </div>
  `);
  const name = $('#cpName');
  if (name) name.focus();
}

function savePartForm() {
  const nameEl = $('#cpName');
  if (!nameEl) return;
  const name = nameEl.value.trim();
  if (!name) {
    toast('Укажите название детали');
    return;
  }
  const oem = ($('#cpOem').value || '').trim();
  const system = $('#cpSystem').value;
  const qty = Math.max(1, Number($('#cpQty').value) || 1);
  const note = ($('#cpNote').value || '').trim();

  if (editingPartId) {
    const p = PARTS.get(editingPartId);
    if (p) Object.assign(p, { name, oem, system, qty, note });
    delete oemOverrides[editingPartId];
    writeJSON(LS.oem, oemOverrides);
  } else {
    customParts.push({
      id: `custom-${Date.now()}`,
      name,
      oem,
      system,
      qty,
      note,
      location: '',
      confidence: 'custom',
      custom: true,
      diagram: null,
      zone: null
    });
  }

  writeJSON(LS.custom, customParts);
  rebuildParts();
  const targetSystem = system;
  collapsedGroups.delete(targetSystem);
  writeJSON('tiguan.collapsed.v1', [...collapsedGroups]);
  closeModal();
  renderCatalog(current.system, current.view === 'favorites');
  if (current.part) renderPanel(current.part);
  const section = document.querySelector(`[data-group="${targetSystem}"]`);
  if (section) section.scrollIntoView({ block: 'start', behavior: 'smooth' });
  toast(editingPartId ? 'Сохранено' : 'Деталь добавлена');
}

$('#modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') closeModal();
  if (e.target.closest('[data-act="cp-cancel"]')) closeModal();
  if (e.target.closest('[data-act="cp-save"]')) savePartForm();
  if (e.target.closest('[data-act="seed-close"]')) closeModal();
  if (e.target.closest('[data-act="mileage-cancel"]')) closeModal();
  if (e.target.closest('[data-act="mileage-save"]')) saveMileage();
  if (e.target.closest('[data-act="adv-cancel"]')) closeModal();
  if (e.target.closest('[data-act="adv-save"]')) saveLogAdd();
  if (e.target.closest('[data-act="adv-code-cancel"]')) closeModal();
  if (e.target.closest('[data-act="adv-code-save"]')) saveAdviceCode();
  if (e.target.closest('[data-act="conf-cancel"]')) closeModal();
  if (e.target.closest('[data-act="conf-set"]')) {
    const btn = e.target.closest('[data-act="conf-set"]');
    const key = btn.dataset.key;
    const value = btn.dataset.value;
    if (!CONF[value]) return;
    confOverrides[key] = value;
    writeJSON(LS.conf, confOverrides);
    closeModal();
    if (current.part === key) renderPanel(key);
    renderCatalog(current.system, current.view === 'favorites');
    toast('Достоверность обновлена');
  }
  if (e.target.closest('[data-act="seed-copy"]')) {
    const box = $('#seedBox');
    if (box) {
      copyText(box.value);
      toast('Скопировано');
    }
  }
});

/* ---------- экспорт PDF ---------- */

function exportPdf() {
  const rows = [];
  allParts().forEach((p) => {
    logOf(p.id).forEach((r) => {
      rows.push({ km: Number(r.km) || 0, date: r.date, name: p.name, code: oemOf(p), kind: p.isFluid ? 'жидкость' : 'деталь', note: r.note || '' });
    });
  });
  rows.sort((a, b) => a.km - b.km || String(a.date).localeCompare(String(b.date)));

  const groups = new Map();
  rows.forEach((r) => {
    if (!groups.has(r.km)) groups.set(r.km, []);
    groups.get(r.km).push(r);
  });

  const body = rows.length
    ? [...groups.entries()]
        .map(
          ([km, items]) => `
      <section class="print-group">
        <h2>${fmtKm(km)}</h2>
        <table>
          <thead><tr><th>Дата</th><th>Деталь / жидкость</th><th>Номер / код</th><th>Тип</th><th>Комментарий</th></tr></thead>
          <tbody>
            ${items
              .map(
                (r) =>
                  `<tr><td>${fmtDate(r.date)}</td><td>${esc(r.name)}</td><td class="mono">${esc(r.code)}</td><td>${r.kind}</td><td>${esc(r.note || '')}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </section>`
        )
        .join('')
    : `<p>Записей о заменах пока нет. Добавьте их в карточках деталей и жидкостей.</p>`;

  $('#printArea').innerHTML = `
    <div class="print-doc">
      <h1>Tiguan II — журнал замен</h1>
      <p class="print-meta">VIN ${esc(DATA.vehicle.vin)} · ${esc(DATA.vehicle.meta)} · сформировано ${fmtDate(
        todayISO()
      )} · записей: ${rows.length}</p>
      ${body}
    </div>`;

  document.body.classList.add('printing');
  setTimeout(() => window.print(), 120);
}

function exportSeed() {
  const seed = {};
  Object.keys(logBook)
    .sort()
    .forEach((key) => {
      const recs = logBook[key].filter((r) => r && r.id);
      if (!recs.length) return;
      seed[key] = recs
        .slice()
        .sort((a, b) => Number(a.km) - Number(b.km) || String(a.date).localeCompare(String(b.date)))
        .map((r) => {
          const out = { id: r.id, date: r.date, km: Number(r.km) || 0 };
          if (r.note) out.note = r.note;
          return out;
        });
    });

  const entries = Object.keys(seed).map((key) => {
    const rows = seed[key]
      .map((r) => `    { "id": ${JSON.stringify(r.id)}, "date": ${JSON.stringify(r.date)}, "km": ${r.km}${r.note ? `, "note": ${JSON.stringify(r.note)}` : ''} }`)
      .join(',\n');
    return `  ${JSON.stringify(key)}: [\n${rows}\n  ]`;
  });

  const text = `// Записи журнала замен и свои детали.
// Экспортировано из приложения ${todayISO()}.
// Вставьте этот текст в data/log-seed.js и запушьте.
window.TIGUAN_LOG_SEED = {
${entries.join(',\n')}
};

window.TIGUAN_CUSTOM_SEED = ${JSON.stringify(customParts, null, 2)};
`;

  copyText(text);
  openModal(`
    <h3>log-seed.js</h3>
    <p class="modal-note">Скопировано в буфер. Вставьте в <code>data/log-seed.js</code> целиком, сохраните и запушьте — на другом устройстве записи появятся после обновления страницы.</p>
    <textarea class="seed-box" id="seedBox" readonly spellcheck="false">${esc(text)}</textarea>
    <div class="modal-actions">
      <button type="button" class="btn" data-act="seed-copy">Скопировать ещё раз</button>
      <button type="button" class="btn btn-primary" data-act="seed-close">Готово</button>
    </div>
  `);
}

window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing');
  const area = $('#printArea');
  if (area) area.innerHTML = '';
});


/* ------------------------------------------------------------------ */
/*  регламент ТО                                                       */
/* ------------------------------------------------------------------ */

const KM_STEP = 7500;
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
    const code = fluidCodeOf(r.f);
    const meta = code && code !== '—' ? `${code} · ${r.f.volume}` : r.f.volume;
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

function renderMileage() {
  const el = $('#mileageValue');
  if (el) el.textContent = Number(mileage).toLocaleString('ru-RU');
}

function editMileage() {
  openModal(`<h3>Текущий пробег</h3>
    <p class="modal-note">От пробега считаются рекомендации и остаток до следующей замены. Сохраняется в этом браузере.</p>
    <div class="form"><label>Пробег, км<input id="mileageInput" type="number" min="0" step="100" value="${mileage}"></label></div>
    <div class="modal-actions">
      <button type="button" class="btn" data-act="mileage-cancel">Отмена</button>
      <button type="button" class="btn btn-primary" data-act="mileage-save">Сохранить</button>
    </div>`);
  const input = $('#mileageInput');
  if (input) {
    input.focus();
    input.select();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveMileage();
    });
  }
}

function saveMileage() {
  const input = $('#mileageInput');
  if (!input) return;
  const value = Number(input.value);
  if (!value || value < 0) {
    toast('Укажите пробег');
    return;
  }
  mileage = value;
  writeJSON(LS.mileage, mileage);
  renderMileage();
  closeModal();
  if (current.view === 'advice') renderAdvice();
  toast('Пробег обновлён');
}

function adviceItems() {
  const items = [];
  const lastRec = (key) =>
    logOf(key)
      .slice()
      .sort((a, b) => (Number(b.km) || 0) - (Number(a.km) || 0) || String(b.date || '').localeCompare(String(a.date || '')))[0] ||
    null;

  const add = (key, name, opts) => {
    const last = lastRec(key);
    const base = last ? Number(last.km) || 0 : 0;
    let next = null;

    if (opts.atKm && opts.atKm.length) {
      const list = opts.atKm.slice().sort((a, b) => a - b);
      next = list.find((k) => k > base) || null;
    } else if (opts.everyKm) {
      next = last ? base + opts.everyKm : opts.firstAtKm || opts.everyKm;
    }

    if (!next) return;
    const due = next - mileage;
    // без записи показываем только то, что уже пора или пора на ближайшем ТО
    if (!last && due > 15000) return;

    let status = due <= 0 ? 'overdue' : due <= 15000 ? 'soon' : 'ok';
    let deferredUntil = 0;

    if (status === 'overdue' && deferred[key]) {
      if (mileage < deferred[key]) {
        status = 'soon';
        deferredUntil = deferred[key];
      } else {
        delete deferred[key];
        writeJSON('tiguan.deferred.v1', deferred);
      }
    }

    items.push({
      key,
      name,
      next,
      last,
      due,
      code: opts.code || '',
      fluidId: opts.fluidId || '',
      system: opts.system || '',
      isFluid: key.indexOf('fluid:') === 0,
      deferredUntil,
      status
    });
  };

  DATA.parts.forEach((p) => {
    const s = p.service;
    if (!s) return;
    if (s.atKm && s.atKm.length) add(p.id, p.name, { atKm: s.atKm, system: p.system, code: oemOf(p) });
    else if (s.everyKm) add(p.id, p.name, { everyKm: s.everyKm, firstAtKm: s.firstAtKm, system: p.system, code: oemOf(p) });
  });

  (DATA.fluids || []).forEach((f) => {
    if (f.everyKm) add(`fluid:${f.id}`, f.title, { everyKm: f.everyKm, firstAtKm: f.everyKm, system: 'fluids', code: fluidCodeOf(f), fluidId: f.id });
  });

  return items;
}

function renderAdvice() {
  const items = adviceItems();
  const prio = (i) => (i.isFluid ? 0 : ['brakes', 'engine', 'transmission'].indexOf(i.system) >= 0 ? 1 : 2);
  const overdue = items.filter((i) => i.status === 'overdue').sort((a, b) => prio(a) - prio(b) || a.due - b.due);
  const soon = items.filter((i) => i.status === 'soon').sort((a, b) => prio(a) - prio(b) || a.due - b.due);
  const ok = items.filter((i) => i.status === 'ok').sort((a, b) => a.due - b.due);

  $('#adviceSub').textContent = `Пробег ${fmtKm(mileage)} · расчёт по интервалам и вашему журналу замен`;
  $('#adviceSummary').innerHTML = `
    <div class="adv-stat is-bad"><b>${overdue.length}</b><span>просрочено</span></div>
    <div class="adv-stat is-warn"><b>${soon.length}</b><span>скоро</span></div>
    <div class="adv-stat"><b>${ok.length}</b><span>в порядке</span></div>`;

  const row = (i) => {
    const label = i.deferredUntil
      ? `отложено до ТО ${fmtKm(i.deferredUntil)}`
      : i.status === 'overdue'
        ? `просрочено на ${fmtKm(-i.due)}`
        : `через ${fmtKm(i.due)}`;
    const last = i.last
      ? `последняя: ${fmtDate(i.last.date)} · ${fmtKm(i.last.km)}`
      : 'замены в журнале нет';
    const next = i.deferredUntil
      ? `по регламенту на ${fmtKm(i.next)}`
      : !i.last
        ? `по регламенту на ${fmtKm(i.next)}`
        : `следующая на ${fmtKm(i.next)}`;
    return `<div class="adv-row is-${i.status}" data-key="${i.key}" role="button" tabindex="0">
      <span class="adv-info">
        <span class="adv-name">${esc(i.name)}</span>
        <span class="adv-code${i.isFluid ? (fluidOverrides[i.fluidId] ? ' is-changed' : '') : oemOverrides[i.key] ? ' is-changed' : ''}">
          <code>${esc(i.code || '—')}</code>
          <button type="button" class="adv-icon" data-copy="${i.key}" title="Скопировать код">⧉</button>
          <button type="button" class="adv-icon" data-edit-code="${i.key}" title="Исправить код">✎</button>
        </span>
        <span class="adv-last">${last}</span>
      </span>
      <span class="adv-plan">
        <span class="adv-badge">${label}</span>
        <span class="adv-next">${next}</span>
        <span class="adv-actions">
          ${
            i.deferredUntil
              ? `<button type="button" class="adv-mini" data-undefer="${i.key}">Вернуть</button>`
              : i.status === 'overdue'
                ? `<button type="button" class="adv-mini" data-defer="${i.key}" title="Отложить до следующего ТО">До ТО</button>`
                : ''
          }
          <button type="button" class="adv-add" data-add="${i.key}">＋ Запись</button>
        </span>
      </span>
    </div>`;
  };

  const section = (title, list, note) =>
    list.length
      ? `<section class="adv-section"><h3>${title} <span>${list.length}</span></h3>${
          note ? `<p class="adv-note">${note}</p>` : ''
        }${list.map(row).join('')}</section>`
      : '';

  let html = '';
  if (!items.length) {
    html = '<p class="catalog-empty">Нет данных по интервалам.</p>';
  } else {
    html += section('Просрочено', overdue);
    html += section('Скоро (до следующего ТО)', soon);
    if (ok.length) {
      html += section('Дальше по плану', ok.slice(0, 10));
      if (ok.length > 10) {
        html += `<p class="adv-note">…и ещё ${ok.length - 10} позиций в порядке — они появятся в списке по мере приближения.</p>`;
      }
    }
    if (!overdue.length && !soon.length) {
      html = '<p class="adv-hint">Просроченных работ нет — всё по плану.</p>' + html;
    }
  }
  $('#adviceBody').innerHTML = html;
}

$('#adviceBody').addEventListener('click', (e) => {
  const copyBtn = e.target.closest('[data-copy]');
  if (copyBtn) {
    e.stopPropagation();
    const item = adviceItems().find((i) => i.key === copyBtn.dataset.copy);
    if (item) {
      copyText(item.code || '');
      toast('Код скопирован');
    }
    return;
  }

  const editBtn = e.target.closest('[data-edit-code]');
  if (editBtn) {
    e.stopPropagation();
    openAdviceCode(editBtn.dataset.editCode);
    return;
  }

  const defer = e.target.closest('[data-defer]');
  if (defer) {
    e.stopPropagation();
    const key = defer.dataset.defer;
    deferred[key] = nextServiceKm();
    writeJSON('tiguan.deferred.v1', deferred);
    renderAdvice();
    toast(`Отложено до ТО ${fmtKm(nextServiceKm())}`);
    return;
  }
  const undefer = e.target.closest('[data-undefer]');
  if (undefer) {
    e.stopPropagation();
    delete deferred[undefer.dataset.undefer];
    writeJSON('tiguan.deferred.v1', deferred);
    renderAdvice();
    toast('Отложенность снята');
    return;
  }
  const add = e.target.closest('[data-add]');
  if (add) {
    e.stopPropagation();
    openLogAdd(add.dataset.add);
    return;
  }
  const row = e.target.closest('[data-key]');
  if (row) go(`#/p/${row.dataset.key}`);
});

function openLogAdd(key) {
  const p = PARTS.get(key);
  if (!p) return;
  openModal(`<h3>Добавить замену</h3>
    <p class="modal-note">${esc(p.name)} · ${esc(oemOf(p))}</p>
    <div class="form">
      <label>Дата<input type="date" id="advDate" value="${todayISO()}"></label>
      <label>Пробег, км<input type="number" id="advKm" min="0" step="100" value="${mileage}"></label>
      <label>Комментарий<input type="text" id="advNote" maxlength="120" placeholder="какая запчасть (необязательно)"></label>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn" data-act="adv-cancel">Отмена</button>
      <button type="button" class="btn btn-primary" data-act="adv-save" data-key="${key}">Добавить</button>
    </div>`);
  const km = $('#advKm');
  if (km) {
    km.focus();
    km.select();
  }
}

function openAdviceCode(key) {
  const item = adviceItems().find((i) => i.key === key);
  if (!item) return;
  openModal(`<h3>Код детали</h3>
    <p class="modal-note">${esc(item.name)}</p>
    <div class="form"><label>Номер / код<input id="advCodeInput" value="${esc(item.code || '')}" spellcheck="false" autocomplete="off"></label></div>
    <div class="modal-actions">
      <button type="button" class="btn" data-act="adv-code-cancel">Отмена</button>
      <button type="button" class="btn btn-primary" data-act="adv-code-save" data-key="${key}">Сохранить</button>
    </div>`);
  const input = $('#advCodeInput');
  if (input) {
    input.focus();
    input.select();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveAdviceCode();
    });
  }
}

function saveAdviceCode() {
  const btn = document.querySelector('[data-act="adv-code-save"]');
  const input = $('#advCodeInput');
  if (!btn || !input) return;
  const key = btn.dataset.key;
  const value = input.value.trim().replace(/\s+/g, ' ');
  if (!value) return;

  if (key.indexOf('fluid:') === 0) {
    const f = FLUIDS.get(key.slice(6));
    if (!f) return;
    if (value === f.code) delete fluidOverrides[f.id];
    else {
      fluidOverrides[f.id] = value;
      confOverrides[p.id] = 'high';
      writeJSON(LS.conf, confOverrides);
    }
    writeJSON(LS.fluid, fluidOverrides);
  } else {
    const p = PARTS.get(key);
    if (!p) return;
    if (value === p.oem) delete oemOverrides[p.id];
    else {
      oemOverrides[p.id] = value;
      confOverrides[p.id] = 'high';
      writeJSON(LS.conf, confOverrides);
    }
    writeJSON(LS.oem, oemOverrides);
  }

  closeModal();
  renderAdvice();
  toast('Код сохранён');
}

function saveLogAdd() {
  const btn = document.querySelector('[data-act="adv-save"]');
  if (!btn) return;
  const key = btn.dataset.key;
  const dateEl = $('#advDate');
  const kmEl = $('#advKm');
  const noteEl = $('#advNote');
  if (!dateEl || !kmEl) return;
  const km = Number(kmEl.value);
  if (!dateEl.value || !km) {
    toast('Укажите дату и пробег');
    return;
  }
  addLog(key, dateEl.value, km, noteEl ? noteEl.value : '');
  closeModal();
  if (current.view === 'advice') renderAdvice();
  renderCatalog(current.system, current.view === 'favorites');
  toast('Замена добавлена');
}

$('#mileageBtn').addEventListener('click', editMileage);
$('#adviceMileageBtn').addEventListener('click', editMileage);
renderMileage();

function renderCrumbs() {
  const items = [`<button type="button" data-crumb="car">Tiguan II</button>`];

  if (current.view === 'diagram') {
    items.push(`<span class="sep">›</span><button type="button" data-crumb="diagram">${esc(DIAGRAM_INFO.get(current.diagram).title)}</button>`);
    if (current.part) items.push(`<span class="sep">›</span><span class="current">${esc(PARTS.get(current.part).name)}</span>`);
  } else if (current.view === 'schedule') {
    items.push(`<span class="sep">›</span><span class="current">Регламент ТО</span>`);
  } else if (current.view === 'catalog') {
    items.push(`<span class="sep">›</span><span class="current">${esc(current.system ? SYSTEMS.get(current.system).title : 'Каталог')}</span>`);
    if (current.part) items.push(`<span class="sep">›</span><span class="current">${esc(PARTS.get(current.part).name)}</span>`);
  } else if (current.view === 'advice') {
    items.push(`<span class="sep">›</span><span class="current">Рекомендации</span>`);
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
  const map = { car: 'car', diagram: 'car', catalog: 'catalog', favorites: 'favorites', schedule: 'schedule', advice: 'advice' };
  $$('#tabs button').forEach((b) => b.classList.toggle('is-active', b.dataset.view === map[current.view]));
}

$$('#tabs button').forEach((b) => {
  b.addEventListener('click', () => {
    const v = b.dataset.view;
    const map = { car: '#/car', catalog: '#/catalog', schedule: '#/schedule', advice: '#/advice', favorites: '#/fav' };
    go(map[v] || '#/car');
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

  searchItems = allParts()
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
let groundPlane = null;
let gridHelper = null;

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
  controls.maxPolarAngle = 2.55;
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

  groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.ShadowMaterial({ opacity: 0.4 }));
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = 0.001;
  groundPlane.receiveShadow = true;
  scene.add(groundPlane);

  gridHelper = new THREE.GridHelper(26, 52, 0x1b3047, 0x0f1c2a);
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.5;
  gridHelper.position.y = 0.002;
  scene.add(gridHelper);

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
        if (/chassis|car_body_bottom/i.test(n)) {
          tag(o, 'underbody');
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
      m.material.emissiveIntensity = zone === 'underbody' ? 0.32 : 0.4;
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

function tweenCamera(pos, target, dur = 700) {
  camTween = {
    p0: camera.position.clone(),
    p1: pos.clone(),
    t0: controls.target.clone(),
    t1: target.clone(),
    start: performance.now(),
    dur
  };
}

function resetView() {
  tweenCamera(HOME.pos, HOME.target);
  autoSpinWanted = true;
  controls.autoRotate = true;
  $('#btnSpin').classList.add('is-on');
}

function underView() {
  controls.autoRotate = false;
  autoSpinWanted = false;
  $('#btnSpin').classList.remove('is-on');
  tweenCamera(new THREE.Vector3(0.4, -2.9, 5.6), new THREE.Vector3(0, 0.7, 0), 900);
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
  const below = camera.position.y < 0.3;
  if (groundPlane) groundPlane.visible = !below;
  if (gridHelper) gridHelper.visible = !below;
  if (current.view === 'car') renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ */
/*  панель инструментов сцены                                          */
/* ------------------------------------------------------------------ */

$('#btnReset').addEventListener('click', resetView);
$('#btnUnder').addEventListener('click', underView);
$('#btnSpin').addEventListener('click', () => {
  autoSpinWanted = !autoSpinWanted;
  controls.autoRotate = autoSpinWanted;
  $('#btnSpin').classList.toggle('is-on', autoSpinWanted);
});

const ZONE_CHIPS = [
  { label: 'Моторный отсек', diagram: 'engine-bay' },
  { label: 'Тормоза и подвеска', diagram: 'brake-front' },
  { label: 'Салон', diagram: 'interior' },
  { label: 'Передок', diagram: 'body-front' },
  { label: 'Подвеска', diagram: 'suspension-front' },
  { label: 'Кардан', diagram: 'propshaft' },
  { label: 'Днище и выхлоп', diagram: 'underbody' }
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
