(function (global) {
  'use strict';

  const app = global.app = global.app || {};
  const Parser = app.excelParser;
  const Accounts = app.accounts;
  const Analytics = app.analytics;
  const Charts = app.charts;

  const state = {
    accounts: [],
    selectedAccountIds: new Set(),
    charts: {},
    txSearch: '',
    txMonth: null,
    txSort: { key: 'date', dir: 'desc' },
    txPage: 1,
    txPageSize: 10,
    uploadSession: null,
    renameAccountId: null,
    confirmCallback: null
  };

  // Данные намеренно не сохраняются в localStorage: после перезагрузки
  // пользователь загружает выписки заново, как и требуется.
  let dom = {};
  let modals = {};
  let chartElements = {};
  let searchTimer = null;
  let lastDashboardVisible = false;

  const numberFormatter = new Intl.NumberFormat('ru-RU');

  const EXCLUSION_LABELS = {
    'own-transfer': 'переводы между своими счетами',
    loan: 'погашения кредитов',
    phone: 'переводы по номеру +7 (915) 199-98-45',
    person: 'переводы Юлии Владимировне Н'
  };

  const EXCLUSION_ROW_LABELS = {
    'own-transfer': 'перевод между счетами',
    loan: 'погашение кредита',
    phone: 'перевод по номеру телефона',
    person: 'перевод получателю'
  };

  /* ------------------------------------------------------------------------
     Утилиты
     ------------------------------------------------------------------------ */

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function formatNumber(value) {
    return numberFormatter.format(Number(value) || 0);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function plural(count, one, few, many) {
    const abs = Math.abs(Number(count) || 0);
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  function formatFileSize(bytes) {
    const size = Number(bytes) || 0;
    if (size >= 1024 * 1024) {
      return `${(size / (1024 * 1024)).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ`;
    }
    if (size >= 1024) {
      return `${(size / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} КБ`;
    }
    return `${size} Б`;
  }

  function nextFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  }

  function getFilter() {
    return {
      accountIds: state.selectedAccountIds
    };
  }

  function getAllAccountIds() {
    return state.accounts.map((account) => account.id);
  }

  function activeAccount() {
    return state.accounts.find((account) => account.id === state.renameAccountId) || null;
  }

  function getAccountStats() {
    const allIds = new Set(getAllAccountIds());
    const totals = Analytics.getAccountTotals(state.accounts, {
      accountIds: allIds
    });
    return new Map(totals.map((item) => [item.accountId, item]));
  }

  /* ------------------------------------------------------------------------
     Инициализация
     ------------------------------------------------------------------------ */

  function cacheDom() {
    dom = {
      uploadScreen: byId('uploadScreen'),
      dashboard: byId('dashboard'),
      dropZone: byId('dropZone'),
      chooseFilesBtn: byId('chooseFilesBtn'),
      fileInput: byId('fileInput'),
      addFileBtn: byId('addFileBtn'),
      clearAllBtn: byId('clearAllBtn'),
      brandHome: byId('brandHome'),
      accountsFilterBtn: byId('accountsFilterBtn'),
      accountsFilterLabel: byId('accountsFilterLabel'),
      accountsMenuList: byId('accountsMenuList'),
      accountsMenuCount: byId('accountsMenuCount'),
      accountsChips: byId('accountsChips'),
      accountsCountBadge: byId('accountsCountBadge'),
      dashboardSubtitle: byId('dashboardSubtitle'),
      periodBadge: byId('periodBadge'),
      selectionNotice: byId('selectionNotice'),
      selectAllNoticeBtn: byId('selectAllNoticeBtn'),
      uploadAlert: byId('uploadAlert'),
      monthlyKpiCards: byId('monthlyKpiCards'),
      monthlyKpiEmpty: byId('monthlyKpiEmpty'),
      monthsCountBadge: byId('monthsCountBadge'),
      categoryMatrixHead: byId('categoryMatrixHead'),
      categoryMatrixBody: byId('categoryMatrixBody'),
      categoryMatrixWrap: byId('categoryMatrixWrap'),
      categoryMatrixEmpty: byId('categoryMatrixEmpty'),
      categoryMatrixTotal: byId('categoryMatrixTotal'),
      categoryMatrixSubtitle: byId('categoryMatrixSubtitle'),
      chartCardMonthlyCategories: byId('chartCardMonthlyCategories'),
      chartCardAccounts: byId('chartCardAccounts'),
      txSearch: byId('txSearch'),
      txSearchClear: byId('txSearchClear'),
      txMonthSelect: byId('txMonthSelect'),
      excludedCountBadge: byId('excludedCountBadge'),
      excludedSubtitle: byId('excludedSubtitle'),
      excludedTableWrap: byId('excludedTableWrap'),
      excludedTableBody: byId('excludedTableBody'),
      excludedEmpty: byId('excludedEmpty'),
      txTableHead: document.querySelector('.tx-table thead'),
      txTableBody: byId('txTableBody'),
      txTableWrap: byId('txTableWrap'),
      txEmpty: byId('txEmpty'),
      txEmptyText: byId('txEmptyText'),
      txEmptyReset: byId('txEmptyReset'),
      txFooter: byId('txFooter'),
      txRange: byId('txRange'),
      txPagination: byId('txPagination'),
      txCountLabel: byId('txCountLabel'),
      uploadModal: byId('uploadModal'),
      uploadProgress: byId('uploadProgress'),
      uploadProgressBar: byId('uploadProgressBar'),
      uploadProgressLabel: byId('uploadProgressLabel'),
      uploadProgressPercent: byId('uploadProgressPercent'),
      uploadFiles: byId('uploadFiles'),
      uploadCancelBtn: byId('uploadCancelBtn'),
      uploadConfirmBtn: byId('uploadConfirmBtn'),
      renameModal: byId('renameModal'),
      renameInput: byId('renameInput'),
      renameError: byId('renameError'),
      renameSaveBtn: byId('renameSaveBtn'),
      confirmModal: byId('confirmModal'),
      confirmModalLabel: byId('confirmModalLabel'),
      confirmText: byId('confirmText'),
      confirmActionBtn: byId('confirmActionBtn'),
      toastContainer: byId('toastContainer')
    };
  }

  function init() {
    cacheDom();

    if (!global.bootstrap) {
      console.error('Bootstrap JS не загрузился — модальные окна недоступны.');
    } else {
      modals = {
        upload: new global.bootstrap.Modal(dom.uploadModal),
        rename: new global.bootstrap.Modal(dom.renameModal),
        confirm: new global.bootstrap.Modal(dom.confirmModal)
      };
    }

    chartElements = {
      monthly: { canvas: byId('chartMonthly'), empty: byId('chartMonthlyEmpty') },
      categories: { canvas: byId('chartCategories'), empty: byId('chartCategoriesEmpty') },
      monthlyCategories: { canvas: byId('chartMonthlyCategories'), empty: byId('chartMonthlyCategoriesEmpty') },
      monthlyAccounts: { canvas: byId('chartMonthlyAccounts'), empty: byId('chartMonthlyAccountsEmpty') }
    };
    state.charts = Charts.createCharts(chartElements);
    if (!state.charts) Charts.markUnavailable(chartElements);

    bindEvents();
    bindModalEvents();
    render();

    if (!global.XLSX) {
      showToast('Excel не загрузился', 'Библиотека SheetJS недоступна. Проверьте интернет-соединение и обновите страницу.', 'danger');
    }
    if (!global.Chart) {
      showToast('Графики недоступны', 'Библиотека Chart.js не загрузилась, но таблица и показатели продолжат работать.', 'warning');
    }

    global.addEventListener('unhandledrejection', (event) => {
      console.error('Необработанная ошибка:', event.reason);
      showToast('Что-то пошло не так', 'Подробности в консоли браузера.', 'danger');
    });
  }

  function bindModalEvents() {
    if (!dom.uploadModal) return;

    dom.uploadModal.addEventListener('hidden.bs.modal', () => {
      const session = state.uploadSession;
      if (session) {
        session.active = false;
        state.uploadSession = null;
      }
    });

    dom.renameModal.addEventListener('hidden.bs.modal', () => {
      state.renameAccountId = null;
      dom.renameInput.classList.remove('is-invalid');
    });

    dom.renameModal.addEventListener('shown.bs.modal', () => {
      dom.renameInput.focus();
      dom.renameInput.select();
    });

    dom.confirmModal.addEventListener('hidden.bs.modal', () => {
      state.confirmCallback = null;
    });
  }

  /* ------------------------------------------------------------------------
     События
     ------------------------------------------------------------------------ */

  function bindEvents() {
    dom.chooseFilesBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      openFilePicker();
    });

    dom.dropZone.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      openFilePicker();
    });

    dom.dropZone.addEventListener('keydown', (event) => {
      if (event.target !== dom.dropZone) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openFilePicker();
      }
    });

    ['dragenter', 'dragover'].forEach((eventName) => {
      dom.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        dom.dropZone.classList.add('is-dragover');
      });
    });

    dom.dropZone.addEventListener('dragleave', (event) => {
      if (!dom.dropZone.contains(event.relatedTarget)) {
        dom.dropZone.classList.remove('is-dragover');
      }
    });

    dom.dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      dom.dropZone.classList.remove('is-dragover');
      handleFiles(event.dataTransfer && event.dataTransfer.files);
    });

    document.addEventListener('dragover', (event) => event.preventDefault());
    document.addEventListener('drop', (event) => event.preventDefault());

    dom.fileInput.addEventListener('change', (event) => {
      handleFiles(event.target.files);
      event.target.value = '';
    });

    dom.addFileBtn.addEventListener('click', openFilePicker);
    dom.brandHome.addEventListener('click', () => global.scrollTo({ top: 0, behavior: 'smooth' }));

    dom.clearAllBtn.addEventListener('click', () => {
      openConfirm({
        title: 'Очистить все данные?',
        text: 'Все счета и расходы будут удалены из текущего анализа. Исходные файлы на компьютере останутся нетронутыми.',
        confirmLabel: 'Очистить всё',
        onConfirm() {
          state.accounts = [];
          state.selectedAccountIds.clear();
          state.txSearch = '';
          state.txMonth = null;
          state.txPage = 1;
          state.txSort = { key: 'date', dir: 'desc' };
          dom.txSearch.value = '';
          dom.txSearchClear.classList.add('d-none');
          hideUploadAlert();
          render();
          showToast('Данные очищены', 'Можно загрузить новые выписки.', 'info');
        }
      });
    });

    dom.accountsMenuList.addEventListener('change', (event) => {
      const input = event.target.closest('[data-account-filter]');
      if (!input) return;

      if (input.dataset.accountFilter === 'all') {
        state.selectedAccountIds = input.checked
          ? new Set(getAllAccountIds())
          : new Set();
      } else {
        const id = input.dataset.accountFilter;
        if (input.checked) {
          state.selectedAccountIds.add(id);
        } else {
          state.selectedAccountIds.delete(id);
        }
      }

      state.txPage = 1;
      render();
    });

    dom.accountsChips.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-account-id]');
      if (!chip) return;

      const action = event.target.closest('[data-action]');
      if (action) {
        event.stopPropagation();
        const id = chip.dataset.accountId;
        if (action.dataset.action === 'rename') openRename(id);
        if (action.dataset.action === 'delete') openDeleteAccount(id);
        return;
      }

      selectAccountFromChip(chip.dataset.accountId);
    });

    dom.accountsChips.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const chip = event.target.closest('.account-chip');
      if (!chip || event.target !== chip) return;
      event.preventDefault();
      selectAccountFromChip(chip.dataset.accountId);
    });

    dom.selectAllNoticeBtn.addEventListener('click', () => {
      state.selectedAccountIds = new Set(getAllAccountIds());
      state.txPage = 1;
      render();
    });

    dom.txMonthSelect.addEventListener('change', () => {
      state.txMonth = dom.txMonthSelect.value || null;
      state.txPage = 1;
      renderTable();
    });

    dom.txSearch.addEventListener('input', () => {
      state.txSearch = dom.txSearch.value;
      state.txPage = 1;
      dom.txSearchClear.classList.toggle('d-none', !state.txSearch);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(renderTable, 120);
    });

    dom.txSearchClear.addEventListener('click', () => {
      state.txSearch = '';
      dom.txSearch.value = '';
      dom.txSearchClear.classList.add('d-none');
      state.txPage = 1;
      renderTable();
      dom.txSearch.focus();
    });

    dom.txTableHead.addEventListener('click', (event) => {
      const button = event.target.closest('[data-sort]');
      if (!button) return;
      const key = button.dataset.sort;
      if (state.txSort.key === key) {
        state.txSort.dir = state.txSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.txSort.key = key;
        state.txSort.dir = key === 'date' || key === 'amount' ? 'desc' : 'asc';
      }
      state.txPage = 1;
      renderTable();
    });

    dom.txPagination.addEventListener('click', (event) => {
      const button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      const page = Number(button.dataset.page);
      if (!Number.isFinite(page)) return;
      state.txPage = page;
      renderTable();
    });

    dom.txTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="toggle-ignore"]');
      if (!button) return;
      toggleTransactionIgnored(button.dataset.txId);
    });

    dom.excludedTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="include-excluded"]');
      if (!button) return;
      includeExcludedTransaction(button.dataset.txId);
    });

    dom.txEmptyReset.addEventListener('click', resetFilters);

    dom.uploadCancelBtn.addEventListener('click', cancelUpload);
    dom.uploadConfirmBtn.addEventListener('click', confirmUpload);

    dom.uploadFiles.addEventListener('input', (event) => {
      const input = event.target.closest('.upload-account-name');
      if (!input || !state.uploadSession) return;
      const index = Number(input.dataset.entryIndex);
      const entry = state.uploadSession.entries[index];
      if (entry) {
        entry.name = input.value;
        input.classList.remove('is-invalid');
      }
    });

    dom.renameSaveBtn.addEventListener('click', saveRename);
    dom.renameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveRename();
      }
    });
    dom.renameInput.addEventListener('input', () => {
      dom.renameInput.classList.remove('is-invalid');
    });

    dom.confirmActionBtn.addEventListener('click', () => {
      const callback = state.confirmCallback;
      state.confirmCallback = null;
      hideModal('confirm');
      if (typeof callback === 'function') callback();
    });
  }

  /* ------------------------------------------------------------------------
     Загрузка файлов
     ------------------------------------------------------------------------ */

  function openFilePicker() {
    if (state.uploadSession && !state.uploadSession.finished) return;
    dom.fileInput.value = '';
    dom.fileInput.click();
  }

  /**
   * Загружает один или несколько файлов, парсит их и открывает модалку
   * с превью и названиями счетов. Ошибка одного файла не прерывает остальные.
   * @param {FileList|File[]} fileList
   */
  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (state.uploadSession && !state.uploadSession.finished) return;

    const session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entries: files.map((file, index) => ({
        index,
        file,
        status: 'pending',
        name: '',
        suggestedName: '',
        hash: '',
        parsed: null,
        expenses: [],
        excludedExpenses: [],
        errors: [],
        warnings: [],
        error: '',
        duplicateName: ''
      })),
      active: true,
      finished: false,
      processed: 0
    };

    state.uploadSession = session;
    renderUploadModal(session);
    showModal('upload');
    await nextFrame();

    for (const entry of session.entries) {
      if (!session.active || state.uploadSession !== session) break;

      entry.status = 'parsing';
      renderUploadModal(session);
      await nextFrame();

      await processFileEntry(entry, session);

      if (!session.active || state.uploadSession !== session) break;
      session.processed += 1;
      renderUploadModal(session);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    if (!session.active || state.uploadSession !== session) return;
    session.finished = true;
    session.processed = session.entries.length;
    renderUploadModal(session);
  }

  async function processFileEntry(entry, session) {
    entry.errors = [];
    entry.warnings = [];
    entry.error = '';

    try {
      if (!/\.(xlsx|xls)$/i.test(entry.file.name)) {
        throw new Error('Неподдерживаемый формат. Выберите файл .xlsx или .xls.');
      }
      if (!entry.file.size) {
        throw new Error('Файл пустой.');
      }

      const buffer = await entry.file.arrayBuffer();
      const hash = await Accounts.hashBuffer(buffer);
      entry.hash = hash;

      const existing = state.accounts.find((account) => account.fileHash === hash);
      const duplicateInSession = session.entries.find((other) => (
        other !== entry && other.hash === hash && (other.status === 'ready' || other.status === 'duplicate')
      ));

      if (existing || duplicateInSession) {
        entry.status = 'duplicate';
        entry.duplicateName = existing ? existing.name : duplicateInSession.file.name;
        entry.error = existing
          ? `Этот файл уже загружен как «${existing.name}».`
          : 'Этот же файл уже выбран в текущем импорте.';
        return;
      }

      const parsed = Parser.parseBuffer(buffer, entry.file.name);
      entry.parsed = parsed;
      entry.suggestedName = parsed.detectedAccountName || 'Новый счёт';
      entry.name = entry.name || entry.suggestedName;

      if (parsed.errors && parsed.errors.length) {
        entry.status = 'error';
        entry.errors = parsed.errors;
        entry.warnings = parsed.warnings || [];
        return;
      }

      const expenseRows = parsed.transactions.filter((transaction) => transaction.amount < 0);
      const excludedExpenses = expenseRows.filter((transaction) => transaction.excludeReason);
      entry.expenses = expenseRows;
      entry.excludedExpenses = excludedExpenses;
      entry.warnings = parsed.warnings ? parsed.warnings.slice() : [];

      if (excludedExpenses.length) {
        const reasonCounts = new Map();
        excludedExpenses.forEach((transaction) => {
          reasonCounts.set(
            transaction.excludeReason,
            (reasonCounts.get(transaction.excludeReason) || 0) + 1
          );
        });
        const details = Array.from(reasonCounts.entries())
          .map(([reason, count]) => `${EXCLUSION_LABELS[reason] || 'исключённые операции'} — ${count}`)
          .join('; ');
        entry.warnings.push(`Исключены из анализа: ${details}. Их можно вернуть в таблице исключённых расходов.`);
      }

      if (!entry.expenses.length) {
        entry.status = 'error';
        entry.errors = ['В выписке нет расходных операций — учитывать нечего.'];
        return;
      }

      const incomeCount = parsed.transactions.filter((transaction) => (
        transaction.amount > 0 && !transaction.excludeReason
      )).length;
      if (incomeCount > 0) {
        entry.warnings.push(`Доходные операции (${incomeCount}) не учитываются в анализе.`);
      }

      entry.status = 'ready';
    } catch (error) {
      console.error('Ошибка обработки файла:', entry.file.name, error);
      entry.status = 'error';
      entry.errors = [error && error.message ? error.message : 'Неизвестная ошибка чтения файла.'];
    }
  }

  function renderUploadModal(session) {
    if (!dom.uploadFiles || state.uploadSession !== session) return;

    const total = session.entries.length;
    const readyCount = session.entries.filter((entry) => entry.status === 'ready').length;
    const processed = session.finished ? total : session.processed;
    const percent = total ? Math.round((processed / total) * 100) : 0;

    dom.uploadProgressBar.style.width = `${percent}%`;
    dom.uploadProgress.setAttribute('aria-valuenow', String(percent));
    dom.uploadProgressPercent.textContent = `${percent}%`;
    dom.uploadProgressLabel.textContent = session.finished
      ? `Готово: ${readyCount} из ${total}`
      : `Обработано ${processed} из ${total}…`;

    dom.uploadConfirmBtn.disabled = !session.finished || readyCount === 0;

    dom.uploadFiles.innerHTML = session.entries.map((entry) => renderUploadFile(entry, session)).join('');
  }

  function renderUploadFile(entry, session) {
    const statusMap = {
      pending: ['В очереди', 'is-pending'],
      parsing: ['Читаем', 'is-parsing'],
      ready: ['Готов', 'is-ready'],
      error: ['Ошибка', 'is-error'],
      duplicate: ['Дубликат', 'is-duplicate']
    };
    const [statusLabel, statusClass] = statusMap[entry.status] || statusMap.pending;
    const fileMeta = [formatFileSize(entry.file.size)];

    if (entry.status === 'ready' && entry.parsed) {
      fileMeta.push(`${formatNumber(entry.expenses.length)} ${plural(entry.expenses.length, 'расход', 'расхода', 'расходов')}`);
      if (entry.excludedExpenses.length) {
        fileMeta.push(`${formatNumber(entry.excludedExpenses.length)} исключено`);
      }
      if (entry.parsed.bankName) fileMeta.push(entry.parsed.bankName);
    }

    let body = '';

    if (entry.status === 'parsing') {
      body = '<div class="upload-file-body"><span class="upload-file-spinner" aria-hidden="true"></span>Подготавливаем превью…</div>';
    } else if (entry.status === 'pending') {
      body = '<div class="upload-file-body text-muted small">Файл ждёт обработки.</div>';
    } else if (entry.status === 'error') {
      const errors = entry.errors.length ? entry.errors : [entry.error || 'Не удалось обработать файл.'];
      body = `<div class="upload-file-body">
        <div class="upload-error"><i class="bi bi-exclamation-octagon" aria-hidden="true"></i><span>${escapeHtml(errors.join(' '))}</span></div>
      </div>`;
    } else if (entry.status === 'duplicate') {
      body = `<div class="upload-file-body">
        <div class="upload-warning"><i class="bi bi-files" aria-hidden="true"></i><span>${escapeHtml(entry.error)}</span></div>
      </div>`;
    } else if (entry.status === 'ready') {
      const countable = entry.expenses.filter((row) => !row.excludeReason);
      const previewRows = (countable.length ? countable : entry.expenses).slice(0, 4);
      const preview = previewRows.map((row) => `
        <tr>
          <td>${escapeHtml(formatDate(row.date))}</td>
          <td class="preview-cat">${escapeHtml(row.category)}</td>
          <td class="preview-cat">${escapeHtml(String(row.description).slice(0, 70))}</td>
          <td class="text-danger">${escapeHtml(Charts.formatMoney(row.amount))}</td>
        </tr>
      `).join('');

      body = `<div class="upload-file-body">
        <label class="form-label" for="uploadName${entry.index}">Название счёта</label>
        <input type="text" class="form-control upload-name-input upload-account-name" id="uploadName${entry.index}"
               data-entry-index="${entry.index}" maxlength="60" autocomplete="off"
               value="${escapeHtml(entry.name || entry.suggestedName)}" ${session.finished ? '' : 'disabled'}>
        ${(entry.warnings || []).map((warning) => `<div class="upload-warning"><i class="bi bi-info-circle" aria-hidden="true"></i><span>${escapeHtml(warning)}</span></div>`).join('')}
        ${(entry.parsed.errors || []).map((error) => `<div class="upload-error"><i class="bi bi-exclamation-circle" aria-hidden="true"></i><span>${escapeHtml(error)}</span></div>`).join('')}
        <div class="file-preview">
          <div class="file-preview-title">Первые расходы</div>
          <table><tbody>${preview}</tbody></table>
        </div>
      </div>`;
    }

    return `<div class="upload-file ${statusClass}">
      <div class="upload-file-head">
        <span class="file-icon"><i class="bi bi-file-earmark-spreadsheet" aria-hidden="true"></i></span>
        <div class="file-head-main">
          <div class="file-name" title="${escapeHtml(entry.file.name)}">${escapeHtml(entry.file.name)}</div>
          <div class="file-meta">${escapeHtml(fileMeta.join(' · '))}</div>
        </div>
        <span class="file-status ${statusClass}">${statusLabel}</span>
      </div>
      ${body}
    </div>`;
  }

  function cancelUpload() {
    if (state.uploadSession) {
      state.uploadSession.active = false;
      state.uploadSession = null;
    }
    hideModal('upload');
  }

  /**
   * Добавляет все успешно распознанные счета из текущей сессии импорта.
   */
  function confirmUpload() {
    const session = state.uploadSession;
    if (!session || !session.finished) return;

    const ready = session.entries.filter((entry) => entry.status === 'ready');
    if (!ready.length) {
      showToast('Нет готовых файлов', 'Исправьте ошибки или выберите другие выписки.', 'warning');
      return;
    }

    let added = 0;
    for (const entry of ready) {
      const name = String(entry.name || entry.suggestedName || 'Новый счёт').trim() || 'Новый счёт';
      const account = Accounts.createAccount({
        name,
        sourceFile: entry.file.name,
        fileHash: entry.hash,
        transactions: entry.expenses,
        accountNumber: entry.parsed.detectedAccountNumber,
        bankName: entry.parsed.bankName
      }, state.accounts);

      state.accounts.push(account);
      added += 1;
    }

    const total = session.entries.length;
    const failures = session.entries.filter((entry) => entry.status !== 'ready');

    state.selectedAccountIds = new Set(getAllAccountIds());
    state.txPage = 1;
    state.txSearch = '';
    state.txMonth = null;
    dom.txSearch.value = '';
    dom.txSearchClear.classList.add('d-none');

    state.uploadSession = null;
    hideModal('upload');
    render();

    if (failures.length) {
      showUploadSummary(added, total, failures);
      showToast(
        `Загружено ${added} из ${total}`,
        failures.map((entry) => entry.file.name).join(', '),
        'warning'
      );
    } else {
      hideUploadAlert();
      showToast(
        'Готово',
        `Добавлено ${added} ${plural(added, 'счёт', 'счёта', 'счетов')}.`,
        'success'
      );
    }
  }

  function showUploadSummary(added, total, failures) {
    hideUploadAlert();

    const title = document.createElement('div');
    title.className = 'fw-semibold mb-1';
    title.textContent = added > 0
      ? `Загружено ${added} из ${total}. Не добавлено файлов: ${failures.length}.`
      : `Не удалось загрузить ни один файл из ${total}.`;

    const list = document.createElement('ul');
    list.className = 'mb-0 ps-3 small';
    failures.forEach((entry) => {
      const reason = entry.errors && entry.errors.length ? entry.errors.join(' ') : (entry.error || 'Неизвестная ошибка');
      const item = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = entry.file.name;
      item.append(name, ` — ${reason}`);
      list.append(item);
      console.error('Файл не добавлен:', entry.file.name, reason);
    });

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-close';
    close.setAttribute('data-bs-dismiss', 'alert');
    close.setAttribute('aria-label', 'Закрыть');

    dom.uploadAlert.className = 'alert alert-warning alert-dismissible';
    dom.uploadAlert.replaceChildren(title, list, close);
  }

  function hideUploadAlert() {
    dom.uploadAlert.className = 'alert alert-warning alert-dismissible d-none';
    dom.uploadAlert.replaceChildren();
  }

  /* ------------------------------------------------------------------------
     Рендер дашборда
     ------------------------------------------------------------------------ */

  function render() {
    pruneSelection();

    const hasAccounts = state.accounts.length > 0;
    dom.uploadScreen.classList.toggle('d-none', hasAccounts);
    dom.dashboard.classList.toggle('d-none', !hasAccounts);
    document.title = hasAccounts
      ? `Расходы · ${state.accounts.length} ${plural(state.accounts.length, 'счёт', 'счёта', 'счетов')}`
      : 'Расходы — анализ банковских выписок';

    if (!hasAccounts) {
      lastDashboardVisible = false;
      return;
    }

    renderHeaderFilter();
    renderAccounts();
    renderMonthlyKpis();
    renderCharts();
    renderCategoryMatrix();
    renderTable();
    renderExcludedTable();

    if (!lastDashboardVisible) {
      lastDashboardVisible = true;
      requestAnimationFrame(() => {
        if (state.charts) Charts.resizeCharts(state.charts);
      });
    }
  }

  function pruneSelection() {
    const ids = new Set(getAllAccountIds());
    for (const id of Array.from(state.selectedAccountIds)) {
      if (!ids.has(id)) state.selectedAccountIds.delete(id);
    }
  }

  function getMonthColor(monthKey) {
    const monthNumber = Number(String(monthKey).slice(5, 7)) || 1;
    const palette = Charts.ACCOUNT_COLORS;
    return palette[(monthNumber - 1) % palette.length];
  }

  /**
   * Карточки по каждому месяцу. Общий итог за весь период намеренно не выводится.
   */
  function renderMonthlyKpis() {
    const filter = getFilter();
    const summaries = Analytics.getMonthlySummaries(state.accounts, filter);
    const months = Analytics.getAvailableMonths(state.accounts, filter);
    const accountCount = state.selectedAccountIds.size;
    const totalCount = summaries.reduce((sum, item) => sum + item.count, 0);

    dom.monthsCountBadge.textContent = String(summaries.length);
    dom.monthlyKpiEmpty.classList.toggle('d-none', summaries.length > 0);
    dom.monthlyKpiCards.classList.toggle('d-none', summaries.length === 0);
    dom.selectionNotice.classList.toggle('d-none', state.selectedAccountIds.size > 0);

    if (months.length === 1) {
      dom.periodBadge.querySelector('span').textContent = Analytics.getMonthLabel(months[0]);
    } else if (months.length > 1) {
      const newest = Analytics.getMonthShortLabel(months[0]);
      const oldest = Analytics.getMonthShortLabel(months[months.length - 1]);
      dom.periodBadge.querySelector('span').textContent =
        `${formatNumber(months.length)} ${plural(months.length, 'месяц', 'месяца', 'месяцев')} · ${oldest} — ${newest}`;
    } else {
      dom.periodBadge.querySelector('span').textContent = 'Нет месяцев';
    }

    dom.dashboardSubtitle.textContent = state.selectedAccountIds.size === 0
      ? 'Выберите счета в фильтре, чтобы увидеть аналитику.'
      : (summaries.length === 0
        ? 'Нет расходов по выбранным счетам.'
        : `${formatNumber(totalCount)} ${plural(totalCount, 'расход', 'расхода', 'расходов')} · `
          + `${formatNumber(summaries.length)} ${plural(summaries.length, 'месяц', 'месяца', 'месяцев')} · `
          + `${formatNumber(accountCount)} ${plural(accountCount, 'счёт', 'счёта', 'счетов')}`);

    dom.monthlyKpiCards.innerHTML = summaries.slice().reverse().map((summary) => {
      const color = getMonthColor(summary.month);
      const ignoredText = summary.ignoredCount > 0
        ? `${Charts.formatMoney(summary.ignoredTotal)} · ${formatNumber(summary.ignoredCount)}`
        : '—';

      return `<article class="card month-kpi-card" style="--month-color:${escapeHtml(color)}"
                       title="${escapeHtml(summary.label)}: ${escapeHtml(Charts.formatMoney(summary.expenses))}">
        <div class="card-body">
          <div class="month-kpi-head">
            <span class="month-kpi-month">${escapeHtml(summary.label)}</span>
            <span class="month-kpi-count">${formatNumber(summary.count)} ${plural(summary.count, 'расход', 'расхода', 'расходов')}</span>
          </div>
          <div class="month-kpi-total">${escapeHtml(Charts.formatMoney(summary.expenses))}</div>
          <div class="month-kpi-details">
            <div class="month-kpi-detail">
              <span>В день</span>
              <strong>${escapeHtml(Charts.formatMoney(summary.avgPerDay))}</strong>
            </div>
            <div class="month-kpi-detail">
              <span>Исключено</span>
              <strong class="${summary.ignoredCount > 0 ? 'is-ignored' : ''}">${escapeHtml(ignoredText)}</strong>
            </div>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  function renderHeaderFilter() {
    const total = state.accounts.length;
    const selected = state.selectedAccountIds.size;
    const allSelected = total > 0 && selected === total;

    if (selected === 0) {
      dom.accountsFilterLabel.textContent = 'Счета не выбраны';
    } else if (allSelected) {
      dom.accountsFilterLabel.textContent = 'Все счета';
    } else if (selected === 1) {
      const account = state.accounts.find((item) => state.selectedAccountIds.has(item.id));
      dom.accountsFilterLabel.textContent = account ? account.name : '1 счёт';
    } else {
      dom.accountsFilterLabel.textContent = `Выбрано: ${selected}`;
    }
    dom.accountsMenuCount.textContent = `${selected} из ${total}`;

    const stats = getAccountStats();
    const accountsHtml = state.accounts.map((account) => {
      const stat = stats.get(account.id);
      const checked = state.selectedAccountIds.has(account.id);
      return `<label class="account-check">
        <input class="form-check-input" type="checkbox" data-account-filter="${escapeHtml(account.id)}" ${checked ? 'checked' : ''}>
        <span class="form-check-label">
          <span class="account-dot" style="--account-color:${escapeHtml(account.color)}" aria-hidden="true"></span>
          <span class="account-check-name">${escapeHtml(account.name)}</span>
        </span>
        <span class="account-check-sum">${stat ? `${formatNumber(stat.count)} расх.` : '0'}</span>
      </label>`;
    }).join('');

    dom.accountsMenuList.innerHTML = `
      <label class="account-check">
        <input class="form-check-input" type="checkbox" data-account-filter="all" ${allSelected ? 'checked' : ''}>
        <span class="form-check-label"><strong>Все счета</strong></span>
        <span class="account-check-sum">${total}</span>
      </label>
      <div class="account-menu-divider"></div>
      ${accountsHtml}
    `;
  }

  function renderAccounts() {
    const stats = getAccountStats();
    dom.accountsCountBadge.textContent = String(state.accounts.length);

    const activeId = state.selectedAccountIds.size === 1
      ? Array.from(state.selectedAccountIds)[0]
      : null;

    dom.accountsChips.innerHTML = state.accounts.map((account) => {
      const stat = stats.get(account.id);
      const count = stat ? stat.count : 0;
      const monthCount = stat ? stat.monthCount : 0;
      const active = account.id === activeId;
      const meta = `${formatNumber(count)} ${plural(count, 'расход', 'расхода', 'расходов')} · ${formatNumber(monthCount)} мес.`;

      return `<div class="account-chip ${active ? 'is-active' : ''}"
                   role="button" tabindex="0" aria-pressed="${active ? 'true' : 'false'}"
                   data-account-id="${escapeHtml(account.id)}"
                   style="--account-color:${escapeHtml(account.color)}"
                   title="Источник: ${escapeHtml(account.sourceFile)}">
        <span class="account-dot" aria-hidden="true"></span>
        <div class="account-chip-body">
          <div class="account-chip-name">${escapeHtml(account.name)}</div>
          <div class="account-chip-meta">${escapeHtml(meta)}</div>
          <div class="account-chip-source">
            <i class="bi bi-file-earmark-spreadsheet" aria-hidden="true"></i>
            <span>${escapeHtml(account.sourceFile)}</span>
          </div>
        </div>
        <div class="account-chip-actions">
          <button type="button" class="icon-btn" data-action="rename"
                  aria-label="Переименовать счёт ${escapeHtml(account.name)}" title="Переименовать">
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete"
                  aria-label="Удалить счёт ${escapeHtml(account.name)}" title="Удалить">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>
      </div>`;
    }).join('');
  }

  function renderCharts() {
    const scopeFilter = getFilter();
    const selectedAccounts = Analytics.getSelectedAccounts(state.accounts, scopeFilter);

    const monthlyTotals = Analytics.getMonthlyTotals(state.accounts, scopeFilter);
    const monthlyCategoryBreakdown = Analytics.getMonthlyCategoryBreakdown(state.accounts, scopeFilter);
    const monthlyAccountBreakdown = Analytics.getMonthlyAccountBreakdown(state.accounts, scopeFilter);

    const showAccountBreakdown = selectedAccounts.length > 1
      && monthlyAccountBreakdown.accounts.length > 1;

    dom.chartCardAccounts.classList.toggle('d-none', !showAccountBreakdown);
    dom.chartCardMonthlyCategories.classList.toggle('col-lg-6', showAccountBreakdown);

    if (!state.charts) return;

    Charts.updateCharts(state.charts, {
      monthlyTotals,
      monthlyCategoryBreakdown,
      monthlyAccountBreakdown,
      showAccountBreakdown
    });

    requestAnimationFrame(() => {
      if (state.charts) Charts.resizeCharts(state.charts);
    });
  }

  /**
   * Рисует полную матрицу «категория × месяц» по активным расходам.
   * В отличие от stacked-графика здесь видны все категории без объединения.
   */
  function renderCategoryMatrix() {
    const scopeFilter = getFilter();
    const breakdown = Analytics.getMonthlyCategoryBreakdown(state.accounts, scopeFilter);
    const months = breakdown.months;
    const categories = breakdown.categories;

    if (!months.length || !categories.length) {
      dom.categoryMatrixWrap.classList.add('d-none');
      dom.categoryMatrixEmpty.classList.remove('d-none');
      dom.categoryMatrixHead.replaceChildren();
      dom.categoryMatrixBody.replaceChildren();
      dom.categoryMatrixTotal.textContent = '0 мес.';
      dom.categoryMatrixSubtitle.textContent = 'Нет данных по месяцам';
      return;
    }

    const monthTotals = new Map(months.map((month) => {
      const values = breakdown.matrix[month] || {};
      return [month, Object.values(values).reduce((sum, value) => sum + value, 0)];
    }));

    dom.categoryMatrixWrap.classList.remove('d-none');
    dom.categoryMatrixEmpty.classList.add('d-none');
    dom.categoryMatrixTotal.textContent =
      `${formatNumber(months.length)} ${plural(months.length, 'месяц', 'месяца', 'месяцев')}`;
    dom.categoryMatrixSubtitle.textContent =
      `${formatNumber(categories.length)} ${plural(categories.length, 'категория', 'категории', 'категорий')} · каждый месяц отдельно · без общего итога`;

    dom.categoryMatrixHead.innerHTML = `<tr>
      <th scope="col" class="matrix-category-col">Категория</th>
      ${months.map((month) => `<th scope="col" class="text-end" title="${escapeHtml(Analytics.getMonthLabel(month))}">${escapeHtml(Analytics.getMonthShortLabel(month))}</th>`).join('')}
    </tr>`;

    const rows = categories.map((category) => {
      const color = Charts.getCategoryColor(category);
      const cells = months.map((month) => {
        const value = (breakdown.matrix[month] || {})[category] || 0;
        const monthTotal = monthTotals.get(month) || 0;
        const alpha = value > 0 && monthTotal > 0
          ? Math.min(0.14, (value / monthTotal) * 0.2)
          : 0;
        const style = alpha > 0 ? ` style="background:rgba(79,70,229,${alpha.toFixed(3)})"` : '';
        return `<td class="text-end matrix-value"${style}>${value > 0 ? escapeHtml(Charts.formatMoney(value)) : '<span class="matrix-zero">—</span>'}</td>`;
      }).join('');

      return `<tr>
        <th scope="row" class="matrix-category">
          <span class="category-dot" style="--category-color:${escapeHtml(color)}" aria-hidden="true"></span>
          <span>${escapeHtml(category)}</span>
        </th>
        ${cells}
      </tr>`;
    }).join('');

    const footerCells = months.map((month) => {
      return `<td class="text-end matrix-total-col">${escapeHtml(Charts.formatMoney(monthTotals.get(month) || 0))}</td>`;
    }).join('');

    dom.categoryMatrixBody.innerHTML = `${rows}
      <tr class="matrix-summary">
        <th scope="row" class="matrix-category">Итого за месяц</th>
        ${footerCells}
      </tr>`;
  }

  /* ------------------------------------------------------------------------
     Таблица транзакций
     ------------------------------------------------------------------------ */

  function refreshTxMonthOptions() {
    const months = Analytics.getAvailableMonths(state.accounts, getFilter());
    if (state.txMonth && !months.includes(state.txMonth)) {
      state.txMonth = null;
    }

    dom.txMonthSelect.replaceChildren();
    dom.txMonthSelect.add(new Option('Все месяцы', '', false, state.txMonth === null));
    for (const month of months) {
      dom.txMonthSelect.add(new Option(
        Analytics.getMonthLabel(month),
        month,
        false,
        state.txMonth === month
      ));
    }
    dom.txMonthSelect.value = state.txMonth || '';
  }

  function renderTable() {
    refreshTxMonthOptions();

    const filter = getFilter();
    const allBase = Analytics.getFilteredTransactions(state.accounts, filter);
    const base = state.txMonth
      ? allBase.filter((tx) => tx.month === state.txMonth)
      : allBase;
    const excludedAll = Analytics.getExcludedTransactions(state.accounts, filter);
    const excludedCount = state.txMonth
      ? excludedAll.filter((tx) => tx.month === state.txMonth).length
      : excludedAll.length;
    const query = state.txSearch.trim().toLocaleLowerCase('ru');
    const searched = query
      ? base.filter((tx) => {
        const haystack = [
          tx.description,
          tx.category,
          tx.bankCategory,
          tx.accountName,
          tx.mcc,
          tx.status,
          formatDate(tx.date),
          tx.amount,
          Charts.formatMoney(tx.amount)
        ].join(' ').toLocaleLowerCase('ru');
        return haystack.includes(query);
      })
      : base;

    const sorted = searched.slice().sort(compareTransactions);
    const total = sorted.length;
    const pageSize = state.txPageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    state.txPage = Math.min(Math.max(1, state.txPage), totalPages);
    const start = (state.txPage - 1) * pageSize;
    const pageItems = sorted.slice(start, start + pageSize);

    if (dom.txSearch.value !== state.txSearch) {
      dom.txSearch.value = state.txSearch;
    }
    dom.txSearchClear.classList.toggle('d-none', !state.txSearch);

    updateSortIndicators();

    if (!total) {
      dom.txTableWrap.classList.add('d-none');
      dom.txFooter.classList.add('d-none');
      dom.txEmpty.classList.remove('d-none');
      dom.txEmptyReset.classList.toggle('d-none', !hasActiveFilters());
      if (query) {
        dom.txEmptyText.textContent = `По запросу «${state.txSearch.trim()}» ничего не найдено.`;
      } else if (state.selectedAccountIds.size === 0) {
        dom.txEmptyText.textContent = 'Не выбрано ни одного счёта.';
      } else if (excludedCount > 0) {
        dom.txEmptyText.textContent = 'Все расходы исключены из анализа. Их можно вернуть в таблице ниже.';
      } else if (state.txMonth) {
        dom.txEmptyText.textContent = 'В выбранном месяце расходов нет.';
      } else {
        dom.txEmptyText.textContent = 'По выбранным счетам расходов нет.';
      }
      dom.txCountLabel.textContent = query
        ? `Найдено 0 из ${formatNumber(base.length)}`
        : (excludedCount > 0
          ? `0 расходов · ${formatNumber(excludedCount)} исключено`
          : 'Нет расходов');
      dom.txTableBody.replaceChildren();
      dom.txPagination.replaceChildren();
      dom.txRange.textContent = '';
      return;
    }

    dom.txTableWrap.classList.remove('d-none');
    dom.txFooter.classList.remove('d-none');
    dom.txEmpty.classList.add('d-none');

    dom.txTableBody.innerHTML = pageItems.map((tx) => {
      const categoryColor = Charts.getCategoryColor(tx.category);
      const accountColor = tx.accountColor || '#94a3b8';
      const descTitle = [
        tx.description,
        tx.bankCategory && tx.bankCategory !== tx.category ? `Банковская категория: ${tx.bankCategory}` : '',
        tx.mcc ? `MCC: ${tx.mcc}` : '',
        tx.status ? `Статус: ${tx.status}` : '',
        `Счёт: ${tx.accountName}`,
        `Источник: ${tx.sourceFile}`
      ].filter(Boolean).join('\n');

      return `<tr>
        <td class="tx-date">${escapeHtml(formatDate(tx.date))}</td>
        <td>
          <div class="tx-account">
            <span class="account-dot" style="--account-color:${escapeHtml(accountColor)}" aria-hidden="true"></span>
            <span class="tx-account-name" title="${escapeHtml(tx.accountName)}">${escapeHtml(tx.accountName)}</span>
          </div>
        </td>
        <td>
          <span class="category-pill" style="--category-color:${escapeHtml(categoryColor)}" title="${escapeHtml(tx.category)}">
            <span class="category-dot" aria-hidden="true"></span>
            <span>${escapeHtml(tx.category)}</span>
          </span>
        </td>
        <td class="tx-desc" title="${escapeHtml(descTitle)}">
          <div class="tx-desc-text">${escapeHtml(tx.description)}</div>
        </td>
        <td class="tx-amount text-end is-expense">${escapeHtml(Charts.formatMoney(tx.amount))}</td>
        <td class="text-center">
          <button type="button" class="ignore-btn"
                  data-action="toggle-ignore" data-tx-id="${escapeHtml(tx.id)}"
                  aria-label="Исключить расход из анализа" title="Исключить из анализа">
            <i class="bi bi-eye-slash" aria-hidden="true"></i>
          </button>
        </td>
      </tr>`;
    }).join('');

    const accountCount = new Set(base.map((tx) => tx.accountId)).size;
    const monthCount = new Set(base.map((tx) => tx.month)).size;
    if (query) {
      dom.txCountLabel.textContent = `Найдено ${formatNumber(total)} из ${formatNumber(base.length)}`;
    } else {
      dom.txCountLabel.textContent =
        `${formatNumber(total)} ${plural(total, 'расход', 'расхода', 'расходов')}`
        + (excludedCount > 0 ? ` · ${formatNumber(excludedCount)} исключено` : '')
        + ` · ${formatNumber(monthCount)} ${plural(monthCount, 'месяц', 'месяца', 'месяцев')}`
        + ` · по ${formatNumber(accountCount)} ${plural(accountCount, 'счёту', 'счетам', 'счетам')}`;
    }

    const from = start + 1;
    const to = Math.min(start + pageSize, total);
    dom.txRange.textContent = `Показано ${formatNumber(from)}–${formatNumber(to)} из ${formatNumber(total)}`;

    renderPagination(totalPages);
  }

  function getExclusionReasonLabel(transaction) {
    const labels = [];
    if (transaction.ignored) labels.push('игнорируется вручную');
    if (transaction.excludeReason && !transaction.includedManually) {
      labels.push(EXCLUSION_ROW_LABELS[transaction.excludeReason] || 'исключено правилом');
    }
    return labels.join(' · ');
  }

  function renderExcludedTable() {
    const excluded = Analytics.getExcludedTransactions(state.accounts, getFilter());
    dom.excludedCountBadge.textContent = String(excluded.length);

    if (!excluded.length) {
      dom.excludedTableWrap.classList.add('d-none');
      dom.excludedEmpty.classList.remove('d-none');
      dom.excludedSubtitle.textContent = 'Все расходы учитываются в анализе';
      dom.excludedTableBody.replaceChildren();
      return;
    }

    dom.excludedTableWrap.classList.remove('d-none');
    dom.excludedEmpty.classList.add('d-none');
    dom.excludedSubtitle.textContent =
      `${formatNumber(excluded.length)} ${plural(excluded.length, 'операция', 'операции', 'операций')} ${excluded.length === 1 ? 'не участвует' : 'не участвуют'} в расчётах`;

    dom.excludedTableBody.innerHTML = excluded.map((tx) => {
      const categoryColor = Charts.getCategoryColor(tx.category);
      const accountColor = tx.accountColor || '#94a3b8';
      const reason = getExclusionReasonLabel(tx);
      const descTitle = [
        tx.description,
        `Счёт: ${tx.accountName}`,
        `Источник: ${tx.sourceFile}`,
        tx.mcc ? `MCC: ${tx.mcc}` : ''
      ].filter(Boolean).join('\n');

      return `<tr>
        <td class="tx-date">${escapeHtml(formatDate(tx.date))}</td>
        <td>
          <div class="tx-account">
            <span class="account-dot" style="--account-color:${escapeHtml(accountColor)}" aria-hidden="true"></span>
            <span class="tx-account-name" title="${escapeHtml(tx.accountName)}">${escapeHtml(tx.accountName)}</span>
          </div>
        </td>
        <td>
          <span class="category-pill" style="--category-color:${escapeHtml(categoryColor)}" title="${escapeHtml(tx.category)}">
            <span class="category-dot" aria-hidden="true"></span>
            <span>${escapeHtml(tx.category)}</span>
          </span>
        </td>
        <td class="tx-desc" title="${escapeHtml(descTitle)}">
          <div class="tx-desc-text">${escapeHtml(tx.description)}</div>
        </td>
        <td class="tx-amount text-end is-expense">${escapeHtml(Charts.formatMoney(tx.amount))}</td>
        <td>
          <span class="exclusion-reason" title="${escapeHtml(reason)}">${escapeHtml(reason)}</span>
        </td>
        <td class="text-center">
          <button type="button" class="include-btn"
                  data-action="include-excluded" data-tx-id="${escapeHtml(tx.id)}"
                  aria-label="Включить расход в анализ" title="Включить в анализ">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            <span>Включить</span>
          </button>
        </td>
      </tr>`;
    }).join('');
  }

  function includeExcludedTransaction(transactionId) {
    for (const account of state.accounts) {
      const transaction = (account.transactions || []).find((item) => item.id === transactionId);
      if (!transaction) continue;
      if (transaction.ignored) transaction.ignored = false;
      if (transaction.excludeReason) transaction.includedManually = true;
      render();
      showToast('Расход включён в анализ', 'Данные и графики обновлены.', 'success');
      return;
    }
  }

  function compareTransactions(a, b) {
    const key = state.txSort.key;
    const direction = state.txSort.dir === 'asc' ? 1 : -1;
    let result = 0;

    if (key === 'amount') {
      result = a.amount - b.amount;
    } else if (key === 'date') {
      result = a.date.localeCompare(b.date);
    } else if (key === 'account') {
      result = a.accountName.localeCompare(b.accountName, 'ru');
    } else if (key === 'category') {
      result = a.category.localeCompare(b.category, 'ru');
    } else {
      result = a.description.localeCompare(b.description, 'ru');
    }

    if (result !== 0) return result * direction;
    return b.date.localeCompare(a.date);
  }

  function updateSortIndicators() {
    document.querySelectorAll('.sort-btn').forEach((button) => {
      const active = button.dataset.sort === state.txSort.key;
      const icon = button.querySelector('i');
      if (icon) {
        icon.className = active
          ? `bi ${state.txSort.dir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'}`
          : 'bi bi-arrow-down-up';
      }
      const th = button.closest('th');
      if (th) {
        th.setAttribute('aria-sort', active
          ? (state.txSort.dir === 'asc' ? 'ascending' : 'descending')
          : 'none');
      }
    });
  }

  function renderPagination(totalPages) {
    const current = state.txPage;
    const pages = buildPageList(current, totalPages);

    const items = [];
    items.push(`<li class="page-item ${current === 1 ? 'disabled' : ''}">
      <button type="button" class="page-link" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''}
              aria-label="Предыдущая страница"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
    </li>`);

    pages.forEach((page) => {
      if (page === '...') {
        items.push('<li class="page-item disabled"><span class="page-link">…</span></li>');
        return;
      }
      items.push(`<li class="page-item ${page === current ? 'active' : ''}">
        <button type="button" class="page-link" data-page="${page}"
                ${page === current ? 'aria-current="page"' : ''}>${page}</button>
      </li>`);
    });

    items.push(`<li class="page-item ${current === totalPages ? 'disabled' : ''}">
      <button type="button" class="page-link" data-page="${current + 1}" ${current === totalPages ? 'disabled' : ''}
              aria-label="Следующая страница"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
    </li>`);

    dom.txPagination.innerHTML = items.join('');
  }

  function buildPageList(current, totalPages) {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);

    if (start > 2) pages.push('...');
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  }

  function hasActiveFilters() {
    return Boolean(state.txSearch)
      || Boolean(state.txMonth)
      || state.selectedAccountIds.size !== state.accounts.length;
  }

  function resetFilters() {
    state.selectedAccountIds = new Set(getAllAccountIds());
    state.txSearch = '';
    state.txMonth = null;
    state.txPage = 1;
    dom.txSearch.value = '';
    dom.txSearchClear.classList.add('d-none');
    render();
  }

  /**
   * Исключает расход из аналитики. Операция перемещается в таблицу
   * исключённых расходов, откуда её можно вернуть.
   * @param {string} transactionId
   */
  function toggleTransactionIgnored(transactionId) {
    for (const account of state.accounts) {
      const transaction = (account.transactions || []).find((item) => item.id === transactionId);
      if (!transaction) continue;
      transaction.ignored = true;
      render();
      return;
    }
  }

  /* ------------------------------------------------------------------------
     Действия со счетами
     ------------------------------------------------------------------------ */

  function selectAccountFromChip(accountId) {
    if (!state.accounts.some((account) => account.id === accountId)) return;

    if (state.selectedAccountIds.size === 1 && state.selectedAccountIds.has(accountId)) {
      state.selectedAccountIds = new Set(getAllAccountIds());
    } else {
      state.selectedAccountIds = new Set([accountId]);
    }
    state.txPage = 1;
    render();
  }

  function openRename(accountId) {
    const account = state.accounts.find((item) => item.id === accountId);
    if (!account) return;
    state.renameAccountId = accountId;
    dom.renameInput.value = account.name;
    dom.renameInput.classList.remove('is-invalid');
    showModal('rename');
  }

  function saveRename() {
    const account = activeAccount();
    if (!account) return;
    const name = dom.renameInput.value.trim();
    if (!name) {
      dom.renameInput.classList.add('is-invalid');
      dom.renameInput.focus();
      return;
    }
    Accounts.renameAccount(account, name);
    state.renameAccountId = null;
    hideModal('rename');
    render();
  }

  function openDeleteAccount(accountId) {
    const account = state.accounts.find((item) => item.id === accountId);
    if (!account) return;

    openConfirm({
      title: 'Удалить счёт?',
      text: `Счёт «${account.name}» и все его расходы (${formatNumber(account.transactions.length)}) будут удалены из текущего анализа.`,
      confirmLabel: 'Удалить счёт',
      onConfirm() {
        state.accounts = Accounts.removeAccount(state.accounts, account.id);
        state.selectedAccountIds.delete(account.id);
        if (!state.accounts.length) {
          state.txSearch = '';
          state.txMonth = null;
          state.txPage = 1;
          dom.txSearch.value = '';
          dom.txSearchClear.classList.add('d-none');
        }
        render();
        showToast('Счёт удалён', account.name, 'info');
      }
    });
  }

  function openConfirm(options) {
    if (!global.bootstrap) {
      if (global.confirm(`${options.title}\n\n${options.text}`)) options.onConfirm();
      return;
    }

    state.confirmCallback = options.onConfirm;
    dom.confirmModalLabel.textContent = options.title;
    dom.confirmText.textContent = options.text;
    dom.confirmActionBtn.textContent = options.confirmLabel || 'Удалить';
    dom.confirmActionBtn.className = `btn ${options.variant || 'btn-danger'}`;
    showModal('confirm');
  }

  /* ------------------------------------------------------------------------
     Модалки и уведомления
     ------------------------------------------------------------------------ */

  function showModal(name) {
    if (modals[name]) modals[name].show();
  }

  function hideModal(name) {
    if (modals[name]) modals[name].hide();
  }

  /**
   * @param {string} title
   * @param {string} message
   * @param {'success'|'danger'|'warning'|'info'} [variant]
   */
  function showToast(title, message, variant = 'info') {
    if (!global.bootstrap || !dom.toastContainer) {
      console.warn(title, message);
      return;
    }

    const icons = {
      success: 'bi-check2-circle',
      danger: 'bi-x-circle',
      warning: 'bi-exclamation-triangle',
      info: 'bi-info-circle'
    };
    const icon = icons[variant] || icons.info;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <span class="toast-icon ${escapeHtml(variant)}"><i class="bi ${icon}" aria-hidden="true"></i></span>
        <strong class="me-auto">${escapeHtml(title)}</strong>
        <small class="text-muted">сейчас</small>
        <button type="button" class="btn-close ms-2" data-bs-dismiss="toast" aria-label="Закрыть"></button>
      </div>
      <div class="toast-body">${escapeHtml(message)}</div>
    </div>`;

    const toastElement = wrapper.firstElementChild;
    dom.toastContainer.append(toastElement);
    const toast = new global.bootstrap.Toast(toastElement, {
      delay: variant === 'danger' ? 8000 : 4800
    });
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    toast.show();
  }

  /* ------------------------------------------------------------------------
     Публичный API (единственная глобальная переменная — window.app)
     ------------------------------------------------------------------------ */

  Object.assign(app, {
    state,
    init,
    render,
    handleFiles,
    getFilter,
    showToast
  });

  document.addEventListener('DOMContentLoaded', init);
})(window);
