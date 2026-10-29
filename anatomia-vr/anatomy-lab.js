import * as THREE from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {detailedOrgans} from './anatomical-parts.js';
import {createLayerState, matchingParts, labURL, labFromURL} from './anatomy-lab-state.js';
import {defaultSectionConfig, patchSectionConfig, sectionAxes} from './section-state.js';
import {createSectionRenderer} from './section-renderer.js';
import {resolveGraphicsProfile, safeSceneFrame, fittedSceneRadius, studioLightProfile} from './render-profile.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const rootURL = new URL('.', import.meta.url), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const event = (name, detail) => document.dispatchEvent(new CustomEvent('anatomia:' + name, {detail}));
let dialog, opener, renderer, scene, camera, model, slicer, observer, pointerAbort, requestController;
let meshes = [], partMeshes = new Map(), layers, organ = 'heart', epoch = 0, ready = false, atlasBusy = false;
let inspection = false, context = true, rotation = false, quality = 'auto', activePreset = 'all';
let sectionEnabled = false, sectionConfig = {...defaultSectionConfig, scope:'visible'}, resizeQueued = false;
let view = {theta:.2, phi:1.42, radius:.6, toRadius:.6, target:new THREE.Vector3(), toTarget:new THREE.Vector3(), automatic:true};
let frame, previousTime = 0, lastMessage = '', sourceMaterials = new Set();
const $ = selector => dialog?.querySelector(selector), all = selector => [...dialog.querySelectorAll(selector)];
const definition = () => detailedOrgans[organ], currentPart = () => definition().parts.find(part => part.id === layers?.get().selected);
const button = (action, label, extra = '') => `<button class="lab-btn" data-lab-action="${action}" ${extra}>${label}</button>`;

