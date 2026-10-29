import assert from 'node:assert/strict';
import {test} from 'node:test';
import {organs} from '../data.js';
import {normalizeScene, scenePresets, sceneURL, sceneFromURL, createSceneStore, sceneKey, sceneLimit} from '../scene-state.js';

const ids = organs.map(organ => organ.id);
const date = '2026-10-29T11:00:00.000Z';
const clock = {now:() => date, random:() => .5};
const scene = (changes = {}) => ({
  v:1, selected:'heart', hidden:[], system:'all', isolated:false, context:false,
  pair:null, skeleton:true, labels:false, contextOpacity:.075,
  camera:{theta:.13, phi:1.52, radius:1.88, target:[0,1.26,0]}, ...changes
});
function memory(initial = {}) {
  const values = new Map(Object.entries(initial)), writes = [];
  return {
    values, writes,
    getItem:key => values.get(key) ?? null,
    setItem(key,value) { writes.push(key); values.set(key,value); }
  };
}
const encoded = input => Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
const shared = input => `https://example.test/anatomia/?scene=${encoded(input)}`;

test('scene presets contain exact known structures and cannot mutate the source lists', () => {
  assert.equal(scenePresets.length, 4);
  assert.deepEqual(scenePresets.find(p => p.id === 'all').ids, ids);
  assert.deepEqual(scenePresets.find(p => p.id === 'cardiorespiratory').ids, ['heart','lungR','lungL','airway']);
  assert.deepEqual(scenePresets.find(p => p.id === 'urinary').ids, ['kidneyR','kidneyL','bladder']);
  for (const preset of scenePresets) {
    assert.equal(new Set(preset.ids).size, preset.ids.length);
    assert.ok(preset.ids.every(id => ids.includes(id)));
    assert.ok(Object.isFrozen(preset) && Object.isFrozen(preset.ids));
  }
});

test('a complete snapshot round-trips without sharing private metadata or unrelated URL state', () => {
  const input = scene({name:'Студент Иванов', answers:[1], patient:'private'});
  const url = new URL(sceneURL('https://example.test/anatomia/?v=1.8.0&organ=heart&mode=cards&token=secret#private', input));
  assert.deepEqual([...url.searchParams.keys()].sort(), ['scene','v']);
  assert.equal(url.searchParams.get('v'), '1.8.0');
  assert.equal(url.hash, '');
  assert.deepEqual(sceneFromURL(url.href), scene());
  const payload = JSON.parse(Buffer.from(url.searchParams.get('scene'), 'base64url').toString('utf8'));
  assert.deepEqual(Object.keys(payload), Object.keys(scene()));
  assert.equal(JSON.stringify(payload).includes('private'), false);
});

test('only supported finite geometry and strict boolean display settings are accepted', () => {
  for (const change of [{v:'1'}, {v:2}, {selected:'unknown'}, {system:'unknown'}, {hidden:['unknown']}, {hidden:['liver','liver']}, {hidden:Array(1)}, {pair:[]}, {labels:1}, {skeleton:'true'}, {isolated:null}, {contextOpacity:NaN}, {contextOpacity:.301}]) {
    assert.equal(normalizeScene(scene(change)), null, JSON.stringify(change));
  }
  for (const field of Object.keys(scene())) {
    const input = scene(); delete input[field];
    assert.equal(normalizeScene(input), null, `Missing ${field}`);
  }
  for (const change of [{theta:Infinity}, {phi:.099}, {radius:.179}, {radius:25.001}, {target:[0,6,0]}, {target:[0,0,Infinity]}, {target:Array(3)}, {target:[0,0]}]) {
    const input = scene(); Object.assign(input.camera, change);
    assert.equal(normalizeScene(input), null);
  }
});

test('selected structures stay visible and the snapshot rejects contradictory filters and isolation', () => {
  for (const input of [scene({hidden:['heart']}), scene({hidden:ids}), scene({system:'urinary'}), scene({context:true})]) assert.equal(normalizeScene(input), null);
  assert.ok(normalizeScene(scene({selected:'kidneyL', system:'urinary', hidden:['kidneyR']})));
  assert.ok(normalizeScene(scene({isolated:true, context:true})));
  assert.ok(normalizeScene(scene({hidden:ids.filter(id => id !== 'heart')})));
});

test('a paired snapshot retains pair order and rejects an ambiguous or partly hidden pair', () => {
  const pair = scene({selected:'lungL', isolated:true, pair:['lungR','lungL']});
  assert.deepEqual(normalizeScene(pair).pair, ['lungR','lungL']);
  for (const change of [{pair:['lungR','lungR']}, {pair:['lungR','unknown']}, {pair:['lungR','lungL','heart']}, {selected:'heart'}, {isolated:false}, {system:'resp'}, {hidden:['liver']}]) {
    assert.equal(normalizeScene({...pair, ...change}), null);
  }
});

