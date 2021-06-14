import { reptiles } from '../reptiles/data.js';

let activeIndex = 0;
let activeFoodIndex = 0;
let scrolling = false;
const reptile = reptiles.find(
  (r) => r.id == new URL(document.location).searchParams.get('id')
);

const goBack = () => {
  if (activeFoodIndex < 1) {
    return;
  }
  const prevReptile = document.getElementById(activeFoodIndex - 1);
  const active = document.getElementById(activeFoodIndex);
  removeClasses(prevReptile);
  removeClasses(active);
  active.classList.add('food-content__block_next');
  prevReptile.classList.add('food-content__block_active');
  activeFoodIndex -= 1;
  setActivePoint();
};

const goForward = () => {
  if (activeFoodIndex > reptile.fullDescription.food.types.length - 2) {
    return;
  }
  const nextReptile = document.getElementById(activeFoodIndex + 1);
  const active = document.getElementById(activeFoodIndex);
  removeClasses(nextReptile);
  removeClasses(active);
  active.classList.add('food-content__block_prev');
  nextReptile.classList.add('food-content__block_active');
  activeFoodIndex += 1;
  setActivePoint();
};

const scroll = (deltaY) => {
  let shouldScroll = false;
  if (deltaY < 0 && activeIndex > 0) {
    activeIndex -= 1;
    shouldScroll = true;
  }

  if (deltaY > 0 && activeIndex < 3) {
    activeIndex += 1;
    shouldScroll = true;
  }

  if (shouldScroll) {
    document.querySelector(`.section-${activeIndex}`).scrollIntoView();
  }
};

document.addEventListener(
  'wheel',
  (e) => {
    if (window.innerHeight < 950) {
      return;
    }
    e.preventDefault();
    if (scrolling) {
      return;
    }
    scrolling = true;
    setTimeout(() => {
      scrolling = false;
    }, 500);

    scroll(e.deltaY);
  },
  { passive: false }
);

let start = 0;

// document.addEventListener('wheel', scroll);
// document.addEventListener(
//   'touchstart',
//   (e) => {
//     // e.preventDefault();
//     start = e.changedTouches[0]?.clientY;
//   },
//   { passive: false }
// );

// document.addEventListener(
//   'touchend',
//   (e) => {
//     e.preventDefault();
//     const deltaY = start - e.changedTouches[0]?.clientY;
//     scroll(deltaY);
//   },
//   { passive: false }
// );

function removeClasses(elem) {
  elem.classList.remove('food-content__block_next');
  elem.classList.remove('food-content__block_prev');
  elem.classList.remove('food-content__block_active');
}

const onFoodEnter = ({ target }) => {
  const colored = target.closest('[data-colored]');
  if (!colored) {
    return;
  }

  colored.firstChild.src = colored.dataset.colored;
  colored.classList.add('fourth-section__food-image_active');
};

const onFoodLeave = ({ target }) => {
  const masked = target.closest('[data-masked]');
  if (!masked) {
    return;
  }

  masked.firstChild.src = masked.dataset.masked;
  masked.classList.remove('fourth-section__food-image_active');
};

if (reptile) {
  document.body.style.setProperty(
    'background-image',
    `url(${reptile.infoBackground})`,
    'important'
  );

  setData(reptile);
}

document
  .querySelector('.fourth-section__food')
  .addEventListener('mouseenter', ({ target }) => {
    console.log(target);
  });

function setData(reptile) {
  if (!reptile.fullDescription) {
    return;
  }
  setFirstSection(reptile);
  setSecondSection(reptile);
  setThirdSection(reptile);
  setFourthSection(reptile);
}

