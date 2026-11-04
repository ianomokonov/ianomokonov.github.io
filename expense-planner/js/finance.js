/**
 * finance.js — чистые финансовые функции.
 *
 * Никакого DOM, никаких побочных эффектов. Все денежные величины внутри
 * округляются до копеек (2 знака после запятой). Форматирование и вывод —
 * в app.js.
 */

/**
 * @typedef {Object} Debt
 * @property {string} id
 * @property {string} name
 * @property {number} balance        — текущий остаток долга, ₽
 * @property {number} annualRate     — годовая ставка, %
 * @property {number=} termMonths    — срок в месяцах; undefined = бессрочный долг
 */

/**
 * Округление до копеек.
 * @param {number} value
 * @returns {number}
 */
function roundMoney(value) {
  if (!isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Ежемесячный платёж по аннуитету.
 * P = S·r / (1 − (1+r)^−n), где r = annualRate/100/12, n = termMonths.
 * @param {number} balance
 * @param {number} annualRate
 * @param {number} termMonths
 * @returns {number}
 */
function monthlyAnnuityPayment(balance, annualRate, termMonths) {
  if (!isFinite(balance) || balance <= 0 || !isFinite(annualRate) || annualRate < 0) {
    return 0;
  }
  if (!isFinite(termMonths) || termMonths <= 0) {
    return 0;
  }
  const r = annualRate / 100 / 12;
  // При нулевой ставке аннуитет вырождается в S / n (деление на ноль в формуле).
  if (r === 0) {
    return roundMoney(balance / termMonths);
  }
  const factor = Math.pow(1 + r, termMonths);
  return roundMoney((balance * r) / (1 - 1 / factor));
}

/**
 * Проценты, начисляемые за один месяц.
 * @param {number} balance
 * @param {number} annualRate
 * @returns {number}
 */
function monthlyInterest(balance, annualRate) {
  if (!isFinite(balance) || balance <= 0 || !isFinite(annualRate) || annualRate < 0) {
    return 0;
  }
  return roundMoney((balance * annualRate) / 100 / 12);
}

/**
 * Обязательный ежемесячный платёж по долгу.
 * Для срочного долга — аннуитет, для бессрочного — только проценты.
 * @param {Debt} debt
 * @returns {number}
 */
function requiredMonthlyPayment(debt) {
  if (!debt) return 0;
  if (debt.termMonths != null && debt.termMonths > 0) {
    return monthlyAnnuityPayment(debt.balance, debt.annualRate, debt.termMonths);
  }
  return monthlyInterest(debt.balance, debt.annualRate);
}

/**
 * Прибавить месяцы к дате с корректной обработкой конца месяца
 * (например, 31 января + 1 месяц = 28/29 февраля).
 * @param {Date} date
 * @param {number} months
 * @returns {Date}
 */
function addMonths(date, months) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) {
    d.setDate(0); // переполнение → последний день предыдущего месяца
  }
  return d;
}

/**
 * Помесячная симуляция погашения долга.
 *
 * Каждый месяц: начисление процентов → вычитание обязательного платежа →
 * вычитание дополнительной (досрочной) суммы.
 *
 * @param {Debt} debt
 * @param {number} extraMonthly Дополнительная ежемесячная сумма досрочки.
 * @param {number} [maxMonths=600] Максимальный горизонт симуляции.
 * @returns {{monthsLeft:number, totalInterest:number, payoffDate:(Date|null), isInfinite:boolean}}
 */
function simulatePayoff(debt, extraMonthly, maxMonths) {
  if (maxMonths === undefined || maxMonths === null) maxMonths = 600;
  const extra = isFinite(extraMonthly) && extraMonthly > 0 ? extraMonthly : 0;

  if (!debt || !isFinite(debt.balance) || debt.balance <= 0) {
    return { monthsLeft: 0, totalInterest: 0, payoffDate: new Date(), isInfinite: false };
  }

  const r = (debt.annualRate || 0) / 100 / 12;
  const isPerpetual = !(debt.termMonths != null && debt.termMonths > 0);
  const annuity = isPerpetual
    ? 0
    : monthlyAnnuityPayment(debt.balance, debt.annualRate, debt.termMonths);

  let balance = roundMoney(debt.balance);
  let totalInterest = 0;

  for (let month = 1; month <= maxMonths; month++) {
    const interest = roundMoney(balance * r);
    totalInterest = roundMoney(totalInterest + interest);
    balance = roundMoney(balance + interest);

    // Обязательный платёж: у бессрочного долга он в точности гасит проценты.
    const required = Math.min(isPerpetual ? interest : annuity, balance);
    balance = roundMoney(balance - required);

    if (balance <= 0.005) {
      return {
        monthsLeft: month,
        totalInterest,
        payoffDate: addMonths(new Date(), month),
        isInfinite: false,
      };
    }

    if (extra > 0) {
      const applied = Math.min(extra, balance);
      balance = roundMoney(balance - applied);
      if (balance <= 0.005) {
        return {
          monthsLeft: month,
          totalInterest,
          payoffDate: addMonths(new Date(), month),
          isInfinite: false,
        };
      }
    }
  }

  // Не погашен в пределах горизонта симуляции.
  return { monthsLeft: maxMonths, totalInterest, payoffDate: null, isInfinite: true };
}

/**
 * Рекомендация по досрочному погашению (метод «лавина»):
 * распределить все свободные деньги на долг с максимальной ставкой
 * (в пределах его остатка), остаток — на следующий по ставке и т.д.
 *
 * @param {Debt[]} debts
 * @param {number} freeMoney Свободные деньги за месяц.
 * @returns {Array<{debtId:string, amount:number}>}
 */
function recommendPrepayment(debts, freeMoney) {
  if (!Array.isArray(debts) || debts.length === 0 || !isFinite(freeMoney) || freeMoney <= 0) {
    return [];
  }

  const sorted = debts.slice().sort((a, b) => {
    if (b.annualRate !== a.annualRate) return b.annualRate - a.annualRate;
    return b.balance - a.balance;
  });

  let remaining = roundMoney(freeMoney);
  const result = [];

  for (const debt of sorted) {
    if (remaining <= 0) break;
    const amount = Math.min(debt.balance, remaining);
    if (amount > 0) {
      result.push({ debtId: debt.id, amount: roundMoney(amount) });
      remaining = roundMoney(remaining - amount);
    }
  }

  return result;
}
