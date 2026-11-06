(function (global) {
  'use strict';

  const app = global.app = global.app || {};

  /** Фиксированная палитра счетов. */
  const ACCOUNT_COLORS = [
    '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
    '#6366f1', '#06b6d4', '#d946ef', '#22c55e', '#eab308',
    '#f43f5e', '#3b82f6', '#a855f7', '#059669', '#ea580c'
  ];

  /** Фиксированные цвета категорий. */
  const CATEGORY_COLORS = {
    'Супермаркеты': '#10b981',
    'Кафе и рестораны': '#f59e0b',
    'АЗС': '#f97316',
    'Транспорт': '#0ea5e9',
    'Здоровье и аптеки': '#ef4444',
    'Одежда и обувь': '#8b5cf6',
    'Дом и ремонт': '#14b8a6',
    'Развлечения': '#ec4899',
    'Связь и интернет': '#6366f1',
    'Маркетплейсы': '#06b6d4',
    'Красота': '#d946ef',
    'Зоотовары': '#84cc16',
    'Детские товары': '#f43f5e',
    'Подарки и цветы': '#e879f9',
    'Спорт': '#22c55e',
    'Алкоголь и табак': '#a16207',
    'Страхование': '#64748b',
    'Кредиты и займы': '#475569',
    'Переводы': '#94a3b8',
    'Комиссии': '#78716c',
    'ЖКХ': '#0891b2',
    'Налоги и штрафы': '#b45309',
    'Образование': '#2563eb',
    'Путешествия': '#0284c7',
    'Сервисы и подписки': '#7c3aed',
    'Снятие наличных': '#9ca3af',
    'Аренда': '#0d9488',
    'Прочие расходы': '#cbd5e1',
    'Поступления': '#059669',
    'Возвраты': '#0d9488',
    'Другие': '#cbd5e1'
  };

  const CATEGORY_FALLBACK = [
    '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
    '#6366f1', '#06b6d4', '#d946ef', '#22c55e', '#eab308'
  ];

  const moneyFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB'
  });

  const compactFormatter = new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1
  });

  const MONTH_SHORT = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit' });

  let defaultsApplied = false;

  function formatMoney(value) {
    return moneyFormatter.format(Number(value) || 0);
  }

  function formatCompact(value) {
    const number = Number(value) || 0;
    if (number === 0) return '0 ₽';
    return `${compactFormatter.format(number)} ₽`;
  }

  function monthLabel(monthKey) {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return monthKey;
    return MONTH_SHORT.format(new Date(year, month - 1, 1)).replace(/\s*г\.$/, '');
  }

  function hashString(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  /**
   * @param {string} category
   * @returns {string} цвет категории
   */
  function getCategoryColor(category) {
    if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
    return CATEGORY_FALLBACK[hashString(String(category)) % CATEGORY_FALLBACK.length];
  }

  function withAlpha(hex, alpha) {
    const normalized = hex.replace('#', '');
    const value = normalized.length === 3
      ? normalized.split('').map((char) => char + char).join('')
      : normalized;
    const red = parseInt(value.slice(0, 2), 16);
    const green = parseInt(value.slice(2, 4), 16);
    const blue = parseInt(value.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function applyDefaults() {
    if (defaultsApplied || !global.Chart) return;
    defaultsApplied = true;

    global.Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    global.Chart.defaults.font.size = 11;
    global.Chart.defaults.color = '#64748b';
    global.Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, .94)';
    global.Chart.defaults.plugins.tooltip.padding = 10;
    global.Chart.defaults.plugins.tooltip.cornerRadius = 8;
    global.Chart.defaults.plugins.tooltip.titleFont = { size: 11, weight: '700' };
    global.Chart.defaults.plugins.tooltip.bodyFont = { size: 11 };
    global.Chart.defaults.plugins.tooltip.displayColors = true;
    global.Chart.defaults.plugins.tooltip.boxPadding = 3;
  }

  function baseTooltip(extra) {
    return Object.assign({
      backgroundColor: 'rgba(15, 23, 42, .94)',
      padding: 10,
      cornerRadius: 8,
      titleFont: { size: 11, weight: '700' },
      bodyFont: { size: 11 },
      displayColors: true,
      boxPadding: 3
    }, extra || {});
  }

  function legendOptions(display) {
    return {
      display,
      position: 'bottom',
      align: 'start',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 7,
        boxHeight: 7,
        padding: 12,
        font: { size: 10, weight: '600' },
        color: '#64748b'
      }
    };
  }

  function axisMoneyTicks() {
    return {
      callback(value) {
        return formatCompact(value);
      },
      color: '#94a3b8',
      font: { size: 9.5 },
      maxTicksLimit: 7
    };
  }

  function createMonthlyChart(canvas, empty) {
    const chart = new global.Chart(canvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Расходы',
            data: [],
            borderColor: '#e11d48',
            backgroundColor: 'rgba(225, 29, 72, .09)',
            fill: true,
            tension: 0.36,
            borderWidth: 2.5,
            pointRadius: 2.5,
            pointHoverRadius: 5,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#e11d48',
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 420, easing: 'easeOutQuart' },
        plugins: {
          legend: legendOptions(false),
          tooltip: baseTooltip({
            callbacks: {
              label(context) {
                return `Расходы: ${formatMoney(context.parsed.y)}`;
              }
            }
          })
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 0, autoSkip: true }
          },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: '#eef2f7', drawTicks: false },
            ticks: axisMoneyTicks()
          }
        }
      }
    });
    chart.$emptyEl = empty;
    return chart;
  }

  function createCategoryChart(canvas, empty) {
    const chart = new global.Chart(canvas, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 420, easing: 'easeOutQuart' },
        plugins: {
          legend: legendOptions(true),
          tooltip: baseTooltip({
            callbacks: {
              label(context) {
                const absolute = context.dataset.absolute
                  ? context.dataset.absolute[context.dataIndex]
                  : 0;
                const share = Number(context.parsed.y) || 0;
                return `${context.dataset.label}: ${formatMoney(absolute)} · ${share.toFixed(1)}%`;
              }
            }
          })
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 0 }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 100,
            border: { display: false },
            grid: { color: '#eef2f7', drawTicks: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 9.5 },
              callback(value) {
                return `${value}%`;
              }
            }
          }
        }
      }
    });
    chart.$emptyEl = empty;
    return chart;
  }

  function createCategoryStackedChart(canvas, empty) {
    const chart = new global.Chart(canvas, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 420, easing: 'easeOutQuart' },
        plugins: {
          legend: legendOptions(true),
          tooltip: baseTooltip({
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${formatMoney(context.parsed.y)}`;
              },
              footer(items) {
                const total = items.reduce((sum, item) => sum + (Number(item.parsed.y) || 0), 0);
                return `Итого: ${formatMoney(total)}`;
              }
            }
          })
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 0 }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            border: { display: false },
            grid: { color: '#eef2f7', drawTicks: false },
            ticks: axisMoneyTicks()
          }
        }
      }
    });
    chart.$emptyEl = empty;
    return chart;
  }

  function createAccountStackedChart(canvas, empty) {
    const chart = new global.Chart(canvas, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 420, easing: 'easeOutQuart' },
        plugins: {
          legend: legendOptions(true),
          tooltip: baseTooltip({
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${formatMoney(context.parsed.x)}`;
              },
              footer(items) {
                const total = items.reduce((sum, item) => sum + (Number(item.parsed.x) || 0), 0);
                return `Итого: ${formatMoney(total)}`;
              }
            }
          })
        },
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            border: { display: false },
            grid: { color: '#eef2f7', drawTicks: false },
            ticks: axisMoneyTicks()
          },
          y: {
            stacked: true,
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#64748b', font: { size: 10, weight: '600' } }
          }
        }
      }
    });
    chart.$emptyEl = empty;
    return chart;
  }

  /**
   * Создаёт все графики один раз. При смене фильтра они только обновляются.
   * @param {{monthly: {canvas: HTMLCanvasElement, empty: HTMLElement},
   *   categories: {canvas: HTMLCanvasElement, empty: HTMLElement},
   *   monthlyCategories: {canvas: HTMLCanvasElement, empty: HTMLElement},
   *   monthlyAccounts: {canvas: HTMLCanvasElement, empty: HTMLElement}}} elements
   * @returns {Object|null}
   */
  function createCharts(elements) {
    if (!global.Chart) {
      console.error('Chart.js не загрузился.');
      return null;
    }

    applyDefaults();

    return {
      monthly: createMonthlyChart(elements.monthly.canvas, elements.monthly.empty),
      categories: createCategoryChart(elements.categories.canvas, elements.categories.empty),
      monthlyCategories: createCategoryStackedChart(elements.monthlyCategories.canvas, elements.monthlyCategories.empty),
      monthlyAccounts: createAccountStackedChart(elements.monthlyAccounts.canvas, elements.monthlyAccounts.empty)
    };
  }

  function setChartEmpty(chart, isEmpty, message) {
    if (!chart) return;
    const empty = chart.$emptyEl;
    chart.canvas.classList.toggle('chart-hidden', isEmpty);
    if (empty) {
      empty.classList.toggle('d-none', !isEmpty);
      if (message) {
        const label = empty.querySelector('span');
        if (label) label.textContent = message;
      }
    }
  }

  function buildCategoryBreakdownDatasets(breakdown) {
    const categories = breakdown.categories.slice();
    const limit = 8;
    const head = categories.slice(0, limit);
    const rest = categories.slice(limit);
    const datasets = head.map((category) => ({
      label: category,
      data: breakdown.months.map((month) => (breakdown.matrix[month] || {})[category] || 0),
      backgroundColor: getCategoryColor(category),
      borderColor: '#ffffff',
      borderWidth: 1,
      borderRadius: 3,
      maxBarThickness: 34
    }));

    if (rest.length) {
      datasets.push({
        label: 'Другие',
        data: breakdown.months.map((month) => rest.reduce((sum, category) => {
          return sum + ((breakdown.matrix[month] || {})[category] || 0);
        }, 0)),
        backgroundColor: CATEGORY_COLORS['Другие'],
        borderColor: '#ffffff',
        borderWidth: 1,
        borderRadius: 3,
        maxBarThickness: 34
      });
    }

    return datasets;
  }

  function buildStructureDatasets(breakdown) {
    const categories = breakdown.categories.slice();
    const limit = 8;
    const head = categories.slice(0, limit);
    const rest = categories.slice(limit);
    const monthTotals = new Map(breakdown.months.map((month) => {
      const values = breakdown.matrix[month] || {};
      return [month, Object.values(values).reduce((sum, value) => sum + value, 0)];
    }));

    const makeDataset = (category, values) => ({
      label: category,
      data: breakdown.months.map((month) => {
        const total = monthTotals.get(month) || 0;
        return total > 0 ? (values[month] / total) * 100 : 0;
      }),
      absolute: breakdown.months.map((month) => values[month] || 0),
      backgroundColor: getCategoryColor(category),
      borderColor: '#ffffff',
      borderWidth: 1,
      borderRadius: 2,
      maxBarThickness: 34
    });

    const datasets = head.map((category) => {
      const values = {};
      breakdown.months.forEach((month) => {
        values[month] = (breakdown.matrix[month] || {})[category] || 0;
      });
      return makeDataset(category, values);
    });

    if (rest.length) {
      const values = {};
      breakdown.months.forEach((month) => {
        values[month] = rest.reduce((sum, category) => {
          return sum + ((breakdown.matrix[month] || {})[category] || 0);
        }, 0);
      });
      datasets.push(makeDataset('Другие', values));
    }

    return datasets;
  }

  function buildAccountBreakdownDatasets(breakdown) {
    return breakdown.accounts.map((account) => ({
      label: account.name,
      data: breakdown.months.map((month) => (breakdown.matrix[month] || {})[account.id] || 0),
      backgroundColor: account.color,
      borderColor: '#ffffff',
      borderWidth: 1,
      borderRadius: 3,
      maxBarThickness: 36
    }));
  }

  /**
   * Обновляет данные существующих графиков без пересоздания canvas.
   * @param {Object} charts
   * @param {Object} payload
   * @param {Array<Object>} payload.monthlyTotals
   * @param {Object} payload.monthlyCategoryBreakdown
   * @param {Object} payload.monthlyAccountBreakdown
   * @param {boolean} payload.showAccountBreakdown
   */
  function updateCharts(charts, payload) {
    if (!charts) return;

    const monthlyTotals = payload.monthlyTotals || [];
    const categoryBreakdown = payload.monthlyCategoryBreakdown || { months: [], categories: [], matrix: {} };
    const accountBreakdown = payload.monthlyAccountBreakdown || { months: [], accounts: [], matrix: {} };

    const hasMonthly = monthlyTotals.some((item) => item.expenses > 0);
    charts.monthly.data.labels = monthlyTotals.map((item) => item.shortLabel || monthLabel(item.month));
    charts.monthly.data.datasets[0].data = monthlyTotals.map((item) => item.expenses);
    setChartEmpty(charts.monthly, !hasMonthly, 'Нет данных по месяцам');
    charts.monthly.update();

    const hasStructure = categoryBreakdown.months.length > 0 && categoryBreakdown.categories.length > 0;
    charts.categories.data.labels = categoryBreakdown.months.map((month) => monthLabel(month));
    charts.categories.data.datasets = hasStructure
      ? buildStructureDatasets(categoryBreakdown)
      : [];
    setChartEmpty(charts.categories, !hasStructure, 'Нет данных по месяцам');
    charts.categories.update();

    const hasBreakdown = categoryBreakdown.months.length > 0 && categoryBreakdown.categories.length > 0;
    charts.monthlyCategories.data.labels = categoryBreakdown.months.map((month) => monthLabel(month));
    charts.monthlyCategories.data.datasets = buildCategoryBreakdownDatasets(categoryBreakdown);
    setChartEmpty(charts.monthlyCategories, !hasBreakdown, 'Нет данных для разбивки');
    charts.monthlyCategories.update();

    const hasAccounts = payload.showAccountBreakdown
      && accountBreakdown.months.length > 0
      && accountBreakdown.accounts.length > 1;
    charts.monthlyAccounts.data.labels = accountBreakdown.months.map((month) => monthLabel(month));
    charts.monthlyAccounts.data.datasets = hasAccounts
      ? buildAccountBreakdownDatasets(accountBreakdown)
      : [];
    setChartEmpty(
      charts.monthlyAccounts,
      !hasAccounts,
      payload.showAccountBreakdown
        ? 'Нет данных по нескольким счетам'
        : 'Добавьте второй счёт, чтобы увидеть разбивку'
    );
    charts.monthlyAccounts.update();
  }

  function resizeCharts(charts) {
    if (!charts) return;
    Object.values(charts).forEach((chart) => {
      if (chart && typeof chart.resize === 'function') chart.resize();
    });
  }

  function markUnavailable(elements) {
    if (!elements) return;
    Object.values(elements).forEach(({ canvas, empty }) => {
      if (canvas) canvas.classList.add('chart-hidden');
      if (empty) {
        empty.classList.remove('d-none');
        const label = empty.querySelector('span');
        if (label) label.textContent = 'Графики недоступны: не загрузился Chart.js';
      }
    });
  }

  app.charts = {
    ACCOUNT_COLORS,
    CATEGORY_COLORS,
    createCharts,
    updateCharts,
    resizeCharts,
    markUnavailable,
    formatMoney,
    formatCompact,
    getCategoryColor,
    monthLabel
  };
})(window);
