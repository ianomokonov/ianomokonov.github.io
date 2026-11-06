(() => {
  'use strict';

  const STORAGE_KEYS = {
    gifts: 'gifts',
    settings: 'settings',
  };

  const DEFAULT_TOTAL_BUDGET = 0;
  const CURRENCY_FORMATTER = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  });

  const state = {
    gifts: [],
    settings: { totalBudget: DEFAULT_TOTAL_BUDGET },
    budgets: new Map(),
    editingRecipient: null,
    modal: null,
  };

  const elements = {};
  let giftItemSequence = 0;

  function init() {
    cacheElements();
    loadState();
    state.modal = new bootstrap.Modal(elements.giftModal);
    bindEvents();
    render();
  }

  function cacheElements() {
    elements.totalBudget = document.getElementById('totalBudget');
    elements.summaryBudget = document.getElementById('summaryBudget');
    elements.summarySpent = document.getElementById('summarySpent');
    elements.summaryRemaining = document.getElementById('summaryRemaining');
    elements.summaryRemainingCard = document.getElementById('summaryRemainingCard');
    elements.giftCount = document.getElementById('giftCount');
    elements.recipientCount = document.getElementById('recipientCount');
    elements.addGiftBtn = document.getElementById('addGiftBtn');
    elements.clearGiftsBtn = document.getElementById('clearGiftsBtn');
    elements.giftsTableBody = document.getElementById('giftsTableBody');
    elements.giftModal = document.getElementById('giftModal');
    elements.giftForm = document.getElementById('giftForm');
    elements.giftModalLabel = document.getElementById('giftModalLabel');
    elements.recipient = document.getElementById('recipient');
    elements.recipientSuggestions = document.getElementById('recipientSuggestions');
    elements.individualBudget = document.getElementById('individualBudget');
    elements.giftItems = document.getElementById('giftItems');
    elements.addGiftItemBtn = document.getElementById('addGiftItemBtn');
    elements.giftItemTemplate = document.getElementById('giftItemTemplate');
  }

  /**
   * Загружает данные из localStorage и приводит их к ожидаемой структуре.
   * При отсутствии сохранений остаются значения по умолчанию.
   */
  function loadState() {
    let storedGifts = [];
    let storedSettings = {};

    try {
      storedGifts = JSON.parse(localStorage.getItem(STORAGE_KEYS.gifts)) ?? [];
      storedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings)) ?? {};
    } catch (error) {
      console.warn('Не удалось прочитать сохранённые данные.', error);
    }

    state.settings = {
      totalBudget: toNonNegativeNumber(storedSettings.totalBudget, DEFAULT_TOTAL_BUDGET),
    };

    state.gifts = Array.isArray(storedGifts)
      ? storedGifts
          .filter((gift) => gift && typeof gift === 'object')
          .map(normalizeGift)
      : [];
  }

  /**
   * Сохраняет актуальное состояние в localStorage после каждого изменения.
   */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEYS.gifts, JSON.stringify(state.gifts));
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
    } catch (error) {
      console.warn('Не удалось сохранить данные в localStorage.', error);
    }
  }

  function normalizeGift(gift) {
    return {
      id: typeof gift.id === 'string' && gift.id ? gift.id : crypto.randomUUID(),
      recipient: typeof gift.recipient === 'string' ? gift.recipient.trim() : '',
      title: typeof gift.title === 'string' ? gift.title.trim() : '',
      url: typeof gift.url === 'string' ? gift.url.trim() : '',
      price: toNonNegativeNumber(gift.price, 0),
      individualBudget: toOptionalNonNegativeNumber(gift.individualBudget),
    };
  }

  function toNonNegativeNumber(value, fallback) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallback;
  }

  function toOptionalNonNegativeNumber(value) {
    if (value === null || value === undefined || value === '') return null;

    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null;
  }

  /**
   * Единый источник правды для бюджетов получателей.
   * Возвращает Map<recipient, budget>.
   *
   * Индивидуальные бюджеты считаются один раз на уникального получателя.
   * Остаток общего бюджета делится поровну между получателями без
   * индивидуального бюджета.
   */
  function computeBudgets() {
    const recipients = new Set();
    const individualBudgets = new Map();

    state.gifts.forEach((gift) => {
      if (!gift.recipient) return;

      recipients.add(gift.recipient);

      if (gift.individualBudget !== null && !individualBudgets.has(gift.recipient)) {
        individualBudgets.set(gift.recipient, gift.individualBudget);
      }
    });

    const autoRecipients = [...recipients].filter(
      (recipient) => !individualBudgets.has(recipient)
    );
    const sumIndividual = [...individualBudgets.values()].reduce(
      (sum, budget) => sum + budget,
      0
    );
    const remainingBudget = state.settings.totalBudget - sumIndividual;
    const autoBudget =
      autoRecipients.length > 0 ? remainingBudget / autoRecipients.length : 0;

    const budgets = new Map();
    recipients.forEach((recipient) => {
      budgets.set(
        recipient,
        individualBudgets.has(recipient)
          ? individualBudgets.get(recipient)
          : autoBudget
      );
    });

    return budgets;
  }

  function render() {
    state.budgets = computeBudgets();

    renderSummary();
    renderGiftsTable();
    renderRecipientSuggestions();

    // Не перезаписываем поле, пока пользователь вводит в него значение.
    if (document.activeElement !== elements.totalBudget) {
      elements.totalBudget.value = String(state.settings.totalBudget);
    }
  }

  function renderSummary() {
    const totalBudget = state.settings.totalBudget;
    const spent = state.gifts.reduce((sum, gift) => sum + gift.price, 0);
    const remaining = totalBudget - spent;
    const isNegative = remaining < 0;
    const recipientCount = new Set(
      state.gifts.map((gift) => gift.recipient).filter(Boolean)
    ).size;

    elements.summaryBudget.textContent = formatCurrency(totalBudget);
    elements.summarySpent.textContent = formatCurrency(spent);
    elements.giftCount.textContent = String(state.gifts.length);
    elements.recipientCount.textContent = String(recipientCount);

    elements.summaryRemaining.classList.toggle('text-danger', isNegative);
    elements.summaryRemainingCard.classList.toggle('is-negative', isNegative);

    if (isNegative) {
      const icon = document.createElement('i');
      icon.className = 'bi bi-exclamation-triangle-fill me-1';
      icon.setAttribute('aria-hidden', 'true');

      elements.summaryRemaining.replaceChildren(
        icon,
        document.createTextNode(formatCurrency(remaining))
      );
    } else {
      elements.summaryRemaining.textContent = formatCurrency(remaining);
    }
  }

  /**
   * Подсказывает уже добавленных получателей при вводе имени.
   */
  function renderRecipientSuggestions() {
    const recipients = [
      ...new Set(state.gifts.map((gift) => gift.recipient).filter(Boolean)),
    ].sort((first, second) => first.localeCompare(second, 'ru'));

    const options = recipients.map((recipient) => {
      const option = document.createElement('option');
      option.value = recipient;
      return option;
    });

    elements.recipientSuggestions.replaceChildren(...options);
  }

  /**
   * Пересоздаёт таблицу: одна строка на получателя, внутри — все его подарки.
   * Пользовательские строки добавляются через textContent, поэтому
   * HTML-спецсимволы экранируются браузером.
   */
  function renderGiftsTable() {
    const tbody = elements.giftsTableBody;
    const groups = new Map();

    state.gifts.forEach((gift) => {
      if (!groups.has(gift.recipient)) {
        groups.set(gift.recipient, []);
      }
      groups.get(gift.recipient).push(gift);
    });

    if (groups.size === 0) {
      renderEmptyState(tbody);
      return;
    }

    const rows = document.createDocumentFragment();

    groups.forEach((gifts, recipient) => {
      const budget = state.budgets.get(recipient) ?? 0;
      const totalPrice = gifts.reduce((sum, gift) => sum + gift.price, 0);
      const isOverBudget = totalPrice > budget;
      const row = document.createElement('tr');

      if (isOverBudget) row.classList.add('table-danger');

      // 1. Кому
      const recipientCell = document.createElement('td');
      const recipientName = document.createElement('div');
      recipientName.className = 'recipient-name';
      recipientName.textContent = recipient;

      const giftsCount = document.createElement('div');
      giftsCount.className = 'recipient-gifts-count';
      giftsCount.textContent = `${gifts.length} ${getGiftsWord(gifts.length)}`;
      recipientCell.append(recipientName, giftsCount);

      // 2. Подарки получателя
      const giftsCell = document.createElement('td');
      const giftsList = document.createElement('ul');
      giftsList.className = 'gift-list';

      gifts.forEach((gift) => {
        const listItem = document.createElement('li');
        listItem.className = 'gift-list-item';

        const titleWrapper = document.createElement('span');
        titleWrapper.className = 'gift-list-title';
        const safeUrl = getSafeUrl(gift.url);

        if (safeUrl) {
          const link = document.createElement('a');
          link.className = 'gift-link link-primary';
          link.href = safeUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.title = 'Открыть ссылку на товар в новой вкладке';
          link.textContent = gift.title;

          const linkIcon = document.createElement('i');
          linkIcon.className = 'bi bi-box-arrow-up-right ms-1 small';
          linkIcon.setAttribute('aria-hidden', 'true');

          link.append(linkIcon);
          titleWrapper.append(link);
        } else {
          titleWrapper.textContent = gift.title;
        }

        const price = document.createElement('span');
        price.className = 'gift-list-price text-secondary';
        price.textContent = formatCurrency(gift.price);

        listItem.append(titleWrapper, price);
        giftsList.append(listItem);
      });

      giftsCell.append(giftsList);

      // 3. Стоимость всех подарков получателя
      const totalCell = document.createElement('td');
      totalCell.className = 'text-end text-nowrap';
      const totalValue = document.createElement('span');
      totalValue.className = isOverBudget ? 'text-danger fw-bold' : 'fw-semibold';
      totalValue.textContent = formatCurrency(totalPrice);
      totalCell.append(totalValue);

      // 4. Бюджет получателя
      const budgetCell = document.createElement('td');
      budgetCell.className = 'text-end text-nowrap';
      budgetCell.textContent = formatCurrency(budget);

      // 5. Действия со всей группой подарков получателя
      const actionsCell = document.createElement('td');
      actionsCell.className = 'text-end';
      const actions = document.createElement('div');
      actions.className = 'action-buttons d-flex justify-content-end gap-1';
      actions.append(
        createActionButton('edit', 'bi-pencil', 'Изменить', 'btn-outline-primary', recipient),
        createActionButton('delete', 'bi-x-lg', 'Удалить', 'btn-outline-danger', recipient)
      );
      actionsCell.append(actions);

      row.append(recipientCell, giftsCell, totalCell, budgetCell, actionsCell);
      rows.append(row);
    });

    tbody.replaceChildren(rows);
  }

  function renderEmptyState(tbody) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'border-0';

    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const icon = document.createElement('i');
    icon.className = 'bi bi-gift empty-state-icon';
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('p');
    text.className = 'text-secondary mb-0';
    text.textContent = 'Пока нет подарков. Добавьте первый!';

    emptyState.append(icon, text);
    cell.append(emptyState);
    row.append(cell);
    tbody.replaceChildren(row);
  }

  function createActionButton(action, iconClass, label, variantClass, recipient) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `btn btn-sm ${variantClass}`;
    button.dataset.action = action;
    button.dataset.recipient = recipient;
    button.setAttribute(
      'aria-label',
      `${label} подарки получателя «${recipient}»`
    );
    button.title = label;

    const icon = document.createElement('i');
    icon.className = `bi ${iconClass} me-1`;
    icon.setAttribute('aria-hidden', 'true');

    button.append(icon, document.createTextNode(label));
    return button;
  }

  function getGiftsWord(count) {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    if (lastDigit === 1 && lastTwoDigits !== 11) return 'подарок';
    if ([2, 3, 4].includes(lastDigit) && ![12, 13, 14].includes(lastTwoDigits)) {
      return 'подарка';
    }
    return 'подарков';
  }

  function formatCurrency(value) {
    return CURRENCY_FORMATTER.format(value);
  }

  function getSafeUrl(rawUrl) {
    if (!rawUrl) return null;

    try {
      const parsedUrl = new URL(rawUrl);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
        ? parsedUrl.href
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Открывает модальное окно для нового получателя или для редактирования
   * всех подарков существующего получателя.
   */
  function openModal(recipient = null) {
    state.editingRecipient = recipient;

    elements.giftForm.reset();
    clearFormValidation();
    elements.giftItems.replaceChildren();

    if (recipient) {
      const recipientGifts = state.gifts.filter(
        (gift) => gift.recipient === recipient
      );
      const giftWithBudget = recipientGifts.find(
        (gift) => gift.individualBudget !== null
      );

      elements.recipient.value = recipient;
      elements.individualBudget.value = giftWithBudget
        ? String(giftWithBudget.individualBudget)
        : '';
      elements.giftModalLabel.textContent = 'Редактировать подарки';

      recipientGifts.forEach((gift) => appendGiftItem(gift));
    } else {
      elements.giftModalLabel.textContent = 'Добавить получателя';
    }

    if (elements.giftItems.children.length === 0) {
      appendGiftItem();
    }

    updateGiftItemsState();
    state.modal.show();
  }

  /**
   * Добавляет в форму блок одного подарка. Если передан существующий подарок,
   * блок заполняется его данными и сохраняет id для последующего обновления.
   */
  function appendGiftItem(gift = null) {
    const fragment = elements.giftItemTemplate.content.cloneNode(true);
    const giftItem = fragment.querySelector('[data-gift-item]');
    const itemNumber = ++giftItemSequence;

    giftItem.dataset.giftId = gift ? gift.id : '';

    ['title', 'url', 'price'].forEach((fieldName) => {
      const input = giftItem.querySelector(`[data-field="${fieldName}"]`);
      const label = giftItem.querySelector(`[data-label="${fieldName}"]`);
      const inputId = `gift-${fieldName}-${itemNumber}`;

      input.id = inputId;
      if (label) label.htmlFor = inputId;
    });

    giftItem.querySelector('[data-field="title"]').value = gift ? gift.title : '';
    giftItem.querySelector('[data-field="url"]').value = gift ? gift.url : '';
    giftItem.querySelector('[data-field="price"]').value = gift
      ? String(gift.price)
      : '';

    elements.giftItems.append(fragment);
    updateGiftItemsState();
    return giftItem;
  }

  function updateGiftItemsState() {
    const items = [...elements.giftItems.querySelectorAll('[data-gift-item]')];

    items.forEach((item, index) => {
      const number = item.querySelector('[data-gift-number]');
      if (number) number.textContent = String(index + 1);

      const removeButton = item.querySelector('[data-remove-gift]');
      if (removeButton) {
        removeButton.classList.toggle('d-none', items.length === 1);
      }
    });
  }

  function bindEvents() {
    elements.addGiftBtn.addEventListener('click', () => openModal());
    elements.clearGiftsBtn.addEventListener('click', clearGiftList);
    elements.totalBudget.addEventListener('input', handleTotalBudgetInput);
    elements.totalBudget.addEventListener('change', normalizeTotalBudgetInput);
    elements.giftForm.addEventListener('submit', handleGiftFormSubmit);
    elements.addGiftItemBtn.addEventListener('click', handleAddGiftItem);

    // Делегирование кликов и ввода для динамических блоков подарков.
    elements.giftItems.addEventListener('click', handleGiftItemsClick);
    elements.giftItems.addEventListener('input', (event) => {
      if (event.target.matches('[data-field]')) {
        clearFieldError(event.target);
      }
    });

    // Делегирование кликов для кнопок, которые пересоздаются при рендере.
    elements.giftsTableBody.addEventListener('click', handleTableClick);

    elements.giftModal.addEventListener('hidden.bs.modal', resetGiftModal);
    elements.giftModal.addEventListener('shown.bs.modal', () => {
      elements.recipient.focus();
    });

    [elements.recipient, elements.individualBudget].forEach((field) => {
      field.addEventListener('input', () => clearFieldError(field));
    });
  }

  function handleTotalBudgetInput() {
    const rawValue = elements.totalBudget.value;
    const parsedValue = Number(rawValue);

    state.settings.totalBudget =
      rawValue !== '' && Number.isFinite(parsedValue) && parsedValue >= 0
        ? parsedValue
        : 0;

    saveState();
    render();
  }

  function normalizeTotalBudgetInput() {
    state.settings.totalBudget = toNonNegativeNumber(
      elements.totalBudget.value,
      DEFAULT_TOTAL_BUDGET
    );
    saveState();
    elements.totalBudget.value = String(state.settings.totalBudget);
    render();
  }

  function clearGiftList() {
    if (state.gifts.length === 0) return;

    const confirmed = window.confirm(
      'Удалить все подарки? Это действие нельзя отменить.'
    );
    if (!confirmed) return;

    state.gifts = [];
    saveState();
    render();
  }

  function handleTableClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const recipient = button.dataset.recipient;
    const hasGifts = state.gifts.some((gift) => gift.recipient === recipient);
    if (!hasGifts) return;

    if (button.dataset.action === 'edit') {
      openModal(recipient);
      return;
    }

    if (button.dataset.action === 'delete') {
      state.gifts = state.gifts.filter(
        (gift) => gift.recipient !== recipient
      );
      saveState();
      render();
    }
  }

  function handleAddGiftItem() {
    const giftItem = appendGiftItem();
    giftItem.querySelector('[data-field="title"]').focus();
  }

  function handleGiftItemsClick(event) {
    const removeButton = event.target.closest('[data-remove-gift]');
    if (!removeButton) return;

    const items = elements.giftItems.querySelectorAll('[data-gift-item]');
    if (items.length <= 1) return;

    removeButton.closest('[data-gift-item]')?.remove();
    updateGiftItemsState();
  }

  function handleGiftFormSubmit(event) {
    event.preventDefault();
    clearFormValidation();

    if (elements.giftItems.children.length === 0) {
      appendGiftItem();
    }

    const recipient = elements.recipient.value.trim();
    const rawIndividualBudget = elements.individualBudget.value.trim();
    let firstInvalidField = null;

    const markInvalid = (field, message) => {
      setFieldError(field, message);
      if (!firstInvalidField) firstInvalidField = field;
    };

    if (!recipient) {
      markInvalid(elements.recipient, 'Введите имя получателя.');
    }

    let individualBudget = null;
    if (rawIndividualBudget !== '') {
      const parsedBudget = Number(rawIndividualBudget);
      if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
        markInvalid(
          elements.individualBudget,
          'Бюджет должен быть неотрицательным числом.'
        );
      } else {
        individualBudget = parsedBudget;
      }
    }

    const giftItems = [
      ...elements.giftItems.querySelectorAll('[data-gift-item]'),
    ];
    const preparedGifts = [];

    giftItems.forEach((giftItem) => {
      const titleInput = giftItem.querySelector('[data-field="title"]');
      const urlInput = giftItem.querySelector('[data-field="url"]');
      const priceInput = giftItem.querySelector('[data-field="price"]');
      const title = titleInput.value.trim();
      const url = urlInput.value.trim();
      const rawPrice = priceInput.value.trim();
      let price = 0;

      if (!title) {
        markInvalid(titleInput, 'Введите название подарка.');
      }

      if (url && !getSafeUrl(url)) {
        markInvalid(
          urlInput,
          'Укажите корректную ссылку, начинающуюся с http:// или https://.'
        );
      }

      if (rawPrice === '') {
        markInvalid(priceInput, 'Укажите цену от 0 ₽.');
      } else {
        price = Number(rawPrice);
        if (!Number.isFinite(price) || price < 0) {
          markInvalid(priceInput, 'Укажите цену от 0 ₽.');
        }
      }

      preparedGifts.push({
        existingId: giftItem.dataset.giftId || null,
        title,
        url,
        price,
      });
    });

    if (firstInvalidField) {
      firstInvalidField.focus();
      return;
    }

    const previousRecipient = state.editingRecipient;

    if (previousRecipient !== null) {
      const originalGifts = state.gifts.filter(
        (gift) => gift.recipient === previousRecipient
      );
      const originalGiftsById = new Map(
        originalGifts.map((gift) => [gift.id, gift])
      );
      const keptIds = new Set(
        preparedGifts
          .map((gift) => gift.existingId)
          .filter((id) => id && originalGiftsById.has(id))
      );

      state.gifts = state.gifts.filter(
        (gift) => !originalGiftsById.has(gift.id) || keptIds.has(gift.id)
      );

      preparedGifts.forEach((preparedGift) => {
        if (
          preparedGift.existingId &&
          originalGiftsById.has(preparedGift.existingId)
        ) {
          const existingGift = originalGiftsById.get(preparedGift.existingId);
          Object.assign(existingGift, {
            recipient,
            title: preparedGift.title,
            url: preparedGift.url,
            price: preparedGift.price,
            individualBudget,
          });
        } else {
          state.gifts.push({
            id: crypto.randomUUID(),
            recipient,
            title: preparedGift.title,
            url: preparedGift.url,
            price: preparedGift.price,
            individualBudget,
          });
        }
      });
    } else {
      preparedGifts.forEach((gift) => {
        state.gifts.push({
          id: crypto.randomUUID(),
          recipient,
          title: gift.title,
          url: gift.url,
          price: gift.price,
          individualBudget,
        });
      });
    }

    // Индивидуальный бюджет задаётся на получателя, поэтому при явно
    // указанном значении синхронизируем его для всех подарков получателя.
    if (individualBudget !== null) {
      state.gifts.forEach((gift) => {
        if (gift.recipient === recipient) {
          gift.individualBudget = individualBudget;
        }
      });
    }

    saveState();
    state.modal.hide();
    render();
  }

  function setFieldError(field, message) {
    field.classList.add('is-invalid');
    field.setAttribute('aria-invalid', 'true');

    const feedback = field.parentElement.querySelector('.invalid-feedback');
    if (feedback) feedback.textContent = message;
  }

  function clearFieldError(field) {
    field.classList.remove('is-invalid');
    field.removeAttribute('aria-invalid');
  }

  function clearFormValidation() {
    elements.giftForm
      .querySelectorAll('.is-invalid')
      .forEach((field) => clearFieldError(field));
  }

  function resetGiftModal() {
    state.editingRecipient = null;
    elements.giftForm.reset();
    clearFormValidation();
    elements.giftItems.replaceChildren();
    elements.giftModalLabel.textContent = 'Добавить получателя';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
