import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createLayerState, matchingParts, labTerm, labURL, labFromURL} from '../anatomy-lab-state.js';

// Small named fixtures exercise layer transitions independently of source mesh topology.
const heart = Object.freeze([
  Object.freeze({id:'heart-wall',name:'Стенка сердца',latin:'Cor',sourceLabel:'Heart wall',side:null}),
  Object.freeze({id:'left-atrium',name:'Левое предсердие',latin:'Atrium sinistrum',sourceLabel:'Left atrium',side:'left'}),
  Object.freeze({id:'right-atrium',name:'Правое предсердие',latin:'Atrium dextrum',sourceLabel:'Right atrium',side:'right'}),
  Object.freeze({id:'aortic-valve',name:'Аортальный клапан',latin:'Valva aortae',sourceLabel:'Aortic valve',side:null})
]);
const brain = Object.freeze([
  Object.freeze({id:'cerebellum-left',name:'Левое полушарие мозжечка',latin:'Cerebellum',sourceLabel:'Left cerebellum',side:'left'}),
  Object.freeze({id:'brainstem',name:'Ствол головного мозга',latin:'Truncus encephali',sourceLabel:'Brainstem',side:null})
]);
const definitions = Object.freeze({heart:Object.freeze({parts:heart}),brain:Object.freeze({parts:brain})});
const ids = heart.map(part=>part.id);

test('new layer states show every structure and do not invent a selected part',()=>{
  const layers = createLayerState(heart);
  assert.deepEqual(layers.get(),{visible:ids,selected:null});
  assert.throws(()=>createLayerState([]));
  assert.throws(()=>createLayerState([heart[0],heart[0]]));
});

test('hiding and restoring a group preserves source order and clears only hidden selections',()=>{
  const layers = createLayerState(heart);
  layers.select('left-atrium');
  assert.equal(layers.visibility(['heart-wall','aortic-valve'],false),true);
  assert.deepEqual(layers.get(),{visible:['left-atrium','right-atrium'],selected:'left-atrium'});
  assert.equal(layers.visibility(['left-atrium'],false),true);
  assert.deepEqual(layers.get(),{visible:['right-atrium'],selected:null});
  assert.equal(layers.visibility(['aortic-valve','heart-wall'],true),true);
  assert.deepEqual(layers.get().visible,['heart-wall','right-atrium','aortic-valve']);
});

test('the final visible structure cannot be hidden, including a multi-part group action',()=>{
  const layers = createLayerState(heart);
  layers.select('aortic-valve');
  const start = layers.get();
  assert.equal(layers.visibility(ids,false),false);
  assert.deepEqual(layers.get(),start);
  assert.equal(layers.only(['aortic-valve']),true);
  assert.equal(layers.visibility(['aortic-valve','heart-wall'],false),false);
  assert.deepEqual(layers.get(),{visible:['aortic-valve'],selected:'aortic-valve'});
});

test('isolating a group preserves a member selection, clears an outside selection and deduplicates IDs',()=>{
  const layers = createLayerState(heart);
  layers.select('right-atrium');
  assert.equal(layers.only(['right-atrium','left-atrium','left-atrium']),true);
  assert.deepEqual(layers.get(),{visible:['left-atrium','right-atrium'],selected:'right-atrium'});
  assert.equal(layers.only(['aortic-valve']),true);
  assert.deepEqual(layers.get(),{visible:['aortic-valve'],selected:null});
  layers.showAll();
  assert.deepEqual(layers.get(),{visible:ids,selected:null});
});

test('selecting a hidden structure reveals it without restoring unrelated hidden layers',()=>{
  const layers = createLayerState(heart);
  layers.only(['right-atrium']);
  assert.equal(layers.select('left-atrium'),true);
  assert.deepEqual(layers.get(),{visible:['left-atrium','right-atrium'],selected:'left-atrium'});
  layers.clearSelection();
  assert.deepEqual(layers.get(),{visible:['left-atrium','right-atrium'],selected:null});
});

test('invalid visibility and isolation requests are atomic and cannot insert an unknown structure',()=>{
  const layers = createLayerState(heart);
  layers.select('heart-wall');
  const start = layers.get();
  for (const value of [null,undefined,'left-atrium',[],['left-atrium','unknown']]) {
    assert.equal(layers.only(value),false);
    assert.deepEqual(layers.get(),start);
  }
  for (const [values,show] of [[null,true],['heart-wall',false],[['heart-wall','unknown'],false],[['heart-wall'],1],[['heart-wall'],'false']]) {
    assert.equal(layers.visibility(values,show),false);
    assert.deepEqual(layers.get(),start);
  }
  for (const unknown of ['missing','brainstem',null,'__proto__']) {
    assert.equal(layers.select(unknown),false);
    assert.deepEqual(layers.get(),start);
  }
});

