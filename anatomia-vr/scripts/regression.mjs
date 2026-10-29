import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three.module.min.js';
import * as data from '../data.js';
import * as experience from '../experience.js';
import * as sceneState from '../scene-state.js';
import * as renderProfile from '../render-profile.js';

// Execute the production state/event functions with small DOM stand-ins.
// These tests do not render WebGL or claim to verify a physical VR headset.
const sourceURL = new URL('../app.js', import.meta.url);
const original = fs.readFileSync(sourceURL, 'utf8');
assert.ok(original.includes('renderList();renderCard();init();'), 'Application bootstrap marker changed; update the harness');
const executable = original
  .replace(/^import .*$/gm, '')
  .replaceAll('import.meta.url', JSON.stringify(sourceURL.href))
  .replace('renderList();renderCard();init();', 'renderList();renderCard();');

function harness() {
  const elements = new Map();
  const document = {activeElement: null, events: []};
  const documentListeners = new Map();
  function node(selector) {
    if (!elements.has(selector)) {
      const listeners = new Map();
      const attributes = new Map();
      const classes = new Set();
      elements.set(selector, {
        id: selector.startsWith('#') ? selector.slice(1) : '',
        value: selector === '#system' ? 'all' : '',
        hidden: false, innerHTML: '', textContent: '', style: {setProperty(name,value){this[name]=value}}, dataset: {},
        classList: {add(...v) {v.forEach(x=>classes.add(x))}, remove(...v) {v.forEach(x=>classes.delete(x))}, toggle(v,on) {on ??= !classes.has(v); if(on)classes.add(v);else classes.delete(v);return on},contains(v){return classes.has(v)}},
        querySelectorAll() { return []; },
        setAttribute(name, value) { attributes.set(name, value); },
        getAttribute(name) { return attributes.get(name); },
        addEventListener(name, callback) { listeners.set(name, callback); },
        dispatch(name, event = {}) { listeners.get(name)?.(event); },
        focus() { document.activeElement = this; },
        scrollIntoView() {}, append() {}, showModal() {}, close() {},
        setPointerCapture() {},
        getBoundingClientRect() { return {left: 0, top: 0, width: 800, height: 600}; }
      });
    }
    return elements.get(selector);
  }
  Object.assign(document, {
    querySelector: node,
    createElement(tag) {return node('created-'+tag)},
    addEventListener(name, callback) {if(!documentListeners.has(name))documentListeners.set(name,[]);documentListeners.get(name).push(callback);},
    dispatchEvent(event) {document.events.push(event);for(const callback of documentListeners.get(event.type)||[])callback(event);return true;},
    querySelectorAll() { return []; },
    getElementById(id) { return node('#' + id); },
    body: node('body')
  });
  const storage = new Map();
  const context = vm.createContext({
    THREE, ...data, ...experience, ...sceneState, ...renderProfile, assert, console, URL, URLSearchParams, document, openPracticeHub(options) {document.lastPracticeOptions=options;},
    CustomEvent: class {constructor(type,options={}) {this.type=type;this.detail=options.detail;}},
    location: {search: ''},
    localStorage: {getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v)},
    matchMedia: () => ({matches: false}),
    setTimeout: () => 1, clearTimeout() {}
  });
  vm.runInContext(executable, context, {filename: 'app.js'});
  const run = code => vm.runInContext(code, context);
  run(`
    loaded=true;
    modelRoot=new THREE.Group();
    organs.forEach((o,i)=>{
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial());
      mesh.position.set(i*.2,0,0); mesh.userData.organId=o.id;
      modelRoot.add(mesh); organMeshes.set(o.id,[mesh]); meshes.push(mesh);
      centers.set(o.id,mesh.position.clone());
    });
    modelRoot.updateMatrixWorld(true);
    camera=new THREE.PerspectiveCamera(35,800/600,.01,30);
    camera.position.set(0,0,3); camera.lookAt(0,0,0); camera.updateMatrixWorld(true);
    raycaster=new THREE.Raycaster();
    renderer={domElement:document.querySelector('#test-canvas')};
  `);
  return {run, node};
}

const results = [];
function test(name, callback) {
  try {
    callback(harness());
    results.push({name, status: 'passed'});
  } catch (error) {
    results.push({name, status: 'failed', error: error.message});
    process.exitCode = 1;
  }
}

test('Changing system then isolating retains a visible matching organ', ({run, node}) => {
  node('#system').value = 'resp';
  node('#system').onchange();
  run(`assert.equal(byId(selected).system,'resp');`);
  node('#isolate').onclick();
  run(`
    const visible=[...organMeshes.values()].flat().filter(m=>m.visible);
    assert.equal(visible.length,1);
    assert.equal(visible[0].userData.organId,selected);
  `);
});

test('Physiology clears conflicting system filter and shows heart', ({run, node}) => {
  node('#system').value = 'resp';
  node('#system').onchange();
  run(`
    physiology();
    assert.equal(selected,'heart');
    assert.equal($('#system').value,'all');
    assert.equal(isolated,true);
    assert.equal(organMeshes.get('heart')[0].visible,true);
    assert.equal([...organMeshes.values()].flat().filter(m=>m.visible).length,1);
  `);
});

test('Keyboard zoom stays inside usable camera distance', ({run, node}) => {
  run('bindOrbit();');
  const press = key => node('#viewport').dispatch('keydown', {key, preventDefault() {}});
  for (let i = 0; i < 100; i++) press('-');
  run('assert.equal(view.toRadius,3.7);');
  for (let i = 0; i < 100; i++) press('+');
  run('assert.equal(view.toRadius,.18);');
});

test('Answered target stays highlighted through display toggles', ({run, node}) => {
  run(`startQuiz('find',['heart']);answerFind('lungR');`);
  for (const selector of ['#skeleton', '#labels-toggle', '#rotate', '#home']) {
    node(selector).onclick();
    run(`
      assert.equal(organMeshes.get('heart')[0].material.emissiveIntensity,.3);
      assert.equal(organMeshes.get('lungR')[0].material.emissiveIntensity,0);
      assert.equal(quiz.history.length,1);
    `);
  }
});

test('Finished quiz ignores repeated next, answer, and actual scene picks', ({run}) => {
  run(`
    startQuiz('find',['heart']);
    answerFind('heart');nextQuestion();
    assert.equal(quiz.finished,true);
    assert.equal(quiz.index,1);
    const finalState=JSON.stringify(quiz);
    for(let i=0;i<4;i++){
      nextQuestion();answerFind('lungR');select('lungR');
      pick({clientX:400,clientY:300});
    }
    assert.equal(JSON.stringify(quiz),finalState);
    assert.equal(progress.lastAttempt.score,1);
    assert.equal(progress.lastAttempt.total,1);
    assert.equal(progress.lastAttempt.answers.length,1);
  `);
});

test('Repeating a single-card quiz preserves its original question set', ({run, node}) => {
  run(`startQuiz('function',['heart']);answerChoice(byId('heart').answer);nextQuestion();`);
  node('#quiz-again').onclick();
  run(`
    assert.equal(quiz.type,'function');assert.equal(quiz.items.length,1);
    assert.equal(quiz.items[0],'heart');assert.equal(quiz.index,0);
    assert.equal(quiz.score,0);assert.equal(quiz.answered,false);
  `);
});

test('VR home restores body pose and VR terminal action starts a fresh quiz', ({run}) => {
  run(`
    xrActive=true;modelRoot.rotation.y=1.2;modelRoot.scale.setScalar(3);
    modelRoot.position.set(1,2,3);isolated=true;home();
    assert.equal(modelRoot.rotation.y,0);assert.equal(modelRoot.scale.x,1);
    assert.equal(modelRoot.position.x,0);assert.equal(modelRoot.position.y,0);
    assert.equal(modelRoot.position.z,-1.45);assert.equal(isolated,false);
    startQuiz('find',['heart']);answerFind('heart');nextQuestion();xrAction(0,1);
    assert.equal(quiz.type,'find');assert.equal(quiz.items.length,8);
    assert.equal(quiz.index,0);assert.equal(quiz.score,0);assert.equal(quiz.answered,false);
    assert.equal(!!quiz.finished,false);
  `);
});

