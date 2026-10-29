import * as THREE from './vendor/three.module.min.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {organs,sources,systemNames,findTasks,cases} from './data.js?v=1.10.1';
import {briefs,lessons,icon} from './experience.js';
import {openPracticeHub} from './practice-hub.js';
import {normalizeScene,scenePresets} from './scene-state.js?v=1.10.1';
import {defaultSectionConfig,normalizeSectionSnapshot,patchSectionConfig,sectionAxes} from './section-state.js';
import {createSectionRenderer} from './section-renderer.js';
import {normalizeGraphicsQuality,resolveGraphicsProfile,surfaceProfile,studioLightProfile,selectionProfile,safeSceneFrame,fittedSceneRadius} from './render-profile.js';
const $=s=>document.querySelector(s), byId=id=>organs.find(o=>o.id===id);
const rootURL=new URL('.',import.meta.url), q=new URLSearchParams(location.search);
let scene,renderer,camera,modelRoot,anatomy,skeleton,raycaster,selected='heart',isolated=false,showSkeleton=true,showLabels=false,autoRotate=false,loaded=false,quiz=null,reviewedQuiz=null,hovered=null;
let lesson=null,lessonStep=0,physio=null,contextMode=false,comparison3D=null;
const hiddenOrgans=new Set();
let contextOpacity=.075,sceneFit=null,sceneZoomLimit=3.7,sceneStateQueued=false;
let sectionEnabled=false,sectionConfig={...defaultSectionConfig},sectionView=null,sectionInfo=null;
let fallbackMode=false,loadingTimer,demoStep=-1,anatomyLabOpen=false;
let viewerLoad='idle',viewerEpoch=0,viewerImagePreference=false,viewerResizeObserver=null,orbitAbort=null,skeletonLoad='idle',vrSupported=null;
let initialSceneApplied=false,initialDemoHandled=false,imageScale=1,imageOffset={x:0,y:0},theatreMode=false;
let graphicsQuality='auto',graphicsPersistent=true,graphicsResolution=null,graphicsMaxSize=8192,cameraFrameState=null,initialPresentationFramed=false,initialPresentationPending=false;
try{graphicsQuality=normalizeGraphicsQuality(localStorage.getItem('anatomia-graphics-v1'))||'auto';}catch{graphicsPersistent=false;}
const demoSteps=[{title:'От целого к детали',hint:'Выберите орган на модели или в каталоге. Русское название, латынь и функция — рядом.'},{title:'Сравните лёгкие',hint:'Справа три доли, слева две. В 3D маршрут помогает рассмотреть форму.'},{title:'Найдите скрытое',hint:'Поджелудочная железа расположена позади желудка. В 3D сравните ракурсы.'},{title:'Один объём — два режима',hint:'Сравните 100 × 50 и 50 × 100. Одинаковый МОК не означает одинаковое состояние сердца.'},{title:'Проверьте понимание',hint:'Два вопроса, обратная связь и разбор. Это самопроверка, не клиническая оценка.'}];
const meshes=[], organMeshes=new Map(), centers=new Map(), labelNodes=new Map(), controllers=[],xrButtons=[];
let progressPersistent=true;
let progress={viewed:[],best:{}};try{progress={...progress,...JSON.parse(localStorage.getItem('anatomia-progress-v1')||'{}')};progress.viewed=Array.isArray(progress.viewed)?[...new Set(progress.viewed.filter(id=>organs.some(o=>o.id===id)))]:[];progress.lessons=Array.isArray(progress.lessons)?[...new Set(progress.lessons.filter(id=>lessons.some(l=>l.id===id)))]:[];if(!progress.best||typeof progress.best!=='object')progress.best={};}catch{progressPersistent=false;}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const view={theta:.13,phi:1.52,radius:1.88,target:new THREE.Vector3(0,1.26,0),toTarget:new THREE.Vector3(0,1.26,0),toRadius:1.88};
let xrInspectCenter=null,xrHover=-1,lastHover=0;const keyboardPoint={x:.5,y:.5};let toastTimer,prevTime=0,xrPanel,xrCanvas,xrCtx,xrTexture,xrActive=false,desktopState;
function notifyLearning(name,detail){if(typeof CustomEvent!=='undefined')document.dispatchEvent(new CustomEvent('anatomia:'+name,{detail}))}
function save(){try{localStorage.setItem('anatomia-progress-v1',JSON.stringify(progress));progressPersistent=true}catch{progressPersistent=false}notifyLearning('progress',{...progress,persistent:progressPersistent})}
document.addEventListener('anatomia:request-progress',()=>notifyLearning('progress',{...progress,persistent:progressPersistent}));
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4200)}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function setNav(id){document.querySelectorAll('.nav').forEach(b=>{b.classList.toggle('active',b.dataset.tab===id);b.setAttribute('aria-pressed',String(b.dataset.tab===id))})}
const normalizeTerm=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ё/g,'е').trim();
function syncSystemDock(){
  const value=$('#system').value;
  document.querySelectorAll('[data-system]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.system===value)));
}
function renderList(){
  const focusId=document.activeElement?.dataset?.organ,term=normalizeTerm($('#search').value),sys=$('#system').value;
  const filtered=organs.filter(o=>(sys==='all'||o.system===sys)&&normalizeTerm(`${o.name} ${o.latin} ${systemNames[o.system]}`).includes(term));
  $('#organ-list').innerHTML=filtered.map(o=>`<button class="organ-item ${selected===o.id&&!quiz?'active':''}" style="--organ:${o.color}" data-organ="${o.id}" aria-pressed="${selected===o.id&&!quiz}" ${quiz?'disabled':''}><img class="organ-thumb" src="./previews/${o.id}.webp" alt="" width="48" height="56" loading="lazy" decoding="async"><span class="name">${o.name}<small>${o.latin}</small>${!fallbackMode&&hiddenOrgans.has(o.id)?'<small class="organ-hidden-label">Скрыт в 3D</small>':''}</span><span class="idx">${String(organs.indexOf(o)+1).padStart(2,'0')}</span></button>`).join('')||'<div class="empty"><p>Ничего не найдено.</p><button class="text-button" id="clear-organ-search">Сбросить поиск и фильтр</button></div>';
  $('#organ-list').querySelectorAll('[data-organ]').forEach(b=>b.onclick=()=>select(b.dataset.organ,true));
  $('#clear-organ-search')?.addEventListener('click',()=>{$('#search').value='';applySystem('all');$('#search').focus()});
  const status=$('#organ-results-status');if(status)status.textContent=`Показано ${filtered.length} из ${organs.length}`;
  syncSystemDock();if(focusId)document.querySelector(`[data-organ="${focusId}"]`)?.focus({preventScroll:true});
}
function applySystem(value){
  if(quiz||!(value==='all'||Object.hasOwn(systemNames,value)))return;
  if(lesson||physio||comparison3D)clearStudyModes();
  $('#system').value=value;isolated=false;contextMode=false;
  const id=value==='all'||byId(selected).system===value?selected:organs.find(o=>o.system===value).id;
  selected=id;home();select(id);syncStagePrompt();updateXRPanel();
}
function organURL(id){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('organ',id);return url.href;}
async function shareOrgan(id){
  if(!byId(id))return;
  const url=organURL(id),status=$('#organ-share-status'),field=$('#organ-share-url');
  try{await navigator.clipboard.writeText(url);if(status?.isConnected)status.textContent='Ссылка скопирована. Откроется этот орган.';}
  catch{if(field?.isConnected){field.hidden=false;field.value=url;field.focus();field.select();if(status)status.textContent='Скопируйте выделенную ссылку.';}}
}
function renderCard(){
  updateFallback();syncViewerControls();
  if(quiz){renderQuiz();return}if(lesson){renderLesson();return}if(physio){renderPhysio();return}if(comparison3D){renderComparison3D();return}
  const focusId=document.activeElement?.id,o=byId(selected);
  if((loaded||fallbackMode)&&!progress.viewed.includes(o.id)){progress.viewed.push(o.id);save();}
  document.body.classList.toggle('is-isolated',isolated);
  $('#organ-card').innerHTML=`<div class="card-kicker"><span>В ФОКУСЕ</span><div class="card-pager"><button id="organ-prev" aria-label="Предыдущий орган">‹</button><span class="number">${String(organs.indexOf(o)+1).padStart(2,'0')} / 16</span><button id="organ-next" aria-label="Следующий орган">›</button></div></div><span class="organ-system-tag">${systemNames[o.system]}</span><h2>${o.name}</h2><div class="latin">${o.latin}</div><p class="brief">${briefs[o.id]}</p><p class="organ-location-preview">${o.location}</p><div class="card-actions"><button class="primary" id="isolate">${icon(isolated?'layers':'focus')}${fallbackMode?'Выбрать другой орган':isolated?'Все органы':'Изолировать'}</button><button class="icon-button" id="focus" title="Приблизить" aria-label="Приблизить орган">${icon('search')}</button></div>${isolated&&!fallbackMode?`<button class="context-button" id="context" aria-pressed="${contextMode}">${icon('layers')}Соседние органы</button>`:''}${loaded&&!fallbackMode&&!xrActive?`<button class="section-card-launch" id="organ-section">${icon('layers')} Срез и слои <span>Исследовать в 3D →</span></button><div class="structure-tools"><button id="hide-organ" ${hiddenOrgans.size>=organs.length-1?'disabled':''}>Скрыть орган</button>${hiddenOrgans.size?`<button id="restore-organs">Вернуть скрытые <b>${hiddenOrgans.size}</b></button>`:''}</div>`:''}${['heart','brain'].includes(o.id)?`<button class="lab-card-launch" id="organ-lab">${icon('layers')} Внутренние структуры · 3D <span>${o.id==='heart'?'Камеры, клапаны и мышцы':'Отделы и глубокие структуры'} →</span></button>`:''}<div class="card-links"><button class="text-button" id="organ-info">${icon('info')}Подробнее</button><button class="text-button" id="quick-quiz">Проверить себя ${icon('arrow')}</button></div>${['heart','lungR','lungL','airway','kidneyR','kidneyL','bladder'].includes(o.id)?`<button class="teach-card-launch" data-teaching="${o.id}">Изучить работу органа <span>Схемы · вопросы →</span></button>`:''}${reviewedQuiz?'<button class="secondary" id="back-results">← К результатам</button>':''}<div class="card-study-tools"><button data-save-organ="${o.id}" aria-pressed="false"><span aria-hidden="true">☆</span><span>Сохранить</span></button><button data-learning>Мой учебный план →</button></div><button class="organ-share" id="organ-share">${icon('link')} Ссылка на этот орган</button><input id="organ-share-url" class="organ-share-url" readonly hidden aria-label="Ссылка на выбранный орган"><p class="organ-share-status" id="organ-share-status" role="status"></p>`;
  $('#isolate').onclick=()=>{if(fallbackMode){toggleCatalog(true);return}isolated=!isolated;contextMode=false;applyAppearance();if(isolated){focusOrgan();if(xrActive)xrFocusOrgan()}else home();renderCard();updateXRPanel()};
  $('#focus').onclick=()=>{if(fallbackMode){isolated=true;renderCard()}else focusOrgan()};$('#quick-quiz').onclick=()=>startQuiz('function',[o.id]);$('#organ-info').onclick=()=>organInfo(o.id);
  $('#organ-share').onclick=()=>shareOrgan(o.id);
  $('#organ-lab')?.addEventListener('click',()=>notifyLearning('lab-open',{organ:o.id}));$('#organ-section')?.addEventListener('click',()=>openOrganSection());$('#hide-organ')?.addEventListener('click',hideSelectedOrgan);$('#restore-organs')?.addEventListener('click',restoreHiddenOrgans);
  $('#organ-prev').onclick=()=>cycleOrgan(-1);$('#organ-next').onclick=()=>cycleOrgan(1);
  if(isolated&&!fallbackMode)$('#context').onclick=()=>{contextMode=!contextMode;applyAppearance();renderCard()};
  notifyLearning('card',{id:o.id});$('#back-results')?.addEventListener('click',restoreResults);if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
}

function select(id,focus=false,remember=true){
  if(!byId(id))return;if(quiz){if(quiz.type==='find'&&!quiz.answered&&!quiz.finished)answerFind(id);return}
  if(lesson||physio||comparison3D)clearStudyModes();hiddenOrgans.delete(id);selected=id;if(fallbackMode&&focus)isolated=true;const filter=$('#system');if(filter.value!=='all'&&byId(id).system!==filter.value)filter.value='all';
  if(xrActive&&isolated)xrFocusOrgan();if(!progress.viewed.includes(id)){progress.viewed.push(id);save()}if(remember)notifyLearning('visit',{id});
  renderList();renderCard();applyAppearance();if(fallbackMode)syncStagePrompt();if(focus){toggleCatalog(false);focusOrgan();}updateXRPanel();
  if(focus){toggleCatalog(false);if(fallbackMode&&matchMedia('(max-width:700px)').matches)$('#detail').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'})}
}

function createOrganMaterial(id){
  const profile=surfaceProfile(id);
  return new THREE.MeshStandardMaterial({color:byId(id).color,roughness:profile.roughness,metalness:profile.metalness,side:THREE.DoubleSide});
}
function createStudioLights(){
  const profile=studioLightProfile;
  scene.add(new THREE.HemisphereLight(profile.hemisphere.sky,profile.hemisphere.ground,profile.hemisphere.intensity));
  for(const name of ['key','fill','rim']){
    const spec=profile[name],light=new THREE.DirectionalLight(spec.color,spec.intensity);
    light.position.fromArray(spec.position);light.target.position.set(0,1.1,0);scene.add(light,light.target);
  }
}
function graphicsAvailability(){
  if(xrActive)return {available:false,reason:'В VR разрешением управляет шлем. Профиль экрана сохранён.'};
  if(viewerLoad==='loading')return {available:false,reason:'3D-модель загружается. Профиль станет доступен после подготовки сцены.'};
  if(!loaded||!renderer)return {available:false,reason:'3D сейчас недоступен. Изображения и учебные задания доступны.'};
  if(fallbackMode)return {available:false,reason:'Открыто изображение. Перейдите в 3D, чтобы изменить качество.'};
  return {available:true,reason:{auto:'Разрешение подбирается по размеру экрана.',high:'Повышенное разрешение изображения.',eco:'Сниженная нагрузка на графический модуль.'}[graphicsQuality]};
}
function publishGraphicsState(){
  const state=graphicsAvailability();
  notifyLearning('graphics-state',{...state,quality:graphicsQuality,effectiveDPR:state.available?(graphicsResolution?.effectiveDPR??null):null,resolution:state.available&&graphicsResolution?{width:graphicsResolution.width,height:graphicsResolution.height}:null,persistent:graphicsPersistent});
}
function applyGraphicsResolution(width=$('#viewport').clientWidth,height=$('#viewport').clientHeight){
  if(!renderer||xrActive||fallbackMode||!width||!height)return false;
  const coarse=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
  const memory=globalThis.navigator?.deviceMemory;
  const next=resolveGraphicsProfile(graphicsQuality,{width,height,dpr:globalThis.devicePixelRatio||1,maxSize:graphicsMaxSize,compact:coarse,lowMemory:Number.isFinite(memory)&&memory<=4});
  if(!next)return false;
  if(next.effectiveDPR!==graphicsResolution?.effectiveDPR)renderer.setPixelRatio?.(next.effectiveDPR);
  graphicsResolution=next;return true;
}
function handleGraphicsCommand(detail){
  if(!detail||typeof detail!=='object')return;
  if(detail.action==='quality'&&graphicsAvailability().available){
    const quality=normalizeGraphicsQuality(detail.value);
    if(quality){
      graphicsQuality=quality;try{localStorage.setItem('anatomia-graphics-v1',quality);graphicsPersistent=true;}catch{graphicsPersistent=false;}
      applyGraphicsResolution();
    }
  }
  publishGraphicsState();
}
document.addEventListener('anatomia:graphics-command',event=>handleGraphicsCommand(event.detail));

function getSectionSnapshot(){return {enabled:sectionEnabled,config:{...sectionConfig}};}
function restoreSectionSnapshot(value){
  const next=normalizeSectionSnapshot(value);sectionEnabled=next?.enabled??false;sectionConfig=next?.config||{...defaultSectionConfig};
}
function sectionAffected(){
  const visible=visibleSceneIds();return sectionConfig.scope==='selected'?visible.filter(id=>id===selected):visible;
}
function publishSectionState(){
  const blocked=sceneBlocked(),axis=sectionAxes[sectionConfig.axis];
  const positionLabel=sectionConfig.mode==='slab'?`${Math.round(sectionConfig.position*100)}% пути · слой ${Math.round(sectionConfig.thickness*100)}%`:`${Math.round(sectionConfig.position*100)}% · ${axis.from} ${axis.to}`;
  notifyLearning('section-state',{available:!blocked,reason:sceneReason(blocked),enabled:sectionEnabled,config:{...sectionConfig},selected,affected:sectionAffected(),positionLabel,capAvailable:!!sectionView?.capAvailable});
}
function updateSectionView(){
  // Exercises and immersive sessions always start with the original whole surfaces.
  if(quiz||lesson||physio||xrActive)sectionEnabled=false;
  const active=sectionEnabled&&!sceneBlocked();
  if(active&&!sectionView&&scene&&renderer)sectionView=createSectionRenderer({scene,renderer,meshes});
  if(sectionView)sectionInfo=sectionView.update({enabled:active,config:sectionConfig,affected:sectionAffected()});
  document.body.classList.toggle('section-active',active);
  publishSectionState();
}
function handleSectionCommand(detail){
  if(!detail||typeof detail!=='object')return;
  if(detail.action==='request'){publishSectionState();return;}
  if(sceneBlocked()){publishSectionState();return;}
  if(detail.action==='enable'){
    if(typeof detail.value!=='boolean')return;
    sectionEnabled=detail.value;
  }else if(detail.action==='config'){
    const next=patchSectionConfig(sectionConfig,detail.patch);if(!next)return;sectionConfig=next;
  }else if(detail.action==='reset'){
    sectionEnabled=false;sectionConfig={...defaultSectionConfig};
  }else return;
  updateSectionView();scheduleSceneState();
}
function focusStudyOrgan(id){
  if(sceneBlocked()||!byId(id))return false;
  stopDemo();clearStudyModes();selected=id;hiddenOrgans.delete(id);$('#system').value='all';$('#search').value='';
  isolated=true;contextMode=false;autoRotate=false;
  select(id,true);focusScene();return true;
}
function openOrganSection(){
  if(!focusStudyOrgan(selected))return;
  sectionConfig={...sectionConfig,scope:'selected'};sectionEnabled=true;updateSectionView();
  notifyLearning('open-section',{selected});scheduleSceneState();
}
document.addEventListener('anatomia:section-command',event=>handleSectionCommand(event.detail));
document.addEventListener('anatomia:lab-visibility',event=>{
  if(typeof event.detail?.open!=='boolean')return;
  anatomyLabOpen=event.detail.open;prevTime=0;
  if(anatomyLabOpen)renderer?.setAnimationLoop?.(null);
  else if(loaded&&!fallbackMode&&!xrActive)renderer?.setAnimationLoop?.(renderFrame);
  updateSectionView();syncViewerControls();publishSceneState();if(!anatomyLabOpen)resize();
});

function readCameraFrame(){
  const viewport=$('#viewport'),realLayout=typeof getComputedStyle==='function',r=viewport.getBoundingClientRect();
  const height=viewport.clientHeight||(realLayout?r.height:0)||600;
  const width=viewport.clientWidth||(realLayout?r.width:0)||(camera?.aspect||1)*height;
  const obstacles=[];
  if(realLayout)for(const selector of ['.stage-caption','.system-dock','.atlas-shortcuts','#detail','#catalog','#scene-panel','.stage-tools','.viewer-controls','.viewer-angle-control']){
    const el=$(selector);if(!el||el.hidden||el.getClientRects?.().length===0)continue;
    const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
    const box=el.getBoundingClientRect();if(!box.width||!box.height)continue;
    const obstacle={left:box.left-r.left,top:box.top-r.top,right:box.left-r.left+box.width,bottom:box.top-r.top+box.height};
    if(obstacle.right>0&&obstacle.left<width&&obstacle.bottom>0&&obstacle.top<height)obstacles.push(obstacle);
  }
  return safeSceneFrame(width,height,obstacles);
}
function refreshCameraFrame(){
  if(!camera||xrActive)return cameraFrameState;
  const frame=readCameraFrame(),w=frame.viewportWidth,h=frame.viewportHeight;
  camera.aspect=w/h;camera.clearViewOffset();
  const x=w/2-frame.centerX,y=h/2-frame.centerY;
  if(Math.abs(x)>.01||Math.abs(y)>.01)camera.setViewOffset(w,h,x,y,w,h);
  camera.updateProjectionMatrix();cameraFrameState=frame;return frame;
}
function radiusForSceneBox(box,theta=view.turn?.to??view.theta,phi=view.turn?.toPhi??view.phi){
  return fittedSceneRadius(box.getSize(new THREE.Vector3()).toArray(),{theta,phi,fov:camera?.fov||35,frame:refreshCameraFrame()});
}
function frameAtlasHome(allowFind=false){
  if(!loaded||fallbackMode||xrActive||(quiz&&!(allowFind&&quiz.type==='find'))||lesson||physio)return false;
  const ids=visibleSceneIds(),box=new THREE.Box3();ids.flatMap(id=>organMeshes.get(id)||[]).forEach(mesh=>box.expandByObject(mesh));
  if(box.isEmpty())return false;
  const radius=radiusForSceneBox(box,.13,1.52);
  view.toTarget.copy(box.getCenter(new THREE.Vector3()));view.toRadius=radius;
  sceneZoomLimit=Math.max(3.7,radius);sceneFit={ids:[...ids],aspect:camera.aspect,radius,kind:'home',frame:{...cameraFrameState}};
  initialPresentationFramed=true;syncZoomControls();scheduleSceneState();return true;
}
function focusOrgan(keepAngle=false){
  if(!loaded)return;if(xrActive){if(isolated)xrFocusOrgan();return}
  const c=centers.get(selected);if(!c)return;const box=new THREE.Box3();focusedIds().flatMap(id=>organMeshes.get(id)||[]).forEach(m=>box.expandByObject(m));
  const targetTheta=(!lesson&&!keepAngle) ? .12 : (view.turn?.to??view.theta),targetPhi=(!lesson&&!keepAngle) ? 1.5 : (view.turn?.toPhi??view.phi);
  view.toTarget.copy(box.getCenter(new THREE.Vector3()));view.toRadius=radiusForSceneBox(box,targetTheta,targetPhi);
  sceneFit={ids:[...focusedIds()],aspect:camera.aspect,radius:view.toRadius,kind:'focus',frame:{...cameraFrameState}};sceneZoomLimit=Math.max(3.7,view.toRadius);
  if(comparison3D){comparison3D.fitRadius=view.toRadius;comparison3D.fitAspect=camera?.aspect||1;comparison3D.fitAutomatic=true;comparison3D.frame={...cameraFrameState};}
  initialPresentationFramed=true;
  scheduleSceneState();
  if(!lesson&&!keepAngle)turnTo(.12,1.5);syncZoomControls();
}

function home(){
  if(comparison3D){isolated=true;contextMode=false;focusOrgan();applyAppearance();renderCard();syncStagePrompt();return;}
  if(xrActive){xrInspectCenter=null;modelRoot.rotation.set(0,0,0);modelRoot.scale.setScalar(1);modelRoot.position.set(0,0,-1.45)}
  sceneFit=null;sceneZoomLimit=3.7;view.toTarget.set(0,1.26,0);view.toRadius=1.88;turnTo(.13,1.52);isolated=false;contextMode=false;
  applyAppearance();if(!quiz)renderCard();frameAtlasHome(quiz?.type==='find');$('#view-name').textContent='ВИД СПЕРЕДИ';
}

function applyAppearance(){
  updateFallback();scheduleSceneState();if(!loaded||fallbackMode){updateSectionView();return;}const filter=$('#system').value,focus=focusedIds();
  const revealed=quiz?.answered&&!quiz.finished?(quiz.type==='case'?(current().targets||[current().target]):[current().id]):null;
  for(const [id,list]of organMeshes){const o=byId(id),ghost=isolated&&contextMode&&!focus.includes(id);list.forEach(m=>{
    m.visible=!hiddenOrgans.has(id)&&(!isolated||focus.includes(id)||contextMode)&&(!!quiz||!!lesson||filter==='all'||o.system===filter);
    const highlight=revealed?revealed.includes(id):comparison3D?comparison3D.ids.includes(id):id===selected&&!quiz;
    const atlas=!quiz&&!lesson&&!physio,profile=surfaceProfile(id);
    m.material.color.set(o.color);if(atlas&&!highlight)m.material.color.multiplyScalar(selectionProfile.unselectedBrightness);
    m.material.roughness=profile.roughness-(atlas&&highlight&&!ghost?selectionProfile.roughnessReduction:0);
    m.material.emissive.set(highlight?o.color:'#000000');m.material.emissiveIntensity=highlight?(revealed?selectionProfile.answerEmissive:atlas?selectionProfile.emissive:.13):0;
    if(m.material.transparent!==ghost){m.material.transparent=ghost;m.material.needsUpdate=true}
    m.material.opacity=ghost ? contextOpacity : 1;m.material.depthWrite=!ghost;m.renderOrder=ghost?-1:0;
  })}
  if(skeleton)skeleton.visible=showSkeleton&&(!isolated||contextMode);
  $('#skeleton').setAttribute('aria-pressed',String(showSkeleton));$('#labels-toggle').setAttribute('aria-pressed',String(showLabels));$('#rotate').setAttribute('aria-pressed',String(autoRotate));
  updateSectionView();
}

function showModal(html){$('#modal-content').innerHTML=html;const title=$('#modal-content h2');if(title){title.id='modal-title';$('#modal').setAttribute('aria-labelledby','modal-title')}$('#modal').showModal()}
function practice(){setNav('practice');openPracticeHub({fallbackMode:fallbackMode||!loaded,viewed:progress.viewed.length});}

function about(){setNav('sources');showModal(`<div class="modal-eyebrow">ОБ АТЛАСЕ / ВЕРСИЯ 1.9</div><h2>Анатомия, которую<br>можно рассмотреть.</h2><p>Учебный 3D-атлас для медицинского колледжа. 16 органов и групп структур, пространственный практикум, задания на функции и WebXR. Отбор структур предназначен для вводного изучения макроанатомии.</p><p><b>Как работать:</b> выберите орган в каталоге или на модели; вращайте перетаскиванием, приближайте колесом или щипком. Shift + перетаскивание, правая кнопка мыши или движение двумя пальцами перемещают вид. Стрелки вращают вид, + / − меняют масштаб, H возвращает общий вид. После фокуса на сцене WASD перемещают прицел, Enter выбирает орган. Латеральность указана относительно тела. Скелет служит ориентиром; цвет органов условный.</p><p><b>Качество 3D:</b> в настройках сцены доступны «Авто», «Высокое» и «Экономное». Они меняют разрешение изображения; выбор сохраняется на этом устройстве. Студийный свет и параметры поверхности помогают читать форму исходной модели. В показе стрелки ← / → переключают шаги, Home / End ведут к первому / последнему шагу, Esc завершает показ — когда фокус находится в его панели.</p><p><b>VR:</b> откройте сайт по HTTPS в браузере совместимого шлема и нажмите «Войти в VR». Триггер выбирает орган или кнопку панели; стик вращает модель. Кнопки на панели: предыдущий / следующий орган, изоляция, поиск, выход. В шлеме доступен пространственный поиск; тесты с вариантами и расчётная модель доступны в обычном режиме. Доступность VR зависит от устройства и браузера.</p><p><b>Границы модели:</b> это образовательная визуализация, не диагностический инструмент и не тренажёр выполнения вмешательств. Не все отделы и микроструктуры представлены; размеры и расположение отражают исходную модель, а не варианты нормы у конкретного человека. Перед применением в оценивании содержание следует согласовать с преподавателем.</p><h3>Источники и лицензии</h3><ul class="source-list"><li>Геометрия: <a href="https://github.com/Z-Anatomy" target="_blank" rel="noopener">Z-Anatomy</a> / BodyParts3D, DBCLS; WebGL-экспорт: <a href="https://github.com/nqwrc/3d-anatomy" target="_blank" rel="noopener">nqwrc/3d-anatomy</a>. Компоненты имеют разные лицензии, в том числе модели почек — <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">CC BY-NC 4.0</a> с некоммерческими условиями. Модели отобраны, объединены и оптимизированы; лицензии и авторство сохранены в <a href="./models/License.txt" target="_blank">исходном уведомлении</a> и <a href="./ASSET_SOURCES.md" target="_blank">описании источников</a>.</li><li>Детальное сердце и мозг: Human Reference Atlas / HuBMAP, модели Visible Human и Allen. Отдельные структуры доступны в 3D-лаборатории. Авторы Kristen Browne и Heidi Schlehlein, лицензия CC BY 4.0; версии, DOI и ограничения приведены в <a href="./models/hra/ATTRIBUTION.md" target="_blank" rel="noopener">атрибуции детальных моделей</a>.</li><li>Учебные факты сверены с OpenStax, <i>Anatomy and Physiology 2e</i>, Betts et al. Ссылки на разделы приведены в каждой карточке. Формулировки карточек и задания составлены для этого атласа; изображения и задания учебника не копировались.</li><li>Рендеринг: <a href="https://threejs.org" target="_blank" rel="noopener">Three.js</a> (MIT). Ключи и аккаунты не требуются. Данные о пациентах не используются.</li></ul><button class="secondary" id="export">Скачать мой результат</button>`);$('#export').onclick=()=>{const b=new Blob([JSON.stringify({application:'ANATOMIA',version:'1.10.1',exported:new Date().toISOString(),...progress},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='anatomia-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}}
function startQuiz(type,items,scope){if(type==='find'&&(!loaded||fallbackMode)){toast('Пространственный поиск доступен после загрузки 3D. В резервном режиме работают вопросы и ситуации.');return}clearStudyModes();toggleCatalog(false);setSceneOnly(false);$('#modal').close();reviewedQuiz=null;quiz={type,items:items||(type==='find'?shuffle(organs.map(o=>o.id)).slice(0,8):type==='case'?cases:shuffle(organs.map(o=>o.id)).slice(0,8)),index:0,score:0,answered:false,last:null,custom:!!items,scope:scope==='review'?'review':items?'custom':'standard',history:[],optionOrder:null};document.body.classList.add('in-practice');isolated=false;autoRotate=false;$('#system').value='all';$('#search').value='';setNav('practice');renderList();renderQuiz();if(type==='find')publishSceneState();home();updateXRPanel();if(type!=='find')focusQuestion();else focusScene()}
function current(){if(!quiz)return null;return quiz.type==='case'?quiz.items[quiz.index]:byId(quiz.items[quiz.index])}
function renderQuiz(){
  if(!quiz)return;updateFallback();document.body.classList.toggle('spatial-practice',quiz.type==='find');document.body.classList.toggle('quiz-finished',!!quiz.finished);syncStagePrompt();
  if(quiz.finished){const missed=quiz.history.filter(h=>!h.correct);$('#organ-card').innerHTML=`<div class="card-kicker"><span>ГОТОВО</span></div><h2 tabindex="-1" id="question-heading">${missed.length?'Повторим сложное?':'Всё верно.'}</h2><div class="score-ring" style="--score:${quiz.score/quiz.items.length*100}%"><div class="score">${quiz.score}<small>из ${quiz.items.length}</small></div></div>${[...new Set(missed.map(h=>h.organ))].map(id=>`<button class="secondary" data-review="${id}">${byId(id).name} ↗</button>`).join('')}${missed.length?'<button class="primary" id="retry-errors">Повторить ошибки</button>':''}<button class="${missed.length?'secondary':'primary'}" id="quiz-again">Ещё раз</button><button class="secondary" id="quiz-exit">В атлас</button>`;
    $('#quiz-again').onclick=()=>startQuiz(quiz.type,quiz.custom?[...quiz.items]:undefined,quiz.scope);$('#retry-errors')?.addEventListener('click',()=>{const type=quiz.type,items=missed.map(h=>h.item);startQuiz(type,items,'review')});
    document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{const id=b.dataset.review;reviewedQuiz=quiz;exitQuiz();select(id);isolated=true;applyAppearance();focusOrgan();renderCard()});$('#quiz-exit').onclick=exitQuiz;return;
  }
  const o=current(),find=quiz.type==='find';if(!find&&!quiz.optionOrder)quiz.optionOrder=shuffle(o.options.map((_,i)=>i));
  $('#organ-card').innerHTML=`<div class="card-kicker"><span>${find?'НАЙДИТЕ В 3D':quiz.type==='case'?'СИТУАЦИЯ':'ПРОВЕРЬТЕ СЕБЯ'}</span><span class="number">${quiz.index+1} / ${quiz.items.length}</span></div><div class="quiz-progress"><i style="width:${(quiz.index+(quiz.answered?1:0))/quiz.items.length*100}%"></i></div><h2 tabindex="-1" id="question-heading">${find?o.name:quiz.type==='case'?o.title:'Что вы знаете?'}</h2>${find?'':`<p class="quiz-question">${o.question||o.text}</p><div id="answers">${quiz.optionOrder.map((i,n)=>`<button class="answer ${quiz.answered?(i===o.answer?'correct':i===quiz.last?'wrong':''):''}" data-answer="${i}" ${quiz.answered?'disabled':''}><span class="answer-key">${['A','B','C'][n]}</span>${o.options[i]}</button>`).join('')}</div>`}${quiz.answered?`<div class="feedback" role="status" tabindex="-1"><b>${quiz.correct?'Верно ✓':'Правильный ответ выделен'}</b><details><summary>Почему?</summary><p>${find?o.location:o.explain}</p></details></div><button class="primary" id="quiz-next">${quiz.index+1===quiz.items.length?'Результат':'Далее →'}</button><button class="text-button" id="inspect-answer">${fallbackMode?'Рассмотреть ответ ↗':'Рассмотреть в 3D ↗'}</button>`:''}<button class="secondary" id="quiz-exit">В атлас</button>`;
  document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>answerChoice(Number(b.dataset.answer)));if($('#quiz-next'))$('#quiz-next').onclick=nextQuestion;$('#inspect-answer')?.addEventListener('click',inspectAnswer);$('#quiz-exit').onclick=exitQuiz;
}

function recordAnswer(){const o=current();quiz.history.push({item:quiz.items[quiz.index],organ:quiz.type==='case'?o.target:o.id,correct:quiz.correct,answer:quiz.last})}
function inspectAnswer(){if(!quiz?.answered||quiz.finished)return;selected=quiz.type==='case'?current().target:current().id;isolated=true;applyAppearance();focusOrgan();if(!xrActive){$('.stage').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});$(fallbackMode?'#fallback-image':'#viewport').focus({preventScroll:true})}updateXRPanel()}
function focusQuestion(){const h=$('#question-heading');if(h){h.focus({preventScroll:true});if(matchMedia('(max-width:820px)').matches)$('#detail').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'})}}
function syncStagePrompt(){
  syncViewerControls();
  const h=$('#scene-heading'),sub=$('#scene-subtitle'),controls=$('#stage-quiz');controls.innerHTML='';
  $('#scene-mode').textContent=fallbackMode?'ИЗОБРАЖЕНИЕ ИСХОДНОЙ МОДЕЛИ':comparison3D?'СРАВНЕНИЕ В 3D':lesson?'ВИЗУАЛЬНЫЙ МАРШРУТ':physio?'ФИЗИОЛОГИЯ':quiz?'ПРАКТИКА':'ИНТЕРАКТИВНЫЙ 3D-АТЛАС';
  if(comparison3D){h.textContent='Два органа в пространстве';sub.textContent='Вращайте и сравнивайте положение';controls.innerHTML='<button id="stage-comparison-exit">В атлас</button>';$('#stage-comparison-exit').onclick=exitComparison3D;return}
  if(lesson){h.textContent=lesson.name;sub.textContent=`Шаг ${lessonStep+1} / ${lesson.steps.length}`;return}
  if(physio){h.textContent='Сердце в работе';sub.textContent='Изменяйте частоту и объём';return}
  if(!quiz){h.textContent=fallbackMode?byId(selected).name:'Исследуйте тело.';sub.textContent=fallbackMode?'Форма, расположение и функция':'Выберите систему или коснитесь органа';return}
  h.textContent=quiz.finished?`Готово: ${quiz.score} / ${quiz.items.length}`:quiz.type==='find'?`Найдите: ${current().name}`:'Проверьте себя';
  sub.textContent=quiz.finished?'':quiz.type==='find'?(quiz.answered?(quiz.correct?'Верно ✓':`Ответ: ${current().name}`):'Коснитесь органа на модели'):`Вопрос ${quiz.index+1} / ${quiz.items.length}`;
  if(quiz.answered&&!quiz.finished){controls.innerHTML='<button id="stage-inspect">Показать</button><button id="stage-next">Далее →</button>';$('#stage-inspect').onclick=inspectAnswer;$('#stage-next').onclick=nextQuestion}
  else if(!quiz.finished&&quiz.type==='find'){controls.innerHTML='<button id="stage-exit">В атлас</button>';$('#stage-exit').onclick=exitQuiz}
  if(quiz.type==='find'&&!quiz.finished){const bar=document.createElement('div');bar.className='quiz-progress-mini';bar.setAttribute('aria-label',`Задание ${quiz.index+1} из ${quiz.items.length}`);bar.innerHTML=quiz.items.map((_,i)=>`<i class="${i<quiz.index?'done':i===quiz.index?'current':''}"></i>`).join('');controls.append(bar)}
}

function answerFind(id){if(!quiz||quiz.answered||quiz.finished||quiz.type!=='find')return;quiz.answered=true;quiz.last=id;quiz.correct=id===current().id;if(quiz.correct)quiz.score++;selected=current().id;recordAnswer();applyAppearance();renderQuiz();updateXRPanel();toast(quiz.correct?'Верно ✓':'Нужный орган выделен. Нажмите «Показать».');}
function answerChoice(index){if(!quiz||quiz.answered||quiz.finished)return;quiz.answered=true;quiz.last=index;quiz.correct=index===current().answer;if(quiz.correct)quiz.score++;selected=quiz.type==='case'?current().target:current().id;recordAnswer();applyAppearance();renderQuiz();$('.feedback')?.focus({preventScroll:true});updateXRPanel()}
function nextQuestion(){if(!quiz?.answered||quiz.finished)return;quiz.index++;if(quiz.index>=quiz.items.length){quiz.finished=true;if(!quiz.custom)progress.best[quiz.type]=Math.max(Number(progress.best[quiz.type])||0,quiz.score);progress.lastAttempt={type:quiz.type,score:quiz.score,total:quiz.items.length,date:new Date().toISOString(),completedAt:new Date().toISOString(),scope:quiz.scope||'custom',answers:quiz.history};save();renderQuiz();focusQuestion();updateXRPanel();return}quiz.answered=false;quiz.last=null;quiz.optionOrder=null;renderQuiz();home();if(quiz.type!=='find')focusQuestion();else focusScene();updateXRPanel()}
function exitQuiz(){quiz=null;document.body.classList.remove('in-practice','spatial-practice','quiz-finished');isolated=false;setNav('atlas');renderList();renderCard();home();syncStagePrompt();updateXRPanel();$(fallbackMode?'#detail':'#viewport').focus({preventScroll:true})}
function createLabels(){for(const o of organs){const d=document.createElement('div');d.className='label';d.textContent=o.name;$('#labels').append(d);labelNodes.set(o.id,d)}}
function updateLabels(){if(!camera)return;const w=$('#viewport').clientWidth,h=$('#viewport').clientHeight;let used=[];for(const o of organs){const d=labelNodes.get(o.id);const active=o.id===selected||comparison3D?.ids.includes(o.id);const allowed=!hiddenOrgans.has(o.id)&&showLabels&&!quiz&&!xrActive&&(active||(!isolated&&['brain','lungR','liver','bladder'].includes(o.id)));const m=organMeshes.get(o.id)?.[0];if(!allowed||!m?.visible||sectionView&&!sectionView.hasVisible(m)){d.hidden=true;continue}const pos=centers.get(o.id).clone();modelRoot.localToWorld(pos);const p=pos.project(camera);let x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h;const left=o.id.endsWith('R')||o.id==='liver'||o.id==='brain';x+=left?-74:74;const clash=used.some(v=>Math.abs(v[1]-y)<30&&Math.abs(v[0]-x)<135);if(clash&&!active){d.hidden=true;continue}d.hidden=p.z>1||p.z<0||x<45||x>w-45||y<145||y>h-140;if(!d.hidden){used.push([x,y]);d.style.left=x+'px';d.style.top=y+'px';d.classList.toggle('active',active)}}}
function resize(){
  if(!renderer||!camera||xrActive||fallbackMode)return;
  const w=$('#viewport').clientWidth,h=$('#viewport').clientHeight;if(!w||!h)return;
  const previousAspect=camera.aspect;refreshCameraFrame();applyGraphicsResolution(w,h);renderer.setSize(w,h);
  const changed=old=>!old||Math.abs(cameraFrameState.width/old.width-1)>.08||Math.abs(cameraFrameState.height/old.height-1)>.08;
  // A layout change may refit an explicitly automatic view, never an active exercise or a saved/manual camera.
  if(!quiz&&!lesson&&!physio){
    if(comparison3D&&comparison3D.fitAutomatic!==false&&previousAspect>0&&(Math.abs(camera.aspect/(comparison3D.fitAspect||previousAspect)-1)>.08||changed(comparison3D.frame)))focusOrgan(true);
    else if(sceneFit&&previousAspect>0&&(Math.abs(camera.aspect/sceneFit.aspect-1)>.08||changed(sceneFit.frame))){
      if(sceneFit.kind==='home')frameAtlasHome();else if(sceneFit.kind==='focus')focusOrgan(true);else fitSceneView();
    }
  }
  scheduleSceneState();publishGraphicsState();
}
function cameraUpdate(dt){if(xrActive)return;if(view.turn){const t=view.turn;t.time=Math.min(1,t.time+dt/0.9);const u=reduced?1:t.time*t.time*(3-2*t.time);view.theta=THREE.MathUtils.lerp(t.from,t.to,u);view.phi=THREE.MathUtils.lerp(t.fromPhi,t.toPhi,u);if(t.time>=1||reduced)view.turn=null;}view.target.lerp(view.toTarget,reduced?1:Math.min(1,dt*9));view.radius=THREE.MathUtils.lerp(view.radius,view.toRadius,reduced?1:Math.min(1,dt*9));if(autoRotate)view.theta+=dt*.15;const s=Math.sin(view.phi);camera.position.set(view.target.x+view.radius*s*Math.sin(view.theta),view.target.y+view.radius*Math.cos(view.phi),view.target.z+view.radius*s*Math.cos(view.theta));camera.lookAt(view.target);const angle=currentAngle(),left=$('.left-marker'),right=$('.right-marker');
  if(left.dataset.angle!==angle){
    left.dataset.angle=angle;const lateral=angle==='front'||angle==='back';left.style.opacity=right.style.opacity=lateral?'.8':'0';
    left.innerHTML=angle==='back'?'Л<small>ЛЕВО</small>':'П<small>ПРАВО</small>';
    right.innerHTML=angle==='back'?'П<small>ПРАВО</small>':'Л<small>ЛЕВО</small>';
  }
  $('#view-name').textContent={front:'ВИД СПЕРЕДИ',right:'ВИД СПРАВА',back:'ВИД СЗАДИ',left:'ВИД СЛЕВА',top:'ВИД СВЕРХУ',bottom:'ВИД СНИЗУ',free:'СВОБОДНЫЙ ОБЗОР'}[angle];
  const control=$('#viewer-angle');if(control&&!view.turn&&control.value!==angle)control.value=angle;
}
function pick(event){if(!loaded||fallbackMode||xrActive||lesson||physio)return;const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);const hits=raycaster.intersectObjects(meshes,false).filter(h=>h.object.visible&&!hiddenOrgans.has(h.object.userData.organId)&&h.object.material.opacity>.3&&(!sectionView||sectionView.allows(h.object,h.point)));if(hits[0]){const id=hits[0].object.userData.organId;if(comparison3D){if(comparison3D.ids.includes(id)){selected=id;renderCard();applyAppearance();}}else select(id)}}
function manualCameraChange(){sceneFit=null;if(comparison3D)comparison3D.fitAutomatic=false;autoRotate=false;}
function panScene(dx,dy,canvas=renderer?.domElement){
  if(!loaded||fallbackMode||xrActive||!camera||!Number.isFinite(dx)||!Number.isFinite(dy))return;
  const height=canvas?.clientHeight||canvas?.getBoundingClientRect?.().height||600;
  const units=2*view.toRadius*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)/height;
  const right=new THREE.Vector3(Math.cos(view.theta),0,-Math.sin(view.theta));
  const up=new THREE.Vector3(-Math.cos(view.phi)*Math.sin(view.theta),Math.sin(view.phi),-Math.cos(view.phi)*Math.cos(view.theta));
  view.toTarget.addScaledVector(right,-dx*units).addScaledVector(up,dy*units);
  view.toTarget.x=THREE.MathUtils.clamp(view.toTarget.x,-5,5);view.toTarget.y=THREE.MathUtils.clamp(view.toTarget.y,-2,5);view.toTarget.z=THREE.MathUtils.clamp(view.toTarget.z,-5,5);
  view.target.copy(view.toTarget);manualCameraChange();
}
function bindOrbit(){
  const c=renderer.domElement,points=new Map();let down=null,dragged=false,pinch=0,panning=false;
  orbitAbort?.abort();orbitAbort=typeof AbortController==='function'?new AbortController():null;
  const on=(el,type,fn,options={})=>el.addEventListener(type,fn,orbitAbort?{...options,signal:orbitAbort.signal}:options);
  const release=e=>{points.delete(e.pointerId);if(c.hasPointerCapture?.(e.pointerId))c.releasePointerCapture(e.pointerId);if(points.size===1){const point=[...points.values()][0];down={...point};dragged=true;panning=false;}else{down=null;panning=false;}pinch=0;scheduleSceneState();};
  on(c,'contextmenu',e=>{if(loaded&&!fallbackMode&&!xrActive)e.preventDefault();});
  on(c,'pointerdown',e=>{
    if(!loaded||fallbackMode||xrActive||![0,2].includes(e.button))return;
    view.turn=null;autoRotate=false;applyAppearance();$('#viewport').focus({preventScroll:true});
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});c.setPointerCapture(e.pointerId);
    if(points.size===1){down={x:e.clientX,y:e.clientY};panning=e.button===2||!!e.shiftKey;dragged=panning;if(panning){view.toTarget.copy(view.target);view.toRadius=view.radius;}}
    else{panning=false;dragged=true;view.toTarget.copy(view.target);view.toRadius=view.radius;const p=[...points.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
    if(e.button===2)e.preventDefault?.();
  });
  on(c,'pointermove',e=>{
    if(!points.has(e.pointerId)||fallbackMode||xrActive)return;
    const old=points.get(e.pointerId);points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(points.size===2){
      const p=[...points.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
      panScene((e.clientX-old.x)/2,(e.clientY-old.y)/2,c);
      if(pinch>0&&distance>0)view.toRadius=THREE.MathUtils.clamp(view.toRadius*pinch/distance,.18,maxViewRadius());
      pinch=distance;dragged=true;
    }else if(points.size===1){
      if(panning){panScene(e.clientX-old.x,e.clientY-old.y,c);dragged=true;}
      else{manualCameraChange();view.theta-=(e.clientX-old.x)*.006;view.phi=THREE.MathUtils.clamp(view.phi-(e.clientY-old.y)*.005,.1,Math.PI-.1);if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)dragged=true;}
    }
    syncZoomControls();
  });
  on(c,'pointerup',e=>{if(!dragged&&points.size===1&&points.has(e.pointerId))pick(e);release(e);});
  on(c,'pointercancel',release);on(c,'lostpointercapture',e=>{points.delete(e.pointerId);down=null;pinch=0;dragged=true;panning=false;scheduleSceneState();});
  on(c,'wheel',e=>{
    if(!loaded||fallbackMode||xrActive)return;e.preventDefault();manualCameraChange();
    const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?Math.max(300,c.clientHeight||600):1);
    view.toRadius=THREE.MathUtils.clamp(view.toRadius*Math.exp(Math.max(-500,Math.min(500,delta))*.001),.18,maxViewRadius());syncZoomControls();scheduleSceneState();
  },{passive:false});
  on($('#viewport'),'keydown',e=>{
    if(!loaded||fallbackMode||xrActive)return;
    view.turn=null;autoRotate=false;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))manualCameraChange();
    if(e.key==='ArrowLeft')view.theta+=.15;
    else if(e.key==='ArrowRight')view.theta-=.15;
    else if(e.key==='ArrowUp')view.phi=Math.max(.1,view.phi-.1);
    else if(e.key==='ArrowDown')view.phi=Math.min(Math.PI-.1,view.phi+.1);
    else if(e.key==='+'||e.key==='='){manualCameraChange();view.toRadius=THREE.MathUtils.clamp(view.toRadius*.85,.18,maxViewRadius());}
    else if(e.key==='-'){manualCameraChange();view.toRadius=THREE.MathUtils.clamp(view.toRadius*1.15,.18,maxViewRadius());}
    else if(e.code==='KeyH'||e.key.toLowerCase()==='h')home();
    else if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){const k=e.code.slice(-1).toLowerCase();keyboardPoint.x=THREE.MathUtils.clamp(keyboardPoint.x+(k==='d'?.025:k==='a'?-.025:0),.03,.97);keyboardPoint.y=THREE.MathUtils.clamp(keyboardPoint.y+(k==='s'?.025:k==='w'?-.025:0),.03,.97);$('#keyboard-cursor').style.left=keyboardPoint.x*100+'%';$('#keyboard-cursor').style.top=keyboardPoint.y*100+'%';}
    else if(e.key==='Enter'){const r=c.getBoundingClientRect();pick({clientX:r.left+keyboardPoint.x*r.width,clientY:r.top+keyboardPoint.y*r.height});}
    else return;
    e.preventDefault();applyAppearance();syncZoomControls();scheduleSceneState();
  });
}

