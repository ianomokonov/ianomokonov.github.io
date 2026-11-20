// Схемы-разрезы. Разметка нарочно простая: крупные зоны, подписи, кликабельные узлы.
// Любой элемент с class="hotspot" и data-part="..." открывает карточку детали,
// с data-diagram="..." — переключает схему.

window.DIAGRAMS = {

  /* ============================ МОТОРНЫЙ ОТСЕК ============================ */
  'engine-bay': `
  <svg viewBox="0 0 1000 620" role="img" aria-label="Моторный отсек Tiguan II 2.0 TSI, перед автомобиля внизу">
    <rect class="plate" x="60" y="50" width="880" height="520" rx="26"/>

    <text class="caption" x="500" y="38" text-anchor="middle">к лобовому стеклу</text>
    <text class="caption" x="500" y="596" text-anchor="middle">перед автомобиля</text>

    <rect class="ghost" x="90" y="66" width="820" height="24" rx="8"/>
    <text class="caption" x="500" y="108" text-anchor="middle">моторный щит</text>

    <!-- бачок тормозной жидкости: у щита слева -->
    <rect class="ghost" x="200" y="95" width="90" height="38" rx="8"/>
    <text class="caption" x="245" y="119" text-anchor="middle">бачок ТЖ</text>

    <!-- стойки -->
    <circle class="ghost" cx="150" cy="300" r="46"/>
    <text class="caption" x="150" y="304" text-anchor="middle">стойка</text>
    <circle class="ghost" cx="850" cy="300" r="46"/>
    <text class="caption" x="850" y="304" text-anchor="middle">стойка</text>

    <!-- кожух двигателя -->
    <rect class="ghost" x="350" y="190" width="260" height="210" rx="20"/>
    <text class="caption" x="480" y="228" text-anchor="middle">кожух двигателя</text>

    <!-- АКБ: у щита справа -->
    <g class="hotspot" data-part="battery" tabindex="0" role="button" aria-label="Аккумулятор">
      <rect class="shape" x="700" y="95" width="150" height="100" rx="12"/>
      <text class="label" x="775" y="138" text-anchor="middle">АКБ</text>
      <text class="sub-label" x="775" y="160" text-anchor="middle">70 А·ч</text>
    </g>

    <!-- турбина: у щита, ближе к центру -->
    <g class="hotspot" data-part="turbo" tabindex="0" role="button" aria-label="Турбокомпрессор">
      <circle class="shape" cx="640" cy="205" r="28"/>
      <line class="leader" x1="668" y1="205" x2="680" y2="205"/>
      <text class="label" x="686" y="210" text-anchor="start" style="font-size:13.5px">Турбина</text>
    </g>

    <!-- ДМРВ в патрубке от фильтра к турбине -->
    <g class="hotspot" data-part="maf" tabindex="0" role="button" aria-label="Расходомер воздуха">
      <rect class="shape" x="626" y="300" width="34" height="34" rx="6"/>
      <text class="label" x="668" y="322" text-anchor="start" style="font-size:13px">ДМРВ</text>
    </g>

    <path class="ghost" d="M 700 415 L 700 360 L 668 330 L 660 300" fill="none" stroke-width="14" stroke-linecap="round"/>

    <!-- катушки и свечи -->
    <g class="hotspot" data-part="ignition-coil" tabindex="0" role="button" aria-label="Катушки зажигания">
      <rect class="shape" x="420" y="245" width="180" height="26" rx="6"/>
      <text class="label" x="510" y="263" text-anchor="middle" style="font-size:13.5px">Катушки</text>
    </g>

    <g class="hotspot" data-part="spark-plug" tabindex="0" role="button" aria-label="Свечи зажигания">
      <rect class="shape" x="420" y="281" width="180" height="22" rx="6"/>
      <text class="label" x="510" y="297" text-anchor="middle" style="font-size:13.5px">Свечи</text>
    </g>
    <text class="caption" x="480" y="360" text-anchor="middle" style="font-size:15px">2.0 TSI</text>

    <!-- маслозаливная крышка -->
    <g class="hotspot" data-part="oil-cap" tabindex="0" role="button" aria-label="Крышка маслозаливной горловины">
      <circle class="shape" cx="375" cy="215" r="13"/>
      <text class="label" x="340" y="220" text-anchor="end" style="font-size:12.5px">Масло</text>
    </g>

    <!-- масляный фильтр: слева от двигателя -->
    <g class="hotspot" data-part="oil-filter" tabindex="0" role="button" aria-label="Масляный фильтр">
      <circle class="shape" cx="300" cy="300" r="24"/>
      <text class="label" x="295" y="262" text-anchor="middle" style="font-size:13px">Масл. фильтр</text>
    </g>

    <!-- щуп -->
    <g class="hotspot" data-part="dipstick" tabindex="0" role="button" aria-label="Масляный щуп">
      <circle class="shape" cx="300" cy="360" r="9"/>
      <line class="leader" x1="300" y1="369" x2="300" y2="378"/>
      <text class="label" x="300" y="394" text-anchor="middle" style="font-size:13px">Щуп</text>
    </g>

    <!-- дроссель: спереди двигателя -->
    <g class="hotspot" data-part="throttle" tabindex="0" role="button" aria-label="Дроссельная заслонка">
      <rect class="shape" x="330" y="430" width="40" height="60" rx="8"/>
      <text class="label" x="355" y="520" text-anchor="middle" style="font-size:13px">Дроссель</text>
    </g>

    <!-- термостат: спереди слева -->
    <g class="hotspot" data-part="thermostat" tabindex="0" role="button" aria-label="Термостат">
      <circle class="shape" cx="280" cy="455" r="21"/>
      <text class="label" x="280" y="500" text-anchor="middle" style="font-size:13px">Термостат</text>
    </g>

    <!-- воздушный фильтр: справа у передка -->
    <g class="hotspot" data-part="air-filter" tabindex="0" role="button" aria-label="Воздушный фильтр">
      <rect class="shape" x="620" y="415" width="200" height="110" rx="14"/>
      <text class="label" x="720" y="463" text-anchor="middle">Воздушный</text>
      <text class="label" x="720" y="485" text-anchor="middle">фильтр</text>
    </g>

    <!-- бачок ОЖ: слева у передка -->
    <g class="hotspot" data-part="coolant-tank" tabindex="0" role="button" aria-label="Расширительный бачок">
      <rect class="shape" x="130" y="410" width="105" height="85" rx="14"/>
      <text class="label" x="182" y="446" text-anchor="middle" style="font-size:13.5px">Бачок</text>
      <text class="label" x="182" y="466" text-anchor="middle" style="font-size:13.5px">ОЖ</text>
    </g>

    <!-- горловина омывателя: справа у передка -->
    <circle class="ghost" cx="855" cy="470" r="20"/>
    <text class="caption" x="855" y="508" text-anchor="middle">омыватель</text>

    <!-- переход к схеме ремня -->
    <g class="hotspot tap" data-diagram="engine-drive" tabindex="0" role="button" aria-label="Ремень и навесное оборудование">
      <rect class="shape" x="430" y="465" width="170" height="55" rx="14"/>
      <text class="label" x="515" y="490" text-anchor="middle" style="font-size:13px">Ремень и навесное</text>
      <text class="caption" x="515" y="507" text-anchor="middle">открыть схему ›</text>
    </g>
  </svg>`,

  /* ========================= ПРИВОДНОЙ РЕМЕНЬ ========================== */
  'engine-drive': `
  <svg viewBox="0 0 1000 620" role="img" aria-label="Приводной ремень и навесное оборудование, вид спереди">
    <rect class="plate" x="70" y="60" width="860" height="500" rx="26"/>
    <text class="caption" x="96" y="92">вид спереди</text>

    <!-- ремень -->
    <g class="hotspot" data-part="belt" tabindex="0" role="button" aria-label="Ремень навесного оборудования">
      <ellipse cx="500" cy="333" rx="215" ry="145" fill="none" stroke="transparent" stroke-width="26"/>
      <ellipse class="belt" cx="500" cy="333" rx="215" ry="145"/>
      <text class="caption" x="500" y="548" text-anchor="middle">ремень 6PK</text>
    </g>

    <!-- генератор -->
    <g class="hotspot" data-part="alternator" tabindex="0" role="button" aria-label="Генератор">
      <circle class="shape" cx="623" cy="214" r="48"/>
      <text class="label" x="623" y="220" text-anchor="middle">Генератор</text>
    </g>

    <!-- обводной ролик -->
    <g class="hotspot" data-part="idler" tabindex="0" role="button" aria-label="Обводной ролик">
      <circle class="shape" cx="444" cy="193" r="22"/>
      <text class="label" x="444" y="160" text-anchor="middle" style="font-size:13.5px">Ролик</text>
    </g>

    <!-- помпа -->
    <g class="hotspot" data-part="water-pump" tabindex="0" role="button" aria-label="Насос охлаждающей жидкости">
      <circle class="shape" cx="288" cy="358" r="32"/>
      <line class="leader" x1="258" y1="358" x2="228" y2="358"/>
      <text class="label" x="222" y="363" text-anchor="end" style="font-size:13.5px">Насос ОЖ</text>
    </g>

    <!-- компрессор кондиционера -->
    <g class="hotspot" data-part="ac-compressor" tabindex="0" role="button" aria-label="Компрессор кондиционера">
      <circle class="shape" cx="377" cy="452" r="48"/>
      <text class="label" x="377" y="456" text-anchor="middle" style="font-size:12.5px">Компрессор</text>
    </g>

    <!-- натяжитель -->
    <g class="hotspot" data-part="tensioner" tabindex="0" role="button" aria-label="Натяжитель ремня">
      <circle class="shape" cx="702" cy="383" r="26"/>
      <line class="leader" x1="726" y1="393" x2="748" y2="410"/>
      <text class="label" x="752" y="416" text-anchor="start" style="font-size:13.5px">Натяжитель</text>
    </g>

    <!-- шкив коленвала -->
    <circle class="hub" cx="500" cy="478" r="52"/>
    <text class="caption" x="500" y="484" text-anchor="middle">коленвал</text>
  </svg>`,

  /* ======================== ТОРМОЗА И ПОДВЕСКА ========================= */
  'brake-front': `
  <svg viewBox="0 0 1000 620" role="img" aria-label="Тормоза и подвеска передней оси, колесо снято">
    <rect class="plate" x="60" y="50" width="880" height="520" rx="26"/>
    <text class="caption" x="86" y="84">колесо снято · передняя ось</text>

    <!-- диск -->
    <g class="hotspot" data-part="disc-front" tabindex="0" role="button" aria-label="Тормозной диск">
      <circle class="shape" cx="390" cy="300" r="150"/>
      <line class="leader" x1="252" y1="206" x2="292" y2="238"/>
      <text class="label" x="246" y="200" text-anchor="end">Диск</text>
    </g>

    <!-- ступица / подшипник -->
    <g class="hotspot" data-part="wheel-bearing" tabindex="0" role="button" aria-label="Подшипник ступицы">
      <circle class="shape" cx="390" cy="300" r="56"/>
      <text class="label" x="390" y="305" text-anchor="middle" style="font-size:12.5px">Ступица</text>
    </g>

    <!-- колодки -->
    <g class="hotspot" data-part="pads-front" tabindex="0" role="button" aria-label="Тормозные колодки">
      <rect class="shape" x="508" y="252" width="26" height="44" rx="5"/>
      <rect class="shape" x="508" y="312" width="26" height="44" rx="5"/>
      <line class="leader" x1="540" y1="200" x2="524" y2="246"/>
      <text class="label" x="536" y="194" text-anchor="end">Колодки</text>
    </g>

    <!-- суппорт -->
    <g class="hotspot" data-part="caliper-front" tabindex="0" role="button" aria-label="Суппорт">
      <path class="shape" d="M 500 232 Q 612 232 612 300 Q 612 368 500 368 L 500 338 Q 560 338 560 300 Q 560 262 500 262 Z"/>
      <line class="leader" x1="620" y1="336" x2="646" y2="344"/>
      <text class="label" x="652" y="350" text-anchor="start">Суппорт</text>
    </g>

    <!-- шланг -->
    <g class="hotspot" data-part="brake-hose" tabindex="0" role="button" aria-label="Тормозной шланг">
      <path class="shape ln" d="M 588 232 C 642 196 686 168 726 152"/>
      <line class="leader" x1="700" y1="176" x2="686" y2="160"/>
      <text class="label" x="676" y="150" text-anchor="end">Шланг</text>
    </g>

    <!-- датчик ABS -->
    <g class="hotspot" data-part="abs-sensor" tabindex="0" role="button" aria-label="Датчик ABS">
      <rect class="shape" x="292" y="452" width="38" height="18" rx="4"/>
      <path class="leader" d="M 292 461 L 250 486 L 208 486"/>
      <text class="label" x="202" y="491" text-anchor="end" style="font-size:13.5px">Датчик ABS</text>
    </g>

    <!-- стойка -->
    <g class="hotspot" data-part="strut-front" tabindex="0" role="button" aria-label="Амортизатор передний">
      <ellipse class="shape" cx="772" cy="120" rx="48" ry="24"/>
      <rect class="shape" x="752" y="132" width="40" height="238" rx="12"/>
      <path class="shape ln" d="M 742 168 q -26 20 0 40 q 26 20 0 40 q -26 20 0 40 q 26 20 0 40"/>
      <line class="leader" x1="820" y1="210" x2="852" y2="210"/>
      <text class="label" x="858" y="215" text-anchor="start">Стойка</text>
    </g>

    <!-- рычаг -->
    <g class="hotspot" data-part="control-arm" tabindex="0" role="button" aria-label="Рычаг подвески">
      <path class="shape" d="M 300 498 L 616 520 L 566 566 L 272 542 Z"/>
      <text class="label" x="430" y="528" text-anchor="middle" style="font-size:13.5px">Рычаг</text>
    </g>

    <!-- стойка стабилизатора -->
    <g class="hotspot" data-part="stab-link" tabindex="0" role="button" aria-label="Стойка стабилизатора">
      <line class="shape ln-thick" x1="620" y1="428" x2="660" y2="486"/>
      <circle class="shape" cx="620" cy="428" r="11"/>
      <circle class="shape" cx="660" cy="486" r="11"/>
      <line class="leader" x1="668" y1="492" x2="690" y2="502"/>
      <text class="label" x="696" y="507" text-anchor="start" style="font-size:13.5px">Стаб. стойка</text>
    </g>
  </svg>`,

  /* =============================== САЛОН =============================== */
  'interior': `
  <svg viewBox="0 0 1000 620" role="img" aria-label="Салон и панель приборов, вид спереди">
    <rect class="plate" x="60" y="30" width="880" height="540" rx="26"/>
    <text class="caption" x="86" y="62">вид на панель приборов</text>

    <!-- плафон -->
    <g class="hotspot" data-part="dome-light" tabindex="0" role="button" aria-label="Плафон освещения салона">
      <rect class="shape" x="452" y="72" width="96" height="28" rx="7"/>
      <text class="label" x="500" y="91" text-anchor="middle" style="font-size:12.5px">Плафон</text>
    </g>

    <!-- лобовое стекло -->
    <path class="ghost" d="M 110 175 L 890 175 L 852 248 L 148 248 Z"/>
    <text class="caption" x="500" y="216" text-anchor="middle">лобовое стекло</text>

    <!-- зеркало -->
    <g class="hotspot" data-part="rearview-mirror" tabindex="0" role="button" aria-label="Салонное зеркало">
      <rect class="shape" x="448" y="126" width="104" height="30" rx="8"/>
      <line class="leader" x1="552" y1="141" x2="566" y2="141"/>
      <text class="label" x="572" y="146" text-anchor="start" style="font-size:13.5px">Зеркало</text>
    </g>

    <!-- панель приборов -->
    <rect class="ghost" x="90" y="300" width="820" height="175" rx="20"/>
    <rect class="ghost" x="300" y="230" width="180" height="54" rx="12"/>
    <text class="caption" x="390" y="262" text-anchor="middle">приборы</text>

    <circle class="ghost" cx="330" cy="432" r="86"/>
    <circle class="ghost" cx="330" cy="432" r="34"/>
    <text class="caption" x="330" y="546" text-anchor="middle">руль</text>

    <rect class="ghost" x="470" y="322" width="160" height="122" rx="12"/>
    <text class="caption" x="550" y="344" text-anchor="middle">консоль</text>

    <!-- перчаточный ящик -->
    <rect class="ghost" x="640" y="320" width="235" height="135" rx="14"/>
    <text class="caption" x="757" y="342" text-anchor="middle">перчаточный ящик</text>

    <g class="hotspot" data-part="cabin-filter" tabindex="0" role="button" aria-label="Салонный фильтр">
      <rect class="shape" x="670" y="366" width="175" height="56" rx="8"/>
      <text class="label" x="757" y="400" text-anchor="middle" style="font-size:13px">Салонный фильтр</text>
    </g>
    <text class="caption" x="757" y="440" text-anchor="middle">за ящиком</text>

    <!-- OBD -->
    <g class="hotspot" data-part="obd-port" tabindex="0" role="button" aria-label="Разъём OBD-II">
      <path class="shape" d="M 128 402 L 190 402 L 184 432 L 134 432 Z"/>
      <text class="label" x="159" y="462" text-anchor="middle" style="font-size:13.5px">OBD-II</text>
    </g>
    <text class="caption" x="159" y="482" text-anchor="middle">слева под панелью</text>
  </svg>`,

  /* =============================== ПЕРЕДОК ============================== */
  'body-front': `
  <svg viewBox="0 0 1000 620" role="img" aria-label="Передняя часть автомобиля, бампер снят">
    <rect class="plate" x="60" y="30" width="880" height="560" rx="26"/>
    <text class="caption" x="86" y="62">вид спереди · бампер снят</text>

    <!-- силуэт кузова -->
    <path class="ghost" d="M 150 178 L 850 178 L 850 505 Q 850 540 812 540 L 188 540 Q 150 540 150 505 Z"/>
    <path class="ghost" d="M 300 96 L 700 96 L 758 166 L 242 166 Z"/>
    <text class="caption" x="500" y="132" text-anchor="middle">лобовое стекло</text>
    <rect class="ghost" x="160" y="176" width="680" height="20" rx="8"/>

    <!-- бампер -->
    <g class="hotspot" data-part="bumper-front" tabindex="0" role="button" aria-label="Бампер передний">
      <rect class="shape outline" x="120" y="438" width="760" height="104" rx="24"/>
      <text class="label" x="500" y="574" text-anchor="middle" style="font-size:13.5px">Бампер (снят)</text>
    </g>

    <!-- радиатор и конденсор -->
    <g class="hotspot" data-part="radiator" tabindex="0" role="button" aria-label="Радиатор охлаждения">
      <rect class="shape" x="286" y="322" width="188" height="104" rx="10"/>
      <text class="label" x="380" y="380" text-anchor="middle" style="font-size:13.5px">Радиатор</text>
    </g>

    <g class="hotspot" data-part="condenser" tabindex="0" role="button" aria-label="Конденсор кондиционера">
      <rect class="shape outline" x="526" y="322" width="188" height="104" rx="10"/>
      <text class="label" x="620" y="380" text-anchor="middle" style="font-size:13.5px">Конденсор</text>
    </g>
    <text class="caption" x="500" y="312" text-anchor="middle">конденсор стоит перед радиатором</text>

    <!-- ПТФ -->
    <g class="hotspot" data-part="fog-light" tabindex="0" role="button" aria-label="Противотуманная фара левая">
      <circle class="shape" cx="200" cy="486" r="26"/>
      <text class="label" x="200" y="491" text-anchor="middle" style="font-size:12.5px">ПТФ</text>
    </g>
    <g class="hotspot" data-part="fog-light" tabindex="0" role="button" aria-label="Противотуманная фара правая">
      <circle class="shape" cx="800" cy="486" r="26"/>
      <text class="label" x="800" y="491" text-anchor="middle" style="font-size:12.5px">ПТФ</text>
    </g>

    <!-- фары -->
    <g class="hotspot" data-part="headlight-l" tabindex="0" role="button" aria-label="Фара левая">
      <path class="shape" d="M 180 210 L 362 200 L 374 296 L 190 306 Z"/>
      <text class="label" x="276" y="258" text-anchor="middle" style="font-size:14px">Фара левая</text>
    </g>

    <g class="hotspot" data-part="headlight-r" tabindex="0" role="button" aria-label="Фара правая">
      <path class="shape" d="M 820 210 L 638 200 L 626 296 L 810 306 Z"/>
      <text class="label" x="724" y="258" text-anchor="middle" style="font-size:14px">Фара правая</text>
    </g>

    <!-- решётка -->
    <g class="hotspot" data-part="grille" tabindex="0" role="button" aria-label="Решётка радиатора">
      <rect class="shape" x="398" y="200" width="204" height="100" rx="10"/>
      <line x1="410" y1="226" x2="590" y2="226" stroke="#2e4156" stroke-width="3"/>
      <line x1="410" y1="246" x2="590" y2="246" stroke="#2e4156" stroke-width="3"/>
      <text class="label" x="500" y="278" text-anchor="middle" style="font-size:13.5px">Решётка</text>
    </g>
  </svg>`,
};
