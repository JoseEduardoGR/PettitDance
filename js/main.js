(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ============================================
     Smooth scroll (Lenis) + GSAP ScrollTrigger bridge
     ============================================ */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', () => window.ScrollTrigger && ScrollTrigger.update());
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      ScrollTrigger.scrollerProxy(document.body, {
        scrollTop(value) {
          if (arguments.length) { lenis.scrollTo(value, { immediate: true }); }
          return lenis.scroll || window.scrollY;
        },
        getBoundingClientRect() {
          return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
        }
      });
    }
  }

  /* ============================================
     Preloader — pure CSS transition, no rAF/GSAP dependency
     on the critical path so it can never block the page.
     ============================================ */
  const preloader = document.getElementById('preloader');
  let preloaderDismissed = false;
  function dismissPreloader() {
    if (!preloader || preloaderDismissed) return;
    preloaderDismissed = true;
    if (reduceMotion) { preloader.remove(); return; }
    preloader.classList.add('preloader--exit');
    preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });
    setTimeout(() => { if (document.body.contains(preloader)) preloader.remove(); }, 1600);
  }
  // Let the dancer finish crossing, then always dismiss — never wait on full
  // window 'load' (slow fonts/CDN) or on animation libraries to unblock the page.
  setTimeout(dismissPreloader, reduceMotion ? 0 : 1550);

  /* ============================================
     Header scroll state
     ============================================ */
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ============================================
     Mobile nav toggle
     ============================================ */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
  });
  document.querySelectorAll('[data-nav-link]').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ============================================
     Active section on scroll — syncs top nav + side dots
     ============================================ */
  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('[data-nav-link]')];
  const sideDots = [...document.querySelectorAll('[data-dot]')];
  if ('IntersectionObserver' in window && sections.length) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(l => l.classList.remove('is-active'));
        sideDots.forEach(d => d.classList.remove('is-active'));
        const id = entry.target.id;
        const activeLink = navLinks.find(l => l.getAttribute('href') === `#${id}`);
        const activeDot = sideDots.find(d => d.dataset.dotFor === id);
        if (activeLink) activeLink.classList.add('is-active');
        if (activeDot) activeDot.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => navObserver.observe(s));
  }

  /* ============================================
     Cursor accent (desktop only)
     ============================================ */
  const cursorDot = document.getElementById('cursorDot');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    window.addEventListener('mousemove', (e) => {
      cursorDot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    });
  }

  /* ============================================
     Scroll reveals
     ============================================ */
  if (reduceMotion) {
    document.querySelectorAll('[data-reveal], [data-reveal-stagger]').forEach(el => el.classList.add('is-visible'));
  } else if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: .18 });

    document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));

    // Staggered groups: delay based on position within their parent
    const staggerGroups = new Map();
    document.querySelectorAll('[data-reveal-stagger]').forEach(el => {
      const parent = el.parentElement;
      if (!staggerGroups.has(parent)) staggerGroups.set(parent, []);
      staggerGroups.get(parent).push(el);
    });
    staggerGroups.forEach(items => {
      items.forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.1}s`;
        revealObserver.observe(el);
      });
    });
  }

  /* ============================================
     Animated counters
     ============================================ */
  const counters = document.querySelectorAll('[data-count-to]');
  if (counters.length && 'IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.countTo, 10);
        obs.unobserve(el);
        if (reduceMotion || !window.gsap) {
          el.textContent = target;
          return;
        }
        const counter = { val: 0 };
        gsap.to(counter, {
          val: target,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = Math.round(counter.val); }
        });
      });
    }, { threshold: .6 });
    counters.forEach(c => countObserver.observe(c));
  }

  /* ============================================
     Parallax: hero background + floaters
     ============================================ */
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.to('.hero__bg', {
      yPercent: 14,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const strength = parseFloat(el.dataset.parallax) || .2;
      gsap.to(el, {
        yPercent: 30 * strength * -1,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    });

    // Welcome decorative silhouette drift
    gsap.to('.welcome__silhouette', {
      y: -60, rotate: 6, ease: 'none',
      scrollTrigger: { trigger: '.welcome', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    // Founder portrait gentle pin/parallax
    gsap.fromTo('.founder__portrait', { y: 40 }, {
      y: -40, ease: 'none',
      scrollTrigger: { trigger: '.founder', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    // Cinematic banner background parallax
    gsap.to('.showcase-banner__bg', {
      yPercent: 16,
      ease: 'none',
      scrollTrigger: { trigger: '.showcase-banner', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    // Momentos: each photo drifts/rotates at its own rate — the
    // "pieces separate" depth effect as the section scrolls through.
    document.querySelectorAll('.moment').forEach((card, i) => {
      const depth = i % 2 === 0 ? 1 : -1;
      const layer = card.querySelector('.moment__photo') || card;
      gsap.fromTo(layer, { y: 70 * depth, rotate: 2 * depth }, {
        y: -70 * depth, rotate: -1 * depth, ease: 'none',
        scrollTrigger: { trigger: '.moments', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ============================================
     Testimonial slider
     ============================================ */
  const slides = [...document.querySelectorAll('[data-slide]')];
  const dotsWrap = document.getElementById('testimonialDots');
  if (slides.length) {
    slides[0].classList.add('is-active');
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Testimonio ${i + 1}`);
      if (i === 0) dot.classList.add('is-active');
      dot.addEventListener('click', () => goToSlide(i));
      dotsWrap.appendChild(dot);
    });

    let current = 0;
    function goToSlide(index) {
      slides[current].classList.remove('is-active');
      dotsWrap.children[current].classList.remove('is-active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('is-active');
      dotsWrap.children[current].classList.add('is-active');
    }

    if (!reduceMotion) {
      setInterval(() => goToSlide(current + 1), 5500);
    }
  }

  /* ============================================
     Programs showcase: never hijacks the page scroll — the mouse
     wheel always scrolls the page. Horizontal navigation instead
     comes from: trackpad/touch swipe (native), mouse click-drag,
     and an auto-scroll hint after 3s of idle hover.
     ============================================ */
  const showcase = document.getElementById('programsShowcase');
  if (showcase) {
    let idleTimer = null;
    let autoScrollTween = null;

    const cancelAutoScroll = () => {
      if (autoScrollTween) { autoScrollTween.kill(); autoScrollTween = null; }
    };
    const clearIdleTimer = () => { clearTimeout(idleTimer); idleTimer = null; };
    const stopAutoScroll = () => { clearIdleTimer(); cancelAutoScroll(); };

    const scheduleAutoScroll = () => {
      if (reduceMotion) return;
      clearIdleTimer();
      idleTimer = setTimeout(() => {
        const target = showcase.scrollWidth - showcase.clientWidth;
        const remaining = target - showcase.scrollLeft;
        if (remaining <= 4) return;
        if (window.gsap) {
          autoScrollTween = gsap.to(showcase, {
            scrollLeft: target,
            duration: Math.min(4.5, Math.max(1.4, remaining / 200)),
            ease: 'power1.inOut'
          });
        } else {
          showcase.scrollTo({ left: target, behavior: 'smooth' });
        }
      }, 3000);
    };

    // Desktop mouse click-drag to scroll horizontally.
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let isDragging = false, startX = 0, startScroll = 0;
      showcase.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return;
        isDragging = true;
        showcase.classList.add('is-dragging');
        startX = e.clientX;
        startScroll = showcase.scrollLeft;
        showcase.setPointerCapture(e.pointerId);
        stopAutoScroll();
      });
      showcase.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        showcase.scrollLeft = startScroll - (e.clientX - startX);
      });
      const endDrag = () => { isDragging = false; showcase.classList.remove('is-dragging'); };
      showcase.addEventListener('pointerup', endDrag);
      showcase.addEventListener('pointercancel', endDrag);

      showcase.addEventListener('mouseenter', scheduleAutoScroll);
      showcase.addEventListener('mouseleave', stopAutoScroll);
    }

    showcase.addEventListener('wheel', stopAutoScroll, { passive: true });
    showcase.addEventListener('touchstart', stopAutoScroll, { passive: true });
  }

  /* ============================================
     Momentos: 3D tilt on hover (desktop only)
     ============================================ */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion && window.gsap) {
    document.querySelectorAll('.moment').forEach(card => {
      const restRotate = parseFloat(getComputedStyle(card).getPropertyValue('--rot')) || 0;
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - .5;
        const y = (e.clientY - rect.top) / rect.height - .5;
        gsap.to(card, { rotateX: y * -10, rotateY: x * 12, rotateZ: restRotate, duration: .5, ease: 'power2.out', transformPerspective: 900 });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, rotateZ: restRotate, duration: .7, ease: 'power2.out' });
      });
    });
  }

})();