test('Bilateral case inspection keeps both lungs visible and highlighted', ({run}) => {
  run(`
    startQuiz('case',[cases[0]]);answerChoice(cases[0].answer);inspectAnswer();
    const shown=[...organMeshes.entries()].filter(([,list])=>list.some(m=>m.visible)).map(([id])=>id).sort();
    assert.equal(shown.join(','),'lungL,lungR');
    for(const id of ['lungL','lungR'])assert.equal(organMeshes.get(id)[0].material.emissiveIntensity,.3);
    const expectedCenter=new THREE.Box3();
    for(const id of ['lungL','lungR'])expectedCenter.expandByObject(organMeshes.get(id)[0]);
    assert.ok(view.toTarget.distanceTo(expectedCenter.getCenter(new THREE.Vector3()))<1e-8);
  `);
});

test('Spatial quiz focuses the scene and physical WASD works on a Russian layout', ({run, node}) => {
  run(`bindOrbit();startQuiz('find',['heart']);assert.equal(document.activeElement.id,'viewport');`);
  node('#viewport').dispatch('keydown', {key: 'ц', code: 'KeyW', preventDefault() {}});
  node('#viewport').dispatch('keydown', {key: 'в', code: 'KeyD', preventDefault() {}});
  run('assert.equal(keyboardPoint.y,.475);assert.equal(keyboardPoint.x,.525);');
});


test('All visual lessons reveal exact organ groups and lead to a relevant quiz', ({run, node}) => {
  for (const item of experience.lessons) {
    run(`startLesson(${JSON.stringify(item.id)});assert.equal(quiz,null);assert.equal(physio,null);`);
    for (let step=0;step<item.steps.length;step++) {
      run(`
        assert.equal(lessonStep,${step});assert.equal(selected,lesson.steps[lessonStep].selected);
        assert.equal(meshes.filter(m=>m.visible).map(m=>m.userData.organId).sort().join(','),[...lesson.steps[lessonStep].ids].sort().join(','));
        assert.ok(view.toRadius>=.28);assert.ok(Number.isFinite(view.turn.to));
      `);
      node('#lesson-next').onclick();
    }
    run(`assert.equal(lesson,null);assert.equal(quiz.type,'function');assert.equal(quiz.items.length,${new Set(item.steps.flatMap(s=>s.ids)).size});assert.ok(progress.lessons.includes(${JSON.stringify(item.id)}));`);
  }
});

test('Ghost context cannot steal picks and restores opaque materials on exit', ({run, node}) => {
  run(`select('heart');isolated=true;renderCard();`);
  node('#context').onclick();
  run(`
    assert.equal(contextMode,true);assert.equal(meshes.filter(m=>m.visible).length,16);
    assert.equal(organMeshes.get('heart')[0].material.opacity,1);
    assert.equal(organMeshes.get('lungR')[0].material.opacity,.075);
    const originalIntersect=raycaster.intersectObjects;
    raycaster.intersectObjects=()=>[{object:organMeshes.get('lungR')[0]},{object:organMeshes.get('heart')[0]}];
    pick({clientX:400,clientY:300});assert.equal(selected,'heart');
    raycaster.intersectObjects=originalIntersect;home();
    assert.ok(meshes.every(m=>m.material.opacity===1&&!m.material.transparent&&m.material.depthWrite));
    assert.equal(contextMode,false);
  `);
});

test('Physiology sliders calculate live and equal products match', ({run, node}) => {
  run('physiology();');
  for(const [hr,sv]of [[100,50],[50,100]]){
    node('#hr').value=hr;node('#sv').value=sv;node('#hr').oninput();
    run(`assert.equal(physio.hr,${hr});assert.equal(physio.sv,${sv});assert.equal($('#co').textContent,'5,00');`);
  }
  node('#physio-back').onclick();
  run(`assert.equal(physio,null);assert.equal(isolated,false);assert.ok(!document.body.classList.contains('in-physio'));assert.equal(meshes.filter(m=>m.visible).length,16);`);
});

test('New modes clear safely when switching to quiz, atlas, and an organ', ({run, node}) => {
  run(`startLesson('depth');startQuiz('find',['heart']);assert.equal(lesson,null);assert.equal(contextMode,false);assert.ok(document.body.classList.contains('spatial-practice'));exitQuiz();assert.ok(!document.body.classList.contains('spatial-practice'));physiology();select('liver');assert.equal(physio,null);assert.equal(selected,'liver');`);
  run(`startLesson('lungs');pick({clientX:400,clientY:300});assert.equal(lesson.id,'lungs');`);node('#home').onclick();
  run(`assert.equal(lesson,null);assert.equal(isolated,false);assert.ok(!document.body.classList.contains('in-lesson'));`);
});

test('Stage controls hide and restore panels and catalog closes before practice', ({run, node}) => {
  run(`toggleCatalog(true);assert.equal($('#catalog').hidden,false);setSceneOnly(true);assert.equal($('#catalog').hidden,true);assert.ok(document.body.classList.contains('only-scene'));startQuiz('find',['heart']);assert.ok(!document.body.classList.contains('only-scene'));assert.equal($('#scene-only').getAttribute('aria-pressed'),'false');`);
});

test('Camera transition takes the shortest arc and ends at the requested view', ({run}) => {
  run(`view.theta=Math.PI*2-.1;turnTo(.1,1.6);assert.ok(Math.abs(view.turn.to-view.turn.from)<.21);for(let i=0;i<60;i++)cameraUpdate(1/60);assert.equal(view.turn,null);assert.ok(Math.abs(view.theta-(Math.PI*2+.1))<1e-8);assert.ok(Math.abs(view.phi-1.6)<1e-8);`);
});

// Resilience tests exercise the same production functions without a renderer.
test('Unavailable WebGL removes the loading gate and keeps educational tools usable', ({run, node}) => {
  run(`activateFallback('Test: WebGL unavailable');assert.equal(fallbackMode,true);assert.equal(loaded,false);assert.equal($('#loading').hidden,true);assert.equal($('#fallback-view').hidden,false);assert.equal($('#fallback-status').hidden,false);assert.equal($('#front').disabled,true);startQuiz('function',['heart']);assert.equal(quiz.items[0],'heart');answerChoice(byId('heart').answer);nextQuestion();assert.equal(quiz.finished,true);assert.equal(quiz.score,1);`);
});
test('Fallback calculator retains arithmetic and both comparison presets', ({run, node}) => {
  run(`activateFallback('Test');physiology();assert.equal(physio.hr,75);assert.equal($('#co').textContent,'5,25');`);
  for(const [hr,sv] of [[100,50],[50,100],[160,130]]){
    node('#hr').value=hr;node('#sv').value=sv;node('#hr').oninput();
    run(`assert.equal(physio.hr*physio.sv/1000,${hr*sv/1000});`);
  }
  node('#physio-back').onclick();run(`assert.equal(physio,null);assert.equal(fallbackMode,true);`);
});
test('Fallback never pretends that spatial search and routes are available', ({run}) => {
  run(`activateFallback('Test');startQuiz('find',['heart']);assert.equal(quiz,null);startLesson('lungs');assert.equal(lesson,null);practice();assert.equal(document.lastPracticeOptions.fallbackMode,true);`);
});
test('Fallback opens the selected heart, including after reset', ({run}) => {run(`activateFallback('Test');assert.equal($('#fallback-image').getAttribute('src'),'./previews/heart.webp');assert.equal($('#scene-heading').textContent,'Сердце');assert.equal($('#viewport').hidden,true);select('pancreas',true);assert.equal($('#fallback-image').getAttribute('src'),'./previews/pancreas.webp');assert.equal($('#scene-heading').textContent,'Поджелудочная железа');resetExperience();assert.equal($('#fallback-image').getAttribute('src'),'./previews/heart.webp');`);});

