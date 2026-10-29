import {organs, systemNames} from './data.js?v=1.10.0';
import {icon} from './experience.js';
import {createSceneStore, sceneFromURL, sceneURL, scenePresets, sceneLimit} from './scene-state.js?v=1.10.0';

const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const byId = id => organs.find(organ => organ.id === id);
const viewLabels = {front:'Спереди',back:'Сзади',right:'Справа',left:'Слева',top:'Сверху',bottom:'Снизу'};
const presetLabels = {all:'Все структуры',cardiorespiratory:'Сердце и дыхание',digestive:'Пищеварение',urinary:'Почки и пузырь'};
const qualityLabels = {auto:'Авто',high:'Высокое',eco:'Экономное'};
const qualityHints = {auto:'Разрешение подбирается для этого экрана.',high:'Чётче изображение; выше нагрузка на устройство.',eco:'Меньше нагрузка на устройство при вращении модели.'};
const viewStyleKey = 'anatomia-view-style-v1';
const sectionAxes = {axial:{label:'Поперечный',hint:'Сверху / снизу'},coronal:{label:'Фронтальный',hint:'Спереди / сзади'},sagittal:{label:'Сагиттальный',hint:'Справа / слева'}};
const sectionDefaults = {axis:'axial',mode:'cut',position:.5,thickness:.15,flipped:false,scope:'selected',guide:true,cap:false};
const normalizeSearch = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const searchNames = new Map(organs.map(organ=>[organ.id,normalizeSearch(`${organ.name} ${organ.latin}`)]));

