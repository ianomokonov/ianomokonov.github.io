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
 * @property {number=} paymentDay    — день месяца платежа (1–31), по умолчанию 1
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
 * Обязательный платёж по долгу на текущий момент.
 *
 * Для срочного долга аннуитет фиксируется от исходного остатка (досрочное
 * погашение сокращает срок, а не сумму платежа). Для бессрочного долга
 * обязательный платёж — проценты от текущего остатка.
 *
 * @param {Debt} debt          Исходный долг (balance — остаток на дату создания).
 * @param {number} currentBalance Текущий остаток долга.
 * @returns {number}
 */
function requiredPaymentForDebt(debt, currentBalance) {
  if (!debt) return 0;
  if (debt.termMonths != null && debt.termMonths > 0) {
    return monthlyAnnuityPayment(debt.balance, debt.annualRate, debt.termMonths);
  }
  return monthlyInterest(currentBalance, debt.annualRate);
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
 * Помесячная симуляция погашения отдельного долга.
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

// ============================================================================
// Помесячный план погашения всех долгов (график платежей)
// ============================================================================

/**
 * Абсолютный индекс месяца (год и месяц в одной величине).
 * @param {number} year
 * @param {number} month 0-based (0 = январь).
 * @returns {number}
 */
function monthIndex(year, month) {
  return year * 12 + month;
}

/**
 * Количество дней в месяце.
 * @param {number} year
 * @param {number} month 0-based.
 * @returns {number}
 */
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Месяц первого платежа по долгу: ближайший день `paymentDay`, который
 * наступает не раньше даты создания конфигурации.
 * @param {Date} createdAt
 * @param {number} [paymentDay]
 * @returns {number} Абсолютный индекс месяца (см. monthIndex).
 */
function firstPaymentMonthIndex(createdAt, paymentDay) {
  const day = paymentDay != null && paymentDay >= 1 ? Math.min(Math.floor(paymentDay), 31) : 1;
  let y = createdAt.getFullYear();
  let m = createdAt.getMonth();
  const clamped = Math.min(day, daysInMonth(y, m));
  const candidate = new Date(y, m, clamped);
  if (candidate < createdAt) {
    m += 1;
    if (m === 12) {
      m = 0;
      y += 1;
    }
  }
  return monthIndex(y, m);
}

/**
 * Подпись месяца вида «11.2026».
 * @param {number} year
 * @param {number} month 0-based.
 * @returns {string}
 */
function formatMonthLabel(year, month) {
  return String(month + 1).padStart(2, '0') + '.' + year;
}

/**
 * Разобрать локальную дату формата 'YYYY-MM-DD'.
 * @param {string} key
 * @returns {Date|null}
 */
function parseLocalDate(key) {
  if (!key || typeof key !== 'string') return null;
  const parts = key.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(y, m - 1, d);
}

/**
 * Локальная дата в формате 'YYYY-MM-DD'.
 * @param {Date} date
 * @returns {string}
 */
function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

/**
 * Низкоуровневая помесячная симуляция погашения всех долгов.
 *
 * Каждый месяц: по каждому активному долгу начисляются проценты и вычитается
 * обязательный платёж (аннуитет для срочных, только проценты для бессрочных);
 * затем свободные деньги распределяются на досрочное погашение методом
 * «лавина» (если applyPrepayment = true).
 *
 * @param {Array<Debt & {firstPaymentIndex:number}>} debts
 * @param {number} monthlyIncome
 * @param {number} livingExpenses
 * @param {number} fromIndex Абсолютный индекс первого месяца.
 * @param {number} toIndex   Абсолютный индекс последнего месяца.
 * @param {boolean} applyPrepayment
 * @returns {{
 *   rows: Array<Object>,
 *   balancesBefore: Object<string, Object<string, number>>,
 *   payoff: Object<string, Object>
 * }}
 */
function simulateRepaymentPlan(debts, monthlyIncome, livingExpenses, fromIndex, toIndex, applyPrepayment) {
  const states = debts.map(function (debt) {
    return {
      debt: debt,
      remaining: roundMoney(debt.balance),
      open: true,
      interestPaid: 0,
      closedAtIndex: null,
      annuity:
        debt.termMonths != null && debt.termMonths > 0
          ? monthlyAnnuityPayment(debt.balance, debt.annualRate, debt.termMonths)
          : 0,
    };
  });

  const rows = [];
  const balancesBefore = {};

  for (let idx = fromIndex; idx <= toIndex; idx++) {
    // Снимок остатков до платежей текущего месяца.
    const snapshot = {};
    states.forEach(function (s) {
      snapshot[s.debt.id] = s.remaining;
    });
    balancesBefore[idx] = snapshot;

    const year = Math.floor(idx / 12);
    const month = idx % 12;

    const active = states.filter(function (s) {
      return s.open && idx >= s.debt.firstPaymentIndex;
    });

    const detail = active.map(function (s) {
      const r = s.debt.annualRate / 100 / 12;
      const interest = roundMoney(s.remaining * r);
      s.interestPaid = roundMoney(s.interestPaid + interest);
      const afterInterest = roundMoney(s.remaining + interest);
      const required = Math.min(s.annuity > 0 ? s.annuity : interest, afterInterest);
      const afterRequired = roundMoney(afterInterest - required);
      return { state: s, required: required, afterRequired: afterRequired };
    });

    const totalRequired = roundMoney(
      detail.reduce(function (sum, d) {
        return sum + d.required;
      }, 0)
    );
    const freeMoney = roundMoney(monthlyIncome - livingExpenses - totalRequired);

    const prepayments = {};
    let totalPrepayment = 0;
    if (applyPrepayment && freeMoney > 0) {
      let remainingFree = freeMoney;
      const sorted = detail.slice().sort(function (a, b) {
        return b.state.debt.annualRate - a.state.debt.annualRate;
      });
      for (const d of sorted) {
        if (remainingFree <= 0) break;
        const amount = Math.min(d.afterRequired, remainingFree);
        if (amount > 0) {
          prepayments[d.state.debt.id] = roundMoney(amount);
          remainingFree = roundMoney(remainingFree - amount);
        }
      }
      totalPrepayment = roundMoney(freeMoney - remainingFree);
    }

    detail.forEach(function (d) {
      const prepay = prepayments[d.state.debt.id] || 0;
      let remaining = roundMoney(d.afterRequired - prepay);
      if (remaining <= 0.005) remaining = 0;
      d.state.remaining = remaining;
      if (remaining === 0 && d.state.open) {
        d.state.open = false;
        d.state.closedAtIndex = idx;
      }
    });

    const totalRemaining = roundMoney(
      states.reduce(function (sum, s) {
        return sum + s.remaining;
      }, 0)
    );

    rows.push({
      index: idx,
      year: year,
      month: month,
      label: formatMonthLabel(year, month),
      totalPayment: roundMoney(totalRequired + totalPrepayment),
      totalRemaining: totalRemaining,
      debts: detail.map(function (d) {
        return {
          debtId: d.state.debt.id,
          name: d.state.debt.name,
          required: d.required,
          prepayment: prepayments[d.state.debt.id] || 0,
          remaining: d.state.remaining,
          closed: d.state.closedAtIndex === idx,
        };
      }),
    });
  }

  const payoff = {};
  states.forEach(function (s) {
    if (s.closedAtIndex != null) {
      const y = Math.floor(s.closedAtIndex / 12);
      const m = s.closedAtIndex % 12;
      payoff[s.debt.id] = {
        isInfinite: false,
        closedAtIndex: s.closedAtIndex,
        payoffLabel: formatMonthLabel(y, m),
        totalInterest: s.interestPaid,
      };
    } else {
      payoff[s.debt.id] = {
        isInfinite: true,
        totalInterest: s.interestPaid,
      };
    }
  });

  return { rows: rows, balancesBefore: balancesBefore, payoff: payoff };
}

/**
 * Привести payoff к единому виду: добавить количество месяцев «от текущего
 * месяца» и общую длительность погашения (от месяца создания конфигурации).
 *
 * @param {Object<string, Object>} payoff
 * @param {number} startIndex   Абсолютный индекс месяца создания конфигурации.
 * @param {number} currentIndex Абсолютный индекс текущего месяца.
 * @returns {Object<string, Object>}
 */
function normalizePayoff(payoff, startIndex, currentIndex) {
  const out = {};
  Object.keys(payoff).forEach(function (id) {
    const p = payoff[id];
    if (p.isInfinite) {
      out[id] = { isInfinite: true, totalInterest: p.totalInterest };
    } else {
      out[id] = {
        isInfinite: false,
        monthsFromNow: p.closedAtIndex - currentIndex, // 0 = текущий месяц
        totalMonths: p.closedAtIndex - startIndex + 1, // всего месяцев от создания
        payoffLabel: p.payoffLabel,
        totalInterest: p.totalInterest,
      };
    }
  });
  return out;
}

/**
 * Построить полный график погашения долгов.
 *
 * Учитывает дату создания конфигурации и текущую дату: прошедшие месяцы
 * «прокручиваются» по рекомендациям, чтобы вычислить остаток каждого долга
 * на сегодня, а сам график строится на 24 месяца вперёд от текущего месяца.
 *
 * @param {Object} config Объект с полями monthlyIncome, livingExpenses, debts, createdAt.
 * @param {Date} asOfDate Текущая дата.
 * @returns {{
 *   currentBalances: Object<string, number>,
 *   scheduleRows: Array<Object>,
 *   payoffWith: Object<string, Object>,
 *   payoffWithout: Object<string, Object>
 * }}
 */
function buildRepaymentSchedule(config, asOfDate) {
  const HORIZON = 600;
  const SCHEDULE_MONTHS = 24;

  const createdAt = parseLocalDate(config.createdAt) || asOfDate;
  const currentIndex = monthIndex(asOfDate.getFullYear(), asOfDate.getMonth());
  const startIndex = monthIndex(createdAt.getFullYear(), createdAt.getMonth());
  const endIndex = currentIndex + HORIZON - 1;

  const prepared = config.debts.map(function (debt) {
    return Object.assign({}, debt, {
      firstPaymentIndex: firstPaymentMonthIndex(createdAt, debt.paymentDay),
    });
  });

  // История + будущее по рекомендациям — одной симуляцией.
  const main = simulateRepaymentPlan(
    prepared,
    config.monthlyIncome,
    config.livingExpenses,
    startIndex,
    endIndex,
    true
  );

  const currentBalances = main.balancesBefore[currentIndex] || {};

  const scheduleRows = main.rows
    .filter(function (r) {
      return r.index >= currentIndex;
    })
    .slice(0, SCHEDULE_MONTHS);

  const payoffWith = normalizePayoff(main.payoff, startIndex, currentIndex);

  // Сценарий «без досрочки»: от сегодняшних остатков только обязательные платежи.
  const withoutPrepared = prepared.map(function (d) {
    return Object.assign({}, d, {
      balance: currentBalances[d.id] || 0,
      firstPaymentIndex: currentIndex,
    });
  });
  const without = simulateRepaymentPlan(
    withoutPrepared,
    config.monthlyIncome,
    config.livingExpenses,
    currentIndex,
    endIndex,
    false
  );
  const payoffWithout = normalizePayoff(without.payoff, currentIndex, currentIndex);

  return {
    currentBalances: currentBalances,
    scheduleRows: scheduleRows,
    payoffWith: payoffWith,
    payoffWithout: payoffWithout,
  };
}
