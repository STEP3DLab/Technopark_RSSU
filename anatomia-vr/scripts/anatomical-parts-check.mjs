import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import test from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {detailedOrgans,partForNode,partsForGroup} from '../anatomical-parts.js';

const root=path.resolve(import.meta.dirname,'..'),parsed=new Map();
for(const organ of Object.values(detailedOrgans)){
  const bytes=fs.readFileSync(path.resolve(root,organ.file));
  const model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  model.scene.updateMatrixWorld(true);
  const meshes=[];model.scene.traverse(node=>{if(node.isMesh)meshes.push(node);});
  const lines=fs.readFileSync(path.join(root,'models/hra',organ.id+'-crosswalk.csv'),'utf8').trim().split(/\r?\n/).slice(1);
  const crosswalk=new Map(lines.map(line=>{const [id,ontologyId,sourceLabel]=line.split(',');return [id,{ontologyId,sourceLabel}];}));
  parsed.set(organ.id,{bytes,model,meshes,crosswalk});
}

test('HRA models are the exact attributed source bytes, with finite original geometry',()=>{
  for(const organ of Object.values(detailedOrgans)){
    const {bytes,meshes}=parsed.get(organ.id);
    assert.equal(bytes.length,organ.bytes);
    const sha=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    assert.equal(sha,organ.source.gitBlobSha,'A source model changed without updating its provenance');
    assert.equal(meshes.length,organ.meshCount);
    let triangles=0;
    for(const mesh of meshes){
      const position=mesh.geometry.getAttribute('position'),normal=mesh.geometry.getAttribute('normal');
      assert.ok(position.count>0&&normal.count===position.count);
      assert.ok(position.array.every(Number.isFinite));assert.ok(normal.array.every(Number.isFinite));
      const count=mesh.geometry.index?.count??position.count;assert.equal(count%3,0);triangles+=count/3;
      if(mesh.geometry.index)assert.ok(mesh.geometry.index.array.every(index=>index>=0&&index<position.count));
    }
    assert.equal(triangles,organ.triangles);
    const size=new THREE.Box3().setFromObject(parsed.get(organ.id).model.scene).getSize(new THREE.Vector3());
    assert.ok(size.toArray().every(value=>value>.08&&value<.25),'Standalone organ scale must remain in metres');
  }
});

test('every rendered surface has exactly one Russian-labelled manifest part',()=>{
  for(const organ of Object.values(detailedOrgans)){
    const {meshes}=parsed.get(organ.id),names=meshes.map(mesh=>mesh.name);
    assert.equal(new Set(names).size,names.length);
    assert.equal(new Set(organ.parts.map(part=>part.id)).size,organ.parts.length);
    assert.deepEqual([...names].sort(),organ.parts.map(part=>part.id).sort());
    for(const part of organ.parts){
      assert.ok(/[А-Яа-яЁё]/.test(part.name),part.id);
      assert.ok(organ.groups.some(group=>group.id===part.group),part.id);
      assert.strictEqual(partForNode(organ.id,part.id),part);
    }
  }
  assert.equal(partForNode('invalid','invalid'),null);
  assert.deepEqual(partsForGroup('invalid','invalid'),[]);
});

test('ontology labels come only from the official crosswalk; unmapped source surfaces stay unmapped',()=>{
  for(const organ of Object.values(detailedOrgans)){
    const {crosswalk}=parsed.get(organ.id);
    for(const part of organ.parts){
      const source=crosswalk.get(part.id);
      if(source){assert.equal(part.labelOrigin,'crosswalk');assert.equal(part.ontologyId,source.ontologyId);assert.equal(part.sourceLabel,source.sourceLabel);}
      else{assert.equal(part.labelOrigin,'mesh-name');assert.equal(part.ontologyId,null);assert.ok(part.sourceLabel.length>0);}
    }
  }
  assert.equal(detailedOrgans.heart.parts.filter(part=>part.labelOrigin==='crosswalk').length,14);
  assert.equal(detailedOrgans.brain.parts.filter(part=>part.labelOrigin==='crosswalk').length,103);
  assert.equal(detailedOrgans.brain.parts.filter(part=>part.labelOrigin==='mesh-name').length,180);
});

test('source side labels remain consistent after the documented display transform',()=>{
  for(const organ of Object.values(detailedOrgans)){
    const model=parsed.get(organ.id).model.scene;
    model.scale.fromArray(organ.nativeToAtlasScale);model.updateMatrixWorld(true);
    const center=name=>new THREE.Box3().setFromObject(model.getObjectByName(name)).getCenter(new THREE.Vector3());
    if(organ.id==='brain'){
      let pairs=0;
      for(const part of organ.parts.filter(part=>part.side==='L')){
        const right=part.id.slice(0,-1)+'R';assert.ok(model.getObjectByName(right));
        assert.ok(center(part.id).x>center(right).x,part.id+' must be anatomically left of its paired source surface');pairs++;
      }
      assert.equal(pairs,141);
      assert.ok(center('Allen_superior_frontal_gyrus_L').y>center('Allen_tegmentum_of_medulla_oblongata_L').y);
      assert.ok(center('Allen_olfactory_bulb_L').z>center('Allen_occipital_pole_L').z);
    }else{
      assert.ok(center('VH_F_left_ventricle').x>center('VH_F_right_cardiac_atrium').x);
      assert.ok(center('VH_F_left_cardiac_atrium').y>center('VH_F_left_ventricle').y);
      assert.ok(center('VH_F_right_ventricle').z>center('VH_F_left_ventricle').z);
    }
    model.scale.set(1,1,1);model.updateMatrixWorld(true);
  }
});

test('group and feature controls only address real nonempty source structures',()=>{
  for(const organ of Object.values(detailedOrgans)){
    assert.equal(new Set(organ.groups.map(group=>group.id)).size,organ.groups.length);
    for(const group of organ.groups){assert.ok(partsForGroup(organ.id,group.id).length>0);assert.match(group.color,/^#[0-9a-f]{6}$/i);}
    for(const preset of organ.presets){assert.ok(preset.groups.length>0);for(const group of preset.groups)assert.ok(organ.groups.some(item=>item.id===group));}
    for(const id of organ.featured)assert.ok(partForNode(organ.id,id));
  }
  assert.equal(partsForGroup('heart','valves').length,4);
  assert.equal(partsForGroup('brain','ventricles').length,18);
});

test('both models retain authorship, licence, source version and model limitations',()=>{
  for(const organ of Object.values(detailedOrgans)){
    assert.equal(organ.license.name,'CC BY 4.0');
    assert.ok(organ.source.authors.includes('Kristen Browne')&&organ.source.authors.includes('Heidi Schlehlein'));
    assert.match(organ.source.doi,/^https:\/\/doi\.org\/10\.48539\//);
    assert.ok(organ.notes.some(note=>/гистологическ/.test(note)));
    assert.ok(fs.existsSync(path.join(root,'models/hra',organ.id+'-metadata.yaml')));
  }
  assert.ok(detailedOrgans.brain.notes.some(note=>/зеркально/.test(note)));
  assert.ok(detailedOrgans.brain.notes.some(note=>/ось X/.test(note)));
});
