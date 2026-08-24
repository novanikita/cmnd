(function () {
  'use strict';

  var slots = document.querySelectorAll('[data-site-footer]');
  if (!slots.length) return;

  /* Inline fallback when fetch fails (file://, offline, wrong base path on mobile). */
  var FALLBACK =
    '<footer class="site-footer">' +
    '<div class="site-footer__top">' +
    '<div class="site-footer__contact">' +
    '<a class="site-footer__email" href="mailto:hi@flowerdog.studio">hi@flowerdog.studio</a>' +
    '<p class="site-footer__contact-note">' +
    '<span data-i18n data-ru="Пишите нам на&nbsp;" data-en="Write to us by&nbsp;">Пишите нам на </span>' +
    '<a href="mailto:hi@flowerdog.studio" class="site-footer__link" data-i18n data-ru="почту" data-en="email">почту</a>' +
    '<span data-i18n data-ru=" или&nbsp;в&nbsp;" data-en=" or&nbsp;on&nbsp;"> или в </span>' +
    '<a href="https://t.me/dmitry2man" class="site-footer__link" data-i18n data-ru="телеграм" data-en="Telegram">телеграм</a>' +
    '</p></div>' +
    '<nav class="site-footer__nav" aria-label="Footer">' +
    '<a class="site-footer__nav-link" href="portfolio.html" data-i18n data-ru="Проекты" data-en="Projects">Проекты</a>' +
    '<a class="site-footer__nav-link" href="audit.html" data-i18n data-ru="Аудит" data-en="Audit">Аудит</a>' +
    '<a class="site-footer__nav-link" href="how-we-work.html" data-i18n data-ru="Как мы работаем" data-en="How we work">Как мы работаем</a>' +
    '<a class="site-footer__nav-link" href="about.html" data-i18n data-ru="О нас" data-en="About">О нас</a>' +
    '<a class="site-footer__nav-link" href="https://t.me/dmitry2man" data-i18n data-ru="Канал студии" data-en="Studio channel">Канал студии</a>' +
    '</nav>' +
    '<div class="site-footer__legal">' +
    '<p class="site-footer__legal-item"><span data-i18n data-ru="ИП Туманов Дмитрий Олегович, ИНН 272198797725, Россия, Москва." data-en="IE Dmitry Olegovich Tumanov, TIN 272198797725, Russian Federation, Moscow.">ИП Туманов Дмитрий Олегович, ИНН 272198797725, Россия, Москва.</span></p>' +
    '<p class="site-footer__legal-item"><span data-i18n data-ru="ИП Новохатский Максим Дмитриевич, ИИН/БИН: 990618350962, Казахстан, Астана" data-en="IE Maksim Dmitrievich Novokhatskiy, IIN/BIN 990618350962, Republic of Kazakhstan, Astana">ИП Новохатский Максим Дмитриевич, ИИН/БИН: 990618350962, Казахстан, Астана</span></p>' +
    '</div></div>' +
    '<div class="site-footer__brand">' +
    '<img class="site-footer__flower" src="images/icon/flower.svg" width="120" height="88" alt="" aria-hidden="true" draggable="false">' +
    '<h1 class="site-footer__wordmark">flowerdog</h1>' +
    '</div>' +
    '</footer>';

  function loadFooterReveal() {
    if (document.querySelector('script[data-footer-reveal-script]')) return;
    var script = document.createElement('script');
    script.src = 'js/footer-reveal.js';
    script.dataset.footerRevealScript = 'true';
    document.body.appendChild(script);
  }

  function inject(markup) {
    slots.forEach(function (slot) {
      slot.innerHTML = markup;
    });
    document.dispatchEvent(new CustomEvent('site:footer-ready'));
    loadFooterReveal();
  }

  fetch('partials/footer.html')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Failed to load footer partial');
      }
      return response.text();
    })
    .then(function (markup) {
      if (!markup || !String(markup).trim()) {
        throw new Error('Empty footer partial');
      }
      inject(markup);
    })
    .catch(function () {
      inject(FALLBACK);
    });
})();