function initialiseScenePanel() {
  const stage = document.querySelector('.stage');
  const trigger = document.querySelector('#scene-tools-toggle');
  if (!stage || !trigger) return;
  let storage;
  try { storage = localStorage; }
  catch { storage = {getItem(){throw new Error('Storage unavailable');},setItem(){throw new Error('Storage unavailable');}}; }
  let viewStyle = 'light', viewStylePersistent = true;
  try { if (storage.getItem(viewStyleKey) === 'studio') viewStyle = 'studio'; }
  catch { viewStylePersistent = false; }
  document.body.classList.toggle('studio-view',viewStyle === 'studio');
  const store = createSceneStore(storage);
  const sharedScene = sceneFromURL(location.href);
  let shared = sharedScene ? {scene:sharedScene,phase:'waiting',autoArmed:true,requestId:null} : null;
  let state = {available:false,reason:'Ожидаем состояние 3D-просмотра.',visible:[],hidden:[],selected:null,context:false,isolated:false,contextOpacity:.075,snapshot:null};
  let graphicsState = {available:false,quality:'auto',effectiveDPR:null,reason:'Ожидаем готовность 3D-просмотра.'};
  let sectionState = {available:false,reason:'Срез станет доступен после загрузки 3D.',enabled:false,config:{...sectionDefaults},selected:null,affected:[],capAvailable:false};
  let open = false, activeTab = 'organs', requestCounter = 0, deleteId = null, renameId = null, receivedState = false;
  let receivedGraphicsState = false, receivedSectionState = false;
  let lastSavedSignature = '', lastApply = null, shareVersion = 0;
  const panel = document.createElement('aside');
  panel.id = 'scene-panel';
  panel.hidden = true;
  panel.setAttribute('role','region');
  panel.setAttribute('aria-labelledby','scene-panel-title');
  const groups = Object.entries(systemNames).map(([key,name]) => ({key,name,items:organs.filter(organ=>organ.system===key)}));
  panel.innerHTML = `<header class="sp-head"><div><span class="sp-eyebrow">ANATOMIA / 3D</span><h2 id="scene-panel-title" tabindex="-1">Настройка сцены</h2></div><button class="sp-close" data-scene-ui="close" aria-label="Закрыть настройку сцены">${icon('close')}</button></header>
    <div class="sp-availability" id="scene-availability"></div>
    <nav class="sp-tabs" role="tablist" aria-label="Настройка сцены"><button id="scene-tab-organs" role="tab" aria-selected="true" aria-controls="scene-page-organs" tabindex="0" data-scene-tab="organs">Органы</button><button id="scene-tab-saved" role="tab" aria-selected="false" aria-controls="scene-page-saved" tabindex="-1" data-scene-tab="saved">Мои ракурсы <span id="scene-saved-count">0</span></button></nav>
    <div class="sp-scroll">
      <section class="sp-shared" id="scene-shared" hidden><span class="sp-eyebrow">СЦЕНА ИЗ ССЫЛКИ</span><p id="scene-shared-description"></p><div><button data-scene-ui="apply-shared" class="sp-primary">Применить сцену</button><button data-scene-ui="cancel-shared">Отменить</button></div></section>
      <section id="scene-page-organs" role="tabpanel" aria-labelledby="scene-tab-organs">
        <div class="sp-section-label"><h3>Быстрый состав</h3><span id="scene-visible-count"></span></div>
        <div class="sp-presets" role="group" aria-label="Наборы структур">${scenePresets.map(preset=>`<button data-scene-preset="${preset.id}" data-scene-live aria-pressed="false" title="${escapeHTML(preset.name)}">${escapeHTML(presetLabels[preset.id] || preset.name)}</button>`).join('')}</div>
        <section class="sp-section-cut" id="scene-section" aria-labelledby="scene-section-title">
          <div class="sp-cut-heading"><div><span class="sp-eyebrow">ИССЛЕДОВАТЬ ВНУТРИ</span><h3 id="scene-section-title" tabindex="-1">Срез и слои</h3></div><span id="scene-section-badge" class="sp-cut-badge">3D</span></div>
          <label class="sp-cut-toggle"><span>Включить срез</span><input id="scene-section-toggle" type="checkbox" role="switch" aria-controls="scene-section-controls" aria-describedby="scene-section-status" disabled><span class="sp-switch-track" aria-hidden="true"></span></label>
          <p class="sp-cut-status" id="scene-section-status" role="status" aria-live="polite" aria-atomic="true"></p>
          <div id="scene-section-controls" hidden>
            <label class="sp-range-label" for="scene-section-position"><span>Положение плоскости</span><output id="scene-section-position-value" for="scene-section-position">50%</output></label>
            <div class="sp-cut-slider"><button type="button" data-section-step="-1" data-section-live aria-label="Сдвинуть срез на один процент назад">−</button><input id="scene-section-position" type="range" min="0" max="100" step="1" value="50" data-section-live aria-describedby="scene-section-position-help"><button type="button" data-section-step="1" data-section-live aria-label="Сдвинуть срез на один процент вперёд">+</button></div>
            <p class="sp-help sp-cut-position-help" id="scene-section-position-help">Перемещайте ползунок, чтобы пройти через модель.</p>
            <p class="sp-control-label" id="scene-section-axis-label">Плоскость среза</p>
            <div class="sp-cut-axes" role="group" aria-labelledby="scene-section-axis-label">${Object.entries(sectionAxes).map(([value,axis])=>`<button type="button" data-section-axis="${value}" data-section-live aria-pressed="${value==='axial'}"><span class="sp-plane-icon sp-plane-${value}" aria-hidden="true"></span><b>${axis.label}</b><small>${axis.hint}</small></button>`).join('')}</div>
            <p class="sp-control-label" id="scene-section-mode-label">Способ просмотра</p>
            <div class="sp-choice-group sp-cut-modes" role="group" aria-labelledby="scene-section-mode-label"><button type="button" data-section-mode="cut" data-section-live aria-pressed="true">Срез</button><button type="button" data-section-mode="slab" data-section-live aria-pressed="false">Тонкий слой</button></div>
            <div id="scene-section-thickness-group" hidden><label class="sp-range-label" for="scene-section-thickness"><span>Толщина слоя</span><output id="scene-section-thickness-value" for="scene-section-thickness">15%</output></label><input id="scene-section-thickness" type="range" min="4" max="100" step="1" value="15" data-section-live aria-describedby="scene-section-thickness-help"><p class="sp-help" id="scene-section-thickness-help">Доля размера модели вдоль выбранной оси.</p></div>
            <p class="sp-control-label" id="scene-section-scope-label">К каким структурам применить</p>
            <div class="sp-choice-group sp-cut-scopes" role="group" aria-labelledby="scene-section-scope-label"><button type="button" data-section-scope="selected" data-section-live aria-pressed="true">Этот орган</button><button type="button" data-section-scope="visible" data-section-live aria-pressed="false">Органы сцены</button></div><p class="sp-help sp-cut-scope-help">Прозрачные соседи и скелет остаются ориентирами.</p>
            <div class="sp-cut-secondary"><button type="button" id="scene-section-flip" data-section-live aria-pressed="false">Обратная сторона</button><button type="button" data-section-reset data-section-live>Сбросить срез</button></div>
            <details class="sp-cut-display"><summary>Отображение среза</summary><label class="sp-cut-option"><input id="scene-section-guide" type="checkbox" data-section-live checked><span>Показать плоскость</span></label><label class="sp-cut-option"><input id="scene-section-cap" type="checkbox" data-section-live aria-describedby="scene-section-cap-help"><span>Закрыть поверхность среза</span></label><p class="sp-help" id="scene-section-cap-help">Условная заливка закрывает контур и может скрыть внутренние структуры. Она не добавляет тканевые слои.</p><p class="sp-help" id="scene-section-cap-unavailable" hidden>В этом режиме условная заливка недоступна.</p></details>
          </div>
          <p class="sp-cut-note">Срез показывает геометрию исходной модели. Представлены не все внутренние структуры.</p>
        </section>
        <section class="sp-camera" aria-labelledby="scene-camera-title"><h3 id="scene-camera-title">Ракурс</h3><div class="sp-views" role="group" aria-label="Ракурс модели">${Object.entries(viewLabels).map(([value,label])=>`<button data-scene-view="${value}" data-scene-live>${label}</button>`).join('')}</div><button class="sp-fit" data-scene-ui="fit" data-scene-live>${icon('focus')}Всё видимое в кадре</button><p class="sp-help">Вращайте модель мышью или касанием. Настройки сцены остаются открытыми.</p></section>
        <details class="sp-composition"><summary><span class="sp-composition-title">Органы и слои <small>Поиск и видимость</small></span><span id="scene-composition-count">${organs.length} структур</span></summary><div class="sp-search"><label for="scene-organ-search">Найти орган</label><div class="sp-search-field"><input id="scene-organ-search" type="search" placeholder="Название или латынь" maxlength="100" autocomplete="off" spellcheck="false" aria-describedby="scene-search-count" aria-controls="scene-organ-results"><button type="button" data-scene-ui="clear-search" class="sp-search-clear" aria-label="Очистить поиск органов" hidden>${icon('close')}</button></div><p id="scene-search-count" role="status" aria-live="polite" aria-atomic="true"></p></div><p class="sp-help">Снимите отметку, чтобы открыть обзор за органом. Последняя видимая структура останется в сцене.</p><div id="scene-organ-results">${groups.map(group=>`<fieldset class="sp-organ-group" data-scene-group="${group.key}"><legend>${escapeHTML(group.name)}</legend>${group.items.map(organ=>`<div class="sp-organ-row" data-scene-row="${organ.id}"><label class="sp-organ-label"><input type="checkbox" data-scene-visible="${organ.id}" data-scene-live aria-label="Показывать: ${escapeHTML(organ.name)}"><span><b>${escapeHTML(organ.name)}</b><small>${escapeHTML(organ.latin)}</small></span></label><button class="sp-select-organ" data-scene-organ="${organ.id}" data-scene-live title="Выбрать и рассмотреть: ${escapeHTML(organ.name)}" aria-label="Выбрать и рассмотреть: ${escapeHTML(organ.name)}">${icon('focus')}</button></div>`).join('')}</fieldset>`).join('')}</div><div class="sp-search-empty" id="scene-search-empty" hidden><b>Ничего не найдено</b><p>Попробуйте часть русского или латинского названия.</p><button type="button" data-scene-ui="clear-search">Показать все органы</button></div></details>
        <section class="sp-context" aria-labelledby="scene-context-title"><h3 id="scene-context-title">Прозрачные соседи</h3><label class="sp-context-switch"><input id="scene-context-toggle" type="checkbox"><span>Показать соседние органы</span></label><p class="sp-help" id="scene-context-help">Изолируйте орган или откройте пару, чтобы включить соседние структуры.</p><label class="sp-range-label" for="scene-context-opacity"><span>Видимость соседей</span><output id="scene-opacity-value" for="scene-context-opacity">7,5%</output></label><input id="scene-context-opacity" type="range" min="0.03" max="0.3" step="0.005" value="0.075" aria-describedby="scene-context-help"></section>
        <section class="sp-graphics" aria-labelledby="scene-graphics-title"><h3 id="scene-graphics-title">Графика</h3><p class="sp-control-label" id="scene-quality-label">Качество 3D</p><div class="sp-choice-group sp-quality" role="group" aria-labelledby="scene-quality-label" aria-describedby="scene-quality-help">${Object.entries(qualityLabels).map(([value,label])=>`<button type="button" data-graphics-quality="${value}" aria-pressed="false" disabled>${label}</button>`).join('')}</div><p class="sp-help" id="scene-quality-help"></p><p class="sp-control-label" id="scene-style-label">Фон сцены</p><div class="sp-choice-group sp-styles" role="group" aria-labelledby="scene-style-label"><button type="button" data-scene-style="light" aria-pressed="false"><span class="sp-style-swatch sp-swatch-light" aria-hidden="true"></span>Светлый</button><button type="button" data-scene-style="studio" aria-pressed="false"><span class="sp-style-swatch sp-swatch-studio" aria-hidden="true"></span>Студия</button></div><p class="sp-help" id="scene-style-help" hidden></p></section>
      </section>
      <section id="scene-page-saved" role="tabpanel" aria-labelledby="scene-tab-saved" hidden>
        <p class="sp-help sp-saved-intro">Сохраните состав органов, положение камеры, масштаб, подписи и срез. К этому виду можно вернуться или открыть его по ссылке.</p>
        <form id="scene-save-form"><label for="scene-view-name">Название ракурса</label><input id="scene-view-name" name="scene-name" maxlength="60" placeholder="Например: лёгкие, вид сзади" autocomplete="off"><button type="submit" class="sp-primary" data-scene-live>${icon('check')}Сохранить текущий вид</button></form>
        <div class="sp-saved-heading"><h3>Сохранённые виды</h3><span id="scene-saved-limit"></span></div><div id="scene-saved-list"></div><p class="sp-storage-note" id="scene-storage-note"></p>
      </section>
      <section class="sp-share-result" id="scene-share-result" hidden><label for="scene-share-url">Ссылка на настроенную 3D-сцену</label><input id="scene-share-url" readonly><p>В ссылку входят настройки вида. Название ракурса и результаты обучения не передаются.</p></section>
    </div>
    <footer class="sp-foot"><button data-scene-ui="share-current" data-scene-live>${icon('link')}Ссылка на текущий вид</button><p id="scene-panel-message" role="status" aria-live="polite" aria-atomic="true"></p></footer>`;
  stage.append(panel);
  const $ = selector => panel.querySelector(selector);
  const command = detail => document.dispatchEvent(new CustomEvent('anatomia:scene-command',{detail}));
  const requestState = () => command({action:'request'});
  const graphicsCommand = detail => document.dispatchEvent(new CustomEvent('anatomia:graphics-command',{detail}));
  const requestGraphics = () => graphicsCommand({action:'request'});
  const sectionCommand = detail => document.dispatchEvent(new CustomEvent('anatomia:section-command',{detail}));
  const requestSection = () => sectionCommand({action:'request'});
  const nextRequestId = () => `scene-panel-${++requestCounter}`;
  const setMessage = text => { $('#scene-panel-message').textContent = text || ''; };
  const isVisible = element => element?.isConnected && !element.disabled && !element.closest('[hidden],dialog:not([open])') && element.getClientRects().length > 0;

  function filterComposition() {
    const input = $('#scene-organ-search');
    const query = normalizeSearch(input.value);
    const words = query ? query.split(' ') : [];
    let count = 0;
    panel.querySelectorAll('[data-scene-row]').forEach(row=>{
      const match = words.every(word=>searchNames.get(row.dataset.sceneRow)?.includes(word));
      row.hidden = !match;
      if (match) count++;
    });
    panel.querySelectorAll('[data-scene-group]').forEach(group=>{ group.hidden = !group.querySelector('[data-scene-row]:not([hidden])'); });
    const description = words.length ? `Найдено: ${count} из ${organs.length}` : `В списке: ${organs.length} структур`;
    if ($('#scene-search-count').textContent !== description) $('#scene-search-count').textContent = description;
    $('#scene-composition-count').textContent = words.length ? `${count} из ${organs.length}` : `${organs.length} структур`;
    $('.sp-search-clear').hidden = !input.value;
    $('#scene-search-empty').hidden = count !== 0;
  }

  function clearSearch() {
    const input = $('#scene-organ-search');
    input.value = '';
    filterComposition();
    input.focus({preventScroll:true});
  }

  function patchGraphics() {
    panel.querySelectorAll('[data-graphics-quality]').forEach(button=>{
      button.disabled = !graphicsState.available;
      button.setAttribute('aria-pressed',String(button.dataset.graphicsQuality === graphicsState.quality));
    });
    const description = graphicsState.available ? qualityHints[graphicsState.quality] : graphicsState.reason || 'Качество можно изменить после загрузки 3D.';
    if ($('#scene-quality-help').textContent !== description) $('#scene-quality-help').textContent = description;
  }

  function patchSection() {
    const available = !!sectionState.available, enabled = !!sectionState.enabled;
    const config = sectionState.config;
    const controls = $('#scene-section-controls');
    const toggle = $('#scene-section-toggle');
    toggle.disabled = !available;
    toggle.checked = enabled;
    const focusWasInside = controls.contains(document.activeElement);
    controls.hidden = !enabled;
    if (!enabled && focusWasInside && open) (available ? toggle : $('#scene-section-title')).focus({preventScroll:true});
    $('#scene-section').classList.toggle('is-active',enabled && available);
    $('#scene-section-badge').textContent = enabled && available ? 'АКТИВЕН' : '3D';
    const organ = byId(sectionState.selected);
    const count = new Set(sectionState.affected.filter(id=>byId(id))).size;
    const subject = config.scope === 'selected' ? organ?.name || 'Выбранный орган' : `Структур в срезе: ${count}`;
    const description = !available ? sectionState.reason || 'Для среза откройте работающий 3D-просмотр.'
      : enabled ? subject : 'Уберите часть модели, чтобы рассмотреть расположенные глубже структуры.';
    if ($('#scene-section-status').textContent !== description) $('#scene-section-status').textContent = description;
    panel.querySelectorAll('[data-section-live]').forEach(element=>{element.disabled = !available || !enabled;});
    for (const field of ['axis','mode','scope']) panel.querySelectorAll(`[data-section-${field}]`).forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset[`section${field[0].toUpperCase()}${field.slice(1)}`] === config[field]));});
    const position = Math.round(config.position * 100), thickness = Math.round(config.thickness * 100);
    $('#scene-section-position').value = String(position);
    $('#scene-section-position').setAttribute('aria-valuetext',`${position}%`);
    $('#scene-section-position-value').textContent = `${position}%`;
    $('#scene-section-thickness').value = String(thickness);
    $('#scene-section-thickness').setAttribute('aria-valuetext',`${thickness}% размера модели`);
    $('#scene-section-thickness-value').textContent = `${thickness}%`;
    $('#scene-section-thickness-group').hidden = config.mode !== 'slab';
    const positionHelp = sectionState.positionLabel || 'Перемещайте ползунок, чтобы пройти через модель.';
    if ($('#scene-section-position-help').textContent !== positionHelp) $('#scene-section-position-help').textContent = positionHelp;
    $('[data-section-step="-1"]').disabled = !available || !enabled || position <= 0;
    $('[data-section-step="1"]').disabled = !available || !enabled || position >= 100;
    $('#scene-section-flip').disabled = !available || !enabled || config.mode === 'slab';
    $('#scene-section-flip').setAttribute('aria-pressed',String(config.mode === 'cut' && config.flipped));
    $('#scene-section-flip').title = config.mode === 'slab' ? 'В тонком слое сохраняется область между двумя плоскостями.' : 'Оставить другую сторону модели';
    $('#scene-section-guide').checked = config.guide;
    $('#scene-section-cap').checked = config.cap;
    $('#scene-section-cap').disabled = !available || !enabled || !sectionState.capAvailable;
    $('#scene-section-cap-unavailable').hidden = !available || sectionState.capAvailable;
  }

  function updateSection(patch) {
    if (!sectionState.available || !sectionState.enabled) return;
    stopAutomaticShared();setMessage('');sectionCommand({action:'config',patch});
  }

  function openSection() {
    stopAutomaticShared();
    openPanel({focus:false});
    if (!open) return;
    setTab('organs',false);
    requestSection();
    const scroll = $('.sp-scroll'), section = $('#scene-section');
    scroll.scrollTop += section.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 12;
    const focus = sectionState.available ? $('#scene-section-toggle') : $('#scene-section-title');
    focus.focus({preventScroll:true});
  }

  function patchViewStyle() {
    panel.querySelectorAll('[data-scene-style]').forEach(button=>{ button.setAttribute('aria-pressed',String(button.dataset.sceneStyle === viewStyle)); });
    $('#scene-style-help').hidden = viewStylePersistent;
    $('#scene-style-help').textContent = viewStylePersistent ? '' : 'Фон доступен для этой страницы. Браузер не сохранил выбор.';
  }

  function setViewStyle(value) {
    if (!['light','studio'].includes(value)) return;
    viewStyle = value;
    document.body.classList.toggle('studio-view',value === 'studio');
    try { storage.setItem(viewStyleKey,value);viewStylePersistent = true; }
    catch { viewStylePersistent = false; }
    patchViewStyle();
  }

  function updateShared() {
    const section = $('#scene-shared');
    section.hidden = !shared;
    if (!shared) return;
    const descriptions = {
      waiting:shared.autoArmed ? 'Настроенный вид откроется после готовности 3D. Любое ваше действие остановит автоматическое открытие.' : 'Автоматическое открытие остановлено. Вы можете применить вид из ссылки вручную.',
      applying:'Применяем состав органов и положение камеры…',
      applied:'Сцена из ссылки открыта. Можно продолжить её изучение или сохранить в «Мои ракурсы».'
    };
    $('#scene-shared-description').textContent = descriptions[shared.phase];
    const button = $('[data-scene-ui="apply-shared"]');
    button.disabled = !state.available || shared.phase === 'applying';
    button.textContent = shared.phase === 'applied' ? 'Вернуться к виду из ссылки' : 'Применить сцену';
  }

  function stopAutomaticShared() {
    if (!shared?.autoArmed) return;
    shared.autoArmed = false;
    updateShared();
  }

  function applySnapshot(snapshot, {sharedRequest = false, name = ''} = {}) {
    requestState();
    if (!state.available) { setMessage(state.reason || 'Сначала откройте работающий 3D-просмотр.'); return; }
    const requestId = nextRequestId();
    lastApply = {requestId,name,shared:sharedRequest};
    if (sharedRequest && shared) {
      shared.autoArmed = false;
      shared.phase = 'applying';
      shared.requestId = requestId;
      updateShared();
    }
    command({action:'apply',snapshot,requestId});
  }

  function tryAutomaticShared() {
    if (!shared?.autoArmed || shared.phase !== 'waiting' || !state.available) return;
    // Disarm before sending any synchronous request/result events.
    shared.autoArmed = false;
    applySnapshot(shared.scene,{sharedRequest:true});
  }

  function renderSaved() {
    const saved = store.get();
    $('#scene-saved-count').textContent = String(saved.items.length);
    $('#scene-saved-limit').textContent = `${saved.items.length} / ${sceneLimit}`;
    $('#scene-storage-note').textContent = !saved.persistent ? 'Сохранение в браузере недоступно. Последние изменения останутся только до закрытия страницы.'
      : saved.corrupt ? 'Часть сохранённых данных не удалось прочитать. Доступные виды показаны; новые можно сохранять.'
      : 'Ракурсы хранятся в этом браузере. На другом устройстве откройте ссылку на нужный вид.';
    const signature = JSON.stringify(saved.items.map(item=>[item.id,item.name,item.createdAt])) + ':' + deleteId + ':' + renameId;
    if (signature !== lastSavedSignature) {
      const focused = document.activeElement;
      const restoreId = focused?.dataset?.savedId;
      const restoreAction = focused?.dataset?.savedAction;
      lastSavedSignature = signature;
      $('#scene-saved-list').innerHTML = saved.items.length ? [...saved.items].reverse().map(item=>{
        const date = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(new Date(item.createdAt));
        const count = item.scene.pair?.length || (item.scene.isolated ? 1 : organs.filter(organ=>!item.scene.hidden.includes(organ.id) && (item.scene.system==='all' || item.scene.system===organ.system)).length);
        return `<article class="sp-saved-item"><h4>${escapeHTML(item.name)}</h4><div class="sp-saved-meta"><p>${count} ${count===1?'структура':count>1&&count<5?'структуры':'структур'} · ${escapeHTML(date)}</p>${renameId === item.id ? '' : `<button class="sp-rename" data-saved-action="rename" data-saved-id="${escapeHTML(item.id)}" aria-label="Переименовать ракурс: ${escapeHTML(item.name)}">Переименовать</button>`}</div>${renameId === item.id ? `<form class="sp-rename-form" data-scene-rename="${escapeHTML(item.id)}"><label for="scene-rename-input">Новое название</label><input id="scene-rename-input" name="scene-rename-name" maxlength="60" value="${escapeHTML(item.name)}" autocomplete="off"><div><button type="submit">Сохранить</button><button type="button" data-saved-action="cancel-rename" data-saved-id="${escapeHTML(item.id)}">Отмена</button></div></form>` : deleteId === item.id ? `<div class="sp-delete-confirm"><p>Удалить этот сохранённый вид?</p><div><button data-saved-action="confirm-delete" data-saved-id="${escapeHTML(item.id)}">Удалить</button><button data-saved-action="cancel-delete" data-saved-id="${escapeHTML(item.id)}">Оставить</button></div></div>` : `<div class="sp-saved-actions"><button data-saved-action="apply" data-saved-id="${escapeHTML(item.id)}" data-scene-live>Открыть</button><button data-saved-action="share" data-saved-id="${escapeHTML(item.id)}" aria-label="Ссылка: ${escapeHTML(item.name)}">${icon('link')}Ссылка</button><button class="sp-delete" data-saved-action="delete" data-saved-id="${escapeHTML(item.id)}" aria-label="Удалить ракурс: ${escapeHTML(item.name)}">${icon('close')}</button></div>`}</article>`;
      }).join('') : '<div class="sp-empty"><span aria-hidden="true">'+icon('layers')+'</span><b>Ваш первый ракурс</b><p>Настройте 3D-сцену и сохраните вид под своим названием.</p></div>';
      if (restoreId && restoreAction) [...panel.querySelectorAll('[data-saved-id]')].find(element=>element.dataset.savedId===restoreId && element.dataset.savedAction===restoreAction)?.focus({preventScroll:true});
    }
    panel.querySelectorAll('[data-saved-action="apply"]').forEach(button=>{button.disabled = !state.available;});
  }

  function patchState() {
    const available = !!state.available;
    const visible = new Set(Array.isArray(state.visible) ? state.visible : []);
    const selected = typeof state.selected === 'string' ? state.selected : null;
    $('#scene-availability').textContent = available ? 'Состав и ракурс меняются прямо в 3D-сцене.' : state.reason || '3D пока недоступен. Сохранённые ракурсы и ссылки доступны ниже.';
    $('#scene-availability').classList.toggle('is-unavailable',!available);
    $('#scene-visible-count').textContent = available ? `${visible.size} / ${organs.length}` : '3D не активен';
    panel.querySelectorAll('[data-scene-live]').forEach(element=>{element.disabled = !available;});
    panel.querySelectorAll('[data-scene-visible]').forEach(input=>{input.checked = visible.has(input.dataset.sceneVisible);});
    panel.querySelectorAll('[data-scene-row]').forEach(row=>{
      row.classList.toggle('is-selected',selected===row.dataset.sceneRow);
      row.classList.toggle('is-visible',visible.has(row.dataset.sceneRow));
    });
    panel.querySelectorAll('[data-scene-preset]').forEach(button=>{
      const preset = scenePresets.find(item=>item.id===button.dataset.scenePreset);
      button.setAttribute('aria-pressed',String(available && preset.ids.length === visible.size && preset.ids.every(id=>visible.has(id))));
    });
    const canContext = available && !!(state.isolated || state.snapshot?.isolated || state.pair);
    $('#scene-context-toggle').disabled = !canContext;
    $('#scene-context-toggle').checked = !!state.context;
    $('#scene-context-help').textContent = canContext ? 'Соседние органы служат ориентиром и не перехватывают выбор основной структуры.' : 'Изолируйте орган или откройте пару, чтобы включить соседние структуры.';
    const opacity = Number.isFinite(state.contextOpacity) ? state.contextOpacity : .075;
    const range = $('#scene-context-opacity');
    range.disabled = !canContext || !state.context;
    if (document.activeElement !== range || range.disabled) range.value = String(opacity);
    $('#scene-opacity-value').textContent = `${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(opacity*100)}%`;
    updateShared();
    renderSaved();
  }

  function setTab(tab, focus = true) {
    activeTab = tab === 'saved' ? 'saved' : 'organs';
    panel.querySelectorAll('[data-scene-tab]').forEach(button=>{
      const active = button.dataset.sceneTab === activeTab;
      button.setAttribute('aria-selected',String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $('#scene-page-organs').hidden = activeTab !== 'organs';
    $('#scene-page-saved').hidden = activeTab !== 'saved';
    $('.sp-scroll').scrollTop = 0;
    if (focus) $(`#scene-tab-${activeTab}`).focus({preventScroll:true});
  }

  function openPanel({focus = true} = {}) {
    if (open) return;
    open = true;
    const catalog = document.querySelector('#catalog');
    if (catalog && !catalog.hidden) document.querySelector('#catalog-close')?.click();
    panel.hidden = false;
    document.body.classList.add('scene-panel-open');
    trigger.setAttribute('aria-expanded','true');
    document.dispatchEvent(new CustomEvent('anatomia:scene-layout'));
    requestState();
    requestGraphics();
    requestSection();
    patchState();
    if (focus && open) $('#scene-panel-title').focus({preventScroll:true});
  }

  function closePanel(restoreFocus = true) {
    if (!open) return;
    open = false;
    panel.hidden = true;
    document.body.classList.remove('scene-panel-open');
    trigger.setAttribute('aria-expanded','false');
    document.dispatchEvent(new CustomEvent('anatomia:scene-layout'));
    if (restoreFocus) (isVisible(trigger) ? trigger : document.querySelector('#viewport'))?.focus({preventScroll:true});
  }

  async function shareSnapshot(snapshot) {
    const value = sceneURL(location.href,snapshot);
    if (!value) { setMessage('Не удалось получить настройки этого вида. Откройте его в 3D и попробуйте ещё раз.'); return; }
    const version = ++shareVersion;
    const field = $('#scene-share-url');
    field.value = value;
    $('#scene-share-result').hidden = false;
    try {
      await navigator.clipboard.writeText(value);
      if (version !== shareVersion) return;
      setMessage('Ссылка скопирована. Она содержит только настройки 3D-сцены.');
    } catch {
      if (version !== shareVersion) return;
      setMessage('Автокопирование недоступно. Ссылка выделена — скопируйте её вручную.');
      if (open) { field.focus({preventScroll:true}); field.select(); }
    }
  }

  panel.addEventListener('click',event=>{
    const button = event.target.closest('button');
    if (!button || button.disabled || !panel.contains(button)) return;
    if (button.dataset.sceneTab) { setTab(button.dataset.sceneTab); return; }
    if (button.dataset.sectionAxis) { updateSection({axis:button.dataset.sectionAxis});return; }
    if (button.dataset.sectionMode) { updateSection({mode:button.dataset.sectionMode});return; }
    if (button.dataset.sectionScope) { updateSection({scope:button.dataset.sectionScope});return; }
    if (button.dataset.sectionStep) { updateSection({position:Math.max(0,Math.min(1,Math.round(sectionState.config.position*100 + Number(button.dataset.sectionStep))/100))});return; }
    if (button.id === 'scene-section-flip') { updateSection({flipped:!sectionState.config.flipped});return; }
    if (button.hasAttribute('data-section-reset')) { stopAutomaticShared();setMessage('');sectionCommand({action:'reset'});return; }
    if (button.dataset.graphicsQuality) { stopAutomaticShared();graphicsCommand({action:'quality',value:button.dataset.graphicsQuality});return; }
    if (button.dataset.sceneStyle) { stopAutomaticShared();setViewStyle(button.dataset.sceneStyle);return; }
    if (button.dataset.scenePreset) { stopAutomaticShared();setMessage('');command({action:'preset',id:button.dataset.scenePreset});return; }
    if (button.dataset.sceneView) { stopAutomaticShared();setMessage('');command({action:'view',value:button.dataset.sceneView});return; }
    if (button.dataset.sceneOrgan) {
      const id = button.dataset.sceneOrgan;
      if (!state.available || !byId(id)) return;
      stopAutomaticShared();closePanel(false);
      command({action:'select',id});return;
    }
    if (button.dataset.savedAction) {
      const id = button.dataset.savedId, action = button.dataset.savedAction;
      const item = store.get().items.find(saved=>saved.id===id);
      if (!item) return;
      if (action === 'apply') { stopAutomaticShared();applySnapshot(item.scene,{name:item.name}); }
      else if (action === 'share') shareSnapshot(item.scene);
      else if (action === 'rename') { renameId = id;deleteId = null;renderSaved();$('#scene-rename-input')?.focus({preventScroll:true});$('#scene-rename-input')?.select(); }
      else if (action === 'cancel-rename') { renameId = null;renderSaved();[...panel.querySelectorAll('[data-saved-action="rename"]')].find(element=>element.dataset.savedId===id)?.focus({preventScroll:true}); }
      else if (action === 'delete') { deleteId = id;renameId = null;renderSaved();$('[data-saved-action="cancel-delete"]')?.focus({preventScroll:true}); }
      else if (action === 'cancel-delete') { deleteId = null;renderSaved();[...panel.querySelectorAll('[data-saved-action="delete"]')].find(element=>element.dataset.savedId===id)?.focus({preventScroll:true}); }
      else if (action === 'confirm-delete') {
        if (store.remove(id)) { deleteId = null;renderSaved();setMessage('Сохранённый вид удалён. Текущая 3D-сцена не меняется.');$('#scene-view-name').focus({preventScroll:true}); }
      }
      return;
    }
    const action = button.dataset.sceneUi;
    if (action === 'close') { stopAutomaticShared();closePanel(); }
    else if (action === 'clear-search') clearSearch();
    else if (action === 'fit') { stopAutomaticShared();setMessage('');command({action:'fit'}); }
    else if (action === 'apply-shared' && shared) applySnapshot(shared.scene,{sharedRequest:true});
    else if (action === 'cancel-shared') { shared = null;updateShared();setMessage('Открытие сцены из ссылки отменено.'); }
    else if (action === 'share-current') { requestState();if(state.available && state.snapshot)shareSnapshot(state.snapshot); }
  });
  $('#scene-organ-search').addEventListener('input',()=>{stopAutomaticShared();filterComposition();});
  panel.addEventListener('change',event=>{
    if (event.target.matches('[data-scene-visible]')) {
      if (!state.available) return;
      stopAutomaticShared();setMessage('');command({action:'visibility',id:event.target.dataset.sceneVisible,visible:event.target.checked});
    } else if (event.target.id === 'scene-section-toggle') {
      if (!sectionState.available) { patchSection();return; }
      stopAutomaticShared();setMessage('');sectionCommand({action:'enable',value:event.target.checked});
    } else if (event.target.id === 'scene-section-guide') {
      updateSection({guide:event.target.checked});
    } else if (event.target.id === 'scene-section-cap') {
      if (sectionState.capAvailable) updateSection({cap:event.target.checked});
    } else if (event.target.id === 'scene-context-toggle') {
      stopAutomaticShared();setMessage('');command({action:'context',value:event.target.checked});
    }
  });
  $('#scene-section-position').addEventListener('input',event=>{if (!event.target.disabled) updateSection({position:Number(event.target.value)/100});});
  $('#scene-section-thickness').addEventListener('input',event=>{if (!event.target.disabled) updateSection({thickness:Number(event.target.value)/100});});
  $('#scene-context-opacity').addEventListener('input',event=>{
    if (event.target.disabled) return;
    stopAutomaticShared();command({action:'context-opacity',value:Number(event.target.value)});
  });
  $('#scene-save-form').addEventListener('submit',event=>{
    event.preventDefault();
    requestState();
    if (!state.available || !state.snapshot) { setMessage(state.reason || 'Для сохранения нужна работающая 3D-сцена.');return; }
    const result = store.save($('#scene-view-name').value,state.snapshot);
    if (!result.ok) {
      const reasons = {name:'Введите название длиной от 1 до 60 символов.',scene:'Этот вид пока нельзя сохранить. Обновите 3D-сцену и попробуйте ещё раз.',limit:`Можно сохранить до ${sceneLimit} ракурсов. Удалите ненужный вид, чтобы добавить новый.`,clock:'Не удалось определить дату сохранения. Проверьте дату на устройстве.'};
      setMessage(reasons[result.reason] || 'Не удалось сохранить ракурс.');
      if (result.reason === 'name') $('#scene-view-name').focus();
      return;
    }
    const name = $('#scene-view-name').value.trim();
    $('#scene-view-name').value = '';
    renderSaved();
    setMessage(`«${name}» сохранён${store.get().persistent ? ' в этом браузере.' : ' до закрытия страницы.'}`);
  });
  panel.addEventListener('submit',event=>{
    const form = event.target.closest('[data-scene-rename]');
    if (!form) return;
    event.preventDefault();
    const id = form.dataset.sceneRename, input = form.querySelector('input');
    if (!store.rename(id,input.value)) { setMessage('Введите название длиной от 1 до 60 символов.');input.focus();return; }
    renameId = null;renderSaved();setMessage('Название обновлено. Состав и положение камеры сохранены.');
    [...panel.querySelectorAll('[data-saved-action="rename"]')].find(element=>element.dataset.savedId===id)?.focus({preventScroll:true});
  });
  panel.addEventListener('keydown',event=>{
    if (event.key === 'Escape') {
      event.preventDefault();event.stopPropagation();stopAutomaticShared();
      if (event.target.id === 'scene-organ-search' && event.target.value) clearSearch();
      else if (renameId && event.target.closest('[data-scene-rename]')) {
        const id = renameId;renameId = null;renderSaved();
        [...panel.querySelectorAll('[data-saved-action="rename"]')].find(element=>element.dataset.savedId===id)?.focus({preventScroll:true});
      } else closePanel();
      return;
    }
    const tab = event.target.closest('[role="tab"]');
    if (tab && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault();
      setTab(event.key === 'Home' ? 'organs' : event.key === 'End' ? 'saved' : activeTab === 'organs' ? 'saved' : 'organs');
    }
  });
  document.addEventListener('click',event=>{
    if (event.target.closest('#scene-tools-toggle')) { event.preventDefault();if(open)closePanel();else openPanel();return; }
    if (open && event.target.closest('#catalog-toggle,#scene-only,.topbar [data-tab],#learning-launch,#demo-start')) closePanel(false);
  });
  document.addEventListener('pointerdown',()=>stopAutomaticShared(),{capture:true});
  document.addEventListener('keydown',event=>{if(event.key !== 'Tab' && !['Shift','Control','Alt','Meta'].includes(event.key))stopAutomaticShared();},{capture:true});
  document.addEventListener('anatomia:open-section',openSection);
  document.addEventListener('anatomia:section-open',openSection);
  document.addEventListener('anatomia:section-state',event=>{
    const next = event.detail, config = next?.config;
    if (!next || typeof next.available !== 'boolean' || typeof next.enabled !== 'boolean' || !config
      || !Object.hasOwn(sectionAxes,config.axis) || !['cut','slab'].includes(config.mode) || !['selected','visible'].includes(config.scope)
      || !Number.isFinite(config.position) || config.position < 0 || config.position > 1
      || !Number.isFinite(config.thickness) || config.thickness < .04 || config.thickness > 1
      || ['flipped','guide','cap'].some(key=>typeof config[key] !== 'boolean')) return;
    receivedSectionState = true;
    sectionState = {...next,config:{...config},reason:typeof next.reason === 'string' ? next.reason : '',positionLabel:typeof next.positionLabel === 'string' ? next.positionLabel : '',affected:Array.isArray(next.affected) ? next.affected : [],capAvailable:next.capAvailable === true};
    patchSection();
  });
  document.addEventListener('anatomia:graphics-state',event=>{
    const next = event.detail;
    if (!next || typeof next.available !== 'boolean' || !Object.hasOwn(qualityLabels,next.quality)) return;
    receivedGraphicsState = true;
    graphicsState = {...next,reason:typeof next.reason === 'string' ? next.reason : ''};
    patchGraphics();
  });
  document.addEventListener('anatomia:scene-state',event=>{
    const next = event.detail;
    if (!next || typeof next.available !== 'boolean') return;
    receivedState = true;state = next;
    if (state.activity || state.blocked === 'practice' || state.blocked === 'vr') { stopAutomaticShared();closePanel(false); }
    patchState();
    tryAutomaticShared();
  });
  document.addEventListener('anatomia:scene-result',event=>{
    const result = event.detail || {};
    if (result.action === 'apply' && lastApply && result.requestId === lastApply.requestId) {
      if (lastApply.shared && shared && shared.requestId === result.requestId) {
        shared.phase = result.ok ? 'applied' : 'waiting';
        shared.autoArmed = false;
        updateShared();
      }
      setMessage(result.ok ? lastApply.name ? `Открыт ракурс «${lastApply.name}».` : 'Сцена из ссылки открыта.' : result.message || 'Сцена не открыта. Попробуйте после загрузки 3D.');
      lastApply = null;
    } else if (!result.ok && typeof result.message === 'string') { setMessage(result.message);requestState(); }
  });
  trigger.setAttribute('aria-controls','scene-panel');
  trigger.setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-label','Настроить 3D-сцену');
  filterComposition();
  patchGraphics();
  patchSection();
  patchViewStyle();
  patchState();
  if (shared) openPanel();
  else { requestState();requestGraphics();requestSection(); }
  setTimeout(()=>{
    if (!receivedState) {
      state.reason = '3D-просмотр пока не отвечает. Сохранённые ракурсы и ссылки остаются доступны.';
      patchState();
    }
    if (!receivedSectionState) {
      sectionState.reason = 'Инструменты среза пока недоступны. Откройте 3D и попробуйте ещё раз.';
      patchSection();
    }
    if (!receivedGraphicsState) {
      graphicsState.reason = 'Настройки качества пока недоступны. Фон можно изменить ниже.';
      patchGraphics();
    }
  },4000);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initialiseScenePanel,{once:true});
  else initialiseScenePanel();
}
