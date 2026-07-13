const menuToggle = document.querySelector('.menu-toggle');
const menuLabel = menuToggle.querySelector('.sr-only');
const mainNav = document.querySelector('.main-nav');
const applicationModal = document.querySelector('#application-modal');
const labModal = document.querySelector('#lab-modal');
const form = document.querySelector('#application-form');
const formSuccess = document.querySelector('.form-success');
const fileInput = form.querySelector('[name="attachment"]');
const fileError = document.querySelector('#file-error');
const formAlert = document.querySelector('#form-alert');
const formSubmit = document.querySelector('#form-submit');
const formSubmitLabel = formSubmit.querySelector('.form-submit-label');
const formSubmitNote = document.querySelector('#form-submit-note');
const formSourceUrl = document.querySelector('#form-source-url');
const formSourceCta = document.querySelector('#form-source-cta');
const formModeStatus = document.querySelector('#form-mode-status');
const deadlineInput = form.querySelector('[name="deadline"]');
const dropzone = document.querySelector('[data-dropzone]');
const networkStatus = document.querySelector('.network-status');
const backToTop = document.querySelector('.back-to-top');
const toast = document.querySelector('.toast');
let applicationOpener = null;
let labOpener = null;

document.querySelector('#copyright-year').textContent = String(new Date().getFullYear());
formSourceUrl.value = window.location.href;
const today = new Date();
deadlineInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
if (form.dataset.endpoint.trim()) {
  formSubmitNote.textContent = 'После отправки вы увидите подтверждение приёма обращения.';
  formSubmitLabel.textContent = 'Отправить обращение';
}

let toastTimer = 0;
function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function updateNetworkStatus() {
  networkStatus.hidden = navigator.onLine;
}
window.addEventListener('online', () => {
  updateNetworkStatus();
  showToast('Соединение восстановлено');
});
window.addEventListener('offline', updateNetworkStatus);
updateNetworkStatus();

document.querySelectorAll('[data-counter-for]').forEach((counter) => {
  const input = form.elements[counter.dataset.counterFor];
  const update = () => { counter.textContent = `${input.value.length} / ${input.maxLength}`; };
  input.addEventListener('input', update);
  update();
});

const labData = {
  industry: {
    title: 'Промышленный дизайн и инженерное проектирование',
    description: 'Полный цикл разработки физического продукта — от обмера и цифровой модели до прототипа, мастер-модели и комплекта документации.',
    services: ['Трёхмерное сканирование и обмеры', 'Проектирование в САПР', 'Восстановление моделей по образцу', 'Трёхмерная печать'],
    results: ['Трёхмерная модель', 'Функциональный прототип', 'Мастер-модель', 'Конструкторская документация']
  },
  ai: {
    title: 'Компьютерные науки и искусственный интеллект',
    description: 'Создаём цифровые продукты для образования, исследований и бизнеса: от проверки гипотезы до рабочего программного прототипа.',
    services: ['Анализ данных и ИИ', 'Компьютерное зрение', 'Виртуальные тренажёры', 'Сайты и мобильные приложения'],
    results: ['Интерактивный прототип', 'Обученная модель', 'Учебный симулятор', 'Техническая документация']
  },
  robotics: {
    title: 'Робототехника и беспилотные системы',
    description: 'Проектируем и испытываем мехатронные решения, электронные узлы, мобильные платформы и системы управления.',
    services: ['Схемотехника и электроника', 'Программирование контроллеров', 'Мобильная робототехника', 'Беспилотные системы'],
    results: ['Действующий макет', 'Электронный модуль', 'Алгоритм управления', 'Программа и протокол испытаний']
  }
};

function setMenu(open, returnFocus = false) {
  menuToggle.setAttribute('aria-expanded', String(open));
  menuLabel.textContent = open ? 'Закрыть меню' : 'Открыть меню';
  mainNav.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
  if (open) {
    requestAnimationFrame(() => mainNav.querySelector('a, button')?.focus());
  } else if (returnFocus) {
    menuToggle.focus();
  }
}

