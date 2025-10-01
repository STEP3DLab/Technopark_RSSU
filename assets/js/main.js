// === Основной скрипт проекта ===
// Лаконичные комментарии — на русском языке.

// Ждём полной загрузки DOM (скрипт подключён с defer, но на всякий случай)
document.addEventListener('DOMContentLoaded', () => {
  setYear();
  initMobileMenu();
  initBackgroundAnimation();
  initRevealOnScroll();
  initEquipmentFilter();
  initGalleryLightbox();
});

// Подстановка текущего года в футере
function setYear() {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}

// Мобильное меню (открыть/закрыть)
function initMobileMenu() {
  const btn = document.getElementById('menuBtn');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('hidden'));
  // закрываем меню по клику на ссылку
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.add('hidden')));
}

// 3D-анимация фоновых узлов и связей
function initBackgroundAnimation() {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion && prefersReducedMotion.matches) return;

  const canvas = document.getElementById('bg-canvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let width = 0;
  let height = 0;
  const nodes = [];
  const nodeCount = 42;
  const connectionDistance = 220;
  const perspective = 680;

  class Node {
    constructor() {
      this.seed = Math.random() * Math.PI * 2;
      this.reset(true);
    }
    reset(initial = false) {
      this.x = (Math.random() * 2 - 1) * 0.9;
      this.y = (Math.random() * 2 - 1) * 0.9;
      this.z = Math.random() * 0.9 + 0.1;
      const angle = Math.random() * Math.PI * 2;
      const speed = (initial ? 0.05 : 0.08) + Math.random() * 0.05;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.vz = (Math.random() - 0.5) * 0.08;
    }
    step(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.z += this.vz * dt;
      if (
        this.x < -1.4 || this.x > 1.4 ||
        this.y < -1.4 || this.y > 1.4 ||
        this.z < 0.05 || this.z > 1.7
      ) {
        this.reset();
      }
    }
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project(node) {
    const depth = Math.max(0.1, Math.min(1.6, node.z));
    const scale = perspective / (perspective + depth * 420);
    return {
      x: width / 2 + node.x * width * 0.32 * scale,
      y: height / 2 + node.y * height * 0.32 * scale,
      scale,
      depth
    };
  }

  for (let i = 0; i < nodeCount; i++) {
    nodes.push(new Node());
  }

  resize();
  window.addEventListener('resize', resize);

  let frameId = null;
  let lastTime = performance.now();

  const projections = new Array(nodeCount);

  function render(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(8, 11, 26, 0.35)';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].step(dt);
      projections[i] = project(nodes[i]);
    }

    // соединяем ближайшие узлы
    for (let i = 0; i < nodes.length; i++) {
      const aProj = projections[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const bProj = projections[j];
        const dx = aProj.x - bProj.x;
        const dy = aProj.y - bProj.y;
        const dist = Math.hypot(dx, dy);
        if (dist > connectionDistance) continue;
        const spark = Math.sin(now / 220 + (nodes[i].seed + nodes[j].seed) * 3);
        const intensity = (1 - dist / connectionDistance) ** 2;
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.4 * intensity * Math.abs(spark);
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.9)';
        ctx.lineWidth = 1.1 + (aProj.scale + bProj.scale) * 0.6;
        ctx.shadowColor = 'rgba(14, 165, 233, 0.7)';
        ctx.shadowBlur = 12 + intensity * 18;
        ctx.beginPath();
        ctx.moveTo(aProj.x, aProj.y);
        ctx.lineTo(bProj.x, bProj.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // рисуем узлы
    for (let i = 0; i < nodes.length; i++) {
      const proj = projections[i];
      const pulse = Math.sin(now / 260 + nodes[i].seed * 5);
      const radius = 2.4 + (1 - proj.depth / 1.6) * 4.4;
      ctx.save();
      ctx.globalAlpha = 0.65 + 0.3 * pulse;
      ctx.fillStyle = 'rgba(165, 243, 252, 0.95)';
      ctx.shadowColor = 'rgba(59, 130, 246, 0.9)';
      ctx.shadowBlur = 12 + proj.scale * 24;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    frameId = requestAnimationFrame(render);
  }

  function start() {
    if (frameId == null) {
      lastTime = performance.now();
      frameId = requestAnimationFrame(render);
    }
  }

  function stop() {
    if (frameId != null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  prefersReducedMotion?.addEventListener?.('change', (event) => {
    if (event.matches) {
      stop();
      ctx.clearRect(0, 0, width, height);
    } else {
      start();
    }
  });

  start();
}

// Плавное появление блоков при скролле (IntersectionObserver)
function initRevealOnScroll() {
  const items = Array.from(document.querySelectorAll('.reveal'));
  if (!items.length) return;

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion && prefersReducedMotion.matches) {
    items.forEach(el => el.classList.add('in'));
    return;
  }

  // Поддержка кастомной задержки через data-атрибуты и группового стэггеринга
  document.querySelectorAll('[data-reveal-parent]').forEach(parent => {
    const step = parseFloat(parent.dataset.revealStep || '0.1');
    let index = 0;
    parent.querySelectorAll('.reveal').forEach(child => {
      if (child.dataset.revealDelay) return;
      child.style.setProperty('--reveal-delay', `${(index * step).toFixed(3)}s`);
      index += 1;
    });
  });

  items.forEach(el => {
    const delay = el.dataset.revealDelay?.trim();
    if (!delay) return;
    const value = /[a-z%]+$/i.test(delay) ? delay : `${delay}s`;
    el.style.setProperty('--reveal-delay', value);
  });

  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });

  items.forEach(el => io.observe(el));

  prefersReducedMotion?.addEventListener?.('change', event => {
    if (event.matches) {
      io.disconnect();
      items.forEach(el => el.classList.add('in'));
    } else {
      items.forEach(el => {
        if (!el.classList.contains('in')) io.observe(el);
      });
    }
  });
}

// Фильтрация карточек оборудования
function initEquipmentFilter() {
  const bar = document.getElementById('equip-filters');
  const cards = document.querySelectorAll('#equip-grid .equip-card');
  if (!bar || !cards.length) return;

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const f = btn.getAttribute('data-filter');
    // визуальное состояние кнопок
    bar.querySelectorAll('.equip-filter').forEach(b => {
      b.classList.remove('border-slate-900', 'text-slate-900');
      b.classList.add('border-slate-300', 'text-slate-600');
    });
    btn.classList.add('border-slate-900', 'text-slate-900');
    btn.classList.remove('border-slate-300', 'text-slate-600');
    // скрыть/показать карточки
    cards.forEach(card => {
      const t = card.getAttribute('data-type');
      card.classList.toggle('hidden', f !== 'all' && t !== f);
    });
  });
}