test('Fallback uses known model previews and never reveals an unanswered quiz target', ({run}) => {
  for(const organ of data.organs)run(`activateFallback('Test');select(${JSON.stringify(organ.id)},true);assert.equal($('#fallback-image').getAttribute('src'),'./previews/${organ.id}.webp');`);
  run(`startQuiz('function',['heart']);assert.equal($('#fallback-image').getAttribute('src'),'./previews/overview.webp');answerChoice(byId('heart').answer);assert.equal($('#fallback-image').getAttribute('src'),'./previews/heart.webp');nextQuestion();assert.equal(quiz.finished,true);assert.equal($('#fallback-image').getAttribute('src'),'./previews/overview.webp');`);
});
test('Fallback survives every educational case through completion', ({run}) => {
  run(`activateFallback('Test');startQuiz('case');while(!quiz.finished){answerChoice(current().answer);inspectAnswer();nextQuestion()}assert.equal(quiz.score,cases.length);assert.equal(progress.lastAttempt.total,cases.length);`);
});
test('Five-step fallback demonstration can repeat, go back, finish and reset', ({run, node}) => {
  run(`activateFallback('Test');startDemo();assert.equal(demoStep,0);assert.equal($('#demo-bar').hidden,false);`);
  for(let i=1;i<5;i++){node('#demo-next').onclick();run(`assert.equal(demoStep,${i});`);}
  run(`assert.equal(quiz.items.length,2);showDemoStep(3);assert.equal(physio.hr,75);showDemoStep(4);assert.equal(quiz.score,0);`);
  node('#demo-next').onclick();run(`assert.equal(demoStep,-1);assert.equal($('#demo-bar').hidden,true);startDemo();resetExperience();assert.equal(demoStep,-1);assert.equal(quiz,null);assert.equal(physio,null);assert.equal(selected,'heart');assert.equal($('#system').value,'all');assert.equal(isolated,false);`);
});
test('Reset preserves saved progress, while clearing all display and practice modes', ({run}) => {
  run(`activateFallback('Test');progress.viewed=['heart'];progress.best.function=7;const before=JSON.stringify(progress);startQuiz('function',['heart']);resetExperience();assert.equal(JSON.stringify(progress),before);assert.equal(quiz,null);assert.equal(reviewedQuiz,null);assert.equal(lesson,null);assert.equal(autoRotate,false);assert.equal(contextMode,false);assert.equal($('#search').value,'');`);
});
test('Context loss exits unsupported spatial practice safely and is idempotent', ({run}) => {
  run(`startQuiz('find',['heart']);activateFallback('Context lost');assert.equal(quiz,null);assert.ok(!document.body.classList.contains('spatial-practice'));startQuiz('function',['heart']);activateFallback('Again');assert.equal(quiz.type,'function');`);
});

// A failed renderer attachment must not leave an immersive session running.
try {
  const {run} = harness();
  await run(`(async()=>{
    let requestedMode,requestedOptions,endCalls=0;
    globalThis.navigator={xr:{
      isSessionSupported:async()=>true,
      requestSession:async(mode,options)=>{
        requestedMode=mode;requestedOptions=options;
        return {end:async()=>{endCalls++}};
      }
    }};
    renderer.xr={setSession:async()=>{throw new Error('Expected attachment failure')}};
    console={...console,error(){}};
    await enterVR();
    assert.equal(requestedMode,'immersive-vr');
    assert.equal(requestedOptions.requiredFeatures.join(','),'local-floor');
    assert.equal(endCalls,1);
    assert.ok($('#toast').textContent.includes('Не удалось войти в VR'));
  })()`);
  results.push({name: 'WebXR requires floor space and closes a session after attachment failure', status: 'passed'});
} catch (error) {
  results.push({name: 'WebXR requires floor space and closes a session after attachment failure', status: 'failed', error: error.message});
  process.exitCode = 1;
}

test('System filters synchronize the visible fallback organ and catalog count', ({run, node}) => {
  run("activateFallback('Test');applySystem('urinary');");
  assert.equal(node('#system').value,'urinary');
  assert.equal(node('#scene-heading').textContent,'Правая почка');
  assert.equal(node('#organ-results-status').textContent,'Показано 3 из 16');
  run("assert.equal(selected,'kidneyR');assert.equal(isolated,false);");
  node('#search').value='ren sinister';run('renderList()');
  assert.equal(node('#organ-results-status').textContent,'Показано 1 из 16');
  assert.ok(node('#organ-list').innerHTML.includes('kidneyL.webp'));
  assert.ok(!node('#organ-list').innerHTML.includes('kidneyR.webp'));
});

test('Search treats ё/е alike and organ links exclude unrelated parameters', ({run, node}) => {
  node('#search').value='ЛЕГКОЕ';run('renderList()');
  assert.equal(node('#organ-results-status').textContent,'Показано 2 из 16');
  run("location.href='https://example.test/anatomia/?token=private&lesson=heart#results';assert.equal(organURL('brain'),'https://example.test/anatomia/?organ=brain');");
});

test('Image mode preserves the selected organ, camera pose and an answered quiz', ({run}) => {
  run(`
    select('kidneyL');view.theta=.8;view.phi=1.2;view.toRadius=.7;
    const pose=[view.theta,view.phi,view.toRadius,view.toTarget.toArray().join(',')].join('|');
    const retainedRenderer=renderer;
    setViewerMode('image');
    assert.equal(fallbackMode,true);assert.equal(loaded,true);assert.equal(selected,'kidneyL');
    assert.equal($('#fallback-image').getAttribute('src'),'./previews/kidneyL.webp');
    assert.equal($('#fallback-status').hidden,true);
    setViewerMode('3d');
    assert.equal(fallbackMode,false);assert.equal(renderer,retainedRenderer);
    assert.equal([view.theta,view.phi,view.toRadius,view.toTarget.toArray().join(',')].join('|'),pose);
    startQuiz('function',['heart','lungL']);answerChoice(byId('heart').answer);
    const attempt=JSON.stringify(quiz);
    setViewerMode('image');setViewerMode('3d');
    assert.equal(JSON.stringify(quiz),attempt);assert.equal(quiz.score,1);
    assert.equal(document.body.classList.contains('in-practice'),true);
  `);
});

test('Image mode preserves physiology settings and refuses active spatial activities', ({run}) => {
  run(`
    physiology();physio.hr=110;physio.sv=55;updatePhysio();
    setViewerMode('image');assert.equal($('#co').textContent,'6,05');
    setViewerMode('3d');assert.equal(physio.hr,110);assert.equal(physio.sv,55);
    assert.equal($('#co').textContent,'6,05');
    startQuiz('find',['heart']);setViewerMode('image');
    assert.equal(fallbackMode,false);assert.equal(quiz.type,'find');
    assert.equal($('#view-image').disabled,true);
    exitQuiz();startLesson('lungs');const step=lessonStep;
    setViewerMode('image');assert.equal(fallbackMode,false);
    assert.equal(lesson.id,'lungs');assert.equal(lessonStep,step);
    assert.equal($('#view-image').disabled,true);
  `);
});

test('Image zoom clamps, pans within bounds, and resets when the organ changes', ({run, node}) => {
  run(`setViewerMode('image');for(let i=0;i<50;i++)zoomViewer(1);assert.equal(imageScale,3);assert.equal($('#zoom-in').disabled,true);`);
  node('#fallback-image').dispatch('pointerdown',{pointerId:1,clientX:100,clientY:100,button:0,preventDefault(){}});
  node('#fallback-image').dispatch('pointermove',{pointerId:1,clientX:10000,clientY:-10000});
  node('#fallback-image').dispatch('pointercancel',{pointerId:1});
  run(`assert.ok(imageOffset.x>0&&imageOffset.x<=800);assert.ok(imageOffset.y<0&&imageOffset.y>=-600);select('liver');assert.equal(imageScale,1);assert.equal(imageOffset.x,0);assert.equal(imageOffset.y,0);for(let i=0;i<50;i++)zoomViewer(-1);assert.equal(imageScale,1);assert.equal($('#zoom-out').disabled,true);`);
  node('#zoom-in').dispatch('click');
  run('assert.equal(imageScale,1.25);');
  node('#home').onclick();
  run('assert.equal(imageScale,1);');
});

test('Four anatomical view presets finish correctly and zoom buttons stay bounded', ({run, node}) => {
  for(const angle of ['front','right','back','left']){
    run(`setViewerAngle('${angle}');for(let i=0;i<60;i++)cameraUpdate(1/60);assert.equal(view.turn,null);assert.equal(currentAngle(),'${angle}');assert.equal($('#viewer-angle').value,'${angle}');assert.equal(autoRotate,false);`);
  }
  for(let i=0;i<100;i++)node('#zoom-in').dispatch('click');
  run('assert.equal(view.toRadius,.18);assert.equal($("#zoom-in").disabled,true);');
  for(let i=0;i<100;i++)node('#zoom-out').dispatch('click');
  run('assert.equal(view.toRadius,3.7);assert.equal($("#zoom-out").disabled,true);');
});

