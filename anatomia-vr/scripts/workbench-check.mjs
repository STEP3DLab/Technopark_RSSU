import assert from 'node:assert/strict';
import {test} from 'node:test';
import {organs} from '../data.js';
import {contrastPairs as tasks} from '../contrast-content.js';
import {validPair, comparisonFromURL, comparisonURL, createWorkbenchState, createContrastSession, validateAttempt, workbenchKey, shuffled} from '../workbench-state.js';

const ids = organs.map(o => o.id);
const memory = (initial = {}) => {const values = {...initial};return {getItem:key => values[key] ?? null, setItem:(key,value) => {values[key] = value;}};};
function complete(taskIds, chooseCorrect = true) {
  const session = createContrastSession(tasks, taskIds, () => .5);
  while (!session.get().finished) {
    const task = tasks.find(t => t.id === session.get().id);
    session.answer(chooseCorrect ? task.answer : 1 - task.answer);
    session.next();
  }
  return session.result('2026-10-29T10:00:00Z');
}

test('contrast content has exactly eight unique, sourced, navigable tasks', () => {
  assert.equal(tasks.length, 8);
  assert.equal(new Set(tasks.map(t => t.id)).size, 8);
  for (const t of tasks) {
    assert.equal(t.options.length, 2);
    assert.ok(t.answer === 0 || t.answer === 1);
    assert.ok(t.prompt && t.why && t.options.every(Boolean));
    assert.ok(ids.includes(t.organId));
    assert.equal(new URL(t.source).protocol, 'https:');
  }
});

test('comparison links round-trip and preserve version while removing conflicting views', () => {
  const value = comparisonURL('https://example.test/anatomia/?v=1.6.0&lesson=heart&view=lesson&mode=cards&organ=heart&demo=1&token=private&student=example#detail', ['kidneyR','kidneyL'], ids);
  const url = new URL(value);
  assert.equal(url.searchParams.get('v'), '1.6.0');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['compare','v']);
  assert.equal(url.hash, '');
  assert.deepEqual(comparisonFromURL(value, ids), ['kidneyR','kidneyL']);
});

test('duplicate, unknown and malformed organ pairs cannot open a shared comparison', () => {
  for (const value of ['heart,heart','heart,bogus','heart','heart,lungL,liver','%3Cscript%3E,heart']) {
    assert.equal(comparisonFromURL(`https://example.test/?compare=${value}`, ids), null);
  }
  assert.equal(comparisonFromURL('not a URL', ids), null);
  assert.equal(comparisonFromURL('https://example.test/?compare=heart,lungL&compare=liver,gallbladder', ids), null);
  assert.equal(comparisonURL('https://example.test/', ['heart','heart'], ids), null);
  assert.equal(validPair([null,'heart'], ids), null);
});

test('first answer wins; skipping unanswered and scoring a completed question are rejected', () => {
  const session = createContrastSession(tasks, [tasks[0].id], () => .5);
  assert.equal(session.result(), null);
  assert.equal(session.next(), false);
  assert.equal(session.answer(9), false);
  assert.equal(session.answer(1 - tasks[0].answer), true);
  assert.equal(session.answer(tasks[0].answer), false);
  assert.equal(session.next(), true);
  assert.equal(session.next(), false);
  assert.equal(session.answer(tasks[0].answer), false);
  assert.equal(session.result().correct, 0);
  assert.equal(session.result().total, 1);
});

test('a full session scores each canonical answer once despite shuffled order', () => {
  const session = createContrastSession(tasks, undefined, () => .1);
  assert.notDeepEqual(session.get().ids, tasks.map(t => t.id));
  while (!session.get().finished) {
    const s = session.get(), task = tasks.find(t => t.id === s.id);
    assert.deepEqual([...s.order].sort(), [0,1]);
    assert.equal(session.answer(task.answer), true);
    session.next();
  }
  assert.equal(session.result().correct, 8);
  assert.equal(session.result().scope, 'all');
});

test('review selection removes duplicates and unknown questions, and keeps an empty request empty', () => {
  assert.equal(createContrastSession(tasks, ['missing']), null);
  assert.equal(createContrastSession(tasks, []), null);
  const session = createContrastSession(tasks, [tasks[0].id,tasks[0].id,'missing']);
  assert.equal(session.get().total, 1);
  assert.deepEqual(session.get().ids, [tasks[0].id]);
});

