(function () {
  'use strict';

  /* ============================== Константы ============================== */
  const STORAGE_KEY = 'todo-app-v1';
  const THEME_KEY = 'theme';
  const LAST_OPEN_KEY = 'lastOpenDate';

  const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  /* ============================== Состояние ============================== */
  const state = {
    tasks: [],            // [{ id, text, date, done, createdAt }]
    theme: 'light',
    today: '',            // локальная дата YYYY-MM-DD
    expanded: new Set(),  // даты прошлых секций, развёрнутых пользователем
  };

  /* ============================== DOM ============================== */
  const addForm = document.getElementById('addForm');
  const newTask = document.getElementById('newTask');
  const taskList = document.getElementById('taskList');
  const remainingEl = document.getElementById('remaining');
  const themeToggle = document.getElementById('themeToggle');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalBody = document.getElementById('modalBody');
  const modalMove = document.getElementById('modalMove');
  const modalKeep = document.getElementById('modalKeep');

  /* ==================== Статические иконки (без пользовательского текста) ==================== */
  const ICONS = {
    check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    empty: '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h4"/></svg>'
  };

  /* ============================== Хелперы ============================== */
  function pad(n) { return String(n).padStart(2, '0'); }

  // Локальная дата YYYY-MM-DD (не toISOString — тот даёт UTC)
  function localDateKey(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function todayKey() { return localDateKey(new Date()); }

  function parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function shiftDayKey(key, days) {
    const d = parseKey(key);
    d.setDate(d.getDate() + days);
    return localDateKey(d);
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text; // textContent — безопасно
    return node;
  }

  // Авто-высота textarea (общая для создания и инлайн-редактирования)
  function autoResize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 240) + 'px';
  }

  function shake(target) {
    target.classList.remove('shake');
    void target.offsetWidth; // перезапуск анимации
    target.classList.add('shake');
    target.addEventListener('animationend', () => target.classList.remove('shake'), { once: true });
  }

  /* ============================== Хранилище ============================== */
  function loadTasks() {
    try {
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(arr)) return [];
      return arr.filter((t) =>
        t && typeof t.id === 'string' && typeof t.text === 'string' &&
        typeof t.date === 'string' && t.date.length === 10);
    } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); } catch (e) {}
  }
  function getLastOpen() {
    try { return localStorage.getItem(LAST_OPEN_KEY); } catch (e) { return null; }
  }
  function setLastOpen(value) {
    try { localStorage.setItem(LAST_OPEN_KEY, value); } catch (e) {}
  }

  /* ============================== Тема ============================== */
  function loadTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (saved === 'light' || saved === 'dark') return saved;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark' : 'light';
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
  }
  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, state.theme); } catch (e) {}
    applyTheme();
  }

  /* ============================== Мутации задач ============================== */
  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return false;
    state.tasks.push({ id: createId(), text: trimmed, date: state.today, done: false, createdAt: Date.now() });
    save(); render();
    return true;
  }

  function toggleDone(id) {
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    save(); render();
    // Возвращаем фокус на пересозданный чекбокс (удобство для клавиатуры)
    const input = taskList.querySelector('.task[data-id="' + id + '"] .checkbox-input');
    if (input) input.focus();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter((x) => x.id !== id);
    save(); render();
  }

  function saveEdit(id, value) {
    const trimmed = value.trim();
    const idx = state.tasks.findIndex((x) => x.id === id);
    if (idx === -1) return;
    if (!trimmed) state.tasks.splice(idx, 1); // пустой текст = удалить
    else state.tasks[idx].text = trimmed;
    save(); render();
  }

  function moveToToday(ids) {
    const idSet = new Set(ids);
    let changed = false;
    state.tasks.forEach((t) => {
      if (idSet.has(t.id) && t.date !== state.today) { t.date = state.today; changed = true; }
    });
    if (changed) { save(); render(); }
  }

  /* ============================== Подписи дат ============================== */
  function formatDate(key) {
    const d = parseKey(key);
    return { day: d.getDate(), month: MONTHS_GEN[d.getMonth()], year: d.getFullYear() };
  }
  function sectionTitle(key) {
    const { day, month, year } = formatDate(key);
    if (key === state.today) return `Сегодня, ${day} ${month}`;
    if (key === shiftDayKey(state.today, -1)) return `Вчера, ${day} ${month}`;
    return `${day} ${month} ${year}`;
  }

  /* ============================== Рендер ============================== */
  function render() {
    const left = state.tasks.reduce((n, t) => n + (t.done ? 0 : 1), 0);
    remainingEl.textContent = 'Осталось ' + left;
    renderList();
  }

  function renderList() {
    taskList.textContent = '';
    if (state.tasks.length === 0) { taskList.appendChild(renderEmpty()); return; }
    buildGroups().forEach((g) => taskList.appendChild(renderSection(g)));
  }

  function renderEmpty() {
    const wrap = el('div', 'empty');
    const icon = el('div', 'empty-icon');
    icon.innerHTML = ICONS.empty;
    wrap.appendChild(icon);
    wrap.appendChild(el('p', 'empty-text', 'На сегодня дел нет. Добавьте первое 👆'));
    return wrap;
  }

  function buildGroups() {
    const map = new Map();
    state.tasks.forEach((t) => {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    });
    const dates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a)); // свежие сверху
    return dates.map((date) => {
      const tasks = map.get(date).slice().sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1; // незавершённые сначала
        return a.createdAt - b.createdAt;
      });
      return { date, tasks, done: tasks.filter((t) => t.done).length, total: tasks.length };
    });
  }

  function renderSection(g) {
    const open = g.date === state.today || state.expanded.has(g.date);
    const section = el('section', 'section' + (open ? ' open' : ''));

    const header = el('button', 'section-header');
    header.type = 'button';
    header.dataset.date = g.date;
    header.setAttribute('aria-expanded', String(open));

    const chevron = el('span', 'chevron');
    chevron.innerHTML = ICONS.chevron;
    header.append(
      el('span', 'section-title', sectionTitle(g.date)),
      el('span', 'section-count', `${g.done} из ${g.total} выполнено`),
      chevron
    );

    const body = el('div', 'section-body');
    body.style.height = open ? 'auto' : '0px';
    const ul = el('ul', 'section-tasks');
    g.tasks.forEach((t) => ul.appendChild(renderTask(t)));
    const inner = el('div', 'section-body-inner');
    inner.appendChild(ul);
    body.appendChild(inner);

    section.append(header, body);
    return section;
  }

  function renderTask(t) {
    const li = el('li', 'task' + (t.done ? ' done' : ''));
    li.dataset.id = t.id;

    const label = el('label', 'checkbox');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'checkbox-input';
    input.checked = t.done;
    input.setAttribute('aria-label', t.done ? 'Снять отметку о выполнении' : 'Отметить выполненным');
    const box = el('span', 'box');
    box.innerHTML = ICONS.check;
    label.append(input, box);

    const text = el('div', 'task-text', t.text); // переносы сохраняются через pre-wrap

    const del = el('button', 'task-delete');
    del.type = 'button';
    del.setAttribute('aria-label', 'Удалить задачу');
    del.innerHTML = ICONS.trash;

    li.append(label, text, del);
    return li;
  }

  /* ============================== Аккордеон ============================== */
  function toggleSection(header) {
    if (header.dataset.date === state.today) return; // «Сегодня» всегда развёрнута
    const section = header.closest('.section');
    const body = section.querySelector('.section-body');
    const open = section.classList.contains('open');

    if (open) state.expanded.delete(header.dataset.date);
    else state.expanded.add(header.dataset.date);

    section.classList.toggle('open', !open);
    header.setAttribute('aria-expanded', String(!open));
    animateHeight(body, !open);
  }

  function animateHeight(body, open) {
    if (open) {
      body.style.height = '0px';
      void body.offsetHeight; // reflow, чтобы переход запустился
      body.style.height = body.scrollHeight + 'px';
      body.addEventListener('transitionend', function onEnd(e) {
        if (e.propertyName === 'height') {
          body.style.height = 'auto';
          body.removeEventListener('transitionend', onEnd);
        }
      });
    } else {
      body.style.height = body.scrollHeight + 'px';
      void body.offsetHeight;
      body.style.height = '0px';
    }
  }

  /* ============================== Инлайн-редактирование ============================== */
  function startInlineEdit(textEl) {
    const li = textEl.closest('.task');
    const task = state.tasks.find((x) => x.id === li.dataset.id);
    if (!task) return;

    const ta = document.createElement('textarea');
    ta.className = 'task-editor';
    ta.value = task.text;
    ta.setAttribute('aria-label', 'Редактировать текст задачи');

    textEl.replaceWith(ta);
    autoResize(ta);
    ta.focus();
    const len = ta.value.length;
    ta.setSelectionRange(len, len);

    let finished = false;
    function commit(saveFlag) {
      if (finished) return;
      finished = true;
      if (saveFlag) saveEdit(task.id, ta.value);
      else render(); // отмена — вернуть исходный текст
    }

    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); commit(true); }
      else if (e.key === 'Escape') { e.preventDefault(); commit(false); }
    });
    ta.addEventListener('input', () => autoResize(ta));
    ta.addEventListener('blur', () => commit(true));
  }

  /* ============================== Модалка «перенос на сегодня» ============================== */
  function checkDailyPrompt() {
    if (getLastOpen() === state.today) return;
    if (!modalOverlay.hidden) return; // уже показана

    const overdue = state.tasks.filter((t) => !t.done && t.date < state.today);
    if (overdue.length > 0) buildDailyModal(overdue);
    else setLastOpen(state.today); // переносить нечего — просто запоминаем день
  }

  function buildDailyModal(overdue) {
    const map = new Map();
    overdue.forEach((t) => {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    });
    const dates = Array.from(map.keys()).sort(); // от старых к новым

    modalBody.textContent = '';
    dates.forEach((date) => {
      const { day, month, year } = formatDate(date);
      modalBody.appendChild(el('div', 'modal-group-title', `${day} ${month} ${year}`));
      map.get(date).forEach((t) => modalBody.appendChild(renderModalItem(t)));
    });
    showModal();
  }

  function renderModalItem(t) {
    const item = el('div', 'modal-item');
    const label = el('label', 'checkbox');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'checkbox-input modal-check';
    input.checked = true;
    input.dataset.id = t.id;
    input.setAttribute('aria-label', 'Перенести на сегодня');
    const box = el('span', 'box');
    box.innerHTML = ICONS.check;
    label.append(input, box);
    item.append(label, el('div', 'modal-item-text', t.text));
    return item;
  }

  function showModal() {
    modalOverlay.hidden = false;
    document.body.style.overflow = 'hidden';
    modalMove.focus();
  }
  function hideModal() {
    modalOverlay.hidden = true;
    document.body.style.overflow = '';
  }
  function closeDailyPrompt() {
    setLastOpen(state.today);
    hideModal();
  }

  /* ============================== Смена даты при открытой вкладке ============================== */
  function refreshToday() {
    const next = todayKey();
    if (next !== state.today) {
      state.today = next;
      render();
      checkDailyPrompt();
    }
  }

  /* ============================== Обработчики ============================== */
  function bindEvents() {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (addTask(newTask.value)) {
        newTask.value = '';
        autoResize(newTask); // вернуть высоту к одной строке
      } else {
        shake(newTask);
      }
      newTask.focus();
    });

    newTask.addEventListener('input', () => autoResize(newTask));
    newTask.addEventListener('keydown', (e) => {
      // Enter — добавить, Shift+Enter — перенос строки
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (typeof addForm.requestSubmit === 'function') addForm.requestSubmit();
        else addForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    });

    themeToggle.addEventListener('click', toggleTheme);

    // Делегирование событий списка
    taskList.addEventListener('click', (e) => {
      const header = e.target.closest('.section-header');
      if (header) { toggleSection(header); return; }
      const del = e.target.closest('.task-delete');
      if (del) deleteTask(del.closest('.task').dataset.id);
    });

    taskList.addEventListener('change', (e) => {
      const cb = e.target.closest('.checkbox-input');
      if (cb) toggleDone(cb.closest('.task').dataset.id);
    });

    taskList.addEventListener('dblclick', (e) => {
      const textEl = e.target.closest('.task-text');
      if (textEl) startInlineEdit(textEl);
    });

    modalMove.addEventListener('click', () => {
      const ids = Array.from(modalOverlay.querySelectorAll('.modal-check:checked'))
        .map((cb) => cb.dataset.id);
      moveToToday(ids);
      closeDailyPrompt();
    });
    modalKeep.addEventListener('click', closeDailyPrompt);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeDailyPrompt();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modalOverlay.hidden) closeDailyPrompt();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshToday();
    });
    window.addEventListener('focus', refreshToday);
  }

  /* ============================== Инициализация ============================== */
  function init() {
    state.tasks = loadTasks();
    state.theme = loadTheme();
    applyTheme();
    state.today = todayKey();

    bindEvents();
    autoResize(newTask);
    render();
    checkDailyPrompt();
  }

  init();
})();
