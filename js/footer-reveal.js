(function () {
  'use strict';

  var SLIDE_INTERVAL_MS = 230;
  var AUTO_HIDE_MS = 2000;
  /* Noise filter only — not a pull-distance threshold. */
  var INTENT_PX = 10;
  var REARM_COOLDOWN_MS = 320;
  var IMAGE_COUNT = 14;
  var IMAGE_PATH = 'images/footer-animation/footer-';
  var IDLE = 'idle';
  var ARMED = 'armed';
  var OPEN = 'open';
  var CLOSING = 'closing';

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

    var brand = footer.querySelector('.site-footer__brand') || footer;
    var wordmark = footer.querySelector('.site-footer__wordmark') || brand;

    var panel = document.createElement('div');
    panel.className = 'site-footer-reveal__panel';
    panel.setAttribute('aria-hidden', 'true');
    document.body.appendChild(panel);

    var state = IDLE;
    var framesReady = false;
    var framesRequested = false;
    var pendingOpen = false;
    var panelImages = [];
    var slideIndex = 0;
    var slideshowElapsed = 0;
    var lastTick = null;
    var slideRaf = null;
    var hideTimer = null;
    var closeFallbackTimer = null;
    var cooldownUntil = 0;
    var lockedScrollY = 0;
    var touchStartY = null;
    var touchFromArmed = false;
    var html = document.documentElement;

    function setActiveSlide(index) {
      if (!panelImages.length) return;
      if (index === slideIndex && panelImages[slideIndex] &&
          panelImages[slideIndex].classList.contains('is-active')) {
        return;
      }
      if (panelImages[slideIndex]) panelImages[slideIndex].classList.remove('is-active');
      slideIndex = index;
      if (panelImages[slideIndex]) panelImages[slideIndex].classList.add('is-active');
    }

    function syncHtmlFlags() {
      html.classList.toggle('is-footer-reveal-armed', state === ARMED);
      html.classList.toggle('is-footer-reveal-open', state === OPEN);
      html.classList.toggle('is-footer-reveal-closing', state === CLOSING);
      document.dispatchEvent(new CustomEvent('site:footer-reveal-state'));
    }

    function clearHideTimer() {
      if (!hideTimer) return;
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }

    function startHideTimer() {
      clearHideTimer();
      hideTimer = window.setTimeout(function () {
        hideTimer = null;
        closeReveal();
      }, AUTO_HIDE_MS);
    }

    function bumpHideTimer() {
      if (state === OPEN) startHideTimer();
    }

    function lockScroll() {
      lockedScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.style.position = 'fixed';
      document.body.style.top = '-' + lockedScrollY + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }

    function unlockScroll() {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, lockedScrollY);
    }

    function stopSlideshow() {
      if (slideRaf) {
        window.cancelAnimationFrame(slideRaf);
        slideRaf = null;
      }
      lastTick = null;
    }

    function tickSlideshow(now) {
      slideRaf = null;
      if (state !== OPEN) {
        lastTick = null;
        return;
      }
      if (lastTick != null) slideshowElapsed += now - lastTick;
      lastTick = now;
      if (panelImages.length) {
        setActiveSlide(Math.floor(slideshowElapsed / SLIDE_INTERVAL_MS) % panelImages.length);
      }
      slideRaf = window.requestAnimationFrame(tickSlideshow);
    }

    function startSlideshow() {
      if (slideRaf) return;
      lastTick = null;
      slideRaf = window.requestAnimationFrame(tickSlideshow);
    }

    function ensureFrames() {
      if (framesRequested) return;
      framesRequested = true;

      var pending = IMAGE_COUNT;

      function onFrameSettled(img) {
        if (img.dataset.settled === 'true') return;
        img.dataset.settled = 'true';
        pending -= 1;
        if (pending <= 0) {
          framesReady = true;
          if (pendingOpen) {
            pendingOpen = false;
            openReveal();
          }
        }
      }

      buildImageList().forEach(function (src, index) {
        var img = document.createElement('img');
        img.alt = '';
        img.decoding = 'async';
        img.draggable = false;
        if (index === 0) img.className = 'is-active';
        img.addEventListener('load', function () { onFrameSettled(img); });
        img.addEventListener('error', function () { onFrameSettled(img); });
        img.src = src;
        if (img.complete) onFrameSettled(img);
        panel.appendChild(img);
        panelImages.push(img);
      });
    }

    function atDocumentEnd() {
      var maxScroll = Math.max(0, html.scrollHeight - window.innerHeight);
      return (window.scrollY || window.pageYOffset || 0) >= maxScroll - 1;
    }

    function canArm() {
      if (Date.now() < cooldownUntil) return false;
      if (!atDocumentEnd()) return false;
      var rect = wordmark.getBoundingClientRect();
      var vh = window.innerHeight || html.clientHeight;
      if (rect.height <= 0) return false;
      /* Page cannot scroll further and flowerdog is on screen — that is the end. */
      return rect.top < vh && rect.bottom > 0;
    }

    function evaluateArm() {
      if (state === OPEN || state === CLOSING) return;
      if (canArm()) {
        if (state !== ARMED) {
          state = ARMED;
          ensureFrames();
          syncHtmlFlags();
        }
      } else if (state === ARMED) {
        state = IDLE;
        syncHtmlFlags();
      }
    }

    function openReveal() {
      if (state === OPEN || state === CLOSING) return;
      if (!framesReady) {
        pendingOpen = true;
        ensureFrames();
        return;
      }

      pendingOpen = false;
      state = OPEN;
      syncHtmlFlags();

      lockScroll();
      liftRoot.classList.add('is-open');
      liftRoot.classList.remove('is-closing');
      panel.classList.add('is-ready');
      panel.setAttribute('aria-hidden', 'false');

      startHideTimer();
      startSlideshow();
    }

    function finishClose() {
      if (state !== CLOSING) return;

      clearCloseFallback();
      panel.classList.remove('is-ready');
      panel.setAttribute('aria-hidden', 'true');
      liftRoot.classList.remove('is-closing');

      unlockScroll();
      cooldownUntil = Date.now() + REARM_COOLDOWN_MS;
      state = IDLE;
      syncHtmlFlags();
      window.requestAnimationFrame(evaluateArm);
    }

    function clearCloseFallback() {
      if (!closeFallbackTimer) return;
      window.clearTimeout(closeFallbackTimer);
      closeFallbackTimer = null;
    }

    function closeReveal() {
      if (state !== OPEN) return;

      clearHideTimer();
      stopSlideshow();
      clearCloseFallback();

      state = CLOSING;
      syncHtmlFlags();

      liftRoot.classList.remove('is-open');
      liftRoot.classList.add('is-closing');
      /* Unlock after the curtain settles so the page does not jump mid-motion. */
      closeFallbackTimer = window.setTimeout(function () {
        closeFallbackTimer = null;
        finishClose();
      }, 700);
    }

    function onLiftTransitionEnd(event) {
      if (event.target !== liftRoot) return;
      if (event.propertyName !== 'transform') return;
      if (state === CLOSING) {
        clearCloseFallback();
        finishClose();
      }
    }

    function requestOpenFromGesture() {
      if (state === OPEN) {
        bumpHideTimer();
        return;
      }
      if (state !== ARMED) return;
      openReveal();
    }

    liftRoot.addEventListener('transitionend', onLiftTransitionEnd);

    if (typeof IntersectionObserver === 'function') {
      var brandObserver = new IntersectionObserver(function () {
        evaluateArm();
      }, {
        root: null,
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
        rootMargin: '0px'
      });
      brandObserver.observe(wordmark);

      var preloadObserver = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          ensureFrames();
          preloadObserver.disconnect();
        }
      }, { root: null, rootMargin: '400px 0px', threshold: 0 });
      preloadObserver.observe(footer);
    }

    window.addEventListener('scroll', evaluateArm, { passive: true });
    window.addEventListener('resize', evaluateArm);

    window.addEventListener('wheel', function (event) {
      if (state === OPEN) {
        bumpHideTimer();
        return;
      }
      if (state === CLOSING) return;

      evaluateArm();

      if (state !== ARMED) return;

      if (event.deltaY > 0) {
        requestOpenFromGesture();
      } else if (event.deltaY < 0) {
        state = IDLE;
        syncHtmlFlags();
      }
    }, { passive: true });

    window.addEventListener('touchstart', function (event) {
      var touch = event.touches && event.touches[0];
      if (!touch) return;

      if (state === OPEN) {
        bumpHideTimer();
        touchStartY = touch.clientY;
        touchFromArmed = false;
        return;
      }

      evaluateArm();
      touchStartY = touch.clientY;
      touchFromArmed = state === ARMED;
    }, { passive: true });

    window.addEventListener('touchmove', function (event) {
      var touch = event.touches && event.touches[0];
      if (!touch || touchStartY == null) return;

      var delta = touchStartY - touch.clientY;

      if (state === OPEN) {
        bumpHideTimer();
        return;
      }
      if (state === CLOSING) return;

      if (touchFromArmed && state === ARMED && delta > INTENT_PX) {
        touchFromArmed = false;
        requestOpenFromGesture();
      }
    }, { passive: true });

    function endTouch() {
      touchStartY = null;
      touchFromArmed = false;
      if (state === OPEN) bumpHideTimer();
      else evaluateArm();
    }

    window.addEventListener('touchend', endTouch, { passive: true });
    window.addEventListener('touchcancel', endTouch, { passive: true });

    /* Safety: if transitionend is missed, still unlock. */
    liftRoot.addEventListener('transitioncancel', function (event) {
      if (event.target !== liftRoot) return;
      if (state === CLOSING) finishClose();
    });

    evaluateArm();
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
