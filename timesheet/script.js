/* ============================================================
   Учёт часов стажёров — вся логика приложения.
   Организовано в IIFE; наружу экспонируется единственный
   глобальный объект App.
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'traineeHoursApp';

  /* ============================================================
     UTILS — даты, числа, id, экранирование HTML
     ============================================================ */
  const Utils = {
    // Date → локальная строка YYYY-MM-DD (без сдвига таймзоны)
    toISODate(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },

    // Сегодняшняя дата в локальном формате YYYY-MM-DD
    todayISO() {
      return this.toISODate(new Date());
    },

    // Текущий месяц в формате YYYY-MM
    currentMonth() {
      return this.todayISO().slice(0, 7);
    },

    // YYYY-MM-DD → DD.MM.YYYY
    formatDateDMY(iso) {
      if (!iso || typeof iso !== 'string') return '';
      const parts = iso.split('-');
      if (parts.length !== 3) return iso;
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    },

    // YYYY-MM → MM.YYYY
    formatMonthMY(key) {
      if (!key || typeof key !== 'string') return '';
      const parts = key.split('-');
      if (parts.length !== 2) return key;
      return `${parts[1]}.${parts[0]}`;
    },

    // Число без хвостовых нулей: 2, 1.5
    formatHours(value) {
      const n = Math.round((Number(value) || 0) * 100) / 100;
      return String(n);
    },

    // Уникальный id
    uid() {
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    },

    // Экранирование HTML — защита от инъекций пользовательского текста
    escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    // Русская плюрализация: plural(5, 'запись', 'записи', 'записей') → 'записей'
    plural(n, one, few, many) {
      const n10 = n % 10;
      const n100 = n % 100;
      if (n10 === 1 && n100 !== 11) return one;
      if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
      return many;
    },
  };

  /* ============================================================
     STORAGE — чтение/запись localStorage, инициализация, миграции
     ============================================================ */
  const Storage = {
    warning: false, // флаг: данные были повреждены и заменены на пустые

    defaultData() {
      return { currentUser: '', trainees: [], entries: [] };
    },

    // Безопасное чтение с нормализацией; при ошибке — пустое состояние
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return this.defaultData();
        const parsed = JSON.parse(raw);
        return this.normalize(parsed);
      } catch (e) {
        console.error('Ошибка чтения localStorage:', e);
        this.warning = true;
        return this.defaultData();
      }
    },

    // Все изменения сразу пишутся в localStorage
    save(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('Ошибка записи localStorage:', e);
        App.showToast('Не удалось сохранить данные в localStorage', 'danger');
        return false;
      }
    },

    // Приведение произвольных данных к ожидаемой схеме (миграция/восстановление)
    normalize(data) {
      if (!data || typeof data !== 'object') {
        this.warning = true;
        return this.defaultData();
      }
      const result = this.defaultData();
      result.currentUser = typeof data.currentUser === 'string' ? data.currentUser.trim() : '';
      result.trainees = (Array.isArray(data.trainees) ? data.trainees : [])
        .filter((t) => t && t.id)
        .map((t) => ({
          id: String(t.id),
          name: typeof t.name === 'string' ? t.name : '',
          archived: !!t.archived,
          createdAt: t.createdAt || '',
        }));
      result.entries = (Array.isArray(data.entries) ? data.entries : [])
        .filter((e) => e && e.id)
        .map((e) => ({
          id: String(e.id),
          traineeId: e.traineeId || '',
          traineeNameSnapshot: typeof e.traineeNameSnapshot === 'string' ? e.traineeNameSnapshot : '',
          date: typeof e.date === 'string' ? e.date : '',
          hours: typeof e.hours === 'number' ? e.hours : 0,
          comment: typeof e.comment === 'string' ? e.comment : '',
          archived: !!e.archived,
        }));
      return result;
    },
  };

  /* ============================================================
     STATE — текущее состояние интерфейса
     ============================================================ */
  const State = {
    selectedMonth: Utils.currentMonth(), // выбранный месяц YYYY-MM
    traineeFilter: 'all',                 // 'all' или id стажёра
    onlySelectedTrainee: false,           // чекбокс «только выбранный стажёр»
    editingEntryId: null,                 // id редактируемой записи (не используется напрямую)
    editingTraineeId: null,               // id редактируемого стажёра
    pendingDeleteTraineeId: null,         // стажёр, ожидающий подтверждения удаления
    isFirstLaunch: true,
  };

  /* ============================================================
     RENDER — рендер таблиц, селектов, статистики, итогов
     ============================================================ */
  const Render = {
    // ФИО исполнителя в шапке
    user() {
      document.getElementById('currentUserName').textContent = App.data.currentUser || '—';
    },

    // Заполнить селекты стажёров (фильтр + модалка записи)
    traineeSelects() {
      const active = App.activeTrainees();
      const filterEl = document.getElementById('traineeFilter');
      const entryTraineeEl = document.getElementById('entryTrainee');
      const prevFilter = filterEl.value;
      const prevEntry = entryTraineeEl.value;

      filterEl.innerHTML =
        '<option value="all">Все стажёры</option>' +
        active.map((t) => `<option value="${t.id}">${Utils.escapeHtml(t.name)}</option>`).join('');
      filterEl.value = prevFilter && active.some((t) => t.id === prevFilter) ? prevFilter : 'all';
      // Синхронизируем состояние: если стажёр был удалён, фильтр сбрасывается на «Все»
      State.traineeFilter = filterEl.value;

      entryTraineeEl.innerHTML =
        '<option value="" disabled selected>Выберите стажёра</option>' +
        active.map((t) => `<option value="${t.id}">${Utils.escapeHtml(t.name)}</option>`).join('');
      if (prevEntry && active.some((t) => t.id === prevEntry)) {
        entryTraineeEl.value = prevEntry;
      }
    },

    // Список стажёров (управление)
    traineeList() {
      const listEl = document.getElementById('traineeList');
      const emptyEl = document.getElementById('traineeEmpty');
      const trainees = App.activeTrainees();

      if (trainees.length === 0) {
        listEl.innerHTML = '';
        emptyEl.classList.remove('d-none');
        return;
      }
      emptyEl.classList.add('d-none');
      listEl.innerHTML = trainees
        .map(
          (t) => `
        <li class="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
          <span class="trainee-name">${Utils.escapeHtml(t.name)}</span>
          <span class="btn-group btn-group-sm flex-shrink-0">
            <button class="btn btn-outline-secondary rename-trainee" data-id="${t.id}"><i class="bi bi-pencil me-1"></i>Переименовать</button>
            <button class="btn btn-outline-danger delete-trainee" data-id="${t.id}"><i class="bi bi-trash me-1"></i>Удалить</button>
          </span>
        </li>`
        )
        .join('');
    },

    // Записи выбранного месяца с учётом фильтра (архивные не показываются)
    filteredEntries() {
      const month = State.selectedMonth;
      let entries = App.data.entries.filter(
        (e) => !e.archived && e.date && e.date.slice(0, 7) === month
      );
      if (State.traineeFilter !== 'all') {
        entries = entries.filter((e) => e.traineeId === State.traineeFilter);
      }
      // Сортировка по дате (возр.), затем по имени
      entries.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return App.traineeName(a).localeCompare(App.traineeName(b), 'ru');
      });
      return entries;
    },

    // Таблица записей (desktop)
    recordsTable(entries) {
      const tbody = document.getElementById('entriesTbody');
      if (entries.length === 0) {
        tbody.innerHTML = '';
        return;
      }
      tbody.innerHTML = entries
        .map(
          (e) => `
        <tr class="entry-row" data-id="${e.id}">
          <td>${Utils.formatDateDMY(e.date)}</td>
          <td>${Utils.escapeHtml(App.traineeName(e))}</td>
          <td>${Utils.formatHours(e.hours)}</td>
          <td class="text-wrap">${Utils.escapeHtml(e.comment)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-secondary edit-entry" data-id="${e.id}" title="Редактировать"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger delete-entry" data-id="${e.id}" title="Удалить"><i class="bi bi-trash"></i></button>
          </td>
        </tr>`
        )
        .join('');
    },

    // Карточки записей (mobile)
    recordsCards(entries) {
      const wrap = document.getElementById('entriesCards');
      if (entries.length === 0) {
        wrap.innerHTML = '';
        return;
      }
      wrap.innerHTML = entries
        .map(
          (e) => `
        <div class="card entry-card shadow-sm mb-2" data-id="${e.id}">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div class="fw-semibold">${Utils.escapeHtml(App.traineeName(e))}</div>
                <div class="text-muted small">${Utils.formatDateDMY(e.date)}</div>
              </div>
              <span class="badge text-bg-primary flex-shrink-0">${Utils.formatHours(e.hours)} ч</span>
            </div>
            ${e.comment ? `<div class="mt-2 small text-wrap">${Utils.escapeHtml(e.comment)}</div>` : ''}
            <div class="mt-2 d-flex gap-2">
              <button class="btn btn-sm btn-outline-secondary edit-entry" data-id="${e.id}"><i class="bi bi-pencil"></i> Изменить</button>
              <button class="btn btn-sm btn-outline-danger delete-entry" data-id="${e.id}"><i class="bi bi-trash"></i> Удалить</button>
            </div>
          </div>
        </div>`
        )
        .join('');
    },

    // Полное обновление вкладки «Записи»
    records() {
      const entries = this.filteredEntries();
      const hasData = entries.length > 0;
      this.recordsTable(entries);
      this.recordsCards(entries);
      document.getElementById('recordsEmpty').classList.toggle('d-none', hasData);
      this.totals(entries);
    },

    // Итог за месяц + разбивка по стажёрам
    totals(entries) {
      const box = document.querySelector('#monthTotal .card-body');
      if (entries.length === 0) {
        box.innerHTML = '<span class="text-muted">Итого: 0 ч</span>';
        return;
      }
      const total = entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
      const byTrainee = {};
      entries.forEach((e) => {
        const name = App.traineeName(e);
        byTrainee[name] = (byTrainee[name] || 0) + (Number(e.hours) || 0);
      });
      const breakdown = Object.entries(byTrainee)
        .sort((a, b) => a[0].localeCompare(b[0], 'ru'))
        .map(
          ([name, h]) =>
            `<span class="badge text-bg-light border me-1 mb-1">${Utils.escapeHtml(name)}: ${Utils.formatHours(h)} ч</span>`
        )
        .join('');
      box.innerHTML = `<div class="fw-semibold">Итого: ${Utils.formatHours(total)} ч</div><div class="mt-2">${breakdown}</div>`;
    },

    // Имя стажёра в статистике: активный → текущее имя, удалённый → «(удалён) ФИО»
    statsName(entry) {
      const t = App.data.trainees.find((x) => x.id === entry.traineeId);
      const active = t && !t.archived && !entry.archived;
      if (active) return t.name;
      return '(удалён) ' + (entry.traineeNameSnapshot || '—');
    },

    // Статистика: строки — стажёры, столбцы — месяцы ММ.ГГГГ
    stats() {
      const tableEl = document.getElementById('statsTable');
      const emptyEl = document.getElementById('statsEmpty');

      // Только записи с корректной датой
      const all = App.data.entries.filter(
        (e) => e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
      );

      if (all.length === 0) {
        tableEl.innerHTML = '';
        tableEl.classList.add('d-none');
        emptyEl.classList.remove('d-none');
        return;
      }

      // Уникальные месяцы (по возрастанию)
      const months = [...new Set(all.map((e) => e.date.slice(0, 7)))].sort();
      // Уникальные имена стажёров
      const names = [...new Set(all.map((e) => this.statsName(e)))].sort((a, b) =>
        a.localeCompare(b, 'ru')
      );

      // Матрица сумм: name → month → hours
      const matrix = {};
      names.forEach((n) => (matrix[n] = {}));
      all.forEach((e) => {
        const m = e.date.slice(0, 7);
        const n = this.statsName(e);
        matrix[n][m] = (matrix[n][m] || 0) + (Number(e.hours) || 0);
      });

      let html = '<thead><tr><th class="text-start">Стажёр</th>';
      months.forEach((m) => {
        html += `<th class="text-end">${Utils.formatMonthMY(m)}</th>`;
      });
      html += '<th class="text-end">Всего</th></tr></thead><tbody>';

      const totalsByMonth = {};
      months.forEach((m) => (totalsByMonth[m] = 0));

      names.forEach((n) => {
        let rowTotal = 0;
        html += `<tr><td class="text-start">${Utils.escapeHtml(n)}</td>`;
        months.forEach((m) => {
          const v = matrix[n][m] || 0;
          rowTotal += v;
          totalsByMonth[m] += v;
          html += `<td class="text-end">${v ? Utils.formatHours(v) : ''}</td>`;
        });
        html += `<td class="text-end fw-semibold">${Utils.formatHours(rowTotal)}</td></tr>`;
      });

      let grand = 0;
      html += '<tr class="table-secondary fw-semibold"><td class="text-start">Итого</td>';
      months.forEach((m) => {
        const v = totalsByMonth[m];
        grand += v;
        html += `<td class="text-end">${Utils.formatHours(v)}</td>`;
      });
      html += `<td class="text-end">${Utils.formatHours(grand)}</td></tr>`;
      html += '</tbody>';

      tableEl.innerHTML = html;
      tableEl.classList.remove('d-none');
      emptyEl.classList.add('d-none');
    },
  };

  /* ============================================================
     CLIPBOARD — сборка HTML/plain строк и копирование с fallback
     ============================================================ */
  const Clipboard = {
    // <table> с инлайн-стилями (Outlook игнорирует <style>)
    buildTableHtml(entries) {
      const th = (text) =>
        `<th style="border:1px solid #999;padding:4px 8px;background:#f2f2f2;text-align:left;">${Utils.escapeHtml(text)}</th>`;
      const td = (text) =>
        `<td style="border:1px solid #999;padding:4px 8px;">${Utils.escapeHtml(text)}</td>`;

      const rows = entries
        .map(
          (e) =>
            '<tr>' +
            td(App.data.currentUser) + // в столбце «ФИО» — исполнитель, а не стажёр
            td(Utils.formatDateDMY(e.date)) +
            td(Utils.formatHours(e.hours)) +
            td(e.comment || '') +
            '</tr>'
        )
        .join('');

      return (
        '<table style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;">' +
        '<thead><tr>' + th('ФИО') + th('Дата') + th('Длительность, ч') + th('Комментарий') + '</tr></thead>' +
        '<tbody>' + rows + '</tbody></table>'
      );
    },

    // Полный HTML-документ (флейвор text/html)
    buildHtmlDoc(entries) {
      return '<html><head><meta charset="utf-8"></head><body>' + this.buildTableHtml(entries) + '</body></html>';
    },

    // Plain-text флейвор: табы между колонками, перенос строки между строками
    buildPlain(entries) {
      const header = ['ФИО', 'Дата', 'Длительность, ч', 'Комментарий'].join('\t');
      const rows = entries.map((e) =>
        [App.data.currentUser, Utils.formatDateDMY(e.date), Utils.formatHours(e.hours), e.comment || ''].join('\t')
      );
      return [header, ...rows].join('\n');
    },

    // Копирование с fallback-цепочкой: Clipboard API → execCommand
    async copy(entries) {
      const tableHtml = this.buildTableHtml(entries);
      const htmlDoc = this.buildHtmlDoc(entries);
      const plain = this.buildPlain(entries);

      // Основной путь (Chrome/Edge/новый Safari)
      if (navigator.clipboard && window.ClipboardItem && typeof navigator.clipboard.write === 'function') {
        const supportsHtml =
          typeof ClipboardItem.supports === 'function' ? ClipboardItem.supports('text/html') : true;
        if (supportsHtml) {
          try {
            const item = new ClipboardItem({
              'text/html': new Blob([htmlDoc], { type: 'text/html' }),
              'text/plain': new Blob([plain], { type: 'text/plain' }),
            });
            await navigator.clipboard.write([item]);
            return true;
          } catch (e) {
            console.warn('Clipboard API не сработал, пробуем fallback:', e);
          }
        }
      }

      // Fallback (Firefox, старые браузеры, file:// без HTTPS-контекста)
      return this.execCommandCopy(tableHtml);
    },

    // Fallback: скрытый contenteditable div + выделение + document.execCommand('copy')
    execCommandCopy(tableHtml) {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.setAttribute('aria-hidden', 'true');
      // В live-DOM кладём только <table>, а не весь <html>-документ
      div.innerHTML = tableHtml;
      // Не display:none — иначе выделение не сработает; уводим за экран
      div.style.position = 'fixed';
      div.style.left = '-9999px';
      div.style.top = '0';
      document.body.appendChild(div);

      const selection = window.getSelection();
      const previousRange = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      const range = document.createRange();
      range.selectNodeContents(div);
      selection.removeAllRanges();
      selection.addRange(range);

      let ok = false;
      try {
        // Браузер кладёт в буфер HTML и plain-text одновременно
        ok = document.execCommand('copy');
      } catch (e) {
        console.error('Ошибка execCommand copy:', e);
      }

      selection.removeAllRanges();
      if (previousRange) selection.addRange(previousRange);
      document.body.removeChild(div);
      return ok;
    },
  };

  /* ============================================================
     HANDLERS — обработчики событий
     ============================================================ */
  const Handlers = {
    init() {
      // Шапка
      document.getElementById('editUserBtn').addEventListener('click', () => App.openUserModal(false));
      document.getElementById('copyBtn').addEventListener('click', () => App.copyForOutlook());

      // Переключение на вкладку «Статистика» — перерисовать сводку
      document.getElementById('statsTabBtn').addEventListener('shown.bs.tab', () => Render.stats());

      // Стажёры
      document.getElementById('addTraineeBtn').addEventListener('click', () => App.openTraineeModal());

      // Фильтры
      document.getElementById('monthInput').addEventListener('change', (e) => {
        State.selectedMonth = e.target.value || Utils.currentMonth();
        Render.records();
      });
      document.getElementById('traineeFilter').addEventListener('change', (e) => {
        State.traineeFilter = e.target.value;
        Render.records();
      });
      document.getElementById('onlySelectedTrainee').addEventListener('change', (e) => {
        State.onlySelectedTrainee = e.target.checked;
      });

      // Записи
      document.getElementById('addEntryBtn').addEventListener('click', () => App.openEntryModal());

      // Формы
      document.getElementById('userForm').addEventListener('submit', (e) => this.submitUser(e));
      document.getElementById('traineeForm').addEventListener('submit', (e) => this.submitTrainee(e));
      document.getElementById('entryForm').addEventListener('submit', (e) => this.submitEntry(e));

      // Подтверждение удаления стажёра
      document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.confirmDeleteTrainee(true));
      document.getElementById('archiveDeleteBtn').addEventListener('click', () => this.confirmDeleteTrainee(false));

      // Делегирование событий для динамических элементов
      document.getElementById('traineeList').addEventListener('click', (e) => this.onTraineeListClick(e));
      document.getElementById('entriesTbody').addEventListener('click', (e) => this.onEntriesClick(e));
      document.getElementById('entriesCards').addEventListener('click', (e) => this.onEntriesClick(e));
    },

    // --- Форма: исполнитель ---
    submitUser(e) {
      e.preventDefault();
      e.stopPropagation();
      const form = e.currentTarget;
      form.classList.add('was-validated');
      const name = document.getElementById('userNameInput').value.trim();
      if (!name) return;

      App.data.currentUser = name;
      Storage.save(App.data);
      Render.user();
      App.userModal.hide();
      App.showToast('Исполнитель сохранён', 'success');
      App.unlockApp();
    },

    // --- Форма: стажёр (добавить/переименовать) ---
    submitTrainee(e) {
      e.preventDefault();
      e.stopPropagation();
      const form = e.currentTarget;
      const nameInput = document.getElementById('traineeNameInput');
      const feedback = document.getElementById('traineeNameFeedback');
      const id = document.getElementById('traineeIdInput').value;
      const name = nameInput.value.trim();

      // Сброс кастомной валидации
      nameInput.setCustomValidity('');
      feedback.textContent = 'Введите ФИО стажёра.';

      // Собственная проверка на дубликат (без учёта регистра)
      const dup = App.data.trainees.some(
        (t) => !t.archived && t.id !== id && t.name.trim().toLowerCase() === name.toLowerCase()
      );
      if (name && dup) {
        nameInput.setCustomValidity('duplicate');
        feedback.textContent = 'Стажёр с таким ФИО уже есть в списке.';
      }

      form.classList.add('was-validated');
      if (!form.checkValidity()) return;

      if (id) {
        const t = App.data.trainees.find((x) => x.id === id);
        if (t) t.name = name;
      } else {
        App.data.trainees.push({
          id: Utils.uid(),
          name,
          archived: false,
          createdAt: new Date().toISOString(),
        });
      }
      Storage.save(App.data);
      App.traineeModal.hide();
      App.refreshAll();
      App.showToast(id ? 'Стажёр переименован' : 'Стажёр добавлен', 'success');
    },

    // --- Форма: запись ---
    submitEntry(e) {
      e.preventDefault();
      e.stopPropagation();
      const form = e.currentTarget;
      form.classList.add('was-validated');
      if (!form.checkValidity()) return;

      const id = document.getElementById('entryIdInput').value;
      const traineeId = document.getElementById('entryTrainee').value;
      const date = document.getElementById('entryDate').value;
      const hours = parseFloat(document.getElementById('entryHours').value);
      const comment = document.getElementById('entryComment').value.trim();
      const trainee = App.data.trainees.find((t) => t.id === traineeId);

      if (id) {
        const entry = App.data.entries.find((x) => x.id === id);
        if (entry) {
          entry.traineeId = traineeId;
          entry.traineeNameSnapshot = trainee ? trainee.name : entry.traineeNameSnapshot;
          entry.date = date;
          entry.hours = hours;
          entry.comment = comment;
        }
      } else {
        App.data.entries.push({
          id: Utils.uid(),
          traineeId,
          traineeNameSnapshot: trainee ? trainee.name : '',
          date,
          hours,
          comment,
          archived: false,
        });
      }
      Storage.save(App.data);
      App.entryModal.hide();
      App.refreshAll();
      App.showToast(id ? 'Запись обновлена' : 'Запись добавлена', 'success');
    },

    // --- Удаление стажёра: подтверждение ---
    confirmDeleteTrainee(withEntries) {
      const id = State.pendingDeleteTraineeId;
      State.pendingDeleteTraineeId = null;
      if (!id) return;

      if (withEntries) {
        App.data.trainees = App.data.trainees.filter((t) => t.id !== id);
        App.data.entries = App.data.entries.filter((e) => e.traineeId !== id);
        App.showToast('Стажёр и его записи удалены', 'success');
      } else {
        App.data.trainees = App.data.trainees.filter((t) => t.id !== id);
        // Записи остаются, но помечаются архивными (не попадают в выгрузку)
        App.data.entries = App.data.entries.map((e) =>
          e.traineeId === id ? Object.assign({}, e, { archived: true }) : e
        );
        App.showToast('Стажёр удалён, записи помечены архивными', 'success');
      }
      Storage.save(App.data);
      App.deleteTraineeModal.hide();
      App.refreshAll();
    },

    // --- Клики по списку стажёров ---
    onTraineeListClick(e) {
      const renameBtn = e.target.closest('.rename-trainee');
      const deleteBtn = e.target.closest('.delete-trainee');
      if (renameBtn) return App.openTraineeModal(renameBtn.dataset.id);
      if (deleteBtn) return App.requestDeleteTrainee(deleteBtn.dataset.id);
    },

    // --- Клики по таблице/карточкам записей ---
    onEntriesClick(e) {
      const deleteBtn = e.target.closest('.delete-entry');
      const editBtn = e.target.closest('.edit-entry');
      const row = e.target.closest('.entry-row, .entry-card');

      if (deleteBtn) {
        e.stopPropagation();
        return App.deleteEntry(deleteBtn.dataset.id);
      }
      if (editBtn) {
        e.stopPropagation();
        return App.openEntryModal(editBtn.dataset.id);
      }
      if (row) return App.openEntryModal(row.dataset.id);
    },
  };

  /* ============================================================
     APP — публичный объект приложения (единственный глобальный)
     ============================================================ */
  const App = {
    data: null,
    userModal: null,
    traineeModal: null,
    entryModal: null,
    deleteTraineeModal: null,

    init() {
      // Защита на случай, если CDN Bootstrap не загрузился
      if (typeof bootstrap === 'undefined') {
        document.body.innerHTML =
          '<div class="alert alert-danger m-3">Не удалось загрузить Bootstrap. Проверьте подключение к интернету и перезагрузите страницу.</div>';
        return;
      }

      this.data = Storage.load();

      this.userModal = new bootstrap.Modal(document.getElementById('userModal'));
      this.traineeModal = new bootstrap.Modal(document.getElementById('traineeModal'));
      this.entryModal = new bootstrap.Modal(document.getElementById('entryModal'));
      this.deleteTraineeModal = new bootstrap.Modal(document.getElementById('deleteTraineeModal'));

      State.selectedMonth = Utils.currentMonth();
      document.getElementById('monthInput').value = State.selectedMonth;

      Handlers.init();

      // Предупреждение о повреждённых данных
      if (Storage.warning) {
        this.showToast('Данные были повреждены — загружено пустое состояние', 'warning');
      }

      // Первый запуск: запросить исполнителя и заблокировать приложение
      if (!this.data.currentUser) {
        document.getElementById('appContent').classList.add('d-none');
        State.isFirstLaunch = true;
        this.openUserModal(true);
      } else {
        this.unlockApp();
      }
    },

    // Разблокировать приложение после указания исполнителя
    unlockApp() {
      document.getElementById('appContent').classList.remove('d-none');
      document.getElementById('copyBtn').disabled = false;
      State.isFirstLaunch = false;
      this.refreshAll();
    },

    // Полное обновление интерфейса
    refreshAll() {
      Render.user();
      Render.traineeSelects();
      Render.traineeList();
      Render.records();
      Render.stats();
    },

    // Активные (неархивные) стажёры
    activeTrainees() {
      return this.data.trainees.filter((t) => !t.archived);
    },

    // Отображаемое имя стажёра для записи (текущее имя или снапшот)
    traineeName(entry) {
      const t = this.data.trainees.find((x) => x.id === entry.traineeId && !x.archived);
      return t ? t.name : entry.traineeNameSnapshot || '—';
    },

    // --- Модальные окна ---
    openUserModal(isFirst) {
      const input = document.getElementById('userNameInput');
      input.value = this.data.currentUser || '';
      document.getElementById('userModalTitle').textContent = isFirst ? 'Кто вы?' : 'Изменить исполнителя';
      document.getElementById('userModalClose').classList.toggle('d-none', isFirst);
      document.getElementById('userCancelBtn').classList.toggle('d-none', isFirst);
      document.getElementById('userForm').classList.remove('was-validated');
      this.userModal.show();
      setTimeout(() => input.focus(), 200);
    },

    openTraineeModal(id) {
      const title = document.getElementById('traineeModalTitle');
      const nameInput = document.getElementById('traineeNameInput');
      const idInput = document.getElementById('traineeIdInput');
      const feedback = document.getElementById('traineeNameFeedback');
      const form = document.getElementById('traineeForm');

      form.classList.remove('was-validated');
      nameInput.setCustomValidity('');
      feedback.textContent = 'Введите ФИО стажёра.';

      if (id) {
        const t = this.data.trainees.find((x) => x.id === id);
        title.textContent = 'Переименовать стажёра';
        idInput.value = id;
        nameInput.value = t ? t.name : '';
      } else {
        title.textContent = 'Добавить стажёра';
        idInput.value = '';
        nameInput.value = '';
      }
      this.traineeModal.show();
      setTimeout(() => nameInput.focus(), 200);
    },

    openEntryModal(id) {
      const title = document.getElementById('entryModalTitle');
      const form = document.getElementById('entryForm');
      const select = document.getElementById('entryTrainee');
      const date = document.getElementById('entryDate');
      const hours = document.getElementById('entryHours');
      const comment = document.getElementById('entryComment');

      form.classList.remove('was-validated');
      document.getElementById('entryIdInput').value = id || '';
      Render.traineeSelects(); // обновить список вариантов

      if (id) {
        const e = this.data.entries.find((x) => x.id === id);
        if (e) {
          title.textContent = 'Редактировать запись';
          select.value = e.traineeId;
          date.value = e.date;
          hours.value = Utils.formatHours(e.hours);
          comment.value = e.comment || '';
        }
      } else {
        title.textContent = 'Добавить запись';
        select.value = '';
        date.value = Utils.todayISO(); // по умолчанию — сегодня (локально)
        hours.value = '';
        comment.value = '';
        // Если в фильтре выбран конкретный стажёр — подставить его
        if (State.traineeFilter !== 'all') select.value = State.traineeFilter;
      }
      this.entryModal.show();
    },

    // --- Удаление записи ---
    deleteEntry(id) {
      const e = this.data.entries.find((x) => x.id === id);
      if (!e) return;
      if (!window.confirm('Удалить запись?')) return;
      this.data.entries = this.data.entries.filter((x) => x.id !== id);
      Storage.save(this.data);
      this.refreshAll();
      this.showToast('Запись удалена', 'success');
    },

    // --- Запрос на удаление стажёра (с выбором при наличии записей) ---
    requestDeleteTrainee(id) {
      const t = this.data.trainees.find((x) => x.id === id);
      if (!t) return;
      const count = this.data.entries.filter((e) => e.traineeId === id && !e.archived).length;
      State.pendingDeleteTraineeId = id;

      if (count === 0) {
        if (!window.confirm(`Удалить стажёра «${t.name}»?`)) return;
        this.data.trainees = this.data.trainees.filter((x) => x.id !== id);
        Storage.save(this.data);
        this.refreshAll();
        this.showToast('Стажёр удалён', 'success');
        return;
      }

      const word = Utils.plural(count, 'запись', 'записи', 'записей');
      document.getElementById('deleteTraineeText').textContent =
        `У стажёра «${t.name}» есть ${count} ${word}. Удалить вместе с записями?`;
      this.deleteTraineeModal.show();
    },

    // --- Копирование таблицы для Outlook ---
    copyForOutlook() {
      const month = State.selectedMonth;
      let entries = this.data.entries.filter(
        (e) => !e.archived && e.date && e.date.slice(0, 7) === month
      );

      // Опционально — только выбранный стажёр
      if (State.onlySelectedTrainee && State.traineeFilter !== 'all') {
        entries = entries.filter((e) => e.traineeId === State.traineeFilter);
      }

      // Порядок строк: по дате (возр.), затем по имени стажёра для стабильности
      entries.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return App.traineeName(a).localeCompare(App.traineeName(b), 'ru');
      });

      if (entries.length === 0) {
        this.showToast('Нет данных за выбранный месяц', 'warning');
        return;
      }

      Clipboard.copy(entries).then((ok) => {
        const word = Utils.plural(entries.length, 'запись', 'записи', 'записей');
        if (ok) this.showToast(`Скопировано ${entries.length} ${word} (как таблица)`, 'success');
        else this.showToast('Не удалось скопировать — попробуйте в другом браузере', 'danger');
      });
    },

    // --- Тосты ---
    showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      const classes = {
        success: 'text-bg-success',
        danger: 'text-bg-danger',
        warning: 'text-bg-warning',
        info: 'text-bg-secondary',
      };
      const icons = {
        success: 'bi-check-circle-fill',
        danger: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill',
      };
      const el = document.createElement('div');
      el.className = `toast align-items-center ${classes[type] || classes.info} border-0`;
      el.setAttribute('role', 'alert');
      el.innerHTML =
        '<div class="d-flex">' +
        '<div class="toast-body d-flex align-items-center gap-2">' +
        `<i class="bi ${icons[type] || icons.info}"></i>` +
        `<span>${Utils.escapeHtml(message)}</span>` +
        '</div>' +
        '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Закрыть"></button>' +
        '</div>';
      container.appendChild(el);

      const toast = new bootstrap.Toast(el, { delay: 4000 });
      el.addEventListener('hidden.bs.toast', () => el.remove());
      toast.show();
    },
  };

  // Экспорт единственного глобального объекта
  window.App = App;

  // Запуск после готовности DOM (скрипт подключён с defer, но перестрахуемся)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }
})();
