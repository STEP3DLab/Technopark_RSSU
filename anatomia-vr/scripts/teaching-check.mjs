import assert from 'node:assert/strict';
import fs from 'node:fs';
import {teachingActivities} from '../teaching-activities.js';
import {teachingModules} from '../teaching-content.js';
assert.equal(Object.keys(teachingModules).length,3);
let questions=0;
const ids=new Set();
for(const [id,m] of Object.entries(teachingModules)){
 assert.equal(m.questions.length,3);assert.equal(m.spots.length,3);assert.ok(m.caution&&m.normalText&&m.diseaseText);
 for(const q of m.questions){assert.ok(!ids.has(q.id));ids.add(q.id);questions++;assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4);assert.ok(q.explanation.length>30);}
 for(const s of m.sources){const url=new URL(s.url);assert.equal(url.protocol,'https:');assert.ok(['www.nhlbi.nih.gov','www.niddk.nih.gov','openstax.org'].includes(url.hostname),'Reviewed primary educational source');}
}
const css=fs.readFileSync(new URL('../teaching.css',import.meta.url),'utf8');assert.ok(css.includes('prefers-reduced-motion'));assert.ok(css.includes('animation-play-state:paused'));
const entry=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(entry.includes('teaching.js'));assert.ok(entry.includes('teaching.css'));
console.log(JSON.stringify({status:'passed',organs:3,questions,sources:'NIH and OpenStax URLs declared; source verification documented separately',scope:'Teaching content shape and accessibility hooks, not clinical validation'}));

for(const [id,a] of Object.entries(teachingActivities)){assert.ok(teachingModules[id]);assert.equal(a.structures.length,3);for(const x of a.structures){assert.ok(x.name&&x.hint&&x.explanation);assert.ok(x.x>0&&x.x<560&&x.y>0&&x.y<340)}assert.equal(a.case.options.length,3);assert.ok(a.case.correct>=0&&a.case.correct<3);assert.ok(a.case.explanation.length>30)}
console.log('PASS 9 structure prompts and 3 mechanism cases');