test('camera limits including existing closeups remain stable through repeated serialization', () => {
  for (const phi of [.1, Math.PI - .1]) for (const radius of [.18,25]) for (const theta of [-Math.PI, Math.PI, .13 + 24 * Math.PI]) {
    const input = scene(); input.camera = {theta,phi,radius,target:[-5,-2,5]};
    const normalized = normalizeScene(input);
    assert.ok(normalized);
    assert.deepEqual(normalizeScene(normalized), normalized);
    assert.deepEqual(sceneFromURL(sceneURL('https://example.test/', normalized)), normalized);
    assert.ok(Math.abs(Math.sin(normalized.camera.theta) - Math.sin(theta)) < 1e-6);
    assert.ok(Math.abs(Math.cos(normalized.camera.theta) - Math.cos(theta)) < 1e-6);
  }
});

test('canonical hidden ordering and copied vectors cannot be changed through caller references', () => {
  const input = scene({hidden:['kidneyL','liver']});
  const normalized = normalizeScene(input);
  assert.deepEqual(normalized.hidden, ['liver','kidneyL']);
  input.hidden.push('brain'); input.camera.target[1] = 4;
  assert.deepEqual(normalized.hidden, ['liver','kidneyL']);
  assert.equal(normalized.camera.target[1], 1.26);
  assert.equal(sceneURL('https://example.test/', scene({hidden:['liver','kidneyL']})), sceneURL('https://example.test/', scene({hidden:['kidneyL','liver']})));
});

test('shared scenes reject conflicting routes, duplicates, malformed encodings and oversized payloads', () => {
  const value = encoded(scene());
  for (const key of ['organ','compare','lesson','practice','mode','demo','view']) assert.equal(sceneFromURL(`https://example.test/?scene=${value}&${key}=anything`), null);
  for (const query of [`scene=${value}&scene=${value}`, 'scene=', 'scene=a', 'scene=!!!', 'scene='+ 'a'.repeat(3001), 'scene='+Buffer.from('not JSON').toString('base64url'), 'scene='+encoded({v:2}), 'scene='+Buffer.from([0xff,0xfe]).toString('base64url')]) {
    assert.equal(sceneFromURL('https://example.test/?'+query), null);
  }
});

test('URL creation rejects unsafe bases and never preserves ambiguous versions or credentials', () => {
  for (const base of ['not a URL','javascript:alert(1)','data:text/html,test','file:///tmp/test.html','https://user:secret@example.test/']) {
    assert.equal(sceneURL(base, scene()), null);
    assert.equal(sceneFromURL(base), null);
  }
  for (const params of ['v=1.8.0&v=1.7.0','v=private','v=1234.8.0']) {
    const url = new URL(sceneURL('https://example.test/?'+params, scene()));
    assert.deepEqual([...url.searchParams.keys()], ['scene']);
  }
});

test('prototype fields and extra snapshot data do not enter normalized views', () => {
  const input = JSON.parse(JSON.stringify(scene()).replace('"v":1', '"__proto__":{"polluted":true},"v":1'));
  input.camera.extra = {personal:'private'};
  const normalized = normalizeScene(input);
  assert.ok(normalized);
  assert.equal(Object.hasOwn(normalized, '__proto__'), false);
  assert.deepEqual(Object.keys(normalized.camera), ['theta','phi','radius','target']);
  assert.equal({}.polluted, undefined);
  const inherited = Object.create(scene());
  assert.equal(normalizeScene(inherited), null);
});

test('saved scenes persist names and dates, remain ordered, and can be renamed or removed independently', () => {
  const storage = memory({'unrelated-results':'keep'}), store = createSceneStore(storage, clock);
  const first = store.save('  Сердце спереди  ', scene());
  const second = store.save('Сердце спереди', scene({labels:true}));
  assert.ok(first.ok && second.ok && first.id !== second.id);
  assert.deepEqual(store.get().items.map(item => item.id), [first.id,second.id]);
  assert.equal(store.get().items[0].name, 'Сердце спереди');
  assert.equal(store.get().items[0].createdAt, date);
  assert.equal(store.rename(first.id, 'Ракурс для занятия'), true);
  assert.equal(store.rename('missing', 'Другой'), false);
  assert.equal(store.remove(first.id), true);
  assert.equal(store.remove(first.id), false);
  const restored = createSceneStore(storage).get();
  assert.equal(restored.items.length, 1);
  assert.equal(restored.items[0].id, second.id);
  assert.equal(storage.values.get('unrelated-results'), 'keep');
  assert.ok(storage.writes.every(key => key === sceneKey));
});

