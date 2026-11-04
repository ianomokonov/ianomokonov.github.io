/**
 * storage.js — работа с localStorage.
 *
 * Ключ хранения: expense-planner-config-v1
 */

/**
 * @typedef {Object} Config
 * @property {number} monthlyIncome
 * @property {number} livingExpenses
 * @property {Debt[]} debts
 * @property {number} _version
 */

const STORAGE_KEY = 'expense-planner-config-v1';
const CONFIG_VERSION = 1;

/**
 * Генерация уникального идентификатора долга.
 * @returns {string}
 */
function generateId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return 'debt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * Валидация и нормализация сырых данных конфигурации.
 * Неизвестные поля игнорируются (текущая версия не требует миграции).
 *
 * @param {*} data
 * @returns {{ok:boolean, config?:Config, reason?:string}}
 */
function validateConfig(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'Структура конфигурации неверна.' };
  }

  const income = Number(data.monthlyIncome);
  if (!isFinite(income) || income <= 0) {
    return { ok: false, reason: 'Доход должен быть числом больше нуля.' };
  }

  const living = Number(data.livingExpenses);
  if (!isFinite(living) || living < 0) {
    return { ok: false, reason: 'Расход на жизнь должен быть неотрицательным числом.' };
  }

  if (!Array.isArray(data.debts)) {
    return { ok: false, reason: 'Список долгов отсутствует или неверен.' };
  }

  const debts = [];
  for (const d of data.debts) {
    const name = typeof d.name === 'string' ? d.name.trim() : '';
    const balance = Number(d.balance);
    const annualRate = Number(d.annualRate);

    if (!name || !isFinite(balance) || balance <= 0) {
      return { ok: false, reason: 'У одного из долгов неверные название или остаток.' };
    }
    if (!isFinite(annualRate) || annualRate < 0) {
      return { ok: false, reason: 'У одного из долгов неверная годовая ставка.' };
    }

    let termMonths;
    if (d.termMonths != null && d.termMonths !== '') {
      termMonths = Number(d.termMonths);
      if (!isFinite(termMonths) || termMonths <= 0 || !Number.isInteger(termMonths)) {
        return { ok: false, reason: 'Срок долга должен быть целым числом больше нуля.' };
      }
    }

    debts.push({
      id: typeof d.id === 'string' && d.id ? d.id : generateId(),
      name,
      balance: roundMoney(balance),
      annualRate: roundMoney(annualRate),
      termMonths, // undefined = бессрочный
    });
  }

  return {
    ok: true,
    config: {
      monthlyIncome: roundMoney(income),
      livingExpenses: roundMoney(living),
      debts,
      _version: CONFIG_VERSION,
    },
  };
}

/**
 * Загрузить конфигурацию из localStorage.
 *
 * @returns {{status:'absent'|'ok'|'error', config?:Config, reason?:string}}
 *   - 'absent' — ключа нет (нужен онбординг);
 *   - 'ok'     — конфигурация прочитана и провалидирована;
 *   - 'error'  — данные повреждены или невалидны (нужно предложить сброс).
 */
function loadConfig() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return { status: 'error', reason: 'Нет доступа к localStorage.' };
  }

  if (raw === null) {
    return { status: 'absent' };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return { status: 'error', reason: 'Сохранённые данные повреждены (неверный JSON).' };
  }

  // Несовпадение _version на текущей версии не требует миграции:
  // validateConfig просто игнорирует неизвестные поля.
  const result = validateConfig(data);
  if (!result.ok) {
    return { status: 'error', reason: result.reason };
  }

  return { status: 'ok', config: result.config };
}

/**
 * Сохранить конфигурацию в localStorage.
 * @param {Config} config
 * @returns {boolean} Успешно ли сохранение.
 */
function saveConfig(config) {
  config._version = CONFIG_VERSION;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Удалить конфигурацию (сброс к онбордингу).
 */
function resetConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Игнорируем — например, localStorage может быть недоступен.
  }
}