menuToggle.addEventListener('click', () => setMenu(!mainNav.classList.contains('is-open')));
mainNav.querySelectorAll('a, button').forEach((item) => item.addEventListener('click', () => setMenu(false)));
document.addEventListener('click', (event) => {
  if (mainNav.classList.contains('is-open') && !mainNav.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false, true);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mainNav.classList.contains('is-open')) setMenu(false, true);
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 820 && mainNav.classList.contains('is-open')) setMenu(false);
});

function getSubmitLabel() {
  return form.dataset.endpoint.trim() ? 'Отправить обращение' : 'Подготовить письмо';
}

function setFormType(type) {
  const student = type === 'student';
  document.querySelector('#form-type').value = type;
  document.querySelectorAll('[data-form-type]').forEach((button) => {
    const active = button.dataset.formType === type;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const organizationField = document.querySelector('.organization-field');
  const organizationInput = organizationField.querySelector('input');
  organizationField.hidden = student;
  organizationInput.disabled = student;
  organizationInput.required = !student;

  document.querySelectorAll('.student-only').forEach((field) => {
    field.hidden = !student;
    field.querySelectorAll('input, select').forEach((input) => {
      input.disabled = !student;
      if (input.hasAttribute('data-student-required')) input.required = student;
    });
  });

  const task = form.querySelector('[name="task"]');
  document.querySelector('#task-label').textContent = student ? 'Что уже известно о задаче? *' : 'Кратко опишите задачу и ожидаемый результат *';
  task.placeholder = student ? 'Опишите требования руководителя и что уже сделано. Если результат пока не определён — так и напишите' : 'Что нужно разработать и какой результат вы ожидаете?';
  document.querySelector('#modal-title').textContent = student ? 'Обращение по практической части' : 'Обсуждение задачи организации';
  document.querySelector('#modal-description').textContent = student ? 'Достаточно предварительной темы. Мы уточним задачу и предложим возможный следующий шаг.' : 'Укажите исходные данные, ожидаемый результат и желаемые сроки.';
  formModeStatus.textContent = student ? 'Открыты поля для обращения студента.' : 'Открыты поля для обращения организации.';
  formSubmitLabel.textContent = getSubmitLabel();
}

function clearFormAlert() {
  formAlert.hidden = true;
  formAlert.textContent = '';
}

function setSubmitting(submitting) {
  formSubmit.disabled = submitting;
  formSubmit.setAttribute('aria-busy', String(submitting));
  if (submitting) formSubmitLabel.textContent = 'Отправляем…';
  else formSubmitLabel.textContent = getSubmitLabel();
}

function showFormResult(title, message) {
  form.hidden = true;
  formSuccess.hidden = false;
  formSuccess.querySelector('h2').textContent = title;
  formSuccess.querySelector('p').textContent = message;
  formSuccess.querySelector('h2').focus();
}

function openApplication(type = 'partner', source = null) {
  applicationOpener = labModal.open ? labOpener : document.activeElement;
  if (labModal.open) labModal.close();
  form.hidden = false;
  formSuccess.hidden = true;
  clearFormAlert();
  setSubmitting(false);
  setFormType(type);
  formSourceUrl.value = window.location.href;
  const sourceSection = source?.closest('section, dialog')?.id || 'direct';
  const sourceLabel = source?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || 'direct';
  formSourceCta.value = `${sourceSection}: ${sourceLabel}`;
  applicationModal.showModal();
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => form.querySelector('[name="name"]')?.focus());
}

document.querySelectorAll('[data-open-form]').forEach((button) => {
  button.addEventListener('click', () => openApplication(button.dataset.openForm, button));
});
document.querySelectorAll('[data-form-type]').forEach((button) => button.addEventListener('click', () => setFormType(button.dataset.formType)));
document.querySelectorAll('.modal__close, [data-close-form]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));

[applicationModal, labModal].forEach((modal) => {
  modal.addEventListener('click', (event) => {
    const rect = modal.getBoundingClientRect();
    const inDialog = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inDialog) modal.close();
  });
  modal.addEventListener('close', () => {
    if (!applicationModal.open && !labModal.open) document.body.classList.remove('modal-open');
    const opener = modal === applicationModal ? applicationOpener : labOpener;
    if (opener?.isConnected) requestAnimationFrame(() => opener.focus());
  });
});

function validateAttachment() {
  const file = fileInput.files?.[0];
  const tooLarge = file && file.size > 4 * 1024 * 1024;
  const allowedExtension = !file || /\.(pdf|doc|docx|ppt|pptx|jpe?g|png|zip)$/i.test(file.name);
  const message = tooLarge ? 'Размер файла превышает 20 МБ' : !allowedExtension ? 'Недопустимый формат файла' : '';
  fileInput.setCustomValidity(message);
  fileInput.setAttribute('aria-invalid', String(Boolean(message)));
  fileError.textContent = tooLarge ? 'Файл больше 4 МБ. Выберите файл меньшего размера.' : !allowedExtension ? 'Можно приложить документ, презентацию, изображение или архив.' : file ? `Выбран файл: ${file.name}` : '';
}
fileInput.addEventListener('change', validateAttachment);

['dragenter', 'dragover'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  dropzone.classList.add('is-dragover');
}));
['dragleave', 'drop'].forEach((eventName) => dropzone.addEventListener(eventName, (event) => {
  event.preventDefault();
  dropzone.classList.remove('is-dragover');
}));
dropzone.addEventListener('drop', (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  validateAttachment();
});

