// Display-only cross sections. Distances use the source model's metre coordinates.
// +X is anatomical left, +Y superior, +Z anterior (see models/ATTRIBUTION.md).
export const defaultSectionConfig=Object.freeze({axis:'axial',mode:'cut',position:.5,thickness:.15,flipped:false,scope:'selected',guide:true,cap:false});
export const sectionAxes=Object.freeze({axial:{index:1,normal:[0,1,0],name:'Поперечный',from:'снизу',to:'вверх'},coronal:{index:2,normal:[0,0,1],name:'Фронтальный',from:'сзади',to:'вперёд'},sagittal:{index:0,normal:[1,0,0],name:'Сагиттальный',from:'справа',to:'влево'}});
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const finite=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
export function normalizeSectionConfig(input){
  if(!object(input)||Object.keys(input).length!==Object.keys(defaultSectionConfig).length||Object.keys(input).some(key=>!Object.hasOwn(defaultSectionConfig,key)))return null;
  if(!Object.hasOwn(sectionAxes,input.axis)||!['cut','slab'].includes(input.mode)||!['selected','visible'].includes(input.scope))return null;
  if(!finite(input.position,0,1)||!finite(input.thickness,.04,1)||!['flipped','guide','cap'].every(key=>typeof input[key]==='boolean'))return null;
  return {axis:input.axis,mode:input.mode,position:Math.round(input.position*1e6)/1e6,thickness:Math.round(input.thickness*1e6)/1e6,flipped:input.flipped,scope:input.scope,guide:input.guide,cap:input.cap};
}
export function patchSectionConfig(current,patch){
  if(!normalizeSectionConfig(current)||!object(patch)||Object.keys(patch).some(key=>!Object.hasOwn(defaultSectionConfig,key)))return null;
  return normalizeSectionConfig({...current,...patch});
}
export function normalizeSectionSnapshot(input){
  if(!object(input)||Object.keys(input).length!==2||!Object.hasOwn(input,'enabled')||typeof input.enabled!=='boolean'||!Object.hasOwn(input,'config'))return null;
  const config=normalizeSectionConfig(input.config);return config?{enabled:input.enabled,config}:null;
}
// Returned plane equations retain their non-negative half space, matching Three.js.
export function sectionPlaneData(config,min,max){
  const valid=normalizeSectionConfig(config),bounds=[min,max];
  if(!valid||bounds.some(v=>!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isFinite(n)))||min.some((v,i)=>max[i]<v))return null;
  const {index,normal}=sectionAxes[valid.axis],low=min[index],high=max[index],length=high-low;
  if(length<=1e-9)return null;
  if(valid.mode==='slab'){
    const width=length*valid.thickness,start=low+(length-width)*valid.position,end=start+width;
    return {axis:index,position:(start+end)/2,width,planes:[{normal:[...normal],constant:-start},{normal:normal.map(n=>-n),constant:end}]};
  }
  const position=low+length*valid.position,sign=valid.flipped?-1:1;
  return {axis:index,position,width:0,planes:[{normal:normal.map(n=>n*sign),constant:-position*sign}]};
}
export function pointInSection(point,planes,epsilon=1e-7){
  return planes.every(plane=>plane.normal.reduce((sum,n,i)=>sum+n*point[i],plane.constant)>=-epsilon);
}
