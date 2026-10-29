// Read-only aggregation. No writes, identity fields, combined grade, or mastery estimate.
import {organs, systemNames, cases} from './data.js';
import {teachingModules} from './teaching-content.js';
import {contrastPairs} from './contrast-content.js';
import {validateRecognitionRecord} from './recognition-state.js';

export const REPORT_VERSION = '1.7.0';
export const reportKeys = Object.freeze({
  atlas: 'anatomia-progress-v1',
  learning: 'anatomia-learning-v1',
  lab: 'anatomia-teaching-v1',
  contrast: 'anatomia-workbench-v1',
  recognition: 'anatomia-recognition-v1'
});
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const organIds = organs.map(organ => organ.id);
const byId = id => organs.find(organ => organ.id === id);
const uniqueIds = (values, allowed = organIds) => Array.isArray(values) ? [...new Set(values.filter(id => allowed.includes(id)))] : [];
const labQuestions = Object.entries(teachingModules).flatMap(([organ,module]) => module.questions.map(question => ({...question, organ})));
const dateOrNull = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const validCount = (value, maximum) => Number.isInteger(value) && value >= 0 && value <= maximum;

export function readReportStorage(storage) {
  const records = {}, availability = {};
  for (const [name,key] of Object.entries(reportKeys)) {
    try {
      const text = storage.getItem(key);
      if (text === null || text === undefined || text === '') { records[name] = null; availability[name] = 'empty'; continue; }
      try {
        const value = JSON.parse(text);
        if (!isRecord(value)) throw new SyntaxError('Invalid stored object');
        records[name] = value; availability[name] = 'storage';
      } catch { records[name] = null; availability[name] = 'corrupt'; }
    } catch { records[name] = null; availability[name] = 'unavailable'; }
  }
  return {records, availability};
}

export function validateAtlasAttempt(value) {
  if (!isRecord(value) || !['find','function','case'].includes(value.type) || !Array.isArray(value.answers)) return null;
  const maximum = value.type === 'case' ? cases.length : organs.length;
  if (!validCount(value.total,maximum) || value.total < 1 || value.answers.length !== value.total || !validCount(value.score,value.total)) return null;
  const answers = [], seen = new Set();
  for (const item of value.answers) {
    if (!isRecord(item) || !byId(item.organ)) return null;
    let id, correct, label;
    if (value.type === 'case') {
      const task = cases.find(candidate => candidate.title === item.item?.title && candidate.target === item.organ);
      if (!task || !validCount(item.answer,task.options.length - 1)) return null;
      id = task.title; correct = item.answer === task.answer; label = task.title;
    } else {
      const organ = byId(item.organ);
      if (item.item !== organ.id) return null;
      if (value.type === 'find' && !organIds.includes(item.answer)) return null;
      if (value.type === 'function' && !validCount(item.answer,organ.options.length - 1)) return null;
      id = organ.id; correct = value.type === 'find' ? item.answer === organ.id : item.answer === organ.answer; label = organ.name;
    }
    if (seen.has(id) || item.correct !== correct) return null;
    seen.add(id); answers.push({id, organId:item.organ, correct, label});
  }
  const correct = answers.filter(item => item.correct).length;
  if (correct !== value.score) return null;
  const standardTotal = value.type === 'case' ? cases.length : Math.min(8,organs.length);
  const scope = ['standard','custom','review'].includes(value.scope) ? value.scope : 'unknown';
  if (scope === 'standard' && value.total !== standardTotal) return null;
  return {
    module:'atlas', type:value.type, scope, correct, total:value.total,
    completedAt:dateOrNull(value.completedAt || value.date),
    mistakes:answers.filter(item => !item.correct), skipped:null, revealed:null,
    verification:'answer-key', canRetry:answers.some(item => !item.correct)
  };
}

