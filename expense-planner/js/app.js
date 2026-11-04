/**
 * app.js — рендер и обработчики событий.
 *
 * Никаких ES-модулей: всё работает через обычные функции и IIFE,
 * поэтому приложение открывается двойным кликом по index.html (file://).
 */
(function () {
  'use strict';

  const CURRENCY = '₽';

  const moneyFormat = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });

  const numberFormat = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 2,
  });

  /** Значение расхода на жизнь по умолчанию в онбординге. */
  const DEFAULT_LIVING_EXPENSES = 30000;

  /** @type {Config|null} Текущая конфигурация в памяти. */
  let config = null;

  /** @type {string|null} id долга, который сейчас редактируется в модалке. */
  let editingDebtId = null;

  let debtModal = null;
  let resetModal = null;

  // ----------------------------------------------------------------------
  // Утилиты
  // ----------------------------------------------------------------------

  function $(selector) {
    return document.querySelector(selector);
  }

  function $all(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatMoney(value) {
    if (value == null || !isFinite(value)) return '—';
    return moneyFormat.format(value);
  }

  function formatNumber(value) {
    if (value == null || !isFinite(value)) return '—';
    return numberFormat.format(value);
  }

  function formatPercent(rate) {
    return formatNumber(rate) + '%';
  }

  function formatDate(date) {
    if (!date) return '—';
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }

  function formatDateFull(date) {
    if (!date) return '—';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function debounce(fn, ms) {
    let timer;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms);
    };
  }

  function getDebtModal() {
    if (!debtModal) debtModal = new bootstrap.Modal($('#debtModal'));
    return debtModal;
  }

  function getResetModal() {
    if (!resetModal) resetModal = new bootstrap.Modal($('#resetModal'));
    return resetModal;
  }

  function markFieldInvalid(input, message) {
    input.classList.add('is-invalid');
    const feedback = input.nextElementSibling;
    if (feedback && feedback.classList.contains('invalid-feedback')) {
      feedback.textContent = message;
    } else {
      input.title = message;
    }
  }

  function clearFieldInvalid(input) {
    input.classList.remove('is-invalid');
  }

  // ----------------------------------------------------------------------
  // Инициализация
  // ----------------------------------------------------------------------

  function init() {
    $('#onboarding-add-debt').addEventListener('click', function () {
      addOnboardingDebtRow(null);
    });
    $('#onboarding-save').addEventListener('click', handleOnboardingSave);
    $('#onboarding-debts').addEventListener('click', onOnboardingDebtsClick);
    $('#debtModalSave').addEventListener('click', onModalSave);
    $('#reset-confirm-btn').addEventListener('click', onResetConfirm);
    $('#corrupt-reset-btn').addEventListener('click', onCorruptReset);

    const result = loadConfig();
    if (result.status === 'ok') {
      config = result.config;
      showDashboard();
    } else if (result.status === 'error') {
      showCorruptState(result.reason);
    } else {
      showOnboarding();
    }
  }

  // ----------------------------------------------------------------------
  // Переключение экранов
  // ----------------------------------------------------------------------

  function showOnboarding() {
    $('#dashboard').classList.add('d-none');
    $('#corrupt').classList.add('d-none');
    $('#onboarding').classList.remove('d-none');

    $('#onboarding-income').value = '';
    $('#onboarding-living').value = DEFAULT_LIVING_EXPENSES;
    clearFieldInvalid($('#onboarding-income'));
    clearFieldInvalid($('#onboarding-living'));

    const debtsEl = $('#onboarding-debts');
    debtsEl.innerHTML = '';
    addOnboardingDebtRow(null);

    clearOnboardingAlert();
  }

  function showCorruptState(reason) {
    $('#onboarding').classList.add('d-none');
    $('#dashboard').classList.add('d-none');
    $('#corrupt').classList.remove('d-none');
    $('#corrupt-reason').textContent = reason || 'Сохранённые данные не удалось прочитать.';
  }

  function showDashboard() {
    $('#onboarding').classList.add('d-none');
    $('#corrupt').classList.add('d-none');
    $('#dashboard').classList.remove('d-none');
    renderDashboard();
  }

  // ----------------------------------------------------------------------
  // Онбординг
  // ----------------------------------------------------------------------

  function addOnboardingDebtRow(debt) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderDebtFormFields(debt, { withRemove: true });
    const row = wrapper.firstElementChild;
    $('#onboarding-debts').appendChild(row);

    row.querySelectorAll('input[data-field]').forEach(function (input) {
      input.addEventListener('input', function () {
        updatePaymentHint(row);
      });
    });
    updatePaymentHint(row);
  }

  function onOnboardingDebtsClick(event) {
    const button = event.target.closest('[data-action="remove-debt"]');
    if (!button) return;
    const row = button.closest('[data-debt-row]');
    if (row) row.remove();
  }

  function clearOnboardingAlert() {
    $('#onboarding-alert').innerHTML = '';
  }

  function showOnboardingAlert(message, type) {
    $('#onboarding-alert').innerHTML =
      '<div class="alert alert-' + type + ' py-2 mb-0">' +
      '<i class="bi bi-exclamation-circle-fill me-1"></i>' + escapeHtml(message) +
      '</div>';
  }

  function handleOnboardingSave() {
    const incomeEl = $('#onboarding-income');
    const livingEl = $('#onboarding-living');
    clearFieldInvalid(incomeEl);
    clearFieldInvalid(livingEl);

    let valid = true;
    const income = Number(incomeEl.value);
    if (!isFinite(income) || income <= 0) {
      markFieldInvalid(incomeEl, 'Доход должен быть больше нуля');
      valid = false;
    }

    const living = livingEl.value === '' ? 0 : Number(livingEl.value);
    if (!isFinite(living) || living < 0) {
      markFieldInvalid(livingEl, 'Расход на жизнь не может быть отрицательным');
      valid = false;
    }

    const debts = [];
    $all('#onboarding-debts [data-debt-row]').forEach(function (row) {
      const result = validateDebtRow(row, true);
      if (result.valid && result.debt) {
        debts.push(result.debt);
      } else if (!result.valid) {
        valid = false;
      }
    });

    if (!valid) {
      showOnboardingAlert('Проверьте выделенные поля и заполните их корректно.', 'danger');
      return;
    }

    config = {
      monthlyIncome: roundMoney(income),
      livingExpenses: roundMoney(living),
      debts: debts,
    };
    saveConfig(config);
    showDashboard();
  }

  // ----------------------------------------------------------------------
  // Сброс конфигурации
  // ----------------------------------------------------------------------

  function onResetConfirm() {
    resetConfig();
    getResetModal().hide();
    config = null;
    showOnboarding();
  }

  function onCorruptReset() {
    resetConfig();
    showOnboarding();
  }

  // ----------------------------------------------------------------------
  // Дашборд
  // ----------------------------------------------------------------------

  function renderDashboard() {
    const el = $('#dashboard');
    el.innerHTML =
      '<div class="container py-4">' +
        '<header class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">' +
          '<div>' +
            '<h1 class="h3 mb-1"><i class="bi bi-wallet2 me-2 text-primary"></i>Планировщик расходов и долгов</h1>' +
            '<div class="text-muted small" id="today-label"></div>' +
          '</div>' +
          '<button type="button" class="btn btn-outline-danger" id="reset-config-btn">' +
            '<i class="bi bi-arrow-counterclockwise me-1"></i>Сбросить конфигурацию' +
          '</button>' +
        '</header>' +

        '<div class="row g-4">' +
          '<div class="col-lg-4 d-flex flex-column gap-4">' +
            '<section class="card shadow-sm">' +
              '<div class="card-header bg-white fw-semibold">' +
                '<i class="bi bi-cash-stack me-2 text-primary"></i>Доход и жизнь' +
              '</div>' +
              '<div class="card-body">' +
                '<div class="mb-3">' +
                  '<label for="income-input" class="form-label">Доход за месяц</label>' +
                  '<input type="number" id="income-input" class="form-control form-control-lg" min="0.01" step="0.01" placeholder="Например: 120000">' +
                  '<div class="invalid-feedback">Доход должен быть больше нуля</div>' +
                '</div>' +
                '<div>' +
                  '<label for="living-input" class="form-label">Расход на жизнь</label>' +
                  '<input type="number" id="living-input" class="form-control form-control-lg" min="0" step="0.01" placeholder="Например: 40000">' +
                  '<div class="invalid-feedback">Расход на жизнь не может быть отрицательным</div>' +
                '</div>' +
                '<div class="text-muted small mt-2">Изменения сохраняются автоматически.</div>' +
              '</div>' +
            '</section>' +

            '<section class="card shadow-sm">' +
              '<div class="card-header bg-white fw-semibold d-flex justify-content-between align-items-center">' +
                '<span><i class="bi bi-credit-card-2-front me-2 text-primary"></i>Долги (конфигурация)</span>' +
                '<button type="button" class="btn btn-sm btn-outline-primary" id="add-debt-btn">' +
                  '<i class="bi bi-plus-lg me-1"></i>Добавить долг' +
                '</button>' +
              '</div>' +
              '<div class="card-body" id="debt-config-list"></div>' +
            '</section>' +
          '</div>' +

          '<div class="col-lg-8 d-flex flex-column gap-4">' +
            '<section class="card shadow-sm border-primary">' +
              '<div class="card-header bg-white fw-semibold">' +
                '<i class="bi bi-calculator me-2 text-primary"></i>Итоги месяца' +
              '</div>' +
              '<div class="card-body" id="summary-content"></div>' +
            '</section>' +

            '<section>' +
              '<h2 class="h5 mb-3"><i class="bi bi-graph-up-arrow me-2 text-primary"></i>Остаток и прогноз по каждому долгу</h2>' +
              '<div class="row g-3" id="forecast-content"></div>' +
            '</section>' +
          '</div>' +
        '</div>' +

        '<section class="card shadow-sm mt-4">' +
          '<div class="card-header bg-white fw-semibold">' +
            '<i class="bi bi-calendar3 me-2 text-primary"></i>График платежей на 2 года' +
          '</div>' +
          '<div class="card-body" id="schedule-content"></div>' +
        '</section>' +
      '</div>';

    $('#today-label').textContent =
      'Сегодня: ' + new Date().toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

    $('#income-input').value = config.monthlyIncome;
    $('#living-input').value = config.livingExpenses;

    $('#income-input').addEventListener('input', debounce(onIncomeChange, 400));
    $('#living-input').addEventListener('input', debounce(onLivingChange, 400));
    $('#add-debt-btn').addEventListener('click', function () {
      openDebtModal(null);
    });
    $('#reset-config-btn').addEventListener('click', function () {
      getResetModal().show();
    });
    $('#debt-config-list').addEventListener('click', onDebtConfigClick);

    renderDebtConfigList();
    renderCalculations();
  }

  function onDebtConfigClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.getAttribute('data-debt-id');
    if (button.getAttribute('data-action') === 'edit-debt') {
      openDebtModal(id);
    } else if (button.getAttribute('data-action') === 'delete-debt') {
      deleteDebt(id);
    }
  }

  function renderDebtConfigList() {
    const listEl = $('#debt-config-list');
    if (!listEl) return;

    if (!config.debts.length) {
      listEl.innerHTML =
        '<div class="text-muted text-center py-3">Долгов пока нет. Нажмите «Добавить долг».</div>';
      return;
    }

    listEl.innerHTML = config.debts
      .map(function (debt) {
        const type = debt.termMonths != null && debt.termMonths > 0
          ? debt.termMonths + ' мес'
          : 'бессрочный';
        const payDay = ' · платёж ' + (debt.paymentDay || 1) + ' числа';
        return (
          '<div class="debt-config-item d-flex align-items-center justify-content-between gap-2 py-2 border-bottom">' +
            '<div class="min-width-0">' +
              '<div class="fw-semibold text-truncate" title="' + escapeHtml(debt.name) + '">' + escapeHtml(debt.name) + '</div>' +
              '<div class="small text-muted">' +
                formatMoney(debt.balance) + ' · ' + formatPercent(debt.annualRate) + ' · ' + type + payDay +
              '</div>' +
            '</div>' +
            '<div class="d-flex gap-1 flex-shrink-0">' +
              '<button type="button" class="btn btn-sm btn-outline-secondary" data-action="edit-debt" data-debt-id="' + debt.id + '" title="Изменить">' +
                '<i class="bi bi-pencil"></i>' +
              '</button>' +
              '<button type="button" class="btn btn-sm btn-outline-danger" data-action="delete-debt" data-debt-id="' + debt.id + '" title="Удалить">' +
                '<i class="bi bi-trash"></i>' +
              '</button>' +
            '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  function onIncomeChange() {
    const input = $('#income-input');
    const value = Number(input.value);
    const valid = isFinite(value) && value > 0;
    input.classList.toggle('is-invalid', !valid);
    config.monthlyIncome = valid ? roundMoney(value) : 0;
    if (valid) saveConfig(config);
    renderCalculations();
  }

  function onLivingChange() {
    const input = $('#living-input');
    const value = input.value === '' ? 0 : Number(input.value);
    const valid = isFinite(value) && value >= 0;
    input.classList.toggle('is-invalid', !valid);
    config.livingExpenses = valid ? roundMoney(value) : 0;
    if (valid) saveConfig(config);
    renderCalculations();
  }

  // ----------------------------------------------------------------------
  // Расчёты
  // ----------------------------------------------------------------------

  function renderCalculations() {
    const schedule = buildRepaymentSchedule(config, new Date());
    const currentBalances = schedule.currentBalances;

    const totalRequired = roundMoney(
      config.debts.reduce(function (sum, d) {
        return sum + requiredPaymentForDebt(d, currentBalances[d.id] || 0);
      }, 0)
    );
    const freeMoney = roundMoney(config.monthlyIncome - config.livingExpenses - totalRequired);

    const currentDebts = config.debts.map(function (d) {
      return Object.assign({}, d, { balance: currentBalances[d.id] || 0 });
    });
    const recommendation = recommendPrepayment(currentDebts, freeMoney);
    const recommendedTotal = roundMoney(
      recommendation.reduce(function (sum, r) {
        return sum + r.amount;
      }, 0)
    );
    const leftover = freeMoney > 0 ? roundMoney(freeMoney - recommendedTotal) : null;

    renderSummary(totalRequired, freeMoney, recommendation, recommendedTotal, leftover, schedule);
    renderForecast(recommendation, schedule, currentBalances);
    renderSchedule(schedule, currentBalances);
  }

  function renderSummary(totalRequired, freeMoney, recommendation, recommendedTotal, leftover, schedule) {
    const el = $('#summary-content');
    if (!el) return;

    const freeClass = freeMoney < 0 ? 'text-danger' : 'text-success';
    const warning =
      freeMoney < 0
        ? '<div class="alert alert-danger mt-2 mb-0 py-2 small">' +
            '<i class="bi bi-exclamation-triangle-fill me-1"></i>Свободные деньги отрицательные — ' +
            'досрочное погашение невозможно. Обязательные платежи превышают доход после расходов на жизнь.' +
          '</div>'
        : '';

    let recoHtml;
    if (freeMoney <= 0) {
      recoHtml =
        '<div class="text-muted">Свободных денег нет — досрочное погашение в этом месяце невозможно.</div>';
    } else if (!recommendation.length) {
      recoHtml = '<div class="text-muted">Нет долгов для досрочного погашения.</div>';
    } else {
      const byId = {};
      config.debts.forEach(function (d) {
        byId[d.id] = d;
      });
      recoHtml =
        '<ol class="mb-2">' +
        recommendation
          .map(function (r) {
            const debt = byId[r.debtId];
            return (
              '<li>' +
              (debt ? escapeHtml(debt.name) : 'Долг') +
              ' → <strong>' + formatMoney(r.amount) + '</strong></li>'
            );
          })
          .join('') +
        '</ol>';
      if (leftover != null && leftover > 0) {
        recoHtml +=
          '<div class="text-muted small">Остаток свободных денег → <strong>' +
          formatMoney(leftover) + '</strong></div>';
      }
    }

    el.innerHTML =
      '<div class="row g-3 mb-3 text-center text-sm-start">' +
        '<div class="col-6 col-md-3">' +
          '<div class="text-muted small">Обязательные платежи</div>' +
          '<div class="fs-3 fw-bold summary-number">' + formatMoney(totalRequired) + '</div>' +
        '</div>' +
        '<div class="col-6 col-md-3">' +
          '<div class="text-muted small">Свободные деньги</div>' +
          '<div class="fs-3 fw-bold summary-number ' + freeClass + '">' + formatMoney(freeMoney) + '</div>' +
        '</div>' +
        '<div class="col-6 col-md-3">' +
          '<div class="text-muted small">Досрочка в этом месяце</div>' +
          '<div class="fs-3 fw-bold summary-number">' + formatMoney(recommendedTotal) + '</div>' +
        '</div>' +
        '<div class="col-6 col-md-3">' +
          '<div class="text-muted small">Остаток свободных</div>' +
          '<div class="fs-3 fw-bold summary-number">' + formatMoney(leftover) + '</div>' +
        '</div>' +
      '</div>' +
      warning +
      '<hr>' +
      '<div class="fw-semibold mb-1">' +
        '<i class="bi bi-lightning-charge-fill me-1 text-warning"></i>Рекомендация по досрочному погашению (метод «лавина»)' +
      '</div>' +
      recoHtml +
      '<hr>' +
      '<div class="fw-semibold mb-2">' +
        '<i class="bi bi-arrow-left-right me-1"></i>Эффект продолжения досрочного погашения' +
      '</div>' +
      renderPrepaymentEffect(schedule);
  }

  function renderPrepaymentEffect(schedule) {
    if (!config.debts.length) {
      return '<div class="text-muted">Нет долгов для сравнения.</div>';
    }

    let totalSaved = 0;
    const rows = config.debts
      .map(function (debt) {
        if ((schedule.currentBalances[debt.id] || 0) <= 0) {
          return (
            '<tr>' +
              '<td>' + escapeHtml(debt.name) + '</td>' +
              '<td class="text-muted" colspan="4">уже погашен</td>' +
            '</tr>'
          );
        }

        const withRec = schedule.payoffWith[debt.id];
        const withoutRec = schedule.payoffWithout[debt.id];

        const withoutInf = !withoutRec || withoutRec.isInfinite;
        const withInf = !withRec || withRec.isInfinite;

        function monthsText(p, inf) {
          if (inf) return '∞';
          if (p.monthsFromNow === 0) return 'в этом мес';
          return p.monthsFromNow + ' мес';
        }

        const withoutText = monthsText(withoutRec, withoutInf);
        const withText = monthsText(withRec, withInf);

        let resultText;
        let savedText;

        if (withoutInf && withInf) {
          resultText = '<span class="text-muted">не закрывается</span>';
          savedText = '—';
        } else if (withoutInf && !withInf) {
          resultText =
            '<span class="text-success">станет погашаемым: ' + monthsText(withRec, false) + '</span>';
          savedText = '—';
        } else {
          const diff = Math.max(0, withoutRec.monthsFromNow - withRec.monthsFromNow);
          const saved = roundMoney(withoutRec.totalInterest - withRec.totalInterest);
          totalSaved = roundMoney(totalSaved + saved);
          resultText =
            diff > 0
              ? '<span class="text-success">раньше на ' + diff + ' мес</span>'
              : '<span class="text-muted">без изменений</span>';
          savedText = saved > 0 ? formatMoney(saved) : '—';
        }

        return (
          '<tr>' +
            '<td>' + escapeHtml(debt.name) + '</td>' +
            '<td>' + withoutText + '</td>' +
            '<td>' + withText + '</td>' +
            '<td>' + resultText + '</td>' +
            '<td class="text-end">' + savedText + '</td>' +
          '</tr>'
        );
      })
      .join('');

    return (
      '<div class="table-responsive">' +
        '<table class="table table-sm align-middle mb-2">' +
          '<thead><tr class="text-muted small text-uppercase">' +
            '<th>Долг</th><th>Без досрочки</th><th>С досрочкой</th><th>Результат</th><th class="text-end">Экономия</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="d-flex flex-wrap justify-content-between gap-2">' +
        '<div class="small text-muted">∞ — не погашается при текущих платежах (бессрочный долг без досрочки).</div>' +
        '<div>Суммарная экономия на процентах: <strong class="text-success">' + formatMoney(totalSaved) + '</strong></div>' +
      '</div>'
    );
  }

  function renderForecast(recommendation, schedule, currentBalances) {
    const el = $('#forecast-content');
    if (!el) return;

    if (!config.debts.length) {
      el.innerHTML = '<div class="col-12"><div class="text-muted">Долгов нет.</div></div>';
      return;
    }

    const recByDebt = {};
    recommendation.forEach(function (r) {
      recByDebt[r.debtId] = r.amount;
    });

    el.innerHTML = config.debts
      .map(function (debt) {
        const currentBalance = currentBalances[debt.id] || 0;
        return renderDebtForecastCard(
          debt,
          currentBalance,
          recByDebt[debt.id] || 0,
          schedule.payoffWith[debt.id]
        );
      })
      .join('');
  }

  function renderDebtForecastCard(debt, currentBalance, extra, payoff) {
    const required = requiredPaymentForDebt(debt, currentBalance);
    const isPerpetual = !(debt.termMonths != null && debt.termMonths > 0);

    let payoffHtml;
    if (currentBalance <= 0 && payoff && !payoff.isInfinite) {
      payoffHtml =
        '<div class="text-success fw-semibold">' +
        '<i class="bi bi-check-circle-fill me-1"></i>Долг погашен: ' + payoff.payoffLabel +
        '</div>';
    } else if (!payoff || payoff.isInfinite) {
      payoffHtml =
        '<div class="text-danger fw-semibold">' +
        '<i class="bi bi-infinity me-1"></i>Не будет погашен при текущих платежах' +
        '</div>';
    } else if (payoff.monthsFromNow === 0) {
      payoffHtml =
        '<div class="text-success fw-semibold">Погашение: ' + payoff.payoffLabel +
        ' <span class="text-muted fw-normal small">(в этом месяце)</span></div>';
    } else {
      payoffHtml =
        '<div class="text-success fw-semibold">Погашение: ' + payoff.payoffLabel +
        ' <span class="text-muted fw-normal small">(через ' + payoff.monthsFromNow + ' мес)</span></div>';
    }

    let termHtml = '';
    if (!isPerpetual && payoff && !payoff.isInfinite) {
      const totalMonths = payoff.totalMonths;
      if (totalMonths > debt.termMonths) {
        termHtml =
          '<div class="small text-danger mt-1">' +
          '<i class="bi bi-exclamation-triangle-fill me-1"></i>Прогноз ' + totalMonths +
          ' мес — дольше срока ' + debt.termMonths + ' мес</div>';
      } else if (totalMonths < debt.termMonths) {
        termHtml =
          '<div class="small text-success mt-1">' +
          '<i class="bi bi-check-circle-fill me-1"></i>Прогноз ' + totalMonths +
          ' мес — раньше срока ' + debt.termMonths + ' мес</div>';
      } else {
        termHtml =
          '<div class="small text-muted mt-1">Прогноз совпадает со сроком (' +
          debt.termMonths + ' мес)</div>';
      }
    }

    return (
      '<div class="col-md-6">' +
        '<div class="card h-100 shadow-sm' + (payoff && payoff.isInfinite ? ' border-warning' : '') + '">' +
          '<div class="card-body">' +
            '<div class="d-flex justify-content-between align-items-start gap-2">' +
              '<div class="min-width-0">' +
                '<h3 class="h6 mb-0 text-truncate" title="' + escapeHtml(debt.name) + '">' + escapeHtml(debt.name) + '</h3>' +
                '<div class="small text-muted">' +
                  (isPerpetual ? 'Бессрочный' : 'Срок: ' + debt.termMonths + ' мес') +
                  ' · платёж ' + (debt.paymentDay || 1) + ' числа' +
                '</div>' +
              '</div>' +
              '<span class="badge text-bg-light border flex-shrink-0">' + formatPercent(debt.annualRate) + '</span>' +
            '</div>' +
            '<div class="row g-2 mt-3">' +
              '<div class="col-6"><div class="small text-muted">Остаток на сегодня</div><div class="fw-semibold">' + formatMoney(currentBalance) + '</div></div>' +
              '<div class="col-6"><div class="small text-muted">Обязательный платёж/мес</div><div class="fw-semibold">' + formatMoney(required) + '</div></div>' +
              '<div class="col-6"><div class="small text-muted">Досрочка по рекомендации</div><div class="fw-semibold' + (extra > 0 ? ' text-success' : '') + '">' + (extra > 0 ? formatMoney(extra) : '—') + '</div></div>' +
              '<div class="col-6"><div class="small text-muted">Проценты до погашения</div><div class="fw-semibold">' + ((!payoff || payoff.isInfinite) ? '∞' : formatMoney(payoff.totalInterest)) + '</div></div>' +
            '</div>' +
            '<div class="mt-3">' + payoffHtml + termHtml + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function renderSchedule(schedule, currentBalances) {
    const el = $('#schedule-content');
    if (!el) return;

    const currentTotal = roundMoney(
      Object.keys(currentBalances).reduce(function (sum, id) {
        return sum + (currentBalances[id] || 0);
      }, 0)
    );

    const headerHtml =
      '<div class="d-flex flex-wrap gap-4 mb-3">' +
        '<div>' +
          '<div class="text-muted small">Остаток долга на сегодня</div>' +
          '<div class="fs-4 fw-bold summary-number">' + formatMoney(currentTotal) + '</div>' +
        '</div>' +
        '<div>' +
          '<div class="text-muted small">Конфигурация создана</div>' +
          '<div class="fw-semibold">' + formatDateFull(parseLocalDate(config.createdAt)) + '</div>' +
        '</div>' +
        '<div>' +
          '<div class="text-muted small">Период графика</div>' +
          '<div class="fw-semibold">24 месяца</div>' +
        '</div>' +
      '</div>' +
      '<div class="text-muted small mb-3">' +
        'График построен при условии, что вы следуете всем рекомендациям (метод «лавина»). ' +
        'Остатки на сегодня уже учитывают прошедшие платежи от даты создания конфигурации. ' +
        'Платежи текущего месяца показаны в графике.' +
      '</div>';

    if (!config.debts.length) {
      el.innerHTML = headerHtml + '<div class="text-muted">Нет долгов для построения графика.</div>';
      return;
    }

    if (currentTotal <= 0) {
      el.innerHTML =
        headerHtml +
        '<div class="alert alert-success mb-0">' +
        '<i class="bi bi-check-circle-fill me-1"></i>Все долги уже погашены — платежей не требуется.' +
        '</div>';
      return;
    }

    const rowsHtml = schedule.scheduleRows
      .map(function (row, i) {
        const hasDetail = row.debts.length > 0;
        const chevron = hasDetail
          ? '<button type="button" class="btn btn-sm btn-outline-secondary schedule-toggle" data-index="' + i + '" aria-label="Раскрыть"><i class="bi bi-chevron-right"></i></button>'
          : '<span class="btn btn-sm btn-outline-secondary disabled opacity-25"><i class="bi bi-chevron-right"></i></span>';

        let detailHtml = '';
        if (hasDetail) {
          const detailRows = row.debts
            .map(function (d) {
              const closedBadge = d.closed
                ? ' <span class="badge text-bg-success ms-1">закрыт</span>'
                : '';
              return (
                '<tr>' +
                  '<td>' + escapeHtml(d.name) + closedBadge + '</td>' +
                  '<td class="text-end">' + formatMoney(d.required) + '</td>' +
                  '<td class="text-end">' + (d.prepayment > 0 ? formatMoney(d.prepayment) : '—') + '</td>' +
                  '<td class="text-end">' + formatMoney(d.remaining) + '</td>' +
                '</tr>'
              );
            })
            .join('');
          detailHtml =
            '<tr class="schedule-detail d-none" data-detail="' + i + '">' +
              '<td colspan="4">' +
                '<div class="p-2 bg-light rounded">' +
                  '<table class="table table-sm mb-0">' +
                    '<thead><tr class="small text-muted">' +
                      '<th>Долг</th>' +
                      '<th class="text-end">Обязательный платёж</th>' +
                      '<th class="text-end">Досрочное погашение</th>' +
                      '<th class="text-end">Остаток долга</th>' +
                    '</tr></thead>' +
                    '<tbody>' + detailRows + '</tbody>' +
                  '</table>' +
                '</div>' +
              '</td>' +
            '</tr>';
        }

        return (
          '<tr class="schedule-summary schedule-toggle-row" data-index="' + i + '">' +
            '<td>' + chevron + '</td>' +
            '<td class="fw-semibold">' + row.label + '</td>' +
            '<td class="text-end">' + formatMoney(row.totalPayment) + '</td>' +
            '<td class="text-end">' + formatMoney(row.totalRemaining) + '</td>' +
          '</tr>' + detailHtml
        );
      })
      .join('');

    el.innerHTML =
      headerHtml +
      '<div class="table-responsive">' +
        '<table class="table table-hover align-middle mb-0" id="schedule-table">' +
          '<thead><tr class="text-muted small text-uppercase">' +
            '<th style="width:44px"></th>' +
            '<th>Месяц</th>' +
            '<th class="text-end">Общая сумма платежей</th>' +
            '<th class="text-end">Общий остаток долга</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
      '</div>';

    $all('#schedule-content .schedule-toggle-row').forEach(function (row) {
      row.addEventListener('click', function () {
        const idx = row.getAttribute('data-index');
        const detail = el.querySelector('[data-detail="' + idx + '"]');
        const chevron = row.querySelector('.schedule-toggle i');
        if (!detail) return;
        detail.classList.toggle('d-none');
        if (chevron) {
          chevron.classList.toggle('bi-chevron-right');
          chevron.classList.toggle('bi-chevron-down');
        }
      });
    });
  }

  // ----------------------------------------------------------------------
  // Форма долга (онбординг и модалка)
  // ----------------------------------------------------------------------

  function renderDebtFormFields(debt, options) {
    options = options || {};
    const d = debt || {};
    const modeAttr = options.withRemove ? 'data-debt-row' : 'data-modal-row';
    const wrapperClass = options.withRemove ? 'card card-body border rounded-3 mb-3' : '';
    const removeButton = options.withRemove
      ? '<div class="col-auto d-flex align-items-end">' +
          '<button type="button" class="btn btn-outline-danger" data-action="remove-debt" title="Удалить долг">' +
            '<i class="bi bi-trash"></i>' +
          '</button>' +
        '</div>'
      : '';

    return (
      '<div class="debt-form ' + wrapperClass + '" ' + modeAttr + ' data-debt-id="' + escapeHtml(d.id || '') + '">' +
        '<div class="row g-2 align-items-end">' +
          '<div class="col-12 col-md-3">' +
            '<label class="form-label small text-muted mb-1">Название долга</label>' +
            '<input type="text" class="form-control" data-field="name" value="' + escapeHtml(d.name || '') + '" placeholder="Например: Ипотека">' +
            '<div class="invalid-feedback"></div>' +
          '</div>' +
          '<div class="col-6 col-md-2">' +
            '<label class="form-label small text-muted mb-1">Остаток, ' + CURRENCY + '</label>' +
            '<input type="number" class="form-control" data-field="balance" min="0.01" step="0.01" value="' + (d.balance != null ? d.balance : '') + '" placeholder="0">' +
            '<div class="invalid-feedback"></div>' +
          '</div>' +
          '<div class="col-6 col-md-2">' +
            '<label class="form-label small text-muted mb-1">Ставка, %</label>' +
            '<input type="number" class="form-control" data-field="rate" min="0" step="0.01" value="' + (d.annualRate != null ? d.annualRate : '') + '" placeholder="0">' +
            '<div class="invalid-feedback"></div>' +
          '</div>' +
          '<div class="col-6 col-md-2">' +
            '<label class="form-label small text-muted mb-1">Срок, мес <span class="fw-normal">(необяз.)</span></label>' +
            '<input type="number" class="form-control" data-field="term" min="1" step="1" value="' + (d.termMonths != null ? d.termMonths : '') + '" placeholder="—">' +
            '<div class="invalid-feedback"></div>' +
          '</div>' +
          '<div class="col-6 col-md-2">' +
            '<label class="form-label small text-muted mb-1">Дата платежа (число)</label>' +
            '<input type="number" class="form-control" data-field="paymentDay" min="1" max="31" step="1" value="' + (d.paymentDay != null ? d.paymentDay : 1) + '" placeholder="1">' +
            '<div class="invalid-feedback"></div>' +
          '</div>' +
          removeButton +
          '<div class="col-12">' +
            '<div class="small text-muted">Обязательный платёж/мес: <span class="fw-semibold text-body" data-field="payment-hint">—</span></div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function updatePaymentHint(scopeEl) {
    const hintEl = scopeEl.querySelector('[data-field="payment-hint"]');
    if (!hintEl) return;

    const balance = Number(scopeEl.querySelector('[data-field="balance"]').value);
    const rate = Number(scopeEl.querySelector('[data-field="rate"]').value);
    const termRaw = scopeEl.querySelector('[data-field="term"]').value;
    const term = termRaw === '' ? null : Number(termRaw);

    if (!isFinite(balance) || balance <= 0 || !isFinite(rate) || rate < 0) {
      hintEl.textContent = '—';
      return;
    }

    if (term != null && isFinite(term) && term > 0) {
      hintEl.textContent = formatMoney(monthlyAnnuityPayment(balance, rate, term)) + ' (аннуитет)';
    } else {
      hintEl.textContent = formatMoney(monthlyInterest(balance, rate)) + ' (только проценты)';
    }
  }

  function validateDebtRow(row, skipEmpty) {
    const nameEl = row.querySelector('[data-field="name"]');
    const balanceEl = row.querySelector('[data-field="balance"]');
    const rateEl = row.querySelector('[data-field="rate"]');
    const termEl = row.querySelector('[data-field="term"]');
    const paymentDayEl = row.querySelector('[data-field="paymentDay"]');
    [nameEl, balanceEl, rateEl, termEl, paymentDayEl].forEach(clearFieldInvalid);

    const name = nameEl.value.trim();
    const balanceRaw = balanceEl.value;
    const rateRaw = rateEl.value;
    const termRaw = termEl.value;
    const paymentDayRaw = paymentDayEl.value;

    if (skipEmpty && !name && !balanceRaw && !rateRaw && !termRaw) {
      return { valid: true, isEmpty: true, debt: null };
    }

    let valid = true;

    if (!name) {
      markFieldInvalid(nameEl, 'Укажите название');
      valid = false;
    }

    const balance = balanceRaw === '' ? NaN : Number(balanceRaw);
    if (!isFinite(balance) || balance <= 0) {
      markFieldInvalid(balanceEl, 'Должно быть > 0');
      valid = false;
    }

    const rate = rateRaw === '' ? NaN : Number(rateRaw);
    if (!isFinite(rate) || rate < 0) {
      markFieldInvalid(rateEl, 'Должно быть ≥ 0');
      valid = false;
    }

    let termMonths;
    if (termRaw !== '') {
      const term = Number(termRaw);
      if (!isFinite(term) || term <= 0 || !Number.isInteger(term)) {
        markFieldInvalid(termEl, 'Целое > 0');
        valid = false;
      } else {
        termMonths = term;
      }
    }

    let paymentDay = 1;
    if (paymentDayRaw !== '') {
      const pd = Number(paymentDayRaw);
      if (!isFinite(pd) || pd < 1 || pd > 31 || !Number.isInteger(pd)) {
        markFieldInvalid(paymentDayEl, 'Число 1–31');
        valid = false;
      } else {
        paymentDay = pd;
      }
    }

    if (!valid) {
      return { valid: false, debt: null };
    }

    return {
      valid: true,
      debt: {
        id: row.getAttribute('data-debt-id') || generateId(),
        name: name,
        balance: roundMoney(balance),
        annualRate: roundMoney(rate),
        termMonths: termMonths, // undefined = бессрочный
        paymentDay: paymentDay,
      },
    };
  }

  // ----------------------------------------------------------------------
  // Модалка добавления/редактирования долга
  // ----------------------------------------------------------------------

  function openDebtModal(debtId) {
    editingDebtId = debtId || null;
    $('#debtModalTitle').textContent = editingDebtId ? 'Изменить долг' : 'Добавить долг';

    const debt = editingDebtId ? config.debts.find(function (d) { return d.id === editingDebtId; }) : null;

    const body = $('#debtModalBody');
    body.innerHTML = renderDebtFormFields(debt, { withRemove: false });

    const row = body.querySelector('[data-modal-row]');
    row.querySelectorAll('input[data-field]').forEach(function (input) {
      input.addEventListener('input', function () {
        updatePaymentHint(row);
      });
    });
    updatePaymentHint(row);

    getDebtModal().show();
  }

  function onModalSave() {
    const body = $('#debtModalBody');
    const row = body.querySelector('[data-modal-row]');
    if (!row) return;

    const result = validateDebtRow(row, false);
    if (!result.valid) {
      return;
    }

    const debt = result.debt;
    if (editingDebtId) {
      const index = config.debts.findIndex(function (d) { return d.id === editingDebtId; });
      if (index >= 0) {
        config.debts[index] = debt;
      }
    } else {
      config.debts.push(debt);
    }

    saveConfig(config);
    getDebtModal().hide();
    renderDebtConfigList();
    renderCalculations();
  }

  function deleteDebt(id) {
    config.debts = config.debts.filter(function (d) {
      return d.id !== id;
    });
    saveConfig(config);
    renderDebtConfigList();
    renderCalculations();
  }

  // ----------------------------------------------------------------------
  // Старт
  // ----------------------------------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
