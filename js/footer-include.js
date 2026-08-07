(function () {
  'use strict';

  var slots = document.querySelectorAll('[data-site-footer]');
  if (!slots.length) return;

  /* Inline fallback when fetch fails (file://, offline, wrong base path on mobile). */
  var FALLBACK =
    '<footer>' +
    '<div class="footer-contact main-page-text-fixed">' +
    '<h1><span data-i18n data-ru="Нам можно написать на&nbsp;" data-en="You can write to us by&nbsp;">Нам можно написать на </span>' +
    '<a href="mailto:hi@flowerdog.studio" class="main-page-header__cta" data-i18n data-ru="почту" data-en="email">почту</a>' +
    '<span data-i18n data-ru=" или&nbsp;в&nbsp;" data-en=" or&nbsp;on&nbsp;"> или в </span>' +
    '<a href="https://t.me/dmitry2man" class="main-page-header__cta" data-i18n data-ru="телеграм" data-en="Telegram">телеграм</a></h1>' +
    '</div>' +
    '<div class="ids__space XL"></div>' +
    '<h1 class="footer-brand">flowerdog 2024 → 2026</h1>' +
    '</footer>';

  function inject(markup) {
    slots.forEach(function (slot) {
      slot.innerHTML = markup;
    });
    document.dispatchEvent(new CustomEvent('site:footer-ready'));
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