export function validateLabAttempt(value) {
  if (!isRecord(value) || !validCount(value.total,labQuestions.length) || value.total < 1 || !validCount(value.correct,value.total)) return null;
  const base = {module:'lab',type:'laboratory',scope:'unknown',correct:value.correct,total:value.total,completedAt:dateOrNull(value.completedAt || value.date),mistakes:[],skipped:null,revealed:null,verification:'legacy-summary',canRetry:false};
  // Older releases kept only the numerator and denominator. Their scope, revealed
  // answers, dates, and question IDs must not be invented from the score.
  if (value.answers === undefined) return base;
  if (!Array.isArray(value.answers) || value.answers.length !== value.total) return null;
  const seen = new Set(), answers = [];
  for (const item of value.answers) {
    const task = labQuestions.find(question => question.id === item?.id);
    if (!task || seen.has(item.id) || typeof item.correct !== 'boolean' || typeof item.revealed !== 'boolean' || (item.correct && item.revealed)) return null;
    seen.add(item.id); answers.push({id:item.id,organ:task.organ,organId:task.organ === 'lungs' ? 'lungR' : task.organ === 'kidneys' ? 'kidneyR' : 'heart',correct:item.correct,revealed:item.revealed,label:task.question});
  }
  if (answers.filter(item => item.correct).length !== value.correct) return null;
  const scope = ['all','organ','review'].includes(value.scope) ? value.scope : 'unknown';
  if (scope === 'all' && (answers.length !== labQuestions.length || !labQuestions.every(task => seen.has(task.id)))) return null;
  if (scope === 'organ' && (!teachingModules[value.organ] || answers.length !== teachingModules[value.organ].questions.length || answers.some(item => item.organ !== value.organ))) return null;
  return {...base,scope,organ:teachingModules[value.organ] ? value.organ : null,mistakes:answers.filter(item => !item.correct),revealed:answers.filter(item => item.revealed).length,verification:'recorded-outcomes',canRetry:answers.some(item => !item.correct)};
}

export function validateContrastAttempt(value) {
  if (!isRecord(value) || !Array.isArray(value.answers) || !validCount(value.total,contrastPairs.length) || value.total < 1 || value.answers.length !== value.total || !validCount(value.correct,value.total)) return null;
  const answers = [], seen = new Set();
  for (const item of value.answers) {
    const task = contrastPairs.find(candidate => candidate.id === item?.id);
    if (!task || seen.has(item.id) || !validCount(item.choice,task.options.length - 1)) return null;
    seen.add(item.id); answers.push({id:task.id,organId:task.organId,correct:item.choice === task.answer,label:task.prompt});
  }
  const correct = answers.filter(item => item.correct).length;
  if (correct !== value.correct) return null;
  const scope = value.scope === 'review' ? 'review' : value.scope === 'all' || value.scope === 'full' ? 'all' : 'unknown';
  if (scope === 'all' && (answers.length !== contrastPairs.length || !contrastPairs.every(task => seen.has(task.id)))) return null;
  return {module:'contrast',type:'distinction',scope,correct,total:value.total,completedAt:dateOrNull(value.completedAt),mistakes:answers.filter(item => !item.correct),revealed:null,skipped:null,verification:'answer-key',canRetry:answers.some(item => !item.correct)};
}

function recognitionAttempts(value) {
  const checked = validateRecognitionRecord(value,organs);
  if (!checked) return null;
  const result = {};
  for (const mode of ['visual','verbal']) {
    const attempt = checked[mode].last;
    result[mode] = attempt ? {
      module:'recognition',type:mode,scope:attempt.scope,correct:attempt.correct,total:attempt.total,
      completedAt:dateOrNull(attempt.completedAt),skipped:attempt.skipped,revealed:null,verification:'answer-key',
      mistakes:attempt.answers.filter(item => item.outcome !== 'correct').map(item => ({id:item.organId,organId:item.organId,correct:false,skipped:item.outcome === 'skipped',label:byId(item.organId).name})),
      canRetry:attempt.answers.some(item => item.outcome !== 'correct')
    } : null;
  }
  return result;
}