function setFirstSection(reptile) {
  const section = document.querySelector('.first-section');
  section.innerHTML = `
    <h1 class="main-header main-header_centered">${reptile.name}</h1>
    <div class="row">
      <div class="col-xl-7 col-11 first-section__image">
        <img src="${reptile.fullDescription.mainImg}" alt="" />
        <div class="first-section__length">
          <div style="background-color: ${reptile.fullDescription.tailColor}" class="first-section__tail-lenght">
            <span style="color: ${reptile.fullDescription.tailColor}" class="first-section__length-label">Хвост</span>
            <span  class="first-section__length-value">${reptile.fullDescription.tailLength}</span>
          </div>
          <div style="background-color: ${reptile.fullDescription.bodyColor}" class="first-section__body-lenght">
            <span style="color: ${reptile.fullDescription.bodyColor}" class="first-section__length-label">Тело</span>
            <span class="first-section__length-value">${reptile.fullDescription.bodyLength}</span>
          </div>
        </div>
      </div>
      <div class="col-xl-5 col-11 first-section__info">
        <div class="first-section__info-item">
          <img
            src="../assets/images/forest.png"
            class="first-section__info-item-image"
          />
          <div class="first-section__info-item-label">${reptile.fullDescription.natureAge}</div>
        </div>
        <div class="first-section__info-item">
          <img
            src="../assets/images/house.png"
            class="first-section__info-item-image"
          />
          <div class="first-section__info-item-label">${reptile.fullDescription.homeAge}</div>
        </div>
        <div class="first-section__info-item">
          <img
            src="../assets/images/gira.png"
            class="first-section__info-item-image"
          />
          <div class="first-section__info-item-label">${reptile.fullDescription.weight}</div>
        </div>
        <div class="first-section__info-item">
          <img
            src="../assets/images/food.png"
            class="first-section__info-item-image"
          />
          <div class="first-section__info-item-label">${reptile.fullDescription.foodType}</div>
        </div>
      </div>
    </div>
    `;
}

function setSecondSection(reptile) {
  const section = document.querySelector('.second-section');
  section.innerHTML = `
    <div class="row">
    <div class="col-xl-6 col-11 d-flex align-items-center justify-content-center">
      <img
        src="${reptile.fullDescription.areaImg}"
        alt=""
        class="second-section__img"
      />
    </div>
    <div class="col-xl-6 col-11 d-flex flex-column justify-content-center">
      <div class="second-section__header">Место обитания</div>
      <div class="second-section__description">
        ${reptile.fullDescription.areaDescription}
      </div>
    </div>
  </div>
      `;
}

function setThirdSection(reptile) {
  const section = document.querySelector('.third-section');
  section.innerHTML = `
  <div class="third-section__header">Содержание</div>
  <div class="row">
    <div class="col-xl-6 col-sm-10 col-12 third-section__info">
      <div class="third-section__info-item">
        <img src="../assets/images/terrarium.png" alt="" />
        <div class="line"></div>
        <div class="third-section__info-item-description">
          ${reptile.fullDescription.terrariumDescription}
        </div>
      </div>
      <div class="third-section__info-item">
        <img src="../assets/images/light.png" alt="" />
        <div class="line"></div>
        <div class="third-section__info-item-description">
        ${reptile.fullDescription.lightDescription}
        </div>
      </div>
      <div class="third-section__info-item">
        <img src="../assets/images/temperature.png" alt="" />
        <div class="line"></div>
        <div class="third-section__info-item-description">
        ${reptile.fullDescription.temperatureDescription}
        </div>
      </div>
      <div class="third-section__info-item">
        <img src="../assets/images/night_temperature.png" alt="" />
        <div class="line"></div>
        <div class="third-section__info-item-description">
        ${reptile.fullDescription.nightTemperatureDescription}
        </div>
      </div>
      <div class="third-section__info-item">
        <img src="../assets/images/kaply.png" alt="" />
        <div class="line"></div>
        <div class="third-section__info-item-description">
        ${reptile.fullDescription.humidity}
        </div>
      </div>
      <div class="third-section__info-item">
        <img src="../assets/images/grunt.png" alt="" />
        <div class="line"></div>
        <div class="third-section__info-item-description">
        ${reptile.fullDescription.priming}
        </div>
      </div>
    </div>
    <div
      class="col-xl-6 col-12 third-section_dificulty ${getDifficultyColor(
        reptile.fullDescription.difficulty
      )}"
    >
      <div class="third-section_dificulty-points">
      ${getDifficulty(reptile.fullDescription.difficulty)}
      </div>
      <img src="${reptile.fullDescription.maintenanceImg}" alt="" />
    </div>
  </div>
        `;
}

