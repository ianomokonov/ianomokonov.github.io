(function (global) {
  'use strict';

  const app = global.app = global.app || {};

  /** @typedef {{ date: string, month: string, amount: number, category: string,
   *              bankCategory: string, description: string, mcc: string,
   *              status: string, isOwnTransfer: boolean,
   *              excludeReason: string,
   *              type: 'income'|'expense' }} ParsedTransaction */

  const PREVIEW_ROWS = 4;
  const HEADER_SCAN_LIMIT = 80;

  // Получатели, операции по которым не должны попадать в анализ расходов.
  const EXCLUDED_PHONE_DIGITS = [
    '79151999845',
    '89151999845',
    '9151999845'
  ];

  const EXCLUDED_PERSON_PATTERNS = [
    /юли(?:я|и|ю|ей)\s+владимировн(?:а|ы|е|у|ой)\s+н(?![а-яa-z])/i,
    /ю\.?\s*владимировн(?:а|е|у|ой)\s+н(?![а-яa-z])/i,
    /yuli(?:a|i|ya|ey)\s+vladimirovn(?:a|e|u|oy)\s+n(?![a-z])/i
  ];

  const HEADER_ALIASES = {
    date: [
      'дата операции', 'дата транзакции', 'дата платежа', 'дата проводки',
      'дата', 'operation date', 'transaction date', 'date'
    ],
    amount: [
      'сумма в валюте счета', 'сумма в валюте', 'сумма операции', 'сумма платежа',
      'сумма транзакции', 'сумма', 'amount', 'transaction amount'
    ],
    category: [
      'категория операции', 'категория транзакции', 'категория',
      'category', 'тип операции'
    ],
    description: [
      'описание операции', 'описание транзакции', 'назначение платежа',
      'описание', 'комментарий', 'description', 'merchant', 'details'
    ],
    status: [
      'статус операции', 'статус', 'status', 'состояние'
    ],
    account: [
      'номер счета', 'номер счёта', 'счет', 'счёт', 'account number',
      'account', 'номер карты', 'iban'
    ],
    mcc: [
      'mcc код', 'mcc-код', 'mcc', 'код mcc'
    ]
  };

  const GENERIC_CATEGORY_RE = /^(прочие|финансовые|иные|без категории|операции|расходы|списания|платежи|other|misc|uncategorized)/i;

  const CATEGORY_SYNONYMS = [
    [/супермаркет|продукт|магазин продукт|grocer|food store/i, 'Супермаркеты'],
    [/кафе|ресторан|фастфуд|food|restaurant/i, 'Кафе и рестораны'],
    [/азс|топлив|бензин|fuel/i, 'АЗС'],
    [/аптек|здоров|медицин|health/i, 'Здоровье и аптеки'],
    [/одежд|обув|clothing|apparel/i, 'Одежда и обувь'],
    [/транспорт|такси|авто|transport|taxi/i, 'Транспорт'],
    [/маркетплейс|интернет-магазин|marketplace/i, 'Маркетплейсы'],
    [/связ|интернет|телеком|telecom|internet/i, 'Связь и интернет'],
    [/развлеч|кино|театр|entertainment/i, 'Развлечения'],
    [/красот|салон|beauty/i, 'Красота'],
    [/зоо|питомц|pet/i, 'Зоотовары'],
    [/детск|children/i, 'Детские товары'],
    [/страхов|insurance/i, 'Страхование'],
    [/кредит|займ|loan|credit/i, 'Кредиты и займы'],
    [/перевод|transfer/i, 'Переводы'],
    [/комисси|fee|commission/i, 'Комиссии'],
    [/жкх|коммунал|utilit/i, 'ЖКХ'],
    [/налог|штраф|tax|fine/i, 'Налоги и штрафы'],
    [/образован|курс|education/i, 'Образование'],
    [/путешеств|отел|авиа|travel|hotel/i, 'Путешествия'],
    [/спорт|фитнес|sport|fitness/i, 'Спорт'],
    [/алкогол|табак|alcohol|tobacco/i, 'Алкоголь и табак'],
    [/подар|цвет|gift|flower/i, 'Подарки и цветы'],
    [/дом|ремонт|мебел|home|repair/i, 'Дом и ремонт'],
    [/аренд|rent/i, 'Аренда']
  ];

  const KNOWN_CATEGORIES = new Set([
    'Супермаркеты', 'Кафе и рестораны', 'АЗС', 'Транспорт',
    'Здоровье и аптеки', 'Одежда и обувь', 'Дом и ремонт', 'Развлечения',
    'Связь и интернет', 'Маркетплейсы', 'Красота', 'Зоотовары',
    'Детские товары', 'Подарки и цветы', 'Спорт', 'Алкоголь и табак',
    'Страхование', 'Кредиты и займы', 'Переводы', 'Комиссии', 'ЖКХ',
    'Налоги и штрафы', 'Образование', 'Путешествия', 'Сервисы и подписки',
    'Снятие наличных', 'Аренда', 'Прочие расходы', 'Поступления', 'Возвраты'
  ]);

  const MCC_CATEGORIES = {
    '5411': 'Супермаркеты', '5412': 'Супермаркеты', '5422': 'Супермаркеты',
    '5441': 'Супермаркеты', '5451': 'Супермаркеты', '5462': 'Супермаркеты',
    '5499': 'Супермаркеты', '5300': 'Супермаркеты',
    '5812': 'Кафе и рестораны', '5813': 'Кафе и рестораны', '5814': 'Кафе и рестораны',
    '5541': 'АЗС', '5542': 'АЗС', '5983': 'АЗС', '5172': 'АЗС',
    '5912': 'Здоровье и аптеки', '8011': 'Здоровье и аптеки',
    '8021': 'Здоровье и аптеки', '8031': 'Здоровье и аптеки', '8042': 'Здоровье и аптеки',
    '0742': 'Зоотовары',
    '5651': 'Одежда и обувь', '5655': 'Одежда и обувь', '5691': 'Одежда и обувь',
    '5699': 'Одежда и обувь', '5611': 'Одежда и обувь', '5621': 'Одежда и обувь',
    '5631': 'Одежда и обувь', '5641': 'Одежда и обувь', '5661': 'Одежда и обувь',
    '5931': 'Одежда и обувь', '5945': 'Детские товары',
    '5944': 'Подарки и цветы', '5977': 'Красота', '7230': 'Красота',
    '7297': 'Красота', '7298': 'Красота', '5995': 'Зоотовары',
    '5200': 'Дом и ремонт', '5211': 'Дом и ремонт', '5231': 'Дом и ремонт',
    '5251': 'Дом и ремонт', '5261': 'Дом и ремонт', '5712': 'Дом и ремонт',
    '5719': 'Дом и ремонт', '5722': 'Дом и ремонт', '5732': 'Дом и ремонт',
    '0780': 'Дом и ремонт',
    '7523': 'Транспорт', '4784': 'Транспорт', '4111': 'Транспорт',
    '4121': 'Транспорт', '4131': 'Транспорт', '7529': 'Транспорт',
    '5964': 'Маркетплейсы', '5992': 'Маркетплейсы', '5311': 'Маркетплейсы',
    '6010': 'Снятие наличных', '6011': 'Снятие наличных',
    '5921': 'Алкоголь и табак', '5993': 'Алкоголь и табак',
    '5815': 'Сервисы и подписки', '5816': 'Развлечения',
    '5817': 'Сервисы и подписки', '5818': 'Сервисы и подписки',
    '4899': 'Связь и интернет', '4812': 'Связь и интернет',
    '4814': 'Связь и интернет', '4816': 'Связь и интернет',
    '7372': 'Связь и интернет',
    '7832': 'Развлечения', '7841': 'Развлечения', '7922': 'Развлечения',
    '7929': 'Развлечения', '7941': 'Развлечения', '7995': 'Развлечения',
    '7997': 'Спорт', '7998': 'Спорт', '5940': 'Спорт', '5941': 'Спорт',
    '8220': 'Образование', '8211': 'Образование', '8299': 'Образование',
    '5942': 'Образование',
    '4722': 'Путешествия', '4411': 'Путешествия', '4511': 'Путешествия',
    '7011': 'Путешествия',
    '9311': 'Налоги и штрафы', '9222': 'Налоги и штрафы', '9399': 'Налоги и штрафы',
    '6051': 'Переводы', '4829': 'Переводы'
  };

  /**
   * Правила по тексту операции. Идут до MCC, потому что название мерчанта
   * обычно точнее, чем общая категория банка.
   */
  const DESCRIPTION_RULES = [
    [/погашение (од|основного долга|кредита)|кредитн(ый|ая) договор|дог\.\s*PIL|займ/i, 'Кредиты и займы'],
    [/страхован|страховк|осаго|каско/i, 'Страхование'],
    [/внутрибанковск|между счетами|перевод (со|на|между) сч[её]т|перевод между/i, 'Переводы'],
    [/возврат (покупателю|средств|оплаты)|refund|chargeback|reversal/i, 'Возвраты'],
    [/комисси|ведение сч[её]та|обслуживание сч[её]та/i, 'Комиссии'],
    [/жкх|коммунальн|электроэнерг|водоснабж|отоплен|газоснабж/i, 'ЖКХ'],
    [/штраф|госпошлин|налог/i, 'Налоги и штрафы'],
    [/аренд(а|у|ой)|arenda/i, 'Аренда'],
    [/сервисы яндекса|яндекс плюс|yandex plus|подписк/i, 'Сервисы и подписки'],
    [/мобильн(ая|ой) связ|сотовая связь|интернет|хостинг|hosting|домен|vpn|32links/i, 'Связь и интернет'],
    [/образован|обучен|курс[ы]?|школ|универ|репетитор/i, 'Образование'],
    [/путешеств|отел|отель|авиабилет|booking|airbnb/i, 'Путешествия'],
    [/снятие наличн|банкомат|atm|bankomat|alfa iss/i, 'Снятие наличных'],
    [/пятероч|pyateroch|перекрест|perekrest|магнит|magnit|дикси|dixy|лента|lenta|глобус|globus|ашан|auchan|самокат|леруа|leroy/i, 'Супермаркеты'],
    [/кафе|ресторан|кофейн|coffee|kfc|burger|pizza|пицц|суши|sushi|tanuki|шоколадниц|\brest\b|vkusno|вкусно/i, 'Кафе и рестораны'],
    [/азс|заправк|нефт|neft|tatneft|лукойл|lukoil|газпромнефт|shell/i, 'АЗС'],
    [/аптек|apteka|инвитро|invitro|клиник|медицин|оптик|optic|стоматолог/i, 'Здоровье и аптеки'],
    [/детск.*мир|detskiy mir|детск/i, 'Детские товары'],
    [/спортмастер|sportmaster|спорт|фитнес|fitness/i, 'Спорт'],
    [/ozon|wildberries|яндекс маркет|маркетплейс/i, 'Маркетплейсы'],
    [/яндекс go|yandex go|такси|taxi|метро|парковк|parkovka|avtodor|платн.*дорог/i, 'Транспорт'],
    [/табак|tobacco|winelab|вино|алкогол|пиво/i, 'Алкоголь и табак'],
    [/цветы|cvety|flower/i, 'Подарки и цветы'],
    [/красот|салон|барбер|barber|парикмах/i, 'Красота'],
    [/кино|театр|музей|развлеч|аквапарк|зоопарк|боулинг|москвариум|netmonet/i, 'Развлечения'],
    [/терволина|tervolina|gloria jeans|acariciar|одежд|обув/i, 'Одежда и обувь'],
    [/зоомагазин|zoomagazin|четыре лап|ветеринар|ветобъедин|зоо/i, 'Зоотовары']
  ];

  const BANK_PATTERNS = [
    [/альфа[\s-]*банк|alfabank|alfa[\s-]*bank/i, 'Альфа-Банк'],
    [/сбербанк|сбер|sberbank|sber/i, 'Сбербанк'],
    [/т-?банк|тинькофф|tinkoff|tbank/i, 'Т-Банк'],
    [/втб|vtb/i, 'ВТБ'],
    [/райффайзен|raiffeisen/i, 'Райффайзенбанк'],
    [/газпромбанк|gazprombank/i, 'Газпромбанк'],
    [/совкомбанк|sovcombank/i, 'Совкомбанк'],
    [/озон[\s-]*банк|ozon[\s-]*bank/i, 'Озон Банк'],
    [/яндекс[\s-]*банк|yandex[\s-]*bank/i, 'Яндекс Банк'],
    [/росбанк|rosbank/i, 'Росбанк'],
    [/промсвязьбанк|psb/i, 'ПСБ'],
    [/московский кредитный банк|мкб|mkb/i, 'МКБ'],
    [/уралсиб|uralsib/i, 'Уралсиб'],
    [/ак барс|ak bars/i, 'Ак Барс'],
    [/хоум кредит|home credit/i, 'Хоум Банк'],
    [/реннесанс|rencredit/i, 'Ренессанс Банк'],
    [/открытие|otkritie/i, 'Открытие'],
    [/россельхозбанк|rshb/i, 'Россельхозбанк'],
    [/почта[\s-]*банк|pochta[\s-]*bank/i, 'Почта Банк'],
    [/wildberries[\s-]*банк|вб банк/i, 'ВБ Банк']
  ];

  function normalizeHeader(value) {
    return String(value == null ? '' : value)
      .replace(/\u00a0/g, ' ')
      .replace(/ё/g, 'е')
      .replace(/[.,:;()«»"'`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function cleanText(value) {
    return String(value == null ? '' : value)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Ищет колонку по точному, затем по частичному совпадению с псевдонимами.
   * @param {string[]} headers нормализованные заголовки
   * @param {string[]} aliases
   * @returns {number} индекс колонки или -1
   */
  function findColumn(headers, aliases) {
    for (const alias of aliases) {
      const normalized = normalizeHeader(alias);
      const exact = headers.indexOf(normalized);
      if (exact !== -1) return exact;
    }
    for (const alias of aliases) {
      const normalized = normalizeHeader(alias);
      if (normalized.length < 3) continue;
      const partial = headers.findIndex((header) =>
        header.length >= 3 && header.includes(normalized)
      );
      if (partial !== -1) return partial;
    }
    return -1;
  }

  /**
   * Отдельный поиск колонки счёта: заголовки вроде «Сумма в валюте счёта»
   * не должны приниматься за идентификатор счёта.
   * @param {string[]} headers
   * @returns {number}
   */
  function findAccountColumn(headers) {
    const excluded = /сумм|валют|баланс|оборот|остат|дата|период|тип|описан|назнач|категор|статус|код/;
    const aliases = HEADER_ALIASES.account;

    for (const alias of aliases) {
      const normalized = normalizeHeader(alias);
      const exact = headers.indexOf(normalized);
      if (exact !== -1) return exact;
    }

    for (const alias of aliases) {
      const normalized = normalizeHeader(alias);
      if (normalized.length < 3) continue;
      const partial = headers.findIndex((header) =>
        header.length >= 3 && header.includes(normalized) && !excluded.test(header)
      );
      if (partial !== -1) return partial;
    }

    return -1;
  }

  /**
   * Находит строку заголовков и индексы нужных колонок.
   * @param {Array<Array<unknown>>} rows
   * @returns {{rowIndex: number, columns: Object, score: number}|null}
   */
  function detectHeader(rows) {
    let best = null;
    const limit = Math.min(rows.length, HEADER_SCAN_LIMIT);

    for (let rowIndex = 0; rowIndex < limit; rowIndex += 1) {
      const row = rows[rowIndex];
      if (!Array.isArray(row) || !row.length) continue;

      const headers = row.map(normalizeHeader);
      const dateCol = findColumn(headers, HEADER_ALIASES.date);
      const amountCol = findColumn(headers, HEADER_ALIASES.amount);
      if (dateCol === -1 || amountCol === -1) continue;

      const categoryCol = findColumn(headers, HEADER_ALIASES.category);
      const descriptionCol = findColumn(headers, HEADER_ALIASES.description);
      const statusCol = findColumn(headers, HEADER_ALIASES.status);
      const accountCol = findAccountColumn(headers);
      const mccCol = findColumn(headers, HEADER_ALIASES.mcc);

      const score = 10
        + (categoryCol !== -1 ? 2 : 0)
        + (descriptionCol !== -1 ? 2 : 0)
        + (statusCol !== -1 ? 1 : 0)
        + (accountCol !== -1 ? 1 : 0)
        + (mccCol !== -1 ? 1 : 0);

      if (!best || score > best.score) {
        best = {
          rowIndex,
          score,
          columns: {
            date: dateCol,
            amount: amountCol,
            category: categoryCol,
            description: descriptionCol,
            status: statusCol,
            account: accountCol,
            mcc: mccCol
          }
        };
      }
    }

    return best;
  }

  /**
   * Преобразует дату из ячейки Excel в ISO-дату и ключ месяца.
   * @param {unknown} value
   * @param {boolean} [date1904]
   * @returns {{iso: string, month: string}|null}
   */
  function parseDateCell(value, date1904) {
    let year;
    let month;
    let day;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      year = value.getFullYear();
      month = value.getMonth() + 1;
      day = value.getDate();
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      const parsed = global.XLSX && global.XLSX.SSF
        ? global.XLSX.SSF.parse_date_code(value + (date1904 ? 1462 : 0))
        : null;
      if (!parsed) return null;
      year = parsed.y;
      month = parsed.m;
      day = parsed.d;
    } else {
      const raw = cleanText(value);
      if (!raw) return null;

      let match = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
      if (match) {
        year = Number(match[1]);
        month = Number(match[2]);
        day = Number(match[3]);
      } else {
        match = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
        if (match) {
          day = Number(match[1]);
          month = Number(match[2]);
          year = Number(match[3]);
          if (year < 100) year += year < 70 ? 2000 : 1900;
        } else {
          const parsed = new Date(raw);
          if (Number.isNaN(parsed.getTime())) return null;
          year = parsed.getFullYear();
          month = parsed.getMonth() + 1;
          day = parsed.getDate();
        }
      }
    }

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const check = new Date(year, month - 1, day);
    if (check.getFullYear() !== year || check.getMonth() + 1 !== month || check.getDate() !== day) {
      return null;
    }

    const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { iso, month: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}` };
  }

  /**
   * Приводит сумму из банковской выгрузки к числу.
   * Поддерживает «-1 249», «1 234,56», «1,234.56», валютные суффиксы и скобки.
   * @param {unknown} value
   * @returns {number} число или NaN
   */
  function parseAmount(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (value == null) return NaN;

    let raw = String(value).trim();
    if (!raw) return NaN;

    let negative = false;
    if (/^\(.*\)$/.test(raw)) {
      negative = true;
      raw = raw.slice(1, -1);
    }

    raw = raw
      .replace(/[\s\u00a0\u202f\u2009]/g, '')
      .replace(/(RUR|RUB|USD|EUR|GBP|руб\.?|р\.)/gi, '')
      .replace(/[₽$€£]/g, '')
      .replace(/'/g, '');

    if (raw.endsWith('-')) {
      negative = true;
      raw = raw.slice(0, -1);
    }

    const comma = raw.lastIndexOf(',');
    const dot = raw.lastIndexOf('.');

    if (comma !== -1 && dot !== -1) {
      if (comma > dot) {
        raw = raw.replace(/\./g, '').replace(',', '.');
      } else {
        raw = raw.replace(/,/g, '');
      }
    } else if (comma !== -1) {
      if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) {
        raw = raw.replace(/,/g, '');
      } else {
        raw = raw.replace(',', '.');
      }
    } else if (dot !== -1) {
      if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
        raw = raw.replace(/\./g, '');
      }
    }

    raw = raw.replace(/[^\d.+-]/g, '');
    if (!raw || raw === '-' || raw === '+') return NaN;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return NaN;

    const result = negative ? -Math.abs(parsed) : parsed;
    return Math.round(result * 100) / 100;
  }

  function looksLikeAccountNumber(value) {
    const text = cleanText(value);
    return /^\d{5,34}$/.test(text.replace(/\s/g, '')) || /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/i.test(text);
  }

  function formatAccountTail(number) {
    const digits = cleanText(number).replace(/\s/g, '');
    return digits.length >= 4 ? digits.slice(-4) : '';
  }

  function makeAccountName(bankName, accountNumber) {
    const tail = formatAccountTail(accountNumber);
    if (tail && bankName) return `${bankName} ···${tail}`;
    if (tail) return `Счёт ···${tail}`;
    return bankName || 'Новый счёт';
  }

  function fileNameToAccountName(fileName) {
    const base = cleanText(fileName).replace(/\.(xlsx|xls)$/i, '');
    const cleaned = base
      .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+[+-]\d{4}/g, ' ')
      .replace(/\d{2}[.\-/]\d{2}[.\-/]\d{4}/g, ' ')
      .replace(/\b(выписка|statement|report|отчет|отчёт)\b/gi, ' ')
      .replace(/[-–—]{2,}/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned.length >= 3 ? cleaned.slice(0, 60) : (base.slice(0, 60) || 'Новый счёт');
  }

  function findBankName(rows, fileName) {
    const parts = [fileName || ''];
    const total = rows.length;
    rows.forEach((row, index) => {
      if (index < 40 || index >= total - 30) {
        row.forEach((cell) => {
          if (typeof cell === 'string' && cell.length < 180) parts.push(cell);
        });
      }
    });
    const haystack = parts.join(' ');
    for (const [pattern, name] of BANK_PATTERNS) {
      if (pattern.test(haystack)) return name;
    }
    return '';
  }

  /**
   * Ищет номер счёта в метаданных над таблицей операций.
   * @param {Array<Array<unknown>>} rows
   * @param {number} headerRowIndex
   * @returns {string}
   */
  function findMetadataAccount(rows, headerRowIndex) {
    const labels = ['номер счета', 'номер счёта', 'account number', 'iban', 'счет', 'счёт', 'account'];
    const limit = Math.max(0, headerRowIndex);

    for (const label of labels) {
      for (let rowIndex = 0; rowIndex < Math.min(limit, rows.length); rowIndex += 1) {
        const row = rows[rowIndex] || [];
        for (let col = 0; col < row.length; col += 1) {
          if (normalizeHeader(row[col]) !== normalizeHeader(label)) continue;
          for (let next = col + 1; next < Math.min(row.length, col + 5); next += 1) {
            const candidate = cleanText(row[next]);
            if (!candidate) continue;
            if (looksLikeAccountNumber(candidate) || /^[\wА-Яа-яЁё .-]{4,60}$/.test(candidate)) {
              return candidate.replace(/\s+/g, '');
            }
          }
        }
      }
    }
    return '';
  }

  function normalizeMcc(value) {
    const raw = cleanText(value).replace(/\s/g, '');
    if (!/^\d{3,4}$/.test(raw)) return '';
    return raw.length === 3 ? `0${raw}` : raw;
  }

  function extractMcc(description, mccColumnValue) {
    const fromColumn = normalizeMcc(mccColumnValue);
    if (fromColumn) return fromColumn;
    const match = cleanText(description).match(/MCC[\s:№#-]*(\d{3,4})/i);
    return match ? normalizeMcc(match[1]) : '';
  }

  function normalizeBankCategory(value) {
    const raw = cleanText(value);
    if (!raw || GENERIC_CATEGORY_RE.test(raw)) return '';
    if (KNOWN_CATEGORIES.has(raw)) return raw;

    for (const [pattern, category] of CATEGORY_SYNONYMS) {
      if (pattern.test(raw)) return category;
    }
    return raw;
  }

  /**
   * Определяет итоговую категорию: сначала смысловые правила и мерчант,
   * затем MCC, затем категория банка.
   * @param {{bankCategory: string, description: string, amount: number, mcc: string}} tx
   * @returns {string}
   */
  function resolveCategory(tx) {
    const text = `${tx.description || ''} ${tx.bankCategory || ''}`.toLowerCase();
    const isIncome = tx.amount > 0;

    if (isIncome) {
      if (/возврат|refund|chargeback|reversal/.test(text)) return 'Возвраты';
      if (/внутрибанковск|между счетами|перевод (со|на|между) сч[её]т/.test(text)) return 'Переводы';
    }

    for (const [pattern, category] of DESCRIPTION_RULES) {
      if (pattern.test(text)) return category;
    }

    if (tx.mcc && MCC_CATEGORIES[tx.mcc]) return MCC_CATEGORIES[tx.mcc];

    const bankCategory = normalizeBankCategory(tx.bankCategory);
    if (bankCategory) return bankCategory;

    return isIncome ? 'Поступления' : 'Прочие расходы';
  }

  /**
   * Определяет перевод между собственными счетами клиента, который не является
   * расходом. Смотрим только явные формулировки, чтобы не отбросить переводы
   * другим людям.
   * @param {string} description
   * @param {string} bankCategory
   * @returns {boolean}
   */
  function isOwnAccountTransfer(description, bankCategory) {
    const text = cleanText(`${description || ''} ${bankCategory || ''}`).toLowerCase();
    const patterns = [
      /внутрибанковск[а-яё]*\s+перевод\s+(?:между\s+)?(?:моими\s+|своими\s+|собственными\s+)?счетами/,
      /внутрибанковск[а-яё]*\s+перевод\s+со\s+сч[её]та\s+на\s+сч[её]т/,
      /перевод\s+между\s+(?:моими\s+|своими\s+|собственными\s+)?счетами/,
      /перевод\s+со\s+(?:своего|собственного)\s+сч[её]та/,
      /перевод\s+на\s+(?:свой|собственный)\s+сч[её]т/,
      /перевод\s+с\s+одного\s+сч[её]та\s+на\s+другой/,
      /перевод\s+собственных\s+средств/,
      /между\s+(?:своими|собственными)\s+счетами/,
      /transfer\s+between\s+(?:my\s+|own\s+)?accounts/,
      /between\s+own\s+accounts/
    ];

    if (/перевод/i.test(bankCategory || '') && /между\s+счетами/.test(text)) {
      return true;
    }

    return patterns.some((pattern) => pattern.test(text));
  }

  function isLoanRepayment(description, bankCategory) {
    const text = cleanText(`${description || ''} ${bankCategory || ''}`).toLowerCase().replace(/ё/g, 'е');
    const patterns = [
      /погашение\s+од(?=$|[\s.,;:])/,
      /погашен[а-яё]*[^.\n]{0,50}(?:кредит|займ|ссуд|основн[а-яё]*\s+долг|процент)/,
      /(?:оплата|платеж|взнос)\s+(?:кредита|займа|по\s+кредиту|по\s+займу)/,
      /(?:досрочн[а-яё]*|частичн[а-яё]*)\s+погашен/,
      /кредитн[а-яё]*\s+платеж/,
      /аннуитетн[а-яё]*\s+платеж/,
      /процент[а-яё]*\s+по\s+(?:кредит|займ)/,
      /гашение\s+(?:кредита|займа|ссуды)/
    ];

    if (patterns.some((pattern) => pattern.test(text))) return true;

    return /кредит|займ|ссуд/i.test(bankCategory || '')
      && /погаш|платеж|оплат|взнос|процент/i.test(text);
  }

  function isExcludedPhoneTransfer(description) {
    const digits = cleanText(description).replace(/\D/g, '');
    return EXCLUDED_PHONE_DIGITS.some((phone) => digits.includes(phone));
  }

  function isExcludedPersonTransfer(description) {
    const text = cleanText(description).toLowerCase().replace(/ё/g, 'е');
    return EXCLUDED_PERSON_PATTERNS.some((pattern) => pattern.test(text));
  }

  /**
   * Возвращает причину исключения операции из анализа расходов.
   * @param {string} description
   * @param {string} bankCategory
   * @returns {'own-transfer'|'loan'|'phone'|'person'|''}
   */
  function detectExclusionReason(description, bankCategory) {
    const combined = cleanText(`${description || ''} ${bankCategory || ''}`);
    if (isOwnAccountTransfer(description, bankCategory)) return 'own-transfer';
    if (isLoanRepayment(description, bankCategory)) return 'loan';
    if (isExcludedPhoneTransfer(combined)) return 'phone';
    if (isExcludedPersonTransfer(combined)) return 'person';
    return '';
  }

  function getPreview(transactions) {
    return transactions.slice(0, PREVIEW_ROWS).map((tx) => ({
      date: tx.date,
      category: tx.category,
      description: tx.description,
      amount: tx.amount,
      type: tx.type
    }));
  }

  function failure(message, fileName, extras) {
    return Object.assign({
      transactions: [],
      detectedAccountName: fileNameToAccountName(fileName || ''),
      detectedAccountNumber: '',
      bankName: '',
      preview: [],
      errors: [message],
      warnings: [],
      meta: null
    }, extras || {});
  }

  function parseSheet(rows, sheetName, date1904, fileName) {
    const header = detectHeader(rows);
    if (!header) return null;

    const { columns, rowIndex: headerRowIndex } = header;
    const bankName = findBankName(rows, fileName);
    const metadataAccount = findMetadataAccount(rows, headerRowIndex);

    const columnAccountValues = new Set();
    if (columns.account !== -1) {
      for (let i = headerRowIndex + 1; i < rows.length; i += 1) {
        const value = cleanText((rows[i] || [])[columns.account]);
        if (value) columnAccountValues.add(value);
      }
    }

    const firstAccountValue = columnAccountValues.size ? Array.from(columnAccountValues)[0] : '';
    const accountNumber = firstAccountValue && looksLikeAccountNumber(firstAccountValue)
      ? firstAccountValue.replace(/\s/g, '')
      : (metadataAccount || '');

    let detectedAccountName;
    if (firstAccountValue && !looksLikeAccountNumber(firstAccountValue) && firstAccountValue.length <= 60) {
      detectedAccountName = firstAccountValue;
    } else if (accountNumber) {
      detectedAccountName = makeAccountName(bankName, accountNumber);
    } else {
      detectedAccountName = fileNameToAccountName(fileName);
    }

    const transactions = [];
    const warnings = [];
    let skippedRows = 0;

    for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
      const row = rows[index] || [];
      const rawDate = row[columns.date];
      const rawAmount = row[columns.amount];

      if (cleanText(rawDate) === '' && cleanText(rawAmount) === '') continue;

      const parsedDate = parseDateCell(rawDate, date1904);
      const amount = parseAmount(rawAmount);

      if (!parsedDate || !Number.isFinite(amount) || amount === 0) {
        // Строки подписи и колонтитулы не считаем «пропущенными операциями».
        if (parsedDate || Number.isFinite(amount)) skippedRows += 1;
        continue;
      }

      const bankCategory = columns.category !== -1 ? cleanText(row[columns.category]) : '';
      const description = columns.description !== -1
        ? cleanText(row[columns.description])
        : '';
      const status = columns.status !== -1 ? cleanText(row[columns.status]) : '';
      const rawMcc = columns.mcc !== -1 ? row[columns.mcc] : '';
      const mcc = extractMcc(`${description} ${bankCategory}`, rawMcc);

      const category = resolveCategory({
        bankCategory,
        description,
        amount,
        mcc
      });
      const exclusionReason = detectExclusionReason(description, bankCategory);

      transactions.push({
        date: parsedDate.iso,
        month: parsedDate.month,
        amount,
        category,
        bankCategory,
        description: description || 'Без описания',
        mcc,
        status,
        excludeReason: exclusionReason,
        isOwnTransfer: exclusionReason === 'own-transfer',
        type: amount > 0 ? 'income' : 'expense'
      });
    }

    if (columns.category === -1) {
      warnings.push('Колонка «Категория» не найдена — категории определены по описанию и MCC.');
    }
    if (columns.description === -1) {
      warnings.push('Колонка «Описание» не найдена — операции будут без описания.');
    }
    if (skippedRows > 0 && skippedRows < transactions.length + skippedRows) {
      warnings.push(`Пропущено строк без корректной даты или суммы: ${skippedRows}.`);
    }
    if (columnAccountValues.size > 1) {
      warnings.push('В файле найдено несколько счетов — для названия использован первый.');
    }

    if (!transactions.length) {
      return {
        transactions: [],
        detectedAccountName,
        detectedAccountNumber: accountNumber,
        bankName,
        preview: [],
        errors: [
          'В таблице не найдено ни одной операции с датой и суммой. Проверьте формат выгрузки.'
        ],
        warnings,
        meta: {
          sheetName,
          headerRow: headerRowIndex + 1,
          columns,
          totalRows: rows.length
        }
      };
    }

    return {
      transactions,
      detectedAccountName,
      detectedAccountNumber: accountNumber,
      bankName,
      preview: getPreview(transactions),
      errors: [],
      warnings,
      meta: {
        sheetName,
        headerRow: headerRowIndex + 1,
        columns,
        totalRows: rows.length,
        accountColumnFound: columns.account !== -1
      }
    };
  }

  /**
   * Читает Excel-буфер и нормализует операции.
   * @param {ArrayBuffer} buffer
   * @param {string} fileName
   * @returns {{
   *   transactions: ParsedTransaction[],
   *   detectedAccountName: string,
   *   detectedAccountNumber: string,
   *   bankName: string,
   *   preview: Array<Object>,
   *   errors: string[],
   *   warnings: string[],
   *   meta: Object|null
   * }}
   */
  function parseBuffer(buffer, fileName) {
    const safeName = fileName || 'Выписка.xlsx';

    if (!global.XLSX) {
      return failure('Библиотека для чтения Excel не загрузилась. Проверьте подключение к интернету и обновите страницу.', safeName);
    }
    if (!buffer || !buffer.byteLength) {
      return failure('Файл пустой или повреждён.', safeName);
    }

    let workbook;
    try {
      workbook = global.XLSX.read(buffer, { type: 'array', cellDates: true });
    } catch (error) {
      console.error('XLSX.read error:', error);
      return failure(`Не удалось прочитать Excel-файл: ${error.message || 'неизвестная ошибка'}.`, safeName);
    }

    if (!workbook.SheetNames || !workbook.SheetNames.length) {
      return failure('В файле нет ни одного листа.', safeName);
    }

    const date1904 = Boolean(workbook.Workbook && workbook.Workbook.WBProps && workbook.Workbook.WBProps.date1904);
    let fallbackError = null;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      let rows;
      try {
        rows = global.XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: true,
          defval: null,
          blankrows: true
        });
      } catch (error) {
        console.error('sheet_to_json error:', error);
        fallbackError = `Не удалось разобрать лист «${sheetName}»: ${error.message || 'ошибка чтения'}.`;
        continue;
      }

      if (!rows.length) continue;

      let result = null;
      try {
        result = parseSheet(rows, sheetName, date1904, safeName);
      } catch (error) {
        console.error('parseSheet error:', error);
        fallbackError = `Ошибка разбора листа «${sheetName}»: ${error.message || 'неизвестная ошибка'}.`;
        continue;
      }

      if (!result) continue;

      if (result.transactions.length) return result;
      if (!fallbackError) fallbackError = result.errors[0];
    }

    if (fallbackError) return failure(fallbackError, safeName);

    const sheetList = workbook.SheetNames.map((name) => `«${name}»`).join(', ');
    return failure(
      `Не удалось найти строку заголовков с колонками «Дата операции» и «Сумма». Проверены листы: ${sheetList}.`,
      safeName
    );
  }

  async function parseFile(file) {
    const buffer = await file.arrayBuffer();
    return parseBuffer(buffer, file.name);
  }

  app.excelParser = {
    parseBuffer,
    parseFile,
    parseAmount,
    parseDateCell,
    resolveCategory,
    detectHeader,
    normalizeHeader,
    normalizeMcc,
    makeAccountName,
    fileNameToAccountName,
    _internal: {
      findColumn,
      extractMcc,
      normalizeBankCategory,
      findBankName,
      findMetadataAccount,
      isOwnAccountTransfer,
      isLoanRepayment,
      isExcludedPhoneTransfer,
      isExcludedPersonTransfer,
      detectExclusionReason
    }
  };
})(window);