test('Pinch and cancelled pointers never become accidental organ picks', ({run, node}) => {
  run('let pickCount=0;pick=()=>{pickCount++};bindOrbit();');
  const canvas=node('#test-canvas');
  const event=(pointerId,clientX,clientY)=>({pointerId,clientX,clientY,button:0});
  canvas.dispatch('pointerdown',event(1,100,100));
  canvas.dispatch('pointerdown',event(2,200,100));
  canvas.dispatch('pointermove',event(2,300,100));
  canvas.dispatch('pointerup',event(2,300,100));
  canvas.dispatch('pointerup',event(1,100,100));
  run('assert.equal(pickCount,0);assert.equal(view.toRadius,.94);');
  canvas.dispatch('pointerdown',event(3,100,100));
  canvas.dispatch('pointercancel',event(3,100,100));
  canvas.dispatch('pointerup',event(3,100,100));
  run('assert.equal(pickCount,0);');
  canvas.dispatch('pointerdown',event(4,120,120));
  canvas.dispatch('pointerup',event(4,120,120));
  run('assert.equal(pickCount,1);');
});

test('Initial visible card is counted but hidden quiz targets are not', ({run}) => {
  run(`
    progress.viewed=[];loaded=false;renderCard();assert.equal(progress.viewed.length,0);
    selected='kidneyR';activateFallback('Test');
    assert.equal(progress.viewed.join(','),'kidneyR');
    startQuiz('function',['lungL']);renderCard();
    assert.equal(progress.viewed.join(','),'kidneyR');
    assert.equal($('#fallback-image').getAttribute('src'),'./previews/overview.webp');
  `);
});

test('Progress reports distinguish complete, custom and review attempts', ({run, node}) => {
  run(`
    startQuiz('function');while(!quiz.finished){answerChoice(current().answer);nextQuestion();}
    assert.equal(progress.lastAttempt.scope,'standard');assert.equal(progress.lastAttempt.total,8);
    assert.ok(Number.isFinite(Date.parse(progress.lastAttempt.completedAt)));
    startQuiz('function',['heart']);answerChoice((current().answer+1)%current().options.length);nextQuestion();
    assert.equal(progress.lastAttempt.scope,'custom');assert.equal(progress.lastAttempt.total,1);
  `);
  node('#retry-errors').dispatch('click');
  run(`answerChoice(current().answer);nextQuestion();assert.equal(progress.lastAttempt.scope,'review');assert.equal(progress.lastAttempt.total,1);assert.equal(progress.best.function,8);`);
});

test('Progress request reports current memory and an honest storage failure', ({run}) => {
  run(`
    localStorage.setItem=()=>{throw Error('Blocked storage')};
    progress.viewed=['heart','kidneyR'];save();assert.equal(progressPersistent,false);
    document.dispatchEvent(new CustomEvent('anatomia:request-progress'));
    const event=document.events.filter(e=>e.type==='anatomia:progress').at(-1);
    assert.equal(event.detail.persistent,false);assert.equal(event.detail.viewed.join(','),'heart,kidneyR');
  `);
});

// The renderer and loader doubles exercise retry lifecycle/state, not GPU output.
async function asyncTest(name,callback){
  try{await callback(harness());results.push({name,status:'passed'});}
  catch(error){results.push({name,status:'failed',error:error.message});process.exitCode=1;}
}
await asyncTest('Context retry disposes the old renderer, reloads once and preserves a nonspatial quiz',async({run})=>{
  await run(`(async()=>{
    let created=0,disposed=0,atlasLoads=0;
    renderer.dispose=()=>{disposed++};
    THREE={...THREE,WebGLRenderer:class{
      constructor(){created++;this.domElement=document.querySelector('#retry-canvas');this.xr={enabled:false,setReferenceSpaceType(){}};}
      setPixelRatio(){}setSize(){}setAnimationLoop(callback){this.loop=callback;}
      dispose(){disposed++;}
    }};
    GLTFLoader=class{async loadAsync(url){
      const group=new THREE.Group();
      if(url.includes('atlas.glb')){atlasLoads++;for(const organ of organs){const m=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial());m.userData.organId=organ.id;group.add(m);}}
      return {scene:group};
    }};
    globalThis.devicePixelRatio=1;globalThis.ResizeObserver=class{observe(){}disconnect(){}};makeXR=()=>{};
    startQuiz('function',['heart','kidneyR']);answerChoice(current().answer);
    const before=JSON.stringify(quiz);
    activateFallback('Context lost');await setViewerMode('3d');
    assert.equal(loaded,true);assert.equal(fallbackMode,false);assert.equal(viewerLoad,'ready');
    assert.equal(created,1);assert.equal(disposed,1);assert.equal(atlasLoads,1);
    assert.equal(meshes.length,16);assert.equal(centers.size,16);assert.equal(JSON.stringify(quiz),before);
    await setViewerMode('image');await setViewerMode('3d');
    assert.equal(created,1);assert.equal(atlasLoads,1);assert.equal(JSON.stringify(quiz),before);
  })()`);
});

await asyncTest('Unavailable fullscreen expands the workspace and returns without changing the task',async({run})=>{
  await run(`(async()=>{
    startQuiz('function',['heart']);const before=JSON.stringify(quiz);
    document.documentElement={requestFullscreen:async()=>{throw Error('Unsupported')}};
    await toggleFullscreen();assert.equal(theatreMode,true);
    assert.equal(document.body.classList.contains('viewer-theatre'),true);
    assert.equal($('#viewer-fullscreen').getAttribute('aria-pressed'),'true');
    await toggleFullscreen();assert.equal(theatreMode,false);assert.equal(JSON.stringify(quiz),before);
  })()`);
});

test('3D pair keeps source transforms, frames both organs and adds only ghost neighbours',({run,node})=>{
  run(`
    const pairIds=['lungR','lungL'];
    const matrices=pairIds.map(id=>organMeshes.get(id)[0].matrixWorld.toArray().join(','));
    document.dispatchEvent(new CustomEvent('anatomia:navigate',{detail:{action:'compare3d',ids:pairIds}}));
    assert.equal(comparison3D.ids.join(','),pairIds.join(','));
    assert.equal(meshes.filter(m=>m.visible).map(m=>m.userData.organId).sort().join(','),'lungL,lungR');
    const bounds=new THREE.Box3();for(const id of pairIds)bounds.expandByObject(organMeshes.get(id)[0]);
    assert.ok(view.toTarget.distanceTo(bounds.getCenter(new THREE.Vector3()))<1e-8);
    assert.equal(pairIds.map(id=>organMeshes.get(id)[0].matrixWorld.toArray().join(',')).join('|'),matrices.join('|'));
    assert.equal(document.events.filter(e=>e.type==='anatomia:comparison3d-state').at(-1).detail.status,'ready');
    assert.ok($('#organ-card').innerHTML.includes(byId('lungR').latin));
    assert.ok($('#organ-card').innerHTML.includes(byId('lungL').latin));
  `);
  node('#comparison-context').onclick();
  run(`
    assert.equal(meshes.filter(m=>m.visible&&m.material.opacity===1).length,2);
    assert.equal(meshes.filter(m=>m.visible&&m.material.opacity===.075).length,14);
    raycaster.intersectObjects=()=>[{object:organMeshes.get('heart')[0]},{object:organMeshes.get('lungL')[0]}];
    pick({clientX:400,clientY:300});assert.equal(selected,'lungL');assert.equal(comparison3D.ids.length,2);
    home();assert.equal(contextMode,false);assert.equal(meshes.filter(m=>m.visible).length,2);
  `);
});

test('Unavailable and invalid 3D comparisons preserve the current learning task',({run})=>{
  run(`
    startQuiz('function',['heart']);const attempt=JSON.stringify(quiz),before=selected;
    loaded=false;
    document.dispatchEvent(new CustomEvent('anatomia:navigate',{detail:{action:'compare3d',ids:['lungR','lungL']}}));
    assert.equal(JSON.stringify(quiz),attempt);assert.equal(selected,before);assert.equal(comparison3D,null);
    const state=document.events.filter(e=>e.type==='anatomia:comparison3d-state').at(-1).detail;
    assert.equal(state.status,'unavailable');assert.equal(state.ids.join(','),'lungR,lungL');
    loaded=true;assert.equal(startComparison3D(['heart','heart']),false);
    assert.equal(startComparison3D(['heart','invalid']),false);
    assert.equal(startComparison3D(['heart','lungL','brain']),false);
    assert.equal(JSON.stringify(quiz),attempt);
    xrActive=true;assert.equal(startComparison3D(['heart','lungL']),false);assert.equal(comparison3D,null);
  `);
});