function setFourthSection(reptile) {
  const section = document.querySelector('.fourth-section');
  section.innerHTML = `
  <div class="fourth-section__header">Питание</div>
  <div class="fourth-section__descriptions">
    <div class="fourth-section__description">
    ${getFoodDescriptions()[0] || ''}
    </div>
    <div class="fourth-section__description ${getSecondBlockPosition(
      getFoodDescriptions()[1]
    )}">
    ${getFoodDescriptions()[1] || ''}
    </div>
    <div class="fourth-section__description">
    ${getFoodDescriptions()[2] || ''}
    </div>
    <div class="fourth-section__description">
    ${getFoodDescriptions()[3] || ''}
    </div>
    <div class="fourth-section__food">
    <img
              src="${reptile.fullDescription.foodImg}"
              class="fourth-section__food-main-image"
            />
      ${getFood(reptile.fullDescription.food.types)}
    </div>
    <div class="fourth-section__slider">
        <div class="fourth-section__slides">
          <img class="food-content__arrow food-content__arrow_prev" src="../assets/images/arrow_left.svg">
          ${getSlider(reptile.fullDescription.food.types)}
          <img class="food-content__arrow food-content__arrow_next" src="../assets/images/arrow_right.svg">
        </div>
        <div class="steps">
          ${getSliderButtons(reptile.fullDescription.food.types)}
        </div>
    </div>
  </div>
        `;

  section
    .querySelector('.food-content__arrow_prev')
    .addEventListener('click', goBack);
  section
    .querySelector('.food-content__arrow_next')
    .addEventListener('click', goForward);
  section.querySelectorAll('[data-colored]').forEach((elem) => {
    elem.addEventListener('mouseenter', onFoodEnter);
    elem.addEventListener('mouseleave', onFoodLeave);
  });
}

function getSecondBlockPosition(text) {
  // if (text.indexOf('Кормить:') > -1 || document.documentElement.clientWidth < 576) {
  return 'fourth-section__description_top';
  // }
  // return '';
}

function getFoodDescriptions() {
  if (document.documentElement.clientWidth < 576) {
    return (
      reptile.fullDescription.food.descriptionsSm ||
      reptile.fullDescription.food.descriptions
    );
  }
  return reptile.fullDescription.food.descriptions;
}

function getDifficulty(difficulty) {
  let result = '';
  console.log(difficulty);
  for (let i = 0; i < 5; i++) {
    result += `<div class="third-section_dificulty-point ${
      i <= difficulty - 1 ? 'third-section_dificulty-point_filled' : ''
    }"></div>`;
  }

  return result;
}

function getDifficultyColor(difficulty) {
  if (difficulty < 3) {
    return 'third-section_dificulty_green';
  }
  if (difficulty == 3) {
    return 'third-section_dificulty_yellow';
  }
  return 'third-section_dificulty_orange';
}

function getFood(types) {
  return types
    .map(
      (
        t
      ) => `<div class="fourth-section__food-image" data-colored="${t.coloredImg}"
            data-masked="${t.maskedImg}"
            data-label="${t.label}"><img
            src="${t.maskedImg}" 
            />
            <div style="${t.styles}">
              ${t.label}
            </div>
            </div>`
    )
    .join('');
}

function getSlider(types) {
  return types
    .map(
      (type, index) =>
        `
    <div class="food-content__block ${getDirection(index)}" id="${index}">
        <img
        src="${type.coloredImg}"
        data-label="${type.label}"
        class="fourth-section__food-image"
        />
        <span>${type.label}</span>
    </div>
    
    `
    )
    .join('');
}

function getDirection(index) {
  if (index < activeFoodIndex) {
    return 'food-content__block_prev';
  }
  if (index > activeFoodIndex) {
    return 'food-content__block_next';
  }
  return 'food-content__block_active';
}

function getSliderButtons(types) {
  return types
    .map(
      (type, index) =>
        `
      <div class='steps__point ${
        activeFoodIndex == index ? 'steps__point_active' : ''
      }'></div>
    `
    )
    .join('');
}

function setActivePoint() {
  document.querySelector('.steps').innerHTML = getSliderButtons(
    reptile.fullDescription.food.types
  );
}
