# Tiguan II — разбор по деталям

Статическое SPA без бэкенда: 3D-кузов, схемы узлов, каталог оригинальных номеров
и регламент ТО для Volkswagen Tiguan II (AD1), 2020, 2.0 TSI 180 л.с. (CZPA).

## Запуск

Откройте `index.html` двойным кликом — приложение работает по `file://`.
three.js подгружается с CDN, поэтому нужен интернет; без него страница скажет,
что не смогла загрузить библиотеку.

Проверить как на GitHub Pages:

```bash
python3 -m http.server 8000   # из корня репозитория
# http://127.0.0.1:8000/tiguan-parts/
```

## Что внутри

- **3D-кузов** — процедурная модель, панели кликабельны и подсвечиваются.
- **5 схем** — моторный отсек (перед машины внизу, как у открытого капота),
  приводной ремень, тормоза и подвеска, салон, передок.
- **135 деталей** — расходники, узлы подвески, тормозов, КПП, электрики и кузова.
- **Регламент ТО** — работы на 15 000 … 240 000 км с шагом 15 000.
- **Масла и жидкости** — характеристики, код, объём и интервал замены прямо в карточке.

## Структура

```
tiguan-parts/
  index.html       разметка, importmap для three.js
  app.js           сцена, маршруты, карточки, избранное, регламент
  diagrams.js      SVG-схемы (кликабельные узлы)
  styles.css
  data/parts.js    автомобиль, системы, схемы, зоны, детали, жидкости
```

Данные и схемы — обычные скрипты (`window.TIGUAN_DATA`, `window.DIAGRAMS`),
а не JSON и модули: иначе браузер не отдаст их по `file://`.

## Формат данных

```js
{
  id: "pads-rear",
  name: "Тормозные колодки задние",
  oem: "5Q0 698 451 F",
  system: "brakes",           // engine | transmission | brakes | suspension |
                              // interior | body | electrics | cooling
  diagram: "brake-front",     // опционально: схема, на которой есть узел
  zone: "wheelRL",            // опционально: зона 3D-кузова для мини-карты
  qty: 1,
  confidence: "medium",       // high | medium | low
  location: "В суппорте заднего колеса",
  note: "Менять комплектом на ось",
  service: {                  // опционально: попадает в регламент ТО
    everyKm: 30000,           // или atKm: [180000] для разовых работ
    action: "проверка"        // замена | проверка
  },
  fluid: "brake-fluid"        // опционально: ссылка на жидкость
}
```

Жидкости лежат в `data.fluids`:

```js
{
  id: "engine-oil",
  title: "Моторное масло",
  system: "engine",
  spec: "5W-30, допуск VW 504 00 / 507 00",
  code: "G 052 195 M2",
  volume: "5,7 л",
  everyKm: 15000,
  action: "замена",
  interval: "каждые 15 000 км или раз в год"
}
```

## Как добавить деталь

1. В `data/parts.js` → `parts` добавить объект по образцу выше.
2. Если деталь должна быть на схеме — нарисовать узел в `diagrams.js`:

```html
<g class="hotspot" data-part="pads-rear" tabindex="0" role="button" aria-label="Колодки задние">
  <circle class="shape" cx="575" cy="388" r="27"/>
  <text class="label" x="575" y="430" text-anchor="middle">Колодки</text>
</g>
```

`class="hotspot"` + `data-part` = кликабельно и подсвечивается.
Для перехода между схемами — `data-diagram="engine-drive"`.

Проверить связи:

```bash
node -e "
const fs=require('fs');
const src=fs.readFileSync('data/parts.js','utf8');
const data=eval('('+src.replace('window.TIGUAN_DATA =','').replace(/;\s*\$/,'')+')');
const ids=new Set(data.parts.map(p=>p.id));
const dg=fs.readFileSync('diagrams.js','utf8');
const hs=[...dg.matchAll(/data-part=\"([^\"]+)\"/g)].map(m=>m[1]).filter(x=>x!=='...');
console.log('хотспот без детали:', [...new Set(hs)].filter(h=>!ids.has(h)));
console.log('деталь без хотспота:', [...ids].filter(i=>!hs.includes(i)).length);
"
```

## Локальные правки

- Изменённые номера — `localStorage['tiguan.oem.v1']`, кнопка «вернуть» сбрасывает.
- Избранное — `localStorage['tiguan.fav.v1']`.

Правки хранятся только в браузере и не меняют `data/parts.js`.

## О данных

Номера собраны по открытым каталогам и не гарантированы: у AD1 много вариантов
по PR-кодам и комплектациям. Перед заказом сверяйте по VIN. Уровни уверенности
в карточке: «сверено», «вероятно», «проверить». Схемы — ориентир по узлам,
а не чертёж. VIN на странице замаскирован.
