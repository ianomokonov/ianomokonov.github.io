import { reptiles } from './data.js';

let field = document.querySelector('.page-content');
let pages = document.querySelector('.page-content__page-points');
let activeIndex = 0;
let scrolling = false;
window.document.addEventListener('DOMContentLoaded', function () {
  // Аналог $(document).ready(function(){
  field = document.querySelector('.page-content');
  pages = document.querySelector('.page-content__page-points');
  showAll();
  show(0);
});

function show(index) {
  const reptile = document.getElementById(index);
  const active = document.getElementById(activeIndex);
  const bg = document.querySelector('.bg');
  removeClasses(reptile);
  removeClasses(active);
  console.log(window.innerHeight);
  if (activeIndex > index) {
    active.classList.add('page-content_next');
    bg.style.transform = `translateY(${
      -index * (window.innerWidth > 768 ? 1080 : 1024)
    }px)`;
  } else if (activeIndex < index) {
    active.classList.add('page-content_prev');
    bg.style.transform = `translateY(${-index * (window.innerWidth > 768 ? 1080 : 1024)}px)`;
  }
  reptile.classList.add('page-content_active');
  activeIndex = index;
  setPages(activeIndex);
}

function removeClasses(elem) {
  elem.classList.remove('page-content_next');
  elem.classList.remove('page-content_prev');
  elem.classList.remove('page-content_active');
}

function showAll() {
  setPages(activeIndex);
  reptiles.forEach((reptile, index) => {
    const div = document.createElement('div');
    div.innerHTML = `
    <div class="page-content_rowed ${
      index ? 'page-content_next' : 'page-content_active'
    }" id="${index}">
      <div class="page-content__col reptile-description">
        <span class="page-content__public-name">${reptile.latinName}</span>
        <h1 class="main-header">${reptile.name}</h1>
        <span class="page-content__aria">${reptile.area}</span>
        <p class="page-content__description">
            ${reptile.description}
        </p>
        <a class="page-content__learn-more" href="/reptile/index.html?id=${
          reptile.id
        }">Узнать больше</a>
      </div>
      <div class="page-content__col">
        <img
          src="${reptile.img}"
          alt=""
          class="page-content__main-img"
        />
      </div>
    </div>
    `;
    field.append(div.firstElementChild);
  });
  field.classList.add('page-content_ready');
}

function setPages(activeIndex) {
  pages.innerHTML = reptiles
    .map((r, index) => {
      return `<div class="page-content__page-point ${
        index == activeIndex ? 'page-content__page-point_active' : ''
      } ${getHiddenClass(index, activeIndex)}"></div>`;
    })
    .join('');
}

function getHiddenClass(index, activeIndex) {
  if ((activeIndex < 4 && index > 3) || (activeIndex > 3 && index < 4)) {
    return 'page-content__page-point_hidden';
  }
  return '';
}

const scroll = (event) => {
  const { deltaY } = event;
  if (scrolling) {
    return;
  }
  scrolling = true;
  setTimeout(() => {
    scrolling = false;
  }, 500);
  if (deltaY < 0 && activeIndex > 0) {
    show(activeIndex - 1);
    return;
  }

  if (deltaY > 0 && activeIndex < reptiles.length - 1) {
    show(activeIndex + 1);
    return;
  }
};

document.addEventListener('wheel', scroll, { passive: false });
