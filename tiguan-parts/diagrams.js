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

    <g class="hotspot" data-part="expansion-cap" tabindex="0" role="button" aria-label="Крышка расширительного бачка">
      <circle class="shape" cx="215" cy="420" r="10"/>
      <line class="leader" x1="225" y1="420" x2="240" y2="420"/>
      <text class="label" x="244" y="424" text-anchor="start" style="font-size:10.5px">Крышка</text>
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

    <g class="hotspot" data-part="wear-sensor" tabindex="0" role="button" aria-label="Датчик износа колодок">
      <circle class="shape" cx="560" cy="392" r="10"/>
      <line class="leader" x1="560" y1="402" x2="560" y2="416"/>
      <text class="label" x="560" y="430" text-anchor="middle" style="font-size:10.5px">Датчик износа</text>
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

    <g class="hotspot" data-part="cabin-blower" tabindex="0" role="button" aria-label="Моторчик печки">
      <circle class="shape" cx="700" cy="480" r="34"/>
      <text class="label" x="700" y="484" text-anchor="middle" style="font-size:10px">Мотор печки</text>
    </g>

    <!-- OBD -->
    <g class="hotspot" data-part="obd-port" tabindex="0" role="button" aria-label="Разъём OBD-II">
      <path class="shape" d="M 128 402 L 190 402 L 184 432 L 134 432 Z"/>
      <text class="label" x="159" y="462" text-anchor="middle" style="font-size:13.5px">OBD-II</text>
    </g>
    <text class="caption" x="159" y="482" text-anchor="middle">слева под панелью</text>
  </svg>`,

  /* ============================ ДНИЩЕ ============================ */
  'underbody': `
  <svg viewBox="0 0 1000 620" role="img" aria-label="Днище автомобиля: КПП, приводы, выхлоп, редуктор">
    <rect class="plate" x="60" y="50" width="880" height="520" rx="26"/>
    <text class="caption" x="500" y="38" text-anchor="middle">зад автомобиля</text>
    <text class="caption" x="500" y="596" text-anchor="middle">перед автомобиля</text>

    <rect class="ghost" x="120" y="90" width="760" height="440" rx="30"/>

    <!-- колёса -->
    <rect class="ghost" x="128" y="412" width="86" height="78" rx="14"/>
    <rect class="ghost" x="786" y="412" width="86" height="78" rx="14"/>
    <rect class="ghost" x="128" y="120" width="86" height="78" rx="14"/>
    <rect class="ghost" x="786" y="120" width="86" height="78" rx="14"/>

    <!-- выхлоп -->
    <g class="hotspot" data-part="downpipe" tabindex="0" role="button" aria-label="Приёмная труба">
      <rect class="shape" x="320" y="440" width="45" height="70" rx="8"/>
      <text class="label" x="312" y="470" text-anchor="end" style="font-size:12px">Приёмная</text>
      <text class="label" x="312" y="485" text-anchor="end" style="font-size:12px">труба</text>
    </g>

    <g class="hotspot" data-part="catalytic" tabindex="0" role="button" aria-label="Катализатор">
      <rect class="shape" x="320" y="355" width="45" height="75" rx="8"/>
      <text class="label" x="312" y="392" text-anchor="end" style="font-size:12px">Катализатор</text>
    </g>

    <g class="hotspot" data-part="gpf" tabindex="0" role="button" aria-label="Сажевый фильтр GPF">
      <rect class="shape" x="320" y="270" width="45" height="75" rx="8"/>
      <text class="label" x="312" y="300" text-anchor="end" style="font-size:12px">Сажевый</text>
      <text class="label" x="312" y="315" text-anchor="end" style="font-size:12px">фильтр</text>
    </g>

    <rect class="ghost" x="332" y="180" width="22" height="90" rx="8"/>
    <g class="hotspot" data-part="muffler" tabindex="0" role="button" aria-label="Глушитель">
      <rect class="shape" x="300" y="100" width="90" height="70" rx="10"/>
      <text class="label" x="345" y="140" text-anchor="middle" style="font-size:12.5px">Глушитель</text>
    </g>

    <!-- датчики выхлопа -->
    <g class="hotspot" data-part="lambda-front" tabindex="0" role="button" aria-label="Лямбда-зонд передний">
      <circle class="shape" cx="385" cy="452" r="9"/>
      <text class="label" x="400" y="456" text-anchor="start" style="font-size:12px">λ</text>
    </g>
    <g class="hotspot" data-part="lambda-rear" tabindex="0" role="button" aria-label="Лямбда-зонд задний">
      <circle class="shape" cx="385" cy="368" r="9"/>
      <text class="label" x="400" y="372" text-anchor="start" style="font-size:12px">λ</text>
    </g>

    <!-- КПП -->
    <rect class="ghost" x="390" y="360" width="220" height="140" rx="20"/>
    <text class="caption" x="500" y="352" text-anchor="middle">КПП DSG (DQ381)</text>

    <g class="hotspot" data-part="dsg-clutch" tabindex="0" role="button" aria-label="Сцепление DSG">
      <rect class="shape" x="400" y="368" width="95" height="50" rx="8"/>
      <text class="label" x="447" y="398" text-anchor="middle" style="font-size:11px">Сцепление</text>
    </g>

    <g class="hotspot" data-part="mechatronic" tabindex="0" role="button" aria-label="Мехатроник DSG">
      <rect class="shape" x="502" y="368" width="98" height="50" rx="8"/>
      <text class="label" x="551" y="398" text-anchor="middle" style="font-size:11px">Мехатроник</text>
    </g>

    <g class="hotspot" data-part="dsg-filter" tabindex="0" role="button" aria-label="Фильтр DSG">
      <rect class="shape" x="502" y="428" width="80" height="30" rx="7"/>
      <text class="label" x="542" y="448" text-anchor="middle" style="font-size:10.5px">Фильтр DSG</text>
    </g>

    <g class="hotspot" data-part="dsg-heat-exchanger" tabindex="0" role="button" aria-label="Теплообменник DSG">
      <rect class="shape" x="618" y="400" width="46" height="58" rx="8"/>
      <line class="leader" x1="664" y1="429" x2="680" y2="429"/>
      <text class="label" x="686" y="433" text-anchor="start" style="font-size:11.5px">Теплообменник</text>
    </g>

    <g class="hotspot" data-part="front-diff" tabindex="0" role="button" aria-label="Передний редуктор">
      <rect class="shape" x="400" y="474" width="82" height="22" rx="6"/>
      <line class="leader" x1="440" y1="496" x2="440" y2="512"/>
      <text class="label" x="440" y="528" text-anchor="middle" style="font-size:11px">Передний редуктор</text>
    </g>

    <g class="hotspot" data-part="angle-drive" tabindex="0" role="button" aria-label="Угловой редуктор (раздатка)">
      <rect class="shape" x="616" y="468" width="44" height="30" rx="7"/>
      <line class="leader" x1="660" y1="483" x2="674" y2="483"/>
      <text class="label" x="680" y="487" text-anchor="start" style="font-size:11px">Раздатка</text>
    </g>

    <!-- приводы -->
    <g class="hotspot" data-part="driveshaft-left" tabindex="0" role="button" aria-label="Привод левый">
      <line class="shape ln-thick" x1="390" y1="432" x2="216" y2="452"/>
    </g>
    <g class="hotspot" data-part="driveshaft-right" tabindex="0" role="button" aria-label="Привод правый">
      <line class="shape ln-thick" x1="610" y1="432" x2="784" y2="452"/>
    </g>

    <!-- кардан -->
    <g class="hotspot" data-part="propshaft" tabindex="0" role="button" aria-label="Карданный вал">
      <rect class="shape" x="480" y="196" width="40" height="150" rx="10"/>
      <line class="leader" x1="520" y1="270" x2="534" y2="270"/>
      <text class="label" x="540" y="275" text-anchor="start" style="font-size:12.5px">Карданный вал</text>
    </g>

    <!-- задний редуктор и Haldex -->
    <g class="hotspot" data-part="rear-diff" tabindex="0" role="button" aria-label="Задний редуктор">
      <rect class="shape" x="430" y="120" width="140" height="64" rx="12"/>
      <text class="label" x="500" y="156" text-anchor="middle" style="font-size:12px">Задний редуктор</text>
    </g>

    <g class="hotspot" data-part="haldex-coupling" tabindex="0" role="button" aria-label="Муфта Haldex">
      <rect class="shape" x="445" y="82" width="110" height="30" rx="8"/>
      <text class="label" x="500" y="102" text-anchor="middle" style="font-size:12.5px">Haldex</text>
    </g>

    <g class="hotspot" data-part="haldex-filter" tabindex="0" role="button" aria-label="Фильтр Haldex">
      <rect class="shape" x="400" y="88" width="30" height="24" rx="5"/>
      <text class="caption" x="415" y="80" text-anchor="middle">фильтр</text>
    </g>

    <g class="hotspot" data-part="haldex-pump" tabindex="0" role="button" aria-label="Насос Haldex">
      <circle class="shape" cx="585" cy="98" r="13"/>
      <text class="label" x="604" y="102" text-anchor="start" style="font-size:11.5px">насос</text>
    </g>

    <!-- бак -->
    <g class="hotspot" data-part="fuel-tank" tabindex="0" role="button" aria-label="Топливный бак">
      <rect class="shape" x="650" y="210" width="160" height="130" rx="16"/>
      <text class="label" x="730" y="280" text-anchor="middle" style="font-size:12.5px">Топливный бак</text>
    </g>

    <g class="hotspot" data-part="fuel-filter" tabindex="0" role="button" aria-label="Топливный фильтр">
      <rect class="shape" x="650" y="352" width="70" height="26" rx="8"/>
      <text class="label" x="685" y="396" text-anchor="middle" style="font-size:10.5px">Топливный фильтр</text>
    </g>

  </svg>`,
  /* ============================ КАРДАН ============================ */
  'propshaft': `
  <svg viewBox="0 0 1000 620" role="img" aria-label="Карданный вал: детали и крепёж">
    <rect class="plate" x="60" y="50" width="880" height="520" rx="26"/>
    <text class="caption" x="170" y="82" text-anchor="middle">к КПП</text>
    <text class="caption" x="790" y="82" text-anchor="middle">к заднему редуктору</text>

    <!-- теплозащита -->
    <g class="hotspot" data-part="propshaft-heat-shield" tabindex="0" role="button" aria-label="Теплозащитный экран">
      <rect class="shape" x="300" y="150" width="320" height="40" rx="10"/>
      <text class="label" x="460" y="140" text-anchor="middle" style="font-size:12.5px">Теплозащитный экран</text>
    </g>

    <!-- передний ШРУС -->
    <g class="hotspot" data-part="propshaft-front-joint" tabindex="0" role="button" aria-label="ШРУС кардана передний">
      <circle class="shape" cx="170" cy="300" r="52"/>
      <circle class="hub" cx="170" cy="300" r="20"/>
      <text class="label" x="170" y="382" text-anchor="middle" style="font-size:12.5px">ШРУС передний</text>
    </g>

    <!-- болты -->
    <g class="hotspot" data-part="propshaft-bolts" tabindex="0" role="button" aria-label="Болты кардана">
      <circle class="shape" cx="170" cy="238" r="8"/>
      <circle class="shape" cx="170" cy="362" r="8"/>
      <circle class="shape" cx="108" cy="300" r="8"/>
      <circle class="shape" cx="232" cy="300" r="8"/>
      <line class="leader" x1="120" y1="430" x2="150" y2="372"/>
      <text class="label" x="114" y="446" text-anchor="middle" style="font-size:12px">болты</text>
    </g>

    <!-- эластичная муфта -->
    <g class="hotspot" data-part="propshaft-coupling" tabindex="0" role="button" aria-label="Эластичная муфта кардана">
      <circle class="shape" cx="258" cy="300" r="32"/>
      <text class="label" x="258" y="240" text-anchor="middle" style="font-size:12px">Эластичная муфта</text>
    </g>

    <!-- трубы -->
    <g class="hotspot" data-part="propshaft" tabindex="0" role="button" aria-label="Карданный вал">
      <rect class="shape" x="298" y="280" width="180" height="40" rx="12"/>
      <text class="label" x="388" y="266" text-anchor="middle" style="font-size:12.5px">Труба кардана</text>
    </g>

    <!-- подвесной подшипник -->
    <g class="hotspot" data-part="propshaft-bearing" tabindex="0" role="button" aria-label="Подвесной подшипник">
      <rect class="shape" x="490" y="250" width="60" height="100" rx="12"/>
      <rect class="ghost" x="500" y="222" width="40" height="28" rx="8"/>
      <line class="leader" x1="520" y1="350" x2="520" y2="382"/>
      <text class="label" x="520" y="398" text-anchor="middle" style="font-size:12px">Подвесной подшипник</text>
    </g>

    <g class="hotspot" data-part="propshaft" tabindex="0" role="button" aria-label="Карданный вал">
      <rect class="shape" x="560" y="280" width="170" height="40" rx="12"/>
      <text class="label" x="645" y="266" text-anchor="middle" style="font-size:12.5px">Труба кардана</text>
    </g>

    <!-- задний ШРУС -->
    <g class="hotspot" data-part="propshaft-rear-joint" tabindex="0" role="button" aria-label="ШРУС кардана задний">
      <circle class="shape" cx="790" cy="300" r="52"/>
      <circle class="hub" cx="790" cy="300" r="20"/>
      <text class="label" x="790" y="382" text-anchor="middle" style="font-size:12.5px">ШРУС задний</text>
    </g>

    <text class="caption" x="500" y="470" text-anchor="middle">валы условно раздвинуты · крепёж одноразовый</text>
  </svg>`,

  /* ======================= ПОДВЕСКА: ПЕРЕД ======================= */
  'suspension-front': `
  <svg viewBox="0 0 1000 620" role="img" aria-label="Передняя подвеска: стойка, рычаг, шаровая, сайлентблоки">
    <rect class="plate" x="60" y="50" width="880" height="520" rx="26"/>
    <text class="caption" x="86" y="84">колесо снято · вид сбоку</text>

    <!-- кулак и ступица -->
    <g class="hotspot" data-part="knuckle-front" tabindex="0" role="button" aria-label="Поворотный кулак">
      <rect class="shape" x="180" y="300" width="130" height="130" rx="18"/>
      <text class="label" x="190" y="318" text-anchor="start" style="font-size:11px">Кулак</text>
    </g>

    <g class="hotspot" data-part="wheel-bearing" tabindex="0" role="button" aria-label="Подшипник ступицы">
      <circle class="shape" cx="245" cy="365" r="48"/>
      <text class="label" x="245" y="370" text-anchor="middle" style="font-size:12.5px">Ступица</text>
    </g>

    <line class="ghost" x1="140" y1="365" x2="197" y2="365" stroke-width="12"/>

    <g class="hotspot" data-part="cv-outer" tabindex="0" role="button" aria-label="ШРУС наружный">
      <circle class="shape" cx="205" cy="365" r="12"/>
      <line class="leader" x1="193" y1="355" x2="176" y2="340"/>
      <text class="label" x="172" y="336" text-anchor="end" style="font-size:10px">ШРУС</text>
    </g>

    <g class="hotspot" data-part="cv-boot" tabindex="0" role="button" aria-label="Пыльник ШРУСа">
      <rect class="shape" x="148" y="355" width="40" height="20" rx="8"/>
      <text class="label" x="168" y="390" text-anchor="middle" style="font-size:10px">Пыльник</text>
    </g>

    <g class="hotspot" data-part="tpms-sensor" tabindex="0" role="button" aria-label="Датчик давления в шинах">
      <circle class="shape" cx="245" cy="317" r="10"/>
      <text class="label" x="245" y="302" text-anchor="middle" style="font-size:10px">TPMS</text>
    </g>

    <!-- опора стойки -->
    <g class="hotspot" data-part="strut-mount" tabindex="0" role="button" aria-label="Опорный подшипник стойки">
      <ellipse class="shape" cx="500" cy="120" rx="44" ry="26"/>
      <text class="label" x="500" y="76" text-anchor="middle" style="font-size:12.5px">Опора стойки</text>
    </g>

    <!-- стойка -->
    <g class="hotspot" data-part="strut-front" tabindex="0" role="button" aria-label="Амортизатор передний">
      <rect class="shape" x="486" y="140" width="30" height="220" rx="12"/>
      <line class="leader" x1="516" y1="250" x2="556" y2="250"/>
      <text class="label" x="562" y="255" text-anchor="start" style="font-size:13px">Стойка</text>
    </g>

    <!-- пружина -->
    <g class="hotspot" data-part="spring-front" tabindex="0" role="button" aria-label="Пружина передняя">
      <path class="shape ln" d="M 470 170 q -26 18 0 36 q 26 18 0 36 q -26 18 0 36 q 26 18 0 36 q -26 18 0 30"/>
      <line class="leader" x1="444" y1="250" x2="424" y2="250"/>
      <text class="label" x="418" y="255" text-anchor="end" style="font-size:12.5px">Пружина</text>
    </g>

    <!-- отбойник -->
    <g class="hotspot" data-part="bump-stop" tabindex="0" role="button" aria-label="Отбойник с пыльником">
      <rect class="shape" x="470" y="330" width="30" height="30" rx="8"/>
      <line class="leader" x1="470" y1="345" x2="452" y2="345"/>
      <text class="label" x="446" y="350" text-anchor="end" style="font-size:12px">Отбойник</text>
    </g>

    <!-- рычаг -->
    <g class="hotspot" data-part="control-arm" tabindex="0" role="button" aria-label="Рычаг передней подвески">
      <path class="shape" d="M 255 425 L 530 460 L 500 515 L 235 480 Z"/>
      <text class="label" x="380" y="495" text-anchor="middle" style="font-size:12.5px">Рычаг</text>
    </g>

    <!-- шаровая -->
    <g class="hotspot" data-part="ball-joint" tabindex="0" role="button" aria-label="Шаровая опора">
      <circle class="shape" cx="270" cy="440" r="20"/>
      <line class="leader" x1="270" y1="460" x2="270" y2="530"/>
      <text class="label" x="270" y="548" text-anchor="middle" style="font-size:12.5px">Шаровая</text>
    </g>

    <!-- сайлентблоки -->
    <g class="hotspot" data-part="arm-bushing" tabindex="0" role="button" aria-label="Сайлентблок рычага">
      <circle class="shape" cx="505" cy="465" r="16"/>
      <circle class="shape" cx="528" cy="452" r="14"/>
      <line class="leader" x1="545" y1="460" x2="560" y2="460"/>
      <text class="label" x="566" y="465" text-anchor="start" style="font-size:12px">Сайлентблоки</text>
    </g>

    <rect class="ghost" x="520" y="336" width="40" height="28" rx="8"/>
    <text class="caption" x="540" y="330" text-anchor="middle">рейка</text>

    <!-- рулевая тяга -->
    <g class="hotspot" data-part="tie-rod" tabindex="0" role="button" aria-label="Рулевая тяга">
      <line class="shape ln-thick" x1="560" y1="350" x2="700" y2="350"/>
      <text class="label" x="630" y="330" text-anchor="middle" style="font-size:12.5px">Тяга</text>
    </g>

    <g class="hotspot" data-part="tie-rod-end" tabindex="0" role="button" aria-label="Наконечник рулевой тяги">
      <circle class="shape" cx="718" cy="350" r="18"/>
      <text class="label" x="744" y="355" text-anchor="start" style="font-size:12.5px">Наконечник</text>
    </g>

    <!-- стабилизатор -->
    <g class="hotspot" data-part="stab-bushing-front" tabindex="0" role="button" aria-label="Втулка стабилизатора">
      <rect class="shape" x="415" y="296" width="32" height="22" rx="6"/>
      <text class="label" x="405" y="312" text-anchor="end" style="font-size:12px">Втулка</text>
    </g>

    <g class="hotspot" data-part="stab-link" tabindex="0" role="button" aria-label="Стойка стабилизатора">
      <line class="shape ln-thick" x1="430" y1="318" x2="430" y2="420"/>
      <text class="label" x="410" y="405" text-anchor="end" style="font-size:12px">Стаб. стойка</text>
    </g>

    <text class="caption" x="500" y="580" text-anchor="middle">рычаг и стойка показаны условно</text>
  </svg>`,

  /* ======================= ПОДВЕСКА: ЗАД ======================== */
  'suspension-rear': `
  <svg viewBox="0 0 1000 620" role="img" aria-label="Задняя подвеска: рычаги, пружина, амортизатор, втулки">
    <rect class="plate" x="60" y="50" width="880" height="520" rx="26"/>
    <text class="caption" x="86" y="84">колесо снято · вид сзади</text>

    <!-- кулак и ступица -->
    <g class="hotspot" data-part="knuckle-rear" tabindex="0" role="button" aria-label="Кулак задний">
      <rect class="shape" x="270" y="300" width="130" height="130" rx="18"/>
      <text class="label" x="335" y="292" text-anchor="middle" style="font-size:12px">Кулак</text>
    </g>

    <g class="hotspot" data-part="hub-rear" tabindex="0" role="button" aria-label="Ступица задняя">
      <circle class="shape" cx="335" cy="365" r="48"/>
      <text class="label" x="335" y="370" text-anchor="middle" style="font-size:12.5px">Ступица</text>
    </g>

    <circle class="ghost" cx="335" cy="365" r="58" stroke-dasharray="5 6"/>

    <g class="hotspot" data-part="disc-rear" tabindex="0" role="button" aria-label="Тормозной диск задний">
      <circle class="shape" cx="405" cy="355" r="14"/>
      <line class="leader" x1="419" y1="355" x2="432" y2="355"/>
      <text class="label" x="436" y="359" text-anchor="start" style="font-size:10.5px">Диск</text>
    </g>

    <g class="hotspot" data-part="pads-rear" tabindex="0" role="button" aria-label="Тормозные колодки задние">
      <rect class="shape" x="405" y="380" width="24" height="30" rx="6"/>
      <text class="label" x="435" y="400" text-anchor="start" style="font-size:10.5px">Колодки</text>
    </g>

    <g class="hotspot" data-part="brake-hose-rear" tabindex="0" role="button" aria-label="Тормозной шланг задний">
      <path class="shape ln" d="M 405 425 L 428 445"/>
      <text class="label" x="434" y="452" text-anchor="start" style="font-size:10.5px">Шланг</text>
    </g>

    <!-- рычаг -->
    <g class="hotspot" data-part="rear-arm" tabindex="0" role="button" aria-label="Задний рычаг">
      <path class="shape" d="M 330 420 L 620 460 L 590 515 L 310 475 Z"/>
      <text class="label" x="470" y="487" text-anchor="middle" style="font-size:12.5px">Рычаг</text>
    </g>

    <!-- пружина -->
    <g class="hotspot" data-part="spring-rear" tabindex="0" role="button" aria-label="Пружина задняя">
      <path class="shape ln" d="M 720 200 q -26 18 0 36 q 26 18 0 36 q -26 18 0 36 q 26 18 0 36 q -26 18 0 30"/>
      <line class="leader" x1="694" y1="290" x2="676" y2="290"/>
      <text class="label" x="670" y="295" text-anchor="end" style="font-size:12.5px">Пружина</text>
    </g>

    <!-- амортизатор -->
    <g class="hotspot" data-part="shock-rear" tabindex="0" role="button" aria-label="Амортизатор задний">
      <rect class="shape" x="780" y="180" width="28" height="200" rx="12"/>
      <line class="leader" x1="808" y1="280" x2="826" y2="280"/>
      <text class="label" x="832" y="285" text-anchor="start" style="font-size:12.5px">Амортизатор</text>
    </g>

    <!-- отбойник -->
    <g class="hotspot" data-part="bump-stop" tabindex="0" role="button" aria-label="Отбойник с пыльником">
      <rect class="shape" x="700" y="350" width="28" height="28" rx="8"/>
      <line class="leader" x1="700" y1="364" x2="684" y2="364"/>
      <text class="label" x="678" y="369" text-anchor="end" style="font-size:12px">Отбойник</text>
    </g>

    <!-- стабилизатор -->
    <g class="hotspot" data-part="stab-bushing-rear" tabindex="0" role="button" aria-label="Втулка стабилизатора задняя">
      <rect class="shape" x="545" y="285" width="32" height="22" rx="6"/>
      <text class="label" x="535" y="301" text-anchor="end" style="font-size:12px">Втулка</text>
    </g>

    <g class="hotspot" data-part="stab-link-rear" tabindex="0" role="button" aria-label="Стойка стабилизатора задняя">
      <line class="shape ln-thick" x1="560" y1="308" x2="560" y2="392"/>
      <line class="leader" x1="560" y1="392" x2="546" y2="404"/>
      <text class="label" x="540" y="418" text-anchor="end" style="font-size:12px">Стаб. стойка</text>
    </g>

    <!-- сайлентблок подрамника -->
    <g class="hotspot" data-part="subframe-bushing" tabindex="0" role="button" aria-label="Сайлентблок подрамника">
      <circle class="shape" cx="620" cy="530" r="18"/>
      <text class="label" x="648" y="535" text-anchor="start" style="font-size:12px">Сайлентблок подрамника</text>
    </g>

    <text class="caption" x="500" y="580" text-anchor="middle">пружина и амортизатор стоят раздельно</text>
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

    <g class="hotspot" data-part="wipers" tabindex="0" role="button" aria-label="Щётки стеклоочистителя">
      <line class="shape ln-thick" x1="320" y1="158" x2="540" y2="148"/>
      <line class="shape ln-thick" x1="470" y1="162" x2="660" y2="152"/>
      <text class="label" x="700" y="160" text-anchor="start" style="font-size:10.5px">Щётки</text>
    </g>
    <rect class="ghost" x="160" y="176" width="680" height="20" rx="8"/>

    <g class="hotspot" data-part="radiator-fan" tabindex="0" role="button" aria-label="Вентилятор радиатора">
      <circle class="shape" cx="215" cy="355" r="20"/>
      <text class="label" x="215" y="392" text-anchor="middle" style="font-size:9.5px">Вентилятор</text>
    </g>

    <g class="hotspot" data-part="radiator-hose-upper" tabindex="0" role="button" aria-label="Патрубок радиатора верхний">
      <rect class="shape" x="740" y="336" width="110" height="12" rx="6"/>
      <text class="label" x="795" y="330" text-anchor="middle" style="font-size:9.5px">Патрубок верх</text>
    </g>

    <g class="hotspot" data-part="radiator-hose-lower" tabindex="0" role="button" aria-label="Патрубок радиатора нижний">
      <rect class="shape" x="740" y="356" width="110" height="12" rx="6"/>
      <text class="label" x="795" y="384" text-anchor="middle" style="font-size:9.5px">Патрубок низ</text>
    </g>

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

  /* ======================= ДВИГАТЕЛЬ: ГРМ И ОПОРЫ ======================= */
  'engine-hardware': `
  <svg viewBox="0 0 1000 620" role="img" aria-label="Двигатель: цепь ГРМ, натяжитель, успокоитель, PCV и опоры">
    <rect class="plate" x="60" y="50" width="880" height="520" rx="26"/>
    <text class="caption" x="86" y="84">вид спереди · крышка ГРМ снята условно</text>

    <!-- блок -->
    <rect class="ghost" x="300" y="150" width="380" height="330" rx="24"/>

    <!-- крышка ГРМ -->
    <rect class="ghost" x="205" y="175" width="95" height="300" rx="16"/>
    <text class="caption" x="252" y="500" text-anchor="middle" style="font-size:11px">крышка ГРМ</text>

    <!-- цепь -->
    <g class="hotspot" data-part="timing-chain" tabindex="0" role="button" aria-label="Цепь ГРМ">
      <path class="shape" d="M 236 200 q 34 40 0 80 q -34 40 0 80 q 34 40 0 80" fill="none" stroke-width="9"/>
      <text class="label" x="198" y="196" text-anchor="end" style="font-size:11px">Цепь</text>
    </g>

    <!-- успокоитель -->
    <g class="hotspot" data-part="chain-guide" tabindex="0" role="button" aria-label="Успокоитель цепи">
      <rect class="shape" x="300" y="235" width="14" height="110" rx="6"/>
      <line class="leader" x1="314" y1="245" x2="330" y2="235"/>
      <text class="label" x="334" y="239" text-anchor="start" style="font-size:11px">Успокоитель</text>
    </g>

    <!-- натяжитель -->
    <g class="hotspot" data-part="chain-tensioner" tabindex="0" role="button" aria-label="Натяжитель цепи ГРМ">
      <rect class="shape" x="300" y="365" width="30" height="60" rx="8"/>
      <line class="leader" x1="330" y1="395" x2="345" y2="395"/>
      <text class="label" x="349" y="399" text-anchor="start" style="font-size:11px">Натяжитель</text>
    </g>

    <!-- PCV -->
    <g class="hotspot" data-part="pcv-valve" tabindex="0" role="button" aria-label="Маслоотделитель PCV">
      <circle class="shape" cx="490" cy="138" r="22"/>
      <line class="leader" x1="490" y1="116" x2="490" y2="100"/>
      <text class="label" x="490" y="92" text-anchor="middle" style="font-size:11px">PCV</text>
    </g>

    <!-- опоры двигателя -->
    <g class="hotspot" data-part="engine-mount-left" tabindex="0" role="button" aria-label="Опора двигателя левая">
      <rect class="shape" x="120" y="280" width="58" height="90" rx="14"/>
      <text class="label" x="149" y="270" text-anchor="middle" style="font-size:10.5px">Опора ДВС</text>
    </g>

    <g class="hotspot" data-part="engine-mount-right" tabindex="0" role="button" aria-label="Опора двигателя правая">
      <rect class="shape" x="812" y="280" width="58" height="90" rx="14"/>
      <text class="label" x="841" y="270" text-anchor="middle" style="font-size:10.5px">Опора ДВС</text>
    </g>

    <!-- опора КПП -->
    <g class="hotspot" data-part="trans-mount" tabindex="0" role="button" aria-label="Опора КПП">
      <rect class="shape" x="440" y="505" width="120" height="46" rx="12"/>
      <text class="label" x="500" y="533" text-anchor="middle" style="font-size:11px">Опора КПП</text>
    </g>
  </svg>`,
};
