// Device-local recognition exercises. Visual and verbal attempts never share scores.
export const recognitionKey = 'anatomia-recognition-v1';
export const recognitionQuestionCount = 8;
export const recognitionGroup = id => ['lungR','lungL'].includes(id) ? 'lungs' : ['kidneyR','kidneyL'].includes(id) ? 'kidneys' : id;
export const recognitionLabel = organ => recognitionGroup(organ.id) === 'lungs' ? 'Лёгкое' : recognitionGroup(organ.id) === 'kidneys' ? 'Почка' : organ.name;
const clone = value => JSON.parse(JSON.stringify(value));
const emptyRecord = () => ({version:1,visual:{best:null,last:null},verbal:{best:null,last:null}});
const modeOK = value => value === 'visual' || value === 'verbal';
function shuffle(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const sample = random(), finite = Number.isFinite(sample) ? sample : .5;
    const index = Math.floor(Math.max(0,Math.min(.999999999,finite)) * (i + 1));
    [result[i],result[index]] = [result[index],result[i]];
  }
  return result;
}

export function validateRecognitionAttempt(value, organs) {
  if (!value || value.version !== 1 || !modeOK(value.mode) || !['full','review'].includes(value.scope)
    || !Array.isArray(value.answers) || value.answers.length < 1 || value.answers.length > recognitionQuestionCount
    || value.total !== value.answers.length || (value.scope === 'full' && value.total !== recognitionQuestionCount)
    || typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt))) return null;
  const ids = new Set(organs.map(o => o.id)), targets = new Set(), answers = [];
  for (const answer of value.answers) {
    if (!answer || !ids.has(answer.organId) || targets.has(recognitionGroup(answer.organId))
      || !Array.isArray(answer.options) || answer.options.length !== 4
      || !answer.options.every(id => ids.has(id)) || !answer.options.includes(answer.organId)
      || new Set(answer.options.map(recognitionGroup)).size !== 4) return null;
    targets.add(recognitionGroup(answer.organId));
    if (answer.outcome === 'skipped') {
      if (value.mode !== 'visual' || answer.choice !== null) return null;
      answers.push({organId:answer.organId,choice:null,options:[...answer.options],outcome:'skipped'});
    } else {
      if (!answer.options.includes(answer.choice)) return null;
      const outcome = answer.choice === answer.organId ? 'correct' : 'wrong';
      if (answer.outcome !== outcome) return null;
      answers.push({organId:answer.organId,choice:answer.choice,options:[...answer.options],outcome});
    }
  }
  const correct = answers.filter(a => a.outcome === 'correct').length;
  const skipped = answers.filter(a => a.outcome === 'skipped').length;
  if (value.correct !== correct || value.skipped !== skipped) return null;
  return {version:1,mode:value.mode,scope:value.scope,correct,total:answers.length,skipped,completedAt:value.completedAt,answers};
}

// Invalid saved attempts are reported as corrupt, rather than silently hidden.
export function validateRecognitionRecord(value, organs) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return null;
  const normalized = emptyRecord();
  for (const mode of ['visual','verbal']) {
    const entry = value[mode];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
      || !(entry.best === null || Number.isInteger(entry.best) && entry.best >= 0 && entry.best <= recognitionQuestionCount)) return null;
    const last = entry.last === null ? null : validateRecognitionAttempt(entry.last,organs);
    if (entry.last !== null && !last || last && last.mode !== mode
      || last?.scope === 'full' && (entry.best === null || entry.best < last.correct)) return null;
    normalized[mode] = {best:entry.best,last};
  }
  return normalized;
}

