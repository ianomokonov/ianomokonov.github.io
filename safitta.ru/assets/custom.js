$(document).ready(function(){



  //
  $(".popup-js").fancybox({
    fitToView: false,
    autoSize: true,
    padding: 0,
    closeClick: false,
    openEffect: 'none',
    closeEffect: 'none'
    //type: 'ajax',
    //ajax: {
    //    cache: false
    //}
  });


  /*slider-gallery*/
  $('.js-gallery').fancybox({
    padding:10
  });

 

	/* Submenu customize */

  var subMenuContainer = $('#navbarCollapse>ul>li>ul');
  var subMenuContainerParent = subMenuContainer.parent();
  subMenuContainerParent.addClass('dropdown');
  subMenuContainerParent.find('>a').attr('data-toggle','dropdown').addClass('dropdown-toggle');
  $('<span class="caret"></span>').appendTo(subMenuContainerParent);

  var subMenuContainer = $('#yw1>li>ul');
  var subMenuContainerParent = subMenuContainer.parent();
  subMenuContainerParent.addClass('dropdown');
  subMenuContainerParent.find('>a').attr('data-toggle','dropdown').addClass('dropdown-toggle');
  $('<span class="caret"></span>').appendTo(subMenuContainerParent.find('>a'));
  
  /* End submenu */

	/* Services Title */
  	$('#service-name').text($('#pageTitle').text());
  	/* Services Title End */
  
  /* Add active class to services item */
  	var pageTitle = $('#pageTitle').text();
    
  	if(pageTitle.length != 0) {
      //ищу элемент, с тектом заголовка страницы
      var elChild = $("span:contains("+pageTitle+")");
      //присваиваю родителю клас active
      elChild.parent().parent().addClass('active');

    }
  
  /* Add active class to services item End */
  
   /* Anchors to menu Links */
  
  
  $('#navbarCollapse a').each(function(i,elem) {
	var curHref = $(elem).attr('href');
    var href = curHref + '#anchor-page';
    if (curHref != '/services'){
    	$(elem).attr('href',href);
  	}
    console.log(href);
    
    
  });
  
  
  /* Anchors to menu Links End */

  /*fixed menu*/
  //fixed-block

  (function () {  // анонимная функция (function(){ })(), чтобы переменные "a" и "b" не стали глобальными
    var a = document.querySelector('.bottom-header'), b = null;  // селектор блока, который нужно закрепить
    window.addEventListener('scroll', Ascroll, false);
    document.body.addEventListener('scroll', Ascroll, false);  // если у html и body высота равна 100%
    function Ascroll() {
      if (b == null) {  // добавить потомка-обёртку, чтобы убрать зависимость с соседями
        var Sa = getComputedStyle(a, ''), s = '';
        for (var i = 0; i < Sa.length; i++) {  // перечислить стили CSS, которые нужно скопировать с родителя
          if (Sa[i].indexOf('overflow') == 0 || Sa[i].indexOf('padding') == 0 || Sa[i].indexOf('border') == 0 || Sa[i].indexOf('outline') == 0 || Sa[i].indexOf('box-shadow') == 0 || Sa[i].indexOf('background') == 0) {
            s += Sa[i] + ': ' + Sa.getPropertyValue(Sa[i]) + '; '
          }
        }
        b = document.createElement('div');  // создать потомка
        b.style.cssText = s + ' box-sizing: border-box; width: ' + a.offsetWidth + 'px;';
        a.insertBefore(b, a.firstChild);  // поместить потомка в цепляющийся блок первым
        var l = a.childNodes.length;
        for (var i = 1; i < l; i++) {  // переместить во вновь созданного потомка всех остальных потомков (итого: создан потомок-обёртка, внутри которого по прежнему работают скрипты)
          b.appendChild(a.childNodes[1]);
        }
        a.style.height = b.getBoundingClientRect().height + 'px';  // если под скользящим элементом есть другие блоки, можно своё значение
        a.style.padding = '0';
        a.style.border = '0';  // если элементу присвоен padding или border
      }
      if (a.getBoundingClientRect().top <= 0) { // elem.getBoundingClientRect() возвращает в px координаты элемента относительно верхнего левого угла области просмотра окна браузера
        b.className = 'sticky';
      } else {
        b.className = '';
      }
      window.addEventListener('resize', function () {
        a.children[0].style.width = getComputedStyle(a, '').width
      }, false);  // если изменить размер окна браузера, измениться ширина элемента
    }
  })();

  /*endfixed menu*/



  //
  /*gallery-slider*/
  $('.gallery-slider').slick({
    autoplay: true,
    autoplaySpeed: 3000,
    slidesToShow: 3,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1
        }
      }
    ],
    arrows:false,
    dots:false
  });

  /*main-slider*/
  $('.main-slider').slick({
    autoplay: true,
    autoplaySpeed: 3000,
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: true,
    arrows:true,
    dots:false
  });



  //scroll-top
  $(".scroll-top-btn").hide();
  $(function () {
    $(window).scroll(function () {
      if ($(this).scrollTop() > 200) {
        $('.scroll-top-btn').fadeIn();
      } else {
        $('.scroll-top-btn').fadeOut();
      }
    });
    $('.scroll-top-btn').click(function () {
      $('body,html').animate({
        scrollTop: 0
      }, 600);
      return false;
    });
  });
  //end-scroll-top




});