function maxViewRadius(){return Math.min(25,Math.max(3.7,sceneZoomLimit,sceneFit?.radius||0,comparison3D?.fitRadius||0));}
function syncZoomControls(){
  const min=fallbackMode?imageScale<=1:view.toRadius>=maxViewRadius(),max=fallbackMode?imageScale>=3:view.toRadius<=.18;
  const unavailable=(!fallbackMode&&!loaded)||xrActive;
  const minus=$('#zoom-out'),plus=$('#zoom-in');
  if(minus)minus.disabled=unavailable||min;if(plus)plus.disabled=unavailable||max;
}
function setImageTransform(){
  const image=$('#fallback-image');if(!image)return;
  const box=image.getBoundingClientRect(),width=image.clientWidth||box.width/imageScale,height=image.clientHeight||box.height/imageScale;
  imageOffset.x=THREE.MathUtils.clamp(imageOffset.x,-width*(imageScale-1)/2,width*(imageScale-1)/2);
  imageOffset.y=THREE.MathUtils.clamp(imageOffset.y,-height*(imageScale-1)/2,height*(imageScale-1)/2);
  image.style.transform=`translate(${imageOffset.x}px,${imageOffset.y}px) scale(${imageScale})`;
  document.body.classList.toggle('image-zoomed',fallbackMode&&imageScale>1);
  syncZoomControls();
}
function zoomViewer(direction){
  if(xrActive)return;
  if(fallbackMode){imageScale=THREE.MathUtils.clamp(imageScale*(direction>0?1.25:.8),1,3);if(imageScale===1)imageOffset={x:0,y:0};setImageTransform();return;}
  if(!loaded)return;manualCameraChange();view.toRadius=THREE.MathUtils.clamp(view.toRadius*(direction>0?.8:1.25),.18,maxViewRadius());applyAppearance();syncZoomControls();
}
function setViewerAngle(value){
  if(!loaded||fallbackMode||xrActive)return;
  const angles={front:[0,Math.PI/2],right:[-Math.PI/2,Math.PI/2],back:[Math.PI,Math.PI/2],left:[Math.PI/2,Math.PI/2],top:[0,.12],bottom:[0,Math.PI-.12]};
  autoRotate=false;applyAppearance();if(Object.hasOwn(angles,value))turnTo(...angles[value]);else view.turn=null;
  if(Object.hasOwn(angles,value)&&!quiz&&!lesson&&!physio&&(sceneFit||comparison3D?.fitAutomatic)){
    if(sceneFit?.kind==='focus'||comparison3D)focusOrgan(true);else fitSceneView();
  }
  scheduleSceneState();
}
function currentAngle(){
  const theta=((view.theta%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  if(view.phi<=.2)return 'top';if(view.phi>=Math.PI-.2)return 'bottom';
  if(Math.abs(view.phi-Math.PI/2)>.18)return 'free';
  if(theta<.15||theta>Math.PI*2-.15)return 'front';
  if(Math.abs(theta-Math.PI)<.15)return 'back';
  if(Math.abs(theta-Math.PI/2)<.15)return 'left';
  if(Math.abs(theta-Math.PI*1.5)<.15)return 'right';return 'free';
}
function syncViewerControls(){
  const needs3D=!!comparison3D||!!lesson||!!(quiz?.type==='find'&&!quiz.finished),busy=viewerLoad==='loading';
  const three=$('#view-3d'),image=$('#view-image');
  if(three){three.setAttribute('aria-pressed',String(!fallbackMode));three.disabled=busy||xrActive;three.textContent=busy?'3D…':'3D';three.title=busy?'Загрузка 3D':loaded?'Трёхмерная модель':'Загрузить 3D-модель';}
  if(image){image.setAttribute('aria-pressed',String(fallbackMode));image.disabled=needs3D||xrActive;image.title=needs3D?'Завершите 3D-сравнение или пространственное задание, чтобы перейти к изображению':'Статичный вид исходной модели';}
  const angle=$('#viewer-angle');if(angle)angle.disabled=fallbackMode||!loaded||xrActive;
  const titles={front:'Вид спереди / сзади',skeleton:'Скелет','labels-toggle':'Подписи',rotate:'Автовращение','scene-only':document.body.classList.contains('only-scene')?'Вернуть панели':'Скрыть панели'};
  for(const [id,title] of Object.entries(titles)){const el=$('#'+id);if(!el)continue;el.disabled=fallbackMode||!loaded||(id==='skeleton'&&skeletonLoad!=='ready');el.title=el.disabled?(id==='skeleton'&&!fallbackMode?(skeletonLoad==='loading'?'Скелет загружается':'Слой скелета недоступен'):'Доступно в режиме 3D'):title;}
  const homeButton=$('#home');if(homeButton){homeButton.title=fallbackMode?'Сбросить масштаб изображения':comparison3D?'Вернуть пару в кадр (H)':'Общий вид (H)';homeButton.setAttribute('aria-label',homeButton.title);}
  const vr=$('#vr');if(vr)vr.hidden=fallbackMode||!loaded||vrSupported===false;
  const retry=$('#retry-3d');if(retry){retry.disabled=busy;retry.textContent=busy?'Загрузка…':loaded?'Вернуться в 3D':'Попробовать 3D';}
  document.body.classList.toggle('viewer-loading',busy);
  syncZoomControls();syncFullscreenButton();scheduleSceneState();publishGraphicsState();publishSectionState();
  document.querySelectorAll('[data-focus-organ],[data-section-launch]').forEach(button=>{button.disabled=!!sceneBlocked();});
}
function syncFullscreenButton(){
  const b=$('#viewer-fullscreen');if(!b)return;const active=!!document.fullscreenElement||theatreMode;
  b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-label',active?'Выйти из полного экрана':'На весь экран');b.title=active?'Выйти из полного экрана':'На весь экран';
}
function setTheatre(on){theatreMode=on;document.body.classList.toggle('viewer-theatre',on);syncFullscreenButton();resize();if(on)$('.workspace')?.scrollIntoView({block:'start',behavior:'instant'});}
async function toggleFullscreen(){
  if(document.fullscreenElement){try{await document.exitFullscreen?.();}catch{toast('Нажмите Esc, чтобы выйти из полного экрана.');}return;}
  if(theatreMode){setTheatre(false);return;}
  if(typeof document.documentElement?.requestFullscreen==='function'){
    try{await document.documentElement.requestFullscreen();syncFullscreenButton();resize();return;}catch{}
  }
  setTheatre(true);toast('Развёрнуто в окне. Повторное нажатие или Esc — выйти.');
}
function bindViewerControls(){
  $('#view-3d')?.addEventListener('click',()=>setViewerMode('3d'));
  $('#view-image')?.addEventListener('click',()=>setViewerMode('image'));
  $('#zoom-in')?.addEventListener('click',()=>zoomViewer(1));$('#zoom-out')?.addEventListener('click',()=>zoomViewer(-1));
  $('#viewer-angle')?.addEventListener('change',e=>setViewerAngle(e.target.value));
  $('#viewer-fullscreen')?.addEventListener('click',toggleFullscreen);
  document.addEventListener('fullscreenchange',()=>{document.body.classList.toggle('viewer-native-fullscreen',!!document.fullscreenElement);syncFullscreenButton();resize();if(fallbackMode)setImageTransform();});
  globalThis.addEventListener?.('resize',()=>{resize();if(fallbackMode)setImageTransform();});
  document.addEventListener('anatomia:scene-layout',()=>resize());
  document.querySelectorAll('[data-focus-organ]').forEach(button=>button.addEventListener('click',()=>focusStudyOrgan(button.dataset.focusOrgan)));
  document.querySelectorAll('[data-section-launch]').forEach(button=>button.addEventListener('click',()=>openOrganSection()));
  const image=$('#fallback-image');if(!image)return;image.setAttribute('tabindex','0');image.setAttribute('draggable','false');image.title='Клавиши + / − — масштаб, стрелки — перемещение увеличенного изображения, H — сброс';
  let drag=null;
  image.addEventListener('pointerdown',e=>{if(!fallbackMode||imageScale<=1||e.button>0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,offset:{...imageOffset}};image.setPointerCapture(e.pointerId);e.preventDefault();});
  image.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;imageOffset={x:drag.offset.x+e.clientX-drag.x,y:drag.offset.y+e.clientY-drag.y};setImageTransform();});
  const release=e=>{if(drag?.id===e.pointerId)drag=null;if(image.hasPointerCapture?.(e.pointerId))image.releasePointerCapture(e.pointerId);};
  image.addEventListener('pointerup',release);image.addEventListener('pointercancel',release);image.addEventListener('lostpointercapture',()=>{drag=null;});
  image.addEventListener('keydown',e=>{if(!fallbackMode)return;const key=e.key;if(key==='+'||key==='=')zoomViewer(1);else if(key==='-')zoomViewer(-1);else if(key==='0'||key.toLowerCase()==='h'){imageScale=1;imageOffset={x:0,y:0};setImageTransform();}else if(imageScale>1&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)){imageOffset.x+=key==='ArrowLeft'?24:key==='ArrowRight'?-24:0;imageOffset.y+=key==='ArrowUp'?24:key==='ArrowDown'?-24:0;setImageTransform();}else return;e.preventDefault();});
}

