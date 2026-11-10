// Site interactions: theme, menu, scroll effects, typing headline, timeline.
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  /* ---------- Theme toggle (initial theme is set in <head>) ---------- */
  var themeBtn = $('.theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }
  // Follow the system setting unless the visitor picked a theme.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (err) {}
    if (!saved) root.dataset.theme = e.matches ? 'dark' : 'light';
  });

  /* ---------- Nav: mobile menu + border on scroll ---------- */
  var nav = $('.site-nav');
  var menuBtn = $('.menu-toggle');
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    $$('.nav-links a', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Reveal sections as they scroll into view ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); revealer.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { revealer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Highlight the nav link for the section in view ---------- */
  var spyLinks = $$('.nav-links a[href^="#"]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        spyLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spyLinks.forEach(function (a) {
      var section = document.getElementById(a.getAttribute('href').slice(1));
      if (section) spy.observe(section);
    });
  }

  /* ---------- Typing headline ---------- */
  var typed = $('[data-rotate]');
  if (typed && !reduceMotion) {
    var words = typed.getAttribute('data-rotate').split('|');
    var i = 0, n = words[0].length, deleting = true;
    var step = function () {
      var word = words[i];
      if (deleting) {
        n--;
        typed.textContent = word.slice(0, n);
        if (n > 0) return setTimeout(step, 28);
        deleting = false;
        i = (i + 1) % words.length;
        return setTimeout(step, 350);
      }
      n++;
      typed.textContent = word.slice(0, n);
      if (n < word.length) return setTimeout(step, 55);
      deleting = true;
      setTimeout(step, 2400);
    };
    setTimeout(step, 2600);
  }

  /* ---------- Timeline: fill the dot of the entry being read or hovered ---------- */
  var stops = $$('.tl-item');
  function markCurrent(stop) {
    stops.forEach(function (s) { s.classList.toggle('is-current', s === stop); });
  }
  stops.forEach(function (s) {
    s.addEventListener('mouseenter', function () { markCurrent(s); });
  });
  if (stops.length && 'IntersectionObserver' in window) {
    var reader = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) markCurrent(e.target); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    stops.forEach(function (s) { reader.observe(s); });
  }
})();
