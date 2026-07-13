const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const headers = fs.readFileSync(path.join(root, '_headers'), 'utf8');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
const internalLinks = [...html.matchAll(/href="#([^"]*)"/g)].map((match) => match[1]);
const localFiles = [...html.matchAll(/(?:href|src)="((?!https?:|mailto:|tel:|#|data:)[^"]+)"/g)].map((match) => match[1]);
const htmlWithoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '');
const interfaceStrings = [
  ...[...htmlWithoutScripts.matchAll(/>([^<]+)</g)].map((match) => match[1]),
  ...[...htmlWithoutScripts.matchAll(/\s(?:alt|aria-label|placeholder|title)="([^"]*)"/g)].map((match) => match[1])
].join(' ');
const auditableInterfaceStrings = interfaceStrings.replace(/[\w.+-]+@[\w.-]+/g, '');
const forbiddenInterfaceTerms = /\b(?:RGSU|CAD|AI|XR|ROBOTICS|MODEL|TEST|SCAN|CUSTOM|SIGNAL|ANALYTICS|MVP|PDF|Word|PowerPoint|JPG|PNG|ZIP|Ctrl|Enter|UX)\b|VR\/AR|3D|X\.Lab|E-mail|hardware|software/i;
const forbiddenScriptCopy = /\b(?:RGSU|CAD|MODEL|TEST|SCAN|CUSTOM|SIGNAL|ANALYTICS|MVP|PDF|Word|PowerPoint|JPG|PNG|ZIP|UX)\b|VR\/AR|3D|X\.Lab|E-mail|hardware|software/;

assert(duplicateIds.length === 0, `Повторяющиеся id: ${[...new Set(duplicateIds)].join(', ')}`);
assert(internalLinks.every((target) => target && ids.includes(target)), 'Есть пустая или несуществующая внутренняя ссылка');
assert(!/Демонстрационная форма|данные не отправляются|Материал готовится/i.test(html), 'В интерфейсе остался демонстрационный текст');
assert(!/target="_blank"(?![^>]*rel="[^"]*noopener)/g.test(html), 'Внешняя ссылка target=_blank без noopener');
assert(localFiles.every((file) => fs.existsSync(path.join(root, file))), `Не найден локальный ресурс: ${localFiles.find((file) => !fs.existsSync(path.join(root, file))) || ''}`);
assert(css.split('{').length === css.split('}').length, 'Нарушен баланс фигурных скобок CSS');
assert(css.includes('prefers-reduced-motion'), 'Нет режима prefers-reduced-motion');
assert(html.includes('name="description"') && html.includes('property="og:title"'), 'Не заполнены SEO-метаданные');
assert(html.includes('data-endpoint=""') && js.includes('fetch(endpoint') && js.includes('buildRequestPayload'), 'Не подготовлена интеграция формы с обработчиком');
assert(html.includes('name="website"') && js.includes('form.elements.website'), 'Не настроено honeypot-поле');
assert(html.includes('data-endpoint=""') && html.includes('Подготовить письмо'), 'Резервная отправка через почту описана неточно');
assert(html.includes('novalidate') && /name="website" hidden tabindex="-1"/.test(html), 'Не настроена управляемая валидация или скрытое поле защиты');
assert((html.match(/<time class="news-card__date"/g) || []).length === 3, 'Даты НТС не размечены элементами time');
assert(html.includes('<address>') && html.includes('data-copy="technopark@rgsu.net"'), 'Контакты не получили семантику или копирование');
assert(html.includes('class="back-to-top"') && html.includes('class="network-status"'), 'Нет навигации наверх или offline-индикатора');
assert(html.includes('name="source_cta"') && js.includes("CustomEvent('rgsu:form-success'"), 'Нет источника CTA или события аналитики');
assert(html.includes('data-dropzone') && html.includes('data-counter-for="task"'), 'Нет drag-and-drop или счётчика задачи');
assert(css.includes('@media (forced-colors: active)') && css.includes('@media print'), 'Нет forced-colors или печатного режима');
assert(css.includes('content-visibility: auto') && css.includes('safe-area-inset-bottom'), 'Нет отложенного рендера или safe-area');
assert(css.includes('Manrope-Regular.subset.ttf'), 'Не подключён оптимизированный набор шрифтов');
assert(fs.existsSync(path.join(root, '.github', 'workflows', 'quality.yml')), 'Нет CI workflow');
assert(fs.existsSync(path.join(root, 'backend', 'Code.gs')) && fs.existsSync(path.join(root, 'backend', 'appsscript.json')), 'Нет готового обработчика заявок');
assert(html.includes('до 4 МБ') && js.includes('4 * 1024 * 1024'), 'Ограничение вложения не согласовано');
assert((html.match(/src="assets\/step3d\/[^"]+\.webp"/g) || []).length === 6, 'Витрина лаборатории должна содержать 6 оптимизированных фотографий');
assert((html.match(/src="assets\/step3d\/[^"]+\.webp"[^>]+loading="lazy"[^>]+decoding="async"/g) || []).length === 6, 'Фотографии лаборатории должны загружаться отложенно');
assert(!/t\.me|telegram|телеграм/i.test(html), 'В интерфейсе осталась ссылка или упоминание Telegram');
assert(!forbiddenInterfaceTerms.test(auditableInterfaceStrings), `В интерфейсе осталось английское обозначение: ${auditableInterfaceStrings.match(forbiddenInterfaceTerms)?.[0] || ''}`);
assert(!forbiddenScriptCopy.test(js), `В сообщениях сценария осталось английское обозначение: ${js.match(forbiddenScriptCopy)?.[0] || ''}`);
assert((html.match(/class="project-card[^\"]*reveal"/g) || []).length === 2, 'В разработке должны оставаться две приоритетные карточки проектов');

const structuredData = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
assert(Boolean(structuredData), 'Нет JSON-LD');
if (structuredData) {
  const hash = crypto.createHash('sha256').update(structuredData).digest('base64');
  assert(headers.includes(`'sha256-${hash}'`), 'CSP hash JSON-LD не совпадает');
  try { JSON.parse(structuredData); } catch { failures.push('JSON-LD содержит некорректный JSON'); }
}

try {
  new Function(js);
} catch (error) {
  failures.push(`Ошибка синтаксиса JavaScript: ${error.message}`);
}

if (failures.length) {
  console.error(failures.map((item) => `FAIL: ${item}`).join('\n'));
  process.exit(1);
}

console.log(`Static audit passed: ${ids.length} ids, ${internalLinks.length} internal links, ${localFiles.length} local resources.`);
