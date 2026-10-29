import assert from 'node:assert/strict';
import {test} from 'node:test';
import {organs,cases} from '../data.js';
import {teachingModules} from '../teaching-content.js';
import {contrastPairs} from '../contrast-content.js';
import {createRecognitionSession} from '../recognition-state.js';
import {buildProgressReport,exportProgressReport,readReportStorage,reportKeys,validateAtlasAttempt,validateLabAttempt,validateContrastAttempt} from '../progress-report-state.js';

const now = '2026-10-29T12:00:00.000Z';
const memory = values => ({getItem:key => values?.[key] ?? null,setItem(){throw new Error('Report must not write');},removeItem(){throw new Error('Report must not remove');}});
const blocked = {getItem(){throw new Error('Storage blocked');},setItem(){throw new Error('Report must not write');}};
function atlas({scope,ids = organs.slice(0,8).map(organ => organ.id),wrong = []} = {}) {
  const answers = ids.map(id => {const organ = organs.find(item => item.id === id);const correct = !wrong.includes(id);return {item:id,organ:id,answer:correct ? organ.answer : (organ.answer + 1) % organ.options.length,correct};});
  return {type:'function',score:answers.filter(answer => answer.correct).length,total:answers.length,answers,date:now,...(scope ? {scope} : {})};
}
function laboratory(scope = 'all',revealed = []) {
  const selected = scope === 'organ' ? teachingModules.heart.questions : Object.values(teachingModules).flatMap(module => module.questions);
  const answers = selected.map(question => ({id:question.id,correct:!revealed.includes(question.id),revealed:revealed.includes(question.id)}));
  return {scope,organ:scope === 'organ' ? 'heart' : null,correct:answers.filter(answer => answer.correct).length,total:answers.length,completedAt:now,answers};
}
function contrast(scope = 'all',count = 8) {
  const answers = contrastPairs.slice(0,count).map(task => ({id:task.id,choice:task.answer,correct:true}));
  return {scope,correct:answers.length,total:answers.length,completedAt:now,answers};
}
function recognition(mode,scope = 'full') {
  const session = createRecognitionSession(organs,{mode,scope,...(scope === 'review' ? {organIds:['heart','liver']} : {}),random:() => .31});
  while (!session.get().finished) {
    if (mode === 'visual') session.setImageStatus('ready');
    session.answer(session.get().current.organId); session.next();
  }
  return session.result(now);
}

test('reads all five records without writing or deleting existing state',() => {
  const values = {[reportKeys.atlas]:JSON.stringify({viewed:['heart'],lastAttempt:atlas()})};
  const before = JSON.stringify(values);
  const result = buildProgressReport({storage:memory(values),now});
  assert.deepEqual(result.viewed,['heart']);
  assert.equal(result.attempts.atlas.correct,8);
  assert.equal(JSON.stringify(values),before);
});

test('legacy atlas score of eight is not invented into a complete standard attempt',() => {
  const result = validateAtlasAttempt(atlas());
  assert.equal(result.scope,'unknown');
  assert.equal(result.correct,8);
  assert.equal(validateAtlasAttempt(atlas({scope:'standard'})).scope,'standard');
  assert.equal(validateAtlasAttempt(atlas({scope:'standard',ids:['heart']})),null);
});

test('full-length repeats remain reviews across the atlas, contrast, and lab',() => {
  assert.equal(validateAtlasAttempt(atlas({scope:'review'})).scope,'review');
  assert.equal(validateContrastAttempt(contrast('review')).scope,'review');
  assert.equal(validateLabAttempt(laboratory('review')).scope,'review');
});

test('atlas rejects forged totals, duplicate items, and answers inconsistent with the key',() => {
  const valid = atlas({scope:'standard',wrong:['heart']});
  assert.equal(validateAtlasAttempt(valid).correct,7);
  assert.equal(validateAtlasAttempt({...valid,score:8}),null);
  const duplicate = structuredClone(valid); duplicate.answers[1] = duplicate.answers[0];
  assert.equal(validateAtlasAttempt(duplicate),null);
  const falseLabel = structuredClone(valid); falseLabel.answers[0].correct = true;
  assert.equal(validateAtlasAttempt(falseLabel),null);
  const unknown = structuredClone(valid); unknown.answers[0].organ = '<script>';
  assert.equal(validateAtlasAttempt(unknown),null);
});