function panelText(text,x,y,maxWidth,lineHeight,maxLines=8){const words=text.split(' ');let line='',count=0;for(const word of words){const n=line+word+' ';if(xrCtx.measureText(n).width>maxWidth&&line){xrCtx.fillText(line,x,y);y+=lineHeight;line=word+' ';if(++count>=maxLines)return y;}else line=n}xrCtx.fillText(line,x,y);return y+lineHeight}
function updateXRPanel(){if(!xrCtx)return;const o=byId(selected);xrCtx.fillStyle='#142931';xrCtx.fillRect(0,0,1024,1024);xrCtx.strokeStyle='#55786d';xrCtx.lineWidth=3;xrCtx.strokeRect(3,3,1018,1018);xrCtx.fillStyle='#a9dccb';xrCtx.font='24px Arial';xrCtx.fillText('ANATOMIA  /  VR',54,62);xrCtx.fillStyle='#e7ece9';xrCtx.font='bold 48px Arial';let title=quiz?(quiz.finished?'Практикум завершён':quiz.type==='find'?`Найдите: ${current().name}`:'Практикум'):o.name;let y=panelText(title,54,138,910,56,3);xrCtx.font='italic 30px Georgia';xrCtx.fillStyle='#e9ba9d';if(!quiz)xrCtx.fillText(o.latin,54,y+8);xrCtx.font='30px Arial';xrCtx.fillStyle='#c2d3d5';let text=quiz?(quiz.finished?`Результат: ${quiz.score} из ${quiz.items.length}. Нажмите «Атлас», чтобы продолжить.`:quiz.answered?`${quiz.correct?'Верно.':'Пока неверно.'} ${current().name ? briefs[current().id] : current().explain} Нажмите «Далее».`:`Задание ${quiz.index+1} из ${quiz.items.length}. Укажите на орган лучом и нажмите триггер.`):briefs[o.id];panelText(text,54,y+70,910,45,Math.max(2,Math.floor((650-y-70)/45)));xrCtx.font='25px Arial';xrCtx.fillStyle='#89a8ae';xrCtx.fillText('Триггер — выбрать · Стик — вращать',54,695);const labels=quiz?(quiz.finished?['Атлас','Заново','Выход']:quiz.answered?['Ответ','Далее','Выход']:['Атлас','Общий вид','Выход']):['← Орган','Изоляция','Орган →'];const bottom=quiz?['Атлас','Заново','Выход']:['Общий вид','Практикум','Выход'];[labels,bottom].forEach((row,j)=>row.forEach((label,i)=>{const x=30+i*330,y=744+j*122;xrCtx.fillStyle=xrHover===j*3+i?'#416b59':'#29453e';xrCtx.fillRect(x,y,304,92);xrCtx.fillStyle='#d6efe4';xrCtx.font='28px Arial';xrCtx.textAlign='center';xrCtx.fillText(label,x+152,y+56);xrCtx.textAlign='left'}));xrTexture.needsUpdate=true}
function makeXR(){xrCanvas=document.createElement('canvas');xrCanvas.width=xrCanvas.height=1024;xrCtx=xrCanvas.getContext('2d');xrTexture=new THREE.CanvasTexture(xrCanvas);xrTexture.colorSpace=THREE.SRGBColorSpace;xrPanel=new THREE.Mesh(new THREE.PlaneGeometry(.62,.62),new THREE.MeshBasicMaterial({map:xrTexture,side:THREE.DoubleSide}));xrPanel.position.set(.66,1.33,-1.05);xrPanel.rotation.y=-.35;xrPanel.visible=false;scene.add(xrPanel);updateXRPanel();for(let i=0;i<2;i++){const controller=renderer.xr.getController(i);controller.userData.index=i;const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xa9dccb}));line.scale.z=3;controller.add(line);controller.userData.rayLine=line;const dot=new THREE.Mesh(new THREE.SphereGeometry(.004,10,8),new THREE.MeshBasicMaterial({color:0xc9f4df}));dot.visible=false;scene.add(dot);controller.userData.dot=dot;controller.addEventListener('selectstart',()=>xrSelect(controller));scene.add(controller);controllers.push(controller)}renderer.xr.addEventListener('sessionstart',()=>{desktopState={position:camera.position.clone(),quaternion:camera.quaternion.clone()};clearSceneEdits();xrActive=true;autoRotate=false;renderCard();$('#system').value='all';isolated=false;renderList();applyAppearance();camera.clearViewOffset();camera.position.set(0,0,0);camera.quaternion.identity();modelRoot.rotation.set(0,0,0);modelRoot.scale.setScalar(1);modelRoot.position.set(0,0,-1.45);xrPanel.visible=true;$('#labels').hidden=true;syncViewerControls();updateXRPanel()});renderer.xr.addEventListener('sessionend',()=>{xrActive=false;xrInspectCenter=null;modelRoot.position.set(0,0,0);modelRoot.scale.setScalar(1);modelRoot.rotation.set(0,0,0);xrPanel.visible=false;$('#labels').hidden=false;controllers.forEach(c=>{c.userData.dot.visible=false});if(desktopState){camera.position.copy(desktopState.position);camera.quaternion.copy(desktopState.quaternion)}resize();home();syncViewerControls()})}
function xrSelect(controller){const temp=new THREE.Matrix4().extractRotation(controller.matrixWorld);raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyMatrix4(temp);const panel=raycaster.intersectObject(xrPanel)[0];const hits=raycaster.intersectObjects(meshes,false).filter(h=>h.object.visible&&!hiddenOrgans.has(h.object.userData.organId)&&h.object.material.opacity>.3);if(panel&&(!hits[0]||panel.distance<hits[0].distance)){const x=panel.uv.x*1024,y=(1-panel.uv.y)*1024;if(y>=744&&y<958){const col=Math.floor((x-30)/330),row=y<836?0:y>=866?1:-1;if(col>=0&&col<3&&row>=0&&x>=30+col*330&&x<=334+col*330)xrAction(row,col)}return}if(hits[0]){const id=hits[0].object.userData.organId;if(comparison3D){if(comparison3D.ids.includes(id)){selected=id;renderCard();applyAppearance();}}else select(id)}}
function xrAction(row,col){if(quiz){if(col===2){renderer.xr.getSession()?.end();return}if(col===0){if(row===0&&quiz.answered&&!quiz.finished)inspectAnswer();else{clearStudyModes();exitQuiz()};return}if(row===1||quiz.finished){startQuiz('find');return}if(quiz.answered)nextQuestion();else home();return}if(row===1){if(col===0)home();if(col===1)startQuiz('find');if(col===2)renderer.xr.getSession()?.end()}else if(col===1){isolated=!isolated;if(isolated)xrFocusOrgan();else home();applyAppearance();renderCard()}else{const index=organs.findIndex(o=>o.id===selected);select(organs[(index+(col===0?-1:1)+organs.length)%organs.length].id)}updateXRPanel()}
async function enterVR(){let session;if(!loaded||fallbackMode){showModal('<div class="modal-eyebrow">РЕЖИМ VR</div><h2>Для VR нужна работающая 3D-сцена.</h2><p>В этом режиме доступны карточки, вопросы и расчёт МОК. Для пространственного просмотра откройте эту же ссылку в браузере с WebGL 2, а для VR — в совместимом шлеме с WebXR.</p>');return}try{if(!navigator.xr||!await navigator.xr.isSessionSupported('immersive-vr')){showModal('<div class="modal-eyebrow">РЕЖИМ VR</div><h2>Откройте атлас в шлеме.</h2><p>Этот браузер не сообщает о поддержке immersive WebXR. Откройте эту же HTTPS‑ссылку в совместимом браузере VR‑шлема, например Meta Quest Browser.</p><p>На компьютере и телефоне доступен весь 3D‑атлас и практикум. Поддержка VR зависит от устройства, браузера и разрешений.</p>');return}if(lesson||physio||comparison3D)exitStudy();hiddenOrgans.clear();applyAppearance();if(quiz&&quiz.type!=='find')exitQuiz();session=await navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor']});await renderer.xr.setSession(session)}catch(err){if(session)await session.end().catch(()=>{});toast('Не удалось войти в VR. Проверьте подключение шлема и разрешение браузера.');console.error('WebXR session:',err)}}
async function loadGLB(url,onProgress){const loader=new GLTFLoader();return loader.loadAsync(new URL(url,rootURL).href,onProgress)}
function disposeObject(object){
  const geometries=new Set(),materials=new Set();
  object?.traverse?.(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[])materials.add(material);});
  for(const geometry of geometries)geometry.dispose?.();for(const material of materials)material.dispose?.();
}
function disposeViewer(){
  clearTimeout(loadingTimer);orbitAbort?.abort();orbitAbort=null;viewerResizeObserver?.disconnect();viewerResizeObserver=null;
  try{renderer?.setAnimationLoop?.(null);}catch{}
  sectionView?.dispose();sectionView=null;sectionInfo=null;disposeObject(scene);xrTexture?.dispose?.();renderer?.dispose?.();renderer?.domElement?.remove?.();
  meshes.length=0;organMeshes.clear();centers.clear();labelNodes.clear();controllers.length=0;xrButtons.length=0;
  $('#labels').innerHTML='';scene=renderer=camera=modelRoot=anatomy=skeleton=raycaster=null;
  xrPanel=xrCanvas=xrCtx=xrTexture=xrInspectCenter=null;xrHover=-1;xrActive=false;loaded=false;skeletonLoad='idle';
  graphicsResolution=null;graphicsMaxSize=8192;cameraFrameState=null;publishGraphicsState();publishSectionState();
}
function applyInitialScene(){
  if(initialSceneApplied)return;initialSceneApplied=true;
  const requested=q.get('organ');if(byId(requested)){selected=requested;isolated=true;notifyLearning('visit',{id:selected});}
}
function runInitialDemo(){if(initialDemoHandled)return;initialDemoHandled=true;if(q.get('demo')==='1')startDemo();}
function renderFrame(time){
  if(fallbackMode||!loaded||!renderer||anatomyLabOpen||document.hidden&&!xrActive)return;
  const dt=Math.min(.05,(time-prevTime)/1000||.016);prevTime=time;cameraUpdate(dt);
  if(xrActive){const session=renderer.xr.getSession();for(const input of session?.inputSources||[]){const axes=input.gamepad?.axes;if(axes?.length>=4&&Math.abs(axes[2])>.15)modelRoot.rotation.y-=axes[2]*dt*.8;}
    if(isolated&&xrInspectCenter){const offset=xrInspectCenter.clone().multiplyScalar(modelRoot.scale.x).applyEuler(modelRoot.rotation);modelRoot.position.copy(new THREE.Vector3(0,1.4,-.8).sub(offset));}
    if(time-lastHover>80){updateXRHover();lastHover=time;}
  }
  if(physio&&!reduced){const beat=Math.pow(Math.max(0,Math.sin(time/1000*physio.hr/60*Math.PI*2)),8);(organMeshes.get('heart')||[]).forEach(m=>m.material.emissiveIntensity=.13+beat*.3);}
  updateLabels();renderer.render(scene,camera);
}
async function refreshVRAvailability(epoch){
  try{const supported=typeof navigator!=='undefined'&&!!navigator.xr&&await navigator.xr.isSessionSupported('immersive-vr');if(epoch!==viewerEpoch)return;vrSupported=!!supported;}
  catch{if(epoch!==viewerEpoch)return;vrSupported=false;}
  syncViewerControls();
}
function resume3DView(){
  if(!loaded||!renderer)return false;
  fallbackMode=false;viewerImagePreference=false;document.body.classList.remove('fallback-mode','image-choice','image-zoomed');
  $('#viewport').hidden=false;renderer.domElement.hidden=false;$('#fallback-view').hidden=true;$('#fallback-status').hidden=true;$('#loading').hidden=true;$('#labels').hidden=false;
  $('#viewport').setAttribute('aria-label','3D модель. Перетаскивание — вращение. Shift или правая кнопка с перетаскиванием, два пальца — перемещение. Щипок и плюс или минус — масштаб. Стрелки — вращение, H — общий вид. WASD — прицел, Enter — выбор.');
  resize();applyAppearance();renderCard();syncStagePrompt();syncViewerControls();prevTime=0;
  if(initialPresentationPending&&!initialPresentationFramed){if(isolated&&!quiz&&!physio)focusOrgan();else frameAtlasHome();}
  if(initialPresentationFramed)initialPresentationPending=false;
  if(!anatomyLabOpen)renderer.setAnimationLoop?.(renderFrame);return true;
}
async function setViewerMode(mode){
  if(xrActive)return;
  if(mode==='image'){
    if(comparison3D||lesson||quiz?.type==='find'&&!quiz.finished){toast(comparison3D?'Завершите 3D-сравнение, чтобы перейти к изображению.':'Изображение доступно после завершения пространственного задания.');return;}
    viewerImagePreference=true;showImageView('Статичный вид исходной модели',false);return;
  }
  if(mode!=='3d'||viewerLoad==='loading')return;
  viewerImagePreference=false;if(loaded){resume3DView();return;}
  await init({force3D:true});
}
async function init({force3D=false}={}){
  if(viewerLoad==='loading')return;
  applyInitialScene();
  if(q.get('mode')==='cards'&&!force3D){viewerImagePreference=true;showImageView('Выбран режим изображения',false);runInitialDemo();return;}
  const epoch=++viewerEpoch;viewerLoad='loading';viewerImagePreference=false;disposeViewer();
  $('#loading').hidden=false;$('#load-status').textContent='Загружаем анатомию…';syncViewerControls();
  loadingTimer=setTimeout(()=>{if(epoch===viewerEpoch&&viewerLoad==='loading')activateFallback('3D не успел загрузиться');},15000);
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,stencil:true,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=studioLightProfile.exposure;
    try{const gl=renderer.getContext?.();graphicsMaxSize=Math.min(renderer.capabilities?.maxTextureSize||8192,gl?.getParameter(gl.MAX_RENDERBUFFER_SIZE)||8192);}catch{graphicsMaxSize=4096;}
    renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');$('#viewport').append(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(epoch===viewerEpoch)activateFallback('Связь с графическим модулем прервалась');});
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(35,1,.01,30);raycaster=new THREE.Raycaster();modelRoot=new THREE.Group();scene.add(modelRoot);
    createStudioLights();
    bindOrbit();createLabels();makeXR();viewerResizeObserver=new ResizeObserver(()=>{resize();if(fallbackMode)setImageTransform();});viewerResizeObserver.observe($('#viewport'));
    if(!fallbackMode){resize();cameraUpdate(1);}
    const gltf=await loadGLB('./models/atlas.glb',event=>{
      if(epoch!==viewerEpoch||viewerLoad!=='loading')return;
      const measured=event.lengthComputable&&event.total>0,percent=measured?Math.min(100,Math.round(event.loaded/event.total*100)):null;
      $('#load-status').textContent=percent===100?'Подготавливаем 3D-модель…':percent!==null?`Загружаем 3D-модель · ${percent}%`:'Загружаем исходную 3D-модель…';
    });
    if(epoch!==viewerEpoch){disposeObject(gltf.scene);return;}
    anatomy=gltf.scene;modelRoot.add(anatomy);anatomy.updateMatrixWorld(true);
    const materials=new Map(),sourceMaterials=new Set();
    anatomy.traverse(m=>{if(!m.isMesh)return;let node=m,id;while(node&&!id){id=node.userData?.organId;node=node.parent;}if(!id||!byId(id))return;m.userData.organId=id;for(const material of Array.isArray(m.material)?m.material:[m.material])if(material)sourceMaterials.add(material);if(!materials.has(id))materials.set(id,createOrganMaterial(id));m.material=materials.get(id);meshes.push(m);if(!organMeshes.has(id))organMeshes.set(id,[]);organMeshes.get(id).push(m);});
    anatomy.traverse(m=>{for(const material of Array.isArray(m.material)?m.material:m.material?[m.material]:[])sourceMaterials.delete(material);});sourceMaterials.forEach(material=>material.dispose?.());
    for(const organ of organs){const list=organMeshes.get(organ.id);if(!list?.length)throw Error('В модели отсутствует '+organ.id);const box=new THREE.Box3();list.forEach(m=>box.expandByObject(m));centers.set(organ.id,box.getCenter(new THREE.Vector3()));}
    loaded=true;viewerLoad='ready';skeletonLoad='loading';initialPresentationPending=!initialPresentationFramed;clearTimeout(loadingTimer);$('#loading').hidden=true;
    if(viewerImagePreference)showImageView('Статичный вид исходной модели',false);
    else resume3DView();
    renderList();runInitialDemo();refreshVRAvailability(epoch);
    loadGLB('./models/skeleton-context.glb').then(g=>{
      if(epoch!==viewerEpoch){disposeObject(g.scene);return;}
      skeleton=g.scene;const boneMaterial=new THREE.MeshStandardMaterial({color:0xa9c1c7,roughness:.84,metalness:0,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
      const boneSources=new Set();skeleton.traverse(m=>{if(m.isMesh){for(const material of Array.isArray(m.material)?m.material:[m.material])if(material)boneSources.add(material);m.material=boneMaterial;m.renderOrder=-1;}});boneSources.forEach(material=>material.dispose?.());
      modelRoot.add(skeleton);skeletonLoad='ready';applyAppearance();syncViewerControls();
    }).catch(error=>{if(epoch!==viewerEpoch)return;skeletonLoad='unavailable';showSkeleton=false;syncViewerControls();console.warn('Skeleton unavailable:',error);});
  }catch(error){if(epoch!==viewerEpoch)return;console.warn('Atlas unavailable; educational fallback active:',error);activateFallback('Не удалось загрузить 3D-сцену');}
}

$('#search').oninput=renderList;$('#system').onchange=()=>applySystem($('#system').value);$('#home').onclick=()=>{if(fallbackMode){imageScale=1;imageOffset={x:0,y:0};setImageTransform();return;}if(lesson||physio)exitStudy();else home();syncStagePrompt();updateXRPanel()};$('#front').onclick=()=>setViewerAngle(Math.abs(Math.cos(view.theta))>.8&&Math.cos(view.theta)>0?'back':'front');$('#skeleton').onclick=()=>{showSkeleton=!showSkeleton;applyAppearance()};$('#labels-toggle').onclick=()=>{showLabels=!showLabels;applyAppearance()};$('#rotate').onclick=()=>{if(reduced){toast('Автовращение отключено: в системе выбрано уменьшение движения.');return}autoRotate=!autoRotate;applyAppearance()};$('#vr').onclick=enterVR;$('#close-modal').onclick=()=>$('#modal').close();$('#modal').addEventListener('close',()=>setNav(quiz||lesson||physio?'practice':'atlas'));$('#mobile-about').onclick=about;document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(b.dataset.tab==='practice')practice();else if(b.dataset.tab==='sources')about();else{clearStudyModes();exitQuiz()}});document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));document.querySelectorAll('[data-system]').forEach(b=>b.onclick=()=>{$('#search').value='';applySystem(b.dataset.system)});$('#catalog-toggle').onclick=()=>toggleCatalog($('#catalog').hidden);$('#catalog-close').onclick=()=>toggleCatalog(false);$('#scene-only').onclick=()=>setSceneOnly($('#scene-only').getAttribute('aria-pressed')!=='true');document.addEventListener('keydown',e=>{if(e.key==='Escape'){toggleCatalog(false);setSceneOnly(false);if(theatreMode)setTheatre(false)}});$('#demo-start').onclick=startDemo;$('#demo-prev').onclick=()=>showDemoStep(demoStep-1);$('#demo-next').onclick=()=>demoStep===demoSteps.length-1?stopDemo():showDemoStep(demoStep+1);$('#demo-exit').onclick=stopDemo;$('#reset').onclick=resetExperience;$('#continue-flat').onclick=()=>setViewerMode('image');$('#retry-3d').onclick=()=>setViewerMode('3d');bindViewerControls();renderList();renderCard();init();

