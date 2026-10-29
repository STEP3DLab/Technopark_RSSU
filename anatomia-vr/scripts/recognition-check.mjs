import assert from 'node:assert/strict';
import {test} from 'node:test';
import {organs} from '../data.js';
import {createRecognitionSession, createRecognitionState, validateRecognitionAttempt, validateRecognitionRecord, recognitionKey, recognitionGroup, recognitionLabel} from '../recognition-state.js';

const memory = initial => {const values = {...initial};return {getItem:key => values[key] ?? null,setItem:(key,value) => {values[key] = value;}};};
function seeded(seed) {return () => {seed = (1664525 * seed + 1013904223) >>> 0;return seed / 4294967296;};}
function complete({mode = 'visual',scope = 'full',organIds,wrong = false,skip = [],seed = 51} = {}) {
  const session = createRecognitionSession(organs,{mode,scope,organIds,random:seeded(seed)});
  while (!session.get().finished) {
    const s = session.get();
    if (skip.includes(s.index)) {session.setImageStatus('error');assert.equal(session.skip(),true);}
    else {session.setImageStatus('ready');assert.equal(session.answer(wrong ? s.current.options.find(id => id !== s.current.organId) : s.current.organId),true);}
    assert.equal(session.next(),true);
  }
  return session.result('2026-10-29T11:20:00.000Z');
}

test('full attempts contain 8 distinct groups and 4 unambiguous answer choices', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const session = createRecognitionSession(organs,{random:seeded(seed)}), targetGroups = new Set();
    assert.equal(session.get().total,8);
    while (!session.get().finished) {
      const s = session.get(), group = recognitionGroup(s.current.organId);
      assert.equal(targetGroups.has(group),false);
      targetGroups.add(group);
      assert.equal(s.current.options.length,4);
      assert.equal(new Set(s.current.options.map(recognitionGroup)).size,4);
      assert.ok(s.current.options.includes(s.current.organId));
      assert.ok(s.current.options.every(id => organs.some(o => o.id === id)));
      session.setImageStatus('ready');session.answer(s.current.organId);session.next();
    }
  }
});

test('random full attempts can use every original model, including both sides', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 70; seed++) complete({seed:Math.imul(seed,2654435761) >>> 0}).answers.forEach(a => seen.add(a.organId));
  assert.deepEqual([...seen].sort(),organs.map(o => o.id).sort());
});

test('paired structures use a side-neutral option label but preserve actual model IDs', () => {
  for (const id of ['lungR','lungL']) assert.equal(recognitionLabel(organs.find(o => o.id === id)),'Лёгкое');
  for (const id of ['kidneyR','kidneyL']) assert.equal(recognitionLabel(organs.find(o => o.id === id)),'Почка');
  const result = complete({scope:'review',organIds:['lungL']});
  assert.equal(result.answers[0].organId,'lungL');
  assert.equal(result.answers[0].choice,'lungL');
  assert.equal(result.answers[0].options.includes('lungR'),false);
});

test('visual answers are blocked until the image is ready, including after an error', () => {
  const s = createRecognitionSession(organs,{scope:'review',organIds:['heart']});
  assert.equal(s.get().imageStatus,'loading');
  assert.equal(s.answer('heart'),false);
  assert.equal(s.next(),false);
  s.setImageStatus('error');assert.equal(s.answer('heart'),false);
  s.setImageStatus('loading');assert.equal(s.answer('heart'),false);
  s.setImageStatus('ready');assert.equal(s.answer('heart'),true);
});

test('skipping is possible only after an image failure and never awards a point', () => {
  const s = createRecognitionSession(organs,{scope:'review',organIds:['heart']});
  assert.equal(s.skip(),false);
  s.setImageStatus('ready');assert.equal(s.skip(),false);
  s.setImageStatus('error');assert.equal(s.skip(),true);
  assert.equal(s.skip(),false);assert.equal(s.answer('heart'),false);
  s.next();const result = s.result();
  assert.equal(result.correct,0);assert.equal(result.skipped,1);
  assert.equal(result.answers[0].choice,null);assert.equal(result.answers[0].outcome,'skipped');
});

test('first answer wins and a completed question cannot score twice', () => {
  const s = createRecognitionSession(organs,{scope:'review',organIds:['heart']});
  assert.equal(s.result(),null);s.setImageStatus('ready');
  const wrong = s.get().current.options.find(id => id !== 'heart');
  assert.equal(s.answer('missing'),false);assert.equal(s.answer(wrong),true);
  assert.equal(s.answer('heart'),false);assert.equal(s.setImageStatus('error'),false);
  assert.equal(s.next(),true);assert.equal(s.next(),false);assert.equal(s.answer('heart'),false);
  assert.equal(s.result().correct,0);assert.equal(s.result().answers.length,1);
});

test('image readiness resets between visual questions', () => {
  const s = createRecognitionSession(organs,{scope:'review',organIds:['heart','brain']});
  s.setImageStatus('ready');s.answer(s.get().current.organId);s.next();
  assert.equal(s.get().imageStatus,'loading');
  assert.equal(s.answer(s.get().current.organId),false);
});

test('a mixed completed visual attempt reports skips and wrong answers accurately', () => {
  const result = complete({wrong:true,skip:[0,3]});
  assert.equal(result.total,8);assert.equal(result.correct,0);assert.equal(result.skipped,2);
  assert.equal(result.answers.filter(a => a.outcome === 'wrong').length,6);
  assert.ok(validateRecognitionAttempt(result,organs));
});