test('spatial and case answers keep their own validators and denominators',() => {
  const answer = {item:'heart',organ:'heart',answer:'heart',correct:true};
  const found = validateAtlasAttempt({type:'find',scope:'custom',score:1,total:1,date:now,answers:[answer]});
  assert.equal(found.type,'find'); assert.equal(found.total,1);
  const answers = cases.map(item => ({item,organ:item.target,answer:item.answer,correct:true}));
  assert.equal(validateAtlasAttempt({type:'case',scope:'standard',score:cases.length,total:cases.length,answers}).total,cases.length);
});

test('legacy laboratory reports preserve only recorded information',() => {
  const result = validateLabAttempt({correct:2,total:3});
  assert.equal(result.scope,'unknown');
  assert.equal(result.revealed,null);
  assert.equal(result.completedAt,null);
  assert.equal(result.canRetry,false);
  assert.equal(result.verification,'legacy-summary');
  assert.deepEqual(result.mistakes,[]);
});

test('revealed laboratory answers remain distinguishable from correct answers',() => {
  const result = validateLabAttempt(laboratory('all',['heart-1']));
  assert.equal(result.correct,8); assert.equal(result.total,9); assert.equal(result.revealed,1);
  assert.equal(result.mistakes[0].id,'heart-1'); assert.equal(result.mistakes[0].revealed,true);
  const forged = laboratory('all',['heart-1']); forged.answers[0].correct = true;
  assert.equal(validateLabAttempt(forged),null);
  const wrongTopic = laboratory('organ'); wrongTopic.organ = 'lungs';
  assert.equal(validateLabAttempt(wrongTopic),null);
});

test('contrast correctness is checked against the content rather than saved labels',() => {
  const value = contrast(); value.answers[0].choice = 1 - value.answers[0].choice; value.correct = 7;
  const result = validateContrastAttempt(value);
  assert.equal(result.correct,7); assert.equal(result.mistakes.length,1);
  assert.equal(result.mistakes[0].id,contrastPairs[0].id);
  assert.equal(validateContrastAttempt({...value,correct:8}),null);
});

test('views, card self-assessments, and results never become one mastery score',() => {
  const model = buildProgressReport({storage:memory(),live:{atlas:{viewed:['heart','heart','liver','unknown'],lastAttempt:atlas({scope:'review',ids:['heart']})},learning:{ratings:{heart:'remember',liver:'repeat',brain:'unrecognized'},favorites:['heart','heart','unknown']},lab:{lastAttempt:laboratory()}},now});
  assert.deepEqual(model.viewed,['heart','liver']);
  assert.deepEqual(model.selfAssessment.remember,['heart']);
  assert.deepEqual(model.selfAssessment.repeat,['liver']);
  assert.equal(model.selfAssessment.unrated.length,14);
  assert.equal(model.attempts.atlas.total,1);
  assert.equal(model.attempts.lab.total,9);
  assert.equal(Object.hasOwn(model,'score'),false);
  assert.equal(Object.hasOwn(model,'mastery'),false);
  assert.equal(model.systems.reduce((count,system) => count + system.viewed.length,0),2);
});

test('live resets and blocked-storage state override stale records',() => {
  const storage = memory({[reportKeys.atlas]:JSON.stringify({viewed:['heart'],lastAttempt:atlas()})});
  const reset = buildProgressReport({storage,live:{atlas:{viewed:[],best:{},persistent:false}},now});
  assert.deepEqual(reset.viewed,[]); assert.equal(reset.attempts.atlas,null); assert.equal(reset.availability.atlas,'session');
  const session = buildProgressReport({storage:blocked,live:{atlas:{viewed:['brain'],persistent:false},learning:{ratings:{brain:'repeat'},persistent:false}},now});
  assert.deepEqual(session.viewed,['brain']); assert.deepEqual(session.selfAssessment.repeat,['brain']);
  assert.equal(session.availability.lab,'unavailable');
  assert.ok(session.notices.some(notice => notice.source === 'atlas' && notice.kind === 'session'));
});

