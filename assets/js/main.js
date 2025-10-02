// === Минимальный фронтенд проекта Step3D.Lab ===
// Все функции запускаются после загрузки DOM.

document.addEventListener('DOMContentLoaded', () => {
  setYear();
  initMobileMenu();
  initEquipmentFilter();
  initGalleryLightbox();
});

function setYear() {
  const target = document.getElementById('year');
  if (target) {
    target.textContent = new Date().getFullYear();
  }
}

function initMobileMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-mobile-nav]');
  if (!toggle || !menu) return;

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
  };

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('is-open', !expanded);
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 960) {
      closeMenu();
    }
  });
}

function initEquipmentFilter() {
  const bar = document.querySelector('[data-equip-filter]');
  const cards = Array.from(document.querySelectorAll('[data-equip-item]'));
  if (!bar || !cards.length) return;

  let current = 'all';

  const applyFilter = (type) => {
    current = type;
    bar.querySelectorAll('[data-filter]').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.filter === type);
    });

    cards.forEach(card => {
      const match = type === 'all' || card.dataset.type === type;
      card.hidden = !match;
    });
  };

  bar.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-filter]');
    if (!btn) return;
    const type = btn.dataset.filter || 'all';
    if (type === current) return;
    applyFilter(type);
  });

  applyFilter(current);
}

function initGalleryLightbox() {
  const triggers = Array.from(document.querySelectorAll('.gal-btn'));
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lb-img');
  const caption = document.getElementById('lb-cap');
  const strip = document.getElementById('lb-strip');
  const prev = document.getElementById('lb-prev');
  const next = document.getElementById('lb-next');
  const closeBtn = document.getElementById('lb-close');
  if (!triggers.length || !lightbox || !img || !caption || !strip) return;

  const items = triggers.map(button => {
    const picture = button.querySelector('img');
    return {
      src: picture?.getAttribute('src') || '',
      alt: picture?.getAttribute('alt') || ''
    };
  }).filter(item => item.src);

  if (!items.length) return;

  let current = 0;
  let stripButtons = [];
  let touchStartX = null;

  const open = (index) => {
    current = index;
    update();
    lightbox.classList.remove('hidden');
    document.body.dataset.lockScroll = 'true';
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyPress);
  };

  const close = () => {
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
    delete document.body.dataset.lockScroll;
    document.removeEventListener('keydown', onKeyPress);
  };

  const onKeyPress = (event) => {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') showPrev();
    if (event.key === 'ArrowRight') showNext();
  };

  const showPrev = () => {
    current = (current + items.length - 1) % items.length;
    update();
  };

  const showNext = () => {
    current = (current + 1) % items.length;
    update();
  };

  const update = () => {
    const item = items[current];
    img.src = item.src;
    img.alt = item.alt;
    caption.textContent = item.alt;

    stripButtons.forEach((button, index) => {
      button.classList.toggle('is-active', index === current);
    });
  };

  const buildStrip = () => {
    strip.innerHTML = '';
    stripButtons = items.map((item, index) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      const altText = item.alt || `Превью ${index + 1}`;
      thumb.innerHTML = `<img src='${item.src}' alt='${altText}' />`;
      thumb.addEventListener('click', () => {
        current = index;
        update();
      });
      strip.appendChild(thumb);
      return thumb;
    });
  };

  triggers.forEach((button, index) => {
    button.addEventListener('click', () => open(index));
  });

  prev?.addEventListener('click', (event) => {
    event.stopPropagation();
    showPrev();
  });

  next?.addEventListener('click', (event) => {
    event.stopPropagation();
    showNext();
  });

  closeBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    close();
  });

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      close();
    }
  });

  lightbox.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });

  lightbox.addEventListener('touchend', (event) => {
    if (touchStartX == null) return;
    const delta = event.changedTouches[0]?.clientX - touchStartX;
    if (delta > 40) showPrev();
    if (delta < -40) showNext();
    touchStartX = null;
  }, { passive: true });

  buildStrip();
}
