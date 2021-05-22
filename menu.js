const container = document.querySelector('.container');

if (container) {
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="main-menu">
        <img class="main-menu__burger" src="/assets/images/menu.svg" alt="">
        <img class="main-menu__logo" src="/assets/images/logo.svg" alt="" />
        <img class="main-menu__logo main-menu__logo_sm" src="/assets/images/logo_monochrome.svg" alt="" />
        <div class="main-menu__menu-items">
        <a href="/" class="main-menu__menu-item ${getActive('/', true)}">
            <span>Главная</span>
        </a>
        <a href="/reptiles" class="main-menu__menu-item ${getActive(
          '/reptile'
        )}"><span>Рептилии</span></a>
        <a href="/test" class="main-menu__menu-item ${getActive(
          '/test/'
        )}"><span>Пройти тест</span></a>
        </div>
    </div>
    `;
  const tt = container.insertBefore(
    div.firstElementChild,
    container.firstElementChild
  );
  tt.querySelector('.main-menu__burger').addEventListener('click', () => {
    if (tt.className.indexOf('main-menu_opened') > -1) {
      tt.classList.remove('main-menu_opened');
      return;
    }
    tt.classList.add('main-menu_opened');
  });
}

function getActive(route, exact = false) {
  console.log(window.location.pathname, window.location.pathname === route);
  if (
    (!exact && window.location.pathname.indexOf(route) > -1) ||
    window.location.pathname === route
  ) {
    return 'main-menu__menu-item_active';
  }
  return '';
}
