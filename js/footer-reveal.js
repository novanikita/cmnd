(function () {
  'use strict';

  var SLIDE_INTERVAL_MS = 150;
  var IMAGE_COUNT = 14;
  var IMAGE_PATH = 'images/footer-animation/footer-';

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function buildImageList() {
    var list = [];
    for (var i = 1; i <= IMAGE_COUNT; i += 1) {
      var num = i < 10 ? '0' + i : String(i);
      list.push(IMAGE_PATH + num + '.avif');
    }
    return list;
  }

  function initReveal(slot) {
    if (!slot || document.documentElement.dataset.footerRevealInit === 'true') return;

    var footer = slot.querySelector('.site-footer');
    if (!footer) return;

    document.documentElement.dataset.footerRevealInit = 'true';

    var liftRoot = document.createElement('div');
    liftRoot.className = 'site-footer-reveal__lift';

    var main = document.querySelector('main');
    var parent = slot.parentNode;

    parent.insertBefore(liftRoot, slot);

    if (main) liftRoot.appendChild(main);
    liftRoot.appendChild(footer);

    slot.remove();

    if (prefersReducedMotion()) return;

    var panel = document.createElement('div');
    panel.className = 'site-footer-reveal__panel';
    panel.setAttribute('aria-hidden', 'true');

    // Frames must be decoded before the first reveal, otherwise the panel
    // slides in empty. They are low priority so they don't fight page load.
    buildImageList().forEach(function (src, index) {
      var img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      img.fetchPriority = 'low';
      img.draggable = false;
      if (index === 0) img.className = 'is-active';
      img.src = src;
      panel.appendChild(img);
    });

    document.body.appendChild(panel);

    // Zero-height snap point: the scroll rests here with the wordmark as the
    // last thing on screen, before the reveal zone below it.
    var stop = document.createElement('div');
    stop.className = 'site-footer-reveal__stop';
    stop.setAttribute('aria-hidden', 'true');
    parent.insertBefore(stop, liftRoot.nextSibling);

    var spacer = document.createElement('div');
    spacer.className = 'site-footer-reveal__spacer';
    spacer.setAttribute('aria-hidden', 'true');
    parent.insertBefore(spacer, stop.nextSibling);

    var panelImages = panel.querySelectorAll('img');
    var slideIndex = 0;
    var slideshowElapsed = 0;
    var lastTick = null;
    var rafId = null;

    function setActiveSlide(index) {
      if (index === slideIndex) return;
      if (panelImages[slideIndex]) panelImages[slideIndex].classList.remove('is-active');
      slideIndex = index;
      if (panelImages[slideIndex]) panelImages[slideIndex].classList.add('is-active');
    }

    function frame() {
      rafId = null;

      var isOpen = window.innerHeight - liftRoot.getBoundingClientRect().bottom > 0.5;
      panel.classList.toggle('is-ready', isOpen);

      if (!isOpen) {
        lastTick = null;
        return;
      }

      var now = performance.now();
      if (lastTick != null) slideshowElapsed += now - lastTick;
      lastTick = now;

      setActiveSlide(Math.floor(slideshowElapsed / SLIDE_INTERVAL_MS) % panelImages.length);
      schedule();
    }

    function schedule() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(frame);
    }

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
  }

  function init() {
    document.querySelectorAll('[data-site-footer]').forEach(initReveal);
  }

  document.addEventListener('site:footer-ready', init);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
