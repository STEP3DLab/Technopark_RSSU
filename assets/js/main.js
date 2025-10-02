// === Минимальный фронтенд проекта Step3D.Lab ===
// Все функции запускаются после загрузки DOM.

document.addEventListener('DOMContentLoaded', () => {
  setYear();
  initMobileMenu();
  initEquipmentFilter();
  initEquipmentModal();
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

function initEquipmentModal() {
  const modal = document.querySelector('[data-equip-modal]');
  const triggers = Array.from(document.querySelectorAll('[data-equip-item]'));
  if (!modal || !triggers.length) return;

  const dialog = modal.querySelector('[data-modal-dialog]');
  const overlay = modal.querySelector('[data-modal-overlay]');
  const closeBtn = modal.querySelector('[data-modal-close]');
  const titleEl = modal.querySelector('[data-modal-title]');
  const subtitleEl = modal.querySelector('[data-modal-subtitle]');
  const badgeEl = modal.querySelector('[data-modal-badge]');
  const descEl = modal.querySelector('[data-modal-description]');
  const specsContainer = modal.querySelector('[data-modal-specs]');
  const highlightsContainer = modal.querySelector('[data-modal-highlights]');
  const highlightsSection = modal.querySelector('.equipment-modal__highlights');

  if (
    !dialog ||
    !overlay ||
    !closeBtn ||
    !titleEl ||
    !subtitleEl ||
    !badgeEl ||
    !descEl ||
    !specsContainer ||
    !highlightsContainer ||
    !highlightsSection
  ) {
    return;
  }

  const equipmentDetails = {
    'rangevision-neo': {
      name: 'RangeVision NEO',
      subtitle: 'Структурированный свет · настольная система',
      badge: '3D‑сканер',
      description:
        'Компактное решение для цифрового копирования объектов малого и среднего размера: точность контроля геометрии и удобный поворотный стол в комплекте.',
      specs: [
        { label: 'Тип сканирования', value: 'Стерео‑камера, структурированный свет' },
        { label: 'Область съёмки', value: '120 × 160 × 120 мм' },
        { label: 'Точность', value: 'до 0,05 мм' },
        { label: 'Скорость', value: 'до 500 000 точек/сек' },
        { label: 'Экспорт данных', value: 'STL, OBJ, PLY, ASCII' }
      ],
      highlights: [
        'Автокалибровка и поворотный стол',
        'Прошивка RangeVision ScanCenter',
        'Контроль геометрии и инспекция'
      ]
    },
    'rangevision-spectrum': {
      name: 'RangeVision Spectrum',
      subtitle: 'Структурированный свет · три зоны точности',
      badge: '3D‑сканер',
      description:
        'Гибкий сканер для предметов от 1 см до 3 м: перестраиваемая оптика, комплект маркеров и поддержка фотореалистичных текстур.',
      specs: [
        { label: 'Зоны съёмки', value: '120×160×120 мм · 240×320×240 мм · 520×860×520 мм' },
        { label: 'Точность', value: 'до 0,04 мм' },
        { label: 'Разрешение', value: 'до 0,06 мм' },
        { label: 'Скорость съёмки', value: 'до 1 200 000 точек/сек' },
        { label: 'Форматы', value: 'STL, OBJ, PLY, WRML, CSV' }
      ],
      highlights: [
        'Три сменных оптических модуля',
        'Текстурирование с помощью фотокамер',
        'Полноценный комплект референсных маркеров'
      ]
    },
    'artec-eva': {
      name: 'Artec Eva',
      subtitle: 'Ручной 3D‑сканер',
      badge: '3D‑сканер',
      description:
        'Лёгкий портативный сканер для оперативной съёмки людей, интерьеров и сложных поверхностей с высокой скоростью кадров.',
      specs: [
        { label: 'Тип сканера', value: 'Структурированный свет' },
        { label: 'Рабочее поле', value: '214 × 148 мм' },
        { label: 'Точность', value: 'до 0,1 мм' },
        { label: 'Скорость', value: '16 fps · до 2 млн точек/сек' },
        { label: 'Вес устройства', value: '0,9 кг' }
      ],
      highlights: [
        'Без маркеров и пудры',
        'Автосшивка в Artec Studio',
        'Сканирование людей и сложных форм'
      ]
    },
    'ultimaker-3': {
      name: 'Ultimaker 3',
      subtitle: 'FDM‑принтер с двойной экструзией',
      badge: '3D‑принтер',
      description:
        'Инженерный принтер для функциональных прототипов: печать двумя материалами, облачные проекты и калибровка по одному касанию.',
      specs: [
        { label: 'Рабочий объём', value: '197 × 215 × 200 мм (один экструдер), 197 × 215 × 165 мм (два экструдера)' },
        { label: 'Диаметр сопла', value: '0,4 мм (сменные 0,25–0,8 мм)' },
        { label: 'Материалы', value: 'PLA, Tough PLA, ABS, Nylon, CPE, PVA' },
        { label: 'Температура сопла', value: 'до 280 °C' },
        { label: 'ПО', value: 'Ultimaker Cura, Digital Factory' }
      ],
      highlights: [
        'Двойная экструзия с растворимыми поддержками',
        'Автокалибровка платформы',
        'Сетевое управление и мониторинг'
      ]
    },
    'designer-x': {
      name: 'Picaso 3D Designer X',
      subtitle: 'Промышленный FDM‑принтер',
      badge: '3D‑принтер',
      description:
        'Закрытая камера и мощная система подачи обеспечивают стабильность печати инженерными пластиками для серийных задач.',
      specs: [
        { label: 'Рабочий объём', value: '360 × 360 × 610 мм' },
        { label: 'Материалы', value: 'ABS, PLA, Nylon, PC, полиамиды, композиты' },
        { label: 'Температура экструдера', value: 'до 410 °C' },
        { label: 'Температура платформы', value: 'до 150 °C' },
        { label: 'Особенности', value: 'Система JetSwitch, автокалибровка, HEPA‑фильтрация' }
      ],
      highlights: [
        'Промышленная точность печати',
        'Закрытая термостабильная камера',
        'Два материала без потери скорости'
      ]
    },
    formlabs: {
      name: 'Formlabs (Form 3)',
      subtitle: 'LFS/Laser SLA‑принтер',
      badge: '3D‑принтер',
      description:
        'Высокоточная фотополимерная печать с широкой библиотекой инженерных смол: от гибких до жаропрочных.',
      specs: [
        { label: 'Рабочий объём', value: '145 × 145 × 185 мм' },
        { label: 'Толщина слоя', value: '25–300 микрон' },
        { label: 'Лазер', value: 'Точность позиционирования 25 мкм' },
        { label: 'Материалы', value: 'Engineering, Tough, Durable, Flexible, Dental, Castable' },
        { label: 'ПО', value: 'PreForm, Dashboard' }
      ],
      highlights: [
        'Стабильная LFS‑оптика',
        'Быстрая смена картриджей',
        'Постобработка в Form Wash/Form Cure'
      ]
    },
    'roland-mdx': {
      name: 'Roland MDX‑40/50/540',
      subtitle: '3‑осевая механическая обработка',
      badge: 'CNC',
      description:
        'Компактные станки для прототипирования и подготовки оснастки: точная обработка пластика, древесины и мягких металлов.',
      specs: [
        { label: 'Рабочее поле', value: '305 × 305 × 105 мм (MDX‑40), до 500 × 400 × 155 мм (MDX‑540)' },
        { label: 'Скорость шпинделя', value: '6 000 – 12 000 об/мин' },
        { label: 'Материалы', value: 'ABS, воски, ПВХ, алюминий, латунь' },
        { label: 'Повторяемость', value: '±0,02 мм' },
        { label: 'Управление', value: 'SRP Player, G‑code, автосмена инструмента (MDX‑50)' }
      ],
      highlights: [
        'Автоматическая смена инструмента',
        'Встроенный сенсор измерения заготовки',
        'Интеграция с CAD/CAM системами'
      ]
    },
    'trotec-speedy-300': {
      name: 'Trotec Speedy 300',
      subtitle: 'CO₂‑лазер для резки и гравировки',
      badge: 'Лазерный станок',
      description:
        'Универсальный лазер с высокой скоростью перемещений и системой Vision для точной маркировки и резки сложных контуров.',
      specs: [
        { label: 'Рабочее поле', value: '726 × 432 мм' },
        { label: 'Макс. мощность', value: 'до 120 Вт CO₂' },
        { label: 'Скорость перемещения', value: 'до 355 см/с' },
        { label: 'Материалы', value: 'Акрил, дерево, кожа, стекло, анодированный металл' },
        { label: 'Особенности', value: 'Atmos Assist, опция Vision, программное обеспечение JobControl' }
      ],
      highlights: [
        'Система пылеудаления Atmos',
        'Позиционирование с камерой Vision',
        'Быстрый переключатель фокуса Flexx'
      ]
    }
  };

  const focusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

  let lastFocused = null;

  const isVisible = (element) => {
    if (element.hidden) return false;
    if (element.closest('[hidden]')) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const populateModal = (item) => {
    titleEl.textContent = item.name;
    subtitleEl.textContent = item.subtitle || '';
    subtitleEl.hidden = !item.subtitle;
    badgeEl.textContent = item.badge || '';
    badgeEl.hidden = !item.badge;
    descEl.textContent = item.description || '';
    descEl.hidden = !item.description;

    specsContainer.innerHTML = '';
    (item.specs || []).forEach(spec => {
      const row = document.createElement('tr');
      const th = document.createElement('th');
      const td = document.createElement('td');
      th.scope = 'row';
      th.textContent = spec.label;
      td.textContent = spec.value;
      row.append(th, td);
      specsContainer.appendChild(row);
    });

    if (!specsContainer.children.length) {
      const emptyRow = document.createElement('tr');
      const th = document.createElement('th');
      const td = document.createElement('td');
      th.scope = 'row';
      th.textContent = 'Характеристики';
      td.textContent = 'Информация уточняется.';
      emptyRow.append(th, td);
      specsContainer.appendChild(emptyRow);
    }

    highlightsContainer.innerHTML = '';
    const highlights = item.highlights || [];
    highlightsSection.hidden = highlights.length === 0;
    highlights.forEach(text => {
      const chip = document.createElement('li');
      chip.textContent = text;
      highlightsContainer.appendChild(chip);
    });
  };

  const getFocusableElements = () =>
    Array.from(dialog.querySelectorAll(focusableSelector)).filter(isVisible);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = getFocusableElements();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || active === dialog) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const openModal = (id) => {
    const item = equipmentDetails[id];
    if (!item) return;

    populateModal(item);
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    modal.hidden = false;
    dialog.scrollTop = 0;
    requestAnimationFrame(() => {
      modal.classList.add('is-visible');
      dialog.focus();
    });

    document.body.dataset.lockScroll = 'true';
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
  };

  const closeModal = () => {
    if (modal.classList.contains('is-visible')) {
      modal.classList.remove('is-visible');
    }

    document.body.style.overflow = '';
    delete document.body.dataset.lockScroll;
    document.removeEventListener('keydown', onKeyDown);

    let focusRestored = false;

    const restoreFocus = () => {
      if (!focusRestored) {
        focusRestored = true;
        if (lastFocused && typeof lastFocused.focus === 'function') {
          lastFocused.focus();
        }
        lastFocused = null;
      }
    };

    const hide = () => {
      if (!modal.hidden) {
        modal.hidden = true;
      }
      restoreFocus();
    };

    const onTransitionEnd = (event) => {
      if (event.target === modal) {
        modal.removeEventListener('transitionend', onTransitionEnd);
        hide();
      }
    };

    modal.addEventListener('transitionend', onTransitionEnd);
    window.setTimeout(() => {
      modal.removeEventListener('transitionend', onTransitionEnd);
      if (!modal.hidden) {
        hide();
      } else {
        restoreFocus();
      }
    }, 250);
  };

  triggers.forEach(trigger => {
    const id = trigger.dataset.equipId;
    if (!id) return;

    const heading = trigger.querySelector('h3');
    if (heading) {
      trigger.setAttribute('aria-label', `Подробнее об оборудовании ${heading.textContent.trim()}`);
    }

    trigger.addEventListener('click', () => openModal(id));
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openModal(id);
      }
    });
  });

  overlay.addEventListener('click', closeModal);
  closeBtn.addEventListener('click', closeModal);
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
