import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three.module.min.js';
import * as data from '../data.js';
import * as experience from '../experience.js';

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
  const document = {activeElement: null};
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
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById(id) { return node('#' + id); },
    body: node('body')
  });
  const storage = new Map();
  const context = vm.createContext({
    THREE, ...data, ...experience, assert, console, URL, URLSearchParams, document,
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
  run(`activateFallback('Test');startQuiz('find',['heart']);assert.equal(quiz,null);startLesson('lungs');assert.equal(lesson,null);practice();assert.ok($('#modal-content').innerHTML.includes('disabled'));`);
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

console.log(JSON.stringify({
  status: process.exitCode ? 'failed' : 'passed',
  passed: results.filter(r => r.status === 'passed').length,
  total: results.length,
  scope: 'Production state and event functions in Node; no visual or headset verification',
  results
}, null, 2));