test('A loaded image view enters the requested pair and exiting restores the atlas',({run,node})=>{
  run(`
    select('heart');hideSelectedOrgan();setViewerMode('image');const originalRenderer=renderer;
    assert.equal(startComparison3D(['kidneyR','kidneyL']),true);
    assert.equal(renderer,originalRenderer);assert.equal(fallbackMode,false);assert.equal(hiddenOrgans.size,0);
    assert.equal(quiz,null);assert.equal(lesson,null);assert.equal(physio,null);
    assert.equal($('#view-image').disabled,true);setViewerMode('image');assert.equal(fallbackMode,false);
  `);
  node('#comparison-exit').onclick();
  run(`assert.equal(comparison3D,null);assert.equal(isolated,false);assert.equal(meshes.filter(m=>m.visible).length,16);assert.equal($('#view-image').disabled,false);assert.ok(!document.body.classList.contains('in-comparison3d'));`);
});

test('Hiding an isolated or filtered organ leaves a usable scene and hidden picks are excluded',({run,node})=>{
  run(`
    applySystem('cardio');isolated=true;applyAppearance();assert.equal(hideSelectedOrgan(),true);
    assert.ok(hiddenOrgans.has('heart'));assert.equal(isolated,false);assert.equal($('#system').value,'all');
    assert.ok(meshes.some(m=>m.visible));assert.equal(organMeshes.get('heart')[0].visible,false);
    assert.ok($('#organ-list').innerHTML.includes('Скрыт в 3D'));
    organs.forEach(o=>labelNodes.set(o.id,document.querySelector('#test-label-'+o.id)));showLabels=true;updateLabels();
    assert.equal(labelNodes.get('heart').hidden,true);
    raycaster.intersectObjects=()=>[{object:organMeshes.get('heart')[0]},{object:organMeshes.get('lungL')[0]}];
    pick({clientX:400,clientY:300});assert.equal(selected,'lungL');
    select('heart',true);assert.equal(hiddenOrgans.has('heart'),false);assert.equal(organMeshes.get('heart')[0].visible,true);
  `);
  node('#hide-organ').dispatch('click');
  run('assert.equal(hiddenOrgans.size,1);');
  node('#restore-organs').dispatch('click');
  run('assert.equal(hiddenOrgans.size,0);assert.equal(meshes.filter(m=>m.visible).length,16);');
});

test('The final structure cannot be hidden and study modes clear scene edits',({run})=>{
  run(`
    for(let i=0;i<15;i++)assert.equal(hideSelectedOrgan(),true);
    assert.equal(hiddenOrgans.size,15);assert.equal(meshes.filter(m=>m.visible).length,1);
    assert.equal(hideSelectedOrgan(),false);assert.equal(hiddenOrgans.size,15);
    startQuiz('find',['heart']);assert.equal(hiddenOrgans.size,0);assert.equal(meshes.filter(m=>m.visible).length,16);
    exitQuiz();startComparison3D(['heart','lungL']);startQuiz('function',['heart']);assert.equal(comparison3D,null);
    exitQuiz();hideSelectedOrgan();startLesson('lungs');assert.equal(hiddenOrgans.size,0);assert.equal(comparison3D,null);
    exitStudy();hideSelectedOrgan();resetExperience();assert.equal(hiddenOrgans.size,0);assert.equal(meshes.filter(m=>m.visible).length,16);
  `);
});

test('Graphics loss returns the actual pair to 2D comparison in a defined event order',({run})=>{
  run(`
    startComparison3D(['kidneyR','kidneyL']);document.events.length=0;
    activateFallback('Test context loss');assert.equal(comparison3D,null);assert.equal(fallbackMode,true);assert.equal(hiddenOrgans.size,0);
    const events=document.events.filter(e=>['anatomia:workbench','anatomia:comparison3d-state'].includes(e.type));
    assert.equal(events.length,2);assert.equal(events[0].type,'anatomia:workbench');assert.equal(events[0].detail.mode,'compare');
    assert.equal(events[0].detail.ids.join(','),'kidneyR,kidneyL');assert.equal(events[1].detail.ids.join(','),'kidneyR,kidneyL');
    assert.equal(events[1].detail.status,'unavailable');
  `);
});

test('Portrait resize refits a pair without changing its angle or causing a zoom jump',({run})=>{
  run(`
    startComparison3D(['brain','bladder']);const beforeRadius=view.toRadius;
    view.theta=1.1;view.phi=1.2;view.turn=null;
    $('#viewport').clientHeight=600;renderer.setSize=()=>{};
    for(let width=780;width>=360;width-=20){$('#viewport').clientWidth=width;resize();}
    assert.ok(Math.abs(camera.aspect/comparison3D.fitAspect-1)<=.08);
    $('#viewport').clientWidth=360;$('#viewport').clientHeight=800;resize();
    assert.ok(view.toRadius>beforeRadius);assert.equal(view.theta,1.1);assert.equal(view.phi,1.2);assert.equal(view.turn,null);
    assert.ok(maxViewRadius()>=view.toRadius);const fitted=view.toRadius;zoomViewer(1);
    assert.ok(Math.abs(view.toRadius-fitted*.8)<1e-8);
    for(let i=0;i<100;i++)zoomViewer(-1);assert.equal(view.toRadius,maxViewRadius());
  `);
});


test('Scene state requests return validated visual state without learner data',({run})=>{
  run(`
    handleSceneCommand({action:'request'});
    const state=document.events.filter(e=>e.type==='anatomia:scene-state').at(-1).detail;
    assert.equal(state.available,true);assert.equal(state.blocked,null);assert.equal(state.visible.length,16);
    assert.ok(normalizeScene(state.snapshot));assert.equal('progress' in state.snapshot,false);assert.equal('best' in state.snapshot,false);
    state.snapshot.hidden.push('heart');state.visible.length=0;
    assert.equal(hiddenOrgans.size,0);assert.equal(visibleSceneIds().length,16);
    setViewerMode('image');handleSceneCommand({action:'request'});
    const imageState=document.events.filter(e=>e.type==='anatomia:scene-state').at(-1).detail;
    assert.equal(imageState.available,false);assert.equal(imageState.blocked,'image');assert.equal(imageState.snapshot,null);
  `);
});

test('All scene presets show their exact source structures without moving geometry',({run})=>{
  run(`
    const transforms=meshes.map(m=>m.matrixWorld.toArray().join(',')).join('|');
    for(const preset of scenePresets){
      handleSceneCommand({action:'preset',id:preset.id});
      assert.equal(visibleSceneIds().sort().join(','),[...preset.ids].sort().join(','));
      assert.equal(meshes.filter(m=>m.visible&&m.material.opacity===1).length,preset.ids.length);
      assert.equal($('#system').value,'all');assert.equal(isolated,false);assert.ok(normalizeScene(sceneSnapshot()));
      assert.equal(meshes.map(m=>m.matrixWorld.toArray().join(',')).join('|'),transforms);
      assert.ok(view.toRadius<=maxViewRadius());
    }
  `);
});

test('Visibility edits preserve the displayed set when leaving isolation, a filter or a pair',({run})=>{
  run(`
    select('heart');isolated=true;contextMode=true;applyAppearance();
    handleSceneCommand({action:'visibility',id:'lungL',visible:true});
    assert.equal(visibleSceneIds().sort().join(','),'heart,lungL');assert.equal(isolated,false);assert.equal(contextMode,false);assert.equal($('#system').value,'all');
    applySystem('resp');handleSceneCommand({action:'visibility',id:'heart',visible:true});
    assert.equal(visibleSceneIds().sort().join(','),'heart,lungL,lungR');
    startComparison3D(['kidneyR','kidneyL']);handleSceneCommand({action:'visibility',id:'bladder',visible:true});
    assert.equal(comparison3D,null);assert.equal(visibleSceneIds().sort().join(','),'bladder,kidneyL,kidneyR');
  `);
});