// Лайтбокс для галереи (клавиши, стрелки, свайпы)
function initGalleryLightbox() {
  const buttons = Array.from(document.querySelectorAll('.gal-btn'));
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbCap = document.getElementById('lb-cap');
  const lbStrip = document.getElementById('lb-strip');
  const lbPrev = document.getElementById('lb-prev');
  const lbNext = document.getElementById('lb-next');
  const lbClose = document.getElementById('lb-close');
  if (!buttons.length || !lightbox) return;

  let current = -1;
  let touchStartX = null;

  function openAt(i) {
    current = i;
    update();
    lightbox.classList.remove('hidden');
    setTimeout(() => document.addEventListener('keydown', onKey), 0);
  }
  function close() {
    lightbox.classList.add('hidden');
    document.removeEventListener('keydown', onKey);
  }
  function prev() {
    current = (current + buttons.length - 1) % buttons.length;
    update();
  }
  function next() {
    current = (current + 1) % buttons.length;
    update();
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  }
  function update() {
    const btn = buttons[current];
    const img = btn.querySelector('img');
    if (!img) return;
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = img.alt || '';

    // полоса превью
    lbStrip.innerHTML = '';
    buttons.forEach((b, idx) => {
      const it = document.createElement('img');
      it.src = b.querySelector('img').src;
      it.alt = b.querySelector('img').alt || ('Превью ' + (idx + 1));
      const wrap = document.createElement('button');
      wrap.className = 'h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border ' + (idx === current ? 'border-slate-900' : 'border-slate-200');
      wrap.appendChild(it);
      wrap.addEventListener('click', () => { current = idx; update(); });
      lbStrip.appendChild(wrap);
    });
  }

  buttons.forEach((b, i) => b.addEventListener('click', () => openAt(i)));
  lbPrev?.addEventListener('click', (e) => { e.stopPropagation(); prev(); });
  lbNext?.addEventListener('click', (e) => { e.stopPropagation(); next(); });
  lbClose?.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  lightbox.addEventListener('click', close);

  // свайпы на тач-экранах
  lightbox.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx > 40) prev();
    if (dx < -40) next();
    touchStartX = null;
  }, { passive: true });
}
