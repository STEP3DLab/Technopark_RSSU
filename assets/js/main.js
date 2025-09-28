// === Основной скрипт проекта ===
// Лаконичные комментарии — на русском языке.

// Ждём полной загрузки DOM (скрипт подключён с defer, но на всякий случай)
document.addEventListener('DOMContentLoaded', () => {
  setYear();
  initMobileMenu();
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

// Плавное появление блоков при скролле (IntersectionObserver)
function initRevealOnScroll() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
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
