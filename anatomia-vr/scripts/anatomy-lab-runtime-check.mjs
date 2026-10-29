import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import * as THREE from '../vendor/three.module.min.js';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {detailedOrgans} from '../anatomical-parts.js';
import * as layerState from '../anatomy-lab-state.js';
import * as sectionState from '../section-state.js';
import {createSectionRenderer} from '../section-renderer.js';
import * as profiles from '../render-profile.js';

// Production functions + real source GLBs and Three.js mathematics. The renderer
// and DOM are explicit stand-ins: this suite does not validate a GPU or layout.
const sourceURL=new URL('../anatomy-lab.js',import.meta.url);
const executable=fs.readFileSync(sourceURL,'utf8').replace(/^import .*$/gm,'').replaceAll('import.meta.url',JSON.stringify(sourceURL.href));
function harness(){
  const elements=new Map(),listeners=new Map(),renderers=[];
  function node(selector){
    if(!elements.has(selector)){
      const attributes=new Map(),events=new Map(),classes=new Set();
      elements.set(selector,{
        id:selector.startsWith('#')?selector.slice(1):'',open:true,hidden:false,disabled:false,checked:false,innerHTML:'',textContent:'',value:'',dataset:{},isConnected:true,
        clientWidth:800,clientHeight:650,style:{setProperty(name,value){this[name]=value;}},
        rect:{left:0,top:0,right:800,bottom:650,width:800,height:650},
        getBoundingClientRect(){return {...this.rect};},
        classList:{add(...values){values.forEach(v=>classes.add(v));},remove(...values){values.forEach(v=>classes.delete(v));},toggle(value,on){on??=!classes.has(value);if(on)classes.add(value);else classes.delete(value);return on;},contains(value){return classes.has(value);}},
        querySelector:node,querySelectorAll(){return [];},append(){},remove(){this.isConnected=false;},focus(){document.activeElement=this;},select(){},
        setAttribute(name,value){attributes.set(name,String(value));},getAttribute(name){return attributes.get(name);},removeAttribute(name){attributes.delete(name);},
        addEventListener(name,callback){events.set(name,callback);},dispatch(name,event={}){events.get(name)?.(event);},
        showModal(){this.open=true;},close(){this.open=false;events.get('close')?.({});},
        hasPointerCapture(){return false;},setPointerCapture(){},releasePointerCapture(){}
      });
    }
    return elements.get(selector);
  }
  const document={hidden:false,activeElement:null,events:[],body:node('body'),querySelectorAll:()=>[],createElement:tag=>node('created-'+tag),addEventListener(name,callback){listeners.set(name,callback);},dispatchEvent(event){this.events.push(event);listeners.get(event.type)?.(event);}};
  const fakeDialog=node('dialog');
  node('.lab-view-controls').rect={left:20,top:20,right:480,bottom:64,width:460,height:44};
  node('.lab-sectionbar').rect={left:22,top:530,right:778,bottom:632,width:756,height:102};
  function makeRenderer(){
    const domElement=node('canvas-'+renderers.length),renderer={domElement,localClippingEnabled:false,disposed:false,contextLost:false,loop:null,capabilities:{maxTextureSize:8192},
      getContext:()=>({getContextAttributes:()=>({stencil:true}),MAX_RENDERBUFFER_SIZE:0x84E8,getParameter:()=>8192}),
      setAnimationLoop(fn){this.loop=fn;},setPixelRatio(value){this.ratio=value;},setSize(w,h){this.size=[w,h];},render(){this.frames=(this.frames||0)+1;},
      dispose(){this.disposed=true;},forceContextLoss(){this.contextLost=true;}};
    renderers.push(renderer);return renderer;
  }
  const context=vm.createContext({THREE,GLTFLoader,detailedOrgans,...layerState,...sectionState,...profiles,createSectionRenderer,
    URL,URLSearchParams,AbortController,Uint8Array,assert,document,window:{addEventListener(){}},fakeDialog,makeRenderer,
    console:{warn(){}},CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail;}},
    location:{href:'https://example.org/anatomia-vr/?v=1.10.0'},matchMedia:()=>({matches:false}),devicePixelRatio:2,navigator:{deviceMemory:8},
    requestAnimationFrame:()=>1,ResizeObserver:class{observe(){}},
    fetch:async url=>{const name=new URL(url).pathname.split('/').at(-1),bytes=fs.readFileSync(new URL('../models/'+name,import.meta.url));return {ok:true,headers:{get:()=>String(bytes.length)},arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}
  });
  const run=code=>vm.runInContext(code,context,{filename:'anatomy-lab.js'});run(executable);
  run(`dialog=fakeDialog;renderSelection=()=>{};syncLayerControls=()=>{};
    initializeGraphics=()=>{renderer=makeRenderer();scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(35,1,.001,20);pointerAbort=new AbortController();bindOrbit();renderer.setAnimationLoop(render);};`);
  return {run,node,renderers,context};
}