form.addEventListener('invalid', (event) => {
  event.target.setAttribute('aria-invalid', 'true');
}, true);

form.addEventListener('input', (event) => {
  if (event.target.matches('input, select, textarea') && event.target.checkValidity()) event.target.removeAttribute('aria-invalid');
  clearFormAlert();
});

function buildMailtoUrl() {
  const data = new FormData(form);
  const student = data.get('type') === 'student';
  const subject = student ? `Практическая часть в СКБ: ${data.get('student_topic') || 'предварительная тема'}` : `Задача для СКБ: ${data.get('organization') || data.get('name')}`;
  const fieldLabels = {
    name: 'Имя', email: 'Электронная почта', phone: 'Телефон', organization: 'Организация',
    student_work_type: 'Вид работы', faculty: 'Институт и курс', student_topic: 'Тема',
    supervisor: 'Научный руководитель', deadline: 'Срок защиты', task: 'Задача'
  };
  const lines = [];
  Object.entries(fieldLabels).forEach(([name, label]) => {
    const value = data.get(name);
    if (value) lines.push(`${label}: ${value}`);
  });
  lines.push('', `Источник: ${window.location.href}`);
  if (fileInput.files?.[0]) lines.push(`Вложение: ${fileInput.files[0].name} — приложите файл к письму вручную.`);
  return `mailto:technopark@rgsu.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

function resolveFormEndpoint() {
  const raw = form.dataset.endpoint.trim();
  if (!raw) return null;
  const endpoint = new URL(raw, window.location.href);
  const sameOrigin = endpoint.origin === window.location.origin;
  if (endpoint.protocol !== 'https:' && !(sameOrigin && endpoint.protocol === 'http:')) {
    throw new Error('UNSAFE_ENDPOINT');
  }
  return endpoint.href;
}

function getSubmissionId() {
  if (!form.dataset.submissionId) {
    const random = window.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 10).toUpperCase()
      || Math.random().toString(36).slice(2, 12).toUpperCase();
    form.dataset.submissionId = `СКБ-${Date.now().toString(36).toUpperCase()}-${random}`;
  }
  return form.dataset.submissionId;
}

async function buildRequestPayload() {
  const values = Object.fromEntries([...new FormData(form).entries()].filter(([, value]) => typeof value === 'string'));
  values.submission_id = getSubmissionId();
  const file = fileInput.files?.[0];
  if (!file) return values;
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 32768;
  for (let index = 0; index < buffer.length; index += chunkSize) {
    binary += String.fromCharCode(...buffer.subarray(index, index + chunkSize));
  }
  values.attachment = { name: file.name, type: file.type, base64: window.btoa(binary) };
  return values;
}

form.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !formSubmit.disabled) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFormAlert();
  if (!form.checkValidity()) {
    const invalidFields = [...form.elements].filter((field) => typeof field.checkValidity === 'function' && !field.checkValidity());
    invalidFields.forEach((field) => field.setAttribute('aria-invalid', 'true'));
    const fieldNames = {
      name: 'имя и фамилия', email: 'электронная почта', organization: 'организация',
      student_work_type: 'вид учебной работы', student_topic: 'тема или идея', task: 'описание задачи',
      attachment: 'приложенный файл', consent: 'согласие на обработку данных'
    };
    const invalidNames = [...new Set(invalidFields.map((field) => fieldNames[field.name]).filter(Boolean))];
    formAlert.textContent = `Заполните отмеченные поля: ${invalidNames.join(', ')}.`;
    formAlert.hidden = false;
    invalidFields[0]?.focus();
    return;
  }
  if (form.elements.website.value) {
    showFormResult('Заявка принята', 'Спасибо. Обращение зарегистрировано.');
    return;
  }

  let endpoint;
  try {
    endpoint = resolveFormEndpoint();
  } catch {
    formAlert.textContent = 'Адрес обработчика формы настроен небезопасно. Сообщите об ошибке администратору сайта.';
    formAlert.hidden = false;
    formAlert.focus();
    return;
  }
  if (!endpoint) {
    window.location.href = buildMailtoUrl();
    const attachmentNote = fileInput.files?.[0] ? ' Не забудьте приложить выбранный файл к письму вручную.' : '';
    showFormResult('Письмо подготовлено', `Почтовая программа откроется с заполненным обращением. Проверьте письмо и нажмите «Отправить».${attachmentNote}`);
    return;
  }

  if (!navigator.onLine) {
    formAlert.textContent = 'Нет соединения с интернетом. Данные останутся в форме, пока страница открыта. Попробуйте снова после восстановления связи.';
    formAlert.hidden = false;
    formAlert.focus();
    return;
  }

  setSubmitting(true);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const requestPayload = await buildRequestPayload();
    const response = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(requestPayload),
      headers: { Accept: 'application/json', 'Content-Type': 'text/plain;charset=utf-8' },
      credentials: 'omit',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let payload = {};
    payload = await response.json().catch(() => ({}));
    if (payload.ok === false) throw new Error(payload.error || 'REQUEST_REJECTED');
    const requestId = payload.id || payload.requestId || payload.applicationId;
    const submittedType = document.querySelector('#form-type').value;
    const submittedSource = formSourceCta.value;
    form.reset();
    delete form.dataset.submissionId;
    fileError.textContent = '';
    document.querySelectorAll('[data-counter-for]').forEach((counter) => {
      const input = form.elements[counter.dataset.counterFor];
      counter.textContent = `0 / ${input.maxLength}`;
    });
    const confirmation = requestId ? `Спасибо. Команда СКБ получила обращение. Номер заявки: ${requestId}.` : 'Спасибо. Команда СКБ получила обращение.';
    showFormResult('Заявка отправлена', confirmation);
    window.dispatchEvent(new CustomEvent('rgsu:form-success', { detail: { type: submittedType, source: submittedSource, requestId: requestId || null } }));
  } catch (error) {
    formAlert.textContent = error.name === 'AbortError' ? 'Сервер не ответил вовремя. Проверьте соединение и попробуйте ещё раз.' : 'Не удалось отправить заявку. Попробуйте ещё раз или напишите на technopark@rgsu.net.';
    formAlert.hidden = false;
    formAlert.focus();
  } finally {
    window.clearTimeout(timeout);
    setSubmitting(false);
  }
});

document.querySelectorAll('[data-lab]').forEach((button) => {
  button.addEventListener('click', () => {
    labOpener = button;
    const data = labData[button.dataset.lab];
    document.querySelector('#lab-modal-title').textContent = data.title;
    document.querySelector('#lab-modal-description').textContent = data.description;
    document.querySelector('#lab-modal-services').innerHTML = data.services.map((item) => `<li>${item}</li>`).join('');
    document.querySelector('#lab-modal-results').innerHTML = data.results.map((item) => `<li>${item}</li>`).join('');
    labModal.showModal();
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => document.querySelector('#lab-modal-title').focus());
  });
});

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  document.documentElement.classList.add('js');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.06 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

document.querySelectorAll('.fit-grid, .case-grid, .lab-grid, .project-grid, .news-grid').forEach((grid) => {
  [...grid.children].forEach((item, index) => item.style.setProperty('--reveal-delay', `${Math.min(index, 4) * 70}ms`));
});

const progressBar = document.querySelector('.page-progress span');
const siteHeader = document.querySelector('.site-header');
let progressFrame = 0;
function updatePageProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
  progressBar.style.setProperty('--page-progress', progress.toFixed(4));
  siteHeader.classList.toggle('is-scrolled', window.scrollY > 12);
  backToTop.classList.toggle('is-visible', window.scrollY > window.innerHeight * 1.2);
  progressFrame = 0;
}
function requestProgressUpdate() {
  if (!progressFrame) progressFrame = requestAnimationFrame(updatePageProgress);
}
window.addEventListener('scroll', requestProgressUpdate, { passive: true });
window.addEventListener('resize', requestProgressUpdate);
updatePageProgress();

backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion?.matches ? 'auto' : 'smooth' }));

document.querySelectorAll('.copy-button[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const value = button.dataset.copy;
    let copied = true;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement('textarea');
      input.value = value;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.append(input);
      input.select();
      copied = document.execCommand('copy');
      input.remove();
    }
    showToast(copied ? 'Адрес электронной почты скопирован' : `Электронная почта: ${value}`);
  });
});

document.querySelectorAll('.accordion details').forEach((details) => {
  details.addEventListener('toggle', () => {
    if (!details.open) return;
    document.querySelectorAll('.accordion details[open]').forEach((other) => {
      if (other !== details) other.open = false;
    });
  });
});

const sectionLinks = new Map(
  [...document.querySelectorAll('.main-nav a[href^="#"]')]
    .map((link) => [document.querySelector(link.getAttribute('href')), link])
    .filter(([section]) => section)
);
if ('IntersectionObserver' in window) {
  const navigationObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach((link, section) => {
        const current = section === entry.target;
        link.classList.toggle('is-current', current);
        if (current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-32% 0px -60% 0px', threshold: 0 });
  sectionLinks.forEach((link, section) => navigationObserver.observe(section));
}

const processPanel = document.querySelector('.process-panel');
if ('IntersectionObserver' in window) {
  const processObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      processPanel.classList.add('is-in-view');
      processObserver.disconnect();
    }
  }, { threshold: 0.28 });
  processObserver.observe(processPanel);
} else {
  processPanel.classList.add('is-in-view');
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

if (!reducedMotion.matches && precisePointer.matches) {
  document.querySelectorAll('[data-tilt]').forEach((surface) => {
    surface.addEventListener('pointermove', (event) => {
      const rect = surface.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      surface.style.setProperty('--rx', `${((0.5 - y) * 4).toFixed(2)}deg`);
      surface.style.setProperty('--ry', `${((x - 0.5) * 5).toFixed(2)}deg`);
      surface.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      surface.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      surface.style.setProperty('--sx', `${((x - 0.5) * 9).toFixed(1)}px`);
      surface.style.setProperty('--sy', `${((y - 0.5) * 7).toFixed(1)}px`);
    });
    surface.addEventListener('pointerleave', () => {
      surface.style.setProperty('--rx', '0deg');
      surface.style.setProperty('--ry', '0deg');
      surface.style.setProperty('--mx', '50%');
      surface.style.setProperty('--my', '50%');
      surface.style.setProperty('--sx', '0px');
      surface.style.setProperty('--sy', '0px');
    });
  });
}

function animateCounter(element) {
  const target = Number(element.dataset.count);
  if (!Number.isFinite(target) || reducedMotion.matches) return;
  const start = performance.now();
  const duration = 650;
  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    element.textContent = String(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(frame);
  }
  element.textContent = '0';
  requestAnimationFrame(frame);
}

const counters = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.9 });
  counters.forEach((counter) => counterObserver.observe(counter));
}