function physiology(){
  if(quiz)exitQuiz();clearStudyModes();select('heart');
  physio={hr:75,sv:70};isolated=true;contextMode=false;autoRotate=false;toggleCatalog(false);setSceneOnly(false);$('#modal').close();
  document.body.classList.add('in-physio');setNav('practice');applyAppearance();focusOrgan();renderPhysio();syncStagePrompt();$('#detail').focus({preventScroll:true});
}

function xrFocusOrgan(){if(!xrActive)return;modelRoot.rotation.set(0,0,0);modelRoot.scale.setScalar(1);modelRoot.position.set(0,0,0);modelRoot.updateMatrixWorld(true);const box=new THREE.Box3();focusedIds().flatMap(id=>organMeshes.get(id)||[]).forEach(m=>box.expandByObject(m));const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());const factor=THREE.MathUtils.clamp(.4/Math.max(size.x,size.y,size.z),1,5);xrInspectCenter=center.clone();modelRoot.scale.setScalar(factor);modelRoot.position.copy(new THREE.Vector3(0,1.4,-.8).sub(center.multiplyScalar(factor)));}

function updateXRHover(){let button=-1;for(const controller of controllers){if(!controller.visible){controller.userData.dot.visible=false;continue}const temp=new THREE.Matrix4().extractRotation(controller.matrixWorld);raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);raycaster.ray.direction.set(0,0,-1).applyMatrix4(temp);const objects=[...meshes.filter(m=>m.visible&&!hiddenOrgans.has(m.userData.organId)&&m.material.opacity>.3),xrPanel];const hit=raycaster.intersectObjects(objects,false)[0];const dot=controller.userData.dot;dot.visible=!!hit;controller.userData.rayLine.scale.z=hit?hit.distance:2;if(hit){dot.position.copy(hit.point);if(hit.object===xrPanel){const x=hit.uv.x*1024,y=(1-hit.uv.y)*1024;const col=Math.floor((x-30)/330),row=y>=744&&y<=836?0:y>=866&&y<=958?1:-1;if(col>=0&&col<3&&row>=0&&x<=334+col*330)button=row*3+col}}}if(button!==xrHover){xrHover=button;updateXRPanel()}}

