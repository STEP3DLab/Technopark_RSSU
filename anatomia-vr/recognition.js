import {organs, sources, systemNames} from './data.js';
import {icon} from './experience.js';
import {createRecognitionState, createRecognitionSession, recognitionLabel, recognitionQuestionCount} from './recognition-state.js';

const byId = id => organs.find(o => o.id === id);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage;
try { storage = localStorage; } catch { storage = {getItem(){throw new Error('Storage unavailable');},setItem(){throw new Error('Storage unavailable');}}; }
const saved = createRecognitionState(storage,organs), sessions = {visual:null,verbal:null};
const dialog = document.createElement('dialog');
dialog.id = 'recognition-lab';
dialog.setAttribute('aria-labelledby','recognition-title');
document.body.append(dialog);
const $ = selector => dialog.querySelector(selector);
let mode = 'visual', opener = null, originDialog = null, generation = 0, imageTimer = null, retrySequence = 0, notice = '';
const active = () => sessions[mode];
const announce = () => document.dispatchEvent(new CustomEvent('anatomia:recognition-progress',{detail:saved.get()}));
function focus(selector = '#recognition-title') {
  $(selector)?.focus({preventScroll:true});
  if (['#recognition-title','#recognition-question','#recognition-result'].includes(selector)) dialog.scrollTop = 0;
}
function storageNote() {
  const state = saved.get();
  if (!state.persistent) return 'Сохранение в браузере недоступно. Результат работает до закрытия страницы.';
  if (state.corrupt) return 'Сохранённый результат повреждён. Новая попытка начнётся с чистого листа.';
  return 'Завершённые результаты хранятся только в этом браузере. Без аккаунта.';
}
function header() {
  return `<header class="rec-header"><div><span class="rec-eyebrow">ANATOMIA / ТРЕНИРОВКА УЗНАВАНИЯ</span><h2 id="recognition-title" tabindex="-1">${mode === 'visual' ? 'Узнать по изображению.' : 'Узнать по функции.'}</h2></div><button class="rec-close" data-rec-action="close" aria-label="Закрыть тренировку узнавания">${icon('close')}</button></header><nav class="rec-modes" aria-label="Формат тренировки"><button data-rec-mode="visual" aria-pressed="${mode === 'visual'}">${icon('eye')}По изображению</button><button data-rec-mode="verbal" aria-pressed="${mode === 'verbal'}">${icon('labels')}По функции · без изображения</button></nav><p class="rec-mode-note">${mode === 'visual' ? 'Определите орган по форме. Сторону тела здесь не проверяем.' : 'Отдельная словесная тренировка. Её результаты не входят в визуальный рекорд.'}</p>${notice ? `<p class="rec-notice" role="status">${esc(notice)}</p>` : ''}`;
}
function history(state) {
  const entry = saved.get()[mode];
  if (state.index !== 0 || state.answered || !entry.last) return '';
  return `<div class="rec-history"><span>Последняя ${entry.last.scope === 'review' ? 'проверка ошибок' : 'полная попытка'}: <b>${entry.last.correct} / ${entry.last.total}</b>${entry.last.skipped ? ` · пропущено ${entry.last.skipped}` : ''}</span>${entry.best !== null ? `<span>Лучший полный: <b>${entry.best} / ${recognitionQuestionCount}</b></span>` : ''}</div>`;
}
function media(state, organ) {
  if (mode === 'verbal') return `<div class="rec-verbal-cue"><span class="rec-cue-icon" aria-hidden="true">${icon('labels')}</span><span class="rec-eyebrow">ФУНКЦИЯ ОРГАНА</span><blockquote>${esc(organ.function)}</blockquote><p>Это формулировка из карточки атласа. Выберите подходящий орган.</p></div>`;
  return `<figure class="rec-figure"><div class="rec-image-frame" id="rec-image-frame" aria-busy="true"><img id="rec-image" width="720" height="900" decoding="async" alt="${state.answered ? esc(organ.name) + ': статичный вид исходной анатомической модели' : 'Анатомическая модель для задания. Определите орган по форме. Словесная альтернатива доступна в режиме «По функции».'}"><div class="rec-image-loading" id="rec-image-loading" aria-hidden="true"><span></span><b>Загружаем модель</b></div><div class="rec-image-error" id="rec-image-error" hidden><span aria-hidden="true">${icon('eye')}</span><h4>Изображение не загрузилось</h4><p>${state.answered ? 'Название, функция и учебный источник доступны в разборе.' : 'Ответы заблокированы: без изображения проверка была бы угадыванием.'}</p><div><button data-rec-action="retry-image">Повторить загрузку</button>${state.answered ? '' : '<button data-rec-action="skip-image">Пропустить без балла</button>'}</div></div></div><figcaption>Статичный вид исходной модели · масштаб условный</figcaption><p id="rec-image-status" class="rec-image-status" tabindex="-1" role="status">Загрузка изображения. ${state.answered ? '' : 'Ответы пока недоступны.'}</p></figure>`;
}
function question() {
  const state = active().get(), organ = byId(state.current.organId), answer = state.answered ? state.answers[state.index] : null;
  const locked = state.answered || mode === 'visual';
  return `<section class="rec-exercise">${history(state)}<div class="rec-question-meta"><span>${state.scope === 'review' ? 'ПОВТОР ОШИБОК' : '8 ОРГАНОВ · БЕЗ ТАЙМЕРА'}</span><b>${state.index + 1}<small> / ${state.total}</small></b></div><div class="rec-progress" role="progressbar" aria-label="Ответы в текущей попытке" aria-valuenow="${state.answers.length}" aria-valuemin="0" aria-valuemax="${state.total}"><i style="width:${state.answers.length / state.total * 100}%"></i></div><div class="rec-question-grid">${media(state,organ)}<div class="rec-choice-panel"><h3 id="recognition-question" tabindex="-1">${mode === 'visual' ? 'Какой орган перед вами?' : 'Какому органу соответствует функция?'}</h3><p class="rec-choice-hint">Выберите один из четырёх вариантов.</p><div class="rec-answers" aria-label="Варианты ответа">${state.current.options.map((id,index) => `<button data-rec-answer="${id}" ${locked ? 'disabled' : ''} class="${answer ? id === organ.id ? 'is-correct' : id === answer.choice ? 'is-wrong' : '' : ''}"><span class="rec-option-index" aria-hidden="true">${index + 1}</span><b>${esc(recognitionLabel(byId(id)))}</b>${answer && id === organ.id ? '<small>Верный ответ</small>' : answer && id === answer.choice ? '<small>Ваш ответ</small>' : ''}</button>`).join('')}</div>${answer ? feedback(state,organ,answer) : `<p class="rec-shortcuts">На клавиатуре: 1–4${mode === 'visual' ? ' после загрузки изображения' : ''}.</p>`}</div></div><p class="rec-pause-note">Закройте окно — попытка останется до перезагрузки страницы. Сохраняется только завершённый результат.</p></section>`;
}
function feedback(state, organ, answer) {
  return `<div class="rec-feedback ${answer.outcome === 'correct' ? 'is-correct' : answer.outcome === 'skipped' ? 'is-skipped' : ''}" id="rec-feedback" tabindex="-1" role="status"><span class="rec-feedback-label">${answer.outcome === 'correct' ? 'ВЕРНО' : answer.outcome === 'skipped' ? 'ПРОПУЩЕНО · БЕЗ БАЛЛА' : 'РАЗБЕРЁМ ОТВЕТ'}</span><h4>${esc(organ.name)}</h4><span class="rec-latin">${esc(organ.latin)}</span><p>${esc(organ.function)}</p><div><span>${esc(systemNames[organ.system])}</span><a href="${esc(sources[organ.source])}" target="_blank" rel="noopener">OpenStax · источник ↗</a></div></div><button class="rec-primary rec-next" data-rec-action="next">${state.index === state.total - 1 ? 'Посмотреть результат' : 'Следующий орган'} ${icon('arrow')}</button>`;
}
function result() {
  const state = active().get(), correct = state.answers.filter(a => a.outcome === 'correct').length, skipped = state.answers.filter(a => a.outcome === 'skipped').length;
  const missed = state.answers.filter(a => a.outcome !== 'correct'), entry = saved.get()[mode];
  return `<section class="rec-result"><div class="rec-result-top"><div class="rec-score" aria-label="Верных ответов: ${correct} из ${state.total}"><b>${correct}</b><span>из ${state.total}</span></div><div><span class="rec-eyebrow">${mode === 'visual' ? 'ВИЗУАЛЬНАЯ' : 'СЛОВЕСНАЯ'} ТРЕНИРОВКА · ${state.scope === 'review' ? 'ПОВТОР' : 'ПОЛНЫЙ ПРОХОД'}</span><h3 id="recognition-result" tabindex="-1">${correct === state.total ? 'Все органы узнаны.' : skipped === state.total ? 'Попытка завершена с пропусками.' : 'Повторим сложное.'}</h3><p>${missed.length ? `Для повтора: ${missed.length}.${skipped ? ` Без изображения пропущено: ${skipped}. За пропуск балл не начисляется.` : ''}` : 'Попробуйте объяснить, где находятся эти органы и как они работают.'}</p>${entry.best !== null ? `<div class="rec-best">Лучший полный ${mode === 'visual' ? 'визуальный' : 'словесный'} проход: <b>${entry.best} / ${recognitionQuestionCount}</b></div>` : ''}</div></div><div class="rec-result-actions">${missed.length ? '<button class="rec-primary" data-rec-action="mistakes">Повторить ошибки и пропуски</button>' : ''}<button class="${missed.length ? '' : 'rec-primary'}" data-rec-action="restart">Новые 8 органов</button><button data-rec-action="report">Все мои результаты</button></div><div class="rec-result-grid">${state.answers.map(answer => {const organ = byId(answer.organId);return `<article class="rec-result-organ"><span class="rec-result-status ${answer.outcome}">${answer.outcome === 'correct' ? '✓ Узнан' : answer.outcome === 'skipped' ? '— Пропущен' : '↻ Повторить'}</span><h4>${esc(organ.name)}</h4><small>${esc(organ.latin)}</small><button data-rec-organ="${organ.id}">Рассмотреть в атласе ${icon('arrow')}</button></article>`;}).join('')}</div><details class="rec-review"><summary>Показать разбор всех ответов</summary>${state.answers.map(answer => {const organ = byId(answer.organId);return `<article><h4>${esc(organ.name)}</h4><p class="rec-review-choice">${answer.outcome === 'skipped' ? 'Пропуск из-за недоступного изображения.' : `Ваш ответ: ${esc(recognitionLabel(byId(answer.choice)))} · ${answer.outcome === 'correct' ? 'верно' : 'неверно'}.`}</p><p>${esc(organ.function)}</p><a href="${esc(sources[organ.source])}" target="_blank" rel="noopener">OpenStax · источник ↗</a></article>`;}).join('')}</details><p class="rec-pause-note">${mode === 'verbal' ? 'Словесный результат не изменяет визуальный рекорд. ' : ''}Самопроверка для обучения, не оценка квалификации. Повтор ошибок не заменяет полный рекорд.</p></section>`;
}
function render() {
  clearTimeout(imageTimer); generation++;
  if (!active()) sessions[mode] = createRecognitionSession(organs,{mode});
  const state = active().get();
  if (!state.finished && !state.answered && mode === 'visual') active().setImageStatus('loading');
  dialog.innerHTML = header() + (state.finished ? result() : question()) + `<footer class="rec-footer"><span>${storageNote()}</span><span>Колледж МЕДСИ · ANATOMIA</span></footer>`;
  if (mode === 'visual' && !state.finished) loadImage();
}
function loadImage() {
  const image = $('#rec-image');
  if (!image) return;
  const token = generation, currentSession = active(), state = currentSession.get();
  const valid = () => generation === token && currentSession === active() && active().get().index === state.index && image.isConnected;
  function update(status) {
    if (!valid()) return;
    clearTimeout(imageTimer);
    if (!state.answered) currentSession.setImageStatus(status);
    const loading = status === 'loading', failed = status === 'error';
    image.hidden = loading || failed;
    $('#rec-image-frame').setAttribute('aria-busy',String(loading));
    $('#rec-image-loading').hidden = !loading;
    $('#rec-image-error').hidden = !failed;
    $('#rec-image-status').textContent = loading ? 'Загрузка изображения. Ответы пока недоступны.' : failed ? state.answered ? 'Изображение недоступно. Разбор ответа сохранён.' : 'Изображение недоступно. Ответы заблокированы.' : state.answered ? 'Статичный вид исходной анатомической модели.' : 'Изображение загружено. Выберите орган.';
    dialog.querySelectorAll('[data-rec-answer]').forEach(button => {button.disabled = state.answered || status !== 'ready';});
  }
  image.addEventListener('load',() => update(image.naturalWidth > 0 ? 'ready' : 'error'),{once:true});
  image.addEventListener('error',() => update('error'),{once:true});
  imageTimer = setTimeout(() => update('error'),12000);
  image.src = `./previews/${state.current.organId}.webp${retrySequence ? `?retry=${retrySequence}` : ''}`;
  // Cached images can complete before their load event is delivered.
  if (image.complete) update(image.naturalWidth > 0 ? 'ready' : 'error');
}
function visible(element) {
  return element?.isConnected && !element.disabled && !element.closest('[hidden],dialog:not([open])') && element.getClientRects().length > 0;
}
function close(restore = true) {
  clearTimeout(imageTimer); generation++;
  dialog.close();
  if (!restore) return;
  const parentLaunch = originDialog === 'modal' ? document.querySelector('.nav[data-tab="practice"]') : document.querySelector('#learning-launch');
  const fallback = [...document.querySelectorAll('[data-recognition],[data-progress-report],#learning-launch,#catalog-toggle')].find(visible);
  const target = visible(opener) && opener !== document.body ? opener : visible(parentLaunch) ? parentLaunch : fallback;
  target?.focus({preventScroll:true});
}
function startReview() {
  const attempt = saved.get()[mode].last;
  const ids = attempt?.answers.filter(a => a.outcome !== 'correct').map(a => a.organId) || [];
  if (!ids.length) { notice = 'В последней завершённой попытке нет ошибок или пропусков для повтора.'; return false; }
  sessions[mode] = createRecognitionSession(organs,{mode,scope:'review',organIds:ids});
  notice = ''; return true;
}
function open(options = {}) {
  mode = options.mode === 'verbal' ? 'verbal' : 'visual'; notice = '';
  if (!dialog.open) {
    opener = document.activeElement; originDialog = opener?.closest('dialog')?.id || null;
    document.querySelectorAll('dialog[open]').forEach(other => {if (other !== dialog) other.close();});
  }
  if (options.action === 'restart') sessions[mode] = createRecognitionSession(organs,{mode});
  else if (options.action === 'mistakes') startReview();
  render(); if (!dialog.open) dialog.showModal(); focus();
}
function answer(choice) {
  if (!active()?.answer(choice)) return;
  render(); focus('#rec-feedback');
}
dialog.addEventListener('click',event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || !button.isConnected) return;
  if (button.dataset.recMode) {mode = button.dataset.recMode === 'verbal' ? 'verbal' : 'visual';notice = '';render();focus();return;}
  if (button.dataset.recAnswer) {answer(button.dataset.recAnswer);return;}
  if (button.dataset.recOrgan) {
    const id = button.dataset.recOrgan; if (!byId(id)) return;
    close(false); document.dispatchEvent(new CustomEvent('anatomia:navigate',{detail:{action:'organ',id}}));return;
  }
  const action = button.dataset.recAction;
  if (action === 'close') close();
  else if (action === 'retry-image') {retrySequence++;render();focus('#rec-image-status');}
  else if (action === 'skip-image') {if (!active()?.skip()) return;render();focus('#rec-feedback');}
  else if (action === 'next') {
    if (!active()?.next()) return;
    if (active().get().finished) {saved.record(active().result());announce();}
    render();focus(active().get().finished ? '#recognition-result' : '#recognition-question');
  } else if (action === 'restart') {sessions[mode] = createRecognitionSession(organs,{mode});notice = '';render();focus('#recognition-question');}
  else if (action === 'mistakes') {startReview();render();focus('#recognition-question');}
  else if (action === 'report') document.dispatchEvent(new CustomEvent('anatomia:progress-report'));
});
dialog.addEventListener('cancel',event => {event.preventDefault();close();});
dialog.addEventListener('close',() => {clearTimeout(imageTimer);generation++;});
dialog.addEventListener('keydown',event => {
  if (!dialog.open || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.target.closest('input,textarea,select,[contenteditable="true"]') || !/^[1-4]$/.test(event.key)) return;
  const state = active()?.get();
  if (!state || state.finished || state.answered || state.imageStatus !== 'ready') return;
  event.preventDefault();answer(state.current.options[Number(event.key) - 1]);
});
document.addEventListener('click',event => {
  const trigger = event.target.closest('[data-recognition]');
  if (!trigger || trigger.disabled) return;
  event.preventDefault();open({mode:trigger.dataset.recognition === 'verbal' ? 'verbal' : 'visual'});
});
document.addEventListener('anatomia:recognition',event => open(event.detail || {}));
document.addEventListener('anatomia:request-progress',announce);
announce();