export function buildProgressReport({storage,live = {},now = new Date().toISOString()} = {}) {
  const read = readReportStorage(storage);
  const records = {...read.records}, availability = {...read.availability}, notices = [];
  for (const name of Object.keys(reportKeys)) {
    if (Object.hasOwn(live,name)) {
      // A live empty/reset state intentionally overrides a nonempty stale disk state.
      const value = live[name];
      records[name] = isRecord(value) ? value : null;
      availability[name] = !isRecord(value) ? 'corrupt' : value.persistent === false ? 'session' : 'live';
      if (value?.corrupt === true) notices.push({source:name,kind:'corrupt'});
    }
    if (['corrupt','unavailable','session'].includes(availability[name])) notices.push({source:name,kind:availability[name]});
  }
  const viewed = uniqueIds(records.atlas?.viewed);
  const learning = records.learning;
  const ratings = isRecord(learning?.ratings) ? learning.ratings : {};
  const selfAssessment = {
    remember:organIds.filter(id => ratings[id] === 'remember'),
    repeat:organIds.filter(id => ratings[id] === 'repeat'),
    unrated:organIds.filter(id => !['remember','repeat'].includes(ratings[id])),
    favorites:uniqueIds(learning?.favorites)
  };
  const attempts = {atlas:null,lab:null,contrast:null,recognitionVisual:null,recognitionVerbal:null};
  for (const [name,field,validate] of [['atlas','lastAttempt',validateAtlasAttempt],['lab','lastAttempt',validateLabAttempt],['contrast','last',validateContrastAttempt]]) {
    const value = records[name]?.[field];
    if (value !== undefined && value !== null) {
      attempts[name] = validate(value);
      if (!attempts[name]) notices.push({source:name,kind:'invalid-attempt'});
    }
  }
  if (records.recognition) {
    const recognition = recognitionAttempts(records.recognition);
    if (recognition) { attempts.recognitionVisual = recognition.visual; attempts.recognitionVerbal = recognition.verbal; }
    else notices.push({source:'recognition',kind:'invalid-attempt'});
  }
  const systems = Object.entries(systemNames).map(([id,name]) => ({
    id,name,total:organs.filter(organ => organ.system === id).length,
    viewed:organs.filter(organ => organ.system === id && viewed.includes(organ.id)).map(organ => ({id:organ.id,name:organ.name,latin:organ.latin}))
  }));
  const deduplicatedNotices = notices.filter((notice,index) => notices.findIndex(item => item.source === notice.source && item.kind === notice.kind) === index);
  return {application:'ANATOMIA',version:REPORT_VERSION,generatedAt:dateOrNull(now) || new Date().toISOString(),viewed,totalStructures:organs.length,selfAssessment,systems,attempts,availability,notices:deduplicatedNotices};
}

export function exportProgressReport(model) {
  // Export only normalized fields and canonical IDs; never spread raw localStorage.
  const attempts = Object.fromEntries(Object.entries(model.attempts).map(([key,attempt]) => [key,attempt ? {
    module:attempt.module,type:attempt.type,scope:attempt.scope,correct:attempt.correct,total:attempt.total,
    completedAt:attempt.completedAt,skipped:attempt.skipped,revealed:attempt.revealed,verification:attempt.verification,
    repeatIds:attempt.mistakes.map(item => item.id)
  } : null]));
  return {
    schemaVersion:1,application:'ANATOMIA',version:REPORT_VERSION,generatedAt:model.generatedAt,
    meanings:{viewed:'Просмотр структуры; не подтверждение знания.',selfAssessment:'Личные отметки «Помню» и «Повторить»; без баллов.',attempts:'Последние завершённые попытки каждого режима. Результаты и знаменатели не объединяются.',unknownScope:'Старая запись: формат попытки не сохранён.'},
    viewedIds:[...model.viewed],totalStructures:model.totalStructures,
    systems:model.systems.map(system => ({id:system.id,viewedIds:system.viewed.map(organ => organ.id),total:system.total})),
    selfAssessment:{rememberIds:[...model.selfAssessment.remember],repeatIds:[...model.selfAssessment.repeat],unratedIds:[...model.selfAssessment.unrated],favoriteIds:[...model.selfAssessment.favorites]},
    attempts,availability:{...model.availability},notices:model.notices.map(notice => ({...notice}))
  };
}
