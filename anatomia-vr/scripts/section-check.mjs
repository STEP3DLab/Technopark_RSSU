import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.min.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {defaultSectionConfig,normalizeSectionConfig,normalizeSectionSnapshot,patchSectionConfig,sectionPlaneData,pointInSection} from '../section-state.js';
import {createSectionRenderer} from '../section-renderer.js';

const config=patch=>({...defaultSectionConfig,...patch});
function fixture(stencil=true){
  const scene=new THREE.Scene(),renderer={localClippingEnabled:false,getContext:()=>({getContextAttributes:()=>({stencil})})};
  const a=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshStandardMaterial({color:'#cc4455'}));a.userData.organId='heart';
  const b=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ddbb88'}));b.userData.organId='brain';b.position.set(0,3,0);
  scene.add(a,b);scene.updateMatrixWorld(true);
  const sections=createSectionRenderer({scene,renderer,meshes:[a,b]});
  return {scene,renderer,a,b,sections};
}

test('Configuration rejects malformed values, prototype keys, unsupported axes and extra saved fields',()=>{
  assert.deepEqual(normalizeSectionConfig(defaultSectionConfig),defaultSectionConfig);
  for(const bad of [{position:NaN},{position:'0.5'},{position:1.1},{thickness:.01},{guide:1},{flipped:'false'},{axis:'horizontal'},{mode:'xray'},{scope:'all'}])assert.equal(normalizeSectionConfig(config(bad)),null);
  assert.equal(patchSectionConfig(defaultSectionConfig,JSON.parse('{"__proto__": {"guide":false}}')),null);
  assert.equal(normalizeSectionSnapshot({enabled:true,config:defaultSectionConfig,learner:'private'}),null);
  assert.equal(normalizeSectionSnapshot({enabled:1,config:defaultSectionConfig}),null);
  const inherited=Object.assign(Object.create({enabled:true}),{config:defaultSectionConfig,unexpected:'private'});
  assert.equal(normalizeSectionSnapshot(inherited),null);
  assert.deepEqual(normalizeSectionSnapshot({enabled:true,config:defaultSectionConfig}),{enabled:true,config:defaultSectionConfig});
  assert.equal(defaultSectionConfig.cap,false);
});

test('Three anatomical directions preserve the documented positive half-space and flipping reverses only the cut',()=>{
  for(const [axis,index]of [['sagittal',0],['axial',1],['coronal',2]]){
    const low=[-2,-3,-4],high=[2,3,4],positive=[0,0,0],negative=[0,0,0];positive[index]=.5;negative[index]=-.5;
    const cut=sectionPlaneData(config({axis}),low,high),flip=sectionPlaneData(config({axis,flipped:true}),low,high);
    assert.equal(pointInSection(positive,cut.planes),true);assert.equal(pointInSection(negative,cut.planes),false);
    assert.equal(pointInSection(positive,flip.planes),false);assert.equal(pointInSection(negative,flip.planes),true);
    for(const point of [positive,negative]){
      const p=cut.planes[0],three=new THREE.Plane(new THREE.Vector3(...p.normal),p.constant);
      assert.equal(three.distanceToPoint(new THREE.Vector3(...point))>=0,pointInSection(point,cut.planes));
    }
  }
});

test('A thin slab remains inside the object at either travel limit and excludes both neighbouring portions',()=>{
  for(const axis of ['axial','coronal','sagittal'])for(const position of [0,.5,1])for(const thickness of [.04,.15,1]){
    const data=sectionPlaneData(config({axis,position,thickness,mode:'slab'}),[-1,-1,-1],[1,1,1]);
    const center=[0,0,0];center[data.axis]=data.position;
    assert.equal(pointInSection(center,data.planes),true);
    for(const delta of [-1,1]){const outside=[...center];outside[data.axis]+=delta*(data.width/2+.01);assert.equal(pointInSection(outside,data.planes),false);}
    assert.ok(data.position-data.width/2>=-1-1e-9);assert.ok(data.position+data.width/2<=1+1e-9);
  }
});