// Scene tools expose only visual state. No scores, student records or geometry edits.
function sceneBlocked(){
  if(xrActive)return 'vr';
  if(anatomyLabOpen)return 'lab';
  if(quiz||lesson||physio)return 'practice';
  if(viewerLoad==='loading')return 'loading';
  if(viewerLoad==='unavailable'||!loaded||!renderer)return 'unavailable';
  if(fallbackMode)return 'image';
  return null;
}
function sceneReason(blocked=sceneBlocked()){
  return {lab:'Закройте 3D-лабораторию, чтобы вернуться к настройке атласа.',vr:'Настройка сцены доступна после выхода из VR.',practice:'Завершите текущее задание, чтобы настроить сцену.',loading:'3D-модель загружается. Настройки станут доступны после загрузки.',image:'Переключитесь в 3D, чтобы менять состав сцены.',unavailable:'Для настройки сцены нужен работающий 3D-просмотр.'}[blocked]||'';
}
function visibleSceneIds(){
  const filter=$('#system').value,focus=focusedIds();
  return organs.filter(o=>!hiddenOrgans.has(o.id)&&(!isolated||focus.includes(o.id))&&(!!quiz||!!lesson||filter==='all'||o.system===filter)).map(o=>o.id);
}
function sceneSnapshot(){
  if(sceneBlocked())return null;
  return normalizeScene({v:1,section:getSectionSnapshot(),selected,hidden:[...hiddenOrgans],system:$('#system').value,isolated,context:contextMode,pair:comparison3D?[...comparison3D.ids]:null,skeleton:showSkeleton,labels:showLabels,contextOpacity,camera:{theta:view.turn?.to??view.theta,phi:view.turn?.toPhi??view.phi,radius:view.toRadius,target:view.toTarget.toArray()}});
}
function publishSceneState(){
  const blocked=sceneBlocked();
  notifyLearning('scene-state',{available:!blocked,blocked,activity:['practice','vr','lab'].includes(blocked),busy:['practice','vr','lab','loading'].includes(blocked),reason:sceneReason(blocked),selected,visible:visibleSceneIds(),hidden:[...hiddenOrgans],isolated,pair:comparison3D?[...comparison3D.ids]:null,context:contextMode,contextOpacity,skeleton:showSkeleton,labels:showLabels,snapshot:sceneSnapshot()});
}
function scheduleSceneState(){
  if(sceneStateQueued)return;
  if(typeof queueMicrotask!=='function'){publishSceneState();return;}
  sceneStateQueued=true;queueMicrotask(()=>{sceneStateQueued=false;publishSceneState();});
}
function fitSceneView(){
  if(!loaded||fallbackMode||xrActive)return false;
  const ids=visibleSceneIds(),box=new THREE.Box3();
  ids.flatMap(id=>organMeshes.get(id)||[]).forEach(mesh=>box.expandByObject(mesh));
  if(!ids.length||box.isEmpty())return false;
  const radius=radiusForSceneBox(box),aspect=camera?.aspect||1;
  view.toTarget.copy(box.getCenter(new THREE.Vector3()));view.toRadius=radius;autoRotate=false;
  sceneFit={ids:[...ids],aspect,radius,frame:{...cameraFrameState}};sceneZoomLimit=Math.max(3.7,radius);
  if(comparison3D){comparison3D.fitRadius=radius;comparison3D.fitAspect=aspect;comparison3D.fitAutomatic=true;comparison3D.frame={...cameraFrameState};}
  syncZoomControls();scheduleSceneState();return true;
}
function setSceneComposition(ids){
  const chosen=new Set(ids);if(!chosen.size)return false;
  stopDemo();clearSceneEdits();isolated=false;contextMode=false;autoRotate=false;sceneZoomLimit=Math.max(3.7,view.toRadius);
  $('#system').value='all';$('#search').value='';
  for(const o of organs)if(!chosen.has(o.id))hiddenOrgans.add(o.id);
  if(!chosen.has(selected))selected=organs.find(o=>chosen.has(o.id)).id;
  setNav('atlas');applyAppearance();renderList();renderCard();syncStagePrompt();updateXRPanel();return true;
}
function restoreSceneSnapshot(input){
  const next=normalizeScene(input);if(!next||sceneBlocked())return false;
  stopDemo();clearStudyModes();reviewedQuiz=null;autoRotate=false;
  selected=next.selected;$('#system').value=next.system;$('#search').value='';
  for(const id of next.hidden)hiddenOrgans.add(id);
  isolated=next.isolated;contextMode=next.context;contextOpacity=next.contextOpacity;showSkeleton=next.skeleton;showLabels=next.labels;restoreSectionSnapshot(next.section);
  comparison3D=next.pair?{ids:[...next.pair],fitRadius:Math.max(3.7,next.camera.radius),fitAspect:camera?.aspect||1,fitAutomatic:false}:null;
  document.body.classList.toggle('in-comparison3d',!!comparison3D);
  view.turn=null;view.theta=next.camera.theta;view.phi=next.camera.phi;view.radius=view.toRadius=next.camera.radius;
  view.target.fromArray(next.camera.target);view.toTarget.copy(view.target);sceneFit=null;sceneZoomLimit=Math.max(3.7,next.camera.radius);
  setNav('atlas');setSceneOnly(false);toggleCatalog(false);applyAppearance();renderList();renderCard();syncStagePrompt();cameraUpdate(0);updateXRPanel();return true;
}
function handleSceneCommand(detail){
  if(!detail||typeof detail!=='object')return;
  const action=detail.action,requestId=typeof detail.requestId==='string'?detail.requestId.slice(0,120):undefined;
  const done=(ok,message='')=>{publishSceneState();notifyLearning('scene-result',{action,requestId,ok,message});};
  if(action==='request'){publishSceneState();return;}
  if(!['select','visibility','preset','fit','view','context','context-opacity','apply'].includes(action)){done(false,'Эта команда сцены не поддерживается.');return;}
  if(sceneBlocked()){done(false,sceneReason());return;}
  if(action==='select'){
    if(!byId(detail.id)){done(false,'Выберите известную структуру.');return;}
    if(comparison3D?.ids.includes(detail.id)){
      selected=detail.id;notifyLearning('visit',{id:selected});applyAppearance();renderList();renderCard();focusOrgan(true);updateXRPanel();
    }else{
      const visible=visibleSceneIds();
      if(!visible.includes(detail.id))setSceneComposition([...visible,detail.id]);
      select(detail.id,true);
    }
    focusScene();done(true);return;
  }
  if(action==='visibility'){
    if(!byId(detail.id)||typeof detail.visible!=='boolean'){done(false,'Выберите известную структуру.');return;}
    const ids=new Set(visibleSceneIds());detail.visible?ids.add(detail.id):ids.delete(detail.id);
    if(!ids.size){done(false,'Оставьте хотя бы одну структуру в сцене.');return;}
    setSceneComposition([...ids]);done(true);return;
  }
  if(action==='preset'){
    const preset=scenePresets.find(item=>item.id===detail.id);
    if(!preset){done(false,'Этот набор структур недоступен.');return;}
    setSceneComposition(preset.ids);fitSceneView();done(true);return;
  }
  if(action==='fit'){done(fitSceneView());return;}
  if(action==='view'){
    if(!['front','back','right','left','top','bottom'].includes(detail.value)){done(false,'Выберите один из шести ракурсов.');return;}
    setViewerAngle(detail.value);done(true);return;
  }
  if(action==='context'){
    if(typeof detail.value!=='boolean'){done(false,'Выберите состояние соседних органов.');return;}
    if(!isolated){done(false,'Сначала изолируйте орган или откройте пару в 3D.');return;}
    contextMode=detail.value;applyAppearance();renderCard();done(true);return;
  }
  if(action==='context-opacity'){
    if(!isolated||!contextMode){done(false,'Сначала включите соседние органы.');return;}
    if(typeof detail.value!=='number'||!Number.isFinite(detail.value)||detail.value<.03||detail.value>.3){done(false,'Выберите непрозрачность от 3 до 30%.');return;}
    contextOpacity=detail.value;applyAppearance();done(true);return;
  }
  if(action==='apply'){
    if(!normalizeScene(detail.snapshot)){done(false,'Настройки сцены повреждены или не поддерживаются.');return;}
    done(restoreSceneSnapshot(detail.snapshot),'Сохранённый вид восстановлен.');
  }
}
document.addEventListener('anatomia:scene-command',event=>handleSceneCommand(event.detail));