function ensureDialog() {
  if (dialog) return;
  dialog = document.createElement('dialog'); dialog.id = 'anatomy-lab'; dialog.className = 'anatomy-lab';
  dialog.setAttribute('aria-labelledby', 'lab-title');
  dialog.innerHTML = `<div class="lab-shell">
    <header class="lab-header"><div class="lab-brand"><img src="./assets/medsi-college-logo.png" alt="Колледж МЕДСИ"><div><p class="lab-breadcrumb">ANATOMIA / ДЕТАЛЬНОЕ ИЗУЧЕНИЕ</p><h2 id="lab-title">3D-лаборатория</h2></div></div><div class="lab-header-actions"><button class="lab-icon-button" data-lab-action="share" aria-label="Ссылка на выбранную структуру" title="Ссылка на структуру">↗</button><button class="lab-icon-button" data-lab-action="close" aria-label="Закрыть 3D-лабораторию" title="Вернуться в атлас">×</button></div></header>
    <div class="lab-workspace"><section class="lab-stage" aria-label="Детальная анатомическая модель">
      <div class="lab-canvas-wrap"></div>
      <div class="lab-view-controls" role="group" aria-label="Управление 3D-моделью">${button('home','Общий вид','data-lab-ready')}${button('front','Спереди','data-lab-ready')}${button('back','Сзади','data-lab-ready')}${button('rotate','↻','data-lab-ready aria-label="Автовращение" aria-pressed="false"')}
      <label class="lab-quality-label"><span class="sr-only">Качество 3D</span><select id="lab-quality" aria-label="Качество 3D" data-lab-ready><option value="auto">Качество: авто</option><option value="high">Высокое</option><option value="eco">Экономное</option></select></label></div>
      <p class="lab-status" id="lab-stage-status" role="status"></p>
      <div class="lab-orientation"><span>Потяните — вращение · Shift — перемещение</span><span id="lab-angle-label">Вид спереди</span></div>
      <div class="lab-loading"><span class="lab-spinner" aria-hidden="true"></span><h3 id="lab-loading-title">Подготавливаем 3D</h3><p id="lab-loading-message">Загружаем исходную анатомическую модель.</p><progress id="lab-load-progress" max="100" aria-label="Загрузка 3D-модели"></progress><button class="lab-btn" data-lab-action="retry" hidden>Повторить загрузку</button><button class="lab-btn" data-lab-action="close">Вернуться в атлас</button></div>
      <section class="lab-sectionbar" aria-labelledby="lab-section-title"><div class="lab-cut-head"><div><h3 id="lab-section-title">Срез модели</h3><p>Три плоскости · регулируемая глубина</p></div><label for="lab-cut-toggle"><input id="lab-cut-toggle" type="checkbox" data-lab-ready>Включить</label></div>
        <div class="lab-cut-settings" hidden><div class="lab-cut-modes" role="group" aria-label="Тип среза"><button data-lab-cut-mode="cut" aria-pressed="true">Срез</button><button data-lab-cut-mode="slab" aria-pressed="false">Тонкий слой</button></div>
        <div class="lab-cut-axes" role="group" aria-label="Плоскость среза"><button data-lab-cut-axis="axial" aria-pressed="true">Поперечный</button><button data-lab-cut-axis="coronal" aria-pressed="false">Фронтальный</button><button data-lab-cut-axis="sagittal" aria-pressed="false">Сагиттальный</button></div>
        <div class="lab-cut-range"><label for="lab-cut-position">Глубина <output id="lab-position-value">50%</output></label><input id="lab-cut-position" type="range" min="0" max="100" value="50" step="1"><div class="lab-range-steps">${button('slice-less','−','aria-label="Сдвинуть срез на один процент назад"')}${button('slice-more','+','aria-label="Сдвинуть срез на один процент вперёд"')}<span id="lab-cut-direction"></span></div></div>
        <div class="lab-cut-range" id="lab-thickness-control" hidden><label for="lab-cut-thickness">Толщина <output id="lab-thickness-value">15%</output></label><input id="lab-cut-thickness" type="range" min="4" max="100" value="15" step="1"></div>
        <div class="lab-cut-secondary">${button('flip','Обратная сторона','aria-pressed="false"')}<label class="lab-cut-option"><input id="lab-cut-guide" type="checkbox" checked>Плоскость</label>${button('slice-reset','Сбросить срез')}<span class="lab-cut-note">Срез открывает исходную 3D-геометрию; это не КТ или гистологический препарат.</span></div></div>
      </section>
    </section><aside class="lab-sidebar" aria-label="Слои и структуры"><div class="lab-organ-switch" role="group" aria-label="Выбрать детальную модель"><button data-lab-switch="heart" aria-pressed="true">Сердце</button><button data-lab-switch="brain" aria-pressed="false">Мозг</button></div>
      <div class="lab-sidebar-title"><span class="lab-kicker">ИСХОДНЫЕ АНАТОМИЧЕСКИЕ СТРУКТУРЫ</span><h2 id="lab-organ-title"></h2><small id="lab-organ-latin"></small><p id="lab-model-count"></p></div>
      <div id="lab-presets" class="lab-layer-toolbar" role="group" aria-label="Наборы структур"></div>
      <div class="lab-selected-card" id="lab-selected-card" aria-live="polite"></div>
      <div class="lab-parts-search"><label for="lab-part-search">Найти структуру</label><div class="lab-search-field"><input id="lab-part-search" type="search" autocomplete="off" placeholder="Название на русском или английском"><button class="lab-search-clear" data-lab-action="clear-search" aria-label="Очистить поиск" hidden>×</button></div><p id="lab-search-count"></p></div>
      <div class="lab-layer-toolbar">${button('all','Вернуть все слои','data-lab-ready')}${button('clear-selection','Убрать выделение','data-lab-ready')}</div>
      <div class="lab-groups" id="lab-groups"></div><div class="lab-empty" id="lab-search-empty" hidden><b>Структура не найдена</b><p>Попробуйте часть русского или английского названия.</p>${button('clear-search','Очистить поиск')}</div>
      <p id="lab-message" class="lab-message" role="status"></p><input id="lab-share-url" readonly hidden aria-label="Ссылка на выбранную структуру">
      <div class="lab-notes" id="lab-source"></div>
    </aside></div></div>`;
  document.body.append(dialog);
  dialog.addEventListener('close', closeLab);
  dialog.addEventListener('click', handleClick);
  dialog.addEventListener('change', handleChange);
  dialog.addEventListener('input', handleInput);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape' && event.target.id === 'lab-part-search' && event.target.value) {
      event.preventDefault(); event.stopPropagation(); event.target.value = ''; filterParts();
    }
  });
  observer = new ResizeObserver(queueResize); observer.observe($('.lab-stage')); observer.observe($('.lab-sectionbar')); observer.observe($('.lab-view-controls'));
}