test('verbal mode starts ready, cannot skip, and is recorded as a separate mode', () => {
  const s = createRecognitionSession(organs,{mode:'verbal'});
  assert.equal(s.get().imageStatus,'ready');assert.equal(s.skip(),false);
  assert.equal(s.setImageStatus('error'),false);
  assert.equal(s.answer(s.get().current.organId),true);
  assert.equal(complete({mode:'verbal'}).mode,'verbal');
});

test('review uses only requested valid errors, deduplicates groups, and does not silently restart', () => {
  const s = createRecognitionSession(organs,{scope:'review',organIds:['heart','heart','lungL','lungR','missing']});
  assert.equal(s.get().total,2);assert.equal(s.get().scope,'review');
  assert.equal(createRecognitionSession(organs,{scope:'review',organIds:[]}),null);
  assert.equal(createRecognitionSession(organs,{scope:'review',organIds:['missing']}),null);
  assert.equal(createRecognitionSession(organs,{scope:'review'}),null);
  assert.equal(createRecognitionSession(organs,{mode:'invalid'}),null);
  assert.equal(createRecognitionSession(organs,{scope:'full',organIds:['heart']}),null);
});

test('even a review of all 8 failed questions cannot update the full-attempt record', () => {
  const store = createRecognitionState(memory(),organs), failed = complete({wrong:true});
  assert.equal(store.record(failed),true);assert.equal(store.get().visual.best,0);
  const review = complete({scope:'review',organIds:failed.answers.map(a => a.organId)});
  assert.equal(review.total,8);assert.equal(review.scope,'review');assert.equal(review.correct,8);
  assert.equal(store.record(review),true);assert.equal(store.get().visual.best,0);
  assert.equal(store.get().visual.last.correct,8);
});

test('visual and verbal best and last attempts remain independent after persistence', () => {
  const storage = memory(), store = createRecognitionState(storage,organs);
  store.record(complete({wrong:true}));store.record(complete({mode:'verbal'}));
  assert.equal(store.get().visual.best,0);assert.equal(store.get().verbal.best,8);
  assert.equal(store.get().visual.last.mode,'visual');assert.equal(store.get().verbal.last.mode,'verbal');
  const restored = createRecognitionState(storage,organs).get();
  assert.equal(restored.visual.best,0);assert.equal(restored.verbal.best,8);
  assert.ok(validateRecognitionRecord(restored,organs));
});

test('malformed scores, outcomes, options, dates and mode mixing are rejected', () => {
  const valid = complete();
  const mutations = [
    x => {x.correct = 99;}, x => {x.total = 7;}, x => {x.skipped = 1;},x => {x.version = 0;},
    x => {x.completedAt = 'invalid';},x => {x.answers[0].outcome = 'wrong';},
    x => {x.answers[0].options[1] = 'missing';}, x => {x.answers[0].choice = 'missing';},
    x => {x.answers[0].options = [x.answers[0].organId,x.answers[0].organId,'lungR','kidneyR'];},
    x => {x.answers[1] = {...x.answers[0]};}
  ];
  for (const mutate of mutations) {const value = structuredClone(valid);mutate(value);assert.equal(validateRecognitionAttempt(value,organs),null);}
  const verbalSkip = complete({skip:[0]});verbalSkip.mode = 'verbal';
  assert.equal(validateRecognitionAttempt(verbalSkip,organs),null);
});

test('a saved record with any invalid last attempt is marked corrupt instead of silently hidden', () => {
  const store = createRecognitionState(memory(),organs);store.record(complete());
  const record = store.get();record.visual.last.correct = 99;
  assert.equal(validateRecognitionRecord(record,organs),null);
  const restored = createRecognitionState(memory({[recognitionKey]:JSON.stringify(record)}),organs).get();
  assert.equal(restored.corrupt,true);assert.equal(restored.visual.last,null);
  const mixed = store.get();mixed.verbal.last = mixed.visual.last;
  assert.equal(validateRecognitionRecord(mixed,organs),null);
});

test('corrupt JSON and blocked localStorage leave a usable session-local result', () => {
  const corrupt = createRecognitionState(memory({[recognitionKey]:'{' }),organs);
  assert.equal(corrupt.get().corrupt,true);corrupt.record(complete());assert.equal(corrupt.get().corrupt,false);
  const blocked = createRecognitionState({getItem(){throw new Error('Blocked');},setItem(){throw new Error('Blocked');}},organs);
  assert.equal(blocked.get().persistent,false);assert.equal(blocked.record(complete()),true);
  assert.equal(blocked.get().visual.best,8);assert.equal(blocked.get().persistent,false);
});

test('caller mutation cannot change active question options or saved outcomes', () => {
  const s = createRecognitionSession(organs);const first = s.get(), target = first.current.organId;
  first.current.organId = 'missing';first.current.options.push('missing');
  assert.equal(s.get().current.organId,target);assert.equal(s.get().current.options.length,4);
  const store = createRecognitionState(memory(),organs);store.record(complete());
  const read = store.get();read.visual.last.answers[0].outcome = 'wrong';read.visual.best = 100;
  assert.equal(store.get().visual.best,8);assert.equal(store.get().visual.last.answers[0].outcome,'correct');
});