test('Removing the selected or final visible structure keeps a valid nonempty scene',({run})=>{
  run(`
    handleSceneCommand({action:'preset',id:'urinary'});
    selected='kidneyR';handleSceneCommand({action:'visibility',id:'kidneyR',visible:false});
    assert.equal(selected,'kidneyL');assert.ok(normalizeScene(sceneSnapshot()));
    handleSceneCommand({action:'visibility',id:'kidneyL',visible:false});assert.equal(selected,'bladder');
    const before=JSON.stringify(sceneSnapshot());
    handleSceneCommand({action:'visibility',id:'bladder',visible:false,requestId:'last'});
    const result=document.events.filter(e=>e.type==='anatomia:scene-result').at(-1).detail;
    assert.equal(result.ok,false);assert.equal(result.requestId,'last');assert.equal(JSON.stringify(sceneSnapshot()),before);
    assert.equal(visibleSceneIds().join(','),'bladder');
  `);
});

test('Applying a saved pair restores camera, layer settings and original model transforms',({run})=>{
  run(`
    startComparison3D(['lungR','lungL']);contextMode=true;contextOpacity=.24;showSkeleton=false;showLabels=true;
    view.turn=null;view.theta=.6;view.phi=1.2;view.toRadius=1.3;view.toTarget.set(.2,1.1,-.3);
    applyAppearance();const saved=sceneSnapshot();assert.ok(saved);
    const transforms=meshes.map(m=>m.matrixWorld.toArray().join(',')).join('|');
    resetExperience();handleSceneCommand({action:'apply',snapshot:saved,requestId:'restore'});
    const result=document.events.filter(e=>e.type==='anatomia:scene-result').at(-1).detail;
    assert.equal(result.ok,true);assert.equal(result.requestId,'restore');assert.equal(JSON.stringify(sceneSnapshot()),JSON.stringify(saved));
    assert.equal(view.radius,1.3);assert.equal(view.target.toArray().join(','),'0.2,1.1,-0.3');
    assert.equal(showLabels,true);assert.equal(showSkeleton,false);assert.equal(contextOpacity,.24);
    assert.equal(meshes.filter(m=>m.visible&&m.material.opacity===1).length,2);
    assert.equal(meshes.map(m=>m.matrixWorld.toArray().join(',')).join('|'),transforms);
  `);
});

test('Invalid or unavailable scene commands preserve active learning and camera state',({run})=>{
  run(`
    const saved=sceneSnapshot();const before=JSON.stringify(saved);
    handleSceneCommand({action:'apply',snapshot:{...saved,camera:{...saved.camera,radius:Infinity}}});
    assert.equal(JSON.stringify(sceneSnapshot()),before);
    handleSceneCommand({action:'preset',id:'unknown'});assert.equal(JSON.stringify(sceneSnapshot()),before);
    startQuiz('function',['heart']);answerChoice(0);const quizBefore=JSON.stringify(quiz),viewBefore=JSON.stringify({theta:view.theta,phi:view.phi,radius:view.toRadius,target:view.toTarget.toArray()});
    for(const request of [{action:'apply',snapshot:saved},{action:'preset',id:'urinary'},{action:'visibility',id:'heart',visible:false},{action:'view',value:'top'}])handleSceneCommand(request);
    assert.equal(JSON.stringify(quiz),quizBefore);assert.equal(JSON.stringify({theta:view.theta,phi:view.phi,radius:view.toRadius,target:view.toTarget.toArray()}),viewBefore);
    assert.equal(document.events.filter(e=>e.type==='anatomia:scene-state').at(-1).detail.blocked,'practice');
    exitQuiz();xrActive=true;handleSceneCommand({action:'apply',snapshot:saved});assert.equal(document.events.filter(e=>e.type==='anatomia:scene-state').at(-1).detail.blocked,'vr');
    xrActive=false;setViewerMode('image');handleSceneCommand({action:'apply',snapshot:saved});assert.equal(fallbackMode,true);
  `);
});

test('Neighbour opacity stays within safe picking limits and resets before practice',({run})=>{
  run(`
    startComparison3D(['lungR','lungL']);handleSceneCommand({action:'context',value:true});
    handleSceneCommand({action:'context-opacity',value:.3});assert.equal(contextOpacity,.3);
    assert.equal(organMeshes.get('brain')[0].material.opacity,.3);
    const ghost=organMeshes.get('brain')[0],target=organMeshes.get('lungL')[0];
    raycaster.intersectObjects=()=>[{object:ghost,distance:1},{object:target,distance:2}];pick({clientX:400,clientY:300});assert.equal(selected,'lungL');
    handleSceneCommand({action:'context-opacity',value:.31});assert.equal(contextOpacity,.3);
    handleSceneCommand({action:'context-opacity',value:'0.1'});assert.equal(contextOpacity,.3);
    startQuiz('find',['heart']);assert.equal(contextOpacity,.075);assert.equal(contextMode,false);assert.equal(hiddenOrgans.size,0);
  `);
});

test('Six camera views report the right orientation and swap lateral markers behind the body',({run,node})=>{
  for(const angle of ['front','right','back','left','top','bottom']){
    run(`handleSceneCommand({action:'view',value:'${angle}'});for(let i=0;i<60;i++)cameraUpdate(1/60);assert.equal(currentAngle(),'${angle}');assert.ok(normalizeScene(sceneSnapshot()));`);
    if(angle==='front'){assert.ok(node('.left-marker').innerHTML.startsWith('П'));assert.equal(node('.left-marker').style.opacity,'.8');}
    else if(angle==='back'){assert.ok(node('.left-marker').innerHTML.startsWith('Л'));assert.ok(node('.right-marker').innerHTML.startsWith('П'));assert.equal(node('.left-marker').style.opacity,'.8');}
    else assert.equal(node('.left-marker').style.opacity,'0');
  }
});

test('A fitted custom scene survives portrait resize and visibility edits without a zoom jump',({run})=>{
  run(`
    handleSceneCommand({action:'preset',id:'all'});const initial=view.toRadius;
    view.theta=1.1;view.phi=1.3;view.turn=null;renderer.setSize=()=>{};$('#viewport').clientHeight=800;
    for(let width=780;width>=360;width-=20){$('#viewport').clientWidth=width;resize();}
    assert.ok(Math.abs(camera.aspect/sceneFit.aspect-1)<=.08);assert.ok(view.toRadius>initial);assert.equal(view.theta,1.1);assert.equal(view.phi,1.3);
    const cameraBefore=view.toRadius;handleSceneCommand({action:'visibility',id:'heart',visible:false});
    assert.equal(view.toRadius,cameraBefore);assert.ok(maxViewRadius()>=cameraBefore);zoomViewer(1);assert.ok(Math.abs(view.toRadius-cameraBefore*.8)<1e-8);
  `);
});

test('Shift and right-button panning move the target without rotating or selecting an organ',({run,node})=>{
  run('let pickCount=0;pick=()=>{pickCount++};bindOrbit();');
  const canvas=node('#test-canvas');
  for(const mode of [{button:0,shiftKey:true},{button:2,shiftKey:false}]){
    run('view.theta=.4;view.phi=1.2;view.toTarget.set(0,1.26,0);view.target.copy(view.toTarget);');
    const event=(x,y)=>({pointerId:1,clientX:x,clientY:y,preventDefault(){},...mode});
    canvas.dispatch('pointerdown',event(100,100));canvas.dispatch('pointermove',event(160,140));canvas.dispatch('pointerup',event(160,140));
    run('assert.equal(pickCount,0);assert.equal(view.theta,.4);assert.equal(view.phi,1.2);assert.ok(view.toTarget.distanceTo(new THREE.Vector3(0,1.26,0))>.01);assert.ok(normalizeScene(sceneSnapshot()));');
  }
  run('panScene(1000000,-1000000);assert.ok(view.toTarget.x>=-5&&view.toTarget.x<=5);assert.ok(view.toTarget.y>=-2&&view.toTarget.y<=5);assert.ok(view.toTarget.z>=-5&&view.toTarget.z<=5);assert.ok(normalizeScene(sceneSnapshot()));');
});


test('Panning during a camera transition keeps both current and destination targets bounded',({run})=>{
  run(`
    view.target.set(0,1.2,0);view.toTarget.set(5,5,5);view.toRadius=3.7;
    panScene(1000000,-1000000);
    for(const target of [view.target,view.toTarget]){assert.ok(target.x>=-5&&target.x<=5);assert.ok(target.y>=-2&&target.y<=5);assert.ok(target.z>=-5&&target.z<=5);}
    assert.equal(view.target.toArray().join(','),view.toTarget.toArray().join(','));
    assert.ok(normalizeScene(sceneSnapshot()));
  `);
});