function focusedIds(){if(comparison3D)return comparison3D.ids;if(lesson)return lesson.steps[lessonStep].ids;return isolated&&quiz?.answered&&!quiz.finished&&quiz.type==='case'&&current().targets?current().targets:[selected]}

function clearSceneEdits(){
  if(comparison3D)isolated=false;
  comparison3D=null;hiddenOrgans.clear();contextOpacity=.075;sceneFit=null;sceneZoomLimit=3.7;document.body.classList.remove('in-comparison3d');
}
function startComparison3D(ids){
  const pair=Array.isArray(ids)?ids:[];
  const valid=pair.length===2&&pair.every(id=>typeof id==='string'&&!!byId(id))&&pair[0]!==pair[1];
  const report=(status,message)=>notifyLearning('comparison3d-state',{status,ids:valid?[...pair]:[],...(message?{message}:{})});
  if(!valid){report('unavailable','Выберите два разных органа для сравнения.');return false;}
  if(!loaded||!renderer||xrActive||pair.some(id=>!organMeshes.get(id)?.length)){
    report('unavailable',xrActive?'Завершите VR-сеанс, чтобы открыть сравнение на экране.':viewerLoad==='loading'?'3D ещё загружается. Пока можно сравнить изображения.':'3D сейчас недоступен. Сравнение по изображениям остаётся доступным.');return false;
  }
  stopDemo();clearStudyModes();if(quiz)exitQuiz();reviewedQuiz=null;
  $('#modal').close();setSceneOnly(false);toggleCatalog(false);setNav('atlas');
  $('#system').value='all';$('#search').value='';
  if(fallbackMode)resume3DView();
  comparison3D={ids:[...pair],fitRadius:3.7};selected=pair[0];isolated=true;contextMode=false;autoRotate=false;
  document.body.classList.add('in-comparison3d');
  for(const id of pair){if(!progress.viewed.includes(id))progress.viewed.push(id);notifyLearning('visit',{id});}save();
  applyAppearance();focusOrgan();renderList();renderCard();syncStagePrompt();updateXRPanel();
  report('ready');return true;
}
function renderComparison3D(){
  if(!comparison3D)return;
  const focusId=document.activeElement?.id,pair=comparison3D.ids.map(byId);
  $('#organ-card').innerHTML=`<div class="card-kicker"><span>СРАВНЕНИЕ В 3D</span><span class="number">2 / 16</span></div><h2>Два органа в 3D</h2><div class="comparison3d-organs">${pair.map(o=>`<button data-comparison-info="${o.id}" style="--organ:${o.color}"><b>${o.name}</b><small>${o.latin}</small><span>О структуре ↗</span></button>`).join('')}</div><p class="comparison3d-note">Общий масштаб и положение исходной модели.</p><button id="comparison-context" class="context-button" aria-pressed="${contextMode}">${icon('layers')}Соседние органы</button><div class="comparison3d-actions"><button id="comparison-focus" class="secondary">Пара в кадре</button><button id="comparison-exit" class="primary">В атлас</button></div>`;
  $('#comparison-context').onclick=()=>{contextMode=!contextMode;applyAppearance();renderCard();$('#comparison-context').focus({preventScroll:true});};
  $('#comparison-focus').onclick=()=>focusOrgan(true);$('#comparison-exit').onclick=exitComparison3D;
  document.querySelectorAll('[data-comparison-info]').forEach(button=>button.onclick=()=>organInfo(button.dataset.comparisonInfo));
  if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
}
function exitComparison3D(){
  if(!comparison3D)return;clearSceneEdits();contextMode=false;setNav('atlas');
  home();renderList();renderCard();syncStagePrompt();updateXRPanel();focusScene();
}
function hideSelectedOrgan(){
  if(!loaded||fallbackMode||xrActive||quiz||lesson||physio||comparison3D)return false;
  if(hiddenOrgans.size>=organs.length-1){toast('Оставлена последняя структура. Верните скрытые органы.');return false;}
  const hidden=byId(selected);if(!hidden)return false;
  hiddenOrgans.add(hidden.id);isolated=false;contextMode=false;autoRotate=false;
  const filter=$('#system');let available=organs.filter(o=>!hiddenOrgans.has(o.id)&&(filter.value==='all'||o.system===filter.value));
  if(!available.length){filter.value='all';available=organs.filter(o=>!hiddenOrgans.has(o.id));}
  selected=available[0].id;home();renderList();renderCard();syncStagePrompt();updateXRPanel();
  toast(`Скрыто: ${hidden.name}. Вернуть скрытые: ${hiddenOrgans.size}.`);return true;
}
function restoreHiddenOrgans(){
  if(!hiddenOrgans.size||quiz||lesson||physio||comparison3D)return;
  hiddenOrgans.clear();$('#system').value='all';home();renderList();renderCard();syncStagePrompt();updateXRPanel();
  $('#hide-organ')?.focus({preventScroll:true});
}

