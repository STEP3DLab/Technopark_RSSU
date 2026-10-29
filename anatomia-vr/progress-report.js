import {organs} from './data.js';
import {teachingModules} from './teaching-content.js';
import {icon} from './experience.js';
import {buildProgressReport, exportProgressReport, reportKeys} from './progress-report-state.js';

const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const byId = id => organs.find(organ => organ.id === id);
const names = {atlas:'Атлас',learning:'Карточки и избранное',lab:'Лаборатория',contrast:'Различить похожее',recognition:'Узнавание органов'};
const panel = document.createElement('dialog');
panel.id = 'anatomia-progress-report';
panel.setAttribute('aria-labelledby','progress-report-title');
document.body.append(panel);
const $ = selector => panel.querySelector(selector);
let storage;
try { storage = localStorage; } catch { storage = {getItem(){throw new Error('Storage unavailable');}}; }
const live = {};
let opener = null, openerDialog = null, model = null, requesting = false, printDetails = [];
const eventNames = {atlas:'anatomia:progress',learning:'anatomia:learning-progress',lab:'anatomia:lab-progress',contrast:'anatomia:workbench-progress',recognition:'anatomia:recognition-progress'};
const dateText = value => {
  if (!value) return 'Дата не сохранена';
  try { return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)) + ' МСК'; }
  catch { return 'Дата не сохранена'; }
};
const available = name => !['unavailable','corrupt'].includes(model.availability[name]);
const organButtons = ids => ids.map(id => `<button type="button" class="pr-organ-link" data-pr-organ="${id}">${esc(byId(id).name)}</button>`).join('');
const definitions = [
  {key:'atlas',title:'Атлас',description:'Поиск органов, функции или ситуации',action:'atlas'},
  {key:'lab',title:'Учебная лаборатория',description:'Механизмы работы органов',action:'lab'},
  {key:'contrast',title:'Различить похожее',description:'Функции и анатомические понятия',action:'contrast'},
  {key:'recognitionVisual',title:'Узнать по изображению',description:'Визуальное узнавание',action:'recognition-visual'},
  {key:'recognitionVerbal',title:'Узнать по функции',description:'Узнавание по описанию',action:'recognition-verbal'}
];