test('Extreme narrow viewports keep focused views inside the shareable camera range',({run})=>{
  run(`
    camera.aspect=.01;startComparison3D(['brain','bladder']);
    assert.equal(view.toRadius,25);assert.equal(maxViewRadius(),25);assert.ok(normalizeScene(sceneSnapshot()));
    handleSceneCommand({action:'visibility',id:'heart',visible:true});assert.equal(view.toRadius,25);assert.equal(maxViewRadius(),25);
    zoomViewer(1);assert.equal(view.toRadius,20);
  `);
});


test('Scene selection focuses an organ without revealing unrelated hidden structures',({run})=>{
  run(`
    handleSceneCommand({action:'preset',id:'urinary'});handleSceneCommand({action:'select',id:'kidneyL'});
    assert.equal(selected,'kidneyL');assert.equal(visibleSceneIds().sort().join(','),'bladder,kidneyL,kidneyR');
    handleSceneCommand({action:'select',id:'heart'});assert.equal(selected,'heart');
    assert.equal(visibleSceneIds().sort().join(','),'bladder,heart,kidneyL,kidneyR');
    startComparison3D(['lungR','lungL']);handleSceneCommand({action:'select',id:'lungL'});
    assert.equal(selected,'lungL');assert.equal(comparison3D.ids.join(','),'lungR,lungL');assert.equal(visibleSceneIds().length,2);
    handleSceneCommand({action:'select',id:'airway'});assert.equal(comparison3D,null);assert.equal(selected,'airway');
    assert.equal(visibleSceneIds().sort().join(','),'airway,lungL,lungR');assert.ok(normalizeScene(sceneSnapshot()));
    startQuiz('function',['heart']);const before=JSON.stringify(quiz);handleSceneCommand({action:'select',id:'brain'});assert.equal(JSON.stringify(quiz),before);
  `);
});

test('Studio materials keep source geometry and clear selection without an overbright atlas emissive',({run})=>{
  run(`
    const matrices=meshes.map(m=>m.matrixWorld.toArray().join(','));
    for(const [id,list] of organMeshes)for(const mesh of list)mesh.material=createOrganMaterial(id);
    selected='heart';applyAppearance();
    assert.ok(organMeshes.get('heart')[0].material.emissiveIntensity>0&&organMeshes.get('heart')[0].material.emissiveIntensity<.1);
    assert.equal(organMeshes.get('lungR')[0].material.emissiveIntensity,0);
    assert.ok(organMeshes.get('lungR')[0].material.roughness>organMeshes.get('kidneyR')[0].material.roughness);
    for(const mesh of meshes)assert.equal(mesh.material.metalness,0);
    assert.equal(meshes.map(m=>m.matrixWorld.toArray().join(',')).join('|'),matrices.join('|'));
    const before=meshes.map(m=>m.material.color.getHex());
    handleGraphicsCommand({action:'quality',value:'eco'});
    assert.equal(meshes.map(m=>m.material.color.getHex()).join(','),before.join(','));
    scene=new THREE.Scene();createStudioLights();
    assert.equal(scene.children.filter(node=>node.isLight).length,4);
    assert.ok(scene.children.filter(node=>node.isLight).every(light=>!light.castShadow));
  `);
});

test('Graphics quality commands synchronously report real buffer limits and preserve an answered quiz and camera',({run})=>{
  run(`
    startQuiz('function',['heart']);answerChoice(current().answer);
    const stateBefore=JSON.stringify(quiz),cameraBefore=JSON.stringify({theta:view.theta,phi:view.phi,radius:view.toRadius,target:view.toTarget.toArray(),projection:camera.projectionMatrix.toArray()});
    $('#viewport').clientWidth=1400;$('#viewport').clientHeight=900;globalThis.devicePixelRatio=3;
    let appliedDPR=null;renderer.setPixelRatio=value=>{appliedDPR=value;};renderer.setSize=()=>{};
    handleGraphicsCommand({action:'quality',value:'high'});
    let result=document.events.filter(e=>e.type==='anatomia:graphics-state').at(-1).detail;
    assert.equal(result.available,true);assert.equal(result.quality,'high');assert.equal(result.effectiveDPR,appliedDPR);
    assert.ok(result.resolution.width*result.resolution.height<=4000000);
    assert.equal(localStorage.getItem('anatomia-graphics-v1'),'high');
    const high=appliedDPR;handleGraphicsCommand({action:'quality',value:'eco'});assert.ok(appliedDPR<high);
    assert.equal(JSON.stringify(quiz),stateBefore);
    assert.equal(JSON.stringify({theta:view.theta,phi:view.phi,radius:view.toRadius,target:view.toTarget.toArray(),projection:camera.projectionMatrix.toArray()}),cameraBefore);
    const events=document.events.length;handleGraphicsCommand({action:'request'});assert.equal(document.events.length,events+1);
  `);
});

test('Graphics readiness is honest for loading, image, XR and failed contexts, and invalid preferences cannot apply',({run})=>{
  run(`
    graphicsQuality='auto';let changes=0;renderer.setPixelRatio=()=>{changes++};
    for(const blocked of ['loading','image','vr','unavailable']){
      viewerLoad=blocked==='loading'?'loading':blocked==='unavailable'?'unavailable':'ready';
      fallbackMode=blocked==='image';xrActive=blocked==='vr';loaded=blocked!=='unavailable';
      handleGraphicsCommand({action:'quality',value:'high'});
      const state=document.events.filter(e=>e.type==='anatomia:graphics-state').at(-1).detail;
      assert.equal(state.available,false);assert.equal(state.effectiveDPR,null);assert.equal(state.resolution,null);assert.ok(state.reason.length>10);
      assert.equal(graphicsQuality,'auto');
    }
    loaded=true;fallbackMode=false;xrActive=false;viewerLoad='ready';
    for(const value of [null,{},'ultra','__proto__'])handleGraphicsCommand({action:'quality',value});
    assert.equal(graphicsQuality,'auto');assert.equal(changes,0);
  `);
});

test('Failed preference storage still applies quality, and disposal clears hardware state without losing the chosen profile',({run})=>{
  run(`
    $('#viewport').clientWidth=1200;$('#viewport').clientHeight=800;renderer.setPixelRatio=()=>{};
    localStorage.setItem=()=>{throw Error('Storage blocked');};handleGraphicsCommand({action:'quality',value:'eco'});
    let state=document.events.filter(e=>e.type==='anatomia:graphics-state').at(-1).detail;
    assert.equal(state.quality,'eco');assert.equal(state.persistent,false);assert.equal(state.available,true);
    const material=createOrganMaterial('heart');let disposed=0;material.addEventListener('dispose',()=>{disposed++;});
    organMeshes.get('heart')[0].material=material;organMeshes.get('lungR')[0].material=material;
    scene=new THREE.Scene();scene.add(modelRoot);disposeViewer();
    state=document.events.filter(e=>e.type==='anatomia:graphics-state').at(-1).detail;
    assert.equal(disposed,1);assert.equal(graphicsQuality,'eco');assert.equal(state.available,false);assert.equal(graphicsResolution,null);
  `);
});

test('Measured tablet panels frame the actual scene and off-axis pointer picking stays aligned',({run})=>{
  run(`
    $('#viewport').clientWidth=768;$('#viewport').clientHeight=770;
    $('#viewport').getBoundingClientRect=()=>({left:0,top:80,width:768,height:770});renderer.domElement.getBoundingClientRect=$('#viewport').getBoundingClientRect;
    renderer.setSize=()=>{};renderer.setPixelRatio=()=>{};
    globalThis.getComputedStyle=el=>({display:el.layoutVisible?'block':'none',visibility:'visible',opacity:'1'});
    const rectangles={'#detail':[474,108,274,642],'.system-dock':[20,272,436,62],'.atlas-shortcuts':[20,654,172,116],'.stage-tools':[205.5,771,357,56]};
    for(const [selector,[left,top,width,height]] of Object.entries(rectangles)){const el=$(selector);el.layoutVisible=true;el.getBoundingClientRect=()=>({left,top,width,height});}
    const matrices=meshes.map(m=>m.matrixWorld.toArray().join(','));home();cameraUpdate(2);camera.updateMatrixWorld(true);
    assert.ok(cameraFrameState.width>250&&cameraFrameState.height>400);assert.ok(camera.view?.enabled);
    const box=new THREE.Box3().setFromObject(modelRoot);
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const p=new THREE.Vector3(x,y,z).project(camera),px=(p.x+1)*768/2,py=(1-p.y)*770/2;
      assert.ok(px>=cameraFrameState.left-1e-6&&px<=cameraFrameState.right+1e-6&&py>=cameraFrameState.top-1e-6&&py<=cameraFrameState.bottom+1e-6);
    }
    const point=centers.get('brain').clone().project(camera);pick({clientX:(point.x+1)*768/2,clientY:80+(1-point.y)*770/2});assert.equal(selected,'brain');
    assert.equal(meshes.map(m=>m.matrixWorld.toArray().join(',')).join('|'),matrices.join('|'));
  `);
});

