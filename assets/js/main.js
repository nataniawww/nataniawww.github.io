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

  /* ---------- Bookshelf: covers from the Goodreads "read" shelf ----------
     Goodreads has no open feed for members-only profiles, but its "custom widget"
     script still lists the shelf. The script writes its HTML into the element with
     id gr_custom_widget_<widget_id>. We hand it a <template>, so nothing in it renders
     or loads, then read the titles, authors, ratings and covers out of it. */
  var shelfWrap = $('[data-goodreads]');
  if (shelfWrap) loadShelf(shelfWrap);

  function loadShelf(wrap) {
    var user = wrap.getAttribute('data-goodreads');
    var holder = document.createElement('template');
    holder.id = 'gr_custom_widget_shelf';
    document.body.appendChild(holder);

    var done = false;
    var finish = function (ok) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      var books = ok ? readWidget(holder.content) : [];
      holder.remove();
      if (books.length) buildShelf(wrap, books);
      else wrap.remove();               // the "My Goodreads" button still links there
    };
    var timer = setTimeout(function () { finish(false); }, 12000);

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.goodreads.com/review/custom_widget/' + encodeURIComponent(user) +
      '?shelf=read&sort=date_read&order=d&num_books=200' +
      '&show_cover=1&show_title=1&show_author=1&show_rating=1&show_review=1&widget_id=shelf';
    s.onload = function () { finish(true); };
    s.onerror = function () { finish(false); };
    document.body.appendChild(s);
  }

  function readWidget(root) {
    var text = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
    return $$('.gr_custom_each_container_shelf', root).map(function (item) {
      // Class names end in the widget_id ("shelf"), e.g. gr_custom_title_shelf.
      var part = function (name, sel) {
        var el = item.querySelector('.gr_custom_' + name + '_shelf');
        return el && sel ? el.querySelector(sel) : el;
      };
      var img = part('book_container', 'img');
      var src = img ? img.getAttribute('src') || '' : '';
      var link = part('title', 'a');
      var url = link ? link.getAttribute('href') || '' : '';
      var id = src.match(/\/books\/\d+[a-z]\/(\d+)[._]/);
      var rating = part('rating');
      return {
        title: text(part('title')) || (img && img.getAttribute('alt')) || '',
        author: text(part('author', 'a')),
        rating: rating ? rating.querySelectorAll('img[src*="star_active"]').length : 0,
        review: text(part('review')),
        cover: /^https:\/\/i\.gr-assets\.com\//.test(src) && !/nophoto/.test(src) ? src : '',
        // Book pages are public; review pages ask visitors to sign in.
        href: id ? 'https://www.goodreads.com/book/show/' + id[1]
                 : (/^https:\/\/www\.goodreads\.com\//.test(url) ? url : '')
      };
    }).filter(function (b) { return b.title && b.href; });
  }

  // Goodreads serves any height by changing the ._SX98_ part of the cover URL.
  function coverAt(src, height) {
    return src.replace(/(\._[^/]*_)?(\.(?:jpe?g|png))$/i, '._SY' + height + '_$2');
  }

  function buildShelf(wrap, books) {
    var shelf = $('.shelf', wrap);
    var caption = $('.shelf-caption', wrap);
    var nav = $('.shelf-nav');
    var canHover = window.matchMedia('(hover: hover)').matches;
    var frag = document.createDocumentFragment();

    books.forEach(function (b, i) {
      var li = document.createElement('li');
      li.className = 'book';
      li.dataset.i = i;
      var a = document.createElement('a');
      a.href = b.href;
      a.setAttribute('aria-label', b.title + (b.author ? ' by ' + b.author : '') +
        (b.rating ? ', rated ' + b.rating + ' out of 5' : ''));
      if (b.cover) {
        var img = document.createElement('img');
        img.src = coverAt(b.cover, 240);
        img.srcset = coverAt(b.cover, 240) + ' 1x, ' + coverAt(b.cover, 480) + ' 2x';
        img.alt = '';
        img.width = 120; img.height = 180;
        img.loading = 'lazy'; img.decoding = 'async';
        a.appendChild(img);
      } else {
        var blank = document.createElement('span');
        blank.className = 'book-blank';
        blank.textContent = b.title;
        a.appendChild(blank);
      }
      li.appendChild(a);
      frag.appendChild(li);
    });
    shelf.appendChild(frag);

    function showCaption(b) {
      caption.textContent = '';
      if (!b) return;
      var add = function (tag, cls, txt) {
        var el = document.createElement(tag);
        if (cls) el.className = cls;
        if (txt) el.textContent = txt;
        return el;
      };
      caption.appendChild(add('span', 'cap-title', b.title));
      if (b.author || b.rating) {
        var meta = add('span', 'cap-meta', b.author);
        if (b.rating) {
          var stars = add('span', 'stars');
          stars.appendChild(add('b', '', '★★★★★'.slice(0, b.rating)));
          stars.appendChild(document.createTextNode('★★★★★'.slice(b.rating)));
          meta.appendChild(stars);
        }
        caption.appendChild(meta);
      }
      if (b.review) caption.appendChild(add('span', 'cap-review', '“' + b.review + '”'));
    }

    var active = null;
    function setActive(li) {
      if (li === active) return;
      if (active) active.classList.remove('is-active');
      active = li;
      shelf.classList.toggle('has-active', !!li);
      if (li) li.classList.add('is-active');
      showCaption(li ? books[li.dataset.i] : null);
    }

    var items = $$('.book', shelf);
    // Mouse and keyboard: the hovered or focused cover is in focus.
    shelf.addEventListener('mouseover', function (e) {
      var li = e.target.closest('.book');
      if (li) setActive(li);
    });
    shelf.addEventListener('mouseleave', function () {
      if (!shelf.contains(document.activeElement)) setActive(null);
    });
    shelf.addEventListener('focusin', function (e) { setActive(e.target.closest('.book')); });
    shelf.addEventListener('focusout', function (e) {
      if (!shelf.contains(e.relatedTarget)) setActive(null);
    });

    // Touch: the cover nearest the middle of the strip is in focus.
    var ticking = false;
    function centerActive() {
      ticking = false;
      var mid = shelf.scrollLeft + shelf.clientWidth / 2, best = null, bestDist = Infinity;
      items.forEach(function (li) {
        var d = Math.abs(li.offsetLeft + li.offsetWidth / 2 - mid);
        if (d < bestDist) { bestDist = d; best = li; }
      });
      setActive(best);
    }

    // Arrow buttons, greyed out at either end.
    var steps = nav ? $$('[data-shelf-step]', nav) : [];
    function updateNav() {
      if (!nav) return;
      var max = shelf.scrollWidth - shelf.clientWidth;
      nav.hidden = max < 4;
      steps[0].disabled = shelf.scrollLeft < 4;
      steps[1].disabled = shelf.scrollLeft > max - 4;
    }
    steps.forEach(function (btn) {
      btn.addEventListener('click', function () {
        shelf.scrollBy({
          left: Number(btn.getAttribute('data-shelf-step')) * shelf.clientWidth * 0.8,
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      });
    });

    shelf.addEventListener('scroll', function () {
      updateNav();
      if (!canHover && !ticking) { ticking = true; requestAnimationFrame(centerActive); }
    }, { passive: true });
    window.addEventListener('resize', updateNav);

    updateNav();
    if (!canHover) centerActive();
  }
})();