function message(text) { lastMessage = text; if ($('#lab-message')) $('#lab-message').textContent = text; }
function setReady(value) {
  ready = value; dialog.classList.toggle('lab-loading-model', !value);
  all('[data-lab-ready], [data-lab-part], [data-lab-visible], [data-lab-group-visible], [data-lab-group-only], [data-lab-preset], #lab-context').forEach(control => control.disabled = !value);
  syncSection();
}
function renderOrgan() {
  const data = definition();
  $('#lab-organ-title').textContent = data.title; $('#lab-organ-latin').textContent = data.latin;
  $('#lab-model-count').textContent = `${data.meshCount} отдельных 3D-поверхностей · групп: ${data.groups.length}`;
  all('[data-lab-switch]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.labSwitch === organ)));
  $('#lab-presets').innerHTML = data.presets.map(preset => `<button class="lab-btn" data-lab-preset="${escape(preset.id)}" aria-pressed="${activePreset === preset.id}">${escape(preset.name)}</button>`).join('');
  $('#lab-part-search').value = ''; $('#lab-share-url').hidden = true;
  $('#lab-groups').innerHTML = data.groups.map((group, index) => {
    const parts = data.parts.filter(part => part.group === group.id);
    return `<details class="lab-group" data-lab-group="${escape(group.id)}" ${organ === 'heart' && index === 0 ? 'open' : ''}><summary><span><i class="lab-part-swatch" style="--part-color:${escape(group.color)}"></i> ${escape(group.label)}</span><span data-lab-group-count="${escape(group.id)}">${parts.length}</span></summary><div class="lab-group-tools"><label><input type="checkbox" data-lab-group-visible="${escape(group.id)}" checked>Показать группу</label><button class="lab-btn" data-lab-group-only="${escape(group.id)}">Только эта группа</button></div><p class="lab-group-description">${escape(group.description)}</p><div class="lab-parts">${parts.map(part => `<div class="lab-part-row" data-lab-row="${escape(part.id)}"><button data-lab-part="${escape(part.id)}" aria-pressed="false"><b>${escape(part.name)}</b><small>${escape(part.sourceLabel)}</small></button><label class="lab-part-visibility" title="Показать или скрыть структуру"><input type="checkbox" data-lab-visible="${escape(part.id)}" checked aria-label="Показать: ${escape(part.name)}"></label></div>`).join('')}</div></details>`;
  }).join('');
  $('#lab-source').innerHTML = `<p><a href="${escape(data.source.url)}" target="_blank" rel="noopener noreferrer">Human Reference Atlas / HuBMAP</a> · <a href="${escape(data.license.url)}" target="_blank" rel="noopener noreferrer">${escape(data.license.name)}</a></p><details class="lab-source-notes"><summary>О модели и её границах</summary>${data.notes.map(note => `<p>${escape(note)}</p>`).join('')}<p>Авторы: ${data.source.authors.map(escape).join(', ')}. Рецензент: ${escape(data.source.reviewer)}.</p><p>Версия ${escape(data.source.version)} · <a href="${escape(data.source.doi)}" target="_blank" rel="noopener noreferrer">Запись и DOI</a></p><p>Русские названия — перевод меток источника. Исходные английские названия сохранены рядом.</p></details><p>Учебная анатомическая модель · не для диагностики.</p>`;
  renderSelection(); filterParts(); syncLayerControls();
}
function renderSelection() {
  const part = currentPart(), card = $('#lab-selected-card');
  const previousAction = card.contains(document.activeElement) ? document.activeElement.dataset.labAction : null;
  if (!part) {
    card.innerHTML = '<span class="lab-kicker">ИССЛЕДУЙТЕ ИЗНУТРИ</span><h3>От целого к структуре</h3><p>Выберите часть на модели или в списке. Убирайте группы, чтобы открыть глубину, и включайте срез.</p>';
    if (previousAction) $('#lab-part-search').focus({preventScroll:true});
    return;
  }
  const group = definition().groups.find(group => group.id === part.group);
  card.innerHTML = `<span class="lab-kicker">ВЫБРАННАЯ СТРУКТУРА</span><h3>${escape(part.name)}</h3><small>${escape(part.sourceLabel)}</small><p>${escape(part.description || group.description)}</p><div class="lab-selected-card-actions">${button('focus-part','Приблизить','data-lab-ready')}${button('only-part','Только структура','data-lab-ready')}${button('hide-part','Скрыть','data-lab-ready')}</div><label class="lab-context-switch"><input id="lab-context" type="checkbox" ${context ? 'checked' : ''} ${layers.get().visible.length < 2 ? 'disabled' : ''}>Прозрачное окружение из включённых слоёв</label>`;
  if (previousAction) card.querySelector(`[data-lab-action="${previousAction}"]`)?.focus({preventScroll:true});
}
function filterParts() {
  const query = $('#lab-part-search').value, match = new Set(matchingParts(definition().parts, query).map(part => part.id));
  all('[data-lab-row]').forEach(row => row.hidden = !match.has(row.dataset.labRow));
  all('[data-lab-group]').forEach(group => {
    group.hidden = ![...group.querySelectorAll('[data-lab-row]')].some(row => !row.hidden);
    if (query && !group.hidden) group.open = true;
  });
  $('#lab-search-count').textContent = `Найдено ${match.size} из ${definition().parts.length}`;
  $('[data-lab-action="clear-search"]').hidden = !query;
  $('#lab-search-empty').hidden = match.size > 0;
}
function syncLayerControls() {
  if (!layers) return;
  const {visible, selected} = layers.get(), shown = new Set(visible);
  all('[data-lab-row]').forEach(row => {
    const id = row.dataset.labRow;
    row.classList.toggle('is-selected', selected === id); row.classList.toggle('is-hidden', !shown.has(id));
    row.querySelector('[data-lab-part]').setAttribute('aria-pressed', String(selected === id));
    row.querySelector('input').checked = shown.has(id);
  });
  for (const group of definition().groups) {
    const ids = definition().parts.filter(part => part.group === group.id).map(part => part.id), count = ids.filter(id => shown.has(id)).length;
    const input = all('[data-lab-group-visible]').find(item => item.dataset.labGroupVisible === group.id);
    input.checked = count === ids.length; input.indeterminate = count > 0 && count < ids.length;
    all('[data-lab-group-count]').find(item => item.dataset.labGroupCount === group.id).textContent = `${count} / ${ids.length}`;
  }
  all('[data-lab-preset]').forEach(control => control.setAttribute('aria-pressed', String(activePreset === control.dataset.labPreset)));
  $('[data-lab-action="clear-selection"]').disabled = !ready || !selected;
  const only = $('[data-lab-action="hide-part"]'); if (only) only.disabled = visible.length === 1;
}

function disposeModel() {
  slicer?.dispose(); slicer = null;
  if (model) {
    scene?.remove(model);
    const geometry = new Set(), materials = new Set(sourceMaterials);
    model.traverse(object => { if (object.geometry) geometry.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material); });
    geometry.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
  }
  model = null; meshes = []; partMeshes.clear(); sourceMaterials.clear();
}
function disposeGraphics() {
  pointerAbort?.abort(); pointerAbort = null;
  renderer?.setAnimationLoop(null); disposeModel();
  renderer?.dispose(); renderer?.forceContextLoss?.(); renderer?.domElement?.remove(); renderer = scene = camera = null;
}
function initializeGraphics() {
  renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, stencil:true, powerPreference:'high-performance'});
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', '3D-модель. Перетаскивание — вращение; Shift — перемещение; колесо — масштаб; H — общий вид; F — выбранная структура.');
  $('.lab-canvas-wrap').append(renderer.domElement);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(35, 1, .001, 20);
  const p = studioLightProfile; scene.add(new THREE.HemisphereLight(p.hemisphere.sky, p.hemisphere.ground, p.hemisphere.intensity));
  for (const name of ['key','fill','rim']) { const spec = p[name], light = new THREE.DirectionalLight(spec.color, spec.intensity); light.position.fromArray(spec.position); scene.add(light, light.target); }
  pointerAbort = new AbortController();
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); fail('Связь с графическим модулем прервалась. Можно повторить загрузку.'); }, {signal:pointerAbort.signal});
  bindOrbit(); queueResize(); renderer.setAnimationLoop(render);
}
async function modelBytes(url, token, signal) {
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error('Model request failed: ' + response.status);
  const expected = Number(response.headers.get('Content-Length')) || 0;
  if (!response.body?.getReader) return response.arrayBuffer();
  const reader = response.body.getReader(), chunks = []; let size = 0;
  while (true) {
    const {done, value} = await reader.read(); if (done) break;
    chunks.push(value); size += value.byteLength;
    if (token === epoch && dialog.open) {
      const progress = $('#lab-load-progress');
      if (expected > 0 && size <= expected) { progress.value = size / expected * 100; $('#lab-loading-message').textContent = `Загружено ${Math.round(size / expected * 100)}%. Подготавливаем модель…`; }
      else { progress.removeAttribute('value'); $('#lab-loading-message').textContent = `Загружено ${(size / 1e6).toFixed(1)} МБ. Подготавливаем модель…`; }
    }
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes.buffer;
}
function disposeUnattached(object) {
  const geometries = new Set(), materials = new Set();
  object.traverse(item => { if (item.geometry) geometries.add(item.geometry); for (const material of Array.isArray(item.material) ? item.material : [item.material]) if (material) materials.add(material); });
  geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
}
async function loadOrgan(id, part = null) {
  if (!Object.hasOwn(detailedOrgans, id)) return;
  const token = ++epoch; requestController?.abort(); requestController = new AbortController();
  organ = id; layers = createLayerState(definition().parts); inspection = false; context = true; rotation = false; activePreset = 'all';
  sectionEnabled = false; sectionConfig = {...defaultSectionConfig, scope:'visible'}; ready = false;
  disposeModel(); renderOrgan(); setReady(false); message('');
  $('.lab-loading').hidden = false; $('.lab-spinner').hidden = false; $('#lab-load-progress').hidden = false; $('#lab-load-progress').removeAttribute('value');
  $('#lab-loading-title').textContent = `Загружаем: ${definition().title.toLowerCase()}`;
  $('#lab-loading-message').textContent = `Подробная исходная модель · ${(definition().bytes / 1e6).toFixed(1)} МБ`;
  $('[data-lab-action="retry"]').hidden = true;
  try {
    if (!renderer) initializeGraphics();
    const bytes = await modelBytes(new URL(definition().file, rootURL).href, token, requestController.signal);
    if (token !== epoch || !dialog.open) return;
    $('#lab-loading-message').textContent = 'Подготавливаем структуры и освещение…';
    const result = await new GLTFLoader().parseAsync(bytes, rootURL.href);
    if (token !== epoch || !dialog.open) { disposeUnattached(result.scene); return; }
    model = result.scene; model.scale.fromArray(definition().nativeToAtlasScale); scene.add(model); model.updateMatrixWorld(true);
    const lookup = new Map(definition().parts.map(item => [item.id,item]));
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      const item = lookup.get(mesh.name); if (!item) throw new Error('Unmapped anatomical structure: ' + mesh.name);
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (material) sourceMaterials.add(material);
      const group = definition().groups.find(group => group.id === item.group);
      mesh.material = new THREE.MeshStandardMaterial({color:group.color, roughness:id === 'heart' ? .53 : .72, metalness:0, side:THREE.DoubleSide});
      mesh.userData.organId = item.id; mesh.userData.labPart = item.id;
      mesh.userData.displayColor = new THREE.Color(group.color); mesh.renderOrder = 0;
      meshes.push(mesh); partMeshes.set(item.id, mesh);
    });
    sourceMaterials.forEach(material => material.dispose()); sourceMaterials.clear();
    if (meshes.length !== definition().parts.length) throw new Error('Incomplete anatomical model.');
    slicer = createSectionRenderer({scene, renderer, meshes});
    const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    for (const light of scene.children.filter(object => object.isDirectionalLight)) light.target.position.copy(center);
    view = {theta:.2,phi:1.42,radius:.6,toRadius:.6,target:center.clone(),toTarget:center.clone(),automatic:true};
    $('.lab-loading').hidden = true; setReady(true); applyAppearance(); resize(); fit(null, true);
    if (part && lookup.has(part)) selectPart(part, true);
    renderer.domElement.focus({preventScroll:true});
  } catch (error) {
    if (token !== epoch || !dialog.open || error.name === 'AbortError') return;
    console.warn('Detailed anatomical model:', error);
    fail(renderer ? 'Не удалось загрузить модель. Проверьте соединение и повторите попытку.' : 'Браузер не создал 3D-контекст. Включите аппаратное ускорение или откройте сайт в браузере с WebGL.');
  }
}
function fail(text) {
  ++epoch; requestController?.abort(); requestController = null;
  setReady(false); disposeGraphics(); $('.lab-loading').hidden = false;
  $('.lab-spinner').hidden = true; $('#lab-load-progress').hidden = true; $('#lab-loading-title').textContent = '3D сейчас недоступен'; $('#lab-loading-message').textContent = text;
  $('[data-lab-action="retry"]').hidden = false; message(text);
}
function applyAppearance() {
  if (!ready) return;
  const {visible, selected} = layers.get(), shown = new Set(visible);
  for (const mesh of meshes) {
    const id = mesh.userData.labPart, ghost = inspection && selected && id !== selected;
    mesh.visible = shown.has(id) && (!ghost || context);
    mesh.material.color.copy(mesh.userData.displayColor); mesh.material.emissive.copy(mesh.material.color);
    mesh.material.emissiveIntensity = selected === id ? .08 : 0;
    const transparent = !!ghost;
    if (mesh.material.transparent !== transparent) { mesh.material.transparent = transparent; mesh.material.needsUpdate = true; }
    mesh.material.opacity = ghost ? .12 : 1; mesh.material.depthWrite = !ghost; mesh.material.forceSinglePass = transparent;
    mesh.renderOrder = ghost ? 1 : 0;
  }
  model.updateMatrixWorld(true); updateSection(); syncLayerControls();
}
function updateSection() {
  if (!slicer || !ready) return;
  slicer.update({enabled:sectionEnabled, config:sectionConfig, affected:meshes.filter(mesh => mesh.visible).map(mesh => mesh.userData.labPart)});
  const visible = meshes.filter(mesh => mesh.visible && slicer.hasVisible(mesh)).length;
  const selected = currentPart();
  $('#lab-stage-status').textContent = visible === 0 ? 'Срез проходит вне видимых поверхностей. Сдвиньте плоскость или увеличьте толщину слоя.' : selected ? selected.name : `В сцене: ${visible} / ${definition().parts.length} структур`;
}
function syncSection() {
  if (!dialog) return;
  $('#lab-cut-toggle').checked = sectionEnabled; $('.lab-cut-settings').hidden = !sectionEnabled; dialog.classList.toggle('lab-cut-on', sectionEnabled);
  all('[data-lab-cut-mode]').forEach(item => { item.setAttribute('aria-pressed', String(item.dataset.labCutMode === sectionConfig.mode)); item.disabled = !ready; });
  all('[data-lab-cut-axis]').forEach(item => { item.setAttribute('aria-pressed', String(item.dataset.labCutAxis === sectionConfig.axis)); item.disabled = !ready; });
  $('#lab-cut-position').value = Math.round(sectionConfig.position * 100); $('#lab-position-value').value = `${Math.round(sectionConfig.position * 100)}%`;
  $('#lab-cut-position').setAttribute('aria-valuetext', `${Math.round(sectionConfig.position * 100)} процентов, ${sectionAxes[sectionConfig.axis].from} ${sectionAxes[sectionConfig.axis].to}`);
  $('#lab-cut-thickness').value = Math.round(sectionConfig.thickness * 100); $('#lab-thickness-value').value = `${Math.round(sectionConfig.thickness * 100)}%`;
  $('#lab-thickness-control').hidden = sectionConfig.mode !== 'slab'; $('#lab-cut-guide').checked = sectionConfig.guide;
  $('#lab-cut-direction').textContent = `${sectionAxes[sectionConfig.axis].from} → ${sectionAxes[sectionConfig.axis].to}`;
  $('[data-lab-action="flip"]').disabled = !ready || sectionConfig.mode === 'slab'; $('[data-lab-action="flip"]').setAttribute('aria-pressed', String(sectionConfig.mode === 'cut' && sectionConfig.flipped));
  $('[data-lab-action="slice-less"]').disabled = !ready || sectionConfig.position <= 0; $('[data-lab-action="slice-more"]').disabled = !ready || sectionConfig.position >= 1;
  for (const input of all('#lab-cut-position, #lab-cut-thickness, #lab-cut-guide')) input.disabled = !ready;
  queueResize();
}
function setSection(patch) {
  if (!ready) return;
  const next = patchSectionConfig(sectionConfig, patch); if (!next) return;
  sectionConfig = next; updateSection(); syncSection();
}
function queueResize() {
  if (resizeQueued || !dialog?.open) return;
  resizeQueued = true; requestAnimationFrame(() => { resizeQueued = false; if (dialog.open) resize(); });
}
function resize() {
  if (!renderer || !camera || !dialog.open) return;
  const stage = $('.lab-stage'), rect = stage.getBoundingClientRect(), width = Math.max(1, stage.clientWidth), height = Math.max(1, stage.clientHeight);
  const obstacles = ['.lab-sectionbar','.lab-view-controls'].map(selector => {
    const r = $(selector).getBoundingClientRect(); return {left:r.left-rect.left,top:r.top-rect.top,right:r.right-rect.left,bottom:r.bottom-rect.top};
  });
  frame = safeSceneFrame(width, height, obstacles, 1.1);
  camera.clearViewOffset(); camera.aspect = width/height; camera.setViewOffset(width,height,width/2-frame.centerX,height/2-frame.centerY,width,height); camera.updateProjectionMatrix();
  const profile = resolveGraphicsProfile(quality, {width,height,dpr:devicePixelRatio||1,maxSize:renderer.capabilities.maxTextureSize,compact:matchMedia('(pointer:coarse)').matches,lowMemory:navigator.deviceMemory <= 4});
  renderer.setPixelRatio(profile.effectiveDPR); renderer.setSize(width,height,false);
  stage.style.setProperty('--lab-section-height', `${Math.ceil($('.lab-sectionbar').getBoundingClientRect().height)}px`);
  if (ready && view.automatic) fit(layers.get().selected && inspection ? layers.get().selected : null);
}
function fit(id = null, instant = false) {
  if (!ready || !frame) return;
  const box = new THREE.Box3(), objects = id ? [partMeshes.get(id)] : meshes.filter(mesh => mesh.visible && mesh.material.opacity === 1);
  objects.filter(Boolean).forEach(mesh => box.expandByObject(mesh)); if (box.isEmpty()) return;
  view.toTarget.copy(box.getCenter(new THREE.Vector3()));
  view.toRadius = fittedSceneRadius(box.getSize(new THREE.Vector3()).toArray(), {theta:view.theta,phi:view.phi,fov:camera.fov,frame,min:.025,max:5,padding:.85});
  view.automatic = true;
  if (instant || reduced) { view.target.copy(view.toTarget); view.radius = view.toRadius; }
}
function stopRotation() { rotation=false; $('[data-lab-action="rotate"]')?.setAttribute('aria-pressed','false'); }
function render(time) {
  if (!dialog?.open || !ready || document.hidden) return;
  const dt = Math.min(.05, Math.max(0,(time-previousTime)/1000 || .016)); previousTime = time;
  if (rotation && !reduced) { view.theta += dt*.18; view.automatic = false; }
  const amount = reduced ? 1 : 1-Math.exp(-dt*12); view.radius += (view.toRadius-view.radius)*amount; view.target.lerp(view.toTarget,amount);
  const sp = Math.sin(view.phi); camera.position.set(view.target.x+view.radius*sp*Math.sin(view.theta),view.target.y+view.radius*Math.cos(view.phi),view.target.z+view.radius*sp*Math.cos(view.theta)); camera.lookAt(view.target);
  renderer.render(scene,camera);
}
function selectPart(id, focus = true) {
  if (!ready || !layers.select(id)) return;
  inspection = true; activePreset = ''; rotation = false; renderSelection(); applyAppearance();
  if (focus) fit(id);
  const part = currentPart(); message(`${part.name}. ${context ? 'Окружающие структуры полупрозрачны.' : 'Показана выбранная структура.'}`);
  all('[data-lab-action="rotate"]').forEach(item => item.setAttribute('aria-pressed','false'));
}
function pick(clientX, clientY) {
  if (!ready) return;
  const rect = renderer.domElement.getBoundingClientRect(), pointer = new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1), ray = new THREE.Raycaster();
  camera.updateMatrixWorld(); ray.setFromCamera(pointer,camera);
  const hits = ray.intersectObjects(meshes.filter(mesh => mesh.visible),false).filter(hit => slicer.allows(hit.object,hit.point));
  // When inspecting one part, translucent context must not steal selection.
  const hit = hits.find(hit => hit.object.material.opacity === 1) || hits[0]; if (hit) selectPart(hit.object.userData.labPart,false);
}
function bindOrbit() {
  const canvas = renderer.domElement, signal = pointerAbort.signal, points = new Map(); let moved = false, down = null;
  const listen = (name, handler, options = {}) => canvas.addEventListener(name, handler, {...options,signal});
  const pan = (dx,dy) => {
    const unit = 2*view.radius*Math.tan(camera.fov*Math.PI/360)/Math.max(1,canvas.clientHeight), right = new THREE.Vector3().setFromMatrixColumn(camera.matrix,0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);
    view.toTarget.addScaledVector(right,-dx*unit).addScaledVector(up,dy*unit); view.target.copy(view.toTarget); view.automatic = false;
  };
  const zoom = factor => { view.toRadius = THREE.MathUtils.clamp(view.toRadius*factor,.012,5); view.automatic = false; };
  listen('contextmenu', e => e.preventDefault());
  listen('pointerdown', e => { if (!ready || e.button > 2) return; e.preventDefault(); canvas.focus({preventScroll:true}); canvas.setPointerCapture(e.pointerId); points.set(e.pointerId,{x:e.clientX,y:e.clientY}); if (points.size === 1) {down={x:e.clientX,y:e.clientY,button:e.button};moved=false;} else moved=true; });
  listen('pointermove', e => {
    if (!points.has(e.pointerId)) return;
    const previous = points.get(e.pointerId), dx = e.clientX-previous.x, dy=e.clientY-previous.y;
    if (points.size >= 2) {
      const other = [...points].find(([id]) => id !== e.pointerId)[1], before=Math.hypot(previous.x-other.x,previous.y-other.y), after=Math.hypot(e.clientX-other.x,e.clientY-other.y);
      if (before>3 && after>3) zoom(before/after); pan(dx/2,dy/2); moved=true;
    } else if (down) {
      if (Math.hypot(e.clientX-down.x,e.clientY-down.y)>4) moved=true;
      if (e.shiftKey || down.button === 2 || down.button === 1) pan(dx,dy);
      else { view.theta -= dx*.007; view.phi=THREE.MathUtils.clamp(view.phi+dy*.007,.08,Math.PI-.08); view.automatic=false; }
    }
    points.set(e.pointerId,{x:e.clientX,y:e.clientY}); rotation=false; $('[data-lab-action="rotate"]').setAttribute('aria-pressed','false'); $('#lab-angle-label').textContent='Свободный ракурс';
  });
  listen('pointerup', e => { const choose = !moved && points.size===1 && down?.button===0; points.delete(e.pointerId); if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId); down=null; if(choose)pick(e.clientX,e.clientY); });
  const cancel = e => {points.delete(e.pointerId);down=null;moved=true;}; listen('pointercancel',cancel);listen('lostpointercapture',cancel);
  listen('wheel', e => {if(!ready)return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);zoom(Math.exp(THREE.MathUtils.clamp(delta,-500,500)*.001));},{passive:false});
  listen('keydown', e => {
    if(!ready||e.ctrlKey||e.metaKey||e.altKey)return;
    const key=e.key.toLowerCase();if(!['arrowleft','arrowright','arrowup','arrowdown','+','=','-','h','f'].includes(key))return;e.preventDefault();
    if(key==='h'){stopRotation();view.theta=.2;view.phi=1.42;fit();return;} if(key==='f'){stopRotation();fit(layers.get().selected);return;}
    if(key==='+'||key==='=')zoom(.9);else if(key==='-')zoom(1.1);else{view.theta+=(key==='arrowleft'?.08:key==='arrowright'?-.08:0);view.phi=THREE.MathUtils.clamp(view.phi+(key==='arrowup'?-.08:key==='arrowdown'?.08:0),.08,Math.PI-.08);view.automatic=false;}
    rotation=false;$('[data-lab-action="rotate"]').setAttribute('aria-pressed','false');
  });
}