function snapshot() {
  requesting = true;
  document.dispatchEvent(new CustomEvent('anatomia:request-progress'));
  requesting = false;
  model = buildProgressReport({storage,live});
}
function scopeText(attempt) {
  if (attempt.scope === 'unknown') return 'Формат старой записи не указан';
  if (attempt.scope === 'review') return 'Повтор ошибок';
  if (attempt.scope === 'custom') return 'Выбранные задания';
  if (attempt.scope === 'organ') return `${teachingModules[attempt.organ]?.name || 'Один орган'} · 3 вопроса`;
  if (attempt.scope === 'standard') return 'Стандартная попытка';
  return 'Полная попытка';
}
function typeText(attempt) {
  if (attempt.module !== 'atlas') return '';
  return {find:'Поиск в 3D',function:'Функции органов',case:'Учебные ситуации'}[attempt.type] || '';
}
function noticeMarkup() {
  const corrupt = [...new Set(model.notices.filter(item => ['corrupt','invalid-attempt'].includes(item.kind)).map(item => names[item.source]))];
  const session = [...new Set(model.notices.filter(item => item.kind === 'session').map(item => names[item.source]))];
  const unavailable = [...new Set(model.notices.filter(item => item.kind === 'unavailable').map(item => names[item.source]))];
  if (!corrupt.length && !session.length && !unavailable.length) return '';
  return `<aside class="pr-notice" role="status"><b>Доступность данных</b>${session.length ? `<p>${esc(session.join(', '))}: показаны данные текущей страницы. Сохранение в браузере недоступно.</p>` : ''}${unavailable.length ? `<p>${esc(unavailable.join(', '))}: данные прочитать не удалось. Результат не восстановлен.</p>` : ''}${corrupt.length ? `<p>${esc(corrupt.join(', '))}: обнаружена повреждённая или неполная запись. Непроверенный результат не показан; сохранённые данные не изменены.</p>` : ''}</aside>`;
}
function attemptMarkup(definition) {
  const attempt = model.attempts[definition.key];
  const source = definition.key.startsWith('recognition') ? 'recognition' : definition.key;
  const invalid = model.notices.some(item => item.source === source && ['corrupt','invalid-attempt'].includes(item.kind));
  const emptyText = !available(source) || invalid ? 'Результат не восстановлен' : 'Завершённой попытки пока нет';
  return `<article class="pr-attempt" aria-labelledby="pr-attempt-${definition.key}"><div class="pr-attempt-heading"><h4 id="pr-attempt-${definition.key}">${definition.title}</h4><p>${attempt ? esc(typeText(attempt) || definition.description) : definition.description}</p>${attempt ? `<span class="pr-scope ${attempt.scope === 'review' ? 'pr-scope-review' : ''}">${esc(scopeText(attempt))}</span>` : ''}</div><div class="pr-attempt-score">${attempt ? `<strong>${attempt.correct}<small> / ${attempt.total}</small></strong><span>верных ответов</span>` : `<span class="pr-no-attempt">${emptyText}</span>`}</div><div class="pr-attempt-next pr-no-print">${attempt?.canRetry ? `<button type="button" data-pr-action="${definition.action}" data-pr-retry="true">Повторить ошибки ${icon('arrow')}</button>` : `<button type="button" data-pr-action="${definition.action}">${definition.key === 'lab' ? 'Открыть лабораторию' : 'Открыть проверку'} ${icon('arrow')}</button>`}</div>${attempt ? `<div class="pr-attempt-meta"><span>${esc(dateText(attempt.completedAt))}</span>${attempt.revealed !== null && attempt.revealed > 0 ? `<span>Ответ открыт без баллов: ${attempt.revealed}</span>` : ''}${attempt.skipped !== null && attempt.skipped > 0 ? `<span>Пропущено: ${attempt.skipped}</span>` : ''}${attempt.verification === 'legacy-summary' ? '<span>Сохранён только итог; состав заданий и открытые ответы неизвестны.</span>' : ''}${attempt.scope === 'unknown' && attempt.verification !== 'legacy-summary' ? '<span>Полную попытку и повтор по этой старой записи различить нельзя.</span>' : ''}</div>${attempt.mistakes.length ? `<details class="pr-mistakes"><summary>Что повторить · ${attempt.mistakes.length}</summary><ul>${attempt.mistakes.map(item => `<li><span>${esc(item.label)}</span>${item.revealed ? '<small>Ответ был открыт</small>' : item.skipped ? '<small>Пропущено</small>' : ''}<button type="button" class="pr-no-print" data-pr-organ="${item.organId}">Рассмотреть орган ↗</button></li>`).join('')}</ul></details>` : ''}` : ''}</article>`;
}
function render() {
  if (!model) model = buildProgressReport({storage,live});
  const assessment = model.selfAssessment;
  panel.innerHTML = `<header class="pr-head"><div><img class="pr-brand" src="./assets/medsi-college-logo.png" width="2048" height="504" alt="Колледж МЕДСИ"><span class="pr-eyebrow">ANATOMIA / ЛИЧНЫЙ УЧЕБНЫЙ ОТЧЁТ</span><h2 id="progress-report-title" tabindex="-1">Мои результаты</h2><p>Просмотры, ваши отметки и последние завершённые проверки.</p></div><button type="button" class="pr-close pr-no-print" data-pr="close" aria-label="Закрыть мои результаты">${icon('close')}</button></header><div class="pr-toolbar"><p>Сформирован ${esc(dateText(model.generatedAt))}<span>Версия ${esc(model.version)} · на этом устройстве</span></p><div class="pr-no-print"><button type="button" data-pr="print">Печать / PDF</button><button type="button" data-pr="export">Скачать JSON</button></div></div><div class="pr-body">${noticeMarkup()}<div class="pr-overview"><section class="pr-overview-card"><span class="pr-eyebrow">ЗНАКОМСТВО С АТЛАСОМ</span><h3>${available('atlas') ? `${model.viewed.length}<small> / ${model.totalStructures}</small>` : '—'}</h3><p>структур просмотрено</p><div class="pr-viewed-meter" aria-hidden="true"><span style="width:${model.viewed.length / model.totalStructures * 100}%"></span></div><p class="pr-caption">Просмотр означает знакомство со структурой. Он не подтверждает знание.</p><a class="pr-text-link" href="#pr-systems">Посмотреть по системам ↓</a></section><section class="pr-overview-card pr-assessment"><span class="pr-eyebrow">САМООЦЕНКА КАРТОЧЕК · БЕЗ БАЛЛОВ</span><h3>Как вы отметили</h3>${available('learning') ? `<dl><div><dt>Помню</dt><dd>${assessment.remember.length}</dd></div><div><dt>Повторить</dt><dd>${assessment.repeat.length}</dd></div><div><dt>Без отметки</dt><dd>${assessment.unrated.length}</dd></div></dl><p class="pr-caption">Это ваши отметки после раскрытия карточек, отдельные от результатов вопросов.</p>${assessment.repeat.length ? `<div class="pr-repeat-list">${organButtons(assessment.repeat)}</div>` : ''}<button type="button" class="pr-no-print" data-pr-learning="${assessment.repeat.length ? 'repeat' : 'open'}">${assessment.repeat.length ? 'Повторить отмеченные карточки' : 'Открыть учебный план'} ${icon('arrow')}</button>` : '<p class="pr-caption">Сохранённые отметки недоступны. Они не приравниваются к нулевому результату.</p>'}</section></div><section class="pr-results"><div class="pr-section-heading"><div><span class="pr-eyebrow">САМОПРОВЕРКА</span><h3>Последние завершённые попытки</h3></div><p>У каждого режима свой состав заданий. Результаты и знаменатели показаны отдельно.</p></div><div class="pr-results-list">${definitions.map(attemptMarkup).join('')}</div><p class="pr-caption">Незавершённые попытки сюда не входят. Повтор ошибок сохраняет собственный результат и не заменяет его общей оценкой.</p></section><section class="pr-systems" id="pr-systems" tabindex="-1"><div class="pr-section-heading"><div><span class="pr-eyebrow">ЧТО УЖЕ РАССМОТРЕНО</span><h3>Структуры по системам</h3></div><p>${available('atlas') ? 'В списке только структуры, просмотренные в атласе.' : 'Данные о просмотре сейчас недоступны.'}</p></div><table><thead><tr><th scope="col">Система</th><th scope="col">Просмотрено</th><th scope="col">Структуры</th></tr></thead><tbody>${model.systems.map(system => `<tr><th scope="row">${esc(system.name)}</th><td>${available('atlas') ? `${system.viewed.length} / ${system.total}` : '—'}</td><td>${system.viewed.length ? system.viewed.map(organ => `<button type="button" class="pr-organ-link" data-pr-organ="${organ.id}">${esc(organ.name)}<small>${esc(organ.latin)}</small></button>`).join('') : `<span class="pr-empty">${available('atlas') ? 'Пока нет просмотров' : 'Данные недоступны'}</span>`}</td></tr>`).join('')}</tbody></table></section><footer class="pr-foot"><p>Учебная самопроверка. Результаты не являются оценкой квалификации.</p><p>Отчёт содержит результаты этого браузера, без имени, аккаунта и сведений о пациентах. Файлы печати и JSON создаются по вашей кнопке.</p><p class="pr-no-print" id="progress-report-status" role="status" aria-live="polite"></p></footer></div>`;
}
function refreshVisible() {
  if (!panel.open || requesting) return;
  const active = document.activeElement;
  const key = active?.dataset.pr, organ = active?.dataset.prOrgan, action = active?.dataset.prAction;
  model = buildProgressReport({storage,live}); render();
  (key ? $(`[data-pr="${key}"]`) : organ ? $(`[data-pr-organ="${organ}"]`) : action ? $(`[data-pr-action="${action}"]`) : null)?.focus({preventScroll:true});
}
function openReport() {
  if (!panel.open) {
    opener = document.activeElement; openerDialog = opener?.closest('dialog')?.id || null;
    document.querySelectorAll('dialog[open]').forEach(dialog => { if (dialog !== panel) dialog.close(); });
  }
  snapshot(); render();
  if (!panel.open) panel.showModal();
  $('#progress-report-title').focus({preventScroll:true}); panel.scrollTop = 0;
}
function closeReport(restore = true) {
  panel.close(); finishPrint();
  if (!restore) return;
  const visible = element => element?.isConnected && !element.disabled && !element.closest('[hidden],dialog:not([open])') && element.getClientRects().length > 0;
  const parent = ['modal','practice-hub'].includes(openerDialog) ? document.querySelector('.nav[data-tab="practice"]') : document.querySelector('#learning-launch');
  const fallback = [...document.querySelectorAll('[data-progress-report],#learning-launch,#catalog-toggle')].find(visible);
  (visible(opener) && opener !== document.body ? opener : visible(parent) ? parent : fallback)?.focus({preventScroll:true});
}
function navigate(definition, retry = false) {
  closeReport(false);
  if (definition === 'atlas') document.dispatchEvent(new CustomEvent('anatomia:navigate',{detail:{action:retry ? 'mistakes' : 'quiz'}}));
  if (definition === 'lab') document.dispatchEvent(new CustomEvent('anatomia:teaching',{detail:{organ:model.attempts.lab?.organ || 'heart',action:retry ? 'mistakes' : 'quiz-all'}}));
  if (definition === 'contrast') document.dispatchEvent(new CustomEvent('anatomia:workbench',{detail:{mode:'contrast',...(retry ? {action:'mistakes'} : {})}}));
  if (definition.startsWith('recognition-')) document.dispatchEvent(new CustomEvent('anatomia:recognition',{detail:{mode:definition.endsWith('visual') ? 'visual' : 'verbal',action:retry ? 'mistakes' : 'open'}}));
}
function preparePrint() {
  if (!panel.open) return;
  document.body.classList.add('anatomia-report-printing');
  if (!printDetails.length) printDetails = [...panel.querySelectorAll('details')].map(detail => ({detail,open:detail.open}));
  printDetails.forEach(({detail}) => { detail.open = true; });
}
function finishPrint() {
  document.body.classList.remove('anatomia-report-printing');
  printDetails.forEach(({detail,open}) => { if (detail.isConnected) detail.open = open; }); printDetails = [];
}
function downloadReport() {
  snapshot(); render();
  const payload = exportProgressReport(model);
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json;charset=utf-8'}));
  const anchor = document.createElement('a'); anchor.href = url;
  anchor.download = `ANATOMIA-report-${model.generatedAt.slice(0,10)}.json`; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url),1500);
  $('#progress-report-status').textContent = 'Файл отчёта сформирован. В нём только учебные результаты и дата.';
  $('[data-pr="export"]').focus({preventScroll:true});
}
for (const [name,eventName] of Object.entries(eventNames)) document.addEventListener(eventName,event => {
  live[name] = event.detail;
  refreshVisible();
});
document.addEventListener('click',event => { if (event.target.closest('[data-progress-report]')) openReport(); });
document.addEventListener('anatomia:progress-report',openReport);
panel.addEventListener('cancel',event => { event.preventDefault(); closeReport(); });
panel.addEventListener('click',event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.pr === 'close') closeReport();
  else if (button.dataset.pr === 'export') downloadReport();
  else if (button.dataset.pr === 'print') {
    snapshot(); render(); preparePrint();
    try { window.print(); } catch { finishPrint(); $('#progress-report-status').textContent = 'Печать не открылась. Используйте команду печати в меню браузера.'; }
    $('[data-pr="print"]')?.focus({preventScroll:true});
  } else if (button.dataset.prOrgan && byId(button.dataset.prOrgan)) {
    const id = button.dataset.prOrgan; closeReport(false);
    document.dispatchEvent(new CustomEvent('anatomia:navigate',{detail:{action:'organ',id}}));
  } else if (button.dataset.prLearning) {
    const action = button.dataset.prLearning; closeReport(false);
    document.dispatchEvent(new CustomEvent('anatomia:learning',{detail:{action}}));
  } else if (button.dataset.prAction) navigate(button.dataset.prAction,button.dataset.prRetry === 'true');
});
panel.addEventListener('close',finishPrint);
window.addEventListener('beforeprint',preparePrint);
window.addEventListener('afterprint',finishPrint);
window.addEventListener('storage',event => { if (Object.values(reportKeys).includes(event.key) && panel.open) { snapshot(); render(); } });

export {openReport};