export function createRecognitionState(storage, organs) {
  let state = emptyRecord(), persistent = true, corrupt = false;
  try {
    const text = storage.getItem(recognitionKey);
    if (text) {
      const parsed = validateRecognitionRecord(JSON.parse(text),organs);
      if (!parsed) throw new SyntaxError('Invalid recognition record');
      state = parsed;
    }
  } catch (error) { if (error instanceof SyntaxError) corrupt = true; else persistent = false; }
  return {
    get: () => ({...clone(state),persistent,corrupt}),
    record(value) {
      const attempt = validateRecognitionAttempt(value,organs);
      if (!attempt) return false;
      const entry = state[attempt.mode]; entry.last = attempt;
      if (attempt.scope === 'full') entry.best = entry.best === null ? attempt.correct : Math.max(entry.best,attempt.correct);
      try { storage.setItem(recognitionKey,JSON.stringify(state)); persistent = true; corrupt = false; }
      catch { persistent = false; }
      return true;
    }
  };
}

function buildItems(organs, requested, random) {
  const groups = new Map();
  for (const organ of organs) {
    const group = recognitionGroup(organ.id);
    if (!groups.has(group)) groups.set(group,[]);
    groups.get(group).push(organ);
  }
  if (groups.size < 4) return [];
  const representatives = () => shuffle([...groups.values()],random).map(group => shuffle(group,random)[0]);
  const targets = requested || representatives().slice(0,recognitionQuestionCount).map(o => o.id);
  return shuffle(targets,random).map(organId => {
    const target = organs.find(o => o.id === organId);
    const candidates = representatives().filter(o => recognitionGroup(o.id) !== recognitionGroup(organId));
    const near = candidates.filter(o => o.system === target.system);
    const rest = candidates.filter(o => o.system !== target.system);
    const distractors = [...near,...rest].slice(0,3).map(o => o.id);
    return {organId,options:shuffle([organId,...distractors],random)};
  });
}

export function createRecognitionSession(organs, {mode = 'visual', scope = 'full', organIds, random = Math.random} = {}) {
  if (!modeOK(mode) || !['full','review'].includes(scope)) return null;
  const validIds = new Set(organs.map(o => o.id));
  let requested = null;
  if (organIds !== undefined) {
    if (!Array.isArray(organIds)) return null;
    const seen = new Set();
    requested = organIds.filter(id => {
      const group = recognitionGroup(id);
      if (!validIds.has(id) || seen.has(group)) return false;
      seen.add(group); return true;
    });
  }
  if (scope === 'review' && (!requested?.length || requested.length > recognitionQuestionCount)
    || scope === 'full' && requested && requested.length !== recognitionQuestionCount) return null;
  const items = buildItems(organs,requested,random);
  if (!items.length || scope === 'full' && items.length !== recognitionQuestionCount) return null;
  let index = 0, answers = [], finished = false, imageStatus = mode === 'visual' ? 'loading' : 'ready';
  const current = () => items[Math.min(index,items.length - 1)];
  return {
    get: () => ({mode,scope,index,total:items.length,current:clone(current()),answers:clone(answers),answered:answers.length > index,finished,imageStatus}),
    setImageStatus(value) {
      if (mode !== 'visual' || finished || answers.length > index || !['loading','ready','error'].includes(value)) return false;
      imageStatus = value; return true;
    },
    answer(choice) {
      if (finished || answers.length > index || imageStatus !== 'ready' || !current().options.includes(choice)) return false;
      answers.push({...clone(current()),choice,outcome:choice === current().organId ? 'correct' : 'wrong'});
      return true;
    },
    skip() {
      if (mode !== 'visual' || finished || answers.length > index || imageStatus !== 'error') return false;
      answers.push({...clone(current()),choice:null,outcome:'skipped'}); return true;
    },
    next() {
      if (finished || answers.length <= index) return false;
      index++; finished = index === items.length;
      imageStatus = mode === 'visual' ? 'loading' : 'ready';
      return true;
    },
    result(now = new Date().toISOString()) {
      if (!finished) return null;
      return validateRecognitionAttempt({version:1,mode,scope,total:items.length,correct:answers.filter(a => a.outcome === 'correct').length,
        skipped:answers.filter(a => a.outcome === 'skipped').length,completedAt:now,answers},organs);
    }
  };
}
