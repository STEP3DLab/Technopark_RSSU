import assert from 'node:assert/strict';
import fs from 'node:fs';
import {organs} from '../data.js';
import {createLearningState,learningKey,validIds,lessonURL} from '../learning-state.js';
const ids=organs.map(o=>o.id),saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
assert.deepEqual(validIds(['heart','heart','bogus',null],ids),['heart']);
saved.set(learningKey,JSON.stringify({favorites:['heart','heart','bogus'],ratings:{heart:'repeat',brain:'invented',bogus:'repeat'},lastOrgan:'bogus'}));
let s=createLearningState(storage,ids);assert.deepEqual(s.get().favorites,['heart']);assert.deepEqual(s.get().ratings,{heart:'repeat'});assert.equal(s.get().lastOrgan,null);
s.toggle('brain');s.rate('heart','remember');s.visit('liver');s.toggle('bogus');s.rate('bogus','repeat');
s=createLearningState(storage,ids);assert.deepEqual(s.get().favorites,['heart','brain']);assert.equal(s.get().ratings.heart,'remember');assert.equal(s.get().lastOrgan,'liver');
s.toggle('brain');assert.deepEqual(s.get().favorites,['heart']);
const denied=createLearningState({getItem(){throw new Error('denied')},setItem(){throw new Error('denied')}},ids);denied.toggle('brain');denied.rate('heart','repeat');assert.equal(denied.get().persistent,false);assert.deepEqual(denied.get().favorites,['brain']);assert.equal(denied.get().ratings.heart,'repeat');
saved.set(learningKey,'{corrupt');const corrupt=createLearningState(storage,ids);assert.equal(corrupt.get().corrupt,true);corrupt.toggle('heart');assert.equal(corrupt.get().corrupt,false);
for(const organ of ['heart','lungs','kidneys'])for(const view of ['explore','lesson']){const url=new URL(lessonURL('https://example.org/anatomia-vr/?token=private&lesson=bad#private',organ,view));assert.equal(url.searchParams.get('lesson'),organ);assert.equal(url.searchParams.get('view'),view==='lesson'?'lesson':null);assert.equal(url.searchParams.get('token'),null);assert.equal(url.hash,'');assert.equal(url.pathname,'/anatomia-vr/');}
assert.equal(new URL(lessonURL('https://example.org/','bad')).searchParams.get('lesson'),'heart');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.ok(!app.includes('Изучено ${progress.viewed.length}'));assert.ok(app.includes("$(fallbackMode?'#detail':'#viewport').focus"));
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const file of ['learning.js','learning.css'])assert.ok(html.includes(file));
console.log(JSON.stringify({status:'passed',checks:['valid and deduplicated IDs','favorite persistence and removal','self-rating persistence','last organ','unknown IDs ignored','unavailable storage with session state','corrupt storage recovery','six allowlisted teacher URLs without private query/hash','honest viewed count','visible fallback focus','new assets linked'],scope:'Learning state and link unit tests; DOM and visual tests reported separately'}));
