import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from '../vendor/three.module.min.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {organs,findTasks,cases,sources} from '../data.js';
import {briefs,lessons} from '../experience.js';
const root=path.resolve(import.meta.dirname,'..'),dist=root;
for(const o of organs)assert.ok(briefs[o.id]);
for(const l of lessons)for(const step of l.steps){assert.ok(step.ids.includes(step.selected));for(const id of step.ids)assert.ok(organs.some(o=>o.id===id));assert.ok(step.text.length<100);}
assert.equal(organs.length,16);assert.equal(new Set(organs.map(o=>o.id)).size,16);
for(const o of organs){assert.ok(o.options[o.answer],o.id);assert.ok(sources[o.source]?.startsWith('https://openstax.org/'));assert.ok(o.location&&o.function&&o.landmark);}
for(const id of findTasks)assert.ok(organs.some(o=>o.id===id));for(const c of cases){assert.ok(c.options[c.answer]);assert.ok(organs.some(o=>o.id===c.target));}
const b=fs.readFileSync(path.join(dist,'models/atlas.glb'));const model=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
let count=0,triangles=0;const boxes={};model.scene.updateMatrixWorld(true);model.scene.traverse(m=>{if(!m.isMesh)return;count++;const id=m.userData.organId;assert.ok(organs.some(o=>o.id===id),'Unknown organ '+id);assert.ok(!boxes[id],'Duplicate mesh '+id);const a=m.geometry.attributes.position.array;assert.ok(a.every(Number.isFinite));const n=m.geometry.attributes.normal.array;assert.ok(n.every(Number.isFinite));triangles+=(m.geometry.index?.count||a.length/3)/3;boxes[id]=new THREE.Box3().setFromObject(m);assert.ok(boxes[id].getSize(new THREE.Vector3()).length()>.01);});assert.equal(count,16);assert.ok(triangles<260000);assert.ok(boxes.lungL.getCenter(new THREE.Vector3()).x>boxes.lungR.getCenter(new THREE.Vector3()).x);assert.ok(boxes.kidneyL.getCenter(new THREE.Vector3()).x>boxes.kidneyR.getCenter(new THREE.Vector3()).x);assert.ok(boxes.brain.min.y>boxes.heart.max.y);assert.ok(boxes.bladder.max.y<boxes.liver.min.y);
const sk=fs.readFileSync(path.join(dist,'models/skeleton-context.glb'));const skm=await new GLTFLoader().parseAsync(sk.buffer.slice(sk.byteOffset,sk.byteOffset+sk.byteLength),'');let skull=false;skm.scene.traverse(m=>{if(m.isMesh){assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));skull ||= (m.userData.sourceNames||[]).some(s=>/skull|frontal bone/i.test(s));}});assert.equal(skull,false);
const files=fs.readdirSync(dist,{recursive:true}).filter(f=>f.endsWith('.js'));for(const f of files){const s=fs.readFileSync(path.join(dist,f),'utf8');for(const m of s.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)){assert.ok(fs.existsSync(path.resolve(dist,path.dirname(f),m[1])),`Missing import ${f}: ${m[1]}`)}}
for(const [hr,sv,co] of [[75,70,5.25],[100,50,5],[50,100,5],[160,130,20.8]])assert.equal(hr*sv/1000,co);
console.log(JSON.stringify({status:'passed',visualLessons:lessons.length,organs:count,triangles,spatialTasks:findTasks.length,functionQuestions:organs.length,caseQuestions:cases.length,imports:'resolved',leftRight:'verified',models:'parsed with Three.js r'+THREE.REVISION}));

// Preview integrity is part of release readiness, not a claim of WebGL rendering.
let previewBytes=0;
for(const id of ['overview',...organs.map(o=>o.id)]){
 const image=fs.readFileSync(path.join(root,'previews',id+'.webp'));
 assert.equal(image.subarray(0,4).toString(),'RIFF');assert.equal(image.subarray(8,12).toString(),'WEBP');previewBytes+=image.length;
}
assert.ok(previewBytes<1200000,'Preview payload exceeds 1.2 MB');
const entry=fs.readFileSync(path.join(root,'index.html'),'utf8');const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
assert.ok(entry.includes('style.css?v='+version));assert.ok(entry.includes('app.js?v='+version));
console.log(JSON.stringify({previewFiles:17,previewBytes,entryVersion:version,status:'passed'}));
