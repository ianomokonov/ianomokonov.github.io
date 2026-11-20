// Каталог деталей. Формат — как у parts.json, но отдаётся глобалью,
// чтобы приложение открывалось и по file://, без локального сервера.
window.TIGUAN_DATA = {
  "vehicle": {
    "title": "Volkswagen Tiguan II",
    "vin": "XW8ZZZ5N*****1080",
    "meta": "2020 · 2.0 TSI 180 л.с. (CZPA) · Калуга",
    "disclaimer": "Номера собраны по открытым каталогам и не гарантированы: перед заказом сверяйте по VIN и PR-кодам."
  },
  "systems": [
    {
      "id": "engine",
      "title": "Двигатель и навесное"
    },
    {
      "id": "cooling",
      "title": "Охлаждение и кондиционер"
    },
    {
      "id": "brakes",
      "title": "Тормоза"
    },
    {
      "id": "suspension",
      "title": "Подвеска и рулевое"
    },
    {
      "id": "interior",
      "title": "Салон"
    },
    {
      "id": "body",
      "title": "Кузов и оптика"
    },
    {
      "id": "electrics",
      "title": "Электрика"
    },
    {
      "id": "transmission",
      "title": "КПП и приводы"
    }
  ],
  "diagrams": [
    {
      "id": "engine-bay",
      "title": "Моторный отсек",
      "subtitle": "Вид сверху, перед машины — внизу, как у открытого капота. Компоновка сверена по фото отсека 2.0 TSI: бачок ОЖ слева у передка, АКБ справа у щита.",
      "related": [
        {
          "id": "engine-drive",
          "title": "Ремень и навесное"
        }
      ]
    },
    {
      "id": "engine-drive",
      "title": "Приводной ремень и навесное",
      "subtitle": "Вид спереди на двигатель. Ремень огибает шкивы коленвала, генератора, компрессора и помпы.",
      "related": [
        {
          "id": "engine-bay",
          "title": "Моторный отсек"
        }
      ]
    },
    {
      "id": "brake-front",
      "title": "Тормоза и подвеска — передняя ось",
      "subtitle": "Колесо снято. Слева — привод и рычаг, справа — стойка МакФерсон.",
      "related": []
    },
    {
      "id": "interior",
      "title": "Салон и панель приборов",
      "subtitle": "Салонный фильтр живёт за перчаточным ящиком, OBD-разъём — под панелью слева.",
      "related": []
    },
    {
      "id": "body-front",
      "title": "Передок: бампер, оптика, радиатор",
      "subtitle": "Бампер показан условно (пунктир): чтобы добраться до радиатора, его снимают.",
      "related": []
    }
  ],
  "zones": [
    {
      "id": "hood",
      "title": "Моторный отсек",
      "diagram": "engine-bay",
      "marker": {
        "x": 62,
        "y": 30
      }
    },
    {
      "id": "fenderL",
      "title": "Арка: тормоза и подвеска",
      "diagram": "brake-front",
      "marker": {
        "x": 46,
        "y": 44
      }
    },
    {
      "id": "fenderR",
      "title": "Арка: тормоза и подвеска",
      "diagram": "brake-front",
      "marker": {
        "x": 46,
        "y": 44
      }
    },
    {
      "id": "wheelFL",
      "title": "Тормоза и подвеска",
      "diagram": "brake-front",
      "marker": {
        "x": 42,
        "y": 64
      }
    },
    {
      "id": "wheelFR",
      "title": "Тормоза и подвеска",
      "diagram": "brake-front",
      "marker": {
        "x": 42,
        "y": 64
      }
    },
    {
      "id": "wheelRL",
      "title": "Задняя ось",
      "system": "suspension",
      "marker": {
        "x": 152,
        "y": 64
      },
      "note": "Схемы задней оси в этой версии нет — открываю детали подвески и тормозов из каталога."
    },
    {
      "id": "wheelRR",
      "title": "Задняя ось",
      "system": "suspension",
      "marker": {
        "x": 152,
        "y": 64
      },
      "note": "Схемы задней оси в этой версии нет — открываю детали подвески и тормозов из каталога."
    },
    {
      "id": "doorFL",
      "title": "Салон и панель приборов",
      "diagram": "interior",
      "marker": {
        "x": 92,
        "y": 40
      }
    },
    {
      "id": "doorFR",
      "title": "Салон и панель приборов",
      "diagram": "interior",
      "marker": {
        "x": 92,
        "y": 40
      }
    },
    {
      "id": "doorRL",
      "title": "Салон и панель приборов",
      "diagram": "interior",
      "marker": {
        "x": 120,
        "y": 40
      }
    },
    {
      "id": "doorRR",
      "title": "Салон и панель приборов",
      "diagram": "interior",
      "marker": {
        "x": 120,
        "y": 40
      }
    },
    {
      "id": "bumperF",
      "title": "Передок: бампер, оптика, радиатор",
      "diagram": "body-front",
      "marker": {
        "x": 16,
        "y": 52
      }
    },
    {
      "id": "grille",
      "title": "Решётка и оптика",
      "diagram": "body-front",
      "marker": {
        "x": 14,
        "y": 42
      }
    },
    {
      "id": "headlightL",
      "title": "Фара левая",
      "part": "headlight-l",
      "marker": {
        "x": 20,
        "y": 38
      }
    },
    {
      "id": "headlightR",
      "title": "Фара правая",
      "part": "headlight-r",
      "marker": {
        "x": 20,
        "y": 38
      }
    },
    {
      "id": "tailgate",
      "title": "Крышка багажника",
      "system": "body",
      "marker": {
        "x": 184,
        "y": 42
      },
      "note": "Отдельной схемы задней части пока нет — открываю кузовные детали из каталога."
    },
    {
      "id": "mirrorL",
      "title": "Зеркала",
      "system": "body",
      "marker": {
        "x": 78,
        "y": 30
      },
      "note": "Детали зеркал пока в каталоге — схема двери появится позже."
    },
    {
      "id": "mirrorR",
      "title": "Зеркала",
      "system": "body",
      "marker": {
        "x": 78,
        "y": 30
      },
      "note": "Детали зеркал пока в каталоге — схема двери появится позже."
    },
    {
      "id": "sill",
      "title": "Порог и днище",
      "system": "suspension",
      "marker": {
        "x": 100,
        "y": 62
      },
      "note": "Схемы днища пока нет — открываю подвеску и тормоза из каталога."
    }
  ],
  "parts": [
    {
      "id": "air-filter",
      "name": "Воздушный фильтр",
      "oem": "5Q0 129 620 D",
      "system": "engine",
      "diagram": "engine-bay",
      "zone": "hood",
      "qty": 1,
      "confidence": "high",
      "location": "В пластиковом корпусе в передней части отсека, у фары. Крышка на шести винтах T20.",
      "note": "Меняется каждые 30–60 тыс. км. В корпус ставится снегозащитный предфильтр — часто его теряют.",
      "service": {
        "action": "замена",
        "everyKm": 30000
      }
    },
    {
      "id": "belt",
      "name": "Ремень навесного оборудования",
      "oem": "06L 260 849 E",
      "system": "engine",
      "diagram": "engine-bay",
      "zone": "hood",
      "qty": 1,
      "confidence": "low",
      "location": "Спереди двигателя, огибает шкивы генератора, компрессора кондиционера и помпы.",
      "note": "Менять вместе с натяжителем. Свист на холодную — повод проверить.",
      "service": {
        "action": "замена",
        "everyKm": 90000
      }
    },
    {
      "id": "boost-valve",
      "name": "Клапан управления турбиной",
      "oem": "06L 906 283 A",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "У турбины",
      "note": "Ошибки наддува, передув",
      "zone": "hood"
    },
    {
      "id": "cam-sensor",
      "name": "Датчик распредвала",
      "oem": "06L 907 601 B",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "На головке, у распредвала",
      "note": "Ошибки фаз и запуска",
      "zone": "hood"
    },
    {
      "id": "catalytic",
      "name": "Катализатор",
      "oem": "5Q0 254 200",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Под днищем, за двигателем",
      "note": "Ошибка эффективности — возможна замена",
      "zone": "sill"
    },
    {
      "id": "chain-guide",
      "name": "Успокоитель цепи",
      "oem": "06K 109 469 AN",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Под крышкой ГРМ",
      "note": "Пластик крошится — менять комплектом",
      "zone": "hood",
      "service": {
        "atKm": [
          180000
        ],
        "action": "замена"
      }
    },
    {
      "id": "chain-tensioner",
      "name": "Натяжитель цепи ГРМ",
      "oem": "06K 109 507 BF",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Под крышкой ГРМ",
      "note": "Меняется с цепью и успокоителями",
      "zone": "hood",
      "service": {
        "atKm": [
          180000
        ],
        "action": "замена"
      }
    },
    {
      "id": "charcoal-canister",
      "name": "Адсорбер",
      "oem": "5Q0 201 801",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Под задним крылом",
      "note": "Ошибки EVAP, запах бензина",
      "zone": "tailgate"
    },
    {
      "id": "coolant-temp-sensor",
      "name": "Датчик температуры ОЖ",
      "oem": "06A 919 501 A",
      "system": "engine",
      "qty": 1,
      "confidence": "medium",
      "location": "На фланце ОЖ",
      "note": "Влияет на смесь и вентилятор",
      "zone": "hood"
    },
    {
      "id": "crank-seal",
      "name": "Сальник коленвала передний",
      "oem": "06L 103 085 C",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Спереди двигателя",
      "note": "Течь масла на ремень — менять сразу",
      "zone": "hood"
    },
    {
      "id": "crank-sensor",
      "name": "Датчик коленвала",
      "oem": "06L 906 433 B",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Внизу, у шкива",
      "note": "Нет запуска — проверить первым",
      "zone": "hood"
    },
    {
      "id": "dipstick",
      "name": "Масляный щуп",
      "oem": "06L 115 611 B",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Спереди двигателя, жёлтая петля",
      "note": "Уровень проверять на ровной площадке",
      "diagram": "engine-bay",
      "zone": "hood"
    },
    {
      "id": "downpipe",
      "name": "Приёмная труба",
      "oem": "5Q0 253 091",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "От турбины вниз",
      "note": "Проверять на трещины и гофру",
      "zone": "sill"
    },
    {
      "id": "engine-mount-left",
      "name": "Опора двигателя левая",
      "oem": "5Q0 199 263 AN",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Слева, у лонжерона",
      "note": "Проверять вместе с правой",
      "zone": "hood",
      "service": {
        "everyKm": 150000,
        "action": "проверка"
      }
    },
    {
      "id": "engine-mount-right",
      "name": "Опора двигателя правая",
      "oem": "5Q0 199 262 BE",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Справа, у лонжерона",
      "note": "Вибрация на холостых — признак износа",
      "zone": "hood",
      "service": {
        "everyKm": 150000,
        "action": "проверка"
      }
    },
    {
      "id": "evap-valve",
      "name": "Клапан адсорбера",
      "oem": "06L 906 517 A",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "В моторном отсеке",
      "note": "Ошибка по утечке паров топлива",
      "zone": "hood"
    },
    {
      "id": "fuel-filter",
      "name": "Топливный фильтр",
      "oem": "5Q0 201 511",
      "system": "engine",
      "qty": 1,
      "confidence": "medium",
      "location": "В баке, с насосом или отдельно",
      "note": "Меняется с топливным насосом",
      "zone": "tailgate",
      "service": {
        "everyKm": 60000,
        "action": "замена"
      }
    },
    {
      "id": "fuel-pump",
      "name": "Топливный насос",
      "oem": "5Q0 919 051",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "В баке, под задним сиденьем",
      "note": "Гул и провалы — проверить давление",
      "zone": "tailgate"
    },
    {
      "id": "gpf",
      "name": "Сажевый фильтр (GPF)",
      "oem": "5Q0 254 500",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "В выпуске, после катализатора",
      "note": "Прожиг — по диагностике, не глушить в пробке",
      "zone": "sill"
    },
    {
      "id": "head-gasket",
      "name": "Прокладка ГБЦ",
      "oem": "06L 103 383 E",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Между блоком и головкой",
      "note": "Признак — эмульсия и белый дым",
      "zone": "hood"
    },
    {
      "id": "hpfp",
      "name": "ТНВД",
      "oem": "06L 127 025 K",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Сверху двигателя, у ГБЦ",
      "note": "Давление проверять по диагностике",
      "zone": "hood"
    },
    {
      "id": "idler",
      "name": "Обводной ролик",
      "oem": "06L 903 341",
      "system": "engine",
      "diagram": "engine-drive",
      "zone": "hood",
      "qty": 1,
      "confidence": "low",
      "location": "Между генератором и шкивом коленвала.",
      "note": "Люфт или шум подшипника — замена."
    },
    {
      "id": "ignition-coil",
      "name": "Катушка зажигания",
      "oem": "06L 905 110 D",
      "system": "engine",
      "diagram": "engine-bay",
      "zone": "hood",
      "qty": 4,
      "confidence": "medium",
      "location": "Сверху двигателя, по одной на цилиндр, под декоративным кожухом.",
      "note": "При пробое — троение и ошибка по конкретному цилиндру."
    },
    {
      "id": "injector",
      "name": "Топливная форсунка",
      "oem": "06L 906 036 F",
      "system": "engine",
      "qty": 4,
      "confidence": "low",
      "location": "Во впускном коллекторе, 4 шт.",
      "note": "Проверка на стенде, уплотнения менять",
      "zone": "hood"
    },
    {
      "id": "intake-hose",
      "name": "Патрубок впуска",
      "oem": "5Q0 129 654 A",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "От фильтра к турбине",
      "note": "Трещины — подсос воздуха",
      "zone": "hood"
    },
    {
      "id": "intake-manifold",
      "name": "Впускной коллектор",
      "oem": "06L 133 201 AE",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Спереди двигателя",
      "note": "Снимать при чистке клапанов",
      "zone": "hood"
    },
    {
      "id": "intercooler",
      "name": "Интеркулер",
      "oem": "5Q0 145 805 F",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Перед радиатором",
      "note": "Пробитый интеркулер — потеря тяги",
      "zone": "hood"
    },
    {
      "id": "intercooler-hose",
      "name": "Патрубок интеркулера",
      "oem": "5Q0 145 834 A",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "От турбины к интеркулеру",
      "note": "Трещины — подсос и ошибки наддува",
      "zone": "hood"
    },
    {
      "id": "lambda-front",
      "name": "Лямбда-зонд передний",
      "oem": "06L 906 262",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "На приёмной трубе",
      "note": "Влияет на смесь и расход",
      "zone": "hood",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "lambda-rear",
      "name": "Лямбда-зонд задний",
      "oem": "06L 906 262 B",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "После катализатора",
      "note": "Контроль катализатора",
      "zone": "hood",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "maf",
      "name": "Расходомер воздуха (ДМРВ)",
      "oem": "06L 906 461 B",
      "system": "engine",
      "diagram": "engine-bay",
      "zone": "hood",
      "qty": 1,
      "confidence": "low",
      "location": "В патрубке сразу после корпуса воздушного фильтра.",
      "note": "Не мыть. При ошибке P0101 сначала проверить герметичность впуска."
    },
    {
      "id": "muffler",
      "name": "Глушитель задний",
      "oem": "5Q0 253 609",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Сзади, под бампером",
      "note": "Прогар и гул — замена",
      "zone": "tailgate"
    },
    {
      "id": "oil-cap",
      "name": "Крышка маслозаливной горловины",
      "oem": "06L 103 485 A",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Сверху клапанной крышки",
      "note": "Уплотнительное кольцо — менять с маслом",
      "diagram": "engine-bay",
      "zone": "hood"
    },
    {
      "id": "oil-filter",
      "name": "Масляный фильтр (элемент)",
      "oem": "06L 115 562 B",
      "system": "engine",
      "diagram": "engine-bay",
      "zone": "hood",
      "qty": 1,
      "confidence": "high",
      "location": "Сверху двигателя, в корпусе под пластиковой крышкой, рядом со щупом.",
      "note": "Меняется с маслом: 5,7 л 5W-30 с допуском VW 504 00 / 507 00. Крышка затягивается 25 Н·м.",
      "service": {
        "action": "замена",
        "everyKm": 15000
      },
      "fluid": "engine-oil"
    },
    {
      "id": "oil-level-sensor",
      "name": "Датчик уровня масла",
      "oem": "06L 907 660 B",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "В поддоне",
      "note": "Ошибка уровня — проверить проводку",
      "zone": "hood"
    },
    {
      "id": "oil-pan",
      "name": "Масляный поддон",
      "oem": "06L 103 601 D",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Снизу двигателя",
      "note": "Проверять на вмятины и течь",
      "zone": "hood"
    },
    {
      "id": "oil-pressure-sensor",
      "name": "Датчик давления масла",
      "oem": "06L 919 081 C",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "На корпусе масляного фильтра",
      "note": "Ошибка по давлению — проверить датчик и насос",
      "zone": "hood"
    },
    {
      "id": "pcv-valve",
      "name": "Маслоотделитель (PCV)",
      "oem": "06L 103 495 E",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Сверху двигателя, на клапанной крышке",
      "note": "При неисправности растёт расход масла",
      "zone": "hood",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      },
      "fluid": "engine-oil"
    },
    {
      "id": "spark-plug",
      "name": "Свеча зажигания",
      "oem": "06K 905 601 B",
      "system": "engine",
      "diagram": "engine-bay",
      "zone": "hood",
      "qty": 4,
      "confidence": "medium",
      "location": "Четыре штуки по центру двигателя, под катушками зажигания.",
      "note": "Менять комплектом, момент 23 Н·м. Регламент — каждые 60 тыс. км.",
      "service": {
        "action": "замена",
        "everyKm": 60000
      }
    },
    {
      "id": "tensioner",
      "name": "Натяжитель ремня",
      "oem": "06L 903 133",
      "system": "engine",
      "diagram": "engine-drive",
      "zone": "hood",
      "qty": 1,
      "confidence": "low",
      "location": "Справа от шкива коленвала, под ремнём.",
      "note": "Автоматический, меняется в сборе с роликом.",
      "service": {
        "action": "проверка",
        "everyKm": 120000
      }
    },
    {
      "id": "thermostat",
      "name": "Термостат",
      "oem": "06L 121 111 G",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Спереди двигателя, в корпусе помпы",
      "note": "Не греется или перегревается",
      "diagram": "engine-bay",
      "zone": "hood",
      "service": {
        "everyKm": 120000,
        "action": "замена"
      },
      "fluid": "coolant"
    },
    {
      "id": "throttle",
      "name": "Дроссельная заслонка",
      "oem": "06L 133 062",
      "system": "engine",
      "diagram": "engine-bay",
      "zone": "hood",
      "qty": 1,
      "confidence": "medium",
      "location": "Спереди двигателя, между интеркулером и впускным коллектором.",
      "note": "После замены нужна адаптация через диагностику."
    },
    {
      "id": "timing-chain",
      "name": "Цепь ГРМ",
      "oem": "06K 109 158 AD",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Спереди двигателя, под крышкой ГРМ",
      "note": "Растяжение — шум на холодную и ошибки фаз",
      "zone": "hood",
      "service": {
        "atKm": [
          180000
        ],
        "action": "замена"
      },
      "fluid": "engine-oil"
    },
    {
      "id": "trans-mount",
      "name": "Опора КПП",
      "oem": "5Q0 199 555 B",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Под КПП, на подрамнике",
      "note": "Толчки при переключении — проверить",
      "zone": "hood",
      "service": {
        "everyKm": 150000,
        "action": "проверка"
      }
    },
    {
      "id": "turbo",
      "name": "Турбокомпрессор",
      "oem": "06L 145 654 F",
      "system": "engine",
      "diagram": "engine-bay",
      "zone": "hood",
      "qty": 1,
      "confidence": "low",
      "location": "За двигателем, у моторного щита. Сверху доступен после снятия кожуха и патрубков.",
      "note": "Проверять люфт вала и состояние маслоподачи — частая причина ошибок наддува."
    },
    {
      "id": "vacuum-pump",
      "name": "Вакуумный насос",
      "oem": "06L 145 100 E",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Сзади двигателя",
      "note": "Шум и жёсткий тормоз — признак износа",
      "zone": "hood"
    },
    {
      "id": "valve-cover",
      "name": "Клапанная крышка",
      "oem": "06L 103 469 K",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Сверху двигателя",
      "note": "Часто меняется вместе с прокладкой",
      "zone": "hood"
    },
    {
      "id": "valve-cover-gasket",
      "name": "Прокладка клапанной крышки",
      "oem": "06L 103 483 C",
      "system": "engine",
      "qty": 1,
      "confidence": "low",
      "location": "Под клапанной крышкой",
      "note": "Течь масла на выпуск — запах гари",
      "zone": "hood"
    },
    {
      "id": "condenser",
      "name": "Конденсор кондиционера",
      "oem": "5Q0 816 411",
      "system": "cooling",
      "diagram": "body-front",
      "zone": "bumperF",
      "qty": 1,
      "confidence": "medium",
      "location": "Перед радиатором, ближе к бамперу.",
      "note": "Меняется вместе с осушителем, система заправляется заново."
    },
    {
      "id": "coolant-tank",
      "name": "Расширительный бачок ОЖ",
      "oem": "5Q0 121 407 C",
      "system": "cooling",
      "diagram": "engine-bay",
      "zone": "hood",
      "qty": 1,
      "confidence": "medium",
      "location": "Справа в передней части отсека, полупрозрачный, с чёрной крышкой.",
      "note": "Уровень на холодном двигателе — между MIN и MAX."
    },
    {
      "id": "expansion-cap",
      "name": "Крышка бачка ОЖ",
      "oem": "3C0 121 321",
      "system": "cooling",
      "qty": 1,
      "confidence": "medium",
      "location": "На расширительном бачке",
      "note": "Держит давление, менять при подтёках",
      "zone": "hood",
      "service": {
        "everyKm": 60000,
        "action": "проверка"
      }
    },
    {
      "id": "heater-core",
      "name": "Радиатор печки",
      "oem": "5Q0 819 031",
      "system": "cooling",
      "qty": 1,
      "confidence": "low",
      "location": "В салоне, под панелью",
      "note": "Печка не греет — часто забит радиатор",
      "zone": "doorFL",
      "fluid": "coolant"
    },
    {
      "id": "radiator",
      "name": "Радиатор охлаждения",
      "oem": "5Q0 121 251",
      "system": "cooling",
      "diagram": "body-front",
      "zone": "bumperF",
      "qty": 1,
      "confidence": "medium",
      "location": "За бампером и решёткой, перед вентилятором.",
      "note": "При замене — новый антифриз G13 и проверка герметичности."
    },
    {
      "id": "radiator-fan",
      "name": "Вентилятор радиатора",
      "oem": "5Q0 959 455 F",
      "system": "cooling",
      "qty": 1,
      "confidence": "medium",
      "location": "За радиатором",
      "note": "Проверять включение на прогреве",
      "zone": "bumperF",
      "service": {
        "everyKm": 150000,
        "action": "проверка"
      }
    },
    {
      "id": "radiator-hose-lower",
      "name": "Патрубок радиатора нижний",
      "oem": "5Q0 121 051",
      "system": "cooling",
      "qty": 1,
      "confidence": "low",
      "location": "Снизу радиатора",
      "note": "Менять вместе с хомутами",
      "zone": "hood",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      },
      "fluid": "coolant"
    },
    {
      "id": "radiator-hose-upper",
      "name": "Патрубок радиатора верхний",
      "oem": "5Q0 121 101",
      "system": "cooling",
      "qty": 1,
      "confidence": "low",
      "location": "Сверху радиатора",
      "note": "Трещины по хомутам",
      "zone": "hood",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      },
      "fluid": "coolant"
    },
    {
      "id": "water-pump",
      "name": "Насос охлаждающей жидкости",
      "oem": "06L 121 011",
      "system": "cooling",
      "diagram": "engine-drive",
      "zone": "hood",
      "qty": 1,
      "confidence": "low",
      "location": "Спереди двигателя, под впускным коллектором.",
      "note": "На EA888 частая течь; менять вместе с прокладкой.",
      "service": {
        "action": "замена",
        "everyKm": 120000
      },
      "fluid": "coolant"
    },
    {
      "id": "abs-sensor",
      "name": "Датчик ABS передний",
      "oem": "5Q0 927 803",
      "system": "brakes",
      "diagram": "brake-front",
      "zone": "wheelFL",
      "qty": 2,
      "confidence": "medium",
      "location": "В ступице, провод идёт по рычагу.",
      "note": "Ошибка ABS/ESP часто из-за грязного разъёма, а не самого датчика."
    },
    {
      "id": "abs-unit",
      "name": "Блок ABS",
      "oem": "5Q0 614 517",
      "system": "brakes",
      "qty": 1,
      "confidence": "low",
      "location": "В моторном отсеке, у бачка ТЖ",
      "note": "Требует кодирования после замены",
      "zone": "hood"
    },
    {
      "id": "brake-booster",
      "name": "Вакуумный усилитель тормозов",
      "oem": "5Q1 612 105 C",
      "system": "brakes",
      "qty": 1,
      "confidence": "low",
      "location": "У моторного щита, под ГТЦ",
      "note": "Шипение при торможении — повод проверить",
      "zone": "hood"
    },
    {
      "id": "brake-hose",
      "name": "Тормозной шланг",
      "oem": "5Q0 611 701",
      "system": "brakes",
      "diagram": "brake-front",
      "zone": "wheelFL",
      "qty": 2,
      "confidence": "medium",
      "location": "От суппорта к трубке на кузове, через кронштейн стойки.",
      "note": "Трещины или вздутия — замена немедленно.",
      "service": {
        "action": "проверка",
        "everyKm": 120000
      },
      "fluid": "brake-fluid"
    },
    {
      "id": "brake-hose-rear",
      "name": "Тормозной шланг задний",
      "oem": "5Q0 611 775",
      "system": "brakes",
      "qty": 1,
      "confidence": "low",
      "location": "От суппорта к трубке на кузове",
      "note": "Трещины — немедленная замена",
      "zone": "wheelRL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      },
      "fluid": "brake-fluid"
    },
    {
      "id": "caliper-front",
      "name": "Суппорт передний левый",
      "oem": "5Q0 615 123",
      "system": "brakes",
      "diagram": "brake-front",
      "zone": "wheelFL",
      "qty": 1,
      "confidence": "low",
      "location": "На поворотном кулаке, слева по ходу движения.",
      "note": "Правый отличается номером — уточняйте по VIN."
    },
    {
      "id": "caliper-rear",
      "name": "Суппорт задний левый",
      "oem": "5Q0 615 423 A",
      "system": "brakes",
      "qty": 1,
      "confidence": "low",
      "location": "На поворотном кулаке сзади",
      "note": "Правый — другой номер",
      "zone": "wheelRL"
    },
    {
      "id": "disc-front",
      "name": "Тормозной диск передний",
      "oem": "5Q0 615 301 F",
      "system": "brakes",
      "diagram": "brake-front",
      "zone": "wheelFL",
      "qty": 2,
      "confidence": "medium",
      "location": "312×25 мм, вентилируемый, на ступице.",
      "note": "Минимальная толщина 22 мм. Менять парой.",
      "service": {
        "action": "проверка",
        "everyKm": 60000
      },
      "fluid": "brake-fluid"
    },
    {
      "id": "disc-rear",
      "name": "Тормозной диск задний",
      "oem": "5Q0 615 601 F",
      "system": "brakes",
      "qty": 1,
      "confidence": "medium",
      "location": "300×12 мм, на ступице",
      "note": "Минимальная толщина 10 мм",
      "zone": "wheelRL",
      "service": {
        "everyKm": 60000,
        "action": "проверка"
      },
      "fluid": "brake-fluid"
    },
    {
      "id": "epb-motor",
      "name": "Мотор стояночного тормоза",
      "oem": "5Q0 998 281 A",
      "system": "brakes",
      "qty": 1,
      "confidence": "low",
      "location": "На заднем суппорте",
      "note": "После замены — адаптация через диагностику",
      "zone": "wheelRL"
    },
    {
      "id": "master-cylinder",
      "name": "Главный тормозной цилиндр",
      "oem": "5Q1 614 019 B",
      "system": "brakes",
      "qty": 1,
      "confidence": "low",
      "location": "На вакуумном усилителе, у моторного щита",
      "note": "При замене — прокачка системы",
      "zone": "hood",
      "fluid": "brake-fluid"
    },
    {
      "id": "pads-front",
      "name": "Тормозные колодки передние",
      "oem": "5Q0 698 151 K",
      "system": "brakes",
      "diagram": "brake-front",
      "zone": "wheelFL",
      "qty": 4,
      "confidence": "medium",
      "location": "В суппорте переднего колеса, датчик износа — на левом колесе.",
      "note": "Менять комплектом на ось. Диск 312 мм.",
      "service": {
        "action": "проверка",
        "everyKm": 30000
      },
      "fluid": "brake-fluid"
    },
    {
      "id": "pads-rear",
      "name": "Тормозные колодки задние",
      "oem": "5Q0 698 451 F",
      "system": "brakes",
      "qty": 1,
      "confidence": "medium",
      "location": "В суппорте заднего колеса",
      "note": "Менять комплектом на ось, диск 300 мм",
      "zone": "wheelRL",
      "service": {
        "everyKm": 30000,
        "action": "проверка"
      },
      "fluid": "brake-fluid"
    },
    {
      "id": "wear-sensor",
      "name": "Датчик износа колодок",
      "oem": "5Q0 907 637",
      "system": "brakes",
      "qty": 1,
      "confidence": "low",
      "location": "На левом переднем суппорте",
      "note": "Один на ось",
      "zone": "wheelFL",
      "service": {
        "everyKm": 30000,
        "action": "проверка"
      }
    },
    {
      "id": "arm-bushing",
      "name": "Сайлентблок переднего рычага",
      "oem": "5Q0 407 183",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "В рычаге, две точки",
      "note": "Трещины и отслоение — замена",
      "zone": "wheelFL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "ball-joint",
      "name": "Шаровая опора",
      "oem": "5Q0 407 365",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "В поворотном кулаке",
      "note": "Люфт — замена рычага или опоры",
      "zone": "wheelFL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "bump-stop",
      "name": "Отбойник с пыльником",
      "oem": "5Q0 413 175",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "На штоке амортизатора",
      "note": "Разрушенный отбойник убивает стойку",
      "zone": "wheelFL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "control-arm",
      "name": "Рычаг передней подвески",
      "oem": "5Q0 407 151",
      "system": "suspension",
      "diagram": "brake-front",
      "zone": "wheelFL",
      "qty": 2,
      "confidence": "medium",
      "location": "Нижний рычаг с шаровой опорой, сайлентблоки в двух точках.",
      "note": "Проверять люфт шаровой и трещины сайлентблоков.",
      "service": {
        "action": "проверка",
        "everyKm": 120000
      }
    },
    {
      "id": "hub-rear",
      "name": "Ступица задняя",
      "oem": "5Q0 598 625",
      "system": "suspension",
      "qty": 1,
      "confidence": "medium",
      "location": "В заднем кулаке, в сборе",
      "note": "Гул на скорости — признак износа",
      "zone": "wheelRL",
      "service": {
        "everyKm": 150000,
        "action": "проверка"
      }
    },
    {
      "id": "rear-arm",
      "name": "Задний рычаг",
      "oem": "5Q0 505 311",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "Многорычажная подвеска сзади",
      "note": "Проверять сайлентблоки",
      "zone": "wheelRL"
    },
    {
      "id": "shock-rear",
      "name": "Амортизатор задний",
      "oem": "5QF 513 029",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "Сзади, за колесом",
      "note": "Менять парой",
      "zone": "wheelRL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "spring-front",
      "name": "Пружина передняя",
      "oem": "5Q0 411 105",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "На передней стойке",
      "note": "Менять парой, по цветовой маркировке",
      "zone": "wheelFL"
    },
    {
      "id": "spring-rear",
      "name": "Пружина задняя",
      "oem": "5Q0 511 115",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "На задней стойке",
      "note": "Менять парой, следить за просадкой",
      "zone": "wheelRL"
    },
    {
      "id": "stab-bushing-front",
      "name": "Втулка стабилизатора передняя",
      "oem": "5Q0 411 313",
      "system": "suspension",
      "qty": 1,
      "confidence": "medium",
      "location": "На стабилизаторе, под подрамником",
      "note": "Скрип и стук на мелких неровностях",
      "zone": "wheelFL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "stab-bushing-rear",
      "name": "Втулка стабилизатора задняя",
      "oem": "5Q0 511 413",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "На заднем стабилизаторе",
      "note": "Менять с хомутами",
      "zone": "wheelRL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "stab-link",
      "name": "Стойка стабилизатора",
      "oem": "5Q0 411 315",
      "system": "suspension",
      "diagram": "brake-front",
      "zone": "wheelFL",
      "qty": 2,
      "confidence": "high",
      "location": "Вертикальная тяга от амортизатора к стабилизатору.",
      "note": "Стук на мелких неровностях — типичный симптом.",
      "service": {
        "action": "проверка",
        "everyKm": 120000
      }
    },
    {
      "id": "stab-link-rear",
      "name": "Стойка стабилизатора задняя",
      "oem": "5Q0 511 315",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "От рычага к стабилизатору",
      "note": "Менять парой",
      "zone": "wheelRL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "steering-rack",
      "name": "Рулевая рейка",
      "oem": "5Q0 909 144 M",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "За подрамником, по центру",
      "note": "Электроусилитель, ошибки — по диагностике",
      "zone": "sill"
    },
    {
      "id": "strut-front",
      "name": "Амортизатор передний",
      "oem": "5QF 413 031",
      "system": "suspension",
      "diagram": "brake-front",
      "zone": "wheelFL",
      "qty": 2,
      "confidence": "low",
      "location": "Стойка МакФерсон: амортизатор с пружиной и опорным подшипником.",
      "note": "Менять парой; после замены — развал-схождение.",
      "service": {
        "action": "проверка",
        "everyKm": 120000
      }
    },
    {
      "id": "strut-mount",
      "name": "Опорный подшипник стойки",
      "oem": "5Q0 412 331 B",
      "system": "suspension",
      "qty": 1,
      "confidence": "medium",
      "location": "Сверху стойки, под капотом",
      "note": "Стук при повороте руля — типичный симптом",
      "zone": "wheelFL",
      "service": {
        "everyKm": 120000,
        "action": "замена"
      }
    },
    {
      "id": "subframe-bushing",
      "name": "Сайлентблок подрамника",
      "oem": "5Q0 199 231",
      "system": "suspension",
      "qty": 1,
      "confidence": "low",
      "location": "Под подрамником",
      "note": "Проверять при стуках на неровностях",
      "zone": "sill"
    },
    {
      "id": "tie-rod",
      "name": "Рулевая тяга",
      "oem": "5Q0 423 810",
      "system": "suspension",
      "qty": 1,
      "confidence": "medium",
      "location": "От рейки к наконечнику",
      "note": "Проверять пыльник и люфт",
      "zone": "wheelFL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "tie-rod-end",
      "name": "Наконечник рулевой тяги",
      "oem": "5Q0 423 811",
      "system": "suspension",
      "qty": 1,
      "confidence": "medium",
      "location": "Перед колесом, на тяге",
      "note": "После замены — развал-схождение",
      "zone": "wheelFL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "wheel-bearing",
      "name": "Подшипник ступицы передний",
      "oem": "5Q0 407 621",
      "system": "suspension",
      "diagram": "brake-front",
      "zone": "wheelFL",
      "qty": 2,
      "confidence": "medium",
      "location": "В поворотном кулаке, в сборе со ступицей.",
      "note": "Гул, растущий со скоростью, — признак износа.",
      "service": {
        "action": "проверка",
        "everyKm": 150000
      }
    },
    {
      "id": "wheel-bolt",
      "name": "Болт колеса",
      "oem": "WHT 002 437",
      "system": "suspension",
      "qty": 20,
      "confidence": "medium",
      "location": "Крепление колеса, 5 шт.",
      "note": "Момент 140 Н·м, тянуть крестом",
      "zone": "wheelFL"
    },
    {
      "id": "cabin-blower",
      "name": "Моторчик печки",
      "oem": "5Q0 819 021",
      "system": "interior",
      "qty": 1,
      "confidence": "medium",
      "location": "Под панелью, за бардачком",
      "note": "Свист — смазка или замена",
      "zone": "doorFL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "cabin-filter",
      "name": "Салонный фильтр",
      "oem": "5Q0 819 644 B",
      "system": "interior",
      "diagram": "interior",
      "zone": "doorFL",
      "qty": 1,
      "confidence": "high",
      "location": "За перчаточным ящиком. Ящик снимается без инструмента.",
      "note": "Угольный. Менять раз в 15–30 тыс. км.",
      "service": {
        "action": "замена",
        "everyKm": 15000
      }
    },
    {
      "id": "dome-light",
      "name": "Плафон освещения салона",
      "oem": "5G0 947 105",
      "system": "interior",
      "diagram": "interior",
      "zone": "doorFL",
      "qty": 1,
      "confidence": "medium",
      "location": "По центру потолка.",
      "note": "Снимается пластиковой лопаткой, крепления на клипсах."
    },
    {
      "id": "rearview-mirror",
      "name": "Салонное зеркало",
      "oem": "3G0 857 511",
      "system": "interior",
      "diagram": "interior",
      "zone": "doorFL",
      "qty": 1,
      "confidence": "medium",
      "location": "На кронштейне у верхней кромки лобового стекла.",
      "note": "С автозатемнением и без — разные номера."
    },
    {
      "id": "bumper-front",
      "name": "Бампер передний",
      "oem": "5NB 807 221",
      "system": "body",
      "diagram": "body-front",
      "zone": "bumperF",
      "qty": 1,
      "confidence": "low",
      "location": "Крепится к лонжеронам: клипсы по периметру и винты в арках.",
      "note": "Идёт под покраску, датчики парковки переносятся со старого."
    },
    {
      "id": "bumper-rear",
      "name": "Бампер задний",
      "oem": "5NB 807 421",
      "system": "body",
      "qty": 1,
      "confidence": "low",
      "location": "Сзади, на лонжеронах",
      "note": "Под покраску, парктроники переносятся",
      "zone": "tailgate"
    },
    {
      "id": "door-lock",
      "name": "Замок двери",
      "oem": "5Q0 839 016",
      "system": "body",
      "qty": 1,
      "confidence": "low",
      "location": "В двери, за обшивкой",
      "note": "Не открывается — проверить тяги",
      "zone": "doorFL"
    },
    {
      "id": "fog-light",
      "name": "Противотуманная фара",
      "oem": "5NB 941 699",
      "system": "body",
      "diagram": "body-front",
      "zone": "bumperF",
      "qty": 2,
      "confidence": "low",
      "location": "В нижней решётке бампера.",
      "note": "Часто продаётся в сборе с кронштейном."
    },
    {
      "id": "grille",
      "name": "Решётка радиатора",
      "oem": "5NB 853 651",
      "system": "body",
      "diagram": "body-front",
      "zone": "grille",
      "qty": 1,
      "confidence": "low",
      "location": "Между фарами, сверху клипсы, снизу винты.",
      "note": "Хром, R-Line и обычная — разные номера."
    },
    {
      "id": "headlight-l",
      "name": "Фара левая",
      "oem": "5NB 941 005",
      "system": "body",
      "diagram": "body-front",
      "zone": "headlightL",
      "qty": 1,
      "confidence": "low",
      "location": "Левая по ходу движения, крепится к рамке телевизора.",
      "note": "LED и галоген — разные номера. Сверять по VIN обязательно."
    },
    {
      "id": "headlight-r",
      "name": "Фара правая",
      "oem": "5NB 941 006",
      "system": "body",
      "diagram": "body-front",
      "zone": "headlightR",
      "qty": 1,
      "confidence": "low",
      "location": "Правая по ходу движения.",
      "note": "LED и галоген — разные номера. Сверять по VIN обязательно."
    },
    {
      "id": "hood-strut",
      "name": "Газовый упор капота",
      "oem": "5Q0 823 359",
      "system": "body",
      "qty": 1,
      "confidence": "low",
      "location": "Под капотом, по бокам",
      "note": "Капот не держится — замена пары",
      "zone": "hood"
    },
    {
      "id": "inner-fender",
      "name": "Подкрылок передний",
      "oem": "5NB 810 971",
      "system": "body",
      "qty": 1,
      "confidence": "low",
      "location": "В арке колеса",
      "note": "Крепится клипсами",
      "zone": "wheelFL"
    },
    {
      "id": "mirror-glass",
      "name": "Зеркальный элемент левый",
      "oem": "5NB 857 521",
      "system": "body",
      "qty": 1,
      "confidence": "low",
      "location": "В корпусе зеркала",
      "note": "С подогревом и без — разные номера",
      "zone": "mirrorL"
    },
    {
      "id": "taillight-l",
      "name": "Фонарь задний левый",
      "oem": "5NB 945 095",
      "system": "body",
      "qty": 1,
      "confidence": "low",
      "location": "Сзади, на крыле",
      "note": "LED и галоген — разные",
      "zone": "tailgate"
    },
    {
      "id": "window-regulator",
      "name": "Стеклоподъёмник",
      "oem": "5Q0 837 461",
      "system": "body",
      "qty": 1,
      "confidence": "low",
      "location": "В двери, за обшивкой",
      "note": "Стекло падает — сломан тросик",
      "zone": "doorFL"
    },
    {
      "id": "wipers",
      "name": "Щётки стеклоочистителя",
      "oem": "5NB 998 002",
      "system": "body",
      "qty": 1,
      "confidence": "low",
      "location": "На лобовом стекле, комплект",
      "note": "Менять раз в год, перед зимой",
      "zone": "hood",
      "service": {
        "everyKm": 30000,
        "action": "замена"
      }
    },
    {
      "id": "ac-compressor",
      "name": "Компрессор кондиционера",
      "oem": "5Q0 820 803",
      "system": "electrics",
      "diagram": "engine-drive",
      "zone": "hood",
      "qty": 1,
      "confidence": "low",
      "location": "Слева внизу, у лонжерона.",
      "note": "При замене — новый осушитель и заправка системы."
    },
    {
      "id": "alternator",
      "name": "Генератор",
      "oem": "06L 903 023",
      "system": "electrics",
      "diagram": "engine-drive",
      "zone": "hood",
      "qty": 1,
      "confidence": "low",
      "location": "Сверху справа, приводится ремнём навесного оборудования.",
      "note": "При недозаряде проверять ремень, диодный мост и регулятор."
    },
    {
      "id": "battery",
      "name": "Аккумулятор",
      "oem": "000 915 105 DE",
      "system": "electrics",
      "diagram": "engine-bay",
      "zone": "hood",
      "qty": 1,
      "confidence": "medium",
      "location": "Справа, в пластиковом коробе под крышкой.",
      "note": "70 А·ч. После замены — адаптация через VCDS, иначе будет недозаряд."
    },
    {
      "id": "fuse-box",
      "name": "Блок предохранителей",
      "oem": "5Q0 937 529",
      "system": "electrics",
      "qty": 1,
      "confidence": "low",
      "location": "Под панелью слева",
      "note": "Схема предохранителей — в инструкции",
      "zone": "doorFL"
    },
    {
      "id": "horn",
      "name": "Звуковой сигнал",
      "oem": "5Q0 951 221",
      "system": "electrics",
      "qty": 1,
      "confidence": "low",
      "location": "За бампером, спереди",
      "note": "Хрипит — заменить",
      "zone": "bumperF"
    },
    {
      "id": "light-switch",
      "name": "Переключатель света",
      "oem": "5Q0 941 431",
      "system": "electrics",
      "qty": 1,
      "confidence": "low",
      "location": "Слева под рулём",
      "note": "Глючит — менять блок",
      "zone": "doorFL"
    },
    {
      "id": "obd-port",
      "name": "Разъём OBD-II",
      "oem": "3C0 973 737",
      "system": "electrics",
      "diagram": "interior",
      "zone": "doorFL",
      "qty": 1,
      "confidence": "medium",
      "location": "Под панелью слева, у водителя, за пластиковой накладкой.",
      "note": "Через него читаются ошибки, кодируются блоки и делается адаптация."
    },
    {
      "id": "park-sensor",
      "name": "Датчик парковки",
      "oem": "5Q0 919 275",
      "system": "electrics",
      "qty": 8,
      "confidence": "medium",
      "location": "В бамперах, 8 шт.",
      "note": "Проверять по диагностике, какой не видит",
      "zone": "bumperF"
    },
    {
      "id": "rear-camera",
      "name": "Камера заднего вида",
      "oem": "5Q0 980 551",
      "system": "electrics",
      "qty": 1,
      "confidence": "low",
      "location": "В ручке крышки багажника",
      "note": "Мутная картинка — проверить разъём",
      "zone": "tailgate"
    },
    {
      "id": "relay",
      "name": "Реле",
      "oem": "5Q0 951 253",
      "system": "electrics",
      "qty": 1,
      "confidence": "low",
      "location": "В блоке под панелью",
      "note": "Проверять при отказе потребителя",
      "zone": "doorFL"
    },
    {
      "id": "start-button",
      "name": "Кнопка запуска двигателя",
      "oem": "5Q0 959 501",
      "system": "electrics",
      "qty": 1,
      "confidence": "low",
      "location": "На консоли, у рычага КПП",
      "note": "Не реагирует — проверить батарейку ключа",
      "zone": "doorFL"
    },
    {
      "id": "starter",
      "name": "Стартер",
      "oem": "02M 911 023",
      "system": "electrics",
      "qty": 1,
      "confidence": "low",
      "location": "На КПП, спереди",
      "note": "Щёлкает, но не крутит — проверить втягивающее",
      "zone": "hood"
    },
    {
      "id": "tpms-sensor",
      "name": "Датчик давления в шинах",
      "oem": "5Q0 907 275",
      "system": "electrics",
      "qty": 4,
      "confidence": "medium",
      "location": "В каждом колесе, 4 шт.",
      "note": "Батарейка живёт 7–10 лет",
      "zone": "wheelFL",
      "service": {
        "atKm": [
          150000
        ],
        "action": "замена"
      }
    },
    {
      "id": "washer-pump",
      "name": "Насос омывателя",
      "oem": "5Q0 955 681",
      "system": "electrics",
      "qty": 1,
      "confidence": "medium",
      "location": "В бачке омывателя",
      "note": "Не писает — проверить моторчик и форсунки",
      "zone": "hood"
    },
    {
      "id": "wiper-motor",
      "name": "Моторчик стеклоочистителя",
      "oem": "5Q0 955 119",
      "system": "electrics",
      "qty": 1,
      "confidence": "low",
      "location": "Под жабо, у лобового",
      "note": "Не машет — проверить трапецию и мотор",
      "zone": "hood"
    },
    {
      "id": "cv-boot",
      "name": "Пыльник ШРУСа",
      "oem": "1K0 498 203 A",
      "system": "transmission",
      "qty": 1,
      "confidence": "medium",
      "location": "На приводе, у колеса",
      "note": "Порванный пыльник убивает ШРУС за пару тысяч км",
      "zone": "wheelFL",
      "service": {
        "everyKm": 30000,
        "action": "проверка"
      }
    },
    {
      "id": "cv-inner",
      "name": "ШРУС внутренний",
      "oem": "5Q0 498 103",
      "system": "transmission",
      "qty": 1,
      "confidence": "low",
      "location": "У КПП, на приводе",
      "note": "Меняется с приводом или отдельно",
      "zone": "sill"
    },
    {
      "id": "cv-outer",
      "name": "ШРУС наружный",
      "oem": "5Q0 498 099 B",
      "system": "transmission",
      "qty": 1,
      "confidence": "medium",
      "location": "На конце привода, у колеса",
      "note": "Пыльник проверять на каждом ТО",
      "zone": "wheelFL",
      "service": {
        "everyKm": 120000,
        "action": "проверка"
      }
    },
    {
      "id": "driveshaft-left",
      "name": "Привод левый",
      "oem": "5Q0 407 271 C",
      "system": "transmission",
      "qty": 1,
      "confidence": "low",
      "location": "От КПП к левому колесу",
      "note": "При замене — новая гайка ступицы",
      "zone": "wheelFL"
    },
    {
      "id": "driveshaft-right",
      "name": "Привод правый",
      "oem": "5Q0 407 272 C",
      "system": "transmission",
      "qty": 1,
      "confidence": "low",
      "location": "От КПП к правому колесу",
      "note": "При замене — новая гайка ступицы",
      "zone": "wheelFR"
    },
    {
      "id": "dsg-filter",
      "name": "Фильтр DSG",
      "oem": "0GC 325 183",
      "system": "transmission",
      "qty": 1,
      "confidence": "low",
      "location": "В корпусе КПП, доступ снизу",
      "note": "Меняется вместе с маслом DSG",
      "zone": "sill",
      "service": {
        "everyKm": 60000,
        "action": "замена"
      },
      "fluid": "dsg-oil"
    },
    {
      "id": "dsg-pan-gasket",
      "name": "Прокладка поддона DSG",
      "oem": "0GC 321 371",
      "system": "transmission",
      "qty": 1,
      "confidence": "low",
      "location": "Поддон КПП, снизу",
      "note": "Меняется при снятии поддона",
      "zone": "sill"
    },
    {
      "id": "haldex-filter",
      "name": "Фильтр муфты Haldex",
      "oem": "0CQ 598 305",
      "system": "transmission",
      "qty": 1,
      "confidence": "low",
      "location": "Сзади, у заднего редуктора",
      "note": "Меняется с маслом Haldex",
      "zone": "wheelRL",
      "service": {
        "everyKm": 60000,
        "action": "замена"
      },
      "fluid": "haldex-oil"
    },
    {
      "id": "mechatronic",
      "name": "Мехатроник DSG",
      "oem": "0GC 325 025",
      "system": "transmission",
      "qty": 1,
      "confidence": "low",
      "location": "В корпусе КПП, под поддоном",
      "note": "Ремонт или замена в сборе, требуется адаптация",
      "zone": "sill"
    },
    {
      "id": "propshaft",
      "name": "Карданный вал",
      "oem": "5Q0 521 101 B",
      "system": "transmission",
      "qty": 1,
      "confidence": "low",
      "location": "По центру днища, к заднему редуктору",
      "note": "Проверять люфт и крестовины",
      "zone": "sill"
    },
    {
      "id": "selector",
      "name": "Селектор КПП",
      "oem": "5Q0 711 049",
      "system": "transmission",
      "qty": 1,
      "confidence": "low",
      "location": "В салоне, на тоннеле",
      "note": "Проверять фиксацию и подсветку",
      "zone": "doorFL"
    }
  ],
  "fluids": [
    {
      "id": "engine-oil",
      "title": "Моторное масло",
      "system": "engine",
      "spec": "5W-30, допуск VW 504 00 / 507 00 (LongLife III)",
      "code": "G 052 195 M2",
      "volume": "5,7 л",
      "everyKm": 15000,
      "action": "замена",
      "interval": "каждые 15 000 км или раз в год"
    },
    {
      "id": "dsg-oil",
      "title": "Масло DSG (мокрое сцепление)",
      "system": "transmission",
      "spec": "G 052 529 A2, 7-ступ. DQ381",
      "code": "G 052 529 A2",
      "volume": "7,0 л",
      "everyKm": 60000,
      "action": "замена",
      "interval": "каждые 60 000 км"
    },
    {
      "id": "haldex-oil",
      "title": "Масло муфты Haldex",
      "system": "transmission",
      "spec": "G 055 175 A2",
      "code": "G 055 175 A2",
      "volume": "0,65 л",
      "everyKm": 60000,
      "action": "замена",
      "interval": "каждые 60 000 км"
    },
    {
      "id": "rear-diff-oil",
      "title": "Масло заднего редуктора",
      "system": "transmission",
      "spec": "G 052 145 S2",
      "code": "G 052 145 S2",
      "volume": "1,0 л",
      "everyKm": 120000,
      "action": "замена",
      "interval": "каждые 120 000 км"
    },
    {
      "id": "brake-fluid",
      "title": "Тормозная жидкость",
      "system": "brakes",
      "spec": "DOT 4 SL.6",
      "code": "B 000 750 M2",
      "volume": "1,0 л",
      "everyKm": 30000,
      "action": "замена",
      "interval": "каждые 2 года или 30 000 км"
    },
    {
      "id": "coolant",
      "title": "Антифриз G13",
      "system": "cooling",
      "spec": "G13, концентрат 1:1 с водой",
      "code": "G 013 A8J M1",
      "volume": "8,0 л",
      "everyKm": 120000,
      "action": "замена",
      "interval": "каждые 120 000 км или 5 лет"
    },
    {
      "id": "ac-refrigerant",
      "title": "Хладагент кондиционера",
      "system": "cooling",
      "spec": "R134a + масло PAG",
      "code": "—",
      "volume": "550 г",
      "everyKm": 60000,
      "action": "обслуживание",
      "interval": "раз в 2 года"
    }
  ]
};