test('invalid names and snapshots do not change an existing store or write partial data', () => {
  const storage = memory(), store = createSceneStore(storage, clock);
  store.save('Первый', scene());
  const before = store.get(), writes = storage.writes.length;
  for (const name of ['', '   ', 'a'.repeat(61), 'Имя\nракурса', 12, null]) assert.deepEqual(store.save(name, scene()), {ok:false,reason:'name'});
  assert.deepEqual(store.save('Имя', scene({selected:'unknown'})), {ok:false,reason:'scene'});
  assert.equal(store.rename(before.items[0].id, ''), false);
  assert.equal(storage.writes.length, writes);
  assert.deepEqual(store.get(), before);
});

test('the twelve-scene limit never silently replaces an earlier view', () => {
  const storage = memory(), store = createSceneStore(storage, clock);
  for (let index = 0; index < sceneLimit; index++) assert.ok(store.save('Вид '+index, scene()).ok);
  const before = store.get();
  assert.deepEqual(store.save('Лишний', scene()), {ok:false,reason:'limit'});
  assert.deepEqual(store.get(), before);
  assert.equal(new Set(before.items.map(item => item.id)).size, sceneLimit);
  store.remove(before.items[0].id);
  assert.ok(store.save('Освободилось место', scene()).ok);
});

test('blocked storage retains a useful in-memory collection with an honest persistence flag', () => {
  const blocked = {getItem(){throw new Error('blocked');}, setItem(){throw new Error('blocked');}};
  const store = createSceneStore(blocked, clock);
  assert.equal(store.get().persistent, false);
  const saved = store.save('Ракурс', scene());
  assert.equal(saved.ok, true);
  assert.equal(store.get().persistent, false);
  assert.equal(store.get().items[0].name, 'Ракурс');
  assert.equal(store.rename(saved.id, 'Новое имя'), true);
  assert.equal(store.remove(saved.id), true);
});

test('malformed storage is reported without clearing results or writing during a read', () => {
  for (const raw of ['{broken','null','[]',JSON.stringify({v:2,items:[]}),JSON.stringify({v:1,items:{}}),'a'.repeat(100001)]) {
    const storage = memory({[sceneKey]:raw, 'anatomia-progress-v1':'keep'});
    const state = createSceneStore(storage, clock).get();
    assert.equal(state.corrupt, true);
    assert.deepEqual(state.items, []);
    assert.equal(storage.writes.length, 0);
    assert.equal(storage.values.get('anatomia-progress-v1'), 'keep');
  }
});

test('valid saved views survive corrupt neighbours, duplicated IDs and impossible calendar dates', () => {
  const good = {id:'scene-good',name:'Проверенный вид',createdAt:date,scene:scene()};
  const badItems = [null, {...good}, {...good,id:'bad-camera',scene:scene({camera:{theta:0,phi:1,radius:0,target:[0,0,0]}})}, {...good,id:'bad-date',createdAt:'2026-02-31T11:00:00Z'}, {...good,id:'bad-name',name:''}];
  const storage = memory({[sceneKey]:JSON.stringify({v:1,items:[good,...badItems]})});
  const store = createSceneStore(storage, clock);
  assert.equal(store.get().corrupt, true);
  assert.deepEqual(store.get().items, [good]);
  assert.equal(storage.writes.length, 0);
  assert.ok(store.save('Новый', scene()).ok);
  assert.equal(store.get().corrupt, false);
  assert.equal(createSceneStore(storage).get().items.length, 2);
});

test('mutating saved input or returned collections cannot alter stored cameras, hidden sets or names', () => {
  const store = createSceneStore(memory(), clock), input = scene({hidden:['liver']});
  const saved = store.save('Оригинал', input);
  input.camera.target[1] = 4; input.hidden.push('brain');
  const view = store.get();
  view.items[0].name = 'Подмена'; view.items[0].scene.hidden.push('brain'); view.items[0].scene.camera.target[1] = 5;
  const item = store.get().items[0];
  assert.equal(item.id, saved.id); assert.equal(item.name, 'Оригинал');
  assert.deepEqual(item.scene.hidden, ['liver']); assert.equal(item.scene.camera.target[1], 1.26);
});

test('invalid clocks cannot fabricate dates and deterministic IDs stay unique after reload', () => {
  const storage = memory(), bad = createSceneStore(storage, {now:()=>'yesterday'});
  assert.deepEqual(bad.save('Вид', scene()), {ok:false,reason:'clock'});
  assert.equal(storage.writes.length, 0);
  const first = createSceneStore(storage, clock).save('Первый', scene());
  const restored = createSceneStore(storage, clock), second = restored.save('Второй', scene());
  assert.notEqual(first.id, second.id);
  const noRandom = createSceneStore(memory(), {...clock,random:()=>{throw new Error('Unavailable');}});
  assert.ok(noRandom.save('Вид', scene()).ok);
});