test('Both detailed source organs load all exact parts, apply atlas orientation and fit their original world bounds',async()=>{
  for(const id of ['heart','brain']){
    const h=harness();await h.run(`loadOrgan('${id}')`);
    h.run(`
      assert.equal(ready,true);assert.equal(meshes.length,detailedOrgans[organ].parts.length);assert.equal(partMeshes.size,meshes.length);
      assert.deepEqual(Array.from(model.scale.toArray()),Array.from(definition().nativeToAtlasScale));assert.equal(sectionEnabled,false);
      render(16);camera.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model);assert.ok(view.target.distanceTo(box.getCenter(new THREE.Vector3()))<1e-8);
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
        const p=new THREE.Vector3(x,y,z).project(camera),px=(p.x+1)*frame.viewportWidth/2,py=(1-p.y)*frame.viewportHeight/2;
        assert.ok(px>=frame.left-1e-6&&px<=frame.left+frame.width+1e-6);assert.ok(py>=frame.top-1e-6&&py<=frame.top+frame.height+1e-6);
      }
      assert.ok(renderer.frames>0);assert.equal(renderer.loop,render);
    `);
    h.run('closeLab()');
  }
});

test('Manual framing survives quality, viewport and cut controls while genuine cuts affect source materials',async()=>{
  const h=harness();await h.run("loadOrgan('heart')");
  h.run(`
    view.theta=.7;view.phi=1.1;view.toRadius=.42;view.toTarget.set(.1,1.3,-.04);view.automatic=false;
    const before=JSON.stringify([view.theta,view.phi,view.toRadius,view.toTarget.toArray()]);
    quality='eco';resize();sectionEnabled=true;setSection({axis:'coronal',mode:'slab',position:.72,thickness:.1});resize();
    assert.equal(JSON.stringify([view.theta,view.phi,view.toRadius,view.toTarget.toArray()]),before);
    assert.ok(meshes.every(mesh=>mesh.material.clippingPlanes.length===2));assert.ok(meshes.some(mesh=>slicer.hasVisible(mesh)));
    sectionEnabled=false;updateSection();assert.ok(meshes.every(mesh=>mesh.material.clippingPlanes===null));
    closeLab();
  `);
});

test('Layer inspection uses actual selected surfaces, restores hidden context and protects the last structure',async()=>{
  const h=harness();await h.run("loadOrgan('heart')");
  h.run(`
    const id=definition().parts[0].id;selectPart(id);
    assert.equal(layers.get().selected,id);assert.equal(partMeshes.get(id).material.opacity,1);
    assert.ok(meshes.filter(mesh=>mesh.userData.labPart!==id).every(mesh=>mesh.material.opacity===.12));
    context=false;applyAppearance();assert.equal(meshes.filter(mesh=>mesh.visible).length,1);
    context=true;applyAppearance();assert.equal(meshes.filter(mesh=>mesh.visible).length,meshes.length);
    layers.only([id]);applyAppearance();changeVisible([id],false);assert.equal(layers.get().visible.length,1);assert.ok(lastMessage.includes('хотя бы'));
    closeLab();
  `);
});

test('Picking ignores a cut-away foreground surface and prioritises opaque anatomy over translucent context',async()=>{
  const h=harness();await h.run("loadOrgan('heart')");
  h.run(`
    disposeModel();model=new THREE.Group();scene.add(model);layers=createLayerState(definition().parts);
    const ids=definition().parts.slice(0,2).map(part=>part.id);
    ids.forEach((id,i)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({side:THREE.DoubleSide}));mesh.position.z=i===0?2:0;mesh.userData={organId:id,labPart:id,displayColor:new THREE.Color(0xbb9988)};meshes.push(mesh);partMeshes.set(id,mesh);model.add(mesh);});
    model.updateMatrixWorld(true);slicer=createSectionRenderer({scene,renderer,meshes});camera.clearViewOffset();camera.aspect=800/650;camera.updateProjectionMatrix();camera.position.set(0,0,6);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
    sectionEnabled=true;sectionConfig={...defaultSectionConfig,scope:'visible',axis:'coronal',flipped:true};updateSection();pick(400,325);
    assert.equal(layers.get().selected,ids[1],'Retained rear structure is selected through the cut');
    sectionEnabled=false;layers.select(ids[1]);inspection=true;context=true;applyAppearance();pick(400,325);
    assert.equal(layers.get().selected,ids[1],'A transparent foreground does not steal selection from visible opaque anatomy');
    closeLab();
  `);
});