test('returned snapshots and caller arrays cannot mutate the live layer state',()=>{
  const source = heart.map(part=>({...part})), layers = createLayerState(source);
  const snapshot = layers.get();
  snapshot.visible.length=0;snapshot.selected='intruder';
  source[0].id='changed';source.push({id:'new'});
  assert.deepEqual(layers.get(),{visible:ids,selected:null});
  const isolated = ['left-atrium'];layers.only(isolated);isolated.push('right-atrium');
  assert.deepEqual(layers.get().visible,['left-atrium']);
});

test('search is Russian and English, case-insensitive, multi-word and spans source fields',()=>{
  assert.deepEqual(matchingParts(heart,'  ЛЕВОЕ   ПРЕДСЕРДИЕ  ').map(p=>p.id),['left-atrium']);
  assert.deepEqual(matchingParts(heart,'atrium LEFT').map(p=>p.id),['left-atrium']);
  assert.deepEqual(matchingParts(heart,'sinistrum ПРЕДСЕРДИЕ').map(p=>p.id),['left-atrium']);
  assert.deepEqual(matchingParts(heart,'atrium').map(p=>p.id),['left-atrium','right-atrium']);
  assert.deepEqual(matchingParts(heart,'right-atrium').map(p=>p.id),['right-atrium']);
  assert.deepEqual(matchingParts(heart,'valve левое'),[]);
  assert.deepEqual(matchingParts(heart,'    '),heart);
});

test('search folds е/ё and accent variants without modifying names in the results',()=>{
  const source = [{id:'sample',name:'Тёмная структура',latin:'Córtex',sourceLabel:'Cortex'}];
  assert.equal(labTerm('  ТЁМНАЯ  '),'темная');
  assert.equal(matchingParts(source,'темная cortex')[0],source[0]);
  assert.equal(matchingParts(source,'ТЁМНАЯ córtex')[0].name,'Тёмная структура');
  assert.deepEqual(matchingParts(heart,'<img onerror=1>'),[]);
});

test('links round-trip an organ or exact structure and discard unrelated query data and fragments',()=>{
  const base = 'https://example.test/anatomia-vr/?v=1.10.0&organ=liver&scene=old&token=secret&student=Иванов&score=99#private';
  for (const organ of ['heart','brain']) for (const part of [null,...definitions[organ].parts.map(item=>item.id)]) {
    const link = labURL(base,organ,part,definitions), url = new URL(link);
    assert.equal(url.pathname,'/anatomia-vr/');
    assert.equal(url.hash,'');
    assert.deepEqual([...url.searchParams.keys()],part===null?['v','lab']:['v','lab','part']);
    assert.equal(url.searchParams.get('v'),'1.10.0');
    assert.equal(link.includes('secret'),false);
    assert.equal(link.includes('score'),false);
    assert.deepEqual(labFromURL(link,definitions),{organ,part});
  }
});

test('unsafe URLs, credentials and unknown or cross-organ structure IDs are rejected',()=>{
  for (const base of ['broken','javascript:alert(1)','data:text/html,hi','file:///tmp/view.html','https://user:secret@example.test/?lab=heart']) {
    assert.equal(labURL(base,'heart',null,definitions),null);
    assert.equal(labFromURL(base,definitions),null);
  }
  for (const [organ,part] of [['unknown',null],['__proto__',null],['constructor',null],['heart','unknown'],['heart','brainstem'],['brain','left-atrium'],['heart',''],['heart',undefined]]) {
    assert.equal(labURL('https://example.test/',organ,part,definitions),null);
  }
  for (const query of ['lab=unknown','lab=__proto__','lab=heart&part=brainstem','lab=heart&part=','lab=brain&part=%3Cimg%20onerror%3Dx%3E']) {
    assert.equal(labFromURL('https://example.test/?'+query,definitions),null);
  }
});

test('duplicate routes and every existing competing route are rejected before auto-opening a model',()=>{
  for (const query of ['lab=heart&lab=heart','lab=heart&lab=brain','lab=heart&part=left-atrium&part=left-atrium','lab=heart&part=left-atrium&part=right-atrium','part=left-atrium','lab=']) {
    assert.equal(labFromURL('https://example.test/?'+query,definitions),null);
  }
  for (const key of ['scene','organ','compare','lesson','practice','mode','demo','view']) {
    assert.equal(labFromURL(`https://example.test/?lab=heart&${key}=anything`,definitions),null,key);
    assert.equal(labFromURL(`https://example.test/?lab=heart&${key}=`,definitions),null,key+' empty');
  }
});

test('generated links preserve only a single valid release version and encode structure names safely',()=>{
  for (const params of ['v=1.10.0&v=1.9.0','v=private','v=1234.1.0','v=1.2','v=1.2.3%26token%3Dx']) {
    const url = new URL(labURL('https://example.test/?'+params,'heart',null,definitions));
    assert.deepEqual([...url.searchParams.keys()],['lab']);
  }
  const extended = {heart:{parts:[{id:'group / α + β'}]}};
  const link = labURL('https://example.test/?v=1.10.0','heart','group / α + β',extended);
  assert.deepEqual(labFromURL(link,extended),{organ:'heart',part:'group / α + β'});
  assert.equal(new URL(link).searchParams.size,3);
});
