(function () {
  const lang = document.documentElement.lang === 'en' ? 'en' : 'it';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.header');
  const menu = document.querySelector('.menu');

  // Shared accessibility shortcut, injected once for every full page.
  const main = document.querySelector('main');
  if (main) {
    if (!main.id) main.id = 'main-content';
    const skipLink = document.createElement('a');
    skipLink.className = 'skip-link';
    skipLink.href = `#${main.id}`;
    skipLink.textContent = lang === 'en' ? 'Skip to content' : 'Vai al contenuto';
    document.body.prepend(skipLink);
  }

  // Soft page entrance. The CSS only hides the body after JS has explicitly opted in.
  if (!reduceMotion) {
    document.body.classList.add('page-transition-ready');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => document.body.classList.add('page-visible')),
    );
  }

  // Home hero receives a real transformable image layer while retaining the CSS background as fallback.
  const hero = document.querySelector('.page-home .hero');
  if (hero && !hero.querySelector('.hero-visual')) {
    const visual = document.createElement('div');
    visual.className = 'hero-visual';
    visual.setAttribute('aria-hidden', 'true');
    hero.prepend(visual);
  }

  // Dynamic header.
  function syncHeader() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 18);
  }
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  // Current navigation item.
  const current = (location.pathname.split('/').pop() || 'index.html')
    .toLowerCase()
    .replace('disponibilita.html', 'prenota.html');
  document.querySelectorAll('.links a').forEach((a) => {
    const href = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
    if (href === current) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });

  // Mobile navigation.
  const nav = document.querySelector('.links');
  if (menu && nav) {
    menu.type = 'button';
    const panel = document.createElement('div');
    panel.className = 'mobile-nav-panel';
    panel.id = 'mobile-navigation';
    nav.querySelectorAll('a').forEach((a) => panel.appendChild(a.cloneNode(true)));
    const cta = document.querySelector('.header .cta');
    if (cta) {
      const x = cta.cloneNode(true);
      x.classList.add('mobile-cta');
      panel.appendChild(x);
    }
    document.body.appendChild(panel);
    panel.inert = true;
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-controls', panel.id);
    menu.setAttribute('aria-label', lang === 'en' ? 'Open menu' : 'Apri menu');
    function setOpen(open, restoreFocus = false) {
      panel.inert = !open;
      panel.classList.toggle('open', open);
      document.documentElement.classList.toggle('mobile-menu-open', open);
      menu.textContent = open ? '×' : '☰';
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute(
        'aria-label',
        open
          ? lang === 'en'
            ? 'Close menu'
            : 'Chiudi menu'
          : lang === 'en'
            ? 'Open menu'
            : 'Apri menu',
      );
      if (!open && restoreFocus) menu.focus();
    }
    menu.addEventListener('click', () => setOpen(!panel.classList.contains('open'), true));
    panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open')) {
        setOpen(false, true);
      }
    });
    window.addEventListener(
      'resize',
      () => {
        if (window.innerWidth > 1080 && panel.classList.contains('open')) setOpen(false);
      },
      { passive: true },
    );
    document.addEventListener('click', (e) => {
      if (panel.classList.contains('open') && !panel.contains(e.target) && !menu.contains(e.target))
        setOpen(false);
    });
    window.addEventListener('pageshow', () => setOpen(false));
  }

  // Cinematic scroll cue.
  if (hero) {
    const s = document.createElement('div');
    s.className = 'luxury-scroll';
    s.textContent = lang === 'en' ? 'Explore' : 'Esplora';
    hero.appendChild(s);
  }

  // Scroll reveal. Stagger is intentionally short so it never feels like the page is waiting for itself.
  const groups = [
    [
      '.section-head,.form-wrap,.facts,.official-video,.editorial-copy>div,.gallery-teaser-content,.home-booking-head',
      0,
    ],
    ['.feature,.gallery-card,.card,.fact', 65],
    ['.footer-grid>div', 80],
  ];
  const targets = [];
  groups.forEach(([selector, step]) => {
    document.querySelectorAll(selector).forEach((el, index) => {
      if (el.closest('.hero')) return;
      el.classList.add('reveal');
      if (step) el.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * step}ms`);
      targets.push(el);
    });
  });
  if ('IntersectionObserver' in window && !reduceMotion) {
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.1, rootMargin: '0px 0px -35px 0px' },
    );
    targets.forEach((el) => obs.observe(el));
  } else targets.forEach((el) => el.classList.add('is-visible'));

  // Give the two full-bleed image sections a single in-view state for their editorial line detail.
  const editorialSections = [...document.querySelectorAll('.editorial-break,.gallery-teaser')];
  if ('IntersectionObserver' in window) {
    const sectionObs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('is-inview');
        }),
      { threshold: 0.28 },
    );
    editorialSections.forEach((el) => sectionObs.observe(el));
  } else editorialSections.forEach((el) => el.classList.add('is-inview'));

  // Optical parallax, capped to a few pixels: enough to add depth, not enough to look like an effect.
  if (!reduceMotion && editorialSections.length) {
    let ticking = false;
    function parallax() {
      ticking = false;
      const vh = window.innerHeight;
      editorialSections.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const center = r.top + r.height / 2;
        const normalized = (center - vh / 2) / (vh + r.height);
        const amount = Math.max(-18, Math.min(18, -normalized * 40));
        if (el.classList.contains('gallery-teaser')) {
          const media = el.querySelector('.gallery-teaser-image');
          if (media) media.style.setProperty('--parallax-y', `${amount}px`);
        } else el.style.setProperty('--parallax-y', `${amount}px`);
      });
    }
    function requestParallax() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(parallax);
      }
    }
    parallax();
    window.addEventListener('scroll', requestParallax, { passive: true });
    window.addEventListener('resize', requestParallax, { passive: true });
  }

  // Internal HTML navigation receives a tiny fade; forms, mail links, downloads and modified clicks remain immediate.
  if (!reduceMotion) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (
        !a ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      const raw = a.getAttribute('href') || '';
      if (
        !raw ||
        raw.startsWith('#') ||
        raw.startsWith('mailto:') ||
        raw.startsWith('tel:') ||
        raw.startsWith('javascript:')
      )
        return;
      let url;
      try {
        url = new URL(a.href, location.href);
      } catch (_) {
        return;
      }
      if (url.origin !== location.origin || url.href === location.href) return;
      if (!/\.html(?:$|[?#])/.test(url.href)) return;
      e.preventDefault();
      document.body.classList.add('page-leaving');
      setTimeout(() => {
        location.href = url.href;
      }, 210);
    });
    window.addEventListener('pageshow', () => document.body.classList.remove('page-leaving'));
  }
})();

// Immersive gallery lightbox
(function () {
  const lang = document.documentElement.lang === 'en' ? 'en' : 'it';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const imgs = [...document.querySelectorAll('.gallery-card-image img')];
  if (!imgs.length) return;

  const labels =
    lang === 'en'
      ? {
          close: 'Close',
          prev: 'Previous image',
          next: 'Next image',
          dialog: 'Image gallery',
          open: 'Enlarge image: ',
          of: 'of',
        }
      : {
          close: 'Chiudi',
          prev: 'Immagine precedente',
          next: 'Immagine successiva',
          dialog: 'Galleria immagini',
          open: 'Apri immagine: ',
          of: 'di',
        };

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', labels.dialog);
  box.setAttribute('aria-hidden', 'true');
  box.inert = true;
  box.innerHTML = `
    <div class="lightbox-stage">
      <div class="lightbox-counter" aria-live="polite"></div>
      <button class="lightbox-close" type="button" aria-label="${labels.close}">×</button>
      <button class="lightbox-prev" type="button" aria-label="${labels.prev}">‹</button>
      <figure class="lightbox-figure">
        <img class="lightbox-image" alt="">
        <figcaption class="lightbox-caption"></figcaption>
      </figure>
      <button class="lightbox-next" type="button" aria-label="${labels.next}">›</button>
    </div>`;
  document.body.appendChild(box);

  const big = box.querySelector('.lightbox-image');
  const cap = box.querySelector('.lightbox-caption');
  const counter = box.querySelector('.lightbox-counter');
  const closeBtn = box.querySelector('.lightbox-close');
  const prevBtn = box.querySelector('.lightbox-prev');
  const nextBtn = box.querySelector('.lightbox-next');
  let i = 0,
    lastFocus = null,
    touchStartX = null,
    swapTimer = null,
    backgroundState = [];

  function fullSrc(im) {
    return im.getAttribute('src') || im.currentSrc || im.src;
  }
  function setContent(n) {
    i = (n + imgs.length) % imgs.length;
    const im = imgs[i];
    big.src = fullSrc(im);
    big.alt = im.alt || '';
    cap.textContent = im.alt || '';
    counter.textContent = `${String(i + 1).padStart(2, '0')} ${labels.of} ${String(imgs.length).padStart(2, '0')}`;
  }
  function render(n, immediate = false) {
    clearTimeout(swapTimer);
    i = (n + imgs.length) % imgs.length;
    const target = i;
    if (immediate || reduceMotion || !box.classList.contains('open')) {
      setContent(target);
      return;
    }
    big.classList.add('changing');
    cap.classList.add('changing');
    swapTimer = setTimeout(() => {
      setContent(target);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          big.classList.remove('changing');
          cap.classList.remove('changing');
        }),
      );
    }, 135);
  }
  function open(n) {
    if (!box.classList.contains('open')) {
      lastFocus = imgs[n];
      backgroundState = [...document.body.children]
        .filter((element) => element !== box)
        .map((element) => [element, element.inert]);
      backgroundState.forEach(([element]) => {
        element.inert = true;
      });
    }
    render(n, true);
    box.inert = false;
    box.classList.add('open');
    box.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('lightbox-open');
    document.body.classList.add('lightbox-open');
    requestAnimationFrame(() => closeBtn.focus());
  }
  function close() {
    if (!box.classList.contains('open')) return;
    clearTimeout(swapTimer);
    box.classList.remove('open');
    box.setAttribute('aria-hidden', 'true');
    box.inert = true;
    backgroundState.forEach(([element, inert]) => {
      element.inert = inert;
    });
    backgroundState = [];
    document.documentElement.classList.remove('lightbox-open');
    document.body.classList.remove('lightbox-open');
    big.removeAttribute('src');
    big.classList.remove('changing');
    cap.classList.remove('changing');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  imgs.forEach((im, n) => {
    im.tabIndex = 0;
    im.setAttribute('role', 'button');
    im.setAttribute('aria-label', labels.open + (im.alt || ''));
    im.addEventListener('click', () => open(n));
    im.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(n);
      }
    });
  });
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    render(i - 1);
  });
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    render(i + 1);
  });
  box.addEventListener('click', (e) => {
    if (e.target === box || e.target.classList.contains('lightbox-stage')) close();
  });
  box.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.changedTouches[0]?.clientX ?? null;
    },
    { passive: true },
  );
  box.addEventListener(
    'touchend',
    (e) => {
      if (touchStartX === null) return;
      const endX = e.changedTouches[0]?.clientX ?? touchStartX;
      const delta = endX - touchStartX;
      touchStartX = null;
      if (Math.abs(delta) > 55) render(delta > 0 ? i - 1 : i + 1);
    },
    { passive: true },
  );
  document.addEventListener('keydown', (e) => {
    if (!box.classList.contains('open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      render(i - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      render(i + 1);
    } else if (e.key === 'Tab') {
      const controls = [closeBtn, prevBtn, nextBtn].filter((x) => x.offsetParent !== null);
      if (!controls.length) return;
      const first = controls[0],
        last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
})();
