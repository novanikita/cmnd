(function () {
  'use strict';

  var PANEL_HEIGHT = 260;
  var RESET_DELAY_MS = 140;
  var SLIDE_INTERVAL_MS = 150;
  var IMAGE_COUNT = 16;
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

  function loadRevealScript() {
    if (document.querySelector('[data-footer-reveal-loaded]')) return;
    document.documentElement.setAttribute('data-footer-reveal-loaded', 'true');
  }

  function initSlot(slot) {
    if (!slot || slot.dataset.footerRevealInit === 'true') return;

    var footer = slot.querySelector('.site-footer');
    if (!footer) return;

    slot.dataset.footerRevealInit = 'true';

    var images = buildImageList();
    var wrapper = document.createElement('div');
    wrapper.className = 'site-footer-reveal';

    var panel = document.createElement('div');
    panel.className = 'site-footer-reveal__panel';
    panel.setAttribute('aria-hidden', 'true');

    images.forEach(function (src, index) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.decoding = 'async';
      img.loading = index === 0 ? 'eager' : 'lazy';
      img.draggable = false;
      if (index === 0) img.className = 'is-active';
      panel.appendChild(img);
    });

    var sheet = document.createElement('div');
    sheet.className = 'site-footer-reveal__sheet';
    sheet.appendChild(footer);

    var sentinel = document.createElement('div');
    sentinel.className = 'site-footer-reveal__sentinel';
    sentinel.setAttribute('aria-hidden', 'true');

    wrapper.appendChild(panel);
    wrapper.appendChild(sheet);
    wrapper.appendChild(sentinel);
    slot.appendChild(wrapper);

    if (prefersReducedMotion()) return;

    var accumulated = 0;
    var currentY = 0;
    var targetY = 0;
    var resetTimer = null;
    var footerVisible = false;
    var slideIndex = 0;
    var slideStart = 0;
    var rafId = null;
    var touchStartY = null;

    var panelImages = panel.querySelectorAll('img');

    function setActiveSlide(index) {
      if (index === slideIndex) return;
      if (panelImages[slideIndex]) panelImages[slideIndex].classList.remove('is-active');
      slideIndex = index;
      if (panelImages[slideIndex]) panelImages[slideIndex].classList.add('is-active');
    }

    function resetLift() {
      accumulated = 0;
      targetY = 0;
    }

    function applyLift(delta) {
      accumulated = Math.max(0, accumulated + delta);
      targetY = -PANEL_HEIGHT * (1 - Math.exp(-accumulated / 500));
    }

    function scheduleReset() {
      if (resetTimer) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(function () {
        resetTimer = null;
        resetLift();
      }, RESET_DELAY_MS);
    }

    function animate() {
      currentY += (targetY - currentY) * 0.18;
      if (Math.abs(targetY - currentY) < 0.35) currentY = targetY;

      if (Math.abs(currentY) > 0.35) {
        sheet.style.transform = 'translate3d(0, ' + currentY.toFixed(2) + 'px, 0)';
        wrapper.classList.add('is-lifted');

        if (!slideStart) slideStart = performance.now();
        var idx = Math.floor((performance.now() - slideStart) / SLIDE_INTERVAL_MS) % panelImages.length;
        setActiveSlide(idx);
      } else {
        sheet.style.transform = '';
        wrapper.classList.remove('is-lifted');
        slideStart = 0;
        setActiveSlide(0);
      }

      if (Math.abs(targetY - currentY) > 0.35 || Math.abs(targetY) > 0.35) {
        rafId = window.requestAnimationFrame(animate);
      } else {
        rafId = null;
        sheet.style.transform = Math.abs(targetY) > 0.35 ? sheet.style.transform : '';
      }
    }

    function requestAnimate() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(animate);
    }

    function onWheel(event) {
      if (!footerVisible) return;
      if (!(accumulated > 0 || event.deltaY > 0)) return;

      applyLift(event.deltaY);
      scheduleReset();
      requestAnimate();
    }

    function onTouchStart(event) {
      if (!footerVisible) return;
      var touch = event.touches && event.touches[0];
      if (!touch) return;
      touchStartY = touch.clientY;
    }

    function onTouchMove(event) {
      if (!footerVisible || touchStartY == null) return;
      var touch = event.touches && event.touches[0];
      if (!touch) return;

      var delta = touchStartY - touch.clientY;
      touchStartY = touch.clientY;
      if (!(accumulated > 0 || delta > 0)) return;

      applyLift(delta);
      scheduleReset();
      requestAnimate();
    }

    function onTouchEnd() {
      touchStartY = null;
      scheduleReset();
    }

    var observer = new IntersectionObserver(function (entries) {
      footerVisible = entries.some(function (entry) { return entry.isIntersecting; });
      wrapper.classList.toggle('is-ready', footerVisible);
      if (!footerVisible) {
        resetLift();
        requestAnimate();
      }
    }, { threshold: 0 });

    observer.observe(sentinel);

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  function init() {
    loadRevealScript();
    document.querySelectorAll('[data-site-footer]').forEach(initSlot);
  }

  document.addEventListener('site:footer-ready', init);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
