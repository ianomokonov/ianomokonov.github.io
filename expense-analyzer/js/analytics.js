(function (global) {
  'use strict';

  const app = global.app = global.app || {};

  const MONTH_LONG = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });
  const MONTH_SHORT = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit' });

  const CATEGORY_ORDER = [
    'Супермаркеты', 'Кафе и рестораны', 'АЗС', 'Транспорт',
    'Здоровье и аптеки', 'Одежда и обувь', 'Дом и ремонт', 'Развлечения',
    'Связь и интернет', 'Маркетплейсы', 'Красота', 'Зоотовары',
    'Детские товары', 'Подарки и цветы', 'Спорт', 'Алкоголь и табак',
    'Страхование', 'Кредиты и займы', 'Переводы', 'Комиссии', 'ЖКХ',
    'Налоги и штрафы', 'Образование', 'Путешествия', 'Сервисы и подписки',
    'Снятие наличных', 'Аренда', 'Прочие расходы'
  ];

  function round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  /**
   * @param {string} monthKey YYYY-MM
   * @returns {string} «Август 2026»
   */
  function getMonthLabel(monthKey) {
    if (!monthKey) return 'Месяц не выбран';
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return monthKey;
    return capitalize(MONTH_LONG.format(new Date(year, month - 1, 1)).replace(/\s*г\.$/, ''));
  }

  /**
   * @param {string} monthKey YYYY-MM
   * @returns {string} «авг. 26»
   */
  function getMonthShortLabel(monthKey) {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return monthKey;
    return MONTH_SHORT.format(new Date(year, month - 1, 1)).replace(/\s*г\.$/, '');
  }

  function normalizeFilter(filter) {
    let accountIds = null;

    if (filter && filter.accountIds != null) {
      if (filter.accountIds instanceof Set) {
        accountIds = filter.accountIds;
      } else if (Array.isArray(filter.accountIds)) {
        accountIds = new Set(filter.accountIds);
      } else if (typeof filter.accountIds === 'string') {
        accountIds = new Set([filter.accountIds]);
      }
    }

    return {
      accountIds,
      month: filter && filter.month ? String(filter.month) : null
    };
  }

  /**
   * Возвращает счета, попавшие в фильтр.
   * Пустой Set означает «не выбрано ни одного счёта», отсутствие accountIds — все счета.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {Array<Object>}
   */
  function getSelectedAccounts(accounts, filter) {
    const normalized = normalizeFilter(filter);
    if (!normalized.accountIds) return accounts.slice();
    return accounts.filter((account) => normalized.accountIds.has(account.id));
  }

  /**
   * Расход исключён из анализа вручную или автоматическим правилом.
   * @param {Object} transaction
   * @returns {boolean}
   */
  function isExcludedTransaction(transaction) {
    if (transaction.ignored) return true;
    return Boolean(transaction.excludeReason && !transaction.includedManually);
  }

  /**
   * Плоский список расходных операций с данными счёта.
   * По умолчанию возвращает только учитываемые расходы.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @param {{includeIgnored?: boolean, includeExcluded?: boolean}} [options]
   * @returns {Array<Object>}
   */
  function getFilteredTransactions(accounts, filter, options) {
    const normalized = normalizeFilter(filter);
    const includeIgnored = Boolean(options && options.includeIgnored);
    const includeExcluded = Boolean(options && options.includeExcluded);
    const selected = getSelectedAccounts(accounts, normalized);
    const result = [];

    for (const account of selected) {
      for (const transaction of account.transactions || []) {
        if (transaction.amount >= 0) continue;
        if (normalized.month && transaction.month !== normalized.month) continue;
        if (!includeExcluded) {
          if (transaction.excludeReason && !transaction.includedManually) continue;
          if (!includeIgnored && transaction.ignored) continue;
        }

        result.push({
          ...transaction,
          ignored: Boolean(transaction.ignored),
          includedManually: Boolean(transaction.includedManually),
          excludeReason: transaction.excludeReason || '',
          accountId: account.id,
          accountName: account.name,
          accountColor: account.color,
          accountNumber: account.accountNumber || '',
          sourceFile: account.sourceFile || ''
        });
      }
    }

    return result;
  }

  /**
   * Месяцы, в которых у выбранных счетов есть расходные операции,
   * включая полностью исключённые месяцы.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {string[]}
   */
  function getMonthScope(accounts, filter) {
    const normalized = normalizeFilter(filter);
    const selected = getSelectedAccounts(accounts, normalized);
    const months = new Set();

    for (const account of selected) {
      for (const transaction of account.transactions || []) {
        if (transaction.amount >= 0 || !transaction.month) continue;
        if (normalized.month && transaction.month !== normalized.month) continue;
        months.add(transaction.month);
      }
    }

    return Array.from(months).sort();
  }

  /**
   * Суммы расходов по месяцам.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {Array<{month: string, label: string, shortLabel: string, expenses: number, count: number}>}
   */
  function getMonthlyTotals(accounts, filter) {
    const normalized = normalizeFilter(filter);
    const transactions = getFilteredTransactions(accounts, normalized);
    const months = new Map();

    for (const month of getMonthScope(accounts, normalized)) {
      months.set(month, {
        month,
        label: getMonthLabel(month),
        shortLabel: getMonthShortLabel(month),
        expenses: 0,
        count: 0
      });
    }

    for (const transaction of transactions) {
      let item = months.get(transaction.month);
      if (!item) {
        item = {
          month: transaction.month,
          label: getMonthLabel(transaction.month),
          shortLabel: getMonthShortLabel(transaction.month),
          expenses: 0,
          count: 0
        };
        months.set(transaction.month, item);
      }

      item.expenses += Math.abs(transaction.amount);
      item.count += 1;
    }

    return Array.from(months.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        ...item,
        expenses: round2(item.expenses)
      }));
  }

  /**
   * Суммы расходов по категориям. Поддерживает вызов getCategoryTotals(accounts, month)
   * и getCategoryTotals(accounts, filter, monthOverride).
   * @param {Array<Object>} accounts
   * @param {Object|string|null} [filter]
   * @param {string} [monthOverride]
   * @returns {Array<{category: string, total: number, count: number, share: number}>}
   */
  function getCategoryTotals(accounts, filter, monthOverride) {
    let normalized;
    if (typeof filter === 'string' || filter == null) {
      normalized = { accountIds: null, month: filter || null };
    } else {
      normalized = normalizeFilter(filter);
    }
    if (monthOverride !== undefined) normalized.month = monthOverride || null;

    const transactions = getFilteredTransactions(accounts, normalized);
    const categories = new Map();
    let totalExpenses = 0;

    for (const transaction of transactions) {
      const amount = Math.abs(transaction.amount);
      totalExpenses += amount;
      const category = transaction.category || 'Прочие расходы';
      const item = categories.get(category) || { category, total: 0, count: 0 };
      item.total += amount;
      item.count += 1;
      categories.set(category, item);
    }

    return Array.from(categories.values())
      .map((item) => ({
        ...item,
        total: round2(item.total),
        share: totalExpenses > 0 ? item.total / totalExpenses : 0
      }))
      .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'ru'));
  }

  /**
   * Матрица «месяц × категория» по расходам.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {{months: string[], categories: string[], matrix: Object, total: number}}
   */
  function getMonthlyCategoryBreakdown(accounts, filter) {
    const transactions = getFilteredTransactions(accounts, filter);
    const months = new Set(getMonthScope(accounts, filter));
    const categories = new Map();
    const matrix = {};
    let total = 0;

    for (const transaction of transactions) {
      const amount = Math.abs(transaction.amount);
      const category = transaction.category || 'Прочие расходы';
      months.add(transaction.month);
      total += amount;

      if (!matrix[transaction.month]) matrix[transaction.month] = {};
      matrix[transaction.month][category] = (matrix[transaction.month][category] || 0) + amount;

      const item = categories.get(category) || { category, total: 0, count: 0 };
      item.total += amount;
      item.count += 1;
      categories.set(category, item);
    }

    const categoryList = Array.from(categories.values())
      .map((item) => ({ ...item, total: round2(item.total) }))
      .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'ru'));

    for (const month of Object.keys(matrix)) {
      for (const category of Object.keys(matrix[month])) {
        matrix[month][category] = round2(matrix[month][category]);
      }
    }

    return {
      months: Array.from(months).sort(),
      categories: categoryList.map((item) => item.category),
      matrix,
      total: round2(total)
    };
  }

  /**
   * Суммы расходов и количество расходных операций по каждому выбранному счёту.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {Array<Object>}
   */
  function getAccountTotals(accounts, filter) {
    const normalized = normalizeFilter(filter);
    const selected = getSelectedAccounts(accounts, normalized);
    let totalExpenses = 0;

    const items = selected.map((account) => {
      let expenses = 0;
      let count = 0;
      const months = new Set();

      for (const transaction of account.transactions || []) {
        if (transaction.amount >= 0 || isExcludedTransaction(transaction)) continue;
        if (normalized.month && transaction.month !== normalized.month) continue;
        expenses += Math.abs(transaction.amount);
        count += 1;
        if (transaction.month) months.add(transaction.month);
      }

      totalExpenses += expenses;

      return {
        accountId: account.id,
        name: account.name,
        color: account.color,
        total: round2(expenses),
        count,
        monthCount: months.size,
        share: 0,
        sourceFile: account.sourceFile
      };
    });

    return items
      .map((item) => ({
        ...item,
        share: totalExpenses > 0 ? item.total / totalExpenses : 0
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ru'));
  }

  /**
   * Матрица «месяц × счёт» по расходам.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {{months: string[], accounts: Array<{id: string, name: string, color: string, total: number}>,
   *   matrix: Object, total: number}}
   */
  function getMonthlyAccountBreakdown(accounts, filter) {
    const transactions = getFilteredTransactions(accounts, filter);
    const months = new Set(getMonthScope(accounts, filter));
    const byAccount = new Map();
    const matrix = {};
    let total = 0;

    for (const transaction of transactions) {
      const amount = Math.abs(transaction.amount);
      months.add(transaction.month);
      total += amount;

      if (!matrix[transaction.month]) matrix[transaction.month] = {};
      matrix[transaction.month][transaction.accountId] =
        (matrix[transaction.month][transaction.accountId] || 0) + amount;

      const item = byAccount.get(transaction.accountId) || {
        id: transaction.accountId,
        name: transaction.accountName,
        color: transaction.accountColor,
        total: 0
      };
      item.total += amount;
      byAccount.set(transaction.accountId, item);
    }

    for (const month of Object.keys(matrix)) {
      for (const accountId of Object.keys(matrix[month])) {
        matrix[month][accountId] = round2(matrix[month][accountId]);
      }
    }

    return {
      months: Array.from(months).sort(),
      accounts: Array.from(byAccount.values())
        .map((item) => ({ ...item, total: round2(item.total) }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ru')),
      matrix,
      total: round2(total)
    };
  }

  /**
   * Крупнейшие расходные операции без исключённых.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @param {number} [n]
   * @returns {Array<Object>}
   */
  function getTopExpenses(accounts, filter, n = 10) {
    return getFilteredTransactions(accounts, filter)
      .sort((a, b) => a.amount - b.amount)
      .slice(0, Math.max(0, n));
  }

  /**
   * Сумма и количество расходов, исключённых из анализа.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {{total: number, count: number, share: number}}
   */
  function getIgnoredTotals(accounts, filter) {
    const all = getFilteredTransactions(accounts, filter, { includeExcluded: true });
    const excluded = all.filter((transaction) => isExcludedTransaction(transaction));
    const excludedTotal = excluded.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const allTotal = all.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    return {
      total: round2(excludedTotal),
      count: excluded.length,
      share: allTotal > 0 ? excludedTotal / allTotal : 0
    };
  }

  /**
   * Все исключённые расходы: автоматические правила и ручное игнорирование.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {Array<Object>}
   */
  function getExcludedTransactions(accounts, filter) {
    return getFilteredTransactions(accounts, filter, { includeExcluded: true })
      .filter((transaction) => isExcludedTransaction(transaction))
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  }

  function daysInMonth(monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return 0;
    return new Date(year, month, 0).getDate();
  }

  /**
   * Показатели отдельно по каждому месяцу: без суммирования за весь период.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {Array<{month: string, label: string, shortLabel: string, expenses: number,
   *   avgPerDay: number, count: number, ignoredTotal: number, ignoredCount: number, days: number}>}
   */
  function getMonthlySummaries(accounts, filter) {
    const normalized = normalizeFilter(filter);
    const all = getFilteredTransactions(accounts, normalized, { includeExcluded: true });

    return getMonthScope(accounts, normalized).map((month) => {
      const monthTransactions = all.filter((transaction) => transaction.month === month);
      const active = monthTransactions.filter((transaction) => !isExcludedTransaction(transaction));
      const excluded = monthTransactions.filter((transaction) => isExcludedTransaction(transaction));
      const expenses = active.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
      const ignoredTotal = excluded.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
      const days = daysInMonth(month);

      return {
        month,
        label: getMonthLabel(month),
        shortLabel: getMonthShortLabel(month),
        expenses: round2(expenses),
        avgPerDay: round2(days > 0 ? expenses / days : 0),
        count: active.length,
        ignoredTotal: round2(ignoredTotal),
        ignoredCount: excluded.length,
        days
      };
    });
  }

  function dayDiff(fromIso, toIso) {
    const from = new Date(`${fromIso}T00:00:00`);
    const to = new Date(`${toIso}T00:00:00`);
    return Math.floor((to - from) / 86400000) + 1;
  }

  /**
   * Ключевые показатели по расходам. Доходы не учитываются.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {{expenses: number, avgPerDay: number, transactionCount: number,
   *   expenseCount: number, accountCount: number, days: number,
   *   periodFrom: string|null, periodTo: string|null}}
   */
  function getKpi(accounts, filter) {
    const normalized = normalizeFilter(filter);
    const transactions = getFilteredTransactions(accounts, normalized);

    let expenses = 0;
    let minDate = null;
    let maxDate = null;
    const accountIds = new Set();

    for (const transaction of transactions) {
      accountIds.add(transaction.accountId);
      if (!minDate || transaction.date < minDate) minDate = transaction.date;
      if (!maxDate || transaction.date > maxDate) maxDate = transaction.date;
      expenses += Math.abs(transaction.amount);
    }

    let days = 0;
    if (transactions.length) {
      if (normalized.month) {
        days = daysInMonth(normalized.month);
      } else if (minDate && maxDate) {
        days = Math.max(1, dayDiff(minDate, maxDate));
      }
    }

    return {
      expenses: round2(expenses),
      avgPerDay: round2(days > 0 ? expenses / days : 0),
      transactionCount: transactions.length,
      expenseCount: transactions.length,
      accountCount: accountIds.size,
      days,
      periodFrom: minDate,
      periodTo: maxDate
    };
  }

  /**
   * Доступные месяцы (новые сначала). Учитываются и исключённые расходы,
   * чтобы месяц не пропадал из селектора.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {string[]}
   */
  function getAvailableMonths(accounts, filter) {
    return getMonthScope(accounts, filter).sort((a, b) => b.localeCompare(a));
  }

  /**
   * Только доходы разрешённых типов: зарплата, отпускные,
   * зарплата за первую половину месяца.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {Array<Object>}
   */
  function getIncomeTransactions(accounts, filter) {
    const normalized = normalizeFilter(filter);
    const selected = getSelectedAccounts(accounts, normalized);
    const result = [];

    for (const account of selected) {
      for (const transaction of account.transactions || []) {
        if (transaction.amount <= 0 || !transaction.incomeType) continue;
        if (normalized.month && transaction.month !== normalized.month) continue;

        result.push({
          ...transaction,
          accountId: account.id,
          accountName: account.name,
          accountColor: account.color,
          accountNumber: account.accountNumber || '',
          sourceFile: account.sourceFile || ''
        });
      }
    }

    return result.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  }

  /**
   * Доходы отдельно по каждому месяцу и по типам.
   * @param {Array<Object>} accounts
   * @param {Object} [filter]
   * @returns {Array<{month: string, label: string, shortLabel: string, total: number,
   *   count: number, byType: {salary: number, vacation: number, advance: number}}>}
   */
  function getMonthlyIncomeSummaries(accounts, filter) {
    const incomes = getIncomeTransactions(accounts, filter);
    const months = new Map();

    for (const transaction of incomes) {
      let item = months.get(transaction.month);
      if (!item) {
        item = {
          month: transaction.month,
          label: getMonthLabel(transaction.month),
          shortLabel: getMonthShortLabel(transaction.month),
          total: 0,
          count: 0,
          byType: { salary: 0, vacation: 0, advance: 0 }
        };
        months.set(transaction.month, item);
      }

      item.total += transaction.amount;
      item.count += 1;
      if (item.byType[transaction.incomeType] !== undefined) {
        item.byType[transaction.incomeType] += transaction.amount;
      }
    }

    return Array.from(months.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        ...item,
        total: round2(item.total),
        byType: {
          salary: round2(item.byType.salary),
          vacation: round2(item.byType.vacation),
          advance: round2(item.byType.advance)
        }
      }));
  }

  app.analytics = {
    getSelectedAccounts,
    getFilteredTransactions,
    getMonthlyTotals,
    getCategoryTotals,
    getMonthlyCategoryBreakdown,
    getAccountTotals,
    getMonthlyAccountBreakdown,
    getTopExpenses,
    getIgnoredTotals,
    getExcludedTransactions,
    isExcludedTransaction,
    getMonthlySummaries,
    getKpi,
    getAvailableMonths,
    getIncomeTransactions,
    getMonthlyIncomeSummaries,
    getMonthLabel,
    getMonthShortLabel,
    CATEGORY_ORDER
  };
})(window);
