import {icon, lessons} from './experience.js';

const panel = document.createElement('dialog');
panel.id = 'practice-hub';
panel.setAttribute('aria-labelledby', 'practice-hub-title');
document.body.append(panel);
let opener = null;
const emit = (name, detail) => document.dispatchEvent(new CustomEvent(`anatomia:${name}`, {detail}));
const visible = el => el?.isConnected && !el.disabled && !el.closest('[hidden],dialog:not([open])') && el.getClientRects().length;

export function openPracticeHub({fallbackMode = true, viewed = 0} = {}) {
  opener = document.activeElement;
  document.querySelectorAll('dialog[open]').forEach(dialog => { if (dialog !== panel) dialog.close(); });
  const count = Number.isInteger(viewed) ? Math.min(16, Math.max(0, viewed)) : 0;
  panel.innerHTML = `<header class="ph-head"><div><span class="ph-eyebrow">ANATOMIA / ПРАКТИКА</span><h2 id="practice-hub-title" tabindex="-1">Понять в объёме.</h2><p>Рассмотрите положение. Изучите связи. Проверьте себя.</p></div><button class="ph-close" data-practice-action="close" aria-label="Закрыть практику">${icon('close')}</button></header>
  <div class="ph-body"><section class="ph-main" aria-label="Форматы практики">
    <button class="ph-feature" data-practice-action="compare"><div><span class="ph-tag">ПРОСТРАНСТВЕННОЕ ИЗУЧЕНИЕ</span><h3>Два органа<br>в одной сцене</h3><p>Выберите пару для совместного осмотра в 3D.</p><span class="ph-feature-action">Выбрать пару ${icon('arrow')}</span></div><div class="ph-feature-art" aria-hidden="true"><img src="./previews/overview.webp" width="720" height="900" alt=""><span>16 СТРУКТУР</span></div></button>
    <div class="ph-quick-grid">
      <button class="ph-tile" data-practice-action="contrast"><span class="ph-tile-icon">${icon('check')}</span><h3>Различить похожее</h3><p>8 вопросов о понятиях и функциях</p><span class="ph-link">Разобраться ${icon('arrow')}</span></button>
      <button class="ph-tile" data-practice-action="quiz"><span class="ph-tile-icon">${icon('focus')}</span><h3>Проверить знания</h3><p>8 вопросов по всему атласу</p><span class="ph-link">Ответить ${icon('arrow')}</span></button>
      <button class="ph-tile" data-practice-action="recognition"><span class="ph-tile-icon">${icon('eye')}</span><h3>Узнать по изображению</h3><p>8 структур без подписи</p><span class="ph-link">Назвать ${icon('arrow')}</span></button>
      <button class="ph-tile" data-practice-action="cards"><span class="ph-tile-icon">${icon('layers')}</span><h3>Вспомнить по карточкам</h3><p>Латынь, расположение и функция</p><span class="ph-link">Повторить ${icon('arrow')}</span></button>
    </div>
  </section>
<section class="ph-spatial" aria-labelledby="ph-spatial-title"><div class="ph-section-head"><h3 id="ph-spatial-title">Практика на 3D-модели</h3></div>${fallbackMode?'<p class="ph-spatial-note">Эти задания доступны при работающем 3D-просмотре.</p>':''}<div class="ph-more-grid"><button data-practice-action="find" ${fallbackMode?'disabled':''}>${icon('focus')}<span><b>Найти орган в 3D</b><small>${fallbackMode?'Доступно при работающем 3D':'8 пространственных заданий'}</small></span></button>${lessons.map(l=>`<button data-practice-route="${l.id}" ${fallbackMode?'disabled':''}>${icon(l.icon)}<span><b>${l.name}</b><small>${fallbackMode?'Визуальный маршрут в 3D':l.hint}</small></span></button>`).join('')}</div></section>
    <section class="ph-labs" aria-labelledby="ph-labs-title"><div class="ph-section-head"><h3 id="ph-labs-title">Как это работает</h3><button data-practice-action="teacher">Провести занятие ${icon('arrow')}</button></div><div class="ph-lab-grid">${[['heart','Сердце','Кровоток и работа миокарда','heart'],['lungs','Лёгкие','Воздух и газообмен','lungs'],['kidneys','Почки','Фильтрация и отток мочи','drop']].map(([id,name,hint,ico])=>`<button data-practice-lab="${id}"><span>${icon(ico)}</span><div><b>${name}</b><small>${hint}</small></div>${icon('arrow')}</button>`).join('')}</div></section>
  <details class="ph-more"><summary>Ситуации и расчёт</summary><div class="ph-more-grid"><button data-practice-action="case">${icon('check')}<span><b>Четыре учебные ситуации</b><small>Применить знания о функции и положении</small></span></button><button data-practice-action="physiology">${icon('heart')}<span><b>Расчёт кровообращения</b><small>ЧСС × ударный объём</small></span></button></div></details>
  <footer class="ph-foot"><div><b>${count} из 16</b><span>структур просмотрено · просмотр не равен знанию</span></div><button data-practice-action="report">Мои результаты ${icon('arrow')}</button></footer>
  </div>`;
  panel.querySelector('.ph-feature-art img')?.addEventListener('error', event => { event.currentTarget.parentElement.hidden = true; });
  if (!panel.open) panel.showModal();
  panel.scrollTop = 0;
  panel.querySelector('#practice-hub-title').focus({preventScroll:true});
}

function close(restore = true) {
  panel.close();
  if (restore) (visible(opener) ? opener : document.querySelector('.nav[data-tab="practice"]'))?.focus({preventScroll:true});
}
panel.addEventListener('cancel', event => { event.preventDefault(); close(); });
panel.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  const action = button.dataset.practiceAction;
  if (action === 'close') { close(); return; }
  close(false);
  if (button.dataset.practiceLab) { emit('teaching', {organ:button.dataset.practiceLab}); return; }
  if (button.dataset.practiceRoute) { emit('navigate', {action:'route',id:button.dataset.practiceRoute}); return; }
  if (action === 'recognition') emit('recognition', {mode:'visual'});
  else if (action === 'compare' || action === 'contrast') emit('workbench', {mode:action});
  else if (action === 'cards') emit('learning', {action:'cards'});
  else if (action === 'teacher') emit('learning', {action:'teacher'});
  else if (action === 'report') emit('progress-report', {});
  else if (['quiz','case','physiology','find'].includes(action)) emit('navigate', {action});
});
