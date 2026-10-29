import {organs, sources, systemNames} from './data.js';
import {briefs, icon} from './experience.js';
import {contrastPairs as contrastTasks} from './contrast-content.js';
import {createWorkbenchState, createContrastSession, comparisonFromURL, comparisonURL, validPair} from './workbench-state.js';

const ids = organs.map(o => o.id), byId = id => organs.find(o => o.id === id);
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let storage;
try { storage = localStorage; } catch { storage = {getItem(){throw new Error('Storage unavailable');}, setItem(){throw new Error('Storage unavailable');}}; }
const store = createWorkbenchState(storage, ids, contrastTasks);
const publishProgress = () => document.dispatchEvent(new CustomEvent('anatomia:workbench-progress', {detail:store.get()}));
document.addEventListener('anatomia:request-progress', publishProgress);
const panel = document.createElement('dialog');
panel.id = 'anatomia-workbench';
panel.setAttribute('aria-labelledby', 'workbench-title');
document.body.append(panel);
const $ = selector => panel.querySelector(selector);
let mode = 'compare', pair = store.get().pair, session = null, opener = null, openerDialog = null;
const presets = [
  {ids:['lungR','lungL'], label:'Лёгкие', hint:'Форма и доли'},
  {ids:['kidneyR','kidneyL'], label:'Почки', hint:'Расположение'},
  {ids:['liver','gallbladder'], label:'Печень и пузырь', hint:'Образование и накопление'},
  {ids:['stomach','pancreas'], label:'Желудок и железа', hint:'Функция и соседство'}
];
function focus(selector = '#workbench-title') {
  $(selector)?.focus({preventScroll:true});
  if (selector === '#workbench-title' || selector === '#workbench-question') panel.scrollTop = 0;
}
function localNote() {
  const saved = store.get();
  return !saved.persistent ? 'Результат доступен до закрытия страницы: сохранение в браузере заблокировано.'
    : saved.corrupt ? 'Сохранённые данные не удалось прочитать. Новая попытка начнётся с чистого листа.'
    : 'Прогресс хранится только в этом браузере. Без аккаунта и передачи результатов.';
}
function header() {
  return `<header class="wb-header"><div><span class="wb-eyebrow">ANATOMIA / УЧЕБНАЯ ПРАКТИКА</span><h2 id="workbench-title" tabindex="-1">${mode === 'compare' ? 'Увидеть разницу.' : 'Различить похожее.'}</h2></div><button class="wb-close" data-wb="close" aria-label="Закрыть учебную практику">${icon('close')}</button></header><nav class="wb-tabs" aria-label="Учебная практика"><button data-wb-mode="compare" aria-pressed="${mode === 'compare'}">${icon('layers')}Сравнить органы</button><button data-wb-mode="contrast" aria-pressed="${mode === 'contrast'}">${icon('check')}Различить похожее</button></nav>`;
}
function organSelect(id, index) {
  return `<label class="wb-select-label" for="wb-organ-${index}">Орган ${index + 1}<select id="wb-organ-${index}" data-wb-organ="${index}">${organs.map(o => `<option value="${o.id}" ${o.id === id ? 'selected' : ''} ${o.id === pair[1 - index] ? 'disabled' : ''}>${esc(o.name)}</option>`).join('')}</select></label>`;
}
function compareCard(id, index) {
  const o = byId(id);
  return `<article class="wb-organ-card" aria-labelledby="wb-organ-name-${index}">${organSelect(id, index)}<div class="wb-organ-visual"><img src="./previews/${id}.webp" width="720" height="900" alt="${esc(o.name)}: статичный вид исходной анатомической модели" decoding="async"><span class="wb-organ-system">${esc(systemNames[o.system])}</span></div><div class="wb-organ-copy"><div class="wb-organ-heading"><h3 id="wb-organ-name-${index}">${esc(o.name)}</h3><span>${esc(o.latin)}</span></div><p class="wb-organ-brief">${esc(briefs[id])}</p><dl><dt>Где находится</dt><dd>${esc(o.location)}</dd><dt>Что делает</dt><dd>${esc(o.function)}</dd></dl><details class="wb-landmark"><summary>На что обратить внимание в атласе</summary><p>${esc(o.landmark)}</p></details><div class="wb-organ-actions"><button class="wb-primary" data-wb-open-organ="${id}">Открыть в атласе ${icon('arrow')}</button><a href="${esc(sources[o.source])}" target="_blank" rel="noopener">OpenStax ↗<span class="sr-only"> · источник: ${esc(o.name)}</span></a></div></div></article>`;
}
function compare() {
  const current = presets.find(p => p.ids.every((id,i) => pair[i] === id));
  return `<section class="wb-compare"><div class="wb-compare-intro"><p>Два органа рядом: сопоставьте форму, расположение и функцию.</p><button class="wb-share" data-wb="share">${icon('link')}Ссылка на сравнение</button></div><div class="wb-3d-launch"><div><span class="wb-eyebrow">ОБЩАЯ 3D-СЦЕНА</span><b>${pair.map(id => esc(byId(id).name)).join(' + ')}</b><p>Рассмотрите пару со всех сторон. Исходные взаимное положение и масштаб модели сохраняются.</p></div><button class="wb-primary" data-wb="compare3d" aria-describedby="wb-3d-status">${icon('layers')}Открыть пару в 3D ${icon('arrow')}</button><p id="wb-3d-status" role="status"></p></div><div class="wb-presets" role="group" aria-label="Готовые сравнения">${presets.map((p,index) => `<button data-wb-preset="${index}" aria-pressed="${p === current}"><b>${esc(p.label)}</b><small>${esc(p.hint)}</small></button>`).join('')}</div><div class="wb-compare-grid">${pair.map(compareCard).join('')}</div><p class="wb-image-note">Статичные виды исходных моделей · изображения масштабированы независимо: размеры органов по ним не сравнивают.</p><div class="wb-share-result" id="wb-share-result" hidden><label for="wb-share-url">Ссылка открывает эту пару органов</label><div><input id="wb-share-url" readonly value="${esc(comparisonURL(location.href, pair, ids) || '')}" aria-describedby="wb-share-status"><button data-wb="copy-link">Копировать</button></div><p id="wb-share-status" role="status"></p></div><div class="wb-compare-next"><span>Форму рассмотрели. А функции различаете?</span><button data-wb-mode="contrast">8 коротких заданий ${icon('arrow')}</button></div></section>`;
}
function quiz() {
  if (!session) session = createContrastSession(contrastTasks);
  const s = session.get();
  if (s.finished) return result();
  const task = contrastTasks.find(t => t.id === s.id), response = s.answered ? s.answers[s.index] : null, saved = store.get();
  const history = s.index === 0 && !s.answered && saved.last ? `<div class="wb-history"><span>Последняя ${saved.last.scope === 'review' ? 'проверка ошибок' : 'полная попытка'}: <b>${saved.last.correct} / ${saved.last.total}</b></span>${saved.best !== null ? `<span>Лучший полный: <b>${saved.best} / ${contrastTasks.length}</b></span>` : ''}</div>` : '';
  return `<section class="wb-quiz">${history}<div class="wb-quiz-meta"><span>${s.scope === 'all' ? '8 РАЗЛИЧИЙ' : 'ПОВТОР ОШИБОК'}</span><b>${s.index + 1}<small> / ${s.total}</small></b></div><div class="wb-progress" role="progressbar" aria-label="Ответы в текущей попытке" aria-valuenow="${s.answers.length}" aria-valuemin="0" aria-valuemax="${s.total}"><i style="width:${s.answers.length / s.total * 100}%"></i></div><h3 id="workbench-question" tabindex="-1">${esc(task.prompt)}</h3><p class="wb-quiz-instruction">Выберите один ответ. Объяснение откроется после выбора.</p><div class="wb-answers">${s.order.map((choice,index) => `<button data-wb-choice="${choice}" ${s.answered ? 'disabled' : ''} class="${response ? choice === task.answer ? 'is-correct' : choice === response.choice ? 'is-wrong' : '' : ''}"><span class="wb-option-number" aria-hidden="true">${index + 1}</span><b>${esc(task.options[choice])}</b>${response && choice === task.answer ? `<span class="wb-answer-label">${icon('check')}Верный ответ</span>` : response && choice === response.choice ? '<span class="wb-answer-label">Ваш ответ</span>' : ''}</button>`).join('')}</div>${response ? `<div id="wb-feedback" class="wb-feedback ${response.correct ? 'is-correct' : ''}" tabindex="-1" role="status"><b>${response.correct ? 'Верно.' : 'Разберём различие.'}</b><p>${esc(task.why)}</p><a href="${esc(task.source)}" target="_blank" rel="noopener">Проверить по учебному источнику ↗</a></div><button class="wb-primary wb-next" data-wb="next">${s.index === s.total - 1 ? 'Посмотреть результат' : 'Следующий вопрос'} ${icon('arrow')}</button>` : '<p class="wb-key-hint">На клавиатуре: 1 или 2 · без ограничения времени</p>'}<p class="wb-pause-note">Закройте окно — попытка останется до перезагрузки страницы. Сохраняется только завершённый результат.</p></section>`;
}
function result() {
  const s = session.get(), correct = s.answers.filter(a => a.correct).length, mistakes = s.answers.filter(a => !a.correct), saved = store.get();
  return `<section class="wb-result"><div class="wb-result-score" aria-label="Правильных ответов: ${correct} из ${s.total}"><b>${correct}</b><span>из ${s.total}</span></div><span class="wb-eyebrow">${s.scope === 'all' ? 'ПОЛНАЯ ПОПЫТКА' : 'ПОВТОР ОШИБОК'}</span><h3 id="workbench-result" tabindex="-1">${mistakes.length ? 'Теперь различия понятнее.' : 'Все различия найдены.'}</h3><p>${mistakes.length ? 'Вернитесь к сложным вопросам или рассмотрите связанные органы в атласе.' : 'Перенесите знание на модель: найдите органы и объясните их функции своими словами.'}</p>${saved.best !== null ? `<div class="wb-best">Лучший полный проход: <b>${saved.best} / ${contrastTasks.length}</b></div>` : ''}<div class="wb-result-actions">${mistakes.length ? '<button class="wb-primary" data-wb="repeat">Повторить ошибки</button>' : '<button class="wb-primary" data-wb-mode="compare">Сравнить органы</button>'}<button data-wb="restart">Все ${contrastTasks.length} ещё раз</button></div>${mistakes.length ? `<div class="wb-review-list"><h4>Разобрать на модели</h4>${[...new Set(mistakes.map(a => contrastTasks.find(t => t.id === a.id).organId))].map(id => `<button data-wb-open-organ="${id}"><span>${esc(byId(id).name)}</span>${icon('arrow')}</button>`).join('')}</div>` : ''}<details class="wb-review"><summary>Разбор всех ответов</summary>${s.answers.map(a => {const t = contrastTasks.find(t => t.id === a.id);return `<article><span>${a.correct ? '✓ Верно' : '↻ Повторить'}</span><h4>${esc(t.prompt)}</h4><p><b>${esc(t.options[t.answer])}.</b> ${esc(t.why)}</p><a href="${esc(t.source)}" target="_blank" rel="noopener">Учебный источник ↗</a></article>`;}).join('')}</details><p class="wb-pause-note">Самопроверка для обучения. Результат не является оценкой квалификации.</p></section>`;
}
function render() {
  panel.innerHTML = header() + (mode === 'compare' ? compare() : quiz()) + `<footer class="wb-footer"><span>${localNote()}</span><span>Колледж МЕДСИ · Учебный проект</span></footer>`;
  panel.querySelectorAll('.wb-organ-visual img').forEach(img => img.addEventListener('error', () => {
    img.hidden = true;
    const note = document.createElement('p'); note.className = 'wb-image-missing'; note.textContent = 'Изображение недоступно. Описание и источник доступны ниже.';
    img.parentElement.prepend(note);
  }, {once:true}));
}
function open(nextMode = 'compare') {
  mode = nextMode === 'contrast' ? 'contrast' : 'compare';
  if (!panel.open) {
    opener = document.activeElement;
    openerDialog = opener?.closest('dialog')?.id || null;
    // Keep only one modal interaction active. In particular a Practice launch
    // must not leave the old menu on the top layer behind this workspace.
    document.querySelectorAll('dialog[open]').forEach(dialog => { if (dialog !== panel) dialog.close(); });
  }
  render();
  if (!panel.open) panel.showModal();
  focus();
}
function close(restore = true) {
  panel.close();
  if (!restore) return;
  const visible = element => element?.isConnected && !element.disabled && !element.closest('[hidden],dialog:not([open])') && element.getClientRects().length > 0;
  const parentLaunch = ['modal','practice-hub'].includes(openerDialog) ? document.querySelector('.nav[data-tab="practice"]')
    : openerDialog === 'learning-hub' || openerDialog === 'teaching-lab' ? document.querySelector('#learning-launch') : null;
  const fallback = [...document.querySelectorAll('[data-workbench="compare"],[data-workbench="contrast"],#learning-launch,#catalog-toggle')].find(visible);
  const target = visible(opener) && opener !== document.body ? opener : visible(parentLaunch) ? parentLaunch : fallback;
  target?.focus({preventScroll:true});
}
function setMode(value) { mode = value === 'contrast' ? 'contrast' : 'compare'; render(); focus(); }
function recordAnswer(choice) { if (mode !== 'contrast' || !session?.answer(choice)) return; render(); focus('#wb-feedback'); }
async function copyLink() {
  const value = comparisonURL(location.href, pair, ids), field = $('#wb-share-url'), status = $('#wb-share-status');
  if (!value || !field || !status) return;
  try {
    await navigator.clipboard.writeText(value);
    if (panel.open && field === $('#wb-share-url')) status.textContent = 'Ссылка скопирована. Прогресс и ответы в неё не входят.';
  } catch {
    if (!panel.open || field !== $('#wb-share-url')) return;
    field.focus(); field.select(); status.textContent = 'Автокопирование недоступно. Ссылка выделена: скопируйте её вручную.';
  }
}
panel.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || !button.isConnected) return;
  if (button.dataset.wbMode) { setMode(button.dataset.wbMode); return; }
  if (button.dataset.wbPreset !== undefined) {
    const preset = presets[Number(button.dataset.wbPreset)];
    if (!preset) return;
    pair = [...preset.ids]; store.setPair(pair); render(); focus(`[data-wb-preset="${button.dataset.wbPreset}"]`); return;
  }
  if (button.dataset.wbChoice !== undefined) { recordAnswer(Number(button.dataset.wbChoice)); return; }
  if (button.dataset.wbOpenOrgan) {
    const id = button.dataset.wbOpenOrgan;
    if (!ids.includes(id)) return;
    close(false);
    // A launch from another modal must not leave the atlas covered by it.
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    document.dispatchEvent(new CustomEvent('anatomia:navigate', {detail:{action:'organ',id}}));
    return;
  }
  const action = button.dataset.wb;
  if (action === 'close') close();
  else if (action === 'compare3d') {
    $('#wb-3d-status').textContent = 'Подготовка 3D-сцены…';
    document.dispatchEvent(new CustomEvent('anatomia:navigate', {detail:{action:'compare3d',ids:[...pair]}}));
  }
  else if (action === 'share') { $('#wb-share-result').hidden = false; $('#wb-share-url').focus(); copyLink(); }
  else if (action === 'copy-link') copyLink();
  else if (action === 'next') {
    if (!session?.next()) return;
    if (session.get().finished) { store.record(session.result()); publishProgress(); }
    render(); focus(session.get().finished ? '#workbench-result' : '#workbench-question');
  } else if (action === 'restart' || action === 'repeat') {
    const missed = action === 'repeat' ? session?.get().answers.filter(a => !a.correct).map(a => a.id) : undefined;
    const next = createContrastSession(contrastTasks, missed);
    if (!next) return;
    session = next; render(); focus('#workbench-question');
  }
});
panel.addEventListener('change', event => {
  const index = event.target.dataset.wbOrgan;
  if (index !== '0' && index !== '1') return;
  const next = [...pair]; next[Number(index)] = event.target.value;
  if (!store.setPair(next)) return;
  pair = next; render(); focus(`#wb-organ-${index}`);
});
panel.addEventListener('cancel', event => { event.preventDefault(); close(); });
panel.addEventListener('keydown', event => {
  if (!panel.open || mode !== 'contrast' || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target.closest('input,select,textarea,[contenteditable="true"]')) return;
  if (event.key !== '1' && event.key !== '2') return;
  const s = session?.get();
  if (!s || s.answered || s.finished) return;
  event.preventDefault(); recordAnswer(s.order[Number(event.key) - 1]);
});
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-workbench]');
  if (!trigger || trigger.disabled) return;
  if (!['compare','contrast'].includes(trigger.dataset.workbench)) return;
  event.preventDefault(); open(trigger.dataset.workbench);
});
document.addEventListener('anatomia:workbench', event => {
  const {mode:nextMode, action, ids:requestedPair} = event.detail || {};
  const validRequestedPair = validPair(requestedPair, ids);
  if (nextMode === 'compare' && validRequestedPair) { pair = validRequestedPair; store.setPair(pair); }
  if (nextMode === 'contrast' && action === 'mistakes') {
    const last = store.get().last;
    const missed = last?.answers.filter(a => !a.correct).map(a => a.id);
    if (missed?.length) session = createContrastSession(contrastTasks, missed);
  } else if (nextMode === 'contrast' && action === 'restart') session = createContrastSession(contrastTasks);
  open(nextMode);
});
document.addEventListener('anatomia:comparison3d-state', event => {
  const {status, ids:openedPair, message} = event.detail || {};
  if (!validPair(openedPair, ids)) return;
  const matchesOpenComparison = panel.open && mode === 'compare' && openedPair.every((id,index) => id === pair[index]);
  if (!matchesOpenComparison) return;
  if (status === 'ready') {
    if (panel.open) close(false);
    document.querySelector('#viewport')?.focus({preventScroll:true});
  } else if (status === 'unavailable' && panel.open && mode === 'compare') {
    const note = $('#wb-3d-status');
    if (note) note.textContent = typeof message === 'string' && message ? message : '3D сейчас недоступно. Вы можете продолжить сравнение по изображениям и описаниям.';
  }
});

// Resolve a shared comparison only when it names two supported, distinct structures.
const sharedPair = comparisonFromURL(location.href, ids);
if (sharedPair) { pair = sharedPair; store.setPair(pair); open('compare'); }