function focusScene(){if(xrActive)return;$('#viewport').focus({preventScroll:true});if(matchMedia('(max-width:820px)').matches)$('.stage').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'})}
function restoreResults(){if(!reviewedQuiz)return;quiz=reviewedQuiz;reviewedQuiz=null;document.body.classList.add('in-practice');setNav('practice');home();renderList();renderQuiz();focusQuestion();updateXRPanel()}

function turnTo(theta,phi){let to=theta;while(to-view.theta>Math.PI)to-=Math.PI*2;while(to-view.theta< -Math.PI)to+=Math.PI*2;view.turn={from:view.theta,to,fromPhi:view.phi,toPhi:phi,time:0}}
function toggleCatalog(open){if(quiz||lesson||physio||comparison3D)open=false;$('#catalog').hidden=!open;document.body.classList.toggle('catalog-open',open);$('#catalog-toggle').setAttribute('aria-expanded',String(open));if(open)$('#search').focus({preventScroll:true});else if(document.activeElement?.closest?.('#catalog'))$('#catalog-toggle').focus({preventScroll:true});resize()}
function setSceneOnly(on){document.body.classList.toggle('only-scene',on);$('#scene-only').setAttribute('aria-pressed',String(on));$('#scene-only').title=on?'Вернуть панели':'Скрыть панели';$('#scene-only').setAttribute('aria-label',$('#scene-only').title);if(on)toggleCatalog(false);resize()}
function cycleOrgan(direction){const filter=$('#system').value;const list=organs.filter(o=>filter==='all'||o.system===filter);const index=list.findIndex(o=>o.id===selected);select(list[(index+direction+list.length)%list.length].id,true)}
function organInfo(id){const o=byId(id);showModal(`<div class="modal-eyebrow">${systemNames[o.system]}</div><h2>${o.name}</h2><div class="summary-latin">${o.latin}</div><div class="fact-block"><h3>Где находится</h3><p>${o.location}</p></div><div class="fact-block"><h3>Что делает</h3><p>${o.function}</p></div><div class="fact-block"><h3>Рассмотрите</h3><p>${o.landmark}</p></div><a class="source-link" href="${sources[o.source]}" target="_blank" rel="noopener">OpenStax · учебный источник ↗</a>`)}
function clearStudyModes(){clearSceneEdits();lesson=null;lessonStep=0;physio=null;contextMode=false;document.body.classList.remove('in-lesson','in-physio');syncStagePrompt()}
function exitStudy(){clearStudyModes();home();setNav('atlas');renderList();syncStagePrompt();updateXRPanel()}
function startLesson(id){const next=lessons.find(l=>l.id===id);if(!next)return;if(!loaded||fallbackMode){toast('Этот маршрут требует 3D. Карточки и самопроверка доступны в разделе «Практика».');return}if(quiz)exitQuiz();clearStudyModes();lesson=next;lessonStep=0;autoRotate=false;$('#system').value='all';$('#search').value='';toggleCatalog(false);setSceneOnly(false);$('#modal').close();document.body.classList.add('in-lesson');setNav('practice');applyLessonStep()}
function applyLessonStep(){if(!lesson)return;const step=lesson.steps[lessonStep];selected=step.selected;isolated=true;contextMode=false;for(const id of step.ids)if(!progress.viewed.includes(id))progress.viewed.push(id);save();applyAppearance();turnTo(step.theta||0,step.phi||1.5);focusOrgan();renderLesson();syncStagePrompt();if(xrActive)xrFocusOrgan();else $('#lesson-heading').focus({preventScroll:true})}
function renderLesson(){if(!lesson)return;const step=lesson.steps[lessonStep],last=lessonStep===lesson.steps.length-1;
  $('#organ-card').innerHTML=`<div class="card-kicker"><span>СМОТРИТЕ И СРАВНИВАЙТЕ</span><span class="number">${lessonStep+1} / ${lesson.steps.length}</span></div><div class="lesson-count">${lesson.steps.map((_,i)=>`<i class="${i<=lessonStep?'active':''}"></i>`).join('')}</div><h2 id="lesson-heading" tabindex="-1">${step.title}</h2><p class="lesson-text">${step.text}</p><div class="lesson-actions"><button class="secondary" id="lesson-prev" aria-label="Предыдущий шаг" ${lessonStep===0?'disabled':''}>←</button><button class="primary" id="lesson-next">${last?'Проверить себя':'Далее'} ${icon(last?'check':'arrow')}</button></div><button class="context-button" id="lesson-context" aria-pressed="${contextMode}">${icon('layers')}Соседние органы</button><button class="text-button lesson-exit" id="lesson-exit">В атлас</button>`;
  $('#lesson-prev').onclick=()=>{if(lessonStep>0){lessonStep--;applyLessonStep()}};
  $('#lesson-next').onclick=()=>{if(last){const ids=[...new Set(lesson.steps.flatMap(s=>s.ids))];progress.lessons=[...new Set([...(progress.lessons||[]),lesson.id])];save();startQuiz('function',ids)}else{lessonStep++;applyLessonStep()}};
  $('#lesson-context').onclick=()=>{contextMode=!contextMode;applyAppearance();renderLesson();$('#lesson-context').focus({preventScroll:true})};$('#lesson-exit').onclick=exitStudy;
}
function renderPhysio(){if(!physio)return;
  $('#organ-card').innerHTML=`<div class="card-kicker"><span>ФИЗИОЛОГИЯ</span><span class="number">МОК</span></div><h2>Сердце в работе</h2><div class="physio-result"><span id="co">5,25</span><small>л/мин</small><span class="physio-heart" aria-hidden="true">${icon('heart')}</span></div><label class="slider-label" for="hr">Частота <b><output id="hr-out">${physio.hr}</output> уд/мин</b></label><input class="physio-range" id="hr" type="range" min="40" max="160" value="${physio.hr}" step="1"><label class="slider-label" for="sv">Объём за удар <b><output id="sv-out">${physio.sv}</output> мл</b></label><input class="physio-range" id="sv" type="range" min="30" max="130" value="${physio.sv}" step="5"><div class="physio-presets"><button data-preset="100,50">100 × 50<small>Чаще · меньше</small></button><button data-preset="50,100">50 × 100<small>Реже · больше</small></button></div><div class="physio-bar"><i id="co-bar"></i></div><p id="co-formula" class="formula" aria-live="polite"></p><div class="card-links"><button class="text-button" id="physio-info">Как это работает?</button><button class="text-button" id="physio-back">В атлас →</button></div><p class="physio-note">Независимые параметры · не модель пациента</p>`;
  const update=()=>{physio.hr=Number($('#hr').value);physio.sv=Number($('#sv').value);updatePhysio()};$('#hr').oninput=$('#sv').oninput=update;
  document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const [hr,sv]=b.dataset.preset.split(',').map(Number);physio.hr=hr;physio.sv=sv;$('#hr').value=hr;$('#sv').value=sv;updatePhysio()});
  $('#physio-back').onclick=exitStudy;$('#physio-info').onclick=()=>showModal(`<div class="modal-eyebrow">ФИЗИОЛОГИЯ</div><h2>Один объём. Два режима.</h2><p>Минутный объём кровообращения — объём крови, выбрасываемый каждым желудочком за минуту.</p><div class="fact-block"><h3>Формула</h3><p>МОК = ЧСС × УО ÷ 1000<br>100 × 50 = 50 × 100 = 5 л/мин</p></div><div class="fact-block"><h3>Что сравниваем</h3><p>Объём за минуту одинаков, но частота и объём одного сокращения различны. Равенство МОК не означает одинаковую нагрузку или одинаковое состояние сердца.</p></div><p>Ползунки независимы. Реальная связь частоты, наполнения и ударного объёма сложнее. Свечение обозначает ритм; оно не воспроизводит механику камер. Число не является диагнозом или индивидуальной нормой.</p><a class="source-link" href="https://openstax.org/books/anatomy-and-physiology-2e/pages/19-4-cardiac-physiology" target="_blank" rel="noopener">OpenStax · Cardiac Physiology ↗</a>`);updatePhysio();
}
function updatePhysio(){if(!physio)return;updateFallback();const {hr,sv}=physio,co=hr*sv/1000;$('#hr-out').value=hr;$('#sv-out').value=sv;$('#co').textContent=co.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2});$('#co-formula').textContent=`${hr} × ${sv} ÷ 1000 = ${co.toLocaleString('ru-RU')} л/мин`;$('#co-bar').style.width=co/20.8*100+'%';$('.physio-heart').style.setProperty('--beat',60/hr+'s')}


