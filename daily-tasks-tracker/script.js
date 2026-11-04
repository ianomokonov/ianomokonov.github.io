'use strict';

/* ==========================================================================
   Daily Tasks Tracker — логика приложения
   ========================================================================== */

// Ключ для хранения данных в localStorage
const STORAGE_KEY = 'dailyTasksTracker';

// Единственный источник истины — массив задач
let tasks = [];

/* ============================================================
 *  Вспомогательные утилиты
 * ============================================================ */

/**
 * Экранирует пользовательский ввод для безопасного вывода в HTML (защита от XSS).
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Возвращает календарную дату в виде YYYY-MM-DD (по локальному времени).
 */
function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Ключ даты «сегодня».
 */
function getTodayKey() {
  return dateKey(new Date());
}

/**
 * Ключ даты «предыдущий рабочий день».
 * Для понедельника это пятница; для субботы и воскресенья — тоже пятница.
 */
function getPreviousWorkingDayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  // Отматываем назад, пока не попадём на будний день (пн–пт)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return dateKey(d);
}

/**
 * Генерирует уникальный идентификатор задачи.
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Человекочитаемая подпись даты (например, «вторник, 4 ноября»).
 */
function formatDateLabel(key) {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(`${key}T00:00:00`));
}

/**
 * Извлекает номер задачи (например, VTBDOM-14431) из ссылки на задачу.
 * Берёт последний сегмент пути URL.
 */
function extractIssueKey(url) {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    return segments.length ? decodeURIComponent(segments[segments.length - 1]) : '';
  } catch (err) {
    return '';
  }
}

/* ============================================================
 *  Работа с хранилищем
 * ============================================================ */

/**
 * Загружает задачи из localStorage и удаляет устаревшие.
 * Остаются только задачи за сегодня и за предыдущий рабочий день.
 * Сравнение идёт по календарной дате, а не по точному времени.
 */
function loadTasks() {
  let loaded = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) loaded = parsed;
    }
  } catch (err) {
    console.error('Ошибка чтения localStorage:', err);
  }

  const todayKey = getTodayKey();
  const prevWorkingDayKey = getPreviousWorkingDayKey();

  // Оставляем только задачи за сегодня и за предыдущий рабочий день
  const cleaned = loaded.filter((task) => {
    if (!task || !task.createdAt) return false;
    const key = dateKey(new Date(task.createdAt));
    return key === todayKey || key === prevWorkingDayKey;
  });

  tasks = cleaned;

  // Если что-то было удалено — сразу пересохраняем очищенный массив
  if (cleaned.length !== loaded.length) {
    saveTasks();
  }

  return tasks;
}

/**
 * Сохраняет текущее состояние tasks в localStorage.
 */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('Ошибка записи в localStorage:', err);
  }
}

/* ============================================================
 *  Операции над задачами (CRUD)
 * ============================================================ */

/**
 * Добавляет новую задачу в конец массива.
 */
function addTask(title, url, comment) {
  tasks.push({
    id: generateId(),
    title: title.trim(),
    url: url.trim(),
    comment: comment.trim(),
    createdAt: new Date().toISOString()
  });
  saveTasks();
  render();
}

/**
 * Обновляет существующую задачу по id.
 */
function updateTask(id, title, url, comment) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.title = title.trim();
  task.url = url.trim();
  task.comment = comment.trim();

  saveTasks();
  render();
}

/**
 * Удаляет задачу по id (с подтверждением).
 */
