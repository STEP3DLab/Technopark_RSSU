import {organs, systemNames} from './data.js';
import {normalizeSectionSnapshot} from './section-state.js';

// A scene contains display choices only. Learner records and saved view names are never
// included in its shared URL, and importing a view cannot create new anatomy.
export const sceneKey = 'anatomia-scenes-v1';
export const sceneLimit = 12;
const organIds = organs.map(organ => organ.id);
const knownIds = new Set(organIds);
const systems = new Set(['all', ...Object.keys(systemNames)]);
const tau = Math.PI * 2;
const maxEncodedLength = 3000;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const bounded = (value, min, max) => finite(value) && value >= min && value <= max;
const rounded = (value, min, max) => Math.max(min, Math.min(max, Math.round(value * 1e6) / 1e6)) || 0;

export const scenePresets = Object.freeze([
  {id:'all', name:'Все структуры', ids:organIds},
  {id:'cardiorespiratory', name:'Сердце, лёгкие и дыхательные пути', ids:['heart','lungR','lungL','airway']},
  {id:'digestive', name:'Пищеварительные органы', ids:['liver','stomach','pancreas','gallbladder','smallIntestine','colon']},
  {id:'urinary', name:'Почки и мочевой пузырь', ids:['kidneyR','kidneyL','bladder']}
].map(preset => Object.freeze({...preset, ids:Object.freeze([...preset.ids])})));

