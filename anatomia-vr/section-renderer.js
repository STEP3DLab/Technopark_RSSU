import * as THREE from './vendor/three.module.min.js';
import {sectionPlaneData} from './section-state.js';

// The original meshes remain untouched. Clipping is evaluated in world space by
// Three.js; auxiliary meshes share geometry but own their disposable materials.
export function createSectionRenderer({scene,renderer,meshes}){
  const root=new THREE.Group();root.name='Anatomical section helpers';scene.add(root);
  const planes=[new THREE.Plane(),new THREE.Plane()],saved=new Map(),capEntries=new Map(),guideEntries=[];
  const planeGeometry=new THREE.PlaneGeometry(1,1),edgeGeometry=new THREE.EdgesGeometry(planeGeometry);
  let activePlanes=[],activeIds=new Set(),active=false,capAvailable=false,lastBounds=new THREE.Box3();
  const previousClipping=renderer.localClippingEnabled,visibility=new Map();
  try{capAvailable=!!renderer.getContext?.().getContextAttributes?.()?.stencil;}catch{}
  for(let i=0;i<2;i++){
    const group=new THREE.Group(),fill=new THREE.Mesh(planeGeometry,new THREE.MeshBasicMaterial({color:0x13a8a0,side:THREE.DoubleSide,transparent:true,opacity:.055,depthWrite:false,toneMapped:false}));
    const edge=new THREE.LineSegments(edgeGeometry,new THREE.LineBasicMaterial({color:0x128f8c,transparent:true,opacity:.8,depthWrite:false,toneMapped:false}));
    fill.renderOrder=200;edge.renderOrder=201;group.add(fill,edge);root.add(group);guideEntries.push(group);
  }
  function placement(object,plane,box){
    const size=box.getSize(new THREE.Vector3()),normal=plane.normal;
    const axis=Math.abs(normal.x)>.5?0:Math.abs(normal.y)>.5?1:2;
    object.position.copy(box.getCenter(new THREE.Vector3()));object.position.setComponent(axis,-plane.constant/normal.getComponent(axis));
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
    object.scale.set((axis===0?size.z:size.x)*1.12+.002,(axis===1?size.z:size.y)*1.12+.002,1);
  }
  function entryFor(mesh,index){
    const key=mesh.uuid+':'+index;if(capEntries.has(key))return capEntries.get(key);
    const stencil=new THREE.MeshBasicMaterial({depthWrite:false,depthTest:false,colorWrite:false,stencilWrite:true,stencilFunc:THREE.AlwaysStencilFunc,clippingPlanes:[planes[index]]});
    const backMaterial=stencil.clone(),frontMaterial=stencil.clone();stencil.dispose();
    // Material.clone() clones Plane objects too; these masks must track the
    // live cutting plane as its position, direction and thickness change.
    backMaterial.clippingPlanes=frontMaterial.clippingPlanes=[planes[index]];
    backMaterial.side=THREE.BackSide;backMaterial.stencilFail=backMaterial.stencilZFail=backMaterial.stencilZPass=THREE.IncrementWrapStencilOp;
    frontMaterial.side=THREE.FrontSide;frontMaterial.stencilFail=frontMaterial.stencilZFail=frontMaterial.stencilZPass=THREE.DecrementWrapStencilOp;
    const back=new THREE.Mesh(mesh.geometry,backMaterial),front=new THREE.Mesh(mesh.geometry,frontMaterial);
    // Count all fragments before drawing this mesh's geometric closure. Isolate
    // each stencil pass so overlapping organs do not inherit another's winding.
    const order=2+capEntries.size*3;back.renderOrder=front.renderOrder=order;
    back.matrixAutoUpdate=front.matrixAutoUpdate=false;
    const material=new THREE.MeshStandardMaterial({color:mesh.material.color,roughness:.85,metalness:0,side:THREE.DoubleSide,stencilWrite:true,stencilRef:0,stencilFunc:THREE.NotEqualStencilFunc,stencilFail:THREE.ReplaceStencilOp,stencilZFail:THREE.ReplaceStencilOp,stencilZPass:THREE.ReplaceStencilOp,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const cap=new THREE.Mesh(planeGeometry,material);cap.renderOrder=order+1;cap.frustumCulled=false;
    cap.onAfterRender=renderer=>renderer.clearStencil();
    root.add(back,front,cap);const entry={back,front,cap,source:mesh,index};capEntries.set(key,entry);return entry;
  }
  function restore(){
    for(const [material,previous]of saved){
      material.clippingPlanes=previous.planes;material.clipIntersection=previous.intersection;material.clipShadows=previous.shadows;material.alphaToCoverage=previous.coverage;material.needsUpdate=true;
    }
    saved.clear();activePlanes=[];activeIds.clear();visibility.clear();active=false;root.visible=false;renderer.localClippingEnabled=previousClipping;
  }
  function update({enabled,config,affected}){
    const ids=new Set(affected),targets=meshes.filter(mesh=>ids.has(mesh.userData.organId)&&mesh.visible);
    const box=new THREE.Box3();targets.forEach(mesh=>box.expandByObject(mesh));
    if(!enabled||!targets.length||box.isEmpty()){restore();return {capAvailable,planes:[],bounds:null};}
    const data=sectionPlaneData(config,box.min.toArray(),box.max.toArray());
    if(!data){restore();return {capAvailable,planes:[],bounds:null};}
    activePlanes=data.planes.map((value,i)=>{planes[i].normal.fromArray(value.normal);planes[i].constant=value.constant;return planes[i];});
    activeIds=ids;active=true;root.visible=true;lastBounds.copy(box);renderer.localClippingEnabled=true;visibility.clear();
    for(const mesh of meshes){
      const material=mesh.material,apply=ids.has(mesh.userData.organId);
      if(apply){
        if(!saved.has(material))saved.set(material,{planes:material.clippingPlanes,intersection:material.clipIntersection,shadows:material.clipShadows,coverage:material.alphaToCoverage});
        const changed=material.clippingPlanes?.length!==activePlanes.length;
        material.clippingPlanes=activePlanes;material.clipIntersection=false;material.clipShadows=true;material.alphaToCoverage=true;if(changed)material.needsUpdate=true;
        visibility.set(mesh,intersectsRetainedSurface(mesh));
      }else if(saved.has(material)){
        const prior=saved.get(material);material.clippingPlanes=prior.planes;material.clipIntersection=prior.intersection;material.clipShadows=prior.shadows;material.alphaToCoverage=prior.coverage;material.needsUpdate=true;saved.delete(material);
      }
    }
    for(const entry of capEntries.values())entry.back.visible=entry.front.visible=entry.cap.visible=false;
    if(config.cap&&capAvailable)for(const mesh of targets){
      if(mesh.material.transparent||mesh.material.opacity<1)continue;
      mesh.updateWorldMatrix(true,false);const meshBox=new THREE.Box3().setFromObject(mesh);
      for(let i=0;i<activePlanes.length;i++){
        if(!meshBox.intersectsPlane(planes[i]))continue;
        const entry=entryFor(mesh,i);entry.back.visible=entry.front.visible=entry.cap.visible=true;
        entry.back.matrix.copy(mesh.matrixWorld);entry.front.matrix.copy(mesh.matrixWorld);entry.back.matrixWorldNeedsUpdate=entry.front.matrixWorldNeedsUpdate=true;
        const others=activePlanes.filter((_,j)=>j!==i);if(entry.cap.material.clippingPlanes?.length!==others.length)entry.cap.material.needsUpdate=true;
        entry.cap.material.clippingPlanes=others;entry.cap.material.color.copy(mesh.material.color).lerp(new THREE.Color(0xf2d7be),.36);
        placement(entry.cap,planes[i],meshBox);
      }
    }
    guideEntries.forEach((guide,i)=>{guide.visible=config.guide&&i<activePlanes.length;if(guide.visible)placement(guide,planes[i],box);});
    return {capAvailable,planes:activePlanes,bounds:box,position:data.position,width:data.width};
  }
  function allows(mesh,point){return !active||!activeIds.has(mesh.userData.organId)||activePlanes.every(plane=>plane.distanceToPoint(point)>=-1e-7);}
  function intersectsRetainedSurface(mesh){
    const box=new THREE.Box3().setFromObject(mesh);
    if(!activePlanes.every(plane=>{
      const extreme=new THREE.Vector3(plane.normal.x>=0?box.max.x:box.min.x,plane.normal.y>=0?box.max.y:box.min.y,plane.normal.z>=0?box.max.z:box.min.z);
      return plane.distanceToPoint(extreme)>=-1e-7;
    }))return false;
    // All planes are parallel. A triangle survives exactly when its coordinate
    // interval overlaps the retained interval; this also handles disconnected
    // meshes where a slab lies in empty space inside the bounding box.
    const normal=activePlanes[0].normal,axis=Math.abs(normal.x)>.5?0:Math.abs(normal.y)>.5?1:2;
    let low=-Infinity,high=Infinity;
    for(const plane of activePlanes){const component=plane.normal.getComponent(axis),coordinate=-plane.constant/component;if(component>0)low=Math.max(low,coordinate);else high=Math.min(high,coordinate);}
    const position=mesh.geometry.getAttribute('position'),indices=mesh.geometry.index,matrix=mesh.matrixWorld.elements;
    const value=index=>matrix[axis]*position.getX(index)+matrix[axis+4]*position.getY(index)+matrix[axis+8]*position.getZ(index)+matrix[axis+12];
    const count=indices?.count??position.count;
    for(let i=0;i+2<count;i+=3){
      const a=value(indices?indices.getX(i):i),b=value(indices?indices.getX(i+1):i+1),c=value(indices?indices.getX(i+2):i+2);
      if(Math.min(a,b,c)<=high+1e-7&&Math.max(a,b,c)>=low-1e-7)return true;
    }
    return false;
  }
  function hasVisible(mesh){return !active||!activeIds.has(mesh.userData.organId)||visibility.get(mesh)!==false;}
  function dispose(){
    restore();root.removeFromParent();
    for(const entry of capEntries.values()){entry.back.material.dispose();entry.front.material.dispose();entry.cap.material.dispose();}
    for(const guide of guideEntries)guide.traverse(object=>object.material?.dispose?.());
    planeGeometry.dispose();edgeGeometry.dispose();capEntries.clear();
  }
  return {update,allows,hasVisible,dispose,get capAvailable(){return capAvailable;},get active(){return active;},get planes(){return activePlanes;},get bounds(){return lastBounds;},root};
}