test('Opening a scene panel respects manual and saved camera poses while explicit fit uses the free region',({run})=>{
  run(`
    $('#viewport').clientWidth=390;$('#viewport').clientHeight=600;$('#viewport').getBoundingClientRect=()=>({left:0,top:0,width:390,height:600});
    renderer.setSize=()=>{};renderer.setPixelRatio=()=>{};
    globalThis.getComputedStyle=el=>({display:el.layoutVisible?'block':'none',visibility:'visible',opacity:'1'});
    home();manualCameraChange();view.theta=.4;view.phi=1.3;view.toRadius=4;view.toTarget.set(.1,1.2,-.1);view.turn=null;
    const saved=sceneSnapshot();assert.ok(saved);assert.equal(restoreSceneSnapshot(saved),true);
    $('#scene-panel').layoutVisible=true;$('#scene-panel').getBoundingClientRect=()=>({left:10,top:350,width:370,height:250});
    document.dispatchEvent(new CustomEvent('anatomia:scene-layout'));
    assert.equal(JSON.stringify(sceneSnapshot().camera),JSON.stringify(saved.camera));assert.ok(cameraFrameState.bottom<350);
    handleSceneCommand({action:'preset',id:'cardiorespiratory'});assert.ok(sceneFit);assert.ok(sceneFit.frame.bottom<350);
    startQuiz('function',['heart']);const before=JSON.stringify({theta:view.theta,phi:view.phi,radius:view.toRadius,target:view.toTarget.toArray()});
    $('#viewport').clientWidth=370;resize();
    assert.equal(JSON.stringify({theta:view.theta,phi:view.phi,radius:view.toRadius,target:view.toTarget.toArray()}),before);
  `);
});

test('Spatial practice starts with every source structure in view without revealing its target or overriding manual navigation',({run})=>{
  run(`
    $('#viewport').clientWidth=390;$('#viewport').clientHeight=600;renderer.setSize=()=>{};renderer.setPixelRatio=()=>{};
    startQuiz('find',['heart','bladder']);
    const first=JSON.stringify({target:view.toTarget.toArray(),radius:view.toRadius});assert.equal(sceneFit.ids.length,16);
    for(const mesh of meshes)assert.equal(mesh.material.emissiveIntensity,0);
    const whole=new THREE.Box3().setFromObject(modelRoot);assert.ok(view.toTarget.distanceTo(whole.getCenter(new THREE.Vector3()))<1e-8);
    answerFind('heart');nextQuestion();assert.equal(JSON.stringify({target:view.toTarget.toArray(),radius:view.toRadius}),first);
    manualCameraChange();view.toRadius=2;view.toTarget.set(.2,.8,-.1);
    const manual=JSON.stringify({target:view.toTarget.toArray(),radius:view.toRadius});$('#viewport').clientWidth=370;resize();handleGraphicsCommand({action:'quality',value:'eco'});
    assert.equal(JSON.stringify({target:view.toTarget.toArray(),radius:view.toRadius}),manual);assert.equal(quiz.answered,false);assert.equal(quiz.index,1);
    home();assert.equal(sceneFit.ids.length,16);assert.ok(view.toTarget.distanceTo(whole.getCenter(new THREE.Vector3()))<1e-8);
  `);
});

test('Starting spatial practice closes the settings panel before fitting, even with deferred scene-state microtasks',({run})=>{
  run(`
    const pending=[];globalThis.queueMicrotask=callback=>pending.push(callback);let panelOpen=true;
    $('#viewport').clientWidth=768;$('#viewport').clientHeight=770;
    $('#viewport').getBoundingClientRect=()=>({left:0,top:80,width:768,height:770});renderer.setSize=()=>{};renderer.setPixelRatio=()=>{};
    const rectangles={'#scene-panel':[20,110,300,642,'panel'],'#detail':[474,108,274,642,'atlas'],'.system-dock':[20,272,436,62,'atlas'],'.atlas-shortcuts':[20,654,172,116,'atlas'],'.stage-tools':[205.5,771,357,56,'always']};
    for(const [selector,[left,top,width,height,group]] of Object.entries(rectangles)){const el=$(selector);el.layoutGroup=group;el.getBoundingClientRect=()=>({left,top,width,height});}
    globalThis.getComputedStyle=el=>({display:(el.layoutGroup==='panel'?panelOpen:el.layoutGroup==='atlas'?!panelOpen:el.layoutGroup==='always')?'block':'none',visibility:'visible',opacity:'1'});
    document.addEventListener('anatomia:scene-state',event=>{
      if(event.detail.activity&&panelOpen){panelOpen=false;document.dispatchEvent(new CustomEvent('anatomia:scene-layout'));}
    });
    startQuiz('find',['heart']);
    assert.equal(panelOpen,false,'Activity panel must close synchronously before home measures the scene');
    assert.equal(sceneFit.ids.length,16);assert.ok(sceneFit.frame.width>250&&sceneFit.frame.width<300);
    assert.equal(sceneFit.frame.width,cameraFrameState.width);assert.equal(sceneFit.frame.height,cameraFrameState.height);
    const fitted=view.toRadius;while(pending.length)pending.shift()();
    assert.equal(view.toRadius,fitted);assert.equal(sceneFit.frame.width,cameraFrameState.width);assert.equal(quiz.answered,false);
  `);
});

test('The first prepared scene frames after an image-first load but later mode toggles preserve the camera',({run})=>{
  run(`
    $('#viewport').clientWidth=768;$('#viewport').clientHeight=770;
    renderer.setSize=()=>{};renderer.setPixelRatio=()=>{};renderer.setAnimationLoop=()=>{};
    initialPresentationFramed=false;initialPresentationPending=true;fallbackMode=true;viewerImagePreference=true;viewerLoad='ready';
    resume3DView();assert.equal(initialPresentationFramed,true);assert.equal(initialPresentationPending,false);
    const box=new THREE.Box3().setFromObject(modelRoot);assert.ok(view.toTarget.distanceTo(box.getCenter(new THREE.Vector3()))<1e-8);
    manualCameraChange();view.toRadius=2.4;view.toTarget.set(.2,1.1,0);view.turn=null;view.theta=.6;view.phi=1.3;
    const before=JSON.stringify(sceneSnapshot().camera);showImageView('Image',false);resume3DView();
    assert.equal(JSON.stringify(sceneSnapshot().camera),before);
  `);
});

test('Demo keyboard navigation is bounded and reports its five steps without intercepting editable controls',({run,node})=>{
  run("activateFallback('Test');startDemo();assert.equal($('#demo-progress').value,1);");
  const press=key=>node('#demo-bar').dispatch('keydown',{key,preventDefault(){},stopPropagation(){}});
  press('ArrowLeft');run('assert.equal(demoStep,0);');
  press('ArrowRight');run("assert.equal(demoStep,1);assert.equal($('#demo-progress').value,2);");
  press('End');run("assert.equal(demoStep,4);assert.equal($('#demo-progress').value,5);assert.ok(quiz);");
  node('#demo-bar').dispatch('keydown',{key:'Home',target:{closest(){return true;}},preventDefault(){throw Error('Should not intercept input')}});
  run('assert.equal(demoStep,4);');
  press('Home');run("assert.equal(demoStep,0);assert.equal($('#demo-progress').value,1);");
  press('Escape');run("assert.equal(demoStep,-1);assert.equal($('#demo-bar').hidden,true);");
});

console.log(JSON.stringify({
  status: process.exitCode ? 'failed' : 'passed',
  passed: results.filter(r => r.status === 'passed').length,
  total: results.length,
  scope: 'Production state and event functions in Node; no visual or headset verification',
  results
}, null, 2));

