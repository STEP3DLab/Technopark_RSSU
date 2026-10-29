// Comparison preferences and a separate, device-local distinction exercise.
// Full attempts and repeats are deliberately not pooled into one score.
export const workbenchKey = 'anatomia-workbench-v1';

export function validPair(value, ids) {
  return Array.isArray(value) && value.length === 2 && value[0] !== value[1]
    && value.every(id => ids.includes(id)) ? [...value] : null;
}

export function comparisonFromURL(base, ids) {
  try {
    const values = new URL(base).searchParams.getAll('compare');
    return values.length === 1 && values[0] ? validPair(values[0].split(','), ids) : null;
  } catch { return null; }
}

export function comparisonURL(base, pair, ids) {
  const checked = validPair(pair, ids);
  if (!checked) return null;
  try {
    const url = new URL(base);
    // Share the selected pair only; never carry unrelated personal/session parameters.
    const version = url.searchParams.get('v');
    url.search = '';
    if (version && /^\d+\.\d+\.\d+$/.test(version)) url.searchParams.set('v', version);
    url.searchParams.set('compare', checked.join(','));
    url.hash = '';
    return url.href;
  } catch { return null; }
}

export function shuffled(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.max(0, Math.min(.999999999, random())) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function validateAttempt(value, tasks) {
  if (!value || !Array.isArray(value.answers) || value.answers.length < 1 || value.answers.length > tasks.length) return null;
  const seen = new Set(), answers = [];
  for (const item of value.answers) {
    const task = tasks.find(t => t.id === item?.id);
    if (!task || seen.has(item.id) || !Number.isInteger(item.choice) || item.choice < 0 || item.choice >= task.options.length) return null;
    seen.add(item.id);
    answers.push({id: item.id, choice: item.choice, correct: item.choice === task.answer});
  }
  const correct = answers.filter(a => a.correct).length;
  if (value.total !== answers.length || value.correct !== correct) return null;
  const full = answers.length === tasks.length && tasks.every(t => seen.has(t.id));
  return {
    answers, correct, total: answers.length,
    scope: full ? 'all' : 'review',
    completedAt: typeof value.completedAt === 'string' && Number.isFinite(Date.parse(value.completedAt)) ? value.completedAt : null
  };
}

export function createWorkbenchState(storage, organIds, tasks) {
  let persistent = true, corrupt = false;
  const fallbackPair = validPair(['lungR', 'lungL'], organIds) || organIds.slice(0, 2);
  let state = {pair: fallbackPair, best: null, last: null};
  try {
    const raw = storage.getItem(workbenchKey);
    if (raw) {
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new SyntaxError('Invalid saved record');
      state.pair = validPair(saved.pair, organIds) || fallbackPair;
      state.best = Number.isInteger(saved.best) && saved.best >= 0 && saved.best <= tasks.length ? saved.best : null;
      state.last = validateAttempt(saved.last, tasks);
    }
  } catch (error) {
    if (error instanceof SyntaxError) corrupt = true;
    else persistent = false;
  }
  function save() {
    try { storage.setItem(workbenchKey, JSON.stringify(state)); persistent = true; corrupt = false; }
    catch { persistent = false; }
  }
  return {
    get: () => ({pair: [...state.pair], best: state.best, last: state.last ? JSON.parse(JSON.stringify(state.last)) : null, persistent, corrupt}),
    setPair(value) {
      const pair = validPair(value, organIds);
      if (!pair) return false;
      state.pair = pair; save(); return true;
    },
    record(value) {
      const attempt = validateAttempt(value, tasks);
      if (!attempt) return false;
      state.last = attempt;
      if (attempt.scope === 'all') state.best = state.best === null ? attempt.correct : Math.max(state.best, attempt.correct);
      save(); return true;
    }
  };
}

export function createContrastSession(tasks, selectedIds, random = Math.random) {
  const allIds = tasks.map(t => t.id);
  const requested = Array.isArray(selectedIds) ? [...new Set(selectedIds.filter(id => allIds.includes(id)))] : allIds;
  if (!requested.length) return null;
  const ids = shuffled(requested, random), orders = Object.fromEntries(ids.map(id => [id, shuffled(tasks.find(t => t.id === id).options.map((_, i) => i), random)]));
  let index = 0, answers = [], finished = false;
  return {
    get() {
      const id = ids[Math.min(index, ids.length - 1)];
      return {ids: [...ids], index, total: ids.length, id, order: [...orders[id]], answered: answers.length > index, answers: answers.map(a => ({...a})), finished};
    },
    answer(choice) {
      const task = tasks.find(t => t.id === ids[index]);
      if (finished || answers.length > index || !task || !Number.isInteger(choice) || choice < 0 || choice >= task.options.length) return false;
      answers.push({id: task.id, choice, correct: choice === task.answer});
      return true;
    },
    next() {
      if (finished || answers.length <= index) return false;
      index++;
      if (index === ids.length) finished = true;
      return true;
    },
    result(now = new Date().toISOString()) {
      if (!finished) return null;
      return validateAttempt({answers, correct: answers.filter(a => a.correct).length, total: ids.length, completedAt: now}, tasks);
    }
  };
}