test('saved results reject inconsistent scores and duplicated IDs', () => {
  const valid = complete();
  assert.ok(validateAttempt(valid, tasks));
  assert.equal(validateAttempt({...valid, correct:9}, tasks), null);
  assert.equal(validateAttempt({...valid, total:7}, tasks), null);
  assert.equal(validateAttempt({...valid, answers:[valid.answers[0],valid.answers[0]], total:2,correct:2}, tasks), null);
  const changed = structuredClone(valid); changed.answers[0].choice = 2;
  assert.equal(validateAttempt(changed, tasks), null);
});

test('stored correctness labels are recomputed from the answer key', () => {
  const result = complete(undefined, false);
  result.answers.forEach(a => {a.correct = true;});
  const validated = validateAttempt(result, tasks);
  assert.equal(validated.correct, 0);
  assert.ok(validated.answers.every(a => a.correct === false));
});

test('partial review does not replace the best full-attempt result', () => {
  const storage = memory(), store = createWorkbenchState(storage, ids, tasks);
  assert.equal(store.record(complete(undefined, false)), true);
  assert.equal(store.get().best, 0);
  assert.equal(store.record(complete([tasks[0].id,tasks[1].id])), true);
  assert.equal(store.get().last.correct, 2);
  assert.equal(store.get().last.scope, 'review');
  assert.equal(store.get().best, 0);
  store.record(complete());
  assert.equal(store.get().best, 8);
  store.record(complete(undefined, false));
  assert.equal(store.get().best, 8);
  const restored = createWorkbenchState(storage, ids, tasks).get();
  assert.equal(restored.best, 8);
  assert.equal(restored.last.correct, 0);
});

test('blocked localStorage keeps working in memory and reports its limit', () => {
  const storage = {getItem(){throw new Error('Blocked');},setItem(){throw new Error('Blocked');}};
  const store = createWorkbenchState(storage, ids, tasks);
  assert.equal(store.get().persistent, false);
  assert.equal(store.setPair(['liver','gallbladder']), true);
  assert.equal(store.record(complete()), true);
  assert.equal(store.get().best, 8);
  assert.equal(store.get().persistent, false);
});

test('corrupt and untrusted saved data are handled without unusable UI state', () => {
  const store = createWorkbenchState(memory({[workbenchKey]:'{invalid'}), ids, tasks);
  assert.equal(store.get().corrupt, true);
  assert.deepEqual(store.get().pair, ['lungR','lungL']);
  assert.equal(store.setPair(['brain','heart']), true);
  assert.equal(store.get().corrupt, false);
  const invalid = createWorkbenchState(memory({[workbenchKey]:JSON.stringify({pair:['heart','heart'],best:900,last:{total:80,correct:80}})}), ids, tasks);
  assert.equal(invalid.get().best, null);
  assert.equal(invalid.get().last, null);
  assert.deepEqual(invalid.get().pair,['lungR','lungL']);
});

test('caller mutations cannot change an active session or saved state', () => {
  const session = createContrastSession(tasks, [tasks[0].id]);
  const s = session.get(); s.ids[0] = 'missing'; s.order.reverse();
  assert.equal(session.get().id, tasks[0].id);
  const store = createWorkbenchState(memory(), ids, tasks);
  store.record(complete());
  const state = store.get(); state.pair[0] = 'missing';state.last.answers[0].choice = 9;
  assert.deepEqual(store.get().pair,['lungR','lungL']);
  assert.notEqual(store.get().last.answers[0].choice,9);
});

test('shuffle does not mutate source arrays or lose entries', () => {
  const input = [0,1,2,3];
  const result = shuffled(input,() => 1);
  assert.deepEqual(input,[0,1,2,3]);
  assert.deepEqual([...result].sort(),input);
});

test('repeating all eight mistakes remains a review and cannot replace the full-attempt best', () => {
  const store = createWorkbenchState(memory(), ids, tasks);
  assert.equal(store.record(complete(undefined, false)), true);
  assert.equal(store.get().best, 0);
  const repeat = complete(tasks.map(t => t.id));
  assert.equal(repeat.scope, 'review');
  assert.equal(repeat.correct, 8);
  assert.equal(store.record(repeat), true);
  assert.equal(store.get().last.scope, 'review');
  assert.equal(store.get().best, 0);
  const reloaded = createWorkbenchState(memory({[workbenchKey]:JSON.stringify(store.get())}), ids, tasks);
  assert.equal(reloaded.get().last.scope, 'review');
  assert.equal(reloaded.get().best, 0);
});

test('malformed stored answers remain visibly corrupt after a live snapshot request', () => {
  const store = createWorkbenchState(memory({[workbenchKey]:JSON.stringify({last:{total:8,correct:8,answers:'damaged'}})}), ids, tasks);
  assert.equal(store.get().last,null);
  assert.equal(store.get().corrupt,true);
});
