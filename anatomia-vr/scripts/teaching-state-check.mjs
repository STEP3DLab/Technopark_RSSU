import {test} from 'node:test';
import assert from 'node:assert/strict';
import {teachingModules} from '../teaching-content.js';
import {normalizeTeachingAttempt} from '../teaching-state.js';
import {practiceFromURL} from '../entry.js';

const allAnswers=Object.values(teachingModules).flatMap(m=>m.questions.map(q=>({id:q.id,correct:true,revealed:false})));
const full={scope:'all',organ:null,total:9,correct:9,answers:allAnswers,completedAt:'2026-10-29T10:00:00Z'};
test('lab record retains exact completed questions and explicit attempt format',()=>{
  assert.deepEqual(normalizeTeachingAttempt(full),full);
  const review=normalizeTeachingAttempt({...full,scope:'review'});
  assert.equal(review.scope,'review');
  assert.equal(review.total,9);
  const organ=normalizeTeachingAttempt({...full,scope:'organ',organ:'heart',answers:allAnswers.slice(0,3),total:3,correct:3});
  assert.equal(organ.scope,'organ');
  assert.equal(organ.organ,'heart');
});
test('revealed explanations never masquerade as correct answers',()=>{
  const answers=allAnswers.map((a,i)=>i?{...a}:{...a,correct:false,revealed:true});
  assert.equal(normalizeTeachingAttempt({...full,answers,correct:8}).correct,8);
  assert.equal(normalizeTeachingAttempt({...full,answers}),null);
  assert.equal(normalizeTeachingAttempt({...full,answers:allAnswers.map(a=>({...a,revealed:true}))}),null);
});
test('corrupt questions, duplicate records and fabricated full attempts are rejected',()=>{
  assert.equal(normalizeTeachingAttempt({...full,answers:[...allAnswers.slice(0,8),allAnswers[0]]}),null);
  assert.equal(normalizeTeachingAttempt({...full,answers:[{...allAnswers[0],id:'unknown'},...allAnswers.slice(1)]}),null);
  assert.equal(normalizeTeachingAttempt({...full,total:3,correct:3,answers:allAnswers.slice(0,3)}),null);
  assert.equal(normalizeTeachingAttempt({...full,scope:'organ',organ:'lungs',total:3,correct:3,answers:allAnswers.slice(0,3)}),null);
  assert.equal(normalizeTeachingAttempt({total:9,correct:9,answers:'damaged'}),null);
});
test('old lab totals remain usable without fabricated metadata',()=>{
  assert.deepEqual(normalizeTeachingAttempt({total:3,correct:2}),{total:3,correct:2});
  for(const v of [null,{}, {total:0,correct:0},{total:10,correct:3},{total:3,correct:4},{total:3,correct:'3'}])assert.equal(normalizeTeachingAttempt(v),null);
});
test('practice links accept only one supported mode without conflicting lesson/comparison',()=>{
  for(const name of ['recognition','verbal','contrast','results','hub'])assert.equal(practiceFromURL(`https://example.org/?practice=${name}&v=1.7.0`),name);
  for(const url of ['broken','https://example.org/?practice=unknown','https://example.org/?practice=recognition&practice=verbal','https://example.org/?practice=recognition&compare=heart,lungL','https://example.org/?practice=recognition&lesson=heart'])assert.equal(practiceFromURL(url),null);
});
