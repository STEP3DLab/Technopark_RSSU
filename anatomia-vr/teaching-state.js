import {teachingModules} from './teaching-content.js';

// Preserve old totals without inventing a date, topic or attempt format.
export function normalizeTeachingAttempt(value) {
  if (!value || !Number.isInteger(value.total) || value.total < 1 || value.total > 9
    || !Number.isInteger(value.correct) || value.correct < 0 || value.correct > value.total) return null;
  if (value.answers === undefined) return {total:value.total, correct:value.correct};
  if (!Array.isArray(value.answers)) return null;
  const questions = Object.entries(teachingModules).flatMap(([organ,module]) => module.questions.map(q => ({id:q.id,organ})));
  if (value.answers.length !== value.total) return null;
  const seen = new Set(), answers = [];
  for (const answer of value.answers) {
    if (!questions.some(q => q.id === answer?.id) || seen.has(answer.id)
      || typeof answer.correct !== 'boolean' || typeof answer.revealed !== 'boolean'
      || answer.correct && answer.revealed) return null;
    seen.add(answer.id);
    answers.push({id:answer.id,correct:answer.correct,revealed:answer.revealed});
  }
  if (answers.filter(a => a.correct).length !== value.correct) return null;
  if (!['all','organ','review'].includes(value.scope)) return null;
  if (value.scope === 'all' && (seen.size !== questions.length || questions.some(q => !seen.has(q.id)))) return null;
  const organ = Object.hasOwn(teachingModules, value.organ) ? value.organ : null;
  if (value.scope === 'organ' && (!organ || seen.size !== teachingModules[organ].questions.length
    || teachingModules[organ].questions.some(q => !seen.has(q.id)))) return null;
  return {total:answers.length,correct:value.correct,scope:value.scope,organ,answers,
    completedAt:typeof value.completedAt === 'string' && Number.isFinite(Date.parse(value.completedAt)) ? value.completedAt : null};
}
