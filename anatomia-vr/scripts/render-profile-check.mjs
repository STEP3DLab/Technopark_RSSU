import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import {organs} from '../data.js';
import {graphicsProfiles,normalizeGraphicsQuality,resolveGraphicsProfile,organSurfaces,studioLightProfile,safeSceneFrame,fittedSceneRadius} from '../render-profile.js';

test('Every source organ has a bounded nonmetallic surface profile without invented texture data',()=>{
  assert.deepEqual(Object.keys(organSurfaces).sort(),organs.map(o=>o.id).sort());
  assert.ok(new Set(Object.values(organSurfaces).map(p=>p.roughness)).size>=5);
  for(const surface of Object.values(organSurfaces)){
    assert.equal(surface.metalness,0);assert.ok(surface.roughness>=.35&&surface.roughness<=.8);
    assert.deepEqual(Object.keys(surface).sort(),['metalness','roughness']);assert.ok(Object.isFrozen(surface));
  }
  assert.equal(studioLightProfile.exposure,1.08);
});

test('Quality resolution obeys native DPR, hardware dimensions and pixel budgets across displays',()=>{
  for(const quality of Object.keys(graphicsProfiles))for(const [width,height] of [[390,600],[768,770],[1366,768],[1920,1080],[3840,2160],[7680,4320]])for(const dpr of [.8,1,1.25,2,3,4])for(const maxSize of [1024,4096,8192]){
    const result=resolveGraphicsProfile(quality,{width,height,dpr,maxSize});
    assert.ok(result.effectiveDPR>0&&result.effectiveDPR<=dpr);
    assert.ok(result.width<=maxSize&&result.height<=maxSize);
    assert.ok(result.pixels<=graphicsProfiles[quality].maxPixels);
  }
});

test('Automatic resolution has a conservative touch/low-memory limit and profiles reject malformed names',()=>{
  for(const quality of ['auto','high','eco'])assert.equal(normalizeGraphicsQuality(quality),quality);
  for(const value of [null,undefined,{},[],true,'__proto__','toString','ultra'])assert.equal(normalizeGraphicsQuality(value),null);
  const options={width:1200,height:800,dpr:3};
  assert.ok(resolveGraphicsProfile('auto',{...options,compact:true}).effectiveDPR<resolveGraphicsProfile('auto',options).effectiveDPR);
  assert.ok(resolveGraphicsProfile('auto',{...options,lowMemory:true}).pixels<=1800000);
  assert.ok(resolveGraphicsProfile('eco',options).effectiveDPR<resolveGraphicsProfile('high',options).effectiveDPR);
  assert.equal(resolveGraphicsProfile('high',{width:0,height:800}),null);
  assert.equal(resolveGraphicsProfile('auto',{width:500,height:NaN}),null);
});

const layouts=[
  {name:'desktop',width:1366,height:750,blocks:[{left:28,top:180,right:248,bottom:450},{left:1034,top:100,right:1338,bottom:680},{left:28,top:530,right:248,bottom:670},{left:500,top:665,right:865,bottom:720}]},
  {name:'tablet',width:768,height:770,blocks:[{left:474,top:28,right:748,bottom:670},{left:20,top:192,right:456,bottom:254},{left:20,top:574,right:192,bottom:690},{left:205.5,top:691,right:562.5,bottom:747}]},
  {name:'phone',width:390,height:600,blocks:[{left:16,top:18,right:330,bottom:98},{left:16,top:159,right:374,bottom:209},{left:16,top:465,right:374,bottom:510},{left:25,top:535,right:365,bottom:578}]},
  {name:'open scene panel',width:390,height:600,blocks:[{left:10,top:350,right:380,bottom:600},{left:16,top:20,right:320,bottom:98}]}
];

test('Measured desktop, tablet, phone and open-panel layouts leave a real unobstructed rectangle',()=>{
  for(const layout of layouts){
    const frame=safeSceneFrame(layout.width,layout.height,layout.blocks);
    assert.equal(frame.blocked,false,layout.name);assert.ok(frame.width>100&&frame.height>100,layout.name);
    for(const block of layout.blocks)assert.ok(frame.right<=block.left||frame.left>=block.right||frame.bottom<=block.top||frame.top>=block.bottom,layout.name);
    assert.ok(frame.left>=0&&frame.top>=0&&frame.right<=layout.width&&frame.bottom<=layout.height);
  }
  assert.ok(safeSceneFrame(768,770,layouts[1].blocks).width>250,'Horizontal tablet controls must not consume all width');
});

test('Actual Three.js projection fits source bounds in six views and ray directions remain aligned',()=>{
  for(const layout of layouts)for(const [theta,phi] of [[0,Math.PI/2],[Math.PI,Math.PI/2],[-Math.PI/2,Math.PI/2],[Math.PI/2,Math.PI/2],[0,.12],[0,Math.PI-.12],[.65,1.3]]){
    const frame=safeSceneFrame(layout.width,layout.height,layout.blocks),size=[.5,1.2,.34];
    const radius=fittedSceneRadius(size,{theta,phi,frame}),target=new THREE.Vector3(.1,1.2,-.1);
    const camera=new THREE.PerspectiveCamera(35,layout.width/layout.height,.01,30);
    camera.setViewOffset(layout.width,layout.height,layout.width/2-frame.centerX,layout.height/2-frame.centerY,layout.width,layout.height);
    camera.position.set(target.x+radius*Math.sin(phi)*Math.sin(theta),target.y+radius*Math.cos(phi),target.z+radius*Math.sin(phi)*Math.cos(theta));
    camera.lookAt(target);camera.updateMatrixWorld(true);
    for(const x of [-size[0]/2,size[0]/2])for(const y of [-size[1]/2,size[1]/2])for(const z of [-size[2]/2,size[2]/2]){
      const point=new THREE.Vector3(x,y,z).add(target),projected=point.clone().project(camera),px=(projected.x+1)*layout.width/2,py=(1-projected.y)*layout.height/2;
      assert.ok(px>=frame.left-1e-6&&px<=frame.right+1e-6&&py>=frame.top-1e-6&&py<=frame.bottom+1e-6,layout.name);
      const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(projected.x,projected.y),camera);
      assert.ok(ray.ray.distanceToPoint(point)<1e-7,'Picking must use the same off-axis camera');
    }
  }
});

test('Degenerate layout and extreme framing remain finite and within shareable camera limits',()=>{
  for(const [width,height] of [[0,0],[1,1],[6,600],[800,1]]){
    const frame=safeSceneFrame(width,height);
    const radius=fittedSceneRadius([.6,1.3,.3],{frame});assert.ok(Number.isFinite(radius)&&radius>=.28&&radius<=25);
  }
  const covered=safeSceneFrame(400,600,[{left:0,top:0,right:400,bottom:600}]);assert.equal(covered.blocked,true);
  assert.equal(fittedSceneRadius([100,100,100],{frame:safeSceneFrame(100,100)}),25);
});