test('corrupt or invalid records are reported without erasing unrelated valid results',() => {
  const storage = memory({[reportKeys.atlas]:'{broken',[reportKeys.learning]:'[]',[reportKeys.lab]:JSON.stringify({lastAttempt:{correct:90,total:9}}),[reportKeys.contrast]:JSON.stringify({last:contrast()})});
  const read = readReportStorage(storage);
  assert.equal(read.availability.atlas,'corrupt'); assert.equal(read.availability.learning,'corrupt');
  const result = buildProgressReport({storage,now});
  assert.equal(result.attempts.lab,null); assert.equal(result.attempts.contrast.correct,8);
  assert.ok(result.notices.some(notice => notice.source === 'lab' && notice.kind === 'invalid-attempt'));
});

test('visual and verbal recognition remain separate with full and review scopes intact',() => {
  const visual = recognition('visual'), verbal = recognition('verbal','review');
  const record = {version:1,visual:{best:8,last:visual},verbal:{best:null,last:verbal}};
  const model = buildProgressReport({storage:memory(),live:{recognition:record},now});
  assert.equal(model.attempts.recognitionVisual.total,8); assert.equal(model.attempts.recognitionVisual.scope,'full');
  assert.equal(model.attempts.recognitionVerbal.total,2); assert.equal(model.attempts.recognitionVerbal.scope,'review');
  const invalid = structuredClone(record); invalid.visual.last.answers[0].outcome = 'wrong';
  const corrupted = buildProgressReport({storage:memory(),live:{recognition:invalid},now});
  assert.equal(corrupted.attempts.recognitionVisual,null);
  assert.ok(corrupted.notices.some(notice => notice.source === 'recognition' && notice.kind === 'invalid-attempt'));
});

test('visual skipped image is retained as skipped rather than an incorrect recognition',() => {
  const session = createRecognitionSession(organs,{mode:'visual',scope:'review',organIds:['heart'],random:() => .1});
  session.setImageStatus('error'); session.skip(); session.next();
  const record = {version:1,visual:{best:null,last:session.result(now)},verbal:{best:null,last:null}};
  const model = buildProgressReport({storage:memory(),live:{recognition:record},now});
  assert.equal(model.attempts.recognitionVisual.skipped,1);
  assert.equal(model.attempts.recognitionVisual.correct,0);
  assert.equal(model.attempts.recognitionVisual.mistakes[0].skipped,true);
});

test('JSON export excludes personal, raw, and untrusted fields while retaining interpretation',() => {
  const model = buildProgressReport({storage:memory(),live:{atlas:{viewed:['heart'],name:'PERSONAL-NAME',email:'private@example.test',patient:'SENSITIVE',lastAttempt:atlas({scope:'review',ids:['heart']})},learning:{ratings:{heart:'remember'},freeText:'PRIVATE'}},now});
  const exported = exportProgressReport(model), text = JSON.stringify(exported);
  assert.equal(exported.version,'1.7.0'); assert.equal(exported.generatedAt,now);
  assert.ok(exported.meanings.viewed && exported.meanings.selfAssessment && exported.meanings.unknownScope);
  assert.equal(exported.attempts.atlas.scope,'review'); assert.equal(exported.attempts.atlas.total,1);
  for (const value of ['PERSONAL-NAME','private@example.test','SENSITIVE','PRIVATE']) assert.ok(!text.includes(value));
  assert.equal(Object.hasOwn(exported,'totalScore'),false);
  exported.viewedIds.push('brain');
  assert.deepEqual(model.viewed,['heart']);
});