// Static views are rendered from the bundled licensed model, never synthetic anatomy.
function updateFallback(){
  if(!fallbackMode)return;
  const id=quiz?quiz.answered?(quiz.type==='case'?current()?.target:current()?.id):'overview':selected;
  const safeId=byId(id)?id:'overview',o=byId(safeId),image=$('#fallback-image');
  const src=`./previews/${safeId}.webp`;if(image.getAttribute('src')!==src){image.hidden=false;image.setAttribute('src',src);imageScale=1;imageOffset={x:0,y:0};setImageTransform();}
  image.alt=o?`${o.name}: статичный вид исходной 3D-модели`:'Статичный обзор исходной анатомической модели';
  $('#fallback-caption').textContent=`${o?o.name:'Общий вид'} · исходный рендер. Без вращения.`;
}
function showImageView(reason,failed){
  fallbackMode=true;autoRotate=false;updateSectionView();clearTimeout(loadingTimer);
  if(viewerLoad==='loading')loadingTimer=setTimeout(()=>{if(viewerLoad==='loading')activateFallback('3D не успел загрузиться');},15000);
  try{renderer?.setAnimationLoop?.(null);if(renderer?.domElement)renderer.domElement.hidden=true;}catch{}
  document.body.classList.add('fallback-mode');document.body.classList.toggle('image-choice',!failed);setSceneOnly(false);
  $('#loading').hidden=true;$('#viewport').hidden=true;$('#labels').hidden=true;$('#fallback-view').hidden=false;$('#fallback-status').hidden=!failed;
  $('#fallback-status span').textContent=failed?`${reason}. Изображения и учебные задания доступны.`:'';
  $('#viewport').setAttribute('aria-label','Статичный режим. Выберите орган в каталоге или перейдите к карточке.');
  renderCard();syncStagePrompt();updateFallback();syncViewerControls();
  $('#fallback-image').onerror=()=>{$('#fallback-image').hidden=true;$('#fallback-caption').textContent='Изображение не загрузилось. Карточка и задания доступны.';};
}
function activateFallback(reason){
  if(fallbackMode&&viewerLoad==='unavailable')return;
  const lostPair=comparison3D?[...comparison3D.ids]:null;
  ++viewerEpoch;viewerLoad='unavailable';loaded=false;viewerImagePreference=true;clearTimeout(loadingTimer);
  if(xrActive){const ending=renderer?.xr?.getSession?.()?.end?.();ending?.catch?.(()=>{});}
  if(lesson||comparison3D)clearStudyModes();hiddenOrgans.clear();if(quiz?.type==='find')exitQuiz();
  showImageView(reason,true);runInitialDemo();
  if(lostPair){notifyLearning('workbench',{mode:'compare',ids:lostPair});notifyLearning('comparison3d-state',{status:'unavailable',ids:lostPair,message:'3D-сцена недоступна. Продолжите сравнение по изображениям.'});}
}

function resetExperience(){
  stopDemo();$('#modal').close();clearStudyModes();reviewedQuiz=null;quiz=null;
  document.body.classList.remove('in-practice','spatial-practice','quiz-finished');
  selected='heart';isolated=false;contextMode=false;autoRotate=false;showLabels=false;showSkeleton=true;sectionEnabled=false;sectionConfig={...defaultSectionConfig};
  $('#search').value='';$('#system').value='all';setSceneOnly(false);toggleCatalog(false);setNav('atlas');home();renderList();renderCard();syncStagePrompt();updateXRPanel();
  $('#catalog-toggle').focus({preventScroll:true});toast('Начальный вид восстановлен. Сохранённый прогресс не удалён.');
}
function startDemo(){showDemoStep(0)}
function handleDemoKey(event){
  if(demoStep<0||event.altKey||event.ctrlKey||event.metaKey||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
  const key=event.key;
  if(!['ArrowLeft','ArrowRight','Home','End','Escape'].includes(key))return;
  event.preventDefault();event.stopPropagation?.();
  if(key==='Escape'){stopDemo();return;}
  if(key==='Home'){showDemoStep(0);return;}
  if(key==='End'){showDemoStep(demoSteps.length-1);return;}
  if(key==='ArrowLeft'){if(demoStep>0)showDemoStep(demoStep-1);return;}
  if(demoStep===demoSteps.length-1)stopDemo();else showDemoStep(demoStep+1);
}
$('#demo-bar').addEventListener('keydown',handleDemoKey);
function showDemoStep(index){
  if(index<0||index>=demoSteps.length)return;
  $('#modal').close();clearStudyModes();exitQuiz();reviewedQuiz=null;$('#search').value='';$('#system').value='all';toggleCatalog(false);setSceneOnly(false);autoRotate=false;
  demoStep=index;document.body.classList.add('demo-active');$('#demo-bar').hidden=false;
  $('#demo-count').textContent=`ПОКАЗ · ${index+1} / ${demoSteps.length}`;
  const progress=$('#demo-progress');if(progress){progress.max=demoSteps.length;progress.value=index+1;progress.setAttribute('aria-label',`Шаг ${index+1} из ${demoSteps.length}: ${demoSteps[index].title}`);}
  $('#demo-bar').setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Home End Escape');
  $('#demo-title').textContent=demoSteps[index].title;$('#demo-hint').textContent=demoSteps[index].hint;
  $('#demo-prev').disabled=index===0;$('#demo-next').textContent=index===demoSteps.length-1?'Завершить':'Далее →';
  if(index===0){select('heart');home()}
  else if(index===1){if(loaded&&!fallbackMode)startLesson('lungs');else{select('lungR');isolated=true;renderCard()}}
  else if(index===2){if(loaded&&!fallbackMode)startLesson('depth');else{select('pancreas');isolated=true;renderCard()}}
  else if(index===3)physiology();
  else startQuiz('function',['lungR','heart']);
  syncStagePrompt();resize();$('#demo-next').focus({preventScroll:true});
}
function stopDemo(){const restore=document.activeElement?.closest?.('#demo-bar');demoStep=-1;$('#demo-bar').hidden=true;document.body.classList.remove('demo-active');resize();if(restore)$('#demo-start').focus({preventScroll:true})}

// The learning centre routes to existing modes, never duplicates their state machines.
document.addEventListener('anatomia:navigate',event=>{
 const {action,id,ids}=event.detail||{};
 if(action==='compare3d'){startComparison3D(ids);return;}
 if(!['organ','quiz','find','case','route','physiology','practice','demo','mistakes'].includes(action))return;
 stopDemo();$('#modal').close();clearStudyModes();if(quiz)exitQuiz();reviewedQuiz=null;setSceneOnly(false);toggleCatalog(false);
 if(action==='organ'&&byId(id)){select(id,true);$('#detail').focus({preventScroll:true});}
 else if(action==='quiz')startQuiz('function');
 else if(action==='find')startQuiz('find');
 else if(action==='case')startQuiz('case');
 else if(action==='route')startLesson(id);
 else if(action==='physiology')physiology();
 else if(action==='practice')practice();
 else if(action==='demo')startDemo();
 else if(action==='mistakes'){
  const attempt=progress.lastAttempt;if(!attempt||!Array.isArray(attempt.answers))return;
  const missed=attempt.answers.filter(h=>h&&h.correct===false&&byId(h.organ));
  const type=attempt.type;if(!['function','case','find'].includes(type))return;
  const items=type==='case'?missed.map(h=>cases.find(c=>c.title===h.item?.title)).filter(Boolean):[...new Set(missed.map(h=>h.organ))];
  if(!items.length)return;if(type==='find'&&fallbackMode){select(items[0],true);$('#detail').focus({preventScroll:true});toast('Ошибка из пространственного поиска. Рассмотрите орган; повтор поиска доступен в 3D.');}else startQuiz(type,items,'review');
 }
});