test('Clipping restores every prior material property and renderer flag without altering source vertices',()=>{
  const {a,b,renderer,sections}=fixture();
  const geometryBefore=Array.from(a.geometry.attributes.position.array),prior=[new THREE.Plane(new THREE.Vector3(1,0,0),100)];
  a.material.clippingPlanes=prior;a.material.clipIntersection=true;a.material.clipShadows=false;a.material.alphaToCoverage=false;
  sections.update({enabled:true,config:config({axis:'coronal'}),affected:['heart']});
  assert.equal(a.material.clippingPlanes.length,1);assert.equal(b.material.clippingPlanes,null);assert.equal(renderer.localClippingEnabled,true);
  assert.equal(sections.allows(a,new THREE.Vector3(0,0,-.5)),false);assert.equal(sections.allows(b,new THREE.Vector3(0,3,-.5)),true);
  sections.update({enabled:false,config:config(),affected:[]});
  assert.equal(a.material.clippingPlanes,prior);assert.equal(a.material.clipIntersection,true);assert.equal(a.material.clipShadows,false);assert.equal(a.material.alphaToCoverage,false);assert.equal(renderer.localClippingEnabled,false);
  assert.deepEqual(Array.from(a.geometry.attributes.position.array),geometryBefore);assert.equal(sections.root.visible,false);
  sections.dispose();
});

test('Changing the selected target removes the previous clip and follows the new target’s world coordinates',()=>{
  const {a,b,sections}=fixture();
  sections.update({enabled:true,config:config(),affected:['heart']});assert.ok(Math.abs(a.material.clippingPlanes[0].constant)<1e-12);
  sections.update({enabled:true,config:config(),affected:['brain']});
  assert.equal(a.material.clippingPlanes,null);assert.equal(b.material.clippingPlanes[0].constant,-3);
  assert.equal(sections.allows(b,new THREE.Vector3(0,2.8,0)),false);assert.equal(sections.allows(b,new THREE.Vector3(0,3.2,0)),true);
  sections.dispose();
});

test('Picking through a removed front surface reaches the retained back of the real mesh',()=>{
  const {a,sections}=fixture();
  sections.update({enabled:true,config:config({axis:'coronal',flipped:true}),affected:['heart']});
  const ray=new THREE.Raycaster(new THREE.Vector3(0,0,4),new THREE.Vector3(0,0,-1));a.material.side=THREE.DoubleSide;
  const hits=ray.intersectObject(a,false),visible=hits.filter(hit=>sections.allows(hit.object,hit.point));
  assert.equal(hits[0].point.z,1);assert.equal(visible[0].point.z,-1);assert.ok(visible.every(hit=>hit.point.z<=0));sections.dispose();
});

test('Whole-scene cuts hide labels for fully removed meshes and preserve surviving ones',()=>{
  const {a,b,sections}=fixture();
  sections.update({enabled:true,config:config({position:.55}),affected:['heart','brain']});
  assert.equal(sections.hasVisible(a),false);assert.equal(sections.hasVisible(b),true);sections.dispose();
});

test('A slab between disconnected components contains no source surface and produces no label',()=>{
  const {a,sections}=fixture();
  // Two triangles, below and above the origin, are intentionally disconnected.
  a.geometry.dispose();a.geometry=new THREE.BufferGeometry();
  a.geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-2,0,1,-2,0,0,-1,0,-1,1,0,1,1,0,0,2,0],3));
  sections.update({enabled:true,config:config({mode:'slab',thickness:.1}),affected:['heart']});
  assert.equal(sections.hasVisible(a),false);sections.dispose();
});

test('Optional stencil closure owns only helper materials and keeps the two slab boundary masks independent',()=>{
  const {a,sections}=fixture();let sourceDisposals=0,sourceMaterialDisposals=0;
  a.geometry.addEventListener('dispose',()=>sourceDisposals++);a.material.addEventListener('dispose',()=>sourceMaterialDisposals++);
  sections.update({enabled:true,config:config({mode:'slab',cap:true}),affected:['heart']});
  const caps=sections.root.children.filter(object=>object.material?.stencilFunc===THREE.NotEqualStencilFunc),masks=sections.root.children.filter(object=>object.material?.colorWrite===false);
  assert.equal(caps.length,2);assert.equal(masks.length,4);assert.ok(caps.every(cap=>cap.material.clippingPlanes.length===1&&cap.frustumCulled===false));
  assert.notEqual(caps[0].material.clippingPlanes[0],caps[1].material.clippingPlanes[0]);
  assert.ok(masks.every(mask=>mask.geometry===a.geometry&&mask.material.depthWrite===false&&mask.material.depthTest===false));
  let clears=0;caps[0].onAfterRender({clearStencil:()=>clears++});assert.equal(clears,1);
  sections.update({enabled:true,config:config({mode:'slab',cap:true,position:.8,axis:'coronal'}),affected:['heart']});
  assert.ok(masks.every(mask=>mask.material.clippingPlanes[0].normal.z!==0),'Stencil masks must follow later plane-axis changes');
  assert.ok(masks.every(mask=>sections.planes.includes(mask.material.clippingPlanes[0])),'Stencil passes use the live plane objects, not Material.clone snapshots');
  sections.dispose();assert.equal(sourceDisposals,0);assert.equal(sourceMaterialDisposals,0);assert.equal(sections.root.parent,null);
});