test('Failure stops and disposes the old renderer; switching organs creates a live fresh loop',async()=>{
  const h=harness();await h.run("loadOrgan('heart')");const first=h.renderers.at(-1);
  h.run("const priorEpoch=epoch,priorRequest=requestController;fail('Test interrupted graphics connection');assert.equal(ready,false);assert.equal(renderer,null);assert.equal(model,null);assert.ok(epoch>priorEpoch);assert.equal(priorRequest.signal.aborted,true);assert.equal(requestController,null);");
  assert.equal(first.disposed,true);assert.equal(first.loop,null);assert.equal(h.node('[data-lab-action="retry"]').hidden,false);
  await h.run("loadOrgan('brain')");assert.notEqual(h.renderers.at(-1),first);
  h.run('assert.equal(ready,true);assert.equal(renderer.loop,render);assert.equal(meshes.length,definition().parts.length);closeLab();');
});

test('A rejected WebGL context yields a truthful unavailable state, usable close/retry controls and no pretend model',async()=>{
  const h=harness();h.run("initializeGraphics=()=>{throw new Error('WebGL disabled in test context')};");await h.run("loadOrgan('heart')");
  h.run("assert.equal(ready,false);assert.equal(renderer,null);assert.equal(model,null);assert.equal(meshes.length,0);");
  assert.equal(h.node('#lab-loading-title').textContent,'3D сейчас недоступен');assert.match(h.node('#lab-loading-message').textContent,/WebGL/);assert.equal(h.node('.lab-spinner').hidden,true);assert.equal(h.node('[data-lab-action="retry"]').hidden,false);
  h.run('closeLab()');
});

test('Closing disposes loaded geometry and helper resources once, aborts requests and resumes the atlas through its public event',async()=>{
  const h=harness();await h.run("loadOrgan('heart')");
  h.run(`
    const counts=new Map();for(const mesh of meshes){counts.set(mesh.geometry,0);mesh.geometry.addEventListener('dispose',()=>counts.set(mesh.geometry,counts.get(mesh.geometry)+1));}
    sectionEnabled=true;updateSection();const priorRenderer=renderer,priorSlicer=slicer;closeLab();
    assert.equal(renderer,null);assert.equal(model,null);assert.equal(slicer,null);assert.equal(requestController,null);assert.equal(priorRenderer.loop,null);assert.equal(priorRenderer.disposed,true);
    assert.equal(priorSlicer.root.parent,null);assert.ok([...counts.values()].every(count=>count===1));
    assert.ok(document.events.some(event=>event.type==='anatomia:lab-visibility'&&event.detail.open===false));
  `);
});

test('Explicit view and focus actions stop rotation instead of immediately drifting from their advertised angle',async()=>{
  const h=harness();await h.run("loadOrgan('heart')");
  for(const action of ['home','front','back','focus-part'])h.run(`
    rotation=true;handleClick({target:{closest:()=>({dataset:{labAction:'${action}'},disabled:false})}});assert.equal(rotation,false);
  `);
  h.run('bindOrbit();rotation=true;');const canvas=h.renderers.at(-1).domElement;
  for(const key of ['h','f']){h.run('rotation=true;');canvas.dispatch('keydown',{key,preventDefault(){}});h.run('assert.equal(rotation,false);');}
  h.run('closeLab()');
});

test('A partial import failure disposes detached source materials as well as the replacement materials',async()=>{
  const h=harness();await h.run("loadOrgan('heart')");
  h.run(`
    const detached=new THREE.MeshStandardMaterial();let disposals=0;detached.addEventListener('dispose',()=>disposals++);sourceMaterials.add(detached);
    disposeModel();assert.equal(disposals,1);assert.equal(sourceMaterials.size,0);closeLab();
  `);
});