function deleteTask(id) {
  if (!confirm('Удалить задачу?')) return;
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

/* ============================================================
 *  Группировка и рендер
 * ============================================================ */

/**
 * Группирует задачи по календарной дате.
 * Внутри каждой группы — сортировка по createdAt по убыванию (сначала новые).
 */
function groupByDate(list) {
  const groups = {};
  list.forEach((task) => {
    const key = dateKey(new Date(task.createdAt));
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  });
  Object.values(groups).forEach((group) => {
    group.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  });
  return groups;
}

/**
 * Формирует HTML для inline-формы редактирования одной задачи.
 */
function renderEditForm(task) {
  return `
    <form class="edit-form needs-validation" data-id="${escapeHtml(task.id)}" novalidate>
      <div class="mb-2">
        <label class="form-label small text-muted mb-1">Название задачи</label>
        <input type="text" class="form-control form-control-sm" data-field="title" value="${escapeHtml(task.title)}" required />
        <div class="invalid-feedback">Введите название задачи</div>
      </div>
      <div class="mb-2">
        <label class="form-label small text-muted mb-1">Ссылка</label>
        <input type="url" class="form-control form-control-sm" data-field="url" value="${escapeHtml(task.url)}" required pattern="https?://.+" />
        <div class="invalid-feedback">Введите корректную ссылку (http:// или https://)</div>
      </div>
      <div class="mb-2">
        <label class="form-label small text-muted mb-1">Комментарий</label>
        <textarea class="form-control form-control-sm" data-field="comment" rows="2">${escapeHtml(task.comment)}</textarea>
      </div>
      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-sm btn-primary"><i class="bi bi-check-lg me-1"></i>Сохранить</button>
        <button type="button" class="btn btn-sm btn-ghost" data-action="cancel-edit" data-id="${escapeHtml(task.id)}">Отмена</button>
      </div>
    </form>
  `;
}

/**
 * Формирует HTML одной карточки задачи.
 */
function renderTask(task) {
  const hasComment = Boolean(task.comment && task.comment.trim());
  const issueKey = extractIssueKey(task.url);
  const issueChip = issueKey
    ? `<span class="task-issue" title="Номер задачи">${escapeHtml(issueKey)}</span>`
    : '';

  // Индикатор комментария — кликабельная кнопка-аккордеон (Bootstrap collapse)
  const commentToggle = hasComment
    ? `
      <button type="button"
              class="icon-btn comment-toggle"
              data-bs-toggle="collapse"
              data-bs-target="#comment-${escapeHtml(task.id)}"
              aria-expanded="false"
              aria-controls="comment-${escapeHtml(task.id)}"
              title="Показать комментарий">
        <i class="bi bi-chat-left-text"></i>
      </button>`
    : '';

  const commentBody = hasComment
    ? `
      <div class="collapse" id="comment-${escapeHtml(task.id)}">
        <div class="comment-body">${escapeHtml(task.comment)}</div>
      </div>`
    : '';

  return `
    <li class="task" data-id="${escapeHtml(task.id)}">
      <div class="task-row">
        <div class="task-title-cell">
          <a href="${escapeHtml(task.url)}"
             target="_blank"
             rel="noopener noreferrer"
             class="task-title">
            ${escapeHtml(task.title)}<i class="bi bi-box-arrow-up-right"></i>
          </a>
          ${issueChip}
        </div>
        <div class="task-actions">
          ${commentToggle}
          <button type="button" class="icon-btn" data-action="edit" data-id="${escapeHtml(task.id)}" title="Редактировать">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${escapeHtml(task.id)}" title="Удалить">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      ${commentBody}
    </li>
  `;
}

/**
 * Формирует HTML одной группы задач («Сегодня» или «Вчера»).
 */
function renderGroup({ title, iconClass, list, collapseId, isOpen, dateLabel }) {
  const headerBtn = `
    <button type="button"
            class="section-header${isOpen ? '' : ' collapsed'}"
            data-bs-toggle="collapse"
            data-bs-target="#${collapseId}"
            aria-expanded="${isOpen ? 'true' : 'false'}"
            aria-controls="${collapseId}">
      <i class="bi ${iconClass} fs-5"></i>
      <span class="section-title">${escapeHtml(title)}</span>
      <span class="section-count">${list.length}</span>
      <span class="section-date">${escapeHtml(dateLabel)}</span>
      <i class="bi bi-chevron-down chevron"></i>
    </button>
  `;

  const body = list.length === 0
    ? '<p class="text-muted small mb-0 px-3 pb-3">Нет задач</p>'
    : `<ul class="task-list">${list.map(renderTask).join('')}</ul>`;

  return `
    <section class="section">
      ${headerBtn}
      <div class="collapse${isOpen ? ' show' : ''}" id="${collapseId}">
        ${body}
      </div>
    </section>
  `;
}

/**
 * Полный рендер списка задач.
 */
function render() {
  const container = document.getElementById('tasksContainer');
  container.innerHTML = '';

  // Если вообще нет задач — общее сообщение по центру
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <i class="bi bi-inbox empty-icon"></i>
        <p class="empty-text">Пока нет задач. Добавь первую!</p>
      </div>
    `;
    return;
  }

  const groups = groupByDate(tasks);
  const todayKey = getTodayKey();
  const prevWorkingDayKey = getPreviousWorkingDayKey();

  const todayTasks = groups[todayKey] || [];
  const yesterdayTasks = groups[prevWorkingDayKey] || [];

  // Порядок: сверху «Вчера», ниже «Сегодня»
  container.innerHTML =
    renderGroup({
      title: 'Вчера',
      iconClass: 'bi-calendar-minus',
      list: yesterdayTasks,
      collapseId: 'collapse-yesterday',
      isOpen: false, // вчера по умолчанию закрыт
      dateLabel: formatDateLabel(prevWorkingDayKey)
    }) +
    renderGroup({
      title: 'Сегодня',
      iconClass: 'bi-calendar-day',
      list: todayTasks,
      collapseId: 'collapse-today',
      isOpen: true, // сегодня по умолчанию открыт
      dateLabel: formatDateLabel(todayKey)
    });
}

/* ============================================================
 *  Обработчики событий
 * ============================================================ */

function init() {
  loadTasks();
  render();

  // --- Модальное окно добавления задачи ---
  const addModalEl = document.getElementById('addModal');
  const addModal = new bootstrap.Modal(addModalEl);
  const addForm = document.getElementById('addForm');

  document.getElementById('openAddModal').addEventListener('click', () => addModal.show());

  addForm.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!addForm.checkValidity()) {
      addForm.classList.add('was-validated');
      return;
    }

    const title = document.getElementById('taskTitle').value;
    const url = document.getElementById('taskUrl').value;
    const comment = document.getElementById('taskComment').value;

    addTask(title, url, comment);

    // Закрываем модалку и сбрасываем форму/валидацию
    addModal.hide();
    addForm.reset();
    addForm.classList.remove('was-validated');
  });

  // Сбрасываем форму и валидацию при любом закрытии модалки
  addModalEl.addEventListener('hidden.bs.modal', () => {
    addForm.reset();
    addForm.classList.remove('was-validated');
  });

  // --- Делегирование кликов внутри списка задач ---
  const container = document.getElementById('tasksContainer');

  container.addEventListener('click', (event) => {
    // Редактировать
    const editBtn = event.target.closest('[data-action="edit"]');
    if (editBtn) {
      const id = editBtn.dataset.id;
      const item = editBtn.closest('.task');
      const task = tasks.find((t) => t.id === id);
      if (task && item) {
        item.innerHTML = renderEditForm(task);
      }
      return;
    }

    // Удалить
    const deleteBtn = event.target.closest('[data-action="delete"]');
    if (deleteBtn) {
      deleteTask(deleteBtn.dataset.id);
      return;
    }

    // Отмена редактирования
    const cancelBtn = event.target.closest('[data-action="cancel-edit"]');
    if (cancelBtn) {
      render();
      return;
    }
  });

  // --- Сохранение inline-редактирования (срабатывает и по Enter) ---
  container.addEventListener('submit', (event) => {
    const form = event.target.closest('.edit-form');
    if (!form) return;

    event.preventDefault();
    event.stopPropagation();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const id = form.dataset.id;
    const title = form.querySelector('[data-field="title"]').value;
    const url = form.querySelector('[data-field="url"]').value;
    const comment = form.querySelector('[data-field="comment"]').value;

    updateTask(id, title, url, comment);
  });
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', init);
