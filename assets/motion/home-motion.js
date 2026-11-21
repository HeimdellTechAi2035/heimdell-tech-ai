/* CSS 3D enhancement: no libraries, network requests, canvas, telemetry or text changes. */
(function () {
  'use strict';
  if (window.__heimdellMotion) return;
  window.__heimdellMotion = true;

  function init() {
    var hero = document.querySelector('.mot-hero');
    if (!hero || !window.matchMedia || !('IntersectionObserver' in window)) return;
    var root = document.documentElement;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var capablePointer = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
    var connection = navigator.connection;
    var lowPower = Boolean((connection && connection.saveData) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
    var active = false;
    var heroVisible = false;
    var frame = 0;
    var pointerState = null;
    var revealObserver = null;
    var revealTargets = [];
    var currentCard = null;
    var resetTimers = new Map();
    root.classList.add('hm-motion-ready');

    function decorative(className) {
      var el = document.createElement('span');
      el.className = className;
      el.setAttribute('aria-hidden', 'true');
      return el;
    }

    var backdrop = decorative('hm-backdrop');
    var anchor = decorative('hm-orbit-anchor');
    var globe = decorative('hm-globe');
    for (var i = 0; i < 8; i++) {
      var ring = decorative('hm-ring');
      ring.style.setProperty('--hm-angle', (i * 22.5) + 'deg');
      globe.appendChild(ring);
    }
    for (var j = 1; j < 4; j++) {
      var latitude = decorative('hm-ring hm-latitude');
      latitude.style.setProperty('--hm-angle', (j * 45) + 'deg');
      globe.appendChild(latitude);
    }
    for (var n = 0; n < 8; n++) {
      var node = decorative('hm-node');
      node.style.setProperty('--hm-node-angle', (n * 45) + 'deg');
      node.style.setProperty('--hm-radius', (n % 2 ? 39 : 47) + 'cqw');
      node.style.setProperty('--hm-node-z', (n % 2 ? 22 : -22) + 'px');
      globe.appendChild(node);
    }
    anchor.style.containerType = 'inline-size';
    anchor.appendChild(globe);
    backdrop.appendChild(anchor);
    backdrop.appendChild(decorative('hm-satellite'));
    hero.classList.add('hm-hero');
    hero.insertBefore(backdrop, hero.firstChild);

    var cards = Array.from(document.querySelectorAll(
      '.mot-home-addition article, .pillar-card, .step-card, .outcome-card, ' +
      '.audience-card, .calc-card, .pricing-card, .service-card, .process-step, ' +
      '#services .container > div > div'
    )).filter(function (el) { return !el.querySelector('table, form, input, textarea, select'); });
    cards.forEach(function (card) {
      card.classList.add('hm-card');
      card.insertBefore(decorative('hm-sheen'), card.firstChild);
    });
    revealTargets = Array.from(new Set(cards.concat(Array.from(document.querySelectorAll(
      '.mot-home-addition h2, #services h2, #agent-standards h2, #agent-process h2'
    )))));
    revealTargets.forEach(function (el) {
      el.addEventListener('animationend', function (event) {
        if (event.target === el && event.animationName === 'hm-arrive') el.classList.add('hm-arrived');
      });
    });

    function stopFrame() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      pointerState = null;
    }

    function queue(state) {
      pointerState = state;
      if (frame) return;
      // At most one style write per display frame. No idle JavaScript animation loop.
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        if (!active || !pointerState) return;
        var s = pointerState;
        pointerState = null;
        s.el.style.setProperty(s.hero ? '--hm-hero-x' : '--hm-card-x', s.x + 'deg');
        s.el.style.setProperty(s.hero ? '--hm-hero-y' : '--hm-card-y', s.y + 'deg');
      });
    }

    function resetCard(card) {
      card.style.removeProperty('--hm-card-x');
      card.style.removeProperty('--hm-card-y');
      if (resetTimers.has(card)) window.clearTimeout(resetTimers.get(card));
      var timer = window.setTimeout(function () {
        card.classList.remove('hm-active');
        resetTimers.delete(card);
      }, 200);
      resetTimers.set(card, timer);
      if (currentCard === card) currentCard = null;
    }

    cards.forEach(function (card) {
      var bounds = null;
      card.addEventListener('pointerenter', function (event) {
        if (!active || event.pointerType === 'touch') return;
        if (resetTimers.has(card)) {
          window.clearTimeout(resetTimers.get(card));
          resetTimers.delete(card);
        }
        bounds = card.getBoundingClientRect();
        currentCard = card;
        card.classList.add('hm-active');
      }, { passive: true });
      card.addEventListener('pointermove', function (event) {
        if (!active || !bounds || currentCard !== card || event.pointerType === 'touch') return;
        var x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5));
        var y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5));
        queue({ el: card, x: -y * 5, y: x * 5, hero: false });
      }, { passive: true });
      card.addEventListener('pointerleave', function () { bounds = null; stopFrame(); resetCard(card); }, { passive: true });
      card.addEventListener('pointercancel', function () { bounds = null; stopFrame(); resetCard(card); }, { passive: true });
      card.addEventListener('focusin', function () { bounds = null; stopFrame(); resetCard(card); });
    });

    var heroBounds = null;
    hero.addEventListener('pointerenter', function () { heroBounds = hero.getBoundingClientRect(); }, { passive: true });
    hero.addEventListener('pointermove', function (event) {
      if (!active || !heroVisible || !heroBounds || currentCard || event.pointerType === 'touch') return;
      var x = Math.max(-.5, Math.min(.5, (event.clientX - heroBounds.left) / heroBounds.width - .5));
      var y = Math.max(-.5, Math.min(.5, (event.clientY - heroBounds.top) / heroBounds.height - .5));
      queue({ el: anchor, x: -12 - y * 10, y: -20 + x * 14, hero: true });
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      heroBounds = null;
      if (!currentCard) stopFrame();
      anchor.style.removeProperty('--hm-hero-x');
      anchor.style.removeProperty('--hm-hero-y');
    }, { passive: true });

    var heroObserver = new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      backdrop.classList.toggle('hm-in-view', heroVisible);
      hero.classList.toggle('hm-hero-visible', heroVisible);
      if (!heroVisible && !currentCard) stopFrame();
    }, { threshold: 0 });
    heroObserver.observe(hero);

    function sync() {
      active = !reduced.matches && capablePointer.matches && !lowPower && !document.hidden;
      root.classList.toggle('hm-running', active);
      root.classList.toggle('hm-hidden', document.hidden);
      if (revealObserver) { revealObserver.disconnect(); revealObserver = null; }
      if (!active) {
        stopFrame();
        revealTargets.forEach(function (el) {
          if (el.classList.contains('hm-entered')) el.classList.add('hm-arrived');
        });
        cards.forEach(function (card) {
          if (resetTimers.has(card)) window.clearTimeout(resetTimers.get(card));
          card.classList.remove('hm-active');
          card.style.removeProperty('--hm-card-x');
          card.style.removeProperty('--hm-card-y');
        });
        resetTimers.clear();
        currentCard = null;
        return;
      }
      revealObserver = new IntersectionObserver(function (entries) {
        if (!active || !revealObserver) return;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('hm-entered');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: .08 });
      revealTargets.forEach(function (el, index) {
        if (el.classList.contains('hm-entered')) return;
        el.classList.add('hm-reveal');
        el.style.setProperty('--hm-delay', ((index % 3) * 45) + 'ms');
        revealObserver.observe(el);
      });
    }

    [reduced, capablePointer].forEach(function (query) {
      if (query.addEventListener) query.addEventListener('change', sync);
      else if (query.addListener) query.addListener(sync);
    });
    if (connection && connection.addEventListener) connection.addEventListener('change', function () {
      lowPower = Boolean(connection.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', function () {
      active = false;
      root.classList.remove('hm-running');
      stopFrame();
    });
    window.addEventListener('pageshow', sync);
    window.addEventListener('resize', function () {
      heroBounds = null;
      if (currentCard) { stopFrame(); resetCard(currentCard); }
    }, { passive: true });
    sync();
  }

  // Let the existing hero paint first. The static document is complete without this script.
  if ('requestIdleCallback' in window) window.requestIdleCallback(init, { timeout: 1800 });
  else window.setTimeout(init, 120);
})();