test('No stencil support still gives true clipping while the optional closure remains unavailable',()=>{
  const {a,sections}=fixture(false);const result=sections.update({enabled:true,config:config({cap:true}),affected:['heart']});
  assert.equal(result.capAvailable,false);assert.equal(a.material.clippingPlanes.length,1);assert.equal(sections.root.children.some(object=>object.material?.stencilWrite),false);sections.dispose();
});

test('The three actual source GLBs support cuts and slabs under world transforms without changing geometry',async()=>{
  for(const [file,count,mirror]of [['atlas.glb',16,false],['hra-heart.glb',14,false],['hra-brain.glb',283,true]]){
    const bytes=fs.readFileSync(new URL('../models/'+file,import.meta.url));
    const source=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    const scene=new THREE.Scene(),meshes=[],signatures=new Map(),disposed=new Set();
    scene.add(source.scene);source.scene.scale.x=mirror?-1:1;source.scene.position.set(.4,-.2,.3);source.scene.updateMatrixWorld(true);
    source.scene.traverse(mesh=>{
      if(!mesh.isMesh)return;mesh.userData.organId=String(meshes.length);meshes.push(mesh);
      mesh.material=new THREE.MeshStandardMaterial({color:0xbb9988,side:THREE.DoubleSide});
      const positions=mesh.geometry.attributes.position.array;
      signatures.set(mesh,[positions,positions.length,positions[0],positions[positions.length-1]]);mesh.geometry.addEventListener('dispose',()=>disposed.add(mesh));
    });
    assert.equal(meshes.length,count,file);
    const renderer={localClippingEnabled:false,getContext:()=>({getContextAttributes:()=>({stencil:true})})},sections=createSectionRenderer({scene,renderer,meshes}),affected=meshes.map(mesh=>mesh.userData.organId);
    for(const axis of ['axial','coronal','sagittal'])for(const mode of ['cut','slab']){
      const result=sections.update({enabled:true,config:config({axis,mode,scope:'visible',position:.5,thickness:.12}),affected});
      assert.equal(result.planes.length,mode==='cut'?1:2,file);assert.ok(meshes.some(mesh=>sections.hasVisible(mesh)),file+' retains actual source surfaces');
      const center=result.bounds.getCenter(new THREE.Vector3());
      assert.ok(result.planes.every(plane=>plane.distanceToPoint(center)>=-1e-6),file+' planes use transformed world coordinates');
      assert.ok(meshes.every(mesh=>mesh.material.clippingPlanes.length===result.planes.length));
    }
    // Exercise a real transformed mesh through the optional stencil path too.
    sections.update({enabled:true,config:config({axis:'sagittal',cap:true}),affected:[meshes[0].userData.organId]});
    const masks=sections.root.children.filter(object=>object.material?.colorWrite===false);
    assert.ok(masks.length>0);assert.ok(masks.every(mask=>mask.matrix.equals(meshes[0].matrixWorld)),file+' mask transform');
    sections.dispose();assert.equal(disposed.size,0);assert.equal(renderer.localClippingEnabled,false);
    for(const mesh of meshes){const sig=signatures.get(mesh),array=mesh.geometry.attributes.position.array;assert.equal(array,sig[0]);assert.equal(array.length,sig[1]);assert.equal(array[0],sig[2]);assert.equal(array[array.length-1],sig[3]);assert.equal(mesh.material.clippingPlanes,null);}
  }
});