function validIds(value, max) {
  if (!Array.isArray(value) || value.length > max) return false;
  const seen = new Set();
  for (const id of value) {
    if (typeof id !== 'string' || !knownIds.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}

export function normalizeScene(value) {
  try {
    const fields = ['v','selected','hidden','system','isolated','context','pair','skeleton','labels','contextOpacity','camera'];
    if (!record(value) || !fields.every(key => own(value, key)) || value.v !== 1) return null;
    if (typeof value.selected !== 'string' || !knownIds.has(value.selected) || !systems.has(value.system)) return null;
    if (!validIds(value.hidden, organIds.length - 1) || value.hidden.includes(value.selected)) return null;
    if (['isolated','context','skeleton','labels'].some(key => typeof value[key] !== 'boolean')) return null;
    if (value.context && !value.isolated) return null;
    if (!bounded(value.contextOpacity, .03, .3)) return null;
    const selected = organs.find(organ => organ.id === value.selected);
    if (value.system !== 'all' && selected.system !== value.system) return null;
    let pair = null;
    if (value.pair !== null) {
      if (!validIds(value.pair, 2) || value.pair.length !== 2 || !value.pair.includes(value.selected)) return null;
      if (!value.isolated || value.system !== 'all' || value.hidden.length) return null;
      pair = [...value.pair];
    }
    const camera = value.camera;
    if (!record(camera) || !['theta','phi','radius','target'].every(key => own(camera, key))) return null;
    if (!finite(camera.theta) || !bounded(camera.phi, .1, Math.PI - .1) || !bounded(camera.radius, .18, 25)) return null;
    if (!Array.isArray(camera.target) || camera.target.length !== 3) return null;
    if (!bounded(camera.target[0], -5, 5) || !bounded(camera.target[1], -2, 5) || !bounded(camera.target[2], -5, 5)) return null;
    const section = own(value, 'section') ? normalizeSectionSnapshot(value.section) : undefined;
    if (section === null) return null;
    const theta = ((camera.theta + Math.PI) % tau + tau) % tau - Math.PI;
    // The canonical order makes equivalent hidden sets produce the same link.
    const hidden = organIds.filter(id => value.hidden.includes(id));
    return {
      v:1, selected:value.selected, hidden, system:value.system,
      isolated:value.isolated, context:value.context, pair,
      skeleton:value.skeleton, labels:value.labels,
      contextOpacity:rounded(value.contextOpacity, .03, .3),
      ...(section ? {section} : {}),
      camera:{
        theta:rounded(theta, -Math.PI, Math.PI),
        phi:rounded(camera.phi, .1, Math.PI - .1),
        radius:rounded(camera.radius, .18, 25),
        target:camera.target.map((coordinate, index) => rounded(coordinate, index === 1 ? -2 : -5, 5))
      }
    };
  } catch { return null; }
}

function encode(value) {
  // Every string in a normalized scene is an ASCII ID from data.js.
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(value) {
  if (typeof value !== 'string' || !value.length || value.length > maxEncodedLength || value.length % 4 === 1 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
    const text = new TextDecoder('utf-8', {fatal:true}).decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
    return normalizeScene(JSON.parse(text));
  } catch { return null; }
}

function safeURL(base) {
  const url = new URL(base);
  return ['http:','https:'].includes(url.protocol) && !url.username && !url.password ? url : null;
}

export function sceneURL(base, value) {
  const scene = normalizeScene(value);
  if (!scene) return null;
  try {
    const url = safeURL(base);
    if (!url) return null;
    const versions = url.searchParams.getAll('v');
    const version = versions.length === 1 && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(versions[0]) ? versions[0] : null;
    const encoded = encode(scene);
    if (encoded.length > maxEncodedLength) return null;
    url.search = ''; url.hash = '';
    if (version) url.searchParams.set('v', version);
    url.searchParams.set('scene', encoded);
    return url.href;
  } catch { return null; }
}

export function sceneFromURL(base) {
  try {
    const url = safeURL(base);
    if (!url) return null;
    const params = url.searchParams, scenes = params.getAll('scene');
    if (scenes.length !== 1 || ['organ','compare','lesson','practice','mode','demo','view','lab','part'].some(key => params.has(key))) return null;
    return decode(scenes[0]);
  } catch { return null; }
}

function validName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length > 0 && name.length <= 60 && !/[\u0000-\u001f\u007f]/.test(name) ? name : null;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return null;
  const number = Date.parse(value);
  if (!Number.isFinite(number)) return null;
  const date = new Date(number).toISOString();
  // Date.parse accepts some overflowing calendar dates; a saved view must not.
  return date.slice(0, 19) === value.slice(0, 19) ? date : null;
}

function validItem(value) {
  if (!record(value) || !['id','name','createdAt','scene'].every(key => own(value, key))) return null;
  if (typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value.id)) return null;
  const name = validName(value.name), createdAt = validDate(value.createdAt), scene = normalizeScene(value.scene);
  return name && createdAt && scene ? {id:value.id, name, createdAt, scene} : null;
}

export function createSceneStore(storage, {now = () => new Date().toISOString(), random = Math.random} = {}) {
  let items = [], persistent = true, corrupt = false, serial = 0;
  try {
    const raw = storage.getItem(sceneKey);
    if (raw !== null && raw !== undefined) {
      if (typeof raw !== 'string' || raw.length > 100000) throw new SyntaxError('Invalid scene store');
      const saved = JSON.parse(raw);
      if (!record(saved) || saved.v !== 1 || !Array.isArray(saved.items)) throw new SyntaxError('Invalid scene store');
      const seen = new Set();
      for (const value of saved.items) {
        const item = validItem(value);
        if (!item || seen.has(item.id) || items.length >= sceneLimit) { corrupt = true; continue; }
        seen.add(item.id); items.push(item);
      }
    }
  } catch (error) {
    if (error instanceof SyntaxError) corrupt = true;
    else persistent = false;
  }

  function persist() {
    try { storage.setItem(sceneKey, JSON.stringify({v:1, items})); persistent = true; corrupt = false; }
    catch { persistent = false; }
  }

  function uniqueId(createdAt) {
    let entropy = 0;
    try { const value = random(); if (finite(value)) entropy = Math.floor(Math.max(0, Math.min(.9999999999, value)) * 0x100000000); } catch {}
    let id;
    do { id = `scene-${Date.parse(createdAt).toString(36)}-${(++serial).toString(36)}-${entropy.toString(36)}`; }
    while (items.some(item => item.id === id));
    return id;
  }

  return {
    get() { return {items:JSON.parse(JSON.stringify(items)), persistent, corrupt}; },
    save(value, input) {
      const name = validName(value), scene = normalizeScene(input);
      if (!name) return {ok:false, reason:'name'};
      if (!scene) return {ok:false, reason:'scene'};
      if (items.length >= sceneLimit) return {ok:false, reason:'limit'};
      let createdAt;
      try { createdAt = validDate(now()); } catch {}
      if (!createdAt) return {ok:false, reason:'clock'};
      const id = uniqueId(createdAt);
      items.push({id, name, createdAt, scene}); persist();
      return {ok:true, id};
    },
    rename(id, value) {
      const name = validName(value), item = items.find(entry => entry.id === id);
      if (!name || !item) return false;
      if (item.name !== name) { item.name = name; persist(); }
      return true;
    },
    remove(id) {
      const index = items.findIndex(item => item.id === id);
      if (index === -1) return false;
      items.splice(index, 1); persist(); return true;
    }
  };
}
