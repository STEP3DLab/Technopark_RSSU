// Rendering choices describe this educational presentation, not measured tissue properties.
// Geometry, source normals and the atlas' conditional colour palette remain unchanged.
const freeze=value=>Object.freeze(value);
export const graphicsProfiles=freeze({
  auto:freeze({maxDPR:1.6,maxPixels:2600000}),
  high:freeze({maxDPR:2,maxPixels:4000000}),
  eco:freeze({maxDPR:1,maxPixels:1300000})
});
export const normalizeGraphicsQuality=value=>typeof value==='string'&&Object.hasOwn(graphicsProfiles,value)?value:null;
export function resolveGraphicsProfile(quality,{width,height,dpr=1,maxSize=8192,compact=false,lowMemory=false}={}){
  quality=normalizeGraphicsQuality(quality)||'auto';
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
  dpr=Number.isFinite(dpr)&&dpr>0?dpr:1;
  maxSize=Number.isFinite(maxSize)&&maxSize>=1?Math.min(32768,maxSize):8192;
  const profile=graphicsProfiles[quality],constrained=quality==='auto'&&(compact||lowMemory);
  const maxDPR=constrained?1.35:profile.maxDPR,maxPixels=constrained?1800000:profile.maxPixels;
  const limit=Math.min(dpr,maxDPR,Math.sqrt(maxPixels/(width*height)),maxSize/width,maxSize/height);
  // Round down: rounding up could breach a physical framebuffer limit.
  const effectiveDPR=Math.max(Number.EPSILON,Math.floor(limit*1000)/1000||limit);
  const bufferWidth=Math.max(1,Math.floor(width*effectiveDPR)),bufferHeight=Math.max(1,Math.floor(height*effectiveDPR));
  return {quality,effectiveDPR,width:bufferWidth,height:bufferHeight,pixels:bufferWidth*bufferHeight,maxPixels};
}

const surface=roughness=>freeze({roughness,metalness:0});
export const organSurfaces=freeze({
  heart:surface(.43),lungR:surface(.68),lungL:surface(.68),
  liver:surface(.40),stomach:surface(.51),pancreas:surface(.64),gallbladder:surface(.42),
  smallIntestine:surface(.55),colon:surface(.57),kidneyR:surface(.38),kidneyL:surface(.38),
  bladder:surface(.48),brain:surface(.72),spleen:surface(.49),thyroid:surface(.62),airway:surface(.66)
});
export const surfaceProfile=id=>organSurfaces[id]||surface(.58);
export const studioLightProfile=freeze({
  exposure:1.08,
  hemisphere:freeze({sky:0xe7f1f6,ground:0x57616c,intensity:1.15}),
  key:freeze({color:0xfff1e6,intensity:2.5,position:freeze([-3,4.5,5])}),
  fill:freeze({color:0xd6e9f5,intensity:.8,position:freeze([4,1.8,3])}),
  rim:freeze({color:0xb9e0ec,intensity:1.45,position:freeze([1.5,3,-4])})
});
export const selectionProfile=freeze({emissive:.065,answerEmissive:.3,unselectedBrightness:.94,roughnessReduction:.045});

// Find a real unobstructed rectangle, favouring enough height for the body.
// Rectangles are in viewport CSS pixels; DOM measurement lives in app.js.
export function safeSceneFrame(width,height,obstacles=[],preferredAspect=.72){
  width=Number.isFinite(width)&&width>0?width:1;height=Number.isFinite(height)&&height>0?height:1;
  const margin=Math.min(16,width*.025,height*.025),gap=Math.min(10,width*.02,height*.02);
  const bounds={left:margin,top:margin,right:width-margin,bottom:height-margin};
  const blocks=obstacles.filter(r=>r&&[r.left,r.top,r.right,r.bottom].every(Number.isFinite)&&r.right>r.left&&r.bottom>r.top)
    .map(r=>({left:Math.max(bounds.left,r.left-gap),right:Math.min(bounds.right,r.right+gap),top:Math.max(bounds.top,r.top-gap),bottom:Math.min(bounds.bottom,r.bottom+gap)}))
    .filter(r=>r.right>r.left&&r.bottom>r.top);
  const xs=[...new Set([bounds.left,bounds.right,...blocks.flatMap(r=>[r.left,r.right])])].sort((a,b)=>a-b);
  let best=null,bestScore=-Infinity;
  const consider=(left,right,top,bottom)=>{
    const w=right-left,h=bottom-top;if(w<=0||h<=0)return;
    const centerX=(left+right)/2,centerY=(top+bottom)/2;
    const span=Math.min(h,w/preferredAspect),distance=Math.hypot(centerX/width-.5,centerY/height-.5);
    const score=span*(1-.08*distance)+w*h/Math.max(width,height)*.0001;
    if(score>bestScore){bestScore=score;best={left,right,top,bottom,width:w,height:h,centerX,centerY};}
  };
  for(let i=0;i<xs.length-1;i++)for(let j=i+1;j<xs.length;j++){
    const left=xs[i],right=xs[j],blocked=blocks.filter(r=>r.left<right-.01&&r.right>left+.01).sort((a,b)=>a.top-b.top);
    let top=bounds.top;for(const r of blocked){if(r.top>top)consider(left,right,top,r.top);top=Math.max(top,r.bottom);}
    if(top<bounds.bottom)consider(left,right,top,bounds.bottom);
  }
  const blocked=!best;
  if(!best)best={...bounds,width:bounds.right-bounds.left,height:bounds.bottom-bounds.top,centerX:width/2,centerY:height/2};
  return {...best,viewportWidth:width,viewportHeight:height,blocked};
}

// Exact corner projection against the available field of view; no model transforms.
export function fittedSceneRadius(size,{theta=0,phi=Math.PI/2,fov=35,frame,min=.28,max=25,padding=.88}={}){
  const [sx,sy,sz]=Array.isArray(size)?size:[size?.x,size?.y,size?.z];
  if(![sx,sy,sz,theta,phi,fov].every(Number.isFinite)||sx<0||sy<0||sz<0||!frame?.height||!frame?.width)return min;
  const sinTheta=Math.sin(theta),cosTheta=Math.cos(theta),sinPhi=Math.sin(phi),cosPhi=Math.cos(phi);
  const halfTan=Math.tan(fov*Math.PI/360),horizontal=Math.max(1e-6,halfTan*frame.width/frame.viewportHeight*padding),vertical=Math.max(1e-6,halfTan*frame.height/frame.viewportHeight*padding);
  let radius=min;
  for(const x of [-sx/2,sx/2])for(const y of [-sy/2,sy/2])for(const z of [-sz/2,sz/2]){
    const right=x*cosTheta-z*sinTheta,up=-x*cosPhi*sinTheta+y*sinPhi-z*cosPhi*cosTheta;
    const depth=x*sinPhi*sinTheta+y*cosPhi+z*sinPhi*cosTheta;
    radius=Math.max(radius,depth+Math.abs(right)/horizontal,depth+Math.abs(up)/vertical);
  }
  return Math.max(min,Math.min(max,radius));
}
