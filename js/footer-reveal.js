(function () {
  'use strict';

  var SLIDE_INTERVAL_MS = 230;
  var AUTO_HIDE_MS = 2000;
  var RELEASE_DELAY_MS = 140;
  var RESISTANCE = 380;
  var EASING_OPEN = 0.18;
  var EASING_CLOSE = 0.07;
  var EASING_CLOSE_MOBILE = 0.16;
  var MOBILE_MAX_WIDTH = 768;
  var GESTURE_GAP_MS = 110;
  var THRESHOLD_PX = 50;
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
    var pending = IMAGE_COUNT;
    var framesReady = false;

    function onFrameSettled(img) {
      if (img.dataset.settled === 'true') return;
      img.dataset.settled = 'true';
      pending -= 1;
      if (pending <= 0) framesReady = true;
    }

    buildImageList().forEach(function (src, index) {
      var img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'eager';
      img.fetchPriority = 'low';
      img.draggable = false;
      if (index === 0) img.className = 'is-active';
      img.addEventListener('load', function () { onFrameSettled(img); });
      img.addEventListener('error', function () { onFrameSettled(img); });
      img.src = src;
      if (img.complete) onFrameSettled(img);
      panel.appendChild(img);
    });

    document.body.appendChild(panel);

    var panelImages = panel.querySelectorAll('img');
    var slideIndex = 0;
    var slideshowElapsed = 0;
    var lastTick = null;

    var overscroll = 0;
    var targetY = 0;
    var currentY = 0;
    var rafId = null;
    var releaseTimer = null;
    var hideTimer = null;
    var touchY = null;
    var armed = false;
    var lastInputTime = 0;

    function setActiveSlide(index) {
      if (index === slideIndex) return;
      if (panelImages[slideIndex]) panelImages[slideIndex].classList.remove('is-active');
      slideIndex = index;
      if (panelImages[slideIndex]) panelImages[slideIndex].classList.add('is-active');
    }

    // Wordmark sits at the visual end of the page: footer bottom is in view.
    function atPageEnd() {
      var rect = footer.getBoundingClientRect();
      return rect.bottom <= window.innerHeight + 8 && rect.top < window.innerHeight;
    }

    function panelHeight() {
      return panel.getBoundingClientRect().height || panel.offsetHeight || 0;
    }

    function isMobileViewport() {
      return window.matchMedia('(max-width: ' + MOBILE_MAX_WIDTH + 'px)').matches;
    }

    function setOverscroll(value) {
      overscroll = value < 0 ? 0 : value;
      var travel = overscroll - THRESHOLD_PX;
      var maxLift = panelHeight();
      targetY = travel <= 0 || maxLift <= 0
        ? 0
        : -maxLift * (1 - Math.exp(-travel / RESISTANCE));
    }

    function clearReleaseTimer() {
      if (!releaseTimer) return;
      window.clearTimeout(releaseTimer);
      releaseTimer = null;
    }

    function clearHideTimer() {
      if (!hideTimer) return;
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }

    function closeReveal() {
      armed = false;
      setOverscroll(0);
      requestFrame();
    }

    function scheduleRelease() {
      clearReleaseTimer();
      releaseTimer = window.setTimeout(function () {
        releaseTimer = null;
        // Keep panel open briefly after the gesture, then auto-hide.
        clearHideTimer();
        hideTimer = window.setTimeout(function () {
          hideTimer = null;
          closeReveal();
        }, AUTO_HIDE_MS);
      }, RELEASE_DELAY_MS);
    }

    function tickSlideshow(isOpen) {
      var now = performance.now();

      if (!isOpen) {
        lastTick = null;
        return;
      }

      if (lastTick != null) slideshowElapsed += now - lastTick;
      lastTick = now;
      setActiveSlide(Math.floor(slideshowElapsed / SLIDE_INTERVAL_MS) % panelImages.length);
    }

    function frame() {
      rafId = null;

      currentY += (targetY - currentY) * (
        targetY < currentY
          ? EASING_OPEN
          : (isMobileViewport() ? EASING_CLOSE_MOBILE : EASING_CLOSE)
      );

      var settled = Math.abs(targetY - currentY) < 0.35;
      if (settled) currentY = targetY;

      var isOpen = currentY < -0.5;

      if (isOpen) {
        liftRoot.style.transform = 'translate3d(0, ' + currentY.toFixed(2) + 'px, 0)';
        liftRoot.classList.add('is-lifted');
      } else {
        liftRoot.style.transform = '';
        liftRoot.classList.remove('is-lifted');
      }

      panel.classList.toggle('is-ready', isOpen);
      tickSlideshow(isOpen);

      // Keep ticking while open so frames advance without further scrolling.
      if (!settled || isOpen) requestFrame();
    }

    function requestFrame() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(frame);
    }

    function pull(delta) {
      if (!framesReady) return;

      var now = performance.now();
      var gap = now - lastInputTime;
      lastInputTime = now;

      if (!atPageEnd()) {
        armed = false;
        return;
      }

      if (!armed) {
        if (delta <= 0 || gap < GESTURE_GAP_MS) return;
        armed = true;
        overscroll = 0;
        clearHideTimer();
      }

      if (delta < 0 && overscroll <= 0) return;

      clearHideTimer();
      setOverscroll(overscroll + delta);
      scheduleRelease();
      requestFrame();
    }

    window.addEventListener('wheel', function (event) {
      pull(event.deltaY);
    }, { passive: true });

    window.addEventListener('touchstart', function (event) {
      var touch = event.touches && event.touches[0];
      touchY = touch ? touch.clientY : null;
      lastInputTime = 0;
    }, { passive: true });

    window.addEventListener('touchmove', function (event) {
      var touch = event.touches && event.touches[0];
      if (!touch || touchY == null) return;
      var delta = touchY - touch.clientY;
      touchY = touch.clientY;
      pull(delta);
    }, { passive: true });

    function endTouch() {
      touchY = null;
      if (overscroll > 0) scheduleRelease();
    }

    window.addEventListener('touchend', endTouch, { passive: true });
    window.addEventListener('touchcancel', endTouch, { passive: true });

    window.addEventListener('resize', function () {
      setOverscroll(overscroll);
      requestFrame();
    });
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