function changeVisible(ids, value) {
  if (!ready) return;
  if (!layers.visibility(ids,value)) {message('Оставьте хотя бы одну структуру видимой.');syncLayerControls();return;}
  activePreset=''; if(!layers.get().selected)inspection=false; renderSelection(); applyAppearance();
  message(`Включено структур: ${layers.get().visible.length} из ${definition().parts.length}.`);
}
function choosePreset(id) {
  const preset = definition().presets.find(preset => preset.id === id); if (!ready || !preset) return;
  layers.only(definition().parts.filter(part => preset.groups.includes(part.group)).map(part => part.id)); layers.clearSelection();
  inspection=false;activePreset=id;renderSelection();applyAppearance();fit();message(`Набор «${preset.name}» открыт.`);
}
async function share() {
  const url = labURL(location.href,organ,layers?.get().selected ?? null,detailedOrgans); if(!url)return;
  try {await navigator.clipboard.writeText(url);message('Ссылка скопирована. Она откроет модель и выбранную структуру.');}
  catch {const field=$('#lab-share-url');field.hidden=false;field.value=url;field.focus();field.select();message('Скопируйте выделенную ссылку.');}
}
function handleClick(e) {
  const target=e.target.closest('button');if(!target||target.disabled)return;
  if(target.dataset.labSwitch){loadOrgan(target.dataset.labSwitch);return;}
  if(target.dataset.labPart){selectPart(target.dataset.labPart);return;}
  if(target.dataset.labPreset){choosePreset(target.dataset.labPreset);return;}
  if(target.dataset.labGroupOnly){const group=target.dataset.labGroupOnly;layers.only(definition().parts.filter(part=>part.group===group).map(part=>part.id));layers.clearSelection();inspection=false;activePreset='';renderSelection();applyAppearance();fit();return;}
  if(target.dataset.labCutAxis){setSection({axis:target.dataset.labCutAxis});return;}
  if(target.dataset.labCutMode){setSection({mode:target.dataset.labCutMode});return;}
  const action=target.dataset.labAction;if(!action)return;
  if(action==='close'){dialog.close();return;}
  if(action==='retry'){disposeGraphics();loadOrgan(organ);return;}
  if(action==='share'){share();return;}
  if(action==='clear-search'){$('#lab-part-search').value='';filterParts();$('#lab-part-search').focus({preventScroll:true});return;}
  if(!ready)return;
  if(action==='home'){stopRotation();view.theta=.2;view.phi=1.42;fit();$('#lab-angle-label').textContent='Вид спереди';}
  else if(action==='front'||action==='back'){stopRotation();view.theta=action==='front'?0:Math.PI;view.phi=Math.PI/2;fit(inspection?layers.get().selected:null);$('#lab-angle-label').textContent=action==='front'?'Вид спереди':'Вид сзади';}
  else if(action==='rotate'){if(reduced){message('Автовращение отключено: в системе выбрано уменьшение движения.');return;}rotation=!rotation;target.setAttribute('aria-pressed',String(rotation));}
  else if(action==='all'){layers.showAll();inspection=false;activePreset='all';renderSelection();applyAppearance();fit();message('Все структуры возвращены.');}
  else if(action==='clear-selection'){layers.clearSelection();inspection=false;renderSelection();applyAppearance();fit();message('Выделение снято. Видимость слоёв сохранена.');}
  else if(action==='focus-part'){stopRotation();fit(layers.get().selected);}
  else if(action==='only-part'){const id=layers.get().selected;if(id){layers.only([id]);inspection=true;context=false;activePreset='';renderSelection();applyAppearance();fit(id);message(`Изолировано: ${currentPart().name}.`);}}
  else if(action==='hide-part'){const id=layers.get().selected;if(id)changeVisible([id],false);}
  else if(action==='flip')setSection({flipped:!sectionConfig.flipped});
  else if(action==='slice-less'||action==='slice-more')setSection({position:Math.max(0,Math.min(1,sectionConfig.position+(action==='slice-more'?.01:-.01)))});
  else if(action==='slice-reset'){sectionEnabled=false;sectionConfig={...defaultSectionConfig,scope:'visible'};syncSection();updateSection();$('#lab-cut-toggle').focus({preventScroll:true});}
}
function handleChange(e) {
  const target=e.target;if(!ready)return;
  if(target.dataset.labVisible)changeVisible([target.dataset.labVisible],target.checked);
  else if(target.dataset.labGroupVisible)changeVisible(definition().parts.filter(part=>part.group===target.dataset.labGroupVisible).map(part=>part.id),target.checked);
  else if(target.id==='lab-context'){context=target.checked;inspection=!!layers.get().selected;applyAppearance();message(context?'Включённые соседние структуры полупрозрачны.':'Окружение скрыто.');}
  else if(target.id==='lab-cut-toggle'){sectionEnabled=target.checked;syncSection();updateSection();}
  else if(target.id==='lab-cut-guide')setSection({guide:target.checked});
  else if(target.id==='lab-quality'){quality=target.value;resize();}
}
function handleInput(e) {
  if(e.target.id==='lab-part-search')filterParts();
  else if(e.target.id==='lab-cut-position')setSection({position:Number(e.target.value)/100});
  else if(e.target.id==='lab-cut-thickness')setSection({thickness:Number(e.target.value)/100});
}
function closeLab() {
  ++epoch;requestController?.abort();requestController=null;ready=false;rotation=false;disposeGraphics();
  document.body.classList.remove('anatomy-lab-open');event('lab-visibility',{open:false});
  if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;
}
function openLab(id, part = null) {
  if(!Object.hasOwn(detailedOrgans,id)||atlasBusy)return;
  ensureDialog();
  if(!dialog.open){opener=document.activeElement;document.body.classList.add('anatomy-lab-open');dialog.showModal();event('lab-visibility',{open:true});}
  loadOrgan(id,part);
}
document.addEventListener('click', e => {const target=e.target.closest('[data-lab-organ]');if(target&&!target.disabled)openLab(target.dataset.labOrgan);});
document.addEventListener('anatomia:lab-open', e => openLab(e.detail?.organ,e.detail?.part ?? null));
document.addEventListener('anatomia:scene-state', e => {atlasBusy=['practice','vr'].includes(e.detail?.blocked);document.querySelectorAll('[data-lab-organ]').forEach(control=>control.disabled=atlasBusy);});
window.addEventListener('resize',queueResize);
const route=labFromURL(location.href,detailedOrgans);if(route)openLab(route.organ,route.part);
